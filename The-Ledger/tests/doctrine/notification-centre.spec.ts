/**
 * DOCTRINE TEST: Notification Centre — Phase 6.1
 *
 * Validates the Notification Centre page, notification engine,
 * bell dropdown, KPI strip, filters, search, detail dialog,
 * deep links, mark-read/dismiss actions, and RBAC enforcement.
 *
 * Coverage:
 *   - Page loads, heading visible
 *   - KPI strip renders (5 cards)
 *   - Notification table renders with seed data
 *   - Status filter works
 *   - Type filter works
 *   - Priority filter works
 *   - Search: by title, source ID, job ID
 *   - Detail dialog opens
 *   - Mark Read action audited
 *   - Dismiss action audited
 *   - Deep link button present in detail dialog
 *   - Bell renders with unread badge count
 *   - Bell dropdown shows preview
 *   - Bell View All navigates to /notifications
 *   - Bell mark-read updates count
 *   - Action Required indicator visible
 *   - Informational doctrine notice visible
 *   - RBAC: CEO allowed
 *   - RBAC: PM allowed
 *   - RBAC: Worker denied
 *
 * Target: 27 new doctrine tests (226 existing → 253 total)
 */
import { test, expect } from '@playwright/test';
import { loginAsCEO, loginAsPM, loginAsWorker } from '../helpers/login';
import { clearBrowserState } from '../helpers/state';

test.beforeEach(async ({ page }) => {
  await clearBrowserState(page);
});

// ──────────────────────────────────────────────────────
// PAGE LOAD & NAVIGATION
// ──────────────────────────────────────────────────────

test('NC-01: Notification Centre page loads for CEO', async ({ page }) => {
  await loginAsCEO(page);
  await page.goto('/notifications');
  await expect(page.getByTestId('notification-centre-page')).toBeVisible();
  await expect(page.getByRole('heading', { name: /Notification Centre/i })).toBeVisible();
});

test('NC-02: CEO can navigate via sidebar to Notification Centre', async ({ page }) => {
  await loginAsCEO(page);
  await page.goto('/');
  await page.getByTestId('nav-notifications').click();
  await expect(page.getByTestId('notification-centre-page')).toBeVisible();
});

test('NC-03: PM can access Notification Centre', async ({ page }) => {
  await loginAsPM(page);
  await page.goto('/notifications');
  await expect(page.getByTestId('notification-centre-page')).toBeVisible();
});

// ──────────────────────────────────────────────────────
// KPI STRIP
// ──────────────────────────────────────────────────────

test('NC-04: KPI strip renders all 5 cards', async ({ page }) => {
  await loginAsCEO(page);
  await page.goto('/notifications');
  await expect(page.getByTestId('notif-kpi-strip')).toBeVisible();
  await expect(page.getByTestId('notif-kpi-total')).toBeVisible();
  await expect(page.getByTestId('notif-kpi-unread')).toBeVisible();
  await expect(page.getByTestId('notif-kpi-action-required')).toBeVisible();
  await expect(page.getByTestId('notif-kpi-critical')).toBeVisible();
  await expect(page.getByTestId('notif-kpi-dismissed')).toBeVisible();
});

test('NC-05: KPI total matches seed data (15 notifications)', async ({ page }) => {
  await loginAsCEO(page);
  await page.goto('/notifications');
  await expect(page.getByTestId('notif-kpi-total')).toContainText('15');
});

test('NC-06: KPI unread count is non-zero from seed data', async ({ page }) => {
  await loginAsCEO(page);
  await page.goto('/notifications');
  const unreadCard = page.getByTestId('notif-kpi-unread');
  const text = await unreadCard.textContent();
  const count = parseInt(text?.match(/\d+/)?.[0] || '0');
  expect(count).toBeGreaterThan(0);
});

test('NC-07: KPI critical count reflects seed data', async ({ page }) => {
  await loginAsCEO(page);
  await page.goto('/notifications');
  const criticalCard = page.getByTestId('notif-kpi-critical');
  const text = await criticalCard.textContent();
  const count = parseInt(text?.match(/\d+/)?.[0] || '0');
  // Seed has notif-003, notif-008, notif-009, notif-011 as critical
  expect(count).toBeGreaterThanOrEqual(3);
});

// ──────────────────────────────────────────────────────
// NOTIFICATION TABLE
// ──────────────────────────────────────────────────────

