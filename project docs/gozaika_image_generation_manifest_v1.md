# goZaika Image Generation Manifest v1

Version: 1.0
Date: 2026-06-16
Source prompt pack: `project docs/gozaika_image_generation_prompt_pack_v1.md`
Brand logo reference: `icons/gozaika-logo.svg`
BAM flame-drop reference: `icons/flame.svg`
Status: Planning only. Do not generate, edit, or wire assets until this manifest is approved.

## 1. Goal

Produce one coherent premium goZaika visual asset set for the website and social previews. The set should feel like one brand system: warm cream canvas, forest/deep-teal depth, restrained saffron/gold accents, sealed kraft BAM Bag, premium food-discovery mood, no discount/surplus cues.

Primary quality target: launch-grade brand assets, not just plausible AI images.

Core brand motif: the BAM flame-drop mark from `icons/flame.svg`. This mark is a creative bridge between flavor, drop mechanics, and the BAM phrase. It should gradually teach customers that the flame/drop silhouette means a goZaika flavor discovery, not surplus food. This convention is now documented in `docs/product/brand-assets.md`.

## 2. Recommendation

Use a scripted, review-gated OpenAI Images API workflow rather than generating the whole pack inside chat.

Reasons:
- Keeps prompts, settings, outputs, and decisions reproducible.
- Saves raw candidates, final exports, metadata, and review notes.
- Lets the P0 hero become the actual style anchor for P1/P2 generations.
- Supports serial approval gates so drift is caught before multiplying across the set.
- Enables deterministic post-processing for crop sizes, exact filenames, compression, and final text overlays.

Use chat/Codex for planning, prompt refinement, visual review, and final app wiring after approval. Use a script for the image calls and asset processing.

## 3. Critical Production Decision: Text Overlay

Do not rely on the image model for important brand text in final production exports.

Generate most images with either no text or only non-critical decorative label areas, then overlay exact text in post-production using real fonts or close matching local/web fonts.

Text to overlay manually:
- `goZaika`
- `Great food. No menu. No algorithm.`
- `A customer-acquisition channel for premium kitchens.`
- `BAM!`
- `बड़ा ज़ायका, आएगा मज़ा`
- `BEST BEFORE 9:30 PM`
- QR code on the tag

Rationale: text rendering is one of the easiest ways for otherwise beautiful AI assets to look unprofessional. Manual overlay gives exact spelling, type hierarchy, brand colors, and export consistency.

Exception: P0 raw candidates may include an approximate tag/label shape for visual composition, but the final P0 should still receive the QR/time label as a clean overlay if the rendered text is imperfect.

## 3.1 BAM Flame-Drop Usage

The BAM flame-drop should be incorporated deliberately as a distinctive brand-language element, not as random decoration.

Baseline rule:
- Every asset where a sealed BAM Bag appears should include exactly one clear BAM flame-drop cue.
- Preferred placements are embossed on the kraft bag, printed on the tamper seal, printed on the kraft tag, or used as a small table/kitchen-pass card mark.
- Avoid repeating the mark many times in one image unless it is being used as a very subtle texture/pattern.

Color flexibility:
- The drop fill and negative `BAM` cutout may change by context as long as contrast, silhouette, and premium feel are preserved.
- Default consumer expression: saffron drop `#FF6B35` with negative cream/transparent `BAM`.
- Premium seal expression: heritage-gold drop `#D4A017` with negative forest/charcoal/transparent `BAM`, especially on tamper seals.
- B2B expression: deep teal or forest drop with negative warm cream `BAM`, especially on restaurant-facing assets.
- Tonal emboss expression: same-material kraft emboss/deboss where the mark is visible through shadow and relief rather than color.
- Reverse expression: warm cream drop with saffron/forest negative or knocked-out detail on dark green/deep teal surfaces.

Guardrails:
- Do not distort the flame/drop silhouette.
- Do not redraw the `BAM` lettering into a different style.
- Do not use neon, discount-red, sale-tag yellow, or plastic-like gradients.
- Do not make the mark compete with the full goZaika wordmark in social or B2B assets.
- If the generated mark is visibly warped, overlay the exact `icons/flame.svg` vector in post-production.

Production preference:
- Ask the image model to reserve or suggest the mark location through emboss/seal/tag treatment.
- Use the real SVG in post-production wherever the `BAM` negative text must be recognizable.

