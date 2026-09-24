import { InteractiveChart } from '@/components/chart/interactive-chart';
import { SidebarTrigger } from '@/components/sidebar/sidebar-trigger';
import {
  endpoints,
  fetchThaler,
  type ListVaultsResponse,
  type PublicStats,
  type UserVaultStatsView,
} from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { brand, dark, dock, glass, radius, spacing, tier } from '@/theme/tokens';
import { typography } from '@/theme/typography';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  FlatList,
  PixelRatio,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Circle, Line, Path } from 'react-native-svg';

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

const TX_FETCH_TIMEOUT_MS = 15_000;
const MAX_TX_ROWS = 50;

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms)
    ),
  ]);
}

const TIER_LABEL: Record<string, string> = {
  safe: 'Safe',
  conservative: 'Conservative',
  balanced: 'Balanced',
  optimistic: 'Optimistic',
  aggressive: 'Aggressive',
  yolo: 'YOLO',
};

const PF_COLUMNS = [
  { label: 'NET VALUE', flex: 1.1 },
  { label: 'RETURN RATE', flex: 1.06 },
  { label: 'YIELD', flex: 0.97 },
  { label: 'LTV', flex: 0.88 },
] as const;

function rel(ts: number): string {
  const d = Date.now() - ts;
  const h = Math.floor(d / 3_600_000);
  if (h < 1) return `${Math.max(1, Math.floor(d / 60_000))}m ago`;
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function renderHistoryIcon(interaction: string) {
  if (interaction === 'Claim Yield') {
    return (
      <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
        <Path
          d="M12 4v12m0 0l-4-4m4 4l4-4M4 20h16"
          stroke={brand.success}
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </Svg>
    );
  }
  if (interaction === 'Scalp' || interaction === 'Pre-Scalp') {
    return (
      <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
        <Path
          d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"
          stroke="#14F195"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </Svg>
    );
  }
  if (interaction === 'Upside Borrow') {
    return (
      <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
        <Path
          d="M7 17L17 7M17 7H8M17 7V16"
          stroke="#C084FC"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </Svg>
    );
  }
  if (interaction === 'Close Vault') {
    return (
      <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
        <Path
          d="M18 6L6 18M6 6l12 12"
          stroke={dark.mutedForeground}
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </Svg>
    );
  }
  return (
    <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 5v14M5 12h14"
        stroke={brand.blueBright}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function getHistoryBg(interaction: string) {
  if (interaction === 'Claim Yield') return 'rgba(34, 197, 94, 0.12)';
  if (interaction === 'Scalp' || interaction === 'Pre-Scalp') return 'rgba(20, 241, 149, 0.12)';
  if (interaction === 'Upside Borrow') return 'rgba(192, 132, 252, 0.12)';
  if (interaction === 'Close Vault') return 'rgba(255, 255, 255, 0.08)';
  return 'rgba(153, 187, 255, 0.12)';
}

export default function Portfolio() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const scale =
    Math.max(0.6, Math.min(1, (width - 66) / 346)) / Math.max(1, PixelRatio.getFontScale());
  const { getToken, authenticated, sessionReady } = useAuth();
  const [tab, setTab] = useState<'vaults' | 'transactions'>('vaults');
  const [range, setRange] = useState<RangeKey>('7D');
  const [currency, setCurrency] = useState<'SOL' | 'USD'>('SOL');
  const [txVisible, setTxVisible] = useState(MAX_TX_ROWS);

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
    enabled: sessionReady,
    staleTime: 2 * 60_000,
  });

  const vaultList = useQuery({
    queryKey: ['vaults'],
    queryFn: async () => fetchThaler<ListVaultsResponse>(await getToken(), endpoints.vaults),
    enabled: sessionReady,
    staleTime: 2 * 60_000,
  });
  const vaultById = useMemo(
    () => new Map((vaultList.data?.vaults ?? []).map((v) => [v.id, v])),
    [vaultList.data]
  );

  const history = useQuery({
    queryKey: ['transaction-history'],
    queryFn: async (): Promise<HistoryRow[]> => {
      const token = await withTimeout(
        getToken().then((t) => {
          if (!t) throw new Error('No auth token');
          return t;
        }),
        10_000,
        'getToken',
      );

      const [vaultRes, triggersRes, scalpsRes] = await Promise.all([
        withTimeout(
          fetchThaler<ListVaultsResponse>(token, endpoints.vaults),
          TX_FETCH_TIMEOUT_MS,
          'listVaults',
        ).catch(() => ({ vaults: [] as ListVaultsResponse['vaults'] })),

        withTimeout(
          fetchThaler<{ triggers: (TriggerRow & Record<string, any>)[] }>(token, endpoints.triggers),
          TX_FETCH_TIMEOUT_MS,
          'listTriggers',
        ).catch(() => ({ triggers: [] as (TriggerRow & Record<string, any>)[] })),

        withTimeout(
          fetchThaler<{ scalps: ScalpRow[] }>(token, endpoints.scalps),
          TX_FETCH_TIMEOUT_MS,
          'listScalps',
        ).catch(() => ({ scalps: [] as ScalpRow[] })),
      ]);

      const allTriggers: (TriggerRow & Record<string, any>)[] = Array.isArray(triggersRes)
        ? triggersRes
        : (triggersRes.triggers ?? []);
      const allScalps: ScalpRow[] = Array.isArray(scalpsRes)
        ? scalpsRes
        : (scalpsRes.scalps ?? []);

      const rows: HistoryRow[] = [];

      for (const v of vaultRes.vaults) {
        const tierLabel = TIER_LABEL[v.tier ?? 'safe'] ?? 'Safe';
        const detail = `Thaler One · ${tierLabel}`;

        const tsOpen = typeof v.createdAt === 'string'
          ? Date.parse(v.createdAt as unknown as string)
          : (v.createdAt as unknown as number);
        const tsUpdated = typeof v.updatedAt === 'string'
          ? Date.parse(v.updatedAt as unknown as string)
          : (v.updatedAt as unknown as number);

        rows.push({
          id: `open-${v.id}`,
          interaction: 'Open Vault',
          detail,
          amount: `${(Number(v.equityLamports) / 1e9).toFixed(4)} SOL`,
          ts: tsOpen,
        });
        if (v.latestClose) {
          rows.push({
            id: `close-${v.id}`,
            interaction: 'Close Vault',
            detail,
            amount: `${(Number(v.equityLamports) / 1e9).toFixed(4)} SOL`,
            ts: tsUpdated,
          });
        }
        if (v.latestClaim) {
          rows.push({
            id: `claim-${v.id}`,
            interaction: 'Claim Yield',
            detail,
            amount: v.latestClaim.amountLamports
              ? `+${(Number(v.latestClaim.amountLamports) / 1e9).toFixed(4)} SOL`
              : '-',
            ts: tsUpdated,
          });
        }
      }

      for (const t of allTriggers.filter((x) => x.state === 'EXECUTED')) {
        const rawTs = t.executedAt ?? t.createdAt;
        rows.push({
          id: `trig-${t.id}`,
          interaction: 'Upside Borrow',
          detail: '',
          amount: t.borrowSolEquivalent != null
            ? `${t.borrowSolEquivalent.toFixed(4)} SOL`
            : '-',
          ts: typeof rawTs === 'string' ? Date.parse(rawTs as unknown as string) : (rawTs ?? 0),
        });
      }

      for (const s of allScalps.filter((x) => x.state === 'EXECUTED')) {
        const rawTs = s.executedAt ?? s.createdAt;
        rows.push({
          id: `scalp-${s.id}`,
          interaction: s.eventType === 'SCALP' ? 'Scalp' : 'Pre-Scalp',
          detail: '',
          amount: s.profitUsd != null ? `+$${s.profitUsd.toFixed(2)}` : '-',
          ts: typeof rawTs === 'string' ? Date.parse(rawTs as unknown as string) : (rawTs ?? 0),
        });
      }

      return rows.sort((a, b) => b.ts - a.ts);
    },
    enabled: sessionReady,
    staleTime: 5 * 60_000,
    gcTime: 24 * 60 * 60_000,
    retry: 1,
    retryDelay: 3_000,
  });

  const historyLoading = history.isLoading && !history.data;

  const historyRows: HistoryRow[] = useMemo(() => history.data ?? [], [history.data]);
  const visibleHistoryRows = useMemo(
    () => historyRows.slice(0, txVisible),
    [historyRows, txVisible]
  );

  const equity = useQuery({
    queryKey: ['equity-history'],
    queryFn: async () =>
      fetchThaler<{ points: EquityPoint[] }>(await getToken(), endpoints.equityHistory(365)),
    enabled: sessionReady,
    staleTime: 5 * 60_000,
  });
  const rangeDays = RANGES.find((r) => r.key === range)!.days;
  // eslint-disable-next-line react-hooks/purity
  const cutoff = Date.now() - rangeDays * 86_400_000;
  const pts = (equity.data?.points ?? [])
    .map((p) => [Date.parse(p.date), p.equitySol] as const)
    .filter((p) => Number.isFinite(p[0]) && p[0] >= cutoff)
    .sort((a, b) => a[0] - b[0]);

  const kpiSyncing =
    authenticated &&
    ((stats.isFetching && Boolean(stats.data)) ||
      (vaultList.isFetching && Boolean(vaultList.data)) ||
      (pub.isFetching && Boolean(pub.data)));
  const chartSyncing = authenticated && equity.isFetching && Boolean(equity.data);

  const rows = stats.data?.vaults ?? [];
  const depositedSol = rows.reduce((s, r) => {
    const v = vaultById.get(r.vaultExecutionId);
    return s + (v ? Number(v.equityLamports) / 1e9 : 0);
  }, 0);
  const yieldEarnedSol = rows.reduce((s, r) => s + Number(r.realizedYieldLamports) / 1e9, 0);
  const claimableNet = stats.data?.claimableNetTotalSol ?? 0;
  const netValueSol = rows.reduce((s, r) => s + Number(r.equityNavLamports) / 1e9, 0);
  const portfolioRoi = depositedSol > 0 ? (yieldEarnedSol / depositedSol) * 100 : 0;
  const money = (v: number) =>
    currency === 'USD' && solPrice > 0 ? `$${(v * solPrice).toFixed(2)}` : `${v.toFixed(4)} SOL`;

  const onShare = () => {
    const sign = yieldEarnedSol >= 0 ? '+' : '';
    const text = `My Thaler vaults generated ${sign}${yieldEarnedSol.toFixed(4)} SOL in yield. Delta-neutral jitoSOL, hedged on-chain.`;
    Share.share({ message: `${text} https://thaler.finance` }).catch(() => {});
  };

  const KPIS = [
    { label: 'Total Value', value: money(netValueSol) },
    {
      label: 'Yield Earned',
      value: `${yieldEarnedSol >= 0 ? '+' : ''}${money(yieldEarnedSol)}`,
      tone: yieldEarnedSol >= 0 ? brand.success : brand.error,
    },
    { label: 'Vault Deposits', value: money(depositedSol) },
    { label: 'Claimable Yield', value: money(claimableNet), tone: brand.success },
    { label: 'Active Vaults', value: String(rows.length) },
    { label: 'Return Rate', value: `${portfolioRoi.toFixed(2)}%`, tone: brand.success },
  ];

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: dock.height + 40 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.headRow}>
          <View style={styles.headLeft}>
            <SidebarTrigger />
            <Text style={styles.h1}>Portfolio</Text>
            {kpiSyncing ? (
              <View style={styles.syncBadge}>
                <View style={styles.syncDotStatic} />
                <Text style={styles.syncLabel}>Syncing</Text>
              </View>
            ) : null}
          </View>
          <View style={styles.headRight}>
            <Pressable
              accessibilityRole="button"
              disabled={rows.length === 0}
              onPress={onShare}
              style={[styles.shareBtn, rows.length === 0 && { opacity: 0.5 }]}
            >
              <Svg width={14} height={14} viewBox="0 0 24 24">
                <Circle cx={18} cy={5} r={3} fill="none" stroke={dark.foreground} strokeWidth={2} />
                <Circle cx={6} cy={12} r={3} fill="none" stroke={dark.foreground} strokeWidth={2} />
                <Circle cx={18} cy={19} r={3} fill="none" stroke={dark.foreground} strokeWidth={2} />
                <Line x1={8.59} y1={13.51} x2={15.42} y2={17.49} stroke={dark.foreground} strokeWidth={2} />
                <Line x1={15.41} y1={6.51} x2={8.59} y2={10.49} stroke={dark.foreground} strokeWidth={2} />
              </Svg>
              <Text style={styles.shareLabel}>Share</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              onPress={() => setCurrency((c) => (c === 'SOL' ? 'USD' : 'SOL'))}
              style={styles.currencyToggle}
            >
              <Text style={styles.currencyValue}>{currency}</Text>
            </Pressable>
          </View>
        </View>
        {!authenticated ? <Text style={styles.hint}>Sign in to load your vaults.</Text> : null}
        <View style={styles.grid}>
          {KPIS.map((k) => (
            <View key={k.label} style={styles.kpi}>
              {stats.isLoading && !stats.data ? (
                <View style={[styles.skelLine, styles.kpiSkelLine]} />
              ) : (
                <Text style={[styles.kpiValue, k.tone ? { color: k.tone } : null]}>
                  {k.value}
                </Text>
              )}
              <Text style={styles.kpiLabel}>{k.label}</Text>
            </View>
          ))}
        </View>

        <View style={styles.chartCard}>
          <InteractiveChart
            data={
              pts.length > 1
                ? pts.map(([ts, val]) => ({
                    timestamp: ts,
                    value: currency === 'USD' && solPrice > 0 ? val * solPrice : val,
                  }))
                : undefined
            }
            color="#9945FF"
            gradientColor="#9945FF"
            height={160}
            timeframes={RANGES.map((r) => r.key)}
            initialTimeframe={range}
            activeTimeframe={range}
            onTimeframeChange={(tf) => setRange(tf as '7D' | '30D' | '3M')}
            formatValue={(v) => (currency === 'USD' ? `$${v.toFixed(2)}` : `${v.toFixed(4)} SOL`)}
            showHeader={true}
            emptyMessage={authenticated ? 'No data yet.' : 'Sign in to view equity history.'}
            isSyncing={chartSyncing}
          />
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
                <View style={[styles.rowNums, { gap: 8 * scale }]}>
                  {PF_COLUMNS.map((c) => (
                    <Text
                      key={c.label}
                      style={[
                        { flex: c.flex, textAlign: 'right' },
                        styles.pfHeadCell,
                        { fontSize: 7 * scale, letterSpacing: 0.4 * scale },
                      ]}
                    >
                      {c.label}
                    </Text>
                  ))}
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
                  <View style={[styles.rowL, styles.pfName, { gap: 10 * scale }]}>
                    <View
                      style={[
                        styles.dot,
                        {
                          backgroundColor: (tier as Record<string, string>)[r.tier] ?? tier.safe,
                          width: 12 * scale,
                          height: 12 * scale,
                          borderRadius: 6 * scale,
                        },
                      ]}
                    />
                    <Text style={[styles.rowLabel, { fontSize: 11 * scale }]}>
                      {`${TIER_LABEL[r.tier] ?? 'Safe'} Vault`}
                    </Text>
                  </View>
                  <View style={[styles.rowNums, { gap: 8 * scale }]}>
                    <Text style={[styles.rowValue, styles.pfCellVal, { flex: PF_COLUMNS[0]!.flex, fontSize: 11 * scale }]}>
                      {(Number(r.equityNavLamports) / 1e9).toFixed(4)}
                    </Text>
                    <Text
                      style={[
                        styles.rowValue,
                        styles.pfCellVal,
                        { flex: PF_COLUMNS[1]!.flex, fontSize: 11 * scale },
                        { color: roi >= 0 ? brand.success : brand.error },
                      ]}
                    >
                      {`${roi.toFixed(2)}%`}
                    </Text>
                    <Text
                      style={[
                        styles.rowValue,
                        styles.pfCellVal,
                        { flex: PF_COLUMNS[2]!.flex, fontSize: 11 * scale },
                        { color: realized >= 0 ? brand.success : brand.error },
                      ]}
                    >
                      {`${realized >= 0 ? '+' : ''}${(realized / 1e9).toFixed(4)}`}
                    </Text>
                    <Text style={[styles.rowValue, styles.pfCellVal, { flex: PF_COLUMNS[3]!.flex, fontSize: 11 * scale }]}>
                      {`${ltvPct.toFixed(2)}%`}
                    </Text>
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
            {historyLoading && authenticated ? (
              [0, 1, 2].map((i) => (
                <View key={`skel-${i}`} style={[styles.txItem, i > 0 && styles.rowBorder]}>
                  <View style={styles.txItemLeft}>
                    <View style={[styles.txIconBox, styles.skelBox]} />
                    <View style={styles.txItemMeta}>
                      <View style={[styles.skelLine, { width: '55%' }]} />
                      <View style={[styles.skelLine, { width: '35%', marginTop: 6 }]} />
                    </View>
                  </View>
                  <View style={styles.txItemRight}>
                    <View style={[styles.skelLine, { width: 64 }]} />
                    <View style={[styles.skelLine, { width: 40, marginTop: 6 }]} />
                  </View>
                </View>
              ))
            ) : history.isError && historyRows.length === 0 ? (
              <View style={styles.txErrorBox}>
                <Text style={styles.txErrorText}>Couldn&apos;t load transactions.</Text>
                <Pressable
                  accessibilityRole="button"
                  onPress={() => history.refetch()}
                  style={styles.txRetryBtn}
                >
                  <Text style={styles.txRetryLabel}>Retry</Text>
                </Pressable>
              </View>
            ) : (
              <FlatList
                data={visibleHistoryRows}
                keyExtractor={(r) => r.id}
                scrollEnabled={false}
                renderItem={({ item: r, index }) => (
                  <View style={[styles.txItem, index > 0 && styles.rowBorder]}>
                    <View style={styles.txItemLeft}>
                      <View style={[styles.txIconBox, { backgroundColor: getHistoryBg(r.interaction) }]}>
                        {renderHistoryIcon(r.interaction)}
                      </View>
                      <View style={styles.txItemMeta}>
                        <Text style={styles.txItemTitle}>{r.interaction}</Text>
                        {r.detail ? (
                          <Text style={styles.txItemDetail} numberOfLines={1}>
                            {r.detail}
                          </Text>
                        ) : null}
                      </View>
                    </View>
                    <View style={styles.txItemRight}>
                      <Text
                        style={[
                          styles.txItemAmount,
                          r.amount.startsWith('+') && { color: brand.success },
                        ]}
                      >
                        {r.amount}
                      </Text>
                      <Text style={styles.txItemDate}>{rel(r.ts)}</Text>
                    </View>
                  </View>
                )}
                ListFooterComponent={
                  <>
                    {visibleHistoryRows.length < historyRows.length ? (
                      <Pressable
                        accessibilityRole="button"
                        onPress={() => setTxVisible((v) => v + MAX_TX_ROWS)}
                        style={styles.txLoadMore}
                      >
                        <Text style={styles.txRetryLabel}>
                          Load more ({historyRows.length - visibleHistoryRows.length} remaining)
                        </Text>
                      </Pressable>
                    ) : null}
                    {historyRows.length > 0 ? (
                      <View style={styles.txCountRow}>
                        <Text style={styles.txCountLabel}>
                          {historyRows.length} transaction{historyRows.length !== 1 ? 's' : ''}
                        </Text>
                      </View>
                    ) : null}
                  </>
                }
              />
            )}

            {authenticated && !historyLoading && !history.isError && historyRows.length === 0 ? (
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
  syncBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  syncDotStatic: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: brand.success,
  },
  syncLabel: {
    color: dark.mutedForeground,
    fontSize: 11,
    fontWeight: '500',
  },
  headRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  h1: {
    ...typography.title1,
    color: dark.foreground,
    fontSize: 28,
  },
  hint: {
    ...typography.body,
    color: dark.mutedForeground,
    fontSize: 13,
  },
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
  kpiLabel: {
    ...typography.caption,
    color: dark.mutedForeground,
  },
  kpiSkelLine: {
    width: 64,
    height: 18,
    borderRadius: 6,
  },
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
    borderBottomWidth: 1,
    borderBottomColor: dark.border,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 12,
    marginBottom: -1,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: { borderBottomColor: dark.foreground },
  tabLabel: { color: dark.mutedForeground, fontSize: 16, fontWeight: '600', textAlign: 'center' },
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
  dot: { width: 12, height: 12, borderRadius: 6 },
  rowLabel: { color: dark.foreground, fontSize: 11, fontWeight: '500' },
  rowDetail: { color: dark.mutedForeground, fontSize: 12 },
  rowValue: { color: dark.foreground, fontSize: 13, fontVariant: ['tabular-nums'] },
  rowNums: { flex: 3, flexDirection: 'row', gap: 8, alignItems: 'center' },
  pfName: { flex: 1.6, minWidth: 0 },
  pfCellVal: { fontSize: 11, textAlign: 'right' },
  pfHeadCell: { color: dark.mutedForeground, fontSize: 7, letterSpacing: 0.4, fontWeight: '600' },
  acHeadCell: { color: dark.mutedForeground, fontSize: 8, letterSpacing: 0.4, fontWeight: '600' },
  acDate: { flex: 0.67, fontSize: 11 },
  acType: { flex: 1.29 },
  acDetail: { flex: 0.94, fontSize: 11 },
  acAmount: { flex: 1.1, fontSize: 11, textAlign: 'right' },
  txItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.base,
    paddingVertical: 14,
    gap: spacing.md,
  },
  txItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
    minWidth: 0,
  },
  txIconBox: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  txItemMeta: {
    flex: 1,
    gap: 2,
  },
  txItemTitle: {
    ...typography.headline,
    color: dark.foreground,
    fontSize: 14,
  },
  txItemDetail: {
    ...typography.caption,
    color: dark.mutedForeground,
    fontSize: 12,
  },
  txItemRight: {
    alignItems: 'flex-end',
    gap: 2,
  },
  txItemAmount: {
    ...typography.mono,
    color: dark.foreground,
    fontSize: 14,
    fontWeight: '600',
  },
  txItemDate: {
    ...typography.caption,
    color: dark.mutedForeground,
    fontSize: 11,
  },
  empty: { padding: spacing.base, gap: 4 },
  skelBox: { backgroundColor: dark.muted },
  skelLine: {
    height: 12,
    borderRadius: 6,
    backgroundColor: dark.muted,
    opacity: 0.6,
  },
  txCountRow: {
    alignItems: 'center',
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: dark.border,
  },
  txCountLabel: {
    ...typography.caption,
    color: dark.mutedForeground,
    fontSize: 12,
  },
  txErrorBox: {
    alignItems: 'center',
    gap: 12,
    paddingVertical: 28,
    paddingHorizontal: spacing.base,
  },
  txErrorText: {
    ...typography.body,
    color: dark.mutedForeground,
    fontSize: 13,
  },
  txRetryBtn: {
    borderWidth: 1,
    borderColor: dark.border,
    borderRadius: radius.lg,
    paddingHorizontal: 20,
    paddingVertical: 8,
  },
  txRetryLabel: {
    color: dark.foreground,
    fontSize: 13,
    fontWeight: '600',
  },
  txLoadMore: {
    alignItems: 'center',
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: dark.border,
  },
});
