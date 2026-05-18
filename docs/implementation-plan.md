# goZaika Implementation Plan

This document is the rebuild guide for Codex and the engineering source of truth for completed slices. A new agent should be able to start from a clean checkout, follow the slices in order, and recreate the current platform state without relying on chat history.

## Current Production URLs

| Surface | URL | Current role |
| --- | --- | --- |
| Marketing website | `https://gozaika.in/` | Canonical public brand/site baseline. |
| Consumer web | `https://customer.gozaika.in/` | Consumer PWA for auth, account, and drop discovery. |
| Restaurant portal | `https://restaurant.gozaika.in/` | Zayka Pro owner portal for onboarding, templates, and drops. |
| Admin portal | `https://admin.gozaika.in/` | Internal operations portal for review/activation. |

Owned domains now include `gozaik.in` and `gozaika.com`. They are strategic/defensive domains unless explicitly configured in Vercel and DNS later.

## Rebuild Rules For Codex

1. Preserve `apps/website` as the canonical production website and web-stack baseline.
2. Use npm workspaces and keep `package-lock.json` canonical.
3. Do not introduce pnpm, `workspace:*`, Next 14, React 18, or alternate scaffolds.
4. Build in vertical slices: data model first, API next, UI last.
5. Keep migrations additive and documented; never edit historical migration intent unless fixing an idempotency defect.
6. Treat RLS, auth, storage, payment webhook, and service-role usage as human-review areas.
7. Keep `apps/website` untouched unless the task is explicitly website work.
8. Every slice must update docs, demo seed/cleanup guidance, verification notes, and out-of-scope boundaries.

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
| Supabase JS | `@supabase/supabase-js` `^2.57.4` |
| Mobile | Expo SDK `55` |

## Clean Reimplementation From Ground Zero

Use this order for a clean rebuild:

1. Install dependencies:

   ```powershell
   npm install
   ```

2. Create local env:

   ```powershell
   Copy-Item .env.example .env.local
   ```

3. Fill Supabase, Vercel, Resend, Turnstile, and analytics variables in `.env.local`. Do not commit secrets.

4. Start or connect Supabase and apply migrations in order:

   ```powershell
   supabase db reset
   ```

   If applying remotely, review migrations first and apply through the approved Supabase/Vercel deployment path.

5. Seed demo auth and SQL data, local only:

   ```powershell
   npm run demo:auth:create
   npm run demo:admin:create
   npm run db:seed:demo:slice2
   ```

   Then apply Slice 3 SQL demo seed manually or through a script once added:

   ```powershell
   npx supabase db query --local --file supabase/seeds/demo/003_slice3_drop_publishing_demo.sql
   ```

6. Run verification:

   ```powershell
   npm run typecheck
   npm run test
   npm run lint
   npm run build
   ```

7. Start app surfaces:

   ```powershell
   npm run dev:consumer
   npm run dev:restaurant
   npm run dev:admin
   ```

## Slice 0: Foundation

### Goal

Establish the monorepo, canonical schema, app shells, shared packages, CI shape, and preserved website baseline.

### Completed

- [x] Preserve `apps/website` as canonical production website.
- [x] Keep npm workspaces and `package-lock.json`.
- [x] Align web apps to Next.js 16.2.4, React 19.2.4, ESLint flat config, and Tailwind 4.
- [x] Use Expo SDK 55 for mobile apps.
- [x] Add canonical Supabase schema migration.
- [x] Add shared status constants, Zod schemas, money/date/QR/idempotency helpers, and tests.
- [x] Add Supabase client separation with anon/server/service-role factories.
- [x] Add UI design tokens and foundation components.
- [x] Add Supabase Edge Function scaffolds for webhooks and scheduled jobs.

### Validation Gate

Supabase schema is visible, seed/reference data exists, app shells build, website remains unchanged, and `npm run ci` passes in a correctly configured environment.

## Slice 1: Auth/Profile/Consent

### Goal

Enable consumer identity, profile bootstrap, and DPDP-purpose consent as the first secure user slice.

### Completed

- [x] Add additive auth/profile/consent migration: `20260427000000_slice1_auth_profile_consent.sql`.
- [x] Seed DPDP consent purposes: `OPERATIONAL`, `MARKETING`, `ANALYTICS`, `REFERRAL_COMMS`, `WHATSAPP_TRANSACTIONAL`, `WHATSAPP_MARKETING`.
- [x] Add RLS policies for consent-purpose read and own consent-event select/insert.
- [x] Add `api_bootstrap_consumer_profile`, `api_latest_consents`, `api_capture_consents`, and safe profile update RPCs.
- [x] Add Supabase SSR session refresh via Next 16 `proxy.ts`.
- [x] Implement consumer-web `/auth/login`, `/auth/callback`, `/onboarding/consent`, and `/account`.
- [x] Add append-only consent capture and latest-consent resolution in UI/API.
- [x] Add demo auth user scripts and registered SQL cleanup framework.

