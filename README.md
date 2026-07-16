# Thaler Seeker

Mobile app for the Solana Seeker device (Android, Solana Mobile dApp store).
Expo SDK 57 / React Native 0.86 / expo-router. The app calls the deployed
Next BFF (EXPO_PUBLIC_BFF_URL, default https://thaler.finance) with the
user's Privy token; the x-api-key never ships in the binary.
@thaler/contracts is vendored under packages/contracts.

Run: `bun install`, then `bunx expo start`.
Gates: `bunx tsc --noEmit`, `bunx expo export -p android`.

Auth: Privy email OTP via @privy-io/expo + the BFF allowlist gate
(/api/auth/allowlist). Env: EXPO_PUBLIC_PRIVY_APP_ID (required),
EXPO_PUBLIC_PRIVY_CLIENT_ID (mobile client id from the Privy dashboard),
EXPO_PUBLIC_BFF_URL (defaults to https://thaler.finance).
metro.config.js pins browser-first condition names so jose (inside the
Privy SDK) resolves its browser build instead of Node zlib.

Documentation: patches/README.md indexes the app architecture, screen map,
API wiring, tokens, and the production parity record.
