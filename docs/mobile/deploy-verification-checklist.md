# Mobile uplift — deploy-time verification checklist

We're building under **Plan B** (owner-approved 2026-06-28): each vertical lands
code-correct with typecheck + types tests + `node scripts/mobile-ci.mjs` 7/7 + a smoke
script, but the **on-device** end-to-end check is deferred to a **batched pass after a
BFF deploy** (the apps on-device talk to the deployed cloud BFFs `customer.gozaika.in`
/ `restaurant.gozaika.in`, not local code).

## Prerequisite for the batch
1. Deploy **`consumer-web`** (customer BFF) and **`restaurant-mgmt-web`** (partner BFF)
   with the new routes.
2. Rebuild + install both apps so JS picks up new screens:
   `pwsh scripts/android-preview-install.ps1 -App consumer-mobile -CaptureScreenshot`
   and `... -App restaurant-mobile -CaptureScreenshot`.
3. Roll cloud demo windows forward for live data: `supabase/seed_demo/demo_prepare.sql`.
4. Have a COLLECTED order + a settlement-with-invoice seeded for the smokes.

## To verify (built but not yet device-verified)

| Slice | Feature | On-device walk | BFF route | Smoke |
| --- | --- | --- | --- | --- |
| 10 | Order review submit/status | Customer → Orders → a COLLECTED order → rate + submit → shows "pending moderation"; re-open shows status | `POST /reviews`, `GET /orders/[id]/review` | `scripts/smoke/slice10-reviews-smoke.mjs` |
| 10 | Account/data erasure | Customer → Account → Privacy & consent → "Request account & data erasure" → confirm → success | `POST /account/erasure` | — (idempotent insert) |
| 10 | Profile-edit + referral | Customer → Account → "Profile & referrals" → edit name/language → Save; share referral code | `GET/POST /account/profile` | — |
| 15 | Settlement invoice download | Partner → Finance → a settlement with an invoice → "Download invoice" opens the PDF | `GET /finance/invoice/[id]/signed-url` | — (needs an invoice with a stored PDF) |
| 14 | Partner reviews | Partner → Reviews → rating summary + review list with moderation badges | `GET /reviews` (partner, `viewReviews`) | — |
| F1 | Follow a restaurant | Customer → Restaurants → open one → tap **Follow** (signed in) → label flips to "Following", count +1; tap again → unfollows | `POST`/`DELETE /follows` | `scripts/smoke/f1-follows-smoke.mjs` |
| F1 | Home followed-rail | Customer (signed in, ≥1 follow) → Home → "Restaurants you follow" rail shows followed kitchens with live-drop badge; signed out → rail hidden | `GET /follows` | (same smoke) |
| F1 | Follower count (web + mobile) | Restaurant detail shows the aggregate follower count (web hero Follow chip + mobile "N followers"); count is aggregate-only, never a follower list | `GET /restaurants/[slug]` (followerCount) | (same smoke) |
| 12 | Location pin (GPS) | Partner → Profile → "Pickup location pin" → **Use my current location** (grant permission) → coords fill → Save → "Pinned"; deny permission → manual entry still works; Clear pin | `PATCH /restaurant/location` | `scripts/smoke/slice12-onboarding-smoke.mjs` |
| 12 | Resumable onboarding wizard | Partner → Onboarding → progress bar + 6 steps with done badges; tap **Open** on a to-do step → lands on the right screen; OWNER can Start/Mark-done/Reopen operational tasks; close + reopen app → progress persists | `GET`/`PATCH /restaurant/onboarding` | (same smoke) |

| 16 | Push token registration | After sign-in (real device build with `google-services.json`), the app registers a token → a `notification_device` row appears for the profile; sign-out deactivates it | `POST`/`DELETE /notifications/device` | (server) `scripts/smoke/slice16-push-smoke.mjs` proves FCM auth |
| 16 | Push delivery (FCM v1) | Customer → trigger `POST /notifications/test` → a notification arrives on the phone | `POST /notifications/test` | `slice16-push-smoke.mjs` (auth path 4/4) |
| 16 | Deep-link from notification | Tap the test notification → app opens to `data.link` (running + cold-start) | client `useNotificationDeepLinks` | — |
| 16 | Offline honesty | Customer Home/Drops with no network but cached data → shows an "offline, saved content" banner over cached drops (not a hard error) | client | — |

> **Slice 16 push delivery is gated on `google-services.json`** (per Android app, from the Firebase `gozaika` console) + the `FCM_SERVICE_ACCOUNT_JSON`/`_PATH` env on the deployed BFF. The **server send path is already proven** (`slice16-push-smoke.mjs` 4/4: OAuth mint + FCM v1 authorized project `gozaika`). Drop `google-services.json` into each app, `expo prebuild`, rebuild, then a real device token + delivery work.

> **Slice 12 needs a fresh `expo-location` Android build** (native dep added). Because
> the `android/` project is gitignored/managed, first regenerate it so the
> `expo-location` plugin applies the `ACCESS_FINE/COARSE_LOCATION` manifest
> permissions: `cd apps/restaurant-mobile && npx expo prebuild --platform android`.
> Then build + install: `pwsh scripts/android-preview-install.ps1 -App restaurant-mobile -CaptureScreenshot`.
> Manual coordinate entry works without GPS; only "Use my current location" needs the rebuild + permission grant.

Notes:
- The invoice download yields a 404 if the seeded invoice has no stored PDF
  (`storage_object_fk` null) — that's data, not a code defect; the endpoint + UI are correct.
- New verticals below this point should **append a row here** as they land.
