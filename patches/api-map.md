# Screen to endpoint map - Thaler Finance

Source: `backend-openapi.yaml` v0.0.2, which lives only in the Thaler-Finance
working tree at `docs/` and is never committed, so it cannot be resolved from a
clone of this repo. It now carries 43 paths and 48 operations; the counts below
were taken when it carried 42 and 47. Auth: every `/v1/*`
needs x-api-key + Privy Bearer; `/health` and `/public/protocol/*` are open.
The app never talks to Pacifica, Hyperliquid, or Kamino directly.

Mobile calls the same-origin BFF pattern as web, or the Railway API directly
with the same hybrid auth via a mobile BFF; the operation IDs below are the
contract either way.

| Screen | Operations |
|---|---|
| S1.1 Sign-in / allowlist | Privy SDK + wl_session mint (web BFF /api/auth/allowlist, no /v1) |
| S1.5 Wallet provisioning | ensureDualWallet (POST /v1/dual-wallet?solana=1, idempotent) |
| S1.6 Waitlist email | web BFF /api/waitlist/email (Neon + Resend, no /v1) |
| S1.7 RETAINED social verify | web BFF /api/waitlist/{challenge,verify,discord/*,twitter/*,status,unlink} |
| S2.1 Home stats | getPublicProtocolStats (GET /public/protocol/stats) |
| S2.1 Home vault list | listVaults (GET /v1/vaults/sol-jito-kamino) |
| S3.1 Portfolio KPIs | getUserVaultStats (GET /v1/vault-stats: UserVaultStatRow.claimableNetSol, UserVaultStatsView.claimableNetTotalSol) + listVaults |
| S3.2 Net value chart | getEquityHistory (GET /v1/analytics/equity-history?days=N) |
| S3.3 Vault rows enrichment | getVaultPositions per id (GET /v1/vaults/sol-jito-kamino/{id}/positions) |
| S3.4 / S6.1 Activity | listVaults + listModeTriggers (GET /v1/modes/triggers) + listModeScalps (GET /v1/modes/scalps) + getSolPrice (GET /v1/modes/sol-price), rows synthesized client-side |
| S4.2-4.3 Vault overview | getAnalytics (GET /v1/analytics: tvlByModeDaily, apyByModeDaily, strategyBreakdown) + getPublicApyHistory (GET /public/protocol/apy-history?tier&days) |
| S4.6 Position detail | getVaultPositions (kaminoMultiply ltvBps, liquidationLtvBps, leverage, netCarryApyBps; daysHeld at top level; healthFactor is NOT on kaminoMultiply, read it from kaminoLend[].borrow.healthFactor or VaultSummary.metrics.healthFactor) |
| S4.8 Claim box | getVaultPositions.claimPreview -> ClaimBreakdown (grossClaimableLamports, netUserYieldLamports, releasableNowGrossLamports, releasableNowNetLamports) |
| S4.9 Claim action | claimVaultYield (POST /v1/vaults/sol-jito-kamino/{id}/claim) + getVaultClaim (GET, 3s poll) |
| S4.11 / S5.1 Preview | previewVault (GET /v1/vaults/sol-jito-kamino/preview?equityLamports&tier: finalState.collateralSol/lpTailSol/debtSol/extraBorrowSol, perpPlan.notionalSol) |
| S5.1 Provision pair | createVaultWallets (POST /v1/vault-wallets, perpVenue) |
| S5.3 Funding gate | getSolanaDualWalletBalance (GET /v1/dual-wallet/solana/balance, 5s poll) |
| S5.4 Open + progress | openVault (POST /v1/vaults/sol-jito-kamino) + getVaultExecution (GET /{id}, 3s poll, 8 steps) |
| S5.5 Resume / unwind | resumeVault (POST /{id}/resume), dismantleVault (POST /{id}/dismantle) + getVaultDismantle (GET) |
| S5.7 Close | closeVault (POST /{id}/close) + getVaultClose (GET) |
| S7.1-7.5 Analytics | getAnalytics + getEquityHistory |
| S7.6 Operator (admin) | getOperatorMetrics (GET /v1/analytics/operator) + getQuantOperatorView (GET /v1/quant/operator) + getQuantVaultsView (GET /v1/quant/vaults: QuantVaultRow.venueMarginRatioPct) + getQuantSeries (GET /v1/quant/series?metric&days) + getQuantVaultSeries (GET /v1/quant/vaults/{signer}/series) + getQuantVaultHistory (GET /v1/quant/vaults/{signer}/history) + getQuantHealth + getQuantVerifyResults + getQuantUserView |
| S8.3 Accounts | Privy client SDK + web BFF /api/auth/privy/me |
| S8.4 Recovery | listVaultWallets (GET /v1/vault-wallets) + transferVaultToDual (POST /v1/wallets/recovery/transfer-vault-to-dual) + closeVaultWallet (POST .../close-vault-wallet) + withdrawDualToExternal (POST .../withdraw-to-external) |
| S8.5 Key export | exportWalletKeys (POST /v1/wallets/export; only ever returns the dual-signer key; pairId is rejected) |
| Header balance | getSolanaDualWalletBalance (30s poll) |
| S8.0 Wallet drawer | getSolanaDualWalletBalance + listVaults + activity aggregate + withdrawDualToExternal + exportWalletKeys (the LIVE withdraw/export surface at main) |
| Diagnostics | getHealth, getModesHealth |
| Positions feeds | listModePositions (GET /v1/modes/positions), getModePosition (/{id}), listPositionScalps (/{id}/scalps), simulateUpsideBorrow (POST /v1/modes/simulate-upside-borrow) - no web consumer today, available for mobile positions views |
| No UI surface (spec-covered, design none) | ensureSolanaDualWallet (POST /v1/dual-wallet/solana), sendEvmTxAsAgent + sendEvmTxAsUser (POST /v1/dual-wallet/{id}/send-as-*), getVaultWalletSolanaBalance (GET /v1/vault-wallets/{walletId}/solana/balance) - backend/ops utilities, intentionally no screen |

## Coverage proof (verified 2026-07-16 at main 4e841e0b, re-checked 2026-08-17)

Route enumeration of apps/api/src/transport/http/routes/* + index.ts mounts
yields exactly the 47 spec operations after removing the deliberate
exclusions: POST /v1/modes/positions and POST /v1/modes/positions/{id}/close
(position write routes, cut in spec v0.0.2) and /v1/hyperliquid + /v1/pacifica
+ /v1/perps (raw venue routes, mounted only when NODE_ENV !== "production",
index.ts:164-167). All 47 operations are mapped above; 43 have screens, 4 are
documented no-UI utilities. /public/protocol/stats path literal verified at
public-protocol.ts:42.

Re-check on 2026-08-17 against main 8d96a358: the 23 routes the app calls through
the website all answer, and /api/auth/allowlist answers as well. Nothing was
renamed or removed. The /v1 operation names above were not re-enumerated, so
treat the 47 count as of 2026-07-16 and the route list as current.

## Display conventions the designs must respect

- Lamports are decimal strings; APY and fees are basis points (divide by 100 for %).
- Claim headline stays on the earned pool; the Claim button gates on releasableNowNetLamports.
- No negative APY is ever displayed (floor at 0).
- Equity is carry-only and excludes the ~25% perp margin; never label it "deposit".
- Vault Health labels: SAFE > 1%, CAUTION 0-1%, STRESS < 0 on net carry APY.
- 30D APY headline = ((1 + apy/100)^(30/365) - 1) * 100 from the annual blended value.
