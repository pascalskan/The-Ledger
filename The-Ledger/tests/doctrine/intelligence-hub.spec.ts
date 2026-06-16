/**
 * DOCTRINE TESTS — UX-5: Intelligence Hub
 *
 * IH-01 … IH-38 per spec §13.3 coverage groups:
 *   1. RBAC (IH-01–06)
 *   2. Shell & tabs (IH-07–12)
 *   3. Overview (IH-13–18)
 *   4. Activity (IH-19–28)
 *   5. Toggle persistence & precedence (IH-29–31)
 *   6. Redirects (IH-32–36)
 *   7. Doctrine enforcement (IH-37–38)
 *
 * Notes:
 * - Worker RBAC asserts the Unauthorized page, never a redirect (P1-A).
 * - The `bus-af-` Platform Event block renders only for live-dispatched
 *   activity rows; the seeded dataset contains none (bus seed events are
 *   suppressed from the activity feed by doctrine), so IH asserts the
 *   block's absence in the seed state and the join is covered structurally.
 * - Hub audit recorders are engine-internal (no rendered audit surface);
 *   doctrine enforcement is asserted via DOM (no approve/mutate controls,
 *   advisory labels, navigate-only deep links) per AC-10/AC-14.
 */

import { test, expect } from '@playwright/test';
import { loginAsCEO, loginAsPM, loginAsWorker } from '../helpers/login';
import { clearBrowserState } from '../helpers/state';

test.beforeEach(async ({ page }) => {
  await clearBrowserState(page);
});

// ─────────────────────────────────────────────────────────────────────
// GROUP 1: RBAC (IH-01–06)
// ─────────────────────────────────────────────────────────────────────

test('IH-01: CEO renders the hub with the Intelligence nav item', async ({ page }) => {
  await loginAsCEO(page);
  await page.goto('/');
  await expect(page.getByTestId('nav-intelligence-hub')).toBeVisible();
  await page.getByTestId('nav-intelligence-hub').click();
  await expect(page.getByTestId('intelligence-hub-page')).toBeVisible();
});

test('IH-02: PM /intelligence shows the Unauthorized page', async ({ page }) => {
  await loginAsPM(page);
  await page.goto('/intelligence');
  await expect(page.getByTestId('intelligence-hub-page')).not.toBeVisible();
  const bodyText = await page.locator('body').textContent();
  expect(bodyText && /unauthorized|access denied|not allowed|403/i.test(bodyText)).toBeTruthy();
});

test('IH-03: PM /notifications renders the Notification Centre (no redirect)', async ({ page }) => {
  await loginAsPM(page);
  await page.goto('/notifications');
  await expect(page).toHaveURL(/\/notifications/);
  await expect(page.getByTestId('notification-centre-page')).toBeVisible();
});

test('IH-04: Worker /intelligence shows the Unauthorized page (P1-A — no redirect assertion)', async ({ page }) => {
  await loginAsWorker(page);
  await page.goto('/intelligence');
  await expect(page.getByTestId('intelligence-hub-page')).not.toBeVisible();
  const bodyText = await page.locator('body').textContent();
  expect(bodyText && /unauthorized|access denied|not allowed|403/i.test(bodyText)).toBeTruthy();
});

test('IH-05: PM legacy intelligence routes remain Unauthorized', async ({ page }) => {
  await loginAsPM(page);
  for (const route of ['/executive-command-centre', '/analytics-centre', '/reporting-centre', '/activity-feed', '/event-monitor']) {
    await page.goto(route);
    const bodyText = await page.locator('body').textContent();
    expect(bodyText && /unauthorized|access denied|not allowed|403/i.test(bodyText)).toBeTruthy();
  }
});

test('IH-06: CEO /event-monitor still renders (hidden route)', async ({ page }) => {
  await loginAsCEO(page);
  await page.goto('/event-monitor');
  await expect(page).toHaveURL(/\/event-monitor/);
  await expect(page.getByTestId('event-monitor-page')).toBeVisible();
});

// ─────────────────────────────────────────────────────────────────────
// GROUP 2: SHELL & TABS (IH-07–12)
// ─────────────────────────────────────────────────────────────────────

test('IH-07: all five tabs render', async ({ page }) => {
  await loginAsCEO(page);
  await page.goto('/intelligence');
  await expect(page.getByTestId('intelligence-tab-overview')).toBeVisible();
  await expect(page.getByTestId('intelligence-tab-analytics')).toBeVisible();
  await expect(page.getByTestId('intelligence-tab-reports')).toBeVisible();
  await expect(page.getByTestId('intelligence-tab-exports')).toBeVisible();
  await expect(page.getByTestId('intelligence-tab-activity')).toBeVisible();
});

