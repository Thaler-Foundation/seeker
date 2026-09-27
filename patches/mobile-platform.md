# Seeker platform requirements (Solana Mobile stack)

Source: docs.solanamobile.com (fetched 2026-07-16 via Solana MCP). These are
the platform surfaces the Figma design must cover beyond the Thaler product
screens.

## Platform facts

- Seeker is the flagship Solana Mobile device, Android; apps ship through the
  Solana dApp Store (signed APK, dApp Publisher Portal). React Native or
  Kotlin; Thaler Finance targets React Native.
- Mobile Wallet Adapter (MWA) is the protocol for connecting to wallet apps
  on the device for transaction and message signing.
- Seed Vault is Seeker's hardware-level secure key custody; signing requests
  surface through system-secured UI.
- Seeker Genesis Token: NFT proving verified Seeker ownership; apps can
  detect Seeker users (two documented methods for React Native).
- SKR is the ecosystem asset; .skr domains map human-readable names to wallet
  addresses.

## Design additions this implies

| Item | Screens/components |
|---|---|
| MWA connect flow | Wallet chooser sheet, authorize state, connected pill; 
replaces the web Wallet-Standard connector for the external-wallet path |
| Seed Vault signing | Bottom-sheet signing states (request, biometric prompt handoff, success, rejected); used wherever the user signs with an external/device wallet |
| Auth model note | Primary auth stays Privy email + allowlist (same trust model as web); MWA/Seed Vault covers external-wallet actions such as funding the dual wallet and withdraw destinations |
| Seeker detection | Optional "Verified Seeker" badge surface (Genesis Token detected), perks placement on Settings/Home |
| .skr names | Address pill and withdraw destination input display .skr names when resolvable |
| Android chrome | Status bar, gesture nav bar, back handling on every frame (412 x 915); Material 3 kit available for chrome only, product UI stays Altitude |
| dApp Store listing kit | App icon 512, feature banner, listing screenshots (portrait set), short + full description layout - its own Figma page |
| Deep links | dApp Store listing link handling; QR for funding the dual wallet |

## Out of scope (explicitly)

- No raw venue trading UI on mobile (same boundary as the API: shorts,
  Multiply, LP are backend-managed).
- SKR balances and .skr registration flows are not Thaler product features;
  display-only support where addresses appear.
