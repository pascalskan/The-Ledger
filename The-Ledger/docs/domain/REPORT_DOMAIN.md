# THE LEDGER — REPORT DOMAIN

## Frozen Domain Definition

Version: 1.0
Status: FROZEN
Date: June 4, 2026
Authority: Domain Definition Session — June 4, 2026

---

## STATUS

This document is the authoritative definition of the Report Domain in The Ledger.

Every decision recorded here is final. Ambiguities identified in the Domain Definition Audit regarding worker reports — what they are, what financial records their approval creates, and their relationship to timesheets, expenses, and inventory — have been resolved.

This document supersedes any prior partial definitions, audit findings, or implementation assumptions regarding worker reports.

Backend planning for the Report Domain may begin from this document.

The normalization engine for worker reports may be specified from this document.

---

## THE CORE DECISION: WHAT IS A WORKER REPORT?

A worker report is a structured operational completion record submitted by a worker at the conclusion of a job visit, capturing:

1. A narrative summary of the work performed
2. Materials drawn from company stock during the visit
3. Company equipment used during the visit
4. Quality observations and site conditions
5. Photographic evidence

A worker report is **not** a timesheet. Timesheets are derived automatically from shifts (shift start → shift end = timesheet created). They are a separate domain and a separate submission type.

A worker report is **not** an expense submission. Expenses are separate submissions covering out-of-pocket costs incurred by the worker. Workers who incur a cost during a job submit an expense separately via the Expense Domain.

A worker report is the operational record of **what was done** at the site. Timesheets record **time**. Expenses record **out-of-pocket cost**. Reports record **work content**.

**Decision rationale:** Combining timesheets, expenses, and materials usage into a single "report" submission creates a complex, overloaded object with multiple approval paths and mixed financial normalization rules. Separating them preserves domain clarity: the timesheet system captures labour time through the shift mechanism, the expense system captures variable out-of-pocket costs, and the report system captures operational activity and materials/equipment consumption. Each domain has its own intake, its own normalization map, and its own review responsibility. The reviewer approving a report should focus on: did the work happen, were the materials plausibly used, was the equipment correctly recorded? These are distinct from: were the hours correct (timesheet) or is this receipt legitimate (expense)?

---

## IS A REPORT A CONTAINER?

A report is a **bounded container** for the operational output of a single job visit. It contains:

- A work completion summary (narrative)
- A list of stock items consumed (zero or more)
- A list of equipment items used and duration (zero or more)
- Quality assessment observations (optional, structured)
- Photo attachments (optional, max 10)

The container model is chosen over a flat record model because a single job visit can produce multiple inventory mutations and equipment usage records simultaneously, all of which require a single review and approval decision. Splitting these into separate submissions per item would create submission volume that is unmanageable in practice (a worker who used 5 cleaning products from stock would generate 5 separate submissions for a single visit).

**Decision:** The report is the submission unit. Approval of the report approves all items within it simultaneously. Individual items within the report cannot be selectively approved or rejected — the entire report is approved or rejected as a unit.

---

## REQUIRED FIELDS

Every worker report must contain:

| Field | Type | Required | Notes |
|---|---|---|---|
| `job_id` | Foreign key | Always | The job this report is for |
| `worker_id` | Foreign key | System | The submitting worker |
| `shift_id` | Foreign key | Always | The shift this report is associated with — see Shift Relationship below |
| `work_summary` | Text, max 2000 chars | Always | Narrative of work performed during the visit |
| `stock_items_used` | Array (StockUsageItem) | Optional | Zero or more items drawn from company stock |
| `equipment_items_used` | Array (EquipmentUsageItem) | Optional | Zero or more company equipment items used |
| `qa_observations` | Array (QAObservation) | Optional | Quality or site condition observations |
| `photo_attachments` | File references (max 10) | Optional | Supporting photos |
| `created_at` | Timestamp | System | |

A report without any stock or equipment items is valid. A work summary is the minimum viable report.

---

## SHIFT RELATIONSHIP

Every report is associated with a specific shift. The shift provides the time context for the report.

