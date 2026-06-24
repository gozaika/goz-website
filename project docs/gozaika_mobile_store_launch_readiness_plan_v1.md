# goZaika Mobile Store Launch Readiness Plan v1

Date: 2026-06-23

Scope: closed-beta / internal-beta launch readiness for two mobile apps:

- Customer app: `goZaika`
- Partner app: `goZaika Partner`

This plan rolls app-store readiness into the marketing video and screenshot-capture workstream because the same product state, demo data, seeded accounts, Maestro flows, Playwright captures, captions, brand assets and review instructions should power both marketing collateral and store submission material.

## 1. Launch Stance

Current stance:

- Launch target is closed beta / internal beta, not proof-only collateral.
- Target operational geography is India.
- Support/reviewer access may include users in India and the US, but public store availability should default to India only unless the owner explicitly approves US availability.
- Real Razorpay RN checkout remains deferred until India Razorpay keys/KYC are available.
- Beta payment path uses the gated simulator/test-success flow and seeded paid-order states. Store copy and reviewer notes must not imply real public payment processing until the production Razorpay path is enabled.
- Create two separate store listings, screenshots, reviewer-note sets and privacy declarations: one for `goZaika`, one for `goZaika Partner`.

Recommendation on enrollment:

- Google Play enrollment has started with a Personal account. Identity verification is pending.
- Current Google Play account details:
  - Account ID: `8113878207226747738`
  - Developer name: `GoZaika`
  - Account type: Personal
- Treat Personal-account requirements as a release constraint. Newer personal accounts can have extra testing/device-verification requirements before public distribution, so the release plan must include time for tester setup, policy gates and identity-verification completion.
- Defer paid Apple Developer enrollment if budget/timing is tight and Razorpay KYC is still blocking a full iOS production path. Do not defer iOS asset planning: keep iOS identifiers, screenshots, privacy labels, and TestFlight checklist in this plan so Apple can be activated quickly later.
- If the owner wants to test the complete iOS lifecycle, Apple enrollment cannot be skipped; TestFlight/App Store Connect submission requires it.

## 2. Current Known App Identity

Verified from current Expo config:

| App | Store listing name | Expo slug | Scheme | Bundle/package ID | Tablet stance |
| --- | --- | --- | --- | --- | --- |
| Customer | `goZaika` | `gozaika-customer` | `gozaika` | `in.gozaika.customer` | Phone-first; iOS tablet not supported |
| Partner | `goZaika Partner` | `gozaika-restaurant` | `gozaika-restaurant` | `in.gozaika.restaurant` | Tablet-capable; iPad/Android tablet screenshots required for partner story |

Current config notes:

- Customer splash background: `#FFF8F0`.
- Partner splash background: `#1A5C38`.
- Partner app already declares camera permission copy for QR pickup scanning.
- Both apps currently list iOS and Android in `app.json`; closed-beta sequencing may still start Android-only.

## 3. Owners

| Area | Owner | Output |
| --- | --- | --- |
| Product decisions | Founder / owner | Final geography, account enrollment, beta audience, payment stance, legal review owner |
| Mobile implementation agent | Source-code agent | EAS config, app identifiers, seed data, capture scripts, raw screenshots, reviewer accounts, smoke evidence |
| Store/copy agent | Source-code or content agent | Store listing copy, screenshot caption deck, privacy form drafts, reviewer notes |
| Visual polish agent | Codex/video-polish pass | Store screenshot compositions, optional preview videos, feature graphics, compressed exports |
| Legal/compliance | Legal team later | Privacy policy, terms, Data Safety, Apple privacy labels, DPDP wording, deletion workflow approval |
| Release engineer | Mobile implementation agent / owner | Store enrollment, signing credentials, EAS ownership, upload/submission checklist |
| QA | Mobile implementation agent / owner | Device matrix, accessibility, privacy/security gates, beta smoke report |

## 4. Required Artifact Tree

Suggested artifact root:

