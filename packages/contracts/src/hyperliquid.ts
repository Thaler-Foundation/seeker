import { z } from "zod";

export const faucetSchema = z.object({
  walletId: z.string().min(1),
});

export const placeShortSchema = z.object({
  walletId: z.string().min(1),
  size: z.number().positive(),
  limitPx: z.number().positive(),
  reduceOnly: z.boolean().optional(),
  asset: z.string().min(1).optional(),
});

// P1d: destination removed from the contract. The use-case forces the
// withdrawal back to the signer's own address.
export const withdrawSchema = z.object({
  walletId: z.string().min(1),
  amount: z.union([z.number().positive(), z.string().min(1)]),
});

export type FaucetInput = z.infer<typeof faucetSchema>;
export type PlaceShortInput = z.infer<typeof placeShortSchema>;
export type WithdrawInput = z.infer<typeof withdrawSchema>;
