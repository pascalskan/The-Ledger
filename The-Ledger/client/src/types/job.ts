import { JobStatus, PriorityLevel } from "./common";

export interface JobCostBreakdown {
  labour: number;
  equipment: number;
  materials: number;
  other: number;
}

export interface JobFinancials {
  approvedRevenue: number;
  pendingExposure: number;
  grossProfit: number;
  marginPercent: number;
}

export interface JobDocument {
  id: string;
  name: string;
  url: string;
  uploadedAt: string;
}

export interface EquipmentUsage {
  equipmentId: string;
  days: number;
  dayRateAtTime: number;
  note?: string;
}

export interface Job {
  id: string;
  jobId: string;

  companyId: string;

  title: string;
  description: string;

  clientId: string;
  managerId?: string;

  status: JobStatus;
  priority: PriorityLevel;

  startAt: string;
  endAt: string;

  locationAddress: string;

  latitude?: number;
  longitude?: number;

  assignedWorkerIds: string[];
  assignedEquipmentIds: string[];

  equipmentUsage?: EquipmentUsage[];

  documents: JobDocument[];

  estimatedRevenue?: number;

  costs: JobCostBreakdown;

  financials?: JobFinancials;

  createdAt: string;
  updatedAt: string;
}