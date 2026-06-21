/**
 * PM-RBAC Doctrine Tests
 *
 * Verifies PM-2 deliverables:
 * - PM cannot view CEO financial dashboard (revenue, margin, invoices, revenue at risk)
 * - PM dashboard shows operational/assigned-job information
 * - PM navigation is workflow-oriented (Primary + Secondary sections)
 * - CEO dashboard and navigation remain unchanged
 * - Canonical role helper system in effect (no fallback to raw role names)
 */
import { test, expect } from '@playwright/test';
import { loginAsCEO, loginAsPM } from '../helpers/login';
import { clearBrowserState } from '../helpers/state';

test.beforeEach(async ({ page }) => {
  await clearBrowserState(page);
});

// ────────────────────────────────────────────────────────────────
// PM-RBAC-01 — PM cannot see CEO financial dashboard
// ────────────────────────────────────────────────────────────────

test('PM-RBAC-01: PM dashboard does not expose revenue', async ({ page }) => {
  await loginAsPM(page);
  await page.goto('/');
  await page.waitForSelector('[data-testid="pm-dashboard-page"]');

  await expect(page.getByTestId('dashboard-zone-c-revenue')).not.toBeVisible();
  await expect(page.getByTestId('dashboard-zone-c-costs')).not.toBeVisible();
  await expect(page.getByTestId('dashboard-zone-c-margin')).not.toBeVisible();
  await expect(page.getByTestId('dashboard-zone-c-outstanding')).not.toBeVisible();
});

test('PM-RBAC-02: PM dashboard does not expose revenue at risk', async ({ page }) => {
  await loginAsPM(page);
  await page.goto('/');
  await page.waitForSelector('[data-testid="pm-dashboard-page"]');

  await expect(page.getByTestId('dashboard-zone-a-revenue-at-risk')).not.toBeVisible();
});

test('PM-RBAC-03: PM dashboard does not expose Zone C financial pulse', async ({ page }) => {
  await loginAsPM(page);
  await page.goto('/');
  await page.waitForSelector('[data-testid="pm-dashboard-page"]');

  await expect(page.getByTestId('dashboard-zone-c')).not.toBeVisible();
});

test('PM-RBAC-04: PM dashboard does not contain revenue text', async ({ page }) => {
  await loginAsPM(page);
  await page.goto('/');
  await page.waitForSelector('[data-testid="pm-dashboard-page"]');

  const pmPage = page.getByTestId('pm-dashboard-page');
  await expect(pmPage).not.toContainText('Revenue This Week');
  await expect(pmPage).not.toContainText('Costs This Week');
  await expect(pmPage).not.toContainText('Margin This Week');
  await expect(pmPage).not.toContainText('Outstanding Invoices');
  await expect(pmPage).not.toContainText('Revenue at Risk');
});

// ────────────────────────────────────────────────────────────────
// PM-RBAC-05..08 — PM dashboard shows operational content
// ────────────────────────────────────────────────────────────────

test('PM-RBAC-05: PM dashboard renders KPI strip with operational KPIs', async ({ page }) => {
  await loginAsPM(page);
  await page.goto('/');
  await page.waitForSelector('[data-testid="pm-dashboard-page"]');

  await expect(page.getByTestId('pm-dashboard-kpi-strip')).toBeVisible();
  await expect(page.getByTestId('pm-kpi-active-jobs')).toBeVisible();
  await expect(page.getByTestId('pm-kpi-pending-reviews')).toBeVisible();
  await expect(page.getByTestId('pm-kpi-crew-on-site')).toBeVisible();
  await expect(page.getByTestId('pm-kpi-jobs-attention')).toBeVisible();
  await expect(page.getByTestId('pm-kpi-upcoming-schedule')).toBeVisible();
});

test('PM-RBAC-06: PM dashboard renders My Jobs section', async ({ page }) => {
  await loginAsPM(page);
  await page.goto('/');
  await page.waitForSelector('[data-testid="pm-dashboard-page"]');

  await expect(page.getByTestId('pm-dashboard-my-jobs')).toBeVisible();
  await expect(page.getByTestId('pm-dashboard-my-jobs')).toContainText('My Jobs');
});

