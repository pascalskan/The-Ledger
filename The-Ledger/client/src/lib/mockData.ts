import { useState, useEffect } from "react";
import {
  PermissionKey,
  Role,
  User,
} from "@/types/auth";

import { Job } from "@/types/job";

import { Client } from "@/types/client";

import { Worker } from "@/types/worker";

import { ReviewItem } from "@/types/review";

// Types
export type WorkerRoleTag = "Owner" | "Admin" | "Manager" | "Supervisor" | "Crew Lead" | "Worker" | "Contractor" | "Driver";

export const PERMISSION_LABELS: Record<PermissionKey, string> = {
  view_jobs: "View jobs",
  edit_jobs: "Edit jobs",
  manage_workers: "Manage workers",
  assign_roles: "Assign roles",
  view_audit_log: "View audit log",
  manage_clients: "Manage clients",
  manage_equipment: "Manage equipment",
  manage_invoicing: "Manage invoicing",
  view_documents: "View documents",
  manage_settings: "Manage settings",
};

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

export interface InvoiceLineItem {
  description: string;
  qty: number;
  unitPrice: number;
}

export interface Invoice {
  id: string;
  invoiceId: string;
  clientId: string;
  jobId?: string;
  issueDate: string;
  dueDate: string;
  status: "Draft" | "Sent" | "Paid" | "Overdue" | "Void" | "Exported";
  lineItems: InvoiceLineItem[];
  notes?: string;
  companyId: string;
  quickbooksInvoiceId?: string;
}

export interface AuditLog {
  id: string;
  actorName: string;
  action: "CREATE" | "UPDATE" | "DELETE" | "ASSIGN" | "LOGIN" | "VIOLATION" | "OVERRIDE" | "SEND";
  entity: string;
  details: string;
  timestamp: string;
}

export interface CompanySettings {
  companyLegalName: string;
  registrationNumber?: string;
  taxId?: string; // VAT / Tax ID
  email?: string;
  phone?: string;
  website?: string;
  
  bankName: string;
  accountName: string;
  accountNumber: string;
  sortCode: string;
  address: string;
  
  branding?: {
    logoUrl?: string;
    primaryColor?: string;
  };

  accountingIntegration?: {
    status: "Not Connected" | "Connected" | "Syncing" | "Error";
    provider?: "quickbooks" | "xero" | "freshbooks" | "zoho";
    accessToken?: string;
    realmId?: string;
    connectedAt?: string;
    lastSyncAt?: string;
    lastSyncStatus?: "Success" | "Failed";
    errorMessage?: string;
    syncLogs: {
      timestamp: string;
      action: string;
      status: "Success" | "Failed";
      message?: string;
    }[];
  };
}

export interface Automation {
  id: string;
  name: string;
  triggerType: string;
  condition: string;
  actionType: string;
  scope: string;
  isActive: boolean;
  lastTriggered?: string;
  companyId: string;
}

export interface AutomationLog {
  id: string;
  timestamp: string;
  automationName: string;
  entityAffected: string;
  status: "Success" | "Failed";
  companyId: string;
}

// Constants
export const REAL_COMPANY_ID = "comp-1";
export const DEMO_COMPANY_ID = "comp-demo";

// Seed Data
const INITIAL_CLIENTS: Client[] = [];
const INITIAL_WORKERS: Worker[] = [];
const INITIAL_EQUIPMENT: Equipment[] = [];
const INITIAL_JOBS: Job[] = [];
const INITIAL_INVOICES: Invoice[] = [];
const INITIAL_STOCK_ITEMS: StockItem[] = [];
const INITIAL_ASSETS: Asset[] = [];
const INITIAL_LOCATIONS: Location[] = [];
const INITIAL_STOCK_MOVEMENTS: StockMovement[] = [];
const INITIAL_REVIEW_ITEMS: ReviewItem[] = [];

// --- DEMO DATA ---
const DEMO_LOCATIONS: Location[] = [
  { id: "loc-1", name: "Main Warehouse", type: "warehouse", description: "Central hub for all materials", createdAt: new Date().toISOString(), companyId: DEMO_COMPANY_ID },
  { id: "loc-2", name: "Van #12", type: "vehicle", description: "Transit van for mobile crew", createdAt: new Date().toISOString(), companyId: DEMO_COMPANY_ID },
  { id: "loc-3", name: "Site A Storage", type: "site", description: "Secure lockup at project site", createdAt: new Date().toISOString(), companyId: DEMO_COMPANY_ID },
];

const DEMO_STOCK_ITEMS: StockItem[] = [
  { id: "stock-1", name: "1/2 Copper Elbow", sku: "SKU-123", category: "Plumbing", quantity: 45, unitCost: 0.35, reorderLevel: 100, locationId: "loc-1", createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), companyId: DEMO_COMPANY_ID },
  { id: "stock-2", name: "CAT6 Cable (305m box)", sku: "SKU-456", category: "Electrical", quantity: 12, unitCost: 85.00, reorderLevel: 10, locationId: "loc-2", createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), companyId: DEMO_COMPANY_ID },
  { id: "stock-3", name: "15mm Isolating Valve", sku: "SKU-789", category: "Plumbing", quantity: 300, unitCost: 2.10, reorderLevel: 150, locationId: "loc-2", createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), companyId: DEMO_COMPANY_ID },
  { id: "stock-4", name: "Silicone Sealant White", sku: "SKU-012", category: "Consumables", quantity: 8, unitCost: 4.50, reorderLevel: 20, locationId: "loc-3", createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), companyId: DEMO_COMPANY_ID },
];

