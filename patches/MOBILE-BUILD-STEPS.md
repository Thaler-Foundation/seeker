# thaler seeker build, wiring, and screen parity

plain steps to finish this app so it mirrors the web app at thaler.finance.
no secrets, tokens, or keys go in the app or the repo.

checked against the live website and the backend on 2026-08-17.

## how the data flows

the app never talks to pacifica, kamino, or the database directly. it calls the
website, and the website calls the backend on railway.

    app  ->  https://thaler.finance/api/...  ->  backend on railway

the website holds the server key and the session. the app sends only the privy
token, so the server key never ships inside the app.

set the website address in `EXPO_PUBLIC_BFF_URL`. it falls back to
`https://thaler.finance`, so a staging url goes here to point at a test backend.

## api wiring

1. every route the app calls is in `patches/api-map.md`, with what each one is
   for. there are 24. all 24 were checked against the website on 2026-08-17 and
   all 24 exist.
2. the 23 reading and acting routes sit in the `endpoints` object in
   `src/lib/api.ts`. the sign in gate `/api/auth/allowlist` sits in
   `src/lib/auth.tsx` because it runs before the rest.
3. every call goes through `fetchThaler(token, path)`. pass the privy token from
   `getToken()`. `/api/stats` and `/api/apy-history` take no token.
4. response types live in `src/lib/contracts.ts`. they are a hand kept copy of
   the backend types. there is no `@thaler` package installed here, so nothing
   updates them on its own. after a backend change, copy the change across by
   hand. an earlier version of this page said the types come from a workspace
   package. that was wrong.
5. never add an api key, a bearer secret, or a wallet key to the app or the repo.

## what changed in the backend since this repo was last updated

the repo was last pushed on 2026-07-25. these landed after that.

1. a vault whose close failed no longer counts as an open vault. the vault count
   and the total value on the analytics screen both go down by one because of
   it. nothing to change in the app. the numbers just get smaller and correct.
2. net carry can now come back as null when the staking rate is unknown. it used
   to come back as zero, which looked like a real number and was wrong. show a
   dash for null, never a zero.
3. the position tab no longer has an lp pool box, and the breakdown card that
   said "pacifica" now says "kamino multiply".
4. vault links are per tier, and create, claim and close are open to all testers.
5. `VaultSummary` gained six fields, already added to `src/lib/contracts.ts`:
   `walletAddress`, `multiplyLeverageBps`, `leverageBps`, `stepsTotal`,
   `stepsCompleted`, `failedStep`. the step counts drive the building state while
   a vault opens, and `failedStep` says which step stopped it.

## screen parity (what each screen must show, to match the web)

the web replaced per vault apy with roi, and renamed the strategy apy to
projected apr. sol amounts are primary with a live usd in brackets. this repo is
wired that way. keep it that way.

1. home: the featured card stat is "Projected APR" from `/api/stats`. every
   vault row shows that same percent plus tvl.
2. analytics: the four numbers are Total Value Locked, Protocol ROI, Yield
   Generated, Active Vaults. tvl and yield are sol first with a live usd in
   brackets, summed from `strategyBreakdown` `tvlSol` and `lifetimeYieldSol`.
   the price comes from `/api/stats` `solPriceUsd`, falling back to
   `sum(tvlUsd)/sum(tvlSol)`. protocol roi is `kpis.roiPct`. each mode row shows
   count, `tvlSol`, and `apy30dMedianBps` as the projected apr percent.
3. portfolio: the numbers are Net Value, Yield Earned, Claimable Yield, Active
   Vaults, ROI. roi is realized yield over deposit times 100, where deposit is
   `equityLamports` from the vault list joined by id. each row shows net value,
   roi, yield, ltv.
4. vault detail: the overview stat and the advanced row are "Projected APR". the
   backtest stat is "Avg. Projected APR". the position stat and the risk summary
   show "ROI". the per tier table column is "ROI".
5. create: the preview row is "Projected APR (net)".

## env

copy `.env.example` to `.env` and fill it in. never commit `.env`, it is ignored.

    EXPO_PUBLIC_BFF_URL          the website, defaults to https://thaler.finance
    EXPO_PUBLIC_PRIVY_APP_ID     from the privy dashboard
    EXPO_PUBLIC_PRIVY_CLIENT_ID  the mobile client id from the privy dashboard

## run it locally

    bun install
    bunx expo start

then open it on the seeker device or an android emulator.

## checks before every commit

    bunx tsc --noEmit              must be zero errors
    bunx expo export -p android    must build the bundle with no error

## build for the solana dapp store

`eas.json` is in the repo with three profiles. production builds an aab, which
is what the store takes.

    bun add -g eas-cli
    eas login
    eas build -p android --profile production

the first build asks to link an eas project and writes the project id into
`app.json`. download the aab and submit it with the dapp store cli or the
publisher portal. the android package is `finance.thaler.seeker`. bump the
version in `app.json` for each store release.

## to do

1. use the six new `VaultSummary` fields. show the building state from
   `stepsCompleted` and `stepsTotal` while a vault opens, and show which step
   stopped it from `failedStep` when an open fails. right now an open that stops
   gives no reason on screen.
2. show a dash, not a zero, wherever net carry comes back as null. this covers
   the vault detail health line and anywhere else the carry number appears.
3. drop the lp pool box from the position tab and rename the breakdown card from
   "pacifica" to "kamino multiply", to match the web.
4. wire the create preview range to `/api/thaler/vaults/preview` so the number is
   live instead of a placeholder.
5. the portfolio and vault tables put four values in a row on a narrow phone. add
   column headers, or let the row scroll sideways, so every value is labelled.
6. check the wallet screen against a funded test account. the layout and the
   wiring are done, the live numbers are not confirmed.
7. keep the vault creation agreement text the same as the web copy. it is in
   `src/components/terms-modal.tsx`.
8. read colours, spacing, and icons from the figma file rather than by eye. the
   file is `zWDlvcaKwmnzMAfd387fF8`, page "Cover & Foundations".
9. the vault detail screen is about half the size of the web one. work through
   the web page section by section and note what is missing before building, so
   the gap is a list rather than a guess.
10. after any backend change, check `src/lib/contracts.ts` by hand against the
    backend types. nothing updates it automatically.

## notes

1. `metro.config.js` pins the browser condition names first so the jose dep
   inside the privy sdk loads its browser build. do not remove that line.
2. the app targets android only, for the solana seeker. ios is not a target.
3. sign in is privy email otp plus the allowlist gate at `/api/auth/allowlist`.
   a user has to be on the list to load their data.
