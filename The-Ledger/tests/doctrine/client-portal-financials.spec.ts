import { test, expect } from '@playwright/test';
import { gotoPortalClean, portalLoginAsActive, portalNavTo, PORTAL_ACCOUNTS } from '../helpers/portal';

// ──────────────────────────────────────────────────────────────────────────
// CL-6 — Financial Transparency
// Doctrine: CLIENT_PORTAL_DOMAIN.md § Financial Visibility
//
//   "The portal financial view is the client's commercial statement, not the
//    company's management accounts."
//
// The most doctrine-sensitive surface in the portal. These tests assert both
// halves of the contract: the client SEES their full commercial position, and
// NEVER sees cost, margin, profit, payroll, forecast, review, control,
// reconciliation, exception or accounting-sync data.
// ──────────────────────────────────────────────────────────────────────────

async function openFinance(page: import('@playwright/test').Page) {
  await portalNavTo(page, 'invoices');
  await expect(page.getByTestId('portal-finance')).toBeVisible();
}

async function openFinanceTab(page: import('@playwright/test').Page, tab: string) {
  await openFinance(page);
  await page.getByTestId(`portal-finance-tab-${tab}`).click();
}

test.describe('Portal Financials — KPIs & balance (CL-6)', () => {
  test.beforeEach(async ({ page }) => {
    await gotoPortalClean(page);
  });

  // CPF-01 — Financial Centre renders all KPI cards
  test('CPF-01: financial centre renders all KPI cards', async ({ page }) => {
    await portalLoginAsActive(page, PORTAL_ACCOUNTS.dc1Active);
    await openFinance(page);
    for (const k of ['quoted', 'approved', 'invoiced', 'paid', 'outstanding']) {
      await expect(page.getByTestId(`portal-fin-kpi-${k}`)).toBeVisible();
    }
  });

  // CPF-02 — KPI values are derived, not hardcoded
  test('CPF-02: KPI values are derived from client financial data', async ({ page }) => {
    await portalLoginAsActive(page, PORTAL_ACCOUNTS.dc1Active);
    await openFinance(page);
    // Visible quotes (Draft excluded): 8500 + 1200 + 2000 = 11,700
    await expect(page.getByTestId('portal-fin-kpi-value-quoted')).toHaveText('£11,700.00');
    // Accepted quotes (8500) + approved variations (1200) = 9,700
    await expect(page.getByTestId('portal-fin-kpi-value-approved')).toHaveText('£9,700.00');
    // Non-draft invoices: 6715 + 3000 + 2400 = 12,115
    await expect(page.getByTestId('portal-fin-kpi-value-invoiced')).toHaveText('£12,115.00');
    // Payments: 3000 + 2000 = 5,000
    await expect(page.getByTestId('portal-fin-kpi-value-paid')).toHaveText('£5,000.00');
    // Outstanding = 12,115 - 5,000 - 150 credit = 6,965
    await expect(page.getByTestId('portal-fin-kpi-value-outstanding')).toHaveText('£6,965.00');
  });

  // CPF-03 — Outstanding balance panel shows overdue + health indicator
  test('CPF-03: outstanding balance panel shows overdue amount and health', async ({ page }) => {
    await portalLoginAsActive(page, PORTAL_ACCOUNTS.dc1Active);
    await openFinance(page);
    await expect(page.getByTestId('portal-total-outstanding')).toHaveText('£6,965.00');
    // dinv-pma-1 is overdue with no payments → 2,400
    await expect(page.getByTestId('portal-overdue-amount')).toHaveText('£2,400.00');
    await expect(page.getByTestId('portal-balance-health-label')).toHaveText('Overdue');
  });

  // CPF-04 — Next due invoice is surfaced
  test('CPF-04: next due invoice is surfaced', async ({ page }) => {
    await portalLoginAsActive(page, PORTAL_ACCOUNTS.dc1Active);
    await openFinance(page);
    await expect(page.getByTestId('portal-next-due-invoice')).toBeVisible();
  });
});