const DEMO_ASSETS: Asset[] = [
  { id: "asset-1", name: "Van #12 (Ford Transit)", serialNumber: "VN-1234", type: "Vehicle", status: "Active", locationId: "loc-2", purchaseDate: "2020-01-15", lastServiceDate: "2023-01-05", nextServiceDate: "2024-01-05", assignedToJobId: "dj-kitchen-extract-1", createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), companyId: DEMO_COMPANY_ID },
  { id: "asset-2", name: "Scissor Lift 19ft", serialNumber: "SL-5678", type: "Heavy Equipment", status: "In Service", locationId: "loc-1", purchaseDate: "2021-06-20", lastServiceDate: "2023-05-12", nextServiceDate: "2023-11-12", createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), companyId: DEMO_COMPANY_ID },
  { id: "asset-3", name: "Hilti SDS Drill", serialNumber: "HL-9012", type: "Power Tool", status: "Active", locationId: "loc-2", purchaseDate: "2022-03-10", lastServiceDate: "2023-08-20", nextServiceDate: "2024-02-20", assignedToJobId: "dj-showcase-maint-1", createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), companyId: DEMO_COMPANY_ID },
  { id: "asset-4", name: "Portable Generator 5kVA", serialNumber: "PG-3456", type: "Power Equipment", status: "Needs Service", locationId: "loc-3", purchaseDate: "2019-11-05", lastServiceDate: "2022-09-10", nextServiceDate: "2023-09-10", createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), companyId: DEMO_COMPANY_ID },
];

const DEMO_STOCK_MOVEMENTS: StockMovement[] = [];

const DEMO_REVIEW_ITEMS: ReviewItem[] = [
  {
    id: "rev-1",
    type: "report",
    title: "Daily Progress Report",
    submittedBy: "Sophie Taylor",
    submittedAt: new Date(Date.now() - 2 * 3600000).toISOString(), // 2 hours ago
    status: "pending",
    content: "Completed framing for sector A. Encountered some delays with material delivery but managed to stay on schedule.",
    items: [
      { name: "2x4 Wood Studs", quantity: 45 },
      { name: "Nails (box)", quantity: 2 }
    ],
    jobId: "dj-kitchen-extract-1",
    companyId: DEMO_COMPANY_ID
  },
  {
    id: "rev-2",
    type: "photo",
    title: "Sector A Framing Complete",
    submittedBy: "Sophie Taylor",
    submittedAt: new Date(Date.now() - 2 * 3600000).toISOString(),
    status: "pending",
    url: "https://images.unsplash.com/photo-1541888086925-0c13d3c4db46?q=80&w=600&auto=format&fit=crop",
    jobId: "dj-kitchen-extract-1",
    companyId: DEMO_COMPANY_ID
  },
  {
    id: "rev-3",
    type: "photo",
    title: "Material Delivery Issue",
    submittedBy: "Sophie Taylor",
    submittedAt: new Date(Date.now() - 3 * 3600000).toISOString(),
    status: "pending",
    url: "https://images.unsplash.com/photo-1503387762-592deb58ef4e?q=80&w=600&auto=format&fit=crop",
    notes: "Delivery truck couldn't access loading bay due to parked vehicles.",
    jobId: "dj-kitchen-extract-1",
    companyId: DEMO_COMPANY_ID
  },
  {
    id: "rev-4",
    type: "log",
    title: "Safety Incident Near Miss",
    submittedBy: "Ben Hughes",
    submittedAt: new Date(Date.now() - 24 * 3600000).toISOString(), // 1 day ago
    status: "approved",
    content: "Worker slipped on wet surface near entrance. No injuries but area needs better signage.",
    jobId: "dj-showcase-maint-1",
    companyId: DEMO_COMPANY_ID
  }
];

const DEMO_CLIENTS: Client[] = [
  {
    id: "dc1",
    clientId: "DEMO-CL-0001",
    name: "HSS Limited",
    email: "accounts@hsslimited.co.uk",
    phone: "0161 555 0101",
    billingAddress: "Unit 14, Riverside Industrial Estate, Manchester, M15 4FN",
    notes: "Trading hours: 7am–11pm. Any shutdowns must be agreed 48hrs in advance.",

    status: "On Hold",
    tags: ["Kitchen", "Night shift"],
    paymentTermsDays: 14,

    companyId: DEMO_COMPANY_ID,
  },
  {
    id: "dc2",
    clientId: "DEMO-CL-0002",
    name: "Showcase Systems Ltd",
    email: "finance@showcasesystems.co.uk",
    phone: "020 555 0199",
    billingAddress: "45 Kingsway, London, WC2B 6SR",
    notes: "Standard 14-day payment terms.",
    companyId: DEMO_COMPANY_ID,
  },
];

const DEMO_WORKERS: Worker[] = [
  {
    id: "dw1",
    firstName: "Amir",
    lastName: "Khan",
    email: "amir.khan@example-business.com",
    phone: "0161 555 0201",
    roleIds: ["drole-pm"],
    status: "Active",
    documents: [{ id: "wd-1", name: "CSCS_Card.pdf", type: "certificate", url: "#", uploadedAt: new Date().toISOString() }],
    companyId: DEMO_COMPANY_ID,
  },
  {
    id: "dw2",
    firstName: "Sophie",
    lastName: "Taylor",
    email: "sophie.taylor@example-business.com",
    phone: "0161 555 0202",
    roleIds: ["drole-worker"],
    status: "Active",
    documents: [{ id: "wd-2", name: "Driving_Licence.jpg", type: "license", url: "#", uploadedAt: new Date().toISOString() }],
    companyId: DEMO_COMPANY_ID,
  },
  {
    id: "dw3",
    firstName: "Ben",
    lastName: "Hughes",
    email: "ben.hughes@example-business.com",
    phone: "0161 555 0203",
    roleIds: ["drole-worker"],
    status: "Active",
    documents: [{ id: "wd-3", name: "IPA Fume_Extraction_Cert.pdf", type: "certificate", url: "#", uploadedAt: new Date().toISOString() }],
    companyId: DEMO_COMPANY_ID,
  },
  {
    id: "dw4",
    firstName: "Priya",
    lastName: "Patel",
    email: "priya.patel@example-business.com",
    phone: "020 555 0204",
    roleIds: ["drole-worker"],
    status: "Active",
    documents: [{ id: "wd-4", name: "RAMS_Signoff.pdf", type: "certificate", url: "#", uploadedAt: new Date().toISOString() }],
    companyId: DEMO_COMPANY_ID,
  },
];

