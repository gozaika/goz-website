# goZaika Web Parity — Specification v1

Status: **approved 2026-06-29 — full program (W0–W7), both web apps** · Author: source-code agent (single-agent monorepo ownership)

Companion: [`gozaika_web_parity_implementation_plan_v1.md`](gozaika_web_parity_implementation_plan_v1.md) (the sliced build plan).
Sibling reference: the completed [`gozaika_mobile_implementation_plan_v1.md`](gozaika_mobile_implementation_plan_v1.md) (the mobile UX uplift this spec brings the web up to).

---

## 1. Problem statement

The **mobile UX uplift** (Mobile Slices U1→R4, X1, D1, plus F1 and Slices 10–18)
raised the two native apps to a polished, token-driven, accessibility-audited
design system. The two **web apps** — `apps/consumer-web` (customer site) and
`apps/restaurant-mgmt-web` (partner portal) — were the *original source of truth*
for features, and they still carry **full route/feature parity**, but they did
**not** receive the uplift. They are visually and structurally a generation
behind the native apps.

**This project brings the web apps up to the mobile apps' UX, design-system, and
accessibility standard — not the other way around.** It is a UX/design-system
parity program, not a feature-build program.

### What is already at parity (verified, no work needed)

Every mobile screen has a corresponding web route, backed by the same shared
libraries and the same Supabase data:

| Surface | Web routes | Mobile screens |
| --- | --- | --- |
| Customer | `/`, `/drops`, `/drops/[id]`, `/restaurants`, `/restaurants/[slug]`, `/account`(+`/passport`,`/discovery`), `/orders/[id]`, `/checkout/[id]`, `/onboarding/consent`, `/swaad-club`, `/cities/[city]` | the `(tabs)` tree + checkout/onboarding |
| Partner | `/portal/{dashboard,orders,drops,drops/new,templates,finance,reports,onboarding,compliance,profile,reviews}` | the `(tabs)` tree + standalone screens |

Feature parity (follows API, reviews submit/status, consent, profile/referral,
onboarding wizard, location pin, compliance docs, ROI/finance read, drop
lifecycle) **already exists on web** — most of the mobile BFF was built *on top
of* these web libraries. **No backend, BFF, RPC, or schema work is in scope.**

### What is NOT at parity (the gap this spec closes)

Grounded in the current code (2026-06-29):

1. **No web design system.** `@gozaika/ui` exposes ~10 ad-hoc components; the
   apps are built from **~670 inline brand-hex literals** (499 in consumer-web,
   171 in restaurant-mgmt-web) with no token discipline, no elevation scale, no
   reduced-motion handling. Mobile has `@gozaika/mobile-ui` (tokens + contrast
   helpers + typed primitives + ~20 components).
2. **Accessibility / contrast debt.** White-on-saffron text appears in ~16 places
   across both apps — the *exact* WCAG-AA failure (saffron 2.84:1, gold 2.38:1)
   that Mobile Slice X1 fixed with `saffronText`/`goldText` companions. Web has
   had no contrast, keyboard-focus, reduced-motion, or zoom audit.
3. **No shared customer primitives.** Mobile's `HeroBanner`, `CountdownChip`,
   `FilterChipRow`, `SegmentedToggle`, `StickyActionBar`, `PeekBar`,
   `ProgressRing`, `LoyaltyCard` have no web equivalents; web re-implements each
   inline, inconsistently, per page.
4. **No shared partner primitives.** Mobile's `MetricHero`, `ActionCard`,
   `QueueCard`, `SellThroughBar`, `Sparkline`, `DataTable`, `RoleAwareSection`,
   `RestaurantSwitcher` have no web equivalents. The partner dashboard already
   *computes* sell-through/AOV/revenue but renders them as plain cards.
