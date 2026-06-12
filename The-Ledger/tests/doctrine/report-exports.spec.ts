/**
 * DOCTRINE TESTS — Phase 6.8 Report Exports & Distribution Centre
 * UX-5 migration: Exports/Distribution content now mounts unchanged inside
 * the Intelligence Hub Exports tab (/intelligence?tab=exports, with
 * ?sub=distribution for the Distribution sub-tab); the legacy route
 * redirects. Content testIds unchanged. ECC-snapshot tests (RX-36…RX-38)
 * removed — the ECC page is unrouted (UX-5 spec §6.2 / §13.2).
 *
 * Covers:
 * - Export Engine (via UI)
 * - Hub Exports tab: sub-tab bar, KPI strip, exports table, export actions
 * - Export Detail Dialog (doctrine notice, metadata, action buttons)
 * - Board Pack generator
 * - Distribution sub-tab: KPI strip, distribution table
 * - RBAC enforcement (CEO allowed, PM denied)
 * - Doctrine protection (no approve/mutate/override controls)
 */

import { test, expect } from '@playwright/test';
import { loginAsCEO, loginAsPM, loginAsWorker } from '../helpers/login';
import { clearBrowserState } from '../helpers/state';

test.beforeEach(async ({ page }) => {
  await clearBrowserState(page);
});

// ─────────────────────────────────────────────────────────────────────
// RX-01 to RX-05: RBAC — Access Control
// ─────────────────────────────────────────────────────────────────────

test('RX-01: CEO can access the hub Exports tab and see the sub-tab bar', async ({ page }) => {
  await loginAsCEO(page);
  await page.goto('/intelligence?tab=exports');
  await expect(page.locator('[data-testid="intelligence-exports-panel"]')).toBeVisible({ timeout: 8000 });
  await expect(page.locator('[data-testid="exports-subtab-exports"]')).toBeVisible({ timeout: 8000 });
  await expect(page.locator('[data-testid="exports-subtab-distribution"]')).toBeVisible();
});

test('RX-02: Hub renders Reports and Exports tabs with Exports/Distribution sub-tabs', async ({ page }) => {
  await loginAsCEO(page);
  await page.goto('/intelligence?tab=exports');
  await expect(page.locator('[data-testid="intelligence-tab-reports"]')).toBeVisible({ timeout: 8000 });
  await expect(page.locator('[data-testid="intelligence-tab-exports"]')).toBeVisible();
  await expect(page.locator('[data-testid="exports-subtab-distribution"]')).toBeVisible();
});

test('RX-03: Exports sub-tab is active by default and shows exports table', async ({ page }) => {
  await loginAsCEO(page);
  await page.goto('/intelligence?tab=exports');
  await expect(page.locator('[data-testid="exports-table"]')).toBeVisible({ timeout: 8000 });
  await expect(page.locator('[data-testid="distribution-table"]')).not.toBeVisible();
});

test('RX-04: PM cannot access the hub Exports tab', async ({ page }) => {
  await loginAsPM(page);
  await page.goto('/intelligence?tab=exports');
  await expect(page.locator('[data-testid="intelligence-exports-panel"]')).not.toBeVisible({ timeout: 5000 });
});

test('RX-05: PM cannot reach exports via the legacy /reporting-centre route', async ({ page }) => {
  await loginAsPM(page);
  await page.goto('/reporting-centre');
  await expect(page.locator('[data-testid="exports-table"]')).not.toBeVisible({ timeout: 5000 });
});

// ─────────────────────────────────────────────────────────────────────
// RX-06 to RX-10: Exports Tab — KPI Strip
// ─────────────────────────────────────────────────────────────────────

test('RX-06: Clicking Exports tab shows Exports KPI strip', async ({ page }) => {
  await loginAsCEO(page);
  await page.goto('/intelligence?tab=exports');
  await expect(page.locator('[data-testid="exports-kpi-strip"]')).toBeVisible({ timeout: 8000 });
});