```text
.codex-artifacts/gozaika-store-launch/
  README.md
  manifest.json
  copy/
    gozaika-store-copy.md
    gozaika-partner-store-copy.md
    screenshot-captions.json
  privacy/
    apple-privacy-labels-draft.md
    google-data-safety-draft.md
    dpdp-consent-deletion-draft.md
    camera-push-location-disclosures.md
  reviewer/
    gozaika-reviewer-notes.md
    gozaika-partner-reviewer-notes.md
    test-accounts.json
  screenshots/
    raw/
      gozaika/
      gozaika-partner/
    polished/
      google-play/
      app-store/
  graphics/
    icons/
    splash/
    google-feature-graphics/
    app-preview-video-covers/
  release/
    eas-config-audit.md
    signing-credentials-checklist.md
    submission-checklist.md
    qa-evidence.md
```

Source-controlled companion files may live under:

```text
scripts/store-launch/
  README.md
  capture-store-screenshots.mjs
  compose-store-screenshots.mjs
  validate-store-assets.mjs
  manifest.schema.json
project docs/gozaika_mobile_store_launch_readiness_plan_v1.md
project docs/gozaika_marketing_video_capture_handoff_v1.md
```

## 5. Store Asset Kit

### Shared Brand Rules

- Brand capitalization: `goZaika`.
- Product terms: `BAM Bag`, `Chef's Selection`, `Limited Drop`, `pickup window`, `pickup proof`.
- Avoid: `discount`, `leftover`, `surplus`, `cheap`, `stale`, `clearance`, `liquidation`, `food rescue`, `bargain bin`.
- Customer visuals: saffron/cream/forest, premium discovery, trust, local food energy.
- Partner visuals: forest/cream/gold, operational control, customer acquisition, pickup confidence.
- Do not use Orbitwell marks or legacy identifiers.

### App Icons and Splash QA

Required per app:

- 1024 x 1024 opaque master icon for Apple and design archive.
- Google Play icon: 512 x 512 PNG, 32-bit PNG with alpha, under current Google file-size limit.
- Android adaptive icon foreground, background and monochrome icon.
- Splash screens for customer and partner app, verified on at least one Android phone, one iPhone target, and partner tablet layout.
- App switcher preview checked for sensitive pickup codes, restaurant documents and private data.

QA checks:

- Icon is legible at 48 px.
- No text too small to read.
- No transparent Apple icon master.
- Splash does not crop logo at common aspect ratios.
- Partner app icon is distinct enough from customer app while still clearly part of goZaika.

### Google Play Assets

Required per app:

- App icon: 512 x 512 PNG.
- Feature graphic: 1024 x 500 JPEG or 24-bit PNG, no alpha.
- Phone screenshots: use 1080 x 1920 portrait masters where possible; 2-8 screenshots per app.
- Tablet screenshots:
  - Partner app: 7-inch and 10-inch Android tablet screenshots, minimum 4 for large-screen listing quality.
  - Customer app: optional unless Android tablet support is intentionally enabled.
- Optional preview video: only if the ffmpeg-polished output is genuinely store-ready.
- Alt text for each major graphic, 140 characters or less.

Google Play screenshot baseline:

- Upload screenshots between 1080 and 7680 px.
- Use 9:16 portrait or 16:9 landscape for phone/tablet assets.
- Avoid placing screenshots in fake device frames for raw Play screenshots unless the current Play policy and listing context allow it.

### App Store Assets

Required per app once Apple enrollment is active:

- App icon: 1024 x 1024 opaque PNG.
- iPhone screenshots: prepare portrait masters for current App Store Connect required iPhone display classes.
- Partner app iPad screenshots: prepare iPad portrait and landscape masters because `supportsTablet` is true.
- Customer app iPad screenshots: not required if `supportsTablet` remains false.
- Optional app preview videos: only after polished video review.

Baseline Apple screenshot masters to prepare:

- iPhone large portrait: 1290 x 2796.
- iPhone fallback large portrait: 1242 x 2688.
- iPad portrait: 2048 x 2732.
- iPad landscape: 2732 x 2048.

Revalidate exact required App Store Connect screenshot classes immediately before upload; Apple changes accepted device classes over time.

## 6. Screenshot Plan

### `goZaika` Customer Listing

Goal: make the customer app feel like a premium, real local discovery product.

Target screenshots:

1. Home / Discover: nearby active BAM Bags.
2. Drops list: variety by cuisine, neighborhood, dietary/spice cues.
3. Drop detail: restaurant identity, pickup window, allergens, trust cue.
4. Claim / checkout: simulator/test success for beta, no real payment claim.
5. Order confirmed: pickup code sent / pickup instructions.
6. Orders: confirmed pickup-ready order.
7. Passport / discovery profile: return habit and identity.
8. Account / consent: trust and control, only if visually polished.

Suggested screenshot overlay captions:

- `Discover off-menu BAM Bags near you.`
- `See pickup windows and allergens before you claim.`
- `Reserve a Chef's Selection in a few taps.`
- `Pickup instructions stay clear at the counter.`
- `Build your goZaika Passport with every discovery.`

### `goZaika Partner` Listing

Goal: make the partner app feel like a serious restaurant operating system for pickup-based customer acquisition.

Target screenshots:

1. Dashboard: today's pickup and operational overview.
2. Pickup counter: ready orders grouped clearly.
3. Verify pickup: OTP / QR scan flow, camera permission clear.
4. Drops: create/manage Chef's Selections.
5. Profile/compliance: restaurant-controlled trust information.
6. Reports/ROI: performance and acquisition proof.
7. Finance: partner-safe totals and settlement visibility if visually ready.
8. Tablet dashboard/report: owner-friendly larger-screen view.

Suggested screenshot overlay captions:

- `Run pickup operations from one partner app.`
- `Verify each handoff before collection.`
- `Create brand-safe Chef's Selections.`
- `Track performance without exposing private customer data.`
- `Show owners how goZaika creates measurable demand.`

## 7. Store Listing Copy Deck

Create one markdown copy deck per app with:

- App name.
- Subtitle / short description.
- Full description.
- Keywords for Apple.
- Category.
- "What's new" / release notes.
- Support URL.
- Marketing URL.
- Privacy policy URL.
- Terms URL.
- Account deletion URL.
- Screenshot caption set.
- Content rating notes.
- Reviewer notes pointer.

### Draft Direction: `goZaika`

App name:

- `goZaika`

Apple subtitle / Google short description candidates:

- `Discover off-menu BAM Bags nearby`
- `Premium pickup-only food discoveries`
- `Chef's Selections from local kitchens`

Category:

- Apple: Food & Drink.
- Google Play: Food & Drink.

Full description themes:

- Discover limited BAM Bag drops from local partner kitchens.
- Review restaurant identity, pickup windows, dietary cues and allergen information before claiming.
- Reserve a pickup-only Chef's Selection.
- Track orders and pickup instructions.
- Build a Passport / discovery history as the platform expands.
- Closed beta in India; availability and payment flow may be limited during testing.

### Draft Direction: `goZaika Partner`

App name:

- `goZaika Partner`

Apple subtitle / Google short description candidates:

- `Pickup operations for partner kitchens`
- `Manage goZaika drops and pickups`
- `Restaurant tools for BAM Bag drops`

Category:

- Apple: Business primary, Food & Drink secondary if available.
- Google Play: Business.

Full description themes:

- Manage restaurant profile and trust information.
- Create and monitor Chef's Selection / BAM Bag drops.
- Verify pickup using OTP or QR scan.
- Review pickup performance, orders, finance and ROI reporting where enabled.
- Built for partner restaurants in goZaika's closed beta.

## 8. Public URL Plan

Current known website routes:

| Need | Proposed URL | Current status |
| --- | --- | --- |
| Marketing site | `https://gozaika.in/` | Existing site target |
| Privacy policy | `https://gozaika.in/privacy-policy` | Existing route found |
| Terms | `https://gozaika.in/terms-of-service` | Existing route found |
| Refund policy | `https://gozaika.in/refund-policy` | Existing route found |
| Food safety policy | `https://gozaika.in/food-safety-policy` | Existing route found |
| FAQ | `https://gozaika.in/faq` | Existing route found |
| Support | `https://gozaika.in/support` | Missing or unverified; create before review |
| Account deletion | `https://gozaika.in/account-deletion` or `https://gozaika.in/privacy-erasure` | Missing public route; runbook exists in docs only |
| Partner support | `https://gozaika.in/partner-support` | Missing or combine with support |

