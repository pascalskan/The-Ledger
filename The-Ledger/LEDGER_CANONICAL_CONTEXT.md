# THE LEDGER

## Canonical Context Document

Version: 5.0
Status: Active Source of Truth
Last Updated: June 2026

Repository Baseline:
main @ 5b4ca9a (post Phase 6.0E merge)

Verification Status:
Build PASS
Playwright 226 / 226 PASSING (post-6.0E)
Phase 6.1 adds 28 new tests → target 254 / 254

---

# PROJECT IDENTITY

The Ledger is an operational intelligence, financial normalization, workforce management, document intelligence, and business operations platform designed for:

- Facilities Management
- Cleaning
- Security
- Labour Providers
- Field Services
- Construction
- Maintenance
- Trade Businesses

The Ledger is not accounting software.

The Ledger sits between operations and accounting systems and transforms operational activity into structured, auditable, financially accurate data.

Supported downstream systems include:

- QuickBooks
- Xero
- FreshBooks
- Zoho Books
- Future accounting integrations

---

# CORE DOCTRINE

## Operational Data Is Financial Data

Every financial outcome originates from operational activity.

Operational Event
→ Structured Submission
→ Review Center
→ Approval
→ Financial Normalization
→ Accounting Sync

Nothing becomes financially real until approved.

---

## Approval Doctrine

No operational event may directly create:

- Revenue
- Cost
- Payroll
- Invoice entries
- Inventory deductions
- Accounting mutations

until approved.

Approval is the central control mechanism of the entire platform.

---

## Audit Doctrine

Every financially relevant action must be traceable.

Required audit fields:

- Who
- What
- When
- Previous Value
- New Value
- Source Object
- Destination Object
- External Reference

No silent financial mutations.

---

## Job Mini-Ledger Doctrine

Every Job acts as a mini-ledger.

Jobs own:

- Revenue
- Labor Costs
- Material Costs
- Equipment Costs
- Profitability
- Exposure
- Audit Trail

All financial reporting is job-centric.

---

## Accounting Sync Doctrine

Synchronization exports approved financial truth to downstream accounting systems.

The Ledger remains the source of operational truth.

Sync never creates or modifies financial records.

All sync actions are auditable.

Sync lifecycle:

- Pending → Syncing → Synced
- Pending → Syncing → Failed
- Failed → Retry Required → Syncing → Synced

---

## Accounting Settings Doctrine

Provider management lives in The Ledger, not in accounting systems.

The CEO controls:

- Which providers are enabled
- Which provider is the default
- Sync policies (automatic vs manual, retry behaviour)
- Entity mapping (which entities sync to which providers)

Settings never bypass approval workflows.

Provider connections are administered centrally from the Accounting Settings page.

---

## Reconciliation Doctrine

Reconciliation detects discrepancies between The Ledger and downstream accounting systems.

Reconciliation never modifies financial records.

The Ledger remains the source of operational truth.

All exceptions are traceable and actionable.

Reconciliation statuses:

- Matched — Ledger and accounting system agree
- Unmatched — Records exist in both but values differ
- Requires Review — Ambiguous discrepancy requiring manual inspection
- Missing in Ledger — Record exists in accounting but not in Ledger
- Missing in Accounting — Record exists in Ledger but not in accounting system

---

## Exception Resolution Doctrine

All financial exceptions are traceable to their source event.

No exception resolution bypasses the CEO audit trail.

All overrides require explicit approval.

Every resolution or rejection generates an immutable audit entry.

Exception statuses:

- Open — Detected, not yet assigned
- Under Investigation — Being reviewed by assigned user
- Awaiting Approval — Resolution prepared, pending CEO sign-off
- Resolved — CEO-approved resolution applied
- Rejected — Closed without resolution

---

## Financial Controls Doctrine

Financial Controls govern override requests that would alter approved financial records.

All controls require CEO approval.

No control is silent — every approval and rejection is audited.

Control lifecycle:

- Pending Approval → Approved
- Pending Approval → Rejected

---

## Automation Builder Doctrine

Builders NEVER create approved financial records.

Builders NEVER bypass approval workflows.

All create/update/archive operations generate audit entries.

Forbidden actions are blocked at save time.

FinanciallySensitive rules show an explicit warning.

Archive is soft-delete only — rules are never hard-deleted.

