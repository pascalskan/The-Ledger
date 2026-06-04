# THE LEDGER — JOB DOMAIN

## Frozen Domain Definition

Version: 1.0
Status: FROZEN
Date: June 4, 2026
Authority: Domain Definition Session — June 4, 2026

---

## STATUS

This document is the authoritative definition of the Job Domain in The Ledger.

Every decision recorded here is final. Ambiguities raised in the Domain Definition Audit have been resolved — specifically: what a job is, its state machine, completion definition, financial closure, and its relationships to sites, clients, and workers.

Backend planning for the Job Domain may begin from this document.

---

## WHAT IS A JOB?

A job is a single service engagement at a specific site for a specific client.

A job represents one bounded unit of work: a team of workers is deployed to a site, performs defined work, and that work is recorded, approved, and financially normalised against the job.

A job is NOT:
- A recurring service contract (a contract produces many jobs; one per visit)
- A multi-site engagement (each site has its own job)
- An administrative entity (a job requires a site, a client, and at least a scheduled date)

**The job is the primary financial attribution unit — the mini-ledger of The Ledger.** Every revenue event, cost, labour charge, expense, inventory deduction, equipment usage record, and invoice line item belongs to a job. Nothing financially significant exists without job attribution.

---

## JOB vs ENGAGEMENT vs VISIT

These terms are resolved as follows:

| Term | Meaning in The Ledger |
|---|---|
| Job | The formal platform entity — one service engagement at one site |
| Visit | Informal synonym for a job in recurring-service contexts — same entity |
| Engagement | The commercial relationship between client and company — expressed as a series of jobs at a client's sites |
| Project | Informal synonym for a job in project-based contexts — same entity |

There is one entity type: **Job**. Whether that job takes 2 hours or 2 months is not a structural distinction. All work is represented as jobs.

**Sub-jobs / child jobs:** Not supported in v1. Each job is a standalone entity. Parent-child job hierarchies are deferred.

---

## JOB FIELDS

| Field | Type | Required | Notes |
|---|---|---|---|
| `job_id` | UUID | System | Platform-generated |
| `company_id` | UUID | System | Multi-tenancy scoping |
| `client_id` | Foreign key | Always | The client this job is for |
| `site_id` | Foreign key | Always | The site where the job takes place (see Site Domain) |
| `title` | String | Always | Human-readable job name |
| `description` | Text | Optional | Scope of work description |
| `status` | Enum | System | See Job States below |
| `assigned_pm_id` | Foreign key | Always | PM responsible for this job |
| `scheduled_date` | Date | Always | The date the job is scheduled to begin |
| `scheduled_end_date` | Date | Optional | For jobs scheduled over multiple days |
| `workers` | Array of worker IDs | Optional at creation | Workers assigned to the job |
| `created_at` | Timestamp | System | |
| `created_by` | User ID | System | |
| `completed_at` | Timestamp | System | Populated when status transitions to `completed` |
| `closed_at` | Timestamp | System | Populated when status transitions to `closed` |
| `closure_notes` | Text | Optional | PM/CEO notes recorded at financial closure |

---

## JOB STATES

| Status | Meaning |
|---|---|
| `draft` | Job has been created but not yet scheduled or workers assigned — not visible in scheduling |
| `scheduled` | Job has a scheduled date and at least one worker assigned — appears in schedule |
| `active` | Job is in progress — at least one worker has started a shift against this job |
| `pending_closure` | Work is complete — PM has indicated the job is ready for financial closure review |
| `closed` | All financial records are normalised, all submissions resolved — job is financially complete |
| `cancelled` | Job was cancelled before or during work — no financial records normalised (or all voided) |

### State Transitions

```
draft → scheduled     (PM schedules the job and assigns workers)
scheduled → active    (any worker starts a shift against the job)
active → pending_closure  (PM declares work complete)
pending_closure → closed  (CEO confirms financial closure — all submissions resolved)
pending_closure → active  (PM finds a submission gap — work must continue or pending items resolved)
draft or scheduled → cancelled (PM or CEO cancels the job before or without workers starting)
active → cancelled    (CEO cancels an in-progress job — requires mandatory reason and audit entry)
```

**Decision:** `draft` and `scheduled` are distinct states to allow PMs to create jobs in advance without them appearing in active scheduling views until they are properly assigned. `pending_closure` separates the PM's operational completion declaration from the CEO's financial closure confirmation, preserving the two-step governance model.

### Who May Perform State Transitions?

| Transition | Authority |
|---|---|
| draft → scheduled | PM or CEO |
| scheduled → active | System (automatic — triggered by first shift start) |
| active → pending_closure | PM or CEO |
| pending_closure → closed | CEO only |
| pending_closure → active | PM or CEO |
| draft / scheduled → cancelled | PM or CEO |
| active → cancelled | CEO only |

**Decision:** Financial closure (`pending_closure → closed`) is CEO-only. The CEO signs off on the financial completeness of a job. This is consistent with the CEO's role as the platform's financial governance authority. The PM manages operational completion; the CEO confirms financial reality.

---

## JOB COMPLETION DEFINITION

### Operational Completion

