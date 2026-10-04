import * as Linking from 'expo-linking';
import { useSyncExternalStore } from 'react';

// Email links (verification, password reset) come back to the app as a deep link.
// Supabase appends the result to the URL fragment, e.g.
//   studyspot://reset-password#access_token=...&refresh_token=...&type=recovery
//   studyspot://verify#error=access_denied&error_code=otp_expired&error_description=...
// In Expo Go the scheme is exp://<host>/--/..., which Linking.createURL handles for us.

export const verifyRedirectUrl = () => Linking.createURL('/verify');
export const resetPasswordRedirectUrl = () => Linking.createURL('/reset-password');

export type AuthLink = {
  accessToken?: string;
  refreshToken?: string;
  type?: string;
  errorCode?: string;
  errorDescription?: string;
};

export function parseAuthLink(url: string | null): AuthLink {
  if (!url) return {};

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

type Snapshot = { link: AuthLink | null; checked: boolean };

let snapshot: Snapshot = { link: null, checked: false };
const listeners = new Set<() => void>();

function publish(next: Partial<Snapshot>) {
  snapshot = { ...snapshot, ...next };
  listeners.forEach((listener) => listener());
}

function receive(url: string | null) {
  const link = parseAuthLink(url);
  if (hasPayload(link)) publish({ link });
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
