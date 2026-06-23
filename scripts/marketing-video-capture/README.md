# scripts/marketing-video-capture

Tooling for the goZaika marketing video capture package. Artifacts (storyboards, captions,
raw clips, screenshots, manifest) live under `.codex-artifacts/gozaika-marketing-videos/`.
Full handoff notes: `.codex-artifacts/gozaika-marketing-videos/README.md`.

## Files

| File | Purpose |
|---|---|
| `capture-all.mjs` | Entry point (`npm run video:capture:marketing`). Validates tooling, seeds, runs web captures, prints the Maestro commands for native captures, regenerates the manifest. |
| `capture-playwright.mjs` | Runs the web (Playwright) capture specs (C onboarding, D management) into the artifact dir; refreshes the manifest. |
| `validate-captions.mjs` | Validates the 4 caption JSON files against the §4 contract + brand rules (forbidden words, `goZaika` casing, unique IDs, overlay length). |
| `generate-manifest.mjs` | Builds `manifest.json` from captions + whatever raw clips/stills exist (ingests manually-placed mobile `.mp4`s). |
| `manifest.schema.json` | JSON Schema (draft-07) for `manifest.json`. |

## Common commands

```bash
node scripts/marketing-video-capture/validate-captions.mjs            # lint captions
npm run db:seed:marketing-videos                                      # deterministic demo data (local db)
npm run db:seed:marketing-videos -- --overlay-only                    # fast re-pin of hero/counter only
node scripts/marketing-video-capture/capture-playwright.mjs --all     # web captures (servers must be up)
node scripts/marketing-video-capture/generate-manifest.mjs            # rebuild manifest
npm run video:capture:marketing -- --all                              # the whole pipeline
```

## Notes

- The seed targets the **local Supabase container** directly (docker `psql`); no service keys,
  never cloud. It refuses to run without a local `supabase_db_*` container.
- Web capture needs the relevant Next.js server up and pointed at LOCAL Supabase
  (`npx supabase status -o env`). Default ports: mgmt-web `:3001`, admin-web `:3002`.
- Native (Maestro) capture needs a connected device/emulator + `JAVA_HOME`; `capture-all.mjs`
  prints the exact `maestro test` / `maestro record` commands rather than driving the device.
- Playwright records `.webm`; Maestro records `.mp4`. The manifest tracks whichever exists and
  marks per-scene capture status (`ready` / `partial` / `pending`).
