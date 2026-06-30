/**
 * Marketing capture — Video C (optional admin tail): Onboarding review (admin-web).
 * Storyboard: .codex-artifacts/gozaika-marketing-videos/storyboards/restaurant-onboarding.md  (scene onboarding-06)
 * Captions:   .codex-artifacts/gozaika-marketing-videos/captions/restaurant-onboarding.json   (clip restaurant-onboarding-006)
 *
 * Capture-oriented Playwright script (raw `playwright` library) → raw .webm + PNG still.
 * OPTIONAL: only needed for the admin-review tail of Video C. Skipped by the runner unless
 * ADMIN_BASE_URL resolves and a local admin user exists.
 *
 * Standalone:
 *   ADMIN_BASE_URL=http://localhost:3002 \
 *   ARTIFACT_ROOT=.codex-artifacts/gozaika-marketing-videos \
 *   npx tsx apps/admin-web/tests/marketing-video/restaurant-onboarding.spec.ts
 *
 * Preconditions:
 *   - admin-web server up on ADMIN_BASE_URL pointed at the LOCAL Supabase.
 *   - Local admin user seeded: `npm run demo:admin:create` against the LOCAL project
 *     (admin.ops@gozaika.example / GozaikaDemo@123).
 */

import { chromium, type Browser, type Page } from "playwright";
import { mkdirSync, renameSync, readdirSync } from "node:fs";
import { resolve } from "node:path";

const VIDEO_ID = "restaurant-onboarding";
const BASE_URL = process.env.ADMIN_BASE_URL ?? "http://localhost:3002";
const ARTIFACT_ROOT = resolve(process.env.ARTIFACT_ROOT ?? ".codex-artifacts/gozaika-marketing-videos");
const RAW_DIR = resolve(ARTIFACT_ROOT, "raw", VIDEO_ID);
const SHOT_DIR = resolve(ARTIFACT_ROOT, "screenshots", VIDEO_ID);
const VIEWPORT = { width: 1440, height: 900 };
const ADMIN_EMAIL = process.env.MARKETING_ADMIN_EMAIL ?? "admin.ops@gozaika.example";
const ADMIN_PASSWORD = process.env.MARKETING_ADMIN_PASSWORD ?? "GozaikaDemo@123";

async function shot(page: Page, clipId: string) {
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(900);
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
    await page.goto(`${BASE_URL}/auth/login`, { waitUntil: "networkidle" });
    await page.getByLabel("Admin email").fill(ADMIN_EMAIL);
    await page.getByLabel("Admin password").fill(ADMIN_PASSWORD);
    await page.getByRole("button", { name: /^sign in$/i }).click();
    await page.waitForLoadState("networkidle");

    await page.goto(`${BASE_URL}/admin/restaurants/onboarding`, { waitUntil: "networkidle" });
    await page.getByText(/Restaurant onboarding/i).first().waitFor({ timeout: 15000 });
    await shot(page, "restaurant-onboarding-006");

    console.log(`[${VIDEO_ID}] captured admin onboarding-review tail`);
  } finally {
    await page.close();
    await context.close();
    await browser.close();
  }

  // Suffix this clip so it doesn't collide with the mgmt-web onboarding .webm.
  const webm = readdirSync(RAW_DIR).find((f) => f.endsWith(".webm") && !f.startsWith(VIDEO_ID));
  if (webm) renameSync(resolve(RAW_DIR, webm), resolve(RAW_DIR, `${VIDEO_ID}-admin.webm`));
}

main().catch((err) => {
  console.error(`[${VIDEO_ID}] admin tail capture failed:`, err);
  process.exit(1);
});
