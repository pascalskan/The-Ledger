import { Page } from '@playwright/test';

/**
 * Signs the current user out regardless of which layout is active.
 *
 * Two layout families exist:
 *   - Worker mobile layout  → URL always starts with /worker/
 *   - CEO / PM sidebar layout → all other URLs
 *
 * Strategy for Worker layout:
 *   Navigate client-side to /worker/profile (preserving in-memory store state),
 *   then click the profile page's data-testid="btn-sign-out" button.
 *
 * Strategy for CEO/PM layout:
 *   Click data-testid="btn-sign-out" directly in the sidebar.
 *   { force: true } bypasses viewport-clipping checks for collapsed sidebar.
 */
export async function signOut(page: Page) {
  const currentUrl = page.url();
  const isWorkerLayout = currentUrl.includes('/worker/');

  if (isWorkerLayout) {
    // Navigate client-side to /worker/profile without a full page reload so
    // the in-memory store state is preserved across role switches.
    await page.evaluate(() => {
      window.history.pushState({}, '', '/worker/profile');
      window.dispatchEvent(new PopStateEvent('popstate', { state: {} }));
    });

    await page.waitForFunction(
      () => window.location.pathname === '/worker/profile',
      { timeout: 5000 }
    );

    // Small pause for React to render the new route component.
    await page.waitForTimeout(300);

    // The profile page's sign-out button is the last btn-sign-out in the DOM
    // (the sidebar Sheet btn-sign-out appears earlier but is inside a closed drawer).
    const signOutButton = page.getByTestId('btn-sign-out').last();
    await signOutButton.waitFor({ state: 'visible', timeout: 5000 });
    await signOutButton.click();
  } else {
    // CEO / PM sidebar: btn-sign-out is always rendered in the sidebar footer.
    // { force: true } bypasses viewport-clipping when the sidebar is collapsed.
    const signOutButton = page.getByTestId('btn-sign-out').first();
    await signOutButton.scrollIntoViewIfNeeded();
    await signOutButton.click({ force: true });
  }

  await page.waitForURL('**/auth', { timeout: 10000 });
}
