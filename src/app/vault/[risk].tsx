// Vault detail: mobile port of apps/web vault/[risk] with live API data.

import { useMemo, useState } from 'react';
import { View, Text, Image, ScrollView, Pressable, Share, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import Svg, { Polyline, Path } from 'react-native-svg';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  fetchThaler,
  endpoints,
  type PublicStats,
  type ListVaultsResponse,
  type VaultPositions,
  type UserVaultStatsView,
} from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { dark, brand, radius, spacing } from '@/theme/tokens';

const TIER_META = {
  safe: { mode: 'A', label: 'Safe', color: '#99BBFF', riskLabel: 'Low', perpVenue: 'Pacifica', lst: 'jitoSOL' },
  conservative: { mode: 'B', label: 'Conservative', color: '#99FFDD', riskLabel: 'Low', perpVenue: 'Pacifica', lst: 'jitoSOL' },
  balanced: { mode: 'C', label: 'Balanced', color: '#BBFF99', riskLabel: 'Medium', perpVenue: 'Pacifica', lst: 'jitoSOL' },
  optimistic: { mode: 'D', label: 'Optimistic', color: '#FFDD99', riskLabel: 'Medium', perpVenue: 'Hyperliquid', lst: 'jitoSOL' },
  aggressive: { mode: 'E', label: 'Aggressive', color: '#FF99BB', riskLabel: 'High', perpVenue: 'Hyperliquid', lst: 'jitoSOL' },
  yolo: { mode: 'F', label: 'YOLO', color: '#DD99FF', riskLabel: 'High', perpVenue: 'Hyperliquid', lst: 'jitoSOL' },
} as const;
type Tier = keyof typeof TIER_META;

const APY_RANGE: Record<Tier, { min: number; max: number }> = {
  safe: { min: 8.2, max: 13.8 },
  conservative: { min: 8.4, max: 14.1 },
  balanced: { min: 8.7, max: 14.8 },
  optimistic: { min: 9.1, max: 15.6 },
  aggressive: { min: 9.6, max: 17.2 },
  yolo: { min: 10.2, max: 19.8 },
};

const STRATEGY_DESC: Record<Tier, string> = {
  safe:
    'Built for capital preservation, with returns that do not depend on which way SOL moves. Your deposit is staked as jitoSOL, posted as Kamino collateral, and partially borrowed back to fund a short perpetual hedge that cancels out price exposure while you earn staking, lending, funding, and LP fees. The vault is your own Squads Smart Account, run by a dedicated Cloudflare worker that can only act within the immutable policy you signed at vault creation.',
  conservative:
    'A small step up from Safe for users who want a touch more yield with the same calm. The strategy leans into the Kamino carry loop so the deposit-borrow spread does more of the work, while the short perpetual hedge stays small and runs at the same low leverage as Safe. Buffers stay wide and the dedicated worker only acts within the immutable Squads policy you signed at the moment your vault was created.',
  balanced:
    'For users who want noticeably more yield than the conservative tiers without taking heavy market exposure. Capital splits roughly evenly between the Kamino carry loop and the short perpetual hedge, with the hedge running at moderate leverage so funding income contributes alongside the unleveraged carry. The Squads policy is locked on-chain from the moment you sign it, immutable from that point forward and open for you to inspect at any time.',
  optimistic:
    'For users comfortable trading a thinner margin of safety for noticeably higher yield. More capital sits on the hedged side, with the short perpetual hedge running at higher leverage than Balanced so funding income becomes a leading contributor alongside the unleveraged carry loop. Even at this leverage, the immutable policy still defines exactly what the worker can or cannot do.',
  aggressive:
    'For users who want most of their yield to come from funding rather than the carry. The short perpetual hedge runs at substantial leverage to dominate the yield mix when funding is positive, while the Kamino carry loop continues as a steady unleveraged base with tighter buffers and faster rebalances. Even these moves stay bounded by the immutable rules you signed at the moment of vault creation.',
  yolo:
    'The highest-yielding profile Thaler runs, for users who want to push the strategy as hard as Thaler allows. The short perpetual hedge runs at the maximum leverage Thaler permits to carry the bulk of the yield whenever funding is favourable, while the Kamino carry loop runs unchanged underneath as a steady base. Volatile by design, but every action stays enforced by the immutable rules you signed when your vault was created.',
};

const LAMPORTS = 1e9;

const FAQS = [
  {
    q: 'What is this vault?',
    a: 'A managed, delta-neutral SOL strategy. You deposit SOL and the vault runs a staking carry hedged by a short perpetual, so you earn yield without taking a directional bet on the SOL price.',
  },
  {
    q: 'How do I deposit?',
    a: 'Enter a SOL amount in the deposit panel and confirm. Thaler provisions a per-vault Squads Smart Account, you fund it, and the strategy opens automatically.',
  },
  {
    q: 'Where does the yield come from?',
    a: 'Four sources, blended: Solana staking rewards on the LST, the lending carry spread on Kamino, perpetual funding from the short hedge, and LP fees, net of SOL borrow costs.',
  },
  {
    q: 'Is my deposit market-neutral?',
    a: 'The short perpetual hedge is sized to offset the SOL price exposure of the staked collateral, so the position aims to be delta-neutral. Returns come from yield, not from SOL going up or down.',
  },
  {
    q: 'What are the risks?',
    a: 'Borrow rates can rise above the carry, the LST/SOL rate can move, and perpetual funding can turn negative. Higher-risk tiers pursue more aggressive returns and carry a correspondingly higher risk profile.',
  },
  {
    q: 'How is my position kept safe?',
    a: 'Every action is bounded by an immutable Squads policy you sign at vault creation. The dedicated worker can only execute pre-signed strategy steps; it cannot move funds outside the policy.',
  },
  {
    q: 'What are the fees?',
    a: 'A one-time vault creation reserve of 0.06 SOL (covers network + setup costs), and an 11% service fee charged only on the yield you claim. There is no fee on your principal.',
  },
  {
    q: 'Can I withdraw anytime?',
    a: 'Yes. You can claim accrued yield or close the vault at any time; closing unwinds every leg and returns your capital as SOL.',
  },
];

