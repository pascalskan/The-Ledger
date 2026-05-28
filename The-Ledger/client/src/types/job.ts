import { JobStatus, PriorityLevel } from "./common";

export interface JobCostBreakdown {
  labor: number;
  materials: number;
  equipment: number;
  other: number;
}

export interface JobFinancials {
  approvedRevenue: number;
  pendingExposure: number;
  grossProfit: number;
  marginPercent: number;
}

export interface Job {
  id: string;
  companyId: string;

  title: string;
  description?: string;

  clientId: string;
  managerId?: string;

  workerIds: string[];
  assetIds: string[];

  status: JobStatus;
  priority: PriorityLevel;

  estimatedRevenue?: number;

  costs: JobCostBreakdown;
  financials: JobFinancials;

  createdAt: string;
  updatedAt: string;
}
