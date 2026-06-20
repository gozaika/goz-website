# goZaika Mobile Shared Architecture and Release Specification v1.0

Status: implementation specification  
Baseline date: 18 June 2026  
Parity target: current production behavior at `customer.gozaika.in` and `restaurant.gozaika.in`; Technology Specification v4 roadmap features are excluded unless already deployed.  
Companion specifications: `gozaika_customer_mobile_technical_spec_v1.md` and `gozaika_restaurant_mobile_technical_spec_v1.md`.

## 1. Decisions and release boundary

| Decision | Required result |
| --- | --- |
| App portfolio | Two apps: consumer app and one role-based restaurant app. Do not create separate manager/staff binaries. |
| Platforms | Consumer: Android phones and iPhone. Restaurant: Android/iPhone phones plus Android tablets and iPad. |
| Publisher identity | goZaika only. Remove `Orbitwell` from source, package IDs, EAS ownership, credentials, store metadata and legal/support copy. |
| Payments | Native Razorpay Standard Checkout; server creates provider order and webhook remains the only payment-confirmation authority. |
| Native capabilities | Push, camera QR scanning, foreground location/maps, biometric local unlock, offline consumer pickup proof, bounded restaurant counter resilience. No unrestricted/background location. |
| Scope | Production web parity plus the native capabilities above. Displaying an existing referral code is in scope; referral acquisition, attribution, rewards and other unshipped v4 mechanics are not. Do not implement ZaikaIQ, native subscriptions, dynamic pricing, POS integration or the WhatsApp growth bot. |

## 2. Permanent application identities

Identifiers are effectively permanent after store publication. Set these before the first store build.

| Field | Customer | Restaurant |
| --- | --- | --- |
| Store name | `goZaika` | `goZaika Partner` |
| Expo project directory | `apps/consumer-mobile` | Rename `apps/restaurant-staff-mobile` to `apps/restaurant-mobile` |
| Workspace package | `@gozaika/consumer-mobile` | `@gozaika/restaurant-mobile` |
| Expo slug | `gozaika-customer` | `gozaika-restaurant` |
| URL scheme | `gozaika` | `gozaika-restaurant` |
| Android application ID | `in.gozaika.customer` | `in.gozaika.restaurant` |
| Apple bundle ID | `in.gozaika.customer` | `in.gozaika.restaurant` |
| Universal/App Link host | `customer.gozaika.in` | `restaurant.gozaika.in` |

Create new EAS projects under the goZaika Expo organization and replace both existing `extra.eas.projectId` values. Add explicit `owner` after confirming the actual Expo organization slug. Remove `com.orbitwell.gozaikaconsumer` and `com.orbitwell.gozaikastaff`. If either old Android ID has already been published, it cannot be renamed in place; create a new listing and document migration. Search the entire repository, EAS dashboard, Apple/Google consoles and credential labels for `orbitwell` before release.

The identity slice must create `docs/runbooks/mobile-app-identity-migration.md` recording old/new directory names, package names, schemes, bundle/application IDs, EAS project IDs, store listing disposition, signing-certificate fingerprints, redirect/deep-link changes and rollback limits. Never assume a store identity can be renamed.

## 3. Target stack

- Retain the monorepo, TypeScript strictness, React Native and Expo SDK 55 baseline currently checked in. Upgrade only through an explicit compatibility PR.
- Use Expo Router for file-based navigation, typed routes and deep-link alignment.
- Use TanStack Query for server state; Zustand only for short-lived UI/session coordination.
- Use Zod contracts from `@gozaika/types`; money/time/idempotency helpers from `@gozaika/utils`.
- Use Supabase JS for authentication, session refresh and permitted RLS reads/realtime only.
- Use `expo-secure-store` for refresh/session secrets and compact pickup credentials; never AsyncStorage.
- Add `expo-notifications`, `expo-device`, `expo-constants`, `expo-camera`, `expo-location`, `expo-local-authentication`, `expo-network`, `expo-linking`, `expo-router`, `expo-updates`, `expo-splash-screen`, `expo-font`, `expo-image`, `expo-file-system`, `expo-sharing` and `expo-sqlite` through `npx expo install`.
- Add the official Razorpay React Native Standard SDK (`react-native-razorpay`) to consumer only. It requires native development builds; Expo Go is not a valid test environment.
- Add a production crash/trace provider (recommended: Sentry React Native) with PII scrubbing and uploaded source maps.
- Do not import DOM-oriented components from `packages/ui`; extract tokens and pure models into React-Native-safe modules.

### 3.1 Current versus required dependency checklist

