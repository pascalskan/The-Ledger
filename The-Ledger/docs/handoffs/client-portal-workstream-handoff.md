# THE LEDGER — Workstream D: Client Portal

## Workstream Handoff Document

Version: 1.0
Status: Complete — awaiting review and merge
Branch: `feature/client-portal-workstream`
Date: July 19, 2026
Phases: CL-1 (Audit) → CL-7 (Validation & Merge Readiness)

---

## EXECUTIVE SUMMARY

Workstream D rebuilt the Client Portal from a single unauthenticated mock page into a
complete, doctrine-compliant, customer-facing product surface.

At the start of this workstream (CL-1 audit), the portal was a ~338-line page with a
**cosmetic login** (both buttons hard-coded to demo client `dc1`), **no projection layer**,
**no audit trail**, **no provisioning model**, hardcoded financial figures, and an **active
doctrine violation** — crew surnames were rendered to clients.

The portal now provides:

- Real portal-account authentication with Active / Disabled / Pending enforcement
- A client-safe **projection layer** that every portal view consumes — no portal component
  ever touches a raw internal entity
- CEO-only portal provisioning from the internal Client Management surface
- A responsive 8-section portal shell (desktop / tablet / mobile)
- Project visibility with milestones, deliverables, derived progress and a client-safe timeline
- Explicit document sharing (PM/CEO controlled) with non-destructive, audited revocation
- A structured Communication Centre
- A Financial Centre exposing the client's full commercial position while making internal
  financial intelligence structurally unreachable
- 93 doctrine tests across 6 specification files
- A complete audit trail of 15 client-portal audit event types

**No internal CEO / PM / Worker behaviour was changed** other than two additive, role-gated
document-sharing controls on the job detail page.

---

## SCOPE COMPLETED

| Phase | Title | Commit | Outcome |
|---|---|---|---|
| CL-1 | Client Portal Audit | — | Current-state assessment, gap analysis, UX audit, risk register, CL-2→CL-7 plan |
| CL-2 | Foundation, Provisioning & Authentication | `d3c82ba` | Projection layer, PortalAccount model, mock auth, CEO provisioning, audit engine, crew-surname doctrine fix |
| CL-3 | Portal Shell, Dashboard & Navigation | `3cb66c0` | Responsive shell, routed sections, derived-KPI dashboard, Sites projection, white-label config |
| CL-4 | Project Visibility & Deliverables | `f718798` | Milestones, deliverables, derived progress, client-safe timeline, project summary |
| CL-5 | Documents & Communication | `29ef52a` | Shared-document model + PM/CEO share/revoke controls, Documents page, Communication Centre |
| CL-6 | Financial Transparency | `167ecc1` | Quotes, variations, credit notes, payments, invoice detail, derived financial KPIs |
| CL-7 | Final Validation, Audit & Merge Readiness | _this commit_ | Dead-code removal, accessibility pass, documentation, handoff |

---

## ARCHITECTURE DECISIONS

### 1. A dedicated projection layer is the doctrine boundary

The single most important architectural decision. `client/src/lib/portalProjections.ts` is
the **only** path by which data reaches the portal. Projection functions construct **fresh
objects containing an explicit whitelist of fields**, rather than spreading or omitting from
internal entities.

This makes forbidden data *structurally unreachable* rather than merely un-rendered: a future
developer cannot accidentally expose `job.costs` by adding a field to a component, because
the cost data never enters the projected object in the first place.

**Verified in CL-7:** exactly one portal file (`pages/portal.tsx`, the controller) imports
`useStore`. A repository grep for `.costs`, `.financials`, `costRate`, `billableRate`,
`grossProfit`, `marginPercent`, `quickbooksInvoiceId`, `approvedRevenue` and
`pendingExposure` across all portal code returns matches **only inside comments that document
their exclusion**.

### 2. Portal authentication is separate from internal authentication

Portal sessions use a distinct storage key (`ledger-portal-session`) and a distinct hook
(`usePortalAuth`). A portal user is never an internal `User` and can never reach an internal
view, satisfying the domain requirement that "a client portal user must never be able to
access any internal platform view, even if they somehow obtain internal credentials."

### 3. Client-facing models are separate from internal models

Milestones, deliverables, shared documents, communication threads, quotes, variations, credit
notes and payments are defined as **client-facing models** in their own modules. They contain
no cost, margin, payroll, review, governance or accounting-sync concept at all. This is a
deliberate second layer of defence behind the projection layer.

