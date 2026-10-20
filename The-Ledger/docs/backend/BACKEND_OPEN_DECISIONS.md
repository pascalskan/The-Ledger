# THE LEDGER — BACKEND OPEN DECISIONS

Version: 1.2
Status: APPROVED — D-01 … D-16 approved by the owner on October 20, 2026; D-17 decided by the PM under the owner's delegation the same day
Date: October 20, 2026
Authority: Backend Documentation Reconciliation Pass

---

## PURPOSE

The backend documents, the frozen domain documents, the canonical context and the frontend prototype disagree in a number of places. Some disagreements are mechanical (wrong schema name, stale phase number) and have been corrected directly — see the Reconciliation Log at the end of this document. The rest need an owner decision. This document lists each one with a recommended answer.

All 16 decisions were approved as written on October 20, 2026, and their "Docs changed on approval" lists have been applied. Changing an approved decision needs a new owner decision recorded here.

---

## PRECEDENCE RULE (for reference)

When sources disagree, the order is:

1. `docs/ai-context/LEDGER_CANONICAL_CONTEXT.md` (doctrine)
2. Frozen domain documents (`docs/domain/`)
3. Backend architecture documents (`docs/backend/`)
4. Frontend prototype behaviour (`client/src/lib/` engines, `mockData.ts`)

The frontend engines are reference behaviour, not specification. Where an engine disagrees with a frozen domain document, the domain document wins and the difference is listed in the phase handoff.

---

## DECISION INDEX

| ID | Topic | Blocks | Status |
|---|---|---|---|
| D-01 | Worker notifications | Phase 7 | APPROVED |
| D-02 | Role model in the backend | Phase 2 | APPROVED |
| D-03 | Site as an entity | Phase 3 | APPROVED |
| D-04 | Typed submissions vs the generic review item | Phase 4 | APPROVED |
| D-05 | Hard deletes | Phase 3 onward | APPROVED |
| D-06 | Where the job-closure check lives | Phase 4 | APPROVED |
| D-07 | Commercial documents (invoices, quotes, variations, credit notes, payments) | Invoice parts of Phase 5, Phase 6a financial views | APPROVED |
| D-08 | Client Portal additions (conversations, milestones, deliverables, revocation) | Phase 6a | APPROVED |
| D-09 | Payroll export format | Payroll export in Phase 5 | APPROVED |
| D-10 | Redis | Phase 0, Phase 9 | APPROVED |
| D-11 | File storage | Phase 4 (uploads) | APPROVED |
| D-12 | Database hosting for development and tests | Phase 0 | APPROVED |
| D-13 | Frontend integration strategy | Track F | APPROVED |
| D-14 | Backend tooling | Phase 0 | APPROVED |
| D-15 | Tenant provisioning surface | Phase 1 | APPROVED |
| D-16 | CLAUDE.md backend instruction | Phase 0 | APPROVED |
| D-17 | Approval → financial record: one transaction | Phases 4 and 5 | APPROVED (PM, owner-delegated) |

---

## D-01 — Worker notifications

**Conflict.**
- Canonical context, Notification Doctrine: "Worker: no access".
- Backend docs (Domain, Service, Auth): "Worker: no notification access", yet the same docs route `review_approved` and `review_rejected` to the submitting worker.
- `REJECTION_DOMAIN.md` (frozen): the submitter must be notified in-platform with the rejection reason verbatim; approval of a resubmission also notifies the submitter.

**Options.**
- A. Workers get no notifications; they see outcomes only in their submission history.
- B. Workers get a narrow, worker-scoped outcome feed: their own `review_approved` / `review_rejected` notices only.
- C. Workers get full Notification Centre access.

**Recommendation: B.** It satisfies the frozen Rejection Domain without giving workers the Notification Centre. Worker notices carry submission type, job name, outcome and (for rejections) the reason. They never carry amounts, rates or other financial values. Workers cannot see any other notification type. The Notification Centre itself stays CEO/PM only.

**Docs changed on approval.** Canonical context (Notification Doctrine RBAC line), BACKEND_DOMAIN_ARCHITECTURE.md (Notification RBAC), BACKEND_SERVICE_ARCHITECTURE.md, BACKEND_INFRASTRUCTURE_ARCHITECTURE.md (Notification RBAC), BACKEND_ARCHITECTURE_SUMMARY.md (Notification Model table).

---

## D-02 — Role model in the backend

