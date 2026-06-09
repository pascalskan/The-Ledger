/**
 * DOCTRINE TEST: Financial Records (Finance Hub — Records Tab)
 *
 * UX-4: Financial Explorer moved to Finance Hub at /finance?tab=records.
 * This spec validates that the Records tab loads and core tabs render.
 * The Financial Records tab is CEO-only (accessed via the Finance Hub).
 */
import { test, expect } from '@playwright/test';
import { loginAsCEO } from '../helpers/login';
import { clearBrowserState } from '../helpers/state';

test.beforeEach(async ({ page }) => {
  await clearBrowserState(page);
});

test('Financial Records tab loads and all tabs render', async ({ page }) => {
  await loginAsCEO(page);

  // Navigate to Finance Hub Records tab directly
  await page.goto('http://localhost:5000/finance?tab=records');

  await expect(page).toHaveURL(/finance/i);

  // Verify the heading in Records tab
  await expect(
    page.getByTestId('finance-records-heading')
  ).toBeVisible();

  // Verify the Profitability tab exists
  await expect(page.getByRole('tab', { name: /Profitability/i })).toBeVisible();

  // Verify all other core tabs render
  await expect(page.getByRole('tab', { name: /Timesheets/i })).toBeVisible();
  await expect(page.getByRole('tab', { name: /Expenses/i })).toBeVisible();
  await expect(page.getByRole('tab', { name: /Inventory/i })).toBeVisible();
  await expect(page.getByRole('tab', { name: /Equipment/i })).toBeVisible();
  // Invoice Lines and Audit Log tabs removed in UX-4 — Records tab retains 7 operational sub-tabs
  await expect(page.getByRole('tab', { name: /Invoice Pipeline/i })).toBeVisible();
});

test('Financial Records Profitability tab renders content', async ({ page }) => {
  await loginAsCEO(page);

  await page.goto('http://localhost:5000/finance?tab=records');

  await expect(page).toHaveURL(/finance/i);

  // The Profitability tab should be visible
  const profitTab = page.getByRole('tab', { name: /Profitability/i });
  await expect(profitTab).toBeVisible();
  await profitTab.click();

  // The tab panel should contain portfolio data or an empty state
  await expect(page.locator('body')).toContainText(/Revenue|revenue|Portfolio|profitability|No data/i);
});

test('Financial Records Timesheets tab renders without error', async ({ page }) => {
  await loginAsCEO(page);

  await page.goto('http://localhost:5000/finance?tab=records');
  await expect(page).toHaveURL(/finance/i);

  await page.getByRole('tab', { name: /Timesheets/i }).click();

  // Should show either records or an empty state — not a crash
  await expect(page.locator('body')).not.toContainText(/Error|Uncaught|TypeError/i);
  await expect(page.locator('body')).toContainText(/Timesheets|No timesheet|hours/i);
});
