import { test, expect } from '@playwright/test';
import { loginAsWorker, loginAsCEO } from '../helpers/login';
import { signOut } from '../helpers/signOut';
import { submitBasicReport } from '../helpers/worker';
import { openReviewCenter } from '../helpers/navigation';
import { approveFirstPendingReview } from '../helpers/review';

test('Worker report can be approved by CEO', async ({ page }) => {
  // Worker submits report
  await loginAsWorker(page);
  await submitBasicReport(page, 'Playwright approval pipeline test');
  await signOut(page);

  // CEO approves report
  await loginAsCEO(page);
  await openReviewCenter(page);
  
  // Verify there is at least one pending item before approving
  await expect(page.locator('body')).toContainText(/pending/i);

  await approveFirstPendingReview(page);

  // Verify approval succeeded by checking the report text is gone
  await expect(page.locator('body')).not.toContainText(
    'Playwright approval pipeline test'
  );
});
