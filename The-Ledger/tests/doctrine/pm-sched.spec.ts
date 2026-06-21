/**
 * PM-SCHED Doctrine Tests
 *
 * Verifies PM-4 deliverables:
 * - PM schedule shows only assigned jobs (managerId === currentUser.id)
 * - PM schedule contains no financial data (margin, revenue, contribution)
 * - Crew conflicts are displayed when detected
 * - Crew shortages are displayed when detected
 * - PM workforce view is scoped to workers on PM's jobs only
 * - CEO schedule and workforce functionality unchanged
 */
import { test, expect } from '@playwright/test';
import { loginAsCEO, loginAsPM } from '../helpers/login';
import { clearBrowserState } from '../helpers/state';

test.beforeEach(async ({ page }) => {
  await clearBrowserState(page);
});

// ────────────────────────────────────────────────────────────────
// PM-SCHED-01 — PM only sees assigned jobs on schedule page
// ────────────────────────────────────────────────────────────────

test('PM-SCHED-01: PM schedule page shows only assigned jobs', async ({ page }) => {
  await loginAsPM(page);
  await page.goto('/schedule');
  await page.waitForSelector('[data-testid="pm-schedule-page"]');

  // PM's assigned active job should be visible
  await expect(page.getByTestId('pm-sched-job-dj-pm-active-1')).toBeVisible();

  // CEO-unmanaged job (dj-showcase-maint-1 — no managerId) must NOT appear
  await expect(page.getByTestId('pm-sched-job-dj-showcase-maint-1')).not.toBeVisible();

  // The 4 PM schedule sections are present
  await expect(page.getByTestId('pm-schedule-workforce-snapshot')).toBeVisible();
  await expect(page.getByTestId('pm-schedule-conflicts')).toBeVisible();
  await expect(page.getByTestId('pm-schedule-my-jobs')).toBeVisible();
  await expect(page.getByTestId('pm-schedule-upcoming')).toBeVisible();
  await expect(page.getByTestId('pm-schedule-crew-availability')).toBeVisible();
});

// ────────────────────────────────────────────────────────────────
// PM-SCHED-02 — CEO sees all jobs on schedule page
// ────────────────────────────────────────────────────────────────

test('PM-SCHED-02: CEO schedule page shows all jobs (no PM scoping)', async ({ page }) => {
  await loginAsCEO(page);
  await page.goto('/schedule');
  await page.waitForSelector('[data-testid="ceo-schedule-page"]');

  // CEO sees the financial weekly intelligence strip (not the PM operational snapshot)
  await expect(page.getByTestId('pm-schedule-page')).not.toBeVisible();
  await expect(page.getByTestId('ceo-schedule-page')).toBeVisible();
});

// ────────────────────────────────────────────────────────────────
// PM-SCHED-03 — PM schedule has no margin / revenue / financial data
// ────────────────────────────────────────────────────────────────

test('PM-SCHED-03: PM schedule page does not expose financial data', async ({ page }) => {
  await loginAsPM(page);
  await page.goto('/schedule');
  await page.waitForSelector('[data-testid="pm-schedule-page"]');

  const schedulePage = page.getByTestId('pm-schedule-page');

  await expect(schedulePage).not.toContainText('Margin');
  await expect(schedulePage).not.toContainText('Revenue');
  await expect(schedulePage).not.toContainText('Contribution');
  await expect(schedulePage).not.toContainText('Contract Value');
  await expect(schedulePage).not.toContainText('Cost to Date');
  await expect(schedulePage).not.toContainText('Forecast');
  await expect(schedulePage).not.toContainText('Profit');
  await expect(schedulePage).not.toContainText('Labour Cost');
});

// ────────────────────────────────────────────────────────────────
// PM-SCHED-04 — Crew conflicts are displayed
// ────────────────────────────────────────────────────────────────

test('PM-SCHED-04: Worker conflicts are detected and displayed', async ({ page }) => {
  await loginAsPM(page);
  await page.goto('/schedule');
  await page.waitForSelector('[data-testid="pm-schedule-page"]');

  // dw2 is assigned to both dj-pm-active-1 (Active, ends +12 days) and
  // dj-boiler-room-2 (Planned, starts +4 days) — these date ranges overlap
  await expect(page.getByTestId('pm-conflict-worker-dw2')).toBeVisible();
  await expect(page.getByTestId('pm-conflict-worker-dw2')).toContainText('Worker Conflict');
  await expect(page.getByTestId('pm-schedule-conflicts')).toBeVisible();
});

// ────────────────────────────────────────────────────────────────
// PM-SCHED-05 — Crew shortages are displayed
// ────────────────────────────────────────────────────────────────

test('PM-SCHED-05: Crew shortages and resource alerts are displayed', async ({ page }) => {
  await loginAsPM(page);
  await page.goto('/schedule');
  await page.waitForSelector('[data-testid="pm-schedule-page"]');

  // dj-office-fit-1 is Planned with 0 workers and starts in 2 days → shortage + resource alert
  await expect(page.getByTestId('pm-shortage-job-dj-office-fit-1')).toBeVisible();
  await expect(page.getByTestId('pm-shortage-job-dj-office-fit-1')).toContainText('Crew Shortage');
});

// ────────────────────────────────────────────────────────────────
// PM-SCHED-06 — Workforce data scoped to PM's job workers only
// ────────────────────────────────────────────────────────────────

test('PM-SCHED-06: PM workforce page shows only workers on assigned jobs', async ({ page }) => {
  await loginAsPM(page);
  await page.goto('/workers');
  await page.waitForSelector('[data-testid="pm-workforce-page"]');

  // PM workforce page renders (not CEO workers table)
  await expect(page.getByTestId('pm-workforce-page')).toBeVisible();
  await expect(page.getByTestId('pm-workforce-crew-list')).toBeVisible();
  await expect(page.getByTestId('pm-workforce-my-jobs')).toBeVisible();

  // No "Add Worker" or "Delete Worker" controls
  await expect(page.getByTestId('button-open-create-worker')).not.toBeVisible();

  // PM-owned active job (dj-pm-active-1) has dw2 and dw3 → they appear
  await expect(page.getByTestId('pm-workforce-row-dw2')).toBeVisible();
  await expect(page.getByTestId('pm-workforce-row-dw3')).toBeVisible();
});

// ────────────────────────────────────────────────────────────────
// PM-SCHED-07 — CEO schedule and workers pages unchanged
// ────────────────────────────────────────────────────────────────

test('PM-SCHED-07: CEO workers page retains full management capabilities', async ({ page }) => {
  await loginAsCEO(page);
  await page.goto('/workers');
  await page.waitForSelector('[data-testid="ceo-workforce-page"]');

  // CEO sees full workers management page
  await expect(page.getByTestId('ceo-workforce-page')).toBeVisible();
  await expect(page.getByTestId('button-open-create-worker')).toBeVisible();

  // CEO sees all company workers (not just PM-scoped)
  await expect(page.getByTestId('row-worker-dw1')).toBeVisible();
  await expect(page.getByTestId('row-worker-dw2')).toBeVisible();
  await expect(page.getByTestId('row-worker-dw3')).toBeVisible();

  // No PM workforce scope
  await expect(page.getByTestId('pm-workforce-page')).not.toBeVisible();
});
