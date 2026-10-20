# THE LEDGER — BACKEND IMPLEMENTATION ROADMAP

Version: 2.2
Status: AUTHORITATIVE — all decisions in BACKEND_OPEN_DECISIONS.md approved (October 20, 2026)
Date: October 20, 2026
Authority: Backend Documentation Reconciliation Pass

---

## CHANGE LOG

| Version | Date | Changes |
|---|---|---|
| 1.0 | June 4, 2026 | Initial dependency-ordered sequence — 10 phases, 9 modules |
| 2.0 | October 20, 2026 | Aligned with the v2.0 architecture: Tenant phase added before Identity; Financial Intelligence phase added; `notification` schema separated from `intelligence`; phase numbers now match BACKEND_ARCHITECTURE_SUMMARY.md; phase gates, decision dependencies, frontend reference engines and Track F (frontend integration) added |
| 2.1 | October 20, 2026 | All 16 decisions approved by the owner; D-07 still requires COMMERCIAL_DOCUMENTS_DOMAIN.md before invoice-document work |
| 2.2 | October 20, 2026 | Phases 4 and 5: approval creates financial records in the same transaction through an approval-effects port (D-17) |

---

## PURPOSE

This document defines the order in which The Ledger backend is built: the phases, what each phase includes, what it depends on, which open decisions it needs, and the gate it must pass before the next phase starts.

It does not estimate time and does not define tables. Table design happens inside each phase, from the frozen domain documents.

---

## SOURCES AND PRECEDENCE

Every phase builds from these sources, in this order of precedence:

1. `docs/ai-context/LEDGER_CANONICAL_CONTEXT.md` — doctrine
2. `docs/domain/*.md` — frozen domains (entities, lifecycles, invariants, audit entry types)
3. `docs/backend/*.md` — architecture (modules, schemas, events, layering, auth, API)
4. `client/src/lib/*.ts` and `client/src/lib/mockData.ts` — prototype engines (reference behaviour only)

Where a prototype engine disagrees with a frozen domain document, the domain document wins and the difference is recorded in the phase handoff.

Open decisions are tracked in `BACKEND_OPEN_DECISIONS.md`.

---

## DEPENDENCY PRINCIPLES

1. **Infrastructure before domain.** The shared foundation exists before any module.
2. **Upstream before downstream.** Tenant → Identity → Operational → Review Centre → Financial Normalization → everything that reads financial records.
3. **Financial integrity from the start.** The Review Centre and Financial Normalization are built and gated before any accounting, intelligence, automation or reporting capability.
4. **Doctrine is tested, not assumed.** Every phase gate includes doctrine tests that try to break the phase's invariants.

---

## PHASE OVERVIEW

```
Phase 0   Infrastructure Foundation
  ↓
Phase 1   Tenant Module
  ↓
Phase 2   Identity Module
  ↓
Phase 3   Operational Module ─────────────────────────────┐
  ↓                                                       │
Phase 4   Review Centre Module  ←→  Phase 4a Inventory &  │
  ↓                                  Asset (catalogue)    │
Phase 5   Financial Normalization Module                  │
  ↓        (completes Phase 4a stock-level consumers)     │
  ├── Phase 6   Accounting Integration Module             │
  ├── Phase 6a  Client Portal Module  ←── may start after Phase 3
  └── Phase 6b  Financial Intelligence Module
  ↓
Phase 7   Intelligence & Automation Module (incl. Notification Centre)
  ↓
Phase 8   Reporting & Analytics Module
  ↓
Phase 9   Production Hardening

Track F   Frontend Integration — starts after the Phase 5 gate, runs alongside Phases 6–9
Future    Document Intelligence Module — not part of v1
```

| Phase | Module | Schema(s) | Depends on | Needs decisions |
|---|---|---|---|---|
| 0 | Infrastructure | `audit`, outbox and event log tables in `intelligence` | — | D-10, D-12, D-14, D-16 |
| 1 | Tenant | `tenant` | 0 | D-15 |
| 2 | Identity | `identity` | 1 | D-02 |
| 3 | Operational | `operational` | 2 | D-03, D-05 |
| 4 | Review Centre | `review` | 3 | D-04, D-06, D-11 |
| 4a | Inventory & Asset | `inventory` | 3 | D-05 |
| 5 | Financial Normalization | `financial` | 4, 4a | D-09 (payroll export only), D-07 (invoice documents only) |
| 6 | Accounting Integration | `accounting` | 5 | — |
| 6a | Client Portal | `portal` | 3 (financial views need 5 and D-07) | D-08, D-07 |
| 6b | Financial Intelligence | `financial_intelligence` | 5 | — |
| 7 | Intelligence & Automation | `intelligence`, `notification` | 4, 5 | D-01 |
| 8 | Reporting & Analytics | `reporting` | 5, 6, 6b, 7 | — |
| 9 | Production Hardening | all | 0–8 | D-10, D-11 |
| F | Frontend integration | — | Phase 5 gate | D-13 |

