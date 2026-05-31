// ======================================================
// PHASE 5.9 — EXCEPTION RESOLUTION ENGINE
//
// Manages exceptions that arise from reconciliation
// discrepancies, sync failures, and financial anomalies.
//
// Architecture: Mock only. No backend. Pure functions +
// seed data.
//
// Doctrine:
//   The Ledger remains the source of operational truth.
//   Exceptions are traceable and actionable.
//   No exception resolution bypasses audit.
//   All resolutions require explicit action and notes.
// ======================================================

// ──────────────────────────────────────────────────────
// EXCEPTION TYPES
// ──────────────────────────────────────────────────────

export type ExceptionType =
  | "reconciliation_mismatch"
  | "missing_accounting_record"
  | "missing_ledger_record"
  | "duplicate_record"
  | "sync_failure"
  | "variance_threshold_breach";

export const EXCEPTION_TYPE_LABELS: Record<ExceptionType, string> = {
  reconciliation_mismatch: "Reconciliation Mismatch",
  missing_accounting_record: "Missing Accounting Record",
  missing_ledger_record: "Missing Ledger Record",
  duplicate_record: "Duplicate Record",
  sync_failure: "Sync Failure",
  variance_threshold_breach: "Variance Threshold Breach",
};

export const EXCEPTION_TYPE_COLORS: Record<ExceptionType, string> = {
  reconciliation_mismatch: "text-red-600 border-red-200 bg-red-50",
  missing_accounting_record: "text-amber-600 border-amber-200 bg-amber-50",
  missing_ledger_record: "text-violet-600 border-violet-200 bg-violet-50",
  duplicate_record: "text-orange-600 border-orange-200 bg-orange-50",
  sync_failure: "text-rose-600 border-rose-200 bg-rose-50",
  variance_threshold_breach: "text-blue-600 border-blue-200 bg-blue-50",
};

// ──────────────────────────────────────────────────────
// EXCEPTION STATUS
// ──────────────────────────────────────────────────────

export type ExceptionStatus =
  | "open"
  | "under_investigation"
  | "awaiting_approval"
  | "resolved"
  | "rejected";

export const EXCEPTION_STATUS_LABELS: Record<ExceptionStatus, string> = {
  open: "Open",
  under_investigation: "Under Investigation",
  awaiting_approval: "Awaiting Approval",
  resolved: "Resolved",
  rejected: "Rejected",
};

export const EXCEPTION_STATUS_COLORS: Record<ExceptionStatus, string> = {
  open: "text-red-600 border-red-200 bg-red-50",
  under_investigation: "text-blue-600 border-blue-200 bg-blue-50",
  awaiting_approval: "text-amber-600 border-amber-200 bg-amber-50",
  resolved: "text-emerald-600 border-emerald-200 bg-emerald-50",
  rejected: "text-slate-600 border-slate-200 bg-slate-50",
};

// ──────────────────────────────────────────────────────
// EXCEPTION RECORD
// ──────────────────────────────────────────────────────

export interface ExceptionRecord {
  id: string;
  exceptionNumber: string;           // Display ID: EXC-2026-001
  type: ExceptionType;
  status: ExceptionStatus;
  jobId: string | null;
  jobName: string | null;
  clientName: string | null;
  assignedTo: string | null;         // User name
  assignedToId: string | null;
  createdAt: string;                 // ISO timestamp
  updatedAt: string;                 // ISO timestamp
  resolvedAt: string | null;
  description: string;               // What triggered this exception
  resolutionNotes: string | null;    // How it was resolved
  approvalNotes: string | null;      // CEO approval comment
  auditReference: string | null;     // Link to source record
  financialImpact: number | null;    // Estimated financial impact in GBP
}

// ──────────────────────────────────────────────────────
// EXCEPTION SUMMARY
// ──────────────────────────────────────────────────────

export interface ExceptionSummary {
  open: number;
  underInvestigation: number;
  awaitingApproval: number;
  resolved: number;
  rejected: number;
  total: number;
}

// ──────────────────────────────────────────────────────
// SEED DATA
// ──────────────────────────────────────────────────────

