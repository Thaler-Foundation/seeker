import { useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Keyboard,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Circle, Line, Path, Rect } from 'react-native-svg';

import { OtpInput } from '@/components/auth/otp-input';
import { PressableScale } from '@/components/ui/pressable-scale';
import { Waves } from '@/components/waves';
import { useAuth } from '@/lib/auth';
import { brand, dark, radius, spacing } from '@/theme/tokens';
import { fontFamilies } from '@/theme/typography';

type Step = 'start' | 'email' | 'code';

function ArrowLeftIcon({ size = 20, color = dark.foreground }: { size?: number; color?: string }) {
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={2.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <Path d="m15 18-6-6 6-6" />
    </Svg>
  );
}

function MailIcon({ size = 18, color = dark.mutedForeground }: { size?: number; color?: string }) {
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <Rect width={20} height={16} x={2} y={4} rx={2} />
      <Path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L1 7" />
    </Svg>
  );
}

function ClearIcon({ size = 18, color = dark.mutedForeground }: { size?: number; color?: string }) {
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <Circle cx={12} cy={12} r={9} fill="rgba(255,255,255,0.12)" stroke="none" />
      <Path d="m15 9-6 6" />
      <Path d="m9 9 6 6" />
    </Svg>
  );
}

function AlertCircleIcon({ size = 18, color = brand.error }: { size?: number; color?: string }) {
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <Circle cx={12} cy={12} r={10} />
      <Line x1={12} y1={8} x2={12} y2={12} />
      <Line x1={12} y1={16} x2={12.01} y2={16} />
    </Svg>
  );
}

