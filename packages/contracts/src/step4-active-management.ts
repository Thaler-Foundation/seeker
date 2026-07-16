/**
 * SP3c-ii: target perp leverage for E/F at step-4 active management.
 *
 * Per user clarification 2026-06-14: at the 4th upside-borrow step
 * (cumulative pnl% reaches -114% against open-time cross-margin per
 * SP3a-followup), tiers aggressive + yolo trim their perp short via
 * Pacifica reduce_only until perp leverage equals this value. The 4x
 * target in the original strategy spec text was wrong (would put E/F
 * below Mode Safe's 5x); Optimistic's 6.0x is the corrected floor.
 *
 * One-shot per position lifetime; tracked via the persistent column
 * mode_positions.step4_active_mgmt_fired_at + a Postgres CAS in the
 * position repository.
 *
 * Cross-check: STEP4_DELEVER_TARGET_PERP_LEV * 100 must equal
 * TIER_PARAMS.optimistic.perpLeverageBps. The pinning test in
 * step4-active-management.test.ts enforces this so SP6's lev-bps
 * adjustment forces a deliberate update here.
 */
export const STEP4_DELEVER_TARGET_PERP_LEV = 6.0;
