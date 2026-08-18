# Thaler Seeker - screen map (as built)

Every screen in src/app, its production counterpart, and its data sources.

Read this first. The file:line references below were captured at main 4e841e0b
on 2026-07-16. Production main is now 8d96a358, which is 35 web commits and
82 changed files later, so line numbers will have moved and some behaviour has
changed. The Home, Create and Analytics entries were re-verified at 8d96a358
and say so inline. Everything else still reflects 4e841e0b, so confirm against
the current file before you build from it.

## Login - src/app/index.tsx

Production: landing hero + sign-in-form.tsx.
- Real captured wave hero backdrop (components/waves.tsx, assets hero-waves.png)
- Title only: "Earn yield from market movement"
- Email -> code OTP flow; denied card "This account is not on the Thaler beta
  list."; error "Verification failed. Please try again."
- Gate allowed -> replace to /(tabs)/home

## Home - src/app/(tabs)/home.tsx

Production: dashboard/page.tsx.
- Header: "Vaults" h1, SOL Price TopStat, Wallet pill -> /wallet
- FEATURED + "How it works"; featured card (THALER ONE / Safe Vault) with
  Projected APR and Total Deposits (tvlSol)
- ALL VAULTS: 6 tier rows, all six live and pressable. each row shows its own
  Projected APR (latest apyByModeDaily point for that mode) and its own
  deposits (strategyBreakdown tvlSol for that mode), the same per tier sources
  the web dashboard uses. re-verified at main 8d96a358.
- Data: GET /api/stats (public) + GET /api/thaler/analytics. Every row pushes
  /vault/{tier}

## Portfolio - src/app/(tabs)/portfolio.tsx

Production: frontend /portfolio page (the upgrade layer).
- "Portfolio" h1 + "Track all your Thaler positions in one place"
- Actions row: "Share yield" outline button (native share, production tweet
  text) + "Display Value In SOL|USD" toggle (drives money())
- 5 KPI cards: Net Value, Yield Earned, Claimable Yield, Active Vaults,
  Median APY (median of per-vault Net APY)
- "Portfolio Net Value" chart, #9945FF, ranges 7D/30D/3M, from
  GET /api/thaler/analytics/equity-history?days=365
- Underline tabs Vaults | Transaction History
- Vaults rows (dot, tier label, nav/yield/APY) -> vault detail deep link
- History: green type badges; rows synthesized like lib/activity/transformer:
  Open/Close/Claim per vault + EXECUTED Upside Borrows (triggers) and
  Scalp/Pre-Scalp (scalps, eventType === 'SCALP' discriminator)
- Data: vault-stats, vaults, modes/triggers, modes/scalps, equity-history,
  /api/stats (SOL price)

## Create - src/app/(tabs)/create.tsx

Production: DepositPanel (vault/[risk]/page.tsx:1934-2010).
- Stages configure -> fund -> open. the web now takes a typed amount and a tier
  pick, with per tier bounds (safe 6 to 1111 SOL). the "Fixed at 2 SOL ·
  Private Beta" line is gone from the web and from this app. re-verified at
  main 8d96a358.
- "You deposit" ~$ = amount x live SOL price; WHERE YOUR SOL GOES paragraph;
  Projected APR (net), Projected Earnings (annual), Service Fee
  "11% (on yield)", Vault Creation Fee "0.06 SOL reserve"
  (CreateVaultPanel, vault/[risk]/page.tsx:2274-2280, re-verified at 8d96a358)
- Open progress: 8 production step labels
- Data/mutations: vault-wallets provisioning, dual-wallet balance, vault open
  execution + state polling, /api/stats

## Analytics - src/app/(tabs)/analytics.tsx

Production: analytics page + analytics-hero.tsx.
- "Analytics" h1 + verbatim subtitle ("Across all Thaler vaults. ...")
- 4 KPI cells: Total Value Locked, Protocol Return Rate, Yield Generated,
  Active Vaults
- STRATEGY BREAKDOWN rows per mode (dot, label, count/tvl/APY). every mode
  renders its real numbers, including a zero count. the web has no "Coming
  soon" state here. re-verified at main 8d96a358.
- Data: GET /api/thaler/analytics

## Vault detail - src/app/vault/[risk].tsx

Production: vault/[risk]/page.tsx end to end.
- Header (:302-325): back, real SolToken, "{label} Vault", "{riskLabel} risk"
  chip (tier color 13% tint), HeaderStats "SOL Price" + "Hedged on"
