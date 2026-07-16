import { z } from "zod";

// Defense-in-depth ceiling for APY (bps). Looser than the API-side display clamp
// (±100% = ±10_000 bps) so a legitimately-clamped value never gets rejected, but
// still rejects an egregious un-clamped artifact (the 600% = 60_000 bps that
// slipped through). Last line of defence behind domain/analytics/apy clamping.
export const APY_BPS_SCHEMA_LIMIT = 50_000;
const apyBpsSchema = z
  .number()
  .int()
  .min(-APY_BPS_SCHEMA_LIMIT)
  .max(APY_BPS_SCHEMA_LIMIT);

// Per-mode public stat: TVL (SOL + USD) and the mode's projected APY (bps),
// plus its active-vault count. `mode` is the closed six-letter enum (A..F).
export const protocolModeStatSchema = z.object({
  mode: z.enum(["A", "B", "C", "D", "E", "F"]),
  tvlSol: z.number(),
  tvlUsd: z.number(),
  apyBps: apyBpsSchema,
  vaultCount: z.number().int().nonnegative(),
});
export type ProtocolModeStat = z.infer<typeof protocolModeStatSchema>;

// PR6: public, unauthenticated protocol stats for the external landing page +
// third-party integrators (TVL aggregators).
// totalTvlSol = sum of active-vault open-time equity in SOL; totalTvlUsd is that
// at the live SOL price. safeApyBps is the Mode-A (Safe) projected APY;
// blendedApyBps is the TVL-weighted projected APY across ALL active modes (the
// "blended APY of all vaults"); byMode is the per-mode breakdown.
export const protocolPublicStatsSchema = z.object({
  totalTvlSol: z.number(),
  solPriceUsd: z.number(),
  totalTvlUsd: z.number(),
  safeApyBps: apyBpsSchema,
  // TVL-weighted projected APY across all active modes (bps).
  blendedApyBps: apyBpsSchema,
  activeVaultCount: z.number().int().nonnegative(),
  byMode: z.array(protocolModeStatSchema),
  asOf: z.string(), // ISO timestamp
});
export type ProtocolPublicStats = z.infer<typeof protocolPublicStatsSchema>;
