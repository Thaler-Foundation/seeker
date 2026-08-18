// Create: staged deposit flow, per tier amount, 0.06 SOL reserve.

import { useEffect, useState } from 'react';
import { View, Text, Image, ScrollView, Pressable, StyleSheet, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useMutation, useQuery } from '@tanstack/react-query';
import { fetchThaler, endpoints, type PublicStats } from '@/lib/api';
import {
  TIER_ORDER,
  minDepositSol,
  maxDepositSol,
  isDepositWithinBounds,
  type Tier,
} from '@/lib/contracts';
import { useAuth } from '@/lib/auth';
import { dark, tier, brand, radius, spacing } from '@/theme/tokens';
import { TermsModal } from '@/components/terms-modal';

const RESERVE_SOL = 0.06;

const TIER_LABEL: Record<Tier, string> = {
  safe: 'Safe',
  conservative: 'Conservative',
  balanced: 'Balanced',
  optimistic: 'Optimistic',
  aggressive: 'Aggressive',
  yolo: 'YOLO',
};

const TIER_APR: Record<Tier, { min: number; max: number }> = {
  safe: { min: 8.2, max: 13.8 },
  conservative: { min: 8.4, max: 14.1 },
  balanced: { min: 8.7, max: 14.8 },
  optimistic: { min: 9.1, max: 15.6 },
  aggressive: { min: 9.6, max: 17.2 },
  yolo: { min: 10.2, max: 19.8 },
};

const STEP_LABELS: Record<string, string> = {
  kamino_lut_setup: 'Waking up the devs',
  stake_initial: 'Sending Raposas to validators',
  multiply_deposit: 'Getting those liquid tokens',
  extra_borrow: 'Hoolah-looping through defi',
  stake_tail: 'Unbalding Murt ...',
  kliquidity_deposit: 'Pressing some buttons onchain',
  kliquidity_stake_farm: 'Planting your liquidity seeds',
  perp_open_short: 'Hedging like a boomer, congrats!',
};

type PreviewResponse = {
  finalState?: { collateralSol?: number; debtSol?: number };
  perpPlan?: { notionalSol?: number };
};
type CreateWalletsResponse = { pairId: string };
type BalanceResponse = { address: string; lamports: string };
type OpenResponse = { executionId: string };
type StateResponse = {
  execution: { state: string };
  steps: { kind: string; state: string }[];
};

type Stage = 'configure' | 'fund' | 'open';

