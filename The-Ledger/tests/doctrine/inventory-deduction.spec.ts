import { test, expect } from '@playwright/test';
import { login, logout } from '../utils/auth';
import { TEST_WORKER_EMAIL, TEST_CEO_EMAIL } from '../utils/constants';

test.describe('Inventory Deduction Workflow', () => {
  let initialStockQuantity: number;
  const stockItemToUse = {
    name: '1/2 Copper Elbow',
    quantityToUse: 4,
  };

  test.beforeEach(async ({ page }) => {
    // 1. Login as CEO
    await login(page, TEST_CEO_EMAIL);

    // 2. Open Stock & Assets
    await page.goto('/stock');

    // 3. Record current quantity
    const stockRow = page.locator(`tr:has-text("${stockItemToUse.name}")`);
    const quantityCell = stockRow.locator('td').nth(2);
    initialStockQuantity = parseInt(await quantityCell.innerText(), 10);

    // 4. Sign out
    await logout(page);
  });

  test('should deduct inventory after a worker report is approved', async ({ page }) => {
    // 5. Login as Worker
    await login(page, TEST_WORKER_EMAIL);

    // 6. Submit a report
    await page.goto('/worker/report');
    await page.getByLabel('Job').click();
    await page.getByRole('option', { name: /Kitchen extraction/ }).click();
    await page.getByRole('button', { name: 'Add Stock' }).click();
    await page.getByLabel('Stock Item').click();
    await page.getByRole('option', { name: stockItemToUse.name }).click();
    await page.getByLabel('Quantity').fill(stockItemToUse.quantityToUse.toString());
    await page.getByRole('button', { name: 'Add' }).click();
    await page.getByRole('button', { name: 'Submit Report' }).click();
    await expect(page.getByText('Report submitted successfully')).toBeVisible();

    // 7. Sign out
    await logout(page);

    // 8. Login as CEO
    await login(page, TEST_CEO_EMAIL);

    // 9. Open Review Center
    await page.goto('/reviews');

    // 10. Approve the review item
    const reviewItem = page.locator('.review-item').first();
    await expect(reviewItem).toContainText(stockItemToUse.name);
    await reviewItem.getByRole('button', { name: 'Approve' }).click();
    await expect(page.getByText('Review item approved')).toBeVisible();

    // 11. Return to Stock & Assets
    await page.goto('/stock');

    // 12. Verify quantity
    const stockRow = page.locator(`tr:has-text("${stockItemToUse.name}")`);
    const quantityCell = stockRow.locator('td').nth(2);
    const newStockQuantity = parseInt(await quantityCell.innerText(), 10);

    expect(newStockQuantity).toBe(initialStockQuantity - stockItemToUse.quantityToUse);
  });
});
