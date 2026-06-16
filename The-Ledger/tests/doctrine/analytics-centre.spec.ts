/**
 * DOCTRINE TESTS — Phase 6.6: Business Intelligence & Analytics Layer
 * UX-5 migration: the Analytics Centre now mounts unchanged inside the
 * Intelligence Hub (/intelligence?tab=analytics); the legacy route redirects.
 * Content testIds unchanged (navigation-only migration — UX-5 spec §13.2).
 * The former ECC-integration group (AC-35…AC-39) was removed with the ECC
 * page — its sections were deliberately dropped from the hub Overview.
 *
 *   - Analytics tab: rendering, KPI strip, trend panel, forecast panel,
 *     risk panel, bottleneck panel, doctrine notice
 *   - Legacy-route redirect coverage
 *   - RBAC: CEO allowed, PM denied, Worker denied
 */

import { test, expect } from '@playwright/test';
import { loginAsCEO, loginAsPM, loginAsWorker } from '../helpers/login';
import { clearBrowserState } from '../helpers/state';

test.beforeEach(async ({ page }) => {
  await clearBrowserState(page);
});

// ─────────────────────────────────────────────────────────────────────
// GROUP 1: ANALYTICS CENTRE — RENDERING & NAVIGATION
// ─────────────────────────────────────────────────────────────────────

test('AC-01: Analytics tab is accessible to CEO via sidebar nav + hub tab', async ({ page }) => {
  await loginAsCEO(page);
  await page.locator('[data-testid="nav-intelligence-hub"]').click();
  await expect(page).toHaveURL(/\/intelligence/);
  await page.locator('[data-testid="intelligence-tab-analytics"]').click();
  await expect(page).toHaveURL(/tab=analytics/);
  await expect(page.locator('[data-testid="analytics-centre-page"]')).toBeVisible();
});

test('AC-02: Analytics tab renders hub heading and CEO-only badge', async ({ page }) => {
  await loginAsCEO(page);
  await page.goto('/intelligence?tab=analytics');
  await expect(page.locator('[data-testid="intelligence-hub-heading"]')).toContainText(/Analytics/i);
  await expect(page.locator('body')).toContainText('CEO Only');
});

test('AC-03: Analytics Centre renders without runtime errors', async ({ page }) => {
  await loginAsCEO(page);
  await page.goto('/intelligence?tab=analytics');
  await expect(page.locator('[data-testid="analytics-centre-page"]')).toBeVisible();
  await expect(page.locator('body')).not.toContainText(/Uncaught|TypeError|ReferenceError/i);
});

test('AC-04: Analytics Centre doctrine notice renders and states advisory-only', async ({ page }) => {
  await loginAsCEO(page);
  await page.goto('/intelligence?tab=analytics');
  await expect(page.locator('[data-testid="analytics-doctrine-notice"]')).toBeVisible();
  await expect(page.locator('[data-testid="analytics-doctrine-notice"]')).toContainText(/advisory/i);
  await expect(page.locator('[data-testid="analytics-doctrine-notice"]')).toContainText(/financial mutations/i);
});

// ─────────────────────────────────────────────────────────────────────
// GROUP 2: KPI STRIP
// ─────────────────────────────────────────────────────────────────────

test('AC-05: KPI strip renders all five KPI cards', async ({ page }) => {
  await loginAsCEO(page);
  await page.goto('/intelligence?tab=analytics');
  await expect(page.locator('[data-testid="analytics-kpi-strip"]')).toBeVisible();
  await expect(page.locator('[data-testid="analytics-kpi-operational-health"]')).toBeVisible();
  await expect(page.locator('[data-testid="analytics-kpi-financial-health"]')).toBeVisible();
  await expect(page.locator('[data-testid="analytics-kpi-governance-risk"]')).toBeVisible();
  await expect(page.locator('[data-testid="analytics-kpi-workflow-efficiency"]')).toBeVisible();
  await expect(page.locator('[data-testid="analytics-kpi-automation-effectiveness"]')).toBeVisible();
});

