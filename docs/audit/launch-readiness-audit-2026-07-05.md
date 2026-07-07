# goZaika — Launch-Readiness Audit (2026-07-05)

**Auditor:** Fable (hands-on, live audit against seeded demo data on the shared remote Supabase `nxvthewcwimrpjbzbcvx`)
**Scope:** 5 apps — consumer web, restaurant portal, marketing site, consumer mobile (Android), restaurant mobile (Android). admin-web out of scope. Razorpay KYC out of scope (payment treated as simulator per brief).
**Method:** Seeded live drops via `demo_prepare_for_demo(p_create_live_drops => true)`; drove the deployed web URLs through the Chrome MCP and the two installed Android apps through adb on a connected Pixel 7a (Android 16). Evidence screenshots in `docs/audit/evidence-2026-07-05/`.

---

## 1. Executive summary & verdict

**Verdict: NO-GO (conditional).** The web surfaces (consumer, restaurant portal, marketing) are close to launch-ready and genuinely impressive — the restaurant portal in particular is a mature merchant console. But two systemic issues and one broken mobile flow block a confident go-live:

1. **Consumer mobile cannot take payment (P0).** After a claim creates a hold, the mobile checkout shows a static "Native Razorpay checkout is wired once payment credentials are configured" placeholder with **no pay button and no simulator affordance** — the purchase dead-ends. It is config-gated (`PAYMENTS_SIMULATOR_ENABLED` is off on the deployed BFF, and native Razorpay is an un-implemented stub), so flipping the simulator flag would restore the demo path, but as deployed the mobile purchase is impossible.
2. **Sign-in cannot be verified end-to-end on the hosted environment (P1).** The seeded phone-OTP test codes are local-only (`config.toml`) and are rejected by hosted Supabase ("Token has expired or is invalid"); the email/password demo path is gated off in production; Google OAuth is unconfigured/untested. Transactional notifications are in `NOTIFICATION_DRY_RUN=true`, so OTP SMS / WhatsApp / email are not actually delivered. I could only authenticate by injecting a direct Supabase password-grant session (a workaround unavailable to real users through the UI).
3. **The mobile pickup code is SMS-only with no in-app fallback (P1),** so with notifications in dry-run the customer never receives the code and cannot complete pickup on mobile (web shows QR+OTP in-app).
4. **A platform-wide data-integrity bug (P1):** the Flavour Passport "cuisines explored" is always `0` for every consumer because the `get_consumer_tried_cuisines` RPC is not defined in any migration and the fallback PostgREST embed cannot resolve.

None of these are architectural; they are configuration, one un-built mobile screen, and two bounded bugs. With them fixed/verified, the platform is a strong GO.

### Top 5 blockers (NO-GO)
1. **P0 — Consumer mobile checkout dead-ends** (no pay/simulate button). *App: consumer mobile.*
2. **P1 — Auth unverifiable on hosted** (OTP test codes rejected, email/pw gated off, Google unconfigured, notifications dry-run). *All apps.*
3. **P1 — Mobile pickup code SMS-only** with no in-app QR/OTP fallback; blocked while SMS not delivering. *Consumer mobile.*
4. **P1 — Flavour Passport cuisines always 0** (missing RPC + broken fallback join); understates the diversity score for all users. *Consumer web + mobile.*
5. **P2 cluster that a top app wouldn't ship** — React #418 hydration error on *every* restaurant-portal page; no real food photography anywhere (illustrated SVG placeholders); marketing hero image lazy-loads to a blank above-the-fold; mobile restaurant ROI under-reports (₹0 vs web's ₹894 for the same week).

---

## 2. Per-app scorecard (0–5)

