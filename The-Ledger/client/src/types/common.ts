export type JobStatus =
  | "Planned"
  | "Active"
  | "Completed"
  | "Cancelled";

export type PriorityLevel =
  | "Low"
  | "Medium"
  | "High"
  | "Critical";

export type ApprovalStatus =
  | "pending"
  | "approved"
  | "rejected";

export type AuditEntityType =
  | "Job"
  | "Worker"
  | "Client"
  | "Invoice"
  | "ReviewItem"
  | "Role"
  | "User";

export type FinancialSyncStatus =
  | "pending"
  | "synced"
  | "failed";

export type MutationType =
  | "invoice"
  | "expense"
  | "payroll"
  | "adjustment";