**Conflict.**
- Backend Auth doc: four fixed roles (`ceo`, `pm`, `worker`; `client` via the portal), one role per user, permissions derived from role and job assignment, no permission table in v1. It also says the role should be stored as a relation to allow multi-role later.
- Frontend: users hold several `roleIds`; the role editor saves editable permission keys (`view_jobs`, `manage_invoicing`, …) and display tags (Owner, Supervisor, Driver, …). Nothing enforces the keys (audit R4-21).
- Owner note: roles and permissions are to be redesigned entirely; until then, permission keys are not enforced and PM visibility is not changed.

**Recommendation.**
- The backend enforces only the four **doctrine roles**. They are what the Approval, Financial Visibility and Portal rules are written against, and the redesign must keep them (CLAUDE.md RBAC rules).
- Store role as a relation (`identity.user_roles`), but allow exactly one doctrine role per user in v1.
- Store the frontend's custom roles and permission keys as data (`identity.custom_roles`) so nothing is lost, but **do not enforce them**. Enforcement is designed in the roles redesign.
- PM scope stays as documented (own jobs and sites). No change to what a PM sees.
- Display tags (Owner, Supervisor, …) are profile labels, not authorisation.

**Docs changed on approval.** BACKEND_AUTH_ARCHITECTURE.md (Role Assignment, Multi-Role), BACKEND_DATA_ARCHITECTURE.md (identity aggregates).

---

## D-03 — Site as an entity

**Conflict.** The frozen Site Domain requires Client → Site → Job, and invariants 13–14 require every job to have a site. The frontend has no Site entity; a job carries `locationAddress`, coordinates, access instructions and site contacts directly.

**Recommendation.** Implement Site exactly as frozen. When frontend data is imported or seeded, create one site per distinct (client, address) pair and move access instructions and site contacts onto it. Job keeps a read-only `siteAddress` in API responses so the frontend can migrate gradually. Access notes stay excluded from all portal projections (invariant 27).

**Docs changed on approval.** None (the backend docs already follow the Site Domain). Track F gains a "Site screens" item.

---

## D-04 — Typed submissions vs the generic review item

**Conflict.** The domain defines separate Timesheet, Report, Expense and Issue submissions, with timesheets created automatically at shift end and stock/equipment usage embedded in the report. The frontend uses one generic `ReviewItem` carrying arrays of labour, material, equipment, expense and upload payloads.

**Recommendation.** The backend follows the domain: four typed submission aggregates. The Review Centre exposes a **unified queue query** (`GET /api/v1/review-centre/queue`) that returns all pending submissions in one list with a common summary shape, so the Review Centre screens keep a single list. Mixed payloads from the prototype's offline queue are split into typed submissions at intake.

**Docs changed on approval.** BACKEND_API_ARCHITECTURE.md (queue endpoint note).

---

## D-05 — Hard deletes

**Conflict.** The frontend hard-deletes clients, workers, jobs, equipment, stock items, assets, invoices and roles. Doctrine forbids deleting rejected submissions, financial records and audit entries, and the domains define lifecycle exits (job cancellation, site archive, asset retirement, stock item discontinuation, worker deactivation).

**Recommendation.** No hard delete endpoints in API v1. Every "delete" becomes the entity's lifecycle exit: archive, deactivate, discontinue, cancel or retire, each audited. The only exception is a **draft** record with no references (for example a draft job with no assignments), which may be discarded and is still audited.

**Docs changed on approval.** BACKEND_API_ARCHITECTURE.md (new "No hard deletes" rule), BACKEND_DATA_ARCHITECTURE.md (write model characteristics).

---

## D-06 — Where the job-closure check lives

**Conflict.** BACKEND_DOMAIN_ARCHITECTURE.md says Operational Core consumes a `SubmissionApproved` event "to check pending submission count before financial closure". No module produces `SubmissionApproved`, and counting via events would be eventually consistent, so a job could close while a submission is still pending (breaks invariant 29). Calling the Review Centre from Operational Core would break the downward dependency direction.

**Recommendation.** Financial closure (`pending_closure → closed`, CEO only) is a Review Centre use case, `ConfirmJobFinancialClosure`, matching the Review Centre permissions table, which already lists "Job Financial Closure — CEO only". In one transaction it:
1. locks the job row (`SELECT … FOR UPDATE`),
2. checks there are no pending submissions for the job in its own schema,
3. calls Operational Core's public `transitionJobStatus(jobId, 'closed')`,
4. writes the audit entry and the `JobClosed` outbox event.

