# Web Parity W5–W7 — Autonomous Decision Log

Context: the owner authorized an autonomous run (2026-06-30) to complete the
remaining web-parity work (rest of W5, then W6, W7) overnight. This file records
every decision made without a live owner check so they can be reviewed/reversed.
Nothing here is hard to undo.

Spec: [`../../project docs/gozaika_web_parity_spec_v1.md`](../../project%20docs/gozaika_web_parity_spec_v1.md) ·
Plan: [`../../project docs/gozaika_web_parity_implementation_plan_v1.md`](../../project%20docs/gozaika_web_parity_implementation_plan_v1.md) ·
Ledger: [`web-parity-ledger.md`](web-parity-ledger.md)

## Standing decisions (apply to all remaining slices)

- **D1 — Partner label = "goZaika Partner".** Owner-approved 2026-06-29 (spec §9.4);
  reconciled across dashboard, login, portal-nav, onboarding in W5(1/n). Any new
  occurrence of "Zayka Pro" gets the same treatment.
- **D2 — Map view = no new SDK (spec §9.5).** Keep the existing approach: consumer
  drops = coordinate list; restaurant directory + detail = Google Maps `output=embed`
  iframe (no API key, public embed). Mirrors mobile's no-SDK choice; no map-library spend.
- **D3 — W6 global hex flip is gated on a full sweep.** Before removing the
  `MIGRATED_FILES` allowlist in `scripts/web-ci.mjs`, every remaining file under
  `apps/consumer-web/app`, `apps/restaurant-mgmt-web/app`, and `packages/ui/src`
  (notably `packages/ui/src/index.tsx`, which still carries many brand-hex literals in
  `DropCard`/`RestaurantCard`/`EmptyState`/`AllergenChips`/`ProgressBar`) must be
  brand-hex-free. The flip lands in W6 once the sweep is done.
- **D4 — axe specs on authenticated portal routes use the demo login and skip-on-no-session.**
  The product apps' axe/Playwright specs drive the built-in "Use demo restaurant"
  password login (seeded demo user) to reach authed routes. If that session can't be
  established in a given run (no seed), those authed specs **skip** rather than fail, so
  `web-ci` stays deterministic. Public + login/unauthenticated shells are always asserted.
- **D5 — Human a11y sign-off stays the owner's.** The spec mandates a human keyboard +
  screen-reader walkthrough that automated checks cannot replace. W6/W7 record automated
  results and a keyboard-only checklist in `docs/web/web-parity-audit.md` with an explicit
  **human sign-off placeholder**; the relevant ledger rows read "Done (automated) — human
  sign-off pending" until the owner signs.
- **D6 — Honesty + banned-copy rules hard-enforced.** Real data only; no fabricated
  loyalty/pickup/QR/OTP/order/payment/rating/revenue state; banned-copy list applies; no
  new features beyond the already-shipped F1 rail.

## W6 notes

### W6(1/n) Global brand-hex flip
- Swept every remaining file under `apps/*/app` + `packages/ui/src` to tokens and
  retired the `MIGRATED_FILES` allowlist — the hex scan is now **global**.
- **Excluded `packages/ui/src/theme.css`** from the scan: it is the sanctioned Tailwind
  `@theme` mirror of the TS palette (literal hex required; drift-locked by `theme.test.ts`).
- **Non-className hex → `palette.*` constants** (not a className, so the className sweep
  missed them): `CuisinePassport` cuisine-accent map, `ZaykaPassportCard` tier styles,
  `AdventureDropCard` gradient, `razorpay-checkout-panel` widget theme color, and the
  `discovery/share-card` OG-image SVG fills. Non-brand accent hexes (e.g. `#E0652B`,
  `#0F3D25`, `#7C5C00`) are intentionally kept — they have no token and aren't brand colors.
- **AA fixes applied during the sweep:** every white-on-saffron CTA → `text-charcoal`;
  saffron-as-text → `text-saffron-text`; gold-as-text on light → `text-gold-text`.

## Per-surface / per-slice notes