---

## PHASE 0 — INFRASTRUCTURE FOUNDATION

**What:** The shared technical foundation. No business logic.

**Includes:**
- Directory layout: one directory per module under `server/modules/<module>/`, each with `domain/`, `application/`, `infrastructure/`, `api/` and an `index.ts` public surface (BACKEND_SERVICE_ARCHITECTURE.md, BACKEND_LAYERING_ARCHITECTURE.md)
- Environment configuration loader with validation (fail fast on missing variables)
- PostgreSQL connection and Drizzle setup; committed SQL migrations (`drizzle-kit generate`)
- Schema-per-module convention in Drizzle (`pgSchema('tenant')`, …)
- Unit of Work / transaction helper shared by all Application Layer use cases
- Middleware: request ID, structured JSON logging (no request/response bodies, no financial amounts), global error handler with the API error envelope
- Replace the current request logger, which prints whole JSON response bodies
- `GET /health`
- JWT utilities (sign, verify, claims) for the platform and portal tokens
- Tenant context middleware (extract `company_id` from the token; required parameter on every use case)
- `AuditWriter.append()` writing to `audit.audit_entries` inside the caller's transaction; database grants with INSERT and SELECT only
- Transactional outbox: `intelligence.event_outbox`, outbox writer, delivery worker (claim lock, retry with backoff, dead letter), `intelligence.event_log`
- In-process subscriber registry for the event bus
- Worker process entry point (separate from the API server process)
- Test framework: unit tests and API integration tests against a dedicated test database

**Gate:**
- Build and typecheck pass
- An audit write that fails rolls back its whole transaction (test)
- An event written in a rolled-back transaction is never delivered (test)
- A redelivered event is handled once by an idempotent subscriber (test)
- Application role cannot UPDATE or DELETE audit entries (test against the database)
- No log line contains a request or response body (test)

**Unlocks:** Phase 1

---

## PHASE 1 — TENANT MODULE

**What:** The authoritative owner of companies.

**Includes:**
- `tenant` schema: companies, subscriptions, plans, configurations
- `TenantProvisioningService`, `TenantLifecycleService`, `TenantConfigurationService`
- Lifecycle `active → suspended → active`, `active/suspended → terminated` with audit entries
- Events: `TenantProvisioned`, `TenantSuspended`, `TenantReactivated`, `TenantTerminated`, `TenantConfigurationUpdated`, `TenantPlanChanged`
- `getTenantContext(companyId)` public API used by every other module
- Provisioning surface per D-15 (command-line script; CEO can read and update own configuration only)
- Demo company flag on the company record, so demo data never appears in a real company context (invariant 24)
- `company_id` foreign key convention every later schema follows

**Gate:**
- Suspended and terminated tenants cannot be used by any later module (test)
- No in-tenant user, including the CEO, can change tenant lifecycle (test)

**Unlocks:** Phase 2

---

## PHASE 2 — IDENTITY MODULE

**What:** Authentication and authorisation.

**Includes:**
- `identity` schema: users, user roles (per D-02), refresh tokens, password reset tokens; custom roles stored but not enforced (per D-02)
- Subscriber: `TenantProvisioned` → create the initial CEO user; `TenantSuspended` / `TenantTerminated` → revoke all sessions
- Login (`POST /api/v1/auth/login`) with tenant-active check, access token (15 min) and rotating refresh token (HTTP-only cookie, 7 days)
- Refresh, logout, revoke-all-sessions, password reset
- Password rules: minimum 12 characters, bcrypt cost 12
- Coarse RBAC route middleware (`requireRole`)
- `UserContext` resolution for all modules
- Events: `UserCreated`, `UserRoleChanged`, `UserDeactivated`, `SessionStarted`, `SessionRevoked`
- Audit entries for role changes, deactivations and session revocations

