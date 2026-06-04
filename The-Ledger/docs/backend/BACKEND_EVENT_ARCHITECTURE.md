# THE LEDGER — BACKEND EVENT ARCHITECTURE

Version: 1.0
Status: AUTHORITATIVE
Date: June 4, 2026
Authority: Backend Architecture Definition Phase

---

## PURPOSE

This document defines The Ledger's event architecture: the platform event strategy, event ownership, producers, consumers, naming standards, persistence strategy, and event lifecycle.

---

## PLATFORM EVENT STRATEGY

### Decision: Hybrid Event Architecture

The Ledger uses a **Hybrid Event Architecture**:

1. **CRUD for primary state** — Operational entities (jobs, submissions, financial records) are managed with standard CRUD operations backed by a relational database. This is not an event-sourced system.

2. **Domain events for cross-context propagation** — When state changes occur, domain events are published to propagate changes to dependent modules without tight coupling.

3. **Append-only audit log** — A dedicated, immutable audit log captures every financially relevant action. This is not derived from events — it is explicitly written alongside each operation.

4. **Transactional outbox** — Domain events are persisted to an outbox table in the same transaction as the state change, then delivered asynchronously to subscribers.

### Why Not Event Sourcing

Full event sourcing (deriving all state from event streams) would provide a natural audit trail but introduces significant complexity:
- Projection management and rebuild complexity
- Snapshot management for large aggregates
- Tooling and operational overhead disproportionate for a pre-launch product
- The frozen domain model and doctrine already specify an explicit audit log — this requirement does not require event sourcing

The audit log doctrine is satisfied explicitly, not through event sourcing.

---

## EVENT NAMING STANDARD

All domain events follow this naming convention:

```
{Noun}{PastTenseVerb}
```

Examples:
- `TimesheetApproved` — not `ApproveTimesheet`, not `TIMESHEET_APPROVED`
- `ExpenseRejected` — not `RejectExpense`
- `FinancialMutationCreated` — not `CreateFinancialMutation`

Events are nouns with past-tense verbs. They describe something that has already happened. They never describe intentions or commands.

---

## EVENT PERSISTENCE STRATEGY

### Transactional Outbox

All domain events are persisted using the **transactional outbox pattern**:

1. When a use case completes, domain events are collected from aggregate roots
2. Events are written to an `event_outbox` table in the same database transaction as the state change
3. An outbox worker process polls the `event_outbox` table and delivers events to subscribers
4. On successful delivery, the outbox record is marked `delivered`
5. If delivery fails, the record is retried with exponential backoff

This guarantees at-least-once delivery. Subscribers must be idempotent.

### Event Outbox Record Structure

| Field | Description |
|---|---|
| `outbox_id` | UUID |
| `event_type` | Canonical event name (e.g. `TimesheetApproved`) |
| `payload` | JSON event payload |
| `source_module` | Originating module |
| `company_id` | Tenant context |
| `created_at` | Timestamp |
| `status` | `pending` → `delivered` → `failed` |
| `retry_count` | Number of delivery attempts |
| `delivered_at` | Timestamp on success |

### Event Log (Permanent Record)

After delivery, events are written to a permanent `event_log` table for observability. The event log is:
- Append-only
- Never deleted
- Queryable by event type, company, time range, and source object

---

## EVENT LIFECYCLE

```
Domain state change occurs
  ↓
Domain event raised on aggregate root
  ↓
Application layer collects events post-save
  ↓
Events written to event_outbox (same transaction as state change)
  ↓
Outbox worker delivers to subscribers
  ↓
Subscribers handle events (idempotent)
  ↓
Event written to permanent event_log
  ↓
Outbox record marked delivered
```

---

## EVENT CATALOGUE

### Identity Module Events

| Event | Producer | Consumers |
|---|---|---|
| `UserCreated` | Identity Module | Automation & Intelligence (audit) |
| `UserRoleChanged` | Identity Module | Automation & Intelligence (audit) |
| `SessionStarted` | Identity Module | Automation & Intelligence (audit) |
| `SessionRevoked` | Identity Module | Automation & Intelligence (audit) |

---

### Operational Module Events

| Event | Producer | Consumers |
|---|---|---|
| `JobCreated` | Operational Module | Intelligence, Client Portal, Reporting |
| `JobActivated` | Operational Module | Intelligence, Reporting |
| `JobPendingClosure` | Operational Module | Intelligence, Reporting |
| `JobClosed` | Operational Module | Review Centre (close correction windows), Intelligence, Reporting |
| `JobCancelled` | Operational Module | Intelligence, Reporting |
| `ShiftStarted` | Operational Module | Intelligence |
| `ShiftEnded` | Operational Module | Review Centre (trigger timesheet creation), Intelligence |
| `WorkerAssignedToJob` | Operational Module | Intelligence |
| `WorkerRemovedFromJob` | Operational Module | Intelligence |
| `SchedulingConflictDetected` | Operational Module | Intelligence (notification) |
| `SchedulingConflictOverridden` | Operational Module | Intelligence (audit) |
| `SiteCreated` | Operational Module | Client Portal, Intelligence |
| `SiteStatusChanged` | Operational Module | Intelligence |
| `SiteArchived` | Operational Module | Intelligence |
| `ClientCreated` | Operational Module | Client Portal, Intelligence |

