import { z } from "zod";

/**
 * Canonical vault-open step kinds.
 * Listed in the exact execution order (step 1 -> 8).
 * Single source of truth shared by:
 *   - apps/api/src/domain/vaults/math.ts (StepPlan discriminated union)
 *   - apps/api/src/application/vaults/use-cases/run-open-vault.ts (executeStep switch)
 */
export const VAULT_STEP_KINDS = [
  "kamino_lut_setup",
  "stake_initial",
  "multiply_deposit",
  "extra_borrow",
  "stake_tail",
  "kliquidity_deposit",
  "kliquidity_stake_farm",
  "perp_open_short",
] as const;

export const vaultStepKindSchema = z.enum(VAULT_STEP_KINDS);

export type VaultStepKind = z.infer<typeof vaultStepKindSchema>;

export const VAULT_STEP_COUNT = VAULT_STEP_KINDS.length;
