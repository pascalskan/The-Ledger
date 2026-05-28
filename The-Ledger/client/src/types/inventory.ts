export interface StockItem {
  id: string;
  name: string;
  sku: string;
  category?: string;
  quantity: number;
  unitCost: number;
  reorderLevel: number;
  locationId: string;
  createdAt: string;
  updatedAt: string;
  companyId: string;
}

export interface Asset {
  id: string;
  name: string;
  serialNumber?: string;
  type: string;
  status: "Active" | "In Service" | "Needs Service" | "Broken" | "Under Repair" | "Retired";
  statusReason?: string;
  locationId: string;
  purchaseDate?: string;
  lastServiceDate?: string;
  nextServiceDate?: string;
  assignedToJobId?: string;
  createdAt: string;
  updatedAt: string;
  companyId: string;
}

export interface Location {
  id: string;
  name: string;
  type: "warehouse" | "vehicle" | "site" | "storage";
  description?: string;
  createdAt: string;
  companyId: string;
}

export interface StockMovement {
  id: string;
  stockItemId: string;
  quantityChange: number;
  reason: "manual adjustment" | "worker report" | "transfer" | "reorder";
  jobId?: string;
  createdAt: string;
  companyId: string;
}

export interface Equipment {
  id: string;
  name: string;
  category: string;
  serialNumber?: string;
  status: "Available" | "Rented" | "Maintenance" | "Retired";
  conditionNotes?: string;

  // Pricing
  dayRate?: number;

  // Maintenance & Asset Info
  purchaseDate?: string;
  purchaseLocation?: string;
  supplier?: string;
  warrantyExpiry?: string;
  lastServiceDate?: string;
  serviceInterval?: string; // e.g., "6 months"
  maintenanceProvider?: {
    name: string;
    contact: string;
  };
  notes?: string;

  companyId: string;
}
