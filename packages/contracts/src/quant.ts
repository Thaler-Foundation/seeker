import { z } from "zod";

// THALER_QUANT served-payload contracts (Phase 4 serving layer). Cache-only,
// admin-gated views derived from the TruthCache. quant*-prefixed names keep
// these additive — no clash with operatorMetricsSchema / analytics schemas.

// One vault's served row, fields aligned to the TruthCache truth types.
export const quantVaultRowSchema = z.object({
  signerAddress: z.string(),
  capturedAtWarm: z.number().nullable(),
  capturedAtCold: z.number().nullable(),
  pacificaEquityUsd: z.number(),
  freeUsdc: z.number(),
  kaminoCollateralUsd: z.number(),
  kaminoDebtUsd: z.number(),
  kaminoNetValueSol: z.number(),
  leverage: z.number(),
  ltvPct: z.number(),
  liqLtvPct: z.number(),
  // null when the warm sweep could not compute carry (no pool rate / cold Kamino
  // read). Consumers MUST render null as "-", NOT 0 — a fabricated 0% Net APY is
  // the false-fresh-zero class we explicitly avoid (see truth-cache.ts).
  netCarryApyBps: z.number().nullable(),
  lpValueSol: z.number(),
  lpFeesUsd: z.number(),
  fundingNetUsd: z.number(),
  // Σ hot side==="ask" sizeBase×markPrice
  shortNotionalUsd: z.number(),
  // Σ hot pricePnlUsd
  unrealizedPnlUsd: z.number(),
  // Venue liquidation-headroom margin ratio (%) derived from the tap
  // account's venue-reported equity / spot collateral / cross MMR - the
  // SAME ratio the borrow-deploy governor acts on (floor 17, recover 25).
  // Null when the tap account is absent, the vault holds no position, or
  // no finite liquidation mark exists. Consumers render null as "-".
  venueMarginRatioPct: z.number().nullable(),
  verifyStatus: z.enum(["PASS", "MISMATCH", "MISSING", "UNKNOWN"]),
});
export type QuantVaultRow = z.infer<typeof quantVaultRowSchema>;

export const quantVaultsViewSchema = z.object({
  vaults: z.array(quantVaultRowSchema),
  asOf: z.number(),
});
export type QuantVaultsView = z.infer<typeof quantVaultsViewSchema>;

export const quantOperatorViewSchema = z.object({
  // Σ warm pacificaEquityUsd (DISTINCT from operator totalTvlUsd)
  liveEquityUsd: z.number(),
  kaminoNetValueUsd: z.number(),
  lpValueUsd: z.number(),
  freeUsdcUsd: z.number(),
  netDeltaUsd: z.number(),
  avgLeverage: z.number(),
  avgLtvPct: z.number(),
  maxLtvPct: z.number(),
  avgNetCarryApyBps: z.number(),
  fundingNetUsd: z.number(),
  fundingReceivedUsd: z.number(),
  fundingPaidUsd: z.number(),
  lpFeesUsd: z.number(),
  cachedVaults: z.number(),
  verify: z.object({
    pass: z.number(),
    mismatch: z.number(),
    missing: z.number(),
    windowMs: z.number(),
  }),
  health: z.object({
    running: z.boolean(),
    lastHotAt: z.number().nullable(),
    lastWarmAt: z.number().nullable(),
    lastColdAt: z.number().nullable(),
    hotStaleMs: z.number().nullable(),
    warmStaleMs: z.number().nullable(),
    coldStaleMs: z.number().nullable(),
  }),
  asOf: z.number(),
});
export type QuantOperatorView = z.infer<typeof quantOperatorViewSchema>;

export const quantUserViewSchema = z.object({
  userId: z.string(),
  vaults: z.array(quantVaultRowSchema),
  totals: z.object({
    liveEquityUsd: z.number(),
    kaminoNetValueUsd: z.number(),
    lpValueUsd: z.number(),
    freeUsdcUsd: z.number(),
  }),
  asOf: z.number(),
});
export type QuantUserView = z.infer<typeof quantUserViewSchema>;

export const quantSeriesPointSchema = z.object({
  capturedAt: z.number(),
  value: z.number(),
});
// Historical series served from the quant_vault_history backfill: cumulative
// net funding (USD) and daily Kamino obligation metrics per signer.
export const quantVaultHistoryViewSchema = z.object({
  signer: z.string(),
  funding: z.array(z.object({ ts: z.number(), cumUsd: z.number() })),
  obligation: z.array(
    z.object({
      ts: z.number(),
      leverage: z.number(),
      ltvPct: z.number(),
      liqLtvPct: z.number(),
      netValueUsd: z.number(),
      collateralUsd: z.number(),
      debtUsd: z.number(),
    }),
  ),
});
export type QuantVaultHistoryView = z.infer<typeof quantVaultHistoryViewSchema>;

export const quantSeriesViewSchema = z.object({
  metric: z.string(),
  days: z.number(),
  // aggregated across vaults per capture bucket
  points: z.array(quantSeriesPointSchema),
});
export type QuantSeriesView = z.infer<typeof quantSeriesViewSchema>;
