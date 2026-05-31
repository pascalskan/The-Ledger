// ======================================================
// PHASE 5.8 — SYNC OPERATIONS ENGINE
//
// Operational health metrics and failure queue
// for the Reconciliation & Sync Operations Centre.
//
// Architecture: Mock only. No backend. Seeded data.
//
// Doctrine:
//   Operational health visibility is a CEO concern.
//   Failure queues drive intervention workflows.
//   All metrics are computed from sync history.
// ======================================================

import type { AccountingProvider, EntityType } from "./accountingProviders";

// ──────────────────────────────────────────────────────
// OPERATIONAL SYNC HEALTH METRICS
// ──────────────────────────────────────────────────────

export interface SyncHealthMetrics {
  totalSyncs: number;
  successCount: number;
  failureCount: number;
  retryCount: number;
  pendingCount: number;
  successRate: number;  // 0–100
  failureRate: number;  // 0–100
  avgDurationMs: number; // Average sync duration in milliseconds
}

// ──────────────────────────────────────────────────────
// FAILURE QUEUE ENTRY
// A single failed or retry-required operation.
// ──────────────────────────────────────────────────────

export type FailureQueueStatus = "failed" | "retry_required";

export interface FailureQueueEntry {
  id: string;
  provider: AccountingProvider;
  entityType: EntityType;
  entityId: string;
  entityName: string;
  jobId: string | null;
  status: FailureQueueStatus;
  errorReason: string;
  failedAt: string;     // ISO timestamp
  retryCount: number;
  lastRetryAt: string | null; // ISO timestamp
}

// ──────────────────────────────────────────────────────
// SEED DATA
// ──────────────────────────────────────────────────────

export const SEED_SYNC_HEALTH: SyncHealthMetrics = {
  totalSyncs: 247,
  successCount: 231,
  failureCount: 12,
  retryCount: 4,
  pendingCount: 8,
  successRate: 94,
  failureRate: 6,
  avgDurationMs: 1240,
};

export const SEED_FAILURE_QUEUE: FailureQueueEntry[] = [
  {
    id: "fq-001",
    provider: "quickbooks",
    entityType: "payroll",
    entityId: "payroll-export-001",
    entityName: "Payroll Export — Week 22",
    jobId: "dj-kitchen-extract-1",
    status: "failed",
    errorReason: "Payroll account mapping not configured for QuickBooks. Define account code in Entity Mapping settings.",
    failedAt: "2026-05-31T10:00:08Z",
    retryCount: 2,
    lastRetryAt: "2026-05-31T10:05:00Z",
  },
  {
    id: "fq-002",
    provider: "quickbooks",
    entityType: "job",
    entityId: "dj-kitchen-extract-1",
    entityName: "Kitchen extraction & ventilation install",
    jobId: "dj-kitchen-extract-1",
    status: "retry_required",
    errorReason: "Customer record not found in QuickBooks. Create the customer in QuickBooks before syncing the job.",
    failedAt: "2026-05-30T09:30:00Z",
    retryCount: 1,
    lastRetryAt: "2026-05-30T09:30:00Z",
  },
  {
    id: "fq-003",
    provider: "xero",
    entityType: "invoice",
    entityId: "inv-draft-004",
    entityName: "Invoice INV-2026-004",
    jobId: null,
    status: "failed",
    errorReason: "Provider connection error. Xero connection timed out. Reconnect provider in Accounting Settings.",
    failedAt: "2026-05-30T14:22:00Z",
    retryCount: 3,
    lastRetryAt: "2026-05-30T15:00:00Z",
  },
  {
    id: "fq-004",
    provider: "quickbooks",
    entityType: "invoice",
    entityId: "inv-draft-005",
    entityName: "Invoice INV-2026-005",
    jobId: null,
    status: "retry_required",
    errorReason: "Duplicate entity detected in QuickBooks. Remove the duplicate invoice record and retry.",
    failedAt: "2026-05-29T16:10:00Z",
    retryCount: 0,
    lastRetryAt: null,
  },
];

// ──────────────────────────────────────────────────────
// ENGINE FUNCTIONS
// ──────────────────────────────────────────────────────

/**
 * Returns all failed entries from the failure queue.
 */
export function getFailedEntries(
  queue: FailureQueueEntry[]
): FailureQueueEntry[] {
  return queue.filter((e) => e.status === "failed");
}

/**
 * Returns all retry-required entries from the failure queue.
 */
export function getRetryRequiredEntries(
  queue: FailureQueueEntry[]
): FailureQueueEntry[] {
  return queue.filter((e) => e.status === "retry_required");
}

/**
 * Mock retry action: moves a failed entry to retry_required
 * and increments retry count. Returns updated entry.
 */
export function mockRetryEntry(
  entry: FailureQueueEntry
): FailureQueueEntry {
  return {
    ...entry,
    status: "retry_required",
    retryCount: entry.retryCount + 1,
    lastRetryAt: new Date().toISOString(),
  };
}

/**
 * Formats a duration in milliseconds to a readable string.
 */
export function formatAvgDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

export const FAILURE_QUEUE_STATUS_LABELS: Record<FailureQueueStatus, string> = {
  failed: "Failed",
  retry_required: "Retry Required",
};

export const FAILURE_QUEUE_STATUS_COLORS: Record<FailureQueueStatus, string> = {
  failed: "text-red-600 border-red-200 bg-red-50",
  retry_required: "text-amber-600 border-amber-200 bg-amber-50",
};
