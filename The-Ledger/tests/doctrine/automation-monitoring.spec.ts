/**
 * DOCTRINE TEST: Automation Hub — Execution Monitoring (UX-6.3)
 *
 * Validates the read-only Execution Monitoring tab on /automations:
 * analytics KPIs, trends, most-active ranking, recent failures,
 * approval-blocked executions, executive insights, and the enriched
 * execution detail dialog. No execution behaviour is changed.
 *
 * Deterministic seed aggregates (governance execution counts):
 *   total=102, successful=96, blocked=3, failed=3 → success 94%, failure 3%
 *   most active = rule-003 (45 runs); failures = rule-005 (3);
 *   approval-blocked execution = audit-seed-004 (rule-003).
 */
import { test, expect } from '@playwright/test';
import { loginAsCEO } from '../helpers/login';
import { clearBrowserState } from '../helpers/state';

test.beforeEach(async ({ page }) => {
  await clearBrowserState(page);
  await loginAsCEO(page);
  await page.goto('/automations');
  await page.getByTestId('aut-tab-monitoring').click();
});

// ── Dashboard / KPIs ─────────────────────────────────────────

test('MON-01: Monitoring panel and KPI strip render', async ({ page }) => {
  await expect(page.getByTestId('aut-monitoring-panel')).toBeVisible();
  await expect(page.getByTestId('aut-execution-monitor')).toBeVisible();
  await expect(page.getByTestId('aut-mon-kpi-strip')).toBeVisible();
});

test('MON-02: KPI values match seed aggregates', async ({ page }) => {
  await expect(page.getByTestId('aut-mon-kpi-total')).toHaveText('102');
  await expect(page.getByTestId('aut-mon-kpi-success')).toHaveText('96');
  await expect(page.getByTestId('aut-mon-kpi-failed')).toHaveText('3');
  await expect(page.getByTestId('aut-mon-kpi-blocked')).toHaveText('3');
  await expect(page.getByTestId('aut-mon-kpi-success-pct')).toHaveText('94%');
  await expect(page.getByTestId('aut-mon-kpi-failure-pct')).toHaveText('3%');
});

test('MON-03: Avg/day and avg completion render', async ({ page }) => {
  await expect(page.getByTestId('aut-mon-kpi-avg-day')).toBeVisible();
  await expect(page.getByTestId('aut-mon-kpi-avg-time')).toHaveText('1.2s');
});

// ── Trends ───────────────────────────────────────────────────

test('MON-04: Trends card and outcome bar render', async ({ page }) => {
  await expect(page.getByTestId('aut-mon-trends')).toBeVisible();
  await expect(page.getByTestId('aut-mon-outcome-bar')).toBeVisible();
});

test('MON-05: Recent activity list renders', async ({ page }) => {
  await expect(page.getByTestId('aut-mon-recent-activity')).toBeVisible();
  await expect(page.getByTestId('aut-mon-activity-audit-seed-003')).toBeVisible();
});

// ── Most Active ──────────────────────────────────────────────

test('MON-06: Most Active panel ranks rule-003 first', async ({ page }) => {
  await expect(page.getByTestId('aut-mon-most-active')).toBeVisible();
  await expect(page.getByTestId('aut-mon-active-row-rule-003')).toBeVisible();
  const first = page.locator('[data-testid^="aut-mon-active-row-"]').first();
  await expect(first).toHaveAttribute('data-testid', 'aut-mon-active-row-rule-003');
});

// ── Recent Failures ──────────────────────────────────────────

test('MON-07: Recent Failures surfaces rule-005 with reason and badges', async ({ page }) => {
  await expect(page.getByTestId('aut-mon-recent-failures')).toBeVisible();
  const row = page.getByTestId('aut-mon-failure-row-rule-005');
  await expect(row).toBeVisible();
  await expect(row).toContainText('failed');
});

// ── Approval-blocked ─────────────────────────────────────────

test('MON-08: Approval-blocked panel shows the blocked execution', async ({ page }) => {
  await expect(page.getByTestId('aut-mon-approval-blocked')).toBeVisible();
  await expect(page.getByTestId('aut-mon-blocked-row-audit-seed-004')).toBeVisible();
});

// ── Executive insights ───────────────────────────────────────

test('MON-09: Executive insights render with success-rate line', async ({ page }) => {
  await expect(page.getByTestId('aut-mon-insights')).toBeVisible();
  await expect(page.getByTestId('aut-mon-insight-0')).toContainText('94%');
});

// ── Execution detail dialog (enriched) ───────────────────────

test('MON-10: Clicking a blocked execution opens the enriched detail dialog', async ({ page }) => {
  await page.getByTestId('aut-mon-blocked-row-audit-seed-004').click();
  await expect(page.getByTestId('aut-execution-detail-dialog')).toBeVisible();
  await expect(page.getByTestId('aut-exec-detail-governance')).toBeVisible();
  await expect(page.getByTestId('aut-exec-detail-audit')).toBeVisible();
  await expect(page.getByTestId('aut-exec-detail-failure')).toBeVisible();
});

test('MON-11: Detail dialog from Execution History still works with new sections', async ({ page }) => {
  await page.getByTestId('aut-tab-execution-history').click();
  await page.getByTestId('aut-btn-exec-detail-audit-seed-001').click();
  await expect(page.getByTestId('aut-execution-detail-dialog')).toBeVisible();
  await expect(page.getByTestId('aut-exec-detail-actions')).toBeVisible();
  await expect(page.getByTestId('aut-exec-detail-duration')).toBeVisible();
});

// ── Non-regression ───────────────────────────────────────────

test('MON-12: Existing tabs remain present and reachable', async ({ page }) => {
  await expect(page.getByTestId('aut-tab-rules')).toBeVisible();
  await expect(page.getByTestId('aut-tab-scheduler')).toBeVisible();
  await expect(page.getByTestId('aut-tab-execution-history')).toBeVisible();
  await expect(page.getByTestId('aut-tab-audit')).toBeVisible();
});
