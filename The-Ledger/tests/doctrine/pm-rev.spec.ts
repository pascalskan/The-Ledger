/**
 * PM-REV Doctrine Tests
 *
 * Verifies PM-5 deliverables:
 * - PM review page scoped to assigned jobs only
 * - Quick Approve routes through store (doctrine preserved)
 * - Request Correction sets needs-correction status
 * - Escalation visibility in dedicated Escalated tab
 * - PM review detail exposes no financial data
 * - CEO Review Operations Centre unchanged
 * - PM review workspace sections present in review detail
 */
import { test, expect } from '@playwright/test';
import { loginAsCEO, loginAsPM } from '../helpers/login';
import { clearBrowserState } from '../helpers/state';

test.beforeEach(async ({ page }) => {
  await clearBrowserState(page);
});

// ────────────────────────────────────────────────────────────────
// PM-REV-01 — PM only sees reviews for assigned jobs
// ────────────────────────────────────────────────────────────────

test('PM-REV-01: PM review page scoped to assigned jobs only', async ({ page }) => {
  await loginAsPM(page);
  await page.goto('/review');
  await page.waitForSelector('[data-testid="pm-review-page"]');

  // PM Review Operations Centre renders
  await expect(page.getByTestId('pm-review-page')).toBeVisible();
  await expect(page.getByTestId('pm-review-metrics')).toBeVisible();
  await expect(page.getByTestId('pm-review-tabs')).toBeVisible();

  // PM sees the pending queue (items for their jobs)
  await expect(page.getByTestId('pm-review-tab-pending')).toBeVisible();
  await expect(page.getByTestId('pm-review-queue')).toBeVisible();

  // CEO intelligence tabs must NOT be present for PM
  await expect(page.getByTestId('review-hub-tabs')).not.toBeVisible();
  await expect(page.getByTestId('review-hub-tab-briefing')).not.toBeVisible();

  // Metrics strip shows PM-scoped counts
  await expect(page.getByTestId('pm-review-metric-pending')).toBeVisible();
  await expect(page.getByTestId('pm-review-metric-overdue')).toBeVisible();
  await expect(page.getByTestId('pm-review-metric-corrections')).toBeVisible();
  await expect(page.getByTestId('pm-review-metric-escalations')).toBeVisible();
});

// ────────────────────────────────────────────────────────────────
// PM-REV-02 — Quick Approve follows doctrine (routes through store)
// ────────────────────────────────────────────────────────────────

test('PM-REV-02: Quick Approve routes through store and removes item from pending queue', async ({ page }) => {
  await loginAsPM(page);
  await page.goto('/review');
  await page.waitForSelector('[data-testid="pm-review-page"]');

  // Locate the pending queue
  const queue = page.getByTestId('pm-review-queue');

  // There should be at least one pending item (rev-pm-1 for dj-pm-active-1)
  const firstApproveBtn = queue.locator('[data-testid^="pm-review-quick-approve-"]').first();
  await expect(firstApproveBtn).toBeVisible();

  // Capture the item's testId suffix before approving
  const testId = await firstApproveBtn.getAttribute('data-testid') ?? '';
  const itemId = testId.replace('pm-review-quick-approve-', '');

  // Click Quick Approve
  await firstApproveBtn.click();

  // The item should no longer appear in the pending queue
  await expect(page.getByTestId(`pm-review-item-${itemId}`)).not.toBeVisible();
});

// ────────────────────────────────────────────────────────────────
// PM-REV-03 — Correction workflow preserved
// ────────────────────────────────────────────────────────────────

test('PM-REV-03: Request Correction moves item to Corrected tab', async ({ page }) => {
  await loginAsPM(page);
  await page.goto('/review');
  await page.waitForSelector('[data-testid="pm-review-page"]');

  // Click Correction on the first pending item
  const queue = page.getByTestId('pm-review-queue');
  const firstCorrectionBtn = queue.locator('[data-testid^="pm-review-request-correction-"]').first();
  await expect(firstCorrectionBtn).toBeVisible();
  const corrBtnId = await firstCorrectionBtn.getAttribute('data-testid') ?? '';
  const corrItemId = corrBtnId.replace('pm-review-request-correction-', '');

  await firstCorrectionBtn.click();

  // Correction form appears inline
  await expect(page.getByTestId(`pm-review-correction-form-${corrItemId}`)).toBeVisible();

  // Fill in correction note and submit
  await page.getByTestId(`pm-review-correction-input-${corrItemId}`).fill('Please add exact quantities and part numbers from spec sheet section 4.2.');
  await page.getByTestId(`pm-review-correction-submit-${corrItemId}`).click();

  // Item should leave pending queue
  await expect(page.getByTestId(`pm-review-item-${corrItemId}`)).not.toBeVisible();

  // Navigate to Corrected tab — item should appear there
  await page.getByTestId('pm-review-tab-corrected').click();
  await expect(page.getByTestId('pm-review-corrected-list')).toBeVisible();
  await expect(page.getByTestId(`pm-review-corrected-item-${corrItemId}`)).toBeVisible();
});

// ────────────────────────────────────────────────────────────────
// PM-REV-04 — Escalation visibility works
// ────────────────────────────────────────────────────────────────

