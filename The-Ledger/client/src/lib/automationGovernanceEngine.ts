// ======================================================
// PHASE 6.0D — AUTOMATION GOVERNANCE ENGINE
//
// Operational oversight, risk classification, compliance
// monitoring, and financial safety controls for automation
// rules in The Ledger.
//
// Architecture: Mock only. No backend. Pure functions +
// seed data.
//
// Doctrine:
//   Governance exists to PROTECT financial integrity.
//   Governance may NEVER weaken existing safeguards.
//   CEO retains final authority over all governance.
//   All governance decisions generate immutable audit
//   records. No silent overrides. No silent approvals.
//   Job attribution is preserved in all governance records.
//   Accounting systems remain downstream consumers.
// ======================================================

import { AutomationCategory } from "./automationEngine";

// ──────────────────────────────────────────────────────
// RISK LEVELS
// ──────────────────────────────────────────────────────

export type AutomationRiskLevel =
  | "Low"
  | "Medium"
  | "High"
  | "Critical";

export const RISK_LEVEL_LABELS: Record<AutomationRiskLevel, string> = {
  Low: "Low",
  Medium: "Medium",
  High: "High",
  Critical: "Critical",
};

export const RISK_LEVEL_COLORS: Record<AutomationRiskLevel, string> = {
  Low: "text-emerald-600 border-emerald-200 bg-emerald-50",
  Medium: "text-amber-600 border-amber-200 bg-amber-50",
  High: "text-orange-600 border-orange-200 bg-orange-50",
  Critical: "text-red-600 border-red-200 bg-red-50",
};

export function getRiskLevelLabel(level: AutomationRiskLevel): string {
  return RISK_LEVEL_LABELS[level];
}

// ──────────────────────────────────────────────────────
// GOVERNANCE STATUSES
// ──────────────────────────────────────────────────────

export type AutomationGovernanceStatus =
  | "Compliant"
  | "Requires Review"
  | "Restricted"
  | "Suspended";

export const GOVERNANCE_STATUS_LABELS: Record<AutomationGovernanceStatus, string> = {
  Compliant: "Compliant",
  "Requires Review": "Requires Review",
  Restricted: "Restricted",
  Suspended: "Suspended",
};

export const GOVERNANCE_STATUS_COLORS: Record<AutomationGovernanceStatus, string> = {
  Compliant: "text-emerald-600 border-emerald-200 bg-emerald-50",
  "Requires Review": "text-amber-600 border-amber-200 bg-amber-50",
  Restricted: "text-orange-600 border-orange-200 bg-orange-50",
  Suspended: "text-red-600 border-red-200 bg-red-50",
};

export function getGovernanceStatusLabel(status: AutomationGovernanceStatus): string {
  return GOVERNANCE_STATUS_LABELS[status];
}

// ──────────────────────────────────────────────────────
// GOVERNANCE ACTION TYPES
// ──────────────────────────────────────────────────────

export type GovernanceAction =
  | "Restrict Automation"
  | "Suspend Automation"
  | "Restore Automation"
  | "Mark Compliant";

// ──────────────────────────────────────────────────────
// GOVERNANCE RECORD
// ──────────────────────────────────────────────────────

export interface AutomationGovernanceRecord {
  /** ID of the AutomationRule being governed */
  ruleId: string;
  ruleNumber: string;
  ruleName: string;
  ruleCategory: AutomationCategory;

  // Risk & Status
  riskLevel: AutomationRiskLevel;
  governanceStatus: AutomationGovernanceStatus;

  // Financial safety
  isFinanciallySensitive: boolean;
  isApprovalProtected: boolean;
  hasFinancialSafeguard: boolean;

  // Safeguard evaluation
  safeguardNotes: string;

  // Risk rationale
  riskRationale: string;

  // Execution statistics
  totalExecutions: number;
  successfulExecutions: number;
  blockedExecutions: number;
  failedExecutions: number;
  lastExecutedAt: string | null;

  // Audit references
  governanceAuditIds: string[];

