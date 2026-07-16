import { z } from "zod";

// T2: zod schema for the /v1/analytics response. The API hand-built the JSON
// previously; this contract is the single source of truth for the shape that
// API, SDK, and web all read against. `mode` is locked to the closed six-letter
// enum the analytics module emits (apps/api/src/transport/http/routes/
// analytics.ts: `const MODES = ["A","B","C","D","E","F"]`).

export const analyticsModeSchema = z.enum(["A", "B", "C", "D", "E", "F"]);
export type AnalyticsMode = z.infer<typeof analyticsModeSchema>;

export const analyticsKpisSchema = z.object({
  totalTvlUsd: z.number(),
  activeVaultCount: z.number().int().nonnegative(),
  yield30dUsd: z.number(),
  projectedApyBps: z.number(),
  weightedAvgApyBps: z.number(),
  // Dashboard "30D APY" = median across vaults of each vault's 30D APY (median
  // daily SOL-earned over 30d, annualized, clamped >=0). Optional (lagging API).
  apy30dMedianBps: z.number().optional(),
  tvl30dGrowthPct: z.number(),
  // Additive-optional: absolute 30d TVL change in USD.
  tvl30dGrowthUsd: z.number().optional(),
  vaults30dDelta: z.number(),
  // All-time total yield generated (Σ scalp profit, all users, no time window).
  // Optional so a lagging API still validates.
  totalYieldGeneratedUsd: z.number().optional(),
  // All-time total yield claimed (Σ delivered to users), from the claim ledger.
  totalYieldClaimedUsd: z.number().optional(),
});
export type AnalyticsKpis = z.infer<typeof analyticsKpisSchema>;

export const tvlDailyPointSchema = z.object({
  date: z.string(),
  tvlUsd: z.number(),
});
export type TvlDailyPoint = z.infer<typeof tvlDailyPointSchema>;

export const tvlByModePointSchema = z.object({
  date: z.string(),
  mode: analyticsModeSchema,
  tvlUsd: z.number(),
});
export type TvlByModePoint = z.infer<typeof tvlByModePointSchema>;

export const apyByModePointSchema = z.object({
  date: z.string(),
  mode: analyticsModeSchema,
  apyBps: z.number(),
});
export type ApyByModePoint = z.infer<typeof apyByModePointSchema>;

export const strategyBreakdownRowSchema = z.object({
  mode: analyticsModeSchema,
  vaultCount: z.number().int().nonnegative(),
  tvlUsd: z.number(),
  // Total SOL DEPOSITED in the mode (Sum of active-vault open-time equity, in
  // SOL) — the price-independent twin of tvlUsd. Optional for SDK/fixture skew.
  tvlSol: z.number().optional(),
  projectedApyBps: z.number(),
  // Mean of the mode's active vaults' OWN apyBps (the per-vault whole-strategy
  // number shown on the portfolio page), averaged across all users' vaults of
  // the mode. The dashboard's per-mode "30D APY". null when the mode has no
  // active vault. Optional for SDK/fixture skew.
  meanVaultApyBps: z.number().nullable().optional(),
  // Per-mode 30D APY = MEDIAN of the mode's active vaults' apy30dBps (median
  // daily SOL-earned over 30d) — the SAME basis as the dashboard/operator 30D
  // headline so all "30D APY" surfaces reconcile. null when the mode has no
  // active vault. Optional for SDK/fixture skew.
  apy30dMedianBps: z.number().nullable().optional(),
  // Per-mode rolling 30d APY = trailing-30d ALL-components yield (carry +
  // funding + scalp + LP, snapshot-windowed) / mode equity, annualized x365/30
  // (bps, clamped). The dashboard + strategy-table "30D APY" basis. Optional
  // for SDK/fixture skew.
  rolling30dApyBps: z.number().optional(),
  // Mode's live unswapped USDC on the Pacifica spot (QUANT cache, Σ over the
  // mode's open positions, per-vault clamp >= 0). null while the cache is
  // dormant. Optional for SDK/fixture skew.
  pendingUsdcUsd: z.number().nullable().optional(),
  // Trailing-30d ALL-components yield (USD) across the mode's active vaults.
  yield30dUsd: z.number(),
  // LIFETIME all-components yield (USD): the honest "total yield made", not the
  // 30d window. Additive-optional for SDK/fixture skew.
  lifetimeYieldUsd: z.number().optional(),
  // Same lifetime yield in SOL (price-independent) — the web's per-tier "Total
  // Yield" reads this directly instead of dividing lifetimeYieldUsd by a
  // client-side SOL price (which zeroed the box whenever that price was 0 and
  // drifted when the server/client prices differed). Additive-optional.
  lifetimeYieldSol: z.number().optional(),
  utilization: z.number(),
});
export type StrategyBreakdownRow = z.infer<typeof strategyBreakdownRowSchema>;

export const venueAllocationItemSchema = z.object({
  venue: z.string(),
  pct: z.number(),
});
export type VenueAllocationItem = z.infer<typeof venueAllocationItemSchema>;

export const assetAllocationItemSchema = z.object({
  name: z.string(),
  pct: z.number(),
});
export type AssetAllocationItem = z.infer<typeof assetAllocationItemSchema>;

export const analyticsDataSchema = z.object({
  kpis: analyticsKpisSchema,
  tvlDailyUsd: z.array(tvlDailyPointSchema),
  tvlByModeDaily: z.array(tvlByModePointSchema),
  apyByModeDaily: z.array(apyByModePointSchema),
  strategyBreakdown: z.array(strategyBreakdownRowSchema),
  venueAllocation: z.array(venueAllocationItemSchema),
  assetAllocation: z.array(assetAllocationItemSchema),
});
export type AnalyticsData = z.infer<typeof analyticsDataSchema>;

