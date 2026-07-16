import { z } from "zod";

export const perpVenueSchema = z.enum(["pacifica", "hyperliquid"]);
export type PerpVenue = z.infer<typeof perpVenueSchema>;

// P1j: single source of truth for the open-execution state machine. Was
// previously declared independently in apps/api/src/domain/vaults/types.ts
// and in packages/sdk/src/resources/vault.ts; consolidating here keeps the
// API row, the SDK response, and the web consumers locked to the same enum.
// DISMANTLING / DISMANTLED are terminal markers set by the dismantle flow on
// the *parent* open execution to signal the vault was unwound (vs DONE →
// close → end).
export const vaultExecutionStateSchema = z.enum([
  "PENDING",
  "RUNNING",
  "DISMANTLING",
  "DISMANTLED",
  "DONE",
  "FAILED",
]);
export type VaultExecutionState = z.infer<typeof vaultExecutionStateSchema>;

// Strategy tier the vault was opened with. Single source of truth for the
// six-tier enum used by the API row, the SDK type, and the web's tier-coloured
// rendering. T1: persisted on `sol_vault_executions.tier` so list-vaults can
// surface it back to the dashboard without inferring from the strategy hash.
export const tierSchema = z.enum([
  "safe",
  "conservative",
  "balanced",
  "optimistic",
  "aggressive",
  "yolo",
]);
export type Tier = z.infer<typeof tierSchema>;

// pairId points to a vault_wallet_pairs row created upfront via
// POST /v1/vault-wallets. Each vault binds to its own pair so multiple vaults
// per user have isolated wallets and funds.
//
// Numeric params (ltv, multiply leverage, perp leverage) are NOT accepted as
// input. The backend derives them from TIER_PARAMS[tier] in @thaler/contracts
// so the on-chain math always matches the canonical strategy spec for the
// chosen tier.
export const openVaultSchema = z
  .object({
    pairId: z.string().min(1),
    equityLamports: z
      .string()
      .regex(/^\d+$/, "must be a base-10 string of lamports"),
    // Strategy tier chosen by the user. Drives the numeric parameters via
    // TIER_PARAMS lookup. Required.
    tier: tierSchema,
  })
  .strict();

export type OpenVaultInput = z.infer<typeof openVaultSchema>;

export const createVaultWalletsSchema = z.object({
  perpVenue: perpVenueSchema.default("pacifica"),
});
export type CreateVaultWalletsInput = z.infer<typeof createVaultWalletsSchema>;

export type VaultWalletAddress = { walletId: string; address: string };
export type VaultWalletPairResponse = {
  pairId: string;
  perpVenue: PerpVenue;
  status: "AWAITING_FUNDING" | "BOUND" | "RETIRED";
  solana: VaultWalletAddress;
  // null when perpVenue=pacifica — Pacifica strategies don't need EVM.
  evm: VaultWalletAddress | null;
  vaultExecutionId: string | null;
};

// P1k: shared list-vaults summary shape so the API row and SDK consumer agree
// on a single contract. Was previously declared twice (once in
// apps/api/src/application/vaults/use-cases/list-vaults.ts and again in
// packages/sdk/src/resources/vault.ts) and drifted whenever a new field
// landed in one half but not the other.
export type VaultMetrics = {
  apyBps: number; // carry APY
  // 30D APY = median per-vault of daily SOL-earned over the last 30 days,
  // annualized + clamped >=0. Dashboard "30D APY" = median across vaults.
  apy30dBps?: number | null;
  // Minimum borrow-leg health ratio (HR). 0 when no leg data is available.
  healthFactor: number;
  // Net claimable yield (claimPreview.netUserYieldLamports); "0" if no preview.
  claimableLamports: string;
  pnlBps: number;
  // Claimable split for the portfolio "Claimable Yield" stat (task #45):
  // claimableSol = perp profit already SWAPPED to SOL (purple); pendingRecycleUsd
  // = USDC NOT yet swapped (blue, re-priced at the live SOL price). Optional for
  // rollout (lagging SDK/web tolerant).
  claimableSol?: number | null;
  pendingRecycleUsd?: number | null;
};

