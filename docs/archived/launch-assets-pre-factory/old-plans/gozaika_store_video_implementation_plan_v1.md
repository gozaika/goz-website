# goZaika Store And Video Implementation Plan v1

Date: 2026-06-23

## Purpose

This document turns the creative specification in `.codex-artifacts/gozaika-polish-v2/gozaika_store_and_video_design_spec_v1.md` into a controlled, slice-based production plan.

The goal is to create high-quality App Store / Play Store screenshot cards and cinematic app preview videos for two separate goZaika apps:

- Customer app: `goZaika`
- Restaurant app: `goZaika Partner`

This plan is designed for multi-session agent execution. Each slice must produce bounded outputs, pass explicit quality gates, and update a current-state document so later sessions can continue without drift.

## Source Of Truth

Primary creative specification:

- `.codex-artifacts/gozaika-polish-v2/gozaika_store_and_video_design_spec_v1.md`

Durable implementation control plan:

- `project docs/gozaika_store_video_implementation_plan_v1.md`

Working project directory:

- `.codex-artifacts/gozaika-polish-v2/`

Current-state memory for future sessions:

- `.codex-artifacts/gozaika-polish-v2/CURRENT_STATE.md`

Existing customer screenshots:

- `.codex-artifacts/gozaika-store-launch/screenshots/raw/gozaika/01-home-discover.png`
- `.codex-artifacts/gozaika-store-launch/screenshots/raw/gozaika/02-drops-list.png`
- `.codex-artifacts/gozaika-store-launch/screenshots/raw/gozaika/03-drop-detail.png`
- `.codex-artifacts/gozaika-store-launch/screenshots/raw/gozaika/04-order-confirmed.png`
- `.codex-artifacts/gozaika-store-launch/screenshots/raw/gozaika/05-passport.png`

## Non-Negotiable Rules

- Do not treat the prior `gozaika-polish-v1` output as a base to patch.
- Do not merge the customer and restaurant apps into one store presence.
- Do not create fake app UI, fake restaurant names, fake pricing, fake QR codes, fake OTPs, fake order statuses, or fake product data.
- Do not use raw screenshots without intentional crop, cleanup, masking, focus, or compositing.
- Do not produce final images or videos until the relevant planning, audit, wireframe, prompt, and QA slices are complete.
- Do not use generated image tools to create precise UI text, app screens, restaurant names, pricing, or product claims.
- Do not allow text outside safe zones.
- Do not ship visual assets with debug controls, red dots, simulator chrome, status artifacts, ugly borders, card counters, or dead white space.
- Do not make the video a slideshow of store cards.
- Every slice must update `CURRENT_STATE.md`.

## Working Directory Structure

Agents should use `.codex-artifacts/gozaika-polish-v2/` as the working project directory.

Recommended structure:

```text
.codex-artifacts/gozaika-polish-v2/
  CURRENT_STATE.md
  00-control/
  01-inventory/
  02-design-system/
  03-wireframes/
  04-prompts/
  05-backgrounds/
  06-composites/
  07-card-qa/
  08-video-animatics/
  09-video-motion/
  10-video-exports/
  11-final-exports/
  qa/
```

Generated assets, drafts, contact sheets, and exports belong under `.codex-artifacts/gozaika-polish-v2/`.

Durable planning docs that should survive artifact cleanup belong under `project docs/`.

`.codex-artifacts/` is already ignored by `.gitignore`; agents should not add broad ignore rules for all non-code directories. Add ignore rules only if a new generated-output directory is created outside `.codex-artifacts/`, and avoid hiding useful planning documents.

## Current-State Document Contract

Every slice must update:

- `.codex-artifacts/gozaika-polish-v2/CURRENT_STATE.md`

Use this template:

```md
# goZaika Polish v2 Current State

Last updated:
Current slice:
Previous slice completed:
Next recommended slice:

## Project Intent

## Locked Decisions

## Files Created Or Updated

## Assets Approved

## Assets Rejected

## Open Questions

## Blockers

## QA Results

## Do Not Revisit Unless New Evidence Appears

## Next Agent Prompt
```

The `Next Agent Prompt` section must be concise and directly usable. It should state the next slice, the exact files to read first, the outputs to produce, and what not to do.

## Slice Execution Rules

Each slice must:

- Read the creative spec before acting.
- Read `CURRENT_STATE.md` if it exists.
- Confirm the customer and restaurant apps remain separate.
- Produce only the outputs listed for that slice.
- Avoid expanding scope into later slices.
- Record open questions rather than guessing where product truth is required.
- End with a QA note and an updated `CURRENT_STATE.md`.