Rule lifecycle:

- Draft → Active
- Active → Disabled
- Active / Disabled → Archived

---

## Automation Governance Doctrine

Governance NEVER weakens existing safeguards.

CEO retains final authority over all automation governance decisions.

All governance actions generate immutable audit records.

No silent overrides. No silent approvals.

Job attribution preserved in all records.

Financially Sensitive automations always display safeguard indicators.

Compliance audit is read-only — no edit or delete operations permitted.

Governance statuses:

- Compliant — Passes all governance checks
- Requires Review — Flagged for CEO inspection
- Restricted — Operation limited by CEO
- Suspended — Fully halted by CEO

Risk levels:

- Low — Minimal financial or operational impact
- Medium — Moderate impact; monitored
- High — Significant risk; requires active oversight
- Critical — Immediate governance action required

---

## Automation Scheduler Doctrine

Schedulers may QUEUE actions.

Schedulers may TRIGGER evaluations.

Schedulers may NEVER:
- Approve expenses
- Approve timesheets
- Approve reports
- Create approved invoices
- Create approved financial records

Approval remains HUMAN-CONTROLLED.

Every scheduled execution generates an immutable audit record.

No silent executions. No silent failures.

Job attribution preserved in all execution records.

FinanciallySensitive schedules remain governed.

Accounting systems remain downstream consumers only.

Schedule status lifecycle:
- Active → Paused
- Paused → Active (Resume)
- Active / Paused → Disabled

Every pause, resume, and disable action generates an immutable audit entry.

---

## Notification Doctrine

Notifications are INFORMATIONAL only.

Notifications NEVER:
- Create financial mutations
- Approve submissions
- Bypass approval workflows
- Modify operational records

Notification interactions (Opened, Marked Read, Dismissed) generate immutable audit records.

No silent state changes.

RBAC:
- CEO: full notification visibility (all types, all jobs)
- PM: notifications scoped to assigned jobs only
- Worker: no access
- Client: no access

Notification status lifecycle:
- unread → read
- unread / read → dismissed

Deep links navigate to source pages only — they never execute actions.

---

# PRODUCT DEFINITION

## Executive Platform

The Ledger contains:

- Dashboard
- Job Intelligence
- Review Center
- Jobs
- Clients
- Workers
- Schedule
- Map
- Stock
- Assets
- Locations
- Alerts
- Invoices
- Financial Insights
- Roles & Permissions
- Audits
- Automations (Automation Centre + Scheduler)
- Automation Governance Centre
- Notification Centre
- Settings
- Accounting Settings
- Reconciliation Centre
- Exception Resolution Centre
- API Integrations

## Worker Application

Workers can:

- View assigned jobs
- View schedule
- Start shift timer
- End shift timer
- Submit reports
- Upload photos
- Log issues
- Submit expenses
- View previous submissions

Workers never have financial visibility.

## Client Portal

Clients can:

- View projects
- View assigned crews
- View documents
- View comments
- Submit requests
- View financial summaries
- View invoice status

Client access is provisioned from the main Ledger platform.

---

# CURRENT DEVELOPMENT MODEL

The current implementation is a high-fidelity frontend prototype.

Purpose:

- Workflow validation
- Financial logic validation
- UX validation
- Approval pipeline validation
- Integration architecture validation

Backend implementation is intentionally deferred.

Current architecture relies heavily on:

- mockData.ts
- Zustand state management
- Mock authentication
- Frontend-only persistence

---

# TECHNOLOGY STACK

## Frontend

- React
- TypeScript
- Vite
- TailwindCSS
- shadcn/ui
- Wouter
- Zustand
- TanStack Query
- React Hook Form
- Zod

## Development

- Git
- GitHub
- PyCharm
- Claude Desktop
- Filesystem MCP
- Playwright MCP

## Future Backend

- Express
- PostgreSQL
- Drizzle ORM

---

# ROLE MODEL

## CEO

- Full platform access

## Project Manager

- Access scoped to assigned jobs

## Worker

- Mobile-first workflow
- Reporting access only
- No financial visibility

## Client

- Read-only portal access

---

# REVIEW CENTER DOCTRINE

The Review Center is the core control system of The Ledger.

Submission Types:

- Timesheets
- Inventory Usage
- Equipment Usage
- Expenses
- Reports
- Uploads
- QA Records

