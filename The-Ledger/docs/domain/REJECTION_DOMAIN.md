# THE LEDGER — REJECTION LIFECYCLE DOMAIN

## Frozen Domain Definition

Version: 1.0
Status: FROZEN
Date: June 4, 2026
Authority: Domain Definition Session — June 4, 2026

---

## STATUS

This document is the authoritative definition of the Rejection Lifecycle Domain in The Ledger.

Every decision recorded here is final. Ambiguities identified in the Domain Definition Audit and Operational Reality Audit have been resolved. This document supersedes any prior partial definitions, audit findings, or implementation assumptions regarding rejection behaviour.

This doctrine is platform-wide. It applies equally to all current and future submission types. No submission domain may define its own rejection behaviour in contradiction to this document.

---

## REJECTION DOMAIN DEFINITION

### What Is a Rejection?

A rejection is a formal refusal by an authorised reviewer to approve a submission, accompanied by a mandatory written reason, which returns the submission to the submitter for correction and resubmission.

A rejection is a governance act. It is not a deletion. It is not a void. It is not a silent discard.

A rejection records that:

- A specific person with approval authority reviewed a specific submission
- They found it insufficient, incorrect, or non-compliant
- They recorded the reason
- The submitter was informed
- The submission requires correction before it can be approved

### What Is Not a Rejection?

A rejection is not:

- **Withdrawal** — A submitter choosing to cancel their own pending submission before it is reviewed. Withdrawal is a separate act with separate rules (see Withdrawal, below).
- **Expiry** — A submission that is never reviewed and ages out. No submission expires in The Ledger without explicit action by a reviewer.
- **Deletion** — No submission is ever deleted. Deletion does not exist in The Ledger for submitted objects.
- **Escalation** — Moving a submission to a higher-authority reviewer is not rejection. It is re-routing.
- **A flag or warning** — A Review Centre flag (such as a missing receipt warning) is not rejection. Flags exist alongside the submission. They inform the reviewer. They do not constitute a decision.

### What Business Purpose Does Rejection Serve?

Rejection serves four purposes:

1. **Governance:** It prevents incorrect, fraudulent, or non-compliant submissions from becoming financially real.
2. **Correction:** It returns authority over correction to the submitter, who has the operational knowledge to fix the problem.
3. **Auditability:** It creates a permanent, traceable record that a submission was reviewed and found insufficient, preserving the financial integrity of all records that do exist.
4. **Communication:** It closes the feedback loop between reviewer and submitter. Without rejection as a first-class action, this loop is absent, and corrections happen outside the platform.

---

## REJECTION APPLICABILITY

### Submission Types Subject to Rejection Doctrine

Rejection doctrine applies to all objects that enter Review Centre as submissions requiring approval. In the current platform and all future domains, this includes:

| Submission Type | Rejection Applicable |
|---|---|
| Worker Reports | Yes |
| Expense Submissions | Yes |
| Timesheets | Yes |
| Issue Logs (when review is required) | Yes |
| Client Requests (when approval is required) | Yes |
| All future submission types entering Review Centre | Yes |

### Submission Types Not Subject to Rejection Doctrine

Rejection doctrine does not apply to:

- **Informational records** — Records that do not require approval (e.g., a notification, a read-only log entry). These cannot be rejected because they are not submissions.
- **System-generated records** — Automated platform events are not submissions and cannot be rejected.
- **Approved financial records** — Once a financial record has been created by an approval, it is immutable. It is not subject to rejection. Errors in approved financial records are addressed through the Financial Record Correction Domain (separate, to be defined).

### Are There Differences by Submission Type?

The core rejection doctrine is identical across all submission types. The following differences exist at the authority level only:

- **Rejection authority** varies by submission type (see Rejection Authority below).
- **Notification recipients** may vary by submission type.
- No submission type receives a fundamentally different rejection lifecycle. The workflow — reject → notify → return → correct → resubmit → re-review — is universal.

---

## REJECTION AUTHORITY

