# goZaika Mobile Parity Ledger

Status: **reconciled to shipped state (Mobile Slice 17, 2026-06-29)** — see the reconciliation note below.
Baseline audit date: 19 June 2026 · Baseline commit: `c28eece` (branch `main`)

## Reconciliation (Slice 17 — 2026-06-29)

Every row below was generated `Not started` at the Slice 0 baseline. All mobile
targets are now **built + gate-green (`node scripts/mobile-ci.mjs` 7/7)** and
have been flipped to `Done`, owned by the slice named in each row's Owner column.
Evidence lives in the owning slice's doc/commit and in `CONTINUE-HERE.md`'s
per-slice ledger; smokes are under `scripts/smoke/`. The Slice 7 counter rows
(previously `Built (review pending)`) are `Done` — signed off in
`slice7-signoff.md`. The **only open items are the batched on-device walks** in
`deploy-verification-checklist.md` (these are verification steps, not missing
code). Out-of-scope rows (admin-web, review-media uploads, native billing,
ZaikaIQ, dynamic pricing, POS, WhatsApp bot, real Razorpay) stay excluded per the
shared-spec release boundary and the simulator decision. Full hardening evidence:
`slice17-hardening-audit.md`.
Source of truth rule: **checked-in code is authoritative; production (`customer.gozaika.in`, `restaurant.gozaika.in`) is corroborating evidence only.** Where they conflict, record the conflict in the row's Evidence column and escalate to a human; do not silently resolve.

This ledger is the release-reconciliation source of truth required by the shared architecture spec §10.1. One row per production workflow. A Mobile Slice cannot be marked complete until its rows here are updated with evidence.

## How this ledger was generated (reproducible)

Mechanical inventory, re-runnable from a clean checkout:

```bash
# Page (screen) routes
npx --yes fast-glob "apps/consumer-web/app/**/page.tsx" "apps/restaurant-mgmt-web/app/**/page.tsx"
# API handlers
npx --yes fast-glob "apps/consumer-web/app/**/route.ts" "apps/restaurant-mgmt-web/app/**/route.ts"
```

Or with ripgrep for the auth pattern per handler:

```bash
rg -l "getPortalActor|supabase.auth.getUser" apps/consumer-web/app apps/restaurant-mgmt-web/app
```

Route-count reconciliation as of the audit:

| App | `page.tsx` routes | `route.ts` handlers | Ledger rows below |
| --- | --- | --- | --- |
| consumer-web | 14 | 20 (1 debug excluded) | 14 screen + 19 API |
| restaurant-mgmt-web | 13 | 16 (1 is `/auth/callback`) | 13 screen + 15 API |

`admin-web` (22 handlers) is **out of mobile scope** — there is no admin mobile app. It is inventoried in the appendix only to mark the parity boundary.

## Legend

- **Auth (today)** — what the checked-in web handler actually enforces, verified by reading the handler.
  - `anon` = no auth; `consumer` = `supabase.auth.getUser()` + consumer ownership; `member` = `getPortalActor()` + **active membership only, NO role check**.
- **Auth (target)** — the role/ownership the mobile endpoint must enforce per the specs.
- **Owner** — owning Mobile Slice.
- **Status** — `Not started` / `In progress` / `Done`. All rows start `Not started`; the baseline is the only thing complete.
- ⚠️ = known defect carried into the baseline (see Known Defects).

---

## A. Consumer — screen routes

