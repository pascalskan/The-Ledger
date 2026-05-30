import { test, expect } from '@playwright/test';

import { loginAsCEO, softLoginAsWorker, softLoginAsCEO } from '../helpers/login';
import { signOut } from '../helpers/signOut';
import { openReviewCenter } from '../helpers/navigation';
import { approveReviewForJob } from '../helpers/review';
import { submitMaterialReport } from '../helpers/worker';

// IMPORTANT: This test does NOT use clearBrowserState.
//
// The mock store is purely in-memory (module-level variables in mockData.ts).
// Any page.goto() call reloads the JS bundle and resets ALL store state.
// To preserve data across role switches, we use signOut() (UI navigation)
// followed by softLogin* helpers (no page.goto) so the store survives.
// Only the first loginAsCEO uses page.goto to establish a clean starting point.

test('Inventory quantity decreases when approved material usage is processed', async ({
  page,
}) => {
  let startingQty = 0;

  //
  // STEP 1: CEO records the starting stock quantity
  //
  await loginAsCEO(page); // Only hard-goto — establishes baseline store state

  await page
    .locator('a')
    .filter({ hasText: 'Stock & Assets' })
    .first()
    .click();

  await expect(
    page.getByRole('heading', { name: /Stock & Assets/i })
  ).toBeVisible();

  await page.getByRole('tab', { name: /^Stock$/i }).click();

  await expect(page.getByText('1/2 Copper Elbow')).toBeVisible();

  const startingRow = page
    .getByRole('row')
    .filter({ hasText: '1/2 Copper Elbow' });

  const startingQtyCell = startingRow.locator('td').nth(2);

  startingQty = parseInt(
    ((await startingQtyCell.textContent()) || '0').trim(),
    10
  );

  console.log('[DOCTRINE] Starting quantity:', startingQty);

  //
  // STEP 2: Sign out CEO, sign in as Worker (soft — no page reload)
  //
  await signOut(page);
  await softLoginAsWorker(page);

  await submitMaterialReport(
    page,
    '1/2 Copper Elbow',
    4,
    'Inventory deduction doctrine test'
  );

  //
  // STEP 3: Sign out Worker, sign in as CEO (soft — no page reload)
  //
  await signOut(page);
  await softLoginAsCEO(page);

  await openReviewCenter(page);

  await expect(
    page.locator('tr').filter({ hasText: 'DEMO-JOB-0202' })
  ).toBeVisible({ timeout: 10000 });

  await approveReviewForJob(page, 'DEMO-JOB-0202');

  //
  // STEP 4: Verify stock quantity decreased
  //
  await page
    .locator('a')
    .filter({ hasText: 'Stock & Assets' })
    .first()
    .click();

  await expect(
    page.getByRole('heading', { name: /Stock & Assets/i })
  ).toBeVisible();

  await page.getByRole('tab', { name: /^Stock$/i }).click();

  await expect(page.getByText('1/2 Copper Elbow')).toBeVisible();

  const endingRow = page
    .getByRole('row')
    .filter({ hasText: '1/2 Copper Elbow' });

  const endingQtyCell = endingRow.locator('td').nth(2);

  const endingQty = parseInt(
    ((await endingQtyCell.textContent()) || '0').trim(),
    10
  );

  console.log('[DOCTRINE] Ending quantity:', endingQty);
  console.log('[DOCTRINE] Expected:', startingQty - 4);

  expect(endingQty).toBe(startingQty - 4);
});