export default function Login() {
  const router = useRouter();
  const auth = useAuth();
  const [step, setStep] = useState<Step>('start');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [emailFocused, setEmailFocused] = useState(false);
  const [countdown, setCountdown] = useState(30);

  const [keyboardHeight, setKeyboardHeight] = useState(0);

  useEffect(() => {
    const showSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      (e) => {
        setKeyboardHeight(e.endCoordinates.height);
      }
    );
    const hideSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => {
        setKeyboardHeight(0);
      }
    );
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  const emailInputRef = useRef<TextInput>(null);

  const trimmedEmail = email.trim().toLowerCase();
  const isValidEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail);

  // Resend countdown timer
  useEffect(() => {
    if (step !== 'code' || countdown <= 0) return;
    const timer = setInterval(() => {
      setCountdown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [step, countdown]);

  const onSend = async () => {
    if (!isValidEmail || busy) return;
    setBusy(true);
    setError(null);
    Keyboard.dismiss();
    console.log('[Auth] [onSend] Attempting to send code to:', trimmedEmail);
    try {
      await auth.sendCode(trimmedEmail);
      console.log('[Auth] [onSend] Successfully sent code to:', trimmedEmail);
      setCountdown(30);
      setCode('');
      setStep('code');
    } catch (err: any) {
      console.error('[Auth] [onSend] ERROR details:', {
        name: err?.name,
        message: err?.message,
        code: err?.code,
        stack: err?.stack,
        raw: err,
      });
      setError(err?.message ? `Failed to send code: ${err.message}` : 'Verification failed. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  const onResend = async () => {
    if (countdown > 0 || busy) return;
    setBusy(true);
    setError(null);
    console.log('[Auth] [onResend] Resending code to:', trimmedEmail);
    try {
      await auth.sendCode(trimmedEmail);
      setCountdown(30);
      console.log('[Auth] [onResend] Code resent successfully');
    } catch (err: any) {
      setError(err?.message ? `Resend failed: ${err.message}` : 'Could not resend code. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  const onLogin = useCallback(
    async (overrideCode?: string) => {
      const codeToVerify = (overrideCode ?? code).trim();
      if (codeToVerify.length < 6 || busy) return;

      setBusy(true);
      setError(null);
      Keyboard.dismiss();
      console.log('[Auth] [onLogin] Attempting login with code for:', trimmedEmail);
      try {
        await auth.loginWithCode(trimmedEmail, codeToVerify);
        console.log('[Auth] [onLogin] Successfully logged in with code');
      } catch (err: any) {
        console.error('[Auth] [onLogin] ERROR details:', {
          name: err?.name,
          message: err?.message,
          code: err?.code,
          stack: err?.stack,
          raw: err,
        });
        setError(err?.message ? `Login failed: ${err.message}` : 'Verification code is invalid or expired.');
        setBusy(false);
        return;
      }
      setBusy(false);
    },
    [code, busy, trimmedEmail, auth]
  );

  const handleCodeChange = (newCode: string) => {
    setCode(newCode);
    if (error) setError(null);
  };

  const handleCodeComplete = (completedCode: string) => {
    void onLogin(completedCode);
  };

  useEffect(() => {
    if (auth.gate === 'allowed') router.replace('/(tabs)/home');
  }, [auth.gate, router]);

  return (
    <View style={styles.root}>
      <Waves step={step} />

      <SafeAreaView style={styles.safe}>
        <View style={styles.mainContainer}>
          {step !== 'start' ? (
            <Animated.View entering={FadeIn.duration(180)} style={styles.navBar}>
              <PressableScale
                onPress={() => {
                  setError(null);
                  setStep(step === 'code' ? 'email' : 'start');
                }}
                style={styles.backButton}
                accessibilityLabel="Back"
              >
                <ArrowLeftIcon size={18} />
                <Text style={styles.backText}>
                  {step === 'code' ? 'Change email' : 'Back'}
                </Text>
              </PressableScale>
            </Animated.View>
          ) : null}

          <View
            style={[
              styles.content,
              keyboardHeight > 0 && { paddingBottom: keyboardHeight + spacing.base },
            ]}
          >
            {/* STEP 1: START */}
            {step === 'start' ? (
              <Animated.View
                entering={FadeIn.duration(220)}
                exiting={FadeOut.duration(150)}
                style={styles.stepContainer}
              >
                <Text style={styles.heroTitle}>
                  Earn yield from{'\n'}market movement
                </Text>
                <Text style={styles.heroSubtitle}>
                  Institutional-grade DeFi vaults engineered for the Solana Mobile Stack.
                </Text>

                <View style={styles.actionsContainer}>
                  <PressableScale
                    onPress={() => setStep('email')}
                    style={styles.primaryCta}
                    accessibilityLabel="Sign in with email"
                  >
                    <Text style={styles.primaryCtaText}>Sign in with email</Text>
                  </PressableScale>

                  <Text style={styles.disclaimerText}>
                    No seed phrases required. Powered by Privy.
                  </Text>
                </View>
              </Animated.View>
            ) : null}

            {/* STEP 2: EMAIL */}
            {step === 'email' ? (
              <Animated.View
                entering={FadeIn.duration(220)}
                exiting={FadeOut.duration(150)}
                style={styles.stepContainer}
              >
                <View style={styles.headerBlock}>
                  <Text style={styles.stepTitle}>Enter your email</Text>
                  <Text style={styles.stepSubtitle}>
                    We&apos;ll send a 6-digit verification code to sign in or create an account.
                  </Text>
                </View>

                <View style={styles.formSection}>
                  <View
                    style={[
                      styles.inputWrapper,
                      emailFocused && styles.inputWrapperFocused,
                    ]}
                  >
                    <View style={styles.inputLeadingIcon}>
                      <MailIcon
                        size={18}
                        color={emailFocused ? dark.foreground : dark.mutedForeground}
                      />
                    </View>
                    <TextInput
                      ref={emailInputRef}
                      value={email}
                      onChangeText={(val) => {
                        setEmail(val);
                        if (error) setError(null);
                      }}
                      onFocus={() => setEmailFocused(true)}
                      onBlur={() => setEmailFocused(false)}
                      placeholder="name@example.com"
                      placeholderTextColor={dark.mutedForeground}
                      autoCapitalize="none"
                      autoCorrect={false}
                      autoComplete="off"
                      importantForAutofill="no"
                      textContentType="none"
                      keyboardType="email-address"
                      returnKeyType="go"
                      onSubmitEditing={onSend}
                      style={styles.emailInput}
                      selectionColor="#FFFFFF"
                    />
                    {email.length > 0 ? (
                      <PressableScale
                        onPress={() => {
                          setEmail('');
                          emailInputRef.current?.focus();
                        }}
                        style={styles.clearButton}
                        accessibilityLabel="Clear email"
                      >
                        <ClearIcon size={18} />
                      </PressableScale>
                    ) : null}
                  </View>

                  <PressableScale
                    loading={busy}
                    disabled={!isValidEmail || busy}
                    onPress={onSend}
                    style={styles.primaryCta}
                    accessibilityLabel="Continue"
                  >
                    <Text style={styles.primaryCtaText}>Continue</Text>
                  </PressableScale>
                </View>
              </Animated.View>
            ) : null}

            {/* STEP 3: OTP CODE */}
            {step === 'code' ? (
              <Animated.View
                entering={FadeIn.duration(220)}
                exiting={FadeOut.duration(150)}
                style={styles.stepContainer}
              >
                <View style={styles.headerBlock}>
                  <Text style={styles.stepTitle}>Enter verification code</Text>
                  <View style={styles.recipientRow}>
                    <Text style={styles.stepSubtitle}>Sent to </Text>
                    <Pressable
                      onPress={() => {
                        setError(null);
                        setStep('email');
                      }}
                      hitSlop={6}
                    >
                      <Text style={styles.emailPillText}>{trimmedEmail}</Text>
                    </Pressable>
                  </View>
                </View>

                <View style={styles.otpSection}>
                  <OtpInput
                    value={code}
                    onChange={handleCodeChange}
                    onComplete={handleCodeComplete}
                    length={6}
                    isError={Boolean(error)}
                    disabled={busy || auth.gate === 'verifying'}
                    autoFocus={true}
                  />

                  <View style={styles.resendRow}>
                    {countdown > 0 ? (
                      <Text style={styles.resendTimerText}>
                        Resend code in{' '}
                        <Text style={styles.resendTimerDigits}>
                          0:{countdown < 10 ? `0${countdown}` : countdown}
                        </Text>
                      </Text>
                    ) : (
                      <PressableScale
                        disabled={busy}
                        onPress={onResend}
                        style={styles.resendActionButton}
                      >
                        <Text style={styles.resendActionText}>
                          Didn&apos;t receive code? Resend
                        </Text>
                      </PressableScale>
                    )}
                  </View>

                  <PressableScale
                    loading={busy || auth.gate === 'verifying'}
                    disabled={busy || code.trim().length < 6 || auth.gate === 'verifying'}
                    onPress={() => onLogin()}
                    style={styles.primaryCta}
                    accessibilityLabel="Sign in"
                  >
                    <Text style={styles.primaryCtaText}>
                      {auth.gate === 'verifying'
                        ? 'Verifying beta access...'
                        : 'Sign in'}
                    </Text>
                  </PressableScale>
                </View>
              </Animated.View>
            ) : null}

            {error || (auth.gate === 'error' && auth.gateError) ? (
              <Animated.View
                entering={FadeIn.duration(180)}
                exiting={FadeOut.duration(120)}
                style={styles.errorCard}
              >
                <AlertCircleIcon size={18} color={brand.error} />
                <Text style={styles.errorCardText}>
                  {error ?? auth.gateError}
                </Text>
              </Animated.View>
            ) : null}

            {auth.gate === 'denied' ? (
              <Animated.View
                entering={FadeIn.duration(180)}
                style={styles.deniedCard}
              >
                <View style={styles.deniedHeader}>
                  <AlertCircleIcon size={18} color={brand.warning} />
                  <Text style={styles.deniedTitle}>Beta Access Required</Text>
                </View>
                <Text style={styles.deniedBody}>
                  {auth.gateError ?? 'This email is not yet authorized for the Thaler private beta.'}
                </Text>
                <PressableScale
                  onPress={() => {
                    auth.signOut();
                    setStep('email');
                    setCode('');
                  }}
                  style={styles.deniedAction}
                >
                  <Text style={styles.deniedActionText}>Try another email</Text>
                </PressableScale>
              </Animated.View>
            ) : null}
          </View>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: dark.background,
  },
  safe: {
    flex: 1,
  },
  mainContainer: {
    flex: 1,
    justifyContent: 'space-between',
  },
  navBar: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xs,
    zIndex: 10,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: radius.full,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  backText: {
    color: dark.foreground,
    fontSize: 14,
    fontFamily: fontFamilies.rounded.semibold,
  },
  content: {
    flex: 1,
    justifyContent: 'flex-end',
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xxxl * 2,
    gap: spacing.base,
  },
  stepContainer: {
    gap: spacing.lg,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.full,
    backgroundColor: 'rgba(0, 217, 192, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(0, 217, 192, 0.28)',
    marginBottom: -4,
  },
  badgeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: brand.teal,
  },
  badgeText: {
    color: brand.teal,
    fontSize: 11,
    fontFamily: fontFamilies.mono.bold,
    letterSpacing: 0.8,
  },
  heroTitle: {
    color: dark.foreground,
    fontSize: 38,
    lineHeight: 44,
    fontFamily: fontFamilies.rounded.heavy,
    letterSpacing: -1.2,
  },
  heroSubtitle: {
    color: dark.mutedForeground,
    fontSize: 15,
    lineHeight: 22,
    fontFamily: fontFamilies.rounded.medium,
  },
  headerBlock: {
    gap: 6,
  },
  stepTitle: {
    color: dark.foreground,
    fontSize: 26,
    lineHeight: 32,
    fontFamily: fontFamilies.rounded.bold,
    letterSpacing: -0.6,
  },
  stepSubtitle: {
    color: dark.mutedForeground,
    fontSize: 14,
    lineHeight: 20,
    fontFamily: fontFamilies.rounded.regular,
  },
  recipientRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 2,
  },
  emailPillText: {
    color: dark.foreground,
    fontSize: 14,
    fontFamily: fontFamilies.rounded.semibold,
    textDecorationLine: 'underline',
  },
  formSection: {
    gap: spacing.base,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    borderRadius: radius.xl,
    paddingHorizontal: 14,
    height: 52,
  },
  inputWrapperFocused: {
    borderColor: '#FFFFFF',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  inputLeadingIcon: {
    marginRight: 10,
  },
  emailInput: {
    flex: 1,
    height: '100%',
    color: dark.foreground,
    fontSize: 16,
    fontFamily: fontFamilies.rounded.medium,
    paddingVertical: 0,
  },
  clearButton: {
    padding: 4,
  },
  otpSection: {
    gap: spacing.base,
  },
  resendRow: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 28,
  },
  resendTimerText: {
    color: dark.mutedForeground,
    fontSize: 13,
    fontFamily: fontFamilies.rounded.regular,
  },
  resendTimerDigits: {
    color: dark.foreground,
    fontFamily: fontFamilies.mono.bold,
  },
  resendActionButton: {
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  resendActionText: {
    color: dark.foreground,
    fontSize: 13,
    fontFamily: fontFamilies.rounded.semibold,
    textDecorationLine: 'underline',
  },
  actionsContainer: {
    gap: spacing.md,
    marginTop: spacing.sm,
  },
  primaryCta: {
    backgroundColor: '#FFFFFF',
    borderRadius: radius.full,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#FFFFFF',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 3,
  },
  primaryCtaText: {
    color: '#000000',
    fontSize: 16,
    fontFamily: fontFamilies.rounded.bold,
    letterSpacing: -0.2,
  },
  disclaimerText: {
    color: dark.mutedForeground,
    fontSize: 12,
    fontFamily: fontFamilies.rounded.regular,
    textAlign: 'center',
  },
  errorCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: 'rgba(239, 68, 68, 0.10)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.35)',
    borderRadius: radius.xl,
    paddingHorizontal: spacing.base,
    paddingVertical: 12,
  },
  errorCardText: {
    flex: 1,
    color: brand.error,
    fontSize: 13,
    lineHeight: 18,
    fontFamily: fontFamilies.rounded.medium,
  },
  deniedCard: {
    backgroundColor: 'rgba(245, 158, 11, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.35)',
    borderRadius: radius.xl,
    padding: spacing.base,
    gap: 8,
  },
  deniedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  deniedTitle: {
    color: brand.warning,
    fontSize: 15,
    fontFamily: fontFamilies.rounded.bold,
  },
  deniedBody: {
    color: dark.mutedForeground,
    fontSize: 13,
    lineHeight: 18,
    fontFamily: fontFamilies.rounded.regular,
  },
  deniedAction: {
    alignSelf: 'flex-start',
    marginTop: 4,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: radius.full,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  deniedActionText: {
    color: dark.foreground,
    fontSize: 13,
    fontFamily: fontFamilies.rounded.semibold,
  },
});
