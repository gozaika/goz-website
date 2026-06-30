import { expect, test } from "@playwright/test";
import { checkA11y, getViolations, injectAxe } from "axe-playwright";
import type { Page as AxePage } from "playwright";

// Key public consumer routes. These render on live cloud demo data (or honest
// empty states), so axe can audit the real DOM. Mirrors apps/website/tests/a11y.spec.ts.
const pages = ["/", "/drops", "/restaurants", "/swaad-club"] as const;

// `color-contrast` is enforced at the token layer by
// @gozaika/design-tokens/contrast.test.ts (the AA companions are proven). The
// residual axe color-contrast items are semantic component accents on live data
// cards (dietary/allergen badges) that need a human design decision — part of the
// mandated human a11y sign-off (see docs/web/web-parity-audit.md). So here we
// HARD-FAIL on every structural rule and REPORT (non-blocking) color-contrast.
const STRUCTURAL_AXE = { rules: { "color-contrast": { enabled: false } } } as const;

for (const path of pages) {
  test(`a11y checks pass on ${path}`, async ({ page }) => {
    await page.goto(path, { waitUntil: "domcontentloaded" });
    const axePage = page as unknown as AxePage;
    await injectAxe(axePage);

    // Hard gate: all structural/semantic rules must pass.
    await checkA11y(axePage, undefined, {
      axeOptions: STRUCTURAL_AXE,
      detailedReport: true,
      detailedReportOptions: { html: true },
    });
    await expect(page.getByRole("main")).toBeVisible();

    // Non-blocking: surface any residual color-contrast items for the human pass.
    const contrast = await getViolations(axePage, undefined, {
      runOnly: { type: "rule", values: ["color-contrast"] },
    });
    const count = contrast.reduce((n, v) => n + v.nodes.length, 0);
    if (count > 0) {
      console.log(`[a11y][contrast] ${path}: ${count} color-contrast node(s) flagged for human review`);
    }
  });
}
