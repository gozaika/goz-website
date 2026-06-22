# goZaika Restaurant Sales Kit Specification

Version: 1.0  
Date: 2026-06-21  
Status: Implementation-ready agent brief; commercial claims and print release require approval

## 1. Objective

Create a coherent restaurant-acquisition kit that a field representative can leave behind, send by WhatsApp/email, or present in a short meeting. It must sell qualified footfall and pickup discovery—not delivery, discounting, leftovers, or vague technology.

The reference under review is:

`C:\venkat\limca\gozaika\marketing\banners\banner-restaurant-A4-backup-codex.html`

Use it as a concept source only. Do not treat it as the print master.

## 2. Independent audit of the current A4 banner

### 2.1 What works

- Premium cream, forest, saffron, and gold language is recognizably goZaika.
- Strong logo presence, clear section hierarchy, four benefit blocks, and a visible CTA.
- Pickup and counter-footfall framing is directionally right.
- Exact brand assets are referenced rather than drawn as generic flames.
- A4 print dimensions and a 3 mm bleed intent are present.

### 2.2 Release blockers

| Severity | Finding | Required correction |
| --- | --- | --- |
| Critical | The HTML contains mojibake for the em dash, Devanagari, and rupee symbol despite a UTF-8 declaration. | Re-enter source copy as real Unicode, save UTF-8, and visually proof every exported language. |
| Critical | The exported A4 preview shows hero/subhead copy colliding with the cream section boundary. | Rebuild the vertical grid; no text may touch, cross, or hide behind a zone boundary. |
| Critical | `100% Ownership`, `Your Guests. Your Data.`, `₹0 No setup cost`, and other commercial metrics are unverified claims. | Replace with approved claim tokens or remove. Legal/product/commercial owner must sign a claim ledger before release. |
| High | `Great Food must Travel Further` sounds delivery-led and conflicts with pickup-only operation. | Lead with discovery and counter footfall: `Bring new guests to your counter.` or approved equivalent. |
| High | `Flavor Drop Engine` is internal jargon without a simple explanation. | Explain BAM Bag in one plain sentence before naming the mechanism. |
| High | There is an unmatched closing `</em>` in the headline. | Fix HTML semantics and validate markup. |
| High | The QR is a large inline path with no visible destination or scan proof in the artifact. | Generate deterministically from the approved campaign URL, display a short URL, and test printed scans. |
| Medium | Google Fonts are imported at render time. | Package approved fonts locally or embed them in the production workflow; exports must not depend on network availability. |
| Medium | The page tries to explain too much before establishing a simple benefit. | Use one promise, three proof points, one mechanism, and one CTA. |
| Medium | `Exclusive Invitation` can feel synthetic unless the offer is truly limited. | Use only if there is an actual qualification/expiry rule; otherwise use `Restaurant Partner Brief`. |

Conclusion: the visual direction is promising, but the file is not leave-behind-ready until encoding, collision, claim, QR, and pickup-positioning issues are closed.

## 3. Authoritative brand and visual sources

- Primary logo: `icons/gozaika-logo.svg`
- BAM flame-drop mark: `icons/flame.svg`
- Restaurant photography: `.codex-artifacts/gozaika-images/masters/restaurant/restaurant-hero-master.png`
- Clean restaurant background: `.codex-artifacts/gozaika-images/masters/restaurant/restaurant-hero-master-clean.png`
- B2B banner: `.codex-artifacts/gozaika-images/masters/social/linkedin-banner-v3.png`
- Brand rules: `docs/product/brand-assets.md`

All logos, the BAM mark, typography, metrics, QR codes, URLs, and partner-specific data are deterministic. Image generation may create blank photographic backgrounds only, using the clean approved style anchor. Never place generated text or generated logo-like marks in a final asset.

## 4. Audience and job to be done

Primary reader: independent premium restaurant owner/operator in Hyderabad.  
Secondary readers: general manager, marketing lead, finance decision-maker, and counter operations lead.

The kit must answer, in order:

1. What is goZaika?
2. Why should this matter to my restaurant?
3. How does a BAM Bag pickup work operationally?
4. What does it cost and what do I control?
5. What proof supports the claims?
6. What is the smallest next step?

## 5. Message architecture

### 5.1 Core promise

Preferred working headline:

`Bring new guests to your counter.`

Supporting line:

`goZaika helps curious diners discover a curated BAM Bag, reserve it, and pick it up directly from your restaurant.`

This copy is a working recommendation, not a substitute for commercial approval.

### 5.2 Three benefit pillars

- **Discovery:** introduce the restaurant to diners beyond its current audience.
- **Counter footfall:** pickup creates an in-person hospitality and future-visit moment.
- **Control:** the restaurant decides what is offered, when, quantity, pickup window, and disclosed dietary/allergen information.

