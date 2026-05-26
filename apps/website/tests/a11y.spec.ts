import { expect, test } from '@playwright/test';
import { checkA11y, injectAxe } from 'axe-playwright';
import type { Page as AxePage } from 'playwright';

const pages = ['/', '/how-it-works', '/for-restaurants', '/about', '/faq', '/contact'] as const;

for (const path of pages) {
  test(`a11y checks pass on ${path}`, async ({ page }) => {
    await page.goto(path);
    const axePage = page as unknown as AxePage;
    await injectAxe(axePage);
    await checkA11y(axePage, undefined, {
      detailedReport: true,
      detailedReportOptions: { html: true },
    });
    await expect(page.getByRole('main')).toBeVisible();
  });
}