| Web route | Native route | Backing web data | Target mobile API | Auth (today) | Auth (target) | Owner | Status |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `/` | `(tabs)/index` Home | server components + `lib/drops`, discovery API | `GET /discovery/drops`, `/discovery/cuisine-stats`, `/drops/adventure-pick` | anon | anon | S8 | Done |
| `/cities/[city]` | Home city filter (query param) | server component | `GET /discovery/drops?city=` | anon | anon | S8 | Done |
| `/auth/login` | `/auth/login` (modal) | Supabase Auth (phone OTP / Google) | Supabase Auth direct | anon | anon | S6 | Done |
| `/onboarding/consent` | `/onboarding/consent` (guarded) | `/api/consent/*` | `GET /consent/purposes,/latest`, `POST /consent/capture` | consumer | consumer | S6/S10 | Done |
| `/drops` | `(tabs)/drops` | `/api/discovery/drops` | `GET /discovery/drops` | anon | anon | S8 | Done |
| `/drops/[id]` | `/drops/[dropPk]` | `lib/drops` `loadPublicDrop` | `GET /discovery/drops/:id` | anon | anon | S8 | Done |
| `/restaurants` | `(tabs)/restaurants` | `lib/restaurants` | `GET /restaurants` | anon | anon | S8 | Done |
| `/restaurants/[slug]` | `/restaurants/[slug]` | `lib/restaurants`, `/api/restaurants/[slug]/reviews` | `GET /restaurants/:slug`, `/restaurants/:slug/reviews` | anon | anon | S8 (E1/E2 ✅) | Done |
| `/swaad-club` | `(tabs)/account/swaad-club` | static/informational | informational (no billing) | anon | anon | S11 | Done |
| `/account` | `(tabs)/account` | `/api/profile`, server account | `GET/PATCH /profile`, `GET /orders` | consumer | consumer | S10 | Done |
| `/account/passport` | `/account/passport` | `/api/account/passport` | `GET /account/passport` | consumer | consumer | S11 | Done |
| `/account/discovery` | `/account/discovery` | `/api/account/discovery-profile`, `/api/discovery/share-card` | `GET /account/discovery-profile`, `/discovery/share-card` | consumer | consumer | S11 | Done |
| `/checkout/[orderId]` ⚠️ param is a **hold PK** | `/checkout/[holdPk]` | `lib/claims`, `/api/checkout/*` | `POST /checkout/razorpay-order`, `GET /checkout/status` | consumer | consumer (owns hold) | S9 | Done |
| `/orders/[orderId]` | `/orders/[orderPk]` + `(tabs)/orders` list | `lib/orders` (server, **no list API today**) | `GET /orders`, `/orders/:id`, `/orders/:id/pickup-proof` (new) | consumer | consumer (owns order) | S9/S10 | Done |

## B. Consumer — API handlers

| Web API | Method | Target mobile endpoint | Auth (today) | Auth (target) | Owner | Status |
| --- | --- | --- | --- | --- | --- | --- |
| `/api/auth/bootstrap` | POST | `POST /auth/bootstrap` | consumer | consumer (creates consumer profile) | S3 | Done |
| `/api/auth/sign-out` | POST | client SecureStore clear + token revoke | consumer | consumer | S6 | Done |
| `/api/consent/purposes` | GET | `GET /consent/purposes` | consumer | consumer | S10 | Done |
| `/api/consent/latest` | GET | `GET /consent/latest` | consumer | consumer | S10 | Done |
| `/api/consent/capture` | POST | `POST /consent/capture` | consumer | consumer | S10 | Done |
| `/api/discovery/drops` | GET | `GET /discovery/drops` | anon | anon (bounded) | S8 | Done |
| `/api/discovery/cuisine-stats` | GET | `GET /discovery/cuisine-stats` | anon | anon | S8 | Done |
| `/api/discovery/share-card` | GET | `GET /discovery/share-card` | consumer | consumer | S11 | Done |
| `/api/drops/adventure-pick` | GET | `GET /discovery/drops/adventure-pick` | anon | anon (eligibility unchanged) | S8 | Done |
| `/api/restaurants/[slug]/reviews` | GET | `GET /restaurants/:slug/reviews` | anon | anon (public reviews only) | S8 (E2 ✅) | Done |
| `/api/profile` | GET/PATCH | `GET/PATCH /profile` | consumer | consumer | S10 | Done |
| `/api/claims` | POST | `POST /claims` + `GET /claims` (new recovery) | consumer | consumer | S9 | Done |
| `/api/checkout/razorpay-order` | POST | `POST /checkout/razorpay-order` | consumer | consumer (owns hold) | S9 | Done |
| `/api/checkout/status` | GET | `GET /checkout/status` | consumer | consumer (owns hold) | S9 | Done |
| `/api/account/passport` | GET | `GET /account/passport` | consumer | consumer | S11 | Done |
| `/api/account/discovery-profile` | GET | `GET /account/discovery-profile` | consumer | consumer | S11 | Done |
| `/api/reviews` | GET/POST | `POST /reviews`, `GET /reviews/mine` | consumer | consumer (collected orders) | S10 | Done |
| `/api/reviews/[reviewPk]/media` | POST | ⚠️ **no production handler** — do NOT build media parity | consumer | — | excluded | N/A |
| `/api/debug/razorpay-connectivity` | GET | **excluded** (debug-only, not parity) | — | — | excluded | N/A |
| _new_ `GET /orders`, `/orders/:id`, `/orders/:id/pickup-proof` | GET | mobile-only list/detail/proof; web renders inline server-side | n/a | consumer (owns order) | S9/S10 | Done |

---

## C. Restaurant — screen routes

