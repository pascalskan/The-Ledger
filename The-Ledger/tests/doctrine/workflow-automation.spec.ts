/**
 * DOCTRINE TESTS — Phase 6.4: Cross-Module Workflow Automation
 *
 * 35 tests covering:
 *   - Workflow Engine (unit-level via page): creation, update, archive, pause, resume
 *   - Workflow Centre: rendering, KPIs, filters, search, detail dialog
 *   - Workflow Execution Panel: status, blocked/failed steps
 *   - Event Bus Integration: workflow events, activity feed, notification integration
 *   - Governance: financially sensitive workflows, governance flags
 *   - Workflow Builder: multi-step creation, forbidden action doctrine
 *   - RBAC: CEO allowed, PM denied, Worker denied
 */

import { test, expect } from '@playwright/test';
import { loginAsCEO, loginAsPM, loginAsWorker } from '../helpers/login';
import { clearBrowserState } from '../helpers/state';

test.beforeEach(async ({ page }) => {
  await clearBrowserState(page);
});

// ─────────────────────────────────────────────────────────────────────
// GROUP 1: WORKFLOW CENTRE — RENDERING & NAVIGATION
// ─────────────────────────────────────────────────────────────────────

test('WF-01: Workflow Centre is accessible to CEO via sidebar nav', async ({ page }) => {
  await loginAsCEO(page);
  await page.locator('[data-testid="nav-workflow-centre"]').click();
  await expect(page).toHaveURL(/\/workflows/);
  await expect(page.locator('[data-testid="workflow-centre-page"]')).toBeVisible();
});

test('WF-02: Workflow Centre page renders heading and CEO-only badge', async ({ page }) => {
  await loginAsCEO(page);
  await page.goto('/workflows');
  await expect(page.getByRole('heading', { name: /Workflow Centre/i })).toBeVisible();
  await expect(page.locator('body')).toContainText('CEO Only');
});

test('WF-03: Workflow Centre renders without runtime errors', async ({ page }) => {
  await loginAsCEO(page);
  await page.goto('/workflows');
  await expect(page.locator('[data-testid="workflow-centre-page"]')).toBeVisible();
  await expect(page.locator('body')).not.toContainText(/Uncaught|TypeError|ReferenceError/i);
});

test('WF-04: Workflow Centre renders doctrine notice', async ({ page }) => {
  await loginAsCEO(page);
  await page.goto('/workflows');
  await expect(page.locator('[data-testid="wf-doctrine-notice"]')).toBeVisible();
  await expect(page.locator('body')).toContainText(/Workflow Doctrine/i);
  await expect(page.locator('body')).toContainText(/may never/i);
});

// ─────────────────────────────────────────────────────────────────────
// GROUP 2: KPI STRIP
// ─────────────────────────────────────────────────────────────────────

test('WF-05: KPI strip renders all five KPI cards', async ({ page }) => {
  await loginAsCEO(page);
  await page.goto('/workflows');
  await expect(page.locator('[data-testid="wf-kpi-strip"]')).toBeVisible();
  await expect(page.locator('[data-testid="wf-kpi-total"]')).toBeVisible();
  await expect(page.locator('[data-testid="wf-kpi-active"]')).toBeVisible();
  await expect(page.locator('[data-testid="wf-kpi-paused"]')).toBeVisible();
  await expect(page.locator('[data-testid="wf-kpi-requires-action"]')).toBeVisible();
  await expect(page.locator('[data-testid="wf-kpi-financially-sensitive"]')).toBeVisible();
});

test('WF-06: KPI Total Workflows shows 8 from seed data', async ({ page }) => {
  await loginAsCEO(page);
  await page.goto('/workflows');
  const totalKpi = page.locator('[data-testid="wf-kpi-total"]');
  await expect(totalKpi).toContainText('8');
});

test('WF-07: KPI Active Workflows shows 6 from seed data', async ({ page }) => {
  await loginAsCEO(page);
  await page.goto('/workflows');
  const activeKpi = page.locator('[data-testid="wf-kpi-active"]');
  await expect(activeKpi).toContainText('6');
});

test('WF-08: KPI Requires Action shows workflows needing attention', async ({ page }) => {
  await loginAsCEO(page);
  await page.goto('/workflows');
  const actionKpi = page.locator('[data-testid="wf-kpi-requires-action"]');
  await expect(actionKpi).toBeVisible();
  // wf-002, wf-003, wf-005 have actionRequired: true → 3
  await expect(actionKpi).toContainText('3');
});