| Capability | Consumer now | Restaurant now | Required target |
| --- | --- | --- | --- |
| Expo/React Native shell | Present | Present | Retain SDK-compatible versions |
| Expo Router | Missing | Missing | Install and migrate both from single `App.tsx` |
| TanStack Query | Present | Missing | Configure shared provider/query policy in both |
| Zustand | Present | Missing | Use only where short-lived coordination is needed |
| SecureStore | Present dependency | Present dependency | Implement custom Supabase session adapter |
| Razorpay native SDK | Missing | Not applicable | Consumer development/production builds only |
| Camera/location/biometrics/notifications | Missing | Missing | Install only declared per-app capabilities |
| SQLite/network/updates/linking | Missing or not wired | Missing or not wired | Shared bounded offline/lifecycle layer |
| Sentry or equivalent | Missing | Missing | PII-redacted crash/performance telemetry |
| `packages/mobile-core`, `packages/mobile-ui` | Missing | Missing | Create, test and document public exports |

Implementation agents must verify `package.json`, Expo config and native prebuild output; this table describes a target, not existing partial implementation.

## 4. Repository shape

```text
apps/
  consumer-mobile/
    app/                 # Expo Router routes
    src/{api,auth,components,features,native,state,storage,theme}
  restaurant-mobile/
    app/
    src/{api,auth,components,features,native,state,storage,theme}
packages/
  mobile-core/           # auth storage, API client, errors, query keys, telemetry
  mobile-ui/             # RN tokens/components; no web/DOM dependency
  types/ utils/ supabase/
```

`mobile-core` must not contain app-specific navigation or copy. `mobile-ui` must support Dynamic Type, dark/high-contrast readiness, RTL-safe layout even though v1 ships English, 44pt iOS/48dp Android targets and tablet breakpoints.

## 5. Authentication and API boundary

### 5.1 Authentication

- Primary: Indian phone OTP through Supabase Auth. Normalize with `normalizeIndianPhone`.
- Secondary: Google OAuth using platform-native browser session and deep-link callback.
- Store the Supabase session in SecureStore through a custom adapter; auto-refresh only while app is active.
- Consumer bootstrap may call the consumer-profile bootstrap RPC, then enforce DPDP consent before transactional use.
- Restaurant bootstrap is separate: resolve/create only the IAM identity required for an existing restaurant actor, then return active `restaurant_team_membership`, role and restaurant status. It must not create a `consumer_profile` as a side effect unless a separately approved dual-role design explicitly requires it. The existing restaurant web bootstrap currently calls `api_bootstrap_consumer_profile`; extract and correct this boundary before mobile use.
- Sign-out clears SecureStore, query cache, cached private data, push-token association and pending deep links.
- Biometric unlock protects a locally retained authenticated session after user opt-in. It is not server authentication and cannot replace OTP/OAuth.

### 5.2 Required mobile API adapters

Existing web handlers obtain sessions from Next.js cookies. Mobile must not emulate browser cookies and must never contain a service-role key. Add versioned adapters:

- `https://customer.gozaika.in/api/mobile/v1/...`
- `https://restaurant.gozaika.in/api/mobile/v1/...`

Every authenticated call sends `Authorization: Bearer <Supabase access token>`, `X-GoZaika-App`, app version, platform and an idempotency key for mutations. A shared server helper must validate the JWT with Supabase, resolve `iam_profile`, enforce consumer/restaurant ownership and role, then call extracted domain services. Keep service-role access server-only. Return a stable envelope:

```json
{"ok":true,"data":{},"requestId":"uuid","serverTime":"ISO-8601"}
```

Errors use `{ok:false,error:{code,message,retryable,fieldErrors?},requestId}` and correct HTTP status. Do not expose SQL, provider payloads, hashes, raw QR nonce, internal contact data or service exceptions.

Public discovery may use cacheable API endpoints or safe public views. Security-sensitive mutations—claim, payment order, pickup verification, no-show, incidents, document signing—must use server APIs.

### 5.3 Compatibility

- `/api/mobile/v1` is additive; do not break web routes.
- DTOs are exported from `@gozaika/types` and contract-tested against web domain services.
- Mobile sends `X-Client-Schema-Version: 1`. Server may reject obsolete clients with `426 APP_UPDATE_REQUIRED`.
- Use UTC over the wire and `Asia/Kolkata` for business display; use integer paise only.

## 6. Cross-cutting state and reliability

- Query defaults: stale public discovery 30 seconds; active drop/order 10 seconds; profile 5 minutes; retry GET/network errors with bounded exponential backoff; never automatically retry non-idempotent mutations without the same key.
- Realtime is a refresh signal, not source of truth. On inventory/order events, invalidate and re-fetch.
- Each screen implements loading skeleton, empty, partial-data, offline, permission-denied, retryable and terminal states.
- Foreground/background lifecycle refreshes active holds, payments, orders and pickup queues.
- Persist only bounded non-sensitive caches in SQLite. Encrypting the database is not assumed; exclude full profiles, contact details, documents, payment tokens and raw credentials.
- Consumer pickup proof: keep the minimum QR payload/OTP plus display context in SecureStore; remove after terminal state or pickup-end plus 24 hours.
- Restaurant offline mode: cached order summaries may be viewed. A scan/OTP may be held in memory as `PENDING_NETWORK`, but the UI must never show “collected” until server confirmation. Do not persist raw OTP/QR after success or app termination.
- Display stale timestamps and connectivity status. Provide manual refresh.

