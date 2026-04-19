import { expect, test } from '@playwright/test';

test('homepage renders primary heading', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await expect(page).toHaveTitle(/goZaika/i);
});

test('main nav links resolve', async ({ page }) => {
  const routes = [
    ['How It Works', '/how-it-works'],
    ['For Restaurants', '/for-restaurants'],
    ['About', '/about'],
    ['FAQ', '/faq'],
  ] as const;

  for (const [label, path] of routes) {
    await page.goto('/');
    await page.getByLabel('Primary').getByRole('link', { name: label }).click();
    await expect(page).toHaveURL(new RegExp(`${path}$`));
  }
});

test('canonical redirects work', async ({ page }) => {
  const redirects = [
    ['/privacy', '/privacy-policy'],
    ['/terms', '/terms-of-service'],
    ['/refund', '/refund-policy'],
    ['/food-safety', '/food-safety-policy'],
    ['/grievance', '/grievance-redressal'],
  ] as const;

  for (const [from, to] of redirects) {
    await page.goto(from);
    await expect(page).toHaveURL(new RegExp(`${to}$`));
  }
});

test('contact form fields are interactive', async ({ page }) => {
  await page.goto('/contact');
  const nameInput = page.getByLabel('Name');
  await nameInput.fill('Test User');
  await expect(nameInput).toHaveValue('Test User');
});

test('unknown route returns not found', async ({ page }) => {
  await page.goto('/unknown-route-zz99');
  await expect(page.getByText('Page not found')).toBeVisible();
});
