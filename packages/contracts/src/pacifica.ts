import { z } from "zod";

export const placeMarketOrderSchema = z.object({
  symbol: z.string().min(1),
  side: z.enum(["bid", "ask"]),
  amount: z.string().min(1),
  reduce_only: z.boolean().optional(),
  slippage_percent: z.string().optional(),
  client_order_id: z.string().optional(),
});

export const depositUsdcSchema = z.object({
  amountUsdc: z.union([z.number().positive(), z.string().min(1)]),
});

// P1c: the deposit recipient is no longer a request parameter. The deposit
// program derives it server-side from the signer's address so a caller
// cannot redirect their own SOL into a different user's Pacifica account.
export const depositSolSchema = z.object({
  amountSol: z.union([z.number().positive(), z.string().min(1)]),
});

export const withdrawSpotSchema = z.object({
  symbol: z.string().min(1),
  amount: z.string().min(1),
  idempotency_key: z.string().optional(),
  agent_wallet: z.string().optional(),
});

export type PlaceMarketOrderInput = z.infer<typeof placeMarketOrderSchema>;
export type DepositUsdcInput = z.infer<typeof depositUsdcSchema>;
export type DepositSolInput = z.infer<typeof depositSolSchema>;
export type WithdrawSpotInput = z.infer<typeof withdrawSpotSchema>;
