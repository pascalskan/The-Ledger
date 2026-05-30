import { Page } from '@playwright/test';

// Hard-navigating logins (use for the FIRST login in a test only)
// These call page.goto() which reloads the app and resets the in-memory store.
// The auth page uses an 800ms setTimeout before calling login() and redirecting —
// waitForURL ensures the navigation has completed before the helper returns.
//
// URL patterns:
//   CEO/PM → /   (dashboard)
//   Worker  → /  →  /worker/jobs  (brief stop at / before redirect)
//   Using /auth negation pattern to wait for any post-auth page.
export async function loginAsCEO(page: Page) {
  await page.goto('/auth');
  await page.getByRole('button', { name: /Demo CEO/i }).click();
  await page.getByRole('button', { name: /Sign in/i }).click();
  // Wait until we're no longer on /auth (login completed)
  await page.waitForURL(url => !url.toString().includes('/auth'), { timeout: 10000 });
}

export async function loginAsPM(page: Page) {
  await page.goto('/auth');
  await page.getByRole('button', { name: /Demo PM/i }).click();
  await page.getByRole('button', { name: /Sign in/i }).click();
  await page.waitForURL(url => !url.toString().includes('/auth'), { timeout: 10000 });
}

export async function loginAsWorker(page: Page) {
  await page.goto('/auth');
  await page.getByRole('button', { name: /Demo Worker/i }).click();
  await page.getByRole('button', { name: /Sign in/i }).click();
  // Worker redirects / → /worker/jobs — wait for final worker URL
  await page.waitForURL(/worker/, { timeout: 10000 });
}

// Soft logins — navigate to /auth via the UI after sign-out (no page.goto).
// The app routes to /auth without a full reload, preserving in-memory store state.
// Use these for any login AFTER the first one in a multi-user test.
// waitForURL is still required because auth.tsx has an 800ms setTimeout before
// calling login() and redirecting — without the wait, the next action races the timer.
export async function softLoginAsCEO(page: Page) {
  await page.getByRole('button', { name: /Demo CEO/i }).click();
  await page.getByRole('button', { name: /Sign in/i }).click();
  await page.waitForURL(url => !url.toString().includes('/auth'), { timeout: 10000 });
}

export async function softLoginAsPM(page: Page) {
  await page.getByRole('button', { name: /Demo PM/i }).click();
  await page.getByRole('button', { name: /Sign in/i }).click();
  await page.waitForURL(url => !url.toString().includes('/auth'), { timeout: 10000 });
}

export async function softLoginAsWorker(page: Page) {
  await page.getByRole('button', { name: /Demo Worker/i }).click();
  await page.getByRole('button', { name: /Sign in/i }).click();
  await page.waitForURL(/worker/, { timeout: 10000 });
}