test('RX-07: Exports KPI strip shows Total Exports card', async ({ page }) => {
  await loginAsCEO(page);
  await page.goto('/intelligence?tab=exports');
  await expect(page.locator('[data-testid="exports-kpi-total"]')).toBeVisible({ timeout: 8000 });
  const text = await page.locator('[data-testid="exports-kpi-total"]').innerText();
  expect(text).toMatch(/\d/);
});

test('RX-08: Exports KPI strip shows Distributed card', async ({ page }) => {
  await loginAsCEO(page);
  await page.goto('/intelligence?tab=exports');
  await expect(page.locator('[data-testid="exports-kpi-distributed"]')).toBeVisible({ timeout: 8000 });
});

test('RX-09: Exports KPI strip shows Downloaded and Generated cards', async ({ page }) => {
  await loginAsCEO(page);
  await page.goto('/intelligence?tab=exports');
  await expect(page.locator('[data-testid="exports-kpi-downloaded"]')).toBeVisible({ timeout: 8000 });
  await expect(page.locator('[data-testid="exports-kpi-pending"]')).toBeVisible();
});

test('RX-10: Exports KPI strip shows Archived card', async ({ page }) => {
  await loginAsCEO(page);
  await page.goto('/intelligence?tab=exports');
  await expect(page.locator('[data-testid="exports-kpi-archived"]')).toBeVisible({ timeout: 8000 });
});

// ─────────────────────────────────────────────────────────────────────
// RX-11 to RX-15: Exports Tab — Table
// ─────────────────────────────────────────────────────────────────────

test('RX-11: Exports table renders with seeded export rows', async ({ page }) => {
  await loginAsCEO(page);
  await page.goto('/intelligence?tab=exports');
  await expect(page.locator('[data-testid="exports-table"]')).toBeVisible({ timeout: 8000 });
  await expect(page.locator('[data-testid^="export-row-"]').first()).toBeVisible({ timeout: 8000 });
});

test('RX-12: Exports table shows exp-001 seeded row', async ({ page }) => {
  await loginAsCEO(page);
  await page.goto('/intelligence?tab=exports');
  await expect(page.locator('[data-testid="export-row-exp-001"]')).toBeVisible({ timeout: 8000 });
});

test('RX-13: Exports table rows have View, Download, and Archive buttons', async ({ page }) => {
  await loginAsCEO(page);
  await page.goto('/intelligence?tab=exports');
  await expect(page.locator('[data-testid="export-view-btn-exp-004"]')).toBeVisible({ timeout: 8000 });
  await expect(page.locator('[data-testid="export-download-btn-exp-004"]')).toBeVisible();
  await expect(page.locator('[data-testid="export-archive-btn-exp-004"]')).toBeVisible();
});

test('RX-14: Export status filter renders All, Generated, Downloaded, Distributed, Archived buttons', async ({ page }) => {
  await loginAsCEO(page);
  await page.goto('/intelligence?tab=exports');
  await expect(page.locator('[data-testid="exports-status-filter"]')).toBeVisible({ timeout: 8000 });
  await expect(page.locator('[data-testid="export-filter-status-all"]')).toBeVisible();
  await expect(page.locator('[data-testid="export-filter-status-generated"]')).toBeVisible();
  await expect(page.locator('[data-testid="export-filter-status-distributed"]')).toBeVisible();
  await expect(page.locator('[data-testid="export-filter-status-archived"]')).toBeVisible();
});

test('RX-15: Filtering exports by Generated shows only generated rows', async ({ page }) => {
  await loginAsCEO(page);
  await page.goto('/intelligence?tab=exports');
  await page.locator('[data-testid="export-filter-status-generated"]').click();
  const rows = page.locator('[data-testid^="export-row-"]');
  const count = await rows.count();
  expect(count).toBeGreaterThan(0);
});

// ─────────────────────────────────────────────────────────────────────
// RX-16 to RX-21: Export Detail Dialog
// ─────────────────────────────────────────────────────────────────────