## 4. Model and API Settings

Configured model:
- Default candidate: `gpt-image-2`.
- Do not hardcode this into prompts. Put the model id in script config, default it from `GOZAIKA_IMAGE_MODEL` or a checked-in generation config, and validate it before the first paid image call.
- The script must fail fast with a clear message if the configured model is unavailable to the account or unsupported by the Images API.
- The prompt pack's older `gpt-image-1` family references are superseded by this manifest, but the executable script must still validate against live API availability at runtime.

Default settings:
- `quality`: `high`
- `output_format`: `png` for raw candidates and review contact sheets
- `background`: `opaque`
- `size`: match asset class below

Generation mode:
- P0 hero: text-to-image generation, 4 to 8 candidates.
- P1/P2 assets: hybrid workflow. Prefer text-to-image at the target composition size using the identical Master Style Block plus the unchanged anchor sentence as the textual seed. Attach the approved P0 master as an additional reference only where the API supports reference images without forcing the square layout into wide compositions.
- Use pure edit/reference mode only for same-aspect or near-same-aspect work where preserving the input layout is desirable.

Do not run broad parallel generation for the whole pack. Run serially by gate:
1. P0 batch
2. P0 review and master selection
3. P1 social/home assets
4. P1 restaurant assets
5. P2 culture/about asset
6. final contact sheet and QA

## 5. Directory Plan

Working directories to create during implementation:

```text
.codex-artifacts/gozaika-images/
  manifest/
    generation-manifest.json
    prompt-snapshots/
  raw/
    p0-hero/
    p1-og-home/
    p1-instagram-cover/
    p1-linkedin-banner/
    p1-restaurant-hero/
    p2-about-culture/
  selected/
    master-style-anchor.png
  postprocessed/
    overlays/
    crops/
    contact-sheets/
  qa/
    review-notes.md
    palette-checks.json
    asset-decisions.md
```

`.codex-artifacts/` is intentionally ignored by git because raw candidates, contact sheets, and generated review files are large working artifacts.

Final destinations after approval:

```text
apps/website/public/images/hero-bam-bag-v3.webp
apps/website/public/images/restaurant-hero-v3.webp
apps/website/public/images/about-illustration-v3.webp
apps/website/public/images/social/og-home-v3.png
apps/website/public/images/social/instagram-cover-v3.png
apps/website/public/images/social/linkedin-banner-v3.png
```

## 6. Prompt Normalization Before Generation

Before any API calls:
- Read the prompt pack as UTF-8.
- Expand every `[paste Master Style Block]` placeholder into the exact master style block.
- Expand every `[paste AVOID line]` placeholder into the exact avoid block.
- Resolve the prompt pack's older model references through the configured model setting and runtime validation.
- Keep the anchor sentence unchanged across assets.
- Remove instructions asking the model to render final production text where manual overlay will be used.
- Preserve Devanagari exactly: `बड़ा ज़ायका, आएगा मज़ा`.
- Preserve brand capitalization exactly: `goZaika`.
- Add "no visible text except blank/clean tag space" to image-generation prompts that will receive manual text overlays.
- Attach or reference `icons/flame.svg` when generating assets that need the BAM flame-drop mark.
- Tell the model to preserve the BAM flame-drop silhouette and use it only as an embossed/seal/tag motif unless the asset explicitly calls for a bolder social treatment.
- Do not rely on the image model to render the negative `BAM` cleanly; plan to overlay the exact SVG mark when the mark is meant to be readable.
- For OG and LinkedIn crops, keep the subject and reserved text band in the central horizontal third so the final crop does not cut off the bag, mark, or text-safe area.

## 7. Asset Manifest

### P0: Hero BAM Bag

Asset id: `p0.hero_bam_bag`

Priority: P0

Role:
- Main home hero image
- "What is a BAM Bag?" section image
- Style anchor for all other generated assets

Source replacement:
- Existing: `apps/website/public/images/hero-bam-bag-v2.svg`
- Final: `apps/website/public/images/hero-bam-bag-v3.webp`

Generation:
- Mode: text-to-image
- Candidate count: 6 square candidates plus 4 dedicated portrait candidates after square direction is chosen
- Raw size: `1024x1024` for square and `1024x1536` for dedicated portrait
- Final export: WebP square and WebP portrait. Do not crop the square into 4:5 as the primary portrait asset.

