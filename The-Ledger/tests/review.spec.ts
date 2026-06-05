import { test, expect } from '@playwright/test';

test('PM can access review center', async ({ page }) => {
  await page.goto('/auth');

  await page.getByRole('button', {
    name: /Demo PM/i,
  }).click();

  await page.getByRole('button', {
    name: /Sign in/i,
  }).click();

  await page.getByTestId('nav-review').click();

  await expect(page).toHaveURL(/review/i);
});