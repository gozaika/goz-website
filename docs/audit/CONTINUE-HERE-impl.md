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
- Phase 1 banners + explainer are DONE + QA'd (see below). Next up: gozaika.in copy + calculator.
- Owner decisions logged: files under `marketing/` (per §13); A4 = 3 separate language pages.

## Done + verified (Phase 1 marketing collateral)
- `marketing/banners/banner-restaurant-A4.html` — te/hi/en (3 A4 print pages), restaurant B2B acquisition. QA'd in preview: all 3 scripts render (Noto Telugu/Devanagari fallbacks), each page fits one A4, `@page A4` + page-break set. QR is a placeholder (swap production partner-signup QR before printing).
- `marketing/banners/banner-restaurant-A6.html` — compact handbill, EN + Telugu eyebrow. Fits one A6.
- `marketing/explainer/gozaika-explainer.html` — BAM brand + thali product + two-layer moral/product message + restaurant fill-the-gap spectrum. QA'd desktop 1280 (3-col) + 375 (single-col, zero horizontal overflow). Consumer/product layer is banned-copy clean; "surplus" appears only in the B2B restaurant section (allowed §15).
- Static preview via `.claude/launch.json` config `marketing-static` (python http.server :4599).

## Next step
1. gozaika.in (apps/website): lead anti-aggregator B2B, reframe consumer hero to variety/discovery (retire "mystery"), reduce BAM/Zayka/Swaad jargon in first-impression copy, add link to explainer.
2. Restaurant economics calculator (§11.2) — site + restaurant web app.
Note: an existing `marketing-source/restaurant-sales-kit/` (copy/en-v1.json) exists — reconcile/reuse rather than duplicate if it overlaps.

## Gotchas / conventions
- Tokens not raw hex → banners define CSS vars from the canonical palette.
- Banned consumer copy: `leftover|stale|cheap|clearance|liquidation|food rescue|sample|surplus`. Waste-economics is **B2B/restaurant-only** (§15). Never promise a serving count (§14) — signal generous abundance.
- Brand = BAM/Zayka/Swaad (BAM = "Bada Zayka Ayega Maza"); thali = composition ("how"); "flight" retired; retire "mystery = can't choose".
- Windows MAX_PATH: native mobile builds only from `C:\tmp\gozaika-build`; JS iteration from real source via Metro.
- Keep web-ci 10/10, mobile-ci 7/7. App changes surgical. Ask owner before final merge to main.
- Seed refresh (`demo_prepare_for_demo(p_create_live_drops => true)`) before hands-on testing.
