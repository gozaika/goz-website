# goZaika Customer Mobile Technical Specification v1.0

Status: implementation-ready  
Target: `apps/consumer-mobile` on Android phones and iPhone  
Parity baseline: production `customer.gozaika.in` and matching checked-in code on 18 June 2026.

## 1. Product outcome

Replace the current static shell/web handoff with a complete native customer journey: discover a trustworthy BAM Bag, understand allergens and pickup constraints, authenticate/consent, obtain an inventory hold, pay through Razorpay, receive server-confirmed order/pickup proof, collect, review and track account/passport activity. The mobile app must not require the web app for any parity workflow.

## 2. Navigation and route map

Use a five-tab phone shell with native stacks:

| Tab | Primary routes |
| --- | --- |
| Home | `/`, search handoff, active kitchens, Passport teaser |
| Drops | `/drops`, `/drops/[dropPk]`, adventure pick |
| Restaurants | `/restaurants`, `/restaurants/[slug]`, map/list |
| Orders | `/orders`, `/orders/[orderPk]`, `/checkout/[holdPk]` |
| Account | `/account`, `/account/passport`, `/account/discovery`, `/swaad-club`, consent/settings |

Auth/onboarding routes are modal/guarded: `/auth/login`, `/auth/callback`, `/onboarding/consent`. Push and universal links may open drop, restaurant, checkout or order detail after validation. Preserve the intended destination through auth/consent.

This is an intentional mobile-native information architecture, not a copy of web chrome. The current mobile shell is obsolete: it exposes Passport instead of Restaurants as a tab. The production web navigation also differs (Drops, Restaurants, Swaad Club, Account). Preserve workflow parity while using the five-tab mobile structure above.

## 3. Screen requirements

### 3.1 Launch, Home and global shell

- Branded splash, safe session restore, optional biometric unlock and a non-blocking version check.
- Home mirrors production: Hyderabad-first hero, search, category shortcuts, browse CTA, honest active-drop/partner/city metrics, current drops or first-drop empty state, active kitchens, Passport teaser and restaurant discovery CTA.
- Location label defaults to Hyderabad and may be refined by user-selected neighborhood or foreground “Near me.” No background tracking.
- Header exposes notification/deep-link state and account affordance without crowding the tab bar.
- Pull-to-refresh and stale/offline indicator; cached content must be labeled.

### 3.2 Drop discovery

- Search restaurant, BAM Bag, cuisine, dietary category and allergen text.
- Category chips: All, Biryani, Thali, Dessert, Snacks, Drinks and Chef’s Selection; server-driven values may extend these without app release.
- Dietary chips: all, Non-Veg, Veg, Jain; preserve enum support for Egg Only.
- List/map toggle. Map uses only safe public coordinates and foreground location; list remains authoritative when coordinates are absent.
- Separate actionable drops from “Recently missed.” Cards show restaurant, title/type, dietary/spice, allergen signal, price, pickup window, quantity/urgency, neighborhood and status.
- Live countdown/inventory refresh; never imply availability after pickup end. Filter/sort state is shareable through deep-link query parameters.
- Adventure pick calls the existing `GET /api/drops/adventure-pick` behavior and explains when no eligible drop exists. This is a deliberate mobile UI enhancement over the current web surface, which has the API but no equivalent visible control.

### 3.3 Drop detail and claim

- Display restaurant identity/link, BAM Bag title/description, drop type, dietary/spice, serving range, minimum menu value when present, allergen codes and disclosure text, price, inventory, pickup window/instructions, neighborhood/map/directions and trust reminders.
- Allergen disclosure appears before the claim CTA and remains accessible to screen readers. Unknown disclosure is explicit; never infer safety from dietary category.
- CTA state is derived from status, quantity and pickup end using shared availability logic. Handle sold out, paused, cancelled, closed and scheduled states.
- Anonymous claim redirects to auth and resumes the exact drop.
- Claim `POST /api/mobile/v1/claims` with `{dropPk,quantity:1,idempotencyKey}`. One tap creates at most one hold. Display server expiry countdown and recover active hold after restart.
- On `409` inventory race, re-fetch drop and present the authoritative state. On config/publishing disablement, show calm unavailable copy.

### 3.4 Authentication and DPDP consent

- Phone OTP is primary; validate Indian number, request OTP, show resend cooldown, enter/verify six digits and handle expiry/rate limit.
- Google OAuth is secondary with verified mobile redirect URIs.
- The rich SQL seed uses `*.demo@gozaika.dev` email/password identities, while its README lists different `*.demo.gozaika.in` emails; the separate demo-auth scripts create phone-linked `*.gozaika.example` users. None is a single coherent production-UI fixture story. Before beta, link deterministic phone identities to representative rich demo profiles and generate local Supabase `auth.sms.test_otp` entries. Never ship a general password backdoor.
- After first sign-in call bootstrap, then fetch consent purposes/latest events. Required operational consent must be resolved before claim/payment; optional analytics, marketing and WhatsApp purposes remain independently controlled.
- Explain purpose, channel and revocability in plain language. Capture append-only events, source app version and policy version.

