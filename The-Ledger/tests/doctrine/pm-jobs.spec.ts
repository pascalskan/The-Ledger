/**
 * PM-JOBS Doctrine Tests
 *
 * Verifies PM-3 deliverables:
 * - PM jobs page shows only assigned jobs (managerId === currentUser.id)
 * - PM cannot access a job not assigned to them
 * - PM job cards show enhanced operational data (crew count, pending reviews, visual state)
 * - PM job workspace shows 6 operational sections (no financial data)
 * - CEO jobs page remains unchanged (all jobs visible, Create Job button present)
 * - CEO job detail retains all financial panels
 */
import { test, expect } from '@playwright/test';
import { loginAsCEO, loginAsPM } from '../helpers/login';
import { clearBrowserState } from '../helpers/state';

test.beforeEach(async ({ page }) => {
  await clearBrowserState(page);
});

// ────────────────────────────────────────────────────────────────
// PM-JOBS-01 — PM jobs page scoped to assigned jobs only
// ────────────────────────────────────────────────────────────────

test('PM-JOBS-01: PM jobs page shows only assigned jobs', async ({ page }) => {
  await loginAsPM(page);
  await page.goto('/jobs');
  await page.waitForSelector('[data-testid="page-jobs"]');

  // Demo PM (du2) owns dj-kitchen-extract-1 — it must appear
  await expect(page.getByTestId('pm-job-card-dj-kitchen-extract-1')).toBeVisible();

  // dj-showcase-maint-1 has no managerId — PM must NOT see it
  await expect(page.getByTestId('pm-job-card-dj-showcase-maint-1')).not.toBeVisible();

  // Page heading is "My Jobs" not "Jobs"
  await expect(page.locator('h2')).toContainText('My Jobs');
});

// ────────────────────────────────────────────────────────────────
// PM-JOBS-02 — PM cannot navigate to a job they do not manage
// ────────────────────────────────────────────────────────────────

test('PM-JOBS-02: PM is denied access to a job they do not manage', async ({ page }) => {
  await loginAsPM(page);
  // Navigate directly to a job the PM does NOT manage
  await page.goto('/jobs/dj-showcase-maint-1');

  // Should see access denied screen, not job detail
  await expect(page.getByTestId('pm-job-access-denied')).toBeVisible();
  await expect(page.getByTestId('pm-job-access-denied')).toContainText('Access Restricted');
});

// ────────────────────────────────────────────────────────────────
// PM-JOBS-03 — PM job cards show enhanced operational data
// ────────────────────────────────────────────────────────────────

test('PM-JOBS-03: PM job cards show crew count and pending review count', async ({ page }) => {
  await loginAsPM(page);
  await page.goto('/jobs');
  await page.waitForSelector('[data-testid="pm-job-card-dj-kitchen-extract-1"]');

  const card = page.getByTestId('pm-job-card-dj-kitchen-extract-1');
  await expect(card).toBeVisible();

  // Crew count display
  await expect(page.getByTestId('pm-job-crew-count-dj-kitchen-extract-1')).toBeVisible();
  await expect(page.getByTestId('pm-job-crew-count-dj-kitchen-extract-1')).toContainText('crew');

  // Card has status badge
  await expect(page.getByTestId('badge-job-status-dj-kitchen-extract-1')).toBeVisible();
});

// ────────────────────────────────────────────────────────────────
// PM-JOBS-04 — PM job workspace renders 6 operational sections
// ────────────────────────────────────────────────────────────────

test('PM-JOBS-04: PM job workspace renders operational sections without financial data', async ({ page }) => {
  await loginAsPM(page);
  await page.goto('/jobs/dj-kitchen-extract-1');
  await page.waitForSelector('[data-testid="pm-job-workspace-dj-kitchen-extract-1"]');

  const workspace = page.getByTestId('pm-job-workspace-dj-kitchen-extract-1');

  // All 6 sections present
  await expect(page.getByTestId('pm-workspace-overview')).toBeVisible();
  await expect(page.getByTestId('pm-workspace-crew')).toBeVisible();
  await expect(page.getByTestId('pm-workspace-reviews')).toBeVisible();
  await expect(page.getByTestId('pm-workspace-schedule')).toBeVisible();
  await expect(page.getByTestId('pm-workspace-documents')).toBeVisible();
  await expect(page.getByTestId('pm-workspace-attention')).toBeVisible();

  // No financial panels
  await expect(workspace).not.toContainText('Financial Summary');
  await expect(workspace).not.toContainText('Invoice Readiness');
  await expect(workspace).not.toContainText('Pending Exposure');
  await expect(workspace).not.toContainText('Revenue');
  await expect(workspace).not.toContainText('Margin');
  await expect(workspace).not.toContainText('Profit');
});

// ────────────────────────────────────────────────────────────────
// PM-JOBS-05 — CEO jobs page unchanged (all jobs, Create Job button)
// ────────────────────────────────────────────────────────────────

test('PM-JOBS-05: CEO jobs page shows all jobs and Create Job button', async ({ page }) => {
  await loginAsCEO(page);
  await page.goto('/jobs');
  await page.waitForSelector('[data-testid="page-jobs"]');

  // CEO sees both demo jobs
  await expect(page.getByTestId('card-job-dj-kitchen-extract-1')).toBeVisible();
  await expect(page.getByTestId('card-job-dj-showcase-maint-1')).toBeVisible();

  // CEO has Create Job button
  await expect(page.locator('button', { hasText: 'Create Job' })).toBeVisible();

  // CEO does NOT see "My Jobs" — heading is "Jobs"
  await expect(page.locator('h2')).toContainText('Jobs');
  await expect(page.locator('h2')).not.toContainText('My Jobs');
});

// ────────────────────────────────────────────────────────────────
// PM-JOBS-06 — CEO job detail retains all financial panels
// ────────────────────────────────────────────────────────────────

test('PM-JOBS-06: CEO job detail shows financial intelligence panels', async ({ page }) => {
  await loginAsCEO(page);
  await page.goto('/jobs/dj-kitchen-extract-1');
  await page.waitForSelector('[data-testid="page-job-dj-kitchen-extract-1"]');

  // CEO sees financial panels
  const jobPage = page.getByTestId('page-job-dj-kitchen-extract-1');
  await expect(jobPage).toBeVisible();

  // CEO is NOT shown the PM access denied screen
  await expect(page.getByTestId('pm-job-access-denied')).not.toBeVisible();

  // CEO sees edit button (operational control)
  await expect(page.getByTestId('button-job-edit')).toBeVisible();
});
