# THE LEDGER

## Canonical Context Document

Version: 7.0
Status: Active Source of Truth
Last Updated: June 4, 2026

Repository Baseline:
main (Phase 6.8 merged; Domain Definition Program complete)

Verification Status:
Build: PASS
Playwright: 501 / 501 Tests PASS

Current Stage:
Domain Definition Program — COMPLETE
Backend Architecture Specification — PENDING

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
- Reporting Engine (Phase 6.7)
- Export Engine (Phase 6.8)

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

## Reporting Doctrine (Phase 6.7)

The Reporting Centre is INFORMATIONAL only.

Reports MAY:
- Aggregate and summarise data across the platform
- Present KPI snapshots, risk summaries, forecast summaries, governance summaries
- Be exported as informational artifacts
- Deep-link to source modules for detail
- Record all report generation and access in an immutable audit log

Reports MAY NEVER:
- Approve records
- Modify records
- Create financial mutations
- Bypass governance controls
- Override the Review Centre

All report actions generate immutable audit entries:
- report_generated
- report_viewed
- report_archived

Report types: executive_summary, board_report, governance_report, financial_health_report, operations_report, monthly_kpi_report

Report status lifecycle:
- draft → generated
- generated → archived

RBAC:
- CEO: full Reporting Centre visibility
- PM: no access
- Worker: no access
- Client: no access

---

## Export & Distribution Doctrine (Phase 6.8)

Exports are INFORMATIONAL ARTIFACTS only.

Exports MAY:
- Be generated from existing reports (read-only derivatives)
- Be downloaded as simulated PDF artifacts
- Be distributed to recipients via email, portal, or download
- Be archived
- Record all export and distribution actions in an immutable audit log

Exports MAY NEVER:
- Modify the source report
- Approve records
- Create financial mutations
- Bypass governance controls
- Override the Review Centre

All export actions generate immutable audit entries:
- export_generated
- export_downloaded
- export_archived
- distribution_created
- distribution_delivered

Export types: pdf, board_pack, executive_summary, governance, financial

Export status lifecycle:
- generated → downloaded
- generated / downloaded → distributed
- generated / downloaded / distributed → archived

Distribution status lifecycle:
- pending → delivered
- pending → failed

Distribution methods: email, portal, download

Board Pack: aggregated export combining executive summary, KPI snapshot, risk summary, governance summary into a single artifact.

RBAC:
- CEO: full Export & Distribution visibility
- PM: no access
- Worker: no access
- Client: no access

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
- Reporting Centre (Phase 6.7 + 6.8)
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

Verified: Build PASS | Playwright PASS | 199/199 Tests PASS

## Phase 6.0E — Automation Scheduler

Status: Complete

Merged: main @ 5b4ca9a

Verified: Build PASS | Playwright PASS | 226/226 Tests PASS

## Phase 6.1 — Notification Centre

Status: Complete

Verified: Build PASS | Playwright PASS | 254/254 Tests PASS

## Phase 6.2 — Activity Feed & Event Stream

Status: Complete

Verified: Build PASS | Playwright PASS | 279/279 Tests PASS

## Phase 6.3 — Real-Time Event Infrastructure

Status: Complete

Verified: Build PASS | Playwright PASS | 309/309 Tests PASS

## Phase 6.4 — Cross-Module Workflow Automation

Status: Complete

Verified: Build PASS | Playwright PASS | 344/344 Tests PASS

## Phase 6.5 — Executive Command Centre

Status: Complete

Verified: Build PASS | Playwright PASS | 379/379 Tests PASS

## Phase 6.6 — Business Intelligence & Analytics Layer

Status: Complete

Verified: Build PASS | Playwright PASS | 421/421 Tests PASS

## Phase 6.7 — Executive Reporting Centre

Status: Complete

Branch: feature/phase-6-7-reporting-centre

Verified: Build PASS | Playwright PASS | 461/461 Tests PASS

Implemented:

- client/src/lib/reportingEngine.ts: 6 report types, 8 seed reports (rpt-001–rpt-008), full generation and audit API
- client/src/pages/reporting-centre.tsx: CEO-only Reporting Centre page (/reporting-centre)
  - Doctrine notice, KPI strip (5 cards), reports table with filter, Report Detail Dialog, Report Builder Dialog
  - Deep links to source modules from report sections
