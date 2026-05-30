// ======================================================
// PHASE 5.3 — INVOICE BUILDER ENGINE
//
// Pure functions. No side effects. No React state.
// All data flows from approved InvoiceLineItem records.
//
// Doctrine:
//   Approved Operational Activity
//   → Financial Mutation Engine
//   → Normalized Financial Records
//   → InvoiceLineItems
//   → InvoiceDraft          ← this file
//   → Invoice Workflow
//
// Never: Job → Invoice directly.
// ======================================================

import type { InvoiceDraft, InvoiceDraftLineItem, InvoiceStatus } from "@/types/finance";
import type { InvoiceLineItem } from "@/lib/mockData";

// ──────────────────────────────────────────────────────
// Status transition table
//
// Allowed:  draft → ready → sent → paid
// Disallowed: any skip or reversal
// ──────────────────────────────────────────────────────
const ALLOWED_TRANSITIONS: Record<InvoiceStatus, InvoiceStatus | null> = {
  draft:  "ready",
  ready:  "sent",
  sent:   "paid",
  paid:   null,   // terminal — no further transitions
};

/**
 * Returns true if the transition from `from` to `to` is permitted.
 * Only sequential forward transitions are valid.
 */
export function isValidStatusTransition(
  from: InvoiceStatus,
  to: InvoiceStatus
): boolean {
  return ALLOWED_TRANSITIONS[from] === to;
}

/**
 * Returns the next permitted status after `current`, or null if at
 * the terminal state (paid).
 */
export function nextStatus(current: InvoiceStatus): InvoiceStatus | null {
  return ALLOWED_TRANSITIONS[current];
}

// ──────────────────────────────────────────────────────
// calculateInvoiceTotals
//
// Pure function — re-derives subtotal, taxAmount, and total
// from the draft's lineItems and taxRate.
// Call this whenever lineItems change.
// ──────────────────────────────────────────────────────
export interface InvoiceTotals {
  subtotal: number;
  taxAmount: number;
  total: number;
}

export function calculateInvoiceTotals(
  lineItems: InvoiceDraftLineItem[],
  taxRate: number
): InvoiceTotals {
  const subtotal = lineItems.reduce((sum, li) => sum + li.amount, 0);
  const taxAmount = parseFloat((subtotal * taxRate).toFixed(2));
  const total = parseFloat((subtotal + taxAmount).toFixed(2));
  return { subtotal, taxAmount, total };
}

// ──────────────────────────────────────────────────────
// generateInvoiceDraft
//
// Creates a new InvoiceDraft from an array of approved
// InvoiceLineItem records for a given job.
//
// This is the canonical entry point to the invoice pipeline.
// Called when a user clicks "Generate Invoice" from the
// Invoice Readiness Panel or Invoice Builder page.
//
// Parameters:
//   id            — caller-supplied unique ID for the draft
//   invoiceNumber — e.g. "INV-2026-0001" from generateInvoiceNumber()
//   jobId         — the job this invoice covers
//   clientId      — the client for addressing the invoice
//   lineItems     — approved InvoiceLineItem[] for this job
//   taxRate       — defaults to 0 (VAT placeholder)
//
// Returns a fully-computed InvoiceDraft at status "draft".
// ──────────────────────────────────────────────────────
export function generateInvoiceDraft(
  id: string,
  invoiceNumber: string,
  jobId: string,
  clientId: string,
  lineItems: InvoiceLineItem[],
  taxRate = 0
): InvoiceDraft {
  // Map approved InvoiceLineItem records → InvoiceDraftLineItem shape
  const draftLines: InvoiceDraftLineItem[] = lineItems.map((li) => ({
    id:          li.id,
    type:        li.type,
    description: li.description,
    quantity:    li.quantity,
    unitPrice:   li.unitPrice,
    amount:      li.amount,
  }));

  const { subtotal, taxAmount, total } = calculateInvoiceTotals(draftLines, taxRate);
  const now = new Date().toISOString();

  return {
    id,
    invoiceNumber,
    jobId,
    clientId,
    lineItems: draftLines,
    subtotal,
    taxRate,
    taxAmount,
    total,
    status: "draft",
    createdAt: now,
    updatedAt: now,
  };
}

// ──────────────────────────────────────────────────────
// updateInvoiceStatus
//
// Returns a new InvoiceDraft with the updated status and
// updatedAt timestamp, enforcing the transition rules.
//
// Throws if the transition is not permitted.
// Callers should catch and display an appropriate error.
// ──────────────────────────────────────────────────────
export function updateInvoiceStatus(
  draft: InvoiceDraft,
  newStatus: InvoiceStatus
): InvoiceDraft {
  if (!isValidStatusTransition(draft.status, newStatus)) {
    throw new Error(
      `Invalid invoice status transition: ${draft.status} → ${newStatus}. ` +
      `Allowed transitions are: draft → ready → sent → paid.`
    );
  }

  return {
    ...draft,
    status: newStatus,
    updatedAt: new Date().toISOString(),
  };
}

// ──────────────────────────────────────────────────────
// LABEL HELPERS — used in UI components
// ──────────────────────────────────────────────────────

export const INVOICE_STATUS_LABELS: Record<InvoiceStatus, string> = {
  draft:  "Draft",
  ready:  "Ready",
  sent:   "Sent",
  paid:   "Paid",
};

export const INVOICE_STATUS_COLORS: Record<InvoiceStatus, string> = {
  draft:  "text-slate-600  border-slate-200  bg-slate-50",
  ready:  "text-blue-600   border-blue-200   bg-blue-50",
  sent:   "text-amber-600  border-amber-200  bg-amber-50",
  paid:   "text-emerald-600 border-emerald-200 bg-emerald-50",
};

export const INVOICE_STATUS_NEXT_LABEL: Record<InvoiceStatus, string | null> = {
  draft:  "Mark as Ready",
  ready:  "Mark as Sent",
  sent:   "Mark as Paid",
  paid:   null,
};