const DEMO_EQUIPMENT: Equipment[] = [
  {
    id: "de1",
    name: "Hiab support (canopy lift)",
    category: "Vehicles",
    status: "Available",
    dayRate: 420,
    purchaseDate: "2023-05-12",
    supplier: "Global Machinery Ltd",
    lastServiceDate: "2025-11-14",
    serviceInterval: "12 months",
    notes: "Used for canopy + duct sections handling.",
    companyId: DEMO_COMPANY_ID,
  },
  {
    id: "de3",
    name: "Flatbed truck (materials run)",
    category: "Vehicles",
    status: "Available",
    dayRate: 280,
    purchaseDate: "2022-03-22",
    supplier: "Industrial Supply Co",
    lastServiceDate: "2025-10-03",
    serviceInterval: "12 months",
    notes: "On-site logistics + waste transfer.",
    companyId: DEMO_COMPANY_ID,
  },
  {
    id: "de4",
    name: "Scaffolding (access)",
    category: "Support",
    status: "Available",
    dayRate: 90,
    purchaseDate: "2021-07-01",
    supplier: "Access & Safety Supplies",
    lastServiceDate: "2025-09-18",
    serviceInterval: "12 months",
    notes: "Night shift access for void/stairwell work.",
    companyId: DEMO_COMPANY_ID,
  },
  {
    id: "de5",
    name: "Generator (temporary power)",
    category: "Electrical",
    status: "Available",
    dayRate: 110,
    purchaseDate: "2024-01-09",
    supplier: "PowerHire UK",
    lastServiceDate: "2025-12-05",
    serviceInterval: "6 months",
    notes: "Used during staged shutdowns.",
    companyId: DEMO_COMPANY_ID,
  },
  {
    id: "de8",
    name: "Forklift (pallet handling)",
    category: "Heavy Machinery",
    status: "Available",
    dayRate: 360,
    purchaseDate: "2020-04-30",
    supplier: "Global Machinery Ltd",
    lastServiceDate: "2025-08-12",
    serviceInterval: "12 months",
    notes: "Handling fan set + duct bundles.",
    companyId: DEMO_COMPANY_ID,
  },
  {
    id: "de11",
    name: "Crew van (tools transport)",
    category: "Vehicles",
    status: "Available",
    dayRate: 120,
    purchaseDate: "2022-11-15",
    supplier: "FleetWorks",
    lastServiceDate: "2025-12-20",
    serviceInterval: "12 months",
    notes: "Primary crew vehicle.",
    companyId: DEMO_COMPANY_ID,
  },
  {
    id: "de12",
    name: "Ladder set (plant room access)",
    category: "Support",
    status: "Available",
    dayRate: 35,
    purchaseDate: "2024-06-02",
    supplier: "Access & Safety Supplies",
    lastServiceDate: "2025-07-09",
    serviceInterval: "12 months",
    notes: "Quick access for checks.",
    companyId: DEMO_COMPANY_ID,
  },
];

const DEMO_JOBS: Job[] = [
  // Showcase job (detailed) for Example Business
  {
    id: "dj-kitchen-extract-1",
    jobId: "DEMO-JOB-0201",
    clientId: "dc1",
    title: "Kitchen extraction & ventilation install",
    description:
      "Supply & install a compliant commercial kitchen extraction and ventilation system, including canopy, ducting, access panels, fan set, and commissioning. Work to be coordinated around trading hours with staged shutdowns.",
    status: "Completed",
    priority: "High",
    startAt: new Date(Date.now() - 12 * 86400000).toISOString(),
    endAt: new Date(Date.now() - 7 * 86400000).toISOString(),
    locationAddress: "Unit 14, Riverside Industrial Estate, Manchester, M15 4FN",
    latitude: 53.477,
    longitude: -2.244,
    assignedWorkerIds: ["dw2", "dw3", "du3"],
    assignedEquipmentIds: ["de1", "de3", "de4", "de5", "de8", "de11", "de12"],
    equipmentUsage: [
      { equipmentId: "de1", days: 2, dayRateAtTime: 420, note: "Hiab support for canopy + duct sections" },
      { equipmentId: "de3", days: 1, dayRateAtTime: 280, note: "Materials run + waste transfer" },
      { equipmentId: "de4", days: 3, dayRateAtTime: 90, note: "Stairwell/void access (night shift)" },
      { equipmentId: "de5", days: 2, dayRateAtTime: 110, note: "Test + temporary power during shutdown" },
      { equipmentId: "de8", days: 1, dayRateAtTime: 360, note: "Pallet handling for fan set + duct sections" },
      { equipmentId: "de11", days: 3, dayRateAtTime: 120, note: "Crew transport + tools" },
      { equipmentId: "de12", days: 4, dayRateAtTime: 35, note: "Access/plant room checks" },
    ],
    documents: [
      {
        id: "dd-kex-1",
        name: "Site_Survey_Photos.zip",
        url: "#",
        uploadedAt: new Date(Date.now() - 15 * 86400000).toISOString(),
      },
      {
        id: "dd-kex-2",
        name: "Ventilation_Drawings_v3.pdf",
        url: "#",
        uploadedAt: new Date(Date.now() - 13 * 86400000).toISOString(),
      },
      {
        id: "dd-kex-3",
        name: "RAMS_Extraction_Install.pdf",
        url: "#",
        uploadedAt: new Date(Date.now() - 12 * 86400000).toISOString(),
      },
      {
        id: "dd-kex-4",
        name: "Commissioning_Certificate.pdf",
        url: "#",
        uploadedAt: new Date(Date.now() - 7 * 86400000).toISOString(),
      },
    ],
    costs: {
      labour: 2860,
      equipment: 0,
      materials: 1385,
      other: 0,
    },

    createdAt: "2025-01-01T00:00:00Z",
    updatedAt: "2025-01-01T00:00:00Z",

    companyId: DEMO_COMPANY_ID,
  },

  // Second demo job (lightweight)
  {
    id: "dj-showcase-maint-1",
    jobId: "DEMO-JOB-0202",
    clientId: "dc1",
    title: "Preventative maintenance visit",
    description:
      "Routine site visit: inspect equipment, test emergency stops, replace worn consumables, and provide a short condition report.",
    status: "Active",
    priority: "Medium",
    startAt: new Date(Date.now() + 2 * 86400000).toISOString(),
    endAt: new Date(Date.now() + 2 * 86400000 + 4 * 3600000).toISOString(),
    locationAddress: "45 Kingsway, London, WC2B 6SR",
    latitude: 51.515,
    longitude: -0.118,
    assignedWorkerIds: ["dw4", "du3"],
    assignedEquipmentIds: ["de11"],
    equipmentUsage: [
      {
        equipmentId: "de11",
        days: 1,
        dayRateAtTime: 120,
        note: "Travel + tools",
      },
    ],
    documents: [
      {
        id: "dd-pm-1",
        name: "PM_Checklist.pdf",
        url: "#",
        uploadedAt: new Date().toISOString(),
      },
    ],
    costs: {
      labour: 420,
      equipment: 0,
      materials: 35,
      other: 0,
    },

    createdAt: "2025-01-01T00:00:00Z",
    updatedAt: "2025-01-01T00:00:00Z",

    companyId: DEMO_COMPANY_ID,
  },
];

