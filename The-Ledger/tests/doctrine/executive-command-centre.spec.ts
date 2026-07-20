/**
 * DOCTRINE TESTS — Phase 6.5: Executive Command Centre / UX-5 rewrite
 *
 * UX-5: the ECC page is consolidated into the Intelligence Hub Overview tab
 * (/intelligence?tab=overview); the legacy route redirects. This suite is a
 * rewrite against the Overview components (spec §13.2):
 *
 * - Health Scorecard (4 dimensions — intel-health-*)
 * - Critical Items panel with §6.2-B severity rendering (P1-E)
 * - 6-tile Platform Summary strip (§10.1 verified sources)
 * - Legacy-route redirect coverage
 * - Dashboard Zone A integration (S-4 re-point)
 * - RBAC: CEO allowed, PM denied, Worker denied (Unauthorized page — P1-A)
 *
 * Dropped ECC sections (operational/governance/financial overview panels,
 * analytics summary, reporting/export snapshots, activity stream, module
 * navigation) get removal, not migration — each has a superset home
 * (hub tabs, Finance Hub, primary nav, hidden /event-monitor) per spec §6.2.
 */

import { test, expect } from '@playwright/test';
import { waitForRouteReady } from '../helpers/navigation';
import { loginAsCEO, loginAsPM, loginAsWorker } from '../helpers/login';
import { clearBrowserState } from '../helpers/state';

test.beforeEach(async ({ page }) => {
  await clearBrowserState(page);
});

// ─────────────────────────────────────────────────────────────────────
// GROUP 1: OVERVIEW TAB — RENDERING & NAVIGATION
// ─────────────────────────────────────────────────────────────────────

test('ECC-01: Overview is accessible to CEO via sidebar nav (default tab)', async ({ page }) => {
  await loginAsCEO(page);
  await page.locator('[data-testid="nav-intelligence-hub"]').click();
  await expect(page).toHaveURL(/\/intelligence/);
  await expect(page.locator('[data-testid="intelligence-overview-panel"]')).toBeVisible();
});

test('ECC-02: Hub renders Intelligence heading and CEO-only badge on Overview', async ({ page }) => {
  await loginAsCEO(page);
  await page.goto('/intelligence?tab=overview');
  await expect(page.locator('[data-testid="intelligence-hub-heading"]')).toContainText('Intelligence');
  await expect(page.locator('body')).toContainText('CEO Only');
});

test('ECC-03: Overview tab renders without runtime errors', async ({ page }) => {
  await loginAsCEO(page);
  await page.goto('/intelligence?tab=overview');
  await expect(page.locator('[data-testid="intelligence-overview-panel"]')).toBeVisible();
  await expect(page.locator('body')).not.toContainText(/Uncaught|TypeError|ReferenceError/i);
});

test('ECC-04: Hub doctrine notice renders and describes the read-only advisory layer', async ({ page }) => {
  await loginAsCEO(page);
  await page.goto('/intelligence?tab=overview');
  const notice = page.locator('[data-testid="intelligence-hub-doctrine-notice"]');
  await expect(notice).toBeVisible();
  await expect(notice).toContainText(/read-only/i);
  await expect(notice).toContainText(/financial mutations/i);
});

// ─────────────────────────────────────────────────────────────────────
// GROUP 2: HEALTH SCORECARD (4 dimensions — Blueprint 6.2)
// ─────────────────────────────────────────────────────────────────────

test('ECC-05: Health Scorecard renders all four dimension cards', async ({ page }) => {
  await loginAsCEO(page);
  await page.goto('/intelligence?tab=overview');
  await expect(page.locator('[data-testid="intel-health-scorecard"]')).toBeVisible();
  await expect(page.locator('[data-testid="intel-health-operational"]')).toBeVisible();
  await expect(page.locator('[data-testid="intel-health-financial"]')).toBeVisible();
  await expect(page.locator('[data-testid="intel-health-governance"]')).toBeVisible();
  await expect(page.locator('[data-testid="intel-health-workflow"]')).toBeVisible();
});

test('ECC-06: Operational Health card shows a score out of 100', async ({ page }) => {
  await loginAsCEO(page);
  await page.goto('/intelligence?tab=overview');
  await expect(page.locator('[data-testid="intel-health-operational"]')).toContainText(/\/100/);
});

test('ECC-07: Financial Health card shows a score out of 100', async ({ page }) => {
  await loginAsCEO(page);
  await page.goto('/intelligence?tab=overview');
  await expect(page.locator('[data-testid="intel-health-financial"]')).toContainText(/\/100/);
});