### Who May Reject?

Rejection authority mirrors approval authority. Any person who has authority to approve a submission also has authority to reject it. A person without approval authority for a given submission type cannot reject it.

| Submission Type | Rejection Authority |
|---|---|
| Worker Report | PM (own jobs) or CEO |
| Expense ≤ £500, non-billable | PM (own jobs) or CEO |
| Expense > £500, non-billable | CEO only |
| Expense, billable | CEO only |
| Timesheet | PM (own jobs) or CEO |
| Issue Log (when reviewable) | PM (own jobs) or CEO |
| Client Request (when approvable) | PM (own jobs) or CEO |

**Decision:** Rejection authority is always co-extensive with approval authority. A reviewer who can say yes must also be able to say no. Splitting these authorities would create a workflow where a PM could approve but not reject (or vice versa), which is operationally incoherent.

### Must a Reason Always Be Provided?

Yes. A rejection reason is mandatory without exception.

A reviewer cannot complete the rejection action without providing a written reason. The reason field is a required input to the rejection action. It is not optional. It cannot be bypassed.

**Minimum reason requirement:** The reason must be non-empty and contain at least one intelligible statement. Single-character or obviously vacuous entries (e.g., "x", "no") are not valid. Validation of minimum meaningful content is enforced at the form level.

**Decision rationale:** A rejection without a reason is operationally useless. The submitter cannot correct what they cannot understand. A reasonless rejection is indistinguishable from an arbitrary one. The audit trail requires the reason to be meaningful. There are no circumstances under which a rejection without a reason is acceptable.

### Can Rejection Be Delegated?

Rejection authority follows approval delegation rules. If approval authority for a submission type can be delegated (a future platform capability), rejection authority is delegated simultaneously. They cannot be separated.

In v1, formal approval delegation is not implemented. Rejection authority cannot be delegated in v1.

---

## REJECTION OUTCOMES

### What Happens When a Submission Is Rejected?

The following sequence occurs, in this order, atomically:

1. The submission status changes from `pending_review` to `rejected`.
2. The rejection reason is recorded against the submission.
3. The rejection is recorded in the audit log.
4. The submitter is notified (see Notification Model).
5. The assigned PM (if the rejector is not the PM) receives a notification that the rejection has been issued.

No financial record is created. No financial record is modified. The submission does not affect any financial state upon rejection.

### Does the Submission Return to the Submitter?

Yes. Upon rejection, ownership of the submission returns to the submitter for correction.

The submitter can view the rejected submission and the rejection reason. The submitter can create a corrected version and resubmit.

The submitter cannot modify the rejected submission itself. The rejected submission is frozen in its rejected state and preserved in the audit trail.

### Does a Rejected Submission Become Immutable?

Yes. The rejected submission is frozen at the point of rejection. Its content — all fields, attachments, and metadata — cannot be changed after rejection is issued.

**Decision rationale:** If the rejected submission could be edited after rejection, the audit trail would misrepresent what was actually reviewed. The reviewer's decision must remain traceable to the specific content that was submitted. The original record must remain as the reviewer saw it.

### Can a Rejected Submission Be Deleted?

No. Rejected submissions are never deleted. They are permanently retained in the audit trail.

### Can a Rejected Submission Be Withdrawn After Rejection?

No. Once a submission has been rejected, the withdrawal option is no longer available. The submission is in a terminal state (`rejected`) that is preserved for audit purposes. The submitter's only available action is to correct and resubmit.

### What Is Withdrawal (vs. Rejection)?

Withdrawal is a submitter-initiated action on a `pending_review` submission before a reviewer has acted on it.

A submitter may withdraw a pending submission at any time before a reviewer issues an approval or rejection. Withdrawal transitions the submission to `withdrawn` status. A withdrawn submission is retained in the audit trail. It is not deleted.

A withdrawn submission cannot be reinstated. If the submitter wishes to proceed, they must create a new submission.