// Equity-history endpoint (per-user): `[{ date, equitySol }]`. SOL-denominated
// (price-independent) so the portfolio chart never drifts with the SOL price.
// Lives in the same module so the SDK's `analytics.getEquityHistory(days)` can
// refer to a single source of truth (introduced by F4 in the upgrade plan).
export const equityHistoryPointSchema = z.object({
  date: z.string(),
  equitySol: z.number(),
});
export type EquityHistoryPoint = z.infer<typeof equityHistoryPointSchema>;

export const equityHistoryResponseSchema = z.object({
  points: z.array(equityHistoryPointSchema),
});
export type EquityHistoryResponse = z.infer<typeof equityHistoryResponseSchema>;

export const vaultLifecycle30dSchema = z.object({
  opens: z.number().int().nonnegative(),
  closes: z.number().int().nonnegative(),
  dismantles: z.number().int().nonnegative(),
});

export const triggerVelocitySchema = z.object({
  scalps24h: z.number().int().nonnegative(),
  scalps7d: z.number().int().nonnegative(),
  upsideBorrows24h: z.number().int().nonnegative(),
  upsideBorrows7d: z.number().int().nonnegative(),
});

export const carryTradeRiskSchema = z.object({
  // Average / max configured carry LTV (%) across active vaults. Max flags the
  // riskiest single vault relative to the jitoSOL/SOL eMode liquidation LTV.
  avgLtvPct: z.number(),
  maxLtvPct: z.number(),
  // Average configured Kamino Multiply leverage (x) across active vaults.
  avgMultiplyLeverage: z.number(),
});

// ── Admin extras (PR7): performance + exposure detail ──────────────────────
export const scalpWinRateSchema = z.object({
  // Share of EXECUTED scalp events with positive PnL, per trailing window.
  rate24hPct: z.number(),
  rate7dPct: z.number(),
  rate30dPct: z.number(),
  // Number of settled (pnl-bearing) scalp events in the 30d window — the
  // denominator behind rate30dPct, so a tiny sample is obvious.
  sample30d: z.number().int().nonnegative(),
});

export const scalpTypeStatSchema = z.object({
  count: z.number().int().nonnegative(),
  profitUsd: z.number(),
});

export const scalpSplit30dSchema = z.object({
  scalp: scalpTypeStatSchema,
  preScalp: scalpTypeStatSchema,
});

export const venueExposureItemSchema = z.object({
  venue: z.string(),
  notionalUsd: z.number(),
  marginUsd: z.number(),
  positionCount: z.number().int().nonnegative(),
  // Share of total OPEN-position notional, 0-100.
  pct: z.number(),
});

export const tvlConcentrationSchema = z.object({
  // Largest single active vault's share of TVL, 0-100.
  topVaultPct: z.number(),
  // Herfindahl-Hirschman index over active-vault TVL shares, 0-10000
  // (10000 = a single vault holds all TVL).
  hhi: z.number(),
});

export const operatorMetricsSchema = z.object({
  business: z.object({
    uniqueUsers: z.number().int().nonnegative(),
    activeVaultCount: z.number().int().nonnegative(),
    vaultLifecycle30d: vaultLifecycle30dSchema,
    vaultFailureRate30dPct: z.number(),
    serviceFeeRevenue30dUsd: z.number(),
    avgActiveVaultAgeDays: z.number(),
    // PR3b: protocol-health KPIs.
    totalTvlUsd: z.number(),
    scalpYield30dUsd: z.number(),
  }),
  risk: z.object({
    netDeltaUsd: z.number(),
    triggerVelocity: triggerVelocitySchema,
    upsideBorrowCapacityUtilizationPct: z.number(),
    avgPerpLeverage: z.number(),
    // PR3b: total downside leverage drawn across OPEN positions.
    upsideBorrowsOutstandingSol: z.number(),
    // Carry-trade (Kamino Multiply) risk from each vault's OPEN-TIME configured
    // LTV + multiply leverage (the dominant liquidation surface, distinct from
    // the perp hedge leverage above). Optional for rollout safety.
    carryTrade: carryTradeRiskSchema.optional(),
  }),
  // PR7 admin extras. Optional for rollout safety: a lagging API that omits
  // them still validates, and the admin page degrades each tile to "-".
  performance: z
    .object({
      scalpWinRate: scalpWinRateSchema,
      scalpSplit30d: scalpSplit30dSchema,
      // SOL actually delivered to users by claims completed in the last 30d
      // (sum of last_claim_transferred_lamports for vaults claimed in-window).
      realYieldPaid30dSol: z.number(),
      // Count of upside-borrow triggers executed in the last 30d.
      upsideBorrowTriggers30d: z.number().int().nonnegative(),
    })
    .optional(),
  exposure: z
    .object({
      venues: z.array(venueExposureItemSchema),
      tvlConcentration: tvlConcentrationSchema,
    })
    .optional(),
  // Operations — sourced from the wallets / audit_log / *_steps Neon tables.
  operations: z
    .object({
      wallets: z.object({
        total: z.number().int(),
        byChain: z.array(
          z.object({ chain: z.string(), count: z.number().int() }),
        ),
      }),
      auditEvents30d: z.object({
        total: z.number().int(),
        byKind: z.array(
          z.object({ kind: z.string(), count: z.number().int() }),
        ),
      }),
      openStepFailureRatePct: z.number(),
      claimStepFailureRatePct: z.number(),
      closeStepFailureRatePct: z.number().optional(),
      dismantleStepFailureRatePct: z.number().optional(),
    })
    .optional(),
});

export type OperatorMetrics = z.infer<typeof operatorMetricsSchema>;
