import { ApprovalStatus } from "./common";

export interface LaborEntry {
  hours: number;
  hourlyRate?: number;
}

export interface MaterialUsage {
  stockItemId: string;
  quantity: number;
}

export interface EquipmentUsage {
  assetId: string;
  hoursUsed: number;
}

export interface ExpenseEntry {
  description: string;
  amount: number;
  receiptUrl?: string;
}

export interface WorkerReport {
  id: string;

  workerId: string;
  jobId: string;

  labor?: LaborEntry[];

  materials?: MaterialUsage[];

  equipment?: EquipmentUsage[];

  expenses?: ExpenseEntry[];

  notes?: string;

  submittedAt: string;
}

export interface ReviewItem {
  id: string;

  sourceReportId: string;

  jobId: string;
  workerId: string;

  status: ApprovalStatus;

  rejectionNotes?: string;

  reviewedBy?: string;
  reviewedAt?: string;

  mutationEventIds?: string[];

  submittedAt: string;
}
