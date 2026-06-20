/**
 * DOCTRINE TEST: Automation Hub — CEO Briefing (UX-6.9)
 *
 * Validates the read-only executive briefing tab on /automations: briefing
 * KPIs, headline briefing card, priority attention feed, business impact,
 * risk summary, weekly summary, opportunity summary, strategic insights, and
 * readiness indicators — all rolled up from existing modules. No operational
 * control; informational only.
 *
 * Deterministic roll-up:
 *   platform health 80, automation health 82, governance health 64,
 *   approvals 6, failed 3, high risk 2, recs-to-action 4, critical alerts 2.
 */
import { test, expect } from '@playwright/test';
import { loginAsCEO } from '../helpers/login';
import { clearBrowserState } from '../helpers/state';

test.beforeEach(async ({ page }) => {
  await clearBrowserState(page);
  await loginAsCEO(page);
  await page.goto('/automations');
  await page.getByTestId('aut-tab-ceo-briefing').click();
});

// ── Render + KPIs ────────────────────────────────────────────

test('CEO-01: Briefing panel and KPI strip render', async ({ page }) => {
  await expect(page.getByTestId('aut-ceo-briefing-panel')).toBeVisible();
  await expect(page.getByTestId('aut-ceo-briefing')).toBeVisible();
  await expect(page.getByTestId('aut-ceo-kpi-strip')).toBeVisible();
});

test('CEO-02: Briefing KPIs roll up the expected values', async ({ page }) => {
  await expect(page.getByTestId('aut-ceo-kpi-platform')).toHaveText('80');
  await expect(page.getByTestId('aut-ceo-kpi-automation')).toHaveText('82');
  await expect(page.getByTestId('aut-ceo-kpi-governance')).toHaveText('64');
  await expect(page.getByTestId('aut-ceo-kpi-approvals')).toHaveText('6');
  await expect(page.getByTestId('aut-ceo-kpi-failed')).toHaveText('3');
  await expect(page.getByTestId('aut-ceo-kpi-highrisk')).toHaveText('2');
  await expect(page.getByTestId('aut-ceo-kpi-recs')).toHaveText('4');
  await expect(page.getByTestId('aut-ceo-kpi-alerts')).toHaveText('2');
});

// ── Headline briefing ────────────────────────────────────────

test('CEO-03: Headline briefing card lists dynamic bullets', async ({ page }) => {
  await expect(page.getByTestId('aut-ceo-headline')).toBeVisible();
  await expect(page.getByTestId('aut-ceo-briefing-0')).toContainText('94%');
  await expect(page.getByTestId('aut-ceo-briefing-1')).toContainText('approval');
});

// ── Priority attention feed ──────────────────────────────────

test('CEO-04: Priority attention feed renders ranked items', async ({ page }) => {
  await expect(page.getByTestId('aut-ceo-attention')).toBeVisible();
  await expect(page.locator('[data-testid="aut-ceo-attention-item"]').first()).toBeVisible();
});

// ── Business impact ──────────────────────────────────────────

test('CEO-05: Business impact summary renders derived values', async ({ page }) => {
  await expect(page.getByTestId('aut-ceo-impact')).toBeVisible();
  await expect(page.getByTestId('aut-ceo-impact-hours')).toHaveText('24h');
  await expect(page.getByTestId('aut-ceo-impact-governance')).toHaveText('3');
});

// ── Risk summary ─────────────────────────────────────────────

test('CEO-06: Risk summary shows the four levels', async ({ page }) => {
  await expect(page.getByTestId('aut-ceo-risk')).toBeVisible();
  await expect(page.getByTestId('aut-ceo-risk-critical')).toContainText('1');
  await expect(page.getByTestId('aut-ceo-risk-low')).toContainText('3');
});

// ── Weekly summary ───────────────────────────────────────────

test('CEO-07: Weekly executive summary renders', async ({ page }) => {
  await expect(page.getByTestId('aut-ceo-weekly')).toBeVisible();
  await expect(page.getByTestId('aut-ceo-weekly-executed')).toHaveText('102');
  await expect(page.getByTestId('aut-ceo-weekly-success')).toHaveText('94%');
});

// ── Opportunity + strategic ──────────────────────────────────

test('CEO-08: Opportunity summary and strategic insights render', async ({ page }) => {
  await expect(page.getByTestId('aut-ceo-opportunity')).toBeVisible();
  await expect(page.locator('[data-testid="aut-ceo-opportunity-item"]').first()).toBeVisible();
  await expect(page.getByTestId('aut-ceo-strategic')).toBeVisible();
  await expect(page.getByTestId('aut-ceo-strategic-0')).toBeVisible();
});

// ── Readiness ────────────────────────────────────────────────

test('CEO-09: Readiness indicators roll up across modules', async ({ page }) => {
  await expect(page.getByTestId('aut-ceo-readiness')).toBeVisible();
  await expect(page.getByTestId('aut-ceo-readiness-automation')).toContainText('Healthy');
  await expect(page.getByTestId('aut-ceo-readiness-operational')).toContainText('Attention Required');
  await expect(page.getByTestId('aut-ceo-readiness-governance')).toContainText('Watch');
});

// ── Non-regression ───────────────────────────────────────────

test('CEO-10: Rules catalogue remains the default tab and intact', async ({ page }) => {
  // Default tab is still rules (briefing is opt-in via its tab).
  await page.goto('/automations');
  await expect(page.getByTestId('aut-rules-table')).toBeVisible();
});
