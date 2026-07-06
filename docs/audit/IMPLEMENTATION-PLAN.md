# goZaika feature-parity — Implementation Plan (phased checklist)

**Branch:** `claude-feature-parity` (off current `origin/main` = `2813a67`, includes Marketing-v2 + handoff doc).
**Sources of truth:** `docs/audit/business-model-audit.md` (§0 build sequence), `docs/audit/launch-readiness-audit-2026-07-05.md` (gaps CW-*/RP-*/MK-*/CM-*/RM-*), `docs/handoff/gozaika_handoff_v1.md` + `docs/web/w5-w7-autonomous-decisions.md` (anti-drift).
**Companion:** `docs/audit/CONTINUE-HERE-impl.md` (live state — update both after every meaningful chunk).

Status key: ☐ todo · ◐ in progress · ☑ done+verified

---

## Phase 0 — Setup & tooling
- ☑ Create branch `claude-feature-parity` off current `origin/main`; carry `docs/audit/` across (commit `afd629b`).
- ☑ Verify tooling: adb (Pixel 7a `3A021JEHN02437` + emulator), remote Supabase (docker psql, 11 restaurants), npx, docker, `.env.local` CLOUD_*, palette tokens.
- ☐ Seed refresh `demo_prepare_for_demo(p_create_live_drops => true)` on remote — run right before hands-on device/web testing (keeps live drops fresh).

## Phase 1 — Marketing (banners + explainer → then gozaika.in + calculator)
- ☑ `marketing/banners/banner-restaurant-A4.html` — 3 print pages (te/hi/en), restaurant acquisition, §12 anti-aggregator + §15 B2B waste→revenue + §11 fill-spectrum + §22 tiers, forest accent. QA'd in Chrome preview (all 3 scripts render, fits one A4/page, print @page A4).
- ☑ `marketing/banners/banner-restaurant-A6.html` — condensed handbill (EN + Telugu eyebrow). QA'd (fits one A6).
- ☑ `marketing/explainer/gozaika-explainer.html` — §21 BAM brand + chef's tasting thali (§12) + two-layer message (§15) + fill-the-gap (§11). QA'd desktop 1280 (3-col) + 375 (single-col, no overflow). Consumer layer banned-copy clean; surplus only in B2B section.
- ☑ gozaika.in (apps/website) copy/positioning: retired all "mystery" framing (hero, metadata, OG image, nav, JSON-LD); hero/BamBag/how-it-works reframed to chef's-thali/variety/generous (§12/§14); homepage re-sequenced so RestaurantTeaserSection (anti-aggregator B2B) leads right after the hero (§8); restaurant-teaser headline reuses the banner's "Fill your quiet hours. Win repeat regulars." for cross-surface consistency; added `forRestaurantsContent.fillSpectrum` (§11) as a new section on `/for-restaurants` (gradient bar + surplus/blended/fresh copy); fixed a found-in-passing bug where several `operationalNotes`/`operationalFaqs` entries were internal spec-instruction text leaking into visitor copy ("the page should communicate...") — rewritten as direct declarative copy, reusing the real 200+ bags/month volume-tier number already in `comparisonRows` (no pricing invented). Verified: website lint/typecheck/build/e2e(5)/a11y(6) all green; homepage/for-restaurants QA'd in Chrome preview at desktop+375, no overflow, no console errors. Standardized brand images (icons/flame.svg, icons/gozaika-logo.svg, apps/website/public/images/*.webp) were already wired into hero/about/for-restaurants — no image changes needed this pass.
- ☐ Restaurant economics calculator (§11.2) — site + restaurant web app. NEXT UP.

## Phase 2 — Consumer surfaces (web + mobile)
- ☐ Thali/variety framing on drops/detail; SKU count/variety surfaced; "know one, discover two" for reveal.
- ☐ CW-1 passport-cuisines fix.
- ☐ CM-1 mobile checkout via simulator (PAYMENTS_SIMULATOR_ENABLED).
- ☐ CM-2 in-app mobile pickup code (removes SMS dependency).
- ☐ CM-3 holds/toast polish.
- ☐ §16 allergen-conflict gate (wire customer dietary/allergen prefs to claim flow).

## Phase 3 — Restaurant surfaces (portal + mobile)
- ☐ §19 template archetype + allergen envelope + reusable copy.
- ☐ Drop-time surplus fill (internal note/config).
- ☐ Calculator / decision-support tab (restaurant web app).
- ☐ RP-1 #418 hydration fix.
- ☐ RP-2 finance "Orders 0".
- ☐ RM-1 mobile ROI parity.
- ☐ Order Again surfaced in Orders/counter queue.

## Phase 4 — Cross-cutting
- ☐ §20 Order Again reorder end-to-end + sample→reorder instrumentation.
- ☐ CW-3 real imagery.
- ☐ a11y pass (keep axe green; human sign-off deferred to owner).
- ☐ (Deferred to owner) schedule expired-holds release job — do not build, don't regress availability.

## Phase 5 — Test + deploy
- ☐ Extend Playwright (web *.spec.ts): calculator, Order Again, allergen gate, thali framing, mobile checkout, pickup code.
- ☐ Extend Maestro (mobile) for same.
- ☐ Green gates: web-ci 10/10, mobile-ci 7/7, Playwright, Maestro.
- ☐ Open PR; ASK owner before final merge to main (auto-deploys prod).
