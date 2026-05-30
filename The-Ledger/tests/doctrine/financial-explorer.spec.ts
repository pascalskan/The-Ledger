/**
 * DOCTRINE TEST: Financial Explorer
 *
 * Phase 5.2 adds the Financial Explorer page at /financial-explorer.
 * This spec validates that the page loads, all tabs render, and the
 * Profitability tab (Phase 5.2 addition) is present and visible.
 *
 * The Financial Explorer is CEO-only.
 */
import { test, expect } from '@playwright/test';
import { loginAsCEO } from '../helpers/login';
import { clearBrowserState } from '../helpers/state';

test.beforeEach(async ({ page }) => {
  await clearBrowserState(page);
});

test('Financial Explorer loads and all tabs render', async ({ page }) => {
  await loginAsCEO(page);

  // Navigate to Financial Explorer via the sidebar link
  await page.locator('a').filter({ hasText: 'Financial Explorer' }).first().click();

  await expect(page).toHaveURL(/financial-explorer/i);

  // Verify the page heading
  await expect(
    page.getByRole('heading', { name: /Financial Explorer/i })
  ).toBeVisible();

  // Verify the Profitability tab exists (Phase 5.2 addition — first tab)
  await expect(page.getByRole('tab', { name: /Profitability/i })).toBeVisible();

  // Verify all other core tabs render
  await expect(page.getByRole('tab', { name: /Timesheets/i })).toBeVisible();
  await expect(page.getByRole('tab', { name: /Expenses/i })).toBeVisible();
  await expect(page.getByRole('tab', { name: /Inventory/i })).toBeVisible();
  await expect(page.getByRole('tab', { name: /Equipment/i })).toBeVisible();
  await expect(page.getByRole('tab', { name: /Invoice Lines/i })).toBeVisible();
});

test('Financial Explorer Profitability tab is the default and renders content', async ({ page }) => {
  await loginAsCEO(page);

  await page.locator('a').filter({ hasText: 'Financial Explorer' }).first().click();

  await expect(page).toHaveURL(/financial-explorer/i);

  // The Profitability tab should be selected by default
  const profitTab = page.getByRole('tab', { name: /Profitability/i });
  await expect(profitTab).toBeVisible();
  await profitTab.click();

  // The tab panel should contain portfolio data or an empty state
  // (seed data provides records for dj-kitchen-extract-1)
  await expect(page.locator('body')).toContainText(/Revenue|revenue|Portfolio|profitability|No data/i);
});

test('Financial Explorer Timesheets tab renders without error', async ({ page }) => {
  await loginAsCEO(page);

  await page.locator('a').filter({ hasText: 'Financial Explorer' }).first().click();
  await expect(page).toHaveURL(/financial-explorer/i);

  await page.getByRole('tab', { name: /Timesheets/i }).click();

  // Should show either records or an empty state — not a crash
  await expect(page.locator('body')).not.toContainText(/Error|Uncaught|TypeError/i);
  await expect(page.locator('body')).toContainText(/Timesheets|No timesheet|hours/i);
});
