# THE LEDGER — BACKEND DOMAIN ARCHITECTURE

Version: 1.0
Status: AUTHORITATIVE
Date: June 4, 2026
Authority: Backend Architecture Definition Phase

---

## PURPOSE

This document defines the bounded contexts, context ownership, context boundaries, domain event boundaries, aggregate ownership, and source-of-truth ownership for The Ledger backend.

All decisions derive from the frozen domain model (docs/domain/) and the canonical platform doctrine (docs/ai-context/LEDGER_CANONICAL_CONTEXT.md).

---

## BOUNDED CONTEXTS

The Ledger backend is organised into nine bounded contexts. Each context owns its aggregates, enforces its invariants, and communicates with other contexts exclusively through domain events or well-defined API contracts.

---

### 1. Identity & Access Context

**Owns:**
- Company (Tenant)
- User (CEO, PM, Worker, Client Portal User)
- Role
- Permission
- Session / Refresh Token

**Responsibilities:**
- Authenticate all platform users
- Issue JWT access tokens and refresh tokens
- Resolve role and permission for every inbound request
- Enforce multi-tenant isolation at the context boundary

**Source of Truth for:** Who may act, and under what role

**Produces Events:**
- `UserCreated`
- `UserRoleChanged`
- `SessionStarted`
- `SessionRevoked`

**Consumes Events:** None (authoritative source)

**Isolated from:** Financial data, operational data, audit records

---

### 2. Operational Core Context

**Owns:**
- Job (aggregate root)
- Site
- Client
- Shift
- Worker Profile
- PM Profile
- Worker Assignment
- Scheduling Record

**Responsibilities:**
- Manage the Client → Site → Job hierarchy
- Control job lifecycle (draft → scheduled → active → pending_closure → closed / cancelled)
- Manage shift start/end lifecycle
- Enforce worker assignment and scheduling conflict detection
- Enforce: closed jobs accept no new submissions
- Enforce: job cannot close financially with pending submissions

**Source of Truth for:** Operational reality — what jobs exist, who is assigned, what sites exist, what clients exist

**Produces Events:**
- `JobCreated`, `JobActivated`, `JobClosed`, `JobCancelled`, `JobPendingClosure`
- `ShiftStarted`, `ShiftEnded`
- `WorkerAssignedToJob`, `WorkerRemovedFromJob`
- `SchedulingConflictDetected`, `SchedulingConflictOverridden`
- `SiteCreated`, `SiteStatusChanged`, `SiteArchived`
- `ClientCreated`

**Consumes Events:**
- `SubmissionApproved` (from Review Centre) — to check pending submission count before financial closure

---

### 3. Submission & Review Context

**Owns:**
- TimesheetSubmission
- ReportSubmission
- ExpenseSubmission
- IssueLog
- Rejection Record
- Resubmission Reference

**Responsibilities:**
- Accept all worker submissions (timesheet, report, expense, issue)
- Place submissions into pending_review state
- Route submissions to PM or CEO based on approval authority model
- Enforce rejection doctrine: mandatory reason, immutable after rejection, permanent retention
- Produce correction submission with `rejected_submission_ref`
- Enforce: automation may never approve
- Enforce: withdrawal only before reviewer opens

**Source of Truth for:** Pending operational events awaiting financial reality

**Produces Events:**
- `TimesheetSubmitted`, `TimesheetApproved`, `TimesheetRejected`, `TimesheetResubmitted`
- `ReportSubmitted`, `ReportApproved`, `ReportRejected`, `ReportResubmitted`
- `ExpenseSubmitted`, `ExpenseApproved`, `ExpenseRejected`, `ExpenseResubmitted`
- `IssueSubmitted`, `IssueAcknowledged`, `IssueInProgress`, `IssueResolved`, `IssueClosed`
- `SubmissionWithdrawn`

**Consumes Events:**
- `JobClosed` (from Operational Core) — to close correction windows

---

### 4. Financial Normalization Context

