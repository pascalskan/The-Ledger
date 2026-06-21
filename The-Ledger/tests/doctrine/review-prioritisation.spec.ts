import { test, expect } from '@playwright/test';
import { loginAsCEO, loginAsPM } from '../helpers/login';
import { clearBrowserState } from '../helpers/state';
import { openReviewCenter, openReviewHubTab } from '../helpers/navigation';

/**
 * UX-7.2 — Intelligent Prioritisation doctrine tests.
 *
 * Prioritisation influences VISIBILITY only — never approval outcomes.
 * UX-7.8 moved the priority panel under the Review Operations Centre
 * "Prioritisation" tab; the order toggle + job priority badges remain on the
 * always-visible review queue.
 */

test.beforeEach(async ({ page }) => {
  await clearBrowserState(page);
});

async function openPrioritisation(page: import('@playwright/test').Page) {
  await loginAsCEO(page);
  await openReviewCenter(page);
  await openReviewHubTab(page, 'prioritisation');
}

test('REV-PRI-01 CEO sees the recommended work queue (priority panel)', async ({ page }) => {
  await openPrioritisation(page);
  await expect(page.getByTestId('review-priority-panel')).toBeVisible();
  await expect(page.getByTestId('review-priority-queue')).toBeVisible();
});

test('REV-PRI-02 Priority distribution shows all four categories', async ({ page }) => {
  await openPrioritisation(page);
  for (const c of ['critical', 'high', 'medium', 'low']) {
    await expect(page.getByTestId(`priority-dist-${c}`)).toBeVisible();
  }
});

test('REV-PRI-03 Priority queue rows render scores and categories in order', async ({ page }) => {
  await openPrioritisation(page);
  const rows = page.locator('[data-testid^="priority-queue-row-"]');
  await expect(rows.first()).toBeVisible();
  await expect(
    page.getByTestId('review-priority-queue').locator('[data-testid^="priority-badge-"]').first()
  ).toBeVisible();
});

test('REV-PRI-04 Priority insights are generated', async ({ page }) => {
  await openPrioritisation(page);
  const insights = page.getByTestId('review-priority-insights');
  await expect(insights).toBeVisible();
  await expect(insights.getByTestId('priority-insight').first()).toBeVisible();
});

test('REV-PRI-05 Executive attention buckets render', async ({ page }) => {
  await openPrioritisation(page);
  await expect(page.getByTestId('review-executive-attention')).toBeVisible();
  for (const b of [
    'attention-critical',
    'attention-revenue',
    'attention-payroll',
    'attention-oldest',
  ]) {
    await expect(page.getByTestId(b)).toBeVisible();
  }
});

test('REV-PRI-06 Standard / Priority order toggle reorders the job table', async ({ page }) => {
  await loginAsCEO(page);
  await openReviewCenter(page);
  const toggle = page.getByTestId('review-order-toggle');
  await expect(toggle).toBeVisible();
  await expect(page.getByTestId('review-order-standard')).toHaveAttribute('aria-pressed', 'true');
  await page.getByTestId('review-order-priority').click();
  await expect(page.getByTestId('review-order-priority')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByText('Jobs Requiring Review')).toBeVisible();
});

test('REV-PRI-07 Job rows carry priority badges', async ({ page }) => {
  await loginAsCEO(page);
  await openReviewCenter(page);
  const jobPriority = page.locator('[data-testid^="review-job-priority-"]');
  await expect(jobPriority.first()).toBeVisible();
  await expect(jobPriority.first().locator('[data-testid^="priority-badge-"]')).toBeVisible();
});

test('REV-PRI-08 Review detail shows priority, score, queue position and factors', async ({ page }) => {
  await loginAsCEO(page);
  await openReviewCenter(page);
  await page.getByRole('button', { name: /Review Items/i }).first().click();
  await expect(page.getByTestId('review-detail-priority-panel')).toBeVisible();
  await expect(page.getByTestId('review-detail-priority-score')).toBeVisible();
  await expect(page.getByTestId('review-detail-priority-factors')).toBeVisible();
});

test('REV-PRI-09 PMs do not see the CEO priority panel or order toggle', async ({ page }) => {
  await loginAsPM(page);
  await openReviewCenter(page);
  await expect(page.getByTestId('pm-review-page')).toBeVisible();
  await expect(page.getByTestId('review-priority-panel')).toHaveCount(0);
  await expect(page.getByTestId('review-order-toggle')).toHaveCount(0);
});

test('REV-PRI-10 Prioritisation is visibility-only — no approve/reject controls in the panel', async ({ page }) => {
  await openPrioritisation(page);
  const panel = page.getByTestId('review-priority-panel');
  await expect(panel).toBeVisible();
  await expect(panel.getByRole('button', { name: /approve|reject/i })).toHaveCount(0);
});
