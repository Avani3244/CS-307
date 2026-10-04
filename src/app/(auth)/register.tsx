import { AuthBanner, AuthButton, AuthField, AuthLink, AuthScreen } from '@/components/auth/auth-ui';
import { useAuth } from '@/context/AuthContext';
import {
    PASSWORD_REQUIREMENTS,
    validateEmail,
    validatePassword,
    validatePasswordConfirmation,
} from '@/lib/validation';
import { useRouter } from 'expo-router';
import { useState } from 'react';

type FieldErrors = { email?: string | null; password?: string | null; confirm?: string | null };

export default function RegisterScreen() {
  const router = useRouter();
  const { signUp, resendVerification } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState('');
  const [alreadyExists, setAlreadyExists] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [resendNote, setResendNote] = useState('');

  const handleSubmit = async () => {
    setFormError('');
    setAlreadyExists(false);

    const nextErrors: FieldErrors = {
      email: validateEmail(email),
      password: validatePassword(password),
      confirm: validatePasswordConfirmation(password, confirm),
    };
    setErrors(nextErrors);
    if (nextErrors.email || nextErrors.password || nextErrors.confirm) return;

    const cleanEmail = email.trim();
    setSubmitting(true);
    const { error, alreadyRegistered } = await signUp(cleanEmail, password);
    setSubmitting(false);

    if (alreadyRegistered) {
      setAlreadyExists(true);
    } else if (error) {
      console.warn('[signUp] failed', error);
      const status = 'status' in error ? ` (status ${String(error.status)})` : '';
      setFormError(`${error.name}${status}: ${error.message || 'Something went wrong creating your account.'}`);
    } else {
      setSentTo(cleanEmail);
    }
  };

  const handleResend = async () => {
    if (!sentTo) return;
    setResendNote('');
    const { error } = await resendVerification(sentTo);
    setResendNote(error ? error.message : 'Verification email sent again.');
  };

  if (sentTo) {
    return (
      <AuthScreen heading="Check your email" subheading="One more step to finish creating your account.">
        <AuthBanner kind="success">
          We sent a verification link to {sentTo}. Open it to verify your email, then sign in.
        </AuthBanner>
        {resendNote ? <AuthBanner kind="info">{resendNote}</AuthBanner> : null}
        <AuthButton label="Go to Login" onPress={() => router.replace('/login')} />
        <AuthLink label="Didn't get it? Resend verification email" onPress={handleResend} />
      </AuthScreen>
    );
  }

  return (
    <AuthScreen heading="Create account" subheading="Sign up with your email to start using StudySpot.">
      {formError ? <AuthBanner kind="error">{formError}</AuthBanner> : null}
      {alreadyExists ? (
        <AuthBanner kind="error">
          An account with this email already exists. Try signing in, or reset your password if you forgot it.
        </AuthBanner>
      ) : null}

      <AuthField
        label="EMAIL"
        placeholder="e.g. username@purdue.edu"
        keyboardType="email-address"
        autoComplete="email"
        value={email}
        onChangeText={setEmail}
        error={errors.email}
      />
      <AuthField
        label="PASSWORD"
        placeholder="••••••••"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
        error={errors.password}
        hint={PASSWORD_REQUIREMENTS}
      />
      <AuthField
        label="CONFIRM PASSWORD"
        placeholder="••••••••"
        secureTextEntry
        value={confirm}
        onChangeText={setConfirm}
        error={errors.confirm}
      />

      <AuthButton label="Create Account" onPress={handleSubmit} loading={submitting} />

      {alreadyExists ? (
        <AuthLink label="Forgot your password?" onPress={() => router.push('/forgot-password')} />
      ) : null}
      <AuthLink label="Already have an account? Sign in" accent onPress={() => router.replace('/login')} />
    </AuthScreen>
  );
}