test('PM-RBAC-07: PM dashboard renders Reviews section', async ({ page }) => {
  await loginAsPM(page);
  await page.goto('/');
  await page.waitForSelector('[data-testid="pm-dashboard-page"]');

  await expect(page.getByTestId('pm-dashboard-reviews')).toBeVisible();
  await expect(page.getByTestId('pm-dashboard-reviews')).toContainText('Reviews');
});

test('PM-RBAC-08: PM dashboard renders Schedule section', async ({ page }) => {
  await loginAsPM(page);
  await page.goto('/');
  await page.waitForSelector('[data-testid="pm-dashboard-page"]');

  await expect(page.getByTestId('pm-dashboard-schedule')).toBeVisible();
  await expect(page.getByTestId('pm-dashboard-schedule')).toContainText('Schedule');
});

test('PM-RBAC-09: PM dashboard renders Attention Required section', async ({ page }) => {
  await loginAsPM(page);
  await page.goto('/');
  await page.waitForSelector('[data-testid="pm-dashboard-page"]');

  await expect(page.getByTestId('pm-dashboard-attention')).toBeVisible();
  await expect(page.getByTestId('pm-dashboard-attention')).toContainText('Attention Required');
});

// ────────────────────────────────────────────────────────────────
// PM-RBAC-10..14 — PM navigation is workflow-oriented
// ────────────────────────────────────────────────────────────────

test('PM-RBAC-10: PM navigation shows Primary section with workflow-first items', async ({ page }) => {
  await loginAsPM(page);
  await page.goto('/');

  await expect(page.getByTestId('nav-pm-overview')).toBeVisible();
  await expect(page.getByTestId('nav-pm-jobs')).toBeVisible();
  await expect(page.getByTestId('nav-review')).toBeVisible();
  await expect(page.getByTestId('nav-pm-schedule')).toBeVisible();
  await expect(page.getByTestId('nav-pm-crew')).toBeVisible();
});

test('PM-RBAC-11: PM navigation shows Secondary section', async ({ page }) => {
  await loginAsPM(page);
  await page.goto('/');

  await expect(page.getByTestId('nav-pm-clients')).toBeVisible();
  await expect(page.getByTestId('nav-pm-map')).toBeVisible();
  await expect(page.getByTestId('nav-pm-stock')).toBeVisible();
  await expect(page.getByTestId('nav-notifications')).toBeVisible();
});

test('PM-RBAC-12: PM navigation does not expose CEO-only items', async ({ page }) => {
  await loginAsPM(page);
  await page.goto('/');

  await expect(page.getByTestId('nav-finance-hub')).not.toBeVisible();
  await expect(page.getByTestId('nav-intelligence-hub')).not.toBeVisible();
  await expect(page.getByTestId('nav-workflow-centre')).not.toBeVisible();
  await expect(page.getByTestId('nav-automation-governance')).not.toBeVisible();
  await expect(page.getByTestId('nav-audit-log')).not.toBeVisible();
  await expect(page.getByTestId('nav-settings')).not.toBeVisible();
});

test('PM-RBAC-13: PM nav primary label is "My Jobs" not "Jobs"', async ({ page }) => {
  await loginAsPM(page);
  await page.goto('/');

  const jobsNav = page.getByTestId('nav-pm-jobs');
  await expect(jobsNav).toBeVisible();
  await expect(jobsNav).toContainText('My Jobs');
});

test('PM-RBAC-14: PM nav crew label is "Crew" not "Workers"', async ({ page }) => {
  await loginAsPM(page);
  await page.goto('/');

  const crewNav = page.getByTestId('nav-pm-crew');
  await expect(crewNav).toBeVisible();
  await expect(crewNav).toContainText('Crew');
});

// ────────────────────────────────────────────────────────────────
// PM-RBAC-15..17 — CEO dashboard and navigation unchanged
// ────────────────────────────────────────────────────────────────

