# goZaika Mobile Identity Kit and Product Fallback System

Version: 1.0  
Date: 2026-06-21  
Status: Implementation-ready agent brief; visual outputs remain review-gated

## 1. Agent mandate

Implement a complete, production-safe identity kit for both Expo applications and a reusable product-image fallback system for customer discovery surfaces.

The two applications are:

- Customer: `apps/consumer-mobile` (`in.gozaika.customer`), portrait phone experience.
- Partner: `apps/restaurant-mobile` (`in.gozaika.restaurant`), phone and tablet experience.

This is an identity and resilient rendering project, not a redesign of navigation, transactions, authentication, or the underlying mobile parity plan.

## 2. Authoritative inputs

Treat these as immutable sources:

- Primary logo: `icons/gozaika-logo.svg`
- BAM flame-drop mark: `icons/flame.svg`
- Clean photographic style anchor: `.codex-artifacts/gozaika-images/masters/anchors/master-style-anchor-clean.png`
- Approved square master: `.codex-artifacts/gozaika-images/masters/square/hero-square-master-2048.png`
- Approved portrait master: `.codex-artifacts/gozaika-images/masters/portrait/hero-portrait-master.png`
- Approved restaurant master: `.codex-artifacts/gozaika-images/masters/restaurant/restaurant-hero-master.png`
- Shared palette: `packages/mobile-ui/src/tokens/colors.ts`
- Brand guardrails: `docs/product/brand-assets.md`

The mark must always be called the **BAM flame-drop mark**. Preserve its silhouette and negative-space `BAM` exactly. Never ask an image model to redraw the logo, mark, text, QR codes, interface icons, or labels. Generated raster imagery may supply atmosphere or material only; branding and copy are deterministic layers.

## 3. Current-state findings

- Both apps currently point at generic 2048 x 2048 `icon.png`, `adaptive-icon.png`, and `splash-icon.png` files.
- Customer identity should emphasize saffron/cream; partner identity should emphasize forest/cream, matching the existing `accents` contract.
- The customer discovery DTOs currently expose no restaurant or drop image URL. The relevant contracts are `packages/types/src/mobile/discovery.ts` and the corresponding mobile BFF responses.
- `DropCard` is text-only. Restaurant list/profile surfaces also have no media contract.
- Product imagery must therefore be introduced end-to-end and remain optional for backward compatibility.

## 4. Identity architecture

### 4.1 Shared DNA

Both apps must be unmistakably goZaika:

- warm cream `#FFF8F0` foundation;
- saffron `#FF6B35` BAM flame-drop;
- forest `#1A5C38` and charcoal `#2D2D2D` support;
- tactile, contemporary Indian warmth rather than sale, surplus, delivery, or fast-food cues;
- one canonical mark geometry across every size.

### 4.2 Customer app expression

- Display name: `goZaika`.
- Primary app-icon field: warm cream.
- Hero mark: saffron BAM flame-drop.
- Optional restrained forest keyline only where it survives small-size testing.
- Splash: cream field, centered full-color goZaika logo, no photography and no tagline.

### 4.3 Partner app expression

- Display name: `goZaika Partner`.
- Primary app-icon field: forest.
- Hero mark: cream or saffron BAM flame-drop, chosen through contrast testing.
- Do not append tiny `Partner` lettering inside the launcher icon; it will fail at small sizes.
- Splash: forest field, centered white-reverse logo; a separate, accessible `Partner` label may be live native text after launch, not baked into the bitmap.

### 4.4 Distinguishability rule

The two launcher icons must be distinguishable at 32 px and in monochrome launcher treatments while remaining a family. Distinction comes from field color and controlled inversion—not from changing the mark or inventing a second logo.

## 5. Required identity deliverables

Create clean source masters plus runtime exports. Preserve source SVG or composition files in `design-source/`; commit only runtime-safe outputs to each app.