  // Meta
  createdAt: string;
  updatedAt: string;
  reviewedBy: string | null;
  reviewedAt: string | null;
  notes: string;
}

// ──────────────────────────────────────────────────────
// GOVERNANCE EXCEPTION RECORD
// ──────────────────────────────────────────────────────

export type GovernanceExceptionStatus =
  | "Open"
  | "Investigating"
  | "Awaiting Approval"
  | "Resolved"
  | "Rejected";

export const EXCEPTION_STATUS_LABELS: Record<GovernanceExceptionStatus, string> = {
  Open: "Open",
  Investigating: "Investigating",
  "Awaiting Approval": "Awaiting Approval",
  Resolved: "Resolved",
  Rejected: "Rejected",
};

export const EXCEPTION_STATUS_COLORS: Record<GovernanceExceptionStatus, string> = {
  Open: "text-red-600 border-red-200 bg-red-50",
  Investigating: "text-amber-600 border-amber-200 bg-amber-50",
  "Awaiting Approval": "text-violet-600 border-violet-200 bg-violet-50",
  Resolved: "text-emerald-600 border-emerald-200 bg-emerald-50",
  Rejected: "text-slate-600 border-slate-200 bg-slate-50",
};

export type GovernanceExceptionType =
  | "Repeated Failures"
  | "Safeguard Violation"
  | "Excessive Execution Volume"
  | "Risk Threshold Exceeded"
  | "Unauthorised Action Attempt";

export const EXCEPTION_TYPE_COLORS: Record<GovernanceExceptionType, string> = {
  "Repeated Failures": "text-red-600 border-red-200 bg-red-50",
  "Safeguard Violation": "text-rose-600 border-rose-200 bg-rose-50",
  "Excessive Execution Volume": "text-amber-600 border-amber-200 bg-amber-50",
  "Risk Threshold Exceeded": "text-orange-600 border-orange-200 bg-orange-50",
  "Unauthorised Action Attempt": "text-red-700 border-red-300 bg-red-100",
};

export type GovernanceExceptionSeverity = "Low" | "Medium" | "High" | "Critical";

export const EXCEPTION_SEVERITY_COLORS: Record<GovernanceExceptionSeverity, string> = {
  Low: "text-emerald-600 border-emerald-200 bg-emerald-50",
  Medium: "text-amber-600 border-amber-200 bg-amber-50",
  High: "text-orange-600 border-orange-200 bg-orange-50",
  Critical: "text-red-600 border-red-200 bg-red-50",
};

export interface AutomationExceptionRecord {
  id: string;
  ruleId: string;
  ruleNumber: string;
  ruleName: string;
  exceptionType: GovernanceExceptionType;
  severity: GovernanceExceptionSeverity;
  status: GovernanceExceptionStatus;
  description: string;
  createdAt: string;
  updatedAt: string;
  investigationNotes: string;
  resolutionNotes: string;
  resolvedBy: string | null;
  resolvedAt: string | null;
  jobId: string | null;
  jobName: string | null;
}

// ──────────────────────────────────────────────────────
// GOVERNANCE AUDIT RECORD
// ──────────────────────────────────────────────────────

export interface GovernanceAuditEntry {
  id: string;
  ruleId: string;
  ruleNumber: string;
  ruleName: string;
  action: GovernanceAction | string;
  performedBy: string;
  riskImpact: AutomationRiskLevel | "None";
  previousStatus: AutomationGovernanceStatus | null;
  newStatus: AutomationGovernanceStatus | null;
  notes: string;
  timestamp: string;
  jobId: string | null;
  jobName: string | null;
}

// ──────────────────────────────────────────────────────
// GOVERNANCE SUMMARY
// ──────────────────────────────────────────────────────

export interface GovernanceSummary {
  totalAutomations: number;
  compliant: number;
  requiresReview: number;
  restricted: number;
  suspended: number;
  highRisk: number;
  criticalRisk: number;
}

