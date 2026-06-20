/**
 * DOCTRINE TEST: Automation Hub — Catalogue Redesign (UX-6.2)
 *
 * Validates the executive Automation Catalogue on the Rules tab of
 * /automations: rich table, search, multi-filter, sorting, and the enriched
 * detail dialog. Behaviour is unchanged — this is a discoverability layer.
 *
 * Seed reference (rule status / category / governance / risk):
 *   rule-001 active   Operational          Compliant        Low
 *   rule-002 active   Workflow             Compliant        Low
 *   rule-003 active   FinanciallySensitive Requires Review  High
 *   rule-004 active   FinanciallySensitive Requires Review  Critical
 *   rule-005 disabled Workflow             Restricted       Medium
 *   rule-006 draft    Operational          Compliant        Low
 */
import { test, expect } from '@playwright/test';
import { loginAsCEO } from '../helpers/login';
import { clearBrowserState } from '../helpers/state';

const ROW = '[data-testid^="aut-rule-row-"]';

test.beforeEach(async ({ page }) => {
  await clearBrowserState(page);
  await loginAsCEO(page);
  await page.goto('/automations');
});

// ── Render ───────────────────────────────────────────────────

test('CAT-01: Catalogue and table render with all six seed rules', async ({ page }) => {
  await expect(page.getByTestId('aut-catalogue')).toBeVisible();
  await expect(page.getByTestId('aut-rules-table')).toBeVisible();
  await expect(page.locator(ROW)).toHaveCount(6);
});

test('CAT-02: Rich indicators render (sensitive, governance status, risk)', async ({ page }) => {
  await expect(page.getByTestId('aut-badge-sensitive-rule-003')).toBeVisible();
  await expect(page.getByTestId('aut-gov-status-rule-005')).toBeVisible();
  await expect(page.getByTestId('aut-success-rate-rule-003')).toBeVisible();
});

// ── Search ───────────────────────────────────────────────────

test('CAT-03: Search by name filters dynamically', async ({ page }) => {
  await page.getByTestId('aut-rules-search').fill('Invoice');
  await expect(page.getByTestId('aut-rule-row-rule-004')).toBeVisible();
  await expect(page.getByTestId('aut-rule-row-rule-001')).toHaveCount(0);
});

test('CAT-04: Search by rule number works', async ({ page }) => {
  await page.getByTestId('aut-rules-search').fill('AUT-2026-005');
  await expect(page.getByTestId('aut-rule-row-rule-005')).toBeVisible();
  await expect(page.locator(ROW)).toHaveCount(1);
});

test('CAT-05: Search by trigger label works', async ({ page }) => {
  await page.getByTestId('aut-rules-search').fill('Low Stock');
  await expect(page.getByTestId('aut-rule-row-rule-006')).toBeVisible();
});

// ── Filters ──────────────────────────────────────────────────

test('CAT-06: Status filter (disabled) shows only disabled rules', async ({ page }) => {
  await page.getByTestId('aut-filter-status').selectOption('disabled');
  await expect(page.getByTestId('aut-rule-row-rule-005')).toBeVisible();
  await expect(page.locator(ROW)).toHaveCount(1);
});

test('CAT-07: Category filter (Financially Sensitive) shows two rules', async ({ page }) => {
  await page.getByTestId('aut-filter-category').selectOption('FinanciallySensitive');
  await expect(page.locator(ROW)).toHaveCount(2);
  await expect(page.getByTestId('aut-rule-row-rule-003')).toBeVisible();
  await expect(page.getByTestId('aut-rule-row-rule-004')).toBeVisible();
});

test('CAT-08: Governance filter (Restricted) isolates rule-005', async ({ page }) => {
  await page.getByTestId('aut-filter-governance').selectOption('Restricted');
  await expect(page.getByTestId('aut-rule-row-rule-005')).toBeVisible();
  await expect(page.locator(ROW)).toHaveCount(1);
});