- Dashboard: Executive Reports Widget (dashboard-executive-reports-widget)
- ECC: Reporting Snapshot section (exec-reporting-snapshot, exec-reporting-link)
- Route: /reporting-centre (CEO only)
- Nav: Reporting Centre (BookOpen icon, CEO only)
- tests/doctrine/reporting-centre.spec.ts: 40 doctrine tests (RC-01 to RC-40)

New doctrine tests: 40

## Phase 6.8 — Report Exports & Distribution Centre

Status: Complete

Branch: phase-6.8-report-exports

Verified: Build PASS | Playwright PASS | 501/501 Tests PASS

Implemented:

- client/src/lib/exportEngine.ts: Export & Distribution engine
  - Types: ExportType, ExportStatus, DistributionMethod, DistributionStatus, ReportExport, ReportDistribution, ExportAuditEntry, ExportSummary, DistributionSummary
  - Seed: 6 exports (exp-001–exp-006), 6 distributions (dist-001–dist-006), audit log
  - Public API: getAllExports(), getExportById(), computeExportSummary(), getAllDistributions(), computeDistributionSummary(), generateExport(), generateBoardPack(), downloadExport(), archiveExport(), createDistribution(), getExportAuditLog()
  - Doctrine-safe: exports are read-only derivatives, never modify source reports
- client/src/pages/reporting-centre.tsx: Extended with Exports and Distribution tabs
  - Tab bar: Reports | Exports | Distribution
  - Exports tab: KPI strip (5 cards), exports table with View/Download/Archive, export status filter, Export Detail Dialog with doctrine notice and audit reference, Board Pack generator
  - Distribution tab: KPI strip (5 cards — total, delivered, pending, failed, delivery rate), distribution table
- client/src/pages/dashboard.tsx: Report Exports Widget added (dashboard-export-reports-widget)
  - Total exports, distributed, downloaded, pending distributions, delivery rate KPIs
  - Latest exports list, Open Reporting Centre button (dashboard-exports-open-btn)
- client/src/pages/executive-command-centre.tsx: Export Status Snapshot section added
  - ecc-export-status-snapshot: 5 KPI tiles (total, distributed, downloaded, pending dist., delivery rate)
  - ecc-exports-link: navigates to /reporting-centre
- tests/doctrine/report-exports.spec.ts: 40 doctrine tests (RX-01 to RX-40)
  - RBAC, Exports tab KPIs, exports table, export actions, Export Detail Dialog, Board Pack, Distribution tab, Dashboard widget, ECC snapshot, doctrine enforcement

New doctrine tests: 40
Total test count: 501

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

## Completed Milestones

### Frontend Prototype Phases 1–6.8

All phases 1 through 6.8 are complete and verified.
Playwright: 501 / 501 Tests PASS
Branch: main

### Architectural Audit

Status: Complete

The platform underwent a full architectural audit following Phase 6.8, covering:
- Product Vision
- User Experience
- Frontend Architecture
- Platform Completeness
- Backend Requirements
- Commercial Readiness

### Domain Definition Program

Status: COMPLETE
Date: June 4, 2026

Fourteen business domains have been fully defined and frozen.
All domain documents are authoritative and immutable.
Authoritative reference: docs/domain/DOMAIN_MODEL_SUMMARY.md

Frozen Domains:

| Domain | File |
|---|---|
| Expense | docs/domain/EXPENSE_DOMAIN.md |
| Rejection | docs/domain/REJECTION_DOMAIN.md |
| Timesheet | docs/domain/TIMESHEET_DOMAIN.md |
| Site | docs/domain/SITE_DOMAIN.md |
| Issue | docs/domain/ISSUE_DOMAIN.md |
| Financial Record Correction | docs/domain/FINANCIAL_RECORD_CORRECTION_DOMAIN.md |
| Job | docs/domain/JOB_DOMAIN.md |
| Report | docs/domain/REPORT_DOMAIN.md |
| Stock | docs/domain/STOCK_DOMAIN.md |
| Asset | docs/domain/ASSET_DOMAIN.md |
| Client Request | docs/domain/CLIENT_REQUEST_DOMAIN.md |
| Client Portal | docs/domain/CLIENT_PORTAL_DOMAIN.md |
| Scheduling | docs/domain/SCHEDULING_DOMAIN.md |
| Worker Classification | docs/domain/WORKER_CLASSIFICATION_DOMAIN.md |

