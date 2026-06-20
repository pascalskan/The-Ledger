import { test, expect } from '@playwright/test';
import { loginAsCEO } from '../helpers/login';
import { clearBrowserState } from '../helpers/state';
import { openReviewCenter } from '../helpers/navigation';

/**
 * UX-7.5 — Review Recommendations doctrine tests.
 *
 * Recommendations are GUIDANCE ONLY — they never approve, reject, request
 * corrections or trigger workflows. These tests verify generation, confidence,
 * similar decisions, distribution, insights, queue visibility, and detail
 * rendering, and that review workflows remain unchanged.
 */

test.beforeEach(async ({ page }) => {
  await clearBrowserState(page);
});

test('REV-REC-01 CEO review page shows the recommendation distribution panel', async ({ page }) => {
  await loginAsCEO(page);
  await openReviewCenter(page);
  await expect(page.getByTestId('review-recommendation-panel')).toBeVisible();
  await expect(page.getByTestId('recommendation-distribution')).toBeVisible();
});

test('REV-REC-02 Distribution dashboard lists all four recommendation types', async ({ page }) => {
  await loginAsCEO(page);
  await openReviewCenter(page);
  for (const t of [
    'likely-approve',
    'likely-reject',
    'likely-correction',
    'requires-human-review',
  ]) {
    await expect(page.getByTestId(`recommendation-dist-${t}`)).toBeVisible();
  }
});

test('REV-REC-03 Recommendation insights are generated', async ({ page }) => {
  await loginAsCEO(page);
  await openReviewCenter(page);
  const insights = page.getByTestId('recommendation-insights');
  await expect(insights).toBeVisible();
  await expect(insights.getByTestId('recommendation-insight').first()).toBeVisible();
});

test('REV-REC-04 Executive guidance feed renders', async ({ page }) => {
  await loginAsCEO(page);
  await openReviewCenter(page);
  const guidance = page.getByTestId('recommendation-guidance');
  await expect(guidance).toBeVisible();
  await expect(
    guidance.getByTestId('recommendation-guidance-item').first()
  ).toBeVisible();
});

test('REV-REC-05 Priority queue surfaces recommendation badges', async ({ page }) => {
  await loginAsCEO(page);
  await openReviewCenter(page);
  const queue = page.getByTestId('review-priority-queue');
  await expect(
    queue.locator('[data-testid^="recommendation-badge-"]').first()
  ).toBeVisible();
});

test('REV-REC-06 Review detail shows recommendation, confidence and rationale', async ({ page }) => {
  await loginAsCEO(page);
  await openReviewCenter(page);
  await page.getByRole('button', { name: /Review Items/i }).first().click();
  const panel = page.getByTestId('review-recommendation-detail');
  await expect(panel).toBeVisible();
  await expect(
    panel.locator('[data-testid^="recommendation-badge-"]').first()
  ).toBeVisible();
  await expect(
    panel.locator('[data-testid^="confidence-badge-"]').first()
  ).toBeVisible();
  await expect(panel.getByTestId('recommendation-reason').first()).toBeVisible();
});

test('REV-REC-07 Review detail shows similar historical decisions', async ({ page }) => {
  await loginAsCEO(page);
  await openReviewCenter(page);
  await page.getByRole('button', { name: /Review Items/i }).first().click();
  const similar = page.getByTestId('recommendation-similar').first();
  await expect(similar).toBeVisible();
  await expect(similar).toContainText(/similar reviews/i);
  await expect(similar).toContainText(/Approval rate/i);
});

test('REV-REC-08 Recommendation panels expose no approval controls', async ({ page }) => {
  await loginAsCEO(page);
  await openReviewCenter(page);
  // Page-level panel: guidance only, no action buttons.
  await expect(
    page.getByTestId('review-recommendation-panel').getByRole('button', {
      name: /approve|reject|correct/i,
    })
  ).toHaveCount(0);
  // Detail-level panel: guidance only.
  await page.getByRole('button', { name: /Review Items/i }).first().click();
  await expect(
    page.getByTestId('review-recommendation-detail').getByRole('button', {
      name: /approve|reject|correct/i,
    })
  ).toHaveCount(0);
});

test('REV-REC-09 Existing approval controls remain unchanged', async ({ page }) => {
  await loginAsCEO(page);
  await openReviewCenter(page);
  await page.getByRole('button', { name: /Review Items/i }).first().click();
  await expect(page.getByRole('button', { name: /^Approve$/i }).first()).toBeVisible();
  await expect(page.getByRole('button', { name: /^Reject$/i }).first()).toBeVisible();
});

test('REV-REC-10 Confidence badges render in the detail recommendations', async ({ page }) => {
  await loginAsCEO(page);
  await openReviewCenter(page);
  await page.getByRole('button', { name: /Review Items/i }).first().click();
  const confidenceBadges = page
    .getByTestId('review-recommendation-detail')
    .locator('[data-testid^="confidence-badge-"]');
  await expect(confidenceBadges.first()).toBeVisible();
});
