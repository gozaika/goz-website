# D1d — Store-asset reconciliation with `gozaika-polish-v2`

Date: 2026-06-27 · Owner: source-code agent (mobile UX uplift, slice D) · Status: complete

## TL;DR

D1d does **not** produce store-listing cards. After reconciling with the
authoritative store-asset track (`.codex-artifacts/archive/launch-assets-pre-factory/gozaika-polish-v2/`), doing so
would **duplicate and conflict** with a deliberately-gated pipeline and overstep the
store-launch **lane split**. Instead, D1d records what the D1a–D1c art work + the
mojibake repair changed in the *source material* that pipeline consumes, and hands
off the exact native recapture requirements. The vibrant in-app states are the
source-code track's contribution; the polished cards are produced downstream.

## Why not produce cards here (the reconciliation)

`gozaika-polish-v2/CURRENT_STATE.md` + `01-inventory/source_to_card_map.md` establish
that store cards/videos are owned by that track, with **locked decisions** that block
producing finals here:

- "No final images or videos may be produced before the relevant production slices."
- "Product truth must come from real screenshots, source files, or approved future
  capture requirements." Current raw/release captures are "audit/design-system
  sources only; none are approved as final production assets."
- Slice 6 (Customer Store Card Production) is **blocked until clean/approved customer
  sources are selected**; several partner cards (PCard 4/5/6/parts of 7) are blocked
  on missing signed-in native captures.

The store-launch **lane split** (see `docs/mobile/CONTINUE-HERE.md` → "Store launch
readiness") assigns: **source-code agent → raw screenshots/videos, seed/reviewer
data, build/QA evidence, caveats**; **Codex → store copy, privacy drafts, polished
creatives, final Play review.** Polished store cards are Codex's lane.

Conclusion: the no-drift D1d deliverable is **(a)** this reconciliation, **(b)** the
list of polish-v2 sources that D1 improved and must be recaptured, and **(c)** the
already-captured web evidence proving the vibrant states render correctly. No files
were written into `.codex-artifacts/archive/launch-assets-pre-factory/gozaika-polish-v2/` (another track's working
tree) — this doc lives in the source-code track and references polish-v2 by path.

## What D1 changed in the polish-v2 source material

D1's art work is **consumer-app only** (cuisine covers are a consumer-facing
discovery affordance). Partner (`goZaika Partner`) screens were not touched, so the
**PCard** sources and their existing blockers are unchanged by D1.

| Change | Surface | polish-v2 cards improved |
| --- | --- | --- |
| **D1a** cuisine cover fallbacks (mobile) | consumer-mobile Home rail, Drops list, drop detail, Restaurants list, restaurant profile | CCard 1 (Hook / home), CCard 2 (Discovery / drops-list), CCard 3 (Product proof / drop detail), CCard 7 (proof tiles) |
| **D1c** drop-type variants | `BLIND_ADVENTURE` now shows a cuisine-agnostic **mystery** cover (previously *revealed* the cuisine — a correctness fix); `CHEF_SPECIAL`/`SPOTLIGHT` get a gold ribbon | CCard 2 (richer, more accurate drops list), CCard 3 (blind-bag + premium detail) |
| **Mojibake repair** | `restaurant_public_profile` story/headline, `catalog_bag_template_revision` short_description/hint, `drop_drop.drop_title` | Any card/source showing restaurant copy or drop titles (CCard 2/3 especially) — the old sources contain literal `???` and must not be used as finals |
| **D1b** web cuisine art | consumer-web (not a store source) | none directly; keeps web/native consistent for marketing site |

## Native recapture requirements (handoff to the device/Codex step)

The polish-v2 customer sources (`gozaika/01-home-discover.png`,
`gozaika/02-drops-list.png`, `gozaika/03-drop-detail.png`) predate D1 and also carry
Expo dev-client gear + the `???` copy. They should be **recaptured from a release
build** now that the states are vibrant and the copy is clean:

1. **Before capture:** roll the cloud demo windows forward so active + closing-soon
   drops render — `supabase/seed_demo/demo_prepare.sql` (the static demo windows have
   passed). Confirm copy is clean (`demo_fix_mojibake.sql` already applied to cloud).
2. **CCard 1 (home):** capture the Home/Discover rail showing cuisine-art drop cards +
   the live active-drop count + closing-soon rail.
3. **CCard 2 (drops list):** capture the Drops list — now cuisine-accurate covers,
   the **Chef's Special / Spotlight** ribbons, a **mystery** cover on a blind bag, and
   clean em-dash titles.
4. **CCard 3 (drop detail):** capture two — a `BLIND_ADVENTURE` drop (mystery cover +
   "Mystery Cuisine") and a `CHEF_SPECIAL` drop (ribbon + cuisine cover).
5. Capture method: `pwsh scripts/android-preview-install.ps1 -App consumer-mobile
   -SkipSync -CaptureScreenshot` (copy changed files into `C:\tmp\gozaika-build`
   first). Deferred here to the slice-D manual inspection / device session.

Truth rules still apply: no fake QR/OTP/order state, no fabricated metrics; cuisine
art is abstract illustration; real uploaded media wins via the product-media pipeline.

## Evidence already captured (web, this session)

Proof the vibrant states + variants render correctly (gitignored, on disk under
`.codex-artifacts/mobile-ux-uplift/web-preview/`):

- `d1b-hero-{biryani,bakery,grill}.png` — restaurant-detail hero, cuisine art + AA text.
- `d1b-drops-cards.png`, `d1fix-drops-cards-fixed.png` — drops grid cuisine covers + clean em-dash copy.
- `d1c-drops-variants.png`, `d1c-variants-zoom.png` — mystery cover on the blind bag + Chef's Special / Spotlight ribbons.
