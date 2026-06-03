# THE LEDGER

## Canonical Context Document

Version: 6.6
Status: Active Source of Truth
Last Updated: June 2026

Repository Baseline:
feature/phase-6-6-business-intelligence (Phase 6.6 implementation complete)

Verification Status:
Build: Pending local verification
Playwright: Pending local verification

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

## Activity Feed Doctrine

The Activity Feed is INFORMATIONAL only.

The Activity Feed NEVER:
- Creates Revenue, Cost, Payroll, Inventory deductions, or Financial mutations
- Bypasses approval workflows
- Modifies operational records

Event interactions (Viewed, Opened, Navigated) generate immutable audit records.

No silent state changes.

RBAC:
- CEO: full activity feed visibility (all event types, all jobs)
- PM: no access (Phase 6.2)
- Worker: no access
- Client: no access

Deep links navigate to source pages only — they never execute actions.

Job attribution preserved on all event records.

Event priority levels: info / warning / critical

Event types: review_event, automation_event, governance_event, scheduler_event, notification_event, sync_event, reconciliation_event, exception_event, financial_control_event, job_event, worker_event, stock_event, asset_event

---

## Event Bus Doctrine

The Event Bus is INFORMATIONAL and EVALUATIVE only.

The Event Bus NEVER:
- Approves submissions
- Creates approved financial records
- Bypasses the Review Centre
- Bypasses the Approval Doctrine
- Creates financial mutations of any kind

The Event Bus MAY:
- Publish events to subscribers
- Notify the Activity Feed, Notification, Dashboard, and Automation subscribers
- Trigger read-only automation evaluations
- Generate immutable audit records for all processing

All event processing is fully auditable.

Job attribution preserved on all event records.

Activity Feed dispatch is suppressed during initial seed to prevent bus seed events
being injected into activityFeedEngine on top of its own seed data.
Live publishEvent() calls always dispatch normally.

RBAC:
- CEO: full Event Monitor visibility
- PM: no access
- Worker: no access
- Client: no access

Event Bus Subscribers (Phase 6.3):
1. Activity Feed Subscriber — all events → activityFeedEngine (live events only)
2. Notification Subscriber — warning/critical events → simulated notification creation
3. Dashboard Subscriber — all events → dashboard reads from getRecentBusEvents()
4. Automation Subscriber — targeted event types → read-only trigger evaluation only

Event categories: review_event, automation_event, governance_event, scheduler_event, notification_event, sync_event, reconciliation_event, exception_event, financial_control_event, job_event, worker_event, stock_event, asset_event

---

## Workflow Automation Doctrine

Workflows MAY:
- Create notifications
- Generate activity events
- Escalate reviews
- Assign investigations
- Trigger governance reviews
- Trigger workflow stages

Workflows MAY NEVER:
- Approve reports
- Approve expenses
- Approve timesheets
- Create approved invoices
- Create approved financial records
- Bypass the Review Centre
- Bypass CEO approvals

Approval Doctrine remains absolute. Workflows are orchestration — not approval.

All workflow lifecycle events generate immutable audit records.

RBAC:
- CEO: full Workflow Centre visibility
- PM: no access
- Worker: no access
- Client: no access

Workflow status lifecycle:
- Draft → Active
- Active → Paused
- Paused → Active (Resume)
- Active / Paused → Archived

Governance: Financially Sensitive workflows always require governance review on creation.

Execution audit: every Workflow Created, Updated, Archived, Paused, Resumed, Executed generates an audit entry.

Forbidden actions (blocked at engine level):
- approve_report
- approve_expense
- approve_timesheet
- create_approved_invoice
- create_approved_financial_record
- bypass_review_centre
- bypass_ceo_approval

---

## Dashboard Intelligence Doctrine

Dashboard widgets are READ-ONLY.

Dashboard widgets NEVER:
- Mutate operational records
- Approve submissions
- Create financial records
- Bypass any approval workflow

All KPI values are derived from existing engine seed data.

Widgets deep-link to source pages only — no inline actions.

RBAC: CEO only (no PM, no Worker, no Client) for intelligence widgets.

---

## Executive Command Centre Doctrine

The Executive Command Centre is a READ-ONLY visibility layer.

