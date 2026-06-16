// ======================================================
// UX-6.4 — AUTOMATION APPROVAL QUEUE ENGINE
//
// Surfaces automation executions that have intentionally STOPPED at a
// human approval boundary. This engine is INFORMATIONAL ONLY — it models
// blocked/queued work so the CEO can see what is waiting for a human
// decision. It NEVER approves anything and NEVER mutates financial records.
//
// Doctrine:
//   Automation may QUEUE work but may NEVER:
//     - approve expenses / reports / payroll / timesheets
//     - create approved invoices or approved financial records
//     - bypass the Review Centre or CEO approvals
//   Human approval remains mandatory for financially significant events.
//   This queue surfaces blocked work; it does not action it.
//
// Architecture: Mock only. Pure functions + seed data, consistent with the
// existing automation engines.
// ======================================================

import type {
  AutomationGovernanceStatus,
  AutomationRiskLevel,
} from "./automationGovernanceEngine";

// ──────────────────────────────────────────────────────
// CLASSIFICATION TYPES
// ──────────────────────────────────────────────────────

export type ApprovalType = "Financial" | "Operational" | "Governance";
export type ApproverRole = "CEO" | "PM";
export type ApprovalPriority = "Low" | "Medium" | "High" | "Critical";
export type ApprovalQueueStatus = "Awaiting Approval" | "Pending Review";

export const APPROVAL_TYPE_COLORS: Record<ApprovalType, string> = {
  Financial: "text-red-600 border-red-200 bg-red-50",
  Operational: "text-blue-600 border-blue-200 bg-blue-50",
  Governance: "text-amber-700 border-amber-200 bg-amber-50",
};

export const APPROVER_COLORS: Record<ApproverRole, string> = {
  CEO: "text-violet-700 border-violet-200 bg-violet-50",
  PM: "text-blue-700 border-blue-200 bg-blue-50",
};

export const PRIORITY_COLORS: Record<ApprovalPriority, string> = {
  Low: "text-slate-600 border-slate-200 bg-slate-50",
  Medium: "text-blue-600 border-blue-200 bg-blue-50",
  High: "text-amber-700 border-amber-200 bg-amber-50",
  Critical: "text-red-600 border-red-200 bg-red-50",
};

const PRIORITY_RANK: Record<ApprovalPriority, number> = {
  Critical: 4, High: 3, Medium: 2, Low: 1,
};

// ──────────────────────────────────────────────────────
// QUEUE ENTRY
// ──────────────────────────────────────────────────────

export interface ApprovalQueueEntry {
  id: string;                 // Display Queue ID: AQ-2026-001
  ruleId: string | null;
  ruleNumber: string;
  ruleName: string;
  triggerType: string;
  triggerLabel: string;
  /** What the automation was about to do (the queued action). */
  category: string;           // Invoice / Payroll / Accounting Sync / Report / Operational
  jobId: string | null;
  jobName: string | null;
  clientName: string | null;
  approvalType: ApprovalType;
  approverRole: ApproverRole;
  status: ApprovalQueueStatus;
  priority: ApprovalPriority;
  /** ISO timestamp the execution was blocked. */
  blockedSince: string;
  /** Plain explanation of why execution stopped. */
  blockReason: string;
  /** The approval boundary that must clear before continuation. */
  approvalBoundary: string;
  /** Related Review Centre item + deep-link route (surface only — no action). */
  reviewItemRef: string | null;
  reviewRoute: string | null;
  governanceStatus: AutomationGovernanceStatus | null;
  riskLevel: AutomationRiskLevel | null;
  isFinanciallySensitive: boolean;
  isGovernanceRestricted: boolean;
  /** Audit references (surface only). */
  auditRef: string | null;
  executionId: string | null;
}

// ──────────────────────────────────────────────────────
// REFERENCE "NOW"
//
// Waiting durations are computed against a fixed reference instant so the
// queue is deterministic (and reproducible in tests). It equals the dataset's
// current date.
// ──────────────────────────────────────────────────────

export const QUEUE_REFERENCE_NOW = "2026-06-16T09:00:00Z";

// ──────────────────────────────────────────────────────
// SEED DATA
//
// Six blocked entries spanning CEO/PM and Financial/Operational/Governance
// boundaries. Financially sensitive entries reference the financially
// sensitive seed rules (rule-003 / rule-004); payroll entries model queued —
// never approved — payroll staging; the governance-restricted entry references
// the restricted rule-005.
// ──────────────────────────────────────────────────────