test('PM-RBAC-15: CEO dashboard still shows financial Zone C', async ({ page }) => {
  await loginAsCEO(page);
  await page.goto('/');
  await page.waitForSelector('[data-testid="dashboard-page"]');

  await expect(page.getByTestId('dashboard-zone-c')).toBeVisible();
  await expect(page.getByTestId('dashboard-zone-c-revenue')).toBeVisible();
  await expect(page.getByTestId('dashboard-zone-c-margin')).toBeVisible();
  await expect(page.getByTestId('dashboard-zone-c-outstanding')).toBeVisible();
});

test('PM-RBAC-16: CEO dashboard shows revenue at risk card', async ({ page }) => {
  await loginAsCEO(page);
  await page.goto('/');
  await page.waitForSelector('[data-testid="dashboard-page"]');

  await expect(page.getByTestId('dashboard-zone-a-revenue-at-risk')).toBeVisible();
});

test('PM-RBAC-17: CEO navigation retains Core/Operational/Intelligence/Automation/Administration structure', async ({ page }) => {
  await loginAsCEO(page);
  await page.goto('/');

  await expect(page.getByTestId('nav-finance-hub')).toBeVisible();
  await expect(page.getByTestId('nav-intelligence-hub')).toBeVisible();
  await expect(page.getByTestId('nav-workflow-centre')).toBeVisible();
  await expect(page.getByTestId('nav-review')).toBeVisible();
});

// ────────────────────────────────────────────────────────────────
// PM-RBAC-18 — PM "My Jobs" dashboard card scoped to assigned jobs (PM-7 fix)
// ────────────────────────────────────────────────────────────────

test('PM-RBAC-18: PM dashboard My Jobs card shows only assigned jobs', async ({ page }) => {
  await loginAsPM(page);
  await page.goto('/');
  await page.waitForSelector('[data-testid="pm-dashboard-page"]');

  const myJobsCard = page.getByTestId('pm-dashboard-my-jobs');
  await expect(myJobsCard).toBeVisible();

  // Demo PM (du2 / Alex Reid) is assigned to dj-kitchen-extract-1, dj-pm-active-1,
  // dj-boiler-room-2, dj-office-fit-1. An unassigned job (dj-showcase-maint-1)
  // must NOT appear in the My Jobs card.
  await expect(myJobsCard).not.toContainText('Showcase Maintenance');
  // At least one assigned job title appears
  await expect(myJobsCard).toContainText('HVAC system replacement');
});

// ────────────────────────────────────────────────────────────────
// PM-RBAC-19 — PM Attention Required scoped to assigned jobs (PM-7 fix)
// ────────────────────────────────────────────────────────────────

test('PM-RBAC-19: PM Attention Required section does not expose unassigned job titles', async ({ page }) => {
  await loginAsPM(page);
  await page.goto('/');
  await page.waitForSelector('[data-testid="pm-dashboard-page"]');

  // Showcase Maintenance (dj-showcase-maint-1) is not managed by du2; must not appear
  const attentionCard = page.getByTestId('pm-dashboard-attention');
  await expect(attentionCard).toBeVisible();
  await expect(attentionCard).not.toContainText('Showcase Maintenance');
});

// ────────────────────────────────────────────────────────────────
// PM-RBAC-20 — canonical isCEO helper used in review.tsx (PM-7 fix)
// ────────────────────────────────────────────────────────────────

test('PM-RBAC-20: CEO review page renders intelligence tabs; PM gets PM Centre — verifies canonical role resolution', async ({ page }) => {
  // CEO path
  await loginAsCEO(page);
  await page.goto('/review');
  await page.waitForSelector('[data-testid="review-hub-tabs"]');
  await expect(page.getByTestId('review-hub-tabs')).toBeVisible();
  await expect(page.getByTestId('pm-review-page')).not.toBeVisible();

  // PM path
  await page.goto('/');
  await clearBrowserState(page);
  await loginAsPM(page);
  await page.goto('/review');
  await page.waitForSelector('[data-testid="pm-review-page"]');
  await expect(page.getByTestId('pm-review-page')).toBeVisible();
  await expect(page.getByTestId('review-hub-tabs')).not.toBeVisible();
});
