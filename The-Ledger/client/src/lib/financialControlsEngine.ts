// ======================================================
// PHASE 5.9 — FINANCIAL CONTROLS ENGINE
//
// Manages controlled overrides and financial control
// requests. No override is silent — every override
// requires approval and generates an audit trail.
//
// Architecture: Mock only. No backend. Pure functions +
// seed data.
//
// Doctrine:
//   No silent overrides.
//   Every override requires: requesting user, reason,
//   financial impact, approval.
//   All controls generate audit entries.
// ======================================================

// ──────────────────────────────────────────────────────
// CONTROL TYPES
// ──────────────────────────────────────────────────────

export type ControlType =
  | "revenue_override"
  | "cost_override"
  | "payroll_override"
  | "invoice_override"
  | "reconciliation_override";

export const CONTROL_TYPE_LABELS: Record<ControlType, string> = {
  revenue_override: "Revenue Override",
  cost_override: "Cost Override",
  payroll_override: "Payroll Override",
  invoice_override: "Invoice Override",
  reconciliation_override: "Reconciliation Override",
};

export const CONTROL_TYPE_COLORS: Record<ControlType, string> = {
  revenue_override: "text-emerald-600 border-emerald-200 bg-emerald-50",
  cost_override: "text-red-600 border-red-200 bg-red-50",
  payroll_override: "text-blue-600 border-blue-200 bg-blue-50",
  invoice_override: "text-violet-600 border-violet-200 bg-violet-50",
  reconciliation_override: "text-amber-600 border-amber-200 bg-amber-50",
};

// ──────────────────────────────────────────────────────
// CONTROL STATES
// ──────────────────────────────────────────────────────

export type ControlState =
  | "draft"
  | "pending_approval"
  | "approved"
  | "rejected";

export const CONTROL_STATE_LABELS: Record<ControlState, string> = {
  draft: "Draft",
  pending_approval: "Pending Approval",
  approved: "Approved",
  rejected: "Rejected",
};

export const CONTROL_STATE_COLORS: Record<ControlState, string> = {
  draft: "text-slate-600 border-slate-200 bg-slate-50",
  pending_approval: "text-amber-600 border-amber-200 bg-amber-50",
  approved: "text-emerald-600 border-emerald-200 bg-emerald-50",
  rejected: "text-red-600 border-red-200 bg-red-50",
};

// ──────────────────────────────────────────────────────
// FINANCIAL CONTROL RECORD
// ──────────────────────────────────────────────────────

export interface ControlAuditEntry {
  id: string;
  controlId: string;
  timestamp: string;
  action: string;        // e.g. "Submitted", "Approved", "Rejected"
  performedBy: string;
  notes: string | null;
}

export interface FinancialControl {
  id: string;
  controlNumber: string;         // Display: CTL-2026-001
  type: ControlType;
  state: ControlState;
  jobId: string | null;
  jobName: string | null;
  description: string;           // What is being overridden and why
  requestedBy: string;           // User name
  requestedAt: string;           // ISO timestamp
  approvingUser: string | null;  // CEO who approved/rejected
  approvedAt: string | null;
  reason: string;                // Business justification
  financialImpact: number;       // GBP amount — can be positive or negative
  auditTrail: ControlAuditEntry[];
}

// ──────────────────────────────────────────────────────
// CONTROL SUMMARY
// ──────────────────────────────────────────────────────

export interface ControlSummary {
  pending: number;
  approved: number;
  rejected: number;
  draft: number;
  total: number;
  totalFinancialImpact: number;      // Sum of all approved override amounts
  pendingFinancialImpact: number;    // Sum of pending override amounts
}

// ──────────────────────────────────────────────────────
// SEED DATA
// ──────────────────────────────────────────────────────