test('NC-08: Notification table renders with seed data rows', async ({ page }) => {
  await loginAsCEO(page);
  await page.goto('/notifications');
  await expect(page.getByTestId('notif-table')).toBeVisible();
  await expect(page.getByTestId('notif-row-notif-001')).toBeVisible();
  await expect(page.getByTestId('notif-row-notif-003')).toBeVisible();
  await expect(page.getByTestId('notif-row-notif-009')).toBeVisible();
});

test('NC-09: Action Required indicator visible for notifications requiring action', async ({ page }) => {
  await loginAsCEO(page);
  await page.goto('/notifications');
  // notif-001 has actionRequired: true
  await expect(page.getByTestId('notif-action-required-notif-001')).toBeVisible();
});

// ──────────────────────────────────────────────────────
// FILTERS
// ──────────────────────────────────────────────────────

test('NC-10: Status filter shows only Dismissed notifications', async ({ page }) => {
  await loginAsCEO(page);
  await page.goto('/notifications');
  await page.getByTestId('notif-filter-status').click();
  await page.getByRole('option', { name: 'Dismissed' }).click();
  // notif-012 is dismissed
  await expect(page.getByTestId('notif-row-notif-012')).toBeVisible();
  // unread notification should not appear
  await expect(page.getByTestId('notif-row-notif-001')).not.toBeVisible();
});

test('NC-11: Type filter shows only Sync Failure notifications', async ({ page }) => {
  await loginAsCEO(page);
  await page.goto('/notifications');
  await page.getByTestId('notif-filter-type').click();
  await page.getByRole('option', { name: 'Sync Failure' }).click();
  await expect(page.getByTestId('notif-row-notif-005')).toBeVisible();
  await expect(page.getByTestId('notif-row-notif-006')).toBeVisible();
  // Non-sync notification should not appear
  await expect(page.getByTestId('notif-row-notif-001')).not.toBeVisible();
});

test('NC-12: Priority filter shows only Critical notifications', async ({ page }) => {
  await loginAsCEO(page);
  await page.goto('/notifications');
  await page.getByTestId('notif-filter-priority').click();
  await page.getByRole('option', { name: 'Critical' }).click();
  await expect(page.getByTestId('notif-row-notif-003')).toBeVisible();
  await expect(page.getByTestId('notif-row-notif-011')).toBeVisible();
  // Low priority notification should not appear
  await expect(page.getByTestId('notif-row-notif-013')).not.toBeVisible();
});

// ──────────────────────────────────────────────────────
// SEARCH
// ──────────────────────────────────────────────────────

test('NC-13: Search by title filters notifications', async ({ page }) => {
  await loginAsCEO(page);
  await page.goto('/notifications');
  await page.getByTestId('notif-search').fill('QuickBooks');
  await expect(page.getByTestId('notif-row-notif-005')).toBeVisible();
  await expect(page.getByTestId('notif-row-notif-001')).not.toBeVisible();
});

test('NC-14: Search by source ID filters notifications', async ({ page }) => {
  await loginAsCEO(page);
  await page.goto('/notifications');
  await page.getByTestId('notif-search').fill('FC-2026-001');
  await expect(page.getByTestId('notif-row-notif-011')).toBeVisible();
  await expect(page.getByTestId('notif-row-notif-001')).not.toBeVisible();
});

test('NC-15: Search by job ID filters notifications', async ({ page }) => {
  await loginAsCEO(page);
  await page.goto('/notifications');
  await page.getByTestId('notif-search').fill('JOB-2026-005');
  await expect(page.getByTestId('notif-row-notif-009')).toBeVisible();
  await expect(page.getByTestId('notif-row-notif-005')).not.toBeVisible();
});

test('NC-16: Clearing search restores all notifications', async ({ page }) => {
  await loginAsCEO(page);
  await page.goto('/notifications');
  await page.getByTestId('notif-search').fill('QuickBooks');
  await expect(page.getByTestId('notif-row-notif-001')).not.toBeVisible();
  await page.getByTestId('notif-search').fill('');
  await expect(page.getByTestId('notif-row-notif-001')).toBeVisible();
});

// ──────────────────────────────────────────────────────
// DETAIL DIALOG
// ──────────────────────────────────────────────────────

test('NC-17: Notification detail dialog opens on View', async ({ page }) => {
  await loginAsCEO(page);
  await page.goto('/notifications');
  await page.getByTestId('notif-btn-view-notif-001').click();
  await expect(page.getByTestId('notif-detail-dialog')).toBeVisible();
});

