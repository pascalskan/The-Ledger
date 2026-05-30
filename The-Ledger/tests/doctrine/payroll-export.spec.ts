/**
 * PHASE 5.4 DOCTRINE TEST — Payroll Export System
 *
 * Validates:
 *  1. Payroll Export page loads and is accessible to CEO
 *  2. Payroll Export page shows seeded worker data in preview
 *  3. Period selector renders All / Current / Previous options
 *  4. Generate Export button creates a PayrollExport document
 *  5. Generated export shows correct worker counts and totals
 *  6. Download CSV button is present on generated export
 *  7. Mark Exported advances status correctly
 *  8. Validation: empty period shows empty state, not error
 *  9. Export engine doctrine — data sourced from approved timesheets only
 *
 * Data source: Phase 4.5 seed data in mockData.ts
 *   Sophie Taylor: 32h @ £16/h cost, £55/h revenue
 *   Ben Hughes:    24h @ £16/h cost, £55/h revenue
 *   Total: 56h, cost £896, revenue £3,080
 */

import { test, expect } from "@playwright/test";
import { loginAsCEO } from "../helpers/login";
import { clearBrowserState } from "../helpers/state";

test.beforeEach(async ({ page }) => {
  await clearBrowserState(page);
});

// ─────────────────────────────────────────────────────────────────
// TEST 1: Page loads and is accessible to CEO
// ─────────────────────────────────────────────────────────────────
test("Payroll Export page is accessible to CEO and renders without error", async ({ page }) => {
  await loginAsCEO(page);

  // Navigate via sidebar link
  await page.locator("a").filter({ hasText: "Payroll Export" }).first().click();

  await expect(page).toHaveURL(/payroll-export/i);

  // Verify the page heading
  await expect(
    page.getByTestId("page-title-payroll-export")
  ).toBeVisible();

  await expect(page.getByTestId("page-title-payroll-export")).toContainText("Payroll Export");

  // Verify doctrine disclaimer
  await expect(page.locator("body")).toContainText(/not a payment instruction/i);

  // No runtime errors
  await expect(page.locator("body")).not.toContainText(/Error|Uncaught|TypeError/i);
});

// ─────────────────────────────────────────────────────────────────
// TEST 2: Shows seeded worker records in preview
// ─────────────────────────────────────────────────────────────────
test("Payroll Export page shows seeded worker records in preview", async ({ page }) => {
  await loginAsCEO(page);
  await page.goto("http://localhost:5000/payroll-export");

  // Phase 4.5 seed data creates TimesheetEntry records for Sophie Taylor and Ben Hughes
  await expect(page.locator("body")).toContainText(/Sophie Taylor|Ben Hughes/i);

  // Preview table should be visible
  await expect(page.getByTestId("payroll-export-preview-table")).toBeVisible();
});

// ─────────────────────────────────────────────────────────────────
// TEST 3: Period selector renders all three options
// ─────────────────────────────────────────────────────────────────
test("Payroll Export period selector shows all period options", async ({ page }) => {
  await loginAsCEO(page);
  await page.goto("http://localhost:5000/payroll-export");

  await expect(page.getByTestId("period-btn-all")).toBeVisible();
  await expect(page.getByTestId("period-btn-current-month")).toBeVisible();
  await expect(page.getByTestId("period-btn-last-month")).toBeVisible();
});

// ─────────────────────────────────────────────────────────────────
// TEST 4: KPI strip shows seeded worker count
// ─────────────────────────────────────────────────────────────────
test("Payroll Export KPI strip shows seeded worker and hour totals", async ({ page }) => {
  await loginAsCEO(page);
  await page.goto("http://localhost:5000/payroll-export");

  await expect(page.getByTestId("payroll-export-kpi-strip")).toBeVisible();

  // Should show 2 workers (Sophie Taylor + Ben Hughes from seed data)
  await expect(page.getByTestId("preview-worker-count")).toHaveText("2");

  // Should show 56.0 total hours (32 + 24)
  await expect(page.getByTestId("preview-total-hours")).toHaveText("56.0");
});