### W5(3/n) `/portal/drops` (+ `/new`)
- Extracted the drops table into a client component (`drops-list-client.tsx`) to add
  interactive status filters — the page stays a server component that loads data.
- **Sell-through semantics:** `PortalDrop` exposes `quantityTotal`, `quantityHeld`,
  `quantityAvailable`. Defined **claimed = total − available** (matches the already-shipped
  dashboard "bags sold" definition) for the `SellThroughBar`, and surfaced **reserved = held**
  as its own column/figure. No collected/sold split is invented beyond these real fields.
- **Status→tone:** ACTIVE/SOLD_OUT=success, SCHEDULED=info, PAUSED=warning,
  EMERGENCY_CLOSED/CANCELLED=danger, else neutral. Filter "Closed" = SOLD_OUT, PICKUP_CLOSED,
  EMERGENCY_CLOSED, CANCELLED, DRAFT.
- Lifecycle Active/Pause/Close controls kept as tokenized icon-chips (not Button) to preserve
  the compact three-up affordance; publish CTA uses the saffron+charcoal primary.

### W5(4/n)–(6/n) finance, reports, templates, onboarding/compliance, profile, reviews
- **finance/reports** stay server-rendered, read-only. Status pills → `Badge` (tone via
  `financeSettlementStatusTone`); reports gained a `Sparkline` of sell-through bps across drops.
- **compliance** route already just `redirect("/portal/onboarding")` — the compliance form lives
  in the onboarding client, so tokenizing onboarding closes both ledger rows. No new compliance
  surface was invented.
- **profile** address/location keeps the existing Google Maps `output=embed` iframe pin (D2 — no
  new map SDK).
- **reviews** is read-only (no respond/edit affordance added — matches the on-page note and the
  mobile twin). Moderation status → `Badge` tones (PENDING=warning, APPROVED=success,
  REJECTED=danger, HIDDEN=neutral). Demo restaurant has 0 reviews, so only the empty/aggregate
  state was browser-verified; the populated path is covered by typecheck + the W7 smoke.
- These four lower-risk tokenization surfaces were verified-then-committed together as W5(6/n)
  to keep the overnight run moving; each was browser-checked before the commit.

### W5(7/n) RestaurantSwitcher in the portal chrome — **D7**
- The web portal had **no** selected-restaurant mechanism (unlike the mobile app's
  `useAuth().selectedRestaurantPk`). Built one at the **app layer only** — no `@gozaika/*`
  shared-lib, schema, RPC, or BFF change:
  - `loadSelectedRestaurant(profilePk)` in the app's `lib/slice3.ts`: reads the
    `gz_portal_restaurant_pk` cookie, returns the matching restaurant **only if** the actor is
    an ACTIVE member of it (validated via `loadActiveRestaurantsForProfile`), else falls back to
    `loadDefaultRestaurant`. **No cookie ⇒ byte-identical to today** (the single-membership path).
  - `RestaurantSwitcherIsland` (client) sets the cookie via `document.cookie` + `location.reload()`
    — no new API endpoint. Hidden when `< 2` active memberships.
  - Wired into the **single-restaurant pages** (dashboard, drops, drops/new, templates, profile)
    **and** the drops/templates **mutation routes** so view and mutation stay on the same
    restaurant after a switch. Writes can only ever target one of the actor's own ACTIVE
    restaurants (membership-checked in every route), so the change is safe even unverified.
- **Scope choice:** the switcher is shown only on the 5 single-restaurant pages where selection
  actually scopes data. The cross-restaurant pages (orders/finance/reports/reviews) intentionally
  span **all** memberships, so they do not show it (showing a scoping control that doesn't scope
  them would be misleading).
- **Verification gap (flagged for human QA):** the demo account is single-membership, so only the
  regression path is browser-verified (switcher hidden; chrome tokenized to cream/forest; all
  rewired pages return 200; `loadSelectedRestaurant` fallback intact). The **multi-membership
  switch** (≥2 active restaurants) is typecheck/build-verified only and needs a 2-restaurant seed
  for human QA — recorded in `web-parity-audit.md` (W7).
