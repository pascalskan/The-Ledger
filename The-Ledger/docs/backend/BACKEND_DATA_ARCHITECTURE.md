# THE LEDGER — BACKEND DATA ARCHITECTURE

Version: 1.0
Status: AUTHORITATIVE
Date: June 4, 2026
Authority: Backend Architecture Definition Phase

---

## PURPOSE

This document defines The Ledger's data architecture: aggregate roots, data ownership, persistence boundaries, source-of-truth rules, read models, write models, consistency requirements, transaction boundaries, and audit/event storage requirements.

This document does NOT define tables, schemas, or ERDs.

---

## PERSISTENCE STRATEGY

The Ledger uses a single **PostgreSQL** database with a modular schema layout. Each module owns a schema namespace (a schema prefix or schema group). This enforces logical data isolation without the operational complexity of separate databases.

```
PostgreSQL (single instance)
  ├── identity schema        — users, companies, roles, sessions
  ├── operational schema     — clients, sites, jobs, shifts, workers, assignments
  ├── review schema          — submissions (timesheet, report, expense, issue), rejections
  ├── financial schema       — financial records (entries, mutations, corrections, payroll)
  ├── inventory schema       — stock items, locations, levels, assets, assignments
  ├── portal schema          — portal accounts, sessions, document shares, client requests
  ├── accounting schema      — provider configs, sync records, reconciliation, exceptions
  ├── intelligence schema    — automation rules, schedules, workflows, notifications, events
  ├── reporting schema       — report definitions, generated reports, exports, distributions
  └── audit schema           — audit log (append-only, globally shared)
```

ORM: **Drizzle ORM** (TypeScript-first, type-safe, migration-managed)

---

## AGGREGATE ROOTS AND OWNERSHIP

Each aggregate root is persisted in the schema owned by its module. No other module may write to another module's schema directly.

| Aggregate Root | Schema | Module Owner |
|---|---|---|
| Company | identity | Identity Module |
| User | identity | Identity Module |
| Role, Permission | identity | Identity Module |
| RefreshToken | identity | Identity Module |
| Client | operational | Operational Module |
| Site | operational | Operational Module |
| Job | operational | Operational Module |
| Shift | operational | Operational Module |
| WorkerProfile | operational | Operational Module |
| WorkerAssignment | operational | Operational Module |
| TimesheetSubmission | review | Review Centre Module |
| ReportSubmission | review | Review Centre Module |
| ExpenseSubmission | review | Review Centre Module |
| IssueLog | review | Review Centre Module |
| RejectionRecord | review | Review Centre Module |
| TimesheetEntry | financial | Financial Normalization Module |
| ExpenseEntry | financial | Financial Normalization Module |
| InventoryMutation | financial | Financial Normalization Module |
| EquipmentUsageRecord | financial | Financial Normalization Module |
| InvoiceLineItem | financial | Financial Normalization Module |
| FinancialMutation | financial | Financial Normalization Module |
| VoidRecord | financial | Financial Normalization Module |
| AdjustmentRecord | financial | Financial Normalization Module |
| PayrollRecord | financial | Financial Normalization Module |
| StockItem | inventory | Inventory & Asset Module |
| StockLocation | inventory | Inventory & Asset Module |
| StockLevel | inventory | Inventory & Asset Module |
| Asset | inventory | Inventory & Asset Module |
| AssetAssignment | inventory | Inventory & Asset Module |
| ClientPortalAccount | portal | Client Portal Module |
| ClientRequest | portal | Client Portal Module |
| DocumentShareRecord | portal | Client Portal Module |
| AccountingProviderConfig | accounting | Accounting Integration Module |
| SyncRecord | accounting | Accounting Integration Module |
| ReconciliationRecord | accounting | Accounting Integration Module |
| ExceptionRecord | accounting | Accounting Integration Module |
| FinancialControlRecord | accounting | Accounting Integration Module |
| AutomationRule | intelligence | Intelligence & Automation Module |
| AutomationSchedule | intelligence | Intelligence & Automation Module |
| GovernanceRecord | intelligence | Intelligence & Automation Module |
| WorkflowDefinition | intelligence | Intelligence & Automation Module |
| WorkflowExecution | intelligence | Intelligence & Automation Module |
| NotificationRecord | intelligence | Intelligence & Automation Module |
| ActivityFeedEvent | intelligence | Intelligence & Automation Module |
| EventOutbox | intelligence | Intelligence & Automation Module |
| EventLog | intelligence | Intelligence & Automation Module |
| GeneratedReport | reporting | Reporting Module |
| ReportExport | reporting | Reporting Module |
| ReportDistribution | reporting | Reporting Module |
| AuditEntry | audit | Shared (written by Application Layer of any module) |

---

## SOURCE-OF-TRUTH RULES

