import { z } from "zod";
import type { Tier } from "./vaults";

/**
 * Per-tier scheduler trigger profile. Single source of truth for the values
 * the modes scheduler consults on every tick: when to fire a scalp, when to
 * pre-scalp around funding, and what loss-as-%-of-cross-margin ladder the
 * upside-borrow steps trigger on.
 *
 * Each field's spec source is the strategy spec table in
 * memory/project_thaler_one_strategy_spec.md "Six Modes Overview" plus the
 * per-tier "Triggers" subsections (Scalps / Pre-scalps / Upside borrows).
 * Pinning tests prevent silent drift.
 *
 * SP3a-followup (2026-06-14): All 6 tiers share the same loss ladder
 * [45, 25, 23, 21] (incremental), producing cumulative [45, 70, 93, 114].
 * SP3a originally interpreted the strategy spec text
 *   "1st(-45%), 2nd(-70%), 3rd(-93%), 4th(-114%)"
 * as INCREMENTAL values for Conservative-YOLO, but Reading B (the correct
 * one) is that those numbers are CUMULATIVE pnl-as-%-of-margin thresholds
 * matching Safe's pattern. User confirmed Reading B 2026-06-14.
 */
export const tierTriggerProfileSchema = z.object({
  // Upside-borrow incremental loss ladder. Each entry is both
  //  (a) the incremental loss-as-% of cross-margin that fires the step, and
  //  (b) the fraction of |unrealized PnL| that the step borrows (legacy:
  //      the borrow-sizing formula moves to Task 3's formula Z).
  // All 6 tiers = [45, 25, 23, 21] (cumulative 45/70/93/114) per SP3a-followup.
  lossLadder: z.tuple([
    z.number().positive().max(200),
    z.number().positive().max(200),
    z.number().positive().max(200),
    z.number().positive().max(200),
  ]),
  // SOL %-drop from entry that triggers a scalp rebalance.
  scalpMinDropPct: z.number().positive().max(20),
  // Pre-scalp window before funding settlement, in milliseconds.
  preScalpWindowMs: z.number().int().positive().max(600_000),
  // Minimum positive PnL % for pre-scalp to fire (covers fees).
  preScalpMinProfitPct: z.number().nonnegative().max(10),
  // Maximum positive PnL % considered by pre-scalp; above this the regular
  // scalp handles it. Set equal to scalpMinDropPct per tier (pre-scalp captures
  // up to the scalp trigger before funding settlement).
  preScalpMaxProfitPct: z.number().positive().max(20),
});

export type TierTriggerProfile = z.infer<typeof tierTriggerProfileSchema>;

export const TIER_TRIGGERS: Record<Tier, TierTriggerProfile> = {
  safe: {
    lossLadder: [45, 25, 23, 21],
    scalpMinDropPct: 1.2,
    preScalpWindowMs: 300_000,
    // Pre-scalp profit band raised to 0.7%-1.2% (was 0.25%-1.2%) per the
    // latest config 2026-06-29: scalps stay at 1.2% (scalpMinDropPct), the
    // pre-scalp now fires only in the 0.7%-1.2% profit window before funding.
    preScalpMinProfitPct: 0.7,
    preScalpMaxProfitPct: 1.2,
  },
  conservative: {
    lossLadder: [45, 25, 23, 21], // SP3a-followup: was [45, 70, 93, 114]; all 6 tiers now share Safe's ladder per Reading B confirmed 2026-06-14
    scalpMinDropPct: 1.3,
    preScalpWindowMs: 300_000,
    preScalpMinProfitPct: 0.3,
    preScalpMaxProfitPct: 1.3,
  },
  balanced: {
    lossLadder: [45, 25, 23, 21], // SP3a-followup
    scalpMinDropPct: 1.4,
    preScalpWindowMs: 240_000,
    preScalpMinProfitPct: 0.4,
    preScalpMaxProfitPct: 1.4,
  },
  optimistic: {
    lossLadder: [45, 25, 23, 21], // SP3a-followup
    scalpMinDropPct: 1.6,
    preScalpWindowMs: 180_000,
    preScalpMinProfitPct: 0.5,
    preScalpMaxProfitPct: 1.6,
  },
  aggressive: {
    lossLadder: [45, 25, 23, 21], // SP3a-followup
    scalpMinDropPct: 1.8,
    preScalpWindowMs: 120_000,
    preScalpMinProfitPct: 0.5,
    preScalpMaxProfitPct: 1.8,
  },
  yolo: {
    lossLadder: [45, 25, 23, 21], // SP3a-followup
    scalpMinDropPct: 2.0,
    preScalpWindowMs: 120_000,
    preScalpMinProfitPct: 0.5,
    preScalpMaxProfitPct: 2.0,
  },
};