Composition:
- Single sealed premium kraft-paper BAM Bag
- Folded top, heritage-gold tamper seal
- Kraft tag positioned for later QR/time overlay
- Faint steam, subtle BAM flame-drop emboss or seal mark
- Warm cream surface, curry leaf, restrained brass accent
- Forest-green shadow depth
- Contents fully concealed
- Generous negative space

Manual overlay:
- Exact BAM flame-drop SVG if the emboss/seal mark is unclear
- QR code
- `BEST BEFORE 9:30 PM`
- Optional clean micro-linework on kraft tag

Acceptance criteria:
- Bag silhouette is iconic and memorable at small sizes.
- Kraft material reads premium, not disposable/cheap.
- Saffron/gold are accents, not dominant background.
- No visible dish content.
- No fake restaurant logos.
- No warped label or unreadable generated text in final.
- BAM flame-drop is present but premium and restrained.
- This image is strong enough to act as the master style anchor.

Review gate:
- User selects one winner before any P1/P2 generation begins.
- Save selected winner as `.codex-artifacts/gozaika-images/selected/master-style-anchor.png`.

### P1: OG / Home Social Card

Asset id: `p1.og_home`

Priority: P1

Source replacement:
- Existing: `apps/website/public/images/social/og-home-v2.svg`
- Final: `apps/website/public/images/social/og-home-v3.png`

Generation:
- Mode: text-to-image at `1536x1024`; use master style block and anchor sentence as textual seed. Attach `master-style-anchor.png` only as a style/reference input where supported without forcing square composition.
- Candidate count: 3 to 4
- Raw size: `1536x1024`
- Final crop: `1200x630`
- Final format: PNG

Composition:
- Horizontal card on warm cream background
- Left third contains sealed BAM Bag in same visual language
- Right two thirds reserved as clean negative space
- Thin heritage-gold underline or accent line allowed
- BAM flame-drop appears on the bag seal/tag/emboss, not as a large competing logo
- Subject and reserved text area remain within the central horizontal crop-safe band.

Manual overlay:
- `goZaika`
- `Great food. No menu. No algorithm.`
- Exact BAM flame-drop SVG if the bag mark needs cleanup

Acceptance criteria:
- Reads instantly as a social preview at small size.
- Crops cleanly to 1200x630 without losing bag or text area.
- Text safe area remains uncluttered.
- No AI-rendered substitute text remains visible.

### P1: Instagram Cover

Asset id: `p1.instagram_cover`

Priority: P1

Source replacement:
- Existing: `apps/website/public/images/social/instagram-cover-v2.svg`
- Final: `apps/website/public/images/social/instagram-cover-v3.png`

Generation:
- Mode: text-to-image at `1024x1536`; use master style block and anchor sentence as textual seed. Attach `master-style-anchor.png` as a style/reference input where supported.
- Candidate count: 3 to 4
- Raw size: `1024x1536`
- Final crop: `1080x1350`
- Final format: PNG

Composition:
- Vertical warm cream canvas
- Sealed BAM Bag lower-center
- Upper area deliberately left open for type
- Sparse heritage-gold spark/confetti accents
- Energetic but premium
- BAM flame-drop may be more prominent than in other assets, either on the bag or as a controlled graphic accent near the `BAM!` type

Manual overlay:
- `BAM!`
- `बड़ा ज़ायका, आएगा मज़ा`
- Exact BAM flame-drop SVG if used as a prominent graphic accent

Acceptance criteria:
- Mobile/social thumbnail remains legible.
- Hindi text is manually rendered, not AI-rendered.
- Composition has energy without becoming childish or discount-like.

### P1: LinkedIn Banner

Asset id: `p1.linkedin_banner`

Priority: P1

Source replacement:
- Existing: `apps/website/public/images/social/linkedin-banner-v2.svg`
- Final: `apps/website/public/images/social/linkedin-banner-v3.png`

Generation:
- Mode: text-to-image at `1536x1024`; use master style block and anchor sentence as textual seed. Attach `master-style-anchor.png` only as a style/reference input where supported without forcing square composition.
- Candidate count: 3 to 4
- Raw size: `1536x1024`
- Final crop: `1584x396`
- Final format: PNG