5. **Composition deltas.** The mobile C-series (Home/Discover, Drops+map,
   Detail+checkout, Orders timeline, Passport/loyalty viz) and R-series (role-
   shaped dashboard, counter focus-mode, drops polish + lifecycle, reports/
   finance density, role-aware nav + switcher) recompositions are not reflected
   on web.
6. **Specific feature micro-gaps** surfaced by the uplift:
   - F1 **"Restaurants you follow" home rail** exists on mobile Home but not web
     Home (the follows API + the restaurant-detail Follow chip *do* exist on web).
   - Demo cuisine art (D1) is wired into web restaurant-detail hero + `DropCard`
     but not the broader surfaces.
   - Brand-naming drift to reconcile (e.g. partner dashboard says "Zayka Pro";
     confirm the canonical label against the v4 positioning).
7. **No web release gate.** There is no `scripts/web-ci.mjs` equivalent to the
   mobile gate; nothing guards token drift, contrast, banned copy, or secrets in
   the web bundles.

---

## 2. Goals & non-goals

### Goals
- **G1 — Web design system.** A token-driven `@gozaika/ui` that is the single
  styling source of truth for both web apps, mirroring `mobile-ui`'s palette,
  **AA-safe contrast companions**, elevation, radii, spacing, and motion/reduced-
  motion handling.
- **G2 — Primitive parity.** Web-native ports of every shared customer and
  partner primitive, behaviourally equivalent to mobile, responsive and
  keyboard/hover-aware.
- **G3 — Surface parity.** Each customer and partner web surface recomposed on
  the new primitives to match the mobile information hierarchy and polish,
  including the F1 home rail and other micro-gaps.
- **G4 — Accessibility parity.** A WCAG-2.1-AA pass: contrast, keyboard focus
  order, visible focus rings, reduced-motion, 200% zoom / reflow, semantic
  landmarks and headings — locked by tests where mechanical.
- **G5 — A web release gate.** `scripts/web-ci.mjs`: typecheck + tests + `next
  build` (both apps) + drift scans (brand-hex literals, banned copy, no server
  secrets in client bundles), kept green per slice.

### Non-goals (explicitly out of scope)
- **No backend / BFF / RPC / migration / schema work.** Data and APIs already exist.
- **No new product features** beyond closing the UX micro-gaps in §1.6.
- **No mobile changes.** `apps/*-mobile` and `@gozaika/mobile-ui` are untouched
  except an optional, additive **shared design-tokens extraction** (see §4).
- **No real Razorpay.** Owner-deferred; the simulator boundary on web is unchanged.
- **No admin-web work** (`apps/admin-web` is outside the parity boundary, exactly
  as in the mobile parity ledger).
- **Not a pixel-clone of the phone UI.** See §3.

---

## 3. The parity contract (what "parity" means here)

Web parity is a **web-native interpretation of the same design language**, not a
literal reproduction of the phone layout. Concretely:

- **Same design tokens, same brand, same AA contrast rules, same component
  vocabulary and naming** as `mobile-ui`. A `CountdownChip` on web reads and
  behaves like its mobile twin.