export default function Create() {
  const router = useRouter();
  const { getToken, authenticated } = useAuth();
  const [stage, setStage] = useState<Stage>('configure');
  const [pairId, setPairId] = useState<string | null>(null);
  const [executionId, setExecutionId] = useState<string | null>(null);
  const [termsOpen, setTermsOpen] = useState(false);
  const [selectedTier, setSelectedTier] = useState<Tier>('safe');
  const [amount, setAmount] = useState(String(minDepositSol('safe')));

  const minSol = minDepositSol(selectedTier);
  const maxSol = maxDepositSol(selectedTier);
  const depositSol = parseFloat(amount) || 0;
  const withinBounds = isDepositWithinBounds(selectedTier, depositSol);
  const equityLamports = String(Math.round(depositSol * 1_000_000_000));

  // Switching tier resets the amount to that tier's minimum, like the web panel.
  const pickTier = (t: Tier) => {
    setSelectedTier(t);
    setAmount(String(minDepositSol(t)));
  };

  const pub = useQuery({
    queryKey: ['public-stats'],
    queryFn: () => fetchThaler<PublicStats>(null, endpoints.publicStats),
    staleTime: 30_000,
  });
  const usd = pub.data?.ok ? depositSol * pub.data.solPriceUsd : 0;

  const preview = useQuery({
    queryKey: ['vault-preview', equityLamports, selectedTier],
    queryFn: async () =>
      fetchThaler<PreviewResponse>(
        await getToken(),
        endpoints.vaultPreview(equityLamports, selectedTier)
      ),
    enabled: authenticated && withinBounds,
    staleTime: 30_000,
  });

  const createWallets = useMutation({
    mutationFn: async () =>
      fetchThaler<CreateWalletsResponse>(await getToken(), endpoints.vaultWallets, {
        method: 'POST',
        body: JSON.stringify({ perpVenue: 'pacifica' }),
      }),
    onSuccess: (r) => {
      setPairId(r.pairId);
      setStage('fund');
    },
  });

  const balance = useQuery({
    queryKey: ['dual-balance'],
    queryFn: async () =>
      fetchThaler<BalanceResponse>(await getToken(), endpoints.dualWalletBalance),
    enabled: authenticated && stage === 'fund',
    refetchInterval: 5000,
  });
  const requiredLamports = depositSol * 1e9 + RESERVE_SOL * 1e9;
  const currentLamports = Number(balance.data?.lamports ?? '0');
  const funded = currentLamports >= requiredLamports;

  const openVault = useMutation({
    mutationFn: async () =>
      fetchThaler<OpenResponse>(await getToken(), endpoints.vaults, {
        method: 'POST',
        body: JSON.stringify({ pairId, equityLamports, tier: selectedTier }),
      }),
    onSuccess: (r) => {
      setExecutionId(r.executionId);
      setStage('open');
    },
  });

  const openState = useQuery({
    queryKey: ['vault-state', executionId],
    queryFn: async () =>
      fetchThaler<StateResponse>(await getToken(), endpoints.vaultState(executionId!)),
    enabled: authenticated && stage === 'open' && executionId !== null,
    refetchInterval: (q) => {
      const s = q.state.data?.execution.state;
      return s === 'DONE' || s === 'FAILED' || s === 'DISMANTLED' ? false : 3000;
    },
  });

  const doneCount = openState.data?.steps.filter((s) => s.state === 'DONE').length ?? 0;
  const totalSteps = openState.data?.steps.length || 8;
  const pendingSteps = Object.keys(STEP_LABELS).map((kind) => ({ kind, state: 'PENDING' }));

  // vault built: show the live line briefly, then go to the portfolio tab like web.
  const executionState = openState.data?.execution.state;
  useEffect(() => {
    if (executionState !== 'DONE') return;
    const t = setTimeout(() => {
      router.push('/portfolio');
      setStage('configure');
      setPairId(null);
      setExecutionId(null);
    }, 1500);
    return () => clearTimeout(t);
  }, [executionState, router]);

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.h1}>Create vault.</Text>
        {!authenticated ? <Text style={styles.hint}>Sign in to create a vault.</Text> : null}

        {stage === 'configure' ? (
          <View style={styles.panel}>
            <View style={styles.rowBetween}>
              <Text style={styles.panelTitle}>Create Vault</Text>
              <View style={styles.chip}>
                <Text style={styles.chipLabel}>{TIER_LABEL[selectedTier]}</Text>
              </View>
            </View>
            <Text style={styles.eyebrow}>RISK PROFILE</Text>
            <View style={styles.tierPicker}>
              {TIER_ORDER.map((t) => (
                <Pressable
                  key={t}
                  accessibilityRole="button"
                  onPress={() => pickTier(t)}
                  style={[
                    styles.tierChip,
                    selectedTier === t && { borderColor: tier[t], backgroundColor: `${tier[t]}22` },
                  ]}
                >
                  <Text
                    style={[styles.tierChipLabel, selectedTier === t && { color: tier[t] }]}
                  >
                    {TIER_LABEL[t]}
                  </Text>
                </Pressable>
              ))}
            </View>
            <View style={styles.depositBox}>
              <View style={styles.rowBetween}>
                <Text style={styles.mutedSm}>Vault size</Text>
                <Text style={styles.mutedSm}>{usd > 0 ? `~$${usd.toFixed(2)}` : '-'}</Text>
              </View>
              <View style={styles.rowBetween}>
                <View style={styles.solRow}>
                  <Image
                    source={require('../../../assets/images/solana-logo.png')}
                    style={styles.solLogo}
                  />
                  <Text style={styles.sol}>SOL</Text>
                </View>
                <TextInput
                  value={amount}
                  onChangeText={setAmount}
                  keyboardType="decimal-pad"
                  inputMode="decimal"
                  accessibilityLabel="Deposit amount in SOL"
                  selectTextOnFocus
                  style={styles.amountInput}
                  placeholder={String(minSol)}
                  placeholderTextColor={dark.mutedForeground}
                />
              </View>
              <Text style={[styles.mutedSm, !withinBounds && { color: brand.error }]}>
                {`${TIER_LABEL[selectedTier]} tier accepts ${minSol} to ${maxSol} SOL`}
              </Text>
            </View>
            <Text style={styles.eyebrow}>WHERE YOUR SOL GOES</Text>
            <Text style={styles.prose}>
              Your SOL is staked into jitoSOL, supplied to Kamino Lend, paired with a Kamino
              liquidity tail, and hedged with a short position on Pacifica, all kept delta-neutral
              so returns do not depend on the SOL price.
            </Text>
            <View style={styles.miniRows}>
              <MiniRow
                label="Projected APR (net)"
                value={`${TIER_APR[selectedTier].min}% to ${TIER_APR[selectedTier].max}%`}
                tone={brand.success}
              />
              <MiniRow
                label="Projected Earnings (annual)"
                value={
                  preview.isLoading && authenticated
                    ? '...'
                    : `+${((depositSol * TIER_APR[selectedTier].min) / 100).toFixed(2)} to ${(
                        (depositSol * TIER_APR[selectedTier].max) /
                        100
                      ).toFixed(2)} SOL`
                }
                tone={brand.success}
              />
              <MiniRow label="Service Fee" value="11% (on yield)" />
              <MiniRow label="Vault Creation Fee" value={`${RESERVE_SOL} SOL reserve`} />
            </View>
            <Pressable
              accessibilityRole="button"
              disabled={!authenticated || !withinBounds || createWallets.isPending}
              onPress={() => setTermsOpen(true)}
              style={({ pressed }) => [
                styles.cta,
                (!authenticated || !withinBounds || createWallets.isPending) && { opacity: 0.5 },
                pressed && { opacity: 0.9 },
              ]}
            >
              <Text style={styles.ctaLabel}>
                {createWallets.isPending ? 'Preparing...' : `Open Vault · ${depositSol} SOL`}
              </Text>
            </Pressable>
          </View>
        ) : null}

        {stage === 'fund' ? (
          <View style={styles.panel}>
            {funded ? (
              <>
                <Text style={styles.panelTitle}>Ready to open your vault</Text>
                <Text style={styles.mutedSm}>
                  Your wallet has enough SOL. Review the breakdown below before proceeding.
                </Text>
                <Text style={styles.eyebrow}>ON VAULT OPEN</Text>
                <View style={styles.miniRows}>
                  <MiniRow
                    label="Thaler Wallet Balance"
                    value={`${(currentLamports / 1e9).toFixed(4)} SOL`}
                  />
                  <MiniRow label="Deployed to strategy" value={`${depositSol.toFixed(2)} SOL`} />
                  <MiniRow
                    label="Fee reserve (one-time)"
                    value={`${RESERVE_SOL.toFixed(2)} SOL`}
                  />
                  {currentLamports > requiredLamports ? (
                    <MiniRow
                      label="Stays in your Thaler wallet"
                      value={`~${((currentLamports - requiredLamports) / 1e9).toFixed(4)} SOL`}
                    />
                  ) : null}
                </View>
              </>
            ) : (
              <>
                <Text style={styles.panelTitle}>Fund Your Vault Wallet</Text>
                <Text style={styles.mutedSm}>
                  Each vault gets its own dedicated wallet, not a shared pool. Your worker manages
                  this wallet exclusively on your behalf.
                </Text>
                <Text style={styles.eyebrow}>SEND EXACTLY</Text>
                <Text style={styles.amount}>{`${(requiredLamports / 1e9).toFixed(2)} SOL`}</Text>
                <View style={styles.miniRows}>
                  <MiniRow label="Vault equity" value={`${depositSol.toFixed(2)} SOL`} />
                  <MiniRow
                    label="Fee reserve (network + setup)"
                    value={`${RESERVE_SOL.toFixed(2)} SOL`}
                  />
                </View>
                <Text style={styles.mutedSm}>Send to your Thaler wallet</Text>
                <Text style={styles.mono}>{balance.data?.address ?? '...'}</Text>
                <View style={styles.miniRows}>
                  <MiniRow
                    label="Balance received"
                    value={`${(currentLamports / 1e9).toFixed(2)} / ${(
                      requiredLamports / 1e9
                    ).toFixed(2)} SOL`}
                  />
                </View>
                <View style={styles.track}>
                  <View
                    style={[
                      styles.fill,
                      { width: `${Math.min(100, (currentLamports / requiredLamports) * 100)}%` },
                    ]}
                  />
                </View>
                <Text style={styles.mutedSm}>
                  {`Waiting for funds. The Open Vault button unlocks once your balance reaches ${(
                    requiredLamports / 1e9
                  ).toFixed(2)} SOL`}
                </Text>
              </>
            )}
            <Pressable
              accessibilityRole="button"
              disabled={!funded || openVault.isPending}
              onPress={() => openVault.mutate()}
              style={({ pressed }) => [
                styles.cta,
                (!funded || openVault.isPending) && { opacity: 0.5 },
                pressed && { opacity: 0.9 },
              ]}
            >
              <Text style={styles.ctaLabel}>
                {openVault.isPending ? 'Opening...' : 'Open vault'}
              </Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              disabled={openVault.isPending}
              onPress={() => setStage('configure')}
              style={styles.backBtn}
            >
              <Text style={styles.backLabel}>Back</Text>
            </Pressable>
          </View>
        ) : null}

        {stage === 'open' ? (
          <View style={styles.panel}>
            <Text style={styles.panelTitle}>Creating your vault</Text>
            <Text style={styles.mutedSm}>{`${doneCount} of ${totalSteps} steps complete`}</Text>
            <View style={styles.steps}>
              {(openState.data?.steps ?? pendingSteps).map((s) => (
                <View key={s.kind} style={styles.stepRow}>
                  <Text
                    style={[
                      styles.stepDot,
                      s.state === 'DONE'
                        ? { color: brand.success }
                        : s.state === 'FAILED'
                          ? { color: brand.error }
                          : { color: dark.mutedForeground },
                    ]}
                  >
                    {s.state === 'DONE' ? 'OK' : s.state === 'FAILED' ? 'X' : '.'}
                  </Text>
                  <Text
                    style={[
                      styles.stepLabel,
                      s.state === 'PENDING' && { color: dark.mutedForeground },
                    ]}
                  >
                    {STEP_LABELS[s.kind] ?? s.kind.replace(/_/g, ' ')}
                  </Text>
                </View>
              ))}
            </View>
            {openState.data?.execution.state === 'DONE' ? (
              <Text style={[styles.mutedSm, { color: brand.success }]}>Your vault is live.</Text>
            ) : null}
            {openState.data?.execution.state === 'FAILED' ? (
              <Text style={[styles.mutedSm, { color: brand.error }]}>
                A step did not complete.
              </Text>
            ) : null}
          </View>
        ) : null}
      </ScrollView>
      <TermsModal
        open={termsOpen}
        onClose={() => setTermsOpen(false)}
        onAccept={() => {
          setTermsOpen(false);
          createWallets.mutate();
        }}
      />
    </SafeAreaView>
  );
}

