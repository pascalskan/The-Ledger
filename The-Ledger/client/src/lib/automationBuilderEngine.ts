// ======================================================
// PHASE 6.0C — AUTOMATION BUILDER ENGINE
//
// Manages the lifecycle of user-created automation rules
// via the guided builder UI.
//
// Architecture: Mock only. No backend. In-memory store.
//
// Doctrine:
//   Builders NEVER create approved financial records.
//   Builders NEVER bypass approval workflows.
//   All create/update/archive operations generate audit entries.
//   Forbidden actions are blocked at save time.
//   FinanciallySensitive rules show an explicit warning.
// ======================================================

import {
  AutomationRule,
  AutomationStatus,
  AutomationCategory,
  SEED_AUTOMATION_RULES,
  FORBIDDEN_ACTION_NAMES,
  TRIGGER_CATALOGUE_V1,
  ACTION_CATALOGUE_V1,
} from "./automationEngine";
import {
  AutomationAuditEntry,
  _automationAuditStore,
} from "./automationAuditEngine";

// ──────────────────────────────────────────────────────
// BUILDER CONDITION
// ──────────────────────────────────────────────────────

export type ConditionOperator =
  | "equals"
  | "not_equals"
  | "contains"
  | "greater_than"
  | "less_than";

export const CONDITION_OPERATOR_LABELS: Record<ConditionOperator, string> = {
  equals: "Equals",
  not_equals: "Not Equals",
  contains: "Contains",
  greater_than: "Greater Than",
  less_than: "Less Than",
};

export interface BuilderCondition {
  id: string;
  field: string;
  operator: ConditionOperator;
  value: string;
}

// ──────────────────────────────────────────────────────
// BUILDER FORM STATE
// ──────────────────────────────────────────────────────

export interface BuilderFormState {
  /** Step 1 */
  name: string;
  description: string;
  category: AutomationCategory;
  /** Step 2 */
  triggerId: string;
  /** Step 3 */
  conditions: BuilderCondition[];
  /** Step 4 */
  actionIds: string[];
}

export const BUILDER_FORM_DEFAULTS: BuilderFormState = {
  name: "",
  description: "",
  category: "Operational",
  triggerId: "",
  conditions: [],
  actionIds: [],
};

// ──────────────────────────────────────────────────────
// BUILDER STEPS
// ──────────────────────────────────────────────────────

export type BuilderStep = 1 | 2 | 3 | 4 | 5;

export const BUILDER_STEP_LABELS: Record<BuilderStep, string> = {
  1: "Basic Details",
  2: "Trigger",
  3: "Conditions",
  4: "Actions",
  5: "Review",
};

// ──────────────────────────────────────────────────────
// VALIDATION
// ──────────────────────────────────────────────────────

export interface BuilderValidationResult {
  valid: boolean;
  errors: string[];
}

/**
 * Validates the builder form state for completeness and
 * doctrine compliance.
 *
 * Validation rules:
 * - Name: required
 * - Description: required
 * - Trigger: must be selected
 * - Actions: at least one action selected
 * - No forbidden actions may be selected
 * - FinanciallySensitive rules may not include forbidden actions
 */
