# THE LEDGER — DOMAIN MODEL SUMMARY

## Authoritative Backend Planning Starting Point

Version: 2.0
Status: FROZEN
Date: June 4, 2026
Authority: Domain Definition Sessions — June 4, 2026 (Round 1 + Round 2)

---

## PURPOSE

This document is the authoritative synthesis of all frozen domain definitions produced in the Domain Definition Sessions of June 4, 2026. It is the complete starting point for backend domain specification.

Every decision recorded here derives from a frozen domain document. Contradictions between this summary and a domain document are resolved in favour of the domain document.

**Frozen domain documents (authoritative):**

| Domain | File | Round |
|---|---|---|
| Expense Domain | docs/domain/EXPENSE_DOMAIN.md | 1 |
| Rejection Domain | docs/domain/REJECTION_DOMAIN.md | 1 |
| Timesheet Domain | docs/domain/TIMESHEET_DOMAIN.md | 1 |
| Site Domain | docs/domain/SITE_DOMAIN.md | 1 |
| Issue Domain | docs/domain/ISSUE_DOMAIN.md | 1 |
| Financial Record Correction Domain | docs/domain/FINANCIAL_RECORD_CORRECTION_DOMAIN.md | 1 |
| Job Domain | docs/domain/JOB_DOMAIN.md | 1 |
| Report Domain | docs/domain/REPORT_DOMAIN.md | 2 |
| Stock Domain | docs/domain/STOCK_DOMAIN.md | 2 |
| Asset Domain | docs/domain/ASSET_DOMAIN.md | 2 |
| Client Request Domain | docs/domain/CLIENT_REQUEST_DOMAIN.md | 2 |
| Client Portal Domain | docs/domain/CLIENT_PORTAL_DOMAIN.md | 2 |
| Scheduling Domain | docs/domain/SCHEDULING_DOMAIN.md | 2 |
| Worker Classification Domain | docs/domain/WORKER_CLASSIFICATION_DOMAIN.md | 2 |

---

## CORE ENTITIES

| Entity | Primary Key | Parent Entities | Child Entities |
|---|---|---|---|
| Company | `company_id` | — | Clients, Workers, PMs, Jobs, Sites, Stock, Assets |
| Client | `client_id` | Company | Sites, Client Requests, Portal Account |
| Site | `site_id` | Client | Jobs, Site-Stationed Assets |
| Job | `job_id` | Site, Client, Company | Timesheets, Expenses, Reports, Issues, Financial Records, Invoices, Client Requests |
| Worker | `worker_id` | Company | Shifts, Timesheets, Expenses, Reports, Issues |
| PM | `pm_id` | Company | Assigned Jobs, Assigned Sites |
| Shift | `shift_id` | Job, Worker | Timesheet, Report |
| Timesheet Submission | `timesheet_id` | Job, Worker, Shift | TimesheetEntry |
| Worker Report | `report_id` | Job, Worker, Shift | InventoryMutation (per stock item), EquipmentUsageRecord (per equipment item) |
| Expense Submission | `expense_id` | Job, Worker | ExpenseEntry, InvoiceLineItem (if billable) |
| Issue Log | `issue_id` | Job, Worker, Site | Linked Expense Submissions |
| Client Request | `request_id` | Client, Job (optional) | (triggers new Job via PM/CEO action) |
| Stock Item | `stock_item_id` | Company | InventoryMutation records |
| Stock Location | `location_id` | Company | Stock Level records |
| Stock Level | `level_id` | Stock Item, Stock Location | — |
| Asset | `asset_id` | Company | EquipmentUsageRecord records, Asset Assignment |
| TimesheetEntry | `te_id` | Job, Worker, Timesheet Submission | PayrollRecord |
| ExpenseEntry | `ee_id` | Job, Worker, Expense Submission | InvoiceLineItem (if billable) |
| InventoryMutation | `im_id` | Job, Worker, Report, Stock Item, Stock Location | — |
| EquipmentUsageRecord | `eur_id` | Job, Worker, Report, Asset | — |
| InvoiceLineItem | `ili_id` | Job | Invoice |
| FinancialMutation | `fm_id` | Job | — |
| PayrollRecord | `pr_id` | Worker, Company | TimesheetEntry records |
| Void Record | `void_id` | Original Financial Record, Job | — |
| Adjustment Record | `adj_id` | Original Financial Record, Job | — |
| Client Portal Account | `portal_id` | Client | — |