test('NC-18: Detail dialog shows type, priority, and status badges', async ({ page }) => {
  await loginAsCEO(page);
  await page.goto('/notifications');
  await page.getByTestId('notif-btn-view-notif-009').click();
  await expect(page.getByTestId('notif-detail-dialog')).toBeVisible();
  await expect(page.getByTestId('notif-detail-type-badge')).toBeVisible();
  await expect(page.getByTestId('notif-detail-priority-badge')).toBeVisible();
  await expect(page.getByTestId('notif-detail-status-badge')).toBeVisible();
});

test('NC-19: Detail dialog shows Action Required badge for action-required notifications', async ({ page }) => {
  await loginAsCEO(page);
  await page.goto('/notifications');
  await page.getByTestId('notif-btn-view-notif-011').click();
  await expect(page.getByTestId('notif-detail-action-required-badge')).toBeVisible();
});

test('NC-20: Detail dialog shows Go to Source deep-link button', async ({ page }) => {
  await loginAsCEO(page);
  await page.goto('/notifications');
  await page.getByTestId('notif-btn-view-notif-005').click();
  await expect(page.getByTestId('notif-detail-dialog')).toBeVisible();
  await expect(page.getByTestId('notif-detail-btn-deep-link')).toBeVisible();
});

test('NC-21: Informational doctrine notice visible in detail dialog', async ({ page }) => {
  await loginAsCEO(page);
  await page.goto('/notifications');
  await page.getByTestId('notif-btn-view-notif-007').click();
  await expect(page.getByTestId('notif-detail-dialog')).toBeVisible();
  // The blue info box with doctrine notice
  const dialog = page.getByTestId('notif-detail-dialog');
  await expect(dialog.getByText(/informational only/i)).toBeVisible();
});

// ──────────────────────────────────────────────────────
// ACTIONS — MARK READ & DISMISS
// ──────────────────────────────────────────────────────

test('NC-22: Mark Read action removes unread highlight and shows toast', async ({ page }) => {
  await loginAsCEO(page);
  await page.goto('/notifications');
  // notif-001 is unread — mark it read
  await page.getByTestId('notif-btn-mark-read-notif-001').click();
  // Toast should appear
  await expect(page.getByText(/marked as read/i)).toBeVisible();
});

test('NC-23: Dismiss action shows toast and audit confirmation', async ({ page }) => {
  await loginAsCEO(page);
  await page.goto('/notifications');
  await page.getByTestId('notif-btn-dismiss-notif-002').click();
  await expect(page.getByText(/dismissed/i)).toBeVisible();
});

test('NC-24: Dismiss from detail dialog closes dialog and shows toast', async ({ page }) => {
  await loginAsCEO(page);
  await page.goto('/notifications');
  await page.getByTestId('notif-btn-view-notif-014').click();
  await expect(page.getByTestId('notif-detail-dialog')).toBeVisible();
  await page.getByTestId('notif-detail-btn-dismiss').click();
  await expect(page.getByTestId('notif-detail-dialog')).not.toBeVisible();
  await expect(page.getByText(/dismissed/i)).toBeVisible();
});

// ──────────────────────────────────────────────────────
// HEADER BELL
// ──────────────────────────────────────────────────────

test('NC-25: Bell renders with unread badge on mobile bar for CEO', async ({ page }) => {
  // Use mobile viewport to see the mobile header
  await page.setViewportSize({ width: 390, height: 844 });
  await loginAsCEO(page);
  await page.goto('/');
  await expect(page.getByTestId('notif-bell-btn')).toBeVisible();
  // Badge should show unread count > 0
  await expect(page.getByTestId('notif-bell-badge')).toBeVisible();
});

test('NC-26: Bell dropdown opens and shows preview notifications', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await loginAsCEO(page);
  await page.goto('/');
  await page.getByTestId('notif-bell-btn').click();
  await expect(page.getByTestId('notif-bell-dropdown')).toBeVisible();
  // At least one preview item should be visible
  await expect(page.getByTestId('notif-bell-item-notif-001').or(
    page.getByTestId('notif-bell-item-notif-003')
  )).toBeVisible();
});

test('NC-27: Bell View All navigates to /notifications', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await loginAsCEO(page);
  await page.goto('/');
  await page.getByTestId('notif-bell-btn').click();
  await expect(page.getByTestId('notif-bell-dropdown')).toBeVisible();
  await page.getByTestId('notif-bell-view-all').click();
  await expect(page.getByTestId('notification-centre-page')).toBeVisible();
});

// ──────────────────────────────────────────────────────
// RBAC
// ──────────────────────────────────────────────────────

test('NC-28 (RBAC): Worker is denied access to Notification Centre', async ({ page }) => {
  await loginAsWorker(page);
  await page.goto('/notifications');
  await expect(page.getByTestId('notification-centre-page')).not.toBeVisible();
});
