# goZaika — Engineering Handoff & Anti-Drift Index (v1)

Status: **2026-06-30** · Branch `codex/mobile-ux-uplift/d1-demo-presales` (fast-forwards to `main`)
Purpose: bring an incoming agent fully up to speed on the **current state of the web + mobile
apps** and hand off **one scoped feature (B: template image)** including its DB migration.
Read this **before touching code** to avoid drift.

Both CI gates are green at handoff: **web 10/10** (`node scripts/web-ci.mjs`), **mobile 7/7**
(`node scripts/mobile-ci.mjs`). The GitHub "Quality Gates" (eslint, in `.github/workflows/ci.yml`)
is also green — `web-ci` now runs eslint too, so a green local web gate ⇒ green Quality Gates.

---

## 0. How to use this document

1. Read §1 (READ-FIRST index) — the canonical specs/ledgers/runbooks.
2. Read §2 (current state) + §3 (anti-drift rules) so new work matches existing conventions.
3. For the template-image feature, follow §4 (spec + migration + file-by-file plan + acceptance).
4. §5 lists known caveats / unverified items so you don't "re-fix" them blindly.

---

## 1. READ-FIRST index (review these to understand current state)

### Strategy / product (the "why" + canonical positioning — do not contradict)
- `docs/strategy/technology-specification-v4.md` — current technical spec of record.
- `docs/strategy/business/master-business-document-v4.docx` — business model / positioning v4.
- `docs/product/` — per-feature product specs. Most relevant:
  `drop-publishing-discovery.md`, `claim-hold-order-intent.md`, `product-media-pipeline.md`,
  `pickup-verification-incident-basics.md`, `transactional-notifications.md`,
  `restaurant-onboarding.md`, `ux-audit-production-polish.md`, `premium-ux-transformation.md`.
- **v4 positioning (memory):** B2B acquisition / B2C discovery. **Banned consumer copy** —
  `leftover|stale|cheap|clearance|liquidation|food rescue|sample|surplus`. Enforced by both gates.

### Web app state (this is the freshest workstream — start here)
- `docs/web/specs/web-parity-spec-v1.md` — web parity spec (approved, both web apps).
- `docs/web/plans/web-parity-implementation-plan-v1.md` — sliced plan + tracker (W0–W7 **done**).
- `docs/web/web-parity-ledger.md` — **per-surface status** for every customer + partner web route.
- `docs/web/web-parity-audit.md` — program closure + the **human a11y sign-off checklist (PENDING)**.
- `docs/web/w5-w7-autonomous-decisions.md` — **decision log D1–D9** (label, no-map-SDK, the
  restaurant-switcher cookie resolver, axe color-contrast-non-blocking, eslint-in-gate, etc.).
  Read this to avoid re-litigating settled decisions.

### Mobile app state
- `docs/mobile/plans/mobile-implementation-plan-v1.md` — mobile UX uplift plan (Slices U1→R4,
  X1, D1, F1, Slices 10–18) — **complete**.
- `docs/mobile/specs/customer-mobile-technical-spec-v1.md`,
  `docs/mobile/specs/restaurant-mobile-technical-spec-v1.md`,
  `docs/mobile/specs/mobile-shared-architecture-and-release-spec-v1.md` — mobile architecture.
- `docs/mobile/CONTINUE-HERE.md` + `docs/mobile/mobile-parity-ledger.md` — mobile resume point +
  per-screen ledger + no-drift rules.
- `docs/mobile/role-matrix-enforcement-gap.md`, `slice18-release-readiness.md` — open mobile items.

### Schema / data (authoritative)
- `dbschema/gozaika_consolidated_schema.sql` — **consolidated snapshot** (may trail migrations).
- `supabase/migrations/*.sql` — **source of truth** (apply in order). The current public-drop image
  model lives in `20260622000000_product_media_pipeline.sql` (see §4).
- RLS-first (`docs/adr/0002-supabase-rls-first.md`): the DB enforces access; APIs ride RLS.

### Gates / CI / runbooks (how to build, test, run)
- `scripts/web-ci.mjs` — the web gate (10 steps; see §2). `scripts/mobile-ci.mjs` — mobile gate (7).
- `.github/workflows/ci.yml` — GitHub "Quality Gates" (eslint + the gates).
- `docs/testing/e2e-coverage-inventory.md` — E2E gaps (Playwright + Maestro); P0 folded into W6/W7.
- `docs/runbooks/` — operational guides. Most relevant to new work:
  `local-dev.md`, `demo-data.md` (the `demo_prepare_for_demo(...)` RPC), `claim-holds.md`,
  `product-media-rollout.md`, `payments.md`, `pickup-operations.md`, `finance-settlements.md`,
  `roi-reports.md`, `notifications.md`, `restaurant-onboarding.md`, `privacy-erasure.md`.