| Data Domain | Source of Truth | Who May Write |
|---|---|---|
| Tenant and user identity | identity.companies, identity.users | Identity Module only |
| Roles and permissions | identity.roles, identity.permissions | Identity Module only |
| Client and site hierarchy | operational.clients, operational.sites | Operational Module only |
| Job state | operational.jobs | Operational Module only |
| Shift state | operational.shifts | Operational Module only |
| Worker profiles and classification | operational.worker_profiles | Operational Module only |
| Pending submissions | review.* | Review Centre Module only |
| Rejection records | review.rejections | Review Centre Module only |
| Approved financial records | financial.* | Financial Normalization Module only |
| Corrections (voids/adjustments) | financial.void_records, financial.adjustment_records | Financial Normalization Module only (CEO-approved only) |
| Stock levels | inventory.stock_levels | Inventory & Asset Module only (via mutation events from Financial Normalization) |
| Asset state | inventory.assets | Inventory & Asset Module only |
| Portal access | portal.* | Client Portal Module only |
| Client requests | portal.client_requests | Client Portal Module only |
| Sync state | accounting.sync_records | Accounting Integration Module only |
| Reconciliation state | accounting.reconciliation_records | Accounting Integration Module only |
| Automation rules | intelligence.automation_rules | Intelligence & Automation Module only |
| Notifications | intelligence.notifications | Intelligence & Automation Module only |
| Reports and exports | reporting.* | Reporting Module only |
| Audit trail | audit.audit_entries | Any module (Application Layer only; append-only) |

---

## WRITE MODELS (COMMAND SIDE)

Write models are normalized relational records. Each write is a state change on a well-defined aggregate.

### Key write model characteristics

- Every write is scoped to a `company_id` (tenant)
- Every financially relevant write is accompanied by an audit entry (same transaction)
- Every write that results in a financial record includes an `approved_by` and `approved_at` (enforced by Financial Normalization Module)
- Financial record content fields are write-once (enforced by repository implementation)
- Rejected submissions are write-once after rejection (no content modification allowed)
- Audit entries are write-once (no update or delete permitted)

### Write consistency requirements

| Operation | Consistency Requirement |
|---|---|
| Approve submission → create financial record | ACID transaction: approval status + financial record + audit entry in single commit |
| Void/adjust financial record | ACID transaction: correction record + financial record status update + audit entry in single commit |
| Sync financial record to accounting | Sync record status update; financial record in Ledger never modified by sync |
| Publish domain event | Transactional outbox: event written to outbox in same transaction as state change |
| Decrement stock level | Triggered by InventoryMutationCreated event; idempotent by mutation_id |
| Worker assignment | ACID transaction: assignment record + scheduling conflict check + audit entry |

---

## READ MODELS (QUERY SIDE)

Read models are optimised projections for common query patterns. They are derived from write model data and cached where necessary.

The Ledger does not implement full CQRS in v1. Read models are constructed from SQL queries against the normalized write schema with selective materialized views or cached aggregations where performance requires it.

### Key read models

**Job Mini-Ledger View**
- Aggregates: labour cost (TimesheetEntry sum), expense cost (ExpenseEntry sum), materials cost (InventoryMutation sum), equipment cost (EquipmentUsageRecord sum), revenue (InvoiceLineItem sum), gross margin
- Excludes: voided and adjusted records (net values only)
- Owned by: Financial Normalization Module
- Used by: Job detail page, Financial Intelligence, Reporting

**Pending Submissions View**
- Aggregates: submissions in `pending_review` state, grouped by type and assignee
- Owned by: Review Centre Module
- Used by: Review Centre dashboard, notification routing

**Scheduling View**
- Derived from job start/end dates and worker assignments
- No separate scheduling entity — schedule is a projection of job and assignment records
- Owned by: Operational Module
- Used by: Schedule page, conflict detection

**Stock Level Summary View**
- Aggregates: current stock levels per item per location (derived from InventoryMutation history)
- Owned by: Inventory & Asset Module
- Used by: Stock page, low-stock alerts

**Audit Trail View**
- Query surface over the append-only audit log
- Filterable by: entity, actor, action type, job, time range
- Owned by: Audit schema (shared)
- Used by: Audit Centre, Financial Insights, Exception Resolution

**Notification Inbox View**
- Aggregates: unread and recent notifications per user
- Owned by: Intelligence & Automation Module
- Used by: Notification Centre, notification badge

**Activity Feed View**
- Aggregates: recent platform events for CEO
- Owned by: Intelligence & Automation Module
- Used by: Activity Feed page, Dashboard widget

**Analytics Health Snapshot**
- Aggregates: 5-dimension health scores computed from multiple modules
- Computed on demand or refreshed on a schedule
- Owned by: Reporting Module
- Used by: Analytics Centre, Executive Command Centre

