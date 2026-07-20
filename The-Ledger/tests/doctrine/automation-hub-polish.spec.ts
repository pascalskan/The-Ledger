/**
 * DOCTRINE TEST: Automation Hub — Polish & Merge Readiness (UX-6.10)
 *
 * Validates the consolidated Automation Operations Centre: every UX-6 section
 * is present, consistently named, logically ordered, and reachable; the
 * default tab is preserved; and the legacy raw audit tab is clarified as the
 * "Audit Log". This is a navigation-cohesion / no-regression pass.
 */
import { test, expect } from '@playwright/test';
import { waitForRouteReady } from '../helpers/navigation';
import { loginAsCEO } from '../helpers/login';
import { clearBrowserState } from '../helpers/state';

const TAB_ORDER = [
  'aut-tab-ceo-briefing',
  'aut-tab-rules',
  'aut-tab-scheduler',
  'aut-tab-timeline',
  'aut-tab-monitoring',
  'aut-tab-execution-history',
  'aut-tab-approval-queue',
  'aut-tab-governance',
  'aut-tab-audit-centre',
  'aut-tab-audit',
  'aut-tab-recommendations',
];

test.beforeEach(async ({ page }) => {
  await clearBrowserState(page);
  await loginAsCEO(page);
  await page.goto('/automations');
  // /automations is lazily loaded since E-7; POLISH-02 uses evaluateAll(),
  // which does not auto-wait, so the chunk must have mounted first.
  await waitForRouteReady(page);
});

test('POLISH-01: All eleven Automation Hub tabs are present', async ({ page }) => {
  for (const id of TAB_ORDER) {
    await expect(page.getByTestId(id)).toBeVisible();
  }
});

test('POLISH-02: Tabs render in the consolidated executive order', async ({ page }) => {
  const tabs = page.locator('[data-testid^="aut-tab-"]');
  const ids = await tabs.evaluateAll((els) => els.map((e) => e.getAttribute('data-testid')));
  // The known UX-6 tabs appear in the expected relative order.
  const filtered = ids.filter((id) => TAB_ORDER.includes(id as string));
  expect(filtered).toEqual(TAB_ORDER);
});

test('POLISH-03: Default tab remains the Automation Rules catalogue', async ({ page }) => {
  await expect(page.getByTestId('aut-rules-table')).toBeVisible();
});

test('POLISH-04: Each tab is reachable and renders its primary surface', async ({ page }) => {
  const checks: [string, string][] = [
    ['aut-tab-ceo-briefing', 'aut-ceo-briefing'],
    ['aut-tab-scheduler', 'sched-table'],
    ['aut-tab-timeline', 'aut-scheduler-timeline'],
    ['aut-tab-monitoring', 'aut-execution-monitor'],
    ['aut-tab-approval-queue', 'aut-approval-queue'],
    ['aut-tab-governance', 'aut-governance-dashboard'],
    ['aut-tab-audit-centre', 'aut-audit-centre'],
    ['aut-tab-recommendations', 'aut-recommendations'],
  ];
  for (const [tab, surface] of checks) {
    await page.getByTestId(tab).click();
    await expect(page.getByTestId(surface)).toBeVisible();
  }
});

test('POLISH-05: Legacy raw audit tab is clarified as "Audit Log" and still works', async ({ page }) => {
  await expect(page.getByTestId('aut-tab-audit')).toContainText('Audit Log');
  await page.getByTestId('aut-tab-audit').click();
  await expect(page.getByTestId('aut-audit-table')).toBeVisible();
});

test('POLISH-06: Hub header reads as an executive operations centre', async ({ page }) => {
  await expect(page.getByRole('heading', { name: /Automation Centre/i })).toBeVisible();
  await expect(page.getByTestId('automation-centre-page')).toContainText('Operations Centre');
});

test('POLISH-07: Executive Dashboard, legacy KPI strip and tabs coexist (no regression)', async ({ page }) => {
  await expect(page.getByTestId('aut-executive-dashboard')).toBeVisible();
  await expect(page.getByTestId('aut-kpi-strip')).toBeVisible();
  await expect(page.getByTestId('aut-btn-create-automation')).toBeVisible();
});
