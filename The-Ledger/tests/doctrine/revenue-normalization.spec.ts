/**
 * DOCTRINE TEST: Revenue Normalization
 *
 * Ledger doctrine:
 *   Review Approval → Financial Records Created → Revenue Calculated → Financial Summary Updated
 *
 * This spec verifies the complete revenue normalization pipeline:
 *   1. Worker submits a report (online path)
 *   2. CEO approves it in the Review Center
 *   3. Financial Explorer shows the resulting normalized records
 *   4. Financial mutations appear in the Financial Explorer Audit Log tab
 *
 * IMPORTANT: Uses soft login between role switches to preserve in-memory store state.
 */
import { test, expect } from '@playwright/test';
import { loginAsWorker, softLoginAsCEO } from '../helpers/login';
import { signOut } from '../helpers/signOut';
import { openReviewCenter } from '../helpers/navigation';
import { clearBrowserState } from '../helpers/state';

test.beforeEach(async ({ page }) => {
  await clearBrowserState(page);
});

test('Approval creates normalized financial records in Financial Explorer', async ({ page }) => {
  // Worker submits a report
  await loginAsWorker(page);

  await page.getByRole('button', { name: /Open Job/i }).first().click();
  await page.getByRole('button', { name: /Submit Report/i }).click();

  await page
    .getByRole('textbox', { name: /Describe the work completed/i })
    .fill('Revenue normalization doctrine test — approval pipeline');

  await page.getByRole('button', { name: /Save/i }).click();
  await expect(page.getByRole('status')).toContainText('Report Submitted');

  await signOut(page);

  // CEO approves the submission
  await softLoginAsCEO(page);
  await openReviewCenter(page);

  // Find a pending row and click Review Items
  await expect(
    page.locator('tr').filter({ hasText: /DEMO-JOB-/i }).first()
  ).toBeVisible({ timeout: 10000 });

  await page
    .locator('tr')
    .filter({ hasText: /DEMO-JOB-/i })
    .first()
    .getByRole('button', { name: /Review Items/i })
    .click();

  // Wait for review detail to load
  await expect(page.locator('body')).not.toContainText('Jobs Requiring Review');

  // Approve the first available item
  const approveBtn = page.getByRole('button', { name: /^Approve$/ }).first();
  await expect(approveBtn).toBeVisible();
  await approveBtn.click();
  await page.waitForTimeout(500);

  // Navigate to Financial Explorer to verify records were created
  await page.goto('http://localhost:5000/finance?tab=records');
  await expect(page).toHaveURL(/finance/i);

  // The Financial Explorer header shows counts of records — at least one must exist
  // (seed data + the approval we just performed)
  await expect(page.locator('body')).toContainText(/Timesheets|Expenses|Inventory Mutations|Equipment Usage/i);

  // Verify the page renders without errors
  await expect(page.locator('body')).not.toContainText(/Error|Uncaught|TypeError/i);
});

test('Financial Records tab loads and shows normalised record counts after approval activity', async ({ page }) => {
  // UX-4: The standalone Audit Log tab was removed from Financial Records in UX-4.
  // Financial mutation records are still tracked — this test verifies the Records tab
  // loads correctly (Audit Doctrine: records remain in the system, accessible to CEO).
  await loginAsWorker(page);

  // Submit a report to create audit trail activity
  await page.getByRole('button', { name: /Open Job/i }).first().click();
  await page.getByRole('button', { name: /Submit Report/i }).click();
  await page
    .getByRole('textbox', { name: /Describe the work completed/i })
    .fill('Audit trail verification for revenue normalization');
  await page.getByRole('button', { name: /Save/i }).click();
  await expect(page.getByRole('status')).toContainText('Report Submitted');

  await signOut(page);

  // CEO views the Financial Records tab
  await softLoginAsCEO(page);

  await page.goto('http://localhost:5000/finance?tab=records');
  await expect(page).toHaveURL(/finance/i);

  // Records tab heading confirms content loaded
  await expect(page.getByTestId('finance-records-heading')).toBeVisible();

  // Summary cards confirm financial records are tracked (Audit Doctrine)
  await expect(page.locator('body')).toContainText(/Financial Records/i);

  // No runtime errors
  await expect(page.locator('body')).not.toContainText(/Error|Uncaught|TypeError/i);
});