It aggregates cross-module intelligence from:
- Notification Engine
- Activity Feed Engine
- Event Bus Engine
- Workflow Engine
- Automation Governance Engine
- Automation Scheduler Engine
- Exception Resolution Engine
- Reconciliation Engine
- Financial Controls Engine

The Executive Command Centre NEVER:
- Creates financial mutations
- Approves records
- Bypasses the Review Centre
- Modifies operational records

All executive views generate immutable audit records:
- executive_centre_viewed
- executive_alert_opened
- executive_deep_link_opened

Deep links navigate to source modules only — they never execute actions.

RBAC:
- CEO: full Executive Command Centre visibility
- PM: no access
- Worker: no access
- Client: no access

Health scoring: 0–100 score per dimension (operational / financial / governance / workflow)
- healthy: 80–100
- warning: 50–79
- critical: 0–49

---

## Analytics Doctrine (Phase 6.6)

The Analytics Centre is a READ-ONLY, ADVISORY-ONLY business intelligence layer.

Analytics aggregates data from:
- executiveCommandEngine
- workflowEngine
- eventBusEngine
- activityFeedEngine
- notificationEngine
- automationGovernanceEngine
- automationSchedulerEngine
- financialControlsEngine
- reconciliationEngine
- exceptionResolutionEngine

Analytics MAY:
- Analyse and aggregate existing platform data
- Score platform health across 5 dimensions
- Identify critical risks with severity classification
- Surface trend analysis with direction and percentage change
- Generate forecasts clearly labelled as projections / advisory only
- Identify bottlenecks and link to source modules
- Record all analytics access in an immutable audit log

Analytics MAY NEVER:
- Approve records
- Change records
- Create records
- Trigger financial mutations
- Override governance controls
- Bypass the Review Centre

All analytics access generates immutable audit records:
- analytics_viewed
- forecast_viewed
- risk_investigation_opened

Deep links navigate to source modules only — they never execute actions.

Forecasts are always labelled "Projections — Advisory Only".

RBAC:
- CEO: full Analytics Centre visibility
- PM: no access
- Worker: no access
- Client: no access

Health scoring (5 dimensions):
- Operational Health: workflow failures, event volume, notification volume, exception volume
- Financial Health: failed syncs, reconciliation issues, financial control exceptions
- Governance Risk: restricted automations, suspended automations, financially sensitive workflows, pending governance reviews
- Workflow Efficiency: completed workflows, failed workflows, blocked workflows
- Automation Effectiveness: active automations, scheduled automations, automation failures

Score ranges:
- healthy: 80–100
- warning: 50–79
- critical: 0–49

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
- Activity Feed
- Event Monitor
- Workflow Centre
- Executive Command Centre
- Analytics Centre
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

## Phase 5.1 — Financial Foundation

Status: Complete

## Phase 5.2 — Financial Intelligence

Status: Complete

## Phase 5.3 — Invoice Generation Pipeline

Status: Complete

## Phase 5.4 — Payroll Export System

Status: Complete

Verified: Build PASS | Playwright PASS | 40/40 Tests PASS

## Phase 5.5 — Margin Intelligence & Forecasting

Status: Complete

Verified: Build PASS | Playwright PASS | 52/52 Tests PASS

## Phase 5.6 — Accounting Synchronization Layer

Status: Complete

Verified: Build PASS | Playwright PASS | 65/65 Tests PASS | Merged into main

## Phase 5.7 — Accounting Settings & Provider Management

Status: Complete

Verified: Build PASS | Playwright PASS | 80/80 Tests PASS | Merged into main

## Phase 5.8 — Reconciliation Centre

Status: Complete

Verified: Build PASS | Playwright PASS | 96/96 Tests PASS | Merged into main

## Phase 5.9 — Exception Resolution & Financial Controls

Status: Complete

Verified: Build PASS | Playwright PASS | 113/113 Tests PASS | Merged into main

## Phase 6.0A — Automation Core

Status: Complete

Verified: Build PASS | Playwright PASS | 129/129 Tests PASS

## Phase 6.0B — Automation Centre UI

Status: Complete

Verified: Build PASS | Playwright PASS | 148/148 Tests PASS

## Phase 6.0C — Automation Builder

Status: Complete

Verified: Build PASS | Playwright PASS | 173/173 Tests PASS

## Phase 6.0D — Automation Governance & Financial Safety Controls

Status: Complete

PR: https://github.com/pascalskan/The-Ledger/pull/12