Withdrawal is the submitter's equivalent of rejection. It is a terminal state. It produces an audit entry. It does not produce a financial record.

---

## CORRECTION LIFECYCLE

### How Does Correction Work?

Correction does not modify the original rejected submission. Correction produces a new submission.

The corrected submission is a new, independent submission that carries a reference to the rejected submission it is correcting. The rejected submission is not modified in any way.

**Correction sequence:**

1. Submitter receives notification of rejection with reason.
2. Submitter creates a new submission, pre-populated with the fields from the rejected submission (as a convenience, not a constraint — all fields are editable).
3. The new submission carries a `rejected_submission_ref` field containing the ID of the rejected submission it is correcting.
4. The new submission enters the standard submission lifecycle: offline queue → Review Centre → `pending_review`.
5. The original rejected submission retains its `rejected` status permanently.

### Should the Original Submission Be Modified?

No. The original rejected submission is never modified after rejection. Modification of a reviewed submission would corrupt the audit trail.

### What Audit Requirements Exist for Correction?

When a corrected submission is created, an audit entry is generated:

- Type: `submission_correction_created`
- Records: submitter ID, new submission ID, rejected submission ID (the `rejected_submission_ref`)
- Timestamp of creation

This entry creates a traceable lineage between the corrected submission and its origin.

### How Many Times May a Submission Be Corrected?

There is no limit on the number of correction attempts for a single rejected submission.

Each correction attempt creates a new submission with its own `rejected_submission_ref`. If the second correction is also rejected, the third correction's `rejected_submission_ref` points to the second rejected submission. The lineage chain is preserved in full.

---

## RESUBMISSION LIFECYCLE

### How Does Resubmission Work?

Resubmission is the act of submitting a corrected version after a rejection. In The Ledger, resubmission is mechanically identical to a new submission, with one addition: the `rejected_submission_ref` field.

A resubmission enters the same Review Centre queue as an original submission. It is reviewed by the same role(s) that had authority over the original. It may be approved or rejected on its own merits.

The reviewer of a resubmission should have access to the rejection history — the rejected submission(s) that preceded the current resubmission — to understand the correction context.

### Is Lineage Preserved?

Yes. Lineage is preserved through the `rejected_submission_ref` chain. Each submission in a correction chain references the previous rejected submission. The full history is auditable from any point in the chain.

### How Are Relationships Between Versions Tracked?

The `rejected_submission_ref` field creates a forward-traceable chain. Starting from the original rejected submission, the audit log contains all events. Starting from the most recent resubmission, the chain can be walked backward to the original.

No version numbering is applied to submissions. Submissions are not versions of each other — they are distinct submissions that happen to share a correction relationship. The lineage is expressed through references, not versioning.

---

## OWNERSHIP MODEL

### Who Owns a Submission at Each Stage?

| Stage | Owner | Meaning |
|---|---|---|
| Submitted (`pending_review`) | Submitter | Submitter may withdraw. No reviewer has acted. |
| Under Review | Reviewer | Reviewer has opened the submission for review. Submitter may not withdraw while a review is in progress. |
| Approved | Job mini-ledger | The financial record belongs to the job. The submitter retains read visibility of their submission history. |
| Rejected | Submitter (for correction) | Returned to the submitter's domain. The submitter may correct and resubmit. |
| Withdrawn | Archived (no owner) | Terminal. Neither submitter nor reviewer acts on it further. |

### How Does Ownership Change on Rejection?

On rejection, ownership returns from the reviewer's domain to the submitter's domain. The submitter regains the ability to act (by correcting and resubmitting). The reviewer's action is complete.

### Who Owns a Rejected Submission's Audit Record?

The audit record belongs to The Ledger's immutable audit trail. No individual user owns it. No individual user can modify or delete it. It is visible to reviewers and the CEO. It is visible to the submitter to the extent of their own submission history. Workers see their own submission outcomes. They do not see other workers' submission histories.

---

## AUDIT MODEL

### Required Audit Entries

Every rejection-related action generates an immutable audit entry. The following actions must be recorded:

