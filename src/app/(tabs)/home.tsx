// Home: vaults grid with live stats from /api/stats.

import { View, Text, ScrollView, Pressable, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { fetchThaler, endpoints, type PublicStats } from '@/lib/api';
import { dark, tier, radius, spacing, brand } from '@/theme/tokens';

const TIERS = [
  { key: 'safe', label: 'Safe', color: tier.safe, live: true },
  { key: 'conservative', label: 'Conservative', color: tier.conservative, live: false },
  { key: 'balanced', label: 'Balanced', color: tier.balanced, live: false },
  { key: 'optimistic', label: 'Optimistic', color: tier.optimistic, live: false },
  { key: 'aggressive', label: 'Aggressive', color: tier.aggressive, live: false },
  { key: 'yolo', label: 'YOLO', color: tier.yolo, live: false },
] as const;

function toThirtyDayApy(annualPct: number): number {
  return (Math.pow(1 + annualPct / 100, 30 / 365) - 1) * 100;
}

function formatTvl(usd: number): string {
  if (usd >= 1e6) return `$${(usd / 1e6).toFixed(1)}M`;
  if (usd >= 1e3) return `$${(usd / 1e3).toFixed(0)}k`;
  return `$${Math.round(usd)}`;
}

export default function Home() {
  const router = useRouter();
  const stats = useQuery({
    queryKey: ['public-stats'],
    queryFn: () => fetchThaler<PublicStats>(null, endpoints.publicStats),
    staleTime: 30_000,
  });
  const tvl = stats.data?.ok ? stats.data.tvlUsd : 0;
  const tvlSol = stats.data?.ok ? stats.data.tvlSol : 0;
  const solPrice = stats.data?.ok ? stats.data.solPriceUsd : 0;
  const apy30 = stats.data?.ok ? toThirtyDayApy(stats.data.apy) : 0;

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.headRow}>
          <Text style={styles.h1}>Vaults</Text>
          <View style={styles.topStats}>
            <TopStat
              label="SOL Price"
              value={solPrice > 0 ? `$${solPrice.toFixed(2)}` : '-'}
            />
            <Pressable
              accessibilityRole="button"
              onPress={() => router.push('/wallet')}
              style={styles.walletPill}
            >
              <Text style={styles.walletPillLabel}>Wallet</Text>
            </Pressable>
          </View>
        </View>

        <View style={styles.featHead}>
          <Text style={styles.eyebrow}>FEATURED</Text>
          <Text style={styles.howItWorks}>How it works</Text>
        </View>
        <Pressable
          accessibilityRole="button"
          onPress={() => router.push('/vault/safe')}
          style={styles.featured}
        >
          <Text style={[styles.eyebrow, { color: tier.safe }]}>THALER ONE</Text>
          <Text style={styles.featTitle}>Safe Vault</Text>
          <Text style={styles.featBody}>
            Kamino lend carry plus a Pacifica delta-neutral hedge. Yield in any market direction.
          </Text>
          <View style={styles.featStats}>
            <TopStat label="30D APY" value={`${apy30.toFixed(2)}%`} tone={brand.success} />
            <TopStat
              label="Deposited"
              value={tvlSol > 0 ? `${Math.round(tvlSol).toLocaleString()} SOL` : formatTvl(tvl)}
            />
          </View>
        </Pressable>

        <Text style={styles.eyebrow}>ALL VAULTS</Text>
        <View style={styles.list}>
          {TIERS.map((t, i) => (
            <Pressable
              key={t.key}
              disabled={!t.live}
              onPress={() => router.push(`/vault/${t.key}`)}
              style={[styles.row, i > 0 && styles.rowBorder, !t.live && { opacity: 0.5 }]}
            >
              <View style={styles.rowLeft}>
                <View style={[styles.dot, { backgroundColor: t.color }]} />
                <Text style={styles.rowLabel}>{t.label} Vault</Text>
              </View>
              {t.live ? (
                <Text style={styles.rowValue}>
                  {`${apy30.toFixed(2)}%  ${formatTvl(tvl)}`}
                </Text>
              ) : (
                <Text style={styles.soon}>Coming soon</Text>
              )}
            </Pressable>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function TopStat({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <View style={styles.topStat}>
      <Text style={[styles.topStatValue, tone ? { color: tone } : null]}>{value}</Text>
      <Text style={styles.topStatLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: dark.background },
  scroll: { padding: spacing.base, gap: spacing.base },
  headRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  h1: { color: dark.foreground, fontSize: 30, fontWeight: '700', letterSpacing: -0.6 },
  topStats: { flexDirection: 'row', gap: spacing.lg },
  topStat: { alignItems: 'flex-end' },
  topStatValue: { color: dark.foreground, fontSize: 16, fontWeight: '600', fontVariant: ['tabular-nums'] },
  topStatLabel: { color: dark.mutedForeground, fontSize: 11 },
  eyebrow: { color: dark.mutedForeground, fontSize: 10, letterSpacing: 1.4, fontWeight: '600' },
  featHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  howItWorks: { color: dark.mutedForeground, fontSize: 12, fontWeight: '500' },
  walletPill: {
    borderColor: dark.border,
    borderWidth: 1,
    borderRadius: radius.full,
    paddingHorizontal: 12,
    paddingVertical: 6,
    justifyContent: 'center',
  },
  walletPillLabel: { color: dark.foreground, fontSize: 12, fontWeight: '500' },
  featured: {
    backgroundColor: dark.card,
    borderColor: dark.border,
    borderWidth: 1,
    borderRadius: radius.xxl,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  featTitle: { color: dark.foreground, fontSize: 22, fontWeight: '700' },
  featBody: { color: dark.mutedForeground, fontSize: 12, lineHeight: 17 },
  featStats: { flexDirection: 'row', gap: spacing.xl, marginTop: spacing.xs },
  list: {
    backgroundColor: dark.card,
    borderColor: dark.border,
    borderWidth: 1,
    borderRadius: radius.xl + 2,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.base,
    paddingVertical: 14,
  },
  rowBorder: { borderTopColor: dark.border, borderTopWidth: 1 },
  rowLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  dot: { width: 12, height: 12, borderRadius: 6 },
  rowLabel: { color: dark.foreground, fontSize: 14, fontWeight: '500' },
  rowValue: { color: dark.foreground, fontSize: 13, fontVariant: ['tabular-nums'] },
  soon: { color: dark.mutedForeground, fontSize: 12 },
});
