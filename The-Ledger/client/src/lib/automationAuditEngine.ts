// ======================================================
// PHASE 6.0A — AUTOMATION AUDIT ENGINE
//
// Creates and manages immutable automation audit records.
// Every rule execution — successful or blocked — produces
// an audit entry that cannot be modified.
//
// Architecture: Mock only. No backend. Pure functions.
//
// Doctrine:
//   Every automation execution generates an audit entry.
//   Audit entries are immutable — never modified in place.
//   Audit history is append-only — oldest first.
//   Job attribution is preserved in every entry.
//   Blocked actions are audited identically to successes.
// ======================================================

import {
  AutomationExecution,
  AutomationExecutionResult,
} from "./automationEngine";

// ──────────────────────────────────────────────────────
// AUDIT ENTRY TYPE
// ──────────────────────────────────────────────────────

/**
 * A single immutable audit entry for one automation action
 * execution attempt.
 *
 * Audit Doctrine fields:
 *   who       → initiatedBy, ruleCreatedBy
 *   what      → ruleName, actionType, result
 *   when      → timestamp
 *   previous  → approvalStateAtExecution (state before any action)
 *   new       → result
 *   source    → triggerType (the source object/event)
 *   dest      → actionType (the destination/target)
 *   ref       → executionId, ruleId
 */
export interface AutomationAuditEntry {
  /** Unique ID for this audit record */
  id: string;
  /** Reference to the AutomationExecution that produced this entry */
  executionId: string;
  /** Reference to the rule that was evaluated */
  ruleId: string;
  ruleName: string;
  ruleNumber: string;
  /** Who triggered the automation */
  initiatedBy: string;
  /** Trigger event type that fired the rule */
  triggerType: string;
  /** Action that was attempted */
  actionId: string;
  actionType: string;
  actionLabel: string;
  /** Job attribution — preserved from execution */
  jobId: string | null;
  jobName: string | null;
  /** Immutable timestamp — set once at creation */
  timestamp: string;
  /** Execution outcome */
  result: AutomationExecutionResult;
  resultMessage: string;
  /** Approval state at the time of execution */
  approvalStateAtExecution: string;
  /** Human-readable summary for display */
  summary: string;
}

// ──────────────────────────────────────────────────────
// EXECUTION AUDIT WRAPPER
// ──────────────────────────────────────────────────────

/**
 * Groups all AutomationAuditEntry records produced by a
 * single rule evaluation (one per action in the rule).
 */
export interface AutomationExecutionAudit {
  /** Synthetic ID for this group */
  id: string;
  ruleId: string;
  ruleName: string;
  timestamp: string;
  jobId: string | null;
  jobName: string | null;
  initiatedBy: string;
  /** All individual action audit entries for this evaluation */
  entries: AutomationAuditEntry[];
  /** Overall result: success if ALL entries are success */
  overallResult: "success" | "partial" | "blocked" | "failed";
}

// ──────────────────────────────────────────────────────
// LABEL HELPERS
// ──────────────────────────────────────────────────────

const RESULT_LABELS: Record<AutomationExecutionResult, string> = {
  success: "Success",
  blocked_forbidden_action: "Blocked — Forbidden Action",
  blocked_approval_required: "Blocked — Approval Required",
  blocked_condition_not_met: "Blocked — Condition Not Met",
  failed: "Failed",
};

/** Exported map for direct use in UI components */
export const AUTOMATION_EXECUTION_RESULT_LABELS: Record<string, string> = {
  success: "Success",
  blocked_forbidden_action: "Blocked — Forbidden Action",
  blocked_approval_required: "Blocked — Approval Required",
  blocked_condition_not_met: "Blocked — Condition Not Met",
  failed: "Failed",
};

export function getExecutionResultLabel(result: AutomationExecutionResult): string {
  return RESULT_LABELS[result];
}

const RESULT_COLORS: Record<AutomationExecutionResult, string> = {
  success: "text-emerald-600 border-emerald-200 bg-emerald-50",
  blocked_forbidden_action: "text-red-600 border-red-200 bg-red-50",
  blocked_approval_required: "text-amber-600 border-amber-200 bg-amber-50",
  blocked_condition_not_met: "text-slate-600 border-slate-200 bg-slate-50",
  failed: "text-rose-600 border-rose-200 bg-rose-50",
};

/** Exported map for direct use in UI components */
export const AUTOMATION_EXECUTION_RESULT_COLORS: Record<string, string> = {
  success: "text-emerald-600 border-emerald-200 bg-emerald-50",
  blocked_forbidden_action: "text-red-600 border-red-200 bg-red-50",
  blocked_approval_required: "text-amber-600 border-amber-200 bg-amber-50",
  blocked_condition_not_met: "text-slate-600 border-slate-200 bg-slate-50",
  failed: "text-rose-600 border-rose-200 bg-rose-50",
};

export function getExecutionResultColor(result: AutomationExecutionResult): string {
  return RESULT_COLORS[result];
}

