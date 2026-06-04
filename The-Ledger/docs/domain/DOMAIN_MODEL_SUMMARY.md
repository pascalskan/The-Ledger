# THE LEDGER — DOMAIN MODEL SUMMARY

## Authoritative Backend Planning Starting Point

Version: 1.0
Status: FROZEN
Date: June 4, 2026
Authority: Domain Definition Session — June 4, 2026

---

## PURPOSE

This document is the authoritative synthesis of all frozen domain definitions produced in the Domain Definition Session of June 4, 2026. It is the starting point for backend domain specification.

Every decision recorded here derives from a frozen domain document. Contradictions between this summary and a domain document are resolved in favour of the domain document.

**Frozen domain documents (authoritative):**

| Domain | File |
|---|---|
| Expense Domain | docs/domain/EXPENSE_DOMAIN.md |
| Rejection Domain | docs/domain/REJECTION_DOMAIN.md |
| Timesheet Domain | docs/domain/TIMESHEET_DOMAIN.md |
| Site Domain | docs/domain/SITE_DOMAIN.md |
| Issue Domain | docs/domain/ISSUE_DOMAIN.md |
| Financial Record Correction Domain | docs/domain/FINANCIAL_RECORD_CORRECTION_DOMAIN.md |
| Job Domain | docs/domain/JOB_DOMAIN.md |

---

## CORE ENTITIES

| Entity | Primary Key | Parent Entities | Child Entities |
|---|---|---|---|
| Company | `company_id` | — | Clients, Workers, PMs, Jobs, Sites |
| Client | `client_id` | Company | Sites |
| Site | `site_id` | Client | Jobs |
| Job | `job_id` | Site, Client, Company | Timesheets, Expenses, Reports, Issues, Financial Records, Invoices |
| Worker | `worker_id` | Company | Shifts, Timesheets, Expenses, Reports, Issues |
| PM | `pm_id` | Company | Assigned Jobs, Assigned Sites |
| Shift | `shift_id` | Job, Worker | Timesheet |
| Timesheet Submission | `timesheet_id` | Job, Worker, Shift | TimesheetEntry |
| Expense Submission | `expense_id` | Job, Worker | ExpenseEntry, InvoiceLineItem (if billable) |
| Report Submission | `report_id` | Job, Worker | (financial records TBD in Report Domain) |
| Issue Log | `issue_id` | Job, Worker, Site | Linked Expense Submissions |
| TimesheetEntry | `te_id` | Job, Worker, Timesheet Submission | PayrollRecord |
| ExpenseEntry | `ee_id` | Job, Worker, Expense Submission | InvoiceLineItem (if billable) |
| InventoryMutation | `im_id` | Job | — |
| EquipmentUsageRecord | `eur_id` | Job | — |
| InvoiceLineItem | `ili_id` | Job | Invoice |
| FinancialMutation | `fm_id` | Job | — |
| PayrollRecord | `pr_id` | Worker, Company | TimesheetEntry records |
| Void Record | `void_id` | Original Financial Record, Job | — |
| Adjustment Record | `adj_id` | Original Financial Record, Job | — |

---

## ENTITY HIERARCHY

```
Company
  ├── Clients
  │     └── Sites
  │           └── Jobs
  │                 ├── Workers (assigned)
  │                 ├── Shifts → Timesheets → TimesheetEntries
  │                 ├── Expense Submissions → ExpenseEntries
  │                 ├── Report Submissions
  │                 ├── Issue Logs → [linked Expense Submissions]
  │                 └── Financial Records
  │                       ├── TimesheetEntry
  │                       ├── ExpenseEntry
  │                       ├── InventoryMutation
  │                       ├── EquipmentUsageRecord
  │                       ├── InvoiceLineItem
  │                       └── FinancialMutation
  ├── Workers
  └── PMs
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

### Financial Ownership (after approval)

| Entity | Owner |
|---|---|
| Approved financial record (any type) | Job mini-ledger |
| PayrollRecord | Worker (for payroll purposes); Company (for export) |
| Void / Adjustment Record | Job mini-ledger (correction history) |

### Structural Ownership

| Entity | Structural Owner |
|---|---|
| Site | Client (a site belongs to one client) |
| Job | Site (a job belongs to one site, one client) |
| Correction record | Original financial record (by reference) |

---

## LIFECYCLE MODELS

### Job Lifecycle

```
draft → scheduled → active → pending_closure → closed
                           ↘ cancelled (CEO only)
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

### Shift / Timesheet Lifecycle

```
shift started → in_progress → ended → timesheet created → pending_review
                         ↘ pm_closed (manual PM action for unreachable worker)
```

### Issue Lifecycle

```
open → acknowledged → in_progress → resolved → closed (auto after 7 days or PM/CEO action)
open/acknowledged → closed (CEO only, with mandatory reason)
```

### Site Lifecycle