Legal team must review privacy, terms, refund, food safety, support and deletion copy before any public launch. For beta submission, draft reasonable versions now and mark them `LEGAL_REVIEW_PENDING`.

### Domain Email Inventory

Use goZaika domain addresses in public/store materials. Ignore any Gmail forwarding target when drafting assets.

| Purpose | Email |
| --- | --- |
| General contact | `contact@gozaika.in` |
| Customer support | `support@gozaika.in` |
| Restaurant partners | `partners@gozaika.in` |
| Waitlist / early access | `waitlist@gozaika.in` |
| Legal notices / privacy / DPDP | `legal@gozaika.in` |
| Security reports | `security@gozaika.in` |
| Abuse reports | `abuse@gozaika.in` |
| Billing / finance support | `billing@gozaika.in` |
| Careers | `careers@gozaika.in` |
| HR | `hr@gozaika.in` |
| Marketing / press | `marketing@gozaika.in` |
| Admin operations | `admin@gozaika.in` |
| Technical operations | `tech@gozaika.in` |
| Mail operations | `postmaster@gozaika.in` |

Recommended store/public usage:

- Store support email: `support@gozaika.in`.
- Partner app support email: `partners@gozaika.in` with fallback to `support@gozaika.in`.
- Privacy / account deletion / DPDP contact: `legal@gozaika.in`.
- Security disclosure contact: `security@gozaika.in`.
- Billing or refund escalation: `billing@gozaika.in`.
- General marketing site contact: `contact@gozaika.in`.

## 9. Privacy and Compliance Draft Pack

Create draft files under `.codex-artifacts/gozaika-store-launch/privacy/`.

### Apple Privacy Labels

Draft from actual SDK/app behavior, not aspirations:

- Contact info: phone number, email if collected.
- User content: restaurant compliance documents for partner app.
- Purchases/payment: beta simulator does not process real payment; production Razorpay will change disclosure.
- Identifiers: user ID, device/push token once Slice 16 lands.
- Location: declare only if app collects precise/approximate location; otherwise describe address/neighborhood inputs separately.
- Diagnostics: Sentry/crash logs once enabled.
- Sensitive info: avoid unless legal review determines food allergy/dietary data qualifies under store taxonomy.

### Google Data Safety

Draft per app:

- Data collected.
- Data shared.
- Purpose: app functionality, fraud prevention/security, analytics/crash diagnostics, account management, partner operations.
- Encryption in transit.
- Account deletion mechanism.
- Optional/required data distinctions.
- Payment simulator note for beta; update before real Razorpay launch.

### DPDP / Account Deletion

Required:

- In-app account deletion or clear link-out for customer account.
- Restaurant account closure/support route.
- DPDP consent purpose wording consistent with shipped consent screen.
- Deletion request route and operational SLA.
- Retention exceptions to be reviewed by legal and finance because orders/payments/compliance documents may require retention.

### Camera, Push and Location

Partner camera usage:

- "goZaika Partner uses the camera to scan a customer's pickup QR code at the counter."

Push/location:

- Slice 16 not complete yet. Draft declarations but do not enable store answers until implementation is verified.
- Push marketing requires goZaika consent plus OS permission.
- Location should remain address/neighborhood based unless native precise location is intentionally added.

## 10. Reviewer and Test Materials

Create reviewer notes for each app.

Required:

- Demo consumer phone number and OTP.
- Demo restaurant owner phone number and OTP.
- Demo counter staff phone number and OTP.
- Any admin reviewer account if web admin review is part of the scenario.
- Seeded restaurant names and order numbers.
- Payment simulator instructions.
- Pickup verification instructions:
  - Customer reaches confirmed order/pickup instructions.
  - Partner opens pickup counter.
  - Partner verifies via OTP or QR scan.
  - Expected success and failure states.
- Camera permission explanation for partner app.
- Known beta limitations:
  - Real Razorpay checkout deferred.
  - Availability limited to seeded/closed beta restaurants.
  - Push/deep links/location only when Slice 16 is complete.

