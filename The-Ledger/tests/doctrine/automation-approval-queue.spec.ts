/**
 * DOCTRINE TEST: Automation Hub — Approval Queue (UX-6.4)
 *
 * Validates the read-only Approval Queue tab on /automations: KPI dashboard,
 * executive attention panel, queue table, search, combinable filters, and the
 * informational detail dialog. Surfaces blocked work only — it never approves.
 *
 * Deterministic seed (6 entries, reference now = 2026-06-16T09:00Z):
 *   CEO=4, PM=2; Financial=4, Operational=1, Governance=1; High-priority=2.
 *   Oldest = AQ-2026-003 (payroll, 8d). Payroll=2, Invoice=1, Restricted=1.
 */
import { test, expect } from '@playwright/test';
import { loginAsCEO } from '../helpers/login';
import { clearBrowserState } from '../helpers/state';

const ROW = '[data-testid^="aut-aq-row-"]';

test.beforeEach(async ({ page }) => {
  await clearBrowserState(page);
  await loginAsCEO(page);
  await page.goto('/automations');
  await page.getByTestId('aut-tab-approval-queue').click();
});

// ── Render + KPIs ────────────────────────────────────────────

test('AQ-01: Approval Queue panel and KPI strip render', async ({ page }) => {
  await expect(page.getByTestId('aut-approval-queue-panel')).toBeVisible();
  await expect(page.getByTestId('aut-approval-queue')).toBeVisible();
  await expect(page.getByTestId('aut-aq-kpi-strip')).toBeVisible();
});

test('AQ-02: KPI values match the seed queue', async ({ page }) => {
  await expect(page.getByTestId('aut-aq-kpi-total')).toHaveText('6');
  await expect(page.getByTestId('aut-aq-kpi-ceo')).toHaveText('4');
  await expect(page.getByTestId('aut-aq-kpi-pm')).toHaveText('2');
  await expect(page.getByTestId('aut-aq-kpi-financial')).toHaveText('4');
  await expect(page.getByTestId('aut-aq-kpi-operational')).toHaveText('1');
});

test('AQ-03: Oldest outstanding KPI shows 8d and references AQ-2026-003', async ({ page }) => {
  await expect(page.getByTestId('aut-aq-kpi-oldest')).toHaveText('8d');
  await expect(page.getByTestId('aut-aq-kpi-avg-wait')).toBeVisible();
});

// ── Executive attention ──────────────────────────────────────

test('AQ-04: Executive attention surfaces payroll/invoice/restricted lines', async ({ page }) => {
  await expect(page.getByTestId('aut-aq-attention')).toBeVisible();
  await expect(page.getByTestId('aut-aq-attention-0')).toContainText('payroll');
  await expect(page.getByTestId('aut-aq-attention')).toContainText('invoice');
  await expect(page.getByTestId('aut-aq-attention')).toContainText('governance-restricted');
});

// ── Table + ordering ─────────────────────────────────────────

test('AQ-05: Queue table renders all six entries', async ({ page }) => {
  await expect(page.getByTestId('aut-aq-table')).toBeVisible();
  await expect(page.locator(ROW)).toHaveCount(6);
});

test('AQ-06: Inbox ordering puts the oldest high-priority item first', async ({ page }) => {
  await expect(page.locator(ROW).first()).toHaveAttribute('data-testid', 'aut-aq-row-AQ-2026-003');
});

// ── Search ───────────────────────────────────────────────────

test('AQ-07: Search by job/client filters dynamically', async ({ page }) => {
  await page.getByTestId('aut-aq-search').fill('Citywide');
  await expect(page.locator(ROW)).toHaveCount(1);
  await expect(page.getByTestId('aut-aq-row-AQ-2026-003')).toBeVisible();
});

test('AQ-08: Search by queue ID works', async ({ page }) => {
  await page.getByTestId('aut-aq-search').fill('AQ-2026-001');
  await expect(page.locator(ROW)).toHaveCount(1);
});

// ── Filters ──────────────────────────────────────────────────

test('AQ-09: Approver filter (PM) shows two', async ({ page }) => {
  await page.getByTestId('aut-aq-filter-approver').selectOption('PM');
  await expect(page.locator(ROW)).toHaveCount(2);
});

test('AQ-10: Type filter (Financial) shows four', async ({ page }) => {
  await page.getByTestId('aut-aq-filter-type').selectOption('Financial');
  await expect(page.locator(ROW)).toHaveCount(4);
});

test('AQ-11: High-priority toggle shows two', async ({ page }) => {
  await page.getByTestId('aut-aq-toggle-high').click();
  await expect(page.locator(ROW)).toHaveCount(2);
});

test('AQ-12: Governance-restricted toggle isolates AQ-2026-005', async ({ page }) => {
  await page.getByTestId('aut-aq-toggle-restricted').click();
  await expect(page.locator(ROW)).toHaveCount(1);
  await expect(page.getByTestId('aut-aq-row-AQ-2026-005')).toBeVisible();
});

test('AQ-13: Filters combine (PM approver + restricted → AQ-2026-005)', async ({ page }) => {
  await page.getByTestId('aut-aq-filter-approver').selectOption('PM');
  await page.getByTestId('aut-aq-toggle-restricted').click();
  await expect(page.locator(ROW)).toHaveCount(1);
  await expect(page.getByTestId('aut-aq-row-AQ-2026-005')).toBeVisible();
});

test('AQ-14: Financially-sensitive toggle shows four', async ({ page }) => {
  await page.getByTestId('aut-aq-toggle-sensitive').click();
  await expect(page.locator(ROW)).toHaveCount(4);
});

// ── Detail dialog ────────────────────────────────────────────

test('AQ-15: Detail dialog shows approval context and governance', async ({ page }) => {
  await page.getByTestId('aut-aq-btn-view-AQ-2026-001').click();
  await expect(page.getByTestId('aut-aq-detail-dialog')).toBeVisible();
  await expect(page.getByTestId('aut-aq-detail-trigger')).toBeVisible();
  await expect(page.getByTestId('aut-aq-detail-governance')).toBeVisible();
  await expect(page.getByTestId('aut-aq-detail-sensitive')).toBeVisible();
});

test('AQ-16: Detail dialog surfaces Review Centre reference link', async ({ page }) => {
  await page.getByTestId('aut-aq-btn-view-AQ-2026-001').click();
  await expect(page.getByTestId('aut-aq-detail-references')).toBeVisible();
  await expect(page.getByTestId('aut-aq-detail-review-link')).toBeVisible();
});

test('AQ-17: Detail dialog carries the informational doctrine notice', async ({ page }) => {
  await page.getByTestId('aut-aq-btn-view-AQ-2026-003').click();
  await expect(page.getByTestId('aut-aq-detail-doctrine')).toContainText('cannot proceed until a human approves');
});

// ── Non-regression ───────────────────────────────────────────

test('AQ-18: Existing automation tabs remain reachable', async ({ page }) => {
  await page.getByTestId('aut-tab-rules').click();
  await expect(page.getByTestId('aut-rules-table')).toBeVisible();
});
