import { AuthBanner, AuthButton, AuthField, AuthLink, AuthScreen } from '@/components/auth/auth-ui';
import { useAuth } from '@/context/AuthContext';
import { clearAuthLink, describeLinkError, useAuthLink } from '@/lib/auth-links';
import {
    PASSWORD_REQUIREMENTS,
    validatePassword,
    validatePasswordConfirmation,
} from '@/lib/validation';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator } from 'react-native';

type Status = 'checking' | 'ready' | 'invalid';

// Landing screen for the password-reset link. The link carries a short-lived
// recovery session; we install it, let the user pick a new password, then sign
// them out so they log in again with the new password.
export default function ResetPasswordScreen() {
  const router = useRouter();
  const { beginRecovery, updatePassword, finishRecovery } = useAuth();
  const { link, checked } = useAuthLink();
  const handled = useRef(false);

  const [status, setStatus] = useState<Status>('checking');
  const [linkMessage, setLinkMessage] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [errors, setErrors] = useState<{ password?: string | null; confirm?: string | null }>({});
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (handled.current || !checked) return;

    if (!link) {
      setLinkMessage('This reset link is missing or incomplete.');
      setStatus('invalid');
      return;
    }

    handled.current = true;
    clearAuthLink();

    if (link.errorCode || !link.accessToken || !link.refreshToken) {
      setLinkMessage(describeLinkError(link));
      setStatus('invalid');
      return;
    }

    beginRecovery(link.accessToken, link.refreshToken).then(({ error }) => {
      if (error) {
        setLinkMessage('This link is invalid or has expired.');
        setStatus('invalid');
      } else {
        setStatus('ready');
      }
    });
  }, [link, checked]);

  const handleSubmit = async () => {
    setFormError('');
    const nextErrors = {
      password: validatePassword(password),
      confirm: validatePasswordConfirmation(password, confirm),
    };
    setErrors(nextErrors);
    if (nextErrors.password || nextErrors.confirm) return;

    setSubmitting(true);
    const { error } = await updatePassword(password);
    if (error) {
      setSubmitting(false);
      setFormError(error.message || 'Could not update your password. Please try again.');
      return;
    }

    await finishRecovery();
    setSubmitting(false);
    router.replace({ pathname: '/login', params: { notice: 'password-reset' } });
  };

  if (status === 'checking') {
    return (
      <AuthScreen heading="Checking your link…">
        <ActivityIndicator color="#CEB888" />
      </AuthScreen>
    );
  }

  if (status === 'invalid') {
    return (
      <AuthScreen heading="Reset link problem">
        <AuthBanner kind="error">{linkMessage} Request a new link to reset your password.</AuthBanner>
        <AuthButton label="Request a New Link" onPress={() => router.replace('/forgot-password')} />
        <AuthLink label="Back to Login" accent onPress={() => router.replace('/login')} />
      </AuthScreen>
    );
  }

  return (
    <AuthScreen heading="Choose a new password" subheading="Enter and confirm your new password.">
      {formError ? <AuthBanner kind="error">{formError}</AuthBanner> : null}
      <AuthField
        label="NEW PASSWORD"
        placeholder="••••••••"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
        error={errors.password}
        hint={PASSWORD_REQUIREMENTS}
      />
      <AuthField
        label="CONFIRM NEW PASSWORD"
        placeholder="••••••••"
        secureTextEntry
        value={confirm}
        onChangeText={setConfirm}
        error={errors.confirm}
      />
      <AuthButton label="Reset Password" onPress={handleSubmit} loading={submitting} />
    </AuthScreen>
  );
}
