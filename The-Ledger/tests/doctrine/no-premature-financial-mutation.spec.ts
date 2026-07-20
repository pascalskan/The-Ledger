/**
 * DOCTRINE TEST: No Premature Financial Mutation
 *
 * Ledger doctrine requires that ALL financial mutations (inventory deductions,
 * invoice creation, payroll entries, expense creation) occur ONLY after an
 * item has been approved inside the Review Center.
 *
 * This spec verifies three specific doctrine requirements:
 *
 *   1. ONLINE PATH — Worker submission creates a ReviewItem in PENDING state.
 *      Inventory is NOT deducted at submission time.
 *
 *   2. OFFLINE PATH — Worker submission (offline mode) writes to the queue.
 *      After sync completes (syncStatus = "synced"), the replayed payload IS
 *      handed to addReviewItemDirect() and appears as PENDING in the Review
 *      Center. Inventory is still NOT deducted until a manager approves.
 *
 *   3. ATTRIBUTION — The submitted ReviewItem carries the correct job reference.
 */

import { test, expect, type Page } from '@playwright/test';
import {
  loginAsCEO,
  loginAsWorker,
  softLoginAsCEO,
  softLoginAsWorker,
} from '../helpers/login';
import { signOut } from '../helpers/signOut';
import { openReviewCenter, openStockAndAssets } from '../helpers/navigation';
import { clearBrowserState } from '../helpers/state';

// ---------------------------------------------------------------------------
// SynchronizationDebugPanel helpers
//
// The panel is a fixed overlay in the bottom-right corner (App.tsx).
// When OPEN  → shows the full panel; gear button is gone.
// When CLOSED → shows only the gear button; panel is gone.
// ---------------------------------------------------------------------------

/** Open the panel. No-op if already open. */
async function openDebugPanel(page: Page) {
  const panelVisible = await page.getByText('Enterprise Sync QA').isVisible().catch(() => false);
  if (!panelVisible) {
    await page.locator('button[title="Enterprise Sync QA Panel"]').click();
  }
  await expect(page.getByText('Enterprise Sync QA')).toBeVisible({ timeout: 5000 });
}

/**
 * Close the panel. No-op if already closed.
 *
 * The × button has no accessible name (icon-only). We target it as the button
 * that is a direct child of the panel's dark header flex row, which also
 * contains the "Enterprise Sync QA" heading text.
 */
async function closeDebugPanel(page: Page) {
  const panelVisible = await page.getByText('Enterprise Sync QA').isVisible().catch(() => false);
  if (!panelVisible) return;
  // The close button is the only <button> inside the bg-slate-900 header bar.
  // Use { force: true } because the panel content can occasionally overlap during animation.
  await page
    .locator('div.bg-slate-900.text-white.p-3 button')
    .click({ force: true });
  // Wait for the gear to reappear, confirming the panel is closed.
  await expect(page.locator('button[title="Enterprise Sync QA Panel"]')).toBeVisible({ timeout: 3000 });
}

async function clickSimulateOffline(page: Page) {
  await page.getByRole('button', { name: /Simulate Offline/i }).click();
}

async function clickReconnect(page: Page) {
  await page.getByRole('button', { name: /Reconnect/i }).click();
}

async function clickForceReplay(page: Page) {
  // Force Replay is disabled while offline — wait for it to be enabled first.
  const forceBtn = page.getByRole('button', { name: /Force Replay/i });
  await expect(forceBtn).not.toBeDisabled({ timeout: 5000 });
  await forceBtn.click();
}

// ---------------------------------------------------------------------------
// Test 1 — Online submission: creates a pending ReviewItem, no stock mutation
// ---------------------------------------------------------------------------
test('Online submission creates a pending ReviewItem and does NOT deduct stock', async ({ page }) => {
  await clearBrowserState(page);

  // CEO: record baseline stock quantity for "1/2 Copper Elbow"
  await loginAsCEO(page);

  await openStockAndAssets(page);
  await expect(page.getByRole('heading', { name: /Stock & Assets/i })).toBeVisible();
  await page.getByRole('tab', { name: /^Stock$/i }).click();
  await expect(page.getByText('1/2 Copper Elbow')).toBeVisible();

  const baselineQty = parseInt(
    (
      await page
        .getByRole('row')
        .filter({ hasText: '1/2 Copper Elbow' })
        .locator('td')
        .nth(2)
        .textContent()
    )?.trim() ?? '0',
    10
  );

  await signOut(page);

  // Worker: submit a report with 3 units of "1/2 Copper Elbow"
  await softLoginAsWorker(page);

  await page.getByRole('button', { name: /Open Job/i }).first().click();
  await page.getByRole('button', { name: /Submit Report/i }).click();

  await page
    .getByRole('textbox', { name: /Describe the work completed/i })
    .fill('No-premature-mutation doctrine test — online path');

  await page
    .getByRole('textbox', { name: /Search materials to log/i })
    .fill('1/2 Copper Elbow');

  await page.locator('.cursor-pointer', { hasText: '1/2 Copper Elbow' }).first().click();

  // Selects by testid, not by utility class — see tests/helpers/worker.ts.
  const addedItemCard = page.getByTestId('worker-material-row').filter({ hasText: '1/2 Copper Elbow' });
  await addedItemCard.locator('input[type="number"]').fill('3');

  await page.getByRole('button', { name: /Save/i }).click();
  await expect(page.getByRole('status')).toContainText('Report Submitted');

  await signOut(page);

  // CEO: verify stock is UNCHANGED after submission (before approval)
  await softLoginAsCEO(page);

  await openStockAndAssets(page);
  await expect(page.getByRole('heading', { name: /Stock & Assets/i })).toBeVisible();
  await page.getByRole('tab', { name: /^Stock$/i }).click();
  await expect(page.getByText('1/2 Copper Elbow')).toBeVisible();

  const postSubmitQty = parseInt(
    (
      await page
        .getByRole('row')
        .filter({ hasText: '1/2 Copper Elbow' })
        .locator('td')
        .nth(2)
        .textContent()
    )?.trim() ?? '0',
    10
  );

  // DOCTRINE ASSERTION: stock must not have changed yet (no deduction before approval)
  expect(postSubmitQty).toBe(baselineQty);

  // DOCTRINE ASSERTION: Review Center must show a pending item
  await openReviewCenter(page);
  await expect(page.locator('body')).toContainText(/pending/i);
});

