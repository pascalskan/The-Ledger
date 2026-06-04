# THE LEDGER — TIMESHEET DOMAIN

## Frozen Domain Definition

Version: 1.0
Status: FROZEN
Date: June 4, 2026
Authority: Domain Definition Session — June 4, 2026

---

## STATUS

This document is the authoritative definition of the Timesheet Domain in The Ledger.

Every decision recorded here is final. Ambiguities raised in the Domain Definition Audit and Operational Reality Audit have been resolved. This document supersedes any prior partial definitions, audit findings, or implementation assumptions regarding shifts, timesheets, and payroll records.

Backend planning for the Timesheet Domain may begin from this document.

---

## FOUNDATIONAL DISTINCTION: SHIFT vs TIMESHEET

These are two distinct concepts that share a lifecycle relationship. They must never be conflated.

### What Is a Shift?

A shift is a worker's real-time operational time record. It records the fact that a worker was present and working on a job during a specific time window.

A shift is created by a worker's operational actions:
- **Shift Start:** The worker actively starts the shift timer against a specific job.
- **Shift End:** The worker actively ends the shift timer on that same job.

A shift belongs to the Worker Application layer. It is raw operational data. It is not a financial record. It cannot be synced to accounting. It cannot appear in payroll. It is the operational source event from which a timesheet is derived.

A shift contains:
- `worker_id`
- `job_id`
- `shift_start` (timestamp, UTC)
- `shift_end` (timestamp, UTC — populated on end)
- `status`: `in_progress` | `ended` | `submitted`
- `break_duration_minutes` (optional, worker-entered at shift end, default 0)
- `notes` (optional free-text, entered at shift end)
- `device_id` (for offline queue tracking)
- `offline_queued` (boolean — whether shift data was queued offline)

### What Is a Timesheet?

A timesheet is a structured financial record submission derived from a completed shift. It is the formal presentation of worked hours against a job, submitted for approval, which — upon approval — produces a financial record (labour cost against the job) and feeds into payroll.

A timesheet is created automatically when a worker ends a shift. The worker does not submit a separate timesheet. Ending a shift is the timesheet submission act.

A timesheet contains:
- All shift fields (inherited)
- `total_hours` (computed: shift_end minus shift_start, minus break_duration_minutes)
- `billable_hours` (defaults to `total_hours`; can be adjusted by PM/CEO during review, not by worker)
- `rate` (resolved at submission time — see Rate Model)
- `rate_source` (which rate tier was applied — see Rate Model)
- `gross_value` (computed: billable_hours × rate)
- `submission_status`: `pending_review` | `approved` | `rejected` | `withdrawn`
- `rejected_submission_ref` (if this is a resubmission — see Rejection Domain)
- `approved_by` (user ID, populated on approval)
- `approved_at` (timestamp, populated on approval)

**Decision rationale:** Requiring workers to end a shift AND then submit a separate timesheet doubles the worker action for the same operational event, creates the risk of shift data existing without a corresponding timesheet submission, and provides no governance benefit (the PM reviews the same data either way). The one-action model — end shift = submit timesheet — reduces worker friction, eliminates the orphaned-shift risk, and is operationally honest: when a worker ends a shift, the worked hours are a fact and should immediately enter the approval pipeline.

---

## SHIFT → TIMESHEET CREATION RULES

### Trigger

A timesheet record is created automatically when a worker ends a shift (`shift_end` is recorded and `shift_status` transitions from `in_progress` to `ended`).

The timesheet is created in the same atomic operation as the shift end. If the shift end is captured offline, the timesheet creation is queued with it and completes when connectivity is restored.

### One Shift, One Timesheet

Each completed shift produces exactly one timesheet record. There is no batching of shifts into a weekly or periodic timesheet in v1.