## 7. Native capability contracts

### Push

Extend the existing `notification_device` table from the consolidated schema rather than creating a duplicate registry. Add only missing fields for app identifier, permission state, locale, app/build version and revoked timestamp, preserving token uniqueness, profile ownership, `is_active` and `last_seen_at`. Token registration/revocation is authenticated. Extend the notification processor for `PUSH`; deduplicate by outbox event and device. Deep links must target allow-listed routes. Notification content must avoid allergens, payment details, phone numbers and pickup OTP/QR on lock screens.

Customer categories: order confirmation, payment confirmed/failed, pickup reminder, order state, review prompt and production-equivalent drop alerts only when consent permits. Restaurant categories: new paid order, pickup window, operational incident and compliance/review status where production has an equivalent event.

### Location and maps

Request foreground permission only when the user invokes “Near me,” map centering or address pinning. Core discovery remains usable without permission. Do not declare background location. Store a chosen neighborhood/address, not location history. Open Apple Maps/Google Maps for directions with user action.

### Camera and photos/files

Restaurant camera permission is just-in-time for QR scanning or permitted document capture. Customer camera is not required for parity. Document selection must support PDF/JPEG/PNG, validate MIME/size server-side and upload only to signed private paths.

### Biometrics

Opt-in local app lock; fall back to device passcode/app login. Never gate urgent restaurant pickup behind biometrics if the session is already actively unlocked.

## 8. Design and accessibility

- Canonical assets: `icons/gozaika-logo-horizontal.svg`, `icons/gozaika-logo-white.svg`, `icons/gozaika-app-icon-1024.png`, and `icons/flame.svg` (the BAM flame-drop mark).
- Palette: saffron `#FF6B35`, forest `#1A5C38`, gold `#D4A017`, cream `#FFF8F0`, charcoal `#2D2D2D`, white. Preserve exact logo proportions and BAM negative space.
- Customer surfaces emphasize saffron/cream; restaurant surfaces emphasize forest/cream. Status colors must also have text/icons.
- Use native safe areas, keyboard avoidance, reduced-motion support, screen-reader announcements for countdown/payment/pickup results and WCAG 2.2 AA contrast.
- Never use “leftover,” “stale,” “cheap,” “clearance,” “liquidation,” “food rescue,” or “bargain bin.” Use BAM Bag, Limited Drop, Chef’s Selection, pickup window and partner-action language.

## 9. Security and privacy release gates

- Threat-model session theft, deep-link injection, QR replay, rooted devices, screenshot exposure, offline staleness, token duplication and role escalation.
- Universal/App Links must be domain-associated; custom-scheme links accept only allow-listed paths and validated UUIDs.
- Apply certificate/TLS defaults; do not add custom pinning until a rotation strategy exists.
- Redact Authorization, phone/email, access/refresh token, Razorpay data, QR/OTP, document URL and precise coordinates from logs/crash reports.
- Prevent screenshots on Android pickup credential and sensitive restaurant document screens where practical; obscure sensitive content in app switcher on both platforms.
- Provide in-app account deletion entry for customer and a restaurant account/support closure route; link to the existing privacy-erasure workflow.
- Complete Apple App Privacy, privacy manifest/required-reason API review and Google Data Safety from actual SDK behavior, not guesses.
- DPDP consent remains purpose-scoped and append-only. Push marketing requires the corresponding consent; OS notification permission alone is insufficient.

## 10. Build configuration and environments

Use `development`, `preview` and `production` EAS profiles. Production uses remote version source and auto-increment. Add separate EAS environment variables for preview/production:

- `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`
- `EXPO_PUBLIC_CUSTOMER_API_ORIGIN`, `EXPO_PUBLIC_RESTAURANT_API_ORIGIN`
- `EXPO_PUBLIC_RAZORPAY_KEY_ID` (consumer only; never key secret)
- `EXPO_PUBLIC_SENTRY_DSN`, environment/release identifiers
- EAS project/updates configuration and Google Maps key only if native map provider needs it

Server secrets—including Supabase service role, Razorpay secret/webhook secret, pickup credential secret, APNs key and Google service-account JSON—must not use `EXPO_PUBLIC_` and must never enter the JS bundle.

