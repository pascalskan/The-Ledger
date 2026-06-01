// ======================================================
// PHASE 6.0A — AUTOMATION ENGINE (extended in 6.0E)
//
// Core automation model for The Ledger Automation Foundation.
// Extended in Phase 6.0E with schedule_trigger type.
//
// Architecture: Mock only. No backend. Pure functions +
// seed data.
//
// Doctrine:
//   Automations NEVER override approval workflows.
//   Automations NEVER create approved financial records.
//   All financially sensitive actions require approval state.
//   All executions generate an immutable audit entry.
//   Every execution retains job attribution.
// ======================================================

// ──────────────────────────────────────────────────────
// AUTOMATION STATUS
// ──────────────────────────────────────────────────────

export type AutomationStatus =
  | "draft"
  | "active"
  | "disabled"
  | "archived";

export const AUTOMATION_STATUS_LABELS: Record<AutomationStatus, string> = {
  draft: "Draft",
  active: "Active",
  disabled: "Disabled",
  archived: "Archived",
};

export const AUTOMATION_STATUS_COLORS: Record<AutomationStatus, string> = {
  draft: "text-slate-600 border-slate-200 bg-slate-50",
  active: "text-emerald-600 border-emerald-200 bg-emerald-50",
  disabled: "text-amber-600 border-amber-200 bg-amber-50",
  archived: "text-stone-500 border-stone-200 bg-stone-50",
};

export function getAutomationStatusLabel(status: AutomationStatus): string {
  return AUTOMATION_STATUS_LABELS[status];
}

// ──────────────────────────────────────────────────────
// AUTOMATION CATEGORY
// ──────────────────────────────────────────────────────

export type AutomationCategory =
  | "Operational"
  | "Workflow"
  | "FinanciallySensitive";

export const AUTOMATION_CATEGORY_LABELS: Record<AutomationCategory, string> = {
  Operational: "Operational",
  Workflow: "Workflow",
  FinanciallySensitive: "Financially Sensitive",
};

export const AUTOMATION_CATEGORY_COLORS: Record<AutomationCategory, string> = {
  Operational: "text-blue-600 border-blue-200 bg-blue-50",
  Workflow: "text-violet-600 border-violet-200 bg-violet-50",
  FinanciallySensitive: "text-red-600 border-red-200 bg-red-50",
};

export function getAutomationCategoryLabel(category: AutomationCategory): string {
  return AUTOMATION_CATEGORY_LABELS[category];
}

// ──────────────────────────────────────────────────────
// AUTOMATION TRIGGER
// ──────────────────────────────────────────────────────

export type AutomationTriggerType =
  | "review_approved"
  | "review_rejected"
  | "job_created"
  | "job_status_changed"
  | "invoice_generated"
  | "sync_failed"
  | "asset_service_due"
  | "low_stock_alert"
  | "worker_report_submitted"
  | "schedule_trigger";  // Phase 6.0E — time-based trigger

export interface AutomationTrigger {
  id: string;
  type: AutomationTriggerType;
  label: string;
  description: string;
  /** Optional condition payload — key/value pairs that narrow the trigger */
  conditions?: Record<string, unknown>;
}

// ──────────────────────────────────────────────────────
// TRIGGER CATALOGUE V1 (extended in 6.0E)
// ──────────────────────────────────────────────────────

export const TRIGGER_CATALOGUE_V1: AutomationTrigger[] = [
  {
    id: "trigger-review-approved",
    type: "review_approved",
    label: "Review Approved",
    description: "Fires when a submission is approved in the Review Centre.",
  },
  {
    id: "trigger-review-rejected",
    type: "review_rejected",
    label: "Review Rejected",
    description: "Fires when a submission is rejected in the Review Centre.",
  },
  {
    id: "trigger-job-created",
    type: "job_created",
    label: "Job Created",
    description: "Fires when a new job is created in The Ledger.",
  },
  {
    id: "trigger-job-status-changed",
    type: "job_status_changed",
    label: "Job Status Changed",
    description: "Fires when a job transitions to a new status.",
    conditions: { targetStatus: "any" },
  },
  {
    id: "trigger-invoice-generated",
    type: "invoice_generated",
    label: "Invoice Generated",
    description: "Fires when a draft invoice is generated for a job.",
  },
  {
    id: "trigger-sync-failed",
    type: "sync_failed",
    label: "Sync Failed",
    description: "Fires when an accounting sync operation fails.",
  },
  {
    id: "trigger-asset-service-due",
    type: "asset_service_due",
    label: "Asset Service Due",
    description: "Fires when an asset's next service date is reached or overdue.",
  },
  {
    id: "trigger-low-stock-alert",
    type: "low_stock_alert",
    label: "Low Stock Alert",
    description: "Fires when a stock item falls below its minimum threshold.",
  },
  {
    id: "trigger-worker-report-submitted",
    type: "worker_report_submitted",
    label: "Worker Report Submitted",
    description: "Fires when a worker submits a job report.",
  },
  // Phase 6.0E — Scheduled Execution trigger
  {
    id: "trigger-schedule",
    type: "schedule_trigger",
    label: "Scheduled Execution",
    description: "Fires on a time-based schedule (Hourly, Daily, Weekly, Monthly, or Custom). Configure the schedule in the Scheduler tab.",
  },
];

