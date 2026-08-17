# UI fidelity spec - verbatim strings and recipes

Read this first. The strings here were captured at main 4e841e0b on
2026-07-16. Production main is now 8d96a358, 35 web commits later. The All
Vaults note was re-checked at 8d96a358. Treat every other verbatim string as
needing a fresh check against the current file before you copy it.

SOURCE PRIORITY (corrected 2026-07-16): 1) Thaler-Foundation/frontend
(private standalone Next app, the NEWEST UI - /portfolio route replaces
/vaults which now redirects; og share card 1200x750 full-bleed tier art from
public/shareable-cards/hq + left stats column; OpenAPI 0.0.2 lives there),
2) Thaler-Finance apps/web main 4e841e0b (mirrored by Thaler-Foundation/page
sync). Diff against the frontend repo BEFORE trusting Finance web.

The Seeker app must look like the CURRENT web UI. Everything below is quoted
from source on 2026-07-16. Figma screens must use these exact labels.

## Portfolio (/vaults, PortfolioPage)

KPI strip, exactly 5 cells in this order (vaults/page.tsx:208-216), each
`rounded-xl border border-border bg-card p-5 text-center`:
1. "Net Value"
2. "Yield Earned" - signed value, green tone when >= 0 else red
3. "Claimable Yield" - GREEN tone (not blue)
4. "Active Vaults"
5. "Median APY" - "{x.toFixed(2)}%", green (label is Median APY, not Blended)
Chart card title: "Portfolio Net Value", legend "Portfolio net value".
Tabs: "Vaults" | "Transaction History".
Vault list columns: Vault | Net Value | PnL | Net APY (NO LTV column).
Header: h1 "Portfolio" text-4xl font-bold tracking-tight.

## Claim Yield box (claim-yield-form.tsx, LIVE on /vault/[risk])

Row labels in order (lines 320-427):
- "SOL Earned"
- "USDC Earned"
- "Generated (total)"
- "Claimable now (net of fee)"  <- gates the Claim button (releasableNowNet)
- "Funding received (lifetime)"
- "Funding paid (lifetime)"
- "Realized, pending swap to SOL"
- "Carry (autocompounded)"
- "Net Carry (APY)"
- "LP Rewards (JTO) to swap"
- "LP Fees (autocompounded)"
- "Equity"
- "Days held"
- "Claim locked" (locked state)
Footer copy: "Claiming pays the external yield (LP rewards + funding/scalp)
to your Thaler wallet, minus ..." (line 482).

## Wallet drawer (wallet-drawer.tsx, LIVE, opens from header)

Title "Wallet"; tabs/sections: "Balances" / "Positions" / "Activity".
Strings: "Wallet Balance", "Thaler Vaults", "Withdraw", "Sending...",
"Withdrawal failed.", "No open vaults yet", "No activity yet",
"Export wallet key" (sheet with KeyExportSection), withdraw form validates
"Base58 Solana address", confirm asks to "Repeat the address",
copy action "Copy wallet address". Balance row asset "Solana", entry
"Thaler vault". Mobile: bottom sheet, same sections.

## Dashboard (/dashboard)

Verified new copy at main: "Earn from active strategies", "Track performance
by NAV". Structure per prior verification: h1 "Vaults", TopStats "Total
deposits" + "30D APY", "Featured" + How-it-works, Featured Safe Vault card
(LineWaves backdrop, tier #99BBFF), "All Vaults" table with all six tiers
live. The B-F "Coming soon" state is gone; at main 8d96a358 LIVE_TIERS is the
full TIER_ORDER (dashboard/page.tsx:31) and each row renders its own numbers.

## Data bindings the visuals must respect (spec-verified)

- Portfolio "Claimable Yield" = UserVaultStatsView.claimableNetTotalSol
  served summed by the backend; the page does no math (vaults.ts:196-199).
- Per-row claimable = UserVaultStatRow.claimableNetSol (post-fee, clamped
  >= 0); claimableSol is the raw pre-fee pool, do not display as claimable.
- Claim button gating = ClaimBreakdown.releasableNowNetLamports; headline
  yield = grossClaimableLamports/netUserYieldLamports (earned pool).
- ClaimBreakdown.partial === true renders a warning state on the claim box.
- VaultMetrics: apyBps (carry), apy30dBps (median 30d, clamped >= 0),
  healthFactor, claimableLamports, pnlBps, claimableSol, pendingRecycleUsd -
  spec matches contracts 7/7 exactly.
- UserVaultStatRow spec matches contracts 10/10 exactly; QuantVaultRow 19/19.
- ClaimBreakdown 19/19 top-level; the nested lpRewardsSol.rewards[]
  ({mint, amountUi, quotedSol}) is prose-typed in the spec (candidate to
  schema-type in v0.0.3); the claim box LP row may show reward mint detail.

## NEW UI recipes (protected routes, verified 2026-07-16, supersede anything blue)

- PRIMARY CTA = bg-foreground text-background (white pill, dark label on the
  dark theme): vault/[risk]/page.tsx:1998 ("mt-5 w-full rounded-xl
  bg-foreground py-3.5 ... text-background"), dashboard/page.tsx:256, 9
  occurrences across live surfaces. NEVER brand-blue buttons.
- TABS = pill switchers, active pill bg-foreground text-background
  (vault/[risk]/page.tsx:1537,1907), inactive = bordered/muted pill.
- Secondary/outline buttons follow border tokens, not brand blue. Teal
  (#00d9c0) and violet (#8b5cf6) button surfaces are OLD Altitude ramps and
  do not appear in the protected UI.
- Brand blue survives only as: focus ring (#0066ff/#3387ff), chart line
  #5B9DF9, and the blue-400 pending-USDC sublines.
- Source parity: Thaler-Foundation/page repo's apps/web is byte-identical
  to Thaler-Finance main apps/web (foundation/sync/web-packages-2026-07-15,
  empty git diff). One source of truth.
- Share/marketing: X share card is VERTICAL - wave image band on top, stats
  below (user-dictated 2026-07-16); all marketing assets portrait-first.

## Verbatim tone rules

Positive/earned: green. Losses/destructive: red. Pending USDC: blue-400 sub
lines (vaults/page.tsx:50 area). Tier accent only from TIER_META color.
No em dashes in any copy.
