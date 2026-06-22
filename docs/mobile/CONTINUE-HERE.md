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

- **Done + merged:** foundation 0–6; **Slice 7** counter (signed off); **Slice 8** customer discovery; **Slice 9** customer payment (gated simulator; real Razorpay stubbed); **Slice 10 orders**; restaurant **12** profile / **13** drops-core / **14** dashboard / **15** finance-read cores.
- **Customer app** (consumer-mobile): discovery → claim → simulated pay → order → orders list/detail all work on-device.
- **Restaurant app** (restaurant-mobile): dashboard, counter, drops, profile, finance all work on-device (full OWNER E2E passed).

## Next-up order (build one vertical at a time, commit+push each)
1. **Slice 11** — Passport / discovery profile / Swaad Club (web APIs `consumer-web/app/api/account/*` + types `ZaykaPassportPayload`/`DiscoveryProfile` exist; mobile screens `consumer-mobile/app/(tabs)/account/{passport,discovery}.tsx`, `app/swaad-club.tsx` are placeholders). **Extract a shared `buildPassportPayload` lib so web + mobile don't drift.**
2. **Slice 15 ROI report** — reuse `consumer/restaurant lib/roi-report.ts` (`buildRoiReport`).
3. **Slice 13 drop edit** (pause/cancel/activate) + **Slice 14 reviews/ops-history**.
4. **Slice 10 reviews + consent-settings**.
5. **Slice 12 onboarding wizard** (the new-restaurant flow).
6. **Slice 16** push/deep-links/offline → **17** a11y/security/perf gate → **18** release prep.
7. **Product media gate #5** (owner asked to keep product-media work last): verify a real uploaded drop image flows through discovery into the consumer app and still falls back on null/failed media.

## ⏸ Review-gated — do NOT build without the owner
- **Slice 12 document upload** — writes the private-documents storage bucket; security-sensitive (see `docs/runbooks/product-media-rollout.md` for the pipeline the other agent built).
- **Real Razorpay RN checkout** — needs the owner's India keys (~1 month). It's stubbed behind the same client interface; dropping in keys + flipping `PAYMENTS_SIMULATOR_ENABLED=false` activates it.

## Conventions (follow exactly — this is how we avoid drift)
- **Contracts** live in `packages/types/src/mobile/*.ts`: permissive Zod **wire** schema (`z.string()` for code fields) + precise **TS DTO**; narrow `as unknown as` at the client boundary. Add a fixture in `packages/types/test-fixtures/mobile/` + a `*.test.ts`.
- **Restaurant BFF** (`restaurant-mgmt-web/app/api/mobile/v1`): wrap with `withMobileRestaurantRole(capability, …)` — role matrix is data-driven (`capabilities.ts`). **Customer BFF** (`consumer-web/app/api/mobile/v1`): `withMobileAuth`; for RPCs needing `auth.uid()` use the user's token client (`createServerSupabaseClient(parseBearerToken(...))`), else service role.
- **Reuse canonical RPCs/loaders** (don't reinvent): e.g. `api_convert_paid_hold_to_order`, `loadPortalDrops`, `api_create_inventory_hold`, `api_consumer_order_summary`. Mirror the existing web handler's validation.
- **Gate every change:** `node scripts/mobile-ci.mjs` must stay **7/7** (typecheck all + vitest + expo export both apps + drift scans: no Orbitwell, no banned copy [`leftover|\bstale\b|\bcheap\b|clearance|…`], no server secrets in mobile/Maestro files).
- **Live-prove** each vertical with a quick BFF smoke (mint a demo token, hit the endpoints) — patterns in `scripts/smoke/slice*-smoke.mjs` and `scripts/functional/`.
- **Commit discipline:** stage ONLY your slice's files (another agent is actively building **product media** — `apps/restaurant-mgmt-web/lib/product-media*`, `app/api/portal/media/`, `supabase/migrations/20260622000000_product_media_pipeline.sql`; leave those untouched). End commit messages with the Co-Authored-By trailer. Update the slice tracker in the plan in the same commit. We are NOT live → merging to `main` + pushing per slice is fine, EXCEPT the review-gated items above.
- **Demo identities (test_otp):** consumers `+9198765100xx`/`1000xx` (Priya = …01/100001); restaurant OWNER `+919876520001`/`200001`, role staff `+9198765300xx`/`3000xx` on Bawarchi (`20000000-0000-0000-0000-300000000001`).
- **Local env quirks:** local Supabase DB is behind its migration tracker (role-scope `20260620` + finance-view `20260527` were applied out-of-band); `supabase db reset` + `npm run db:seed:functional` gives a clean fully-migrated DB. Run the BFF with one matching `PICKUP_CREDENTIAL_SECRET` (= the seed's) for counter verify.

## Verify / run
- Gate: `node scripts/mobile-ci.mjs`
- Functional harness (restaurant role matrix): `pwsh scripts/functional/run.ps1`
- Payment smoke: consumer BFF on :3003 with `PAYMENTS_SIMULATOR_ENABLED=true`, then `node scripts/smoke/slice9-payment-smoke.mjs`
- Device E2E flows: `apps/*/.maestro/*.yaml`
