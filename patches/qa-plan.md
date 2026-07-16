# Final QA + polish plan - Thaler Seeker Mobile Figma

File zWDlvcaKwmnzMAfd387fF8. Every check below is deterministic: it either
runs as a script against the file (results recorded in qa-results.md) or is
a screenshot comparison against a named source of truth. No check passes on
assumption.

## Q1. Build the last remaining frame: S7.6 Operator (admin)

Source of truth: operator-dashboard.tsx consumes the 5 quant hooks
(graph-verified 2026-07-16) and wraps operator-metrics.tsx (4 sections
Business / Risk / Performance / Exposure, admin double-gated). Table columns
come from the QuantVaultRow schema verified 19/19 against
Thaler-Finance packages/contracts/src/quant.ts:8: signerAddress, netCarryApyBps, leverage,
ltvPct, venueMarginRatioPct, verifyStatus (subset displayed on mobile).
Deliverable: one 412x915 frame in section "07 Analytics & Operator" with an
ADMIN ONLY eyebrow, verify/engine strip, 4 metric cells, and the per-vault
verified table.

## Q2. Claim highlight polish

Node 28:70 ("Claimable now (net of fee)" row in ClaimYieldBox 28:58): the
fill must be the positive green at a subtle tint. Check the paint's actual
opacity value; if the bound paint ignores the opacity key, replace with an
explicit rgba paint (16,185,129 at 0.12). Verify by screenshot that row text
stays legible and the row reads as a tint, not a solid chip.

## Q3. Light-mode proof pass

The Color collection is dual-mode (Dark 2:3 default, Light 14:0). Duplicate
two representative frames (S3.1 Portfolio 23:75, S4.8 Claim 30:273) into a
"Light mode" section and set setExplicitVariableModeForCollection(Color ->
Light) on the duplicates. Expected per tokens.md: canvas #faf9f7, cards
#ffffff, text #0a0a0b, borders #e5e5e5, ring #0066ff. Screenshot both;
elements that stay dark reveal unbound fills (feeds Q4a).

## Q4. Scripted audits (exact checks, run against pages 0:1, 5:20, 5:21)

- Q4a Unresolved bindings: count SOLID fills/strokes with no boundVariables
  on nodes inside component masters and screen frames. Allowed exceptions
  (recorded, not counted as failures): wave/chart/QR SVG art, gradient
  fades, marketing frames (share card, dApp kit) that are deliberately
  fixed-dark, white knobs/thumbs, black text on brand teal/white chips.
- Q4b Naming: count default-named layers (Frame/Rectangle/Ellipse/Vector
  auto-names) inside masters; screens tolerate SVG vector internals.
- Q4c Touch targets: every Button/TabBarItem/FilterPill instance on screens
  must have height >= 36 (SM buttons) and primary CTAs >= 44; tab items
  >= 48 incl. padding box. Report every violation with node id.
- Q4d Contrast (WCAG relative luminance, computed in-script): report exact
  ratios for the canonical pairs: #fafafa/#0a0a0b, #a1a1a1/#0a0a0b,
  #a1a1a1/#141416, #10b981/#141416, #99bbff/#0a0a0b, #ffffff/#0066ff,
  #0a0a0b/#00d9c0. Threshold: >= 4.5 body, >= 3.0 large/secondary text;
  anything below is listed with its usage sites and either fixed or
  explicitly accepted with rationale.
- Q4e Component inventory: count component sets + standalone components +
  variables + styles; assert zero ALL_SCOPES; assert Color has exactly
  modes [Dark, Light].

## Q5. Fixes

Apply targeted fixes for every Q4 failure that is not an accepted
exception; re-run the failing audit after each fix.

## Q6. Evidence + closeout

Full-page screenshots of Foundations, Components, Screens pages; write
qa-results.md with all counts/ratios.