test('PM-REV-04: Escalated tab shows escalated items; PM cannot approve them', async ({ page }) => {
  await loginAsPM(page);
  await page.goto('/review');
  await page.waitForSelector('[data-testid="pm-review-page"]');

  // Navigate to Escalated tab
  await page.getByTestId('pm-review-tab-escalated').click();
  await expect(page.getByTestId('pm-review-escalated-list')).toBeVisible();

  // Demo item rev-pm-4 is pre-escalated
  await expect(page.getByTestId('pm-review-escalated-item-rev-pm-4')).toBeVisible();
  await expect(page.getByTestId('pm-review-escalated-item-rev-pm-4')).toContainText('Escalated');

  // Escalated items have no approve/reject/correction buttons (read-only for PM)
  await expect(page.getByTestId('pm-review-quick-approve-rev-pm-4')).not.toBeVisible();
  await expect(page.getByTestId('pm-review-request-correction-rev-pm-4')).not.toBeVisible();

  // Metric count reflects escalated item
  await expect(page.getByTestId('pm-review-metric-escalations')).not.toContainText('0');
});

// ────────────────────────────────────────────────────────────────
// PM-REV-05 — No financial normalization visibility in PM review
// ────────────────────────────────────────────────────────────────

test('PM-REV-05: PM review detail page contains no financial data', async ({ page }) => {
  await loginAsPM(page);
  // Navigate directly to review detail for dj-pm-active-1 (PM's active job)
  await page.goto('/review/dj-pm-active-1');
  await page.waitForSelector('[data-testid="review-detail-age"]');

  // Financial Impact card must NOT be visible for PM
  await expect(page.getByTestId('review-detail-financial')).not.toBeVisible();

  // Priority intelligence panel (contains financial exposure score) must NOT appear
  await expect(page.getByTestId('review-detail-priority-panel')).not.toBeVisible();

  // Decision Intelligence panel (revenue/margin) must NOT appear
  await expect(page.getByTestId('decision-financial-impact')).not.toBeVisible();

  // PM Review Workspace IS visible
  await expect(page.getByTestId('pm-review-workspace')).toBeVisible();
  await expect(page.getByTestId('pm-review-worker-info')).toBeVisible();
  await expect(page.getByTestId('pm-review-job-context')).toBeVisible();
  await expect(page.getByTestId('pm-review-timeline')).toBeVisible();

  // No financial terminology visible anywhere on the page
  const body = page.locator('[data-testid="pm-review-workspace"]');
  await expect(body).not.toContainText('Financial Impact');
  await expect(body).not.toContainText('Revenue');
  await expect(body).not.toContainText('Margin');
  await expect(body).not.toContainText('Exposure');
});

// ────────────────────────────────────────────────────────────────
// PM-REV-06 — CEO Review Operations Centre unchanged
// ────────────────────────────────────────────────────────────────

test('PM-REV-06: CEO sees full Review Operations Centre with all intelligence tabs', async ({ page }) => {
  await loginAsCEO(page);
  await page.goto('/review');
  await page.waitForSelector('[data-testid="review-hub-tabs"]');

  // CEO sees the UX-7 intelligence tabs
  await expect(page.getByTestId('review-hub-tabs')).toBeVisible();
  await expect(page.getByTestId('review-hub-tab-briefing')).toBeVisible();
  await expect(page.getByTestId('review-hub-tab-dashboard')).toBeVisible();
  await expect(page.getByTestId('review-hub-tab-prioritisation')).toBeVisible();
  await expect(page.getByTestId('review-hub-tab-recommendations')).toBeVisible();
  await expect(page.getByTestId('review-hub-tab-analytics')).toBeVisible();

  // CEO does NOT see the PM Review Centre
  await expect(page.getByTestId('pm-review-page')).not.toBeVisible();

  // CEO has Standard/Priority ordering toggle
  await expect(page.getByTestId('review-order-toggle')).toBeVisible();

  // CEO sees the full review queue
  await page.goto('/review/dj-kitchen-extract-1');
  await expect(page.getByTestId('review-detail-financial')).toBeVisible();
});

// ────────────────────────────────────────────────────────────────
// PM-REV-07 — PM review workspace sections in review detail
// ────────────────────────────────────────────────────────────────

test('PM-REV-07: PM review detail renders operational workspace sections', async ({ page }) => {
  await loginAsPM(page);
  await page.goto('/review/dj-pm-active-1');
  await page.waitForSelector('[data-testid="pm-review-workspace"]');

  // All 3 PM workspace cards visible
  await expect(page.getByTestId('pm-review-worker-info')).toBeVisible();
  await expect(page.getByTestId('pm-review-job-context')).toBeVisible();
  await expect(page.getByTestId('pm-review-timeline')).toBeVisible();

  // Job context shows operational data (status, priority, crew)
  const jobContext = page.getByTestId('pm-review-job-context');
  await expect(jobContext).toContainText('Active');

  // Review timeline shows item counts
  await expect(page.getByTestId('pm-review-timeline')).toContainText('Submitted');
  await expect(page.getByTestId('pm-review-timeline')).toContainText('Approved');

  // Age and priority cards still visible (non-financial)
  await expect(page.getByTestId('review-detail-age')).toBeVisible();
  await expect(page.getByTestId('review-detail-priority')).toBeVisible();
  await expect(page.getByTestId('review-detail-history')).toBeVisible();

  // Approve/Reject buttons still present (PM is authorized to approve)
  const approveBtn = page.locator('button', { hasText: 'Approve' }).first();
  await expect(approveBtn).toBeVisible();
  const rejectBtn = page.locator('button', { hasText: 'Reject' }).first();
  await expect(rejectBtn).toBeVisible();
});
