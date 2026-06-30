# Task B/C Inventory And Rebaseline Plan

Status: pending owner sign-off before mass file moves or archive operations  
Date: 2026-06-30  
Branch: `codex/docs-marketing-rebaseline-bc`

## Purpose

Task B and Task C are intentionally coupled: the repo has enough documentation
and marketing/store-asset history that moving files without a target map would
create drift. This plan is the required sign-off artifact before consolidation.

## Current Roots

| Path | Current role | Decision | Reason |
| --- | --- | --- | --- |
| `project docs/` | Canonical business, strategy, technical specs, web/mobile plans, store/video plans, handoff | Merge into `docs/` target tree, then archive only superseded versions | It is a canonical source today, but the space-containing folder is hard to discover and overlaps with `docs/`. |
| `project docs/archived/` | Old Word specs and critiques | Move to `docs/archived/project-docs/` | Keep history without leaving a second archive convention. |
| `docs/` | Operational docs, product specs, runbooks, ADRs, testing, web/mobile ledgers | Keep as canonical root | It already matches the repo's engineering convention and is referenced by CI/handoffs. |
| `.codex-artifacts/` | Ignored build/evidence tree with some live planning/control docs | Split source from output | Source/control docs move into tracked `marketing-source/`; generated evidence stays ignored under `.codex-artifacts/`. |
| `marketing-source/restaurant-sales-kit/` | Existing scripted source project for sales collateral | Keep in place | This is the pattern to mirror for store/video source. |
| `store-assets/` | Tracked produced store cards, screenshots, first-cut videos | Move under new marketing project as tracked deliverables | These are versioned deliverables, not repo-root source. |
| `scripts/store-cards/` | Scripted card renderer | Move under new marketing project scripts | Source for store deliverables should sit with the project home. |
| `scripts/store-video/` | ffmpeg/static-frame preview video pipeline | Archive under new marketing project as legacy fallback | Owner direction is to move off ffmpeg/static slideshow, but keep history. |
| `scripts/store-launch/` | Store validation/capture/release utility scripts | Move under new marketing project scripts | Belongs with app/play-store readiness source. |
| `.codex-artifacts/gozaika-polish-v2/` | Store/video control docs, design spec, inventories, prompt packs, QA evidence | Move source docs to tracked marketing project; leave generated evidence ignored | `CURRENT_STATE.md` and specs are live source, but screenshots/build evidence should remain artifacts. |
| `.codex-artifacts/gozaika-store-launch/` | Store launch package, reviewer notes, screenshots, release evidence | Move reviewer/release/source markdown/json into tracked marketing project; leave raw screenshots/evidence ignored or documented | Source truth should survive artifact cleanup; bulky generated screenshots remain output. |
| `.codex-artifacts/gozaika-marketing-videos/` | Earlier video storyboards, captions, manifests, raw clips/screenshots/logs | Move storyboards/captions/manifests into tracked marketing project; leave raw/log outputs ignored | These are the seed for the scripted capture pipeline. |

## Detailed Doc Inventory

