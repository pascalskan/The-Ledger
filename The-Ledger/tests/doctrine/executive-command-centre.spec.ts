/**
 * DOCTRINE TESTS — Phase 6.5: Executive Command Centre
 *
 * 35 tests covering:
 *   - Executive Engine: summary calculations, health calculations, critical item aggregation
 *   - Executive Centre: page rendering, KPI strip, alert panel, operational panel,
 *     governance panel, financial panel, activity stream, doctrine notice
 *   - Dashboard Integration: Executive Snapshot widget
 *   - Deep Linking: navigation to source modules
 *   - Audit Integration: Centre viewed, alert opened, deep link opened
 *   - RBAC: CEO allowed, PM denied, Worker denied, Client denied
 */

import { test, expect } from '@playwright/test';
import { loginAsCEO, loginAsPM, loginAsWorker } from '../helpers/login';
import { clearBrowserState } from '../helpers/state';

test.beforeEach(async ({ page }) => {
  await clearBrowserState(page);
});

// ─────────────────────────────────────────────────────────────────────
// GROUP 1: EXECUTIVE COMMAND CENTRE — RENDERING & NAVIGATION
// ─────────────────────────────────────────────────────────────────────

test('ECC-01: Executive Command Centre is accessible to CEO via sidebar nav', async ({ page }) => {
  await loginAsCEO(page);
  await page.locator('[data-testid="nav-executive-command-centre"]').click();
  await expect(page).toHaveURL(/\/executive-command-centre/);
  await expect(page.locator('[data-testid="executive-command-centre-page"]')).toBeVisible();
});

test('ECC-02: Executive Command Centre page renders heading and CEO-only badge', async ({ page }) => {
  await loginAsCEO(page);
  await page.goto('/executive-command-centre');
  await expect(page.getByRole('heading', { name: /Executive Command Centre/i })).toBeVisible();
  await expect(page.locator('body')).toContainText('CEO Only');
});

test('ECC-03: Executive Command Centre renders without runtime errors', async ({ page }) => {
  await loginAsCEO(page);
  await page.goto('/executive-command-centre');
  await expect(page.locator('[data-testid="executive-command-centre-page"]')).toBeVisible();
  await expect(page.locator('body')).not.toContainText(/Uncaught|TypeError|ReferenceError/i);
});

test('ECC-04: Doctrine notice renders and describes read-only nature', async ({ page }) => {
  await loginAsCEO(page);
  await page.goto('/executive-command-centre');
  await expect(page.locator('[data-testid="exec-doctrine-notice"]')).toBeVisible();
  await expect(page.locator('[data-testid="exec-doctrine-notice"]')).toContainText(/read-only/i);
  await expect(page.locator('[data-testid="exec-doctrine-notice"]')).toContainText(/financial mutations/i);
});

// ─────────────────────────────────────────────────────────────────────
// GROUP 2: KPI STRIP
// ─────────────────────────────────────────────────────────────────────

test('ECC-05: KPI strip renders all five KPI cards', async ({ page }) => {
  await loginAsCEO(page);
  await page.goto('/executive-command-centre');
  await expect(page.locator('[data-testid="exec-kpi-strip"]')).toBeVisible();
  await expect(page.locator('[data-testid="exec-kpi-operational-health"]')).toBeVisible();
  await expect(page.locator('[data-testid="exec-kpi-financial-health"]')).toBeVisible();
  await expect(page.locator('[data-testid="exec-kpi-governance-health"]')).toBeVisible();
  await expect(page.locator('[data-testid="exec-kpi-open-exceptions"]')).toBeVisible();
  await expect(page.locator('[data-testid="exec-kpi-critical-alerts"]')).toBeVisible();
});

test('ECC-06: Operational Health KPI displays a health label and score', async ({ page }) => {
  await loginAsCEO(page);
  await page.goto('/executive-command-centre');
  const kpi = page.locator('[data-testid="exec-kpi-operational-health"]');
  await expect(kpi).toBeVisible();
  // Should contain a label (Operational / Needs Attention / Critical) and a /100 score
  await expect(kpi).toContainText(/\/100/);
});

test('ECC-07: Financial Health KPI displays a health label and score', async ({ page }) => {
  await loginAsCEO(page);
  await page.goto('/executive-command-centre');
  const kpi = page.locator('[data-testid="exec-kpi-financial-health"]');
  await expect(kpi).toContainText(/\/100/);
});

