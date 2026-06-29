# E2E scenario inventory & coverage gaps (Playwright + Maestro)

Date: 2026-06-29 · Scope: review existing web (Playwright) and mobile (Maestro)
end-to-end scenarios and identify where coverage must grow in light of the
**mobile UX uplift** (Slices 10–18, U1–R4, X1, D1, F1) and the **web parity
program** (W0–W7, see `docs/web/web-parity-ledger.md`).

This is an inventory + recommendation. It does not add tests; the prioritized
additions are folded into the web-parity plan (W6/W7) and a mobile follow-up
backlog below.

---

## 1. Current inventory

### 1.1 Playwright (web)
| App | Tooling | Specs | What they assert |
| --- | --- | --- | --- |
| `apps/website` (marketing) | `@playwright/test` + `axe-playwright` + lhci; `playwright.config.ts`; scripts `e2e`/`a11y`/`lhci` | `tests/a11y.spec.ts`, `tests/smoke.spec.ts` | **a11y:** axe on `/`, `/how-it-works`, `/for-restaurants`, `/about`, `/faq`, `/contact`. **smoke:** primary heading, nav links resolve, canonical redirects, contact form interactive, 404. |
| `apps/restaurant-mgmt-web` | *no Playwright dep* | `tests/marketing-video/*.spec.ts` | Marketing-**video capture** scripts (drive the UI for recording), not functional assertions. |
| `apps/admin-web` | *no Playwright dep* | `tests/marketing-video/restaurant-onboarding.spec.ts` | Same — video capture only. |
| **`apps/consumer-web`** | **none** | **none** | **No E2E at all.** |

> **Headline:** the two **product** web apps — the ones the web parity program is
> uplifting — have **zero functional or a11y E2E**. All real Playwright coverage
> is on the separate marketing site.

### 1.2 Maestro (mobile)
| App | Flow | Covers |
| --- | --- | --- |
| consumer-mobile | `smoke.yaml` / `smoke-devclient.yaml` | Launch + tab nav (Home/Drops/Restaurants/Orders/Account). |
| consumer-mobile | `checkout-simulated-devclient.yaml` | Phone-OTP sign-in → consent → claim a bag → **simulated** payment → confirm. |
| consumer-mobile | `demo-discovery-vibrant.yaml` | Demo discovery stills (D1). |
| consumer-mobile | `marketing-customer-day-in-life.yaml` | Marketing capture. |
| restaurant-mobile | `smoke.yaml` | Launch + nav. |
| restaurant-mobile | `owner-e2e-devclient.yaml` | OWNER sign-in → dashboard metrics (revenue/sell-through/pickup-ready) → Drops → New drop (template). |
| restaurant-mobile | `counter-pickup.yaml` / `-devclient` | Staff sign-in → counter → OTP verify (invalid **and** valid path). |
| restaurant-mobile | `dashboard-nav-devclient.yaml` | Dashboard navigation. |
| restaurant-mobile | `marketing-*`, `store-partner-owner.yaml` | Marketing / store-asset capture. |

Mobile has real happy-path coverage for **auth, discovery→claim→simulated-pay,
dashboard, drop-create, and counter pickup-verify** — the core revenue loop.

---

## 2. Coverage gaps vs the mobile UX uplift

These uplift features shipped (code + gate + smoke) but have **no Maestro flow**:

| Feature (slice) | Gap |
| --- | --- |
| **F1 follows** | Follow/unfollow on restaurant detail; Home "Restaurants you follow" rail (signed-in). |
| **Slice 10 reviews** | Submit a review on a COLLECTED order → "pending moderation"; re-open shows status. |
| **Slice 10 erasure / profile** | Account erasure confirm flow; profile-edit (name/language) + referral share. |
| **Slice 11 / C5 passport** | Passport viz, Flavour-Diversity ring, discovery profile, share card. |
| **Slice 12 onboarding** | Resumable onboarding wizard (step deep-links, persist across relaunch). |
| **Slice 12 location pin** | "Use my current location" (GPS grant) + manual coordinate entry + clear. |
| **Slice 16 push/deep-link** | Tap a notification → routes to `data.link` (running + cold start). |
| **Slice 16 offline** | Offline banner over cached drops on NETWORK error (not a hard failure). |
| **Slice 13 / R3b lifecycle** | Drop pause / activate / reactivate / cancel confirmations. |
| **Slice 14 partner reviews** | Reviews screen (rating summary + moderation badges). |
| **Slice 15 finance/reports** | Finance settlements + ROI report + invoice download. |
| **R2 counter focus-mode** | Active/All/Collected/Issues filters (partially exercised by counter-pickup). |
| **R4 role-aware** | Role-gated More destinations + RestaurantSwitcher (restricted-role variant). |
| **X1 a11y** | No automated a11y on mobile; TalkBack/VoiceOver remains manual (acceptable, but contrast is now lockable — see §4). |

Most are device-dependent (GPS, push, offline) and fit the **batched on-device
pass** already tracked in `deploy-verification-checklist.md`; the non-device ones
(follows, reviews, passport, lifecycle, partner reviews, role-aware) are good
Maestro additions.

## 3. Coverage gaps vs the web parity program

| Area | Gap |
| --- | --- |
| **consumer-web functional E2E** | None exists. The recomposed customer surfaces (Home + F1 rail, drops, drop detail, checkout→simulated-pay, orders, account/passport/discovery) have no Playwright happy-path. |
| **restaurant-mgmt-web functional E2E** | None. Dashboard, drops, counter/orders, finance, reports, onboarding, profile uncovered. |
| **Web a11y (axe)** | The `axe-playwright` pattern exists for the marketing site only. The product apps — which just had a **contrast/AA uplift (W1) and will have a full W6 a11y pass** — are not axe-checked. This is the single highest-value web gap. |
| **Visual / token regression** | The design-system migration (670→0 brand-hex per surface) has unit-level locks (`theme.test.ts`, `contrast.test.ts`) + the `next build` gate, but no rendered visual regression. The hex-drift scan in `web-ci` is the pragmatic guard; full visual regression is optional. |

## 4. Recommendations (prioritized)

**P0 — fold into the web parity plan (do as part of W6/W7):**
1. **Add `axe-playwright` a11y specs to consumer-web + restaurant-mgmt-web** for the
   key authenticated + public routes, mirroring `apps/website/tests/a11y.spec.ts`.
   This operationalizes the W6 a11y standard (contrast/landmarks/labels) as a gate
   instead of a one-time manual pass. Wire into `scripts/web-ci.mjs`.
2. **Add a Playwright functional smoke** to each product web app: route renders +
   the customer claim→simulated-pay happy path (consumer-web) and OWNER
   dashboard→drops (restaurant-mgmt-web), against seeded demo data. (W7.)

**P1 — mobile Maestro additions (non-device, deterministic):**
3. `follows` flow (follow a restaurant → Home rail shows it → unfollow).
4. `reviews-submit` flow (COLLECTED order → rate → pending moderation).
5. `drop-lifecycle` flow (pause → reactivate a drop) and `partner-reviews` screen.

**P2 — batched on-device (already tracked, device-dependent):**
6. Location-pin GPS, push deep-link tap, offline banner, onboarding deep-links,
   role-aware nav — keep in `deploy-verification-checklist.md`.

**P3 — optional:**
7. Rendered visual regression for the design system once W4/W5 recomposition lands.

## 5. Where this is tracked
- **P0** is now written into the web-parity plan (W6 = axe specs; W7 = functional smoke) — see `project docs/gozaika_web_parity_implementation_plan_v1.md`.
- **P1/P2** are a mobile-coverage follow-up backlog (this section); the mobile build itself is complete and gate-green, so these are additive hardening, not blockers.
