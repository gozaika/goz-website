# goZaika Marketing Video Capture Handoff v1

Date: 2026-06-23

Audience: the implementation agent currently owning source code and mobile app completion.

Purpose: create deterministic storyboards, demo data, automated capture scripts, and raw visual assets for four short goZaika product-marketing videos. A later editing pass will use ffmpeg to add final styling, captions, pacing, music, and platform-specific exports.

## 1. Strategic Direction

These videos are not generic app walkthroughs. They are product proof: short, visually polished evidence that goZaika is a real operating platform with consumer discovery, restaurant operations, onboarding, and management workflows.

The videos should help with:

- Website confidence: visitors should immediately feel this is a built product, not a concept deck.
- Instagram / WhatsApp / LinkedIn sharing: short clips that communicate the platform without requiring a live demo.
- Restaurant conversations: clips that make partner value and operational flow concrete.
- Friends, family, partners, and hiring prospects: proof that the startup has taste, product shape, and execution momentum.

The visual story must preserve current goZaika positioning:

- Consumer side: premium food discovery, BAM Bags, off-menu Chef's Selections, trust, pickup clarity, and the thrill of trying something new.
- Restaurant side: brand-safe customer acquisition, simple pickup operations, operational control, and verified performance.
- Avoid leading with "discount", "leftover", "surplus", "cheap", "waste", or coupon-app energy.
- Preserve brand capitalization exactly: `goZaika`.
- Use `BAM Bag` consistently when naming the consumer product.

## 2. Requested Deliverables From Implementation Agent

Please produce a complete capture package in the repo. The later video-polish agent should be able to run one command, regenerate the raw footage, inspect a manifest, and proceed into ffmpeg editing without guessing routes, logins, seed state, or captions.

Required deliverables:

1. Storyboard markdown for four videos.
2. Machine-readable caption and screen metadata JSON for each video.
3. Demo seed data that makes all screens attractive, believable, and deterministic.
4. Maestro flows for mobile app captures.
5. Playwright scripts for web, admin, and restaurant portal captures.
6. A capture runner that produces raw video clips and screenshots into a stable artifact directory.
7. A manifest mapping every raw clip to its storyboard scene, caption IDs, route, user, viewport, and expected duration.
8. Verification notes confirming the flows run cleanly and no private credentials or real customer data are present.

Suggested output root:

```text
.codex-artifacts/gozaika-marketing-videos/
  README.md
  manifest.json
  storyboards/
    customer-day-in-life.md
    restaurant-counter.md
    restaurant-onboarding.md
    restaurant-management.md
  captions/
    customer-day-in-life.json
    restaurant-counter.json
    restaurant-onboarding.json
    restaurant-management.json
  raw/
    customer-day-in-life/
    restaurant-counter/
    restaurant-onboarding/
    restaurant-management/
  screenshots/
    customer-day-in-life/
    restaurant-counter/
    restaurant-onboarding/
    restaurant-management/
  logs/
```

Suggested source-controlled files:

```text
scripts/demo/seed-marketing-video-data.ts
scripts/marketing-video-capture/
  README.md
  capture-all.mjs
  capture-playwright.mjs
  validate-captions.mjs
  manifest.schema.json
apps/consumer-mobile/.maestro/marketing-customer-day-in-life.yaml
apps/restaurant-mobile/.maestro/marketing-restaurant-counter.yaml
apps/restaurant-mobile/.maestro/marketing-restaurant-onboarding.yaml
apps/restaurant-mgmt-web/tests/marketing-video/restaurant-management.spec.ts
apps/admin-web/tests/marketing-video/restaurant-onboarding.spec.ts
```

Adjust paths if the app structure has changed, but preserve the intent and document the final paths in the artifact README.

## 3. Four Video Concepts

### Video A: Customer Day-In-Life

Primary audience: consumers, friends/family, website visitors, social.

Format target:

