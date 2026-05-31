/**
 * PHASE 5.6 — ACCOUNTING SYNC DOCTRINE TESTS
 *
 * Covers:
 *   1.  Accounting Sync tab renders in Financial Explorer
 *   2.  Accounting Sync tab panel renders without error
 *   3.  Sync KPI strip renders all four KPI cards
 *   4.  Seed data shows correct KPI values (1 pending, 2 synced, 1 failed, 1 retry)
 *   5.  Sync queue table renders
 *   6.  Provider badges are visible in the queue
 *   7.  QuickBooks provider badge visible
 *   8.  Xero provider badge visible
 *   9.  Synced records show external reference IDs
 *  10.  Failed record shows Retry + Details buttons
 *  11.  Error details panel opens and shows resolution guidance
 *  12.  Sync audit trail toggle opens the trail panel
 *  13.  Job Detail: Accounting Synchronization panel renders for seeded job
 *
 * Pattern: loginAsCEO (hard goto /auth) + page.goto for navigation.
 * Consistent with payroll-export.spec.ts and margin-intelligence.spec.ts.
 */

import { test, expect } from "@playwright/test";
import { loginAsCEO } from "../helpers/login";
import { clearBrowserState } from "../helpers/state";

const BASE = "http://localhost:5000";
const SEEDED_JOB_ID = "dj-kitchen-extract-1";

test.beforeEach(async ({ page }) => {
  await clearBrowserState(page);
});

// ── 1: Tab renders in Financial Explorer ───────────────────────────────────
test("1. Accounting Sync tab trigger renders in Financial Explorer", async ({ page }) => {
  await loginAsCEO(page);
  await page.goto(`${BASE}/financial-explorer`);
  await expect(page.getByTestId("tab-accounting-sync")).toBeVisible();
});

// ── 2: Tab panel loads without error ────────────────────────────────────────
test("2. Accounting Sync tab panel renders without error", async ({ page }) => {
  await loginAsCEO(page);
  await page.goto(`${BASE}/financial-explorer`);
  await page.getByTestId("tab-accounting-sync").click();
  await expect(page.getByTestId("accounting-sync-tab-panel")).toBeVisible();
});

// ── 3: KPI strip renders all four cards ────────────────────────────────────
test("3. Sync KPI strip renders Pending, Synced, Failed, Retry Required cards", async ({ page }) => {
  await loginAsCEO(page);
  await page.goto(`${BASE}/financial-explorer`);
  await page.getByTestId("tab-accounting-sync").click();
  await expect(page.getByTestId("kpi-sync-pending")).toBeVisible();
  await expect(page.getByTestId("kpi-sync-synced")).toBeVisible();
  await expect(page.getByTestId("kpi-sync-failed")).toBeVisible();
  await expect(page.getByTestId("kpi-sync-retry")).toBeVisible();
});

// ── 4: Seed data KPI values ─────────────────────────────────────────────────
// SEED: sync-001 synced, sync-002 synced, sync-003 failed, sync-004 pending, sync-005 retry_required
test("4. Seed data KPI values: 1 pending, 2 synced, 1 failed, 1 retry required", async ({ page }) => {
  await loginAsCEO(page);
  await page.goto(`${BASE}/financial-explorer`);
  await page.getByTestId("tab-accounting-sync").click();
  await expect(page.getByTestId("kpi-sync-pending")).toContainText("1");
  await expect(page.getByTestId("kpi-sync-synced")).toContainText("2");
  await expect(page.getByTestId("kpi-sync-failed")).toContainText("1");
  await expect(page.getByTestId("kpi-sync-retry")).toContainText("1");
});

// ── 5: Sync queue table renders ─────────────────────────────────────────────
test("5. Sync queue table renders with seeded records", async ({ page }) => {
  await loginAsCEO(page);
  await page.goto(`${BASE}/financial-explorer`);
  await page.getByTestId("tab-accounting-sync").click();
  await expect(page.getByTestId("sync-queue-table")).toBeVisible();
  await expect(page.getByTestId("sync-row-sync-001")).toBeVisible();
  await expect(page.getByTestId("sync-row-sync-003")).toBeVisible();
});

// ── 6: Provider badges visible in queue ────────────────────────────────────
test("6. Provider badges are visible in the sync queue", async ({ page }) => {
  await loginAsCEO(page);
  await page.goto(`${BASE}/financial-explorer`);
  await page.getByTestId("tab-accounting-sync").click();
  const qbBadges = page.getByTestId("provider-badge-quickbooks");
  await expect(qbBadges.first()).toBeVisible();
});

