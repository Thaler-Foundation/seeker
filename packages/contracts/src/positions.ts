import { z } from "zod";

const lamports = z.string().regex(/^-?\d+$/, "lamports as decimal string");

const tokenAmount = z.object({
  mint: z.string(),
  // SPL token decimals (9 for SOL/jitoSOL, 6 for USDC). Provided so the
  // frontend can convert `amountLamports` to UI without a separate mint
  // metadata fetch.
  decimals: z.number().int().nonnegative(),
  amountUi: z.string(),
  // Native token units (e.g., jitoSOL lamports for the jitoSOL token).
  // Same scale as `amountUi × 10^decimals`.
  amountLamports: z.string(),
  // SOL-equivalent value (jitoSOL × poolRate; SOL == lamports for SOL token).
  valueLamports: lamports,
});

const kaminoLendLeg = z.object({
  supply: z.object({
    marketAddress: z.string(),
    reserveAddress: z.string(),
    token: z.string(),
    decimals: z.number().int().nonnegative(),
    // `collateral` and `amountEarned` are in the supply token's native units
    // (10^decimals). Use `decimals` to format for display.
    collateral: z.string(),
    supplyApyBps: z.number().int(),
    amountEarned: z.string(),
  }),
  borrow: z.object({
    marketAddress: z.string(),
    reserveAddress: z.string(),
    token: z.string(),
    decimals: z.number().int().nonnegative(),
    // `debt` is in the borrow token's native units (10^decimals).
    debt: z.string(),
    // eMode liquidation LTV (LT, ~0.95 for jitoSOL/SOL) in bps — the threshold
    // backing `healthFactor`. Spec Full Matrix Part 1: HR uses the LT, not the
    // borrow cap.
    ltvBps: z.number().int(),
    // Borrow cap (maxLtv, ~0.90) in bps — distinct from the LT. Surfaced for
    // Upside Borrow tier-gating, which needs the cap, not the liquidation LTV.
    borrowCapacityLtvBps: z.number().int(),
    // HR = Collateral × stake_rate × liquidation_LTV / Debt (spec Part 1).
    healthFactor: z.number(),
    borrowApyBps: z.number().int(),
  }),
  netApyBps: z.number().int(),
});

// The vault's leveraged carry leg as a Kamino Multiply obligation (jitoSOL
// collateral / SOL debt). Distinct from `kaminoLend` (the legacy vanilla
// supply/borrow legs): a Multiply position lives in its own obligation PDA
// and is read straight from chain via the klend SDK — Kamino's REST serves
// mainnet only and can't see a fork-local obligation.
const kaminoMultiplyPosition = z.object({
  // Kamino Multiply obligation PDA for this vault wallet.
  obligationAddress: z.string(),
  // jitoSOL collateral and SOL debt in native lamports (both 9-decimal).
  collateralJitoSolLamports: lamports,
  debtSolLamports: lamports,
  // Current loan-to-value of the obligation, in bps.
  ltvBps: z.number().int(),
  // eMode liquidation-LTV threshold (the LT backing health), in bps.
  liquidationLtvBps: z.number().int(),
  // USD figures from the SDK's refreshedStats — telemetry / PnL display.
  userTotalDepositUsd: z.number(),
  userTotalBorrowUsd: z.number(),
  netValueUsd: z.number(),
  // Effective leverage of the obligation = collateral ÷ equity (≥ 1).
  // Equals 1/(1−ltv) — the extra borrow lifts it above the Multiply target.
  leverage: z.number(),
  // The Kamino Multiply target leverage configured at vault open (the
  // `--multiply-leverage` input). The Multiply leg alone targets this; the
  // obligation's effective `leverage` above runs higher after extra_borrow.
  multiplyTargetLeverage: z.number(),
  // Forward net carry APY (bps) of the Multiply leg = collateral yield −
  // borrow cost over equity, from the live jitoSOL pool rate + jitoSOL-supply
  // / SOL-borrow reserve APYs. Drives the Liquidation panel Vault Health label
  // (SAFE > 100 / CAUTION 0..100 / STRESS < 0).
  netCarryApyBps: z.number().int(),
});