test('CAT-09: Risk filter (Critical) isolates rule-004', async ({ page }) => {
  await page.getByTestId('aut-filter-risk').selectOption('Critical');
  await expect(page.getByTestId('aut-rule-row-rule-004')).toBeVisible();
  await expect(page.locator(ROW)).toHaveCount(1);
});

test('CAT-10: Multiple filters combine (Sensitive + Critical → rule-004)', async ({ page }) => {
  await page.getByTestId('aut-filter-sensitive').selectOption('yes');
  await page.getByTestId('aut-filter-risk').selectOption('Critical');
  await expect(page.locator(ROW)).toHaveCount(1);
  await expect(page.getByTestId('aut-rule-row-rule-004')).toBeVisible();
});

test('CAT-11: Filters + search compose (Sensitive + "Sync" → rule-003)', async ({ page }) => {
  await page.getByTestId('aut-filter-sensitive').selectOption('yes');
  await page.getByTestId('aut-rules-search').fill('Sync');
  await expect(page.locator(ROW)).toHaveCount(1);
  await expect(page.getByTestId('aut-rule-row-rule-003')).toBeVisible();
});

// ── Sorting ──────────────────────────────────────────────────

test('CAT-12: Default sort is name ascending (rule-002 first)', async ({ page }) => {
  await expect(page.locator(ROW).first()).toHaveAttribute('data-testid', 'aut-rule-row-rule-002');
});

test('CAT-13: Toggling direction reverses order (rule-003 first)', async ({ page }) => {
  await page.getByTestId('aut-sort-direction').click();
  await expect(page.locator(ROW).first()).toHaveAttribute('data-testid', 'aut-rule-row-rule-003');
});

test('CAT-14: Sort by total executions desc puts rule-003 first (45 runs)', async ({ page }) => {
  await page.getByTestId('aut-sort-key').selectOption('totalExecutions');
  await page.getByTestId('aut-sort-direction').click(); // desc
  await expect(page.locator(ROW).first()).toHaveAttribute('data-testid', 'aut-rule-row-rule-003');
});

test('CAT-15: Sorting preserves active filters', async ({ page }) => {
  await page.getByTestId('aut-filter-category').selectOption('FinanciallySensitive');
  await page.getByTestId('aut-sort-key').selectOption('successRate');
  await expect(page.locator(ROW)).toHaveCount(2);
});

// ── Detail dialog (enriched) ─────────────────────────────────

test('CAT-16: Detail dialog still opens and shows existing sections', async ({ page }) => {
  await page.getByTestId('aut-btn-view-rule-001').click();
  await expect(page.getByTestId('aut-rule-detail-dialog')).toBeVisible();
  await expect(page.getByTestId('aut-rule-detail-trigger')).toBeVisible();
  await expect(page.getByTestId('aut-rule-detail-actions')).toBeVisible();
});

test('CAT-17: Detail dialog shows new executive sections', async ({ page }) => {
  await page.getByTestId('aut-btn-view-rule-003').click();
  await expect(page.getByTestId('aut-rule-detail-stats')).toBeVisible();
  await expect(page.getByTestId('aut-rule-detail-governance')).toBeVisible();
  await expect(page.getByTestId('aut-rule-detail-success-rate')).toBeVisible();
});

test('CAT-18: Financial safeguard still shown for sensitive rule', async ({ page }) => {
  await page.getByTestId('aut-btn-view-rule-004').click();
  await expect(page.getByTestId('aut-rule-detail-financial-safeguard')).toBeVisible();
});

// ── Existing interactions preserved ──────────────────────────

test('CAT-19: Enable/disable action remains functional from detail', async ({ page }) => {
  await page.getByTestId('aut-btn-view-rule-005').click();
  await expect(page.getByTestId('aut-btn-enable-rule')).toBeVisible();
});

test('CAT-20: Empty state shows when no rule matches', async ({ page }) => {
  await page.getByTestId('aut-rules-search').fill('zzz-no-such-automation');
  await expect(page.locator(ROW)).toHaveCount(0);
  await expect(page.getByTestId('aut-rules-table')).toContainText('No automations match');
});
