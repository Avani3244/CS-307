import { AuthBanner, AuthButton, AuthScreen } from '@/components/auth/auth-ui';
import { clearAuthLink, describeLinkError, useAuthLink } from '@/lib/auth-links';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator } from 'react-native';

type Status = 'checking' | 'verified' | 'invalid';

// Landing screen for the email-verification link. Supabase confirms the address
// on its own server before redirecting here, so we only read the outcome from the
// link and send the user on to Login (we deliberately don't sign them in here).
export default function VerifyScreen() {
  const router = useRouter();
  const { link, checked } = useAuthLink();
  const handled = useRef(false);
  const [status, setStatus] = useState<Status>('checking');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (handled.current || !checked) return;

    if (!link) {
      setMessage('This verification link is missing or incomplete. Open the link from your verification email.');
      setStatus('invalid');
      return;
    }

    handled.current = true;
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
      <AuthButton label="Back to Login" onPress={() => router.replace('/login')} />
    </AuthScreen>
  );
}
