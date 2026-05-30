import { Page } from '@playwright/test';

// Hard-navigating logins (use for the FIRST login in a test only)
// These call page.goto() which reloads the app and resets the in-memory store.
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

// Soft logins — navigate to /auth via the UI after sign-out (no page.goto).
// The app routes to /auth without a full reload, preserving in-memory store state.
// Use these for any login AFTER the first one in a multi-user test.
export async function softLoginAsCEO(page: Page) {
  await page.getByRole('button', { name: /Demo CEO/i }).click();
  await page.getByRole('button', { name: /Sign in/i }).click();
}

export async function softLoginAsPM(page: Page) {
  await page.getByRole('button', { name: /Demo PM/i }).click();
  await page.getByRole('button', { name: /Sign in/i }).click();
}

export async function softLoginAsWorker(page: Page) {
  await page.getByRole('button', { name: /Demo Worker/i }).click();
  await page.getByRole('button', { name: /Sign in/i }).click();
}