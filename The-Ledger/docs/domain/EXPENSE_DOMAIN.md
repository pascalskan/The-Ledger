# THE LEDGER — EXPENSE DOMAIN
## Frozen Domain Definition

Version: 1.0
Status: FROZEN
Date: June 4, 2026
Authority: Domain Definition Session — June 4, 2026

---

## STATUS

This document is the authoritative definition of the Expense Domain in The Ledger.

Every decision recorded here is final. Ambiguities raised in the Domain Definition Audit have been resolved. This document supersedes any prior partial definitions, audit findings, or implementation assumptions regarding expenses.

Backend planning for the Expense Domain may begin from this document.

---

## WHAT AN EXPENSE IS

An expense is an out-of-pocket cost incurred by a worker while performing work on an assigned job, which the company will either reimburse to the worker or bill to the client.

An expense is NOT:

- A wage or labour cost — those are timesheets
- A draw from company-held stock — that is an inventory mutation
- A formal vendor invoice — that is a vendor bill, outside The Ledger's current scope
- A subcontractor engagement with a formal purchase order — outside scope for v1

Expenses originate in field reality. A worker buys materials from a trade counter because the job requires them. A worker pays for parking at a site. A worker hires a day-rate subcontractor informally. These are expenses. They cost real money against the job. They must enter the approval chain before they become financially real.

---

## REQUIRED FIELDS

Every expense submission must contain all of the following fields.

| Field | Type | Required | Notes |
|---|---|---|---|
| Amount | Decimal, positive | Always | Minimum: £0.01 |
| Currency | ISO 4217 code | Always | Defaults to company base currency (GBP in v1) |
| Category | Enum (fixed taxonomy) | Always | See Category Taxonomy below |
| Date Incurred | Date | Always | The date the cost was incurred — not the submission date |
| Description | String, max 500 chars | Always | Brief description of what was purchased and why |
| Job Attribution | Job ID | Always | Selected from the worker's currently assigned jobs |
| Receipt | File attachment | Conditional | Required for amounts above £25. Optional at or below £25 |
| Billable to Client | Boolean | Always | Default: false |

No field may be omitted except Receipt (conditional). An expense submission that is missing any required field is invalid and must be rejected at the form level, not at the Review Centre level.

---

## CATEGORY TAXONOMY

Categories are fixed in v1. They are not configurable per company.

| Category | Code | Covers |
|---|---|---|
| Travel | `travel` | Fuel, mileage, parking, tolls, public transport fares |
| Accommodation | `accommodation` | Hotel, B&B, lodging for overnight field work |
| Materials | `materials` | Materials purchased at point of need not drawn from company stock |
| Tools & Equipment | `tools_equipment` | Small tools, consumables, hired equipment under £200 per item |
| Subcontractor | `subcontractor` | Informal day-rate subcontractor costs without a formal purchase order |
| Meals & Subsistence | `meals_subsistence` | Meals and refreshments during extended working periods |
| Communication | `communication` | Job-related phone calls, data costs, courier charges |
| Other | `other` | Catch-all for legitimate costs outside the above categories — description is mandatory |

**Decision rationale:** A fixed taxonomy is chosen over configurable categories because financial reporting requires consistent category aggregation across jobs. Free-text categories produce ungroupable financial data. Eight categories cover the realistic expense types for the target industries (field service, facilities management, cleaning, trade, construction, security). Configurability is deferred to a future version when the reporting layer can accommodate dynamic category structures.

---

## RECEIPT REQUIREMENT

| Amount | Receipt Status |
|---|---|
| £0.01 – £25.00 | Optional. Absence is permitted without override. |
| £25.01 and above | Required. Absence triggers a Review Centre flag. |

A Review Centre flag for a missing receipt is a **warning**, not a block. A PM or CEO may approve an expense without a receipt. The approval action in this case must include an **override reason** (mandatory free-text field that appears when the reviewer approves a flagged expense). The override reason is written to the audit log.

**Decision rationale:** Requiring a receipt for every expense, including a £3 parking charge or a £12 tube fare, creates daily friction for field workers and will cause workers to submit expenses late or not at all. The £25 threshold covers the vast majority of small incidental costs while still enforcing receipt accountability for anything above a meaningful value. The override-with-reason mechanism ensures large, receipt-less approvals are auditable rather than simply blocked (which PM-level blockage without CEO escalation would undermine operationally).

---

## BILLABLE EXPENSES

An expense may be marked as billable to the client.

**What "billable" means:** The expense cost will appear as a line item on the client's invoice rather than being absorbed as an internal job cost.

**Default:** Not billable (`billable_to_client: false`). Workers must explicitly opt in to billable marking.

**Approval authority for billable expenses:** CEO approval is always required for billable expenses, regardless of amount. A PM may not approve a billable expense. This is because billable expenses directly affect client invoices, which are a CEO-level financial governance decision.

