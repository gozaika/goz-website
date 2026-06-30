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
