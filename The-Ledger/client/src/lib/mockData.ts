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
  // dayRate: internal cost basis per day (what the business pays/costs)
  dayRate?: number;
  // clientDayRate: default rate charged to clients per day (Phase 4.5)
  clientDayRate?: number;

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

// Thin billing stub used inside Invoice documents (pre-financial-normalization)
export interface InvoiceBillingLine {
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
  lineItems: InvoiceBillingLine[];
  notes?: string;
  companyId: string;
  quickbooksInvoiceId?: string;
}

export interface AuditLog {
  id: string;
  actorName: string;
  action: "CREATE" | "UPDATE" | "DELETE" | "ASSIGN" | "LOGIN" | "VIOLATION" | "OVERRIDE" | "SEND" | "APPROVE";
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

// ======================================================
// OPERATIONAL PAYLOAD TYPES
// Phase 2 Refactor Foundation
// ======================================================

export interface MaterialUsagePayload {
  stockItemId: string;
  stockItemName: string;

  quantity: number;
  unit?: string;

  // informational only until approval
  unitCost?: number;
  markupPrice?: number;
}

export interface LaborPayload {
  workerId: string;
  workerName: string;

  hours: number;
  hourlyRate?: number;

  shiftStart?: string;
  shiftEnd?: string;
}

export interface EquipmentUsagePayload {
  assetId: string;
  assetName: string;

  hoursUsed?: number;
  usageNotes?: string;
}

export interface ExpensePayload {
  id: string;

  category: string;
  amount: number;

  notes?: string;

  receiptUrl?: string;

  // Phase 4.5 — default 0 (cost-only recovery)
  // PM may set a markup % at submission time.
  // recoveryAmount = amount * (1 + markupPercent / 100)
  markupPercent?: number;
}

export interface UploadPayload {
  id: string;

  type:
    | "qa-photo"
    | "receipt"
    | "safety-report"
    | "before-photo"
    | "after-photo"
    | "general";

  fileName: string;

  uploadedAt: string;

  requiresReview?: boolean;

url?: string;

// ============================================
// UPLOAD REPLAY ARCHITECTURE
// ============================================

syncStatus?:
  | "pending"
  | "uploading"
  | "uploaded"
  | "failed"
  | "conflict"
  | "needs_correction"
  | "under_review"
  | "resubmitted"

uploadProgress?: number;

retryCount?: number;

lastAttemptAt?: string;

uploadId?: string;

conflictReason?: string;

requiresManualReview?: boolean;

}

export interface ReviewItem {
  id: string;

  type: string;

  status:
    | "pending"
    | "approved"
    | "rejected"
    | "needs-correction"
    | "escalated";

  escalatedAt?: string;
  escalatedBy?: string;
  correctionNotes?: string;

  workerId: string;

  jobId: string;

  notes?: string;

  materialsUsed?: MaterialUsagePayload[];

  laborEntries?: LaborPayload[];

  equipmentUsage?: EquipmentUsagePayload[];

  expenses?: ExpensePayload[];

  uploads?: UploadPayload[];

  submittedAt?: string;

  reviewedAt?: string;

  reviewedBy?: string;

  correctionNotes?: string;