Submission intake takes the same job row lock, so a submission cannot slip in during closure. Operational Core consumes no submission events.

**Docs changed on approval.** BACKEND_DOMAIN_ARCHITECTURE.md (Operational Core "Consumes Events"), BACKEND_SERVICE_ARCHITECTURE.md (Review Centre public API), BACKEND_DATA_ARCHITECTURE.md (transaction boundary 7).

---

## D-07 — Commercial documents

**Conflict.**
- The domain model marks the invoice lifecycle as PARTIAL (structure exists; line selection, sending and payment tracking undefined).
- The frontend has two separate invoice stores: Invoice Builder drafts (`INV-…`) and Finance invoices (`EXB-…`).
- `CLIENT_PORTAL_DOMAIN.md` v1.1 shows quotes, approved variations, credit notes and payment history to clients, but no backend document defines these entities, their owners or how a credit note or payment relates to the Approval Doctrine.

**Recommendation.**
- Before any invoice, quote, variation, credit note or payment backend work, run a short domain definition session to produce a frozen `COMMERCIAL_DOCUMENTS_DOMAIN.md`.
- Proposed starting position for that session:
  - one Invoice aggregate with a status lifecycle starting at `draft` (this answers the two-list question: a builder draft *is* an invoice in `draft`),
  - quotes and variations are commercial documents, not financial records,
  - a credit note is a financial correction and needs CEO approval,
  - payments are recorded against invoices, are audited, and never alter approved records.
- Phases 0–4 do not depend on this. Phase 5 builds `InvoiceLineItem` creation from approved billable expenses (already frozen) but not the invoice document itself.

**Docs changed on approval.** New domain document; BACKEND_DATA_ARCHITECTURE.md and BACKEND_SERVICE_ARCHITECTURE.md gain owners for the new aggregates once the domain is frozen.

---

## D-08 — Client Portal additions

**Conflict.** The frontend portal has conversation threads, project milestones and deliverables, and audited document-access revocation. The backend docs' `portal` schema lists only accounts, sessions, document shares and client requests.

**Recommendation.**
- Conversations (threads and messages): owned by the Client Portal module, `portal` schema. Staff replies come through `/api/v1/client-requests/` (PM/CEO); portal users through `/portal/v1/`.
- Milestones and deliverables: owned by Operational Core as part of the job (they describe the work), shown to clients only through portal projections.
- Document revocation: a status change on `DocumentShareRecord` (`active → revoked`), audited, never a delete.
- The 15 portal audit event types in the canonical context are adopted as the portal audit catalogue.

**Docs changed on approval.** BACKEND_DOMAIN_ARCHITECTURE.md, BACKEND_DATA_ARCHITECTURE.md, BACKEND_SERVICE_ARCHITECTURE.md (Client Portal and Operational Core sections).

---

## D-09 — Payroll export format

**Conflict.** The domain fixes the employee/contractor split but not the export file format or field mapping (PARTIAL).

**Recommendation.** Phase 5 builds `PayrollRecord` aggregation by worker, period and classification, plus one generic CSV export per classification segment, matching the prototype's payroll export columns. Provider-specific formats wait for a named payroll provider.

**Docs changed on approval.** BACKEND_IMPLEMENTATION_ROADMAP.md already reflects this proposal.

---

## D-10 — Redis

**Conflict.** The summary and infrastructure docs list Redis (rate limiting, caching), but v1 runs as a single instance on Replit and the queue is already in PostgreSQL.

**Recommendation.** No Redis in v1. Rate limiting uses an in-process token bucket behind an interface; caching is not added until measured. Redis (or a Postgres-backed limiter) comes in only with horizontal scaling.

**Docs changed on approval.** BACKEND_INFRASTRUCTURE_ARCHITECTURE.md (environment variables), BACKEND_API_ARCHITECTURE.md (rate limiting implementation), BACKEND_ARCHITECTURE_SUMMARY.md (API and infrastructure tables).

---

## D-11 — File storage

**Conflict.** The docs require S3-compatible object storage with signed URLs; no provider is chosen and Replit is the only current host.

**Recommendation.** A `FileStorage` interface (put via signed upload, get via signed URL, tenant-prefixed keys). A local-disk adapter for development and tests; the production adapter (any S3-compatible service) is chosen in Phase 9. File bytes never go in the database (unchanged).

