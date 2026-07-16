// Analytics: protocol KPIs and strategy breakdown from /v1/analytics.

import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import type { AnalyticsKpis, StrategyBreakdownRow } from '@/lib/contracts';
import { fetchThaler, endpoints } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { dark, tier, brand, radius, spacing } from '@/theme/tokens';

type AnalyticsResponse = {
  kpis: AnalyticsKpis;
  strategyBreakdown: StrategyBreakdownRow[];
};

const MODE_META: Record<string, { label: string; color: string }> = {
  A: { label: 'Safe', color: tier.safe },
  B: { label: 'Conservative', color: tier.conservative },
  C: { label: 'Balanced', color: tier.balanced },
  D: { label: 'Optimistic', color: tier.optimistic },
  E: { label: 'Aggressive', color: tier.aggressive },
  F: { label: 'YOLO', color: tier.yolo },
};

function compactUsd(v: number): string {
  if (v >= 1e6) return `$${(v / 1e6).toFixed(1)}M`;
  if (v >= 1e3) return `$${(v / 1e3).toFixed(1)}k`;
  return `$${Math.round(v)}`;
}

export default function Analytics() {
  const { getToken, authenticated } = useAuth();
  const q = useQuery({
    queryKey: ['analytics'],
    queryFn: async () =>
      fetchThaler<AnalyticsResponse>(await getToken(), endpoints.analytics),
    enabled: authenticated,
    staleTime: 60_000,
  });
  const k = q.data?.kpis;
  const KPIS = [
    { label: 'Total Value Locked', value: k ? compactUsd(k.totalTvlUsd) : '-' },
    { label: 'Protocol APY (net)', value: k ? `${(k.projectedApyBps / 100).toFixed(1)}%` : '-' },
    { label: 'Yield Generated', value: k ? compactUsd(k.yield30dUsd) : '-' },
    { label: 'Active Vaults', value: k ? String(k.activeVaultCount) : '-' },
  ];

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.h1}>Analytics</Text>
        <Text style={styles.hint}>
          Across all Thaler vaults. Every figure aggregates positions opened by every user on the
          protocol.
        </Text>
        {!authenticated ? <Text style={styles.hint}>Sign in to load analytics.</Text> : null}
        <View style={styles.grid}>
          {KPIS.map((c) => (
            <View key={c.label} style={styles.kpi}>
              <Text style={styles.kpiValue}>{c.value}</Text>
              <Text style={styles.kpiLabel}>{c.label}</Text>
            </View>
          ))}
        </View>
        <View style={styles.list}>
          <Text style={[styles.eyebrow, { padding: spacing.base, paddingBottom: 8 }]}>
            STRATEGY BREAKDOWN
          </Text>
          {(q.data?.strategyBreakdown ?? []).map((r, i) => {
            const meta = MODE_META[r.mode] ?? MODE_META.A;
            const live = r.vaultCount > 0;
            return (
              <View key={r.mode} style={[styles.row, i > 0 && styles.rowBorder, !live && { opacity: 0.45 }]}>
                <View style={styles.rowL}>
                  <View style={[styles.dot, { backgroundColor: meta.color }]} />
                  <Text style={styles.rowLabel}>{meta.label}</Text>
                </View>
                {live ? (
                  <Text style={styles.rowValue}>
                    {`${r.vaultCount}  ${compactUsd(r.tvlUsd)}  ${(r.projectedApyBps / 100).toFixed(1)}%`}
                  </Text>
                ) : (
                  <Text style={styles.soon}>Coming soon</Text>
                )}
              </View>
            );
          })}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: dark.background },
  scroll: { padding: spacing.base, gap: spacing.base },
  eyebrow: { color: dark.mutedForeground, fontSize: 10, letterSpacing: 1.4, fontWeight: '600' },
  h1: { color: dark.foreground, fontSize: 30, fontWeight: '700', letterSpacing: -0.6 },
  hint: { color: dark.mutedForeground, fontSize: 13 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  kpi: {
    flexGrow: 1,
    minWidth: '45%',
    backgroundColor: dark.card,
    borderColor: dark.border,
    borderWidth: 1,
    borderRadius: radius.xl,
    paddingVertical: spacing.lg,
    alignItems: 'center',
    gap: 4,
  },
  kpiValue: {
    color: dark.foreground,
    fontSize: 19,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
  kpiLabel: { color: dark.mutedForeground, fontSize: 12 },
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
    paddingVertical: 12,
  },
  rowBorder: { borderTopColor: dark.border, borderTopWidth: 1 },
  rowL: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  rowLabel: { color: dark.foreground, fontSize: 14, fontWeight: '500' },
  rowValue: { color: dark.foreground, fontSize: 12, fontVariant: ['tabular-nums'] },
  soon: { color: dark.mutedForeground, fontSize: 12 },
});
