# CONTINUE HERE — goZaika feature-parity implementation

**If you are a fresh session, read this first, then `IMPLEMENTATION-PLAN.md`, then the §0 build sequence in `business-model-audit.md`.**

## Session 3 progress (2026-07-07) — screenshot system + demo-fn fix
- **TASK A (screenshot library) — infra DONE.** `docs/screenshots/` with 5 app subfolders + master `README.md` (screen-id system + filename nomenclature `<order>-<flow><step>__<screen-id>.png` + capture workflow) + per-app `INDEX.md` registries (every screen's id/route/planned filename pre-seeded). Screen-id system PROVEN: `data-screen-id="drops-list"` on consumer-web drops root reads back identically from SSR + live DOM via documented `preview_eval`. Confirmed zero pre-existing screen-id attrs (no collisions). Owner decisions: **web captures via a Playwright harness** (preview_screenshot can't write repo files — still to build); mobile via `adb exec-out screencap`.
- **TASK B (demo cleanup fix) — DONE + applied to remote + verified.** See the "Seed-tooling bug — FIXED" block in IMPLEMENTATION-PLAN.md. `demo_prepare_for_demo(p_create_live_drops=>true)` runs clean + idempotent; 5 fresh live drops seeded on remote NOW (ready for Task C device pass). Memory `reference_remote_db_ops_gotchas` updated (workaround retired).
- **TASK C (mobile on-device verify) — UNBLOCKED; thali framing DONE, rest queued.** Root cause was a stale build (installed release APK = embedded pre-Phase-2 JS; prebuilt debug APK too old natively → `ExpoPushTokenManager` redbox). **Fixed:** rebuilt a fresh debug dev-client from `C:\tmp\gozaika-build` (`android/gradlew :app:assembleDebug`, 8m52s) + installed on Pixel 7a + emulator; loads current Metro JS, no redbox. **Working capture setup (use the EMULATOR for live data — API origin `10.0.2.2:3000` needs consumer-web BFF on host:3000 + Metro watch + `adb reverse tcp:8081`):** see `docs/screenshots/consumer-mobile/INDEX.md`.
  - ☑ **Thali framing verified + captured (emulator):** `2-A1__drops-list.png` (testID `screen:drops-list` VERIFIED in uiautomator + "10 live chef-curated thalis — …the lineup a surprise" copy) and `2-A2__drop-detail.png` ("Not a deal. A discovery." block + "discover the dishes"). Mobile screen-id system PROVEN end-to-end (testID → hot-reload → uiautomator → capture).
  - ☐ **Remaining Task C surfaces** (need login as Priya `priya.demo@gozaika.dev`/DemoPass@2026 who avoids NUTS, + driving flows): §16 allergen gate Modal, CM-1 checkout simulator (+confirm PAYMENTS_SIMULATOR_ENABLED effective), CM-2 order pickup-proof (QR/OTP), CM-3 PeekBar inset (needs active hold). Add testIDs to those route roots as captured.
- **NEXT:** finish the remaining Task C surfaces on the emulator (login + claim→checkout→order flow), then Playwright web-capture harness + web Phase 2 evidence → Task D tests + Phase 3.

## Phase 2 progress (updated 2026-07-06, session 2) — consumer surfaces
Branch `claude-feature-parity` pushed (Vercel PREVIEW). Commits: `a1d3315` thali+CW-1, `8c23916` §16+CM-1, `6a42dc7` CM-2+CM-3. **Web gate 10/10 green.**

**Done + web-verified (hands-on preview, screenshots):**
- Thali/variety framing (web): drops list hero, active DropCard, blind + non-blind drop detail ("Not a deal. A discovery." block). No fabricated SKU counts (§14). Retired "Mystery Cuisine" → "A cuisine to discover". Responsive 375/320 clean. Playwright `thali-framing.spec.ts` 2/2.
- §16 allergen-conflict gate (web): warn + explicit-ack interstitial. Verified logged in as Rahul (VEG, rahul.demo@gozaika.dev / DemoPass@2026) on a NON_VEG drop → interstitial → "Claim anyway" → hold → checkout. Shared model `@gozaika/utils/allergen-safety.ts` (15 tests). No console errors.

