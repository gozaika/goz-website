# goZaika Web Parity — Implementation Plan v1

Status: **approved 2026-06-29 — full program (W0–W7), both web apps** · Next up: **W5** (partner portal recomposition)
Progress: W0–W4 done; all 16 customer surfaces + 3 interactive client views tokenized, gate-enforced (web 7/7, mobile 7/7).
Spec: [`gozaika_web_parity_spec_v1.md`](gozaika_web_parity_spec_v1.md)

Brings `apps/consumer-web` + `apps/restaurant-mgmt-web` up to the mobile UX
uplift's design-system and accessibility standard. **No backend/BFF/schema work;
no new features beyond the named micro-gaps; mobile apps untouched** (except one
additive, gated token extraction). Build mode mirrors the mobile program: one
green, evidenced vertical at a time, committed + pushed per slice.

## How to use this plan
- Read the spec first. Then build slices **in order** — each depends on the prior.
- **Gate every slice** with `scripts/web-ci.mjs` (created in W0). It must stay
  green, exactly as `scripts/mobile-ci.mjs` gates the native apps (which stays
  7/7 and is the guard for the W1 token extraction).
- **Per-slice loop:** migrate the surface to tokens/primitives → run the web gate
  → capture before/after evidence vs. the mobile twin → update the **web parity
  ledger** + this tracker in the same commit → commit (Co-Authored-By trailer) →
  push branch + fast-forward `origin/main`.
- **No-drift conventions** are inherited from `docs/mobile/CONTINUE-HERE.md`
  (real data only; honesty rules; banned-copy list; secrets stay server-side).

## Slice tracker

| Slice | Title | Depends on | Status |
| --- | --- | --- | --- |
| Web W0 | Parity audit, ledger & web CI gate | — | **Done 2026-06-29** — `scripts/web-ci.mjs` (`npm run test:web-gate`) green 7/7; `docs/web/web-parity-ledger.md` rows every surface. |
| Web W1 | Web design-system foundation (tokens + contrast + base primitives) | W0 | **Done 2026-06-29** — `@gozaika/design-tokens` shared by mobile+web (mobile gate still 7/7); `theme.css` drift-locked; `@gozaika/ui` base primitives + AA-safe Button; web gate 7/7. |
| Web W2 | Customer primitives (web ports) | W1 | **Done 2026-06-29** — `@gozaika/ui` CustomerPrimitives + CustomerControls; shared countdown/progress model promoted to `@gozaika/utils` (mobile gate still 7/7); web gate 7/7. |
| Web W3 | Partner primitives (web ports) | W1 | **Done 2026-06-29** — `@gozaika/ui` PartnerPrimitives + PartnerControls; shared ratio/sparkline model in `@gozaika/utils` (mobile gate 7/7); web gate 7/7. |
| Web W4 | Customer surface recomposition + F1 home rail | W2 | **Done 2026-06-29** — all 16 customer surfaces tokenized + gate-enforced, incl. the 3 large interactive client views: `drop-discovery-client` (FilterChipRow + SegmentedToggle), `restaurant-directory-client` (FilterChipRow sort + tokenized sidebar/drawer/map), `restaurant-detail-client` (D1 art hero + Follow chip preserved, reviews sort → FilterChipRow). Home + F1 follow rail + all 3 clients browser-verified. Web gate 16 migrated files, 7/7; mobile 7/7. |
| Web W5 | Partner surface recomposition + switcher | W3 | Not started |
| Web W6 | Accessibility / contrast / motion gate | W4, W5 | Not started |
| Web W7 | Release polish, perf/SEO & ledger closure | W6 | Not started |

**Owner-approved scope (2026-06-29): the full program, W0→W7 in order, both web
apps.** (For reference, a fast first pass would have been W0 + W1 + the contrast
fixes from W6 + the F1 rail and partner `MetricHero` — not the chosen path.)

---

## Web W0 — Parity audit, ledger & web CI gate

**Title:** Establish the web parity baseline and the gate that guards it.