export function computeGovernanceSummary(
  records: AutomationGovernanceRecord[]
): GovernanceSummary {
  return {
    totalAutomations: records.length,
    compliant: records.filter((r) => r.governanceStatus === "Compliant").length,
    requiresReview: records.filter((r) => r.governanceStatus === "Requires Review").length,
    restricted: records.filter((r) => r.governanceStatus === "Restricted").length,
    suspended: records.filter((r) => r.governanceStatus === "Suspended").length,
    highRisk: records.filter((r) => r.riskLevel === "High").length,
    criticalRisk: records.filter((r) => r.riskLevel === "Critical").length,
  };
}

// ──────────────────────────────────────────────────────
// IN-MEMORY STATE STORE
// ──────────────────────────────────────────────────────

let _governanceRecords: AutomationGovernanceRecord[] = [];
let _governanceExceptions: AutomationExceptionRecord[] = [];
const _governanceAuditLog: GovernanceAuditEntry[] = [];

// ──────────────────────────────────────────────────────
// SEED DATA — GOVERNANCE RECORDS
// ──────────────────────────────────────────────────────

const SEED_GOVERNANCE_RECORDS: AutomationGovernanceRecord[] = [
  {
    ruleId: "rule-001",
    ruleNumber: "AUT-2026-001",
    ruleName: "Notify CEO on Sync Failure",
    ruleCategory: "Operational",
    riskLevel: "Low",
    governanceStatus: "Compliant",
    isFinanciallySensitive: false,
    isApprovalProtected: false,
    hasFinancialSafeguard: false,
    safeguardNotes: "Operational notification only. No financial mutation risk.",
    riskRationale: "Read-only notification action. Cannot alter financial records.",
    totalExecutions: 12,
    successfulExecutions: 12,
    blockedExecutions: 0,
    failedExecutions: 0,
    lastExecutedAt: "2026-05-31T08:15:00Z",
    governanceAuditIds: ["gov-audit-001"],
    createdAt: "2026-05-01T09:00:00Z",
    updatedAt: "2026-05-31T08:15:00Z",
    reviewedBy: "Marcus Webb",
    reviewedAt: "2026-05-31T08:30:00Z",
    notes: "Reviewed and approved. No risk concerns.",
  },
  {
    ruleId: "rule-002",
    ruleNumber: "AUT-2026-002",
    ruleName: "Auto-assign PM on Job Creation",
    ruleCategory: "Workflow",
    riskLevel: "Low",
    governanceStatus: "Compliant",
    isFinanciallySensitive: false,
    isApprovalProtected: false,
    hasFinancialSafeguard: false,
    safeguardNotes: "Workflow assignment only. No financial records altered.",
    riskRationale: "PM assignment does not create or modify financial records.",
    totalExecutions: 8,
    successfulExecutions: 8,
    blockedExecutions: 0,
    failedExecutions: 0,
    lastExecutedAt: "2026-05-30T14:00:00Z",
    governanceAuditIds: [],
    createdAt: "2026-05-10T10:00:00Z",
    updatedAt: "2026-05-10T10:00:00Z",
    reviewedBy: null,
    reviewedAt: null,
    notes: "",
  },
  {
    ruleId: "rule-003",
    ruleNumber: "AUT-2026-003",
    ruleName: "Queue Accounting Sync on Review Approval",
    ruleCategory: "FinanciallySensitive",
    riskLevel: "High",
    governanceStatus: "Requires Review",
    isFinanciallySensitive: true,
    isApprovalProtected: true,
    hasFinancialSafeguard: true,
    safeguardNotes: "Queues records for accounting sync. Approval gate enforced before any sync executes. Financial Safeguard Active.",
    riskRationale: "Interacts with accounting sync pipeline. High execution volume (45 runs). CEO review recommended.",
    totalExecutions: 45,
    successfulExecutions: 43,
    blockedExecutions: 2,
    failedExecutions: 0,
    lastExecutedAt: "2026-05-31T09:00:00Z",
    governanceAuditIds: ["gov-audit-002"],
    createdAt: "2026-05-12T11:00:00Z",
    updatedAt: "2026-05-31T09:00:00Z",
    reviewedBy: null,
    reviewedAt: null,
    notes: "Requires CEO review due to high execution volume and financial sensitivity.",
  },
  {
    ruleId: "rule-004",
    ruleNumber: "AUT-2026-004",
    ruleName: "Generate Draft Invoice on Job Completion",
    ruleCategory: "FinanciallySensitive",
    riskLevel: "Critical",
    governanceStatus: "Requires Review",
    isFinanciallySensitive: true,
    isApprovalProtected: true,
    hasFinancialSafeguard: true,
    safeguardNotes: "Generates draft invoices only. Approval Required before invoice becomes financially real. Approval Protection Active.",
    riskRationale: "Directly triggers invoice generation pipeline. CEO approval required before activation per Critical Risk doctrine.",
    totalExecutions: 6,
    successfulExecutions: 5,
    blockedExecutions: 1,
    failedExecutions: 0,
    lastExecutedAt: "2026-05-29T16:00:00Z",
    governanceAuditIds: ["gov-audit-003"],
    createdAt: "2026-05-14T08:00:00Z",
    updatedAt: "2026-05-14T08:00:00Z",
    reviewedBy: null,
    reviewedAt: null,
    notes: "CRITICAL: Requires CEO approval before activation. Invoice generation pipeline connected.",
  },
  {
    ruleId: "rule-005",
    ruleNumber: "AUT-2026-005",
    ruleName: "Escalate Worker Report to Review Centre",
    ruleCategory: "Workflow",
    riskLevel: "Medium",
    governanceStatus: "Restricted",
    isFinanciallySensitive: false,
    isApprovalProtected: false,
    hasFinancialSafeguard: false,
    safeguardNotes: "Escalation workflow only. No financial mutation risk.",
    riskRationale: "Previously caused excessive Review Centre queue congestion. Restricted pending operational review.",
    totalExecutions: 31,
    successfulExecutions: 28,
    blockedExecutions: 0,
    failedExecutions: 3,
    lastExecutedAt: "2026-05-22T09:55:00Z",
    governanceAuditIds: ["gov-audit-004"],
    createdAt: "2026-04-20T14:00:00Z",
    updatedAt: "2026-05-22T10:00:00Z",
    reviewedBy: "Marcus Webb",
    reviewedAt: "2026-05-22T10:00:00Z",
    notes: "Restricted by CEO following operational review. Cannot execute while restricted.",
  },
  {
    ruleId: "rule-006",
    ruleNumber: "AUT-2026-006",
    ruleName: "Low Stock Alert Notification",
    ruleCategory: "Operational",
    riskLevel: "Low",
    governanceStatus: "Compliant",
    isFinanciallySensitive: false,
    isApprovalProtected: false,
    hasFinancialSafeguard: false,
    safeguardNotes: "Notification only. No financial risk.",
    riskRationale: "Informational alert. Draft status — not yet active.",
    totalExecutions: 0,
    successfulExecutions: 0,
    blockedExecutions: 0,
    failedExecutions: 0,
    lastExecutedAt: null,
    governanceAuditIds: [],
    createdAt: "2026-05-31T11:00:00Z",
    updatedAt: "2026-05-31T11:00:00Z",
    reviewedBy: null,
    reviewedAt: null,
    notes: "",
  },
];

