import { Page } from '@playwright/test';

// ──────────────────────────────────────────────────────────────
// AUTH PERSISTENCE KEY
// Must match the constant in mockData.ts so that the app reads
// the email back on module initialisation after a hard reload.
// ──────────────────────────────────────────────────────────────
const AUTH_STORAGE_KEY = 'ledger-auth-email';

// Hard-navigating logins (use for the FIRST login in a test only)
// These call page.goto() which reloads the app and resets the in-memory store.
// The auth page uses an 800ms setTimeout before calling login() and redirecting —
// waitForURL ensures the navigation has completed before the helper returns.
//
// After the redirect we also persist the email to localStorage so that any
// subsequent page.goto() (which causes another full reload) restores auth
// instead of bouncing the user back to /auth.
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
  // Persist auth so the next page.goto() reload restores the session
  await page.evaluate((key) => localStorage.setItem(key, 'demo.ceo@example.com'), AUTH_STORAGE_KEY);
}

export async function loginAsPM(page: Page) {
  await page.goto('/auth');
  await page.getByRole('button', { name: /Demo PM/i }).click();
  await page.getByRole('button', { name: /Sign in/i }).click();
  await page.waitForURL(url => !url.toString().includes('/auth'), { timeout: 10000 });
  await page.evaluate((key) => localStorage.setItem(key, 'demo.pm@example.com'), AUTH_STORAGE_KEY);
}

export async function loginAsWorker(page: Page) {
  await page.goto('/auth');
  await page.getByRole('button', { name: /Demo Worker/i }).click();
  await page.getByRole('button', { name: /Sign in/i }).click();
  // Worker redirects / → /worker/jobs — wait for final worker URL
  await page.waitForURL(/worker/, { timeout: 10000 });
  await page.evaluate((key) => localStorage.setItem(key, 'demo.worker@example.com'), AUTH_STORAGE_KEY);
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
  await page.evaluate((key) => localStorage.setItem(key, 'demo.ceo@example.com'), AUTH_STORAGE_KEY);
}

export async function softLoginAsPM(page: Page) {
  await page.getByRole('button', { name: /Demo PM/i }).click();
  await page.getByRole('button', { name: /Sign in/i }).click();
  await page.waitForURL(url => !url.toString().includes('/auth'), { timeout: 10000 });
  await page.evaluate((key) => localStorage.setItem(key, 'demo.pm@example.com'), AUTH_STORAGE_KEY);
}

export async function softLoginAsWorker(page: Page) {
  await page.getByRole('button', { name: /Demo Worker/i }).click();
  await page.getByRole('button', { name: /Sign in/i }).click();
  await page.waitForURL(/worker/, { timeout: 10000 });
  await page.evaluate((key) => localStorage.setItem(key, 'demo.worker@example.com'), AUTH_STORAGE_KEY);
}