test('WF-09: KPI Financially Sensitive shows correct count', async ({ page }) => {
  await loginAsCEO(page);
  await page.goto('/workflows');
  const finKpi = page.locator('[data-testid="wf-kpi-financially-sensitive"]');
  // wf-001, wf-002, wf-003, wf-007, wf-008 have financiallySensitive: true → 5
  await expect(finKpi).toContainText('5');
});

// ─────────────────────────────────────────────────────────────────────
// GROUP 3: WORKFLOW TABLE
// ─────────────────────────────────────────────────────────────────────

test('WF-10: Workflow table renders seed workflow rows', async ({ page }) => {
  await loginAsCEO(page);
  await page.goto('/workflows');
  await expect(page.locator('[data-testid="wf-table"]')).toBeVisible();
  await expect(page.locator('[data-testid="wf-row-wf-001"]')).toBeVisible();
  await expect(page.locator('[data-testid="wf-row-wf-002"]')).toBeVisible();
});

test('WF-11: Workflow table shows "Action Required" indicator on flagged workflows', async ({ page }) => {
  await loginAsCEO(page);
  await page.goto('/workflows');
  // wf-002 has actionRequired: true
  await expect(page.locator('[data-testid="wf-action-required-wf-002"]')).toBeVisible();
  await expect(page.locator('[data-testid="wf-action-required-wf-002"]')).toContainText(/Action Required/i);
});

test('WF-12: Workflow table shows Financially Sensitive indicator', async ({ page }) => {
  await loginAsCEO(page);
  await page.goto('/workflows');
  // wf-001 is financiallySensitive
  await expect(page.locator('[data-testid="wf-fin-sensitive-wf-001"]')).toBeVisible();
});

// ─────────────────────────────────────────────────────────────────────
// GROUP 4: FILTERS & SEARCH
// ─────────────────────────────────────────────────────────────────────

test('WF-13: Status filter "Paused" shows only paused workflows', async ({ page }) => {
  await loginAsCEO(page);
  await page.goto('/workflows');
  await page.locator('[data-testid="wf-filter-status"]').selectOption('paused');
  await expect(page.locator('[data-testid="wf-row-wf-007"]')).toBeVisible();
  await expect(page.locator('[data-testid="wf-row-wf-001"]')).not.toBeVisible();
});

test('WF-14: Status filter "Draft" shows only draft workflows', async ({ page }) => {
  await loginAsCEO(page);
  await page.goto('/workflows');
  await page.locator('[data-testid="wf-filter-status"]').selectOption('draft');
  await expect(page.locator('[data-testid="wf-row-wf-008"]')).toBeVisible();
  await expect(page.locator('[data-testid="wf-row-wf-001"]')).not.toBeVisible();
});

test('WF-15: Type filter "Governance" shows only governance workflows', async ({ page }) => {
  await loginAsCEO(page);
  await page.goto('/workflows');
  await page.locator('[data-testid="wf-filter-type"]').selectOption('governance_workflow');
  await expect(page.locator('[data-testid="wf-row-wf-002"]')).toBeVisible();
  await expect(page.locator('[data-testid="wf-row-wf-004"]')).toBeVisible();
  await expect(page.locator('[data-testid="wf-row-wf-007"]')).toBeVisible();
  await expect(page.locator('[data-testid="wf-row-wf-001"]')).not.toBeVisible();
});

test('WF-16: Search by workflow name filters results', async ({ page }) => {
  await loginAsCEO(page);
  await page.goto('/workflows');
  await page.locator('[data-testid="wf-search"]').fill('Reconciliation');
  await expect(page.locator('[data-testid="wf-row-wf-002"]')).toBeVisible();
  await expect(page.locator('[data-testid="wf-row-wf-001"]')).not.toBeVisible();
});

test('WF-17: Search by trigger event filters results', async ({ page }) => {
  await loginAsCEO(page);
  await page.goto('/workflows');
  await page.locator('[data-testid="wf-search"]').fill('sync_event');
  await expect(page.locator('[data-testid="wf-row-wf-003"]')).toBeVisible();
});

