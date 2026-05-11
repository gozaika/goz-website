# goZaika Brand Assets

`apps/website` is the canonical production website and remains the source of truth for brand visuals. Slice 1 copies a small runtime-safe set into shared/app locations so new apps can use official branding without importing from website internals.

| Asset | Source | Shared destination | App runtime destination | Type | Usage | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| goZaika horizontal logo | `apps/website/public/logos/gozaika-logo-horizontal.svg` | `packages/ui/assets/brand/gozaika-logo-horizontal.svg` | `apps/consumer-web/public/brand/gozaika-logo-horizontal.svg` | SVG logo | Login, account, shared headers | Official primary logo. |
| goZaika white logo | `apps/website/public/logos/gozaika-logo-white.svg` | `packages/ui/assets/brand/gozaika-logo-white.svg` | `apps/consumer-web/public/brand/gozaika-logo-white.svg` | SVG logo | Dark surfaces and future portals | Preserved for shared package consumers. |
| BAM Bag hero illustration | `apps/website/public/images/hero-bam-bag-v2.svg` | `packages/ui/assets/brand/hero-bam-bag.svg` | `apps/consumer-web/public/brand/hero-bam-bag.svg` | SVG illustration | Auth and onboarding visual support | Used as the current app mark fallback until a canonical favicon/app icon is provided from website. |
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
