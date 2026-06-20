/**
 * DOCTRINE TEST: Automation Hub — Audit Centre (UX-6.7)
 *
 * Validates the unified, read-only Audit Centre tab on /automations: executive
 * KPI dashboard, unified activity feed, search, combinable filters, timeline
 * view, and the immutable audit detail dialog. Audit generation is unchanged.
 *
 * Deterministic unified feed at load (no runtime mutations):
 *   rule lifecycle = 6, execution = 5, scheduler = 5, governance = 4,
 *   exceptions = 4  →  total = 24.
 *   approval-blocked = 1 (audit-seed-004).
 */
import { test, expect } from '@playwright/test';
import { loginAsCEO } from '../helpers/login';
import { clearBrowserState } from '../helpers/state';

const ROW = '[data-testid^="aut-audc-row-"]';

test.beforeEach(async ({ page }) => {
  await clearBrowserState(page);
  await loginAsCEO(page);
  await page.goto('/automations');
  await page.getByTestId('aut-tab-audit-centre').click();
});

// ── Dashboard / KPIs ─────────────────────────────────────────

test('AUDC-01: Audit Centre panel and KPI strip render', async ({ page }) => {
  await expect(page.getByTestId('aut-audit-centre-panel')).toBeVisible();
  await expect(page.getByTestId('aut-audit-centre')).toBeVisible();
  await expect(page.getByTestId('aut-audc-kpi-strip')).toBeVisible();
});

test('AUDC-02: KPI values match the unified feed', async ({ page }) => {
  await expect(page.getByTestId('aut-audc-kpi-total')).toHaveText('24');
  await expect(page.getByTestId('aut-audc-kpi-rules')).toHaveText('6');
  await expect(page.getByTestId('aut-audc-kpi-schedules')).toHaveText('5');
  await expect(page.getByTestId('aut-audc-kpi-governance')).toHaveText('4');
  await expect(page.getByTestId('aut-audc-kpi-executions')).toHaveText('5');
  await expect(page.getByTestId('aut-audc-kpi-blocked')).toHaveText('1');
  await expect(page.getByTestId('aut-audc-kpi-exceptions')).toHaveText('4');
});

// ── Feed ─────────────────────────────────────────────────────

test('AUDC-03: Unified feed renders rows', async ({ page }) => {
  await expect(page.getByTestId('aut-audc-feed')).toBeVisible();
  // 24 events, first page is 25 → all visible.
  await expect(page.locator(ROW)).toHaveCount(24);
});

test('AUDC-04: Immutable audit notice present', async ({ page }) => {
  await expect(page.getByTestId('aut-audit-centre')).toContainText('cannot be edited, deleted, or suppressed');
});

// ── Search ───────────────────────────────────────────────────

test('AUDC-05: Search by user filters across sources', async ({ page }) => {
  await page.getByTestId('aut-audc-search').fill('Sarah Chen');
  // Cross-source match: Sarah Chen created rule-005 + rule-006 (Rule Created)
  // and initiated one execution (audit-seed-003) → 3 events from two sources.
  await expect(page.locator(ROW)).toHaveCount(3);
});

test('AUDC-06: Search by event type works', async ({ page }) => {
  await page.getByTestId('aut-audc-search').fill('Exception Raised');
  await expect(page.locator(ROW)).toHaveCount(4);
});

// ── Filters ──────────────────────────────────────────────────

test('AUDC-07: Category filter (Governance) shows four', async ({ page }) => {
  await page.getByTestId('aut-audc-filter-category').selectOption('Governance');
  await expect(page.locator(ROW)).toHaveCount(4);
});

test('AUDC-08: Category filter (Automation) shows six rule events', async ({ page }) => {
  await page.getByTestId('aut-audc-filter-category').selectOption('Automation');
  await expect(page.locator(ROW)).toHaveCount(6);
});

test('AUDC-09: Risk filter and sensitive toggle combine cleanly', async ({ page }) => {
  await page.getByTestId('aut-audc-filter-risk').selectOption('Critical');
  await page.getByTestId('aut-audc-toggle-sensitive').click();
  // Critical-risk events all belong to financially sensitive rule-004.
  await expect(page.locator(ROW).first()).toBeVisible();
  const count = await page.locator(ROW).count();
  expect(count).toBeGreaterThan(0);
});

test('AUDC-10: Exception category + count badge reflect filtering', async ({ page }) => {
  await page.getByTestId('aut-audc-filter-category').selectOption('Exception');
  await expect(page.getByTestId('aut-audc-count')).toContainText('4 of 24');
});

// ── Timeline ─────────────────────────────────────────────────

test('AUDC-11: Timeline view renders chronological day groups', async ({ page }) => {
  await page.getByTestId('aut-audc-view-timeline').click();
  await expect(page.getByTestId('aut-audc-timeline')).toBeVisible();
  await expect(page.locator('[data-testid="aut-audc-timeline-day"]').first()).toBeVisible();
});

// ── Detail dialog ────────────────────────────────────────────

test('AUDC-12: Audit detail dialog opens and is immutable/read-only', async ({ page }) => {
  await page.getByTestId('aut-audc-search').fill('Exception Raised');
  await page.locator('[data-testid^="aut-audc-btn-view-"]').first().click();
  await expect(page.getByTestId('aut-audc-detail-dialog')).toBeVisible();
  await expect(page.getByTestId('aut-audc-detail-immutable')).toContainText('Cannot be edited or deleted');
  await expect(page.getByTestId('aut-audc-detail-context')).toBeVisible();
});

// ── Non-regression ───────────────────────────────────────────

test('AUDC-13: Legacy Automation Audit tab remains intact', async ({ page }) => {
  await page.getByTestId('aut-tab-audit').click();
  await expect(page.getByTestId('aut-audit-table')).toBeVisible();
  await expect(page.getByTestId('aut-audit-row-audit-seed-001')).toBeVisible();
});
