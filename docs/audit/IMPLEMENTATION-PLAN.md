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
- ☑ Restaurant economics calculator (§11.2) — site + restaurant web app.
  - Shared pure math in `@gozaika/utils` (`economics.ts`, exported from index) — single source of truth for both surfaces; 24 unit tests, §5 example ties out exactly.
  - Site: `RestaurantEconomicsCalculator` on `/for-restaurants` (#calculator) — simpler two-panel sales tool (§14), cost assumptions at defaults; calculator.spec.ts e2e (2 tests). QA'd desktop+375, live recompute confirmed.
  - Portal: `/portal/planner` decision-support tab + "Planner" nav item (Build group) — fuller version exposing every cost assumption. Browser-verified logged-in (Bawarchi owner) at 1280+375, no overflow, no console errors; added to opt-in authed a11y suite. Portal build + lint + typecheck green.

## Phase 2 — Consumer surfaces (web + mobile) — code COMPLETE; mobile device-verify + CW-1 remote-apply pending
Commits on `claude-feature-parity`: `a1d3315` (thali + CW-1), `8c23916` (§16 + CM-1), `6a42dc7` (CM-2 + CM-3). Web gate 10/10 green; pushed for preview.
- ◐ Thali/variety framing on drops/detail — **web done+verified** (list hero, active card, blind + non-blind detail, responsive 375/320, no console errors; Playwright `thali-framing.spec.ts` 2/2). **Mobile code done+typechecks** (DropCard, drops list header, drop detail) — device-verify pending. No SKU counts surfaced (no count field exists + §14 bans promises → variety framed qualitatively). "Know one, discover the rest" done honestly per drop type (restaurant always shown → standard: "discover the dishes"; BLIND_ADVENTURE: "discover the cuisine"). Retired "Mystery Cuisine" → "A cuisine to discover".
- ☑ CW-1 passport-cuisines — **DONE + verified.** `supabase/migrations/20260706000000_cw1_consumer_tried_cuisines_rpc.sql` (SECURITY DEFINER RPC, in-function authz, correct two-hop join) applied to remote (owner-authorized). Verified as Priya: discovery API returns 7 cuisines; `/account/discovery` shows "7 of 13 cuisines explored", score 41 (was 0/20). `discovery-profile.ts` already handled the RPC-present path — no app change needed.
- ◐ CM-1 — **code done**: razorpay stub dead-end replaced with honest fallback (hold-reserved msg + Back to drops). **Still to verify: PAYMENTS_SIMULATOR_ENABLED EFFECTIVE on deployed BFF** (mode=simulated) — part of device pass.
- ◐ CM-2 in-app pickup code — **code done+typechecks**: BFF `/orders/[id]/pickup-proof` + `issuePickupProofForOrder` helper + `usePickupProof` + `PickupProofCard` (QR grid via RN Views + OTP; no native dep). Order detail leads with in-app proof, SMS secondary. Device-verify pending. Note: QR is a visual proof (OTP is verifiable credential); real scannable QR = follow-up needing react-native-svg + native rebuild.
- ◐ CM-3 holds/toast polish — **code done+typechecks**: `PeekBarInset` context (tabs layout publishes footprint) consumed by Drops/Home/Account/Orders (bottom padding) + drop-detail StickyActionBar lift. Device-verify pending.
- ◐ §16 allergen-conflict gate — **web done+verified** (Rahul VEG × NON_VEG drop → interstitial → Claim anyway → hold→checkout; screenshot evidence; no console errors). **Mobile code done+typechecks** (BFF `/account/safety-preferences` + `useSafetyPrefs` + Modal interstitial). Owner decision: warn + explicit ack. Shared model `@gozaika/utils/allergen-safety.ts` (15 unit tests). Loader `consumer-web/lib/safety-prefs.ts`.

**Phase 2 remaining:** (1) ✅ CW-1 migration applied; (2) verify simulator flag effective on preview BFF; (3) mobile on-device verification of thali/allergen-gate/CM-1/CM-2/CM-3 with screenshots — **BLOCKED on a fresh native dev-client build** (installed release APK = embedded pre-Phase-2 JS; prebuilt debug APK redboxes on missing `ExpoPushTokenManager`; build copy stale). Recipe in `docs/screenshots/consumer-mobile/INDEX.md` + memory `reference-mobile-devclient-build`. First mobile testID `screen:drops-list` embedded (source, unverified). (4) Playwright authed allergen-gate spec + Maestro specs; (5) ✅ seed-tooling bug fixed (above).

**Seed-tooling bug — ☑ FIXED + applied to remote (2026-07-07).** Migration `supabase/migrations/20260706120000_demo_cleanup_appendonly_fix.sql` (seed source kept in sync): (a) `raise_immutable_error()` guarded carve-out — permits DELETE + referential UPDATE only under transaction-local flag `app.demo_cleanup_active='on'` set solely by service_role-only `demo_cleanup_data` (real paths still immutable — verified); (b) fixed a pre-existing FK RESTRICT bug (`payment_order_intent.drop_inventory_hold_fk`) — Step 2b + Steps 5/6 now remove order_fk-null hold intents before Step 12; (c) hardened all four `demo_*` fns to service_role-only (`revoke from anon, authenticated` — default privileges had left them open). `demo_prepare_for_demo(p_create_live_drops=>true)` now runs clean + idempotent (5 fresh live drops). Workaround retired.

## Phase 3 — Restaurant surfaces (portal + mobile) — STARTED 2026-07-07
- ☐ §19 template archetype + allergen envelope + reusable copy.
- ☐ Drop-time surplus fill (internal note/config).
- ☑ Calculator / decision-support tab (restaurant web app) — done in Phase 1 (`/portal/planner`).
- ☐ RP-1 #418 hydration fix.
- ☑ **RP-2 finance "Orders 0" — DONE.** Root cause: the demo seed inserts the static settlement run (`…f00000000001`) with explicit totals but omits `order_count` (defaults 0), inserts 6 ORDER_GROSS entries, advances to PAID — never recomputing. Fix: seed now calls `api_finance_recalculate_run_totals(...)` right after inserting entries (run still DRAFT). Remote demo data corrected in place (`order_count` 0→6) via a PAID→DRAFT→recompute→PAID transaction (the locked-guard allows status-only changes; blocks the money/count fields). View `api_restaurant_finance_settlement_summary` projects `sr.order_count` directly → summary card now reads "Orders 6". Verified at data + view layer (RLS hides it from raw psql).
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