Reviewer accounts must be non-expiring for the review window and safe to share with store reviewers. Do not use personal owner accounts.

## 11. Production Release Plumbing

### Accounts and Ownership

Required decisions:

- Google Play account is Personal, Account ID `8113878207226747738`, Developer name `GoZaika`; identity verification is pending.
- Decide later whether to stay Personal through beta or migrate/create an Organization account once business identity documents are ready.
- Apple Developer enrollment timing: defer or enroll now.
- Expo organization ownership and recovery access.
- Who owns 2FA/recovery for Apple, Google and Expo accounts.

### EAS and Signing

Required:

- EAS project IDs for both apps.
- `development`, `preview`, `production` profiles.
- Android package IDs locked:
  - `in.gozaika.customer`
  - `in.gozaika.restaurant`
- iOS bundle IDs locked:
  - `in.gozaika.customer`
  - `in.gozaika.restaurant`
- Android upload key / Play App Signing enrollment.
- Apple distribution cert/profile/APNs key when Apple enrollment starts.
- Versioning and build-number policy.
- Source maps/dSYM/native symbols upload plan.

### Runtime Environments

Required:

- Production Supabase URL and anon key for mobile.
- Customer BFF origin.
- Restaurant BFF origin.
- Storage buckets for product media and private restaurant documents.
- Edge Functions deployed and smoke-tested.
- Sentry or equivalent DSNs, with privacy redaction verified.
- Push credentials after Slice 16.
- Universal Links / App Links domain association after Slice 16.

Never put service-role keys, Razorpay secret/webhook secret, pickup credential secret, APNs private key or Google service-account JSON in `EXPO_PUBLIC_` variables or the JS bundle.

## 12. Readiness Gates

### Product Gates

- Customer: discovery, claim, simulated payment, order, pickup instructions, orders list/detail, Passport/account basics.
- Partner: dashboard, pickup counter, verify, drops, profile/compliance, finance/reporting where enabled.
- Restaurant onboarding: use web fallback if mobile wizard remains incomplete.
- Payment: beta simulator/test-success path only; no public real-money claims.

### QA Gates

- `node scripts/mobile-ci.mjs` green.
- Maestro customer critical journey green on Pixel 7 emulator or physical Android.
- Maestro partner counter journey green on Pixel 7 emulator or physical Android.
- Playwright capture scripts green for restaurant web onboarding/management.
- Real-device QA on at least:
  - Android mid-range phone.
  - Android tablet for partner.
  - iPhone when Apple work starts.
  - iPad for partner when Apple work starts.
- Accessibility pass:
  - TalkBack/VoiceOver basics.
  - Dynamic Type / font scaling.
  - Contrast.
  - 44 pt iOS / 48 dp Android tap targets.
- Privacy/security:
  - No secrets in mobile bundle.
  - Logs redact auth, phone/email, tokens, Razorpay data, QR/OTP, document URL and precise coordinates.
  - Sensitive screens reviewed for app-switcher/screenshot exposure.
  - Deep-link attack review once links are enabled.
  - Offline behavior reviewed.

### Store Gates

- Store copy reviewed for banned words and beta accuracy.
- Screenshots match current app UI.
- Google Data Safety and Apple privacy drafts reviewed against actual SDKs.
- Reviewer notes tested from a fresh device/session.
- Public legal/support URLs live.
- Account deletion route live.
- Content rating completed.
- Closed-beta tester list ready.
- Staged rollout halt criteria written.

## 13. Screenshot Capture and Composition Scripts

Extend the marketing capture package with store-specific outputs.

Script expectations:

```text
npm.cmd run db:seed:marketing-videos
npm.cmd run store:capture:screenshots -- --app gozaika
npm.cmd run store:capture:screenshots -- --app gozaika-partner
npm.cmd run store:compose:screenshots -- --all
npm.cmd run store:validate:assets -- --all
```

Capture requirements:

- Native mobile screenshots should come from Maestro/device screenshots where possible.
- Web fallback screenshots are allowed for restaurant onboarding and management if native flows are incomplete.
- Preserve raw screenshots without marketing overlays.
- Compose polished store screenshots into separate output folders.
- Generate `manifest.json` with app, screen, route, device, raw path, polished path, caption, dimensions, and caveats.

