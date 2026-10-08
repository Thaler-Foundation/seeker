# Thaler Finance - app architecture

The Seeker app is a standalone Expo (React Native) repo mirroring the
production web UI (Thaler-Finance apps/web protected routes at main 4e841e0b
plus the Thaler-Foundation/frontend /portfolio upgrades).

## Stack

- Expo SDK ~57 / React Native 0.86, expo-router file routing, TypeScript strict
- @tanstack/react-query 5 for all server state
- @privy-io/expo for auth (email OTP), react-native-svg for charts and icons
- Response types local to src/lib/contracts.ts

## Directory map

```
./
  app.json               Expo config: name "Thaler Finance", finance.thaler.app,
                         icon/adaptive icon from the real apps/web logo.png
  metro.config.js        browser-first unstable_conditionNames so jose (inside
                         @privy-io/js-sdk-core) resolves its browser build
  tsconfig.json          strict, @/* -> src/*
  assets/images/         icon set (real logo), hero-waves.png (live-site capture),
                         solana-logo.png, thaler-logo.png
  patches/               this documentation
  src/
    theme/tokens.ts      dark/light/tier/brand/spacing/radius tokens from
                         apps/web globals.css + tier-meta.ts
    lib/api.ts           fetchThaler + endpoints map (see api-map.md)
    lib/auth.tsx         PrivyProvider + email OTP + BFF allowlist gate
    components/waves.tsx login hero backdrop (real captured render)
    app/
      _layout.tsx        QueryClientProvider > AuthProvider > Stack
      index.tsx          login screen
      (tabs)/_layout.tsx bottom tab bar: Home, Portfolio, Create, Analytics
      (tabs)/home.tsx    vaults grid
      (tabs)/portfolio.tsx
      (tabs)/create.tsx  staged deposit flow
      (tabs)/analytics.tsx
      vault/[risk].tsx   vault detail (Overview / My Vaults / Info & FAQs)
      wallet.tsx         wallet sheet (modal presentation)
```

## Navigation

Root stack (src/app/_layout.tsx): index -> (tabs) -> vault/[risk] -> wallet
(modal). Routes into vault detail:

- Home featured card and live tier rows: `/vault/{tier}`
- Portfolio vault rows: `/vault/{tier}?tab=position&vault={executionId}`
  (mirrors the web row link); the route reads `tab` and `vault` params to open
  the My Vaults tab with that vault selected.

## Auth flow (src/lib/auth.tsx)

1. PrivyProvider boots from EXPO_PUBLIC_PRIVY_APP_ID / EXPO_PUBLIC_PRIVY_CLIENT_ID
   (missing app id renders an unauthenticated context instead of crashing).
2. Login screen: email -> sendCode -> loginWithCode (Privy OTP).
3. Whenever Privy is ready with a user, including a session restored from secure
   storage, POST {BFF}/api/auth/allowlist with the Privy bearer token:
   200 allowed, 403 denied ("This account is not on the Thaler beta list."),
   else error ("Verification failed. Please try again."). A ref keyed on the
   email runs it once per account and clears on the error branch. A Privy
   account carrying no email address sets the error state instead ("No verified
   email on this Privy account. Sign out and try again.").
4. On the same condition, POST {BFF}/api/thaler/dual-wallet once per session to
   provision the Solana dual-signer wallet. A 401 leaves it done; any other
   failure re-arms it.
5. A 401 on any query or mutation triggers one token refresh at a time, at most
   one per 5 seconds: a null token signs out and clears the query cache, an
   unchanged token stops without refetching, a new token invalidates all queries.
6. Sign-out clears the query cache, and so does the authenticated session
   dropping.
7. `useAuth()` exposes ready/authenticated/email/gate/gateError/getToken/signOut;
   every authorized query calls `getToken()` per request.

## Data layer

- `fetchThaler<T>(token, path, init?)` (src/lib/api.ts) prefixes
  EXPO_PUBLIC_BFF_URL (default https://thaler.finance), sets JSON headers and
  the Bearer token. The device never holds the backend x-api-key; the Next BFF
  adds it server side.
- Endpoint map and per-screen usage: api-map.md and app-screens.md.
- Query keys are shared across screens (public-stats, vaults, vault-stats,
  analytics, equity-history, apy-history, vault-positions, dual-balance,
  triggers, scalps) so navigation reuses cache.

## Static content policy

Constants that production itself ships as constants are embedded verbatim,
with the production source recorded in patches/production-truth.md:
tier params (tier-meta.ts), APY bands + strategy descriptions
(lib/mock/strategies.ts), FAQ entries (vault page FAQS), backtest math.
No display numbers are hardcoded; all rendered values come from the API.

## Gates

- `bunx tsc --noEmit`: 0 errors
- `bunx expo export --platform android`: Hermes bundle (~6MB) + asset map
- Comment policy: one short header line per file, no other comments
- Device login needs the user-provided Privy env keys; mutating flows
  (claim, resume, dismantle, withdraw, export) are wired to verified
  endpoints but only exercisable on a live signed-in run.
