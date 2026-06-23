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

## Current state (2026-06-22)
Everything below is on `main`, gate-green, live-proven. Confirm with
`git log --oneline -20` and `node scripts/mobile-ci.mjs` (expect 7/7).

- **Done + merged:** foundation 0–6; **Slice 7** counter (signed off); **Slice 8** customer discovery; **Slice 9** customer payment (gated simulator; real Razorpay stubbed); **Slice 10 orders**; **Slice 11** Passport / Flavour-Diversity / Swaad Club (live-proven); **Slice 15** restaurant finance-read **+ ROI report** (live-proven); restaurant **12** profile / **13** drops-core / **14** dashboard cores.
- **Slice 11 no-drift note:** web account routes + mobile BFF share `consumer-web/lib/passport.ts` + `lib/discovery-profile.ts`. Screens `account/{passport,discovery}.tsx` + `swaad-club.tsx` (coming-soon only — **no native billing**). Smoke: `node scripts/smoke/slice11-passport-smoke.mjs` (BFF on :3003).
- **Slice 15 no-drift note:** web portal reports page + mobile BFF share `restaurant-mgmt-web/lib/roi-report.ts#loadRoiReport`. Screen `restaurant-mobile/app/reports.tsx` (read-only; partner-safe Share, counts only). Smoke: `node scripts/smoke/slice15-roi-smoke.mjs` (BFF on :3001).
- **Product media:** the hero/logo/drop-image pipeline is **adopted into `main`** (single-agent ownership now). See `docs/runbooks/product-media-rollout.md`. Gate #5 (verify a real uploaded drop image renders through discovery + falls back on null/failed) is still pending.
- **Customer app** (consumer-mobile): discovery → claim → simulated pay → order → orders list/detail all work on-device.
- **Restaurant app** (restaurant-mobile): dashboard, counter, drops, profile, finance all work on-device (full OWNER E2E passed).

## Next-up order (build one vertical at a time, commit+push each)
1. ~~**Slice 11** — Passport / discovery profile / Swaad Club.~~ ✅ Done 2026-06-22 (shared `buildPassportPayload`/`buildDiscoveryProfile` lib; live-proven).
2. ~~**Slice 15 ROI report** — reuse `lib/roi-report.ts`.~~ ✅ Done 2026-06-22 (shared `loadRoiReport`; live-proven; invoice download still remainder).
3. **Slice 13 drop edit** (pause/cancel/activate) + **Slice 14 reviews/ops-history**.
4. **Slice 10 reviews + consent-settings**.
5. **Slice 12 onboarding wizard** (the new-restaurant flow).
6. **Slice 16** push/deep-links/offline → **17** a11y/security/perf gate → **18** release prep.
7. **Product media gate #5**: verify a real uploaded drop image flows through discovery into the consumer app and still falls back on null/failed media.

## ⏸ Review-gated — do NOT build without the owner
- **Slice 12 document upload** — writes the private-documents storage bucket; security-sensitive (the product-media pipeline in `docs/runbooks/product-media-rollout.md` is the reference pattern, now in `main`).
- **Real Razorpay RN checkout** — needs the owner's India keys (~1 month). It's stubbed behind the same client interface; dropping in keys + flipping `PAYMENTS_SIMULATOR_ENABLED=false` activates it.

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
