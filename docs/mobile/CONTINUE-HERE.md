# goZaika mobile — continue here (handoff entry point)

This is the single entry point for resuming the mobile build in a fresh session.
Read this, then verify current state from git, then continue. **No drift = follow the
established conventions below and the authoritative docs; never re-derive from memory.**

## Authoritative docs (read these, in order)
1. `project docs/gozaika_mobile_implementation_plan_v1.md` — the **slice tracker** (status per slice) + per-slice agent prompts.
2. `docs/mobile/mobile-parity-ledger.md` — every web route → native target → owning slice.
3. `docs/mobile/role-matrix-enforcement-gap.md` — restaurant role policy (Slices 3/4).
4. `docs/mobile/slice7-signoff.md` — pickup-counter security sign-off (A–E).
5. `docs/mobile/slice9-payment-design.md` — payment + gated simulator + the pickup-proof = notification decision.
6. The three specs in `project docs/` (shared / customer / restaurant).

## Store launch readiness (code-side lane — 2026-06-23)
Closed-beta store package for **goZaika** + **goZaika Partner**. Plan:
`project docs/gozaika_mobile_store_launch_readiness_plan_v1.md`. Lane split: **source-code
agent** owns raw screenshots/videos, seed/reviewer data, EAS/build evidence, QA evidence,
caveats; **Codex** owns store copy, privacy drafts, polished creatives, final Play review.
- **Package:** `.codex-artifacts/gozaika-store-launch/` (README + manifest.json + CAVEATS.md +
  `release/` {eas-config-audit, signing-credentials-checklist, submission-checklist,
  qa-evidence} + `reviewer/` {test-accounts.json, 2 reviewer-note drafts} + `graphics/`
  {icon-splash-qa} + `screenshots/raw/` {gozaika 5/8 w/ dev overlay, gozaika-partner 4/8 clean,
  _web-fallback, INDEX.md}). Tooling: `scripts/store-launch/` + `npm run store:validate:assets`
  / `store:capture:screenshots`. Validator: **0 hard fails** (warnings = documented caveats).
- **App identity locked:** `in.gozaika.customer` / `in.gozaika.restaurant`, Expo SDK 55, eas.json
  3 profiles. **Open EAS gaps:** G1 no `projectId` (run `eas init`), G3 empty `submit` creds,
  G7 prod env not pinned, G2 no `runtimeVersion`; Apple deferred. See eas-config-audit.md.
- **Top caveats:** C1 customer raw shots carry the Expo dev-client gear overlay → recapture
  from preview/production build; C2 1080×2400 exceeds Play 2:1 → crop to 1080×1920; C3 partner
  native dashboard/drops/profile/reports/finance not yet captured (capture as OWNER); R1
  reviewer creds validated against local seed only; P4 account-deletion public URL missing.
- **Next:** close G1/G3/G7 → production build → recapture (C1/C3/C4) → hand raw+caveats to Codex.

## Mobile UX uplift overlay (2026-06-25)

