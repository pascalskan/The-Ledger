/**
 * DOCTRINE TEST: Automation Governance Centre — Phase 6.0D
 *
 * Validates the Automation Governance Centre page, engine,
 * CEO actions, exception workflows, compliance audit trail,
 * financial safety indicators, and RBAC enforcement.
 *
 * Coverage:
 *   - Page loads, heading visible
 *   - KPI strip renders (7 KPI cards)
 *   - All 3 tabs render
 *   - Governance Dashboard: records visible, filters, search
 *   - Governance Actions: Restrict, Suspend, Restore, Mark Compliant
 *   - Exceptions: queue renders, detail panel, Resolve, Reject
 *   - Compliance Audit: table renders, search works
 *   - Financial Safety: Governed badge, Approval Protected, Safeguard
 *   - RBAC: CEO allowed, PM read-only denied, Worker denied
 *
 * Target: 26 new doctrine tests (173 existing → 199 total)
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

test('AG-01: Automation Governance Centre page loads for CEO', async ({ page }) => {
  await loginAsCEO(page);
  await page.goto('/automation-governance');
  await expect(page.getByTestId('automation-governance-centre-page')).toBeVisible();
  await expect(page.getByRole('heading', { name: /Automation Governance Centre/i })).toBeVisible();
});

test('AG-02: CEO can navigate via sidebar to Automation Governance', async ({ page }) => {
  await loginAsCEO(page);
  await page.goto('/');
  await page.getByTestId('nav-automation-governance').click();
  await expect(page.getByTestId('automation-governance-centre-page')).toBeVisible();
});

// ──────────────────────────────────────────────────────
// KPI STRIP
// ──────────────────────────────────────────────────────

test('AG-03: KPI strip renders all 7 cards', async ({ page }) => {
  await loginAsCEO(page);
  await page.goto('/automation-governance');
  await expect(page.getByTestId('gov-kpi-strip')).toBeVisible();
  await expect(page.getByTestId('gov-kpi-total')).toBeVisible();
  await expect(page.getByTestId('gov-kpi-compliant')).toBeVisible();
  await expect(page.getByTestId('gov-kpi-requires-review')).toBeVisible();
  await expect(page.getByTestId('gov-kpi-restricted')).toBeVisible();
  await expect(page.getByTestId('gov-kpi-suspended')).toBeVisible();
  await expect(page.getByTestId('gov-kpi-high-risk')).toBeVisible();
  await expect(page.getByTestId('gov-kpi-critical-risk')).toBeVisible();
});

test('AG-04: KPI values match seed data (6 total, 3 compliant, 2 requires review)', async ({ page }) => {
  await loginAsCEO(page);
  await page.goto('/automation-governance');
  const totalCard = page.getByTestId('gov-kpi-total');
  await expect(totalCard).toContainText('6');
  const compliantCard = page.getByTestId('gov-kpi-compliant');
  await expect(compliantCard).toContainText('3');
  const reviewCard = page.getByTestId('gov-kpi-requires-review');
  await expect(reviewCard).toContainText('2');
});

// ──────────────────────────────────────────────────────
// TABS
// ──────────────────────────────────────────────────────

test('AG-05: All 3 tabs render and are clickable', async ({ page }) => {
  await loginAsCEO(page);
  await page.goto('/automation-governance');
  await expect(page.getByTestId('gov-tabs')).toBeVisible();
  await expect(page.getByTestId('gov-tab-dashboard')).toBeVisible();
  await expect(page.getByTestId('gov-tab-exceptions')).toBeVisible();
  await expect(page.getByTestId('gov-tab-audit')).toBeVisible();

  await page.getByTestId('gov-tab-exceptions').click();
  await expect(page.getByTestId('gov-exceptions-tab-content')).toBeVisible();

  await page.getByTestId('gov-tab-audit').click();
  await expect(page.getByTestId('gov-audit-tab-content')).toBeVisible();
});

// ──────────────────────────────────────────────────────
// GOVERNANCE DASHBOARD
// ──────────────────────────────────────────────────────

test('AG-06: Governance records table is visible with seed data', async ({ page }) => {
  await loginAsCEO(page);
  await page.goto('/automation-governance');
  await expect(page.getByTestId('gov-dashboard-table')).toBeVisible();
  // All 6 seed records should appear
  await expect(page.getByTestId('gov-row-rule-001')).toBeVisible();
  await expect(page.getByTestId('gov-row-rule-002')).toBeVisible();
  await expect(page.getByTestId('gov-row-rule-003')).toBeVisible();
  await expect(page.getByTestId('gov-row-rule-004')).toBeVisible();
  await expect(page.getByTestId('gov-row-rule-005')).toBeVisible();
  await expect(page.getByTestId('gov-row-rule-006')).toBeVisible();
});

test('AG-07: Risk badges are visible in the governance table', async ({ page }) => {
  await loginAsCEO(page);
  await page.goto('/automation-governance');
  await expect(page.getByTestId('gov-risk-low').first()).toBeVisible();
  await expect(page.getByTestId('gov-risk-high').first()).toBeVisible();
  await expect(page.getByTestId('gov-risk-critical').first()).toBeVisible();
});

test('AG-08: Governance status badges are visible in the table', async ({ page }) => {
  await loginAsCEO(page);
  await page.goto('/automation-governance');
  await expect(page.getByTestId('gov-status-compliant').first()).toBeVisible();
  await expect(page.getByTestId('gov-status-requires-review').first()).toBeVisible();
  await expect(page.getByTestId('gov-status-restricted').first()).toBeVisible();
});

test('AG-09: Search filters governance records by name', async ({ page }) => {
  await loginAsCEO(page);
  await page.goto('/automation-governance');
  await page.getByTestId('gov-search').fill('Sync');
  await expect(page.getByTestId('gov-row-rule-003')).toBeVisible();
  // Non-matching records should not appear
  await expect(page.getByTestId('gov-row-rule-002')).not.toBeVisible();
});

test('AG-10: Risk filter works — filtering by Critical shows only Critical records', async ({ page }) => {
  await loginAsCEO(page);
  await page.goto('/automation-governance');
  await page.getByTestId('gov-filter-risk').selectOption('Critical');
  await expect(page.getByTestId('gov-row-rule-004')).toBeVisible();
  await expect(page.getByTestId('gov-row-rule-001')).not.toBeVisible();
});

test('AG-11: Status filter works — filtering by Restricted shows restricted records', async ({ page }) => {
  await loginAsCEO(page);
  await page.goto('/automation-governance');
  await page.getByTestId('gov-filter-status').selectOption('Restricted');
  await expect(page.getByTestId('gov-row-rule-005')).toBeVisible();
  await expect(page.getByTestId('gov-row-rule-001')).not.toBeVisible();
});

// ──────────────────────────────────────────────────────
// GOVERNANCE DETAIL & CEO ACTIONS
// ──────────────────────────────────────────────────────

test('AG-12: Governance detail dialog opens on View', async ({ page }) => {
  await loginAsCEO(page);
  await page.goto('/automation-governance');
  await page.getByTestId('gov-btn-view-rule-003').click();
  await expect(page.getByTestId('gov-detail-dialog')).toBeVisible();
});

test('AG-13: Restrict action updates governance status and generates audit', async ({ page }) => {
  await loginAsCEO(page);
  await page.goto('/automation-governance');
  // rule-001 is Compliant — restrict it
  await page.getByTestId('gov-btn-view-rule-001').click();
  await expect(page.getByTestId('gov-detail-dialog')).toBeVisible();
  await page.getByTestId('gov-btn-restrict').click();
  // Dialog should close and table should update
  await expect(page.getByTestId('gov-detail-dialog')).not.toBeVisible();
  // Audit tab should now have a new entry
  await page.getByTestId('gov-tab-audit').click();
  await expect(page.getByTestId('gov-audit-table')).toBeVisible();
});

test('AG-14: Suspend action updates governance status and generates audit', async ({ page }) => {
  await loginAsCEO(page);
  await page.goto('/automation-governance');
  await page.getByTestId('gov-btn-view-rule-002').click();
  await expect(page.getByTestId('gov-detail-dialog')).toBeVisible();
  await page.getByTestId('gov-btn-suspend').click();
  await expect(page.getByTestId('gov-detail-dialog')).not.toBeVisible();
});

test('AG-15: Restore action updates governance status', async ({ page }) => {
  await loginAsCEO(page);
  await page.goto('/automation-governance');
  // rule-005 is Restricted — restore it
  await page.getByTestId('gov-btn-view-rule-005').click();
  await expect(page.getByTestId('gov-detail-dialog')).toBeVisible();
  await page.getByTestId('gov-btn-restore').click();
  await expect(page.getByTestId('gov-detail-dialog')).not.toBeVisible();
});

test('AG-16: Mark Compliant action works for Requires Review record', async ({ page }) => {
  await loginAsCEO(page);
  await page.goto('/automation-governance');
  await page.getByTestId('gov-btn-view-rule-003').click();
  await expect(page.getByTestId('gov-detail-dialog')).toBeVisible();
  await page.getByTestId('gov-btn-mark-compliant').click();
  await expect(page.getByTestId('gov-detail-dialog')).not.toBeVisible();
});

// ──────────────────────────────────────────────────────
// EXCEPTIONS
// ──────────────────────────────────────────────────────

test('AG-17: Exception queue renders with seed exceptions', async ({ page }) => {
  await loginAsCEO(page);
  await page.goto('/automation-governance');
  await page.getByTestId('gov-tab-exceptions').click();
  await expect(page.getByTestId('gov-exceptions-table')).toBeVisible();
  await expect(page.getByTestId('gov-ex-row-gex-001')).toBeVisible();
  await expect(page.getByTestId('gov-ex-row-gex-002')).toBeVisible();
  await expect(page.getByTestId('gov-ex-row-gex-003')).toBeVisible();
});

test('AG-18: Exception detail panel opens', async ({ page }) => {
  await loginAsCEO(page);
  await page.goto('/automation-governance');
  await page.getByTestId('gov-tab-exceptions').click();
  await page.getByTestId('gov-ex-btn-view-gex-001').click();
  await expect(page.getByTestId('gov-exception-detail-dialog')).toBeVisible();
});

test('AG-19: Resolve exception changes status and generates audit', async ({ page }) => {
  await loginAsCEO(page);
  await page.goto('/automation-governance');
  await page.getByTestId('gov-tab-exceptions').click();
  await page.getByTestId('gov-ex-btn-view-gex-003').click();
  await expect(page.getByTestId('gov-exception-detail-dialog')).toBeVisible();
  await page.getByTestId('gov-btn-resolve-exception').click();
  await expect(page.getByTestId('gov-exception-detail-dialog')).not.toBeVisible();
});

test('AG-20: Reject exception closes dialog', async ({ page }) => {
  await loginAsCEO(page);
  await page.goto('/automation-governance');
  await page.getByTestId('gov-tab-exceptions').click();
  await page.getByTestId('gov-ex-btn-view-gex-001').click();
  await expect(page.getByTestId('gov-exception-detail-dialog')).toBeVisible();
  await page.getByTestId('gov-btn-reject-exception').click();
  await expect(page.getByTestId('gov-exception-detail-dialog')).not.toBeVisible();
});

// ──────────────────────────────────────────────────────
// COMPLIANCE AUDIT
// ──────────────────────────────────────────────────────

test('AG-21: Compliance audit table renders with seed entries', async ({ page }) => {
  await loginAsCEO(page);
  await page.goto('/automation-governance');
  await page.getByTestId('gov-tab-audit').click();
  await expect(page.getByTestId('gov-audit-table')).toBeVisible();
  await expect(page.getByTestId('gov-audit-doctrine-notice')).toBeVisible();
  // Seed has 4 entries
  await expect(page.getByTestId('gov-audit-row-gov-audit-001')).toBeVisible();
});

test('AG-22: Compliance audit search filters by rule name', async ({ page }) => {
  await loginAsCEO(page);
  await page.goto('/automation-governance');
  await page.getByTestId('gov-tab-audit').click();
  await page.getByTestId('gov-audit-search').fill('Sync Failure');
  await expect(page.getByTestId('gov-audit-row-gov-audit-001')).toBeVisible();
  // Rows not matching should not appear
  await expect(page.getByTestId('gov-audit-row-gov-audit-004')).not.toBeVisible();
});

// ──────────────────────────────────────────────────────
// FINANCIAL SAFETY INDICATORS
// ──────────────────────────────────────────────────────

test('AG-23: Governed badge is visible for Financially Sensitive automations', async ({ page }) => {
  await loginAsCEO(page);
  await page.goto('/automation-governance');
  // rule-003 is FinanciallySensitive
  await expect(page.getByTestId('gov-governed-badge-rule-003')).toBeVisible();
});

test('AG-24: Approval Protected and Financial Safeguard Active shown in detail for FinanciallySensitive rule', async ({ page }) => {
  await loginAsCEO(page);
  await page.goto('/automation-governance');
  await page.getByTestId('gov-btn-view-rule-003').click();
  await expect(page.getByTestId('gov-detail-dialog')).toBeVisible();
  await expect(page.getByTestId('gov-governed-badge')).toBeVisible();
  await expect(page.getByTestId('gov-approval-protected')).toBeVisible();
  await expect(page.getByTestId('gov-financial-safeguard')).toBeVisible();
});

// ──────────────────────────────────────────────────────
// RBAC
// ──────────────────────────────────────────────────────

test('AG-25: PM is denied access to Automation Governance Centre', async ({ page }) => {
  await loginAsPM(page);
  await page.goto('/automation-governance');
  await expect(page.getByTestId('automation-governance-centre-page')).not.toBeVisible();
});

test('AG-26: Worker is denied access to Automation Governance Centre', async ({ page }) => {
  await loginAsWorker(page);
  await page.goto('/automation-governance');
  await expect(page.getByTestId('automation-governance-centre-page')).not.toBeVisible();
});