**Gate:**
- A token for Company A can never read Company B's users (test, expects 404)
- Expired, revoked and rotated-out refresh tokens are refused (test)
- Only the CEO can change a role (test)
- Passwords and tokens never appear in logs (test)

**Unlocks:** Phase 3

---

## PHASE 3 — OPERATIONAL MODULE

**What:** Clients, sites, jobs, workers, shifts and scheduling.

**Reference engines:** `mockData.ts` (clients, workers, jobs), `shiftStore.ts`, `offlineQueueStore.ts` (shift parts), schedule and map pages.

**Includes:**
- `operational` schema: clients, sites (per D-03), jobs, worker profiles (classification `employee | contractor`), PM profiles, worker assignments, shifts
- Client lifecycle; Site lifecycle (`active ↔ inactive`, `→ archived` CEO-only, irreversible, no open jobs)
- Job state machine: `draft → scheduled → active → pending_closure → closed`, cancellation rules, PM reassignment; `closed` is reached only through the Review Centre closure use case (D-06)
- Worker profile and classification (CEO-only change, audited)
- Worker rate model: profile base rate plus job assignment override (TIMESHEET_DOMAIN.md)
- Worker assignment with date-level conflict detection and audited override (SCHEDULING_DOMAIN.md)
- Schedule view as a projection of jobs and assignments (no separate schedule entity)
- Shift start and end; single in-progress shift per worker; `pm_closed` for unreachable workers; `ShiftEnded` triggers timesheet creation in Phase 4
- Lifecycle exits instead of deletes (per D-05)
- Job milestones and deliverables (per D-08)
- All audit entry types from the Job, Site, Scheduling and Worker Classification domains
- Events: `JobCreated`, `JobActivated`, `JobPendingClosure`, `JobClosed`, `JobCancelled`, `ShiftStarted`, `ShiftEnded`, `WorkerAssignedToJob`, `WorkerRemovedFromJob`, `SchedulingConflictDetected`, `SchedulingConflictOverridden`, `SiteCreated`, `SiteStatusChanged`, `SiteArchived`, `ClientCreated`
- PM scope: PMs see and act only on their own jobs and sites; workers see assigned jobs with site address and access notes, no financial fields

**Gate:**
- Invariants 13, 14, 18, 28, 31 tested
- A worker response never contains a financial field (test)
- A PM cannot read or change another PM's job (test)

**Unlocks:** Phase 4, Phase 4a, Phase 6a

---

## PHASE 4 — REVIEW CENTRE MODULE

**What:** The approval gateway. All submissions enter here; all financial reality starts here.

**Reference engines:** `mockData.ts` (`addReviewItem`, `updateReviewItem`), `reviewBatchEngine.ts`, `offlineQueueStore.ts`. Advisory read models: `reviewPriorityEngine.ts`, `reviewRecommendationEngine.ts`, `reviewDecisionIntelligenceEngine.ts`, `reviewAnalyticsEngine.ts`, `reviewBriefingEngine.ts`, `reviewIntelligenceEngine.ts`.

**Includes:**
- `review` schema: timesheet submissions, report submissions (with embedded stock and equipment usage lines), expense submissions, issue logs, rejection records, file references
- Timesheet creation from `ShiftEnded` (no standalone timesheets)
- Report, expense and issue intake; offline queue replay is idempotent (client-generated submission key)
- Typed submissions with a unified review queue query (per D-04)
- Approval authority: PM own jobs; expense > £500 or billable is CEO-only; `assertApproverAuthority()`
- Approval requires an authenticated human user; `assertAutomationCannotApprove()` refuses any system or automation actor
- Approval-effects port (D-17): approval, financial records (via the port), audit entries and the approval event in one transaction; Review Centre never imports Financial Normalization
- Rejection: mandatory reason, frozen after rejection, never deleted; resubmission with `rejected_submission_ref`; correction window closes when the job closes
- Withdrawal before the reviewer opens the submission only
- Report approval is all-or-nothing (invariant 12)
- Issue lifecycle (acknowledgement, not approval)
- `ConfirmJobFinancialClosure` (CEO only) with job row lock and pending-submission check (per D-06)
- Advisory review intelligence read models (priority, recommendations, analytics), labelled advisory, with no write path to approval
- File upload via the `FileStorage` interface (per D-11)
- All Expense, Timesheet, Report, Rejection and Issue domain audit entry types
- Events: all Timesheet/Report/Expense `Submitted`, `Approved`, `Rejected`, `Resubmitted`, `Withdrawn` events and the Issue events

