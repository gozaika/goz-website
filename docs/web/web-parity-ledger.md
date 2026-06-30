# goZaika Web Parity Ledger

Status: **program complete W0–W7 (automated) 2026-06-30 — human a11y sign-off pending** (see [`web-parity-audit.md`](web-parity-audit.md))
Source of truth: checked-in code. One row per customer + partner web surface.
A web-parity slice cannot be marked complete until its rows here carry evidence.

Spec: [`../../project docs/gozaika_web_parity_spec_v1.md`](../../project%20docs/gozaika_web_parity_spec_v1.md) ·
Plan: [`../../project docs/gozaika_web_parity_implementation_plan_v1.md`](../../project%20docs/gozaika_web_parity_implementation_plan_v1.md)

## Legend
- **Route/data** — already at parity (every web surface exists on the same shared lib + Supabase data as its mobile twin). This column is **Done at baseline** for every row.
- **UX gap** — the design-system / composition delta vs. the mobile twin (what this program closes).
- **Owner** — the web slice that closes the UX gap.
- **Status** — `Not started` / `In progress` / `Done`. Tracks the **UX** work; route/data parity is already done.

---

## A. Customer — `apps/consumer-web`

| Web route | Backing lib | Mobile twin | UX gap to close | Owner | Status |
| --- | --- | --- | --- | --- | --- |
| `/` Home | `lib/drops`, `lib/restaurants`, `/api/discovery/cuisine-stats` | `(tabs)/index` (C1) | Tokenize; HeroBanner; CountdownChip rails; **add F1 "Restaurants you follow" rail**; passport preview | W4 | **Done** — HeroBanner + CountdownChip + F1 rail (server-side follows); zero hex; AA buttons (charcoal-on-saffron); browser-verified |
| `/drops` | `lib/drops` | `(tabs)/drops` (C2) | FilterChipRow + SegmentedToggle (list/map); tokenized DropCard | W4 | **Done** — `drop-discovery-client` recomposed: FilterChipRow (cuisine + dietary) + SegmentedToggle (list/map); zero hex; AA chips (charcoal-on-saffron); browser-verified (toggle + filters) |
| `/drops/[id]` | `lib/drops#loadPublicDrop` | `drops/[dropPk]` (C3) | Countdown; sticky claim CTA; stock/allergen/pickup cards on tokens | W4 | **Done** — tokens + CountdownChip |
| `/restaurants` | `lib/restaurants` | `(tabs)/restaurants` | Tokenized directory; consistent cards/filters | W4 | **Done** — `restaurant-directory-client` recomposed: FilterChipRow (mobile sort) + tokenized filter sidebar/drawer/map; zero hex (incl. inline-style pins → `palette`); AA chips (charcoal-on-saffron, white-on-forest); browser-verified (filters/toggle/map; 6 cards w/ active-drops-only off) |
| `/restaurants/[slug]` | `lib/restaurants`, reviews | `restaurants/[slug]` | Keep D1 art hero; tokenize; Follow chip already present | W4 | **Done** — `restaurant-detail-client` recomposed: D1 cuisine-art hero + Follow chip preserved (gold-on-charcoal); reviews sort → FilterChipRow; zero brand-hex (incl. sell-through bars, tabs, claim panel, sticky CTA); AA fixes (saffron-as-text → `text-saffron-text`, saffron fills → `text-charcoal`); browser-verified (tabs/follow/reviews-sort on bawarchi-biryani-palace) |
| `/account` (+ list) | `/api/profile`, orders | `(tabs)/account` (C4) | Tokenize; profile/referral on primitives | W4 | **Done** (brand-hex-clean, locked) |
| `/account/passport` | `lib/passport` | `account/passport` (C5) | LoyaltyCard + Flavour-Diversity ProgressRing | W4 | **Done** — tokenized (ZaykaPassportCard) |
| `/account/discovery` | `lib/discovery-profile` | `account/discovery` (C5) | Discovery viz + share card on tokens | W4 | **Done** — tokenized (CuisinePassport) |
| `/orders/[orderId]` | `lib/orders` | `orders/[orderPk]` (C4) | Timeline from real timestamps on primitives | W4 | **Done** — tokenized |
| `/checkout/[orderId]` | `lib/claims`, checkout | `checkout/[holdPk]` (C3) | Sticky CTA; simulator-honest polish | W4 | **Done** — tokenized |
| `/onboarding/consent` | `/api/consent/*` | `onboarding/consent` | Tokenize form + a11y | W4 | **Done** (brand-hex-clean, locked) |
| `/swaad-club` | informational | `swaad-club` | Tokenize (coming-soon, no billing) | W4 | **Done** — tokenized (AA fixes) |
| `/cities/[city]` | `lib/drops` (filter) | Home city filter | Tokenize (shares Home composition) | W4 | **Done** — tokenized |