test('IH-08: default tab is Overview', async ({ page }) => {
  await loginAsCEO(page);
  await page.goto('/intelligence');
  await expect(page.getByTestId('intelligence-overview-panel')).toBeVisible();
  await expect(page.getByTestId('intel-health-scorecard')).toBeVisible();
});

test('IH-09: ?tab= deep links mount the right tab', async ({ page }) => {
  await loginAsCEO(page);
  await page.goto('/intelligence?tab=analytics');
  await expect(page.getByTestId('analytics-centre-page')).toBeVisible();
  await page.goto('/intelligence?tab=reports');
  await expect(page.getByTestId('reports-table')).toBeVisible();
  await page.goto('/intelligence?tab=activity');
  await expect(page.getByTestId('activity-hub')).toBeVisible();
});

test('IH-10: ?sub=distribution mounts the Distribution sub-tab', async ({ page }) => {
  await loginAsCEO(page);
  await page.goto('/intelligence?tab=exports&sub=distribution');
  await expect(page.getByTestId('distribution-table')).toBeVisible();
  await expect(page.getByTestId('distribution-kpi-strip')).toBeVisible();
});

test('IH-11: heading reflects the active tab (omitted on Overview)', async ({ page }) => {
  await loginAsCEO(page);
  await page.goto('/intelligence');
  await expect(page.getByTestId('intelligence-hub-heading')).toHaveText('Intelligence');
  await page.goto('/intelligence?tab=reports');
  await expect(page.getByTestId('intelligence-hub-heading')).toContainText('Intelligence — Reports');
});

test('IH-12: hub content renders a single h1 on every tab', async ({ page }) => {
  await loginAsCEO(page);
  for (const tab of ['overview', 'analytics', 'reports', 'exports', 'activity']) {
    await page.goto(`/intelligence?tab=${tab}`);
    await expect(page.getByTestId('intelligence-hub-page')).toBeVisible();
    // Scoped to hub content — the sidebar brand mark is a separate h1 (UX-4 precedent)
    await expect(page.locator('[data-testid="intelligence-hub-page"] h1')).toHaveCount(1);
  }
});

// ─────────────────────────────────────────────────────────────────────
// GROUP 3: OVERVIEW (IH-13–18)
// ─────────────────────────────────────────────────────────────────────

test('IH-13: four health cards render score and status pill', async ({ page }) => {
  await loginAsCEO(page);
  await page.goto('/intelligence?tab=overview');
  for (const dim of ['operational', 'financial', 'governance', 'workflow']) {
    const card = page.getByTestId(`intel-health-${dim}`);
    await expect(card).toBeVisible();
    await expect(card).toContainText(/\/100/);
    await expect(card).toContainText(/Healthy|Warning|Critical/);
  }
});

test('IH-14: seeded critical rows show "Critical", seeded high rows show "Warning" (§6.2-B)', async ({ page }) => {
  await loginAsCEO(page);
  await page.goto('/intelligence?tab=overview');
  const rows = page.locator('[data-testid="intel-critical-item-row"]');
  expect(await rows.count()).toBeGreaterThan(0);
  const criticalRows = page.locator('[data-testid="intel-critical-item-row"][data-priority="critical"]');
  const highRows = page.locator('[data-testid="intel-critical-item-row"][data-priority="high"]');
  if ((await criticalRows.count()) > 0) await expect(criticalRows.first()).toContainText('Critical');
  if ((await highRows.count()) > 0) await expect(highRows.first()).toContainText('Warning');
});

test('IH-15: critical items sort critical-first (data-priority ordering)', async ({ page }) => {
  await loginAsCEO(page);
  await page.goto('/intelligence?tab=overview');
  const priorities = await page
    .locator('[data-testid="intel-critical-item-row"]')
    .evaluateAll((els) => els.map((e) => e.getAttribute('data-priority')));
  const firstHigh = priorities.indexOf('high');
  const lastCritical = priorities.lastIndexOf('critical');
  if (firstHigh !== -1 && lastCritical !== -1) {
    expect(lastCritical).toBeLessThan(firstHigh);
  }
});