**Gate:**
- Invariants 8–12, 15–17, 19, 29, 30 tested
- Approval by a system actor, a worker or a PM outside the job is refused (test)
- Approval of an already-approved submission is a no-op returning current state (test)
- A job cannot close while a submission is pending, including under concurrent intake (test)

**Unlocks:** Phase 5

---

## PHASE 4a — INVENTORY & ASSET MODULE

**What:** Stock and assets. The catalogue parts are needed before Phase 5 can price report lines.

**Reference engines:** `mockData.ts` (stock items, locations, stock movements, equipment, assets).

**Includes:**
- `inventory` schema: stock items, stock locations, stock levels, assets, asset assignments
- Stock catalogue (items, units, unit cost), locations (depot, vehicle, site)
- Replenishment and transfer recording; write-off with CEO approval
- Asset register and lifecycle `available → assigned → in_use → maintenance → retired` (retired is terminal, CEO-only)
- Asset assignment exclusivity (one active job at a time)
- Asset cost model (per hour or per use)
- Low stock alert event
- Stock level updates from `InventoryMutationCreated` (consumer completed in Phase 5)
- Equipment and Asset reconciled into one Asset register (the prototype has both)
- Stock and Asset domain audit entry types and events

**Gate:**
- Invariants 20 and 32 tested
- Stock level changes only through mutation events or audited replenishment, transfer and write-off (test)

**Unlocks:** Phase 5 completion

---

## PHASE 5 — FINANCIAL NORMALIZATION MODULE

**What:** Approved submissions become immutable financial records.

**Reference engines:** `mockData.ts` financial mutation engine (inside `updateReviewItem`) and `getJobFinancialSummary`, `payrollExportEngine.ts`.

**Includes:**
- `financial` schema: timesheet entries, expense entries, inventory mutations, equipment usage records, invoice line items, financial mutations, void records, adjustment records, payroll records
- Implements the Review Centre's approval-effects port (D-17); every handler runs in the approval transaction and is idempotent by submission ID
- Timesheet → `TimesheetEntry` with rate resolution and classification frozen at approval
- Expense → `ExpenseEntry`; billable expense → `InvoiceLineItem (pending_inclusion)`
- Report → one `InventoryMutation` per stock line (unit cost frozen) and one `EquipmentUsageRecord` per equipment line (cost rate frozen)
- Payroll record contributions by worker, period and classification; generic CSV export per segment (per D-09)
- Void and adjustment requests (PM may request) and CEO-only approval; append-only correction records; original record `status` is the only field that changes
- Job mini-ledger query, net of corrections
- Repository exposes no content-update methods for financial records
- Financial Record Correction domain audit entry types
- Events: `TimesheetEntryCreated`, `ExpenseEntryCreated`, `InventoryMutationCreated`, `EquipmentUsageRecorded`, `InvoiceLineItemCreated`, `FinancialMutationCreated`, `VoidRecordCreated`, `AdjustmentRecordCreated`, `PayrollRecordContributed`, `CorrectionRequestCreated`, `CorrectionApproved`
- Not included until D-07 is resolved: the invoice document, quotes, variations, credit notes and payments

**Gate:**
- Invariants 1–7 and 23 tested
- A financial record with no approval reference cannot be written, even by calling the repository directly (test)
- Mini-ledger totals equal the prototype's `getJobFinancialSummary` for the same seed data, or each difference is explained by a frozen domain rule (test plus handoff note)
- Workers and clients never receive financial record values (test)

**Unlocks:** Phase 6, 6a financial views, 6b, 7, Track F

---

## PHASE 6 — ACCOUNTING INTEGRATION MODULE

**What:** Downstream sync, reconciliation, exception resolution and financial controls.

**Reference engines:** `accountingSyncEngine.ts`, `accountingSettingsEngine.ts`, `accountingProviders.ts`, `syncLogEngine.ts`, `syncOperationsEngine.ts`, `syncEventStore.ts`, `reconciliationEngine.ts`, `exceptionResolutionEngine.ts`, `financialControlsEngine.ts`, `integrationService.ts`.

