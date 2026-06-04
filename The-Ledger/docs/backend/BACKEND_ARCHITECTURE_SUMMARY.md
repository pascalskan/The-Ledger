# THE LEDGER — BACKEND ARCHITECTURE SUMMARY

Version: 1.0
Status: AUTHORITATIVE
Date: June 4, 2026
Authority: Backend Architecture Definition Phase

---

## PURPOSE

This document is the master summary of The Ledger backend architecture. It provides the complete architectural picture across all dimensions: principles, context map, layering, services, events, data ownership, auth, multi-tenancy, API, infrastructure, observability, AI boundaries, and implementation sequence.

All detail is found in the referenced architecture documents.

---

## ARCHITECTURAL CONTEXT

The Ledger backend is designed to implement a frozen domain model and frozen platform doctrine. The architectural decisions recorded here derive from:

- **LEDGER_CANONICAL_CONTEXT.md** — Platform doctrine (Approval, Audit, Job Attribution, Financial Integrity)
- **docs/domain/** — 14 frozen domain documents defining entities, lifecycles, and invariants
- **DOMAIN_MODEL_SUMMARY.md** — Authoritative synthesis of all domain decisions

The backend architecture may not redefine domains, workflows, or doctrine. It implements them.

---

## ARCHITECTURAL PRINCIPLES

The following principles govern every architectural decision in The Ledger backend:

1. **Financial Integrity** — No financial record is created without explicit human approval. Approved records are immutable.
2. **Auditability** — Every financially relevant action produces an immutable audit entry: who, what, when, source, destination, job context.
3. **Traceability** — Every financial record is traceable to the operational event that originated it, through the approval that created it.
4. **Job Attribution** — No financial record exists without a valid `job_id`. Jobs are the atomic financial containers.
5. **Tenant Isolation** — All data is scoped to a company (`company_id`). Cross-tenant data access is unconditionally forbidden.
6. **Approval Supremacy** — Automation, workflows, and schedulers may never approve submissions or create financial records. Human approval is mandatory and absolute.
7. **Accounting-System Independence** — Accounting systems are downstream consumers. The Ledger is the source of operational truth. Sync is export-only and never modifies The Ledger's records.
8. **Doctrine Before Convenience** — Where any architectural pattern conflicts with platform doctrine, platform doctrine wins.

---

## ARCHITECTURAL STYLE DECISION

**Selected Style: Hybrid Event Architecture within a Modular Monolith**

**Summary:**
- Single Express application, single PostgreSQL database
- Internally decomposed into 9 modules mirroring bounded contexts
- CRUD for primary state management
- Domain events for cross-module propagation (transactional outbox pattern)
- Explicit append-only audit log (not event sourcing)
- Module boundaries are microservice-ready for future extraction

**Why not Event Sourcing:** The audit trail is satisfied by an explicit audit log. Event sourcing would add replay complexity without sufficient benefit for this stage.

**Why not Microservices:** Disproportionate operational overhead for a pre-launch product. The modular structure preserves the path to microservices extraction.

**Detail:** BACKEND_SERVICE_ARCHITECTURE.md

---

## CONTEXT MAP

Nine bounded contexts, each owning its aggregates and enforcing its invariants:

| Context | Module | Primary Responsibility |
|---|---|---|
| Identity & Access | `identity` | Authentication, JWT, RBAC, tenant provisioning |
| Operational Core | `operational` | Clients, Sites, Jobs, Shifts, Workers, Scheduling |
| Submission & Review | `review` | All worker submissions, Review Centre, Rejection Doctrine |
| Financial Normalization | `financial` | Approved financial records, Job Mini-Ledger, Corrections |
| Inventory & Asset | `inventory` | Stock catalogue, Stock levels, Asset register |
| Client Portal | `portal` | Portal accounts, Client requests, Document sharing |
| Accounting Integration | `accounting` | Sync, Reconciliation, Exceptions, Financial Controls |
| Intelligence & Automation | `intelligence` | Automation, Workflows, Notifications, Activity Feed, Event Bus |
| Reporting & Analytics | `reporting` | Reports, Exports, Distributions, Analytics |

**Dependency direction (strictly downward):**
```
Reporting & Analytics     (reads from all; produces artifacts)
Intelligence & Automation (reads from all; never writes financial records)
Accounting Integration    (reads from Financial; never writes to Ledger records)
Financial Normalization   (reads approval events from Review Centre)
Inventory & Asset         (reads mutation events from Financial)
Submission & Review       (reads job context from Operational)
Client Portal             (reads from Operational; publishes requests)
Operational Core          (reads identity from Identity)
Identity & Access         (authoritative source)
```

**Detail:** BACKEND_DOMAIN_ARCHITECTURE.md

---

## LAYERING MODEL

Four layers with strict downward dependency:

```
┌─────────────────────────────────────────────────────────────┐
│  API LAYER                                                   │
│  Express routes · JWT auth · Zod validation · Error mapping  │
├─────────────────────────────────────────────────────────────┤
│  APPLICATION LAYER                                           │
│  Use cases · RBAC enforcement · Tenant scoping · Audit write │
├─────────────────────────────────────────────────────────────┤
│  DOMAIN LAYER                                                │
│  Entities · Aggregates · Invariants · Domain Events          │
├─────────────────────────────────────────────────────────────┤
│  INFRASTRUCTURE LAYER                                        │
│  PostgreSQL · Drizzle ORM · Event Bus · External Adapters    │
└─────────────────────────────────────────────────────────────┘
```

The Approval Gate (the boundary between pending submission and financial reality) is enforced exclusively in the Application Layer.

**Detail:** BACKEND_LAYERING_ARCHITECTURE.md

---

## SERVICE MAP

Single deployable Express application with 9 internal modules:

| Module | Key Services |
|---|---|
| Identity | AuthService, RbacService, TenantService |
| Operational | JobService, SiteService, ShiftService, SchedulingService |
| Review Centre | SubmissionIntakeService, ApprovalService, RejectionService, CorrectionService |
| Financial Normalization | NormalizationService, CorrectionService, MiniLedgerService, PayrollAggregationService |
| Inventory & Asset | StockLevelService, AssetAssignmentService, AssetMaintenanceService |
| Client Portal | PortalAuthService, PortalDataScopeService, ClientRequestRoutingService |
| Accounting Integration | ProviderAdapterRegistry, SyncQueueService, ReconciliationService, ExceptionResolutionService, FinancialControlService |
| Intelligence & Automation | AutomationEvaluationService, WorkflowExecutionEngine, NotificationService, ActivityFeedService, EventBusService, GovernanceService, SchedulerService |
| Reporting | ReportGenerationService, ExportService, DistributionService, AnalyticsService, ForecastService |

Two process types: API Server and Worker Process.

**Detail:** BACKEND_SERVICE_ARCHITECTURE.md

---

## EVENT MAP

**Event strategy:** Transactional outbox pattern — events written to `event_outbox` in same transaction as state change; delivered asynchronously; written to permanent `event_log`.

**Event naming:** `{Noun}{PastTenseVerb}` (e.g. `TimesheetApproved`, `VoidRecordCreated`)

**Key financial event flows:**

```
TimesheetApproved → Financial Normalization → TimesheetEntryCreated → Accounting Integration (sync queue)
ReportApproved → Financial Normalization → InventoryMutationCreated → Inventory & Asset (stock level update)
ExpenseApproved (billable) → Financial Normalization → InvoiceLineItemCreated → Accounting Integration
VoidRecordCreated → Accounting Integration (sync correction queue)
```

**Key intelligence event flows:**

```
All events → Intelligence (Activity Feed, Notification routing, Automation evaluation, Dashboard)
AccountingSyncFailed → Intelligence → Notification to CEO
StockLowAlertTriggered → Intelligence → Notification to PM/CEO
```

**Detail:** BACKEND_EVENT_ARCHITECTURE.md

---

## DATA OWNERSHIP MAP

Single PostgreSQL database. 9 schema namespaces (one per module). `company_id` on every table.

| Schema | Owns |
|---|---|
| `identity` | Companies, Users, Roles, Sessions |
| `operational` | Clients, Sites, Jobs, Shifts, Workers, Assignments |
| `review` | Submissions (all types), Rejections |
| `financial` | Financial records (all types), Corrections, Payroll |
| `inventory` | Stock, Locations, Levels, Assets, Assignments |
| `portal` | Portal accounts, Client requests, Document shares |
| `accounting` | Provider configs, Sync records, Reconciliation, Exceptions |
| `intelligence` | Automation, Workflows, Notifications, Events |
| `reporting` | Reports, Exports, Distributions |
| `audit` | Audit entries (shared; append-only) |

**Source of truth for financial records:** `financial` schema (Financial Normalization Module). No other schema may write financial records.

**Operational truth becomes financial truth through:**
1. Worker submission enters `review` schema (pending)
2. Approval event published
3. Financial Normalization Module creates record in `financial` schema
4. Audit entry written in same transaction

**Detail:** BACKEND_DATA_ARCHITECTURE.md

---

## AUTH MODEL

| Dimension | Decision |
|---|---|
| Primary auth mechanism | JWT (short-lived access token + long-lived refresh token) |
| Token storage | Access token: memory; Refresh token: HTTP-only Secure cookie |
| Portal auth | Separate portal JWT with `client_id` scope claim |
| RBAC model | 4 roles: CEO, PM, Worker, Client (portal) |
| Authorization levels | Coarse (route middleware) + Fine-grained (Application Layer use cases) |
| Tenant isolation | `company_id` claim in JWT; verified on every resource access |
| CEO authority | Platform-wide; no additional scope restriction |
| PM authority | Scoped to assigned jobs and sites |
| Worker authority | Operational only; no financial visibility |
| Client authority | Portal only; own client's data; read-only + request submission |

**Detail:** BACKEND_AUTH_ARCHITECTURE.md

---

## MULTI-TENANT MODEL

| Dimension | Decision |
|---|---|
| Tenancy unit | Company (one company = one tenant) |
| Isolation strategy | Row-level (shared tables, `company_id` on all rows) |
| Enforcement layers | JWT claims → Application Layer → Repository WHERE clause → PostgreSQL RLS |
| Demo data isolation | Absolute (Domain Invariant #24 — never mixes with real company data) |
| Client visibility | Scoped to own client's sites and jobs only |
| Worker visibility | Scoped to assigned jobs; no financial data |
| Cross-tenant access | Unconditionally forbidden at all layers |

**Detail:** BACKEND_MULTITENANCY_ARCHITECTURE.md

---

## API STRATEGY

| Dimension | Decision |
|---|---|
| Style | Domain-driven (intention-expressing routes, not generic CRUD) |
| Primary API base | `/api/v1/` |
| Portal API base | `/portal/v1/` |
| Versioning | URL path versioning |
| Validation | Zod schemas at API Layer |
| Error format | Consistent JSON envelope with domain-specific error codes |
| Pagination | Cursor-based (all variable-length lists) |
| Idempotency | Idempotency-Key header for state-changing operations |
| Rate limiting | Per user, token bucket, Redis-backed |
| Documentation | OpenAPI 3.1 |

**Detail:** BACKEND_API_ARCHITECTURE.md

---

## INFRASTRUCTURE STRATEGY

| Dimension | Decision |
|---|---|
| Runtime | Node.js + Express + TypeScript |
| Database | PostgreSQL with Drizzle ORM |
| Queue | Database-backed queue (PostgreSQL) in v1; extractable to broker |
| Background workers | Separate Worker Process; 5 worker types |
| Scheduler | Cron-within-process in v1; distributed lock for multi-instance future |
| File storage | Cloud object storage (S3-compatible); signed URLs |
| Caching | Redis (rate limiting; optional read model caching) |
| Event delivery | Transactional outbox; at-least-once delivery; idempotent consumers |

**Detail:** BACKEND_INFRASTRUCTURE_ARCHITECTURE.md

---

## OBSERVABILITY STRATEGY

| Dimension | Decision |
|---|---|
| Structured logging | JSON logs; requestId correlation; financial values excluded from logs |
| Audit trail | Append-only `audit.audit_entries`; permanent; written in same transaction as state change |
| Event log | Permanent `intelligence.event_log`; append-only |
| Metrics | Prometheus-compatible endpoint; request metrics + business metrics |
| Exception monitoring | Sentry or equivalent; 5xx errors captured with context |
| Financial mutation monitoring | Invariant violation alerts (financial record without approval, content update) |
| Integration monitoring | Sync health metrics; reconciliation metrics; alerting on failure thresholds |
| Automation monitoring | Every evaluation audited; forbidden action attempts logged and alerted |

**Detail:** BACKEND_OBSERVABILITY_ARCHITECTURE.md

---

## FUTURE AI BOUNDARIES

Document Intelligence is a reserved future bounded context:

- May extract data from uploaded documents (receipts, invoices, photos)
- Surfaces results as **advisory suggestions** to reviewers only
- May never approve submissions
- May never create financial records
- May never modify submission content
- Writes only to its own `document_intelligence` schema
- Consumes file references; does not own storage
- Provider adapters are swappable (AWS Textract, Google Document AI, Azure Form Recognizer)

**Detail:** BACKEND_DOCUMENT_INTELLIGENCE_ARCHITECTURE.md

---

## IMPLEMENTATION SEQUENCE

```
Phase 0  Infrastructure Foundation        (Node, Express, PostgreSQL, Drizzle, audit, outbox)
  ↓
Phase 1  Identity Module                  (auth, JWT, RBAC, tenant provisioning)
  ↓
Phase 2  Operational Module               (clients, sites, jobs, workers, shifts, scheduling)
  ↓
Phase 3  Review Centre Module             (submissions, approvals, rejections, corrections)
  ↓                                        ↕ Phase 5 in parallel: Inventory & Asset Module
Phase 4  Financial Normalization Module   (financial records, corrections, mini-ledger)
  ↓
Phase 6  Accounting Integration Module    (sync, reconciliation, exceptions, controls)
  ↓                                        ↕ Phase 7 in parallel: Client Portal Module
Phase 8  Intelligence & Automation Module (automation, workflows, notifications, events)
  ↓
Phase 9  Reporting & Analytics Module     (reports, exports, analytics, forecasting)
  ↓
Phase 10 Production Hardening             (RLS, security audit, performance, documentation)
```

**Detail:** BACKEND_IMPLEMENTATION_ROADMAP.md

---

## DOCTRINE PRESERVATION GUARANTEES

The architecture preserves every platform doctrine through explicit enforcement:

| Doctrine | Enforcement Mechanism |
|---|---|
| Approval Doctrine | `ApproveSubmissionCommand` is the only path to financial record creation; `assertApprovalReference()` enforced in Application Layer |
| Audit Doctrine | `AuditWriter.append()` called in same ACID transaction as every financial state change |
| Job Attribution Doctrine | `job_id` is a required field at the database level for all financial records; missing `job_id` is a constraint violation |
| Financial Immutability | Repository exposes no content-update methods for financial records; RLS prevents direct column updates |
| Accounting-System Independence | Provider adapters are export-only; reconciliation creates exceptions, never modifies Ledger records |
| Automation Cannot Approve | `assertAutomationCannotApprove()` in ApprovalService; `assertForbiddenActionsBlocked()` in WorkflowExecutionEngine |
| Tenant Isolation | `company_id` in JWT → Application Layer → Repository WHERE clause → PostgreSQL RLS |

---

## ARCHITECTURE DOCUMENTS INDEX

| Document | Contents |
|---|---|
| BACKEND_ARCHITECTURE_SUMMARY.md | This document — master summary |
| BACKEND_DOMAIN_ARCHITECTURE.md | Bounded contexts, aggregates, dependencies |
| BACKEND_LAYERING_ARCHITECTURE.md | Four-layer model, responsibilities, forbidden interactions |
| BACKEND_SERVICE_ARCHITECTURE.md | Modular monolith decision, module definitions, inter-module communication |
| BACKEND_EVENT_ARCHITECTURE.md | Event strategy, event catalogue, outbox pattern, event lifecycle |
| BACKEND_DATA_ARCHITECTURE.md | Aggregates, schemas, write/read models, transaction boundaries, audit storage |
| BACKEND_AUTH_ARCHITECTURE.md | Identity model, JWT auth, RBAC, permission matrix |
| BACKEND_MULTITENANCY_ARCHITECTURE.md | Row-level isolation, enforcement layers, visibility boundaries |
| BACKEND_API_ARCHITECTURE.md | API types, versioning, validation, errors, pagination, rate limiting |
| BACKEND_INFRASTRUCTURE_ARCHITECTURE.md | Runtime, workers, queues, scheduler, integration, file, audit processing |
| BACKEND_DOCUMENT_INTELLIGENCE_ARCHITECTURE.md | Future AI processing boundaries and ownership |
| BACKEND_OBSERVABILITY_ARCHITECTURE.md | Logging, audit, telemetry, monitoring, traceability |
| BACKEND_IMPLEMENTATION_ROADMAP.md | 10-phase dependency-ordered implementation sequence |
