# goZaika — AI Image Generation Prompt Pack (GPT Image 2)

**Version 1.0 · June 2026 · For use in Codex with the OpenAI Images API. The executable model id is configured and validated by `gozaika_image_generation_manifest_v1.md`.**
Companion to `claude_goZaika_Master_Business_Document_v4.docx` and `website_and_graphics_review_v4.md`.

> **Execution note:** this prompt pack is the creative source material. The production workflow, model-id handling, manual text/QR overlays, crop rules, and review gates are governed by `gozaika_image_generation_manifest_v1.md`.

This pack is engineered to produce **one coherent, premium visual set** that matches the existing goZaika brand system across the website and apps. It contains: (1) the brand visual DNA, (2) a reusable **master style block** that acts as your textual "seed", (3) a consistency workflow for GPT Image 2, (4) technical settings, and (5) fully-written, copy-paste prompts for every P0/P1/P2 asset.

> **Golden rule for a consistent set:** generate the **P0 hero first**, pick the best result, then feed that image back as a *style reference* for every other asset (P1, P2). GPT Image 2 has no numeric seed — the master image **is** your seed.

---

## 1. Brand visual DNA (the style guide the rest of the app follows)

### 1.1 Colour palette — use these hexes exactly
| Role | Name | Hex | Where it appears in imagery |
|---|---|---|---|
| Primary | Saffron Flame | `#FF6B35` | Hero accent, flame motif, warm highlights, CTA energy |
| Secondary | Forest Deep | `#1A5C38` | Trust elements, deep shadows, foliage, brand text |
| Accent | Heritage Gold | `#D4A017` | Premium glow, seals/badges, rim light, garnish sparkle |
| Background | Warm Cream | `#FFF8F0` | Dominant background; the "canvas" of every image |
| Neutral dark | Charcoal | `#2D2D2D` | Type, fine linework, grounding shadow |
| Merchant | Deep Teal | `#194B4A` | B2B / restaurant-facing imagery only |
| Neutral light | Misty Gray | `#F5F5F5` | Subtle dividers, soft gradients |

**Ratio discipline:** ~70% warm cream canvas, ~20% forest/teal depth, ~10% saffron+gold accents. Saffron and gold are *accents*, never the field colour.

### 1.2 Typography (only when an asset contains text)
- **Wordmark / display:** elegant high-contrast serif in the spirit of **Playfair Display** (for "goZaika" and headline taglines).
- **Headlines / labels:** geometric sans in the spirit of **Poppins** (SemiBold).
- **Body / fine print:** clean grotesque in the spirit of **Inter**.
- **Devanagari (Hindi):** in the spirit of **Hind**.
- Wordmark lockup: **"go"** lowercase in Saffron Flame, **"Zaika"** title-case in Forest Deep.

### 1.3 Personality & mood words
Warm · premium-but-accessible · Indian-contemporary · playful confidence · mystery & delight · appetising · trustworthy · clean. **Not:** cheap, cluttered, neon, corporate-cold, clinical, "discount/clearance".

### 1.4 Material & lighting language
- **Lighting:** soft, warm, directional studio light (single key + gentle gold rim), late-golden-hour warmth, gentle falloff into forest-green shadow. Inviting, never harsh.
- **Materials:** eco **kraft paper** packaging, tamper-evident seal sticker, matte ceramic, warm brass, fresh herbs, natural wood, linen. Premium but earthy.
- **Rendering:** semi-realistic editorial food-photography feel with a hint of tactile 3D illustration; shallow depth of field; crisp focal subject; generous negative space (especially for assets that will carry overlaid text).
- **Mystery mechanic:** in any BAM Bag shot the **contents are concealed** (sealed bag) — suggest deliciousness with rising steam and warm glow, never reveal specific dishes.

### 1.5 Subject-matter rules (do / don't)
**Do:** sealed premium kraft BAM Bag; a small kraft tag showing a **QR code** + a **"best-before / packed-time" label** (trust cues); subtle flame motif; warm steam; sprigs of herbs; soft Hyderabad cues (a faint Charminar silhouette, warm urban evening) used *sparingly*.
**Don't:** any real restaurant logos or real brand marks; identifiable real dishes that imply a specific named partner; the words/visuals of "discount", "sale", "% off", "clearance", "leftover"; plastic packaging; greasy or messy food; stock-photo clichés; gibberish text; busy backgrounds; crowds of identifiable faces.

---

## 2. The Master Style Block (your reusable "seed")

Paste this block into **every** prompt (it is already embedded in each prompt below, but keep it identical if you write new ones). Changing it mid-set is what causes drift.