| Deliverable | Source/master | Runtime target | Requirements |
| --- | --- | --- | --- |
| Customer iOS/universal icon | 2048 x 2048 RGB | `apps/consumer-mobile/assets/icon.png` | Opaque; no transparency; survives iOS mask and 32 px test |
| Customer Android foreground | 2048 x 2048 RGBA | `apps/consumer-mobile/assets/adaptive-icon.png` | Transparent field; meaningful geometry inside Android adaptive safe zone |
| Customer splash mark | 2048 x 2048 RGBA | `apps/consumer-mobile/assets/splash-icon.png` | Logo only; generous transparent padding; cream comes from config |
| Partner iOS/universal icon | 2048 x 2048 RGB | `apps/restaurant-mobile/assets/icon.png` | Opaque forest field; no tiny text |
| Partner Android foreground | 2048 x 2048 RGBA | `apps/restaurant-mobile/assets/adaptive-icon.png` | Exact mark; works against forest adaptive background |
| Partner splash mark | 2048 x 2048 RGBA | `apps/restaurant-mobile/assets/splash-icon.png` | White-reverse logo; generous transparent padding |
| Android monochrome source | SVG or 2048 PNG | retained in source library until Expo config supports/wires it | Single-color exact BAM mark; no gradients |
| Notification glyph | 96 x 96 transparent PNG | app-local notification asset when push slice wires it | White-only glyph, transparent background, no wordmark |
| Store listing icon masters | 1024 x 1024 PNG | marketing/mobile identity library | No device frame, no rounded corners baked in |

Before changing Expo config, verify the currently installed Expo schema. Do not add unsupported keys by assumption. Keep bundle identifiers, schemes, orientation, tablet support, and permissions unchanged.

## 6. Launcher and splash composition rules

- Optical center matters more than mathematical center; compensate for the flame tip.
- Keep all critical geometry inside the central 66% diameter for adaptive-mask safety, then test circle, squircle, rounded square, and aggressive OEM masks.
- No shadows thinner than two pixels at the 48 px preview.
- No photography in launcher icons or splash art.
- No baked system background behind transparent adaptive foregrounds.
- Do not stretch the horizontal logo to fit a square. Use the BAM mark for icons and the full logo for splash.
- Export with correct sRGB metadata. iOS/universal icons must be opaque.

## 7. Product media contract

Add nullable media fields, preserving compatibility with existing clients and fixtures.

Recommended contract additions:

```ts
type MobileMediaAsset = {
  url: string;
  width: number | null;
  height: number | null;
  alt: string | null;
  blurhash: string | null;
};

// Public drop card/detail
image: MobileMediaAsset | null;

// Restaurant list/profile
coverImage: MobileMediaAsset | null;
logoImage: MobileMediaAsset | null;
```

The agent must trace the source database/view and web-domain contracts before choosing final names. If the backend has no approved media source, implement UI fallbacks and optional schemas now, but do not fabricate remote URLs. Update Zod schemas, TypeScript exports, fixtures, BFF response mappers, and tests together.

## 8. Fallback taxonomy

Fallbacks communicate absence without pretending to be the restaurant's food.

| ID | Use | Aspect | Visual | Prohibited implication |
| --- | --- | --- | --- | --- |
| `drop-default` | BAM Bag card/detail without image | 4:3 master, center-safe 1:1 | Abstract kraft bag silhouette, exact small BAM mark, cream/forest field | A specific dish, portion, cuisine, or included contents |
| `restaurant-cover-default` | Restaurant cover absent | 16:9 | Warm abstract table/pass texture with brass arc and leaf rhythm | A real venue or kitchen |
| `restaurant-avatar-default` | Restaurant logo absent | 1:1 | Deterministic monogram derived from normalized restaurant name | goZaika is the restaurant brand |
| `image-loading` | Remote image pending | matching container | Skeleton/dominant color or blurhash | Final content |
| `image-error` | URL fails or decode fails | matching container | Same semantic fallback as missing | Broken-image icon as the whole experience |
| `empty-discovery` | No active drops | flexible vector UI state | BAM mark, calm copy, retry/location action | Scarcity panic or clearance |
| `offline-cached` | Cached content while offline | existing image or semantic fallback | Persistent offline banner and stale-state label | That inventory is current |

### 8.1 Deterministic monogram

- Use the first meaningful grapheme of the restaurant name, not byte slicing.
- Normalize whitespace; support Latin, Devanagari, and Telugu grapheme clusters.
- Choose background color from a stable hash into an approved accessible palette.
- Render name/initial as native text where possible; do not bake arbitrary partner names into files.
- Include the restaurant name in the accessibility label.

### 8.2 Product truthfulness

