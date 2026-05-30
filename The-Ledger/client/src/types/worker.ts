export interface Worker {
  id: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone: string;
  roleIds: string[];
  status: "Active" | "Inactive";
  documents: { id: string; name: string; type: "passport" | "license" | "certificate"; url: string; uploadedAt: string }[];
  companyId: string;

  // Phase 4.5 — Revenue Normalization
  // costRate: what the business pays this worker per hour (internal)
  // billableRate: default rate charged to clients per hour
  costRate?: number;
  billableRate?: number;
}