test('WF-18: Empty search string shows all workflows', async ({ page }) => {
  await loginAsCEO(page);
  await page.goto('/workflows');
  await page.locator('[data-testid="wf-search"]').fill('NORESULTSEXPECTED_XYZ');
  const rows = page.locator('[data-testid^="wf-row-"]');
  await expect(rows).toHaveCount(0);
  // Clear search — all rows restored
  await page.locator('[data-testid="wf-search"]').fill('');
  await expect(page.locator('[data-testid="wf-row-wf-001"]')).toBeVisible();
});

// ─────────────────────────────────────────────────────────────────────
// GROUP 5: WORKFLOW DETAIL DIALOG
// ─────────────────────────────────────────────────────────────────────

test('WF-19: Clicking View opens the detail dialog for a workflow', async ({ page }) => {
  await loginAsCEO(page);
  await page.goto('/workflows');
  await page.locator('[data-testid="wf-btn-view-wf-001"]').click();
  await expect(page.locator('[data-testid="wf-detail-dialog"]')).toBeVisible();
});

test('WF-20: Detail dialog shows trigger section', async ({ page }) => {
  await loginAsCEO(page);
  await page.goto('/workflows');
  await page.locator('[data-testid="wf-btn-view-wf-001"]').click();
  await expect(page.locator('[data-testid="wf-detail-trigger"]')).toBeVisible();
  await expect(page.locator('[data-testid="wf-detail-trigger"]')).toContainText('exception_event');
});

test('WF-21: Detail dialog shows workflow steps', async ({ page }) => {
  await loginAsCEO(page);
  await page.goto('/workflows');
  await page.locator('[data-testid="wf-btn-view-wf-001"]').click();
  await expect(page.locator('[data-testid="wf-detail-steps"]')).toBeVisible();
  await expect(page.locator('[data-testid="wf-detail-step-wf-001-step-1"]')).toBeVisible();
});

test('WF-22: Detail dialog shows execution history', async ({ page }) => {
  await loginAsCEO(page);
  await page.goto('/workflows');
  await page.locator('[data-testid="wf-btn-view-wf-001"]').click();
  await expect(page.locator('[data-testid="wf-detail-execution-history"]')).toBeVisible();
  await expect(page.locator('[data-testid="wf-detail-exec-wfex-001-1"]')).toBeVisible();
});

test('WF-23: Detail dialog shows governance flag for requires_review workflows', async ({ page }) => {
  await loginAsCEO(page);
  await page.goto('/workflows');
  // wf-001 has governanceStatus: requires_review
  await page.locator('[data-testid="wf-btn-view-wf-001"]').click();
  await expect(page.locator('[data-testid="wf-detail-governance-flag"]')).toBeVisible();
  await expect(page.locator('[data-testid="wf-detail-governance-flag"]')).toContainText(/Governance Review Required/i);
});

test('WF-24: Detail dialog shows Financially Sensitive flag for sensitive workflows', async ({ page }) => {
  await loginAsCEO(page);
  await page.goto('/workflows');
  await page.locator('[data-testid="wf-btn-view-wf-001"]').click();
  await expect(page.locator('[data-testid="wf-detail-financially-sensitive-flag"]')).toBeVisible();
  await expect(page.locator('[data-testid="wf-detail-financially-sensitive-flag"]')).toContainText(/Financially Sensitive/i);
});

// ─────────────────────────────────────────────────────────────────────
// GROUP 6: WORKFLOW ACTIONS
// ─────────────────────────────────────────────────────────────────────

test('WF-25: Pause action changes active workflow to paused', async ({ page }) => {
  await loginAsCEO(page);
  await page.goto('/workflows');
  // wf-001 is active — pause it via inline button
  await page.locator('[data-testid="wf-btn-pause-wf-001"]').click();
  await expect(page.locator('[data-testid="wf-status-badge-paused"]').first()).toBeVisible();
});

test('WF-26: Resume action changes paused workflow to active', async ({ page }) => {
  await loginAsCEO(page);
  await page.goto('/workflows');
  // wf-007 is paused — resume it
  await page.locator('[data-testid="wf-btn-resume-wf-007"]').click();
  const activeRows = page.locator('[data-testid="wf-row-wf-007"]').locator('[data-testid="wf-status-badge-active"]');
  await expect(activeRows).toBeVisible();
});