Composition:
- Ultra-wide B2B banner
- Deep teal restaurant/kitchen-pass tone
- Right side: sealed BAM Bag on clean counter, warm light, brass rail
- Left side: uncluttered text-safe space
- BAM flame-drop appears only as a restrained seal/tag/counter-card mark
- Subject and reserved text area stay in the central horizontal third for the `1584x396` crop.

Manual overlay:
- `goZaika`
- `A customer-acquisition channel for premium kitchens.`
- Exact BAM flame-drop SVG if visible on seal/tag

Acceptance criteria:
- Professional enough for restaurant partners/investors.
- No clutter in wide crop.
- Deep teal supports B2B mood without overpowering warm cream.
- No faces, real logos, or operational mess.

### P1: Restaurant Hero

Asset id: `p1.restaurant_hero`

Priority: P1

Source replacement:
- Existing: `apps/website/public/images/restaurant-hero-v2.svg`
- Final: `apps/website/public/images/restaurant-hero-v3.webp`

Generation:
- Mode: text-to-image at `1536x1024`; use master style block and anchor sentence as textual seed. Attach `master-style-anchor.png` as a style/reference input where supported.
- Candidate count: 4
- Raw size: `1536x1024`
- Final export: WebP, landscape

Composition:
- Warm premium restaurant kitchen pass
- Chef hands only, no identifiable face
- Hands place sealed BAM Bag onto clean counter
- QR/best-before tag facing forward but available for manual cleanup
- Soft sense of growth/welcome in background bokeh
- Brass, herbs, wood, deep teal/forest depth
- BAM flame-drop appears on the tamper seal, bag emboss, or kraft tag

Manual overlay:
- QR code and `BEST BEFORE 9:30 PM` only if tag is visible enough and needs correction
- Exact BAM flame-drop SVG if the seal/tag mark is distorted

Acceptance criteria:
- Dignified restaurant-partner mood.
- Hands look natural.
- No identifiable faces.
- No discount/surplus/leftover visual cues.
- Bag remains the hero, not the kitchen.

### P2: About / Culture Illustration

Asset id: `p2.about_culture`

Priority: P2

Source replacement:
- Existing: `apps/website/public/images/about-illustration-v2.svg`
- Final: `apps/website/public/images/about-illustration-v3.webp`

Generation:
- Mode: text-to-image at `1536x1024`; use master style block and anchor sentence as textual seed. Attach `master-style-anchor.png` as a style/reference input where supported.
- Candidate count: 3
- Raw size: `1536x1024`
- Final export: WebP, landscape or square crop depending on page review

Composition:
- Warm inclusive Hyderabad food culture scene
- Hands of diverse people around warm cream table
- Sealed BAM Bags integrated naturally
- Regional dishes may appear but should not imply real restaurant partners
- Faint Charminar silhouette only, soft and non-literal
- Candle-warm light, community, generosity
- BAM flame-drop appears once as a subtle bag seal, table card, or packaging cue

Manual overlay:
- Exact BAM flame-drop SVG only if the mark is intended to be legible

Acceptance criteria:
- Feels premium and heartfelt, not stock or sentimental-kitsch.
- People are not sharp identifiable faces.
- Charminar cue is subtle.
- Does not become a generic feast photo; BAM Bag remains part of the system.

## 8. Human Review Gates

Gate 1: Prompt manifest approval
- Confirm this manifest and any prompt edits.
- Confirm configured model/API choice and runtime validation behavior.
- Confirm text overlay approach.

Gate 2: P0 candidate review
- Review contact sheet of 6 hero candidates.
- Choose one master.
- Optionally request one refinement round before locking.

Gate 3: P1 candidate review
- Review OG, Instagram, LinkedIn, restaurant hero candidates.
- Select winners or request targeted regenerations.

Gate 4: P2 review
- Review about/culture candidates.
- Select winner or request targeted regeneration.

Gate 5: Final asset QA
- Review final contact sheet with overlays and crops.
- Approve app wiring.

## 9. QA Checklist

Brand coherence:
- Warm cream is dominant.
- Forest/deep-teal shadows add depth.
- Saffron/gold remain accents.
- Set reads as one family when viewed side by side.
- BAM flame-drop appears consistently as a flavor/drop cue without becoming visual clutter.
- Drop colors may vary by context, but the silhouette and negative BAM relationship remain recognizable.

