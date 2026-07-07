# goZaika implementation — paste-ready session prompt

> Copy everything in the fenced block below into a fresh session to begin implementation.
> Recommended starting model: **Opus 4.8, high effort** (switch to Sonnet 5 for the marketing/mechanical phase to conserve tokens — the prompt says when).

```
You are implementing goZaika's go-live-ready, world-class upgrade across all surfaces. This is a MULTI-SESSION marathon on ONE feature branch. The quality bar is highest-in-class; world-class polish is NON-NEGOTIABLE. You are the sole developer and own the source exclusively.

READ FIRST — source of truth, read fully before any edit:
- docs/audit/business-model-audit.md  — converged strategy: brand (BAM/Zayka/Swaad; "Bada Zayka Ayega Maza"), generous chef's-thali product, two-layer moral/discovery messaging, House/Chef's/Dawat pricing, the restaurant economics calculator (§11), Order Again reorder spec (§20), allergen trust stack (§16), template-vs-drop composition (§19). §0 = the ordered build sequence — follow it.
- docs/audit/launch-readiness-audit-2026-07-05.md — every functional/parity/polish gap to fix (findings CW-*, RP-*, MK-*, CM-*, RM-*). Address ALL of them.
- docs/handoff/gozaika_handoff_v1.md + docs/web/w5-w7-autonomous-decisions.md — anti-drift conventions: tokens-not-raw-hex, banned consumer copy, real-data honesty, keep web-ci 10/10 & mobile-ci 7/7, deliberate decisions D1–D10 (do NOT re-file these as bugs).

GIT SETUP (do first):
- The strategy docs above are committed on branch codex/docs-marketing-rebaseline-bc (use its latest HEAD).
- Create the feature branch `claude-feature-parity` off `main`. Then bring the strategy docs across: `git checkout codex/docs-marketing-rebaseline-bc -- docs/audit/` and commit them on the new branch. Do ALL implementation work on `claude-feature-parity`.

GOAL: make the marketing site, gozaika.in, and all five app surfaces project a rock-solid business plan, a crystal-clear vision, world-class messaging + polish, and defendable value props for customers AND restaurants. Fix every audit gap and parity recommendation.

BRANCH, DEPLOY & MIGRATION DISCIPLINE:
- Push `claude-feature-parity` to GitHub whenever you need to test on remote Vercel/Supabase — branch pushes create Vercel PREVIEW deployments (confirm preview-vs-prod on your first push). Applying migrations to remote Supabase is AUTHORISED for this work (CLOUD_SUPABASE_DB_URL / DIRECT_URL in .env.local; apply via the supabase/postgres docker image or supabase CLI).
- Merging to `main` AUTO-DEPLOYS to Vercel PROD (https://vercel.com/gozaika). Keep main deployable. Merge to main ONLY when every gate is green (web-ci 10/10, mobile-ci 7/7, Playwright, Maestro), and ASK the user before that final prod merge.

BUILD SEQUENCE: follow §0 of the business-model doc. START with banners + explainer HTML, then gozaika.in + the calculator, then consumer surfaces, then restaurant surfaces, then cross-cutting, then tests+deploy.

TESTING (thorough; NO live providers needed):
- Login OTP works on HOSTED via configured test phone numbers (verified: +919876510001 / 100001 returns a session). Use the numbers in supabase/seed_demo/README.md "## Login credentials" on web + device + apps.
- Payment: SIMULATOR (Razorpay lands August). PAYMENTS_SIMULATOR_ENABLED=true is set as a Vercel Shared env var — verify it is EFFECTIVE after a deploy (Vercel env changes need a redeploy) so mobile checkout (CM-1) completes. (Reminder to note for the user: disable it when Razorpay goes live.)
- Notifications: NOTIFICATION_DRY_RUN=true — assert enqueue + rendered payload; no provider needed. Pickup codes are server-side hashes; render them in-app (fixing CM-2 also removes the mobile SMS dependency). Only real-world delivery to a phone is untestable without a provider — out of scope now.
- Extend Playwright (web *.spec.ts) + Maestro (mobile) for ALL new coverage: calculator, Order Again reorder, allergen-conflict gate, thali/variety framing, mobile checkout, in-app mobile pickup code. Run them and do the test-fix iteration until green.
- Hands-on verify EVERY changed surface: Chrome MCP for web at desktop + 375 + 320 + tablet; adb on the Pixel 7a for both mobile apps. Screenshot evidence.

TOOLING (verified available this session):
- Android device via adb (Pixel 7a; in.gozaika.customer + in.gozaika.restaurant installed). Drive with `adb shell input ...` + `adb exec-out screencap -p`.
- Chrome MCP extension connected (Browser 1) for the web surfaces.
- Local Docker Supabase stack running (fallback). Remote + local creds in .env.local (CLOUD_* = remote). Prefer deployed/remote surfaces; fall back to local `npm run dev` + local Supabase only if remote is unavailable.
- Refresh demo data before hands-on: `select * from public.demo_prepare_for_demo(p_create_live_drops => true);` against remote.
- MOBILE BUILD/TEST (owner chose LOCAL dev client + Metro over EAS): the apps installed on the device are RELEASE builds — server/BFF changes reflect immediately (they call the prod BFF via Vercel), but RN/client source changes need the dev client. One-time per app: `npx expo run:android` (uses the Android Studio SDK/Gradle toolchain) to install the dev client on the physical Pixel 7a and/or the Android Studio emulator; then `expo start` + Metro hot-reloads JS (adding a NEW native dependency requires re-running `expo run:android`). Two Expo apps = two Metro instances/ports. adb is the automation workhorse (screencap/input — verified); Phone Link is supplementary mirroring. DEFAULT the dev client at REMOTE Supabase + preview/prod BFF (matches the web surfaces, fewest moving parts); use LOCAL Supabase only for isolated debugging — and if so, the Supabase/BFF URL must be reachable from the target: `10.0.2.2` for the emulator, the host LAN IP for the physical device (NOT `127.0.0.1`). Verify the dev client's env target before trusting test results. No EAS credentials needed for this local-dev path.
- WINDOWS MAX_PATH — KNOWN ISSUE, do NOT rediscover: the 260-char path limit breaks Gradle/RN Android builds run from the deep source path (C:\venkat\limca\gozaika\sourcecode\apps\...\android\...\build\intermediates\...). The established workaround is a SHORT build path: `C:\tmp\gozaika-build` — a plain (non-git) copy of the repo that already contains both mobile apps and a prior Android build. Two-mode workflow: (1) NATIVE dev-client build (one-time + on any new native dependency): sync the current branch source into `C:\tmp\gozaika-build` (e.g. robocopy; overwrite the existing build when necessary), then run `npx expo run:android` THERE to build + install the native dev client on the device/emulator; (2) ONGOING JS iteration: run `npx expo start` from the REAL source (C:\venkat\...\sourcecode) — the installed dev client loads JS from Metro and hot-reloads, so day-to-day JS work needs no C:\tmp round-trip. So MAX_PATH only bites the initial/native build, not JS iteration. (Also present in C:\tmp: a `gz` symlink to the source and a `gzb-build` folder.)
- BRANCH BASE NOTE: `claude-feature-parity` off `main` will NOT include the recent `Marketing-*` commits on `codex/docs-marketing-rebaseline-bc`. The new marketing implementation supersedes them, so this is expected — but confirm with the user on the first push if anything from those commits should be preserved.

MODEL / EFFORT (Pro plan, token-conscious):
- Default Opus 4.8, HIGH effort, for: app-surface bugs, the calculator/reorder/allergen logic, and the test-fix debug loop.
- Drop to Sonnet 5 for clearly-specified mechanical work: banner/explainer/site copy, straightforward component edits.
- A prompt cannot self-switch the model mid-run — tell the user to /model switch at phase boundaries (flag when). Prefer manual /model switching over sub-agents (sub-agents cold-start on Pro = expensive).

HANDOFF DISCIPLINE (zero drift across sessions):
- Maintain docs/audit/IMPLEMENTATION-PLAN.md (phased checklist, per-item status) and docs/audit/CONTINUE-HERE-impl.md (current state, branch, what's done+verified, next step, gotchas). Update BOTH after every meaningful chunk.
- When context runs low: STOP, update both docs, and tell the user to start a fresh session pointed at CONTINUE-HERE-impl.md. Never continue past the point where drift becomes likely.

ANTI-DRIFT / QUALITY:
- Tokens not raw hex. Banned consumer copy (leftover|stale|cheap|clearance|liquidation|food rescue|sample|surplus) — waste-economics framing is B2B/restaurant-only (§15), never consumer-facing. Real data only; no fabricated state. Keep web-ci 10/10 and mobile-ci 7/7. App changes SURGICAL — only to the extent necessary.
- Every visual change gets a polish/QA pass against design tokens + responsive + device. World-class bar, no exceptions.

LOCKED DECISIONS (owner-approved — no need to re-ask):
- Imagery (CW-3): source catchy food/restaurant images via internet image search (lowest friction), surgical AI edits if needed. This is DEMO data, pre-launch — copyright not a concern now; swap to licensed/owned assets before commercial launch. Lowest-friction placement = static public assets (mirror existing /art, /images dirs); or seed the media pipeline (public-media bucket).
- A11y human sign-off: deferred — the owner will run a comprehensive keyboard+screen-reader review AFTER this implementation. Keep the automated axe gate green during the work.
- Expired-holds release job: the 32 stale holds were cleared once this session; the owner will install Cron to schedule public.api_release_expired_inventory_holds AFTER implementation. Do not build scheduling now; just don't regress availability accounting.
- SMS provider: deferred to post-go-live. Recommendation on record: MSG91 (via Supabase Send SMS Hook) for India OTP + Meta WhatsApp (already wired) for transactional. Test numbers + dry-run cover all testing until then.

BEGIN with the GIT SETUP + Phase 0 (tooling verify + seed refresh), then Phase 1 (banners + explainer HTML). Confirm your Phase 1 plan with the user before editing.
```