const jitoStakingPosition = z.object({
  // Current state of the wallet's jitoSOL ATA (typically dust after open
  // since most jitoSOL goes to Kamino lend collateral and kliquidity LP).
  jitoSolBalance: z.string(),
  currentRate: z.number(),
  solValueLamports: lamports,
  // Lifetime flow (open execution): SOL sent to the Jito stake pool and
  // jitoSOL minted in return. Captured per-step at the orchestrator and
  // summed across all stake* steps. Stays constant after open.
  totalSolStakedLamports: lamports,
  totalJitoSolReceivedLamports: lamports,
  // Total jitoSOL the vault currently holds across all legs:
  // wallet ATA + Kamino lend collateral + kliquidity LP jitoSOL portion.
  // Equivalent to summing every place jitoSOL is parked. Updates with
  // every read.
  totalJitoSolHeldLamports: lamports,
});

// DEX backing the Kamino kliquidity strategy. ORCA = Whirlpool, RAYDIUM = CLMM,
// METEORA = DLMM. Maps from strategy.strategyDex via numberToDex.
const dexNameSchema = z.enum(["ORCA", "RAYDIUM", "METEORA"]);

const kliquidityPosition = z.object({
  // Kamino kliquidity strategy address (the "vault" in Kamino terminology).
  strategyAddress: z.string(),
  // Underlying DEX pool / whirlpool address that the strategy provides
  // liquidity to.
  poolAddress: z.string(),
  dex: dexNameSchema,
  tokenA: tokenAmount,
  tokenB: tokenAmount,
  ratioBps: z.number().int(),
  // LP swap-fee APY (DEX side). When `apyMode === '7d'` this matches the
  // venue's "7D Fees APY" (Kamino's published realized 7d number); when
  // `apyMode === '24h'` it's the SDK's 24h-volume estimate, used as a
  // fallback for brand-new strategies without 7d history.
  apyBps: z.number().int(),
  // Window covered by `apyBps` — drives the UI label.
  apyMode: z.enum(["7d", "24h"]),
  // Sum of farm reward APYs (e.g. JTO incentives boosting LPs). Matches the
  // "Incentives APY" segment of the venue's "Boosted Fees APY" total. 0 when
  // the strategy has no farm or no active emissions.
  incentivesApyBps: z.number().int(),
  withdrawableFees: z.object({
    tokenA: tokenAmount,
    tokenB: tokenAmount,
    // Reward emissions from the strategy's Kamino farm (e.g. JTO). Empty
    // when the strategy has no farm or no rewards have accrued yet for this
    // user. Each reward exposes its own per-mint APY and the farm-wide weekly
    // emissions (not per-user). `valueLamports` defaults to 0 since we don't
    // price arbitrary reward mints.
    rewards: z.array(
      tokenAmount.extend({
        // Strategy's reward vault account (or farm address as fallback) —
        // stable identifier even when the same mint is used in multiple slots.
        vaultAddress: z.string(),
        // Per-reward incentives APY in bps (e.g. 495 = 4.95% JTO).
        apyBps: z.number().int(),
        // Farm-wide weekly emissions for this reward in raw token units.
        weeklyEmissionsLamports: z.string(),
      }),
    ),
  }),
});

const perpsPosition = z.object({
  venue: z.enum(["hyperliquid", "pacifica"]),
  symbol: z.string(),
  side: z.enum(["LONG", "SHORT"]),
  sizeBase: z.string(),
  leverage: z.number(),
  entryPrice: z.number(),
  markPrice: z.number(),
  unrealizedPnlUsd: z.number(),
  // Return on margin in percent (e.g. -3.58 means -3.58% on the capital
  // posted = notional / leverage). With leverage > 1 a small price move
  // here is amplified vs. unrealizedPnlUsd / notional.
  unrealizedPnlPct: z.number(),
  collateralLamports: lamports,
  // SOL parked in the perp-DEX "spot" account for this user (cross-margin
  // pool on Pacifica; in sim mode it's the holding wallet's allocation for
  // this user's open shorts).
  spotBalanceLamports: lamports,
  // Cumulative funding settlement accrued while the position is open (signed
  // USD). Positive = user is owed (holding pays at close); negative = user
  // owes (deducted from settlement). Sim-only — real venues settle natively.
  // Optional for backwards compatibility with payloads from before the
  // funding-accrual change.
  accruedFundingPnlUsd: z.number().optional(),
  // Current venue funding rate, ANNUALIZED to a percent (e.g. 8.76 = +8.76%
  // APR). Sign is the venue's market rate: a positive rate means longs pay
  // shorts, so the vault's short EARNS funding. Optional + nullable for
  // rollout safety (a lagging API omits it; a funding-read failure sends null).
  fundingRateApr: z.number().nullable().optional(),
});