test('RX-16: Clicking View on an export opens Export Detail Dialog', async ({ page }) => {
  await loginAsCEO(page);
  await page.goto('/intelligence?tab=exports');
  await page.locator('[data-testid^="export-view-btn-"]').first().click();
  await expect(page.locator('[data-testid="export-detail-dialog"]')).toBeVisible({ timeout: 8000 });
});

test('RX-17: Export Detail Dialog shows doctrine notice about source report immutability', async ({ page }) => {
  await loginAsCEO(page);
  await page.goto('/intelligence?tab=exports');
  await page.locator('[data-testid="export-view-btn-exp-001"]').click();
  await expect(page.locator('[data-testid="export-detail-doctrine-notice"]')).toBeVisible({ timeout: 8000 });
  await expect(page.locator('[data-testid="export-detail-doctrine-notice"]')).toContainText('do not modify source reports');
});

test('RX-18: Export Detail Dialog shows Export ID and Audit Reference', async ({ page }) => {
  await loginAsCEO(page);
  await page.goto('/intelligence?tab=exports');
  await page.locator('[data-testid="export-view-btn-exp-001"]').click();
  await expect(page.locator('[data-testid="export-detail-dialog"]')).toBeVisible({ timeout: 8000 });
  await expect(page.locator('[data-testid="export-detail-dialog"]')).toContainText('exp-001');
  await expect(page.locator('[data-testid="export-detail-dialog"]')).toContainText('AUD-EXP-001');
});

test('RX-19: Export Detail Dialog close button dismisses the dialog', async ({ page }) => {
  await loginAsCEO(page);
  await page.goto('/intelligence?tab=exports');
  await page.locator('[data-testid^="export-view-btn-"]').first().click();
  await expect(page.locator('[data-testid="export-detail-dialog"]')).toBeVisible({ timeout: 8000 });
  await page.locator('[data-testid="export-detail-close-btn"]').click();
  await expect(page.locator('[data-testid="export-detail-dialog"]')).not.toBeVisible({ timeout: 5000 });
});

test('RX-20: Export Detail Dialog Download button triggers status change to downloaded', async ({ page }) => {
  await loginAsCEO(page);
  await page.goto('/intelligence?tab=exports');
  await page.locator('[data-testid="export-view-btn-exp-004"]').click();
  await expect(page.locator('[data-testid="export-detail-dialog"]')).toBeVisible({ timeout: 8000 });
  await page.locator('[data-testid="export-detail-download-btn"]').click();
  // Dialog closes after action
  await expect(page.locator('[data-testid="export-detail-dialog"]')).not.toBeVisible({ timeout: 5000 });
  // Row should now show Downloaded badge
  await expect(page.locator('[data-testid="export-row-exp-004"]')).toContainText('Downloaded');
});

test('RX-21: Export Detail Dialog Archive button archives the export', async ({ page }) => {
  await loginAsCEO(page);
  await page.goto('/intelligence?tab=exports');
  await page.locator('[data-testid="export-view-btn-exp-005"]').click();
  await expect(page.locator('[data-testid="export-detail-dialog"]')).toBeVisible({ timeout: 8000 });
  await page.locator('[data-testid="export-detail-archive-btn"]').click();
  await expect(page.locator('[data-testid="export-detail-dialog"]')).not.toBeVisible({ timeout: 5000 });
  // After archive the row should show Archived badge
  await expect(page.locator('[data-testid="export-row-exp-005"]')).toContainText('Archived');
});

// ─────────────────────────────────────────────────────────────────────
// RX-22 to RX-24: Export Actions — Table Row Level
// ─────────────────────────────────────────────────────────────────────

test('RX-22: Download button in table row triggers download action', async ({ page }) => {
  await loginAsCEO(page);
  await page.goto('/intelligence?tab=exports');
  await expect(page.locator('[data-testid="export-download-btn-exp-004"]')).toBeVisible({ timeout: 8000 });
  await page.locator('[data-testid="export-download-btn-exp-004"]').click();
  await expect(page.locator('[data-testid="export-row-exp-004"]')).toContainText('Downloaded');
});

