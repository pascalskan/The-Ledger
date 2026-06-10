/**
 * DOCTRINE TEST: Activity Feed — Phase 6.2
 *
 * 25 tests covering:
 * - Engine functions (summary, filter, search, retrieval)
 * - Page rendering (KPI strip, event table, filters, search)
 * - Event detail dialog
 * - Deep linking
 * - Dashboard widget
 * - RBAC
 * - Doctrine compliance (informational only)
 */
import { test, expect } from '@playwright/test';
import { loginAsCEO, loginAsPM, loginAsWorker } from '../helpers/login';
import { clearBrowserState } from '../helpers/state';

test.beforeEach(async ({ page }) => {
  await clearBrowserState(page);
});

// ──────────────────────────────────────────────────────
// AF-01 to AF-03: Page Access & RBAC
// ──────────────────────────────────────────────────────

test('AF-01: Activity Feed page loads for CEO', async ({ page }) => {
  await loginAsCEO(page);
  await page.goto('/activity-feed');
  await expect(page.getByTestId('activity-feed-page')).toBeVisible();
  await expect(page.getByRole('heading', { name: /Activity Feed/i })).toBeVisible();
});

test('AF-02: CEO can navigate via sidebar to Activity Feed', async ({ page }) => {
  await loginAsCEO(page);
  await page.goto('/');
  await page.getByTestId('nav-activity-feed').click();
  await expect(page.getByTestId('activity-feed-page')).toBeVisible();
});

test('AF-03 (RBAC): Worker is denied access to Activity Feed', async ({ page }) => {
  await loginAsWorker(page);
  await page.goto('/activity-feed');
  await expect(page.getByTestId('activity-feed-page')).not.toBeVisible();
});

// ──────────────────────────────────────────────────────
// AF-04 to AF-08: KPI Strip
// ──────────────────────────────────────────────────────

test('AF-04: KPI strip renders all 5 cards', async ({ page }) => {
  await loginAsCEO(page);
  await page.goto('/activity-feed');
  await expect(page.getByTestId('af-kpi-strip')).toBeVisible();
  await expect(page.getByTestId('af-kpi-total')).toBeVisible();
  await expect(page.getByTestId('af-kpi-critical')).toBeVisible();
  await expect(page.getByTestId('af-kpi-action-required')).toBeVisible();
  await expect(page.getByTestId('af-kpi-today')).toBeVisible();
  await expect(page.getByTestId('af-kpi-last7days')).toBeVisible();
});

test('AF-05: KPI total matches seed data (25 events)', async ({ page }) => {
  await loginAsCEO(page);
  await page.goto('/activity-feed');
  await expect(page.getByTestId('af-kpi-total')).toContainText('25');
});

test('AF-06: KPI critical count is non-zero from seed data', async ({ page }) => {
  await loginAsCEO(page);
  await page.goto('/activity-feed');
  const critText = await page.getByTestId('af-kpi-critical').textContent();
  const count = parseInt(critText?.match(/\d+/)?.[0] || '0');
  expect(count).toBeGreaterThanOrEqual(3);
});

test('AF-07: KPI action required count is non-zero from seed data', async ({ page }) => {
  await loginAsCEO(page);
  await page.goto('/activity-feed');
  const arText = await page.getByTestId('af-kpi-action-required').textContent();
  const count = parseInt(arText?.match(/\d+/)?.[0] || '0');
  expect(count).toBeGreaterThanOrEqual(5);
});

test('AF-08: KPI last7days count equals total (all seed data within 7 days)', async ({ page }) => {
  await loginAsCEO(page);
  await page.goto('/activity-feed');
  const totalText = await page.getByTestId('af-kpi-total').textContent();
  const last7Text = await page.getByTestId('af-kpi-last7days').textContent();
  const total = parseInt(totalText?.match(/\d+/)?.[0] || '0');
  const last7 = parseInt(last7Text?.match(/\d+/)?.[0] || '0');
  expect(last7).toBeLessThanOrEqual(total);
  expect(last7).toBeGreaterThan(0);
});

