# Plan: wire the backend API suite into Thaler-Foundation/frontend

Objective (user order 2026-07-16): bring the standalone frontend repo's API
wiring to parity with PRODUCTION (Thaler-Finance apps/web, main 4e841e0b,
the 47-operation spec docs/backend-openapi.yaml), while preserving the
frontend repo's own upgrades (/portfolio route, og share card 1200x750).

## Verified ground truth (all measured 2026-07-16)

- Diff counts frontend vs Finance: 24 files under src/app/api, 17 under
  src/lib, 15 under src/hooks (diff -rq, session scratchpad clone
  tf-frontend @ f61d0e8).
- Direction of drift: Finance BFF routes carry the F4 refactor (SDK-routed,
  zod-validated, withThalerClient error envelope); frontend routes are the
  older raw-fetch versions. Finance carries #393 (Projected APY removed),
  #417/#418 (claim releasableNow fee-sliced fields - ABSENT from frontend's
  claim-yield-view.ts), #419. Frontend carries /portfolio (with /vaults
  redirect) and the og share card; those stay untouched.
- Dependency model difference (critical): Finance web imports @thaler/sdk +
  @thaler/contracts workspace packages; the frontend repo has ZERO
  thaler-scoped deps (package.json verified) and its own src/lib/api/
  {client,errors,fetch-thaler,route-helpers}.ts.

## Decision required before executing (do not assume)

How the frontend consumes the SDK/contracts:
- Option A (recommended): vendor packages/sdk/src + packages/contracts/src
  from Finance main into frontend src/lib/thaler/{sdk,contracts}/, adapt
  imports, pin provenance in the commit message. Keeps zod validation
  end-to-end and makes the 24 route files near-verbatim ports.
- Option B: keep frontend's raw-fetch client and hand-port each route's
  logic. Smaller tree, loses contract validation, drifts again immediately.
The user picks A or B; everything below assumes A.

## Execution steps (each with its gate)

1. Full clone (current clone is depth-1; branching needs history):
   git clone Thaler-Foundation/frontend, branch feat/api-wiring-parity-
   2026-07-16 (fresh branch per standing mandate; never reuse).
2. Vendor sdk+contracts from Finance main 4e841e0b; adapt tsconfig paths.
   Gate: bun run typecheck clean on the vendored tree alone.
3. Port the 24 BFF route files (adopt Finance versions, imports rewritten
   to src/lib/thaler/*). Diff each against the frontend original first;
   NEVER blind-copy where the frontend file contains frontend-only logic
   (17 lib diffs may include their own utilities - each reviewed).
4. Port the 15 hook diffs + claim components (claim-yield-view.ts,
   claim-yield-form.tsx with the 14-row layout and releasableNow gating)
   + the #393 Projected APY removal on vault/[risk].
   Gate: bun run typecheck + bun run test.
5. Preserve frontend-only surfaces: /portfolio, /vaults redirect,
   og/vault-share (only param/wiring parity if its data fields drifted).
6. Ship: pre-push `gh pr list --repo Thaler-Foundation/frontend` check,
   push the fresh branch, open ONE fresh PR titled
   "feat: API wiring parity with production apps/web (47-op spec)".
   No docs files committed, no attribution lines, commit messages state
   provenance (Finance main 4e841e0b) per repo conventions.

## Risks stated plainly

- Push permission to Thaler-Foundation/frontend is UNVERIFIED (clone worked
  via AlexGrey42; write access is assumed but not proven until push).
- bun availability in this environment for the frontend's typecheck/test
  scripts is unverified (Finance uses bun; same assumed here).
- The frontend repo may have uncommitted conventions (AGENTS.md/CLAUDE.md
  exist in its root - MUST be read before the first commit; not yet read).
- "Green typecheck/tests != venue-correct behavior" (standing rule): this
  port changes wiring, not money math, but the claim fields feed real
  numbers - the PR body must say verification is code-level only.

## Figma follow-through (done this session)

S5.1 rebuilt as the production DepositPanel verbatim (You deposit box,
WHERE YOUR SOL GOES prose, MiniRows "Target APY (net)" / "Projected
Earnings (annual)" / "Service Fee: 11% (on yield)" / "Vault Creation Fee:
0.06 SOL reserve" per OPEN_FEE_BUFFER_LAMPORTS=60_000_000n mode-a.ts:32,
FIXED_SOL=2 page.tsx:1832, bg-foreground CTA). Old bars/tier cards/stage
bar removed from that frame.
