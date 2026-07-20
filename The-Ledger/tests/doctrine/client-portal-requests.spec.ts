import { test, expect } from '@playwright/test';
import { gotoPortalClean, portalLoginAsActive, portalNavTo, PORTAL_ACCOUNTS } from '../helpers/portal';
import { loginAsCEO, loginAsPM } from '../helpers/login';
import { clearBrowserState } from '../helpers/state';

// ──────────────────────────────────────────────────────────────────────────
// CL-8 — Client Requests
// Doctrine: CLIENT_REQUEST_DOMAIN.md (FROZEN)
//
// Covers the client submission surface, the PM/CEO management surface, the
// lifecycle with its mandatory notes, RBAC scoping, and the doctrine
// guarantees: requests never enter the Review Centre, never create financial
// records, cannot be reopened after decline, and are never silently declined.
//
// Seed map:
//   req-1 scheduling_change  dc1  dj-showcase-maint-1  acknowledged  (PM du2 does NOT manage this job)
//   req-2 document_request   dc1  dj-kitchen-extract-1 resolved  + resolution note
//   req-3 additional_service dc1  dj-pm-active-1       declined  + decline reason
//   req-4 general_enquiry    dc1  (no project)         open      → routed CEO, escalated
//   req-5 quality_complaint  dc2  dj-office-fit-1      in_progress
// ──────────────────────────────────────────────────────────────────────────