If a slice is blocked by missing screenshots or missing product truth, stop at the planning or inventory output for that slice. Do not fabricate assets to continue.

## Slice 0: Project Setup And Control Docs

### Goal

Create the project control structure that keeps all later sessions aligned.

### Inputs

- `project docs/gozaika_store_video_implementation_plan_v1.md`
- `.codex-artifacts/gozaika-polish-v2/gozaika_store_and_video_design_spec_v1.md`
- `.gitignore`

### Tasks

- Create the recommended `.codex-artifacts/gozaika-polish-v2/` subdirectories if missing.
- Create `.codex-artifacts/gozaika-polish-v2/CURRENT_STATE.md` from the template.
- Create `.codex-artifacts/gozaika-polish-v2/00-control/README.md`.
- Create `.codex-artifacts/gozaika-polish-v2/00-control/qa_checklist_master.md` by extracting the QA gates from the creative spec.
- Create `.codex-artifacts/gozaika-polish-v2/00-control/asset_manifest_template.md`.
- Confirm `.codex-artifacts/` is ignored by `.gitignore`.

### Outputs

- `CURRENT_STATE.md`
- `00-control/README.md`
- `00-control/qa_checklist_master.md`
- `00-control/asset_manifest_template.md`

### Acceptance Criteria

- Future agents can identify the current slice and next slice from `CURRENT_STATE.md`.
- The control docs explicitly distinguish customer app and restaurant app work.
- No image or video production has occurred.

### Agent Prompt

```text
You are starting Slice 0 for the goZaika store/video polish project. Read:

1. project docs/gozaika_store_video_implementation_plan_v1.md
2. .codex-artifacts/gozaika-polish-v2/gozaika_store_and_video_design_spec_v1.md
3. .gitignore

Do not create images or videos. Create the project control folder structure under .codex-artifacts/gozaika-polish-v2, create CURRENT_STATE.md, create the control README, create the master QA checklist, and create an asset manifest template. Confirm .codex-artifacts is already ignored. End by updating CURRENT_STATE.md with the completed slice and the exact next agent prompt for Slice 1.
```

## Slice 1: Screenshot And Asset Audit

### Goal

Inventory all available screenshot and brand inputs, identify defects, and map each planned card/video beat to a real product source or missing capture.

### Inputs

- Creative spec
- `CURRENT_STATE.md`
- Existing customer screenshots under `.codex-artifacts/gozaika-store-launch/screenshots/raw/gozaika/`
- Any existing brand assets in the repo, including website/public image folders if relevant
- Prior flawed v1 outputs only as diagnostic examples, not as production inputs

### Tasks

- Inventory all customer screenshots.
- Inspect each screenshot for readability, empty space, debug controls, red dots, status bars, cropping issues, and useful proof points.
- Identify missing customer captures, especially pickup proof/order detail if needed.
- Inventory available restaurant/partner screenshots, if any.
- Identify required partner captures:
  - Dashboard
  - Counter queue
  - Pickup verification QR/manual OTP
  - Verification success
  - Drop create/manage
  - Profile/public preview
  - Compliance/onboarding status
  - ROI/report/dashboard metrics
  - Finance/settlement only if visually and policy ready
  - Tablet views if partner iPad assets are planned
- Create a source-to-card mapping.
- Create a source-to-video-shot mapping.
- Mark blockers where no real product state exists.

### Outputs

- `01-inventory/asset_inventory.md`
- `01-inventory/source_to_card_map.md`
- `01-inventory/source_to_video_shot_map.md`
- Updated `CURRENT_STATE.md`

### Acceptance Criteria

- Every planned customer card maps to a screenshot or explicit recapture need.
- Every planned customer video shot maps to a screenshot or explicit recapture need.
- Partner work is marked blocked where partner screenshots do not exist.
- No fake UI or placeholder product data is proposed as final material.

### Agent Prompt

```text
You are executing Slice 1: Screenshot And Asset Audit. Read the implementation plan, creative spec, and CURRENT_STATE.md first. Inspect available customer screenshots under .codex-artifacts/gozaika-store-launch/screenshots/raw/gozaika. Search for any partner screenshots or brand assets in the repo. Do not create images, videos, or polished compositions. Produce asset_inventory.md, source_to_card_map.md, and source_to_video_shot_map.md under .codex-artifacts/gozaika-polish-v2/01-inventory. Identify missing captures and blockers precisely. Update CURRENT_STATE.md with the next recommended slice.
```

