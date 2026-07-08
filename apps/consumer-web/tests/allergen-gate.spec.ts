import { expect, test } from "@playwright/test";
import { loginByPhoneOtp, RAHUL } from "./auth-helpers";

// Phase 5 — §16 allergen-conflict gate (consumer-web). Signed-in as Rahul (VEG),
// opening a NON_VEG drop and pressing Hold must surface the explicit-ack
// interstitial (owner decision: warn, never silently block). Read-only: we assert
// the gate then Cancel — no hold is created, so the spec does not mutate demo data.
//
// Opt-in (RUN_AUTHED_SMOKE=1): the live phone-OTP sign-in against remote is too
// slow/env-dependent to gate on, so it is excluded from the default web-ci run.
//   RUN_AUTHED_SMOKE=1 npm run e2e -w @gozaika/consumer-web

test("VEG customer sees the allergen-conflict gate before holding a Non-Veg bag", async ({ page }) => {
  test.skip(!process.env.RUN_AUTHED_SMOKE, "authed allergen-gate is opt-in (set RUN_AUTHED_SMOKE=1)");
  test.setTimeout(90_000);

  const signedIn = await loginByPhoneOtp(page, RAHUL);
  test.skip(!signedIn, "demo phone-OTP session unavailable (test OTPs not enabled on this env)");

  // Filter the drops list to Non-Veg and open the first result (conflicts with Rahul's VEG pref).
  await page.goto("/drops", { waitUntil: "domcontentloaded" });
  const dietaryFilters = page.getByRole("group", { name: /dietary filters/i });
  const nonVegChip = dietaryFilters.getByRole("button", { name: /^Non-Veg$/i });
  test.skip((await nonVegChip.count()) === 0, "no Non-Veg drop seeded in this environment");
  await nonVegChip.click();

  const firstDrop = page
    .locator('a[href^="/drops/"]')
    .filter({ hasNot: page.locator('a[href$="/drops"]') })
    .first();
  const href = await firstDrop.getAttribute("href").catch(() => null);
  test.skip(!href || href === "/drops", "no Non-Veg drop link available to open");

  await page.goto(href as string, { waitUntil: "domcontentloaded" });

  // Press Hold → the §16 interstitial must appear (Rahul VEG × Non-Veg bag = dietary conflict).
  await page.getByRole("button", { name: /hold this bam bag/i }).click();

  const gate = page.getByRole("alertdialog");
  await expect(gate).toBeVisible();
  await expect(gate).toContainText(/check this against your preferences/i);
  await expect(gate).toContainText(/doesn't match your saved dietary preference/i);
  await expect(gate.getByRole("button", { name: /claim anyway/i })).toBeVisible();

  // Cancel — do not create a hold (keep the spec non-mutating).
  await gate.getByRole("button", { name: /^cancel$/i }).click();
  await expect(gate).toBeHidden();
});
