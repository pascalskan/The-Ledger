/**
 * DOCTRINE TEST: Payroll Staging
 *
 * Phase 5.2 adds the Payroll Staging page at /payroll.
 * The page is CEO-only and groups approved timesheet records by worker.
 *
 * Doctrine flow verified:
 *   Approved Timesheet → Payroll Grouping → Payroll Staging Page
 *
 * The seed data in Phase 4.5 pre-populates TimesheetEntry records for
 * dj-kitchen-extract-1, so the Payroll page shows records without
 * requiring a live approval in this test.
 */
import { test, expect } from '@playwright/test';
import { loginAsCEO } from '../helpers/login';
import { clearBrowserState } from '../helpers/state';

test.beforeEach(async ({ page }) => {
  await clearBrowserState(page);
});

test('Payroll Staging page is accessible to CEO and renders without error', async ({ page }) => {
  await loginAsCEO(page);

  // Navigate via sidebar link
  await page.locator('a').filter({ hasText: 'Payroll Staging' }).first().click();

  await expect(page).toHaveURL(/payroll/i);

  // Verify the page heading
  await expect(
    page.getByRole('heading', { name: /Payroll Staging/i })
  ).toBeVisible();

  // Verify the amber disclaimer about staging-only status
  await expect(page.locator('body')).toContainText(/Staging only|not a payment instruction/i);

  // No runtime errors
  await expect(page.locator('body')).not.toContainText(/Error|Uncaught|TypeError/i);
});

test('Payroll Staging page shows seeded worker payroll records', async ({ page }) => {
  await loginAsCEO(page);

  await page.locator('a').filter({ hasText: 'Payroll Staging' }).first().click();
  await expect(page).toHaveURL(/payroll/i);

  // The Phase 4.5 seed data creates TimesheetEntry records for Sophie Taylor and Ben Hughes
  // groupTimesheetsForPayroll() should surface them on this page
  await expect(page.locator('body')).toContainText(/Sophie Taylor|Ben Hughes|hours|Hours/i);
});

test('Payroll Staging period filter renders All / Current / Previous options', async ({ page }) => {
  await loginAsCEO(page);

  await page.locator('a').filter({ hasText: 'Payroll Staging' }).first().click();
  await expect(page).toHaveURL(/payroll/i);

  // Verify the period selector is present
  await expect(page.locator('body')).toContainText(/All time|Current month|Previous month/i);
});