## Slice 2: Brand And Store System Lock

### Goal

Convert the creative spec into a locked visual-system addendum before any production design.

### Inputs

- Creative spec
- Slice 1 inventory outputs
- Existing brand assets and website/app style references
- Current app UI screenshots

### Tasks

- Confirm or propose final marketing typography assumptions.
- Lock the card canvas sizes and safe zones.
- Lock customer and partner color direction.
- Lock device-frame rules.
- Lock screenshot cleanup/editing permissions.
- Lock overlay/copy rules.
- Lock customer and partner visual differences.
- Define exact no-go patterns.
- Define preview-scale QA method.

### Outputs

- `02-design-system/store_video_design_system_lock_v1.md`
- Updated `CURRENT_STATE.md`

### Acceptance Criteria

- Later card agents do not need to invent typography, colors, safe zones, or screenshot treatment rules.
- Customer and partner systems feel related but distinct.
- The addendum resolves any ambiguity in the creative spec without weakening it.

### Agent Prompt

```text
You are executing Slice 2: Brand And Store System Lock. Read the implementation plan, creative spec, CURRENT_STATE.md, and Slice 1 inventory files. Do not create final cards, backgrounds, images, or video. Produce a visual-system lock document under .codex-artifacts/gozaika-polish-v2/02-design-system. It must freeze canvas sizes, safe zones, typography assumptions, colors, screenshot treatment rules, overlay rules, and customer-vs-partner distinctions. Update CURRENT_STATE.md.
```

## Slice 3: Customer Store Card Wireframes

### Goal

Create low-fidelity but precise layout plans for the customer app store card sequence.

### Inputs

- Creative spec
- Slice 1 inventory
- Slice 2 design-system lock
- Customer screenshots

### Tasks

- Produce card wireframes for 6 to 8 customer cards.
- Assign each card one primary job and one proof point.
- Specify source screenshot crop/treatment.
- Specify layout, text placement, safe zones, callouts, background direction, and depth.
- Include rough thumbnail diagrams or ASCII layout blocks if useful.
- Mark any card blocked by missing screenshot/proof.

### Outputs

- `03-wireframes/customer_card_wireframes_v1.md`
- Optional rough layout files under `03-wireframes/customer/`
- Updated `CURRENT_STATE.md`

### Acceptance Criteria

- The customer sequence works as a mini landing page.
- The first card has aspirational hook energy.
- Middle cards prove real app states.
- The final card creates habit/community payoff.
- No card depends on fake UI.

### Agent Prompt

```text
You are executing Slice 3: Customer Store Card Wireframes. Read the implementation plan, creative spec, CURRENT_STATE.md, Slice 1 inventory, and Slice 2 design-system lock. Do not generate backgrounds or final images. Create precise customer card wireframes under .codex-artifacts/gozaika-polish-v2/03-wireframes. Each card must have one role, one message, one proof point, source screenshots, layout strategy, overlay strategy, and QA notes. Update CURRENT_STATE.md.
```

## Slice 4: Restaurant Store Card Wireframes

### Goal

Create low-fidelity but precise layout plans for the `goZaika Partner` store card sequence.

### Inputs

- Creative spec
- Slice 1 inventory
- Slice 2 design-system lock
- Partner screenshots, if available
- Partner screenshot capture needs

### Tasks

- Produce card wireframes for 6 to 8 partner cards.
- Separate restaurant app intent from customer app intent.
- Assign each card one operational proof point.
- Mark missing partner screenshot needs precisely.
- Avoid inventing restaurant UI.

### Outputs

- `03-wireframes/partner_card_wireframes_v1.md`
- Optional rough layout files under `03-wireframes/partner/`
- Updated `CURRENT_STATE.md`

### Acceptance Criteria

- The partner sequence immediately reads as a restaurant/operations app.
- Queue, verification, publishing, performance, and control are treated as distinct proof beats.
- Missing product states are captured as blockers instead of fabricated.

### Agent Prompt

```text
You are executing Slice 4: Restaurant Store Card Wireframes. Read the implementation plan, creative spec, CURRENT_STATE.md, Slice 1 inventory, and Slice 2 design-system lock. Do not create images or fake partner UI. Build the goZaika Partner card wireframe spec. If partner screenshots are missing, produce a capture-request list and block affected cards rather than inventing product states. Update CURRENT_STATE.md.
```

## Slice 5: Background And Image Prompt Pack

### Goal

Prepare high-quality background-generation and compositing prompts without creating final UI assets.

