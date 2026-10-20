# THE LEDGER — PHASE 0 SPECIFICATION — INFRASTRUCTURE FOUNDATION

Version: 0.2 (draft) — 0.2 applies PM review of 33d9b6b, findings A–G
Status: DRAFT — awaiting PM review and the owner checkpoint
Date: October 20, 2026
Author: `backend-architect`
Branch: `agent/backend-architect/phase-0-spec` (from `backend` @ b6ab5be)
Implements: `BACKEND_IMPLEMENTATION_ROADMAP.md` v2.1, Phase 0
Implementer: `backend-platform-engineer` · Gate tests: `backend-test-engineer`

This specification follows the Phase Specification Template in `BACKEND_AGENT_ROSTER.md` v1.1. All paths are relative to the app folder (`The-Ledger/`). Identifiers used below:

- `S-nn` — scope items (section 1)
- `T-n` — tables (section 3)
- `PS-nn` — platform services (section 5)
- `G0-nn` — gate tests (section 9)
- `OQ-nn` — open questions for the owner checkpoint (section 12)

Phase 0 has no business domain. Where the template asks about domain concepts (aggregates, approval authority, audit entry types), this specification answers for the platform: the shared types, the records the platform owns, and the guarantees every later module relies on.

---

## 1. SCOPE

### 1.1 Included

Every item below is taken from the Phase 0 "Includes" list of the roadmap. Nothing is added.

| ID | Roadmap item | Delivered as |
|---|---|---|
| S-01 | Directory layout: one directory per module under `server/modules/<module>/` with `domain/`, `application/`, `infrastructure/`, `api/` and `index.ts` | `server/platform/` (platform code), `server/modules/registry.ts` (empty module registry), the module layout and import rules fixed in this specification (§4.8), and a gate test that enforces them on every later phase (G0 boundary tests, §9). Phase 0 creates no module directories — the first is `server/modules/tenant/` in Phase 1 |
| S-02 | Environment configuration loader with validation (fail fast on missing variables) | `server/platform/config/env.ts` (§4.6, §5) |
| S-03 | PostgreSQL connection and Drizzle setup; committed SQL migrations (`drizzle-kit generate`) | `server/platform/db/client.ts`, `server/platform/db/migrate.ts`, `drizzle.config.ts`, `migrations/` (§3.6) |
| S-04 | Schema-per-module convention in Drizzle (`pgSchema('tenant')`, …) | `server/platform/db/schema/` and the convention in §3.1 |
| S-05 | Unit of Work / transaction helper shared by all Application Layer use cases | `server/platform/db/unit-of-work.ts` (§4.4, §5) |
| S-06 | Middleware: request ID, structured JSON logging (no request/response bodies, no financial amounts), global error handler with the API error envelope | `server/platform/http/`, `server/platform/logging/`, `server/platform/errors/` (§4.7, §5, §6) |
| S-07 | Replace the current request logger, which prints whole JSON response bodies | Removal of the logger in `server/index.ts` lines 25–60 (§10) |
| S-08 | `GET /health` | `server/platform/http/health.ts` (§6) |
| S-09 | JWT utilities (sign, verify, claims) for the platform and portal tokens | `server/platform/auth/jwt.ts`, `server/platform/auth/keys.ts` (§4.3, §5) |
| S-10 | Tenant context middleware (extract `company_id` from the token; required parameter on every use case) | `server/platform/auth/tenant-context.ts`, `server/platform/db/tenant-scope.ts` (§4.1, §4.2, §5) |
| S-11 | `AuditWriter.append()` writing to `audit.audit_entries` inside the caller's transaction; database grants with INSERT and SELECT only | T-1, `server/platform/audit/audit-writer.ts`, grant migration (§3.2, §3.5) |
| S-12 | Transactional outbox: `intelligence.event_outbox`, outbox writer, delivery worker (claim lock, retry with backoff, dead letter), `intelligence.event_log` | T-2, T-3, `server/platform/events/` (§3.3, §3.4, §4.5, §5) |
| S-13 | In-process subscriber registry for the event bus | `server/platform/events/subscriber-registry.ts` (§4.5) |
| S-14 | Worker process entry point (separate from the API server process) | `server/worker.ts` (§5) |
| S-15 | Test framework: unit tests and API integration tests against a dedicated test database | `vitest.config.ts`, `tsconfig.test.json`, the test-database guard, `server/tests/support/` (§5, §9) |

### 1.2 Excluded

