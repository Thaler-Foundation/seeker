# Design tokens - Thaler Seeker

Every value below is verified against source. File references are the single
source of truth; if code and this doc ever disagree, code wins.

## Theme canvases (globals.css @layer base)

| Token | Light (`:root`) | Dark (`.dark`, DEFAULT) |
|---|---|---|
| background | `#faf9f7` (warm off-white) | `#0a0a0b` (true Altitude black) |
| foreground | `#0a0a0b` | `oklch(0.985 0 0)` (near-white) |
| card / popover | `#ffffff` | `#141416` (one step off canvas) |
| border | `oklch(0.922 0 0)` | `oklch(1 0 0 / 10%)` |
| input | `oklch(0.922 0 0)` | `oklch(1 0 0 / 15%)` |
| ring (focus) | `#0066ff` | `#3387ff` |
| muted-foreground | `oklch(0.556 0 0)` | `oklch(0.708 0 0)` |
| destructive | `oklch(0.577 0.245 27.325)` | `oklch(0.704 0.191 22.216)` |

Dark is the default theme (next-themes `defaultTheme='dark'`, no system).

## Brand ramps (globals.css @theme, theme-invariant)

| Token | Hex | Line |
|---|---|---|
| primary (electric blue) | `#0066ff` | globals.css:44 |
| secondary (teal, BLACK foreground) | `#00d9c0` | globals.css:58 |
| accent (violet) | `#8b5cf6` | globals.css:72 |
| success | `#10b981` | globals.css:86 |
| warning | `#f59e0b` | globals.css:99 |
| error | `#ef4444` | globals.css:112 |

Status runtime vars: `--thaler-positive #10b981`, `--thaler-negative #ef4444`,
`--thaler-warning #f59e0b` (identical both themes).

## Strategy tier palette (apps/web/src/lib/vaults/tier-meta.ts)

| Tier | Mode | Hex | Risk | Multiply | Perp lev | Health | Venue |
|---|---|---|---|---|---|---|---|
| Safe | A | `#99BBFF` | Low | 1.2x | 5x | 1.85 | Pacifica |
| Conservative | B | `#99FFDD` | Low | 1.3x | 5x | 1.65 | Pacifica |
| Balanced | C | `#BBFF99` | Medium | 1.4x | 6x | 1.45 | Pacifica |
| Optimistic | D | `#FFDD99` | Medium | 1.5x | 6x | 1.35 | Hyperliquid |
| Aggressive | E | `#FF99BB` | High | 1.6x | 6.9x | 1.28 | Hyperliquid |
| YOLO | F | `#DD99FF` | High | 1.8x | 7.5x | 1.18 | Hyperliquid |

The borrow LTV cap per tier is NOT in tier-meta.ts. It lives in
packages/contracts/src/tier-params.ts as `ltvBps`, in basis points:

| Tier | ltvBps | as a percent |
|---|---|---|
| Safe | 4231 | 42.31 |
| Conservative | 4857 | 48.57 |
| Balanced | 5467 | 54.67 |
| Optimistic | 6121 | 61.21 |

An earlier version of this page showed 50, 52, 54, 56 and credited tier-meta.ts.
Both the numbers and the source were wrong.

Shared market constants: `MAX_LTV_PCT = 90`, `LIQUIDATION_LTV_PCT = 93`
(tier-meta.ts:101-102). LST is jitoSOL and lending is Kamino Lend on all tiers.
Only Safe ships today; B-F render locked ("Soon").

## Capital-flow / bar colors (deposit-form projected position)

| Use | Hex |
|---|---|
| Kamino collateral (jitoSOL) | `#14F195` |
| Liquidity tail / Solana purple | `#9945FF` |
| Short hedge | `#4A8AFF` |
| Debt (borrowed) | `#7A8A9A` |
| Position LTV readout | `#3ECF8E` |
| Liquidation LTV readout | `#F5A623` |

## Typography

| Face | Weights | Load | Use |
|---|---|---|---|
| Nexa | 700 Bold, 300 Light | @font-face `/fonts/NexaBold.woff`, `/fonts/NexaLight.woff` | brand/display, first in `--font-sans` |
| Geist | variable | next/font | body fallback, app chrome |
| Inter | 800 | next/font (component-scoped) | the `thaler.` wordmark |
| monospace | platform default | `--font-mono` fallback (JetBrains Mono referenced but never loaded) | numerals |

Type rules: base 14px, body weight 300, headings 700 + tracking-tight,
`font-display` utility = Nexa 700 / 32px / -0.03em, all monetary numbers
`font-mono tabular-nums`. Eyebrows: 10px uppercase tracking-widest muted.

Figma note: if Nexa is unavailable in Figma, substitute per the
discover-product-font reference and record the mapping; never silently fall
back to Inter for display text.

## Radius, spacing, elevation

- `--radius: 0.625rem` (10px). Cards `rounded-xl`, controls `rounded-lg`, badges/pills `rounded-full`, landing panels 18/24/32px.
- Card recipe: `rounded-xl border border-border bg-card shadow-lg backdrop-blur-sm`; sectioned card splits with border-t / divide-y.
- Shadows: `.shadow-altitude-sm/md/lg/xl`, layered rgba(0,0,0,0.04-0.08).
- Density: `data-density` compact/comfortable; hide-balances blurs `font-mono tabular-nums` 6px.

## Iconography and decoration

- Brand marks: ThalerMark (triangle in circle), ThalerNeoMark (hollow square), ThalerHodlMark (X); ModeMark = per-tier Lucide glyph (ShieldCheck, Unlock, Scale, TrendingUp, Flame, Rocket) on a parent-supplied tier-color circle.
- Icon set: lucide. ~37 protocol/token logos in `apps/web/src/components/icons/protocols/`.
- Decoration: procedural circuit-board PCB (seeded, tier palettes + capital-flow palette) and the LineWaves WebGL hero. Mobile uses static exports of both, not live shaders.
- Motion: reveal blur+slide 0.72s cubic-bezier(.22,1,.36,1), staggered 80ms steps; everything gated by prefers-reduced-motion.

## Semantics used across screens

- Positive/yield: green; losses/destructive: red; claimable: blue; pending: amber/yellow.
- Tier accents only via inline tier color, never a hardcoded second palette.
- No em dashes anywhere in UI copy; hyphens or commas only.