// ──────────────────────────────────────────────────────
// IN-MEMORY AUDIT STORE (mock)
// ──────────────────────────────────────────────────────

/**
 * Module-level append-only store.
 * In a real system this would be backed by a database with
 * no delete or update operations on audit rows.
 *
 * Exported only for test inspection. Do not mutate directly.
 */
export const _automationAuditStore: AutomationAuditEntry[] = [];

// ──────────────────────────────────────────────────────
// RECORD EXECUTION
// ──────────────────────────────────────────────────────

/**
 * Converts an AutomationExecution into an AutomationAuditEntry
 * and appends it to the immutable audit store.
 *
 * Additional fields required for display (ruleNumber, actionLabel)
 * must be supplied by the caller, who has access to the rule
 * and action catalogues.
 *
 * Returns the created entry — the store itself is not exposed
 * for mutation.
 */
export function recordAutomationExecution(
  execution: AutomationExecution,
  ruleNumber: string,
  actionLabel: string
): AutomationAuditEntry {
  const entry: AutomationAuditEntry = {
    id: `audit-${execution.id}`,
    executionId: execution.id,
    ruleId: execution.ruleId,
    ruleName: execution.ruleName,
    ruleNumber,
    initiatedBy: execution.initiatedBy,
    triggerType: execution.triggerType,
    actionId: execution.actionId,
    actionType: execution.actionType,
    actionLabel,
    jobId: execution.jobId,
    jobName: execution.jobName,
    timestamp: execution.executedAt,
    result: execution.result,
    resultMessage: execution.resultMessage,
    approvalStateAtExecution: execution.approvalState,
    summary: buildAuditSummary(execution, actionLabel),
  };

  // Append-only — no update, no delete
  _automationAuditStore.push(entry);

  return entry;
}

/**
 * Builds a human-readable summary string for an audit entry.
 */
function buildAuditSummary(
  execution: AutomationExecution,
  actionLabel: string
): string {
  const jobPart = execution.jobName ? ` [Job: ${execution.jobName}]` : "";
  const resultPart = getExecutionResultLabel(execution.result);
  return `Rule '${execution.ruleName}' fired '${actionLabel}'${jobPart} — ${resultPart}`;
}

// ──────────────────────────────────────────────────────
// AUDIT HISTORY QUERIES
// ──────────────────────────────────────────────────────

/**
 * Returns all audit entries in the store, oldest first.
 * Returns a shallow copy — the store itself is never exposed
 * for mutation.
 */
export function getAutomationAuditHistory(): AutomationAuditEntry[] {
  return [..._automationAuditStore];
}

/**
 * Returns all audit entries for a specific rule.
 */
export function getAuditHistoryForRule(ruleId: string): AutomationAuditEntry[] {
  return _automationAuditStore.filter((e) => e.ruleId === ruleId);
}

/**
 * Returns all audit entries for a specific job.
 */
export function getAuditHistoryForJob(jobId: string): AutomationAuditEntry[] {
  return _automationAuditStore.filter((e) => e.jobId === jobId);
}

/**
 * Returns all audit entries that resulted in a blocked or
 * failed execution. Used for compliance dashboards.
 */
export function getBlockedExecutions(): AutomationAuditEntry[] {
  return _automationAuditStore.filter(
    (e) =>
      e.result === "blocked_forbidden_action" ||
      e.result === "blocked_approval_required" ||
      e.result === "blocked_condition_not_met" ||
      e.result === "failed"
  );
}

/**
 * Builds an AutomationExecutionAudit wrapper from a set of
 * execution records that all belong to the same rule evaluation.
 *
 * Used by the UI layer to group action-level entries under
 * a single rule evaluation event.
 */
export function buildExecutionAudit(
  executions: AutomationExecution[],
  ruleNumber: string,
  actionLabelMap: Record<string, string>
): AutomationExecutionAudit {
  if (executions.length === 0) {
    throw new Error("Cannot build ExecutionAudit from empty executions array.");
  }

  const first = executions[0];
  const entries = executions.map((ex) =>
    recordAutomationExecution(ex, ruleNumber, actionLabelMap[ex.actionId] ?? ex.actionType)
  );

  const successCount = entries.filter((e) => e.result === "success").length;
  const blockedCount = entries.filter(
    (e) =>
      e.result === "blocked_forbidden_action" ||
      e.result === "blocked_approval_required" ||
      e.result === "blocked_condition_not_met"
  ).length;

  let overallResult: AutomationExecutionAudit["overallResult"];
  if (blockedCount === entries.length) {
    overallResult = "blocked";
  } else if (successCount === entries.length) {
    overallResult = "success";
  } else if (entries.some((e) => e.result === "failed")) {
    overallResult = "failed";
  } else {
    overallResult = "partial";
  }

  return {
    id: `exec-audit-${first.ruleId}-${Date.now()}`,
    ruleId: first.ruleId,
    ruleName: first.ruleName,
    // AutomationExecution exposes `executedAt`, not `timestamp`. Reading the
    // wrong name wrote `undefined` into the audit entry's timestamp — Audit
    // Doctrine requires "When" on every financially relevant action.
    timestamp: first.executedAt,
    jobId: first.jobId,
    jobName: first.jobName,
    initiatedBy: first.initiatedBy,
    entries,
    overallResult,
  };
}