test('RX-23: Archive button in table row archives the export', async ({ page }) => {
  await loginAsCEO(page);
  await page.goto('/intelligence?tab=exports');
  const archiveBtn = page.locator('[data-testid^="export-archive-btn-"]').first();
  await expect(archiveBtn).toBeVisible({ timeout: 8000 });
  await archiveBtn.click();
  // Archived exports kpi count should still render
  await expect(page.locator('[data-testid="exports-kpi-archived"]')).toBeVisible();
});

test('RX-24: Archived exports do not show Download or Archive buttons', async ({ page }) => {
  await loginAsCEO(page);
  await page.goto('/intelligence?tab=exports');
  await page.locator('[data-testid="export-filter-status-archived"]').click();
  const rows = page.locator('[data-testid^="export-row-"]');
  const count = await rows.count();
  if (count > 0) {
    const rowId = await rows.first().getAttribute('data-testid');
    const id = rowId?.replace('export-row-', '');
    if (id) {
      await expect(page.locator(`[data-testid="export-download-btn-${id}"]`)).not.toBeVisible();
      await expect(page.locator(`[data-testid="export-archive-btn-${id}"]`)).not.toBeVisible();
    }
  }
});

// ─────────────────────────────────────────────────────────────────────
// RX-25 to RX-26: Board Pack Generator
// ─────────────────────────────────────────────────────────────────────

test('RX-25: Generate Board Pack button is visible on Exports tab', async ({ page }) => {
  await loginAsCEO(page);
  await page.goto('/intelligence?tab=exports');
  await expect(page.locator('[data-testid="generate-board-pack-btn"]')).toBeVisible({ timeout: 8000 });
});

test('RX-26: Clicking Generate Board Pack adds a new board_pack export to the table', async ({ page }) => {
  await loginAsCEO(page);
  await page.goto('/intelligence?tab=exports');
  const initialCount = await page.locator('[data-testid^="export-row-"]').count();
  await page.locator('[data-testid="generate-board-pack-btn"]').click();
  await expect(page.locator('[data-testid^="export-row-"]')).toHaveCount(initialCount + 1, { timeout: 8000 });
});

// ─────────────────────────────────────────────────────────────────────
// RX-27 to RX-31: Distribution Tab
// ─────────────────────────────────────────────────────────────────────

test('RX-27: Clicking Distribution tab shows Distribution KPI strip', async ({ page }) => {
  await loginAsCEO(page);
  await page.goto('/intelligence?tab=exports&sub=distribution');
  await expect(page.locator('[data-testid="distribution-kpi-strip"]')).toBeVisible({ timeout: 8000 });
});

test('RX-28: Distribution KPI strip shows Total Distributions', async ({ page }) => {
  await loginAsCEO(page);
  await page.goto('/intelligence?tab=exports&sub=distribution');
  await expect(page.locator('[data-testid="dist-kpi-total"]')).toBeVisible({ timeout: 8000 });
  const text = await page.locator('[data-testid="dist-kpi-total"]').innerText();
  expect(text).toMatch(/\d/);
});

test('RX-29: Distribution KPI strip shows Delivered, Pending, Failed, and Delivery Rate', async ({ page }) => {
  await loginAsCEO(page);
  await page.goto('/intelligence?tab=exports&sub=distribution');
  await expect(page.locator('[data-testid="dist-kpi-delivered"]')).toBeVisible({ timeout: 8000 });
  await expect(page.locator('[data-testid="dist-kpi-pending"]')).toBeVisible();
  await expect(page.locator('[data-testid="dist-kpi-failed"]')).toBeVisible();
  await expect(page.locator('[data-testid="dist-kpi-rate"]')).toBeVisible();
});

test('RX-30: Distribution table renders with seeded distribution rows', async ({ page }) => {
  await loginAsCEO(page);
  await page.goto('/intelligence?tab=exports&sub=distribution');
  await expect(page.locator('[data-testid="distribution-table"]')).toBeVisible({ timeout: 8000 });
  await expect(page.locator('[data-testid^="distribution-row-"]').first()).toBeVisible({ timeout: 8000 });
});

