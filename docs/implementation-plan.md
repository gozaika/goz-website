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

7. Recreate Slice 3.5 manual launch comms after Slice 3 is available:

   - Add shared URL and alert helpers in `packages/utils/src/index.ts`.
   - Add copy/share UI in `packages/ui/src/launch-comms-actions.tsx`.
   - Integrate customer share actions on `/drops` cards and `/drops/[id]`.
   - Integrate restaurant publish success and recent-drop copy panels in `apps/restaurant-mgmt-web/app/portal/drops/new`.
   - Add admin `/admin/drops` for active/scheduled public drops.
   - No migration, env var, Realtime, or seed changes are required.

8. Start app surfaces:

   ```powershell
   npm run dev:consumer
   npm run dev:restaurant
   npm run dev:admin
   ```

9. Recreate Slice 4A claim holds after Slices 0, 1, 2, 3, and 3.5 are available:

   - Apply migration `20260518002000_slice4a_claim_hold_order_intent.sql`.
   - Deploy `customer.gozaika.in`, `restaurant.gozaika.in`, and `admin.gozaika.in`.
   - Confirm the existing `release-expired-holds` Supabase Edge Function is deployed and can call `api_release_expired_inventory_holds`.
   - Use a signed-in consumer with operational consent to open a public active/scheduled drop and create one temporary hold.
   - Do not configure Razorpay, WATI, pickup QR/OTP, refunds, or settlement env vars for Slice 4A.

10. Recreate Slice 4B Razorpay payment and order confirmation after Slice 4A is available:

   - Apply migration `20260521000000_slice4b_razorpay_payment_order_confirmation.sql`.
   - Configure `NEXT_PUBLIC_RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET`, and `PICKUP_CREDENTIAL_SECRET` in the target environments.
   - Deploy `razorpay-webhook` after the migration so verified capture events can call `api_convert_paid_hold_to_order`.
   - Redeploy `customer.gozaika.in`, `restaurant.gozaika.in`, and `admin.gozaika.in`.
   - Create a Slice 4A hold, start Razorpay checkout from `/checkout/{holdPk}`, and confirm a captured webhook creates a paid order visible at `/orders/{orderPk}`.

11. Recreate Slice 5 pickup verification and incident basics after Slice 4B is available:

   - Apply migration `20260525000000_slice5_pickup_verification_incidents.sql`.
   - Keep `PICKUP_CREDENTIAL_SECRET` configured for consumer and restaurant/admin server routes.
   - Redeploy `customer.gozaika.in`, `restaurant.gozaika.in`, `admin.gozaika.in`, and `gozaika.in`.
   - Use a webhook-confirmed paid order to verify OTP pickup from `/portal/orders`.
   - Confirm duplicate verify attempts do not create duplicate collection transitions.
   - Confirm no-show works only after pickup window close and incident creation is visible to restaurant/admin support.

12. Recreate Slice 6 transactional notifications after Slice 5 is available:

   - Apply migration `20260526000000_slice6_transactional_notifications.sql`.
   - Configure `NOTIFICATION_DRY_RUN=true` for local/staging non-provider tests, or configure Meta Cloud API sandbox/Resend env vars for provider sends.
   - Deploy `notification-outbox-worker`, `pickup-reminder-cron`, and `razorpay-webhook`.
   - Use a webhook-confirmed paid order to verify confirmation and restaurant alert rows.
   - Run pickup reminder cron for an eligible paid, uncollected order and verify no duplicate reminders on rerun.
   - Run the worker and verify delivery attempts move rows to sent, failed, suppressed, or retryable queued states.

13. Recreate Slice 7 pilot finance settlements after Slice 6 is available:

   - Apply migration `20260527000000_slice7_pilot_finance_settlement.sql`.
   - Deploy `settlement-run-worker`. Leave `SETTLEMENT_WORKER_ACTOR_PROFILE_PK` unset unless ops intentionally wants worker-created draft settlements.
   - Redeploy `restaurant.gozaika.in` and `admin.gozaika.in`.
   - Use a webhook-confirmed captured order whose pickup window has closed and whose status is `COLLECTED` or `NO_SHOW`.
   - Open `/admin/finance`, preview the restaurant/period, create/recalculate one draft, lock it, issue invoice metadata, and manually mark payout status.
   - Open `/portal/finance` as the restaurant owner and confirm only own settlement summaries/details are visible.
   - Do not configure Razorpay transfer, payout, refund, fund-account, invoice-generation, or accounting integration env vars for Slice 7.

14. Recreate Slice 8A pilot ROI reports after Slice 7 is available:

   - Apply migration `20260528000000_slice8a_pilot_roi_reports.sql`.
   - Redeploy `restaurant.gozaika.in` and `admin.gozaika.in`.
   - Open `/portal/reports` as a restaurant owner and confirm weekly own-restaurant metrics: drops listed, bags listed/sold, sell-through, GMV, estimated or settlement-backed net recovery, pickup completion, no-shows, refunds/debits, incidents, and buyer signals.
   - Open `/admin/reports`, select a restaurant and weekly period, inspect drop/order metrics, notes, settlement context, and copy/download partner-safe report text.
   - No new env vars, Edge Functions, workers, scheduled digests, export jobs, refund APIs, payout APIs, settlement recalculation, or native mobile reporting are required.

15. Recreate Slice 8B admin ops hardening after Slice 8A is available:

   - Apply migration `20260529000000_slice8b_admin_ops_hardening.sql`.
   - Redeploy `admin.gozaika.in`, `restaurant.gozaika.in`, and `customer.gozaika.in`.
   - Open `/admin/ops` and confirm restaurant/drop ops queues, support tickets, incident triage, refund support tracking, config flags, audit history, and support-safe copy/download.
   - Use required reason text to pause/reactivate a restaurant and pause/resume a drop.
   - Confirm restaurant publishing and consumer discovery/claim guardrails respect restaurant status, drop status, `CLAIMS_ENABLED`, `PUBLISHING_ENABLED`, and `MAX_BAGS_PER_DROP`.
   - No new env vars, Edge Functions, workers, provider refund APIs, payout APIs, settlement recalculation, or notification side effects are required.

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
| 4B | Razorpay Payment & Order Confirmation | Razorpay order creation, verified webhook, paid/confirmed order, QR/OTP. | Consumer pays and sees confirmed pickup proof. |
| 5 | Pickup Verification & Incident Basics | Staff verification MVP, collected status, no-show path, minimal incident creation. | Restaurant verifies pickup and can log launch incidents. |
| 7 | Pilot Finance & Settlement | Settlement runs, payout entries, invoices, restaurant payout view. | Admin creates/locks settlement and restaurant sees payout. |
| 8A | Pilot ROI Reports | Weekly partner report: listed/sold, sell-through, GMV, estimated net, pickup completion, no-shows, incidents. | Restaurant sees ROI within 7 days. |
| 8B | Admin Ops Hardening | Suspend/pause, config flags, refund support, audit trail, incident/support queue. | Ops can manage first 10 partners safely. |

