// ======================================================
// PHASE 5.6 — ACCOUNTING SYNC ENGINE
//
// Manages the sync queue lifecycle for accounting sync.
// No real API calls. Mock architecture only.
//
// Doctrine:
//   Synchronization never creates financial records.
//   Synchronization only exports approved financial truth.
//   Accounting systems remain downstream consumers.
//   The Ledger remains the source of operational truth.
//
// Sync Lifecycle:
//   Pending → Syncing → Synced
//   Pending → Syncing → Failed
//   Failed  → Retry Required → Syncing → Synced
// ======================================================

import type { AccountingProvider, EntityType } from "./accountingProviders";

// ──────────────────────────────────────────────────────
// SYNC STATUS
// ──────────────────────────────────────────────────────

export type SyncStatus =
  | "pending"
  | "syncing"
  | "synced"
  | "failed"
  | "retry_required";

export const SYNC_STATUS_LABELS: Record<SyncStatus, string> = {
  pending: "Pending",
  syncing: "Syncing",
  synced: "Synced",
  failed: "Failed",
  retry_required: "Retry Required",
};

export const SYNC_STATUS_COLORS: Record<SyncStatus, string> = {
  pending: "text-slate-600 border-slate-200 bg-slate-50",
  syncing: "text-blue-600 border-blue-200 bg-blue-50",
  synced: "text-emerald-600 border-emerald-200 bg-emerald-50",
  failed: "text-red-600 border-red-200 bg-red-50",
  retry_required: "text-amber-600 border-amber-200 bg-amber-50",
};

// ──────────────────────────────────────────────────────
// SYNC ERROR TYPES
// ──────────────────────────────────────────────────────

export type SyncErrorType =
  | "customer_missing"
  | "mapping_missing"
  | "duplicate_entity"
  | "provider_disconnected";

export const SYNC_ERROR_LABELS: Record<SyncErrorType, string> = {
  customer_missing: "Customer Missing",
  mapping_missing: "Mapping Missing",
  duplicate_entity: "Duplicate Entity",
  provider_disconnected: "Provider Disconnected",
};

export const SYNC_ERROR_RESOLUTIONS: Record<SyncErrorType, string> = {
  customer_missing:
    "Create the customer record in the accounting system, then retry.",
  mapping_missing:
    "Define the account mapping in Settings → Integrations, then retry.",
  duplicate_entity:
    "Remove the duplicate record from the accounting system or update the external reference.",
  provider_disconnected:
    "Reconnect the accounting provider in Settings → Integrations.",
};

// ──────────────────────────────────────────────────────
// SYNC RECORD
// The unit of synchronization — one entity sync attempt.
// ──────────────────────────────────────────────────────

export interface SyncRecord {
  id: string;
  provider: AccountingProvider;
  entityType: EntityType;
  entityId: string;       // Internal Ledger entity ID
  jobId: string;
  jobTitle: string;
  status: SyncStatus;
  externalId: string | null;   // Reference in the accounting system
  lastAttemptAt: string | null; // ISO timestamp
  syncedAt: string | null;      // ISO timestamp of successful sync
  errorType: SyncErrorType | null;
  errorMessage: string | null;
  createdAt: string;
}

// ──────────────────────────────────────────────────────
// SYNC AUDIT ENTRY
// Immutable log of every sync action.
// ──────────────────────────────────────────────────────

export interface SyncAuditEntry {
  id: string;
  syncRecordId: string;
  provider: AccountingProvider;
  entityType: EntityType;
  jobId: string;
  fromStatus: SyncStatus | null;
  toStatus: SyncStatus;
  message: string;
  externalId: string | null;
  timestamp: string; // ISO timestamp
}

// ──────────────────────────────────────────────────────
// SYNC KPIs
// Aggregated view for the Sync Centre dashboard.
// ──────────────────────────────────────────────────────

export interface SyncKPIs {
  pending: number;
  syncing: number;
  synced: number;
  failed: number;
  retryRequired: number;
  total: number;
}

// ──────────────────────────────────────────────────────
// SEED DATA — Mock sync records for demo environment
// ──────────────────────────────────────────────────────

