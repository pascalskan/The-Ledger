// ======================================================
// PHASE 5.6 — SYNC LOG ENGINE
//
// Tracks sync actions across all entity types.
// Maintains an auditable record of every sync event.
//
// Doctrine:
//   All sync actions must be auditable.
//   Logs are append-only.
//   No silent failures.
// ======================================================

import type { AccountingProvider, EntityType } from "./accountingProviders";
import type { SyncStatus } from "./accountingSyncEngine";

// ──────────────────────────────────────────────────────
// SYNC LOG ENTRY
// ──────────────────────────────────────────────────────

export interface SyncLogEntry {
  id: string;
  timestamp: string;         // ISO timestamp
  provider: AccountingProvider;
  entityType: EntityType;
  entityId: string;          // Internal entity ID
  jobId: string | null;      // Null for non-job entities (e.g. company-level)
  status: SyncStatus;
  message: string;
  externalId: string | null; // Reference in the accounting system (null if not yet synced)
  initiatedBy: string;       // User who triggered the sync
}

// ──────────────────────────────────────────────────────
// SEED LOG ENTRIES — mirrors the seed sync records
// ──────────────────────────────────────────────────────

export const SEED_SYNC_LOGS: SyncLogEntry[] = [
  {
    id: "log-sync-001",
    timestamp: "2026-05-30T09:15:00Z",
    provider: "quickbooks",
    entityType: "invoice",
    entityId: "inv-draft-001",
    jobId: "dj-kitchen-extract-1",
    status: "syncing",
    message: "Sync initiated for invoice inv-draft-001",
    externalId: null,
    initiatedBy: "Sarah Chen (CEO)",
  },
  {
    id: "log-sync-002",
    timestamp: "2026-05-30T09:15:42Z",
    provider: "quickbooks",
    entityType: "invoice",
    entityId: "inv-draft-001",
    jobId: "dj-kitchen-extract-1",
    status: "synced",
    message: "Invoice synced successfully. External ID: QB-INV-4421",
    externalId: "QB-INV-4421",
    initiatedBy: "Sarah Chen (CEO)",
  },
  {
    id: "log-sync-003",
    timestamp: "2026-05-30T08:45:00Z",
    provider: "xero",
    entityType: "customer",
    entityId: "client-001",
    jobId: "dj-kitchen-extract-1",
    status: "syncing",
    message: "Sync initiated for customer client-001",
    externalId: null,
    initiatedBy: "Sarah Chen (CEO)",
  },
  {
    id: "log-sync-004",
    timestamp: "2026-05-30T08:45:18Z",
    provider: "xero",
    entityType: "customer",
    entityId: "client-001",
    jobId: "dj-kitchen-extract-1",
    status: "synced",
    message: "Customer synced to Xero. External ID: XERO-CUST-7823",
    externalId: "XERO-CUST-7823",
    initiatedBy: "Sarah Chen (CEO)",
  },
  {
    id: "log-sync-005",
    timestamp: "2026-05-30T10:00:00Z",
    provider: "quickbooks",
    entityType: "payroll",
    entityId: "payroll-export-001",
    jobId: "dj-kitchen-extract-1",
    status: "syncing",
    message: "Sync initiated for payroll export payroll-export-001",
    externalId: null,
    initiatedBy: "Sarah Chen (CEO)",
  },
  {
    id: "log-sync-006",
    timestamp: "2026-05-30T10:00:08Z",
    provider: "quickbooks",
    entityType: "payroll",
    entityId: "payroll-export-001",
    jobId: "dj-kitchen-extract-1",
    status: "failed",
    message: "Sync failed: Payroll account mapping not configured for QuickBooks.",
    externalId: null,
    initiatedBy: "Sarah Chen (CEO)",
  },
];

// ──────────────────────────────────────────────────────
// ENGINE FUNCTIONS
// ──────────────────────────────────────────────────────

/**
 * Create a new log entry for a sync event.
 */
export function createSyncLogEntry(
  provider: AccountingProvider,
  entityType: EntityType,
  entityId: string,
  jobId: string | null,
  status: SyncStatus,
  message: string,
  externalId: string | null,
  initiatedBy: string
): SyncLogEntry {
  return {
    id: `log-sync-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    timestamp: new Date().toISOString(),
    provider,
    entityType,
    entityId,
    jobId,
    status,
    message,
    externalId,
    initiatedBy,
  };
}

/**
 * Filter log entries by entity type.
 */
export function filterLogsByEntityType(
  logs: SyncLogEntry[],
  entityType: EntityType
): SyncLogEntry[] {
  return logs.filter((l) => l.entityType === entityType);
}

/**
 * Filter log entries by job.
 */
export function filterLogsByJob(
  logs: SyncLogEntry[],
  jobId: string
): SyncLogEntry[] {
  return logs.filter((l) => l.jobId === jobId);
}

/**
 * Filter log entries by provider.
 */
export function filterLogsByProvider(
  logs: SyncLogEntry[],
  provider: AccountingProvider
): SyncLogEntry[] {
  return logs.filter((l) => l.provider === provider);
}