---

## ENTITY HIERARCHY

```
Company
  ├── Clients
  │     ├── Portal Account (one per client, CEO-provisioned)
  │     ├── Client Requests → [triggers Jobs via PM/CEO action]
  │     └── Sites
  │           ├── Site-Stationed Assets
  │           └── Jobs
  │                 ├── Workers (assigned)
  │                 ├── Shifts
  │                 │     ├── Timesheets → TimesheetEntries → PayrollRecord
  │                 │     └── Worker Reports
  │                 │           ├── InventoryMutations (per stock item used)
  │                 │           └── EquipmentUsageRecords (per asset used)
  │                 ├── Expense Submissions → ExpenseEntries
  │                 │     └── InvoiceLineItems (if billable)
  │                 ├── Issue Logs → [linked Expense Submissions]
  │                 └── Financial Records
  │                       ├── TimesheetEntry
  │                       ├── ExpenseEntry
  │                       ├── InventoryMutation
  │                       ├── EquipmentUsageRecord
  │                       ├── InvoiceLineItem
  │                       └── FinancialMutation
  ├── Workers (classification: employee | contractor)
  ├── PMs
  ├── Stock Catalogue
  │     └── Stock Locations → Stock Levels
  └── Asset Register
        └── Assets (available | assigned | in_use | maintenance | retired)
```

---

## OWNERSHIP MODELS

### Operational Ownership (before approval)

| Entity | Owner |
|---|---|
| Pending submission (any type) | Submitting worker |
| Submission under review | Reviewing PM or CEO |
| Rejected submission | Submitting worker (for correction) |
| Withdrawn submission | Archived — no owner |
| Issue log | PM (on acknowledgement) |
| Client request | PM (on acknowledgement) |

### Financial Ownership (after approval)

| Entity | Owner |
|---|---|
| Approved financial record (any type) | Job mini-ledger |
| PayrollRecord | Worker (for payroll purposes); Company (for export) |
| Void / Adjustment Record | Job mini-ledger (correction history) |

### Structural Ownership

| Entity | Structural Owner |
|---|---|
| Site | Client |
| Job | Site (a job belongs to one site, one client) |
| Stock Item | Company |
| Asset | Company |
| Correction record | Original financial record (by reference) |
| Client Portal Account | Client (credentials); CEO (provisioning authority) |

### Classification Ownership

| Entity | Owner |
|---|---|
| Worker classification (employee/contractor) | CEO (sets and changes) |
| Subcontractor cost record | Job mini-ledger (via ExpenseEntry) |

---

## LIFECYCLE MODELS

### Job Lifecycle

```
draft → scheduled → active → pending_closure → closed
                           ↘ cancelled (CEO only, mandatory reason)
draft/scheduled → cancelled (PM or CEO)
pending_closure → active (if resolution needed)
```

### Submission Lifecycle (all types)

```
created (worker) → offline queue → pending_review → approved → normalized financial record
                                                   ↘ rejected → worker notified → correction →
                                                     new submission (rejected_submission_ref) →
                                                     pending_review → [repeat or approve]
pending_review → withdrawn (worker, before reviewer opens)
```

### Financial Record Lifecycle

```
normalized → synced (accounting export)
normalized or synced → voided (CEO-approved void correction)
normalized or synced → adjusted (CEO-approved adjustment correction)
voided/adjusted post-sync → sync_correction_required → correction_synced | correction_sync_failed
```

### Shift / Timesheet / Report Lifecycle

```
shift started → in_progress → ended
                              ├── timesheet created (auto) → pending_review [Timesheet Domain]
                              └── report submitted (worker-initiated) → pending_review [Report Domain]
in_progress ↘ pm_closed (manual PM action for unreachable worker)
```