## Historical Verification Notes

- Slice 0 `npm run ci` completed successfully across lint, typecheck, tests, and builds in a configured environment.
- Slice 1 migration/demo SQL were not applied in the earlier shell because local Supabase CLI/env was unavailable.
- Slice 2 demo seed requires Slice 1 auth users first.
- Slice 3 production build for consumer-web must be run with env loaded, for example: `npx.cmd dotenv -e .env.local -- npm.cmd --workspace @gozaika/consumer-web run build`.
- PowerShell may block `npm.ps1`; use `npm.cmd` on Windows when execution policy blocks npm scripts.

### Public Drop SQL Smoke Query

After applying Slice 3 migrations, this query should return consumer-visible drops:

```sql
select
  drop_id,
  restaurant_name,
  drop_title,
  drop_status_code,
  available_quantity,
  price_paise
from api_public_drop_card
order by pickup_start_at desc
limit 10;
```

Canonical app columns remain available as `drop_drop_pk` and `computed_quantity_available`.

### Template Activation Recovery

If a template appears in the restaurant portal but is unavailable in the drop template selector, check whether `catalog_bag_template.active_revision_fk` is null. Apply migration `20260518000000_slice3_template_active_revision_repair.sql` to repair templates that already have a published revision. The portal also exposes a `Publish existing revision` action for templates with a published revision but no active pointer.

### One-Click Drop Publishing

Apply migration `20260518001000_slice3_template_drop_preferences.sql` before deploying the matching restaurant portal code. Templates now store:

- `default_drop_quantity`
- `default_pickup_start_offset_minutes`
- `default_pickup_duration_minutes`

The restaurant drop form uses those defaults to preselect the template, quantity, price, pickup start, pickup end, type, and active status. Busy restaurant staff should be able to publish a standard drop with one confirmation click, while still having quick controls for start time and pickup duration.

### Template Revision Rules

- Editing a template creates a new published revision and points `active_revision_fk` at it.
- Existing drops continue to reference the revision they were created from.
- Deleting a template means archiving it (`template_status_code = 'ARCHIVED'`), not hard-deleting rows.
- Duplicating a template copies the active revision and allergen map into a new active template.


## Slice 3.5: Manual Launch Comms Support

### Goal

Enable Hyderabad pilot operators and restaurant staff to manually promote public drops with stable consumer links and WhatsApp-safe text before WATI, notification outbox, payment, or claim automation exists.

### Completed

- [x] Keep the public drop destination as consumer-web `/drops/[id]`, backed by the existing safe `api_public_drop_card` view.
- [x] Add centralized launch copy helpers in `packages/utils/src/index.ts`: `createPublicDropUrl` and `generateManualDropAlertText`.
- [x] Add formatter tests in `packages/utils/src/index.test.ts` for stable URLs, allergen safety copy, and unavailable-drop wording.
- [x] Add reusable clipboard/native-share UI in `packages/ui/src/launch-comms-actions.tsx`.
- [x] Add consumer-web copy/share controls to `/drops` cards and `/drops/[id]`.
- [x] Add restaurant portal copy panels on publish success and recent active/scheduled public drops in `/portal/drops/new`.
- [x] Add admin `/admin/drops` so operators can copy the same public link and alert text without touching Supabase directly.
- [x] Update product and runbook docs for manual launch operations.

### Shared Copy Contract

`generateManualDropAlertText` must derive text only from public drop fields: restaurant name, drop title, pickup window, price, quantity/availability, status, dietary category, allergen codes/summary, pickup neighborhood/context, and public URL. It must not promise specific bag contents, payment availability, automatic WhatsApp delivery, or guaranteed remaining stock.

When allergen data exists, the alert includes:

```text
Check allergens before claiming.
```

Unavailable or sold-out inputs say:

```text
Availability: Not available to claim right now
```

### Files And Modules Changed

- `packages/utils/src/index.ts`
- `packages/utils/src/index.test.ts`
- `packages/ui/src/index.tsx`
- `packages/ui/src/launch-comms-actions.tsx`
- `apps/consumer-web/app/drops/drop-discovery-client.tsx`
- `apps/consumer-web/app/drops/[id]/page.tsx`
- `apps/restaurant-mgmt-web/lib/slice3.ts`
- `apps/restaurant-mgmt-web/app/api/portal/drops/route.ts`
- `apps/restaurant-mgmt-web/app/portal/drops/new/page.tsx`
- `apps/restaurant-mgmt-web/app/portal/drops/new/drop-publishing-form.tsx`
- `apps/admin-web/app/admin/page.tsx`
- `apps/admin-web/app/admin/restaurants/onboarding/page.tsx`
- `apps/admin-web/app/admin/drops/page.tsx`
- `docs/product/drop-publishing-discovery.md`
- `docs/runbooks/manual-launch-comms.md`
- `docs/implementation-plan.md`

### Database And RLS Notes

No Slice 3.5 migration is required. Public links and copy use `api_public_drop_card`, which already grants `select` to `anon` and `authenticated` and is constrained by `public.rls_drop_is_public(drop_drop_pk)`. Admin and restaurant server code may use service-role clients for their authenticated portals, but the copied content is still generated from the same public discovery view where possible. No service-role key is exposed to browser code.

### Verification Commands

Run these from repo root on Windows:

```powershell
npm.cmd --workspace @gozaika/utils run test
npm.cmd --workspace @gozaika/types run typecheck
npm.cmd --workspace @gozaika/utils run typecheck
npm.cmd --workspace @gozaika/ui run typecheck
npm.cmd --workspace @gozaika/consumer-web run typecheck
npm.cmd --workspace @gozaika/restaurant-mgmt-web run typecheck
npm.cmd --workspace @gozaika/admin-web run typecheck
npm.cmd --workspace @gozaika/consumer-web run lint
npm.cmd --workspace @gozaika/restaurant-mgmt-web run lint
npm.cmd --workspace @gozaika/admin-web run lint
npm.cmd --workspace @gozaika/consumer-web run build
npm.cmd --workspace @gozaika/restaurant-mgmt-web run build
npm.cmd --workspace @gozaika/admin-web run build
```

### Manual Smoke Tests

Restaurant portal:

1. Sign in as an approved restaurant user.
2. Create or use an active template.
3. Publish an active or scheduled drop.
4. Copy public drop link.
5. Copy WhatsApp alert text.
6. Open the copied link in a private/incognito browser.

Consumer web:

1. Open the shared drop URL.
2. Confirm restaurant, title, dietary category, allergens, price, pickup window, and quantity appear clearly.
3. Confirm eligible drops expose a hold CTA and still say payment is not charged yet.
4. Confirm copy/share controls show visible success or failure feedback.