```
STYLE: Premium warm editorial illustration-photography hybrid for an Indian
premium food-discovery brand. Dominant warm cream (#FFF8F0) canvas; forest-green
(#1A5C38) depth in the shadows; saffron (#FF6B35) and heritage-gold (#D4A017)
used only as ~10% accents and rim light. Soft directional golden-hour studio
lighting with a gentle gold rim and smooth falloff. Shallow depth of field,
crisp focal subject, generous clean negative space. Materials: eco kraft paper,
tamper-evident seal, matte ceramic, warm brass, fresh herbs, natural wood.
Mood: warm, premium-but-accessible, Indian-contemporary, playful confidence,
mystery and delight. High craft, magazine-quality, tactile, appetising,
trustworthy. No clutter, no neon, no plastic, no greasy food, no stock-photo
cliché. Not cheap, not a clearance/discount aesthetic.

AVOID (negative): real brand logos, real identifiable restaurant dishes, the
words or visuals of discount/sale/%-off/clearance/leftover, plastic packaging,
messy or greasy food, gibberish or misspelled text, busy backgrounds, harsh
flash, watermark, lowres, deformed hands, extra fingers, oversaturation.
```

### 2.1 The "seed/anchor" sentence
Begin the P0 hero with this anchor and keep it verbatim in later assets to reinforce continuity:

> *"A single sealed premium kraft-paper goZaika BAM Bag, top folded and closed with a small heritage-gold tamper seal, a kraft tag hanging from it showing a clean QR code and a small 'BEST BEFORE 9:30 PM' label, faint warm steam rising, a subtle saffron flame motif embossed on the bag."*

---

## 3. Consistency workflow in Codex (how to lock the set)

1. **Generate P0 hero** (Section 5, P0) at 1024×1024, quality `high`. Make 3–4 candidates.
2. **Choose the master.** Save it as `master-style-anchor.png`.
3. **For every other asset (P1, P2):** call GPT Image 2 in **image-edit / reference mode**, passing `master-style-anchor.png` as the input image, and prepend the prompt with:
   > *"Use the attached image as the definitive style, palette, lighting and material reference. Produce a NEW composition described below in the exact same visual language so it belongs to the same set."*
4. Keep **size, quality, and the STYLE block identical** across calls. Only the *subject/composition* paragraph changes.
5. If a result drifts warm-orange-heavy, add: *"reduce saffron to a 10% accent; let warm cream dominate."*

---

## 4. Technical settings (OpenAI Images API)

| Setting | Value | Notes |
|---|---|---|
| `quality` | `high` | Always, for production marketing assets |
| `output_format` | `png` (or `webp`) | WebP for web delivery; PNG if transparency needed |
| `background` | `opaque` for photos; `transparent` only for icon-like cutouts | Hero/social = opaque |
| `size` — square | `1024x1024` | Hero, IG square |
| `size` — portrait | `1024x1536` | IG 4:5 story/feed |
| `size` — landscape | `1536x1024` | OG, LinkedIn banner, restaurant-hero (then crop to target ratio) |

**Target export ratios (crop the landscape/portrait render to these):**
- OG image: **1200×630** · LinkedIn banner: **1584×396** · Instagram feed: **1080×1350** · Hero: **square or 4:5**.

**Codex API sketch:**
```python
import os
from openai import OpenAI
client = OpenAI()
MODEL = os.environ.get("GOZAIKA_IMAGE_MODEL", "gpt-image-2")  # validate before paid calls
img = client.images.generate(
    model=MODEL,
    prompt=PROMPT,                 # paste a full prompt from Section 5
    size="1024x1024",
    quality="high",
)
# For P1/P2 set-consistency, use client.images.edit(image=open("master-style-anchor.png","rb"), prompt=...)
```

> **Important — text rendering:** GPT Image 2 spells short strings well but not perfectly. Always **proofread** rendered text; regenerate if a character is wrong. Keep on-image copy to the exact strings specified.

---

## 5. The prompts

Each prompt is **self-contained** (style block embedded). Filenames show what each replaces; export raster `-v3` files and update the `src` in code.

### P0 — Hero BAM Bag  ★ highest priority
- **Replaces:** `/images/hero-bam-bag-v2.svg` → `hero-bam-bag-v3.webp`
- **Used on:** home hero (`HeroSection`) **and** the "What is a BAM Bag?" section (`BamBagSection`) — so it is the single most-seen image. Do this one first; it becomes the master anchor.
- **Size:** `1024x1024`, quality `high`.