// ──────────────────────────────────────────────────────
// AUTOMATION ACTION
// ──────────────────────────────────────────────────────

export type AutomationActionType =
  | "send_notification"
  | "assign_project_manager"
  | "create_review_task"
  | "escalate_issue"
  | "generate_draft_invoice"
  | "queue_accounting_sync"
  | "create_audit_record"
  | "create_financial_control_request";

/**
 * Financial safety classification of an action type.
 *
 * - Operational: always allowed, minimal audit requirement
 * - Workflow:    always allowed, must audit
 * - FinanciallySensitive: must validate approval state, must audit,
 *                         must preserve job attribution
 *
 * FORBIDDEN actions (never permitted regardless of rule):
 *   - create_approved_invoice
 *   - create_revenue_event
 *   - modify_approved_cost
 *   - approve_expense
 *   - approve_timesheet
 *
 * Forbidden actions are not modelled as AutomationActionType values.
 * They are listed here for doctrine completeness only.
 */
export type ActionSafetyClass = "Operational" | "Workflow" | "FinanciallySensitive";

export interface AutomationAction {
  id: string;
  type: AutomationActionType;
  label: string;
  description: string;
  safetyClass: ActionSafetyClass;
  /** Optional config payload — e.g. { recipientRole: 'CEO' } */
  config?: Record<string, unknown>;
}

// ──────────────────────────────────────────────────────
// ACTION CATALOGUE V1
// ──────────────────────────────────────────────────────

export const ACTION_CATALOGUE_V1: AutomationAction[] = [
  {
    id: "action-send-notification",
    type: "send_notification",
    label: "Send Notification",
    description: "Sends an in-app notification to a specified role or user.",
    safetyClass: "Operational",
  },
  {
    id: "action-assign-project-manager",
    type: "assign_project_manager",
    label: "Assign Project Manager",
    description: "Assigns a project manager to the triggering job.",
    safetyClass: "Workflow",
  },
  {
    id: "action-create-review-task",
    type: "create_review_task",
    label: "Create Review Task",
    description: "Creates a review task in the Review Centre for the triggering event.",
    safetyClass: "Workflow",
  },
  {
    id: "action-escalate-issue",
    type: "escalate_issue",
    label: "Escalate Issue",
    description: "Escalates the triggering event to the CEO or a senior user.",
    safetyClass: "Workflow",
  },
  {
    id: "action-generate-draft-invoice",
    type: "generate_draft_invoice",
    label: "Generate Draft Invoice",
    description: "Generates a draft invoice (not approved) for the triggering job. Requires approval before becoming financially real.",
    safetyClass: "FinanciallySensitive",
  },
  {
    id: "action-queue-accounting-sync",
    type: "queue_accounting_sync",
    label: "Queue Accounting Sync",
    description: "Queues the triggering record for accounting sync. Does not execute sync. Approval required before sync proceeds.",
    safetyClass: "FinanciallySensitive",
  },
  {
    id: "action-create-audit-record",
    type: "create_audit_record",
    label: "Create Audit Record",
    description: "Creates an immutable audit entry for the triggering event.",
    safetyClass: "Operational",
  },
  {
    id: "action-create-financial-control-request",
    type: "create_financial_control_request",
    label: "Create Financial Control Request",
    description: "Creates a financial control override request. Requires CEO approval to take effect.",
    safetyClass: "FinanciallySensitive",
  },
];

// ──────────────────────────────────────────────────────
// FORBIDDEN ACTION NAMES (doctrine reference)
// These are NEVER implemented as AutomationActionType values.
// Listed here so the rule engine can explicitly reject them.
// ──────────────────────────────────────────────────────

export const FORBIDDEN_ACTION_NAMES: readonly string[] = [
  "create_approved_invoice",
  "create_revenue_event",
  "modify_approved_cost",
  "approve_expense",
  "approve_timesheet",
] as const;