### Issue Lifecycle

```
open → acknowledged → in_progress → resolved → closed (auto after 7 days or PM/CEO action)
open/acknowledged → closed (CEO only, mandatory reason)
```

### Site Lifecycle

```
active → inactive → active (PM or CEO)
active/inactive → archived (CEO only, irreversible, requires no open jobs)
```

### Asset Lifecycle

```
available → assigned → in_use → assigned (shift ends; still assigned to job)
assigned → available (assignment ended)
available/assigned → maintenance → available
available/assigned/maintenance → retired (CEO only, terminal)
```

### Client Request Lifecycle

```
open → acknowledged → in_progress → resolved → closed (auto after 7 days or PM/CEO)
open/acknowledged/in_progress → declined (PM or CEO, mandatory reason)
open → declined (PM or CEO, without acknowledging — rare)
```

### Worker Classification Lifecycle

```
employee ↔ contractor (CEO may change at any time; audit entry created)
[Classification frozen on approved financial records at approval time]
```

---

## APPROVAL MODELS

### Approval Authority by Submission Type

| Submission Type | PM Approval | CEO Approval |
|---|---|---|
| Worker Report | Yes (own jobs) | Yes |
| Timesheet | Yes (own jobs) | Yes |
| Expense ≤ £500, non-billable | Yes (own jobs) | Yes |
| Expense > £500, non-billable | No | Yes |
| Expense, billable (any amount) | No | Yes |
| Issue Log | Not applicable (acknowledgement, not approval) | Not applicable |
| Financial Record Correction (void/adjustment) | No (may request) | Yes only |
| Job Financial Closure | No | Yes only |
| Active Job Cancellation | No | Yes only |
| Client Portal Provisioning | No | Yes only |
| Asset Retirement | No | Yes only |
| Stock Write-Off | No | Yes only |

### Automation Approval Rules

Automation may NEVER approve any submission type. Human approval is mandatory for all submission types entering Review Centre. This is an absolute platform invariant.

---

## REJECTION MODELS

Rejection doctrine is universal across all submission types. Full rules: REJECTION_DOMAIN.md.

### Core Rejection Rules

1. Rejection always records a mandatory reason.
2. A rejected submission is never deleted; it is preserved permanently.
3. A rejected submission is never modified after rejection.
4. Rejection never creates a financial record.
5. The submitter is always notified with the reason verbatim.
6. Correction creates a new submission with `rejected_submission_ref`; original unchanged.
7. Correction window closes when the referenced job is closed.
8. Automation may never reject.

### Rejection Finality

Rejection doctrine ends at the approval boundary. Approved financial records are not subject to rejection — they are governed by the Financial Record Correction Domain.

---

## FINANCIAL MUTATION POINTS

These are the only points in The Ledger where operational events become financially real. Every other action is informational, evaluative, or operational.

| Mutation Point | Trigger | Records Created |
|---|---|---|
| Timesheet approval | CEO or PM approves timesheet submission | `TimesheetEntry`, `PayrollRecord` contribution |
| Expense approval (non-billable) | CEO or PM approves non-billable expense | `ExpenseEntry` |
| Expense approval (billable) | CEO approves billable expense | `ExpenseEntry` + `InvoiceLineItem (pending_inclusion)` |
| Report approval | CEO or PM approves report submission | `InventoryMutation` per stock item used + `EquipmentUsageRecord` per asset used |
| Invoice creation | CEO or PM creates invoice | `InvoiceLineItem` records |
| Financial record void | CEO approves void request | `Void Record` (offsets original) |
| Financial record adjustment | CEO approves adjustment request | `Adjustment Record` (captures delta) |
| Stock replenishment | PM or CEO records stock received | Positive `InventoryMutation` (stock-in, not a job cost) |
| Stock write-off | CEO approves write-off | Negative `InventoryMutation` (no job_id) |

**No other action in The Ledger creates, modifies, or deletes financial records.**