```
A single sealed premium kraft-paper goZaika BAM Bag as the hero subject, top
folded and closed with a small heritage-gold (#D4A017) tamper seal, a kraft tag
hanging from it showing a clean crisp QR code and a small label reading
"BEST BEFORE 9:30 PM", faint warm steam rising to suggest fresh hot food inside,
a subtle saffron (#FF6B35) flame motif embossed on the bag. The bag rests on a
warm cream (#FFF8F0) surface with a sprig of fresh curry leaf and a soft brass
accent nearby; deep forest-green (#1A5C38) shadow pooling behind. Contents fully
concealed — mysterious and premium, never revealing the dishes. Centred with
generous negative space around it.

STYLE: Premium warm editorial illustration-photography hybrid for an Indian
premium food-discovery brand. Dominant warm cream (#FFF8F0) canvas; forest-green
(#1A5C38) depth in the shadows; saffron (#FF6B35) and heritage-gold (#D4A017)
used only as ~10% accents and rim light. Soft directional golden-hour studio
lighting with a gentle gold rim and smooth falloff. Shallow depth of field,
crisp focal subject, generous clean negative space. Materials: eco kraft paper,
tamper-evident seal, matte ceramic, warm brass, fresh herbs, natural wood.
Mood: warm, premium-but-accessible, Indian-contemporary, playful confidence,
mystery and delight. High craft, magazine-quality, tactile, appetising,
trustworthy. No clutter, no neon, no plastic, no greasy food, no stock cliché.

AVOID: real brand logos, real identifiable dishes, discount/sale/%-off/clearance/
leftover visuals, plastic packaging, messy or greasy food, gibberish or misspelled
text, busy background, harsh flash, watermark, lowres, deformed shapes.
```
*Variant for the BamBag section (optional): same prompt, add "shot from a slightly higher 3/4 angle, the kraft tag and QR more prominent for a trust-forward read."*

---