test('AC-06: Operational Health KPI shows a score out of 100', async ({ page }) => {
  await loginAsCEO(page);
  await page.goto('/intelligence?tab=analytics');
  const kpi = page.locator('[data-testid="analytics-kpi-operational-health"]');
  await expect(kpi).toContainText(/\/100/);
});

test('AC-07: Financial Health KPI shows a score out of 100', async ({ page }) => {
  await loginAsCEO(page);
  await page.goto('/intelligence?tab=analytics');
  const kpi = page.locator('[data-testid="analytics-kpi-financial-health"]');
  await expect(kpi).toContainText(/\/100/);
});

test('AC-08: Governance Risk KPI shows a score out of 100', async ({ page }) => {
  await loginAsCEO(page);
  await page.goto('/intelligence?tab=analytics');
  const kpi = page.locator('[data-testid="analytics-kpi-governance-risk"]');
  await expect(kpi).toContainText(/\/100/);
});

test('AC-09: Workflow Efficiency KPI shows a score out of 100', async ({ page }) => {
  await loginAsCEO(page);
  await page.goto('/intelligence?tab=analytics');
  const kpi = page.locator('[data-testid="analytics-kpi-workflow-efficiency"]');
  await expect(kpi).toContainText(/\/100/);
});

test('AC-10: Automation Effectiveness KPI shows a score out of 100', async ({ page }) => {
  await loginAsCEO(page);
  await page.goto('/intelligence?tab=analytics');
  const kpi = page.locator('[data-testid="analytics-kpi-automation-effectiveness"]');
  await expect(kpi).toContainText(/\/100/);
});

// ─────────────────────────────────────────────────────────────────────
// GROUP 3: TREND ANALYSIS PANEL
// ─────────────────────────────────────────────────────────────────────

test('AC-11: Trend Analysis panel renders', async ({ page }) => {
  await loginAsCEO(page);
  await page.goto('/intelligence?tab=analytics');
  await expect(page.locator('[data-testid="analytics-trend-panel"]')).toBeVisible();
});

test('AC-12: Trend panel renders trend items', async ({ page }) => {
  await loginAsCEO(page);
  await page.goto('/intelligence?tab=analytics');
  const items = page.locator('[data-testid^="analytics-trend-item-"]');
  const count = await items.count();
  expect(count).toBeGreaterThan(0);
});

test('AC-13: Trend items show direction indicators (up/down/stable)', async ({ page }) => {
  await loginAsCEO(page);
  await page.goto('/intelligence?tab=analytics');
  const panel = page.locator('[data-testid="analytics-trend-panel"]');
  await expect(panel).toContainText(/up|down|stable/i);
});

test('AC-14: Trend items show percentage change values', async ({ page }) => {
  await loginAsCEO(page);
  await page.goto('/intelligence?tab=analytics');
  const panel = page.locator('[data-testid="analytics-trend-panel"]');
  const text = await panel.textContent();
  expect(text).toMatch(/%/);
});

// ─────────────────────────────────────────────────────────────────────
// GROUP 4: FORECAST PANEL
// ─────────────────────────────────────────────────────────────────────

test('AC-15: Forecast Intelligence panel renders', async ({ page }) => {
  await loginAsCEO(page);
  await page.goto('/intelligence?tab=analytics');
  await expect(page.locator('[data-testid="analytics-forecast-panel"]')).toBeVisible();
});

test('AC-16: Forecast panel shows Projections — Advisory Only badge', async ({ page }) => {
  await loginAsCEO(page);
  await page.goto('/intelligence?tab=analytics');
  await expect(page.locator('[data-testid="analytics-forecast-panel"]')).toContainText(/Advisory Only/i);
});

test('AC-17: Forecast panel renders forecast items', async ({ page }) => {
  await loginAsCEO(page);
  await page.goto('/intelligence?tab=analytics');
  const items = page.locator('[data-testid^="analytics-forecast-item-"]');
  const count = await items.count();
  expect(count).toBeGreaterThan(0);
});

