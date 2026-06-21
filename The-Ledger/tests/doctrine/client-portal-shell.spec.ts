import { test, expect } from '@playwright/test';
import { gotoPortalClean, portalLoginAsActive, portalNavTo, PORTAL_ACCOUNTS } from '../helpers/portal';

// ──────────────────────────────────────────────────────────────────────────
// CL-3 — Portal Shell, Dashboard & Navigation
// Doctrine: CLIENT_PORTAL_DOMAIN.md
//
// Covers: navigation/IA, route protection, job status filtering (cancelled
// hidden), site scoping, dashboard metrics (derived), and white-label branding.
// ──────────────────────────────────────────────────────────────────────────

test.describe('Client Portal Shell — Navigation (CL-3)', () => {
  test.beforeEach(async ({ page }) => {
    await gotoPortalClean(page);
  });

  // CPS-01 — All seven nav items render in the shell
  test('CPS-01: portal shell shows all navigation items', async ({ page }) => {
    await portalLoginAsActive(page);
    for (const key of ['dashboard', 'sites', 'jobs', 'documents', 'invoices', 'requests', 'notifications']) {
      await expect(page.getByTestId(`portal-nav-${key}`)).toBeVisible();
    }
  });

  // CPS-02 — Each section navigates and renders
  test('CPS-02: each portal section renders when navigated', async ({ page }) => {
    await portalLoginAsActive(page);
    const sections: Array<[any, string]> = [
      ['sites', 'portal-sites'],
      ['jobs', 'portal-jobs'],
      ['documents', 'portal-documents'],
      ['invoices', 'portal-invoices'],
      ['requests', 'portal-requests'],
      ['notifications', 'portal-notifications'],
      ['dashboard', 'portal-dashboard'],
    ];
    for (const [navKey, testid] of sections) {
      await portalNavTo(page, navKey);
      await expect(page.getByTestId(testid)).toBeVisible();
    }
  });

  // CPS-03 — Direct URL to a section while unauthenticated returns login
  test('CPS-03: protected — direct URL to /portal/jobs requires authentication', async ({ page }) => {
    await page.goto('/portal/jobs');
    await page.evaluate(() => localStorage.clear());
    await page.goto('/portal/jobs');
    await expect(page.getByTestId('portal-login')).toBeVisible();
    await expect(page.getByTestId('portal-jobs')).toHaveCount(0);
  });

  // CPS-04 — Direct URL to /portal/invoices while unauthenticated returns login
  test('CPS-04: protected — direct URL to /portal/invoices requires authentication', async ({ page }) => {
    await page.goto('/portal/invoices');
    await page.evaluate(() => localStorage.clear());
    await page.goto('/portal/invoices');
    await expect(page.getByTestId('portal-login')).toBeVisible();
  });
});

test.describe('Client Portal Shell — Jobs visibility (CL-3)', () => {
  test.beforeEach(async ({ page }) => {
    await gotoPortalClean(page);
  });

  // CPS-05 — Cancelled jobs are never visible
  test('CPS-05: cancelled jobs are hidden from the portal', async ({ page }) => {
    await portalLoginAsActive(page, PORTAL_ACCOUNTS.dc1Active);
    await portalNavTo(page, 'jobs');
    await expect(page.getByTestId('portal-jobs')).toBeVisible();
    // dc1 owns a cancelled job (dj-cancelled-1) — it must not appear.
    await expect(page.getByTestId('portal-job-card-dj-cancelled-1')).toHaveCount(0);
    // But a visible job must be present.
    await expect(page.getByTestId('portal-job-card-dj-kitchen-extract-1')).toBeVisible();
  });

  // CPS-06 — Completed filter shows only completed jobs
  test('CPS-06: jobs completed filter narrows the list', async ({ page }) => {
    await portalLoginAsActive(page, PORTAL_ACCOUNTS.dc1Active);
    await portalNavTo(page, 'jobs');
    await page.getByTestId('portal-jobs-filter-completed').click();
    // dj-kitchen-extract-1 is Completed → visible; dj-pm-active-1 is Active → hidden.
    await expect(page.getByTestId('portal-job-card-dj-kitchen-extract-1')).toBeVisible();
    await expect(page.getByTestId('portal-job-card-dj-pm-active-1')).toHaveCount(0);
  });
});