// ── 7: QuickBooks provider badge visible ───────────────────────────────────
test("7. QuickBooks provider badge is visible in sync queue", async ({ page }) => {
  await loginAsCEO(page);
  await page.goto(`${BASE}/financial-explorer`);
  await page.getByTestId("tab-accounting-sync").click();
  await expect(page.getByTestId("provider-badge-quickbooks").first()).toBeVisible();
  await expect(page.getByTestId("provider-badge-quickbooks").first()).toContainText("QuickBooks");
});

// ── 8: Xero provider badge visible ─────────────────────────────────────────
test("8. Xero provider badge is visible in sync queue", async ({ page }) => {
  await loginAsCEO(page);
  await page.goto(`${BASE}/financial-explorer`);
  await page.getByTestId("tab-accounting-sync").click();
  await expect(page.getByTestId("provider-badge-xero").first()).toBeVisible();
  await expect(page.getByTestId("provider-badge-xero").first()).toContainText("Xero");
});

// ── 9: External IDs visible for synced records ─────────────────────────────
test("9. Synced records show external reference IDs", async ({ page }) => {
  await loginAsCEO(page);
  await page.goto(`${BASE}/financial-explorer`);
  await page.getByTestId("tab-accounting-sync").click();
  // sync-001: QB-INV-4421, sync-002: XERO-CUST-7823
  await expect(page.getByTestId("external-id-sync-001")).toContainText("QB-INV-4421");
  await expect(page.getByTestId("external-id-sync-002")).toContainText("XERO-CUST-7823");
});

// ── 10: Failed record shows Retry + Details buttons ────────────────────────
test("10. Failed sync record shows Retry and Details buttons", async ({ page }) => {
  await loginAsCEO(page);
  await page.goto(`${BASE}/financial-explorer`);
  await page.getByTestId("tab-accounting-sync").click();
  // sync-003 is the failed record
  await expect(page.getByTestId("btn-retry-sync-003")).toBeVisible();
  await expect(page.getByTestId("btn-error-details-sync-003")).toBeVisible();
});

// ── 11: Error details panel opens with resolution guidance ─────────────────
test("11. Error details panel opens and shows sync failure resolution guidance", async ({ page }) => {
  await loginAsCEO(page);
  await page.goto(`${BASE}/financial-explorer`);
  await page.getByTestId("tab-accounting-sync").click();
  await page.getByTestId("btn-error-details-sync-003").click();
  await expect(page.getByTestId("error-panel-sync-003")).toBeVisible();
  // Mapping missing error: resolution should mention account mapping
  await expect(page.getByTestId("error-resolution-sync-003")).toContainText("mapping");
});

// ── 12: Sync audit trail toggle opens the trail panel ──────────────────────
test("12. Sync audit trail toggle opens the audit trail panel", async ({ page }) => {
  await loginAsCEO(page);
  await page.goto(`${BASE}/financial-explorer`);
  await page.getByTestId("tab-accounting-sync").click();
  // Panel should not be visible yet
  await expect(page.getByTestId("sync-audit-trail")).not.toBeVisible();
  // Click toggle to open
  await page.getByTestId("btn-toggle-sync-audit").click();
  await expect(page.getByTestId("sync-audit-trail")).toBeVisible();
  // Seeded audit entries should appear
  await expect(page.getByTestId("sync-audit-entry-audit-sync-001")).toBeVisible();
});

// ── 13: Job Detail — Accounting Synchronization panel renders ──────────────
test("13. Job Detail page shows Accounting Synchronization panel for seeded job", async ({ page }) => {
  await loginAsCEO(page);
  await page.goto(`${BASE}/jobs/${SEEDED_JOB_ID}`);
  const syncPanel = page.getByTestId(`job-sync-panel-${SEEDED_JOB_ID}`);
  await expect(syncPanel).toBeVisible();
  // Should show overall status badge
  await expect(page.getByTestId(`job-sync-overall-status-${SEEDED_JOB_ID}`)).toBeVisible();
  // Should show seeded records
  await expect(page.getByTestId("job-sync-record-sync-001")).toBeVisible();
  await expect(page.getByTestId("job-sync-record-sync-002")).toBeVisible();
});
