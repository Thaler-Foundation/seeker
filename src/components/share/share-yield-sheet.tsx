// Bottom sheet that previews the branded yield card and shares or copies it.

import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import {
  buildShareCardUrl,
  copyCard,
  shareCard,
  type ShareYieldData,
} from '@/lib/share-card';
import { dark, radius, spacing, tier as tierColors } from '@/theme/tokens';

type Props = {
  open: boolean;
  onClose: () => void;
  data: ShareYieldData;
};

export function ShareYieldSheet({ open, onClose, data }: Props) {
  const previewUri = useMemo(() => buildShareCardUrl(data), [data]);
  const [imgState, setImgState] = useState<'loading' | 'ok' | 'error'>('loading');
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const accent = data.scope === 'vault' ? tierColors[data.tier] : dark.foreground;

  const run = (fn: () => Promise<void>, done: string) => async () => {
    if (busy) return;
    setBusy(true);
    setNote(null);
    try {
      await fn();
      setNote(done);
    } catch {
      setNote('Something went wrong — try again.');
    } finally {
      setBusy(false);
    }
  };

  const onShare = run(async () => {
    const result = await shareCard(data);
    if (result === 'shared-text') setNote('Shared as text (image unavailable).');
  }, 'Shared.');

  const onCopy = run(async () => {
    await copyCard(data);
  }, 'Card copied.');

  return (
    <Modal visible={open} transparent animationType="slide" onRequestClose={onClose}>
      <View style={s.backdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <View style={s.sheet}>
          <View style={s.header}>
            <Text style={s.title}>Share your yield</Text>
          </View>

          <View style={s.body}>
            <View style={s.preview}>
              <Image
                key={previewUri}
                source={{ uri: previewUri }}
                style={s.previewImg}
                resizeMode="cover"
                onLoad={() => setImgState('ok')}
                onError={() => setImgState('error')}
              />
              {imgState === 'loading' ? (
                <View style={s.previewOverlay}>
                  <ActivityIndicator color={dark.foreground} />
                </View>
              ) : null}
              {imgState === 'error' ? (
                <View style={s.previewOverlay}>
                  <Text style={s.previewError}>Couldn&apos;t generate card</Text>
                </View>
              ) : null}
            </View>

            {note ? <Text style={s.note}>{note}</Text> : null}

            <View style={s.actions}>
              <Pressable
                accessibilityRole="button"
                onPress={onShare}
                disabled={busy}
                style={[s.btnPrimary, { backgroundColor: accent }, busy && s.btnDisabled]}
              >
                <Text style={s.btnPrimaryLabel}>Share</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                onPress={onCopy}
                disabled={busy}
                style={[s.btnOutline, busy && s.btnDisabled]}
              >
                <Text style={s.btnOutlineLabel}>Copy</Text>
              </Pressable>
            </View>
          </View>

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
  body: { padding: spacing.lg, gap: spacing.base },
  preview: {
    width: '100%',
    aspectRatio: 1200 / 750,
    borderRadius: radius.xl,
    borderColor: dark.border,
    borderWidth: 1,
    overflow: 'hidden',
    backgroundColor: '#000',
  },
  previewImg: { width: '100%', height: '100%' },
  previewOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  previewError: { color: dark.mutedForeground, fontSize: 13 },
  note: { color: dark.mutedForeground, fontSize: 13, textAlign: 'center' },
  actions: { flexDirection: 'row', gap: spacing.md },
  btnPrimary: {
    flex: 1,
    borderRadius: radius.xl,
    paddingVertical: 13,
    alignItems: 'center',
  },
  btnPrimaryLabel: { color: dark.background, fontSize: 15, fontWeight: '600' },
  btnOutline: {
    flex: 1,
    borderRadius: radius.xl,
    paddingVertical: 13,
    alignItems: 'center',
    borderColor: dark.border,
    borderWidth: 1,
  },
  btnOutlineLabel: { color: dark.foreground, fontSize: 15, fontWeight: '600' },
  btnDisabled: { opacity: 0.5 },
  footer: {
    borderTopColor: dark.border,
    borderTopWidth: 1,
    padding: spacing.lg,
  },
  closeBtn: {
    backgroundColor: 'transparent',
    borderRadius: radius.xl,
    paddingVertical: 13,
    alignItems: 'center',
    borderColor: dark.border,
    borderWidth: 1,
  },
  closeLabel: { color: dark.foreground, fontSize: 15, fontWeight: '600' },
});
