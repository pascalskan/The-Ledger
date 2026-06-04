# THE LEDGER — CLIENT REQUEST DOMAIN

## Frozen Domain Definition

Version: 1.0
Status: FROZEN
Date: June 4, 2026
Authority: Domain Definition Session — June 4, 2026

---

## STATUS

This document is the authoritative definition of the Client Request Domain in The Ledger.

Every decision recorded here is final. Ambiguities raised in the Domain Definition Audit regarding client requests — what they are, who submits them, how they are routed, their relationship to jobs, and their financial implications — have been resolved.

This document supersedes any prior partial definitions, audit findings, or implementation assumptions regarding client requests and client-initiated communications.

Backend planning for the Client Request Domain may begin from this document.

---

## WHAT IS A CLIENT REQUEST?

A client request is a structured communication submitted by a client user through the Client Portal, addressed to the platform company, representing a need, query, or concern regarding work being performed at the client's site.

A client request is NOT:
- A worker issue (Issues are field-operational records submitted by workers — see Issue Domain)
- A job creation (only PM or CEO may create jobs)
- A direct instruction to workers (clients do not have authority over worker actions)
- An invoice dispute (billing queries are a request type, but processing of payment disputes is outside v1 scope)
- A formal legal complaint (those are handled outside the platform)

**Decision:** Client requests and worker issues are fundamentally distinct entities. A client request originates from outside the operational team — it is a client-initiated communication that the PM must receive, assess, and act on. A worker issue originates from within the operational team — it is a field-reality communication requiring management response. They may describe similar events (e.g., a damage observation) but they are submitted by different actors, carry different visibility rules, and may trigger different workflows.

---

## WHO CAN SUBMIT A CLIENT REQUEST?

Client requests may only be submitted by users with the Client role who have been provisioned access to the Client Portal (see Client Portal Domain).

Workers, PMs, and CEOs cannot submit client requests. They interact with the request through the internal management surface, not through the client portal submission form.

---

## REQUEST TYPES

| Type | Code | Covers | Approval Required |
|---|---|---|---|
| Additional Service Request | `additional_service` | Client requests work beyond the current job scope | Yes — creates scope change decision |
| Service Quality Complaint | `quality_complaint` | Client reports dissatisfaction with work quality | No — PM response required; no financial effect |
| Site Access Change | `site_access` | Client advises of changes to access codes, contact, or restrictions | No — PM/CEO updates site record |
| Document Request | `document_request` | Client requests a specific document, certificate, or report | No — PM fulfils by uploading to portal |
| Billing Query | `billing_query` | Client raises a question about an invoice or charge | No — PM/CEO responds; no automatic financial change |
| Scheduling Change Request | `scheduling_change` | Client requests a change to an upcoming job date or time | Yes — PM/CEO decision required |
| Emergency Request | `emergency` | Client reports an urgent situation requiring immediate response | Yes — immediate PM/CEO notification; may trigger new job |
| General Enquiry | `general_enquiry` | Any communication not covered above | No — PM response |

**Decision:** Approval is required for request types that may have financial or operational consequences (scope changes, scheduling changes, emergencies). Informational and administrative request types (document requests, access changes, enquiries) require PM response and action, but not a formal approval-chain workflow.

---

## VISIBILITY

### Client Visibility

Clients see only their own requests. A client cannot see requests submitted by other clients.

Within their own requests, clients see:
- The request type and content
- The current status of their request
- PM responses / resolution notes

Clients do not see internal PM notes (only the response shared externally), internal routing decisions, or financial implications of their requests.

### Platform Side Visibility

| Role | Can See |
|---|---|
| CEO | All client requests across all jobs |
| PM | Client requests for jobs they are assigned to |
| Worker | No visibility of client requests |
| Client | Own requests only |

Workers do not see client requests. Client-to-company communications are managed at the PM level. If a PM determines that a worker needs to respond to a client-raised issue, the PM communicates through the standard operational workflow (scheduling a job, issuing instructions through the job record).

---

## REQUEST ROUTING

When a client submits a request:

1. The request is created in `open` status.
2. The request is routed to the PM assigned to the job or site that the request relates to.
3. The CEO receives notification for `emergency` type requests and for any request that remains unacknowledged beyond the escalation threshold.

If the client does not specify a job (e.g., a general enquiry about their account), the request is routed to the CEO.

### Escalation

| Request Type | Escalation Trigger | Action |
|---|---|---|
| Emergency | Immediately | CEO and PM notified simultaneously |
| Additional Service | Unacknowledged 24 hours | CEO notified |
| Scheduling Change | Unacknowledged 4 hours | CEO notified |
| All others | Unacknowledged 48 hours | CEO notified |

Escalation is a notification action only. It does not change request ownership or modify the request record.

---

## RELATIONSHIP TO JOBS

### Requests Linked to Existing Jobs

Most client requests relate to a specific job in progress or recently completed. The request carries a `job_id` reference.

The PM reviewing the request uses the job context to assess the request (e.g., a quality complaint about a specific job's output, a scope change to an active job).

### Requests That Generate New Jobs

An **Additional Service Request** or **Emergency Request** may result in the PM creating a new job. This is a PM/CEO action triggered by the request — the request itself does not create a job automatically.

The new job carries a `source_request_id` reference, linking the new job to the client request that triggered its creation. This creates a traceable chain from client request to new job.

**Decision:** Client requests never automatically create jobs. A client's request for additional work is a communication, not a work order. The PM must review the request, assess feasibility, confirm pricing, and create the job through the standard job creation workflow. The Approval Doctrine is preserved: no operational event (including a client request) bypasses the PM/CEO review gate.

---

## RELATIONSHIP TO SCOPE CHANGE

An **Additional Service Request** represents a client's desire to extend the scope of work beyond what was agreed.

Scope change implications:
- A scope change may affect the job's contracted revenue (more work = higher invoice)
- A scope change may require additional workers, stock, or equipment
- A scope change may extend the job duration

The PM or CEO reviews the scope change request and makes the business decision:
1. Accept the scope change and create a new job (or extend the current job's work scope note)
2. Decline the scope change with a written reason
3. Accept with modified terms

**Financial implications:** A scope change approval may result in a revised or additional invoice line item. This is handled through the standard invoicing workflow — the client request does not directly create financial records. The PM/CEO creates the appropriate invoice line items after deciding to accept the scope change.

---

## FINANCIAL IMPLICATIONS BY REQUEST TYPE

| Request Type | Direct Financial Record Created? | Indirect Financial Effect |
|---|---|---|
| Additional Service Request | No | May result in new job (which creates financial records via normal workflow) |
| Service Quality Complaint | No | May result in a credit note or discount (PM/CEO invoice adjustment — separate workflow) |
| Site Access Change | No | None |
| Document Request | No | None |
| Billing Query | No | PM/CEO may issue a credit or invoice adjustment — separate workflow |
| Scheduling Change Request | No | May result in revised job scheduling |
| Emergency Request | No | May result in new job creation (which creates financial records via normal workflow) |
| General Enquiry | No | None |

**No client request type directly creates a financial record.** Financial effects are indirect and always mediated through a PM/CEO decision and the standard approval workflow.

---

## REQUEST LIFECYCLE

### States

| Status | Meaning |
|---|---|
| `open` | Submitted by client; not yet acknowledged by PM or CEO |
| `acknowledged` | PM or CEO has opened and confirmed receipt |
| `in_progress` | Active steps are being taken to respond or resolve |
| `resolved` | PM or CEO has marked the request as resolved |
| `closed` | Request archived; no further action required |
| `declined` | PM or CEO has declined the request with a reason |

### Transitions

```
open → acknowledged     (PM or CEO action)
acknowledged → in_progress  (PM or CEO action, optional)
acknowledged / in_progress → resolved  (PM or CEO action)
acknowledged / in_progress → declined  (PM or CEO action with mandatory reason)
resolved → closed       (Automatic after 7 days, or immediate PM/CEO action)
open → declined         (PM or CEO may decline without acknowledging — requires reason)
```

### Resolution Notes

When a PM or CEO marks a request as `resolved`, they must provide a resolution note. This note is shared with the client through the portal — the client can see that their request has been addressed and read the resolution summary.

A declined request also requires a reason, which is shared with the client.

---

## APPROVAL REQUIREMENT (for approval-required types)

For request types that require approval (`additional_service`, `scheduling_change`, `emergency`):

The "approval" in this context means the PM or CEO makes a deliberate decision to accept or decline the request's core ask.

- **Accept:** PM or CEO marks the request `in_progress` or `resolved`, takes the appropriate action (creates a job, updates scheduling), and records the resolution.
- **Decline:** PM or CEO marks the request `declined` with a mandatory reason.

There is no separate Review Centre workflow for client requests. Client requests are managed through the Client Requests management surface, which is distinct from the Review Centre (Review Centre handles worker submissions for financial normalization).

**Decision:** Client requests do not enter Review Centre. Review Centre is reserved for worker submissions that produce financial records upon approval. Client requests are management communications that require PM/CEO response and action — they are not financial submission events.

---

## CLIENT VISIBILITY OF RESOLUTION

When a request is resolved or declined, the client receives a notification through the portal:
- That their request has been addressed
- The resolution note or decline reason written by the PM/CEO

The client sees the external-facing resolution content only. They do not see internal PM/CEO notes, routing history, or platform-side audit trail.

---

## AUDIT REQUIREMENTS

| Action | Audit Entry Type |
|---|---|
| Request submitted | `client_request_submitted` |
| Request acknowledged | `client_request_acknowledged` |
| Request in progress | `client_request_in_progress` |
| Request resolved | `client_request_resolved` |
| Request declined | `client_request_declined` |
| Request escalated (unacknowledged) | `client_request_escalated` |
| New job created from request | `job_created_from_client_request` |

All entries carry: `who`, `what`, `when`, `source_object_id` (request_id), `external_reference` (job_id and client_id).

---

## CONSTRAINTS AND INVARIANTS

1. Client requests may only be submitted by provisioned Client Portal users.
2. A client request cannot be modified after submission. If a client needs to provide additional information, they submit a new request or the PM adds context through the internal management surface.
3. A declined request cannot be reopened. If the client wishes to resubmit, they create a new request.
4. No client request type directly creates a financial record. All financial effects are mediated through PM/CEO decision and the standard workflow.
5. Client requests never enter Review Centre.
6. Automation may not resolve, decline, or approve client requests. Resolution requires human PM or CEO action.
7. The decline reason is always shared with the client. There is no silent decline.
8. Demo company client request data must never appear in a real-business company context.

---

## WHAT THIS DOMAIN DOES NOT COVER

- **Invoice disputes and payment terms** — billing queries surface the issue but resolution (credit notes, payment plans) is outside v1 scope
- **Client SLA management** — whether the platform enforces contracted response times and generates SLA breach records is deferred
- **Client satisfaction surveys** — deferred
- **Client self-service beyond requests** — clients submitting requests is the boundary of self-service; direct client access to scheduling, job creation, or worker management is not supported

---

## CLIENT REQUEST DOMAIN DECISIONS — SUMMARY TABLE

| Decision | Resolution |
|---|---|
| What is a client request? | Client-submitted communication via portal representing a need, query, or concern |
| Who can submit | Provisioned Client Portal users only |
| Request types | 8 types (additional_service, quality_complaint, site_access, document_request, billing_query, scheduling_change, emergency, general_enquiry) |
| Does a client request enter Review Centre? | No — separate management surface |
| Financial records created directly? | Never — all financial effects mediated through PM/CEO decision |
| Scope change → new job | PM/CEO creates new job; client request carries source_request_id |
| Approval model | PM/CEO decision to accept or decline; no separate approval queue |
| Decline requirement | Mandatory reason; shared with client |
| Client visibility of resolution | Resolution note or decline reason; not internal notes or audit trail |
| Automation authority | May escalate (notify only); never resolve or decline |
| Worker visibility of requests | None |
| Escalation | Unacknowledged threshold by type; notification to CEO |