// ──────────────────────────────────────────────────────
// SEED DATA — EXCEPTIONS
// ──────────────────────────────────────────────────────

const SEED_EXCEPTIONS: AutomationExceptionRecord[] = [
  {
    id: "gex-001",
    ruleId: "rule-003",
    ruleNumber: "AUT-2026-003",
    ruleName: "Queue Accounting Sync on Review Approval",
    exceptionType: "Excessive Execution Volume",
    severity: "High",
    status: "Investigating",
    description: "Rule executed 45 times in 30 days, exceeding the expected operational threshold of 20. Risk of overloading the accounting sync queue.",
    createdAt: "2026-05-30T10:00:00Z",
    updatedAt: "2026-05-31T09:00:00Z",
    investigationNotes: "Reviewing whether a batch event caused the spike. Accounting sync queue remains healthy.",
    resolutionNotes: "",
    resolvedBy: null,
    resolvedAt: null,
    jobId: null,
    jobName: null,
  },
  {
    id: "gex-002",
    ruleId: "rule-004",
    ruleNumber: "AUT-2026-004",
    ruleName: "Generate Draft Invoice on Job Completion",
    exceptionType: "Risk Threshold Exceeded",
    severity: "Critical",
    status: "Awaiting Approval",
    description: "Critical-risk automation triggered invoice generation pipeline without prior CEO governance review. Requires CEO approval before further activation.",
    createdAt: "2026-05-29T16:05:00Z",
    updatedAt: "2026-05-31T11:00:00Z",
    investigationNotes: "Rule was activated without completing the Critical Risk governance review. CEO approval gate not completed.",
    resolutionNotes: "",
    resolvedBy: null,
    resolvedAt: null,
    jobId: "dj-kitchen-extract-1",
    jobName: "Kitchen extraction & ventilation install",
  },
  {
    id: "gex-003",
    ruleId: "rule-005",
    ruleNumber: "AUT-2026-005",
    ruleName: "Escalate Worker Report to Review Centre",
    exceptionType: "Repeated Failures",
    severity: "Medium",
    status: "Open",
    description: "Rule failed 3 times in a single execution cycle. Review Centre queue was temporarily unresponsive during peak hour.",
    createdAt: "2026-05-22T09:55:00Z",
    updatedAt: "2026-05-22T09:55:00Z",
    investigationNotes: "",
    resolutionNotes: "",
    resolvedBy: null,
    resolvedAt: null,
    jobId: null,
    jobName: null,
  },
  {
    id: "gex-004",
    ruleId: "rule-001",
    ruleNumber: "AUT-2026-001",
    ruleName: "Notify CEO on Sync Failure",
    exceptionType: "Repeated Failures",
    severity: "Low",
    status: "Resolved",
    description: "Notification delivery failed twice due to internal messaging service timeout.",
    createdAt: "2026-05-20T08:00:00Z",
    updatedAt: "2026-05-21T09:00:00Z",
    investigationNotes: "Messaging service timeout identified. Temporary infrastructure issue.",
    resolutionNotes: "Infrastructure issue resolved. Rule execution resumed normally.",
    resolvedBy: "Marcus Webb",
    resolvedAt: "2026-05-21T09:00:00Z",
    jobId: null,
    jobName: null,
  },
];