| Not in Phase 0 | Where it belongs | Source |
|---|---|---|
| `tenant` schema, `tenant.companies` and the `company_id` foreign keys | Phase 1 (see §3.1 for how Phase 0 handles the missing table) | Roadmap Phase 1 |
| Login, refresh, logout, password reset, refresh-token storage, `bcryptjs` | Phase 2 | Roadmap Phase 2; D-14 |
| Coarse RBAC route middleware (`requireRole`) and `UserContext` resolution | Phase 2 | Roadmap Phase 2 |
| Removal of `passport`, `passport-local`, `express-session`, `memorystore`, `connect-pg-simple` | Phase 2 — "removed once JWT auth lands". Phase 0 leaves these packages and their `@types/*` in `package.json`, unused | D-14 |
| Checking that a tenant is active on each request | Phase 1/2 (OQ-12) | BACKEND_AUTH_ARCHITECTURE.md, Authentication Flow 2a |
| PostgreSQL Row Level Security (including the audit table's "RLS prevents any write except INSERT") | Phase 9 | Roadmap Phase 9; BACKEND_DATA_ARCHITECTURE.md, Audit Immutability Enforcement |
| Rate limiting (in-process token bucket) and `Idempotency-Key` handling | Phase 9 | Roadmap Phase 9; D-10 |
| `GET /health/detailed`, `/metrics`, exception monitoring | Phase 9 | Roadmap Phase 9 |
| OpenAPI document at `/api/docs` | Phase 9 | Roadmap Phase 9 |
| Full graceful shutdown of both process types | Phase 9 (Phase 0 only stops the worker loop cleanly so tests can stop it, §5) | Roadmap Phase 9 |
| `FileStorage` interface and local-disk adapter | Phase 4 — **PM ruling (October 20, 2026): Phase 4 per the roadmap.** The roadmap's Phase 0 Includes list does not contain it and Phase 4's does; the roadmap outranks the PM brief and the platform-engineer definition. `server/platform/storage/` stays reserved for it (OQ-01, closed) | Roadmap Phase 4 ("File upload via the `FileStorage` interface (per D-11)"); D-11 |
| Production file storage adapter | Phase 9 | D-11 |
| The other five worker types (sync, notification delivery, scheduled evaluation, report distribution, reconciliation) and the scheduler | Phases 6, 7, 8 | BACKEND_INFRASTRUCTURE_ARCHITECTURE.md, Worker Types |
| Audit query service and `/api/v1/audit/` | No phase lists it (OQ-11) | BACKEND_INFRASTRUCTURE_ARCHITECTURE.md, Audit Query Path |
| Outbox retention/archival after 7 days; requeue of dead-lettered events | No phase lists it (OQ-10) | BACKEND_DATA_ARCHITECTURE.md, Event Outbox Table; BACKEND_INFRASTRUCTURE_ARCHITECTURE.md, Worker Resilience |
| CORS configuration | Not needed while the frontend is served from the same origin; no phase lists it | BACKEND_API_ARCHITECTURE.md, API Security Standards |
| Any business table, use case, route, event type or audit entry type | Phases 1–8 | — |
| Any change to `client/`, the Playwright suite, `deploy/replit-public` or any document | — | Roster, Folder Ownership; D-13 |

### 1.3 Roadmap gate (to be proven in §9)

1. Build and typecheck pass
2. An audit write that fails rolls back its whole transaction (test)
3. An event written in a rolled-back transaction is never delivered (test)
4. A redelivered event is handled once by an idempotent subscriber (test)
5. Application role cannot UPDATE or DELETE audit entries (test against the database) — read as both runtime roles, `ledger_app` and `ledger_worker` (§3.5)
6. No log line contains a request or response body (test)

Doctrines verified at this gate (roadmap, Doctrine Verification by Phase): audit immutability; transactional outbox integrity; no sensitive data in logs.

---

## 2. SOURCES

### 2.1 Doctrine and decisions

| Source | Section | Used for |
|---|---|---|
| `docs/ai-context/LEDGER_CANONICAL_CONTEXT.md` | Audit Doctrine | Required audit fields (who, what, when, previous value, new value, source object, destination object, external reference) → T-1 |
| same | Event Bus Doctrine | The bus is informational; it never approves or creates financial records → subscriber actors are always `system` (§4.1, §4.5) |
| same | Platform Lexicon | British English in every user-readable string (error messages, §6) |
| `BACKEND_AGENT_ROSTER.md` | Shared Rules — Doctrine | No request or response bodies, tokens, passwords or financial amounts in logs; audit entries never updated or deleted; every query, use case and event carries `company_id` |
| same | Folder Ownership | Who writes which file (§11) |
| `docs/domain/DOMAIN_MODEL_SUMMARY.md` (frozen) | Audit Requirements — Universal Audit Fields; Audit Immutability | T-1 columns; append-only |
| same | Domain Invariants 1, 6, 24 | `company_id` and `job_id` columns on T-1 (attribution); tenant scoping |

### 2.2 Architecture

| Document | Section | Used for |
|---|---|---|
| BACKEND_LAYERING_ARCHITECTURE.md | Layers 1–4; Cross-Cutting Concerns (Audit Logging, Tenant Isolation, Event Publishing) | Module layout and import rules (§4.8); audit written from the Application Layer through infrastructure; `company_id` resolved in the API Layer and required by every use case; "missing `company_id` in any query is a runtime error" (§4.2) |
| BACKEND_SERVICE_ARCHITECTURE.md | Architecture Decision (module boundaries enforced by directory structure and `index.ts`); Inter-Module Communication; Event Bus Guarantee; Module Boundary Rules 1–7 | §4.8 and the boundary gate tests |
| BACKEND_DATA_ARCHITECTURE.md | Persistence Strategy (13 schemas, Drizzle); Aggregate Roots (EventOutbox, EventLog, AuditEntry); Write Models; Transaction Boundaries; Audit Storage Requirements; Event Storage Requirements | T-1, T-2, T-3; §5 transaction boundaries |
| BACKEND_EVENT_ARCHITECTURE.md | Event Naming Standard; Event Persistence Strategy (outbox record structure); Event Lifecycle; Event Payload Standard; Subscriber Registry; Audit Log vs Event Log | T-2, T-3; envelope (§4.5); subscriber registry |
| BACKEND_INFRASTRUCTURE_ARCHITECTURE.md | Libraries and Tooling (D-14); Database Hosting (D-12); Process Model; Application Configuration; Outbox Delivery Worker; Worker Resilience; Queue Architecture; Audit Write Path; Audit Table Permissions | Packages, environment variables, worker behaviour, grants |
| BACKEND_OBSERVABILITY_ARCHITECTURE.md | Logging Strategy (levels, structure, what is not logged, correlation); System Monitoring (`GET /health`) | §4.7 logging; §6 health |
| BACKEND_API_ARCHITECTURE.md | API Types (base paths); Error Handling Strategy (envelope, status codes); Validation Strategy; Pagination Strategy; API Security Standards (1 MB body cap) | §6 |
| BACKEND_AUTH_ARCHITECTURE.md | Access Token Claims; Portal Token Claims; Token Storage; Level 1 authorisation flow | §4.3 JWT claims; tenant middleware (no login) |
| BACKEND_MULTITENANCY_ARCHITECTURE.md | Data Isolation Requirements, Layers 1–4; Tenant Isolation Enforcement Checklist | §4.2 tenant scoping; Layer 4 (RLS) deferred to Phase 9 |

### 2.3 Approved decisions applied

| Decision | How Phase 0 applies it |
|---|---|
| **D-10** No Redis | No Redis client package is added. The outbox, its locks and its retry schedule live in PostgreSQL (T-2). Phase 0 has no rate limiter or cache. A gate test fails if a Redis client appears in `package.json` |
| **D-11** File storage | Not built in Phase 0: the roadmap places `FileStorage` in Phase 4 and the phase table lists D-11 against Phases 4 and 9 only. Phase 0 reserves `server/platform/storage/` for it. PM ruling: Phase 4 per the roadmap (OQ-01, closed) |
| **D-12** Hosted PostgreSQL for dev and test | `DATABASE_URL` (development) and `DATABASE_URL_TEST` (tests) point at separate databases on a hosted PostgreSQL project. Tests refuse to run unless the database name in every test URL ends in `_test` (§4.6). Only synthetic data is written. Phase 0 adds variables the decision does not name — the migration-owner URLs and the worker-role URLs — because the grant guarantees need separate database roles (§3.5, OQ-03). Nothing in the design depends on a particular hosting provider |
| **D-14** Tooling | `vitest` and `supertest` (tests), `jose` (JWT, ES256 platform key pair and a separate portal key — §4.3, OQ-02), `pino` (logging), `drizzle-kit generate` with committed SQL migrations; `drizzle-kit push` is removed from the scripts. `bcryptjs` is not installed in Phase 0 because nothing hashes a password until Phase 2. `passport`, `passport-local`, `express-session`, `memorystore`, `connect-pg-simple` stay until Phase 2 |
| **D-16** CLAUDE.md backend instruction | Already applied: `CLAUDE.md` "CURRENT PLATFORM STATE" carries the approved paragraph. Phase 0 is backend work on a branch from `main` (via `backend`); the frontend stays mock-driven. Phase 0 changes no frontend behaviour (§10) |

### 2.4 Code read

`server/index.ts`, `server/routes.ts`, `server/storage.ts`, `server/static.ts`, `server/vite.ts`, `shared/schema.ts`, `drizzle.config.ts`, `script/build.ts`, `package.json`, `tsconfig.json`, `playwright.config.ts`, `vite.config.ts`, `.gitignore`, `client/src/App.tsx` (route table), `client/src/lib/queryClient.ts`. Differences are listed in §10.

---

## 3. DATA MODEL

### 3.1 Conventions every schema follows (from Phase 0 on)

1. **Schema per module.** Each module declares its tables in its own PostgreSQL schema with Drizzle `pgSchema('<schema>')`, in `server/modules/<module>/infrastructure/schema.ts`. Schema names are the 13 in BACKEND_DATA_ARCHITECTURE.md, Persistence Strategy. Nothing is created in `public`.
2. **Phase 0 creates two schemas**: `audit` (T-1) and `intelligence` (T-2, T-3). The Intelligence & Automation module owns the rest of `intelligence` from Phase 7; it adds its tables to the same schema by importing the `intelligenceSchema` handle from `server/platform/index.ts`, so the schema is declared once. The outbox and event log tables stay platform-owned (roster, Folder Ownership; platform-engineer definition).
3. **Keys.** Primary keys are `uuid` with `DEFAULT gen_random_uuid()`; the application may supply its own UUID. No serial primary keys.
4. **Timestamps** are `timestamptz`, written and returned in UTC.
5. **Names** are `snake_case` in the database and `camelCase` in TypeScript (Drizzle column mapping).
6. **`company_id`** is `uuid NOT NULL` on every tenant table and on all three Phase 0 tables.
7. **The `company_id` foreign key in Phase 0.** `tenant.companies` does not exist until Phase 1, so Phase 0 cannot declare `REFERENCES tenant.companies(company_id)`. Phase 0 tables carry `company_id uuid NOT NULL` with no foreign key. Phase 1 must add, in a platform migration, `FOREIGN KEY (company_id) REFERENCES tenant.companies(company_id) ON DELETE RESTRICT` to T-1, T-2 and T-3 (BACKEND_MULTITENANCY_ARCHITECTURE.md, Tenant Ownership: "The `company_id` on every record in every schema is a foreign key to `tenant.companies.company_id`"). This is safe to add later because Phase 0 writes rows only in the test database, which is rebuilt on every test run (§4.6); the development database holds no Phase 0 rows. Which job makes that change is OQ-04.
8. **Grants are explicit.** Every migration that creates a table also grants the runtime roles (§3.5) exactly the privileges the table needs, column by column where only some columns may change. Privileges every process needs go to `ledger_app` (the worker inherits them); privileges only the worker may use go to `ledger_worker`. No `ALTER DEFAULT PRIVILEGES`, so a new table is unreachable by the application until its migration grants access.
9. **No hard deletes.** No runtime role is ever granted `DELETE` or `TRUNCATE` on a Phase 0 table (D-05 applies to the API from Phase 3; the platform tables follow it from the start).
10. **Migrations** are generated with `drizzle-kit generate` into `migrations/` and committed. Grants and anything else Drizzle cannot express go in custom migrations created with `drizzle-kit generate --custom --name=<name>`. A committed migration is never edited (roster, Folder Ownership). PostgreSQL 16 or later is assumed (`gen_random_uuid()` built in, identity columns, column-level grants).

### 3.2 T-1 `audit.audit_entries`

Source: BACKEND_DATA_ARCHITECTURE.md, Audit Entry Structure; DOMAIN_MODEL_SUMMARY.md, Universal Audit Fields; canonical context, Audit Doctrine.

Append-only and permanent. **Every column is immutable**: the runtime roles can only INSERT and SELECT (§3.5).

| Column | Type | Null | Default | Constraint / notes | Source field |
|---|---|---|---|---|---|
| `audit_id` | `uuid` | no | `gen_random_uuid()` | Primary key | `audit_id` |
| `sequence_no` | `bigint` | no | `GENERATED ALWAYS AS IDENTITY` | `UNIQUE`. Insertion order; the stable sort and cursor key for later audit queries (entries in one transaction share `occurred_at`) | — (added, §10) |
| `company_id` | `uuid` | no | — | Taken from the Unit of Work's tenant context, never from the caller's entry (§4.4). Foreign key added in Phase 1 (§3.1.7) | `company_id` |
| `entry_type` | `text` | no | — | `CHECK (entry_type ~ '^[a-z][a-z0-9_]{2,99}$')` — the domain audit entry type, e.g. `timesheet_approved` | `entry_type` / "what" |
| `actor_id` | `uuid` | yes | — | The user (or portal account) who acted; `NULL` only for the system actor | `actor_id` / "who" |
| `actor_role` | `text` | no | — | `CHECK (actor_role IN ('ceo','pm','worker','client','system'))` and `CHECK ((actor_role = 'system') = (actor_id IS NULL))` | `actor_role` |
| `occurred_at` | `timestamptz` | no | `now()` | Set by the database (transaction time). `AuditWriter` never sends it | `occurred_at` / "when" |
| `source_object_type` | `text` | no | — | `CHECK (length(source_object_type) BETWEEN 1 AND 100)` | `source_object_type` |
| `source_object_id` | `uuid` | no | — | — | `source_object_id` |
| `destination_object_type` | `text` | yes | — | `CHECK ((destination_object_type IS NULL) = (destination_object_id IS NULL))` | `destination_object_type` |
| `destination_object_id` | `uuid` | yes | — | see above | `destination_object_id` |
| `job_id` | `uuid` | yes | — | Required by the domain when the entry is financially relevant; enforced by the writing module (OQ-05) | `job_id` |
| `site_id` | `uuid` | yes | — | — | `site_id` |
| `client_id` | `uuid` | yes | — | — | `client_id` |
| `previous_value` | `jsonb` | yes | — | — | `previous_value` |
| `new_value` | `jsonb` | yes | — | — | `new_value` |
| `external_reference` | `text` | yes | — | e.g. accounting provider reference | `external_reference` |
| `metadata` | `jsonb` | no | `'{}'::jsonb` | `AuditWriter` adds `requestId` (API) or `runId` (worker) from the execution context | `metadata` |
| `causation_event_id` | `uuid` | yes | — | The `event_id` of the event whose subscriber wrote this entry. Set by `AuditWriter` from the execution context, never by the caller (§4.1). No foreign key: the triggering event's `event_log` row is written only after its subscribers finish, and outbox rows are not permanent | — (added, §10) |
| `causation_actor_id` | `uuid` | yes | — | The nearest human actor in the causal chain: the triggering event's `actor_id`, or — if that event was itself written by a subscriber — its `causation_actor_id`. `NULL` when no human is in the chain | — (added, §10) |

Causation constraints:

- `CHECK (causation_event_id IS NULL OR actor_role = 'system')` — only system work can be caused by an event.
- `CHECK (causation_actor_id IS NULL OR causation_event_id IS NOT NULL)` — no causing actor without a causing event.

Together with `actor_role` these columns distinguish the three kinds of writer:

| Writer | `actor_role` | `actor_id` | `causation_event_id` | `causation_actor_id` |
|---|---|---|---|---|
| Human through the API (platform or portal token) | `ceo` / `pm` / `worker` / `client` | the user or portal account | `NULL` | `NULL` |
| Event subscriber (worker) | `system` | `NULL` | the triggering event | nearest human in the chain, or `NULL` |
| Script or scheduled job not triggered by an event (for example the D-15 provisioning script, Phase 7 scheduler) | `system` | `NULL` | `NULL` | `NULL` |

The D-15 provisioning script is a platform administrator acting outside the tenant model; whether its entries keep `actor_role = 'system'` or get their own actor role is for the Phase 1 specification (OQ-14). Until then it is the third row.

Indexes (each leads with `company_id`, because every audit read is tenant-scoped):

| Name | Columns | Why |
|---|---|---|
| `audit_entries_pkey` | `(audit_id)` | Primary key |
| `audit_entries_sequence_no_key` | `(sequence_no)` | Unique identity |
| `audit_entries_company_sequence_idx` | `(company_id, sequence_no)` | Tenant timeline, cursor pagination |
| `audit_entries_company_occurred_idx` | `(company_id, occurred_at)` | Time-range filter (Audit Trail View) |
| `audit_entries_company_source_idx` | `(company_id, source_object_type, source_object_id)` | History of one entity |
| `audit_entries_company_job_idx` | `(company_id, job_id) WHERE job_id IS NOT NULL` | Job audit trail (mini-ledger doctrine) |
| `audit_entries_company_causation_idx` | `(company_id, causation_event_id) WHERE causation_event_id IS NOT NULL` | Trace a record back to the event (and so the approval) that caused it (BACKEND_OBSERVABILITY_ARCHITECTURE.md, How Platform-Wide Traceability Is Preserved) |

Indexes for the actor and entry-type filters of the Audit Trail View are left to the phase that builds the audit query (OQ-11), because each index adds cost to every audit write.

### 3.3 T-2 `intelligence.event_outbox`

Source: BACKEND_EVENT_ARCHITECTURE.md, Event Outbox Record Structure and Event Payload Standard; BACKEND_INFRASTRUCTURE_ARCHITECTURE.md, Outbox Delivery Worker and Worker Resilience; BACKEND_DATA_ARCHITECTURE.md, Event Outbox Table.

One row per domain event, written in the same transaction as the state change. Envelope columns are immutable; delivery-state columns are changed only by the outbox worker.

| Column | Type | Null | Default | Constraint / notes | Mutable | Source field |
|---|---|---|---|---|---|---|
| `outbox_id` | `uuid` | no | `gen_random_uuid()` | Primary key | no | `outbox_id` |
| `event_id` | `uuid` | no | — | `UNIQUE`. The envelope `eventId`; the idempotency key subscribers may use (§7) | no | envelope `eventId` |
| `event_type` | `text` | no | — | `CHECK (event_type ~ '^[A-Z][A-Za-z0-9]{2,99}$')` — `{Noun}{PastTenseVerb}` in PascalCase | no | `event_type` |
| `event_version` | `text` | no | `'1.0'` | — | no | envelope `eventVersion` |
| `source_module` | `text` | no | — | `CHECK (source_module ~ '^[a-z][a-z_]{1,49}$')`, e.g. `review_centre` | no | `source_module` |
| `company_id` | `uuid` | no | — | From the Unit of Work's tenant context. Foreign key added in Phase 1 | no | `company_id` |
| `actor_id` | `uuid` | yes | — | From the execution context's actor; `NULL` for the system actor | no | envelope `actorId` |
| `source_object_type` | `text` | no | — | — | no | envelope `sourceObjectType` |
| `source_object_id` | `uuid` | no | — | — | no | envelope `sourceObjectId` |
| `payload` | `jsonb` | no | — | `CHECK (jsonb_typeof(payload) = 'object')` | no | `payload` |
| `causation_event_id` | `uuid` | yes | — | Set by `OutboxWriter` from the execution context when a subscriber writes this event (as T-1) | no | — (added, §10) |
| `causation_actor_id` | `uuid` | yes | — | Nearest human in the causal chain (as T-1) | no | — (added, §10) |
| `occurred_at` | `timestamptz` | no | `now()` | Transaction time of the state change | no | envelope `occurredAt` |
| `created_at` | `timestamptz` | no | `now()` | — | no | `created_at` |
| `status` | `text` | no | `'pending'` | `CHECK (status IN ('pending','processing','failed','delivered','dead_lettered'))` (§4.5) | yes | `status` |
| `retry_count` | `integer` | no | `0` | `CHECK (retry_count >= 0)`. Failed delivery attempts so far | yes | `retry_count` |
| `next_attempt_at` | `timestamptz` | no | `now()` | Earliest time the worker may claim the row | yes | — (backoff schedule) |
| `locked_at` | `timestamptz` | yes | — | Set when claimed | yes | `locked_at` (Worker Resilience) |
| `locked_by` | `text` | yes | — | Worker instance ID that holds the claim; used to fence late writes | yes | — (claim lock) |
| `delivered_subscribers` | `text[]` | no | `'{}'` | Names of subscribers that have already handled this event (§4.5) | yes | — (added, §10) |
| `last_error` | `text` | yes | — | Sanitised error summary, at most 1 000 characters, no payload values (§4.7) | yes | — |
| `delivered_at` | `timestamptz` | yes | — | — | yes | `delivered_at` |
| `dead_lettered_at` | `timestamptz` | yes | — | — | yes | — (dead letter) |

Table constraints:

- `CHECK ((status = 'processing') = (locked_at IS NOT NULL AND locked_by IS NOT NULL))`
- `CHECK (status <> 'delivered' OR delivered_at IS NOT NULL)`
- `CHECK (status <> 'dead_lettered' OR dead_lettered_at IS NOT NULL)`
- `CHECK (causation_event_id IS NULL OR actor_id IS NULL)` — an event caused by another event was written by system work (the outbox has no `actor_role`; a `NULL` `actor_id` is the system actor)
- `CHECK (causation_actor_id IS NULL OR causation_event_id IS NOT NULL)`

Indexes:

| Name | Columns | Why |
|---|---|---|
| `event_outbox_pkey` | `(outbox_id)` | Primary key |
| `event_outbox_event_id_key` | `(event_id)` | Unique envelope ID |
| `event_outbox_ready_idx` | `(next_attempt_at, created_at) WHERE status IN ('pending','failed')` | The worker's claim query touches only claimable rows |
| `event_outbox_processing_idx` | `(locked_at) WHERE status = 'processing'` | Stale-lock recovery |

Immutability of the envelope is enforced by the database: only `ledger_worker` has `UPDATE`, and only on the mutable columns listed above; the API's role `ledger_app` can insert and read outbox rows but not change them (§3.5).

### 3.4 T-3 `intelligence.event_log`

Source: BACKEND_DATA_ARCHITECTURE.md, Event Log Table; BACKEND_EVENT_ARCHITECTURE.md, Event Log (Permanent Record) and Audit Log vs Event Log.

Permanent, append-only history of delivered events. **Every column is immutable** (INSERT and SELECT only).

| Column | Type | Null | Default | Constraint / notes | Source field |
|---|---|---|---|---|---|
| `event_log_id` | `uuid` | no | `gen_random_uuid()` | Primary key | `event_log_id` |
| `event_id` | `uuid` | no | — | `UNIQUE` — at most one log row per event, even if an event is redelivered | `event_id` |
| `event_type` | `text` | no | — | — | `event_type` |
| `event_version` | `text` | no | — | — | — (added, §10) |
| `source_module` | `text` | no | — | Event log is "queryable by … module" | — (added, §10) |
| `company_id` | `uuid` | no | — | Foreign key added in Phase 1 | `company_id` |
| `actor_id` | `uuid` | yes | — | `NULL` for system events | `actor_id` |
| `source_object_type` | `text` | no | — | — | `source_object_type` |
| `source_object_id` | `uuid` | no | — | — | `source_object_id` |
| `payload` | `jsonb` | no | — | Copied from the outbox row unchanged | `payload` |
| `causation_event_id` | `uuid` | yes | — | Copied from the outbox row | — (added, §10) |
| `causation_actor_id` | `uuid` | yes | — | Copied from the outbox row | — (added, §10) |
| `occurred_at` | `timestamptz` | no | — | Copied from the outbox row | `occurred_at` |
| `logged_at` | `timestamptz` | no | `now()` | — | `logged_at` |

Constraints: the two causation checks of T-2.

Indexes:

| Name | Columns | Why |
|---|---|---|
| `event_log_pkey` | `(event_log_id)` | Primary key |
| `event_log_event_id_key` | `(event_id)` | One log row per event |
| `event_log_company_occurred_idx` | `(company_id, occurred_at)` | Company and time range |
| `event_log_company_type_idx` | `(company_id, event_type, occurred_at)` | By event type |
| `event_log_company_source_idx` | `(company_id, source_object_type, source_object_id)` | By source object |
| `event_log_company_causation_idx` | `(company_id, causation_event_id) WHERE causation_event_id IS NOT NULL` | Follow an event chain forwards |

The event log is not a store for sensitive values (BACKEND_EVENT_ARCHITECTURE.md, Audit Log vs Event Log: "Sensitive fields: No (operational metadata only)"). Because the payload is copied verbatim, event payloads must carry identifiers and operational metadata, not financial amounts. Phase 0 cannot enforce this for payloads designed later; OQ-07 asks the owner to confirm it as a rule for every later specification.

### 3.5 Database roles and grants

Source: BACKEND_INFRASTRUCTURE_ARCHITECTURE.md, Audit Table Permissions ("enforced at the database permission level, not only in application code") and Process Model (two process types); BACKEND_DATA_ARCHITECTURE.md, Audit Immutability Enforcement.

A PostgreSQL table owner always holds every privilege on its table, so "the application role cannot UPDATE or DELETE audit entries" holds only if no runtime process connects as the owner. And because the API and the worker are separate processes with different jobs, giving them one role would let an API bug change delivery state, for example marking events `delivered` so they are silently never delivered. Phase 0 therefore uses three roles:

| Role | Used by | Privileges (Phase 0 tables) | Connection variables |
|---|---|---|---|
| Owner role (the database owner on the hosted project) | `npm run db:migrate`, `drizzle-kit`, the test harness rebuild step | Owns every schema, table and sequence | `DATABASE_MIGRATION_URL` (development), `DATABASE_MIGRATION_URL_TEST` (tests) |
| `ledger_app` | The API process | `audit.audit_entries`: SELECT, INSERT · `intelligence.event_outbox`: SELECT, INSERT · `intelligence.event_log`: SELECT | `DATABASE_URL` (development), `DATABASE_URL_TEST` (tests) |
| `ledger_worker` | The worker process | Everything `ledger_app` has (it is a member of `ledger_app`, with inherit), plus `intelligence.event_outbox`: UPDATE on the delivery-state columns only · `intelligence.event_log`: INSERT | `DATABASE_WORKER_URL` (development), `DATABASE_WORKER_URL_TEST` (tests) |

Why the worker inherits `ledger_app`: subscribers do module work (for example Phase 2 creates the first CEO user from `TenantProvisioned`), and each module grants its table privileges to `ledger_app` (§3.1.8). Membership means a module never has to grant twice, and only privileges that only the worker should hold are granted to `ledger_worker` directly. The API role cannot use the worker's privileges: membership runs one way.

Considered and not chosen: one shared role. It is simpler (one variable, one SQL step) but leaves the API able to rewrite every outbox row's status, retry count and lock, and to write `event_log` rows for events that were never delivered. Both break outbox integrity, which is one of the three doctrines this gate verifies.

**Owner action before the first migration** (one-off per database server; recorded for the owner checkpoint, OQ-03). Create both login roles **in SQL as the owner**, so they have exactly the attributes listed and no memberships the hosting console might add by default:

```sql
CREATE ROLE ledger_app    LOGIN PASSWORD '<generated, stored only in the environment>'
  NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS;
CREATE ROLE ledger_worker LOGIN PASSWORD '<generated, different, stored only in the environment>'
  NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS;
GRANT ledger_app TO ledger_worker WITH INHERIT TRUE;          -- PostgreSQL 16 syntax
GRANT CONNECT ON DATABASE <dev database>            TO ledger_app, ledger_worker;
GRANT CONNECT ON DATABASE <test database ending _test> TO ledger_app, ledger_worker;
```

**Grant migration** — a custom migration `migrations/0001_platform_grants.sql`, applied after the table migration. It first fails with a clear message if either role is missing or if `ledger_worker` is not a member of `ledger_app`, then:

```sql
REVOKE ALL ON SCHEMA audit, intelligence FROM PUBLIC;
REVOKE ALL ON ALL TABLES IN SCHEMA audit, intelligence FROM PUBLIC;
GRANT USAGE ON SCHEMA audit, intelligence TO ledger_app;      -- inherited by ledger_worker

-- T-1: append-only, both processes
GRANT SELECT, INSERT ON audit.audit_entries TO ledger_app;

-- T-2: the writing use case inserts (either process); only the worker changes delivery state
GRANT SELECT, INSERT ON intelligence.event_outbox TO ledger_app;
GRANT UPDATE (status, retry_count, next_attempt_at, locked_at, locked_by,
              delivered_subscribers, last_error, delivered_at, dead_lettered_at)
  ON intelligence.event_outbox TO ledger_worker;

-- T-3: written only by the worker after delivery; readable by both
GRANT SELECT ON intelligence.event_log TO ledger_app;
GRANT INSERT ON intelligence.event_log TO ledger_worker;
```

Sequence privilege: `audit_entries.sequence_no` is an identity column. PostgreSQL draws identity values through an internal next-value expression that does not check privileges on the backing sequence (unlike `serial`, which needs `USAGE`), so no sequence grant is expected. The gate tests insert as `ledger_app` and settle it; if an insert is refused, the migration adds `USAGE` on that sequence to `ledger_app` and nothing more.

`event_log` writes use `INSERT … ON CONFLICT (event_id) DO NOTHING`. Per the PostgreSQL `INSERT` documentation, extra privileges are needed only for `ON CONFLICT DO UPDATE` (UPDATE on the `SET` columns and SELECT on columns it reads) and for `RETURNING`; `DO NOTHING` needs only INSERT. `ledger_worker` also inherits SELECT, so either reading holds.

What no runtime role may have on any Phase 0 table: `UPDATE` (except `ledger_worker` on the listed outbox columns), `DELETE`, `TRUNCATE`, `REFERENCES`, `TRIGGER`, ownership, `CREATE` on either schema, superuser, `BYPASSRLS`, or membership of any role other than `ledger_worker` → `ledger_app` (so, for example, not `pg_write_all_data`). Neither has access to the `drizzle` schema where the migration journal lives. All of this is gate-tested (§9).

Later phases follow the same pattern: each module migration grants `ledger_app` exactly what its tables need (financial record tables, for example, get `UPDATE (status)` only — DOMAIN_MODEL_SUMMARY.md, Invariant 2), and grants `ledger_worker` directly only what must be closed to the API.

### 3.6 Migration files and configuration

| File | Content |
|---|---|
| `migrations/0000_platform_tables.sql` | Generated by `drizzle-kit generate --name=platform_tables`: `CREATE SCHEMA audit`, `CREATE SCHEMA intelligence`, T-1, T-2, T-3 with constraints and indexes |
| `migrations/0001_platform_grants.sql` | Custom migration (`drizzle-kit generate --custom --name=platform_grants`): role check and grants (§3.5) |
| `migrations/meta/` | Drizzle journal and snapshots, generated, committed |
| `drizzle.config.ts` | `dialect: 'postgresql'`; `schema`: `./server/platform/db/schema/*.ts` and `./server/modules/*/infrastructure/schema.ts`; `out: './migrations'`; `schemaFilter: ['audit', 'intelligence']` (each later phase adds its schema); `dbCredentials.url` from `DATABASE_MIGRATION_URL`, failing with the variable's name if it is missing |

`shared/schema.ts` (the Replit starter's `public.users` table) is deleted so it can never produce a migration (§10).

---

## 4. DOMAIN MODEL (PLATFORM MODEL)

Phase 0 has no aggregates, value objects or state machines from a frozen domain. It defines the platform types every module uses and one platform state machine (the outbox record). All types below are exported from `server/platform/index.ts`; nothing else under `server/platform/` may be imported by a module (§4.8).

### 4.1 Tenant context and actor

Source: BACKEND_LAYERING_ARCHITECTURE.md, Tenant Isolation; BACKEND_MULTITENANCY_ARCHITECTURE.md, Layers 1–3; BACKEND_AUTH_ARCHITECTURE.md, Roles and Identity Model; canonical context, Event Bus Doctrine.

```ts
type CompanyId = string & { readonly __brand: 'CompanyId' };   // a UUID
type PlatformRole = 'ceo' | 'pm' | 'worker';

type Actor =
  | { kind: 'user';        userId: string; role: PlatformRole }            // platform token
  | { kind: 'portal_user'; portalAccountId: string; clientId: string;
      role: 'client' }                                                     // portal token
  | { kind: 'system';      component: string };                            // worker, subscriber, script

interface Causation {
  readonly eventId: string;              // the event whose subscriber is running
  readonly actorId: string | null;       // nearest human actor in the causal chain
}

interface TenantContext   { readonly companyId: CompanyId }
interface ExecutionContext extends TenantContext {
  readonly actor: Actor;
  readonly causation: Causation | null;  // set only for subscriber work (below)
  readonly requestId?: string;           // API requests
  readonly runId?: string;               // worker runs (§4.7)
}
```

How contexts are created. `ExecutionContext` objects carry a private brand, so only platform factories can produce one; a module cannot build one from an object literal.

| Factory | Exported from `server/platform/index.ts` | Produces | `causation` |
|---|---|---|---|
| Platform-token middleware | — (runs on every `/api/v1` request) | `actor.kind = 'user'`, `companyId` from the token | `null` |
| Portal-token middleware | — (runs on every `/portal/v1` request) | `actor.kind = 'portal_user'` | `null` |
| `createSystemContext(companyId, component)` | yes — for scripts and, later, the scheduler | `actor.kind = 'system'` | `null` |
| Worker subscriber context | **no** — internal to `server/platform/events/` | `actor.kind = 'system'`, `component` = subscriber name, `companyId` from the outbox row | `{ eventId: row.event_id, actorId: row.actor_id ?? row.causation_actor_id }` |

So causation is recorded automatically and cannot be set, cleared or forged by module code: `AuditEntryInput` and `DomainEventInput` have no causation fields, and the only context with causation is the one the worker builds from the claimed row. `AuditWriter` and `OutboxWriter` copy `causation.eventId` and `causation.actorId` into `causation_event_id` and `causation_actor_id` (§3.2–§3.4). Following `causation_event_id` through `event_log` and the audit table leads from any subscriber-written record back to the human action that started the chain (BACKEND_OBSERVABILITY_ARCHITECTURE.md, How Platform-Wide Traceability Is Preserved).

Rules:

- A `CompanyId` is created only by `toCompanyId(value)`, which throws `MissingTenantContextError` unless the value is a UUID. The tenant middleware creates it from a verified token claim; the worker creates it from an outbox row. There is no default company and no way to construct an empty one.
- Every use case takes an `ExecutionContext` (or at least a `TenantContext`) as a required parameter. Omitting it is a TypeScript error; passing `undefined` or a non-UUID from untyped code is a runtime `MissingTenantContextError` (BACKEND_LAYERING_ARCHITECTURE.md: "Missing `company_id` in any query is a runtime error, not a silent bypass").
- The actor maps to the audit columns as: `user` → (`actor_id` = `userId`, `actor_role` = `role`); `portal_user` → (`portalAccountId`, `client`); `system` → (`NULL`, `system`).
- Event subscribers always run with a `system` actor (`component` = the subscriber name). The platform provides `isHumanActor(actor)`; later phases use it to refuse system actors on every approval path (Approval Doctrine; Invariant 8). `causation.actorId` is a record of who started the chain, **never an authority**: no approval or authorisation check may treat it as the acting user. Phase 0 itself has no approval path.
- **Platform types stop at the Application Layer.** Domain code uses plain `string` for company, user and object IDs. The Application Layer receives branded types from the platform (`CompanyId`, `ExecutionContext`) and passes their values into domain objects as strings; a `CompanyId` is assignable to `string`, so no conversion is needed. A shared types-only kernel that domain code could import was considered and not chosen. BACKEND_LAYERING_ARCHITECTURE.md, Layer 1 says "Domain Layer → nothing (it is the foundation)", and a kernel shared across modules would also couple every module's domain to one file (Module Boundary Rule 5: "The Domain Layer of a module is private to that module"). The cost is small: the brand guards use-case entry points and repository scoping, and both belong to the Application and Infrastructure Layers. Value objects a domain needs (for example a module's own `Money`) are defined in that module's `domain/`.

### 4.2 Tenant-scoped data access

Source: BACKEND_MULTITENANCY_ARCHITECTURE.md, Layer 3 and the Enforcement Checklist.

- `tenantScope(table, ctx)` returns the Drizzle condition `eq(table.companyId, ctx.companyId)`; `tenantWhere(table, ctx, ...conditions)` returns `and(tenantScope(table, ctx), ...conditions)`. Both only accept tables that have a `companyId` column (a type error otherwise) and call `toCompanyId` on the context value, so a missing tenant fails at runtime too.
- Repositories in every later phase build their `WHERE` clauses with `tenantWhere`. The platform cannot make Drizzle reject a hand-written query without it; that remains a review item and a cross-tenant gate test in every phase that owns tenant data.

### 4.3 JWT claims

Source: BACKEND_AUTH_ARCHITECTURE.md, Access Token Claims, Portal Token Claims, Session Security; D-14; BACKEND_INFRASTRUCTURE_ARCHITECTURE.md, Required environment variables.

| | Platform access token | Portal access token |
|---|---|---|
| Algorithm | ES256 (P-256), `jose` | HS256, `jose` (OQ-02) |
| Signing key | `JWT_PRIVATE_KEY` (PKCS#8 PEM) | `PORTAL_JWT_SECRET` (at least 32 bytes) |
| Verification key | `JWT_PUBLIC_KEY` (SPKI PEM) | `PORTAL_JWT_SECRET` |
| Lifetime | 15 minutes | 15 minutes |
| `iss` | `the-ledger` | `the-ledger` |
| `aud` | `ledger-platform` | `ledger-portal` |
| `sub` | user ID (UUID) | portal account ID (UUID) |
| `company_id` | UUID | UUID |
| `client_id` | — | UUID |
| `role` | `ceo` \| `pm` \| `worker` | `client` |
| `email` | string | — |
| `iat`, `exp` | set by `jose` | set by `jose` |

The algorithms follow the two sources as written: D-14 gives ES256 keys to the platform token and "a separate key" to the portal token, and the environment variable list names that key `PORTAL_JWT_SECRET`, a shared secret. OQ-02 asks the owner to confirm HS256 for the portal token or choose an ES256 key pair instead; only `server/platform/auth/` changes either way.

`iss` and `aud` are not in the documented claim sets. They are added so the two token types can never be accepted in each other's place even if a key were reused (§10).

Verification rules (all enforced by `verifyPlatformToken` / `verifyPortalToken`):

1. The algorithm is pinned: the platform verifier accepts only `ES256`, the portal verifier only `HS256`. `alg: none` and any other algorithm are refused.
2. Signature, `exp`, `iss` and `aud` must all be valid. No clock tolerance is configured.
3. The payload is then parsed with a Zod schema for that token type. A missing or malformed claim (for example no `company_id`, or `role: 'client'` in a platform token) is refused.
4. The result is a typed claims object; nothing downstream reads the raw payload.

Signing (`signPlatformToken(claims)`, `signPortalToken(claims)`) is built and unit-tested in Phase 0 and first called by Phase 2 (login) and Phase 6a (portal login). Tokens are never logged (§4.7).

### 4.4 Unit of Work

Source: BACKEND_LAYERING_ARCHITECTURE.md, Application Layer ("Transaction management (using Unit of Work pattern)"); BACKEND_DATA_ARCHITECTURE.md, Transaction Boundaries; BACKEND_INFRASTRUCTURE_ARCHITECTURE.md, Audit Write Path.

```ts
interface UnitOfWork {
  readonly context: ExecutionContext;
  readonly tx: DbTransaction;        // passed to repositories; never used by the Application Layer for SQL
  readonly audit: AuditWriter;       // the only way to write audit entries
  readonly events: OutboxWriter;     // the only way to write outbox events
}

interface AuditWriter  { append(entry: AuditEntryInput): Promise<string /* audit_id */> }
interface OutboxWriter { record(event: DomainEventInput): Promise<string /* event_id */> }

runInTransaction<T>(ctx: ExecutionContext, work: (uow: UnitOfWork) => Promise<T>): Promise<T>
```

Lifecycle and guarantees:

| State | Entered when | Allowed |
|---|---|---|
| `active` | `runInTransaction` opens a database transaction (`READ COMMITTED`) | Repository calls with `uow.tx`, `uow.audit.append`, `uow.events.record` |
| `poisoned` | Any `append` or `record` call fails (validation or database error) | Nothing that changes the outcome: when `work` returns, the transaction is rolled back and `runInTransaction` rejects with `AuditWriteFailedError` / `OutboxWriteFailedError`, **even if `work` caught the error and returned normally** |
| `committed` | `work` resolved and the unit was not poisoned | — |
| `rolled_back` | `work` threw, or the unit was poisoned | — |
| closed (`committed` or `rolled_back`) | — | Any later `append`, `record` or `tx` use throws `UnitOfWorkClosedError` and writes nothing |

Further rules:

- `runInTransaction` validates `ctx.companyId` with `toCompanyId` before opening the transaction.
- Nesting is refused: calling `runInTransaction` while a unit is active in the same async context throws `NestedUnitOfWorkError`. A use case that calls another module's public function in the same transaction (D-06's closure use case is the first) passes its `uow` to that function instead.
- `AuditEntryInput` has no `companyId`, `actorId`, `actorRole`, `occurredAt`, `causationEventId` or `causationActorId` fields: `AuditWriter` takes the company, actor and causation from `uow.context` and the time from the database, so an entry can never be written for another tenant, another actor or a made-up cause. It contains `entryType`, `sourceObjectType`, `sourceObjectId`, and optionally `destinationObjectType`/`destinationObjectId` (both or neither), `jobId`, `siteId`, `clientId`, `previousValue`, `newValue`, `externalReference`, `metadata`. It is validated with Zod (formats as in T-1) before the insert.
- `DomainEventInput` has `eventType`, `sourceModule`, `sourceObjectType`, `sourceObjectId`, `payload` (a JSON object). `OutboxWriter` adds `eventId`, `eventVersion` `'1.0'`, `companyId`, `actorId` and causation from the context, and `occurredAt` from the database.

### 4.5 Events: envelope, subscribers and the outbox record lifecycle

Source: BACKEND_EVENT_ARCHITECTURE.md, Event Payload Standard, Event Lifecycle, Subscriber Registry; BACKEND_SERVICE_ARCHITECTURE.md, Event Bus Guarantee; BACKEND_INFRASTRUCTURE_ARCHITECTURE.md, Outbox Delivery Worker, Worker Resilience.

**Envelope** (what a subscriber receives), exactly the documented standard:

```ts
interface EventEnvelope {
  eventId: string; eventType: string; eventVersion: string; occurredAt: string; // ISO 8601 UTC
  companyId: CompanyId; actorId: string | null;
  sourceObjectId: string; sourceObjectType: string;
  payload: Record<string, unknown>;
}
```

**Subscribers.**

```ts
interface Subscriber {
  name: string;                      // unique, '<module>.<purpose>', e.g. 'identity.createInitialCeo'
  eventTypes: readonly string[];
  handle(event: EventEnvelope, uow: UnitOfWork): Promise<void>;
}
```

- The registry is built once at process start from `server/modules/registry.ts` (§4.8). Registering two subscribers with the same name, or a subscriber with no event types, throws at start-up.
- The worker calls each subscriber for an event in **its own Unit of Work** (tenant = the event's `companyId`, actor = `system`/subscriber name, causation from the outbox row — §4.1). A failing subscriber therefore never undoes another subscriber's work, and everything it writes is traceable to the event and the human behind it.
- The envelope a subscriber receives is unchanged from the documented standard. Causation reaches it through `uow.context.causation`, not through new envelope fields.
- In that same transaction the worker appends the subscriber's name to `delivered_subscribers`, guarded by `locked_by` (§5). A retried or redelivered event skips subscribers already listed, and a worker that has lost its claim cannot commit a subscriber's work.
- Delivery is at least once (BACKEND_EVENT_ARCHITECTURE.md). The `delivered_subscribers` record narrows duplicates but cannot remove them (for example a manual requeue, or a subscriber with effects outside the database), so **every subscriber must still be idempotent**, keyed on `eventId` or on its own natural key (e.g. submission ID in Phase 5). Gate test G0 for redelivery proves the platform delivers correctly to such a subscriber.
- Events are claimed in `created_at` order, but there is **no ordering guarantee** across retries or worker instances; subscribers must not depend on order (OQ-06).
- Subscribers are informational and evaluative only (Event Bus Doctrine). Their system actor can never satisfy a human-approval check.

**Outbox record state machine** (T-2 `status`). Interpretation of the sources: BACKEND_EVENT_ARCHITECTURE.md lists `pending → delivered → failed`; BACKEND_INFRASTRUCTURE_ARCHITECTURE.md adds the `processing` claim state and `dead_lettered`. Phase 0 uses all five, with `failed` meaning "last attempt failed, waiting for the next attempt" (OQ-08).

| From | To | Triggered by | Condition | Side effects (same transaction) |
|---|---|---|---|---|
| — | `pending` | `OutboxWriter.record` inside the writing use case's Unit of Work | The use case's transaction commits | — (row disappears if it rolls back) |
| `pending`, `failed` | `processing` | Worker claim | `next_attempt_at <= now()`, row not locked by another claimer (`FOR UPDATE SKIP LOCKED`) | `locked_at = now()`, `locked_by = <worker id>` |
| `processing` | `processing` | Worker, after one subscriber succeeds | `locked_by` still matches | subscriber's own writes; name appended to `delivered_subscribers` |
| `processing` | `delivered` | Worker, after every subscribed handler has succeeded (immediately if none) | `locked_by` still matches | `intelligence.event_log` row inserted (`ON CONFLICT (event_id) DO NOTHING`); `delivered_at = now()`; lock cleared |
| `processing` | `failed` | Worker, a subscriber threw | `retry_count + 1 < OUTBOX_MAX_ATTEMPTS` and `locked_by` matches | `retry_count += 1`; `next_attempt_at = now() + backoff`; `last_error` set; lock cleared |
| `processing` | `dead_lettered` | Worker, a subscriber threw | `retry_count + 1 = OUTBOX_MAX_ATTEMPTS` and `locked_by` matches | `retry_count += 1`; `dead_lettered_at = now()`; `last_error` set; lock cleared; ERROR log line (§4.7) |
| `processing` | `pending` | Worker stale-lock recovery | `locked_at < now() - OUTBOX_STALE_LOCK_MS` | lock cleared; `retry_count` unchanged (OQ-09) |
| `delivered` | — | terminal | | |
| `dead_lettered` | — | terminal in Phase 0 (no requeue tool, OQ-10) | | |

Only the worker process changes `status`, and the database enforces it: only `ledger_worker` holds `UPDATE` on the delivery-state columns (§3.5). The API process (`ledger_app`) only inserts.

Retry schedule (BACKEND_INFRASTRUCTURE_ARCHITECTURE.md: "exponential backoff … (1s, 2s, 4s, 8s, max 5 retries); After 5 failures: marks event as `dead_lettered`"): read as **five attempts in total**, waiting 1 s, 2 s, 4 s and 8 s between them, and dead-lettered on the fifth failure — the four listed delays fit five attempts. Backoff after the n-th failure is `OUTBOX_BASE_BACKOFF_MS × 2^(n-1)`. Defaults: `OUTBOX_MAX_ATTEMPTS = 5`, `OUTBOX_BASE_BACKOFF_MS = 1000`, `OUTBOX_POLL_INTERVAL_MS = 1000`, `OUTBOX_BATCH_SIZE = 10`, `OUTBOX_STALE_LOCK_MS = 300000` (5 minutes). All are configurable so tests run in milliseconds.

**Audit entries and the event log have no lifecycle**: rows are inserted once and never change.

### 4.6 Configuration

Source: BACKEND_INFRASTRUCTURE_ARCHITECTURE.md, Application Configuration and Required environment variables; D-12; D-13 (the frontend stays mock-driven until Track F; the Playwright suite keeps passing).

`loadApiConfig(env)` and `loadWorkerConfig(env)` parse `process.env` with Zod and return a frozen, typed object. On failure they throw `ConfigError` listing **the names** of every missing or invalid variable and never their values; the process entry point logs that and exits with code 1 before opening a port or a connection.

| Variable | API | Worker | Rule |
|---|---|---|---|
| `NODE_ENV` | optional | optional | `development` \| `test` \| `production`, default `development` |
| `PORT` | optional | — | integer 1–65535, default `5000` (unchanged) |
| `LOG_LEVEL` | optional | optional | `fatal`…`debug`, default `info` |
| `DATABASE_URL` | backend variable (below) | — | PostgreSQL URL for the `ledger_app` role |
| `JWT_PRIVATE_KEY` | backend variable | — | PKCS#8 PEM, P-256; `\n` escapes accepted; must import as an ES256 key at start-up |
| `JWT_PUBLIC_KEY` | backend variable | — | SPKI PEM, P-256; must import as an ES256 key and match the private key |
| `PORTAL_JWT_SECRET` | backend variable | — | at least 32 bytes |
| `DATABASE_WORKER_URL` | — | required | PostgreSQL URL for the `ledger_worker` role |
| `OUTBOX_*` (five, §4.5) | — | optional | positive integers, defaults as listed |

Used outside the two processes:

| Variable | Used by | Rule |
|---|---|---|
| `DATABASE_MIGRATION_URL` | `npm run db:migrate`, `drizzle-kit` | PostgreSQL URL for the owner role |
| `DATABASE_URL_TEST` | test harness, acting as the API (`ledger_app`) | database name must end in `_test` |
| `DATABASE_WORKER_URL_TEST` | test harness, acting as the worker (`ledger_worker`) | database name must end in `_test` |
| `DATABASE_MIGRATION_URL_TEST` | test harness rebuild step (owner) | database name must end in `_test` |

**API start-up modes.** The four API "backend variables" are `DATABASE_URL`, `JWT_PRIVATE_KEY`, `JWT_PUBLIC_KEY` and `PORTAL_JWT_SECRET`. The loader decides the mode from them:

| `NODE_ENV` | Backend variables present | Result |
|---|---|---|
| `production` | all four | **Full mode** |
| `production` | any missing | **Fail fast**: `ConfigError` naming the missing variables, exit code 1 |
| `development` / `test` | all four | **Full mode** |
| `development` / `test` | none of the four | **Frontend-only mode** |
| `development` / `test` | some but not all | **Fail fast** — a half-configured backend is a mistake, not a choice |

- **Full mode**: the API process opens the database pool, imports the keys and mounts `/health`, `/api/v1` and `/portal/v1` as described in §6.
- **Frontend-only mode** exists so frontend work on this branch is unchanged without a database (D-13). The API process opens **no** database connection and imports no keys. It mounts no module routers and no auth middleware. Every request under `/api/` or `/portal/v1/` gets `503` with the error envelope and code `BACKEND_NOT_CONFIGURED`, so API paths never fall through to the frontend. `GET /health` returns `200 {"status":"ok","mode":"frontend_only"}`. At start-up the process logs exactly one `WARN` line: "Backend not configured: running in frontend-only mode", with the four variable names and no values. The frontend is served exactly as now (Vite in development, static files otherwise).
- **The worker never has a frontend-only mode.** Without `DATABASE_WORKER_URL` it fails fast, because there is nothing useful it can do.

So `npm run dev` with no `.env` behaves as it does today for the frontend and the Playwright suite. A developer who wants the backend adds the variables to `.env`. The mode is chosen only by `NODE_ENV` and whether the variables are present — there is no "skip the backend" flag that could be left on by mistake. Production can never start without its backend. This is the proposal for OQ-13; the owner confirms it at the checkpoint.

**Local `.env` file.** Outside production, the loader reads `.env` from the app folder if it exists (`process.loadEnvFile`), and variables already set in the environment win. `.env` is added to `.gitignore`; `.env.example` (names and placeholder values only) is committed. On a hosted deployment the variables come from the host's secret store.

**Test-database guard (D-12).** `assertTestDatabase(urls)` in `server/platform/config/test-database.ts` runs before any connection is opened. It refuses if:
- any of the three test URLs is missing;
- a test URL's database name (the URL path, percent-decoded, case-sensitive) does not end in `_test`;
- the three test URLs name different databases or different hosts;
- the test database matches the database in `DATABASE_URL`, `DATABASE_WORKER_URL` or `DATABASE_MIGRATION_URL`, when those are set.

The Vitest global setup and every test database client call it.

**Test database lifecycle.** At the start of each gate-test run the harness rebuilds the test database. Connected as the owner, it drops `audit`, `intelligence` and `drizzle` (`CASCADE`) and re-runs every migration. This is the only way audit rows are ever removed, and it happens only in a database that passed the guard. Gate tests then connect as `ledger_app` for API behaviour and as `ledger_worker` for worker behaviour, never as the owner, except to prove a database-level guarantee or to set up a failure on purpose. Gate test files run one at a time (`fileParallelism: false` for the gate project) because some tests change grants or fail the database on purpose.

### 4.7 Logging and errors

Source: BACKEND_OBSERVABILITY_ARCHITECTURE.md, Logging Strategy; BACKEND_API_ARCHITECTURE.md, Error Handling Strategy and Error Logging; roster, Shared Rules — Doctrine.

**Logger.** One `pino` logger per process (`service: 'api'` or `service: 'worker'`), JSON to stdout, with:
- `level` written as an upper-case label (`"level":"INFO"`) and `timestamp` as ISO 8601, `message` as the message key — the structure in BACKEND_OBSERVABILITY_ARCHITECTURE.md, Log Structure;
- a mixin that adds `requestId`, `companyId` and `userId` (API) or `runId` (worker) from the active execution context (an `AsyncLocalStorage` in `server/platform/context/request-context.ts`);
- no transports and no `pino-pretty` (nothing runs in a worker thread; the production bundle stays simple).

**What is logged per request** — exactly one line when the response finishes, for paths under `/api/`, `/portal/v1/` and `/health` (Vite asset requests are not logged): `requestId`, `method`, `path` (Express `req.path` — the query string is never logged), `statusCode`, `durationMs`, and `companyId`/`userId` when the request was authenticated. Level `INFO`; `/health` at `DEBUG`.

**What is never logged** (BACKEND_OBSERVABILITY_ARCHITECTURE.md, What Is NOT Logged; roster doctrine): request bodies, response bodies, query strings, headers (in particular `Authorization` and `Cookie`), JWTs, passwords, financial amounts, event payloads, audit `previous_value`/`new_value`, personal data beyond user ID. The logger is never given a request or response object, so no serializer can expand one.

**Error serializer** (`server/platform/logging/error-serializer.ts`) is used by every log call that carries an error. It works from an allowlist: only the fields named below are ever logged. Anything that can quote input is never logged in its own words.

| Error kind (how it is recognised) | Logged | Never logged |
|---|---|---|
| **PostgreSQL error** (the driver's `DatabaseError`: has a five-character SQLSTATE `code` and the protocol `severity` field) | `name`, `pgCode` (SQLSTATE), `severity`, `schema`, `table`, `column`, `constraint`, `dataType`, and a fixed message `"PostgreSQL error <code>"` | The server's `message` — **for every SQLSTATE class, not just class 22**. Class 22 data errors quote values (`22P02` "invalid input syntax for type uuid: "…""), but so can others: `P0001` raised by functions, `23514`/`23502` text naming rows, and any future message. Also never: `detail`, `hint`, `where`, `internalQuery`, `position`, and `stack`, whose first line repeats the message |
| **Database-library wrapper** (an error with a `query`, `params` or `parameters` property, or whose `cause` is a PostgreSQL error — for example Drizzle's query error, which puts the SQL and the bound parameter values in its message) | `name`, a fixed message `"Database query failed"`, and its `cause` serialized by these same rules | Its own `message`, `query`, `params`, `parameters`, `stack` |
| **JSON body-parser error** (`type === 'entity.parse.failed'`; V8's parse message quotes the start of the body) | `name`, code `MALFORMED_JSON` | `message`, `body`, `stack` |
| **`ZodError`** | `name`, code `VALIDATION_ERROR`, the number of issues | `issues` (they can hold received values), `message`, `stack` |
| **`AppError`** | `name`, `code`, `status`, `safeMessage` | `details` (validation details go to the client, not the log) |
| **Any other error** | `name`, `code` if a string, `message`, `stack` | every other property |

`cause` chains are followed to a depth of three, applying the same table at each level. Using constraint, table and column names keeps database failures diagnosable without logging a value. Platform code never puts input values into an error message, and module error messages follow the same rule — "any other error" is the only row whose message is logged as written.

**Error classes.** `AppError(code, status, safeMessage, details?)` and the platform subclasses `ValidationError` (400), `UnauthenticatedError` (401), `ForbiddenError` (403), `NotFoundError` (404), `ConflictError` (409), `BusinessRuleError` (422). Programming and infrastructure errors — `MissingTenantContextError`, `NestedUnitOfWorkError`, `UnitOfWorkClosedError`, `AuditWriteFailedError`, `OutboxWriteFailedError`, `ConfigError`, `LockLostError` — are not `AppError`s and surface as 500. Module domain errors live in each module's domain layer, which may not import the platform (BACKEND_LAYERING_ARCHITECTURE.md, Layer 1); each module's API layer maps them to `AppError`s. The global error handler knows only `AppError`, `ZodError`, the JSON body parser's errors and "anything else" (§6).

**Worker correlation.** Each claimed event is processed under a `runId` (UUID). BACKEND_OBSERVABILITY_ARCHITECTURE.md calls this `jobId`; Phase 0 names it `runId` so it cannot be mistaken for a Ledger job's `job_id` in logs (OQ-15). Worker log lines name `eventId`, `eventType`, `companyId`, subscriber name and attempt number — never the payload. A dead-lettered event is logged at `ERROR` (BACKEND_INFRASTRUCTURE_ARCHITECTURE.md: "alerts via monitoring"); a failed attempt at `WARN`.

### 4.8 Module layout, registry and import rules

Source: BACKEND_SERVICE_ARCHITECTURE.md, Architecture Decision and Module Boundary Rules 1–7; BACKEND_LAYERING_ARCHITECTURE.md, Layers 1–4 (allowed and forbidden interactions); roster, Folder Ownership.

**Layout fixed by Phase 0** (the first module directory appears in Phase 1):

```
server/
  index.ts                API process entry
  worker.ts               worker process entry
  static.ts, vite.ts      frontend serving (kept, §10)
  platform/
    index.ts              the only file modules may import from the platform
    config/  logging/  context/  errors/  http/  auth/  db/  db/schema/  audit/  events/
    storage/              reserved for FileStorage (Phase 4, PM ruling)
  modules/
    registry.ts           the list of registered modules (empty in Phase 0)
    <module>/
      domain/  application/  infrastructure/  api/  index.ts
  tests/
    gate/phase-0-infrastructure/   gate tests (test engineer)
    support/                       harness, fixtures, helpers (test engineer)
migrations/
```

**Registry** (`server/modules/registry.ts`, created by the platform engineer; each module engineer adds one line):

```ts
interface ModuleRegistration {
  name: string;                                   // the module's schema/namespace, e.g. 'tenant'
  apiRouter?: (deps: ModuleDeps) => Router;       // mounted at /api/v1, behind platform-token auth
  publicApiRouter?: (deps: ModuleDeps) => Router; // mounted at /api/v1 before auth; each public
                                                  //   route must be listed in that phase's spec
  portalRouter?: (deps: ModuleDeps) => Router;    // mounted at /portal/v1, behind portal-token auth
  subscribers?: readonly Subscriber[];
}
export const modules: readonly ModuleRegistration[] = [];
```

`ModuleDeps` gives a router what it needs from the platform (`runInTransaction`, `logger`, configuration) without exposing internals. Both processes read the same registry: the API mounts routers, the worker registers subscribers.

**Import rules** (each becomes a gate check, §9):

1. A file under `server/modules/<m>/` may import from the platform only via `server/platform/index.ts`.
2. It may import another module only via `server/modules/<other>/index.ts`.
3. `domain/` imports only files inside its own module's `domain/` folder: no other layer, no platform code (not even types — §4.1), no other module, no Node built-in module, and no package unless a phase specification allowlists it as pure and I/O-free. Platform-branded values reach the domain as plain strings (§4.1).
4. `application/` imports `domain/` and the platform's public surface; not `infrastructure/` internals, `api/`, `express`, `drizzle-orm` or `pg`.
5. `infrastructure/` does not import `application/` or `api/`.
6. `api/` does not import `domain/` or `infrastructure/` directly.
7. `index.ts` exports DTOs and public functions, never domain entities (checked in review; not machine-checkable in Phase 0).
8. Nothing under `server/platform/` imports from `server/modules/`. Only the two process entry points (`server/index.ts`, `server/worker.ts`) import `server/modules/registry.ts`, and they pass the registrations into the platform.

Rule 4 and rule 5 read the layering document's dependency directions literally (Application → Domain; Infrastructure → Domain). The Application Layer reaches its repository implementations through the interfaces it is given (dependency injection at the module's `index.ts`), which BACKEND_LAYERING_ARCHITECTURE.md allows ("May call infrastructure implementations through injected interfaces").

### 4.9 Cross-module work: the two patterns the platform supports

The platform supports two ways for one module's state change to cause another module's work:

| Pattern | How | Consistency | Traceability |
|---|---|---|---|
| **Same transaction** | The caller's use case calls the other module's public function from its `index.ts` and passes its own `uow` (nesting is refused, so the work joins the caller's transaction, §4.4) | Atomic: both modules' writes, every audit entry and every outbox event commit or roll back together | The human actor is the actor on every entry; no causation needed |
| **Event subscriber** | The caller records an event; a subscriber in the other module handles it in the worker (§4.5) | Eventual: the second module's work commits later, separately, and can fail and be retried or dead-lettered | System actor plus `causation_event_id` / `causation_actor_id` (§4.1) |

**Recorded architecture conflict (for the owner; not resolved here).** The two patterns meet at the most important step on the platform: approval becoming a financial record.
- BACKEND_DATA_ARCHITECTURE.md, Write Consistency Requirements ("Approve submission → create financial record: ACID transaction: approval status + financial record + audit entry in single commit"), Transaction Boundary 2 ("Submission status update + financial record(s) creation + audit entry + outbox event") and "How Operational Truth Becomes Financial Truth" step 4 ("All in one ACID transaction") require the **same-transaction** pattern.
- BACKEND_EVENT_ARCHITECTURE.md, Subscriber Registry ("Financial Normalization — `TimesheetApproved`, `ReportApproved`, `ExpenseApproved` — Create financial records"), BACKEND_SERVICE_ARCHITECTURE.md, Inter-Module Communication (the `TimesheetApproved` example) and roadmap Phase 5 ("Subscribers: `TimesheetApproved`, `ReportApproved`, `ExpenseApproved`, all idempotent by submission ID") describe the **subscriber** pattern.

The documents have the same precedence, so the owner must choose. It is raised as OQ-16 for the checkpoint, because it decides Phase 4's approval use case and Phase 5's normalization design. Phase 0 needs no change either way.

**Recommendation: the same-transaction pattern for approval → financial record.** Review Centre's approval use case calls Financial Normalization's public `normalizeApproved…(uow, …)` in the same transaction, and still records `TimesheetApproved` and the other approval events for notification, activity feed and reporting subscribers. Reasons:
1. It is the only option that meets the data architecture's explicit consistency requirement and transaction boundary.
2. With a subscriber, an approved submission can exist with no financial record — for as long as delivery takes, or for ever if the subscriber dead-letters. The mini-ledger is then wrong, and nothing shows that a human-approved item never became financially real. That is a silent financial gap (BACKEND_OBSERVABILITY_ARCHITECTURE.md, Principle 3: "No silent failures").
3. Phase 5's gate — "a financial record with no approval reference cannot be written" — is simplest to prove when the approval reference and the record are created together.
4. The cost is a synchronous dependency, Review Centre → Financial Normalization, through Financial Normalization's public surface. That is a "well-defined contract" (BACKEND_LAYERING_ARCHITECTURE.md, Application Layer forbidden interactions), the same shape D-06 already approved for closure. The approval transaction gets longer, but it is still bounded by one submission's lines.

If the owner prefers the subscriber pattern, Phase 0's causation columns keep it traceable. The Phase 4/5 specifications would then need a monitored "approved but not normalised" check to cover dead letters.

---
## 5. USE CASES (PLATFORM SERVICES)

Phase 0 has no business use cases, so no role or PM-scope authorisation applies here. For each platform service this section gives the template's columns: inputs, who calls it, the invariants it checks, the records it writes, its audit entry, its events and its transaction boundary. The transaction rules come from BACKEND_DATA_ARCHITECTURE.md, Transaction Boundaries and Write Consistency Requirements: a state change, its audit entry and its outbox event commit together in one transaction, or not at all.

### 5.1 Summary

| ID | Service | Called by | Writes | Transaction |
|---|---|---|---|---|
| PS-01 | Configuration and start-up mode | Both process entry points | — | none |
| PS-02 | API process start-up (`server/index.ts`) | `npm run dev`, `npm start` | — | none |
| PS-03 | Worker process start-up (`server/worker.ts`) | `npm run dev:worker`, `npm run start:worker` | — | none |
| PS-04 | Request pipeline (`createApiApp`) | PS-02; gate tests | — | none |
| PS-05 | Request ID and request context | every request | response header | none |
| PS-06 | Request logger | API, portal and health requests | one log line | none |
| PS-07 | API error handler and not-found handler | API, portal and health routers | one log line, error response | none |
| PS-08 | Health check | `GET /health` | — | none (one read) |
| PS-09 | JWT utilities | PS-10, PS-11; Phase 2 and 6a login | — | none |
| PS-10 | Platform-token middleware | every `/api/v1` request except listed public routes | request context | none |
| PS-11 | Portal-token middleware | every `/portal/v1` request | request context | none |
| PS-12 | `runInTransaction` (Unit of Work) | every Application Layer use case; the worker | whatever the work writes | **opens and owns** one transaction |
| PS-13 | `AuditWriter.append` | use cases and subscribers, through `uow.audit` | T-1 row | the caller's (PS-12) |
| PS-14 | `OutboxWriter.record` | use cases and subscribers, through `uow.events` | T-2 row | the caller's (PS-12) |
| PS-15 | Subscriber registry | both entry points at start-up | — | none |
| PS-16 | Port registry (typed cross-module ports) | both entry points at start-up | — | none |
| PS-17 | Outbox worker — claim | worker loop | T-2 status | one short transaction |
| PS-18 | Outbox worker — deliver one event | worker loop | subscriber writes, T-2, T-3 | one per subscriber, plus one to finish |
| PS-19 | Outbox worker — record a failed attempt | PS-18 | T-2 | one short transaction |
| PS-20 | Outbox worker — stale-lock recovery | worker loop | T-2 | one statement |
| PS-21 | Migration runner | `npm run db:migrate`, test harness | schemas, tables, grants | one per migration (Drizzle migrator) |
| PS-22 | Test-database guard | test harness, test clients | — | none |

None of these services writes an audit entry of its own (§8), and none emits a domain event of its own (§7).

### 5.2 PS-01 — Configuration and start-up mode

- **Input:** `process.env`, after the optional `.env` load (§4.6).
- **Checks:**
  - the variable rules in §4.6, and the API mode table;
  - for the API in full mode, both JWT keys are imported with `jose` (`importPKCS8`, `importSPKI`, algorithm `ES256`);
  - a test signature made with the private key must verify with the public key, which proves the two keys are a pair.
- **Output:** a frozen `ApiConfig` (`mode: 'full' | 'frontend_only'`) or `WorkerConfig`.
- **Failure:** `ConfigError` naming the variables. The entry point writes one `FATAL` log line with the names (never values) and exits with code 1 before listening or connecting.

### 5.3 PS-02 — API process start-up

Order in `server/index.ts`:

1. Run PS-01 `loadApiConfig`. Exit on `ConfigError`.
2. Create the logger (`service: 'api'`).
3. In full mode: create the `ledger_app` pool (`pg.Pool` with `DATABASE_URL` and driver defaults; no connection is made yet). Then build the subscriber and port registries from `server/modules/registry.ts` (PS-15, PS-16). If any declared port does not have exactly one provider, the API refuses to start.
4. Call `createApiApp({ config, logger, db, modules })` (PS-04).
5. Mount frontend serving, unchanged: Vite middleware in development (`setupVite`), static files in production (`serveStatic`). It is mounted last, so the frontend catch-all can never shadow `/health`, `/api` or `/portal/v1`.
6. Listen on `PORT` (default 5000).

The API does not connect to the database at start-up; `/health` reports whether the database is reachable (BACKEND_OBSERVABILITY_ARCHITECTURE.md, Health Check Endpoint). The API process never runs the outbox worker.

### 5.4 PS-03 — Worker process start-up

Order in `server/worker.ts`:

1. Run `loadWorkerConfig`. Exit on `ConfigError`.
2. Create the logger (`service: 'worker'`) and the `ledger_worker` pool (`DATABASE_WORKER_URL`).
3. Build the subscriber registry (PS-15) and the port registry (PS-16) from `server/modules/registry.ts`. The worker needs both, because subscribers may call ports.
4. Create the outbox worker with an instance ID of the form `<hostname>:<pid>:<8 random hex>`, and `start()` it.
5. On `SIGINT` or `SIGTERM`: `stop()` (finish the event in hand and claim no more), close the pool, exit 0. Full graceful shutdown with timeouts is Phase 9.

The outbox worker exposes three methods:
- `runOnce()` runs one cycle (recover, claim, deliver) and resolves when it is done. Gate tests use it, so no test depends on timing.
- `start()` begins the loop.
- `stop()` ends it.

### 5.5 PS-04 — Request pipeline

`createApiApp` builds the Express app in the order below. It is a function so that gate tests can build the same app with their own module registrations.

| # | Path | Full mode | Frontend-only mode |
|---|---|---|---|
| 1 | all | PS-05 request ID and context | same |
| 2 | all | PS-06 request logger (logs only `/api/`, `/portal/v1/`, `/health`) | same |
| 3 | `GET /health` | PS-08 | `200 {"status":"ok","mode":"frontend_only"}` |
| 4 | `/api/v1` | `express.json({ limit: '1mb' })` → each module's `publicApiRouter` → PS-10 → each module's `apiRouter` → not-found → PS-07 | — |
| 5 | `/api` (anything not matched above, e.g. `/api/v2/x`, `/api/foo`) | not-found → PS-07 | `503 BACKEND_NOT_CONFIGURED` for every `/api/*` path |
| 6 | `/portal/v1` | `express.json({ limit: '1mb' })` → PS-11 → each module's `portalRouter` → not-found → PS-07 | `503 BACKEND_NOT_CONFIGURED` |
| 7 | everything else | passes on to frontend serving (PS-02 step 5) | same |

Rules:
- The body parser is mounted only on the API and portal routers, and parses only JSON. SPA and Vite paths never pass through a parser.
- PS-07 is attached only to the API, portal and health routers. Errors raised by Vite or static serving keep today's behaviour (Express's default handler).
- Step 6 never matches `/portal` without `/v1`, so the frontend's `/portal`, `/portal/:section` and `/portal/:section/:id` routes are unaffected.

### 5.6 PS-05 — Request ID and request context

- Generates a `crypto.randomUUID()` for every request. Any inbound `X-Request-Id` is ignored, so a client cannot inject values into logs.
- Sets the `X-Request-Id` response header.
- Runs the rest of the request inside the `AsyncLocalStorage` request context `{ requestId }`. PS-10 and PS-11 later run the remaining handlers in a nested context that adds the execution context.
- Through the mixin (§4.7), every log line written while handling the request carries `requestId`, plus `companyId` and `userId` once the request is authenticated.

### 5.7 PS-06 — Request logger

- Writes one line per logged request, on the response `finish` event, with exactly the fields in §4.7.
- Reads only `req.method`, `req.path`, `res.statusCode`, a monotonic duration and the request context. Nothing else from the request or response is read, and `res.json` / `res.send` are not patched.
- Level is `INFO`, except `DEBUG` for `/health`.
- A request that ends in a 5xx is also logged by PS-07, at `ERROR`, with the error.

### 5.8 PS-07 — Error handler and not-found handler

| Error | Status | Code | Message (British English, fixed text) | Logged |
|---|---|---|---|---|
| `AppError` | its status | its code | its `safeMessage` | `DEBUG` for 4xx, `ERROR` for 5xx |
| `ZodError` | 400 | `VALIDATION_ERROR` | "Request validation failed." — `details` is `{ "<path>": ["<issue message>", …] }`, path joined with `.`, root-level issues under `"_root"` | `DEBUG`, code and issue count only |
| JSON parse failure (`entity.parse.failed`) | 400 | `MALFORMED_JSON` | "Request body is not valid JSON." | `DEBUG`, code only |
| Body too large (`entity.too.large`) | 413 | `PAYLOAD_TOO_LARGE` | "Request body is too large." | `DEBUG`, code only |
| No route matched | 404 | `NOT_FOUND` | "The requested resource was not found." | `DEBUG` |
| Anything else | 500 | `INTERNAL_ERROR` | "An unexpected error occurred." | `ERROR` through the error serializer (§4.7), with `requestId`, `method`, `path` |

- Every response uses the envelope `{ "error": { "code", "message", "details", "requestId" } }`. `details` is always present (`{}` when empty).
- A response never contains a stack trace, any database text, or an error's own message — the only message passed through is an `AppError`'s `safeMessage`. The current Replit handler returns `err.message` to the client; this one does not (§10).
- If headers have already been sent, the handler only logs and ends the response.

### 5.9 PS-08 — Health check

- **Full mode:** acquires a pool connection and runs `SELECT 1`; the whole check has a 2-second timeout.
  - Success returns `200 {"status":"ok","mode":"full"}`.
  - Any failure or timeout returns `503 {"status":"unavailable","mode":"full"}`, and the failure is logged at `WARN` through the error serializer.
- **Headers:** `Cache-Control: no-store`.
- **No authentication.** The response body contains only the status and mode — no version, host, database name or error text.
- **No transaction.** It is read-only and needs no tenant context, because it touches no tenant data.

### 5.10 PS-09 — JWT utilities

- **`signPlatformToken(claims, keys)` / `signPortalToken(claims, secret)`.** The input is the typed claim set from §4.3, without `iss`, `aud`, `iat` and `exp`; the function sets those, with a 15-minute lifetime. The claims are validated with the same Zod schemas the verifiers use, so the platform can never sign a token it would then refuse.
- **`verifyPlatformToken(token, keys)` / `verifyPortalToken(token, secret)`.** These apply the four rules in §4.3. Each returns typed claims, or throws:
  - `TokenExpiredError` for an expired token;
  - `TokenInvalidError` for every other failure — signature, algorithm, issuer, audience, claim shape, malformed token.

  Apart from expiry, the error never says which check failed.
- No I/O, no transaction, nothing logged.

### 5.11 PS-10 — Platform-token middleware (tenant context)

- **Input:** the `Authorization` header. The only accepted form is `Bearer <token>`, with the scheme case-insensitive. Tokens are never read from a cookie or a query parameter.
- **Header missing, or scheme not `Bearer`:** `401 UNAUTHENTICATED` "Authentication is required.", with `WWW-Authenticate: Bearer`.
- **`TokenExpiredError`:** `401 TOKEN_EXPIRED` "Your session has expired.", with `WWW-Authenticate: Bearer error="invalid_token"`. The separate code lets the frontend refresh from Phase 2 on.
- **`TokenInvalidError`:** `401 UNAUTHENTICATED`, with the same header.
- **Success:** builds the execution context `{ companyId: toCompanyId(claims.company_id), actor: { kind: 'user', userId: claims.sub, role: claims.role }, causation: null, requestId }` and runs the remaining handlers inside it.
  - Routers read the context with `contextOf(req)` from `ModuleDeps`. There is no other way for a handler to get a company ID.
- **Not done in Phase 0:**
  - role checks (`requireRole`, Phase 2);
  - the tenant-active check (OQ-12);
  - checking that the user still exists and is active (Phase 2).
- **Records written:** none. Authentication failures are logged only by PS-06 (as status 401), never with the token.

### 5.12 PS-11 — Portal-token middleware

The same as PS-10, but for `/portal/v1` and using `verifyPortalToken`.
- On success the actor is `{ kind: 'portal_user', portalAccountId: claims.sub, clientId: claims.client_id, role: 'client' }`.
- A platform token on `/portal/v1`, or a portal token on `/api/v1`, fails verification and gets `401`, because the two token types use different algorithms, keys and audiences. This is part of roadmap Phase 6a's gate; the platform makes it true from Phase 0.

### 5.13 PS-12 — `runInTransaction` (Unit of Work)

- **Inputs:**
  - an `ExecutionContext` (§4.1);
  - the work function;
  - the pool, bound when the Unit of Work is constructed — the API's `ledger_app` pool or the worker's `ledger_worker` pool.
- **Checks, before the transaction opens:**
  - `toCompanyId(ctx.companyId)` succeeds;
  - the context was built by the platform;
  - no unit is already active in this async context (otherwise `NestedUnitOfWorkError`).
- **Transaction:** `BEGIN` (READ COMMITTED) → `work(uow)` → `COMMIT`. If `work` throws or the unit is poisoned (§4.4), it runs `ROLLBACK` instead. Either way, the unit is then closed.
- **Records written:** only what `work` writes, plus T-1 and T-2 rows through PS-13 and PS-14.
- **Errors:** an error thrown by `work` is rethrown unchanged. If the unit was poisoned but `work` returned normally, it throws `AuditWriteFailedError` or `OutboxWriteFailedError`, with the first failure as `cause`.

### 5.14 PS-13 — `AuditWriter.append`

- **Input:** `AuditEntryInput` (§4.4).
- **Checks:**
  - the unit is `active`;
  - Zod validation of the input against T-1's formats, including destination type and ID being given both or neither;
  - JSON values are serialisable.
- **Writes:** one row in `audit.audit_entries`, inside the caller's transaction.
  - From the context: `company_id`, `actor_id`, `actor_role`, `causation_*`, and `metadata.requestId` / `metadata.runId`.
  - From the database: `occurred_at` and `sequence_no`.
- **Returns:** `audit_id`.
- **On failure** (validation or database): marks the unit poisoned, then throws. The caller's transaction cannot commit (§4.4).
- **Never** updates, deletes or reads audit rows. `AuditWriter` exposes only `append()` (BACKEND_DATA_ARCHITECTURE.md, Audit Immutability Enforcement), and the Drizzle table object for T-1 is not exported from `server/platform/index.ts`.

### 5.15 PS-14 — `OutboxWriter.record`

- **Input:** `DomainEventInput` (§4.4).
- **Checks:**
  - the unit is `active`;
  - `eventType` matches the PascalCase format, and `sourceModule` matches T-2's format;
  - `payload` is a plain JSON object of at most 64 KB once serialised — events carry identifiers, not documents (§3.4).
- **Writes:** one row in `intelligence.event_outbox` with `status = 'pending'`, inside the caller's transaction. `event_id` is generated; `company_id`, `actor_id` and `causation_*` come from the context.
- **Returns:** `event_id`.
- **On failure:** marks the unit poisoned, then throws.
- **Delivery** never happens in the writing process. The worker can see the row only once the caller's transaction commits, so a rolled-back transaction leaves no row and its event can never be delivered (gate item 3).
- The Drizzle table objects for T-2 and T-3 are not exported from the platform index.

### 5.16 PS-15 — Subscriber registry

- Built at start-up from every `ModuleRegistration.subscribers` (§4.8).
- **Checks:**
  - subscriber names are unique and match `^[a-z][a-z_]*\.[a-zA-Z][a-zA-Z0-9]*$`;
  - every subscriber lists at least one event type, each in PascalCase;
  - no subscriber lists the same event type twice.
- **Lookup:** `subscribersFor(eventType)` returns subscribers in registration order.
- Immutable after start-up.

### 5.17 PS-16 — Port registry (typed cross-module ports)

A port lets a lower module call into a higher one without importing it. The lower module defines the interface, the higher module implements it, and the process entry point wires them together. Every compile-time import therefore still points downward, as the dependency direction requires (BACKEND_LAYERING_ARCHITECTURE.md, Application Layer — cross-context calls only through "well-defined contracts"; BACKEND_SERVICE_ARCHITECTURE.md, Module Boundary Rules 1–2). This is the platform piece needed for the same-transaction option in §4.9 and OQ-16. Phase 0 defines no ports.

```ts
interface PortToken<T> { readonly name: string; readonly __type?: T }
function definePort<T>(name: string): PortToken<T>;       // in the defining module's application layer,
                                                          //   exported from its index.ts
interface ModuleRegistration {                            // additions to §4.8
  requiresPorts?: readonly PortToken<unknown>[];
  providesPorts?: readonly PortBinding<unknown>[];        // bind(token, (deps) => implementation)
}
interface Ports { get<T>(token: PortToken<T>): T }        // passed to the defining module's factory
```

- **Calling convention:** a port's methods take the caller's `uow` as their first argument. The implementation therefore works inside the caller's transaction, and its audit entries carry the caller's human actor.
- **Start-up checks** (both processes): every port in any `requiresPorts` has exactly one provider; no port has two providers; port names are unique. Any failure stops the process at start-up, naming the ports.
- **Resolution timing:** `Ports.get` works only while module factories are being built at start-up, not during a request. A dependency can therefore never be resolved lazily or swapped at run time.
- **No transaction** of its own.

### 5.18 PS-17 — Outbox worker: claim

```sql
UPDATE intelligence.event_outbox
   SET status = 'processing', locked_at = now(), locked_by = $workerId
 WHERE outbox_id IN (
         SELECT outbox_id FROM intelligence.event_outbox
          WHERE status IN ('pending', 'failed') AND next_attempt_at <= now()
          ORDER BY created_at
          LIMIT $batchSize
          FOR UPDATE SKIP LOCKED)
RETURNING *;
```

- One statement in its own short transaction, run as `ledger_worker`. `SKIP LOCKED` ensures two workers never claim the same row.
- The claim commits before any subscriber runs, so a slow subscriber never holds a row lock on the outbox.
- **No tenant context.** The claim spans all companies by design. It is the only cross-tenant query in Phase 0, and it reads no business data. Every later step runs in the claimed event's own tenant context.

### 5.19 PS-18 — Outbox worker: deliver one event

The worker handles each claimed row in claim order, under a new `runId`:

1. **Prepare.** Build the envelope from the row (§4.5). The subscriber list is `subscribersFor(event_type)` minus `delivered_subscribers`.
2. **Call each subscriber.** Each one runs in its own `runInTransaction`, with the worker subscriber context (system actor, the row's company, causation from the row). Inside that transaction:
   1. `await subscriber.handle(envelope, uow)`;
   2. `UPDATE intelligence.event_outbox SET delivered_subscribers = array_append(delivered_subscribers, $name) WHERE outbox_id = $id AND status = 'processing' AND locked_by = $workerId AND NOT ($name = ANY(delivered_subscribers))`. If no row is updated, it throws `LockLostError`, which rolls back the subscriber's writes.

   If a subscriber throws, the worker logs at `WARN` and **carries on with the remaining subscribers**, so independent subscribers are not held back by a failing one. On `LockLostError`, the worker stops handling this event at once and records nothing more, because another worker now owns it.
3. **Finish.** If every listed subscriber succeeded (including when there were none), the worker finishes in one transaction:
   - `INSERT INTO intelligence.event_log (…) VALUES (… copied from the row …) ON CONFLICT (event_id) DO NOTHING`;
   - `UPDATE intelligence.event_outbox SET status = 'delivered', delivered_at = now(), locked_at = NULL, locked_by = NULL WHERE outbox_id = $id AND status = 'processing' AND locked_by = $workerId`.

   If no row is updated, the finish transaction rolls back with `LockLostError`. This is logged at `WARN` and not counted as an attempt.
4. **Failure.** If any subscriber failed, the worker runs PS-19.

**Transaction boundaries.** There is one transaction per subscriber, holding its work, its audit entries and events, and its `delivered_subscribers` mark. Then one transaction finishes the event (`event_log` row plus `delivered`). This keeps the documented lifecycle order — subscribers handle the event, then it is written to the event log, then the outbox row is marked delivered (BACKEND_EVENT_ARCHITECTURE.md, Event Lifecycle) — and makes each step atomic.

### 5.20 PS-19 — Outbox worker: record a failed attempt

This is one statement in its own transaction, guarded by `locked_by = $workerId AND status = 'processing'`. It sets:
- `retry_count = retry_count + 1`;
- `status = 'dead_lettered'` if the new count has reached `OUTBOX_MAX_ATTEMPTS`, otherwise `'failed'`;
- `next_attempt_at = now() + OUTBOX_BASE_BACKOFF_MS × 2^(retry_count − 1)`, computed with the old count — 1 s, 2 s, 4 s, 8 s by default;
- `dead_lettered_at = now()` when dead-lettered;
- `last_error` = for each failed subscriber, `<subscriber name>: ` plus the error serializer's safe summary (name, code, and message only where §4.7 allows), joined and truncated to 1 000 characters;
- the lock cleared.

It is logged at `WARN`, or at `ERROR` when dead-lettered (§4.7). Subscribers that succeeded stay in `delivered_subscribers`, so the next attempt runs only the ones that failed.

### 5.21 PS-20 — Outbox worker: stale-lock recovery

At the start of every cycle:

```sql
UPDATE intelligence.event_outbox
   SET status = 'pending', locked_at = NULL, locked_by = NULL
 WHERE status = 'processing' AND locked_at < now() - make_interval(secs => $staleMs / 1000.0);
```

- Each recovered row is logged at `WARN` with its event ID.
- `retry_count` is not changed (OQ-09).
- A worker that lost its lock this way is fenced by the `locked_by` guards in PS-18 and PS-19.

**Worker loop:**
1. Recover stale locks (PS-20).
2. Claim a batch (PS-17).
3. Deliver each claimed row (PS-18, and PS-19 on failure).
4. If the batch was full, start the next cycle immediately; otherwise wait `OUTBOX_POLL_INTERVAL_MS`.

If the loop itself hits an unexpected error (for example, the database is unreachable), it logs at `ERROR`, waits one poll interval and carries on. The process does not exit.

### 5.22 PS-21 — Migration runner

`server/platform/db/migrate.ts`, run as `npm run db:migrate`, applies `migrations/` with Drizzle's node-postgres migrator using `DATABASE_MIGRATION_URL`, and exits non-zero on failure. The test harness calls the same function with `DATABASE_MIGRATION_URL_TEST`, after PS-22. The API and the worker never apply migrations at start-up.

### 5.23 PS-22 — Test-database guard

Specified in §4.6. It is a pure function. On failure it throws `TestDatabaseGuardError` naming the rule that failed and the variable — never the full URL, which contains a password.

### 5.24 Tenant-scoping helpers

`toCompanyId`, `tenantScope` and `tenantWhere` (§4.1, §4.2) are pure functions and open no transaction. They throw `MissingTenantContextError` when the company ID is missing or is not a UUID.

---

## 6. API

### 6.1 Routes

Phase 0 adds exactly one route. Everything else under the two API prefixes answers with the error envelope.

| Method | Path | Auth | Roles | Request | Responses |
|---|---|---|---|---|---|
| `GET` | `/health` | none | — | none | `200 {"status":"ok","mode":"full"}` · `503 {"status":"unavailable","mode":"full"}` · `200 {"status":"ok","mode":"frontend_only"}` |
| any | `/api/v1/*` (no module route) | platform token | — | — | without a valid token: `401 UNAUTHENTICATED` or `401 TOKEN_EXPIRED`; with one: `404 NOT_FOUND` |
| any | `/api/*` outside `/api/v1` | none | — | — | `404 NOT_FOUND` |
| any | `/portal/v1/*` (no module route) | portal token | — | — | without a valid portal token: `401`; with one: `404 NOT_FOUND` |
| any | `/api/*`, `/portal/v1/*` in frontend-only mode | none | — | — | `503 BACKEND_NOT_CONFIGURED` |
| `GET` | any other path | none | — | — | the frontend, exactly as today (Vite in development, `dist/public` in production) |

`/health` sits outside `/api/v1` because it is infrastructure, not part of the versioned API (BACKEND_OBSERVABILITY_ARCHITECTURE.md, Health Check Endpoint). It does not use the error envelope; its body is always the status object.

### 6.2 Headers

| Header | When | Value |
|---|---|---|
| `X-Request-Id` | every response | the request's UUID (PS-05) |
| `WWW-Authenticate` | every 401 | `Bearer`, or `Bearer error="invalid_token"` for invalid and expired tokens |
| `Cache-Control` | `/health` | `no-store` |
| `Content-Type` | every API, portal and health response | `application/json; charset=utf-8` |

Request bodies are accepted only on `/api/v1` and `/portal/v1`, must be JSON, and are limited to 1 MB (BACKEND_API_ARCHITECTURE.md, API Security Standards).

### 6.3 Error envelope and platform error codes

Every error response under `/api/` and `/portal/v1/` uses this envelope (BACKEND_API_ARCHITECTURE.md, Error Handling Strategy):

```json
{ "error": { "code": "NOT_FOUND", "message": "The requested resource was not found.", "details": {}, "requestId": "4f6c…" } }
```

| Code | Status | Meaning | Raised by |
|---|---|---|---|
| `VALIDATION_ERROR` | 400 | Zod validation failed; `details` maps field paths to messages | PS-07, for any `ZodError` |
| `MALFORMED_JSON` | 400 | The body is not valid JSON | PS-07 |
| `UNAUTHENTICATED` | 401 | No token, wrong scheme, or invalid token | PS-10, PS-11 |
| `TOKEN_EXPIRED` | 401 | The token has expired | PS-10, PS-11 |
| `FORBIDDEN` | 403 | Authenticated but not allowed (`ForbiddenError`; first used in Phase 2) | modules |
| `NOT_FOUND` | 404 | No route; or the resource does not exist or belongs to another tenant (`NotFoundError`) | PS-07; modules |
| `CONFLICT` | 409 | State conflict (`ConflictError`; modules may use more specific codes) | modules |
| `PAYLOAD_TOO_LARGE` | 413 | Body over 1 MB | PS-07 |
| `BUSINESS_RULE_VIOLATION` | 422 | A business rule refused the request (`BusinessRuleError`; modules use specific codes such as those in BACKEND_API_ARCHITECTURE.md, Error Codes) | modules |
| `INTERNAL_ERROR` | 500 | Anything unexpected | PS-07 |
| `BACKEND_NOT_CONFIGURED` | 503 | Frontend-only mode (§4.6) | PS-04 |

Modules define their own codes as `AppError`s (for example `SUBMISSION_ALREADY_APPROVED`). Codes are `UPPER_SNAKE_CASE`. Messages are British English, written for the user, and contain no input values.

Status 413, and 503 for `BACKEND_NOT_CONFIGURED`, are not in BACKEND_API_ARCHITECTURE.md's status table; this specification adds them (§10). Status 429 (rate limiting) arrives in Phase 9.

### 6.4 Validation

Modules validate request bodies, path parameters and query parameters with Zod in their API layer (BACKEND_API_ARCHITECTURE.md, Validation Strategy). PS-07 turns any thrown `ZodError` into `400 VALIDATION_ERROR`. Zod checks shape only; business rules live in the Application Layer. Beyond this error mapping, Phase 0 provides no Zod helpers.

### 6.5 Pagination

BACKEND_API_ARCHITECTURE.md, Pagination Strategy fixes the convention every list endpoint follows:
- cursor-based, with `limit` defaulting to 50 and capped at 200;
- the cursor is base64-encoded JSON;
- the response shape is `{ "data": [...], "pagination": { "nextCursor", "hasMore", "limit" } }`.

Phase 0 has no list endpoint, and a shared pagination helper is not in the roadmap's Phase 0 list, so none is specified here. Whether the platform should provide one is OQ-17.

---

## 7. EVENTS

### 7.1 Produced and consumed

**None.** Phase 0 defines no domain event type and registers no subscriber; `server/modules/registry.ts` is empty. The first events arrive with Phase 1's tenant events (BACKEND_EVENT_ARCHITECTURE.md, Tenant Module Events).

Gate tests use test-only event types (for example `GateProbeRecorded`) and test subscribers. These are registered only in the test app built by `server/tests/support/`, never in `server/modules/registry.ts`.

### 7.2 What Phase 0 guarantees for every later event

| Guarantee | Mechanism |
|---|---|
| Written in the same transaction as the state change | PS-14 inside PS-12; there is no other write path |
| Never delivered if that transaction rolls back | The row does not exist until commit, and only the worker delivers (PS-17) |
| Delivered at least once to every subscriber of its type | PS-17 to PS-20: claim, retry with backoff, stale-lock recovery |
| Not passed again, by normal retries, to a subscriber that has already handled it | `delivered_subscribers`, written atomically with the subscriber's work and fenced by `locked_by` (PS-18) |
| Written once to the permanent event log, after every subscriber has handled it | PS-18 step 3, `ON CONFLICT (event_id) DO NOTHING` |
| Never lost after five failed attempts | The `dead_lettered` row is kept, with `last_error` (PS-19) |
| Carries `companyId` and is handled in that tenant's context | T-2 `company_id NOT NULL`; the subscriber context is built from it (BACKEND_EVENT_ARCHITECTURE.md: "No event may be processed without a valid `companyId`") |
| Traceable to its cause | `causation_event_id`, `causation_actor_id` (§4.1) |
| No ordering guarantee | §4.5, OQ-06 |

### 7.3 Payload and envelope rules for later specifications

- **Envelope:** §4.5, exactly as BACKEND_EVENT_ARCHITECTURE.md, Event Payload Standard. `eventVersion` is `"1.0"` for every event in v1.
- **Name:** `{Noun}{PastTenseVerb}`, in PascalCase.
- **Payload:** a JSON object of at most 64 KB, carrying identifiers and operational metadata and no financial amounts (§3.4, OQ-07).
- **Idempotency key:** `eventId` is unique for each event (`UNIQUE` on T-2 and T-3) and is the default idempotency key. A subscriber may instead use a natural key that is unique for each effect, such as the submission ID for Phase 5's normalisation subscribers. Each later specification names the key for every subscriber it defines.

---

## 8. AUDIT ENTRIES

### 8.1 Entry types defined in Phase 0

**None.** The platform takes no financially relevant action: it changes no financial record, approval state, job lifecycle, role, classification, automation or portal account (BACKEND_OBSERVABILITY_ARCHITECTURE.md, What Triggers an Audit Entry). Each later specification lists its own entry types from the frozen domains (DOMAIN_MODEL_SUMMARY.md, Audit Entry Types by Domain).

These Phase 0 occurrences are deliberately **not** audit entries. They are recorded in the application log, or for dead letters in the outbox row:

| Occurrence | Recorded as | Why not audit |
|---|---|---|
| Authentication failure (401) | PS-06 request log line | No state changes. Session audit entries (`SessionStarted`, `SessionRevoked`, revocations) are Phase 2 |
| Event delivery failure or dead letter | T-2 `status`, `retry_count`, `last_error`; `WARN` / `ERROR` log | Delivery state is operational, not a financially relevant action; the row itself is the permanent record |
| Stale-lock recovery | `WARN` log | Operational |
| Configuration failure | `FATAL` log | No tenant, no database |
| Migrations and grants | The Drizzle migration journal | Platform administration outside any tenant |

The gate tests use a test-only entry type, `gate_test_probe`. Only test code writes it, through `uow.audit.append`, and only in the test database.

### 8.2 How each audit field is filled (for every later entry type)

| Field (T-1) | Filled from | Can the caller set it? |
|---|---|---|
| `audit_id`, `sequence_no`, `occurred_at` | Database | No |
| `company_id` | `uow.context.companyId` | No |
| `actor_id`, `actor_role` | `uow.context.actor` (mapping in §4.1) | No |
| `causation_event_id`, `causation_actor_id` | `uow.context.causation` (worker subscriber context only) | No |
| `metadata.requestId` / `metadata.runId` | `uow.context` | No — merged over the caller's metadata, which cannot override them |
| `entry_type`, `source_object_type`, `source_object_id` | `AuditEntryInput` | Yes — required |
| `destination_object_type`, `destination_object_id` | `AuditEntryInput` | Yes — both or neither |
| `job_id`, `site_id`, `client_id` | `AuditEntryInput` | Yes — the domain requires `job_id` for financially relevant entries (OQ-05) |
| `previous_value`, `new_value` | `AuditEntryInput` | Yes — the audit log is where financial values belong (BACKEND_OBSERVABILITY_ARCHITECTURE.md, What Is NOT Logged); they are never copied into the application log |
| `external_reference` | `AuditEntryInput` | Yes |
| `metadata` (other keys) | `AuditEntryInput` | Yes |

Together these cover every field the Audit Doctrine requires:

| Audit Doctrine field | Column(s) |
|---|---|
| Who | `actor_*` |
| What | `entry_type` |
| When | `occurred_at` |
| Previous value / new value | `previous_value`, `new_value` |
| Source object / destination object | `source_object_*`, `destination_object_*` |
| External reference | `external_reference`, plus `job_id`, `site_id`, `client_id` for attribution |

---

*Sections 9–12 follow in the next commit of this job.*
