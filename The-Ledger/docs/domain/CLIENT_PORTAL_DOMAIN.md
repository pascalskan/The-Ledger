# THE LEDGER — CLIENT PORTAL DOMAIN

## Frozen Domain Definition

Version: 1.0
Status: FROZEN
Date: June 4, 2026
Authority: Domain Definition Session — June 4, 2026

---

## STATUS

This document is the authoritative definition of the Client Portal Domain in The Ledger.

Every decision recorded here is final. Ambiguities raised in the Domain Definition Audit regarding client portal provisioning, account ownership, access scope, authentication assumptions, and visibility rules have been resolved.

This document supersedes any prior partial definitions, audit findings, or implementation assumptions regarding client portal access.

Backend planning for the Client Portal Domain may begin from this document.

The Client Portal is a read-access and request-submission surface for clients. It is not an operational management tool.

---

## WHAT IS THE CLIENT PORTAL?

The Client Portal is a restricted, client-facing view of The Ledger that allows authorised client users to:
- Monitor work being performed at their sites
- View documents relevant to their jobs
- View invoice status and financial summaries
- Submit requests to the platform company (see Client Request Domain)

The Client Portal is NOT:
- A way for clients to manage workers or direct operations
- A way for clients to approve submissions
- A way for clients to create jobs
- A way for clients to access other clients' data
- A full accounting or financial reporting view

The Client Portal is a transparency and communication layer between the platform company and its clients. Its purpose is to give clients appropriate visibility into the work being performed on their behalf, without exposing internal operational or financial management data.

---

## PROVISIONING MODEL

### Who Provisions Client Portal Access?

Only the CEO may provision client portal access. PMs may not provision portal access.

**Decision rationale:** Client portal access grants external parties visibility into the company's platform data. This is a governance decision — the CEO determines which clients receive portal access and which clients do not. A PM who manages the client relationship day-to-day does not have the authority to grant external system access.

### How Is Access Provisioned?

1. CEO creates a Client Portal account for the client.
2. The account is linked to the existing `client_id` in the platform.
3. The CEO sets the access scope (which sites the portal account can see — see Access Scope below).
4. The client user receives credentials (email + temporary password or invitation link).
5. The client logs in and sets their permanent password.

In v1, one portal account is created per client. Multi-user portal access (where a client has multiple portal users with different people) is not supported in v1 but is anticipated as a future capability. The portal account represents the client organisation, not an individual named user within the client organisation.

### Account Ownership

| Dimension | Owner |
|---|---|
| Portal account creation | CEO only |
| Portal account deactivation | CEO only |
| Portal access scope changes | CEO only |
| Portal account credentials | Client (once provisioned) |

Once provisioned, the client controls their own login credentials. The CEO can deactivate or reset the account but cannot access the portal as the client.

### Account Deactivation

The CEO may deactivate a client's portal access at any time. Deactivation prevents login but retains the account. Deactivated accounts can be reactivated by the CEO.

If a client relationship ends, the CEO deactivates the portal account. Historical records remain accessible to the company internally; the client loses access.

---

## ACCESS SCOPE

A client's portal access is scoped to the sites that belong to their `client_id`.

### Default Scope

By default, a provisioned portal account has access to all sites belonging to the client. This is the standard configuration.

### Restricted Scope (Optional)

The CEO may restrict a portal account to a subset of the client's sites. This is used when a client has multiple sites but a specific portal user should only see certain locations (e.g., a regional manager who only manages certain sites).

**Decision:** In v1, site-level scope restriction is a CEO-managed setting on the portal account. It is binary: the account can see a site or it cannot. More granular scope restrictions (e.g., access to some jobs at a site but not all) are not supported in v1.

---

## AUTHENTICATION ASSUMPTIONS

In v1, The Ledger uses its own authentication system (email + password) for client portal users. Client portal users are distinct from internal platform users (CEO, PM, Worker). They log in through a separate portal-login surface.

The following are deferred to future versions:
- Single sign-on (SSO) / OAuth integration with the client's own identity provider
- Multi-factor authentication for client users
- API-level access for client systems

Authentication infrastructure for the client portal must be separate from the internal user authentication. A client portal user must never be able to access any internal platform view, even if they somehow obtain internal credentials.

---

## SITE VISIBILITY

Clients see only sites that belong to their `client_id` and are within their access scope.

