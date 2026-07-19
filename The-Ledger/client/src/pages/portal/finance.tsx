import { useState } from "react";
import { EmptyState } from "@/components/page-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ReceiptText, FileSignature, GitPullRequestArrow, Banknote, ArrowLeft, Download,
  CheckCircle2, AlertTriangle, Clock, Mail, Phone, ShieldCheck,
} from "lucide-react";
import type {
  ClientFinancialProjection, PortalInvoice, PortalQuote, PortalPayment, PortalBalanceHealth,
} from "@/lib/portalProjections";
import type { PortalBrandingConfig } from "@/lib/portalBranding";

const gbp = (v: number) =>
  new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format(v);

type FinanceTab = "overview" | "quotes" | "variations" | "invoices" | "payments";

const TABS: { key: FinanceTab; label: string }[] = [
  { key: "overview", label: "Overview" },
  { key: "quotes", label: "Quotes" },
  { key: "variations", label: "Variations" },
  { key: "invoices", label: "Invoices" },
  { key: "payments", label: "Payments" },
];

const HEALTH_META: Record<PortalBalanceHealth, { cls: string; icon: typeof CheckCircle2 }> = {
  Healthy: { cls: "bg-emerald-50 text-emerald-700 border-emerald-200", icon: CheckCircle2 },
  "Due Soon": { cls: "bg-amber-50 text-amber-700 border-amber-200", icon: Clock },
  Overdue: { cls: "bg-red-50 text-red-700 border-red-200", icon: AlertTriangle },
};

const INVOICE_STATUS_CLS: Record<PortalInvoice["status"], string> = {
  Paid: "bg-emerald-50 text-emerald-700 border-emerald-200",
  "Part Paid": "bg-blue-50 text-blue-700 border-blue-200",
  Issued: "bg-muted text-muted-foreground border-border",
  Overdue: "bg-red-50 text-red-700 border-red-200",
  Cancelled: "bg-muted text-muted-foreground border-border",
};

const QUOTE_STATUS_CLS: Record<PortalQuote["status"], string> = {
  Accepted: "bg-emerald-50 text-emerald-700 border-emerald-200",
  Sent: "bg-blue-50 text-blue-700 border-blue-200",
  Declined: "bg-red-50 text-red-700 border-red-200",
  Expired: "bg-muted text-muted-foreground border-border",
};

interface PortalFinanceProps {
  financials: ClientFinancialProjection;
  branding: PortalBrandingConfig;
  selectedInvoice: PortalInvoice | null;
  onOpenInvoice: (invoice: PortalInvoice) => void;
  onBack: () => void;
  onDownloadInvoice: (invoice: PortalInvoice) => void;
  onViewQuote: (quote: PortalQuote) => void;
  onViewPayments: () => void;
}