| Action | Audit Entry Type |
|---|---|
| Submission enters Review Centre | `submission_pending_review` |
| Submission rejected | `submission_rejected` |
| Rejection communicated to submitter | `rejection_notified` |
| Correction submission created | `submission_correction_created` |
| Resubmission enters Review Centre | `submission_resubmitted` |
| Resubmission approved | `submission_approved` (standard approval audit entry) |
| Resubmission rejected (again) | `submission_rejected` (again, new entry) |
| Submission withdrawn | `submission_withdrawn` |

### Required Audit Metadata

All audit entries carry:

| Field | Content |
|---|---|
| `who` | User ID of the actor (reviewer for rejection, submitter for withdrawal/correction) |
| `what` | The audit entry type (see above) |
| `when` | Timestamp (UTC) |
| `source_object_id` | The submission ID that was acted upon |
| `destination_object_id` | The financial record ID, if created; null if rejected or withdrawn |
| `external_reference` | The job ID the submission is attributed to |
| `rejection_reason` | The reviewer's written reason (populated for `submission_rejected` entries only) |
| `rejected_submission_ref` | The prior rejected submission ID (populated for `submission_correction_created` and `submission_resubmitted` entries only) |

### Traceability Requirement

From any financial record, it must be possible to trace back to the submission that produced it, and from that submission back to all prior rejected submissions in the correction chain. This traceability must be preserved indefinitely. No part of the chain may be deleted, archived to inaccessibility, or overwritten.

### Visibility

| Role | Can See Rejection Audit |
|---|---|
| CEO | All rejections, all submission types, all workers |
| PM | Rejections on submissions attributed to their assigned jobs |
| Worker | Their own submission outcomes only (approved/rejected/pending) — not the full audit entry |
| Client | No visibility into rejection audit |

Workers see the outcome and the rejection reason. They do not see the internal audit metadata (timestamps, reviewer IDs, audit entry types). The reason is surfaced in the worker's submission history view.

---

## NOTIFICATION MODEL

### Who Is Notified on Rejection?

When a submission is rejected, the following notifications are issued:

| Recipient | Notification | Acknowledgement Required |
|---|---|---|
| Submitter (worker) | "Your [submission type] for [job name] was rejected. Reason: [rejection reason]." | No |
| Assigned PM (if rejector is not the PM) | "[Worker name]'s [submission type] for [job name] has been rejected." | No |
| CEO (if rejector is not the CEO, and submission was CEO-authority) | "[Submission type] for [job name] was rejected by [PM name]. Reason: [rejection reason]." | No |

**Decision:** CEO is notified of CEO-authority rejections (e.g., expense > £500) regardless of who rejected, to maintain visibility of high-value governance decisions. CEO is not notified of routine PM-level rejections to avoid notification fatigue.

### What Information Must Be Included in the Notification?

Every rejection notification to a submitter must include:

1. The type of submission rejected (report, expense, timesheet, etc.)
2. The job the submission was attributed to
3. The rejection reason, verbatim as written by the reviewer
4. A clear indication that the submitter may correct and resubmit

A rejection notification without the reason is not acceptable. The reason is the functional purpose of the notification.

### Notification on Resubmission Approval

When a resubmitted (corrected) submission is approved, the submitter receives an approval notification. This follows standard approval notification rules and is not specific to the rejection lifecycle.

### Notification Delivery

In v1, notifications are delivered in-platform via the Notification Centre. Push notifications (mobile) are the intended delivery mechanism for worker-facing notifications in the field but are deferred to the phase when mobile delivery infrastructure is implemented.

The intent is that a worker in the field who has been rejected should receive a push notification. Until push is implemented, the in-platform notification is the authoritative channel.

---

## REPORTING RULES

### Do Rejected Records Appear in Reporting?

Rejected submissions appear in operational reporting. They do not appear in financial reporting.

