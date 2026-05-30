import { Page } from '@playwright/test';

/**
 * Signs the current user out regardless of which layout is active.
 *
 * Two layouts exist:
 *   - Worker mobile layout: has a "Profile" bottom-nav button that navigates
 *     to /worker/profile, where a "Sign Out" button is visible in the page body.
 *   - CEO / PM sidebar layout: has a "Sign Out" button at the bottom of the
 *     sidebar (may require scrollIntoViewIfNeeded if the viewport is short).
 *
 * Strategy:
 *   1. If a "Profile" bottom-nav button is visible, click it to reach the
 *      profile page where Sign Out is clearly in the viewport.
 *   2. Scroll the Sign Out button into view and click it (works for all layouts).
 */
export async function signOut(page: Page) {
  // Worker layout: Profile tab navigates to profile page where Sign Out is visible
  const profileButton = page.getByRole('button', { name: /^Profile$/i });
  if (await profileButton.isVisible()) {
    await profileButton.click();
  }

  // Scroll Sign Out into view before clicking (handles sidebar layout where the
  // button can sit below the visible viewport at default 720px height)
  const signOutButton = page.getByRole('button', { name: /Sign Out/i }).first();
  await signOutButton.scrollIntoViewIfNeeded();
  await signOutButton.click();
}