---

## TRANSACTION BOUNDARIES

Each of the following operations must complete as a single ACID transaction:

1. **Submit → pending_review**: Submission record + audit entry
2. **Approve submission → financial record**: Submission status update + financial record(s) creation + audit entry + outbox event
3. **Reject submission**: Submission status update + rejection record + audit entry + outbox event (for notification)
4. **Request void/adjustment**: Correction request record + audit entry
5. **Approve correction (CEO)**: Correction record status update + financial record status update + audit entry + outbox event
6. **Start/end shift**: Shift state update + audit entry [+ timesheet creation on shift end]
7. **Job status transition**: Job status update + audit entry
8. **Worker assignment**: Assignment record + conflict check + audit entry
9. **Portal provisioning (CEO)**: Portal account creation + audit entry
10. **Sync record creation**: Sync record + queued record reference + audit entry
11. **Automation rule save**: Rule record + governance check result + audit entry

Operations that span multiple modules (e.g. approval creating financial records that are then queued for sync) use the transactional outbox: the financial record is created in one transaction, and the sync queue entry is created when the `TimesheetEntryCreated` event is consumed by the Accounting Integration Module.

---

## AUDIT STORAGE REQUIREMENTS

### Audit Entry Structure

Every audit entry contains:

| Field | Type | Required |
|---|---|---|
| `audit_id` | UUID | Always |
| `company_id` | UUID | Always (tenant isolation) |
| `entry_type` | Enum (domain-specific type) | Always |
| `actor_id` | UUID (User ID) | Always (null for system-initiated) |
| `actor_role` | String | Always |
| `occurred_at` | Timestamp (UTC) | Always |
| `source_object_type` | String | Always |
| `source_object_id` | UUID | Always |
| `destination_object_type` | String | When output object created |
| `destination_object_id` | UUID | When output object created |
| `job_id` | UUID | Always when financially relevant |
| `site_id` | UUID | When applicable |
| `client_id` | UUID | When applicable |
| `previous_value` | JSONB | When value changed |
| `new_value` | JSONB | When value changed |
| `external_reference` | String | When applicable (e.g. accounting provider ref) |
| `metadata` | JSONB | Additional context |

### Audit Immutability Enforcement

- The audit table has no `UPDATE` permission for the application role
- The audit table has no `DELETE` permission for the application role
- Row-level security prevents any write except INSERT
- Application Layer audit writes go through a dedicated `AuditWriter` that only exposes `append()`

### Audit Retention

Audit entries are permanent. There is no expiry, archiving, or deletion of audit records. This is a platform invariant.

---

## EVENT STORAGE REQUIREMENTS

### Event Outbox Table

Temporary delivery buffer. Records are retained for 7 days after delivery for debugging, then eligible for archival.

### Event Log Table

Permanent event history. Structure:

| Field | Type |
|---|---|
| `event_log_id` | UUID |
| `event_id` | UUID (from event envelope) |
| `event_type` | String |
| `company_id` | UUID |
| `actor_id` | UUID |
| `source_object_id` | UUID |
| `source_object_type` | String |
| `payload` | JSONB |
| `occurred_at` | Timestamp (UTC) |
| `logged_at` | Timestamp (UTC) |

Event log is append-only. Retained indefinitely for platform observability.

---

## HOW OPERATIONAL TRUTH BECOMES FINANCIAL TRUTH

This is the central data flow of The Ledger:

```
1. OPERATIONAL REALITY (operational schema)
   Worker performs work →
   Shift started (operational.shifts: status = in_progress)

2. SUBMISSION (review schema)
   Shift ends →
   Timesheet created automatically (review.timesheet_submissions: status = pending_review)
   Worker submits report (review.report_submissions: status = pending_review)

3. REVIEW GATE (review schema)
   PM or CEO opens submission in Review Centre
   Approves or rejects

4. APPROVAL EVENT (transactional)
   review.timesheet_submissions status → approved
   financial.timesheet_entries record CREATED (approved_by, approved_at populated)
   audit.audit_entries: timesheet_approved entry CREATED
   event_outbox: TimesheetApproved event written
   All in one ACID transaction

5. FINANCIAL NORMALIZATION (financial schema)
   TimesheetEntry is the financially real record
   Job mini-ledger aggregates are updated
   Payroll record contribution is recorded

6. ACCOUNTING SYNC (accounting schema)
   TimesheetEntryCreated event consumed by Accounting Integration Module
   Sync record queued
   On execution: exported to downstream accounting provider
   accounting.sync_records: status → synced

The operational record (timesheet submission) is preserved in review schema.
The financial record (timesheet entry) lives in financial schema.
They are linked by approved_submission_id.
Neither can be modified after approval.
```
