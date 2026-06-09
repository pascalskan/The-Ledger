/**
 * PHASE 5.3 DOCTRINE TEST — Invoice Generation Pipeline
 *
 * UX-4: Invoice Builder moved to Finance Hub at /finance?tab=invoicing.
 * Financial Explorer Invoice Pipeline tab now at /finance?tab=records.
 *
 * Validates:
 *  1. Finance Hub Invoicing tab loads and shows seed draft INV-2026-0001
 *  2. Pipeline strip shows correct counts per status
 *  3. Status workflow advances: draft → ready → sent → paid
 *  4. Finance Hub Records tab "Invoice Pipeline" tab renders correctly
 *  5. Job Detail shows invoice draft status for seeded job
 *
 * Data source: seed draft seeded by the IIFE in mockData.ts for
 *   dj-kitchen-extract-1 → INV-2026-0001 (6 lines, £4,922.75 total)
 */

import { test, expect } from "@playwright/test";
import { loginAsCEO } from "../helpers/login";
import { clearBrowserState } from "../helpers/state";

test.beforeEach(async ({ page }) => {
  await clearBrowserState(page);
});

// ─────────────────────────────────────────────────────────────────
// TEST 1: Invoice Builder content loads with seed data
// ─────────────────────────────────────────────────────────────────
test("Invoice Builder page loads and shows seed draft INV-2026-0001", async ({ page }) => {
  await loginAsCEO(page);
  await page.goto("http://localhost:5000/finance?tab=invoicing");

  // Invoice Builder is now in a Sheet — open it via the Create Invoice button
  await page.getByTestId("btn-create-invoice").click();

  await expect(page.getByTestId("page-title-invoice-builder")).toBeVisible();
  await expect(page.getByTestId("invoice-pipeline-strip")).toBeVisible();

  // Seed draft card
  await expect(page.getByTestId("invoice-draft-card-seed-draft-kex-1")).toBeVisible();

  // Invoice number
  await expect(page.getByTestId("draft-number-seed-draft-kex-1")).toHaveText("INV-2026-0001");

  // Status
  await expect(page.getByTestId("draft-status-seed-draft-kex-1")).toContainText("Draft");

  // Total £4,922.75
  await expect(page.getByTestId("draft-total-seed-draft-kex-1")).toContainText("4,922.75");
});

// ─────────────────────────────────────────────────────────────────
// TEST 2: Pipeline strip shows 1 draft, 0 others on seed load
// ─────────────────────────────────────────────────────────────────
test("Pipeline strip shows correct counts from seed data", async ({ page }) => {
  await loginAsCEO(page);
  await page.goto("http://localhost:5000/finance?tab=invoicing");

  // Invoice Builder is now in a Sheet — open it to access pipeline strip
  await page.getByTestId("btn-create-invoice").click();

  await expect(page.getByTestId("pipeline-count-draft")).toHaveText("1");
  await expect(page.getByTestId("pipeline-count-ready")).toHaveText("0");
  await expect(page.getByTestId("pipeline-count-sent")).toHaveText("0");
  await expect(page.getByTestId("pipeline-count-paid")).toHaveText("0");
});

// ─────────────────────────────────────────────────────────────────
// TEST 3: Status workflow advances draft → ready
// ─────────────────────────────────────────────────────────────────
test("Invoice draft can be advanced from draft to ready", async ({ page }) => {
  await loginAsCEO(page);
  await page.goto("http://localhost:5000/finance?tab=invoicing");

  // Invoice Builder is now in a Sheet — open it
  await page.getByTestId("btn-create-invoice").click();

  const advanceBtn = page.getByTestId("btn-advance-seed-draft-kex-1");
  await expect(advanceBtn).toBeVisible();
  await expect(advanceBtn).toContainText("Mark as Ready");

  await advanceBtn.click();

  // Status updates to Ready
  await expect(page.getByTestId("draft-status-seed-draft-kex-1")).toContainText("Ready");

  // Pipeline strip updated
  await expect(page.getByTestId("pipeline-count-draft")).toHaveText("0");
  await expect(page.getByTestId("pipeline-count-ready")).toHaveText("1");
});

// ─────────────────────────────────────────────────────────────────
// TEST 4: Full status workflow: draft → ready → sent → paid
// ─────────────────────────────────────────────────────────────────
test("Invoice draft completes full workflow draft → ready → sent → paid", async ({ page }) => {
  await loginAsCEO(page);
  await page.goto("http://localhost:5000/finance?tab=invoicing");

  // Invoice Builder is now in a Sheet — open it
  await page.getByTestId("btn-create-invoice").click();

  // draft → ready
  await page.getByTestId("btn-advance-seed-draft-kex-1").click();
  await expect(page.getByTestId("draft-status-seed-draft-kex-1")).toContainText("Ready");

  // ready → sent
  await page.getByTestId("btn-advance-seed-draft-kex-1").click();
  await expect(page.getByTestId("draft-status-seed-draft-kex-1")).toContainText("Sent");

  // sent → paid
  await page.getByTestId("btn-advance-seed-draft-kex-1").click();
  await expect(page.getByTestId("draft-status-seed-draft-kex-1")).toContainText("Paid");

  // No advance button at terminal state
  await expect(page.getByTestId("btn-advance-seed-draft-kex-1")).not.toBeVisible();

  // Pipeline shows 1 paid
  await expect(page.getByTestId("pipeline-count-paid")).toHaveText("1");
  await expect(page.getByTestId("pipeline-count-draft")).toHaveText("0");
});

// ─────────────────────────────────────────────────────────────────
// TEST 5: Finance Hub Records tab — Invoice Pipeline tab
// ─────────────────────────────────────────────────────────────────
test("Finance Hub Records tab shows Invoice Pipeline tab with seed data", async ({ page }) => {
  await loginAsCEO(page);
  await page.goto("http://localhost:5000/finance?tab=records");

  const tab = page.getByTestId("tab-invoice-pipeline");
  await expect(tab).toBeVisible();
  await tab.click();

  await expect(page.getByTestId("invoice-pipeline-panel")).toBeVisible();

  // Seed draft should appear in Draft column
  await expect(page.getByTestId("fe-pipeline-count-draft")).toHaveText("1");
  await expect(page.getByTestId("fe-pipeline-count-ready")).toHaveText("0");
});

// ─────────────────────────────────────────────────────────────────
// TEST 6: Job Detail shows invoice draft panel
// ─────────────────────────────────────────────────────────────────
test("Job Detail shows invoice draft panel for seeded job", async ({ page }) => {
  await loginAsCEO(page);
  await page.goto("http://localhost:5000/jobs/dj-kitchen-extract-1");

  await expect(
    page.getByTestId("job-invoice-draft-panel-dj-kitchen-extract-1")
  ).toBeVisible();

  await expect(
    page.getByTestId("job-draft-number-dj-kitchen-extract-1")
  ).toHaveText("INV-2026-0001");

  await expect(
    page.getByTestId("job-draft-status-dj-kitchen-extract-1")
  ).toContainText("Draft");

  await expect(
    page.getByTestId("job-draft-total-dj-kitchen-extract-1")
  ).toContainText("4,922.75");
});
