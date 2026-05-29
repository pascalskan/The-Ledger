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

  // Wait for page to update
  await page.waitForTimeout(500);
}