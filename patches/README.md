# Thaler Seeker documentation

Full documentation of the Seeker app build (Figma design file:
zWDlvcaKwmnzMAfd387fF8).

## App build

- [app-architecture.md](app-architecture.md): stack, directory map, navigation,
  auth flow, data layer, static-content policy, build gates.
- [app-screens.md](app-screens.md): every screen as built, its production
  counterpart file:line, and its data sources and mutations.
- [api-map.md](api-map.md): screen to backend operation map, against the
  OpenAPI 0.0.2 spec (docs/backend-openapi.yaml, 42 paths / 47 ops). The app
  reaches these through the website, see how the data flows in
  MOBILE-BUILD-STEPS.md.
- [tokens.md](tokens.md): color, spacing, radius, and type tokens mirrored from
  apps/web globals.css and tier-meta.ts.
- [mobile-platform.md](mobile-platform.md): Solana Mobile / Seeker platform
  notes (Expo, MWA, dApp Store).

## Parity record

- [production-truth.md](production-truth.md): canonical verbatim map of the
  production UI (Thaler-Finance apps/web protected routes at main 4e841e0b plus
  the Thaler-Foundation/frontend /portfolio upgrades) and the full audited
  delta/fix history, file:line sourced.
- [ui-map.md](ui-map.md) / [ui-fidelity.md](ui-fidelity.md): repo-divergence
  verdict and fidelity audit notes.
- [qa-plan.md](qa-plan.md) / [qa-results.md](qa-results.md): QA checklists and
  results (contrast, variables, touch targets, modes).

## Design system and assets

- [components.md](components.md): component library scope (Figma design
  system derived from apps/web/src/components/ui).
- [icons-svg.md](icons-svg.md): icon path sources (lucide-react 0.546.0).
