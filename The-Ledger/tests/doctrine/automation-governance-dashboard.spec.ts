/**
 * DOCTRINE TEST: Automation Hub — Governance Dashboard (UX-6.6)
 *
 * Validates the read-only Governance tab on /automations: KPI overview, risk
 * distribution, governance attention queue, financial safety monitoring,
 * trend insights, and the informational governance detail dialog. Governance
 * workflows and authority are unchanged (they remain in the Governance Centre).
 *
 * Deterministic seed (6 governance records):
 *   compliant=3, requiresReview=2, restricted=1, suspended=0, high=1, critical=1.
 *   exceptions=4. Risk: Low 3, Medium 1, High 1, Critical 1.
 *   Attention queue = rule-003, rule-004, rule-005 (3).
 *   Financially sensitive=2, approval-protected=2, governed schedules=2.
 */
import { test, expect } from '@playwright/test';
import { loginAsCEO } from '../helpers/login';
import { clearBrowserState } from '../helpers/state';

test.beforeEach(async ({ page }) => {
  await clearBrowserState(page);
  await loginAsCEO(page);
  await page.goto('/automations');
  await page.getByTestId('aut-tab-governance').click();
});

// ── Render + KPIs ────────────────────────────────────────────

test('GOV-01: Governance dashboard and KPI strip render', async ({ page }) => {
  await expect(page.getByTestId('aut-governance-panel')).toBeVisible();
  await expect(page.getByTestId('aut-governance-dashboard')).toBeVisible();
  await expect(page.getByTestId('aut-gov-kpi-strip')).toBeVisible();
});

test('GOV-02: KPI values match the governance summary', async ({ page }) => {
  await expect(page.getByTestId('aut-gov-kpi-total')).toHaveText('6');
  await expect(page.getByTestId('aut-gov-kpi-compliant')).toHaveText('3');
  await expect(page.getByTestId('aut-gov-kpi-review')).toHaveText('2');
  await expect(page.getByTestId('aut-gov-kpi-restricted')).toHaveText('1');
  await expect(page.getByTestId('aut-gov-kpi-suspended')).toHaveText('0');
  await expect(page.getByTestId('aut-gov-kpi-high')).toHaveText('1');
  await expect(page.getByTestId('aut-gov-kpi-critical')).toHaveText('1');
  await expect(page.getByTestId('aut-gov-kpi-exceptions')).toHaveText('4');
});

// ── Risk distribution ────────────────────────────────────────

test('GOV-03: Risk distribution renders all four levels with counts', async ({ page }) => {
  await expect(page.getByTestId('aut-gov-risk-distribution')).toBeVisible();
  await expect(page.getByTestId('aut-gov-risk-count-Low')).toHaveText('3');
  await expect(page.getByTestId('aut-gov-risk-count-Medium')).toHaveText('1');
  await expect(page.getByTestId('aut-gov-risk-count-High')).toHaveText('1');
  await expect(page.getByTestId('aut-gov-risk-count-Critical')).toHaveText('1');
});

// ── Financial safety ─────────────────────────────────────────

test('GOV-04: Financial safety monitoring renders expected counts', async ({ page }) => {
  await expect(page.getByTestId('aut-gov-financial-safety')).toBeVisible();
  await expect(page.getByTestId('aut-gov-fin-sensitive')).toHaveText('2');
  await expect(page.getByTestId('aut-gov-fin-protected')).toHaveText('2');
  await expect(page.getByTestId('aut-gov-fin-schedules')).toHaveText('2');
  await expect(page.getByTestId('aut-gov-fin-highrisk')).toHaveText('2');
});

// ── Attention queue ──────────────────────────────────────────

test('GOV-05: Attention queue lists the three flagged automations', async ({ page }) => {
  await expect(page.getByTestId('aut-gov-attention-queue')).toBeVisible();
  await expect(page.getByTestId('aut-gov-attention-row-rule-003')).toBeVisible();
  await expect(page.getByTestId('aut-gov-attention-row-rule-004')).toBeVisible();
  await expect(page.getByTestId('aut-gov-attention-row-rule-005')).toBeVisible();
});

test('GOV-06: Attention queue is risk-sorted (critical rule-004 first)', async ({ page }) => {
  const first = page.locator('[data-testid^="aut-gov-attention-row-"]').first();
  await expect(first).toHaveAttribute('data-testid', 'aut-gov-attention-row-rule-004');
});

// ── Trend insights ───────────────────────────────────────────

test('GOV-07: Trend insights render with a Requires Review line', async ({ page }) => {
  await expect(page.getByTestId('aut-gov-insights')).toBeVisible();
  await expect(page.getByTestId('aut-gov-insight-0')).toContainText('Requires Review');
});

// ── Detail dialog (informational) ────────────────────────────

test('GOV-08: Governance detail dialog surfaces assessment + history + exceptions', async ({ page }) => {
  await page.getByTestId('aut-gov-btn-view-rule-003').click();
  await expect(page.getByTestId('aut-gov-detail-dialog')).toBeVisible();
  await expect(page.getByTestId('aut-gov-detail-assessment')).toBeVisible();
  await expect(page.getByTestId('aut-gov-detail-history')).toBeVisible();
  await expect(page.getByTestId('aut-gov-detail-exceptions')).toBeVisible();
});

test('GOV-09: Detail dialog is read-only (carries the authority notice)', async ({ page }) => {
  await page.getByTestId('aut-gov-btn-view-rule-004').click();
  await expect(page.getByTestId('aut-gov-detail-readonly')).toContainText('final authority');
});

// ── Integration / non-regression ─────────────────────────────

test('GOV-10: Governance Centre link is present and existing tabs remain intact', async ({ page }) => {
  await expect(page.getByTestId('aut-gov-centre-link')).toHaveAttribute('href', '/automation-governance');
  await page.getByTestId('aut-tab-rules').click();
  await expect(page.getByTestId('aut-rules-table')).toBeVisible();
});
