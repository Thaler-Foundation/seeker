# Production UI truth (graph + grep extraction, 2026-07-16)

Sources of truth per the user's ruling:
- Thaler-Finance apps/web protected routes at main 4e841e0b (live on Vercel)
- Thaler-Foundation/frontend upgrades (clone: scratchpad/tf-frontend-full), notably /portfolio

Graph inventory basis: code-review-graph function list of the 12 live UI files.
Every string below is verbatim from the quoted file:line.

## 1. vault/[risk]/page.tsx (Finance)

### SolToken (:90-98)
`<img src="/solana-logo.png" alt="SOL" class="shrink-0 rounded-full object-contain">`
Deposit row usage: `size-7` (:1958). History cell usage in frontend portfolio: `size-4`.

### DepositPanel (:1934-2010)
- Head row: "Create Vault" (text-lg font-semibold) + tier chip: rounded-full px-2.5 py-1
  text-[11px], bg = `${meta.color}1f` (12% tint), text = meta.color, label = meta.label
  ("Safe", #99BBFF for tier safe per tier-meta.ts:18-24).
- Deposit box (muted/30, border/60, rounded-xl, p-5):
  row1 "You deposit" | "~$424.80" (usd = 2 x live solPriceUsd)
  row2 SolToken size-7 + "SOL" (text-lg semibold) | "2" (text-3xl semibold tabular)
  row3 "Fixed at 2 SOL · Private Beta" (MIDDLE DOT, not period)
- "WHERE YOUR SOL GOES" eyebrow, then the jitoSOL/Kamino/Pacifica paragraph.
- FactRows: "Target APY (net)" green range, "Projected Earnings (annual)" green,
  "Service Fee" = "11% (on yield)", "Vault Creation Fee" = "0.06 SOL reserve".
- CTA "Deposit 2 SOL" bg-foreground text-background; pending "Preparing…".
- Fund stage CTA "Open vault", pending "Opening…", secondary "Back".

### MyVaultsTab (:1140-1268)
Sub-pills (rounded-full px-4 py-2.5 text-[15px], icon h-4 w-4):
- "Vaults" (VaultIcon)
- "Liquidation Analysis" (SquareMousePointer)
- "Transaction History" (List)
Selected: border-foreground/40 bg-muted; unselected: bg-muted/40 text-muted-foreground.
attentionVaults = tier vaults in FAILED | PENDING | RUNNING with no close.

### MyVaultsTable (:1002-1140)
Grid `1.4fr repeat(4,1fr) 104px`: Strategy | Net Value | Net APY | Yield | LTV | Manage.
VAULT_COLUMNS (:936-941): netValue "Net Value", netApy "Net APY", yield "Yield", ltv "LTV".
Header: uppercase text-xs text-muted-foreground. Sort default netValue desc.

### PendingVaultRow (:1268-1360)
States: "Building your vault…" (RUNNING/PENDING), "Failed", "FAILED";
"Retrying your vault", "Could not resume", "Unknown error",
"Unwind started", "Unwinding the vault - funds return to your wallet as SOL.",
"Could not start unwind". Actions: Retry / Unwind.

### PositionSidebar (:1360-1383)
No selection: renders the DepositPanel. Selection: renders ClaimYieldForm.

### VaultPositionDetail (:1384-1568)
Stat labels: "SOL Earned" (green, lifetime realizedYieldLamports), "Net APY",
"USDC Earned" (green, unswapped pendingRecycleUsd), "SOL Managed" (deposit snapped
to 2 SOL multiples), "Days Held".
Yield toggle SOL | USD; chart purple for SOL, blue for USD.
Alt labels: "SOL Earned (excl. USDC)", "USDC Earned (unswapped)",
"SOL yield, excl. USDC (USD)".

### LiquidationAnalysis (:1568-1652)
Card (rounded-xl border bg-card p-6): h2 "Your Risk Summary".
2-col FactRows: "Your Net APY" (green if >= 0 else amber), "Net Value" ("N.NNNN SOL"),
"Vault Health" (SAFE > 100bps net carry, CAUTION 0..100, STRESS < 0),
"Short Hedge" (SAFE 0 active upside borrows, CAUTION 1, STRESS >= 2).
SAFE green-500, CAUTION/STRESS amber-500.
Footer paragraph: "The position is delta-neutral, so liquidation risk is driven by
the SOL borrow rate relative to the staking carry rather than SOL price. The
position is actively rebalanced to keep a wide safety margin away from the
liquidation threshold."

### InfoTab (:1731-1814)
"Vaults Info", "Asset Details"; labels "30D APY", "Utilization", "Total Deposits".

## 2. claim-yield-form.tsx (Finance)
LockButton (:65-106): countdown via formatCountdown (:49), sub line
"text-xs tabular-nums opacity-80". Locked label "Claim locked" (:427).

## 3. wallet-drawer.tsx (Finance)
- Header: address pill (formatAddress 4) fallback "Wallet"; copy label "Copy wallet address".
- Segmented primary: "Wallet Balance" | "Thaler Vaults" (:208-210).
- Big total: "{sol} SOL" text-4xl bold; sub "≈ ${usd}".
- Segmented secondary: "Balances" | "Positions" | "Activity" (:224-226).
- Balances list: SolMark + "SOL" / "Solana"; "Thaler vault" rows.
- Withdraw: "Withdraw to external wallet", "Destination (Solana address)",
  "Base58 Solana address", "Re-type destination to confirm", "Repeat the address",
  "Addresses do not match.", "Not a valid Solana address.", "Enter a positive amount.",
  "Withdrawal sent.", "Export wallet key".
- Segmented style: container rounded-xl border bg-muted/30 p-1; item rounded-lg
  px-3 py-2.5 text-sm; selected bg-background border shadow-sm.

## 4. /portfolio (frontend repo, upgrade layer)
Route: (protected)/portfolio/page.tsx. Supersedes the /vaults listing.
- Header: h1 "Portfolio" (text-4xl bold) + "Track all your Thaler positions in one place";
  right side: outline button "Share yield" (Share2 icon) + CurrencyToggle (SOL | USD).
- 5 KPI cards (rounded-xl bg-card p-5 text-center, value text-2xl semibold):
  "Net Value", "Yield Earned", "Claimable Yield" (green), "Active Vaults",
  "Median APY" (green).
- VaultChartCard: title "Portfolio Net Value", color #9945FF, defaultRange "7D",
  legend "Portfolio net value". Data: /api/thaler/analytics/equity-history?days=365
  -> { points: [{ date, equitySol }] } (use-analytics.ts:47-60).
- Tabs are UNDERLINE style (border-b-2, text-lg semibold, -mb-px pb-3.5):
  "Vaults" | "Transaction History".
- VaultsList (:376-472): same grid as MyVaultsTable; row = tier dot + label/sublabel,
  Net Value, Net APY (green/amber), Yield ("N.NNNN SOL" green), LTV ("N.NN%"),
  outline "Manage" button. Row links /vault/{tier}?tab=position&vault={id}.
  Empty state: "No vaults yet" + "Create your first delta-neutral vault to start
  earning." + CTA "Create a vault" (bg-foreground). Loading "Loading your vaults…".
- TransactionHistory (:473-550): card p-6, h2 "Transaction History";
  columns `1.3fr 1fr 1fr 0.8fr 0.8fr`: Date | Type | Vault | Tokens | Value.
  Type cell = green badge (bg-green-500/10 text-green-500 rounded-md px-2 py-1 text-xs).
  Tokens cell = amount.toFixed(2) + SolToken size-4. Value = USD or "N.NNNN SOL".
  Empty "No activity yet." Loading "Loading activity…".
- KPI median: "MEDIAN of the user's per-vault Net APY", claimable = spot recycledSol
  (SOL only, USDC excluded on this page).

## 5. Other confirmed surfaces (already built, reverified)
- dashboard/page.tsx: TopStat (:373), FeaturedStat (:382), modeApyText (:167);
  featured 30D APY = single pooled %, Deposited in SOL (tvlSol).
- analytics/page.tsx: h1 "Analytics", subtitle "Across all Thaler vaults. Every figure
  aggregates positions opened by every user on the protocol.", 4 KPI cells,
  strategy breakdown, "Coming soon" for empty tiers.
- Login: waves hero + "Earn yield from market movement" title only.
- No Activity log tab, no Settings page anywhere in production IA.
- Scalp discriminator: eventType === 'SCALP' (transformer.ts:162).

## 6. Deltas found this audit (all fixed 2026-07-16)
1. Figma S5.1: token circle was a gradient ellipse -> real solana-logo.png fill;
   TierChip was opaque blue -> #99BBFF 12% tint + #99BBFF "Safe" text. DONE.
2. Middle dot "·" in "Fixed at 2 SOL · Private Beta": Figma text 56:1051 and
   app create.tsx. DONE.
3. App portfolio.tsx "Thaler One · Safe" (3 rows). DONE.
4. App portfolio tabs -> underline style per /portfolio. DONE.
5. App portfolio "Portfolio Net Value" chart, #9945FF, 7D/30D/3M,
   /api/thaler/analytics/equity-history?days=365. DONE.
6. App portfolio history Type -> green tinted badge. DONE.
7. App portfolio: "Share yield" button (production tweet text + thaler.finance
   via native share) and "Display Value In SOL/USD" toggle wired to money(). DONE.
8. Figma S3.1 23:75: PortfolioActions row (ShareYieldBtn 86:694 tree), purple
   chart vectors 23:120/23:121, ranges 30D/3M, underline tabs 23:122. DONE.
9. Figma S4 30:127: header label order flipped (label above value), "SOL Price"
   label, "Low risk" chip 30:149 tinted, SolToken 80:696, underline main tabs
   30:158. DONE.
10. Figma S4.8 30:273: underline tabs 30:295, sub-pills row 82:699 with real
    lucide vault/square-mouse-pointer/list icons, PositionHead 83:690
    ("Safe · Position Overview" + Share), stats relabeled SOL Earned / USDC
    Earned (12.48 USDC green) / Net APY with ORIGINAL case, FactRows 83:702
    (SOL Managed 2 SOL, Days Held 34.0). DONE.
11. Wiring patch em-dash lines: verified byte-identical copies of Finance
    production files (only @thaler/sdk -> @/lib/sdk import swaps differ), so
    they are production comments, kept verbatim; commit message and pr-body.md
    verified clean. No patch change.
12. Seeker src header comments shrunk to one line each, 11 files. DONE.

13. Figma S4.9 87:688 NEW: Liquidation Analysis sub-tab screen (clone of S4.8,
    pill states swapped, RiskSummaryCard 87:872 verbatim per section 1). DONE.

## 7. Backlog build 2026-07-16 (all DONE)
14. App route vault/[risk].tsx NEW: header (back + SolToken + "{label} Vault" +
    "{riskLabel} risk" chip + SOL Price / Hedged on), underline tabs Overview |
    My Vaults | Info & FAQs; Overview pills Vault Info / Advanced Info /
    Backtesting with Strategy Overview card (Liquidity Managed / 30D APY /
    Total Yield + 4 facts), Liquidity Managed #9945FF + APY tier-color charts
    (analytics.tvlByModeDaily + /api/apy-history), backtest sim
    ((1+median)^(d/365)-1, bands from lib/mock/strategies.ts) + verbatim
    disclaimer; My Vaults sub-pills with table, PendingVaultCard wired to POST
    resume/dismantle, position detail (SOL Earned / Net APY / USDC Earned +
    SOL Managed / Days Held, NetAPY (1+Y/E)^(365.25/max(D,30))-1) and claim box
    wired to POST vaults/:id/claim + claimableNetSol; Liquidation card
    (netCarryApyBps >100/>=0 and upside-borrow 0/1/2+ thresholds); Info tab
    (30D APY / Utilization / Total Deposits + Asset Details). Navigation wired
    from home featured + tier rows and portfolio rows
    (/vault/{tier}?tab=position&vault={id}).
15. App wallet.tsx REBUILT to drawer parity: mono addr + copy + Disconnect,
    Wallet Balance | Thaler Vaults segmented totals, Balances / Positions /
    Activity views, withdraw form wired to POST
    wallets/recovery/withdraw-to-external (base58 + retype + amount checks,
    verbatim errors, "Withdrawal sent." + Solscan link), export gate
    (acknowledge + type EXPORT) wired to POST wallets/export showing
    address + privateKey with Clear from screen. The invented "Settings." list
    is gone.
16. Figma S8.0 rebuilt to drawer parity; S8.1 Withdraw, S8.2 Export,
    S4.10 Vaults list + Pending states created (node ids in
    the Figma ledger; file zWDlvcaKwmnzMAfd387fF8).
Gates: seeker tsc 0 errors; expo export android Hermes bundle 6MB.

## 8. Second-pass audit 2026-07-16 (user challenge; all fixed)
17. APY_RANGE tiers C-F were assumed values; corrected verbatim from
    strategies.ts: balanced 8.7-14.8, optimistic 9.1-15.6, aggressive 9.6-17.2,
    yolo 10.2-19.8. All six tier descriptions embedded verbatim.
18. FAQS (page.tsx:1696-1731): 8 verbatim Q&As were missing; added as an
    accordion in the app Info tab (FaqList).
19. VaultInfoCard (page.tsx:856-926): Vault Info card with description,
    How It Works, Liquidation Risk bullets, Show more/less; added to app
    Overview between the facts card and the charts.
20. VaultsTable: now sortable (default netValue desc, toggleSort semantics
    from :1030), 6 columns incl. LTV and Manage inside a horizontal scroll
    (mirrors overflow-x-auto min-w-[680px]); Figma S4.10 header got the
    active desc chevron + dim dual chevrons (94:762/766/770).
21. Position detail: Share button with the production per-vault tweet text,
    back link moved above the card, SOL|USD toggle + Realized Yield chart from
    positions yieldHistorySol (SOL purple #9945FF, USD blue #5B9DF9).
22. Claim box: YIELD BREAKDOWN / FUNDING + SCALPS (PERP) / CARRY (KAMINO
    MULTIPLY) / LIQUIDITY POOL (JITOSOL/SOL) sections with verbatim row labels
    (SOL Earned, USDC Earned, Generated (total), Claimable now (net of fee),
    Funding received/paid (lifetime), Realized, pending swap to SOL,
    Carry (autocompounded), LP Fees (autocompounded)) from positions
    claimPreview (contracts positions.ts:211-232).
23. Liquidation tab now polls the first open vault's positions
    (page.tsx:1177-1182 semantics) instead of falling back to stale metrics.
24. Tier Transaction History rebuilt to MyVaultsTransactions layout
    (page.tsx:1652-1695): Date | Type | Tokens, green type badge, amount 2dp +
    SolToken; wallet Activity now includes Open/Close/Claim rows with
    "label · time" subs.
Gates re-run: tsc 0 errors, Hermes bundle 6MB, comment sweep clean.