| Web route | Native route | Backing web data | Target mobile API | Auth (today) | Auth (target) | Owner | Status |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `/` | redirect to `/dashboard` or login | — | — | n/a | n/a | S1 | Done |
| `/auth/login` | `/auth/login` | Supabase Auth | Supabase Auth | anon | anon | S6 | Done |
| `/portal/dashboard` | `/dashboard` | server + `lib/*` (**no API today**) | `GET /dashboard` (new) | member | role: all but unauth | S14 | Done |
| `/portal/orders` | `/orders` + `/orders?mode=counter` | `/api/portal/orders/*` actions; **no list API** | `GET /orders` (new) + actions | member | role: OWNER/ADMIN/OPS/PICKUP | S7 | Done (S7 signed off) |
| `/portal/drops` | `/drops` | `/api/portal/drops` | `GET /drops` | member ⚠️ | role: OWNER/ADMIN/OPS | S13 | Done |
| `/portal/drops/new` | `/drops/new` + `/drops/[dropPk]` | `/api/portal/drops`, `/drops/[id]` | `POST /drops`, `GET/PATCH /drops/:id` | member ⚠️ | role: OWNER/ADMIN/OPS | S13 | Done |
| `/portal/templates` | `/templates` | `/api/portal/templates*` | `GET/POST /templates`, `PATCH/DELETE /templates/:id` | member ⚠️ | role: OWNER/ADMIN/OPS | S13 | Done |
| `/portal/finance` | `/finance` | `lib/finance` (**no API today**) | `GET /finance/settlements,/:id,/invoices/:id` (new) | member ⚠️ | role: OWNER/ADMIN/FINANCE | S15 | Done |
| `/portal/reports` | `/reports` | `lib/roi-report` (**no API today**) | `GET /reports/roi` (new) | member ⚠️ | role: OWNER/ADMIN/OPS/FINANCE | S15 | Done |
| `/portal/onboarding` | `/onboarding` | `/api/portal/onboarding` | `GET/PATCH /onboarding` | member ⚠️ | role: OWNER/ADMIN | S12 | Done |
| `/portal/compliance` | `/compliance` | `/api/portal/restaurant/compliance`, documents | `PATCH /restaurant/compliance`, documents | member ⚠️ | role: OWNER/ADMIN | S12 | Done |
| `/portal/profile` | `/profile` | `/api/portal/profile`, `/restaurant/basics`, `/location` | `GET/PATCH /profile`, `/restaurant/basics`, `/location` | member ⚠️ | role: OWNER/ADMIN (ops limited) | S12 | Done |
| `/portal/reviews` | `/reviews` | server + `lib/*` (**no API today**) | `GET /reviews` (new, read-only) | member ⚠️ | role: OWNER/ADMIN/OPS | S14 | Done |

## D. Restaurant — API handlers

| Web API | Method | Target mobile endpoint | Auth (today) | Auth (target) | Owner | Status |
| --- | --- | --- | --- | --- | --- | --- |
| `/api/portal/bootstrap` | POST | `POST /auth/bootstrap` | member ⚠️**D1** | restaurant actor, **must NOT create consumer profile** | S4 | Done |
| `/api/portal/onboarding` | GET/PATCH | `GET/PATCH /onboarding` | member | role: OWNER/ADMIN | S12 | Done |
| `/api/portal/restaurant/basics` | PATCH | `PATCH /restaurant/basics` | member | role: OWNER/ADMIN | S12 | Done |
| `/api/portal/restaurant/location` | PATCH | `PATCH /restaurant/location` | member | role: OWNER/ADMIN | S12 | Done |
| `/api/portal/restaurant/compliance` | PATCH | `PATCH /restaurant/compliance` | member | role: OWNER/ADMIN | S12 | Done |
| `/api/portal/documents/sign-upload` | POST | `POST /documents/sign-upload` | member | role: OWNER/ADMIN (ops if authorized) | S12 | Done |
| `/api/portal/documents/[documentId]/signed-url` | GET | `GET /documents/:id/signed-url` | member | role + restaurant ownership | S12 | Done |
| `/api/portal/templates` | GET/POST | `GET/POST /templates` | member ⚠️ | role: OWNER/ADMIN/OPS | S13 | Done |
| `/api/portal/templates/[id]` | PATCH/DELETE | `PATCH/DELETE /templates/:id` | member ⚠️ | role: OWNER/ADMIN/OPS | S13 | Done |
| `/api/portal/drops` | GET/POST | `GET/POST /drops` | member ⚠️ (active+publishing checked, role not) | role: OWNER/ADMIN/OPS | S13 | Done |
| `/api/portal/drops/[id]` | GET/PATCH | `GET/PATCH /drops/:id` | member ⚠️ | role: OWNER/ADMIN/OPS | S13 | Done |
| `/api/portal/orders/[orderId]/pickup/verify` | POST | `POST /orders/:id/pickup/verify` | member (tenant-scoped via active restaurants) ⚠️ | role: OWNER/ADMIN/OPS/PICKUP | S7 | Done (S7 signed off) |
| `/api/portal/orders/[orderId]/no-show` | POST | `POST /orders/:id/no-show` | member ⚠️ | role: OWNER/ADMIN/OPS/PICKUP | S7 | Done (S7 signed off) |
| `/api/portal/orders/[orderId]/incidents` | POST | `POST /orders/:id/incidents` | member ⚠️ | role: OWNER/ADMIN/OPS/PICKUP | S7 | Done (S7 signed off) |
| `/api/portal/profile` | GET/PATCH | `GET/PATCH /profile` | member ⚠️ | role: OWNER/ADMIN | S12 | Done |
| _new_ `GET /orders` (queue list) | GET | mobile-only; web renders server-side | n/a | role: OWNER/ADMIN/OPS/PICKUP | S7 | Done (S7 signed off) |
| _new_ `GET /finance/settlements,/:id,/invoices/:id` | GET | mobile-only; web renders via `lib/finance` | n/a | role: OWNER/ADMIN/FINANCE | S15 | Done |
| _new_ `GET /reports/roi` | GET | mobile-only; web renders via `lib/roi-report` | n/a | role: OWNER/ADMIN/OPS/FINANCE | S15 | Done |
| _new_ `GET /dashboard`, `GET /reviews` | GET | mobile-only read APIs | n/a | role-scoped | S14 | Done |
| _new_ `POST/DELETE /devices/push-token` | POST/DELETE | mobile-only push registration | n/a | authenticated | S16 | Done |

