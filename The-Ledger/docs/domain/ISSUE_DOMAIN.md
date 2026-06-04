# THE LEDGER — ISSUE DOMAIN

## Frozen Domain Definition

Version: 1.0
Status: FROZEN
Date: June 4, 2026
Authority: Domain Definition Session — June 4, 2026

---

## STATUS

This document is the authoritative definition of the Issue Domain in The Ledger.

Every decision recorded here is final. Ambiguities raised in the Domain Definition Audit have been resolved. This document supersedes any prior partial definitions, audit findings, or implementation assumptions regarding issue logs, site problems, and operational incidents.

Backend planning for the Issue Domain may begin from this document.

---

## THE CORE DECISION: ISSUE CLASSIFICATION

An issue is an **operational communication record**, not a financial event.

An issue captures an operational problem encountered in the field. Issues are informational — they record the fact that something went wrong, was blocked, or requires attention. Issues do not directly create financial records.

However, an issue may **trigger a cost submission** when the problem requires expenditure to resolve. The cost submission (an expense) then follows the standard Expense Domain → Review Centre → Approval → Financial Normalization chain. The issue and the resulting expense are linked by reference.

**The fundamental classification:**

| Classification | Meaning |
|---|---|
| Issue | Operational communication — records a problem, requires PM/CEO acknowledgement, may or may not have a financial consequence |
| Cost Request (from Issue) | An expense submission created by the worker in response to an issue, linked to the issue by reference, following full Expense Domain rules |

**Decision rationale:** Classifying issues as financial events (requiring approval before the worker can proceed) would mean that a worker encountering a locked door or a broken piece of equipment must submit an issue, wait for PM approval, and only then proceed. This is operationally unworkable in the field. Issues must flow immediately from worker to PM as operational communications. The financial consequence (if any) is addressed separately through the expense submission. The platform records the full context — issue logged, cost incurred, expense approved, financial record created — as a traceable chain, not as a single blocked workflow.

---

## WHAT IS AN ISSUE?

An issue is a structured record of an operational problem, obstruction, or incident encountered by a worker while performing work on an assigned job.

Issues represent events that:
- Prevent or complicate the completion of assigned work
- Require PM or CEO awareness
- May or may not require additional expenditure to resolve
- Must be documented for operational and governance purposes

An issue is NOT:
- A timesheet (labour time)
- An expense (out-of-pocket cost incurred by the worker)
- A general job update (informational progress update — that is a report note)
- A client complaint submitted through the portal (that is a Client Request, to be defined separately)
- A quality assurance record (deferred domain)

---

## ISSUE TYPES

| Type | Code | Covers |
|---|---|---|
| Access Problem | `access` | Site locked, access code wrong, no keyholder available, worker turned away |
| Equipment Failure | `equipment_failure` | Company equipment broke down, failed to start, or is unavailable |
| Asset Damage | `asset_damage` | Company or client asset was damaged — by the worker, by a third party, or pre-existing damage discovered |
| Scope Change | `scope_change` | The work required is different from what was scheduled — more work, different work, or access to work area denied |
| Safety Hazard | `safety_hazard` | Condition at the site that presents a risk to health and safety |
| Materials Shortage | `materials_shortage` | Insufficient materials available to complete the job as specified |
| Subcontractor Problem | `subcontractor_problem` | A subcontractor did not appear, is performing unsatisfactorily, or cannot complete their portion |
| Client Communication | `client_communication` | Something the client's representative said or asked at the site that requires PM awareness |
| Other | `other` | Operational problem not covered by the above types — description is mandatory |

**Decision:** Issue types are fixed in v1. They support filtering, escalation routing, and operational reporting. Configurability deferred.

---

## ISSUE SEVERITY LEVELS

Every issue must be assigned a severity by the worker at the time of submission.

| Severity | Code | Meaning | Routing |
|---|---|---|---|
| Informational | `informational` | Worker is noting something for the record. No immediate action required. | Enters PM's notification feed; no escalation |
| Operational | `operational` | Work is affected or at risk. PM should be aware and may need to act. | Enters PM's notification feed; escalates to CEO if unacknowledged after 4 hours |
| Safety | `safety` | A health and safety concern exists at the site. | Immediate notification to PM AND CEO; requires PM acknowledgement within 1 hour |
| Critical | `critical` | Work cannot proceed, or a situation has arisen requiring immediate management decision. | Immediate notification to PM AND CEO; escalates to CEO if PM has not acknowledged within 30 minutes |

**Decision rationale:** Severity levels determine routing, not workflow type. All issues follow the same lifecycle regardless of severity. Severity controls notification urgency and escalation timing, not approval requirements. Safety and Critical issues are surfaced immediately to both PM and CEO because field safety events and work stoppages require the fastest possible management response.

---

## REQUIRED FIELDS

Every issue submission must contain:

| Field | Type | Required | Notes |
|---|---|---|---|
| `job_id` | Foreign key | Always | Job the issue was encountered on |
| `site_id` | Foreign key | Always | Site where the issue occurred (inherited from job) |
| `type` | Enum | Always | See Issue Types above |
| `severity` | Enum | Always | Informational / Operational / Safety / Critical |
| `title` | String, max 100 chars | Always | Short description of the issue |
| `description` | String, max 2000 chars | Always | Full description of what was found and what happened |
| `photo_attachments` | File references (max 5) | Optional | Field photos supporting the issue |
| `cost_request` | Boolean | Always | Does this issue require additional expenditure to resolve? Default: false |
| `created_at` | Timestamp | System-generated | |
| `created_by` | Worker ID | System-generated | |

If `cost_request: true`, the worker is prompted after submitting the issue to create a linked expense submission (via the standard Expense Domain intake form). The expense carries a `source_issue_id` reference.

---

## ISSUE SUBMISSION LIFECYCLE

```
Worker encounters a problem
    → Worker creates issue submission (all required fields)
    → Issue enters platform (status: open)
    → PM receives notification (severity-based routing)
    → CEO receives notification (for safety and critical severity)
    → PM acknowledges issue (status: acknowledged)
    → PM investigates and resolves (status: resolved)
    → Worker receives resolution notification

    [If cost_request: true]
    → Worker creates linked expense submission (source_issue_id populated)
    → Expense follows Expense Domain lifecycle independently
    → On expense approval: financial record created, linked to issue by source_issue_id
```

---

## ISSUE STATES

| Status | Meaning |
|---|---|
| `open` | Issue submitted; PM has not yet acknowledged |
| `acknowledged` | PM has opened and acknowledged the issue |
| `in_progress` | PM has indicated that active steps are being taken to resolve |
| `resolved` | PM has marked the issue as resolved |
| `closed` | Issue has been archived; no further action required |

### Transitions

- `open` → `acknowledged`: PM action (required for all severity levels)
- `acknowledged` → `in_progress`: PM action (optional state for complex issues)
- `acknowledged` or `in_progress` → `resolved`: PM action
- `resolved` → `closed`: Automatic after 7 days with no further activity, OR immediate CEO/PM action
- `open` or `acknowledged` → `closed`: CEO only, with a mandatory close reason (used for invalid or duplicate issues)

### Does the Worker Confirm Resolution?

No. Resolution is the PM's declaration that the operational problem has been addressed from the management side. The worker does not need to confirm resolution for the issue to close.

**Decision rationale:** Requiring worker sign-off on issue resolution creates a dependency on workers re-opening the app to acknowledge a management action. Workers are in the field. PMs are responsible for operational management. The PM's resolution declaration is sufficient. The issue record and all associated communications remain in the audit trail for review if a dispute arises.

---

## ISSUE ESCALATION

### Escalation Triggers

| Severity | Trigger | Action |
|---|---|---|
| Informational | No escalation | — |
| Operational | Unacknowledged for 4 hours | Notification sent to CEO |
| Safety | Unacknowledged by PM for 1 hour | Notification sent to CEO with "safety unacknowledged" flag |
| Critical | Unacknowledged by PM for 30 minutes | Notification sent to CEO with "critical unacknowledged" flag |

Escalation is a notification action only. It does not change issue ownership, modify the issue record, or trigger any financial action. The Automation Engine handles escalation timing.

### CEO Intervention

The CEO may take over an issue at any time by reassigning it from the PM to themselves, or by closing it directly (with a mandatory close reason). CEO intervention generates an audit entry.

---

## ISSUE AND FINANCIAL RECORDS

Issues do not directly create financial records. This is the domain classification decision.

The financial chain, if triggered, is:

```
Issue (operational record)
    → Worker creates linked Expense submission (source_issue_id populated)
    → Expense follows Expense Domain lifecycle
    → Expense approval creates ExpenseEntry financial record
    → ExpenseEntry carries: job_id, source_issue_id (reference back to the triggering issue)
```

The `source_issue_id` on the `ExpenseEntry` creates a traceable link from the financial record back to the issue that necessitated the cost. This satisfies the audit requirement: costs originating from site problems are traceable to their operational cause.

### Can Multiple Expenses Be Linked to One Issue?

Yes. An issue may result in multiple expenses over time (emergency purchase today, follow-up repair tomorrow). Each expense submission carries the same `source_issue_id`. The issue record accumulates linked expense references.

### Does Issue Approval Exist?

No. Issues are not submitted for approval. Issues are submitted for **acknowledgement and resolution**. They do not enter Review Centre.

The PM acknowledges and resolves issues through the Issues management surface (separate from Review Centre). Review Centre is reserved for submissions that produce financial records upon approval. Issues are operational communications; they do not produce financial records directly.

---

## ISSUE OWNERSHIP

