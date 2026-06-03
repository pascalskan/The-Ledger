# Phase 6.4 — Cross-Module Workflow Automation
## Handoff Document

**Branch:** `feature/phase-6-4-workflow-automation`
**Status:** Complete — Ready for PR
**Date:** June 2026

---

## Summary

Phase 6.4 delivers a full Cross-Module Workflow Orchestration system for The Ledger. The Workflow Centre is a CEO-only operational hub enabling visibility and control over multi-step automated workflows that span Review Centre, Exception Resolution, Notification Centre, Activity Feed, Event Bus, and Automation Governance — while never bypassing the Approval Doctrine.

---

## What Was Done

### 1. Workflow Engine (`client/src/lib/workflowEngine.ts`)

Complete in-memory workflow orchestration engine:

- **Types:** `WorkflowStatus`, `WorkflowStepStatus`, `WorkflowType`, `WorkflowStep`, `WorkflowExecutionRecord`, `WorkflowAuditEntry`, `WorkflowRecord`, `WorkflowSummary`, `WorkflowBusEventType`
- **Constants:** Status/type/step labels and colour classes for all badge variants
- **Doctrine enforcement:** `WORKFLOW_FORBIDDEN_ACTIONS` (7 blocked actions) + `isWorkflowActionForbidden()` — validated at create and update time
- **Seed data:** 8 realistic workflows across 5 types: review, exception, governance, sync, notification. Includes workflows with blocked steps, failed steps, execution history, and governance flags
- **Public API:** `getAllWorkflows()`, `getWorkflowById()`, `createWorkflow()`, `updateWorkflow()`, `archiveWorkflow()`, `pauseWorkflow()`, `resumeWorkflow()`, `computeWorkflowSummary()`, `searchWorkflows()`, `getWorkflowAuditLog()`
- **Audit trail:** immutable `WorkflowAuditEntry` records for all lifecycle events (created/updated/archived/paused/resumed/executed)
- **Event Bus integration:** `WorkflowBusEventType` (5 types), `WORKFLOW_BUS_EVENT_LABELS`, `publishWorkflowEvent()` — writes to audit log; backend integration deferred to production phase

### 2. Workflow Centre Page (`client/src/pages/workflows.tsx`)

Full-featured CEO-only Workflow Centre:

- **Doctrine notice banner** — explicit statement of workflow capabilities and absolute prohibitions
- **KPI strip** — 5 cards: Total, Active, Paused, Requires Action, Financially Sensitive
- **Workflow table** — type/status badges, trigger event (mono), step pip indicators, action required + financial sensitivity indicators, inline Pause/Resume/Archive buttons
- **Filters** — Status (all/active/paused/draft/archived), Type (5 workflow types)
- **Search** — name, description, trigger event, type, ID
- **Workflow Detail Dialog** — trigger event section, workflow steps with status pips + failure reasons, execution history, governance status panel, financial safeguard panel, action buttons
- **Workflow Execution Visibility Panel** — live execution status, blocked/failed step count indicators, per-workflow latest exec status badge, quick-view navigation
- All `data-testid` attributes wired for full Playwright coverage

### 3. Routing (`client/src/App.tsx`)

Route `/workflows` added as `ProtectedRoute` with `roles={["CEO"]}`. Import: `WorkflowCentrePage`.

### 4. Navigation (`client/src/components/layout.tsx`)

`Workflow Centre` nav item added:
- Icon: `GitBranch` (imported from lucide-react)
- Route: `/workflows`
- Roles: `["CEO"]` only
- `data-testid="nav-workflow-centre"`
- Position: after Event Monitor, before Accounting Settings

### 5. Doctrine Tests (`tests/doctrine/workflow-automation.spec.ts`)

35 tests across 9 groups:

| Group | Tests | Coverage |
|---|---|---|
| 1: Rendering & Navigation | WF-01 to WF-04 | Nav, heading, runtime errors, doctrine notice |
| 2: KPI Strip | WF-05 to WF-09 | All 5 KPI cards, seed counts |
| 3: Workflow Table | WF-10 to WF-12 | Seed rows, action required, financially sensitive |
| 4: Filters & Search | WF-13 to WF-18 | Status filter, type filter, name search, trigger search, empty results |
| 5: Detail Dialog | WF-19 to WF-24 | Trigger, steps, execution history, governance flag, financial flag |
| 6: Workflow Actions | WF-25 to WF-27 | Pause, Resume, Archive |
| 7: Execution Panel | WF-28 to WF-30 | Panel rendering, failed steps, blocked steps |
| 8: Governance | WF-31 to WF-32 | Financial badges, doctrine notice content |
| 9: RBAC | WF-33 to WF-35 | CEO allowed, PM denied, Worker denied |

