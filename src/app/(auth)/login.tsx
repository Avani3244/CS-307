import { useAuth } from '@/context/AuthContext';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const COLORS = {
  header: '#211A15',
  page: '#F1E2D2',
  card: '#FFF9F2',
  cardSoft: '#FAEFE4',
  text: '#21160F',
  muted: '#9A816B',
  icon: '#A3876D',
  gold: '#C98A38',
  goldDark: '#A96F2D',
  goldSoft: '#F4DFC3',
  border: '#E2CCB8',
  divider: '#EAD7C6',
  white: '#FFFFFF',
  delete: '#A22B25',
  deleteBackground: '#F9DDD7',
};

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [needsVerification, setNeedsVerification] = useState(false);
  const [infoMessage, setInfoMessage] = useState('');

  const { signIn, resendVerification } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();
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
      style={[styles.screen, { backgroundColor: COLORS.page }]}
    >
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingTop: Math.max(insets.top + 30, 40),
            paddingBottom: insets.bottom + 30,
          },
        ]}
        bounces={false}
      >
        <View style={styles.card}>
          {/* Logo Crest */}
          <View style={styles.badgeWrapper}>
            <View style={styles.badgeOutline}>
              <View style={styles.badge}>
                <Text style={styles.badgeText}>P</Text>
              </View>
            </View>
          </View>

          <Text style={styles.appTitle}>STUDYSPOT</Text>
          <Text style={styles.headerSubtitle}>Purdue Campus Study Hub</Text>

          {notice === 'password-reset' && !errorMessage && !infoMessage ? (
            <View style={styles.successBanner}>
              <MaterialCommunityIcons name="check-circle-outline" size={18} color={COLORS.goldDark} />
              <Text style={styles.successBannerText}>
                Password updated. Sign in with your new password.
              </Text>
            </View>
          ) : null}

          {infoMessage ? (
            <View style={styles.successBanner}>
              <MaterialCommunityIcons name="check-circle-outline" size={18} color={COLORS.goldDark} />
              <Text style={styles.successBannerText}>{infoMessage}</Text>
            </View>
          ) : null}

          {errorMessage ? (
            <View style={styles.errorBanner}>
              <MaterialCommunityIcons name="alert-circle-outline" size={18} color={COLORS.delete} />
              <View style={{ flex: 1 }}>
                <Text style={styles.errorBannerText}>{errorMessage}</Text>
                {needsVerification ? (
                  <Pressable onPress={handleResend} style={styles.resendBtn}>
                    <Text style={styles.resendBtnText}>Resend verification email</Text>
                  </Pressable>
                ) : null}
              </View>
            </View>
          ) : null}

          {/* Email Input */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>PURDUE EMAIL</Text>
            <View style={styles.inputContainer}>
              <MaterialCommunityIcons name="email-outline" size={18} color={COLORS.icon} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="username@purdue.edu"
                placeholderTextColor={COLORS.muted}
                autoCapitalize="none"
                keyboardType="email-address"
                value={email}
                onChangeText={setEmail}
              />
            </View>
          </View>

          {/* Password Input */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>PASSWORD</Text>
            <View style={styles.inputContainer}>
              <MaterialCommunityIcons name="lock-outline" size={18} color={COLORS.icon} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="••••••••"
                placeholderTextColor={COLORS.muted}
                secureTextEntry
                value={password}
                onChangeText={setPassword}
              />
            </View>
          </View>

          {/* Sign In Button */}
          <Pressable
            style={({ pressed }) => [
              styles.signInButton,
              pressed && styles.pressed,
              submitting && styles.buttonDisabled,
            ]}
            onPress={handleLogin}
            disabled={submitting}
          >
            {submitting ? (
              <ActivityIndicator color={COLORS.white} size="small" />
            ) : (
              <Text style={styles.signInButtonText}>Sign In</Text>
            )}
          </Pressable>

          {/* Divider */}
          <View style={styles.dividerContainer}>
            <View style={styles.divider} />
            <Text style={styles.dividerText}>BOILER UP</Text>
            <View style={styles.divider} />
          </View>

          {/* Footer Navigation */}
          <View style={styles.footerLinks}>
            <Pressable
              style={({ pressed }) => pressed && styles.pressed}
              onPress={() => router.push('/(auth)/forgot-password')}
            >
              <Text style={styles.linkText}>Forgot password?</Text>
            </Pressable>

            <Pressable
              style={({ pressed }) => pressed && styles.pressed}
              onPress={() => router.push('/(auth)/register')}
            >
              <Text style={[styles.linkText, styles.signUpLink]}>Create account</Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  card: {
    width: '100%',
    maxWidth: 440,
    backgroundColor: COLORS.card,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 28,
    shadowColor: COLORS.header,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
  },
  badgeWrapper: {
    alignItems: 'center',
    marginBottom: 12,
  },
  badgeOutline: {
    width: 68,
    height: 68,
    borderRadius: 34,
    borderWidth: 2,
    borderColor: COLORS.gold,
    padding: 3,
    backgroundColor: COLORS.white,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badge: {
    width: '100%',
    height: '100%',
    borderRadius: 30,
    backgroundColor: COLORS.goldSoft,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeText: {
    color: COLORS.header,
    fontWeight: '900',
    fontSize: 30,
  },
  appTitle: {
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 1.5,
    color: COLORS.goldDark,
    textAlign: 'center',
  },
  headerSubtitle: {
    fontSize: 22,
    fontWeight: '800',
    color: COLORS.header,
    textAlign: 'center',
    marginBottom: 20,
    marginTop: 2,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: COLORS.deleteBackground,
    borderColor: COLORS.delete,
    borderWidth: 1,
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
  },
  errorBannerText: {
    color: COLORS.delete,
    fontSize: 13,
    fontWeight: '600',
  },
  resendBtn: {
    marginTop: 6,
  },
  resendBtnText: {
    color: COLORS.goldDark,
    fontSize: 13,
    fontWeight: '700',
  },
  successBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: COLORS.cardSoft,
    borderColor: COLORS.gold,
    borderWidth: 1,
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
  },
  successBannerText: {
    color: COLORS.goldDark,
    fontSize: 13,
    fontWeight: '700',
    flex: 1,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
    color: COLORS.goldDark,
    marginBottom: 6,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.cardSoft,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    paddingHorizontal: 12,
  },
  inputIcon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 14,
    color: COLORS.text,
  },
  signInButton: {
    backgroundColor: COLORS.gold,
    paddingVertical: 13,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 6,
  },
  signInButtonText: {
    color: COLORS.white,
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  pressed: {
    opacity: 0.8,
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
  },
  divider: {
    flex: 1,
    height: 1,
    backgroundColor: COLORS.divider,
  },
  dividerText: {
    color: COLORS.muted,
    fontSize: 10,
    fontWeight: '800',
    marginHorizontal: 10,
    letterSpacing: 1.2,
  },
  footerLinks: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  linkText: {
    color: COLORS.muted,
    fontSize: 13,
    fontWeight: '600',
  },
  signUpLink: {
    color: COLORS.goldDark,
    fontWeight: '800',
  },
});