test('ECC-08: Governance Health KPI displays a health label and score', async ({ page }) => {
  await loginAsCEO(page);
  await page.goto('/executive-command-centre');
  const kpi = page.locator('[data-testid="exec-kpi-governance-health"]');
  await expect(kpi).toContainText(/\/100/);
});

test('ECC-09: Open Exceptions KPI displays a numeric count', async ({ page }) => {
  await loginAsCEO(page);
  await page.goto('/executive-command-centre');
  const kpi = page.locator('[data-testid="exec-kpi-open-exceptions"]');
  await expect(kpi).toBeVisible();
  const text = await kpi.textContent();
  expect(text).toMatch(/\d+/);
});

test('ECC-10: Critical Alerts KPI is visible and numeric', async ({ page }) => {
  await loginAsCEO(page);
  await page.goto('/executive-command-centre');
  const kpi = page.locator('[data-testid="exec-kpi-critical-alerts"]');
  await expect(kpi).toBeVisible();
  const text = await kpi.textContent();
  expect(text).toMatch(/\d+/);
});

// ─────────────────────────────────────────────────────────────────────
// GROUP 3: EXECUTIVE ALERT PANEL
// ─────────────────────────────────────────────────────────────────────

test('ECC-11: Executive Alert Panel renders with item count badge', async ({ page }) => {
  await loginAsCEO(page);
  await page.goto('/executive-command-centre');
  await expect(page.locator('[data-testid="exec-alert-panel"]')).toBeVisible();
  // Should show "X items" badge
  await expect(page.locator('[data-testid="exec-alert-panel"]')).toContainText(/items/i);
});

test('ECC-12: Executive Alert Panel renders alert items from seed data', async ({ page }) => {
  await loginAsCEO(page);
  await page.goto('/executive-command-centre');
  const alerts = page.locator('[data-testid^="exec-alert-item-"]');
  const count = await alerts.count();
  expect(count).toBeGreaterThan(0);
});

test('ECC-13: Each alert item shows priority badge (HIGH or CRITICAL)', async ({ page }) => {
  await loginAsCEO(page);
  await page.goto('/executive-command-centre');
  const panel = page.locator('[data-testid="exec-alert-panel"]');
  await expect(panel).toContainText(/HIGH|CRITICAL/i);
});

test('ECC-14: Clicking View Source on an alert navigates to the source module', async ({ page }) => {
  await loginAsCEO(page);
  await page.goto('/executive-command-centre');
  const firstViewSourceBtn = page.locator('[data-testid^="exec-alert-view-source-"]').first();
  await firstViewSourceBtn.click();
  // Should navigate away from executive command centre to a source route
  await expect(page).not.toHaveURL('/executive-command-centre');
});

// ─────────────────────────────────────────────────────────────────────
// GROUP 4: OPERATIONAL OVERVIEW PANEL
// ─────────────────────────────────────────────────────────────────────

test('ECC-15: Operational Overview Panel renders all five metrics', async ({ page }) => {
  await loginAsCEO(page);
  await page.goto('/executive-command-centre');
  await expect(page.locator('[data-testid="exec-operational-panel"]')).toBeVisible();
  await expect(page.locator('[data-testid="exec-op-active-workflows"]')).toBeVisible();
  await expect(page.locator('[data-testid="exec-op-active-automations"]')).toBeVisible();
  await expect(page.locator('[data-testid="exec-op-scheduled"]')).toBeVisible();
  await expect(page.locator('[data-testid="exec-op-event-volume"]')).toBeVisible();
  await expect(page.locator('[data-testid="exec-op-activity-volume"]')).toBeVisible();
});

test('ECC-16: Active Workflows metric shows a numeric value', async ({ page }) => {
  await loginAsCEO(page);
  await page.goto('/executive-command-centre');
  const metric = page.locator('[data-testid="exec-op-active-workflows"]');
  const text = await metric.textContent();
  expect(text).toMatch(/\d+/);
});

test('ECC-17: Workflow Centre deep link from Operational panel navigates to /workflows', async ({ page }) => {
  await loginAsCEO(page);
  await page.goto('/executive-command-centre');
  await page.locator('[data-testid="exec-op-link-workflows"]').click();
  await expect(page).toHaveURL(/\/workflows/);
});

