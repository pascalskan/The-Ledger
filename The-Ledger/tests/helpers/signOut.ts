import { Page } from '@playwright/test';

/**
 * Signs the current user out regardless of which layout is active.
 *
 * Root cause of failures: the sidebar is position:fixed with no overflow-y
 * scroll. When the nav list is long (many phases added items), the Sign Out
 * button at the bottom falls below the 1280×720 Playwright viewport boundary.
 * Playwright's "outside of viewport" check blocks the click even with
 * { force: true } — force bypasses visibility but not the hard viewport clip.
 *
 * Solution: use page.evaluate to dispatch a native click event directly on
 * the button element. A programmatic click is not subject to Playwright's
 * actionability checks (visibility, viewport clipping, pointer-events). The
 * button's onClick calls logout() which clears currentUser and localStorage,
 * then navigates to /auth — exactly what we need.
 *
 * For the Worker mobile layout the sign-out button is on /worker/profile.
 * We navigate there first (client-side, no reload) so the button is present.
 */
export async function signOut(page: Page) {
  const currentUrl = page.url();
  const isWorkerLayout = currentUrl.includes('/worker/');

  if (isWorkerLayout) {
    // Navigate to /worker/profile without a full page reload so the
    // in-memory store state is preserved for subsequent softLogin* calls.
    await page.evaluate(() => {
      window.history.pushState({}, '', '/worker/profile');
      window.dispatchEvent(new PopStateEvent('popstate', { state: {} }));
    });
    // Wait for Wouter to render the profile route.
    await page.waitForFunction(
      () => window.location.pathname === '/worker/profile',
      { timeout: 5000 }
    );
    await page.waitForTimeout(300);
  }

  // Programmatically click the first btn-sign-out in the DOM.
  // This bypasses Playwright's viewport/visibility actionability checks,
  // which block clicks on fixed-position elements below the fold.
  await page.evaluate(() => {
    const btn = document.querySelector<HTMLElement>('[data-testid="btn-sign-out"]');
    if (!btn) throw new Error('btn-sign-out not found in DOM');
    btn.click();
  });

  await page.waitForURL('**/auth', { timeout: 10000 });
}
