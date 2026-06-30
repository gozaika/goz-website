# goZaika Launch Asset Factory Implementation Plan

Status: supersedes the prior B/C marketing rebaseline plan where conflicts exist  
Source reviewed: `C:\venkat\limca\gozaika\goZaika Launch Asset Strategy & Technica.md`  
Date: 2026-06-30  
Branch: `codex/docs-marketing-rebaseline-bc`

## Executive Position

I concur with the strategy's core recommendation: goZaika should build a
script-driven launch asset factory, not continue a one-off store-card/video polish
project.

The right truth hierarchy is:

1. Real app state from seeded/demo data.
2. Real screenshots and recordings captured by Playwright and Maestro.
3. Deterministic static composition and Remotion motion.
4. Optional AI image editing only for protected background/atmosphere passes.

This is the best way to avoid fake UI, fake claims, unreadable app-store assets,
and drift between website, app stores, partner sales, social, and tradeshow
materials.

## Agreements

- Real UI must be the truth layer. Generated UI is not acceptable for app-store or
  partner-proof assets.
- Playwright and Maestro are the right capture tools for the existing repo.
- Remotion is the right primary video engine because the stack is already
  React/Next/React Native oriented.
- ffmpeg remains useful for transcode/normalization, but should not be the
  creative video engine.
- AI image generation/editing should be background-only and mask-protected.
- Scenario manifests are the correct abstraction. Every asset should trace back
  to a scenario, persona, app state, and source capture.
- QA must be automated: dimensions, banned words, traceability, duration, file
  existence, black frames, and copy lint.
- The consumer and restaurant/partner stories must remain separate.
- The asset system should support website, app stores, social, partner sales,
  investor/tradeshow, and print from the same scenario/capture base.

## Disagreements And Alternative Recommendations

| Strategy item | Concern | Recommendation |
| --- | --- | --- |
| Create a new `@gozaika/brand` package with raw hex tokens | The repo already has `@gozaika/design-tokens`, `@gozaika/ui`, and gate-enforced token rules. A second brand-token package risks drift. | Extend `@gozaika/design-tokens` with marketing-safe helpers if needed, or create `@gozaika/marketing-brand` that imports from design tokens rather than redefining hex values. |
| Use app name `restaurant-staff-mobile` | Current repo app is `apps/restaurant-mobile`; store name is `goZaika Partner`. | Use `restaurant-mobile` / `goZaika Partner` consistently. If staff-only scenes are needed, model them as scenarios/roles, not a new app identity. |
| Build five new packages immediately | Package sprawl before first assets could slow delivery. | Start with `marketing-assets/src/*` modules, then extract to packages only once APIs stabilize. Create at most two packages up front: `@gozaika/demo-scenarios` and `@gozaika/asset-factory`, unless reuse pressure proves otherwise. |
| Make `assets:all` capture mobile, render static, render video, and QA in one command from day one | Full end-to-end mobile capture is fragile, especially with a physical Android device and app auth state. | Provide `assets:all` eventually, but first ship reliable lane-specific commands: web capture, mobile flow generation, normalize, compose static, render one Remotion loop, QA. |
| Treat AI image editing as part of the first implementation wave | This adds model keys, masks, human-review policy, and artifact tracking before the deterministic path proves itself. | Defer AI editing until deterministic capture/composition/video works and QA reports exist. Add the interface early only if cheap, but keep it disabled by default. |
| Generate QR pickup visuals as a priority | Existing product may use SMS pickup-code proof and QR/OTP paths vary by app/screen. Fake QR is explicitly forbidden. | Capture whichever pickup-proof UI actually exists today. Use "pickup proof" generically unless a real QR screen is present and safe. |
| Site review includes current gozaika.in copy issues | This is valuable but not directly covered by repo asset factory unless site source contains those strings. | Add a first slice to audit/fix website copy leaks and footer-year inconsistency in repo if present; otherwise record as external-site task. |
| Use `marketing-assets/` for everything | Good clean-start name, but outputs and source need separation to keep git sane. | Use `marketing-assets/` as the single project home with `src/`, `scenarios/`, `briefs/`, `exports/`, `qa-reports/`, and `.gitignore` for bulky generated raw/intermediate outputs. |

## Clean-Start Archive Policy

The new strategy should reduce ambiguity aggressively:

- Archive old store/video planning docs that describe the ffmpeg/static-card path.
- Archive current `.codex-artifacts/gozaika-polish-v2`, `.codex-artifacts/gozaika-store-launch`,
  and `.codex-artifacts/gozaika-marketing-videos` source documents after extracting only reusable
  scenario/caption facts.
- Archive old tracked `store-assets/` cards/videos as historical v1 deliverables.
- Archive `scripts/store-video/` as legacy static-preview tooling.
- Archive `scripts/store-cards/` once the new compositor can regenerate equivalent examples.
- Keep only docs/assets that directly support the new scenario-driven factory.

