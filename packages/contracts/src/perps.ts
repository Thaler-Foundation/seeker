import { z } from "zod";

export const venueSchema = z.enum(["hyperliquid", "pacifica"]);
export const assetSchema = z.enum(["SOL", "USDC"]);

export const openShortSchema = z.object({
  venue: venueSchema,
  symbol: z.string().min(1),
  size_base: z.string().min(1),
  slippage_percent: z.string().optional(),
  leverage: z.number().int().positive().optional(),
  client_order_id: z.string().optional(),
  wallet_id: z.string().optional(),
});

export const closeShortSchema = z.object({
  venue: venueSchema,
  symbol: z.string().min(1),
  size_base: z.string().min(1),
  slippage_percent: z.string().optional(),
  client_order_id: z.string().optional(),
  wallet_id: z.string().optional(),
});

export const transferToSpotSchema = z.object({
  venue: venueSchema,
  asset: assetSchema,
  amount: z.string().min(1),
});

// P1d: destination removed from the contract. The use-case forces the
// withdrawal back to the signer's own address so a caller cannot redirect
// funds to an arbitrary external address.
export const withdrawFromSpotSchema = z.object({
  venue: venueSchema,
  asset: assetSchema,
  amount: z.string().min(1),
  wallet_id: z.string().optional(),
});

export const getAccountQuerySchema = z.object({
  venue: venueSchema,
  walletId: z.string().optional(),
});

export type Venue = z.infer<typeof venueSchema>;
export type Asset = z.infer<typeof assetSchema>;
export type OpenShortInput = z.infer<typeof openShortSchema>;
export type CloseShortInput = z.infer<typeof closeShortSchema>;
export type TransferToSpotInput = z.infer<typeof transferToSpotSchema>;
export type WithdrawFromSpotInput = z.infer<typeof withdrawFromSpotSchema>;
export type GetAccountQuery = z.infer<typeof getAccountQuerySchema>;
