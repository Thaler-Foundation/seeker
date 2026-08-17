# api map

every route this app calls. checked against the live website on 2026-08-17.
all 24 exist.

the app never calls the trading backend directly.

    app  ->  https://thaler.finance/api/...  ->  backend on railway

the website holds the server key and the session. the app sends only the privy
token. never put an api key, a bearer secret, or a wallet key in the app.

set the website address in `EXPO_PUBLIC_BFF_URL`. it falls back to
`https://thaler.finance`.

## sign in

    /api/auth/allowlist          POST   called from src/lib/auth.tsx

privy email sign in happens in the privy sdk. after that the app asks the
website whether the address is allowed in. a user who is not on the list can
sign in but cannot load data.

## reading

no token on the first two. every other call sends the privy token.

    /api/stats                                   public numbers for the home screen
    /api/apy-history?tier=&days=                 tier history for the charts
    /api/thaler/vaults                           the user's vault list
    /api/thaler/vaults/{id}                      one vault, with open progress
    /api/thaler/vaults/{id}/positions            the kamino and perp legs
    /api/thaler/vaults/preview?equityLamports=&tier=
                                                 what a vault would look like
    /api/thaler/vault-stats                      per vault yield and claimable
    /api/thaler/dual-wallet                      the user's wallet pair
    /api/thaler/dual-wallet/balance              live balance
    /api/thaler/sol-price                        sol price in usd
    /api/thaler/modes/triggers                   trigger history
    /api/thaler/modes/scalps                     scalp history
    /api/thaler/analytics                        protocol wide numbers
    /api/thaler/analytics/equity-history?days=   equity over time

## acting

all of these send the privy token.

    /api/thaler/vault-wallets                    POST   make the vault wallet
    /api/thaler/vaults                           POST   open the vault
    /api/thaler/vaults/{id}/claim                POST   claim yield
    /api/thaler/vaults/{id}/close                POST   close the vault
    /api/thaler/vaults/{id}/resume               POST   resume a stopped open
    /api/thaler/vaults/{id}/dismantle            POST   tear down a failed open
    /api/thaler/wallets/export                   POST   export the wallet key
    /api/thaler/wallets/recovery/transfer-vault-to-dual    POST
    /api/thaler/wallets/recovery/close-vault-wallet        POST
    /api/thaler/wallets/recovery/withdraw-to-external      POST

## where these live in the app

`src/lib/api.ts` holds the `endpoints` object with all 23 reading and acting
routes. the allowlist call sits in `src/lib/auth.tsx` because it runs before the
rest. every call goes through `fetchThaler(token, path)`.

## the website has more routes than the app uses

these work and are ready if a screen needs them. listed so nobody builds them by
hand.

    /api/funding-rates
    /api/fx/rates
    /api/thaler/modes/repays
    /api/thaler/quant/series
    /api/thaler/quant/vaults
    /api/thaler/quant/vaults/{signer}/history
    /api/thaler/quant/vaults/{signer}/series

`/api/thaler/analytics/operator` and `/api/thaler/quant/operator` feed the
internal dashboard. they are not for the app.

## response types

types live in `src/lib/contracts.ts`. they are a hand kept copy of the backend
types. there is no `@thaler` package installed in this repo, so nothing updates
them on its own. after a backend change, copy the change across by hand.

## the backend api spec

the backend has its own openapi file, `docs/backend-openapi.yaml`, kept in the
thaler finance repo. it describes the `/v1/` routes on railway, which the
website calls. the app does not call those, so treat the file as background
reading rather than the contract for this app. the contract for this app is the
list above.