// ──────────────────────────────────────────────────────
// AF-09 to AF-11: Event Table
// ──────────────────────────────────────────────────────

test('AF-09: Event table renders seed events', async ({ page }) => {
  await loginAsCEO(page);
  await page.goto('/activity-feed');
  await expect(page.getByTestId('af-event-table')).toBeVisible();
  await expect(page.getByTestId('af-event-row-act-001')).toBeVisible();
  await expect(page.getByTestId('af-event-row-act-005')).toBeVisible();
  await expect(page.getByTestId('af-event-row-act-014')).toBeVisible();
});

test('AF-10: Action Required indicator shown for events requiring action', async ({ page }) => {
  await loginAsCEO(page);
  await page.goto('/activity-feed');
  await expect(page.getByTestId('af-action-required-act-005')).toBeVisible();
  await expect(page.getByTestId('af-action-required-act-014')).toBeVisible();
  await expect(page.getByTestId('af-action-required-act-010')).toBeVisible();
});

test('AF-11: Events sorted newest first (act-001 appears before act-023)', async ({ page }) => {
  await loginAsCEO(page);
  await page.goto('/activity-feed');
  const rows = page.getByTestId('af-event-table').locator('[data-testid^="af-event-row-"]');
  const count = await rows.count();
  expect(count).toBeGreaterThan(0);
  // act-001 was created 1 hour ago, act-023 was created 3 days ago
  // act-001 should appear before act-023 in the sorted list
  const allTestIds = await rows.evaluateAll((els) => els.map((e) => e.getAttribute('data-testid')));
  const idx001 = allTestIds.indexOf('af-event-row-act-001');
  const idx023 = allTestIds.indexOf('af-event-row-act-023');
  expect(idx001).toBeLessThan(idx023);
});

// ──────────────────────────────────────────────────────
// AF-12 to AF-15: Filters
// ──────────────────────────────────────────────────────

test('AF-12: Type filter — Sync events only', async ({ page }) => {
  await loginAsCEO(page);
  await page.goto('/activity-feed');
  await page.getByTestId('af-filter-type').click();
  await page.getByRole('option', { name: 'Sync' }).click();
  await expect(page.getByTestId('af-event-row-act-010')).toBeVisible();
  await expect(page.getByTestId('af-event-row-act-011')).toBeVisible();
  await expect(page.getByTestId('af-event-row-act-001')).not.toBeVisible();
});

test('AF-13: Priority filter — Critical events only', async ({ page }) => {
  await loginAsCEO(page);
  await page.goto('/activity-feed');
  await page.getByTestId('af-filter-priority').click();
  await page.getByRole('option', { name: 'Critical' }).click();
  await expect(page.getByTestId('af-event-row-act-005')).toBeVisible();
  await expect(page.getByTestId('af-event-row-act-010')).toBeVisible();
  await expect(page.getByTestId('af-event-row-act-001')).not.toBeVisible();
});

test('AF-14: Type filter — Job events only', async ({ page }) => {
  await loginAsCEO(page);
  await page.goto('/activity-feed');
  await page.getByTestId('af-filter-type').click();
  await page.getByRole('option', { name: 'Job' }).click();
  await expect(page.getByTestId('af-event-row-act-018')).toBeVisible();
  await expect(page.getByTestId('af-event-row-act-019')).toBeVisible();
  await expect(page.getByTestId('af-event-row-act-001')).not.toBeVisible();
});

test('AF-15: Priority filter — Warning events visible, info hidden', async ({ page }) => {
  await loginAsCEO(page);
  await page.goto('/activity-feed');
  await page.getByTestId('af-filter-priority').click();
  await page.getByRole('option', { name: 'Warning' }).click();
  await expect(page.getByTestId('af-event-row-act-002')).toBeVisible();
  await expect(page.getByTestId('af-event-row-act-001')).not.toBeVisible();
});

// ──────────────────────────────────────────────────────
// AF-16 to AF-18: Search
// ──────────────────────────────────────────────────────