  resubmissionCount?: number;
}

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

// ─── JOB NOTES ───────────────────────────────────────────────────
export interface JobNote {
  id: string;
  jobId: string;
  companyId: string;
  authorId: string;
  authorName: string;
  content: string;
  createdAt: string;
  updatedAt?: string;
  archived?: boolean;
}

// ─── JOB COMMUNICATIONS ──────────────────────────────────────────
export interface JobCommunication {
  id: string;
  jobId: string;
  companyId: string;
  authorId: string;
  authorName: string;
  content: string;
  type: 'pm-comment' | 'crew-update' | 'internal-update';
  createdAt: string;
}

const DEMO_JOB_NOTES: JobNote[] = [
  {
    id: "note-pm-1",
    jobId: "dj-pm-active-1",
    companyId: DEMO_COMPANY_ID,
    authorId: "du2",
    authorName: "Alex Reid",
    content: "Confirmed with client that Zone C work can proceed during off-peak hours (before 8am and after 6pm). Night shift approved for Mon/Tue.",
    createdAt: new Date(Date.now() - 6 * 3600000).toISOString(),
  },
  {
    id: "note-pm-2",
    jobId: "dj-pm-active-1",
    companyId: DEMO_COMPANY_ID,
    authorId: "du2",
    authorName: "Alex Reid",
    content: "Legacy pipework asbestos survey booked with Enviro-Safe Ltd — awaiting confirmed appointment time. All work in Zone C paused pending clearance.",
    createdAt: new Date(Date.now() - 28 * 3600000).toISOString(),
  },
  {
    id: "note-pm-3",
    jobId: "dj-pm-active-1",
    companyId: DEMO_COMPANY_ID,
    authorId: "du2",
    authorName: "Alex Reid",
    content: "Additional fixings ordered from HSS Direct — delivery expected Thursday. Marcus to check stock on arrival before proceeding with Zone C brackets.",
    createdAt: new Date(Date.now() - 52 * 3600000).toISOString(),
    archived: true,
  },
  {
    id: "note-br-1",
    jobId: "dj-boiler-room-2",
    companyId: DEMO_COMPANY_ID,
    authorId: "du2",
    authorName: "Alex Reid",
    content: "Site access restricted to loading bay entrance only. Security code is 4821. Must sign in at reception on arrival.",
    createdAt: new Date(Date.now() - 2 * 3600000).toISOString(),
  },
];

const DEMO_JOB_COMMUNICATIONS: JobCommunication[] = [
  {
    id: "comm-pm-1",
    jobId: "dj-pm-active-1",
    companyId: DEMO_COMPANY_ID,
    authorId: "du2",
    authorName: "Alex Reid",
    content: "Zone B completed ahead of schedule — good work team. Insulation crew confirmed for Monday 7am start. Marcus to brief them on access route.",
    type: "pm-comment",
    createdAt: new Date(Date.now() - 4 * 3600000).toISOString(),
  },
  {
    id: "comm-pm-2",
    jobId: "dj-pm-active-1",
    companyId: DEMO_COMPANY_ID,
    authorId: "dw2",
    authorName: "Marcus Cole",
    content: "Zone A and B fully ducted. Zone C prep started but paused on the legacy pipework find. Photos submitted for review. Awaiting guidance before proceeding.",
    type: "crew-update",
    createdAt: new Date(Date.now() - 5 * 3600000).toISOString(),
  },
  {
    id: "comm-pm-3",
    jobId: "dj-pm-active-1",
    companyId: DEMO_COMPANY_ID,
    authorId: "du2",
    authorName: "Alex Reid",
    content: "H&S note: all crew to wear full PPE in Zone C until asbestos survey completed. Zero exceptions. Flagged with CEO and escalated for sign-off.",
    type: "internal-update",
    createdAt: new Date(Date.now() - 26 * 3600000).toISOString(),
  },
];

let jobNotes: JobNote[] = [...DEMO_JOB_NOTES];
let jobCommunications: JobCommunication[] = [...DEMO_JOB_COMMUNICATIONS];

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
  },

  // PM demo review items — dj-pm-active-1 (HVAC system replacement)
  {
    id: "rev-pm-1",
    type: "report",
    title: "End of Day Report — Day 5",
    submittedBy: "Marcus Cole",
    submittedAt: new Date(Date.now() - 3 * 3600000).toISOString(),
    status: "pending" as const,
    content: "Completed duct installation in Zones A and B. Zone C requires additional fixings before insulation can proceed. All health & safety checks passed.",
    workerId: "dw2",
    jobId: "dj-pm-active-1",
    companyId: DEMO_COMPANY_ID
  },
  {
    id: "rev-pm-2",
    type: "photo",
    title: "Zone B Duct Installation Complete",
    submittedBy: "Marcus Cole",
    submittedAt: new Date(Date.now() - 52 * 3600000).toISOString(), // 52 hours ago → overdue
    status: "pending" as const,
    url: "https://images.unsplash.com/photo-1504307651254-35680f356dfd?q=80&w=600&auto=format&fit=crop",
    notes: "Zone B fully ducted and ready for sign-off before insulation team arrives Monday.",
    workerId: "dw2",
    jobId: "dj-pm-active-1",
    companyId: DEMO_COMPANY_ID
  },
  {
    id: "rev-pm-3",
    type: "report",
    title: "Materials Request — Zone C Fixings",
    submittedBy: "Jordan Reed",
    submittedAt: new Date(Date.now() - 18 * 3600000).toISOString(),
    status: "needs-correction" as const,
    correctionNotes: "Please include exact part numbers and quantities for the additional fixings required. Reference the HVAC spec sheet section 4.2.",
    content: "Need additional fixings for Zone C ceiling brackets. Current stock insufficient.",
    workerId: "dw3",
    jobId: "dj-pm-active-1",
    companyId: DEMO_COMPANY_ID
  },
  {
    id: "rev-pm-4",
    type: "report",
    title: "Asbestos Survey — Legacy Pipework Area",
    submittedBy: "Marcus Cole",
    submittedAt: new Date(Date.now() - 36 * 3600000).toISOString(),
    status: "escalated" as const,
    escalatedAt: new Date(Date.now() - 24 * 3600000).toISOString(),
    escalatedBy: "du2",
    content: "Uncovered legacy pipework during Zone C prep. Possible asbestos-containing material (ACM). Work paused in this area. Awaiting specialist assessment.",
    workerId: "dw2",
    jobId: "dj-pm-active-1",
    companyId: DEMO_COMPANY_ID
  },
  {
    id: "rev-pm-5",
    type: "report",
    title: "Site Preparation Report",
    submittedBy: "Marcus Cole",
    submittedAt: new Date(Date.now() - 1 * 3600000).toISOString(),
    status: "pending" as const,
    content: "Boiler room site preparation complete. Area cleared and secured. Ready to begin pipework replacement.",
    workerId: "dw2",
    jobId: "dj-boiler-room-2",
    companyId: DEMO_COMPANY_ID
  },

  // ── Demo Worker (du3) own history — powers the WK-5 worker History,
  //    Shift History, Activity Timeline, and Profile metrics. Attributed to
  //    du3's assigned jobs so RBAC scoping (own-activity-only) holds.
  {
    id: "rev-du3-1",
    type: "worker-report",
    title: "Daily Progress Report",
    submittedBy: "Demo Worker",
    submittedAt: new Date(Date.now() - 8 * 86400000).toISOString(),
    status: "approved" as const,
    content: "Canopy and primary duct run installed. Commissioning checks passed.",
    notes: "Canopy and primary duct run installed. Commissioning checks passed.",
    laborEntries: [
      {
        workerId: "du3",
        workerName: "Demo Worker",
        hours: 7.5,
        shiftStart: new Date(Date.now() - 8 * 86400000).toISOString(),
        shiftEnd: new Date(Date.now() - 8 * 86400000 + 7.5 * 3600000).toISOString(),
      },
    ],
    workerId: "du3",
    jobId: "dj-kitchen-extract-1",
    companyId: DEMO_COMPANY_ID,
  },
  {
    id: "rev-du3-2",
    type: "timesheet",
    title: "Shift Timesheet",
    submittedBy: "Demo Worker",
    submittedAt: new Date(Date.now() - 7 * 86400000).toISOString(),
    status: "approved" as const,
    laborEntries: [
      {
        workerId: "du3",
        workerName: "Demo Worker",
        hours: 8,
        shiftStart: new Date(Date.now() - 7 * 86400000).toISOString(),
        shiftEnd: new Date(Date.now() - 7 * 86400000 + 8 * 3600000).toISOString(),
      },
    ],
    workerId: "du3",
    jobId: "dj-kitchen-extract-1",
    companyId: DEMO_COMPANY_ID,
  },
  {
    id: "rev-du3-3",
    type: "issue-log",
    title: "Issue Reported — High",
    submittedBy: "Demo Worker",
    submittedAt: new Date(Date.now() - 5 * 86400000).toISOString(),
    status: "needs-correction" as const,
    correctionNotes: "Please add the access-panel location and a photo of the obstruction.",
    notes: "Loading bay access blocked by parked vehicles; delayed material drop.",
    priority: "High",
    workerId: "du3",
    jobId: "dj-kitchen-extract-1",
    companyId: DEMO_COMPANY_ID,
  },
  {
    id: "rev-du3-4",
    type: "worker-report",
    title: "Site Photo",
    submittedBy: "Demo Worker",
    submittedAt: new Date(Date.now() - 2 * 86400000).toISOString(),
    status: "pending" as const,
    uploads: [
      {
        id: "up-du3-1",
        uploadId: "up-du3-1",
        type: "general",
        fileName: "Site Photo.jpg",
        uploadedAt: new Date(Date.now() - 2 * 86400000).toISOString(),
        url: "mock-upload-url",
        syncStatus: "uploaded",
        uploadProgress: 100,
      },
    ],
    workerId: "du3",
    jobId: "dj-showcase-maint-1",
    companyId: DEMO_COMPANY_ID,
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
    notes: "Trading hours: 7am\u201311pm. Any shutdowns must be agreed 48hrs in advance.",

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

// Phase 4.5 — Demo workers carry both costRate and billableRate.
// costRate: what the business pays per hour (internal cost basis)
// billableRate: default rate charged to clients per hour (revenue basis)
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
    costRate: 28,
    billableRate: 85,
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
    costRate: 16,
    billableRate: 55,
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
    costRate: 16,
    billableRate: 55,
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
    costRate: 17,
    billableRate: 58,
  },
];

