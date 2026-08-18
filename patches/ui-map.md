# Full UI map - Thaler Seeker

Read this first. This map was verified at main 4e841e0b on 2026-07-16.
Production main is now 8d96a358, 35 web commits later. The /dashboard and
/analytics rows and the Analytics KPI section were re-checked at 8d96a358.
Everything else still reflects 4e841e0b, so confirm before building from it.

## Repo divergence verdict (verified 2026-07-16, second remap)

Thaler-Foundation/frontend (private, standalone, pushed 07-15 10:23 UTC) and
Thaler-Finance apps/web (main 4e841e0b) have DIVERGED:
- frontend-only (design-authoritative): /portfolio route (nav Portfolio ->
  /portfolio; /vaults redirects), og share card 1200x750 full-bleed tier art
  (public/shareable-cards/hq) + stats column + qr-thaler.png, OpenAPI 0.0.2.
- Finance-only (user-mandated fixes the frontend has not absorbed):
  #393 Projected APY removed (frontend still shows it - stale there),
  #417/#418 claim releasableNow fee-sliced fields (absent in frontend's
  claim-yield-view), #419.
- Identical in both: hero copy (Earn yield from / market movement), flat nav
  labels, portfolio 5 KPIs incl. Median APY, analytics 4 KPI cells,
  bg-foreground CTAs, pill tabs, sign-in strings.
Seeker design synthesis: structure/new features from frontend + the
user-mandated Finance money-fixes. Vault detail Strategy Overview BigStats
at main: "Liquidity Managed" / "30D APY" / "Total Yield"
(vault/[risk]/page.tsx:476-487).

# (below: original remap from main 4e841e0b)

Every surface below is verified in source on this date. This map, plus
ui-fidelity.md (verbatim strings) and screens.md (screen list), is the
complete input for the Figma screens.

## LOGIN / FIRST SCREEN (user-dictated 2026-07-16)

The first login screen of the Seeker app reproduces the web hero's wavy
design with the title "EARN YIELD FROM MARKET MOVEMENT". This exactly matches
production copy: en.json hero.title1 "Earn yield from" + title2
"market movement" (rendered as two lines, hero display type).

Wavy backdrop recipe (HeroSection.tsx:82-101, exact):
- LineWaves: speed 0.12, innerLineCount 32, outerLineCount 36,
  warpIntensity 1, rotation -45, edgeFadeWidth 0, colorCycleSpeed 1,
  brightness 0.12, color1/2/3 #ffffff, mouseInfluence 2 (touch on mobile)
- Wrapper mask: linear-gradient(to right, transparent 0%,
  rgba(0,0,0,0.5) 25%, black 50%)
- Overlays: left w-2/3 from-background gradient + bottom h-48
  from-background gradient, both z-1, on the #0a0a0b canvas
- Figma realization: 32-36 thin white curved strokes at ~12% opacity,
  rotated -45deg, gradient-faded per the mask; app realization: static
  export or the ogl shader in a RN GL view
- Below the title: kicker "Non-custodial yield vaults on Solana" (eyebrow),
  subtitle "Deposit SOL or stablecoins into a non-custodial vault and earn
  consistent yield, regardless of market direction.", then the Privy email
  sign-in CTA (mobile replaces the web waitlist pill at this spot)

## Route-level map (web at main -> Seeker)

| Web surface | State | Seeker mapping |
|---|---|---|
| / landing (Hero, SplitFeature, PaymentRails, StrategyShowcase, Roadmap, FAQ, Blog, FinalCTA) | LIVE | Login screen (hero) + About sheet (rest) |
| /auth/sign-in (Privy email gate; errors: "Verification failed. Please try again.", "This account is not on the Thaler beta list.") | LIVE | Login flow states |
| /dashboard ("Vaults" grid; TopStats Total deposits + 30D APY; Featured Safe card w/ LineWaves; All Vaults table with all six tiers live, each row its own Projected APR + Total Deposits; copy "Earn from active strategies", "Track performance by NAV") | LIVE | Home tab |
| /vaults Portfolio (5 KPIs incl. Median APY; Net Value chart; tabs Vaults / Transaction History; columns Vault, Net Value, PnL, Net APY) | LIVE | Portfolio tab |
| /vault/[risk] (tabs Overview / My Vaults / Info & FAQs; Overview pills Vault Info / Advanced Info / Backtesting; sticky DepositPanel; TermsModal; VaultFundingGate; VaultOpenProgressModal; ClaimYieldForm 14 rows; position detail Net Value / Net APY) | LIVE, hosts the whole create flow | Vault detail + Create tab source |
| /strategies + /strategies/simulate | LIVE (static/mock) | Strategies screen + simulator |
| /analytics (KPI cells: Total Value Locked, Protocol Return Rate, Yield Generated, Active Vaults; TVL stacked chart 1W/1M/3M; APY by tier; allocations; strategy breakdown; OperatorDashboard admin) | LIVE | Analytics tab section + operator (admin) |
| /activity (pills All / Deposit / Withdraw / Harvest / Rebalance; table Category, Interaction, Detail, Strategy, Amount, Asset, Time, Status) | LIVE | Activity tab |
| Wallet drawer (Balances / Positions / Activity; Withdraw; Export wallet key) | LIVE (header) | Wallet bottom sheet |
| /blog, /terms, /privacy-policy | LIVE static | About/legal sheets |
| /dev/wallet-recovery | dev-only | not shipped |
| /settings, /create-vault standalone pages | REMOVED at main | Seeker keeps Settings + Create tabs built from the RETAINED sections, labeled |

## Retained-component inventory (design them, mark RETAINED)

deposit-form, tier-selector, hero-strip, strategy-detail, stage bar,
wallet-recovery-section (Move to Thaler wallet / Retire), accounts-section,
idle-watcher, display-currency/notifications/privacy sections, my-vault-card,
PortfolioCard/OpenPositions/RecentActivity/ClaimPreviewPanel widget set,
waitlist social flow (challenge/verify, Discord/X link, status, unlink),
funding-rates route. Backend endpoints for recovery flows are LIVE even
though the web UI is unmounted.

## Analytics KPI correction (supersedes older notes)

At main 8d96a358 the hero strip is 4 cells: "Total Value Locked",
"Protocol Return Rate", "Yield Generated", "Active Vaults"
(analytics-hero.tsx:360, 366, 372, 378). Timeframes 1W / 1M / 3M. The second
cell used to read "Protocol APY (net)" and the cells used to sit at 334-352;
both changed, so do not trust the older numbers.

## Data contract

Every numeric element binds to the operation and field named in api-map.md
(47 operations, coverage-proven). Claim UX gating and portfolio claimable
semantics per ui-fidelity.md.
