// Analytics: protocol KPIs and strategy breakdown from /v1/analytics.

import { type ReactNode } from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import Svg, { Polyline } from 'react-native-svg';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import type { AnalyticsKpis, StrategyBreakdownRow } from '@/lib/contracts';
import { fetchThaler, endpoints, type PublicStats } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { dark, tier, radius, spacing } from '@/theme/tokens';

type AnalyticsResponse = {
  kpis: AnalyticsKpis;
  strategyBreakdown: StrategyBreakdownRow[];
  tvlDailyUsd?: { date: string; tvlUsd: number }[];
  apyByModeDaily?: { date: string; mode: string; apyBps: number }[];
  venueAllocation?: { venue: string; pct: number }[];
  assetAllocation?: { name: string; pct: number }[];
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

function compactSol(v: number): string {
  if (v >= 1e6) return `${(v / 1e6).toFixed(2)}M`;
  if (v >= 1e3) return `${(v / 1e3).toFixed(2)}k`;
  return v.toFixed(2);
}

// sol amount primary, live usd smaller in parentheses, same as the web hero.
function SolUsd({ sol, price }: { sol: number; price: number }) {
  return (
    <Text style={styles.kpiValue}>
      {compactSol(sol)} SOL
      <Text style={styles.kpiUsd}> ({compactUsd(sol * price)})</Text>
    </Text>
  );
}

function MiniChart({ data, color }: { data: [number, number][]; color: string }) {
  if (data.length < 2) return <Text style={styles.chartEmpty}>No data yet.</Text>;
  const xs = data.map((p) => p[0]);
  const ys = data.map((p) => p[1]);
  const x0 = Math.min(...xs);
  const spanX = Math.max(...xs) - x0 || 1;
  const yMin = Math.min(...ys);
  const spanY = Math.max(...ys) - yMin || 1;
  const pts = data
    .map(
      ([x, y]) =>
        `${(((x - x0) / spanX) * 100).toFixed(2)},${(1 + (1 - (y - yMin) / spanY) * 38).toFixed(2)}`
    )
    .join(' ');
  return (
    <Svg width="100%" height={120} viewBox="0 0 100 40" preserveAspectRatio="none">
      <Polyline points={pts} fill="none" stroke={color} strokeWidth={0.7} strokeLinejoin="round" />
    </Svg>
  );
}

function ChartCard({
  title,
  sub,
  data,
  color,
}: {
  title: string;
  sub: string;
  data: [number, number][];
  color: string;
}) {
  return (
    <View style={styles.chartCard}>
      <Text style={styles.chartTitle}>{title}</Text>
      <Text style={styles.chartSub}>{sub}</Text>
      <MiniChart data={data} color={color} />
    </View>
  );
}

function AllocList({
  title,
  rows,
}: {
  title: string;
  rows: { name: string; pct: number; color: string }[];
}) {
  return (
    <View style={styles.allocBlock}>
      <Text style={styles.eyebrow}>{title}</Text>
      {rows.length === 0 ? (
        <Text style={styles.soon}>No active positions yet.</Text>
      ) : (
        rows.map((r) => (
          <View key={r.name} style={styles.allocRow}>
            <View style={[styles.dot, { backgroundColor: r.color }]} />
            <Text style={styles.allocName}>{r.name}</Text>
            <View style={styles.allocBarTrack}>
              <View
                style={[styles.allocBarFill, { width: `${Math.min(100, r.pct)}%`, backgroundColor: r.color }]}
              />
            </View>
            <Text style={styles.allocPct}>{r.pct}%</Text>
          </View>
        ))
      )}
    </View>
  );
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
  const pub = useQuery({
    queryKey: ['public-stats'],
    queryFn: () => fetchThaler<PublicStats>(null, endpoints.publicStats),
    staleTime: 60_000,
  });
  const k = q.data?.kpis;
  const breakdown = q.data?.strategyBreakdown ?? [];
  const num = (v: number | null | undefined) =>
    typeof v === 'number' && Number.isFinite(v) ? v : 0;
  // sol-primary tvl + total yield summed from the per-mode rows, same as web.
  const totalTvlSol = breakdown.reduce((s, r) => s + num(r.tvlSol), 0);
  const totalYieldSol = breakdown.reduce((s, r) => s + num(r.lifetimeYieldSol), 0);
  const sumTvlUsd = breakdown.reduce((s, r) => s + num(r.tvlUsd), 0);
  // live price, else the price implied by the server rows.
  const livePrice = pub.data?.ok ? pub.data.solPriceUsd : 0;
  const solPrice = livePrice > 0 ? livePrice : totalTvlSol > 0 ? sumTvlUsd / totalTvlSol : 0;
  // total yield generated includes the pending unswapped usdc, same as the vault.
  const totalPendingUsdcUsd = breakdown.reduce((s, r) => s + num(r.pendingUsdcUsd), 0);
  const totalYieldGenSol = totalYieldSol + (solPrice > 0 ? totalPendingUsdcUsd / solPrice : 0);
  const KPIS: { label: string; value?: string; node?: ReactNode }[] = [
    {
      label: 'Total Value Locked',
      node: k ? <SolUsd sol={totalTvlSol} price={solPrice} /> : undefined,
      value: k ? undefined : '-',
    },
    { label: 'Protocol Return Rate', value: k && k.roiPct != null ? `${k.roiPct.toFixed(2)}%` : '-' },
    {
      label: 'Yield Generated',
      node: k ? <SolUsd sol={totalYieldGenSol} price={solPrice} /> : undefined,
      value: k ? undefined : '-',
    },
    { label: 'Active Vaults', value: k ? String(k.activeVaultCount) : '-' },
  ];

  // total tvl over time in sol, the safe tier daily projected apr, and the
  // asset + venue allocation, the same data the web analytics sections use.
  const tvlSeries: [number, number][] = (q.data?.tvlDailyUsd ?? [])
    .filter((p) => p.tvlUsd > 0)
    .map((p) => [Date.parse(p.date), solPrice > 0 ? p.tvlUsd / solPrice : 0] as [number, number])
    .sort((a, b) => a[0] - b[0]);
  const aprSeries: [number, number][] = (q.data?.apyByModeDaily ?? [])
    .filter((p) => p.mode === 'A')
    .map((p) => [Date.parse(p.date), p.apyBps / 100] as [number, number])
    .sort((a, b) => a[0] - b[0]);
  const ASSET_COLOR: Record<string, string> = { jitoSOL: '#4ADE80', mSOL: '#166534', SOL: '#9945FF' };
  const VENUE_COLOR: Record<string, string> = { hyperliquid: '#50E3C2', pacifica: '#3B7BBE', kamino: '#00BCD4' };
  const assetRows = (q.data?.assetAllocation ?? []).map((a) => ({
    name: a.name,
    pct: a.pct,
    color: ASSET_COLOR[a.name] ?? '#6b7280',
  }));
  const venueRows = (q.data?.venueAllocation ?? []).map((v) => ({
    name: v.venue.charAt(0).toUpperCase() + v.venue.slice(1),
    pct: v.pct,
    color: VENUE_COLOR[v.venue.toLowerCase()] ?? '#6b7280',
  }));

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
              {c.node ?? <Text style={styles.kpiValue}>{c.value}</Text>}
              <Text style={styles.kpiLabel}>{c.label}</Text>
            </View>
          ))}
        </View>
        <ChartCard title="Total Value Locked" sub="protocol tvl in sol" data={tvlSeries} color="#9945FF" />
        <ChartCard title="Projected APR" sub="safe tier daily" data={aprSeries} color={tier.safe} />
        <View style={styles.list}>
          <AllocList title="ASSET ALLOCATION" rows={assetRows} />
          <View style={styles.allocDivider} />
          <AllocList title="VENUE ALLOCATION" rows={venueRows} />
        </View>
        <View style={styles.list}>
          <Text style={[styles.eyebrow, { padding: spacing.base, paddingBottom: 8 }]}>
            STRATEGY BREAKDOWN
          </Text>
          {breakdown.map((r, i) => {
            const meta = MODE_META[r.mode] ?? MODE_META.A;
            return (
              <View key={r.mode} style={[styles.row, i > 0 && styles.rowBorder]}>
                <View style={styles.rowL}>
                  <View style={[styles.dot, { backgroundColor: meta.color }]} />
                  <Text style={styles.rowLabel}>{meta.label}</Text>
                </View>
                <Text style={styles.rowValue}>
                  {`${r.vaultCount}  ${compactSol(num(r.tvlSol))} SOL  ${
                    r.apy30dMedianBps != null ? (r.apy30dMedianBps / 100).toFixed(1) : '-'
                  }%`}
                </Text>
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
  kpiUsd: { fontSize: 11, fontWeight: '400', color: dark.mutedForeground },
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
  chartCard: {
    backgroundColor: dark.card,
    borderColor: dark.border,
    borderWidth: 1,
    borderRadius: radius.xl + 2,
    padding: spacing.base,
    gap: 6,
  },
  chartTitle: { color: dark.foreground, fontSize: 15, fontWeight: '600' },
  chartSub: { color: dark.mutedForeground, fontSize: 12 },
  chartEmpty: { color: dark.mutedForeground, fontSize: 13, textAlign: 'center', paddingVertical: 40 },
  allocBlock: { padding: spacing.base, gap: 10 },
  allocRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  allocName: { color: dark.foreground, fontSize: 13, width: 92 },
  allocBarTrack: { flex: 1, height: 6, borderRadius: 3, backgroundColor: dark.muted, overflow: 'hidden' },
  allocBarFill: { height: 6, borderRadius: 3 },
  allocPct: { color: dark.foreground, fontSize: 13, fontVariant: ['tabular-nums'], width: 44, textAlign: 'right' },
  allocDivider: { height: 1, backgroundColor: dark.border },
});
