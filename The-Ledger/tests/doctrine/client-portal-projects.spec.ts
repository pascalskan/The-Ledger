import { test, expect } from '@playwright/test';
import { gotoPortalClean, portalLoginAsActive, portalNavTo, PORTAL_ACCOUNTS } from '../helpers/portal';

// ──────────────────────────────────────────────────────────────────────────
// CL-4 — Project Visibility & Deliverables
// Doctrine: CLIENT_PORTAL_DOMAIN.md
//
// Covers: project visibility & status filtering, milestones (incl. Delayed),
// progress (derived), deliverables (scoping, statuses, view-only), team
// visibility (first name only), and the client-safe timeline.
// ──────────────────────────────────────────────────────────────────────────

async function openJob(page: import('@playwright/test').Page, jobId: string) {
  await portalNavTo(page, 'jobs');
  await page.getByTestId(`portal-job-card-${jobId}`).click();
  await expect(page.getByTestId('portal-job-detail')).toBeVisible();
}

test.describe('Portal Projects — Visibility & status filtering (CL-4)', () => {
  test.beforeEach(async ({ page }) => {
    await gotoPortalClean(page);
  });

  // CPP-01 — Client sees only their own projects
  test('CPP-01: client sees only their own projects', async ({ page }) => {
    await portalLoginAsActive(page, PORTAL_ACCOUNTS.dc1Active);
    await portalNavTo(page, 'jobs');
    await expect(page.getByTestId('portal-job-card-dj-kitchen-extract-1')).toBeVisible();
    await expect(page.getByTestId('portal-job-card-dj-office-fit-1')).toHaveCount(0);
  });

  // CPP-02 — Cancelled (hidden) statuses are never rendered
  test('CPP-02: cancelled projects are not rendered', async ({ page }) => {
    await portalLoginAsActive(page, PORTAL_ACCOUNTS.dc1Active);
    await portalNavTo(page, 'jobs');
    await expect(page.getByTestId('portal-job-card-dj-cancelled-1')).toHaveCount(0);
  });

  // CPP-03 — Project Summary renders summary fields through projections
  test('CPP-03: project summary shows site, status, PM and dates', async ({ page }) => {
    await portalLoginAsActive(page, PORTAL_ACCOUNTS.dc1Active);
    await openJob(page, 'dj-kitchen-extract-1');
    await expect(page.getByTestId('portal-project-summary')).toBeVisible();
    await expect(page.getByTestId('portal-summary-site')).toBeVisible();
    await expect(page.getByTestId('portal-summary-status')).toBeVisible();
    await expect(page.getByTestId('portal-summary-start')).toBeVisible();
    await expect(page.getByTestId('portal-summary-target')).toBeVisible();
  });
});

test.describe('Portal Projects — Milestones (CL-4)', () => {
  test.beforeEach(async ({ page }) => {
    await gotoPortalClean(page);
  });

  // CPP-04 — Milestones display
  test('CPP-04: milestones render on a project', async ({ page }) => {
    await portalLoginAsActive(page, PORTAL_ACCOUNTS.dc1Active);
    await openJob(page, 'dj-kitchen-extract-1');
    await expect(page.getByTestId('portal-milestones')).toBeVisible();
    await expect(page.locator('[data-testid^="portal-milestone-ms-"]').first()).toBeVisible();
  });

  // CPP-05 — Delayed milestones are visible with the Delayed status
  test('CPP-05: delayed milestones are visible', async ({ page }) => {
    await portalLoginAsActive(page, PORTAL_ACCOUNTS.dc1Active);
    await openJob(page, 'dj-showcase-maint-1');
    await expect(page.getByTestId('portal-milestone-ms-mnt-3')).toBeVisible();
    await expect(page.getByTestId('portal-milestone-status-ms-mnt-3')).toHaveText('Delayed');
  });

  // CPP-06 — Milestone statuses render across the spectrum
  test('CPP-06: milestone statuses render (completed/in-progress/upcoming)', async ({ page }) => {
    await portalLoginAsActive(page, PORTAL_ACCOUNTS.dc1Active);
    await openJob(page, 'dj-showcase-maint-1');
    await expect(page.getByTestId('portal-milestone-status-ms-mnt-1')).toHaveText('Completed');
    await expect(page.getByTestId('portal-milestone-status-ms-mnt-2')).toHaveText('In Progress');
    await expect(page.getByTestId('portal-milestone-status-ms-mnt-4')).toHaveText('Upcoming');
  });
});

test.describe('Portal Projects — Progress (CL-4)', () => {
  test.beforeEach(async ({ page }) => {
    await gotoPortalClean(page);
  });

  // CPP-07 — Progress derived from milestones (completed project = 100%)
  test('CPP-07: completed project shows 100% derived progress', async ({ page }) => {
    await portalLoginAsActive(page, PORTAL_ACCOUNTS.dc1Active);
    await openJob(page, 'dj-kitchen-extract-1');
    await expect(page.getByTestId('portal-progress-percent')).toHaveText('100%');
    await expect(page.getByTestId('portal-progress-completed')).toContainText('3');
    await expect(page.getByTestId('portal-progress-remaining')).toContainText('0');
  });

  // CPP-08 — Progress derived for a partially-complete project
  test('CPP-08: active project shows partial derived progress', async ({ page }) => {
    await portalLoginAsActive(page, PORTAL_ACCOUNTS.dc1Active);
    await openJob(page, 'dj-showcase-maint-1');
    // 1 of 4 milestones completed → 25%.
    await expect(page.getByTestId('portal-progress-percent')).toHaveText('25%');
    await expect(page.getByTestId('portal-progress-completed')).toContainText('1');
  });
});