### Report Normalization Map (authoritative)

| Report Element | Financial Record Created | Notes |
|---|---|---|
| `stock_items_used[n]` | `InventoryMutation` (one per item) | Materials cost against job |
| `equipment_items_used[n]` | `EquipmentUsageRecord` (one per item) | Equipment cost against job |
| `work_summary`, `qa_observations`, `photo_attachments` | None | Operational/document records only |
| Report rejected | None | Original report retained in audit trail |

Report approval does NOT create: TimesheetEntry, ExpenseEntry, InvoiceLineItem.

---

## WORKER CLASSIFICATION NORMALIZATION MAP

| Classification | Timesheet → | Expense → | Payroll Export |
|---|---|---|---|
| `employee` | TimesheetEntry (classification: employee) | ExpenseEntry | Employee payroll segment |
| `contractor` | TimesheetEntry (classification: contractor) | ExpenseEntry | Contractor payments segment |
| Subcontractor (no profile) | N/A — no timesheet | ExpenseEntry (category: subcontractor) | Not in payroll export |

---

## AUDIT REQUIREMENTS

### Universal Audit Fields (all audit entries)

| Field | Content |
|---|---|
| `who` | User ID of the actor |
| `what` | Audit entry type |
| `when` | Timestamp (UTC) |
| `source_object_id` | The primary entity acted upon |
| `destination_object_id` | The output entity created, or null |
| `external_reference` | Job ID (and site_id / client_id where applicable) |

### Audit Entry Types by Domain

**Job Domain:**
`job_created`, `job_scheduled`, `job_schedule_updated`, `job_worker_assigned`, `job_worker_removed`, `job_activated`, `job_pending_closure`, `job_closed`, `job_cancelled`, `job_pm_reassigned`, `job_closure_blocked`

**Shift / Timesheet Domain:**
`shift_started`, `shift_ended_timesheet_created`, `shift_pm_closed`, `timesheet_pending_review`, `timesheet_approved`, `timesheet_rejected`, `timesheet_billable_hours_adjusted`, `timesheet_resubmitted`

**Report Domain:**
`report_submitted`, `report_pending_review`, `report_approved`, `report_rejected`, `report_resubmitted`, `inventory_mutation_created`, `equipment_usage_recorded`

**Expense Domain:**
`expense_submitted`, `expense_pending_review`, `expense_approved`, `expense_rejected`, `expense_resubmitted`, `expense_receipt_override`, `expense_billable_approved`

**Rejection Domain (universal):**
`submission_pending_review`, `submission_rejected`, `rejection_notified`, `submission_correction_created`, `submission_resubmitted`, `submission_approved`, `submission_withdrawn`

**Issue Domain:**
`issue_submitted`, `issue_acknowledged`, `issue_in_progress`, `issue_resolved`, `issue_closed`, `issue_escalated`, `issue_ceo_closed`, `issue_expense_linked`

**Financial Record Correction Domain:**
`void_request_created`, `adjustment_request_created`, `correction_approved`, `correction_rejected`, `accounting_sync_correction_required`, `accounting_sync_correction_succeeded`, `accounting_sync_correction_failed`, `payroll_record_correction_required`

**Site Domain:**
`site_created`, `site_updated`, `site_status_changed`, `site_pm_reassigned`, `site_archived`, `job_created_at_site`

**Stock Domain:**
`inventory_mutation_created`, `stock_replenishment_recorded`, `stock_transfer_recorded`, `stock_writeoff_approved`, `stock_low_alert_triggered`, `stock_item_created`, `stock_item_discontinued`

**Asset Domain:**
`asset_created`, `asset_assigned_to_job`, `asset_assignment_ended`, `asset_assigned_to_worker`, `equipment_usage_recorded`, `asset_maintenance_started`, `asset_maintenance_completed`, `asset_retired`, `asset_status_changed`

**Client Request Domain:**
`client_request_submitted`, `client_request_acknowledged`, `client_request_in_progress`, `client_request_resolved`, `client_request_declined`, `client_request_escalated`, `job_created_from_client_request`