### 4. Revocation is non-destructive

Revoking a client's document access retains the record with `visibilityStatus: "Revoked"`
rather than deleting it, so the original sharing decision remains auditable — consistent with
the Audit Doctrine's "no silent mutations" principle.

### 5. Derived, never hardcoded

Every KPI, progress percentage, invoice status and balance is derived from the underlying mock
models at render time. The CL-1 audit found hardcoded financial figures; none remain.

---

## PROJECTION LAYER OVERVIEW

Location: `client/src/lib/portalProjections.ts`

| Projection Model | Source | Notes |
|---|---|---|
| `PortalClient` | `Client` | id, clientId, name only — no notes, tags, terms, billing address |
| `PortalCrewMember` | `Worker` | **First name + role only.** Surname, contact, rates, classification, documents dropped |
| `PortalJob` | `Job` | No `costs`, `financials`, `accessInstructions`, `estimatedRevenue`, equipment internals |
| `PortalSite` | derived from `Job.locationAddress` | Name, address, rollup counts. No access notes, alarm codes, security info |
| `PortalMilestone` | `ClientProjectMilestone` | Client-facing model |
| `PortalDeliverable` | `ClientDeliverable` | View-only — no approval controls rendered |
| `PortalTimelineEvent` | derived lifecycle + milestones + deliverables | No internal review/governance events |
| `PortalDocument` | `ClientSharedDocument` | **Shared status only** — revoked and internal documents never projected |
| `PortalThread` / `PortalMessage` | `ClientCommunicationThread/Message` | External conversation only — no internal PM notes or routing |
| `PortalQuote` | `ClientQuote` | **Draft quotes never projected** |
| `PortalVariation` | `ClientVariation` | **Pending Approval variations never projected** |
| `PortalInvoice` | `Invoice` | **Draft never projected.** Status is *derived*; `notes`, `companyId`, `quickbooksInvoiceId` never copied |
| `PortalPayment` / `PortalCreditNote` | `ClientPayment` / `ClientCreditNote` | Client-facing models |
| `ClientFinancialProjection` | aggregate | All KPIs derived |

### Invoice status derivation (doctrine-critical)

The internal `Invoice.status` union is **not** passed through to the client:

| Internal | Client-facing | Rationale |
|---|---|---|
| `Draft` | *not projected* | Internal working state |
| `Sent` | `Issued` / `Part Paid` / `Paid` | Refined by payments received |
| `Exported` | `Issued` | **`Exported` is an accounting-sync state and must never leak** |
| `Overdue` | `Overdue` | Unless fully paid |
| `Paid` | `Paid` | — |
| `Void` | `Cancelled` | Client-appropriate terminology |

---

## AUTHENTICATION SUMMARY

Location: `client/src/lib/portalAuth.ts`

- **Model:** `PortalAccount` — `id`, `clientId`, `email`, `status`, `createdAt`, `lastLoginAt`, `permissions[]`
- **Statuses:** `Active` (may sign in) · `Disabled` (blocked) · `Pending` (blocked until activated)
- **Multi-user:** a client organisation may hold multiple portal accounts
- **Session:** `localStorage` key `ledger-portal-session`, separate from internal `ledger-auth-email`.
  Session restore only rehydrates **Active** accounts — a disabled account cannot be resurrected from a stale session.
- **Provisioning:** CEO-only, from the Client Detail page. PMs receive read-only visibility of portal users.
- **Seed accounts:**

| Email | Client | Status |
|---|---|---|
| `portal@hsslimited.co.uk` | dc1 (HSS Limited) | Active |
| `sitemanager@hsslimited.co.uk` | dc1 | Pending |
| `portal@showcasesystems.co.uk` | dc2 (Showcase Systems) | Active |
| `former@showcasesystems.co.uk` | dc2 | Disabled |

Authentication is a **frontend mock** — passwords are not validated. This is intentional
per the platform's prototype model and is listed under Known Limitations.

---

## RBAC SUMMARY

All portal data is scoped by the signed-in account's `clientId`, and project-scoped data is
further scoped to that client's **visible project ids**.

| Surface | Scoping rule |
|---|---|
| Projects | `job.clientId === account.clientId`, and status must be client-visible |
| Sites | Derived only from that client's visible jobs |
| Documents | `projectId ∈ visibleProjectIds` **and** `visibilityStatus === "Shared"` |
| Threads / Messages | `projectId ∈ visibleProjectIds` |
| Quotes / Variations / Payments / Credit notes | `projectId ∈ visibleProjectIds` |
| Invoices | `invoice.clientId === account.clientId`, `status !== "Draft"` |