| App | Go-live readiness | Feature parity | Visual polish / maturity |
|---|---|---|---|
| **Consumer web** | **3.5** — discovery→claim→checkout(→real Razorpay test)→order all work; passport-cuisines bug + auth friction hold it back | **3.5** — rich filters/sort/follow/passport/holds-pill, but no food photos, no real drop map pins, no reorder/push | **4.0** — clean, tokenized, consistent; illustrated art rather than photography |
| **Restaurant portal** | **4.0** — every partner flow works end-to-end (publish-in-seconds verified, counter server-validated, finance/ROI real); only the #418 hydration error + minor nits | **4.5** — dashboard/sell-through/sparkline, ROI, finance settlement, counter OTP/QR, templates CRUD, role-grouped nav — genuinely best-in-class merchant console | **4.0** — polished and cohesive |
| **Marketing site** | **4.0** — all routes 200, waitlist capture works; hero lazy-loads blank, no portal-login handoff | **4.0** — strong positioning site; missing a returning-partner login path | **4.5** — real photography, refined type/spacing, on-brand v4 |
| **Consumer mobile** | **2.0** — **P0 checkout dead-end**; SMS-only pickup blocked in dry-run | **3.5** — discovery/orders/passport all real; parity gap vs web on pickup proof | **4.0** — good RN design, skeletons, honest empty states |
| **Restaurant mobile** | **3.5** — owner dashboard/counter(with native QR scan)/drops all work; ROI under-reports; role-matrix untested | **4.0** — mirrors web and *exceeds* it with camera QR scan | **4.0** — consistent with web brand |

---

## 3. Findings log (severity-ranked, grouped by app)

Severity: **P0** launch-blocker · **P1** major · **P2** minor · **P3** nice-to-have. Type: **BUG** / **POLISH** / **PARITY**.

### Consumer mobile (Android — `in.gozaika.customer` v0.1.0)

**CM-1 · P0 · BUG — Checkout dead-ends; no way to pay on mobile.**
- Steps: Drops → open a live drop → tap Claim (hold created) → land on Checkout.
- Expected: a payment affordance (real Razorpay, or the simulated "Confirm payment" flow the brief calls for).
- Actual: a static `EmptyState` — "Razorpay checkout — Secure card / UPI payment opens here. Native Razorpay checkout is wired once payment credentials are configured." No button anywhere on the screen (verified by scrolling).
- Root cause: `apps/consumer-mobile/app/checkout/[holdPk].tsx` renders the `mode === "razorpay"` stub. `checkoutMode()` (`apps/consumer-web/lib/mobile/payments.ts`) returns `"razorpay"` whenever `PAYMENTS_SIMULATOR_ENABLED !== "true"` — which is the deployed state — and the razorpay branch is explicitly a stub ("wired here later"). The working "Confirm payment / Simulate failure" `StickyActionBar` only renders in the `simulated` branch.
- Evidence: `evidence-2026-07-05/cust-05-checkout.png`, `cust-06-checkout-scroll.png`.
- Suggested fix: for the demo/pilot, set `PAYMENTS_SIMULATOR_ENABLED=true` on the mobile BFF (restores the gated simulator → canonical `api_convert_paid_hold_to_order`). For real launch, implement the native Razorpay RN checkout. Either way the mobile purchase must complete before go-live.

**CM-2 · P1 · BUG/PARITY — Pickup code is SMS-only in-app; no QR/OTP fallback.**
- Steps: Orders → open a CONFIRMED order.
- Expected (web parity): show the pickup QR + 6-digit OTP in-app, as consumer web does.
- Actual: "We've texted your 6-digit pickup code to your phone … Resend pickup code." No code shown in-app. With `NOTIFICATION_DRY_RUN=true` (and SMS unverified on hosted) the code is never delivered, so pickup cannot happen.
- Evidence: `cust-09-orderdetail.png` (mobile) vs `checkout/order QR+OTP on web` (order `GZ-HYD-202607-000026`, in-app OTP `244030`).
- Suggested fix: render the same in-app QR/OTP the web order-detail shows (the credential already exists server-side as a hash); keep SMS as the secondary channel.

**CM-3 · P2 · POLISH — Persistent pickup toast overlaps content/CTAs.**
- The green "Andhra Meals BAM Bag pickup · Open" banner is pinned above the tab bar and overlaps the bottom of drop cards, the drop-detail sticky Claim CTA, and list rows on Home/Drops/Account. It does not block the Claim (tap still registered) but it visually occludes the primary CTA.
- Evidence: `cust-02-drops.png`, `cust-03-dropdetail.png`, `cust-07-account.png`.
- Suggested fix: add bottom inset/padding equal to the toast height, or auto-collapse the toast on scroll.