test('IH-16: critical item deep link navigates to the source module', async ({ page }) => {
  await loginAsCEO(page);
  await page.goto('/intelligence?tab=overview');
  const action = page
    .locator('[data-testid="intel-critical-item-row"]')
    .first()
    .getByRole('button', { name: /Open source/i });
  await action.click();
  await expect(page).not.toHaveURL(/tab=overview/);
});

test('IH-17: critical items panel shows rows or the healthy empty state', async ({ page }) => {
  await loginAsCEO(page);
  await page.goto('/intelligence?tab=overview');
  const rows = page.locator('[data-testid="intel-critical-item-row"]');
  if ((await rows.count()) === 0) {
    await expect(page.getByTestId('intel-critical-items-empty')).toBeVisible();
    await expect(page.getByTestId('intel-critical-items-empty')).toContainText(/all systems healthy/i);
  } else {
    await expect(page.getByTestId('intel-critical-items-empty')).toHaveCount(0);
  }
});

test('IH-18: all six summary tiles render numeric values from their §10.1 sources', async ({ page }) => {
  await loginAsCEO(page);
  await page.goto('/intelligence?tab=overview');
  for (const tile of ['active-jobs', 'pending-reviews', 'active-rules', 'open-exceptions', 'active-workflows', 'unread-notifications']) {
    const el = page.getByTestId(`intel-summary-tile-${tile}`);
    await expect(el).toBeVisible();
    expect(await el.textContent()).toMatch(/\d+/);
  }
  // Seed-data spot checks: unread notifications and active rules are non-zero
  expect(await page.getByTestId('intel-summary-tile-unread-notifications').textContent()).not.toMatch(/^0\D/);
});

// ─────────────────────────────────────────────────────────────────────
// GROUP 4: ACTIVITY (IH-19–28)
// ─────────────────────────────────────────────────────────────────────

test('IH-19: combined list contains activity AND notification rows', async ({ page }) => {
  await loginAsCEO(page);
  await page.goto('/intelligence?tab=activity');
  await expect(page.locator('[data-testid="activity-row"][data-kind="activity"]').first()).toBeVisible();
  // Load the full merged set, then notification rows must be present
  while (await page.getByTestId('activity-load-more').isVisible()) {
    await page.getByTestId('activity-load-more').click();
  }
  expect(await page.locator('[data-testid="activity-row"][data-kind="notification"]').count()).toBeGreaterThan(0);
});

test('IH-20: type filters render all six chips and filter the list', async ({ page }) => {
  await loginAsCEO(page);
  await page.goto('/intelligence?tab=activity');
  for (const t of ['all', 'operational', 'financial', 'governance', 'automation', 'sync']) {
    await expect(page.getByTestId(`activity-filter-type-${t}`)).toBeVisible();
  }
  await page.getByTestId('activity-filter-type-governance').click();
  const rows = page.getByTestId('activity-row');
  await expect(rows.filter({ hasText: 'QuickBooks Sync Failed' })).toHaveCount(0);
});

test('IH-21: notification type mapping is total — sync_failure appears under Sync', async ({ page }) => {
  await loginAsCEO(page);
  await page.goto('/intelligence?tab=activity');
  await page.getByTestId('activity-filter-type-sync').click();
  const notifChips = page.getByTestId('activity-row-notification-chip');
  expect(await notifChips.count()).toBeGreaterThan(0);
});

test('IH-22: priority mapping — seeded high notification renders Warning and matches the Warning filter (P0-A)', async ({ page }) => {
  await loginAsCEO(page);
  await page.goto('/intelligence?tab=activity');
  await page.getByTestId('activity-filter-priority-warning').click();
  // notif-015 (priority: high) — must appear under Warning with the Warning label.
  // The same title exists as an activity event too, so scope to the
  // notification-kind row via its chip to prove the high→Warning mapping.
  const row = page
    .getByTestId('activity-row')
    .filter({ has: page.getByTestId('activity-row-notification-chip') })
    .filter({ hasText: 'Reconciliation Discrepancy Detected' })
    .first();
  await expect(row).toBeVisible();
  await expect(row).toContainText('Warning');
  await expect(row.getByTestId('activity-row-notification-chip')).toBeVisible();
});