test.describe('Portal Financials — Quotes (CL-6)', () => {
  test.beforeEach(async ({ page }) => {
    await gotoPortalClean(page);
  });

  // CPF-05 — Draft quotes are never visible
  test('CPF-05: draft quotes are never visible', async ({ page }) => {
    await portalLoginAsActive(page, PORTAL_ACCOUNTS.dc1Active);
    await openFinanceTab(page, 'quotes');
    // q-brm-1 is a Draft quote — must not appear.
    await expect(page.getByTestId('portal-quote-q-brm-1')).toHaveCount(0);
    await expect(page.getByTestId('portal-quotes')).not.toContainText('QUO-2026-0003');
  });

  // CPF-06 — Client-visible quote statuses render
  test('CPF-06: sent/accepted/declined quotes are visible with statuses', async ({ page }) => {
    await portalLoginAsActive(page, PORTAL_ACCOUNTS.dc1Active);
    await openFinanceTab(page, 'quotes');
    await expect(page.getByTestId('portal-quote-status-q-kex-1')).toHaveText('Accepted');
    await expect(page.getByTestId('portal-quote-status-q-mnt-1')).toHaveText('Sent');
    await expect(page.getByTestId('portal-quote-status-q-pma-1')).toHaveText('Declined');
    await expect(page.getByTestId('portal-quote-value-q-kex-1')).toHaveText('£8,500.00');
    await expect(page.getByTestId('portal-quote-expiry-q-kex-1')).toBeVisible();
  });

  // CPF-07 — Quotes are isolated per client
  test('CPF-07: quotes are isolated per client', async ({ page }) => {
    await portalLoginAsActive(page, PORTAL_ACCOUNTS.dc1Active);
    await openFinanceTab(page, 'quotes');
    // q-off-1 belongs to Showcase (dc2).
    await expect(page.getByTestId('portal-quote-q-off-1')).toHaveCount(0);
  });

  // CPF-08 — Client B sees only its own quote
  test('CPF-08: client B sees only its own quotes', async ({ page }) => {
    await portalLoginAsActive(page, PORTAL_ACCOUNTS.dc2Active);
    await openFinanceTab(page, 'quotes');
    await expect(page.getByTestId('portal-quote-q-off-1')).toBeVisible();
    await expect(page.getByTestId('portal-quote-q-kex-1')).toHaveCount(0);
  });

  // CPF-09 — Viewing a quote creates an audit event
  test('CPF-09: viewing a quote creates a client_viewed_quote audit event', async ({ page }) => {
    await portalLoginAsActive(page, PORTAL_ACCOUNTS.dc1Active);
    await openFinanceTab(page, 'quotes');
    const before = await page.evaluate(() => (window as any).__portalAudit.countByType('client_viewed_quote'));
    await page.getByTestId('portal-quote-view-q-kex-1').click();
    const after = await page.evaluate(() => (window as any).__portalAudit.countByType('client_viewed_quote'));
    expect(after).toBeGreaterThan(before);
  });
});

test.describe('Portal Financials — Variations (CL-6)', () => {
  test.beforeEach(async ({ page }) => {
    await gotoPortalClean(page);
  });

  // CPF-10 — Pending Approval variations are never visible
  test('CPF-10: pending approval variations are never visible', async ({ page }) => {
    await portalLoginAsActive(page, PORTAL_ACCOUNTS.dc1Active);
    await openFinanceTab(page, 'variations');
    // v-kex-2 is Pending Approval — internal only.
    await expect(page.getByTestId('portal-variation-v-kex-2')).toHaveCount(0);
    await expect(page.getByTestId('portal-variations')).not.toContainText('VAR-002');
  });

  // CPF-11 — Approved and rejected variations are visible
  test('CPF-11: approved and rejected variations are visible', async ({ page }) => {
    await portalLoginAsActive(page, PORTAL_ACCOUNTS.dc1Active);
    await openFinanceTab(page, 'variations');
    await expect(page.getByTestId('portal-variation-status-v-kex-1')).toHaveText('Approved');
    await expect(page.getByTestId('portal-variation-value-v-kex-1')).toHaveText('£1,200.00');
    await expect(page.getByTestId('portal-variation-status-v-mnt-1')).toHaveText('Rejected');
  });
});