**Decision rationale:** Weekly timesheets are operationally convenient for office workers who work fixed 9-to-5 schedules. For field workers on multiple jobs per day or week, a per-shift timesheet is more precise, easier to verify (the PM can confirm each job visit), and more consistent with the job-as-mini-ledger doctrine (each shift's cost is attributed to the specific job immediately).

Per-period (weekly/monthly) timesheet aggregation is deferred. v1 uses per-shift timesheets.

### Minimum Shift Duration

A shift must have a recorded duration of at least 1 minute to produce a valid timesheet. A shift ended within 1 minute of starting is flagged in Review Centre as a **minimum duration warning**. The PM/CEO may approve or reject it. It is not automatically discarded.

### Open Shifts

If a worker's device loses power or connectivity while a shift is `in_progress`, the shift is not discarded. The shift_start is preserved in the offline queue. On reconnection, the worker is prompted to end the shift and record the actual end time (or confirm an estimated end time).

An open shift (started but not ended) does not produce a timesheet. Only completed (ended) shifts produce timesheets. A shift that is never ended is an operational anomaly that must be resolved by the worker before the shift appears in Review Centre.

**Decision:** The platform does not auto-close open shifts. A PM may manually mark a shift as closed (with an audit entry) if the worker is unreachable and the shift data must be resolved for payroll purposes. This PM action creates a timesheet with a `pm_closed` flag and generates an audit entry noting the manual closure.

---

## RATE MODEL

### Where the Rate Lives

The worker's pay rate resides on the **worker profile** as the base rate. This is the default rate applied to all timesheets for that worker.

A **job-level rate override** may be set by a PM or CEO on a specific job assignment, to reflect a different rate agreed for that job (e.g., a higher rate for specialist work or a lower rate for a standard maintenance visit).

Rate resolution order:
1. **Job assignment rate** — if a rate override has been explicitly set for this worker on this job.
2. **Worker profile base rate** — applied if no job assignment override exists.

The resolved rate is captured on the timesheet at the moment of submission (shift end). The timesheet carries the rate as a frozen value. Subsequent changes to the worker's profile rate or the job assignment rate do not retroactively affect submitted timesheets.

**Decision rationale:** Rate-at-submission-time is the operationally correct model. A timesheet submitted on 1 June must reflect the rate agreed on 1 June, not a rate changed on 15 June for future work. Freezing the rate at submission time ensures that the timesheet is a complete, self-contained record of the financial obligation at the time it was incurred.

### Rate Fields

| Field | Definition |
|---|---|
| `rate` | Decimal — hourly rate in base currency (GBP v1) |
| `rate_currency` | ISO 4217 — GBP in v1 |
| `rate_source` | Enum: `worker_profile` or `job_assignment_override` |

### Subcontractor Rate Handling

Workers classified as subcontractors (see Worker Domain — to be addressed separately) are outside the timesheet financial normalization model in v1. Subcontractor costs are processed as expense submissions (category: `subcontractor`) rather than timesheets. This prevents the platform from needing to handle self-billing or invoice-based payroll in v1.

---

## APPROVAL AUTHORITY

| Condition | Approver |
|---|---|
| All timesheets | PM (scoped to their assigned jobs) or CEO |

There is no amount threshold for timesheet approval. PMs may approve all timesheets on their assigned jobs. The CEO may approve any timesheet.

**Decision rationale:** Unlike expenses (which carry a £500 threshold for PM vs CEO authority), timesheets are a routine operational approval. A PM who manages the job knows which workers were present and for how long. Requiring CEO approval for timesheets would create a bottleneck on every pay cycle at any company with more than a handful of jobs. CEO visibility is preserved through the Financial Explorer and Dashboard KPIs, not through mandatory individual timesheet approval.

The CEO may choose to review and approve timesheets directly. This is a governance decision at the CEO level, not a platform constraint.

---

## BILLABLE HOURS ADJUSTMENT

A PM or CEO reviewing a timesheet may adjust the `billable_hours` field during review. This represents a situation where the total hours worked differs from the hours that should be charged to the job (e.g., the worker spent 30 minutes of an 8-hour shift on a different job, travel time is non-billable under the job contract).

Rules:
- `billable_hours` cannot exceed `total_hours`.
- `billable_hours` cannot be negative or zero.
- Any adjustment to `billable_hours` requires a written reason (entered during review, stored in the audit trail).
- The gross value (`billable_hours × rate`) is computed on the adjusted `billable_hours`.
- The worker's total hours (`total_hours`) remains unchanged in the record — it is the operational truth of time worked. Only `billable_hours` is adjusted for financial purposes.

---

## OVERTIME

The Ledger does not calculate overtime in v1.

The `total_hours` field captures actual hours worked. The `billable_hours` field captures hours to be financially attributed to the job. Both are passed to the payroll export as raw data.

Overtime rate calculation (1.5x, 2x, etc.) is applied downstream — by the payroll system or the company's finance function — using the exported timesheet data.

**Decision rationale:** Overtime rules vary significantly by jurisdiction, employment type, and individual contract terms. Implementing overtime calculation within The Ledger would require the platform to understand jurisdiction, employment type, and contracted hours per worker — data that is typically owned by an external HR/payroll system. In v1, The Ledger captures accurate time data and passes it downstream. Overtime calculation is the payroll system's responsibility.

---

## TIMESHEET SUBMISSION LIFECYCLE

```
Worker ends shift
    → Shift status: ended
    → Timesheet record created automatically (status: pending_review)
    → Offline queue (if no connectivity — queued and synced on reconnect)
    → Enters Review Centre (status: pending_review)
    → PM or CEO reviews
        → If approved:
            → TimesheetEntry financial record created (status: normalized)
            → PayrollRecord updated (worker's pending payroll for the period)
            → Worker notified: approved
            → Audit entry created
        → If rejected (see Rejection Domain):
            → No financial record created
            → Rejection reason recorded
            → Worker notified: rejected with reason
            → Submission status: rejected
            → Worker may correct and resubmit
                → New timesheet submission with rejected_submission_ref
                → New submission enters Review Centre
```

---

## FINANCIAL RECORDS CREATED BY AN APPROVED TIMESHEET

### Records Created

| Record Type | Created | Status on Creation |
|---|---|---|
| `TimesheetEntry` | Yes | `normalized` |
| `PayrollRecord` contribution | Yes | Added to worker's pending payroll for the period |

### TimesheetEntry Fields

- `job_id` (attribution — job mini-ledger)
- `worker_id`
- `shift_start`
- `shift_end`
- `total_hours`
- `billable_hours`
- `break_duration_minutes`
- `rate`
- `rate_source`
- `gross_value`
- `approved_by`
- `approved_at`
- `source_timesheet_id` (the timesheet submission that produced this record)
- `billable_hours_adjustment_reason` (populated only if billable_hours was adjusted during review)
- `pm_closed` (boolean — true if PM manually closed an open shift, with audit reference)

### PayrollRecord

A `PayrollRecord` is not created per-timesheet. Instead, each approved `TimesheetEntry` is aggregated into the worker's payroll for the relevant period (defined by the payroll export cycle — weekly or monthly in v1, configurable per company).

The `PayrollRecord` is a summary object that accumulates:
- All approved `TimesheetEntry` records for the worker within the period
- Total hours worked
- Total gross value
- Status: `pending_export` | `exported`

Payroll export produces the `PayrollRecord` as a data artifact. The Ledger does not pay workers. It exports payroll data.

---

## PAYROLL RELATIONSHIP

The Ledger is a payroll data capture and export system. It is not a payroll calculation engine.

The Ledger:
- Captures shift times accurately
- Applies the resolved rate to compute gross value
- Aggregates approved timesheets into payroll-period summaries
- Exports payroll data in a structured format

The Ledger does not:
- Calculate overtime rates
- Apply statutory deductions (PAYE, NI, pension)
- Process payroll payments
- Connect to banking systems

The downstream payroll system (or the company's finance function using the export) is responsible for all calculations beyond gross hours × rate.

---

## TIMESHEET AMENDMENT AFTER APPROVAL

An approved `TimesheetEntry` is immutable. It cannot be modified.

If an approved timesheet contains an error (wrong hours, wrong rate, wrong job attribution), the correction is handled through the **Financial Record Correction Domain** — not through the timesheet submission/approval workflow.

The timesheet submission that produced the `TimesheetEntry` is also immutable after approval. The submission is the source evidence for the financial record.

**Decision:** There is no "amend timesheet" action within the timesheet domain. Corrections to approved records follow the Financial Record Correction Domain rules without exception.

---

## TIMESHEET AMENDMENT AFTER PAYROLL EXPORT

If a `TimesheetEntry` has been included in a payroll export (`PayrollRecord.status: exported`), any subsequent correction through the Financial Record Correction Domain must flag the affected payroll export as `correction_pending`.

The platform generates an audit entry noting that payroll data previously exported may be affected by the correction. The company is responsible for reconciling the correction with the payroll system. The Ledger records the event; the reconciliation is external.

---

## CORRECTION AND RESUBMISSION

If a timesheet is rejected, the worker creates a corrected timesheet submission. The correction rules from the **Rejection Domain** apply in full.

A corrected timesheet resubmission is pre-populated with the rejected timesheet's fields. The worker may adjust hours (only `total_hours` is editable — the worker cannot adjust `billable_hours`, which is the reviewer's domain), notes, and break duration. All other fields are carried forward.

The corrected submission creates a new record with `rejected_submission_ref` pointing to the rejected timesheet. The original rejected timesheet is unchanged.

---

## JOB ATTRIBUTION

Every timesheet must be attributed to a specific job. A timesheet without a job ID is invalid. Timesheets inherit job attribution from the shift that produced them.

A worker may only start a shift against a job they are currently assigned to. This constraint ensures that every timesheet carries valid job attribution at creation time.

---

## AUDIT REQUIREMENTS

Every timesheet action generates an immutable audit entry.

| Action | Audit Entry Type |
|---|---|
| Shift started | `shift_started` |
| Shift ended (timesheet created) | `shift_ended_timesheet_created` |
| Timesheet entered Review Centre | `timesheet_pending_review` |
| Timesheet approved | `timesheet_approved` |
| Timesheet rejected (with reason) | `timesheet_rejected` |
| Billable hours adjusted during review | `timesheet_billable_hours_adjusted` |
| Timesheet resubmitted | `timesheet_resubmitted` |
| PM manually closed open shift | `shift_pm_closed` |

All audit entries carry: `who`, `what`, `when`, `source_object_id`, `destination_object_id` (financial record ID if created), `external_reference` (job ID).

---

## RBAC

| Role | Can Start/End Shift | Can Submit Timesheet | Can View Own | Can Approve | Can View All |
|---|---|---|---|---|---|
| Worker | Yes | Yes (via shift end) | Yes (own only) | No | No |
| PM | No | No | No | Yes (own jobs) | Yes (own jobs only) |
| CEO | No | No | No | Yes (all) | Yes (all) |
| Client | No | No | No | No | No |

Workers see their submission status (pending/approved/rejected) and the rejection reason if rejected. Workers never see the financial value of the `TimesheetEntry` (gross value, rate used for payroll calculation). They see only operational outcome.

---

## OFFLINE RELIABILITY

Shift data — shift start, shift end, break duration — must survive device restart and connectivity loss. These events are written to the offline queue at the moment they occur on the device.

The offline queue for shifts and timesheets follows the same reliability doctrine as the offline queue for expense submissions (Expense Domain, Constraint 7). Shift data is more critical than any other worker-submitted data because it is the primary source of payroll.

If the offline queue is lost (data loss, device failure), the worker must report the shift manually to their PM. The PM may manually create a shift record with `pm_closed: true` and the audit entry noting that the data was manually entered following device failure. Manual PM entry is the only recovery path for lost shift data.

---

## CONSTRAINTS AND INVARIANTS

1. A timesheet must have a completed (ended) shift as its source. There is no standalone timesheet creation — timesheets are always derived from shifts.
2. A timesheet must have a positive `total_hours` value. The shift end must be after the shift start.
3. A worker may not have two `in_progress` shifts simultaneously (against any job). Only one shift at a time per worker.
4. A worker may only start a shift against a job they are currently assigned to.
5. The rate applied to a timesheet is frozen at submission time. Rate changes after submission do not affect the submitted timesheet.
6. Approved `TimesheetEntry` records are immutable. Corrections follow the Financial Record Correction Domain.
7. Timesheet corrections (resubmissions) cannot be submitted against a closed job.
8. `billable_hours` may only be adjusted by a PM or CEO during review, not by the worker.
9. Payroll export does not delete or modify `TimesheetEntry` records. Records remain in The Ledger after export.
10. Demo company timesheet data must never appear in a real-business company context. Company context must be enforced at every timesheet query.

---

## TIMESHEET DOMAIN DECISIONS — SUMMARY TABLE

| Decision | Resolution |
|---|---|
| What is a shift? | Real-time operational time record: worker starts/ends against a job |
| What is a timesheet? | Financial submission derived from a completed shift; enters Review Centre for approval |
| Shift → timesheet relationship | One completed shift = one timesheet, created automatically at shift end |
| Worker submits separate timesheet? | No — ending a shift is the timesheet submission act |
| Rate model | Worker profile base rate; job assignment override takes precedence |
| Rate frozen at | Submission time (shift end) |
| Overtime calculation | Not in v1 — raw hours exported downstream |
| Approval authority | PM (own jobs) or CEO — no amount threshold |
| Billable hours adjustment | PM/CEO may adjust during review; requires reason; worker sees total_hours only |
| Amendment after approval | Via Financial Record Correction Domain only |
| Payroll role | Capture and export only — not a payroll calculator |
| Per-shift vs per-period timesheets | Per-shift in v1 |
| Open shift recovery | Worker prompted to end; PM may manually close with audit entry |
| Offline reliability | Shift data must survive device restart — same doctrine as expenses |
| Worker visibility | Submission status and rejection reason only; no financial values |
| Timesheet corrections (resubmissions) | New submission with rejected_submission_ref; original unchanged |
| Subcontractors | Submitted as expense (category: subcontractor), not as timesheets in v1 |