- Never use the approved hero food photography as the default drop thumbnail; it could misrepresent contents.
- Never infer dietary category, allergens, spice level, cuisine, or serving size from an image.
- A fallback cannot make the hidden BAM Bag transparent or reveal food.
- Partner-uploaded media must pass existing moderation/ownership policy before display.

## 9. Runtime component design

Create reusable shared primitives in `packages/mobile-ui` or a clearly justified mobile-shared package:

- `BrandMark`
- `BrandLogo`
- `ProductMedia`
- `RestaurantAvatar`
- `BrandedFallback`

`ProductMedia` must accept a nullable source, aspect ratio, semantic kind, alt/accessibility label, resize mode, and test ID. It must handle loading, success, failure, and retry without layout shift. Card and detail variants must use the same fallback-selection logic.

Use React Native `Image` or the already-approved project image dependency; do not add a new library solely for blurhash without checking bundle size and Expo compatibility. Remote URLs must be HTTPS, bounded to expected hosts where practical, and never log signed query strings.

## 10. Accessibility and performance

- Decorative textures are hidden from accessibility APIs.
- Meaningful images use concise labels; a missing image does not announce `image unavailable` repeatedly inside every card.
- Maintain at least WCAG AA contrast for mark/background and live text.
- Respect reduced motion; no looping splash animation.
- Reserve dimensions before network load to prevent list jump.
- Use appropriately sized CDN variants; do not download 2048 px masters into list cards.
- Cache according to media mutability and signed-URL policy.
- Verify low-memory Android behavior, offline recovery, and screen-reader navigation.

## 11. Implementation sequence

1. Inventory existing icon pixels, Expo versions/config schema, public-media source fields, and all mobile image surfaces.
2. Produce contact sheets showing both icon families at 1024, 180, 96, 48, and 32 px plus adaptive masks. Stop for visual approval.
3. Apply approved identity assets deterministically from the canonical SVGs.
4. Add optional media contracts and fixtures without breaking existing endpoints.
5. Implement shared fallback primitives and wire customer drop/restaurant surfaces first.
6. Wire partner profile/avatar surfaces only where media is actually displayed.
7. Run unit, schema, TypeScript, lint, Expo config, and platform build checks.
8. Capture customer and partner screenshots for phone; include partner tablet.
9. Update `docs/product/brand-assets.md` with the final runtime and source locations.

## 12. Validation matrix

- Exact SVG geometry visually overlays the source with no deformation.
- Customer and partner icons are distinguishable in a mixed launcher folder.
- Icons survive circle, squircle, and rounded-square masks.
- Splash has no clipping on small Android, tall Android, standard iPhone, and notched iPhone; partner additionally passes tablet landscape/portrait.
- Every image surface passes: valid URL, `null`, 404, timeout, malformed file, offline cached, and rapid list recycling.
- No fallback implies actual food contents or partner identity.
- Old API fixtures still parse; new media fixtures parse; tests cover nullable fields.
- No mojibake appears in Hindi/Telugu labels or accessibility text.
- `npx expo config` (or repository-standard equivalent), TypeScript, unit tests, and platform smoke builds pass.

## 13. Definition of done

- Both apps use approved, platform-safe identity assets.
- A documented source library and contact sheet exist.
- Optional product media contracts are implemented end-to-end or explicitly staged with UI-ready nullable contracts.
- Shared fallbacks replace ad hoc or broken-image behavior on all in-scope screens.
- Accessibility, offline, error, small-size, adaptive-mask, and tablet QA evidence is attached.
- No canonical logo or BAM geometry was generated or redrawn.
- No unrelated mobile-parity behavior changed.

## 14. Copy-paste execution prompt

> Implement `docs/product/gozaika-mobile-identity-and-product-fallback-spec-v1.md` as the controlling brief. Begin with a read-only inventory and report any conflict between the brief and the installed Expo schema or backend media model. Preserve all unrelated working-tree changes. Use `icons/gozaika-logo.svg` and `icons/flame.svg` as immutable geometry; do not generate or redraw brand assets. Produce identity contact sheets and stop at the visual approval gate before replacing app icons. After approval, implement optional media contracts, shared fallbacks, tests, config validation, and phone/tablet QA in the sequence defined above. Do not invent partner imagery, claims, URLs, or product contents. Deliver a replacement inventory, test evidence, screenshots/contact sheets, and any consciously deferred backend-media work.