const DEMO_INVOICES: Invoice[] = [
  {
    id: "dinv-kex-1",
    invoiceId: "EXB-2026-0007",
    clientId: "dc1",
    jobId: "dj-kitchen-extract-1",
    issueDate: new Date(Date.now() - 6 * 86400000).toISOString(),
    dueDate: new Date(Date.now() + 8 * 86400000).toISOString(),
    status: "Sent",
    lineItems: [
      { description: "Labour: Installation & fitting", qty: 1, unitPrice: 2860 },
      { description: "Equipment (per day): Hiab support (canopy lift)", qty: 2, unitPrice: 420 },
      { description: "Equipment (per day): Flatbed truck (materials run)", qty: 1, unitPrice: 280 },
      { description: "Equipment (per day): Scaffolding (access)", qty: 3, unitPrice: 90 },
      { description: "Equipment (per day): Generator (temporary power)", qty: 2, unitPrice: 110 },
      { description: "Equipment (per day): Forklift (pallet handling)", qty: 1, unitPrice: 360 },
      { description: "Equipment (per day): Crew van (tools transport)", qty: 3, unitPrice: 120 },
      { description: "Equipment (per day): Ladder set (plant room access)", qty: 4, unitPrice: 35 },
      { description: "Materials: Ducting, canopy fixings, sealants & consumables", qty: 1, unitPrice: 1385 },
    ],
    notes: "Works completed and commissioned. Please include invoice reference with payment.",
    companyId: DEMO_COMPANY_ID,
  },
  {
    id: "dinv-maint-1",
    invoiceId: "EXB-2026-0008",
    clientId: "dc2",
    jobId: "dj-showcase-maint-1",
    issueDate: new Date(Date.now() - 1 * 86400000).toISOString(),
    dueDate: new Date(Date.now() + 13 * 86400000).toISOString(),
    status: "Draft",
    lineItems: [
      { description: "Labour: Preventative maintenance visit", qty: 1, unitPrice: 420 },
      { description: "Equipment (per day): Crew van (tools transport)", qty: 1, unitPrice: 120 },
      { description: "Materials: Replacement consumables", qty: 1, unitPrice: 35 },
    ],
    notes: "Draft awaiting scheduling confirmation.",
    companyId: DEMO_COMPANY_ID,
  },
];


const SEED_USERS: User[] = [
  // Real Users
  { id: "u1", name: "Admin CEO", email: "ceo@ledger.com", roleIds: ["role-ceo"], companyId: REAL_COMPANY_ID },
  { id: "u2", name: "Project Manager", email: "pm@ledger.com", roleIds: ["role-pm"], companyId: REAL_COMPANY_ID },
  { id: "u3", name: "Field Worker", email: "worker@ledger.com", roleIds: ["role-worker"], companyId: REAL_COMPANY_ID },

  // Demo Users
  { id: "du1", name: "Demo CEO", email: "demo.ceo@example.com", roleIds: ["drole-ceo"], companyId: DEMO_COMPANY_ID },
  { id: "du2", name: "Demo PM", email: "demo.pm@example.com", roleIds: ["drole-pm"], companyId: DEMO_COMPANY_ID },
  { id: "du3", name: "Demo Worker", email: "demo.worker@example.com", roleIds: ["drole-worker"], companyId: DEMO_COMPANY_ID },
];

const DEFAULT_SETTINGS: CompanySettings = {
  companyLegalName: "Omnisoftware Operations Ltd",
  registrationNumber: "00000000",
  taxId: "GB 000 0000 00",
  email: "accounts@omnisoftware.com",
  phone: "020 7000 0000",
  
  bankName: "Commercial Bank",
  accountName: "OMNI LEDGER OPS",
  accountNumber: "88229911",
  sortCode: "20-11-99",
  address: "123 Technology Way, London, EC1 2AA"
};