Suggested archive target:

```text
docs/archived/launch-assets-pre-factory/
  README.md
  old-plans/
  old-store-assets-index.md
  legacy-ffmpeg-static-preview/
```

Bulky generated images/video should not be moved into `docs/archived`; leave them
tracked only if already tracked and needed for historical comparison, otherwise move
or regenerate through the new system.

## Target Tree

```text
marketing-assets/
  README.md
  .gitignore
  briefs/
    launch-asset-strategy.md
    ai-prompts/
  scenarios/
    consumer-claim-bawarchi.yaml
    consumer-map-discovery.yaml
    consumer-allergen-trust.yaml
    consumer-passport-swaad-club.yaml
    restaurant-publish-drop.yaml
    restaurant-live-pickup-queue.yaml
    restaurant-zaikaiq-overview.yaml
    staff-pickup-proof.yaml
  src/
    brand/
    scenarios/
    capture/
      playwright/
      maestro/
      normalize/
    compositor/
      templates/
      qa/
    motion/
      remotion/
  scripts/
    prepare-demo.ps1
    capture-web.ps1
    capture-mobile.ps1
    compose-static.ps1
    render-video.ps1
    qa-assets.ps1
  captures/
    raw/                 # ignored
    normalized/          # ignored unless curated
  composites/
    website/
    app-store/
    restaurant/
    tradeshow/
  videos/
    website/
    app-store/
    social/
    tradeshow/
  manifests/
    export-presets.json
    asset-catalog.json
  qa-reports/
```

The existing `marketing-source/restaurant-sales-kit/` can remain as a separate
project for now, but the current root-level `marketing-source/` should not become
the new app-store/video home. The new strategy uses `marketing-assets/`; use that.

## Implementation Slices

### Slice 0: Archive And Source-Of-Truth Reset

Goal: remove ambiguity before new work starts.

Tasks:

- Add `marketing-assets/briefs/launch-asset-strategy.md` as the tracked copy of
  the reviewed external strategy.
- Add `marketing-assets/README.md` with "this supersedes old polish/store-video
  docs" language.
- Create `docs/archived/launch-assets-pre-factory/README.md`.
- Archive or pointer-replace old tracked docs:
  - `docs/store-video/store-video-parity-and-plan.md`
  - `docs/planning/task-bc-doc-inventory-and-marketing-rebaseline-plan.md`
  - marketing-specific `project docs/gozaika_*store*`, `*marketing_video*`,
    `*asset_replacement*`, and image-generation docs after extracting useful
    facts into the new README/briefs.
- Archive `scripts/store-video/` as legacy.
- Mark `store-assets/` as historical v1 deliverables and move or pointer it
  according to git-size tolerance.
- Do not delete `.codex-artifacts` evidence; create an archive manifest and stop
  referencing it as source truth.

Acceptance:

- A fresh agent sees only one active launch-asset source: `marketing-assets/README.md`.
- Old launch-asset docs have explicit archive/read-only status.
- No app gates break.

### Slice 1: Scenario And Copy-Lint Foundation

Goal: define reproducible asset truth as data.

Tasks:

- Add scenario schema and loader.
- Add the first eight YAML scenarios from the strategy.
- Add copy-lint rules based on existing banned-copy gates plus launch-specific
  consumer/restaurant term separation.
- Add export presets and asset catalog schema.
- Add unit tests for scenario validation and copy lint.

Acceptance:

- Invalid scenarios fail with actionable errors.
- Consumer banned words are caught.
- Scenario IDs map to planned website/app-store/restaurant/tradeshow outputs.

### Slice 2: Web Capture And Normalization

Goal: produce deterministic web captures without mobile-device fragility.

Tasks:

- Add Playwright capture runner for website, consumer web, and restaurant web.
- Add viewport presets.
- Add auth-state documentation and safe demo credential handling.
- Add screenshot metadata sidecars with hash, scenario ID, route, viewport, and
  source commit.
- Add normalization: crop, resize, metadata, mask hooks.

Acceptance:

- At least two web scenarios capture and normalize screenshots.
- Metadata traces each output to source scenario and route.

### Slice 3: Mobile Flow Generation And Android Capture Smoke

Goal: wire Maestro to the connected Android device, without making the whole
pipeline brittle.

Tasks:

- Generate Maestro flows from scenario YAML or maintain scenario-linked Maestro
  flows.
- Add `capture-mobile.ps1` that checks `adb devices`, installed package IDs, and
  Maestro availability.
- Run one connected-device smoke for an already stable customer or partner flow.
- Store raw output under ignored `marketing-assets/captures/raw/`.

Acceptance:

- Connected Android device capture path is documented and smoke-tested.
- If device state blocks capture, failure is actionable and does not block web/static work.

### Slice 4: Static Compositor

Goal: generate high-polish static assets from real captures.

Tasks:

- Implement first templates:
  - app-store card
  - website hero proof card
  - restaurant proof card
  - ZaikaIQ preview card
  - tradeshow poster
- Render with Playwright/HTML/CSS and Sharp where useful.
- Use design tokens from existing packages.
- Generate at least 8 app-store-style graphics and 3 website/restaurant graphics.

Acceptance:

- Outputs are real PNGs in correct dimensions.
- All outputs link to scenario/source screenshot metadata.
- Text safe margins are checked.

### Slice 5: Remotion Motion Foundation

Goal: produce the first real launch loops.

Tasks:

- Add Remotion app under `marketing-assets/src/motion/remotion`.
- Implement:
  - ConsumerClaimLoop
  - RestaurantOpsLoop
  - ZaikaIQLoop
- Add render presets for website hero, vertical social, app preview portrait.
- Add poster-frame export.

Acceptance:

- At least three MP4 loops render.
- Duration/dimension checks pass.
- UI screenshots remain real and readable.

### Slice 6: QA And Asset Catalog

Goal: make the system safe enough for high-visibility iteration.

Tasks:

- Add QA runner for file existence, dimensions, file-size thresholds, banned
  copy, metadata traceability, duration, and black-frame checks.
- Generate Markdown QA report.
- Generate `manifests/asset-catalog.json`.
- Update `marketing-assets/README.md` with exact commands.

Acceptance:

- `npm run assets:qa` creates a report.
- Every generated asset has traceability metadata.
- The README tells a fresh agent how to regenerate the full set.

### Slice 7: AI Image Editing Interface, Disabled By Default

Goal: add controlled beauty-pass capability only after deterministic output works.

Tasks:

- Add image-edit interface with mask requirement.
- Save prompts and source/output hashes.
- Add protected-UI policy and human-review status.
- Do not run paid/model-backed generation unless explicitly approved.

Acceptance:

- Interface exists but deterministic pipeline remains primary.
- AI cannot alter UI regions by default.

## Root Scripts To Add

Prefer Windows-friendly `npm.cmd`/PowerShell wrappers:

```json
{
  "assets:prepare-demo": "powershell -NoProfile -ExecutionPolicy Bypass -File marketing-assets/scripts/prepare-demo.ps1",
  "assets:capture:web": "tsx marketing-assets/src/capture/playwright/capture-web.ts",
  "assets:capture:mobile": "powershell -NoProfile -ExecutionPolicy Bypass -File marketing-assets/scripts/capture-mobile.ps1",
  "assets:normalize": "tsx marketing-assets/src/capture/normalize/normalize-all.ts",
  "assets:compose:static": "tsx marketing-assets/src/compositor/render-static-assets.ts",
  "assets:render:video": "tsx marketing-assets/src/motion/remotion/render.ts",
  "assets:qa": "tsx marketing-assets/src/compositor/qa/run-qa.ts",
  "assets:all": "npm run assets:prepare-demo && npm run assets:capture:web -- --all && npm run assets:normalize && npm run assets:compose:static -- --all && npm run assets:render:video -- --all && npm run assets:qa"
}
```

`assets:all` should be allowed to skip mobile capture with an explicit
`--skip-mobile` or device-unavailable report until Android capture is stable.

## First Asset Priorities

1. Website copy leak/footer consistency audit and fixes if source contains the
   live issues.
2. Consumer hero loop: map -> premium drop -> allergen-disclosed claim -> pickup proof.
3. Restaurant hero loop: publish drop -> claims fill -> pickup proof -> analytics.
4. Static app-store screenshot system for customer first.
5. Restaurant proof visuals, especially dashboard/queue/ZaikaIQ.
6. Safety/trust visuals.
7. Tradeshow loop.
8. AI background beauty pass only after the above is deterministic.

## Verification Gates

Run after each implementation slice:

- `node scripts/web-ci.mjs --fast` for source-only/scaffold changes.
- `node scripts/web-ci.mjs` after changes touching web routes/tests/capture servers.
- `node scripts/mobile-ci.mjs` after any mobile/Maestro/scenario change that touches
  mobile code or drift scans.
- New asset-factory tests once added.
- Connected Android smoke only for the mobile-capture slice and later mobile asset runs.

## Stop Conditions

Stop and ask before proceeding if:

- A scenario requires UI state that does not exist.
- A generated asset would need fake UI, fake QR, fake OTP, fake restaurant data, or
  unapproved finance/revenue claims.
- The Android device is locked/unavailable and the task is specifically mobile capture.
- External AI image generation or paid API calls are needed.
- Store-platform requirements must be verified live before final upload.