### 5.3 Mechanism in plain language

`You publish a limited, chef-curated BAM Bag. A diner reserves it in goZaika, then collects it during your pickup window.`

Do not reveal or picture specific contents unless the product policy guarantees them. Never use `leftovers`, `waste bag`, `clearance`, or discount-marketplace language.

### 5.4 CTA

Primary: `Book a 15-minute partner walkthrough.`  
Secondary: approved short URL and partner email/phone.  
QR destination: a versioned, tracked, owned goZaika URL with no third-party redirect dependency.

## 6. Claim-control ledger

Create `claims/restaurant-sales-claims.csv` or JSON with:

- claim ID;
- exact approved wording;
- evidence/source;
- owner;
- approval date;
- expiry/review date;
- channels allowed;
- localization notes.

Until approved, do not publish:

- numeric conversion, basket, commission, margin, revenue, or monthly-net claims;
- `100% data ownership` or unrestricted CRM transfer;
- `₹0 setup`, `0% first 30 days`, or any pricing/pilot promise;
- comparisons with aggregators;
- guaranteed customer acquisition or return visits;
- exclusivity or limited invitations.

Use non-quantified, factual language where proof is incomplete. Privacy claims must match consent, data-controller, retention, and partner-access policy exactly.

## 7. Required kit

| ID | Deliverable | Size | Purpose | Language |
| --- | --- | --- | --- | --- |
| `RSK-01` | A4 leave-behind, two-sided | 210 x 297 mm + 3 mm bleed | Primary meeting handout | English master; Hindi and Telugu after approval |
| `RSK-02` | A6 follow-up card, two-sided | 105 x 148 mm + 3 mm bleed | Pocket reminder and QR | Same language policy |
| `RSK-03` | Sales deck | 16:9, 6–8 slides | 10–15 minute owner walkthrough | English master |
| `RSK-04` | WhatsApp share card | 1080 x 1350 PNG plus accessible PDF | Post-visit follow-up | EN/HI/TE variants |
| `RSK-05` | Email one-pager | A4 PDF under 2 MB | Forwardable decision brief | English master |
| `RSK-06` | Pilot/readiness checklist | A4/A5 | Operational qualification | English; localized if field need is proven |
| `RSK-07` | Representative follow-up template | plain text + HTML | Consistent next step | EN/HI/TE reviewed copy |

Customer-facing counter tents, menu inserts, and in-store promotional posters are a separate activation kit. Do not mix them into the restaurant decision-maker sales kit.

## 8. A4 content blueprint

### Front

1. Logo and `Restaurant Partner Brief` label.
2. Core headline and one-sentence mechanism.
3. Approved restaurant master image or clean crop; keep brand mark and text deterministic.
4. Three benefit pillars, each under 20 words.
5. `How one BAM Bag works`: Publish → Reserve → Pick up.
6. Primary CTA, QR, short URL, and named contact route.

### Back

1. Restaurant control checklist.
2. Operational requirements: pickup window, quantity, packaging, disclosures, counter handoff.
3. Approved commercial model only; if pending, use `Commercial terms discussed during qualification`.
4. Privacy/data explanation in plain language.
5. Pilot/readiness steps.
6. Contact and document version/date.

Do not put four dense metric cards on the front unless all metrics are approved and essential. White space is part of the premium signal.

## 9. Sales deck blueprint

1. The opportunity: discovery and counter footfall.
2. What goZaika is—and is not.
3. Diner journey: discover, reserve, collect.
4. Restaurant workflow and controls.
5. Commercial/privacy/measurement facts from the approved claim ledger.
6. Pilot scope and success measures.
7. FAQ/objection handling.
8. CTA and next step.

Every slide must make one argument. Put supporting detail in speaker notes, not on the canvas.

## 10. Visual system

- Foundation: cream `#FFF8F0`; restaurant depth: forest `#1A5C38` or deep teal `#194B4A`.
- Accents: saffron `#FF6B35`; heritage gold `#D4A017`, used sparingly.
- Typography: one approved display face plus one highly readable sans family with Devanagari and Telugu coverage. Bundle/embed fonts.
- Use the exact white-reverse logo on dark fields and full-color logo on cream/light fields.
- BAM mark is a seal/accent, not repeated wallpaper.
- Photography must feel premium, tactile, warm, pickup-oriented, and operationally believable.
- No neon, plastic, greasy food closeups, delivery riders, discount stickers, stock handshakes, pseudo dashboards, or invented partner logos.
- Keep partner-specific personalization in data-driven text layers, never generated imagery.

## 11. Print and digital production requirements