// Phase 4.5 — Demo equipment carries both dayRate (cost) and clientDayRate (revenue).
// dayRate: internal cost per day (what the business pays)
// clientDayRate: default rate charged to clients per day (revenue basis)
const DEMO_EQUIPMENT: Equipment[] = [
  {
    id: "de1",
    name: "Hiab support (canopy lift)",
    category: "Vehicles",
    status: "Available",
    dayRate: 420,
    clientDayRate: 520,
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
    clientDayRate: 350,
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
    clientDayRate: 115,
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
    clientDayRate: 140,
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
    clientDayRate: 450,
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
    clientDayRate: 150,
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
    clientDayRate: 45,
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
    managerId: "du2",
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

  // PM-4 demo jobs — owned by Demo PM (du2) to demonstrate schedule/workforce features
  {
    id: "dj-pm-active-1",
    jobId: "DEMO-JOB-0203",
    clientId: "dc1",
    managerId: "du2",
    title: "HVAC system replacement — Block C",
    description: "Full replacement of ageing HVAC units across Block C. Phased over two weeks with minimal disruption to trading hours.",
    status: "Active",
    priority: "Medium",
    startAt: new Date(Date.now() - 5 * 86400000).toISOString(),
    endAt: new Date(Date.now() + 12 * 86400000).toISOString(),
    locationAddress: "Unit 14, Riverside Industrial Estate, Manchester, M15 4FN",
    latitude: 53.477,
    longitude: -2.244,
    accessInstructions: "Enter via loading bay gate — code 4821. Park in bays marked B1–B6. Sign in at reception desk (Building C). Trading hours are 8am–6pm; night access must be pre-arranged with site manager.",
    siteContacts: [
      { name: "Brian Walsh", role: "Site Manager", phone: "07700 900 123", email: "b.walsh@hsslimited.co.uk" },
      { name: "Sandra Yip", role: "Operations Lead", phone: "07700 900 456" },
    ],
    emergencyContacts: [
      { name: "HSS Security Control", role: "On-site Security", phone: "0161 555 0199" },
      { name: "Brian Walsh", role: "Site Manager", phone: "07700 900 123" },
    ],
    specialRequirements: "Trading hours: 8am–11pm. All shutdowns must be agreed 48hrs in advance. Zone C pipework area contains potential ACM — work paused pending asbestos survey. Full PPE mandatory in Zone C.",
    assignedWorkerIds: ["dw2", "dw3"],
    assignedEquipmentIds: [],
    documents: [
      {
        id: "doc-pm-1",
        name: "HVAC Replacement Specification v2.pdf",
        url: "#",
        uploadedAt: new Date(Date.now() - 7 * 86400000).toISOString(),
        category: "site",
        uploadedBy: "Alex Reid",
      },
      {
        id: "doc-pm-2",
        name: "Risk Assessment — Block C Works.pdf",
        url: "#",
        uploadedAt: new Date(Date.now() - 6 * 86400000).toISOString(),
        category: "compliance",
        uploadedBy: "Alex Reid",
      },
      {
        id: "doc-pm-3",
        name: "Client Approval — Night Shift Access.pdf",
        url: "#",
        uploadedAt: new Date(Date.now() - 1 * 86400000).toISOString(),
        category: "client",
        uploadedBy: "Alex Reid",
      },
    ],
    costs: { labour: 0, equipment: 0, materials: 0, other: 0 },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    companyId: DEMO_COMPANY_ID,
  },
  {
    id: "dj-boiler-room-2",
    jobId: "DEMO-JOB-0204",
    clientId: "dc1",
    managerId: "du2",
    title: "Boiler room upgrade & pipework replacement",
    description: "Replace ageing boiler room pipework and install new energy-efficient units. Access restricted to off-peak hours.",
    status: "Planned",
    priority: "Medium",
    startAt: new Date(Date.now() + 4 * 86400000).toISOString(),
    endAt: new Date(Date.now() + 18 * 86400000).toISOString(),
    locationAddress: "Unit 14, Riverside Industrial Estate, Manchester, M15 4FN",
    latitude: 53.477,
    longitude: -2.244,
    accessInstructions: "Loading bay entrance, security code 4821. Boiler room is sub-basement level — access via service lift only. No passenger lift access to sub-basement.",
    siteContacts: [
      { name: "Brian Walsh", role: "Site Manager", phone: "07700 900 123", email: "b.walsh@hsslimited.co.uk" },
    ],
    emergencyContacts: [
      { name: "HSS Security Control", role: "On-site Security", phone: "0161 555 0199" },
    ],
    specialRequirements: "All work restricted to off-peak hours (before 7am and after 7pm). Gas isolation must be signed off by Brian Walsh before any pipework begins.",
    assignedWorkerIds: ["dw2"],
    assignedEquipmentIds: [],
    documents: [
      {
        id: "doc-br-1",
        name: "Boiler Room Pipework Drawings.pdf",
        url: "#",
        uploadedAt: new Date(Date.now() - 3 * 86400000).toISOString(),
        category: "site",
        uploadedBy: "Alex Reid",
      },
    ],
    costs: { labour: 0, equipment: 0, materials: 0, other: 0 },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    companyId: DEMO_COMPANY_ID,
  },
  {
    id: "dj-office-fit-1",
    jobId: "DEMO-JOB-0205",
    clientId: "dc2",
    managerId: "du2",
    title: "Office fit-out — 2nd floor partitioning",
    description: "Demountable partition installation across 2nd floor open plan area. Estimated 5-day installation.",
    status: "Planned",
    priority: "High",
    startAt: new Date(Date.now() + 2 * 86400000).toISOString(),
    endAt: new Date(Date.now() + 8 * 86400000).toISOString(),
    locationAddress: "45 Kingsway, London, WC2B 6SR",
    latitude: 51.515,
    longitude: -0.118,
    assignedWorkerIds: [],
    assignedEquipmentIds: [],
    documents: [],
    costs: { labour: 0, equipment: 0, materials: 0, other: 0 },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
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

// ──────────────────────────────────────────────────────────────
// AUTH PERSISTENCE
// Stores the logged-in user's email in localStorage so that a
// full-page navigation (e.g. Playwright page.goto()) does not
// reset currentUser to null and cause ProtectedRoute to redirect.
//
// clearBrowserState() in tests calls localStorage.clear() which
// removes the key — auth correctly resets between tests.
// ──────────────────────────────────────────────────────────────
const AUTH_STORAGE_KEY = "ledger-auth-email";

function restoreAuthFromStorage(): User | null {
  try {
    const email = typeof localStorage !== "undefined" ? localStorage.getItem(AUTH_STORAGE_KEY) : null;
    if (email) return SEED_USERS.find(u => u.email === email) ?? null;
  } catch {
    // localStorage unavailable (SSR / locked storage) — fail silently
  }
  return null;
}

let currentUser: User | null = restoreAuthFromStorage();
let companySettings = { ...DEFAULT_SETTINGS }; // This will be per-request simulated in useStore
let demoSettings = { ...DEMO_SETTINGS };

// ---------------------------------------------------------------------------
// Standalone store mutator — safe to call outside React components.
//
// useStore() is a React hook and cannot be called from Zustand actions or
// other non-component contexts. This function writes directly to the shared
// module-level reviewItems array so the offline queue sync path can hand
// off a replayed payload to the Review Center without going through the hook.
//
// Deduplication: if a ReviewItem with the same sourceQueueId already exists
// the call is a no-op. This prevents duplicate entries when a queue item is
// replayed more than once (e.g. retry after a transient failure where the
// first attempt actually succeeded but the status update was lost).
//
// Persistence: entries are also written to localStorage under
// DIRECT_REVIEW_ITEMS_KEY so they survive full page reloads (which reset the
// module-level array). On module init the key is read back and merged.
// ---------------------------------------------------------------------------
const DIRECT_REVIEW_ITEMS_KEY = "ledger-direct-review-items";

function loadPersistedDirectItems(): ReviewItem[] {
  try {
    const raw = typeof localStorage !== "undefined" ? localStorage.getItem(DIRECT_REVIEW_ITEMS_KEY) : null;
    if (raw) return JSON.parse(raw) as ReviewItem[];
  } catch { /* ignore */ }
  return [];
}

// Merge any persisted direct items into the module array at startup.
(function mergePersistedDirectItems() {
  const persisted = loadPersistedDirectItems();
  for (const item of persisted) {
    if (!reviewItems.some(r => r.id === item.id)) {
      reviewItems.push(item);
    }
  }
})();

export function addReviewItemDirect(r: Omit<ReviewItem, "id" | "companyId">): void {
  const sourceId = (r as any).sourceQueueId as string | undefined;
  if (sourceId && reviewItems.some((existing) => (existing as any).sourceQueueId === sourceId)) {
    // Already bridged — idempotent replay, skip.
    return;
  }
  const companyId = currentUser?.companyId || REAL_COMPANY_ID;
  const entry: ReviewItem = {
    ...r,
    id: Math.random().toString(36).substr(2, 9),
    companyId,
  } as ReviewItem;
  reviewItems.push(entry);

  // Persist to localStorage so the entry survives page reloads.
  try {
    const existing = loadPersistedDirectItems();
    existing.push(entry);
    localStorage.setItem(DIRECT_REVIEW_ITEMS_KEY, JSON.stringify(existing));
  } catch { /* ignore */ }

  logs.unshift({
    id: Math.random().toString(36).substr(2, 9),
    actorName: currentUser?.name || "System (Replay)",
    action: "CREATE",
    entity: "ReviewItem",
    details: `Created new review item ${r.title || "Unknown"} via offline replay`,
    timestamp: new Date().toISOString(),
  });
}

// Hooks
export const useAuth = () => {
  const [user, setUser] = useState<User | null>(currentUser);

  const login = (email: string) => {
    const found = SEED_USERS.find(u => u.email === email) || SEED_USERS[0];
    currentUser = found;
    try { localStorage.setItem(AUTH_STORAGE_KEY, found.email); } catch { /* ignore */ }
    setUser(found);
  };

  const logout = () => {
    currentUser = null;
    try { localStorage.removeItem(AUTH_STORAGE_KEY); } catch { /* ignore */ }
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

  const currentSettings = currentCompanyId === DEMO_COMPANY_ID ? demoSettings : companySettings;

  const deductStockQuantity = (id: string, qty: number, jobId?: string) => {
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
  };

  const filteredJobNotes = jobNotes.filter(n => n.companyId === currentCompanyId && !n.archived);
  const filteredJobCommunications = jobCommunications.filter(c => c.companyId === currentCompanyId);

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

    // PM-6 — Job Notes & Communications
    jobNotes: filteredJobNotes,
    jobCommunications: filteredJobCommunications,
    addJobNote: (note: Omit<JobNote, 'id' | 'companyId' | 'createdAt'>) => {
      const entry: JobNote = {
        ...note,
        id: `note-${Math.random().toString(36).substr(2, 9)}`,
        companyId: currentCompanyId,
        createdAt: new Date().toISOString(),
      };
      jobNotes.unshift(entry);
      addLog("CREATE", "JobNote", `Note added to job ${note.jobId}`);
      refresh();
    },
    updateJobNote: (id: string, updates: Partial<JobNote>) => {
      const idx = jobNotes.findIndex(n => n.id === id);
      if (idx !== -1) {
        jobNotes[idx] = { ...jobNotes[idx], ...updates, updatedAt: new Date().toISOString() };
        addLog("UPDATE", "JobNote", `Note ${id} updated`);
        refresh();
      }
    },
    addJobCommunication: (comm: Omit<JobCommunication, 'id' | 'companyId' | 'createdAt'>) => {
      const entry: JobCommunication = {
        ...comm,
        id: `comm-${Math.random().toString(36).substr(2, 9)}`,
        companyId: currentCompanyId,
        createdAt: new Date().toISOString(),
      };
      jobCommunications.unshift(entry);
      addLog("CREATE", "JobCommunication", `Communication added to job ${comm.jobId}`);
      refresh();
    },

    // Phase 4.2 — Financial normalization tables
    timesheets: mockTimesheets,
    expenses: mockExpenses,
    inventoryMutations: mockInventoryMutations,
    equipmentUsageRecords: mockEquipmentUsage,
    invoiceLineItems: mockInvoiceLineItems,
    financialMutations: mockFinancialMutations,

    // Phase 5.4 — Payroll Export table
    payrollExports: mockPayrollExports,
    addPayrollExport: (payrollExport: import("@/lib/payrollExportEngine").PayrollExport) => {
      mockPayrollExports.push(payrollExport);
      addLog("CREATE", "PayrollExport", `Generated payroll export ${payrollExport.exportNumber} for period: ${payrollExport.period.label}`);
      refresh();
    },
    updatePayrollExportStatus: (id: string, status: PayrollExportStatus) => {
      const idx = mockPayrollExports.findIndex(e => e.id === id);
      if (idx !== -1) {
        mockPayrollExports[idx] = { ...mockPayrollExports[idx], status };
        addLog("UPDATE", "PayrollExport", `Payroll export ${mockPayrollExports[idx].exportNumber} status \u2192 ${status}`);
        refresh();
      }
    },

    // Phase 5.3 — Invoice Draft table
    invoiceDrafts: mockInvoiceDrafts,
    addInvoiceDraft: (draft: InvoiceDraft) => {
      mockInvoiceDrafts.push(draft);
      addLog("CREATE", "InvoiceDraft", `Created draft invoice ${draft.invoiceNumber} for job ${draft.jobId}`);
      refresh();
    },
    updateInvoiceDraftStatus: (id: string, status: import("@/types/finance").InvoiceStatus) => {
      const idx = mockInvoiceDrafts.findIndex(d => d.id === id);
      if (idx !== -1) {
        mockInvoiceDrafts[idx] = { ...mockInvoiceDrafts[idx], status, updatedAt: new Date().toISOString() };
        addLog("UPDATE", "InvoiceDraft", `Invoice draft ${mockInvoiceDrafts[idx].invoiceNumber} status \u2192 ${status}`);
        refresh();
      }
    },

    // Phase 4.4 — Job Financial Summary (derived, not stored)
    getJobFinancialSummary,

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
            const note = eu.note ? ` \u2014 ${eu.note}` : "";
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
    deductStockQuantity,

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
      console.log('ADD REVIEW ITEM', entry);
      reviewItems.push(entry as ReviewItem);
      addLog("CREATE", "ReviewItem", `Created new review item ${r.title || "Unknown"}`);
      refresh();
    },
    updateReviewItem: (id: string, u: Partial<ReviewItem>) => {
      const item = reviewItems.find(r => r.id === id);

      // If we are approving an item that wasn't previously approved
      if (item && u.status === 'approved' && item.status !== 'approved') {
        addLog('APPROVE', 'ReviewItem', `Approved review item ${item.title || item.id}`);

        const approvedAt = new Date().toISOString();
        const approvedBy = currentUser?.name || 'System';
        const reportId = (item as any).sourceQueueId || item.id;

        // ─────────────────────────────────────────────────────────────────
        // PHASE 4.2 / 4.5 — FINANCIAL MUTATION ENGINE
        // Runs on every approval. Generates normalized financial objects
        // from each operational payload on the ReviewItem.
        //
        // Phase 4.5 additions:
        //   - TimesheetEntry: billableRate + laborRevenue from Worker.billableRate
        //   - EquipmentUsageRecord: billedRate + revenueImpact from Equipment.clientDayRate
        //   - ExpenseEntry: recoveryAmount from ExpensePayload.markupPercent
        //   - InvoiceLineItem unit prices use client-facing rates
        // ─────────────────────────────────────────────────────────────────

        // 1. LABOR → TimesheetEntry
        if (item.laborEntries && item.laborEntries.length > 0) {
          item.laborEntries.forEach(labor => {
            // Cost basis: hourlyRate from payload (what the business pays)
            const hourlyRate = labor.hourlyRate ?? 0;
            const laborCost = labor.hours * hourlyRate;

            // Phase 4.5: Revenue basis — look up worker.billableRate.
            // Falls back to hourlyRate (zero-margin) if not set.
            const workerRecord = workers.find(w => w.id === labor.workerId);
            const billableRate = workerRecord?.billableRate ?? hourlyRate;
            const laborRevenue = labor.hours * billableRate;

            const entryId = Math.random().toString(36).substr(2, 9);

            const timesheetEntry: TimesheetEntry = {
              id: entryId,
              reportId,
              reviewId: item.id,
              jobId: item.jobId,
              workerId: labor.workerId,
              workerName: labor.workerName,
              hours: labor.hours,
              hourlyRate,
              laborCost,
              billableRate,
              laborRevenue,
              approvedAt,
              approvedBy,
            };
            mockTimesheets.push(timesheetEntry);

            // Invoice line item: labor — client-facing price = billableRate
            const laborLineId = Math.random().toString(36).substr(2, 9);
            const laborLine: InvoiceLineItem = {
              id: laborLineId,
              reportId,
              reviewId: item.id,
              jobId: item.jobId,
              type: 'labor',
              description: `Labour \u2013 ${labor.workerName} (${labor.hours}h @ \u00a3${billableRate}/h)`,
              quantity: labor.hours,
              unitPrice: billableRate,
              amount: laborRevenue,
              approvedAt,
            };
            mockInvoiceLineItems.push(laborLine);

            // FinancialMutation audit – timesheet
            mockFinancialMutations.push({
              id: Math.random().toString(36).substr(2, 9),
              jobId: item.jobId,
              sourceReportId: reportId,
              sourceReviewId: item.id,
              mutationType: 'timesheet',
              entityId: entryId,
              createdAt: approvedAt,
              approvedBy,
            });

            // FinancialMutation audit – invoice line
            mockFinancialMutations.push({
              id: Math.random().toString(36).substr(2, 9),
              jobId: item.jobId,
              sourceReportId: reportId,
              sourceReviewId: item.id,
              mutationType: 'invoice',
              entityId: laborLineId,
              createdAt: approvedAt,
              approvedBy,
            });
          });
        }

        // 2. EXPENSES → ExpenseEntry
        if (item.expenses && item.expenses.length > 0) {
          item.expenses.forEach(exp => {
            // Phase 4.5: recoveryAmount = amount * (1 + markupPercent / 100)
            // markupPercent defaults to 0 — cost-only recovery.
            const markupPercent = exp.markupPercent ?? 0;
            const recoveryAmount = exp.amount * (1 + markupPercent / 100);

            const entryId = Math.random().toString(36).substr(2, 9);

            const expenseEntry: ExpenseEntry = {
              id: entryId,
              reportId,
              reviewId: item.id,
              jobId: item.jobId,
              description: exp.notes || exp.category,
              amount: exp.amount,
              markupPercent,
              recoveryAmount,
              submittedBy: item.submittedBy || approvedBy,
              approvedAt,
              approvedBy,
            };
            mockExpenses.push(expenseEntry);

            // Invoice line item: expense — client-facing price = recoveryAmount
            const expLineId = Math.random().toString(36).substr(2, 9);
            const expLineDesc = markupPercent > 0
              ? `Expense \u2013 ${exp.notes || exp.category} (+${markupPercent}% markup)`
              : `Expense \u2013 ${exp.notes || exp.category}`;
            const expLine: InvoiceLineItem = {
              id: expLineId,
              reportId,
              reviewId: item.id,
              jobId: item.jobId,
              type: 'expense',
              description: expLineDesc,
              quantity: 1,
              unitPrice: recoveryAmount,
              amount: recoveryAmount,
              approvedAt,
            };
            mockInvoiceLineItems.push(expLine);

            // FinancialMutation audit – expense
            mockFinancialMutations.push({
              id: Math.random().toString(36).substr(2, 9),
              jobId: item.jobId,
              sourceReportId: reportId,
              sourceReviewId: item.id,
              mutationType: 'expense',
              entityId: entryId,
              createdAt: approvedAt,
              approvedBy,
            });

            // FinancialMutation audit – invoice line
            mockFinancialMutations.push({
              id: Math.random().toString(36).substr(2, 9),
              jobId: item.jobId,
              sourceReportId: reportId,
              sourceReviewId: item.id,
              mutationType: 'invoice',
              entityId: expLineId,
              createdAt: approvedAt,
              approvedBy,
            });
          });
        }

        // 3. MATERIALS → InventoryMutation  (+ existing deductStockQuantity)
        if (item.materialsUsed && item.materialsUsed.length > 0) {
          item.materialsUsed.forEach(material => {
            // Existing inventory deduction — must remain
            deductStockQuantity(material.stockItemId, material.quantity, item.jobId);

            const unitCost = material.unitCost ?? 0;
            const markupPrice = material.markupPrice ?? unitCost;
            const jobCostImpact = material.quantity * unitCost;
            const revenueImpact = material.quantity * markupPrice;
            const entryId = Math.random().toString(36).substr(2, 9);

            const invMutation: InventoryMutation = {
              id: entryId,
              reportId,
              reviewId: item.id,
              stockItemId: material.stockItemId,
              stockItemName: material.stockItemName,
              quantityUsed: material.quantity,
              unitCost,
              markupPrice,
              jobCostImpact,
              revenueImpact,
              jobId: item.jobId,
              approvedAt,
            };
            mockInventoryMutations.push(invMutation);

            // Invoice line item: material
            const matLineId = Math.random().toString(36).substr(2, 9);
            const matLine: InvoiceLineItem = {
              id: matLineId,
              reportId,
              reviewId: item.id,
              jobId: item.jobId,
              type: 'material',
              description: `Materials \u2013 ${material.stockItemName} \u00d7${material.quantity}`,
              quantity: material.quantity,
              unitPrice: markupPrice,
              amount: revenueImpact,
              approvedAt,
            };
            mockInvoiceLineItems.push(matLine);

            // FinancialMutation audit – inventory
            mockFinancialMutations.push({
              id: Math.random().toString(36).substr(2, 9),
              jobId: item.jobId,
              sourceReportId: reportId,
              sourceReviewId: item.id,
              mutationType: 'inventory',
              entityId: entryId,
              createdAt: approvedAt,
              approvedBy,
            });

            // FinancialMutation audit – invoice line
            mockFinancialMutations.push({
              id: Math.random().toString(36).substr(2, 9),
              jobId: item.jobId,
              sourceReportId: reportId,
              sourceReviewId: item.id,
              mutationType: 'invoice',
              entityId: matLineId,
              createdAt: approvedAt,
              approvedBy,
            });
          });
        }

        // 4. EQUIPMENT USAGE → EquipmentUsageRecord
        if (item.equipmentUsage && item.equipmentUsage.length > 0) {
          item.equipmentUsage.forEach(eu => {
            const equipmentRecord = equipment.find(e => e.id === eu.assetId);
            const hoursUsed = eu.hoursUsed ?? 0;

            // Phase 4.5:
            // usageCost  = internal cost  = dayRate / 8 * hoursUsed
            // billedRate = client charge   = clientDayRate / 8
            // revenueImpact = billedRate * hoursUsed
            // Falls back to dayRate when clientDayRate is absent (zero-margin).
            const costPerHour = equipmentRecord?.dayRate
              ? equipmentRecord.dayRate / 8
              : 0;
            const usageCost = costPerHour * hoursUsed;

            const clientPerHour = equipmentRecord?.clientDayRate
              ? equipmentRecord.clientDayRate / 8
              : costPerHour; // fallback: zero-margin
            const billedRate = clientPerHour;
            const revenueImpact = billedRate * hoursUsed;

            const entryId = Math.random().toString(36).substr(2, 9);

            const equipRecord: EquipmentUsageRecord = {
              id: entryId,
              reportId,
              reviewId: item.id,
              assetId: eu.assetId,
              assetName: eu.assetName,
              hoursUsed,
              usageCost,
              billedRate,
              revenueImpact,
              jobId: item.jobId,
              approvedAt,
            };
            mockEquipmentUsage.push(equipRecord);

            // Invoice line item: equipment — client-facing price = billedRate
            const eqLineId = Math.random().toString(36).substr(2, 9);
            const eqLine: InvoiceLineItem = {
              id: eqLineId,
              reportId,
              reviewId: item.id,
              jobId: item.jobId,
              type: 'equipment',
              description: `Equipment \u2013 ${eu.assetName} (${hoursUsed}h)`,
              quantity: hoursUsed,
              unitPrice: billedRate,
              amount: revenueImpact,
              approvedAt,
            };
            mockInvoiceLineItems.push(eqLine);

            // FinancialMutation audit – equipment
            mockFinancialMutations.push({
              id: Math.random().toString(36).substr(2, 9),
              jobId: item.jobId,
              sourceReportId: reportId,
              sourceReviewId: item.id,
              mutationType: 'equipment',
              entityId: entryId,
              createdAt: approvedAt,
              approvedBy,
            });

            // FinancialMutation audit – invoice line
            mockFinancialMutations.push({
              id: Math.random().toString(36).substr(2, 9),
              jobId: item.jobId,
              sourceReportId: reportId,
              sourceReviewId: item.id,
              mutationType: 'invoice',
              entityId: eqLineId,
              createdAt: approvedAt,
              approvedBy,
            });
          });
        }

        // ─────────────────────────────────────────────────────────────────
        // END PHASE 4.2 / 4.5
        // ─────────────────────────────────────────────────────────────────
      }

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
// ======================================================
// PHASE 4.1 — FINANCIAL NORMALIZATION LAYER
//
// These interfaces represent post-approval financial truth.
// They are generated by the Review Center upon approval and
// are intentionally separate from the pre-approval operational
// payload types (LaborPayload, EquipmentUsagePayload, etc.).
//
// Core doctrine: Operational Data IS Financial Data —
// but ONLY after approval through the Review Center.
// ======================================================

/**
 * A normalized labor cost+revenue record created when a LaborPayload
 * inside a ReviewItem is approved.
 *
 * Phase 4.5 additions:
 *   billableRate — client-facing rate resolved from Worker.billableRate
 *   laborRevenue — hours × billableRate (revenue basis)
 */
export interface TimesheetEntry {
  id: string;

  reportId: string;
  reviewId: string;
  jobId: string;

  workerId: string;
  workerName: string;

  hours: number;
  hourlyRate: number;   // cost basis (what the business pays)

  laborCost: number;    // hours × hourlyRate

  // Phase 4.5 — Revenue
  billableRate: number; // client-facing rate (Worker.billableRate or fallback)
  laborRevenue: number; // hours × billableRate

  approvedAt: string;
  approvedBy: string;
}

/**
 * A normalized expense record created when an ExpensePayload
 * inside a ReviewItem is approved.
 *
 * Phase 4.5 additions:
 *   markupPercent  — from ExpensePayload.markupPercent (default 0)
 *   recoveryAmount — amount × (1 + markupPercent / 100)
 */
export interface ExpenseEntry {
  id: string;

  reportId: string;
  reviewId: string;
  jobId: string;

  description: string;

  amount: number;          // cost basis

  // Phase 4.5 — Revenue
  markupPercent: number;   // 0 = cost-only recovery
  recoveryAmount: number;  // amount × (1 + markupPercent / 100)

  submittedBy: string;

  approvedAt: string;
  approvedBy: string;
}

/**
 * A normalized inventory consumption record created when a
 * MaterialUsagePayload inside a ReviewItem is approved.
 * Drives both job cost and revenue impact downstream.
 */
export interface InventoryMutation {
  id: string;

  reportId: string;
  reviewId: string;

  stockItemId: string;
  stockItemName: string;

  quantityUsed: number;

  unitCost: number;
  markupPrice: number;

  jobCostImpact: number;  // quantityUsed × unitCost
  revenueImpact: number;  // quantityUsed × markupPrice

  jobId: string;

  approvedAt: string;
}

/**
 * A normalized equipment usage record created when an
 * EquipmentUsagePayload inside a ReviewItem is approved.
 *
 * Phase 4.5 additions:
 *   billedRate    — client-facing hourly rate = Equipment.clientDayRate / 8
 *   revenueImpact — hoursUsed × billedRate
 */
export interface EquipmentUsageRecord {
  id: string;

  reportId: string;
  reviewId: string;

  assetId: string;
  assetName: string;

  hoursUsed: number;

  usageCost: number;    // hoursUsed × (Equipment.dayRate / 8) — cost basis

  // Phase 4.5 — Revenue
  billedRate: number;   // Equipment.clientDayRate / 8 (or dayRate / 8 as fallback)
  revenueImpact: number; // hoursUsed × billedRate

  jobId: string;

  approvedAt: string;
}

/**
 * A normalized invoice line item created from approved operational
 * data. Unlike InvoiceBillingLine (used for display inside Invoice
 * documents), this is a financial normalization record traceable
 * back to a specific report and review.
 */
export interface InvoiceLineItem {
  id: string;

  reportId: string;
  reviewId: string;

  jobId: string;

  type:
    | "labor"
    | "material"
    | "equipment"
    | "expense";

  description: string;

  quantity: number;
  unitPrice: number;

  amount: number; // quantity × unitPrice

  approvedAt: string;
}

/**
 * An immutable audit record of every financial state change
 * caused by a Review Center approval.
 */
export interface FinancialMutation {
  id: string;

  jobId: string;

  sourceReportId: string;
  sourceReviewId: string;

  mutationType:
    | "timesheet"
    | "expense"
    | "inventory"
    | "equipment"
    | "invoice";

  entityId: string;

  createdAt: string;

  approvedBy: string;
}

// ======================================================
// PHASE 4.1 — MOCK FINANCIAL TABLES
//
// Base arrays start empty. Pre-seeded demo data below
// populates them via the normal approval path so that
// Financial Explorer, Job Financial Summary, and Job
// Intelligence show real numbers on first load.
// ======================================================

// ======================================================
// PHASE 5.3 — INVOICE DRAFT STORE
//
// InvoiceDraft documents are generated deterministically
// from approved InvoiceLineItem records by invoiceBuilder.ts.
// They live here alongside the other normalized financial tables.
//
// Like all financial records, these are populated by the
// approval path, never created directly from a Job.
// ======================================================

import type { InvoiceDraft } from "@/types/finance";
export type { InvoiceDraft } from "@/types/finance";
export type { InvoiceStatus } from "@/types/finance";
export type { InvoiceDraftLineItem } from "@/types/finance";

export const mockInvoiceDrafts: InvoiceDraft[] = [];

// ── Invoice number generator ───────────────────────────
// Deterministic sequential numbering scoped to the current session.
// Format: INV-YYYY-NNNN   e.g. INV-2026-0001
// Production would use a persisted counter; for the mock this is
// sufficient to produce unique, human-readable numbers.
let _invoiceDraftSeq = 0;
export function generateInvoiceNumber(): string {
  _invoiceDraftSeq += 1;
  const year = new Date().getFullYear();
  return `INV-${year}-${String(_invoiceDraftSeq).padStart(4, "0")}`;
}

export const mockTimesheets: TimesheetEntry[] = [];

export const mockExpenses: ExpenseEntry[] = [];

export const mockInventoryMutations: InventoryMutation[] = [];

export const mockEquipmentUsage: EquipmentUsageRecord[] = [];

export const mockInvoiceLineItems: InvoiceLineItem[] = [];

export const mockFinancialMutations: FinancialMutation[] = [];

// ======================================================
// PHASE 4.5 — DEMO SEED: PRE-APPROVED FINANCIAL RECORDS
//
// Simulates a PM having already approved a full WorkerReport
// for the Kitchen Extraction job. Pre-populates all six
// normalized tables so the UI shows live financial data
// immediately on first load without any manual approval step.
//
// These records are representative, not exhaustive.
// They do not duplicate or conflict with the Review Center
// approval flow — they are a snapshot of one pre-approved
// report that would have been generated by that flow.
// ======================================================

(function seedDemoFinancialRecords() {
  const JOB_ID = "dj-kitchen-extract-1";
  const APPROVED_AT = "2026-05-22T16:00:00Z";
  const APPROVED_BY = "Amir Khan";
  const REPORT_ID = "seed-report-kex-1";
  const REVIEW_ID = "seed-review-kex-1";

  // ──────────────────────────────────────
  // LABOUR — Sophie Taylor: 32h
  // costRate £16/h, billableRate £55/h
  // ──────────────────────────────────────
  mockTimesheets.push({
    id: "seed-ts-kex-1",
    reportId: REPORT_ID,
    reviewId: REVIEW_ID,
    jobId: JOB_ID,
    workerId: "dw2",
    workerName: "Sophie Taylor",
    hours: 32,
    hourlyRate: 16,
    laborCost: 512,
    billableRate: 55,
    laborRevenue: 1760,
    approvedAt: APPROVED_AT,
    approvedBy: APPROVED_BY,
  });

  // ──────────────────────────────────────
  // LABOUR — Ben Hughes: 24h
  // costRate £16/h, billableRate £55/h
  // ──────────────────────────────────────
  mockTimesheets.push({
    id: "seed-ts-kex-2",
    reportId: REPORT_ID,
    reviewId: REVIEW_ID,
    jobId: JOB_ID,
    workerId: "dw3",
    workerName: "Ben Hughes",
    hours: 24,
    hourlyRate: 16,
    laborCost: 384,
    billableRate: 55,
    laborRevenue: 1320,
    approvedAt: APPROVED_AT,
    approvedBy: APPROVED_BY,
  });

  // ──────────────────────────────────────
  // EQUIPMENT — Hiab support: 16h used
  // dayRate £420, clientDayRate £520
  // billedRate = 520/8 = £65/h
  // ──────────────────────────────────────
  mockEquipmentUsage.push({
    id: "seed-eq-kex-1",
    reportId: REPORT_ID,
    reviewId: REVIEW_ID,
    assetId: "de1",
    assetName: "Hiab support (canopy lift)",
    hoursUsed: 16,
    usageCost: 840,    // 16 * (420/8)
    billedRate: 65,    // 520/8
    revenueImpact: 1040, // 16 * 65
    jobId: JOB_ID,
    approvedAt: APPROVED_AT,
  });

  // ──────────────────────────────────────
  // EQUIPMENT — Crew van: 24h used
  // dayRate £120, clientDayRate £150
  // billedRate = 150/8 = £18.75/h
  // ──────────────────────────────────────
  mockEquipmentUsage.push({
    id: "seed-eq-kex-2",
    reportId: REPORT_ID,
    reviewId: REVIEW_ID,
    assetId: "de11",
    assetName: "Crew van (tools transport)",
    hoursUsed: 24,
    usageCost: 360,      // 24 * (120/8)
    billedRate: 18.75,   // 150/8
    revenueImpact: 450,  // 24 * 18.75
    jobId: JOB_ID,
    approvedAt: APPROVED_AT,
  });

  // ──────────────────────────────────────
  // EXPENSE — Skip hire: £185 cost, 15% markup
  // recoveryAmount = 185 * 1.15 = £212.75
  // ──────────────────────────────────────
  mockExpenses.push({
    id: "seed-exp-kex-1",
    reportId: REPORT_ID,
    reviewId: REVIEW_ID,
    jobId: JOB_ID,
    description: "Skip hire \u2014 waste removal",
    amount: 185,
    markupPercent: 15,
    recoveryAmount: 212.75,
    submittedBy: "Sophie Taylor",
    approvedAt: APPROVED_AT,
    approvedBy: APPROVED_BY,
  });

  // ──────────────────────────────────────
  // MATERIALS — 15mm Isolating Valves: 40 units
  // unitCost £2.10, markupPrice £3.50
  // ──────────────────────────────────────
  mockInventoryMutations.push({
    id: "seed-inv-kex-1",
    reportId: REPORT_ID,
    reviewId: REVIEW_ID,
    stockItemId: "stock-3",
    stockItemName: "15mm Isolating Valve",
    quantityUsed: 40,
    unitCost: 2.10,
    markupPrice: 3.50,
    jobCostImpact: 84,    // 40 * 2.10
    revenueImpact: 140,   // 40 * 3.50
    jobId: JOB_ID,
    approvedAt: APPROVED_AT,
  });

  // ──────────────────────────────────────
  // INVOICE LINE ITEMS — mirror the above
  // ──────────────────────────────────────
  mockInvoiceLineItems.push(
    { id: "seed-line-1", reportId: REPORT_ID, reviewId: REVIEW_ID, jobId: JOB_ID, type: "labor",     description: "Labour \u2013 Sophie Taylor (32h @ \u00a355/h)",          quantity: 32,   unitPrice: 55,     amount: 1760,   approvedAt: APPROVED_AT },
    { id: "seed-line-2", reportId: REPORT_ID, reviewId: REVIEW_ID, jobId: JOB_ID, type: "labor",     description: "Labour \u2013 Ben Hughes (24h @ \u00a355/h)",            quantity: 24,   unitPrice: 55,     amount: 1320,   approvedAt: APPROVED_AT },
    { id: "seed-line-3", reportId: REPORT_ID, reviewId: REVIEW_ID, jobId: JOB_ID, type: "equipment", description: "Equipment \u2013 Hiab support (canopy lift) (16h)",  quantity: 16,   unitPrice: 65,     amount: 1040,   approvedAt: APPROVED_AT },
    { id: "seed-line-4", reportId: REPORT_ID, reviewId: REVIEW_ID, jobId: JOB_ID, type: "equipment", description: "Equipment \u2013 Crew van (tools transport) (24h)",  quantity: 24,   unitPrice: 18.75,  amount: 450,    approvedAt: APPROVED_AT },
    { id: "seed-line-5", reportId: REPORT_ID, reviewId: REVIEW_ID, jobId: JOB_ID, type: "expense",   description: "Expense \u2013 Skip hire \u2014 waste removal (+15% markup)", quantity: 1,  unitPrice: 212.75, amount: 212.75, approvedAt: APPROVED_AT },
    { id: "seed-line-6", reportId: REPORT_ID, reviewId: REVIEW_ID, jobId: JOB_ID, type: "material",  description: "Materials \u2013 15mm Isolating Valve \u00d740",           quantity: 40,   unitPrice: 3.50,   amount: 140,    approvedAt: APPROVED_AT },
  );

  // ──────────────────────────────────────
  // FINANCIAL MUTATIONS — audit trail for seed records
  // ──────────────────────────────────────
  const seedMutations: Array<{ type: FinancialMutation["mutationType"]; entityId: string }> = [
    { type: "timesheet",  entityId: "seed-ts-kex-1"  },
    { type: "timesheet",  entityId: "seed-ts-kex-2"  },
    { type: "equipment",  entityId: "seed-eq-kex-1"  },
    { type: "equipment",  entityId: "seed-eq-kex-2"  },
    { type: "expense",    entityId: "seed-exp-kex-1" },
    { type: "inventory",  entityId: "seed-inv-kex-1" },
    { type: "invoice",    entityId: "seed-line-1"    },
    { type: "invoice",    entityId: "seed-line-2"    },
    { type: "invoice",    entityId: "seed-line-3"    },
    { type: "invoice",    entityId: "seed-line-4"    },
    { type: "invoice",    entityId: "seed-line-5"    },
    { type: "invoice",    entityId: "seed-line-6"    },
  ];
  seedMutations.forEach(({ type, entityId }, i) => {
    mockFinancialMutations.push({
      id: `seed-mut-kex-${i + 1}`,
      jobId: JOB_ID,
      sourceReportId: REPORT_ID,
      sourceReviewId: REVIEW_ID,
      mutationType: type,
      entityId,
      createdAt: APPROVED_AT,
      approvedBy: APPROVED_BY,
    });
  });
  // ────────────────────────────────────
  // PHASE 5.3 — SEED INVOICE DRAFT
  // Generated from the seed InvoiceLineItem records above.
  // Mirrors what invoiceBuilder.generateInvoiceDraft() would produce
  // for dj-kitchen-extract-1 so the Invoice Builder page has live
  // data on first load without requiring a manual approval.
  // ────────────────────────────────────
  const seedDraftLines = [
    { id: "seed-line-1", type: "labor"     as const, description: "Labour \u2013 Sophie Taylor (32h @ \u00a355/h)",             quantity: 32,  unitPrice: 55,     amount: 1760   },
    { id: "seed-line-2", type: "labor"     as const, description: "Labour \u2013 Ben Hughes (24h @ \u00a355/h)",               quantity: 24,  unitPrice: 55,     amount: 1320   },
    { id: "seed-line-3", type: "equipment" as const, description: "Equipment \u2013 Hiab support (canopy lift) (16h)",   quantity: 16,  unitPrice: 65,     amount: 1040   },
    { id: "seed-line-4", type: "equipment" as const, description: "Equipment \u2013 Crew van (tools transport) (24h)",   quantity: 24,  unitPrice: 18.75,  amount: 450    },
    { id: "seed-line-5", type: "expense"   as const, description: "Expense \u2013 Skip hire \u2014 waste removal (+15% markup)", quantity: 1,  unitPrice: 212.75, amount: 212.75 },
    { id: "seed-line-6", type: "material"  as const, description: "Materials \u2013 15mm Isolating Valve \u00d740",            quantity: 40,  unitPrice: 3.50,   amount: 140    },
  ];
  const seedSubtotal = seedDraftLines.reduce((s, l) => s + l.amount, 0); // 4922.75
  const seedTaxRate  = 0;
  const seedTaxAmt   = seedSubtotal * seedTaxRate;
  mockInvoiceDrafts.push({
    id: "seed-draft-kex-1",
    invoiceNumber: "INV-2026-0001",
    jobId: JOB_ID,
    clientId: "dc1",
    lineItems: seedDraftLines,
    subtotal: seedSubtotal,
    taxRate: seedTaxRate,
    taxAmount: seedTaxAmt,
    total: seedSubtotal + seedTaxAmt,
    status: "draft",
    createdAt: APPROVED_AT,
    updatedAt: APPROVED_AT,
  });
  // Keep the seq counter consistent with the seeded invoice number
  _invoiceDraftSeq = 1;
})();

// ======================================================
// PHASE 4.4 — JOB FINANCIAL SUMMARY
//
// Derived calculation layer. Summaries are computed on demand
// from the Phase 4.2 / 4.5 financial arrays.
// ======================================================

export interface JobFinancialSummary {
  jobId: string;

  laborCost: number;
  materialCost: number;
  equipmentCost: number;
  expenseCost: number;

  totalCost: number;

  laborRevenue: number;
  materialRevenue: number;
  equipmentRevenue: number;
  expenseRevenue: number;

  totalRevenue: number;

  grossProfit: number;
  marginPercent: number;

  hasActivity: boolean;
}

/**
 * Pure calculation — no side effects, no storage.
 * Phase 4.5: all four revenue streams now populated from
 * normalized records.
 */
export function getJobFinancialSummary(jobId: string): JobFinancialSummary {
  const laborCost = mockTimesheets
    .filter(t => t.jobId === jobId)
    .reduce((sum, t) => sum + t.laborCost, 0);

  const materialCost = mockInventoryMutations
    .filter(m => m.jobId === jobId)
    .reduce((sum, m) => sum + m.jobCostImpact, 0);

  const equipmentCost = mockEquipmentUsage
    .filter(r => r.jobId === jobId)
    .reduce((sum, r) => sum + r.usageCost, 0);

  const expenseCost = mockExpenses
    .filter(e => e.jobId === jobId)
    .reduce((sum, e) => sum + e.amount, 0);

  const totalCost = laborCost + materialCost + equipmentCost + expenseCost;

  // Phase 4.5 — all four revenue streams from normalized records.
  const laborRevenue = mockTimesheets
    .filter(t => t.jobId === jobId)
    .reduce((sum, t) => sum + t.laborRevenue, 0);

  const materialRevenue = mockInventoryMutations
    .filter(m => m.jobId === jobId)
    .reduce((sum, m) => sum + m.revenueImpact, 0);

  const equipmentRevenue = mockEquipmentUsage
    .filter(r => r.jobId === jobId)
    .reduce((sum, r) => sum + r.revenueImpact, 0);

  const expenseRevenue = mockExpenses
    .filter(e => e.jobId === jobId)
    .reduce((sum, e) => sum + e.recoveryAmount, 0);

  const totalRevenue = laborRevenue + materialRevenue + equipmentRevenue + expenseRevenue;

  const grossProfit = totalRevenue - totalCost;
  const marginPercent = totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0;

  const hasActivity = totalCost > 0 || totalRevenue > 0;

  return {
    jobId,
    laborCost,
    materialCost,
    equipmentCost,
    expenseCost,
    totalCost,
    laborRevenue,
    materialRevenue,
    equipmentRevenue,
    expenseRevenue,
    totalRevenue,
    grossProfit,
    marginPercent,
    hasActivity,
  };
}

// ======================================================
// PHASE 5.4 — PAYROLL EXPORT STORE
//
// PayrollExport documents are generated by the
// payrollExportEngine.ts generatePayrollExport() function.
// Stored here alongside other normalized financial tables.
//
// Doctrine: only generated from PayrollStagingRecord[]
// which are derived from approved TimesheetEntry records.
// Never generated directly from Jobs or ReviewItems.
// ======================================================

import type { PayrollExport, PayrollExportStatus } from "@/lib/payrollExportEngine";
export type { PayrollExport } from "@/lib/payrollExportEngine";

export const mockPayrollExports: PayrollExport[] = [];

// ── Payroll export number generator ───────────────────
// Format: PAY-YYYY-NNNN   e.g. PAY-2026-0001
let _payrollExportSeq = 0;
export function generateExportNumber(): string {
  _payrollExportSeq += 1;
  const year = new Date().getFullYear();
  return `PAY-${year}-${String(_payrollExportSeq).padStart(4, "0")}`;
}

export type { Job } from "@/types/job";
export type { Worker } from "@/types/worker";
export type { Client } from "@/types/client";
export type { Role, PermissionKey } from "@/types/auth";