**Docs changed on approval.** BACKEND_INFRASTRUCTURE_ARCHITECTURE.md (File Storage).

---

## D-12 — Database hosting for development and tests

**Question.** Where do the development and test databases run? The integration tests need a real PostgreSQL (schemas, RLS, database roles).

**Options.**
- A. A hosted PostgreSQL project (for example Neon, which Replit also uses) with separate `dev` and `test` databases.
- B. Local PostgreSQL installed on Windows.
- C. Docker with Testcontainers (needs Docker Desktop).

**Recommendation: A**, unless you would rather keep everything local. It needs no local install, matches what Replit will use, and supports RLS and roles. Only synthetic seed data goes into it. Tests read `DATABASE_URL_TEST` and refuse to run against any database whose name does not end in `_test`.

**Docs changed on approval.** BACKEND_INFRASTRUCTURE_ARCHITECTURE.md (environment variables).

---

## D-13 — Frontend integration strategy

**Question.** When and how does the frontend switch from mock data to the API?

**Recommendation.**
- Backend phases are built API-first while the frontend stays on mock data. Each phase is tested at the API level only.
- After the Phase 5 gate (the full submission → approval → financial record pipeline works), Track F switches the frontend one page group at a time behind a data-source switch (`VITE_DATA_SOURCE=mock|api`), with the Playwright suite run in both modes.
- `deploy/replit-public` stays mock-only permanently and never receives backend wiring.

**Docs changed on approval.** BACKEND_IMPLEMENTATION_ROADMAP.md already reflects this proposal.

---

## D-14 — Backend tooling

**Recommendation.**
- Tests: Vitest for unit tests, Vitest + Supertest for API integration tests against the test database. Playwright stays for the UI.
- JWT: `jose`, with ES256 keys for the platform token and a separate key for the portal token.
- Passwords: `bcryptjs`, cost 12 (pure JavaScript, so no native build on Windows or Replit).
- Logging: `pino` structured JSON with `requestId`; the current request logger that prints whole response bodies is removed (it breaks the "no financial amounts in logs" rule).
- Migrations: `drizzle-kit generate` with committed SQL migrations. `drizzle-kit push` is not used outside throwaway local databases.
- `passport`, `passport-local`, `express-session`, `memorystore` and `connect-pg-simple` are removed once JWT auth lands.

**Docs changed on approval.** BACKEND_INFRASTRUCTURE_ARCHITECTURE.md (runtime section).

---

## D-15 — Tenant provisioning surface

**Conflict.** The summary lists `/api/v1/tenant/ (admin provisioning)`, but the multi-tenancy doc says platform administrators work outside the tenant JWT model in a separate console.

**Recommendation.** v1 provisioning, suspension, reactivation and termination run through a command-line script (`npm run tenant -- provision …`), audited, with no HTTP surface. `/api/v1/tenant/` exposes only the signed-in CEO's own company configuration (read and update). An admin console is future work.

**Docs changed on approval.** BACKEND_API_ARCHITECTURE.md (namespace row is already annotated), BACKEND_MULTITENANCY_ARCHITECTURE.md (provisioning step 1).

---

## D-16 — CLAUDE.md backend instruction

**Conflict.** `CLAUDE.md` says "Backend implementation is intentionally deferred. Do not introduce backend architecture unless explicitly requested." Every backend session would have to be told otherwise.

**Recommendation.** Replace that paragraph with:

> Backend implementation is authorised (October 2026) and follows `docs/backend/BACKEND_IMPLEMENTATION_ROADMAP.md`. Backend work happens only on branches from `main`. The frontend stays mock-driven until Track F switches each page group; `deploy/replit-public` stays mock-only.

**Docs changed on approval.** CLAUDE.md.

---

## D-17 — Approval → financial record: one transaction

**Conflict.** Raised by the Phase 0 specification (OQ-16).
- BACKEND_DATA_ARCHITECTURE.md (Write Consistency Requirements, Transaction Boundary 2, "How operational truth becomes financial truth" step 4) requires approval status, financial record, audit entry and outbox event in **one ACID transaction**.
- BACKEND_EVENT_ARCHITECTURE.md (catalogue and subscriber registry), BACKEND_SERVICE_ARCHITECTURE.md (inter-module example) and the roadmap's Phase 5 had Financial Normalization create the record later, in a `TimesheetApproved` / `ReportApproved` / `ExpenseApproved` **subscriber**.
- A direct call from the Review Centre to Financial Normalization would point upward in the module dependency direction, which the architecture forbids.