Admin portal:

1. Sign in as admin/operator.
2. Open `/admin/drops`.
3. Find an active or scheduled public drop.
4. Copy the public link and alert message.
5. Confirm the copied message matches the restaurant version for the same public drop fields.

Safety:

1. Confirm paused, closed, cancelled, draft, and non-public drops do not appear in the admin launch-comms list.
2. Confirm unavailable/sold-out formatter output does not say bags are available.
3. Confirm allergen text and the allergen safety line are present when allergen data exists.

### Deployment And Operator Notes

- Supabase migration: none for Slice 3.5.
- Vercel env vars: none added.
- Vercel redeploys required: `customer.gozaika.in`, `restaurant.gozaika.in`, and `admin.gozaika.in`.
- Realtime settings: no change.
- Seed/demo refresh: not required if remote already has at least one active or scheduled public drop.
- Remote manual action: after deploy, sign into restaurant/admin portals and run the smoke tests above against remote drops.

### Expected App State After Slice 3.5

| App | What you should see now |
| --- | --- |
| `apps/consumer-web` / `https://customer.gozaika.in/` | `/drops` cards and `/drops/[id]` expose copy/share actions. Drop detail remains a public destination with dietary, allergen, pickup, price, quantity, and Slice 4A claim holds for eligible drops. |
| `apps/restaurant-mgmt-web` / `https://restaurant.gozaika.in/` | Approved active restaurants can publish a drop and immediately copy the public link or WhatsApp-safe alert. Recent active/scheduled public drops show the same launch comms panel. |
| `apps/admin-web` / `https://admin.gozaika.in/` | `/admin/drops` lists active/scheduled public drops with copyable public links and matching alert text for manual launch support. |
| `apps/website` / `https://gozaika.in/` | No Slice 3.5 functional changes. |
| Mobile apps | No Slice 3.5 parity yet. |

### Out Of Scope

No WATI integration, notification outbox, scheduled/background sends, campaign management, Razorpay, payment, pickup verification, settlements, Swaad Club, referrals, or native mobile work.

## Slice 4A: Claim Hold / Order Intent

### Goal

Let a signed-in consumer temporarily reserve one public active/scheduled BAM Bag without oversell, while keeping Razorpay payment capture, confirmed orders, and pickup proof out of scope.

### Completed

- [x] Add migration `20260518002000_slice4a_claim_hold_order_intent.sql`.
- [x] Update `api_create_inventory_hold` to accept public `ACTIVE` or `SCHEDULED` drops, keep row-lock/idempotency behavior, require an authenticated consumer profile, and append `drop_inventory_event`.
- [x] Add `api_claim_hold_summary`, a safe hold/order-intent read model for own consumer holds, own-restaurant support visibility, and verified platform admins.
- [x] Add consumer `POST /api/claims` with `claimRequestSchema`, login-required handling, duplicate active-hold protection, public claimability checks, idempotency key support, and typed `ApiResponse<ClaimCreationResult>`.
- [x] Replace the Slice 3 disabled claim state on cards/detail with `Hold this BAM Bag` for claimable drops and specific disabled reasons for sold out, paused, closed, cancelled, expired, or unavailable drops.
- [x] Preserve anonymous claim intent through `/auth/login?next=/drops/{dropPk}?claim=1`, OAuth callback, and consent capture when required.
- [x] Add `/checkout/[holdPk]` hold confirmation showing restaurant, drop, dietary/allergen disclosures, pickup window, price, quantity held, expiry timestamp/countdown, and payment-coming-next copy.
- [x] Add account current holds so consumers can find active/recent payment-pending claim intents.
- [x] Show held/not-paid count in restaurant recent drops.
- [x] Extend admin `/admin/drops` with active/recent hold support metadata without exposing private compliance data or payment/provider data.
- [x] Document hold expiry operations and remote migration steps.

### Validation Gate

A signed-in consumer can claim a public active/scheduled drop with available quantity, receive a visible temporary hold confirmation, and return to the drop to see reduced availability. Anonymous consumers are routed through login and returned to the claim flow. Repeated clicks/retries do not create duplicate active holds for the same consumer/drop, and the database RPC remains the atomic oversell guard.

### Remote Migration Steps

Apply this migration to the target Supabase project before deploying the Slice 4A app code:

```powershell
Get-Content -Raw supabase/migrations/20260518002000_slice4a_claim_hold_order_intent.sql
```

Review the SQL, then run the exact file contents once in the Supabase Dashboard SQL editor for the remote project, or through the approved remote migration process used for previous slices. Verify:

```sql
select to_regprocedure('public.api_create_inventory_hold(uuid,text,integer,integer)');
select to_regclass('public.api_claim_hold_summary');
```

### Verification Commands

```powershell
npm.cmd --workspace @gozaika/types run typecheck
npm.cmd --workspace @gozaika/utils run typecheck
npm.cmd --workspace @gozaika/ui run typecheck
npm.cmd --workspace @gozaika/consumer-web run typecheck
npm.cmd --workspace @gozaika/restaurant-mgmt-web run typecheck
npm.cmd --workspace @gozaika/admin-web run typecheck
npm.cmd --workspace @gozaika/consumer-web run lint
npm.cmd --workspace @gozaika/restaurant-mgmt-web run lint
npm.cmd --workspace @gozaika/admin-web run lint
npx.cmd dotenv -e .env.local -- npm.cmd --workspace @gozaika/consumer-web run build
npm.cmd --workspace @gozaika/restaurant-mgmt-web run build
npm.cmd --workspace @gozaika/admin-web run build
```

### Out Of Scope

No Razorpay order creation, Checkout.js, payment capture, payment verification, webhook processing, paid/confirmed order status, pickup QR/OTP, refunds, settlements, payouts, invoices, WATI/email/push sends, notification outbox processing, campaign management, Swaad Club, referrals, native mobile parity, or destructive admin hold cancellation.

## Slice 4B: Razorpay Payment & Order Confirmation

### Goal

Convert an active Slice 4A BAM Bag hold into a Razorpay-paid, confirmed, pickup-ready order without oversell, duplicate payment/order creation, or trusting client-side callbacks.

### Completed

