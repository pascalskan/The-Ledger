/**
 * DOCTRINE TEST: Exception Resolution Centre
 *
 * Phase 5.9 adds the Exception Resolution Centre at /exception-resolution-center.
 * This spec validates:
 *   - Page load and CEO access
 *   - KPI strip (Open, Investigating, Awaiting Approval, Resolved)
 *   - Exception Queue renders
 *   - Status filters work
 *   - Type and assignee filters render
 *   - Financial Controls tab: dashboard, override queue, approve/reject actions
 *   - Financial Explorer Exceptions tab is visible
 *   - Job Detail JobExceptionPanel is visible
 *
 * Target: 16 tests
 */
import { test, expect } from '@playwright/test';
import { loginAsCEO } from '../helpers/login';
import { clearBrowserState } from '../helpers/state';

test.beforeEach(async ({ page }) => {
  await clearBrowserState(page);
});

// ── Exception Resolution Centre ──────────────────────────────────────────────

test('Exception Resolution Centre: page loads for CEO', async ({ page }) => {
  await loginAsCEO(page);
  await page.goto('/exception-resolution-center');
  await expect(page).toHaveURL(/exception-resolution-center/i);
  await expect(
    page.getByRole('heading', { name: /Exception Resolution Centre/i })
  ).toBeVisible();
});

test('Exception Resolution Centre: CEO can navigate via sidebar', async ({ page }) => {
  await loginAsCEO(page);
  await page.locator('a').filter({ hasText: /Exception Resolution/i }).first().click();
  await expect(page).toHaveURL(/exception-resolution-center/i);
  await expect(
    page.getByRole('heading', { name: /Exception Resolution Centre/i })
  ).toBeVisible();
});

test('Exception Resolution Centre: KPI strip renders all four cards', async ({ page }) => {
  await loginAsCEO(page);
  await page.goto('/exception-resolution-center');
  await expect(page.getByTestId('exc-kpi-strip')).toBeVisible();
  // The KPI cards show the counts
  await expect(page.getByTestId('exc-kpi-open')).toBeVisible();
  await expect(page.getByTestId('exc-kpi-investigating')).toBeVisible();
  await expect(page.getByTestId('exc-kpi-awaiting')).toBeVisible();
  await expect(page.getByTestId('exc-kpi-resolved')).toBeVisible();
});

test('Exception Resolution Centre: Exception Queue tab renders', async ({ page }) => {
  await loginAsCEO(page);
  await page.goto('/exception-resolution-center');
  await expect(page.getByTestId('exc-queue-table')).toBeVisible();
});

test('Exception Resolution Centre: queue has expected columns', async ({ page }) => {
  await loginAsCEO(page);
  await page.goto('/exception-resolution-center');
  const table = page.getByTestId('exc-queue-table');
  await expect(table).toContainText('Exception ID');
  await expect(table).toContainText('Type');
  await expect(table).toContainText('Status');
  await expect(table).toContainText('Assigned To');
});

test('Exception Resolution Centre: search input renders', async ({ page }) => {
  await loginAsCEO(page);
  await page.goto('/exception-resolution-center');
  await expect(page.getByTestId('exc-search')).toBeVisible();
});

test('Exception Resolution Centre: status filter renders with expected options', async ({ page }) => {
  await loginAsCEO(page);
  await page.goto('/exception-resolution-center');
  const statusFilter = page.getByTestId('exc-filter-status');
  await expect(statusFilter).toBeVisible();
  await expect(statusFilter).toContainText('Open');
  await expect(statusFilter).toContainText('Under Investigation');
  await expect(statusFilter).toContainText('Awaiting Approval');
  await expect(statusFilter).toContainText('Resolved');
});

test('Exception Resolution Centre: type filter renders', async ({ page }) => {
  await loginAsCEO(page);
  await page.goto('/exception-resolution-center');
  await expect(page.getByTestId('exc-filter-type')).toBeVisible();
});

test('Exception Resolution Centre: assignee filter renders', async ({ page }) => {
  await loginAsCEO(page);
  await page.goto('/exception-resolution-center');
  await expect(page.getByTestId('exc-filter-assignee')).toBeVisible();
});