**Client Portal Domain:**
`client_portal_provisioned`, `client_portal_deactivated`, `client_portal_login`, `client_viewed_job`, `client_viewed_document`, `client_viewed_invoice`, `client_request_submitted`, `document_shared_with_client`

**Scheduling Domain:**
`job_scheduled`, `job_worker_assigned`, `job_worker_removed`, `scheduling_conflict_override`, `job_schedule_updated`

**Worker Classification Domain:**
`worker_created`, `worker_classification_changed`

### Audit Immutability

All audit entries are immutable after creation. No audit entry may be modified, deleted, or soft-deleted. The audit trail is the permanent record of platform history.

---

## CROSS-DOMAIN DEPENDENCIES

| Dependent Domain | Depends On | Dependency |
|---|---|---|
| Timesheet | Job, Worker | Timesheets require valid job_id and worker_id; derived from Shift |
| Report | Job, Worker, Shift | Reports require completed shift; stock/asset items from catalogue/register |
| Expense | Job, Worker | Expenses require valid job_id; worker must be assigned to the job |
| Issue | Job, Worker, Site | Issues require job_id and site_id; worker must be assigned to job |
| Job | Site, Client | Jobs require active site_id and valid client_id |
| Site | Client | Sites require valid client_id |
| Financial Record Correction | All Financial Record types | Corrections reference specific financial record IDs |
| PayrollRecord | TimesheetEntry, Worker Classification | Aggregates by worker and period; segmented by classification |
| InvoiceLineItem (billable) | ExpenseEntry, Job | Created when billable expense is approved |
| Rejection (universal) | All submission types | Applies to all submissions entering Review Centre |
| InventoryMutation (usage) | Report, Stock Item, Stock Location | Created at report approval; deducts from stock level |
| EquipmentUsageRecord | Report, Asset | Created at report approval; records duration against asset |
| Client Request | Client, Job (optional) | Submitted by portal users; routed to PM of relevant job |
| Client Portal | Client, Site, Job | Access scoped to client's own sites; jobs visible by status |
| Scheduling | Job, Worker | Workers assigned to jobs by PM/CEO; conflict detection at date level |
| Worker Classification | Worker Profile | Set by CEO; frozen on approved TimesheetEntry at approval time |
| Stock | Stock Item Catalogue, Stock Location | Stock levels maintained per item per location via InventoryMutation |
| Asset | Asset Register | Assets tracked per company; assignment exclusivity enforced |

---

## DOMAIN INVARIANTS

These rules are absolute. No implementation decision, configuration, automation rule, or future domain definition may override them.

### Financial Integrity Invariants

1. **No financial record is created without approval.** Every financial record has an `approved_by` and `approved_at` field. Records without both are invalid.
2. **Approved financial records are immutable in content.** Only the `status` field may be updated (to `voided` or `adjusted`). All other fields are frozen at creation.
3. **Financial record corrections are append-only.** Void and adjustment records are created; original records are never modified.
4. **Only the CEO may approve financial record corrections.** No delegation, no exception, no automation.
5. **Financial reporting must reflect net corrected values.** Queries must account for void and adjustment records.
6. **Job attribution is mandatory.** No financial record may exist without a valid `job_id`.
7. **Unit cost and cost rate are frozen at approval time.** Changes to stock catalogue prices or asset cost rates do not retroactively affect approved records.

### Approval Invariants

8. **Automation may never approve.** No automation rule, workflow, or scheduler may approve any submission type. Human approval is mandatory.
9. **Rejection always records a reason.** No exception. No default reason. No bypass.
10. **A rejected submission is never deleted.** It is retained permanently in the audit trail.
11. **A rejected submission's content is frozen at rejection.** It cannot be modified after rejection.
12. **Report approval is all-or-nothing.** Individual items within a report cannot be selectively approved or rejected.

### Structural Invariants

