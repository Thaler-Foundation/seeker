import { HowItWorksModal } from '@/components/how-it-works-modal';
import { SidebarTrigger } from '@/components/sidebar/sidebar-trigger';
import { Waves } from '@/components/waves';
import { PressableScale } from '@/components/ui/pressable-scale';
import { endpoints, fetchThaler, type PublicStats } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { brand, dark, dock, glass, radius, spacing, tier } from '@/theme/tokens';
import { typography } from '@/theme/typography';
import { useQuery } from '@tanstack/react-query';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  PixelRatio,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

const TIERS = [
  {
    key: 'safe',
    label: 'Safe',
    color: tier.safe,
    mode: 'A',
    risk: 'Low',
    desc: 'Kamino lend carry plus a Pacifica delta-neutral perp hedge. Earn yield in any market direction.',
  },
  {
    key: 'conservative',
    label: 'Conservative',
    color: tier.conservative,
    mode: 'B',
    risk: 'Low',
    desc: 'A slightly larger hedge than Safe. Adds to the funding income, same leverage.',
  },
  {
    key: 'balanced',
    label: 'Balanced',
    color: tier.balanced,
    mode: 'C',
    risk: 'Medium',
    desc: 'An even mix of loops and hedge. Moderate funding income joins the staking and lending yield.',
  },
  {
    key: 'optimistic',
    label: 'Optimistic',
    color: tier.optimistic,
    mode: 'D',
    risk: 'Medium',
    desc: 'Hedge focused for stronger funding capture. A bigger short with the carry loop still underneath.',
  },
  {
    key: 'aggressive',
    label: 'Aggressive',
    color: tier.aggressive,
    mode: 'E',
    risk: 'High',
    desc: 'Funding yield with a heavy hedge. Larger borrow and short sizes drive faster compounding.',
  },
  {
    key: 'yolo',
    label: 'YOLO',
    color: tier.yolo,
    mode: 'F',
    risk: 'High',
    desc: 'Maximum hedge, full looped collateral shorted. Highest funding capture at the widest risk band.',
  },
] as const;

type TierKey = (typeof TIERS)[number]['key'];