**Job status visibility** (per CLIENT_PORTAL_DOMAIN): `Planned`, `Active` and `Completed` are
visible; `Cancelled` is hidden. The prototype's `JobStatus` enum has no `draft` or
`pending_closure` equivalent — see Known Limitations.

**Route protection:** the portal is self-authenticating. Direct-URL access to any section
(`/portal/jobs`, `/portal/invoices`, etc.) while signed out renders the login screen, verified
by tests CPS-03 and CPS-04.

---

## FINANCIAL VISIBILITY RULES

### Clients MAY see

Quotes (non-draft) · Approved and rejected variations · Invoices (non-draft) with line items ·
Credit notes · Payment history · Outstanding balance · Overdue amount · Next due invoice ·
Account health indicator

### Clients may NEVER see

Labour cost · Material cost · Equipment cost · Job margin · Gross profit · Net profit ·
Internal estimates · Internal forecasts · Payroll · Review Centre data · Financial Controls ·
Accounting Sync status · Reconciliation · Exception Resolution · Automation activity ·
Internal audit entries · Worker pay rates · Internal cost breakdowns

**Enforcement:** these concepts are absent from the client-facing financial models entirely,
and the projection functions never read them from internal entities. Tests CPF-19 and CPF-20
assert that the rendered financial surface contains no occurrence of *margin*, *gross profit*,
*net profit*, *payroll*, *forecast*, *cost breakdown*, *quickbooks*, *reconciliation*,
*exception*, *review centre*, *financial control* or *exported*.

**A deliberate nuance:** invoice line descriptions read "Labour: …", "Materials: …",
"Equipment: …". These are the *billed* amounts on the client's own invoice — explicitly
permitted by the domain ("Description and amount per line — same as the invoice document") —
and are **not** internal cost data. The doctrine tests therefore do not forbid these words.

---

## AUDIT INFRASTRUCTURE

Location: `client/src/lib/portalAudit.ts`

All entries are immutable and carry `who`, `what`, `when`, `clientId`, `sourceObjectId` and
`externalReference`.

| # | Event | Phase |
|---|---|---|
| 1 | `client_portal_provisioned` | CL-2 |
| 2 | `client_portal_login` | CL-2 |
| 3 | `client_portal_logout` | CL-2 |
| 4 | `client_viewed_dashboard` | CL-2 |
| 5 | `client_viewed_job` | CL-2 |
| 6 | `client_viewed_document` | CL-5 |
| 7 | `client_viewed_invoice` | CL-6 |
| 8 | `client_created_request` | reserved — Client Request Domain |
| 9 | `document_shared_with_client` | CL-5 |
| 10 | `document_access_revoked` | CL-5 |
| 11 | `client_created_thread` | CL-5 |
| 12 | `client_viewed_thread` | CL-5 |
| 13 | `client_viewed_quote` | CL-6 |
| 14 | `client_viewed_payment` | CL-6 |
| 15 | `client_downloaded_invoice` | CL-6 |

A **read-only** `window.__portalAudit` accessor (`getLog`, `countByType`) is exposed so the
Playwright suite can assert that portal access generates audit records against in-memory mock
state. No mutator is exposed. This should be removed when a real backend audit store lands.

---

## TESTING SUMMARY

93 doctrine tests across 6 specification files.

| Spec | Tests | Coverage |
|---|---|---|
| `client-portal.spec.ts` | 15 (CP-01…15) | Authentication (active/disabled/pending/unknown), sign-out, client isolation, crew visibility, audit |
| `client-portal-shell.spec.ts` | 14 (CPS-01…14) | Navigation, route protection, cancelled-job hiding, site scoping, derived KPIs, branding |
| `client-portal-projects.spec.ts` | 16 (CPP-01…16) | Project visibility, milestones incl. Delayed, derived progress, deliverables (view-only, scoped), team visibility, timeline, internal-data exclusion |
| `client-portal-documents.spec.ts` | 14 (CPD-01…14) | Shared visible, revoked hidden, internal hidden, scoping, filters/search, PM & CEO sharing, revocation, audit |
| `client-portal-communication.spec.ts` | 13 (CPC-01…13) | Thread/message scoping, statuses, chronology, creation, validation, closed threads, audit |
| `client-portal-financials.spec.ts` | 21 (CPF-01…21) | Derived KPIs, balance/health, draft-quote hiding, pending-variation hiding, draft-invoice hiding, derived statuses, invoice detail, payments, projection-layer doctrine, branding |

