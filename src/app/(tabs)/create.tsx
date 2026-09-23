import { SidebarTrigger } from '@/components/sidebar/sidebar-trigger';
import { TermsModal } from '@/components/terms-modal';
import { endpoints, fetchThaler, type PublicStats } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import {
  OPEN_FEE_BUFFER_SOL,
  TIER_ORDER,
  isDepositWithinBounds,
  maxDepositSol,
  minDepositSol,
  type Tier,
} from '@/lib/contracts';
import { brand, dark, dock, glass, radius, spacing, tier } from '@/theme/tokens';
import { typography } from '@/theme/typography';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';

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
  openFeeBufferLamports?: string;
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
  const [selectedTier, setSelectedTier] = useState<Tier | null>(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const triggerRef = useRef<View>(null);
  const [dropdownCoords, setDropdownCoords] = useState<{
    x: number;
    y: number;
    width: number;
  } | null>(null);
  const [amount, setAmount] = useState('');
  const [actionError, setActionError] = useState<string | null>(null);

  const toggleDropdown = () => {
    if (dropdownOpen) {
      setDropdownOpen(false);
    } else {
      triggerRef.current?.measureInWindow((x, y, width, height) => {
        setDropdownCoords({ x, y: y + height, width });
        setDropdownOpen(true);
      });
    }
  };

  const minSol = selectedTier ? minDepositSol(selectedTier) : 1;
  const maxSol = selectedTier ? maxDepositSol(selectedTier) : 100;
  const depositSol = parseFloat(amount) || 0;
  const withinBounds = Boolean(selectedTier && isDepositWithinBounds(selectedTier, depositSol));
  const equityLamports = String(Math.round(depositSol * 1_000_000_000));

  const pickTier = (t: Tier) => {
    setSelectedTier(t);
    setDropdownOpen(false);
    if (!amount || parseFloat(amount) <= 0) {
      setAmount(String(minDepositSol(t)));
    }
  };

  const pub = useQuery({
    queryKey: ['public-stats'],
    queryFn: () => fetchThaler<PublicStats>(null, endpoints.publicStats),
    staleTime: 60_000,
  });
  const usd = pub.data?.ok ? depositSol * pub.data.solPriceUsd : 0;

  const preview = useQuery({
    queryKey: ['vault-preview', equityLamports, selectedTier],
    queryFn: async () =>
      selectedTier
        ? fetchThaler<PreviewResponse>(
            await getToken(),
            endpoints.vaultPreview(equityLamports, selectedTier)
          )
        : null,
    enabled: authenticated && Boolean(selectedTier) && withinBounds,
    staleTime: 30_000,
  });

  const createWallets = useMutation({
    mutationFn: async () =>
      fetchThaler<CreateWalletsResponse>(await getToken(), endpoints.vaultWallets, {
        method: 'POST',
        body: JSON.stringify({ perpVenue: 'pacifica' }),
      }),
    onMutate: () => setActionError(null),
    onSuccess: (r) => {
      setPairId(r.pairId);
      setStage('fund');
    },
    onError: (e) =>
      setActionError(e instanceof Error ? e.message : 'Could not create the vault wallet'),
  });

  const balance = useQuery({
    queryKey: ['dual-balance'],
    queryFn: async () =>
      fetchThaler<BalanceResponse>(await getToken(), endpoints.dualWalletBalance),
    enabled: authenticated && stage === 'fund',
    refetchInterval: 5000,
  });
  const reserveSol =
    Number(preview.data?.openFeeBufferLamports ?? OPEN_FEE_BUFFER_SOL * 1e9) / 1e9;
  const requiredLamports = depositSol * 1e9 + reserveSol * 1e9;
  const currentLamports = Number(balance.data?.lamports ?? '0');
  const funded = currentLamports >= requiredLamports;

  const openVault = useMutation({
    mutationFn: async () =>
      fetchThaler<OpenResponse>(await getToken(), endpoints.vaults, {
        method: 'POST',
        body: JSON.stringify({ pairId, equityLamports, tier: selectedTier }),
      }),
    onMutate: () => setActionError(null),
    onSuccess: (r) => {
      setExecutionId(r.executionId);
      setStage('open');
    },
    onError: (e) => setActionError(e instanceof Error ? e.message : 'Could not open the vault'),
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
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: dock.height + 40 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.headRow}>
          <View style={styles.headLeft}>
            <SidebarTrigger />
            <Text style={styles.h1}>Create Vault</Text>
          </View>
        </View>
        {!authenticated ? <Text style={styles.hint}>Sign in to create a vault.</Text> : null}

        {stage === 'configure' ? (
          <View style={styles.panel}>
            <View style={styles.rowBetween}>
              <Text style={styles.panelTitle}>Create Vault</Text>
              {selectedTier ? (
                <View
                  style={[
                    styles.chip,
                    {
                      backgroundColor: `${tier[selectedTier]}1c`,
                      borderColor: `${tier[selectedTier]}50`,
                      borderWidth: 1,
                    },
                  ]}
                >
                  <Text style={[styles.chipLabel, { color: tier[selectedTier] }]}>
                    {TIER_LABEL[selectedTier]}
                  </Text>
                </View>
              ) : (
                <View style={[styles.chip, { backgroundColor: 'rgba(255, 255, 255, 0.08)' }]}>
                  <Text style={[styles.chipLabel, { color: dark.mutedForeground }]}>Required</Text>
                </View>
              )}
            </View>

            <Text style={styles.eyebrow}>RISK PROFILE *</Text>
            
            <View ref={triggerRef} collapsable={false} style={styles.dropdownContainer}>
              <Pressable
                accessibilityRole="button"
                onPress={toggleDropdown}
                style={[
                  styles.dropdownTrigger,
                  dropdownOpen && styles.dropdownTriggerOpen,
                ]}
              >
                {selectedTier ? (
                  <View style={styles.dropdownSelectedRow}>
                    <View
                      style={[
                        styles.dot,
                        {
                          backgroundColor: tier[selectedTier],
                          width: 10,
                          height: 10,
                          borderRadius: 5,
                        },
                      ]}
                    />
                    <Text style={styles.dropdownSelectedText}>
                      {TIER_LABEL[selectedTier]} Vault ({TIER_APR[selectedTier].min}% - {TIER_APR[selectedTier].max}% APR)
                    </Text>
                  </View>
                ) : (
                  <Text style={styles.dropdownPlaceholder}>Select a risk profile...</Text>
                )}
                <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
                  <Path
                    d={dropdownOpen ? 'M18 15l-6-6-6 6' : 'M6 9l6 6 6-6'}
                    stroke={dark.mutedForeground}
                    strokeWidth={2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </Svg>
              </Pressable>
            </View>

            <Modal
              visible={dropdownOpen}
              transparent
              animationType="fade"
              onRequestClose={() => setDropdownOpen(false)}
            >
              <Pressable style={StyleSheet.absoluteFill} onPress={() => setDropdownOpen(false)} />
              {dropdownCoords && (
                <View
                  style={[
                    styles.dropdownMenu,
                    {
                      position: 'absolute',
                      top: dropdownCoords.y,
                      left: dropdownCoords.x,
                      width: dropdownCoords.width,
                    },
                  ]}
                >
                  {TIER_ORDER.map((t) => {
                    const isSelected = selectedTier === t;
                    return (
                      <Pressable
                        key={t}
                        accessibilityRole="button"
                        onPress={() => pickTier(t)}
                        style={[
                          styles.dropdownItem,
                          isSelected && { backgroundColor: `${tier[t]}18` },
                        ]}
                      >
                        <View style={styles.dropdownItemLeft}>
                          <View
                            style={[
                              styles.dot,
                              { backgroundColor: tier[t], width: 10, height: 10, borderRadius: 5 },
                            ]}
                          />
                          <View>
                            <Text
                              style={[
                                styles.dropdownItemTitle,
                                isSelected && { color: tier[t], fontWeight: '700' },
                              ]}
                            >
                              {TIER_LABEL[t]} Vault
                            </Text>
                            <Text style={styles.dropdownItemSub}>
                              {TIER_APR[t].min}% - {TIER_APR[t].max}% APR · {minDepositSol(t)} to {maxDepositSol(t)} SOL
                            </Text>
                          </View>
                        </View>
                        {isSelected && (
                          <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
                            <Path
                              d="M20 6L9 17l-5-5"
                              stroke={tier[t]}
                              strokeWidth={2.4}
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </Svg>
                        )}
                      </Pressable>
                    );
                  })}
                </View>
              )}
            </Modal>

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
                  placeholder={selectedTier ? String(minSol) : '0.0'}
                  placeholderTextColor={dark.mutedForeground}
                />
              </View>
              <Text style={[styles.mutedSm, selectedTier && !withinBounds && { color: brand.error }]}>
                {selectedTier
                  ? `${TIER_LABEL[selectedTier]} tier accepts ${minSol} to ${maxSol} SOL`
                  : 'Select a risk profile above to view deposit limits'}
              </Text>
            </View>
            <Text style={styles.eyebrow}>WHERE YOUR SOL GOES</Text>
            <Text style={styles.prose}>
              Your SOL is staked into jitoSOL, supplied to Kamino Lend, paired with a Kamino
              liquidity tail, and hedged with a short position on Pacifica, all kept delta-neutral
              so returns do not depend on the SOL price.
            </Text>
            {selectedTier && (
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
                <MiniRow label="Vault Creation Fee" value={`${reserveSol} SOL reserve`} />
              </View>
            )}
            <Pressable
              accessibilityRole="button"
              disabled={!authenticated || !selectedTier || !withinBounds || createWallets.isPending}
              onPress={() => setTermsOpen(true)}
              style={({ pressed }) => [
                styles.cta,
                (!authenticated || !selectedTier || !withinBounds || createWallets.isPending) && {
                  opacity: 0.45,
                },
                pressed && { opacity: 0.9 },
              ]}
            >
              <Text style={styles.ctaLabel}>
                {createWallets.isPending
                  ? 'Preparing...'
                  : !selectedTier
                    ? 'Select a Risk Profile'
                    : !withinBounds
                      ? `Deposit ${minSol} - ${maxSol} SOL`
                      : `Open Vault · ${depositSol} SOL`}
              </Text>
            </Pressable>
            {actionError ? (
              <Text style={[styles.mutedSm, { color: brand.error }]}>{actionError}</Text>
            ) : null}
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
                    value={`${reserveSol.toFixed(2)} SOL`}
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
                    value={`${reserveSol.toFixed(2)} SOL`}
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
            {actionError ? (
              <Text style={[styles.mutedSm, { color: brand.error }]}>{actionError}</Text>
            ) : null}
            <Pressable
              accessibilityRole="button"
              disabled={openVault.isPending}
              onPress={() => {
                setActionError(null);
                setStage('configure');
              }}
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
  panel: {
    backgroundColor: glass.bg,
    borderColor: glass.border,
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
  dot: { width: 10, height: 10, borderRadius: 5 },
  dropdownContainer: {
    position: 'relative',
    zIndex: 20,
  },
  dropdownTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    borderRadius: radius.lg,
    paddingHorizontal: 14,
    paddingVertical: 13,
  },
  dropdownTriggerOpen: {
    borderColor: 'rgba(255, 255, 255, 0.20)',
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
  },
  dropdownSelectedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  dropdownSelectedText: {
    color: dark.foreground,
    fontSize: 14,
    fontWeight: '600',
  },
  dropdownPlaceholder: {
    color: dark.mutedForeground,
    fontSize: 14,
  },
  dropdownMenu: {
    backgroundColor: '#16171a',
    borderColor: 'rgba(255, 255, 255, 0.20)',
    borderWidth: 1.5,
    borderTopWidth: 0,
    borderBottomLeftRadius: radius.lg,
    borderBottomRightRadius: radius.lg,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.6,
    shadowRadius: 16,
    elevation: 24,
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.06)',
  },
  dropdownItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  dropdownItemTitle: {
    color: dark.foreground,
    fontSize: 14,
    fontWeight: '600',
  },
  dropdownItemSub: {
    color: dark.mutedForeground,
    fontSize: 11,
    marginTop: 2,
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
