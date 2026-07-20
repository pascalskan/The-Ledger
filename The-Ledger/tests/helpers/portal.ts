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
  await waitForPortalAudit(page);
}

/**
 * Wait for the portal audit test bridge to exist on window.
 *
 * E-7 made routes lazy, so portalAudit.ts now ships in the portal chunk rather
 * than the entry bundle. `page.goto` resolves on the load event, which can be
 * BEFORE that chunk has finished fetching — so a test reading
 * `window.__portalAudit` immediately afterwards saw undefined.
 *
 * This is not masking a defect. The tests always assumed the portal module had
 * evaluated before they read its audit log; that assumption was simply free
 * when everything lived in one bundle. Now it has to be stated.
 */
export async function waitForPortalAudit(page: Page) {
  await page.waitForFunction(() => Boolean((window as any).__portalAudit), null, {
    timeout: 15000,
  });
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

/**
 * Click a desktop sidebar nav item (viewport is desktop width in CI config).
 *
 * `messages` is not a nav item — CL-8 folded conversations under Requests as a
 * tab, restoring the domain's seven sections. Navigating to 'messages'
 * therefore goes via Requests → Conversations.
 */
export async function portalNavTo(
  page: Page,
  key: 'dashboard' | 'sites' | 'jobs' | 'documents' | 'invoices' | 'requests' | 'notifications' | 'messages'
) {
  if (key === 'messages') {
    await page.getByTestId('portal-nav-requests').click();
    await page.getByTestId('portal-comms-tab-conversations').click();
    return;
  }
  await page.getByTestId(`portal-nav-${key}`).click();
}

export { PORTAL_SESSION_KEY };