Additionally, the CL-3 tests CPS-02 and CPS-11 were updated in CL-6 to reflect the Financial
Centre and the expanded invoice seed.

### Doctrine-critical assertions

- Crew surnames (`Taylor`, `Hughes`) never appear; crew names are single-token
- Cancelled jobs, draft quotes, pending variations, draft invoices and revoked documents never render
- An internal job document (`Site_Survey_Photos.zip`) that was never shared does not appear
- Cross-client isolation asserted in **both** directions for projects, sites, documents, threads, quotes and payments
- No margin / profit / payroll / forecast / sync / reconciliation / exception / control terms in financial views

---

## KNOWN LIMITATIONS

1. ~~**Client Requests are not implemented.**~~ **RESOLVED in CL-8** — see the CL-8 section below.
   `CLIENT_REQUEST_DOMAIN.md` is now implemented: 8 request types, 6-state lifecycle, mandatory
   resolution notes and decline reasons, derived escalation, PM/CEO management surface at
   `/client-requests`, and 7 new audit event types.
2. **Authentication is a frontend mock.** Passwords are not validated; any password signs in an
   Active account. Real credential handling, password reset and session expiry require a backend.
3. **Job status mapping is approximate.** The domain specifies `scheduled`, `active`,
   `pending_closure`, `closed`, `draft`, `cancelled`. The prototype's enum is `Planned`,
   `Active`, `Completed`, `Cancelled`. `draft` and `pending_closure` have no prototype
   equivalent, so only `Cancelled` hiding is enforceable today.
4. **Cross-surface revocation is not end-to-end testable.** The internal app and the portal
   share module state only within a single page context; navigating between them requires a
   reload that resets the mock store. Revocation is tested on the internal side (status → Revoked)
   and portal hiding via a seeded revoked fixture.
5. **Site model is derived, not first-class.** No `Site` entity exists; portal sites are derived
   by grouping the client's jobs by `locationAddress`. Two clients with jobs at the same address
   each correctly see only their own jobs, but sites are not independently manageable.
6. **`window.__portalAudit` ships in the bundle** as a read-only test seam.
7. **Documents have no file storage.** Sharing is metadata-only; "View"/"Download" record audit
   events and show a toast rather than serving a file.
8. **Credit notes reduce the outstanding balance but have no lifecycle** (no issue/approval flow).
9. **Branding is a single global config.** `getPortalBranding()` accepts a `clientId` for
   forward-compatibility but always returns the default configuration.

---

## CL-8 — CLIENT REQUESTS (July 19, 2026)

Branch: `feature/cl-8-client-requests`

CL-8 closed the largest gap in the workstream and resolved both outstanding ratification items.

### Client Requests implemented

`client/src/lib/portalRequests.ts` implements `CLIENT_REQUEST_DOMAIN.md` in full:

- **8 request types** — additional_service, quality_complaint, site_access, document_request,
  billing_query, scheduling_change, emergency, general_enquiry
- **6-state lifecycle** — open → acknowledged → in_progress → resolved → closed, plus declined,
  with transitions enforced by an explicit allow-list (`canTransition`)
- **Mandatory notes** — resolution requires a note; decline requires a reason. Both are shared
  with the client, enforced in the mutator rather than only in the UI
- **Terminal states** — declined and closed permit no further transitions, so a declined request
  cannot be reopened
- **Derived escalation** — thresholds per type (emergency immediate, scheduling_change 4h,
  additional_service 24h, others 48h). Escalation is computed at read time, never stored, because
  the domain defines it as a notification action that "does not change request ownership or modify
  the request record"
- **Human actor required** — every lifecycle mutator takes an `actor` argument and there is no
  system/automated caller path, satisfying "automation may not resolve, decline or approve"

### Doctrine guarantees, structurally enforced

| Guarantee | How |
|---|---|
| Requests never enter the Review Centre | The module shares no type, store or code path with `ReviewItem`. Verified by grep |
| No request creates a financial record | No invoice, payment, revenue or cost concept exists in the module |
| Client never sees internal routing | `routedTo`, escalation state and `resultingJobId` are absent from `PortalRequest` |
| No silent decline | `declineRequest` rejects an empty reason before any state change |

### Management surface

