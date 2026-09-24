import { SidebarTrigger } from '@/components/sidebar/sidebar-trigger';
import { endpoints, fetchThaler, type ListVaultsResponse, type PublicStats } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { brand, dark, dock, glass, radius, spacing } from '@/theme/tokens';
import { fontFamilies, typography } from '@/theme/typography';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as Clipboard from 'expo-clipboard';
import { LinearGradient } from 'expo-linear-gradient';
import { useState, type ReactNode } from 'react';
import {
  Image,
  Linking,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import QRCode from 'react-native-qrcode-styled';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';

const LAMPORTS = 1e9;
const TIER_LABEL: Record<string, string> = {
  safe: 'Safe',
  conservative: 'Conservative',
  balanced: 'Balanced',
  optimistic: 'Optimistic',
  aggressive: 'Aggressive',
  yolo: 'YOLO',
};

type BalanceResponse = { address: string; lamports: string };
type WithdrawResponse = { transferredLamports: string; toAddress: string; signature: string };
type ExportedWallet = { kind: string; walletId: string; address: string; privateKey: string };
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

function shortAddr(a: string): string {
  return a.length > 12 ? `${a.slice(0, 4)}...${a.slice(-4)}` : a;
}

function solInputToLamports(input: string): string | null {
  const m = /^(\d+)(?:\.(\d{0,9}))?$/.exec(input.trim());
  if (!m) return null;
  const whole = m[1] ?? '0';
  const frac = (m[2] ?? '').padEnd(9, '0');
  const lamports = BigInt(whole) * 1_000_000_000n + BigInt(frac || '0');
  return lamports > 0n ? lamports.toString() : null;
}

function rel(ts: number): string {
  const d = Date.now() - ts;
  const h = Math.floor(d / 3_600_000);
  if (h < 1) return `${Math.max(1, Math.floor(d / 60_000))}m ago`;
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function SolMark() {
  return <Image source={require('../../../assets/images/solana-logo.png')} style={s.solMark} />;
}

export default function WalletScreen() {
  const { getToken, authenticated } = useAuth();
  const queryClient = useQueryClient();

  const [secondary, setSecondary] = useState<'balances' | 'positions' | 'activity'>('balances');
  const [section, setSection] = useState<'none' | 'withdraw' | 'export' | 'receive'>('none');
  const [copied, setCopied] = useState(false);

  const balance = useQuery({
    queryKey: ['dual-balance'],
    queryFn: async () =>
      fetchThaler<BalanceResponse>(await getToken(), endpoints.dualWalletBalance),
    enabled: authenticated,
    staleTime: 30_000,
  });

  const address = balance.data?.address ?? null;
  const lamports = BigInt(balance.data?.lamports ?? '0');
  const solBalance = Number(lamports) / LAMPORTS;

  const stats = useQuery({
    queryKey: ['public-stats'],
    queryFn: () => fetchThaler<PublicStats>(null, endpoints.publicStats),
    staleTime: 60_000,
  });
  const solPrice = stats.data?.ok ? stats.data.solPriceUsd : 0;

  const vaultsQ = useQuery({
    queryKey: ['vaults'],
    queryFn: async () =>
      fetchThaler<ListVaultsResponse>(await getToken(), endpoints.vaults),
    enabled: authenticated,
    staleTime: 60_000,
  });

  const triggersQ = useQuery({
    queryKey: ['triggers'],
    queryFn: async () =>
      fetchThaler<{ triggers: TriggerRow[] }>(await getToken(), endpoints.triggers).catch(() => ({
        triggers: [] as TriggerRow[],
      })),
    enabled: authenticated && secondary === 'activity',
    staleTime: 2 * 60_000,
  });

  const scalpsQ = useQuery({
    queryKey: ['scalps'],
    queryFn: async () =>
      fetchThaler<{ scalps: ScalpRow[] }>(await getToken(), endpoints.scalps).catch(() => ({
        scalps: [] as ScalpRow[],
      })),
    enabled: authenticated && secondary === 'activity',
    staleTime: 2 * 60_000,
  });

  const openVaults = (vaultsQ.data?.vaults ?? []).filter(
    (v) => v.state === 'DONE' && v.latestClose === null && v.metrics !== null
  );
  const vaultRows = openVaults.map((v) => {
    const sol = Number(v.equityLamports) / LAMPORTS;
    return {
      id: v.id,
      label: `${TIER_LABEL[v.tier ?? 'safe'] ?? 'Safe'} Vault`,
      sol,
      usd: sol * solPrice,
    };
  });
  const vaultsTotalSol = vaultRows.reduce((acc, r) => acc + r.sol, 0);

  const totalSol = solBalance + vaultsTotalSol;
  const totalUsd = totalSol * (solPrice > 0 ? solPrice : 0);

  const activity = (vaultsQ.data?.vaults ?? [])
    .flatMap((v) => {
      const label = `Thaler One · ${TIER_LABEL[v.tier ?? 'safe'] ?? 'Safe'}`;
      const sol = Number(v.equityLamports) / LAMPORTS;
      const out = [
        {
          id: `open-${v.id}`,
          title: 'Open Vault',
          sub: label,
          value: `${sol.toFixed(4)} SOL`,
          ts: new Date(v.createdAt).getTime(),
        },
      ];
      if (v.latestClose) {
        out.push({
          id: `close-${v.id}`,
          title: 'Close Vault',
          sub: label,
          value: `${sol.toFixed(4)} SOL`,
          ts: new Date(v.updatedAt).getTime(),
        });
      }
      if (v.latestClaim) {
        out.push({
          id: `claim-${v.id}`,
          title: 'Claim Yield',
          sub: label,
          value: v.latestClaim.amountLamports
            ? `${(Number(v.latestClaim.amountLamports) / LAMPORTS).toFixed(4)} SOL`
            : '-',
          ts: new Date(v.updatedAt).getTime(),
        });
      }
      return out;
    })
    .concat(
      (triggersQ.data?.triggers ?? [])
        .filter((t) => t.state === 'EXECUTED')
        .map((t) => ({
          id: `trig-${t.id}`,
          title: 'Upside Borrow',
          sub: `Step ${t.step}`,
          value: t.borrowSolEquivalent !== null ? `${t.borrowSolEquivalent.toFixed(4)} SOL` : '-',
          ts: t.executedAt ?? t.createdAt,
        })),
      (scalpsQ.data?.scalps ?? [])
        .filter((x) => x.state === 'EXECUTED')
        .map((x) => ({
          id: `scalp-${x.id}`,
          title: x.eventType === 'SCALP' ? 'Scalp' : 'Pre-Scalp',
          sub: x.positionCoin ?? 'SOL',
          value: x.profitUsd !== null ? `${x.profitUsd.toFixed(4)} SOL` : '-',
          ts: x.executedAt ?? x.createdAt,
        }))
    )
    .sort((a, b) => b.ts - a.ts)
    .map((r) => ({ ...r, sub: `${r.sub} · ${rel(r.ts)}` }));

  const onCopy = async () => {
    if (!address) return;
    await Clipboard.setStringAsync(address);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <SafeAreaView style={s.root} edges={['top']}>
      <ScrollView
        contentContainerStyle={[s.scroll, { paddingBottom: dock.height + 40 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={s.header}>
          <SidebarTrigger />
          <Text style={s.headerTitle}>Wallet</Text>
          <View style={s.networkChip}>
            <View style={s.netDot} />
            <Text style={s.netText}>Mainnet</Text>
          </View>
        </View>

        <View style={s.heroCard}>
          <LinearGradient
            colors={['rgba(255, 255, 255, 0.08)', 'rgba(255, 255, 255, 0.01)']}
            start={{ x: 0.5, y: 0 }}
            end={{ x: 0.5, y: 1 }}
            style={StyleSheet.absoluteFill}
          />

          <View style={s.cardTop}>
            <Pressable onPress={onCopy} style={s.addressPill}>
              <Text style={s.addressText}>{address ? shortAddr(address) : 'Wallet'}</Text>
              <Text style={s.copyLabel}>{copied ? 'Copied!' : 'Copy'}</Text>
            </Pressable>
            <Text style={s.solPrice}>SOL ${solPrice > 0 ? solPrice.toFixed(2) : '--'}</Text>
          </View>

          <View style={s.cardBalance}>
            <Text style={s.balanceSol}>{totalSol.toFixed(4)} SOL</Text>
            <Text style={s.balanceUsd}>≈ ${totalUsd.toFixed(2)} USD</Text>
          </View>

          <View style={s.actionRow}>
            <ActionButton
              label="Receive"
              icon="receive"
              onPress={() => setSection('receive')}
            />
            <ActionButton
              label="Send"
              icon="send"
              onPress={() => setSection(section === 'withdraw' ? 'none' : 'withdraw')}
            />
            <ActionButton
              label="Export"
              icon="key"
              onPress={() => setSection(section === 'export' ? 'none' : 'export')}
            />
          </View>
        </View>

        <Modal
          visible={section === 'receive'}
          transparent
          animationType="fade"
          onRequestClose={() => setSection('none')}
        >
          <View style={s.modalBackdrop}>
            <View style={s.qrCard}>
              <Text style={s.qrTitle}>Deposit SOL or USDC</Text>
              <Text style={s.qrSub}>
                Send tokens to your Thaler Dual Wallet address on Solana.
              </Text>

              <View style={s.qrBox}>
                {address ? (
                  <QRCode
                    data={address}
                    style={s.qrCode}
                    padding={12}
                    pieceSize={7}
                    pieceCornerType="rounded"
                    pieceBorderRadius={3}
                  />
                ) : null}
              </View>

              <Pressable onPress={onCopy} style={s.qrAddressBox}>
                <Text style={s.qrAddressText} numberOfLines={1}>
                  {address}
                </Text>
                <Text style={s.copyLabel}>{copied ? 'Copied' : 'Copy'}</Text>
              </Pressable>

              <Pressable onPress={() => setSection('none')} style={s.modalCloseBtn}>
                <Text style={s.modalCloseLabel}>Done</Text>
              </Pressable>
            </View>
          </View>
        </Modal>

        {section === 'withdraw' ? (
          <WithdrawSection
            availableSol={balance.data ? solBalance : null}
            getToken={getToken}
            onDone={() => {
              queryClient.invalidateQueries({ queryKey: ['dual-balance'] });
              setSection('none');
            }}
          />
        ) : null}

        {section === 'export' ? (
          <ExportSection address={address} getToken={getToken} />
        ) : null}

        <View style={s.segmented}>
          {(
            [
              { key: 'balances', label: 'Balances' },
              { key: 'positions', label: 'Vaults' },
              { key: 'activity', label: 'Activity' },
            ] as const
          ).map((o) => (
            <Pressable
              key={o.key}
              onPress={() => setSecondary(o.key)}
              style={[s.segment, secondary === o.key && s.segmentActive]}
            >
              <Text
                style={[
                  s.segmentLabel,
                  secondary === o.key && { color: dark.foreground, fontFamily: fontFamilies.rounded.bold },
                ]}
              >
                {o.label}
              </Text>
            </Pressable>
          ))}
        </View>

        <View style={s.listCard}>
          {secondary === 'balances' && (
            <ListRow
              left={<SolMark />}
              title="SOL"
              sub="Solana Native"
              value={`${solBalance.toFixed(4)} SOL`}
              valueSub={`$${(solBalance * solPrice).toFixed(2)}`}
            />
          )}

          {secondary === 'positions' &&
            (vaultRows.length === 0 ? (
              <Text style={s.empty}>
                {vaultsQ.isLoading ? 'Loading vaults…' : 'No open vaults yet'}
              </Text>
            ) : (
              vaultRows.map((r, i) => (
                <ListRow
                  key={r.id}
                  left={<View style={s.posDot} />}
                  title={r.label}
                  sub="Active strategy"
                  value={`${r.sol.toFixed(4)} SOL`}
                  valueSub={solPrice > 0 ? `$${r.usd.toFixed(2)}` : undefined}
                  border={i > 0}
                />
              ))
            ))}

          {secondary === 'activity' &&
            (activity.length === 0 ? (
              <Text style={s.empty}>
                {vaultsQ.isLoading ? 'Loading activity…' : 'No transactions or triggers yet'}
              </Text>
            ) : (
              activity.map((r, i) => (
                <ListRow
                  key={r.id}
                  title={r.title}
                  sub={r.sub}
                  value={r.value}
                  border={i > 0}
                />
              ))
            ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function ActionButton({
  label,
  icon,
  onPress,
}: {
  label: string;
  icon: 'receive' | 'send' | 'key';
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [s.actionBtn, pressed && { opacity: 0.8, transform: [{ scale: 0.97 }] }]}
    >
      <View style={s.actionIconWrap}>
        {icon === 'receive' ? (
          <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
            <Path
              d="M12 4v12M7 11l5 5 5-5M4 20h16"
              stroke={dark.foreground}
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </Svg>
        ) : icon === 'send' ? (
          <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
            <Path
              d="M12 20V8M7 13l5-5 5 5M4 4h16"
              stroke={dark.foreground}
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </Svg>
        ) : (
          <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
            <Path
              d="M21 2l-2 2m-1.5 1.5L14 9M3 21l6.5-6.5a4.95 4.95 0 0 1 7-7 4.95 4.95 0 0 1-7 7L3 21z"
              stroke={dark.foreground}
              strokeWidth={1.8}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </Svg>
        )}
      </View>
      <Text style={s.actionLabel}>{label}</Text>
    </Pressable>
  );
}

function ListRow({
  title,
  sub,
  value,
  valueSub,
  border,
  left,
}: {
  title: string;
  sub: string;
  value?: string;
  valueSub?: string;
  border?: boolean;
  left?: ReactNode;
}) {
  return (
    <View style={[s.listRow, border && s.rowBorder]}>
      <View style={s.listRowL}>
        {left}
        <View style={{ gap: 2, flexShrink: 1 }}>
          <Text style={s.rowTitle}>{title}</Text>
          <Text style={s.rowSub}>{sub}</Text>
        </View>
      </View>
      <View style={{ alignItems: 'flex-end', gap: 2 }}>
        {value ? <Text style={s.rowValue}>{value}</Text> : null}
        {valueSub ? <Text style={s.rowValueSub}>{valueSub}</Text> : null}
      </View>
    </View>
  );
}

function WithdrawSection({
  availableSol,
  getToken,
  onDone,
}: {
  availableSol: number | null;
  getToken: () => Promise<string | null>;
  onDone: () => void;
}) {
  const [destination, setDestination] = useState('');
  const [confirmDestination, setConfirmDestination] = useState('');
  const [amountSol, setAmountSol] = useState('');

  const isBase58 = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(destination.trim());
  const destinationsMatch =
    destination.trim().length > 0 && destination.trim() === confirmDestination.trim();
  const amountLamports = amountSol.trim() === '' ? null : solInputToLamports(amountSol);
  const amountValid = amountSol.trim() === '' || amountLamports !== null;
  const withinBalance =
    amountLamports === null ||
    availableSol === null ||
    Number(amountLamports) / LAMPORTS <= availableSol;

  const withdraw = useMutation({
    mutationFn: async () =>
      fetchThaler<WithdrawResponse>(await getToken(), endpoints.recoveryWithdraw, {
        method: 'POST',
        body: JSON.stringify({
          destination: destination.trim(),
          ...(amountLamports !== null ? { lamports: amountLamports } : {}),
        }),
      }),
    onSuccess: onDone,
  });
  const canSubmit = isBase58 && destinationsMatch && amountValid && withinBalance && !withdraw.isPending;

  if (withdraw.isSuccess) {
    const r = withdraw.data;
    return (
      <View style={s.formCard}>
        <Text style={[s.rowTitle, { color: brand.success }]}>Withdrawal sent.</Text>
        <Text style={s.rowSub}>
          {(Number(r.transferredLamports) / LAMPORTS).toFixed(6)} SOL to {shortAddr(r.toAddress)}
        </Text>
        <Pressable onPress={() => Linking.openURL(`https://solscan.io/tx/${r.signature}`)}>
          <Text style={s.link}>View on Solscan</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={s.formCard}>
      <Text style={s.sectionHeader}>Withdraw to External Wallet</Text>
      <Text style={s.rowSub}>
        Transfer SOL directly to an external Solana wallet.
      </Text>
      {availableSol != null ? (
        <Text style={[s.rowSub, { color: dark.foreground, fontFamily: fontFamilies.mono.semibold }]}>
          Available: {availableSol.toFixed(4)} SOL
        </Text>
      ) : null}
      <View style={s.field}>
        <Text style={s.fieldLabel}>Destination (Solana address)</Text>
        <TextInput
          value={destination}
          onChangeText={setDestination}
          placeholder="Solana address"
          placeholderTextColor={dark.mutedForeground}
          autoCapitalize="none"
          style={s.input}
        />
        {destination.trim().length > 0 && !isBase58 ? (
          <Text style={s.fieldError}>Not a valid Solana address.</Text>
        ) : null}
      </View>
      <View style={s.field}>
        <Text style={s.fieldLabel}>Confirm address</Text>
        <TextInput
          value={confirmDestination}
          onChangeText={setConfirmDestination}
          placeholder="Repeat the address"
          placeholderTextColor={dark.mutedForeground}
          autoCapitalize="none"
          style={s.input}
        />
        {confirmDestination.trim().length > 0 && !destinationsMatch ? (
          <Text style={s.fieldError}>Addresses do not match.</Text>
        ) : null}
      </View>
      <View style={s.field}>
        <Text style={s.fieldLabel}>Amount (SOL, empty = max)</Text>
        <TextInput
          value={amountSol}
          onChangeText={setAmountSol}
          placeholder="0.00"
          placeholderTextColor={dark.mutedForeground}
          keyboardType="decimal-pad"
          style={s.input}
        />
        {!amountValid ? <Text style={s.fieldError}>Enter a positive amount.</Text> : null}
        {amountValid && !withinBalance ? (
          <Text style={s.fieldError}>Amount exceeds the available balance.</Text>
        ) : null}
      </View>
      {withdraw.isError ? (
        <Text style={s.fieldError}>
          {withdraw.error instanceof Error ? withdraw.error.message : 'Withdrawal failed.'}
        </Text>
      ) : null}
      <Pressable
        accessibilityRole="button"
        disabled={!canSubmit}
        onPress={() => withdraw.mutate()}
        style={[s.btnPrimary, !canSubmit && { opacity: 0.5 }]}
      >
        <Text style={s.btnPrimaryLabel}>{withdraw.isPending ? 'Sending...' : 'Withdraw SOL'}</Text>
      </Pressable>
    </View>
  );
}

function ExportSection({
  address,
  getToken,
}: {
  address: string | null;
  getToken: () => Promise<string | null>;
}) {
  const [wallets, setWallets] = useState<ExportedWallet[] | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const exportKeys = useMutation({
    mutationFn: async () =>
      fetchThaler<{ wallets: ExportedWallet[] }>(await getToken(), endpoints.walletExport, {
        method: 'POST',
      }),
    onSuccess: (res) => setWallets(res.wallets),
  });

  const onCopyKey = async (k: string) => {
    await Clipboard.setStringAsync(k);
    setCopiedKey(k);
    setTimeout(() => setCopiedKey(null), 1500);
  };

  return (
    <View style={s.formCard}>
      <Text style={s.sectionHeader}>Export Private Key</Text>
      <Text style={s.rowSub}>
        Take full self-custody by importing your private key into Phantom, Solflare, or Backpack.
      </Text>
      <Text style={[s.rowSub, { color: brand.warning }]}>
        Warning: Anyone with this key has full control of your funds. Never share it.
      </Text>

      {!wallets ? (
        <Pressable
          accessibilityRole="button"
          disabled={exportKeys.isPending}
          onPress={() => exportKeys.mutate()}
          style={s.btnPrimary}
        >
          <Text style={s.btnPrimaryLabel}>
            {exportKeys.isPending ? 'Decrypting...' : 'Reveal Private Key'}
          </Text>
        </Pressable>
      ) : (
        <View style={{ gap: spacing.md, marginTop: spacing.sm }}>
          {wallets.map((w) => (
            <View key={`${w.kind}:${w.walletId}`} style={s.keyBox}>
              <Text style={s.keyTitle}>{w.kind.toUpperCase()} WALLET</Text>
              <Text style={s.keyText}>{w.privateKey}</Text>
              <Pressable onPress={() => onCopyKey(w.privateKey)}>
                <Text style={s.copyLabel}>{copiedKey === w.privateKey ? 'Copied key' : 'Copy key'}</Text>
              </Pressable>
            </View>
          ))}
          <Pressable onPress={() => setWallets(null)} style={s.hideBtn}>
            <Text style={s.hideBtnLabel}>Hide Keys</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: dark.background,
  },
  scroll: {
    paddingHorizontal: spacing.base,
    gap: spacing.base,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
  },
  headerTitle: {
    ...typography.title2,
    color: dark.foreground,
  },
  networkChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  netDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: brand.success,
  },
  netText: {
    ...typography.captionBold,
    color: dark.foreground,
    fontSize: 11,
  },
  heroCard: {
    borderRadius: radius.xxl,
    backgroundColor: glass.bg,
    borderWidth: 1.5,
    borderColor: glass.border,
    padding: spacing.lg,
    overflow: 'hidden',
    gap: spacing.base,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 10,
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  addressPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.full,
  },
  addressText: {
    ...typography.monoSm,
    color: dark.foreground,
  },
  copyLabel: {
    ...typography.captionBold,
    color: brand.blueBright,
  },
  solPrice: {
    ...typography.caption,
    color: dark.mutedForeground,
  },
  cardBalance: {
    gap: 4,
    marginVertical: 4,
  },
  balanceSol: {
    ...typography.display,
    fontFamily: fontFamilies.mono.bold,
    color: dark.foreground,
    fontSize: 34,
    lineHeight: 40,
  },
  balanceUsd: {
    ...typography.callout,
    color: dark.mutedForeground,
  },
  actionRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: 4,
  },
  actionBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderRadius: radius.xl,
    paddingVertical: 10,
    gap: 6,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  actionIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionLabel: {
    ...typography.captionBold,
    color: dark.foreground,
  },
  segmented: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: radius.xl,
    padding: 3,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  segment: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: radius.lg,
  },
  segmentActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  segmentLabel: {
    ...typography.callout,
    color: dark.mutedForeground,
  },
  listCard: {
    backgroundColor: glass.bg,
    borderRadius: radius.xxl,
    borderWidth: 1,
    borderColor: glass.border,
    padding: spacing.base,
  },
  listRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
  },
  rowBorder: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.06)',
  },
  listRowL: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    flex: 1,
  },
  rowTitle: {
    ...typography.headline,
    color: dark.foreground,
  },
  rowSub: {
    ...typography.caption,
    color: dark.mutedForeground,
  },
  rowValue: {
    ...typography.mono,
    color: dark.foreground,
  },
  rowValueSub: {
    ...typography.monoSm,
    color: dark.mutedForeground,
  },
  solMark: {
    width: 28,
    height: 28,
    borderRadius: 14,
  },
  posDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: brand.blueBright,
  },
  empty: {
    ...typography.callout,
    color: dark.mutedForeground,
    textAlign: 'center',
    paddingVertical: spacing.xl,
  },
  formCard: {
    backgroundColor: glass.bgElevated,
    borderRadius: radius.xxl,
    borderWidth: 1,
    borderColor: glass.border,
    padding: spacing.lg,
    gap: spacing.md,
  },
  sectionHeader: {
    ...typography.title3,
    color: dark.foreground,
  },
  field: {
    gap: 6,
  },
  fieldLabel: {
    ...typography.captionBold,
    color: dark.mutedForeground,
  },
  input: {
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderColor: glass.border,
    borderWidth: 1,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.md,
    height: 48,
    color: dark.foreground,
    ...typography.mono,
  },
  fieldError: {
    ...typography.caption,
    color: brand.error,
  },
  btnPrimary: {
    backgroundColor: dark.foreground,
    borderRadius: radius.xl,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 4,
  },
  btnPrimaryLabel: {
    ...typography.headline,
    color: dark.background,
    fontFamily: fontFamilies.rounded.bold,
  },
  link: {
    ...typography.captionBold,
    color: brand.blueBright,
    marginTop: 4,
  },
  keyBox: {
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    borderRadius: radius.lg,
    padding: spacing.md,
    gap: 6,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  keyTitle: {
    ...typography.captionBold,
    color: brand.warning,
  },
  keyText: {
    ...typography.monoSm,
    color: dark.foreground,
  },
  hideBtn: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  hideBtnLabel: {
    ...typography.callout,
    color: dark.mutedForeground,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: glass.backdrop,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  qrCard: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: '#16161a',
    borderRadius: radius.xxl,
    borderWidth: 1,
    borderColor: glass.borderActive,
    padding: spacing.xl,
    alignItems: 'center',
    gap: spacing.base,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.5,
    shadowRadius: 28,
  },
  qrTitle: {
    ...typography.title2,
    color: dark.foreground,
    textAlign: 'center',
  },
  qrSub: {
    ...typography.caption,
    color: dark.mutedForeground,
    textAlign: 'center',
    lineHeight: 18,
  },
  qrBox: {
    padding: 12,
    backgroundColor: '#ffffff',
    borderRadius: radius.xl,
    marginVertical: 4,
  },
  qrCode: {
    backgroundColor: '#ffffff',
  },
  qrAddressBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderRadius: radius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    width: '100%',
    gap: spacing.sm,
  },
  qrAddressText: {
    flex: 1,
    ...typography.monoSm,
    color: dark.foreground,
  },
  modalCloseBtn: {
    width: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: radius.xl,
    paddingVertical: 13,
    alignItems: 'center',
    marginTop: 4,
  },
  modalCloseLabel: {
    ...typography.headline,
    color: dark.foreground,
  },
});
