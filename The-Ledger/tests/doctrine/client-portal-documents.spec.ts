import { test, expect } from '@playwright/test';
import { gotoPortalClean, portalLoginAsActive, portalNavTo, PORTAL_ACCOUNTS } from '../helpers/portal';
import { loginAsCEO, loginAsPM } from '../helpers/login';
import { clearBrowserState } from '../helpers/state';

// ──────────────────────────────────────────────────────────────────────────
// CL-5 — Documents & sharing controls
// Doctrine: CLIENT_PORTAL_DOMAIN.md § Document Visibility
//
//   "Documents must be explicitly shared with the client by a PM or CEO."
//
// Covers: shared documents visible, revoked hidden, internal never exposed,
// per-client scoping, filters/search, PM & CEO sharing controls, and audit.
// ──────────────────────────────────────────────────────────────────────────

test.describe('Portal Documents — client visibility (CL-5)', () => {
  test.beforeEach(async ({ page }) => {
    await gotoPortalClean(page);
  });

  // CPD-01 — Shared documents are visible
  test('CPD-01: documents shared with the client are visible', async ({ page }) => {
    await portalLoginAsActive(page, PORTAL_ACCOUNTS.dc1Active);
    await portalNavTo(page, 'documents');
    await expect(page.getByTestId('portal-documents')).toBeVisible();
    await expect(page.getByTestId('portal-document-sd-kex-1')).toBeVisible();
  });

  // CPD-02 — Revoked documents are hidden
  test('CPD-02: revoked documents are never visible', async ({ page }) => {
    await portalLoginAsActive(page, PORTAL_ACCOUNTS.dc1Active);
    await portalNavTo(page, 'documents');
    // sd-kex-5 is seeded with visibilityStatus "Revoked".
    await expect(page.getByTestId('portal-document-sd-kex-5')).toHaveCount(0);
    await expect(page.getByTestId('portal-documents')).not.toContainText('Superseded Layout');
  });

  // CPD-03 — Internal (unshared) job documents are never exposed
  test('CPD-03: internal job documents are never exposed', async ({ page }) => {
    await portalLoginAsActive(page, PORTAL_ACCOUNTS.dc1Active);
    await portalNavTo(page, 'documents');
    // dd-kex-1 "Site_Survey_Photos.zip" is an internal job document that was
    // never shared — it must not appear anywhere in the portal.
    await expect(page.getByTestId('portal-documents')).not.toContainText('Site_Survey_Photos');
    // Only the 5 documents explicitly shared with dc1 are listed.
    await expect(page.locator('[data-testid^="portal-document-sd-"]')).toHaveCount(5);
  });

  // CPD-04 — Cross-client isolation
  test('CPD-04: documents are scoped to the signed-in client', async ({ page }) => {
    await portalLoginAsActive(page, PORTAL_ACCOUNTS.dc1Active);
    await portalNavTo(page, 'documents');
    await expect(page.getByTestId('portal-document-sd-off-1')).toHaveCount(0);
  });

  // CPD-05 — Client B sees only its own document
  test('CPD-05: client B sees only its own documents', async ({ page }) => {
    await portalLoginAsActive(page, PORTAL_ACCOUNTS.dc2Active);
    await portalNavTo(page, 'documents');
    await expect(page.getByTestId('portal-document-sd-off-1')).toBeVisible();
    await expect(page.getByTestId('portal-document-sd-kex-1')).toHaveCount(0);
  });

  // CPD-06 — Document metadata is rendered
  test('CPD-06: document metadata (category, shared date, shared by) renders', async ({ page }) => {
    await portalLoginAsActive(page, PORTAL_ACCOUNTS.dc1Active);
    await portalNavTo(page, 'documents');
    await expect(page.getByTestId('portal-document-category-sd-kex-2')).toHaveText('Certificates');
    await expect(page.getByTestId('portal-document-shared-sd-kex-1')).toContainText('Shared');
    await expect(page.getByTestId('portal-document-sharedby-sd-kex-1')).toContainText('by');
  });

  // CPD-07 — Category filter narrows the list
  test('CPD-07: category filter narrows the document list', async ({ page }) => {
    await portalLoginAsActive(page, PORTAL_ACCOUNTS.dc1Active);
    await portalNavTo(page, 'documents');
    await page.getByTestId('portal-documents-filter-certificate').click();
    await expect(page.getByTestId('portal-document-sd-kex-2')).toBeVisible();
    await expect(page.getByTestId('portal-document-sd-kex-1')).toHaveCount(0);
  });

  // CPD-08 — Search narrows the list
  test('CPD-08: search narrows the document list', async ({ page }) => {
    await portalLoginAsActive(page, PORTAL_ACCOUNTS.dc1Active);
    await portalNavTo(page, 'documents');
    await page.getByTestId('portal-documents-search').fill('Commissioning');
    await expect(page.getByTestId('portal-document-sd-kex-2')).toBeVisible();
    await expect(page.getByTestId('portal-document-sd-kex-3')).toHaveCount(0);
  });

  // CPD-09 — Viewing a document creates an audit event
  test('CPD-09: viewing a document creates a client_viewed_document audit event', async ({ page }) => {
    await portalLoginAsActive(page, PORTAL_ACCOUNTS.dc1Active);
    await portalNavTo(page, 'documents');
    const before = await page.evaluate(() => (window as any).__portalAudit.countByType('client_viewed_document'));
    await page.getByTestId('portal-document-view-sd-kex-1').click();
    const after = await page.evaluate(() => (window as any).__portalAudit.countByType('client_viewed_document'));
    expect(after).toBeGreaterThan(before);
  });
});