Palette check definition:
- Generate `palette-checks.json` by sampling each final image after crop/overlay.
- Approximate warm cream/light neutral pixels should be the plurality for consumer/social assets.
- Saffron plus heritage-gold accent pixels should generally stay under 15% of the image unless an explicit review override is recorded.
- Restaurant/B2B assets may allow more forest/deep-teal depth, but saffron/gold should still behave as accents.
- Palette checks are advisory gates: failures require human review, not automatic rejection.

Subject safety:
- BAM Bag contents are concealed where required.
- No real restaurant logos or third-party marks.
- No identifiable real restaurant dishes implying partnership.
- No plastic packaging.
- No greasy/messy food.
- No discount, sale, percent-off, clearance, leftover, or surplus cues.

Craft:
- Focal subject is crisp.
- No warped hands.
- No uncanny faces.
- No busy backgrounds.
- No watermark or low-resolution artifacts.
- Crop works at target aspect ratio.

Text:
- All final visible text is exact.
- No hidden AI gibberish remains on labels, signs, walls, packaging, or backgrounds.
- Devanagari is rendered manually and proofread.
- QR code is generated in post-production with a QR library, not drawn by the image model. Default encoded URL: `https://gozaika.in`.
- If the QR is decorative only, log that decision in `asset-decisions.md`.
- If the BAM flame-drop is readable, its negative `BAM` is clean; otherwise replace with the exact SVG overlay.

Technical:
- Final filenames match manifest.
- OG/social assets are raster PNG.
- Website assets use WebP where planned.
- Width/height metadata in code should be updated during the later wiring step.
- Alt text should be reviewed during the later wiring step.

## 10. Suggested Script Responsibilities

The later script should:
- Parse a JSON or YAML version of this manifest.
- Create all working directories.
- Support dry-run mode that resolves prompts, validates config, estimates planned calls, and writes no paid image outputs.
- Validate the configured model before the first image generation request.
- Save exact prompt text per API call.
- Never write `OPENAI_API_KEY` or other secrets into artifacts/logs.
- Load `icons/gozaika-logo.svg` and `icons/flame.svg` as brand references and overlay sources.
- Download or use checked-in local OFL font files for Playfair Display, Poppins, Inter, and Hind; do not rely on system fonts for final overlays.
- Generate QR overlays via a QR library, defaulting to `https://gozaika.in`.
- Generate P0 candidates.
- Pause for human selection.
- Use selected P0 image as a style reference where supported, without forcing square layout into wide assets.
- Save raw API responses and images.
- Log per-call estimated and actual usage/cost when available.
- Support skip-if-exists resumability so failed runs can continue without paying to regenerate accepted candidates.
- Generate contact sheets.
- Crop to final aspect ratios.
- Apply manual text, QR, and BAM flame-drop overlays from local template settings.
- Export final PNG/WebP files.
- Write an `asset-decisions.md` log with candidate choices and reasons.

The later script should not:
- Wire assets into app code without explicit approval.
- Delete existing v1/v2 assets.
- Generate all images in one unattended run.
- Depend on AI-rendered final text.
- Commit raw candidates or contact sheets to git.

## 11. Decisions Before Implementation

1. QR: generate a real QR in post-production. Default to functional encoding of `https://gozaika.in`; if a specific campaign URL is chosen later, update the overlay config.
2. Fonts: use real local OFL font files for Playfair Display, Poppins, Inter, and Hind.
3. Hero exports: create both square and dedicated portrait hero outputs. Do not rely on a square-to-portrait crop as the main portrait asset.
4. Provenance: keep prompt snapshots, selected candidates, edit notes, overlay settings, and `asset-decisions.md`. C2PA/embedded metadata is optional.
5. Retouch: perform at least a light human retouch/review pass after generation and before final wiring.
6. BAM flame-drop variants: canonical variants are saffron consumer, gold seal, forest/deep-teal B2B, and kraft tonal emboss. Reverse cream is allowed on dark surfaces by explicit review.
7. Naming: use "BAM flame-drop mark" in production docs. The source file remains `icons/flame.svg`, but the brand role is the flame/drop flavor-discovery cue.

## 12. Approval Note

Once this manifest is approved, the next implementation step should be to create the executable generation manifest and script. The first runnable milestone should generate only P0 candidates and a contact sheet, then stop for review.
