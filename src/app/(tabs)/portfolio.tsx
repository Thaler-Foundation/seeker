// Portfolio: KPIs, vault rows, transaction history.

import { useState } from 'react';
import { View, Text, ScrollView, Pressable, Share, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Circle, Line, Polyline } from 'react-native-svg';
import { useQuery } from '@tanstack/react-query';
import {
  fetchThaler,
  endpoints,
  type PublicStats,
  type UserVaultStatsView,
  type ListVaultsResponse,
} from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { dark, tier, brand, radius, spacing } from '@/theme/tokens';

type TriggerRow = {
  id: string;
  state: string;
  step: number;
  borrowSolEquivalent: number | null;
  executedAt: number | null;
  createdAt: number;
};
type ScalpRow = {
  id: string;
  state: string;
  eventType?: string;
  positionCoin?: string;
  profitUsd: number | null;
  executedAt?: number | null;
  createdAt: number;
};
type HistoryRow = {
  id: string;
  interaction: string;
  detail: string;
  amount: string;
  ts: number;
};
type EquityPoint = { date: string; equitySol: number };

const RANGES = [
  { key: '7D', days: 7 },
  { key: '30D', days: 30 },
  { key: '3M', days: 90 },
] as const;
type RangeKey = (typeof RANGES)[number]['key'];

const TIER_LABEL: Record<string, string> = {
  safe: 'Safe',
  conservative: 'Conservative',
  balanced: 'Balanced',
  optimistic: 'Optimistic',
  aggressive: 'Aggressive',
  yolo: 'YOLO',
};