Rules:
- One shift produces at most one report.
- A report cannot be submitted without an associated shift.
- The shift must be in `ended` or `submitted` status (the worker has already completed their time entry before submitting the report).
- A report may be submitted after the timesheet has been submitted (the two are independent submissions derived from the same shift).

**Decision:** The shift association ties the report to the same job and time window as the corresponding timesheet. It prevents a worker submitting a report against a job shift they did not work. The report and the timesheet are siblings derived from the same shift — they are reviewed independently in the Review Centre, but their common shift reference creates the operational context that links them.

**The report does not replace the timesheet. The timesheet and the report are always separate submissions, both derived from the shift, reviewed independently.**

---

## STOCK USAGE ITEMS (within report)

A stock usage item records that the worker drew one or more units of a stock item from company-held inventory during the visit.

### StockUsageItem Fields

| Field | Type | Required | Notes |
|---|---|---|---|
| `stock_item_id` | Foreign key | Always | The specific stock item from the company's stock catalogue |
| `quantity_used` | Decimal, positive | Always | Units consumed |
| `unit` | String | Always | Derived from the stock item record (e.g., litres, units, bags) |
| `notes` | String, max 200 chars | Optional | Free-text note (e.g., "used for deep clean of ablution block") |

Stock items may only be selected from the company's active stock catalogue. Workers cannot free-text material names — they must select from the existing stock list. This ensures that inventory deductions are traceable to known stock records and that the financial cost per unit can be resolved at approval time.

If a worker used a material that is not in the company's stock catalogue, the appropriate mechanism is an expense submission (category: `materials`), not a report stock usage item.

---

## EQUIPMENT USAGE ITEMS (within report)

An equipment usage item records that the worker used a company-owned asset during the visit.

### EquipmentUsageItem Fields

| Field | Type | Required | Notes |
|---|---|---|---|
| `asset_id` | Foreign key | Always | The specific company asset from the asset register |
| `duration_minutes` | Integer, positive | Always | Duration of use in minutes |
| `notes` | String, max 200 chars | Optional | Free-text note about how the asset was used |

Assets may only be selected from the company's active asset register. Workers cannot free-text equipment names.

Equipment usage duration is the basis for EquipmentUsageRecord cost attribution. The cost rate per hour/day is defined on the asset record and applied at normalization time.

---

## QA OBSERVATIONS (within report)

Quality assurance observations are structured operational notes about site conditions encountered during the visit.

### QAObservation Fields

| Field | Type | Required | Notes |
|---|---|---|---|
| `observation_type` | Enum | Always | See QA Observation Types |
| `description` | String, max 500 chars | Always | What was observed |
| `photo_refs` | File references (max 3) | Optional | Supporting photos for this specific observation |

### QA Observation Types

| Type | Code | Covers |
|---|---|---|
| Work Completed | `completed` | Section of work confirmed done |
| Work Incomplete | `incomplete` | Section of work not completed — reason noted |
| Site Condition | `site_condition` | Observation about site cleanliness, condition, or access |
| Client Asset Condition | `client_asset` | Observation about condition of client-owned asset or fixture |
| Defect Found | `defect` | Defect or damage discovered during the visit |
| Safety Note | `safety` | Safety condition observed (non-emergency — emergency safety issues go through Issue Domain) |

QA observations are informational records. They are retained in the audit trail but do not create financial records. They are available for operational reporting and client-facing documentation (selected observations may be shared with clients via the portal, at PM discretion).

---

## REPORT SUBMISSION LIFECYCLE

```
Worker ends shift
    → Timesheet submitted automatically (Timesheet Domain)
    → Worker creates report submission (separate act)
        → Selects stock items used (if any)
        → Selects equipment items used (if any)
        → Writes work summary
        → Adds QA observations (optional)
        → Attaches photos (optional)
    → Report enters offline queue
    → Report enters Review Centre (status: pending_review)
    → PM or CEO reviews
        → If approved:
            → InventoryMutation created for each stock_item_used entry
            → EquipmentUsageRecord created for each equipment_item_used entry
            → QA records stored (informational)
            → Worker notified: approved
            → Audit entry created
        → If rejected:
            → No financial records created
            → Rejection reason recorded
            → Worker notified: rejected with reason
            → Report status: rejected
            → Worker may correct and resubmit (Rejection Domain rules apply)
```

