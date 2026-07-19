import { test, expect } from '@playwright/test';
import { gotoPortalClean, portalSignIn, portalLoginAsActive, portalNavTo, PORTAL_ACCOUNTS } from '../helpers/portal';

// ──────────────────────────────────────────────────────────────────────────
// CL-2 — Client Portal Foundation, Provisioning & Authentication
// Doctrine: CLIENT_PORTAL_DOMAIN.md
//
// Covers: authentication (active/disabled/pending), client isolation,
// crew visibility (first name only, surname hidden), and audit instrumentation.
// ──────────────────────────────────────────────────────────────────────────

test.describe('Client Portal — Authentication (CL-2)', () => {
  test.beforeEach(async ({ page }) => {
    await gotoPortalClean(page);
  });

  // CP-01 — Active account can sign in
  test('CP-01: active portal account signs in successfully', async ({ page }) => {
    await portalSignIn(page, PORTAL_ACCOUNTS.dc1Active);
    await expect(page.getByTestId('portal-dashboard')).toBeVisible();
    await expect(page.getByTestId('portal-client-name')).toContainText('HSS Limited');
  });

  // CP-02 — Disabled account is blocked
  test('CP-02: disabled portal account is blocked from signing in', async ({ page }) => {
    await portalSignIn(page, PORTAL_ACCOUNTS.dc2Disabled);
    await expect(page.getByTestId('portal-login-error')).toBeVisible();
    await expect(page.getByTestId('portal-login-error')).toContainText(/disabled/i);
    await expect(page.getByTestId('portal-dashboard')).not.toBeVisible();
  });

  // CP-03 — Pending account is blocked
  test('CP-03: pending portal account is blocked from signing in', async ({ page }) => {
    await portalSignIn(page, PORTAL_ACCOUNTS.dc1Pending);
    await expect(page.getByTestId('portal-login-error')).toBeVisible();
    await expect(page.getByTestId('portal-login-error')).toContainText(/pending/i);
    await expect(page.getByTestId('portal-dashboard')).not.toBeVisible();
  });

  // CP-04 — Unknown email is rejected
  test('CP-04: unknown email is rejected', async ({ page }) => {
    await portalSignIn(page, 'nobody@example.com');
    await expect(page.getByTestId('portal-login-error')).toBeVisible();
    await expect(page.getByTestId('portal-dashboard')).not.toBeVisible();
  });

  // CP-05 — Sign out returns to the login screen
  test('CP-05: sign out clears the session and returns to login', async ({ page }) => {
    await portalLoginAsActive(page);
    await page.getByTestId('portal-signout').click();
    await expect(page.getByTestId('portal-login')).toBeVisible();
  });
});

test.describe('Client Portal — Isolation / RBAC (CL-2)', () => {
  test.beforeEach(async ({ page }) => {
    await gotoPortalClean(page);
  });

  // CP-06 — Client A sees only their own jobs
  test('CP-06: client A (HSS) sees only its own jobs', async ({ page }) => {
    await portalLoginAsActive(page, PORTAL_ACCOUNTS.dc1Active);
    await portalNavTo(page, 'jobs');
    // HSS (dc1) owns dj-kitchen-extract-1; it must be visible.
    await expect(page.getByTestId('portal-job-card-dj-kitchen-extract-1')).toBeVisible();
    // Showcase (dc2) owns dj-office-fit-1; it must NOT be visible to HSS.
    await expect(page.getByTestId('portal-job-card-dj-office-fit-1')).toHaveCount(0);
  });

  // CP-07 — Client B cannot see Client A's data
  test('CP-07: client B (Showcase) cannot see client A jobs', async ({ page }) => {
    await portalLoginAsActive(page, PORTAL_ACCOUNTS.dc2Active);
    await expect(page.getByTestId('portal-client-name')).toContainText('Showcase');
    await portalNavTo(page, 'jobs');
    // Showcase must NOT see any HSS job cards.
    await expect(page.getByTestId('portal-job-card-dj-kitchen-extract-1')).toHaveCount(0);
    await expect(page.getByTestId('portal-job-card-dj-pm-active-1')).toHaveCount(0);
  });

  // CP-08 — Client name reflects the signed-in account, not a hardcoded demo
  test('CP-08: signed-in client identity matches the account', async ({ page }) => {
    await portalLoginAsActive(page, PORTAL_ACCOUNTS.dc2Active);
    await expect(page.getByTestId('portal-client-name')).toContainText('Showcase Systems');
    await expect(page.getByTestId('portal-client-name')).not.toContainText('HSS');
  });
});

