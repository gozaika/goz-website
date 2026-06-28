# goZaika store + video project — parity review & completion plan

Date: 2026-06-27 · Owner: source-code agent (now sole owner; Codex stopped) ·
Spec: `.codex-artifacts/gozaika-polish-v2/gozaika_store_and_video_design_spec_v1.md`

This is the tracked companion to the gitignored polish-v2 spec. It (1) brings the spec
to **parity** with the current app + the slice-D work, and (2) proposes a step-by-step
plan to finish the store-card and cinematic-video project.

## Where the project stands now

- **Design system** (spec §4) is locked and operationalised: `…/02-design-system/store_video_design_system_lock_v1.md`. Card masters 1290×2796 (iOS) / 1080×1920 (Android), palette, type scale, safe zones, device-frame + overlay rules, allowed badges.
- **Card specs** (spec §7) → wireframes `…/03-wireframes/{customer,partner}_card_wireframes_v1.md`.
- **Cards PRODUCED (new, 2026-06-27):** 7 customer (C1–C7) + 7 partner (P1–P7) 1080×1920 cards from **real native Pixel 7a captures** of the live cloud demo, in tracked `store-assets/` (pipeline `scripts/store-cards/`). This is the first time finals exist — see `store-assets/README.md`.
- **Video** (spec §9–§12): **not started here.** Partial groundwork lives in `…/gozaika-marketing-videos/` (storyboards, captions, deterministic seed, Maestro flows, manifest) and the demo flow `apps/consumer-mobile/.maestro/demo-discovery-vibrant.yaml`.
- **Store submission package:** `…/gozaika-store-launch/` (reviewer data, EAS audit, raw shots, caveats).

## Parity gaps — spec assumptions now outdated

| # | Spec assumption (then) | Reality (now) | Action |
|---|---|---|---|
| 1 | Partner cards P4/P5/P6 + customer C5 **blocked** on missing native captures | Captured signed-in OWNER (partner) + the real order/pickup screen (customer C5). All 14 cards produced. | Mark §7 statuses **unblocked/produced**; point to `store-assets/`. |
| 2 | In-app screenshots use dull placeholder graphics; "not appetizing enough" (§1, §8) | D1a cuisine cover art + D1c blind-bag mystery cover ship natively; screens are vibrant. | Update §1/§8 — UI screenshots are now appetizing; generated **backgrounds** remain an optional enhancement, not a fix for dull UI. |
| 3 | Demo copy had `???` mojibake (an instance of §1 "clipped/garbled text") | Fixed in cloud + scripted (`supabase/seed_demo/demo_fix_mojibake.sql`); 0 remaining. | Remove as an open defect. |
| 4 | Naming: spec uses `goZaika` / `goZaika Partner` | App still shows **"Zayka Passport"**; web-fallback shows **"ZAYKA PRO"** | **Decision needed** (see Phase 0). Cards sidestep it (generic "food passport"); product should converge before final. |
| 5 | Card masters planned 1290×2796 primary | Produced 1080×1920 (Android master) first | Generate iOS 1290×2796 derivatives before iOS upload (pipeline supports a second size). |
| 6 | §8 image strategy = generated food/kitchen/workspace **backgrounds** behind real UI | Cards use clean brand-gradient backgrounds (no generated imagery) | Optional Phase 1 enhancement; current cards are submission-safe without it. |
| 7 | Partner finance/ROI/revenue wording "needs approval" | Owner dashboard cards (P1/P5) show real revenue ₹447 / AOV ₹23.53 | **Decision needed** — mask/crop or approve before final (overlays already make no financial claim). |
| 8 | Demo IDs (`GZ-SEED-…`) "too technical for final" | Visible on c4/c5/p2/p3 | Mask/crop or recapture with production IDs before upload. |
| 9 | Typography: `Inter` is an **assumption** pending brand decision | Cards render with Inter/Segoe fallback | Confirm final marketing face; re-render. |
| 10 | Videos are the second half of the project | Not produced | Phase 2. |

## Recommended plan to complete the project

**Phase 0 — Decisions (you; unblocks everything).**
1. Naming: keep "Zayka Passport"/"ZAYKA PRO" or converge to "goZaika Passport"/"goZaika Partner" (recommend converge; then product rename + recapture).
2. Store-facing copy approval: `BAM Bag`, `Chef's Selection`, `Limited Drop`.
3. Payment/finance wording: may store assets show payment/revenue/AOV? (drives partner P1/P5 + customer C4).
4. Demo IDs in finals: mask vs. recapture with production-shaped IDs.
5. Final marketing typography.

**Phase 1 — Finalise cards (≈1 day after decisions).**
1. Apply Phase-0 decisions to `scripts/store-cards/cards.config.mjs` (mask demo IDs via crop, finance framing, typography) and re-render.
2. Add the iOS **1290×2796** master size to the pipeline (second render pass; same configs).
3. (Optional) Generate atmospheric **backgrounds** per spec §8 and composite behind the device frames — backgrounds only, never UI.
4. QA each card at 100/50/25%/360px (spec §4 method); confirm one proof point, correct app, no chrome, no overclaim.

**Phase 2 — Cinematic videos (the larger remaining effort).**

> **DECIDED DIRECTION (2026-06-28, owner):** the polished videos will be built as
> **real screen recordings + Remotion (scripted) + a licensed music track** — the
> trade-show-quality, fully-repeatable path. Rationale: the current `scripts/store-video/`
> ffmpeg cut animates *static screenshots* (Ken Burns), which still reads as a slideshow
> with dead space; **real UI motion** (actual scrolling/tapping/route transitions) is what
> removes the "deadness." A generative text-to-video AI is **rejected for the UI** (it
> hallucinates fake app UI, violating the product-truth rule) — usable only for abstract
> background b-roll, if at all. Remotion keeps it 100% script-driven/deterministic while
> giving real animation/easing/kinetic captions. **This is deferred — we finish the
> Mobile UX uplift project first.** The existing ffmpeg pipeline stays as the quick
> stopgap/preview.

Plan when we pick this up:
1. **Capture real screen recordings** on device (`maestro record` / `adb screenrecord`) of the customer + partner journeys — consumer already rebuilt with D1 art; roll cloud windows forward first via `demo_prepare`. Full-bleed UI motion, minimal background.
2. **Assemble in Remotion** (React/TSX, in e.g. `scripts/store-video-remotion/`): kinetic captions synced to motion beats, motivated transitions (discovery→detail→claim→pickup), brand frames, large/full-bleed device framing (kill the white space). Customer 24–28s, partner 26–30s; 9:16 master + 1:1/16:9 derivatives.
3. **Licensed music** bed + light sound design (replace the synthesized placeholder pad).
4. Reuse `…/gozaika-marketing-videos/` storyboards + captions (they encode the §10–§11 journeys). C5/pickup beat uses the real SMS-pickup-code UI (no fabricated QR/OTP).
5. Keep the current `scripts/store-video/` ffmpeg pipeline as a deterministic fallback/preview generator.

**Phase 3 — Store submission.**
1. Fold finals into `…/gozaika-store-launch/` (crop 1080×2400→1080×1920 per Play 2:1; reviewer notes; test accounts).
2. Close the EAS gaps recorded there (projectId, submit creds, runtimeVersion, prod env).
3. Reverify platform sizes immediately before upload.

## Spec parity edits applied (local, gitignored)

A "Parity update 2026-06-27" note was added to the top of the spec and to
`…/CURRENT_STATE.md` pointing here; the §7 card statuses are superseded by the
produced cards in `store-assets/`. The detailed gap list above is the authoritative
parity record (tracked in git; the spec tree is gitignored).