13. **A job must have a site.** No job without a valid `site_id`.
14. **A site must have a client.** No site without a valid `client_id`.
15. **A timesheet must derive from a shift.** No standalone timesheet creation.
16. **A report must be associated with a completed shift.** No standalone report in v1.
17. **One shift produces at most one report.** A worker cannot submit two reports for the same shift.
18. **A worker may not have two in_progress shifts simultaneously.** Single active shift per worker at all times.
19. **An expense submission requires positive amount.** Zero-value expenses are invalid.
20. **An asset may only be assigned to one active job at a time.** Exclusivity is enforced at assignment creation.

### Classification Invariants

21. **Every worker profile must carry a classification.** Either `employee` or `contractor`. No worker profile without classification.
22. **Subcontractors do not have worker profiles.** Their costs are expense submissions (category: `subcontractor`).
23. **Classification is frozen on approved financial records.** Reclassification does not retroactively affect approved TimesheetEntry records.

### Data Isolation Invariants

24. **Demo company data must never appear in a real-business company context.** Company context is enforced at every data query across all domains.
25. **Client portal data is scoped to the client's own sites and jobs only.** Cross-client data leakage is not permitted.
26. **Workers have no financial visibility.** Workers see submission outcomes (pending/approved/rejected) only.
27. **Access notes are never visible to portal users.** Internal operational access information is company-only.

### Lifecycle Invariants

28. **A closed job accepts no new submissions.** New shifts, expenses, reports, and issues may not be created against a closed job.
29. **A job cannot be financially closed with pending submissions.** All submissions must be approved or rejected first.
30. **The correction window for rejected submissions closes when the job closes.**
31. **`archived` site status is irreversible.** No un-archive action exists.
32. **Asset retirement is terminal.** Retired assets cannot be un-retired.

---

## RBAC SUMMARY

| Role | Jobs | Sites | Workers | Submissions (Submit) | Submissions (Approve) | Financial Records | Corrections | Classification | Portal Provision |
|---|---|---|---|---|---|---|---|---|---|
| CEO | Full | Full | Full | No | All | Full | Approve | Set/Change | Yes |
| PM | Own jobs | Assigned sites | Own jobs' workers | No | Own jobs (within limits) | Own jobs | Request only | No | No |
| Worker | Assigned (limited) | Address + access notes only | No | Yes (own) | No | No | No | No | No |
| Client (portal) | Own sites' jobs | Own sites (portal) | Crew names/roles only | Requests only | No | Invoice/summary only | No | No | No |

---

## CROSS-DOMAIN FINANCIAL FLOW (COMPLETE)

```
Field Reality
  ↓
Worker Actions:
  ├── Starts Shift → [Shift record: in_progress]
  │     ↓ Ends Shift
  │     ├── Timesheet created (auto) → Review Centre → Approved
  │     │     → TimesheetEntry (labour cost) + PayrollRecord contribution
  │     └── Worker submits Report → Review Centre → Approved
  │           → InventoryMutation per stock item (materials cost)
  │           → EquipmentUsageRecord per asset (equipment cost)
  │
  ├── Expense submitted → Review Centre → Approved
  │     → ExpenseEntry (expense cost)
  │     → [If billable] → InvoiceLineItem (pending_inclusion)
  │
  └── Issue logged → PM acknowledgement/resolution
        → [If cost_request] → Expense submitted → [same path as above]

Client Actions:
  └── Client Request submitted (via portal)
        → PM/CEO reviews → Accept or Decline
        → [If accepted] → PM/CEO creates new Job (source_request_id)

Job Mini-Ledger Aggregation:
  ├── Total Labour Cost (sum of TimesheetEntry.gross_value)
  ├── Total Expense Cost (sum of ExpenseEntry.amount)
  ├── Total Materials Cost (sum of |InventoryMutation.total_cost| for job usage)
  ├── Total Equipment Cost (sum of EquipmentUsageRecord.total_cost)
  ├── Total Revenue (sum of InvoiceLineItem.amount — revenue lines)
  └── Gross Margin = Total Revenue − Total Cost

Corrections (CEO only):
  └── Void / Adjustment → Append-only correction records → Net values recalculated
```

