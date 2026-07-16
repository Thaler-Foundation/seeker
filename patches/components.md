# Component library scope - Thaler Seeker Figma design system

Component set for Figma, derived from `apps/web/src/components/ui` (20
primitives) plus the composed patterns the screens need. Variants follow
`Property=Value` naming. Icons via one INSTANCE_SWAP icon component, never a
variant per glyph.

## Foundations (variables + styles first, before any component)

- Color collection, 2 modes (Light/Dark): background, foreground, card,
  border, input, ring, muted, muted-foreground, destructive + statics
  primary/secondary/accent/success/warning/error + thaler-positive/negative/
  warning + the 6 tier colors + capital-flow set
- Spacing collection: 4, 8, 12, 16, 20, 24, 32, 40 (+ tap-target 48 min)
- Radius collection: sm 6, md 8, lg 10, xl 12, 2xl 16, full
- Text styles: display (Nexa 700 32 / -0.03em), h1-h3, body 14/300, caption,
  eyebrow (10 uppercase widest), mono-numbers (tabular)
- Effect styles: altitude-sm/md/lg/xl shadows

## Primitives (from components/ui)

| Component | Variants / props |
|---|---|
| Button | variant default(#0066ff)/secondary/accent/destructive/outline/ghost/link/success x size sm/default/lg/xl/icon x state default/hover/pressed/disabled/loading |
| Card | base + Header/Title/Description/Content/Footer; sectioned variant (divide-y) |
| Badge | default/secondary/accent/success/warning/error/outline/ghost |
| Input | label, error, helper; states default/focus/error/disabled |
| Dialog / Sheet | modal + mobile bottom-sheet variant, blurred overlay |
| Dropdown / Select / Popover / Tooltip | standard Radix states |
| Slider | single + two-thumb range, optional tier color |
| Calendar (date field) | popover picker |
| Table / List row | header, row, sortable header |
| Toast | success/error/system |
| Skeleton | card/table/chart + pulse rows |
| Spinner / Loader | generic + brand triangle logo-spin |
| EmptyState | icon + copy + CTA |
| ErrorBanner | title, detail, retry (not dismissible) |
| ThemeSwitcher | sun/moon ghost icon |

## Brand and identity

- ThalerMark, ThalerNeoMark, ThalerHodlMark, wordmark "thaler." (Inter 800)
- ModeMark (6 tier glyphs on tier-color circle)
- Protocol logo set (~37: kamino, jupiter, pacifica, hyperliquid, jitosol,
  msol, usdc family, orca, raydium, meteora, solana, marginfi, phoenix,
  bullet, privy, cloudflare-workers, mode-safe..yolo)
- Circuit-board texture exports (tier palettes + capital-flow) and LineWaves
  hero export

## App chrome (mobile-specific)

- Bottom tab bar (5 tabs, active state, badge dot)
- Top app bar (title, back, WalletBalance SOL+USD, WalletAddressPill copy)
- StageBar (numbered 1 Configure / 2 Fund / 3 Open)
- Filter pill row
- Currency toggle (USD/SOL)

## Domain components

| Component | Source |
|---|---|
| TopStat / FeaturedStat / KPI cell | dashboard, analytics hero |
| BigStat + FactRow | vault detail Overview / position detail |
| TierSelector card (6 modes, locked "Soon" state) | create-vault |
| HeroStrip (identity tile, APY range, floor, min) | create-vault |
| DepositForm block | create-vault |
| ComparisonProgressBar / ScaledProgressBar (striped "locked" debt pattern) | create-vault |
| VaultFundingGate (address, required/current, progress) + QR | fund stage |
| TermsModal (scroll-gated agreement) | create-vault |
| VaultOpenProgress step list (8 steps, playful labels) + ExecBadge | open stage |
| VaultCloseProgress / VaultDismantleProgress | lifecycle |
| Claim Yield box (Generated / Autocompounded / Realized / Claimable, releasableNow row) | claim-yield-form + claim-yield-view |
| Vault row (tier dot, net value, PnL, LTV, APY) | portfolio |
| VaultChartCard (range toggles) | portfolio + vault detail |
| Health ratio badge (SAFE/CAUTION/STRESS) | RETAINED health-ratio-badge |
| PositionPanel + ClaimPreviewPanel + RecentActivity + OpenPositions | RETAINED dashboard widgets |
| MyVaultCard (position summary, claim/close/unwind/share actions) | RETAINED my-vault-card |
| Activity row (EventIcon, StatusPill, AmountCell) | activity-log table |
| Analytics charts (stacked TVL, APY lines + floors, donuts) | analytics |
| Strategy breakdown row | analytics |
| Operator Cell grid + quant verified table row | operator-dashboard |
| Wallet pair row (status badge, Move/Retire) | wallet-recovery-section |
| PrivateKeyReveal (masked, eye, copy, download, 20s note) | key-export |
| StrategyCard (3-zone: identity, pillars, venues) | strategies |
| SimulatorCard (replay chart, transport controls, markers) | simulate |
| Share yield card (story 1080x1920, square 1080x1080) | share-yield-modal / og route |
| Waitlist pill form + confirmation | HeroWaitlistForm |
| Social link row (Discord / X link, unlink) | RETAINED waitlist flow + accounts |
| WalletDrawer (balance, vault rows, activity, withdraw, export entry) | wallet-drawer.tsx, the LIVE wallet hub at main; mobile bottom sheet |
| VaultOpenProgressModal | vaults/vault-open-progress-modal.tsx (modal form of the open progress, LIVE on vault/[risk]) |

## Mount-state corrections (verified 2026-07-16 at main 4e841e0b)

LIVE: wallet-drawer, terms-modal, vault-funding-gate,
vault-open-progress-modal, key-export-section (inside the drawer).
RETAINED (zero importers): deposit-form, tier-selector, hero-strip,
strategy-detail, stage bar/progress-bar, wallet-recovery-section,
accounts-section, idle-watcher, display-currency/notifications/privacy
sections, my-vault-card, the dashboard widget set, waitlist social flow.
Web nav is flat: Dashboard / Portfolio / Analytics (dashboard-header.tsx:23-27);
no /settings and no /create-vault pages exist.

## Accessibility rules

- Touch targets 48px min, focus ring #0066ff / #3387ff
- Contrast per canvas: charcoal on pale, near-white on #0a0a0b
- Reduced-motion variants for every animated pattern
