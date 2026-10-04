import { AuthBanner, AuthButton, AuthField, AuthLink, AuthScreen } from '@/components/auth/auth-ui';
import { useAuth } from '@/context/AuthContext';
import { validateEmail } from '@/lib/validation';
import { useRouter } from 'expo-router';
import { useState } from 'react';

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const { resetPassword } = useAuth();

  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState<string | null>(null);
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [sentTo, setSentTo] = useState<string | null>(null);

  const handleSubmit = async () => {
    setFormError('');
    const error = validateEmail(email);
    setEmailError(error);
    if (error) return;

    const cleanEmail = email.trim();
    setSubmitting(true);
    const { error: resetError } = await resetPassword(cleanEmail);
    setSubmitting(false);

    if (resetError) {
      setFormError(resetError.message || 'Could not send reset instructions. Please try again.');
    } else {
      setSentTo(cleanEmail);
    }
  };

  if (sentTo) {
    return (
      <AuthScreen heading="Check your email" subheading="Password reset instructions are on the way.">
        {/* Same wording whether or not the account exists, so we don't reveal which emails are registered. */}
        <AuthBanner kind="success">
          If an account exists for {sentTo}, we've sent reset instructions to it. Open the link in the email to choose a new password.
        </AuthBanner>
        <AuthButton label="Back to Login" onPress={() => router.replace('/login')} />
        <AuthLink label="Use a different email" onPress={() => setSentTo(null)} />
      </AuthScreen>
    );
  }

  return (
    <AuthScreen heading="Forgot password?" subheading="Enter your account email and we'll send you a link to reset your password.">
      {formError ? <AuthBanner kind="error">{formError}</AuthBanner> : null}
      <AuthField
        label="EMAIL"
        placeholder="e.g. username@purdue.edu"
        keyboardType="email-address"
        autoComplete="email"
        value={email}
        onChangeText={setEmail}
        error={emailError}
      />
      <AuthButton label="Send Reset Link" onPress={handleSubmit} loading={submitting} />
      <AuthLink label="Back to Login" accent onPress={() => router.replace('/login')} />
    </AuthScreen>
  );
}
