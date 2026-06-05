# THE LEDGER — BACKEND IMPLEMENTATION ROADMAP

Version: 1.0
Status: AUTHORITATIVE
Date: June 4, 2026
Authority: Backend Architecture Definition Phase

---

## PURPOSE

This document defines the correct dependency order for The Ledger backend implementation. It specifies implementation phases, what each phase includes, and the dependencies that determine the ordering.

This document does NOT estimate time. It does NOT create tickets. It does NOT write code.

---

## DEPENDENCY PRINCIPLES

The implementation order is determined by three rules:

1. **Infrastructure before domain** — The shared infrastructure layer must exist before any module can be built
2. **Upstream domains before downstream consumers** — Identity before Operational, Operational before Review Centre, Review Centre before Financial Normalization
3. **Financial integrity enforced from the start** — The Review Centre and Financial Normalization phases are implemented together before any reporting, automation, or integration capability

---

## PHASE 0 — INFRASTRUCTURE FOUNDATION

**Status:** Prerequisite for all phases

**What:** The shared technical foundation. No business logic.

**Includes:**
- Node.js + TypeScript + Express project scaffold
- PostgreSQL connection (Drizzle ORM setup)
- Database migration framework (initial migration file)
- Base layer architecture (API Layer → Application Layer → Domain Layer → Infrastructure Layer directory structure)
- Shared middleware: request ID injection, structured logging, global error handler
- Environment variable configuration system
- Base health check endpoint (`GET /health`)
- JWT utilities (sign, verify, extract claims)
- Base tenant middleware (extract `company_id` from JWT)
- Audit writer infrastructure (append-only write to `audit.audit_entries`)
- Event outbox infrastructure (outbox table, outbox writer, outbox delivery worker stub)
- Base test framework setup (unit and integration test tooling)

**Dependencies:** None

**Unlocks:** Phase 1

---

## PHASE 1 — IDENTITY MODULE

**Status:** Required before any other module

**What:** Authentication and authorization foundation.

**Includes:**
- `identity` schema migration (companies, users, roles, refresh_tokens)
- Company (Tenant) creation
- User creation and credential management
- Role assignment (CEO, PM, Worker)
- Login → JWT access token + refresh token
- Token refresh
- Logout (session revocation)
- Password reset flow
- RBAC middleware (role-based route guards)
- Tenant isolation middleware (verify resource company_id)
- `UserContext` resolution (used by all modules)

**Dependencies:** Phase 0

**Unlocks:** Phase 2

---

## PHASE 2 — OPERATIONAL MODULE

**Status:** Required before Review Centre, Scheduling, Client Portal

**What:** The operational foundation — clients, sites, jobs, workers, shifts.

**Includes:**
- `operational` schema migration (clients, sites, jobs, worker_profiles, shifts, worker_assignments)
- Client CRUD
- Site CRUD + lifecycle (active/inactive/archived)
- Job CRUD + lifecycle state machine (draft → scheduled → active → pending_closure → closed / cancelled)
- Worker profile creation + classification (employee / contractor)
- Worker assignment to job (with scheduling conflict detection)
- Shift start / shift end (auto-creates timesheet submission stub — consumed by Phase 3)
- All audit entries for operational events
- All domain events (JobCreated, ShiftEnded, WorkerAssignedToJob, etc.) published to outbox

**Dependencies:** Phase 1

**Unlocks:** Phase 3, Phase 5, Phase 7

---

## PHASE 3 — REVIEW CENTRE MODULE

**Status:** Required before Financial Normalization

**What:** The approval gateway — all submissions enter here, all financial reality originates here.

**Includes:**
- `review` schema migration (timesheet_submissions, report_submissions, expense_submissions, issue_logs, rejection_records)
- Timesheet submission intake (triggered by ShiftEnded event from Phase 2)
- Report submission intake
- Expense submission intake
- Issue log submission intake
- Pending submissions list (PM/CEO review queue)
- Approval service (with approval authority enforcement — PM limits, CEO-only cases)
- Rejection service (mandatory reason, immutable after rejection, worker notification event)
- Withdrawal service (before reviewer opens only)
- Resubmission with `rejected_submission_ref`
- Automation approval block enforcement (`assertAutomationCannotApprove`)
- All audit entries for submission lifecycle
- All domain events (TimesheetApproved, ExpenseRejected, etc.) published to outbox

**Dependencies:** Phase 2

**Unlocks:** Phase 4

---

## PHASE 4 — FINANCIAL NORMALIZATION MODULE

**Status:** Required before Accounting Integration, Reporting, Analytics

**What:** The financial reality layer — approved submissions become financial records.