function FaqList() {
  const [open, setOpen] = useState<number | null>(null);
  return (
    <View style={s.card}>
      {FAQS.map((f, i) => (
        <View key={f.q} style={[i > 0 && s.rowBorder, { paddingTop: i > 0 ? 12 : 0 }]}>
          <Pressable onPress={() => setOpen(open === i ? null : i)} style={s.spreadRow}>
            <Text style={[s.factValue, { flexShrink: 1 }]}>{f.q}</Text>
            <Text style={s.muted}>{open === i ? '-' : '+'}</Text>
          </Pressable>
          {open === i ? <Text style={[s.para, { marginTop: 8 }]}>{f.a}</Text> : null}
        </View>
      ))}
    </View>
  );
}
type Breakdown = {
  mode: string;
  vaultCount: number;
  tvlUsd: number;
  projectedApyBps: number;
  utilization?: number;
  tvlSol?: number;
  lifetimeYieldSol?: number;
  pendingUsdcUsd?: number | null;
  apy30dMedianBps?: number | null;
};
type AnalyticsResponse = {
  strategyBreakdown: Breakdown[];
  tvlByModeDaily?: { date: string; mode: string; tvlUsd: number }[];
};
type VaultRow = ListVaultsResponse['vaults'][number];

function toLine(points: [number, number][], w = 100, h = 40): string | null {
  if (points.length < 2) return null;
  const xs = points.map((p) => p[0]);
  const ys = points.map((p) => p[1]);
  const x0 = Math.min(...xs);
  const spanX = Math.max(...xs) - x0 || 1;
  const y0 = Math.min(...ys);
  const spanY = Math.max(...ys) - y0 || 1;
  return points
    .map(([x, y]) => `${(((x - x0) / spanX) * w).toFixed(2)},${(1 + (1 - (y - y0) / spanY) * (h - 2)).toFixed(2)}`)
    .join(' ');
}

function ChartBox({ title, points, color, legend }: { title: string; points: [number, number][]; color: string; legend: string }) {
  const line = toLine(points);
  return (
    <View style={s.card}>
      <Text style={s.cardTitle}>{title}</Text>
      {line ? (
        <Svg width="100%" height={120} viewBox="0 0 100 40" preserveAspectRatio="none">
          <Polyline points={line} fill="none" stroke={color} strokeWidth={0.7} strokeLinejoin="round" />
        </Svg>
      ) : (
        <Text style={[s.muted, { paddingVertical: 40, textAlign: 'center' }]}>No data yet.</Text>
      )}
      <View style={s.legendRow}>
        <View style={[s.legendDot, { backgroundColor: color }]} />
        <Text style={s.muted12}>{legend}</Text>
      </View>
    </View>
  );
}

function VaultInfoCard({ tier }: { tier: Tier }) {
  const meta = TIER_META[tier];
  const [expanded, setExpanded] = useState(false);
  return (
    <View style={s.card}>
      <Text style={s.cardTitle}>Vault Info</Text>
      <Text style={s.para}>{STRATEGY_DESC[tier]}</Text>
      {expanded ? (
        <>
          <Text style={s.h3}>How It Works</Text>
          <Text style={s.para}>
            {`Your SOL is staked into ${meta.lst} and posted as collateral on Kamino Lend to earn the staking carry. A short perpetual hedge on ${meta.perpVenue} cancels out the SOL price exposure so the position stays delta-neutral. You earn the blended yield from staking, the lending carry spread, perp funding, and LP fees, net of borrow costs (the Net APY). Whenever the Net APY is positive, the vault generates yield independent of which way SOL moves.`}
          </Text>
          <Text style={s.h3}>Liquidation Risk</Text>
          <Text style={s.para}>
            The position is managed to keep a conservative health buffer. Two main forces can
            compress that buffer:
          </Text>
          <Text style={s.para}>
            {`•  ${meta.lst} is priced on Kamino Lend against its native stake-pool rate, not the open-market price, so a temporary market depeg does not move the collateral value or trigger liquidation.`}
          </Text>
          <Text style={s.para}>
            {'•  If SOL borrow rates spike above the staking carry for an extended period, the position can become unprofitable and, in extreme cases, drift toward liquidation. Active rebalancing keeps the position a wide safety margin away from the liquidation threshold.'}
          </Text>
          <Text style={s.para}>
            {`The vault is your own Squads Smart Account, run by a dedicated worker that can only act within the immutable policy you signed at vault creation. The underlying venues (Kamino Lend, ${meta.perpVenue}) are audited smart-contract protocols and carry the usual smart-contract risk.`}
          </Text>
        </>
      ) : null}
      <Pressable accessibilityRole="button" onPress={() => setExpanded((v) => !v)}>
        <Text style={s.showMore}>{expanded ? 'Show less' : 'Show more'}</Text>
      </Pressable>
    </View>
  );
}

function FactRow({ label, value, valueColor }: { label: string; value: string; valueColor?: string }) {
  return (
    <View style={s.factRow}>
      <Text style={s.muted}>{label}</Text>
      <Text style={[s.factValue, valueColor ? { color: valueColor } : null]}>{value}</Text>
    </View>
  );
}

function BigStat({ label, value, sub, tone }: { label: string; value: string; sub?: string; tone?: string }) {
  return (
    <View style={s.bigStat}>
      <Text style={s.muted12}>{label}</Text>
      <View style={s.bigStatRow}>
        <Text style={[s.bigStatValue, tone ? { color: tone } : null]}>{value}</Text>
        {sub ? <Text style={s.muted12}>{sub}</Text> : null}
      </View>
    </View>
  );
}

function SubPill({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={[s.subPill, active && s.subPillActive]}>
      <Text style={[s.subPillLabel, active && { color: dark.foreground }]}>{label}</Text>
    </Pressable>
  );
}