- A4/A6: 3 mm bleed, minimum 10 mm live-content safe area, 300 ppi at final size.
- Use printer-approved CMYK profile; preserve an RGB digital PDF separately.
- Export print PDF with embedded/subset fonts and printer-requested PDF standard.
- Hairlines must survive office printers; avoid low-contrast cream-on-white body copy.
- QR: minimum 22 mm on A4 and 20 mm on A6, four-module quiet zone, high contrast, no logo over the code.
- Print-test QR on matte and office paper using iOS and Android at 30–80 cm.
- Display the short destination below the QR.
- Digital PDFs must be tagged where tooling permits, selectable/searchable, and under practical email/WhatsApp limits.
- PNG exports must be exact size, sRGB, and proofed on small phones.

## 12. Localization

- English is the controlling copy master.
- Translate meaning, not line breaks. Recompose each language independently.
- Use native linguist review for Hindi and Telugu; do not rely on model-only translation for release.
- Save every source as UTF-8 and include automated mojibake scans for suspicious Latin-1 artifacts (for example leading U+00C3/U+00E2 sequences) and replacement characters.
- Verify Devanagari/Telugu shaping, conjuncts, punctuation, digits, currency, and line wrapping in final PDFs/PNGs.
- Prefer one language per page/card. A trilingual artifact is allowed only if readability remains strong and the field team explicitly needs it.

## 13. QR and attribution system

- Final URL must be approved and owned by goZaika.
- Use a campaign parameter schema, for example `utm_source=field`, `utm_medium=print`, `utm_campaign=restaurant_partner_kit_v1`, plus a non-personal representative/territory code where approved.
- QR generation is deterministic and reproducible from a manifest.
- No personal data in the QR URL.
- Track scan, form start, qualified lead, meeting, pilot, and activation only under approved analytics/privacy policy.
- Keep an untracked human-readable fallback URL.

## 14. File and source structure

```text
marketing/
  asset-library/
    brand/
    photography/
    generation-anchors/
    social/
    ui/
  specifications/
  restaurant-sales-kit/
    source/
    claims/
    en/
    hi/
    te/
    print/
    digital/
    archive/
  manifest.json
  README.md
```

Filename pattern:

`gozaika-rsk-{deliverable}-{language}-{channel}-v{major}.{minor}.{ext}`

Never overwrite an approved release. Drafts carry `draft`; releases carry a date and version in metadata.

## 15. Agent workflow and approval gates

1. Inventory existing banners, cards, decks, PDFs, fonts, URLs, and claims. Do not delete or overwrite legacy files.
2. Build a claim ledger and mark every claim approved, rejected, or pending. Stop for commercial/product review.
3. Create wireframes/content hierarchy without paid image generation. Stop for message approval.
4. Compose the English A4 front/back using approved photography and exact vector branding. Stop for visual and print review.
5. Derive A6, deck, email, and WhatsApp assets from the approved system—not as independent designs.
6. Localize only after English content and layout are locked.
7. Run print, QR, Unicode, accessibility, file-size, and cross-device QA.
8. Deliver source, print, digital, claim ledger, manifest, contact sheet, and QA report.

## 16. Acceptance criteria

- A restaurant owner can explain the proposition after a 30-second read.
- Pickup-only operation is explicit; no delivery or surplus implication remains.
- Every published commercial/privacy claim has current evidence and an owner.
- No overlap, clipping, orphaned headings, broken glyphs, mojibake, or remote-font dependency.
- Logo and BAM geometry match canonical SVGs exactly.
- QR scans from printed A4/A6 and resolves to the visible approved URL.
- English, Hindi, and Telugu variants are independently proofed.
- Print files include bleed, safe area, embedded fonts, correct profile, and version metadata.
- Digital files are legible on a 360 px-wide phone and meet size targets.
- Legacy files remain archived; the manifest identifies exactly which outputs are current.

## 17. Copy-paste execution prompt

> Implement `docs/product/gozaika-restaurant-sales-kit-spec-v1.md` as the controlling brief. First audit all existing files under `C:\venkat\limca\gozaika\marketing` and create the claim ledger; do not overwrite or delete legacy assets. Treat `banner-restaurant-A4-backup-codex.html` as concept input only. Use the canonical logo and BAM flame-drop SVGs without redrawing them, and use approved photography or clean style anchors only. Fix message hierarchy, pickup positioning, Unicode, layout collision, QR reproducibility, font packaging, and claim substantiation before print design. Stop at the claim, wireframe, and English A4 approval gates. After approval, derive the full kit, localize with human review, run print/digital/QR/Unicode QA, and deliver a versioned manifest and replacement inventory. Do not invent pricing, performance, privacy, exclusivity, customer-data, or pilot claims.