test.describe('Portal Documents — internal sharing controls (CL-5)', () => {
  test.beforeEach(async ({ page }) => {
    await clearBrowserState(page);
  });

  // CPD-10 — PM can share a document with the client
  test('CPD-10: PM can share a job document with the client', async ({ page }) => {
    await loginAsPM(page);
    await page.goto('/jobs/dj-kitchen-extract-1');
    await expect(page.getByTestId('pm-workspace-documents')).toBeVisible();
    await page.getByTestId('button-job-doc-share-dd-kex-1').click();
    await expect(page.getByTestId('pm-client-shared-documents')).toContainText('Site_Survey_Photos');
  });

  // CPD-11 — CEO can share a document with the client
  test('CPD-11: CEO can share a job document with the client', async ({ page }) => {
    await loginAsCEO(page);
    await page.goto('/jobs/dj-kitchen-extract-1');
    await page.getByTestId('button-job-doc-share-dd-kex-1').click();
    await expect(page.getByTestId('pm-client-shared-documents')).toContainText('Site_Survey_Photos');
  });

  // CPD-12 — Revoking access is enforced and reflected in status
  test('CPD-12: revoking client access updates the document status', async ({ page }) => {
    await loginAsPM(page);
    await page.goto('/jobs/dj-kitchen-extract-1');
    await expect(page.getByTestId('pm-client-doc-status-sd-kex-1')).toHaveText('Shared');
    await page.getByTestId('button-client-doc-revoke-sd-kex-1').click();
    await expect(page.getByTestId('pm-client-doc-status-sd-kex-1')).toHaveText('Revoked');
  });

  // CPD-13 — Sharing creates an audit event
  test('CPD-13: sharing a document creates a document_shared_with_client audit event', async ({ page }) => {
    await loginAsPM(page);
    await page.goto('/jobs/dj-kitchen-extract-1');
    const before = await page.evaluate(() => (window as any).__portalAudit.countByType('document_shared_with_client'));
    await page.getByTestId('button-job-doc-share-dd-kex-1').click();
    const after = await page.evaluate(() => (window as any).__portalAudit.countByType('document_shared_with_client'));
    expect(after).toBeGreaterThan(before);
  });

  // CPD-14 — Revoking creates an audit event
  test('CPD-14: revoking access creates a document_access_revoked audit event', async ({ page }) => {
    await loginAsPM(page);
    await page.goto('/jobs/dj-kitchen-extract-1');
    const before = await page.evaluate(() => (window as any).__portalAudit.countByType('document_access_revoked'));
    await page.getByTestId('button-client-doc-revoke-sd-kex-1').click();
    const after = await page.evaluate(() => (window as any).__portalAudit.countByType('document_access_revoked'));
    expect(after).toBeGreaterThan(before);
  });
});
