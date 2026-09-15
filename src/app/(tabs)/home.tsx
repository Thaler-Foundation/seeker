// Home: vaults grid with live stats from /api/stats.

import { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  PixelRatio,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { fetchThaler, endpoints, type PublicStats } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { HowItWorksModal } from '@/components/how-it-works-modal';
import { dark, tier, radius, spacing, brand } from '@/theme/tokens';

const TIERS = [
  { key: 'safe', label: 'Safe', color: tier.safe, mode: 'A' },
  { key: 'conservative', label: 'Conservative', color: tier.conservative, mode: 'B' },
  { key: 'balanced', label: 'Balanced', color: tier.balanced, mode: 'C' },
  { key: 'optimistic', label: 'Optimistic', color: tier.optimistic, mode: 'D' },
  { key: 'aggressive', label: 'Aggressive', color: tier.aggressive, mode: 'E' },
  { key: 'yolo', label: 'YOLO', color: tier.yolo, mode: 'F' },
] as const;

function formatTvl(usd: number): string {
  if (usd >= 1e6) return `$${(usd / 1e6).toFixed(1)}M`;
  if (usd >= 1e3) return `$${(usd / 1e3).toFixed(0)}k`;
  return `$${Math.round(usd)}`;
}

export default function Home() {
  const router = useRouter();
  // Table type scales with the row width and divides out any OS font enlargement.
  const { width } = useWindowDimensions();
  const scale =
    Math.max(0.6, Math.min(1, (width - 66) / 346)) / Math.max(1, PixelRatio.getFontScale());
  const [howItWorksOpen, setHowItWorksOpen] = useState(false);
  const stats = useQuery({
    queryKey: ['public-stats'],
    queryFn: () => fetchThaler<PublicStats>(null, endpoints.publicStats),
    staleTime: 30_000,
  });
  const tvl = stats.data?.ok ? stats.data.tvlUsd : 0;
  const tvlSol = stats.data?.ok ? stats.data.tvlSol : 0;
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
    staleTime: 60_000,
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
  const safeApr = aprForMode('A');

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
          <Pressable accessibilityRole="button" onPress={() => setHowItWorksOpen(true)}>
            <Text style={styles.howItWorks}>How it works</Text>
          </Pressable>
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
            <TopStat
              label="Projected APR"
              value={safeApr != null ? `${safeApr.toFixed(2)}%` : '-'}
              tone={brand.success}
            />
            <TopStat
              label="Total Deposits"
              value={tvlSol > 0 ? `${Math.round(tvlSol).toLocaleString()} SOL` : formatTvl(tvl)}
            />
          </View>
        </Pressable>

        <Text style={styles.eyebrow}>ALL VAULTS</Text>
        <View style={styles.list}>
          <View style={styles.row}>
            <View style={styles.hmName}>
              <Text style={[styles.hmHeadCell, { fontSize: 8 * scale, letterSpacing: 0.4 * scale }]}>VAULT</Text>
            </View>
            <Text style={[styles.hmCell, styles.hmHeadCell, { fontSize: 8 * scale, letterSpacing: 0.4 * scale }]}>
              PROJECTED APR
            </Text>
            <Text style={[styles.hmCell, styles.hmHeadCell, { fontSize: 8 * scale, letterSpacing: 0.4 * scale }]}>
              DEPOSITED
            </Text>
          </View>
          {TIERS.map((t) => {
            const apr = aprForMode(t.mode);
            const dep = depositsForMode(t.mode);
            return (
              <Pressable
                key={t.key}
                onPress={() => router.push(`/vault/${t.key}`)}
                style={[styles.row, styles.rowBorder]}
              >
                <View style={[styles.rowLeft, styles.hmName, { gap: 10 * scale }]}>
                  <View
                    style={[
                      styles.dot,
                      { backgroundColor: t.color, width: 12 * scale, height: 12 * scale, borderRadius: 6 * scale },
                    ]}
                  />
                  <Text style={[styles.rowLabel, { fontSize: 14 * scale }]}>{t.label} Vault</Text>
                </View>
                <Text style={[styles.rowValue, styles.hmCell, { fontSize: 12 * scale }]}>
                  {apr != null ? `${apr.toFixed(2)}%` : '-'}
                </Text>
                <Text style={[styles.rowValue, styles.hmCell, { fontSize: 12 * scale }]}>
                  {dep != null ? `${Math.round(dep).toLocaleString()} SOL` : '-'}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </ScrollView>
      <HowItWorksModal open={howItWorksOpen} onClose={() => setHowItWorksOpen(false)} />
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
  hmName: { flex: 2, minWidth: 0 },
  hmCell: { flex: 1, fontSize: 12, textAlign: 'right' },
  hmHeadCell: { color: dark.mutedForeground, fontSize: 8, letterSpacing: 0.4, fontWeight: '600' },
  soon: { color: dark.mutedForeground, fontSize: 12 },
});
