# CONTINUE HERE — goZaika feature-parity implementation

**If you are a fresh session, read this first, then `IMPLEMENTATION-PLAN.md`, then the §0 build sequence in `business-model-audit.md`.**

## Current state (updated 2026-07-06)
- **Branch:** `claude-feature-parity`, based on current `origin/main` (`2813a67` Marketing-v2-polished-still — includes handoff doc + marketing pipeline). Docs commit `afd629b` brought `docs/audit/` across.
- **Phase:** 1 (Marketing) — building the three HTML deliverables.

## Done + verified
- Git setup complete (branch + docs carried across).
- Tooling verified: adb (Pixel 7a `3A021JEHN02437` + emulator online), remote Supabase reachable via docker `postgres:16` psql (`CLOUD_SUPABASE_DB_URL`, 11 restaurants), npx/docker present.
- Brand palette: `packages/design-tokens/src/colors.ts` — saffron `#FF6B35` (customer), forest `#1A5C38` (restaurant), gold `#D4A017`, cream `#FFF8F0`, charcoal `#2D2D2D`; AA text companions saffronText `#B23C0E`, goldText `#7A5C00`.

## In progress
- Phase 1 banners + explainer + gozaika.in copy pass are DONE + QA'd (see below). Next up: the restaurant economics calculator (§11.2) — the one larger build in Phase 1.
- Owner decisions logged: files under `marketing/` (per §13); A4 = 3 separate language pages.
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

## Next step
1. Restaurant economics calculator (§11.2) — site (`/for-restaurants`, near the new fillSpectrum section) + restaurant web app (dedicated tab, per §14 "prominent but not the hero"). This is the one larger build in Phase 1 — good candidate for Opus 4.8/high-effort per the model guidance.
2. Then Phase 2 (consumer surfaces).
Note: an existing `marketing-source/restaurant-sales-kit/` (copy/en-v1.json) exists — reconcile/reuse rather than duplicate if it overlaps when touched.

## Gotchas / conventions
- Tokens not raw hex → banners define CSS vars from the canonical palette.
- Banned consumer copy: `leftover|stale|cheap|clearance|liquidation|food rescue|sample|surplus`. Waste-economics is **B2B/restaurant-only** (§15). Never promise a serving count (§14) — signal generous abundance.
- Brand = BAM/Zayka/Swaad (BAM = "Bada Zayka Ayega Maza"); thali = composition ("how"); "flight" retired; retire "mystery = can't choose".
- Windows MAX_PATH: native mobile builds only from `C:\tmp\gozaika-build`; JS iteration from real source via Metro.
- Keep web-ci 10/10, mobile-ci 7/7. App changes surgical. Ask owner before final merge to main.
- Seed refresh (`demo_prepare_for_demo(p_create_live_drops => true)`) before hands-on testing.