---

### Review Centre Module Events

| Event | Producer | Consumers |
|---|---|---|
| `TimesheetSubmitted` | Review Centre | Intelligence (notification to PM/CEO) |
| `TimesheetApproved` | Review Centre | Financial Normalization, Intelligence |
| `TimesheetRejected` | Review Centre | Intelligence (notification to worker) |
| `TimesheetResubmitted` | Review Centre | Intelligence |
| `TimesheetWithdrawn` | Review Centre | Intelligence |
| `ReportSubmitted` | Review Centre | Intelligence (notification to PM/CEO) |
| `ReportApproved` | Review Centre | Financial Normalization, Intelligence |
| `ReportRejected` | Review Centre | Intelligence (notification to worker) |
| `ReportResubmitted` | Review Centre | Intelligence |
| `ReportWithdrawn` | Review Centre | Intelligence |
| `ExpenseSubmitted` | Review Centre | Intelligence (notification to PM/CEO) |
| `ExpenseApproved` | Review Centre | Financial Normalization, Intelligence |
| `ExpenseRejected` | Review Centre | Intelligence (notification to worker) |
| `ExpenseResubmitted` | Review Centre | Intelligence |
| `ExpenseWithdrawn` | Review Centre | Intelligence |
| `IssueSubmitted` | Review Centre | Intelligence (notification to PM) |
| `IssueAcknowledged` | Review Centre | Intelligence |
| `IssueInProgress` | Review Centre | Intelligence |
| `IssueResolved` | Review Centre | Intelligence |
| `IssueClosed` | Review Centre | Intelligence |

---

### Financial Normalization Module Events

| Event | Producer | Consumers |
|---|---|---|
| `TimesheetEntryCreated` | Financial Normalization | Accounting Integration (queue sync), Intelligence, Reporting |
| `ExpenseEntryCreated` | Financial Normalization | Accounting Integration (queue sync), Intelligence, Reporting |
| `InventoryMutationCreated` | Financial Normalization | Inventory & Asset (update stock levels), Accounting Integration, Intelligence |
| `EquipmentUsageRecorded` | Financial Normalization | Inventory & Asset (update asset history), Accounting Integration, Intelligence |
| `InvoiceLineItemCreated` | Financial Normalization | Accounting Integration, Intelligence, Reporting |
| `FinancialMutationCreated` | Financial Normalization | Accounting Integration, Intelligence |
| `VoidRecordCreated` | Financial Normalization | Accounting Integration (sync correction), Intelligence, Reporting |
| `AdjustmentRecordCreated` | Financial Normalization | Accounting Integration (sync correction), Intelligence, Reporting |
| `PayrollRecordContributed` | Financial Normalization | Intelligence, Reporting |
| `CorrectionRequestCreated` | Financial Normalization | Intelligence (pending CEO approval notification) |
| `CorrectionApproved` | Financial Normalization | Accounting Integration, Intelligence |

---

### Inventory & Asset Module Events

| Event | Producer | Consumers |
|---|---|---|
| `StockLevelUpdated` | Inventory & Asset | Intelligence |
| `StockLowAlertTriggered` | Inventory & Asset | Intelligence (notification) |
| `StockReplenishmentRecorded` | Inventory & Asset | Intelligence |
| `StockWriteOffApproved` | Inventory & Asset | Intelligence |
| `AssetCreated` | Inventory & Asset | Intelligence |
| `AssetAssigned` | Inventory & Asset | Intelligence |
| `AssetAssignmentEnded` | Inventory & Asset | Intelligence |
| `AssetMaintenanceStarted` | Inventory & Asset | Intelligence |
| `AssetMaintenanceCompleted` | Inventory & Asset | Intelligence |
| `AssetRetired` | Inventory & Asset | Intelligence |

---

### Client Portal Module Events

| Event | Producer | Consumers |
|---|---|---|
| `ClientPortalProvisioned` | Client Portal | Intelligence |
| `ClientPortalDeactivated` | Client Portal | Intelligence |
| `ClientPortalLogin` | Client Portal | Intelligence (audit) |
| `ClientRequestSubmitted` | Client Portal | Intelligence (notification to PM) |
| `ClientRequestAcknowledged` | Client Portal | Intelligence |
| `ClientRequestDeclined` | Client Portal | Intelligence (notification to client) |
| `ClientRequestJobCreated` | Client Portal | Operational Module, Intelligence |
| `DocumentSharedWithClient` | Client Portal | Intelligence (audit) |

---

### Accounting Integration Module Events