**Owns:**
- TimesheetEntry
- ExpenseEntry
- InventoryMutation
- EquipmentUsageRecord
- InvoiceLineItem
- FinancialMutation
- PayrollRecord
- Void Record
- Adjustment Record

**Responsibilities:**
- Transform approved operational events into normalized financial records
- Enforce: no financial record without approval reference (`approved_by`, `approved_at`)
- Enforce: financial records are immutable after creation (only `status` may change)
- Enforce: corrections are append-only (Void Record, Adjustment Record)
- Enforce: job attribution is mandatory on all records
- Enforce: unit cost and classification frozen at approval time
- Aggregate Job Mini-Ledger values (revenue, labour cost, material cost, equipment cost, margin)
- Manage invoice line item lifecycle

**Source of Truth for:** Financial reality — what has been approved and normalized

**Produces Events:**
- `TimesheetEntryCreated`
- `ExpenseEntryCreated`
- `InventoryMutationCreated`
- `EquipmentUsageRecorded`
- `InvoiceLineItemCreated`
- `FinancialMutationCreated`
- `VoidRecordCreated`
- `AdjustmentRecordCreated`
- `PayrollRecordContributed`

**Consumes Events:**
- `TimesheetApproved`, `ReportApproved`, `ExpenseApproved` (from Submission & Review)

---

### 5. Inventory & Asset Context

**Owns:**
- Stock Item (catalogue)
- Stock Location
- Stock Level
- Asset
- Asset Assignment

**Responsibilities:**
- Maintain stock catalogue (items, units, unit cost)
- Track stock levels per item per location via InventoryMutation
- Process stock replenishment, transfer, and write-off
- Maintain asset register (lifecycle: available → assigned → in_use → maintenance → retired)
- Enforce asset assignment exclusivity (one active job at a time)
- Enforce asset retirement as terminal

**Source of Truth for:** Physical resources — what stock exists, where it is, what assets exist, where they are assigned

**Produces Events:**
- `StockLevelUpdated`, `StockLowAlertTriggered`
- `StockReplenishmentRecorded`, `StockWriteOffApproved`
- `AssetCreated`, `AssetAssigned`, `AssetAssignmentEnded`, `AssetRetired`
- `AssetMaintenanceStarted`, `AssetMaintenanceCompleted`

**Consumes Events:**
- `InventoryMutationCreated` (from Financial Normalization) — to update stock levels
- `EquipmentUsageRecorded` (from Financial Normalization) — to update asset usage history

---

### 6. Client Portal Context

**Owns:**
- Client Portal Account
- Client Portal Session
- Document Share Record
- Client Request

**Responsibilities:**
- Provision and manage client portal accounts (CEO-only)
- Authenticate portal users (separate credential model)
- Enforce client data visibility rules: own sites and jobs only
- Process client request submissions and route to PM
- Enforce: access notes never visible to portal users
- Enforce: documents shared explicitly (no automatic exposure)
- Enforce: client requests never enter Review Centre

**Source of Truth for:** Client-facing access state and client-initiated requests

**Produces Events:**
- `ClientPortalProvisioned`, `ClientPortalDeactivated`
- `ClientPortalLogin`
- `ClientRequestSubmitted`, `ClientRequestAcknowledged`, `ClientRequestDeclined`
- `ClientRequestJobCreated`
- `DocumentSharedWithClient`

**Consumes Events:**
- `JobCreated`, `JobClosed` (from Operational Core) — to update portal visibility

---

### 7. Accounting Integration Context

**Owns:**
- Accounting Provider Configuration
- Sync Record
- Reconciliation Record
- Exception Record
- Financial Control Record
- Distribution Record

**Responsibilities:**
- Manage accounting provider connections (QuickBooks, Xero, FreshBooks, Zoho)
- Execute sync of approved financial records to downstream providers
- Enforce sync lifecycle: Pending → Syncing → Synced | Failed → Retry
- Run reconciliation against downstream provider data
- Surface exceptions with traceable source events
- Manage financial controls (CEO-approved overrides of approved records)
- Enforce: sync never creates or modifies financial records in The Ledger
- Enforce: accounting systems are downstream consumers only

