# goZaika Restaurant Mobile Technical Specification v1.0

Status: implementation-ready  
Target: renamed `apps/restaurant-mobile` on Android/iPhone phones and Android tablets/iPad  
Store name: `goZaika Partner`  
Parity baseline: production `restaurant.gozaika.in` and matching checked-in code on 18 June 2026.

## 1. Product outcome

Replace the counter-only static shell with one secure, role-based restaurant app covering all current production portal workflows: onboarding, profile/compliance, dashboard, templates, drop publication, order counter/pickup, incidents/no-show, finance, ROI reports and reviews. Counter staff see a fast operational surface; owners/managers see the full portal; finance users see only finance/reporting. The same binary adapts to role and phone/tablet.

## 2. Roles and authorization

Server authorization is mandatory on every request. Navigation hiding is usability, not security.

| Capability | OWNER | ADMIN | OPERATIONS | PICKUP_STAFF | FINANCE |
| --- | :---: | :---: | :---: | :---: | :---: |
| Dashboard | ✓ | ✓ | ✓ | limited queue | summary |
| Orders, scan/OTP | ✓ | ✓ | ✓ | ✓ | read-only if needed |
| No-show/incident | ✓ | ✓ | ✓ | ✓ | — |
| Templates/drops | ✓ | ✓ | ✓ | — | — |
| Onboarding/profile/location | ✓ | ✓ | limited operational fields | — | — |
| Compliance/documents | ✓ | ✓ | upload if explicitly authorized | — | — |
| Reviews | ✓ | ✓ | ✓ | — | — |
| Reports | ✓ | ✓ | ✓ | — | ✓ |
| Finance/invoices | ✓ | ✓ | — | — | ✓ |

This matrix is the required mobile target state, not a claim about current web enforcement. The web portal currently enforces active membership broadly but does not consistently gate by role. Implement centralized server role checks for mobile endpoints first, with contract tests; do not represent the matrix as complete until every endpoint is covered. Extending the same policy to web handlers is recommended as a separate, explicitly tested hardening change rather than an incidental mobile refactor. A user with multiple active memberships gets a restaurant switcher; every API request includes selected restaurant and revalidates membership.

## 3. Adaptive navigation

- Phone: bottom tabs `Home`, `Orders`, `Drops`, `More`; role removes inaccessible destinations. A persistent Scan action opens counter scanner.
- Tablet ≥768dp: permanent navigation rail/sidebar matching portal groups—Operations, Performance, Restaurant—with two-column/master-detail layouts.
- Owner/admin routes: `/dashboard`, `/orders`, `/drops`, `/drops/new`, `/drops/[dropPk]`, `/templates`, `/reports`, `/finance`, `/onboarding`, `/compliance`, `/profile`, `/reviews`. The current web portal consolidates creation/edit-like publication behavior in `/portal/drops/new` with duplicate query parameters and inline status actions; the mobile detail/form route must reuse those behaviors rather than invent a new editing capability.
- Pickup staff launches into `/orders?mode=counter`; finance launches into `/finance` or last authorized screen.
- Deep links from push are allow-listed and pass through role/restaurant guards.

Tablet layout references (implementation may refine spacing, not information priority):

```text
Orders tablet                       Drops tablet
┌────────┬────────────┬───────────┐ ┌────────┬────────────┬───────────┐
│ Nav    │ Queue/list │ Detail +  │ │ Nav    │ Drop list  │ Detail /  │
│ rail   │ + filters  │ verify    │ │ rail   │ + status   │ form      │
└────────┴────────────┴───────────┘ └────────┴────────────┴───────────┘
```

On narrow tablets collapse the detail pane into a pushed route. Preserve selected order/drop when rotating or returning from scanner/file picker.

## 4. Screen requirements

### 4.1 Login, membership bootstrap and app lock