### Inputs

- Creative spec
- Design-system lock
- Customer and partner wireframes
- Screenshot inventory

### Tasks

- Create prompt packs for background-only image generation.
- Create compositing instructions for placing real screenshots over generated or designed backgrounds.
- Define per-card negative prompts.
- Define per-card multi-pass editing plans.
- Specify what text must be overlaid later outside image generation.
- Specify how to avoid fake UI, distorted UI, and fake product data.

### Outputs

- `04-prompts/customer_card_background_prompt_pack_v1.md`
- `04-prompts/partner_card_background_prompt_pack_v1.md`
- `04-prompts/compositing_rules_v1.md`
- Updated `CURRENT_STATE.md`

### Acceptance Criteria

- Prompt packs never ask an image model to generate precise app UI.
- Prompt packs are specific enough for later production.
- Each card has a background strategy and a compositing strategy.

### Agent Prompt

```text
You are executing Slice 5: Background And Image Prompt Pack. Read all prior slice outputs, especially wireframes and design-system lock. Do not generate images. Create background-only prompt packs and compositing rules under .codex-artifacts/gozaika-polish-v2/04-prompts. Explicitly prohibit generated UI text, generated pricing, fake restaurant names, fake QR/OTP codes, and fake product data. Update CURRENT_STATE.md.
```

## Slice 6: Customer Store Card Production

### Goal

Produce polished customer app store card drafts using approved screenshot crops, background generation/composition, typography, and overlays.

### Inputs

- Creative spec
- Design-system lock
- Customer wireframes
- Prompt pack
- Cleaned or approved customer screenshots

### Tasks

- Create customer card background assets where needed.
- Clean and crop customer screenshots.
- Composite real screenshot proof into each card.
- Add typography and overlays programmatically or in an editable design format.
- Export review drafts.
- Create contact sheet and preview-scale QA.

### Outputs

- `05-backgrounds/customer/`
- `06-composites/customer/drafts/`
- `07-card-qa/customer_contact_sheet_v1.*`
- `07-card-qa/customer_card_qa_v1.md`
- Updated `CURRENT_STATE.md`

### Acceptance Criteria

- No debug/status artifacts.
- UI is readable at preview size.
- Each card has one job and one proof point.
- Text is inside safe zones.
- No fake UI or fake product data.
- Customer sequence feels joyful, appetizing, trustworthy, and habit-forming.

### Agent Prompt

```text
You are executing Slice 6: Customer Store Card Production. Read the implementation plan, creative spec, CURRENT_STATE.md, design-system lock, inventory, customer wireframes, and customer prompt pack. Produce only customer app store card drafts and QA outputs. Do not work on partner cards or video. Use real screenshots only for UI. Update CURRENT_STATE.md with approved drafts, rejected drafts, blockers, and the next slice.
```

## Slice 7: Partner Store Card Production

### Goal

Produce polished `goZaika Partner` store card drafts using real partner screenshots and the approved partner system.

### Inputs

- Creative spec
- Design-system lock
- Partner wireframes
- Partner prompt pack
- Partner screenshots

### Tasks

- Confirm partner screenshots exist and are adequate.
- If blocked, produce a capture request and stop before production.
- Create partner background assets where needed.
- Clean and crop partner screenshots.
- Composite real partner UI proof into each card.
- Add typography and overlays.
- Export review drafts.
- Create contact sheet and preview-scale QA.

### Outputs

- `05-backgrounds/partner/`
- `06-composites/partner/drafts/`
- `07-card-qa/partner_contact_sheet_v1.*`
- `07-card-qa/partner_card_qa_v1.md`
- Updated `CURRENT_STATE.md`

### Acceptance Criteria

- Partner cards clearly read as restaurant operations, not customer discovery.
- No private customer or restaurant data is exposed.
- No fake partner UI.
- Operational proof is clear: queue, verification, drop control, performance, roles/trust.

### Agent Prompt

```text
You are executing Slice 7: Partner Store Card Production. Read all prior control docs and partner wireframes. First verify partner screenshots exist and are safe to use. If they do not, stop and produce a partner capture request instead of inventing UI. If they do exist, produce partner card drafts and QA outputs only. Do not work on customer cards or video. Update CURRENT_STATE.md.
```

## Slice 8: Store Card Final QA And Export

### Goal

Run full-sequence QA on both app store card sets and produce platform-ready exports.

### Inputs

- Customer card drafts
- Partner card drafts
- Card QA notes
- Creative spec QA checklist
- Design-system lock