---

## BACKEND PLANNING PREREQUISITES

All decisions required for backend specification are now confirmed across all 14 frozen domains.

| # | Decision | Status | Domain Document |
|---|---|---|---|
| 1 | Expense intake model (fields, categories, receipt rules) | FROZEN | EXPENSE_DOMAIN.md |
| 2 | Rejection lifecycle for all submission types | FROZEN | REJECTION_DOMAIN.md |
| 3 | Financial record immutability model (append-only corrections) | FROZEN | FINANCIAL_RECORD_CORRECTION_DOMAIN.md |
| 4 | Shift-to-timesheet relationship (auto-created at shift end) | FROZEN | TIMESHEET_DOMAIN.md |
| 5 | Job completion definition (PM declares operational; CEO confirms financial) | FROZEN | JOB_DOMAIN.md |
| 6 | Demo data isolation as a platform invariant | FROZEN | Domain Invariant #24 |
| 7 | Worker rate model (worker profile base + job assignment override) | FROZEN | TIMESHEET_DOMAIN.md |
| 8 | Approval authority by submission type | FROZEN | Approval Models (this document) |
| 9 | Site as first-class entity (Client → Site → Job hierarchy) | FROZEN | SITE_DOMAIN.md |
| 10 | Issue domain classification (operational communication, not financial event) | FROZEN | ISSUE_DOMAIN.md |
| 11 | Client portal provisioning model | FROZEN | CLIENT_PORTAL_DOMAIN.md |
| 12 | Expense approval authority and thresholds | FROZEN | EXPENSE_DOMAIN.md |
| 13 | Report-to-financial-record normalization map | FROZEN | REPORT_DOMAIN.md |
| 14 | Worker employment classification model | FROZEN | WORKER_CLASSIFICATION_DOMAIN.md |
| 15 | Report as shift-associated container (not a timesheet replacement) | FROZEN | REPORT_DOMAIN.md |
| 16 | Stock usage embedded in report (not a separate submission type) | FROZEN | STOCK_DOMAIN.md, REPORT_DOMAIN.md |
| 17 | Equipment usage embedded in report (not a separate submission type) | FROZEN | ASSET_DOMAIN.md, REPORT_DOMAIN.md |
| 18 | Asset assignment exclusivity (one active job at a time) | FROZEN | ASSET_DOMAIN.md |
| 19 | Asset cost model (per-hour or per-use) | FROZEN | ASSET_DOMAIN.md |
| 20 | Stock unit cost frozen at approval time | FROZEN | STOCK_DOMAIN.md |
| 21 | Client requests never enter Review Centre | FROZEN | CLIENT_REQUEST_DOMAIN.md |
| 22 | Scheduling unit is the Job (not the shift or the day) | FROZEN | SCHEDULING_DOMAIN.md |
| 23 | Conflict detection at date level (not hour level) in v1 | FROZEN | SCHEDULING_DOMAIN.md |
| 24 | Subcontractor costs as expenses (not timesheets) | FROZEN | WORKER_CLASSIFICATION_DOMAIN.md |
| 25 | Employee and Contractor use same platform workflow in v1 | FROZEN | WORKER_CLASSIFICATION_DOMAIN.md |

---

## DOMAIN READINESS FOR BACKEND SPECIFICATION

| Domain | Backend Specification Ready? | Notes |
|---|---|---|
| Expenses | YES | Fully frozen |
| Rejection Lifecycle | YES | Fully frozen |
| Timesheets / Shifts | YES | Fully frozen |
| Sites | YES | Fully frozen |
| Issues | YES | Fully frozen |
| Financial Record Corrections | YES | Fully frozen |
| Jobs | YES | Fully frozen |
| Worker Reports | YES | Fully frozen — normalization map complete |
| Stock | YES | Fully frozen |
| Assets | YES | Fully frozen |
| Client Requests | YES | Fully frozen |
| Client Portal | YES | Fully frozen (authentication implementation detail deferred to build phase) |
| Scheduling | YES | Fully frozen |
| Worker Classification | YES | Fully frozen |
| Notifications | PARTIAL | Delivery channels (push, email) not yet fully defined; in-platform delivery is frozen |
| Invoice Generation | PARTIAL | Invoice structure exists; full invoice lifecycle (line item selection, sending, payment tracking) not yet domain-defined |
| Payroll Export Format | PARTIAL | Employee/contractor segmentation frozen; specific export file format and field mapping to payroll systems not yet defined |

