// Wallet sheet: mobile port of apps/web wallet-drawer.tsx with live API data.

import { useState, type ReactNode } from 'react';
import { View, Text, ScrollView, Pressable, TextInput, Linking, Image, StyleSheet } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as Clipboard from 'expo-clipboard';
import { fetchThaler, endpoints, type PublicStats, type ListVaultsResponse } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { dark, brand, radius, spacing } from '@/theme/tokens';

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

function WalletGlyph() {
  return (
    <Svg width={22} height={22} viewBox="0 0 1024 1024">
      <Path
        fillRule="evenodd"
        fill={dark.foreground}
        d="M 513.5 131.5 A 378 378 0 1 1 513.5 887.5 A 378 378 0 1 1 513.5 131.5 M 513.5 173.5 A 336 336 0 1 0 513.5 845.5 A 336 336 0 1 0 513.5 173.5 Z"
      />
      <Path
        fillRule="evenodd"
        fill={dark.foreground}
        d="M 513 244 L 274 666 L 749 666 Z M 509 361 L 643 614 L 373 615 Z"
      />
    </Svg>
  );
}

function SolMark() {
  return <Image source={require('../../assets/images/solana-logo.png')} style={s.solMark} />;
}

function Segmented({
  options,
  value,
  onChange,
}: {
  options: { key: string; label: string }[];
  value: string;
  onChange: (k: string) => void;
}) {
  return (
    <View style={s.segmented}>
      {options.map((o) => (
        <Pressable
          key={o.key}
          onPress={() => onChange(o.key)}
          style={[s.segment, value === o.key && s.segmentActive]}
        >
          <Text style={[s.segmentLabel, value === o.key && { color: dark.foreground }]}>
            {o.label}
          </Text>
        </Pressable>
      ))}
    </View>
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
        {valueSub ? <Text style={s.rowSub}>{valueSub}</Text> : null}
      </View>
    </View>
  );
}

