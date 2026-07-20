import { test, expect } from '@playwright/test';
import { loginAsCEO } from './helpers/login';
import { openJobs } from './helpers/navigation';

test('CEO can access jobs page', async ({ page }) => {
  await loginAsCEO(page);
  await openJobs(page);

  // UX-8: Jobs now lives in the Operations Hub, so the URL is /operations.
  // Assert the rendered surface rather than a path that legitimately moved.
  await expect(page.getByTestId('operations-jobs-panel')).toBeVisible();
  await expect(page.getByTestId('page-jobs')).toBeVisible();
});