- `docs/architecture/overview.md` + `docs/adr/` — monorepo stack, Maestro-over-Detox, RLS-first.

### Monorepo layout (apps + shared packages)
- Apps: `apps/consumer-web`, `apps/restaurant-mgmt-web` (Next 16, the parity targets);
  `apps/consumer-mobile`, `apps/restaurant-mobile` (Expo Router); `apps/website` (marketing);
  `apps/admin-web` (out of parity scope).
- Shared: `@gozaika/design-tokens` (palette + AA contrast — the single styling source of truth),
  `@gozaika/ui` (web primitives), `@gozaika/mobile-ui` (RN primitives), `@gozaika/utils`,
  `@gozaika/types` (zod schemas + DTOs — **mobile BFF DTOs live here**), `@gozaika/supabase`,
  `@gozaika/mobile-core` (RN api client / query / nav).

---

## 2. Current-state snapshot (what's done)

- **Web parity W0–W7 complete (automated).** Both web apps are fully tokenized on
  `@gozaika/design-tokens` + `@gozaika/ui`; all customer + partner surfaces recomposed; F1 "follow"
  rail shipped; partner label reconciled **"Zayka Pro" → "goZaika Partner"**; `RestaurantSwitcher`
  in the portal chrome (multi-membership, app-level `loadSelectedRestaurant` **cookie** resolver in
  `apps/restaurant-mgmt-web/lib/slice3.ts` — no schema change). Only the **human a11y sign-off**
  remains (audit doc).
- **Recent UX fixes (post-W7), already shipped:**
  - Partner nav active-state = **longest-href-prefix** (`activeNavHref` in `portal-nav.tsx`) — "New
    drop" no longer also lights "Drops".
  - **Customer holds pill (web + mobile):** shows only when the signed-in customer has unpaid,
    time-limited holds. Web: `apps/consumer-web/app/holds-pill.tsx` + `holds-pill-bar.tsx` in the
    root layout → taps to `/account` (active holds + Complete-payment CTA now at the **top** of
    `/account`). Mobile: `GET /api/mobile/v1/holds` (BFF) + `useActiveHolds()`
    (`apps/consumer-mobile/src/api/holds.ts`) + a `PeekBar` in `(tabs)/_layout.tsx`.
  - `/drops` Map view now renders a real Hyderabad Google `output=embed` map (was a text message).
  - Two `<img>` → `next/image`; `not-found` pages tokenized; reduced-motion global rule.
- **Confirm state before working:** `git log --oneline -15`, then `node scripts/web-ci.mjs`
  (10/10) and `node scripts/mobile-ci.mjs` (7/7).

### Web gate steps (`scripts/web-ci.mjs`, all must stay green)
typecheck · **eslint** · vitest · `next build` ×2 · banned-copy scan · source client-secret scan ·
**global brand-hex scan** (only `packages/ui/src/theme.css` exempt) · built-`.next` bundle
secret-value scan · **axe a11y + functional smoke** (Playwright; color-contrast reported
non-blocking; authed routes opt-in via `RUN_AUTHED_A11Y` / `RUN_AUTHED_SMOKE`).

---

## 3. Anti-drift rules & conventions (apply to ALL new work)

1. **Tokens, not hex.** Never write raw brand-hex (`#FF6B35 #1A5C38 #D4A017 #FFF8F0 #2D2D2D`) in
   `apps/*/app` or `packages/ui/src` — the global scan fails the gate. Use token utilities:
   `bg-saffron`+`text-charcoal` (white-on-saffron fails AA), `text-saffron-text` (saffron-as-text on
   light), `text-forest`, `text-gold-text` (gold-as-text on light) / `text-gold` (on dark),
   `bg-success-soft`, `border-hairline`, `text-danger`, `text-muted` (opacity-dimmed charcoal text
   fails AA — use `text-muted`). Forest fills keep white text. Inline-style/SVG/JS hex → `palette.*`
   from `@gozaika/design-tokens`. `theme.css` is the only sanctioned hex (mirrors the TS palette,
   locked by `theme.test.ts`).
2. **Honesty rules.** Real data only — no fabricated loyalty/pickup/QR/OTP/order/payment/rating/
   revenue state. Banned-copy list applies. Consume the canonical shared libs unchanged
   (`loadPublicDrops`, `loadRoiReport`, `buildPassportPayload`, `loadFollows`, …) — no re-derivation.
3. **Server-component-first** (web). `"use client"` only where interaction needs it.
4. **a11y:** one `<h1>` per page, ordered headings (cards use `<h2>`), landmark roles, accessible
   names on controls, `prefers-reduced-motion`, visible AA focus rings. axe structural rules are
   gate-enforced; **color-contrast is reported, not blocking** (D8) — token contrast is locked by
   `contrast.test.ts`; residual card-accent contrast is a human sign-off item.
