import { Page, expect } from '@playwright/test';

export async function openJobs(page: Page) {
  await page.getByRole('link', {
    name: /Jobs/i,
  }).click();
}

export async function openReviewCenter(page: Page) {
  await page.getByTestId('nav-review').click();
}

// UX-7.8 — the CEO Review Operations Centre unifies the intelligence layers
// into tabs. Open the relevant tab before asserting on its panel.
export type ReviewHubTab =
  | 'briefing'
  | 'dashboard'
  | 'prioritisation'
  | 'recommendations'
  | 'analytics';

export async function openReviewHubTab(page: Page, tab: ReviewHubTab) {
  await page.getByTestId(`review-hub-tab-${tab}`).click();
}

export async function openAuditLog(page: Page) {
  const adminToggle = page.getByTestId('nav-admin-toggle');
  if (await adminToggle.isVisible()) {
    await adminToggle.click();
  }
  await page.getByTestId('nav-audit-log').click();
}

/**
 * Wait for a lazily-loaded route to have actually mounted.
 *
 * E-7 made routes lazy (React.lazy + Suspense). `page.goto` resolves on the
 * load event, which is now BEFORE the route's chunk has been fetched and
 * rendered. Playwright's auto-waiting covers most assertions, but `count()`
 * and `evaluateAll()` deliberately do NOT wait — they report whatever exists
 * at that instant. Tests using them straight after a navigation therefore read
 * zero rows from a page that had not rendered yet.
 *
 * This waits for the page heading, which E-4 guarantees is exactly one <h1>
 * per route. Its presence means the chunk loaded and the page committed.
 *
 * Deliberately not asserting on the counted content itself: several callers
 * legitimately branch on a zero count to check an empty state, and asserting
 * visibility first would defeat that.
 *
 * Not needed before auto-waiting assertions such as expect(...).toBeVisible()
 * or toHaveCount() — only before count()/evaluateAll().
 */
export async function waitForRouteReady(page: Page) {
  await expect(page.locator('h1')).toHaveCount(1, { timeout: 15000 });
}
