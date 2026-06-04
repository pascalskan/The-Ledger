# THE LEDGER — WORKER CLASSIFICATION DOMAIN

## Frozen Domain Definition

Version: 1.0
Status: FROZEN
Date: June 4, 2026
Authority: Domain Definition Session — June 4, 2026

---

## STATUS

This document is the authoritative definition of the Worker Classification Domain in The Ledger.

Every decision recorded here is final. Ambiguities raised in the Domain Definition Audit regarding the distinction between employees, contractors, and subcontractors — and how classification affects timesheets, expenses, payroll, and financial normalization — have been resolved.

This document supersedes any prior partial definitions, audit findings, or implementation assumptions regarding worker employment classification.

Backend planning for the Worker Classification Domain may begin from this document.

---

## WHY CLASSIFICATION MATTERS

Worker employment classification affects:
1. **Payroll output** — how the TimesheetEntry data is interpreted for payroll processing
2. **Expense handling** — whether subcontractor costs are submitted as expenses
3. **Financial normalization** — which financial records are created and how they are treated
4. **Tax and compliance** — downstream payroll systems and accountants need to know worker classification to apply the correct tax treatment

The Ledger is not a payroll system. It captures and exports classification-aware data. The downstream payroll system or accounting function applies the appropriate tax treatment. The Ledger's responsibility is to record the classification accurately and carry it through to payroll export.

---

## THREE CLASSIFICATION TYPES

The Ledger recognises three worker classifications in v1.

### 1. Employee

An employee is a worker engaged directly by the company under an employment contract (permanent or fixed-term). Employees are paid through the company's payroll, subject to employer and employee payroll tax obligations (PAYE and National Insurance in the UK context).

**Timesheet relationship:** Employees submit timesheets (via shift end) in the standard way. TimesheetEntry records are created on approval. PayrollRecord aggregates TimesheetEntry records for payroll export. The payroll export is labelled as employee payroll for the relevant period.

**Expense relationship:** Employees submit expense claims in the standard way. Approved expenses are reimbursed through the company's payroll or expense payment process.

**Financial normalization:** Standard — TimesheetEntry creates a labour cost against the job.

### 2. Contractor

A contractor is a worker engaged by the company on a contract-for-services basis but who is not an employee. Contractors operate under their own business or as a self-employed individual. They typically submit invoices to the company for payment rather than being paid through payroll.

In v1, contractors use the same timesheet and expense workflow as employees on the platform. The platform does not yet differentiate contractor payroll from employee payroll in the export format.

**Timesheet relationship:** Contractors submit timesheets in the standard way. TimesheetEntry records are created on approval. PayrollRecord for contractors is exported but marked with the contractor classification flag, allowing the downstream system or finance function to route payment as a contractor payment (invoice settlement) rather than through PAYE payroll.

**Expense relationship:** Contractors submit expense claims in the standard way. Expense reimbursement for contractors may be handled differently externally (included in their invoice, paid separately), but The Ledger treats it identically to employee expenses in v1.

**Financial normalization:** Same as employee — TimesheetEntry creates a labour cost against the job. The classification flag on the TimesheetEntry distinguishes contractor from employee labour cost in reporting.

**Decision:** Employee and Contractor use the same platform workflow in v1 because the operational reality is identical — both submit shift times, both have time approved, both create a labour cost against the job. The difference is downstream (how they are paid). The platform records the classification and exports it. The payroll export recipient applies the appropriate payment treatment. Diverging the platform workflows (e.g., requiring contractors to submit invoices into the platform) would add complexity before the basic payroll export capability is established.

### 3. Subcontractor

A subcontractor is an individual or organisation engaged informally by the company to perform a specific piece of work, typically on a day-rate or fixed-price basis without a formal purchase order or ongoing contract.

Subcontractors do not have worker platform accounts. They are not tracked individually in the asset register. They are a cost incurred by the company in the field.

**Timesheet relationship:** Subcontractors do not submit timesheets. They are not on the platform as workers. They cannot start a shift.

**Expense relationship:** The cost of engaging a subcontractor is submitted as an **expense** by the company worker (employee or contractor) who engaged them, using the expense category `subcontractor` (defined in the Expense Domain). The expense description records the nature of the subcontractor work.

**Financial normalization:** An approved subcontractor expense creates an `ExpenseEntry` financial record against the job. There is no separate payroll record. The cost appears in the job's expense cost, not the job's labour cost.

**Decision rationale:** Informal subcontractors in the field services industries are a routine operational mechanism. A cleaning company may hire a day labourer to assist with a large job. A maintenance company may engage a specialist trade (a plumber, electrician) for a day. These costs are real and must be attributed to the job. However, treating informal subcontractors as full platform workers (requiring them to have accounts, start shifts, submit timesheets) is not operationally realistic. The worker who engaged them submits the cost as an expense. This is the simplest, most operationally practical model for v1.

---

## CLASSIFICATION ON THE WORKER PROFILE

Every worker profile carries a `classification` field:

| Field | Type | Values |
|---|---|---|
| `classification` | Enum | `employee` \| `contractor` |

Note: `subcontractor` is not a valid value on the worker profile. Subcontractors do not have worker profiles. The `subcontractor` value exists in the Expense Domain as a category, not as a worker classification.

### Classification Set By

The `classification` field on the worker profile is set by the CEO at the time of worker account creation. The CEO may change a worker's classification at any time (e.g., a contractor who becomes an employee).

PMs may not set or change worker classification.

### Classification Change Audit

A classification change generates an audit entry: `worker_classification_changed`. This entry records the previous classification, the new classification, the user who made the change, and the timestamp.

Classification history is preserved in the audit trail. A TimesheetEntry created before a classification change retains the classification that was current at the time of approval.