**Decision (PM, under the owner's delegation, October 20, 2026).**
- Approving a submission and creating its financial records happen in **one transaction**. An approved submission can never exist without its financial records, and a failure creates neither.
- The dependency stays downward through **dependency inversion**: the Review Centre's public surface defines an approval-effects port (one handler per submission type, called with the approval's Unit of Work and the approval reference). Financial Normalization implements it. The composition root (the process entry points, via the module registry) wires the implementation in. Review Centre code never imports Financial Normalization.
- The approval events (`TimesheetApproved`, `ReportApproved`, `ExpenseApproved`) are still written to the outbox in the same transaction, for notifications, the activity feed and reporting. Financial Normalization no longer subscribes to them.
- The `*EntryCreated` / `*RecordCreated` events Financial Normalization writes in that transaction are unchanged, so Accounting Integration, Financial Intelligence, Inventory & Asset and Reporting still react asynchronously.
- The Phase 0 platform provides what this needs (passing the caller's Unit of Work across modules; a registry slot or typed port registration) as specified in PHASE-0-infrastructure.md.

**Why.** It is the only option that meets the data architecture's explicit consistency requirement. A subscriber could leave a human-approved item with no financial record for as long as delivery takes, or for ever if the subscriber dead-letters, which is a silent financial gap. The approval reference and the record are created together, which keeps the Phase 5 gate simple. Dependency inversion keeps the dependency direction intact.

**Docs changed.** BACKEND_EVENT_ARCHITECTURE.md (catalogue consumers, subscriber registry), BACKEND_SERVICE_ARCHITECTURE.md (Review Centre and Financial Normalization public surfaces, inter-module example), BACKEND_DOMAIN_ARCHITECTURE.md (Financial Normalization "Consumes Events"), BACKEND_IMPLEMENTATION_ROADMAP.md (Phase 4 and Phase 5).

---

## RECONCILIATION LOG (mechanical fixes already applied)

These corrections needed no decision and are applied in this pass.

| # | Document | Fix |
|---|---|---|
| R-1 | BACKEND_IMPLEMENTATION_ROADMAP.md | Rewritten as v2.0: Tenant and Financial Intelligence phases added, phase numbers aligned with the summary, `notification` schema used, Track F and phase gates added |
| R-2 | BACKEND_DATA_ARCHITECTURE.md | Change log said 12 schemas (body says 13); notification source of truth pointed at `intelligence.notifications` instead of `notification.notification_records` |
| R-3 | BACKEND_INFRASTRUCTURE_ARCHITECTURE.md | Notification queue and records moved from `intelligence` to `notification` schema; sync pipeline trigger now names the events Accounting Integration actually consumes |
| R-4 | BACKEND_ARCHITECTURE_SUMMARY.md | Background worker count 5 → 6 (report distribution worker was missing); implementation sequence and document index updated |
| R-5 | BACKEND_DOMAIN_ARCHITECTURE.md | `SubmissionWithdrawn` replaced by the catalogued per-type events; produced-event lists brought in line with the event catalogue (`CorrectionRequestCreated`, `CorrectionApproved`, `AccountingSyncRetryQueued`, `WorkflowBlocked`, `GovernanceStatusChanged`, `ScheduledEvaluationTriggered`, `ReportViewed`) |
| R-6 | BACKEND_AUTH_ARCHITECTURE.md | Auth routes given their `/api/v1` and `/portal/v1` prefixes; approval example changed from `DELETE` to `POST` |
| R-7 | BACKEND_API_ARCHITECTURE.md | Added the `/api/v1/tenant/` and `/api/v1/financial-intelligence/` namespaces the summary already listed |
| R-8 | `LEDGER_CANONICAL_CONTEXT.md` (repo root) and `docs/LEDGER_CANONICAL_CONTEXT.md` | Stale June copies replaced with pointers to `docs/ai-context/LEDGER_CANONICAL_CONTEXT.md` (their only unique content was superseded status text) |
| R-9 | CURRENT_DEVELOPMENT_STATE.md and canonical context | "Next target: Phase 6.1 Notification Centre (backend)" replaced with the backend programme's actual next step |
