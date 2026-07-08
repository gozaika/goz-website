import { expect, test, type Locator } from "@playwright/test";
import { loginByPhoneOtp, RAHUL } from "./auth-helpers";

// Phase 5 — §20 "Order Again" reorder entry (consumer-web). On a COLLECTED order,
// the post-taste ReorderCard must offer a FULL-price reorder (§24 anti-cannibalization
// — the discount is one-time-per-discovery). Read-only: we assert the card + copy but
// do NOT click "Order again" (that creates a private reorder drop + hold), so the spec
// does not mutate demo data.
//
// Opt-in (RUN_AUTHED_SMOKE=1) — same rationale as allergen-gate.spec.ts.
//   RUN_AUTHED_SMOKE=1 npm run e2e -w @gozaika/consumer-web

test("COLLECTED order shows the full-price Order Again card", async ({ page }) => {
  test.skip(!process.env.RUN_AUTHED_SMOKE, "authed Order Again is opt-in (set RUN_AUTHED_SMOKE=1)");
  test.setTimeout(90_000);

  const signedIn = await loginByPhoneOtp(page, RAHUL);
  test.skip(!signedIn, "demo phone-OTP session unavailable (test OTPs not enabled on this env)");

  await page.goto("/account", { waitUntil: "domcontentloaded" });
  const orderLinks = page.locator('a[href^="/orders/"]');
  const hrefs = (await orderLinks.evaluateAll((els) => els.map((el) => (el as HTMLAnchorElement).getAttribute("href"))))
    .filter((h): h is string => Boolean(h));
  test.skip(hrefs.length === 0, "no orders on this demo account");

  // Open orders until we find a COLLECTED one (the only status that renders ReorderCard).
  let reorderCard: Locator | null = null;
  for (const href of hrefs.slice(0, 10)) {
    await page.goto(href, { waitUntil: "domcontentloaded" });
    const card = page.locator("section", { hasText: /get it again/i });
    if (await card.first().isVisible().catch(() => false)) {
      reorderCard = card.first();
      break;
    }
  }
  test.skip(!reorderCard, "no COLLECTED order available to exercise Order Again");

  const card = reorderCard!;
  await expect(card).toContainText(/order the .+ again/i);
  await expect(card).toContainText(/reorder at full menu price/i);
  await expect(card.getByRole("button", { name: /order again/i })).toBeVisible();
});