// ──────────────────────────────────────────────────────
// SEED DATA — AUDIT LOG
// ──────────────────────────────────────────────────────

const SEED_AUDIT_ENTRIES: GovernanceAuditEntry[] = [
  {
    id: "gov-audit-001",
    ruleId: "rule-001",
    ruleNumber: "AUT-2026-001",
    ruleName: "Notify CEO on Sync Failure",
    action: "Mark Compliant",
    performedBy: "Marcus Webb",
    riskImpact: "Low",
    previousStatus: "Requires Review",
    newStatus: "Compliant",
    notes: "Reviewed and confirmed no financial risk. Marked compliant.",
    timestamp: "2026-05-31T08:30:00Z",
    jobId: null,
    jobName: null,
  },
  {
    id: "gov-audit-002",
    ruleId: "rule-003",
    ruleNumber: "AUT-2026-003",
    ruleName: "Queue Accounting Sync on Review Approval",
    action: "Restrict Automation",
    performedBy: "Marcus Webb",
    riskImpact: "High",
    previousStatus: "Compliant",
    newStatus: "Requires Review",
    notes: "Flagged for CEO review due to high execution volume.",
    timestamp: "2026-05-30T10:00:00Z",
    jobId: null,
    jobName: null,
  },
  {
    id: "gov-audit-003",
    ruleId: "rule-004",
    ruleNumber: "AUT-2026-004",
    ruleName: "Generate Draft Invoice on Job Completion",
    action: "Restrict Automation",
    performedBy: "Marcus Webb",
    riskImpact: "Critical",
    previousStatus: "Compliant",
    newStatus: "Requires Review",
    notes: "Critical risk rule requires CEO approval before activation.",
    timestamp: "2026-05-29T16:05:00Z",
    jobId: "dj-kitchen-extract-1",
    jobName: "Kitchen extraction & ventilation install",
  },
  {
    id: "gov-audit-004",
    ruleId: "rule-005",
    ruleNumber: "AUT-2026-005",
    ruleName: "Escalate Worker Report to Review Centre",
    action: "Suspend Automation",
    performedBy: "Marcus Webb",
    riskImpact: "Medium",
    previousStatus: "Compliant",
    newStatus: "Restricted",
    notes: "Restricted following repeated failures and queue congestion.",
    timestamp: "2026-05-22T10:00:00Z",
    jobId: null,
    jobName: null,
  },
];

