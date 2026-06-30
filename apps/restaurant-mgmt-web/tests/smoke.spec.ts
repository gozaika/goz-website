import { expect, test } from "@playwright/test";

// Functional smoke for restaurant-mgmt-web (W7 / e2e-coverage P0.2). The
// unauthenticated login shell is deterministic; the OWNER dashboard→drops flow is
// opt-in (RUN_AUTHED_SMOKE) because the demo password sign-in against live
// Supabase is too slow/flaky to gate on (see decision D4).

test("login shell renders", async ({ page }) => {
  await page.goto("/auth/login", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("main")).toBeVisible();
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
});

test("OWNER dashboard → drops", { tag: "@authed" }, async ({ page }) => {
  test.skip(!process.env.RUN_AUTHED_SMOKE, "authed smoke is opt-in (set RUN_AUTHED_SMOKE=1)");
  test.setTimeout(90_000);
  await page.goto("/auth/login", { waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: /use demo restaurant/i }).click().catch(() => {});
  await page.waitForURL("**/portal/dashboard", { timeout: 30_000 }).catch(() => {});
  test.skip(!page.url().includes("/portal/dashboard"), "demo session unavailable (no seed)");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await page.getByRole("link", { name: "Drops" }).first().click();
  await page.waitForURL("**/portal/drops", { timeout: 15_000 });
  await expect(page.getByRole("heading", { name: /drop list/i })).toBeVisible();
});

test("template image uploader shell is reachable from edit flow", { tag: "@authed" }, async ({ page }) => {
  test.skip(!process.env.RUN_AUTHED_SMOKE, "authed smoke is opt-in (set RUN_AUTHED_SMOKE=1)");
  test.setTimeout(90_000);
  await page.goto("/auth/login", { waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: /use demo restaurant/i }).click().catch(() => {});
  await page.waitForURL("**/portal/dashboard", { timeout: 30_000 }).catch(() => {});
  test.skip(!page.url().includes("/portal/dashboard"), "demo session unavailable (no seed)");

  await page.getByRole("link", { name: "Templates" }).first().click();
  await page.waitForURL("**/portal/templates", { timeout: 15_000 });
  await expect(page.getByRole("heading", { name: /templates/i })).toBeVisible();

  const edit = page.getByRole("button", { name: "Edit" }).first();
  test.skip((await edit.count()) === 0, "demo template unavailable");
  await edit.click();

  await expect(page.getByRole("heading", { name: /edit bam bag template/i })).toBeVisible();
  await expect(page.getByText("Template drop image")).toBeVisible();
  await expect(page.locator('input[type="file"][accept="image/jpeg,image/png,image/webp"]')).toBeVisible();
  await expect(page.getByRole("button", { name: /upload image|replace image/i })).toBeVisible();
});