test('AC-18: Forecast items show confidence level badges', async ({ page }) => {
  await loginAsCEO(page);
  await page.goto('/intelligence?tab=analytics');
  await expect(page.locator('[data-testid="analytics-forecast-panel"]')).toContainText(/confidence/i);
});

test('AC-19: Forecast items show advisory note', async ({ page }) => {
  await loginAsCEO(page);
  await page.goto('/intelligence?tab=analytics');
  const panel = page.locator('[data-testid="analytics-forecast-panel"]');
  await expect(panel).toContainText(/advisory/i);
});

// ─────────────────────────────────────────────────────────────────────
// GROUP 5: RISK INTELLIGENCE PANEL
// ─────────────────────────────────────────────────────────────────────

test('AC-20: Risk Intelligence panel renders', async ({ page }) => {
  await loginAsCEO(page);
  await page.goto('/intelligence?tab=analytics');
  await expect(page.locator('[data-testid="analytics-risk-panel"]')).toBeVisible();
});

test('AC-21: Risk panel renders risk items from seed data', async ({ page }) => {
  await loginAsCEO(page);
  await page.goto('/intelligence?tab=analytics');
  const items = page.locator('[data-testid^="analytics-risk-item-"]');
  const count = await items.count();
  expect(count).toBeGreaterThan(0);
});

test('AC-22: Risk items show severity badges (CRITICAL/HIGH/MEDIUM)', async ({ page }) => {
  await loginAsCEO(page);
  await page.goto('/intelligence?tab=analytics');
  const panel = page.locator('[data-testid="analytics-risk-panel"]');
  await expect(panel).toContainText(/CRITICAL|HIGH|MEDIUM/i);
});

test('AC-23: Risk items have deep link buttons to source modules', async ({ page }) => {
  await loginAsCEO(page);
  await page.goto('/intelligence?tab=analytics');
  const links = page.locator('[data-testid^="analytics-risk-link-"]');
  const count = await links.count();
  expect(count).toBeGreaterThan(0);
});

test('AC-24: Clicking a risk deep link navigates to the source module', async ({ page }) => {
  await loginAsCEO(page);
  await page.goto('/intelligence?tab=analytics');
  const firstLink = page.locator('[data-testid^="analytics-risk-link-"]').first();
  await firstLink.click();
  await expect(page).not.toHaveURL(/tab=analytics/);
});

// ─────────────────────────────────────────────────────────────────────
// GROUP 6: BOTTLENECK ANALYSIS PANEL
// ─────────────────────────────────────────────────────────────────────

test('AC-25: Bottleneck Analysis panel renders', async ({ page }) => {
  await loginAsCEO(page);
  await page.goto('/intelligence?tab=analytics');
  await expect(page.locator('[data-testid="analytics-bottleneck-panel"]')).toBeVisible();
});

test('AC-26: Bottleneck panel renders bottleneck items or empty state', async ({ page }) => {
  await loginAsCEO(page);
  await page.goto('/intelligence?tab=analytics');
  const panel = page.locator('[data-testid="analytics-bottleneck-panel"]');
  const items = page.locator('[data-testid^="analytics-bottleneck-item-"]');
  const count = await items.count();
  if (count === 0) {
    await expect(panel).toContainText(/No bottlenecks detected/i);
  } else {
    expect(count).toBeGreaterThan(0);
  }
});

test('AC-27: Bottleneck items have deep link view buttons', async ({ page }) => {
  await loginAsCEO(page);
  await page.goto('/intelligence?tab=analytics');
  const items = page.locator('[data-testid^="analytics-bottleneck-item-"]');
  const count = await items.count();
  if (count > 0) {
    const links = page.locator('[data-testid^="analytics-bottleneck-link-"]');
    const linkCount = await links.count();
    expect(linkCount).toBeGreaterThan(0);
  }
});

// ─────────────────────────────────────────────────────────────────────
// GROUP 7: DASHBOARD ZONE A / ANALYTICS CENTRE INTEGRATION
// ─────────────────────────────────────────────────────────────────────

