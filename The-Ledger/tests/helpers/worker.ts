import { Page } from '@playwright/test';

export async function submitBasicReport(page: Page, description: string = 'Basic report', jobText?: string) {
  if (jobText) {
    await page.locator('.space-y-4 > div', { hasText: jobText }).getByRole('button', { name: /Open Job/i }).click();
  } else {
    await page.getByRole('button', { name: /Open Job/i }).first().click();
  }
  await page.getByRole('button', { name: /Submit Report/i }).click();
  await page.getByRole('textbox', { name: /Describe the work completed/i }).fill(description);
  await page.getByRole('button', { name: /Save/i }).click();
}