export const SEED_EXCEPTIONS: ExceptionRecord[] = [
  {
    id: "exc-001",
    exceptionNumber: "EXC-2026-001",
    type: "reconciliation_mismatch",
    status: "open",
    jobId: "dj-kitchen-extract-1",
    jobName: "Kitchen extraction & ventilation install",
    clientName: "Drummond Facilities Ltd",
    assignedTo: null,
    assignedToId: null,
    createdAt: "2026-05-31T08:30:00Z",
    updatedAt: "2026-05-31T08:30:00Z",
    resolvedAt: null,
    description: "Invoice INV-2026-003 total in QuickBooks (£4,200.00) does not match Ledger total (£4,250.00). Discrepancy of £50.00 detected during reconciliation run.",
    resolutionNotes: null,
    approvalNotes: null,
    auditReference: "recon-007",
    financialImpact: 50.00,
  },
  {
    id: "exc-002",
    exceptionNumber: "EXC-2026-002",
    type: "missing_accounting_record",
    status: "under_investigation",
    jobId: "dj-kitchen-extract-1",
    jobName: "Kitchen extraction & ventilation install",
    clientName: "Drummond Facilities Ltd",
    assignedTo: "Sarah Chen",
    assignedToId: "user-pm-001",
    createdAt: "2026-05-31T09:00:00Z",
    updatedAt: "2026-05-31T10:15:00Z",
    resolvedAt: null,
    description: "Invoice INV-2026-002 exists in The Ledger but has not been synced to Xero. Manual investigation required to determine whether sync was intentionally deferred.",
    resolutionNotes: "Investigating sync log history. Provider connection may have lapsed during batch sync window.",
    approvalNotes: null,
    auditReference: "recon-003",
    financialImpact: null,
  },
  {
    id: "exc-003",
    exceptionNumber: "EXC-2026-003",
    type: "sync_failure",
    status: "awaiting_approval",
    jobId: "dj-kitchen-extract-1",
    jobName: "Kitchen extraction & ventilation install",
    clientName: "Drummond Facilities Ltd",
    assignedTo: "Sarah Chen",
    assignedToId: "user-pm-001",
    createdAt: "2026-05-30T14:00:00Z",
    updatedAt: "2026-05-31T09:30:00Z",
    resolvedAt: null,
    description: "Payroll Export — Week 22 failed to sync to QuickBooks. Payroll account mapping not configured. Awaiting CEO approval to proceed with manual export.",
    resolutionNotes: "Identified root cause: account code mapping missing for payroll entity type. Proposed resolution: apply QB account code 5001 (Wages & Salaries).",
    approvalNotes: null,
    auditReference: "recon-004",
    financialImpact: 12450.00,
  },
  {
    id: "exc-004",
    exceptionNumber: "EXC-2026-004",
    type: "variance_threshold_breach",
    status: "resolved",
    jobId: null,
    jobName: null,
    clientName: "Balmoral Security Services",
    assignedTo: "Marcus Webb",
    assignedToId: "user-ceo-001",
    createdAt: "2026-05-29T11:00:00Z",
    updatedAt: "2026-05-30T09:00:00Z",
    resolvedAt: "2026-05-30T09:00:00Z",
    description: "Monthly revenue variance exceeded 5% threshold. Actual revenue for May: £48,200. Forecast: £45,800. Variance: £2,400 (5.2%). Auto-exception triggered by forecasting engine.",
    resolutionNotes: "Variance attributed to additional emergency call-out on 28 May not captured in monthly forecast. Forecast will be updated to reflect standing call-out contract.",
    approvalNotes: "Approved. Variance is favourable and explained by contract scope expansion. No corrective action required.",
    auditReference: null,
    financialImpact: 2400.00,
  },
  {
    id: "exc-005",
    exceptionNumber: "EXC-2026-005",
    type: "duplicate_record",
    status: "open",
    jobId: null,
    jobName: null,
    clientName: "Drummond Facilities Ltd",
    assignedTo: null,
    assignedToId: null,
    createdAt: "2026-05-31T11:00:00Z",
    updatedAt: "2026-05-31T11:00:00Z",
    resolvedAt: null,
    description: "Customer record for Drummond Facilities Ltd appears twice in QuickBooks (QB-CUST-5512 and QB-CUST-5513). Duplicate detected during reconciliation. One record must be merged or deleted.",
    resolutionNotes: null,
    approvalNotes: null,
    auditReference: "recon-002",
    financialImpact: null,
  },
  {
    id: "exc-006",
    exceptionNumber: "EXC-2026-006",
    type: "missing_ledger_record",
    status: "rejected",
    jobId: null,
    jobName: null,
    clientName: null,
    assignedTo: "Marcus Webb",
    assignedToId: "user-ceo-001",
    createdAt: "2026-05-28T09:00:00Z",
    updatedAt: "2026-05-29T14:30:00Z",
    resolvedAt: "2026-05-29T14:30:00Z",
    description: "Xero contains invoice XERO-INV-6610 with no corresponding Ledger record. Auto-exception raised. Record pre-dates Ledger implementation.",
    resolutionNotes: "Record confirmed as pre-Ledger legacy invoice. No action required within The Ledger.",
    approvalNotes: "Rejected as false exception. Pre-Ledger records are excluded from reconciliation scope. Closing.",
    auditReference: null,
    financialImpact: null,
  },
];