// ──────────────────────────────────────────────────────
// INITIALISE STORES
// ──────────────────────────────────────────────────────

_governanceRecords = [...SEED_GOVERNANCE_RECORDS];
_governanceExceptions = [...SEED_EXCEPTIONS];
_governanceAuditLog.push(...SEED_AUDIT_ENTRIES);

// ──────────────────────────────────────────────────────
// QUERY FUNCTIONS — GOVERNANCE RECORDS
// ──────────────────────────────────────────────────────

export function getAllGovernanceRecords(): AutomationGovernanceRecord[] {
  return [..._governanceRecords];
}

export function getGovernanceRecordByRuleId(
  ruleId: string
): AutomationGovernanceRecord | undefined {
  return _governanceRecords.find((r) => r.ruleId === ruleId);
}

export function filterGovernanceByStatus(
  records: AutomationGovernanceRecord[],
  status: AutomationGovernanceStatus | "all"
): AutomationGovernanceRecord[] {
  if (status === "all") return records;
  return records.filter((r) => r.governanceStatus === status);
}

export function filterGovernanceByRisk(
  records: AutomationGovernanceRecord[],
  level: AutomationRiskLevel | "all"
): AutomationGovernanceRecord[] {
  if (level === "all") return records;
  return records.filter((r) => r.riskLevel === level);
}

export function filterGovernanceByCategory(
  records: AutomationGovernanceRecord[],
  category: string
): AutomationGovernanceRecord[] {
  if (category === "all") return records;
  return records.filter((r) => r.ruleCategory === category);
}

export function searchGovernanceRecords(
  records: AutomationGovernanceRecord[],
  query: string
): AutomationGovernanceRecord[] {
  if (!query.trim()) return records;
  const q = query.trim().toLowerCase();
  return records.filter(
    (r) =>
      r.ruleName.toLowerCase().includes(q) ||
      r.ruleNumber.toLowerCase().includes(q) ||
      r.safeguardNotes.toLowerCase().includes(q)
  );
}

// ──────────────────────────────────────────────────────
// CEO GOVERNANCE ACTIONS
// ──────────────────────────────────────────────────────