- [x] Add migration `20260521000000_slice4b_razorpay_payment_order_confirmation.sql`.
- [x] Extend payment/order status constraints for Razorpay order-created and payment-pending/confirmed order states.
- [x] Add service-role RPCs `api_convert_paid_hold_to_order` and `api_record_razorpay_payment_failed`.
- [x] Add safe read models for consumer orders, restaurant paid order queue, admin payment/order state, and admin webhook state.
- [x] Add consumer `POST /api/checkout/razorpay-order` that validates the authenticated hold, creates or reuses a payment intent, calls Razorpay Orders API server-side, and returns only Checkout-safe fields.
- [x] Add consumer `/api/checkout/status` polling so the UI waits for webhook-backed confirmation.
- [x] Update `razorpay-webhook` to verify raw-body signatures, insert idempotent webhook ledger rows, process captured/failed events, and mark processing status.
- [x] Convert captured payment webhooks into `payment_transaction`, `order_order`, `order_item`, `order_status_transition`, `drop_inventory_event` (`HOLD_CONVERTED`), and converted hold rows atomically.
- [x] Add consumer confirmed order detail with order number, pickup window, disclosures, paid amount, QR-style pickup proof, and OTP fallback. Raw QR nonce/OTP are never stored; only hashes are persisted.
- [x] Add account paid order history separate from temporary holds.
- [x] Add restaurant `/portal/orders` paid/confirmed order visibility.
- [x] Extend admin `/admin/drops` with payment intent and webhook support sections.

### Validation Gate

A signed-in consumer can hold a public BAM Bag, proceed to Razorpay checkout, see a pending confirmation state, and reach a confirmed order page only after a verified captured webhook processes. Webhook replay returns idempotently without duplicate orders or payment transactions. Failed/dismissed payments do not convert holds. Expired unpaid holds continue to release through `api_release_expired_inventory_holds`.

### Remote Migration Steps

Apply this migration to the target Supabase project after all prior Slice 4A migrations:

```powershell
Get-Content -Raw supabase/migrations/20260521000000_slice4b_razorpay_payment_order_confirmation.sql
```

Review the SQL, then run it once in the Supabase Dashboard SQL editor or the approved remote migration path. Verify:

```sql
select to_regprocedure('public.api_convert_paid_hold_to_order(text,text,bigint,text,text,bigint,bigint,timestamp with time zone,uuid,jsonb)');
select to_regclass('public.api_consumer_order_summary');
select to_regclass('public.api_admin_payment_webhook_summary');
```

Deploy the webhook after migration:

```powershell
supabase functions deploy razorpay-webhook
```

### Environment

