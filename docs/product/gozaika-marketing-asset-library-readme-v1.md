# goZaika Finalized Marketing Asset Library

Version: 1.0  
Assembled: 2026-06-21

This library is a distribution copy of approved assets. The source repository remains authoritative; use `manifest.json` for provenance and hashes.

## Rules

- `brand/` contains exact deterministic vector geometry. Never redraw these files with an image model.
- `photography/` contains approved branded masters and delivery WebP exports.
- `generation-anchors/` contains clean, unbranded references for future image generation. Generate scenes from these and apply branding afterward.
- `social/` contains final deterministic marketing compositions.
- `ui/` contains retained vector interface illustrations; these are not photographic generation references.
- `mobile/` contains customer/partner launcher, adaptive, notification, splash, and truthful product-fallback masters.
- `specifications/` contains the controlling agent briefs for the next mobile-identity and restaurant-sales-kit projects.
- Do not overwrite released files. Add a new version and update `manifest.json`.

The canonical mark name is **BAM flame-drop mark**. Its internal negative-space `BAM` is part of the geometry.

## Source of truth

The canonical logo and mark live at `sourcecode/icons/`. Approved visual masters live at `sourcecode/.codex-artifacts/gozaika-images/masters/`, and website delivery copies live at `sourcecode/apps/website/public/`.

## Generation rule

Image generation supplies only clean photography/illustration backgrounds. Logos, BAM flame-drop geometry, typography, labels, QR codes, metrics, URLs, and partner details are deterministic post-production layers.
