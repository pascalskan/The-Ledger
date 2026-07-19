import { test, expect } from '@playwright/test';
import { gotoPortalClean, portalLoginAsActive, portalNavTo, PORTAL_ACCOUNTS } from '../helpers/portal';

// ──────────────────────────────────────────────────────────────────────────
// CL-5 — Communication Centre
// Doctrine: CLIENT_PORTAL_DOMAIN.md / CLIENT_REQUEST_DOMAIN.md
//
// Structured, traceable project communication. These threads are NOT formal
// Client Requests (that is CL-7) — nothing here approves, creates a financial
// record, or enters the Review Centre.
//
// Covers: thread scoping, message scoping, statuses, chronological history,
// thread creation, closed-thread behaviour, and audit.
// ──────────────────────────────────────────────────────────────────────────

test.describe('Portal Communication — thread visibility (CL-5)', () => {
  test.beforeEach(async ({ page }) => {
    await gotoPortalClean(page);
  });

  // CPC-01 — Thread list renders the client's own threads
  test('CPC-01: communication centre lists the client threads', async ({ page }) => {
    await portalLoginAsActive(page, PORTAL_ACCOUNTS.dc1Active);
    await portalNavTo(page, 'messages');
    await expect(page.getByTestId('portal-messages')).toBeVisible();
    await expect(page.getByTestId('portal-thread-th-kex-1')).toBeVisible();
    await expect(page.getByTestId('portal-thread-th-mnt-1')).toBeVisible();
  });

  // CPC-02 — Threads are scoped to the signed-in client
  test('CPC-02: threads are scoped to the signed-in client', async ({ page }) => {
    await portalLoginAsActive(page, PORTAL_ACCOUNTS.dc1Active);
    await portalNavTo(page, 'messages');
    // th-off-1 belongs to Showcase (dc2) — never visible to HSS.
    await expect(page.getByTestId('portal-thread-th-off-1')).toHaveCount(0);
  });

  // CPC-03 — Client B sees only its own thread
  test('CPC-03: client B sees only its own threads', async ({ page }) => {
    await portalLoginAsActive(page, PORTAL_ACCOUNTS.dc2Active);
    await portalNavTo(page, 'messages');
    await expect(page.getByTestId('portal-thread-th-off-1')).toBeVisible();
    await expect(page.getByTestId('portal-thread-th-kex-1')).toHaveCount(0);
    await expect(page.getByTestId('portal-thread-th-mnt-1')).toHaveCount(0);
  });

  // CPC-04 — Thread statuses render
  test('CPC-04: thread statuses render in the list', async ({ page }) => {
    await portalLoginAsActive(page, PORTAL_ACCOUNTS.dc1Active);
    await portalNavTo(page, 'messages');
    await expect(page.getByTestId('portal-thread-status-th-kex-1')).toHaveText('Closed');
    await expect(page.getByTestId('portal-thread-status-th-mnt-1')).toHaveText('Awaiting Response');
  });
});

test.describe('Portal Communication — thread detail (CL-5)', () => {
  test.beforeEach(async ({ page }) => {
    await gotoPortalClean(page);
  });

  // CPC-05 — Thread detail shows the message history chronologically
  test('CPC-05: thread detail renders chronological message history', async ({ page }) => {
    await portalLoginAsActive(page, PORTAL_ACCOUNTS.dc1Active);
    await portalNavTo(page, 'messages');
    await page.getByTestId('portal-thread-th-kex-1').click();
    await expect(page.getByTestId('portal-thread-detail')).toBeVisible();
    await expect(page.getByTestId('portal-thread-detail-subject')).toContainText('Commissioning certificate');

    const messages = page.locator('[data-testid^="portal-message-msg-"]');
    await expect(messages).toHaveCount(3);
    // Oldest first: client question → PM reply → system close.
    await expect(messages.nth(0)).toContainText('copy of the commissioning certificate');
    await expect(messages.nth(2)).toContainText('Thread closed');
  });

  // CPC-06 — Messages are scoped to their own thread
  test('CPC-06: messages are scoped to their thread', async ({ page }) => {
    await portalLoginAsActive(page, PORTAL_ACCOUNTS.dc1Active);
    await portalNavTo(page, 'messages');
    await page.getByTestId('portal-thread-th-mnt-1').click();
    await expect(page.getByTestId('portal-thread-detail')).toBeVisible();
    // th-mnt-1 has 2 messages; none of th-kex-1's messages may appear.
    await expect(page.locator('[data-testid^="portal-message-msg-"]')).toHaveCount(2);
    await expect(page.getByTestId('portal-message-msg-kex-1-1')).toHaveCount(0);
  });

  // CPC-07 — Sender attribution renders (Client / PM / System)
  test('CPC-07: message sender attribution renders', async ({ page }) => {
    await portalLoginAsActive(page, PORTAL_ACCOUNTS.dc1Active);
    await portalNavTo(page, 'messages');
    await page.getByTestId('portal-thread-th-kex-1').click();
    await expect(page.getByTestId('portal-message-sender-msg-kex-1-2')).toHaveText('Project Manager');
    await expect(page.getByTestId('portal-message-sender-msg-kex-1-3')).toHaveText('System');
  });

  // CPC-08 — Closed threads cannot be replied to
  test('CPC-08: closed threads expose no reply control', async ({ page }) => {
    await portalLoginAsActive(page, PORTAL_ACCOUNTS.dc1Active);
    await portalNavTo(page, 'messages');
    await page.getByTestId('portal-thread-th-kex-1').click();
    await expect(page.getByTestId('portal-thread-closed-note')).toBeVisible();
    await expect(page.getByTestId('portal-thread-reply')).toHaveCount(0);
  });
});

