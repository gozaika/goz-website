# consumer-web — screen registry

App: `apps/consumer-web` · port `:3000` · capture via `preview_*`.
Attr = `data-screen-id` on the page root `<main>`. Status: ☐ id assigned · ◐ attr embedded · ☑ captured.

| screen-id | route | filename | attr | last captured |
|---|---|---|---|---|
| `home` | `/` | `1-A1__home.png` | ☐ | — |
| `auth-login` | `/auth/login` | `1-B1__auth-login.png` | ☐ | — |
| `onboarding-consent` | `/onboarding/consent` | `1-B2__onboarding-consent.png` | ☐ | — |
| `drops-list` | `/drops` | `2-A1__drops-list.png` | ◐ | attr embedded + verified (SSR + live DOM return `drops-list`); capture pending |
| `drop-detail` | `/drops/[id]` (standard) | `2-A2__drop-detail.png` | ☐ | — |
| `drop-detail-blind` | `/drops/[id]` (BLIND_ADVENTURE) | `2-A3__drop-detail-blind.png` | ☐ | — |
| `restaurants-list` | `/restaurants` | `2-B1__restaurants-list.png` | ☐ | — |
| `restaurant-detail` | `/restaurants/[slug]` | `2-B2__restaurant-detail.png` | ☐ | — |
| `city-page` | `/cities/[city]` | `2-C1__city-page.png` | ☐ | — |
| `claim-allergen-gate` | `/drops/[id]` claim interstitial | `3-A1__claim-allergen-gate.png` | ☐ | — |
| `checkout-simulated` | `/checkout/[orderId]` | `3-B1__checkout-simulated.png` | ☐ | — |
| `order-detail` | `/orders/[orderId]` | `4-A1__order-detail.png` | ☐ | — |
| `account-home` | `/account` | `5-A1__account-home.png` | ☐ | — |
| `account-discovery` | `/account/discovery` (passport cuisines) | `5-A2__account-discovery.png` | ☐ | — |
| `account-passport` | `/account/passport` | `5-A3__account-passport.png` | ☐ | — |
| `swaad-club` | `/swaad-club` | `5-B1__swaad-club.png` | ☐ | — |