test('Exception Resolution Centre: filtering by Open status reduces queue to open items only', async ({ page }) => {
  await loginAsCEO(page);
  await page.goto('/exception-resolution-center');
  await page.getByTestId('exc-filter-status').selectOption('open');
  // All visible status badges should say "Open"
  const badges = page.locator('[data-testid^="exc-status-"]');
  const count = await badges.count();
  if (count > 0) {
    for (let i = 0; i < count; i++) {
      await expect(badges.nth(i)).toContainText('Open');
    }
  }
});

// ── Financial Controls tab ────────────────────────────────────────────────────

test('Financial Controls: tab is present and clickable', async ({ page }) => {
  await loginAsCEO(page);
  await page.goto('/exception-resolution-center');
  const controlsTab = page.getByTestId('exc-tab-controls');
  await expect(controlsTab).toBeVisible();
  await controlsTab.click();
  await expect(page.getByTestId('exc-controls-panel')).toBeVisible();
});

test('Financial Controls: dashboard KPI strip renders', async ({ page }) => {
  await loginAsCEO(page);
  await page.goto('/exception-resolution-center');
  await page.getByTestId('exc-tab-controls').click();
  await expect(page.getByTestId('exc-controls-kpi-strip')).toBeVisible();
  await expect(page.getByTestId('exc-ctl-kpi-pending')).toBeVisible();
  await expect(page.getByTestId('exc-ctl-kpi-approved')).toBeVisible();
  await expect(page.getByTestId('exc-ctl-kpi-rejected')).toBeVisible();
  await expect(page.getByTestId('exc-ctl-kpi-impact')).toBeVisible();
});

test('Financial Controls: override queue renders with expected columns', async ({ page }) => {
  await loginAsCEO(page);
  await page.goto('/exception-resolution-center');
  await page.getByTestId('exc-tab-controls').click();
  const queue = page.getByTestId('exc-override-queue');
  await expect(queue).toBeVisible();
  await expect(queue).toContainText('Type');
  await expect(queue).toContainText('Requested By');
  await expect(queue).toContainText('Financial Impact');
});

test('Financial Controls: pending controls have approve and reject buttons', async ({ page }) => {
  await loginAsCEO(page);
  await page.goto('/exception-resolution-center');
  await page.getByTestId('exc-tab-controls').click();
  // At least one pending control should have approve/reject buttons
  const approveBtn = page.locator('[data-testid^="exc-ctl-btn-approve-"]').first();
  const rejectBtn = page.locator('[data-testid^="exc-ctl-btn-reject-"]').first();
  await expect(approveBtn).toBeVisible();
  await expect(rejectBtn).toBeVisible();
});

// ── Financial Explorer — Exceptions tab ──────────────────────────────────────

test('Financial Explorer: Exceptions tab is visible', async ({ page }) => {
  await loginAsCEO(page);
  await page.goto('/financial-explorer');
  await expect(page.getByTestId('tab-exceptions')).toBeVisible();
});

test('Financial Explorer: Exceptions tab panel renders KPI strip and table', async ({ page }) => {
  await loginAsCEO(page);
  await page.goto('/financial-explorer');
  await page.getByTestId('tab-exceptions').click();
  await expect(page.getByTestId('exc-tab-panel')).toBeVisible();
  await expect(page.getByTestId('exc-tab-kpi-strip')).toBeVisible();
  await expect(page.getByTestId('exc-tab-table')).toBeVisible();
});

// ── Job Detail — JobExceptionPanel ────────────────────────────────────────────

test('Job Detail: JobExceptionPanel renders on first seed job', async ({ page }) => {
  await loginAsCEO(page);
  // Navigate to any job detail page via jobs list
  await page.goto('/jobs');
  // Click first job row
  const firstJob = page.locator('tbody tr').first();
  await firstJob.click();
  // JobExceptionPanel should be visible (data-testid starts with job-exception-panel-)
  await expect(page.locator('[data-testid^="job-exception-panel-"]').first()).toBeVisible();
});