**Source of Truth for:** Sync state — what has been exported to accounting systems

**Produces Events:**
- `AccountingSyncRequested`, `AccountingSyncSucceeded`, `AccountingSyncFailed`
- `ReconciliationRunCompleted`, `ReconciliationExceptionDetected`
- `ExceptionResolved`, `ExceptionRejected`
- `FinancialControlApproved`, `FinancialControlRejected`

**Consumes Events:**
- `TimesheetEntryCreated`, `ExpenseEntryCreated`, `InvoiceLineItemCreated`, `VoidRecordCreated`, `AdjustmentRecordCreated` (from Financial Normalization) — to queue sync

---

### 8. Intelligence & Automation Context

**Owns:**
- Automation Rule
- Automation Schedule
- Automation Governance Record
- Workflow Definition
- Workflow Execution Record
- Notification Record
- Activity Feed Event
- Event Bus Record

**Responsibilities:**
- Evaluate automation rules against platform events (read-only evaluation)
- Execute scheduled evaluations and queued actions (never approve, never create financial records)
- Enforce governance over automation rules (CEO-managed risk levels)
- Coordinate cross-module workflow orchestration (escalation, notification, assignment)
- Publish events to Activity Feed and Notification Centre
- Enforce all forbidden actions at engine level

**Source of Truth for:** Automation state and platform event history (informational)

**Produces Events:**
- `AutomationTriggered`, `AutomationExecutionAudited`
- `WorkflowStarted`, `WorkflowCompleted`, `WorkflowFailed`
- `NotificationCreated`, `NotificationRead`, `NotificationDismissed`
- `ActivityFeedEventPublished`

**Consumes Events:** All domain events from all contexts (for evaluation, notification routing, activity feed population)

---

### 9. Reporting & Analytics Context

**Owns:**
- Report Definition
- Generated Report
- Export Record
- Distribution Record
- Analytics Snapshot

**Responsibilities:**
- Generate executive, governance, financial, and operational reports
- Export reports as PDF/board-pack artifacts
- Distribute exports (email, portal, download)
- Produce analytics scores across 5 health dimensions
- Surface forecasts (labelled as advisory projections)
- Enforce: reports are read-only; exports are read-only derivatives
- Enforce: no report, export, or analytics action approves, modifies, or creates financial records

**Source of Truth for:** Report and export state (informational artifacts)

**Produces Events:**
- `ReportGenerated`, `ReportArchived`
- `ExportGenerated`, `ExportDownloaded`, `ExportArchived`
- `DistributionCreated`, `DistributionDelivered`, `DistributionFailed`

**Consumes Events:** All contexts (for aggregating KPIs and report data)

---

## CONTEXT MAP

```
Identity & Access Context
  ├── provides AuthN/AuthZ to all other contexts
  └── tenant context injected into every request

Operational Core Context
  ├── Client → Site → Job hierarchy (authoritative)
  ├── Shift lifecycle (owned here)
  └── publishes → Submission & Review, Financial Normalization, Intelligence & Automation

Submission & Review Context
  ├── all worker submissions live here (pre-approval)
  ├── receives from → Operational Core (job/shift context)
  └── publishes approved events → Financial Normalization

Financial Normalization Context
  ├── all financial records live here (post-approval)
  ├── receives from → Submission & Review (approval events)
  └── publishes to → Accounting Integration, Intelligence & Automation

Inventory & Asset Context
  ├── physical resources (stock, assets)
  ├── receives from → Financial Normalization (mutation events)
  └── publishes to → Intelligence & Automation (low stock alerts)

Client Portal Context
  ├── client-facing access layer
  ├── reads from → Operational Core (job/site data)
  └── publishes requests → Operational Core (client requests)

Accounting Integration Context
  ├── downstream sync layer
  ├── reads from → Financial Normalization (approved records)
  └── publishes sync/reconciliation events → Intelligence & Automation

Intelligence & Automation Context
  ├── consumes events from all contexts
  ├── never produces financial mutations
  └── publishes notifications, activity, workflow events

Reporting & Analytics Context
  ├── reads from all contexts (aggregate data)
  ├── never produces financial mutations
  └── produces informational report/export artifacts
```