test('ECC-08: Governance Risk and Workflow Efficiency cards show scores out of 100', async ({ page }) => {
  await loginAsCEO(page);
  await page.goto('/intelligence?tab=overview');
  await expect(page.locator('[data-testid="intel-health-governance"]')).toContainText(/\/100/);
  await expect(page.locator('[data-testid="intel-health-workflow"]')).toContainText(/\/100/);
});

test('ECC-09: Health cards pair status text with the dot (colour never the sole signal)', async ({ page }) => {
  await loginAsCEO(page);
  await page.goto('/intelligence?tab=overview');
  const scorecard = page.locator('[data-testid="intel-health-scorecard"]');
  await expect(scorecard).toContainText(/Healthy|Warning|Critical/);
});

// ─────────────────────────────────────────────────────────────────────
// GROUP 3: CRITICAL ITEMS PANEL (§6.2-B severity rendering — P1-E)
// ─────────────────────────────────────────────────────────────────────

test('ECC-10: Critical Items panel renders with item count badge', async ({ page }) => {
  await loginAsCEO(page);
  await page.goto('/intelligence?tab=overview');
  await expect(page.locator('[data-testid="intel-critical-items"]')).toBeVisible();
  await expect(page.locator('[data-testid="intel-critical-items"]')).toContainText(/items/i);
});

test('ECC-11: Critical Items panel renders rows from seed data', async ({ page }) => {
  await loginAsCEO(page);
  await page.goto('/intelligence?tab=overview');
  await waitForRouteReady(page);
  const rows = page.locator('[data-testid="intel-critical-item-row"]');
  expect(await rows.count()).toBeGreaterThan(0);
});

test('ECC-12: Severity rendering maps critical→Critical and high→Warning', async ({ page }) => {
  await loginAsCEO(page);
  await page.goto('/intelligence?tab=overview');
  await waitForRouteReady(page);
  const rows = page.locator('[data-testid="intel-critical-item-row"]');
  expect(await rows.count()).toBeGreaterThan(0);
  const criticalRows = page.locator('[data-testid="intel-critical-item-row"][data-priority="critical"]');
  const highRows = page.locator('[data-testid="intel-critical-item-row"][data-priority="high"]');
  if ((await criticalRows.count()) > 0) {
    await expect(criticalRows.first()).toContainText('Critical');
  }
  if ((await highRows.count()) > 0) {
    await expect(highRows.first()).toContainText('Warning');
  }
});

test('ECC-13: Critical Items are ordered critical-first', async ({ page }) => {
  await loginAsCEO(page);
  await page.goto('/intelligence?tab=overview');
  const rows = page.locator('[data-testid="intel-critical-item-row"]');
  const priorities = await rows.evaluateAll((els) =>
    els.map((e) => e.getAttribute('data-priority')),
  );
  const firstHigh = priorities.indexOf('high');
  const lastCritical = priorities.lastIndexOf('critical');
  if (firstHigh !== -1 && lastCritical !== -1) {
    expect(lastCritical).toBeLessThan(firstHigh);
  }
});

test('ECC-14: Critical item Action button deep-links to the source module', async ({ page }) => {
  await loginAsCEO(page);
  await page.goto('/intelligence?tab=overview');
  const firstAction = page
    .locator('[data-testid="intel-critical-item-row"]')
    .first()
    .getByRole('button', { name: /Open source/i });
  await firstAction.click();
  await expect(page).not.toHaveURL(/tab=overview/);
});

// ─────────────────────────────────────────────────────────────────────
// GROUP 4: PLATFORM SUMMARY STRIP (6 tiles — §10.1 verified sources)
// ─────────────────────────────────────────────────────────────────────

test('ECC-15: Platform Summary strip renders all six tiles', async ({ page }) => {
  await loginAsCEO(page);
  await page.goto('/intelligence?tab=overview');
  await expect(page.locator('[data-testid="intel-summary-strip"]')).toBeVisible();
  await expect(page.locator('[data-testid="intel-summary-tile-active-jobs"]')).toBeVisible();
  await expect(page.locator('[data-testid="intel-summary-tile-pending-reviews"]')).toBeVisible();
  await expect(page.locator('[data-testid="intel-summary-tile-active-rules"]')).toBeVisible();
  await expect(page.locator('[data-testid="intel-summary-tile-open-exceptions"]')).toBeVisible();
  await expect(page.locator('[data-testid="intel-summary-tile-active-workflows"]')).toBeVisible();
  await expect(page.locator('[data-testid="intel-summary-tile-unread-notifications"]')).toBeVisible();
});