### Validation Gate

Consumer can sign up/log in, profile is created, required consent is stored, optional consent can be changed, and own-row RLS is respected.

### Provider Follow-Ups

- Configure Supabase Phone OTP provider.
- Configure Google OAuth credentials and redirect URLs for `https://customer.gozaika.in/auth/callback` plus local callback URLs.

## Slice 2: Restaurant Onboarding

### Goal

Build the trust/compliance foundation before any restaurant can publish inventory.

### Completed

- [x] Add additive restaurant onboarding migration with storage buckets, indexes, OWNER/admin role scopes, membership read policies, and `api_create_or_get_restaurant_onboarding`.
- [x] Add restaurant onboarding schemas in `@gozaika/types` and slug helper in `@gozaika/utils`.
- [x] Add Zayka Pro login, profile bootstrap, onboarding dashboard, basics/compliance forms, and private document upload route in `apps/restaurant-mgmt-web`.
- [x] Add minimal admin login, onboarding list, restaurant review page, document review routes, compliance review route, and activation gate in `apps/admin-web`.
- [x] Add deterministic Slice 2 restaurant demo SQL and local admin auth creation script.
- [x] Update demo cleanup to delete Slice 2 rows through the demo registry before auth users are removed.
- [x] Add runbook/product documentation for restaurant onboarding.

### Validation Gate

Restaurant owner can log in, complete profile/compliance, upload docs, and admin can approve/activate. Only `ACTIVE` restaurants can proceed to Slice 3 drop publishing.

## Slice 3: First Drop Publishing & Consumer Discovery

### Goal

An approved restaurant can create a reusable BAM Bag template, publish a scheduled/active drop, and consumers can discover it on consumer-web with real inventory/disclosure data.

### Completed

- [x] Add expanded public drop discovery view via `20260513000000_slice3_drop_publishing_discovery.sql`.
- [x] Include template disclosures in public discovery: allergen codes, dietary category, spice level, serving guidance, holding guidance, pickup window, price, and live available quantity.
- [x] Add deterministic Slice 3 demo seed: `003_slice3_drop_publishing_demo.sql`.
- [x] Add shared schemas/types for bag templates, drop publishing, portal template summaries, portal drop summaries, and richer public drop cards.
- [x] Replace fixture consumer discovery with Supabase-backed `/api/discovery/drops`, `/drops`, `/drops/[id]`, and home-preview data.
- [x] Add consumer Realtime subscription path for `drop_drop` inventory/status updates.
- [x] Add restaurant portal template creation API and UI.
- [x] Add restaurant portal drop publish API and UI.
- [x] Gate template/drop writes to signed-in users with access to an `ACTIVE` restaurant.
- [x] Add basic restaurant operational controls for activate, pause, and close.
- [x] Update technology specification roadmap to pilot-first direction.

### Validation Gate

Approved restaurant owner logs into restaurant portal, creates a BAM Bag template, publishes a public drop, and consumer-web shows the drop with dietary/allergen/pickup/price/remaining count from real Supabase data.

### Out Of Scope

No Razorpay, payment capture, inventory hold, order confirmation, pickup QR/OTP, refund, settlement, Swaad Club, referral rewards, advanced analytics, or native mobile parity.

### Slice 3 Verification Performed

- `npm.cmd --workspace @gozaika/types run typecheck`
- `npm.cmd --workspace @gozaika/consumer-web run typecheck`
- `npm.cmd --workspace @gozaika/restaurant-mgmt-web run typecheck`
- `npm.cmd --workspace @gozaika/consumer-web run lint`
- `npm.cmd --workspace @gozaika/restaurant-mgmt-web run lint`
- `npm.cmd --workspace @gozaika/types run test`
- `npx.cmd dotenv -e .env.local -- npm.cmd --workspace @gozaika/consumer-web run build`
- `npm.cmd --workspace @gozaika/restaurant-mgmt-web run build`

## Slice 3 Follow-Up Activities Required For Complete Functionality

These are operational/configuration steps needed after code merge/deploy:

1. Apply migration `20260513000000_slice3_drop_publishing_discovery.sql` to the target Supabase environment.
2. Seed or create at least one `ACTIVE` restaurant in the target environment.
3. Create at least one approved restaurant owner auth user and active restaurant membership.
4. Seed or manually create one published BAM Bag template and active public drop.
5. Enable Supabase Realtime publication for `drop_drop` if it is not already enabled in the target project.
6. Confirm anon/authenticated `select` on `api_public_drop_card` works without exposing internal columns.
7. Review RLS and service-role usage around restaurant template/drop writes.
8. Confirm `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are set for `customer.gozaika.in` and `restaurant.gozaika.in`.
9. Confirm restaurant and customer Vercel projects point to the correct workspaces/build commands.
10. Configure Supabase Auth redirect allow-list for `https://customer.gozaika.in/auth/callback` and `https://restaurant.gozaika.in/auth/callback`.
11. Smoke test consumer discovery after deployment: home page, `/drops`, `/drops/[id]`, and `/api/discovery/drops`.
12. Smoke test restaurant portal after deployment: login, `/portal/templates`, `/portal/drops/new`, status update controls.
13. Decide whether demo seed `003_slice3_drop_publishing_demo.sql` is local/staging-only or whether production drops will be created manually.
14. Add a scripted `db:seed:demo:slice3` npm command if repeated local/staging rebuilds need one-command Slice 3 data setup.
15. Add Playwright smoke coverage for consumer discovery and restaurant drop publishing once stable test credentials exist.

## Expected App State After Slice 3

| App | What you should see now |
| --- | --- |
| `apps/website` / `https://gozaika.in/` | No functional Slice 3 changes. It remains the public marketing site and brand/config baseline. |
| `apps/consumer-web` / `https://customer.gozaika.in/` | Home and `/drops` read real public drops from Supabase. Drop cards show restaurant, BAM Bag name, dietary badge, allergen chips, pickup window, price, and remaining quantity. `/drops/[id]` shows a disclosure/detail page. Claim/payment buttons are intentionally disabled/coming-next. |
| `apps/restaurant-mgmt-web` / `https://restaurant.gozaika.in/` | Active restaurant owners can create published BAM Bag templates at `/portal/templates`, create scheduled/active drops at `/portal/drops/new`, and activate/pause/close recent drops. Non-active restaurants should be blocked from publishing. |
| `apps/admin-web` / `https://admin.gozaika.in/` | Existing Slice 2 onboarding/admin review remains available. Slice 3 does not add a full admin drop moderation console yet. |
| `apps/consumer-mobile` | No Slice 3 parity yet. Mobile remains scaffold/deferred until the web paid pickup loop proves traction. |
| `apps/restaurant-staff-mobile` | No Slice 3 pickup flow yet. Staff app remains scaffold/deferred until Slice 5. |

## Next Pilot-First Slices

| Slice | Revised Name | Scope | Gate |
| --- | --- | --- | --- |
| 3.5 | Manual Launch Comms Support | Shareable drop link and WhatsApp-safe copy from drop fields. No WATI integration. | Operator can promote a live drop manually. |
| 4A | Claim Hold / Order Intent | Claim button, auth gate, inventory hold transaction, hold expiry, order draft/payment-pending state. | Consumer reserves a bag temporarily without oversell. |
| 4B | Razorpay Payment & Order Confirmation | Razorpay order creation, verified webhook, paid/confirmed order, QR/OTP. | Consumer pays and sees confirmed pickup proof. |
| 5 | Pickup Verification & Incident Basics | Staff verification MVP, collected status, no-show path, minimal incident creation. | Restaurant verifies pickup and can log launch incidents. |
| 6 | Transactional Notifications | WhatsApp/email outbox, confirmations, pickup reminders, merchant alerts. | Confirmation and reminder messages are delivered. |
| 7 | Pilot Finance & Settlement | Settlement runs, payout entries, invoices, restaurant payout view. | Admin creates/locks settlement and restaurant sees payout. |
| 8A | Pilot ROI Reports | Weekly partner report: listed/sold, sell-through, GMV, estimated net, pickup completion, no-shows, incidents. | Restaurant sees ROI within 7 days. |
| 8B | Admin Ops Hardening | Suspend/pause, config flags, refund support, audit trail, incident/support queue. | Ops can manage first 10 partners safely. |

## Historical Verification Notes

- Slice 0 `npm run ci` completed successfully across lint, typecheck, tests, and builds in a configured environment.
- Slice 1 migration/demo SQL were not applied in the earlier shell because local Supabase CLI/env was unavailable.
- Slice 2 demo seed requires Slice 1 auth users first.
- Slice 3 production build for consumer-web must be run with env loaded, for example: `npx.cmd dotenv -e .env.local -- npm.cmd --workspace @gozaika/consumer-web run build`.
- PowerShell may block `npm.ps1`; use `npm.cmd` on Windows when execution policy blocks npm scripts.
