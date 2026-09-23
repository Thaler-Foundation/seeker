import { HowItWorksModal } from '@/components/how-it-works-modal';
import { TermsModal } from '@/components/terms-modal';
import { endpoints, fetchThaler } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { brand, dark, glass, radius, spacing } from '@/theme/tokens';
import { fontFamilies, typography } from '@/theme/typography';
import { useQuery } from '@tanstack/react-query';
import * as Clipboard from 'expo-clipboard';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  Alert,
  Linking,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Circle, Path } from 'react-native-svg';
import { useSidebar } from './sidebar-context';

const DOCS_URL = 'https://docs.thaler.finance/';

function shortAddr(a: string): string {
  return a.length > 12 ? `${a.slice(0, 4)}...${a.slice(-4)}` : a;
}

export function SidebarDrawer() {
  const { isOpen, closeSidebar } = useSidebar();
  const { width } = useWindowDimensions();
  const drawerWidth = Math.min(320, width * 0.82);

  const { email, gate, signOut, getToken } = useAuth();
  const [copied, setCopied] = useState(false);
  const [howOpen, setHowOpen] = useState(false);
  const [termsOpen, setTermsOpen] = useState(false);

  const walletQ = useQuery({
    queryKey: ['dual-balance'],
    queryFn: async () =>
      fetchThaler<{ address: string; lamports: string }>(await getToken(), endpoints.dualWalletBalance),
    enabled: isOpen,
    staleTime: 60_000,
  });

  const address = walletQ.data?.address;

  // Animation values
  const translateX = useSharedValue(-drawerWidth);
  const backdropOpacity = useSharedValue(0);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (isOpen) {
      runOnJS(setVisible)(true);
      translateX.value = withTiming(0, {
        duration: 420,
        easing: Easing.bezier(0.22, 1, 0.36, 1),
      });
      backdropOpacity.value = withTiming(1, { duration: 420 });
    } else {
      translateX.value = withTiming(
        -drawerWidth,
        {
          duration: 320,
          easing: Easing.bezier(0.25, 0.1, 0.25, 1),
        },
        (finished) => {
          if (finished) {
            runOnJS(setVisible)(false);
          }
        }
      );
      backdropOpacity.value = withTiming(0, { duration: 280 });
    }
  }, [isOpen, drawerWidth, translateX, backdropOpacity]);

  const drawerStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: backdropOpacity.value,
  }));

  const onCopyAddress = async () => {
    if (!address) return;
    await Clipboard.setStringAsync(address);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const router = useRouter();

  const onSignOut = () => {
    Alert.alert('Sign Out', 'Are you sure you want to disconnect from Thaler?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          closeSidebar();
          await signOut();
          router.replace('/');
        },
      },
    ]);
  };

  return (
    <>
      {visible ? (
        <View style={StyleSheet.absoluteFill} pointerEvents={isOpen ? 'auto' : 'none'}>
          <Animated.View style={[s.backdrop, backdropStyle]}>
            <Pressable style={StyleSheet.absoluteFill} onPress={closeSidebar} />
          </Animated.View>

          <Animated.View style={[s.drawer, { width: drawerWidth }, drawerStyle]}>
            <SafeAreaView style={s.safe} edges={['top', 'bottom']}>
              <View style={s.header}>
                <View style={s.avatarRow}>
                  <View style={s.avatar}>
                    <Text style={s.avatarText}>
                      {email ? email.slice(0, 2).toUpperCase() : 'TH'}
                    </Text>
                  </View>
                  <View style={s.userMeta}>
                    <Text style={s.email} numberOfLines={1}>
                      {email ?? 'Account'}
                    </Text>
                    <View style={s.badgeRow}>
                      <View style={[s.statusDot, gate === 'allowed' ? s.dotGreen : s.dotAmber]} />
                      <Text style={s.badgeText}>
                        {gate === 'allowed' ? 'Beta Access Verified' : 'Checking Access'}
                      </Text>
                    </View>
                  </View>
                </View>

                <Pressable
                  accessibilityRole="button"
                  onPress={closeSidebar}
                  style={s.closeBtn}
                  hitSlop={14}
                >
                  <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
                    <Path
                      d="M18 6L6 18M6 6l12 12"
                      stroke={dark.mutedForeground}
                      strokeWidth={2}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </Svg>
                </Pressable>
              </View>

              {/* Wallet Address Box */}
              {address ? (
                <Pressable onPress={onCopyAddress} style={s.addressBox}>
                  <View style={s.addressL}>
                    <Svg width={14} height={14} viewBox="0 0 24 24" fill="none">
                      <Path
                        d="M19 7V4a1 1 0 0 0-1-1H5a2 2 0 0 0 0 4h15a1 1 0 0 1 1 1v4h-3a2 2 0 0 0 0 4h3a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1"
                        stroke={dark.mutedForeground}
                        strokeWidth={1.8}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      <Path
                        d="M3 5v14a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1v-4"
                        stroke={dark.mutedForeground}
                        strokeWidth={1.8}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </Svg>
                    <Text style={s.addressText}>{shortAddr(address)}</Text>
                  </View>
                  <Text style={s.copyLabel}>{copied ? 'Copied' : 'Copy'}</Text>
                </Pressable>
              ) : null}

              <View style={s.navGroup}>
                <DrawerItem
                  label="How It Works"
                  sub="4-step yield architecture guide"
                  onPress={() => {
                    setHowOpen(true);
                  }}
                  icon="help"
                />
                <DrawerItem
                  label="Terms & Policy"
                  sub="Squads policy & non-custodial rules"
                  onPress={() => {
                    setTermsOpen(true);
                  }}
                  icon="shield"
                />
                <DrawerItem
                  label="Documentation"
                  sub="Read strategy deep dives"
                  onPress={() => {
                    void Linking.openURL(DOCS_URL).catch(() => { });
                  }}
                  icon="book"
                  external
                />
              </View>

              <View style={s.networkCard}>
                <View style={s.networkRow}>
                  <View style={[s.statusDot, s.dotGreen]} />
                  <Text style={s.networkTitle}>Solana Mainnet-Beta</Text>
                </View>
                <Text style={s.networkSub}>Squads Policy · Non-Custodial</Text>
              </View>

              <View style={s.footer}>
                <Pressable accessibilityRole="button" onPress={onSignOut} style={s.signOutBtn}>
                  <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
                    <Path
                      d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"
                      stroke={dark.destructive}
                      strokeWidth={2}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </Svg>
                  <Text style={s.signOutText}>Sign Out</Text>
                </Pressable>
                <Text style={s.versionText}>Thaler Seeker v1.0.0</Text>
              </View>
            </SafeAreaView>
          </Animated.View>
        </View>
      ) : null}

      <HowItWorksModal open={howOpen} onClose={() => setHowOpen(false)} />
      <TermsModal
        open={termsOpen}
        onClose={() => setTermsOpen(false)}
        onAccept={() => setTermsOpen(false)}
      />
    </>
  );
}