const SEED_QUEUE: ApprovalQueueEntry[] = [
  {
    id: "AQ-2026-001",
    ruleId: "rule-004",
    ruleNumber: "AUT-2026-004",
    ruleName: "Generate Draft Invoice on Job Completion",
    triggerType: "job_status_changed",
    triggerLabel: "Job Completed",
    category: "Invoice",
    jobId: "dj-kitchen-extract-1",
    jobName: "Kitchen extraction & ventilation install",
    clientName: "Northgate Facilities",
    approvalType: "Financial",
    approverRole: "CEO",
    status: "Awaiting Approval",
    priority: "High",
    blockedSince: "2026-06-14T16:00:00Z",
    blockReason:
      "A draft invoice was generated but cannot become financially real. Approval is required before the invoice is issued.",
    approvalBoundary: "CEO approval — invoice issuance (Review Centre → Approve)",
    reviewItemRef: "REV-2026-0188",
    reviewRoute: "/review-centre",
    governanceStatus: "Requires Review",
    riskLevel: "Critical",
    isFinanciallySensitive: true,
    isGovernanceRestricted: false,
    auditRef: "gov-audit-003",
    executionId: null,
  },
  {
    id: "AQ-2026-002",
    ruleId: "rule-003",
    ruleNumber: "AUT-2026-003",
    ruleName: "Queue Accounting Sync on Review Approval",
    triggerType: "review_approved",
    triggerLabel: "Review Approved",
    category: "Accounting Sync",
    jobId: "dj-kitchen-extract-1",
    jobName: "Kitchen extraction & ventilation install",
    clientName: "Northgate Facilities",
    approvalType: "Financial",
    approverRole: "CEO",
    status: "Awaiting Approval",
    priority: "Medium",
    blockedSince: "2026-06-10T14:30:00Z",
    blockReason:
      "Queue Accounting Sync is financially sensitive and the underlying record is not yet approved. The sync action is held until approval clears.",
    approvalBoundary: "CEO approval — financial record before accounting sync",
    reviewItemRef: "REV-2026-0173",
    reviewRoute: "/review-centre",
    governanceStatus: "Requires Review",
    riskLevel: "High",
    isFinanciallySensitive: true,
    isGovernanceRestricted: false,
    auditRef: "audit-seed-004",
    executionId: "exec-rule-003-seed-004",
  },
  {
    id: "AQ-2026-003",
    ruleId: null,
    ruleNumber: "AUT-2026-007",
    ruleName: "Stage Approved Payroll Batch for Export",
    triggerType: "schedule_trigger",
    triggerLabel: "Scheduled (Weekly Payroll)",
    category: "Payroll",
    jobId: "job-citywide-security",
    jobName: "Citywide Security Contract",
    clientName: "Citywide Holdings",
    approvalType: "Financial",
    approverRole: "CEO",
    status: "Awaiting Approval",
    priority: "High",
    blockedSince: "2026-06-08T09:00:00Z",
    blockReason:
      "A payroll batch was staged for export but payroll can never be approved by automation. CEO approval is mandatory before the batch is released.",
    approvalBoundary: "CEO approval — payroll batch release",
    reviewItemRef: "REV-2026-0151",
    reviewRoute: "/review-centre",
    governanceStatus: "Requires Review",
    riskLevel: "Critical",
    isFinanciallySensitive: true,
    isGovernanceRestricted: false,
    auditRef: null,
    executionId: null,
  },
  {
    id: "AQ-2026-004",
    ruleId: null,
    ruleNumber: "AUT-2026-008",
    ruleName: "Stage Expense Reimbursement on Approval",
    triggerType: "review_approved",
    triggerLabel: "Review Approved",
    category: "Payroll",
    jobId: "job-riverside-cleaning",
    jobName: "Riverside Cleaning Programme",
    clientName: "Riverside Estates",
    approvalType: "Financial",
    approverRole: "CEO",
    status: "Awaiting Approval",
    priority: "Medium",
    blockedSince: "2026-06-12T11:00:00Z",
    blockReason:
      "An expense reimbursement was staged but expenses can never be approved by automation. CEO approval is required before reimbursement.",
    approvalBoundary: "CEO approval — expense reimbursement",
    reviewItemRef: "REV-2026-0166",
    reviewRoute: "/review-centre",
    governanceStatus: "Requires Review",
    riskLevel: "High",
    isFinanciallySensitive: true,
    isGovernanceRestricted: false,
    auditRef: null,
    executionId: null,
  },
  {
    id: "AQ-2026-005",
    ruleId: "rule-005",
    ruleNumber: "AUT-2026-005",
    ruleName: "Escalate Worker Report to Review Centre",
    triggerType: "worker_report_submitted",
    triggerLabel: "Worker Report Submitted",
    category: "Operational",
    jobId: null,
    jobName: null,
    clientName: null,
    approvalType: "Governance",
    approverRole: "PM",
    status: "Pending Review",
    priority: "Medium",
    blockedSince: "2026-06-13T08:00:00Z",
    blockReason:
      "This automation is governance-restricted following repeated failures and cannot execute. It is awaiting CEO governance intervention.",
    approvalBoundary: "Governance intervention — restricted automation",
    reviewItemRef: null,
    reviewRoute: "/automation-governance",
    governanceStatus: "Restricted",
    riskLevel: "Medium",
    isFinanciallySensitive: false,
    isGovernanceRestricted: true,
    auditRef: "gov-audit-004",
    executionId: null,
  },
  {
    id: "AQ-2026-006",
    ruleId: "rule-002",
    ruleNumber: "AUT-2026-002",
    ruleName: "Auto-assign PM on Job Creation",
    triggerType: "job_created",
    triggerLabel: "Job Created",
    category: "Operational",
    jobId: "job-new-2026-014",
    jobName: "Eastgate Retail Maintenance",
    clientName: "Eastgate Retail Group",
    approvalType: "Operational",
    approverRole: "PM",
    status: "Pending Review",
    priority: "Low",
    blockedSince: "2026-06-15T10:00:00Z",
    blockReason:
      "PM assignment requires confirmation because no eligible PM is currently allocated to the job. Awaiting PM review.",
    approvalBoundary: "PM review — manager assignment",
    reviewItemRef: null,
    reviewRoute: "/jobs",
    governanceStatus: "Compliant",
    riskLevel: "Low",
    isFinanciallySensitive: false,
    isGovernanceRestricted: false,
    auditRef: null,
    executionId: null,
  },
];

