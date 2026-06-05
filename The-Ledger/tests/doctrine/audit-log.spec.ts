import { test, expect } from '@playwright/test';
import { clearBrowserState } from '../helpers/state';

test.beforeEach(async ({ page }) => {
  await clearBrowserState(page);
});

test('Review creation generates audit entry', async ({ page }) => {
  await page.goto('/auth');

  await page.getByRole('button', {
    name: /Demo Worker/i,
  }).click();

  await page.getByRole('button', {
    name: /Sign in/i,
  }).click();

  await page.getByRole('button', {
    name: /Open Job/i,
  }).click();

  await page.getByRole('button', {
    name: /Submit Report/i,
  }).click();

  await page.getByRole('button', {
    name: /Save/i,
  }).click();

  await page.getByRole('button', {
    name: /Profile/i,
  }).click();

  await page.getByRole('button', {
    name: /Sign Out/i,
  }).click();

  await page.getByRole('button', {
    name: /Demo CEO/i,
  }).click();

  await page.getByRole('button', {
    name: /Sign in/i,
  }).click();

  // Wait for app to load after auth (800ms timer in auth.tsx + navigation)
  await page.waitForTimeout(1200);
  // Expand admin section then navigate via client-side nav to preserve store state
  const adminToggle = page.getByTestId('nav-admin-toggle');
  if (await adminToggle.isVisible()) {
    await adminToggle.click();
  }
  await page.getByTestId('nav-audit-log').click();

  await expect(page.locator('body')).toContainText(
    'Created new review item'
  );
});