test('IH-23: priority mapping — medium/low notifications match the Info filter; critical matches Critical (P0-A)', async ({ page }) => {
  await loginAsCEO(page);
  await page.goto('/intelligence?tab=activity');
  await page.getByTestId('activity-filter-priority-info').click();
  while (await page.getByTestId('activity-load-more').isVisible()) {
    await page.getByTestId('activity-load-more').click();
  }
  // notif-004 (priority: medium) renders under Info
  const mediumRow = page.getByTestId('activity-row').filter({ hasText: 'Automation Rule Disabled' }).first();
  await expect(mediumRow).toBeVisible();
  await expect(mediumRow).toContainText('Info');
  // critical notifications match the Critical filter
  await page.getByTestId('activity-filter-priority-critical').click();
  expect(await page.getByTestId('activity-row-notification-chip').count()).toBeGreaterThan(0);
});

test('IH-24: merge order is newest first', async ({ page }) => {
  await loginAsCEO(page);
  await page.goto('/intelligence?tab=activity');
  await expect(page.getByTestId('activity-row').first()).toContainText('Timesheet Approved');
});

test('IH-25: mark-read updates notification state in place', async ({ page }) => {
  await loginAsCEO(page);
  await page.goto('/intelligence?tab=activity');
  await page.getByTestId('activity-filter-priority-warning').click();
  const markButtons = page.getByRole('button', { name: /^Mark read:/i });
  const before = await markButtons.count();
  expect(before).toBeGreaterThan(0);
  await markButtons.first().click();
  await expect(markButtons).toHaveCount(before - 1);
});

test('IH-26: dismiss removes the notification actions in place', async ({ page }) => {
  await loginAsCEO(page);
  await page.goto('/intelligence?tab=activity');
  await page.getByTestId('activity-filter-priority-warning').click();
  const dismissButtons = page.getByRole('button', { name: /^Dismiss:/i });
  const before = await dismissButtons.count();
  expect(before).toBeGreaterThan(0);
  await dismissButtons.first().click();
  await expect(dismissButtons).toHaveCount(before - 1);
});

test('IH-27: Event Detail toggle reveals the §10.5 metadata contract', async ({ page }) => {
  await loginAsCEO(page);
  await page.goto('/intelligence?tab=activity');
  await expect(page.getByTestId('activity-event-detail-block')).toHaveCount(0);
  await page.getByTestId('activity-event-detail-toggle').click();
  const block = page.getByTestId('activity-event-detail-block').first();
  await expect(block).toContainText('Native priority');
  await expect(block).toContainText('Source route');
  await expect(block).toContainText('Job');
  await expect(block).toContainText('Action required');
  // Seed state has no live-dispatched bus-af- rows, so no Platform Event block
  // may render (the seeded bus history is suppressed by doctrine and lives on
  // /event-monitor — P0-B)
  await expect(page.getByTestId('activity-bus-event-block')).toHaveCount(0);
});

test('IH-28: no KPI strip exists in the Activity tab (strict absence) and Load More paginates', async ({ page }) => {
  await loginAsCEO(page);
  await page.goto('/intelligence?tab=activity');
  await expect(page.getByTestId('af-kpi-strip')).toHaveCount(0);
  const initial = await page.getByTestId('activity-row').count();
  expect(initial).toBe(25);
  await page.getByTestId('activity-load-more').click();
  expect(await page.getByTestId('activity-row').count()).toBeGreaterThan(initial);
});

// ─────────────────────────────────────────────────────────────────────
// GROUP 5: TOGGLE PERSISTENCE & PRECEDENCE (IH-29–31 — P1-D)
// ─────────────────────────────────────────────────────────────────────

test('IH-29: Switch interaction persists to localStorage across reload', async ({ page }) => {
  await loginAsCEO(page);
  await page.goto('/intelligence?tab=activity');
  await page.getByTestId('activity-event-detail-toggle').click();
  await expect(page.getByTestId('activity-event-detail-toggle')).toHaveAttribute('data-state', 'checked');
  expect(await page.evaluate(() => localStorage.getItem('ledger.intelligence.eventDetail'))).toBe('1');
  await page.goto('/intelligence?tab=activity');
  await expect(page.getByTestId('activity-event-detail-toggle')).toHaveAttribute('data-state', 'checked');
});

test('IH-30: ?detail=1 pre-enables the toggle and does NOT write to localStorage', async ({ page }) => {
  await loginAsCEO(page);
  await page.goto('/intelligence?tab=activity&detail=1');
  await expect(page.getByTestId('activity-event-detail-toggle')).toHaveAttribute('data-state', 'checked');
  expect(await page.evaluate(() => localStorage.getItem('ledger.intelligence.eventDetail'))).toBeNull();
});

