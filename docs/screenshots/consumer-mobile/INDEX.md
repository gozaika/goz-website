# consumer-mobile — screen registry

App: `apps/consumer-mobile` (`in.gozaika.customer`) · Metro hot-reload · capture via `adb exec-out screencap`.
Attr = `testID="screen:<id>"` on the route root. Status: ☐ id assigned · ◐ attr embedded · ☑ captured.
Devices: Pixel 7a `3A021JEHN02437` (canonical) + `emulator-5554` (confirm).

| screen-id | route | filename | attr | last captured |
|---|---|---|---|---|
| `home` | `(tabs)/index` | `1-A1__home.png` | ☐ | — |
| `drops-list` | `(tabs)/drops/index` | `2-A1__drops-list.png` | ☐ | — |
| `drop-detail` | `(tabs)/drops/[dropPk]` (standard) | `2-A2__drop-detail.png` | ☐ | — |
| `drop-detail-blind` | `(tabs)/drops/[dropPk]` (BLIND_ADVENTURE) | `2-A3__drop-detail-blind.png` | ☐ | — |
| `restaurants-list` | `(tabs)/restaurants/index` | `2-B1__restaurants-list.png` | ☐ | — |
| `restaurant-detail` | `(tabs)/restaurants/[slug]` | `2-B2__restaurant-detail.png` | ☐ | — |
| `claim-allergen-gate` | drop-detail claim Modal interstitial | `3-A1__claim-allergen-gate.png` | ☐ | — |
| `checkout-simulated` | `checkout/[holdPk]` | `3-B1__checkout-simulated.png` | ☐ | — |
| `orders-list` | `(tabs)/orders/index` | `4-A1__orders-list.png` | ☐ | — |
| `order-pickup-proof` | `(tabs)/orders/[orderPk]` (PickupProofCard) | `4-A2__order-pickup-proof.png` | ☐ | — |
| `account-home` | `(tabs)/account/index` | `5-A1__account-home.png` | ☐ | — |
| `account-discovery` | `(tabs)/account/discovery` | `5-A2__account-discovery.png` | ☐ | — |
| `account-passport` | `(tabs)/account/passport` | `5-A3__account-passport.png` | ☐ | — |
| `account-consent` | `(tabs)/account/consent` | `5-A4__account-consent.png` | ☐ | — |
| `account-profile` | `(tabs)/account/profile` | `5-A5__account-profile.png` | ☐ | — |
