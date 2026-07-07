# consumer-mobile — screen registry

App: `apps/consumer-mobile` (`in.gozaika.customer`) · Metro hot-reload · capture via `adb exec-out screencap`.
Attr = `testID="screen:<id>"` on the route root. Status: ☐ id assigned · ◐ attr embedded · ☑ captured.
Devices: Pixel 7a `3A021JEHN02437` (canonical) + `emulator-5554` (confirm).

| screen-id | route | filename | attr | last captured |
|---|---|---|---|---|
| `home` | `(tabs)/index` | `1-A1__home.png` | ☐ | — |
| `drops-list` | `(tabs)/drops/index` | `2-A1__drops-list.png` | ☑ | 2026-07-07 emulator. testID `screen:drops-list` VERIFIED in uiautomator; thali header copy confirmed |
| `drop-detail` | `(tabs)/drops/[dropPk]` (standard) | `2-A2__drop-detail.png` | ☑ | 2026-07-07 emulator. "Not a deal. A discovery." thali block + "discover the dishes" confirmed. testID pending (add to route root) |
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
| `drops-list` (CM-3) | `(tabs)/drops/index` w/ active hold | `4-C1__drops-list-peekbar.png` | ☑ | 2026-07-07 emulator (Priya). CM-3 PeekBar floats above tab bar, list inset keeps cards clear |

> **BUILD BLOCKER — RESOLVED 2026-07-07.** A fresh debug dev-client was built from
> `C:\tmp\gozaika-build` (`android/gradlew :app:assembleDebug`, BUILD SUCCESSFUL 8m52s)
> and installed on both Pixel 7a + emulator. It loads current Metro JS (Phase 2 + testIDs)
> with no redbox. **Working setup for on-device capture (use the EMULATOR for live data):**
> the mobile `.env` API origin is `http://10.0.2.2:3000` = emulator→host-localhost, so data
> only loads on `emulator-5554` with consumer-web (the mobile BFF, `/api/mobile/v1/*`) running
> on host:3000 (`preview_start consumer-web`). Physical Pixel loads JS but not BFF data (10.0.2.2
> is meaningless on-device). Metro: `cd apps/consumer-mobile && npx expo start` (watch mode);
> `adb -s <serial> reverse tcp:8081 tcp:8081`. On first launch: dismiss dev-menu (Continue),
> toggle OFF "Tools button", close. Verify screen-id: `MSYS_NO_PATHCONV=1 adb -s <serial> shell
> uiautomator dump /sdcard/wd.xml` then `... shell cat /sdcard/wd.xml | grep 'screen:'`.
>
> Historical (why the rebuild was needed):
> The installed `in.gozaika.customer` was a Jun-29 *release* APK with an embedded
> (pre-Phase-2) JS bundle — it does NOT load from Metro, so it shows neither Phase 2
> features nor screen-id testIDs. The only other prebuilt APK (`C:\tmp\gozaika-build/
> apps/consumer-mobile/android/.../debug/app-debug.apk`, Jun 25) DOES load Metro JS but
> its native layer is too old for current source — it redboxes with `Cannot find native
> module 'ExpoPushTokenManager'` (expo-notifications native module added after that build).
> **Fix recipe:** sync `C:\tmp\gozaika-build` to current `claude-feature-parity`, `npm
> install` (copy is missing expo-notifications in node_modules), then `npx expo run:android`
> (or gradlew assembleDebug + install) from the short path → installs a current dev-client
> that loads Metro JS. Then: Metro `npx expo start` from real source, `adb reverse tcp:8081
> tcp:8081`, open the dev-client → tap `http://localhost:8081`. Device restored to the
> working release APK in the meantime.