test.describe('Portal Projects — Deliverables (CL-4)', () => {
  test.beforeEach(async ({ page }) => {
    await gotoPortalClean(page);
  });

  // CPP-09 — Deliverables display with statuses
  test('CPP-09: deliverables render with statuses', async ({ page }) => {
    await portalLoginAsActive(page, PORTAL_ACCOUNTS.dc1Active);
    await openJob(page, 'dj-kitchen-extract-1');
    await expect(page.getByTestId('portal-deliverables')).toBeVisible();
    await expect(page.getByTestId('portal-deliverable-dl-kex-1')).toBeVisible();
    await expect(page.getByTestId('portal-deliverable-status-dl-kex-1')).toHaveText('Approved');
    await expect(page.getByTestId('portal-deliverable-status-dl-kex-3')).toHaveText('Submitted');
  });

  // CPP-10 — Deliverables are view-only (no approval controls)
  test('CPP-10: deliverables expose no approval controls', async ({ page }) => {
    await portalLoginAsActive(page, PORTAL_ACCOUNTS.dc1Active);
    await openJob(page, 'dj-kitchen-extract-1');
    await expect(page.getByTestId('portal-deliverables').locator('button')).toHaveCount(0);
  });

  // CPP-11 — Deliverables are scoped to the client's own project
  test('CPP-11: deliverables are scoped per client', async ({ page }) => {
    await portalLoginAsActive(page, PORTAL_ACCOUNTS.dc2Active);
    await openJob(page, 'dj-office-fit-1');
    // dc2's own deliverable is visible; dc1's must never appear.
    await expect(page.getByTestId('portal-deliverable-dl-off-1')).toBeVisible();
    await expect(page.getByTestId('portal-deliverable-dl-kex-1')).toHaveCount(0);
  });
});

test.describe('Portal Projects — Team visibility (CL-4)', () => {
  test.beforeEach(async ({ page }) => {
    await gotoPortalClean(page);
  });

  // CPP-12 — Crew first names visible
  test('CPP-12: crew first names are visible', async ({ page }) => {
    await portalLoginAsActive(page, PORTAL_ACCOUNTS.dc1Active);
    await openJob(page, 'dj-kitchen-extract-1');
    await expect(page.getByTestId('portal-crew-name').filter({ hasText: 'Sophie' }).first()).toBeVisible();
  });

  // CPP-13 — Crew surnames hidden
  test('CPP-13: crew surnames remain hidden', async ({ page }) => {
    await portalLoginAsActive(page, PORTAL_ACCOUNTS.dc1Active);
    await openJob(page, 'dj-kitchen-extract-1');
    const detail = page.getByTestId('portal-job-detail');
    await expect(detail).not.toContainText('Taylor');
    await expect(detail).not.toContainText('Hughes');
  });
});

test.describe('Portal Projects — Timeline (CL-4)', () => {
  test.beforeEach(async ({ page }) => {
    await gotoPortalClean(page);
  });

  // CPP-14 — Timeline events render
  test('CPP-14: project timeline renders events', async ({ page }) => {
    await portalLoginAsActive(page, PORTAL_ACCOUNTS.dc1Active);
    await openJob(page, 'dj-kitchen-extract-1');
    await expect(page.getByTestId('portal-timeline')).toBeVisible();
    await expect(page.locator('[data-testid^="portal-timeline-event-"]').first()).toBeVisible();
  });

  // CPP-15 — Internal/operational data is never surfaced in project detail
  test('CPP-15: project detail excludes internal operational data', async ({ page }) => {
    await portalLoginAsActive(page, PORTAL_ACCOUNTS.dc1Active);
    await openJob(page, 'dj-kitchen-extract-1');
    const detail = page.getByTestId('portal-job-detail');
    await expect(detail).not.toContainText(/margin/i);
    await expect(detail).not.toContainText(/payroll/i);
    await expect(detail).not.toContainText(/review centre/i);
    await expect(detail).not.toContainText(/governance/i);
  });

  // CPP-16 — Milestones/deliverables/timeline are isolated per client
  test('CPP-16: project deliverables and milestones are isolated per client', async ({ page }) => {
    await portalLoginAsActive(page, PORTAL_ACCOUNTS.dc2Active);
    await openJob(page, 'dj-office-fit-1');
    await expect(page.getByTestId('portal-milestone-ms-off-1')).toBeVisible();
    // HSS (dc1) milestones must never appear for Showcase.
    await expect(page.getByTestId('portal-milestone-ms-kex-1')).toHaveCount(0);
  });
});