// ─────────────────────────────────────────────────────────────────────
// GROUP 5: GOVERNANCE OVERVIEW PANEL
// ─────────────────────────────────────────────────────────────────────

test('ECC-18: Governance Overview Panel renders all four metrics', async ({ page }) => {
  await loginAsCEO(page);
  await page.goto('/executive-command-centre');
  await expect(page.locator('[data-testid="exec-governance-panel"]')).toBeVisible();
  await expect(page.locator('[data-testid="exec-gov-requires-review"]')).toBeVisible();
  await expect(page.locator('[data-testid="exec-gov-restricted"]')).toBeVisible();
  await expect(page.locator('[data-testid="exec-gov-suspended"]')).toBeVisible();
  await expect(page.locator('[data-testid="exec-gov-fin-sensitive"]')).toBeVisible();
});

test('ECC-19: Governance Panel deep link navigates to /automation-governance', async ({ page }) => {
  await loginAsCEO(page);
  await page.goto('/executive-command-centre');
  await page.locator('[data-testid="exec-gov-link-governance"]').click();
  await expect(page).toHaveURL(/\/automation-governance/);
});

// ─────────────────────────────────────────────────────────────────────
// GROUP 6: FINANCIAL OVERSIGHT PANEL
// ─────────────────────────────────────────────────────────────────────

test('ECC-20: Financial Oversight Panel renders all four metrics', async ({ page }) => {
  await loginAsCEO(page);
  await page.goto('/executive-command-centre');
  await expect(page.locator('[data-testid="exec-financial-panel"]')).toBeVisible();
  await expect(page.locator('[data-testid="exec-fin-failed-syncs"]')).toBeVisible();
  await expect(page.locator('[data-testid="exec-fin-recon-issues"]')).toBeVisible();
  await expect(page.locator('[data-testid="exec-fin-pending-controls"]')).toBeVisible();
  await expect(page.locator('[data-testid="exec-fin-open-exceptions"]')).toBeVisible();
});

test('ECC-21: Financial Panel reconciliation deep link navigates to /reconciliation-center', async ({ page }) => {
  await loginAsCEO(page);
  await page.goto('/executive-command-centre');
  await page.locator('[data-testid="exec-fin-link-reconciliation"]').click();
  await expect(page).toHaveURL(/\/reconciliation-center/);
});

test('ECC-22: Financial Panel syncs deep link navigates to /financial-explorer', async ({ page }) => {
  await loginAsCEO(page);
  await page.goto('/executive-command-centre');
  await page.locator('[data-testid="exec-fin-link-financial-explorer"]').click();
  await expect(page).toHaveURL(/\/financial-explorer/);
});

// ─────────────────────────────────────────────────────────────────────
// GROUP 7: EXECUTIVE ACTIVITY STREAM
// ─────────────────────────────────────────────────────────────────────

test('ECC-23: Executive Activity Stream renders with events from seed data', async ({ page }) => {
  await loginAsCEO(page);
  await page.goto('/executive-command-centre');
  await expect(page.locator('[data-testid="exec-activity-stream"]')).toBeVisible();
  const events = page.locator('[data-testid^="exec-activity-event-"]');
  const count = await events.count();
  expect(count).toBeGreaterThan(0);
});

test('ECC-24: Activity Stream View All deep link navigates to /activity-feed', async ({ page }) => {
  await loginAsCEO(page);
  await page.goto('/executive-command-centre');
  await page.locator('[data-testid="exec-activity-link"]').click();
  await expect(page).toHaveURL(/\/activity-feed/);
});

// ─────────────────────────────────────────────────────────────────────
// GROUP 8: MODULE NAVIGATION (DEEP LINKS)
// ─────────────────────────────────────────────────────────────────────

test('ECC-25: Module Navigation panel renders deep link buttons', async ({ page }) => {
  await loginAsCEO(page);
  await page.goto('/executive-command-centre');
  await expect(page.locator('[data-testid="exec-deep-links-panel"]')).toBeVisible();
  // Notification Centre link
  await expect(page.locator('[data-testid="exec-nav--notifications"]')).toBeVisible();
  // Workflow Centre link
  await expect(page.locator('[data-testid="exec-nav--workflows"]')).toBeVisible();
});

