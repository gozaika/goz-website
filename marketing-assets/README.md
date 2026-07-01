# goZaika Marketing Assets

Status: active workspace for launch stills, store assets, and website/app video loops.

## Source Of Truth

Use this workspace together with:

- `docs/planning/launch-asset-factory-implementation-plan.md`
- `marketing-assets/creative-review.md`
- The external owner-approved launch asset strategy document at the repo parent.

The old store/video plans, first-cut cards, ffmpeg video scripts, and legacy generated artifacts are
archived under `docs/archived/launch-assets-pre-factory/` and must not drive new work.

## Workflow

1. Capture deterministic product proof from real app screens.
2. Compose premium still assets with device mockups, brand tokens, shadows, gradients, and curated
   AI-enhanced backgrounds that never alter UI screenshots or product claims.
3. Run the creative review checklist for v1 functional, v2 visually polished, and v3 launch-grade.
4. Move only approved, launch-grade outputs into final asset folders.
5. Build Remotion templates only after the still-image quality bar is visible and accepted.

## Slice 1 Foundation

The first active factory contract lives in:

- `marketing-assets/scenarios/*.yaml` - scenario truth, capture intent, copy boundary, planned outputs.
- `marketing-assets/manifests/export-presets.json` - output dimensions and safe-margin presets.
- `marketing-assets/manifests/asset-catalog.json` - planned asset IDs mapped back to scenarios.
- `marketing-assets/src/scenarios/` - schema, loader, copy lint, and validation CLI.
- `marketing-assets/src/capture/` - web capture target planning, Playwright capture, and Sharp normalization.
- `marketing-assets/src/compositor/` - deterministic static composition with protected UI regions.
- `marketing-assets/flows/maestro/` - scenario-linked mobile smoke flows for Maestro.

Run:

```bash
npm run assets:validate
npm run assets:test
```

Starter scenarios:

- `consumer-claim-bawarchi`
- `consumer-map-discovery`
- `consumer-allergen-trust`
- `consumer-passport-swaad-club`
- `restaurant-publish-drop`
- `restaurant-live-pickup-queue`
- `restaurant-zaikaiq-overview`
- `staff-pickup-proof`

## Web Capture Lane

Run the relevant app server first, then capture active web targets:

```bash
npm run assets:capture:web -- --app consumer-web --base-url http://localhost:3000
npm run assets:capture:web -- --app restaurant-web --base-url http://localhost:3001 --storage-state marketing-assets/auth/restaurant-web.storage.json
npm run assets:normalize
```

Defaults:

- Website and consumer web default to `http://localhost:3000`.
- Restaurant web defaults to `http://localhost:3001`.
- Raw screenshots and sidecars are written under ignored `marketing-assets/captures/raw/`.
- Normalized screenshots and trace sidecars are written under ignored `marketing-assets/captures/normalized/`.

Partner portal captures require a real authenticated Playwright storage-state file. If a protected
route redirects to auth, the capture command fails and tells you to provide `--storage-state`.

## Mobile Capture Lane

Mobile capture uses checked-in Maestro smoke flows plus an Android preflight script:

```bash
npm run assets:capture:mobile -- -App consumer-mobile -Flow consumer-map-discovery -PreflightOnly
npm run assets:capture:mobile -- -App consumer-mobile -Flow consumer-map-discovery
```

The runner checks:

- `adb` is available.
- Exactly one Android device is connected.
- The device is unlocked.
- The real package ID is installed: `in.gozaika.customer` or `in.gozaika.restaurant`.
- Maestro is available unless `-SkipMaestro` is passed.

Raw mobile screenshots, Maestro logs, and JSON sidecars are written under ignored
`marketing-assets/captures/raw/mobile/`. If the device is locked, the app is not installed, or the
flow is missing, the command fails before writing evidence.

## Static Compositor Lane

Compose a v1 functional still only after a real source screenshot exists:

```bash
npm run assets:compose:static -- --asset app-store-map-card --pass v1-functional
```

Outputs:

- PNG and metadata under `marketing-assets/composites/`.
- Creative review records under `marketing-assets/creative-reviews/`.
- AI background briefs in output metadata. These are prompt contracts only; no external image
  generation is run by this command.

The compositor preserves the screenshot as a protected UI region and records a blocker whenever the
source proof should not be promoted to launch-grade.

## Guardrails

- Real screenshots are the product truth.
- AI can enrich backgrounds, lighting, and mood only outside protected UI masks.
- No fabricated restaurants, product states, prices, QR codes, OTPs, review counts, revenue claims,
  ratings, customer counts, or order states.
- Keep customer-facing and restaurant-facing copy separated.
- Prefer fewer stronger frames over many average frames.