### Tasks

- Review each card individually.
- Review customer sequence as a mini landing page.
- Review partner sequence as a separate mini landing page.
- Check safe zones, preview scale, contrast, UI truth, typography, copy, and visual rhythm.
- Produce corrected final exports.
- Produce manifest of final assets.

### Outputs

- `11-final-exports/cards/customer/`
- `11-final-exports/cards/partner/`
- `11-final-exports/cards/card_export_manifest.md`
- `qa/store_card_final_qa_v1.md`
- Updated `CURRENT_STATE.md`

### Acceptance Criteria

- Customer and partner listings are both complete.
- All cards pass preview-scale readability.
- No known QA blocker remains.
- Final assets have clear filenames and documented dimensions.

### Agent Prompt

```text
You are executing Slice 8: Store Card Final QA And Export. Read all prior slice outputs and QA files. Do not create new concepts unless a QA blocker requires a correction. Finalize customer and partner card exports, produce a manifest, and write final store-card QA. Update CURRENT_STATE.md with exact final asset locations and the next recommended video slice.
```

## Slice 9: Customer Video Animatic

### Goal

Create a timing/story prototype for the customer app preview video before high-polish motion.

### Inputs

- Creative spec video sections
- Customer screenshots/cards
- Customer card QA outputs
- Motion system in the creative spec

### Tasks

- Create a shot-by-shot animatic plan or rough silent animatic.
- Validate the first 2 seconds and first 5 seconds.
- Ensure the video is causal, not a slideshow.
- Map every shot to real product proof.
- Define transitions, overlays, and timing.

### Outputs

- `08-video-animatics/customer/customer_video_animatic_plan_v1.md`
- Optional rough animatic file if implementation is approved
- `qa/customer_video_animatic_qa_v1.md`
- Updated `CURRENT_STATE.md`

### Acceptance Criteria

- The customer video tells a story from discovery to confidence to habit payoff.
- It does not simply animate store cards.
- It works muted on paper before final motion.
- Every product claim maps to real UI.

### Agent Prompt

```text
You are executing Slice 9: Customer Video Animatic. Read the implementation plan, creative spec, CURRENT_STATE.md, finalized customer card outputs, and video sections. Create a customer video animatic plan, not a final video. If creating a rough animatic is approved in this session, keep it rough and clearly labeled. Validate that the first five seconds create transformation and that the video is not a slideshow. Update CURRENT_STATE.md.
```

## Slice 10: Partner Video Animatic

### Goal

Create a timing/story prototype for the `goZaika Partner` app preview video before high-polish motion.

### Inputs

- Creative spec video sections
- Partner screenshots/cards
- Partner card QA outputs
- Motion system in the creative spec

### Tasks

- Create a shot-by-shot partner animatic plan or rough silent animatic.
- Validate restaurant-specific intent.
- Ensure the video proves operational confidence.
- Map every shot to real product proof.
- Define transitions, overlays, and timing.

### Outputs

- `08-video-animatics/partner/partner_video_animatic_plan_v1.md`
- Optional rough animatic file if implementation is approved
- `qa/partner_video_animatic_qa_v1.md`
- Updated `CURRENT_STATE.md`

### Acceptance Criteria

- The partner video immediately reads as restaurant operations.
- Queue, verification, publishing, performance, and control are clear.
- It does not become a customer-food-discovery video.
- It does not invent partner product states.

### Agent Prompt

```text
You are executing Slice 10: Partner Video Animatic. Read the implementation plan, creative spec, CURRENT_STATE.md, finalized partner card outputs, and video sections. Create a partner video animatic plan, not a final video. If partner screenshots are incomplete, stop at capture requests and blocked shots. Validate that the video proves operational confidence and does not drift into customer marketing. Update CURRENT_STATE.md.
```

## Slice 11: Motion Prototype

### Goal

Prototype motion language, transitions, overlays, and timing for both videos before final render.

### Inputs

- Customer animatic plan
- Partner animatic plan
- Motion and transition system
- Approved cards/screenshots/backgrounds

### Tasks

- Create motion prototypes for customer and partner videos.
- Verify transitions are motivated by app behavior or story causality.
- Test overlay readability.
- Test muted comprehension.
- Test crop behavior for 9:16, 1:1, and 16:9 if relevant.

### Outputs

- `09-video-motion/customer_motion_prototype_v1.*`
- `09-video-motion/partner_motion_prototype_v1.*`
- `qa/video_motion_prototype_qa_v1.md`
- Updated `CURRENT_STATE.md`