function rel(ts: number): string {
  const d = Date.now() - ts;
  const h = Math.floor(d / 3_600_000);
  if (h < 1) return `${Math.max(1, Math.floor(d / 60_000))}m ago`;
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export default function Portfolio() {
  const router = useRouter();
  const { getToken, authenticated } = useAuth();
  const [tab, setTab] = useState<'vaults' | 'transactions'>('vaults');
  const [range, setRange] = useState<RangeKey>('7D');
  const [currency, setCurrency] = useState<'SOL' | 'USD'>('SOL');

  const pub = useQuery({
    queryKey: ['public-stats'],
    queryFn: () => fetchThaler<PublicStats>(null, endpoints.publicStats),
    staleTime: 60_000,
  });
  const solPrice = pub.data?.ok ? pub.data.solPriceUsd : 0;

  const stats = useQuery({
    queryKey: ['vault-stats'],
    queryFn: async () =>
      fetchThaler<UserVaultStatsView>(await getToken(), endpoints.vaultStats),
    enabled: authenticated,
    staleTime: 60_000,
  });

  const vaultList = useQuery({
    queryKey: ['vaults'],
    queryFn: async () => fetchThaler<ListVaultsResponse>(await getToken(), endpoints.vaults),
    enabled: authenticated,
    staleTime: 60_000,
  });
  const vaultById = new Map((vaultList.data?.vaults ?? []).map((v) => [v.id, v]));

  const history = useQuery({
    queryKey: ['transaction-history'],
    queryFn: async () => {
      const token = await getToken();
      const [vaults, triggers, scalps] = await Promise.all([
        fetchThaler<ListVaultsResponse>(token, endpoints.vaults),
        fetchThaler<{ triggers: TriggerRow[] }>(token, endpoints.triggers).catch(() => ({
          triggers: [] as TriggerRow[],
        })),
        fetchThaler<{ scalps: ScalpRow[] }>(token, endpoints.scalps).catch(() => ({
          scalps: [] as ScalpRow[],
        })),
      ]);
      const rows: HistoryRow[] = [];
      for (const v of vaults.vaults) {
        rows.push({
          id: `open-${v.id}`,
          interaction: 'Open Vault',
          detail: `Thaler One · ${TIER_LABEL[v.tier ?? 'safe'] ?? 'Safe'}`,
          amount: `${(Number(v.equityLamports) / 1e9).toFixed(4)} SOL`,
          ts: new Date(v.createdAt).getTime(),
        });
        if (v.latestClose) {
          rows.push({
            id: `close-${v.id}`,
            interaction: 'Close Vault',
            detail: `Thaler One · ${TIER_LABEL[v.tier ?? 'safe'] ?? 'Safe'}`,
            amount: `${(Number(v.equityLamports) / 1e9).toFixed(4)} SOL`,
            ts: new Date(v.updatedAt).getTime(),
          });
        }
        if (v.latestClaim) {
          rows.push({
            id: `claim-${v.id}`,
            interaction: 'Claim Yield',
            detail: `Thaler One · ${TIER_LABEL[v.tier ?? 'safe'] ?? 'Safe'}`,
            amount: v.latestClaim.amountLamports
              ? `+${(Number(v.latestClaim.amountLamports) / 1e9).toFixed(4)} SOL`
              : '-',
            ts: new Date(v.updatedAt).getTime(),
          });
        }
      }
      for (const t of triggers.triggers.filter((x) => x.state === 'EXECUTED')) {
        rows.push({
          id: `trig-${t.id}`,
          interaction: 'Upside Borrow',
          detail: `Step ${t.step}`,
          amount:
            t.borrowSolEquivalent !== null ? `${t.borrowSolEquivalent.toFixed(4)} SOL` : '-',
          ts: t.executedAt ?? t.createdAt,
        });
      }
      for (const s of scalps.scalps.filter((x) => x.state === 'EXECUTED')) {
        rows.push({
          id: `scalp-${s.id}`,
          interaction: s.eventType === 'SCALP' ? 'Scalp' : 'Pre-Scalp',
          detail: s.positionCoin ?? 'SOL',
          amount: s.profitUsd !== null ? `+${s.profitUsd.toFixed(2)} USDC` : '-',
          ts: s.executedAt ?? s.createdAt,
        });
      }
      return rows.sort((a, b) => b.ts - a.ts);
    },
    enabled: authenticated && tab === 'transactions',
    staleTime: 60_000,
  });

  const equity = useQuery({
    queryKey: ['equity-history'],
    queryFn: async () =>
      fetchThaler<{ points: EquityPoint[] }>(await getToken(), endpoints.equityHistory(365)),
    enabled: authenticated,
    staleTime: 60_000,
  });
  const rangeDays = RANGES.find((r) => r.key === range)!.days;
  const cutoff = Date.now() - rangeDays * 86_400_000;
  const pts = (equity.data?.points ?? [])
    .map((p) => [Date.parse(p.date), p.equitySol] as const)
    .filter((p) => Number.isFinite(p[0]) && p[0] >= cutoff)
    .sort((a, b) => a[0] - b[0]);
  let chartPoints: string | null = null;
  if (pts.length >= 2) {
    const x0 = pts[0]![0];
    const spanX = pts[pts.length - 1]![0] - x0 || 1;
    const ys = pts.map((p) => p[1]);
    const yMin = Math.min(...ys);
    const spanY = Math.max(...ys) - yMin || 1;
    chartPoints = pts
      .map(
        ([x, y]) =>
          `${(((x - x0) / spanX) * 100).toFixed(2)},${(1 + (1 - (y - yMin) / spanY) * 38).toFixed(2)}`
      )
      .join(' ');
  }

  const rows = stats.data?.vaults ?? [];
  const netValueSol = rows.reduce((s, r) => s + Number(r.equityNavLamports) / 1e9, 0);
  const yieldEarnedSol = rows.reduce((s, r) => s + Number(r.realizedYieldLamports) / 1e9, 0);
  const claimableNet = stats.data?.claimableNetTotalSol ?? 0;
  const depositedSol = rows.reduce((s, r) => {
    const v = vaultById.get(r.vaultExecutionId);
    return s + (v ? Number(v.equityLamports) / 1e9 : 0);
  }, 0);
  const portfolioRoi = depositedSol > 0 ? (yieldEarnedSol / depositedSol) * 100 : 0;
  const money = (v: number) =>
    currency === 'USD' && solPrice > 0 ? `$${(v * solPrice).toFixed(2)}` : `${v.toFixed(4)} SOL`;

  const onShare = () => {
    const sign = yieldEarnedSol >= 0 ? '+' : '';
    const text = `My Thaler vaults generated ${sign}${yieldEarnedSol.toFixed(4)} SOL in yield. Delta-neutral jitoSOL, hedged on-chain.`;
    Share.share({ message: `${text} https://thaler.finance` }).catch(() => {});
  };

  const KPIS = [
    { label: 'Net Value', value: money(netValueSol) },
    {
      label: 'Yield Earned',
      value: `${yieldEarnedSol >= 0 ? '+' : ''}${money(yieldEarnedSol)}`,
      tone: yieldEarnedSol >= 0 ? brand.success : brand.error,
    },
    { label: 'Claimable Yield', value: money(claimableNet), tone: brand.success },
    { label: 'Active Vaults', value: String(rows.length) },
    { label: 'Return Rate', value: `${portfolioRoi.toFixed(2)}%`, tone: brand.success },
  ];

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.h1}>Portfolio</Text>
        <Text style={styles.hint}>Track all your Thaler positions in one place</Text>
        {!authenticated ? <Text style={styles.hint}>Sign in to load your vaults.</Text> : null}
        <View style={styles.actions}>
          <Pressable
            accessibilityRole="button"
            disabled={rows.length === 0}
            onPress={onShare}
            style={[styles.shareBtn, rows.length === 0 && { opacity: 0.5 }]}
          >
            <Svg width={16} height={16} viewBox="0 0 24 24">
              <Circle cx={18} cy={5} r={3} fill="none" stroke={dark.foreground} strokeWidth={2} />
              <Circle cx={6} cy={12} r={3} fill="none" stroke={dark.foreground} strokeWidth={2} />
              <Circle cx={18} cy={19} r={3} fill="none" stroke={dark.foreground} strokeWidth={2} />
              <Line x1={8.59} y1={13.51} x2={15.42} y2={17.49} stroke={dark.foreground} strokeWidth={2} />
              <Line x1={15.41} y1={6.51} x2={8.59} y2={10.49} stroke={dark.foreground} strokeWidth={2} />
            </Svg>
            <Text style={styles.shareLabel}>Share yield</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            onPress={() => setCurrency((c) => (c === 'SOL' ? 'USD' : 'SOL'))}
            style={styles.currencyToggle}
          >
            <Text style={styles.hint}>Display Value In</Text>
            <Text style={styles.currencyValue}>{currency}</Text>
            <Svg width={14} height={14} viewBox="0 0 24 24">
              <Polyline
                points="6,9 12,15 18,9"
                fill="none"
                stroke={dark.mutedForeground}
                strokeWidth={2}
              />
            </Svg>
          </Pressable>
        </View>
        <View style={styles.grid}>
          {KPIS.map((k) => (
            <View key={k.label} style={styles.kpi}>
              <Text style={[styles.kpiValue, k.tone ? { color: k.tone } : null]}>
                {stats.isLoading ? '-' : k.value}
              </Text>
              <Text style={styles.kpiLabel}>{k.label}</Text>
            </View>
          ))}
        </View>

        <View style={styles.chartCard}>
          <View style={styles.chartHead}>
            <Text style={styles.chartTitle}>Portfolio Net Value</Text>
            <View style={styles.rangeRow}>
              {RANGES.map((r) => (
                <Pressable
                  key={r.key}
                  onPress={() => setRange(r.key)}
                  style={[styles.rangePill, range === r.key && styles.rangePillActive]}
                >
                  <Text
                    style={[styles.rangeLabel, range === r.key && styles.rangeLabelActive]}
                  >
                    {r.key}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
          {chartPoints ? (
            <Svg width="100%" height={140} viewBox="0 0 100 40" preserveAspectRatio="none">
              <Polyline
                points={chartPoints}
                fill="none"
                stroke="#9945FF"
                strokeWidth={0.7}
                strokeLinejoin="round"
              />
            </Svg>
          ) : (
            <Text style={[styles.hint, { paddingVertical: 48, textAlign: 'center' }]}>
              {equity.isLoading ? 'Loading…' : 'No data yet.'}
            </Text>
          )}
          <View style={styles.legendRow}>
            <View style={styles.legendDot} />
            <Text style={styles.legendLabel}>Portfolio net value</Text>
          </View>
        </View>

        <View style={styles.tabs}>
          {(
            [
              { key: 'vaults', label: 'Vaults' },
              { key: 'transactions', label: 'Transaction History' },
            ] as const
          ).map((t) => (
            <Pressable
              key={t.key}
              onPress={() => setTab(t.key)}
              style={[styles.tab, tab === t.key && styles.tabActive]}
            >
              <Text style={[styles.tabLabel, tab === t.key && styles.tabLabelActive]}>
                {t.label}
              </Text>
            </Pressable>
          ))}
        </View>

        {tab === 'vaults' ? (
          <View style={styles.list}>
            {rows.length > 0 ? (
              <View style={styles.row}>
                <View style={styles.pfName} />
                <View style={styles.rowNums}>
                  <Text style={[styles.pfHeadCell, styles.pfCell]}>NET VALUE</Text>
                  <Text style={[styles.pfHeadCell, styles.pfCell]}>RETURN RATE</Text>
                  <Text style={[styles.pfHeadCell, styles.pfCell]}>YIELD</Text>
                  <Text style={[styles.pfHeadCell, styles.pfCell]}>LTV</Text>
                </View>
              </View>
            ) : null}
            {rows.map((r, i) => {
              const v = vaultById.get(r.vaultExecutionId);
              const depositLamports = v ? Number(v.equityLamports) : 0;
              const realized = Number(r.realizedYieldLamports);
              const roi = depositLamports > 0 ? (realized / depositLamports) * 100 : 0;
              const ltvPct = v ? Number(v.ltvBps ?? 0) / 100 : 0;
              return (
                <Pressable
                  key={r.vaultExecutionId}
                  onPress={() =>
                    router.push(`/vault/${r.tier}?tab=position&vault=${r.vaultExecutionId}`)
                  }
                  style={[styles.row, styles.rowBorder]}
                >
                  <View style={[styles.rowL, styles.pfName]}>
                    <View
                      style={[
                        styles.dot,
                        { backgroundColor: (tier as Record<string, string>)[r.tier] ?? tier.safe },
                      ]}
                    />
                    <Text style={styles.rowLabel}>{`${TIER_LABEL[r.tier] ?? 'Safe'} Vault`}</Text>
                  </View>
                  <View style={styles.rowNums}>
                    <Text style={[styles.rowValue, styles.pfCell]}>
                      {(Number(r.equityNavLamports) / 1e9).toFixed(4)}
                    </Text>
                    <Text
                      style={[
                        styles.rowValue,
                        styles.pfCell,
                        { color: roi >= 0 ? brand.success : brand.error },
                      ]}
                    >
                      {`${roi.toFixed(2)}%`}
                    </Text>
                    <Text
                      style={[
                        styles.rowValue,
                        styles.pfCell,
                        { color: realized >= 0 ? brand.success : brand.error },
                      ]}
                    >
                      {`${realized >= 0 ? '+' : ''}${(realized / 1e9).toFixed(4)}`}
                    </Text>
                    <Text style={[styles.rowValue, styles.pfCell]}>{`${ltvPct.toFixed(2)}%`}</Text>
                  </View>
                </Pressable>
              );
            })}
            {authenticated && !stats.isLoading && rows.length === 0 ? (
              <View style={styles.empty}>
                <Text style={styles.hint}>No vaults yet</Text>
                <Text style={styles.hint}>
                  Create your first delta-neutral vault to start earning.
                </Text>
              </View>
            ) : null}
          </View>
        ) : (
          <View style={styles.list}>
            {(history.data ?? []).map((r, i) => (
              <View key={r.id} style={[styles.row, i > 0 && styles.rowBorder]}>
                <View style={styles.rowTextL}>
                  <View style={styles.typeBadge}>
                    <Text style={styles.typeBadgeLabel}>{r.interaction}</Text>
                  </View>
                  <Text style={styles.rowDetail}>{r.detail}</Text>
                </View>
                <View style={styles.rowTextR}>
                  <Text
                    style={[
                      styles.rowValue,
                      r.amount.startsWith('+') && { color: brand.success },
                    ]}
                  >
                    {r.amount}
                  </Text>
                  <Text style={styles.rowDetail}>{rel(r.ts)}</Text>
                </View>
              </View>
            ))}
            {authenticated && !history.isLoading && (history.data ?? []).length === 0 ? (
              <Text style={[styles.hint, { padding: spacing.base }]}>No activity yet.</Text>
            ) : null}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: dark.background },
  scroll: { padding: spacing.base, gap: spacing.base },
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
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  shareBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderColor: dark.border,
    borderWidth: 1,
    borderRadius: radius.lg,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  shareLabel: { color: dark.foreground, fontSize: 14, fontWeight: '500' },
  currencyToggle: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  currencyValue: { color: dark.foreground, fontSize: 13, fontWeight: '500' },
  chartCard: {
    backgroundColor: dark.card,
    borderColor: dark.border,
    borderWidth: 1,
    borderRadius: radius.xl + 2,
    padding: spacing.base,
    gap: spacing.md,
  },
  chartHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  chartTitle: { color: dark.foreground, fontSize: 16, fontWeight: '600' },
  rangeRow: { flexDirection: 'row', gap: 4 },
  rangePill: { borderRadius: radius.md, paddingHorizontal: 10, paddingVertical: 5 },
  rangePillActive: { backgroundColor: dark.muted },
  rangeLabel: { color: dark.mutedForeground, fontSize: 12, fontWeight: '500' },
  rangeLabelActive: { color: dark.foreground },
  legendRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#9945FF' },
  legendLabel: { color: dark.mutedForeground, fontSize: 12 },
  tabs: {
    flexDirection: 'row',
    gap: spacing.xl,
    borderBottomWidth: 1,
    borderBottomColor: dark.border,
  },
  tab: {
    paddingBottom: 12,
    marginBottom: -1,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: { borderBottomColor: dark.foreground },
  tabLabel: { color: dark.mutedForeground, fontSize: 17, fontWeight: '600' },
  tabLabelActive: { color: dark.foreground },
  typeBadge: {
    backgroundColor: 'rgba(34,197,94,0.1)',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    alignSelf: 'flex-start',
  },
  typeBadgeLabel: { color: brand.success, fontSize: 11, fontWeight: '500' },
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
    paddingHorizontal: spacing.base,
    paddingVertical: 13,
  },
  rowBorder: { borderTopColor: dark.border, borderTopWidth: 1 },
  rowL: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  rowTextL: { gap: 2 },
  rowTextR: { alignItems: 'flex-end', gap: 2 },
  dot: { width: 12, height: 12, borderRadius: 6 },
  rowLabel: { color: dark.foreground, fontSize: 14, fontWeight: '500' },
  rowDetail: { color: dark.mutedForeground, fontSize: 12 },
  rowValue: { color: dark.foreground, fontSize: 13, fontVariant: ['tabular-nums'] },
  rowNums: { flex: 3, flexDirection: 'row', gap: 12, alignItems: 'center' },
  pfName: { flex: 1.6, minWidth: 0 },
  pfCell: { flex: 1, fontSize: 11, textAlign: 'right' },
  pfHeadCell: { color: dark.mutedForeground, fontSize: 9, letterSpacing: 0.6, fontWeight: '600' },
  empty: { padding: spacing.base, gap: 4 },
});
