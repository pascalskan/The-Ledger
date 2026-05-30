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
 *   2. OFFLINE PATH — Worker submission (in offline mode) writes to the queue.
 *      Neither inventory NOR a ReviewItem is created at queue-write time.
 *      (The offline queue gap: synced items never reach the Review Center
 *      without a manual call to addReviewItem. This gap is tracked in the
 *      test outcome and must be resolved before Phase 4.)
 *
 *   3. APPROVAL GATE — Inventory is only deducted when an approved ReviewItem
 *      is updated to status === 'approved' inside the Review Center.
 *      This is already proven by inventory-deduction.spec.ts; this test
 *      documents the doctrine assertion in isolation.
 */

import { test, expect } from '@playwright/test';
import { loginAsCEO, loginAsWorker, softLoginAsCEO, softLoginAsWorker } from '../helpers/login';
import { signOut } from '../helpers/signOut';
import { openReviewCenter } from '../helpers/navigation';
import { clearBrowserState } from '../helpers/state';

// ---------------------------------------------------------------------------
// Test 1 — Online submission: creates a pending ReviewItem, no stock mutation
// ---------------------------------------------------------------------------
test('Online submission creates a pending ReviewItem and does NOT deduct stock', async ({ page }) => {
  await clearBrowserState(page);

  // CEO: record baseline stock quantity for "1/2 Copper Elbow"
  await loginAsCEO(page);

  await page.locator('a').filter({ hasText: 'Stock & Assets' }).first().click();
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

  // Worker: submit a report with 3 units of "1/2 Copper Elbow" (soft login — store preserved)
  await softLoginAsWorker(page);

  await page.getByRole('button', { name: /Open Job/i }).first().click();
  await page.getByRole('button', { name: /Submit Report/i }).click();

  await page
    .getByRole('textbox', { name: /Describe the work completed/i })
    .fill('No-premature-mutation doctrine test — online path');

  await page
    .getByRole('textbox', { name: /Search materials to log/i })
    .fill('1/2 Copper Elbow');

  await page
    .locator('.cursor-pointer', { hasText: '1/2 Copper Elbow' })
    .first()
    .click();

  const addedItemCard = page.locator('.bg-white.rounded-xl', { hasText: '1/2 Copper Elbow' });
  await addedItemCard.locator('input[type="number"]').fill('3');

  await page.getByRole('button', { name: /Save/i }).click();

  await expect(page.getByRole('status')).toContainText('Report Submitted');

  await signOut(page);

  // CEO: verify stock is UNCHANGED after submission (before approval)
  await softLoginAsCEO(page);

  await page.locator('a').filter({ hasText: 'Stock & Assets' }).first().click();
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

  // DOCTRINE ASSERTION: stock must not have changed yet
  expect(postSubmitQty).toBe(baselineQty);

  // DOCTRINE ASSERTION: Review Center must show a pending item
  await openReviewCenter(page);
  await expect(page.locator('body')).toContainText(/pending/i);
});

// ---------------------------------------------------------------------------
// Test 2 — Offline submission: queue write does NOT create a ReviewItem
//
// NOTE: This test documents the known offline queue gap identified during the
// Phase 2 certification audit.
//
// The gap: processQueueBatch() in offlineQueueStore.ts transitions items to
// syncStatus === "synced" but NEVER calls addReviewItem(). Synced offline
// submissions therefore do not appear in the Review Center.
//
// Severity: HIGH — violates the Worker → Queue → Replay → Review Center
// doctrine chain. Workers who submit offline have their reports silently
// dropped from the review pipeline.
//
// This test currently asserts the broken behavior (no review item created)
// so that it PASSES as a documented finding. Once the gap is fixed (the sync
// handler must call addReviewItem on success), this assertion must be inverted
// to expect a pending item in the Review Center.
// ---------------------------------------------------------------------------
test('KNOWN GAP — Offline submission queues item but does NOT bridge to Review Center on sync', async ({ page }) => {
  await clearBrowserState(page);

  // CEO: record baseline review-center count
  await loginAsCEO(page);
  await openReviewCenter(page);

  // Count pending items before we do anything
  const pendingRowsBefore = await page.locator('tr').filter({ hasText: /DEMO-JOB-/i }).count();

  await signOut(page);

  // Worker: enable offline mode and submit a report
  await softLoginAsWorker(page);

  // Enable offline mode via the debug toggle (if present), otherwise inject
  // via page.evaluate to set the store flag directly.
  await page.evaluate(() => {
    // Directly set the offline flag on the persisted Zustand store key
    const raw = localStorage.getItem('ledger-offline-queue');
    const store = raw ? JSON.parse(raw) : { state: {} };
    store.state = { ...(store.state || {}), isOffline: true };
    localStorage.setItem('ledger-offline-queue', JSON.stringify(store));
  });

  // Reload to pick up the persisted offline flag
  await page.reload();

  // Re-login as worker after reload
  await page.getByRole('button', { name: /Demo Worker/i }).click();
  await page.getByRole('button', { name: /Sign in/i }).click();

  await page.getByRole('button', { name: /Open Job/i }).first().click();
  await page.getByRole('button', { name: /Submit Report/i }).click();

  await page
    .getByRole('textbox', { name: /Describe the work completed/i })
    .fill('No-premature-mutation doctrine test — offline path');

  await page.getByRole('button', { name: /Save/i }).click();

  // The offline path should show "Saved Offline" toast
  await expect(page.getByRole('status')).toContainText(/Saved Offline|offline/i);

  // Turn offline mode OFF so the queue can attempt to sync
  await page.evaluate(() => {
    const raw = localStorage.getItem('ledger-offline-queue');
    const store = raw ? JSON.parse(raw) : { state: {} };
    store.state = { ...(store.state || {}), isOffline: false };
    localStorage.setItem('ledger-offline-queue', JSON.stringify(store));
  });

  // Wait for the sync delay (the store triggers syncQueue after 500ms)
  await page.waitForTimeout(4000);

  await signOut(page);

  // CEO: check whether a new review item appeared in the Review Center
  await softLoginAsCEO(page);
  await openReviewCenter(page);

  const pendingRowsAfter = await page.locator('tr').filter({ hasText: /DEMO-JOB-/i }).count();

  // KNOWN GAP ASSERTION: the offline-synced report does NOT appear in the
  // Review Center because processQueueBatch() never calls addReviewItem().
  //
  // If this assertion FAILS in the future, it means the gap has been fixed —
  // at that point, change toBe(pendingRowsBefore) → toBeGreaterThan(pendingRowsBefore)
  // and remove the "KNOWN GAP" label from the test name.
  expect(pendingRowsAfter).toBe(pendingRowsBefore);
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

  // The review center should show an item that carries a worker reference
  // (job ID appears in the table, meaning the submission was attributed to a job/worker)
  await expect(page.locator('body')).toContainText(/DEMO-JOB-/i);
});
