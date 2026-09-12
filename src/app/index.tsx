// Login: hero waves, title, Privy email OTP.

import { useEffect, useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Waves } from '@/components/waves';
import { useAuth } from '@/lib/auth';
import { dark, brand, radius, spacing } from '@/theme/tokens';

type Step = 'start' | 'email' | 'code';

export default function Login() {
  const router = useRouter();
  const auth = useAuth();
  const [step, setStep] = useState<Step>('start');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSend = async () => {
    setBusy(true);
    setError(null);
    try {
      await auth.sendCode(email.trim().toLowerCase());
      setStep('code');
    } catch {
      setError('Verification failed. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  const onLogin = async () => {
    setBusy(true);
    setError(null);
    try {
      await auth.loginWithCode(email.trim().toLowerCase(), code.trim());
    } catch {
      setError('Verification failed. Please try again.');
      setBusy(false);
      return;
    }
    setBusy(false);
  };

  useEffect(() => {
    if (auth.gate === 'allowed') router.replace('/(tabs)/home');
  }, [auth.gate, router]);

  return (
    <View style={styles.root}>
      <Waves />
      <SafeAreaView style={styles.safe}>
        <View style={styles.content}>
          <Text style={styles.title}>Earn yield from{'\n'}market movement</Text>

          {step === 'start' ? (
            <Pressable
              accessibilityRole="button"
              onPress={() => setStep('email')}
              style={({ pressed }) => [styles.cta, pressed && { opacity: 0.9 }]}
            >
              <Text style={styles.ctaLabel}>Sign in with email</Text>
            </Pressable>
          ) : null}

          {step === 'email' ? (
            <View style={styles.form}>
              <TextInput
                value={email}
                onChangeText={setEmail}
                placeholder="your@email.com"
                placeholderTextColor={dark.mutedForeground}
                autoCapitalize="none"
                keyboardType="email-address"
                style={styles.input}
              />
              <Pressable
                accessibilityRole="button"
                disabled={busy || !email.includes('@')}
                onPress={onSend}
                style={({ pressed }) => [
                  styles.cta,
                  (busy || !email.includes('@')) && { opacity: 0.5 },
                  pressed && { opacity: 0.9 },
                ]}
              >
                <Text style={styles.ctaLabel}>{busy ? 'Sending code...' : 'Send code'}</Text>
              </Pressable>
            </View>
          ) : null}

          {step === 'code' ? (
            <View style={styles.form}>
              <TextInput
                value={code}
                onChangeText={setCode}
                placeholder="One-time code"
                placeholderTextColor={dark.mutedForeground}
                keyboardType="number-pad"
                style={styles.input}
              />
              <Pressable
                accessibilityRole="button"
                disabled={busy || code.trim().length < 4}
                onPress={onLogin}
                style={({ pressed }) => [
                  styles.cta,
                  (busy || code.trim().length < 4) && { opacity: 0.5 },
                  pressed && { opacity: 0.9 },
                ]}
              >
                <Text style={styles.ctaLabel}>
                  {busy || auth.gate === 'verifying' ? 'Verifying beta access' : 'Sign in'}
                </Text>
              </Pressable>
            </View>
          ) : null}

          {auth.gate === 'denied' ? (
            <View style={styles.denied}>
              <Text style={styles.deniedTitle}>Access denied</Text>
              <Text style={styles.deniedBody}>
                {auth.gateError ?? 'This account is not on the Thaler beta list.'}
              </Text>
              <Pressable onPress={() => auth.signOut()}>
                <Text style={styles.deniedAction}>Sign out and try a different email</Text>
              </Pressable>
            </View>
          ) : null}

          {error || (auth.gate === 'error' && auth.gateError) ? (
            <Text style={styles.error}>{error ?? auth.gateError}</Text>
          ) : null}
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: dark.background },
  safe: { flex: 1 },
  content: {
    flex: 1,
    justifyContent: 'flex-end',
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xxxl * 2,
    gap: spacing.lg,
  },
  title: {
    color: dark.foreground,
    fontSize: 38,
    lineHeight: 42,
    fontWeight: '700',
    letterSpacing: -1.2,
  },
  form: { gap: spacing.md },
  input: {
    borderColor: dark.input,
    borderWidth: 1,
    borderRadius: radius.lg,
    paddingHorizontal: 14,
    height: 46,
    color: dark.foreground,
    fontSize: 15,
  },
  cta: {
    backgroundColor: dark.foreground,
    borderRadius: radius.xl,
    paddingVertical: 14,
    alignItems: 'center',
  },
  ctaLabel: { color: dark.background, fontSize: 16, fontWeight: '600' },
  denied: {
    borderColor: 'rgba(239,68,68,0.3)',
    borderWidth: 1,
    backgroundColor: 'rgba(239,68,68,0.1)',
    borderRadius: radius.xl,
    padding: spacing.base,
    gap: 6,
  },
  deniedTitle: { color: brand.error, fontSize: 15, fontWeight: '600' },
  deniedBody: { color: dark.mutedForeground, fontSize: 13 },
  deniedAction: { color: dark.foreground, fontSize: 13, fontWeight: '600', marginTop: 4 },
  error: { color: brand.error, fontSize: 13 },
});