/**
 * Returns true if the given action name string is in the
 * forbidden list. Used by the rule engine as a safety gate.
 */
export function isForbiddenAction(actionName: string): boolean {
  return FORBIDDEN_ACTION_NAMES.includes(actionName);
}

/**
 * Returns true if the action requires financial safety validation.
 */
export function isFinanciallySensitive(action: AutomationAction): boolean {
  return action.safetyClass === "FinanciallySensitive";
}

// ──────────────────────────────────────────────────────
// AUTOMATION EXECUTION
// ──────────────────────────────────────────────────────

export type AutomationExecutionResult =
  | "success"
  | "blocked_forbidden_action"
  | "blocked_approval_required"
  | "blocked_condition_not_met"
  | "failed";

export interface AutomationExecution {
  id: string;
  ruleId: string;
  ruleName: string;
  triggerId: string;
  triggerType: AutomationTriggerType;
  actionId: string;
  actionType: AutomationActionType;
  /** Job attribution — must always be set when a job context exists */
  jobId: string | null;
  jobName: string | null;
  /** Who or what initiated this execution */
  initiatedBy: string;
  executedAt: string;          // ISO timestamp
  result: AutomationExecutionResult;
  resultMessage: string;
  /** Approval state at time of execution — required for FinanciallySensitive actions */
  approvalState: "not_required" | "approved" | "pending" | "not_present";
}

// ──────────────────────────────────────────────────────
// AUTOMATION RULE
// ──────────────────────────────────────────────────────

export interface AutomationRule {
  id: string;
  ruleNumber: string;        // Display: AUT-2026-001
  name: string;
  description: string;
  status: AutomationStatus;
  category: AutomationCategory;
  triggerId: string;         // References AutomationTrigger.id
  triggerType: AutomationTriggerType;
  /** Optional conditions that must be met before actions fire */
  conditions: Record<string, unknown>;
  actionIds: string[];       // References AutomationAction.id
  createdBy: string;
  createdAt: string;         // ISO timestamp
  updatedAt: string;
  lastExecutedAt: string | null;
  executionCount: number;
  /** Retained job reference for mini-ledger attribution */
  jobId: string | null;
  jobName: string | null;
}

// ──────────────────────────────────────────────────────
// AUTOMATION RULE SUMMARY
// ──────────────────────────────────────────────────────

export interface AutomationRuleSummary {
  total: number;
  active: number;
  draft: number;
  disabled: number;
  archived: number;
  financiallySensitive: number;
}

export function computeAutomationRuleSummary(
  rules: AutomationRule[]
): AutomationRuleSummary {
  return {
    total: rules.length,
    active: rules.filter((r) => r.status === "active").length,
    draft: rules.filter((r) => r.status === "draft").length,
    disabled: rules.filter((r) => r.status === "disabled").length,
    archived: rules.filter((r) => r.status === "archived").length,
    financiallySensitive: rules.filter(
      (r) => r.category === "FinanciallySensitive"
    ).length,
  };
}

// ──────────────────────────────────────────────────────
// SEED AUTOMATION RULES
// ──────────────────────────────────────────────────────

