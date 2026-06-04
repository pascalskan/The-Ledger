# THE LEDGER — FINANCIAL RECORD CORRECTION DOMAIN

## Frozen Domain Definition

Version: 1.0
Status: FROZEN
Date: June 4, 2026
Authority: Domain Definition Session — June 4, 2026

---

## STATUS

This document is the authoritative definition of the Financial Record Correction Domain in The Ledger.

Every decision recorded here is final. Ambiguities raised in the Domain Definition Audit have been resolved — specifically the foundational schema architecture decision between append-only correction records and in-place versioning with audit history.

This document supersedes any prior partial definitions, audit findings, or implementation assumptions regarding the correction or modification of approved financial records.

---

## THE CORE DECISION: APPEND-ONLY CORRECTIONS

Approved financial records in The Ledger are immutable. They are never modified in place.

When a correction is required, The Ledger creates a new correction record that references the original. The original record remains unchanged in the audit trail permanently.

**This is the append-only model. In-place versioning is rejected.**

**Decision rationale:** The Audit Doctrine requires that every financially relevant action be traceable: who, what, when, previous value, new value, source object. In-place versioning — modifying an existing record while storing the previous version — requires a versioning infrastructure on every financial record table and introduces the risk that the "current" record and the "historical" versions diverge in consistency. The append-only model is architecturally simpler and operationally cleaner: the original record always reflects what was approved, and the correction record always reflects what changed it. No versioning infrastructure is needed because no record is ever modified. The correction chain is the audit trail.

---

## WHAT IS A FINANCIAL RECORD?

Financial records are the immutable output of the approval workflow. They are created when a submission is approved in Review Centre. They include:

| Record Type | Source Submission |
|---|---|
| `TimesheetEntry` | Approved timesheet submission |
| `ExpenseEntry` | Approved expense submission |
| `InventoryMutation` | Approved inventory usage record |
| `EquipmentUsageRecord` | Approved equipment usage record |
| `InvoiceLineItem` | Approved billable item (or PM/CEO invoice creation action) |
| `FinancialMutation` | Any approved direct financial adjustment (CEO-created) |
| `PayrollRecord` | Aggregated from approved `TimesheetEntry` records |

All of these record types are subject to the correction rules in this domain.

---

## WHAT IS A CORRECTION?

A correction is a CEO-approved action that creates a new record that modifies the financial effect of an original approved financial record, while leaving the original record unchanged.

A correction is NOT:
- A deletion — original records are never deleted
- A rejection — rejection applies to submissions, not to approved financial records (see Rejection Domain)
- A modification of the original record — the original is immutable
- An automatic or automated action — corrections require CEO approval

There are two types of correction: **Void** and **Adjustment**.

---

## CORRECTION TYPE 1: VOID

A void is the complete reversal of an original financial record.

A void creates a **Void Record** — a correction record that exactly offsets the original record's financial values (signs reversed). The combined effect of the original record and its void record is zero financial impact.

### When to Use a Void

A void is used when the original financial record should not have been created at all. Examples:
- A timesheet was approved for the wrong job
- An expense was approved twice (duplicate submission processed in error)
- An inventory mutation was created against a job that has been cancelled
- A financial record was created by a system error

### Void Record Fields

A Void Record carries:
- `void_id` (UUID)
- `original_record_id` (the ID of the record being voided)
- `original_record_type` (the type of the original record)
- `job_id` (same as original)
- `amount` (negated value of the original)
- `void_reason` (mandatory free-text — what was wrong and why the record must be voided)
- `requested_by` (user ID of the person who identified the error and requested the void)
- `approved_by` (CEO user ID — always)
- `approved_at` (timestamp)
- `accounting_sync_status` (if original was synced — see Accounting Sync Impact below)

### Void Approval Authority

Only the CEO may approve a void. There are no exceptions.

**Decision rationale:** A void reverses the financial reality of an approved record. This is the most significant governance action in The Ledger's financial layer. Only the CEO has the authority to declare that something that was financially approved should not have been. PMs can identify errors and request a void, but they cannot approve one.

### Void Request Workflow

```
PM or CEO identifies error in approved financial record
    → Creates void request (populates reason, references original record)
    → If requester is not CEO:
        → Void request enters Financial Controls queue (status: pending_approval)
        → CEO reviews void request
            → If approved: Void Record created, original record status updated
            → If rejected: Void request archived; original record unchanged
    → If requester is CEO:
        → CEO may approve own void request immediately
        → Void Record created
```

---

## CORRECTION TYPE 2: ADJUSTMENT

An adjustment is a partial correction of an original financial record where the original was created correctly in principle but one or more values were wrong in amount.

An adjustment creates an **Adjustment Record** — a correction record that captures the difference between what was recorded and what should have been recorded.

### When to Use an Adjustment