### Acceptance Criteria

- Motion feels cinematic and product-led, not slideshow-like.
- UI remains readable.
- Transitions answer "therefore," not merely "then."
- Customer and partner motion systems feel related but distinct.

### Agent Prompt

```text
You are executing Slice 11: Motion Prototype. Read all video animatic plans, creative spec motion rules, and CURRENT_STATE.md. Create motion prototypes only, not final videos. Verify muted comprehension, overlay readability, UI clarity, and transition motivation. Keep customer and partner videos distinct. Update CURRENT_STATE.md.
```

## Slice 12: Final Video Production And Export

### Goal

Produce final app preview video exports after the animatic and motion prototype have passed QA.

### Inputs

- Approved motion prototypes
- Approved screenshots/cards/backgrounds
- Sound/music direction
- Platform export requirements

### Tasks

- Produce final customer video.
- Produce final partner video.
- Add sound pass if music/SFX direction and licensing are resolved.
- Export platform variants.
- Run final visual, sound, muted, crop, compression, and product-truth QA.
- Create final video manifest.

### Outputs

- `10-video-exports/customer/`
- `10-video-exports/partner/`
- `11-final-exports/videos/`
- `11-final-exports/videos/video_export_manifest.md`
- `qa/video_final_qa_v1.md`
- Updated `CURRENT_STATE.md`

### Acceptance Criteria

- Final videos pass first-two-second and first-five-second tests.
- Videos tell stories and are not slideshows.
- Product proof is readable.
- Sound supports emotion, and muted playback still works.
- Platform crops do not break composition.
- Every claim maps to real product state.

### Agent Prompt

```text
You are executing Slice 12: Final Video Production And Export. Proceed only if customer and partner animatics and motion prototypes have passed QA. Produce final video exports, sound-enabled versions if licensed audio is available, muted-safe versions, platform variants, manifests, and final QA. Do not introduce new product claims or fake UI. Update CURRENT_STATE.md with final asset locations and any remaining launch blockers.
```

## Recommended Fresh-Agent Startup Prompt

Use the following prompt to start a new agent session.

```text
We are starting the goZaika store/video polish project in:

C:\venkat\limca\gozaika\sourcecode

This is a controlled, slice-based creative production project. Do not jump ahead and do not build final images or videos unless the current slice explicitly asks for that.

Read these files first:

1. project docs/gozaika_store_video_implementation_plan_v1.md
2. .codex-artifacts/gozaika-polish-v2/gozaika_store_and_video_design_spec_v1.md
3. .codex-artifacts/gozaika-polish-v2/CURRENT_STATE.md, if it exists

Important product structure:

- There are two separate apps:
  - Customer app: goZaika
  - Restaurant app: goZaika Partner
- Do not merge the apps into one listing, one card sequence, or one video story.
- The apps should feel like siblings in the same brand family, not the same product.

Working directory:

.codex-artifacts/gozaika-polish-v2/

Use that directory for generated assets, drafts, QA files, manifests, exports, and current-state tracking. Do not add broad .gitignore rules. .codex-artifacts is already ignored. Durable planning docs belong in project docs/.

Current task:

Start with Slice 0 unless CURRENT_STATE.md clearly says Slice 0 is complete. If Slice 0 is already complete, continue with the next recommended slice from CURRENT_STATE.md.

Rules:

- Read the implementation plan and creative spec before acting.
- Keep customer and partner work separate.
- Do not fabricate UI, product data, prices, restaurant names, QR codes, OTPs, order states, ratings, user counts, or claims.
- Do not use generated-image tools to create precise UI or UI text.
- Do not treat the old gozaika-polish-v1 assets as something to patch.
- Every slice must update .codex-artifacts/gozaika-polish-v2/CURRENT_STATE.md.
- At the end of your response, summarize what you completed, what files changed, what is blocked, and the exact next recommended slice.

If you are unsure whether to continue into a later slice, stop and ask. Quality and drift control matter more than speed.
```

## Stop Conditions

Stop and ask for user direction if:

- Partner screenshots are missing and the next task requires partner production.
- Product truth is unclear for payment, pickup verification, finance, ROI, compliance, or app-store claims.
- A requested asset would require fake UI or generated product data.
- The current slice would naturally expand into multiple later slices.
- Store platform requirements need current verification before upload/export.

## Final Quality Principle

The production question is never "How do we make this screenshot prettier?"

The production question is:

"What does this viewer need to believe in five seconds, and which real product state proves it for the correct app?"