### P1 — OG / home social card  ★
- **Replaces:** `/images/social/og-home-v1.svg` → `og-home-v3.png` (**also a functional fix:** most social scrapers don't render SVG OG images — raster PNG/JPG is required for link previews to show.)
- **Size:** `1536x1024`, crop to **1200×630**.
- **On-image text (spell exactly):** `goZaika` (serif wordmark, "go" saffron + "Zaika" forest) and below it `Great food. No menu. No algorithm.`

```
Use the attached image as the definitive style, palette, lighting and material
reference; produce a NEW composition in the exact same visual language so it
belongs to the same set. A horizontal social share card on a warm cream
(#FFF8F0) background. Left third: the sealed premium kraft goZaika BAM Bag from
the reference, with faint steam and a small QR/best-before kraft tag. Right two
thirds: clean negative space holding crisp, correctly-spelled text — the wordmark
"goZaika" in an elegant high-contrast serif with "go" in saffron (#FF6B35) and
"Zaika" in forest green (#1A5C38), and beneath it the line
"Great food. No menu. No algorithm." in a geometric sans (Poppins-like) charcoal
(#2D2D2D). A thin heritage-gold underline accent. Balanced, premium, lots of air.

STYLE: [paste the Master Style Block from Section 2]
AVOID: [paste the AVOID line from Section 2] — plus: no gibberish text, spell
"goZaika" and the tagline exactly as given.
```

### P1 — Instagram cover
- **Replaces:** `/images/social/instagram-cover-v1.svg` → `instagram-cover-v3.png`
- **Size:** `1024x1536`, crop to **1080×1350**.
- **On-image text:** `BAM!` (saffron, bold) and `बड़ा ज़ायका, आएगा मज़ा` (Devanagari, Hind-like).

```
Use the attached image as the definitive style/palette/lighting reference; new
composition, same set. A vertical Instagram cover on warm cream (#FFF8F0). Hero
the sealed kraft goZaika BAM Bag (from reference) lower-centre with warm steam
and a subtle saffron flame motif; soft forest-green shadow. Upper area: bold
playful text "BAM!" in saffron (#FF6B35) heavy sans, and below it the Hindi line
"बड़ा ज़ायका, आएगा मज़ा" in a clean Devanagari typeface (Hind-like) in forest green.
Heritage-gold confetti-spark accents, very sparing. Energetic but premium.

STYLE: [paste Master Style Block]
AVOID: [paste AVOID line] — spell "BAM!" exactly; render the Devanagari cleanly.
```

### P1 — LinkedIn banner (B2B tone)
- **Replaces:** `/images/social/linkedin-banner-v1.svg` → `linkedin-banner-v3.png`
- **Size:** `1536x1024`, crop to **1584×396** (wide — keep subject centred, text left).
- **On-image text:** `goZaika` wordmark and `A customer-acquisition channel for premium kitchens.`
- **Palette lean:** introduce **Deep Teal (#194B4A)** for the B2B surface.

```
Use the attached image as the style/palette/lighting reference; new composition,
same set, but a B2B / restaurant tone leaning on deep teal (#194B4A) with warm
cream. An ultra-wide banner. Right side: a warm premium kitchen-pass vignette —
a sealed kraft goZaika BAM Bag placed on a clean wooden counter under soft warm
light, faint steam, a brass rail; tasteful, calm, professional. Left side: clean
space with the serif wordmark "goZaika" ("go" saffron #FF6B35, "Zaika" forest
#1A5C38) and beneath it "A customer-acquisition channel for premium kitchens."
in Poppins-like sans, cream/charcoal. Spacious, confident, premium B2B.

STYLE: [paste Master Style Block]
AVOID: [paste AVOID line] — spell the wordmark and the line exactly; no clutter.
```

### P1 — Restaurant hero (for-restaurants page + home partner teaser)
- **Replaces:** `/images/restaurant-hero-v2.svg` → `restaurant-hero-v3.webp`
- **Size:** `1536x1024`. **Palette:** warm cream + Deep Teal (#194B4A) + forest, saffron/gold accents.

```
Use the attached image as the style/palette/lighting reference; new composition,
same set, B2B restaurant tone with deep teal (#194B4A) depth. A warm, aspirational
scene: a calm premium restaurant kitchen pass at golden hour; a chef's hands (no
identifiable face) placing a sealed kraft goZaika BAM Bag with its QR/best-before
tag forward onto a clean counter, ready for a new customer to discover. Subtle
visual sense of growth and welcome — a soft warm glow leading outward, a hint of
new diners arriving in soft bokeh beyond. Eco kraft packaging, brass, fresh herbs,
natural wood. Premium, hopeful, trustworthy, uncluttered. No discount or surplus
cues anywhere.

STYLE: [paste Master Style Block]
AVOID: [paste AVOID line] — no real logos, no identifiable faces, no "discount/
surplus" signage; keep it dignified and premium.
```

---

### P2 — About / culture illustration
- **Replaces:** `/images/about-illustration-v2.svg` → `about-illustration-v3.webp`
- **Size:** `1536x1024` (or `1024x1024` if used square).

```
Use the attached image as the style/palette/lighting reference; new composition,
same set. A warm, inclusive editorial illustration-photo of Hyderabad food culture
and discovery: several hands of diverse people coming together over a warm cream
table sharing beautifully plated regional dishes and sealed kraft goZaika BAM
Bags, faint steam, candle-warm light; a very subtle Charminar silhouette in a
soft evening-gold background haze. Celebration, community, generosity, "great food
for everyone." Forest-green and deep-teal depth, saffron and heritage-gold accents,
warm cream canvas. Premium, heartfelt, never sentimental-kitsch.

STYLE: [paste Master Style Block]
AVOID: [paste AVOID line] — no crowded faces in sharp focus, keep people gentle
and partly out of focus; no real landmarks in hard detail (Charminar only as a
soft silhouette); no logos.
```

---

## 6. Post-generation checklist

- [ ] **Proofread all in-image text** ("goZaika", "Great food. No menu. No algorithm.", "A customer-acquisition channel for premium kitchens.", "BEST BEFORE 9:30 PM", the Hindi line). Regenerate on any misspelling.
- [ ] **Palette check:** warm cream dominates; saffron/gold are accents (~10%), not the field.
- [ ] **Brand-safety check:** no real logos, no identifiable real dishes implying a partner, zero discount/surplus/clearance cues, no plastic.
- [ ] **IP ownership (Business Doc Part VIII):** human-review and *modify* each generated asset before shipping; keep the prompt + edit record on file so assets meet the ownership threshold.
- [ ] **Export:** WebP (or PNG for OG) at the target ratios in Section 4. OG/social **must be raster**, not SVG.
- [ ] **Wire in:** drop `-v3` files into `apps/website/public/images/` (and `/social/`), update the `src` references (`HeroSection`, `BamBagSection`, `RestaurantTeaserSection`, `for-restaurants/page.tsx`, `lib/metadata` OG paths), keep `width`/`height` and `alt` text, then run `lint && typecheck && build` before deploy.
- [ ] **Set coherence:** lay all generated assets side by side — they should read as one family. If any drifts, regenerate it from the master anchor, not from scratch.
```