```
active → inactive → active (PM or CEO)
active/inactive → archived (CEO only, irreversible, requires no open jobs)
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
| Report approval | CEO or PM approves report submission | (Record types TBD in Report Domain — may include TimesheetEntry, ExpenseEntry, InventoryMutation) |
| Inventory usage approval | CEO or PM approves inventory usage record | `InventoryMutation` |
| Equipment usage approval | CEO or PM approves equipment usage record | `EquipmentUsageRecord` |
| Invoice creation | CEO or PM creates invoice | `InvoiceLineItem` records |
| Financial record void | CEO approves void request | `Void Record` (offsets original) |
| Financial record adjustment | CEO approves adjustment request | `Adjustment Record` (captures delta) |

**No other action in The Ledger creates, modifies, or deletes financial records.**

---

## AUDIT REQUIREMENTS

### Universal Audit Fields (all audit entries)

| Field | Content |
|---|---|
| `who` | User ID of the actor |
| `what` | Audit entry type (see below) |
| `when` | Timestamp (UTC) |
| `source_object_id` | The primary entity acted upon |
| `destination_object_id` | The output entity created (financial record, correction record), or null |
| `external_reference` | Job ID (and site_id / client_id where applicable) |

### Audit Entry Types by Domain

**Job Domain:**
`job_created`, `job_scheduled`, `job_worker_assigned`, `job_worker_removed`, `job_activated`, `job_pending_closure`, `job_closed`, `job_cancelled`, `job_pm_reassigned`, `job_closure_blocked`

**Shift / Timesheet Domain:**
`shift_started`, `shift_ended_timesheet_created`, `shift_pm_closed`, `timesheet_pending_review`, `timesheet_approved`, `timesheet_rejected`, `timesheet_billable_hours_adjusted`, `timesheet_resubmitted`

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

### Audit Immutability

All audit entries are immutable after creation. No audit entry may be modified, deleted, or soft-deleted. The audit trail is the permanent record of platform history.

---

## CROSS-DOMAIN DEPENDENCIES

| Dependent Domain | Depends On | Dependency |
|---|---|---|
| Timesheet | Job, Worker | Timesheets require valid job_id and worker_id |
| Expense | Job, Worker | Expenses require valid job_id; worker must be assigned to the job |
| Issue | Job, Worker, Site | Issues require job_id and site_id; worker must be assigned to job |
| Job | Site, Client | Jobs require active site_id and valid client_id |
| Site | Client | Sites require valid client_id |
| Financial Record Correction | All Financial Record types | Corrections reference specific financial record IDs |
| PayrollRecord | TimesheetEntry, Worker | PayrollRecord aggregates TimesheetEntry records by worker and period |
| InvoiceLineItem (billable) | ExpenseEntry, Job | Created when billable expense is approved |
| Rejection (universal) | All submission types | Applies to all submissions entering Review Centre |

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

### Approval Invariants

7. **Automation may never approve.** No automation rule, workflow, or scheduler may approve any submission type. Human approval is mandatory.
8. **Rejection always records a reason.** No exception. No default reason. No bypass.
9. **A rejected submission is never deleted.** It is retained permanently in the audit trail.
10. **A rejected submission's content is frozen at rejection.** It cannot be modified after rejection.

### Structural Invariants

11. **A job must have a site.** No job without a valid `site_id`.
12. **A site must have a client.** No site without a valid `client_id`.
13. **A timesheet must derive from a shift.** No standalone timesheet creation.
14. **A worker may not have two in_progress shifts simultaneously.** Single active shift per worker at all times.
15. **An expense submission requires positive amount.** Zero-value expenses are invalid.

### Data Isolation Invariants

16. **Demo company data must never appear in a real-business company context.** Company context is enforced at every data query across all domains.
17. **Client portal data is scoped to the client's own sites and jobs only.** Cross-client data leakage is not permitted.
18. **Workers have no financial visibility.** Workers see submission outcomes (pending/approved/rejected) only, never financial record values.

### Lifecycle Invariants

19. **A closed job accepts no new submissions.** New shifts, expenses, reports, and issues may not be created against a closed job.
20. **A job cannot be financially closed with pending submissions.** All submissions must be approved or rejected first.
21. **The correction window for rejected submissions closes when the job closes.** Resubmissions against a closed job are blocked.
22. **`archived` site status is irreversible.** No un-archive action exists.

---

## RBAC SUMMARY

| Role | Jobs | Sites | Workers | Submissions (Submit) | Submissions (Approve) | Financial Records | Corrections | Issue Acknowledgement |
|---|---|---|---|---|---|---|---|---|
| CEO | Full | Full | Full | No | All | Full | Approve | Yes |
| PM | Own jobs | Assigned sites | Own jobs' workers | No | Own jobs (within limits) | Own jobs | Request only | Yes (own jobs) |
| Worker | Assigned (limited) | Address + access notes only | No | Yes (own) | No | No | No | No |
| Client | Own sites' jobs (portal) | Own sites (portal) | No | No | No | Limited (invoice/financial summary only) | No | No |

---

## BACKEND PLANNING PREREQUISITES

Before backend domain specification begins, confirm the following decisions are final (all confirmed in this session):

| # | Decision | Status | Domain Document |
|---|---|---|---|
| 1 | Expense intake model (fields, categories, receipt rules) | FROZEN | EXPENSE_DOMAIN.md |
| 2 | Rejection lifecycle for all submission types | FROZEN | REJECTION_DOMAIN.md |
| 3 | Financial record immutability model (append-only corrections) | FROZEN | FINANCIAL_RECORD_CORRECTION_DOMAIN.md |
| 4 | Shift-to-timesheet relationship (auto-created at shift end) | FROZEN | TIMESHEET_DOMAIN.md |
| 5 | Job completion definition (PM declares operational; CEO confirms financial) | FROZEN | JOB_DOMAIN.md |
| 6 | Demo data isolation as a platform invariant | FROZEN | Domain Invariant #16 |
| 7 | Worker rate model (worker profile base + job assignment override) | FROZEN | TIMESHEET_DOMAIN.md |
| 8 | Approval authority by submission type | FROZEN | Approval Models (this document) |
| 9 | Site as first-class entity (Client → Site → Job hierarchy) | FROZEN | SITE_DOMAIN.md |
| 10 | Issue domain classification (operational communication, not financial event) | FROZEN | ISSUE_DOMAIN.md |
| 11 | Client portal provisioning model | PARTIAL — see note below |
| 12 | Expense approval authority and thresholds | FROZEN | EXPENSE_DOMAIN.md |
| 13 | Report-to-financial-record normalization map | PARTIAL — see note below |
| 14 | Worker employment classification model | PARTIAL — see note below |

### Notes on Remaining Partial Decisions

**Decision 11 — Client Portal Provisioning:**
The Site Domain establishes that client portals are scoped to client-owned sites and that client access is provisioned from the main Ledger platform (CEO-controlled). The provisioning workflow (create portal account, send credentials, manage scope) is a UI/authentication implementation concern that has not yet been defined as a domain. This must be defined before authentication infrastructure is built. It does not block core operational domain backend work.

**Decision 13 — Report-to-Financial-Record Normalization Map:**
Worker Reports are a distinct submission type separate from Timesheets and Expenses. What financial records a Report approval creates is not fully defined in this session. A Report may embed timesheet data, expense items, and materials-used (inventory) simultaneously, or it may be a standalone operational record that creates no financial records directly. The Report Domain must be defined before the Review Centre normalization engine can be specified for Reports. Timesheet and Expense backend work is unblocked.

**Decision 14 — Worker Employment Classification:**
Workers in v1 are treated as employees (timesheet-based payroll). Subcontractors are handled as expense submissions (category: `subcontractor`) per the Expense Domain. A formal worker employment classification model (distinguishing Employee, Contractor, Subcontractor at the worker profile level) is not required for the initial backend build of the timesheet and expense domains, but it will become necessary before payroll export targets can be differentiated by worker type.

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
| Worker Reports | PARTIAL | Report Domain not yet defined |
| Client Portal | PARTIAL | Provisioning model not yet defined |
| Worker Employment Classification | PARTIAL | Classification model not yet defined |
| Scheduling | PARTIAL | Unit of scheduling and conflict rules not yet defined |
| Notifications | PARTIAL | Delivery channels not yet defined |
| Stock | PARTIAL | Approval rules and cost model not yet defined |
| Assets | PARTIAL | Assignment exclusivity and financial valuation not yet defined |
| Client Requests | NO | Domain not yet defined |

---

## WHAT CAN BEGIN IMMEDIATELY

The following backend work may begin from this session's frozen domains:

1. **Job schema and lifecycle engine** — complete state machine, all fields, all transitions, all constraints
2. **Site schema and lifecycle engine** — complete entity model, client→site→job hierarchy
3. **Shift recording and timesheet creation engine** — shift → timesheet derivation, rate resolution, offline queue
4. **Timesheet Review Centre integration** — pending_review → approved → TimesheetEntry normalization
5. **Expense submission intake** — all fields, categories, receipt logic, billable flag
6. **Expense Review Centre integration** — approval authority, billable → InvoiceLineItem creation
7. **Issue log submission and acknowledgement workflow** — all severity levels, escalation triggers
8. **Rejection lifecycle engine** — universal across all submission types
9. **Financial record correction engine** — void and adjustment records, CEO-only approval
10. **Audit log schema** — universal audit entry model, all entry types across all domains

---

## FINAL STATEMENT

The Domain Definition Session of June 4, 2026 has produced seven frozen domain documents that together resolve the ten highest-risk undefined concepts identified in the Domain Definition Audit. The core operational workflow of The Ledger — from worker field activity through submission, review, approval, and financial normalization — is now fully specified at the business domain level.

Backend domain specification may begin.

**The Ledger's central doctrine is preserved in all frozen domains:**

Nothing becomes financially real until approved. Approval is human. Audit is universal. Job attribution is mandatory. Financial records are immutable. Corrections are append-only. The Review Centre governs all financial reality.
