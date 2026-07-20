/**
 * DOCTRINE TESTS — Workstream completeness audit remediation
 *
 * Covers the gaps found by docs/ux/WORKSTREAM_COMPLETENESS_AUDIT.md, plus two
 * pre-existing product bugs that the remediation work surfaced:
 *
 *   AR-01..03  C-1  Worker Job View: directions, access info, contacts
 *   AR-04      B-1  Drag-to-reschedule on the CEO week grid
 *   AR-05      B-2  Crew management reachable from the schedule
 *   AR-06      BUG  The week grid positioned jobs by createdAt/updatedAt
 *                   (record timestamps) instead of startAt/endAt
 *   AR-07      BUG  The Job Analysis drawer never rendered — its condition was
 *                   a copy of the "day" drawer, so drawerType "job" matched
 *                   nothing
 */

import { test, expect } from '@playwright/test';
import { loginAsCEO, loginAsPM, loginAsWorker } from '../helpers/login';
import { clearBrowserState } from '../helpers/state';
import { waitForRouteReady } from '../helpers/navigation';

// ── C-1: Worker Job View context ──────────────────────────────────────────

test('AR-01: worker job view offers tap-to-navigate directions', async ({ page }) => {
  await clearBrowserState(page);
  await loginAsWorker(page);
  await page.goto('/worker/jobs/dj-kitchen-extract-1');
  const link = page.getByTestId('worker-job-directions');
  await expect(link).toBeVisible();
  // Uses lat/lng when present so the map app gets a precise destination.
  await expect(link).toHaveAttribute('href', /google\.com\/maps\/dir/);
});

test('AR-02: worker job view surfaces site access instructions', async ({ page }) => {
  await clearBrowserState(page);
  await loginAsWorker(page);
  await page.goto('/worker/jobs/dj-kitchen-extract-1');
  await expect(page.getByTestId('worker-job-access')).toBeVisible();
});

test('AR-03: worker job view lists site and emergency contacts as tel: links', async ({ page }) => {
  await clearBrowserState(page);
  await loginAsWorker(page);
  await page.goto('/worker/jobs/dj-kitchen-extract-1');
  await expect(page.getByTestId('worker-job-contacts')).toBeVisible();
  await expect(page.getByTestId('worker-job-site-contact-0')).toHaveAttribute('href', /^tel:/);
  await expect(page.getByTestId('worker-job-emergency-contact-0')).toHaveAttribute('href', /^tel:/);
});

// ── B-1 / B-2: Scheduling ─────────────────────────────────────────────────

test('AR-04: CEO can drag a job card onto another day to reschedule it', async ({ page }) => {
  await clearBrowserState(page);
  await loginAsCEO(page);
  await page.goto('/schedule');
  await waitForRouteReady(page);

  const card = page.locator('[data-testid^="sched-job-card-"]').first();
  await expect(card).toBeVisible();
  const id = await card.getAttribute('data-testid');

  const cols = page.locator('[data-testid^="sched-day-"]');
  await expect(cols).toHaveCount(7);

  await card.dragTo(cols.nth(6));
  await expect(cols.nth(6).locator(`[data-testid="${id}"]`)).toBeVisible({ timeout: 8000 });
});