**Done + typechecks (mobile code / BFF) — NEEDS on-device verification:**
- Thali framing mobile (DropCard, drops list header, drop detail).
- §16 gate mobile: BFF `/api/mobile/v1/account/safety-preferences` + `useSafetyPrefs` + Modal interstitial in drop detail.
- CM-1: honest non-dead-end fallback for the razorpay stub.
- CM-2: BFF `/api/mobile/v1/orders/[id]/pickup-proof` + `issuePickupProofForOrder` + `usePickupProof` + `PickupProofCard` (RN-Views QR + OTP). Order detail in-app proof primary, SMS secondary.
- CM-3: `PeekBarInset` context → Drops/Home/Account/Orders bottom padding + drop-detail sticky-bar lift.

**CW-1 — DONE + verified on remote/preview (owner-authorized apply 2026-07-06).** Migration applied to remote (`CREATE FUNCTION` + `GRANT`). Verified logged in as Priya: `/api/account/discovery-profile` now returns 7 tried cuisines and `/account/discovery` renders "score 41 · Spice Voyager · 7 of 13 cuisines explored" (was 0/score 20). Apply command for reference (needs `MSYS_NO_PATHCONV=1` on Git Bash): `MSYS_NO_PATHCONV=1 docker run --rm -v "<repo>/supabase/migrations:/mig" postgres:16 psql "$CLOUD_SUPABASE_DB_URL" -f /mig/20260706000000_cw1_consumer_tried_cuisines_rpc.sql`.

**BLOCKERS / next session:**
1. **Verify PAYMENTS_SIMULATOR_ENABLED effective on preview BFF** (CM-1) — hit the mobile checkout order endpoint, confirm mode=simulated.
2. ~~Seed-tooling bug~~ **FIXED 2026-07-07** (session 3) — `demo_prepare_for_demo(p_create_live_drops=>true)` runs clean; migration applied to remote. Use the documented call directly now.

**Next session focus:** (a) apply CW-1 migration + verify passport on preview; (b) mobile on-device pass (adb Pixel 7a `3A021JEHN02437` + emulator; Metro from real source hot-reloads JS) — verify thali/allergen-gate/CM-1/CM-2/CM-3 with screenshots; (c) Playwright authed allergen-gate spec (opt-in, reuse Rahul login) + Maestro specs; (d) then Phase 3 (restaurant surfaces).

## Current state (updated 2026-07-06)
- **Branch:** `claude-feature-parity`, based on current `origin/main` (`2813a67` Marketing-v2-polished-still — includes handoff doc + marketing pipeline). Docs commit `afd629b` brought `docs/audit/` across. Pushed to remote; Vercel PREVIEW deployments confirmed (gozaika/consumer/restaurant green; SSO-protected). `main` untouched.
- **Phase:** 1 COMPLETE (marketing + gozaika.in copy + calculator both surfaces). Phase 2 (consumer surfaces) is next.

