/**
 * DOCTRINE TEST: Activity Feed — Phase 6.2 / UX-5 rewrite
 *
 * UX-5: the standalone Activity Feed page is superseded by the Intelligence
 * Hub's combined Activity tab (/intelligence?tab=activity — ActivityHub).
 * This suite is a rewrite against the new component (spec §13.2):
 *
 * - AF-04 … AF-08 (legacy KPI-strip group) are RETIRED — the Activity tab
 *   deliberately has no KPI strip (spec §6.6, P1-C). AF-08 thereby leaves
 *   the known-failure ledger; its seed-date drift is out of scope (P2-2).
 * - AF-16 … AF-18 (legacy search box) are RETIRED — Blueprint 6.6 defines
 *   the tab as filters + combined list only; there is no search input.
 * - The legacy Event Detail dialog is replaced by the inline "Show Event
 *   Detail" expansion (spec §10.5 metadata contract).
 *
 * Remaining coverage: access/RBAC, combined list rendering, merge order,
 * type/priority filters, detail expansion, deep linking, doctrine.
 */
import { test, expect } from '@playwright/test';
import { loginAsCEO, loginAsWorker } from '../helpers/login';
import { clearBrowserState } from '../helpers/state';

test.beforeEach(async ({ page }) => {
  await clearBrowserState(page);
});

// ──────────────────────────────────────────────────────
// AF-01 to AF-03: Page Access & RBAC
// ──────────────────────────────────────────────────────

test('AF-01: Activity tab loads for CEO', async ({ page }) => {
  await loginAsCEO(page);
  await page.goto('/intelligence?tab=activity');
  await expect(page.getByTestId('activity-hub')).toBeVisible();
  await expect(page.getByTestId('activity-combined-list')).toBeVisible();
});

test('AF-02: CEO can navigate via sidebar to the Activity tab; legacy route redirects', async ({ page }) => {
  await loginAsCEO(page);
  await page.goto('/');
  await page.getByTestId('nav-intelligence-hub').click();
  await page.getByTestId('intelligence-tab-activity').click();
  await expect(page.getByTestId('activity-hub')).toBeVisible();
  // Legacy /activity-feed redirects to the hub Activity tab
  await page.goto('/activity-feed');
  await expect(page).toHaveURL(/\/intelligence\?tab=activity/);
  await expect(page.getByTestId('activity-hub')).toBeVisible();
});

test('AF-03 (RBAC): Worker is denied access to the Activity tab', async ({ page }) => {
  await loginAsWorker(page);
  await page.goto('/intelligence?tab=activity');
  await expect(page.getByTestId('activity-hub')).not.toBeVisible();
  await page.goto('/activity-feed');
  await expect(page.getByTestId('activity-hub')).not.toBeVisible();
});

// ──────────────────────────────────────────────────────
// AF-04 to AF-08: RETIRED — legacy KPI strip (af-kpi-*)
// The combined Activity tab has no KPI strip (UX-5 spec §6.6, P1-C).
// AF-08 leaves the known-failure ledger with this retirement.
// ──────────────────────────────────────────────────────

// ──────────────────────────────────────────────────────
// AF-09 to AF-11: Combined List
// ──────────────────────────────────────────────────────

test('AF-09: Combined list renders activity rows from seed data', async ({ page }) => {
  await loginAsCEO(page);
  await page.goto('/intelligence?tab=activity');
  const rows = page.getByTestId('activity-row');
  expect(await rows.count()).toBeGreaterThan(0);
  // act-001 is the newest seed record — must be present on the first page
  await expect(rows.filter({ hasText: 'Timesheet Approved' }).first()).toBeVisible();
});

test('AF-10: Combined list includes notification rows with a Notification chip', async ({ page }) => {
  await loginAsCEO(page);
  await page.goto('/intelligence?tab=activity');
  // Narrow with the Warning filter (small result set, no pagination effects):
  // seeded high-priority notifications map to Warning (spec §10.5)
  await page.getByTestId('activity-filter-priority-warning').click();
  const chips = page.getByTestId('activity-row-notification-chip');
  expect(await chips.count()).toBeGreaterThan(0);
});

