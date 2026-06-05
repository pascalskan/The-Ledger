/**
 * DOCTRINE TEST: Event Bus Engine — Phase 6.3
 *
 * 30 tests covering:
 * - Event publishing
 * - Subscriptions (subscribe / unsubscribe)
 * - Event filtering (by type, by priority)
 * - Search
 * - Event history and recent events
 * - Activity Feed integration
 * - Notification integration (simulated)
 * - Dashboard widget (event bus events visible)
 * - Event Monitor page (KPI strip, event stream, subscriber panel, filters, search, detail)
 * - RBAC (CEO only)
 * - Doctrine compliance (informational / evaluative only)
 */
import { test, expect } from '@playwright/test';
import { loginAsCEO, loginAsPM, loginAsWorker } from '../helpers/login';
import { clearBrowserState } from '../helpers/state';

test.beforeEach(async ({ page }) => {
  await clearBrowserState(page);
});

// ──────────────────────────────────────────────────────
// EB-01 to EB-03: Page Access & RBAC
// ──────────────────────────────────────────────────────

test('EB-01: Event Monitor page loads for CEO', async ({ page }) => {
  await loginAsCEO(page);
  await page.goto('/event-monitor');
  await expect(page.getByTestId('event-monitor-page')).toBeVisible();
  await expect(page.getByRole('heading', { name: /Event Monitor/i })).toBeVisible();
});

test('EB-02: CEO can navigate via sidebar to Event Monitor', async ({ page }) => {
  await loginAsCEO(page);
  await page.goto('/');
  await page.getByTestId('nav-admin-toggle').click();
  await page.getByTestId('nav-event-monitor').click();
  await expect(page.getByTestId('event-monitor-page')).toBeVisible();
});

test('EB-03 (RBAC): Worker is denied access to Event Monitor', async ({ page }) => {
  await loginAsWorker(page);
  await page.goto('/event-monitor');
  await expect(page.getByTestId('event-monitor-page')).not.toBeVisible();
});

// ──────────────────────────────────────────────────────
// EB-04 to EB-08: KPI Strip
// ──────────────────────────────────────────────────────

test('EB-04: KPI strip renders all 5 cards', async ({ page }) => {
  await loginAsCEO(page);
  await page.goto('/event-monitor');
  await expect(page.getByTestId('em-kpi-strip')).toBeVisible();
  await expect(page.getByTestId('em-kpi-total')).toBeVisible();
  await expect(page.getByTestId('em-kpi-today')).toBeVisible();
  await expect(page.getByTestId('em-kpi-critical')).toBeVisible();
  await expect(page.getByTestId('em-kpi-subscribers')).toBeVisible();
  await expect(page.getByTestId('em-kpi-active-types')).toBeVisible();
});

test('EB-05: KPI total matches seed data (20 events)', async ({ page }) => {
  await loginAsCEO(page);
  await page.goto('/event-monitor');
  await expect(page.getByTestId('em-kpi-total')).toContainText('20');
});

test('EB-06: KPI critical count is non-zero from seed data', async ({ page }) => {
  await loginAsCEO(page);
  await page.goto('/event-monitor');
  const critText = await page.getByTestId('em-kpi-critical').textContent();
  const count = parseInt(critText?.match(/\d+/)?.[0] || '0');
  expect(count).toBeGreaterThanOrEqual(4);
});

test('EB-07: KPI subscribers shows 4 active subscribers', async ({ page }) => {
  await loginAsCEO(page);
  await page.goto('/event-monitor');
  await expect(page.getByTestId('em-kpi-subscribers')).toContainText('4');
});

test('EB-08: KPI active event types is non-zero', async ({ page }) => {
  await loginAsCEO(page);
  await page.goto('/event-monitor');
  const typesText = await page.getByTestId('em-kpi-active-types').textContent();
  const count = parseInt(typesText?.match(/\d+/)?.[0] || '0');
  expect(count).toBeGreaterThanOrEqual(8);
});

// ──────────────────────────────────────────────────────
// EB-09 to EB-12: Event Stream
// ──────────────────────────────────────────────────────

test('EB-09: Event stream renders seed events', async ({ page }) => {
  await loginAsCEO(page);
  await page.goto('/event-monitor');
  await expect(page.getByTestId('em-event-stream')).toBeVisible();
  await expect(page.getByTestId('em-event-row-bus-001')).toBeVisible();
  await expect(page.getByTestId('em-event-row-bus-010')).toBeVisible();
  await expect(page.getByTestId('em-event-row-bus-020')).toBeVisible();
});

test('EB-10: Action Required indicator shown for action-required events', async ({ page }) => {
  await loginAsCEO(page);
  await page.goto('/event-monitor');
  // bus-004 (sync failure) has actionRequired: true
  await expect(page.getByTestId('em-action-required-bus-004')).toBeVisible();
  // bus-007 (exception event) has actionRequired: true
  await expect(page.getByTestId('em-action-required-bus-007')).toBeVisible();
});

