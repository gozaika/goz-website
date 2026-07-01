# Mobile Capture Smoke Notes

Status: Slice 3 capture lane.

The mobile capture lane exists to prove real installed Android app state, not to manufacture store
screens. It is intentionally smoke-level until the device has stable authenticated customer and
partner sessions.

Current package IDs:

| App | Package ID |
| --- | --- |
| `consumer-mobile` | `in.gozaika.customer` |
| `restaurant-mobile` | `in.gozaika.restaurant` |

Commands:

```bash
npm run assets:capture:mobile -- -App consumer-mobile -Flow consumer-map-discovery -PreflightOnly
npm run assets:capture:mobile -- -App restaurant-mobile -Flow restaurant-pickup-queue -PreflightOnly
```

Use `scripts/android-preview-install.ps1 -App consumer-mobile` or
`scripts/android-preview-install.ps1 -App restaurant-mobile` when the app package is missing.

Truth rules:

- Do not capture from a locked phone.
- Do not keep screenshots where the wrong app is foregrounded.
- Do not display raw OTP, QR payload, customer phone, or private pickup proof in launch assets.
- If login or target state is unavailable, record the blocker instead of substituting fake UI.
- Raw captures stay ignored under `marketing-assets/captures/raw/mobile/`.