### Consumer web (`customer.gozaika.in`)

**CW-1 · P1 · BUG — Flavour Passport "cuisines explored" is always 0 for every consumer.**
- Steps: sign in → Account → Flavour Passport (`/account/discovery`).
- Expected: cuisines derived from COLLECTED orders (Priya has 3 collected orders across 3 restaurants, each with 3 cuisine rows).
- Actual: "0 of 13 cuisines explored", all cuisines "Undiscovered", while "3 of 11 neighbourhoods visited" is correct. `GET /api/account/discovery-profile` returns `triedCuisines: []`, `triedNeighbourhoods: 3`. The 40-point cuisine-breadth term is entirely missing from the Flavour Diversity Score (shows 20, understated).
- Root cause: `apps/consumer-web/lib/discovery-profile.ts` calls RPC `get_consumer_tried_cuisines`, which **is not defined in any migration** (`supabase/**` has zero matches), so it always falls into the fallback. The fallback embeds `order_order → restaurant_cuisine_map!inner(...)`, but there is **no direct FK** between those tables (both only relate via `restaurant_restaurant`), so PostgREST returns nothing. Neighbourhoods work because they embed `order_order → drop_drop → geo_neighborhood`, which is a valid FK chain.
- Evidence: DB confirms 3 collected orders each mapping to a restaurant with 3 cuisine rows; live API returns empty `triedCuisines`.
- Suggested fix: add the `get_consumer_tried_cuisines(p_consumer_pk)` migration, **or** rewrite the fallback to two hops (`order_order → restaurant_restaurant → restaurant_cuisine_map → master_cuisine`) or a manual join.

**CW-2 · P1 · BUG/RISK — No usable sign-in path in this environment.**
- Phone OTP: seeded test codes (e.g. `100001`) are rejected on hosted Supabase ("Token has expired or is invalid") — test OTPs live only in local `config.toml`. Email/password demo path is gated behind `NODE_ENV==='development' || NEXT_PUBLIC_ENABLE_DEMO_LOGIN==='true'` and is not exposed in prod. Google OAuth surfaces a button but the provider is unverified.
- Combined with `NOTIFICATION_DRY_RUN=true`, no OTP is actually delivered. I authenticated only by injecting a Supabase password-grant session cookie directly (not a UI path).
- Suggested fix (pre-launch gate): verify real Supabase Auth SMS (Twilio) delivery end-to-end **and/or** enable a controlled demo-login path for the pilot; confirm Google OAuth redirect config. Turn off `NOTIFICATION_DRY_RUN` for the pilot.

**CW-3 · P2 · PARITY/POLISH — No real food photography anywhere.**
- Every drop card and restaurant profile uses illustrated SVG cover art (`/art/cover-*.svg`); restaurant cover/logo uploads show "No verified image yet". The template-media pipeline exists but no images are uploaded. Swiggy/Zomato/Too-Good-To-Go lean heavily on photography; the surprise-bag framing softens this, but it reads as pre-content.
- Suggested fix: seed a few verified template/hero images to exercise the pipeline and lift perceived maturity.

**CW-4 · P2 · Note — Web payment is real Razorpay test-mode, not the in-app simulator.**
- The web checkout `Proceed to payment` opens the real Razorpay **Test Mode** widget (`order_…` provider ref). The in-app simulator (`sim_…`) exists only on the mobile BFF. The Razorpay iframe repeatedly wedged the page's "document idle" state (30s+ CDP timeouts) during automation; on a real device this is normal widget latency, but worth a manual perceived-performance check. The hold→order-creation step was verified working (correct ₹149 amount, prefill, `RAZORPAY_ORDER_CREATED`).

*Positives:* honest hashed pickup credentials (OTP/QR stored as `pickup_otp_hash` / `pickup_qr_nonce_hash`, plaintext derived only), holds pill + "Complete payment" at top of Account, order history with real numbers/timestamps, rich restaurant directory (sort, rating filter, cuisine/dietary facets, active-drops toggle, grid/map), working Follow toggle, honest "Coming soon" Swaad Club, `/drops` Map view renders a real Google embed with an honest "no public coordinates" message. **No console errors observed on any consumer-web route.**

