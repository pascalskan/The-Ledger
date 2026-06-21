import { test, expect } from '@playwright/test';
import { loginAsCEO, loginAsPM, loginAsWorker } from '../helpers/login';
import { clearBrowserState } from '../helpers/state';
import { openReviewCenter, openReviewHubTab } from '../helpers/navigation';

/**
 * UX-7.8 — Review Operations Centre (polish & cohesion) doctrine tests.
 *
 * Verifies the unified tabbed executive experience, the always-visible live
 * queue, RBAC, and that nothing bypasses the approval workflow.
 */

test.beforeEach(async ({ page }) => {
  await clearBrowserState(page);
});

test('ROC-01 CEO sees the Review Operations Centre with all five tabs', async ({ page }) => {
  await loginAsCEO(page);
  await openReviewCenter(page);
  await expect(page.getByTestId('review-hub-tabs')).toBeVisible();
  for (const t of ['briefing', 'dashboard', 'prioritisation', 'recommendations', 'analytics']) {
    await expect(page.getByTestId(`review-hub-tab-${t}`)).toBeVisible();
  }
});

test('ROC-02 Briefing is the default (executive-first) tab', async ({ page }) => {
  await loginAsCEO(page);
  await openReviewCenter(page);
  await expect(page.getByTestId('review-executive-briefing')).toBeVisible();
});

test('ROC-03 Tabs switch between the intelligence layers', async ({ page }) => {
  await loginAsCEO(page);
  await openReviewCenter(page);

  await openReviewHubTab(page, 'dashboard');
  await expect(page.getByTestId('review-executive-dashboard')).toBeVisible();

  await openReviewHubTab(page, 'prioritisation');
  await expect(page.getByTestId('review-priority-panel')).toBeVisible();

  await openReviewHubTab(page, 'recommendations');
  await expect(page.getByTestId('review-recommendation-panel')).toBeVisible();

  await openReviewHubTab(page, 'analytics');
  await expect(page.getByTestId('review-analytics-dashboard')).toBeVisible();
});

test('ROC-04 The live review queue is always visible below the hub', async ({ page }) => {
  await loginAsCEO(page);
  await openReviewCenter(page);
  // Queue present on the default tab...
  await expect(page.getByText('Jobs Requiring Review')).toBeVisible();
  // ...and still present after switching tabs.
  await openReviewHubTab(page, 'analytics');
  await expect(page.getByText('Jobs Requiring Review')).toBeVisible();
});

test('ROC-05 PMs get the scoped queue but not the executive hub', async ({ page }) => {
  await loginAsPM(page);
  await openReviewCenter(page);
  await expect(page.getByTestId('pm-review-page')).toBeVisible();
  await expect(page.getByTestId('review-hub-tabs')).toHaveCount(0);
});

test('ROC-06 Approval workflow is reachable and unchanged from the queue', async ({ page }) => {
  await loginAsCEO(page);
  await openReviewCenter(page);
  await page.getByRole('button', { name: /Review Items/i }).first().click();
  await expect(page.getByRole('button', { name: /^Approve$/i }).first()).toBeVisible();
  await expect(page.getByRole('button', { name: /^Reject$/i }).first()).toBeVisible();
});

test('ROC-07 Worker review pipeline still surfaces pending work to the CEO', async ({ page }) => {
  // Doctrine: nothing bypasses Review Centre — submissions still flow in.
  await loginAsWorker(page);
  // Worker lands on their jobs; CEO queue continues to function (smoke).
  await clearBrowserState(page);
  await loginAsCEO(page);
  await openReviewCenter(page);
  await expect(page.locator('body')).toContainText(/pending/i);
});