function DrawerItem({
  label,
  sub,
  onPress,
  icon,
  external,
}: {
  label: string;
  sub: string;
  onPress: () => void;
  icon: 'help' | 'shield' | 'book';
  external?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [s.drawerItem, pressed && { backgroundColor: 'rgba(255,255,255,0.05)' }]}
    >
      <View style={s.itemIcon}>
        {icon === 'help' ? (
          <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
            <Circle cx={12} cy={12} r={10} stroke={dark.mutedForeground} strokeWidth={1.8} />
            <Path
              d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3M12 17h.01"
              stroke={dark.mutedForeground}
              strokeWidth={1.8}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </Svg>
        ) : icon === 'shield' ? (
          <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
            <Path
              d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"
              stroke={dark.mutedForeground}
              strokeWidth={1.8}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </Svg>
        ) : (
          <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
            <Path
              d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20M4 4.5A2.5 2.5 0 0 1 6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15z"
              stroke={dark.mutedForeground}
              strokeWidth={1.8}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </Svg>
        )}
      </View>
      <View style={s.itemText}>
        <View style={s.itemTitleRow}>
          <Text style={s.itemTitle}>{label}</Text>
          {external ? (
            <Svg width={12} height={12} viewBox="0 0 24 24" fill="none">
              <Path
                d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6M15 3h6v6M10 14L21 3"
                stroke={dark.mutedForeground}
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </Svg>
          ) : null}
        </View>
        <Text style={s.itemSub}>{sub}</Text>
      </View>
    </Pressable>
  );
}

const s = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: glass.backdrop,
  },
  drawer: {
    height: '100%',
    backgroundColor: '#111114',
    borderRightWidth: 1,
    borderRightColor: glass.border,
    shadowColor: '#000',
    shadowOffset: { width: 4, height: 0 },
    shadowOpacity: 0.45,
    shadowRadius: 24,
    elevation: 20,
  },
  safe: {
    flex: 1,
    paddingHorizontal: spacing.base,
    justifyContent: 'space-between',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: spacing.md,
    paddingBottom: spacing.base,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  avatarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    flex: 1,
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: brand.blue,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  avatarText: {
    color: '#fff',
    fontFamily: fontFamilies.rounded.bold,
    fontSize: 16,
  },
  userMeta: {
    flex: 1,
    gap: 3,
  },
  email: {
    ...typography.headline,
    color: dark.foreground,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  dotGreen: {
    backgroundColor: brand.success,
  },
  dotAmber: {
    backgroundColor: brand.warning,
  },
  badgeText: {
    ...typography.caption,
    color: dark.mutedForeground,
  },
  closeBtn: {
    padding: spacing.sm,
    borderRadius: radius.full,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  addressBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: radius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    marginTop: spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  addressL: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  addressText: {
    ...typography.mono,
    color: dark.foreground,
    fontSize: 13,
  },
  copyLabel: {
    ...typography.caption,
    color: brand.blueBright,
  },
  navGroup: {
    marginTop: spacing.lg,
    gap: 4,
  },
  drawerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.md,
    gap: spacing.md,
  },
  itemIcon: {
    width: 32,
    height: 32,
    borderRadius: radius.md,
    backgroundColor: 'rgba(255,255,255,0.04)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemText: {
    flex: 1,
    gap: 2,
  },
  itemTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  itemTitle: {
    ...typography.headline,
    color: dark.foreground,
    fontSize: 15,
  },
  itemSub: {
    ...typography.caption,
    color: dark.mutedForeground,
  },
  networkCard: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: radius.lg,
    padding: spacing.md,
    gap: 4,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    marginTop: 'auto',
    marginBottom: spacing.md,
  },
  networkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  networkTitle: {
    ...typography.captionBold,
    color: dark.foreground,
  },
  networkSub: {
    ...typography.caption,
    color: dark.mutedForeground,
    fontSize: 11,
  },
  footer: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.06)',
    paddingTop: spacing.md,
    gap: spacing.sm,
  },
  signOutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: 12,
    borderRadius: radius.lg,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
  },
  signOutText: {
    ...typography.callout,
    color: dark.destructive,
    fontFamily: fontFamilies.rounded.semibold,
  },
  versionText: {
    ...typography.caption,
    color: 'rgba(255,255,255,0.3)',
    textAlign: 'center',
    fontSize: 11,
  },
});