**Decision:** Classification is frozen on approved financial records at the time of approval, consistent with the rate-frozen-at-submission-time principle in the Timesheet Domain. A worker reclassified from contractor to employee after a timesheet was approved does not retroactively change the classification on that TimesheetEntry. Historical records reflect the classification that was operationally correct at the time.

---

## FINANCIAL NORMALIZATION IMPLICATIONS BY CLASSIFICATION

### Employee and Contractor

| Record Type | Created On Timesheet Approval | Classification Impact |
|---|---|---|
| `TimesheetEntry` | Yes | Carries `worker_classification: employee` or `worker_classification: contractor` |
| `PayrollRecord` contribution | Yes | Employee PayrollRecord vs Contractor PayrollRecord are segmented in export |

### Subcontractor

| Record Type | Created On Expense Approval | Classification Impact |
|---|---|---|
| `ExpenseEntry` | Yes | Category: `subcontractor`; appears as expense cost, not labour cost |
| `TimesheetEntry` | No | Subcontractors do not submit timesheets |
| `PayrollRecord` | No | Subcontractors are not on payroll export |

---

## PAYROLL EXPORT SEGMENTATION

The payroll export produced by The Ledger segments workers by classification:

| Segment | Includes | Downstream Treatment |
|---|---|---|
| Employee Payroll | All `TimesheetEntry` records for workers classified as `employee` | Run through PAYE payroll — employer deducts tax and NI before payment |
| Contractor Payments | All `TimesheetEntry` records for workers classified as `contractor` | Settled as contractor invoices — no PAYE deduction; contractor handles own tax |

The payroll export format distinguishes employee and contractor segments. The downstream payroll system or finance function processes each segment appropriately.

**Decision:** Providing a unified export with a classification flag (rather than two entirely separate exports) allows the Ledger to support the most common operational setup — a company with a mix of employees and contractors — without requiring the user to run multiple export processes. The receiving payroll system or spreadsheet-based finance function can filter by classification.

---

## RBAC FOR CLASSIFICATION MANAGEMENT

| Role | Can Set Classification | Can Change Classification | Can View Classification |
|---|---|---|---|
| CEO | Yes | Yes | Yes |
| PM | No | No | No (PMs see worker names and roles, not employment classification) |
| Worker | No | No | No (workers do not see their own classification on the platform) |
| Client | No | No | No |

**Decision:** PMs are excluded from classification visibility because employment classification is a commercial and legal matter between the company and its workers. PMs manage operational assignment, not employment terms.

Workers do not see their own classification on the platform because The Ledger is not an HR system. The worker's employment terms are managed through their employment contract, not through the platform.

---

## AUDIT REQUIREMENTS

| Action | Audit Entry Type |
|---|---|
| Worker profile created with classification | `worker_created` (includes classification in audit record) |
| Worker classification changed | `worker_classification_changed` |

All classification-related audit entries carry: `who` (CEO user ID), `what`, `when`, `source_object_id` (worker_id), previous classification value, new classification value.

---

## CONSTRAINTS AND INVARIANTS

1. Every active worker profile must have a `classification` field set to either `employee` or `contractor`. Classification is mandatory.
2. Subcontractors do not have worker profiles. Subcontractor costs are submitted as expenses.
3. Only the CEO may set or change worker classification.
4. Classification is frozen on approved financial records at approval time. Reclassification does not retroactively affect approved TimesheetEntry records.
5. The expense category `subcontractor` is used for informal subcontractor costs submitted by employee or contractor workers. It does not imply that the expense submitter is a subcontractor.
6. Contractor payroll and employee payroll are both exported through the payroll export; they are segmented by the classification flag.
7. Demo company worker classification data must never appear in a real-business company context.

---

## WHAT THIS DOMAIN DOES NOT COVER

- **Formal subcontractor contracts with purchase orders** — engaging a subcontractor with a formal PO and invoice workflow is outside v1 scope; these costs are either absorbed as project expenses or managed outside the platform
- **CIS (Construction Industry Scheme) handling** — UK construction industry-specific tax deduction rules for subcontractors are outside v1 scope; the platform exports data and the downstream accounting system handles CIS
- **IR35 assessment** — contractor tax status determination (IR35 compliance in the UK) is outside the platform's scope; the classification field records employee vs contractor but does not assess or enforce IR35 compliance
- **Multi-jurisdiction payroll** — v1 assumes UK payroll context (GBP, PAYE, NI); multi-jurisdiction support is deferred
- **HR system integration** — integrating worker classification with an HR or payroll system via API is deferred; v1 relies on CSV/structured file export
- **Agency workers** — workers supplied by an agency are treated as employees or contractors in v1 based on the operational relationship; a separate agency worker classification is deferred

---

## WORKER CLASSIFICATION DOMAIN DECISIONS — SUMMARY TABLE

| Decision | Resolution |
|---|---|
| Classification types | Employee, Contractor (on worker profile); Subcontractor (expense category, not a worker profile type) |
| Employee workflow | Standard timesheet + expense; PayrollRecord (employee segment) |
| Contractor workflow | Same as employee in v1; PayrollRecord (contractor segment); labelled for downstream differentiation |
| Subcontractor workflow | No worker profile; no timesheet; cost submitted as expense (category: subcontractor) by engaging worker |
| Who sets classification | CEO only |
| PMs see classification | No |
| Workers see classification | No |
| Classification frozen on financial records | Yes — at approval time |
| Classification change audit | Yes — full audit entry with before/after values |
| Payroll export segmentation | Employee and Contractor segments in one export; downstream system handles accordingly |
| Formal subcontractor PO workflow in v1 | Not supported |
| CIS, IR35, multi-jurisdiction | Deferred |
