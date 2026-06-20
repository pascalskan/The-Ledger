/**
 * DOCTRINE TEST: Automation Hub — Recommendations (UX-6.8)
 *
 * Validates the advisory-only Recommendations tab on /automations: KPI
 * dashboard, opportunity score, recommendation cards, group filtering,
 * headline feed, detail dialog, and the builder-launch CTA. Crucially, it
 * verifies that NO automation is created automatically — the CTA only opens
 * the empty Automation Builder.
 *
 * Deterministic seed (8 recommendations):
 *   total 8, high impact 4, financial 3, operational 3, governance 2,
 *   time 25h/wk, review reduction 14/wk. Quick Wins = 5. Opportunity = 79.
 */
import { test, expect } from '@playwright/test';
import { loginAsCEO } from '../helpers/login';
import { clearBrowserState } from '../helpers/state';

const CARD = '[data-testid^="aut-rec-card-"]';

test.beforeEach(async ({ page }) => {
  await clearBrowserState(page);
  await loginAsCEO(page);
  await page.goto('/automations');
  await page.getByTestId('aut-tab-recommendations').click();
});

// ── Dashboard / KPIs ─────────────────────────────────────────

test('REC-01: Recommendations panel and KPI strip render', async ({ page }) => {
  await expect(page.getByTestId('aut-recommendations-panel')).toBeVisible();
  await expect(page.getByTestId('aut-recommendations')).toBeVisible();
  await expect(page.getByTestId('aut-rec-kpi-strip')).toBeVisible();
});

test('REC-02: KPI values match the seed recommendations', async ({ page }) => {
  await expect(page.getByTestId('aut-rec-kpi-total')).toHaveText('8');
  await expect(page.getByTestId('aut-rec-kpi-high')).toHaveText('4');
  await expect(page.getByTestId('aut-rec-kpi-financial')).toHaveText('3');
  await expect(page.getByTestId('aut-rec-kpi-operational')).toHaveText('3');
  await expect(page.getByTestId('aut-rec-kpi-governance')).toHaveText('2');
  await expect(page.getByTestId('aut-rec-kpi-time')).toHaveText('25h/wk');
  await expect(page.getByTestId('aut-rec-kpi-reviews')).toHaveText('14/wk');
});

// ── Opportunity score ────────────────────────────────────────

test('REC-03: Opportunity score and rating render', async ({ page }) => {
  await expect(page.getByTestId('aut-rec-opportunity')).toBeVisible();
  await expect(page.getByTestId('aut-rec-opportunity-score')).toHaveText('79');
  await expect(page.getByTestId('aut-rec-opportunity-rating')).toHaveText('Significant Opportunity');
  await expect(page.getByTestId('aut-rec-opportunity-summary')).toBeVisible();
});

// ── Feed ─────────────────────────────────────────────────────

test('REC-04: Executive recommendations feed renders headlines', async ({ page }) => {
  await expect(page.getByTestId('aut-rec-feed')).toBeVisible();
  await expect(page.getByTestId('aut-rec-feed-0')).toContainText('manual escalation');
});

// ── Cards + grouping ─────────────────────────────────────────

test('REC-05: All eight recommendation cards render', async ({ page }) => {
  await expect(page.locator(CARD)).toHaveCount(8);
});

test('REC-06: High Impact group filters to four', async ({ page }) => {
  await page.getByTestId('aut-rec-group-high-impact').click();
  await expect(page.locator(CARD)).toHaveCount(4);
});

test('REC-07: Quick Wins group filters to five', async ({ page }) => {
  await page.getByTestId('aut-rec-group-quick-wins').click();
  await expect(page.locator(CARD)).toHaveCount(5);
});

test('REC-08: Financial group filters to three', async ({ page }) => {
  await page.getByTestId('aut-rec-group-financial').click();
  await expect(page.locator(CARD)).toHaveCount(3);
});

// ── Detail dialog ────────────────────────────────────────────

test('REC-09: Detail dialog shows trigger, actions, governance and safeguards', async ({ page }) => {
  await page.getByTestId('aut-rec-view-REC-001').click();
  await expect(page.getByTestId('aut-rec-detail-dialog')).toBeVisible();
  await expect(page.getByTestId('aut-rec-detail-trigger')).toBeVisible();
  await expect(page.getByTestId('aut-rec-detail-actions')).toBeVisible();
  await expect(page.getByTestId('aut-rec-detail-governance')).toBeVisible();
  await expect(page.getByTestId('aut-rec-detail-safeguards')).toBeVisible();
});

test('REC-10: Detail dialog carries the advisory-only notice', async ({ page }) => {
  await page.getByTestId('aut-rec-view-REC-005').click();
  await expect(page.getByTestId('aut-rec-detail-advisory')).toContainText('Advisory only');
});

// ── Builder integration (doctrine: no auto-creation) ─────────

test('REC-11: Build CTA launches the EMPTY Automation Builder', async ({ page }) => {
  await page.getByTestId('aut-rec-build-REC-001').click();
  await expect(page.getByTestId('aut-builder-dialog')).toBeVisible();
  // Empty builder = "Create Automation", name field blank → nothing pre-created.
  await expect(page.getByTestId('builder-input-name')).toHaveValue('');
});

test('REC-12: No automation is created automatically (catalogue unchanged)', async ({ page }) => {
  // Open and close the builder via a recommendation, creating nothing.
  await page.getByTestId('aut-rec-build-REC-002').click();
  await expect(page.getByTestId('aut-builder-dialog')).toBeVisible();
  await page.getByTestId('builder-btn-cancel').click();
  // Rules catalogue still shows the original six seed rules.
  await page.getByTestId('aut-tab-rules').click();
  await expect(page.locator('[data-testid^="aut-rule-row-"]')).toHaveCount(6);
});