What clients see at the site level:
- Site name and address
- Site type
- Current status (active, inactive) — clients are not shown the `archived` status (archived sites are no longer their active relationship)
- Jobs at the site (see Job Visibility below)
- Documents shared at the site level (see Document Visibility below)

What clients never see at the site level:
- Access notes (door codes, contact on site, internal access information)
- PM assignment details
- Other clients' sites
- Internal site management history
- Financial margin or cost data for the site

---

## JOB VISIBILITY

Clients see jobs at their accessible sites.

### Which Jobs Are Visible

| Job Status | Client Visibility |
|---|---|
| `draft` | Not visible — not yet confirmed or scheduled |
| `scheduled` | Visible — client knows work is planned |
| `active` | Visible — client can see work is in progress |
| `pending_closure` | Visible — client can see work is completing |
| `closed` | Visible — client can see historical completed jobs |
| `cancelled` | Not visible — cancelled jobs are internal |

**Decision:** Draft jobs are not shown because they may be planning artefacts that are never confirmed. Cancelled jobs are not shown because they may contain sensitive internal reasoning. All other statuses are visible.

### What Clients See for Each Job

| Field | Visible to Client |
|---|---|
| Job title | Yes |
| Job description (summary) | Yes — a summary version, not full internal notes |
| Site | Yes |
| Scheduled date | Yes |
| Status | Yes |
| Assigned crew (worker names) | Yes (first name + role only — see Crew Visibility) |
| PM name | Yes (for client communication context) |
| Financial data (margin, cost) | No |
| Timesheet data | No |
| Expense data | No |
| Issue logs | No |
| Internal job notes | No |

### Crew Visibility

Clients may see the names and roles of workers assigned to their jobs. This supports the client's ability to confirm who is attending their site.

Crew visibility is limited to:
- Worker first name
- Worker role (e.g., "Cleaning Operative", "Security Officer") — not the internal worker classification
- Whether the worker is currently on-site (shift active) or scheduled

Workers' personal information (surname, contact details, payroll rate, classification) is never visible to clients.

---

## DOCUMENT VISIBILITY

Documents shared with a client are accessible through the portal.

### What Documents Are Visible

Documents must be explicitly shared with the client by a PM or CEO. Documents are not automatically visible to clients because they are added to a job.

| Document Type | Client Visibility |
|---|---|
| Work completion reports (summary) | Yes — if PM shares |
| QA observations summary | Yes — if PM shares |
| Site visit photos | Yes — if PM shares |
| Risk assessments | Yes — if PM shares |
| Method statements | Yes — if PM shares |
| Certificates and compliance documents | Yes — if PM shares |
| Invoices | Yes — via invoice view (see Financial Visibility) |
| Internal operational documents | No |
| Worker timesheets | No |
| Worker expense records | No |

**Decision:** Documents must be actively shared by the PM or CEO. The client portal does not expose documents by default. The sharing decision is a deliberate act by the platform company — they choose what the client sees. This preserves the company's ability to control client-facing information and prevents accidentally exposing internal-only content.

---

## FINANCIAL VISIBILITY

Clients have limited, read-only financial visibility. They see the commercial dimension of their relationship with the company, not the operational cost structure.

### What Clients See

| Financial Item | Visible | Detail Level |
|---|---|---|
| Invoice | Yes | Invoice number, date, amount, line items, status (issued/paid/overdue) |
| Invoice line items | Yes | Description and amount per line — same as the invoice document |
| Payment status | Yes | Paid, outstanding, overdue |
| Financial summary | Yes | Total invoiced to date, total outstanding |

### What Clients Never See

| Financial Item | Visible |
|---|---|
| Labour cost (timesheets) | No |
| Expense cost | No |
| Materials cost | No |
| Equipment cost | No |
| Job gross margin | No |
| Job profitability | No |
| Worker pay rates | No |
| Internal cost breakdowns | No |

**Decision rationale:** Clients have a legitimate commercial interest in their invoices and payment status. They do not have a legitimate interest in the company's internal cost structure, margins, or labour rates. Exposing cost data to clients would compromise the company's commercial position (clients could use margin information in contract negotiations). The portal financial view is the client's commercial statement, not the company's management accounts.

---

## REQUEST VISIBILITY

Clients see all requests they have submitted.

What clients see for each request:
- Request type
- Submission date and time
- Current status
- PM response / resolution note (when resolved or declined)