test('AF-11: Rows are sorted newest first (act-001 leads; 1h-old before 2h-old)', async ({ page }) => {
  await loginAsCEO(page);
  await page.goto('/intelligence?tab=activity');
  const rows = page.getByTestId('activity-row');
  // act-001 (1h before seed NOW) is the newest record across both engines
  await expect(rows.first()).toContainText('Timesheet Approved');
  const texts = await rows.allTextContents();
  const idxApproved = texts.findIndex((t) => t.includes('Timesheet Approved'));
  const idxRejected = texts.findIndex((t) => t.includes('Expense Rejected'));
  expect(idxApproved).toBeGreaterThanOrEqual(0);
  expect(idxRejected).toBeGreaterThan(idxApproved);
});

// ──────────────────────────────────────────────────────
// AF-12 to AF-15: Type & Priority Filters (canonical mappings — §10.5)
// ──────────────────────────────────────────────────────

test('AF-12: Type filter — Sync shows sync events and hides operational rows', async ({ page }) => {
  await loginAsCEO(page);
  await page.goto('/intelligence?tab=activity');
  await page.getByTestId('activity-filter-type-sync').click();
  const rows = page.getByTestId('activity-row');
  await expect(rows.filter({ hasText: 'QuickBooks Sync Failed' }).first()).toBeVisible();
  await expect(rows.filter({ hasText: 'Timesheet Approved' })).toHaveCount(0);
});

test('AF-13: Priority filter — Critical shows critical rows and hides info rows', async ({ page }) => {
  await loginAsCEO(page);
  await page.goto('/intelligence?tab=activity');
  await page.getByTestId('activity-filter-priority-critical').click();
  const rows = page.getByTestId('activity-row');
  await expect(rows.filter({ hasText: 'Automation Execution Blocked' }).first()).toBeVisible();
  await expect(rows.filter({ hasText: 'QuickBooks Sync Failed' }).first()).toBeVisible();
  await expect(rows.filter({ hasText: 'Timesheet Approved' })).toHaveCount(0);
});

test('AF-14: Type filter — Operational shows review/job rows and hides automation rows', async ({ page }) => {
  await loginAsCEO(page);
  await page.goto('/intelligence?tab=activity');
  await page.getByTestId('activity-filter-type-operational').click();
  const rows = page.getByTestId('activity-row');
  await expect(rows.filter({ hasText: 'Timesheet Approved' }).first()).toBeVisible();
  await expect(rows.filter({ hasText: 'Job Status Changed to Active' }).first()).toBeVisible();
  await expect(rows.filter({ hasText: 'Automation Execution Blocked' })).toHaveCount(0);
});

test('AF-15: Priority filter — Warning shows warning rows, hides info rows', async ({ page }) => {
  await loginAsCEO(page);
  await page.goto('/intelligence?tab=activity');
  await page.getByTestId('activity-filter-priority-warning').click();
  const rows = page.getByTestId('activity-row');
  await expect(rows.filter({ hasText: 'Expense Rejected' }).first()).toBeVisible();
  await expect(rows.filter({ hasText: 'Timesheet Approved' })).toHaveCount(0);
});

// ──────────────────────────────────────────────────────
// AF-16 to AF-18: RETIRED — legacy search box
// Blueprint 6.6 defines the Activity tab as filters + combined list only.
// ──────────────────────────────────────────────────────

// ──────────────────────────────────────────────────────
// AF-19 to AF-22: Event Detail Expansion (replaces the legacy dialog)
// ──────────────────────────────────────────────────────

test('AF-19: Show Event Detail toggle expands rows with metadata blocks', async ({ page }) => {
  await loginAsCEO(page);
  await page.goto('/intelligence?tab=activity');
  await expect(page.getByTestId('activity-event-detail-block')).toHaveCount(0);
  await page.getByTestId('activity-event-detail-toggle').click();
  const blocks = page.getByTestId('activity-event-detail-block');
  expect(await blocks.count()).toBeGreaterThan(0);
});

