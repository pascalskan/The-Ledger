import { Page } from '@playwright/test';

export async function openJobs(page: Page) {
  await page.getByRole('link', {
    name: /Jobs/i,
  }).click();
}

export async function openReviewCenter(page: Page) {
  await page.getByTestId('nav-review').click();
}

// UX-7.8 — the CEO Review Operations Centre unifies the intelligence layers
// into tabs. Open the relevant tab before asserting on its panel.
export type ReviewHubTab =
  | 'briefing'
  | 'dashboard'
  | 'prioritisation'
  | 'recommendations'
  | 'analytics';

export async function openReviewHubTab(page: Page, tab: ReviewHubTab) {
  await page.getByTestId(`review-hub-tab-${tab}`).click();
}

export async function openAuditLog(page: Page) {
  const adminToggle = page.getByTestId('nav-admin-toggle');
  if (await adminToggle.isVisible()) {
    await adminToggle.click();
  }
  await page.getByTestId('nav-audit-log').click();
}