- Phone OTP primary and Google OAuth secondary, matching production. Preserve destination through auth.
- After auth, resolve IAM profile, active memberships, role codes and restaurant status. Handle no membership, inactive membership, suspended/offboarded restaurant and multi-restaurant selection explicitly.
- The production demo README lists email/password accounts while production UI accepts phone/Google. Create phone-linked test/review identities or an approved review access flow before beta; do not ship a universal password bypass.
- Optional biometric app unlock after opt-in. Sign-out clears session, cached restaurant data, push registration and pending credentials.

### 4.2 Onboarding and compliance

Match the current onboarding task flow and statuses:

1. Restaurant basics and public identity.
2. Location/pickup address and instructions.
3. Compliance details.
4. Private document upload.
5. Operational/owner/support contacts.
6. Submit for review and show status/tasks/blockers.

Support resumable draft onboarding. Validate required values and task completion server-side. Document upload uses signed private paths; accept PDF/JPEG/PNG, camera or file picker, show progress/retry, and never persist signed URLs. Display document status (pending/under review/approved/rejected/expired) and safe reviewer guidance. Compliance page may route into onboarding, consistent with production.

Foreground location may center the address pin only after user action. Manual address entry is always available. No background location.

### 4.3 Profile and pickup location

- Edit production restaurant profile and contacts permitted by role.
- Location editor supports address lines, landmark, neighborhood, city/state/postcode, public lat/lng pin and pickup instructions.
- Separate public data from private contacts/compliance. Preview the customer-facing identity before save.
- Changes use optimistic UI only for low-risk fields; compliance/location publication uses server confirmation.

### 4.4 Dashboard

- Restaurant status/onboarding banner and next required action.
- Current production metrics: estimated today revenue, bags sold/listed, sell-through, AOV, recent drop sell-through and next drop.
- Quick actions: create drop, view drops, manage templates, counter orders.
- Pickup queue summary is prominent on phone; tablet may show queue alongside metrics.
- Metrics include freshness timestamp and honest insufficient-data states. Do not introduce ZaikaIQ or forecast/benchmark cards.

### 4.5 BAM Bag templates

- List templates with status/current revision and restaurant ownership.
- Create/edit fields supported by production: display name, short description, dietary category, spice, serving range, holding guidance, minimum menu value, allergen summary/codes and active state.
- Preserve revision semantics; published historical drops must not silently change when a template is edited.
- Validate enum, price/value and serving bounds through shared Zod contracts. Deactivation requires confirmation if it affects future creation choices.

### 4.6 Drops

- List active/scheduled/closed drops with title, pickup window, price, listed/sold/available, sell-through and status.
- Create from a template/revision. Fields match production form: drop title/type, schedule/pickup window, price in paise-backed currency input, quantity and disclosure/template data.
- Support production actions: create, edit eligible drop, duplicate into a new draft, publish/schedule and safe status updates exposed by current APIs. No dynamic/last-call pricing.
- Enforce restaurant ACTIVE status, publishing configuration, maximum quantity, pickup time ordering, disclosed allergens and allowed status transition server-side.
- Editing cannot rewrite sold-order facts. Concurrent inventory/status conflict refreshes authoritative state.
- Tablet form uses content + recent-drop panel; phone uses stepped sections with persistent save/publish CTA.

### 4.7 Counter orders and pickup verification

This is the operational priority and must be usable one-handed.

- Default queue shows paid/confirmed/ready orders for the selected restaurant, grouped by pickup window/status. Search by order number; never expose raw consumer contact details.
- Card shows order number, bag/drop, dietary/allergen flags, quantity, paid state, window and collected/no-show state.
- Verification supports camera QR scan and manual six-digit OTP. Camera scanning is an intentional native enhancement: current web parity only supports OTP and pasted QR JSON. Camera is just-in-time and has flashlight, permission recovery and manual fallback.
- Submit `POST /api/mobile/v1/orders/:id/pickup/verify` with order, selected restaurant, method, credential and idempotency key. Server validates/hash-compares and performs canonical RPC.
- Result UX is unmistakable: green success with haptic/sound option; invalid code, wrong restaurant, already collected, expired window and not-ready have distinct text. Never reveal expected credential.
- Repeated scan/tap is idempotent; `ALREADY_COLLECTED` is a warning, not success.
- Offline: cached queue is readable. Scan/OTP can be held in memory with `PENDING_NETWORK`; do not mark collected or release a bag until server confirms. Retry once connected with same idempotency key and require operator attention if window/state changed. Never persist raw OTP/QR.
- After pickup window, eligible order may be marked no-show with required reason and confirmation. It creates no refund.