function MiniRow({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <View style={styles.rowBetween}>
      <Text style={styles.mutedSm}>{label}</Text>
      <Text style={[styles.mono, tone ? { color: tone } : null]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: dark.background },
  scroll: { padding: spacing.base, gap: spacing.base },
  h1: { color: dark.foreground, fontSize: 30, fontWeight: '700', letterSpacing: -0.6 },
  hint: { color: dark.mutedForeground, fontSize: 13 },
  panel: {
    backgroundColor: dark.card,
    borderColor: dark.border,
    borderWidth: 1,
    borderRadius: radius.xl,
    padding: spacing.lg,
    gap: spacing.md,
  },
  panelTitle: { color: dark.foreground, fontSize: 17, fontWeight: '600' },
  chip: {
    backgroundColor: 'rgba(153,187,255,0.12)',
    borderRadius: radius.full,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  chipLabel: { color: tier.safe, fontSize: 11, fontWeight: '500' },
  depositBox: {
    backgroundColor: 'rgba(38,38,38,0.3)',
    borderColor: dark.border,
    borderWidth: 1,
    borderRadius: radius.xl,
    padding: spacing.base,
    gap: spacing.md,
  },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  mutedSm: { color: dark.mutedForeground, fontSize: 13 },
  sol: { color: dark.foreground, fontSize: 16, fontWeight: '600' },
  solRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  solLogo: { width: 26, height: 26, borderRadius: 13 },
  amount: {
    color: dark.foreground,
    fontSize: 28,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
  amountInput: {
    color: dark.foreground,
    fontSize: 30,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
    textAlign: 'right',
    minWidth: 120,
    padding: 0,
  },
  tierPicker: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  tierChip: {
    borderColor: dark.border,
    borderWidth: 1,
    borderRadius: radius.full,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  tierChipLabel: { color: dark.mutedForeground, fontSize: 12, fontWeight: '600' },
  eyebrow: { color: dark.mutedForeground, fontSize: 10, letterSpacing: 1.4, fontWeight: '600' },
  prose: { color: dark.mutedForeground, fontSize: 13, lineHeight: 19 },
  miniRows: { gap: 8, borderTopColor: dark.border, borderTopWidth: 1, paddingTop: spacing.md },
  mono: { color: dark.foreground, fontSize: 13, fontVariant: ['tabular-nums'] },
  cta: {
    backgroundColor: dark.foreground,
    borderRadius: radius.xl,
    paddingVertical: 14,
    alignItems: 'center',
  },
  ctaLabel: { color: dark.background, fontSize: 16, fontWeight: '600' },
  backBtn: { alignItems: 'center', paddingVertical: 4 },
  backLabel: { color: dark.mutedForeground, fontSize: 13 },
  track: { height: 8, borderRadius: 4, backgroundColor: dark.muted, overflow: 'hidden' },
  fill: { height: 8, backgroundColor: brand.success },
  steps: { gap: 2 },
  stepRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8 },
  stepDot: { fontSize: 12, width: 22, fontWeight: '700' },
  stepLabel: { color: dark.foreground, fontSize: 14 },
});
