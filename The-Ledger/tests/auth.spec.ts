import { test, expect } from '@playwright/test';

test('CEO can login', async ({ page }) => {
  await page.goto('/auth');

  await page.getByRole('button', {
    name: /Demo CEO/i,
  }).click();

  await page.getByRole('button', {
    name: /Sign in/i,
  }).click();

  await expect(page.locator('body')).toBeVisible();
});

test('PM can login', async ({ page }) => {
  await page.goto('/auth');

  await page.getByRole('button', {
    name: /Demo PM/i
  }).click();

  await page.getByRole('button', {
    name: /Sign in/i,
  }).click();

  await expect(page.locator('body')).toBeVisible();
});

test('Worker can login', async ({ page }) => {
  await page.goto('/auth');

  await page.getByRole('button', {
    name: /Demo Worker/i,
  }).click();

  await page.getByRole('button', {
    name: /Sign in/i,
  }).click();

  await expect(page.locator('body')).toBeVisible();
});