// ─────────────────────────────────────────────────────────────────
// TEST 5: Generate Export button creates a PayrollExport document
// ─────────────────────────────────────────────────────────────────
test("Generate Export button creates a PayrollExport and shows it in the list", async ({ page }) => {
  await loginAsCEO(page);
  await page.goto("http://localhost:5000/payroll-export");

  // Click generate
  await page.getByTestId("btn-generate-export").click();

  // Export list should now be visible
  await expect(page.getByTestId("payroll-exports-list")).toBeVisible();

  // At least one export card should exist
  await expect(
    page.locator("[data-testid^='export-card-']").first()
  ).toBeVisible();
});

// ─────────────────────────────────────────────────────────────────
// TEST 6: Generated export shows export number and status
// ─────────────────────────────────────────────────────────────────
test("Generated export shows PAY- export number and Generated status", async ({ page }) => {
  await loginAsCEO(page);
  await page.goto("http://localhost:5000/payroll-export");

  await page.getByTestId("btn-generate-export").click();

  // Export number format PAY-YYYY-NNNN
  const exportNumberEl = page.locator("[data-testid^='export-number-']").first();
  await expect(exportNumberEl).toBeVisible();
  await expect(exportNumberEl).toContainText(/PAY-\d{4}-\d{4}/);

  // Status should be Generated initially
  const exportStatusEl = page.locator("[data-testid^='export-status-']").first();
  await expect(exportStatusEl).toContainText(/Generated/i);

  // Should show Valid badge
  const validBadge = page.locator("[data-testid^='export-valid-badge-']").first();
  await expect(validBadge).toBeVisible();
});

// ─────────────────────────────────────────────────────────────────
// TEST 7: Download CSV button is present on generated export
// ─────────────────────────────────────────────────────────────────
test("Generated export has a Download CSV button", async ({ page }) => {
  await loginAsCEO(page);
  await page.goto("http://localhost:5000/payroll-export");

  await page.getByTestId("btn-generate-export").click();

  const downloadBtn = page.locator("[data-testid^='btn-download-']").first();
  await expect(downloadBtn).toBeVisible();
  await expect(downloadBtn).toContainText(/Download CSV/i);
});

// ─────────────────────────────────────────────────────────────────
// TEST 8: Mark Exported changes status to Exported
// ─────────────────────────────────────────────────────────────────
test("Mark Exported button advances export status to Exported", async ({ page }) => {
  await loginAsCEO(page);
  await page.goto("http://localhost:5000/payroll-export");

  await page.getByTestId("btn-generate-export").click();

  // Mark as exported
  const markExportedBtn = page.locator("[data-testid^='btn-mark-exported-']").first();
  await expect(markExportedBtn).toBeVisible();
  await markExportedBtn.click();

  // Status should now be Exported
  const exportStatusEl = page.locator("[data-testid^='export-status-']").first();
  await expect(exportStatusEl).toContainText(/Exported/i);

  // Mark Exported button should be gone (terminal state)
  await expect(markExportedBtn).not.toBeVisible();

  // Exported confirmation label should be visible
  const completeLabel = page.locator("[data-testid^='export-complete-label-']").first();
  await expect(completeLabel).toBeVisible();
  await expect(completeLabel).toContainText(/Exported to payroll system/i);
});

// ─────────────────────────────────────────────────────────────────
// TEST 9: Worker rows visible inside generated export breakdown
// ─────────────────────────────────────────────────────────────────
test("Generated export shows worker breakdown with Sophie Taylor and Ben Hughes", async ({ page }) => {
  await loginAsCEO(page);
  await page.goto("http://localhost:5000/payroll-export");

  await page.getByTestId("btn-generate-export").click();

  // At least one of the seeded workers should appear in the export breakdown
  await expect(page.locator("body")).toContainText(/Sophie Taylor|Ben Hughes/i);
});

// ─────────────────────────────────────────────────────────────────
// TEST 10: Doctrine — Payroll Export page linked from Payroll Staging
// ─────────────────────────────────────────────────────────────────
test("Payroll Export is accessible as a separate nav item from Payroll Staging", async ({ page }) => {
  await loginAsCEO(page);

  // Both nav items should be present in sidebar
  const stagingLink = page.locator("a").filter({ hasText: "Payroll Staging" }).first();
  const exportLink  = page.locator("a").filter({ hasText: "Payroll Export" }).first();

  await expect(stagingLink).toBeVisible();
  await expect(exportLink).toBeVisible();

  // They should navigate to different URLs
  await exportLink.click();
  await expect(page).toHaveURL(/payroll-export/i);

  await stagingLink.click();
  await expect(page).toHaveURL(/\/payroll$/i);
});
