/**
 * DOCTRINE TEST: Automation Hub — Executive Dashboard (UX-6.1)
 *
 * Validates the read-only executive overview added to the top of the
 * Automation Hub (/automations).
 *
 * Coverage:
 *   - Executive dashboard + all panels render (Health, Last 24h, Requires Attention)
 *   - Enhanced 8-tile KPI strip renders with deterministic seed-derived values
 *   - Automation Health score + band + explanation render with stable values
 *   - Requires Attention surfaces governance items
 *   - Legacy KPI strip is preserved (additive change, no regression)
 *   - Doctrine: read-only — no action buttons in the dashboard
 *   - RBAC: CEO allowed; PM and Worker denied
 *
 * Deterministic seed values (governance + scheduler + audit engines):
 *   total=6, active=4, paused(schedules)=1, disabled=1
 *   executions: total=102, successful=96, blocked=3, failed=3 → success rate 94%
 *   high-risk/sensitive=2; health score=82 ("Good")
 */
import { test, expect } from '@playwright/test';
import { loginAsCEO, loginAsPM, loginAsWorker } from '../helpers/login';
import { clearBrowserState } from '../helpers/state';

test.beforeEach(async ({ page }) => {
  await clearBrowserState(page);
});

// ── Dashboard render ─────────────────────────────────────────

test('AED-01: Executive dashboard renders for CEO', async ({ page }) => {
  await loginAsCEO(page);
  await page.goto('/automations');
  await expect(page.getByTestId('aut-executive-dashboard')).toBeVisible();
});

test('AED-02: All three executive panels render', async ({ page }) => {
  await loginAsCEO(page);
  await page.goto('/automations');
  await expect(page.getByTestId('aut-health-card')).toBeVisible();
  await expect(page.getByTestId('aut-last24h-card')).toBeVisible();
  await expect(page.getByTestId('aut-attention-card')).toBeVisible();
});

// ── Automation Health ────────────────────────────────────────

test('AED-03: Health card shows score, band and explanation', async ({ page }) => {
  await loginAsCEO(page);
  await page.goto('/automations');
  await expect(page.getByTestId('aut-health-score')).toBeVisible();
  await expect(page.getByTestId('aut-health-band')).toBeVisible();
  await expect(page.getByTestId('aut-health-explanation')).toBeVisible();
});

test('AED-04: Health score is the deterministic 82% / Good', async ({ page }) => {
  await loginAsCEO(page);
  await page.goto('/automations');
  await expect(page.getByTestId('aut-health-score')).toHaveText('82%');
  await expect(page.getByTestId('aut-health-band')).toHaveText('Good');
});

// ── Enhanced KPI strip ───────────────────────────────────────

test('AED-05: Enhanced KPI strip renders all eight tiles', async ({ page }) => {
  await loginAsCEO(page);
  await page.goto('/automations');
  await expect(page.getByTestId('aut-exec-kpi-strip')).toBeVisible();
  for (const id of [
    'aut-exec-kpi-total', 'aut-exec-kpi-active', 'aut-exec-kpi-paused', 'aut-exec-kpi-disabled',
    'aut-exec-kpi-success-rate', 'aut-exec-kpi-failed', 'aut-exec-kpi-blocked', 'aut-exec-kpi-high-risk',
  ]) {
    await expect(page.getByTestId(id)).toBeVisible();
  }
});

test('AED-06: KPI values match seed-derived expectations', async ({ page }) => {
  await loginAsCEO(page);
  await page.goto('/automations');
  await expect(page.getByTestId('aut-exec-kpi-total')).toHaveText('6');
  await expect(page.getByTestId('aut-exec-kpi-active')).toHaveText('4');
  await expect(page.getByTestId('aut-exec-kpi-paused')).toHaveText('1');
  await expect(page.getByTestId('aut-exec-kpi-disabled')).toHaveText('1');
  await expect(page.getByTestId('aut-exec-kpi-success-rate')).toHaveText('94%');
  await expect(page.getByTestId('aut-exec-kpi-failed')).toHaveText('3');
  await expect(page.getByTestId('aut-exec-kpi-blocked')).toHaveText('3');
  await expect(page.getByTestId('aut-exec-kpi-high-risk')).toHaveText('2');
});

// ── Last 24 Hours ────────────────────────────────────────────

test('AED-07: Last 24h panel renders all four metrics', async ({ page }) => {
  await loginAsCEO(page);
  await page.goto('/automations');
  for (const id of ['aut-24h-completed', 'aut-24h-failures', 'aut-24h-blocks', 'aut-24h-interventions']) {
    await expect(page.getByTestId(id)).toBeVisible();
  }
});

// ── Requires Attention ───────────────────────────────────────

test('AED-08: Requires Attention surfaces governance items', async ({ page }) => {
  await loginAsCEO(page);
  await page.goto('/automations');
  // Seed data has failures, restricted rules, high-risk reviews, protected schedules, exceptions.
  await expect(page.getByTestId('aut-attention-item-failed')).toBeVisible();
  await expect(page.getByTestId('aut-attention-item-high-risk')).toBeVisible();
  await expect(page.getByTestId('aut-attention-item-restricted')).toBeVisible();
});

// ── Non-regression: legacy strip preserved ───────────────────

test('AED-09: Legacy KPI strip is preserved (additive change)', async ({ page }) => {
  await loginAsCEO(page);
  await page.goto('/automations');
  await expect(page.getByTestId('aut-kpi-strip')).toBeVisible();
  await expect(page.getByTestId('aut-kpi-total')).toHaveText('6');
});

// ── Doctrine: read-only ──────────────────────────────────────

test('AED-10: Executive dashboard contains no action buttons', async ({ page }) => {
  await loginAsCEO(page);
  await page.goto('/automations');
  const buttons = page.getByTestId('aut-executive-dashboard').getByRole('button');
  await expect(buttons).toHaveCount(0);
});

// ── RBAC ─────────────────────────────────────────────────────

test('AED-11: PM is denied the Automation Hub (and its dashboard)', async ({ page }) => {
  await loginAsPM(page);
  await page.goto('/automations');
  await expect(page.getByTestId('aut-executive-dashboard')).not.toBeVisible();
});

test('AED-12: Worker is denied the Automation Hub (and its dashboard)', async ({ page }) => {
  await loginAsWorker(page);
  await page.goto('/automations');
  await expect(page.getByTestId('aut-executive-dashboard')).not.toBeVisible();
});