---

## WHAT CAN BEGIN IMMEDIATELY

The following backend work may begin from the frozen domains:

### Core Operational Engine (from Round 1 + Round 2)

1. **Job schema and lifecycle engine** — complete state machine, all fields, all transitions, all constraints
2. **Site schema and lifecycle engine** — Client → Site → Job hierarchy
3. **Shift recording and timesheet creation engine** — shift → timesheet derivation, rate resolution, offline queue
4. **Timesheet Review Centre integration** — pending_review → approved → TimesheetEntry normalization
5. **Worker Report Review Centre integration** — pending_review → approved → InventoryMutation + EquipmentUsageRecord normalization (normalization map now fully defined)
6. **Expense submission intake** — all fields, categories, receipt logic, billable flag
7. **Expense Review Centre integration** — approval authority, billable → InvoiceLineItem creation
8. **Issue log submission and acknowledgement workflow** — all severity levels, escalation triggers
9. **Rejection lifecycle engine** — universal across all submission types
10. **Financial record correction engine** — void and adjustment records, CEO-only approval
11. **Audit log schema** — universal audit entry model, all entry types across all domains

### Stock and Asset Engine (from Round 2)

12. **Stock catalogue schema** — stock items, categories, units, unit cost
13. **Stock location schema** — depot, vehicle, site locations
14. **Stock level management** — per-item per-location quantity tracking via InventoryMutation
15. **Stock replenishment, transfer, and write-off workflows**
16. **Asset register schema** — asset types, cost models, lifecycle states
17. **Asset assignment engine** — single-job exclusivity, conflict enforcement, worker assignment
18. **Asset maintenance recording**

### Scheduling Engine (from Round 2)

19. **Schedule view engine** — derive schedule from job records; no separate schedule entity
20. **Worker assignment validation** — conflict detection at date level; override with audit entry
21. **Multi-day job schedule display**

### Client and Portal Engine (from Round 2)

22. **Client request submission and routing** — 8 request types, PM routing, escalation triggers
23. **Client portal provisioning** — CEO creates portal account scoped to client sites
24. **Client portal data access layer** — site/job/document/invoice visibility rules
25. **Document sharing for client portal** — explicit share action; no automatic exposure

### Worker Classification Engine (from Round 2)

26. **Worker profile classification field** — employee / contractor, CEO-managed
27. **Classification-aware payroll export** — segmented by classification
28. **Classification audit trail** — change history with before/after values

---

## FINAL STATEMENT

The Domain Definition Sessions of June 4, 2026 have produced fourteen frozen domain documents that together resolve all significant undefined concepts required before backend domain architecture can begin.

The complete operational-to-financial pipeline of The Ledger is now fully specified at the business domain level:

- How workers perform work and submit records (Timesheet, Report, Expense, Issue Domains)
- How submissions are reviewed and approved (Job Domain, Rejection Domain, Approval Models)
- How approvals create financial records (Financial Mutation Points, Normalization Maps)
- How financial records are corrected (Financial Record Correction Domain)
- How stock and equipment costs are attributed (Stock Domain, Asset Domain)
- How scheduling works (Scheduling Domain)
- How clients interact with the platform (Client Request Domain, Client Portal Domain)
- How workers are classified for payroll (Worker Classification Domain)

Backend domain specification may begin across all 14 frozen domains.

**The Ledger's central doctrine is preserved in all frozen domains:**

Nothing becomes financially real until approved. Approval is human. Audit is universal. Job attribution is mandatory. Financial records are immutable. Corrections are append-only. The Review Centre governs all financial reality.