test.describe('Client Requests — portal submission surface (CL-8)', () => {
  test.beforeEach(async ({ page }) => {
    await gotoPortalClean(page);
  });

  // CR-01 — Client sees their own requests
  test('CR-01: client sees their own requests', async ({ page }) => {
    await portalLoginAsActive(page, PORTAL_ACCOUNTS.dc1Active);
    await portalNavTo(page, 'requests');
    await expect(page.getByTestId('portal-requests')).toBeVisible();
    await expect(page.getByTestId('portal-request-req-1')).toBeVisible();
    await expect(page.getByTestId('portal-request-req-2')).toBeVisible();
  });

  // CR-02 — Requests are scoped to the signed-in client
  test('CR-02: requests are isolated per client', async ({ page }) => {
    await portalLoginAsActive(page, PORTAL_ACCOUNTS.dc1Active);
    await portalNavTo(page, 'requests');
    // req-5 belongs to Showcase (dc2).
    await expect(page.getByTestId('portal-request-req-5')).toHaveCount(0);
  });

  // CR-03 — Client B sees only its own request
  test('CR-03: client B sees only its own requests', async ({ page }) => {
    await portalLoginAsActive(page, PORTAL_ACCOUNTS.dc2Active);
    await portalNavTo(page, 'requests');
    await expect(page.getByTestId('portal-request-req-5')).toBeVisible();
    await expect(page.getByTestId('portal-request-req-1')).toHaveCount(0);
    await expect(page.getByTestId('portal-request-req-2')).toHaveCount(0);
  });

  // CR-04 — Statuses and types render
  test('CR-04: request statuses and types render', async ({ page }) => {
    await portalLoginAsActive(page, PORTAL_ACCOUNTS.dc1Active);
    await portalNavTo(page, 'requests');
    await expect(page.getByTestId('portal-request-status-req-1')).toHaveText('Acknowledged');
    await expect(page.getByTestId('portal-request-status-req-2')).toHaveText('Resolved');
    await expect(page.getByTestId('portal-request-status-req-3')).toHaveText('Declined');
    await expect(page.getByTestId('portal-request-type-req-3')).toHaveText('Additional Service Request');
  });

  // CR-05 — Resolution note is shared with the client
  test('CR-05: resolution note is visible to the client', async ({ page }) => {
    await portalLoginAsActive(page, PORTAL_ACCOUNTS.dc1Active);
    await portalNavTo(page, 'requests');
    await page.getByTestId('portal-request-req-2').click();
    await expect(page.getByTestId('portal-request-detail')).toBeVisible();
    await expect(page.getByTestId('portal-request-resolution')).toBeVisible();
    await expect(page.getByTestId('portal-request-resolution')).toContainText('commissioning certificate');
  });

  // CR-06 — Decline reason is always shared — no silent decline
  test('CR-06: decline reason is visible to the client', async ({ page }) => {
    await portalLoginAsActive(page, PORTAL_ACCOUNTS.dc1Active);
    await portalNavTo(page, 'requests');
    await page.getByTestId('portal-request-req-3').click();
    await expect(page.getByTestId('portal-request-decline')).toBeVisible();
    await expect(page.getByTestId('portal-request-decline')).toContainText('asbestos survey');
    await expect(page.getByTestId('portal-request-terminal-note')).toBeVisible();
  });

  // CR-07 — Internal routing and escalation are never exposed to the client
  test('CR-07: internal routing and escalation are never exposed', async ({ page }) => {
    await portalLoginAsActive(page, PORTAL_ACCOUNTS.dc1Active);
    await portalNavTo(page, 'requests');
    const list = page.getByTestId('portal-requests');
    await expect(list).not.toContainText(/escalat/i);
    await expect(list).not.toContainText(/routed/i);
    await expect(list).not.toContainText(/unacknowledged/i);
    await expect(list).not.toContainText(/review centre/i);
  });

  // CR-08 — Client can submit a request
  test('CR-08: client can submit a new request', async ({ page }) => {
    await portalLoginAsActive(page, PORTAL_ACCOUNTS.dc1Active);
    await portalNavTo(page, 'requests');
    await page.getByTestId('portal-request-new').click();
    await expect(page.getByTestId('portal-request-compose')).toBeVisible();
    await page.getByTestId('portal-request-subject').fill('Spare filter cartridges');
    await page.getByTestId('portal-request-description').fill('Please could you quote for spare filter cartridges?');
    await page.getByTestId('portal-request-submit').click();
    await expect(page.getByTestId('portal-request-list')).toContainText('Spare filter cartridges');
  });

  // CR-09 — All eight domain request types are offered
  test('CR-09: all eight request types are available', async ({ page }) => {
    await portalLoginAsActive(page, PORTAL_ACCOUNTS.dc1Active);
    await portalNavTo(page, 'requests');
    await page.getByTestId('portal-request-new').click();
    await expect(page.getByTestId('portal-request-type').locator('option')).toHaveCount(8);
  });

  // CR-10 — Submission requires subject and details
  test('CR-10: submission requires subject and details', async ({ page }) => {
    await portalLoginAsActive(page, PORTAL_ACCOUNTS.dc1Active);
    await portalNavTo(page, 'requests');
    await page.getByTestId('portal-request-new').click();
    await page.getByTestId('portal-request-submit').click();
    await expect(page.getByTestId('portal-request-error')).toBeVisible();
  });

  // CR-11 — Submission records a client_request_submitted audit event
  test('CR-11: submitting a request records an audit event', async ({ page }) => {
    await portalLoginAsActive(page, PORTAL_ACCOUNTS.dc1Active);
    await portalNavTo(page, 'requests');
    const before = await page.evaluate(() => (window as any).__portalAudit.countByType('client_request_submitted'));
    await page.getByTestId('portal-request-new').click();
    await page.getByTestId('portal-request-subject').fill('Access badge for new supervisor');
    await page.getByTestId('portal-request-description').fill('We need an access badge issued.');
    await page.getByTestId('portal-request-submit').click();
    const after = await page.evaluate(() => (window as any).__portalAudit.countByType('client_request_submitted'));
    expect(after).toBeGreaterThan(before);
  });

  // CR-12 — Requests hosts Conversations; nav is back to seven sections
  test('CR-12: requests hosts conversations and nav has seven sections', async ({ page }) => {
    await portalLoginAsActive(page, PORTAL_ACCOUNTS.dc1Active);
    await portalNavTo(page, 'requests');
    await expect(page.getByTestId('portal-comms-tabs')).toBeVisible();
    await expect(page.getByTestId('portal-comms-tab-conversations')).toBeVisible();
    // Messages is no longer its own nav item.
    await expect(page.getByTestId('portal-nav-messages')).toHaveCount(0);
    // Scoped to the desktop sidebar: the bare `^="portal-nav-"` prefix also
    // matched the seven `portal-nav-mobile-*` items, so this asserted 7 against
    // a DOM that always contains 14. Pre-existing failure — reproduces on
    // main @ 42cf4d6, so the recorded 915/915 baseline was really 914/915.
    await expect(
      page.getByTestId('portal-sidebar').locator('[data-testid^="portal-nav-"]'),
    ).toHaveCount(7);
    // Conversations tab still reaches the CL-5 communication centre.
    await page.getByTestId('portal-comms-tab-conversations').click();
    await expect(page.getByTestId('portal-messages')).toBeVisible();
  });
});

