import { Page } from '@playwright/test';

/**
 * Signs the current user out regardless of which layout is active.
 *
 * Three layouts exist:
 *   - Worker mobile layout: has a bottom-nav "Profile" button that navigates
 *     to /worker/profile, where a "Sign Out" button (data-testid="btn-sign-out")
 *     is visible in the page body.
 *   - CEO / PM sidebar layout (expanded): Sign Out button is in the sidebar footer.
 *   - CEO / PM sidebar layout (collapsed): Sign Out button renders icon-only;
 *     data-testid="btn-sign-out" still targets it.
 *
 * Strategy:
 *   1. Detect the Worker mobile layout by checking whether the bottom-nav
 *      Profile button exists in the DOM.
 *   2. If Worker layout: navigate to /worker/profile via Wouter (no full reload,
 *      so in-memory store state is preserved), wait for the page to settle, then
 *      click the profile page's sign-out button directly by URL-scoped locator.
 *   3. If CEO/PM layout: target btn-sign-out in the sidebar directly.
 *   4. Wait for /auth URL to confirm sign-out completed.
 */
export async function signOut(page: Page) {
  // Detect worker layout by presence of the bottom-nav Profile button text.
  const profileNavButton = page.locator('nav button', { hasText: /^Profile$/i });
  const isWorkerLayout = (await profileNavButton.count()) > 0;

  if (isWorkerLayout) {
    // Navigate client-side to /worker/profile without a full page reload.
    // Wouter responds to popstate events — this keeps the in-memory store alive.
    await page.evaluate(() => {
      window.history.pushState({}, '', '/worker/profile');
      window.dispatchEvent(new PopStateEvent('popstate', { state: {} }));
    });

    // Wait for the profile page heading to confirm navigation completed.
    await page.waitForFunction(
      () => window.location.pathname === '/worker/profile',
      { timeout: 5000 }
    );

    // The profile page's btn-sign-out is a plain <button> visible in the page body.
    // Use a small wait for React to render the new route.
    await page.waitForTimeout(300);
    const signOutButton = page.getByTestId('btn-sign-out').last();
    await signOutButton.waitFor({ state: 'visible', timeout: 5000 });
    await signOutButton.click();
  } else {
    // CEO / PM: btn-sign-out is in the always-rendered sidebar (not inside a closed Sheet).
    const signOutButton = page.getByTestId('btn-sign-out').first();
    await signOutButton.scrollIntoViewIfNeeded();
    await signOutButton.click({ force: true });
  }

  // Wait for the auth page to be active before returning.
  await page.waitForURL('**/auth', { timeout: 10000 });
}