export type ChildExecutionRef = {
  id: string;
  state: string;
  // PR-B2: SOL (lamports) delivered to the user by this execution. Currently
  // populated only for latestClaim (the claim's transfer_yield_to_user amount).
  // Optional for backward-compat — the activity row falls back to no amount.
  amountLamports?: string | null;
};
export type FailedStepRef = {
  stepNumber: number;
  kind: string;
  error: string | null;
};

export type VaultSummary = {
  id: string;
  walletAddress: string;
  state: VaultExecutionState;
  equityLamports: string;
  ltvBps: number;
  multiplyLeverageBps: number;
  leverageBps: number;
  // Strategy tier the vault was opened with. Null on rows opened before the
  // column existed (T1); consumers fall back to 'safe'.
  tier: Tier | null;
  createdAt: number;
  updatedAt: number;
  stepsTotal: number;
  stepsCompleted: number;
  failedStep: FailedStepRef | null;
  latestClaim: ChildExecutionRef | null;
  latestClose: ChildExecutionRef | null;
  latestDismantle: ChildExecutionRef | null;
  metrics: VaultMetrics | null;
};
export type ListVaultsResponse = { vaults: VaultSummary[] };

// P1k: vault.preview response shape. The numbers are derived deterministically
// by makeVaultMath on the API side; consumers just render them.
export type PreviewVaultResponse = {
  inputs: {
    equityLamports: string;
    ltvBps: number;
    multiplyLeverageBps: number;
    leverageBps: number;
  };
  finalState: {
    collateralSol: number;
    debtSol: number;
    extraBorrowSol: number;
    perpMarginSol: number;
    lpTailSol: number;
    collateralLamports: string;
    debtLamports: string;
    extraBorrowLamports: string;
    perpMarginLamports: string;
    lpTailLamports: string;
  };
  perpPlan: {
    notionalSol: number;
    marginReserveSol: number;
    leverage: number;
  };
  // Server-authoritative SOL reserve moved into the vault wallet ON TOP of the
  // deposit to cover open costs (tx fees + Kamino account rent). Lamports as a
  // decimal string. Sourced from SOL_VAULT_OPEN_FEE_BUFFER_LAMPORTS so the
  // displayed "vault creation fee" can never drift from what the open actually
  // moves (the UI previously read a hardcoded, wrong 0.05).
  openFeeBufferLamports: string;
  steps: unknown[];
};

// PR-2: per-user My Vaults table/KPI stats served from the QUANT cache + the
// latest yield snapshot (no per-vault venue fan-out). netCarryApyBps /
// pendingRecycleUsd are null when the warm cache has no FRESH row for that vault
// (QUANT off / cold-start / not-yet-swept) -> `cached:false` tells the client to
// live-fetch ONLY those two, ONLY for that vault, on demand. The snapshot-sourced
// fields (equityNav / realizedYield / claimable / daysHeld) are always populated.
export const userVaultStatRowSchema = z.object({
  vaultExecutionId: z.string(),
  tier: z.string(),
  equityNavLamports: z.string(),
  realizedYieldLamports: z.string(),
  netCarryApyBps: z.number().nullable(),
  pendingRecycleUsd: z.number().nullable(),
  claimableSol: z.number(),
  // What a claim RIGHT NOW would actually pay (recycledSol through the claim
  // preview's gross -> net slice: service fee deducted, clamped >= 0). This is
  // the number the portfolio claimable KPI must show; claimableSol above is the
  // RAW pre-fee pool. Optional: older servers do not send it.
  claimableNetSol: z.number().optional(),
  daysHeld: z.number(),
  cached: z.boolean(),
});
export type UserVaultStatRowContract = z.infer<typeof userVaultStatRowSchema>;

export const userVaultStatsViewSchema = z.object({
  vaults: z.array(userVaultStatRowSchema),
  // Server-summed total of every vault's claimableNetSol - the portfolio's
  // Claimable Yield stat displays THIS value directly (THALER QUANT does the
  // summing, the page does no math). Optional: older servers do not send it.
  claimableNetTotalSol: z.number().optional(),
  asOf: z.number(),
});
export type UserVaultStatsView = z.infer<typeof userVaultStatsViewSchema>;