### 4.8 Incidents

- Create order-linked incident with type: dietary mismatch, food safety, packaging breach, pickup not honored, missing order, quality issue or platform error; severity P1–P4 and concise description.
- Food-safety/dietary risk prompts appropriate high severity and immediate support escalation copy, without blocking incident creation.
- Show created incident reference/status. Do not implement admin triage in the restaurant app.
- Prevent duplicate submission with idempotency key; do not attach consumer PII or raw pickup proof.

### 4.9 Notifications in orders

Show compact production delivery history for restaurant-owned orders: queued, sent, failed, suppressed/cancelled, channel, retry timing and safe fallback copy where permitted. Provider failures never block verification. Native push alerts new paid orders and relevant pickup/incident events; opening a notification selects the correct restaurant and order after authorization.

### 4.10 Finance

- Settlement list and selected detail: period, status, gross/refunds, commission, provider fee, tax, adjustments, net payout, locked/paid/reconciled timestamps, masked payout account and status notes.
- Line items expose safe order number, bag, entry type, amount and source status—no consumer identity/payment payload.
- Invoice metadata/download through a fresh authorized URL; save/share via OS sheet with safe filename. Do not retain signed URL.
- Current pilot is reporting/manual settlement only. The app must not initiate payouts, refunds, reconciliation or bank changes.

### 4.11 ROI reports

- Date range (default recent seven-day production behavior), metric cards for bags, sell-through, GMV, estimated/locked net recovery, pickup completion and incidents/refunds.
- Drop detail, incident/refund notes, basis/assumptions, freshness, insight/next-action copy and partner-safe share text.
- Label estimated versus settlement-backed values. Do not imply accounting finality.
- Native share uses the production-safe payload and excludes consumer PII. ZaikaIQ is out of scope.

### 4.12 Reviews

- Restaurant-owned review summary/list with approved and pending/moderation states available in production, rating/category signals and masked reviewer identity.
- Read-only; restaurant users cannot approve, reject, edit or expose reviews.
- Gracefully handle current seeded view defects by fixing canonical migration/view, not bypassing RLS.

## 5. Restaurant mobile API inventory

Create bearer-auth `/api/mobile/v1` equivalents and extract domain services from cookie-based web handlers:

| Method/path | Purpose |
| --- | --- |
| `POST /api/mobile/v1/auth/bootstrap` | Actor, memberships, roles, restaurant status and onboarding summary; never bootstrap a consumer profile implicitly |
| `GET/PATCH /api/mobile/v1/onboarding` | Task flow and review submission |
| `PATCH /api/mobile/v1/restaurant/basics`, `/location`, `/compliance` | Onboarding/profile sections |
| `POST /api/mobile/v1/documents/sign-upload`, `GET .../documents/:id/signed-url` | Private document workflow |
| `GET/PATCH /api/mobile/v1/profile` | Profile/contacts |
| `GET/POST /api/mobile/v1/templates`, `PATCH/DELETE .../templates/:id` | Template lifecycle |
| `GET/POST /api/mobile/v1/drops`, `GET/PATCH .../drops/:id` | Drop list/publication/state |
| `GET /api/mobile/v1/orders`, `POST .../orders/:id/pickup/verify`, `/no-show`, `/incidents` | Counter workflow |
| `GET /api/mobile/v1/finance/settlements`, `GET .../:id`, `GET .../finance/invoices/:id` | Read-only finance |
| `GET /api/mobile/v1/reports/roi?start&end` | Production ROI payload |
| `GET /api/mobile/v1/reviews` | Restaurant-owned reviews |
| `POST/DELETE /api/mobile/v1/devices/push-token` | Push registration |