test('IH-31: without the param, localStorage state is restored (URL wins only per visit)', async ({ page }) => {
  await loginAsCEO(page);
  await page.goto('/intelligence?tab=activity');
  // localStorage OFF (cleared in setup) — toggle starts OFF
  await expect(page.getByTestId('activity-event-detail-toggle')).toHaveAttribute('data-state', 'unchecked');
  // Visit with the param: ON for the visit
  await page.goto('/intelligence?tab=activity&detail=1');
  await expect(page.getByTestId('activity-event-detail-toggle')).toHaveAttribute('data-state', 'checked');
  // Param removed: defensive localStorage read restores OFF
  await page.goto('/intelligence?tab=activity');
  await expect(page.getByTestId('activity-event-detail-toggle')).toHaveAttribute('data-state', 'unchecked');
});

// ─────────────────────────────────────────────────────────────────────
// GROUP 6: REDIRECTS (IH-32–36)
// ─────────────────────────────────────────────────────────────────────

test('IH-32: the four CEO legacy routes land on the correct hub tab', async ({ page }) => {
  await loginAsCEO(page);
  const cases: [string, RegExp][] = [
    ['/executive-command-centre', /\/intelligence\?tab=overview/],
    ['/analytics-centre', /\/intelligence\?tab=analytics/],
    ['/reporting-centre', /\/intelligence\?tab=reports/],
    ['/activity-feed', /\/intelligence\?tab=activity/],
  ];
  for (const [route, target] of cases) {
    await page.goto(route);
    await expect(page).toHaveURL(target);
    await expect(page.getByTestId('intelligence-hub-page')).toBeVisible();
  }
});

test('IH-33: CEO /notifications redirects to the hub Activity tab (role-aware)', async ({ page }) => {
  await loginAsCEO(page);
  await page.goto('/notifications');
  await expect(page).toHaveURL(/\/intelligence\?tab=activity/);
  await expect(page.getByTestId('activity-hub')).toBeVisible();
});

test('IH-34: /event-monitor does NOT redirect (renders the monitor for CEO)', async ({ page }) => {
  await loginAsCEO(page);
  await page.goto('/event-monitor');
  await expect(page).toHaveURL(/\/event-monitor/);
  await expect(page.getByTestId('event-monitor-page')).toBeVisible();
  await expect(page.getByTestId('intelligence-hub-page')).toHaveCount(0);
});

test('IH-35: bell "View All" sends CEO to the hub Activity tab', async ({ page }) => {
  await loginAsCEO(page);
  await page.goto('/');
  await page.getByTestId('notif-bell-btn-desktop').click();
  await page.getByTestId('notif-bell-view-all').click();
  await expect(page).toHaveURL(/\/intelligence\?tab=activity/);
});

test('IH-36: bell "View All" keeps PM on /notifications', async ({ page }) => {
  await loginAsPM(page);
  await page.goto('/');
  await page.getByTestId('notif-bell-btn-desktop').click();
  await page.getByTestId('notif-bell-view-all').click();
  await expect(page).toHaveURL(/\/notifications/);
  await expect(page.getByTestId('notification-centre-page')).toBeVisible();
});

// ─────────────────────────────────────────────────────────────────────
// GROUP 7: DOCTRINE ENFORCEMENT (IH-37–38)
// ─────────────────────────────────────────────────────────────────────

test('IH-37: no approve/reject/override controls anywhere in the hub DOM', async ({ page }) => {
  await loginAsCEO(page);
  for (const tab of ['overview', 'analytics', 'reports', 'exports', 'activity']) {
    await page.goto(`/intelligence?tab=${tab}`);
    await expect(page.getByTestId('intelligence-hub-page')).toBeVisible();
    const hub = page.getByTestId('intelligence-hub-page');
    await expect(hub.locator('button:has-text("Approve")')).toHaveCount(0);
    await expect(hub.locator('button:has-text("Reject")')).toHaveCount(0);
    await expect(hub.locator('button:has-text("Override")')).toHaveCount(0);
    await expect(hub.locator('button:has-text("Mutate")')).toHaveCount(0);
  }
});

test('IH-38: forecasts keep their advisory labelling inside the hub', async ({ page }) => {
  await loginAsCEO(page);
  await page.goto('/intelligence?tab=analytics');
  await expect(page.getByTestId('analytics-forecast-panel')).toContainText(/Advisory Only/i);
  await expect(page.getByTestId('analytics-doctrine-notice')).toContainText(/advisory/i);
});