test.describe('Client Requests — management surface RBAC (CL-8)', () => {
  test.beforeEach(async ({ page }) => {
    await clearBrowserState(page);
  });

  // CR-13 — CEO sees all client requests across all clients
  test('CR-13: CEO sees all client requests', async ({ page }) => {
    await loginAsCEO(page);
    await page.goto('/client-requests');
    await expect(page.getByTestId('client-requests-page')).toBeVisible();
    await page.getByTestId('client-requests-filter').selectOption('all');
    for (const id of ['req-1', 'req-2', 'req-3', 'req-4', 'req-5']) {
      await expect(page.getByTestId(`client-request-${id}`)).toBeVisible();
    }
  });

  // CR-14 — PM sees only requests for jobs they manage
  test('CR-14: PM sees only requests for their assigned jobs', async ({ page }) => {
    await loginAsPM(page);
    await page.goto('/client-requests');
    await page.getByTestId('client-requests-filter').selectOption('all');
    // PM du2 manages kitchen-extract (req-2), pm-active (req-3), office-fit (req-5).
    await expect(page.getByTestId('client-request-req-2')).toBeVisible();
    await expect(page.getByTestId('client-request-req-3')).toBeVisible();
    // Does NOT manage showcase-maint (req-1); req-4 has no project and routes to CEO.
    await expect(page.getByTestId('client-request-req-1')).toHaveCount(0);
    await expect(page.getByTestId('client-request-req-4')).toHaveCount(0);
  });

  // CR-15 — The doctrine notice states requests do not enter the Review Centre
  test('CR-15: management surface states requests do not enter the Review Centre', async ({ page }) => {
    await loginAsCEO(page);
    await page.goto('/client-requests');
    const notice = page.getByTestId('client-requests-doctrine-notice');
    await expect(notice).toBeVisible();
    await expect(notice).toContainText(/Review Centre/i);
    await expect(notice).toContainText(/no request creates a financial record/i);
  });

  // CR-16 — Escalation is surfaced for unacknowledged requests past threshold
  test('CR-16: unacknowledged requests past threshold are flagged as escalated', async ({ page }) => {
    await loginAsCEO(page);
    await page.goto('/client-requests');
    // req-4 is open and 3 days old against a 48h threshold.
    await expect(page.getByTestId('client-request-escalated-req-4')).toBeVisible();
    await expect(page.getByTestId('client-requests-escalated-badge')).toBeVisible();
  });
});

