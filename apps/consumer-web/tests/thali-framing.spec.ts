import { expect, test } from "@playwright/test";

// Phase 2 — consumer thali/variety framing (business-model-audit §12/§14/§21).
// Asserts the discovery-layer copy on the drops list + detail and that the
// retired "mystery = you can't choose" framing is gone. Runs against live cloud
// demo data; the detail assertions guard on a drop existing so the gate stays
// deterministic when no drops are seeded.

const BANNED_CONSUMER = /\b(leftover|stale|cheap|clearance|liquidation|food rescue|sample|surplus)\b/i;

test("drops list leads with the chef's-thali discovery framing", async ({ page }) => {
  await page.goto("/drops", { waitUntil: "domcontentloaded" });
  const main = page.getByRole("main");
  await expect(main).toBeVisible();

  // Thali/variety framing present; no banned consumer copy; no retired "mystery".
  await expect(main).toContainText(/chef-curated thali/i);
  const mainText = (await main.innerText()).toLowerCase();
  expect(mainText).not.toMatch(BANNED_CONSUMER);
  expect(mainText).not.toContain("mystery");
});

test("drop detail shows the thali framing block and discloses allergens", async ({ page }) => {
  await page.goto("/drops", { waitUntil: "domcontentloaded" });

  const firstDrop = page
    .locator('a[href^="/drops/"]')
    .filter({ hasNot: page.locator('a[href$="/drops"]') })
    .first();
  const href = await firstDrop.getAttribute("href").catch(() => null);
  test.skip(!href || href === "/drops", "No drop available in this environment to open.");

  await page.goto(href as string, { waitUntil: "domcontentloaded" });
  const main = page.getByRole("main");
  await expect(main).toBeVisible();

  // "Not a deal. A discovery." framing + chef-curated thali; discovery not mystery.
  await expect(main).toContainText(/not a deal\. a discovery\./i);
  await expect(main).toContainText(/chef-curated thali/i);
  // Discovery language is honest per drop type (dishes for standard, cuisine for blind).
  await expect(main).toContainText(/discover the (dishes|cuisine)/i);
  // Allergen disclosure still present (safety/trust invariant).
  await expect(main.getByRole("heading", { name: /disclosure/i })).toBeVisible();

  const mainText = (await main.innerText()).toLowerCase();
  expect(mainText).not.toMatch(BANNED_CONSUMER);
  expect(mainText).not.toContain("mystery");
});