**Financial effect of a billable expense upon approval:**
1. An `ExpenseEntry` cost record is created against the job (internal cost).
2. A pending `InvoiceLineItem` is created against the job, referencing the expense. Status: `pending_inclusion`.
3. The `InvoiceLineItem` must be explicitly included in an invoice by the PM or CEO before it reaches the client. Approval of the expense does not automatically add it to an invoice — it creates the line item in a pending state for deliberate inclusion.

**Decision rationale:** Billable expenses are a common field service pattern (client reimbursable costs, rechargeable materials). Separating the expense approval from the invoice inclusion decision preserves the PM/CEO's ability to choose which period's invoice includes the recharged cost. It also prevents a worker's expense submission from accidentally appearing on a client-facing document without explicit PM/CEO review.

---

## APPROVAL AUTHORITY

| Condition | Approver |
|---|---|
| Amount ≤ £500 AND not billable | PM (scoped to their assigned jobs) or CEO |
| Amount > £500 AND not billable | CEO only |
| Billable to client (any amount) | CEO only |

**Decision rationale:** A £500 threshold covers the routine field expense range (materials, tools, travel, accommodation for a night) without requiring CEO involvement for every small cost. The £500 figure is appropriate for the target business size (5–200 workers). Billable expenses always require CEO approval because they directly affect client invoices, which are a financial governance matter. PMs retain approval authority for non-billable operational expenses within their job scope, consistent with their defined responsibilities.

This threshold is implemented as a platform constant in v1. It is not configurable per company. Configurability is deferred.

---

## EXPENSE SUBMISSION LIFECYCLE

```
Worker creates expense submission
    → Offline queue (persisted locally, syncs when connectivity restored)
    → Review Centre queue (status: pending_review)
    → PM or CEO reviews
        → If approved:
            → ExpenseEntry financial record created (status: normalized)
            → If billable: InvoiceLineItem created (status: pending_inclusion)
            → Worker notified: approved
            → Audit entry created
        → If rejected:
            → No financial record created
            → Rejection reason recorded
            → Worker notified: rejected with reason
            → Submission status: rejected
            → Worker may correct and resubmit (creates new submission with
              rejected_submission_ref linking to original)
```

**Resubmission:** A corrected resubmission creates a new expense submission record. It carries a `rejected_submission_ref` field containing the ID of the rejected submission. The original rejected submission is retained in the audit trail. It is not deleted or overwritten.

**Correction window:** There is no time limit on resubmission. A worker may correct and resubmit a rejected expense at any time while the referenced job is still open.

---

## FINANCIAL RECORDS CREATED BY AN APPROVED EXPENSE

### Non-Billable Expense

| Record Type | Created | Status on Creation |
|---|---|---|
| `ExpenseEntry` | Yes | `normalized` |
| `InvoiceLineItem` | No | — |

The `ExpenseEntry` carries:
- `job_id` (attribution)
- `worker_id` (who incurred the cost)
- `amount`
- `currency`
- `category`
- `date_incurred`
- `description`
- `approved_by` (user ID of approver)
- `approved_at` (timestamp)
- `source_submission_id` (the expense submission that produced this record)
- `receipt_ref` (file reference, or null if below threshold and not provided)
- `receipt_override_reason` (populated only if receipt was required but missing and approved with override)

### Billable Expense

| Record Type | Created | Status on Creation |
|---|---|---|
| `ExpenseEntry` | Yes | `normalized` |
| `InvoiceLineItem` | Yes | `pending_inclusion` |

The `InvoiceLineItem` carries:
- `job_id`
- `source_expense_entry_id`
- `description` (copied from expense)
- `amount`
- `currency`
- `status`: `pending_inclusion`

---

## ADVANCE PAYMENTS

Not in scope for v1.

The Ledger handles expense reimbursement after the fact only. Workers incur a cost, submit the expense, and are reimbursed upon approval.

Pre-approved spend (petty cash floats, purchase orders) is outside the Expense Domain for this version. It does not exist in the platform. If a worker requires advance funds, that is handled through mechanisms outside The Ledger.

**Decision rationale:** Advance payments introduce a fundamentally different approval chain (approve before spending vs. approve after spending). Adding this to v1 doubles the domain complexity before the basic reimbursement chain has been built. The Approval Doctrine is cleaner when applied to a completed, known expenditure. Advance payments will be addressed in a future version.

---

## OWNERSHIP

| Stage | Owner |
|---|---|
| Submitted (pending) | Worker (submitter) |
| Under review | Reviewer (PM or CEO currently handling) |
| Approved | Job mini-ledger |
| Rejected | Worker (returnable for correction) |

