/**
 * PHASE 5.7 — ACCOUNTING SETTINGS DOCTRINE TESTS
 *
 * Covers:
 *   1.  Settings page loads at /accounting-settings
 *   2.  CEO can access the page
 *   3.  Provider cards section renders
 *   4.  All four provider cards render
 *   5.  QuickBooks card shows Connected status
 *   6.  Xero card shows Connected status
 *   7.  FreshBooks card shows Disconnected status
 *   8.  Default provider indicator visible on QuickBooks
 *   9.  Default provider can be changed (Xero -> set default)
 *  10.  Disable action updates provider status to Disabled
 *  11.  Sync policies section renders all controls
 *  12.  Sync mode toggle renders and is interactive
 *  13.  Entity mapping section renders all four entities
 *  14.  Customer mapping shows Mapped status
 *  15.  Job mapping shows unmapped status
 *
 * Pattern: loginAsCEO (hard goto /auth) + page.goto for navigation.
 * Consistent with accounting-sync.spec.ts and other doctrine tests.
 */

import { test, expect } from "@playwright/test";
import { loginAsCEO } from "../helpers/login";
import { clearBrowserState } from "../helpers/state";

const BASE = "http://localhost:5000";

test.beforeEach(async ({ page }) => {
  await clearBrowserState(page);
});

// ── 1: Page loads at /accounting-settings ───────────────────────────────
test("1. Accounting Settings page loads at /accounting-settings", async ({ page }) => {
  await loginAsCEO(page);
  await page.goto(`${BASE}/accounting-settings`);
  await expect(page.getByTestId("accounting-settings-page")).toBeVisible();
});

// ── 2: CEO visibility ──────────────────────────────────────────────
test("2. CEO can see Accounting Settings page heading", async ({ page }) => {
  await loginAsCEO(page);
  await page.goto(`${BASE}/accounting-settings`);
  await expect(page.getByRole("heading", { name: "Accounting Settings" })).toBeVisible();
});

// ── 3: Provider cards section renders ─────────────────────────────────
test("3. Provider cards section renders", async ({ page }) => {
  await loginAsCEO(page);
  await page.goto(`${BASE}/accounting-settings`);
  await expect(page.getByTestId("provider-cards-section")).toBeVisible();
});

// ── 4: All four provider cards render ─────────────────────────────────
test("4. All four provider cards render (QuickBooks, Xero, FreshBooks, Zoho)", async ({ page }) => {
  await loginAsCEO(page);
  await page.goto(`${BASE}/accounting-settings`);
  await expect(page.getByTestId("provider-card-quickbooks")).toBeVisible();
  await expect(page.getByTestId("provider-card-xero")).toBeVisible();
  await expect(page.getByTestId("provider-card-freshbooks")).toBeVisible();
  await expect(page.getByTestId("provider-card-zoho")).toBeVisible();
});

// ── 5: QuickBooks shows Connected ────────────────────────────────────
test("5. QuickBooks card shows Connected status", async ({ page }) => {
  await loginAsCEO(page);
  await page.goto(`${BASE}/accounting-settings`);
  const card = page.getByTestId("provider-card-quickbooks");
  await expect(card.getByTestId("provider-status-badge-connected")).toBeVisible();
});

// ── 6: Xero shows Connected ──────────────────────────────────────────
test("6. Xero card shows Connected status", async ({ page }) => {
  await loginAsCEO(page);
  await page.goto(`${BASE}/accounting-settings`);
  const card = page.getByTestId("provider-card-xero");
  await expect(card.getByTestId("provider-status-badge-connected")).toBeVisible();
});

// ── 7: FreshBooks shows Disconnected ─────────────────────────────────
test("7. FreshBooks card shows Disconnected status", async ({ page }) => {
  await loginAsCEO(page);
  await page.goto(`${BASE}/accounting-settings`);
  const card = page.getByTestId("provider-card-freshbooks");
  await expect(card.getByTestId("provider-status-badge-disconnected")).toBeVisible();
});