### 6. Canonical Context (`LEDGER_CANONICAL_CONTEXT.md`)

- Version bumped to 6.4
- **Workflow Automation Doctrine** section added (capabilities, prohibitions, lifecycle, audit, RBAC, forbidden actions list)
- Workflow Centre added to Product Definition / Executive Platform list
- Phase 6.4 implementation block added to Roadmap
- Next Target updated to Phase 6.5 — Dashboard Intelligence Layer
- AI Audit Rules extended with Workflow Automation Doctrine preservation rule

---

## Files Added

| File | Purpose |
|---|---|
| `The-Ledger/client/src/lib/workflowEngine.ts` | Workflow orchestration engine |
| `The-Ledger/client/src/pages/workflows.tsx` | Workflow Centre CEO-only page |
| `tests/doctrine/workflow-automation.spec.ts` | 35 doctrine tests (WF-01 to WF-35) |
| `The-Ledger/docs/handoffs/phase-6-4-workflow-automation-handoff.md` | This file |

## Files Modified

| File | Change |
|---|---|
| `The-Ledger/client/src/App.tsx` | `/workflows` route added (CEO only) |
| `The-Ledger/client/src/components/layout.tsx` | `Workflow Centre` nav item added (GitBranch icon, CEO only) |
| `The-Ledger/LEDGER_CANONICAL_CONTEXT.md` | Phase 6.4 complete, doctrine updated, next target 6.5 |

---

## Seed Data Summary

| ID | Name | Type | Status | Action Required | Financially Sensitive | Gov Status |
|---|---|---|---|---|---|---|
| wf-001 | Expense Review Escalation | review_workflow | active | No | Yes | requires_review |
| wf-002 | Reconciliation Failure Governance Review | governance_workflow | active | Yes | Yes | requires_review |
| wf-003 | Sync Failure Notification Cascade | sync_workflow | active | Yes | Yes | compliant |
| wf-004 | High-Risk Automation Governance | governance_workflow | active | No | No | compliant |
| wf-005 | Worker Exception Investigation | exception_workflow | active | Yes | No | compliant |
| wf-006 | Job Review Completion Notification | notification_workflow | active | No | No | compliant |
| wf-007 | Financial Control Override Review | governance_workflow | paused | No | Yes | requires_review |
| wf-008 | Draft Quarterly Sync Workflow | sync_workflow | draft | No | Yes | compliant |

---

## Workflow Doctrine Reminder

Workflows MAY: create notifications, generate activity events, escalate reviews, assign investigations, trigger governance reviews.

Workflows MAY NEVER: approve reports, approve expenses, approve timesheets, create approved invoices, create approved financial records, bypass the Review Centre, bypass CEO approvals.

Approval Doctrine is absolute. Workflows are orchestration infrastructure, not approval infrastructure.

---

## RBAC

| Role | Access |
|---|---|
| CEO | Full access to Workflow Centre (`/workflows`) |
| Project Manager | Denied (401 / Unauthorized page) |
| Worker | Denied (redirected to `/worker/jobs`) |
| Client | No access |

---

## Commits in This Branch (Phase 6.4)

1. `feat(6.4): add workflowEngine.ts — Workflow Engine with seed data`
2. `feat(6.4): add Workflow Centre page (CEO only)`
3. `feat(6.4): add /workflows route to App.tsx`
4. `feat(6.4): add Workflow Centre nav item to layout.tsx (CEO only, GitBranch icon)`
5. `test(6.4): add 35 doctrine tests for workflow automation`
6. `docs(6.4): update canonical context — Phase 6.4 complete, Workflow Automation Doctrine, next target 6.5`
7. `docs(6.4): add phase-6-4 handoff document`

---

## Next Phase

**Phase 6.5 — Dashboard Intelligence Layer**

Transform the existing dashboard into a live intelligence hub:
- Executive Summary widget (Review Centre, Exceptions, Governance, Reconciliation live counts)
- Financial Health Snapshot widget
- Outstanding Actions widget (cross-module)
- Recent Workflow Executions widget (surfacing workflowEngine data)
- Doctrine tests: 15+ tests
- Branch: `feature/phase-6-5-dashboard-intelligence`

---

*Handoff generated by Claude — Phase 6.4 implementation complete.*
