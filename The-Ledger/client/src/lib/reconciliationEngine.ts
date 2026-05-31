// ======================================================
// PHASE 5.8 — RECONCILIATION ENGINE
//
// Manages reconciliation of Ledger records against
// downstream accounting system records.
//
// Architecture: Mock only. No backend. Pure functions +
// seed data.
//
// Doctrine:
//   The Ledger remains the source of operational truth.
//   Reconciliation detects discrepancies between the
//   Ledger and accounting systems.
//   Reconciliation never modifies financial records.
//   All exceptions are traceable.
// ======================================================

import type { AccountingProvider, EntityType } from "./accountingProviders";

// ──────────────────────────────────────────────────────
// RECONCILIATION STATUS
// ──────────────────────────────────────────────────────

export type ReconciliationStatus =
  | "matched"
  | "unmatched"
  | "missing_in_ledger"
  | "missing_in_accounting"
  | "requires_review";

export const RECONCILIATION_STATUS_LABELS: Record<ReconciliationStatus, string> = {
  matched: "Matched",
  unmatched: "Unmatched",
  missing_in_ledger: "Missing in Ledger",
  missing_in_accounting: "Missing in Accounting",
  requires_review: "Requires Review",
};

export const RECONCILIATION_STATUS_COLORS: Record<ReconciliationStatus, string> = {
  matched: "text-emerald-600 border-emerald-200 bg-emerald-50",
  unmatched: "text-red-600 border-red-200 bg-red-50",
  missing_in_ledger: "text-violet-600 border-violet-200 bg-violet-50",
  missing_in_accounting: "text-amber-600 border-amber-200 bg-amber-50",
  requires_review: "text-blue-600 border-blue-200 bg-blue-50",
};

// ──────────────────────────────────────────────────────
// RECONCILIATION RECORD
// One entity's reconciliation state across providers.
// ──────────────────────────────────────────────────────

export interface ReconciliationRecord {
  id: string;
  entityId: string;             // Internal Ledger entity ID
  entityName: string;           // Display name
  entityType: EntityType;
  provider: AccountingProvider;
  ledgerReference: string | null;      // Internal Ledger ref (invoice number, job ID, etc.)
  accountingReference: string | null;  // Accounting system external ref
  status: ReconciliationStatus;
  mismatchDetails: string | null;      // Description of any mismatch found
  lastCheckedAt: string;               // ISO timestamp
  jobId: string | null;
}

// ──────────────────────────────────────────────────────
// RECONCILIATION SUMMARY
// Aggregated KPIs for the Reconciliation Centre.
// ──────────────────────────────────────────────────────

export interface ReconciliationSummary {
  matched: number;
  unmatched: number;
  requiresReview: number;
  missingInLedger: number;
  missingInAccounting: number;
  total: number;
  matchRate: number; // 0–100
}

// ──────────────────────────────────────────────────────
// SEED DATA — Mock reconciliation records
// ──────────────────────────────────────────────────────