export function PortalFinance(props: PortalFinanceProps) {
  const { financials, branding, selectedInvoice, onOpenInvoice, onBack, onDownloadInvoice, onViewQuote, onViewPayments } = props;
  const [tab, setTab] = useState<FinanceTab>("overview");

  if (selectedInvoice) {
    return (
      <InvoiceDetail
        invoice={selectedInvoice}
        financials={financials}
        branding={branding}
        onBack={onBack}
        onDownload={onDownloadInvoice}
      />
    );
  }

  return (
    <div className="space-y-6" data-testid="portal-finance">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">Financial Centre</h1>
        <p className="text-muted-foreground mt-1">Your quotes, invoices and payment history.</p>
      </div>

      <div
        className="flex flex-wrap gap-2 border-b border-border pb-px"
        role="tablist"
        aria-label="Financial Centre sections"
        data-testid="portal-finance-tabs"
      >
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            role="tab"
            aria-selected={tab === t.key}
            aria-controls={`portal-finance-panel-${t.key}`}
            id={`portal-finance-tab-btn-${t.key}`}
            onClick={() => {
              setTab(t.key);
              if (t.key === "payments") onViewPayments();
            }}
            className={`px-3.5 py-2 text-sm font-medium rounded-t-md transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-500 focus-visible:ring-offset-1 ${
              tab === t.key
                ? "bg-card border border-b-white border-border text-foreground -mb-px"
                : "text-muted-foreground hover:text-foreground"
            }`}
            data-testid={`portal-finance-tab-${t.key}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div
        role="tabpanel"
        id={`portal-finance-panel-${tab}`}
        aria-labelledby={`portal-finance-tab-btn-${tab}`}
      >

        {tab === "overview" && <Overview financials={financials} branding={branding} onOpenInvoice={onOpenInvoice} />}
        {tab === "quotes" && <Quotes quotes={financials.quotes} onViewQuote={onViewQuote} />}
        {tab === "variations" && <Variations financials={financials} />}
        {tab === "invoices" && <Invoices invoices={financials.invoices} onOpenInvoice={onOpenInvoice} />}
        {tab === "payments" && <Payments payments={financials.payments} creditNotes={financials.creditNotes} />}
      </div>
    </div>
  );
}

function Overview({
  financials,
  branding,
  onOpenInvoice,
}: {
  financials: ClientFinancialProjection;
  branding: PortalBrandingConfig;
  onOpenInvoice: (i: PortalInvoice) => void;
}) {
  const kpis = [
    { key: "quoted", label: "Total Quoted", value: financials.totalQuoted, icon: FileSignature },
    { key: "approved", label: "Total Approved", value: financials.totalApproved, icon: CheckCircle2 },
    { key: "invoiced", label: "Total Invoiced", value: financials.totalInvoiced, icon: ReceiptText },
    { key: "paid", label: "Total Paid", value: financials.totalPaid, icon: Banknote },
    { key: "outstanding", label: "Outstanding Balance", value: financials.outstandingBalance, icon: Clock },
  ];
  const health = HEALTH_META[financials.health];
  const HealthIcon = health.icon;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3" data-testid="portal-finance-kpis">
        {kpis.map((k) => (
          <Card key={k.key} className="border-border" data-testid={`portal-fin-kpi-${k.key}`}>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-muted-foreground text-xs font-medium uppercase tracking-wider">
                <k.icon className="h-4 w-4" />
                <span className="truncate">{k.label}</span>
              </div>
              <div className="mt-2 text-2xl font-bold text-foreground" data-testid={`portal-fin-kpi-value-${k.key}`}>
                {gbp(k.value)}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Balance position */}
        <Card className="lg:col-span-2 border-border" data-testid="portal-balance-panel">
          <CardHeader className="pb-3 border-b border-border">
            <CardTitle className="text-lg">Account Position</CardTitle>
          </CardHeader>
          <CardContent className="pt-4 space-y-4">
            <div className={`flex items-start gap-3 rounded-lg border p-3 ${health.cls}`} data-testid="portal-balance-health">
              <HealthIcon className="h-5 w-5 mt-0.5 shrink-0" />
              <div>
                <div className="font-semibold text-sm" data-testid="portal-balance-health-label">{financials.health}</div>
                <div className="text-xs mt-0.5">
                  {financials.health === "Overdue"
                    ? "One or more invoices are past their due date."
                    : financials.health === "Due Soon"
                    ? "You have an invoice due within the next 14 days."
                    : "Your account is up to date. Thank you."}
                </div>
              </div>
            </div>

            <div className="grid sm:grid-cols-3 gap-4 text-sm">
              <div>
                <div className="text-xs text-muted-foreground uppercase tracking-wider">Total Outstanding</div>
                <div className="text-lg font-semibold text-foreground mt-1" data-testid="portal-total-outstanding">
                  {gbp(financials.outstandingBalance)}
                </div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground uppercase tracking-wider">Overdue Amount</div>
                <div
                  className={`text-lg font-semibold mt-1 ${financials.overdueAmount > 0 ? "text-red-600" : "text-foreground"}`}
                  data-testid="portal-overdue-amount"
                >
                  {gbp(financials.overdueAmount)}
                </div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground uppercase tracking-wider">Next Due</div>
                {financials.nextDueInvoice ? (
                  <button
                    className="text-left mt-1"
                    onClick={() => onOpenInvoice(financials.nextDueInvoice!)}
                    data-testid="portal-next-due-invoice"
                  >
                    <div className="text-sm font-semibold text-foreground underline">
                      {financials.nextDueInvoice.invoiceId}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {new Date(financials.nextDueInvoice.dueDate).toLocaleDateString()}
                    </div>
                  </button>
                ) : (
                  <div className="text-sm text-muted-foreground mt-1" data-testid="portal-next-due-none">None</div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Accounts contact — white-label */}
        <Card className="border-border" data-testid="portal-accounts-contact">
          <CardHeader className="pb-3 border-b border-border">
            <CardTitle className="text-lg flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-muted-foreground" /> Payment Contact
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4 space-y-3 text-sm">
            <div className="font-medium text-foreground" data-testid="portal-finance-company">{branding.companyName}</div>
            <div className="text-muted-foreground" data-testid="portal-payment-contact-name">{branding.paymentContactName}</div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
              <span data-testid="portal-accounts-email">{branding.accountsEmail}</span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Phone className="h-4 w-4 text-muted-foreground shrink-0" />
              <span data-testid="portal-payments-phone">{branding.paymentsPhone}</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Quotes({ quotes, onViewQuote }: { quotes: PortalQuote[]; onViewQuote: (q: PortalQuote) => void }) {
  if (quotes.length === 0) {
    return <EmptyState testId="portal-quotes-empty" icon={FileSignature} title="No quotes" body="Quotes issued to you will appear here." />;
  }
  return (
    <div className="space-y-3" data-testid="portal-quotes">
      {quotes.map((q) => (
        <Card key={q.id} className="border-border" data-testid={`portal-quote-${q.id}`}>
          <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-mono text-foreground">{q.quoteNumber}</span>
                <Badge variant="outline" className={QUOTE_STATUS_CLS[q.status]} data-testid={`portal-quote-status-${q.id}`}>
                  {q.status}
                </Badge>
              </div>
              <p className="text-sm text-foreground mt-1 font-medium truncate">{q.description}</p>
              <div className="mt-1 flex flex-wrap gap-x-4 text-[11px] text-muted-foreground">
                <span>{q.projectTitle}</span>
                <span>Issued {new Date(q.issueDate).toLocaleDateString()}</span>
                <span data-testid={`portal-quote-expiry-${q.id}`}>Expires {new Date(q.expiryDate).toLocaleDateString()}</span>
              </div>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <span className="text-lg font-semibold text-foreground" data-testid={`portal-quote-value-${q.id}`}>
                {gbp(q.totalValue)}
              </span>
              <Button variant="outline" size="sm" onClick={() => onViewQuote(q)} data-testid={`portal-quote-view-${q.id}`}>
                View
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function Variations({ financials }: { financials: ClientFinancialProjection }) {
  const { variations } = financials;
  if (variations.length === 0) {
    return <EmptyState testId="portal-variations-empty" icon={GitPullRequestArrow} title="No variations" body="Approved changes to your scope will appear here." />;
  }
  return (
    <div className="space-y-3" data-testid="portal-variations">
      {variations.map((v) => (
        <Card key={v.id} className="border-border" data-testid={`portal-variation-${v.id}`}>
          <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-mono text-foreground">{v.variationNumber}</span>
                <Badge
                  variant="outline"
                  className={v.status === "Approved" ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-red-50 text-red-700 border-red-200"}
                  data-testid={`portal-variation-status-${v.id}`}
                >
                  {v.status}
                </Badge>
              </div>
              <p className="text-sm text-foreground mt-1 font-medium">{v.description}</p>
              <div className="mt-1 flex flex-wrap gap-x-4 text-[11px] text-muted-foreground">
                <span>{v.projectTitle}</span>
                {v.approvalDate && <span>Decided {new Date(v.approvalDate).toLocaleDateString()}</span>}
              </div>
            </div>
            <span className="text-lg font-semibold text-foreground shrink-0" data-testid={`portal-variation-value-${v.id}`}>
              {gbp(v.value)}
            </span>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function Invoices({ invoices, onOpenInvoice }: { invoices: PortalInvoice[]; onOpenInvoice: (i: PortalInvoice) => void }) {
  if (invoices.length === 0) {
    return <EmptyState testId="portal-invoices-empty" icon={ReceiptText} title="No invoices" body="Your invoices will appear here once issued." />;
  }
  return (
    <div className="space-y-3" data-testid="portal-invoices">
      {invoices.map((inv) => (
        <Card key={inv.id} className="border-border" data-testid={`portal-invoice-${inv.id}`}>
          <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-mono text-foreground">{inv.invoiceId}</span>
                <Badge variant="outline" className={INVOICE_STATUS_CLS[inv.status]} data-testid={`portal-invoice-status-${inv.id}`}>
                  {inv.status}
                </Badge>
              </div>
              <div className="mt-1 flex flex-wrap gap-x-4 text-[11px] text-muted-foreground">
                {inv.projectTitle && <span data-testid={`portal-invoice-project-${inv.id}`}>{inv.projectTitle}</span>}
                <span>Issued {new Date(inv.issueDate).toLocaleDateString()}</span>
                <span data-testid={`portal-invoice-due-${inv.id}`}>Due {new Date(inv.dueDate).toLocaleDateString()}</span>
              </div>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <div className="text-right">
                <div className="text-lg font-semibold text-foreground" data-testid={`portal-invoice-total-${inv.id}`}>
                  {gbp(inv.total)}
                </div>
                {inv.amountOutstanding > 0 && inv.amountOutstanding !== inv.total && (
                  <div className="text-[11px] text-muted-foreground" data-testid={`portal-invoice-outstanding-${inv.id}`}>
                    {gbp(inv.amountOutstanding)} outstanding
                  </div>
                )}
              </div>
              <Button variant="outline" size="sm" onClick={() => onOpenInvoice(inv)} data-testid={`portal-invoice-view-${inv.id}`}>
                View
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function Payments({
  payments,
  creditNotes,
}: {
  payments: PortalPayment[];
  creditNotes: ClientFinancialProjection["creditNotes"];
}) {
  return (
    <div className="space-y-6" data-testid="portal-payments">
      <Card className="border-border">
        <CardHeader className="pb-3 border-b border-border">
          <CardTitle className="text-lg">Payment History</CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          {payments.length === 0 ? (
            <p className="text-sm text-muted-foreground italic" data-testid="portal-payments-empty">No payments recorded yet.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {payments.map((p) => (
                <li key={p.id} className="py-3 flex items-center justify-between gap-3" data-testid={`portal-payment-${p.id}`}>
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-foreground">{new Date(p.paymentDate).toLocaleDateString()}</div>
                    <div className="text-[11px] text-muted-foreground">
                      <span data-testid={`portal-payment-ref-${p.id}`}>{p.reference}</span> · {p.method} · Invoice{" "}
                      <span data-testid={`portal-payment-invoice-${p.id}`}>{p.invoiceNumber}</span>
                    </div>
                  </div>
                  <span className="text-sm font-semibold text-emerald-700 shrink-0" data-testid={`portal-payment-amount-${p.id}`}>
                    {gbp(p.amount)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {creditNotes.length > 0 && (
        <Card className="border-border" data-testid="portal-credit-notes">
          <CardHeader className="pb-3 border-b border-border">
            <CardTitle className="text-lg">Credit Notes</CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <ul className="divide-y divide-slate-100">
              {creditNotes.map((c) => (
                <li key={c.id} className="py-3 flex items-start justify-between gap-3" data-testid={`portal-credit-note-${c.id}`}>
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-foreground">{c.creditNoteNumber}</div>
                    <div className="text-[11px] text-muted-foreground">{c.reason}</div>
                    <div className="text-[11px] text-muted-foreground mt-0.5">
                      Against invoice {c.invoiceNumber} · {new Date(c.issueDate).toLocaleDateString()}
                    </div>
                  </div>
                  <span className="text-sm font-semibold text-foreground shrink-0">-{gbp(c.amount)}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function InvoiceDetail({
  invoice,
  financials,
  branding,
  onBack,
  onDownload,
}: {
  invoice: PortalInvoice;
  financials: ClientFinancialProjection;
  branding: PortalBrandingConfig;
  onBack: () => void;
  onDownload: (i: PortalInvoice) => void;
}) {
  const relatedPayments = financials.payments.filter((p) => p.invoiceId === invoice.id);
  const relatedVariations = financials.variations.filter(
    (v) => v.status === "Approved" && v.projectId === invoice.projectId
  );

  return (
    <div className="space-y-6" data-testid="portal-invoice-detail">
      <Button variant="ghost" size="sm" onClick={onBack} className="-ml-3 text-muted-foreground hover:text-foreground" data-testid="portal-invoice-back">
        <ArrowLeft className="h-4 w-4 mr-2" /> Back to Financial Centre
      </Button>

      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <Badge variant="outline" className={INVOICE_STATUS_CLS[invoice.status]} data-testid="portal-invoice-detail-status">
              {invoice.status}
            </Badge>
            <span className="text-sm font-mono text-muted-foreground">{invoice.invoiceId}</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Invoice {invoice.invoiceId}</h1>
          {invoice.projectTitle && <p className="text-muted-foreground text-sm mt-1">{invoice.projectTitle}</p>}
        </div>
        <Button variant="outline" onClick={() => onDownload(invoice)} data-testid="portal-invoice-download">
          <Download className="h-4 w-4 mr-2" /> Download
        </Button>
      </div>

      <Card className="border-border">
        <CardHeader className="pb-3 border-b border-border">
          <CardTitle className="text-lg">Invoice Summary</CardTitle>
        </CardHeader>
        <CardContent className="pt-4 grid sm:grid-cols-4 gap-4 text-sm">
          <Field label="Issue date" value={new Date(invoice.issueDate).toLocaleDateString()} />
          <Field label="Due date" value={new Date(invoice.dueDate).toLocaleDateString()} />
          <Field label="Total" value={gbp(invoice.total)} testid="portal-invoice-detail-total" />
          <Field label="Outstanding" value={gbp(invoice.amountOutstanding)} testid="portal-invoice-detail-outstanding" />
        </CardContent>
      </Card>

      <Card className="border-border" data-testid="portal-invoice-lines">
        <CardHeader className="pb-3 border-b border-border">
          <CardTitle className="text-lg">Line Items</CardTitle>
        </CardHeader>
        <CardContent className="pt-2 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wider text-muted-foreground">
                <th className="py-2 font-medium">Description</th>
                <th className="py-2 font-medium text-right">Qty</th>
                <th className="py-2 font-medium text-right">Unit price</th>
                <th className="py-2 font-medium text-right">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {invoice.lineItems.map((li, i) => (
                <tr key={i} data-testid={`portal-invoice-line-${i}`}>
                  <td className="py-2.5 text-foreground">{li.description}</td>
                  <td className="py-2.5 text-right text-muted-foreground">{li.qty}</td>
                  <td className="py-2.5 text-right text-muted-foreground">{gbp(li.unitPrice)}</td>
                  <td className="py-2.5 text-right font-medium text-foreground">{gbp(li.qty * li.unitPrice)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t border-border">
                <td colSpan={3} className="py-3 text-right font-semibold text-foreground">Total</td>
                <td className="py-3 text-right font-bold text-foreground">{gbp(invoice.total)}</td>
              </tr>
            </tfoot>
          </table>
        </CardContent>
      </Card>

      {relatedVariations.length > 0 && (
        <Card className="border-border" data-testid="portal-invoice-variations">
          <CardHeader className="pb-3 border-b border-border">
            <CardTitle className="text-lg">Approved Variations</CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <ul className="divide-y divide-slate-100">
              {relatedVariations.map((v) => (
                <li key={v.id} className="py-2.5 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-foreground">{v.variationNumber}</div>
                    <div className="text-[11px] text-muted-foreground truncate">{v.description}</div>
                  </div>
                  <span className="text-sm font-semibold text-foreground shrink-0">{gbp(v.value)}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      <Card className="border-border" data-testid="portal-invoice-payments">
        <CardHeader className="pb-3 border-b border-border">
          <CardTitle className="text-lg">Payment History</CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          {relatedPayments.length === 0 ? (
            <p className="text-sm text-muted-foreground italic" data-testid="portal-invoice-payments-empty">
              No payments recorded against this invoice.
            </p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {relatedPayments.map((p) => (
                <li key={p.id} className="py-2.5 flex items-center justify-between gap-3">
                  <div>
                    <div className="text-sm text-foreground">{new Date(p.paymentDate).toLocaleDateString()}</div>
                    <div className="text-[11px] text-muted-foreground">{p.reference} · {p.method}</div>
                  </div>
                  <span className="text-sm font-semibold text-emerald-700">{gbp(p.amount)}</span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <div className="text-xs text-muted-foreground" data-testid="portal-invoice-footer-contact">
        Questions about this invoice? Contact {branding.paymentContactName} at {branding.accountsEmail} or {branding.paymentsPhone}.
      </div>
    </div>
  );
}

function Field({ label, value, testid }: { label: string; value: string; testid?: string }) {
  return (
    <div>
      <div className="text-xs text-muted-foreground uppercase tracking-wider">{label}</div>
      <div className="text-foreground font-medium mt-1" data-testid={testid}>{value}</div>
    </div>
  );
}


