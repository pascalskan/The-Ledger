// ======================================================
// PHASE 6.0A — AUTOMATION RULE ENGINE
//
// Responsible for evaluating triggers, conditions, and
// executing actions against an automation rule.
//
// Architecture: Mock only. No backend. No async provider
// integration. Pure synchronous evaluation.
//
// Doctrine:
//   Rules NEVER override approval workflows.
//   FinanciallySensitive actions validate approval state.
//   Forbidden actions are explicitly blocked, not silently
//   ignored.
//   Every evaluation produces an AutomationExecution record
//   (even blocked ones) for audit purposes.
// ======================================================

import {
  AutomationRule,
  AutomationTrigger,
  AutomationAction,
  AutomationExecution,
  AutomationExecutionResult,
  FORBIDDEN_ACTION_NAMES,
  isForbiddenAction,
  isFinanciallySensitive,
  getActionsForRule,
  getTriggerById,
} from "./automationEngine";

// ──────────────────────────────────────────────────────
// EVALUATION CONTEXT
// ──────────────────────────────────────────────────────

/**
 * The runtime context provided to the rule engine when
 * a trigger fires. All values are read-only snapshots;
 * the engine never mutates them.
 */
export interface RuleEvaluationContext {
  /** The trigger payload that fired */
  triggerType: string;
  /** Job context — null for platform-level triggers */
  jobId: string | null;
  jobName: string | null;
  /** Approval state of the source object */
  approvalState: "approved" | "pending" | "not_required" | "not_present";
  /** Additional event-specific data */
  eventData: Record<string, unknown>;
  /** Who or what initiated the trigger */
  initiatedBy: string;
  /** ISO timestamp of the trigger event */
  triggeredAt: string;
}

// ──────────────────────────────────────────────────────
// TRIGGER MATCHING
// ──────────────────────────────────────────────────────

/**
 * Returns true if the rule's trigger matches the event
 * trigger type in the evaluation context.
 *
 * The trigger catalogue is consulted to confirm the trigger
 * exists and is valid. A rule with an unknown trigger ID
 * never matches.
 */
export function matchesTrigger(
  rule: AutomationRule,
  context: RuleEvaluationContext
): boolean {
  if (rule.status !== "active") return false;
  const trigger = getTriggerById(rule.triggerId);
  if (!trigger) return false;
  return rule.triggerType === context.triggerType;
}

// ──────────────────────────────────────────────────────
// CONDITION EVALUATION
// ──────────────────────────────────────────────────────

/**
 * Evaluates optional rule conditions against the evaluation
 * context's eventData.
 *
 * Rules with empty conditions always pass.
 *
 * For each key in rule.conditions:
 *   - If value is "any": always passes for that key
 *   - Otherwise: eventData[key] must equal the condition value
 *
 * Phase 6.0A: simple key=value matching only.
 * Future phases may support operators (gt, lt, contains, etc.)
 */
export function evaluateConditions(
  rule: AutomationRule,
  context: RuleEvaluationContext
): boolean {
  const conditions = rule.conditions;
  if (!conditions || Object.keys(conditions).length === 0) return true;

  for (const [key, expected] of Object.entries(conditions)) {
    if (expected === "any") continue;
    const actual = context.eventData[key];
    if (actual !== expected) return false;
  }
  return true;
}

// ──────────────────────────────────────────────────────
// FINANCIAL SAFETY GATE
// ──────────────────────────────────────────────────────

/**
 * Returns true when it is safe to execute the given action
 * in this context.
 *
 * Safety rules:
 *
 * 1. If the action name is in the forbidden list → BLOCK
 * 2. If the action is FinanciallySensitive:
 *    - approvalState must be "approved" or "not_required"
 *    - "pending" or "not_present" → BLOCK
 * 3. Operational and Workflow actions → always ALLOW
 *
 * This gate deliberately never approves anything. It only
 * checks whether the automation may proceed given existing
 * approval state.
 */
export function isActionSafeToExecute(
  action: AutomationAction,
  context: RuleEvaluationContext
): { safe: boolean; reason: string } {
  // Gate 1: Forbidden action names
  if (isForbiddenAction(action.type)) {
    return {
      safe: false,
      reason: `Action '${action.type}' is forbidden. Automations may never create approved financial records or bypass approval workflows.`,
    };
  }

  // Gate 2: FinanciallySensitive requires approved state
  if (isFinanciallySensitive(action)) {
    if (
      context.approvalState !== "approved" &&
      context.approvalState !== "not_required"
    ) {
      return {
        safe: false,
        reason: `Action '${action.label}' is financially sensitive and requires an approved record. Approval state is '${context.approvalState}'. Action blocked.`,
      };
    }
  }

  return { safe: true, reason: "Action cleared all safety gates." };
}

