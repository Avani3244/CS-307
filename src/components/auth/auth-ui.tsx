import { ReactNode } from 'react';
import {
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TextInputProps,
    TouchableOpacity,
    View,
} from 'react-native';

// Shared building blocks for the auth screens. Visual style matches login.tsx.

export function AuthScreen({
  heading,
  subheading,
  children,
}: {
  heading: string;
  subheading?: string;
  children: ReactNode;
}) {
  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.screen}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        bounces={false}
      >
        <View style={styles.topAccentBar} />
        <View style={styles.card}>
          <View style={styles.badgeContainer}>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>P</Text>
            </View>
          </View>
          <Text style={styles.title}>{heading}</Text>
          {subheading ? <Text style={styles.subtitle}>{subheading}</Text> : <View style={{ height: 20 }} />}
          {children}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

export function AuthBanner({ kind, children }: { kind: 'error' | 'success' | 'info'; children: ReactNode }) {
  return (
    <View style={[styles.banner, bannerStyles[kind].box]}>
      <Text style={[styles.bannerText, bannerStyles[kind].text]}>{children}</Text>
    </View>
  );
}

export function AuthField({
  label,
  error,
  hint,
  ...inputProps
}: TextInputProps & { label: string; error?: string | null; hint?: string }) {
  return (
    <View style={styles.inputGroup}>
      <Text style={styles.inputLabel}>{label}</Text>
      <TextInput
        style={[styles.input, error ? styles.inputError : null]}
        placeholderTextColor="#8C92AC"
        autoCapitalize="none"
        autoCorrect={false}
        {...inputProps}
      />
      {error ? <Text style={styles.fieldError}>{error}</Text> : hint ? <Text style={styles.fieldHint}>{hint}</Text> : null}
    </View>
  );
}

export function AuthButton({
  label,
  onPress,
  loading,
  variant = 'primary',
}: {
  label: string;
  onPress: () => void;
  loading?: boolean;
  variant?: 'primary' | 'secondary';
}) {
  const primary = variant === 'primary';
  return (
    <TouchableOpacity
      style={[primary ? styles.button : styles.buttonSecondary, loading && styles.buttonDisabled]}
      onPress={onPress}
      disabled={loading}
    >
      {loading ? (
        <ActivityIndicator color={primary ? '#000' : '#CEB888'} />
      ) : (
        <Text style={primary ? styles.buttonText : styles.buttonSecondaryText}>{label}</Text>
      )}
    </TouchableOpacity>
  );
}

export function AuthLink({ label, onPress, accent }: { label: string; onPress: () => void; accent?: boolean }) {
  return (
    <TouchableOpacity onPress={onPress} style={styles.linkWrap}>
      <Text style={[styles.linkText, accent && styles.linkAccent]}>{label}</Text>
    </TouchableOpacity>
  );
}

const bannerStyles = {
  error: {
    box: { backgroundColor: 'rgba(239, 68, 68, 0.1)', borderLeftColor: '#EF4444' },
    text: { color: '#FCA5A5' },
  },
  success: {
    box: { backgroundColor: 'rgba(34, 197, 94, 0.1)', borderLeftColor: '#22C55E' },
    text: { color: '#86EFAC' },
  },
  info: {
    box: { backgroundColor: 'rgba(206, 184, 136, 0.1)', borderLeftColor: '#CEB888' },
    text: { color: '#E5D9B8' },
  },
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#121212' },
  scrollContent: { flexGrow: 1, justifyContent: 'center', padding: 24 },
  topAccentBar: {
    height: 4,
    backgroundColor: '#CEB888',
    width: '100%',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
  },
  card: {
    backgroundColor: '#1E1E1E',
    borderRadius: 16,
    padding: 28,
    borderWidth: 1,
    borderColor: '#2D2D2D',
    maxWidth: 440,
    width: '100%',
    alignSelf: 'center',
  },
  badgeContainer: { alignItems: 'center', marginBottom: 12 },
  badge: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#CEB888',
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeText: { color: '#000', fontWeight: '900', fontSize: 26 },
  title: { fontSize: 24, fontWeight: '800', color: '#F4F4F4', textAlign: 'center', letterSpacing: 0.5 },
  subtitle: {
    fontSize: 13,
    color: '#A0A0A0',
    textAlign: 'center',
    marginTop: 6,
    marginBottom: 22,
    lineHeight: 19,
  },
  banner: { borderLeftWidth: 3, padding: 10, borderRadius: 6, marginBottom: 18 },
  bannerText: { fontSize: 13, lineHeight: 18 },
  inputGroup: { marginBottom: 18 },
  inputLabel: { fontSize: 11, fontWeight: '700', color: '#CEB888', marginBottom: 6, letterSpacing: 0.8 },
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
  inputError: { borderColor: '#EF4444' },
  fieldError: { color: '#FCA5A5', fontSize: 12, marginTop: 6 },
  fieldHint: { color: '#8C92AC', fontSize: 12, marginTop: 6 },
  button: { backgroundColor: '#CEB888', paddingVertical: 15, borderRadius: 8, alignItems: 'center', marginTop: 8 },
  buttonSecondary: {
    borderWidth: 1,
    borderColor: '#CEB888',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonDisabled: { opacity: 0.5 },
  buttonText: { color: '#121212', fontSize: 16, fontWeight: '800', letterSpacing: 0.5 },
  buttonSecondaryText: { color: '#CEB888', fontSize: 16, fontWeight: '700', letterSpacing: 0.5 },
  linkWrap: { alignItems: 'center', paddingVertical: 12 },
  linkText: { color: '#A0A0A0', fontSize: 13, fontWeight: '500' },
  linkAccent: { color: '#CEB888', fontWeight: '700' },
});