const DEMO_SETTINGS: CompanySettings = {
  companyLegalName: "Example Business Ltd",
  registrationNumber: "12345678",
  taxId: "GB 123 4567 89",
  email: "accounts@example-business.com",
  phone: "0161 123 4567",

  bankName: "Demo Bank",
  accountName: "EXAMPLE BIZ",
  accountNumber: "12345678",
  sortCode: "00-00-00",
  address: "1 Demo Plaza, Example City, EX1 1MP"
};

const DEMO_AUTOMATIONS: Automation[] = [
  {
    id: "auto-1",
    name: "Auto-Draft Invoice on Job Completion",
    triggerType: "Status Change",
    condition: "Job Status == Completed",
    actionType: "Create Invoice",
    scope: "All Jobs",
    isActive: true,
    lastTriggered: new Date(Date.now() - 2 * 86400000).toISOString(),
    companyId: DEMO_COMPANY_ID,
  },
  {
    id: "auto-2",
    name: "Alert PM if Job Overdue",
    triggerType: "Date Reached",
    condition: "End Date < Today && Status != Completed",
    actionType: "Send Email",
    scope: "Critical Jobs",
    isActive: false,
    companyId: DEMO_COMPANY_ID,
  },
  {
    id: "auto-3",
    name: "Sync to QuickBooks upon Invoice Sent",
    triggerType: "Status Change",
    condition: "Invoice Status == Sent",
    actionType: "Export to QuickBooks",
    scope: "All Invoices",
    isActive: true,
    lastTriggered: new Date(Date.now() - 1 * 86400000).toISOString(),
    companyId: DEMO_COMPANY_ID,
  },
  {
    id: "auto-4",
    name: "Assign Equipment based on Job Tag",
    triggerType: "Condition Met",
    condition: "Job Tags contains 'Heavy Lift'",
    actionType: "Assign Equipment: Crane",
    scope: "Construction Jobs",
    isActive: true,
    companyId: DEMO_COMPANY_ID,
  },
  {
    id: "auto-5",
    name: "Send Client SMS Reminder 24h Before",
    triggerType: "Date Reached",
    condition: "Start Date == Today + 1",
    actionType: "Send SMS",
    scope: "All Jobs",
    isActive: false,
    companyId: DEMO_COMPANY_ID,
  },
];

const DEMO_AUTOMATION_LOGS: AutomationLog[] = [
  {
    id: "alog-1",
    timestamp: new Date(Date.now() - 2 * 86400000).toISOString(),
    automationName: "Auto-Draft Invoice on Job Completion",
    entityAffected: "Job: Kitchen extraction (dj-kitchen-extract-1)",
    status: "Success",
    companyId: DEMO_COMPANY_ID,
  }
];

// State
let clients = [...INITIAL_CLIENTS, ...DEMO_CLIENTS];
let workers = [...INITIAL_WORKERS, ...DEMO_WORKERS];
let equipment = [...INITIAL_EQUIPMENT, ...DEMO_EQUIPMENT];
let jobs = [...INITIAL_JOBS, ...DEMO_JOBS];
let invoices = [...INITIAL_INVOICES, ...DEMO_INVOICES];
let automations = [...DEMO_AUTOMATIONS];
let automationLogs = [...DEMO_AUTOMATION_LOGS];
let stockItems = [...INITIAL_STOCK_ITEMS, ...DEMO_STOCK_ITEMS];
let assets = [...INITIAL_ASSETS, ...DEMO_ASSETS];
let locations = [...INITIAL_LOCATIONS, ...DEMO_LOCATIONS];
let stockMovements = [...INITIAL_STOCK_MOVEMENTS, ...DEMO_STOCK_MOVEMENTS];
let reviewItems = [...INITIAL_REVIEW_ITEMS, ...DEMO_REVIEW_ITEMS];
let logs: AuditLog[] = [{ id: "1", actorName: "System", action: "CREATE", entity: "System", details: "Busy schedule dataset initialized", timestamp: new Date().toISOString() }];
let roles: Role[] = [
  {
    id: "role-ceo",
    name: "CEO",
    description: "Full access across the business.",
    permissions: [
      "view_jobs",
      "edit_jobs",
      "manage_workers",
      "assign_roles",
      "view_audit_log",
      "manage_clients",
      "manage_equipment",
      "manage_invoicing",
      "view_documents",
      "manage_settings",
    ],
    companyId: REAL_COMPANY_ID,
  },
  {
    id: "role-pm",
    name: "Project Manager",
    description: "Manage jobs, clients, equipment, and invoicing.",
    permissions: [
      "view_jobs",
      "edit_jobs",
      "manage_workers",
      "manage_clients",
      "manage_equipment",
      "manage_invoicing",
      "view_documents",
    ],
    companyId: REAL_COMPANY_ID,
  },
  {
    id: "role-worker",
    name: "Worker",
    description: "View assigned work and documents.",
    permissions: ["view_jobs", "view_documents"],
    companyId: REAL_COMPANY_ID,
  },
  {
    id: "role-admin",
    name: "Admin",
    description: "Manage users and roles.",
    permissions: ["manage_workers", "assign_roles"],
    companyId: REAL_COMPANY_ID,
  },

  // Demo roles
  {
    id: "drole-ceo",
    name: "CEO",
    description: "Full access across the demo business.",
    permissions: [
      "view_jobs",
      "edit_jobs",
      "manage_workers",
      "assign_roles",
      "view_audit_log",
      "manage_clients",
      "manage_equipment",
      "manage_invoicing",
      "view_documents",
      "manage_settings",
    ],
    companyId: DEMO_COMPANY_ID,
  },
  {
    id: "drole-pm",
    name: "Project Manager",
    description: "Manage jobs, clients, equipment, and invoicing.",
    permissions: [
      "view_jobs",
      "edit_jobs",
      "manage_workers",
      "manage_clients",
      "manage_equipment",
      "manage_invoicing",
      "view_documents",
    ],
    companyId: DEMO_COMPANY_ID,
  },
  {
    id: "drole-worker",
    name: "Worker",
    description: "View assigned work and documents.",
    permissions: ["view_jobs", "view_documents"],
    companyId: DEMO_COMPANY_ID,
  },
  {
    id: "drole-admin",
    name: "Admin",
    description: "Manage users and roles.",
    permissions: ["manage_workers", "assign_roles"],
    companyId: DEMO_COMPANY_ID,
  },
];

