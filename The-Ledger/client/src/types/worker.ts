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
}
