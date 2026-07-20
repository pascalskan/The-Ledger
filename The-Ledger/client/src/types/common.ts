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

// ApprovalStatus was removed here. It existed solely to type the stale
// ReviewItem in types/review.ts (now deleted) and had no other consumer.
//
// It was also wrong, and dangerously so: it listed only pending/approved/
// rejected, omitting "needs-correction" and "escalated". Those are real
// Review Centre lifecycle states, so any code typed against it would be told
// by the compiler that a correction or escalation could never occur.
//
// The authoritative review status union lives on ReviewItem in lib/mockData.ts.

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