export function validateBuilderForm(
  form: BuilderFormState
): BuilderValidationResult {
  const errors: string[] = [];

  if (!form.name.trim()) {
    errors.push("Rule name is required.");
  }
  if (!form.description.trim()) {
    errors.push("Description is required.");
  }
  if (!form.triggerId) {
    errors.push("A trigger must be selected.");
  }
  if (form.actionIds.length === 0) {
    errors.push("At least one action must be selected.");
  }

  // Forbidden action check
  for (const actionId of form.actionIds) {
    const action = ACTION_CATALOGUE_V1.find((a) => a.id === actionId);
    if (action && FORBIDDEN_ACTION_NAMES.includes(action.type as string)) {
      errors.push(
        `Action '${action.label}' is forbidden and cannot be used in automation rules.`
      );
    }
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Returns true if the form contains any forbidden action.
 * Used by the UI to block the save button.
 */
export function formContainsForbiddenAction(form: BuilderFormState): boolean {
  return form.actionIds.some((id) => {
    const action = ACTION_CATALOGUE_V1.find((a) => a.id === id);
    return action ? FORBIDDEN_ACTION_NAMES.includes(action.type as string) : false;
  });
}

// ──────────────────────────────────────────────────────
// RULE STORE (in-memory, mock persistence)
// ──────────────────────────────────────────────────────

/**
 * Module-level mutable rule store, seeded with Phase 6.0A
 * seed data. Mutations are always through engine functions.
 *
 * Exported for test inspection only. Do not mutate directly.
 */
export const _ruleStore: AutomationRule[] = [...SEED_AUTOMATION_RULES];

function generateRuleNumber(): string {
  const year = new Date().getFullYear();
  const existing = _ruleStore.filter((r) =>
    r.ruleNumber.startsWith(`AUT-${year}-`)
  );
  const max = existing.reduce((acc, r) => {
    const n = parseInt(r.ruleNumber.split("-")[2] ?? "0", 10);
    return Math.max(acc, n);
  }, 0);
  return `AUT-${year}-${String(max + 1).padStart(3, "0")}`;
}

function generateRuleId(): string {
  return `rule-builder-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

// ──────────────────────────────────────────────────────
// BUILDER AUDIT HELPERS
// ──────────────────────────────────────────────────────

function createBuilderAuditEntry(
  ruleId: string,
  ruleName: string,
  ruleNumber: string,
  action: "Automation Created" | "Automation Updated" | "Automation Duplicated" | "Automation Archived",
  initiatedBy: string,
  jobId: string | null,
  jobName: string | null
): AutomationAuditEntry {
  const id = `audit-builder-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const now = new Date().toISOString();
  const entry: AutomationAuditEntry = {
    id,
    executionId: id,
    ruleId,
    ruleName,
    ruleNumber,
    initiatedBy,
    triggerType: "builder_action",
    actionId: `builder-${action.toLowerCase().replace(/ /g, "-")}`,
    actionType: action.toLowerCase().replace(/ /g, "_"),
    actionLabel: action,
    jobId,
    jobName,
    timestamp: now,
    result: "success",
    resultMessage: `${action}: '${ruleName}'`,
    approvalStateAtExecution: "not_required",
    summary: `${action}: rule '${ruleName}' (${ruleNumber}) by ${initiatedBy}`,
  };
  _automationAuditStore.push(entry);
  return entry;
}

// ──────────────────────────────────────────────────────
// CREATE RULE
// ──────────────────────────────────────────────────────

export function createRuleFromBuilder(
  form: BuilderFormState,
  createdBy: string = "CEO"
): { rule: AutomationRule; auditEntry: AutomationAuditEntry } {
  const validation = validateBuilderForm(form);
  if (!validation.valid) {
    throw new Error(`Builder validation failed: ${validation.errors.join("; ")}`);
  }

  const trigger = TRIGGER_CATALOGUE_V1.find((t) => t.id === form.triggerId)!;
  const now = new Date().toISOString();
  const ruleNumber = generateRuleNumber();
  const id = generateRuleId();

  // Convert builder conditions to rule conditions record
  const conditions: Record<string, unknown> = {};
  for (const cond of form.conditions) {
    if (cond.field.trim() && cond.value.trim()) {
      conditions[cond.field.trim()] = cond.value.trim();
    }
  }

  const rule: AutomationRule = {
    id,
    ruleNumber,
    name: form.name.trim(),
    description: form.description.trim(),
    status: "active",
    category: form.category,
    triggerId: form.triggerId,
    triggerType: trigger.type,
    conditions,
    actionIds: form.actionIds,
    createdBy,
    createdAt: now,
    updatedAt: now,
    lastExecutedAt: null,
    executionCount: 0,
    jobId: null,
    jobName: null,
  };

  _ruleStore.push(rule);

  const auditEntry = createBuilderAuditEntry(
    id,
    rule.name,
    ruleNumber,
    "Automation Created",
    createdBy,
    null,
    null
  );

  return { rule, auditEntry };
}

// ──────────────────────────────────────────────────────
// UPDATE RULE
// ──────────────────────────────────────────────────────

export function updateRuleFromBuilder(
  ruleId: string,
  form: BuilderFormState,
  updatedBy: string = "CEO"
): { rule: AutomationRule; auditEntry: AutomationAuditEntry } {
  const validation = validateBuilderForm(form);
  if (!validation.valid) {
    throw new Error(`Builder validation failed: ${validation.errors.join("; ")}`);
  }

  const index = _ruleStore.findIndex((r) => r.id === ruleId);
  if (index === -1) throw new Error(`Rule not found: ${ruleId}`);

  const existing = _ruleStore[index];
  const trigger = TRIGGER_CATALOGUE_V1.find((t) => t.id === form.triggerId)!;
  const conditions: Record<string, unknown> = {};
  for (const cond of form.conditions) {
    if (cond.field.trim() && cond.value.trim()) {
      conditions[cond.field.trim()] = cond.value.trim();
    }
  }

  const updated: AutomationRule = {
    ...existing,
    name: form.name.trim(),
    description: form.description.trim(),
    category: form.category,
    triggerId: form.triggerId,
    triggerType: trigger.type,
    conditions,
    actionIds: form.actionIds,
    updatedAt: new Date().toISOString(),
  };

  _ruleStore[index] = updated;

  const auditEntry = createBuilderAuditEntry(
    ruleId,
    updated.name,
    updated.ruleNumber,
    "Automation Updated",
    updatedBy,
    null,
    null
  );

  return { rule: updated, auditEntry };
}

// ──────────────────────────────────────────────────────
// DUPLICATE RULE
// ──────────────────────────────────────────────────────

export function duplicateRule(
  ruleId: string,
  duplicatedBy: string = "CEO"
): { rule: AutomationRule; auditEntry: AutomationAuditEntry } {
  const source = _ruleStore.find((r) => r.id === ruleId);
  if (!source) throw new Error(`Rule not found: ${ruleId}`);

  const now = new Date().toISOString();
  const ruleNumber = generateRuleNumber();
  const id = generateRuleId();

  const duplicate: AutomationRule = {
    ...source,
    id,
    ruleNumber,
    name: `Copy of ${source.name}`,
    status: "draft",
    createdBy: duplicatedBy,
    createdAt: now,
    updatedAt: now,
    lastExecutedAt: null,
    executionCount: 0,
  };

  _ruleStore.push(duplicate);

  const auditEntry = createBuilderAuditEntry(
    id,
    duplicate.name,
    ruleNumber,
    "Automation Duplicated",
    duplicatedBy,
    null,
    null
  );

  return { rule: duplicate, auditEntry };
}

// ──────────────────────────────────────────────────────
// ARCHIVE RULE (no hard delete)
// ──────────────────────────────────────────────────────

export function archiveRule(
  ruleId: string,
  archivedBy: string = "CEO"
): { rule: AutomationRule; auditEntry: AutomationAuditEntry } {
  const index = _ruleStore.findIndex((r) => r.id === ruleId);
  if (index === -1) throw new Error(`Rule not found: ${ruleId}`);

  const updated: AutomationRule = {
    ..._ruleStore[index],
    status: "archived",
    updatedAt: new Date().toISOString(),
  };

  _ruleStore[index] = updated;

  const auditEntry = createBuilderAuditEntry(
    ruleId,
    updated.name,
    updated.ruleNumber,
    "Automation Archived",
    archivedBy,
    null,
    null
  );

  return { rule: updated, auditEntry };
}

// ──────────────────────────────────────────────────────
// QUERY HELPERS
// ──────────────────────────────────────────────────────

export function getAllRules(): AutomationRule[] {
  return [..._ruleStore];
}

export function getRuleById(ruleId: string): AutomationRule | undefined {
  return _ruleStore.find((r) => r.id === ruleId);
}

/**
 * Converts a saved AutomationRule back to a BuilderFormState
 * for use in the Edit workflow.
 */
export function ruleToBuilderForm(rule: AutomationRule): BuilderFormState {
  const conditions: BuilderCondition[] = Object.entries(rule.conditions).map(
    ([field, value], i) => ({
      id: `edit-cond-${i}`,
      field,
      operator: "equals" as ConditionOperator,
      value: String(value),
    })
  );

  return {
    name: rule.name,
    description: rule.description,
    category: rule.category,
    triggerId: rule.triggerId,
    conditions,
    actionIds: [...rule.actionIds],
  };
}
