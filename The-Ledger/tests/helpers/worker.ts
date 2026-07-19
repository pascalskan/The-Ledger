import { Page, expect } from '@playwright/test';

export async function submitBasicReport(page: Page, description: string = 'Basic report', jobText?: string) {
  if (jobText) {
    // The worker lands on Home after login; the job's reference (e.g. DEMO-JOB-0202)
    // is shown on the My Jobs list, so navigate there before targeting the card.
    await page.getByTestId('worker-nav-jobs').click();
    await page.locator('.space-y-4 > div', { hasText: jobText }).getByRole('button', { name: /Open Job/i }).click();
  } else {
    await page.getByRole('button', { name: /Open Job/i }).first().click();
  }
  await page.getByRole('button', { name: /Submit Report/i }).click();
  await page.getByRole('textbox', { name: /Describe the work completed/i }).fill(description);
  await page.getByRole('button', { name: /Save/i }).click();
}

export async function submitMaterialReport(
  page: Page,
  materialName: string,
  quantity: number,
  description: string = 'Inventory deduction test'
) {
  await page.getByRole('button', { name: /Open Job/i }).first().click();

  await page.getByRole('button', { name: /Submit Report/i }).click();

  await page
    .getByRole('textbox', {
      name: /Describe the work completed/i,
    })
    .fill(description);

  await page
    .getByRole('textbox', {
      name: /Search materials to log/i,
    })
    .fill(materialName);

  // Click the search result item to add it
  await page
    .locator('.cursor-pointer', { hasText: materialName })
    .first()
    .click();

  // Find the added item card and fill its quantity.
  // Selects by testid, not by utility class — the previous `.bg-white.rounded-xl`
  // selector broke the moment the card was restyled (Workstream E token sweep).
  const addedItemCard = page.getByTestId('worker-material-row').filter({ hasText: materialName });
  await addedItemCard.locator('input[type="number"]').fill(String(quantity));

  // Save the report
  await page.getByRole('button', { name: /Save/i }).click();
  
  // Wait for success toast to confirm creation
  await expect(
    page.getByRole('status')
  ).toContainText('Report Submitted');}