export const SEED_SYNC_RECORDS: SyncRecord[] = [
  {
    id: "sync-001",
    provider: "quickbooks",
    entityType: "invoice",
    entityId: "inv-draft-001",
    jobId: "dj-kitchen-extract-1",
    jobTitle: "Kitchen extraction & ventilation install",
    status: "synced",
    externalId: "QB-INV-4421",
    lastAttemptAt: "2026-05-30T09:15:00Z",
    syncedAt: "2026-05-30T09:15:42Z",
    errorType: null,
    errorMessage: null,
    createdAt: "2026-05-30T09:00:00Z",
  },
  {
    id: "sync-002",
    provider: "xero",
    entityType: "customer",
    entityId: "client-001",
    jobId: "dj-kitchen-extract-1",
    jobTitle: "Kitchen extraction & ventilation install",
    status: "synced",
    externalId: "XERO-CUST-7823",
    lastAttemptAt: "2026-05-30T08:45:00Z",
    syncedAt: "2026-05-30T08:45:18Z",
    errorType: null,
    errorMessage: null,
    createdAt: "2026-05-30T08:30:00Z",
  },
  {
    id: "sync-003",
    provider: "quickbooks",
    entityType: "payroll",
    entityId: "payroll-export-001",
    jobId: "dj-kitchen-extract-1",
    jobTitle: "Kitchen extraction & ventilation install",
    status: "failed",
    externalId: null,
    lastAttemptAt: "2026-05-30T10:00:00Z",
    syncedAt: null,
    errorType: "mapping_missing",
    errorMessage: "Payroll account mapping not configured for QuickBooks.",
    createdAt: "2026-05-30T09:55:00Z",
  },
  {
    id: "sync-004",
    provider: "xero",
    entityType: "invoice",
    entityId: "inv-draft-002",
    jobId: "dj-kitchen-extract-1",
    jobTitle: "Kitchen extraction & ventilation install",
    status: "pending",
    externalId: null,
    lastAttemptAt: null,
    syncedAt: null,
    errorType: null,
    errorMessage: null,
    createdAt: "2026-05-30T11:00:00Z",
  },
  {
    id: "sync-005",
    provider: "quickbooks",
    entityType: "job",
    entityId: "dj-kitchen-extract-1",
    jobId: "dj-kitchen-extract-1",
    jobTitle: "Kitchen extraction & ventilation install",
    status: "retry_required",
    externalId: null,
    lastAttemptAt: "2026-05-30T09:30:00Z",
    syncedAt: null,
    errorType: "customer_missing",
    errorMessage: "Customer record not found in QuickBooks. Create the customer before syncing the job.",
    createdAt: "2026-05-30T09:25:00Z",
  },
];

export const SEED_SYNC_AUDIT: SyncAuditEntry[] = [
  {
    id: "audit-sync-001",
    syncRecordId: "sync-001",
    provider: "quickbooks",
    entityType: "invoice",
    jobId: "dj-kitchen-extract-1",
    fromStatus: "pending",
    toStatus: "syncing",
    message: "Sync initiated for invoice inv-draft-001",
    externalId: null,
    timestamp: "2026-05-30T09:15:00Z",
  },
  {
    id: "audit-sync-002",
    syncRecordId: "sync-001",
    provider: "quickbooks",
    entityType: "invoice",
    jobId: "dj-kitchen-extract-1",
    fromStatus: "syncing",
    toStatus: "synced",
    message: "Invoice synced successfully. External ID: QB-INV-4421",
    externalId: "QB-INV-4421",
    timestamp: "2026-05-30T09:15:42Z",
  },
  {
    id: "audit-sync-003",
    syncRecordId: "sync-003",
    provider: "quickbooks",
    entityType: "payroll",
    jobId: "dj-kitchen-extract-1",
    fromStatus: "pending",
    toStatus: "syncing",
    message: "Sync initiated for payroll export payroll-export-001",
    externalId: null,
    timestamp: "2026-05-30T10:00:00Z",
  },
  {
    id: "audit-sync-004",
    syncRecordId: "sync-003",
    provider: "quickbooks",
    entityType: "payroll",
    jobId: "dj-kitchen-extract-1",
    fromStatus: "syncing",
    toStatus: "failed",
    message: "Sync failed: Payroll account mapping not configured for QuickBooks.",
    externalId: null,
    timestamp: "2026-05-30T10:00:08Z",
  },
];

// ──────────────────────────────────────────────────────
// ENGINE FUNCTIONS
// Pure functions. No side effects.
// ──────────────────────────────────────────────────────

