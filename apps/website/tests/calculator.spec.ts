import { expect, test } from '@playwright/test';

// Restaurant economics calculator on /for-restaurants (business-model-audit §11.2).
// Verifies the tool renders and recomputes live from its inputs — the numbers
// themselves are unit-tested in @gozaika/utils (economics.test.ts).

test('economics calculator renders with a result', async ({ page }) => {
  await page.goto('/for-restaurants');
  const calc = page.locator('#calculator');
  await expect(calc.getByRole('heading', { name: /what could a drop do/i })).toBeVisible();
  await expect(calc.getByTestId('calc-per-week')).toBeVisible();
});

test('economics calculator recomputes when the fill mix changes', async ({ page }) => {
  await page.goto('/for-restaurants');
  const calc = page.locator('#calculator');
  const perWeek = calc.getByTestId('calc-per-week');

  const before = (await perWeek.innerText()).trim();
  expect(before).toMatch(/₹/);

  // Drop surplus to 0 → more paid food fill → thinner weekly contribution.
  await calc.getByLabel('Surplus').fill('0');

  await expect(perWeek).not.toHaveText(before);
});