After approval, the expense becomes a financial record owned by the job. The worker who submitted it retains read visibility of their submission history and the approval/rejection outcome. The worker cannot modify an approved expense. The worker cannot withdraw an approved expense. Approved financial records are immutable.

---

## AUDIT REQUIREMENTS

Every expense action generates an immutable audit entry. The following actions must be recorded:

| Action | Audit Entry Type |
|---|---|
| Expense submitted | `expense_submitted` |
| Expense entered Review Centre | `expense_pending_review` |
| Expense approved | `expense_approved` |
| Expense rejected (with reason) | `expense_rejected` |
| Expense resubmitted after rejection | `expense_resubmitted` |
| Receipt override used during approval | `expense_receipt_override` |
| Billable expense approved (invoice line created) | `expense_billable_approved` |

All audit entries carry: `who`, `what`, `when`, `source_object_id`, `destination_object_id` (financial record ID, if created), and `external_reference` (job ID).

---

## RBAC

| Role | Can Submit | Can View Own | Can Approve | Can View All |
|---|---|---|---|---|
| Worker | Yes | Yes (own submissions only) | No | No |
| PM | No | No | Yes (≤ £500, non-billable, own jobs) | Yes (own jobs only) |
| CEO | No | No | Yes (all) | Yes (all) |
| Client | No | No | No | No |

Workers never see financial records created from their expense submissions. They see submission status (pending, approved, rejected) only — not the financial value of normalized records or how the expense affects job margin.

---

## CONSTRAINTS AND INVARIANTS

1. An expense cannot be submitted against a job the worker is not currently assigned to.
2. An expense amount must be positive. Zero-value expenses are invalid.
3. A billable expense cannot be approved by a PM. The system must block PM approval of billable expenses at the engine level, not merely at the UI level.
4. An approved expense cannot be deleted, voided, or modified. Corrections require a new submission process (outside this domain — see Financial Record Correction Domain, to be defined).
5. The `date_incurred` cannot be in the future. Workers cannot pre-submit expenses for costs not yet incurred.
6. Demo company expense data must never appear in a real-business company context. Company context must be enforced at every expense query.
7. The offline queue must persist expense submissions through device restart and connectivity loss. Shift data reliability doctrine applies equally to expense submissions.
8. An expense submission may not be in two states simultaneously. State transitions are atomic.

---

## WHAT THIS DOMAIN DOES NOT COVER

The following are explicitly outside this domain definition and must be addressed separately:

- **Financial record correction / reversal** — What happens when an approved expense is later found to be erroneous. This requires a separate Financial Record Correction Domain definition.
- **Multi-currency normalization** — GBP is the base currency for v1. Expenses submitted in other currencies are accepted (the `currency` field exists) but normalization rules for currency conversion are deferred.
- **Expense report aggregation** — Whether workers can submit multiple expenses as a grouped "expense report" for a period is deferred. v1 handles individual expense submissions only.
- **Advance payments and purchase orders** — Explicitly deferred (see above).
- **Expense budgets per job** — Whether a job has an expense budget ceiling against which submitted expenses are tracked is not in scope for v1. The job mini-ledger will reflect accumulated expense costs, but enforcement of a budget ceiling is deferred.
- **Per-diem rules** — Whether the platform enforces daily subsistence limits (e.g., HMRC approved mileage rates, per-diem caps) is deferred.

---

## EXPENSE DOMAIN DECISIONS — SUMMARY TABLE

| Decision | Resolution |
|---|---|
| What is an expense? | Out-of-pocket worker cost against a job, requiring reimbursement or client billing |
| Required fields | Amount, Currency, Category, Date Incurred, Description, Job ID, Receipt (conditional), Billable flag |
| Category taxonomy | 8 fixed categories (travel, accommodation, materials, tools_equipment, subcontractor, meals_subsistence, communication, other) |
| Receipt threshold | Optional ≤ £25; Required > £25; Missing receipt above threshold = Review Centre warning, not block |
| Receipt override | Permitted with mandatory reason, generates audit entry |
| Billable expenses | Supported; default non-billable; billable creates pending InvoiceLineItem; CEO-only approval |
| PM approval threshold | ≤ £500, non-billable, on assigned jobs |
| CEO approval threshold | > £500 OR billable (any amount) |
| Advance payments | Out of scope for v1 |
| Approval → financial records | ExpenseEntry always; InvoiceLineItem if billable |
| Rejection lifecycle | Returns to worker with reason; worker corrects and resubmits; new record with rejected_submission_ref |
| Financial record immutability | Approved expenses are immutable; corrections via separate process (deferred domain) |
| Ownership post-approval | Job mini-ledger |
| Worker visibility of outcome | Submission status only (pending/approved/rejected); no financial record visibility |
| Offline persistence | Required — same invariant as shift data |
| Currency | GBP base in v1; multi-currency normalization deferred |