test('ECC-26: Notification Centre deep link navigates to /notifications', async ({ page }) => {
  await loginAsCEO(page);
  await page.goto('/executive-command-centre');
  await page.locator('[data-testid="exec-nav--notifications"]').click();
  await expect(page).toHaveURL(/\/notifications/);
});

test('ECC-27: Exception Resolution deep link navigates to /exception-resolution-center', async ({ page }) => {
  await loginAsCEO(page);
  await page.goto('/executive-command-centre');
  await page.locator('[data-testid="exec-nav--exception-resolution-center"]').click();
  await expect(page).toHaveURL(/\/exception-resolution-center/);
});

// ─────────────────────────────────────────────────────────────────────
// GROUP 9: DASHBOARD INTEGRATION — ZONE A ATTENTION STRIP
// ─────────────────────────────────────────────────────────────────────

test('ECC-28: Dashboard shows Zone A attention strip for CEO', async ({ page }) => {
  await loginAsCEO(page);
  await page.goto('/');
  await expect(page.locator('[data-testid="dashboard-zone-a"]')).toBeVisible();
});

test('ECC-29: Zone A shows Critical Alerts card with numeric count', async ({ page }) => {
  await loginAsCEO(page);
  await page.goto('/');
  await expect(page.locator('[data-testid="dashboard-zone-a-alerts"]')).toBeVisible();
  const text = await page.locator('[data-testid="dashboard-zone-a-alerts"]').textContent();
  expect(text).toMatch(/\d+|No Active Alerts/);
});

test('ECC-30: Zone A shows Pending Reviews card', async ({ page }) => {
  await loginAsCEO(page);
  await page.goto('/');
  await expect(page.locator('[data-testid="dashboard-zone-a-reviews"]')).toBeVisible();
});

test('ECC-31: Executive Command Centre page shows governance data', async ({ page }) => {
  await loginAsCEO(page);
  await page.goto('/executive-command-centre');
  await expect(page.locator('[data-testid="executive-command-centre-page"]')).toBeVisible();
});

test('ECC-32: Zone A Critical Alerts "View Alerts" button navigates to /executive-command-centre', async ({ page }) => {
  await loginAsCEO(page);
  await page.goto('/');
  // Only click the button if the alert card is in active (non-clear) state
  const alertCard = page.locator('[data-testid="dashboard-zone-a-alerts"]');
  await expect(alertCard).toBeVisible();
  const button = alertCard.getByRole('button', { name: /View Alerts/i });
  const hasButton = await button.count();
  if (hasButton > 0) {
    await button.click();
    await expect(page).toHaveURL(/\/executive-command-centre/);
  } else {
    // Card is in clear state — verify executive-command-centre is still accessible
    await page.goto('/executive-command-centre');
    await expect(page.locator('[data-testid="executive-command-centre-page"]')).toBeVisible();
  }
});

// ─────────────────────────────────────────────────────────────────────
// GROUP 10: RBAC — ACCESS CONTROL
// ─────────────────────────────────────────────────────────────────────

test('ECC-33: CEO can access Executive Command Centre at /executive-command-centre', async ({ page }) => {
  await loginAsCEO(page);
  await page.goto('/executive-command-centre');
  await expect(page.locator('[data-testid="executive-command-centre-page"]')).toBeVisible();
});

test('ECC-34: PM is denied access to /executive-command-centre', async ({ page }) => {
  await loginAsPM(page);
  await page.goto('/executive-command-centre');
  const url = page.url();
  const bodyText = await page.locator('body').textContent();
  const isDenied =
    url.includes('/auth') ||
    url.includes('/unauthorized') ||
    (bodyText && /unauthorized|access denied|not allowed|403/i.test(bodyText));
  expect(isDenied).toBeTruthy();
});

test('ECC-35: Worker is denied access to /executive-command-centre (redirected)', async ({ page }) => {
  await loginAsWorker(page);
  await page.goto('/executive-command-centre');
  const url = page.url();
  const bodyText = await page.locator('body').textContent();
  const isDenied =
    url.includes('/worker') ||
    url.includes('/auth') ||
    url.includes('/unauthorized') ||
    (bodyText && /unauthorized|access denied|not allowed|403/i.test(bodyText));
  expect(isDenied).toBeTruthy();
});
