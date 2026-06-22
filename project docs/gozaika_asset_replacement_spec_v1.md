# goZaika Website Asset Replacement Specification v1

Version: 1.0
Date: 2026-06-19
Status: Implementation-ready; paid generation remains review-gated.

## 1. Objective

Replace the remaining placeholder-grade website imagery with one coherent,
launch-quality visual system derived from the approved hero masters.

The definitive generation reference is:

`/.codex-artifacts/gozaika-images/masters/anchors/master-style-anchor-clean.png`

Canonical brand geometry remains:

- `icons/gozaika-logo.svg`
- `icons/flame.svg` — the BAM flame-drop mark, including its exact negative-space `BAM`

Image models create scenes and materials. They do not create final logos,
typography, QR codes, labels, or UI icons. Those elements are applied later by
deterministic composition.

## 2. Classification system

### Generated photography

Reference-guided raster scenes where lighting, environment, food culture, and
human atmosphere benefit from image generation. Outputs require candidate review
before any website wiring.

### Deterministic branded composition

Marketing graphics assembled from approved generated imagery, exact SVG brand
assets, controlled crops, and proofread text. Typography and brand marks are
never delegated to the image model.

### Retained vector UI art

Small functional icons and interface illustrations that must remain sharp,
accessible, lightweight, and predictable. These are refined as SVG/code, not
generated as raster imagery.

## 3. Inventory and disposition

| Priority | Asset family | Current files | Active use | Classification | Final target | Disposition |
| --- | --- | --- | --- | --- | --- | --- |
| Locked | Hero BAM Bag | `hero-bam-bag-v3.webp`, `hero-bam-bag-portrait-v3.webp` | Home hero and BAM Bag section | Generated photography with deterministic branding | Existing v3 masters | Keep; definitive visual anchors |
| Locked | Restaurant hero | `restaurant-hero-v1.svg`, `restaurant-hero-v2.svg` | Home restaurant teaser and `/for-restaurants` | Generated photography with deterministic branding | `restaurant-hero-v3.webp` | Candidate 03 selected; exact logo and BAM flame-drop applied; v3 wired |
| Locked | About / culture | `about-illustration-v1.svg`, `about-illustration-v2.svg` | `/about` | Generated photography with deterministic branding | `about-illustration-v3.webp` | Candidate 04 selected; exact logo and BAM flame-drop applied; v3 wired |
| Locked | Home OG card | `social/og-home-v1.svg`, `social/og-home-v2.svg` | Global metadata, home, insider, how-it-works, restaurant metadata | Deterministic branded composition | `social/og-home-v3.png`, 1200 x 630 | Composed from approved master; exact logo and proofread copy; v3 wired |
| Locked | Instagram cover | `social/instagram-cover-v1.svg`, `social/instagram-cover-v2.svg` | Marketing library; no live page reference | Deterministic branded composition | `social/instagram-cover-v3.png`, 1080 x 1350 | Composed from portrait master; exact logo/mark and Devanagari copy |
| Locked | LinkedIn banner | `social/linkedin-banner-v1.svg`, `social/linkedin-banner-v2.svg` | Marketing library; no live page reference | Generated photography with deterministic composition | `social/linkedin-banner-v3.png`, 1584 x 396 | Candidate 02 selected; exact logo, BAM flame-drop and proofread B2B copy applied |
| Locked | Profile avatar | `social/profile-avatar-v1.svg`, `social/profile-avatar-v2.svg` | Marketing library; no live page reference | Deterministic branded composition | `social/profile-avatar-v3.png`, 400 x 400 | Built from exact BAM flame-drop and controlled brand field; no AI call |
| Locked | WhatsApp icon | `social/whatsapp-icon-v1.svg`, `social/whatsapp-icon-v2.svg` | Marketing library; no live page reference | Deterministic branded composition | `social/whatsapp-icon-v3.png`, 500 x 500 | Built from exact BAM flame-drop and controlled brand field; no AI call |
| Locked | Browse step icon | `step-browse-v1.svg`, `step-browse-v2.svg` | Home and how-it-works flows | Retained vector UI art | `step-browse-v2.svg` | Visual QA passed; v1 removed |
| Locked | Claim/buy step icon | `step-buy-v1.svg`, `step-buy-v2.svg` | Home and how-it-works flows | Retained vector UI art | `step-buy-v2.svg` | Visual QA passed; v1 removed |
| Locked | Pickup step icon | `step-pickup-v1.svg`, `step-pickup-v2.svg` | Home and how-it-works flows | Retained vector UI art | `step-pickup-v2.svg` | Visual QA passed; v1 removed |
| Deleted | `working.svg` | `working.svg` | No live reference | Orphan | None | Removed during final cleanup |

