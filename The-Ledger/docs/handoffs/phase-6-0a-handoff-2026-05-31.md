# PHASE 6.0A HANDOFF — Automation Core

Date: 2026-05-31  
Branch: `feature/phase-6-0a-automation-core`  
Base: `main` @ `a4526cb`

---

## IMPLEMENTATION SUMMARY

Phase 6.0A delivers the Automation Engine Foundation — three pure TypeScript engine files that form the engine layer of The Ledger's automation system. No UI builder, no visual workflow designer, no drag-and-drop. This phase builds the engine that future phases will expose through a UI.

---

## CURRENT STATE

- Branch: `feature/phase-6-0a-automation-core`
- Based on `main` @ `a4526cb` (Phases 1–5.9 complete)
- 4 commits on branch
- Build: Pending — owner to run `cd The-Ledger && npm run build` locally
- Playwright: Pending — owner to run `cd The-Ledger && npx playwright test` locally
- Expected test suite: 113 existing + 13 new = 126 passing tests

---

## FILES ADDED

### Engines

#### `client/src/lib/automationEngine.ts`

Core automation model. Defines all foundational types and seed data.

Types:
- `AutomationStatus`: `draft | active | disabled | archived`
- `AutomationCategory`: `Operational | Workflow | FinanciallySensitive`
- `AutomationTriggerType`: 9 trigger types (V1 Catalogue)
- `AutomationTrigger`: trigger definition with conditions payload
- `AutomationActionType`: 8 action types (V1 Catalogue)
- `ActionSafetyClass`: `Operational | Workflow | FinanciallySensitive`
- `AutomationAction`: action definition with safety classification
- `AutomationExecutionResult`: 5 execution outcomes
- `AutomationExecution`: execution record with full doctrine fields
- `AutomationRule`: rule with trigger, conditions, actions, job attribution
- `AutomationRuleSummary`: computed summary struct

Catalogues:
- `TRIGGER_CATALOGUE_V1`: 9 trigger definitions (Review Approved, Job Created, Sync Failed, etc.)
- `ACTION_CATALOGUE_V1`: 8 action definitions with safety class
- `FORBIDDEN_ACTION_NAMES`: 5 explicitly forbidden action types (doctrine reference)
- `SEED_AUTOMATION_RULES`: 6 realistic seed rules covering Active, Disabled, Draft statuses and all 3 categories

Helpers:
- `getAutomationStatusLabel()`, `getAutomationCategoryLabel()`
- `isForbiddenAction()`, `isFinanciallySensitive()`
- `getTriggerById()`, `getActionById()`, `getActionsForRule()`
- `filterRulesByStatus()`, `filterRulesByCategory()`, `searchRules()`
- `computeAutomationRuleSummary()`
- `fmt()` currency helper (reused pattern from financialControlsEngine)

---

#### `client/src/lib/automationRuleEngine.ts`

Evaluation pipeline for automation rules.

Interfaces:
- `RuleEvaluationContext`: runtime snapshot of trigger event (triggerType, jobId, approvalState, eventData, etc.)
- `RuleEvaluationResult`: full evaluation outcome (matched, conditionsPassed, executions, skipReason)

Functions:
- `matchesTrigger(rule, context)`: confirms rule is active + trigger type matches
- `evaluateConditions(rule, context)`: key=value matching with 'any' wildcard support
- `isActionSafeToExecute(action, context)`: financial safety gate
  - Gate 1: Forbidden action names → block
  - Gate 2: FinanciallySensitive + non-approved state → block
- `executeAction(rule, action, context, executionId)`: mock execution, produces AutomationExecution
- `executeActions(rule, context)`: executes all rule actions, blocked actions still produce records
- `evaluateRule(rule, context)`: full pipeline (active check → trigger → conditions → execute)
- `evaluateAllRules(rules, context)`: batch evaluation

---

#### `client/src/lib/automationAuditEngine.ts`

Immutable audit trail for automation executions.

Interfaces:
- `AutomationAuditEntry`: covers all Audit Doctrine fields (who, what, when, previous value, new value, source, destination, external ref)
- `AutomationExecutionAudit`: groups per-action entries under one rule evaluation

Storage:
- `_automationAuditStore`: module-level append-only array (exported for test inspection only)

Functions:
- `recordAutomationExecution(execution, ruleNumber, actionLabel)`: converts execution to audit entry, appends to store
- `getAutomationAuditHistory()`: returns shallow copy oldest-first
- `getAuditHistoryForRule(ruleId)`: rule-scoped query
- `getAuditHistoryForJob(jobId)`: job-scoped query (job mini-ledger attribution)
- `getBlockedExecutions()`: compliance query for blocked/failed actions
- `buildExecutionAudit(executions, ruleNumber, actionLabelMap)`: groups executions into ExecutionAudit with overall result
- `getExecutionResultLabel()`, `getExecutionResultColor()`: label/color helpers following established pattern

---

### Tests

#### `tests/doctrine/automation-core.spec.ts`

13 doctrine tests:

**Page access (4):**
- `/automations` loads for CEO
- CEO can navigate via sidebar
- Seed data renders automation cards
- Activity Log tab is present and clickable