// SOL-denominated amount in three units: native lamports (string for bigint
// safety), human-readable SOL (decimal string for display), and optional USD
// (null when no live SOL/USD price feed is available). Used uniformly across
// every line of the claim preview so the frontend never has to convert.
const amountSol = z.object({
  lamports: lamports,
  sol: z.string(),
  usd: z.number().nullable(),
});

// One reward token (e.g. JTO) priced into SOL via Jupiter quote. The quote
// itself is cached in the kamino-liquidity adapter (see `rewardPrices` TTL
// cache); the preview just consumes the resulting SOL equivalent.
const claimPreviewReward = z.object({
  mint: z.string(),
  amountUi: z.string(),
  quotedSol: z.string(),
});

// Spec-aligned breakdown of what a user receives at claim time. Mirrors
// Thaler-One Full Matrix Part 1 (formulas), Part 9 (hybrid harvest model),
// and Part 12 (claim flow). See docs/full-matrix-spec-divergences.md for the
// authoritative mapping between this shape and the spec sections.
//
// Layout (yields-distribution model): the user is paid only the external
// yield — LP reward tokens swapped to SOL + perp funding/scalp profit — minus
// the service fee. `fundingPaidSol` is a deduction. The trailing rows are
// informational: the carry and LP fees AUTOCOMPOUND into the positions and are
// never paid out. `partial: true` signals at least one input failed (venue API
// down, price feed off) so the UI can show a warning.
const claimBreakdown = z.object({
  // ── User-facing yield components ─────────────────────────────────────
  lpRewardsSol: amountSol.extend({
    rewards: z.array(claimPreviewReward),
  }),
  // LIFETIME perp components — DISPLAY ONLY (Detailed Stats). They do NOT sum
  // into grossClaimableLamports; the claimable perp amount is
  // `withdrawablePerpProfitsSol` (the live recycled pool the claim drains).
  fundingReceivedSol: amountSol,
  fundingPaidSol: amountSol, // signed amount, lifetime deduction
  scalpProfitsSol: amountSol,
  preScalpProfitsSol: amountSol,
  // The live withdrawable perp pool (PRIMARY position recycledSol → SOL): the
  // perp leg of the claimable total (sums with lpRewardsSol to gross). Resets
  // after a claim as the payout decrements recycledSol. Optional for rollout
  // safety — a lagging API that omits it lets the client fall back to the
  // lifetime rows.
  withdrawablePerpProfitsSol: amountSol.optional(),
  // Net funding (received − paid since the funding cursor) the claim converts to
  // SOL and pays out THIS claim, already lot-floored to match the conversion.
  // The perp leg's other claimable component (sums with lpRewardsSol +
  // withdrawablePerpProfitsSol to gross); distinct from the lifetime
  // fundingReceived/Paid display rows. Optional for rollout safety — a lagging
  // API that omits it simply contributes 0 to the client's view of gross.
  claimableFundingProfitsSol: amountSol.optional(),

  // ── Aggregates ──────────────────────────────────────────────────────────
  grossClaimableLamports: lamports,
  serviceFeeBps: z.number().int().nonnegative(),
  serviceFeeLamports: lamports,
  netUserYieldLamports: lamports,
  netUserYieldUsd: z.number().nullable(),
  // Venue-capped "claim right now" figures: gross/net with the perp leg
  // clamped to the venue's live per-asset SOL availableToWithdraw (the same
  // cap the claim's withdraw applies). The headline gross/net above are the
  // EARNED pool, fee-sliced; these answer "what would a claim pay right now".
  // Optional for rollout safety, a lagging API omits them and the client
  // falls back to the headline net.
  releasableNowGrossLamports: lamports.optional(),
  releasableNowNetLamports: lamports.optional(),

  // ── Informational rows (AUTOCOMPOUNDED — NOT paid to the user) ─────────
  // Kamino Multiply carry surplus (jitoSOL appreciation − borrow interest),
  // left in the obligation to improve LTV/health. Clamped ≥ 0 for display.
  carryAutocompoundedSol: amountSol,
  // LP swap fees (jitoSOL/SOL) left compounding natively in the kLiquidity
  // strategy — never withdrawn.
  lpFeesAutocompoundedSol: amountSol,
  // Borrow interest accrued on the SOL debt this period — the carry's cost
  // line. Netted inside carryAutocompoundedSol; surfaced so the user sees it.
  interestPaidSol: amountSol,

  partial: z.boolean(),
  computedAtMs: z.number().int(),
});