## Owner correction pass (2026-07-06, post-preview-review) — DONE + verified
- Terminology: "chef's tasting thali" → "chef's thali" everywhere (content.ts, navigation.ts, page.tsx, layout.tsx, explainer, both banners). Home H1 now "A generous chef's thali. No menu. No algorithm." — fits exactly 3 lines (verified).
- Removed hard dish counts from consumer copy (owner: the count is only restaurant guidance, not a promise): "three dishes" → "dishes" (home hero + BamBag), "keep two a surprise" → "keep the rest a surprise"; explainer "Three dishes"→"A spread of dishes", reveal knob "…discover two"→"…discover the rest". Tier ladder ranges (House ~3 / Chef's 3–4) LEFT hedged — they differentiate the §22 tiers on purpose.
- HowItWorksFlow dashed connector was mis-centred (top-10 vs circle centre 64px) → `top-16`; verified diff=0 for both the 3-step home flow and 4-step /how-it-works flow.
- Calculator (BOTH site + portal): (1) fill-mix now shows a segmented proportion bar (forest/gold/saffron) + legend + "fills the rest" note, so semi-prep salvage is clearly visible; (2) the green results headline was a dense sentence → replaced with a scannable visual hero ("THIS DROP CREATES / {N} new regulars a week" + surplus/fresh chips + one quiet aggregator-contrast line). Kept the 4/6 metric cards (owner liked them).
- Gates re-green: website lint/typecheck/build clean, a11y 6/6, smoke 5/5, calculator e2e 2/2 (fixed a strict-mode selector: the new bar's aria-label contains "surplus", so the test now uses getByRole('slider',{name:/^Surplus/})). Portal lint/typecheck/build clean; planner browser-verified logged-in at 1280, bar+hero render, no overflow.

## Done + verified
- Git setup complete (branch + docs carried across).
- Tooling verified: adb (Pixel 7a `3A021JEHN02437` + emulator online), remote Supabase reachable via docker `postgres:16` psql (`CLOUD_SUPABASE_DB_URL`, 11 restaurants), npx/docker present.
- Brand palette: `packages/design-tokens/src/colors.ts` — saffron `#FF6B35` (customer), forest `#1A5C38` (restaurant), gold `#D4A017`, cream `#FFF8F0`, charcoal `#2D2D2D`; AA text companions saffronText `#B23C0E`, goldText `#7A5C00`.

## In progress
- Phase 1 is COMPLETE (banners + explainer + gozaika.in copy pass + the restaurant economics calculator on both site and portal). Next up: Phase 2 — consumer surfaces (web + mobile).
- Owner decisions logged: files under `marketing/` (per §13); A4 = 3 separate language pages.
- Login for hands-on portal/consumer verification (remote Supabase): dev servers target remote (nxvthewcwimrpjbzbcvx). The prefilled `.example` demo login does NOT exist on remote — use the real seed creds from `supabase/seed_demo/README.md` "## Login credentials" via the demo email/password fields (e.g. bawarchi.owner@gozaika.dev / DemoPass@2026) or phone+OTP (+919876520001 / 200001). Preview screenshots can hang on the Next dev overlay — remove it first: `document.querySelector('nextjs-portal')?.remove()`.

## Done + verified (restaurant economics calculator — §11.2)
- Shared math: `packages/utils/src/economics.ts` (`computeEconomics`, `DEFAULT_ECONOMICS_INPUTS`, `normaliseFillMix`), exported from utils index. ONE source of truth for site + portal so the numbers can't drift. `economics.test.ts` — 24 tests; the §5 worked example ties out exactly (₹90 food, ₹23 commission, ₹1.75 thin per-bag contribution); CAC/break-even semantics + degenerate-input robustness covered. Money in paise, rates as fractions 0–1.
- Site tool: `apps/website/components/calculator/RestaurantEconomicsCalculator.tsx` — sales-oriented two-panel "your drop / your economics" (§14), cost assumptions hidden at defaults, on `/for-restaurants` (#calculator) after the fill-spectrum section. Content in `forRestaurantsContent.calculator`. `tests/calculator.spec.ts` (renders + recomputes) 2/2 pass. QA'd desktop 1280 + 375, live recompute verified.
- Portal tab: `apps/restaurant-mgmt-web/app/portal/planner/{page.tsx,planner-client.tsx}` — fuller decision-support version exposing all cost assumptions; "Planner" nav item added to the Build group in `app/portal/portal-nav.tsx` (Calculator icon). Auth-guarded like other portal pages. Browser-verified logged in as Bawarchi owner (all 6 result cards correct, headline correct, live recompute, no overflow at 1280+375, no console errors). Added `/portal/planner` to the opt-in authed a11y suite (RUN_AUTHED_A11Y=1). Portal typecheck+lint+build green; smoke 1/1 (authed skip by design).
- Gate status: utils tests 57/57; website typecheck/lint/build clean, smoke 5/5, a11y 6/6, calculator e2e 2/2; portal typecheck/lint/build clean, /auth/login a11y pass. apps/website is NOT in web-ci.mjs (only consumer-web + restaurant-mgmt-web are).
- Owner-provided canonical brand assets (already wired into the site, confirmed no changes needed): `icons/flame.svg`, `icons/gozaika-logo.svg`, and the webp images in `apps/website/public/images/` (hero-bam-bag-v3, hero-bam-bag-portrait-v3, about-illustration-v3, restaurant-hero-v3). Reuse these — do not source new stock images for goZaika-branded surfaces without checking these first.

## Done + verified (Phase 1 marketing collateral)
- `marketing/banners/banner-restaurant-A4.html` — te/hi/en (3 A4 print pages), restaurant B2B acquisition. QA'd in preview: all 3 scripts render (Noto Telugu/Devanagari fallbacks), each page fits one A4, `@page A4` + page-break set. QR is a placeholder (swap production partner-signup QR before printing).
- `marketing/banners/banner-restaurant-A6.html` — compact handbill, EN + Telugu eyebrow. Fits one A6.
- `marketing/explainer/gozaika-explainer.html` — BAM brand + thali product + two-layer moral/product message + restaurant fill-the-gap spectrum. QA'd desktop 1280 (3-col) + 375 (single-col, zero horizontal overflow). Consumer/product layer is banned-copy clean; "surplus" appears only in the B2B restaurant section (allowed §15).
- Static preview via `.claude/launch.json` config `marketing-static` (python http.server :4599); added `website` config (port 3002, `npm --workspace @gozaika/website run dev -- -p 3002`) since apps/website has no prior launch.json entry (port 3000/3001 already used by consumer-web/restaurant-mgmt-web).

## Done + verified (gozaika.in copy pass — apps/website)
- Retired ALL "mystery" framing site-wide: `lib/content.ts` (hero headline/founderLine/body, bamBag body/callout, restaurantTeaser heading/body, howItWorksContent.subtitle), `app/layout.tsx` (description, OG description, JSON-LD, keywords), `app/page.tsx` metadata, `app/opengraph-image.tsx`, `app/how-it-works/page.tsx` metadata, `lib/navigation.ts` how-it-works nav description. Left blog essays and one skeptical customer testimonial quote untouched (editorial voice discussing the concept, not brand positioning).
- Homepage re-sequenced (`app/page.tsx`): `RestaurantTeaserSection` moved to right after `TrustBadgesSection` (was 6th, now 2nd section) — implements §8 "re-sequence so the anti-aggregator B2B story leads." Restaurant-teaser headline now reuses the banner's exact "Fill your quiet hours. Win repeat regulars." for cross-surface brand consistency.
- Added `forRestaurantsContent.fillSpectrum` (new content block) + a new section in `app/for-restaurants/page.tsx` (gradient bar forest→gold→saffron + surplus/blended/fresh-made copy) — implements §11 on the site, right after `kitchenFlow`.
- Fixed a found-in-passing bug (not in the original audit list): several `operationalNotes`/`operationalFaqs` entries on `/for-restaurants` were internal spec-instruction text that had leaked into live visitor copy (e.g. "the page should communicate clear settlement windows..." / "should be framed as..."). Rewrote as direct declarative copy. The no-show and volume-tier answers now reuse the real 200+ bags/month number already in `comparisonRows` — no new pricing invented.
- Did NOT touch: `comparisonRows` commission numbers (real, existing business data), for-restaurants hero/kitchenFlow/onboardingSteps/differentiators/brandProtection (already strong per audit §7), about page (already clean, no banned copy), FAQ page (already clean).
- Verified: `npm run typecheck` clean, `npm run lint` clean (1 pre-existing unrelated warning in layout.tsx), `npm run build` clean, `npx playwright test tests/smoke.spec.ts` 5/5 pass, `npx playwright test tests/a11y.spec.ts` 6/6 pass (zero violations, including the new fill-spectrum section). Note: apps/website is NOT part of the `web-ci.mjs` gate (that only covers consumer-web + restaurant-mgmt-web) — validated directly instead.
- Visually QA'd in Chrome preview: hero, restaurant-teaser (now 2nd section), BamBag section, for-restaurants fill-spectrum section, operationalNotes section — desktop + 375, zero console errors, zero horizontal overflow.

## Next step — Phase 2 (consumer surfaces, web + mobile), Opus 4.8/high-effort
Per §0 build sequence step 2:
1. Thali/variety framing on drops/detail; surface SKU count/variety; "know one, discover two" for reveal (BLIND_ADVENTURE) drops.
2. CW-1 passport-cuisines fix.
3. CM-1 mobile checkout via simulator (PAYMENTS_SIMULATOR_ENABLED — verify effective after deploy).
4. CM-2 in-app mobile pickup code (also de-risks SMS testing).
5. CM-3 holds/toast polish.
6. §16 allergen-conflict gate (wire customer dietary/allergen prefs to the claim flow).
Read the launch-readiness audit CW-*/CM-* findings before starting. Refresh seed (`demo_prepare_for_demo(p_create_live_drops => true)`) before hands-on device testing.
Note: an existing `marketing-source/restaurant-sales-kit/` (copy/en-v1.json) exists — reconcile/reuse rather than duplicate if it overlaps when touched.

## Gotchas / conventions
- Tokens not raw hex → banners define CSS vars from the canonical palette.
- Banned consumer copy: `leftover|stale|cheap|clearance|liquidation|food rescue|sample|surplus`. Waste-economics is **B2B/restaurant-only** (§15). Never promise a serving count (§14) — signal generous abundance.
- Brand = BAM/Zayka/Swaad (BAM = "Bada Zayka Ayega Maza"); thali = composition ("how"); "flight" retired; retire "mystery = can't choose".
- Windows MAX_PATH: native mobile builds only from `C:\tmp\gozaika-build`; JS iteration from real source via Metro.
- Keep web-ci 10/10, mobile-ci 7/7. App changes surgical. Ask owner before final merge to main.
- Seed refresh (`demo_prepare_for_demo(p_create_live_drops => true)`) before hands-on testing.
