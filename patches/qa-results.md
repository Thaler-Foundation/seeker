# QA results - Thaler Finance Mobile Figma (2026-07-16)

File zWDlvcaKwmnzMAfd387fF8. Every number below is script output from the
audits defined in qa-plan.md, run against pages 0:1 / 5:20 / 5:21.

## Q1 Operator frame - DONE

S7.6 Operator (admin) 42:836: ADMIN ONLY eyebrow, QUANT verify strip
(45/45), 4 operator metric cells, per-vault verified table with columns
Signer / Carry APY / Lev / LTV / Margin / Verify (QuantVaultRow subset,
schema verified 19/19 vs contracts), OK/WARN/FAIL tones, endpoint note.
Screenshot-validated.

## Q2 Claim highlight - VERIFIED + REBOUND

Audit showed the original bound paint already carried opacity 0.12 (the
saturated look was a small-scale render artifact). Final state: bound to
status/positive WITH opacity 0.12 (node 28:70), so it theme-switches and
counts as bound. Legibility screenshot-confirmed in dark and light.

## Q3 Light mode - PROVEN

Section "12 Light Mode Proof" 42:951: Portfolio (42:952) and Claim
(42:1009) duplicates with Color mode = Light. Full theme flip confirmed by
screenshot: #faf9f7 canvas, #ffffff cards, #0a0a0b text, #e5e5e5 borders.

## Q4 audit numbers (final, after Q5 fixes)

Contrast (WCAG ratios, all PASS at >= 4.5):
- text/primary on canvas 18.96
- text/muted on canvas 7.66
- text/muted on card 7.12
- positive on card 7.25
- tier safe on canvas 10.28
- button label on primary blue 4.83
- label on teal 11.01
- warn on canvas 9.21

Frames audited: 20. Unbound solid fills: 2 found -> 0 after rebind (both
were the Q2 explicit tint; whites/blacks/waves/charts/QR/marketing frames
are recorded exceptions). Default-named layers: 44 found -> 53 renamed
(parent-based names) -> 0 remaining on the Screens page. Touch-target
violations: 0 (Buttons >= 36, TabBarItems >= 48, pills >= 30).

Inventory: 13 component sets + 42 standalone components (27 icons +
ModeMark variants etc.), 66 variables (0 ALL_SCOPES), Color modes
[Dark, Light], 11 text styles, 5 effect styles.

## Q6 evidence

Full Screens-page render (20 frames incl. light-mode proofs) captured
2026-07-16. Foundations and Components pages screenshot-validated earlier
in-session (cover, swatches rebound to dark IDs, type specimen, spacing).

## Accepted exceptions (explicit, not failures)

- Wave/chart/QR SVG art and gradient fades use literal colors by design.
- Share card + dApp kit frames are fixed-dark marketing surfaces.
- White knobs/thumbs and black-on-teal/on-white chip labels are literal.
- Figma-side text uses Geist (Nexa is unavailable in Figma; Geist is the
  product's declared fallback). The app itself ships Nexa per web.

## Open items (explicitly out of this pass)

- Library publish + Code Connect mappings (optional, needs repo push
  decisions that are user-gated).
- dApp Store asset dimensions must be verified against the Publisher
  Portal before export (noted on the kit itself).
