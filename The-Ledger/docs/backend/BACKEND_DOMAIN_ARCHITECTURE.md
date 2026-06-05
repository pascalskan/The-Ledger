# THE LEDGER — BACKEND DOMAIN ARCHITECTURE

Version: 2.0
Status: AUTHORITATIVE
Date: June 4, 2026
Authority: Backend Architecture Refinement Pass

---

## CHANGE LOG

| Version | Date | Changes |
|---|---|---|
| 1.0 | June 4, 2026 | Initial architecture definition — 9 bounded contexts |
| 2.0 | June 4, 2026 | Refinement pass: Tenant Context extracted from Identity; Financial Intelligence Context added; Notification Centre promoted to defined sub-domain; total 11 bounded contexts |

---

## PURPOSE

This document defines the bounded contexts, context ownership, context boundaries, domain event boundaries, aggregate ownership, and source-of-truth ownership for The Ledger backend.

All decisions derive from the frozen domain model (docs/domain/) and the canonical platform doctrine (docs/ai-context/LEDGER_CANONICAL_CONTEXT.md).

---

## BOUNDED CONTEXTS

The Ledger backend is organised into eleven bounded contexts. Each context owns its aggregates, enforces its invariants, and communicates with other contexts exclusively through domain events or well-defined API contracts.

---

### 1. Tenant Context

**Owns:**
- Company
- Subscription
- Plan
- TenantConfiguration
- TenantMetadata
- TenantLifecycle record

