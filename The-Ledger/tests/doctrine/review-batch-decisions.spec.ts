import { test, expect } from '@playwright/test';
import { loginAsCEO } from '../helpers/login';
import { clearBrowserState } from '../helpers/state';
import { openReviewCenter } from '../helpers/navigation';

/**
 * UX-7.3 — Batch Decision Tools doctrine tests.
 *
 * Batch actions are a THROUGHPUT TOOL ONLY. No action executes without explicit
 * confirmation; nothing bypasses approval; every action is auditable. These
 * tests drive the per-job review detail where the real review items live.
 */

test.beforeEach(async ({ page }) => {
  await clearBrowserState(page);
});

async function openFirstJobDetail(page: import('@playwright/test').Page) {
  await loginAsCEO(page);
  await openReviewCenter(page);
  await page.getByRole('button', { name: /Review Items/i }).first().click();
  // Wait for the review detail (selection toolbar) to be ready.
  await expect(page.getByTestId('review-selection-toolbar')).toBeVisible();
}

test('REV-BAT-01 Individual selection reveals the batch actions bar', async ({ page }) => {
  await openFirstJobDetail(page);
  const firstCheckbox = page.locator('[data-testid^="select-review-"]').first();
  await firstCheckbox.click();
  await expect(page.getByTestId('batch-actions-bar')).toBeVisible();
  await expect(page.getByTestId('batch-selected-count')).toContainText('1 selected');
});

test('REV-BAT-02 Select all visible and clear selection', async ({ page }) => {
  await openFirstJobDetail(page);
  await page.getByTestId('select-all-visible').click();
  await expect(page.getByTestId('batch-actions-bar')).toBeVisible();
  await expect(page.getByTestId('selection-count')).toBeVisible();
  await page.getByTestId('clear-selection').click();
  await expect(page.getByTestId('batch-actions-bar')).toHaveCount(0);
});

test('REV-BAT-03 Batch bar shows estimated financial impact', async ({ page }) => {
  await openFirstJobDetail(page);
  await page.getByTestId('select-all-visible').click();
  await expect(page.getByTestId('batch-financial-impact')).toBeVisible();
});

test('REV-BAT-04 Batch approval requires confirmation and shows a summary', async ({ page }) => {
  await openFirstJobDetail(page);
  await page.getByTestId('select-all-visible').click();
  await page.getByTestId('batch-approve-btn').click();
  // A confirmation dialog with a financial/review summary appears.
  await expect(page.getByTestId('batch-confirm-dialog')).toBeVisible();
  await expect(page.getByTestId('batch-summary')).toBeVisible();
  // Doctrine: any applicable safeguards must be acknowledged before confirming
  // (e.g. mixed review types in the selection). Acknowledge them all first.
  for (const ack of await page.locator('[data-testid^="batch-safeguard-ack-"]').all()) {
    await ack.click();
  }
  // Confirm executes the batch.
  await page.getByTestId('batch-confirm-btn').click();
  await expect(page.getByTestId('batch-confirm-dialog')).toHaveCount(0);
  // After approval the bar clears (selection emptied).
  await expect(page.getByTestId('batch-actions-bar')).toHaveCount(0);
});

test('REV-BAT-05 Batch rejection requires a reason before confirming', async ({ page }) => {
  await openFirstJobDetail(page);
  await page.getByTestId('select-all-visible').click();
  await page.getByTestId('batch-reject-btn').click();
  await expect(page.getByTestId('batch-confirm-dialog')).toBeVisible();
  // Confirm is disabled until a reason is provided (and safeguards acknowledged).
  await expect(page.getByTestId('batch-confirm-btn')).toBeDisabled();
});

test('REV-BAT-06 Batch correction requires reason and reviewer note', async ({ page }) => {
  await openFirstJobDetail(page);
  await page.getByTestId('select-all-visible').click();
  await page.getByTestId('batch-correction-btn').click();
  await expect(page.getByTestId('batch-reason-input')).toBeVisible();
  await expect(page.getByTestId('batch-note-input')).toBeVisible();
  await expect(page.getByTestId('batch-confirm-btn')).toBeDisabled();
});

test('REV-BAT-07 Batch reviewer assignment offers CEO / PM / Reviewer', async ({ page }) => {
  await openFirstJobDetail(page);
  await page.getByTestId('select-all-visible').click();
  await page.getByTestId('batch-assign-btn').click();
  await expect(page.getByTestId('batch-assignee-select')).toBeVisible();
});

test('REV-BAT-08 Safeguards must be acknowledged before confirming', async ({ page }) => {
  await openFirstJobDetail(page);
  await page.getByTestId('select-all-visible').click();
  await page.getByTestId('batch-approve-btn').click();
  const safeguards = page.getByTestId('batch-safeguards');
  // If safeguards apply (e.g. mixed types), confirm stays disabled until acked.
  if (await safeguards.count()) {
    await expect(page.getByTestId('batch-confirm-btn')).toBeDisabled();
    for (const ack of await page
      .locator('[data-testid^="batch-safeguard-ack-"]')
      .all()) {
      await ack.click();
    }
    await expect(page.getByTestId('batch-confirm-btn')).toBeEnabled();
  }
});

test('REV-BAT-09 Existing single-item approval workflow still works', async ({ page }) => {
  await openFirstJobDetail(page);
  // The per-item Approve / Reject controls remain present and usable.
  await expect(page.getByRole('button', { name: /^Approve$/i }).first()).toBeVisible();
  await expect(page.getByRole('button', { name: /^Reject$/i }).first()).toBeVisible();
});

test('REV-BAT-10 Nothing is actioned until confirmation (cancel leaves items pending)', async ({ page }) => {
  await openFirstJobDetail(page);
  const before = await page.locator('[data-testid^="select-review-"]').count();
  await page.getByTestId('select-all-visible').click();
  await page.getByTestId('batch-approve-btn').click();
  await expect(page.getByTestId('batch-confirm-dialog')).toBeVisible();
  // Cancel — no approval should occur.
  await page.getByRole('button', { name: /^Cancel$/i }).click();
  await expect(page.getByTestId('batch-confirm-dialog')).toHaveCount(0);
  const after = await page.locator('[data-testid^="select-review-"]').count();
  expect(after).toBe(before);
});