export const SEED_AUTOMATION_RULES: AutomationRule[] = [
  {
    id: "rule-001",
    ruleNumber: "AUT-2026-001",
    name: "Notify CEO on Sync Failure",
    description: "When any accounting sync fails, send an in-app notification to the CEO and create an audit record.",
    status: "active",
    category: "Operational",
    triggerId: "trigger-sync-failed",
    triggerType: "sync_failed",
    conditions: {},
    actionIds: ["action-send-notification", "action-create-audit-record"],
    createdBy: "Marcus Webb",
    createdAt: "2026-05-01T09:00:00Z",
    updatedAt: "2026-05-01T09:00:00Z",
    lastExecutedAt: "2026-05-31T08:15:00Z",
    executionCount: 12,
    jobId: null,
    jobName: null,
  },
  {
    id: "rule-002",
    ruleNumber: "AUT-2026-002",
    name: "Auto-assign PM on Job Creation",
    description: "When a new job is created, assign a project manager and create a review task.",
    status: "active",
    category: "Workflow",
    triggerId: "trigger-job-created",
    triggerType: "job_created",
    conditions: {},
    actionIds: ["action-assign-project-manager", "action-create-review-task"],
    createdBy: "Marcus Webb",
    createdAt: "2026-05-10T10:00:00Z",
    updatedAt: "2026-05-10T10:00:00Z",
    lastExecutedAt: "2026-05-30T14:00:00Z",
    executionCount: 8,
    jobId: null,
    jobName: null,
  },
  {
    id: "rule-003",
    ruleNumber: "AUT-2026-003",
    name: "Queue Accounting Sync on Review Approval",
    description: "When a submission is approved in the Review Centre, queue the record for accounting sync. CEO must approve the sync before it executes.",
    status: "active",
    category: "FinanciallySensitive",
    triggerId: "trigger-review-approved",
    triggerType: "review_approved",
    conditions: {},
    actionIds: ["action-queue-accounting-sync", "action-create-audit-record"],
    createdBy: "Marcus Webb",
    createdAt: "2026-05-12T11:00:00Z",
    updatedAt: "2026-05-15T09:30:00Z",
    lastExecutedAt: "2026-05-31T09:00:00Z",
    executionCount: 45,
    jobId: null,
    jobName: null,
  },
  {
    id: "rule-004",
    ruleNumber: "AUT-2026-004",
    name: "Generate Draft Invoice on Job Completion",
    description: "When a job status changes to Completed, generate a draft invoice. Draft invoices require CEO approval before becoming financially real.",
    status: "active",
    category: "FinanciallySensitive",
    triggerId: "trigger-job-status-changed",
    triggerType: "job_status_changed",
    conditions: { targetStatus: "completed" },
    actionIds: ["action-generate-draft-invoice", "action-create-audit-record"],
    createdBy: "Marcus Webb",
    createdAt: "2026-05-14T08:00:00Z",
    updatedAt: "2026-05-14T08:00:00Z",
    lastExecutedAt: "2026-05-29T16:00:00Z",
    executionCount: 6,
    jobId: null,
    jobName: null,
  },
  {
    id: "rule-005",
    ruleNumber: "AUT-2026-005",
    name: "Escalate Worker Report to Review Centre",
    description: "When a worker submits a report, escalate it to the Review Centre for CEO or PM sign-off.",
    status: "disabled",
    category: "Workflow",
    triggerId: "trigger-worker-report-submitted",
    triggerType: "worker_report_submitted",
    conditions: {},
    actionIds: ["action-escalate-issue", "action-create-review-task"],
    createdBy: "Sarah Chen",
    createdAt: "2026-04-20T14:00:00Z",
    updatedAt: "2026-05-22T10:00:00Z",
    lastExecutedAt: "2026-05-22T09:55:00Z",
    executionCount: 31,
    jobId: null,
    jobName: null,
  },
  {
    id: "rule-006",
    ruleNumber: "AUT-2026-006",
    name: "Low Stock Alert Notification",
    description: "When stock falls below minimum threshold, notify the project manager and create an audit record.",
    status: "draft",
    category: "Operational",
    triggerId: "trigger-low-stock-alert",
    triggerType: "low_stock_alert",
    conditions: {},
    actionIds: ["action-send-notification", "action-create-audit-record"],
    createdBy: "Sarah Chen",
    createdAt: "2026-05-31T11:00:00Z",
    updatedAt: "2026-05-31T11:00:00Z",
    lastExecutedAt: null,
    executionCount: 0,
    jobId: null,
    jobName: null,
  },
];

// ──────────────────────────────────────────────────────
// HELPERS
// ──────────────────────────────────────────────────────

export function fmt(n: number): string {
  return `£${n.toLocaleString("en-GB", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function getTriggerById(id: string): AutomationTrigger | undefined {
  return TRIGGER_CATALOGUE_V1.find((t) => t.id === id);
}

export function getActionById(id: string): AutomationAction | undefined {
  return ACTION_CATALOGUE_V1.find((a) => a.id === id);
}

export function getActionsForRule(rule: AutomationRule): AutomationAction[] {
  return rule.actionIds
    .map(getActionById)
    .filter((a): a is AutomationAction => a !== undefined);
}

export function filterRulesByStatus(
  rules: AutomationRule[],
  status: AutomationStatus | "all"
): AutomationRule[] {
  if (status === "all") return rules;
  return rules.filter((r) => r.status === status);
}

export function filterRulesByCategory(
  rules: AutomationRule[],
  category: AutomationCategory | "all"
): AutomationRule[] {
  if (category === "all") return rules;
  return rules.filter((r) => r.category === category);
}

export function searchRules(
  rules: AutomationRule[],
  query: string
): AutomationRule[] {
  if (!query.trim()) return rules;
  const q = query.trim().toLowerCase();
  return rules.filter(
    (r) =>
      r.ruleNumber.toLowerCase().includes(q) ||
      r.name.toLowerCase().includes(q) ||
      r.description.toLowerCase().includes(q)
  );
}
