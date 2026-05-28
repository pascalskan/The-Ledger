export type ApprovalStatus =
  | "pending"
  | "approved"
  | "rejected"
  | "needs-correction";

export type JobStatus =
  | "planned"
  | "active"
  | "on-hold"
  | "completed"
  | "cancelled";

export type PriorityLevel =
  | "low"
  | "medium"
  | "high"
  | "critical";

export type FinancialSyncStatus =
  | "not-synced"
  | "pending-sync"
  | "synced"
  | "sync-error";

export type AuditEntityType =
  | "job"
  | "worker"
  | "review"
  | "invoice"
  | "expense"
  | "stock"
  | "asset"
  | "client";

export type MutationType =
  | "labor-cost"
  | "material-cost"
  | "equipment-cost"
  | "expense-cost"
  | "invoice-line"
  | "inventory-deduction";