Composition requirements:

- Avoid overly busy marketing frames.
- Use the real product UI as the hero, not abstract illustrations.
- Use short captions only.
- Keep captions away from UI text and store crop zones.
- Produce Google Play and App Store variants separately.

## 14. Exact Missing Decisions

Owner decisions needed:

1. Wait for Google Play identity verification to complete; capture the final verification date and any account-specific testing requirements.
2. Decide whether to stay on the Personal Google Play account for beta or later move to/create an Organization account.
3. Whether to enroll Apple Developer now or defer until Razorpay KYC / iOS lifecycle budget is approved.
4. Closed-beta geography: India only, or India plus US tester availability.
5. Whether the customer app should support tablets later, or stay phone-only.
6. Whether the partner app should submit tablet screenshots at first beta or only phone screenshots until tablet QA is complete.
7. Final support URL and support email/phone.
8. Final account deletion URL and operational owner for deletion requests.
9. Legal reviewer for privacy, terms, refund, food safety, DPDP and Data Safety.
10. Whether store listings should mention "closed beta" explicitly or keep that limited to release notes/reviewer notes.
11. Whether optional app preview videos are worth submitting in the first beta package.
12. Whether Sentry or another crash tool is the production choice.
13. Whether push/deep links wait for Slice 16 before any store submission or are omitted from the beta.
14. Who owns store account 2FA/recovery and release approval.
15. Whether beta payments stay fully simulated or use Razorpay test mode after keys become available.

## 15. First Execution Slice

The first agent slice should produce:

- Finalized screenshot list for both apps.
- Store copy deck drafts for both apps.
- Reviewer notes drafts for both apps.
- Privacy/Data Safety draft checklist.
- Public URL gap list.
- Asset dimension manifest.
- Capture-script plan tied to existing Maestro/Playwright work.

The second slice should produce:

- Store screenshot raw capture scripts.
- Polished screenshot composition script.
- Feature graphic drafts.
- Icon/splash QA report.
- Store-readiness manifest.

The third slice should produce:

- EAS/signing/account checklist.
- QA evidence checklist.
- Reviewer accounts and seed-data validation.
- Closed-beta submission dry-run notes.

## 16. Polish Pass v1 Status

Created 2026-06-23 under:

```text
.codex-artifacts/gozaika-polish-v1/
```

Outputs:

- Google Play 9:16 screenshot masters for `goZaika`.
- Google Play 9:16 screenshot masters for `goZaika Partner`.
- Google Play 1024 x 500 feature graphic drafts for both apps.
- Four vertical social preview videos as WebM masters:
  - `customer-day-in-life-social.webm`
  - `restaurant-counter-social.webm`
  - `restaurant-management-social.webm`
  - `restaurant-onboarding-social.webm`
- Generator script:
  - `scripts/marketing-polish/polish-assets.mjs`

Current limitations:

- Customer screenshots were captured from an Expo dev-client build and still show part of the floating dev-client gear button near the top-right. The v1 composition reduces its prominence but does not fully remove it.
- `ffmpeg` was not visible to the Codex PowerShell process during the v1 pass, so the videos are WebM masters recorded through Chromium/Playwright. Once `ffmpeg` is available in the active shell, transcode WebM to MP4 with H.264/AAC for Instagram, WhatsApp and Play preview use.
- Partner OWNER native dashboard/drops/reports captures are still pending because the installed partner dev client predates Slice 12 and lacks `ExpoDocumentPicker`.

How to remove the floating gear overlay in future versions:

1. Build a preview or production Android client, not an Expo dev-client capture build.
2. Install that build for `in.gozaika.customer` on the Pixel 7 emulator or a physical Android device.
3. Point the build at the same seeded beta/staging backend used for reviewer accounts.
4. Re-run the store screenshot capture command for `goZaika`.
5. Re-run `node scripts/marketing-polish/polish-assets.mjs`.

If a dev-client capture must be used temporarily, keep it labeled as internal-beta draft material and replace before public store submission.
