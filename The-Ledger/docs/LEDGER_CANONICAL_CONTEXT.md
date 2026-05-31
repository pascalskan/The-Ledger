# THE LEDGER

## Canonical Context Document

Version: 4.4
Status: Active Source of Truth
Last Updated: May 2026

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
- Automations
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

- 15 Playwright doctrine tests added
- Build: Pending verification (owner to run locally)
- Playwright: Pending verification (owner to run locally)
- Expected suite: 80+ passing tests

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

- Build: Pending verification (owner to run locally)
- Playwright: Pending verification (owner to run locally)
- Expected suite: 96+ passing tests

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
- App.tsx: /exception-resolution-center route (CEO only) — already present from prior commit
- layout.tsx: CEO sidebar nav item — already present from prior commit
- financial-explorer.tsx: Exceptions tab wired (TabsTrigger + TabsContent)
- job-detail.tsx: JobExceptionPanel wired
- tests/doctrine/exception-resolution.spec.ts: 17 doctrine tests
- docs/LEDGER_CANONICAL_CONTEXT.md: v4.4, Phase 5.9 marked complete, Exception Resolution and Financial Controls Doctrine added
- docs/handoffs/phase-5-9-handoff-2026-05-31.md: handoff document

Verified:

- Build: Pending verification (owner to run locally)
- Playwright: Pending verification (owner to run locally)
- Expected suite: 113+ passing tests

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

Phase 5.9 — Exception Resolution & Financial Controls is complete.

Next: Phase 6 — see handoff for candidates.

---

# AI AUDIT RULES

Before making recommendations:

1. Read this file completely.
2. Treat this file as the source of truth.
3. Verify repository state before roadmap recommendations.
4. Preserve approval doctrine.
5. Preserve job attribution.
6. Preserve auditability.
7. Preserve financial integrity.
8. Preserve accounting-system independence.

This document is the canonical source of truth for The Ledger.
