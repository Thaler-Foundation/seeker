import { Modal, View, Text, ScrollView, Pressable, Linking, StyleSheet } from 'react-native';
import { dark, radius, spacing } from '@/theme/tokens';

const DOCS_URL = 'https://docs.thaler.finance/';

const STEPS: { title: string; body: string }[] = [
  {
    title: 'Deposit into managed strategies',
    body: 'Put your SOL into vaults managed by Thaler, each with its own strategy, risk profile, and return target.',
  },
  {
    title: 'Track performance by NAV',
    body: "Your position value updates with the vault's NAV per share, so you can follow returns, cost basis, and PnL over time.",
  },
  {
    title: 'Earn from active strategies',
    body: "Returns come from the vault's underlying strategy of lending and delta-neutral perp hedging, reflected in your share value.",
  },
  {
    title: 'Withdraw instantly or through a queue',
    body: 'Some vaults support instant withdrawals up to available capacity. Others may require a queued request before you can claim funds.',
  },
];

export function HowItWorksModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Modal visible={open} transparent animationType="slide" onRequestClose={onClose}>
      <View style={s.backdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <View style={s.sheet}>
          <View style={s.header}>
            <Text style={s.title}>How earn works on Thaler</Text>
          </View>
          <ScrollView style={s.body} contentContainerStyle={s.bodyContent}>
            {STEPS.map((step, i) => (
              <View key={step.title} style={s.step}>
                <Text style={s.stepIndex}>{`${i + 1}.`}</Text>
                <View style={s.stepText}>
                  <Text style={s.stepTitle}>{step.title}</Text>
                  <Text style={s.stepBody}>{step.body}</Text>
                </View>
              </View>
            ))}
            <Text style={s.outro}>
              Still have questions?{' '}
              <Text style={s.link} onPress={() => void Linking.openURL(DOCS_URL).catch(() => {})}>
                Read our docs
              </Text>
            </Text>
          </ScrollView>
          <View style={s.footer}>
            <Pressable accessibilityRole="button" onPress={onClose} style={s.closeBtn}>
              <Text style={s.closeLabel}>Close</Text>
            </Pressable>
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
  },
  title: { color: dark.foreground, fontSize: 18, fontWeight: '700' },
  body: { flexShrink: 1 },
  bodyContent: { padding: spacing.lg, gap: spacing.lg },
  step: { flexDirection: 'row', gap: 10 },
  stepIndex: {
    color: dark.mutedForeground,
    fontSize: 13,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
  stepText: { flex: 1, gap: 4 },
  stepTitle: { color: dark.foreground, fontSize: 15, fontWeight: '500' },
  stepBody: { color: dark.mutedForeground, fontSize: 13, lineHeight: 19 },
  outro: { color: dark.mutedForeground, fontSize: 13, lineHeight: 19 },
  link: { color: dark.foreground, fontWeight: '500', textDecorationLine: 'underline' },
  footer: {
    borderTopColor: dark.border,
    borderTopWidth: 1,
    padding: spacing.lg,
  },
  closeBtn: {
    backgroundColor: dark.foreground,
    borderRadius: radius.xl,
    paddingVertical: 13,
    alignItems: 'center',
  },
  closeLabel: { color: dark.background, fontSize: 15, fontWeight: '600' },
});