**Includes:**
- `accounting` schema: provider configs, sync queue, sync records, reconciliation records, exception records, financial control records
- Provider configuration (CEO only); adapter interface with stub adapters for QuickBooks, Xero, FreshBooks and Zoho
- Sync queue consumer for financial record events; sync worker; lifecycle `pending → syncing → synced | failed → retry`; `requires_manual_intervention` after max retries
- Reconciliation run (statuses: matched, unmatched, requires review, missing in Ledger, missing in accounting)
- Exception lifecycle `open → under_investigation → awaiting_approval → resolved | rejected`
- Financial controls `pending_approval → approved | rejected` (CEO only)
- Audit entries and events per BACKEND_EVENT_ARCHITECTURE.md

**Gate:**
- Sync and reconciliation never write to the `financial` schema (database grant test plus application test)
- Corrections made after sync produce `sync_correction_required` (test)

---

## PHASE 6a — CLIENT PORTAL MODULE

**What:** The client-facing access layer.

**Reference engines:** `portalAuth.ts`, `portalProjections.ts`, `portalProjectModels.ts`, `portalDocuments.ts`, `portalCommunication.ts`, `portalRequests.ts`, `portalFinancialModels.ts`, `portalAudit.ts`, `portalActivity.ts`, `portalBranding.ts`.

**Includes:**
- `portal` schema: portal accounts, portal sessions, document share records, client requests, conversation threads and messages (per D-08)
- CEO-only provisioning and deactivation; separate portal authentication and token
- Projection layer: explicit whitelists only, as in `portalProjections.ts`; access notes, costs, margins, payroll, review data, sync state and worker surnames are unreachable
- Explicit document sharing and audited revocation
- Client requests: 8 types, 6-state lifecycle, routing to the job's PM, escalation derived not stored, mandatory resolution notes and decline reasons, human actor required; never enter the Review Centre
- The 15 portal audit event types plus the 7 client request audit types
- Financial views (invoices, payment status, quotes, variations, credit notes, payments) only after Phase 5 and D-07

**Gate:**
- Invariants 25 and 27 tested
- A portal token can never reach `/api/v1/` routes, and a platform token can never reach `/portal/v1/` routes (test)
- No portal response contains a field outside the projection whitelist (test)

---

## PHASE 6b — FINANCIAL INTELLIGENCE MODULE

**What:** Advisory analysis over approved financial records.

**Reference engines:** `marginIntelligence.ts`, `forecastEngine.ts`, `profitabilityEngine.ts`, `useJobIntelligence.ts`.

**Includes:**
- `financial_intelligence` schema: margin snapshots, forecast records, exposure records, KPI snapshots, portfolio insights
- Subscribers to financial record events and `JobClosed`
- Job and portfolio margin, exposure, KPI snapshots, Financial Explorer read model
- Every forecast labelled "Advisory Projection — Not Financial Advice"
- Events: `MarginSnapshotComputed`, `ForecastUpdated`, `ExposureAlertTriggered`, `FinancialKPISnapshotRefreshed`

**Gate:**
- Module has no write grant on any schema except its own (test)
- Every forecast payload carries the advisory label (test)

---

## PHASE 7 — INTELLIGENCE & AUTOMATION MODULE

**What:** Notification Centre, activity feed, event monitor, automation, governance, scheduler and workflows.

**Reference engines:** `notificationEngine.ts`, `activityFeedEngine.ts`, `eventBusEngine.ts`, `automationEngine.ts`, `automationRuleEngine.ts`, `automationBuilderEngine.ts`, `automationGovernanceEngine.ts`, `automationSchedulerEngine.ts`, `automationApprovalQueueEngine.ts`, `automationAuditEngine.ts`, `automationRecommendationEngine.ts`, `workflowEngine.ts`.

**Includes:**
- `notification` schema: notification records, notification queue, delivery records, preferences
- `intelligence` schema additions: automation rules, schedules, governance records, workflow definitions and executions, activity feed events (outbox and event log already exist from Phase 0)
- Notification routing per the notification type table; worker outcome notices per D-01
- Notification lifecycle `unread → read`, `unread/read → dismissed`, each interaction audited
- Activity feed and event monitor (CEO only)
- Automation rule lifecycle `draft → active → disabled → archived` (soft delete only); forbidden actions blocked at save and at evaluation
- Governance statuses and risk levels (CEO only)
- Scheduler (cron in the worker process) `active ↔ paused → disabled`; every execution audited
- Workflow lifecycle and engine; forbidden actions: `approve_report`, `approve_expense`, `approve_timesheet`, `create_approved_invoice`, `create_approved_financial_record`, `bypass_review_centre`, `bypass_ceo_approval`
- Forbidden action attempts logged as `forbidden_action_attempted` with a governance alert

