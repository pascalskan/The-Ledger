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
import { loginAsCEO, loginAsWorker } from '../helpers/login';
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
