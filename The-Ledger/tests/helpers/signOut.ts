import { Page } from '@playwright/test';

/**
 * Signs the current user out regardless of which layout is active.
 *
 * Two layouts exist:
 *   - Worker mobile layout: has a "Profile" bottom-nav button that navigates
 *     to /worker/profile, where a "Sign Out" button is visible in the page body.
 *   - CEO / PM sidebar layout: has a "Sign Out" button at the bottom of the
 *     sidebar (may be outside the overflow-clipped viewport at default heights).
 *
 * Strategy:
 *   1. If a "Profile" bottom-nav button is visible, click it to reach the
 *      profile page where Sign Out is clearly in the viewport.
 *   2. Scroll the Sign Out button into view, then force-click it.
 *      { force: true } bypasses Playwright's actionability checks for viewport
 *      clipping — the button IS rendered and interactive, it just sits below
 *      the visible scroll area of the sidebar container in some viewport sizes.
 *   3. Wait for /auth URL to confirm navigation is complete before returning.
 *      This is critical — soft-login helpers assume the page is on /auth when
 *      they run. Without this wait, the next click() races the route transition.
 */
export async function signOut(page: Page) {
  // Worker layout: Profile tab navigates to profile page where Sign Out is visible
  const profileButton = page.getByRole('button', { name: /^Profile$/i });
  if (await profileButton.isVisible()) {
    await profileButton.click();
  }

  // Scroll Sign Out into view before clicking (handles sidebar layout where the
  // button can sit below the visible viewport at default 720px height).
  // Use { force: true } to bypass viewport-clipping actionability checks —
  // the button is rendered and interactive even when clipped by the sidebar
  // overflow container.
  const signOutButton = page.getByRole('button', { name: /Sign Out/i }).first();
  await signOutButton.scrollIntoViewIfNeeded();
  await signOutButton.click({ force: true });

  // Wait for the auth page to be active before returning.
  // The logout handler calls setLocation("/auth") synchronously after logout(),
  // but the React re-render and URL update are asynchronous. Without this wait,
  // the subsequent softLogin* helper may attempt to click "Demo CEO/Worker/PM"
  // before the auth page has rendered.
  await page.waitForURL('**/auth', { timeout: 10000 });
}