test('ECC-16: Active Jobs and Active Workflows tiles show numeric values', async ({ page }) => {
  await loginAsCEO(page);
  await page.goto('/intelligence?tab=overview');
  expect(await page.locator('[data-testid="intel-summary-tile-active-jobs"]').textContent()).toMatch(/\d+/);
  expect(await page.locator('[data-testid="intel-summary-tile-active-workflows"]').textContent()).toMatch(/\d+/);
});

test('ECC-17: Unread Notifications tile shows a numeric value from seed data', async ({ page }) => {
  await loginAsCEO(page);
  await page.goto('/intelligence?tab=overview');
  const text = await page.locator('[data-testid="intel-summary-tile-unread-notifications"]').textContent();
  const count = parseInt(text?.match(/\d+/)?.[0] || '-1');
  expect(count).toBeGreaterThan(0);
});

// ─────────────────────────────────────────────────────────────────────
// GROUP 5: REDIRECT & ANALYTICS LINK
// ─────────────────────────────────────────────────────────────────────

test('ECC-18: legacy /executive-command-centre redirects CEO to the Overview tab', async ({ page }) => {
  await loginAsCEO(page);
  await page.goto('/executive-command-centre');
  await expect(page).toHaveURL(/\/intelligence\?tab=overview/);
  await expect(page.locator('[data-testid="intelligence-overview-panel"]')).toBeVisible();
});

test('ECC-19: "View analytics" link navigates to the Analytics tab', async ({ page }) => {
  await loginAsCEO(page);
  await page.goto('/intelligence?tab=overview');
  await page.locator('[data-testid="intel-health-view-analytics"]').click();
  await expect(page).toHaveURL(/tab=analytics/);
  await expect(page.locator('[data-testid="analytics-centre-page"]')).toBeVisible();
});

// ─────────────────────────────────────────────────────────────────────
// GROUPS 6–8 (legacy ECC panels): REMOVED, not migrated (spec §6.2/§13.2)
// Operational/Governance/Financial overview panels, Analytics summary,
// Reporting/Export snapshots, Executive Activity Stream, and Module
// Navigation each have a superset home: hub Analytics/Reports/Exports/
// Activity tabs, the Finance Hub, primary nav, or hidden /event-monitor.
// ─────────────────────────────────────────────────────────────────────

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

test('ECC-31: Overview shows governance health data', async ({ page }) => {
  await loginAsCEO(page);
  await page.goto('/intelligence?tab=overview');
  await expect(page.locator('[data-testid="intel-health-governance"]')).toBeVisible();
});

test('ECC-32: Zone A "View Alerts" button navigates to the hub Overview (S-4)', async ({ page }) => {
  await loginAsCEO(page);
  await page.goto('/');
  const alertCard = page.locator('[data-testid="dashboard-zone-a-alerts"]');
  await expect(alertCard).toBeVisible();
  const button = alertCard.getByRole('button', { name: /View Alerts/i });
  const hasButton = await button.count();
  if (hasButton > 0) {
    await button.click();
    await expect(page).toHaveURL(/\/intelligence\?tab=overview/);
  } else {
    // Card is in clear state — verify the Overview is still accessible
    await page.goto('/intelligence?tab=overview');
    await expect(page.locator('[data-testid="intelligence-overview-panel"]')).toBeVisible();
  }
});

// ─────────────────────────────────────────────────────────────────────
// GROUP 10: RBAC — ACCESS CONTROL
// ─────────────────────────────────────────────────────────────────────

test('ECC-33: CEO can access the hub Overview at /intelligence', async ({ page }) => {
  await loginAsCEO(page);
  await page.goto('/intelligence');
  await expect(page.locator('[data-testid="intelligence-overview-panel"]')).toBeVisible();
});

test('ECC-34: PM is denied access to /intelligence and the legacy ECC route', async ({ page }) => {
  await loginAsPM(page);
  await page.goto('/intelligence');
  let bodyText = await page.locator('body').textContent();
  expect(bodyText && /unauthorized|access denied|not allowed|403/i.test(bodyText)).toBeTruthy();
  await page.goto('/executive-command-centre');
  bodyText = await page.locator('body').textContent();
  expect(bodyText && /unauthorized|access denied|not allowed|403/i.test(bodyText)).toBeTruthy();
});

test('ECC-35: Worker is denied access to /intelligence (Unauthorized page — P1-A)', async ({ page }) => {
  await loginAsWorker(page);
  await page.goto('/intelligence');
  // P1-A: the roles check returns the Unauthorized page — never assert a redirect
  const bodyText = await page.locator('body').textContent();
  expect(bodyText && /unauthorized|access denied|not allowed|403/i.test(bodyText)).toBeTruthy();
});