- Underline tabs (:328-350): Overview | My Vaults | Info & FAQs

### Overview tab
- Pills: Vault Info | Advanced Info | Backtesting (:440-442)
- Strategy Overview card: Liquidity Managed / 30D APY / Total Yield BigStats +
  facts Collateral Asset jitoSOL, Debt Asset SOL, Hedge Venue, Borrow Rate
  Type Variable Rate (:495-511); stats from analytics strategyBreakdown
  (:190-235 semantics: apy30dMedianBps ?? projectedApyBps, tvlSol, lifetime
  yield + pending USDC at live price)
- Vault Info card (:856-926): tier description + expandable How It Works and
  Liquidation Risk, Show more/less
- Charts: Liquidity Managed #9945FF (analytics tvlByModeDaily / SOL price),
  APY in tier color (GET /api/apy-history?tier&days=30)
- Advanced Info: "Advanced Info is coming soon."
- Backtesting (:676-696 math): range chips 30/90/180/365 days, Avg. Net APY /
  Projected Return / Duration, #5B9DF9 projected-return curve, verbatim
  disclaimer; bands verbatim from lib/mock/strategies.ts

### My Vaults tab
- Sub-pills (:1186-1190): Vaults | Liquidation Analysis | Transaction History
- Pending cards (:1268-1360): FAILED -> "Build stopped partway..." + Unwind
  (POST vaults/:id/dismantle) + Retry (POST vaults/:id/resume);
  PENDING/RUNNING -> "Building your vault…"
- Vaults table (:1002-1140): horizontal scroll (min width 680), sortable
  headers (default netValue desc), columns Strategy | Net Value | Net APY |
  Yield | LTV | Manage; row metrics per :952-1000 incl. Net APY
  (1 + Y/E)^(365.25/max(D,30)) - 1
- Position detail (:1384-1568): back link, dot + "{label} · Position Overview"
  + Share (native share, per-vault production tweet text); BigStats SOL
  Earned (with live USD sub) / Net APY / USDC Earned; facts SOL Managed
  (2-SOL snapped) / Days Held; Realized Yield chart with SOL|USD toggle
  (yieldHistorySol; SOL purple, USD blue)
- Claim Yield card: claimable net (vault-stats claimableNetSol), verbatim
  breakdown sections from positions claimPreview (YIELD BREAKDOWN, FUNDING +
  SCALPS (PERP), CARRY (KAMINO MULTIPLY), LIQUIDITY POOL (JITOSOL/SOL)) and
  POST vaults/:id/claim
- Liquidation Analysis (:1568-1651): "Your Risk Summary" with Your Net APY /
  Net Value / Vault Health (net carry bps >100 SAFE, 0..100 CAUTION,
  <0 STRESS) / Short Hedge (0/1/2+ upside borrows) + verbatim delta-neutral
  paragraph; polls the first open vault's positions
- Transaction History (:1652-1695): Date | Type | Tokens, green type badge,
  2dp amount + SolToken

### Info & FAQs tab
- Vaults Info: 30D APY / Utilization / Total Deposits (:1785-1789)
- Asset Details: verbatim SOL paragraph
- 8 verbatim FAQ entries (:1696-1731) as an accordion

## Wallet sheet - src/app/wallet.tsx (modal)

Production: components/wallet/wallet-drawer.tsx.
- Header: mono short address + "Copy wallet address"/"Copied" + Disconnect
- Segmented: Wallet Balance | Thaler Vaults (switches the big total);
  total "{sol} SOL" + "≈ ${usd}"
- Segmented: Balances | Positions | Activity
  - Balances: SOL / Solana row, 9dp + USD
  - Positions: open vault rows ("Thaler vault") or "No open vaults yet"
  - Activity: Open/Close/Claim + EXECUTED Upside Borrow and Scalp/Pre-Scalp
    rows, "label · time" subs, or "No activity yet"
- "Withdraw to external wallet": verbatim intro, Available, destination +
  re-type + amount fields with verbatim errors, POST
  wallets/recovery/withdraw-to-external, success "Withdrawal sent." +
  Solscan link
- "Export wallet key": verbatim warnings, acknowledge + type EXPORT gate,
  POST wallets/export, per-wallet address + privateKey + Copy key +
  "Clear from screen"