A job is operationally complete when the PM declares that the work at the site has been finished. This is the PM's declaration that no further worker deployments are required for this job. The PM transitions the job to `pending_closure`.

**What operational completion does NOT require:**
- All submissions to be approved
- All financial records to be created
- An invoice to be raised

Operational completion is a statement about the work, not about the paperwork. The work is done. The financial records are still being processed.

### Financial Closure

A job is financially closed when the CEO confirms:
1. All submissions against the job have been resolved (approved or rejected). There are no `pending_review` submissions.
2. All approved financial records have been created and are visible in Financial Explorer.
3. The PM has declared operational completion (`status: pending_closure`).

Only when all three conditions are met may the CEO close the job.

**Financial closure is the CEO's governance action.** It represents the CEO's confirmation that the job's financial record is complete, accurate, and ready for final invoicing and accounting sync.

### Pre-Closure Checklist

Before the CEO can close a job, the platform must verify:
- No timesheets in `pending_review` status
- No expense submissions in `pending_review` status
- No report submissions in `pending_review` status
- No issue log cost requests in `pending_review` status
- Job status is `pending_closure`

If any pending submissions exist, the closure action is blocked. The platform surfaces the list of blocking pending items so the CEO can delegate resolution to the PM.

**Decision:** Automatic auto-approval of pending submissions at closure is not permitted. Closing a job does not resolve its pending submissions. Pending submissions must be explicitly approved or rejected before closure. This preserves the Approval Doctrine — nothing may become financially real without explicit approval.

---

## JOB FINANCIAL CLOSURE EFFECTS

When a job is closed:
1. Job status transitions to `closed`.
2. No further worker submissions may be created against this job (shift starts, expense submissions, report submissions, issue submissions).
3. No further correction submissions (resubmissions of rejected items) may be created against this job. Rejected submissions against a closed job remain in their `rejected` state permanently (consistent with Rejection Domain, Rule 10).
4. The job's financial records are frozen for reporting purposes. Financial record corrections (void/adjustment) may still be requested by the CEO after closure, following the Financial Record Correction Domain rules.
5. An audit entry is created: `job_closed`.

**After closure:**
- Financial record corrections remain possible (CEO-only, via Financial Record Correction Domain).
- Invoice creation remains possible — a closed job may still have its invoice raised or finalised.
- Historical records (timesheets, expenses, reports, issues) remain fully accessible in read-only mode.

---

## JOB CANCELLATION

### Before Any Worker Has Started

If a job is cancelled before any worker has started a shift (`status: draft` or `scheduled`):
- Job status transitions to `cancelled`.
- No financial records exist.
- Any pending submissions do not exist (no submissions can exist before a job is active).
- The job is retained in the audit trail.

### After a Worker Has Started (Active → Cancelled)

If a job is cancelled after work has begun (`status: active`):
- CEO-only action.
- Mandatory written reason required.
- All `pending_review` submissions must be resolved before the job can be cancelled. The CEO must reject or approve all pending submissions before cancellation. Cancellation does not auto-reject pending submissions.
- Any already-approved financial records must be voided by the CEO (via Financial Record Correction Domain) before or after cancellation.
- If financial records exist and are not voided, the job remains in the system with its financial records intact — the job is marked `cancelled` but its records are accessible for audit.
- An audit entry is created: `job_cancelled` (with mandatory reason).

---

## JOB OWNERSHIP

| Role | Ownership Meaning |
|---|---|
| PM | Operational owner — manages work execution, worker assignment, submissions review, declares operational completion |
| CEO | Financial owner — governs financial closure, corrections, invoicing decisions |
| Job mini-ledger | Once a job is active, all financial records created against it "belong to" the job |

PM assignment is per-job. A PM is assigned when the job is created and may be reassigned by the CEO. PM reassignment does not affect historical submissions or financial records — it only changes who receives future submissions for review.

---

## RELATIONSHIP TO SITE

Every job must have a `site_id`. A job cannot exist without a site.

Site relationship rules:
- A job may only be created against an `active` site.
- A job may not be created against an `inactive` or `archived` site.
- If a site is made `inactive` after a job is created at it, existing jobs at the site continue normally — only new job creation is blocked.
- The site's financial aggregation is derived from its jobs. Closing or archiving a site does not affect the financial records of its completed jobs.

---

## RELATIONSHIP TO CLIENT

Every job must have a `client_id` (inherited from the site). A job cannot exist without a client.

The client's financial reporting (total invoiced, total outstanding) is derived from the jobs attributed to their sites.

Client portal visibility is scoped to jobs at their own sites. The client sees only their own jobs.

---

## RELATIONSHIP TO WORKERS

Workers are assigned to jobs at the time of scheduling. The `workers` field on a job is an array of assigned worker IDs.

Worker assignment rules:
- A worker may only start a shift against a job they are assigned to.
- A worker may be assigned to multiple jobs (but may not have two active shifts simultaneously — Timesheet Domain Constraint 3).
- Worker assignment is set by the PM or CEO. Workers cannot self-assign to jobs.
- Adding a worker to a job after it is `active` is permitted (worker joins mid-job).
- Removing a worker from a job is permitted while no shift is `in_progress` for that worker on that job.