function appendGovernanceAudit(
  record: AutomationGovernanceRecord,
  action: GovernanceAction,
  previousStatus: AutomationGovernanceStatus,
  newStatus: AutomationGovernanceStatus,
  performedBy: string,
  notes: string,
  riskImpact: AutomationRiskLevel | "None"
): GovernanceAuditEntry {
  const entry: GovernanceAuditEntry = {
    id: `gov-audit-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    ruleId: record.ruleId,
    ruleNumber: record.ruleNumber,
    ruleName: record.ruleName,
    action,
    performedBy,
    riskImpact,
    previousStatus,
    newStatus,
    notes,
    timestamp: new Date().toISOString(),
    jobId: null,
    jobName: null,
  };
  // Append-only — no delete, no update
  _governanceAuditLog.push(entry);
  return entry;
}

function updateGovernanceRecord(
  ruleId: string,
  patch: Partial<AutomationGovernanceRecord>
): AutomationGovernanceRecord | null {
  const idx = _governanceRecords.findIndex((r) => r.ruleId === ruleId);
  if (idx === -1) return null;
  _governanceRecords[idx] = {
    ..._governanceRecords[idx],
    ...patch,
    updatedAt: new Date().toISOString(),
  };
  return _governanceRecords[idx];
}

export function restrictAutomation(
  ruleId: string,
  performedBy: string,
  notes: string
): { record: AutomationGovernanceRecord; audit: GovernanceAuditEntry } | null {
  const rec = getGovernanceRecordByRuleId(ruleId);
  if (!rec) return null;
  const prev = rec.governanceStatus;
  const updated = updateGovernanceRecord(ruleId, {
    governanceStatus: "Restricted",
    reviewedBy: performedBy,
    reviewedAt: new Date().toISOString(),
    notes,
  });
  if (!updated) return null;
  const audit = appendGovernanceAudit(
    updated, "Restrict Automation", prev, "Restricted", performedBy, notes, rec.riskLevel
  );
  updated.governanceAuditIds = [...updated.governanceAuditIds, audit.id];
  return { record: updated, audit };
}

export function suspendAutomation(
  ruleId: string,
  performedBy: string,
  notes: string
): { record: AutomationGovernanceRecord; audit: GovernanceAuditEntry } | null {
  const rec = getGovernanceRecordByRuleId(ruleId);
  if (!rec) return null;
  const prev = rec.governanceStatus;
  const updated = updateGovernanceRecord(ruleId, {
    governanceStatus: "Suspended",
    reviewedBy: performedBy,
    reviewedAt: new Date().toISOString(),
    notes,
  });
  if (!updated) return null;
  const audit = appendGovernanceAudit(
    updated, "Suspend Automation", prev, "Suspended", performedBy, notes, rec.riskLevel
  );
  updated.governanceAuditIds = [...updated.governanceAuditIds, audit.id];
  return { record: updated, audit };
}

export function restoreAutomation(
  ruleId: string,
  performedBy: string,
  notes: string
): { record: AutomationGovernanceRecord; audit: GovernanceAuditEntry } | null {
  const rec = getGovernanceRecordByRuleId(ruleId);
  if (!rec) return null;
  const prev = rec.governanceStatus;
  const updated = updateGovernanceRecord(ruleId, {
    governanceStatus: "Compliant",
    reviewedBy: performedBy,
    reviewedAt: new Date().toISOString(),
    notes,
  });
  if (!updated) return null;
  const audit = appendGovernanceAudit(
    updated, "Restore Automation", prev, "Compliant", performedBy, notes, rec.riskLevel
  );
  updated.governanceAuditIds = [...updated.governanceAuditIds, audit.id];
  return { record: updated, audit };
}

export function markCompliant(
  ruleId: string,
  performedBy: string,
  notes: string
): { record: AutomationGovernanceRecord; audit: GovernanceAuditEntry } | null {
  const rec = getGovernanceRecordByRuleId(ruleId);
  if (!rec) return null;
  const prev = rec.governanceStatus;
  const updated = updateGovernanceRecord(ruleId, {
    governanceStatus: "Compliant",
    reviewedBy: performedBy,
    reviewedAt: new Date().toISOString(),
    notes,
  });
  if (!updated) return null;
  const audit = appendGovernanceAudit(
    updated, "Mark Compliant", prev, "Compliant", performedBy, notes, "None"
  );
  updated.governanceAuditIds = [...updated.governanceAuditIds, audit.id];
  return { record: updated, audit };
}

// ──────────────────────────────────────────────────────
// EXCEPTION QUERIES & ACTIONS
// ──────────────────────────────────────────────────────

export function getAllExceptions(): AutomationExceptionRecord[] {
  return [..._governanceExceptions];
}

export function getExceptionById(id: string): AutomationExceptionRecord | undefined {
  return _governanceExceptions.find((e) => e.id === id);
}

export function resolveException(
  id: string,
  resolvedBy: string,
  resolutionNotes: string
): AutomationExceptionRecord | null {
  const idx = _governanceExceptions.findIndex((e) => e.id === id);
  if (idx === -1) return null;
  _governanceExceptions[idx] = {
    ..._governanceExceptions[idx],
    status: "Resolved",
    resolvedBy,
    resolvedAt: new Date().toISOString(),
    resolutionNotes,
    updatedAt: new Date().toISOString(),
  };
  // Governance audit for exception resolution
  const ex = _governanceExceptions[idx];
  _governanceAuditLog.push({
    id: `gov-audit-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    ruleId: ex.ruleId,
    ruleNumber: ex.ruleNumber,
    ruleName: ex.ruleName,
    action: `Exception Resolved: ${ex.exceptionType}`,
    performedBy: resolvedBy,
    riskImpact: "None",
    previousStatus: null,
    newStatus: null,
    notes: resolutionNotes,
    timestamp: new Date().toISOString(),
    jobId: ex.jobId,
    jobName: ex.jobName,
  });
  return _governanceExceptions[idx];
}

