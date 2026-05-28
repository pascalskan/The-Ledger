import { ApprovalStatus } from "./common";

export interface ReviewMaterialItem {
  name: string;
  quantity: number;
}

export interface ReviewItem {
  id: string;

  type:
    | "report"
    | "photo"
    | "log";

  title: string;

  submittedBy: string;

  submittedAt: string;

  status: ApprovalStatus;

  content?: string;

  notes?: string;

  url?: string;

  items?: ReviewMaterialItem[];

  jobId: string;

  companyId: string;
}