| Path or group | Decision | Notes |
| --- | --- | --- |
| `project docs/gozaika_handoff_v1.md` | Keep, then move to `docs/handoff/gozaika_handoff_v1.md` | Primary anti-drift index; update all read-first links after moves. |
| `project docs/goZaika_Technology_Specification_v4.md` | Keep, move to `docs/strategy/technology-specification-v4.md` | Current technical spec of record. |
| `project docs/claude_goZaika_Master_Business_Document_v4.docx` | Keep, move to `docs/strategy/business/master-business-document-v4.docx` | Current business doc. |
| `project docs/claude_goZaika_Master_Business_Document_v3.docx` | Archive | Superseded by v4. |
| `project docs/critique business model.docx` | Archive | Historical critique; not a canonical runbook/spec. |
| `project docs/goZaika_Strategic_Analysis_v1.md`, `goZaika_Strategic_Sounding_Board_QA_v1.md`, `goZaika_Feature_Planning.md` | Keep, move to `docs/strategy/` | Strategy/product-planning context. |
| `project docs/gozaika_customer_mobile_technical_spec_v1.md`, `gozaika_restaurant_mobile_technical_spec_v1.md`, `gozaika_mobile_shared_architecture_and_release_spec_v1.md` | Keep, move to `docs/mobile/specs/` | Mobile canonical specs. |
| `project docs/gozaika_mobile_implementation_plan_v1.md` | Keep, move to `docs/mobile/plans/` | Large completed slice tracker and historical prompts. |
| `project docs/gozaika_mobile_store_launch_readiness_plan_v1.md` | Merge into marketing project | This is now part of app/play-store assets, not general mobile engineering. |
| `project docs/gozaika_web_parity_spec_v1.md`, `gozaika_web_parity_implementation_plan_v1.md` | Keep, move to `docs/web/specs/` and `docs/web/plans/` | Web parity canonical docs; ledgers stay in `docs/web/`. |
| `project docs/gozaika_store_video_implementation_plan_v1.md`, `gozaika_marketing_video_capture_handoff_v1.md`, `gozaika_asset_replacement_spec_v1.md` | Merge into `marketing-source/app-store-video/specs/` | Source for the rebaselined marketing project. |
| `project docs/gozaika_image_generation_manifest_v1.md`, `gozaika_image_generation_prompt_pack_v1.md` | Move to `marketing-source/app-store-video/specs/background-generation/` | Keep as background/reference material only; generated UI remains forbidden. |
| `project docs/website_and_graphics_review_v4.md` | Move to `docs/product/brand-assets.md` appendix or archive after merge | Overlaps current product brand-assets doc. |
| `docs/product/*.md` | Keep in `docs/product/` | Product specs are already organized; only marketing-asset docs need relocation. |
| `docs/product/gozaika-marketing-asset-library-*` | Merge into `marketing-source/app-store-video/specs/asset-library/` | Marketing source, not product behavior spec. |
| `docs/product/gozaika-restaurant-sales-kit-spec-v1.md` | Keep or move to `marketing-source/restaurant-sales-kit/spec.md` | Belongs with existing restaurant-sales-kit project; low-risk move. |
| `docs/mobile/CONTINUE-HERE.md`, `mobile-parity-ledger.md`, `deploy-verification-checklist.md`, slice docs | Keep in `docs/mobile/`, add `docs/mobile/README.md` | These are active mobile handoff and verification docs. |
| `docs/mobile/overnight-*`, `slice12-remainder.md` | Archive under `docs/archived/mobile/` after verifying no read-first references | Superseded by current `CONTINUE-HERE.md`. |
| `docs/web/web-parity-ledger.md`, `web-parity-audit.md`, `w5-w7-autonomous-decisions.md` | Keep in `docs/web/`, add `docs/web/README.md` | Current web parity record and human-a11y open item. |
| `docs/testing/e2e-coverage-inventory.md` | Keep and update in Task B3 | It is the current coverage gap ledger. |
| `docs/store-video/store-video-parity-and-plan.md` | Merge into `marketing-source/app-store-video/CURRENT_STATE.md` and `README.md`, then archive pointer | This is the tracked companion to ignored polish-v2 docs. |
| `docs/runbooks/*.md` | Keep in `docs/runbooks/` | Operational guides are already well placed. |
| `docs/architecture/`, `docs/adr/` | Keep | Already canonical. |
| `docs/implementation-plan.md` | Archive after extracting still-current overview links | Large older plan overlaps current handoff/specs. |
| `docs/deployment-pipeline.md`, `docs/configuration-reference.md` | Keep in `docs/operations/` or root docs | Useful global operational references. |

## Target Documentation Tree

```text
docs/
  README.md                         # top-level read-first index
  handoff/
    gozaika_handoff_v1.md
  strategy/
    technology-specification-v4.md
    feature-planning.md
    strategic-analysis-v1.md
    strategic-sounding-board-qa-v1.md
    business/
      master-business-document-v4.docx
  product/
    README.md
    ...existing product specs...
  mobile/
    README.md
    CONTINUE-HERE.md
    specs/
    plans/
    ...current ledgers and verification docs...
  web/
    README.md
    web-parity-ledger.md
    web-parity-audit.md
    w5-w7-autonomous-decisions.md
    specs/
    plans/
  runbooks/
  testing/
  architecture/
  adr/
  operations/
    deployment-pipeline.md
    configuration-reference.md
  archived/
    README.md
    project-docs/
    mobile/
    store-video/
```

After moves, `project docs/` should either be removed if empty or replaced by a
short `README.md` pointer for one transition commit only. The final state should
avoid two active doc roots.

## Target Marketing Project Tree

