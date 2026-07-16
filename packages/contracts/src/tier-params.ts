import { z } from "zod";
import type { Tier } from "./vaults";

/**
 * Canonical per-tier vault open parameters per the Thaler One strategy spec.
 *
 * Single source of truth shared by:
 *   - apps/api open-vault path (derives multiply / extraBorrow / perpLeverage from tier)
 *   - apps/web Create Vault tier picker (renders tier copy with the actual numbers)
 *
 * Values cross-checked against the 10-SOL example column in the strategy
 * spec memory file `project_thaler_one_strategy_spec.md` Section
 * "Six Modes Overview". The `ltvBps` field is the INPUT borrow LTV cap
 * consumed by `computeMultiplyPlan` (the FINAL LTV is an OUTPUT, usually
 * above this input).
 *
 * All values are in basis points (bps):
 *   12000 bps multiply = 1.2x leverage
 *   5000 bps extra borrow = 50% of equity
 *   5000 bps ltv = 0.5 input cap
 *   500 bps perp = 5x leverage
 */
export const tierParamsSchema = z.object({
  // Up to 10x Multiply (100000 bps). Spec ladder goes 1.2x..1.8x; ceiling
  // gives generous future-proof room without allowing nonsensical values.
  multiplyLeverageBps: z.number().int().positive().max(100_000),
  // Up to 1000% of equity. Spec ladder goes 50%..60%; ceiling protects
  // against fat-finger config additions.
  extraBorrowPctBps: z.number().int().positive().max(100_000),
  // LTV is structurally bounded at 100% (10000 bps); anything higher
  // would silently corrupt computeMultiplyPlan.
  ltvBps: z.number().int().positive().max(10_000),
  // Up to 100x perp (10000 bps). Spec ladder goes 5x..7.5x.
  perpLeverageBps: z.number().int().positive().max(10_000),
});

export type TierParams = z.infer<typeof tierParamsSchema>;

export const TIER_PARAMS: Record<Tier, TierParams> = {
  safe: {
    multiplyLeverageBps: 12000,
    extraBorrowPctBps: 5000,
    ltvBps: 5000,
    perpLeverageBps: 500,
  },
  conservative: {
    multiplyLeverageBps: 13000,
    extraBorrowPctBps: 5200,
    ltvBps: 5200,
    perpLeverageBps: 500,
  },
  balanced: {
    multiplyLeverageBps: 14000,
    extraBorrowPctBps: 5400,
    ltvBps: 5400,
    perpLeverageBps: 600,
  },
  optimistic: {
    multiplyLeverageBps: 15000,
    extraBorrowPctBps: 5600,
    ltvBps: 5600,
    perpLeverageBps: 600,
  },
  aggressive: {
    multiplyLeverageBps: 16000,
    extraBorrowPctBps: 5800,
    ltvBps: 5800,
    perpLeverageBps: 690,
  },
  yolo: {
    multiplyLeverageBps: 18000,
    extraBorrowPctBps: 6000,
    ltvBps: 6000,
    perpLeverageBps: 750,
  },
};