An adjustment is used when the original financial record is valid in nature but contains incorrect values. Examples:
- A timesheet was approved with 8 hours but the worker only worked 7.5 hours
- An expense was approved with the wrong amount due to a data entry error
- An inventory mutation was approved for 10 units when only 8 units were used

### Adjustment Record Fields

An Adjustment Record carries:
- `adjustment_id` (UUID)
- `original_record_id`
- `original_record_type`
- `job_id`
- `original_value` (the value in the original record — frozen at correction time)
- `corrected_value` (what the value should be)
- `delta` (computed: corrected_value minus original_value — positive or negative)
- `adjustment_reason` (mandatory free-text)
- `requested_by`
- `approved_by` (CEO user ID — always)
- `approved_at`
- `accounting_sync_status`

### Adjustment Approval Authority

Only the CEO may approve an adjustment. Same rationale as void.

---

## ORIGINAL RECORD STATUS AFTER CORRECTION

When a void or adjustment is approved, the original record's status is updated to reflect the correction:

| Original Status | After Void | After Adjustment |
|---|---|---|
| `normalized` (pre-sync) | `voided` | `adjusted` |
| `synced` | `voided_post_sync` | `adjusted_post_sync` |

The original record's content — all field values — is never changed. Only the status field is updated to flag that a correction exists. The correction record carries all correction details.

---

## FINANCIAL EFFECT OF CORRECTIONS

### In Financial Explorer and Reporting

Financial records are reported at their **net corrected value**.

For a voided record: the record and its void cancel to zero. Both appear in the audit trail. Neither appears as a live figure in financial reporting (revenue, cost, payroll totals).

For an adjusted record: the corrected value is used in financial reporting. The adjustment delta is visible in the audit trail. The original value is preserved in the original record but is superseded by the adjustment for reporting purposes.

**Implementation rule:** Financial Explorer, job profitability calculations, payroll summaries, and all reporting surfaces must respect correction records. A query that returns financial totals must sum original values minus void deltas plus adjustment deltas. Queries that ignore correction records will produce incorrect financial figures.

### In the Job Mini-Ledger

The job mini-ledger reflects the net corrected financial position. A voided expense is not included in the job's cost total. An adjusted timesheet is reflected at its corrected gross value.

---

## ACCOUNTING SYNC IMPACT

### If the Original Record Has Not Yet Been Synced

If the original financial record has not been exported to the accounting system:
- The void or adjustment takes effect immediately in The Ledger
- The accounting system never receives the original record
- The accounting system receives only the corrected net position on next sync

### If the Original Record Has Already Been Synced

If the original financial record has already been synced to QuickBooks, Xero, or another accounting system:
- The void or adjustment takes effect in The Ledger
- A `sync_correction_required` flag is set on the correction record
- The next sync cycle attempts to push the correction to the accounting system
- The correction's `accounting_sync_status` tracks the correction sync lifecycle: `pending` → `synced` | `failed`

**The Ledger cannot automatically correct an accounting system record without the accounting system's cooperation.** Some accounting systems (QuickBooks, Xero) support API-based record correction or deletion. Others may require manual accounting system action. The accounting settings and sync engine must handle this per provider.

The audit trail records: what was originally synced, that a correction was created, and whether the correction has been synced to the accounting system. If the correction sync fails, it is flagged in the Reconciliation Centre for manual resolution.

**Decision:** The Ledger always creates its correction record regardless of whether the accounting sync succeeds. The correction is real in The Ledger from the moment of CEO approval. Whether the accounting system reflects it is a sync problem, not a correction domain problem.

---

## PAYROLL CORRECTION

If an approved `TimesheetEntry` is corrected after the relevant `PayrollRecord` has been exported:
- A void or adjustment is created against the `TimesheetEntry` as normal
- The `PayrollRecord` is flagged as `correction_pending`
- An audit entry is created: `payroll_record_correction_required`
- The company is notified that a previously exported payroll period contains a corrected entry

The platform does not re-export or modify the already-exported `PayrollRecord` automatically. Payroll corrections require human coordination with the payroll system. The Ledger's role is to record the correction and flag the affected payroll period — the reconciliation is external.

---

## CEO-ONLY CORRECTION AUTHORITY

All financial record corrections — void or adjustment — require CEO approval without exception.

**Reason:** Approved financial records are the platform's financial truth. Modifying financial truth is the most consequential action in the entire platform. CEO authority for all corrections is consistent with:
- The Financial Controls Doctrine: financial controls require CEO approval
- The Exception Resolution Doctrine: CEO has final authority over all exception resolutions
- The Job Mini-Ledger Doctrine: the CEO governs the financial integrity of all job records

PMs may identify errors. PMs may initiate void or adjustment requests. PMs may not approve corrections.

