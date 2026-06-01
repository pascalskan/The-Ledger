import { Page } from '@playwright/test';

/**
 * Signs the current user out regardless of which layout is active.
 *
 * Two layouts exist:
 *   - Worker mobile layout: has a "Profile" bottom-nav button that navigates
 *     to /worker/profile, where a "Sign Out" button is visible in the page body.
 *   - CEO / PM sidebar layout: has a "Sign Out" button at the bottom of the
 *     sidebar. When the sidebar is COLLAPSED the button renders as icon-only
 *     (no visible text), so getByRole(name:/Sign Out/i) fails to resolve it.
 *     We target data-testid="btn-sign-out" instead — a stable, layout-agnostic
 *     selector that works in both expanded and collapsed states.
 *
 * Strategy:
 *   1. If a "Profile" bottom-nav button is visible (Worker mobile layout),
 *      click it to reach the profile page where Sign Out is in the viewport.
 *   2. Target the Sign Out button by data-testid, scroll into view, and
 *      force-click to bypass viewport-clipping actionability checks.
 *   3. Wait for the /auth URL to confirm navigation is complete before
 *      returning — soft-login helpers assume /auth is active when they run.
 */
export async function signOut(page: Page) {
  // Worker layout: Profile tab navigates to profile page where Sign Out is visible
  const profileButton = page.getByRole('button', { name: /^Profile$/i });
  if (await profileButton.isVisible()) {
    await profileButton.click();
  }

  // Target by testid so the selector works whether the sidebar is collapsed
  // (icon-only, no accessible name) or expanded ("Sign Out" text visible).
  // { force: true } bypasses Playwright's viewport-clipping actionability check.
  const signOutButton = page.getByTestId('btn-sign-out').first();
  await signOutButton.scrollIntoViewIfNeeded();
  await signOutButton.click({ force: true });

  // Wait for the auth page to be active before returning.
  await page.waitForURL('**/auth', { timeout: 10000 });
}