## Architectural State

The Ledger now possesses:

- Frozen business domain model
- Frozen lifecycle definitions
- Frozen ownership definitions
- Frozen approval authority definitions
- Frozen rejection definitions
- Frozen financial mutation definitions

Backend implementation has not started.

Backend architecture specification has not started.

## Next Planned Phase

Backend Architecture Specification

Including:

- Domain Architecture
- Data Architecture
- Service Architecture
- Event Architecture
- Multi-Tenancy Architecture
- Authentication Architecture
- API Architecture

All frozen domain documents serve as the authoritative input to this phase.

## Doctrines Preserved Through All Phases

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
- Reporting Doctrine (Phase 6.7)
- Export & Distribution Doctrine (Phase 6.8)

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
16. Preserve reporting doctrine (informational only — reports never approve, modify, or create financial mutations).
17. Preserve export & distribution doctrine (exports are read-only derivatives of reports — never modify source reports, never create financial mutations).

18. Preserve financial intelligence doctrine (advisory analysis only — Financial Intelligence Context never creates, modifies, or approves financial records; all outputs are advisory projections).
19. Preserve AI advisory doctrine (AI systems never approve records, create approved financial records, override review decisions, or bypass the approval doctrine; AI outputs are advisory only).

This document is the canonical source of truth for The Ledger.

---

# BACKEND ARCHITECTURE PHASE

Version: 7.1
Date: June 4, 2026
Status: COMPLETE

The Backend Architecture Specification and Refinement phases are complete. All architecture documents are authoritative and stored in docs/backend/.

## Architecture Decision Summary

- **Deployment model:** Modular Monolith (single Express application, single PostgreSQL database)
- **Event strategy:** Hybrid Event Architecture (CRUD primary state + domain events via transactional outbox)
- **Layering:** Domain-Driven Design — 4 layers (API → Application → Domain → Infrastructure)
- **Multi-tenancy:** Row-level isolation with `company_id` on all records + PostgreSQL Row Level Security
- **Bounded contexts:** 11 contexts (up from 9 after refinement pass)
- **Database schemas:** 13 schemas
- **Authentication:** JWT (access + refresh) + separate portal JWT for Client Portal users
- **Service modules:** 11 modules mirroring bounded contexts

## Bounded Context Summary (v2.0)

| # | Context | Key Responsibility |
|---|---|---|
| 1 | Tenant | Company lifecycle, subscription, plan, configuration |
| 2 | Identity & Access | Users, authentication, RBAC |
| 3 | Operational Core | Jobs, Sites, Clients, Shifts, Workers |
| 4 | Submission & Review | Review Centre, all submissions, approval/rejection |
| 5 | Financial Normalization | Approved financial records, Job Mini-Ledger |
| 6 | Financial Intelligence | Margin analysis, forecasting, exposure, KPIs |
| 7 | Inventory & Asset | Stock, assets |
| 8 | Client Portal | Portal accounts, client requests |
| 9 | Accounting Integration | Sync, reconciliation, exceptions, controls |
| 10 | Intelligence & Automation | Automation, workflows, Notification Centre, activity feed |
| 11 | Reporting & Analytics | Reports, exports, operational analytics |

## Architecture Documents

All architecture documents located at: docs/backend/
Master summary: docs/backend/BACKEND_ARCHITECTURE_SUMMARY.md

## Current Platform State

Frontend Prototype: Complete through Phase 6.8 — Report Exports & Distribution Centre
Playwright Tests: 501 / 501 PASS
Architectural Audit: Complete
Domain Definition Program: Complete (14 frozen domains)
Backend Architecture Specification: Complete (13 documents, v1.0)
Backend Architecture Refinement: Complete (8 documents updated to v2.0)

