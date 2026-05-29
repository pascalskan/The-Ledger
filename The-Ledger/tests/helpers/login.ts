import { Page } from '@playwright/test';

export async function loginAsCEO(page: Page) {
  await page.goto('/auth');
  await page.getByRole('button', { name: /Demo CEO/i }).click();
  await page.getByRole('button', { name: /Sign in/i }).click();
}

export async function loginAsPM(page: Page) {
  await page.goto('/auth');
  await page.getByRole('button', { name: /Demo PM/i }).click();
  await page.getByRole('button', { name: /Sign in/i }).click();
}

export async function loginAsWorker(page: Page) {
  await page.goto('/auth');
  await page.getByRole('button', { name: /Demo Worker/i }).click();
  await page.getByRole('button', { name: /Sign in/i }).click();
}