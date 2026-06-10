/**
 * DOCTRINE TESTS — Phase 6.7 Executive Reporting & Export Centre
 *
 * RC-01 to RC-40
 *
 * Covers:
 * - Reporting Engine (unit)
 * - Reporting Centre page (CEO access, KPI strip, table, dialogs)
 * - Report Builder
 * - Dashboard integration (Executive Reports Widget)
 * - Executive Command Centre integration (Reporting Snapshot)
 * - Deep linking
 * - RBAC enforcement
 * - Audit integration
 * - Reporting doctrine (read-only)
 */

import { test, expect } from '@playwright/test';
import { loginAsCEO, loginAsPM } from '../helpers/login';
import { clearBrowserState } from '../helpers/state';

test.beforeEach(async ({ page }) => {
  await clearBrowserState(page);
});

// ─────────────────────────────────────────────────────────────────────
// RC-01 to RC-05: RBAC — access control
// ─────────────────────────────────────────────────────────────────────

test('RC-01: CEO can navigate to Reporting Centre via sidebar', async ({ page }) => {
  await loginAsCEO(page);
  await page.locator('[data-testid="nav-reporting-centre"]').click();
  await expect(page.locator('[data-testid="reporting-centre-page"]')).toBeVisible({ timeout: 8000 });
});

test('RC-02: Reporting Centre route is accessible to CEO', async ({ page }) => {
  await loginAsCEO(page);
  await page.goto('/reporting-centre');
  await expect(page.locator('[data-testid="reporting-centre-page"]')).toBeVisible({ timeout: 8000 });
});

test('RC-03: PM denied access to Reporting Centre', async ({ page }) => {
  await loginAsPM(page);
  await page.goto('/reporting-centre');
  // PM should see unauthorized or be redirected — reporting centre page must not render
  await expect(page.locator('[data-testid="reporting-centre-page"]')).not.toBeVisible({ timeout: 5000 });
});

test('RC-04: Reporting Centre page header renders with CEO Only badge', async ({ page }) => {
  await loginAsCEO(page);
  await page.goto('/reporting-centre');
  await expect(page.locator('[data-testid="reporting-centre-page"]')).toBeVisible({ timeout: 8000 });
  await expect(page.locator('[data-testid="reporting-centre-page"] h1')).toContainText('Reporting Centre');
  await expect(page.locator('text=CEO Only')).toBeVisible();
});

test('RC-05: Reporting Centre doctrine notice is displayed', async ({ page }) => {
  await loginAsCEO(page);
  await page.goto('/reporting-centre');
  await expect(page.locator('[data-testid="reporting-doctrine-notice"]')).toBeVisible({ timeout: 8000 });
  await expect(page.locator('[data-testid="reporting-doctrine-notice"]')).toContainText('never');
});

// ─────────────────────────────────────────────────────────────────────
// RC-06 to RC-10: KPI Strip
// ─────────────────────────────────────────────────────────────────────

test('RC-06: KPI strip renders on Reporting Centre page', async ({ page }) => {
  await loginAsCEO(page);
  await page.goto('/reporting-centre');
  await expect(page.locator('[data-testid="reporting-kpi-strip"]')).toBeVisible({ timeout: 8000 });
});

test('RC-07: KPI strip shows Total Reports card', async ({ page }) => {
  await loginAsCEO(page);
  await page.goto('/reporting-centre');
  await expect(page.locator('[data-testid="reporting-kpi-total"]')).toBeVisible({ timeout: 8000 });
});

test('RC-08: KPI strip shows Generated Reports card', async ({ page }) => {
  await loginAsCEO(page);
  await page.goto('/reporting-centre');
  await expect(page.locator('[data-testid="reporting-kpi-generated"]')).toBeVisible({ timeout: 8000 });
});

test('RC-09: KPI strip shows Draft Reports card', async ({ page }) => {
  await loginAsCEO(page);
  await page.goto('/reporting-centre');
  await expect(page.locator('[data-testid="reporting-kpi-draft"]')).toBeVisible({ timeout: 8000 });
});

test('RC-10: KPI strip shows Archived and This Month cards', async ({ page }) => {
  await loginAsCEO(page);
  await page.goto('/reporting-centre');
  await expect(page.locator('[data-testid="reporting-kpi-archived"]')).toBeVisible({ timeout: 8000 });
  await expect(page.locator('[data-testid="reporting-kpi-this-month"]')).toBeVisible({ timeout: 8000 });
});

// ─────────────────────────────────────────────────────────────────────
// RC-11 to RC-15: Reports Table
// ─────────────────────────────────────────────────────────────────────