test('AF-20: Detail expansion shows the §10.5 metadata contract fields', async ({ page }) => {
  await loginAsCEO(page);
  await page.goto('/intelligence?tab=activity');
  await page.getByTestId('activity-event-detail-toggle').click();
  const firstBlock = page.getByTestId('activity-event-detail-block').first();
  await expect(firstBlock).toContainText('Type');
  await expect(firstBlock).toContainText('Native priority');
  await expect(firstBlock).toContainText('Source route');
  await expect(firstBlock).toContainText('Action required');
});

test('AF-21: Detail expansion shows seed source metadata (act-010 invoice_sync)', async ({ page }) => {
  await loginAsCEO(page);
  await page.goto('/intelligence?tab=activity');
  await page.getByTestId('activity-filter-type-sync').click();
  await page.getByTestId('activity-event-detail-toggle').click();
  // "QuickBooks Sync Failed" exists as both the act-010 activity event and a
  // sync-failure notification — scope to the activity-kind row (act-010).
  const syncRow = page
    .locator('[data-testid="activity-row"][data-kind="activity"]')
    .filter({ hasText: 'QuickBooks Sync Failed' })
    .first();
  await expect(syncRow.getByTestId('activity-event-detail-block')).toContainText('invoice_sync');
});

test('AF-22: Detail expansion shows native notification priority', async ({ page }) => {
  await loginAsCEO(page);
  await page.goto('/intelligence?tab=activity');
  await page.getByTestId('activity-filter-priority-warning').click();
  await page.getByTestId('activity-event-detail-toggle').click();
  // A seeded high-priority notification renders Warning on the row but its
  // native priority (High) inside the expansion (spec §10.5)
  const notifRow = page
    .getByTestId('activity-row')
    .filter({ has: page.getByTestId('activity-row-notification-chip') })
    .first();
  await expect(notifRow.getByTestId('activity-event-detail-block')).toContainText('High');
});

// ──────────────────────────────────────────────────────
// AF-23: Deep Linking
// ──────────────────────────────────────────────────────

test('AF-23: Open Source on a sync row navigates to the Finance Hub', async ({ page }) => {
  await loginAsCEO(page);
  await page.goto('/intelligence?tab=activity');
  await page.getByTestId('activity-filter-type-sync').click();
  // Scope to the activity-kind row (act-010) — the notification row with the
  // same text would also match a bare hasText filter.
  const syncRow = page
    .locator('[data-testid="activity-row"][data-kind="activity"]')
    .filter({ hasText: 'QuickBooks Sync Failed' })
    .first();
  await syncRow.getByRole('button', { name: /Open source/i }).click();
  await expect(page).toHaveURL(/\/finance/);
});

// ──────────────────────────────────────────────────────
// AF-24: Doctrine — informational only
// ──────────────────────────────────────────────────────

test('AF-24: Activity tab contains no approve/override/mutate controls', async ({ page }) => {
  await loginAsCEO(page);
  await page.goto('/intelligence?tab=activity');
  await expect(page.getByTestId('activity-hub')).toBeVisible();
  const panel = page.getByTestId('intelligence-activity-panel');
  await expect(panel.locator('button:has-text("Approve")')).toHaveCount(0);
  await expect(panel.locator('button:has-text("Override")')).toHaveCount(0);
  await expect(panel.locator('button:has-text("Mutate")')).toHaveCount(0);
});

// ──────────────────────────────────────────────────────
// AF-25: Bookmarkable URL
// ──────────────────────────────────────────────────────

test('AF-25: Activity tab is accessible at its bookmarkable URL', async ({ page }) => {
  await loginAsCEO(page);
  await page.goto('/intelligence?tab=activity');
  await expect(page.getByTestId('activity-hub')).toBeVisible();
  await expect(page.getByTestId('intelligence-hub-heading')).toContainText(/Activity/i);
});