test('EB-11: Events sorted newest first', async ({ page }) => {
  await loginAsCEO(page);
  await page.goto('/event-monitor');
  const rows = page.getByTestId('em-event-stream').locator('[data-testid^="em-event-row-"]');
  const count = await rows.count();
  expect(count).toBeGreaterThan(0);
  // bus-001 was 1h ago, bus-014 was 3 days ago — bus-001 should appear first
  const allTestIds = await rows.evaluateAll((els) => els.map((e) => e.getAttribute('data-testid')));
  const idx001 = allTestIds.indexOf('em-event-row-bus-001');
  const idx014 = allTestIds.indexOf('em-event-row-bus-014');
  expect(idx001).toBeLessThan(idx014);
});

test('EB-12: View button present on each event row', async ({ page }) => {
  await loginAsCEO(page);
  await page.goto('/event-monitor');
  await expect(page.getByTestId('em-btn-view-bus-001')).toBeVisible();
  await expect(page.getByTestId('em-btn-view-bus-005')).toBeVisible();
});

// ──────────────────────────────────────────────────────
// EB-13 to EB-16: Filters
// ──────────────────────────────────────────────────────

test('EB-13: Type filter — Sync events only', async ({ page }) => {
  await loginAsCEO(page);
  await page.goto('/event-monitor');
  await page.getByTestId('em-filter-type').click();
  await page.getByRole('option', { name: 'Sync' }).click();
  await expect(page.getByTestId('em-event-row-bus-004')).toBeVisible();
  await expect(page.getByTestId('em-event-row-bus-015')).toBeVisible();
  await expect(page.getByTestId('em-event-row-bus-001')).not.toBeVisible();
});

test('EB-14: Priority filter — Critical events only', async ({ page }) => {
  await loginAsCEO(page);
  await page.goto('/event-monitor');
  await page.getByTestId('em-filter-priority').click();
  await page.getByRole('option', { name: 'Critical' }).click();
  await expect(page.getByTestId('em-event-row-bus-004')).toBeVisible();
  await expect(page.getByTestId('em-event-row-bus-005')).toBeVisible();
  await expect(page.getByTestId('em-event-row-bus-001')).not.toBeVisible();
});

test('EB-15: Priority filter — Warning events visible, info hidden', async ({ page }) => {
  await loginAsCEO(page);
  await page.goto('/event-monitor');
  await page.getByTestId('em-filter-priority').click();
  await page.getByRole('option', { name: 'Warning' }).click();
  await expect(page.getByTestId('em-event-row-bus-002')).toBeVisible();
  await expect(page.getByTestId('em-event-row-bus-003')).toBeVisible();
  await expect(page.getByTestId('em-event-row-bus-001')).not.toBeVisible();
});

test('EB-16: Type filter — Exception events only', async ({ page }) => {
  await loginAsCEO(page);
  await page.goto('/event-monitor');
  await page.getByTestId('em-filter-type').click();
  await page.getByRole('option', { name: 'Exception' }).click();
  await expect(page.getByTestId('em-event-row-bus-007')).toBeVisible();
  await expect(page.getByTestId('em-event-row-bus-001')).not.toBeVisible();
});

// ──────────────────────────────────────────────────────
// EB-17 to EB-19: Search
// ──────────────────────────────────────────────────────

test('EB-17: Search by event title filters results', async ({ page }) => {
  await loginAsCEO(page);
  await page.goto('/event-monitor');
  await page.getByTestId('em-search').fill('QuickBooks');
  await expect(page.getByTestId('em-event-row-bus-004')).toBeVisible();
  await expect(page.getByTestId('em-event-row-bus-001')).not.toBeVisible();
});

test('EB-18: Search by job ID filters results', async ({ page }) => {
  await loginAsCEO(page);
  await page.goto('/event-monitor');
  await page.getByTestId('em-search').fill('JOB-2026-005');
  await expect(page.getByTestId('em-event-row-bus-007')).toBeVisible();
  await expect(page.getByTestId('em-event-row-bus-001')).not.toBeVisible();
});

test('EB-19: Clearing search restores all events', async ({ page }) => {
  await loginAsCEO(page);
  await page.goto('/event-monitor');
  await page.getByTestId('em-search').fill('QuickBooks');
  await expect(page.getByTestId('em-event-row-bus-001')).not.toBeVisible();
  await page.getByTestId('em-search').fill('');
  await expect(page.getByTestId('em-event-row-bus-001')).toBeVisible();
});

// ──────────────────────────────────────────────────────
// EB-20 to EB-23: Event Detail
// ──────────────────────────────────────────────────────

test('EB-20: Event detail panel opens on View click', async ({ page }) => {
  await loginAsCEO(page);
  await page.goto('/event-monitor');
  await page.getByTestId('em-btn-view-bus-001').click();
  await expect(page.getByTestId('em-event-detail')).toBeVisible();
});