The default Next/Vercel starter SVG files under `public/` are unused boilerplate,
not campaign assets. Remove them during the same final cleanup only after a
repository-wide reference check.

The structured-data logo defect found during inventory was corrected to use the
canonical horizontal logo that ships under `public/logos/`.

## 4. Priority and approval gates

### Gate 1 — Restaurant hero

Generate four 1536 x 1024 candidates. The chosen scene must:

- read as a premium restaurant acquisition surface, not a discount marketplace;
- preserve the approved kraft, brass, cream, forest, and deep-teal language;
- keep all packaging brand surfaces blank for deterministic post-production;
- work in both the home teaser and `/for-restaurants` page crop;
- contain no readable text, logos, QR codes, faces, malformed hands, or surplus cues.

Do not proceed to About generation until one candidate is approved or the user
explicitly elects to generate the next priority in parallel.

### Gate 2 — About / culture image

Generate four 1536 x 1024 candidates. The chosen scene must feel inclusive,
Hyderabad-rooted, generous, and editorial without becoming landmark tourism,
stock photography, or sentimental advertising.

### Gate 3 — OG and social system

1. Compose OG and Instagram assets from approved masters without paid generation.
2. Generate only the clean LinkedIn B2B background candidates.
3. After selection, apply exact logo, BAM flame-drop, crop, and text layers.
4. Create avatar and WhatsApp assets entirely deterministically.

Required text remains live/proofread during composition:

- `Great food. No menu. No algorithm.`
- `BAM!`
- `बड़ा ज़ायका, आएगा मज़ा`
- `A customer-acquisition channel for premium kitchens.`

### Gate 4 — Supporting illustrations

Review the three v2 step icons together at their actual 40 px rendered size.
Retain them unless a concrete accessibility or comprehension issue is found.
If changed, edit the SVG geometry directly and preserve a single visual family.

## 5. Asset production rules

- Use `gpt-image-2`, quality `high`, through the configured and validated model id.
- Every generated P1/P2 scene uses the clean square anchor as a reference image.
- Generate one candidate per request; candidate counts are explicit in the manifest.
- Keep important text and all canonical geometry out of generation prompts.
- Preserve large safe zones for responsive crops and later copy overlays.
- Save raw candidates only under `.codex-artifacts/gozaika-images/working/`.
- Save prompts, manifest snapshots, and API usage under `generation/`.
- Save only approved clean and branded masters under `masters/`.
- Never wire a candidate directly into an application.
- Never overwrite an approved production asset before review.

## 6. Machine-readable source of truth

The executable inventory and prompts live in:

`scripts/gozaika-images/asset-replacement-manifest.json`

The runner is:

`scripts/gozaika-images/generate-asset-set.mjs`

The manifest owns priority, classification, candidate count, dimensions, prompt,
reference anchor, intended output, existing placeholders, and live references.

## 7. Execution sequence

```powershell
npm.cmd run image:assets:dry-run
npm.cmd run image:assets:list
npm.cmd run image:assets:restaurant
```

The first two commands are free. The restaurant command is paid and includes the
explicit paid-operation gate. After candidate review, proceed with:

```powershell
npm.cmd run image:assets:about
npm.cmd run image:assets:social
```

`image:assets:social` generates only the LinkedIn background candidates. OG,
Instagram, avatar, and WhatsApp composition happens after the scene approval gate.

## 8. Final integration checklist

- Export restaurant/about as WebP at their intended display ratio.
- Export OG/social previews as raster PNG.
- Update every metadata reference from v1/v2 SVG to the approved raster v3.
- Update width, height, sizes, and alt text in consuming components.
- Remove obsolete v1/v2 files only after repository-wide reference validation.
- Run website lint, TypeScript, production build, and responsive visual QA.
- Re-open all social outputs at exact target dimensions and proofread every glyph.
- Clean `.codex-artifacts/gozaika-images/working/` after selections are locked.