export const SEED_FINANCIAL_CONTROLS: FinancialControl[] = [
  {
    id: "ctl-001",
    controlNumber: "CTL-2026-001",
    type: "invoice_override",
    state: "pending_approval",
    jobId: "dj-kitchen-extract-1",
    jobName: "Kitchen extraction & ventilation install",
    description: "Override invoice total for INV-2026-003 to correct for £50.00 discrepancy identified during reconciliation. QuickBooks figure (£4,200.00) is incorrect — Ledger figure (£4,250.00) is authoritative.",
    requestedBy: "Sarah Chen",
    requestedAt: "2026-05-31T10:00:00Z",
    approvingUser: null,
    approvedAt: null,
    reason: "Reconciliation mismatch identified as data entry error in QuickBooks at time of original import. Ledger figure confirmed correct by PM.",
    financialImpact: 50.00,
    auditTrail: [
      {
        id: "ctl-001-audit-001",
        controlId: "ctl-001",
        timestamp: "2026-05-31T10:00:00Z",
        action: "Submitted for Approval",
        performedBy: "Sarah Chen",
        notes: "Submitted following reconciliation exception EXC-2026-001.",
      },
    ],
  },
  {
    id: "ctl-002",
    controlNumber: "CTL-2026-002",
    type: "payroll_override",
    state: "pending_approval",
    jobId: "dj-kitchen-extract-1",
    jobName: "Kitchen extraction & ventilation install",
    description: "Override payroll export sync to apply manual account code mapping (QB account 5001 — Wages & Salaries) for Payroll Export Week 22. Required to unblock sync failure.",
    requestedBy: "Sarah Chen",
    requestedAt: "2026-05-31T09:30:00Z",
    approvingUser: null,
    approvedAt: null,
    reason: "Payroll account mapping was not configured during initial QuickBooks setup. This override applies the correct account code to allow sync to proceed.",
    financialImpact: 12450.00,
    auditTrail: [
      {
        id: "ctl-002-audit-001",
        controlId: "ctl-002",
        timestamp: "2026-05-31T09:30:00Z",
        action: "Submitted for Approval",
        performedBy: "Sarah Chen",
        notes: "Submitted as part of resolution for EXC-2026-003. Account code confirmed with finance team.",
      },
    ],
  },
  {
    id: "ctl-003",
    controlNumber: "CTL-2026-003",
    type: "revenue_override",
    state: "approved",
    jobId: null,
    jobName: null,
    description: "Override May revenue forecast threshold to 6% to account for confirmed emergency call-out contract expansion. Prevents false variance alerts for the remainder of the month.",
    requestedBy: "Sarah Chen",
    requestedAt: "2026-05-29T11:30:00Z",
    approvingUser: "Marcus Webb",
    approvedAt: "2026-05-30T09:05:00Z",
    reason: "Call-out contract scope expanded on 28 May. Forecast must reflect new baseline to avoid spurious exception generation.",
    financialImpact: 2400.00,
    auditTrail: [
      {
        id: "ctl-003-audit-001",
        controlId: "ctl-003",
        timestamp: "2026-05-29T11:30:00Z",
        action: "Submitted for Approval",
        performedBy: "Sarah Chen",
        notes: null,
      },
      {
        id: "ctl-003-audit-002",
        controlId: "ctl-003",
        timestamp: "2026-05-30T09:05:00Z",
        action: "Approved",
        performedBy: "Marcus Webb",
        notes: "Approved. Variance is favourable and explained by contract scope expansion. Threshold adjustment is appropriate.",
      },
    ],
  },
  {
    id: "ctl-004",
    controlNumber: "CTL-2026-004",
    type: "reconciliation_override",
    state: "rejected",
    jobId: null,
    jobName: null,
    description: "Override reconciliation scope to exclude pre-Ledger legacy Xero invoices from reconciliation checks.",
    requestedBy: "Sarah Chen",
    requestedAt: "2026-05-28T10:00:00Z",
    approvingUser: "Marcus Webb",
    approvedAt: "2026-05-29T14:35:00Z",
    reason: "Pre-Ledger invoices will always generate false exceptions. Excluding them from scope would reduce operational noise.",
    financialImpact: 0,
    auditTrail: [
      {
        id: "ctl-004-audit-001",
        controlId: "ctl-004",
        timestamp: "2026-05-28T10:00:00Z",
        action: "Submitted for Approval",
        performedBy: "Sarah Chen",
        notes: null,
      },
      {
        id: "ctl-004-audit-002",
        controlId: "ctl-004",
        timestamp: "2026-05-29T14:35:00Z",
        action: "Rejected",
        performedBy: "Marcus Webb",
        notes: "Rejected. Blanket exclusion of legacy records sets a poor precedent. Each pre-Ledger exception should be individually reviewed and closed, not suppressed.",
      },
    ],
  },
  {
    id: "ctl-005",
    controlNumber: "CTL-2026-005",
    type: "cost_override",
    state: "draft",
    jobId: "dj-kitchen-extract-1",
    jobName: "Kitchen extraction & ventilation install",
    description: "Override material cost posting for ventilation ducting materials (£380.00) to reclassify from job cost to direct expense for VAT reclaim purposes.",
    requestedBy: "Sarah Chen",
    requestedAt: "2026-05-31T11:30:00Z",
    approvingUser: null,
    approvedAt: null,
    reason: "Materials are VAT-reclaimable business expenses, not job costs. Reclassification ensures correct tax treatment.",
    financialImpact: 380.00,
    auditTrail: [
      {
        id: "ctl-005-audit-001",
        controlId: "ctl-005",
        timestamp: "2026-05-31T11:30:00Z",
        action: "Draft Created",
        performedBy: "Sarah Chen",
        notes: "Draft pending finance review before submission.",
      },
    ],
  },
];