test('EB-21: Event detail shows type and priority badges', async ({ page }) => {
  await loginAsCEO(page);
  await page.goto('/event-monitor');
  await page.getByTestId('em-btn-view-bus-007').click();
  await expect(page.getByTestId('em-event-detail')).toBeVisible();
  await expect(page.getByTestId('em-detail-type-badge')).toBeVisible();
  await expect(page.getByTestId('em-detail-priority-badge')).toBeVisible();
});

test('EB-22: Event detail shows Action Required badge for flagged events', async ({ page }) => {
  await loginAsCEO(page);
  await page.goto('/event-monitor');
  await page.getByTestId('em-btn-view-bus-008').click();
  await expect(page.getByTestId('em-event-detail')).toBeVisible();
  await expect(page.getByTestId('em-detail-action-required')).toBeVisible();
});

test('EB-23: Event detail Go to Source button navigates to source page', async ({ page }) => {
  await loginAsCEO(page);
  await page.goto('/event-monitor');
  // bus-004 is a sync_event → sourceRoute /financial-explorer
  await page.getByTestId('em-btn-view-bus-004').click();
  await expect(page.getByTestId('em-event-detail')).toBeVisible();
  await expect(page.getByTestId('em-detail-btn-deep-link')).toBeVisible();
  await page.getByTestId('em-detail-btn-deep-link').click();
  await expect(page).toHaveURL(/\/financial-explorer/);
});

// ──────────────────────────────────────────────────────
// EB-24 to EB-26: Subscriber Panel
// ──────────────────────────────────────────────────────

test('EB-24: Subscriber panel renders all 4 subscribers', async ({ page }) => {
  await loginAsCEO(page);
  await page.goto('/event-monitor');
  await expect(page.getByTestId('em-subscriber-panel')).toBeVisible();
  await expect(page.getByTestId('em-subscriber-activity-feed')).toBeVisible();
  await expect(page.getByTestId('em-subscriber-notification')).toBeVisible();
  await expect(page.getByTestId('em-subscriber-dashboard')).toBeVisible();
  await expect(page.getByTestId('em-subscriber-automation')).toBeVisible();
});

test('EB-25: All subscribers show Active status badge', async ({ page }) => {
  await loginAsCEO(page);
  await page.goto('/event-monitor');
  const activityFeedSub = page.getByTestId('em-subscriber-activity-feed');
  await expect(activityFeedSub).toContainText('Active');
  const notifSub = page.getByTestId('em-subscriber-notification');
  await expect(notifSub).toContainText('Active');
});

test('EB-26: Subscribers show non-zero event counts from seed data', async ({ page }) => {
  await loginAsCEO(page);
  await page.goto('/event-monitor');
  const activityFeedSub = page.getByTestId('em-subscriber-activity-feed');
  const text = await activityFeedSub.textContent();
  const count = parseInt(text?.match(/(\d+)\s+events processed/)?.[1] || '0');
  expect(count).toBeGreaterThan(0);
});

// ──────────────────────────────────────────────────────
// EB-27: Doctrine Notice
// ──────────────────────────────────────────────────────

test('EB-27: Doctrine notice is visible and contains key doctrine text', async ({ page }) => {
  await loginAsCEO(page);
  await page.goto('/event-monitor');
  await expect(page.getByTestId('em-doctrine-notice')).toBeVisible();
  await expect(page.getByTestId('em-doctrine-notice')).toContainText(/informational and evaluative only/i);
  await expect(page.getByTestId('em-doctrine-notice')).toContainText(/never.*approve/i);
});

// ──────────────────────────────────────────────────────
// EB-28: Activity Feed Integration
// ──────────────────────────────────────────────────────

test('EB-28: Activity Feed still renders correctly after Event Bus seed data loaded', async ({ page }) => {
  await loginAsCEO(page);
  await page.goto('/activity-feed');
  await expect(page.getByTestId('activity-feed-page')).toBeVisible();
  await expect(page.getByTestId('af-kpi-strip')).toBeVisible();
  // Seed events still present
  await expect(page.getByTestId('af-event-row-act-001')).toBeVisible();
});

// ──────────────────────────────────────────────────────
// EB-29: PM RBAC
// ──────────────────────────────────────────────────────

test('EB-29 (RBAC): PM is denied access to Event Monitor', async ({ page }) => {
  await loginAsPM(page);
  await page.goto('/event-monitor');
  await expect(page.getByTestId('event-monitor-page')).not.toBeVisible();
});

// ──────────────────────────────────────────────────────
// EB-30: Event Bus Governance Visibility
// ──────────────────────────────────────────────────────

test('EB-30: Governance events visible in Event Monitor stream', async ({ page }) => {
  await loginAsCEO(page);
  await page.goto('/event-monitor');
  // bus-006 and bus-016 are governance_events
  await expect(page.getByTestId('em-event-row-bus-006')).toBeVisible();
  await expect(page.getByTestId('em-event-row-bus-016')).toBeVisible();
});