| Stage | Owner | Meaning |
|---|---|---|
| `open` | Submitter (worker) | Worker has submitted; PM has not yet acted |
| `acknowledged` | PM | PM has taken ownership of the issue |
| `in_progress` | PM | PM is actively managing resolution |
| `resolved` | PM (record) | Resolution recorded; transitions to closed after 7 days |
| `closed` | Archived | No owner; read-only |

The worker who submitted the issue retains read visibility of their submitted issues and the resolution status. Workers see: issue status, PM's resolution notes (if any). Workers do not see internal management notes beyond the resolution note.

---

## RBAC

| Role | Can Submit | Can View Own | Can Acknowledge/Resolve | Can View All |
|---|---|---|---|---|
| Worker | Yes | Yes (own issues) | No | No |
| PM | No | No | Yes (own jobs) | Yes (own jobs) |
| CEO | No | No | Yes (all) | Yes (all) |
| Client | No | No | No | No |

Clients have no visibility of issue logs. Issues are internal operational records. A worker encountering an access problem caused by a client (e.g., wrong door code provided by client) does not produce a client-visible record in v1. The PM handles client communication externally if required.

---

## AUDIT REQUIREMENTS

Every issue action generates an immutable audit entry.

| Action | Audit Entry Type |
|---|---|
| Issue submitted | `issue_submitted` |
| Issue acknowledged | `issue_acknowledged` |
| Issue marked in progress | `issue_in_progress` |
| Issue resolved | `issue_resolved` |
| Issue closed | `issue_closed` |
| Issue escalated (unacknowledged) | `issue_escalated` |
| CEO closed issue with reason | `issue_ceo_closed` |
| Linked expense created | `issue_expense_linked` (on the expense record; references source_issue_id) |

All entries carry: `who`, `what`, `when`, `source_object_id` (issue_id), `external_reference` (job_id and site_id).

---

## ISSUE REPORTING

Issues appear in operational reporting. Issues do not appear in financial reporting.

**Operational reporting metrics:**
- Issues by severity
- Issues by type
- Issues by site (site with highest issue rate)
- Issues by worker (worker logging most issues — may indicate training needs)
- Open issues older than X days
- Average time to acknowledgement
- Average time to resolution
- Issues with linked expenses (cost-generating issues)

**Financial reporting:**
- Issues do not contribute directly to any financial figure
- `ExpenseEntry` records with a `source_issue_id` may be reported as "issue-originated costs" — this is a filtered view of expenses, not a separate financial record type

---

## ISSUE vs CLIENT REQUEST

Issues and Client Requests are distinct entity types.

| Dimension | Issue | Client Request |
|---|---|---|
| Who submits | Worker | Client (via portal) |
| Triggered by | Field operational problem | Client-initiated need or query |
| Visibility | Internal only | Client can see their own requests |
| Financial chain | May generate linked expense | May generate scope change / invoice adjustment |
| Review Centre | No | May require approval depending on type |

They may use similar resolution patterns, but they are separate entities with different submitters, different visibility rules, and different financial chain triggers. They do not share a data model in v1.

---

## CONSTRAINTS AND INVARIANTS

1. An issue must be attributed to a job the submitting worker is currently assigned to.
2. A Safety or Critical issue cannot be submitted without a description. A title alone is insufficient.
3. Issues cannot be deleted. They are retained permanently in the audit trail.
4. A resolved issue cannot be reopened. If the problem recurs, a new issue must be submitted.
5. Issues do not enter Review Centre. They follow the issue acknowledgement/resolution workflow only.
6. Automation may not resolve or close issues. Automation may only escalate (notify) and remind (notify). Resolution requires human PM or CEO action.
7. An issue with `cost_request: true` does not block the worker from proceeding with work. The cost request is a background submission; the worker continues working while the expense flows through the approval chain.
8. A linked expense's rejection does not affect the issue record. Issue and expense have separate lifecycles after the initial linkage.
9. Demo company issue data must never appear in a real-business company context.

---

## ISSUE DOMAIN DECISIONS — SUMMARY TABLE

| Decision | Resolution |
|---|---|
| Classification: financial event or operational communication? | Operational communication — issues do not directly create financial records |
| Do issues enter Review Centre? | No — they follow acknowledgement/resolution workflow |
| Financial chain | Via linked expense submission (Expense Domain) — optional, worker-triggered |
| Issue types | 9 fixed types (v1) |
| Severity levels | 4 levels: Informational, Operational, Safety, Critical |
| Escalation | Notification-based; timing by severity; automation-triggered; PM/CEO only |
| Worker confirmation of resolution | Not required — PM resolution is sufficient |
| Multiple expenses per issue | Supported; each carries source_issue_id |
| Reopening a resolved issue | Not permitted — new issue for recurring problems |
| Client visibility of issues | None — internal operational records |
| Issue vs client request | Separate entities, separate workflows |
| Audit | All lifecycle transitions audited |
| Automation authority | May escalate (notify only); may never resolve or close |