test.describe('Client Portal — Crew Visibility Doctrine (CL-2)', () => {
  test.beforeEach(async ({ page }) => {
    await gotoPortalClean(page);
  });

  // CP-09 — Crew first name is visible
  test('CP-09: crew first name is visible on a job', async ({ page }) => {
    await portalLoginAsActive(page, PORTAL_ACCOUNTS.dc1Active);
    await portalNavTo(page, 'jobs');
    await page.getByTestId('portal-job-card-dj-kitchen-extract-1').click();
    await expect(page.getByTestId('portal-job-detail')).toBeVisible();
    // dw2 = Sophie Taylor → first name shown
    await expect(page.getByTestId('portal-crew-name').first()).toBeVisible();
    await expect(page.getByTestId('portal-crew-name').filter({ hasText: 'Sophie' }).first()).toBeVisible();
  });

  // CP-10 — Crew surname is NEVER exposed
  test('CP-10: crew surnames are never exposed', async ({ page }) => {
    await portalLoginAsActive(page, PORTAL_ACCOUNTS.dc1Active);
    await portalNavTo(page, 'jobs');
    await page.getByTestId('portal-job-card-dj-kitchen-extract-1').click();
    await expect(page.getByTestId('portal-job-detail')).toBeVisible();
    // dw2 Sophie Taylor and dw3 Ben Hughes are on this job — surnames must not appear.
    const detail = page.getByTestId('portal-job-detail');
    await expect(detail).not.toContainText('Taylor');
    await expect(detail).not.toContainText('Hughes');
  });

  // CP-11 — Each crew name is a single token (first name only)
  test('CP-11: crew names render as first name only (single token)', async ({ page }) => {
    await portalLoginAsActive(page, PORTAL_ACCOUNTS.dc1Active);
    await portalNavTo(page, 'jobs');
    await page.getByTestId('portal-job-card-dj-kitchen-extract-1').click();
    await expect(page.getByTestId('portal-job-detail')).toBeVisible();
    const names = await page.getByTestId('portal-crew-name').allInnerTexts();
    expect(names.length).toBeGreaterThan(0);
    for (const name of names) {
      // A first-name-only label has no whitespace (no "First Last").
      expect(name.trim().split(/\s+/).length).toBe(1);
    }
  });
});

test.describe('Client Portal — Audit Infrastructure (CL-2)', () => {
  test.beforeEach(async ({ page }) => {
    await gotoPortalClean(page);
  });

  // CP-12 — Login generates an audit event
  test('CP-12: sign-in creates a client_portal_login audit event', async ({ page }) => {
    const before = await page.evaluate(() => (window as any).__portalAudit.countByType('client_portal_login'));
    await portalLoginAsActive(page, PORTAL_ACCOUNTS.dc1Active);
    const after = await page.evaluate(() => (window as any).__portalAudit.countByType('client_portal_login'));
    expect(after).toBeGreaterThan(before);
  });

  // CP-13 — Logout generates an audit event
  test('CP-13: sign-out creates a client_portal_logout audit event', async ({ page }) => {
    await portalLoginAsActive(page, PORTAL_ACCOUNTS.dc1Active);
    const before = await page.evaluate(() => (window as any).__portalAudit.countByType('client_portal_logout'));
    await page.getByTestId('portal-signout').click();
    await expect(page.getByTestId('portal-login')).toBeVisible();
    const after = await page.evaluate(() => (window as any).__portalAudit.countByType('client_portal_logout'));
    expect(after).toBeGreaterThan(before);
  });

  // CP-14 — Viewing a job generates a client_viewed_job audit event
  test('CP-14: opening a job creates a client_viewed_job audit event', async ({ page }) => {
    await portalLoginAsActive(page, PORTAL_ACCOUNTS.dc1Active);
    await portalNavTo(page, 'jobs');
    const before = await page.evaluate(() => (window as any).__portalAudit.countByType('client_viewed_job'));
    await page.getByTestId('portal-job-card-dj-kitchen-extract-1').click();
    await expect(page.getByTestId('portal-job-detail')).toBeVisible();
    const after = await page.evaluate(() => (window as any).__portalAudit.countByType('client_viewed_job'));
    expect(after).toBeGreaterThan(before);
  });

  // CP-15 — Dashboard view generates a client_viewed_dashboard audit event
  test('CP-15: signing in records a client_viewed_dashboard audit event', async ({ page }) => {
    const before = await page.evaluate(() => (window as any).__portalAudit.countByType('client_viewed_dashboard'));
    await portalLoginAsActive(page, PORTAL_ACCOUNTS.dc1Active);
    const after = await page.evaluate(() => (window as any).__portalAudit.countByType('client_viewed_dashboard'));
    expect(after).toBeGreaterThan(before);
  });
});
