import { z } from "zod";

export const openPositionSchema = z
  .object({
    venue: z.enum(["hyperliquid", "pacifica"]).default("hyperliquid"),
    walletId: z.string().min(1).optional(),
    mode: z.literal("A"),
    coin: z.string().min(1).optional(),
    notionalUsd: z.number().positive(),
    leverage: z.number().int().positive().optional(),
  })
  .refine(
    (v) => v.venue !== "hyperliquid" || (v.walletId && v.walletId.length > 0),
    {
      message: "walletId is required for venue=hyperliquid",
      path: ["walletId"],
    },
  );

const positionStatuses = ["OPEN", "CLOSED", "ERROR"] as const;
export const positionStatusSchema = z.enum(positionStatuses);

export type OpenPositionInput = z.infer<typeof openPositionSchema>;
export type PositionStatus = z.infer<typeof positionStatusSchema>;

// Upside-borrow simulator — projects the Mode A ladder against a vault's
// opening state and Kamino's LTV cap. See
// apps/api/src/domain/modes/upside-borrow-sim.ts for the math.
export const simulateUpsideBorrowSchema = z.object({
  vault: z.object({
    equitySol: z.number().positive(),
    ltv: z.number().gt(0).lt(1),
    // Kamino Multiply target leverage (the carry leg) and the perp short
    // leverage. Replaces the legacy `split`/`leverage` pair.
    multiplyLeverage: z.number().positive(),
    perpLeverage: z.number().positive(),
  }),
  entryPrice: z.number().positive(),
  // Upside Borrow ladder length. The loss-%-of-margin table defines exactly
  // 4 steps, so the count is capped at 4.
  upsideBorrowStepsCount: z.number().int().min(1).max(4).default(4),
  hedgeAsset: z.enum(["USDC", "SOL"]).default("SOL"),
  kamino: z.object({
    requestedCap: z.number().gt(0).lt(1),
    safetyBps: z.number().int().min(0).max(10_000).optional(),
  }),
  overshootPct: z.number().min(0).optional(),
  stressCaps: z.array(z.number().gt(0).lt(1)).optional(),
});
export type SimulateUpsideBorrowInput = z.input<
  typeof simulateUpsideBorrowSchema
>;
export type SimulateUpsideBorrowInputParsed = z.infer<
  typeof simulateUpsideBorrowSchema
>;

export type UpsideBorrowScenarioLabel = "exact" | "overshoot" | "catchup";

export interface UpsideBorrowStep {
  step: number;
  observedMid: number;
  borrowUsd: number;
  hedgeAmount: number;
  solEquivalent: number;
  longSizeSolAfter: number;
  cumulativeExtraDebtSol: number;
  newDebtSol: number;
  ltvAfter: number;
  headroomPct: number;
  pass: boolean;
  clampedBy: "none" | "ltv-cap";
}

export interface UpsideBorrowScenarioSummary {
  finalLtv: number;
  maxLtv: number;
  pass: boolean;
  firstFailingStep: number | null;
  totalBorrowUsd: number;
  totalHedgeSol: number;
}

export interface UpsideBorrowScenario {
  label: UpsideBorrowScenarioLabel;
  trajectory: number[];
  steps: UpsideBorrowStep[];
  summary: UpsideBorrowScenarioSummary;
}

export interface UpsideBorrowLadderRow {
  step: number;
  lossPctOfMargin: number;
  priceMovePct: number;
  thresholdPrice: number;
}

export interface UpsideBorrowCapAnalysis {
  cap: number;
  effectiveCap: number;
  pass: boolean;
  firstFailingStep: number | null;
  maxLtv: number;
  finalLtv: number;
  finalHeadroomPct: number;
}

export interface SimulateUpsideBorrowResponse {
  starting: {
    collateralSol: number;
    debtSol: number;
    spotReserveSol: number;
    tailSol: number;
    sizeSol: number;
    initialLtv: number;
  };
  ladder: UpsideBorrowLadderRow[];
  caps: {
    requested: number;
    safetyBps: number;
    effective: number;
    // Kamino SOL-debt borrow factor folded into every LTV figure in this
    // response. Resolved live from the Kamino SDK by the route (falls back
    // to the simulator's static default if the on-chain read fails).
    borrowFactor: number;
  };
  scenarios: {
    exact: UpsideBorrowScenario;
    overshoot: UpsideBorrowScenario;
    catchup: UpsideBorrowScenario;
  };
  stress: {
    capsAnalysis: UpsideBorrowCapAnalysis[];
  };
}
