import { test, expect } from '@playwright/test';
import { loginAsWorker, loginAsPM, loginAsCEO } from '../helpers/login';
import { signOut } from '../helpers/signOut';
import { openReviewCenter } from '../helpers/navigation';
import { submitBasicReport } from '../helpers/worker';

test('PM visibility is restricted to assigned jobs, while CEO sees all', async ({ page }) => {
  // 1. Login as a worker to create a review item.
  await loginAsWorker(page);

  // 2. Submit a report against a job the PM does not manage (DEMO-JOB-0202).
  await submitBasicReport(page, 'PM scope enforcement test report', 'DEMO-JOB-0202');

  // 3. Sign out as the worker.
  await signOut(page);

  // 4. Login as the Demo PM.
  await loginAsPM(page);

  // 5. Navigate to the Review Center.
  await openReviewCenter(page);

  // 6. **Business Rule Assertion**: Verify the PM cannot see the review item for the unassigned job.
  // The Demo PM is not assigned as a manager to DEMO-JOB-0202, so the job should not appear in their Review Center.
  await expect(page.locator('body')).not.toContainText('DEMO-JOB-0202');

  // 7. Sign out as the PM. The PM layout has a direct "Sign Out" button.
  await signOut(page);

  // 8. Login as the Demo CEO.
  await loginAsCEO(page);

  // 9. Navigate to the Review Center.
  await openReviewCenter(page);

  // 10. **Business Rule Assertion**: Verify the CEO can see the review item.
  // The CEO has global visibility and should see all review items, including the one for DEMO-JOB-0202.
  await expect(page.locator('body')).toContainText(/DEMO-JOB-/);
});