// ──────────────────────────────────────────────────────
// SEED EXECUTION HISTORY (for UI display)
// ──────────────────────────────────────────────────────

/**
 * Pre-built seed audit entries representing realistic past
 * execution history. Displayed in Execution History and
 * Automation Audit tabs without needing runtime evaluation.
 */
export const SEED_EXECUTION_HISTORY: AutomationAuditEntry[] = [
  {
    id: "audit-seed-001",
    executionId: "exec-rule-001-seed-001",
    ruleId: "rule-001",
    ruleName: "Notify CEO on Sync Failure",
    ruleNumber: "AUT-2026-001",
    initiatedBy: "system",
    triggerType: "sync_failed",
    actionId: "action-send-notification",
    actionType: "send_notification",
    actionLabel: "Send Notification",
    jobId: null,
    jobName: null,
    timestamp: "2026-05-31T08:15:00Z",
    result: "success",
    resultMessage: "Action 'Send Notification' executed successfully (mock).",
    approvalStateAtExecution: "not_required",
    summary: "Rule 'Notify CEO on Sync Failure' fired 'Send Notification' — Success",
  },
  {
    id: "audit-seed-002",
    executionId: "exec-rule-001-seed-001",
    ruleId: "rule-001",
    ruleName: "Notify CEO on Sync Failure",
    ruleNumber: "AUT-2026-001",
    initiatedBy: "system",
    triggerType: "sync_failed",
    actionId: "action-create-audit-record",
    actionType: "create_audit_record",
    actionLabel: "Create Audit Record",
    jobId: null,
    jobName: null,
    timestamp: "2026-05-31T08:15:00Z",
    result: "success",
    resultMessage: "Action 'Create Audit Record' executed successfully (mock).",
    approvalStateAtExecution: "not_required",
    summary: "Rule 'Notify CEO on Sync Failure' fired 'Create Audit Record' — Success",
  },
  {
    id: "audit-seed-003",
    executionId: "exec-rule-003-seed-003",
    ruleId: "rule-003",
    ruleName: "Queue Accounting Sync on Review Approval",
    ruleNumber: "AUT-2026-003",
    initiatedBy: "Sarah Chen",
    triggerType: "review_approved",
    actionId: "action-queue-accounting-sync",
    actionType: "queue_accounting_sync",
    actionLabel: "Queue Accounting Sync",
    jobId: "dj-kitchen-extract-1",
    jobName: "Kitchen extraction & ventilation install",
    timestamp: "2026-05-31T09:00:00Z",
    result: "success",
    resultMessage: "Action 'Queue Accounting Sync' executed successfully (mock).",
    approvalStateAtExecution: "approved",
    summary: "Rule 'Queue Accounting Sync on Review Approval' fired 'Queue Accounting Sync' [Job: Kitchen extraction & ventilation install] — Success",
  },
  {
    id: "audit-seed-004",
    executionId: "exec-rule-003-seed-004",
    ruleId: "rule-003",
    ruleName: "Queue Accounting Sync on Review Approval",
    ruleNumber: "AUT-2026-003",
    initiatedBy: "Marcus Webb",
    triggerType: "review_approved",
    actionId: "action-queue-accounting-sync",
    actionType: "queue_accounting_sync",
    actionLabel: "Queue Accounting Sync",
    jobId: "dj-kitchen-extract-1",
    jobName: "Kitchen extraction & ventilation install",
    timestamp: "2026-05-30T14:30:00Z",
    result: "blocked_approval_required",
    resultMessage: "Action 'Queue Accounting Sync' is financially sensitive and requires an approved record. Approval state is 'pending'. Action blocked.",
    approvalStateAtExecution: "pending",
    summary: "Rule 'Queue Accounting Sync on Review Approval' fired 'Queue Accounting Sync' [Job: Kitchen extraction & ventilation install] — Blocked — Approval Required",
  },
  {
    id: "audit-seed-005",
    executionId: "exec-rule-002-seed-005",
    ruleId: "rule-002",
    ruleName: "Auto-assign PM on Job Creation",
    ruleNumber: "AUT-2026-002",
    initiatedBy: "Marcus Webb",
    triggerType: "job_created",
    actionId: "action-assign-project-manager",
    actionType: "assign_project_manager",
    actionLabel: "Assign Project Manager",
    jobId: "job-new-2026-001",
    jobName: "Commercial HVAC Maintenance — Tower Block",
    timestamp: "2026-05-30T14:00:00Z",
    result: "success",
    resultMessage: "Action 'Assign Project Manager' executed successfully (mock).",
    approvalStateAtExecution: "not_required",
    summary: "Rule 'Auto-assign PM on Job Creation' fired 'Assign Project Manager' [Job: Commercial HVAC Maintenance — Tower Block] — Success",
  },
];