5. **eslint matters** (it's in the gate). Internal links use `next/link` (`no-html-link-for-pages`);
   no `require()` (`no-require-imports`); `Date.now()` goes in a plain helper, not render
   (react-compiler "impure during render"). `*.spec.ts` = Playwright (excluded from vitest by the
   root `vitest.config.ts`); `*.test.ts` = vitest.
6. **Mobile BFF DTOs** live in `@gozaika/types` as zod schemas (so `apiClient.request({dataSchema})`
   can validate). Mobile gate (`mobile-ci.mjs`) **must stay 7/7** — it guards the shared
   token/model extraction.
7. **Gate discipline:** one surface/feature per commit (Co-Authored-By trailer); update the relevant
   ledger/plan in the same commit; keep web 10/10 **and** mobile 7/7; push branch + fast-forward
   `origin/main` per slice (pre-revenue).
8. **No admin-web work** (outside scope). **No real Razorpay** (simulator boundary unchanged).

---

## 4. FEATURE HANDOFF — Template "Drop image" (carry into every drop)

Status: **implemented in code on 2026-06-30; DB migration file added but not applied.**

### Goal (from the owner)
Restaurant → Templates should capture a **Drop image** once per template. Every drop created from
that template **inherits the image automatically** (drops must be creatable in seconds, no per-drop
upload). A restaurant **may override** per drop, but most drops carry the template image forward.

### KEY FINDING — the propagation is ALREADY BUILT (do not rebuild it)
- `catalog_bag_template_media` table exists (RLS-enabled; one-PRIMARY-per-revision unique index
  `uq_catalog_bag_template_media_primary`; public-read policy `p_catalog_media_public_read`;
  team-write policy `p_catalog_media_team`).
- The public view **`api_public_drop_card`** (in `supabase/migrations/20260622000000_product_media_
  pipeline.sql`, ~lines 110–201) already resolves **one image: drop `drop_media` PRIMARY first, then
  the template-revision `catalog_bag_template_media` PRIMARY.** `resolveDropImage`
  (`apps/consumer-web/lib/drop-image.ts`) reads the resulting `image_*` columns. So a drop with no
  own image **already** shows the template image, and a per-drop `DROP_PRIMARY` upload already
  overrides it. **No read-side / view / DropCard work is needed.**

### Implemented upload path — template image
`productMediaTargetCodes` (in `@gozaika/types`) now includes `TEMPLATE_PRIMARY`.
The upload pipeline (`media_upload_session` → `sign-upload` → `complete`) supports template-revision
targets and attaches verified public renditions to `catalog_bag_template_media`.

### 4.1 Migration (1 file) — `supabase/migrations/20260630000000_template_media_upload_target.sql`
The `media_upload_session` table (defined in the product-media migration) hard-lists targets in two
CHECK constraints and has only `drop_fk`. Add the template path:
```sql
alter table media_upload_session
  add column if not exists catalog_bag_template_revision_fk uuid
    references catalog_bag_template_revision (catalog_bag_template_revision_pk) on delete cascade;

-- widen the target enum
alter table media_upload_session drop constraint ck_media_upload_session_target;
alter table media_upload_session add constraint ck_media_upload_session_target
  check (target_code in ('RESTAURANT_HERO','RESTAURANT_LOGO','DROP_PRIMARY','TEMPLATE_PRIMARY'));

-- widen the target↔entity shape check (was: RESTAURANT_* ⇒ drop_fk null; DROP_PRIMARY ⇒ drop_fk set)
alter table media_upload_session drop constraint ck_media_upload_session_target_entity;
alter table media_upload_session add constraint ck_media_upload_session_target_entity check (
  (target_code in ('RESTAURANT_HERO','RESTAURANT_LOGO') and drop_fk is null and catalog_bag_template_revision_fk is null)
  or (target_code = 'DROP_PRIMARY' and drop_fk is not null and catalog_bag_template_revision_fk is null)
  or (target_code = 'TEMPLATE_PRIMARY' and drop_fk is null and catalog_bag_template_revision_fk is not null)
);
```
Verify the exact current constraint bodies in the product-media migration before editing (the snapshot
in `dbschema/` may trail). `catalog_bag_template_media` + its RLS already exist — do **not** recreate.
This migration has been added to the repo but must not be applied to Supabase until the owner explicitly
approves the database change. `createPublicMediaPath` now uses a template-revision scoped path.

### 4.2 Shared types — `packages/types/src/index.ts`
- Add `"TEMPLATE_PRIMARY"` to `productMediaTargetCodes` (~line 982).
- Extend the media-upload request schema (~line 988+, the `.refine(...)` block that currently
  requires `dropPk` only for `DROP_PRIMARY`): add a `templateRevisionPk` (uuid, optional) and a
  refine — `TEMPLATE_PRIMARY` requires `templateRevisionPk` and forbids `dropPk` (and vice-versa).

### 4.3 Partner API + policy (`apps/restaurant-mgmt-web`)
- `lib/product-media-policy.ts`: extend `ProductMediaPolicyTarget` + `canRoleManageProductMedia` —
  allow `TEMPLATE_PRIMARY` for `OWNER`/`ADMIN` (mirror `DROP_PRIMARY`'s allowlist).
- `lib/portal-auth.ts` `assertRestaurantMediaAccess`: accept the new target.
- `app/api/portal/media/sign-upload/route.ts`: branch on `TEMPLATE_PRIMARY` (mirror the
  `DROP_PRIMARY` branch ~line 22): validate the `templateRevisionPk` belongs to a template of
  `input.restaurantPk`, store `catalog_bag_template_revision_fk` on the session, set `drop_fk` null.
- `app/api/portal/media/complete/route.ts`: add a `TEMPLATE_PRIMARY` branch (mirror the
  `DROP_PRIMARY` branch ~line 160): select the existing `catalog_bag_template_media` PRIMARY for the
  revision → **update** its `storage_object_fk` if present, else **insert**
  `{ catalog_bag_template_revision_fk, storage_object_fk, media_role_code:'PRIMARY' }`. Reuse the
  same render/verify + public-path move; add a `createPublicMediaPath` template branch.
- **Important (revisions are immutable):** the image attaches to a **revision** PK. Editing a
  template publishes a NEW revision and now **carries forward** the previous revision's PRIMARY media
  row by copying the storage object reference, so copy/disclosure edits do not drop the image.

### 4.4 Partner UI — `apps/restaurant-mgmt-web/app/portal/templates/template-form.tsx`
- The existing `ProductMediaUploader` (in `app/portal/_components/product-media-uploader.tsx`) now
  accepts `templateRevisionPk` and is rendered with `targetCode="TEMPLATE_PRIMARY"` on the **edit**
  path. Brand-new templates publish first, then the active revision can receive the image.
- Copy: make clear the image is **carried into every drop from this template** and can be overridden
  per drop. Honesty + banned-copy rules apply; tokens only.

### 4.5 (Optional) partner mobile — `apps/restaurant-mobile`
Owner deferred the "web vs web+mobile" choice. If included: the restaurant-mobile template flow needs
the same uploader against the same BFF target; keep the mobile gate 7/7. The mobile media pattern
mirrors `apps/consumer-mobile/src/api/*` + `@gozaika/mobile-core` `apiClient`.

### 4.6 Acceptance / verification
- Upload a PRIMARY image on a template (web portal, OWNER) → a `catalog_bag_template_media` PRIMARY
  row exists for the active revision.
- Publish a drop from that template **without** a per-drop image → the public drop card
  (`/drops`, DropCard) shows the **template** image (via `api_public_drop_card` fallback).
- Upload a `DROP_PRIMARY` on one drop → that drop shows its **own** image; others still inherit.
- `node scripts/web-ci.mjs` 10/10 (eslint + axe included); `node scripts/mobile-ci.mjs` 7/7.
- Runbook reference: `docs/runbooks/product-media-rollout.md` +
  `docs/product/product-media-pipeline.md` (the media trust boundary: only `public-media` bucket is
  ever rendered publicly).

---

## 5. Known caveats / open items (don't "re-fix" without context)
- **Human a11y sign-off** (keyboard + screen-reader) is **pending** — checklist in
  `docs/web/web-parity-audit.md`. Required before "done".
- **axe color-contrast** residuals (~37 on `/drops`, etc.) are dietary/allergen **semantic badge
  accents** awaiting a human design decision (D8) — reported, intentionally non-blocking.
- **Multi-membership RestaurantSwitcher** + the **holds pill populated state** are
  typecheck/build-verified only — they need a 2-restaurant seed / a live claimable drop to see
  populated (the current demo ran `demo_prepare_for_demo(p_create_live_drops => false)`).
- **Recommended (not gated) perf residuals:** Lighthouse LCP/CLS capture on home + a drop detail +
  the dashboard; per-route OpenGraph images.
- Pre-existing eslint **warnings** (unused vars in a few API routes; remaining DropCard `<img>` LCP
  hints) are non-blocking — leave unless explicitly asked.

---

_Maintainer note: keep this handoff current. Next milestone: apply
`20260630000000_template_media_upload_target.sql` only after explicit owner approval, then run the
manual acceptance flow in §4.6._
