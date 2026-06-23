# scripts/store-launch

Code-side tooling for the goZaika mobile store-readiness package. Companion to
`project docs/gozaika_mobile_store_launch_readiness_plan_v1.md`. Outputs land in
`.codex-artifacts/gozaika-store-launch/`.

## Scripts

| Script | Purpose |
| --- | --- |
| `capture-store-screenshots.mjs` | Grab the current Android foreground frame via `adb screencap` into a named store slot. Operator/Maestro-driven (navigate, then capture). |
| `validate-store-assets.mjs` | Validate raw screenshots (dims/aspect), icon masters (size/alpha), and banned words in reviewer/copy text. |
| `manifest.schema.json` | JSON Schema for `.codex-artifacts/gozaika-store-launch/manifest.json`. |

## Commands

```bash
# Validate the current asset package (warnings expected pre-polish)
node scripts/store-launch/validate-store-assets.mjs --all
npm run store:validate:assets            # same, via package script

# Capture native store screenshots (device/emulator connected)
node scripts/store-launch/capture-store-screenshots.mjs --list
node scripts/store-launch/capture-store-screenshots.mjs --app gozaika-partner --interactive
node scripts/store-launch/capture-store-screenshots.mjs --app gozaika --slot 06-orders
npm run store:capture:screenshots -- --app gozaika --slot 06-orders
```

## Capture prerequisites

1. Seed the demo data: `npm run db:seed:marketing-videos` (deterministic Hyderabad content;
   personas + IDs in `.codex-artifacts/gozaika-marketing-videos/seed/seed-output.json`).
2. Reviewer/test identities: see `.codex-artifacts/gozaika-store-launch/reviewer/test-accounts.json`.
3. **Customer app: build a `preview`/`production` client, not the Expo dev client** — the dev
   client paints a floating gear over every frame (caveat C1). Partner dev-client frames are clean.
4. Connect one device/emulator (`adb devices`). Captures are device-resolution PNGs; Google
   Play wants ≤2:1 aspect, so 1080×2400 frames are cropped/padded to 1080×1920 in Codex's
   polish pass (caveat C2).

## Ownership

This directory + the raw package are the **source-code agent** lane (raw captures, seed/
reviewer data, EAS/QA evidence, caveats). **Codex** owns composing polished store
screenshots, store copy, privacy drafts, feature graphics, and the final Play Console review.