- Social: 9:16, 15-30 seconds.
- Website loop: 9:16 or 1:1, 8-15 seconds.
- Optional longer demo: 16:9, 45-60 seconds.

Story:

1. Customer opens goZaika and sees active premium BAM Bag drops nearby.
2. They filter or browse by neighborhood / cuisine / dietary preference.
3. They open a drop detail screen with restaurant identity, pickup window, allergens, and trust cues.
4. They claim one BAM Bag.
5. They complete payment or land on a successful paid order state.
6. They see pickup proof: QR, OTP, pickup window, restaurant address.
7. They finish with Passport / discovery profile / share card if available.

Tone:

- "I found something worth trying today."
- Premium, local, confident.
- No couponing, no distressed-inventory framing.

Candidate captions:

- `Find today's off-menu BAM Bags nearby.`
- `Clear pickup windows, allergens, and restaurant details before you claim.`
- `One tap reserves your Chef's Selection.`
- `Show your pickup proof at the counter.`
- `Every discovery builds your goZaika Passport.`

### Video B: Restaurant Counter

Primary audience: restaurant operators, staff trainers, partners.

Format target:

- Restaurant conversation: 16:9, 30-60 seconds.
- Social cutdown: 9:16, 15-25 seconds.

Story:

1. Counter staff opens the restaurant mobile app.
2. They see active pickup orders for the current pickup window.
3. A customer arrives with QR / OTP pickup proof.
4. Staff verifies the order.
5. The app confirms successful handoff.
6. The order moves from ready / active to collected.

Tone:

- Operationally simple.
- Staff can understand it in seconds.
- It feels safer than "just trust the customer."

Candidate captions:

- `Pickup orders are organized by today's counter flow.`
- `Staff verifies the customer proof before handoff.`
- `Collected orders update instantly.`
- `Simple enough for the dinner rush.`

### Video C: Restaurant Onboarding

Primary audience: restaurant prospects, sales conversations, prospective operators.

Format target:

- Website / partner deck: 16:9, 45-75 seconds.
- Social cutdown: 9:16, 20-30 seconds.

Story:

1. Restaurant starts onboarding from invite / sign-in.
2. Adds business profile basics.
3. Adds pickup instructions and kitchen identity.
4. Completes compliance / verification step or sees clear pending-review status.
5. Creates first draft drop / Chef's Selection / BAM Bag.
6. Previews how it will look to consumers.

Tone:

- "Professional, not hacky."
- Restaurant brand remains respected.
- goZaika is a channel, not a brand-eroding discount board.

Candidate captions:

- `Restaurants control how their kitchen appears on goZaika.`
- `Pickup details and trust information are captured upfront.`
- `Create a brand-safe Chef's Selection in minutes.`
- `Preview the consumer experience before going live.`

### Video D: Restaurant Management

Primary audience: restaurant owners, business partners, hiring prospects, investors.

Format target:

- Partner / sales demo: 16:9, 45-90 seconds.
- Website short: 16:9 or 1:1, 15-30 seconds.

Story:

1. Owner / manager opens restaurant management web portal.
2. Dashboard shows active drops, pickups, sales, and customer acquisition signals.
3. Manager edits or creates a drop.
4. Manager reviews orders / pickup performance.
5. Manager opens ZaikaIQ / ROI / reporting view if available.
6. Finish on proof of performance: new customers, paid pickups, repeat interest, or report export.

Tone:

- "This is a business system."
- Analytical but approachable.
- Restaurant-facing value should be customer acquisition and performance, not just lower commission.

Candidate captions:

- `Manage active drops from one restaurant workspace.`
- `Track pickup performance without exposing private customer data.`
- `See which Chef's Selections create new demand.`
- `goZaika turns off-menu discovery into measurable acquisition.`

## 4. Caption JSON Contract

Create one JSON file per video under `.codex-artifacts/gozaika-marketing-videos/captions/`.

