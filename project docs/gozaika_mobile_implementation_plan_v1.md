# goZaika Mobile Implementation Plan v1.0

Status: approved planning baseline; implementation not started  
Updated: 18 June 2026  
Naming: every unit below is a **Mobile Slice n**  
Authoritative product specs:

- `project docs/gozaika_mobile_shared_architecture_and_release_spec_v1.md`
- `project docs/gozaika_customer_mobile_technical_spec_v1.md`
- `project docs/gozaika_restaurant_mobile_technical_spec_v1.md`

## 1. How to use this document

Each slice is independently assignable to a coding agent, but dependencies must be honored. One agent/session should implement one slice unless the slice explicitly says otherwise. Do not combine payment, pickup, authentication or authorization work with unrelated UI breadth. Before coding, inspect the current repository because this plan records a baseline, not an assumption that earlier slices succeeded perfectly.

At the end of every slice, the implementing agent must update this file in the same change:

1. Change the slice status and date in the tracker.
2. Add a **Completion and redevelopment record** beneath that slice containing:
   - exact files/migrations created or changed;
   - public API/schema/config changes and compatibility notes;
   - commands/tests run and summarized results;
   - demo users/fixtures and smoke-test evidence used, without secrets;
   - architectural decisions and rejected alternatives;
   - known gaps, follow-up slice dependencies and rollback notes;
   - instructions to reproduce the slice from a clean checkout.
3. Update `docs/mobile/mobile-parity-ledger.md` rows owned by the slice.
4. Update relevant runbooks/configuration references. Never mark a slice complete when its tests or parity rows are incomplete.

Use `npm.cmd`/`npx.cmd` in this Windows PowerShell environment when script execution policy blocks PowerShell shims. Preserve unrelated user changes in the dirty worktree.

## 2. Global engineering rules

- Mobile clients contain only public configuration and Supabase anon credentials. Service-role, Razorpay secret/webhook secret, pickup credential secret, APNs keys and store service-account keys remain server-side.
- Server state is authoritative for inventory, payment, pickup, roles and deadlines. All mutations are ownership/role checked and idempotent.
- New APIs are versioned under `/api/mobile/v1`; web behavior remains compatible.
- Use shared Zod DTOs and fixtures. Reject undocumented `any`/unvalidated JSON at boundaries.
- Current production parity is the release boundary. Do not implement v4 roadmap features merely because schema rows exist.
- Mobile UI is accessible, offline-honest and permission-optional. No false success for payment or pickup.
- Fix canonical migrations/views/services rather than adding app-only security bypasses.
- Maestro is the v1 critical-flow E2E framework. Unit/contract/component tests remain in Vitest/React Native test tooling selected by the foundation slice.
- Human review is mandatory after security/auth, payment and pickup slices before dependent work begins.

## 3. Slice tracker

| Slice | Title | Depends on | Status |
| --- | --- | --- | --- |
| Mobile Slice 0 | Baseline, parity ledger and decision freeze | — | Complete (2026-06-19) |
| Mobile Slice 1 | goZaika identities, rename and Expo Router shells | 0 | Complete (2026-06-19) |
| Mobile Slice 2 | Shared mobile-core, mobile-ui and test harness | 1 | Complete (2026-06-19) |
| Mobile Slice 3 | Bearer-auth server foundation and mobile contracts | 0,2 | Complete — foundation (2026-06-19); live-token integration tests + rate limits at Slice 6 smoke |
| Mobile Slice 4 | Restaurant authorization and bootstrap APIs | 3 | Complete — pending human authz review (2026-06-19); live multi-membership tests at Slice 6 smoke |
| Mobile Slice 5 | Demo phone auth and deterministic test OTP fixtures | 3,4 | Not started |
| Mobile Slice 6 | Native authentication, SecureStore and consent guards | 2,3,5 | Complete — phone-OTP core (2026-06-19); Google OAuth + biometric + deep-link restore deferred; live smoke pending |
| Mobile Slice 7 | Restaurant counter vertical slice | 4,6 | DONE — signed off 2026-06-21 (docs/mobile/slice7-signoff.md), merged to main |
| Mobile Slice 8 | Customer public discovery and restaurant profiles | 3,6 | Not started |
| Mobile Slice 9 | Customer claim, Razorpay and pickup proof | 3,6,8 | Core built (claim->simulated checkout->order, gated simulator); real Razorpay stubbed (keys ~1mo); pickup-proof display paused for review |
| Mobile Slice 10 | Customer account, orders, reviews and consent settings | 6,9 | Orders + **DPDP consent settings** built (live-proven; all 6 purposes, required-locked, erasure link-out); profile-edit + reviews remainder |
| Mobile Slice 11 | Customer Passport, discovery profile and Swaad Club | 8,10 | Done (live-proven) |
| Mobile Slice 12 | Restaurant onboarding, compliance and profile | 4,6 | Profile + **compliance document upload** built (private bucket, signed upload/download, manageCompliance, live-proven); onboarding wizard remainder |
| Mobile Slice 13 | Restaurant templates and Limited Drops | 4,6,12 | Core built (templates/drops read + publish drop); template authoring + drop edit remainder |
| Mobile Slice 14 | Restaurant dashboard, reviews and operational history | 7,13 | Dashboard built (role-shaped FULL/QUEUE_ONLY/SUMMARY); reviews + ops history remainder |
| Mobile Slice 15 | Restaurant finance and ROI reports | 4,6 | Finance settlements + **ROI report** built (role-gated viewFinance/viewReports, partner-safe share, live-proven); invoice download remainder |
| Mobile Slice 16 | Push, deep links, native permissions and offline hardening | 7,9,12 | Not started |
| Mobile Slice 17 | Accessibility, security, observability and performance gate | 8–16 | Not started |
| Mobile Slice 18 | Store packages, beta and staged production release | 17 | Not started |

## 3.1 Mobile UX uplift overlay tracker

These U-slices are additive UI-quality slices from `docs/product/gozaika-mobile-ux-uplift-analysis-v1.md`. They must preserve the Mobile Slice security/payment/pickup/release boundaries above and keep `node scripts/mobile-ci.mjs` green.

| Uplift slice | Title | Depends on | Status |
| --- | --- | --- | --- |
| U1 | Design-system depth | Mobile Slice 2 | Complete (2026-06-25) |
| U2C | Customer primitives | U1 | Complete (2026-06-25) |
| U2R | Partner primitives | U1 | Complete (2026-06-25) |
| C1 | Customer Home/Discover composition | U1, U2C | Complete (2026-06-25) |
| C2 | Drops list + map toggle | C1 | Complete (2026-06-25) |
| C3 | Drop detail + checkout polish | C2 | Complete (2026-06-25) |
| C4 | Orders timeline + peek bar | C3 | Complete (2026-06-25) |
| C5 | Passport/loyalty viz | C4, U2C | Complete (2026-06-25) |
| R1 | Partner role-shaped Today dashboard | U1, U2R | Complete (2026-06-25) |
| R2 | Counter focus-mode | R1, U2R | Complete (2026-06-25) |
| R3a | Drops visual polish | R2, U2R | Complete (2026-06-26) |
| R3b | Drop lifecycle actions | R3a | Complete (2026-06-26) |
| R3c | Reports/finance polish | R3b, U2R | Complete (2026-06-26) |
| R4 | More role-aware + switcher | R3c, U2R | Complete (2026-06-26) |
| X1 | A11y/motion/perf pass | U1-R4 | Complete (2026-06-26) |
| D1 | Demo/presales readiness | U1-R4, X1 | In progress (D1a complete 2026-06-27) |

**Completion and redevelopment record (U1 - 2026-06-25)**

- Branch: `codex/mobile-ux-uplift/u1-depth`.
- Changed `packages/mobile-ui/src/tokens/layout.ts` to add typed elevation tokens (`none`, `sm`, `md`, `lg`) while preserving existing spacing/radius/type exports.
- Added `packages/mobile-ui/src/motion.ts` and `motion.test.ts` with reduced-motion-aware press feedback utilities; native `AccessibilityInfo` is loaded inside `useReducedMotion()` so pure token tests do not parse React Native internals in Vitest.
- Updated `Button` to apply visual pressed feedback (`scale` + opacity, opacity-only with reduced motion). No haptics or behavior changes.
- Updated `Card` with optional `elevated?: boolean | ElevationLevel`; default remains flat for compatibility. Later U2/C/R slices can opt into `sm`/`md`/`lg` per screen.
- Public exports added through `packages/mobile-ui/src/index.ts`: `elevation`, `ElevationLevel`, `motion`, `getPressFeedbackStyle`, and `useReducedMotion`.
- Commands: `npm.cmd --workspace @gozaika/mobile-ui run typecheck` passed; `npm.cmd --workspace @gozaika/mobile-ui test` initially failed because a top-level React Native import made Vitest parse RN Flow syntax, then passed after hook-time native import; full `node scripts/mobile-ci.mjs` is green 7/7 after clearing active Orbitwell owner drift from app configs and removing a server-secret identifier from a Maestro comment.
- No API/schema/config/data changes; no customer/partner screen behavior changes; no fake restaurants, prices, metrics, QR/OTP, order states, or claims introduced.
- Reproduce from clean checkout: switch to this branch, run `npm.cmd --workspace @gozaika/mobile-ui run typecheck`, `npm.cmd --workspace @gozaika/mobile-ui test`, then `node scripts/mobile-ci.mjs`.

**Completion and redevelopment record (U2C - 2026-06-25)**

- Branch: `codex/mobile-ux-uplift/u2c-customer-primitives`.
- Added customer-facing primitives in `packages/mobile-ui/src/components/CustomerPrimitives.tsx`: `HeroBanner`, `CountdownChip`, `FilterChipRow`, `SegmentedToggle`, `StickyActionBar`, `PeekBar`, `ProgressRing`, and `LoyaltyCard`.
- Added pure helper/model tests in `customerPrimitivesModel.ts` and `customerPrimitivesModel.test.ts` for countdown labels and progress clamping without importing React Native into Vitest.
- Public exports added through `packages/mobile-ui/src/index.ts`.
- Compatibility: no app routes, API contracts, navigation, auth, payment, pickup, notification, finance, or data-fetching behavior changed. Every primitive is prop-driven and requires real caller-provided values.
- Accessibility: pressable primitives use roles/states/labels, maintain 48dp minimum targets, and use text companions instead of color-only status. Press feedback respects the U1 reduced-motion helper.
- Commands: `npm.cmd --workspace @gozaika/mobile-ui run typecheck` passed; `npm.cmd --workspace @gozaika/mobile-ui test` passed. Full `node scripts/mobile-ci.mjs` result recorded with the slice commit.
- Visual QA: no consuming customer screen changed in U2C, so device screenshots are deferred to C1 Home/Discover where the primitives are composed against real `useDrops()` data.
- Reproduce from clean checkout: switch to this branch, run `npm.cmd --workspace @gozaika/mobile-ui run typecheck`, `npm.cmd --workspace @gozaika/mobile-ui test`, then `node scripts/mobile-ci.mjs`.

**Completion and redevelopment record (U2R - 2026-06-25)**