CI gates: clean install, format/lint, TypeScript, unit tests, contract tests, dependency/security scan, Expo Doctor, config introspection, Android/iOS preview build, Maestro critical-flow tests and artifact provenance. Maestro is the v1 end-to-end choice because both apps use Expo development builds; do not add Detox in parallel without a recorded ADR. Production builds only from protected tags/commits with manual approval.

Contract schemas and fixtures live in `packages/types/src/mobile/` and `packages/types/test-fixtures/mobile/`. Server domain-service contract tests live beside the extracted services in each web app or a shared server package; mobile client decoding tests must consume the same fixtures.

## 10.1 Living parity ledger

Create and maintain `docs/mobile/mobile-parity-ledger.md` with one row per production workflow: web route, native route, current web API/service, target mobile API, role/auth requirement, implementation slice, status, automated test and evidence link. A slice cannot be marked complete until its rows are updated. The ledger—not memory or a one-time audit—is the release reconciliation source of truth.

## 11. Store bundles and listing package

### Binary/signing artifacts

| Store | Required delivery |
| --- | --- |
| Google Play | Signed Android App Bundle `.aab`, Play App Signing enrollment, upload key/keystore backup, SHA-256 fingerprints, mapping/native debug symbols when produced. New apps/updates must target Android 15/API 35 or higher as of this baseline. |
| Apple | Signed `.ipa` uploaded to App Store Connect/TestFlight, Distribution certificate, App Store provisioning profile, APNs key/capability, dSYM/source maps. |

EAS Build may manage credentials, but goZaika must own the Apple team, Google Play account, Expo organization and recovery access. First Google Play upload is manual before API/EAS submissions. EAS Submit uploads binaries; it does not complete listing metadata or App Review submission.

### Per-app store asset bundle

- 1024×1024 opaque master icon; Android adaptive foreground/background and monochrome icon; no Orbitwell marks.
- iPhone screenshots for current required display classes; restaurant also iPad screenshots. Android phone and 7/10-inch tablet screenshots for restaurant.
- Google Play feature graphic 1024×500; optional promo graphics/video only if polished.
- App name, subtitle/short description, full description, keywords (Apple), category, copyright, support URL, marketing URL, privacy-policy URL and release notes.
- App-review notes, reproducible non-expiring review account/OTP bypass approved for review, and instructions for Razorpay test mode/camera/role flows.
- Privacy nutrition labels/Data Safety, content rating, ads declaration, target audience, account-deletion URL, export-compliance answers and age rating.
- Localized English (India) metadata; Hindi/Telugu are future unless separately approved.

### Recommended categories

Customer: Apple Food & Drink; Google Food & Drink. Restaurant: Apple Business primary/Food & Drink secondary; Google Business.

## 12. Testing and release acceptance

- Physical-device matrix includes current and previous two major iOS versions; representative low/mid/high Android API 26+ phones; iPad and Android tablet for restaurant.
- Test fresh install, update, revoked permissions, clock/time-zone changes, weak/offline network, killed app during payment, duplicate taps, expired hold, QR replay, wrong restaurant, already collected, session expiry and push deep links.
- Payment acceptance requires server-confirmed status after Razorpay returns. Client callback alone never unlocks pickup proof.
- Accessibility: VoiceOver/TalkBack, Dynamic Type/font scaling 200%, switch/keyboard tablet navigation, contrast and reduced motion.
- Performance budgets: first useful screen ≤2.5s on mid-range warm network, interaction response ≤100ms local, crash-free sessions ≥99.5%, ANR-free ≥99.5%.
- Rollout: internal QA → closed beta/TestFlight → production 5% → 25% → 100%, with halt thresholds for auth, payment, pickup, crash or API-error regression.

## 13. Required implementation sequence

1. Rename/reidentify projects and create goZaika-owned EAS/store records.
2. Build mobile-core/mobile-ui, Expo Router shells, auth storage and mobile bearer API helper.
3. Extract server domain services and add `/api/mobile/v1` contracts without changing web behavior.
4. Implement customer and restaurant parity vertical slices behind production-safe flags.
5. Add push backend, native permissions, deep links and bounded offline layers.
6. Complete automated tests, security/privacy review, store assets and review accounts.
7. Run beta, reconcile every parity row, then stage production rollout.

## 14. Authoritative references

- Repository: current web routes, shared types, migrations, product/runbook docs and demo seed.
- Expo build: <https://docs.expo.dev/build/setup/>
- Expo submit: <https://docs.expo.dev/submit/introduction/> (reviewed 18 June 2026; page updated 23 May 2026)
- Google target API requirements: <https://support.google.com/googleplay/android-developer/answer/11926878?hl=en>
- Apple privacy manifests: <https://developer.apple.com/documentation/bundleresources/privacy_manifest_files>

Revalidate store rules, SDK privacy declarations and target API immediately before submission because store policy changes independently of this specification.