test.describe('Portal Financials — Invoices (CL-6)', () => {
  test.beforeEach(async ({ page }) => {
    await gotoPortalClean(page);
  });

  // CPF-12 — Draft invoices are never visible
  test('CPF-12: draft invoices are never visible', async ({ page }) => {
    await portalLoginAsActive(page, PORTAL_ACCOUNTS.dc1Active);
    await openFinanceTab(page, 'invoices');
    // dinv-brm-1 is a Draft invoice.
    await expect(page.getByTestId('portal-invoice-dinv-brm-1')).toHaveCount(0);
    await expect(page.getByTestId('portal-invoices')).not.toContainText('EXB-2026-0010');
  });

  // CPF-13 — Derived client-facing invoice statuses render
  test('CPF-13: invoice statuses are derived from payments', async ({ page }) => {
    await portalLoginAsActive(page, PORTAL_ACCOUNTS.dc1Active);
    await openFinanceTab(page, 'invoices');
    // dinv-kex-1: £6,715 total, £2,000 paid → Part Paid
    await expect(page.getByTestId('portal-invoice-status-dinv-kex-1')).toHaveText('Part Paid');
    // dinv-kex-2: fully paid
    await expect(page.getByTestId('portal-invoice-status-dinv-kex-2')).toHaveText('Paid');
    // dinv-pma-1: overdue, unpaid
    await expect(page.getByTestId('portal-invoice-status-dinv-pma-1')).toHaveText('Overdue');
  });

  // CPF-14 — Invoice detail renders summary, lines and payment history
  test('CPF-14: invoice detail renders summary, line items and payments', async ({ page }) => {
    await portalLoginAsActive(page, PORTAL_ACCOUNTS.dc1Active);
    await openFinanceTab(page, 'invoices');
    await page.getByTestId('portal-invoice-view-dinv-kex-1').click();
    await expect(page.getByTestId('portal-invoice-detail')).toBeVisible();
    await expect(page.getByTestId('portal-invoice-detail-total')).toHaveText('£6,715.00');
    await expect(page.getByTestId('portal-invoice-lines')).toBeVisible();
    await expect(page.locator('[data-testid^="portal-invoice-line-"]').first()).toBeVisible();
    // £6,715 - £2,000 paid = £4,715 outstanding
    await expect(page.getByTestId('portal-invoice-detail-outstanding')).toHaveText('£4,715.00');
    await expect(page.getByTestId('portal-invoice-payments')).toBeVisible();
  });

  // CPF-15 — Downloading an invoice creates an audit event
  test('CPF-15: downloading an invoice creates a client_downloaded_invoice audit event', async ({ page }) => {
    await portalLoginAsActive(page, PORTAL_ACCOUNTS.dc1Active);
    await openFinanceTab(page, 'invoices');
    await page.getByTestId('portal-invoice-view-dinv-kex-1').click();
    await expect(page.getByTestId('portal-invoice-detail')).toBeVisible();
    const before = await page.evaluate(() => (window as any).__portalAudit.countByType('client_downloaded_invoice'));
    await page.getByTestId('portal-invoice-download').click();
    const after = await page.evaluate(() => (window as any).__portalAudit.countByType('client_downloaded_invoice'));
    expect(after).toBeGreaterThan(before);
  });

  // CPF-16 — Viewing an invoice creates an audit event
  test('CPF-16: viewing an invoice creates a client_viewed_invoice audit event', async ({ page }) => {
    await portalLoginAsActive(page, PORTAL_ACCOUNTS.dc1Active);
    await openFinanceTab(page, 'invoices');
    const before = await page.evaluate(() => (window as any).__portalAudit.countByType('client_viewed_invoice'));
    await page.getByTestId('portal-invoice-view-dinv-kex-1').click();
    await expect(page.getByTestId('portal-invoice-detail')).toBeVisible();
    const after = await page.evaluate(() => (window as any).__portalAudit.countByType('client_viewed_invoice'));
    expect(after).toBeGreaterThan(before);
  });
});

