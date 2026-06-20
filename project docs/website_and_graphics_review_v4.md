# goZaika — Website Messaging & Graphics Review (v4 alignment)

**Date:** June 2026 · **Companion to:** `claude_goZaika_Master_Business_Document_v4.docx`
**Status:** Proposal only — no live-site changes made. Awaiting approval before implementation.

The good news first: the current `gozaika.in` copy is already well aligned with premium-discovery positioning and is disciplined about banned words (the for‑restaurants page even states goZaika *never* calls food "surplus" to consumers). The changes below are surgical sharpening to bring the site fully in line with the **two‑sided positioning** and the **conversion/attribution layer** introduced in v4 — not a rewrite.

All copy lives in `apps/website/lib/content.ts`.

---

## Part A — Website messaging: proposed changes

### A1. Restaurant side — push harder into "customer acquisition", not "demand channel" (HIGH)
The single biggest gap: the B2B pages frame goZaika around *pickup demand* and *commission*, but v4 says the winning B2B story is **customer acquisition / kitchen showcase** — something restaurants fund from a marketing/CAC budget, not a cost line.

| Location | Current | Proposed |
|---|---|---|
| `forRestaurantsContent.title` | "The direct-demand channel for premium restaurant pickup drops." | "A customer‑acquisition channel for premium kitchens." (keep the subtitle) |
| `restaurantTeaser.heading` | "Your kitchen. Your curation. New customers." | Keep — already on-message. |
| `forRestaurantsContent.differentiators[1]` "Commission that stays lean" | framed as commission economics | Reframe as "Marketing spend that builds *your* customer list" — money that wins discerning new diners and hands you the relationship, vs. aggregator CAC of ₹800–2,500 you never recover. |

### A2. Add the "Find it on the menu" conversion/attribution promise (HIGH — new in v4)
Nothing on the site yet promises restaurants the **conversion loop + attribution** that justifies a premium take-rate. Add it on both sides:

- **Restaurant side** — add a differentiator/operational note: *"Every drop is measured. See how many first‑time diners discovered you, and how many came back to your full menu within 60 days."*
- **Consumer side** — add microcopy to the existing `howItWorksContent` "Discover (and return)" step: *"Loved a dish? Find it on the menu and make it a regular."*

This is the on-site expression of Part II of the business doc and is the strongest single addition.

### A3. Banned-word hygiene: lock "sample / sampling" out of consumer copy (MEDIUM)
"Sample" is not currently on the site — good. v4 adds it to the banned list (it culturally means *free* and fights the price gate). Action: add "sample/sampling (consumer-facing)" and "surplus" to the team copy style guide so they never creep in. No live copy change needed today.

### A4. Strengthen freshness/trust signals — the India stigma answer (MEDIUM)
India's "freshly made" expectation is best answered operationally (the Plenti playbook). Surface it:
- Add a hero `trustStrip` item or BamBag callout line: *"Packed‑time & best‑before on every bag."*
- Current trust points ("All 14 FSSAI allergens disclosed", "Pickup only — kitchen-fresh") are good — keep.

### A5. Headline consistency between web and mobile (LOW)
Web hero: **"Great food. No menu. No algorithm."** Mobile app now says **"No menu. No feed."** Pick one canonical line. Recommendation: keep **"No algorithm"** as canonical (clearer, stronger) and align the mobile app to match.

### A6. Keep as-is (verified on-message)
- `bamBag.callout` — "Not a price-led aggregator. Not a random grab bag." Excellent; do not touch.
- All illustrative/founding-partner disclaimers — legally careful; keep.
- Consumer discovery/adventure framing throughout — already correct.

**Net:** ~4 small copy edits (A1, A2, A4) + 2 guideline notes (A3, A5). All low-risk, brand-consistent, reversible. I can implement on approval.

---

## Part B — Graphics: replace what, with what, in what order

### B0. Have image models advanced enough? — Yes, materially (past your old assumptions)
As of mid‑2026 the frontier moved a lot. Current best options:
- **OpenAI GPT Image 2** — top-ranked overall; excellent instruction-following and in‑image text.
- **Google "Nano Banana Pro" (Gemini 3 Pro Image)** — high realism, **best‑in‑class readable text**, strong character/style consistency across a set.
- **FLUX.2 Pro** — best default for quality + speed + price; great photographic food realism.
- **Midjourney v7** — most aesthetic/artistic.

Net: AI gen is now genuinely good enough for **hero and marketing/editorial imagery and social/OG cards** (especially ones with overlaid text). It is *not* the right tool for tiny functional UI icons or the logo — those should stay vector.

### B1. Current state of goZaika graphics
All site illustrations are hand-built **flat geometric SVGs** (4–8 KB each): a flat orange bag with a flame, simple step icons, basic about/restaurant illustrations. They're on-brand by color but read as **placeholder-grade** — the weakest link against a "premium" positioning. Logos are clean vector (fine).

### B2. What to replace — priority order

| Priority | Asset(s) | Why | Tool | Keep vector? |
|---|---|---|---|---|
| **P0** | `hero-bam-bag-v2.svg` | Highest visibility; used in **two** places (home hero + BAM Bag section); first impression; currently a flat bag | Nano Banana Pro / GPT Image 2 | No → premium raster/illustration |
| **P1** | Social/OG: `og-home`, `instagram-cover`, `linkedin-banner` | Drive click-through; need overlaid text (models now nail this) | Nano Banana Pro / GPT Image 2 | No |
| **P1** | `restaurant-hero-v2.svg` | B2B conversion surface (partner teaser + for-restaurants) | FLUX.2 Pro / Nano Banana Pro | No |
| **P2** | `about-illustration-v2.svg`, culture imagery | Brand depth, lower traffic | Midjourney v7 / FLUX.2 | No |
| **P3 / keep** | `step-browse/buy/pickup` icons | Functional UI icons — **keep as vector**; upgrade to a consistent premium icon set, do **not** AI-raster | Hand/vector or icon library | **Yes** |
| **Don't touch** | `gozaika-logo-*.svg` | Brand mark — vector only; only revisit in a rebrand | — | **Yes** |

### B3. How to keep a generated set on-brand (and own the IP)
- Lock a reusable **style prompt**: palette `#FF6B35 / #1A5C38 / #D4A017 / #FFF8F0`, warm premium Indian-contemporary, soft studio light, appetizing but not greasy, clean negative space.
- Use one **reference image / seed** across the set so hero, restaurant, and social all feel like one family.
- **Always human-review and modify** generated assets before shipping — required for IP ownership (see Business Doc Part VIII) and to avoid uncanny artifacts.
- **Do not** generate images that imply specific real dishes or real named partners — keep evocative, consistent with the site's "illustrative only" disclaimers.

### B4. Suggested first move
Generate 3–4 hero candidates (P0) in Nano Banana Pro and GPT Image 2, pick one, derive the OG/social set from the same seed. That one swap is the biggest perceived-quality jump for the least effort.
