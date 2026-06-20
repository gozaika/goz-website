# goZaika Image Generation Scripts

This folder contains the review-gated image generation helper for the goZaika marketing asset set.

## Dry Run

Run this first. It makes no paid image calls.

```powershell
npm run image:dry-run
```

Optional live model validation, still no image generation:

```powershell
npm run image:dry-run:live
```

`image:dry-run:live` requires `OPENAI_API_KEY` in your environment or `.env.local`.

## First Paid Milestone: P0 Square

After the dry run looks good:

```powershell
npm run image:p0-square
```

This generates six square P0 hero candidates, writes raw PNGs, saves metadata, and creates an HTML contact sheet under:

```text
.codex-artifacts/gozaika-images/working/contact-sheets/p0-square.html
```

Review those candidates before generating portrait or any P1/P2 assets.

## Second Paid Milestone: P0 Portrait

Only after the square direction is selected:

```powershell
npm run image:p0-portrait
```

This generates four dedicated `1024x1536` portrait candidates through the
Images edit/reference endpoint. It uploads:

```text
.codex-artifacts/gozaika-images/masters/anchors/master-style-anchor-clean.png
```

The clean square is a high-fidelity visual reference, not a crop template. The
portrait prompt requests a new native vertical composition and keeps the gold
tab, bag face, and hanging tag blank. Apply `icons/flame.svg` and
`icons/gozaika-logo.svg` deterministically only after selecting the portrait
winner.

After selecting a portrait candidate, copy it to the master system as the clean
portrait and run:

```powershell
node scripts/gozaika-images/compose-p0-master.mjs
```

This applies the canonical SVG logo and BAM flame-drop deterministically. The
image model is never trusted to redraw either brand asset.

Candidate PNGs and contact sheets live under `working/` and may be deleted after
selection. Locked masters, prompts, the manifest, and the API usage log live in
their own durable folders.

## Safety

- The script refuses paid calls unless the command includes `--yes-paid`.
- The script validates the configured model before paid calls.
- Existing candidate files are skipped by default.
- Use `--force` only when you intentionally want to regenerate.
- The script never logs `OPENAI_API_KEY`.
