import { expect, test } from "@playwright/test";

// Functional smoke for consumer-web (W7 / e2e-coverage P0.2). Deterministic
// route-render + key-control assertions on live cloud demo data. The full
// claim→simulated-pay mutation path is opt-in (RUN_AUTHED_SMOKE) since it needs a
// live claimable drop + the payment simulator and isn't deterministic in the gate.

test("home renders hero + primary nav", async ({ page }) => {
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(page.getByRole("navigation", { name: /main navigation/i }).getByRole("link", { name: "Drops" })).toBeVisible();
  await expect(page.getByRole("main")).toBeVisible();
});

test("drops discovery renders search + filters", async ({ page }) => {
  await page.goto("/drops", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("textbox", { name: /search drops/i })).toBeVisible();
  await expect(page.getByRole("group", { name: /cuisine filters/i })).toBeVisible();
  await expect(page.getByRole("tablist", { name: /drop view mode/i })).toBeVisible();
});

test("restaurant directory renders", async ({ page }) => {
  await page.goto("/restaurants", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(page.getByRole("main")).toBeVisible();
});

test("swaad club renders", async ({ page }) => {
  await page.goto("/swaad-club", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("main")).toBeVisible();
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
});
