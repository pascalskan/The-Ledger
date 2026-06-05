import { Page } from '@playwright/test';

export async function openJobs(page: Page) {
  await page.getByRole('link', {
    name: /Jobs/i,
  }).click();
}

export async function openReviewCenter(page: Page) {
  await page.getByTestId('nav-review').click();
}

export async function openAuditLog(page: Page) {
  const adminToggle = page.getByTestId('nav-admin-toggle');
  if (await adminToggle.isVisible()) {
    await adminToggle.click();
  }
  await page.getByTestId('nav-audit-log').click();
}