// ──────────────────────────────────────────────────────
// QUERY + DERIVATION
// ──────────────────────────────────────────────────────

export function getApprovalQueue(): ApprovalQueueEntry[] {
  return [...SEED_QUEUE];
}

/** Whole hours an entry has been waiting, against the fixed reference instant. */
export function computeWaitingHours(
  entry: ApprovalQueueEntry,
  now: string = QUEUE_REFERENCE_NOW
): number {
  const ms = new Date(now).getTime() - new Date(entry.blockedSince).getTime();
  return Math.max(0, Math.round(ms / (1000 * 60 * 60)));
}

/** Friendly waiting-time label, e.g. "8d 0h" or "23h". */
export function formatWaiting(hours: number): string {
  if (hours < 24) return `${hours}h`;
  const d = Math.floor(hours / 24);
  const h = hours % 24;
  return h === 0 ? `${d}d` : `${d}d ${h}h`;
}

export interface ApprovalQueueSummary {
  total: number;
  ceoApprovals: number;
  pmApprovals: number;
  financialPending: number;
  operationalPending: number;
  governancePending: number;
  highPriority: number;
  avgWaitHours: number;
  oldest: ApprovalQueueEntry | null;
  oldestWaitHours: number;
}

export function computeApprovalQueueSummary(
  entries: ApprovalQueueEntry[],
  now: string = QUEUE_REFERENCE_NOW
): ApprovalQueueSummary {
  const total = entries.length;
  const waits = entries.map((e) => computeWaitingHours(e, now));
  const avgWaitHours = total > 0 ? Math.round(waits.reduce((s, h) => s + h, 0) / total) : 0;

  let oldest: ApprovalQueueEntry | null = null;
  let oldestWaitHours = 0;
  entries.forEach((e, i) => {
    if (waits[i] > oldestWaitHours) {
      oldestWaitHours = waits[i];
      oldest = e;
    }
  });

  return {
    total,
    ceoApprovals: entries.filter((e) => e.approverRole === "CEO").length,
    pmApprovals: entries.filter((e) => e.approverRole === "PM").length,
    financialPending: entries.filter((e) => e.approvalType === "Financial").length,
    operationalPending: entries.filter((e) => e.approvalType === "Operational").length,
    governancePending: entries.filter((e) => e.approvalType === "Governance").length,
    highPriority: entries.filter((e) => e.priority === "High" || e.priority === "Critical").length,
    avgWaitHours,
    oldest,
    oldestWaitHours,
  };
}

/** Priority-then-wait ordering for the inbox view. */
export function sortQueueForInbox(
  entries: ApprovalQueueEntry[],
  now: string = QUEUE_REFERENCE_NOW
): ApprovalQueueEntry[] {
  return [...entries].sort((a, b) => {
    const p = PRIORITY_RANK[b.priority] - PRIORITY_RANK[a.priority];
    if (p !== 0) return p;
    return computeWaitingHours(b, now) - computeWaitingHours(a, now);
  });
}

/** Data-driven executive attention lines (only emitted when true). */
export function generateApprovalAttention(entries: ApprovalQueueEntry[]): string[] {
  const lines: string[] = [];
  const payroll = entries.filter((e) => e.category === "Payroll").length;
  if (payroll > 0) {
    lines.push(
      `${payroll} payroll-related automation${payroll === 1 ? " is" : "s are"} awaiting CEO approval.`
    );
  }
  const invoices = entries.filter((e) => e.category === "Invoice").length;
  if (invoices > 0) {
    lines.push(
      `${invoices} invoice workflow${invoices === 1 ? " has" : "s have"} been paused pending financial review.`
    );
  }
  const restricted = entries.filter((e) => e.isGovernanceRestricted).length;
  if (restricted > 0) {
    lines.push(
      `${restricted} governance-restricted automation${restricted === 1 ? " is" : "s are"} awaiting intervention.`
    );
  }
  const ceoFinancial = entries.filter((e) => e.approverRole === "CEO" && e.approvalType === "Financial").length;
  if (ceoFinancial > 0) {
    lines.push(
      `${ceoFinancial} financially significant automation${ceoFinancial === 1 ? "" : "s"} cannot proceed without human approval.`
    );
  }
  return lines;
}
