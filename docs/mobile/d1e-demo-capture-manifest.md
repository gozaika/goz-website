# D1e — Demo capture manifest (Maestro demo flows)

Date: 2026-06-27 · Owner: source-code agent (mobile UX uplift, slice D) · Status: complete

Single reference for the **demo / presales** capture flows that live in the repo
(`apps/*/.maestro/`), their personas, preconditions, and the screenshots they emit —
annotated with the **slice-D vibrant states** each one now showcases. This is a demo
walkthrough index; it **cross-references** (does not duplicate) the cinematic
`marketing-videos` and `store-launch` packages, which own video shots and the store
submission package respectively.

## Run prerequisites (once)

- **Device/emulator** with the app loaded (dev client: Metro serving + the app's
  `EXPO_PUBLIC_*_API_ORIGIN` reachable; preview/standalone: each flow notes whether to
  prepend `launchApp: { clearState: true }`).
- **BFF + data.** Customer BFF with `PAYMENTS_SIMULATOR_ENABLED=true`; restaurant BFF on
  :3001. Active drops must exist:
  - **cloud demo:** apply `supabase/seed_demo/demo_prepare.sql` (the static demo windows
    have passed) and ensure copy is clean (`demo_fix_mojibake.sql` — already applied to cloud);
  - **local:** `npm run db:seed:marketing-videos` (idempotent; targets the LOCAL db only).
- **Demo identities (LOCAL `test_otp` — never real credentials):** customer marketing slot
  `+919876510008` / OTP `100008` (PLATINUM Passport); restaurant OWNER (Bawarchi)
  `+919876520001` / OTP `200001`. Full roster in `docs/mobile/CONTINUE-HERE.md`.

## Customer — `goZaika` (in.gozaika.customer)

| Flow | Captures | Slice-D vibrant states shown |
| --- | --- | --- |
| `demo-discovery-vibrant.yaml` **(new, D1e)** | `discovery-01-home-rail`, `02-drops-top`, `03-drops-scrolled` → `.codex-artifacts/mobile-ux-uplift/demo-captures/` | **D1a** cuisine covers on Home rail + Drops grid; **D1c** mystery cover (blind bag) + Chef's Special/Spotlight ribbons where those drops are active. Robust: no sign-in, anchors on "Browse drops" + scroll only. |
| `marketing-customer-day-in-life.yaml` | 6 scenes (Home → Drops → Detail → Order confirmed → Pickup card → Passport) → `gozaika-marketing-videos/screenshots/customer-day-in-life/` | Scene 001/002/003 now render cuisine art (hero drop = thali); titles are clean em-dash after the mojibake fix. Pickup proof is the SMS-delivered code message (no in-app QR — Slice 9 decision). |
| `smoke.yaml` / `checkout-simulated-devclient.yaml` | smoke assertions | n/a (functional smoke, not demo stills) |

## Restaurant — `goZaika Partner` (in.gozaika.restaurant)

D1 art is **consumer-only**, so partner captures are unchanged by slice D; they remain the
counter/owner proof flows. Listed here so the demo index is complete.

| Flow | Captures | Notes |
| --- | --- | --- |
| `marketing-restaurant-counter.yaml` | counter queue → verify → collected | Slice 7 OTP verification (signed off). No visible OTP value unless approved. |
| `marketing-restaurant-onboarding.yaml` | profile + compliance upload | Mobile onboarding is profile + compliance only; the resumable wizard is web-only. |
| `store-partner-owner.yaml` | OWNER dashboard/drops/profile/compliance/ROI/finance → store raw tree | Fills the partner native gaps for the store package. Finance/ROI claims need product/compliance approval before external use. |
| `counter-pickup.yaml` / `dashboard-nav-devclient.yaml` / `owner-e2e-devclient.yaml` / `smoke.yaml` | functional | smoke / e2e, not demo stills |

## How this fits the other tracks (no overlap)

- **`.codex-artifacts/gozaika-marketing-videos/`** — cinematic app-preview *videos* (storyboards,
  captions, `manifest.json`, ffmpeg polish). The `marketing-*` Maestro flows above feed it. D1e
  does not change those flows or that manifest.
- **`.codex-artifacts/gozaika-polish-v2/`** — App Store / Play *store cards + cinematic videos*
  (Codex-owned finals; gated). See `docs/mobile/d1d-store-asset-reconciliation.md` for what slice D
  improved in its customer source material and the native recapture handoff.
- **`.codex-artifacts/gozaika-store-launch/`** — closed-beta store *submission package*
  (raw shots, reviewer data, EAS/build evidence).

## Status / caveats

- The new `demo-discovery-vibrant.yaml` was authored to be device-runnable but has **not** been
  executed here (no device/emulator in this session); it is intentionally title-independent to
  minimise breakage. Run it in the device session as part of the slice-D manual inspection.
- Screenshot output paths are under `.codex-artifacts/` (gitignored) — captures are evidence on
  disk, consistent with the rest of slice D.
- The mobile drift gate (`node scripts/mobile-ci.mjs`) scans Maestro files for server secrets;
  the new flow uses only LOCAL `test_otp`-style anchors (none, in fact — it requires no sign-in)
  and passes 7/7.