// ──────────────────────────────────────────────────────
// ACTION EXECUTION (MOCK)
// ──────────────────────────────────────────────────────

/**
 * Mock-executes a single action and returns an execution record.
 *
 * Phase 6.0A: no real side effects. The result simulates what
 * would happen in a wired system.
 *
 * Each execution record is a complete, immutable snapshot:
 *   - which rule fired
 *   - which trigger caused it
 *   - which action was attempted
 *   - job attribution
 *   - approval state at time of execution
 *   - result and result message
 */
export function executeAction(
  rule: AutomationRule,
  action: AutomationAction,
  context: RuleEvaluationContext,
  executionId: string
): AutomationExecution {
  const safetyCheck = isActionSafeToExecute(action, context);

  let result: AutomationExecutionResult;
  let resultMessage: string;

  if (!safetyCheck.safe) {
    // Distinguish forbidden from approval-blocked for audit clarity
    result = isForbiddenAction(action.type)
      ? "blocked_forbidden_action"
      : "blocked_approval_required";
    resultMessage = safetyCheck.reason;
  } else {
    // Mock success
    result = "success";
    resultMessage = `Action '${action.label}' executed successfully (mock).`;
  }

  return {
    id: executionId,
    ruleId: rule.id,
    ruleName: rule.name,
    triggerId: rule.triggerId,
    triggerType: rule.triggerType,
    actionId: action.id,
    actionType: action.type,
    jobId: context.jobId,
    jobName: context.jobName,
    initiatedBy: context.initiatedBy,
    executedAt: context.triggeredAt,
    result,
    resultMessage,
    approvalState: context.approvalState,
  };
}

// ──────────────────────────────────────────────────────
// EXECUTE ALL ACTIONS FOR A RULE
// ──────────────────────────────────────────────────────

/**
 * Executes all actions for a rule, returning one
 * AutomationExecution per action.
 *
 * Produces a complete execution set even for blocked
 * actions so every action attempt is auditable.
 */
export function executeActions(
  rule: AutomationRule,
  context: RuleEvaluationContext
): AutomationExecution[] {
  const actions = getActionsForRule(rule);
  return actions.map((action, index) =>
    executeAction(
      rule,
      action,
      context,
      `exec-${rule.id}-${Date.now()}-${index}`
    )
  );
}

// ──────────────────────────────────────────────────────
// FULL RULE EVALUATION
// ──────────────────────────────────────────────────────

export interface RuleEvaluationResult {
  rule: AutomationRule;
  matched: boolean;               // trigger matched
  conditionsPassed: boolean;      // conditions evaluated
  executions: AutomationExecution[];
  /** Reason for not matching or not evaluating */
  skipReason: string | null;
}

/**
 * Full rule evaluation pipeline:
 *
 * 1. Check rule is active
 * 2. Check trigger matches
 * 3. Evaluate conditions
 * 4. Execute actions (all, including blocked ones)
 *
 * Returns a full RuleEvaluationResult regardless of outcome.
 */
export function evaluateRule(
  rule: AutomationRule,
  context: RuleEvaluationContext
): RuleEvaluationResult {
  // Step 1: Only active rules are evaluated
  if (rule.status !== "active") {
    return {
      rule,
      matched: false,
      conditionsPassed: false,
      executions: [],
      skipReason: `Rule is not active (status: '${rule.status}'). Skipped.`,
    };
  }

  // Step 2: Trigger matching
  if (!matchesTrigger(rule, context)) {
    return {
      rule,
      matched: false,
      conditionsPassed: false,
      executions: [],
      skipReason: `Trigger type '${context.triggerType}' does not match rule trigger '${rule.triggerType}'.`,
    };
  }

  // Step 3: Condition evaluation
  const conditionsPassed = evaluateConditions(rule, context);
  if (!conditionsPassed) {
    return {
      rule,
      matched: true,
      conditionsPassed: false,
      executions: [],
      skipReason: `Rule conditions not met for event data.`,
    };
  }

  // Step 4: Execute all actions (blocked actions still produce execution records)
  const executions = executeActions(rule, context);

  return {
    rule,
    matched: true,
    conditionsPassed: true,
    executions,
    skipReason: null,
  };
}

/**
 * Evaluates all provided rules against a context and returns
 * all results (including skipped ones).
 *
 * In a real system this would be called by the automation
 * event bus. In Phase 6.0A it is called directly by tests
 * and the UI layer.
 */
export function evaluateAllRules(
  rules: AutomationRule[],
  context: RuleEvaluationContext
): RuleEvaluationResult[] {
  return rules.map((rule) => evaluateRule(rule, context));
}
