# consumer-mobile — screen registry

App: `apps/consumer-mobile` (`in.gozaika.customer`) · Metro hot-reload · capture via `adb exec-out screencap`.
Attr = `testID="screen:<id>"` on the route root. Status: ☐ id assigned · ◐ attr embedded · ☑ captured.
Devices: Pixel 7a `3A021JEHN02437` (canonical) + `emulator-5554` (confirm).

| screen-id | route | filename | attr | last captured |
|---|---|---|---|---|
| `home` | `(tabs)/index` | `1-A1__home.png` | ☐ | — |
| `drops-list` | `(tabs)/drops/index` | `2-A1__drops-list.png` | ☑ | 2026-07-07 emulator. testID `screen:drops-list` VERIFIED in uiautomator; thali header copy confirmed |
| `drop-detail` | `(tabs)/drops/[dropPk]` (standard) | `2-A2__drop-detail.png` | ☑ | 2026-07-07 emulator. "Not a deal. A discovery." thali block + "discover the dishes" confirmed. **testID `screen:drop-detail` now embedded + verified** (added to route-root `<Screen>` via new `Screen testID` prop) |
| `drop-detail-blind` | `(tabs)/drops/[dropPk]` (BLIND_ADVENTURE) | `2-A3__drop-detail-blind.png` | ☐ | — |
| `restaurants-list` | `(tabs)/restaurants/index` | `2-B1__restaurants-list.png` | ☐ | — |
| `restaurant-detail` | `(tabs)/restaurants/[slug]` | `2-B2__restaurant-detail.png` | ☐ | — |
| `claim-allergen-gate` | drop-detail claim Modal interstitial | `3-A1__claim-allergen-gate.png` | ☑ | 2026-07-08 emulator (Rahul VEG × Bawarchi NON_VEG Hyderabadi Biryani). testID `screen:claim-allergen-gate` VERIFIED. "Check this against your preferences" → "This bag is Non-veg…" → Cancel / Claim anyway. §16 gate |
| `checkout-simulated` | `checkout/[holdPk]` | `3-B1__checkout-simulated.png` | ☑ | 2026-07-08 emulator. testID `screen:checkout-simulated` VERIFIED. CM-1: PAYMENTS_SIMULATOR_ENABLED effective (BFF `POST /checkout/order`→200 `mode=simulated`); "Demo · simulated payment" + gated-simulator copy + Confirm payment/Simulate failure |
| `orders-list` | `(tabs)/orders/index` | `4-A1__orders-list.png` | ☐ | — |
| `order-pickup-proof` | `(tabs)/orders/[orderPk]` (PickupProofCard) | `4-A2__order-pickup-proof.png` | ☑ | 2026-07-08 emulator (Rahul, real order `GZ-HYD-202607-000098` CONFIRMED, created via simulator). testID `screen:order-pickup-proof` VERIFIED. CM-2: PickupProofCard QR grid + OTP `119389` primary, "Resend by SMS" secondary |
| `account-home` | `(tabs)/account/index` | `5-A1__account-home.png` | ☐ | — |
| `account-discovery` | `(tabs)/account/discovery` | `5-A2__account-discovery.png` | ☐ | — |
| `account-passport` | `(tabs)/account/passport` | `5-A3__account-passport.png` | ☐ | — |
| `account-consent` | `(tabs)/account/consent` | `5-A4__account-consent.png` | ☐ | — |
| `account-profile` | `(tabs)/account/profile` | `5-A5__account-profile.png` | ☐ | — |
| `drops-list` (CM-3) | `(tabs)/drops/index` w/ active hold | `4-C1__drops-list-peekbar.png` | ☑ | 2026-07-07 emulator (Priya). CM-3 PeekBar floats above tab bar, list inset keeps cards clear |
| `order-reorder-card` (§20) | `(tabs)/orders/[orderPk]` COLLECTED — "Get it again" | `4-D1__order-reorder-card.png` | ☑ | 2026-07-08 emulator (Rahul, collected "Full Veg Thali Bag" from Sattvik). §20 Order Again entry: "Get it again / Loved the … Order it again at full menu price" + Order again button |
| `checkout-simulated` (§20 reorder) | `checkout/[holdPk]` for a REORDER drop | `4-D2__reorder-checkout.png` | ☑ | 2026-07-08 emulator. Reorder checkout at **full price ₹220** (vs ₹99 discounted original) — §24 anti-cannibalization. Confirmed → real reorder order `GZ-HYD-202607-000099` (REORDER drop, CAPTURED). Portal reports ROI card + counter-queue "↻ Reorder" flag verified |

> **CAPTURE NOTES (2026-07-08, §16/CM-1/CM-2 pass).**
> - **CM-1 simulator flag:** the mobile checkout renders `mode=simulated` only when the BFF
>   env has `PAYMENTS_SIMULATOR_ENABLED=true`. It was **absent** from `apps/consumer-web/.env.local`
>   (→ `mode=razorpay` = the honest "coming soon / hold reserved" fallback). Appended the flag
>   (gitignored, local only) + restarted the BFF → `POST /api/mobile/v1/checkout/order` returns
>   `mode=simulated`. For a Vercel preview/prod demo this must be set as a project env var (owner's call).
> - **SEED WINDOW GOTCHA (demo-tooling bug, flagged for follow-up):** `demo_create_live_drops()`
>   sets the pickup window to `current_date 13:00–15:30` interpreted in the DB session TZ (**UTC**).
>   Run in the UTC afternoon/evening the window is already **in the past**, so the "live" drops it
>   creates are immediately expired (client `isLiveDrop` filters `pickupEndAt > Date.now()` → empty
>   "No active drops"). It only yields live drops when run before ~13:00 UTC (or just after UTC
>   midnight, which pushes the window ~13h forward). Re-run the seed after UTC-00:00 to get live drops,
>   or fix the function to anchor the window to `now()` with a forward offset / IST-aware date.
> - **In-memory query cache:** the empty drops list caches; a force-stop + relaunch of the dev client
>   (session persists in SecureStore) is the reliable way to force a full refetch after a re-seed.
>
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