- **Web-native ergonomics are expected and correct:** responsive multi-column
  grids, hover/focus states, larger canvases, server-rendered first paint, real
  URLs and deep links, and progressive enhancement. The mobile `StickyActionBar`
  becomes a sticky web CTA; the mobile `Map` toggle may degrade to a coordinate
  list where no web map SDK is warranted (mirroring mobile's no-SDK choice).
- **Honesty rules carry over verbatim** from the mobile build: real data only;
  no fabricated loyalty counts, rewards, pickup codes, QR/OTP, order/payment
  state, ratings, or revenue claims beyond what the shared libraries return; the
  banned-copy list (`leftover|stale|cheap|clearance|liquidation|food rescue|…`)
  applies to web copy too.
- **Source-of-truth rule:** where a value already has a canonical shared lib
  (`loadPublicDrops`, `loadRoiReport`, `buildPassportPayload`, `loadFollows`,
  …), the web surface consumes it unchanged — no re-derivation.

---

## 4. Design-system architecture

### 4.1 Token single source of truth
`mobile-ui/src/tokens/colors.ts` + `tokens/contrast.ts` are **pure, framework-
free TypeScript** (no React-Native imports in the contrast math). To avoid two
diverging palettes:

- **Promote the palette + contrast helpers** (`palette`, `accentTextColor`,
  `onAccentTextColor`, the saffron/gold AA companions) into a shared, framework-
  neutral module — either a new `@gozaika/design-tokens` package or an additive
  export in `@gozaika/utils`. Both `mobile-ui` and web `@gozaika/ui` import from
  it. This is the only sanctioned mobile-touching change, and it is additive
  (re-export shims keep `mobile-ui`'s public API stable; the mobile gate must
  stay 7/7).
- Web consumes the tokens two ways: as a Tailwind v4 `@theme` mapping in
  `globals.css` (so utility classes like `bg-saffron text-on-saffron` exist) and
  as TS constants for inline/SVG cases (charts, sparklines).

### 4.2 Web component layer (`@gozaika/ui`)
Grows from ad-hoc helpers into a documented system, organized like `mobile-ui`:
`tokens` (re-exported) · primitives (`Button`, `Card`, `Text`, `Badge`,
`EmptyState`, `ErrorState`, `Skeleton`) · `CustomerPrimitives` · `PartnerPrimitives`
· `ProductMedia`/`RestaurantAvatar` (web image pipeline, drop-then-template
fallback already shared). Server-component-first; client components only where
interaction requires it.

### 4.3 Drift guards
A CI scan forbids **raw brand-hex literals** (`#FF6B35`, `#1A5C38`, `#D4A017`,
`#FFF8F0`, `#2D2D2D` and near-variants) in `apps/*/app` and `packages/ui/src`
once a surface is migrated — the same mechanism the mobile gate uses for
identity/copy/secret drift. Pages must reference tokens/utilities instead.

---

## 5. Accessibility standard (WCAG 2.1 AA)

Mirrors Mobile Slice X1, applied to the web:
- **Contrast:** all text ≥ 4.5:1 (≥ 3:1 for large text / UI). Eliminate white-on-
  saffron and white/colour-on-gold; use the `saffronText`/`goldText` companions
  or charcoal-on-accent fills (the owner-accepted mobile resolution).
- **Keyboard:** every interactive element reachable and operable; logical focus
  order; a visible, AA-contrast focus ring; a working "skip to main content".
- **Semantics:** one `<h1>` per page, ordered headings, landmark regions
  (`header`/`nav`/`main`/`footer`), `aria-label`s on icon-only controls, form
  labels associated with inputs.
- **Motion:** honour `prefers-reduced-motion` for the live-pulse, marquees, and
  any animation (mobile's reduced-motion utility analog).
- **Reflow / zoom:** usable at 200% zoom and 320px width with no horizontal
  scroll or clipping.
- **Sign-off:** automated checks lock the mechanical parts; **human a11y review
  remains mandatory** before this is called done (as on mobile).

---

## 6. Per-surface requirements

### 6.1 Customer (consumer-web)
- **Home `/`** — HeroBanner; real active-drop stat; "Live Right Now" + "Closing
  Soon" rails using `CountdownChip`; food-story / city activity; **F1
  "Restaurants you follow" rail** (signed-in only); passport progress preview.
- **Drops `/drops`** — `FilterChipRow` (dietary/closing-soon/availability) +
  `SegmentedToggle` (list / map-or-coordinate view); consistent `DropCard`.
- **Drop detail `/drops/[id]`** — countdown from `pickupEndAt`; stock/price/
  allergen/pickup cards; **sticky claim CTA**; simulator-honest checkout; server-
  confirmed success. No pickup code / QR / OTP / fake order state.
- **Orders `/orders/[id]`** (+ list in `/account`) — timeline from real
  timestamps/status; active-order emphasis. No pickup code / fake payment state.
- **Passport / discovery `/account/passport`,`/discovery`** — `LoyaltyCard` tier
  viz, Flavour-Diversity `ProgressRing`, share card — from the real Slice 11
  payloads, no fabricated counts.
- **Restaurant detail `/restaurants/[slug]`** — keep the D1 cuisine-art hero;
  Follow chip + aggregate follower count (already present); recompose to tokens.

### 6.2 Partner (restaurant-mgmt-web)
- **Dashboard `/portal/dashboard`** — `MetricHero` for the headline metric;
  status/publishing notices; finance sell-through via `SellThroughBar` +
  `Sparkline`; operations `ActionCard`s. Reconcile the "Zayka Pro" label.
- **Orders / counter `/portal/orders`** — `QueueCard` rows; Active/All/Collected/
  Issues filters; verify/no-show/incident affordances consistent with mobile R2.
  (Web is not the primary counter device, but must be coherent.)
- **Drops `/portal/drops`(+`/new`)** — status filters, command-center summary,
  reserved/quantity bars, lifecycle controls already on web — recompose to
  primitives.
- **Reports / finance `/portal/reports`,`/finance`** — dense read-only
  `DataTable` + `Sparkline`; payout readability; counts-only share wording.
- **Profile / onboarding / compliance / templates / reviews** — recompose to
  tokens + primitives; role-aware visibility; `RestaurantSwitcher` in the portal
  chrome where multi-membership exists (mirrors mobile R4).

---

## 7. Acceptance criteria

A slice is **done** when:
1. Its surfaces render only through tokens/primitives — **zero raw brand-hex
   literals** remain in the migrated files (CI-enforced).
2. `scripts/web-ci.mjs` is green: typecheck (both apps + `@gozaika/ui`) + vitest
   + `next build` (both apps) + drift scans (hex, banned copy, no server secrets
   in client bundles).
3. The surface meets the §5 a11y standard; mechanical checks are test-locked.
4. The web parity ledger row is updated with evidence (screenshot vs. the mobile
   twin + the live-data note).
5. Honesty rules (§3) hold — no fabricated state introduced.

**Project done** when every §6 surface is migrated, the parity ledger has no open
UX rows, `web-ci` is green, and human a11y sign-off is recorded.

---

## 8. Risks & mitigations

| Risk | Mitigation |
| --- | --- |
| Token extraction destabilizes `mobile-ui` (mobile gate) | Additive re-export shims; keep mobile gate 7/7; do the extraction in its own slice with the mobile gate as the guard. |
| 670 hex literals = large mechanical churn | Migrate per surface, gated; the hex-drift scan only activates for files already migrated, so progress is enforced without a big-bang. |
| Visual regressions on a live customer site | Web is pre-revenue but public; ship per-surface behind the existing deploy flow with before/after capture; no data/route changes lowers blast radius. |
| Scope creep into new features | §2 non-goals are hard; the only feature deltas are the named §1.6 micro-gaps. |
| Contrast fix changes brand feel (charcoal-on-saffron) | Reuse the owner-accepted mobile resolution (X1) verbatim for consistency. |

---

## 9. Decisions

**Resolved by the owner (2026-06-29):**
1. ✅ **Scope of apps:** **both** web apps (consumer-web + restaurant-mgmt-web).
2. ✅ **Depth/sequencing:** the **full program** (W0→W7 in order).

**Still open (smaller, in-slice decisions):**
3. **Token home:** new `@gozaika/design-tokens` package vs. additive export in
   `@gozaika/utils` — decide in W1.
4. **Canonical partner label** ("Zayka Pro" vs. the v4 positioning term) —
   reconcile in W5.
5. **Map view:** keep the no-SDK coordinate view (mobile parity) or invest in a
   web map — decide in W4.