**Responsibilities:**
- Own the fundamental unit of tenancy: the Company
- Manage tenant provisioning lifecycle (active → suspended → terminated)
- Own subscription and plan details (feature flags, limits, tier)
- Own tenant-level configuration (default currency, notification preferences, feature toggles)
- Provide `TenantContext` to all other contexts (company_id, plan, configuration)
- Enforce: demo company data never mixes with real company data (Domain Invariant #24)

**Source of Truth for:** What tenants exist, their lifecycle state, their configuration, and their plan

**Produces Events:**
- `TenantProvisioned`
- `TenantSuspended`
- `TenantReactivated`
- `TenantTerminated`
- `TenantConfigurationUpdated`
- `TenantPlanChanged`

**Consumes Events:** None (authoritative source for tenancy)

**Rationale for extraction from Identity:**
Company (Tenant) has a distinct lifecycle (active/suspended/terminated), subscription model, plan tier, and configuration that have nothing to do with authentication. Identity's single responsibility is: who is the user and what are they allowed to do. Tenant's responsibility is: which business entity does this user belong to, and what is that entity's operational state. These are separate concerns that will grow independently (subscription management, billing, plan enforcement) without polluting the authentication domain.

---

### 2. Identity & Access Context

**Owns:**
- User (CEO, PM, Worker)
- Role
- Permission
- Session
- Refresh Token

**Responsibilities:**
- Authenticate all primary platform users (CEO, PM, Worker)
- Issue JWT access tokens and refresh tokens
- Resolve role and permission for every inbound request
- Enforce RBAC rules across the platform
- Provide `UserContext` to all other contexts (user_id, role, company_id)

**Source of Truth for:** Who may act, under what role, within which tenant

**Produces Events:**
- `UserCreated`
- `UserRoleChanged`
- `UserDeactivated`
- `SessionStarted`
- `SessionRevoked`

**Consumes Events:**
- `TenantProvisioned` (from Tenant) — to initialise the first CEO user for a new tenant
- `TenantSuspended` (from Tenant) — to revoke all active sessions for the tenant

**Isolated from:** Financial data, operational data, audit records, tenant business configuration

---

### 3. Operational Core Context

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

### 4. Submission & Review Context

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

### 5. Financial Normalization Context

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

### 6. Financial Intelligence Context

**Owns:**
- MarginSnapshot
- ForecastRecord
- ExposureRecord
- FinancialKPISnapshot
- PortfolioInsight
- FinancialExplorerView (read model)

**Responsibilities:**
- Aggregate approved financial records into advisory intelligence
- Compute job-level and portfolio-level margin analysis
- Compute exposure analysis (approved costs vs. projected revenue)
- Produce financial forecasts (clearly labelled as advisory projections)
- Maintain financial KPI snapshots (labour cost ratio, expense ratio, revenue per job, gross margin)
- Maintain Financial Explorer read models for CEO navigation
- Enforce: all outputs are advisory and informational only
- Enforce: Financial Intelligence never creates, modifies, or approves financial records
- Enforce: forecasts are always labelled "Advisory Projection — Not Financial Advice"

**Source of Truth for:** Advisory financial analysis and projections (informational layer over Financial Normalization)

**Produces Events:**
- `MarginSnapshotComputed`
- `ForecastUpdated`
- `ExposureAlertTriggered` (when exposure exceeds threshold)
- `FinancialKPISnapshotRefreshed`

**Consumes Events:**
- `TimesheetEntryCreated`, `ExpenseEntryCreated`, `InventoryMutationCreated`, `EquipmentUsageRecorded`, `InvoiceLineItemCreated`, `VoidRecordCreated`, `AdjustmentRecordCreated` (from Financial Normalization) — to update intelligence models
- `JobClosed` (from Operational Core) — to finalise job-level profitability analysis

**Rationale:**
Financial Normalization transforms operational events into financial records — this is a write concern. Financial Intelligence analyses those records to produce advisory insights — this is a read/analysis concern. Combining them in a single context would conflate two very different responsibilities. The Financial Explorer, Margin Intelligence, Exposure Tracking, Forecasting, and Profitability Analysis capabilities in the platform frontend each require dedicated analytical models that are derived from but separate from the normalized financial records.

**Never to be confused with:**
- Financial Normalization (transforms; creates records) — Financial Intelligence only reads from it
- Reporting (produces distributable artifacts) — Financial Intelligence produces live advisory views, not reports

---

### 7. Inventory & Asset Context

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

### 8. Client Portal Context

**Owns:**
- Client Portal Account
- Client Portal Session
- Document Share Record
- Client Request

**Responsibilities:**
- Provision and manage client portal accounts (CEO-only)
- Authenticate portal users (separate credential model from Identity Context)
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

### 9. Accounting Integration Context

**Owns:**
- Accounting Provider Configuration
- Sync Record
- Reconciliation Record
- Exception Record
- Financial Control Record

**Responsibilities:**
- Manage accounting provider connections (QuickBooks, Xero, FreshBooks, Zoho)
- Execute sync of approved financial records to downstream providers
- Enforce sync lifecycle: Pending → Syncing → Synced | Failed → Retry
- Run reconciliation against downstream provider data
- Surface exceptions with traceable source events
- Manage financial controls (CEO-approved overrides of approved records)
- Enforce: sync never creates or modifies financial records in The Ledger
- Enforce: accounting systems are downstream consumers only

**Source of Truth for:** Sync state — what has been exported to accounting systems; what reconciliation discrepancies exist

**Produces Events:**
- `AccountingSyncRequested`, `AccountingSyncSucceeded`, `AccountingSyncFailed`
- `ReconciliationRunCompleted`, `ReconciliationExceptionDetected`
- `ExceptionResolved`, `ExceptionRejected`
- `FinancialControlApproved`, `FinancialControlRejected`

**Consumes Events:**
- `TimesheetEntryCreated`, `ExpenseEntryCreated`, `InvoiceLineItemCreated`, `VoidRecordCreated`, `AdjustmentRecordCreated` (from Financial Normalization) — to queue sync

---

### 10. Intelligence & Automation Context

**Owns:**
- Automation Rule
- Automation Schedule
- Automation Governance Record
- Workflow Definition
- Workflow Execution Record
- Activity Feed Event
- Event Bus Record

**Sub-domain: Notification Centre** (formally defined below)

**Responsibilities:**
- Evaluate automation rules against platform events (read-only evaluation)
- Execute scheduled evaluations and queued actions (never approve, never create financial records)
- Enforce governance over automation rules (CEO-managed risk levels)
- Coordinate cross-module workflow orchestration (escalation, notification, assignment)
- Publish events to Activity Feed
- Enforce all forbidden actions at engine level

**Source of Truth for:** Automation state and platform event history (informational)

**Produces Events:**
- `AutomationTriggered`, `AutomationExecutionAudited`
- `WorkflowStarted`, `WorkflowCompleted`, `WorkflowFailed`
- `ActivityFeedEventPublished`

**Consumes Events:** All domain events from all contexts (for evaluation, activity feed population)

---

#### Notification Centre Sub-Domain

**Formally defined as a sub-domain of Intelligence & Automation.** The Notification Centre has sufficient complexity to warrant explicit architectural definition with its own schema, API surface, lifecycle, and delivery model. It may be extracted to an independent bounded context in a future architecture revision if delivery channel complexity or notification volume warrants it.

**Owns:**
- NotificationRecord
- NotificationDeliveryRecord
- NotificationPreference

**Notification Lifecycle:**
```
created (unread) → read → dismissed (terminal)
created (unread) → dismissed (terminal, without reading)
```

**Notification Types:**

| Type | Trigger Source | Recipients |
|---|---|---|
| `review_required` | TimesheetSubmitted, ReportSubmitted, ExpenseSubmitted | PM (own jobs), CEO |
| `review_approved` | TimesheetApproved, ReportApproved, ExpenseApproved | Submitting worker |
| `review_rejected` | TimesheetRejected, ReportRejected, ExpenseRejected | Submitting worker |
| `sync_failed` | AccountingSyncFailed | CEO |
| `sync_succeeded` | AccountingSyncSucceeded | CEO (optional, configurable) |
| `governance_action` | GovernanceStatusChanged | CEO |
| `automation_alert` | AutomationTriggered (high/critical risk) | CEO |
| `financial_alert` | ExposureAlertTriggered, ReconciliationExceptionDetected | CEO |
| `client_portal_event` | ClientRequestSubmitted | PM (relevant job), CEO |
| `scheduling_conflict` | SchedulingConflictDetected | PM (relevant job), CEO |
| `stock_alert` | StockLowAlertTriggered | PM (relevant job), CEO |

**Notification RBAC:**
- CEO: all notification types, all jobs
- PM: notifications scoped to assigned jobs only
- Worker: no notification access
- Client Portal User: no notification access

**Delivery Channels (v1):** In-platform only (Notification Centre inbox)
**Delivery Channels (future):** Email, mobile push

**Produces Events (within Intelligence sub-domain):**
- `NotificationCreated`
- `NotificationRead`
- `NotificationDismissed`
- `NotificationDelivered` (for each delivery channel)

**Doctrine:**
- Notifications are informational only — they never create financial mutations
- Notifications never approve submissions
- Notifications never bypass approval workflows
- Notification interactions generate immutable audit records
- Deep links navigate to source pages only — they never execute actions

---

### 11. Reporting & Analytics Context

**Owns:**
- Report Definition
- Generated Report
- Export Record
- Distribution Record
- Operational Analytics Snapshot

**Responsibilities:**
- Generate executive, governance, financial, and operational reports
- Export reports as PDF/board-pack artifacts
- Distribute exports (email, portal, download)
- Produce operational health scores across 5 dimensions (workflow, automation, governance, operational, financial operations)
- Surface operational analytics and trends
- Enforce: reports are read-only; exports are read-only derivatives
- Enforce: no report, export, or analytics action approves, modifies, or creates financial records

**Note on Analytics Division:**
Operational/governance/workflow analytics live here. Financial analytics (margin, exposure, profitability forecasts) live in the Financial Intelligence Context (Context 6). The 5-dimension health scoring model in this context covers operational dimensions, not financial profitability analysis.

**Source of Truth for:** Report and export state (informational artifacts); operational health scoring

**Produces Events:**
- `ReportGenerated`, `ReportArchived`
- `ExportGenerated`, `ExportDownloaded`, `ExportArchived`
- `DistributionCreated`, `DistributionDelivered`, `DistributionFailed`

**Consumes Events:** All contexts (for aggregating KPIs and report data)

---

## CONTEXT MAP

```
Tenant Context
  ├── authoritative source for company existence and configuration
  └── publishes TenantProvisioned → Identity (to create initial CEO user)

Identity & Access Context
  ├── provides UserContext (user_id, role, company_id) to all other contexts
  └── consumes TenantProvisioned → creates initial CEO user

Operational Core Context
  ├── Client → Site → Job hierarchy (authoritative)
  ├── Shift lifecycle (owned here)
  └── publishes → Review Centre, Intelligence, Client Portal

Submission & Review Context
  ├── all worker submissions live here (pre-approval)
  ├── receives from → Operational Core (job/shift context)
  └── publishes approved events → Financial Normalization, Intelligence (notifications)

Financial Normalization Context
  ├── all financial records live here (post-approval)
  ├── receives from → Review Centre (approval events)
  └── publishes to → Accounting Integration, Financial Intelligence, Intelligence, Reporting

Financial Intelligence Context
  ├── advisory analysis layer over Financial Normalization
  ├── reads from → Financial Normalization (financial records), Operational Core (job context)
  ├── never writes to → any operational or financial context
  └── publishes advisory insights → Intelligence (alerts), Reporting (financial KPIs)

Inventory & Asset Context
  ├── physical resources (stock, assets)
  ├── receives from → Financial Normalization (mutation events)
  └── publishes to → Intelligence (low stock alerts, asset events)

Client Portal Context
  ├── client-facing access layer (separate auth from Identity)
  ├── reads from → Operational Core (job/site data)
  └── publishes requests → Operational Core (client requests)

Accounting Integration Context
  ├── downstream sync layer
  ├── reads from → Financial Normalization (approved records)
  └── publishes sync/reconciliation events → Intelligence (notifications, activity)

Intelligence & Automation Context (incl. Notification Centre sub-domain)
  ├── consumes events from all contexts
  ├── Notification Centre routes events to user inboxes (advisory only)
  ├── never produces financial mutations
  └── publishes notifications, activity, workflow events

Reporting & Analytics Context
  ├── reads from all contexts (aggregate data)
  ├── reads from Financial Intelligence (financial KPIs for reports)
  ├── never produces financial mutations
  └── produces informational report/export artifacts
```

---

## AGGREGATE OWNERSHIP

| Aggregate Root | Owning Context | Key Invariants Enforced |
|---|---|---|
| Company | **Tenant** | Tenant isolation, lifecycle state |
| TenantConfiguration | **Tenant** | Plan-based feature flags |
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
| MarginSnapshot | **Financial Intelligence** | Advisory only, never modifies financial records |
| ForecastRecord | **Financial Intelligence** | Advisory projection, clearly labelled |
| ExposureRecord | **Financial Intelligence** | Advisory only |
| StockItem | Inventory & Asset | Catalogue master |
| StockLevel | Inventory & Asset | Per-item per-location |
| Asset | Inventory & Asset | Assignment exclusivity, retirement terminal |
| ClientPortalAccount | Client Portal | CEO-provisioned only |
| ClientRequest | Client Portal | Never enters Review Centre |
| AccountingProvider | Accounting Integration | Downstream only |
| SyncRecord | Accounting Integration | Sync lifecycle |
| AutomationRule | Intelligence & Automation | Forbidden actions blocked |
| Workflow | Intelligence & Automation | Approval doctrine preserved |
| NotificationRecord | Intelligence & Automation (Notification sub-domain) | Informational only |
| GeneratedReport | Reporting & Analytics | Read-only artifact |

---

## SOURCE-OF-TRUTH OWNERSHIP

| Truth Domain | Owning Context |
|---|---|
| What tenants exist and their lifecycle state | **Tenant** |
| Tenant configuration and plan | **Tenant** |
| Who is authenticated and what role they hold | Identity & Access |
| What clients, sites, and jobs exist | Operational Core |
| What workers are assigned and scheduled | Operational Core |
| What submissions are pending review | Submission & Review |
| What has been financially approved and normalized | Financial Normalization |
| Advisory financial analysis and projections | **Financial Intelligence** |
| What stock exists and at what levels | Inventory & Asset |
| What assets exist and where they are assigned | Inventory & Asset |
| What has been exported to accounting systems | Accounting Integration |
| What reconciliation discrepancies exist | Accounting Integration |
| What notification records exist and their state | Intelligence & Automation (Notification sub-domain) |
| What automation rules and workflows are configured | Intelligence & Automation |
| What platform events have occurred | Intelligence & Automation |
| What reports and exports exist | Reporting & Analytics |

---

## DOMAIN DEPENDENCY DIRECTION

```
Reporting & Analytics
  └── reads from all (no writes to operational contexts)

Intelligence & Automation (incl. Notification Centre)
  └── reads from all, writes only to own context (notification, activity, audit)

Financial Intelligence
  └── reads from Financial Normalization and Operational Core; writes only to own context

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
  └── reads identity/user context from Identity & Access
  └── reads tenant context from Tenant

Identity & Access
  └── consumes TenantProvisioned from Tenant; otherwise independent

Tenant
  └── authoritative source; reads nothing from other contexts
```

The dependency direction is strictly: Tenant → Identity → Operational → Review → Financial → (Intelligence reads all). No financial context writes back to operational contexts. No intelligence context writes to financial contexts. Financial Intelligence is a read-only analytical layer over Financial Normalization.
