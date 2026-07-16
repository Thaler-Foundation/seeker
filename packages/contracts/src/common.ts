import { z } from "zod";

export const hexAddress = z
  .string()
  .regex(/^0x[a-fA-F0-9]{40}$/, "must be a 0x-prefixed EVM address")
  .transform((s) => s as `0x${string}`);