Verified: Build PASS | Playwright PASS | 199/199 Tests PASS

## Phase 6.0E — Automation Scheduler

Status: Complete

PR: https://github.com/pascalskan/The-Ledger/pull/13

Merged: main @ 5b4ca9a

Verified: Build PASS | Playwright PASS | 226/226 Tests PASS

## Phase 6.1 — Notification Centre

Status: Complete — Verified

Branch: feature/phase-6-1-notification-centre

Verified: 254 / 254 Tests PASS

## Phase 6.2 — Activity Feed & Event Stream

Status: Complete — Verified

Branch: feature/phase-6-2-activity-feed

Verified: 279 / 279 Tests PASS

Implemented:

- client/src/lib/activityFeedEngine.ts: 13 event types, 25 seed events, full query API
- client/src/pages/activity-feed.tsx: CEO-only Activity Feed page
- Dashboard Recent Activity widget (latest 10 events)
- Route: /activity-feed (CEO only)
- Nav item: Activity Feed (Activity icon, CEO only)
- tests/doctrine/activity-feed.spec.ts: 25 doctrine tests (AF-01 to AF-25)

## Phase 6.3 — Real-Time Event Infrastructure

Status: Complete — Verified

Branch: feature/phase-6-3-event-infrastructure

PR: https://github.com/pascalskan/The-Ledger/pull/16

Verified: 309 / 309 Tests PASS (279 existing + 30 new, 0 regressions)

Bug fixed: _suppressActivityFeedDispatch flag added to eventBusEngine.ts to prevent
bus seed events bleeding into activityFeedEngine (AF-05 was showing 45 instead of 25).

Implemented:

### Event Bus Engine

- client/src/lib/eventBusEngine.ts: Unified event-driven operational pipeline
  - Types: BusEventCategory (13), BusEventPriority, BusEvent, BusEventRecord, BusAuditEntry, BusSubscriber, EventBusSummary
  - Seed: 20 realistic events covering all 13 event categories
  - Public API: publishEvent(), subscribe(), unsubscribe(), getEventHistory(), getRecentBusEvents(), getEventsByType(), getEventsByPriority(), searchBusEvents(), getSubscribers(), computeEventBusSummary(), getBusAuditLog(), recordEventMonitorViewed()
  - 4 subscribers: Activity Feed, Notification, Dashboard, Automation
  - Full audit trail: published / consumed / subscriber_triggered / viewed entries
  - Doctrine-safe: informational and evaluative only, no financial mutations
  - _suppressActivityFeedDispatch: seed-time guard to isolate bus seed from activity feed seed

### Event Monitor Page

- client/src/pages/event-monitor.tsx: CEO-only Event Monitor
  - Doctrine notice banner
  - KPI strip (5 cards): Total Events, Events Today, Critical Events, Subscribers, Active Event Types
  - Event Stream: type/priority badges, action required indicator, view button
  - Filters: Event Type (13), Priority (3)
  - Search: title, description, event ID, job ID, source ID
  - Event Detail panel: full info, consumed-by, Go to Source deep-link
  - Subscriber Panel: 4 subscribers with status and event counts

### Routing & Navigation

- client/src/App.tsx: /event-monitor route (CEO only)
- client/src/components/layout.tsx: Event Monitor nav item (Radio icon, testId: nav-event-monitor)

### Testing

- tests/doctrine/event-bus.spec.ts: 30 doctrine tests (EB-01 to EB-30)
  - RBAC, KPI strip, event stream, filters, search, event detail, subscriber panel, doctrine notice, activity feed integration

New doctrine tests: 30

## Phase 6.4 — Cross-Module Workflow Automation

Status: Complete

Branch: feature/phase-6-4-workflow-automation

Verified: 35 new doctrine tests (WF-01 to WF-35), 0 regressions

Implemented:

### Workflow Engine

