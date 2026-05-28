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