### Restaurant portal (`restaurant.gozaika.in`)

**RP-1 · P2 · BUG — React error #418 (hydration mismatch) on every portal page.**
- A minified React #418 ("text content does not match server-rendered HTML") throws on dashboard, drops, templates, orders, finance, reports, profile, onboarding. React recovers via client re-render so functionality is intact, but the audit bar is "no console errors."
- Likely a server/client timestamp or relative-time render in the portal shell.
- Evidence: console captures on `/portal/templates`, `/portal/orders`, `/portal/profile`.
- Suggested fix: gate the offending time-dependent render behind a mounted flag / `suppressHydrationWarning`, or compute the value server-side only.

**RP-2 · P2 · BUG — Finance summary card shows "Orders 0" despite real settlement.**
- `/portal/finance`: the top green summary card reads "Orders 0 / Net payout ₹929.90" while the detailed card below lists the real ORDER_GROSS entries (6 orders, gross ₹1,094). The order count on the summary is not populated.
- Evidence: `finance` screenshot.

**RP-3 · P2 · BUG/RISK — "Use demo restaurant" one-click button absent on prod; OTP login unusable.**
- The documented one-click demo-restaurant button is dev-gated and not present on the deployed portal. Owner phone-OTP test codes are rejected on hosted (same root cause as CW-2). I authenticated via direct password grant.

**RP-4 · P3 · POLISH — Chrome header inconsistency on Onboarding.**
- The left-rail header shows the restaurant name ("Bawarchi Biryani Palace") on all pages except `/portal/onboarding`, which shows the generic "Restaurant portal".

*Positives (this is the strongest app):* dashboard MetricHero with honest revenue-estimate disclaimer, sell-through % + per-drop sparkline, next-drop card; drops list with status-filter counts + at-a-glance summary; **New drop publishes in seconds from a template — verified end-to-end** ("Drop saved" + auto-generated shareable alert); templates create/edit/duplicate/archive with allergen disclosure; **counter is server-validated** (wrong OTP → "That pickup proof does not match this order"); finance matches the seed exactly (gross ₹1,094 / commission ₹164.10 / net ₹929.90 / PAID / verified payout account) with a "no live bank transfer" disclaimer; Weekly ROI report with GMV/net-recovery/sell-through, honest "Not enough data" states and disclosed assumptions; reviews match the seed (4.5, category breakdown, moderated read-only); onboarding/compliance complete (FSSAI/GSTIN/PAN, ACTIVE/APPROVED); role-grouped nav (Operate/Build/Trust). **RestaurantSwitcher not testable** — the demo owner is single-membership (known, documented gap, not a bug).

### Marketing site (`gozaika.in`)

**MK-1 · P2 · BUG/POLISH — Hero image lazy-loads to a blank above-the-fold.**
- The primary hero `<img>` (alt "A branded goZaika BAM Bag on a sunlit premium restaurant kitchen pass") carries `loading="lazy"`, so on first paint the hero panel is empty; it only renders after it is forced eager / interacted with. Same pattern on `/for-restaurants` and `/partner-portal`. The asset itself is 200 (a real photo).
- Suggested fix: mark the LCP hero image `priority`/`loading="eager"`.

**MK-2 · P2 · PARITY — No returning-partner login handoff from marketing.**
- The footer "Partner Portal" link goes to `gozaika.in/partner-portal` (an ecosystem-partners page: PR, communities, hospitality groups, investors), which contains **no** link to `restaurant.gozaika.in`. The restaurant CTA is "Express Partner Interest" (a form). A restaurant that already has an account has no path from the marketing site to the portal login.
- Suggested fix: add a "Restaurant login" link to `restaurant.gozaika.in` in the nav/footer.

**MK-3 · P3 · POLISH — Duplicated brand in `<title>`.**
- `/partner-portal` title renders "Partner Portal | goZaika | goZaika".

*Positives:* all routes (home, how-it-works, for-restaurants, about, faq, contact, partner-portal) return 200; real photography; on-brand v4 B2B/B2C positioning ("customer-acquisition channel for premium kitchens"); waitlist email capture present. *(I did not submit the waitlist form — it is an outbound side-effect.)*