Workflow:

Worker Submission
→ Review Center
→ Approve / Reject / Correct
→ Financial Normalization
→ Financial Explorer
→ Accounting Sync

Nothing bypasses Review Center.

---

# FINANCIAL NORMALIZATION ENGINE

Approved operational events become normalized financial records.

Normalization targets include:

- TimesheetEntry
- ExpenseEntry
- InventoryMutation
- EquipmentUsageRecord
- InvoiceLineItem
- FinancialMutation
- PayrollRecords
- RevenueEvents

Normalization is the bridge between operations and finance.

---

# CURRENT ROADMAP STATUS

## Phase 1 — Foundation & RBAC

Status: Complete

## Phase 2 — Worker Mobile Experience

Status: Complete

## Phase 3 — Review Centre

Status: Complete

## Phase 4 — Document Intelligence Foundation

Status: Complete

Includes:

- Upload Infrastructure
- Review Centre
- Processing Pipeline
- Revenue Normalisation
- Financial Mutation Infrastructure

## Phase 5.1 — Financial Foundation

Status: Complete

## Phase 5.2 — Financial Intelligence

Status: Complete

## Phase 5.3 — Invoice Generation Pipeline

Status: Complete

## Phase 5.4 — Payroll Export System

Status: Complete

Verified:

- Build PASS
- Playwright PASS
- 40/40 Tests PASS

## Phase 5.5 — Margin Intelligence & Forecasting

Status: Complete

Implemented:

- Forecast Engine
- Margin Intelligence Engine
- Risk Classification
- Exposure-Aware Forecasting
- Financial Explorer Forecasting Tab
- Portfolio Forecast KPIs
- Job Forecast Panel
- Margin Variance Analysis
- Financial Risk Status Badges

Verified:

- Build PASS
- Playwright PASS
- 52/52 Tests PASS

## Phase 5.6 — Accounting Synchronization Layer

Status: Complete

Merged: main

Merge Commit: 849e9e2

Implemented:

- Accounting Provider Abstraction (QuickBooks, Xero, FreshBooks, Zoho Books)
- Accounting Sync Engine (Pending, Syncing, Synced, Failed, Retry Required)
- Sync Log Engine
- Accounting Sync Tab in Financial Explorer (KPI strip, queue table, search, sort, filter)
- Job Sync Panel on Job Detail page (per-job sync status, external ref, history)
- Error Resolution Workflow (error details panel, resolution guidance, retry flow)
- Sync Audit Trail (immutable log of all sync actions)
- Provider Visibility (QuickBooks, Xero badges in queue and job panel)
- External Reference Tracking (accounting system IDs visible per record)

Verified:

- 13 Playwright doctrine tests added
- Build PASS
- Playwright PASS
- 65 / 65 Tests PASS
- Merged into main

## Phase 5.7 — Accounting Settings & Provider Management

Status: Complete

Branch: feature/phase-5-7-accounting-settings

Implemented:

- accountingSettingsEngine.ts: ProviderConfig, ProviderStatus, SyncPolicy, EntityMapping types + helpers
- accountingProviders.ts: Extended with description, website, ProviderStatus support
- pages/accounting-settings.tsx: Full 4-provider settings page (CEO only)
  - Provider cards (QuickBooks, Xero, FreshBooks, Zoho Books)
  - Status badges (Connected, Disconnected, Requires Reconnect, Disabled)
  - Default provider indicator and Set Default action
  - Connect / Disconnect / Disable / Enable actions (mock)
  - Entity support display and last sync per provider
- Sync Policy Centre: Automatic/Manual toggle, Retry Failed Syncs, Auto Retry Interval, Sync Notifications
- Entity Mapping Configuration: Customers, Jobs, Invoices, Payroll with status and provider compatibility
- Summary bar: active provider count, default provider name, sync mode
- Navigation: Accounting Settings added to CEO sidebar
- Route: /accounting-settings (CEO only); legacy /settings/integrations/accounting retained

Verified:

- Build PASS
- Playwright PASS
- 80 / 80 Tests PASS
- Merged into main

## Phase 5.8 — Reconciliation Centre

Status: Complete

Branch: feature/phase-5-8-reconciliation-center

Implemented:

