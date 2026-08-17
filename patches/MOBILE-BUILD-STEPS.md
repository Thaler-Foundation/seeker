# thaler seeker build, wiring, and screen parity

checked against the production backend on 2026-08-17.

## how the data flows

the app never talks to the trading backend directly. it calls the website,
which holds the session and forwards the call on.

    app  ->  https://thaler.finance/api/...  ->  backend on railway

set the website address in `EXPO_PUBLIC_BFF_URL`. the app falls back to
`https://thaler.finance` when it is not set.

sign in is privy. every private call sends the privy token. the public ones
(`/api/stats`, `/api/apy-history`) take no token.

## api wiring

1. every route the app uses is listed in `src/lib/api.ts`, in the `endpoints`
   object. there are 23 of them. all 23 were checked against the website on
   2026-08-17 and all 23 exist.
2. response types live in `src/lib/contracts.ts`. they are a hand kept copy of
   the backend types, not a package install. there is no `@thaler` dependency
   in this repo. when the backend adds or changes a field, copy the change into
   that file by hand. an earlier version of this page said the types come from a
   workspace package. that was wrong.
3. every call goes through `fetchThaler(token, path)`. pass the privy token from
   `getToken()`.
4. never put an api key, a bearer secret, or a wallet key in the app or the repo.

### the 23 routes

reading:

    publicStats          /api/stats
    apyHistory           /api/apy-history?tier=&days=
    vaults               /api/thaler/vaults
    vaultState           /api/thaler/vaults/{id}
    vaultPositions       /api/thaler/vaults/{id}/positions
    vaultStats           /api/thaler/vault-stats
    dualWallet           /api/thaler/dual-wallet
    dualWalletBalance    /api/thaler/dual-wallet/balance
    solPrice             /api/thaler/sol-price
    triggers             /api/thaler/modes/triggers
    scalps               /api/thaler/modes/scalps
    analytics            /api/thaler/analytics
    equityHistory        /api/thaler/analytics/equity-history?days=
    vaultPreview         /api/thaler/vaults/preview?equityLamports=&tier=

acting:

    vaultWallets         /api/thaler/vault-wallets            makes the vault wallet
    vaults               /api/thaler/vaults                   opens the vault
    vaultClaim           /api/thaler/vaults/{id}/claim
    vaultClose           /api/thaler/vaults/{id}/close
    vaultResume          /api/thaler/vaults/{id}/resume
    vaultDismantle       /api/thaler/vaults/{id}/dismantle
    walletExport         /api/thaler/wallets/export
    recoveryTransfer     /api/thaler/wallets/recovery/transfer-vault-to-dual
    recoveryClose        /api/thaler/wallets/recovery/close-vault-wallet
    recoveryWithdraw     /api/thaler/wallets/recovery/withdraw-to-external

### routes the website has that the app does not use yet

these exist and work. they are listed so nobody rebuilds them by hand.

    /api/funding-rates
    /api/fx/rates
    /api/thaler/modes/repays
    /api/thaler/quant/series
    /api/thaler/quant/vaults
    /api/thaler/quant/vaults/{signer}/history
    /api/thaler/quant/vaults/{signer}/series

the `/api/thaler/analytics/operator` and `/api/thaler/quant/operator` routes are
for the internal dashboard and are not meant for the app.

## what changed in the backend since this repo was last updated

the repo was last pushed on 2026-07-25. these landed after that.

1. a vault whose close failed no longer counts as an open vault. the vault count
   and the total value on the analytics screen both drop by one because of it.
   nothing to change in the app, the numbers just get smaller and correct.
2. net carry can now come back as null when the staking rate is unknown. it used
   to come back as zero, which read as a real number and was wrong. show a dash
   for null, never a zero.
3. the position tab no longer has an lp pool box, and the breakdown card that
   said "pacifica" now says "kamino multiply".
4. vault links are per tier, and create, claim and close are open to all testers.
5. `VaultSummary` gained six fields. they are in `src/lib/contracts.ts` now:
   `walletAddress`, `multiplyLeverageBps`, `leverageBps`, `stepsTotal`,
   `stepsCompleted`, `failedStep`. the step counts drive the building state while
   a vault opens, and `failedStep` says which step stopped it.

## screens

five tabs plus two stacks: home, portfolio, create, analytics, wallet, and the
vault detail at `/vault/{risk}`.

each screen must show what the website shows for the same data. open the website
side by side when checking.

## env

put real values in a local `.env` file. never commit it.

    EXPO_PUBLIC_BFF_URL=https://thaler.finance
    EXPO_PUBLIC_PRIVY_APP_ID=
    EXPO_PUBLIC_PRIVY_CLIENT_ID=

## run it locally

    bun install
    bun run start

## checks before every commit

    bunx tsc --noEmit

## build for the solana dapp store

the app id is `finance.thaler.seeker`, the link scheme is `thalerseeker`, and the
name is "Thaler Seeker". build with eas.

## design

the figma file is `zWDlvcaKwmnzMAfd387fF8`, page "Cover & Foundations". the
account has a full seat, so the file opens for editing and for reading colours,
spacing and components.

## to do

1. sync the six new `VaultSummary` fields into the screens. show the building
   state from `stepsCompleted` and `stepsTotal` while a vault opens, and show
   which step stopped it from `failedStep` when an open fails.
2. show a dash, not a zero, wherever net carry comes back as null. this applies
   to the vault detail health line and to any place the carry number is shown.
3. drop the lp pool box from the position tab and rename the breakdown card from
   "pacifica" to "kamino multiply", to match the website.
4. wire the create preview range to `/api/thaler/vaults/preview` so the number is
   live instead of a placeholder.
5. the portfolio and vault tables show four values per row on a narrow phone. add
   column headers or let the row scroll sideways so every value is labelled.
6. check the wallet screen against a funded test account. the layout and the
   wiring are done, the live numbers are not confirmed.
7. keep the vault creation agreement text the same as the website. it is in
   `src/components/terms-modal.tsx`.
8. read colours, spacing and icons from the figma file rather than by eye.
9. after any backend change, re-check `src/lib/contracts.ts` by hand against the
   backend types. nothing updates it automatically.

## notes

the app holds no keys. it asks the website, the website asks the backend.