The later ffmpeg polish pass will treat this JSON as the source of truth for overlay copy, timing, emphasis, and export variants. Keep copy short. Avoid text that would cover critical UI.

Required shape:

```json
{
  "videoId": "customer-day-in-life",
  "title": "Customer Day-In-Life",
  "primaryAudience": ["consumer", "website", "social"],
  "defaultAspectRatios": ["9:16", "1:1", "16:9"],
  "brandRules": {
    "brandName": "goZaika",
    "forbiddenWords": ["discount", "leftover", "surplus", "cheap", "waste"],
    "preferredTerms": ["BAM Bag", "Chef's Selection", "pickup proof", "discovery"]
  },
  "scenes": [
    {
      "sceneId": "customer-01-discover",
      "clipId": "customer-day-in-life-001",
      "source": "maestro",
      "app": "consumer-mobile",
      "routeOrScreen": "Discover",
      "userKey": "marketing.consumer.asha",
      "durationTargetSec": 4,
      "caption": {
        "text": "Find today's off-menu BAM Bags nearby.",
        "position": "bottom",
        "maxLines": 2,
        "emphasis": ["BAM Bags"]
      },
      "mustShow": [
        "active drops",
        "restaurant names",
        "pickup window"
      ],
      "mustAvoid": [
        "loading skeleton at final frame",
        "test data labels",
        "debug banners"
      ]
    }
  ]
}
```

Use stable IDs. The ffmpeg phase may reference `videoId`, `sceneId`, and `clipId` directly.

## 5. Demo Seed Data Requirements

Create deterministic demo data specifically for marketing capture. Do not depend on whatever happens to be in a developer database.

Seed script target:

```text
scripts/demo/seed-marketing-video-data.ts
```

Suggested package script:

```json
"db:seed:marketing-videos": "dotenv -e .env.local -- tsx scripts/demo/seed-marketing-video-data.ts"
```

The seed script should:

- Be idempotent.
- Delete / replace only records it owns, using a clear namespace such as `marketing-video`.
- Never touch production data.
- Use explicit demo user emails and phone numbers.
- Create attractive and believable Hyderabad demo content.
- Produce all foreign keys and IDs needed by Maestro / Playwright flows.
- Write a machine-readable output file with seeded IDs and credentials safe for local demo use.

Suggested seed output:

```text
.codex-artifacts/gozaika-marketing-videos/seed/seed-output.json
```

Required demo personas:

- Consumer: `Asha Rao`, Jubilee Hills / HITEC City, adventurous but allergy-aware.
- Restaurant counter staff: `Imran`, logged into a partner restaurant account.
- Restaurant owner / manager: `Meera`, logged into restaurant management web.
- Platform admin if needed: `goZaika Ops`.

Required restaurants and drops:

- At least 3 active restaurants with high-quality names and cuisine identities.
- At least 5 active drops across different cuisines and dietary/spice profiles.
- One premium hero drop for the customer claim journey.
- One order in `READY_FOR_PICKUP` state for counter verification.
- One completed order history set for Passport / reporting.
- Restaurant management data with sales, pickups, repeat / new customer indicators, and report rows if those views exist.

Suggested demo content:

- Restaurant names:
  - `Deccan Ember Kitchen`
  - `Kakatiya Coastal Table`
  - `Charminar Spice Room`
- Drop names:
  - `Chef's Coastal BAM Bag`
  - `Dum Biryani Discovery Bag`
  - `Millet Tiffin Chef's Selection`
  - `Rayalaseema Spice Trial`
  - `Dessert Flight BAM Bag`
- Neighborhoods:
  - `Jubilee Hills`
  - `HITEC City`
  - `Banjara Hills`
  - `Kondapur`

Avoid obviously fake labels like `Test Restaurant`, `Demo Drop`, `Foo`, `Lorem`, `QA`, or UUIDs visible in UI.

## 6. Maestro Requirements