test.describe('Portal Communication — thread creation & audit (CL-5)', () => {
  test.beforeEach(async ({ page }) => {
    await gotoPortalClean(page);
  });

  // CPC-09 — Client can create a new thread
  test('CPC-09: client can create a new conversation', async ({ page }) => {
    await portalLoginAsActive(page, PORTAL_ACCOUNTS.dc1Active);
    await portalNavTo(page, 'messages');
    await page.getByTestId('portal-thread-new').click();
    await expect(page.getByTestId('portal-thread-compose')).toBeVisible();
    await page.getByTestId('portal-thread-subject').fill('Parking arrangements for next visit');
    await page.getByTestId('portal-thread-message').fill('Where should the crew park on arrival?');
    await page.getByTestId('portal-thread-submit').click();
    await expect(page.getByTestId('portal-thread-list')).toContainText('Parking arrangements for next visit');
  });

  // CPC-10 — Incomplete new-thread submissions are rejected
  test('CPC-10: new conversation requires subject and message', async ({ page }) => {
    await portalLoginAsActive(page, PORTAL_ACCOUNTS.dc1Active);
    await portalNavTo(page, 'messages');
    await page.getByTestId('portal-thread-new').click();
    await page.getByTestId('portal-thread-submit').click();
    await expect(page.getByTestId('portal-thread-error')).toBeVisible();
  });

  // CPC-11 — Creating a thread records an audit event
  test('CPC-11: creating a thread records a client_created_thread audit event', async ({ page }) => {
    await portalLoginAsActive(page, PORTAL_ACCOUNTS.dc1Active);
    await portalNavTo(page, 'messages');
    const before = await page.evaluate(() => (window as any).__portalAudit.countByType('client_created_thread'));
    await page.getByTestId('portal-thread-new').click();
    await page.getByTestId('portal-thread-subject').fill('Site induction paperwork');
    await page.getByTestId('portal-thread-message').fill('Could you confirm the induction requirements?');
    await page.getByTestId('portal-thread-submit').click();
    const after = await page.evaluate(() => (window as any).__portalAudit.countByType('client_created_thread'));
    expect(after).toBeGreaterThan(before);
  });

  // CPC-12 — Viewing a thread records an audit event
  test('CPC-12: viewing a thread records a client_viewed_thread audit event', async ({ page }) => {
    await portalLoginAsActive(page, PORTAL_ACCOUNTS.dc1Active);
    await portalNavTo(page, 'messages');
    const before = await page.evaluate(() => (window as any).__portalAudit.countByType('client_viewed_thread'));
    await page.getByTestId('portal-thread-th-mnt-1').click();
    await expect(page.getByTestId('portal-thread-detail')).toBeVisible();
    const after = await page.evaluate(() => (window as any).__portalAudit.countByType('client_viewed_thread'));
    expect(after).toBeGreaterThan(before);
  });

  // CPC-13 — Replying moves the thread to Awaiting Response
  test('CPC-13: replying to an open thread updates its status', async ({ page }) => {
    await portalLoginAsActive(page, PORTAL_ACCOUNTS.dc2Active);
    await portalNavTo(page, 'messages');
    await page.getByTestId('portal-thread-th-off-1').click();
    await page.getByTestId('portal-thread-reply').fill('Matte white would be our preference.');
    await page.getByTestId('portal-thread-reply-send').click();
    await expect(page.getByTestId('portal-thread-detail-status')).toHaveText('Awaiting Response');
  });
});