### Restaurant mobile (Android — `in.gozaika.restaurant`)

**RM-1 · P2 · BUG — ROI report under-reports vs web for the same restaurant/week.**
- More → ROI reports (Bawarchi, 29 Jun–06 Jul) shows ₹0 revenue, "0 / 0 bags", "0 Limited Drops listed", GMV ₹0, "Not enough data". The **web** ROI for the same restaurant over the overlapping week (30 Jun–6 Jul) showed 6/42 bags, GMV ₹894, net recovery ₹879.34, "4 Limited Drops listed". "0 Limited Drops listed" is clearly wrong (the dashboard shows 4 live drops). Honestly labelled "Estimated / Not enough data" (no fabrication) but misleading to the partner.
- Evidence: `rest-05-roi.png` vs web `reports` screenshot.
- Suggested fix: reconcile the mobile ROI window/query with the web `loadRoiReport`.

**RM-2 · P2 · Untestable — Role matrix + RestaurantSwitcher.**
- The Bawarchi role-matrix staff accounts (ADMIN/OPERATIONS/PICKUP_STAFF/FINANCE) require phone-OTP sign-in, which is blocked on hosted (CW-2), so role-scoped nav could not be exercised beyond the OWNER. The "More" menu does advertise correct role-awareness ("destinations follow your server role"). Needs a working sign-in to verify per-role scoping.

*Positives:* owner dashboard with real metrics (₹1,639 today, 48.5% sell-through, AOV ₹49.67), pickup-ready + live-drops cards; counter with filters and **native "Scan pickup QR" camera flow plus OTP entry — exceeds the web counter** (web only pastes a QR payload); role-aware "More" (Templates, ROI, Finance, Onboarding, Compliance, Profile, Reviews, Sign out); session persistence.

---

## 4. Launch-readiness checklist (pass/fail per critical flow)

