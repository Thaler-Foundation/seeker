import { InteractiveChart } from '@/components/chart/interactive-chart';
import { SidebarTrigger } from '@/components/sidebar/sidebar-trigger';
import { endpoints, fetchThaler, type PublicStats } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import type { AnalyticsKpis, StrategyBreakdownRow } from '@/lib/contracts';
import { brand, dark, dock, glass, radius, spacing, tier } from '@/theme/tokens';
import { typography } from '@/theme/typography';
import { useQuery } from '@tanstack/react-query';
import { LinearGradient } from 'expo-linear-gradient';
import { type ReactNode, useMemo, useState } from 'react';
import {
  PixelRatio,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

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

const CHART_RANGES = [
  { key: '7D', days: 7 },
  { key: '30D', days: 30 },
  { key: '3M', days: 90 },
] as const;
type ChartRangeKey = (typeof CHART_RANGES)[number]['key'];

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

function SolUsd({ sol, price }: { sol: number; price: number }) {
  return (
    <Text style={styles.kpiValue}>
      {compactSol(sol)} SOL
      <Text style={styles.kpiUsd}> ({compactUsd(sol * price)})</Text>
    </Text>
  );
}


type ColorConfig =
  | { type: 'solid'; color: string }
  | { type: 'gradient'; colors: [string, string]; start?: { x: number; y: number }; end?: { x: number; y: number } };

const FALLBACK_COLOR: ColorConfig = { type: 'solid', color: '#6b7280' };

function AllocDot({ config }: { config: ColorConfig }) {
  if (config.type === 'gradient') {
    return (
      <LinearGradient
        colors={config.colors}
        start={config.start ?? { x: 0, y: 0 }}
        end={config.end ?? { x: 1, y: 0 }}
        style={styles.dot}
      />
    );
  }
  return <View style={[styles.dot, { backgroundColor: config.color }]} />;
}

function AllocBar({ config, pct }: { config: ColorConfig; pct: number }) {
  const width = `${Math.min(100, pct)}%` as const;
  if (config.type === 'gradient') {
    return (
      <LinearGradient
        colors={config.colors}
        start={config.start ?? { x: 0, y: 0 }}
        end={config.end ?? { x: 1, y: 0 }}
        style={[styles.allocBarFill, { width }]}
      />
    );
  }
  return <View style={[styles.allocBarFill, { width, backgroundColor: config.color }]} />;
}

function AllocList({
  title,
  rows,
}: {
  title: string;
  rows: { name: string; pct: number; colorConfig: ColorConfig }[];
}) {
  return (
    <View style={styles.allocBlock}>
      <Text style={styles.eyebrow}>{title}</Text>
      {rows.length === 0 ? (
        <Text style={styles.soon}>No active positions yet.</Text>
      ) : (
        rows.map((r) => (
          <View key={r.name} style={[styles.allocRow, r.pct === 0 && { opacity: 0.3 }]}>
            <AllocDot config={r.pct === 0 ? FALLBACK_COLOR : r.colorConfig} />
            <Text style={styles.allocName}>{r.name}</Text>
            <View style={styles.allocBarTrack}>
              <AllocBar config={r.pct === 0 ? FALLBACK_COLOR : r.colorConfig} pct={r.pct} />
            </View>
            <Text style={styles.allocPct}>{r.pct}%</Text>
          </View>
        ))
      )}
    </View>
  );
}

export default function Analytics() {
  const { width } = useWindowDimensions();
  const scale =
    Math.max(0.6, Math.min(1, (width - 66) / 346)) / Math.max(1, PixelRatio.getFontScale());
  const { getToken, authenticated } = useAuth();

  const [tvlRange, setTvlRange] = useState<ChartRangeKey>('30D');
  const [aprRange, setAprRange] = useState<ChartRangeKey>('30D');
  const [selectedMode, setSelectedMode] = useState<string | null>('A');

  const q = useQuery({
    queryKey: ['analytics'],
    queryFn: async () =>
      fetchThaler<AnalyticsResponse>(await getToken(), endpoints.analytics),
    enabled: authenticated,
    staleTime: 5 * 60_000,
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
  const totalTvlSol = breakdown.reduce((s, r) => s + num(r.tvlSol), 0);
  const totalYieldSol = breakdown.reduce((s, r) => s + num(r.lifetimeYieldSol), 0);
  const sumTvlUsd = breakdown.reduce((s, r) => s + num(r.tvlUsd), 0);
  const livePrice = pub.data?.ok ? pub.data.solPriceUsd : 0;
  const solPrice = livePrice > 0 ? livePrice : totalTvlSol > 0 ? sumTvlUsd / totalTvlSol : 0;
  const totalPendingUsdcUsd = breakdown.reduce((s, r) => s + num(r.pendingUsdcUsd), 0);
  const totalYieldGenSol = totalYieldSol + (solPrice > 0 ? totalPendingUsdcUsd / solPrice : 0);
  const tvlGrowthUsd = k?.tvl30dGrowthUsd ?? 0;
  const tvlGrowthPct = k?.tvl30dGrowthPct ?? 0;
  const tvlSub = !k
    ? '-'
    : tvlGrowthPct !== 0
      ? `${tvlGrowthPct > 0 ? '+' : ''}${tvlGrowthPct.toFixed(2)}% (30d)`
      : tvlGrowthUsd !== 0
        ? `${tvlGrowthUsd > 0 ? '+' : '-'}${compactUsd(Math.abs(tvlGrowthUsd))} (30d)`
        : 'No change (30d)';
  const tvlNegative = k ? tvlGrowthPct < 0 || (tvlGrowthPct === 0 && tvlGrowthUsd < 0) : false;

  const KPIS: {
    label: string;
    value?: string;
    node?: ReactNode;
    sub: string;
    tone: 'positive' | 'negative' | 'muted';
  }[] = [
      {
        label: 'Total Value Locked',
        node: k ? <SolUsd sol={totalTvlSol} price={solPrice} /> : undefined,
        value: k ? undefined : '-',
        sub: tvlSub,
        tone: tvlNegative ? 'negative' : 'positive',
      },
      {
        label: 'Protocol Return Rate',
        value: k && k.roiPct != null ? `${k.roiPct.toFixed(2)}%` : '-',
        sub: 'realized yield over deposit',
        tone: 'positive',
      },
      {
        label: 'Yield Generated',
        node: k ? <SolUsd sol={totalYieldGenSol} price={solPrice} /> : undefined,
        value: k ? undefined : '-',
        sub: 'all-time, all strategies',
        tone: 'muted',
      },
      {
        label: 'Active Vaults',
        value: k ? String(k.activeVaultCount) : '-',
        sub: k ? `+${k.vaults30dDelta} opened this month` : '-',
        tone: 'positive',
      },
    ];

  const [now] = useState(() => Date.now());

  const tvlCutoff = useMemo(
    () => now - (CHART_RANGES.find((r) => r.key === tvlRange)?.days ?? 30) * 86_400_000,
    [now, tvlRange],
  );
  const tvlChartData = useMemo(
    () =>
      (q.data?.tvlDailyUsd ?? [])
        .filter((p) => p.tvlUsd > 0 && Date.parse(p.date) >= tvlCutoff)
        .map((p) => ({ timestamp: Date.parse(p.date), value: solPrice > 0 ? p.tvlUsd / solPrice : 0 }))
        .sort((a, b) => a.timestamp - b.timestamp),
    [q.data?.tvlDailyUsd, tvlCutoff, solPrice],
  );

  const aprCutoff = useMemo(
    () => now - (CHART_RANGES.find((r) => r.key === aprRange)?.days ?? 30) * 86_400_000,
    [now, aprRange],
  );

  const allAprSeries = Object.entries(MODE_META).map(([key, meta]) => ({
    key,
    color: meta.color,
    data: (q.data?.apyByModeDaily ?? [])
      .filter((p) => p.mode === key && Date.parse(p.date) >= aprCutoff)
      .map((p) => ({ timestamp: Date.parse(p.date), value: p.apyBps / 100 }))
      .sort((a, b) => a.timestamp - b.timestamp),
  }));

  const aprChartData = selectedMode
    ? allAprSeries.find((s) => s.key === selectedMode)?.data
    : undefined;
  const selectedModeMeta = selectedMode ? MODE_META[selectedMode] : null;

  const aprOverlaySeries = allAprSeries
    .filter((s) => s.data.length >= 2)
    .map((s) => ({ data: s.data, color: 'rgba(255,255,255,0.22)' }));

  const latestAprBpsByMode: Record<string, number> = {};
  const latestAprDateByMode: Record<string, number> = {};
  for (const p of q.data?.apyByModeDaily ?? []) {
    const t = Date.parse(p.date);
    if (latestAprDateByMode[p.mode] === undefined || t > latestAprDateByMode[p.mode]!) {
      latestAprDateByMode[p.mode] = t;
      latestAprBpsByMode[p.mode] = p.apyBps;
    }
  }

  const ASSET_COLOR: Record<string, ColorConfig> = {
    jupsol:     { type: 'solid',    color: '#c7f284' },
    jitosol:    { type: 'gradient', colors: ['#7ed588', '#3f9d7d'] },
    msol:       { type: 'solid',    color: '#c8ece1' },
    inf:        { type: 'gradient', colors: ['#9b5de5', '#4dc9f7'] },
    psol:       { type: 'solid',    color: '#9685e2' },
    stkesol:    { type: 'gradient', colors: ['#c350f0', '#ff6b35'] },
    lanternsol: { type: 'solid',    color: '#faca02' },
    hsol:       { type: 'solid',    color: '#e84326' },
    bsol:       { type: 'solid',    color: '#6ee9fa' },
  };
  const VENUE_COLOR: Record<string, ColorConfig> = {
    kamino:   { type: 'solid', color: '#b8dce6' },
    pacifica: { type: 'solid', color: '#53bde2' },
    jupiter:  { type: 'solid', color: '#c7f284' },
    phoenix:  { type: 'solid', color: '#ff9a47' },
    bulk:     { type: 'solid', color: '#fffeef' },
  };

  const normaliseKey = (s: string) => s.toLowerCase().replace(/[_-]/g, '');
  const assetRows = (q.data?.assetAllocation ?? [])
    .map((a) => ({
      name: a.name,
      pct: a.pct,
      colorConfig: ASSET_COLOR[normaliseKey(a.name)] ?? FALLBACK_COLOR,
    }))
    .sort((a, b) => b.pct - a.pct);
  const venueRows = (q.data?.venueAllocation ?? [])
    .map((v) => ({
      name: v.venue.charAt(0).toUpperCase() + v.venue.slice(1),
      pct: v.pct,
      colorConfig: VENUE_COLOR[v.venue.toLowerCase()] ?? FALLBACK_COLOR,
    }))
    .sort((a, b) => b.pct - a.pct);

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: dock.height + 40 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.headRow}>
          <View style={styles.headLeft}>
            <SidebarTrigger />
            <Text style={styles.h1}>Analytics</Text>
          </View>
        </View>
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
              <Text
                style={[
                  styles.kpiSub,
                  c.tone === 'positive'
                    ? { color: brand.success }
                    : c.tone === 'negative'
                      ? { color: brand.error }
                      : null,
                ]}
              >
                {c.sub}
              </Text>
            </View>
          ))}
        </View>
        <View style={styles.chartCard}>
          <Text style={styles.chartTitle}>Total Value Locked</Text>
          <Text style={styles.chartSub}>protocol tvl in sol</Text>
          <InteractiveChart
            data={tvlChartData.length >= 2 ? tvlChartData : undefined}
            color="#9945FF"
            gradientColor="#9945FF"
            height={160}
            timeframes={CHART_RANGES.map((r) => r.key)}
            initialTimeframe={tvlRange}
            activeTimeframe={tvlRange}
            onTimeframeChange={(tf) => setTvlRange(tf as ChartRangeKey)}
            formatValue={(v) => `${compactSol(v)} SOL`}
            showHeader={true}
            emptyMessage="No TVL data yet."
          />
        </View>

        <View style={styles.chartCard}>
          <Text style={styles.chartTitle}>Projected APR</Text>
          <Text style={styles.chartSub}>per strategy tier — tap a tier to highlight</Text>
          <InteractiveChart
            data={aprChartData && aprChartData.length >= 2 ? aprChartData : undefined}
            seriesOverlay={aprOverlaySeries}
            color={selectedModeMeta?.color ?? '#9945FF'}
            gradientColor={selectedModeMeta?.color ?? '#9945FF'}
            height={160}
            timeframes={CHART_RANGES.map((r) => r.key)}
            initialTimeframe={aprRange}
            activeTimeframe={aprRange}
            onTimeframeChange={(tf) => setAprRange(tf as ChartRangeKey)}
            formatValue={(v) => `${v.toFixed(2)}%`}
            showHeader={selectedMode !== null}
            emptyMessage="No APR data available yet."
          />
          <View style={styles.modeSelectorRow}>
            {Object.entries(MODE_META).map(([key, meta]) => {
              const active = selectedMode === key;
              return (
                <Pressable
                  key={key}
                  accessibilityRole="button"
                  hitSlop={{ top: 6, bottom: 6, left: 4, right: 4 }}
                  onPress={() => setSelectedMode(active ? null : key)}
                  style={[
                    styles.modePill,
                    active && { backgroundColor: `${meta.color}22`, borderColor: `${meta.color}66` },
                  ]}
                >
                  <View
                    style={[
                      styles.modeDot,
                      { backgroundColor: active ? meta.color : dark.mutedForeground },
                    ]}
                  />
                  <Text
                    style={[
                      styles.modeLabel,
                      { color: active ? meta.color : dark.mutedForeground },
                    ]}
                  >
                    {meta.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
        <View style={styles.list}>
          <AllocList title="ASSET ALLOCATION" rows={assetRows} />
          <View style={styles.allocDivider} />
          <AllocList title="VENUE ALLOCATION" rows={venueRows} />
        </View>
        <View style={styles.list}>
          <Text style={[styles.eyebrow, { padding: spacing.base, paddingBottom: 8 }]}>
            STRATEGY BREAKDOWN
          </Text>
          {breakdown.length > 0 ? (
            <View style={[styles.row, styles.rowBorder]}>
              <View style={styles.bdName} />
              {['POSITIONS', 'TVL', 'APR', 'YIELD', 'UTIL'].map((h) => (
                <Text
                  key={h}
                  style={[styles.bdCell, styles.bdHeadCell, { fontSize: 8 * scale, letterSpacing: 0.4 * scale }]}
                >
                  {h}
                </Text>
              ))}
            </View>
          ) : null}
          {breakdown.map((r) => {
            const meta = MODE_META[r.mode] ?? MODE_META.A;
            const chartAprBps = latestAprBpsByMode[r.mode];
            const fallbackAprBps = r.apy30dMedianBps;
            const aprBps =
              typeof chartAprBps === 'number' && Number.isFinite(chartAprBps)
                ? chartAprBps
                : typeof fallbackAprBps === 'number' && Number.isFinite(fallbackAprBps)
                  ? fallbackAprBps
                  : null;
            const pendingSol = solPrice > 0 ? num(r.pendingUsdcUsd) / solPrice : 0;
            const yieldSol = num(r.lifetimeYieldSol) + pendingSol;
            return (
              <View key={r.mode} style={[styles.row, styles.rowBorder]}>
                <View style={[styles.rowL, styles.bdName, { gap: 8 * scale }]}>
                  <View
                    style={[
                      styles.dot,
                      { backgroundColor: meta.color, width: 10 * scale, height: 10 * scale, borderRadius: 5 * scale },
                    ]}
                  />
                  <Text style={[styles.rowLabel, { fontSize: 11 * scale }]}>{meta.label}</Text>
                </View>
                <Text style={[styles.rowValue, styles.bdCell, { fontSize: 9 * scale }]}>{r.vaultCount}</Text>
                <Text style={[styles.rowValue, styles.bdCell, { fontSize: 9 * scale }]}>
                  {`${compactSol(num(r.tvlSol))} SOL`}
                </Text>
                <Text style={[styles.rowValue, styles.bdCell, { fontSize: 9 * scale }]}>
                  {aprBps != null ? `${(aprBps / 100).toFixed(1)}%` : '-'}
                </Text>
                <Text style={[styles.rowValue, styles.bdCell, { fontSize: 9 * scale }]}>
                  {`${compactSol(yieldSol)} SOL`}
                </Text>
                <Text style={[styles.rowValue, styles.bdCell, { fontSize: 9 * scale }]}>
                  {`${(num(r.utilization) * 100).toFixed(0)}%`}
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
  headRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  headLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  eyebrow: { ...typography.captionBold, color: dark.mutedForeground, letterSpacing: 1.2 },
  h1: { ...typography.title1, color: dark.foreground, fontSize: 28 },
  hint: { ...typography.body, color: dark.mutedForeground, fontSize: 13 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  kpi: {
    flexGrow: 1,
    minWidth: '45%',
    backgroundColor: glass.bg,
    borderColor: glass.border,
    borderWidth: 1,
    borderRadius: radius.xl,
    paddingVertical: spacing.lg,
    alignItems: 'center',
    gap: 4,
  },
  kpiValue: {
    ...typography.monoLg,
    color: dark.foreground,
    fontSize: 20,
    lineHeight: 24,
  },
  kpiUsd: { ...typography.caption, color: dark.mutedForeground },
  kpiLabel: { ...typography.caption, color: dark.mutedForeground },
  kpiSub: { color: dark.mutedForeground, fontSize: 11 },
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
  rowLabel: { color: dark.foreground, fontSize: 11, fontWeight: '500' },
  rowValue: { color: dark.foreground, fontSize: 12, fontVariant: ['tabular-nums'] },
  bdName: { flex: 1.7, minWidth: 0 },
  bdCell: { flex: 1, fontSize: 9, textAlign: 'right' },
  bdHeadCell: { color: dark.mutedForeground, fontSize: 8, letterSpacing: 0.4, fontWeight: '600' },
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
  modeSelectorRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 4,
  },
  modePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: dark.border,
  },
  modeDot: { width: 7, height: 7, borderRadius: 3.5 },
  modeLabel: { fontSize: 11, fontWeight: '500' },
  allocBlock: { padding: spacing.base, gap: 10 },
  allocRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  allocName: { color: dark.foreground, fontSize: 13, width: 92 },
  allocBarTrack: { flex: 1, height: 6, borderRadius: 3, backgroundColor: dark.muted, overflow: 'hidden' },
  allocBarFill: { height: 6, borderRadius: 3 },
  allocPct: { color: dark.foreground, fontSize: 13, fontVariant: ['tabular-nums'], width: 44, textAlign: 'right' },
  allocDivider: { height: 1, backgroundColor: dark.border },
});
