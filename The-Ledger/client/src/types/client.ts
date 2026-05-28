export interface Client {
  id: string;
  clientId: string;
  name: string;
  email: string;
  phone: string;
  billingAddress: string;
  notes?: string;

  // Relationship management
  tags?: string[];
  status?: "Active" | "On Hold" | "Do Not Serve";
  paymentTermsDays?: number;

  // Relationship documents
  documents?: {
    id: string;
    name: string;
    type:
      | "contract"
      | "purchase_order"
      | "credit_application"
      | "insurance"
      | "site_induction"
      | "access_requirements"
      | "nda"
      | "other";
    url: string;
    status?: "Required" | "Received" | "Approved" | "Expired";
    expiryDate?: string;
    uploadedAt?: string;
  }[];

  companyId: string;
}