export default function Home() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const scale =
    Math.max(0.6, Math.min(1, (width - 66) / 346)) / Math.max(1, PixelRatio.getFontScale());
  const [howItWorksOpen, setHowItWorksOpen] = useState(false);

  const stats = useQuery({
    queryKey: ['public-stats'],
    queryFn: () => fetchThaler<PublicStats>(null, endpoints.publicStats),
    staleTime: 60_000,
  });
  const solPrice = stats.data?.ok ? stats.data.solPriceUsd : 0;

  const { getToken, authenticated } = useAuth();
  const analytics = useQuery({
    queryKey: ['analytics'],
    queryFn: async () =>
      fetchThaler<{
        apyByModeDaily?: { date: string; mode: string; apyBps: number }[];
        strategyBreakdown?: { mode: string; tvlUsd: number; tvlSol?: number }[];
      }>(await getToken(), endpoints.analytics),
    enabled: authenticated,
    staleTime: 5 * 60_000,
  });

  const aprForMode = (mode: string): number | null => {
    const pts = (analytics.data?.apyByModeDaily ?? [])
      .filter((p) => p.mode === mode)
      .sort((a, b) => Date.parse(a.date) - Date.parse(b.date));
    const bps = pts.length ? pts[pts.length - 1]!.apyBps : undefined;
    return typeof bps === 'number' && Number.isFinite(bps) ? bps / 100 : null;
  };

  const depositsForMode = (mode: string): number | null => {
    const row = (analytics.data?.strategyBreakdown ?? []).find((r) => r.mode === mode);
    if (!row) return null;
    const sol = row.tvlSol ?? (solPrice > 0 ? row.tvlUsd / solPrice : undefined);
    return typeof sol === 'number' && Number.isFinite(sol) ? sol : null;
  };

  const [selectedTier, setSelectedTier] = useState<TierKey>('conservative');
  const currentTier = TIERS.find((t) => t.key === selectedTier) ?? TIERS[1];
  const currentApr = aprForMode(currentTier.mode);
  const currentDeposits = depositsForMode(currentTier.mode);

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: dock.height + 24 }]}
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        <Animated.View entering={FadeIn.duration(260)} style={{ gap: 16 }}>
          <View style={styles.headGroup}>
            <View style={styles.headRow}>
              <View style={styles.headLeft}>
                <SidebarTrigger />
                <Text style={styles.h1}>Vaults</Text>
              </View>

              <View style={styles.solPill}>
                <View style={styles.liveDot} />
                <Text style={styles.solPriceLabel}>
                  SOL {solPrice > 0 ? `$${solPrice.toFixed(2)}` : '--'}
                </Text>
              </View>
            </View>
            <Text style={styles.subtitle}>Automated strategies for onchain yield.</Text>
          </View>

          <Animated.View entering={FadeInDown.duration(380).delay(60)} style={styles.featHead}>
            <Text style={styles.eyebrow}>FEATURED STRATEGY</Text>
            <Pressable accessibilityRole="button" onPress={() => setHowItWorksOpen(true)}>
              <Text style={styles.howItWorks}>How it works</Text>
            </Pressable>
          </Animated.View>

          <Animated.View entering={FadeInDown.duration(420).delay(80)}>
            <View style={styles.featured}>
              <Waves variant="card" opacity={0.4} tintColor={currentTier.color} />

              <LinearGradient
                colors={[dark.card, dark.card, 'rgba(20, 20, 22, 0.65)', 'transparent']}
                locations={[0, 0.38, 0.68, 1]}
                start={{ x: 0, y: 0.5 }}
                end={{ x: 1, y: 0.5 }}
                style={StyleSheet.absoluteFill}
                pointerEvents="none"
              />

              <PressableScale
                accessibilityLabel={`Featured ${currentTier.label} Vault`}
                onPress={() => router.push(`/vault/${currentTier.key}`)}
                scaleTo={0.985}
              >
                <View style={styles.featEyebrowPill}>
                  <Text style={styles.featEyebrowText}>THALER ONE</Text>
                </View>
                <Text style={styles.featTitle}>{currentTier.label} Vault</Text>
                <Text style={styles.featBody}>{currentTier.desc}</Text>

                <View style={styles.featBottomRow}>
                  <View style={styles.featStats}>
                    <TopStat
                      label="Projected APR"
                      value={currentApr != null ? `${currentApr.toFixed(2)}%` : '-'}
                      tone={brand.success}
                    />
                    <TopStat
                      label="Total Deposits"
                      value={
                        currentDeposits != null
                          ? `${Math.round(currentDeposits).toLocaleString()} SOL`
                          : '-'
                      }
                    />
                  </View>

                  <View style={styles.viewVaultInline}>
                    <Text style={styles.viewVaultText}>View Vault </Text>
                  </View>
                </View>
              </PressableScale>
            </View>
          </Animated.View>

          <Animated.View entering={FadeInDown.duration(350).delay(160)}>
            <Text style={styles.eyebrow}>ALL TIERS</Text>
          </Animated.View>

          <View style={styles.list}>
            <View style={styles.row}>
              <View style={styles.hmName}>
                <Text style={[styles.hmHeadCell, { fontSize: 9 * scale, letterSpacing: 0.5 * scale }]}>VAULT</Text>
              </View>
              <Text style={[styles.hmCell, styles.hmHeadCell, { fontSize: 9 * scale, letterSpacing: 0.5 * scale }]}>
                PROJECTED APR
              </Text>
              <Text style={[styles.hmCell, styles.hmHeadCell, { fontSize: 9 * scale, letterSpacing: 0.5 * scale }]}>
                DEPOSITED
              </Text>
            </View>
            {TIERS.map((t, idx) => {
              const apr = aprForMode(t.mode);
              const dep = depositsForMode(t.mode);
              const isSelected = t.key === selectedTier;
              return (
                <Animated.View
                  key={t.key}
                  entering={FadeInDown.duration(320).delay(200 + idx * 40)}
                >
                  <PressableScale
                    scaleTo={0.985}
                    accessibilityRole="button"
                    onPress={() => {
                      setSelectedTier(t.key);
                    }}
                    style={[
                      styles.row,
                      styles.rowBorder,
                      isSelected && { backgroundColor: 'rgba(255, 255, 255, 0.08)' },
                    ]}
                  >
                    <View style={[styles.rowLeft, styles.hmName, { gap: 8 * scale }]}>
                      <View
                        style={[
                          styles.dot,
                          { backgroundColor: t.color, width: 12 * scale, height: 12 * scale, borderRadius: 6 * scale },
                        ]}
                      />
                      <Text
                        style={[
                          styles.rowLabel,
                          { fontSize: 14 * scale },
                          isSelected && { color: dark.foreground, fontWeight: '700' },
                        ]}
                      >
                        {t.label} Vault
                      </Text>
                    </View>
                    <Text
                      style={[
                        styles.rowValue,
                        styles.hmCell,
                        { fontSize: 13 * scale },
                        isSelected && { color: brand.success, fontWeight: '600' },
                      ]}
                    >
                      {apr != null ? `${apr.toFixed(2)}%` : '-'}
                    </Text>
                    <Text
                      style={[
                        styles.rowValue,
                        styles.hmCell,
                        { fontSize: 13 * scale },
                        isSelected && { fontWeight: '600' },
                      ]}
                    >
                      {dep != null ? `${Math.round(dep).toLocaleString()} SOL` : '-'}
                    </Text>
                  </PressableScale>
                </Animated.View>
              );
            })}
          </View>
        </Animated.View>
      </ScrollView>
      <HowItWorksModal open={howItWorksOpen} onClose={() => setHowItWorksOpen(false)} />
    </SafeAreaView>
  );
}

