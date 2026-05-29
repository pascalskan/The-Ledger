import { Page } from '@playwright/test';

export async function signOut(page: Page) {
  const profileButton = page.getByRole('button', { name: /Profile/i });
  if (await profileButton.isVisible()) {
    await profileButton.click();
  }
  await page.getByRole('button', { name: /Sign Out/i }).click();
}