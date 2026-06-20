# goZaika Brand Assets

`apps/website` is the canonical production website and remains the source of truth for brand visuals. Slice 1 copies a small runtime-safe set into shared/app locations so new apps can use official branding without importing from website internals.

| Asset | Source | Shared destination | App runtime destination | Type | Usage | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| goZaika horizontal logo | `apps/website/public/logos/gozaika-logo-horizontal.svg` | `packages/ui/assets/brand/gozaika-logo-horizontal.svg` | `apps/consumer-web/public/brand/gozaika-logo-horizontal.svg` | SVG logo | Login, account, shared headers | Official primary logo. |
| goZaika white logo | `apps/website/public/logos/gozaika-logo-white.svg` | `packages/ui/assets/brand/gozaika-logo-white.svg` | `apps/consumer-web/public/brand/gozaika-logo-white.svg` | SVG logo | Dark surfaces and future portals | Preserved for shared package consumers. |
| BAM Bag square hero | `apps/website/public/images/hero-bam-bag-v3.webp` | — | — | WebP photography | Website hero and BAM Bag explainer | Approved square master with deterministic canonical branding. |
| BAM Bag portrait hero | `apps/website/public/images/hero-bam-bag-portrait-v3.webp` | `packages/ui/assets/brand/hero-bam-bag.webp` | `apps/consumer-web/public/brand/hero-bam-bag.webp` | WebP photography | Mobile hero, auth and onboarding visual support | Approved portrait master with deterministic canonical branding. |
| Restaurant hero | `apps/website/public/images/restaurant-hero-v3.webp` | — | — | WebP photography | Home partner teaser and restaurant-partner page | Candidate 03; perspective-aligned logo and canonical BAM flame-drop. |
| About / culture image | `apps/website/public/images/about-illustration-v3.webp` | — | — | WebP photography | About page | Candidate 04; shared-table scene with canonical branding. |
| Pickup illustration | `apps/website/public/images/step-pickup-v2.svg` | `packages/ui/assets/brand/pickup-illustration.svg` | `apps/consumer-web/public/brand/pickup-illustration.svg` | SVG illustration | Future pickup/account states | Copied for Slice 2+ surfaces. |

## Convention

Shared React components live in `packages/ui/src/index.tsx`:

- `GoZaikaLogo`
- `GoZaikaWordmark`
- `GoZaikaMark`
- `AppIcon`
- `BrandIllustration`

The components default to `/brand/...` URLs. Next apps need app-local `public/brand` copies because files inside package folders are not served by Next at runtime. The `packages/ui/assets/brand` folder documents and centralizes the canonical shared copies for future app asset pipelines, including mobile.

Do not modify or rename files under `apps/website` for downstream apps. Add future brand assets by copying from the website source path into the shared convention and documenting them here.

## BAM Flame-Drop Mark

The mark in `icons/flame.svg` is the canonical BAM flame-drop mark: a saffron flame/drop silhouette with `BAM` cut out in negative space. It may be used as a recurring flavor-discovery cue on BAM Bag packaging, tamper seals, kraft tags, social graphics, and restaurant-facing collateral.

Canonical color expressions:
- Consumer: saffron `#FF6B35` mark with warm cream/transparent negative `BAM`.
- Premium seal: heritage gold `#D4A017` mark with forest, charcoal, or transparent negative `BAM`.
- B2B: forest `#1A5C38` or deep teal `#194B4A` mark with warm cream negative `BAM`.
- Tonal emboss: kraft-on-kraft relief where shadow defines the mark.

Usage guardrails:
- Preserve the exact silhouette and `BAM` relationship.
- Do not redraw the internal `BAM` lettering.
- Do not use neon, sale-tag, plastic, or clearance-style treatments.
- Do not let the mark compete with the full goZaika wordmark in formal brand lockups.