**Includes:**
- `financial` schema migration (timesheet_entries, expense_entries, inventory_mutations, equipment_usage_records, invoice_line_items, financial_mutations, void_records, adjustment_records, payroll_records)
- Subscription to `TimesheetApproved`, `ReportApproved`, `ExpenseApproved` events
- TimesheetEntry creation from approved timesheet (with rate resolution, classification freezing)
- ExpenseEntry creation from approved expense (non-billable)
- InvoiceLineItem creation from approved billable expense
- InventoryMutation creation from approved report (per stock item used)
- EquipmentUsageRecord creation from approved report (per asset used)
- PayrollRecord contribution aggregation
- Void request + CEO approval → VoidRecord creation
- Adjustment request + CEO approval → AdjustmentRecord creation
- Job mini-ledger aggregation query (net of corrections)
- Financial record immutability enforcement
- All audit entries for financial mutations
- All domain events (TimesheetEntryCreated, VoidRecordCreated, etc.) published to outbox

**Dependencies:** Phase 3 (approval events), Phase 5 (stock/asset catalogue references)

**Unlocks:** Phase 6, Phase 8, Phase 10

---

## PHASE 5 — INVENTORY & ASSET MODULE

**Status:** Can be built in parallel with Phase 3; required before Phase 4 completes

**What:** Physical resource management — stock and assets.

**Includes:**
- `inventory` schema migration (stock_items, stock_locations, stock_levels, assets, asset_assignments)
- Stock catalogue CRUD (items, locations)
- Stock level tracking (via InventoryMutation events from Phase 4)
- Stock replenishment recording
- Stock transfer recording
- Stock write-off (CEO-approved)
- Asset register CRUD
- Asset lifecycle state machine (available → assigned → in_use → maintenance → retired)
- Asset assignment with exclusivity enforcement
- Asset maintenance recording
- Low stock alert event publishing
- All audit entries for inventory and asset events

**Dependencies:** Phase 1 (identity), Phase 2 (job context for asset assignment)

**Note:** Phase 4 depends on Phase 5 for stock item and asset references. Phase 5 depends on Phase 4 for consuming InventoryMutationCreated events to update stock levels. These are implemented in the same sprint, with Phase 5 stock/asset schema arriving first.

**Unlocks:** Phase 4 completion

---

## PHASE 6 — ACCOUNTING INTEGRATION MODULE

**Status:** Requires Phase 4 (financial records to sync)

**What:** Downstream accounting sync, reconciliation, exception resolution, and financial controls.

**Includes:**
- `accounting` schema migration (provider_configs, sync_records, sync_queue, reconciliation_records, exception_records, financial_control_records)
- Provider configuration management (QuickBooks, Xero, FreshBooks, Zoho)
- Provider adapter interfaces + stub implementations
- Sync queue consumer (subscribes to financial mutation events from Phase 4)
- Sync worker (processes sync queue → provider adapter calls)
- Sync record lifecycle (pending → syncing → synced | failed → retry)
- Reconciliation service (fetch provider data, compare, create exceptions)
- Exception resolution lifecycle (open → under_investigation → awaiting_approval → resolved | rejected)
- Financial controls lifecycle (pending_approval → approved | rejected, CEO-only)
- Accounting settings management
- All audit entries for sync, reconciliation, exception, and control events
- All domain events (AccountingSyncSucceeded, ReconciliationExceptionDetected, etc.)

**Dependencies:** Phase 4

**Unlocks:** Phase 10 (full financial reporting)

---

## PHASE 7 — CLIENT PORTAL MODULE

**Status:** Can be built in parallel with Phases 3–6; requires Phase 2

**What:** Client-facing access layer — portal accounts, document sharing, client requests.

**Includes:**
- `portal` schema migration (portal_accounts, portal_sessions, document_share_records, client_requests)
- Portal account provisioning (CEO-only)
- Portal authentication (separate JWT, separate credential model)
- Portal data scope service (access notes excluded, client_id scoping enforced)
- Client portal views (jobs, sites, documents, invoices — read-only)
- Document sharing (explicit share action)
- Client request submission (8 request types)
- Client request routing to PM
- Client request lifecycle (open → acknowledged → in_progress → resolved | declined)
- All audit entries for portal events (logins, views, requests, document shares)
- All domain events (ClientPortalLogin, ClientRequestSubmitted, etc.)

**Dependencies:** Phase 2 (job/site/client hierarchy)

**Unlocks:** No blockers for later phases, but required for full platform completeness

---

## PHASE 8 — INTELLIGENCE & AUTOMATION MODULE

**Status:** Requires Phases 3 and 4 (events to consume and evaluate)

