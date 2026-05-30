import { Page } from '@playwright/test';

export async function clearBrowserState(page: Page) {
  await page.goto('http://localhost:5000/auth');

  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
}