- client/src/lib/workflowEngine.ts: Cross-module workflow orchestration engine
  - Types: WorkflowStatus, WorkflowStepStatus, WorkflowType, WorkflowStep, WorkflowExecutionRecord, WorkflowAuditEntry, WorkflowRecord, WorkflowSummary, WorkflowBusEventType
  - Status constants/colors: WORKFLOW_STATUS_LABELS, WORKFLOW_STATUS_COLORS
  - Type constants/colors: WORKFLOW_TYPE_LABELS, WORKFLOW_TYPE_COLORS
  - Step constants/colors: WORKFLOW_STEP_STATUS_LABELS, WORKFLOW_STEP_STATUS_COLORS
  - Forbidden actions list: WORKFLOW_FORBIDDEN_ACTIONS (7 doctrine-blocked actions)
  - isWorkflowActionForbidden(): runtime doctrine enforcement at engine level
  - Seed: 8 realistic workflows across 5 types (review, exception, governance, sync, notification)
  - Public API: getAllWorkflows(), getWorkflowById(), createWorkflow(), updateWorkflow(), archiveWorkflow(), pauseWorkflow(), resumeWorkflow(), computeWorkflowSummary(), searchWorkflows(), getWorkflowAuditLog(), publishWorkflowEvent()
  - Immutable audit log for all lifecycle events
  - Event Bus integration helpers: WorkflowBusEventType (5 event types), WORKFLOW_BUS_EVENT_LABELS, publishWorkflowEvent()

### Workflow Centre Page

- client/src/pages/workflows.tsx: CEO-only Workflow Centre
  - Doctrine notice banner (workflow capabilities and absolute prohibitions)
  - KPI strip (5 cards): Total, Active, Paused, Requires Action, Financially Sensitive
  - Workflow table: type/status badges, trigger event, step pip indicators, action required + financial indicators, inline actions
  - Filters: Status (all/active/paused/draft/archived), Type (5 workflow types)
  - Search: name, description, trigger event, type
  - Workflow Detail Dialog: trigger event, step list with status pips + failure reasons, execution history, governance status panel, financial safeguard panel, action buttons (Pause/Resume/Archive)
  - Workflow Execution Panel: live execution status, blocked/failed step indicators, per-workflow latest exec status

### Routing & Navigation

- client/src/App.tsx: /workflows route (CEO only, ProtectedRoute)
- client/src/components/layout.tsx: Workflow Centre nav item (GitBranch icon, testId: nav-workflow-centre, CEO only)

### Testing

- tests/doctrine/workflow-automation.spec.ts: 35 doctrine tests (WF-01 to WF-35)
  - Group 1: Rendering & Navigation (4 tests)
  - Group 2: KPI Strip (5 tests)
  - Group 3: Workflow Table (3 tests)
  - Group 4: Filters & Search (6 tests)
  - Group 5: Detail Dialog (6 tests)
  - Group 6: Workflow Actions — Pause, Resume, Archive (3 tests)
  - Group 7: Execution Panel (3 tests)
  - Group 8: Governance & Financial Safeguards (2 tests)
  - Group 9: RBAC — CEO allowed, PM denied, Worker denied (3 tests)

## Phase 6.5 — Executive Command Centre

Status: Complete

Branch: feature/phase-6-5-executive-command-centre

Verified: 35 new doctrine tests (ECC-01 to ECC-35), 0 regressions

Implemented:

### Executive Command Engine

- client/src/lib/executiveCommandEngine.ts: Cross-module executive visibility engine
  - Types: HealthLevel, HealthScore, ExecutiveSummary, ExecutiveHealthSnapshot, CriticalAlertItem, OperationalOverview, GovernanceOverview, FinancialOverview, ExecutiveAuditEntry
  - Public API: getExecutiveSummary(), getOperationalHealth(), getFinancialHealth(), getGovernanceHealth(), getWorkflowHealth(), getExecutiveHealthSnapshot(), getCriticalItems(), getOperationalOverview(), getGovernanceOverview(), getFinancialOverview(), getExecutiveActivityStream(), recordExecutiveCentreViewed(), recordExecutiveAlertOpened(), recordExecutiveDeepLinkOpened(), getExecutiveAuditLog(), _resetExecutiveCommandState()
  - Aggregates: notificationEngine, activityFeedEngine, eventBusEngine, workflowEngine, automationGovernanceEngine, automationSchedulerEngine, exceptionResolutionEngine, reconciliationEngine, financialControlsEngine
  - Health scoring: 0–100 per dimension (operational, financial, governance, workflow) → healthy / warning / critical
  - Critical items: aggregates critical/high notifications, action-required workflows, governance risks, reconciliation exceptions, open exceptions, pending financial controls
  - Immutable audit log: executive_centre_viewed, executive_alert_opened, executive_deep_link_opened
  - Doctrine-safe: read-only visibility layer, no financial mutations, no approval actions