## B. Partner — `apps/restaurant-mgmt-web`

| Web route | Backing lib | Mobile twin | UX gap to close | Owner | Status |
| --- | --- | --- | --- | --- | --- |
| `/portal/dashboard` | `lib/slice3` (drops/templates/guardrails) | `(tabs)/index` (R1) | MetricHero; SellThroughBar + Sparkline; ActionCards; reconcile "Zayka Pro" label | W5 | **Done** — recomposed: MetricHero (headline revenue, `titleAs="h1"`, status Badge), DataTable (Today's numbers), Sparkline + SellThroughBar rows, ActionCards (status notices + ops). **Label reconciled "Zayka Pro" → "goZaika Partner"** (owner-approved, matches mobile twin) across dashboard + login + portal-nav + onboarding copy. Zero brand-hex; h1→h2 order restored; demo-OWNER browser-verified (Biryani Baithak) |
| `/portal/orders` | `/api/portal/orders/*` | `(tabs)/orders` (R2) | QueueCard rows; Active/All/Collected/Issues filters | W5 | **Done** — recomposed: `FilterChipRow` Active/All/Collected/Issues (live counts), `QueueCard` rows (status→tone: collected=success, no-show=danger, pending=warning; amount + incident label), tokenized verify-OTP/QR + no-show + incident affordances on `Button` variants. Zero brand-hex. demo-OWNER browser-verified (Biryani Baithak: 7/12/4/1 counts, tone-correct badges, Collected note) |
| `/portal/drops` (+ `/new`) | `lib/portal` drops | `(tabs)/drops` (R3) | Status filters; command-center summary; reserved bars; lifecycle on tokens | W5 | **Done** — list extracted to `drops-list-client`: `FilterChipRow` All/Active/Scheduled/Paused/Closed (counts), `DataTable` command-center summary + overall `SellThroughBar`, per-row `SellThroughBar` + reserved (held) + status `Badge` tones. `/new` form fully tokenized (saffron+charcoal publish, lifecycle Active/Pause/Close, warning/success feedback). Zero brand-hex. demo-OWNER browser-verified (15 drops, filter counts, tone-correct badges, h1→h2) |
| `/portal/templates` | `/api/portal/templates*` | `templates` | Tokenize form + list | W5 | **Done** — template create/edit form + library list tokenized (saffron+charcoal publish, danger archive, forest success message); allergen/disclosure inputs on tokens. Zero brand-hex. demo-OWNER browser-verified |
| `/portal/finance` | `lib/finance` | `finance` (R3c) | DataTable; payout readability; invoice download | W5 | **Done** — tokenized settlement statements; status pills → `Badge` (tone via `financeSettlementStatusTone`); KPI tiles + entries table on tokens; read-only preserved. Zero brand-hex. demo-OWNER browser-verified (Reconciled badge success-soft, entries table) |
| `/portal/reports` | `lib/roi-report` | `reports` (R3c) | DataTable + Sparkline; counts-only share | W5 | **Done** — tokenized ROI report; added `Sparkline` of sell-through across drops (oldest→newest); metric cards + drop-performance table on tokens; read-only preserved. Zero brand-hex. demo-OWNER browser-verified (15-row table + sparkline over a multi-drop period) |
| `/portal/onboarding` | `/api/portal/onboarding` | `onboarding` (S12) | Tokenize resumable wizard | W5 | **Done** — basics + compliance + private-document upload sections tokenized (forest task ticks, danger error, forest upload). Zero brand-hex. demo-OWNER browser-verified (3 sections, save actions) |
| `/portal/compliance` | `/api/portal/.../compliance` | `compliance` (S12) | Tokenize doc upload/status | W5 | **Done** — route redirects to `/portal/onboarding` (compliance lives in the onboarding client, now tokenized) |
| `/portal/profile` | `/api/portal/profile`, location | `profile` (S12) | Tokenize; location pin; basics form | W5 | **Done** — account/alert contacts + media uploaders + address/location (Google `output=embed` map pin, no new SDK) tokenized. Zero brand-hex. demo-OWNER browser-verified (Save profile/location, 12 inputs) |
| `/portal/reviews` | server + `lib/*` | `reviews` (S14) | Rating summary + moderation badges on primitives | W5 | **Done** — rating summary + category bars tokenized; moderation status → `Badge` (PENDING=warning, APPROVED=success, REJECTED=danger, HIDDEN=neutral); read-only (no respond/edit). Zero brand-hex. demo-OWNER browser-verified (h1 + score panel; demo has 0 reviews → empty state) |

---

## Foundation rows (no single surface)

| Item | Mobile twin | Owner | Status |
| --- | --- | --- | --- |
| Token source of truth + AA contrast companions | U1 + X1 (`mobile-ui/tokens`) | W1 | **Done** — `@gozaika/design-tokens` (shared by mobile + web); `theme.css` mirror (drift-locked by `theme.test.ts`) |
| Base primitives (Button/Card/Text/Badge/EmptyState/ErrorState/Skeleton) | `mobile-ui` components | W1 | **Done** — `@gozaika/ui` primitives + AA-safe `Button` (charcoal-on-saffron) |
| Customer primitives (HeroBanner/CountdownChip/FilterChipRow/SegmentedToggle/StickyCTA/PeekBar/ProgressRing/LoyaltyCard) | U2C | W2 | **Done** — `@gozaika/ui` `CustomerPrimitives` (static) + `CustomerControls` (client); shared model in `@gozaika/utils` |
| Partner primitives (MetricHero/ActionCard/QueueCard/SellThroughBar/Sparkline/DataTable/RoleAwareSection/RestaurantSwitcher) | U2R | W3 | **Done** — `@gozaika/ui` `PartnerPrimitives` (static) + `PartnerControls` (client); shared sell-through/sparkline model in `@gozaika/utils`. `RestaurantSwitcher` wired into the portal chrome in W5 (multi-membership only; app-level `loadSelectedRestaurant` cookie resolver, no shared-lib change) |
| A11y/contrast/motion pass (kill white-on-saffron; focus; reduced-motion; reflow) | X1 | W6 | **Done (automated) — human sign-off pending** — global brand-hex flip (scan covers all `apps/*/app` + `packages/ui/src`, only `theme.css` exempt); all white-on-saffron / gold-as-text → AA companions; opacity-charcoal text → `text-muted`. **axe-playwright specs** added to both product apps + wired into `web-ci` (8/8): structural WCAG rules hard-gated green (switch label, landmark `<aside>`→`<div>`, ProgressBar role, mgmt `<title>`); `color-contrast` reported non-blocking (token contrast locked by `contrast.test.ts`; residual card-accent items → human pass). Reduced-motion already handled in primitives (`motion-reduce:animate-none`). **Human keyboard + screen-reader sign-off still required** (W7 audit doc). |
| Perf/SEO + bundle secret scan + ledger closure | S17/S18 | W7 | **Done** — built-`.next` client-bundle secret-value scan + functional Playwright smoke per app wired into `web-ci` (9/9); metadata/title on both apps; tokenized `not-found` pages; global `prefers-reduced-motion`. Closure audit: [`web-parity-audit.md`](web-parity-audit.md). Lighthouse capture + per-route OG images noted as recommended residuals. |

---

## W0 baseline note (2026-06-29)

Route/feature parity is **already complete** for every row above — these web
surfaces predate the mobile apps and back the mobile BFF. This ledger tracks only
the **UX uplift** deltas. The web release gate `scripts/web-ci.mjs`
(`npm run test:web-gate`) is live and green **7/7** on the untouched tree:
typecheck (`@gozaika/ui` + both apps) · vitest · `next build` (both apps) · banned-
copy scan · client-secret scan · brand-hex-literal scan (allowlist-scoped, grows
per migrated file). The hex scan currently guards **0** files; each W4/W5 surface
adds its files to `MIGRATED_FILES` in `scripts/web-ci.mjs` as it is migrated.