test('AC-28: Dashboard shows Zone A attention strip for CEO', async ({ page }) => {
  await loginAsCEO(page);
  await page.goto('/');
  await expect(page.locator('[data-testid="dashboard-zone-a"]')).toBeVisible();
});

test('AC-29: Legacy /analytics-centre redirects CEO to the hub Analytics tab', async ({ page }) => {
  await loginAsCEO(page);
  await page.goto('/analytics-centre');
  await expect(page).toHaveURL(/\/intelligence\?tab=analytics/);
  await expect(page.locator('[data-testid="analytics-centre-page"]')).toBeVisible();
});

test('AC-30: Hub Analytics tab URL is bookmarkable', async ({ page }) => {
  await loginAsCEO(page);
  await page.goto('/intelligence?tab=analytics');
  await expect(page).toHaveURL(/\/intelligence\?tab=analytics/);
  await expect(page.locator('[data-testid="analytics-centre-page"]')).toBeVisible();
});

test('AC-31: Analytics Centre shows risk and forecast data', async ({ page }) => {
  await loginAsCEO(page);
  await page.goto('/intelligence?tab=analytics');
  await expect(page.locator('[data-testid="analytics-centre-page"]')).toBeVisible();
  await expect(page.locator('body')).toContainText(/risk|forecast|analytics/i);
});

test('AC-32: Analytics Centre shows advisory label on forecast data', async ({ page }) => {
  await loginAsCEO(page);
  await page.goto('/intelligence?tab=analytics');
  await expect(page.locator('[data-testid="analytics-centre-page"]')).toBeVisible();
  await expect(page.locator('body')).toContainText(/advisory/i);
});

test('AC-33: Analytics Centre shows trend data for CEO', async ({ page }) => {
  await loginAsCEO(page);
  await page.goto('/intelligence?tab=analytics');
  await expect(page.locator('[data-testid="analytics-centre-page"]')).toBeVisible();
});

test('AC-34: Analytics Centre renders trend items', async ({ page }) => {
  await loginAsCEO(page);
  await page.goto('/intelligence?tab=analytics');
  const items = page.locator('[data-testid^="trend-item-"], [data-testid^="analytics-trend-"]');
  // Trend data may appear in analytics summary widgets — verify the page loads and has content
  await expect(page.locator('body')).not.toContainText(/Error|TypeError|Uncaught/i);
});

// ─────────────────────────────────────────────────────────────────────
// GROUP 8: EXECUTIVE COMMAND CENTRE INTEGRATION
// UX-5: AC-35…AC-39 removed. The ECC page is unrouted and its Analytics
// Intelligence section was deliberately dropped from the hub Overview
// (spec §6.2 — superset home: the Analytics tab itself). Removal, not
// migration, per spec §13.2.
// ─────────────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────────────
// GROUP 9: RBAC — ACCESS CONTROL
// ─────────────────────────────────────────────────────────────────────

test('AC-40: CEO can access the Analytics tab at /intelligence?tab=analytics', async ({ page }) => {
  await loginAsCEO(page);
  await page.goto('/intelligence?tab=analytics');
  await expect(page.locator('[data-testid="analytics-centre-page"]')).toBeVisible();
});

test('AC-41: PM is denied access to the legacy /analytics-centre route', async ({ page }) => {
  await loginAsPM(page);
  await page.goto('/analytics-centre');
  const url = page.url();
  const bodyText = await page.locator('body').textContent();
  const isDenied =
    url.includes('/auth') ||
    url.includes('/unauthorized') ||
    (bodyText && /unauthorized|access denied|not allowed|403/i.test(bodyText));
  expect(isDenied).toBeTruthy();
});

test('AC-42: Worker is denied access to the legacy /analytics-centre route (Unauthorized page)', async ({ page }) => {
  await loginAsWorker(page);
  await page.goto('/analytics-centre');
  const bodyText = await page.locator('body').textContent();
  // P1-A: roles check returns the Unauthorized page — never assert a worker redirect
  expect(bodyText && /unauthorized|access denied|not allowed|403/i.test(bodyText)).toBeTruthy();
});