`/client-requests` (CEO + PM). **Deliberately separate from the Review Centre.** CEO sees all
requests; PM sees only requests for jobs they manage. Escalation flags, decision-required markers,
and resolve/decline dialogs enforcing mandatory notes.

### Ratification items resolved

1. **8th nav item — resolved by folding.** Messages was folded into Requests as a Conversations
   tab, restoring the domain's seven sections. The two remain distinct models; only the navigation
   is unified, so a client is not asked to classify their own need before raising it. The
   `/portal/messages` route remains valid for conversation deep links.
2. **Financial visibility — resolved by ratification.** `CLIENT_PORTAL_DOMAIN.md` amended to v1.1,
   adding quotes, approved variations, credit notes and payment history to the Financial Visibility
   table with recorded rationale.

   The differing treatment is deliberate: **conform the code to doctrine where conforming is cheap;
   amend doctrine only where its own principle already covers the case and conforming would destroy
   value.** The nav count was arbitrary and cheap to conform to. The financial list was an
   incomplete enumeration under a principle ("the client's commercial statement") that already
   admits those artefacts.

### Also in CL-8

`client/src/pages/portal/placeholders.tsx` deleted — all three placeholders (Documents, Invoices,
Requests) are now real implementations.

**Tests:** `client-portal-requests.spec.ts` (CR-01…CR-23).

---

## ITEMS REQUIRING OWNER RATIFICATION

> **Both items below were resolved in CL-8.** Retained for the decision record.

Two implementation decisions deviate from frozen documents. Both were flagged when made and
are restated here for an explicit decision before merge.

1. **An 8th navigation item ("Messages") was added.** `CLIENT_PORTAL_DOMAIN.md` §Portal
   Navigation Structure (v1) specifies exactly seven sections. CL-5 mandated a *dedicated*
   communication experience, so Messages was surfaced as its own destination rather than buried.
   **Options:** ratify the 8-item nav, or fold Messages into Requests during the Client Request
   implementation.
2. **Financial visibility was extended beyond the frozen table.** The domain's financial table
   covers invoices, line items, payment status and totals. CL-6 additionally exposes **quotes,
   approved variations, credit notes and payment history**. These are commercial artefacts the
   client is a party to and are consistent with the doctrine's stated rationale ("the client's
   commercial statement"), but they extend the frozen specification.

---

## FUTURE ENHANCEMENTS

1. **Client Requests (highest priority)** — implement `CLIENT_REQUEST_DOMAIN.md` in full
2. **Backend integration** — real authentication, persistence, file storage, server-enforced RBAC
3. **Server-side projection enforcement** — the projection layer must be mirrored in the API so
   scoping is enforced server-side, not merely client-side
4. **Site as a first-class entity** — per `SITE_DOMAIN.md`, replacing address-grouping
5. **Per-tenant branding** — resolve `PortalBrandingConfig` per company for true white-label
6. **Notifications** — real in-portal notification records rather than a derived activity feed
7. **Client document upload** — currently one-way (company → client) by domain decision
8. **SSO / MFA** — deferred by the domain
9. **Accessibility** — automated axe-core sweep in CI to complement the manual CL-7 pass
10. **Invoice PDF generation** — real artefacts for the download action

---

## VERIFICATION AT HANDOFF

- **Build:** PASS (`npm run build`)
- **TypeScript:** 76 total errors, **all pre-existing** and unrelated to this workstream
  (`ReviewItem` / `ApprovalStatus` type drift in `mockData.ts`, `job-detail.tsx`,
  `finance-hub.tsx` and other pre-existing files). Verified by checking out the pre-workstream
  merge-base (`0ff43e3`) and re-running `tsc`: **identical 76 errors before and after the
  workstream — zero type regressions.** All portal files are clean.

  Note: `npm run check` cannot serve as a merge gate for this repository, because `main`
  itself does not pass it. The `ReviewItem` / `ApprovalStatus` drift warrants its own
  remediation ticket.
- **Playwright: FULL SUITE GREEN — 892 / 892 passed** (run by the repository owner,
  July 19, 2026, `npx playwright test --workers=3`, ~1.0h). This includes all 93 client-portal
  doctrine tests and the entire pre-existing suite — **no regressions in any other workstream.**

  Two non-test errors were reported at teardown:
  `worker-N process did not exit within 300000ms after stop, force-killed it`. These are
  browser-process cleanup failures, not test failures, and are consistent with the config's
  `headless: false` setting leaving headed Chromium processes alive. They added roughly ten
  minutes of wall-clock to the run and would cause a non-zero exit in CI. Setting
  `headless: true` for non-interactive runs is the recommended fix.