- Consumer web: `NEXT_PUBLIC_RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `PICKUP_CREDENTIAL_SECRET`, `SUPABASE_SERVICE_ROLE_KEY`.
- Supabase Edge Function: `RAZORPAY_WEBHOOK_SECRET`, `SUPABASE_SERVICE_ROLE_KEY`.
- Razorpay dashboard webhook URL must point to the deployed `razorpay-webhook` function and include `payment.captured` and `payment.failed`.
- `PICKUP_CREDENTIAL_SECRET` must be at least 32 random characters and shared by consumer web deployments that issue pickup proof. Raw QR nonce/OTP values are generated per order view and stored only as hashes.

### Verification Commands

```powershell
npm.cmd --workspace @gozaika/types run typecheck
npm.cmd --workspace @gozaika/consumer-web run typecheck
npm.cmd --workspace @gozaika/restaurant-mgmt-web run typecheck
npm.cmd --workspace @gozaika/admin-web run typecheck
npm.cmd --workspace @gozaika/consumer-web run lint
npm.cmd --workspace @gozaika/restaurant-mgmt-web run lint
npm.cmd --workspace @gozaika/admin-web run lint
npx.cmd dotenv -e .env.local -- npm.cmd --workspace @gozaika/consumer-web run build
npm.cmd --workspace @gozaika/restaurant-mgmt-web run build
npm.cmd --workspace @gozaika/admin-web run build
```

### Out Of Scope

No refunds, refund initiation, settlement runs, payouts, invoices, finance dashboards, Razorpay transfers, reconciliation exports, staff pickup verification, collected/no-show transitions, incident creation, WATI/email/push notifications, Swaad Club, referrals, subscriptions, native mobile parity, or destructive admin payment/order corrections.

## Slice 5: Pickup Verification, Incident Basics & Pilot UX Polish

### Goal

Let restaurants verify paid pickup-ready orders at the counter, transition them to collected exactly once, mark true no-shows after pickup windows, log minimal launch incidents, and remove high-friction pilot UX clutter before broader launch.

### Completed

- [x] Add migration `20260525000000_slice5_pickup_verification_incidents.sql`.
- [x] Add service-role RPCs `api_verify_order_pickup`, `api_mark_order_no_show`, and `api_create_order_incident`.
- [x] Verify pickup with server-side hashes derived from `PICKUP_CREDENTIAL_SECRET`; raw OTP, QR nonce, hashes, and secrets are never exposed in browser-safe views.
- [x] Record `order_pickup_verification_event`, `order_status_transition`, and `drop_inventory_event` with `PICKUP_COLLECTED` for successful collection.
- [x] Prevent duplicate collection transitions on retries, refreshes, and replay attempts.
- [x] Add no-show transition after pickup window close with required reason and no refund/payment mutation.
- [x] Add restaurant and admin incident creation for the pilot incident categories.
- [x] Add safe restaurant/admin pickup and incident read models.
- [x] Update consumer order detail and account history for collected/no-show terminal states.
- [x] Update restaurant `/portal/orders` with OTP-first verification, QR payload paste, no-show, and incident logging.
- [x] Redesign restaurant `/portal/drops/new` so the publish form height is stable and recent drops scroll independently.
- [x] Update consumer `/drops` latest/current ordering and separate closed windows into `What you missed`.
- [x] Update consumer `/account` to separate active holds from expired/released/converted history.
- [x] Update admin `/admin/drops` for active/closed drops, payment/webhook state, pickup state, and incident scanning.
- [x] Update website copy/footer/legal/form fallbacks to the approved goZaika mailboxes.

### Validation Gate

A paid confirmed or ready-for-pickup order can be verified by an authorized restaurant user using OTP, moves once to `COLLECTED`, and records pickup verification, status transition, and inventory audit. Invalid OTP/QR, wrong restaurant, already collected, expired window, and not-ready cases return specific failures. No-show works only after pickup window close, with audit and no payment/refund mutation. Restaurant/admin can create and view minimal incidents. Consumer, restaurant, admin, and website UX reflect Slice 5 states without exposing unsafe data.

### Remote Migration Steps

Apply this migration after all Slice 4B migrations:

```powershell
Get-Content -Raw supabase/migrations/20260525000000_slice5_pickup_verification_incidents.sql
```

Review the SQL, then run it once in the Supabase Dashboard SQL editor or approved remote migration path. Verify:

```sql
select to_regprocedure('public.api_verify_order_pickup(uuid,uuid,uuid,text,text,text,text)');
select to_regprocedure('public.api_mark_order_no_show(uuid,uuid,uuid,text,text)');
select to_regprocedure('public.api_create_order_incident(uuid,uuid,uuid,text,text,text,text,text)');
select to_regclass('public.api_restaurant_pickup_order_summary');
select to_regclass('public.api_admin_pickup_order_summary');
select to_regclass('public.api_admin_incident_summary');
```

### Verification Commands

```powershell
npm.cmd --workspace @gozaika/types run typecheck
npm.cmd --workspace @gozaika/consumer-web run typecheck
npm.cmd --workspace @gozaika/restaurant-mgmt-web run typecheck
npm.cmd --workspace @gozaika/admin-web run typecheck
npm.cmd --workspace @gozaika/website run typecheck
npm.cmd --workspace @gozaika/consumer-web run lint
npm.cmd --workspace @gozaika/restaurant-mgmt-web run lint
npm.cmd --workspace @gozaika/admin-web run lint
npm.cmd --workspace @gozaika/website run lint
npx.cmd dotenv -e .env.local -- npm.cmd --workspace @gozaika/consumer-web run build
npm.cmd --workspace @gozaika/restaurant-mgmt-web run build
npm.cmd --workspace @gozaika/admin-web run build
npm.cmd --workspace @gozaika/website run build
```

### Out Of Scope

No native mobile camera scanning, offline pickup cache, refunds, settlements, payouts, finance dashboards, WATI/email/push notifications, full support ticketing, destructive admin correction flows, loyalty/referrals, reviews, campaign management, or advanced analytics.

## Slice 6: Transactional Notifications & Delivery Logs

### Goal

Automate pilot-critical transactional communications after the webhook-confirmed paid pickup loop: consumer order confirmations, pickup reminders, restaurant operational alerts, delivery attempts, and support-safe fallback visibility.

### Completed

- [x] Add migration `20260526000000_slice6_transactional_notifications.sql`.
- [x] Harden existing `notification_template`, `notification_outbox`, and `notification_delivery_attempt` with idempotency keys, worker claim metadata, retry/suppression metadata, provider tracking, and safe fallback copy.
- [x] Seed pilot transactional templates for order confirmation, pickup reminder, restaurant order/pickup alerts, and high-severity incident email alerts.
- [x] Add service-role RPCs `api_enqueue_order_notifications`, `api_enqueue_pickup_reminders`, `api_enqueue_incident_alerts`, `api_claim_notification_batch`, `api_record_notification_delivery_attempt`, `api_retry_notification`, and `api_suppress_notification`.
- [x] Update `razorpay-webhook` so verified paid order conversion enqueues notifications as post-conversion side effects only.
- [x] Replace `pickup-reminder-cron` scaffold with a real idempotent reminder enqueue path.
- [x] Add `notification-outbox-worker` with Meta WhatsApp, WATI, and Resend adapters, explicit dry-run mode, provider-not-configured failure state, and delivery attempt logging.
- [x] Add consumer order/account notification status visibility.
- [x] Add restaurant own-order notification history on `/portal/orders`.
- [x] Add consumer and restaurant profile email/contact editing so notification destinations can be corrected before provider smoke tests.
- [x] Add admin `/admin/notifications` for filters, provider refs, masked destinations, attempts, retry, suppress, and fallback copy.
- [x] Document product behavior, runbook operations, config, deployment, payment boundary, pickup reminders, manual fallback boundary, and demo-data policy.

### Validation Gate

A verified Razorpay captured webhook creates a paid order and enqueues order confirmation plus restaurant alert rows without changing payment/order correctness. Pickup reminder cron enqueues exactly one reminder per eligible order/channel/template window and is safe to rerun. The worker processes queued rows through Meta WhatsApp, WATI, Resend, or `NOTIFICATION_DRY_RUN`, records delivery attempts, and transitions rows to sent, failed, suppressed, or retryable queued states. Consent/preference failures are visible as suppressed rows. Consumer, restaurant, and admin surfaces show support-safe notification state without raw provider payloads, OTPs, QR nonces, hashes, secrets, private docs, or unnecessary PII.

### Remote Migration Steps

Apply this migration after all Slice 5 migrations:

```powershell
Get-Content -Raw supabase/migrations/20260526000000_slice6_transactional_notifications.sql
```

Review the SQL, then run it once in the Supabase Dashboard SQL editor or the approved remote migration path. Verify:

```sql
select to_regprocedure('public.api_enqueue_order_notifications(uuid)');
select to_regprocedure('public.api_enqueue_pickup_reminders(integer,integer)');
select to_regprocedure('public.api_claim_notification_batch(integer)');
select to_regprocedure('public.api_record_notification_delivery_attempt(uuid,text,text,text,text,text,text,integer)');
select to_regclass('public.api_admin_notification_delivery_summary');
```

### Environment And Deploy

Local/staging can use dry run:

```text
NOTIFICATION_DRY_RUN=true
SUPABASE_SERVICE_ROLE_KEY
```

Production provider delivery requires explicit configuration:

```text
RESEND_API_KEY
NOTIFICATION_RESEND_FROM_EMAIL or RESEND_FROM_EMAIL
NOTIFICATION_WHATSAPP_PROVIDER=META
META_WHATSAPP_ACCESS_TOKEN
META_WHATSAPP_PHONE_NUMBER_ID
META_WHATSAPP_GRAPH_VERSION
META_WHATSAPP_TEMPLATE_LANGUAGE
META_WHATSAPP_TEMPLATE_OVERRIDE
META_WHATSAPP_TEMPLATE_PARAM_ORDER
META_WHATSAPP_SEND_MODE
```

WATI remains available for a later switch with `NOTIFICATION_WHATSAPP_PROVIDER=WATI`, `WATI_API_BASE_URL`, `WATI_API_TOKEN`, and optional `WATI_BROADCAST_NAME`.

Deploy Edge Functions after migration:

```powershell
supabase functions deploy notification-outbox-worker
supabase functions deploy pickup-reminder-cron
supabase functions deploy razorpay-webhook
```

### Verification Commands

```powershell
npm.cmd --workspace @gozaika/types run typecheck
npm.cmd --workspace @gozaika/consumer-web run typecheck
npm.cmd --workspace @gozaika/restaurant-mgmt-web run typecheck
npm.cmd --workspace @gozaika/admin-web run typecheck
npm.cmd --workspace @gozaika/consumer-web run lint
npm.cmd --workspace @gozaika/restaurant-mgmt-web run lint
npm.cmd --workspace @gozaika/admin-web run lint
npx.cmd dotenv -e .env.local -- npm.cmd --workspace @gozaika/consumer-web run build
npm.cmd --workspace @gozaika/restaurant-mgmt-web run build
npm.cmd --workspace @gozaika/admin-web run build
```

### Smoke Test Flow

1. Complete a Razorpay test payment so `razorpay-webhook` converts the hold.
2. Confirm `notification_outbox` has idempotent `ORDER_CONFIRMATION` and `RESTAURANT_NEW_ORDER_ALERT` rows.
3. Open `/orders/{orderPk}` and `/account`; confirm plain notification state appears.
4. Run `pickup-reminder-cron` for an eligible paid, uncollected order; rerun and confirm no duplicate reminder rows.
5. Run `notification-outbox-worker` with `NOTIFICATION_DRY_RUN=true`; confirm attempts are recorded and rows become `SENT`.
6. Queue a fresh WhatsApp row, configure Meta sandbox env, set `NOTIFICATION_DRY_RUN=false`, and run `notification-outbox-worker`; confirm a Meta provider attempt is recorded.
7. Revoke `WHATSAPP_TRANSACTIONAL` consent or disable WhatsApp preference and confirm a `SUPPRESSED` support-visible row.
8. Open restaurant `/portal/orders` and admin `/admin/notifications`; confirm own-order scoping, masked destinations, provider refs, retry/suppress, and fallback copy.

### Out Of Scope

No native mobile push, Expo token registration, marketing automation, bulk broadcasting, waitlist drip campaigns, referrals, loyalty, refunds, settlements, payouts, finance dashboards, destructive order correction, or native app parity.

## Slice 7: Pilot Finance & Settlement

### Goal

Give pilot operators and restaurant partners a trustworthy, auditable manual settlement workflow for completed paid pickup orders without initiating live money movement.

### Completed

- [x] Add additive migration `20260527000000_slice7_pilot_finance_settlement.sql`.
- [x] Harden existing finance tables with active-run idempotency, locked-run immutability, manual notes, invoice metadata, masked account read models, and audit logging.
- [x] Add settlement RPCs for preview, create/recalculate draft, manual adjustment, lock, invoice metadata, and manual payout status progression.
- [x] Calculate settlements from webhook-confirmed captured orders whose pickup windows have closed and whose order status is `COLLECTED` or `NO_SHOW`.
- [x] Exclude non-captured, open-window, non-terminal, and already-settled orders with explicit reasons.
- [x] Add admin `/admin/finance` for restaurant/period preview, draft/recalc, lock, adjustment, invoice metadata, status marking, and line-entry inspection.
- [x] Replace restaurant `/portal/finance` placeholder with own-restaurant settlement summaries/details.
- [x] Harden `settlement-run-worker` as a bounded preview/draft-refresh worker with `livePayoutsEnabled=false`.
- [x] Add typed finance request/response models and money/status helpers.
- [x] Add product and runbook docs for pilot finance settlement.

### Validation Gate

Admin can preview eligible captured paid orders for a restaurant/period, create or recalculate one draft idempotently, inspect line entries, and lock it without duplicate entries or floating-point money defects. Restaurant users can open `/portal/finance` and see only their own settlement summaries/details with gross, deductions, refunds/debits, adjustments, net payout, invoice status, payout status, and masked payout account state. Locked runs reject recalculation and line-entry mutation; status progression remains manual and auditable.

### Remote Migration Steps

Apply this migration after all Slice 6 migrations:

```powershell
Get-Content -Raw supabase/migrations/20260527000000_slice7_pilot_finance_settlement.sql
```

Review the SQL, then run it once in the Supabase Dashboard SQL editor or the approved remote migration path. Verify:

```sql
select to_regprocedure('public.api_preview_restaurant_settlement(uuid,timestamp with time zone,timestamp with time zone,uuid)');
select to_regprocedure('public.api_create_or_recalculate_settlement_run(uuid,timestamp with time zone,timestamp with time zone,uuid,text)');
select to_regprocedure('public.api_lock_settlement_run(uuid,uuid,text)');
select to_regprocedure('public.api_mark_settlement_status(uuid,uuid,text,text,text)');
select to_regclass('public.api_admin_finance_settlement_summary');
select to_regclass('public.api_restaurant_finance_settlement_summary');
```

Deploy Edge Function after migration:

```powershell
supabase functions deploy settlement-run-worker
```

### Environment

Required:

```text
SUPABASE_SERVICE_ROLE_KEY
```

Optional:

```text
SETTLEMENT_WORKER_ACTOR_PROFILE_PK
```

No Razorpay transfer, payout, refund, fund-account, invoice-generation, Tally/Zoho/QuickBooks, or CA workflow env vars are introduced in Slice 7.

### Smoke Test Flow

1. Complete a Razorpay test payment and let the verified webhook create a captured order.
2. Verify pickup as `COLLECTED`, or after pickup window close mark `NO_SHOW`.
3. Open `/admin/finance`, select the restaurant and period, and preview eligibility.
4. Create/recalculate draft twice and confirm only one active settlement exists for the period.
5. Inspect gross, commission, payment fee/tax, refund/debit, adjustment, and net payout entries.
6. Add a manual adjustment before lock.
7. Lock the settlement and confirm recalculation/adjustment paths are blocked.
8. Issue invoice metadata and mark `SENT`, `PAID`, `RECONCILED` manually.
9. Open `/portal/finance` as the restaurant owner and confirm own-tenant read-only visibility.
10. Confirm no Razorpay transfer/refund/payment/order/pickup mutation was created by finance actions.

### Verification Commands

```powershell
npm.cmd --workspace @gozaika/types run typecheck
npm.cmd --workspace @gozaika/consumer-web run typecheck
npm.cmd --workspace @gozaika/restaurant-mgmt-web run typecheck
npm.cmd --workspace @gozaika/admin-web run typecheck
npm.cmd --workspace @gozaika/consumer-web run lint
npm.cmd --workspace @gozaika/restaurant-mgmt-web run lint
npm.cmd --workspace @gozaika/admin-web run lint
npx.cmd dotenv -e .env.local -- npm.cmd --workspace @gozaika/consumer-web run build
npm.cmd --workspace @gozaika/restaurant-mgmt-web run build
npm.cmd --workspace @gozaika/admin-web run build
```

### Out Of Scope

No live Razorpay payouts, transfers, fund-account creation, refund initiation, GST-compliant final invoice legal automation, CA workflows, reconciliation exports, accounting integrations, native mobile finance screens, ROI reports, broad correction tooling, restaurant suspension, or marketing-site redesign.

## Slice 8A: Pilot ROI Reports

### Goal

Give pilot restaurant partners and goZaika ops a trustworthy weekly ROI report showing whether the paid pickup loop is working: bags listed/sold, sell-through, GMV, estimated or settlement-backed net recovery, pickup completion, no-shows, refunds/debits, incidents, and simple first-time/repeat buyer signals.

### Completed

- [x] Add migration `20260528000000_slice8a_pilot_roi_reports.sql`.
- [x] Add read-only restaurant/admin ROI drop detail and incident/refund note views.
- [x] Scope restaurant reporting by active restaurant membership and admin reporting by platform membership.
- [x] Add shared typed ROI request/response, metric, detail row, note row, copy payload, insight, and estimate-basis models.
- [x] Add integer-safe rate/percentage helpers for sell-through and pickup completion display.
- [x] Add restaurant `/portal/reports` and portal navigation link.
- [x] Add admin `/admin/reports` with restaurant selector, weekly presets, drop table, notes, settlement context, and copy/download partner-safe report text.
- [x] Document metric definitions, workflow, data quality checks, deployment, and runbook boundaries.

### Validation Gate

Restaurant owner can open `/portal/reports` and see only their own restaurant's weekly summary and drop-level detail. Admin can open `/admin/reports`, select restaurant/period, inspect the same partner-facing metrics plus ops context, and copy/download share-safe report text. Reports are derived from existing paid pickup facts with paise integer money math and clear denominators. ROI reporting does not mutate payments, refunds, pickups, settlements, invoices, payouts, notifications, or order state.

### Remote Migration Steps

Apply this migration after all Slice 7 migrations:

```powershell
Get-Content -Raw supabase/migrations/20260528000000_slice8a_pilot_roi_reports.sql
```

Review the SQL, then run it once in the Supabase Dashboard SQL editor or approved remote migration path. Verify:

```sql
select to_regclass('public.api_restaurant_roi_drop_detail');
select to_regclass('public.api_admin_roi_drop_detail');
select to_regclass('public.api_restaurant_roi_report_note');
select to_regclass('public.api_admin_roi_report_note');
```

Redeploy:

```powershell
# Vercel projects
restaurant.gozaika.in
admin.gozaika.in
```

No new environment variables, Supabase Edge Functions, workers, cron schedules, storage buckets, or provider secrets are introduced.

### Smoke Test Flow

1. Use a webhook-confirmed captured order tied to a published drop.
2. Verify pickup as `COLLECTED`, or after pickup close mark `NO_SHOW`.
3. Optionally lock an exact-period settlement in `/admin/finance` to validate settlement-backed net.
4. Open `/portal/reports` as the restaurant owner and confirm own-tenant weekly metrics.
5. Open `/admin/reports`, select the restaurant and period, and confirm admin metrics match the restaurant report.
6. Copy/download partner-safe report text and confirm no consumer PII, raw provider payloads, pickup credentials, private docs, service keys, or internal notes appear.
7. Check desktop/mobile layouts and horizontal overflow for `/portal/reports` and `/admin/reports`.
8. Confirm consumer pages remain unchanged and do not expose ROI, settlement, payout, or repeat-buyer reporting.

### Verification Commands

```powershell
npm.cmd --workspace @gozaika/types run typecheck
npm.cmd --workspace @gozaika/consumer-web run typecheck
npm.cmd --workspace @gozaika/restaurant-mgmt-web run typecheck
npm.cmd --workspace @gozaika/admin-web run typecheck
npm.cmd --workspace @gozaika/consumer-web run lint
npm.cmd --workspace @gozaika/restaurant-mgmt-web run lint
npm.cmd --workspace @gozaika/admin-web run lint
npx.cmd dotenv -e .env.local -- npm.cmd --workspace @gozaika/consumer-web run build
npm.cmd --workspace @gozaika/restaurant-mgmt-web run build
npm.cmd --workspace @gozaika/admin-web run build
```

### Out Of Scope

No advanced Zaika Pro analytics, forecasting, heatmaps, cohorts beyond simple repeat-buyer counts, benchmarking, scheduled email digest, background export jobs, CRM, native mobile reporting, refund initiation, payout initiation, settlement recalculation, pickup override, accounting integration, or legal invoice automation.

## Slice 8B: Admin Ops Hardening

### Goal

Give goZaika ops a compact, auditable control center for the first pilot restaurants: pause/suspend risky restaurants or drops, triage incidents/support/refund requests, manage a small allowlist of operational config flags, inspect privileged audit history, and copy/download bounded support-safe queue details without exposing PII or triggering live financial movement.

### Completed

- [x] Add migration `20260529000000_slice8b_admin_ops_hardening.sql`.
- [x] Add admin ops safe read models for restaurants, drops, incidents, support tickets, refund support tracking, config flags, and audit rows.
- [x] Add server-side admin routes for restaurant pause/suspend/reactivate, drop pause/resume, support tickets, incident triage, refund support tracking, and allowlisted config flags.
- [x] Require role checks and human-readable reason text for every privileged mutation.
- [x] Append `audit_log` rows for privileged changes, plus `support_ticket_event`, `incident_event`, and drop inventory ledger rows where applicable.
- [x] Add `/admin/ops` compact queue-oriented UI with filters, summary chips, action controls, support-safe copy, and bounded CSV download.
- [x] Add typed request/response models and utility helpers for admin ops status labels, SLA freshness, support-safe masking, CSV, and text output.
- [x] Enforce restaurant/drop/config guardrails in consumer public discovery/claim and restaurant publishing flows.
- [x] Keep finance/ROI ownership read-only: no Razorpay refund API calls, payment capture mutation, settlement recalculation, payout mutation, or notification side effects.

### Remote Migration Steps

Apply this migration after all Slice 8A migrations:

```powershell
Get-Content -Raw supabase/migrations/20260529000000_slice8b_admin_ops_hardening.sql
```

Review the SQL, then run it once in the Supabase Dashboard SQL editor or approved remote migration path. Verify:

```sql
select to_regprocedure('public.api_admin_set_restaurant_operational_status(uuid,uuid,text,text,text)');
select to_regprocedure('public.api_admin_set_drop_operational_status(uuid,uuid,text,text)');
select to_regprocedure('public.api_ops_claims_enabled(uuid)');
select to_regprocedure('public.api_ops_publishing_enabled(uuid)');
select to_regprocedure('public.api_ops_max_bags_per_drop(uuid)');
select to_regclass('public.api_admin_ops_restaurant_summary');
select to_regclass('public.api_admin_ops_drop_summary');
select to_regclass('public.api_admin_ops_support_queue');
select to_regclass('public.api_admin_ops_incident_queue');
select to_regclass('public.api_admin_ops_refund_queue');
select to_regclass('public.api_admin_ops_config_flag');
select to_regclass('public.api_admin_ops_audit_log');
```

Redeploy:

```powershell
# Vercel projects
customer.gozaika.in
restaurant.gozaika.in
admin.gozaika.in
```

No new environment variables, Supabase Edge Functions, workers, storage buckets, provider secrets, cron schedules, Razorpay refund APIs, payout APIs, accounting integrations, or notification side effects are introduced.

### Smoke Test Flow

1. Open `/admin/ops` as `SUPER_ADMIN` or `OPS_ADMIN`.
2. Filter by restaurant, status, and date; inspect open incidents, support tickets, refund support records, paused/suspended restaurants/drops, config overrides, and audit rows.
3. Copy and download the current filtered queue and verify it excludes consumer contact lists, raw provider payloads, pickup credentials/hashes, private documents, service keys, and internal event bodies.
4. Pause a restaurant with reason text, then confirm `/portal/drops/new` blocks new publishing and consumer public discovery/claims are unavailable for that restaurant.
5. Reactivate the restaurant and confirm normal publishing/claim flows still work.
6. Pause/resume one active/scheduled drop and confirm historical paid orders, payment captures, settlements, payouts, notifications, and ROI facts are unchanged.
7. Create/update a support ticket, triage an incident, and save/update a refund support record. Confirm no Razorpay refund API is called.
8. Update `CLAIMS_ENABLED`, `PUBLISHING_ENABLED`, or `MAX_BAGS_PER_DROP` and confirm only the documented consumption points change behavior.
9. Check desktop/mobile layout and horizontal overflow for `/admin/ops`, `/portal/drops/new`, `/drops`, and `/drops/[id]`.

### Verification Commands

```powershell
npm.cmd --workspace @gozaika/types run typecheck
npm.cmd --workspace @gozaika/consumer-web run typecheck
npm.cmd --workspace @gozaika/restaurant-mgmt-web run typecheck
npm.cmd --workspace @gozaika/admin-web run typecheck
npm.cmd --workspace @gozaika/consumer-web run lint
npm.cmd --workspace @gozaika/restaurant-mgmt-web run lint
npm.cmd --workspace @gozaika/admin-web run lint
npx.cmd dotenv -e .env.local -- npm.cmd --workspace @gozaika/consumer-web run build
npm.cmd --workspace @gozaika/restaurant-mgmt-web run build
npm.cmd --workspace @gozaika/admin-web run build
```

### Out Of Scope

No advanced CRM, live Razorpay refunds, Razorpay transfers, fund accounts, payouts, payment capture mutation, webhook behavior changes beyond claim guardrails, settlement recalculation, payout status mutation, accounting integrations, destructive order edits, pickup overrides, broad customer exports, native mobile ops screens, scheduled export workers, Sentry, marketing automation, reviews/public ratings, loyalty, referrals, subscriptions, or marketing-site redesign.

## Slice 2.1: Premium UX Transformation

### Goal

Raise the existing production web surfaces from pilot-grade screens to credible demo/launch UX without changing the core backend, payment, pickup, notification, finance, or settlement model.

### Completed

- [x] Consumer `/` and `/drops` now provide premium discovery with search, cuisine chips, dietary filters, closing-soon and recently-missed sections, and a mobile-first list/map toggle.
- [x] Map mode degrades safely when no public restaurant coordinates are available. No secret map key is required; no private restaurant address/compliance fields are exposed.
- [x] Consumer `/restaurants` now lists public/active restaurants from safe public profile and drop data; `/restaurants/[slug]` shows identity, cuisine/dietary tags, active/upcoming drops, recent public drop history, share affordance, and safety reminders.
- [x] Consumer `/account`, `/auth/login`, and `/swaad-club` are polished around profile completeness, consent/notification clarity, Google OAuth boundary, and subscription-ready Swaad Club positioning.
- [x] Restaurant portal has a responsive sidebar chrome, grouped navigation, active states, support affordance, richer dashboard metrics, and `/portal/drops` active drop list.
- [x] Admin has `/admin/users` bounded user search/detail with masked list PII, selected-record detail, consent/order/hold/notification/audit counts, and no bulk export or destructive action.
- [x] Marketing website social-proof/Insider polish now typechecks; metadata/skip-link structure remains in place.
- [x] Product and runbook docs were added for premium UX operations and boundaries.

### Remote Migration Steps

No Supabase migration is required for Slice 2.1. The implementation uses existing safe read models including `api_public_drop_card`, `api_public_restaurant_profile`, Slice 8B admin ops views, existing `iam_profile`, consent, hold, order, notification, and audit tables.

### Environment And Deploy

Redeploy affected Vercel apps after merge:

```powershell
# Vercel projects
customer.gozaika.in
restaurant.gozaika.in
admin.gozaika.in
gozaika.in
```

Confirm environment:

```text
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY for server-only admin/restaurant routes
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY optional only; current map fallback does not require it
Supabase Auth Google provider and redirect allow-list for https://customer.gozaika.in/auth/callback before treating Google OAuth as production
```

No Razorpay subscription, payout, refund, transfer, settlement mutation, worker, Edge Function, storage bucket, or notification provider environment variable is introduced.

### Smoke Test Flow

1. Website: open `/`, confirm testimonial/social proof and Insider CTA render, metadata remains share-ready, and skip-to-content works.
2. Consumer discovery: open `/`, `/drops`, search/filter by restaurant/cuisine/dietary text, toggle List/Map, confirm map fallback message when public coordinates are missing, open `/drops/[id]`, and confirm claim/hold CTA still routes to existing checkout flow.
3. Consumer restaurants: open `/restaurants`, search/filter, open `/restaurants/[slug]`, confirm no private compliance/contact/payout/team fields appear.
4. Consumer account/auth: open `/auth/login`, confirm phone OTP remains primary and Google OAuth uses Supabase redirect; open `/account` signed in and verify profile, consents, orders, holds, notification context, and Swaad Club CTA.
5. Restaurant portal: open `/portal/dashboard`, `/portal/drops`, `/portal/drops/new`, `/portal/templates`, `/portal/orders`, `/portal/finance`, `/portal/reports`, `/portal/profile`; confirm sidebar collapses horizontally on mobile and publishing guardrails remain visible.
6. Admin: open `/admin`, `/admin/ops`, `/admin/users?q=demo`; confirm bounded results, masked list identifiers, selected detail panel, and no broad export or account merge action.
7. Check 390px mobile and 1440px desktop widths for horizontal overflow on customer, restaurant, admin, and website touched pages.

### Verification Commands

```powershell
npm.cmd run ci
npm.cmd --workspace @gozaika/types run typecheck
npm.cmd --workspace @gozaika/consumer-web run typecheck
npm.cmd --workspace @gozaika/restaurant-mgmt-web run typecheck
npm.cmd --workspace @gozaika/admin-web run typecheck
npm.cmd --workspace @gozaika/website run typecheck
npm.cmd --workspace @gozaika/consumer-web run lint
npm.cmd --workspace @gozaika/restaurant-mgmt-web run lint
npm.cmd --workspace @gozaika/admin-web run lint
npm.cmd --workspace @gozaika/website run lint
npx.cmd dotenv -e .env.local -- npm.cmd --workspace @gozaika/consumer-web run build
npm.cmd --workspace @gozaika/restaurant-mgmt-web run build
npm.cmd --workspace @gozaika/admin-web run build
npm.cmd --workspace @gozaika/website run build
```

### Out Of Scope

No live Swaad Club recurring billing, Zaika Pro paid subscription, referral rewards ledger, coupons, restaurant team management, native mobile parity, PostGIS/geofencing, broad customer exports, destructive account merge, automated payouts, refunds, settlement recalculation, payment capture mutation, notification provider changes, or analytics warehouse was added.
