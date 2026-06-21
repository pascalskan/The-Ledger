import { Page, expect } from '@playwright/test';

// ──────────────────────────────────────────────────────────────
// CLIENT PORTAL TEST HELPERS (CL-2)
//
// The portal is a separate surface at /portal with its own auth
// (portalAuth.ts, localStorage key `ledger-portal-session`). It does
// NOT use the internal ledger-auth-email session.
// ──────────────────────────────────────────────────────────────

const PORTAL_SESSION_KEY = 'ledger-portal-session';

// Seeded portal accounts (see client/src/lib/portalAuth.ts)
export const PORTAL_ACCOUNTS = {
  dc1Active: 'portal@hsslimited.co.uk',
  dc1Pending: 'sitemanager@hsslimited.co.uk',
  dc2Active: 'portal@showcasesystems.co.uk',
  dc2Disabled: 'former@showcasesystems.co.uk',
};

/** Navigate to the portal and clear any prior portal/internal session. */
export async function gotoPortalClean(page: Page) {
  await page.goto('/portal');
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
  await page.goto('/portal');
}

/** Attempt portal sign-in with the given email. Does not assert outcome. */
export async function portalSignIn(page: Page, email: string, password = 'demo') {
  await page.getByTestId('portal-login-email').fill(email);
  await page.getByTestId('portal-login-password').fill(password);
  await page.getByTestId('portal-login-submit').click();
}

/** Sign in as an Active account and assert the dashboard renders. */
export async function portalLoginAsActive(page: Page, email = PORTAL_ACCOUNTS.dc1Active) {
  await portalSignIn(page, email);
  await expect(page.getByTestId('portal-dashboard')).toBeVisible();
}

export { PORTAL_SESSION_KEY };