---

## Known defects carried into the baseline

| ID | Where | Defect | Impact | Owning fix slice |
| --- | --- | --- | --- | --- |
| ~~**D1**~~ ✅ | `apps/restaurant-mgmt-web/app/api/portal/bootstrap/route.ts:28` | Restaurant bootstrap calls `api_bootstrap_consumer_profile`, creating a consumer profile for restaurant actors | Tenant-boundary smear | **Fixed for mobile** in Slice 4: `POST /api/mobile/v1/auth/bootstrap` resolves memberships only, never calls the consumer RPC. Web portal bootstrap unchanged (optional separate hardening). |
| ~~**D2 (role gap)**~~ ✅ | `apps/restaurant-mgmt-web/lib/portal-auth.ts:50` + `lib/slice3.ts:19,49` | membership-only auth — `role_code` never read | Any active member could hit drops/templates/profile/finance | **Addressed for mobile** in Slice 4: pure `decideRestaurantAccess` capability policy + `withMobileRestaurantRole` wrapper enforce the matrix on every `/api/mobile/v1` restaurant call. Web handlers still membership-only (optional separate hardening). |
| ~~**E1**~~ ✅ | slice9 migration `api_public_restaurant_profile` view | Referenced `ga.street_address` (non-existent); real columns are `line_1`/`line_2`/`landmark` | Public profile view / map pins | **Fixed** in `20260530000000_slice9_…sql` (selects lat/lng only) |
| ~~**E2**~~ ✅ | slice9 migration `api_public_restaurant_reviews`, `api_restaurant_own_reviews` | Join on `oo.order_pk` instead of `oo.order_order_pk` | Both review views returned empty | **Fixed** in `20260530000000_slice9_…sql` |
| ~~**D3**~~ ✅ | Cookie-only sessions | All web handlers read session from Next.js cookies; no bearer path | Mobile could not authenticate | **Addressed** in Slice 3: `resolveMobileBearerActor` + `/api/mobile/v1` bearer foundation (`GET health` + `GET me` on both surfaces). Web cookie paths untouched. |
| **D4 (demo identity)** | seed vs README vs scripts | Three incompatible fixture stories; rich seed users have **no phone** | Phone-OTP login resolves to no rich data | S5 — see `demo-identity-reconciliation.md` |

## Excluded from parity (must NOT be marked parity rows)

Per shared spec §1 release boundary: ZaikaIQ forecasts/benchmarks, native subscriptions/recurring billing, dynamic/last-call pricing, POS integration, WhatsApp growth bot, referral acquisition/attribution/rewards (display-only is in scope), review media uploads (no production handler). Admin-web entirely (no admin mobile app).

## Appendix — admin-web (parity boundary marker only, not built)

22 handlers under `/api/admin/*` (finance runs, ops triage, document review, notifications retry/suppress, reviews moderation). These define the platform-operator surface and are **not** part of either mobile app. Listed so future agents do not mistake admin endpoints for restaurant parity.