test.describe('Client Requests — lifecycle & mandatory notes (CL-8)', () => {
  test.beforeEach(async ({ page }) => {
    await clearBrowserState(page);
  });

  // CR-17 — Acknowledge moves open → acknowledged
  test('CR-17: acknowledging an open request updates its status', async ({ page }) => {
    await loginAsCEO(page);
    await page.goto('/client-requests');
    await expect(page.getByTestId('client-request-status-req-4')).toHaveText('Open');
    await page.getByTestId('client-request-acknowledge-req-4').click();
    await expect(page.getByTestId('client-request-status-req-4')).toHaveText('Acknowledged');
  });

  // CR-18 — Resolution requires a note
  test('CR-18: resolving requires a resolution note', async ({ page }) => {
    await loginAsCEO(page);
    await page.goto('/client-requests');
    await page.getByTestId('client-request-resolve-req-1').click();
    await expect(page.getByTestId('client-request-dialog')).toBeVisible();
    await page.getByTestId('client-request-dialog-confirm').click();
    await expect(page.getByTestId('client-request-note-error')).toBeVisible();
    await expect(page.getByTestId('client-request-status-req-1')).toHaveText('Acknowledged');
  });

  // CR-19 — Decline requires a reason — no silent decline
  test('CR-19: declining requires a reason', async ({ page }) => {
    await loginAsCEO(page);
    await page.goto('/client-requests');
    await page.getByTestId('client-request-decline-req-1').click();
    await page.getByTestId('client-request-dialog-confirm').click();
    await expect(page.getByTestId('client-request-note-error')).toBeVisible();
  });

  // CR-20 — Resolving with a note succeeds and records an audit event
  test('CR-20: resolving with a note succeeds and is audited', async ({ page }) => {
    await loginAsCEO(page);
    await page.goto('/client-requests');
    const before = await page.evaluate(() => (window as any).__portalAudit.countByType('client_request_resolved'));
    await page.getByTestId('client-request-resolve-req-1').click();
    await page.getByTestId('client-request-note').fill('Evening slot confirmed for Thursday at 18:00.');
    await page.getByTestId('client-request-dialog-confirm').click();
    await page.getByTestId('client-requests-filter').selectOption('all');
    await expect(page.getByTestId('client-request-status-req-1')).toHaveText('Resolved');
    await expect(page.getByTestId('client-request-outcome-req-1')).toContainText('Evening slot confirmed');
    const after = await page.evaluate(() => (window as any).__portalAudit.countByType('client_request_resolved'));
    expect(after).toBeGreaterThan(before);
  });

  // CR-21 — Declining with a reason succeeds and is audited
  test('CR-21: declining with a reason succeeds and is audited', async ({ page }) => {
    await loginAsCEO(page);
    await page.goto('/client-requests');
    const before = await page.evaluate(() => (window as any).__portalAudit.countByType('client_request_declined'));
    await page.getByTestId('client-request-decline-req-1').click();
    await page.getByTestId('client-request-note').fill('Crew unavailable for evening work this week.');
    await page.getByTestId('client-request-dialog-confirm').click();
    await page.getByTestId('client-requests-filter').selectOption('all');
    await expect(page.getByTestId('client-request-status-req-1')).toHaveText('Declined');
    const after = await page.evaluate(() => (window as any).__portalAudit.countByType('client_request_declined'));
    expect(after).toBeGreaterThan(before);
  });

  // CR-22 — A declined request is terminal and cannot be reopened
  test('CR-22: a declined request exposes no lifecycle actions', async ({ page }) => {
    await loginAsCEO(page);
    await page.goto('/client-requests');
    await page.getByTestId('client-requests-filter').selectOption('all');
    // req-3 is seeded as declined.
    await expect(page.getByTestId('client-request-status-req-3')).toHaveText('Declined');
    await expect(page.getByTestId('client-request-acknowledge-req-3')).toHaveCount(0);
    await expect(page.getByTestId('client-request-resolve-req-3')).toHaveCount(0);
    await expect(page.getByTestId('client-request-decline-req-3')).toHaveCount(0);
  });

  // CR-23 — Decision-required types are marked as such (not Review Centre approval)
  test('CR-23: decision-required request types are marked', async ({ page }) => {
    await loginAsCEO(page);
    await page.goto('/client-requests');
    // req-1 is a scheduling_change — a decision-required type.
    await expect(page.getByTestId('client-request-decision-req-1')).toBeVisible();
    // req-4 is a general_enquiry — no decision required.
    await expect(page.getByTestId('client-request-decision-req-4')).toHaveCount(0);
  });
});