| Flow | Consumer web | Consumer mobile | Restaurant portal | Restaurant mobile |
|---|---|---|---|---|
| Onboarding / consent | PASS | PASS (no re-consent needed) | PASS (onboarding/compliance complete) | — |
| Login (demo) | ⚠️ workaround only (CW-2) | ⚠️ session persisted; fresh OTP blocked | ⚠️ workaround only (RP-3) | ⚠️ session persisted; OTP blocked |
| Discovery (home / drops / map / restaurants) | PASS | PASS | n/a | n/a |
| Restaurant detail + Follow | PASS | PASS (follows shown) | n/a | n/a |
| Claim → hold created | PASS | PASS | n/a | n/a |
| Checkout → pay | PASS (real Razorpay test) | **FAIL (P0, CM-1)** | n/a | n/a |
| Order confirmation + pickup proof | PASS (in-app QR+OTP, hashed) | ⚠️ SMS-only (P1, CM-2) | n/a | n/a |
| Passport / discovery | ⚠️ cuisines=0 (P1, CW-1) | PASS (loyalty card real) | n/a | n/a |
| Swaad Club | PASS (honest coming-soon) | PASS | n/a | n/a |
| Account (holds pill / complete-payment / history) | PASS | PASS | n/a | n/a |
| Dashboard (metrics/sell-through/sparkline) | n/a | n/a | PASS | PASS |
| Drops list + status filters | n/a | n/a | PASS | PASS |
| New drop — publish from template | n/a | n/a | PASS (verified) | not exercised |
| Templates (create/edit) | n/a | n/a | PASS (⚠️ #418) | present |
| Counter — verify OTP/QR, no-show, incident | n/a | n/a | PASS (server-validated) | PASS (native QR scan) |
| Finance (settlement) | n/a | n/a | PASS (⚠️ "Orders 0") | present |
| Reports (ROI) | n/a | n/a | PASS | ⚠️ under-reports (RM-1) |
| Reviews | n/a | n/a | PASS | present |
| Role-aware nav / switcher | n/a | n/a | PASS (switcher untestable) | PASS (role-matrix untested) |

---

## 5. Before-launch fix list & fast-follow

**Before launch (P0/P1):**
1. **CM-1 (P0):** make the consumer-mobile checkout completable — enable `PAYMENTS_SIMULATOR_ENABLED` for the pilot (restores the gated simulator) or ship native Razorpay RN checkout.
2. **CW-2 (P1):** verify real OTP SMS delivery (Twilio) end-to-end and/or expose a controlled pilot login; confirm Google OAuth; turn off `NOTIFICATION_DRY_RUN` for the pilot so OTP/pickup codes actually send.
3. **CM-2 (P1):** show the in-app QR/OTP on the mobile order detail (parity with web) so pickup does not depend solely on SMS.
4. **CW-1 (P1):** fix Flavour Passport cuisines — add the missing RPC or repair the fallback join.

**Fast-follow (P2/P3):**
- RP-1 fix the portal-wide React #418 hydration error.
- RM-1 reconcile mobile ROI with web `loadRoiReport`.
- RP-2 populate the finance summary order count.
- MK-1 mark the marketing hero image `priority`; MK-2 add a restaurant-login link from marketing; MK-3 fix the duplicated title.
- CW-3 seed real template/restaurant photography to exercise the media pipeline.
- CM-3 pad the mobile pickup-toast inset so it stops overlapping CTAs.
- RP-4 restaurant-name header on Onboarding.

---

## 6. Parity gap analysis vs comparable apps

**Consumer (vs Swiggy / Zomato / DoorDash / Too-Good-To-Go):**
- **Strong:** allergen-first disclosure (best-in-class transparency, better than TGTG), rich filters/sort, follow rail, loyalty passport, honest hashed pickup proof, holds pill.
- **Gaps:** no real food photography (all competitors are photo-led); drops "Map view" has no pins (deliberate no-SDK decision D2, but the coordinate-list UX is weaker than competitor maps); no reorder / order-again; no push notifications or share-to-social from a claim; no live order tracking beyond a static timeline; mobile pickup proof is SMS-only where competitors show an in-app code/QR.

**Restaurant (vs Shopify / Square / Swiggy-partner):**
- **Strong:** publish-in-seconds from templates, per-drop sell-through with sparkline, ROI report with disclosed assumptions, finance settlement statements, server-validated counter with **native QR scan on mobile**, role-grouped nav — this is a genuinely mature console.
- **Gaps:** no in-portal review responses (read-only by design); no push/real-time new-order alert surfaced in the audit; multi-outlet switching unverified (single-membership seed); no bulk drop scheduling / recurring drops; analytics are weekly/estimated rather than real-time dashboards competitors offer.

---

## 7. Accessibility notes (per app)

- **Consumer web:** structural a11y is gate-enforced (axe in `web-ci`); the known dietary/allergen badge **color-contrast residual is confirmed present** (semantic badge accents on live cards) and remains the documented human sign-off item (D8) — not re-filed. Focus rings and heading order looked correct on the pages exercised. The **human keyboard + screen-reader walkthrough is still pending** (`docs/web/web-parity-audit.md`) and should be completed before launch — automated checks cannot cover it.
- **Restaurant portal:** same gate coverage; the #418 hydration error (RP-1) is a functional/console issue rather than a11y, but should be cleared. Human sign-off still pending.
- **Marketing site:** has its own axe spec; real photography needs descriptive alt (the hero alt is good). Verify the lazy hero (MK-1) doesn't leave an unlabeled empty region for AT users.
- **Consumer mobile / Restaurant mobile:** TalkBack sanity was **not** completable in depth because a clean fresh sign-in is blocked on hosted (CW-2); the pre-existing sessions let me exercise screens but not the first-run permission/consent prompts. A device TalkBack pass on discovery→claim and the counter verify flow is an outstanding human item. Touch targets, contrast, and skeleton/loading states looked good in the screens captured.

---

*Evidence:* `docs/audit/evidence-2026-07-05/` (web screenshots inline in-session; device screenshots `cust-01…09`, `rest-01…05`). Seed run: `demo_prepare_for_demo(p_create_live_drops => true)` created 5 fresh live drops across the 5 demo restaurants and rolled static drops D11–D17 forward. Note: 28 expired ACTIVE holds remain in the DB (the demo release job / `api_release_expired_inventory_holds` isn't scheduled on the remote project — availability accounting relies on it; worth confirming the Edge Function schedule before launch).*
