# THE LEDGER — BACKEND ARCHITECTURE SUMMARY

Version: 2.0
Status: AUTHORITATIVE
Date: June 4, 2026
Authority: Backend Architecture Refinement Pass

---

## CHANGE LOG

| Version | Date | Changes |
|---|---|---|
| 1.0 | June 4, 2026 | Initial architecture summary — 9 bounded contexts, 10 schemas |
| 2.0 | June 4, 2026 | Refinement pass: Tenant Context extracted from Identity; Financial Intelligence Context added; Notification Centre formally defined as sub-domain; AI Limitations Covenant established; total 11 bounded contexts, 13 schemas |

---

## PURPOSE

This document is the master summary of The Ledger backend architecture. It provides the complete architectural picture across all dimensions: principles, context map, layering, services, events, data ownership, auth, multi-tenancy, API, infrastructure, observability, AI boundaries, and implementation sequence.

All detail is in the referenced architecture documents. This document is the single entry point for understanding the complete backend architecture.

---

## ARCHITECTURAL CONTEXT

The Ledger backend implements a frozen domain model and frozen platform doctrine:

- **LEDGER_CANONICAL_CONTEXT.md** — Platform doctrine (Approval, Audit, Job Attribution, Financial Integrity)
- **docs/domain/** — 14 frozen domain documents defining entities, lifecycles, and invariants
- **DOMAIN_MODEL_SUMMARY.md** — Authoritative synthesis of all domain decisions

The backend architecture may not redefine domains, workflows, or doctrine. It implements them.

---

## ARCHITECTURAL PRINCIPLES

1. **Financial Integrity** — No financial record is created without explicit human approval. Approved records are immutable in content.
2. **Auditability** — Every financially relevant action produces an immutable audit entry: who, what, when, source, destination, job context.
3. **Traceability** — Every financial record is traceable to the operational event that originated it, through the approval that created it.
4. **Job Attribution** — No financial record exists without a valid `job_id`. Jobs are the atomic financial containers.
5. **Tenant Isolation** — All data is scoped to a company (`company_id`). Cross-tenant data access is unconditionally forbidden.
6. **Approval Supremacy** — Automation, workflows, schedulers, and AI systems may never approve submissions or create financial records. Human approval is mandatory and absolute.
7. **Accounting-System Independence** — Accounting systems are downstream consumers. The Ledger is the source of operational truth. Sync is export-only and never modifies The Ledger's records.
8. **AI Advisory Only** — AI systems provide suggestions to human reviewers only. AI may never approve, reject, or create financial records. The Review Centre governs all financial reality.
9. **Doctrine Before Convenience** — Where any architectural pattern conflicts with platform doctrine, platform doctrine wins.

---

## ARCHITECTURAL STYLE DECISION

**Selected Style: Hybrid Event Architecture within a Modular Monolith**

- Single Express application, single PostgreSQL database
- Internally decomposed into **11 modules** mirroring bounded contexts
- CRUD for primary state management
- Domain events for cross-module propagation (transactional outbox pattern)
- Explicit append-only audit log (not event sourcing)
- Module boundaries are microservice-ready for future extraction

**Why not Event Sourcing:** The audit trail is satisfied by an explicit audit log. Event sourcing would add replay complexity without sufficient benefit at this stage.

**Why not Microservices:** Disproportionate operational overhead for a pre-launch product. The modular structure preserves the path to microservices extraction.

**Detail:** BACKEND_SERVICE_ARCHITECTURE.md

---

## CONTEXT MAP

Eleven bounded contexts, each owning its aggregates and enforcing its invariants:

| # | Context | Module | Primary Responsibility |
|---|---|---|---|
| 1 | **Tenant** | `tenant` | Company lifecycle, subscription, plan, tenant configuration |
| 2 | Identity & Access | `identity` | Users, authentication, JWT, RBAC, roles and permissions |
| 3 | Operational Core | `operational` | Clients, Sites, Jobs, Shifts, Workers, Scheduling |
| 4 | Submission & Review | `review` | All worker submissions, Review Centre, Rejection Doctrine |
| 5 | Financial Normalization | `financial` | Approved financial records, Job Mini-Ledger, Corrections |
| 6 | **Financial Intelligence** | `financial_intelligence` | Margin analysis, forecasting, exposure, financial KPIs, Financial Explorer |
| 7 | Inventory & Asset | `inventory` | Stock catalogue, stock levels, asset register |
| 8 | Client Portal | `portal` | Portal accounts, client requests, document sharing |
| 9 | Accounting Integration | `accounting` | Sync, Reconciliation, Exception Resolution, Financial Controls |
| 10 | Intelligence & Automation | `intelligence` + `notification` | Automation, Workflows, Activity Feed, Event Bus; **Notification Centre sub-domain** |
| 11 | Reporting & Analytics | `reporting` | Reports, Exports, Distributions, Operational Analytics |

**New in v2.0:** Tenant Context (1), Financial Intelligence Context (6)
**Formalised in v2.0:** Notification Centre sub-domain (within Context 10)

**Dependency direction (strictly downward):**

```
Reporting & Analytics          (reads from all; produces distributable artifacts)
Intelligence & Automation      (reads from all; Notification Centre routes events to users)
Financial Intelligence         (reads from Financial Normalization; produces advisory insights only)
Accounting Integration         (reads from Financial; never writes to Ledger records)
Financial Normalization        (reads approval events from Review Centre)
Inventory & Asset              (reads mutation events from Financial Normalization)
Submission & Review            (reads job context from Operational Core)
Client Portal                  (reads from Operational Core; publishes requests)
Operational Core               (reads from Identity and Tenant)
Identity & Access              (validates tenant status via Tenant; otherwise independent)
Tenant                         (authoritative source; reads nothing from other contexts)
```

**Detail:** BACKEND_DOMAIN_ARCHITECTURE.md

---

## LAYERING MODEL

Four layers with strict downward dependency. No layer may import from a layer above it.

```
┌─────────────────────────────────────────────────────────────────┐
│  API LAYER                                                       │
│  Express routes · JWT auth · Zod validation · Error mapping      │
├─────────────────────────────────────────────────────────────────┤
│  APPLICATION LAYER                                               │
│  Use cases · RBAC · Tenant scoping · Approval Gate · Audit write │
├─────────────────────────────────────────────────────────────────┤
│  DOMAIN LAYER                                                    │
│  Entities · Aggregates · Invariants · Domain Events              │
├─────────────────────────────────────────────────────────────────┤
│  INFRASTRUCTURE LAYER                                            │
│  PostgreSQL · Drizzle ORM · Event Bus · External Adapters        │
└─────────────────────────────────────────────────────────────────┘
```

The **Approval Gate** — the boundary between pending submission and financial reality — is enforced exclusively in the Application Layer. No API Layer shortcut. No Infrastructure Layer bypass.

**Detail:** BACKEND_LAYERING_ARCHITECTURE.md

---

## SERVICE MAP

Single deployable Express application with 11 internal modules:

| Module | Key Internal Services |
|---|---|
| Tenant | TenantProvisioningService, TenantLifecycleService, TenantConfigurationService |
| Identity | AuthService, RbacService, UserService |
| Operational | JobService, SiteService, ShiftService, SchedulingService |
| Review Centre | SubmissionIntakeService, ApprovalService, RejectionService, CorrectionService |
| Financial Normalization | NormalizationService, CorrectionService, MiniLedgerService, PayrollAggregationService |
| **Financial Intelligence** | MarginIntelligenceService, ExposureAnalysisService, ForecastService, FinancialKPIService, FinancialExplorerService |
| Inventory & Asset | StockLevelService, AssetAssignmentService, AssetMaintenanceService |
| Client Portal | PortalAuthService, PortalDataScopeService, ClientRequestRoutingService |
| Accounting Integration | ProviderAdapterRegistry, SyncQueueService, ReconciliationService, ExceptionResolutionService, FinancialControlService |
| Intelligence & Automation | AutomationEvaluationService, WorkflowExecutionEngine, **NotificationRoutingService**, **NotificationDeliveryService**, ActivityFeedService, EventBusService, GovernanceService, SchedulerService |
| Reporting | ReportGenerationService, ExportService, DistributionService, OperationalAnalyticsService |

Two process types: **API Server** (handles inbound requests) and **Worker Process** (handles background jobs, event outbox delivery, sync, notifications, scheduled evaluations).

**Detail:** BACKEND_SERVICE_ARCHITECTURE.md

---

## EVENT MAP

**Strategy:** Transactional outbox — events written to `event_outbox` in same transaction as state change; delivered asynchronously by outbox worker; written permanently to `event_log`.

**Naming standard:** `{Noun}{PastTenseVerb}` — e.g. `TimesheetApproved`, `TenantProvisioned`, `MarginSnapshotComputed`

**Key event flows added or updated in v2.0:**

```
Tenant flows (new):
  TenantProvisioned → Identity Module (create initial CEO user)
  TenantSuspended   → Identity Module (revoke all active sessions)

Financial Intelligence flows (new):
  TimesheetEntryCreated   → Financial Intelligence (update margin and KPI models)
  ExpenseEntryCreated     → Financial Intelligence (update cost models)
  InvoiceLineItemCreated  → Financial Intelligence (update revenue models)
  VoidRecordCreated       → Financial Intelligence (recalculate net values)
  JobClosed               → Financial Intelligence (finalise job profitability)
  ExposureAlertTriggered  → Notification Centre (financial_alert to CEO)
  MarginSnapshotComputed  → Reporting (financial KPI data for reports)

Notification Centre flows (formalised):
  TimesheetSubmitted              → Notification Centre → review_required to PM/CEO
  TimesheetApproved               → Notification Centre → review_approved to worker
  TimesheetRejected               → Notification Centre → review_rejected to worker
  AccountingSyncFailed            → Notification Centre → sync_failed to CEO
  ReconciliationExceptionDetected → Notification Centre → financial_alert to CEO
  ClientRequestSubmitted          → Notification Centre → client_portal_event to PM/CEO
  StockLowAlertTriggered          → Notification Centre → stock_alert to PM/CEO
  GovernanceStatusChanged         → Notification Centre → governance_action to CEO
  SchedulingConflictDetected      → Notification Centre → scheduling_conflict to PM/CEO
```

**Detail:** BACKEND_EVENT_ARCHITECTURE.md

---

## DATA OWNERSHIP MAP

Single PostgreSQL database. **13 schema namespaces** (was 10 in v1.0).

| Schema | Owns | Module Owner |
|---|---|---|
| `tenant` | Companies, Subscriptions, Plans, Configurations | **Tenant Module** (new) |
| `identity` | Users, Roles, Sessions, RefreshTokens | Identity Module |
| `operational` | Clients, Sites, Jobs, Shifts, Workers, Assignments | Operational Module |
| `review` | Submissions (all types), Rejections | Review Centre Module |
| `financial` | Financial records (all types), Corrections, Payroll | Financial Normalization Module |
| `financial_intelligence` | MarginSnapshots, ForecastRecords, ExposureRecords, KPISnapshots | **Financial Intelligence Module** (new) |
| `inventory` | Stock items, Locations, Levels, Assets, Assignments | Inventory & Asset Module |
| `portal` | Portal accounts, Client requests, Document shares | Client Portal Module |
| `accounting` | Provider configs, Sync records, Reconciliation, Exceptions | Accounting Integration Module |
| `intelligence` | Automation rules, Schedules, Workflows, Activity events | Intelligence & Automation Module |
| `notification` | Notification records, Delivery records, Preferences | Intelligence (Notification sub-domain) (new) |
| `reporting` | Reports, Exports, Distributions | Reporting Module |
| `audit` | Audit entries (append-only; all modules write; no module reads from another's schema) | Shared |

**Source-of-truth rules:**
- Financial records are created only in `financial` schema. No other schema may create financial records.
- Advisory financial analysis lives only in `financial_intelligence` schema. These are analytical views, never financial records.
- Tenancy is owned by `tenant` schema. `company_id` on every record in every schema is a foreign key to `tenant.companies`.
- Notifications live in `notification` schema, separated from `intelligence` schema for clarity and future extractability.

**Detail:** BACKEND_DATA_ARCHITECTURE.md

---

## TENANT MODEL

Tenant Context (Context 1) is the authoritative owner of company existence and lifecycle.

| Dimension | Decision |
|---|---|
| Tenancy unit | Company — owned by Tenant Context |
| Lifecycle states | `active` / `suspended` / `terminated` |
| Suspension effect | `TenantSuspended` event → Identity Module revokes all active sessions |
| Provisioning | Admin calls Tenant Module → publishes `TenantProvisioned` → Identity Module creates initial CEO user |
| Configuration | Per-tenant: default currency, notification preferences, feature flags |
| Isolation strategy | Row-level (`company_id` on all rows in all schemas) |
| Enforcement layers | JWT claims → Application Layer → Repository WHERE clause → PostgreSQL Row Level Security |
| Cross-tenant access | Unconditionally forbidden at all layers |

**Rationale for extraction from Identity:**
Company has a distinct lifecycle (active/suspended/terminated), subscription model, plan tier, and configuration that are not authentication concerns. Identity's single responsibility is: who is the user and what are they allowed to do. Tenant's responsibility is: which business entity does this user belong to, and what is that entity's operational state. These concerns grow independently (subscription management, billing, plan enforcement) and must not pollute the authentication domain.

**Detail:** BACKEND_MULTITENANCY_ARCHITECTURE.md, BACKEND_AUTH_ARCHITECTURE.md

---

## NOTIFICATION MODEL

Notification Centre is formally defined as a sub-domain within Intelligence & Automation (Context 10), with its own schema, lifecycle, event consumers, API surface, and delivery model. It may be extracted to an independent bounded context in a future revision if delivery complexity warrants it.

| Dimension | Definition |
|---|---|
| Schema | `notification` (own namespace, separate from `intelligence`) |
| Aggregate roots | NotificationRecord, NotificationDeliveryRecord, NotificationPreference |
| Lifecycle | `created (unread)` → `read` → `dismissed` |
| Delivery v1 | In-platform inbox only |
| Delivery future | Email, mobile push (via delivery adapter interface) |
| RBAC | CEO: all types, all jobs; PM: own jobs only; Worker: none; Client: none |
| Doctrine | Informational only — never creates financial mutations, never approves submissions, never bypasses the Review Centre |

**Supported notification types:**

| Type | Trigger |
|---|---|
| `review_required` | Any submission submitted |
| `review_approved` | Any submission approved |
| `review_rejected` | Any submission rejected |
| `sync_failed` | `AccountingSyncFailed` |
| `sync_succeeded` | `AccountingSyncSucceeded` (configurable) |
| `governance_action` | `GovernanceStatusChanged` |
| `automation_alert` | High/critical risk automation triggered |
| `financial_alert` | `ExposureAlertTriggered`, `ReconciliationExceptionDetected` |
| `client_portal_event` | `ClientRequestSubmitted` |
| `scheduling_conflict` | `SchedulingConflictDetected` |
| `stock_alert` | `StockLowAlertTriggered` |

**Detail:** BACKEND_SERVICE_ARCHITECTURE.md (Module 10), BACKEND_EVENT_ARCHITECTURE.md

---

## FINANCIAL INTELLIGENCE MODEL

Financial Intelligence is a first-class bounded context (Context 6), distinct from Financial Normalization and Reporting.

| Dimension | Definition |
|---|---|
| Schema | `financial_intelligence` |
| Aggregate roots | MarginSnapshot, ForecastRecord, ExposureRecord, FinancialKPISnapshot, PortfolioInsight |
| Reads from | Financial Normalization (approved records via events), Operational Core (job context) |
| Writes to | Own schema only — never to `financial`, `review`, or any other schema |
| Output type | Advisory analytical views — never financial records |
| Forecasts | Always labelled "Advisory Projection — Not Financial Advice" |

**Distinction from Financial Normalization:**
Normalization transforms approved operational events into financial records (write concern). Financial Intelligence analyses those records to produce advisory insights (read/analysis concern). These are separate responsibilities with separate schemas, separate modules, and separate lifecycles.

**Distinction from Reporting:**
Reporting produces distributable report artifacts (PDFs, board packs). Financial Intelligence produces live advisory views consumed by the Financial Explorer, Margin Intelligence, and Exposure Analysis features.

**Reconciliation, Exception Resolution, and Financial Controls remain in Accounting Integration:**
These are sync-accountability concerns — they exist because of the relationship between The Ledger's records and a downstream accounting provider. They are not financial intelligence concerns.

**Detail:** BACKEND_DOMAIN_ARCHITECTURE.md (Context 6), BACKEND_SERVICE_ARCHITECTURE.md (Module 6)

---

## DOCUMENT INTELLIGENCE BOUNDARIES

AI-assisted document processing is a reserved future bounded context with an absolute AI Limitations Covenant:

| AI Capability | Status |
|---|---|
| Extract structured data from documents | Permitted — advisory only, labelled |
| Classify document types | Permitted — advisory only |
| Flag discrepancies for reviewer attention | Permitted — advisory only |
| Approve any submission | **FORBIDDEN — absolute invariant** |
| Create approved financial records | **FORBIDDEN — absolute invariant** |
| Reject any submission automatically | **FORBIDDEN — absolute invariant** |
| Override a reviewer's decision | **FORBIDDEN — absolute invariant** |
| Bypass the Review Centre | **FORBIDDEN — absolute invariant** |
| Modify submission content | **FORBIDDEN — absolute invariant** |
| Block human approval on processing failure | **FORBIDDEN — processing failures are non-blocking** |
| Write to `financial`, `review`, or `audit` schemas | **FORBIDDEN** |

The Review Centre is the mandatory gateway. AI is an assistant to the reviewer, not a replacement.

**Processing pipeline stages:** Intake → Classification Queue → Classification → Extraction → Discrepancy Detection → Enrichment Delivery → Reviewer Action (human)

**Detail:** BACKEND_DOCUMENT_INTELLIGENCE_ARCHITECTURE.md

---

## AUTH MODEL

| Dimension | Decision |
|---|---|
| Primary auth mechanism | JWT (15-min access token + HTTP-only Secure refresh token) |
| Tenant status check | Tenant Module consulted at login — suspended tenants cannot authenticate |
| Portal auth | Separate portal JWT scoped to `client_id` |
| RBAC model | 4 roles: CEO, PM, Worker, Client (portal) |
| Authorization levels | Coarse (route middleware) + Fine-grained (Application Layer use cases) |
| Tenant isolation | `company_id` in JWT; verified on every resource access |
| CEO authority | Platform-wide; no additional scope restriction |
| PM authority | Scoped to assigned jobs and sites |
| Worker authority | Operational submissions only; no financial visibility |
| Client authority | Portal only; own client's data; read-only with request submission |

**Detail:** BACKEND_AUTH_ARCHITECTURE.md

---

## API STRATEGY

| Dimension | Decision |
|---|---|
| Style | Domain-driven, intention-expressing routes |
| Primary API base | `/api/v1/` |
| Portal API base | `/portal/v1/` |
| Versioning | URL path versioning |
| Validation | Zod schemas at API Layer |
| Error format | Consistent JSON envelope with domain-specific error codes |
| Pagination | Cursor-based (all variable-length lists) |
| Idempotency | `Idempotency-Key` header for state-changing operations |
| Rate limiting | Per user, token bucket, Redis-backed |
| Documentation | OpenAPI 3.1 |

**API namespaces added in v2.0:** `/api/v1/tenant/` (admin provisioning), `/api/v1/financial-intelligence/`, `/api/v1/notifications/` (dedicated surface)

**Detail:** BACKEND_API_ARCHITECTURE.md

---

## INFRASTRUCTURE STRATEGY

| Dimension | Decision |
|---|---|
| Runtime | Node.js + Express + TypeScript |
| Database | PostgreSQL with Drizzle ORM, 13 schemas |
| Queue | Database-backed queue (PostgreSQL) in v1; extractable to broker |
| Background workers | 5 worker types: outbox delivery, sync, notification delivery, scheduled evaluation, reconciliation |
| Scheduler | Cron-within-process in v1; distributed lock for multi-instance future |
| File storage | Cloud object storage (S3-compatible); signed URLs; tenant-namespaced paths |
| Caching | Redis (rate limiting; optional read model caching for Financial Intelligence) |
| Event delivery | Transactional outbox; at-least-once delivery; idempotent consumers |

**Detail:** BACKEND_INFRASTRUCTURE_ARCHITECTURE.md

---

## OBSERVABILITY STRATEGY

| Dimension | Decision |
|---|---|
| Structured logging | JSON logs; `requestId` correlation; financial values excluded from logs |
| Audit trail | Append-only `audit.audit_entries`; written in same ACID transaction as every financial mutation |
| Event log | Permanent `intelligence.event_log`; append-only |
| Metrics | Prometheus-compatible `/metrics` endpoint |
| Exception monitoring | Sentry or equivalent; all 5xx errors captured with context |
| Financial mutation monitoring | Invariant violation alerts (financial record without approval reference, content update attempt) |
| Integration monitoring | Sync health metrics, reconciliation metrics, alerting on failure thresholds |
| Notification monitoring | Delivery success rate, unread count accumulation, delivery failure alerting |
| Automation monitoring | Every evaluation audited; forbidden action attempts logged and alerted immediately |

**Detail:** BACKEND_OBSERVABILITY_ARCHITECTURE.md

---

## DOCTRINE PRESERVATION GUARANTEES

| Doctrine | Enforcement Mechanism |
|---|---|
| Approval Doctrine | `ApproveSubmissionCommand` is the only path to financial record creation; `assertApprovalReference()` in Application Layer |
| Audit Doctrine | `AuditWriter.append()` in same ACID transaction as every financial state change |
| Job Attribution | `job_id` is a NOT NULL database constraint on all financial records |
| Financial Immutability | Repository exposes no content-update methods; RLS prevents direct column updates |
| Accounting Independence | Provider adapters are export-only; reconciliation creates exceptions, never modifies Ledger records |
| Automation Cannot Approve | `assertForbiddenActionsBlocked()` in WorkflowExecutionEngine |
| AI Cannot Approve | Document Intelligence Module exposes no approval methods; `document_intelligence` DB role has no write access to `financial` or `review` schemas |
| Notifications Informational Only | `assertNotificationsInformationalOnly()` — notifications never trigger financial mutations |
| Financial Intelligence Advisory Only | `assertAdvisoryOnly()`, `assertNoFinancialMutations()` — Financial Intelligence Module writes only to `financial_intelligence` schema |
| Tenant Isolation | `company_id` in JWT → Application Layer → Repository WHERE clause → PostgreSQL RLS (4-layer enforcement) |

---

## IMPLEMENTATION SEQUENCE

```
Phase 0   Infrastructure Foundation       (Node, Express, PostgreSQL, Drizzle, audit writer, outbox)
  ↓
Phase 1   Tenant Module                   (company provisioning, lifecycle, configuration)
  ↓
Phase 2   Identity Module                 (auth, JWT, RBAC, user management)
  ↓
Phase 3   Operational Module              (clients, sites, jobs, workers, shifts, scheduling)
  ↓
Phase 4   Review Centre Module            (submissions, approvals, rejections, corrections)
  ↕ Phase 5a parallel: Inventory & Asset Module
Phase 5   Financial Normalization Module  (financial records, corrections, mini-ledger, payroll)
  ↓
Phase 6   Accounting Integration Module   (sync, reconciliation, exceptions, controls)
  ↕ Phase 6a parallel: Client Portal Module
  ↕ Phase 6b parallel: Financial Intelligence Module
Phase 7   Intelligence & Automation Module (automation, workflows, notification centre, activity feed)
  ↓
Phase 8   Reporting & Analytics Module    (reports, exports, operational analytics)
  ↓
Phase 9   Production Hardening            (RLS, security audit, performance testing, OpenAPI docs)
```

**Detail:** BACKEND_IMPLEMENTATION_ROADMAP.md

---

## ARCHITECTURE DOCUMENTS INDEX

| Document | Version | Contents |
|---|---|---|
| **BACKEND_ARCHITECTURE_SUMMARY.md** | **2.0** | This document — master summary |
| BACKEND_DOMAIN_ARCHITECTURE.md | 2.0 | 11 bounded contexts, context map, aggregate ownership, dependency direction |
| BACKEND_LAYERING_ARCHITECTURE.md | 1.0 | Four-layer model, responsibilities, forbidden interactions |
| BACKEND_SERVICE_ARCHITECTURE.md | 2.0 | Modular monolith, 11 module definitions, Notification Centre sub-module |
| BACKEND_EVENT_ARCHITECTURE.md | 2.0 | Event strategy, full catalogue (incl. Tenant + Financial Intelligence events), subscriber registry |
| BACKEND_DATA_ARCHITECTURE.md | 2.0 | 13 schemas, aggregate ownership, write/read models, transaction boundaries |
| BACKEND_AUTH_ARCHITECTURE.md | 2.0 | JWT auth, tenant status check on login, RBAC, permission matrix |
| BACKEND_MULTITENANCY_ARCHITECTURE.md | 2.0 | Tenant Context ownership, row-level isolation, tenant lifecycle |
| BACKEND_API_ARCHITECTURE.md | 1.0 | Domain-driven routes, versioning, validation, pagination, rate limiting |
| BACKEND_INFRASTRUCTURE_ARCHITECTURE.md | 1.0 | Workers, queues, scheduler, integration pipeline, file processing |
| **BACKEND_DOCUMENT_INTELLIGENCE_ARCHITECTURE.md** | **2.0** | AI Limitations Covenant, processing pipeline stages, security boundaries |
| BACKEND_OBSERVABILITY_ARCHITECTURE.md | 1.0 | Audit, logging, telemetry, financial mutation monitoring |
| BACKEND_IMPLEMENTATION_ROADMAP.md | 1.0 | Dependency-ordered implementation sequence |