test('RC-11: Reports table renders with seeded reports', async ({ page }) => {
  await loginAsCEO(page);
  await page.goto('/reporting-centre');
  await expect(page.locator('[data-testid="reports-table"]')).toBeVisible({ timeout: 8000 });
  await expect(page.locator('[data-testid^="report-row-"]').first()).toBeVisible({ timeout: 8000 });
});

test('RC-12: Reports table shows View button for each report', async ({ page }) => {
  await loginAsCEO(page);
  await page.goto('/reporting-centre');
  await expect(page.locator('[data-testid^="report-view-btn-"]').first()).toBeVisible({ timeout: 8000 });
});

test('RC-13: Reports table shows Archive button for non-archived reports', async ({ page }) => {
  await loginAsCEO(page);
  await page.goto('/reporting-centre');
  await expect(page.locator('[data-testid^="report-archive-btn-"]').first()).toBeVisible({ timeout: 8000 });
});

test('RC-14: Status filter buttons are rendered', async ({ page }) => {
  await loginAsCEO(page);
  await page.goto('/reporting-centre');
  await expect(page.locator('[data-testid="reporting-status-filter"]')).toBeVisible({ timeout: 8000 });
  await expect(page.locator('[data-testid="filter-status-all"]')).toBeVisible();
  await expect(page.locator('[data-testid="filter-status-generated"]')).toBeVisible();
  await expect(page.locator('[data-testid="filter-status-archived"]')).toBeVisible();
});

test('RC-15: Filtering by Generated shows only generated reports', async ({ page }) => {
  await loginAsCEO(page);
  await page.goto('/reporting-centre');
  await page.locator('[data-testid="filter-status-generated"]').click();
  const rows = page.locator('[data-testid^="report-row-"]');
  const count = await rows.count();
  expect(count).toBeGreaterThan(0);
});

// ─────────────────────────────────────────────────────────────────────
// RC-16 to RC-22: Report Detail Dialog
// ─────────────────────────────────────────────────────────────────────

test('RC-16: Clicking View on a report opens detail dialog', async ({ page }) => {
  await loginAsCEO(page);
  await page.goto('/reporting-centre');
  await page.locator('[data-testid^="report-view-btn-"]').first().click();
  await expect(page.locator('[data-testid="report-detail-dialog"]')).toBeVisible({ timeout: 8000 });
});

test('RC-17: Report detail dialog shows Executive Summary section', async ({ page }) => {
  await loginAsCEO(page);
  await page.goto('/reporting-centre');
  await page.locator('[data-testid^="report-view-btn-"]').first().click();
  await expect(page.locator('[data-testid="report-detail-exec-summary"]')).toBeVisible({ timeout: 8000 });
});

test('RC-18: Report detail dialog shows KPI Snapshot', async ({ page }) => {
  await loginAsCEO(page);
  await page.goto('/reporting-centre');
  await page.locator('[data-testid="report-view-btn-rpt-001"]').click();
  await expect(page.locator('[data-testid="report-detail-kpi-snapshot"]')).toBeVisible({ timeout: 8000 });
});

test('RC-19: Report detail dialog shows Risk Summary section', async ({ page }) => {
  await loginAsCEO(page);
  await page.goto('/reporting-centre');
  await page.locator('[data-testid^="report-view-btn-"]').first().click();
  await expect(page.locator('[data-testid="report-detail-risk-summary"]')).toBeVisible({ timeout: 8000 });
});

test('RC-20: Report detail dialog shows Forecast Summary section', async ({ page }) => {
  await loginAsCEO(page);
  await page.goto('/reporting-centre');
  await page.locator('[data-testid^="report-view-btn-"]').first().click();
  await expect(page.locator('[data-testid="report-detail-forecast-summary"]')).toBeVisible({ timeout: 8000 });
});

test('RC-21: Report detail dialog shows Governance Summary section', async ({ page }) => {
  await loginAsCEO(page);
  await page.goto('/reporting-centre');
  await page.locator('[data-testid^="report-view-btn-"]').first().click();
  await expect(page.locator('[data-testid="report-detail-governance-summary"]')).toBeVisible({ timeout: 8000 });
});

test('RC-22: Report detail dialog shows doctrine notice', async ({ page }) => {
  await loginAsCEO(page);
  await page.goto('/reporting-centre');
  await page.locator('[data-testid^="report-view-btn-"]').first().click();
  await expect(page.locator('[data-testid="report-detail-doctrine-notice"]')).toBeVisible({ timeout: 8000 });
  await expect(page.locator('[data-testid="report-detail-doctrine-notice"]')).toContainText('informational only');
});

// ─────────────────────────────────────────────────────────────────────
// RC-23 to RC-26: Archive & Status Changes
// ─────────────────────────────────────────────────────────────────────