export default function WalletSheet() {
  const router = useRouter();
  const { getToken, authenticated, signOut } = useAuth();
  const queryClient = useQueryClient();
  const [primary, setPrimary] = useState<'balance' | 'vaults'>('balance');
  const [secondary, setSecondary] = useState<'balances' | 'positions' | 'activity'>('balances');
  const [section, setSection] = useState<'none' | 'withdraw' | 'export'>('none');
  const [copied, setCopied] = useState(false);

  const balance = useQuery({
    queryKey: ['dual-balance'],
    queryFn: async () =>
      fetchThaler<BalanceResponse>(await getToken(), endpoints.dualWalletBalance),
    enabled: authenticated,
    staleTime: 30_000,
  });
  const pub = useQuery({
    queryKey: ['public-stats'],
    queryFn: () => fetchThaler<PublicStats>(null, endpoints.publicStats),
    staleTime: 60_000,
  });
  const vaultsQ = useQuery({
    queryKey: ['vaults'],
    queryFn: async () => fetchThaler<ListVaultsResponse>(await getToken(), endpoints.vaults),
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
    staleTime: 60_000,
  });
  const scalpsQ = useQuery({
    queryKey: ['scalps'],
    queryFn: async () =>
      fetchThaler<{ scalps: ScalpRow[] }>(await getToken(), endpoints.scalps).catch(() => ({
        scalps: [] as ScalpRow[],
      })),
    enabled: authenticated && secondary === 'activity',
    staleTime: 60_000,
  });

  const solPrice = pub.data?.ok ? pub.data.solPriceUsd : 0;
  const address = balance.data?.address ?? null;
  const solBalance = balance.data ? Number(balance.data.lamports) / LAMPORTS : 0;
  const openVaults = (vaultsQ.data?.vaults ?? []).filter(
    (v) => v.state === 'DONE' && v.latestClose === null && v.metrics !== null
  );
  const vaultRows = openVaults.map((v) => ({
    id: v.id,
    label: `${TIER_LABEL[v.tier ?? 'safe'] ?? 'Safe'} Vault`,
    sol: Number(v.equityLamports) / LAMPORTS,
  }));
  const vaultsTotalSol = vaultRows.reduce((a, r) => a + r.sol, 0);
  const totalSol = primary === 'balance' ? solBalance : vaultsTotalSol;
  const totalUsd = totalSol * solPrice;

  const rel = (ts: number) => {
    const h = Math.floor((Date.now() - ts) / 3_600_000);
    if (h < 1) return `${Math.max(1, Math.floor((Date.now() - ts) / 60_000))}m ago`;
    if (h < 24) return `${h}h ago`;
    return `${Math.floor(h / 24)}d ago`;
  };
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
          value: x.profitUsd !== null ? `${x.profitUsd.toFixed(2)} USDC` : '-',
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
  const onDisconnect = async () => {
    await signOut();
    router.replace('/');
  };

  return (
    <SafeAreaView style={s.root} edges={['top']}>
      <ScrollView contentContainerStyle={s.scroll}>
        <View style={s.headRow}>
          <Pressable accessibilityRole="button" onPress={onCopy} style={s.rowL}>
            <WalletGlyph />
            <Text style={s.addr}>{address ? shortAddr(address) : 'Wallet'}</Text>
            <Text style={s.copyHint}>{copied ? 'Copied' : 'Copy'}</Text>
          </Pressable>
          <Pressable accessibilityRole="button" onPress={onDisconnect} style={s.btnOutline}>
            <Text style={s.btnOutlineLabel}>Disconnect</Text>
          </Pressable>
        </View>

        <Segmented
          options={[
            { key: 'balance', label: 'Wallet Balance' },
            { key: 'vaults', label: 'Thaler Vaults' },
          ]}
          value={primary}
          onChange={(k) => setPrimary(k as 'balance' | 'vaults')}
        />

        <View>
          <Text style={s.total}>{totalSol.toFixed(4)} SOL</Text>
          <Text style={s.totalSub}>≈ ${totalUsd.toFixed(2)}</Text>
        </View>

        <Segmented
          options={[
            { key: 'balances', label: 'Balances' },
            { key: 'positions', label: 'Positions' },
            { key: 'activity', label: 'Activity' },
          ]}
          value={secondary}
          onChange={(k) => setSecondary(k as 'balances' | 'positions' | 'activity')}
        />

        <View style={s.list}>
          {secondary === 'balances' ? (
            <ListRow
              left={<SolMark />}
              title="SOL"
              sub="Solana"
              value={solBalance.toFixed(9)}
              valueSub={`$${(solBalance * solPrice).toFixed(2)}`}
            />
          ) : null}
          {secondary === 'positions'
            ? vaultRows.length === 0
              ? <Text style={s.empty}>{vaultsQ.isLoading ? 'Loading vaults…' : 'No open vaults yet'}</Text>
              : vaultRows.map((r, i) => (
                  <ListRow
                    key={r.id}
                    left={<View style={s.posDot} />}
                    title={r.label}
                    sub="Thaler vault"
                    value={`${r.sol.toFixed(4)} SOL`}
                    valueSub={solPrice > 0 ? `$${(r.sol * solPrice).toFixed(2)}` : undefined}
                    border={i > 0}
                  />
                ))
            : null}
          {secondary === 'activity'
            ? activity.length === 0
              ? <Text style={s.empty}>{vaultsQ.isLoading ? 'Loading activity…' : 'No activity yet'}</Text>
              : activity.map((r, i) => (
                  <ListRow key={r.id} title={r.title} sub={r.sub} value={r.value} border={i > 0} />
                ))
            : null}
        </View>

        <Pressable
          accessibilityRole="button"
          onPress={() => setSection(section === 'withdraw' ? 'none' : 'withdraw')}
          style={s.footerBtn}
        >
          <Text style={s.footerBtnLabel}>Withdraw to external wallet</Text>
        </Pressable>
        {section === 'withdraw' ? (
          <WithdrawSection
            availableSol={balance.data ? solBalance : null}
            getToken={getToken}
            onDone={() => queryClient.invalidateQueries({ queryKey: ['dual-balance'] })}
          />
        ) : null}

        <Pressable
          accessibilityRole="button"
          onPress={() => setSection(section === 'export' ? 'none' : 'export')}
          style={s.footerBtn}
        >
          <Text style={s.footerBtnLabel}>Export wallet key</Text>
        </Pressable>
        {section === 'export' ? <ExportSection address={address} getToken={getToken} /> : null}
      </ScrollView>
    </SafeAreaView>
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
      <View style={s.card}>
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
    <View style={s.card}>
      <Text style={s.rowSub}>
        Sends SOL from your Thaler wallet to an external Solana wallet. Leave the amount empty to
        withdraw everything above the rent reserve. USDC or jitoSOL on the wallet is swapped to
        SOL first.
      </Text>
      {availableSol != null ? (
        <Text style={s.rowSub}>Available: {availableSol.toFixed(4)} SOL</Text>
      ) : null}
      <View style={s.field}>
        <Text style={s.rowSub}>Destination (Solana address)</Text>
        <TextInput
          value={destination}
          onChangeText={setDestination}
          placeholder="Base58 Solana address"
          placeholderTextColor={dark.mutedForeground}
          autoCapitalize="none"
          style={s.input}
        />
        {destination.trim().length > 0 && !isBase58 ? (
          <Text style={s.fieldError}>Not a valid Solana address.</Text>
        ) : null}
      </View>
      <View style={s.field}>
        <Text style={s.rowSub}>Re-type destination to confirm</Text>
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
        <Text style={s.rowSub}>Amount (SOL, empty = full balance)</Text>
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
        <Text style={s.btnPrimaryLabel}>{withdraw.isPending ? 'Sending...' : 'Withdraw'}</Text>
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
  const [acknowledged, setAcknowledged] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const [wallets, setWallets] = useState<ExportedWallet[] | null>(null);
  const unlocked = acknowledged && confirmText.trim().toUpperCase() === 'EXPORT';
  const exportKeys = useMutation({
    mutationFn: async () =>
      fetchThaler<{ wallets: ExportedWallet[] }>(await getToken(), endpoints.walletExport, {
        method: 'POST',
        body: JSON.stringify({}),
      }),
    onSuccess: (res) => setWallets(res.wallets),
  });

  return (
    <View style={s.card}>
      <Text style={s.rowTitle}>Export private keys</Text>
      <Text style={s.rowSub}>
        Download or copy the private key of your Thaler wallet or any vault wallet, so you can
        import it into an external wallet like Phantom and take full self-custody of your funds.
      </Text>
      <Text style={s.rowSub}>
        Your private key is the full, permanent control of a wallet. Anyone who sees it can move
        every token in it. Thaler can never recover a wallet whose key has leaked.
      </Text>
      <Text style={s.rowSub}>· Never paste your key into a website, chat, or email.</Text>
      <Text style={s.rowSub}>· Do not export while screen sharing or being recorded.</Text>
      <Text style={s.rowSub}>· Store the downloaded file somewhere only you can reach.</Text>
      <Pressable onPress={() => setAcknowledged((v) => !v)} style={s.rowL}>
        <View style={[s.checkbox, acknowledged && { backgroundColor: dark.foreground }]} />
        <Text style={s.rowSub}>
          I understand that anyone with this key controls my funds, and this cannot be
          undone.
        </Text>
      </Pressable>
      <TextInput
        value={confirmText}
        onChangeText={setConfirmText}
        placeholder="Type EXPORT to unlock"
        placeholderTextColor={dark.mutedForeground}
        autoCapitalize="characters"
        style={s.input}
      />
      <Text style={s.rowSub}>Solana address: {address ?? '-'}</Text>
      <Pressable
        accessibilityRole="button"
        disabled={!unlocked || !address || exportKeys.isPending}
        onPress={() => exportKeys.mutate()}
        style={[s.btnDestructive, (!unlocked || !address || exportKeys.isPending) && { opacity: 0.5 }]}
      >
        <Text style={s.btnDestructiveLabel}>
          {exportKeys.isPending ? 'Exporting…' : 'Export Thaler wallet key'}
        </Text>
      </Pressable>
      {exportKeys.isError ? (
        <Text style={s.fieldError}>
          {exportKeys.error instanceof Error ? exportKeys.error.message : 'Export failed'}
        </Text>
      ) : null}
      {wallets ? (
        <>
          {wallets.length === 0 ? <Text style={s.rowSub}>No wallets returned.</Text> : null}
          {wallets.map((w) => (
            <View key={`${w.kind}:${w.walletId}`} style={s.keyBox}>
              <Text style={s.rowSub}>{shortAddr(w.address)}</Text>
              <Text selectable style={s.keyText}>{w.privateKey}</Text>
              <Pressable onPress={() => Clipboard.setStringAsync(w.privateKey)}>
                <Text style={s.link}>Copy key</Text>
              </Pressable>
            </View>
          ))}
          <Pressable onPress={() => setWallets(null)}>
            <Text style={s.link}>Clear from screen</Text>
          </Pressable>
        </>
      ) : null}
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: dark.background },
  scroll: { padding: spacing.base, gap: spacing.base },
  headRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  rowL: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  addr: { color: dark.foreground, fontSize: 16, fontWeight: '600', fontVariant: ['tabular-nums'] },
  copyHint: { color: dark.mutedForeground, fontSize: 11, textDecorationLine: 'underline' },
  btnOutline: {
    borderColor: dark.border,
    borderWidth: 1,
    borderRadius: radius.lg,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  btnOutlineLabel: { color: dark.foreground, fontSize: 13, fontWeight: '500' },
  segmented: {
    flexDirection: 'row',
    gap: 4,
    borderColor: dark.border,
    borderWidth: 1,
    borderRadius: radius.xl,
    backgroundColor: 'rgba(38,38,38,0.3)',
    padding: 4,
  },
  segment: { flex: 1, borderRadius: radius.lg, paddingVertical: 9, alignItems: 'center' },
  segmentActive: { backgroundColor: dark.background, borderColor: dark.border, borderWidth: 1 },
  segmentLabel: { color: dark.mutedForeground, fontSize: 13, fontWeight: '500' },
  total: { color: dark.foreground, fontSize: 34, fontWeight: '700', fontVariant: ['tabular-nums'] },
  totalSub: { color: dark.mutedForeground, fontSize: 13, marginTop: 4, fontVariant: ['tabular-nums'] },
  list: {
    backgroundColor: dark.card,
    borderColor: dark.border,
    borderWidth: 1,
    borderRadius: radius.xl + 2,
    overflow: 'hidden',
  },
  listRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.base,
    paddingVertical: 13,
  },
  listRowL: { flexDirection: 'row', alignItems: 'center', gap: 10, flexShrink: 1 },
  solMark: { width: 28, height: 28, borderRadius: 14 },
  posDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: dark.mutedForeground },
  rowBorder: { borderTopColor: dark.border, borderTopWidth: 1 },
  rowTitle: { color: dark.foreground, fontSize: 14, fontWeight: '500' },
  rowSub: { color: dark.mutedForeground, fontSize: 12, lineHeight: 17 },
  rowValue: { color: dark.foreground, fontSize: 13, fontVariant: ['tabular-nums'] },
  empty: { color: dark.mutedForeground, fontSize: 13, textAlign: 'center', paddingVertical: 40 },
  footerBtn: {
    borderColor: dark.border,
    borderWidth: 1,
    borderRadius: radius.xl,
    paddingVertical: 11,
    alignItems: 'center',
  },
  footerBtnLabel: { color: dark.foreground, fontSize: 14, fontWeight: '500' },
  card: {
    backgroundColor: dark.card,
    borderColor: dark.border,
    borderWidth: 1,
    borderRadius: radius.xl + 2,
    padding: spacing.base,
    gap: 10,
  },
  field: { gap: 6 },
  input: {
    borderColor: dark.input,
    borderWidth: 1,
    borderRadius: radius.lg,
    paddingHorizontal: 12,
    height: 42,
    color: dark.foreground,
    fontSize: 13,
  },
  fieldError: { color: brand.warning, fontSize: 12 },
  checkbox: {
    width: 16,
    height: 16,
    borderRadius: 4,
    borderColor: dark.border,
    borderWidth: 1,
  },
  btnPrimary: {
    backgroundColor: dark.foreground,
    borderRadius: radius.xl,
    paddingVertical: 11,
    alignItems: 'center',
  },
  btnPrimaryLabel: { color: dark.background, fontSize: 14, fontWeight: '600' },
  btnDestructive: {
    backgroundColor: 'rgba(239,68,68,0.12)',
    borderRadius: radius.lg,
    paddingVertical: 10,
    alignItems: 'center',
  },
  btnDestructiveLabel: { color: brand.error, fontSize: 14, fontWeight: '600' },
  link: { color: dark.mutedForeground, fontSize: 12, textDecorationLine: 'underline' },
  keyBox: {
    backgroundColor: 'rgba(38,38,38,0.4)',
    borderRadius: radius.lg,
    padding: 12,
    gap: 6,
  },
  keyText: { color: dark.foreground, fontSize: 11, fontVariant: ['tabular-nums'] },
});
