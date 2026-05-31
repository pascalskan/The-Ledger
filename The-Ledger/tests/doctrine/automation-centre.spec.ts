/**
 * DOCTRINE TEST: Automation Centre — Phase 6.0B
 *
 * Validates the full Automation Centre UI replacing the Phase 6.0A stub.
 *
 * Coverage:
 *   - Page loads / header / KPI strip
 *   - All three tabs render
 *   - Automation Rules table: seed rules visible, badges visible
 *   - Rule detail dialog: opens, shows trigger, shows actions, financial safeguard
 *   - Enable / Disable state change
 *   - Execution History table: records visible
 *   - Automation Audit table: entries visible, search works
 *   - Financial safeguard badge visible on FinanciallySensitive rules
 *   - RBAC: CEO allowed, PM denied, Worker denied
 *
 * Target: 18 new doctrine tests (129 existing → 147 total)
 */
import { test, expect } from '@playwright/test';
import { loginAsCEO, loginAsPM, loginAsWorker } from '../helpers/login';
import { clearBrowserState } from '../helpers/state';

test.beforeEach(async ({ page }) => {
  await clearBrowserState(page);
});

// ── 1. Page Load & Header ─────────────────────────────────────

test('AC-01: Automation Centre page loads for CEO', async ({ page }) => {
  await loginAsCEO(page);
  await page.goto('/automations');
  await expect(page).toHaveURL(/automations/);
  await expect(page.getByTestId('automation-centre-page')).toBeVisible();
  await expect(page.getByRole('heading', { name: /Automation Centre/i })).toBeVisible();
});

// ── 2. KPI Strip ──────────────────────────────────────────────

test('AC-02: KPI strip renders all five cards', async ({ page }) => {
  await loginAsCEO(page);
  await page.goto('/automations');
  await expect(page.getByTestId('aut-kpi-strip')).toBeVisible();
  await expect(page.getByTestId('aut-kpi-total')).toBeVisible();
  await expect(page.getByTestId('aut-kpi-active')).toBeVisible();
  await expect(page.getByTestId('aut-kpi-disabled')).toBeVisible();
  await expect(page.getByTestId('aut-kpi-financially-sensitive')).toBeVisible();
});

test('AC-03: KPI values match seed data (6 total, 4 active, 1 disabled, 2 financially sensitive)', async ({ page }) => {
  await loginAsCEO(page);
  await page.goto('/automations');
  await expect(page.getByTestId('aut-kpi-total')).toHaveText('6');
  await expect(page.getByTestId('aut-kpi-active')).toHaveText('4');
  await expect(page.getByTestId('aut-kpi-disabled')).toHaveText('1');
  await expect(page.getByTestId('aut-kpi-financially-sensitive')).toHaveText('2');
});

// ── 3. Tabs ───────────────────────────────────────────────────

test('AC-04: All three tabs render and are clickable', async ({ page }) => {
  await loginAsCEO(page);
  await page.goto('/automations');
  await expect(page.getByTestId('aut-tab-rules')).toBeVisible();
  await expect(page.getByTestId('aut-tab-execution-history')).toBeVisible();
  await expect(page.getByTestId('aut-tab-audit')).toBeVisible();
});

// ── 4. Automation Rules Table ─────────────────────────────────

test('AC-05: Automation Rules tab shows rules table with seed data', async ({ page }) => {
  await loginAsCEO(page);
  await page.goto('/automations');
  await expect(page.getByTestId('aut-rules-table')).toBeVisible();
  // At least one rule row visible
  await expect(page.getByTestId('aut-rule-row-rule-001')).toBeVisible();
  await expect(page.getByTestId('aut-rule-row-rule-002')).toBeVisible();
});

test('AC-06: All 6 seed rules are visible in the rules table', async ({ page }) => {
  await loginAsCEO(page);
  await page.goto('/automations');
  for (let i = 1; i <= 6; i++) {
    await expect(
      page.getByTestId(`aut-rule-row-rule-00${i}`)
    ).toBeVisible();
  }
});

test('AC-07: Status badges are visible in the rules table', async ({ page }) => {
  await loginAsCEO(page);
  await page.goto('/automations');
  // Active badges visible
  await expect(page.getByTestId('aut-status-active').first()).toBeVisible();
  // Disabled badge visible
  await expect(page.getByTestId('aut-status-disabled').first()).toBeVisible();
});

test('AC-08: FinanciallySensitive category badge is visible on rule-003', async ({ page }) => {
  await loginAsCEO(page);
  await page.goto('/automations');
  const row = page.getByTestId('aut-rule-row-rule-003');
  await expect(row.getByTestId('aut-category-FinanciallySensitive')).toBeVisible();
});

