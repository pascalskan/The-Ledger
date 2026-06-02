# THE LEDGER

## Canonical Context Document

Version: 6.3
Status: Active Source of Truth
Last Updated: June 2026

Repository Baseline:
feature/phase-6-3-event-infrastructure @ 3581da9 (Phase 6.3 complete)

Verification Status:
Build PASS
Playwright 309 / 309 PASSING (post-6.3 target)

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

RBAC:
- CEO: full Event Monitor visibility
- PM: no access
- Worker: no access
- Client: no access

Event Bus Subscribers (Phase 6.3):
1. Activity Feed Subscriber — all events → activityFeedEngine
2. Notification Subscriber — warning/critical events → simulated notification creation
3. Dashboard Subscriber — all events → dashboard reads from getRecentBusEvents()
4. Automation Subscriber — targeted event types → read-only trigger evaluation only

Event categories: review_event, automation_event, governance_event, scheduler_event, notification_event, sync_event, reconciliation_event, exception_event, financial_control_event, job_event, worker_event, stock_event, asset_event

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

Verified: 309 / 309 Tests PASS (279 existing + 30 new)

Implemented:

### Event Bus Engine

- client/src/lib/eventBusEngine.ts: Unified event-driven operational pipeline
  - Types: BusEventCategory (13), BusEventPriority, BusEvent, BusEventRecord, BusAuditEntry, BusSubscriber, EventBusSummary
  - Seed: 20 realistic events covering all 13 event categories
  - Public API: publishEvent(), subscribe(), unsubscribe(), getEventHistory(), getRecentBusEvents(), getEventsByType(), getEventsByPriority(), searchBusEvents(), getSubscribers(), computeEventBusSummary(), getBusAuditLog(), recordEventMonitorViewed()
  - 4 subscribers: Activity Feed, Notification, Dashboard, Automation
  - Full audit trail: published / consumed / subscriber_triggered / viewed entries
  - Doctrine-safe: informational and evaluative only, no financial mutations

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

---

# NEXT TARGET

## Phase 6.4 — Dashboard Intelligence Layer

Objective: Transform the existing dashboard from a static layout into a live operational intelligence hub that surfaces actionable cross-module KPIs for the CEO.

Deliverables:

- Executive Summary widget: live counts from Review Centre (pending), Exception Resolution (open), Automation Governance (requires review), Reconciliation (unmatched)
- Financial Health Snapshot widget: sync health status, reconciliation match rate, open exception count, pending financial controls
- Outstanding Actions widget: aggregated action-required items across Review Centre, Exceptions, Governance, Notifications, Activity Feed
- Recent Automation Activity widget: last 5 automation executions with status badges
- Doctrine tests: 15+ tests covering widget rendering, KPI accuracy against seed data, and RBAC

Doctrine constraints:

- Dashboard widgets are READ-ONLY — no mutations, no approvals, no financial changes
- All KPI values derived from existing engine seed data — no new seed data required
- Widgets deep-link to source pages only — no inline actions
- CEO only (no PM, no Worker, no Client)

Branch naming: feature/phase-6-4-dashboard-intelligence

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

Phase 6.3 is complete and verified at 309/309. Branch: feature/phase-6-3-event-infrastructure.

Next Development Target:

Phase 6.4 — Dashboard Intelligence Layer

Phase 6 introduces controlled business automation and operational intelligence while preserving:
- Approval Doctrine
- Audit Doctrine
- Job Attribution Doctrine
- Financial Integrity Doctrine
- Notification Doctrine
- Activity Feed Doctrine
- Event Bus Doctrine

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

This document is the canonical source of truth for The Ledger.