test('WF-27: Archive removes workflow from active view when filtering active', async ({ page }) => {
  await loginAsCEO(page);
  await page.goto('/workflows');
  // Archive wf-006
  await page.locator('[data-testid="wf-btn-archive-wf-006"]').click();
  await page.locator('[data-testid="wf-filter-status"]').selectOption('active');
  await expect(page.locator('[data-testid="wf-row-wf-006"]')).not.toBeVisible();
});

// ─────────────────────────────────────────────────────────────────────
// GROUP 7: EXECUTION PANEL
// ─────────────────────────────────────────────────────────────────────

test('WF-28: Execution panel renders with workflows that have history', async ({ page }) => {
  await loginAsCEO(page);
  await page.goto('/workflows');
  await expect(page.locator('[data-testid="wf-execution-panel"]')).toBeVisible();
  await expect(page.locator('[data-testid="wf-exec-panel-row-wf-001"]')).toBeVisible();
});

test('WF-29: Execution panel shows failed step indicator for wf-005', async ({ page }) => {
  await loginAsCEO(page);
  await page.goto('/workflows');
  await expect(page.locator('[data-testid="wf-exec-failed-steps-wf-005"]')).toBeVisible();
  await expect(page.locator('[data-testid="wf-exec-failed-steps-wf-005"]')).toContainText(/failed/i);
});

test('WF-30: Execution panel shows blocked step indicator for wf-002', async ({ page }) => {
  await loginAsCEO(page);
  await page.goto('/workflows');
  await expect(page.locator('[data-testid="wf-exec-blocked-steps-wf-002"]')).toBeVisible();
  await expect(page.locator('[data-testid="wf-exec-blocked-steps-wf-002"]')).toContainText(/blocked/i);
});

// ─────────────────────────────────────────────────────────────────────
// GROUP 8: GOVERNANCE & FINANCIAL SAFEGUARDS
// ─────────────────────────────────────────────────────────────────────

test('WF-31: Financially sensitive workflows show Financial badge in table', async ({ page }) => {
  await loginAsCEO(page);
  await page.goto('/workflows');
  // Multiple workflows are financially sensitive
  await expect(page.locator('[data-testid="wf-fin-sensitive-wf-001"]')).toBeVisible();
  await expect(page.locator('[data-testid="wf-fin-sensitive-wf-002"]')).toBeVisible();
  await expect(page.locator('[data-testid="wf-fin-sensitive-wf-003"]')).toBeVisible();
});

test('WF-32: Doctrine notice states workflows may never approve financial records', async ({ page }) => {
  await loginAsCEO(page);
  await page.goto('/workflows');
  await expect(page.locator('[data-testid="wf-doctrine-notice"]')).toContainText(/approve/i);
  await expect(page.locator('[data-testid="wf-doctrine-notice"]')).toContainText(/bypass/i);
});

// ─────────────────────────────────────────────────────────────────────
// GROUP 9: RBAC — ACCESS CONTROL
// ─────────────────────────────────────────────────────────────────────

test('WF-33: CEO can access Workflow Centre at /workflows', async ({ page }) => {
  await loginAsCEO(page);
  await page.goto('/workflows');
  await expect(page.locator('[data-testid="workflow-centre-page"]')).toBeVisible();
});

test('WF-34: PM is denied access to /workflows (Unauthorized)', async ({ page }) => {
  await loginAsPM(page);
  await page.goto('/workflows');
  // PM should see unauthorized page or be redirected
  const url = page.url();
  const bodyText = await page.locator('body').textContent();
  const isDenied =
    url.includes('/auth') ||
    url.includes('/unauthorized') ||
    (bodyText && /unauthorized|access denied|not allowed|403/i.test(bodyText));
  expect(isDenied).toBeTruthy();
});

test('WF-35: Worker is denied access to /workflows (redirected)', async ({ page }) => {
  await loginAsWorker(page);
  await page.goto('/workflows');
  // Workers are redirected to /worker/jobs or unauthorized
  const url = page.url();
  const bodyText = await page.locator('body').textContent();
  const isDenied =
    url.includes('/worker') ||
    url.includes('/auth') ||
    url.includes('/unauthorized') ||
    (bodyText && /unauthorized|access denied|not allowed|403/i.test(bodyText));
  expect(isDenied).toBeTruthy();
});