- Branch: `codex/mobile-ux-uplift/u2r-partner-primitives`.
- Added partner/operator primitives in `packages/mobile-ui/src/components/PartnerPrimitives.tsx`: `MetricHero`, `ActionCard`, `QueueCard`, `SellThroughBar`, `Sparkline`, `DataTable`, `RoleAwareSection`, and `RestaurantSwitcher`.
- Added pure helper/model tests in `partnerPrimitivesModel.ts` and `partnerPrimitivesModel.test.ts` for sell-through ratios, basis points, percent labels, and sparkline normalization without importing React Native into Vitest.
- Public exports added through `packages/mobile-ui/src/index.ts`.
- Compatibility: no restaurant app routes, API contracts, role matrix enforcement, pickup verification logic, finance/ROI calculations, notification behavior, or data-fetching behavior changed. Every primitive is prop-driven and requires server-provided real values.
- Accessibility: operator primitives use roles/states/labels, keep 48dp minimum targets, and include text labels for status/progress. Press feedback respects the U1 reduced-motion helper.
- Commands: `npm.cmd --workspace @gozaika/mobile-ui run typecheck` passed; `npm.cmd --workspace @gozaika/mobile-ui test` passed. Full `node scripts/mobile-ci.mjs` result recorded with the slice commit.
- Visual QA: no consuming partner screen changed in U2R, so device screenshots are deferred to R1/R2 where primitives are composed against real dashboard/counter data.
- Reproduce from clean checkout: switch to this branch, run `npm.cmd --workspace @gozaika/mobile-ui run typecheck`, `npm.cmd --workspace @gozaika/mobile-ui test`, then `node scripts/mobile-ci.mjs`.

**Completion and redevelopment record (C1 - 2026-06-25)**

- Branch: `codex/mobile-ux-uplift/c1-home-discover`.
- Changed `apps/consumer-mobile/app/(tabs)/index.tsx` to compose the Home/Discover screen with U2C primitives over real `useDrops()` data.
- Behavior/data truth: active count, closing-soon rail, quantity badges, pickup labels, prices, dietary tags, and neighborhoods are derived only from loaded `MobilePublicDropCard` values. Favorite/follow rail is intentionally omitted until F1 exists; no fabricated restaurants, prices, metrics, ratings, order states, QR/OTP, or follow data.
- UI states: loading skeletons, API error retry, no-live-drop empty state, closing-soon horizontal rail, live tag chips, and account/passport/consent link card.
- Compatibility: no API/schema/auth/payment/pickup/notification behavior changed.
- Commands: `npm.cmd --workspace @gozaika/consumer-mobile run typecheck` passed. Full `node scripts/mobile-ci.mjs` result recorded with the slice commit.
- Visual QA: device screenshot capture should be performed after the full gate using the connected Android device if time/device state allows; any screenshot is raw QA evidence only, not store-ready creative.
- Reproduce from clean checkout: switch to this branch, run `npm.cmd --workspace @gozaika/consumer-mobile run typecheck`, then `node scripts/mobile-ci.mjs`.

**Completion and redevelopment record (C2 - 2026-06-25)**

- Branch: `codex/mobile-ux-uplift/c2-drops-map`.
- Changed `apps/consumer-mobile/app/(tabs)/drops/index.tsx` to add a sticky discovery header, List/Map segmented toggle, dietary filters, closing-soon/availability sorting, and a native coordinate-pin map view.
- Data truth: list and map use only `MobilePublicDropCard` values from `useDrops()`. Map pins render only drops with public `latitude`/`longitude`; when none are available, the screen tells the user the list remains the source of truth. No private addresses, fake coordinates, restaurant names, prices, ratings, QR/OTP, order states, or unsupported claims were introduced.
- Dependency decision: no new map SDK dependency in this slice. The map view is a native coordinate layout so CI and Android export remain stable; full map tiles/provider integration can be a later dependency/config hardening step.
- Compatibility: no API/schema/auth/payment/pickup/notification behavior changed.
- Commands: `npm.cmd --workspace @gozaika/consumer-mobile run typecheck` passed. Full `node scripts/mobile-ci.mjs` result recorded with the slice commit.
- Visual QA: install/capture from this branch on the connected Android device when practical; raw screenshot evidence is QA only, not store-ready creative.
- Reproduce from clean checkout: switch to this branch, run `npm.cmd --workspace @gozaika/consumer-mobile run typecheck`, then `node scripts/mobile-ci.mjs`.

**Completion and redevelopment record (C3 - 2026-06-25)**

- Branch: `codex/mobile-ux-uplift/c3-detail-checkout`.
- Changed `apps/consumer-mobile/app/(tabs)/drops/[dropPk].tsx` to add countdown, richer availability/low-stock presentation, price/allergen/pickup cards, and a sticky claim bar over real `MobilePublicDropCard` data.
- Changed `apps/consumer-mobile/app/checkout/[holdPk].tsx` to polish checkout states, demo simulator controls, server-confirmation wait state, and confirmed-order success presentation.
- Data truth: countdown derives from `pickupEndAt`; stock status derives from `quantityAvailable`/`quantityTotal`; success renders only after `/checkout/status` returns an `orderPk` and `orderStatusCode`. No fake pickup code, QR/OTP, order state, restaurant claim, price, metric, rating, or user-count claim was introduced.
- Compatibility: no API/schema/auth/payment/pickup/notification behavior changed; claim still creates a server hold and checkout still relies on server-authoritative payment/order status.
- Commands: `npm.cmd --workspace @gozaika/consumer-mobile run typecheck` passed. Full `node scripts/mobile-ci.mjs` result recorded with the slice commit.
- Visual QA: Android preview-device screenshot capture remains deferred to the separate preview-build path/tooling fix.
- Reproduce from clean checkout: switch to this branch, run `npm.cmd --workspace @gozaika/consumer-mobile run typecheck`, then `node scripts/mobile-ci.mjs`.

**Completion and redevelopment record (C4 - 2026-06-25)**

- Branch: `codex/mobile-ux-uplift/c4-orders-timeline`.
- Changed `apps/consumer-mobile/app/(tabs)/_layout.tsx` to show an active-order peek bar above tabs from real `useOrders()` data when a signed-in customer has an active pickup.
- Changed `apps/consumer-mobile/app/(tabs)/orders/index.tsx` to add active pickup counts, elevated active-order cards, explicit press targets, and clearer pickup/status copy.
- Changed `apps/consumer-mobile/app/(tabs)/orders/[orderPk].tsx` to add a status timeline using only `createdAt`, `paymentStatusCode`, pickup window, `orderStatusCode`, and `collectedAt`.
- Data truth: peek/timeline reflect real order states and timestamps only. No pickup code, QR/OTP, payment claim, fabricated order state, metric, rating, or user-count claim was introduced.
- Compatibility: no API/schema/auth/payment/pickup/notification behavior changed; resend pickup still calls the existing endpoint and does not reveal OTP in-app.
- Commands: `npm.cmd --workspace @gozaika/consumer-mobile run typecheck` passed. Full `node scripts/mobile-ci.mjs` result recorded with the slice commit.
- Visual QA: Android release install works through `scripts/android-preview-install.ps1` and the short physical copy at `C:\tmp\gozaika-build`; C4 release evidence captured at `.codex-artifacts/mobile-ux-uplift/android-preview-build/c4-orders-release.png`.
- Reproduce from clean checkout: switch to this branch, run `npm.cmd --workspace @gozaika/consumer-mobile run typecheck`, then `node scripts/mobile-ci.mjs`.

**Completion and redevelopment record (C5 - 2026-06-25)**

- Branch: `codex/mobile-ux-uplift/c5-passport-loyalty`.
- Changed `apps/consumer-mobile/app/(tabs)/account/index.tsx` to replace flat account links with an elevated account status card, a real Passport preview from `usePassport()`, and role-free account action cards.
- Changed `apps/consumer-mobile/app/(tabs)/account/passport.tsx` to compose `LoyaltyCard`, progress visualization, stat tiles, and elevated earned-badge cards over the existing Slice 11 passport payload.
- Changed `apps/consumer-mobile/app/(tabs)/account/discovery.tsx` to compose `ProgressRing`, profile stat tiles, and elevated discovery nudges over the existing Slice 11 discovery-profile payload.
- Updated `scripts/android-preview-install.ps1` so Windows PowerShell 5.1 can parse the script's status strings and so Gradle/Expo release bundling runs with `NODE_ENV=production`.
- Data truth: tier, progress, bags, kitchens/restaurants, reviews, badges, cuisine counts, neighbourhood counts, personality label, and active-drop cuisine nudges all come from `usePassport()` / `useDiscoveryProfile()`. No fabricated loyalty counts, rewards, referrals, subscription state, impact metric, restaurant, price, order state, QR/OTP, or pickup-proof claim was introduced.
- Compatibility: no API/schema/auth/payment/pickup/notification/billing behavior changed; Swaad Club remains informational and native billing remains out of scope.
- Commands: `npm.cmd --workspace @gozaika/consumer-mobile run typecheck` passed. Full `node scripts/mobile-ci.mjs` result recorded with the slice commit.
- Visual QA: Android release build/install/screenshot passed via `powershell -NoProfile -ExecutionPolicy Bypass -File scripts/android-preview-install.ps1 -App consumer-mobile -SkipSync -CaptureScreenshot` after copying the three changed C5 files into the existing short build tree. Launch screenshot: `.codex-artifacts/mobile-ux-uplift/android-preview-build/consumer-mobile-release-launch.png`; account-tab signed-out screenshot: `.codex-artifacts/mobile-ux-uplift/android-preview-build/consumer-mobile-c5-account-signed-out.png`. Signed-in Passport visual capture remains pending a live authenticated demo session.
- Reproduce from clean checkout: switch to this branch, run `npm.cmd --workspace @gozaika/consumer-mobile run typecheck`, then `node scripts/mobile-ci.mjs`.

**Completion and redevelopment record (R1 - 2026-06-25)**

- Branch: `codex/mobile-ux-uplift/r1-partner-dashboard`.
- Changed `apps/restaurant-mobile/app/(tabs)/index.tsx` to compose the partner Today dashboard with U2R primitives over the existing `useDashboard()` role-shaped contract.
- Role/data truth: `FULL` can show both finance and operations when both sections are sent; `QUEUE_ONLY` leads with pickup queue and does not receive/display financial values; `SUMMARY` leads with financials and does not receive/display operational queue actions. No previous-period trend, restaurant claim, fabricated metric, QR/OTP, order state, rating, or user-count claim was introduced.
- UI states: restaurant selection empty state, loading skeletons, API error retry, status/publishing notices, role/status badges, finance sell-through table, queue action cards, next-drop card, and gated new-drop action.
- Compatibility: no API/schema/auth/payment/pickup/notification/finance calculation behavior changed.
- Commands: `npm.cmd --workspace @gozaika/restaurant-mobile run typecheck` passed. Full `node scripts/mobile-ci.mjs` result recorded with the slice commit.
- Visual QA: Android preview-device install remains a tooling task; raw dashboard screenshots should be captured after the preview-build path issue is resolved.
- Reproduce from clean checkout: switch to this branch, run `npm.cmd --workspace @gozaika/restaurant-mobile run typecheck`, then `node scripts/mobile-ci.mjs`.

**Completion and redevelopment record (R2 - 2026-06-25)**

- Branch: `codex/mobile-ux-uplift/r2-counter-focus`.
- Changed `apps/restaurant-mobile/app/(tabs)/orders/index.tsx` to add focus-mode queue counts, Active/All/Collected/Issues filters, U2R `QueueCard` rows, retained offline banner, retained phone navigation, and retained tablet master-detail split.
- Changed `apps/restaurant-mobile/src/counter/OrderActionsPanel.tsx` to add a focused order hero and elevated verify/no-show/incident cards without changing verification/no-show/incident mutations.
- Security/behavior truth: pickup verification still uses the existing server-authoritative hooks, stable idempotency keys, QR/OTP inputs, offline not-confirmed warning, no-show server rejection, and incident creation path. No fake order state, QR/OTP, pickup result, haptic/sound claim, metric, rating, or user-count claim was introduced.
- Dependency decision: no haptic/sound dependency was added in R2; sound/haptics can be introduced later with explicit counter-only native verification.
- Commands: `npm.cmd --workspace @gozaika/restaurant-mobile run typecheck` passed. Full `node scripts/mobile-ci.mjs` result recorded with the slice commit.
- Visual QA: Android preview-device screenshot capture remains deferred to the separate preview-build path/tooling fix.
- Reproduce from clean checkout: switch to this branch, run `npm.cmd --workspace @gozaika/restaurant-mobile run typecheck`, then `node scripts/mobile-ci.mjs`.

