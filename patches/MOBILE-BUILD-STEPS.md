# thaler seeker build, wiring, and screen parity

plain steps for the mobile dev to finish this app so it mirrors the current
web ui at thaler.finance. no secrets, tokens, or keys go in the app or the repo.

## how the data flows

the app never talks to pacifica, kamino, or the neon db directly. it calls the
deployed next bff at EXPO_PUBLIC_BFF_URL (default https://thaler.finance) and
sends only the user privy token. the bff reads the quant cache, and the quant
cache reads the neon db that the backend keeps filled. so the app shows the same
cached numbers the web app shows. the x-api-key stays on the server and never
ships inside the app binary.

## api wiring

1. every endpoint the app uses is in src/lib/api.ts, in the `endpoints` object.
   every one maps to a real route under /api on the bff. verified present.
2. every response type lives in src/lib/contracts.ts. it is a copy kept by hand,
   not an installed package, so nothing updates it on its own. after a backend
   change, copy the change across by hand. an earlier version of this page said
   the types come from a workspace package. that was wrong.
3. every call goes through fetchThaler(token, path). pass the privy token from
   getToken(). the public routes (/api/stats, /api/apy-history) take no token.
4. do not add x-api-key, bearer secrets, api keys, or wallet keys anywhere in the
   app or the repo.

## screen parity (what each screen must show, to match the web)

the web replaced per vault apy with roi, and renamed the strategy apy to
projected apr. sol amounts are primary with a live usd in parentheses. this repo
is now wired that way. keep it that way.

1. home: featured card stat is "Projected APR" from /api/stats apy. all vaults
   rows show that same percent plus tvl.
2. analytics: kpis are Total Value Locked, Protocol ROI, Yield Generated, Active
   Vaults. tvl and yield are sol primary with a live usd in parentheses, summed
   from strategyBreakdown tvlSol and lifetimeYieldSol. the price is /api/stats
   solPriceUsd, falling back to sum(tvlUsd)/sum(tvlSol). protocol roi is
   kpis.roiPct. the per mode row shows count, tvlSol, and apy30dMedianBps as the
   projected apr percent.
3. portfolio: kpis are Net Value, Yield Earned, Claimable Yield, Active Vaults,
   ROI. roi is sum(realized yield)/sum(deposit) times 100, where deposit is the
   vaults list equityLamports joined by id. each vault row shows net value, roi,
   yield, ltv.
4. vault detail: overview stat and advanced factrow are "Projected APR". the
   backtest stat is "Avg. Projected APR". the position stat and the risk summary
   show "ROI" (realized yield over deposit). the per tier table column is "ROI".
5. create: the preview row is "Projected APR (net)". the range value is still a
   placeholder; wire it to /api/thaler/vaults/preview to make it live.

## env (put real values in a local .env file, never commit them)

1. EXPO_PUBLIC_PRIVY_APP_ID     required, from the privy dashboard.
2. EXPO_PUBLIC_PRIVY_CLIENT_ID  the mobile client id from the privy dashboard.
3. EXPO_PUBLIC_BFF_URL          defaults to https://thaler.finance. set a staging
   url here to point at a test backend.

## run it locally

1. bun install
2. bunx expo start, then open on the seeker device or an android emulator.

## checks to run before every commit

1. bunx tsc --noEmit      must be zero errors.
2. bunx expo export -p android    must build the hermes bundle with no error.

## build for the solana dapp store (eas)

1. install the eas cli: bun add -g eas-cli (or run bunx eas-cli).
2. eas login
3. eas build:configure once, to create eas.json.
4. eas build -p android --profile production, this builds the android aab.
5. download the aab, then submit it to the solana dapp store with the dapp store
   cli or the publisher portal. the android package is finance.thaler.seeker and
   the version is in app.json.
6. bump the version in app.json for each new store release.

## still to finish

1. wire the create preview range value to /api/thaler/vaults/preview so it is
   live instead of a placeholder.
2. the portfolio and vault tables show four values per row on a narrow phone; add
   column headers or a horizontal scroll so each value is labeled.
3. the wallet screen design and data wiring now mirror the web wallet drawer
   (thaler glyph, sol icon, position dots, balances, positions, activity,
   withdraw form, export). verify the live numbers once you have a funded test
   account.
4. the legal terms gate is now in place: the "Vault creation agreement" modal
   (src/components/terms-modal.tsx, ported verbatim from the web) opens on "Open
   Vault", the user scrolls to the bottom and ticks accept, then the vault wallet
   is created. keep the agreement text in sync if the web copy changes.
5. after the vault build finishes the create screen now routes to the portfolio
   tab, the same as the web.

## notes

1. metro.config.js pins the browser condition names first so the jose dep inside
   the privy sdk loads its browser build. do not remove that line.
2. the app targets android only (solana seeker). ios is not a target.
3. auth is privy email otp plus the bff allowlist gate at /api/auth/allowlist. a
   user must be on the allowlist to load their data.