export default function VaultDetail() {
  const router = useRouter();
  const params = useLocalSearchParams<{ risk: string; tab?: string; vault?: string }>();
  const risk = String(params.risk ?? 'safe').toLowerCase();
  const tier: Tier = (risk in TIER_META ? risk : 'safe') as Tier;
  const meta = TIER_META[tier];
  const { getToken, authenticated } = useAuth();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<'overview' | 'position' | 'info'>(
    params.tab === 'position' ? 'position' : 'overview'
  );
  const [overviewPill, setOverviewPill] = useState<'loop' | 'advanced' | 'backtesting'>('loop');
  const [subTab, setSubTab] = useState<'vaults' | 'liquidation' | 'transactions'>('vaults');
  const [selectedId, setSelectedId] = useState<string | null>(
    typeof params.vault === 'string' && params.vault.length > 0 ? params.vault : null
  );
  const [backDays, setBackDays] = useState(30);

  const pub = useQuery({
    queryKey: ['public-stats'],
    queryFn: () => fetchThaler<PublicStats>(null, endpoints.publicStats),
    staleTime: 60_000,
  });
  const solPrice = pub.data?.ok ? pub.data.solPriceUsd : 0;

  const analytics = useQuery({
    queryKey: ['analytics'],
    queryFn: async () => fetchThaler<AnalyticsResponse>(await getToken(), endpoints.analytics),
    enabled: authenticated,
    staleTime: 60_000,
  });
  const breakdown = analytics.data?.strategyBreakdown.find((b) => b.mode === meta.mode);

  const apyHistory = useQuery({
    queryKey: ['apy-history', tier],
    queryFn: () =>
      fetchThaler<{ ok: boolean; points: { ts: number; apyBps: number }[] }>(
        null,
        endpoints.apyHistory(tier, 30)
      ),
    staleTime: 60_000,
  });

  const vaultsQ = useQuery({
    queryKey: ['vaults'],
    queryFn: async () => fetchThaler<ListVaultsResponse>(await getToken(), endpoints.vaults),
    enabled: authenticated,
    staleTime: 30_000,
  });
  const statsQ = useQuery({
    queryKey: ['vault-stats'],
    queryFn: async () => fetchThaler<UserVaultStatsView>(await getToken(), endpoints.vaultStats),
    enabled: authenticated,
    staleTime: 60_000,
  });

  const myVaults = useMemo(
    () =>
      (vaultsQ.data?.vaults ?? []).filter(
        (v) => v.tier === tier && v.state === 'DONE' && v.latestClose === null && v.metrics !== null
      ),
    [vaultsQ.data, tier]
  );
  const attentionVaults = useMemo(
    () =>
      (vaultsQ.data?.vaults ?? []).filter(
        (v) =>
          v.tier === tier &&
          v.latestClose === null &&
          (v.state === 'FAILED' || v.state === 'PENDING' || v.state === 'RUNNING')
      ),
    [vaultsQ.data, tier]
  );
  const selected = myVaults.find((v) => v.id === selectedId) ?? null;

  const posTargetId = selectedId ?? (subTab === 'liquidation' ? (myVaults[0]?.id ?? null) : null);
  const positionsQ = useQuery({
    queryKey: ['vault-positions', posTargetId],
    queryFn: async () =>
      fetchThaler<VaultPositions>(await getToken(), endpoints.vaultPositions(posTargetId!)),
    enabled:
      authenticated &&
      posTargetId !== null &&
      ((subTab === 'vaults' && selectedId !== null) || subTab === 'liquidation'),
    refetchInterval: 30_000,
  });

  const annualApy = breakdown
    ? (Number.isFinite(breakdown.apy30dMedianBps ?? NaN)
        ? (breakdown.apy30dMedianBps as number)
        : breakdown.projectedApyBps) / 100
    : 0;
  const utilizationPct = (breakdown?.utilization ?? 0) * 100;
  const tierLiquiditySol =
    breakdown?.tvlSol ?? (solPrice > 0 ? (breakdown?.tvlUsd ?? 0) / solPrice : 0);
  const tierYieldSol = breakdown?.lifetimeYieldSol ?? 0;
  const tierTotalYieldSol =
    tierYieldSol +
    (solPrice > 0 && breakdown?.pendingUsdcUsd != null ? breakdown.pendingUsdcUsd / solPrice : 0);

  const tvlSeries: [number, number][] = useMemo(() => {
    if (!analytics.data?.tvlByModeDaily || solPrice <= 0) return [];
    return analytics.data.tvlByModeDaily
      .filter((p) => p.mode === meta.mode)
      .map((p) => [Date.parse(p.date), p.tvlUsd / solPrice] as [number, number])
      .sort((a, b) => a[0] - b[0]);
  }, [analytics.data, meta.mode, solPrice]);
  const apySeries: [number, number][] = useMemo(
    () => (apyHistory.data?.points ?? []).map((p) => [p.ts, p.apyBps / 100]),
    [apyHistory.data]
  );

  const medianApy = (APY_RANGE[tier].min + APY_RANGE[tier].max) / 2 / 100;
  const posRoiAt = (d: number) => (Math.pow(1 + medianApy, d / 365) - 1) * 100;
  const backSeries: [number, number][] = useMemo(
    () => Array.from({ length: backDays + 1 }, (_, d) => [d, posRoiAt(d)] as [number, number]),
    [backDays, medianApy]
  );

  return (
    <SafeAreaView style={s.root} edges={['top']}>
      <ScrollView contentContainerStyle={s.scroll}>
        <View style={s.headRow}>
          <Pressable accessibilityRole="button" onPress={() => router.back()} style={s.backBtn}>
            <Svg width={16} height={16} viewBox="0 0 24 24">
              <Path d="M19 12H5M12 19l-7-7 7-7" fill="none" stroke={dark.mutedForeground} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
            </Svg>
          </Pressable>
          <Image source={require('../../../assets/images/solana-logo.png')} style={s.solToken} />
          <Text style={s.h1}>{meta.label} Vault</Text>
          <View style={[s.riskChip, { backgroundColor: `${meta.color}22` }]}>
            <Text style={[s.riskChipLabel, { color: meta.color }]}>{meta.riskLabel} risk</Text>
          </View>
        </View>

        <View style={s.headStats}>
          <View style={s.headStat}>
            <Text style={s.muted}>SOL Price</Text>
            <Text style={s.headStatValue}>{solPrice > 0 ? `$${solPrice.toFixed(2)}` : '-'}</Text>
          </View>
          <View style={s.headDivider} />
          <View style={s.headStat}>
            <Text style={s.muted}>Hedged on</Text>
            <Text style={s.headStatValue}>{meta.perpVenue}</Text>
          </View>
        </View>

        <View style={s.tabs}>
          {(
            [
              { key: 'overview', label: 'Overview' },
              { key: 'position', label: 'My Vaults' },
              { key: 'info', label: 'Info & FAQs' },
            ] as const
          ).map((t) => (
            <Pressable key={t.key} onPress={() => setTab(t.key)} style={[s.tab, tab === t.key && s.tabActive]}>
              <Text style={[s.tabLabel, tab === t.key && { color: dark.foreground }]}>{t.label}</Text>
            </Pressable>
          ))}
        </View>

        {tab === 'overview' ? (
          <>
            <View style={s.pillRow}>
              <SubPill label="Vault Info" active={overviewPill === 'loop'} onPress={() => setOverviewPill('loop')} />
              <SubPill label="Advanced Info" active={overviewPill === 'advanced'} onPress={() => setOverviewPill('advanced')} />
              <SubPill label="Backtesting" active={overviewPill === 'backtesting'} onPress={() => setOverviewPill('backtesting')} />
            </View>

            {overviewPill === 'loop' ? (
              <>
                <View style={s.card}>
                  <Text style={s.cardTitle}>Strategy Overview</Text>
                  <View style={s.bigStatGrid}>
                    <BigStat label="Liquidity Managed" value={tierLiquiditySol > 0 ? tierLiquiditySol.toFixed(2) : '-'} sub="SOL" />
                    <BigStat label="Projected APR" value={`${annualApy.toFixed(1)}%`} tone={brand.success} />
                    <BigStat label="Total Yield" value={tierTotalYieldSol.toFixed(3)} sub="SOL" tone={brand.success} />
                  </View>
                  <View style={s.factBlock}>
                    <FactRow label="Collateral Asset" value={meta.lst} />
                    <FactRow label="Debt Asset" value="SOL" />
                    <FactRow label="Hedge Venue" value={meta.perpVenue} />
                    <FactRow label="Borrow Rate Type" value="Variable Rate" />
                  </View>
                </View>
                <VaultInfoCard tier={tier} />
                <ChartBox title="Liquidity Managed" points={tvlSeries} color="#9945FF" legend="Liquidity managed (SOL)" />
                <ChartBox title="APY" points={apySeries} color={meta.color} legend={`${meta.label} APY`} />
              </>
            ) : null}

            {overviewPill === 'advanced' ? (
              <View style={s.card}>
                <Text style={s.muted}>Advanced Info is coming soon.</Text>
              </View>
            ) : null}

            {overviewPill === 'backtesting' ? (
              <>
                <View style={s.card}>
                  <Text style={s.cardTitle}>Simulation Range</Text>
                  <View style={s.pillRow}>
                    {[30, 90, 180, 365].map((d) => (
                      <SubPill key={d} label={`${d}D`} active={backDays === d} onPress={() => setBackDays(d)} />
                    ))}
                  </View>
                </View>
                <View style={s.bigStatGrid}>
                  <BigStat label="Avg. Projected APR" value={`${(medianApy * 100).toFixed(2)}%`} tone={brand.success} />
                  <BigStat label="Projected Return" value={`+${posRoiAt(backDays).toFixed(2)}%`} tone={brand.success} />
                  <BigStat label="Duration" value={`${backDays} Days`} />
                </View>
                <ChartBox title="Projected Return" points={backSeries} color="#5B9DF9" legend="Projected cumulative return" />
                <View style={s.card}>
                  <Text style={s.cardTitle}>Disclaimers</Text>
                  <Text style={s.para}>
                    Backtesting simulation results for this vault are based on historical APY bands
                    and provided for illustrative purposes only. They do not guarantee future
                    performance, and actual market outcomes may differ significantly. Results may
                    also be incomplete or inaccurate. Swapping and slippage costs are not included
                    in the analysis.
                  </Text>
                </View>
              </>
            ) : null}
          </>
        ) : null}

        {tab === 'position' ? (
          <>
            <View style={s.pillRow}>
              <SubPill label="Vaults" active={subTab === 'vaults'} onPress={() => { setSubTab('vaults'); }} />
              <SubPill label="Liquidation Analysis" active={subTab === 'liquidation'} onPress={() => setSubTab('liquidation')} />
              <SubPill label="Transaction History" active={subTab === 'transactions'} onPress={() => setSubTab('transactions')} />
            </View>
            {!authenticated ? <Text style={s.muted}>Sign in to load your vaults.</Text> : null}

            {subTab === 'vaults' && !selected ? (
              <>
                {attentionVaults.map((v) => (
                  <PendingVaultCard key={v.id} vault={v} tier={tier} getToken={getToken} onChanged={() => queryClient.invalidateQueries({ queryKey: ['vaults'] })} />
                ))}
                <VaultsTable vaults={myVaults} solPrice={solPrice} onSelect={setSelectedId} />
              </>
            ) : null}

            {subTab === 'vaults' && selected ? (
              <PositionDetail
                vault={selected}
                pos={positionsQ.data}
                statRow={statsQ.data?.vaults.find((r) => r.vaultExecutionId === selected.id)}
                tierMeta={meta}
                solPrice={solPrice}
                getToken={getToken}
                onBack={() => setSelectedId(null)}
              />
            ) : null}

            {subTab === 'liquidation' ? (
              <LiquidationCard vault={myVaults[0] ?? null} pos={positionsQ.data} solPrice={solPrice} />
            ) : null}

            {subTab === 'transactions' ? (
              <TierTransactions vaults={myVaults} />
            ) : null}
          </>
        ) : null}

        {tab === 'info' ? (
          <>
            <View style={s.card}>
              <Text style={s.cardTitle}>Vaults Info</Text>
              <View style={s.factBlock}>
                <FactRow label="Projected APR" value={`${annualApy.toFixed(1)}%`} />
                <FactRow label="Utilization" value={`${utilizationPct.toFixed(1)}%`} />
                <FactRow label="Total Deposits" value={`${tierLiquiditySol.toFixed(2)} SOL`} />
              </View>
            </View>
            <View style={s.card}>
              <Text style={s.cardTitle}>Asset Details</Text>
              <Text style={s.factValue}>SOL</Text>
              <Text style={s.para}>
                SOL is the native token of the Solana blockchain, and is the most widely
                circulating asset in the ecosystem.
              </Text>
            </View>
            <FaqList />
          </>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

function rowMetrics(v: VaultRow, pos: VaultPositions | undefined, solPriceUsd: number) {
  const p = pos as unknown as
    | { equityNavLamports?: string; pendingRecycleUsd?: number | null; realizedYieldLamports?: string | null; daysHeld?: number }
    | undefined;
  const baseNetValueSol = p?.equityNavLamports
    ? Number(p.equityNavLamports) / LAMPORTS
    : Number(v.equityLamports) / LAMPORTS;
  const pendingUsd = p?.pendingRecycleUsd ?? 0;
  const netValue = baseNetValueSol + (solPriceUsd > 0 && pendingUsd > 0 ? pendingUsd / solPriceUsd : 0);
  const yieldSol =
    p?.realizedYieldLamports != null
      ? Number(p.realizedYieldLamports) / LAMPORTS
      : Number(v.metrics?.claimableSol ?? 0);
  const dep = Number(v.equityLamports) / LAMPORTS;
  // roi = realized yield over deposit, percent (same basis as the web).
  const roi = dep > 0 ? (yieldSol / dep) * 100 : 0;
  const ltv = Number(v.ltvBps ?? 0) / 100;
  const f = (n: number) => (Number.isFinite(n) ? n : 0);
  return { netValue: f(netValue), roi: f(roi), yield: f(yieldSol), ltv: f(ltv) };
}

type SortKey = 'netValue' | 'roi' | 'yield' | 'ltv';
const VAULT_COLUMNS: { key: SortKey; label: string }[] = [
  { key: 'netValue', label: 'NET VALUE' },
  { key: 'roi', label: 'ROI' },
  { key: 'yield', label: 'YIELD' },
  { key: 'ltv', label: 'LTV' },
];

function VaultsTable({ vaults, solPrice, onSelect }: { vaults: VaultRow[]; solPrice: number; onSelect: (id: string) => void }) {
  const [sort, setSort] = useState<{ key: SortKey; dir: 'asc' | 'desc' }>({
    key: 'netValue',
    dir: 'desc',
  });
  const rows = useMemo(() => {
    const mapped = vaults.map((v) => ({ v, m: rowMetrics(v, undefined, solPrice) }));
    mapped.sort((a, b) => {
      const diff = a.m[sort.key] - b.m[sort.key];
      return sort.dir === 'asc' ? diff : -diff;
    });
    return mapped;
  }, [vaults, solPrice, sort]);
  const toggleSort = (key: SortKey) =>
    setSort((prev) =>
      prev.key === key ? { key, dir: prev.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: 'desc' }
    );
  if (vaults.length === 0) {
    return (
      <View style={s.card}>
        <Text style={s.cardTitle}>No vaults yet</Text>
        <Text style={s.muted}>Create your first delta-neutral vault to start earning.</Text>
      </View>
    );
  }
  const colW = 92;
  return (
    <View style={s.list}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={{ minWidth: 680 }}>
          <View style={[s.tableHead, s.rowPad]}>
            <Text style={[s.tableHeadCell, { width: 150 }]}>STRATEGY</Text>
            {VAULT_COLUMNS.map((c) => {
              const active = sort.key === c.key;
              return (
                <Pressable key={c.key} onPress={() => toggleSort(c.key)} style={[s.headBtn, { width: colW }]}>
                  <Text style={[s.tableHeadCell, active && { color: dark.foreground }]}>
                    {c.label}
                  </Text>
                  <Text style={[s.sortMark, active && { color: dark.foreground }]}>
                    {active ? (sort.dir === 'asc' ? '▴' : '▾') : '▴▾'}
                  </Text>
                </Pressable>
              );
            })}
            <Text style={[s.tableHeadCell, { width: 90 }]} />
          </View>
          {rows.map(({ v, m }, i) => {
            const meta = TIER_META[(v.tier ?? 'safe') as Tier] ?? TIER_META.safe;
            return (
              <Pressable key={v.id} onPress={() => onSelect(v.id)} style={[s.tableRow, s.rowPad, i > 0 && s.rowBorder]}>
                <View style={[s.rowL, { width: 150 }]}>
                  <View style={[s.dot, { backgroundColor: meta.color }]} />
                  <View style={{ flexShrink: 1 }}>
                    <Text style={s.factValue}>{meta.label} Vault</Text>
                    <Text style={s.muted12}>{meta.lst}/SOL</Text>
                  </View>
                </View>
                <Text style={[s.cellFixed, { width: colW }]}>{m.netValue.toFixed(4)} SOL</Text>
                <Text
                  style={[
                    s.cellFixed,
                    { width: colW },
                    { color: m.roi > 0 ? brand.success : m.roi < 0 ? brand.warning : dark.foreground },
                  ]}
                >
                  {m.roi.toFixed(2)}%
                </Text>
                <Text style={[s.cellFixed, { width: colW }, m.yield > 0 && { color: brand.success }]}>
                  {m.yield.toFixed(4)} SOL
                </Text>
                <Text style={[s.cellFixed, { width: colW }]}>{m.ltv.toFixed(2)}%</Text>
                <View style={[s.btnOutline, { width: 90, alignItems: 'center' }]}>
                  <Text style={s.btnOutlineLabel}>Manage</Text>
                </View>
              </Pressable>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
}

function PendingVaultCard({
  vault,
  tier,
  getToken,
  onChanged,
}: {
  vault: VaultRow;
  tier: Tier;
  getToken: () => Promise<string | null>;
  onChanged: () => void;
}) {
  const meta = TIER_META[tier];
  const failed = vault.state === 'FAILED';
  const [note, setNote] = useState<string | null>(null);
  const resume = useMutation({
    mutationFn: async () =>
      fetchThaler(await getToken(), endpoints.vaultResume(vault.id), { method: 'POST' }),
    onSuccess: () => {
      setNote('Retrying your vault');
      onChanged();
    },
    onError: (e) => setNote(e instanceof Error ? e.message : 'Could not resume'),
  });
  const dismantle = useMutation({
    mutationFn: async () =>
      fetchThaler(await getToken(), endpoints.vaultDismantle(vault.id), { method: 'POST' }),
    onSuccess: () => {
      setNote('Unwind started');
      onChanged();
    },
    onError: (e) => setNote(e instanceof Error ? e.message : 'Could not start unwind'),
  });
  return (
    <View style={s.card}>
      <View style={s.spreadRow}>
        <View style={s.rowL}>
          <View style={[s.dot, { backgroundColor: meta.color }]} />
          <View style={{ flexShrink: 1 }}>
            <Text style={s.factValue}>{meta.label} Vault</Text>
            <Text style={s.muted12}>
              {failed
                ? 'Build stopped partway. Your funds are safe in the vault wallet.'
                : 'Building your vault…'}
            </Text>
          </View>
        </View>
        <View style={[s.badge, failed ? s.badgeError : s.badgeMuted]}>
          <Text style={[s.badgeLabel, failed && { color: brand.error }]}>{failed ? 'Failed' : 'Building'}</Text>
        </View>
      </View>
      {failed ? (
        <View style={s.actionRow}>
          <Pressable
            accessibilityRole="button"
            disabled={resume.isPending || dismantle.isPending}
            onPress={() => dismantle.mutate()}
            style={[s.btnDestructive, dismantle.isPending && { opacity: 0.6 }]}
          >
            <Text style={s.btnDestructiveLabel}>{dismantle.isPending ? 'Unwinding…' : 'Unwind'}</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            disabled={resume.isPending || dismantle.isPending}
            onPress={() => resume.mutate()}
            style={[s.btnPrimary, resume.isPending && { opacity: 0.6 }]}
          >
            <Text style={s.btnPrimaryLabel}>{resume.isPending ? 'Retrying…' : 'Retry'}</Text>
          </Pressable>
        </View>
      ) : null}
      {note ? <Text style={[s.muted12, { marginTop: 8 }]}>{note}</Text> : null}
    </View>
  );
}

function PositionDetail({
  vault,
  pos,
  statRow,
  tierMeta,
  solPrice,
  getToken,
  onBack,
}: {
  vault: VaultRow;
  pos: VaultPositions | undefined;
  statRow: UserVaultStatsView['vaults'][number] | undefined;
  tierMeta: (typeof TIER_META)[Tier];
  solPrice: number;
  getToken: () => Promise<string | null>;
  onBack: () => void;
}) {
  const p = pos as unknown as
    | {
        pendingRecycleUsd?: number | null;
        realizedYieldLamports?: string | null;
        daysHeld?: number;
        apyBps?: number;
        yieldHistorySol?: { ts: number; earnedSol: number }[];
        claimPreview?: {
          fundingReceivedSol?: { sol: string };
          fundingPaidSol?: { sol: string };
          scalpProfitsSol?: { sol: string };
          preScalpProfitsSol?: { sol: string };
          grossClaimableLamports?: string;
          serviceFeeBps?: number;
          netUserYieldLamports?: string;
          releasableNowNetLamports?: string;
          carryAutocompoundedSol?: { sol: string };
          lpFeesAutocompoundedSol?: { sol: string };
        } | null;
      }
    | undefined;
  const [yieldView, setYieldView] = useState<'SOL' | 'USD'>('SOL');
  const earnedSol =
    p?.realizedYieldLamports != null
      ? Number(p.realizedYieldLamports) / LAMPORTS
      : statRow
        ? Number(statRow.realizedYieldLamports) / LAMPORTS
        : 0;
  const pendingUsdc = Number.isFinite(Number(p?.pendingRecycleUsd)) ? Number(p?.pendingRecycleUsd) : 0;
  const eq = Number(vault.equityLamports);
  const managedSol = Number.isFinite(eq) ? Math.round(eq / LAMPORTS / 2) * 2 : 0;
  const depositSol = Number.isFinite(eq) ? eq / LAMPORTS : 0;
  const roi = depositSol > 0 ? (earnedSol / depositSol) * 100 : 0;
  const daysHeld = Number.isFinite(p?.daysHeld ?? NaN) ? (p?.daysHeld as number) : 0;
  const claimableNet = statRow?.claimableNetSol ?? 0;
  const cp = p?.claimPreview ?? null;
  const [claimNote, setClaimNote] = useState<string | null>(null);
  const claim = useMutation({
    mutationFn: async () =>
      fetchThaler(await getToken(), endpoints.vaultClaim(vault.id), { method: 'POST' }),
    onSuccess: () => setClaimNote('Claim started.'),
    onError: (e) => setClaimNote(e instanceof Error ? e.message : 'Claim failed.'),
  });

  const onShare = () => {
    const sign = earnedSol >= 0 ? '+' : '';
    const text = `My Thaler ${tierMeta.label} Vault generated ${sign}${earnedSol.toFixed(4)} SOL in yield. Delta-neutral jitoSOL, hedged on-chain.`;
    Share.share({ message: `${text} https://thaler.finance` }).catch(() => {});
  };
  const yieldSeries: [number, number][] = (p?.yieldHistorySol ?? []).map((pt) => [
    pt.ts,
    yieldView === 'USD' ? pt.earnedSol * solPrice : pt.earnedSol,
  ]);

  return (
    <>
      <Pressable accessibilityRole="button" onPress={onBack} style={s.rowL}>
        <Text style={s.showMore}>{'‹ Back to list'}</Text>
      </Pressable>
      <View style={s.card}>
        <View style={s.spreadRow}>
          <View style={s.rowL}>
            <View style={[s.dot, { backgroundColor: tierMeta.color }]} />
            <Text style={s.cardTitle}>{tierMeta.label} · Position Overview</Text>
          </View>
          <Pressable accessibilityRole="button" onPress={onShare} style={s.btnOutline}>
            <Text style={s.btnOutlineLabel}>Share</Text>
          </Pressable>
        </View>
        <View style={s.bigStatGrid}>
          <BigStat
            label="SOL Earned"
            value={`${earnedSol >= 0 ? '+' : ''}${earnedSol.toFixed(4)}`}
            sub={solPrice > 0 ? `≈ $${(earnedSol * solPrice).toFixed(2)}` : undefined}
            tone={earnedSol >= 0 ? brand.success : brand.warning}
          />
          <BigStat label="ROI" value={`${roi.toFixed(2)}%`} tone={roi >= 0 ? brand.success : brand.warning} />
          <BigStat label="USDC Earned" value={`${pendingUsdc.toFixed(2)} USDC`} tone={pendingUsdc >= 0 ? brand.success : brand.warning} />
        </View>
        <View style={s.factBlock}>
          <FactRow label="SOL Managed" value={`${managedSol} SOL`} />
          <FactRow label="Days Held" value={daysHeld.toFixed(1)} />
        </View>
      </View>

      <View style={s.card}>
        <View style={s.spreadRow}>
          <Text style={s.cardTitle}>Realized Yield</Text>
          <View style={s.rowL}>
            {(['SOL', 'USD'] as const).map((v) => (
              <Pressable
                key={v}
                onPress={() => setYieldView(v)}
                style={[s.viewPill, yieldView === v && s.viewPillActive]}
              >
                <Text style={[s.muted12, yieldView === v && { color: dark.background }]}>{v}</Text>
              </Pressable>
            ))}
          </View>
        </View>
        {yieldSeries.length >= 2 ? (
          <Svg width="100%" height={110} viewBox="0 0 100 40" preserveAspectRatio="none">
            <Polyline
              points={toLine(yieldSeries) ?? ''}
              fill="none"
              stroke={yieldView === 'SOL' ? '#9945FF' : '#5B9DF9'}
              strokeWidth={0.7}
              strokeLinejoin="round"
            />
          </Svg>
        ) : (
          <Text style={[s.muted, { paddingVertical: 30, textAlign: 'center' }]}>No data yet.</Text>
        )}
      </View>

      <View style={s.card}>
        <View style={s.spreadRow}>
          <Text style={s.cardTitle}>Claim Yield</Text>
          <Text style={s.muted12}>Mode {tierMeta.label}</Text>
        </View>
        <View style={s.claimBox}>
          <View style={s.spreadRow}>
            <Text style={s.muted}>Claimable yield</Text>
            <Text style={s.muted}>Net (after 11% fee)</Text>
          </View>
          <View style={s.spreadRow}>
            <View style={s.rowL}>
              <Image source={require('../../../assets/images/solana-logo.png')} style={s.solTokenSm} />
              <Text style={s.factValue}>SOL</Text>
            </View>
            <Text style={s.claimValue}>{claimableNet.toFixed(6)}</Text>
          </View>
          <Text style={s.muted12}>Ready to claim to your Thaler wallet</Text>
        </View>
        {cp ? (
          <>
            <Text style={s.eyebrow}>YIELD BREAKDOWN</Text>
            <FactRow
              label="SOL Earned"
              value={`${earnedSol >= 0 ? '+' : ''}${earnedSol.toFixed(6)} SOL`}
              valueColor={brand.success}
            />
            <FactRow label="USDC Earned" value={`${pendingUsdc.toFixed(2)} USDC`} valueColor={brand.success} />
            <FactRow
              label="Generated (total)"
              value={`${(Number(cp.grossClaimableLamports ?? 0) / LAMPORTS).toFixed(6)} SOL`}
              valueColor={brand.success}
            />
            <FactRow
              label="Claimable now (net of fee)"
              value={`${(Number(cp.releasableNowNetLamports ?? cp.netUserYieldLamports ?? 0) / LAMPORTS).toFixed(6)} SOL`}
              valueColor={brand.success}
            />
            <Text style={s.eyebrow}>FUNDING + SCALPS (PERP)</Text>
            <FactRow
              label="Funding received (lifetime)"
              value={`${Number(cp.fundingReceivedSol?.sol ?? 0).toFixed(6)} SOL`}
            />
            <FactRow
              label="Funding paid (lifetime)"
              value={`${Number(cp.fundingPaidSol?.sol ?? 0).toFixed(6)} SOL`}
            />
            <FactRow
              label="Realized, pending swap to SOL"
              value={`${pendingUsdc.toFixed(2)} USDC`}
            />
            <Text style={s.eyebrow}>CARRY (KAMINO MULTIPLY)</Text>
            <FactRow
              label="Carry (autocompounded)"
              value={`${Number(cp.carryAutocompoundedSol?.sol ?? 0).toFixed(6)} SOL`}
            />
            <Text style={s.eyebrow}>LIQUIDITY POOL (JITOSOL/SOL)</Text>
            <FactRow
              label="LP Fees (autocompounded)"
              value={`${Number(cp.lpFeesAutocompoundedSol?.sol ?? 0).toFixed(6)} SOL`}
            />
          </>
        ) : null}
        <Pressable
          accessibilityRole="button"
          disabled={claim.isPending || claimableNet <= 0}
          onPress={() => claim.mutate()}
          style={[s.btnPrimary, (claim.isPending || claimableNet <= 0) && { opacity: 0.5 }]}
        >
          <Text style={s.btnPrimaryLabel}>{claim.isPending ? 'Claiming…' : 'Claim yield'}</Text>
        </Pressable>
        {claimNote ? <Text style={[s.muted12, { marginTop: 8 }]}>{claimNote}</Text> : null}
      </View>
    </>
  );
}

function LiquidationCard({ vault, pos, solPrice }: { vault: VaultRow | null; pos: VaultPositions | undefined; solPrice: number }) {
  if (!vault) {
    return (
      <View style={s.card}>
        <Text style={s.cardTitle}>Your Risk Summary</Text>
        <Text style={s.muted}>No vaults yet</Text>
      </View>
    );
  }
  const p = pos as unknown as
    | { equityNavLamports?: string; realizedYieldLamports?: string | null; pendingRecycleUsd?: number | null; apyBps?: number; activeUpsideBorrowCount?: number; positions?: { kaminoMultiply?: { netCarryApyBps?: number } | null } }
    | undefined;
  const depositSol = Number(vault.equityLamports) / LAMPORTS;
  const realizedSol =
    p?.realizedYieldLamports != null ? Number(p.realizedYieldLamports) / LAMPORTS : 0;
  const roi = depositSol > 0 ? (realizedSol / depositSol) * 100 : 0;
  const pendingUsd = p?.pendingRecycleUsd ?? 0;
  const netValueSol =
    (p?.equityNavLamports ? Number(p.equityNavLamports) / LAMPORTS : Number(vault.equityLamports) / LAMPORTS) +
    (solPrice > 0 && pendingUsd > 0 ? pendingUsd / solPrice : 0);
  const carryBps = p?.positions?.kaminoMultiply?.netCarryApyBps;
  const vaultHealth = carryBps == null ? null : carryBps > 100 ? 'SAFE' : carryBps >= 0 ? 'CAUTION' : 'STRESS';
  const borrows = p?.activeUpsideBorrowCount;
  const shortHedge = borrows == null ? null : borrows <= 0 ? 'SAFE' : borrows === 1 ? 'CAUTION' : 'STRESS';
  const tone = (v: string | null) => (v === 'SAFE' ? brand.success : v == null ? dark.mutedForeground : brand.warning);
  return (
    <View style={s.card}>
      <Text style={s.cardTitle}>Your Risk Summary</Text>
      <View style={s.factBlock}>
        <FactRow label="ROI" value={`${roi.toFixed(2)}%`} valueColor={roi >= 0 ? brand.success : brand.warning} />
        <FactRow label="Net Value" value={`${Number.isFinite(netValueSol) ? netValueSol.toFixed(4) : '0.0000'} SOL`} />
        <FactRow label="Vault Health" value={vaultHealth ?? '-'} valueColor={tone(vaultHealth)} />
        <FactRow label="Short Hedge" value={shortHedge ?? '-'} valueColor={tone(shortHedge)} />
      </View>
      <Text style={s.para}>
        The position is delta-neutral, so liquidation risk is driven by the SOL borrow rate
        relative to the staking carry rather than SOL price. The position is actively rebalanced
        to keep a wide safety margin away from the liquidation threshold.
      </Text>
    </View>
  );
}

function rel(ts: number): string {
  const d = Date.now() - ts;
  const h = Math.floor(d / 3_600_000);
  if (h < 1) return `${Math.max(1, Math.floor(d / 60_000))}m ago`;
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function TierTransactions({ vaults }: { vaults: VaultRow[] }) {
  const rows = vaults
    .flatMap((v) => {
      const out = [
        {
          id: `open-${v.id}`,
          type: 'Open Vault',
          amount: Number(v.equityLamports) / LAMPORTS,
          ts: new Date(v.createdAt).getTime(),
        },
      ];
      if (v.latestClose) {
        out.push({
          id: `close-${v.id}`,
          type: 'Close Vault',
          amount: Number(v.equityLamports) / LAMPORTS,
          ts: new Date(v.updatedAt).getTime(),
        });
      }
      if (v.latestClaim) {
        out.push({
          id: `claim-${v.id}`,
          type: 'Claim Yield',
          amount: v.latestClaim.amountLamports
            ? Number(v.latestClaim.amountLamports) / LAMPORTS
            : NaN,
          ts: new Date(v.updatedAt).getTime(),
        });
      }
      return out;
    })
    .sort((a, b) => b.ts - a.ts);
  return (
    <View style={s.card}>
      <Text style={s.cardTitle}>Transaction History</Text>
      <View style={[s.tableHead, { paddingHorizontal: 0 }]}>
        <Text style={[s.tableHeadCell, { flex: 1.4 }]}>Date</Text>
        <Text style={[s.tableHeadCell, { flex: 1 }]}>Type</Text>
        <Text style={[s.tableHeadCell, { flex: 1, textAlign: 'right' }]}>Tokens</Text>
      </View>
      {rows.map((r) => (
        <View key={r.id} style={s.txRow}>
          <Text style={[s.factValue, { flex: 1.4 }]}>{rel(r.ts)}</Text>
          <View style={{ flex: 1 }}>
            <View style={s.typeBadge}>
              <Text style={s.typeBadgeLabel}>{r.type}</Text>
            </View>
          </View>
          <View style={[s.rowL, { flex: 1, justifyContent: 'flex-end' }]}>
            <Text style={s.factValue}>{Number.isFinite(r.amount) ? r.amount.toFixed(2) : '-'}</Text>
            <Image source={require('../../../assets/images/solana-logo.png')} style={s.solTokenXs} />
          </View>
        </View>
      ))}
      {rows.length === 0 ? <Text style={[s.muted, { paddingVertical: 14 }]}>No activity yet.</Text> : null}
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: dark.background },
  scroll: { padding: spacing.base, gap: spacing.base },
  headRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: radius.md,
    borderColor: dark.border,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  solToken: { width: 36, height: 36, borderRadius: 18 },
  h1: { color: dark.foreground, fontSize: 24, fontWeight: '700', letterSpacing: -0.5, flexShrink: 1 },
  riskChip: { borderRadius: radius.full, paddingHorizontal: 10, paddingVertical: 4 },
  riskChipLabel: { fontSize: 11, fontWeight: '500' },
  headStats: { flexDirection: 'row', alignItems: 'center', gap: spacing.base },
  headStat: { gap: 2 },
  headStatValue: { color: dark.foreground, fontSize: 17, fontWeight: '600', fontVariant: ['tabular-nums'] },
  headDivider: { width: 1, height: 30, backgroundColor: dark.border },
  tabs: { flexDirection: 'row', gap: spacing.xl, borderBottomWidth: 1, borderBottomColor: dark.border },
  tab: { paddingBottom: 12, marginBottom: -1, borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabActive: { borderBottomColor: dark.foreground },
  tabLabel: { color: dark.mutedForeground, fontSize: 16, fontWeight: '600' },
  pillRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  subPill: {
    borderRadius: radius.full,
    paddingHorizontal: 16,
    paddingVertical: 9,
    backgroundColor: 'rgba(38,38,38,0.4)',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  subPillActive: { backgroundColor: dark.muted, borderColor: 'rgba(250,250,250,0.4)' },
  subPillLabel: { color: dark.mutedForeground, fontSize: 14, fontWeight: '500' },
  card: {
    backgroundColor: dark.card,
    borderColor: dark.border,
    borderWidth: 1,
    borderRadius: radius.xl + 2,
    padding: spacing.base,
    gap: spacing.md,
  },
  cardTitle: { color: dark.foreground, fontSize: 16, fontWeight: '600' },
  bigStatGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  bigStat: {
    flexGrow: 1,
    minWidth: '28%',
    backgroundColor: 'rgba(38,38,38,0.1)',
    borderColor: dark.border,
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: 12,
    gap: 6,
  },
  bigStatRow: { flexDirection: 'row', alignItems: 'baseline', gap: 6 },
  bigStatValue: { color: dark.foreground, fontSize: 19, fontWeight: '600', fontVariant: ['tabular-nums'] },
  factBlock: { borderTopColor: dark.border, borderTopWidth: 1, paddingTop: spacing.base, gap: 12 },
  factRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  factValue: { color: dark.foreground, fontSize: 14, fontWeight: '500' },
  muted: { color: dark.mutedForeground, fontSize: 13 },
  muted12: { color: dark.mutedForeground, fontSize: 12 },
  para: { color: dark.mutedForeground, fontSize: 14, lineHeight: 21 },
  legendRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  list: {
    backgroundColor: dark.card,
    borderColor: dark.border,
    borderWidth: 1,
    borderRadius: radius.xl + 2,
    overflow: 'hidden',
  },
  tableHead: { flexDirection: 'row', borderBottomColor: dark.border, borderBottomWidth: 1, paddingVertical: 10 },
  tableHeadCell: { color: dark.mutedForeground, fontSize: 10, letterSpacing: 1, fontWeight: '600', flex: 1 },
  tableRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 13 },
  rowPad: { paddingHorizontal: spacing.base },
  rowBorder: { borderTopColor: dark.border, borderTopWidth: 1 },
  rowL: { flexDirection: 'row', alignItems: 'center', gap: 10, flexShrink: 1 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  cell: { color: dark.foreground, fontSize: 12, fontVariant: ['tabular-nums'], flex: 1, textAlign: 'right' },
  cellFixed: { color: dark.foreground, fontSize: 12, fontVariant: ['tabular-nums'] },
  headBtn: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  sortMark: { color: dark.mutedForeground, fontSize: 8 },
  h3: { color: dark.foreground, fontSize: 15, fontWeight: '600' },
  showMore: { color: dark.foreground, fontSize: 14, fontWeight: '500' },
  eyebrow: { color: dark.mutedForeground, fontSize: 10, letterSpacing: 1.4, fontWeight: '600', marginTop: 4 },
  viewPill: { borderRadius: radius.md, paddingHorizontal: 10, paddingVertical: 4 },
  viewPillActive: { backgroundColor: dark.foreground },
  txRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10 },
  typeBadge: {
    backgroundColor: 'rgba(34,197,94,0.1)',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    alignSelf: 'flex-start',
  },
  typeBadgeLabel: { color: brand.success, fontSize: 11, fontWeight: '500' },
  solTokenXs: { width: 16, height: 16, borderRadius: 8 },
  spreadRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 },
  badge: { borderRadius: radius.md, paddingHorizontal: 8, paddingVertical: 3 },
  badgeError: { backgroundColor: 'rgba(239,68,68,0.12)' },
  badgeMuted: { backgroundColor: dark.muted },
  badgeLabel: { color: dark.mutedForeground, fontSize: 11, fontWeight: '600' },
  actionRow: { flexDirection: 'row', justifyContent: 'flex-end', gap: spacing.sm },
  btnPrimary: {
    backgroundColor: dark.foreground,
    borderRadius: radius.lg,
    paddingHorizontal: 16,
    paddingVertical: 10,
    alignItems: 'center',
  },
  btnPrimaryLabel: { color: dark.background, fontSize: 14, fontWeight: '600' },
  btnDestructive: {
    backgroundColor: 'rgba(239,68,68,0.12)',
    borderRadius: radius.lg,
    paddingHorizontal: 16,
    paddingVertical: 10,
    alignItems: 'center',
  },
  btnDestructiveLabel: { color: brand.error, fontSize: 14, fontWeight: '600' },
  btnOutline: {
    borderColor: dark.border,
    borderWidth: 1,
    borderRadius: radius.lg,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  btnOutlineLabel: { color: dark.foreground, fontSize: 13, fontWeight: '500' },
  claimBox: {
    backgroundColor: 'rgba(38,38,38,0.3)',
    borderColor: dark.border,
    borderWidth: 1,
    borderRadius: radius.xl,
    padding: spacing.base,
    gap: 10,
  },
  claimValue: { color: brand.success, fontSize: 24, fontWeight: '600', fontVariant: ['tabular-nums'] },
  solTokenSm: { width: 22, height: 22, borderRadius: 11 },
});