**Scope:** No UI changes. Produce `docs/web/web-parity-ledger.md` (one row per
customer + partner surface: route → backing lib → mobile-twin reference → UX-gap
classification → status), confirming route/feature parity is already met and
enumerating the UX deltas from spec §1. Create **`scripts/web-ci.mjs`**:
typecheck (`@gozaika/ui` + both web apps), `npx vitest run packages/ui apps/consumer-web apps/restaurant-mgmt-web`,
`next build` for both apps, and drift scans via `git grep` — banned consumer copy
and "no server secrets in client code" (reuse the mobile gate's patterns). The
**brand-hex-literal scan is added but scoped to an allowlist of already-migrated
files** (initially empty), so it tightens as slices land instead of failing
big-bang.

**Build instructions:** Mirror `scripts/mobile-ci.mjs` structure (named steps,
pass/fail summary, non-zero exit). Wire `npm run web-ci`. Seed the ledger from the
inventory in spec §1.

**Done when:** `node scripts/web-ci.mjs` is green on the untouched tree; the
ledger exists with every surface rowed and classified.

**Smoke/evidence:** gate output; ledger committed.

---

## Web W1 — Web design-system foundation

**Title:** One token source of truth + base primitives for both web apps.

**Scope:** (1) **Token extraction** — promote `mobile-ui` palette + contrast math
(`palette`, `saffronText`/`goldText`, `accentTextColor`/`onAccentTextColor`) into
a framework-neutral home (`@gozaika/design-tokens` or additive `@gozaika/utils`
export); re-export from `mobile-ui` so its API is unchanged (**mobile gate must
stay 7/7**). (2) **Web wiring** — map tokens into Tailwind v4 `@theme` in both
apps' `globals.css` (e.g. `bg-saffron`, `text-on-saffron`, elevation/radii/space
scales) + export TS constants for SVG/inline. (3) **Base primitives** in
`@gozaika/ui`: token-driven `Button` (AA-safe variants), `Card` (elevation),
`Text` (type scale), `Badge`, `EmptyState`, `ErrorState`, `Skeleton` (honours
`prefers-reduced-motion`). No page is migrated yet (that starts W4/W5).

**Build instructions:** Keep `mobile-ui` exports byte-compatible via shims. Add
unit tests for the contrast helpers on the web side (or shared) mirroring
`contrast.test.ts`. Do **not** mass-edit pages here.

**Done when:** web gate green; mobile gate still 7/7; `@gozaika/ui` exports the
base primitive set; tokens available as both Tailwind utilities and TS constants.

**Smoke/evidence:** both gates green; a Storybook-less render test or a throwaway
`/_ui-preview` route screenshot (not shipped) showing the primitives.

---

## Web W2 — Customer primitives (web ports)

**Title:** Web-native ports of the shared customer primitives.

**Scope:** In `@gozaika/ui`, build responsive, keyboard/hover-aware ports of
`HeroBanner`, `CountdownChip`, `FilterChipRow`, `SegmentedToggle`, `StickyCTA`
(web `StickyActionBar`), `ProgressRing` (SVG), and `LoyaltyCard`. Behaviour and
naming track `mobile-ui/CustomerPrimitives`; pull the pure decision logic from
`customerPrimitivesModel.ts` where it already exists (shared, not re-derived).

**Build instructions:** Server-component-first; client components only for the
interactive ones (toggle, filter row, countdown tick). Reuse `customerPrimitivesModel`.

**Done when:** web gate green; each primitive unit/contract-tested where it has
logic; no page recomposed yet.

**Smoke/evidence:** `/_ui-preview` capture of each primitive at desktop + 320px.

---

## Web W3 — Partner primitives (web ports)

**Title:** Web-native ports of the shared partner primitives.

**Scope:** In `@gozaika/ui`, build `MetricHero`, `ActionCard`, `QueueCard`,
`SellThroughBar`, `Sparkline` (SVG), `DataTable`, `RoleAwareSection`, and
`RestaurantSwitcher`, tracking `mobile-ui/PartnerPrimitives` +
`partnerPrimitivesModel.ts`. `RoleAwareSection` gates on the same data-driven
capability matrix (`roleHasCapability` over `ROLE_SCOPE_SEED`) the mobile R4 slice
uses — so visibility matches the server role matrix.

**Build instructions:** `DataTable`/`Sparkline` are pure SVG/HTML (print-friendly,
no chart lib). Reuse `partnerPrimitivesModel` + the shared capability matrix.

**Done when:** web gate green; primitives tested; no portal page recomposed yet.

**Smoke/evidence:** `/_ui-preview` capture; a role-matrix unit test for `RoleAwareSection`.

---

## Web W4 — Customer surface recomposition + F1 home rail

**Title:** Recompose every customer surface on the new primitives.

**Scope:** Recompose `/`, `/drops`, `/drops/[id]`, `/restaurants`,
`/restaurants/[slug]`, `/account`(+`/passport`,`/discovery`), `/orders/[id]`,
`/checkout/[id]`, `/swaad-club` to tokens + W2 primitives per spec §6.1. **Add the
F1 "Restaurants you follow" home rail** (signed-in only) using the existing
`loadFollows`/follows API — the one net-new customer feature. Remove raw hex from
each migrated file (the W0 allowlist grows per file).

**Build instructions:** One surface per commit. Keep every server/data path and
URL unchanged. Preserve D1 cuisine art. Honesty rules hard-enforced (no pickup
code/QR/OTP/fake order or payment/loyalty state).

**Done when (per surface):** web gate green; zero hex in the migrated files; a11y
spot-check passes; ledger row updated with a before/after capture vs. the mobile twin.

**Smoke/evidence:** per-surface before/after screenshots against live cloud demo data.

---

## Web W5 — Partner surface recomposition + switcher

**Title:** Recompose every portal surface on the new primitives.

