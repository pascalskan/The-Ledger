import { test, expect } from '@playwright/test';
import { loginAsCEO } from '../helpers/login';
import { clearBrowserState } from '../helpers/state';
import { openReviewCenter } from '../helpers/navigation';

/**
 * UX-7.4 — Decision Intelligence doctrine tests.
 *
 * The platform SURFACES impact before a decision; it never makes the decision.
 * These tests verify the financial/job/client impact, approval preview,
 * comparison view, executive insights, and batch impact — and that approval
 * controls remain unchanged.
 */

test.beforeEach(async ({ page }) => {
  await clearBrowserState(page);
});

async function openFirstJobDetail(page: import('@playwright/test').Page) {
  await loginAsCEO(page);
  await openReviewCenter(page);
  await page.getByRole('button', { name: /Review Items/i }).first().click();
  await expect(page.getByTestId('review-decision-panel')).toBeVisible();
}

test('REV-DI-01 Decision panel renders for a job with pending reviews', async ({ page }) => {
  await openFirstJobDetail(page);
  await expect(page.getByTestId('review-decision-panel')).toBeVisible();
});

test('REV-DI-02 Financial impact panel shows revenue, cost and payroll', async ({ page }) => {
  await openFirstJobDetail(page);
  const fin = page.getByTestId('decision-financial-impact');
  await expect(fin).toBeVisible();
  await expect(fin).toContainText(/Revenue Impact/i);
  await expect(fin).toContainText(/Cost Impact/i);
  await expect(fin).toContainText(/Payroll Impact/i);
  await expect(fin).toContainText(/Revenue generated/i);
  await expect(fin).toContainText(/Equipment cost impact/i);
  await expect(fin).toContainText(/Timesheet impact/i);
});

test('REV-DI-03 Job impact summary renders profitability and margin', async ({ page }) => {
  await openFirstJobDetail(page);
  const job = page.getByTestId('decision-job-impact');
  await expect(job).toBeVisible();
  await expect(job).toContainText(/Job profitability/i);
  await expect(job).toContainText(/Job margin/i);
  await expect(job).toContainText(/Revenue recognition/i);
});

test('REV-DI-04 Client impact summary renders billing and timing', async ({ page }) => {
  await openFirstJobDetail(page);
  const client = page.getByTestId('decision-client-impact');
  await expect(client).toBeVisible();
  await expect(client).toContainText(/Client billing impact/i);
  await expect(client).toContainText(/Invoice readiness/i);
  await expect(client).toContainText(/Revenue timing/i);
});

test('REV-DI-05 Comparison view shows Approve / Reject / Correct side by side', async ({ page }) => {
  await openFirstJobDetail(page);
  await expect(page.getByTestId('decision-comparison')).toBeVisible();
  await expect(page.getByTestId('decision-outcome-approve')).toBeVisible();
  await expect(page.getByTestId('decision-outcome-reject')).toBeVisible();
  await expect(page.getByTestId('decision-outcome-correct')).toBeVisible();
});

test('REV-DI-06 Comparison view takes no action (informational only)', async ({ page }) => {
  await openFirstJobDetail(page);
  const comparison = page.getByTestId('decision-comparison');
  // No approve/reject buttons inside the comparison view.
  await expect(comparison.getByRole('button')).toHaveCount(0);
});

test('REV-DI-07 Executive impact insights are generated', async ({ page }) => {
  await openFirstJobDetail(page);
  const insights = page.getByTestId('decision-insights');
  await expect(insights).toBeVisible();
  await expect(insights.getByTestId('decision-insight').first()).toBeVisible();
});

test('REV-DI-08 Batch confirmation shows aggregated profitability impact', async ({ page }) => {
  await openFirstJobDetail(page);
  await page.getByTestId('select-all-visible').click();
  await page.getByTestId('batch-approve-btn').click();
  await expect(page.getByTestId('batch-confirm-dialog')).toBeVisible();
  await expect(page.getByTestId('batch-profitability-impact')).toBeVisible();
  await expect(page.getByTestId('batch-profitability-impact')).toContainText(
    /Total profitability impact/i
  );
});

test('REV-DI-09 Approval controls remain unchanged', async ({ page }) => {
  await openFirstJobDetail(page);
  // Existing single-item approve/reject still present and usable.
  await expect(page.getByRole('button', { name: /^Approve$/i }).first()).toBeVisible();
  await expect(page.getByRole('button', { name: /^Reject$/i }).first()).toBeVisible();
});

test('REV-DI-10 Decision panel exposes no approval controls', async ({ page }) => {
  await openFirstJobDetail(page);
  const panel = page.getByTestId('review-decision-panel');
  await expect(panel).toBeVisible();
  // Doctrine: decision intelligence is informational — no approve/reject here.
  await expect(panel.getByRole('button', { name: /approve|reject/i })).toHaveCount(0);
});