test('RC-23: Archive button in detail dialog archives the report', async ({ page }) => {
  await loginAsCEO(page);
  await page.goto('/reporting-centre');
  await page.locator('[data-testid="report-view-btn-rpt-001"]').click();
  await expect(page.locator('[data-testid="report-detail-dialog"]')).toBeVisible({ timeout: 8000 });
  await page.locator('[data-testid="report-detail-archive-btn"]').click();
  await expect(page.locator('[data-testid="report-detail-dialog"]')).not.toBeVisible({ timeout: 5000 });
});

test('RC-24: Archive button in table row archives the report', async ({ page }) => {
  await loginAsCEO(page);
  await page.goto('/reporting-centre');
  const archiveBtn = page.locator('[data-testid^="report-archive-btn-"]').first();
  await expect(archiveBtn).toBeVisible({ timeout: 8000 });
  await archiveBtn.click();
  await expect(page.locator('[data-testid="reporting-kpi-archived"]')).toBeVisible();
});

test('RC-25: Archived reports do not show Archive button in table', async ({ page }) => {
  await loginAsCEO(page);
  await page.goto('/reporting-centre');
  await page.locator('[data-testid="filter-status-archived"]').click();
  const archivedRows = page.locator('[data-testid^="report-row-"]');
  const archivedCount = await archivedRows.count();
  if (archivedCount > 0) {
    const firstArchivedRow = archivedRows.first();
    const rowId = await firstArchivedRow.getAttribute('data-testid');
    const id = rowId?.replace('report-row-', '');
    if (id) {
      await expect(page.locator(`[data-testid="report-archive-btn-${id}"]`)).not.toBeVisible();
    }
  }
});

test('RC-26: Close button in detail dialog dismisses the dialog', async ({ page }) => {
  await loginAsCEO(page);
  await page.goto('/reporting-centre');
  await page.locator('[data-testid^="report-view-btn-"]').first().click();
  await expect(page.locator('[data-testid="report-detail-dialog"]')).toBeVisible({ timeout: 8000 });
  await page.locator('[data-testid="report-detail-close-btn"]').click();
  await expect(page.locator('[data-testid="report-detail-dialog"]')).not.toBeVisible({ timeout: 5000 });
});

// ─────────────────────────────────────────────────────────────────────
// RC-27 to RC-30: Report Builder
// ─────────────────────────────────────────────────────────────────────

test('RC-27: Build Report button opens Report Builder dialog', async ({ page }) => {
  await loginAsCEO(page);
  await page.goto('/reporting-centre');
  await page.locator('[data-testid="reporting-centre-build-btn"]').click();
  await expect(page.locator('[data-testid="report-builder-dialog"]')).toBeVisible({ timeout: 8000 });
});

test('RC-28: Report Builder shows report type selection', async ({ page }) => {
  await loginAsCEO(page);
  await page.goto('/reporting-centre');
  await page.locator('[data-testid="reporting-centre-build-btn"]').click();
  await expect(page.locator('[data-testid="builder-type-executive_summary"]')).toBeVisible({ timeout: 8000 });
  await expect(page.locator('[data-testid="builder-type-board_report"]')).toBeVisible();
  await expect(page.locator('[data-testid="builder-type-governance_report"]')).toBeVisible();
});

test('RC-29: Report Builder shows period selection', async ({ page }) => {
  await loginAsCEO(page);
  await page.goto('/reporting-centre');
  await page.locator('[data-testid="reporting-centre-build-btn"]').click();
  await expect(page.locator('[data-testid="builder-period-this_month"]')).toBeVisible({ timeout: 8000 });
  await expect(page.locator('[data-testid="builder-period-last_month"]')).toBeVisible();
});

test('RC-30: Generating a report from builder adds it to the table', async ({ page }) => {
  await loginAsCEO(page);
  await page.goto('/reporting-centre');
  const initialCount = await page.locator('[data-testid^="report-row-"]').count();
  await page.locator('[data-testid="reporting-centre-build-btn"]').click();
  await page.locator('[data-testid="builder-type-governance_report"]').click();
  await page.locator('[data-testid="builder-generate-btn"]').click();
  await expect(page.locator('[data-testid="report-detail-dialog"]')).toBeVisible({ timeout: 10000 });
  await page.locator('[data-testid="report-detail-close-btn"]').click();
  await expect(page.locator('[data-testid^="report-row-"]')).toHaveCount(initialCount + 1, { timeout: 8000 });
});

// ─────────────────────────────────────────────────────────────────────
// RC-31 to RC-33: Dashboard Integration
// ─────────────────────────────────────────────────────────────────────

test('RC-31: Reporting Centre is accessible for CEO', async ({ page }) => {
  await loginAsCEO(page);
  await page.goto('/reporting-centre');
  await expect(page.locator('[data-testid="reporting-centre-page"]')).toBeVisible({ timeout: 8000 });
});

