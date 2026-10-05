import { useAuth } from '@/context/AuthContext';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import {
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [needsVerification, setNeedsVerification] = useState(false);
  const [infoMessage, setInfoMessage] = useState('');

  const { signIn, resendVerification } = useAuth();
  const router = useRouter();
  const { notice } = useLocalSearchParams<{ notice?: string }>();

  const handleResend = async () => {
    setInfoMessage('');
    const { error } = await resendVerification(email.trim());
    if (error) {
      setErrorMessage(error.message);
    } else {
      setErrorMessage('');
      setNeedsVerification(false);
      setInfoMessage('Verification email sent. Check your inbox.');
    }
  };

  const handleLogin = async () => {
    setErrorMessage('');
    setInfoMessage('');
    setNeedsVerification(false);
    const cleanEmail = email.trim();

    if (!cleanEmail || !password) {
      setErrorMessage('Please enter both your email and password.');
      return;
    }

    setSubmitting(true);
    const { error } = await signIn(cleanEmail, password);
    setSubmitting(false);

    if (error) {
      if (error.message.toLowerCase().includes('email not confirmed')) {
        setErrorMessage('Email verification is required before continuing.');
        setNeedsVerification(true);
      } else {
        setErrorMessage('Invalid email or password. Please try again.');
      }
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.screen}
    >
      <ScrollView contentContainerStyle={styles.scrollContent} bounces={false}>
        {/* Purdue Accent Top Band */}
        <View style={styles.topAccentBar} />

        <View style={styles.card}>
          {/* Logo / Badge */}
          <View style={styles.badgeContainer}>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>P</Text>
            </View>
          </View>

          <Text style={styles.title}>StudySpot</Text>
          <Text style={styles.subtitle}>Purdue University Campus Locations</Text>

          {notice === 'password-reset' && !errorMessage && !infoMessage ? (
            <View style={styles.successBox}>
              <Text style={styles.successText}>Password updated. Sign in with your new password.</Text>
            </View>
          ) : null}

          {infoMessage ? (
            <View style={styles.successBox}>
              <Text style={styles.successText}>{infoMessage}</Text>
            </View>
          ) : null}

          {errorMessage ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{errorMessage}</Text>
              {needsVerification ? (
                <TouchableOpacity onPress={handleResend}>
                  <Text style={styles.resendText}>Resend verification email</Text>
                </TouchableOpacity>
              ) : null}
            </View>
          ) : null}

          {/* Email Input */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>EMAIL</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. username@purdue.edu"
              placeholderTextColor="#8C92AC"
              autoCapitalize="none"
              keyboardType="email-address"
              value={email}
              onChangeText={setEmail}
            />
          </View>

          {/* Password Input */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>PASSWORD</Text>
            <TextInput
              style={styles.input}
              placeholder="••••••••"
              placeholderTextColor="#8C92AC"
              secureTextEntry
              value={password}
              onChangeText={setPassword}
            />
          </View>

          {/* Log In Button */}
          <TouchableOpacity
            style={[styles.loginButton, submitting && styles.buttonDisabled]}
            onPress={handleLogin}
            disabled={submitting}
          >
            {submitting ? (
              <ActivityIndicator color="#000" />
            ) : (
              <Text style={styles.loginButtonText}>Sign In</Text>
            )}
          </TouchableOpacity>

          <View style={styles.dividerContainer}>
            <View style={styles.divider} />
            <Text style={styles.dividerText}>BOILER UP</Text>
            <View style={styles.divider} />
          </View>

          {/* Footnotes / Extra links */}
          <View style={styles.footerLinks}>
            <TouchableOpacity onPress={() => router.push('/forgot-password')}>
              <Text style={styles.linkText}>Forgot password?</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => router.push('/register')}>
              <Text style={[styles.linkText, styles.signUpLink]}>Create account</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#121212', // Boilermaker Deep Slate / Dark mode backing
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
  },
  topAccentBar: {
    height: 4,
    backgroundColor: '#CEB888', // Official Purdue Gold
    width: '100%',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
  },
  card: {
    backgroundColor: '#1E1E1E', // Modern dark charcoal surface
    borderRadius: 16,
    padding: 28,
    borderWidth: 1,
    borderColor: '#2D2D2D',
    maxWidth: 440,
    width: '100%',
    alignSelf: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 8,
  },
  badgeContainer: {
    alignItems: 'center',
    marginBottom: 12,
  },
  badge: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#CEB888', // Purdue Gold
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeText: {
    color: '#000',
    fontWeight: '900',
    fontSize: 26,
    fontFamily: Platform.OS === 'ios' ? 'HelveticaNeue-Bold' : 'sans-serif-black',
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#F4F4F4',
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  subtitle: {
    fontSize: 13,
    color: '#CEB888', // Gold subtitle text
    textAlign: 'center',
    marginBottom: 26,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1.2,
  },
  errorBox: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderLeftWidth: 3,
    borderLeftColor: '#EF4444',
    padding: 10,
    borderRadius: 6,
    marginBottom: 18,
  },
  errorText: {
    color: '#FCA5A5',
    fontSize: 13,
    textAlign: 'left',
  },
  successBox: {
    backgroundColor: 'rgba(34, 197, 94, 0.1)',
    borderLeftWidth: 3,
    borderLeftColor: '#22C55E',
    padding: 10,
    borderRadius: 6,
    marginBottom: 18,
  },
  successText: {
    color: '#86EFAC',
    fontSize: 13,
  },
  resendText: {
    color: '#CEB888',
    fontSize: 13,
    fontWeight: '700',
    marginTop: 8,
  },
  inputGroup: {
    marginBottom: 18,
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#CEB888', // Gold labels
    marginBottom: 6,
    letterSpacing: 0.8,
  },
  input: {
    backgroundColor: '#121212',
    borderWidth: 1,
    borderColor: '#333',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 8,
    fontSize: 15,
    color: '#FFF',
  },
  loginButton: {
    backgroundColor: '#CEB888', // Purdue Gold button
    paddingVertical: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  loginButtonText: {
    color: '#121212', // Black bold text on gold
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 22,
  },
  divider: {
    flex: 1,
    height: 1,
    backgroundColor: '#2E2E2E',
  },
  dividerText: {
    color: '#666',
    fontSize: 11,
    fontWeight: '700',
    marginHorizontal: 12,
    letterSpacing: 1,
  },
  footerLinks: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 4,
  },
  linkText: {
    color: '#A0A0A0',
    fontSize: 13,
    fontWeight: '500',
  },
  signUpLink: {
    color: '#CEB888', // Highlight gold for registration
    fontWeight: '700',
  },
});