**Operational reporting** (activity counts, submission volumes, rejection rates, review centre throughput):
- Rejected submissions appear as rejected records.
- Rejection counts are reportable metrics: total rejections, rejection rate by submission type, rejection rate by worker, rejection rate by reviewer, rejection rate by job.
- These metrics support governance visibility: a high rejection rate may indicate a worker requiring guidance or a reviewer applying inconsistent standards.

**Financial reporting** (job profitability, expense totals, payroll summaries, invoice values):
- Rejected submissions do not contribute to any financial figure.
- A rejected expense does not appear in job cost totals.
- A rejected timesheet does not appear in payroll calculations.
- Only approved financial records enter financial reporting.

**Decision rationale:** Rejected submissions carry no financial reality. Including them in financial figures would misrepresent the company's financial position. Excluding them from operational reporting would conceal governance performance. Both dimensions are necessary and distinct.

### Correction Chain in Reporting

A correction chain (original rejection → correction 1 → correction 2 → final approval) appears in operational reporting as:

- Two (or more) rejections attributed to the original submission lineage.
- One approved submission (the final corrected version).
- The financial records created by the final approval.

The rejection history is visible in operational reporting. The financial output is the single approved record. They are reported in separate contexts and never conflated.

---

## EDGE CASE RULES

### Rejected Twice (Same Reviewer, Same Submission Chain)

A submission in the correction chain may be rejected more than once. Each rejection is a distinct event with its own audit entry and its own reason. The submitter may correct and resubmit again.

There is no limit on the number of rejections in a correction chain. The platform does not escalate automatically after a fixed number of rejections. Escalation is a manual governance action.

If a reviewer believes a submission is non-correctable (e.g., fraudulent, fundamentally wrong in nature), the reviewer should record this in the rejection reason. The CEO can then take further action through governance tools, not through the rejection mechanism itself.

### Rejected Repeatedly (Pattern Behaviour)

The platform does not automatically intervene when a worker's submissions are repeatedly rejected. Repeated rejections appear as a pattern in operational reporting and rejection metrics, which a PM or CEO can observe and act upon.

The appropriate response to a pattern of rejections is a management action (coaching, guidance, role review), not a platform enforcement action. The platform records; the manager decides.

### Rejected After Long Delay

No rejection has a time limit. A reviewer may reject a submission at any time while it is in `pending_review` status. There is no expiry on pending submissions.

If an SLA escalation rule is active (automation engine escalation for unreviewed submissions after a defined period), the escalation does not affect the submitter. The escalation targets the reviewer's manager to prompt action. The submission remains pending until a reviewer acts.

### Submitter No Longer Employed

If a worker is deactivated while they have a pending submission, the pending submission must be resolved (approved or rejected) before the worker's account is fully archived. PMs and CEOs can still review and act on submissions from deactivated workers.

If a rejected submission's worker is deactivated before they can correct and resubmit: the rejected submission is retained in the audit trail in its `rejected` status. No correction is possible because the submitter no longer has platform access. The submission remains in its terminal `rejected` state. This is operationally acceptable — the financial record was never created, so no financial harm results.

**Decision:** Worker deactivation does not cause pending submissions to be auto-approved or auto-rejected. Reviewers must act on them explicitly. This is a manual process to ensure governance is not bypassed during offboarding.

### Job Closed Before Correction

If a rejected submission's job is closed (completed or archived) before the submitter corrects and resubmits:

The correction window closes when the job closes. A corrected expense or report cannot be submitted against a closed job. The rejected submission remains in the audit trail in its `rejected` state permanently.

**Decision rationale:** Accepting a corrected submission against a closed job would reopen the job's financial record space. A closed job must have a settled, complete financial record. Allowing post-closure corrections would undermine job financial closure as a concept. If a material expense was incorrectly rejected and the job is now closed, the resolution pathway is through the Financial Record Correction Domain (to be defined), not through the standard correction/resubmission workflow.

**Practical note:** This rule places responsibility on PMs to review and resolve pending submissions before closing a job. The job completion rules (to be defined in the Job Domain) must include: all pending submissions must be resolved (approved or rejected) before a job may be closed.