Worker visibility of job details:
- Assigned workers see the job title, site address, access notes, and their own submissions.
- Workers do not see financial data, margin indicators, or other workers' submissions.

---

## JOB AND INVOICING

Jobs are the unit of invoice generation. An invoice is issued against one or more jobs (or one job, depending on the invoicing model).

**Invoice creation is outside the Job Domain definition** — invoicing has its own engine and workflow. However, the Job Domain establishes:
- A job may have an invoice raised against it at any job status (`active`, `pending_closure`, `closed`).
- Invoicing a job does not close it. Job closure and invoice creation are independent actions.
- A closed job may still have its invoice finalised after closure.
- The job's total revenue (for margin reporting) is the sum of approved `InvoiceLineItem` records attributed to the job.

---

## JOB FINANCIAL RECORDS SUMMARY

The job mini-ledger aggregates:

| Record Type | Financial Dimension |
|---|---|
| `TimesheetEntry` | Labour cost |
| `ExpenseEntry` | Direct expense cost |
| `InventoryMutation` | Materials cost |
| `EquipmentUsageRecord` | Equipment cost |
| `InvoiceLineItem` (revenue) | Revenue |
| `InvoiceLineItem` (billable expense) | Revenue (reimbursable cost billed to client) |

Job financial health metrics (calculated from the above):
- Total Revenue
- Total Labour Cost
- Total Expense Cost
- Total Materials Cost
- Total Equipment Cost
- Total Cost
- Gross Margin = Total Revenue − Total Cost
- Gross Margin % = Gross Margin ÷ Total Revenue

All corrections (voids and adjustments) are reflected in net totals as defined by the Financial Record Correction Domain.

---

## AUDIT REQUIREMENTS

| Action | Audit Entry Type |
|---|---|
| Job created | `job_created` |
| Job scheduled | `job_scheduled` |
| Worker assigned to job | `job_worker_assigned` |
| Worker removed from job | `job_worker_removed` |
| Shift started (job activated) | `job_activated` (on first shift start) |
| Job declared pending closure | `job_pending_closure` |
| Job closed | `job_closed` |
| Job cancelled | `job_cancelled` |
| PM reassigned | `job_pm_reassigned` |
| Closure blocked (pending submissions) | `job_closure_blocked` |

All entries carry: `who`, `what`, `when`, `source_object_id` (job_id), `external_reference` (client_id and site_id).

---

## RBAC

| Role | Can Create | Can Edit | Can Assign Workers | Can Declare Pending Closure | Can Financially Close | Can Cancel (active) | Can View |
|---|---|---|---|---|---|---|---|
| Worker | No | No | No | No | No | No | Own assigned jobs (limited) |
| PM | Yes | Yes (own) | Yes (own) | Yes (own) | No | No | Own jobs |
| CEO | Yes | Yes (all) | Yes (all) | Yes (all) | Yes | Yes | All |
| Client | No | No | No | No | No | No | Own sites' jobs (portal) |

---

## CONSTRAINTS AND INVARIANTS

1. A job must have a `site_id`, a `client_id`, a `scheduled_date`, and an `assigned_pm_id`. A job cannot be created without all four.
2. A job cannot be financially closed while any submissions are in `pending_review` status.
3. `pending_closure → closed` is a CEO-only transition.
4. `active → cancelled` is a CEO-only transition, requiring a mandatory reason.
5. A job can only be created against an `active` site.
6. Workers may not start shifts against cancelled or closed jobs.
7. Rejected submissions cannot be corrected (resubmitted) against a closed job.
8. Financial record corrections (void/adjustment) may be initiated against a closed job's records, following the Financial Record Correction Domain.
9. A worker may be assigned to a job at any time while the job is in `draft`, `scheduled`, or `active` status.
10. Demo company job data must never appear in a real-business company context. Company context is enforced at every job query.

---

## JOB DOMAIN DECISIONS — SUMMARY TABLE

| Decision | Resolution |
|---|---|
| What is a job? | One service engagement at one site for one client |
| Job vs engagement vs visit | All the same entity — Job |
| Sub-jobs / hierarchies in v1 | Not supported — deferred |
| Job state machine | draft → scheduled → active → pending_closure → closed (see full state chart above) |
| Operational completion authority | PM or CEO |
| Financial closure authority | CEO only |
| Pre-closure requirement | All pending submissions resolved (approved or rejected) |
| Auto-approval at closure | Not permitted |
| Post-closure submissions | Not permitted (new shifts, expenses, reports, issues blocked) |
| Post-closure corrections | Permitted via Financial Record Correction Domain (CEO only) |
| Post-closure invoicing | Permitted |
| Job cancellation (pre-active) | PM or CEO, no pending submissions exist |
| Job cancellation (active) | CEO only; mandatory reason; all pending submissions must be resolved first |
| Relationship to site | Mandatory; job cannot exist without site |
| Relationship to client | Mandatory; inherited from site |
| Relationship to workers | Assigned at scheduling; workers cannot self-assign |
| Invoice creation | Independent of job closure; can occur at any status |
