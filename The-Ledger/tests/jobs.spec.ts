import { test, expect } from '@playwright/test';
import { loginAsCEO } from './helpers/login';
import { openJobs } from './helpers/navigation';

test('CEO can access jobs page', async ({ page }) => {
  await loginAsCEO(page);
  await openJobs(page);

  await expect(page).toHaveURL(/jobs/i);
});