import { Page } from '@playwright/test';

/**
 * Signs the current user out regardless of which layout is active.
 *
 * Three layouts exist:
 *   - Worker mobile layout: has a bottom-nav "Profile" button that navigates
 *     to /worker/profile, where a "Sign Out" button (data-testid="btn-sign-out")
 *     is visible in the page body.
 *   - CEO / PM sidebar layout (expanded): Sign Out button is visible in the
 *     sidebar footer area.
 *   - CEO / PM sidebar layout (collapsed): Sign Out button renders icon-only
 *     inside the sidebar; data-testid="btn-sign-out" still targets it.
 *
 * Strategy:
 *   1. Detect the Worker mobile layout by checking whether the bottom-nav
 *      Profile button is present in the DOM (visible or not at current scroll).
 *   2. If detected, use page.evaluate to dispatch a popstate/navigation to
 *      /worker/profile via Wouter — this keeps the in-memory store alive
 *      (no full page reload) and brings the sign-out button into the viewport.
 *   3. Wait for the profile page's btn-sign-out to be visible before clicking.
 *   4. For the CEO/PM layout, target btn-sign-out directly (it lives in the
 *      always-rendered sidebar, not inside a closed Sheet).
 *   5. Wait for /auth URL to confirm navigation completed before returning.
 */
export async function signOut(page: Page) {
  // Detect worker layout: the bottom-nav renders a button with text "Profile".
  // We check the DOM (not just visibility) because on some viewports the nav
  // may be partially off-screen but the button is still attached.
  const profileNavButton = page.locator('nav button', { hasText: /^Profile$/i });
  const isWorkerLayout = (await profileNavButton.count()) > 0;

  if (isWorkerLayout) {
    // Navigate to /worker/profile WITHOUT a full page reload so the
    // in-memory store state is preserved across the role switch.
    // Wouter listens for hashchange / popstate — dispatch a popstate event
    // with the target path to trigger a client-side navigation.
    await page.evaluate(() => {
      window.history.pushState({}, '', '/worker/profile');
      window.dispatchEvent(new PopStateEvent('popstate', { state: {} }));
    });

    // Wait for the profile page's sign-out button to be attached and visible.
    const workerSignOut = page.getByTestId('btn-sign-out').filter({
      // The worker profile button is a plain <button>, NOT the shadcn variant
      // used in the sidebar (which has class "justify-start").
      hasNot: page.locator('.justify-start'),
    });
    await workerSignOut.waitFor({ state: 'visible', timeout: 5000 });
    await workerSignOut.click();
  } else {
    // CEO / PM sidebar layout: btn-sign-out is always in the DOM (sidebar is
    // always rendered at desktop widths, not inside a closed Sheet).
    const signOutButton = page.getByTestId('btn-sign-out').first();
    await signOutButton.scrollIntoViewIfNeeded();
    await signOutButton.click({ force: true });
  }

  // Wait for the auth page to be active before returning.
  await page.waitForURL('**/auth', { timeout: 10000 });
}
