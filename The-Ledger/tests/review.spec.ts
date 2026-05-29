import { test, expect } from '@playwright/test';

test('PM can access review center', async ({ page }) => {
  await page.goto('/auth');

  await page.getByRole('button', {
    name: /Demo PM/i,
  }).click();

  await page.getByRole('button', {
    name: /Sign in/i,
  }).click();

  await page
    .locator('a')
    .filter({ hasText: 'Review Center' })
    .nth(1)
    .click();

  await expect(page).toHaveURL(/review/i);
});