/**
 * Compute KPI summary from a list of sync records.
 */
export function computeSyncKPIs(records: SyncRecord[]): SyncKPIs {
  return {
    pending: records.filter((r) => r.status === "pending").length,
    syncing: records.filter((r) => r.status === "syncing").length,
    synced: records.filter((r) => r.status === "synced").length,
    failed: records.filter((r) => r.status === "failed").length,
    retryRequired: records.filter((r) => r.status === "retry_required").length,
    total: records.length,
  };
}

/**
 * Returns true if a sync status transition is valid.
 *
 * Valid transitions:
 *   pending        → syncing
 *   syncing        → synced | failed
 *   failed         → retry_required
 *   retry_required → syncing
 */
export function isValidSyncTransition(
  from: SyncStatus,
  to: SyncStatus
): boolean {
  const transitions: Record<SyncStatus, SyncStatus[]> = {
    pending: ["syncing"],
    syncing: ["synced", "failed"],
    failed: ["retry_required"],
    retry_required: ["syncing"],
    synced: [],
  };
  return transitions[from]?.includes(to) ?? false;
}

/**
 * Advance a sync record to its next status.
 * Returns updated record + audit entry, or null if transition invalid.
 */
export function advanceSyncRecord(
  record: SyncRecord,
  toStatus: SyncStatus,
  externalId?: string,
  errorType?: SyncRecord["errorType"],
  errorMessage?: string
): { updated: SyncRecord; auditEntry: SyncAuditEntry } | null {
  if (!isValidSyncTransition(record.status, toStatus)) return null;

  const now = new Date().toISOString();
  const updated: SyncRecord = {
    ...record,
    status: toStatus,
    lastAttemptAt: now,
    syncedAt: toStatus === "synced" ? now : record.syncedAt,
    externalId: externalId ?? record.externalId,
    errorType: errorType ?? (toStatus === "synced" ? null : record.errorType),
    errorMessage:
      errorMessage ?? (toStatus === "synced" ? null : record.errorMessage),
  };

  const auditEntry: SyncAuditEntry = {
    id: `audit-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    syncRecordId: record.id,
    provider: record.provider,
    entityType: record.entityType,
    jobId: record.jobId,
    fromStatus: record.status,
    toStatus,
    message: buildAuditMessage(record, toStatus, externalId, errorMessage),
    externalId: externalId ?? record.externalId,
    timestamp: now,
  };

  return { updated, auditEntry };
}

function buildAuditMessage(
  record: SyncRecord,
  toStatus: SyncStatus,
  externalId?: string,
  errorMessage?: string
): string {
  switch (toStatus) {
    case "syncing":
      return `Sync initiated for ${record.entityType} ${record.entityId}`;
    case "synced":
      return `${record.entityType} synced successfully.${
        externalId ? ` External ID: ${externalId}` : ""
      }`;
    case "failed":
      return `Sync failed: ${errorMessage ?? "Unknown error"}`;
    case "retry_required":
      return `Marked for retry. ${errorMessage ?? ""}`.trim();
    default:
      return `Status changed to ${toStatus}`;
  }
}

/**
 * Simulate a full mock sync:
 *   pending → syncing → synced (success path)
 *   pending → syncing → failed (failure path)
 *
 * Returns the sequence of intermediate records + audit entries.
 */
export function simulateMockSync(
  record: SyncRecord,
  succeed: boolean
): Array<{ updated: SyncRecord; auditEntry: SyncAuditEntry }> {
  const results: Array<{ updated: SyncRecord; auditEntry: SyncAuditEntry }> = [];

  // Step 1: pending → syncing
  const step1 = advanceSyncRecord(record, "syncing");
  if (!step1) return results;
  results.push(step1);

  // Step 2: syncing → synced | failed
  if (succeed) {
    const extId = `${record.provider.toUpperCase().slice(0, 2)}-${record.entityType.toUpperCase().slice(0, 3)}-${Math.floor(Math.random() * 9000 + 1000)}`;
    const step2 = advanceSyncRecord(step1.updated, "synced", extId);
    if (step2) results.push(step2);
  } else {
    const step2 = advanceSyncRecord(
      step1.updated,
      "failed",
      undefined,
      "mapping_missing",
      "Account mapping not configured. Check Settings → Integrations."
    );
    if (step2) results.push(step2);
  }

  return results;
}
