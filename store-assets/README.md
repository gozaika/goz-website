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

## Regenerate

```bash
node scripts/store-cards/build-cards.mjs    # reads screenshots/, writes cards/
```

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
