// Branded yield card. The image is rendered server-side by the BFF OG endpoint
// (/api/og/vault-share); the app builds the URL, downloads the PNG, and shares it.

import * as Clipboard from 'expo-clipboard';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { Share } from 'react-native';

import { bffBaseUrl } from '@/lib/api';
import type { Tier } from '@/lib/contracts';

const SHARE_BASE_URL = 'https://thaler.finance';

export type ShareYieldData = {
  scope: 'total' | 'vault';
  tier: Tier;
  /** Descriptor line, e.g. "All Vaults" or "Safe Vault". */
  label: string;
  /** Lifetime yield generated, in SOL (signed). */
  yieldSol: number;
  /** Total value / deposited principal, in SOL. */
  valueSol: number;
  /** Return on deposit, in percent. */
  roiPct: number;
  /** Days the position(s) have been open. */
  days: number;
};

// Formatting matches the web modal so the server renders an identical card.
export function buildShareCardUrl(data: ShareYieldData): string {
  const params = new URLSearchParams({
    scope: data.scope,
    tier: data.tier,
    label: data.label,
    yield: data.yieldSol.toFixed(4),
    value: data.valueSol.toFixed(4),
    roi: data.roiPct.toFixed(2),
    days: String(Math.round(data.days)),
  });
  return `${bffBaseUrl()}/api/og/vault-share?${params.toString()}`;
}

export function shareText(data: ShareYieldData): string {
  const sign = data.yieldSol >= 0 ? '+' : '';
  const where = data.scope === 'total' ? 'My Thaler vaults' : `My Thaler ${data.label}`;
  return `${where} generated ${sign}${data.yieldSol.toFixed(4)} SOL in yield. Delta-neutral jitoSOL, hedged on-chain.`;
}

export async function downloadCard(data: ShareYieldData): Promise<string> {
  const dest = new File(Paths.cache, `thaler-yield-${data.scope}.png`);
  const file = await File.downloadFileAsync(buildShareCardUrl(data), dest, { idempotent: true });
  return file.uri;
}

export async function copyCard(data: ShareYieldData): Promise<void> {
  const uri = await downloadCard(data);
  await Clipboard.setImageAsync(await new File(uri).base64());
}

export type ShareResult = 'shared-image' | 'shared-text';

// Shares the card image via the native sheet, falling back to text when image
// sharing is unavailable (web, some simulators, offline).
export async function shareCard(data: ShareYieldData): Promise<ShareResult> {
  if (await Sharing.isAvailableAsync()) {
    try {
      const uri = await downloadCard(data);
      await Sharing.shareAsync(uri, {
        mimeType: 'image/png',
        dialogTitle: 'Share your Thaler yield',
        UTI: 'public.png',
      });
      return 'shared-image';
    } catch {
      // fall through to text share
    }
  }
  await Share.share({ message: `${shareText(data)} ${SHARE_BASE_URL}` });
  return 'shared-text';
}