- reconciliationEngine.ts: ReconciliationRecord types, status labels/colours, SEED data, computeReconciliationSummary, searchReconciliationRecords
- syncOperationsEngine.ts: SyncHealth KPIs, FailureQueueEntry types, SEED data, mockRetryEntry, formatAvgDuration
- components/finance/ReconciliationTab.tsx: Reconciliation tab for Financial Explorer (status table, KPI strip, filters, search)
- components/finance/JobReconciliationPanel.tsx: Per-job reconciliation panel on Job Detail page
- pages/reconciliation-center.tsx: Full Reconciliation Centre page (CEO only)
  - KPI strip: Matched, Unmatched, Requires Review, Missing Records
  - Reconciliation Table: Entity, Type, Provider, Ledger Reference, Accounting Reference, Status, Last Checked
  - Filters: Status, Provider, Entity Type + Search
  - Sync Operations Dashboard: KPIs (Total Syncs, Success Rate, Failures, Retries), Failure Queue, Retry Actions
- Route: /reconciliation-center (CEO only) added to App.tsx
- Navigation: Reconciliation Centre added to CEO sidebar with GitMerge icon
- Financial Explorer: Reconciliation tab integrated
- Job Detail: JobReconciliationPanel integrated
- tests/doctrine/reconciliation-center.spec.ts: 16 doctrine tests

Verified:

- Build PASS
- Playwright PASS
- 96 / 96 Tests PASS
- Merged into main

## Phase 5.9 — Exception Resolution & Financial Controls

Status: Complete

Branch: feature/phase-5-9-exception-resolution

Implemented:

- lib/exceptionResolutionEngine.ts: ExceptionRecord types, SEED data (8 seed exceptions), status/type labels and colours, computeExceptionSummary, searchExceptions, filterExceptions*, resolveException, rejectException, getAssigneeNames
- lib/financialControlsEngine.ts: FinancialControl types, SEED data (4 seed controls), control state labels/colours, computeControlSummary, approveControl, rejectControl, fmt helper
- pages/exception-resolution-center.tsx: Full Exception Resolution Centre (CEO only)
  - KPI strip: Open, Investigating, Awaiting Approval, Resolved
  - Exception Queue: Exception ID, Type, Job/Client, Status, Assigned To, Created Date, View action
  - Search: job, client, exception ID
  - Filters: Status, Type, Assigned User
  - Exception detail/resolution dialog: Resolve + Reject with notes
  - Financial Controls tab: dashboard KPIs (Pending, Approved, Rejected, Financial Impact)
  - Override Queue: Control Type, Requested By, Approval Status, Financial Impact, Approve/Reject actions
  - Control approval dialog: notes required, audit entry generated
- components/finance/ExceptionsTab.tsx: Exceptions tab for Financial Explorer
- components/finance/JobExceptionPanel.tsx: Per-job exceptions panel on Job Detail page
- App.tsx: /exception-resolution-center route (CEO only)
- layout.tsx: CEO sidebar nav item
- financial-explorer.tsx: Exceptions tab wired (TabsTrigger + TabsContent)
- job-detail.tsx: JobExceptionPanel wired
- tests/doctrine/exception-resolution.spec.ts: 17 doctrine tests
- docs/LEDGER_CANONICAL_CONTEXT.md: v4.4, Phase 5.9 marked complete
- docs/handoffs/phase-5-9-handoff-2026-05-31.md: handoff document

Verified:

- Build PASS
- Playwright PASS
- 113 / 113 Tests PASS
- Merged into main

Post-Merge Stabilisation:

- Offline Review Sync pipeline hardened
- Direct review item persistence added
- Offline replay doctrine test stabilised
- Commit: a4526cb

## Phase 6.0A — Automation Core

Status: Complete

Branch: feature/phase-6-0a-automation-core

Implemented:

- automationEngine.ts
- automationRuleEngine.ts
- automationAuditEngine.ts
- Trigger Catalogue V1
- Action Catalogue V1
- Automation execution model
- Automation audit trail
- Financial safety controls
- Job attribution enforcement

Verified:

- Build PASS
- Playwright PASS
- 129 / 129 Tests PASS

## Phase 6.0B — Automation Centre UI

Status: Complete

Branch: feature/phase-6-0b-automation-centre

Implemented:

- pages/automations.tsx: Full Automation Centre replacing stub page (CEO only)
  - KPI strip: Total, Active, Disabled, Executions Today, Financially Sensitive
  - Tab 1 — Automation Rules: table with search/status/category filters, Rule Detail Dialog (trigger, conditions, actions, financial safeguard, enable/disable)
  - Tab 2 — Execution History: table with seed data, Execution Detail Dialog
  - Tab 3 — Automation Audit: immutable read-only table with search and result filter
  - FinanciallySensitive badge with tooltip on all category displays
  - CEO-only RBAC (PM and Worker denied)
- automationAuditEngine.ts: Added AUTOMATION_EXECUTION_RESULT_LABELS, AUTOMATION_EXECUTION_RESULT_COLORS, SEED_EXECUTION_HISTORY (5 seed entries)
- App.tsx: /automations route tightened to CEO only
- layout.tsx: Automations nav item tightened to CEO only
- tests/doctrine/automation-centre.spec.ts: 19 doctrine tests
- tests/doctrine/automation-core.spec.ts: 3 page-level tests updated for new UI

Verified:

- Build PASS
- Playwright PASS
- 148 / 148 Tests PASS

## Phase 6.0C — Automation Builder

Status: Complete

Branch: feature/phase-6-0c-automation-builder

Implemented:

- client/src/lib/automationBuilderEngine.ts: Full builder lifecycle engine
  - BuilderFormState, BuilderCondition, BuilderStep, BuilderValidationResult types
  - BUILDER_FORM_DEFAULTS, BUILDER_STEP_LABELS, CONDITION_OPERATOR_LABELS constants
  - validateBuilderForm: name, description, trigger, action, forbidden-action checks
  - formContainsForbiddenAction: forbidden action detection
  - createRuleFromBuilder: create + audit
  - updateRuleFromBuilder: update + audit
  - duplicateRule: copy to draft + audit
  - archiveRule: soft-delete + audit
  - getAllRules, getRuleById, ruleToBuilderForm helpers
  - Reuses FORBIDDEN_ACTION_NAMES, TRIGGER_CATALOGUE_V1, ACTION_CATALOGUE_V1 from automationEngine.ts
- client/src/pages/automations.tsx: Builder UI integrated
  - Create Automation button (CEO header, data-testid: aut-btn-create-automation)
  - AutomationBuilderDialog: 5-step guided builder
    - Step 1: Name, Description, Category, FinanciallySensitive warning
    - Step 2: Trigger selection from TRIGGER_CATALOGUE_V1
    - Step 3: Conditions builder (add/remove field+operator+value rows)
    - Step 4: Action selection from ACTION_CATALOGUE_V1 (multi-select)
    - Step 5: Review summary with financial safeguard notice
  - Edit mode: pre-populates via ruleToBuilderForm()
  - RuleDetailDialog extended: Edit, Duplicate, Archive action buttons
  - Toast notifications: Automation Created / Updated / Duplicated / Archived
- tests/doctrine/automation-builder.spec.ts: 25 doctrine tests (AB-01 to AB-25)
- docs/handoffs/phase-6-0c-handoff-2026-06-01.md: handoff document

Verified:

- Build PASS
- Playwright PASS
- 173 / 173 Tests PASS

## Phase 6.0D — Automation Governance & Financial Safety Controls

Status: Complete

Branch: feature/phase-6-0d-automation-governance

Merge Target: main

PR: https://github.com/pascalskan/The-Ledger/pull/12

Implemented:

- client/src/lib/automationGovernanceEngine.ts: Full governance engine
  - Types: AutomationRiskLevel, AutomationGovernanceStatus, AutomationGovernanceRecord, AutomationExceptionRecord, GovernanceAuditEntry
  - Seed: 6 governance records (3 compliant, 2 requires review, 1 restricted), 3 exceptions, 4 audit entries
  - Helpers: computeGovernanceSummary, filterGovernanceByStatus/Risk/Category, searchGovernanceRecords
  - CEO Actions: restrictAutomation, suspendAutomation, restoreAutomation, markCompliant
  - Exception workflow: resolveException, rejectException, escalateException
  - Audit: getGovernanceAuditLog, searchGovernanceAudit, filterAuditByRiskImpact
