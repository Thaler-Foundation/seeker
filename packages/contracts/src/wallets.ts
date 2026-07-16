import { z } from "zod";
import { hexAddress } from "./common";

export const sendTxSchema = z.object({
  chainId: z.number().int().positive(),
  to: hexAddress,
  value: z.string().min(1),
  // Hex-encoded gas limit (e.g. "0x5208" for 21000). Privy doesn't auto-estimate;
  // RPCs reject with "intrinsic gas too low" if missing on chains like HyperEVM.
  // Defaults server-side to 0x5208 when omitted.
  gasLimit: z.string().optional(),
});

export type SendTxInput = z.infer<typeof sendTxSchema>;