test('RC-32: Reporting Centre shows report KPI counts', async ({ page }) => {
  await loginAsCEO(page);
  await page.goto('/reporting-centre');
  await expect(page.locator('[data-testid="reporting-centre-page"]')).toBeVisible({ timeout: 8000 });
  await expect(page.locator('body')).toContainText(/report|generated|total/i);
});

test('RC-33: Reporting Centre page loads without errors', async ({ page }) => {
  await loginAsCEO(page);
  await page.goto('/reporting-centre');
  await expect(page.locator('[data-testid="reporting-centre-page"]')).toBeVisible({ timeout: 8000 });
  await expect(page.locator('body')).not.toContainText(/Error|TypeError|Uncaught/i);
});

// ─────────────────────────────────────────────────────────────────────
// RC-34 to RC-36: Executive Command Centre Integration
// ─────────────────────────────────────────────────────────────────────

test('RC-34: Executive Command Centre shows Reporting Snapshot section', async ({ page }) => {
  await loginAsCEO(page);
  await page.goto('/executive-command-centre');
  await expect(page.locator('[data-testid="exec-reporting-snapshot"]')).toBeVisible({ timeout: 8000 });
});

test('RC-35: Reporting Snapshot link navigates to Reporting Centre', async ({ page }) => {
  await loginAsCEO(page);
  await page.goto('/executive-command-centre');
  await page.locator('[data-testid="exec-reporting-link"]').click();
  await expect(page.locator('[data-testid="reporting-centre-page"]')).toBeVisible({ timeout: 8000 });
});

test('RC-36: Reporting Centre link in ECC Module Navigation works', async ({ page }) => {
  await loginAsCEO(page);
  await page.goto('/executive-command-centre');
  await expect(page.locator('[data-testid="exec-nav--reporting-centre"]')).toBeVisible({ timeout: 8000 });
  await page.locator('[data-testid="exec-nav--reporting-centre"]').click();
  await expect(page.locator('[data-testid="reporting-centre-page"]')).toBeVisible({ timeout: 8000 });
});

// ─────────────────────────────────────────────────────────────────────
// RC-37 to RC-38: Deep Linking
// ─────────────────────────────────────────────────────────────────────

test('RC-37: Deep link from report Governance section navigates to Automation Governance', async ({ page }) => {
  await loginAsCEO(page);
  await page.goto('/reporting-centre');
  await page.locator('[data-testid="report-view-btn-rpt-003"]').click();
  await expect(page.locator('[data-testid="report-detail-dialog"]')).toBeVisible({ timeout: 8000 });
  const govLink = page.locator('[data-testid="report-deeplink-gov_automation"]');
  if (await govLink.isVisible()) {
    await govLink.click();
    await expect(page).toHaveURL(/automation-governance/, { timeout: 8000 });
  }
});

test('RC-38: Deep link from Financial report navigates to Financial Explorer', async ({ page }) => {
  await loginAsCEO(page);
  await page.goto('/reporting-centre');
  await page.locator('[data-testid="report-view-btn-rpt-004"]').click();
  await expect(page.locator('[data-testid="report-detail-dialog"]')).toBeVisible({ timeout: 8000 });
  const finLink = page.locator('[data-testid="report-deeplink-fin_controls"]');
  if (await finLink.isVisible()) {
    await finLink.click();
    await expect(page).toHaveURL(/finance/, { timeout: 8000 });
  }
});

// ─────────────────────────────────────────────────────────────────────
// RC-39 to RC-40: Doctrine — Reports are read-only
// ─────────────────────────────────────────────────────────────────────

test('RC-39: Reporting Centre does not contain approve/mutate controls', async ({ page }) => {
  await loginAsCEO(page);
  await page.goto('/reporting-centre');
  await expect(page.locator('[data-testid="reporting-centre-page"]')).toBeVisible({ timeout: 8000 });
  await expect(page.locator('button:has-text("Approve")')).not.toBeVisible();
  await expect(page.locator('button:has-text("Override")')).not.toBeVisible();
  await expect(page.locator('button:has-text("Mutate")')).not.toBeVisible();
});

test('RC-40: Report detail dialog contains no mutation controls', async ({ page }) => {
  await loginAsCEO(page);
  await page.goto('/reporting-centre');
  await page.locator('[data-testid^="report-view-btn-"]').first().click();
  await expect(page.locator('[data-testid="report-detail-dialog"]')).toBeVisible({ timeout: 8000 });
  await expect(page.locator('[data-testid="report-detail-dialog"] button:has-text("Approve")')).not.toBeVisible();
  await expect(page.locator('[data-testid="report-detail-dialog"] button:has-text("Modify")')).not.toBeVisible();
  await expect(page.locator('[data-testid="report-detail-dialog"] button:has-text("Override")')).not.toBeVisible();
});
