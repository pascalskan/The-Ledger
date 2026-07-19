// ---------------------------------------------------------------------------
// CLIENT PORTAL — CLIENT-FACING FINANCIAL MODELS (CL-6)
//
// Doctrine: CLIENT_PORTAL_DOMAIN.md § Financial Visibility
//
//   "Clients have a legitimate commercial interest in their invoices and
//    payment status. They do not have a legitimate interest in the company's
//    internal cost structure, margins, or labour rates. The portal financial
//    view is the client's COMMERCIAL STATEMENT, not the company's management
//    accounts."
//
// Everything in this module is, by construction, a commercial artefact that
// the client is a party to: quotes issued to them, variations they approved,
// credit notes raised for them, payments they made.
//
// This module contains NO cost, margin, profit, payroll, forecast, estimate,
// review, control, reconciliation, exception or accounting-sync data. Those
// concepts are not represented here at all, which is what makes them
// structurally unreachable from the portal.
//
// Mock infrastructure only — no backend.
// ---------------------------------------------------------------------------

export type ClientQuoteStatus = "Draft" | "Sent" | "Accepted" | "Declined" | "Expired";

/** Quote statuses a client may see. Draft is an internal working state. */
export const CLIENT_VISIBLE_QUOTE_STATUSES: ClientQuoteStatus[] = [
  "Sent",
  "Accepted",
  "Declined",
  "Expired",
];

export interface ClientQuote {
  id: string;
  quoteNumber: string;
  projectId: string;
  description: string;
  issueDate: string;
  expiryDate: string;
  status: ClientQuoteStatus;
  totalValue: number;
}

export type ClientVariationStatus = "Pending Approval" | "Approved" | "Rejected";

/** Variation statuses a client may see. Pending Approval is internal. */
export const CLIENT_VISIBLE_VARIATION_STATUSES: ClientVariationStatus[] = ["Approved", "Rejected"];

export interface ClientVariation {
  id: string;
  variationNumber: string;
  projectId: string;
  description: string;
  value: number;
  status: ClientVariationStatus;
  approvalDate?: string;
}

export interface ClientCreditNote {
  id: string;
  creditNoteNumber: string;
  projectId: string;
  /** Internal invoice id this credit note is raised against. */
  invoiceId: string;
  issueDate: string;
  amount: number;
  reason: string;
}

export interface ClientPayment {
  id: string;
  projectId: string;
  invoiceId: string;
  paymentDate: string;
  amount: number;
  reference: string;
  method: string;
}

const days = (n: number) => new Date(Date.now() + n * 86400000).toISOString();

// ── Seed: quotes ────────────────────────────────────────────────────────────
const quotes: ClientQuote[] = [
  {
    id: "q-kex-1",
    quoteNumber: "QUO-2026-0001",
    projectId: "dj-kitchen-extract-1",
    description: "Kitchen extract canopy and ductwork installation.",
    issueDate: days(-25),
    expiryDate: days(-10),
    status: "Accepted",
    totalValue: 8500,
  },
  {
    id: "q-mnt-1",
    quoteNumber: "QUO-2026-0002",
    projectId: "dj-showcase-maint-1",
    description: "Annual preventative maintenance visit.",
    issueDate: days(-5),
    expiryDate: days(25),
    status: "Sent",
    totalValue: 1200,
  },
  {
    // Draft fixture — must NEVER be visible in the portal.
    id: "q-brm-1",
    quoteNumber: "QUO-2026-0003",
    projectId: "dj-boiler-room-2",
    description: "Boiler room works — internal draft, not yet issued.",
    issueDate: days(-1),
    expiryDate: days(29),
    status: "Draft",
    totalValue: 4000,
  },
  {
    id: "q-pma-1",
    quoteNumber: "QUO-2026-0004",
    projectId: "dj-pm-active-1",
    description: "Additional plant room remedial works.",
    issueDate: days(-18),
    expiryDate: days(-3),
    status: "Declined",
    totalValue: 2000,
  },
  // dc2 isolation fixture
  {
    id: "q-off-1",
    quoteNumber: "QUO-2026-0005",
    projectId: "dj-office-fit-1",
    description: "Second floor partition installation.",
    issueDate: days(-6),
    expiryDate: days(24),
    status: "Sent",
    totalValue: 15000,
  },
];

// ── Seed: variations ────────────────────────────────────────────────────────
const variations: ClientVariation[] = [
  {
    id: "v-kex-1",
    variationNumber: "VAR-001",
    projectId: "dj-kitchen-extract-1",
    description: "Additional fire damper to secondary duct run.",
    value: 1200,
    status: "Approved",
    approvalDate: days(-12),
  },
  {
    // Pending fixture — must NEVER be visible in the portal.
    id: "v-kex-2",
    variationNumber: "VAR-002",
    projectId: "dj-kitchen-extract-1",
    description: "Proposed access hatch relocation — awaiting internal approval.",
    value: 800,
    status: "Pending Approval",
  },
  {
    id: "v-mnt-1",
    variationNumber: "VAR-003",
    projectId: "dj-showcase-maint-1",
    description: "Out-of-hours attendance uplift.",
    value: 350,
    status: "Rejected",
    approvalDate: days(-2),
  },
  // dc2 isolation fixture
  {
    id: "v-off-1",
    variationNumber: "VAR-004",
    projectId: "dj-office-fit-1",
    description: "Upgraded acoustic partition specification.",
    value: 2000,
    status: "Approved",
    approvalDate: days(-1),
  },
];

// ── Seed: credit notes ──────────────────────────────────────────────────────
const creditNotes: ClientCreditNote[] = [
  {
    id: "cn-1",
    creditNoteNumber: "CN-2026-0001",
    projectId: "dj-kitchen-extract-1",
    invoiceId: "dinv-kex-2",
    issueDate: days(-15),
    amount: 150,
    reason: "Goodwill adjustment for delayed access on day one.",
  },
];

// ── Seed: payments ──────────────────────────────────────────────────────────
const payments: ClientPayment[] = [
  {
    id: "pay-1",
    projectId: "dj-kitchen-extract-1",
    invoiceId: "dinv-kex-2",
    paymentDate: days(-28),
    amount: 3000,
    reference: "BACS-99120",
    method: "Bank transfer",
  },
  {
    id: "pay-2",
    projectId: "dj-kitchen-extract-1",
    invoiceId: "dinv-kex-1",
    paymentDate: days(-3),
    amount: 2000,
    reference: "BACS-99340",
    method: "Bank transfer",
  },
];

// ── Accessors (scoped to the client's visible projects) ─────────────────────

export function getQuotesForProjects(projectIds: string[]): ClientQuote[] {
  return quotes.filter((q) => projectIds.includes(q.projectId));
}

export function getVariationsForProjects(projectIds: string[]): ClientVariation[] {
  return variations.filter((v) => projectIds.includes(v.projectId));
}

export function getCreditNotesForProjects(projectIds: string[]): ClientCreditNote[] {
  return creditNotes.filter((c) => projectIds.includes(c.projectId));
}

export function getPaymentsForProjects(projectIds: string[]): ClientPayment[] {
  return payments.filter((p) => projectIds.includes(p.projectId));
}

export function getPaymentsForInvoice(invoiceId: string): ClientPayment[] {
  return payments.filter((p) => p.invoiceId === invoiceId);
}

export function getCreditNotesForInvoice(invoiceId: string): ClientCreditNote[] {
  return creditNotes.filter((c) => c.invoiceId === invoiceId);
}