export function rejectException(
  id: string,
  rejectedBy: string,
  notes: string
): AutomationExceptionRecord | null {
  const idx = _governanceExceptions.findIndex((e) => e.id === id);
  if (idx === -1) return null;
  _governanceExceptions[idx] = {
    ..._governanceExceptions[idx],
    status: "Rejected",
    resolvedBy: rejectedBy,
    resolvedAt: new Date().toISOString(),
    resolutionNotes: notes,
    updatedAt: new Date().toISOString(),
  };
  const ex = _governanceExceptions[idx];
  _governanceAuditLog.push({
    id: `gov-audit-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    ruleId: ex.ruleId,
    ruleNumber: ex.ruleNumber,
    ruleName: ex.ruleName,
    action: `Exception Rejected: ${ex.exceptionType}`,
    performedBy: rejectedBy,
    riskImpact: "None",
    previousStatus: null,
    newStatus: null,
    notes,
    timestamp: new Date().toISOString(),
    jobId: ex.jobId,
    jobName: ex.jobName,
  });
  return _governanceExceptions[idx];
}

export function escalateException(
  id: string,
  escalatedBy: string,
  notes: string
): AutomationExceptionRecord | null {
  const idx = _governanceExceptions.findIndex((e) => e.id === id);
  if (idx === -1) return null;
  _governanceExceptions[idx] = {
    ..._governanceExceptions[idx],
    status: "Awaiting Approval",
    investigationNotes: notes,
    updatedAt: new Date().toISOString(),
  };
  const ex = _governanceExceptions[idx];
  _governanceAuditLog.push({
    id: `gov-audit-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    ruleId: ex.ruleId,
    ruleNumber: ex.ruleNumber,
    ruleName: ex.ruleName,
    action: `Exception Escalated: ${ex.exceptionType}`,
    performedBy: escalatedBy,
    riskImpact: "None",
    previousStatus: null,
    newStatus: null,
    notes,
    timestamp: new Date().toISOString(),
    jobId: ex.jobId,
    jobName: ex.jobName,
  });
  return _governanceExceptions[idx];
}

// ──────────────────────────────────────────────────────
// AUDIT LOG QUERIES
// ──────────────────────────────────────────────────────

export function getGovernanceAuditLog(): GovernanceAuditEntry[] {
  return [..._governanceAuditLog];
}

export function searchGovernanceAudit(
  entries: GovernanceAuditEntry[],
  query: string
): GovernanceAuditEntry[] {
  if (!query.trim()) return entries;
  const q = query.trim().toLowerCase();
  return entries.filter(
    (e) =>
      e.ruleName.toLowerCase().includes(q) ||
      e.ruleNumber.toLowerCase().includes(q) ||
      e.action.toLowerCase().includes(q) ||
      e.performedBy.toLowerCase().includes(q)
  );
}

export function filterAuditByRiskImpact(
  entries: GovernanceAuditEntry[],
  level: string
): GovernanceAuditEntry[] {
  if (level === "all") return entries;
  return entries.filter((e) => e.riskImpact === level);
}