**What:** Automation, notifications, activity feed, event bus, workflows, governance, scheduler.

**Includes:**
- `intelligence` schema migration (automation_rules, automation_schedules, governance_records, workflow_definitions, workflow_executions, notification_records, activity_feed_events, event_log)
- Event bus subscriber registry (all cross-module subscribers registered here)
- Activity feed service (consumes all events)
- Notification service (consumes warning/critical events → creates notification records)
- Automation evaluation service (read-only rule evaluation; forbidden action block enforcement)
- Automation CRUD (with governance check on save)
- Automation Governance service (CEO risk level management)
- Automation Scheduler service (cron-based evaluation triggers)
- Workflow execution engine (with forbidden action enforcement)
- Workflow CRUD
- All audit entries for automation, governance, scheduler, notification, and workflow events

**Dependencies:** Phases 3 and 4 (events to consume)

**Unlocks:** Phase 9

---

## PHASE 9 — REPORTING & ANALYTICS MODULE

**Status:** Requires Phase 8 (full event and intelligence data), Phase 4 (financial data), Phase 6 (sync/reconciliation data)

**What:** Reports, exports, distributions, analytics, forecasting.

**Includes:**
- `reporting` schema migration (report_definitions, generated_reports, report_exports, report_distributions)
- Report generation service (aggregates data from all modules)
- 6 report types: executive_summary, board_report, governance_report, financial_health_report, operations_report, monthly_kpi_report
- Export generation service (PDF and board-pack artifacts)
- Distribution service (email, portal, download)
- Analytics computation service (5-dimension health scoring)
- Forecast service (advisory projections, clearly labelled)
- All audit entries for report, export, and distribution events

**Dependencies:** Phases 4, 6, 8

**Unlocks:** Complete platform

---

## PHASE 10 — PRODUCTION HARDENING

**Status:** After all modules are implemented

**What:** Cross-cutting production readiness.

**Includes:**
- PostgreSQL Row Level Security policies on all tables (tenant isolation defence-in-depth)
- Rate limiting (Redis-backed)
- Idempotency key implementation (for critical state-changing endpoints)
- Health check detailed endpoint (`/health/detailed`)
- Prometheus metrics endpoint (`/metrics`)
- Exception monitoring integration (Sentry or equivalent)
- Security audit (SQL injection scan, RBAC bypass tests, tenant isolation penetration tests)
- Performance testing (submission approval pipeline, job mini-ledger aggregation, audit log queries)
- OpenAPI documentation generation
- Deployment configuration (environment variables, process management, startup/shutdown)

**Dependencies:** All previous phases

**Unlocks:** Production deployment

---

## IMPLEMENTATION ORDER SUMMARY

```
Phase 0  — Infrastructure Foundation
  ↓
Phase 1  — Identity Module
  ↓
Phase 2  — Operational Module
  ↓
Phase 3  — Review Centre Module     ←→  Phase 5 (Inventory & Asset, parallel)
  ↓
Phase 4  — Financial Normalization Module
  ↓
Phase 6  — Accounting Integration Module     ←→  Phase 7 (Client Portal, parallel)
  ↓
Phase 8  — Intelligence & Automation Module
  ↓
Phase 9  — Reporting & Analytics Module
  ↓
Phase 10 — Production Hardening
```

Phases 5 and 7 can be developed in parallel with adjacent phases.
Phase 6 and Phase 7 can be developed in parallel.
All other phases have strict sequential dependencies.

---

## DOCTRINE COMPLIANCE THROUGH PHASES

At each phase, the following doctrines are verified as implemented before proceeding:

| Phase | Doctrines Verified |
|---|---|
| Phase 1 | Tenant isolation; RBAC |
| Phase 2 | Job attribution; structural invariants (site → client, job → site) |
| Phase 3 | Approval Doctrine; Rejection Doctrine; automation cannot approve |
| Phase 4 | Financial immutability; append-only corrections; CEO-only correction approval; financial record requires approval reference |
| Phase 5 | Asset exclusivity; retirement terminal; stock level integrity |
| Phase 6 | Sync is downstream-only; reconciliation read-only; accounting systems are consumers not sources |
| Phase 7 | Client portal isolation; access notes hidden; document explicit share only; client requests never enter Review Centre |
| Phase 8 | Automation forbidden actions blocked; workflows cannot approve; notifications informational only; event bus never creates financial mutations |
| Phase 9 | Reports read-only; exports are read-only derivatives; forecasts labelled advisory; analytics never approves |
| Phase 10 | Full tenant isolation verified; financial mutation monitoring active; audit trail completeness verified |
