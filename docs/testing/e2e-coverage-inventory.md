# E2E scenario inventory & coverage gaps (Playwright + Maestro)

Date: 2026-06-30  
Scope: current web (Playwright) and mobile (Maestro) coverage after the mobile UX uplift, web parity W0-W7, template-image upload work, and launch-asset cleanup.

## 1. Current inventory

### Playwright (web)

| App | Specs | What they assert | Gate status |
| --- | --- | --- | --- |
| `apps/website` | `tests/a11y.spec.ts`, `tests/smoke.spec.ts` | Marketing-site route smoke, nav/contact checks, axe on public pages, Lighthouse via the website workspace. | In website scripts and web gate. |
| `apps/consumer-web` | `tests/a11y.spec.ts`, `tests/smoke.spec.ts` | Public product routes (`/`, `/drops`, `/restaurants`, `/swaad-club`), key discovery controls, structural axe checks; color contrast is reported for human review while token contrast is unit-locked. | In `node scripts/web-ci.mjs`. |
| `apps/restaurant-mgmt-web` | `tests/a11y.spec.ts`, `tests/smoke.spec.ts` | Login shell, structural axe, opt-in OWNER dashboard to Drops smoke, and opt-in template edit uploader shell smoke. | In `node scripts/web-ci.mjs`; authenticated tests require `RUN_AUTHED_SMOKE=1` / `RUN_AUTHED_A11Y=1`. |
| `apps/admin-web` | none active | Old marketing-video capture specs are archived under `docs/archived/launch-assets-pre-factory/legacy-tests/`. | No active product-web E2E. |

### Maestro (mobile)

| App | Flow | Covers |
| --- | --- | --- |
| consumer-mobile | `smoke.yaml`, `smoke-devclient.yaml` | Launch + tab nav. |
| consumer-mobile | `checkout-simulated-devclient.yaml` | Phone OTP sign-in, consent, claim, simulated payment, confirmation. |
| consumer-mobile | `demo-discovery-vibrant.yaml` | D1 demo discovery still capture. |
| consumer-mobile | `marketing-customer-day-in-life.yaml` | Historical marketing capture flow; future marketing/video capture should move to `marketing-assets/`. |
| restaurant-mobile | `smoke.yaml`, `dashboard-nav-devclient.yaml` | Launch + partner navigation. |
| restaurant-mobile | `owner-e2e-devclient.yaml` | OWNER sign-in, dashboard metrics, Drops, New drop template path. |
| restaurant-mobile | `counter-pickup.yaml`, `counter-pickup-devclient.yaml` | Counter sign-in, invalid OTP, valid pickup verification. |
| restaurant-mobile | `store-partner-owner.yaml`, `marketing-*` | Historical store/marketing capture flows; future launch assets should move to `marketing-assets/`. |

## 2. Covered since the old baseline

- Product-web a11y and smoke coverage now exists for both `consumer-web` and `restaurant-mgmt-web`.
- Web parity P0 coverage from W6/W7 is no longer a gap.
- Restaurant template-image upload is covered at shell level in an opt-in authenticated smoke: edit a template, verify `Template drop image`, file input MIME accepts, and upload/replace CTA are reachable without uploading bytes.
- Old marketing-video Playwright specs and runners are archived so they do not read as active coverage.

## 3. Remaining gaps

### P1 mobile, deterministic where state is stable

| Feature | Needed flow |
| --- | --- |
| F1 follows | Follow/unfollow a restaurant and verify the Home followed-restaurant rail. |
| Slice 10 reviews | Submit review for a collected order and verify pending moderation status. |
| Slice 10 profile/referral | Edit profile name/language and verify referral card/share affordance. |
| Slice 11 passport | Open Passport, discovery profile, and Swaad Club states. |
| Slice 13 lifecycle | Pause/reactivate a drop with confirmation guardrails. |
| Slice 14 partner reviews | Open partner Reviews and verify moderation-status badges. |
| Slice 15 finance/reports | Open Finance, Reports, and invoice download affordance. |
| R4 role-aware | Restricted-role More tab and RestaurantSwitcher variant. |

### P2 device-dependent / batched

- GPS permission and current-location capture.
- Push notification tap deep-link, including cold start.
- Offline banner over cached data.
- On-device text-scale and TalkBack/VoiceOver sweep.
- Full launch asset capture/video runs under the new `marketing-assets/` workflow.

## 4. Verification commands

- Web: `node scripts/web-ci.mjs`
- Web fast/source-only: `node scripts/web-ci.mjs --fast`
- Mobile: `node scripts/mobile-ci.mjs`
- Restaurant authenticated template smoke: `RUN_AUTHED_SMOKE=1 npm run e2e -w @gozaika/restaurant-mgmt-web`

