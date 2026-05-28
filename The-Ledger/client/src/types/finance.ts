import { FinancialSyncStatus, MutationType } from "./common";

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
