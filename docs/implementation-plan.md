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