**Engine validation (6):**
- `SEED_AUTOMATION_RULES` contains 6 rules
- `TRIGGER_CATALOGUE_V1` contains 9 triggers
- `ACTION_CATALOGUE_V1` contains 8 actions
- `getAutomationStatusLabel()` returns correct label
- `getAutomationCategoryLabel()` returns 'Financially Sensitive' for FinanciallySensitive
- `isForbiddenAction()` correctly identifies forbidden vs allowed

**Rule engine (4):**
- Disabled rule is skipped with reason
- Active rule with matching trigger produces executions
- FinanciallySensitive action blocked when approvalState='pending'
- Condition mismatch prevents execution

**Audit engine (2):**
- `recordAutomationExecution` appends entry with full job attribution
- Audit history grows monotonically (append-only)

---

### Docs

- `docs/handoffs/phase-6-0a-handoff-2026-05-31.md` — this document

---

## FILES MODIFIED

None. Phase 6.0A is fully isolated to new engine files and the new test spec. The existing `pages/automations.tsx`, `App.tsx`, `layout.tsx`, and all prior engines are untouched.

---

## DOCTRINE VALIDATION

### Approval Doctrine ✔

- No automation action may directly create revenue, cost, payroll, invoice, or accounting mutations
- `FORBIDDEN_ACTION_NAMES` explicitly lists `create_approved_invoice`, `create_revenue_event`, `modify_approved_cost`, `approve_expense`, `approve_timesheet`
- `isForbiddenAction()` is called as Gate 1 in every action execution
- `generate_draft_invoice` and `queue_accounting_sync` are classified `FinanciallySensitive` — never approved automatically

### Audit Doctrine ✔

- Every execution — success or blocked — produces an `AutomationAuditEntry`
- Audit entries cover: who (initiatedBy), what (ruleName, actionType, result), when (timestamp), previous value (approvalStateAtExecution), new value (result), source object (triggerType), destination object (actionType), external reference (executionId, ruleId)
- `_automationAuditStore` is append-only; `recordAutomationExecution` only pushes, never updates or deletes
- `getAutomationAuditHistory()` returns a shallow copy, not the live array

### Job Mini-Ledger Doctrine ✔

- `AutomationRule` carries `jobId` and `jobName`
- `AutomationExecution` carries `jobId` and `jobName` from `RuleEvaluationContext`
- `AutomationAuditEntry` carries `jobId` and `jobName`
- `getAuditHistoryForJob(jobId)` provides job-scoped attribution queries

### Financial Integrity Doctrine ✔

- `isActionSafeToExecute()` enforces two gates: forbidden name check + approval state check
- FinanciallySensitive actions blocked unless `approvalState` is `approved` or `not_required`
- Blocked executions produce audit records identical to successful ones — no silent failures

### Accounting Independence Doctrine ✔

- No automation creates accounting system records
- `queue_accounting_sync` only queues — it does not execute sync
- Sync execution remains downstream and approval-gated

---

## BUILD RESULT

Pending — owner to run locally:

```bash
cd The-Ledger && npm run build
```

Expected: PASS (no new dependencies, pure TypeScript, no JSX, no imports outside engine graph)

---

## PLAYWRIGHT RESULT

Pending — owner to run locally:

```bash
cd The-Ledger && npx playwright test
```

Expected: 126 passing tests (113 existing + 13 new doctrine tests)

---

## RISKS

1. **Dynamic import path in Playwright** — tests use `page.evaluate(() => import('/src/lib/automationEngine.ts'))`. This pattern works when Vite dev server is running with the `webServer` config. If tests run against a built static bundle, the path format may need adjustment. If any of the 6 engine-validation tests fail, the fallback is to test via the UI surface instead.

2. **Existing automations page** — `pages/automations.tsx` uses `useStore()` from `mockData.ts`. The new engines are completely isolated. No risk of interference.

3. **Audit store is module-level** — in a single browser session the store persists. Tests that record entries will accumulate across the session. The monotonicity test accounts for this by comparing before/after counts rather than asserting absolute values.

---

## RECOMMENDED NEXT PHASE

### Phase 6.0B — Automation Centre Page

Now that the engine layer is in place, Phase 6.0B can build the full Automations Centre page at `/automations`, replacing the existing stub with:

- Rule List table (Rule Number, Name, Status, Category, Trigger, Last Executed, Execution Count)
- KPI strip: Active rules, Draft rules, Financially Sensitive rules, Total executions
- Status and Category filters
- Rule Detail panel: trigger, conditions, actions list with safety class badges
- Execution Audit Log tab: audit history, blocked execution highlighting
- Doctrine safeguards visible in UI: forbidden actions shown as blocked, approval state badges

Alternatively:

### Phase 6.1 — Notification & Alert Centre

Builds the real-time alert panel surfacing:
- Open exceptions count
- Failed syncs
- Pending controls
- Low stock alerts
- Flagged jobs

This uses the existing exception, reconciliation, and sync engines plus the new automation engine.

---

## BRANCH NAME

`feature/phase-6-0a-automation-core`

Do not merge. Owner to pull, verify build and Playwright locally, then open PR.