### Object Referenced Elsewhere

If a rejected submission is referenced by another object in the platform (e.g., a note, a follow-up, a related submission), the rejection does not affect those references. The rejected submission remains identifiable by its ID. Objects that reference it retain their reference. The rejected submission's audit record is the authoritative statement of its state.

---

## CROSS-DOMAIN RULES

### Universal Applicability

This rejection doctrine applies without modification to all current submission types (reports, expenses, timesheets) and all future submission types that enter Review Centre.

No future submission domain may define a different rejection lifecycle. New submission types inherit this doctrine in full.

### Compatibility with the Expense Domain

This doctrine is compatible with and supersedes the rejection lifecycle described in the Expense Domain (EXPENSE_DOMAIN.md). Specifically:

- EXPENSE_DOMAIN.md states: "Worker may correct and resubmit (creates new submission with `rejected_submission_ref` linking to original)." This is consistent with this doctrine.
- EXPENSE_DOMAIN.md states: "The original rejected submission is retained in the audit trail. It is not deleted or overwritten." This is consistent with this doctrine.
- EXPENSE_DOMAIN.md states: "There is no time limit on resubmission. A worker may correct and resubmit a rejected expense at any time while the referenced job is still open." This is consistent with this doctrine, with the additional clarification here that the correction window closes when the job closes.

### Interaction with Financial Record Immutability

Rejection and correction apply to submissions — the pre-approval layer. Financial records are never rejected. Financial records, once created by approval, are immutable and are subject to the Financial Record Correction Domain (to be defined), not to rejection doctrine.

Rejection doctrine ends at the approval boundary. It governs the world of submissions. Financial record correction doctrine governs the world of approved records. These two domains do not overlap.

### Interaction with Review Centre

The Review Centre is the implementation surface of rejection doctrine. All rejections are issued through Review Centre. Review Centre must surface:

- The rejection action alongside the approval action for every submission
- The mandatory reason field when rejection is selected
- The rejection history of any submission that is a resubmission (the correction chain)

Review Centre must not permit approval or rejection of a submission by a user who lacks the authority to do so for that submission type.

### Interaction with the Offline Queue

Rejection outcomes must be delivered to the submitter even when the submitter's device was offline at the time of rejection. When connectivity is restored, the submitter's notification and submission status must synchronise immediately.

The offline queue governs the submission direction (worker → platform). The notification and status synchronisation governs the return direction (platform → worker). Both directions must be reliable.

---

## WITHDRAWAL DEFINITION (COMPLETE)

Withdrawal is the submitter-initiated cancellation of a pending submission before a reviewer has acted on it.

| Rule | Detail |
|---|---|
| Who can withdraw | The original submitter only |
| When withdrawal is permitted | Only while status is `pending_review` and no reviewer has opened the submission |
| When withdrawal is blocked | Once a reviewer has opened the submission for review; after approval; after rejection |
| Effect of withdrawal | Submission status → `withdrawn`. No financial record created. Audit entry created. |
| Can a withdrawn submission be reinstated | No. `withdrawn` is terminal. |
| Can a submitter resubmit after withdrawal | Yes, by creating a new submission. The withdrawn submission is not a `rejected_submission_ref` for the new one — they are independent. |

**Decision:** Withdrawal is blocked once a reviewer has opened the submission to prevent a submitter from withdrawing a submission mid-review to avoid rejection and resubmit without the rejection on record. If a submitter genuinely needs to cancel after review has begun, they must contact the reviewer. The reviewer may reject the submission with a reason noting the submitter's request, producing a clean audit record.

---

## REJECTION DOMAIN INVARIANTS

The following rules are absolute and may not be overridden by any implementation decision, configuration, automation rule, or future domain definition.

1. **A rejection always records a reason.** No exception. No bypass. No default.

2. **A rejected submission is never deleted.** It is retained in the audit trail permanently.