Workers have no visibility of corrections to approved financial records. Workers see their submission history (approved/rejected/pending). They do not see the financial record layer.

---

## CORRECTION REQUEST WORKFLOW

For CEO-initiated corrections:
```
CEO identifies error
    → CEO creates void or adjustment request (populates reason, values, references original)
    → CEO immediately approves own request
    → Correction record created
    → Audit entry: correction_approved_by_ceo
    → Original record status updated
```

For PM-initiated correction requests:
```
PM identifies error
    → PM creates correction request (void or adjustment, with reason)
    → Request enters Financial Controls queue (status: pending_approval)
    → CEO receives notification: financial_correction_requested
    → CEO reviews in Financial Controls
        → Approved: correction record created; original record status updated; PM notified
        → Rejected: request archived with reason; original record unchanged; PM notified
```

---

## AUDIT REQUIREMENTS

Every correction action generates an immutable audit entry.

| Action | Audit Entry Type |
|---|---|
| Correction request created (void) | `void_request_created` |
| Correction request created (adjustment) | `adjustment_request_created` |
| Correction approved by CEO | `correction_approved` |
| Correction rejected by CEO | `correction_rejected` |
| Accounting sync correction required | `accounting_sync_correction_required` |
| Accounting sync correction succeeded | `accounting_sync_correction_succeeded` |
| Accounting sync correction failed | `accounting_sync_correction_failed` |
| Payroll correction flag set | `payroll_record_correction_required` |

All entries carry: `who`, `what`, `when`, `source_object_id` (original record ID), `destination_object_id` (correction record ID), `external_reference` (job ID).

---

## RBAC

| Role | Can Request Void/Adjustment | Can Approve Void/Adjustment | Can View Correction History |
|---|---|---|---|
| Worker | No | No | No |
| PM | Yes (initiates request; cannot approve) | No | Corrections on jobs they are assigned to |
| CEO | Yes | Yes (all) | All |
| Client | No | No | No |

---

## CONSTRAINTS AND INVARIANTS

1. An approved financial record may never be modified in place. Only its `status` field is updated (to `voided` or `adjusted`) when a correction is applied.
2. A correction always creates a new correction record referencing the original. The original is never deleted.
3. Only the CEO may approve a correction. No exception, no delegation in v1.
4. A correction requires a mandatory written reason. Corrections without reasons are not permitted.
5. A void produces a correction record with the exact negation of the original record's financial values.
6. An adjustment produces a correction record carrying the delta between the original and corrected values.
7. Financial reporting at all levels must reflect net corrected values, not raw original values.
8. If the original record was synced to an accounting system, a `sync_correction_required` flag is set on the correction record.
9. Automation may not create, request, or approve corrections. Corrections are a human governance act.
10. Corrections are permanent. There is no "uncorrect" action. If a correction is found to be itself erroneous, a further correction of the correction is created, following the same rules.
11. Demo company correction records must never appear in a real-business company context.

---

## CORRECTION CHAIN

Corrections may themselves be incorrect, requiring further corrections.

Correction 1 corrects Original Record.
Correction 2 corrects Correction 1 (if Correction 1 was itself erroneous).

Each correction references its predecessor. The chain is walkable: from any record, all corrections and their corrections can be traced. The final net financial effect is the sum of all records in the chain.

There is no depth limit on correction chains. The platform does not prevent a correction from being corrected.

---

## WHAT THIS DOMAIN DOES NOT COVER

- **Submission rejection** — handled by the Rejection Domain; applies before approval, not after
- **Invoice adjustment after sending to client** — this is a commercial decision with separate workflow implications (credit note, revised invoice); deferred
- **Multi-currency correction accounting** — if the original record was in a non-GBP currency, the correction is in the same currency; conversion rate at time of correction is recorded; full multi-currency normalization deferred
- **Bulk corrections** — correcting multiple records in a single action is deferred; each record requires its own correction request

---

## FINANCIAL RECORD CORRECTION DOMAIN DECISIONS — SUMMARY TABLE

| Decision | Resolution |
|---|---|
| Immutability model | Append-only — original records never modified; corrections create new records |
| In-place versioning rejected? | Yes — explicitly rejected |
| Two correction types | Void (full reversal) and Adjustment (partial correction of values) |
| Approval authority | CEO only — no exceptions |
| PM authority | May initiate requests; may not approve |
| Reason mandatory? | Yes — always |
| Original record after correction | Content unchanged; status updated to `voided` or `adjusted` |
| Financial reporting reflects | Net corrected values |
| Accounting sync impact | Correction flagged as sync_correction_required; sync attempted on next cycle |
| Payroll correction | Flags affected PayrollRecord as correction_pending; external reconciliation |
| Corrections of corrections | Permitted; correction chain preserved |
| Deletion of financial records | Never — corrections only |
| Automation authority | None — corrections are human-only |