export const SEED_RECONCILIATION_RECORDS: ReconciliationRecord[] = [
  {
    id: "recon-001",
    entityId: "inv-draft-001",
    entityName: "Invoice INV-2026-001",
    entityType: "invoice",
    provider: "quickbooks",
    ledgerReference: "INV-2026-001",
    accountingReference: "QB-INV-4421",
    status: "matched",
    mismatchDetails: null,
    lastCheckedAt: "2026-05-31T10:00:00Z",
    jobId: "dj-kitchen-extract-1",
  },
  {
    id: "recon-002",
    entityId: "client-001",
    entityName: "Drummond Facilities Ltd",
    entityType: "customer",
    provider: "xero",
    ledgerReference: "CLIENT-001",
    accountingReference: "XERO-CUST-7823",
    status: "matched",
    mismatchDetails: null,
    lastCheckedAt: "2026-05-31T09:45:00Z",
    jobId: null,
  },
  {
    id: "recon-003",
    entityId: "inv-draft-002",
    entityName: "Invoice INV-2026-002",
    entityType: "invoice",
    provider: "xero",
    ledgerReference: "INV-2026-002",
    accountingReference: null,
    status: "missing_in_accounting",
    mismatchDetails: "Invoice exists in The Ledger but has not been synced to Xero. Sync required.",
    lastCheckedAt: "2026-05-31T10:05:00Z",
    jobId: "dj-kitchen-extract-1",
  },
  {
    id: "recon-004",
    entityId: "payroll-export-001",
    entityName: "Payroll Export — Week 22",
    entityType: "payroll",
    provider: "quickbooks",
    ledgerReference: "PAYROLL-EXPORT-001",
    accountingReference: null,
    status: "unmatched",
    mismatchDetails: "Payroll account mapping not configured. Cannot reconcile without account code.",
    lastCheckedAt: "2026-05-31T10:10:00Z",
    jobId: "dj-kitchen-extract-1",
  },
  {
    id: "recon-005",
    entityId: "dj-kitchen-extract-1",
    entityName: "Kitchen extraction & ventilation install",
    entityType: "job",
    provider: "quickbooks",
    ledgerReference: "JOB-DKE-001",
    accountingReference: null,
    status: "requires_review",
    mismatchDetails: "Job entity mapping is not configured. Review entity mapping settings.",
    lastCheckedAt: "2026-05-31T10:15:00Z",
    jobId: "dj-kitchen-extract-1",
  },
  {
    id: "recon-006",
    entityId: "client-002",
    entityName: "Balmoral Security Services",
    entityType: "customer",
    provider: "quickbooks",
    ledgerReference: "CLIENT-002",
    accountingReference: "QB-CUST-1108",
    status: "matched",
    mismatchDetails: null,
    lastCheckedAt: "2026-05-30T14:00:00Z",
    jobId: null,
  },
  {
    id: "recon-007",
    entityId: "inv-draft-003",
    entityName: "Invoice INV-2026-003",
    entityType: "invoice",
    provider: "quickbooks",
    ledgerReference: "INV-2026-003",
    accountingReference: "QB-INV-4490",
    status: "requires_review",
    mismatchDetails: "Invoice total in QuickBooks (£4,200.00) does not match Ledger total (£4,250.00). Amount discrepancy of £50.00.",
    lastCheckedAt: "2026-05-31T08:30:00Z",
    jobId: "dj-kitchen-extract-1",
  },
];

// ──────────────────────────────────────────────────────
// ENGINE FUNCTIONS
// Pure functions. No side effects.
// ──────────────────────────────────────────────────────

/**
 * Compute reconciliation summary KPIs from a list of records.
 */
export function computeReconciliationSummary(
  records: ReconciliationRecord[]
): ReconciliationSummary {
  const matched = records.filter((r) => r.status === "matched").length;
  const unmatched = records.filter((r) => r.status === "unmatched").length;
  const requiresReview = records.filter((r) => r.status === "requires_review").length;
  const missingInLedger = records.filter((r) => r.status === "missing_in_ledger").length;
  const missingInAccounting = records.filter((r) => r.status === "missing_in_accounting").length;
  const total = records.length;
  const matchRate = total > 0 ? Math.round((matched / total) * 100) : 0;

  return {
    matched,
    unmatched,
    requiresReview,
    missingInLedger,
    missingInAccounting,
    total,
    matchRate,
  };
}

/**
 * Filter reconciliation records by status.
 */
export function filterByReconciliationStatus(
  records: ReconciliationRecord[],
  status: ReconciliationStatus | "all"
): ReconciliationRecord[] {
  if (status === "all") return records;
  return records.filter((r) => r.status === status);
}

/**
 * Filter reconciliation records by provider.
 */
export function filterByProvider(
  records: ReconciliationRecord[],
  provider: AccountingProvider | "all"
): ReconciliationRecord[] {
  if (provider === "all") return records;
  return records.filter((r) => r.provider === provider);
}

/**
 * Filter reconciliation records by entity type.
 */
export function filterByEntityType(
  records: ReconciliationRecord[],
  entityType: EntityType | "all"
): ReconciliationRecord[] {
  if (entityType === "all") return records;
  return records.filter((r) => r.entityType === entityType);
}

/**
 * Search reconciliation records by entity name, reference, or job.
 */
export function searchReconciliationRecords(
  records: ReconciliationRecord[],
  query: string
): ReconciliationRecord[] {
  if (!query.trim()) return records;
  const q = query.trim().toLowerCase();
  return records.filter(
    (r) =>
      r.entityName.toLowerCase().includes(q) ||
      (r.ledgerReference?.toLowerCase().includes(q) ?? false) ||
      (r.accountingReference?.toLowerCase().includes(q) ?? false) ||
      (r.jobId?.toLowerCase().includes(q) ?? false)
  );
}

/**
 * Get records that require action (unmatched, requires_review, missing).
 */
export function getExceptionRecords(
  records: ReconciliationRecord[]
): ReconciliationRecord[] {
  return records.filter(
    (r) =>
      r.status === "unmatched" ||
      r.status === "requires_review" ||
      r.status === "missing_in_ledger" ||
      r.status === "missing_in_accounting"
  );
}