---

## AGGREGATE OWNERSHIP

| Aggregate Root | Owning Context | Key Invariants Enforced |
|---|---|---|
| Company (Tenant) | Identity & Access | Tenant isolation |
| User | Identity & Access | Role assignment, RBAC |
| Job | Operational Core | Lifecycle, attribution, closure rules |
| Site | Operational Core | Client hierarchy, archive irreversibility |
| Client | Operational Core | Structural parent of Sites |
| Shift | Operational Core | Single active shift per worker |
| WorkerProfile | Operational Core | Classification owned here |
| TimesheetSubmission | Submission & Review | Rejection doctrine |
| ReportSubmission | Submission & Review | All-or-nothing approval |
| ExpenseSubmission | Submission & Review | Approval authority thresholds |
| IssueLog | Submission & Review | Operational communication only |
| TimesheetEntry | Financial Normalization | Immutability, approval reference |
| ExpenseEntry | Financial Normalization | Immutability, approval reference |
| InventoryMutation | Financial Normalization | Immutability, job attribution |
| EquipmentUsageRecord | Financial Normalization | Immutability, job attribution |
| VoidRecord | Financial Normalization | CEO-only, append-only |
| AdjustmentRecord | Financial Normalization | CEO-only, append-only |
| StockItem | Inventory & Asset | Catalogue master |
| StockLevel | Inventory & Asset | Per-item per-location |
| Asset | Inventory & Asset | Assignment exclusivity, retirement terminal |
| ClientPortalAccount | Client Portal | CEO-provisioned only |
| ClientRequest | Client Portal | Never enters Review Centre |
| AccountingProvider | Accounting Integration | Downstream only |
| SyncRecord | Accounting Integration | Sync lifecycle |
| AutomationRule | Intelligence & Automation | Forbidden actions blocked |
| Workflow | Intelligence & Automation | Approval doctrine preserved |
| GeneratedReport | Reporting & Analytics | Read-only artifact |

---

## SOURCE-OF-TRUTH OWNERSHIP

| Truth Domain | Owning Context |
|---|---|
| Who is authenticated and what role they hold | Identity & Access |
| What clients, sites, and jobs exist | Operational Core |
| What workers are assigned and scheduled | Operational Core |
| What submissions are pending review | Submission & Review |
| What has been financially approved and normalized | Financial Normalization |
| What stock exists and at what levels | Inventory & Asset |
| What assets exist and where they are assigned | Inventory & Asset |
| What has been exported to accounting systems | Accounting Integration |
| What reconciliation discrepancies exist | Accounting Integration |
| What automation rules and workflows are configured | Intelligence & Automation |
| What platform events have occurred | Intelligence & Automation |
| What reports and exports exist | Reporting & Analytics |

---

## DOMAIN DEPENDENCY DIRECTION

```
Reporting & Analytics
  └── reads from all (no writes to operational contexts)

Intelligence & Automation
  └── reads from all, writes only to own context (notification, activity, audit)

Accounting Integration
  └── reads from Financial Normalization; never writes to it

Financial Normalization
  └── reads approval events from Submission & Review

Inventory & Asset
  └── reads mutation events from Financial Normalization

Submission & Review
  └── reads job/shift context from Operational Core

Client Portal
  └── reads from Operational Core; publishes requests back

Operational Core
  └── reads identity context from Identity & Access

Identity & Access
  └── authoritative source; reads nothing from other contexts
```

The dependency direction is strictly: downward from operational to financial. No financial context writes back to operational contexts. No intelligence context writes to financial contexts.
