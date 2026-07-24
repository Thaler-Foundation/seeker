// Vault creation agreement gate, ported verbatim from apps/web terms-modal.tsx.

import { useEffect, useRef, useState } from 'react';
import {
  Modal,
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  type NativeSyntheticEvent,
  type NativeScrollEvent,
} from 'react-native';
import { dark, radius, spacing } from '@/theme/tokens';

const SECTIONS: { title: string; body: string }[] = [
  {
    title: '1. Non-discretionary execution',
    body: "The vault you are about to create is a self-custodial Squads Smart Account. By signing, you authorise the protocol to deploy capital strictly according to the immutable Squads policy extension co-signed at vault creation. No party - including Thaler Finance - has authority to modify the policy or deviate from the pre-signed strategy. All actions executed on your behalf are bounded by the policy you sign.",
  },
  {
    title: '2. Cloudflare Worker execution layer',
    body: "Strategy execution is delegated to a dedicated Cloudflare Worker instance that listens for the conditions defined in your policy (rebalance triggers, claim windows, hedge sizing). The worker can only emit transactions that the Squads policy allows. The worker cannot lift restrictions, sign outside the policy scope, or settle assets to any address other than the vault's smart account.",
  },
  {
    title: '3. Privy Agentic Wallet',
    body: "A Privy Agentic Wallet is provisioned for the worker to sign permitted instructions. The agentic wallet operates under the same Squads policy constraints - its signing authority is scoped, time-bounded, and audited on every action. You retain the keys to your vault; the Privy wallet only co-signs within the boundaries you have approved.",
  },
  {
    title: '4. Policy extension binding',
    body: "The Squads policy extension is the single source of truth for what the vault can and cannot do. It includes: allowed assets, allowed venues, leverage caps, and the closure procedure. Once signed, the policy is immutable. Any subsequent change requires you to close the existing vault and create a new one with a fresh policy.",
  },
  {
    title: '5. Yield claim cadence',
    body: "Yield accrues continuously inside the vault and is available to claim on demand. On claim you receive the external yield (LP reward tokens swapped to SOL plus perp funding/scalp profit) minus the service fee; the Kamino carry and LP fees autocompound back into your positions. Network fees for the claim transaction are paid from the harvested yield. Closing the vault settles any pending unclaimed yield in the same transaction.",
  },
  {
    title: '6. Risk acknowledgement',
    body: "Strategies running inside the vault interact with third-party protocols (liquid staking, lending markets, perpetual venues). These protocols carry residual smart-contract, oracle, and counterparty risk that no on-chain policy can fully eliminate. Thaler guarantees the per-tier yield floor advertised at the moment your vault is created, and deposit principal is protected by the immutable Squads policy and Thaler's protocol reserve. Realised yield above the floor is variable and depends on prevailing funding-rate and staking-yield conditions across the configured venues.",
  },
  {
    title: '7. Governing law & disputes',
    body: "This agreement is governed by the law of the jurisdiction stated in the protocol's published Terms of Service. By signing the on-chain transaction that creates the vault, you confirm you have read and accepted these terms in full.",
  },
];

const CHECK_LABEL =
  'I have read and accept the vault Terms & Policy Agreement, including the non-discretionary execution, Cloudflare Worker, Privy Agentic Wallet, and immutable Squads policy provisions described above.';

