import { test, expect } from '@playwright/test';
import { loginAsCEO, loginAsPM } from '../helpers/login';
import { clearBrowserState } from '../helpers/state';
import { openReviewCenter } from '../helpers/navigation';

/**
 * UX-7.7 — Executive Review Briefing doctrine tests.
 *
 * The briefing CONSOLIDATES intelligence; it never decides, approves, rejects
 * or corrects. These tests verify the briefing dashboard, attention feed,
 * exposure/decision/recommendation roll-ups, weekly summary, readiness
 * indicators and strategic insights render, and that workflows are unchanged.
 */

test.beforeEach(async ({ page }) => {
  await clearBrowserState(page);
});

test('REV-BR-01 CEO review page shows the executive briefing first', async ({ page }) => {
  await loginAsCEO(page);
  await openReviewCenter(page);
  await expect(page.getByTestId('review-executive-briefing')).toBeVisible();
});

test('REV-BR-02 Readiness indicators cover all four areas', async ({ page }) => {
  await loginAsCEO(page);
  await openReviewCenter(page);
  await expect(page.getByTestId('briefing-readiness')).toBeVisible();
  for (const a of [
    'approval-readiness',
    'financial-readiness',
    'operational-readiness',
    'review-operations-readiness',
  ]) {
    await expect(page.getByTestId(`readiness-${a}`)).toBeVisible();
  }
});

test('REV-BR-03 Daily review briefing card renders dynamic lines', async ({ page }) => {
  await loginAsCEO(page);
  await openReviewCenter(page);
  const daily = page.getByTestId('briefing-daily');
  await expect(daily).toBeVisible();
  await expect(daily.getByTestId('briefing-daily-line').first()).toBeVisible();
  await expect(daily).toContainText(/pending approval/i);
});

test('REV-BR-04 Approval / financial / operational health strips render', async ({ page }) => {
  await loginAsCEO(page);
  await openReviewCenter(page);
  await expect(page.getByTestId('briefing-approval-health')).toBeVisible();
  await expect(page.getByTestId('briefing-financial-health')).toBeVisible();
  await expect(page.getByTestId('briefing-operational-health')).toBeVisible();
  await expect(page.getByTestId('bf-total')).toBeVisible();
  await expect(page.getByTestId('bo-health')).toBeVisible();
});

test('REV-BR-05 Executive attention feed renders ranked items', async ({ page }) => {
  await loginAsCEO(page);
  await openReviewCenter(page);
  const feed = page.getByTestId('briefing-attention-feed');
  await expect(feed).toBeVisible();
  await expect(feed.locator('[data-testid^="briefing-attention-"]').first()).toBeVisible();
});

test('REV-BR-06 Financial exposure + decision roll-up render', async ({ page }) => {
  await loginAsCEO(page);
  await openReviewCenter(page);
  await expect(page.getByTestId('briefing-exposure-summary')).toBeVisible();
  await expect(page.getByTestId('briefing-decision-rollup')).toBeVisible();
});

test('REV-BR-07 Bottleneck + recommendation roll-ups render', async ({ page }) => {
  await loginAsCEO(page);
  await openReviewCenter(page);
  await expect(page.getByTestId('briefing-bottlenecks')).toBeVisible();
  await expect(page.getByTestId('briefing-recommendation-rollup')).toBeVisible();
});

test('REV-BR-08 Weekly review summary renders', async ({ page }) => {
  await loginAsCEO(page);
  await openReviewCenter(page);
  const weekly = page.getByTestId('briefing-weekly-summary');
  await expect(weekly).toBeVisible();
  await expect(page.getByTestId('ws-processed')).toBeVisible();
  await expect(page.getByTestId('ws-sla')).toBeVisible();
});

test('REV-BR-09 Strategic insights render', async ({ page }) => {
  await loginAsCEO(page);
  await openReviewCenter(page);
  const insights = page.getByTestId('briefing-strategic-insights');
  await expect(insights).toBeVisible();
  await expect(insights.getByTestId('briefing-insight').first()).toBeVisible();
});

test('REV-BR-10 Briefing is read-only and PM-excluded; workflows intact', async ({ page }) => {
  await loginAsCEO(page);
  await openReviewCenter(page);
  // Doctrine: consolidation only — no approval controls in the briefing.
  await expect(
    page.getByTestId('review-executive-briefing').getByRole('button', {
      name: /approve|reject|correct/i,
    })
  ).toHaveCount(0);
  // Existing workflow still reachable.
  await page.getByRole('button', { name: /Review Items/i }).first().click();
  await expect(page.getByRole('button', { name: /^Approve$/i }).first()).toBeVisible();

  // PMs do not see the CEO briefing.
  await clearBrowserState(page);
  await loginAsPM(page);
  await openReviewCenter(page);
  await expect(page.getByTestId('review-executive-briefing')).toHaveCount(0);
});