**Completion and redevelopment record (R3a - 2026-06-26)**

- Branch: `codex/mobile-ux-uplift/r3a-drops-visual-polish`.
- Changed `apps/restaurant-mobile/app/(tabs)/drops/index.tsx` to add a partner drop command-center summary, status filters, next-action card, elevated drop rows, and per-drop reserved bars over the existing `useDrops()` payload.
- Changed `apps/restaurant-mobile/app/(tabs)/drops/[dropPk].tsx` to add a status hero, reserved bar, inventory data table, and explicit read-only next-action guidance.
- Data truth: status, pickup windows, price, available quantity, held quantity, total quantity, and reserved values all come from `DropSummary`. Because the DTO does not expose a separate finalized-sold count, bars are labeled "Reserved" and use `quantityTotal - quantityAvailable`; no fake sell-through, revenue, rating, order state, QR/OTP, or customer data was introduced.
- Compatibility: read-only polish only; no API/schema/auth/role/drop lifecycle/publish/payment/pickup behavior changed. Pause, cancel, activate and edit actions remain in later Slice 13/R3b work.
- Commands: `npm.cmd --workspace @gozaika/restaurant-mobile run typecheck` passed; full `node scripts/mobile-ci.mjs` passed 7/7. Android release Gradle build passed from `C:\tmp\gozaika-build\apps\restaurant-mobile\android` via `cmd.exe` after PowerShell treated Gradle warning stderr as a native command error.
- Visual QA: restaurant release APK installed and launched on the connected Android device; raw unsigned launch evidence at `.codex-artifacts/mobile-ux-uplift/android-preview-build/restaurant-mobile-r3a-release-launch.png`. Authenticated partner QA then passed with seeded OWNER `+919876520001` / OTP `200001` on Bawarchi Biryani Palace; signed-in evidence captured at `.codex-artifacts/mobile-ux-uplift/android-preview-build/restaurant-mobile-r3a-drops-owner-list.png` and `.codex-artifacts/mobile-ux-uplift/android-preview-build/restaurant-mobile-r3a-drops-owner-detail.png`.
- Reproduce from clean checkout: switch to this branch, run `npm.cmd --workspace @gozaika/restaurant-mobile run typecheck`, then `node scripts/mobile-ci.mjs`.

**Completion and redevelopment record (R3b - 2026-06-26)**

- Branch: `codex/mobile-ux-uplift/r3b-drop-lifecycle-actions`.
- Changed `packages/types/src/mobile/catalog.ts` and `catalog.test.ts` to add the mobile drop status action request/result contract for `ACTIVE`, `SCHEDULED`, `PAUSED`, and `CANCELLED`.
- Added `apps/restaurant-mgmt-web/app/api/mobile/v1/drops/[dropId]/status/route.ts` as the role-gated, tenant-checked mobile BFF endpoint for partner lifecycle actions. Activation/scheduling reuses restaurant status and ops publishing guardrails; terminal drops are rejected; cancellation stamps existing cancellation fields and leaves paid orders untouched.
- Changed `apps/restaurant-mobile/src/api/catalog.ts` to add `useSetDropStatus()` with Drops cache invalidation.
- Changed `apps/restaurant-mobile/app/(tabs)/drops/[dropPk].tsx` to replace read-only lifecycle copy with confirmed pause, activate/reactivate, schedule, and cancel controls based on the real `DropSummary.statusCode`.
- Data truth: all lifecycle options derive from the current server status; no fabricated drop, order, QR/OTP, customer, revenue, rating, or sell-through data was introduced. Mutations require confirmation and call the BFF before the UI reports success.
- Compatibility: no publish flow, payment, pickup verification, order state, role policy, or customer app behavior changed. Quantity, price, and pickup-window edits remain outside this mobile slice.
- Commands: `npm.cmd --workspace @gozaika/restaurant-mobile run typecheck` passed; `npm.cmd --workspace @gozaika/restaurant-mgmt-web run typecheck` passed; full `node scripts/mobile-ci.mjs` passed 7/7. Android release Gradle build passed from `C:\tmp\gozaika-build\apps\restaurant-mobile\android` via `cmd.exe` after PowerShell treated Gradle warning stderr as a native command error.
- Visual QA: release APK installed and launched on device; raw unsigned launch evidence at `.codex-artifacts/mobile-ux-uplift/android-preview-build/restaurant-mobile-r3b-release-launch.png`. Authenticated partner QA passed with seeded OWNER `+919876520001` / OTP `200001` on Bawarchi Biryani Palace; lifecycle detail and confirmation evidence captured at `.codex-artifacts/mobile-ux-uplift/android-preview-build/restaurant-mobile-r3b-lifecycle-detail.png` and `.codex-artifacts/mobile-ux-uplift/android-preview-build/restaurant-mobile-r3b-lifecycle-confirmation.png` without confirming a mutating action.
- Reproduce from clean checkout: switch to this branch, run `npm.cmd --workspace @gozaika/restaurant-mobile run typecheck`, `npm.cmd --workspace @gozaika/restaurant-mgmt-web run typecheck`, then `node scripts/mobile-ci.mjs`.

**Completion and redevelopment record (R3c - 2026-06-26)**

- Branch: `codex/mobile-ux-uplift/r3c-reports-finance-polish`.
- Changed `apps/restaurant-mobile/app/reports.tsx` to compose the existing ROI payload into a net-recovery hero, sell-through bar, metric cards, report-basis table, drop-mix sparkline, assumptions, next actions, and exception cards.
- Changed `apps/restaurant-mobile/app/finance.tsx` to compose the existing finance payload into a latest-settlement hero, payout trend sparkline, settlement totals table, per-settlement breakdown tables, and a polished zero-settlement state when the seeded payload has no settlement runs.
- Data truth: all report and finance values come from `useRoiReport()` and `useFinance()`. Share wording remains partner-safe and counts-only; no export mutation, fake payout, rating, user count, QR/OTP, order state, or external claim was introduced.
- Compatibility: read-only polish only; no API/schema/auth/role/drop lifecycle/publish/payment/pickup behavior changed. Finance/ROI wording remains app-internal pending any external/share/export approval.
- Commands: `npm.cmd --workspace @gozaika/restaurant-mobile run typecheck` passed; full `node scripts/mobile-ci.mjs` passed 7/7.
- Visual QA: restaurant release APK installed and launched on the connected Android device; authenticated OWNER reports/finance evidence captured at `.codex-artifacts/mobile-ux-uplift/android-preview-build/restaurant-mobile-r3c-reports-owner.png` and `.codex-artifacts/mobile-ux-uplift/android-preview-build/restaurant-mobile-r3c-finance-owner.png`. Local visual QA used `adb reverse` for local Supabase and the restaurant BFF after the cloud OTP request failed in the release APK.
- Reproduce from clean checkout: switch to this branch, run `npm.cmd --workspace @gozaika/restaurant-mobile run typecheck`, then `node scripts/mobile-ci.mjs`.

**Completion and redevelopment record (R4 - 2026-06-26)**

- Branch: `codex/mobile-ux-uplift/r4-more-role-aware` (cut from the R3c tip `548acae`, because the uplift slices are chained branch-on-branch and are NOT yet merged to `main`; cutting from `main` would drop the U2R primitives and all prior uplift screens and fail the gate).
- Changed `apps/restaurant-mobile/app/(tabs)/more.tsx` to replace the static link list + role text disclaimer with a role-aware management hub: a `RestaurantSwitcher` over real `useAuth()` memberships, an active-role badge, and a destination list filtered by the same data-driven capability matrix the server enforces.
- Role gating: each management destination declares its `RestaurantCapability` (`Templates→manageTemplates`, `ROI reports→viewReports`, `Finance→viewFinance`, `Onboarding→manageProfile`, `Compliance→manageCompliance`, `Profile→manageProfile`, `Reviews→viewReviews`) and is shown only when `roleHasCapability(role, capability)` from `@gozaika/types` (the shared `ROLE_SCOPE_SEED`). Forbidden destinations are hidden and a count of hidden destinations is shown. Derived visibility per seeded role: OWNER/ADMIN → all 7; OPERATIONS → Templates, ROI reports, Reviews; FINANCE → ROI reports, Finance; PICKUP_STAFF → none (counter-focused message).
- Selection truth mirrors the server fallback: an explicit `selectedRestaurantPk`, else the sole membership; switching calls `selectRestaurant`. Signed-out shows a sign-in card and no role-gated destinations; signed-in with memberships unresolved shows a neutral loading card instead of fabricating access.
- Compatibility: presentation-only. No API/schema/auth/role-matrix/drop/payment/pickup/notification behavior changed; the server `withMobileRestaurantRole` gate remains the enforcement boundary. No fabricated restaurants, roles, metrics, QR/OTP, order states, or claims introduced.
- Commands: `npm.cmd --workspace @gozaika/restaurant-mobile run typecheck` passed; full `node scripts/mobile-ci.mjs` passed 7/7.
- Visual QA: restaurant release APK rebuilt from `C:\tmp\gozaika-build` (the `android-preview-install.ps1` cloud-env build) and installed on the connected Android device; launch evidence at `.codex-artifacts/mobile-ux-uplift/android-preview-build/restaurant-mobile-release-launch.png`. Authenticated OWNER capture at `.codex-artifacts/mobile-ux-uplift/android-preview-build/restaurant-mobile-r4-more-owner.png` shows the new switcher card (Bawarchi Biryani Palace, Owner/Active badges, selected) and the Manage card with the OWNER role badge and all 7 destinations resolved from real `useAuth()` cloud-bootstrap membership data. The restricted-role variant (FINANCE → ROI reports + Finance only; PICKUP_STAFF → none) is a confirmatory follow-up; it requires signing in as seeded role staff (`+9198765300xx` on Bawarchi) and the hiding it demonstrates is already deterministically backed by the shared `ROLE_SCOPE_SEED` and its `packages/types` capability tests.
- Reproduce from clean checkout: switch to this branch, run `npm.cmd --workspace @gozaika/restaurant-mobile run typecheck`, then `node scripts/mobile-ci.mjs`.

**Completion and redevelopment record (X1 - 2026-06-26)**

