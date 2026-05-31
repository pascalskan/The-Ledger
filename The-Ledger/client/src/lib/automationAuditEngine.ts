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
    timestamp: first.timestamp,
    jobId: first.jobId,
    jobName: first.jobName,
    initiatedBy: first.initiatedBy,
    entries,
    overallResult,
  };
}
