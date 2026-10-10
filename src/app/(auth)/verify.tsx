import { AuthBanner, AuthButton, AuthScreen } from '@/components/auth/auth-ui';
import { AuthLink as AuthLinkData, clearAuthLink, describeLinkError, useAuthLink } from '@/lib/auth-links';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator } from 'react-native';

type Status = 'checking' | 'verified' | 'invalid';

// Landing screen for the email-verification link. Supabase confirms the address
// on its own server before redirecting here, so we only read the outcome from the
// link and send the user on to Login (we deliberately don't sign them in here).
export default function VerifyScreen() {
  const router = useRouter();
  const { link, checked, lastUrl } = useAuthLink();
  // The link object we last acted on (identity check, so a new link is not ignored).
  const processed = useRef<AuthLinkData | null>(null);
  const [status, setStatus] = useState<Status>('checking');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!checked) return;

    if (!link) {
      if (!processed.current) {
        setMessage('This verification link is missing or incomplete. Open the link from your verification email.');
        setStatus('invalid');
      }
      return;
    }

    if (processed.current === link) return;
    processed.current = link;
    if (link.errorCode || !link.accessToken) {
      setMessage(`${describeLinkError(link)} Create your account again or sign in to request a new verification email.`);
      setStatus('invalid');
    } else {
      setStatus('verified');
    }
    clearAuthLink();
  }, [link, checked]);

  if (status === 'checking') {
    return (
      <AuthScreen heading="Verifying…">
        <ActivityIndicator color="#CEB888" />
      </AuthScreen>
    );
  }

  if (status === 'verified') {
    return (
      <AuthScreen heading="Email verified" subheading="Your StudySpot account is ready.">
        <AuthBanner kind="success">Thanks for verifying your email. You can now sign in.</AuthBanner>
        <AuthButton label="Continue to Login" onPress={() => router.replace('/login')} />
      </AuthScreen>
    );
  }

  return (
    <AuthScreen heading="Verification failed">
      <AuthBanner kind="error">{message}</AuthBanner>
      {__DEV__ ? (
        <AuthBanner kind="info">
          Dev: last link received — {lastUrl ?? 'none (the app never received a link)'}
        </AuthBanner>
      ) : null}
      <AuthButton label="Back to Login" onPress={() => router.replace('/login')} />
    </AuthScreen>
  );
}