The repo has accepted Maestro as the v1 mobile E2E framework in `docs/adr/0001-maestro-over-detox.md`. Please keep mobile marketing flows in Maestro rather than adding Detox or Appium.

Expected flows:

```text
apps/consumer-mobile/.maestro/marketing-customer-day-in-life.yaml
apps/restaurant-mobile/.maestro/marketing-restaurant-counter.yaml
apps/restaurant-mobile/.maestro/marketing-restaurant-onboarding.yaml
```

Each flow should:

- Use accessibility labels and visible text where possible.
- Avoid brittle coordinate taps unless there is no accessible alternative.
- Include wait/assert steps that avoid capturing loading skeletons.
- Pause briefly on each final screen state so recording has usable frames.
- Keep animations enabled if they improve marketing polish, but avoid long idle waits.
- Be executable both for test verification and for raw video capture.
- Document required simulator/emulator dimensions and OS assumptions.

For each Maestro-captured scene, provide:

- The flow file path.
- The command used to run it.
- The expected app build / bundle ID.
- The demo user key.
- Any needed environment variables.
- Raw screen recording output path.

## 7. Playwright Requirements

Use Playwright for web, admin, and restaurant management captures.

Expected capture targets:

- `apps/restaurant-mgmt-web`: restaurant management dashboard, drop management, orders, reporting / ZaikaIQ.
- `apps/admin-web`: onboarding review or platform-admin screens if needed.
- `apps/website`: optional homepage / restaurant-facing landing page short clip if useful for transitions.
- `apps/consumer-web`: optional consumer web parity clip if it strengthens website confidence.

Please create scripts that are capture-oriented, not only assertion-oriented. It is fine to keep them alongside tests, but they should produce video and screenshots.

Playwright requirements:

- Use deterministic viewport sizes:
  - `390x844` for mobile portrait captures.
  - `1080x1920` for vertical social captures where web is framed as mobile.
  - `1440x900` or `1920x1080` for web portal captures.
- Use saved authentication state or seeded login steps, documented clearly.
- Hide or avoid debug overlays, dev indicators, console noise, and unstable timestamps where possible.
- Wait for network idle or stable UI states before recording final scene moments.
- Capture both raw video and final screenshots for each scene.

## 8. Capture Runner

Create a single documented command for the later video-polish pass.

Suggested script:

```json
"video:capture:marketing": "node scripts/marketing-video-capture/capture-all.mjs"
```

Suggested behavior:

```text
npm.cmd run db:seed:marketing-videos
npm.cmd run video:capture:marketing -- --video customer-day-in-life
npm.cmd run video:capture:marketing -- --all
```

The runner should:

- Validate required tools and env vars.
- Confirm local dev servers or mobile builds are available.
- Run the requested Maestro and Playwright captures.
- Write raw clips and screenshots to `.codex-artifacts/gozaika-marketing-videos/`.
- Generate / update `manifest.json`.
- Fail fast with actionable error messages.

If full automation across mobile simulators is too brittle, split the runner into:

- `capture-playwright.mjs` for web flows.
- documented Maestro commands for mobile flows.
- a manifest generator that can ingest manually placed raw mobile recordings.

## 9. Manifest Contract

Create:

```text
.codex-artifacts/gozaika-marketing-videos/manifest.json
```

Required shape:

```json
{
  "version": 1,
  "generatedAt": "2026-06-23T00:00:00.000Z",
  "repo": {
    "branch": "example-branch",
    "commit": "example-sha"
  },
  "videos": [
    {
      "videoId": "customer-day-in-life",
      "title": "Customer Day-In-Life",
      "status": "ready",
      "rawClips": [
        {
          "clipId": "customer-day-in-life-001",
          "sceneId": "customer-01-discover",
          "path": ".codex-artifacts/gozaika-marketing-videos/raw/customer-day-in-life/customer-day-in-life-001.mp4",
          "screenshotPath": ".codex-artifacts/gozaika-marketing-videos/screenshots/customer-day-in-life/customer-day-in-life-001.png",
          "source": "maestro",
          "app": "consumer-mobile",
          "viewport": {
            "width": 390,
            "height": 844,
            "deviceScaleFactor": 3
          },
          "durationSec": 4.2,
          "captionIds": ["customer-01-discover"],
          "notes": "Shows Discover screen with three active drops and pickup windows."
        }
      ]
    }
  ]
}
```

