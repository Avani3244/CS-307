import * as Linking from 'expo-linking';
import { useSyncExternalStore } from 'react';

// Email links (verification, password reset) come back to the app as a deep link.
// Supabase appends the result to the URL fragment, e.g.
//   studyspot://reset-password#access_token=...&refresh_token=...&type=recovery
//   studyspot://verify#error=access_denied&error_code=otp_expired&error_description=...
// In Expo Go the scheme is exp://<host>/--/..., which Linking.createURL handles for us.

// Supabase refuses to redirect to a bare IP address (the link falls back to the
// project's Site URL, or Cloudflare returns a 403 page). During development Expo Go
// links use the dev machine's LAN IP, so swap it for a hostname that resolves to the
// same IP: exp://192.168.1.5:8081/--/verify -> exp://192-168-1-5.nip.io:8081/--/verify.
// Real builds use the studyspot:// scheme, which has no IP host and is left alone.
function withHostnameInsteadOfIp(url: string): string {
  return url.replace(
    /^(exp:\/\/)(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})(?=[:/]|$)/,
    (_match, scheme, a, b, c, d) => `${scheme}${a}-${b}-${c}-${d}.nip.io`
  );
}

export const verifyRedirectUrl = () => withHostnameInsteadOfIp(Linking.createURL('/verify'));
export const resetPasswordRedirectUrl = () =>
  withHostnameInsteadOfIp(Linking.createURL('/reset-password'));

export type AuthLink = {
  accessToken?: string;
  refreshToken?: string;
  type?: string;
  errorCode?: string;
  errorDescription?: string;
};

function readParams(url: string): Record<string, string> {
  const hashIndex = url.indexOf('#');
  const beforeHash = hashIndex >= 0 ? url.slice(0, hashIndex) : url;
  const fragment = hashIndex >= 0 ? url.slice(hashIndex + 1) : '';
  const queryIndex = beforeHash.indexOf('?');
  const query = queryIndex >= 0 ? beforeHash.slice(queryIndex + 1) : '';

  const params: Record<string, string> = {};
  for (const part of [query, fragment]) {
    new URLSearchParams(part).forEach((value, key) => {
      params[key] = value;
    });
  }

  return params;
}

export function parseAuthLink(url: string | null): AuthLink {
  if (!url) return {};
  const params = readParams(url);

  return {
    accessToken: params.access_token,
    refreshToken: params.refresh_token,
    type: params.type,
    errorCode: params.error_code ?? params.error,
    errorDescription: params.error_description,
  };
}

const hasPayload = (link: AuthLink) => Boolean(link.accessToken || link.errorCode);

export function describeLinkError(link: AuthLink): string {
  if (link.errorCode === 'otp_expired') {
    return 'This link has expired.';
  }
  return 'This link is invalid or has already been used.';
}

// ---- Incoming-link store ----
// A link can arrive before the screen that needs it has mounted (the app is
// opened or foregrounded by the link, and the router mounts the screen after).
// Listening at module scope and remembering the latest link avoids missing it.

type Snapshot = {
  link: AuthLink | null;
  checked: boolean;
  /** Dev diagnostic: shape of the last URL the app was opened with (no token values). */
  lastUrl: string | null;
};

let snapshot: Snapshot = { link: null, checked: false, lastUrl: null };
const listeners = new Set<() => void>();

function publish(next: Partial<Snapshot>) {
  snapshot = { ...snapshot, ...next };
  listeners.forEach((listener) => listener());
}

// e.g. "exp://192.168.1.5:8081/--/verify  params: access_token, refresh_token, type"
function summarizeUrl(url: string): string {
  const base = url.split('#')[0].split('?')[0];
  const keys = Object.keys(readParams(url));
  return `${base}  params: ${keys.length ? keys.join(', ') : '(none)'}`;
}

function receive(url: string | null) {
  if (!url) return;
  const lastUrl = summarizeUrl(url);
  if (__DEV__) console.log('[auth-links] received', lastUrl);
  const link = parseAuthLink(url);
  publish(hasPayload(link) ? { link, lastUrl } : { lastUrl });
}

Linking.getInitialURL()
  .then(receive)
  .catch(() => {})
  .finally(() => publish({ checked: true }));
Linking.addEventListener('url', ({ url }) => receive(url));

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};
const getSnapshot = () => snapshot;

/** The most recent auth link the app was opened with, and whether the initial URL has been checked. */
export function useAuthLink(): Snapshot {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

/** Forget the stored link once a screen has used it, so it can't be replayed. */
export function clearAuthLink() {
  publish({ link: null });
}