function TopStat({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: string;
}) {
  return (
    <View style={styles.topStat}>
      <Text style={styles.topStatLabel}>{label}</Text>
      <Text style={[styles.topStatValue, tone ? { color: tone } : null]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: dark.background,
  },
  scroll: {
    paddingHorizontal: spacing.base,
    gap: 12,
  },
  headGroup: {
    gap: 2,
  },
  headRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.xs,
  },
  headLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  h1: {
    ...typography.title1,
    color: dark.foreground,
    fontSize: 28,
  },
  subtitle: {
    ...typography.body,
    color: dark.mutedForeground,
    fontSize: 13,
    lineHeight: 18,
  },
  solPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: brand.success,
  },
  solPriceLabel: {
    ...typography.monoSm,
    color: dark.foreground,
    fontSize: 12,
  },
  eyebrow: {
    ...typography.captionBold,
    color: dark.mutedForeground,
    letterSpacing: 1.2,
    marginTop: 2,
    marginBottom: 2,
  },
  featHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  howItWorks: {
    ...typography.captionBold,
    color: brand.blueBright,
  },
  featured: {
    backgroundColor: dark.card,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderRadius: radius.xxl,
    padding: spacing.lg,
    overflow: 'hidden',
  },
  featEyebrowPill: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.14)',
    borderRadius: radius.full,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginBottom: 10,
  },
  featEyebrowText: {
    ...typography.captionBold,
    color: dark.mutedForeground,
    letterSpacing: 1.2,
    fontSize: 10,
  },
  featTitle: {
    ...typography.title2,
    color: dark.foreground,
    fontSize: 26,
    fontWeight: '700',
    letterSpacing: -0.4,
  },
  featBody: {
    ...typography.body,
    color: dark.mutedForeground,
    fontSize: 13,
    lineHeight: 18,
    marginTop: 2,
    maxWidth: '75%',
  },
  featBottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginTop: spacing.md,
  },
  featStats: {
    flexDirection: 'row',
    gap: spacing.xl,
  },
  topStat: {
    gap: 3,
  },
  topStatValue: {
    ...typography.monoLg,
    color: dark.foreground,
    fontSize: 20,
    lineHeight: 24,
    fontWeight: '700',
  },
  topStatLabel: {
    ...typography.caption,
    color: dark.mutedForeground,
    fontSize: 11,
  },
  viewVaultInline: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  viewVaultText: {
    color: dark.foreground,
    fontSize: 14,
    fontWeight: '600',
  },
  viewVaultArrow: {
    color: dark.mutedForeground,
    fontSize: 20,
    lineHeight: 22,
    fontWeight: '300',
  },
  list: {
    backgroundColor: glass.bg,
    borderColor: glass.border,
    borderWidth: 1,
    borderRadius: radius.xl,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.base,
    paddingVertical: 10,
  },
  rowBorder: {
    borderTopColor: 'rgba(255, 255, 255, 0.06)',
    borderTopWidth: 1,
  },
  rowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  dot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  rowLabel: {
    ...typography.headline,
    color: dark.foreground,
  },
  rowValue: {
    ...typography.mono,
    color: dark.foreground,
  },
  hmName: {
    flex: 2,
    minWidth: 0,
  },
  hmCell: {
    flex: 1,
    textAlign: 'right',
  },
  hmHeadCell: {
    ...typography.captionBold,
    color: dark.mutedForeground,
  },
  activeTierIndicator: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: radius.full,
    borderWidth: 1,
  },
  activeTierIndicatorText: {
    ...typography.captionBold,
    letterSpacing: 0.4,
  },
});