---

## REPORT-TO-FINANCIAL-RECORD NORMALIZATION MAP

This is the authoritative normalization map for the Review Centre normalization engine.

| Source Element | Trigger | Financial Record Created | Record Type |
|---|---|---|---|
| `stock_items_used[n]` (each entry) | Report approved | One `InventoryMutation` per stock usage item | Materials cost against job |
| `equipment_items_used[n]` (each entry) | Report approved | One `EquipmentUsageRecord` per equipment usage item | Equipment cost against job |
| `work_summary`, `qa_observations`, `photo_attachments` | Report approved | No financial record | Stored as operational/document record only |
| `report` (the entire report) | Report rejected | No financial record | Original report retained in audit trail |

**What report approval does NOT create:**
- `TimesheetEntry` — labour cost is handled by the Timesheet Domain, not the Report Domain
- `ExpenseEntry` — out-of-pocket costs are handled by the Expense Domain, not the Report Domain
- `InvoiceLineItem` — inventory and equipment costs are internal job costs; billing decisions are separate
- Any direct revenue record

**The Report Domain creates materials costs and equipment costs. Labour costs and out-of-pocket expense costs are always separate submissions.**

---

## FINANCIAL RECORDS CREATED BY AN APPROVED REPORT

### InventoryMutation

One `InventoryMutation` is created per stock usage item in the report.

| Field | Content |
|---|---|
| `mutation_id` | UUID |
| `job_id` | From report |
| `worker_id` | From report (the worker who used the stock) |
| `stock_item_id` | From the StockUsageItem |
| `quantity` | Negative (deduction from stock) |
| `unit_cost` | Resolved from stock item record at approval time — frozen on creation |
| `total_cost` | quantity × unit_cost |
| `approved_by` | User ID of approver |
| `approved_at` | Timestamp |
| `source_report_id` | The report that produced this mutation |
| `status` | `normalized` |

### EquipmentUsageRecord

One `EquipmentUsageRecord` is created per equipment usage item in the report.

| Field | Content |
|---|---|
| `eur_id` | UUID |
| `job_id` | From report |
| `worker_id` | From report |
| `asset_id` | From the EquipmentUsageItem |
| `duration_minutes` | From the EquipmentUsageItem |
| `cost_rate` | Resolved from asset record at approval time — frozen on creation |
| `total_cost` | duration_minutes / 60 × cost_rate (or cost_rate if defined as a flat per-use cost) |
| `approved_by` | User ID of approver |
| `approved_at` | Timestamp |
| `source_report_id` | The report that produced this record |
| `status` | `normalized` |

---

## APPROVAL AUTHORITY

| Condition | Approver |
|---|---|
| All worker reports | PM (scoped to their assigned jobs) or CEO |

There is no amount threshold for report approval. The PM who manages the job is responsible for verifying the report's operational content. The PM has the operational context to confirm whether the stock and equipment usage listed is plausible for the work described.

**Decision:** Report approval authority mirrors timesheet approval authority (PM on own jobs, CEO on all). Unlike expenses, reports do not have a financial threshold that escalates to CEO-only because the financial impact of report approval (materials and equipment cost) is a known, controlled cost type derived from the job's operational requirements — not a variable worker expense. The PM overseeing the job is the appropriate first-line reviewer.

---

## REJECTION OF REPORTS

Rejection of a report follows the Rejection Domain in full. The entire report is rejected as a unit. There is no mechanism to approve some items in a report and reject others.

If a report contains one invalid stock usage item alongside legitimate work summary and equipment records, the reviewer must reject the entire report with a reason explaining the problem. The worker corrects the report and resubmits.

