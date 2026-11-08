import { expect, test } from '@playwright/test';

test('home page shows the live API status', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Film Platform' })).toBeVisible();
  await expect(page.getByRole('status')).toHaveText('API: ok');
});