Clients do not see internal routing, escalation history, or internal PM notes.

See Client Request Domain for the full request lifecycle.

---

## CLIENT PORTAL RBAC SUMMARY

| Feature | Client Portal User |
|---|---|
| View own sites | Yes |
| View other clients' sites | No |
| View own jobs | Yes (scheduled, active, pending_closure, closed) |
| View job financial data | No |
| View assigned crew (names + roles) | Yes |
| View documents shared with them | Yes |
| View invoices | Yes |
| View timesheets / expenses / issues | No |
| Submit client requests | Yes |
| Create jobs | No |
| Approve submissions | No |
| Manage workers | No |

---

## PORTAL NAVIGATION STRUCTURE (v1)

The client portal provides the following navigation sections:

1. **Dashboard** — Summary view: active jobs at my sites, recent activity, outstanding invoices
2. **Sites** — List of accessible sites with status and recent job activity
3. **Jobs** — All jobs at accessible sites, filterable by site and status
4. **Documents** — Documents shared with this client
5. **Invoices** — All invoices for this client with payment status
6. **Requests** — Client's submitted requests and their statuses
7. **Notifications** — In-portal notifications for request updates, job status changes, invoice issuance

---

## AUDIT REQUIREMENTS

All client portal access generates immutable audit records for the platform's audit trail. The client portal is a read-only surface — the audit records protect the company's governance position.

| Action | Audit Entry Type |
|---|---|
| Portal account provisioned | `client_portal_provisioned` |
| Portal account deactivated | `client_portal_deactivated` |
| Client logged in | `client_portal_login` |
| Client viewed a job | `client_viewed_job` |
| Client viewed a document | `client_viewed_document` |
| Client viewed an invoice | `client_viewed_invoice` |
| Client submitted a request | `client_request_submitted` |
| Document shared with client | `document_shared_with_client` |

All entries carry: `who` (client user ID or CEO user ID), `what`, `when`, `source_object_id`, `external_reference` (client_id and job_id/site_id where applicable).

---

## CONSTRAINTS AND INVARIANTS

1. Only the CEO may provision, modify the scope of, or deactivate a client portal account.
2. A client portal user may only see data belonging to their own client_id. Cross-client data leakage is not permitted.
3. Access notes are never visible to portal users.
4. Financial cost data (labour, expenses, materials, equipment, margin) is never visible to portal users.
5. Documents must be explicitly shared before they appear in the portal. No document is automatically exposed.
6. Workers' personal information (surname, contact details, payroll rate) is never visible to portal users.
7. Client portal sessions are scoped to the client user's access scope. If the CEO restricts access to a subset of sites, the client cannot access other sites.
8. Cancelled and draft jobs are never visible to portal users.
9. The client portal is read-only for all data except request submission.
10. Demo company client portal data must never appear in a real-business company context.

---

## WHAT THIS DOMAIN DOES NOT COVER

- **Multi-user portal accounts** — multiple named users within one client organisation having individual portal logins is deferred
- **Client self-service scheduling** — clients requesting specific dates and slots directly is deferred; in v1, clients submit scheduling change requests which PMs then act on
- **SSO / OAuth** — client identity provider integration is deferred
- **Client document upload** — clients uploading documents to the portal is deferred; in v1, document flow is one-way (company to client)
- **Client reporting** — detailed client-facing analytical reports (trends, service history analysis) are deferred; in v1, clients see job lists and invoice summaries
- **Mobile client app** — a dedicated mobile application for clients is deferred; in v1, the portal is a responsive web application

---

## CLIENT PORTAL DOMAIN DECISIONS — SUMMARY TABLE

| Decision | Resolution |
|---|---|
| Who provisions access | CEO only |
| Default scope | All sites belonging to the client_id |
| Scope restriction | CEO may restrict to subset of sites |
| Multi-user portal in v1 | Not supported — one account per client |
| Authentication | Platform-managed (email + password); SSO deferred |
| Site visibility | Own sites only; access notes not visible |
| Job visibility | Scheduled, active, pending_closure, closed; draft and cancelled not shown |
| Crew visibility | First name and role only; no personal details |
| Document visibility | Explicitly shared only; no automatic exposure |
| Financial visibility | Invoices and payment status only; no cost/margin data |
| Request visibility | Own requests only; no internal routing |
| Client portal is | Read-only except for request submission |
| Audit | All access actions audited |