test.describe('Portal Financials — Payments (CL-6)', () => {
  test.beforeEach(async ({ page }) => {
    await gotoPortalClean(page);
  });

  // CPF-17 — Payment history renders with reference and invoice
  test('CPF-17: payment history renders date, amount, reference and invoice', async ({ page }) => {
    await portalLoginAsActive(page, PORTAL_ACCOUNTS.dc1Active);
    await openFinanceTab(page, 'payments');
    await expect(page.getByTestId('portal-payment-pay-1')).toBeVisible();
    await expect(page.getByTestId('portal-payment-amount-pay-1')).toHaveText('£3,000.00');
    await expect(page.getByTestId('portal-payment-ref-pay-1')).toHaveText('BACS-99120');
    await expect(page.getByTestId('portal-payment-invoice-pay-1')).toHaveText('EXB-2026-0005');
  });

  // CPF-18 — Payments are isolated per client
  test('CPF-18: payments are isolated per client', async ({ page }) => {
    await portalLoginAsActive(page, PORTAL_ACCOUNTS.dc2Active);
    await openFinanceTab(page, 'payments');
    await expect(page.getByTestId('portal-payment-pay-1')).toHaveCount(0);
    await expect(page.getByTestId('portal-payments-empty')).toBeVisible();
  });
});

test.describe('Portal Financials — Projection layer doctrine (CL-6)', () => {
  test.beforeEach(async ({ page }) => {
    await gotoPortalClean(page);
  });

  // CPF-19 — Internal cost / margin / payroll terms are never rendered
  test('CPF-19: internal cost, margin and payroll data is never exposed', async ({ page }) => {
    await portalLoginAsActive(page, PORTAL_ACCOUNTS.dc1Active);
    await openFinance(page);
    const finance = page.getByTestId('portal-finance');
    await expect(finance).not.toContainText(/margin/i);
    await expect(finance).not.toContainText(/gross profit/i);
    await expect(finance).not.toContainText(/net profit/i);
    await expect(finance).not.toContainText(/payroll/i);
    await expect(finance).not.toContainText(/forecast/i);
    await expect(finance).not.toContainText(/cost breakdown/i);
  });

  // CPF-20 — Accounting sync / reconciliation / controls are never rendered
  test('CPF-20: accounting sync and internal controls are never exposed', async ({ page }) => {
    await portalLoginAsActive(page, PORTAL_ACCOUNTS.dc1Active);
    await openFinanceTab(page, 'invoices');
    await page.getByTestId('portal-invoice-view-dinv-kex-1').click();
    const detail = page.getByTestId('portal-invoice-detail');
    await expect(detail).not.toContainText(/quickbooks/i);
    await expect(detail).not.toContainText(/reconcil/i);
    await expect(detail).not.toContainText(/exception/i);
    await expect(detail).not.toContainText(/review centre/i);
    await expect(detail).not.toContainText(/financial control/i);
    // "Exported" is an internal accounting-sync state and must never surface.
    await expect(detail).not.toContainText(/exported/i);
  });

  // CPF-21 — Financial pages carry white-label payment contact details
  test('CPF-21: financial pages display branded payment contact details', async ({ page }) => {
    await portalLoginAsActive(page, PORTAL_ACCOUNTS.dc1Active);
    await openFinance(page);
    await expect(page.getByTestId('portal-accounts-contact')).toBeVisible();
    await expect(page.getByTestId('portal-accounts-email')).toContainText('@');
    await expect(page.getByTestId('portal-payments-phone')).toBeVisible();
    await expect(page.getByTestId('portal-payment-contact-name')).toBeVisible();
  });
});