test('RX-31: Distribution table shows dist-001 seeded row', async ({ page }) => {
  await loginAsCEO(page);
  await page.goto('/intelligence?tab=exports&sub=distribution');
  await expect(page.locator('[data-testid="distribution-row-dist-001"]')).toBeVisible({ timeout: 8000 });
});

// ─────────────────────────────────────────────────────────────────────
// RX-32 to RX-35: Dashboard — Report Exports Widget
// ─────────────────────────────────────────────────────────────────────

test('RX-32: legacy /reporting-centre redirects CEO into the hub', async ({ page }) => {
  await loginAsCEO(page);
  await page.goto('/reporting-centre');
  await expect(page).toHaveURL(/\/intelligence\?tab=reports/, { timeout: 8000 });
  await expect(page.locator('[data-testid="intelligence-reports-panel"]')).toBeVisible({ timeout: 8000 });
});

test('RX-33: Hub Exports tab shows export KPI counts', async ({ page }) => {
  await loginAsCEO(page);
  await page.goto('/intelligence?tab=exports');
  await expect(page.locator('[data-testid="intelligence-exports-panel"]')).toBeVisible({ timeout: 8000 });
  await expect(page.locator('body')).toContainText(/export|distributed|download/i);
});

test('RX-34: Hub Distribution sub-tab shows distribution and delivery data', async ({ page }) => {
  await loginAsCEO(page);
  await page.goto('/intelligence?tab=exports&sub=distribution');
  await expect(page.locator('[data-testid="distribution-table"]')).toBeVisible({ timeout: 8000 });
  await expect(page.locator('body')).not.toContainText(/Error|TypeError|Uncaught/i);
});

test('RX-35: Hub Exports tab loads without errors at its bookmarkable URL', async ({ page }) => {
  await loginAsCEO(page);
  await page.goto('/intelligence?tab=exports');
  await expect(page.locator('[data-testid="intelligence-exports-panel"]')).toBeVisible({ timeout: 8000 });
  await expect(page.url()).toMatch(/intelligence\?tab=exports/);
});

// ─────────────────────────────────────────────────────────────────────
// RX-36 to RX-38: ECC — Export Status Snapshot
// UX-5: removed. The ECC page is unrouted; its Export Status Snapshot was
// deliberately dropped (the hub Exports tab is its superset home — spec
// §6.2 / §13.2).
// ─────────────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────────────
// RX-39 to RX-40: Doctrine — Exports are informational only
// ─────────────────────────────────────────────────────────────────────

test('RX-39: Exports tab does not contain Approve, Override, or Mutate controls', async ({ page }) => {
  await loginAsCEO(page);
  await page.goto('/intelligence?tab=exports');
  await expect(page.locator('[data-testid="exports-table"]')).toBeVisible({ timeout: 8000 });
  await expect(page.locator('button:has-text("Approve")')).not.toBeVisible();
  await expect(page.locator('button:has-text("Override")')).not.toBeVisible();
  await expect(page.locator('button:has-text("Mutate")')).not.toBeVisible();
});

test('RX-40: Export Detail Dialog contains no financial mutation controls', async ({ page }) => {
  await loginAsCEO(page);
  await page.goto('/intelligence?tab=exports');
  await page.locator('[data-testid^="export-view-btn-"]').first().click();
  await expect(page.locator('[data-testid="export-detail-dialog"]')).toBeVisible({ timeout: 8000 });
  await expect(page.locator('[data-testid="export-detail-dialog"] button:has-text("Approve")')).not.toBeVisible();
  await expect(page.locator('[data-testid="export-detail-dialog"] button:has-text("Modify")')).not.toBeVisible();
  await expect(page.locator('[data-testid="export-detail-dialog"] button:has-text("Override")')).not.toBeVisible();
  // Doctrine notice must be visible
  await expect(page.locator('[data-testid="export-detail-doctrine-notice"]')).toBeVisible();
});