test.describe('Client Portal Shell — Sites (CL-3)', () => {
  test.beforeEach(async ({ page }) => {
    await gotoPortalClean(page);
  });

  // CPS-07 — Client sees only their own sites
  test('CPS-07: client sees only their own sites', async ({ page }) => {
    await portalLoginAsActive(page, PORTAL_ACCOUNTS.dc1Active);
    await portalNavTo(page, 'sites');
    await expect(page.getByTestId('portal-sites')).toBeVisible();
    // HSS (dc1) has at least one site card, including its Riverside site.
    await expect(page.locator('[data-testid^="portal-site-card-"]').first()).toBeVisible();
    await expect(page.getByTestId('portal-sites')).toContainText('Riverside');
  });

  // CPS-08 — Site cards never expose access/security notes
  test('CPS-08: sites never expose access notes or security info', async ({ page }) => {
    await portalLoginAsActive(page, PORTAL_ACCOUNTS.dc1Active);
    await portalNavTo(page, 'sites');
    const sites = page.getByTestId('portal-sites');
    await expect(sites).not.toContainText(/alarm/i);
    await expect(sites).not.toContainText(/access code/i);
    await expect(sites).not.toContainText(/door code/i);
  });

  // CPS-09 — Client B sees only its site, not Client A's
  test('CPS-09: client B sites are isolated from client A', async ({ page }) => {
    await portalLoginAsActive(page, PORTAL_ACCOUNTS.dc2Active);
    await portalNavTo(page, 'sites');
    // Showcase (dc2) site is at Kingsway; HSS's Riverside site must not appear.
    await expect(page.getByTestId('portal-sites')).toContainText('Kingsway');
    await expect(page.getByTestId('portal-sites')).not.toContainText('Riverside');
  });
});

test.describe('Client Portal Shell — Dashboard metrics (CL-3)', () => {
  test.beforeEach(async ({ page }) => {
    await gotoPortalClean(page);
  });

  // CPS-10 — KPI cards render
  test('CPS-10: dashboard renders all KPI cards', async ({ page }) => {
    await portalLoginAsActive(page, PORTAL_ACCOUNTS.dc1Active);
    for (const key of ['active', 'completed', 'sites', 'requests', 'invoices']) {
      await expect(page.getByTestId(`portal-kpi-${key}`)).toBeVisible();
    }
  });

  // CPS-11 — KPI values are derived from mock models (not hardcoded)
  test('CPS-11: dashboard KPI values are derived correctly', async ({ page }) => {
    await portalLoginAsActive(page, PORTAL_ACCOUNTS.dc1Active);
    // dc1 visible jobs: 1 Completed + 3 non-completed (Active/Active/Planned); cancelled excluded.
    await expect(page.getByTestId('portal-kpi-value-active')).toHaveText('3');
    await expect(page.getByTestId('portal-kpi-value-completed')).toHaveText('1');
    // dc1 has one outstanding (Sent) invoice.
    await expect(page.getByTestId('portal-kpi-value-invoices')).toHaveText('1');
  });

  // CPS-12 — Recent activity renders client-safe items
  test('CPS-12: dashboard recent activity renders items', async ({ page }) => {
    await portalLoginAsActive(page, PORTAL_ACCOUNTS.dc1Active);
    await expect(page.getByTestId('portal-recent-activity')).toBeVisible();
    await expect(page.locator('[data-testid^="portal-activity-item-"]').first()).toBeVisible();
  });
});

test.describe('Client Portal Shell — Branding (CL-3)', () => {
  test.beforeEach(async ({ page }) => {
    await gotoPortalClean(page);
  });

  // CPS-13 — Branding config drives the shell header + support details
  test('CPS-13: portal branding is displayed in the shell', async ({ page }) => {
    await portalLoginAsActive(page, PORTAL_ACCOUNTS.dc1Active);
    await expect(page.getByTestId('portal-brand-name')).toBeVisible();
    await expect(page.getByTestId('portal-brand-name')).toContainText('The Ledger Portal');
    await expect(page.getByTestId('portal-support-email')).toContainText('@');
    await expect(page.getByTestId('portal-support-phone')).toBeVisible();
  });

  // CPS-14 — Opening a job from the shell records a client_viewed_job audit event
  test('CPS-14: opening a job through the shell records an audit event', async ({ page }) => {
    await portalLoginAsActive(page, PORTAL_ACCOUNTS.dc1Active);
    await portalNavTo(page, 'jobs');
    const before = await page.evaluate(() => (window as any).__portalAudit.countByType('client_viewed_job'));
    await page.getByTestId('portal-job-card-dj-kitchen-extract-1').click();
    await expect(page.getByTestId('portal-job-detail')).toBeVisible();
    const after = await page.evaluate(() => (window as any).__portalAudit.countByType('client_viewed_job'));
    expect(after).toBeGreaterThan(before);
  });
});
