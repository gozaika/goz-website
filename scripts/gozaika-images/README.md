# goZaika Image Production

The approved P0 square and portrait heroes are locked. Remaining website and
social assets are controlled by:

- `asset-replacement-manifest.json` — executable inventory, classification,
  prompts, priorities, outputs and review gates.
- `generate-asset-set.mjs` — dry-run-first reference-generation runner.
- `compose-p0-master.mjs` — deterministic canonical branding for the locked P0
  portrait master.
- `compose-restaurant-master.mjs` — deterministic canonical branding for the
  locked restaurant hero candidate 03.
- `compose-about-master.mjs` — deterministic canonical branding for the locked
  About/culture candidate 04.
- `generate-images.mjs` — archived P0 candidate workflow retained only for
  provenance/reproduction.

The detailed production contract is:

`project docs/gozaika_asset_replacement_spec_v1.md`

## Free validation

```powershell
npm.cmd run image:assets:list
npm.cmd run image:assets:dry-run
```

Optional live model-access validation makes no image-generation call but does
require `OPENAI_API_KEY`:

```powershell
npm.cmd run image:assets:dry-run:live
```

## Paid review gates

Run one priority at a time and review its contact sheet before continuing:

```powershell
npm.cmd run image:assets:restaurant
npm.cmd run image:assets:about
npm.cmd run image:assets:social
```

The social command makes paid calls only for LinkedIn background candidates.
OG, Instagram, profile-avatar and WhatsApp assets are deterministic composition
jobs and therefore produce no paid generation calls.

Do not use `image:assets:all` for normal production. It exists for controlled
reproduction after all individual directions have already been approved.

## Output hygiene

- Candidates and contact sheets: `.codex-artifacts/gozaika-images/working/`
- Prompt and manifest snapshots: `.codex-artifacts/gozaika-images/generation/`
- Approved masters only: `.codex-artifacts/gozaika-images/masters/`

Delete `working/` after selections are locked. Never wire a candidate directly
into an application.

## Safety

- Paid calls require `--yes-paid`.
- The configured model is validated before paid execution.
- Existing candidates are skipped unless `--force` is supplied.
- API keys are never written to logs or manifests.
- The image model never renders the final logo, BAM flame-drop, QR, label or
  marketing typography.