### 3.5 Checkout and Razorpay

1. Load hold summary and server time; reject non-active/expired/converted holds.
2. Show restaurant, bag, allergen summary, pickup window, quantity, paise-formatted total and hold countdown.
3. `POST /api/mobile/v1/checkout/razorpay-order` with hold and idempotency key. Server validates ownership, hold, amount, INR key family and provider connectivity.
4. Open native Razorpay Standard Checkout using only returned public key/order ID/amount/currency/prefill.
5. Treat SDK success/cancel/failure as provisional. Do not verify signatures or create orders in the client.
6. Poll `/api/mobile/v1/checkout/status?holdPk=...` with bounded backoff and resume polling after app restart/deep link.
7. Navigate to order only after signature-verified webhook data reports captured/confirmed. Provide “Payment received; confirmation pending” and support path for delayed webhook.

Prevent screenshots/app-switcher exposure while provider checkout is active when supported. Never log payment payloads. Payment keys/secrets other than public key ID remain server-side.

### 3.6 Orders and offline pickup proof

- Orders tab groups active pickup orders and history; cards show order number, restaurant/bag, status, paid amount, pickup window and notification status.
- Detail displays payment-confirmed state, dietary/allergen information, pickup instructions/map, notification delivery summary and support-safe messages.
- Show QR and six-digit OTP only for eligible paid/confirmed/ready orders. Use the server-issued proof; never derive a nonce client-side.
- Persist the minimum proof in SecureStore for offline counter display. Include “Last verified online,” pickup window and offline banner. Auto-remove after collected/no-show/cancel/refund or pickup-end +24h.
- QR has adequate quiet zone/brightness CTA and accessible OTP alternative. Optional biometric reveal is allowed but cannot strand a user at pickup.
- Terminal states: collected timestamp; no-show explanation without automatic-refund promise; cancelled/refund statuses; expired pickup removes proof.
- Notification failure never blocks pickup.

### 3.7 Reviews

- Eligible collected orders expose one review form. Capture overall 1–5 rating, optional text and production category scores when supported: food quality, value, pickup experience and packaging.
- Show moderation state after submission. Prevent duplicate order review; validate bounds and length server-side.
- Restaurant detail shows approved public reviews only, masked reviewer name and category/rating aggregation. Do not expose rejected/private text.
- Review media endpoints currently have no implemented production handler; do not add media parity until the web capability exists.

### 3.8 Restaurant directory and profile

- Directory parity: search, filter sheet, sort by Recommended/Most Active Drops/Highest Rated/Pickup Closing Soon, rating threshold, cuisine/category, dietary support and list/map toggle.
- Restaurant card: identity, neighborhood, public cuisines/dietary tags, rating/count, active/upcoming context and link.
- Detail: public identity, description/location, cuisine/dietary tags, rating/reviews, active/upcoming drops, public past-drop history, share and food-safety/allergen reminder.
- Never show legal identity, compliance docs, payout data, internal contacts, team membership or admin notes.
- Gracefully handle the known seeded public-view schema defects; fix the migration/view rather than building app-specific hidden queries.

### 3.9 Account

- Profile parity is limited to the current API: full name, phone, email, preferred language, default city and referral-code display. Neighborhood and dietary/allergen preferences exist in data but are not exposed by the production profile API; add them only through an explicitly specified API/schema extension and parity-ledger row, not by querying around the service boundary.
- Display the existing referral code. Sharing, attribution and rewards remain out of scope.
- Swaad Club card shows actual subscription state or production “coming soon/subscription-ready” positioning. Do not add native recurring billing.
- Consent settings show latest state per purpose and append grant/revoke events.
- Paid orders, active holds and hold history match production account grouping; deep-link to checkout/order.
- Sign out and account deletion/privacy request are prominent. Sign out removes local tokens/caches/device association.

### 3.10 Zayka Passport and discovery profile

- Passport screen displays tier card, current tier, collected bags, restaurants visited, next-tier progress and production tier benefits.
- Discovery profile displays Flavour Diversity Score/personality, tried/untried cuisines, active-drop links, neighborhoods explored and share-card action.
- Share uses native share sheet with server-created safe card/content; no private identifiers.
- Empty/new-account states are motivating but never fabricate achievements.

### 3.11 Swaad Club

Mirror the production informational experience: coming-soon status, priority signals, Chef’s Selection previews, trust reminders, launch perks, eligibility/boundary and FAQs. “Notify me” routes to account consent/preferences. No subscription, mandate or entitlement creation.