- **U1 design-system depth** is complete on branch `codex/mobile-ux-uplift/u1-depth`: typed elevation tokens, reduced-motion utility, Button press feedback, and opt-in elevated Card. No haptics, native dependencies, API changes, or behavior changes.
- **U2C customer primitives** is complete on branch `codex/mobile-ux-uplift/u2c-customer-primitives`: `HeroBanner`, `CountdownChip`, `FilterChipRow`, `SegmentedToggle`, `StickyActionBar`, `PeekBar`, `ProgressRing`, and `LoyaltyCard`. No app behavior or data changes.
- **U2R partner primitives** is complete on branch `codex/mobile-ux-uplift/u2r-partner-primitives`: `MetricHero`, `ActionCard`, `QueueCard`, `SellThroughBar`, `Sparkline`, `DataTable`, `RoleAwareSection`, and `RestaurantSwitcher`. No app behavior or data changes.
- **C1 Home/Discover composition** is complete on branch `codex/mobile-ux-uplift/c1-home-discover`: hero, real active-drop stat, closing-soon rail, live tags, loading/error/empty states, and account/passport/consent links composed from real `useDrops()` data. Favorite/follow rail remains omitted until F1 exists.
- **C2 Drops list + map toggle** is complete on branch `codex/mobile-ux-uplift/c2-drops-map`: List/Map segmented toggle, dietary filters, closing-soon/availability sorting, and a native coordinate-pin map view using only public drop coordinates. No map SDK dependency yet.
- **C3 Drop detail + checkout polish** is complete on branch `codex/mobile-ux-uplift/c3-detail-checkout`: countdown from `pickupEndAt`, stock/price/allergen/pickup cards, sticky claim bar, simulator checkout polish, and server-confirmed success state. No fake pickup code, QR/OTP, order state, or payment status is displayed.
- **C4 Orders timeline + peek bar** is complete on branch `codex/mobile-ux-uplift/c4-orders-timeline`: active-order peek above tabs, clearer active pickup order list cards, explicit row press targets, and a detail timeline from real order timestamps/status fields. No pickup code or fake order/payment state is displayed.
- **C5 Passport/loyalty viz** is complete on branch `codex/mobile-ux-uplift/c5-passport-loyalty`: account hub Passport preview, LoyaltyCard tier visualization, Flavour Diversity progress ring, and elevated badge/stat sections composed from real Slice 11 passport/discovery payloads. No fabricated loyalty counts, rewards, referrals, subscription state, impact metrics, or QR/OTP proof is displayed.
- **R1 Partner role-shaped Today dashboard** is complete on branch `codex/mobile-ux-uplift/r1-partner-dashboard`: MetricHero, role badges, status/publishing notices, finance sell-through summary, and operations action cards composed from real `useDashboard()` sections. No trend delta or unsent role data is displayed.
- **R2 Counter focus-mode** is complete on branch `codex/mobile-ux-uplift/r2-counter-focus`: counter queue counts, Active/All/Collected/Issues filters, QueueCard rows, focused verification hero, elevated verify/no-show/incident panels, retained offline banner, and retained tablet split. No haptic/sound dependency yet.
- **R3a Drops visual polish** is complete on branch `codex/mobile-ux-uplift/r3a-drops-visual-polish`: partner Drops list/detail now have status filters, command-center summary, next-action hierarchy, and reserved bars from real `useDrops()` quantities. Signed-in Android release evidence was captured as Bawarchi OWNER at `.codex-artifacts/mobile-ux-uplift/android-preview-build/restaurant-mobile-r3a-drops-owner-list.png` and `.codex-artifacts/mobile-ux-uplift/android-preview-build/restaurant-mobile-r3a-drops-owner-detail.png`. No pause/cancel/activate lifecycle mutation, fake sell-through metric, revenue claim, order state, QR/OTP, or rating was introduced.
- **R3b Drop lifecycle actions** is complete on branch `codex/mobile-ux-uplift/r3b-drop-lifecycle-actions`: partner Drop detail now has confirmed pause, activate/reactivate, schedule, and cancel controls backed by a mobile BFF status endpoint. Signed-in Android release evidence was captured as Bawarchi OWNER at `.codex-artifacts/mobile-ux-uplift/android-preview-build/restaurant-mobile-r3b-lifecycle-detail.png` and `.codex-artifacts/mobile-ux-uplift/android-preview-build/restaurant-mobile-r3b-lifecycle-confirmation.png`; the confirmation dialog was dismissed without mutating seeded data. No fake order/customer/revenue/rating/QR/OTP data was introduced.
- **R3c Reports/finance polish** is complete on branch `codex/mobile-ux-uplift/r3c-reports-finance-polish`: partner Reports and Finance now use dense read-only partner primitives, table/sparkline summaries, payout readability, and counts-only share wording composed from real `useRoiReport()` and `useFinance()` payloads. Signed-in Android release evidence was captured as Bawarchi OWNER at `.codex-artifacts/mobile-ux-uplift/android-preview-build/restaurant-mobile-r3c-reports-owner.png` and `.codex-artifacts/mobile-ux-uplift/android-preview-build/restaurant-mobile-r3c-finance-owner.png`. No export mutation, fake finance metric, rating, user count, QR/OTP, or order state was introduced.
- **R4 More role-aware + switcher** is complete on branch `codex/mobile-ux-uplift/r4-more-role-aware` (cut from the R3c tip — the uplift slices are chained branch-on-branch and are NOT yet merged to `main`; cut every new uplift slice from the previous slice's tip, never from `main`, or you lose the U2R primitives and prior screens and fail the gate). Partner `(tabs)/more.tsx` now hides role-forbidden destinations and adds a `RestaurantSwitcher`, gating each destination by the shared data-driven capability matrix (`roleHasCapability` over `ROLE_SCOPE_SEED`) so it matches the server role matrix. Gate 7/7 green. Authenticated OWNER device capture at `.codex-artifacts/mobile-ux-uplift/android-preview-build/restaurant-mobile-r4-more-owner.png` shows the switcher + OWNER role badge + all 7 destinations from real cloud-bootstrap membership data. Restricted-role variant (FINANCE/PICKUP_STAFF) is a confirmatory follow-up; the hiding is test-backed by the shared `ROLE_SCOPE_SEED`.
- **X1 A11y/motion/perf pass** is complete on branch `codex/mobile-ux-uplift/x1-a11y-motion-perf` (first slice cut from `main` post-consolidation). Contrast re-audit found brand saffron (2.84:1) and gold (2.38:1) failing WCAG-AA as text on light surfaces; fix adds AA companions `palette.saffronText`/`goldText` + `accentTextColor()`/`onAccentTextColor()` helpers (`tokens/contrast.ts`) wired through `Button`, `CustomerPrimitives`, `PartnerPrimitives` and two customer captions — vivid saffron/gold stay for fills, only text changed. `Skeleton` now honors `useReducedMotion()` (was a continuous loop). `Text` already honors Dynamic Type. 12 contrast tests lock it; gate 7/7. Partner app visually unchanged (forest passes).
- **Accepted deviation (X1, owner-acknowledged 2026-06-27, keep-for-now):** customer primary buttons render **charcoal text on saffron** (AA fix for the 2.84:1 white-on-saffron). Owner will analyze in a later phase; flip point is `onAccentTextColor()` in `packages/mobile-ui/src/tokens/contrast.ts`. Partner (forest) buttons unaffected.
- **D1 Demo/presales readiness — IN PROGRESS** on branch `codex/mobile-ux-uplift/d1-demo-presales`. Investor/partner/employee-facing. **Key finding:** the demo seed (`supabase/seed_demo/`) is already rich (8 consumers, 5 restaurants with vivid headline+story copy, 17 drops, 28 orders, reviews, payments, finance, passport, subscriptions) — so D1 is an **imagery + store-asset** slice, not a data-enrichment one. Imagery = **original SVG/vector art by the agent** (owner-approved; stock photos can't be pulled into the repo here, and reusing real restaurants' photos is a licensing problem).
  - **D1a done:** `scripts/demo-art/build-art.mjs` generates 5 cuisine cover illustrations (SVG + PNG via `sharp`); `consumer-mobile/src/ui/mediaFallbacks.ts#coverFor(name)` deterministically picks one by stable name hash (production-safe, real media still wins); wired into all 5 consumer-mobile `ProductMedia` fallbacks. Gate 7/7. Regenerate art: `node scripts/demo-art/build-art.mjs`.
  - **D1b done:** cuisine-keyword logic extracted to `@gozaika/utils#cuisineCoverKey` (single source of truth; mobile `coverFor` now uses it). Cover SVGs copied to `apps/consumer-web/public/art/`. Web wired: restaurant-detail hero (cuisine art behind a forest `/92–/96` overlay, white text stays AA), shared `@gozaika/ui` `DropCard` cover banner, and the inline "Closing soon" cards. Typecheck (ui/consumer-web/utils/mobile) + mobile gate 7/7. **Web visual QA not yet captured** — first step on resume: `npm.cmd --workspace @gozaika/consumer-web run dev`, open `/restaurants/[slug]` + `/drops`, confirm hero contrast + banner crop.
  - **Remaining sub-slices:** D1c drop-type/blind-bag art variants; D1d store-asset cards (reconcile with `.codex-artifacts/gozaika-polish-v2`); D1e Maestro demo-flow polish + capture manifest. **Recommended: start D1d in a fresh session** (large + overlaps polish-v2).
- ✅ **Uplift merge debt resolved (2026-06-26):** the entire U1→R4 chain was linear, so `main` fast-forwarded to the R4 tip `5b274e6` — all uplift work (U1 design-system depth → R4 More role-aware) is now on `main`, gate 7/7 green. The per-slice `codex/mobile-ux-uplift/*` branches are retained for history but are now fully merged. **Going forward: cut each new uplift slice from `main`** (the chain is collapsed; no more branch-on-branch).
- Android release visual QA is unblocked through `scripts/android-preview-install.ps1` using a short physical copy at `C:\tmp\gozaika-build`; junction `C:\gz` does not work because Gradle/CMake resolves the long canonical path. Use `-SkipSync -CaptureScreenshot` after code-only changes.
- U1 verification: mobile-ui typecheck + tests passed; full `node scripts/mobile-ci.mjs` is green 7/7 after clearing active Orbitwell owner drift from app configs and removing a server-secret identifier from a Maestro comment.

## Current state (2026-06-22)
Everything below is on `main`, gate-green, live-proven. Confirm with
`git log --oneline -20` and `node scripts/mobile-ci.mjs` (expect 7/7).

- **Done + merged:** foundation 0–6; **Slice 7** counter (signed off); **Slice 8** customer discovery; **Slice 9** customer payment (gated simulator; real Razorpay stubbed); **Slice 10 orders**; **Slice 11** Passport / Flavour-Diversity / Swaad Club (live-proven); **Slice 15** restaurant finance-read **+ ROI report** (live-proven); restaurant **12** profile / **13** drops-core / **14** dashboard cores.
- **Slice 11 no-drift note:** web account routes + mobile BFF share `consumer-web/lib/passport.ts` + `lib/discovery-profile.ts`. Screens `account/{passport,discovery}.tsx` + `swaad-club.tsx` (coming-soon only — **no native billing**). Smoke: `node scripts/smoke/slice11-passport-smoke.mjs` (BFF on :3003).
- **Slice 15 no-drift note:** web portal reports page + mobile BFF share `restaurant-mgmt-web/lib/roi-report.ts#loadRoiReport`. Screen `restaurant-mobile/app/reports.tsx` (read-only; partner-safe Share, counts only). Smoke: `node scripts/smoke/slice15-roi-smoke.mjs` (BFF on :3001).
- **Slice 10 consent:** DPDP consent settings live — shared `consumer-web/lib/consent.ts#loadConsentSettings`, BFF `/api/mobile/v1/account/consent`, screen `account/consent.tsx` (all 6 purposes, operational locked, erasure link-out only). Decisions in [[project-slice10-consent-decisions]]. Smoke: `node scripts/smoke/slice10-consent-smoke.mjs`. Remainder of Slice 10: profile-edit, referral display, reviews.
- **Slice 12 compliance docs:** private document upload live (owner-approved off the review gate) — BFF `/api/mobile/v1/restaurant/documents` (+`[id]/signed-url`), screen `restaurant-mobile/app/compliance.tsx` (7 types, `manageCompliance`, `private-documents` bucket, signed URLs, no cache, expo-document-picker). Smoke: `node scripts/smoke/slice12-documents-smoke.mjs`. Remainder of Slice 12: the resumable onboarding wizard + location pin.
- **Product media:** the hero/logo/drop-image pipeline is **adopted into `main`** (single-agent ownership now). See `docs/runbooks/product-media-rollout.md`. Gate #5 (verify a real uploaded drop image renders through discovery + falls back on null/failed) is still pending.
- **Customer app** (consumer-mobile): discovery → claim → simulated pay → order → orders list/detail all work on-device.
- **Restaurant app** (restaurant-mobile): dashboard, counter, drops, profile, finance all work on-device (full OWNER E2E passed).

## Next-up order (build one vertical at a time, commit+push each)
1. ~~**Slice 11** — Passport / discovery profile / Swaad Club.~~ ✅ Done 2026-06-22 (shared `buildPassportPayload`/`buildDiscoveryProfile` lib; live-proven).
2. ~~**Slice 15 ROI report** — reuse `lib/roi-report.ts`.~~ ✅ Done 2026-06-22 (shared `loadRoiReport`; live-proven; invoice download still remainder).
3. **Slice 13 drop edit** (pause/cancel/activate) + **Slice 14 reviews/ops-history**.
4. **Slice 10** — ~~consent-settings~~ ✅ Done 2026-06-23. Remainder: reviews submission/status + profile-edit/referral display.
5. **Slice 12 onboarding wizard** (the new-restaurant flow) — document upload ✅ done 2026-06-23; resumable wizard + location pin remain.
6. **Slice 16** push/deep-links/offline → **17** a11y/security/perf gate → **18** release prep.
7. **Product media gate #5**: verify a real uploaded drop image flows through discovery into the consumer app and still falls back on null/failed media.

## ⏸ Review-gated — do NOT build without the owner
- ~~**Slice 12 document upload**~~ ✅ Done 2026-06-23 (owner approved the security posture; restaurant-facing upload + status shipped). In-app **admin moderation** of documents is still web-only by design.
- **In-app data erasure automation** — DPDP legal HUMAN_REVIEW (retention/exemptions) required before any automated erasure. Decided-deferred; the shipped consent screen uses a link-out instead.
- **Real Razorpay RN checkout** — needs the owner's India keys (~1 month). Decided-deferred; stubbed behind the simulator — dropping in keys + flipping `PAYMENTS_SIMULATOR_ENABLED=false` activates it.

## Conventions (follow exactly — this is how we avoid drift)
- **Contracts** live in `packages/types/src/mobile/*.ts`: permissive Zod **wire** schema (`z.string()` for code fields) + precise **TS DTO**; narrow `as unknown as` at the client boundary. Add a fixture in `packages/types/test-fixtures/mobile/` + a `*.test.ts`.
- **Restaurant BFF** (`restaurant-mgmt-web/app/api/mobile/v1`): wrap with `withMobileRestaurantRole(capability, …)` — role matrix is data-driven (`capabilities.ts`). **Customer BFF** (`consumer-web/app/api/mobile/v1`): `withMobileAuth`; for RPCs needing `auth.uid()` use the user's token client (`createServerSupabaseClient(parseBearerToken(...))`), else service role.
- **Reuse canonical RPCs/loaders** (don't reinvent): e.g. `api_convert_paid_hold_to_order`, `loadPortalDrops`, `api_create_inventory_hold`, `api_consumer_order_summary`. Mirror the existing web handler's validation.
- **Gate every change:** `node scripts/mobile-ci.mjs` must stay **7/7** (typecheck all + vitest + expo export both apps + drift scans: no Orbitwell, no banned copy [`leftover|\bstale\b|\bcheap\b|clearance|…`], no server secrets in mobile/Maestro files).
- **Live-prove** each vertical with a quick BFF smoke (mint a demo token, hit the endpoints) — patterns in `scripts/smoke/slice*-smoke.mjs` and `scripts/functional/`.
- **Commit discipline:** single-agent ownership of the whole monorepo now (the parallel product-media track has been merged into `main`). Commit per vertical with a focused file set + the Co-Authored-By trailer, and update the slice tracker in the plan in the same commit. We are NOT live → merging to `main` + pushing per slice is fine, EXCEPT the review-gated items above.
- **Demo identities (test_otp):** consumers `+9198765100xx`/`1000xx` (Priya = …01/100001); restaurant OWNER `+919876520001`/`200001`, role staff `+9198765300xx`/`3000xx` on Bawarchi (`20000000-0000-0000-0000-300000000001`).
- **Local env (clean as of 2026-06-22):** the local DB was fully reset to a clean migrated state. Full reseed recipe after any `supabase db reset`: apply `supabase/seed_demo/`{`demo_seed.sql`,`demo_seed_part2_catalog_drops.sql`,`demo_seed_part3_orders_reviews.sql`,`demo_seed_part4_functions.sql`,`demo_test_otp_linkage.sql`,`demo_prepare.sql`} (via `docker exec -i <supabase_db_*> psql -U postgres -d postgres`), then `node scripts/functional/seed.mjs` (slice13 + slice7, both green now). Local Supabase keys come from `npx supabase status -o env`; run the BFF with `PICKUP_CREDENTIAL_SECRET` matching the counter seed for verify. Note: `.env.local` at repo root points at **cloud** — for local smokes, override `NEXT_PUBLIC_SUPABASE_URL`/`SUPABASE_URL`/keys to the local values.

## Headless / overnight autonomous mode (`scripts/autorun-overnight.ps1`)
When invoked unattended (no human to approve or answer), follow everything above PLUS:
- **Relay convention (prevents redo):** after each committed vertical, update this file's
  **Current state** + **Next-up** so the *next* fresh run continues, never repeats. The
  git history + this file are the only memory across runs.
- **Print a hard-stop sentinel and end** (the loop watches for it) when any of these hit —
  emit exactly `AUTORUN_HALT: <reason>` and stop:
  - you reach a **review-gated** item (Slice 12 document upload, real Razorpay) — do NOT build it;
  - the gate (`node scripts/mobile-ci.mjs`) fails and you can't fix it cleanly;
  - the only remaining work would touch another agent's **product-media** files;
  - **all buildable slices are done**.
- **Never exit with an uncommitted tree:** either finish + commit the vertical, or
  `git restore`/`git clean` your partial edits before halting. A half-built vertical left
  on disk is the one thing that can cause drift on the next run.

## Verify / run
- Gate: `node scripts/mobile-ci.mjs`
- Functional harness (restaurant role matrix): `pwsh scripts/functional/run.ps1`
- Payment smoke: consumer BFF on :3003 with `PAYMENTS_SIMULATOR_ENABLED=true`, then `node scripts/smoke/slice9-payment-smoke.mjs`
- Device E2E flows: `apps/*/.maestro/*.yaml`