## Next Development Target

Phase 6.1 — Notification Centre (backend implementation)

---

# UX REDESIGN PROGRAMME

Programme document: docs/ux/UX_REDESIGN_PROGRAMME.md (authoritative tracker)

## Phase Status

| Phase | Name | Status | Completed |
|---|---|---|---|
| UX-1 | Critical Credibility Fixes | COMPLETE | June 5, 2026 |
| UX-2 | Navigation Restructuring | COMPLETE | June 5, 2026 |
| UX-3 | Dashboard Redesign | COMPLETE | June 5, 2026 |
| UX-QW | Quick Wins (post-audit) | COMPLETE | June 5, 2026 |
| UX-4 | Finance Hub | COMPLETE | June 10, 2026 |
| UX-5 | Intelligence Hub | COMPLETE — merged to main | June 16, 2026 |
| UX-6 | Automation Hub | COMPLETE — merged to main (PR #25; UX-6.1–6.10) | June 20, 2026 |
| UX-7 | Review Centre Enhancement | IN PROGRESS (branch feature/ux7-review-centre-enhancement; UX-7.1 Executive Review Dashboard + UX-7.2 Intelligent Prioritisation complete) | June 20, 2026 |
| UX-8 | Operations Hub & Final Polish | Not started | — |

## UX-4 — Finance Hub (COMPLETE)

Status: COMPLETE — merged to main, June 10, 2026
Branch: feature/ux4-finance-hub
Specification: docs/specifications/UX-4-FINANCE-HUB-SPECIFICATION-v1.1.md

Delivered:

- Finance Hub Overview implemented (period KPIs, job profitability, invoice status, payroll status, accounting status)
- Records tab complete (Financial Explorer consolidated)
- Invoicing integrated (Invoices + Invoice Builder)
- Payroll integrated (Payroll Staging + Payroll Export)
- Accounting integrated (Accounting Settings + Reconciliation Centre + Exception Resolution)
- Legacy finance routes consolidated into the Finance Hub (`/finance`)
- Audit instrumentation complete
- RBAC complete (CEO-scoped financial access preserved; Workers retain no financial visibility)

UX-4 implementation finished successfully. All doctrines preserved — no approval, audit, job attribution, or financial integrity regressions.

## UX-5 — Intelligence Hub (COMPLETE — June 16, 2026)

Status: COMPLETE — build + full Playwright suite green; awaiting owner merge to main (do not merge without review)
Branch: feature/ux5-intelligence-hub
The Intelligence Hub (`/intelligence`) is now the consolidated executive intelligence experience — health, analytics, reports, exports, and activity behind a single CEO destination.
Specification: docs/specifications/UX-5-INTELLIGENCE-HUB-SPECIFICATION-v1.1.md (frozen)
Handoff: docs/handoffs/ux5-intelligence-hub-handoff.md

Delivered:

- `/intelligence` hub (CEO-only): Overview · Analytics · Reports · Exports (Exports/Distribution sub-tabs) · Activity
- Legacy redirects (ECC, Analytics Centre, Reporting Centre, Activity Feed; role-aware /notifications — PM page unchanged)
- `/event-monitor` retained as a hidden CEO-only route (no nav item, no redirect)
- Canonical priority mapping (critical→Critical, high→Warning, medium/low→Info), Show Event Detail toggle with ?detail=1 precedence, bus-af- Platform Event join
- Link sweep S-1…S-8; NC-25 companion fix (unique bell badge testIds)
- All doctrines preserved — read-only presentation consolidation; no approval, audit, job attribution, or financial integrity changes

## Test Baseline

After UX-5 (verified green by the repository owner, June 16, 2026): 512 total / 512 passed / **0 known failures** —
AF-08 retired with the legacy Activity Feed KPI strip (AF-04–AF-08 removed with the superseded page); NC-25 fixed by the UX-5 companion commit (unique mobile/desktop bell badge testIds). The known-failure ledger is empty.

Pre-UX-5 baseline (June 10, 2026): 501 total / 499 passed / 2 known failures (AF-08, NC-25).
