# goZaika store assets

App Store / Play Store screenshot cards, built from **real native app screenshots**
per the locked design system in
`.codex-artifacts/gozaika-polish-v2/02-design-system/store_video_design_system_lock_v1.md`
and the wireframes in `…/03-wireframes/`.

This directory is **tracked in git** (the `.codex-artifacts/gozaika-polish-v2/`
working tree is gitignored) so the produced deliverables are versioned and pushed.

## Layout

- `screenshots/<app>/` — source native captures (1080×2400, Pixel 7a) of the live
  cloud demo. Cuisine cover art (D1a), the blind-bag mystery cover (D1c), and the
  mojibake-fixed copy are all present. Device chrome (status bar, gesture nav) is
  cropped at compose time, never edited.
- `cards/<app>/` — composed 1080×1920 cards (Android phone portrait master).
- `cards/ios/<app>/` — composed 1290×2796 cards (App Store 6.7" master; same
  composition scaled to width with brand breathing room top/bottom).
- `video/<app>/` — preview videos (1080×1920 9:16) + their per-scene frames.

## Regenerate

```bash
# Cards
node scripts/store-cards/build-cards.mjs                 # both masters → cards/ + cards/ios/
node scripts/store-cards/build-cards.mjs --format=ios    # iOS master only

# Preview videos (Playwright scene frames + ffmpeg motion/transitions)
node scripts/store-video/build-video.mjs --app=customer  # → video/customer/*.mp4
node scripts/store-video/build-video.mjs --app=partner   # → video/partner/*.mp4
```

Video scenes/copy/durations live in `scripts/store-video/scenes.config.mjs`; the
builder renders one device-framed frame per scene (real screenshot + baked caption),
then ffmpeg adds Ken Burns zoom + cross-dissolves → 1080×1920 9:16 H.264. Intermediate
`frames/` are gitignored; only the `.mp4` is committed.

Card copy/layout/badges live in `scripts/store-cards/cards.config.mjs`; the renderer
(Playwright → PNG) is `scripts/store-cards/build-cards.mjs`. Swapping a screenshot and
re-running regenerates the card.

## Customer cards (`goZaika`) — complete

| Card | Headline | Proof screen | Notes |
| --- | --- | --- | --- |
| c1-hook | Find today's BAM Bags | Home (19 active drops, closing-soon rail) | mystery cover visible on the blind bag |
| c2-discovery | Fresh drops nearby | Drops list (5 live, filters, cuisine art) | thali cover art |
| c3-trust | Know before you claim | Drop detail (availability, price, allergens, pickup) | full allergen disclosure |
| c4-confidence | Order with confidence | Confirmed order + timeline | real order, "Payment CAPTURED" is real UI |
| c5-pickup | Pickup made simple | Order pickup-code card | SMS pickup code (no fake QR/OTP) |
| c6-passport | Build your food passport | Account / Zayka Passport (Culinary Ambassador) | habit/loyalty proof |
| c7-payoff | Your next favorite dish is close | Discover + Trust + Passport tiles | brand payoff |

## Partner cards (`goZaika Partner`) — complete

Captured signed-in as OWNER (Bawarchi) on the connected device; forest/gold, straight
operational alignment. This unblocks the partner cards that polish-v2 had marked
blocked on missing native captures.

| Card | Headline | Proof screen | Notes |
| --- | --- | --- | --- |
| p1-hook | Run pickup with confidence | Owner dashboard (Today) | reads as operations, Owner badge |
| p2-counter | Today's orders, organized | Pickup counter queue | Ready/Collected/Issues + order |
| p3-verify | Verify every pickup | Verify pickup screen | Scan QR / OTP, no raw OTP or QR payload shown |
| p4-drops | Publish your drops | Drop command center | active/scheduled, live inventory, New drop |
| p5-performance | See demand clearly | Owner dashboard (sell-through) | **finance caveat below** |
| p6-control | Your brand stays in control | More (role-aware IA) | "Owner" role badge, role-gated destinations |
| p7-payoff | Get goZaika Partner | Counter + Verify + Drops tiles | partner brand payoff |

## Preview videos — first cut

| Video | Length | Story (spec §10) |
| --- | --- | --- |
| `video/customer/gozaika-customer-preview.mp4` | ~24s | discover → drops → trust → order → pickup → passport → payoff |
| `video/partner/gozaika-partner-preview.mp4` | ~24s | operations → counter → verify → publish → demand → control → payoff |

9:16 1080×1920, real native screenshots only, brand captions. Now includes:
**procedurally-generated atmospheric backgrounds** (warm saffron bokeh + light sweep
for customer; forest/teal glow + faint grid for partner — code-generated, no external
image model), **motion variety** (per-scene Ken Burns: zoom-in/out + L/R/up pans),
cross-dissolves, and a soft **synthesized ambient audio bed** (warm D-major pad for
customer, calmer C-major for partner — a placeholder; swap for a licensed track).
**Tunable** (`scenes.config.mjs`): bump scene `dur` to hit the spec's exact 24–28s
(customer) / 26–30s (partner) windows (currently ~24s); `--no-audio` skips the bed; 1:1
and 16:9 derivatives are a later pass.

## Design-system compliance

- 1080×1920 Android master; text inside safe zones (96 L/R, 120 top, 180 bottom).
- Palette + type scale from the lock; production-safe sans (Inter where installed,
  else Segoe UI / system-ui — final marketing type is an open brand decision).
- Real screenshots only; allowed customer badges only (Fresh today / Allergens shown /
  Pickup ready / Food passport); no payment claims in overlays; no card counters; no
  discount/surplus/rescue language.

## Known polish items (for the store/video project — see the spec parity review)

- Order # `GZ-SEED-…` is a real demo ID with a visible `SEED` marker (c4/c5). Mask or
  recapture with a production order before final store upload (open decision: demo IDs
  in store assets).
- Passport card reads **"Zayka Passport"** while the brand is **goZaika** — naming
  parity decision pending (headline uses generic "food passport" to sidestep it).
- iOS 1290×2796 masters are a scale-up derivative of these 1080×1920 cards (produce
  before iOS upload).
- Final marketing typography (Inter vs. brand face) unconfirmed.
- **Partner finance caveat:** p1/p5 show the real owner dashboard, which includes
  Today revenue (₹447) and average order value (₹23.53). Per the design-system lock,
  revenue/ROI/GMV/settlement figures need **product/compliance approval** before final
  store use. The card overlays make no financial claim ("Owner view", "See demand
  clearly"); mask/crop or get approval for the revenue figures before upload.
- Partner order IDs (`GZ-SEED-…`) carry the demo `SEED` marker — same masking decision
  as the customer order ID.
- `Chef's Selections` term avoided in overlays (copy approval pending) — p4 uses "your
  drops".