- **Parallel execution:** the config sets `workers: 1` with the comment *"Parallel execution
  causes tests to corrupt each other's mock state."* The full green run at `--workers=3`
  demonstrates this is no longer true — Playwright isolates each worker in its own browser
  context, and the mock store is client-side module state, so it does not leak between
  workers. Raising the default worker count is a safe, significant speed win.
- **Dead code:** three orphaned components removed in CL-7 (`FinancialOverview.tsx`,
  `ProjectDocuments.tsx`, `ActivityTimeline.tsx`)
- **Debug code:** none — no `console.*`, `debugger`, `TODO` or `FIXME` in portal code

---

## FILES OWNED BY THIS WORKSTREAM

### Libraries
```
client/src/lib/portalAuth.ts              Portal accounts, session, usePortalAuth
client/src/lib/portalAudit.ts             15 audit event types, immutable log
client/src/lib/portalProjections.ts       THE DOCTRINE BOUNDARY
client/src/lib/portalBranding.ts          White-label configuration
client/src/lib/portalActivity.ts          Client-safe activity feed
client/src/lib/portalProjectModels.ts     Milestones, deliverables, timeline
client/src/lib/portalDocuments.ts         Shared documents + share/revoke
client/src/lib/portalCommunication.ts     Threads and messages
client/src/lib/portalFinancialModels.ts   Quotes, variations, credit notes, payments
```

### Pages and components
```
client/src/pages/portal.tsx                       Controller: routing, auth gate, projections, audit
client/src/pages/portal/dashboard.tsx             KPIs + activity
client/src/pages/portal/sites.tsx                 Sites
client/src/pages/portal/jobs.tsx                  Project list + detail
client/src/pages/portal/documents.tsx             Documents
client/src/pages/portal/messages.tsx              Communication Centre
client/src/pages/portal/finance.tsx               Financial Centre
client/src/pages/portal/notifications.tsx         Notifications
client/src/pages/portal/placeholders.tsx          Requests placeholder
client/src/components/portal/PortalShell.tsx      Responsive shell
client/src/components/portal/PortalLogin.tsx      Branded sign-in
client/src/components/portal/ProjectProgressSummary.tsx
client/src/components/portal/ProjectMilestones.tsx
client/src/components/portal/ProjectDeliverables.tsx
client/src/components/portal/ProjectTimeline.tsx
client/src/components/portal/AssignedCrew.tsx     (surname-safe)
client/src/components/portal/ProjectContacts.tsx
client/src/components/portal/NextVisit.tsx
client/src/components/portal/ProjectProgress.tsx
```

### Internal surfaces touched (additive, role-gated)
```
client/src/pages/client-detail.tsx   CEO-only Portal Accounts provisioning panel
client/src/pages/job-detail.tsx      PM and CEO document Share / Revoke / Re-share controls
client/src/App.tsx                   /portal/:section/:id routing
client/src/lib/mockData.ts           allInvoices accessor; portal-supporting seed data
```

### Tests
```
tests/helpers/portal.ts
tests/doctrine/client-portal.spec.ts
tests/doctrine/client-portal-shell.spec.ts
tests/doctrine/client-portal-projects.spec.ts
tests/doctrine/client-portal-documents.spec.ts
tests/doctrine/client-portal-communication.spec.ts
tests/doctrine/client-portal-financials.spec.ts
```

---

## DOCTRINE COMPLIANCE STATEMENT

| Doctrine | Status | Basis |
|---|---|---|
| Approval Doctrine | Preserved | The portal creates no financial records and approves nothing. Communication threads explicitly do not enter the Review Centre |
| Audit Doctrine | Preserved | 15 immutable audit event types covering every client interaction and every sharing decision |
| Job Attribution Doctrine | Preserved | All portal data is attributed to a job/project and scoped through it |
| Financial Integrity Doctrine | Preserved | The portal is read-only over financial data; no cost, margin or accounting-sync data is reachable |
| Client Portal Doctrine | Preserved | Provisioning, access scope, site/job/crew/document/financial visibility rules implemented and tested |
| Review Centre Protection | Preserved | No portal path reaches the Review Centre |
| RBAC | Preserved | Clients see only their own data; CEO-only provisioning; PM/CEO-only document sharing |

---

*End of Workstream D handoff.*