// ──────────────────────────────────────────────────────
// ENGINE FUNCTIONS
// ──────────────────────────────────────────────────────

export function computeExceptionSummary(records: ExceptionRecord[]): ExceptionSummary {
  return {
    open: records.filter((r) => r.status === "open").length,
    underInvestigation: records.filter((r) => r.status === "under_investigation").length,
    awaitingApproval: records.filter((r) => r.status === "awaiting_approval").length,
    resolved: records.filter((r) => r.status === "resolved").length,
    rejected: records.filter((r) => r.status === "rejected").length,
    total: records.length,
  };
}

export function searchExceptions(
  records: ExceptionRecord[],
  query: string
): ExceptionRecord[] {
  if (!query.trim()) return records;
  const q = query.trim().toLowerCase();
  return records.filter(
    (r) =>
      r.exceptionNumber.toLowerCase().includes(q) ||
      (r.jobName?.toLowerCase().includes(q) ?? false) ||
      (r.clientName?.toLowerCase().includes(q) ?? false) ||
      (r.description?.toLowerCase().includes(q) ?? false)
  );
}

export function filterExceptionsByStatus(
  records: ExceptionRecord[],
  status: ExceptionStatus | "all"
): ExceptionRecord[] {
  if (status === "all") return records;
  return records.filter((r) => r.status === status);
}

export function filterExceptionsByType(
  records: ExceptionRecord[],
  type: ExceptionType | "all"
): ExceptionRecord[] {
  if (type === "all") return records;
  return records.filter((r) => r.type === type);
}

export function filterExceptionsByAssignee(
  records: ExceptionRecord[],
  assigneeName: string | "all"
): ExceptionRecord[] {
  if (assigneeName === "all") return records;
  return records.filter((r) => r.assignedTo === assigneeName);
}

/**
 * Resolve an exception — returns an updated record.
 * In a real system this would call an API.
 */
export function resolveException(
  record: ExceptionRecord,
  notes: string,
  approvalNotes: string
): ExceptionRecord {
  const now = new Date().toISOString();
  return {
    ...record,
    status: "resolved",
    resolutionNotes: notes,
    approvalNotes,
    resolvedAt: now,
    updatedAt: now,
  };
}

/**
 * Reject an exception — returns an updated record.
 */
export function rejectException(
  record: ExceptionRecord,
  approvalNotes: string
): ExceptionRecord {
  const now = new Date().toISOString();
  return {
    ...record,
    status: "rejected",
    approvalNotes,
    resolvedAt: now,
    updatedAt: now,
  };
}

/**
 * Get all unique assignee names from a set of records.
 */
export function getAssigneeNames(records: ExceptionRecord[]): string[] {
  const names = new Set<string>();
  records.forEach((r) => {
    if (r.assignedTo) names.add(r.assignedTo);
  });
  return Array.from(names).sort();
}