// ──────────────────────────────────────────────────────
// ENGINE FUNCTIONS
// ──────────────────────────────────────────────────────

export function computeControlSummary(controls: FinancialControl[]): ControlSummary {
  const pending = controls.filter((c) => c.state === "pending_approval");
  const approved = controls.filter((c) => c.state === "approved");

  return {
    pending: pending.length,
    approved: approved.length,
    rejected: controls.filter((c) => c.state === "rejected").length,
    draft: controls.filter((c) => c.state === "draft").length,
    total: controls.length,
    totalFinancialImpact: approved.reduce((s, c) => s + c.financialImpact, 0),
    pendingFinancialImpact: pending.reduce((s, c) => s + c.financialImpact, 0),
  };
}

/**
 * Approve a financial control — returns updated control with audit entry.
 */
export function approveControl(
  control: FinancialControl,
  approverName: string,
  notes: string
): FinancialControl {
  const now = new Date().toISOString();
  const auditEntry: ControlAuditEntry = {
    id: `${control.id}-audit-${control.auditTrail.length + 1}`.padStart(3, "0"),
    controlId: control.id,
    timestamp: now,
    action: "Approved",
    performedBy: approverName,
    notes: notes || null,
  };
  return {
    ...control,
    state: "approved",
    approvingUser: approverName,
    approvedAt: now,
    auditTrail: [...control.auditTrail, auditEntry],
  };
}

/**
 * Reject a financial control — returns updated control with audit entry.
 */
export function rejectControl(
  control: FinancialControl,
  approverName: string,
  notes: string
): FinancialControl {
  const now = new Date().toISOString();
  const auditEntry: ControlAuditEntry = {
    id: `${control.id}-audit-${control.auditTrail.length + 1}`.padStart(3, "0"),
    controlId: control.id,
    timestamp: now,
    action: "Rejected",
    performedBy: approverName,
    notes: notes || null,
  };
  return {
    ...control,
    state: "rejected",
    approvingUser: approverName,
    approvedAt: now,
    auditTrail: [...control.auditTrail, auditEntry],
  };
}

export function fmt(n: number): string {
  return `£${n.toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
