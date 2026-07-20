/**
 * DOCTRINE TEST: Job Financial Summary
 *
 * The Ledger doctrine requires every Job to act as a mini-ledger.
 * getJobFinancialSummary() computes revenue, cost, profit, and margin
 * from the approved normalized financial records.
 *
 * Phase 4.4 introduced the JobFinancialSummarySection component.
 * Phase 4.5 wired all four revenue streams.
 * Phase 5.2 seed data pre-populates dj-kitchen-extract-1 with financial records.
 *
 * Note: the "Kitchen extraction" job has Completed status and is hidden by the
 * default job list filter. The test enables "Show Completed" before navigating.
 */
import { test, expect } from '@playwright/test';
import { openJobs } from '../helpers/navigation';
import { loginAsCEO } from '../helpers/login';
import { clearBrowserState } from '../helpers/state';

test.beforeEach(async ({ page }) => {
  await clearBrowserState(page);
});

test('Job financial summary displays revenue, cost, profit and margin for seeded job', async ({ page }) => {
  await loginAsCEO(page);

  // Navigate to Jobs. UX-8 moved it behind the Operations Hub, so the helper
  // walks Operations -> Jobs tab rather than clicking a top-level nav link.
  await openJobs(page);

  // The kitchen job is "Completed" — reveal it via the show-completed toggle
  await page.locator('text=Show Completed').click();
  await page.waitForTimeout(300);

  // Click the seeded job title (dj-kitchen-extract-1 = "Kitchen extraction & ventilation install")
  await page.locator('text=Kitchen extraction').first().click();
  await expect(page).toHaveURL(/jobs\//i);

  // Phase 4.5 seed data populates financial records at module load — all four
  // dimensions must be visible in the Job Financial Summary section
  await expect(page.locator('body')).toContainText(/Revenue/i);
  await expect(page.locator('body')).toContainText(/Cost/i);
  await expect(page.locator('body')).toContainText(/Profit/i);
  await expect(page.locator('body')).toContainText(/margin/i);
});

test('Job financial summary section renders for active job without errors', async ({ page }) => {
  await loginAsCEO(page);

  // Navigate to the active job (DEMO-JOB-0202 / Preventative maintenance visit)
  await openJobs(page);

  // DEMO-JOB-0202 is Active — visible in default filter
  await page.locator('text=Preventative maintenance').first().click();
  await expect(page).toHaveURL(/jobs\//i);

  // The JobFinancialSummarySection must render without a runtime error
  // (shows empty-state when no approved activity)
  await expect(page.locator('body')).not.toContainText(/Error|Uncaught|TypeError/i);
});