- client/src/pages/automation-governance.tsx: CEO-only Governance Centre
  - KPI strip (7 cards): Total, Compliant, Requires Review, Restricted, Suspended, High Risk, Critical Risk
  - Tab 1 Governance Dashboard: table, search, risk/status/category filters, View button
  - Detail dialog: risk assessment, safeguard evaluation, execution stats, CEO governance actions
  - Financial safety indicators: Governed badge, Approval Protected, Financial Safeguard Active
  - Tab 2 Exceptions: exception queue, detail dialog, Resolve/Reject/Escalate
  - Tab 3 Compliance Audit: immutable read-only table, search, risk impact filter
- App.tsx: /automation-governance route (CEO only)
- layout.tsx: Automation Governance nav item (ShieldCheck icon)
- tests/doctrine/automation-governance.spec.ts: 26 doctrine tests (AG-01 to AG-26)

New doctrine tests: 26

Verified:

- Build PASS
- Playwright PASS
- 199 / 199 Tests PASS

## Phase 6.0E — Automation Scheduler

Status: Complete

Branch: feature/phase-6-0e-automation-scheduler

PR: https://github.com/pascalskan/The-Ledger/pull/13

Merged: main @ 5b4ca9a

Implemented:

- client/src/lib/automationSchedulerEngine.ts: Full scheduler engine
  - Types: AutomationScheduleType (Hourly/Daily/Weekly/Monthly/Custom)
  - Types: AutomationScheduleStatus (Active/Paused/Disabled)
  - Types: AutomationSchedule, AutomationScheduleExecution, ScheduleAuditEntry, ScheduleConfig, ScheduleSummary
  - Functions: computeNextRun(), computeScheduleSummary(), computeScheduleSummaryKPIs()
  - Functions: pauseSchedule(), resumeSchedule(), disableSchedule() — all generate immutable audit entries
  - Functions: getAllSchedules(), getScheduleById(), getScheduleAuditLog(), getScheduleExecutions()
  - Functions: filterSchedulesByStatus(), filterSchedulesByType(), searchSchedules(), getUpcomingRuns()
  - Seed data: 6 schedules (4 Active, 1 Paused, 1 Disabled)
- client/src/lib/automationEngine.ts: Extended with schedule_trigger type
- client/src/pages/automations.tsx: Extended with Scheduler tab + Builder integration
- tests/doctrine/automation-scheduler.spec.ts: 27 doctrine tests (AS-01 to AS-27)

New doctrine tests: 27

Verified:

- Build PASS
- Playwright PASS
- 226 / 226 Tests PASS

## Phase 6.1 — Notification Centre

Status: Complete

Branch: feature/phase-6-1-notification-centre

PR: Pending — open after documentation commit

Implemented:

### Notification Engine

- client/src/lib/notificationEngine.ts: Full notification engine
  - Types: NotificationStatus (unread / read / dismissed)
  - Types: NotificationType (automation_alert / review_required / sync_failure / governance_action / financial_control / exception_event)
  - Types: NotificationPriority (low / medium / high / critical)
  - Type: Notification model (id, type, title, message, createdAt, status, priority, sourceId, sourceType, sourceRoute, assignedTo, jobId, actionRequired)
  - Seed: 15 realistic notifications sourced from Review Centre, Automation Centre, Scheduler, Governance, Reconciliation, Sync Failures, Financial Controls, Exception Resolution
  - Functions: getAllNotifications(), getNotificationById(), computeNotificationSummary()
  - Functions: searchNotifications(), filterNotificationsByStatus(), filterNotificationsByType(), filterNotificationsByPriority()
  - Functions: getUnreadCount(), markNotificationRead(), dismissNotification()
  - Audit: generateNotificationAuditEntry() — immutable records for Opened / Marked Read / Dismissed
  - Exports: NOTIFICATION_TYPE_LABELS, NOTIFICATION_TYPE_COLORS, NOTIFICATION_PRIORITY_LABELS, NOTIFICATION_PRIORITY_COLORS, NOTIFICATION_STATUS_LABELS

### Notification Centre Page

