import { test, expect } from '@playwright/test';
import { loginAsCEO, loginAsPM } from '../helpers/login';
import { clearBrowserState } from '../helpers/state';
import { openReviewCenter, openReviewHubTab } from '../helpers/navigation';

/**
 * UX-7.1 — Executive Review Dashboard doctrine tests.
 *
 * These verify the executive VISIBILITY layer renders and is read-only.
 * UX-7.8 unified the CEO layers into the Review Operations Centre tabs, so the
 * dashboard now lives under the "Dashboard" tab.
 */

test.beforeEach(async ({ page }) => {
  await clearBrowserState(page);
});

async function openDashboard(page: import('@playwright/test').Page) {
  await loginAsCEO(page);
  await openReviewCenter(page);
  await openReviewHubTab(page, 'dashboard');
}

test('REV-EXE-01 CEO sees the executive dashboard and the queue below', async ({ page }) => {
  await openDashboard(page);
  await expect(page.getByTestId('review-executive-dashboard')).toBeVisible();
  // The live job queue is preserved beneath the hub.
  await expect(page.getByText('Jobs Requiring Review')).toBeVisible();
});

test('REV-EXE-02 KPI strip renders all eight executive metrics', async ({ page }) => {
  await openDashboard(page);
  const ids = [
    'review-kpi-pending',
    'review-kpi-overdue',
    'review-kpi-revenue',
    'review-kpi-cost',
    'review-kpi-payroll',
    'review-kpi-highrisk',
    'review-kpi-avgage',
    'review-kpi-completed',
  ];
  for (const id of ids) {
    await expect(page.getByTestId(id)).toBeVisible();
  }
});

test('REV-EXE-03 Financial exposure panel shows revenue, cost and payroll', async ({ page }) => {
  await openDashboard(page);
  const panel = page.getByTestId('review-financial-exposure');
  await expect(panel).toBeVisible();
  await expect(panel).toContainText(/Revenue blocked by approvals/i);
  await expect(panel).toContainText(/Costs awaiting approval/i);
  await expect(panel).toContainText(/Payroll awaiting approval/i);
  await expect(panel).toContainText(/Total exposure/i);
});

test('REV-EXE-04 Requires-attention queue renders prioritised rows', async ({ page }) => {
  await openDashboard(page);
  const queue = page.getByTestId('review-attention-queue');
  await expect(queue).toBeVisible();
  await expect(queue.locator('[data-testid^="review-attention-row-"]').first()).toBeVisible();
});

test('REV-EXE-05 Reviews-by-type breakdown lists all canonical categories', async ({ page }) => {
  await openDashboard(page);
  const breakdown = page.getByTestId('review-type-breakdown');
  await expect(breakdown).toBeVisible();
  for (const t of [
    'timesheets',
    'expenses',
    'inventory-usage',
    'equipment-usage',
    'reports',
    'uploads',
    'qa-records',
  ]) {
    await expect(breakdown.getByTestId(`review-type-row-${t}`)).toBeVisible();
  }
});

test('REV-EXE-06 Workload summary and throughput trend render', async ({ page }) => {
  await openDashboard(page);
  const workload = page.getByTestId('review-workload-summary');
  await expect(workload).toBeVisible();
  await expect(workload).toContainText(/Received today/i);
  await expect(workload).toContainText(/Backlog size/i);
  await expect(page.getByTestId('review-throughput-trend')).toBeVisible();
});

test('REV-EXE-07 Executive insights are generated', async ({ page }) => {
  await openDashboard(page);
  const insights = page.getByTestId('review-executive-insights');
  await expect(insights).toBeVisible();
  await expect(insights.getByTestId('review-insight').first()).toBeVisible();
});

test('REV-EXE-08 PMs do not see the CEO executive dashboard', async ({ page }) => {
  await loginAsPM(page);
  await openReviewCenter(page);
  // The legacy queue is still available to PMs...
  await expect(page.getByText('Jobs Requiring Review')).toBeVisible();
  // ...but the CEO-only Review Operations Centre is not rendered.
  await expect(page.getByTestId('review-hub-tabs')).toHaveCount(0);
  await expect(page.getByTestId('review-executive-dashboard')).toHaveCount(0);
});

test('REV-EXE-09 Review detail surfaces read-only executive context', async ({ page }) => {
  await loginAsCEO(page);
  await openReviewCenter(page);
  // Enter the first job that requires review (queue is always visible).
  await page.getByRole('button', { name: /Review Items/i }).first().click();
  await expect(page.getByTestId('review-detail-context')).toBeVisible();
  await expect(page.getByTestId('review-detail-financial')).toBeVisible();
  await expect(page.getByTestId('review-detail-age')).toBeVisible();
  await expect(page.getByTestId('review-detail-priority')).toBeVisible();
  await expect(page.getByTestId('review-detail-history')).toBeVisible();
  // Approval controls remain intact (doctrine: nothing bypassed).
  await expect(page.getByRole('button', { name: /^Approve$/i }).first()).toBeVisible();
});

test('REV-EXE-10 Dashboard is visibility-only — no approve/reject controls in it', async ({ page }) => {
  await openDashboard(page);
  const dashboard = page.getByTestId('review-executive-dashboard');
  await expect(dashboard).toBeVisible();
  await expect(dashboard.getByRole('button', { name: /approve|reject/i })).toHaveCount(0);
});