```text
marketing-source/
  README.md
  restaurant-sales-kit/             # existing project, unchanged except optional local spec move
  app-store-video/
    README.md                       # one command map + source/output policy
    CURRENT_STATE.md                # tracked replacement for ignored polish-v2 current state
    specs/
      design-spec.md
      implementation-plan.md
      capture-handoff.md
      store-launch-readiness.md
      asset-replacement-spec.md
      background-generation/
      legacy-parity-review.md
    decisions/
      open-decisions.md             # naming, finance, demo IDs, typography, preview videos
    scripts/
      store-cards/
      store-launch/
      capture/
        playwright/
        maestro/
        manifest.schema.json
        capture-all.mjs
    assets/
      store/
        README.md
        cards/
        screenshots/
        video/
    storyboards/
    captions/
    manifests/
    archived/
      ffmpeg-static-preview/
        README.md
        build-video.mjs
        scenes.config.mjs
```

Output policy:

- Tracked source: scripts, specs, copy, captions, storyboards, manifest schemas,
  README/current-state files, and final curated deliverables that the owner wants
  versioned.
- Ignored output: raw recordings, transient screenshots, logs, local device
  evidence, frame folders, and any generated intermediate files. Use
  `.codex-artifacts/marketing-source/app-store-video/` for regenerated bulky
  evidence after the move.

## Task C Pipeline Direction

The rebaselined pipeline should be deterministic and script-based:

1. Use `docs/runbooks/demo-data.md` and `demo_prepare_for_demo(...)` to stage
   the same live cloud demo shape before captures. Do not fabricate UI states.
2. Use Playwright for web/portal/website captures with stable viewports and
   stored auth where possible.
3. Use Maestro for mobile journeys on the connected Android device. Device
   captures should be real app screens, not web fallbacks.
4. Replace the current ffmpeg/static screenshot video builder with a scripted
   composition lane. The exact renderer can be Remotion or a lightweight
   Playwright/canvas renderer, but it must consume real recordings/screenshots
   and captions/storyboards from tracked source.
5. Archive `scripts/store-video/` as `archived/ffmpeg-static-preview/`; keep it
   runnable only as a fallback preview, not the primary plan.

## Task B3 Coverage Plan

After documentation moves:

| Area | Planned update |
| --- | --- |
| `apps/consumer-web/tests` | Add or refresh smoke coverage for post-W7 holds pill and template-image fallback visibility if the seeded data can expose it. |
| `apps/restaurant-mgmt-web/tests` | Add template edit/upload shell smoke coverage that verifies the uploader is reachable on the edit path without needing to upload bytes in Playwright. |
| `apps/consumer-mobile/.maestro` | Add deterministic non-device-hard flows for follows/passport/reviews where selectors are stable. |
| `apps/restaurant-mobile/.maestro` | Add partner reviews / reports / lifecycle smoke flow if current connected device state is stable. |
| `docs/testing/e2e-coverage-inventory.md` | Update from old "no product web E2E" baseline to current W6/W7 product-web coverage and list remaining P1/P2 mobile flows. |

Device-dependent flows such as push-deep-link tap, GPS, offline mode, and full
store video recordings should remain in the batched device-verification checklist
unless the connected Android device is unlocked and seeded for the exact journey.

## Execution Slices After Sign-Off

1. **Docs consolidation commit**
   - Move docs into the target tree.
   - Add `docs/README.md`, folder READMEs, and archive index.
   - Update all read-first links in the handoff and ledgers.
   - Run `rg` for stale `project docs/` and old store-video paths.

2. **Marketing-source rebaseline commit**
   - Create `marketing-source/app-store-video/`.
   - Move tracked source docs/scripts/assets into it.
   - Move source portions of `.codex-artifacts` into tracked project files.
   - Archive legacy ffmpeg pipeline.
   - Add output policy and regenerated artifact paths.

3. **Scripted capture scaffold commit**
   - Add Playwright capture README/scripts and Maestro command map.
   - Add manifest schema for capture outputs.
   - Preserve raw outputs under ignored artifact paths.
   - Do a connected-device smoke only if the device is unlocked and the app state is stable.

4. **Coverage parity commit**
   - Add/refine the web/mobile tests named in Task B3.
   - Update `docs/testing/e2e-coverage-inventory.md`.
   - Run `node scripts/web-ci.mjs` and `node scripts/mobile-ci.mjs`.

## Sign-Off Needed

Please approve or revise these choices before mass moves:

- Collapse `project docs/` into `docs/` with `docs/handoff/`, `docs/strategy/`,
  `docs/mobile/specs`, and `docs/web/specs`.
- Make `marketing-source/app-store-video/` the single tracked home for store
  cards, app/play-store assets, storyboards, captions, and capture scripts.
- Move `store-assets/` under that project as tracked deliverables.
- Archive `scripts/store-video/` as a legacy static-preview pipeline and build
  the new capture/composition path from Playwright + Maestro sources.