**Gate:**
- No automation, workflow, scheduler or notification path can approve, reject or create a financial record (test for each forbidden action)
- PM notifications are scoped to own jobs; workers receive only their own outcome notices (test)

---

## PHASE 8 — REPORTING & ANALYTICS MODULE

**What:** Reports, exports, distributions and operational analytics.

**Reference engines:** `reportingEngine.ts`, `exportEngine.ts`, `analyticsEngine.ts`, `executiveCommandEngine.ts`.

**Includes:**
- `reporting` schema: report definitions, generated reports, exports, distributions, distribution queue
- Six report types: executive summary, board report, governance, financial health, operations, monthly KPI
- Exports (PDF, board pack) as read-only derivatives; distribution worker (email, portal, download)
- Operational health scoring across the five dimensions; Executive Command Centre and Intelligence Hub read models
- All report, export, distribution and analytics access audit entries

**Gate:**
- No report, export or analytics path writes outside the `reporting` schema (test)
- Forecast sections carry the advisory label (test)

---

## PHASE 9 — PRODUCTION HARDENING

**Includes:**
- PostgreSQL Row Level Security on every tenant table
- Rate limiting per D-10; idempotency keys on state-changing endpoints
- `GET /health/detailed`, `/metrics`, exception monitoring
- Production file storage adapter per D-11
- Security review: injection, RBAC bypass, tenant isolation penetration tests
- Performance tests: approval pipeline, mini-ledger aggregation, audit queries
- OpenAPI 3.1 document published at `/api/docs` in non-production environments
- Deployment configuration and graceful shutdown of both process types

**Gate:** Full doctrine suite green; tenant isolation checklist (BACKEND_MULTITENANCY_ARCHITECTURE.md) satisfied for every endpoint.

---

## TRACK F — FRONTEND INTEGRATION

**Starts:** after the Phase 5 gate. **Strategy:** per D-13.

**Includes, one page group at a time:**
1. API client and auth (replace `useAuth` mock login; access token in memory, refresh cookie)
2. Clients, sites (new screens per D-03), jobs, workers, schedule, map
3. Worker app: shifts, submissions, offline queue replay against the API
4. Review Centre (unified queue per D-04)
5. Finance Hub and job mini-ledger
6. Accounting, portal, intelligence, automation and reporting pages as their phases pass their gates

**Rules:**
- The data-source switch keeps mock mode working; the Playwright suite runs in both modes for each migrated page group
- `deploy/replit-public` stays mock-only

---

## FUTURE — DOCUMENT INTELLIGENCE MODULE

Not part of v1. Boundaries are reserved in BACKEND_DOCUMENT_INTELLIGENCE_ARCHITECTURE.md. Phase 4 must publish `ReportSubmitted` and `ExpenseSubmitted` with file references so the module can be added later without changing the Review Centre.

---

## DOCTRINE VERIFICATION BY PHASE

| Phase | Doctrines verified at the gate |
|---|---|
| 0 | Audit immutability; transactional outbox integrity; no sensitive data in logs |
| 1 | Tenant lifecycle; demo data isolation |
| 2 | Tenant isolation; RBAC |
| 3 | Job attribution; structural invariants (site → client, job → site); worker financial invisibility |
| 4 | Approval Doctrine; Rejection Doctrine; automation cannot approve; closure blocked by pending submissions |
| 4a | Asset exclusivity; retirement terminal; stock level integrity |
| 5 | Financial immutability; append-only corrections; CEO-only correction approval; approval reference required |
| 6 | Sync is downstream only; reconciliation is read-only |
| 6a | Portal isolation; access notes hidden; explicit document sharing; client requests never enter the Review Centre |
| 6b | Financial Intelligence advisory only; forecasts labelled |
| 7 | Forbidden actions blocked; notifications informational only; event bus never creates financial mutations |
| 8 | Reports read-only; exports read-only derivatives; analytics never approves |
| 9 | Full tenant isolation (RLS); financial mutation monitoring active; audit trail completeness |

---

## PHASE HANDOFFS

Each phase ends with a handoff in `docs/handoffs/` (CLAUDE.md Handoff Requirements), which also lists:
- every place the implementation differs from a prototype engine, and the domain rule that caused it
- decisions used, by ID
- the gate tests and their results