| Event | Producer | Consumers |
|---|---|---|
| `AccountingSyncRequested` | Accounting Integration | Intelligence |
| `AccountingSyncSucceeded` | Accounting Integration | Intelligence, Financial Normalization (status update) |
| `AccountingSyncFailed` | Accounting Integration | Intelligence (alert) |
| `AccountingSyncRetryQueued` | Accounting Integration | Intelligence |
| `ReconciliationRunCompleted` | Accounting Integration | Intelligence, Reporting |
| `ReconciliationExceptionDetected` | Accounting Integration | Intelligence (notification to CEO) |
| `ExceptionResolved` | Accounting Integration | Intelligence |
| `ExceptionRejected` | Accounting Integration | Intelligence |
| `FinancialControlApproved` | Accounting Integration | Intelligence, Financial Normalization |
| `FinancialControlRejected` | Accounting Integration | Intelligence |

---

### Automation & Intelligence Module Events

| Event | Producer | Consumers |
|---|---|---|
| `AutomationTriggered` | Intelligence | Intelligence (self — audit log) |
| `AutomationExecutionAudited` | Intelligence | Intelligence (self — permanent record) |
| `WorkflowStarted` | Intelligence | Intelligence (self — audit log) |
| `WorkflowCompleted` | Intelligence | Intelligence (self — audit log) |
| `WorkflowFailed` | Intelligence | Intelligence (self — alert) |
| `WorkflowBlocked` | Intelligence | Intelligence (self — governance alert) |
| `NotificationCreated` | Intelligence | (delivered to user) |
| `NotificationRead` | Intelligence | Intelligence (self — audit log) |
| `NotificationDismissed` | Intelligence | Intelligence (self — audit log) |
| `ActivityFeedEventPublished` | Intelligence | (available for dashboard reads) |
| `GovernanceStatusChanged` | Intelligence | Intelligence (self — audit log) |
| `ScheduledEvaluationTriggered` | Intelligence | Intelligence (self — evaluation log) |

---

### Reporting Module Events

| Event | Producer | Consumers |
|---|---|---|
| `ReportGenerated` | Reporting | Intelligence (audit) |
| `ReportViewed` | Reporting | Intelligence (audit) |
| `ReportArchived` | Reporting | Intelligence (audit) |
| `ExportGenerated` | Reporting | Intelligence (audit) |
| `ExportDownloaded` | Reporting | Intelligence (audit) |
| `ExportArchived` | Reporting | Intelligence (audit) |
| `DistributionCreated` | Reporting | Intelligence (audit) |
| `DistributionDelivered` | Reporting | Intelligence (audit) |
| `DistributionFailed` | Reporting | Intelligence (alert) |

---

## EVENT PAYLOAD STANDARD

All events carry a standard envelope:

```
{
  eventId: UUID,
  eventType: string,           // e.g. "TimesheetApproved"
  eventVersion: "1.0",
  occurredAt: ISO8601 UTC,
  companyId: UUID,             // tenant context
  actorId: UUID,               // user who caused the event (null for system events)
  sourceObjectId: UUID,        // primary entity that changed
  sourceObjectType: string,    // e.g. "TimesheetSubmission"
  payload: object              // event-specific data
}
```

All events include `companyId` for tenant isolation. No event may be processed without a valid `companyId`.

---

## EVENT BUS SUBSCRIBER REGISTRY

Within the modular monolith, subscribers are registered at application startup:

| Subscriber | Subscribed Events | Action |
|---|---|---|
| Financial Normalization | `TimesheetApproved`, `ReportApproved`, `ExpenseApproved` | Create financial records |
| Inventory & Asset | `InventoryMutationCreated`, `EquipmentUsageRecorded` | Update stock levels / asset history |
| Accounting Integration | `*EntryCreated`, `*RecordCreated`, `VoidRecordCreated`, `AdjustmentRecordCreated` | Queue for sync |
| Client Portal | `JobCreated`, `JobClosed`, `SiteCreated` | Update portal visibility |
| Intelligence (Activity) | All events | Populate activity feed |
| Intelligence (Notification) | Warning/critical severity events | Create notifications |
| Intelligence (Automation Eval) | Configured trigger event types | Trigger read-only rule evaluation |
| Intelligence (Dashboard) | All events | Update dashboard read model |
| Reporting | Financial and operational events | Update reporting aggregates |

---

## AUDIT LOG vs EVENT LOG

These are distinct stores with distinct purposes.

| Concern | Audit Log | Event Log |
|---|---|---|
| Purpose | Financial and operational accountability | Cross-module event delivery and observability |
| Written by | Application Layer (explicitly) | Outbox worker (after delivery) |
| Immutability | Absolute — no delete, no update | Append-only |
| Contents | Who, what, when, source, destination, job attribution | Event envelope with payload |
| Queryable by | User, action type, job, time | Event type, module, time |
| Required by | Audit Doctrine | Event Architecture |
| Sensitive fields | Yes (financial values, approval references) | No (operational metadata only) |