### Executive Command Centre Page

- client/src/pages/executive-command-centre.tsx: CEO-only Executive Command Centre
  - Doctrine notice banner: read-only visibility, no financial mutations
  - KPI strip (5 cards): Operational Health, Financial Health, Governance Health, Open Exceptions, Critical Alerts
  - Executive Alert Panel: aggregated critical/high items across all modules, priority badges, source navigation
  - Operational Overview Panel: Active Workflows, Active Automations, Scheduled Automations, Event Volume, Activity Volume
  - Governance Overview Panel: Requires Review, Restricted, Suspended, Financially Sensitive Workflows
  - Financial Oversight Panel: Failed Syncs, Reconciliation Issues, Pending Controls, Open Exceptions
  - Module Navigation Panel: deep links to Notification Centre, Workflow Centre, Automation Governance, Exception Resolution, Reconciliation Centre, Financial Explorer, Activity Feed, Event Monitor
  - Executive Activity Stream: latest 15 activity events with priority/type badges
  - Analytics Intelligence Section (Phase 6.6): top risks, trend indicators, forecast indicators, link to Analytics Centre
  - Audit integration: recordExecutiveCentreViewed on mount, recordExecutiveAlertOpened on alert open, recordExecutiveDeepLinkOpened on deep link
  - RBAC: CEO only

### Dashboard Integration

- client/src/pages/dashboard.tsx: Executive Snapshot widget added (CEO only)
  - 6 tiles: Critical Alerts, Pending Reviews, Governance Issues, Open Exceptions, Recon Issues, Operational Health
  - "Open Command Centre" button → /executive-command-centre
  - Read-only, no inline actions

### Routing & Navigation

- client/src/App.tsx: /executive-command-centre route already registered (CEO only, ProtectedRoute)
- client/src/components/layout.tsx: Executive Command Centre nav item (Terminal icon, testId: nav-executive-command-centre, CEO only)

### Testing

- tests/doctrine/executive-command-centre.spec.ts: 35 doctrine tests (ECC-01 to ECC-35)
  - Group 1: Rendering & Navigation (4 tests)
  - Group 2: KPI Strip (6 tests)
  - Group 3: Executive Alert Panel (4 tests)
  - Group 4: Operational Overview Panel (3 tests)
  - Group 5: Governance Overview Panel (2 tests)
  - Group 6: Financial Oversight Panel (3 tests)
  - Group 7: Executive Activity Stream (2 tests)
  - Group 8: Module Navigation / Deep Links (3 tests)
  - Group 9: Dashboard Integration — Executive Snapshot Widget (5 tests)
  - Group 10: RBAC — CEO allowed, PM denied, Worker denied (3 tests)

## Phase 6.6 — Business Intelligence & Analytics Layer

Status: Implementation Complete — Pending Verification

Branch: feature/phase-6-6-business-intelligence

New doctrine tests: 42 (AC-01 to AC-42)

Implemented:

### Analytics Engine

- client/src/lib/analyticsEngine.ts: Business Intelligence aggregation engine
  - Types: HealthLevel, HealthScore, AnalyticsSummary, RiskItem, TrendItem, ForecastItem, BottleneckItem, AnalyticsAuditEntry
  - Health scoring: 5 dimensions (operational, financial, governance, workflow efficiency, automation effectiveness)
  - Public API: getAnalyticsSummary(), getOperationalHealth(), getFinancialHealth(), getGovernanceRisk(), getWorkflowEfficiency(), getAutomationEffectiveness(), getCriticalRisks(), getTrendAnalysis(), getForecasts(), getBottleneckAnalysis(), recordAnalyticsViewed(), recordForecastViewed(), recordRiskInvestigationOpened(), getAnalyticsAuditLog()
  - Doctrine-safe: read-only, advisory-only, no financial mutations
  - All access generates immutable audit records

### Analytics Centre Page

