// ======================================================
// PHASE 5.3 — INVOICE DRAFT MODEL
//
// InvoiceDraft is the normalized invoice document generated
// deterministically from approved InvoiceLineItem records.
//
// Doctrine:
//   Approved Operational Activity
//   → Financial Normalization
//   → InvoiceLineItems
//   → Invoice Drafts
//   → Invoice Workflow
//
// Never: Job → Invoice directly.
// ======================================================

export type InvoiceStatus =
  | "draft"
  | "ready"
  | "sent"
  | "paid";

export interface InvoiceDraft {
  id: string;

  invoiceNumber: string;

  jobId: string;
  clientId: string;

  lineItems: InvoiceDraftLineItem[];

  subtotal: number;

  taxRate: number;   // e.g. 0.20 for 20% VAT — placeholder, default 0
  taxAmount: number;

  total: number;

  status: InvoiceStatus;

  createdAt: string;
  updatedAt: string;
}

/**
 * A line item inside an InvoiceDraft.
 * Mirrors InvoiceLineItem shape but is part of the draft document,
 * not the raw approval-generated record.
 */
export interface InvoiceDraftLineItem {
  id: string;          // references the source InvoiceLineItem.id
  type: "labor" | "material" | "equipment" | "expense";
  description: string;
  quantity: number;
  unitPrice: number;
  amount: number;
}

// ======================================================
// INVOICE STATUS TRANSITION RULES (enforced by invoiceBuilder.ts)
//
//   draft  → ready   ✓
//   ready  → sent    ✓
//   sent   → paid    ✓
//
//   draft  → sent    ✗  (must go via ready)
//   draft  → paid    ✗
//   ready  → paid    ✗  (must go via sent)
//   Any backward transition ✗
// ======================================================

export interface FinancialMutationEvent {
  id: string;

  reviewItemId: string;
  jobId: string;

  mutationType: MutationType;

  amount: number;

  createdBy: string;
  createdAt: string;

  syncedStatus: FinancialSyncStatus;
}

export type FinancialSyncStatus =
  | "pending"
  | "synced"
  | "failed";

export type MutationType =
  | "invoice"
  | "expense"
  | "payroll"
  | "adjustment";
