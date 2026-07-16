import type { Tier } from "./vaults";

/**
 * SP3b: 1:1 mode-to-tier mapping. The user-facing label is "Mode <Tier>"
 * (Safe, Conservative, Balanced, Optimistic, Aggressive, YOLO) but the
 * strategy registry uses the single-letter ID. After SP3b, mode_positions.mode
 * reflects the user's chosen tier so analytics + log lines align with the UI.
 *
 * Legacy mode_positions rows pre-dating SP3b have mode="A" regardless of tier;
 * they keep working because evaluate-position picks strategies[pos.mode] and
 * strategies.A is the same algorithm as B-F (modulo the id field). SP6 may
 * backfill legacy rows but it is not required for correctness.
 */
export const MODE_IDS = ["A", "B", "C", "D", "E", "F"] as const;
export type ModeId = (typeof MODE_IDS)[number];

export const TIER_TO_MODE: Record<Tier, ModeId> = {
  safe: "A",
  conservative: "B",
  balanced: "C",
  optimistic: "D",
  aggressive: "E",
  yolo: "F",
};