let users = [...SEED_USERS];
let currentUser: User | null = null;
let companySettings = { ...DEFAULT_SETTINGS }; // This will be per-request simulated in useStore
let demoSettings = { ...DEMO_SETTINGS };

// Hooks
export const useAuth = () => {
  const [user, setUser] = useState<User | null>(currentUser);
  
  const login = (email: string) => {
    const found = SEED_USERS.find(u => u.email === email) || SEED_USERS[0];
    currentUser = found;
    setUser(found);
  };

  const logout = () => {
    currentUser = null;
    setUser(null);
  };

  return { user, login, logout, seedUsers: users };
};

export const useStore = () => {
  const [version, setVersion] = useState(0);
  const refresh = () => setVersion(v => v + 1);

  // Get current company ID from the global user state (or default to real company if not logged in to avoid crashes, though auth should prevent this)
  const currentCompanyId = currentUser?.companyId || REAL_COMPANY_ID;

  const addLog = (action: AuditLog["action"], entity: string, details: string) => {
    logs.unshift({
      id: Math.random().toString(36).substr(2, 9),
      actorName: currentUser?.name || "System",
      action,
      entity,
      details,
      timestamp: new Date().toISOString()
    });
  };

  // Filter data by company
  const filteredClients = clients.filter(c => c.companyId === currentCompanyId);
  const filteredWorkers = workers.filter(w => w.companyId === currentCompanyId);
  const filteredEquipment = equipment.filter(e => e.companyId === currentCompanyId);
  const filteredJobs = jobs.filter(j => j.companyId === currentCompanyId);
  const filteredInvoices = invoices.filter(i => i.companyId === currentCompanyId);
  const filteredAutomations = automations.filter(a => a.companyId === currentCompanyId);
  const filteredAutomationLogs = automationLogs.filter(a => a.companyId === currentCompanyId);
  const filteredUsers = users.filter(u => u.companyId === currentCompanyId);
  const filteredRoles = roles.filter(r => r.companyId === currentCompanyId);
  const filteredStockItems = stockItems.filter(s => s.companyId === currentCompanyId);
  const filteredAssets = assets.filter(a => a.companyId === currentCompanyId);
  const filteredLocations = locations.filter(l => l.companyId === currentCompanyId);
  const filteredStockMovements = stockMovements.filter(m => m.companyId === currentCompanyId);
  const filteredReviewItems = reviewItems.filter(r => r.companyId === currentCompanyId);
  
  // Note: Logs are currently global in this mock implementation but in a real app would be filtered. 
  // For now, let's just filter them by actor? Or leave them global for simplicity as they are audit logs?
  // The requirement says: "Example Business data is visible ONLY to Example Business users."
  // So we should filter logs too if possible, but logs don't have companyId. 
  // We can assume logs created by users of a company belong to that company. 
  // For simplicity in this mock, we'll leave logs global or we'd need to migrate logs to have companyId.
  // Let's migrate logs to have companyId dynamically for new logs, but old logs are ambiguous.
  // Actually, let's just return all logs for now as it's a mock, or filter by user name if we really wanted to.
  // Better approach: Let's just not filter logs strictly for this mock to avoid breaking existing "System" logs which have no user.

  const currentSettings = currentCompanyId === DEMO_COMPANY_ID ? demoSettings : companySettings;

  return {
    clients: filteredClients,
    workers: filteredWorkers,
    equipment: filteredEquipment,
    jobs: filteredJobs,
    invoices: filteredInvoices,
    automations: filteredAutomations,
    automationLogs: filteredAutomationLogs,
    users: filteredUsers,
    roles: filteredRoles,
    stockItems: filteredStockItems,
    assets: filteredAssets,
    locations: filteredLocations,
    stockMovements: filteredStockMovements,
    reviewItems: filteredReviewItems,
    logs, 
    companySettings: currentSettings,
    
    // Portal access (unfiltered for mockup portal auth)
    allJobs: jobs,
    allClients: clients,
    allWorkers: workers,
    allRoles: roles,
    allEquipment: equipment,
    allStockItems: stockItems,
    allAssets: assets,
    
    // Core CRUD with Refresh - Automatically injects correct companyId
    addClient: (c: Omit<Client, "id" | "clientId" | "companyId">) => {
      const entry = { ...c, id: Math.random().toString(36).substr(2, 9), clientId: `CL-${String(clients.length + 1).padStart(6, '0')}`, companyId: currentCompanyId };
      clients.push(entry); addLog("CREATE", "Client", `Created ${c.name}`); refresh();
    },
    updateClient: (id: string, u: Partial<Client>) => {
      clients = clients.map(c => c.id === id ? { ...c, ...u } : c); refresh();
    },
    deleteClient: (id: string) => {
      clients = clients.filter(c => c.id !== id); refresh();
    },

    addWorker: (w: Omit<Worker, "id" | "companyId">) => {
      workers.push({ ...w, id: Math.random().toString(36).substr(2, 9), companyId: currentCompanyId }); refresh();
    },
    updateWorker: (id: string, u: Partial<Worker>) => {
      workers = workers.map(w => w.id === id ? { ...w, ...u } : w); refresh();
    },
    deleteWorker: (id: string) => {
      workers = workers.filter(w => w.id !== id); refresh();
    },

    addEquipment: (e: Omit<Equipment, "id" | "companyId">) => {
      equipment.push({ ...e, id: Math.random().toString(36).substr(2, 9), companyId: currentCompanyId }); refresh();
    },
    updateEquipment: (id: string, u: Partial<Equipment>) => {
      equipment = equipment.map(e => e.id === id ? { ...e, ...u } : e); refresh();
    },
    deleteEquipment: (id: string) => {
      equipment = equipment.filter(e => e.id !== id); refresh();
    },

    addJob: (j: Omit<Job, "id" | "jobId" | "companyId" | "assignedWorkerIds" | "assignedEquipmentIds" | "documents">) => {
      // Simple mock geocoding: Random point near London (51.5074, -0.1278)
      const lat = 51.5074 + (Math.random() * 0.1 - 0.05);
      const lng = -0.1278 + (Math.random() * 0.1 - 0.05);

      jobs.push({ 
        ...j, 
        id: Math.random().toString(36).substr(2, 9), 
        jobId: `JOB-${String(jobs.length + 1001).padStart(6, '0')}`, 
        companyId: currentCompanyId, 
        latitude: j.latitude || lat,
        longitude: j.longitude || lng,
        assignedWorkerIds: [], 
        assignedEquipmentIds: [], 
        documents: [],
        managerId: j.managerId 
      }); refresh();
    },
    updateJob: (id: string, u: Partial<Job>) => {
      const before = jobs.find(j => j.id === id);
      jobs = jobs.map(j => j.id === id ? { ...j, ...u } : j);

      const after = jobs.find(j => j.id === id);
      const linkedInvoices = invoices.filter(i => i.jobId === id);

      // In this mockup, keep linked invoice line items in sync with job costing/usage.
      // Only auto-sync Draft invoices to avoid overwriting "Sent/Paid" records.
      if (after && linkedInvoices.length > 0) {
        linkedInvoices.forEach((inv) => {
          if (inv.status !== "Draft") return;

          const labour = after.costs?.labour ?? 0;
          const materials = after.costs?.materials ?? 0;
          const other = after.costs?.other ?? 0;

          const equipmentLines = (after.equipmentUsage || []).map((eu) => {
            const eq = equipment.find((e) => e.id === eu.equipmentId);
            const name = eq?.name || "Equipment";
            const note = eu.note ? ` — ${eu.note}` : "";
            return {
              description: `Equipment (per day): ${name}${note}`,
              qty: eu.days,
              unitPrice: eu.dayRateAtTime,
            };
          });

          const nextLineItems = [
            { description: "Labour", qty: 1, unitPrice: labour },
            ...equipmentLines,
            ...(materials > 0 ? [{ description: "Materials", qty: 1, unitPrice: materials }] : []),
            ...(other > 0 ? [{ description: "Other", qty: 1, unitPrice: other }] : []),
          ];

          invoices = invoices.map((i) => (i.id === inv.id ? { ...i, lineItems: nextLineItems } : i));
        });
      }

      if (u.status === "Active" || u.status === "Completed") {
        addLog("UPDATE", "Job", `Job ${before?.jobId} status updated to ${u.status}`);
      }
      refresh();
    },
    deleteJob: (id: string) => {
      jobs = jobs.filter(j => j.id !== id); refresh();
    },

    addInvoice: (inv: Omit<Invoice, "id" | "invoiceId" | "companyId">) => {
      const prefix = currentCompanyId === DEMO_COMPANY_ID ? "EXB" : "LED";
      const year = new Date().getFullYear();
      const seq = String(invoices.filter(i => i.companyId === currentCompanyId).length + 1).padStart(4, "0");
      const entry = { ...inv, id: Math.random().toString(36).substr(2, 9), invoiceId: `${prefix}-${year}-${seq}`, companyId: currentCompanyId };
      invoices = [...invoices, entry]; 
      addLog("CREATE", "Invoice", `Created ${entry.invoiceId}`); 
      refresh();
      return entry.id;
    },
    updateInvoice: (id: string, u: Partial<Invoice>) => {
      invoices = invoices.map(i => i.id === id ? { ...i, ...u } : i); 
      if (u.status === "Sent") addLog("SEND", "Invoice", `Sent invoice ${id}`);
      refresh();
    },
    deleteInvoice: (id: string) => {
      invoices = invoices.filter(i => i.id !== id); refresh();
    },

    updateSettings: (s: Partial<CompanySettings>) => {
      if (currentCompanyId === DEMO_COMPANY_ID) {
        demoSettings = { ...demoSettings, ...s };
      } else {
        companySettings = { ...companySettings, ...s };
      }
      refresh();
    },

    // Role CRUD
    addRole: (r: Omit<Role, "id" | "companyId">) => {
      const entry: Role = { ...r, id: Math.random().toString(36).substr(2, 9), companyId: currentCompanyId };
      roles.push(entry);
      addLog("CREATE", "Role", `Created role ${entry.name}`);
      refresh();
    },
    updateRole: (id: string, u: Partial<Role>) => {
      roles = roles.map(r => r.id === id ? { ...r, ...u } : r);
      addLog("UPDATE", "Role", `Updated role ${id}`);
      refresh();
    },
    deleteRole: (id: string) => {
      roles = roles.filter(r => r.id !== id);
      // Remove role from users/workers that referenced it
      users = users.map(u => ({ ...u, roleIds: (u.roleIds || []).filter(rid => rid !== id) }));
      workers = workers.map(w => ({ ...w, roleIds: (w.roleIds || []).filter(rid => rid !== id) }));
      addLog("DELETE", "Role", `Deleted role ${id}`);
      refresh();
    },

    // User CRUD for Role assignments
    addUser: (u: Omit<User, "id" | "companyId">) => {
        const entry = { ...u, id: Math.random().toString(36).substr(2, 9), companyId: currentCompanyId };
        users.push(entry); addLog("CREATE", "User", `Created user ${u.name}`); refresh();
    },
    updateUser: (id: string, u: Partial<User>) => {
        users = users.map(user => user.id === id ? { ...user, ...u } : user); refresh();
    },
    deleteUser: (id: string) => {
        users = users.filter(user => user.id !== id); refresh();
    },

    // Stock, Assets, Locations CRUD
    addLocation: (l: Omit<Location, "id" | "companyId" | "createdAt">) => {
      const entry = { ...l, id: Math.random().toString(36).substr(2, 9), createdAt: new Date().toISOString(), companyId: currentCompanyId };
      locations.push(entry); addLog("CREATE", "Location", `Created location ${l.name}`); refresh();
    },
    updateLocation: (id: string, u: Partial<Location>) => {
      locations = locations.map(l => l.id === id ? { ...l, ...u } : l); refresh();
    },
    deleteLocation: (id: string) => {
      locations = locations.filter(l => l.id !== id); refresh();
    },

    addStockItem: (s: Omit<StockItem, "id" | "companyId" | "createdAt" | "updatedAt">) => {
      // Check for duplicate name + sku + locationId
      const existing = stockItems.find(item => item.name === s.name && item.sku === s.sku && item.locationId === s.locationId && item.companyId === currentCompanyId);
      
      if (existing) {
        // Update quantity and unitCost
        const newQty = existing.quantity + s.quantity;
        stockItems = stockItems.map(item => item.id === existing.id ? { ...item, quantity: newQty, unitCost: s.unitCost || item.unitCost, updatedAt: new Date().toISOString() } : item);
        
        stockMovements.push({
          id: Math.random().toString(36).substr(2, 9),
          stockItemId: existing.id,
          quantityChange: s.quantity,
          reason: "reorder",
          createdAt: new Date().toISOString(),
          companyId: currentCompanyId
        });
        
        addLog("UPDATE", "StockItem", `Updated existing stock ${existing.name} by ${s.quantity}`);
      } else {
        const entry = { ...s, id: Math.random().toString(36).substr(2, 9), createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), companyId: currentCompanyId };
        stockItems.push(entry);
        
        stockMovements.push({
          id: Math.random().toString(36).substr(2, 9),
          stockItemId: entry.id,
          quantityChange: s.quantity,
          reason: "manual adjustment",
          createdAt: new Date().toISOString(),
          companyId: currentCompanyId
        });
        
        addLog("CREATE", "StockItem", `Created new stock ${s.name}`);
      }
      refresh();
    },
    updateStockItem: (id: string, u: Partial<StockItem>) => {
      stockItems = stockItems.map(s => s.id === id ? { ...s, ...u, updatedAt: new Date().toISOString() } : s); refresh();
    },
    deleteStockItem: (id: string) => {
      stockItems = stockItems.filter(s => s.id !== id); refresh();
    },
    deductStockQuantity: (id: string, qty: number, jobId?: string) => {
      const item = stockItems.find(s => s.id === id);
      if (item && item.quantity >= qty) {
        stockItems = stockItems.map(s => s.id === id ? { ...s, quantity: s.quantity - qty, updatedAt: new Date().toISOString() } : s);
        
        stockMovements.push({
          id: Math.random().toString(36).substr(2, 9),
          stockItemId: id,
          quantityChange: -qty,
          reason: jobId ? "worker report" : "manual adjustment",
          jobId,
          createdAt: new Date().toISOString(),
          companyId: currentCompanyId
        });
        
        addLog("UPDATE", "StockItem", `Deducted ${qty} from ${item.name}`);
        refresh();
      }
    },

    addAsset: (a: Omit<Asset, "id" | "companyId" | "createdAt" | "updatedAt">) => {
      const entry = { ...a, id: Math.random().toString(36).substr(2, 9), createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), companyId: currentCompanyId };
      assets.push(entry); addLog("CREATE", "Asset", `Created asset ${a.name}`); refresh();
    },
    updateAsset: (id: string, u: Partial<Asset>) => {
      assets = assets.map(a => a.id === id ? { ...a, ...u, updatedAt: new Date().toISOString() } : a); refresh();
    },
    deleteAsset: (id: string) => {
      assets = assets.filter(a => a.id !== id); addLog("DELETE", "Asset", `Deleted asset ${id}`); refresh();
    },

    addReviewItem: (r: Omit<ReviewItem, "id" | "companyId">) => {
      const entry = { ...r, id: Math.random().toString(36).substr(2, 9), companyId: currentCompanyId };
      reviewItems.push(entry as ReviewItem);
      addLog("CREATE", "ReviewItem", `Created new review item ${r.title}`);
      refresh();
    },
    updateReviewItem: (id: string, u: Partial<ReviewItem>) => {
      reviewItems = reviewItems.map(r => r.id === id ? { ...r, ...u } as ReviewItem : r);
      refresh();
    },

    // Automations
    addAutomation: (a: Omit<Automation, "id" | "companyId">) => {
      const entry = { ...a, id: Math.random().toString(36).substr(2, 9), companyId: currentCompanyId };
      automations.push(entry);
      refresh();
    },
    updateAutomation: (id: string, u: Partial<Automation>) => {
      automations = automations.map(a => a.id === id ? { ...a, ...u } : a);
      refresh();
    },
    deleteAutomation: (id: string) => {
      automations = automations.filter(a => a.id !== id);
      refresh();
    }
  };
};
export type { Job } from "@/types/job";
export type { Worker } from "@/types/worker";
export type { Client } from "@/types/client";
export type { Role, PermissionKey } from "@/types/auth";