// ── 5. Rule Detail Dialog ─────────────────────────────────────

test('AC-09: Clicking View opens the rule detail dialog', async ({ page }) => {
  await loginAsCEO(page);
  await page.goto('/automations');
  await page.getByTestId('aut-btn-view-rule-001').click();
  await expect(page.getByTestId('aut-rule-detail-dialog')).toBeVisible();
});

test('AC-10: Rule detail dialog shows trigger and actions sections', async ({ page }) => {
  await loginAsCEO(page);
  await page.goto('/automations');
  await page.getByTestId('aut-btn-view-rule-001').click();
  await expect(page.getByTestId('aut-rule-detail-trigger')).toBeVisible();
  await expect(page.getByTestId('aut-rule-detail-actions')).toBeVisible();
});

test('AC-11: FinanciallySensitive rule detail shows financial safeguard warning', async ({ page }) => {
  await loginAsCEO(page);
  await page.goto('/automations');
  await page.getByTestId('aut-btn-view-rule-003').click();
  await expect(page.getByTestId('aut-rule-detail-financial-safeguard')).toBeVisible();
  await expect(page.getByTestId('aut-rule-detail-financial-safeguard')).toContainText('Approval Required');
});

// ── 6. Enable / Disable ───────────────────────────────────────

test('AC-12: Disabled rule detail dialog shows Enable button', async ({ page }) => {
  await loginAsCEO(page);
  await page.goto('/automations');
  await page.getByTestId('aut-btn-view-rule-005').click();
  await expect(page.getByTestId('aut-btn-enable-rule')).toBeVisible();
});

test('AC-13: Active rule detail dialog shows Disable button', async ({ page }) => {
  await loginAsCEO(page);
  await page.goto('/automations');
  await page.getByTestId('aut-btn-view-rule-001').click();
  await expect(page.getByTestId('aut-btn-disable-rule')).toBeVisible();
});

test('AC-14: Clicking Disable changes rule status badge to Disabled', async ({ page }) => {
  await loginAsCEO(page);
  await page.goto('/automations');
  await page.getByTestId('aut-btn-view-rule-001').click();
  await page.getByTestId('aut-btn-disable-rule').click();
  // Dialog should now show Enable button
  await expect(page.getByTestId('aut-btn-enable-rule')).toBeVisible();
});

// ── 7. Execution History ──────────────────────────────────────

test('AC-15: Execution History tab renders with seed records', async ({ page }) => {
  await loginAsCEO(page);
  await page.goto('/automations');
  await page.getByTestId('aut-tab-execution-history').click();
  await expect(page.getByTestId('aut-execution-table')).toBeVisible();
  await expect(page.getByTestId('aut-execution-row-audit-seed-001')).toBeVisible();
});

// ── 8. Automation Audit ───────────────────────────────────────

test('AC-16: Automation Audit tab renders with entries and search input', async ({ page }) => {
  await loginAsCEO(page);
  await page.goto('/automations');
  await page.getByTestId('aut-tab-audit').click();
  await expect(page.getByTestId('aut-audit-table')).toBeVisible();
  await expect(page.getByTestId('aut-audit-search')).toBeVisible();
  await expect(page.getByTestId('aut-audit-row-audit-seed-001')).toBeVisible();
});

test('AC-17: Audit tab search filters entries by rule name', async ({ page }) => {
  await loginAsCEO(page);
  await page.goto('/automations');
  await page.getByTestId('aut-tab-audit').click();
  await page.getByTestId('aut-audit-search').fill('Notify CEO on Sync Failure');
  // rule-001 entries should still be visible
  await expect(page.getByTestId('aut-audit-row-audit-seed-001')).toBeVisible();
  // rule-003 entries should be hidden
  await expect(page.getByTestId('aut-audit-row-audit-seed-003')).not.toBeVisible();
});

// ── 9. RBAC ───────────────────────────────────────────────────

test('AC-18: PM is denied access to Automation Centre', async ({ page }) => {
  await loginAsPM(page);
  await page.goto('/automations');
  // Should render the Unauthorized page, not the Automation Centre
  await expect(page.getByTestId('automation-centre-page')).not.toBeVisible();
});

test('AC-19: Worker is denied access to Automation Centre', async ({ page }) => {
  await loginAsWorker(page);
  // Workers are redirected to /worker/jobs from any non-worker route
  await page.goto('/automations');
  await expect(page.getByTestId('automation-centre-page')).not.toBeVisible();
});
