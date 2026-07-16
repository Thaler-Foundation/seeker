// BFF client: Privy bearer token, no x-api-key on device.

import type {
  ListVaultsResponse,
  VaultPositions,
  UserVaultStatsView,
} from '@/lib/contracts';

const DEFAULT_BFF = 'https://thaler.finance';

export function bffBaseUrl(): string {
  return process.env.EXPO_PUBLIC_BFF_URL ?? DEFAULT_BFF;
}

export type ProxyErrorBody = {
  error?: { code?: string; message?: string; requestId?: string } | string;
};

export class ThalerProxyError extends Error {
  status: number;
  code: string;
  constructor(status: number, code: string, message: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

async function parseError(res: Response): Promise<ThalerProxyError> {
  let body: ProxyErrorBody | null = null;
  try {
    body = (await res.json()) as ProxyErrorBody;
  } catch {
  }
  const err = body?.error;
  if (typeof err === 'string') return new ThalerProxyError(res.status, 'error', err);
  return new ThalerProxyError(
    res.status,
    err?.code ?? 'error',
    err?.message ?? `Request failed (${res.status})`
  );
}

export async function fetchThaler<T>(
  token: string | null,
  path: string,
  init?: RequestInit
): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(init?.headers as Record<string, string> | undefined),
  };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${bffBaseUrl()}${path}`, { ...init, headers });
  if (!res.ok) throw await parseError(res);
  return (await res.json()) as T;
}

export type PublicStats = {
  ok: boolean;
  tvlSol: number;
  tvlUsd: number;
  solPriceUsd: number;
  apy: number;
  activeVaultCount: number | null;
  asOf: number | null;
};

export const endpoints = {
  publicStats: '/api/stats',
  apyHistory: (tierName: string, days: number) =>
    `/api/apy-history?tier=${encodeURIComponent(tierName)}&days=${days}`,
  vaults: '/api/thaler/vaults',
  vaultState: (id: string) => `/api/thaler/vaults/${id}`,
  vaultPositions: (id: string) => `/api/thaler/vaults/${id}/positions`,
  vaultClaim: (id: string) => `/api/thaler/vaults/${id}/claim`,
  vaultClose: (id: string) => `/api/thaler/vaults/${id}/close`,
  vaultResume: (id: string) => `/api/thaler/vaults/${id}/resume`,
  vaultDismantle: (id: string) => `/api/thaler/vaults/${id}/dismantle`,
  vaultPreview: (equityLamports: string, tierName: string) =>
    `/api/thaler/vaults/preview?equityLamports=${equityLamports}&tier=${tierName}`,
  vaultWallets: '/api/thaler/vault-wallets',
  vaultStats: '/api/thaler/vault-stats',
  dualWallet: '/api/thaler/dual-wallet',
  dualWalletBalance: '/api/thaler/dual-wallet/balance',
  solPrice: '/api/thaler/sol-price',
  triggers: '/api/thaler/modes/triggers',
  scalps: '/api/thaler/modes/scalps',
  analytics: '/api/thaler/analytics',
  equityHistory: (days: number) => `/api/thaler/analytics/equity-history?days=${days}`,
  walletExport: '/api/thaler/wallets/export',
  recoveryTransfer: '/api/thaler/wallets/recovery/transfer-vault-to-dual',
  recoveryClose: '/api/thaler/wallets/recovery/close-vault-wallet',
  recoveryWithdraw: '/api/thaler/wallets/recovery/withdraw-to-external',
} as const;

export type { ListVaultsResponse, VaultPositions, UserVaultStatsView };
