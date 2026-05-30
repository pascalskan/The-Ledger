import { Page } from '@playwright/test';

export async function openJobs(page: Page) {
  await page.getByRole('link', {
    name: /Jobs/i,
  }).click();
}

export async function openReviewCenter(page: Page) {
  await page
    .locator('a')
    .filter({ hasText: 'Review Center' })
    .nth(1)
    .click();
}

export async function openAuditLog(page: Page) {
  await page
    .locator('a')
    .filter({ hasText: 'Audit Log' })
    .nth(1)
    .click();
}