// Lifecycle of a vault. Derived from the OPEN execution's state and the
// CLOSE execution (if any):
//   OPENING       — open in progress
//   OPEN          — open completed, vault active
//   OPEN_FAILED   — open failed; some legs may be partially set up
//   CLOSING       — close in progress (legs draining)
//   CLOSED        — close completed, vault wound down
//   CLOSE_FAILED  — close failed mid-way; partial state
export const vaultStatusSchema = z.enum([
  "OPENING",
  "OPEN",
  "OPEN_FAILED",
  "CLOSING",
  "CLOSED",
  "CLOSE_FAILED",
]);

export const vaultPositionsSchema = z.object({
  vaultId: z.string(),
  status: vaultStatusSchema,
  openedAt: z.number().int(),
  // Set when status is CLOSED/CLOSE_FAILED; null otherwise.
  closedAt: z.number().int().nullable(),
  baseline: z.enum(["open", "lastClaim"]),

  equityLamports: lamports,
  // For OPEN/OPENING/CLOSING/_FAILED: live equity summed across legs.
  // For CLOSED: equity at the moment close started (preCloseSnapshot) — so
  // pnl reflects yield generated during the vault's lifetime, not "everything
  // lost" (the recovered SOL went back to the agent wallet, separately).
  currentEquityLamports: lamports,
  // User-facing "Equity" = deposit + realized yield, in SOL (price-independent;
  // does NOT drift with the SOL price). The card + panel both render this.
  // Nullable for rollout safety: a lagging API that omits it falls back to the
  // deposit on the client.
  equityNavLamports: lamports.nullable(),
  pnlLamports: lamports,
  pnlBps: z.number().int(),
  // `apyBps` is the CARRY LEG only (jitoSOL appreciation − borrow interest):
  // a continuous flow that annualizes meaningfully. The perp leg's funding +
  // scalp profit is bursty and is intentionally NOT folded in here — see
  // `realizedYield*` below.
  apyBps: z.number().int(),
  // 30D APY = MEDIAN of the vault's per-day SOL-earned amounts over the last 30
  // days, annualized + clamped >=0. The dashboard "30D APY" is the median of this
  // across vaults. Optional (lagging SDK/web tolerant).
  apy30dBps: z.number().int().optional(),
  // Upside-borrow ladder steps currently fired and NOT yet repaid. Drives the
  // Liquidation panel Short Hedge label (SAFE 0 / CAUTION 1 / STRESS ≥ 2).
  activeUpsideBorrowCount: z.number().int(),
  daysHeld: z.number(),

  // Cumulative realized yield since the baseline — carry leg + perp leg
  // (funding net + scalp + pre-scalp) + LP farm rewards. NOT annualized:
  // perp scalp lands in discrete bursts, so annualizing a short window is
  // meaningless. This is the honest running total; the UI annualizes only
  // once `daysHeld` is large enough. Signed — a net perp loss drags it down.
  realizedYieldLamports: lamports,
  realizedYieldBps: z.number().int(),

  // Per-vault cumulative realized-yield curve, in SOL, built from THIS vault's
  // real EXECUTED scalp events (the time-stamped portion of realized yield).
  // Each point is the running total of scalp profit (USD→SOL at the live SOL
  // price) up to `ts`; the series ends at/near the vault's current total
  // realized yield. Optional + only the scalp component is plotted (carry +
  // funding have no local time series), so a vault with no scalp events / no
  // SOL price returns an empty array — never fabricated. The UI charts this
  // instead of portfolio-wide equity.
  yieldHistorySol: z
    .array(z.object({ ts: z.number(), earnedSol: z.number() }))
    .optional(),

  // BLUE "USDC Earned" series: the unswapped USDC profit sitting on the
  // Pacifica spot per snapshot capture, with a live tail point. The SOL series
  // above EXCLUDES this leg (each point subtracts it at its capture-time
  // price). Optional for SDK/fixture skew; empty until snapshots accrue.
  usdcHistoryUsd: z
    .array(z.object({ ts: z.number(), usd: z.number() }))
    .optional(),

  positions: z.object({
    jitoStaking: jitoStakingPosition,
    kaminoLend: z.array(kaminoLendLeg),
    // The leveraged carry leg. Null while OPENING (obligation not yet on
    // chain) or when the on-chain read fails.
    kaminoMultiply: kaminoMultiplyPosition.nullable(),
    kaminoLiquidity: kliquidityPosition,
    perps: perpsPosition.nullable(),
  }),

  // Server-computed claim preview — what the user would receive if they
  // claimed right now. Nullable for backwards compatibility during rollout
  // (Fase 2 of the spec-alignment plan); once wired, every OPEN vault should
  // carry a non-null preview here.
  claimPreview: claimBreakdown.nullable(),

  // PR3a: live early-close penalty. penaltyBps is the fee charged if the user
  // closes RIGHT NOW; it decays linearly from startBps at open to 0 over
  // decaySeconds (beta: 300 bps over 1 week). The UI renders penaltyBps/100 and
  // derives the decay progress from 1 - penaltyBps/startBps.
  earlyClose: z.object({
    penaltyBps: z.number().int(),
    startBps: z.number().int(),
    decaySeconds: z.number().int(),
  }),
  // Restored gate timestamps (epoch ms) so the UI can disable the close/claim
  // buttons and show the remaining time. Optional (lagging SDK/web tolerant);
  // closeUnlockAtMs null = no lock; claimNextAllowedAtMs null = never-claimed
  // or cooldown disabled.
  closeUnlockAtMs: z.number().nullable().optional(),
  claimNextAllowedAtMs: z.number().nullable().optional(),
  // Live claimable split for the "SOL Earned" display (task #45). The perp
  // profit already SWAPPED to SOL (claimableSol = the primary's recycledSol, a
  // FIXED SOL amount, shown PURPLE) vs the USDC NOT yet swapped
  // (pendingRecycleUsd, shown BLUE). The UI re-prices the USDC leg at the LIVE
  // SOL price so the SOL-equivalent moves in real time. Optional (lagging
  // SDK/web tolerant); null when there is no perp leg.
  claimableSol: z.number().nullable().optional(),
  pendingRecycleUsd: z.number().nullable().optional(),
  // Autocompounding SOL earned (Kamino Multiply carry + LP rewards), lamports.
  // Full SOL Earned = carryLpEarnedSol + claimableSol + pendingRecycleUsd /
  // liveSolPrice (the UI sums these with the live SOL price).
  carryLpEarnedSolLamports: z.string().optional(),
});

export type VaultPositions = z.infer<typeof vaultPositionsSchema>;
export type VaultStatus = z.infer<typeof vaultStatusSchema>;
export type KaminoLendLeg = z.infer<typeof kaminoLendLeg>;
export type KaminoMultiplyPosition = z.infer<typeof kaminoMultiplyPosition>;
export type KliquidityPosition = z.infer<typeof kliquidityPosition>;
export type PerpsPosition = z.infer<typeof perpsPosition>;
export type AmountSol = z.infer<typeof amountSol>;
export type ClaimBreakdown = z.infer<typeof claimBreakdown>;
export type ClaimPreviewReward = z.infer<typeof claimPreviewReward>;