3. **A rejected submission is never modified after rejection.** Its content is frozen at the point the reviewer issued the rejection.

4. **Rejection never creates a financial record.** A rejection is evidence that nothing financially real occurred. No financial mutation of any kind results from a rejection.

5. **The submitter is always notified of rejection.** Rejection without notification is an incomplete rejection. The notification must include the reason.

6. **A correction always creates a new submission.** The correction never overwrites the rejected submission.

7. **Lineage is preserved.** Every correction carries a `rejected_submission_ref`. The chain is never broken.

8. **Only authorised reviewers may reject.** Rejection authority is co-extensive with approval authority. No other person may reject.

9. **Automation may not reject.** Automation may flag, escalate, notify, and route. Automation may not reject a submission. Rejection is a human governance act.

10. **The correction window closes when the job closes.** No correction may be submitted against a closed job.

11. **Multiple rejections are permitted.** There is no ceiling on the number of times a submission (or its corrections) may be rejected.

12. **Rejection doctrine is submission-layer only.** Approved financial records are not subject to rejection doctrine. They are governed by the Financial Record Correction Domain.

---

## FINAL REJECTION DOCTRINE

**Rejection is the formal refusal of a submission by an authorised reviewer, always accompanied by a written reason, which returns the submission to the submitter for correction, preserves the original in the audit trail permanently, and creates no financial record.**

**Correction is the creation of a new submission by the submitter in response to a rejection, carrying a reference to the rejected submission, entering Review Centre as a new submission, and reviewable on its own merits.**

**Lineage is the chain of referenced submissions from the most recent resubmission back to the original, preserved permanently in the audit trail, reportable as operational history, and never deletable.**

**Rejection is a governance act, not a deletion. It is a communication, not a punishment. It is a gate, not an endpoint. Its purpose is to ensure that only correct, compliant, and verified submissions become financially real — which is the central purpose of The Ledger.**

---

## DECISION SUMMARY TABLE

| Decision | Resolution |
|---|---|
| What is a rejection? | Formal refusal by authorised reviewer, mandatory reason, returns to submitter for correction |
| What is not a rejection? | Deletion, withdrawal, expiry, flag/warning, escalation |
| Applies to which submission types? | All submission types entering Review Centre — universal doctrine |
| Rejection authority | Co-extensive with approval authority; varies by submission type per authority table |
| Reason mandatory? | Yes, always, no exceptions |
| Reason can be bypassed? | No |
| Rejected submission modified after rejection? | No — frozen at point of rejection |
| Rejected submission deleted? | Never |
| Correction mechanism | New submission with `rejected_submission_ref`; original unchanged |
| Number of corrections permitted | Unlimited |
| Correction window | Open while the referenced job is open; closes when job closes |
| Lineage tracking | `rejected_submission_ref` chain; preserved permanently |
| Financial records on rejection | None created |
| Submitter notification | Always; must include reason verbatim |
| PM notification on rejection | Yes (if PM is not rejector) |
| CEO notification on rejection | Yes, for CEO-authority submission types (if CEO is not rejector) |
| Acknowledgement required on notification | No |
| Rejected records in financial reporting | No |
| Rejected records in operational reporting | Yes — rejection rate metrics, correction chain history |
| Rejected twice (same chain) | Permitted; each rejection is distinct; no auto-escalation |
| Rejected repeatedly (pattern) | Visible in reporting; management action; no platform intervention |
| Submitter deactivated before correction | Rejected submission remains in terminal `rejected` state; no correction possible |
| Job closed before correction | Correction window closes; submission remains `rejected` permanently |
| Can automation reject? | No — never |
| Can rejection be delegated in v1? | No — delegation not implemented in v1 |
| Withdrawal permitted? | Yes — submitter may withdraw before reviewer opens submission |
| Withdrawal after review begun? | No |
| Withdrawal reinstatable? | No — terminal state |
| Interaction with Financial Record Correction | Rejection governs submissions only; approved records governed by separate domain |
