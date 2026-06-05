import { test, expect } from '@playwright/test';
import { clearBrowserState } from '../helpers/state';

test.beforeEach(async ({ page }) => {
  await clearBrowserState(page);
});

test('Worker review pipeline basic flow', async ({ page }) => {
  // 1. Worker logs in
  await page.goto('/auth');

  await page.getByRole('button', {
    name: /Demo Worker/i,
  }).click();

  await page.getByRole('button', {
    name: /Sign in/i,
  }).click();

  // 2. Open first available job
  await page.getByRole('button', {
    name: /Open Job/i,
  }).first().click();

  // 3. Submit report
  await page.getByRole('button', {
    name: /Submit Report/i,
  }).click();

  await page.getByRole('textbox', {
    name: /Describe the work completed/i,
  }).fill('Completed framing inspection via Playwright test.');

  await page.getByRole('button', {
    name: /Save/i,
  }).click();

  // 4. Sign out
  await page.getByRole('button', {
    name: /Profile/i,
  }).click();

  await page.getByRole('button', {
    name: /Sign Out/i,
  }).click();

  // 5. Manager/CEO logs in
  await page.getByRole('button', {
    name: /Demo CEO/i,
  }).click();

  await page.getByRole('button', {
    name: /Sign in/i,
  }).click();

  // 6. Navigate to Review Center
  await page.getByTestId('nav-review').click();

  // 7. Verify review item appears
  await expect(page.locator('body')).toContainText(/pending/i);
});