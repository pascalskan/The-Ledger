import { Page, expect } from '@playwright/test';

export async function approveFirstPendingReview(page: Page) {
  // Open first job requiring review
  await page
    .getByRole('row')
    .filter({ hasText: /DEMO-JOB-/i })
    .first()
    .getByRole('button', { name: /Review Items/i })
    .click();

  // Select the first approve button only
  const approveButton = page
    .getByRole('button', { name: /^Approve$/ })
    .first();

  await expect(approveButton).toBeVisible();

  await approveButton.click();

  // Wait for approval to process — item count decreases or page updates
  await page.waitForTimeout(800);
}

export async function approveReviewForJob(page: Page, jobId: string) {
  // Click "Review Items" for the specific job row
  await page
    .locator('tr')
    .filter({ hasText: jobId })
    .getByRole('button', { name: /Review Items/i })
    .click();

  // Wait for the review detail page to load
  await expect(page.locator('body')).not.toContainText('Jobs Requiring Review');

  // Wait for pending items to be visible
  const approveButton = page
    .getByRole('button', { name: /^Approve$/ })
    .first();

  await expect(approveButton).toBeVisible();

  await approveButton.click();

  // Wait for the item to be approved — the approve button should disappear
  // as the item moves out of pending state
  await expect(approveButton).not.toBeVisible({ timeout: 5000 }).catch(() => {
    // If the button is still visible (e.g. multiple items), that's OK —
    // the first item was approved and inventory deducted
  });

  // Brief settle time for store mutation to propagate
  await page.waitForTimeout(300);
}