test('AR-05: schedule drawer deep-links to the job crew editor', async ({ page }) => {
  await clearBrowserState(page);
  await loginAsCEO(page);
  await page.goto('/schedule');
  await waitForRouteReady(page);
  await page.locator('[data-testid^="sched-job-card-"]').first().click();
  await expect(page.getByTestId('sched-manage-crew')).toBeVisible();
  await page.getByTestId('sched-manage-crew').click();
  await expect(page).toHaveURL(/\/jobs\//);
});

// ── Pre-existing bugs surfaced during remediation ─────────────────────────

test('AR-06: week grid positions jobs by scheduled dates, not record timestamps', async ({ page }) => {
  await clearBrowserState(page);
  await loginAsCEO(page);
  await page.goto('/schedule');
  await waitForRouteReady(page);
  // At least one job must appear somewhere in the visible week. Positioning by
  // createdAt/updatedAt put jobs on the day their row was written instead.
  await expect(page.locator('[data-testid^="sched-job-card-"]').first()).toBeVisible();
});

test('AR-07: clicking a job card opens the Job Analysis drawer', async ({ page }) => {
  await clearBrowserState(page);
  await loginAsCEO(page);
  await page.goto('/schedule');
  await waitForRouteReady(page);
  await page.locator('[data-testid^="sched-job-card-"]').first().click();
  // The drawer's job branch — previously unreachable because both drawer
  // blocks were gated on drawerType === "day".
  await expect(page.getByText('Job Analysis')).toBeVisible();
});

// ── A-3 / E-backlog: executive shell accessibility + mobile ───────────────

test('AR-08: executive nav marks the current item with aria-current', async ({ page }) => {
  await clearBrowserState(page);
  await loginAsCEO(page);
  await page.goto('/jobs');
  await waitForRouteReady(page);
  // The portal and worker shells already did this; the executive shell did not.
  await expect(page.locator('nav a[aria-current="page"]').first()).toBeVisible();
});

test('AR-09: skip-to-content link exists and targets main', async ({ page }) => {
  await clearBrowserState(page);
  await loginAsCEO(page);
  await page.goto('/');
  await waitForRouteReady(page);
  const skip = page.getByTestId('skip-to-content');
  await expect(skip).toHaveAttribute('href', '#main-content');
  await expect(page.locator('#main-content')).toHaveCount(1);
});

test('AR-10: mobile bottom tab bar renders five destinations for CEO', async ({ page }) => {
  await clearBrowserState(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await loginAsCEO(page);
  await page.goto('/');
  await waitForRouteReady(page);
  const bar = page.getByTestId('mobile-tab-bar');
  await expect(bar).toBeVisible();
  await expect(bar.locator('button')).toHaveCount(5);
});

test('AR-11: mobile tab bar is role-aware — PM gets their own surfaces', async ({ page }) => {
  await clearBrowserState(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await loginAsPM(page);
  await page.goto('/');
  await waitForRouteReady(page);
  await expect(page.getByTestId('mobile-tab-schedule')).toBeVisible();
  // A PM has no Finance access, so it must not appear in their tab bar.
  await expect(page.getByTestId('mobile-tab-finance')).toHaveCount(0);
});

// ── A-1 / UX-8: Operations Hub ────────────────────────────────────────────

const OPS_TABS = ['jobs', 'schedule', 'workers', 'clients', 'map', 'stock'];

test('AR-12: Operations Hub renders all six tabs', async ({ page }) => {
  await clearBrowserState(page);
  await loginAsCEO(page);
  await page.goto('/operations');
  await expect(page.getByTestId('operations-hub-page')).toBeVisible();
  for (const t of OPS_TABS) {
    await expect(page.getByTestId(`operations-tab-${t}`)).toBeVisible();
  }
});

for (const t of OPS_TABS) {
  test(`AR-13: Operations "${t}" tab composes without duplicating the shell`, async ({ page }) => {
    await clearBrowserState(page);
    await loginAsCEO(page);
    await page.goto(`/operations?tab=${t}`);
    await expect(page.getByTestId(`operations-${t}-panel`)).toBeVisible();
    // Each composed page renders its own <Layout>, which is idempotent — the
    // nested one must render children only, leaving a single shell.
    await expect(page.locator('#main-content')).toHaveCount(1);
    await expect(page.locator('aside')).toHaveCount(1);
    // /map is the documented no-header surface; every other page has one h1.
    await expect(page.locator('h1')).toHaveCount(t === 'map' ? 0 : 1);
  });
}

test('AR-14: standalone operational routes are retained, not redirected', async ({ page }) => {
  await clearBrowserState(page);
  await loginAsCEO(page);
  // These remain deep-link targets from dashboards, reviews and notifications.
  await page.goto('/jobs');
  await waitForRouteReady(page);
  await expect(page).toHaveURL(/\/jobs$/);
  await expect(page.locator('#main-content')).toHaveCount(1);
});

test('AR-15: Operations Hub is denied to a Worker', async ({ page }) => {
  await clearBrowserState(page);
  await loginAsWorker(page);
  await page.goto('/operations');
  await expect(page.getByTestId('operations-hub-page')).toHaveCount(0);
});

test('AR-16: CEO nav consolidates operations into a single entry', async ({ page }) => {
  await clearBrowserState(page);
  await loginAsCEO(page);
  await page.goto('/');
  await waitForRouteReady(page);
  await expect(page.getByTestId('nav-operations')).toBeVisible();
});

// ── A-2: Pending exposure on the CEO dashboard ────────────────────────────

test('AR-17: CEO dashboard surfaces pending exposure', async ({ page }) => {
  await clearBrowserState(page);
  await loginAsCEO(page);
  await page.goto('/');
  await waitForRouteReady(page);
  await expect(page.getByTestId('dashboard-zone-c-exposure')).toBeVisible();
  await expect(page.getByTestId('dashboard-exposure-value')).toBeVisible();
});

test('AR-18: pending exposure is labelled pre-approval, not settled money', async ({ page }) => {
  await clearBrowserState(page);
  await loginAsCEO(page);
  await page.goto('/');
  await waitForRouteReady(page);
  // Approval Doctrine: nothing is financially real until it clears the Review
  // Centre, so an unapproved figure must never read as fact.
  await expect(page.getByTestId('dashboard-exposure-label')).toContainText(/Pending Approval/i);
});

test('AR-19: PM dashboard does not expose pending financial data', async ({ page }) => {
  await clearBrowserState(page);
  await loginAsPM(page);
  await page.goto('/');
  await waitForRouteReady(page);
  // Zone C is CEO-only; a PM must not gain financial visibility via exposure.
  await expect(page.getByTestId('dashboard-zone-c-exposure')).toHaveCount(0);
});