Each request scopes by selected `restaurantPk` and active membership. Role checks occur before service-role queries. List endpoints are cursor-paginated and bounded. Mutation audit records include profile, restaurant, app/build, request ID and idempotency key, never raw credential.

## 6. Data and state rules

- Reuse `RestaurantTeamRoleCode`, restaurant/compliance/document/onboarding/drop/order/pickup/incident/notification/finance/ROI types from `@gozaika/types`.
- Selected restaurant is persisted as a non-secret identifier; bootstrap revalidates it every session.
- Queue freshness: active counter 5–10 seconds plus realtime invalidation; dashboard/drops 30 seconds; finance/report/profile 5 minutes.
- Realtime invalidates order/drop queries; it never finalizes pickup locally.
- Server time offset drives pickup and no-show eligibility. App clock is display only.
- Tablet split-view preserves selected order/drop through refresh; phone deep stacks restore safely after process death.

## 7. Push/deep-link matrix

| Event | Destination | Roles |
| --- | --- | --- |
| New paid order | `/orders/:id` | OWNER, ADMIN, OPERATIONS, PICKUP_STAFF |
| Pickup window/reminder | `/orders/:id` | operational roles |
| High-severity incident status | `/orders/:id?incident=...` | OWNER, ADMIN, OPERATIONS |
| Compliance/review status where server event exists | `/onboarding` | OWNER, ADMIN |
| Settlement/report ready where server event exists | `/finance` or `/reports` | OWNER, ADMIN, FINANCE |

If role or selected restaurant does not permit the destination, show a safe access-denied screen without leaking existence.

## 8. Restaurant-specific security

- Do not show consumer phone/email, payment provider references, QR nonce/hash, expected OTP, private compliance URL or other restaurant data.
- Camera frames are processed on device and not stored. Clear scanned payload immediately after server response.
- Signed document/invoice URLs are short-lived and fetched only on user action.
- Role/membership changes take effect on next API call; `403 ROLE_CHANGED` clears restricted screens/cache.
- Sensitive finance/document screens are obscured in app switcher and Android screenshots where practical.
- Rate-limit verification attempts per actor/order/device and alert on abnormal invalid scans without blocking legitimate counter recovery.

## 9. Responsive and accessibility requirements

- Portrait and landscape on restaurant tablets; phone may remain portrait except scanner/provider surfaces.
- Tablet: rail width, two-pane orders/drops, keyboard shortcuts for search/scan/manual OTP where platform permits.
- Minimum 48dp counter targets, large OTP digits, high-contrast status plus text/icon, TalkBack/VoiceOver result announcements and optional haptics that respect system settings.
- Scanner has a non-visual/manual alternative. Charts/reports include textual equivalents.

## 10. Tests

- Role matrix and cross-restaurant denial for every route/mutation.
- Onboarding resume, validation, signed upload expiry/retry and rejected document.
- Drop transition/quantity/time validation, duplicate and concurrent update.
- Counter: valid OTP/QR, wrong restaurant, invalid, replay/already collected, not ready, expired window, offline/reconnect and duplicate tap.
- No-show time boundary and incident enums/severity/idempotency.
- Notification failure does not block pickup.
- Finance/report authorization, amount formatting, estimate labeling, invoice link expiry and PII absence.
- Multi-membership switch, revoked membership mid-session, suspended restaurant and push link to unauthorized restaurant.
- Phone/tablet layout, rotation, keyboard, camera denied, large text and screen reader.

## 11. Definition of done

- Rename completed and no `restaurant-staff-mobile`, `goZaika Staff`, `gozaika-staff`, old EAS project or Orbitwell identifier remains except intentional migration history.
- All current portal navigation groups have native, role-appropriate screens; no parity CTA opens the web portal as a workaround.
- Pickup verification is server-authoritative, replay-safe, role/restaurant-scoped and operational under weak-network conditions without false success.
- Owner/admin, operations, pickup staff and finance acceptance suites pass on phone; owner and counter suites pass on iPad/Android tablet.
- `in.gozaika.restaurant` signed `.aab`/`.ipa`, goZaika-owned credentials, phone/tablet store assets, privacy disclosures and reproducible review identities are complete.
