/**
 * Marketing capture — Video D: Restaurant Management (restaurant-mgmt-web).
 * Storyboard: .codex-artifacts/gozaika-marketing-videos/storyboards/restaurant-management.md
 * Captions:   .codex-artifacts/gozaika-marketing-videos/captions/restaurant-management.json
 *
 * Capture-oriented Playwright script (uses the `playwright` library directly, not the
 * @playwright/test runner) so it produces a raw .webm video + per-scene PNG stills.
 * Driven by scripts/marketing-video-capture/capture-playwright.mjs, or standalone:
 *
 *   MGMT_BASE_URL=http://localhost:3001 \
 *   ARTIFACT_ROOT=.codex-artifacts/gozaika-marketing-videos \
 *   npx tsx apps/restaurant-mgmt-web/tests/marketing-video/restaurant-management.spec.ts
 *
 * Preconditions:
 *   - restaurant-mgmt-web dev/start server up on MGMT_BASE_URL, pointed at the LOCAL Supabase
 *     (NEXT_PUBLIC_SUPABASE_URL etc. = `npx supabase status -o env`), with NODE_ENV=development
 *     (or NEXT_PUBLIC_ENABLE_DEMO_LOGIN=true) so phone-OTP test_otp login works.
 *   - `npm run db:seed:marketing-videos` applied (Bawarchi Biryani Palace = ACTIVE, rich history).
 *
 * Login: marketing.restaurant.meera → Bawarchi OWNER, phone 9876520001 / OTP 200001 (LOCAL test_otp).
 */

import { chromium, type Browser, type Page } from "playwright";
import { mkdirSync, renameSync, readdirSync } from "node:fs";
import { resolve } from "node:path";

const VIDEO_ID = "restaurant-management";
const BASE_URL = process.env.MGMT_BASE_URL ?? "http://localhost:3001";
const ARTIFACT_ROOT = resolve(process.env.ARTIFACT_ROOT ?? ".codex-artifacts/gozaika-marketing-videos");
const RAW_DIR = resolve(ARTIFACT_ROOT, "raw", VIDEO_ID);
const SHOT_DIR = resolve(ARTIFACT_ROOT, "screenshots", VIDEO_ID);
const VIEWPORT = { width: 1440, height: 900 };
const PHONE = process.env.MARKETING_OWNER_PHONE ?? "9876520001";
const OTP = process.env.MARKETING_OWNER_OTP ?? "200001";

async function loginWithPhoneOtp(page: Page) {
  await page.goto(`${BASE_URL}/auth/login`, { waitUntil: "networkidle" });
  await page.locator('input[inputmode="tel"]').first().fill(PHONE);
  await page.getByRole("button", { name: /send otp/i }).click();
  await page.locator('input[inputmode="numeric"]').first().fill(OTP);
  await page.getByRole("button", { name: /verify and continue/i }).click();
  // finishAuth() POSTs /api/portal/bootstrap then router.replace("/") → dashboard. Wait for the
  // redirect off /auth/login so the session cookie is persisted before we navigate.
  await page.waitForURL((u) => !u.pathname.includes("/auth/login"), { timeout: 20000 }).catch(() => {});
  await page.waitForLoadState("networkidle");
}

async function shot(page: Page, clipId: string) {
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(900); // settle animations / avoid skeleton frames
  await page.screenshot({ path: resolve(SHOT_DIR, `${clipId}.png`), fullPage: false });
}

async function main() {
  mkdirSync(RAW_DIR, { recursive: true });
  mkdirSync(SHOT_DIR, { recursive: true });

  const browser: Browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: VIEWPORT,
    recordVideo: { dir: RAW_DIR, size: VIEWPORT },
    deviceScaleFactor: 2,
  });
  const page = await context.newPage();

  try {
    await loginWithPhoneOtp(page);

    // Scene 1 — Dashboard
    await page.goto(`${BASE_URL}/portal/dashboard`, { waitUntil: "networkidle" });
    await page.getByText(/Today at/i).first().waitFor({ timeout: 15000 });
    await shot(page, "restaurant-management-001");

    // Scene 2 — Active drop list
    await page.goto(`${BASE_URL}/portal/drops`, { waitUntil: "networkidle" });
    await page.getByText(/Active drop list/i).first().waitFor({ timeout: 15000 });
    await shot(page, "restaurant-management-002");

    // Scene 3 — Orders / pickup performance
    await page.goto(`${BASE_URL}/portal/orders`, { waitUntil: "networkidle" });
    await shot(page, "restaurant-management-003");

    // Scene 4 — Weekly ROI report (cards). Span the seeded history (~35 days) so the
    // report shows real sell-through / GMV / collected pickups, not just today's thin numbers.
    const fmt = (d: Date) => d.toISOString().slice(0, 10);
    const end = new Date();
    const start = new Date(end.getTime() - 35 * 24 * 60 * 60 * 1000);
    await page.goto(`${BASE_URL}/portal/reports?start=${fmt(start)}&end=${fmt(end)}`, { waitUntil: "networkidle" });
    await page.getByText(/Weekly ROI report/i).first().waitFor({ timeout: 15000 });
    await shot(page, "restaurant-management-004");

    // Scene 5 — ROI drop-performance table (scroll into view)
    await page.getByText(/Drop performance|No drops listed/i).first().waitFor({ timeout: 15000 });
    await page.mouse.wheel(0, 700);
    await shot(page, "restaurant-management-005");

    console.log(`[${VIDEO_ID}] captured 5 scenes`);
  } finally {
    await page.close();
    await context.close(); // flush video
    await browser.close();
  }

  // Rename the single recorded .webm to a stable clip name.
  const webm = readdirSync(RAW_DIR).find((f) => f.endsWith(".webm"));
  if (webm) renameSync(resolve(RAW_DIR, webm), resolve(RAW_DIR, `${VIDEO_ID}.webm`));
}

main().catch((err) => {
  console.error(`[${VIDEO_ID}] capture failed:`, err);
  process.exit(1);
});
