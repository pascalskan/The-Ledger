import { test, expect } from '@playwright/test';
import { loginAsCEO, loginAsPM } from '../helpers/login';
import { clearBrowserState } from '../helpers/state';
import { openReviewCenter, openReviewHubTab } from '../helpers/navigation';

/**
 * UX-7.6 — Review Operations Analytics doctrine tests.
 *
 * This phase MEASURES decision-making; it never alters it. UX-7.8 moved the
 * analytics dashboard under the Review Operations Centre "Analytics" tab.
 */

test.beforeEach(async ({ page }) => {
  await clearBrowserState(page);
});

async function openAnalytics(page: import('@playwright/test').Page) {
  await loginAsCEO(page);
  await openReviewCenter(page);
  await openReviewHubTab(page, 'analytics');
}

test('REV-AN-01 Analytics tab shows the analytics dashboard', async ({ page }) => {
  await openAnalytics(page);
  await expect(page.getByTestId('review-analytics-dashboard')).toBeVisible();
});

test('REV-AN-02 Volume + throughput KPI cards render', async ({ page }) => {
  await openAnalytics(page);
  for (const id of [
    'kpi-total',
    'kpi-pending',
    'kpi-completed',
    'kpi-approved',
    'kpi-rejected',
    'kpi-corrected',
    'kpi-today',
    'kpi-week',
    'kpi-avg-daily',
    'kpi-avg-weekly',
  ]) {
    await expect(page.getByTestId(id)).toBeVisible();
  }
});

test('REV-AN-03 Approval performance metrics render incl. SLA compliance', async ({ page }) => {
  await openAnalytics(page);
  const perf = page.getByTestId('review-approval-performance');
  await expect(perf).toBeVisible();
  await expect(perf).toContainText(/Average approval time/i);
  await expect(page.getByTestId('sla-compliance')).toBeVisible();
});

test('REV-AN-04 Bottleneck analysis renders with warnings/lists', async ({ page }) => {
  await openAnalytics(page);
  await expect(page.getByTestId('review-bottlenecks')).toBeVisible();
  await expect(page.getByTestId('bottleneck-oldest')).toBeVisible();
  await expect(page.getByTestId('bottleneck-sla')).toBeVisible();
  await expect(page.getByTestId('bottleneck-highrisk')).toBeVisible();
  await expect(page.getByTestId('bottleneck-sensitive')).toBeVisible();
});

test('REV-AN-05 Reviewer performance covers CEO / PM / Reviewer', async ({ page }) => {
  await openAnalytics(page);
  await expect(page.getByTestId('review-reviewer-performance')).toBeVisible();
  await expect(page.getByTestId('reviewer-row-ceo')).toBeVisible();
  await expect(page.getByTestId('reviewer-row-pm')).toBeVisible();
  await expect(page.getByTestId('reviewer-row-reviewer')).toBeVisible();
});

test('REV-AN-06 Review type analytics lists all seven categories', async ({ page }) => {
  await openAnalytics(page);
  const section = page.getByTestId('review-type-analytics');
  await expect(section).toBeVisible();
  for (const t of [
    'timesheets',
    'expenses',
    'inventory-usage',
    'equipment-usage',
    'reports',
    'uploads',
    'qa-records',
  ]) {
    await expect(section.getByTestId(`type-analytics-${t}`)).toBeVisible();
  }
});

test('REV-AN-07 Financial throughput analytics render', async ({ page }) => {
  await openAnalytics(page);
  const fin = page.getByTestId('review-financial-throughput');
  await expect(fin).toBeVisible();
  await expect(fin).toContainText(/Revenue awaiting/i);
  await expect(fin).toContainText(/Payroll released/i);
});

test('REV-AN-08 Trend analysis cards render', async ({ page }) => {
  await openAnalytics(page);
  await expect(page.getByTestId('review-trends')).toBeVisible();
  for (const t of ['approval', 'rejection', 'correction', 'backlog', 'throughput']) {
    await expect(page.getByTestId(`trend-${t}`)).toBeVisible();
  }
});

test('REV-AN-09 Operational health score and insights render', async ({ page }) => {
  await openAnalytics(page);
  await expect(page.getByTestId('review-health-score')).toBeVisible();
  await expect(page.getByTestId('health-status')).toBeVisible();
  await expect(page.getByTestId('health-explanation')).toBeVisible();
  const insights = page.getByTestId('review-analytics-insights');
  await expect(insights).toBeVisible();
  await expect(insights.getByTestId('analytics-insight').first()).toBeVisible();
});

test('REV-AN-10 Analytics is read-only and PMs do not see it; workflows intact', async ({ page }) => {
  await openAnalytics(page);
  // Doctrine: analytics measures, never acts — no approval controls.
  await expect(
    page.getByTestId('review-analytics-dashboard').getByRole('button', {
      name: /approve|reject|correct/i,
    })
  ).toHaveCount(0);
  // Existing single-item workflow remains (queue always visible).
  await page.getByRole('button', { name: /Review Items/i }).first().click();
  await expect(page.getByRole('button', { name: /^Approve$/i }).first()).toBeVisible();

  // PMs do not see the CEO analytics dashboard.
  await clearBrowserState(page);
  await loginAsPM(page);
  await openReviewCenter(page);
  await expect(page.getByTestId('review-analytics-dashboard')).toHaveCount(0);
});
