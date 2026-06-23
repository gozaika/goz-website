/**
 * Marketing capture — Video C (primary, web): Restaurant Onboarding (restaurant-mgmt-web).
 * Storyboard: .codex-artifacts/gozaika-marketing-videos/storyboards/restaurant-onboarding.md
 * Captions:   .codex-artifacts/gozaika-marketing-videos/captions/restaurant-onboarding.json
 *
 * Capture-oriented Playwright script (raw `playwright` library) → raw .webm + per-scene PNGs.
 * Run via scripts/marketing-video-capture/capture-playwright.mjs, or standalone:
 *
 *   MGMT_BASE_URL=http://localhost:3001 \
 *   ARTIFACT_ROOT=.codex-artifacts/gozaika-marketing-videos \
 *   npx tsx apps/restaurant-mgmt-web/tests/marketing-video/restaurant-onboarding.spec.ts
 *
 * Login options (set MARKETING_C_LOGIN):
 *   - "otp" (default): Bawarchi OWNER phone 9876520001 / OTP 200001 (LOCAL test_otp). ACTIVE
 *     restaurant → professional, fully-populated onboarding summary + a working create-drop form.
 *     Zero extra setup.
 *   - "password": demo email/password panel (charminar.chai.co@gozaika.example / GozaikaDemo@123)
 *     for an ONBOARDING / in-progress look. Requires `npm run db:seed:demo:slice1 && :slice2`
 *     against the LOCAL project first. Create-drop scene is skipped (restaurant not yet ACTIVE).
 */

import { chromium, type Browser, type Page } from "playwright";
import { mkdirSync, renameSync, readdirSync } from "node:fs";
import { resolve } from "node:path";

const VIDEO_ID = "restaurant-onboarding";
const BASE_URL = process.env.MGMT_BASE_URL ?? "http://localhost:3001";
const ARTIFACT_ROOT = resolve(process.env.ARTIFACT_ROOT ?? ".codex-artifacts/gozaika-marketing-videos");
const RAW_DIR = resolve(ARTIFACT_ROOT, "raw", VIDEO_ID);
const SHOT_DIR = resolve(ARTIFACT_ROOT, "screenshots", VIDEO_ID);
const VIEWPORT = { width: 1440, height: 900 };
const LOGIN_MODE = (process.env.MARKETING_C_LOGIN ?? "otp").toLowerCase();
const DEMO_EMAIL = process.env.MARKETING_C_EMAIL ?? "charminar.chai.co@gozaika.example";
const DEMO_PASSWORD = process.env.MARKETING_C_PASSWORD ?? "GozaikaDemo@123";
const OWNER_PHONE = process.env.MARKETING_OWNER_PHONE ?? "9876520001";
const OWNER_OTP = process.env.MARKETING_OWNER_OTP ?? "200001";

async function login(page: Page) {
  await page.goto(`${BASE_URL}/auth/login`, { waitUntil: "networkidle" });
  if (LOGIN_MODE === "password") {
    await page.getByLabel("Demo email").fill(DEMO_EMAIL);
    await page.getByLabel("Demo password").fill(DEMO_PASSWORD);
    await page.getByRole("button", { name: /use demo restaurant/i }).click();
  } else {
    await page.locator('input[inputmode="tel"]').first().fill(OWNER_PHONE);
    await page.getByRole("button", { name: /send otp/i }).click();
    await page.locator('input[inputmode="numeric"]').first().fill(OWNER_OTP);
    await page.getByRole("button", { name: /verify and continue/i }).click();
  }
  // Wait for the redirect off /auth/login so the session cookie is persisted before navigating.
  await page.waitForURL((u) => !u.pathname.includes("/auth/login"), { timeout: 20000 }).catch(() => {});
  await page.waitForLoadState("networkidle");
}

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
    // Scene 1 — Sign in
    await page.goto(`${BASE_URL}/auth/login`, { waitUntil: "networkidle" });
    await page.getByText(/Restaurant owner login/i).first().waitFor({ timeout: 15000 });
    await shot(page, "restaurant-onboarding-001");
    await login(page);

    // Scenes 2-4 — Onboarding wizard (basics / compliance / documents) on one page.
    await page.goto(`${BASE_URL}/portal/onboarding`, { waitUntil: "networkidle" });
    await page.waitForTimeout(1200); // OnboardingClient loads its summary client-side.
    await shot(page, "restaurant-onboarding-002"); // Restaurant basics
    // Scroll to compliance + documents sections for the next two stills.
    await page.mouse.wheel(0, 700);
    await shot(page, "restaurant-onboarding-003"); // Compliance details
    await page.mouse.wheel(0, 700);
    await shot(page, "restaurant-onboarding-004"); // Private documents

    // Scene 5 — Create a brand-safe Chef's Selection (ACTIVE owners only).
    if (LOGIN_MODE !== "password") {
      await page.goto(`${BASE_URL}/portal/drops/new`, { waitUntil: "networkidle" });
      await page.waitForTimeout(900);
      await shot(page, "restaurant-onboarding-005");
    } else {
      console.log(`[${VIDEO_ID}] skipped create-drop scene (password/onboarding login is not ACTIVE).`);
    }

    console.log(`[${VIDEO_ID}] captured onboarding scenes (login=${LOGIN_MODE})`);
  } finally {
    await page.close();
    await context.close();
    await browser.close();
  }

  const webm = readdirSync(RAW_DIR).find((f) => f.endsWith(".webm"));
  if (webm) renameSync(resolve(RAW_DIR, webm), resolve(RAW_DIR, `${VIDEO_ID}.webm`));
}

main().catch((err) => {
  console.error(`[${VIDEO_ID}] capture failed:`, err);
  process.exit(1);
});