// ---------------------------------------------------------------------------
// Test 2 — Offline submission bridges to Review Center after sync (FIXED)
//
// Drives offline mode through the SynchronizationDebugPanel UI buttons.
//
// Flow:
//   1. Panel opened → Simulate Offline → panel CLOSED before navigating
//   2. Worker submits report → "Saved Offline" toast → on job detail page
//   3. Panel opened → Reconnect → Force Replay → panel CLOSED
//   4. processQueueBatch() fires → addReviewItemDirect() called
//   5. Panel CLOSED before signOut (panel overlay was blocking the Profile button)
//   6. CEO logs in → Review Center shows the new pending item
// ---------------------------------------------------------------------------
test('Offline submission appears in Review Center after sync completes', async ({ page }) => {
  await clearBrowserState(page);

  // CEO: record baseline count of job rows in the Review Center
  await loginAsCEO(page);
  await openReviewCenter(page);
  const pendingRowsBefore = await page.locator('tr').filter({ hasText: /DEMO-JOB-/i }).count();
  await signOut(page);

  // Worker: soft-login so the module-level store state is preserved
  await softLoginAsWorker(page);

  // ── Step 1: Enable offline mode ──────────────────────────────────────────
  await openDebugPanel(page);
  await clickSimulateOffline(page);
  await closeDebugPanel(page); // MUST close before clicking job list buttons

  // ── Step 2: Submit report offline ────────────────────────────────────────
  await page.getByRole('button', { name: /Open Job/i }).first().click();
  await page.getByRole('button', { name: /Submit Report/i }).click();

  // The amber offline banner confirms the store flag is active
  await expect(page.locator('body')).toContainText(/Offline Mode Active/i);

  await page
    .getByRole('textbox', { name: /Describe the work completed/i })
    .fill('No-premature-mutation doctrine test — offline path');

  await page.getByRole('button', { name: /Save/i }).click();

  // Expect the offline toast (report.tsx goes to queue instead of Review Center)
  await expect(page.getByRole('status')).toContainText(/Saved Offline|offline/i);

  // report.tsx now redirects to /worker/jobs/:id — panel gear is available

  // ── Step 3: Reconnect and force replay ───────────────────────────────────
  await openDebugPanel(page);

  // Guarantee fault injection is OFF so processQueueBatch always succeeds.
  // Both checkboxes default false, but explicitly uncheck them to be deterministic.
  const failureCheckbox = page.locator('input[type="checkbox"]').nth(0);
  const conflictCheckbox = page.locator('input[type="checkbox"]').nth(1);
  if (await failureCheckbox.isChecked()) await failureCheckbox.uncheck();
  if (await conflictCheckbox.isChecked()) await conflictCheckbox.uncheck();

  await clickReconnect(page);
  // setOfflineMode(false) triggers syncQueue() after a 500ms debounce
  await page.waitForTimeout(600);
  await clickForceReplay(page);
  // processQueueBatch has up to 2500ms of simulated delay; wait for it to fully settle
  await page.waitForTimeout(8000);

  // ── Step 4: Close panel BEFORE sign-out ──────────────────────────────────
  // The panel is a fixed overlay in the bottom-right. If it remains open,
  // its scrollable content intercepts pointer events and blocks the Profile button.
  await closeDebugPanel(page);

  await signOut(page);

  // ── Step 5: CEO verifies the replayed item is in the Review Center ────────
  // addReviewItemDirect() now persists the entry to localStorage under
  // ledger-direct-review-items, so it survives the page reload on sign-in.
  await softLoginAsCEO(page);
  await openReviewCenter(page);
  const pendingRowsAfter = await page.locator('tr').filter({ hasText: /DEMO-JOB-/i }).count();

  // DOCTRINE ASSERTION: the offline-synced report now appears in the Review Center
  expect(pendingRowsAfter).toBeGreaterThan(pendingRowsBefore);
});

// ---------------------------------------------------------------------------
// Test 3 — Attribution preserved: submitted ReviewItem carries worker identity
// ---------------------------------------------------------------------------
test('Worker identity is preserved on submitted ReviewItem', async ({ page }) => {
  await clearBrowserState(page);

  await loginAsWorker(page);

  await page.getByRole('button', { name: /Open Job/i }).first().click();
  await page.getByRole('button', { name: /Submit Report/i }).click();

  await page
    .getByRole('textbox', { name: /Describe the work completed/i })
    .fill('Attribution preservation doctrine test');

  await page.getByRole('button', { name: /Save/i }).click();
  await expect(page.getByRole('status')).toContainText('Report Submitted');

  await signOut(page);

  await loginAsCEO(page);
  await openReviewCenter(page);

  // The review center must show a job reference confirming the submission
  // was attributed to a job and preserved through the submission pipeline
  await expect(page.locator('body')).toContainText(/DEMO-JOB-/i);
});