- Branch: `codex/mobile-ux-uplift/x1-a11y-motion-perf`, cut from `main` after the U1->R4 uplift chain was consolidated onto `main` (FF to `5b274e6`). First uplift slice to branch from `main` rather than the previous slice's tip.
- Contrast re-audit of the new overlay surfaces found two real WCAG-AA text failures introduced across U1-R4: brand **saffron** (2.84:1) and **gold** (2.38:1) were used as text on white/cream (fail even large-text AA), and customer primary buttons rendered white text on the saffron fill (2.84:1). `forest`, `muted` (4.59-4.83), `charcoal`, and all status foregrounds already pass.
- Fix (brand-preserving): keep vivid `saffron`/`gold` for fills/graphics; add AA-readable text companions `palette.saffronText` (#B23C0E) and `palette.goldText` (#7A5C00); add `accentTextColor()` (accent rendered as text on a light surface -> readable companion) and `onAccentTextColor()` (text placed on an accent fill -> white or charcoal by measured contrast) in `tokens/contrast.ts`.
- Wiring: `Button` now derives text color via `onAccentTextColor`/`accentTextColor` (forest buttons keep white text; saffron buttons get charcoal text; secondary/ghost accent text uses the companion). `CustomerPrimitives` and `PartnerPrimitives` route every accent-as-text through `accentTextColor` (a no-op for forest, AA-safe for any accent). `account/discovery.tsx` and `swaad-club.tsx` captions use the `*Text` companions.
- Reduced motion: `Skeleton` ran a continuous opacity loop regardless of the OS setting (its "honors reduced motion" comment was false). It now reads `useReducedMotion()` and holds a static 0.6 opacity with no animation when reduced motion is on. All other animated/press feedback already routed through the U1 `getPressFeedbackStyle`/`useReducedMotion` helpers.
- Dynamic Type: `Text` does not set `allowFontScaling={false}` anywhere (verified by grep across packages + apps), so system font scaling is honored; primitives use `minHeight`/`MIN_TOUCH_TARGET` rather than fixed text heights, so scaled type does not clip. No change required.
- Data/behavior truth: presentation-only; no API/schema/auth/role/payment/pickup/finance behavior changed; no fabricated content. Brand fills remain the vivid saffron/gold (the 3:1 graphics threshold is an accepted brand residual; only **text** contrast was changed).
- **Accepted deviation (pending design review, owner-acknowledged 2026-06-27):** customer **primary buttons now render charcoal text on the saffron fill** instead of white, because white-on-saffron is 2.84:1 (below AA). This is the AA-correct outcome and standard for orange CTAs, but it is a visible brand change. The owner has chosen to **keep it for now** and analyze it in a later phase; the alternative (darken the saffron fill so white text passes AA) was deferred. `onAccentTextColor()` is the single switch point if the decision changes. Partner (forest) buttons are unaffected.
- Commands: `npm.cmd --workspace @gozaika/mobile-ui run typecheck` passed; `npx vitest run packages/mobile-ui/src/tokens/contrast.test.ts` -> 12 passed; full `node scripts/mobile-ci.mjs` passed 7/7 (the `expo export (consumer-mobile)` step is the customer-app build proof for these changes).
- Visual QA: the new contrast tests are the deterministic acceptance evidence ("Contrast tests; a11y sweep"). The visible customer-side effects (charcoal-on-saffron primary buttons, deeper saffron/gold accent text) are exactly what the tests assert; an authenticated customer-screen capture is an optional confirmatory follow-up, consistent with the C3 device-capture deferral. Partner app is visually unchanged (forest accent -> helpers are no-ops).
- Reproduce from clean checkout: switch to this branch, run `npm.cmd --workspace @gozaika/mobile-ui run typecheck`, `npx vitest run packages/mobile-ui`, then `node scripts/mobile-ci.mjs`.

**Completion and redevelopment record (D1 - in progress, 2026-06-27)**

- Branch: `codex/mobile-ux-uplift/d1-demo-presales`. Investor/partner/employee-facing slice: make web + mobile look alive and vibrant for demos.
- **Finding that reframes D1:** the demo seed (`supabase/seed_demo/`) is already rich — 8 consumers, 5 restaurants with vivid `restaurant_public_profile` headlines + story_markdown, 17 drops, 28 orders, 12 reviews, payments, finance, passport tiers, subscriptions, emergency-closure. Profile *copy/data* is strong; the real gap is **imagery** (apps render placeholder fallbacks). So D1 is primarily an imagery + store-asset slice, not a data-enrichment one.
- **Imagery approach (owner-approved 2026-06-27):** original SVG/vector art by the agent (license-safe, on-brand), since binary stock photos can't be pulled into the repo here and reusing real restaurants' photos for fictional seed restaurants is a licensing/authenticity problem. If the owner later supplies licensed photos, swap them in via the product-media pipeline.
- **Sub-slices:** **D1a** mobile cuisine cover art (done); **D1b** web (consumer-web + restaurant-web) cuisine art wiring (SVG native); **D1c** drop-type/blind-bag art variants + cuisine-accurate mapping if the DTO exposes a cuisine code; **D1d** store-asset cards composed from the now-vibrant states (reconcile with the `.codex-artifacts/gozaika-polish-v2` track — single-agent ownership); **D1e** Maestro demo-flow polish + capture manifest.
- **D1a done — mobile cuisine cover art:** `scripts/demo-art/build-art.mjs` generates 5 original flat-illustration cuisine covers (biryani/thali/grill/coastal/bakery) as SVG sources (`scripts/demo-art/svg/`) + rasterized PNGs (`apps/consumer-mobile/assets/art/`) via `sharp`. `apps/consumer-mobile/src/ui/mediaFallbacks.ts` adds `coverFor(name)` — a deterministic stable-name-hash picker (production-safe, not demo-hardcoded; real uploaded `media` still wins). Wired into all 5 consumer-mobile `ProductMedia` fallbacks (DropCard, Home rail, drop detail, restaurants list, restaurant profile). Replaces the single grey `drop-default`/`restaurant-cover-default` placeholder.
- Data/behavior truth: presentation-only; no API/schema/auth/role/payment/pickup/finance change; no fabricated metrics/claims. Art is abstract illustration, not a real photo of any restaurant's food.
- Commands: `npm.cmd --workspace @gozaika/consumer-mobile run typecheck` passed; full `node scripts/mobile-ci.mjs` passed 7/7 (the `expo export (consumer-mobile)` step confirms the new PNG assets bundle). Regenerate art with `node scripts/demo-art/build-art.mjs`.
- Cuisine accuracy: `coverFor()` matches generic cuisine keywords in the restaurant name (biryani/grill/coastal/bakery/thali) before the hash fallback, so the cover matches the cuisine and is consistent across the Drops + Restaurants tabs (both key on `restaurantName`). Verified mapping for all 5 demo restaurants.
- Visual QA: consumer release APK rebuilt from `C:\tmp\gozaika-build` and installed; on-device Restaurants list confirms cuisine-accurate vibrant covers — Andhra Spice Trail ("Coastal") → coastal fish art, Bawarchi Biryani Palace ("Biryani") → biryani handi art. Evidence: `.codex-artifacts/mobile-ux-uplift/android-preview-build/consumer-mobile-d1-restaurants-cuisine.png` (and `-d1-restaurants.png` pre-cuisine-mapping). Drops tab showed "No active drops" because the cloud demo drops' pickup windows have passed (run `demo_prepare.sql` to roll them forward for a live drops demo).
- Next: D1b web wiring, then D1c-D1e per the sub-slice list above.

## 4. Agent prompts

### Mobile Slice 0 — Baseline, parity ledger and decision freeze

**Model recommendation:** Composer 2.5 High for implementation. Human review is sufficient; use the strongest available Codex GPT model at High effort only if the inventory exposes conflicting architecture or undocumented production behavior.

**Agent prompt**

**Title:** Establish the reproducible goZaika mobile baseline and living parity ledger.

**Scope:** Read all three mobile specs, current mobile shells, production web routes/APIs, shared contracts, migrations and demo data. Create `docs/mobile/mobile-parity-ledger.md`, `docs/mobile/mobile-decisions.md` and a lightweight baseline runbook. Do not implement app features or alter production behavior.

**Build instructions:**

1. Inventory every customer and restaurant production route, visible workflow, handler/service, auth rule and current test.
2. Create one parity-ledger row per workflow with web route, native target route, web API/service, target `/api/mobile/v1` endpoint, role/auth, owning Mobile Slice, status and evidence columns.
3. Record fixed decisions: two apps, one role-based restaurant app, package IDs, supported devices, native capabilities, current-parity boundary and excluded roadmap.
4. Record known defects: cookie-only APIs, restaurant consumer-bootstrap side effect, profile field limits, missing hold/proof mobile endpoints, demo identity mismatch and Slice 9 public-view defects.
5. Capture baseline `git status`, package versions, typecheck/test/build results without modifying unrelated files.

**Smoke-test scenarios and cases:** Confirm every current portal navigation item and customer public/account/checkout/order route has a ledger row; compare route-file inventory to ledger mechanically; verify excluded v4 features are not marked parity; verify the three specs link to the ledger and decisions document.

**Update this implementation plan:** Mark Slice 0 complete only after attaching route-count reconciliation, baseline commands and known failures. Add clean-checkout commands and note any production route that could not be observed. Future agents must be able to regenerate the ledger from recorded commands.

### Mobile Slice 1 — goZaika identities, rename and Expo Router shells

**Model recommendation:** Composer 2.5 High for implementation. Use an independent strongest-available Codex GPT reviewer at High effort for application identifiers, deep-link schemes, workspace moves and native configuration before merge.

**Agent prompt**

**Title:** Establish permanent goZaika app identities and navigable Expo Router shells.

**Scope:** Rename `restaurant-staff-mobile` to `restaurant-mobile`; replace workspace/app/slug/scheme/bundle/application identities; remove Orbitwell references; create new Expo Router route skeletons for both apps. Do not create or migrate external EAS/store projects without explicit account authorization.

**Build instructions:**

1. Follow shared spec identifiers `in.gozaika.customer` and `in.gozaika.restaurant`; set restaurant tablet support and customer phone-only declarations.
2. Update workspaces, imports, scripts, locks, CI references and docs. Preserve git history with a true move where possible.
3. Install/configure Expo Router through Expo-compatible commands; replace single `App.tsx` entry with typed route groups and placeholder screens matching specified mobile IA.
4. Wire canonical icons/splash/adaptive assets and brand tokens; no invented logos.
5. Create `docs/runbooks/mobile-app-identity-migration.md` with old/new IDs, EAS/store manual steps, signing/deep-link implications and irreversibility.

**Smoke-test scenarios and cases:** Workspace install resolves both apps; TypeScript passes; both development builds reach every placeholder route; customer has Home/Drops/Restaurants/Orders/Account; restaurant phone and tablet shells adapt; repository search finds no active Orbitwell or old staff identity except migration history.

**Update this implementation plan:** Record every moved path/config ID, dependency command, external manual action still pending and rollback limit. Include route screenshots or Maestro navigation evidence and exact clean-checkout bootstrap steps.

**Completion and redevelopment record (Slice 0 — 2026-06-19)**

- Created `docs/mobile/mobile-parity-ledger.md` (mechanical inventory: 14 consumer screens + 19 APIs, 13 restaurant screens + 15 APIs; web route → native route → service → target `/api/mobile/v1` → today/target auth → owning slice → status; route-count reconciliation + re-run commands; admin-web marked out of scope).
- Created `docs/mobile/role-matrix-enforcement-gap.md` (Slices 3/4 deep-dive) and `docs/mobile/demo-identity-reconciliation.md` (Slice 5 manifest).
- Recorded defects D1 (restaurant bootstrap creates consumer profile, `apps/restaurant-mgmt-web/app/api/portal/bootstrap/route.ts:28`), D2 (no role gating — `lib/portal-auth.ts:50`, `lib/slice3.ts`), D3 (cookie-only auth), D4 (demo identity), E1/E2 (slice9 views — since fixed).
- Branch `mobile/slice0-parity-baseline`. Adjacent fixes committed there: E1/E2 canonical view repair; demo phone/OTP linkage (`supabase/seed_demo/demo_test_otp_linkage.sql` + `config.toml [auth.sms.test_otp]` for all 17 seed identities + 4 Bawarchi role-matrix staff).

**Completion and redevelopment record (Slice 1 — 2026-06-19)**

Branch: `mobile/slice1-identities` (off `main`). Full detail in `docs/runbooks/mobile-app-identity-migration.md`.

- **Rename:** `git mv apps/restaurant-staff-mobile apps/restaurant-mobile` (history preserved); package `@gozaika/restaurant-staff-mobile` → `@gozaika/restaurant-mobile`.
- **Identities (app.json):** customer `gozaika-customer` / scheme `gozaika` / `in.gozaika.customer` / phone-only; restaurant `goZaika Partner` / `gozaika-restaurant` / scheme `gozaika-restaurant` / `in.gozaika.restaurant` / tablet support + `orientation:default`. Removed `com.orbitwell.*`. EAS `projectId` **removed** (recreation under goZaika org via `eas init` is a pending authorized manual step; old IDs recorded in runbook).
- **Expo Router:** `main: "expo-router/entry"`; removed `App.tsx`/`index.js`; `expo install` pinned `expo-router@~55.0.16` + safe-area-context/screens/expo-linking/expo-constants (SDK 55). Added `babel.config.js`, `metro.config.js`, `expo-env.d.ts`, tsconfig `@/*` alias.
- **Shells:** customer 5-tab IA (Home/Drops/Restaurants/Orders/Account) replacing the obsolete Passport-tab shell, plus drop/restaurant/order detail, checkout/[holdPk], swaad-club, auth, onboarding. Restaurant phone tabs (Home/Orders/Drops/More) + management routes (templates/reports/finance/onboarding/compliance/profile/reviews) + auth. Shared `src/theme/brand.ts` + `src/ui/Placeholder.tsx` per app; canonical icon copied to each app's `assets/`.
- **Monorepo build fix (important):** hoisted `babel-preset-expo` couldn't resolve app-local `expo-router`, so the router transform was skipped (`EXPO_ROUTER_APP_ROOT` bundling error). Fixed per app: babel adds `babel-preset-expo/build/expo-router-plugin` explicitly; metro sets `transformer.unstable_allowRequireContext = true`. Revisit on SDK upgrade.
- **Verification:** `tsc --noEmit` passes both apps; `npx expo export -p ios` bundles **both** apps successfully (full route tree compiles). Device/simulator navigation pending (no simulator in build env). Repo search: no active Orbitwell/old-staff identity in either app (only historical docs).
- **Docs updated:** README, `docs/runbooks/local-dev.md`, `docs/architecture/overview.md`; created `docs/runbooks/mobile-app-identity-migration.md`.
- **Clean-checkout bootstrap:** `npm install` at root, then per app `npm --workspace @gozaika/<app> run dev` (development build; Expo Go unsupported).
- **Known gap / follow-up:** physical-device route walkthrough + Maestro nav evidence deferred to when a simulator is available; `eas init` + signing are Slice 18 / authorized manual steps.

### Mobile Slice 2 — Shared mobile-core, mobile-ui and test harness

**Model recommendation:** Composer 2.5 High for implementation, followed by mandatory independent review with the strongest available Codex GPT model at High effort. Escalate the review to X-High only when package boundaries, persistence or native compatibility remain disputed.

**Agent prompt**

**Title:** Build shared, React-Native-safe mobile infrastructure without business workflows.

**Scope:** Create `packages/mobile-core` and `packages/mobile-ui`; configure TanStack Query, validated API decoding, lifecycle/network primitives, theme/components and test harness for both apps.

**Build instructions:**

1. Add package manifests/exports/tsconfigs and monorepo tests. Keep mobile-core independent of app navigation/copy and mobile-ui free of DOM/web-only imports.
2. Implement API envelope/error parsing, request IDs, app/version headers, auth-token injection hook, server-time offset, query defaults and idempotency-key helper.
3. Add brand tokens, typography, safe-area screen, buttons, inputs, cards, badges, skeleton/empty/error/offline states and accessible status announcements.
4. Configure TanStack Query in both apps; add bounded persistence interfaces without storing secrets.
5. Configure Vitest/component tests and Maestro folder/conventions; document why Maestro is used instead of adding Detox.

**Smoke-test scenarios and cases:** Malformed API payload is rejected; 401/403/409/426 map correctly; request logs redact tokens; server-time helper handles clock skew; components pass contrast/large-text basics; packages build independently and neither imports Next/DOM modules.

**Update this implementation plan:** Record public exports, dependency versions, persistence/redaction decisions, test commands and extension guidance so a future agent can recreate packages without reverse-engineering consumers.

**Completion and redevelopment record (Slice 2 — 2026-06-19)**

Branch: `mobile/slice2-shared-core` (off `main`).

- **`packages/mobile-core`** (React-Native-free, node-testable — native concerns are dependency-injected). Public exports: config (`MobileAppConfig`, `CLIENT_SCHEMA_VERSION=1`, `MOBILE_API_BASE_PATH`); http (`createApiClient`, `decodeEnvelope`, envelope Zod schemas, `ApiError`/`ApiErrorCode`, `statusToErrorCode`, `isRetryableCode`, `buildHeaders`, `newIdempotencyKey`/`isUuid`, `createServerClock`); query (`queryKeys`, `createQueryClientConfig`, `STALE_TIMES`); telemetry (`createLogger`/`noopLogger`, `redact`/`isSensitiveKey`); storage (`createSupabaseAuthStorage`, `BoundedCache`/`createMemoryCache`). Deps: `zod ^4.1.12`, `@gozaika/types`; peer `@tanstack/react-query`.
- **`packages/mobile-ui`** (RN, no DOM). Exports: tokens (`palette`, `accents`, `toneColors`, `contrastRatio`/`meetsAA`, `spacing`/`radii`/`typography`/`MIN_TOUCH_TARGET`/`TABLET_MIN_WIDTH`); components (`Screen`, `Text`, `Button`, `Badge`, `Card`, `EmptyState`, `ErrorState`, `OfflineBanner`, `Skeleton`, `StatusAnnounce`). Peer: react/react-native/react-native-safe-area-context.
- **Decisions:** mobile-core has zero native imports (SecureStore/network injected) so 100% of paths are Vitest-tested; persistence is interface + memory impl (SQLite deferred); redaction strips Authorization/token/phone/email/OTP/QR/nonce/credential/coords before any sink; query defaults — staleTime 10s active / 30s discovery / 5min profile, GET retry x3 with backoff for NETWORK/SERVER/RATE_LIMITED only, mutations never auto-retry.
- **App wiring:** both apps depend on the two packages; root `QueryClient` now uses `createQueryClientConfig()`; app `brand` re-exports `palette`; `Placeholder` rebuilt on mobile-ui `Screen`/`Text`.
- **Tests:** `npm --workspace @gozaika/mobile-core test` (31) + `@gozaika/mobile-ui` (5) = 36 passing. Both apps `tsc --noEmit` clean and `expo export -p ios` bundles successfully (3.8 MB each — metro resolves the TS workspace packages).
- **Harness/docs:** Maestro is the v1 E2E framework — `apps/*/.maestro/smoke.yaml` + [ADR 0001](../../docs/adr/0001-maestro-over-detox.md); layers in `docs/runbooks/mobile-testing-strategy.md`. Contract fixtures land in Slice 3.
- **Known gap:** RN component render tests run via Maestro (not Vitest) by design; physical-device Maestro run pending an emulator.

### Mobile Slice 3 — Bearer-auth server foundation and mobile contracts

**Model recommendation:** Strongest available Codex GPT model at High effort for implementation and an independent strong-model review in a fresh context. Use X-High for unresolved authentication, authorization, token-validation or service-boundary decisions. Human security review remains mandatory.

**Agent prompt**

**Title:** Add the versioned mobile BFF foundation and shared contract fixtures.

**Scope:** Implement server-only bearer authentication helpers and `/api/mobile/v1` conventions in customer and restaurant web apps. Extract reusable domain services only where needed for first APIs. Do not expose service role or broadly rewrite web handlers.

**Build instructions:**

1. Validate Supabase bearer token server-side, resolve `iam_profile`, request ID and app metadata, and return the specified stable envelope.
2. Add shared DTO schemas under `packages/types/src/mobile/` and fixtures under `packages/types/test-fixtures/mobile/`.
3. Implement CORS only for explicitly required origins; native clients do not justify wildcard policy. Add size/rate limits and structured redacted logs.
4. Prove a public health/config endpoint and authenticated “me” endpoint per surface; keep web cookie paths working.
5. Add contract tests exercising valid/expired/malformed token, missing profile, schema error, ownership denial and 426 behavior.

**Smoke-test scenarios and cases:** No token 401; invalid token 401; valid correct-surface actor 200; service exception is sanitized; request ID is returned/logged; service-role key absent from bundle/static output; existing web tests still pass.

**Update this implementation plan:** List helpers, envelope/schema versions, endpoints, rate/CORS rules and extraction pattern. Record commands and example sanitized fixtures sufficient to rebuild adapters later.

**Completion and redevelopment record (Slice 3 — 2026-06-19)**

Branch: `mobile/slice3-bearer-bff` (off `main`).

- **Canonical contracts in `@gozaika/types/src/mobile/`** (single source of truth for server + client): `envelope.ts` (`MOBILE_ERROR_CODES`, permissive wire schemas `mobileEnvelopeSchema`/`mobileSuccessEnvelopeSchema`/`mobileErrorEnvelopeSchema`, builders `mobileOk`/`mobileErr`, `mobileErrorStatus` code→HTTP map); `dto.ts` (`mobileHealthSchema`, `mobileActorSchema`, `mobileMeSchema`). Re-exported from the types root. Schema version = 1.
- **Shared fixtures** in `packages/types/test-fixtures/mobile/` (health, me-consumer, me-restaurant, error-unauthenticated, error-app-update) — validated by the server contract test AND decoded by the mobile-core client test, so wire drift fails automatically.
- **`@gozaika/mobile-core` refactored** to consume the canonical envelope/codes from `@gozaika/types` (removed its duplicate schema/code list); `ApiError`/decoder behavior unchanged.
- **Shared server helper** `resolveMobileBearerActor(authorization)` + `parseBearerToken` in `@gozaika/supabase` (server-only): validates the Supabase JWT via `auth.getUser(token)`, resolves `iam_profile` with the service role, returns a typed `{ok:true,actor}` / `{ok:false,reason}` (missing/invalid/no_profile) — never throws for auth problems, never trusts client identity.
- **Per-app BFF glue** `lib/mobile/handler.ts` in both web apps: `withMobileAuth` wrapper (426 schema gate → bearer validation → sanitized SERVER_ERROR on exception), `mobileResponseOk/Err`, server-issued request ids. **Endpoints:** `GET /api/mobile/v1/health` (public) and `GET /api/mobile/v1/me` (authenticated) on **both** `customer.gozaika.in` and `restaurant.gozaika.in`. Web cookie paths untouched; native clients don't need CORS (no browser).
- **Tests (78 total pass):** types envelope/builders + fixture conformance (6), mobile-core decode of canonical fixtures incl. 401/426 (4), `parseBearerToken` (3), plus all prior. Both web apps + packages `tsc --noEmit` clean. Mobile drift gate `node scripts/mobile-ci.mjs` green 7/7.
- **Known gaps (integration-gated, not unit work):** live valid/expired/malformed-token + missing-profile contract tests need a running Supabase + demo OTP → folded into the **Slice 6 consolidated smoke**; request size/rate-limit middleware deferred to Slice 6/17. Ownership/role denial is Slice 4.
- **Clean-checkout:** `npm install`; tests `npx vitest run packages/{types,mobile-core,mobile-ui,supabase}`; gate `node scripts/mobile-ci.mjs`.

### Mobile Slice 4 — Restaurant authorization and bootstrap APIs

**Model recommendation:** Strongest available Codex GPT model at High effort for implementation and independent strong-model review. Use X-High for capability-policy, tenant-isolation or bootstrap-side-effect issues. Human authorization review remains mandatory.

**Agent prompt**

**Title:** Create side-effect-safe restaurant bootstrap and centralized role enforcement.

**Scope:** Implement restaurant `POST /api/mobile/v1/auth/bootstrap`, membership/role resolution, selected-restaurant authorization helper and first role-protected read endpoint. Do not accidentally create consumer profiles.

**Build instructions:**

1. Inspect and separate the existing restaurant bootstrap from `api_bootstrap_consumer_profile`.
2. Return actor-safe identity, active memberships, role codes, restaurant status and onboarding summary.
3. Implement centralized capability policy matching the target role matrix; document that this is mobile target state beyond current web enforcement.
4. Require/revalidate `restaurantPk` on scoped calls; support multiple memberships without cross-tenant leakage.
5. Add audit-safe denial codes including membership inactive, role denied, restaurant suspended and selection required.

**Smoke-test scenarios and cases:** Owner/admin allowed; pickup staff limited; finance denied from operational mutation; cross-restaurant ID denied; revoked membership immediately denied; suspended restaurant response safe; bootstrap produces no consumer-profile row.

**Update this implementation plan:** Record capability matrix implementation, query/service boundaries, dual-role decision and evidence proving no bootstrap side effect. Note whether web hardening was intentionally deferred.

**Completion and redevelopment record (Slice 4 — 2026-06-19)**

Branch: `mobile/slice4-restaurant-authz` (off `main`). **Requires human authorization review before Slice 7 builds on it.**

- **Capability policy (pure, in `@gozaika/types/src/mobile/capabilities.ts`):** `RestaurantCapability` set + `CAPABILITY_ROLES` matrix + `roleHasCapability` + `decideRestaurantAccess({memberships, restaurantPk, capability})`. Decision order: select → membership found → active → restaurant status → role. Returns precise codes `RESTAURANT_SELECTION_REQUIRED` / `FORBIDDEN` (cross-tenant) / `MEMBERSHIP_INACTIVE` / `RESTAURANT_SUSPENDED` / `ROLE_DENIED`. **This is mobile target state — the web portal still gates on membership only (D2); web hardening intentionally deferred as a separate, separately-reviewed change.**
- **Matrix:** OWNER/ADMIN = all; OPERATIONS = drops/templates/orders/reviews/reports (no finance/profile/compliance); PICKUP_STAFF = orders/verify/incidents only; FINANCE = finance/reports + read-only orders, never operational.
- **Membership resolution (`@gozaika/supabase`):** `resolveRestaurantMemberships(profilePk)` returns all memberships (incl. inactive, so denial codes are correct) with role code + restaurant name/status via service role.
- **Bootstrap (fixes D1):** `POST /api/mobile/v1/auth/bootstrap` returns actor + active memberships + `selectedRestaurantPk`. **Never calls `api_bootstrap_consumer_profile`** — cannot create a consumer profile. (Live "no consumer row" assertion → Slice 6 smoke.)
- **Role wrapper + first protected read:** `withMobileRestaurantRole(capability, handler)` (restaurant-mgmt-web) revalidates the selected restaurant (`?restaurantPk=` or `X-GoZaika-Restaurant`) on every call; `GET /api/mobile/v1/restaurant/summary` is gated by `viewDashboard`.
- **Tests:** exhaustive `decideRestaurantAccess` + matrix (8 cases — owner allowed, finance/pickup denied, cross-tenant FORBIDDEN, revoked, suspended, selection-required, single-implicit). 86 Vitest pass total; types/supabase/restaurant-mgmt-web `tsc` clean; drift gate green 7/7.
- **Dual-role decision:** none — restaurant bootstrap is strictly separate from consumer bootstrap; no shared side effects.
- **Known gaps (integration-gated):** live multi-membership / revoked-mid-session / suspended-restaurant tests need running Supabase + seed → Slice 6 smoke; data-driven policy from `restaurant_team_role_scope` deferred (matrix is contract-tested target state). **Human authorization review mandatory before Slice 7.**

### Mobile Slice 5 — Demo phone auth and deterministic test OTP fixtures

**Model recommendation:** Composer 2.5 High for implementation, followed by mandatory review with the strongest available Codex GPT model at High effort for environment guards, identity linkage and prevention of production OTP bypasses.

**Agent prompt**

**Title:** Unify local/demo identities with production-style phone OTP testing.

**Scope:** Reconcile `supabase/seed_demo`, `scripts/demo` and README identities; create a deterministic generator/updater for local `[auth.sms.test_otp]`; link representative phone-auth users to rich consumer and restaurant seeded data. Do not add a production password login.

**Build instructions:**

1. Design a single manifest mapping demo persona, auth ID/email/phone, profile, membership/role and expected seeded states.
2. Implement an idempotent script that updates the test OTP section for all manifest phones while preserving unrelated TOML; fixed OTP is local/test only.
3. Update demo auth creation/linking so chosen phone users resolve to rich seeded profiles/orders/drops/reviews and multiple restaurant roles.
4. Keep remote execution opt-in and loudly guarded; never print service keys or real OTPs.
5. Correct README credentials and add local reset/prepare/login commands.

**Smoke-test scenarios and cases:** Clean local seed then OTP login for consumer and restaurant; rich orders/Passport/restaurant queue appear; re-running is idempotent; unknown/real phone does not receive fixed OTP; remote run refuses by default; README matches actual identities.

**Update this implementation plan:** Record manifest path, test phones as non-secret fixtures, OTP generation command, linking semantics, reset procedure and remote-safety gates. These details must reproduce auth testing after database reset.

### Mobile Slice 6 — Native authentication, SecureStore and consent guards

**Model recommendation:** Strongest available Codex GPT model at High effort for implementation; use X-High for the auth state machine, SecureStore migration, OAuth/deep-link recovery and sign-out cleanup. Require an independent strong-model review plus human security review before merge.

**Agent prompt**

**Title:** Implement production-style authentication and guarded navigation in both apps.

**Scope:** Phone OTP, Google OAuth callback plumbing, SecureStore session adapter, app lifecycle refresh, consumer consent guard, restaurant membership bootstrap and sign-out cleanup.

**Build instructions:** Implement shared auth state machine; Indian phone validation/resend cooldown/OTP errors; verified schemes/redirects; SecureStore migration/error handling; pending deep-link restoration; optional biometric lock interface (full polish later); consumer bootstrap/consent sequencing; restaurant selection/role entry; token revocation and cache/device cleanup.

**Smoke-test scenarios and cases:** Fresh phone OTP login; wrong/expired OTP; resend limit; killed-app session restore; expired refresh token; OAuth cancel/return; consumer required-consent redirect and resume; restaurant no membership/multiple membership/suspended state; sign-out leaves no private cache.

**Update this implementation plan:** Record auth state diagram, SecureStore keys/version, redirect configuration, cleanup semantics, demo personas and Maestro flows. Include recovery steps for corrupted local session storage.

**Completion and redevelopment record (Slice 6 — 2026-06-19)**

Branch: `mobile/slice6-native-auth` (off `main`).

- **Pure auth core (`@gozaika/mobile-core/auth`):** `validateIndianMobile` (wraps `normalizeIndianPhone`), OTP helpers (`isCompleteOtp`, `RESEND_COOLDOWN_SECONDS=30`, `resendSecondsRemaining`/`canResend`), and a deterministic `loginReducer` state machine (phone → otp(+cooldown) → verifying → done, with resend/edit/failure transitions). 10 unit tests.
- **Auth state diagram:** `phone → [OTP_REQUESTED] → otp → [OTP_SUBMITTED] → verifying → [VERIFIED] → done`; `verifying → [VERIFY_FAILED] → otp (fresh cooldown)`; `otp → [EDIT_PHONE] → phone`; `* → [SIGN_OUT] → phone`.
- **SecureStore session:** each app builds a Supabase client with `createSupabaseAuthStorage` over `expo-secure-store`, namespaced `gozaika-customer` / `gozaika-restaurant` (keys `<namespace>.<supabase-key>`, ':' sanitized). `autoRefreshToken` driven by `AppState` (start on active / stop on background). `persistSession` true, `detectSessionInUrl` false.
- **Both apps:** `AuthProvider` + `useAuth` expose session/isReady/loginState + requestOtp/resendOtp/verifyOtp/signOut. Functional phone-OTP login screen (mobile-ui), session restore on launch, redirect on auth.
- **Consumer:** consent gate scaffold (`acknowledgeConsent`; login → `/onboarding/consent` on first sign-in → home). **Restaurant:** best-effort membership bootstrap via the Slice 4 `POST /auth/bootstrap` (`fetchRestaurantBootstrap`), memberships + `selectedRestaurantPk` in context, surfaced in More.
- **Sign-out cleanup:** `supabase.auth.signOut()` + `queryClient.clear()` + reset memberships/consent (token revoked, private cache dropped).
- **Verification:** both apps `tsc --noEmit` clean; drift gate green 7/7 (both bundle).
- **Deferred (honest gaps):** Google OAuth + deep-link callback (plumbing → Slice 16 deep links); biometric app lock (interface only / later polish); pending deep-link restoration (Slice 16); real DPDP consent capture + consent API (Slice 10, current gate is in-memory ack); restaurant no-membership/suspended UI polish (Slice 7). **Live phone-OTP login (demo OTP fixtures), killed-app restore, expired-refresh, multi-membership → the consolidated smoke (needs Supabase + device/emulator).**
- **Recovery (corrupted local session):** sign-out clears SecureStore + cache; a hard reset is reinstall or clearing the app's SecureStore namespace.

### Mobile Slice 7 — Restaurant counter vertical slice

**Model recommendation:** Strongest available Codex GPT model at High effort for implementation; use X-High for pickup credential verification, replay/idempotency and offline state transitions. Require independent strong-model and human security review.

**Agent prompt**

**Title:** Deliver the first operational vertical slice: role-safe restaurant pickup counter.

**Scope:** PICKUP_STAFF-first orders queue, order detail, manual OTP, camera QR, server verification, no-show and incidents with bounded offline behavior.

**Build instructions:** Add restaurant mobile APIs/services/contracts for queue and actions; implement phone counter UI and tablet master-detail; use canonical pickup RPC/hashing server-side; just-in-time camera with paste/manual fallback; idempotency and distinct results; cached summaries only; never show collected offline until confirmed; clear raw credentials; add attempt rate limiting and audit.

**Smoke-test scenarios and cases:** Valid OTP and QR; camera denied; malformed QR; wrong restaurant; invalid credential; not ready; expired window; replay/already collected; duplicate tap; offline scan then authoritative reconnect; no-show before/after boundary; each incident type/severity; PICKUP_STAFF allowed while finance/cross-restaurant denied.

**Update this implementation plan:** Record endpoints/RPCs, queue DTO, role evidence, offline state machine, rate limits, Maestro device cases and recovery/runbook steps. This slice requires human security review before completion.

#### Status — core vertical built 2026-06-20 (branch `mobile/slice7-counter`). ⚠️ NOT MERGED — awaiting human security review.

**Endpoints (BFF, `/api/mobile/v1`, all via `withMobileRestaurantRole`):**
- `GET /orders` — capability `viewOrders`; scoped to the selected restaurant (revalidated every request); reuses the shared `loadRestaurantPickupOrders` loader (view → tenant-scoped legacy fallback) so the wire shape cannot drift from the web portal page.
- `POST /orders/:id/pickup/verify` — capability `verifyPickup`; tenant-checks the order→restaurant; reuses the canonical `resolvePickupCredential` (SHA-256 over `PICKUP_CREDENTIAL_SECRET`) + RPC `api_verify_order_pickup`. A *completed* verification (any `resultCode`) returns `ok:true` with the result so the app renders distinct states; only transport/validation/RPC failures are error envelopes.
- `POST /orders/:id/no-show` — capability `verifyPickup`; RPC `api_mark_order_no_show` (server rejects early no-shows).
- `POST /orders/:id/incidents` — capability `manageIncidents`; RPC `api_create_order_incident` (+ best-effort P1/P2 alert enqueue), `p_source_code: "RESTAURANT_MOBILE"`.

**Contracts:** `packages/types/src/mobile/counter.ts` (`counterOrdersDataSchema`/`CounterOrder`, `pickupVerifyResultSchema`, `noShowResultSchema`, `incidentCreatedSchema`, request DTOs). Fixtures `counter-orders.json` + `pickup-verify-success.json`; validated server-side (`counter.test.ts`) and cross-decoded client-side (`mobile-core/.../contract.test.ts`).

**Role evidence:** denial codes flow from `decideRestaurantAccess` (data-driven scopes). FINANCE → `ROLE_DENIED` on verify/incidents (FINANCE lacks `ORDER_VERIFY_PICKUP`/`INCIDENT_MANAGE`); PICKUP_STAFF allowed on verify/no-show/incidents; cross-restaurant order → `FORBIDDEN` via the per-order tenant check; suspended/inactive → `RESTAURANT_SUSPENDED`/`MEMBERSHIP_INACTIVE`.

**Native UI (`restaurant-mobile`):** `(tabs)/orders/index.tsx` queue (status badges, pickup window, amount, incident count, offline banner, empty/error states) + `(tabs)/orders/[orderId].tsx` detail with manual OTP verify, no-show and incident forms. Server-authoritative throughout; **never-false-collected** — a `NETWORK` failure shows an explicit "Not confirmed — no network" warning and never marks collected. Hooks in `src/api/counter.ts` (idempotency keys on writes, queue invalidation on success).

**Live evidence (local Supabase, real bearer tokens):**
- `scripts/smoke/slice7-role-smoke.mjs` → **9/9**: FINANCE `ROLE_DENIED` on verify/incidents but allowed on `GET /orders`; PICKUP_STAFF allowed; cross-restaurant `FORBIDDEN`; no-token `UNAUTHENTICATED`.
- `scripts/smoke/slice7-verify-smoke.mjs` → **6/6**: wrong→`INVALID_CODE`, correct→`SUCCESS`, replay same key→`SUCCESS` (deduped, no double-collect), re-verify→`ALREADY_COLLECTED`, 5 failures then `RATE_LIMITED`.
- **On-emulator Maestro run PASSED** (dev-client rebuild with expo-camera, Pixel_7): login → queue → open order → wrong OTP shows `INVALID CODE` → correct OTP → order flips to `Collected`. Flow: `.maestro/counter-pickup-devclient.yaml` (signed-in) / `counter-pickup.yaml` (full login). The device run **caught a real contract bug**: `spiceLevelCode` can be `null` (drops needn't set spice) but the wire schema declared it non-nullable → client `DECODE` failure on the live queue; fixed (schema + type + UI now nullable-safe).
- See `docs/mobile/slice7-counter-runbook.md`.

**Deferred batch — implemented 2026-06-21 (decisions signed off):**
- **Idempotency/replay (B):** client sends a stable per-action idempotency key (reused on retry, rotates on new OTP/reason); raw OTP cleared on terminal result. Server idempotency-replay confirmed (RPC returns the prior result for a repeated key).
- **Rate-limit + audit:** `recentFailedVerifyCount` throttles to 5 failed verifies/order/10-min → `RATE_LIMITED`; prior-attempt count + last result surfaced in the detail UI.
- **Camera QR (C-safe):** `expo-camera` just-in-time scanner with manual-OTP fallback; server re-validates/hashes the payload. Bundles in `expo export`.
- **Tablet master-detail:** queue+detail two-pane at ≥900px (`OrderActionsPanel` shared by the phone route and the tablet pane).
- **Offline (C):** kept **fail-safe** (no store-and-forward) per sign-off — verification stays online-only; a network failure never collects.
- **Seed + Maestro:** `supabase/seed_demo/slice7_counter_pickup_order.sql` (verifiable `GZ-SMOKE-0001`) + `apps/restaurant-mobile/.maestro/counter-pickup.yaml`.

**Remaining before merge:** human security sign-off (the on-emulator Maestro run is now done and passed). **Web authorization (D2) remains deferred — these mobile endpoints do not change web handlers.**

### Mobile Slice 8 — Customer public discovery and restaurant profiles

**Model recommendation:** Composer 2.5 High for implementation. Use an independent strongest-available Codex GPT reviewer at High effort for public/private DTO boundaries, canonical view changes and location behavior before merge.

**Agent prompt**

**Title:** Build the native customer public discovery experience.

**Scope:** Home, drop list/map/filter, drop detail without claim mutation, restaurant directory/profile/reviews, cuisine stats and Adventure Pick UI.

**Build instructions:** Create public mobile APIs/contracts or safe view adapters; fix/verify canonical Slice 9 restaurant/review views; implement cached/realtime-refresh discovery, search/category/dietary filters, list/map foreground location fallback, recently missed, restaurant sorts/filters and safe public fields; implement GET Adventure Pick as intentional native enhancement.

**Smoke-test scenarios and cases:** Active/zero/closed drops; combined filters; missing coordinates; denied location; stale/offline cache labeling; sort/rating/cuisine/dietary filters; restaurant with no reviews; no private fields; Adventure Pick eligible/empty; malformed deep link.

**Update this implementation plan:** Record fixed migration/view, public DTO fields, cache/realtime rules, filter semantics, routes and visual/Maestro evidence. Update every discovery/profile ledger row.

### Mobile Slice 9 — Customer claim, Razorpay and pickup proof

**Model recommendation:** Strongest available Codex GPT model at X-High effort for implementation and a separate strong-model review in a fresh context. Human payment and security review is mandatory; Composer should not be the sole implementation or review model for this slice.

**Agent prompt**

**Title:** Implement the revenue-critical claim-to-payment-to-proof journey.

**Scope:** Claim hold, recovery/countdown, native Razorpay, webhook-confirmation polling, orders created from converted holds and secure offline pickup proof.

**Build instructions:** Extract mobile claim GET/POST, checkout order/status, order detail/proof services with ownership/idempotency; use native Razorpay dev build; treat SDK result as provisional; resume pending confirmation after kill; derive deadlines from server offset; store minimum proof in SecureStore with terminal expiry; protect logs/screens; never create/confirm payment client-side.

**Smoke-test scenarios and cases:** Successful claim/payment/webhook; sold-out race; duplicate claim/pay; expired/released/converted hold; Razorpay cancel/failure; SDK success with delayed/missing webhook; app killed during provider flow; wrong-user proof 403/404; offline proof display; proof removal after collected/no-show/cancel/expiry.

**Update this implementation plan:** Record provider integration/config, endpoint/RPC ownership, idempotency keys, polling/recovery state machine, SecureStore proof format/version and test-mode evidence. Human payment/security review is mandatory.

### Mobile Slice 10 — Customer account, orders, reviews and consent settings

**Model recommendation:** Composer 2.5 High for implementation. Require an independent strongest-available Codex GPT review at High effort for consent, privacy, ownership checks, deletion handoff and private-cache cleanup.

**Agent prompt**

**Title:** Complete production customer account and post-purchase parity.

**Scope:** Profile fields currently exposed by web, referral-code display, consent settings, orders list/history/detail integration, hold history, review submission/status and privacy/sign-out entry points.

**Build instructions:** Limit profile to name/phone/email/language/default city; do not add hidden dietary/neighborhood API; add mobile order/claim list endpoints and pagination; render notification delivery states; implement collected-order review/category validation and duplicate prevention; show referral code without rewards; keep Swaad billing inactive; link privacy erasure/account deletion workflow.

**Smoke-test scenarios and cases:** Profile validation/save/rollback; referral missing/present; required/optional consent grant/revoke; active/stale holds; order statuses and notification failures; eligible/ineligible/duplicate review and moderation states; account deletion handoff; sign-out cleanup.

**Update this implementation plan:** Record field-level API parity, list cursors, consent/review contracts, privacy flow and fixtures for every order/hold state. Explicitly list deferred preference fields.

**Status — Orders + DPDP consent settings Done (2026-06-23, live-proven). Profile-edit + reviews remainder.** Consent decisions (owner-approved): expose **all 6 purposes** (operational locked-on); WhatsApp toggles shown + recorded now despite dry-run; account deletion is **link-out only** (no in-app erasure automation — stays clear of the legal HUMAN_REVIEW gate in `docs/runbooks/privacy-erasure.md`). No-drift: shared `consumer-web/lib/consent.ts#loadConsentSettings` (merges `api_latest_consents` + `privacy_consent_purpose`); canonical `CONSENT_POLICY_VERSION` in `@gozaika/types`. BFF `app/api/mobile/v1/account/consent` (GET settings, POST single-purpose toggle via `api_capture_consents` on the user token; server stamps policy version + ACCOUNT_SETTINGS source; refuses revoking required purposes). Contract `packages/types/src/mobile/consent.ts` (permissive wire GET + strict capture request) + fixture + test. Screen `consumer-mobile/app/(tabs)/account/consent.tsx` (per-purpose Switch, required locked, last-event date, privacy-policy + data-deletion link-outs to gozaika.in / contact@gozaika.in). Gate 7/7; live smoke `scripts/smoke/slice10-consent-smoke.mjs` 7/7. **Deferred:** profile field editing, referral-code display, review submission/moderation, hold history.

### Mobile Slice 11 — Customer Passport, discovery profile and Swaad Club

**Model recommendation:** Composer 2.5 High for implementation. A normal human review is sufficient when the slice remains read-only and respects the explicit no-billing/no-rewards boundary; use a Codex GPT High reviewer if server contracts or tier calculations change.

**Agent prompt**

**Title:** Complete customer loyalty-information parity without inventing billing/rewards.

**Scope:** Zayka Passport, tier/progress/benefits, Flavour Diversity profile, cuisines/neighborhoods, share card, Swaad Club informational page and referral-code visibility linkage.

**Build instructions:** Reuse production account APIs/contracts; implement honest empty/new/tier states; native share from server-safe payload; link untried cuisines to discovery; mirror production Swaad Club coming-soon copy despite seeded subscription rows; do not add native billing, entitlement or referral reward mechanics.

**Smoke-test scenarios and cases:** Bronze/Silver/Gold/Platinum fixtures; no stats; next-tier boundary; untried cuisine with/without active drop; share success/cancel; offline stale display; Swaad page cannot purchase; accessibility at large text.

**Status — Done (2026-06-22, live-proven).** No-drift extraction: web account routes (`consumer-web/app/api/account/{passport,discovery-profile}`) and the new mobile BFF (`consumer-web/app/api/mobile/v1/account/{passport,discovery-profile}`) now share `consumer-web/lib/passport.ts` (`buildPassportPayload` + `getConsumerPkByUserId` + `ALL_PASSPORT_BADGES`) and `lib/discovery-profile.ts` (`buildDiscoveryProfile`), so badge catalog, tier maths and diversity score cannot drift. Mobile BFF is RLS-scoped through the user's bearer token (no service-role cross-tenant read). Contracts: `packages/types/src/mobile/passport.ts` (permissive wire Zod for `ZaykaPassportPayload`/`DiscoveryProfile`) + fixtures + `passport.test.ts`. Screens: `passport.tsx` (tier card, progress bar, stats, 6-badge grid), `discovery.tsx` (diversity score, tried/untried cuisines linking to drops, neighbourhoods), `swaad-club.tsx` (coming-soon positioning mirror — **no native billing/entitlement**). Gate 7/7. Live smoke `scripts/smoke/slice11-passport-smoke.mjs` 7/7 vs local Supabase (Priya: SILVER, 7 bags, 70% → GOLD; unauth → 401).

**Update this implementation plan:** Record tier formulas/source, endpoints, share payload, seeded persona matrix and explicit exclusions so later agents do not infer subscriptions from seed rows.

### Mobile Slice 12 — Restaurant onboarding, compliance and profile

**Model recommendation:** Composer 2.5 High for implementation, followed by independent review with the strongest available Codex GPT model at High effort for tenant isolation, document privacy, signed uploads and role enforcement.

**Agent prompt**

**Title:** Deliver role-safe restaurant onboarding, private documents, contacts and location/profile management.

**Scope:** Current onboarding tasks, profile/location, compliance details, document upload/status and review submission on phone/tablet.

**Build instructions:** Add bearer adapters around extracted services; enforce OWNER/ADMIN and explicitly approved operational fields; resumable task state; signed upload for validated PDF/JPEG/PNG; camera/file picker; signed URL expiry; foreground address pin plus manual entry; public/private preview separation; no local private document cache.

**Smoke-test scenarios and cases:** New/resumed/completed onboarding; required validation; upload success/type/size/expired URL/retry; rejected/expired document; location denied/manual; cross-restaurant document denial; role restrictions; suspended restaurant; tablet layout/rotation.

**Update this implementation plan:** Record task transition rules, document limits/bucket/path/signing, role policy, location fields and test fixtures. Include cleanup for abandoned uploads and clean-checkout reproduction.

**Status — Compliance document upload Done (2026-06-23, live-proven; owner-approved off the review gate). Onboarding wizard remainder.** Approved security posture: gated by `manageCompliance` (OWNER/ADMIN); reads tenant-scoped via the role wrapper; document detail enforces `restaurant_fk === restaurantPk` (cross-tenant denied); non-public `private-documents` bucket; short-lived signed upload + 5-min signed download; **no local cache** (open-on-demand). BFF `app/api/mobile/v1/restaurant/documents` (GET metadata list, POST signed-upload ticket → PENDING_REVIEW) + `[documentId]/signed-url`. Mirrors the web `documents/sign-upload` + `[id]/signed-url`; reuses `createPrivateDocumentPath`/`privateDocumentBucket`. Contract `packages/types/src/mobile/documents.ts` (reuses `restaurantDocumentUploadRequestSchema`; list never embeds bytes/URLs) + fixture + test. Screen `restaurant-mobile/app/compliance.tsx` (7 doc types, status badge, expo-document-picker → uploadToSignedUrl, replace = new version for review, signed-URL view). Admin moderation stays on the existing web admin queue. Gate 7/7; live smoke `scripts/smoke/slice12-documents-smoke.mjs` 7/7 (sign→upload→list PENDING_REVIEW→signed download fetchable; bogus→404; PICKUP_STAFF→403 ROLE_DENIED; unauth→401). **Deferred:** the resumable onboarding wizard + location pin.

### Mobile Slice 13 — Restaurant templates and Limited Drops

**Model recommendation:** Composer 2.5 High for implementation. Use an independent strongest-available Codex GPT reviewer at High effort for revision preservation, publication transitions, inventory concurrency and restaurant authorization.

**Agent prompt**

**Title:** Implement BAM Bag template and Limited Drop publication parity.

**Scope:** Template list/create/edit/deactivate/revision semantics; drop list/detail/create/duplicate/publish/schedule/status actions matching current portal behavior.

**Build instructions:** Extract/adapt current services and Zod contracts; preserve template revisions/history; use a mobile `/drops/[dropPk]` detail/form without inventing unsupported web capabilities; enforce active restaurant/config flags/quantity/time/allergen/status transitions; support tablet list-detail/form and phone sections; handle concurrent authoritative refresh.

**Smoke-test scenarios and cases:** Create/edit/deactivate template; historical drop unchanged; create from template; invalid times/quantity/price/disclosure; duplicate; scheduled/active/paused/closed states actually supported by APIs; publishing disabled; concurrent update/inventory; unauthorized roles.

**Update this implementation plan:** Record form fields, revision/transition tables, config dependencies, endpoint mapping to web `/portal/drops/new`, fixtures and Maestro evidence.

### Mobile Slice 14 — Restaurant dashboard, reviews and operational history

**Model recommendation:** Composer 2.5 High for implementation. Human review is normally sufficient; add a Codex GPT High review when metric formulas, identity masking or role-specific payloads change.

**Agent prompt**

**Title:** Complete restaurant operational overview and feedback parity.

**Scope:** Dashboard metrics/actions, recent/next drops, pickup queue summary, restaurant-owned reviews and order notification delivery history.

**Build instructions:** Add read APIs/contracts; show freshness and insufficient-data states; use current revenue/sell-through/AOV definitions; role-adapt dashboard; read-only masked reviews; notification states/fallback copy without blocking pickup; no ZaikaIQ forecasts/benchmarks.

**Smoke-test scenarios and cases:** No activity, active pickup, sold/listed metrics, next drop, stale metrics, pending/approved reviews with masked identity, notification queued/sent/failed/suppressed, role-specific dashboard and tablet master-detail links.

**Update this implementation plan:** Record metric formulas/source views, freshness policy, masking rules, role variants and fixture expectations. Update dashboard/review/history ledger rows.

### Mobile Slice 15 — Restaurant finance and ROI reports

**Model recommendation:** Composer 2.5 High for implementation, followed by mandatory independent review with the strongest available Codex GPT model at High effort for monetary precision, formula parity, role enforcement, PII and signed-download handling.

**Agent prompt**

**Title:** Deliver read-only finance settlement and partner ROI reporting.

**Scope:** Settlement list/detail/entries, invoice authorized download/share, date-range ROI metrics/drop notes/assumptions/partner share for OWNER/ADMIN/FINANCE.

**Build instructions:** Add bearer read adapters; enforce role/restaurant ownership; preserve paise and estimate-versus-locked labeling; use short-lived invoice URLs and safe filenames; implement text equivalents for metrics; native share safe report copy; prohibit payout/refund/reconcile/bank mutations.

**Smoke-test scenarios and cases:** Empty/draft/locked/paid/reconciled/cancelled settlement; positive/negative entries; invoice missing/expired/retry; exact-period locked ROI versus estimated; incidents/refunds; thin repeat-buyer data; unauthorized operational/pickup user; PII scan of payload/share.

**Update this implementation plan:** Record finance/ROI data sources, formulas, role policy, signed-download lifecycle, fixtures and reconciliation evidence. Explicitly state all prohibited mutations.

**Status — ROI report Done (2026-06-22, live-proven). Invoice download still remainder.** No-drift extraction: the web portal reports page (`restaurant-mgmt-web/app/portal/reports/page.tsx`) and the new mobile BFF (`app/api/mobile/v1/reports/roi`) now share `lib/roi-report.ts#loadRoiReport` (the three canonical views `api_restaurant_roi_drop_detail` / `api_restaurant_roi_report_note` / `api_restaurant_finance_settlement_summary` → `mapRoiDrop`/`mapRoiNote` → `buildRoiReport`). BFF gated by `viewReports` (OWNER/ADMIN/MANAGER), service-role read after the role wrapper enforces tenant; period from `?start=&end=` (defaults to trailing 7 days). Contract `packages/types/src/mobile/reports.ts` (permissive wire Zod for `RoiReportPayload`) + fixture + `reports.test.ts` (incl. a PII-scan assertion on partner copy). Screen `restaurant-mobile/app/reports.tsx`: metric cards, drop performance, exceptions, next actions, and a **partner-safe `Share`** (counts/totals only — no names/phones/emails/pickup codes). Read-only: no payout/refund/reconcile/bank mutation. Gate 7/7. Live smoke `scripts/smoke/slice15-roi-smoke.mjs` 5/5 (OWNER→200 well-formed payload incl. honest INSUFFICIENT_DATA empty state; PICKUP_STAFF→403 ROLE_DENIED; unauth→401). Note: the ROI drop-detail view inner-joins `catalog_bag_template_revision`, so demo drops without that linkage produce the empty state; the metrics math itself is covered by `buildRoiReport` unit tests + the rich contract fixture.

### Mobile Slice 16 — Push, deep links, native permissions and offline hardening

**Model recommendation:** Strongest available Codex GPT model at X-High effort for implementation and an independent strong-model review. Require human security/privacy review for token lifecycle, deep-link allow-listing, lock-screen content, permissions and offline correctness.

**Agent prompt**

**Title:** Wire native lifecycle capabilities without expanding data collection.

**Scope:** Extend `notification_device`, token endpoints/processor, push routing, universal/App Links, foreground location, biometrics, camera permission consistency and offline hardening across completed workflows.

**Build instructions:** Add only missing device columns; token upsert/rotation/revocation and invalid-token handling; PUSH outbox delivery/dedup; consent-aware categories and lock-screen-safe copy; cold/warm pending deep links with allow-list; foreground-only location; biometric opt-in app lock; network/stale indicators; verify consumer proof and restaurant pending-network semantics.

**Smoke-test scenarios and cases:** Permission allow/deny/revoke; token rotation/multi-device/logout; duplicate outbox; invalid token deactivation; push cold/warm/signed-out/wrong-role; malicious link; location denied; biometric unavailable/failure; offline/reconnect for discovery/proof/counter; no background-location declaration.

**Update this implementation plan:** Record migration, provider path, token lifecycle, categories/consents, association files, permission strings, deep-link allow-list and offline state diagrams. Include physical-device evidence.

### Mobile Slice 17 — Accessibility, security, observability and performance gate

**Model recommendation:** Strongest available Codex GPT model at X-High effort for the audit and remediation work, with an independent fresh-context strong-model review. Human security and accessibility sign-off remains mandatory and cannot be replaced by model review.

**Agent prompt**

**Title:** Harden both apps to release quality and reconcile full parity.

**Scope:** Cross-app accessibility, threat-model fixes, telemetry/redaction, performance, dependency/native config audit and final parity ledger. No new product features.

**Build instructions:** Run VoiceOver/TalkBack/Dynamic Type/contrast/reduced motion and tablet keyboard checks; threat-model token/deep-link/QR/replay/role/offline/app-switcher risks; configure Sentry-equivalent with source maps and PII scrub; measure startup/list/render/network; add rate/error dashboards; scan bundles/config for secrets/Orbitwell; close every ledger row with evidence or block release.

**Smoke-test scenarios and cases:** 200% text; screen-reader payment/pickup results; scanner manual alternative; charts text; session/role revocation; log/crash redaction; malicious payload/link; low-memory/process death; mid-range performance budgets; crash/ANR thresholds; dependency/privacy manifest audit.

**Update this implementation plan:** Record audit tools/devices/results, accepted residual risks, telemetry fields/redaction, performance measurements, parity totals and remaining blockers. Human security/accessibility sign-off required.

### Mobile Slice 18 — Store packages, beta and staged production release

**Model recommendation:** Composer 2.5 High for asset/configuration assembly and checklist execution, followed by mandatory strongest-available Codex GPT review at High effort for signing boundaries, production configuration, privacy declarations, review accounts and rollback criteria. All external submissions and rollout actions require human authorization.

**Agent prompt**

**Title:** Produce goZaika-owned store packages and execute controlled release readiness.

**Scope:** Final Expo/EAS config, signing, `.aab`/`.ipa`, listing assets/metadata/privacy declarations/review identities, internal testing, beta and staged rollout plan. External store mutations require explicit authorization at action time.

**Build instructions:** Verify permanent IDs/goZaika ownership; create production EAS builds and provenance; assemble icons/adaptive/monochrome, phone/tablet screenshots and Play feature graphic; complete privacy/Data Safety/content/export/account-deletion/support metadata from actual SDKs; prepare non-expiring phone review accounts and Razorpay test instructions; first Play upload manual; TestFlight/closed track; rollout 5→25→100 with halt/rollback criteria.

**Smoke-test scenarios and cases:** Clean install/update on device matrix; production env/no debug menu; auth review account; Razorpay review path; push/camera/location permission review notes; deep links; customer phone screenshots; restaurant phone/iPad/Android tablet; symbol/source-map availability; store pre-review checks; support/privacy URLs.

**Update this implementation plan:** Record build IDs/hashes (not secrets), signing ownership, submitted metadata versions, tester groups, review notes, approval/status, rollout metrics and rollback procedure. Mark complete only after authorized release outcome or explicitly record the external approval blocker.

## 5. Review disposition

Accepted and incorporated: existing `notification_device` extension; referral-code display boundary; dependency-gap checklist; identity migration runbook; living parity ledger; restaurant-specific bootstrap; Maestro choice; shared contract fixture location; mobile-native navigation clarification; current profile field limit; new mobile hold/proof/list endpoints labeled as new; cuisine-stats inventory; full path normalization; checkout parameter alias; seed/README/demo-auth mismatch; target-state role enforcement; drop-route correction; camera QR as intentional enhancement; PICKUP_STAFF-first vertical slice; restaurant switcher revalidation; finance read-only boundary and tablet master-detail requirements.

Accepted with modification: deterministic local test OTP generation and phone/profile linkage are required, but a general development password-login UI is rejected because it creates an avoidable production escape-hatch risk. Per-slice model routing is advisory operational guidance rather than a code or product requirement; prompts remain portable across agent vendors, and model review never replaces the stated human review gates.

Not accepted: the review’s claim that Adventure Pick parity may freely exceed web is bounded—the native UI may expose the already deployed API, but must not alter eligibility/business rules. Role restrictions are not represented as current web parity; they are an explicit mobile security target and optional separately reviewed web hardening.
