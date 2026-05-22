# goZaika Logo Final Spec (v1)

## Approved Brand Colors

- `Saffron Accent`: `#FF6B35`
- `Forest Deep`: `#1A5C38`
- `Charcoal (mono-safe)`: `#2B2B2B`
- `White reverse`: `#FFFFFF`

## Inconsistency Audit and Fixes

Completed across current source assets in `icons/`:

- Replaced all legacy orange `#EF8400` with `#FF6B35`.
- Replaced all legacy green `#37674E` with `#1A5C38`.
- Removed nested/duplicate SVG payload accidentally present in one variant.
- Standardized icon background to `#1A5C38` and `Z` symbol to `#FF6B35`.
- Confirmed no old hex values remain in any SVG source.

## Final Deliverables

### SVG Master and Variants

- `icons/gozaika.svg` (updated source lockup)
- `icons/gozaika-logo-color.svg` (production color master)
- `icons/gozaika-logo-horizontal.svg` (3:1 style lockup)
- `icons/gozaika-logo-stacked.svg` (1:1 layout)
- `icons/gozaika-logo-white.svg` (reverse on transparent)
- `icons/gozaika-logo-monochrome-charcoal.svg` (single color legal/print)
- `icons/flame.svg` (updated accent mark)
- `icons/gozaika-z-symbol.svg` (symbol-only square)

### App Icon and Favicon

- `icons/gozaika-app-icon-1024.svg`
- `icons/gozaika-app-icon-1024.png`
- `icons/favicon.ico` (contains 16 and 32)
- `icons/favicon-32.png`
- `icons/favicon-16.png`
- `icons/apple-touch-icon-180.png`

## Usage Rules

- **Minimum wordmark width:** never render full wordmark below `120px`.
- **Safe zone:** keep `16px` clear space on all sides of every logo version.
- **Background pairing:**
  - color version on white/cream/light neutral backgrounds
  - white reverse on dark forest or saffron-heavy sections
  - monochrome charcoal for legal docs/invoices/low-fidelity print
- **Do not:**
  - recolor logo parts outside approved palette
  - add shadows, strokes, or gradients
  - stretch/squash logo proportions
  - place full wordmark in tiny square avatars

## Website Integration Quick Notes

- Use `gozaika-logo-horizontal.svg` in navbar and footer.
- Use `gozaika-logo-white.svg` in dark footer/announcement bars.
- Use `gozaika-z-symbol.svg` for tiny square UI contexts.
- Set favicon links to `favicon.ico` and `apple-touch-icon-180.png`.