**Decision rationale:** Partial approval of a container submission creates complex state management (which items are approved, which are pending, which are rejected, and what the report's overall status is). The simpler model — all or nothing — is preferred in v1. PMs are expected to communicate through the rejection reason exactly what needs to be corrected.

---

## RELATIONSHIP TO TIMESHEETS

| Dimension | Timesheet | Worker Report |
|---|---|---|
| Submission trigger | Automatic at shift end | Worker-initiated after shift |
| Financial records on approval | TimesheetEntry, PayrollRecord contribution | InventoryMutation (per stock item), EquipmentUsageRecord (per equipment item) |
| Content | Time, hours, rate, gross labour value | Work performed, materials used, equipment used |
| Review authority | PM (own jobs) or CEO | PM (own jobs) or CEO |
| Offline queue | Yes | Yes |
| Linked to shift | Yes (derived from shift) | Yes (associated with same shift) |
| Can exist without the other | Yes — a shift that used no stock or equipment produces no report | Yes — a shift produces a timesheet regardless of whether a report is submitted |

A worker may submit a report without a shift if the company permits stand-alone operational recording. However, in v1, every report must reference a shift. Stand-alone reports are not supported.

---

## RELATIONSHIP TO EXPENSES

Worker reports and expense submissions are entirely separate flows. They do not share data or approval.

A worker who bought materials from a trade counter (out of pocket) submits an **expense** (category: `materials`). The expense does not appear in the report.

A worker who drew materials from company-held stock records those in the **report** (stock usage items). These do not appear as an expense.

The two paths are mutually exclusive for a given material instance: it either comes from company stock (report → InventoryMutation) or was purchased out of pocket (expense → ExpenseEntry).

---

## RELATIONSHIP TO INVENTORY (STOCK DOMAIN)

When a report is approved, each InventoryMutation reduces the quantity available for the referenced stock item at the referenced location.

The InventoryMutation carries the unit cost from the stock item record at the time of approval. This unit cost is frozen on the InventoryMutation record. Subsequent changes to the stock item's unit cost do not retroactively affect approved InventoryMutation records.

The Stock Domain governs the stock catalogue, stock locations, and the stock deduction lifecycle. The Report Domain consumes Stock Domain data (the stock catalogue) and produces InventoryMutation records. See STOCK_DOMAIN.md.

---

## RELATIONSHIP TO ASSETS (ASSET DOMAIN)

When a report is approved, each EquipmentUsageRecord records the use of a specific company asset against a job.

The EquipmentUsageRecord carries the cost rate from the asset record at the time of approval. The cost rate is frozen on the record. Subsequent changes to the asset's cost rate do not retroactively affect approved EquipmentUsageRecord records.

The Asset Domain governs the asset register, asset assignment, and asset lifecycle. The Report Domain consumes Asset Domain data (the asset register) and produces EquipmentUsageRecord records. See ASSET_DOMAIN.md.

---

## REPORT SUBMISSION FREQUENCY

In v1, one report is submitted per shift. A worker who works three shifts in a week submits three reports (one per shift).

There is no periodic (weekly/monthly) report aggregation in v1. Reports are per-shift.

**Decision rationale:** Consistent with the per-shift timesheet model. The shift is the unit of work; the report is the operational record of that unit. Per-period report aggregation would require the report to span multiple shifts and multiple days, complicating the shift association model and the stock/equipment deduction attribution.

---

## OFFLINE RELIABILITY

Report submissions follow the same offline reliability doctrine as timesheets and expenses (Timesheet Domain, Constraint reliability; Expense Domain, Constraint 7).

Report data — work summary, stock items, equipment items, photos — is written to the offline queue at the moment of submission on the device and syncs when connectivity is restored.

Photo attachments are queued as binary data. If a photo attachment cannot be synced due to data loss, the report is still valid without the photo. The worker notes in the work summary that photos were taken but could not be attached.

---

## AUDIT REQUIREMENTS

Every report action generates an immutable audit entry.

| Action | Audit Entry Type |
|---|---|
| Report submitted | `report_submitted` |
| Report entered Review Centre | `report_pending_review` |
| Report approved | `report_approved` |
| Report rejected (with reason) | `report_rejected` |
| Report resubmitted after rejection | `report_resubmitted` |
| InventoryMutation created (per item) | `inventory_mutation_created` (one entry per stock item) |
| EquipmentUsageRecord created (per item) | `equipment_usage_recorded` (one entry per equipment item) |

All entries carry: `who`, `what`, `when`, `source_object_id` (report_id), `destination_object_id` (financial record ID if created), `external_reference` (job_id).

---

## RBAC

| Role | Can Submit | Can View Own | Can Approve | Can View All |
|---|---|---|---|---|
| Worker | Yes | Yes (own reports) | No | No |
| PM | No | No | Yes (own jobs) | Yes (own jobs only) |
| CEO | No | No | Yes (all) | Yes (all) |
| Client | No | No | No | No (selected QA observations may be shared — see Client Portal Domain) |

Workers see their submission status (pending/approved/rejected) and the rejection reason if rejected. Workers never see the financial value of InventoryMutation or EquipmentUsageRecord records created from their reports.

---

## CONSTRAINTS AND INVARIANTS

1. A report must be associated with a completed (ended) shift. Standalone reports are not supported in v1.
2. One shift produces at most one report. A worker cannot submit two reports for the same shift.
3. A report cannot be submitted against a closed job.
4. Stock items in a report must reference items in the company's active stock catalogue. Free-text material names are not permitted.
5. Equipment items in a report must reference assets in the company's active asset register. Free-text equipment names are not permitted.
6. Report approval is all-or-nothing. Partial approval of report contents is not supported in v1.
7. Approved InventoryMutation and EquipmentUsageRecord records are immutable. Corrections follow the Financial Record Correction Domain.
8. Report corrections (resubmissions) cannot be submitted against a closed job (Rejection Domain, Rule 10).
9. Demo company report data must never appear in a real-business company context.
10. The unit cost and cost rate applied to InventoryMutation and EquipmentUsageRecord records are frozen at approval time. Subsequent catalogue changes do not affect approved records.

---

## WHAT THIS DOMAIN DOES NOT COVER

- **Timesheet submission** — handled by the Timesheet Domain; shares the shift reference but is a separate submission
- **Expense submission** — handled by the Expense Domain; out-of-pocket costs are not part of report submissions
- **QA report as a standalone product** — in v1, QA observations are embedded in worker reports; a standalone QA report module with its own submission lifecycle is deferred
- **Client-facing completion certificates** — the mechanism for sharing report content (work summary, QA observations, photos) with a client through the portal is handled by the Client Portal Domain
- **Financial cost rate models for inventory and equipment** — the unit cost structure for stock items and the cost rate model for assets are defined in the Stock Domain and Asset Domain respectively
- **Report templates / checklists** — a structured checklist model for reports (where PMs define the checklist and workers complete it) is deferred to a future version; v1 uses free-text work summary + QA observations

---

## REPORT DOMAIN DECISIONS — SUMMARY TABLE

| Decision | Resolution |
|---|---|
| What is a worker report? | Operational completion record: work done, stock used, equipment used, QA observations, photos |
| Is a report a container? | Yes — one report per shift visit; contains multiple stock/equipment items |
| Does a report replace a timesheet? | No — timesheet is separate (shift→timesheet auto-creation); report is worker-initiated |
| Does a report replace an expense? | No — out-of-pocket costs are expense submissions; stock drawn from company inventory is in the report |
| Normalization on approval | InventoryMutation per stock item; EquipmentUsageRecord per equipment item |
| Does report approval create TimesheetEntry? | No |
| Does report approval create ExpenseEntry? | No |
| Does report approval create InvoiceLineItem? | No |
| Approval authority | PM (own jobs) or CEO — no amount threshold |
| Rejection model | All-or-nothing — entire report approved or rejected as a unit |
| Partial approval | Not supported in v1 |
| Shift association | Mandatory — one report per shift, cannot exist without a shift reference |
| Report submission timing | Worker-initiated after shift; separate from automatic timesheet creation |
| Offline reliability | Full offline queue support; photos queued as binary; report valid without photos if queued data lost |
| Stock item selection | From active stock catalogue only — no free-text |
| Equipment item selection | From active asset register only — no free-text |
| Financial record immutability | InventoryMutation and EquipmentUsageRecord are immutable after creation; corrections via Financial Record Correction Domain |
| Unit cost / cost rate frozen at | Approval time |