## 4. Customer API contract inventory

Expose versioned equivalents of current behavior:

| Method/path | Purpose |
| --- | --- |
| `POST /api/mobile/v1/auth/bootstrap` | Resolve/create IAM and consumer profile after Supabase auth |
| `GET /api/mobile/v1/consent/purposes`, `GET .../latest`, `POST .../capture` | Purpose-scoped consent |
| `GET/PATCH /api/mobile/v1/profile` | Current profile fields and referral-code display |
| `GET /api/mobile/v1/discovery/drops`, `GET .../cuisine-stats`, `GET .../drops/:id`, `GET .../drops/adventure-pick` | Discovery/detail/home food stories |
| `GET /api/mobile/v1/restaurants`, `GET .../restaurants/:slug`, `GET .../restaurants/:slug/reviews` | Public kitchens |
| `POST /api/mobile/v1/claims`, `GET /api/mobile/v1/claims` | Claim plus new mobile hold-recovery endpoint; web currently has POST only |
| `POST /api/mobile/v1/checkout/razorpay-order`, `GET .../checkout/status` | Native payment orchestration |
| `GET /api/mobile/v1/orders`, `GET .../orders/:id`, `GET .../orders/:id/pickup-proof` | Mobile list/detail and new dedicated proof endpoint; web currently issues proof inline |
| `POST /api/mobile/v1/reviews`, `GET .../reviews/mine` | Review submission/status |
| `GET /api/mobile/v1/account/passport`, `GET .../account/discovery-profile`, `GET .../discovery/share-card` | Gamification |
| `POST/DELETE /api/mobile/v1/devices/push-token` | Push registration/revocation |

All authenticated resources enforce consumer ownership server-side. Public endpoints are bounded/paginated. Use cursor pagination for histories; v1 defaults 20 rows.

The native route `/checkout/[holdPk]` maps to the current web filesystem route `/checkout/[orderId]`, whose parameter is actually a hold primary key. Normalize names in new mobile contracts without silently changing the web URL.

## 5. Client data models and state machines

Reuse production enums from `@gozaika/types`: drop, hold, payment-intent, order, consent and notification states. Add mobile view models without duplicating business enums.

Critical state transitions:

- Claim: idle → submitting → active hold → payment pending → converted; or expired/released.
- Payment UI: not started → provider order ready → provider UI → awaiting webhook → confirmed order; cancel/failure returns to active hold if still valid.
- Pickup proof: unavailable → eligible/cached → displayed online/offline → collected/no-show/expired terminal.
- Push token: unknown → permission decided → registered → rotated/revoked.

Server state always wins. Client clock drives animation only; deadlines use server time offset.

## 6. Push/deep-link matrix

| Event | Route | Sensitive lock-screen content |
| --- | --- | --- |
| Order/payment confirmed | `/orders/:id` | Order number may be shortened; no OTP/amount required |
| Pickup reminder/state | `/orders/:id` | Restaurant and window allowed; no credential |
| Review prompt | `/orders/:id?review=1` | Restaurant allowed |
| Drop alert, when production consent/event exists | `/drops/:id` | Restaurant/title; no inferred allergen safety |

Handle cold, warm and authenticated/unauthenticated launch. Queue one pending link through login/consent, reject unknown hosts/routes and make duplicate opens idempotent.

## 7. Analytics and observability

Track consent-permitted, non-PII events: app open, search/filter, map/list, drop view, claim attempt/result, checkout launch, webhook-confirmed outcome, pickup-proof view, review result and permission decisions. Include app/build/platform and request ID. Never send query text if it may contain PII without sanitization. Crash breadcrumbs redact every credential/payment field.

## 8. Customer-specific tests

- Discovery filters combine correctly; map absence falls back to list.
- All drop terminal states and inventory race.
- OTP resend/expiry, OAuth return and consent guard/resume.
- Duplicate claim/payment taps share idempotency key.
- Razorpay success with delayed webhook, SDK cancel, killed app and provider failure.
- Pickup proof online/offline, device clock change, terminal removal and screenshot/app switcher privacy.
- Order ownership denial, review eligibility/duplicate/moderation and Passport empty/tier states.
- Push token rotation and every deep-link lifecycle.
- VoiceOver/TalkBack order status, countdown and QR/OTP alternative.

## 9. Definition of done

- No customer parity CTA opens `customer.gozaika.in` as a workaround.
- Every production customer route listed above has a native screen or an explicit informational equivalent.
- Payment, inventory and pickup invariants match web/server behavior and pass contract/E2E tests.
- App works without location/notification/biometric permission; offline pickup proof is reliable and bounded.
- `in.gozaika.customer` store builds, signing, goZaika listing assets, privacy disclosures and review credentials are complete.
- Static placeholder counts and mojibake currently present in the shell are gone.