// ── 8: Default indicator on QuickBooks ───────────────────────────────
test("8. Default provider indicator is visible on QuickBooks card", async ({ page }) => {
  await loginAsCEO(page);
  await page.goto(`${BASE}/accounting-settings`);
  await expect(page.getByTestId("provider-default-indicator-quickbooks")).toBeVisible();
});

// ── 9: Set Default changes default provider ───────────────────────────
test("9. Setting Xero as default removes QuickBooks default indicator", async ({ page }) => {
  await loginAsCEO(page);
  await page.goto(`${BASE}/accounting-settings`);
  // QuickBooks is currently default; click Set Default on Xero
  await page.getByTestId("btn-set-default-xero").click();
  // QuickBooks should no longer have default indicator
  await expect(page.getByTestId("provider-default-indicator-quickbooks")).not.toBeVisible();
  // Xero should now have it
  await expect(page.getByTestId("provider-default-indicator-xero")).toBeVisible();
});

// ── 10: Disable action updates status ─────────────────────────────────
test("10. Disabling Xero shows Enable button instead of Disable", async ({ page }) => {
  await loginAsCEO(page);
  await page.goto(`${BASE}/accounting-settings`);
  // Disable Xero
  await page.getByTestId("btn-disable-xero").click();
  // Disable button should be gone; Enable button should appear
  await expect(page.getByTestId("btn-disable-xero")).not.toBeVisible();
  await expect(page.getByTestId("btn-enable-xero")).toBeVisible();
});

// ── 11: Sync policies section renders all controls ──────────────────────
test("11. Sync policies section renders all controls", async ({ page }) => {
  await loginAsCEO(page);
  await page.goto(`${BASE}/accounting-settings`);
  await expect(page.getByTestId("sync-policy-section")).toBeVisible();
  await expect(page.getByTestId("toggle-sync-mode")).toBeVisible();
  await expect(page.getByTestId("toggle-retry-failed")).toBeVisible();
  await expect(page.getByTestId("select-retry-interval")).toBeVisible();
  await expect(page.getByTestId("toggle-sync-notifications")).toBeVisible();
});

// ── 12: Sync mode toggle is interactive ──────────────────────────────
test("12. Sync mode toggle is visible and interactive", async ({ page }) => {
  await loginAsCEO(page);
  await page.goto(`${BASE}/accounting-settings`);
  const toggle = page.getByTestId("toggle-sync-mode");
  await expect(toggle).toBeVisible();
  // Default is automatic (checked). Summary shows Automatic.
  await expect(page.getByTestId("summary-sync-mode")).toContainText("Automatic");
  // Click to switch to Manual
  await toggle.click();
  await expect(page.getByTestId("summary-sync-mode")).toContainText("Manual");
});

// ── 13: Entity mapping section renders all four entities ─────────────────
test("13. Entity mapping section renders all four entity rows", async ({ page }) => {
  await loginAsCEO(page);
  await page.goto(`${BASE}/accounting-settings`);
  await expect(page.getByTestId("entity-mapping-section")).toBeVisible();
  await expect(page.getByTestId("entity-mapping-row-customer")).toBeVisible();
  await expect(page.getByTestId("entity-mapping-row-invoice")).toBeVisible();
  await expect(page.getByTestId("entity-mapping-row-payroll")).toBeVisible();
  await expect(page.getByTestId("entity-mapping-row-job")).toBeVisible();
});

// ── 14: Customer mapping shows Mapped ────────────────────────────────
test("14. Customer entity mapping status shows Mapped", async ({ page }) => {
  await loginAsCEO(page);
  await page.goto(`${BASE}/accounting-settings`);
  await expect(page.getByTestId("entity-mapping-status-customer")).toContainText("Mapped");
});

// ── 15: Job mapping shows Not Mapped ────────────────────────────────
test("15. Job entity mapping status shows Not Mapped", async ({ page }) => {
  await loginAsCEO(page);
  await page.goto(`${BASE}/accounting-settings`);
  await expect(page.getByTestId("entity-mapping-status-job")).toContainText("Not Mapped");
});
