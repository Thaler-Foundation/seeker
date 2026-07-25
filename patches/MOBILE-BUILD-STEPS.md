# thaler seeker build and wiring steps

plain steps to wire the app to the backend, run it, and build it for the solana
dapp store. no secrets, tokens, or keys go in the app or the repo.

## how the data flows

the app never talks to pacifica, hyperliquid, kamino, or the neon db directly.
it calls the deployed next bff at EXPO_PUBLIC_BFF_URL (default
https://thaler.finance) and sends only the user privy token. the bff reads the
quant cache, and the quant cache reads the neon db that the backend keeps
filled. so the app shows the same cached numbers the web app shows. the
x-api-key stays on the server and never ships inside the app binary.

## api wiring

1. every endpoint the app uses is in src/lib/api.ts, in the `endpoints` object.
2. every response type is in src/lib/contracts.ts. keep these types matching the
   bff json. when the backend adds a field, add it here too.
3. every call goes through fetchThaler(token, path). pass the privy token from
   getToken(). the public routes (/api/stats, /api/apy-history) work with no
   token.
4. do not add x-api-key, bearer secrets, api keys, or wallet keys anywhere in
   the app or the repo.

## env (put real values in a local .env file, never commit them)

1. EXPO_PUBLIC_PRIVY_APP_ID     required, from the privy dashboard.
2. EXPO_PUBLIC_PRIVY_CLIENT_ID  the mobile client id from the privy dashboard.
3. EXPO_PUBLIC_BFF_URL          defaults to https://thaler.finance. set a staging
   url here if you want to point at a test backend.

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

## notes

1. metro.config.js pins the browser condition names first so the jose dep inside
   the privy sdk loads its browser build. do not remove that line.
2. the app targets android only (solana seeker). ios is not a target.
3. auth is privy email otp plus the bff allowlist gate at /api/auth/allowlist.
   a user must be on the allowlist to load their data.
4. the older patches/api-map.md was written from the openapi file and lists the
   raw /v1 operations. the app itself calls the bff routes in src/lib/api.ts.
   use src/lib/api.ts as the truth for what the app calls.