export function TermsModal({
  open,
  onClose,
  onAccept,
}: {
  open: boolean;
  onClose: () => void;
  onAccept: () => void;
}) {
  const scrollRef = useRef<ScrollView>(null);
  const [scrolledToBottom, setScrolledToBottom] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const canSign = scrolledToBottom && accepted;

  useEffect(() => {
    if (open) {
      setScrolledToBottom(false);
      setAccepted(false);
    }
  }, [open]);

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const { contentOffset, contentSize, layoutMeasurement } = e.nativeEvent;
    if (contentSize.height - contentOffset.y - layoutMeasurement.height < 24) {
      setScrolledToBottom(true);
    }
  };

  return (
    <Modal visible={open} transparent animationType="slide" onRequestClose={onClose}>
      <View style={s.backdrop}>
        <View style={s.sheet}>
          <View style={s.header}>
            <Text style={s.eyebrow}>TERMS & POLICY AGREEMENT</Text>
            <Text style={s.title}>Vault creation agreement</Text>
            <Text style={s.desc}>
              Read the full agreement and accept to continue. Scroll to the bottom to enable the
              acceptance checkbox.
            </Text>
          </View>
          <ScrollView
            ref={scrollRef}
            style={s.body}
            contentContainerStyle={s.bodyContent}
            onScroll={onScroll}
            scrollEventThrottle={16}
          >
            {SECTIONS.map((sec) => (
              <View key={sec.title} style={s.section}>
                <Text style={s.sectionTitle}>{sec.title}</Text>
                <Text style={s.sectionBody}>{sec.body}</Text>
              </View>
            ))}
            <Text style={s.outro}>
              End of agreement. Tick the acceptance box below to enable signing.
            </Text>
          </ScrollView>
          <View style={s.footer}>
            {!scrolledToBottom ? (
              <Pressable
                onPress={() => scrollRef.current?.scrollToEnd({ animated: true })}
                style={s.scrollBtn}
              >
                <Text style={s.scrollBtnLabel}>Scroll to bottom to enable</Text>
              </Pressable>
            ) : null}
            <Pressable
              onPress={() => scrolledToBottom && setAccepted((v) => !v)}
              style={[s.checkRow, !scrolledToBottom && { opacity: 0.5 }]}
            >
              <View style={[s.checkbox, accepted && { backgroundColor: dark.foreground }]} />
              <Text style={s.checkLabel}>{CHECK_LABEL}</Text>
            </Pressable>
            <View style={s.actions}>
              <Text style={s.policyNote}>Immutable policy · enforced on-chain</Text>
              <View style={s.btnRow}>
                <Pressable onPress={onClose} style={s.cancelBtn}>
                  <Text style={s.cancelLabel}>Cancel</Text>
                </Pressable>
                <Pressable
                  disabled={!canSign}
                  onPress={() => canSign && onAccept()}
                  style={[s.acceptBtn, !canSign && { opacity: 0.5 }]}
                >
                  <Text style={s.acceptLabel}>Accept & sign transaction</Text>
                </Pressable>
              </View>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: dark.background,
    borderTopLeftRadius: radius.xl + 4,
    borderTopRightRadius: radius.xl + 4,
    borderColor: dark.border,
    borderWidth: 1,
    maxHeight: '90%',
    overflow: 'hidden',
  },
  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
    borderBottomColor: dark.border,
    borderBottomWidth: 1,
    gap: 4,
  },
  eyebrow: { color: dark.mutedForeground, fontSize: 10, letterSpacing: 1.4, fontWeight: '600' },
  title: { color: dark.foreground, fontSize: 18, fontWeight: '700' },
  desc: { color: dark.mutedForeground, fontSize: 12, lineHeight: 17 },
  body: { flexShrink: 1 },
  bodyContent: { padding: spacing.lg, gap: spacing.md },
  section: { gap: 4 },
  sectionTitle: { color: dark.foreground, fontSize: 13, fontWeight: '600' },
  sectionBody: { color: dark.mutedForeground, fontSize: 12, lineHeight: 18 },
  outro: { color: dark.mutedForeground, fontSize: 11, fontStyle: 'italic' },
  footer: {
    borderTopColor: dark.border,
    borderTopWidth: 1,
    padding: spacing.lg,
    gap: spacing.md,
  },
  scrollBtn: {
    alignSelf: 'center',
    backgroundColor: dark.foreground,
    borderRadius: radius.full,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  scrollBtnLabel: { color: dark.background, fontSize: 12, fontWeight: '600' },
  checkRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  checkbox: {
    width: 18,
    height: 18,
    borderRadius: 4,
    borderColor: dark.border,
    borderWidth: 1,
    marginTop: 2,
  },
  checkLabel: { color: dark.foreground, fontSize: 12, lineHeight: 17, flexShrink: 1 },
  actions: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 10 },
  policyNote: { color: dark.mutedForeground, fontSize: 10, letterSpacing: 1, flexShrink: 1 },
  btnRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  cancelBtn: {
    borderColor: dark.border,
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  cancelLabel: { color: dark.foreground, fontSize: 12, fontWeight: '500' },
  acceptBtn: {
    backgroundColor: dark.foreground,
    borderRadius: radius.md,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  acceptLabel: { color: dark.background, fontSize: 12, fontWeight: '600' },
});