- client/src/pages/notification-center.tsx: Full Notification Centre (CEO + PM access)
  - KPI strip (5 cards): Total, Unread, Action Required, Critical, Dismissed
  - Main notification table: Type, Title, Priority, Created, Status, Assigned User, Action Required, Actions (View / Mark Read / Dismiss)
  - Filters: Status filter, Type filter, Priority filter
  - Search: title, message, source ID, job ID
  - Notification Detail Dialog: full notification info, source info, deep-link action button
  - PM scoping: PM users see only notifications assigned to them or matching their job scope
  - RBAC: CEO allowed, PM allowed (scoped), Worker denied, Client denied

### Header Notification Bell

- client/src/components/layout.tsx: NotificationBell component
  - Bell icon with unread count badge (red, capped at 9+)
  - Popover dropdown: latest 5 notifications (unread first)
  - Per-notification Mark Read action
  - View All button → navigates to /notifications
  - Visible on mobile top bar for CEO + PM
  - data-testids: notif-bell-btn, notif-bell-badge, notif-bell-dropdown, notif-bell-view-all

### Routing

- client/src/App.tsx: /notifications route (CEO + PM) — already wired

### Navigation

- client/src/components/layout.tsx: Notifications nav item (Bell icon) in CEO + PM sidebar

### Audit Integration

- Immutable audit entries generated for: Notification Opened, Notification Marked Read, Notification Dismissed
- Reuses existing audit pattern (generateNotificationAuditEntry)

### Deep Linking

- Every notification includes sourceRoute
- Detail dialog has View Source button navigating to originating route
- Routes covered: /review, /automations, /automation-governance, /financial-explorer, /reconciliation-center, /exception-resolution-center

### Testing

- tests/doctrine/notification-centre.spec.ts: 28 doctrine tests (NC-01 to NC-28)
  - Engine: summary calculations, filtering, search, unread counts, mark read, dismiss
  - Notification Centre page: rendering, KPI strip, filters, search, detail dialog, deep links
  - Header Bell: badge count, dropdown, view all
  - RBAC: CEO allowed, PM allowed, Worker denied

New doctrine tests: 28

Verification Target:

- Build PASS
- Playwright PASS
- 254 / 254 Tests PASS (226 existing + 28 new)

---

# NEXT TARGET

## Phase 6.2 — Dashboard Intelligence Layer

Recommended deliverables:

- Executive summary widget pulling live KPIs from existing engines
- Notification count widget on dashboard
- Outstanding action items widget (Review Centre pending, exceptions open, governance review required)
- Recent automation activity widget
- Financial health snapshot (reconciliation status, sync health, exception count)
- Doctrine tests: 15+ tests

---

# CLAUDE WORKFLOW DOCTRINE

Claude is used for implementation.

ChatGPT is used for:

- Architecture
- Roadmap management
- Planning
- Auditing
- Prompt generation

Claude is used for:

- Repository inspection
- Implementation
- Testing
- Playwright validation
- Git workflow
- PR creation

Every Claude session must be self-contained.

---

# IMPLEMENTATION RULES

Before implementation Claude must:

1. Read LEDGER_CANONICAL_CONTEXT.md
2. Read latest handoff
3. Run git status
4. Run git branch
5. Run git log --oneline -20

Produce:

- Current State
- Proposed Changes
- Implementation Plan

before coding.

---

# GIT RULES

Never commit directly to main.

Always:

- Create feature branch
- Implement
- Test
- Commit
- Push
- Open PR
- Stop

---

# CONTEXT SAFETY RULE

If context limits or execution limits are approaching:

- Commit work
- Push work
- Create handoff
- Stop

Never leave work stranded.

---

# CURRENT PRIMARY OBJECTIVE

Phase 6.1 is complete. Branch: feature/phase-6-1-notification-centre. PR pending merge.

Next Development Target:

Phase 6.2 — Dashboard Intelligence Layer

Phase 6 introduces controlled business automation and operational intelligence while preserving:
- Approval Doctrine
- Audit Doctrine
- Job Attribution Doctrine
- Financial Integrity Doctrine
- Notification Doctrine

---

# AI AUDIT RULES

Before making recommendations:

1. Read this file completely.
2. Treat this file as the canonical source of truth.
3. Verify repository state before roadmap recommendations.
4. Preserve approval doctrine.
5. Preserve job attribution.
6. Preserve auditability.
7. Preserve financial integrity.
8. Preserve accounting-system independence.
9. Preserve notification doctrine (informational only — never mutates financial records).

This document is the canonical source of truth for The Ledger.
