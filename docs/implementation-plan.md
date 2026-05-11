# goZaika Implementation Plan

## Current Status

Slice 0 has been restarted around the existing `@gozaika/website` app as the canonical production website. Slice 1 adds consumer-web auth/profile/consent foundations without changing website internals.

## Slice 0: Foundation

- [x] Preserve `apps/website` as the canonical production website.
- [x] Keep npm workspaces and `package-lock.json`.
- [x] Remove the prior pnpm/Turbo/Next 14 scaffold direction.
- [x] Align new web apps to Next.js 16.2.4, React 19.2.4, React DOM 19.2.4, ESLint flat config, and Tailwind 4.
- [x] Use Expo SDK 55 for mobile apps.
- [x] Install mobile native dependencies through Expo's installer.
- [x] Keep Supabase migration wired to the canonical DDL.
- [x] Add shared status constants, Zod schemas, money/date/QR/idempotency helpers, and tests.
- [x] Add Supabase client separation with anon/server/service-role factories.
- [x] Add UI design tokens and foundation components.
- [x] Add Supabase Edge Function scaffolds for webhooks and scheduled jobs.

## Version Matrix

| Area | Version / Policy |
| --- | --- |
| Package manager | npm workspaces |
| Lockfile | `package-lock.json` |
| Web framework | Next.js `16.2.4` |
| Web React | React `19.2.4`, React DOM `19.2.4` |
| TypeScript | `5.9.x` |
| ESLint | `9.x`, flat config |
| Tailwind | `4.x` with `@tailwindcss/postcss` |
| Mobile | Expo SDK `55` |

## Verification Notes

- `npm install --package-lock-only --ignore-scripts` completed.
- `npm install --ignore-scripts` completed.
- Expo installed SDK 55-compatible native deps for both mobile apps.
- `npm run ci` completed successfully across lint, typecheck, tests, and builds.
- Next.js builds passed for `apps/website`, `apps/consumer-web`, `apps/restaurant-mgmt-web`, and `apps/admin-web`.
- Expo exports passed for iOS and Android after mobile app configs were restricted to `platforms: ["ios", "android"]`.
- npm reported 10 moderate audit findings after Expo install.
- npm reported an engine warning for `eslint-visitor-keys@5.0.1` because this shell is on Node `22.12.0`; the package wants `^20.19.0 || ^22.13.0 || >=24`.
- The Supabase migration has been applied externally with notices only. The repeated missing-trigger notices are expected for idempotent `drop trigger if exists` style setup; the index-name truncation notice should be kept in mind if any future scripts reference index names directly.

## Slice 1: Auth/Profile/Consent

- [x] Add additive auth/profile/consent migration: `20260427000000_slice1_auth_profile_consent.sql`.
- [x] Seed Slice 1 DPDP purposes: `OPERATIONAL`, `MARKETING`, `ANALYTICS`, `REFERRAL_COMMS`, `WHATSAPP_TRANSACTIONAL`, `WHATSAPP_MARKETING`.
- [x] Add RLS policies for consent-purpose read and own consent-event select/insert.
- [x] Add idempotent `api_bootstrap_consumer_profile`, `api_latest_consents`, `api_capture_consents`, and safe profile update RPCs.
- [x] Add Supabase SSR session refresh via Next 16 `proxy.ts`.
- [x] Implement consumer-web `/auth/login`, `/auth/callback`, `/onboarding/consent`, and `/account`.
- [x] Add append-only consent capture and latest-consent resolution in UI/API.
- [x] Add demo auth user scripts and registered SQL cleanup framework.
- [x] Copy official website brand assets into shared/app runtime locations and document the convention.

### Slice 1 Verification Notes

- `npm run ci` passed with `NEXT_PUBLIC_BASE_URL=https://goz-website-one.vercel.app` supplied at command time.
- `apps/website` built successfully under the preserved codepath when `NEXT_PUBLIC_BASE_URL` was non-empty.
- `supabase` CLI is not installed in this shell, so the Slice 1 migration and demo SQL were not applied locally here.
- Demo auth scripts were not run against local Supabase because local Supabase CLI/env was unavailable. Remote safety refusal was verified with a fake remote URL.
- npm audit currently reports 18 vulnerabilities after dependency install; they require dependency-review follow-up and were not auto-fixed in Slice 1.

## Next Slices

1. Apply Slice 1 migration locally/remotely and run `npm run demo:auth:create` against local Supabase.
2. Configure Phone OTP provider and Google OAuth redirect URLs for consumer-web.
3. Public Discovery: real drop cards using `api_public_drop_card`, filters, restaurant profiles, realtime inventory.
4. Restaurant Portal Templates/Drops: portal shell, dashboard, bag template CRUD, immutable revisions, drop wizard.
5. Claim/Checkout/Payment: inventory holds, Razorpay order creation, verified webhook conversion, QR/OTP confirmation.
6. Pickup Staff App: QR/OTP verification API, offline queue, incident reporting.
# Slice 2 Execution Log

Restaurant onboarding was implemented as the second vertical slice while preserving Slice 0/1 and leaving `apps/website` untouched.

Completed pieces:

- Added additive restaurant onboarding migration with storage buckets, indexes, OWNER/admin role scopes, membership read policies, and `api_create_or_get_restaurant_onboarding`.
- Added restaurant onboarding schemas in `@gozaika/types` and slug helper in `@gozaika/utils`.
- Added Zayka Pro login, profile bootstrap, onboarding dashboard, basics/compliance forms, and private document upload route in `apps/restaurant-mgmt-web`.
- Added minimal admin login, onboarding list, restaurant review page, document review routes, compliance review route, and activation gate in `apps/admin-web`.
- Added deterministic Slice 2 restaurant demo SQL and local admin auth creation script.
- Updated demo cleanup to delete Slice 2 rows through the demo registry before auth users are removed.
- Added runbook/product documentation for restaurant onboarding.

Next slice should start with Slice 3: restaurant bag templates and drop creation, using approved/ACTIVE restaurants from Slice 2.
