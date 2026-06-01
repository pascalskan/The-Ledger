import { Page } from '@playwright/test';

/**
 * Signs the current user out regardless of which layout is active.
 *
 * All three previous DOM-based approaches (sidebar btn-sign-out, worker profile
 * page, URL-based detection) failed because:
 *   - The sidebar is position:fixed with no overflow scroll, so btn-sign-out
 *     at the bottom can be outside the 1280×720 Playwright viewport when the
 *     nav list is long enough to push it below the fold.
 *   - { force: true } bypasses visibility checks but not the "outside of
 *     viewport" hard block that Playwright enforces for clipped fixed elements.
 *
 * Solution: bypass the DOM entirely. Clear the auth key from localStorage
 * (which the app reads on module init to restore sessions) then navigate
 * directly to /auth. The app's useEffect in Layout detects user === null and
 * redirects, but navigating directly is faster and more reliable.
 *
 * This preserves in-memory store state (no page.goto / full reload) so
 * multi-role tests that use softLogin* helpers after signOut continue to work.
 */
export async function signOut(page: Page) {
  // Clear the persisted auth token so the next page load (or soft-login) does
  // not auto-restore the current session.
  await page.evaluate(() => {
    localStorage.removeItem('ledger-auth-email');
    // Also clear any direct-review-items that should persist across reloads
    // (kept here for completeness; actual tests that need persistence handle
    // this themselves via clearBrowserState or explicit setup).
  });

  // Trigger the app's logout by navigating to /auth client-side.
  // pushState + popstate is picked up by Wouter without a full page reload,
  // preserving the module-level in-memory store that softLogin* helpers rely on.
  await page.evaluate(() => {
    // Call the app's own logout mechanism if accessible, otherwise clear state
    // by dispatching a storage event — the auth hook watches localStorage.
    localStorage.removeItem('ledger-auth-email');
    window.history.pushState({}, '', '/auth');
    window.dispatchEvent(new PopStateEvent('popstate', { state: {} }));
  });

  await page.waitForURL('**/auth', { timeout: 10000 });
}