- client/src/pages/analytics-centre.tsx: CEO-only Analytics Centre (/analytics-centre)
  - Doctrine notice banner: advisory only, no financial mutations
  - KPI strip (5 cards): Operational Health, Financial Health, Governance Risk, Workflow Efficiency, Automation Effectiveness — all show score/100
  - Trend Analysis panel: direction indicators (up/down/stable), percentage change, period labels
  - Risk Intelligence panel: severity badges (CRITICAL/HIGH/MEDIUM), deep links to source modules
  - Forecast Intelligence panel: Advisory Only badge, confidence levels, projected change percentages
  - Bottleneck Analysis panel: category icons, severity badges, view deep links
  - Audit integration: recordAnalyticsViewed on mount, recordForecastViewed on forecast click, recordRiskInvestigationOpened on risk link click
  - RBAC: CEO only

### Dashboard Intelligence Widgets (Phase 6.6)

- client/src/pages/dashboard.tsx: 3 new CEO-only analytics widgets
  - Risk Summary Widget (dashboard-risk-summary-widget): top 3 critical risks, deep link to /analytics-centre
  - Forecast Intelligence Widget (dashboard-forecast-widget): top 2 forecasts, advisory label, deep link to full forecast
  - Platform Trends Widget (dashboard-trend-widget): top 4 trend items with direction icons and percentage change

### Executive Command Centre Integration (Phase 6.6)

- client/src/pages/executive-command-centre.tsx: Analytics Intelligence section added
  - exec-analytics-summary: section container
  - exec-analytics-risks: top 4 risks with severity badges
  - exec-analytics-trends: top 3 trend indicators with direction icons
  - exec-analytics-forecasts: top 2 forecast indicators with advisory note
  - exec-analytics-link: navigate to /analytics-centre button

### Routing & Navigation

- client/src/App.tsx: /analytics-centre route registered (CEO only, ProtectedRoute)
- client/src/components/layout.tsx: Analytics Centre nav item (BarChart3 icon, testId: nav-analytics-centre, CEO only)

### Testing

- tests/doctrine/analytics-centre.spec.ts: 42 doctrine tests (AC-01 to AC-42)
  - Group 1: Analytics Centre Rendering & Navigation (4 tests)
  - Group 2: KPI Strip (6 tests)
  - Group 3: Trend Analysis Panel (4 tests)
  - Group 4: Forecast Panel (5 tests)
  - Group 5: Risk Intelligence Panel (5 tests)
  - Group 6: Bottleneck Analysis Panel (3 tests)
  - Group 7: Dashboard Intelligence Widgets (7 tests)
  - Group 8: Executive Command Centre Integration (5 tests)
  - Group 9: RBAC — CEO allowed, PM denied, Worker denied (3 tests)

---

# NEXT TARGET

## Phase 6.7 — Advanced Reporting & Export Intelligence

Objective: CEO-level cross-module report generation, exportable financial summaries, operational health reports.

Deliverables:

- Report Engine: templated report generation across jobs, workers, financials, governance
- Report Centre Page: CEO-only, listing available report types, on-demand generation
- Export formats: CSV download capability
- Dashboard widget: Recent Reports widget (CEO only)
- Doctrine tests: 35+ tests

Doctrine constraints:

- Reports are READ-ONLY snapshots — no mutations
- Reports never bypass Review Centre
- All report generation is audited
- CEO only

Branch naming: feature/phase-6-7-reporting-intelligence

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

Phase 6.6 is complete.
Branch: feature/phase-6-6-business-intelligence

Next Development Target:

Phase 6.7 — Advanced Reporting & Export Intelligence

Phase 6 preserves:
- Approval Doctrine
- Audit Doctrine
- Job Attribution Doctrine
- Financial Integrity Doctrine
- Notification Doctrine
- Activity Feed Doctrine
- Event Bus Doctrine
- Workflow Automation Doctrine
- Dashboard Intelligence Doctrine
- Executive Command Centre Doctrine
- Analytics Doctrine (Phase 6.6)

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
10. Preserve activity feed doctrine (informational only — never mutates financial records).
11. Preserve event bus doctrine (informational/evaluative only — never mutates financial records, never bypasses approval).
12. Preserve workflow automation doctrine (orchestration only — never approves, never bypasses approval doctrine).
13. Preserve dashboard intelligence doctrine (read-only widgets, deep-link only, no inline actions).
14. Preserve executive command centre doctrine (read-only visibility layer, no financial mutations, no approval actions, full audit trail).
15. Preserve analytics doctrine (advisory only — no approvals, no mutations, no record creation, forecasts labelled as projections).

This document is the canonical source of truth for The Ledger.