**Scope:** Recompose `/portal/{dashboard,orders,drops,drops/new,templates,
finance,reports,onboarding,compliance,profile,reviews}` per spec §6.2 — dashboard
`MetricHero` + `SellThroughBar`/`Sparkline`; orders `QueueCard`; reports/finance
`DataTable`; role-aware nav + `RestaurantSwitcher` in the portal chrome.
Reconcile the partner label (spec §9.4). Remove raw hex per migrated file.

**Build instructions:** One surface per commit. Read-only stays read-only
(finance/reports/reviews); no lifecycle/finance mutation introduced. Role
visibility via `RoleAwareSection`.

**Done when (per surface):** web gate green; zero hex in migrated files; role
gating matches the matrix; ledger row updated with evidence.

**Smoke/evidence:** per-surface before/after captures signed in as OWNER (+ one
restricted-role capture for the role-aware nav).

---

## Web W6 — Accessibility / contrast / motion gate

**Title:** WCAG-2.1-AA pass across both web apps.

**Scope:** Eliminate every white-on-saffron / colour-on-gold occurrence (use the
AA companions or charcoal-on-accent per X1). Add skip-link, visible AA focus
rings, correct heading order + landmarks, form-label associations, icon-button
`aria-label`s, `prefers-reduced-motion` for the live-pulse/animations, and 200%-
zoom / 320px reflow fixes. Lock the mechanical parts with tests: the contrast lock
already exists (`@gozaika/design-tokens` `contrast.test.ts`); **add `axe-playwright`
a11y specs to consumer-web + restaurant-mgmt-web** for the key public +
authenticated routes, mirroring the existing `apps/website/tests/a11y.spec.ts`
pattern (the product web apps have **no** E2E/a11y coverage today — see
`docs/testing/e2e-coverage-inventory.md`). Install `@playwright/test` +
`axe-playwright` per app, add a `playwright.config.ts`, and wire `a11y` into
`scripts/web-ci.mjs`.

**Build instructions:** Turn on the brand-hex-literal scan **globally** in
`web-ci` (allowlist removed) — by now all surfaces are migrated, so any new hex
fails the gate.

**Done when:** web gate green with the global hex scan; axe checks pass on the
audited shells; **human a11y review recorded** (cannot be replaced by automated
checks).

**Smoke/evidence:** axe output; contrast tests; a manual keyboard-only walkthrough note.

---

## Web W7 — Release polish, perf/SEO & ledger closure

**Title:** Final polish and parity sign-off.

**Scope:** Performance (LCP/CLS budgets; image `sizes`/priority; avoid layout
shift from media via the fixed-aspect `ProductMedia`), SEO/meta/OpenGraph parity
across routes, 404/error states on tokens, and final **web parity ledger closure**
(every UX row → Done with evidence, or explicitly deferred with a reason). Add a
bundle-secret scan of the built `.next` output to `web-ci` (analogous to the
mobile bundle scan). **Add a Playwright functional smoke** to each product web app
(per `docs/testing/e2e-coverage-inventory.md` P0.2): consumer-web claim→simulated-pay
happy path + route renders; restaurant-mgmt-web OWNER dashboard→drops — against
seeded demo data.

**Done when:** ledger has no open UX rows; `web-ci` green including the bundle
scan; perf budgets met on the key routes; a short `docs/web/web-parity-audit.md`
records results + accepted residuals + the human sign-off placeholder.

**Smoke/evidence:** Lighthouse/perf numbers on home + a drop detail + the dashboard.

---

## Conventions (follow exactly — avoids drift)

- **Tokens, not hex.** After a surface is migrated it must contain zero raw brand-
  hex literals; reference Tailwind utilities or TS token constants. CI-enforced.
- **Shared libs are authoritative.** Consume `loadPublicDrops`, `loadRoiReport`,
  `buildPassportPayload`, `loadFollows`, etc. unchanged — no re-derivation.
- **Server-component-first.** Add `"use client"` only where interaction needs it.
- **Honesty rules** (mobile parity): real data only; no fabricated loyalty/rewards/
  pickup/QR/OTP/order/payment/rating/revenue state; banned-copy list applies.
- **Gate every change:** `node scripts/web-ci.mjs` stays green; the **mobile gate
  stays 7/7** (the guard for the W1 token extraction).
- **Commit discipline:** one surface/primitive per commit with the Co-Authored-By
  trailer; update the ledger + this tracker in the same commit; push branch +
  fast-forward `origin/main` per slice (we are pre-revenue).
- **Evidence:** before/after captures vs. the mobile twin, against live cloud demo
  data, stored under `.codex-artifacts/web-parity/` (gitignored).

## Verify / run
- Web gate: `node scripts/web-ci.mjs` (created in W0)
- Mobile gate (token-extraction guard): `node scripts/mobile-ci.mjs` (7/7)
- Dev: `npm run dev --workspace @gozaika/consumer-web` (:3000) / `… @gozaika/restaurant-mgmt-web` (:3001)