The later ffmpeg pass needs:

- Stable clip paths.
- Actual durations.
- Scene and caption IDs.
- Viewport / aspect ratio.
- Notes on what is visually important in each clip.
- Any caveats such as "manual capture", "needs crop", or "contains keyboard at start".

## 10. Quality Bar

Please do not hand off raw test recordings if they look like internal QA. The capture package does not need final motion graphics, but the underlying UI footage must be clean.

Acceptance criteria:

- No visible real user data, secrets, access tokens, provider payloads, database IDs, debug panels, localhost error pages, or console overlays.
- No fake-looking visible text such as `Test`, `Demo`, `Lorem`, UUID-heavy names, or empty-state filler unless the scene is intentionally about setup.
- Every captured screen is fully loaded and visually stable.
- Captions are short enough for mobile overlays.
- Text on captured UI is readable at target export sizes.
- Mobile flows use app screens, not only browser screenshots of mobile layouts.
- Restaurant-facing clips show operational seriousness, not just pretty dashboards.
- Consumer clips show trust cues: restaurant identity, pickup window, allergens or dietary cues, payment / pickup proof, and Passport if available.
- All four videos have at least one screenshot contact sheet or preview index for quick review.

## 11. What To Hand Back For ffmpeg Polish

When the implementation agent is done, please provide:

1. The branch name and commit SHA.
2. Exact commands to regenerate seed data and captures.
3. The artifact root path.
4. The final `manifest.json`.
5. The four caption JSON files.
6. The four storyboard markdown files.
7. Any known caveats or manual steps.
8. A short note listing which flows are fully automated and which require manual device recording.

The ffmpeg polish pass will then:

- Trim and pace raw clips.
- Add caption overlays using the JSON files.
- Add branded intro / outro frames if needed.
- Add device frames and web-browser framing if useful.
- Export 9:16, 1:1, and 16:9 variants.
- Create compressed versions for website and higher-quality masters for social / partner sharing.

## 12. Suggested Execution Order

1. Read this doc plus:
   - `project docs/gozaika_customer_mobile_technical_spec_v1.md`
   - `project docs/gozaika_restaurant_mobile_technical_spec_v1.md`
   - `project docs/gozaika_mobile_shared_architecture_and_release_spec_v1.md`
   - `project docs/gozaika_mobile_implementation_plan_v1.md`
   - `project docs/gozaika_asset_replacement_spec_v1.md`
   - `docs/adr/0001-maestro-over-detox.md`
2. Draft the four storyboards first.
3. Draft caption JSON next, before recording.
4. Implement deterministic seed data.
5. Add Maestro flows for mobile journeys.
6. Add Playwright capture scripts for web/admin/restaurant management.
7. Run capture once and inspect screenshots manually.
8. Fix demo data, screen pauses, or selectors until the raw footage looks presentation-worthy.
9. Generate manifest and README.
10. Hand back the artifact paths and caveats.

## 13. Open Questions For The Implementation Agent

Please answer these in the handoff README:

- Are both mobile apps feature-complete enough for the four requested journeys?
- Which journeys are native-mobile captures versus web fallback captures?
- Is payment shown as a real sandbox payment, a mocked success state, or a seeded paid order?
- Is restaurant onboarding self-serve in the restaurant mobile app, restaurant web app, or admin-assisted?
- Which reporting view is strongest for the restaurant management video: dashboard, ZaikaIQ, ROI report, finance, or orders?
- Are the video flows safe to run repeatedly against local / staging data?