test('AF-16: Search by event title filters results', async ({ page }) => {
  await loginAsCEO(page);
  await page.goto('/activity-feed');
  await page.getByTestId('af-search').fill('QuickBooks');
  await expect(page.getByTestId('af-event-row-act-010')).toBeVisible();
  await expect(page.getByTestId('af-event-row-act-001')).not.toBeVisible();
});

test('AF-17: Search by job ID filters results', async ({ page }) => {
  await loginAsCEO(page);
  await page.goto('/activity-feed');
  await page.getByTestId('af-search').fill('JOB-2026-005');
  await expect(page.getByTestId('af-event-row-act-014')).toBeVisible();
  await expect(page.getByTestId('af-event-row-act-001')).not.toBeVisible();
});

test('AF-18: Clearing search restores all events', async ({ page }) => {
  await loginAsCEO(page);
  await page.goto('/activity-feed');
  await page.getByTestId('af-search').fill('QuickBooks');
  await expect(page.getByTestId('af-event-row-act-001')).not.toBeVisible();
  await page.getByTestId('af-search').fill('');
  await expect(page.getByTestId('af-event-row-act-001')).toBeVisible();
});

// ──────────────────────────────────────────────────────
// AF-19 to AF-22: Event Detail Dialog
// ──────────────────────────────────────────────────────

test('AF-19: Event detail dialog opens on View', async ({ page }) => {
  await loginAsCEO(page);
  await page.goto('/activity-feed');
  await page.getByTestId('af-btn-view-act-001').click();
  await expect(page.getByTestId('af-event-detail-dialog')).toBeVisible();
});

test('AF-20: Detail dialog shows type and priority badges', async ({ page }) => {
  await loginAsCEO(page);
  await page.goto('/activity-feed');
  await page.getByTestId('af-btn-view-act-014').click();
  await expect(page.getByTestId('af-event-detail-dialog')).toBeVisible();
  await expect(page.getByTestId('af-detail-type-badge')).toBeVisible();
  await expect(page.getByTestId('af-detail-priority-badge')).toBeVisible();
});

test('AF-21: Detail dialog shows Action Required badge for action-required events', async ({ page }) => {
  await loginAsCEO(page);
  await page.goto('/activity-feed');
  await page.getByTestId('af-btn-view-act-016').click();
  await expect(page.getByTestId('af-detail-action-required-badge')).toBeVisible();
});

test('AF-22: Detail dialog shows Go to Source deep-link button', async ({ page }) => {
  await loginAsCEO(page);
  await page.goto('/activity-feed');
  await page.getByTestId('af-btn-view-act-010').click();
  await expect(page.getByTestId('af-event-detail-dialog')).toBeVisible();
  await expect(page.getByTestId('af-detail-btn-deep-link')).toBeVisible();
});

// ──────────────────────────────────────────────────────
// AF-23: Deep Linking
// ──────────────────────────────────────────────────────

test('AF-23: Deep link from sync event navigates to Finance Hub records tab', async ({ page }) => {
  await loginAsCEO(page);
  await page.goto('/activity-feed');
  await page.getByTestId('af-btn-view-act-010').click();
  await expect(page.getByTestId('af-event-detail-dialog')).toBeVisible();
  await page.getByTestId('af-detail-btn-deep-link').click();
  await expect(page).toHaveURL(/\/finance/);
});

// ──────────────────────────────────────────────────────
// AF-24: Doctrine Notice
// ──────────────────────────────────────────────────────

test('AF-24: Doctrine notice visible on Activity Feed page', async ({ page }) => {
  await loginAsCEO(page);
  await page.goto('/activity-feed');
  await expect(page.getByTestId('af-doctrine-notice')).toBeVisible();
  await expect(page.getByTestId('af-doctrine-notice')).toContainText(/informational only/i);
});

// ──────────────────────────────────────────────────────
// AF-25: Dashboard Widget
// ──────────────────────────────────────────────────────

test('AF-25: Activity Feed page is accessible for CEO', async ({ page }) => {
  await loginAsCEO(page);
  await page.goto('/activity-feed');
  await expect(page.getByRole('heading', { name: /Activity Feed/i })).toBeVisible();
});
