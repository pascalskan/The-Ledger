# THE LEDGER — PHASE 0 SPECIFICATION — INFRASTRUCTURE FOUNDATION

Version: 0.1 (draft)
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
| `FileStorage` interface and local-disk adapter | Phase 4 per the roadmap, although the PM brief and the platform-engineer definition expect it in Phase 0 (OQ-01) | Roadmap Phase 4 ("File upload via the `FileStorage` interface (per D-11)"); D-11 |
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
5. Application role cannot UPDATE or DELETE audit entries (test against the database)
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
| **D-11** File storage | Not built in Phase 0: the roadmap places `FileStorage` in Phase 4 and the phase table lists D-11 against Phases 4 and 9 only. Phase 0 reserves `server/platform/storage/` for it. The conflict with the PM brief is OQ-01 |
| **D-12** Hosted PostgreSQL for dev and test | `DATABASE_URL` (development) and `DATABASE_URL_TEST` (tests) point at separate databases on a hosted PostgreSQL project. Tests refuse to run unless the database name in every test URL ends in `_test` (§4.6). Only synthetic data is written. Phase 0 adds one variable pair the decision does not name — the migration-owner URLs — because the grant guarantee needs a second database role (§3.5, OQ-03) |
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
8. **Grants are explicit.** Every migration that creates a table also grants the application role exactly the privileges the table needs, column by column where only some columns may change. No `ALTER DEFAULT PRIVILEGES`, so a new table is unreachable by the application until its migration grants access (§3.5).
9. **No hard deletes.** The application role is never granted `DELETE` or `TRUNCATE` on a Phase 0 table (D-05 applies to the API from Phase 3; the platform tables follow it from the start).
10. **Migrations** are generated with `drizzle-kit generate` into `migrations/` and committed. Grants and anything else Drizzle cannot express go in custom migrations created with `drizzle-kit generate --custom --name=<name>`. A committed migration is never edited (roster, Folder Ownership). PostgreSQL 16 or later is assumed (`gen_random_uuid()` built in, identity columns, column-level grants).

### 3.2 T-1 `audit.audit_entries`

Source: BACKEND_DATA_ARCHITECTURE.md, Audit Entry Structure; DOMAIN_MODEL_SUMMARY.md, Universal Audit Fields; canonical context, Audit Doctrine.

Append-only and permanent. **Every column is immutable**: the application role can only INSERT and SELECT (§3.5).

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

Indexes (each leads with `company_id`, because every audit read is tenant-scoped):

| Name | Columns | Why |
|---|---|---|
| `audit_entries_pkey` | `(audit_id)` | Primary key |
| `audit_entries_sequence_no_key` | `(sequence_no)` | Unique identity |
| `audit_entries_company_sequence_idx` | `(company_id, sequence_no)` | Tenant timeline, cursor pagination |
| `audit_entries_company_occurred_idx` | `(company_id, occurred_at)` | Time-range filter (Audit Trail View) |
| `audit_entries_company_source_idx` | `(company_id, source_object_type, source_object_id)` | History of one entity |
| `audit_entries_company_job_idx` | `(company_id, job_id) WHERE job_id IS NOT NULL` | Job audit trail (mini-ledger doctrine) |

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

Indexes:

| Name | Columns | Why |
|---|---|---|
| `event_outbox_pkey` | `(outbox_id)` | Primary key |
| `event_outbox_event_id_key` | `(event_id)` | Unique envelope ID |
| `event_outbox_ready_idx` | `(next_attempt_at, created_at) WHERE status IN ('pending','failed')` | The worker's claim query touches only claimable rows |
| `event_outbox_processing_idx` | `(locked_at) WHERE status = 'processing'` | Stale-lock recovery |

Immutability of the envelope is enforced by the database: the application role has `UPDATE` only on the mutable columns listed above (§3.5).

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
| `occurred_at` | `timestamptz` | no | — | Copied from the outbox row | `occurred_at` |
| `logged_at` | `timestamptz` | no | `now()` | — | `logged_at` |

Indexes:

| Name | Columns | Why |
|---|---|---|
| `event_log_pkey` | `(event_log_id)` | Primary key |
| `event_log_event_id_key` | `(event_id)` | One log row per event |
| `event_log_company_occurred_idx` | `(company_id, occurred_at)` | Company and time range |
| `event_log_company_type_idx` | `(company_id, event_type, occurred_at)` | By event type |
| `event_log_company_source_idx` | `(company_id, source_object_type, source_object_id)` | By source object |

The event log is not a store for sensitive values (BACKEND_EVENT_ARCHITECTURE.md, Audit Log vs Event Log: "Sensitive fields: No (operational metadata only)"). Because the payload is copied verbatim, event payloads must carry identifiers and operational metadata, not financial amounts. Phase 0 cannot enforce this for payloads designed later; OQ-07 asks the owner to confirm it as a rule for every later specification.

### 3.5 Database roles and grants

Source: BACKEND_INFRASTRUCTURE_ARCHITECTURE.md, Audit Table Permissions ("enforced at the database permission level, not only in application code"); BACKEND_DATA_ARCHITECTURE.md, Audit Immutability Enforcement.

A PostgreSQL table owner always holds every privilege on its table, so "the application role cannot UPDATE or DELETE audit entries" is only true if the application does **not** connect as the owner. Phase 0 therefore uses two roles:

| Role | Used by | Owns | Connection variables |
|---|---|---|---|
| Owner role (the hosted project's database owner) | `npm run db:migrate`, `drizzle-kit`, the test harness's rebuild step | Every schema, table and sequence | `DATABASE_MIGRATION_URL` (development), `DATABASE_MIGRATION_URL_TEST` (tests) |
| `ledger_app` | The API process and the worker process at runtime; gate tests that act "as the application" | Nothing | `DATABASE_URL` (development), `DATABASE_URL_TEST` (tests) |

**Owner action before the first migration** (one-off, per hosted project; recorded for the owner checkpoint, OQ-03): create the application role **in SQL**, not in the hosting console. Some hosts give console-created roles extra privileges (Neon, for example, makes them members of `neon_superuser`), which would defeat the grants.

```sql
CREATE ROLE ledger_app LOGIN PASSWORD '<generated, stored only in the environment>'
  NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS;
GRANT CONNECT ON DATABASE <dev database> TO ledger_app;
GRANT CONNECT ON DATABASE <test database ending in _test> TO ledger_app;
```

**Grant migration** — a custom migration `migrations/0001_platform_grants.sql`, applied after the table migration. It first fails with a clear message if `ledger_app` does not exist, then:

```sql
REVOKE ALL ON SCHEMA audit, intelligence FROM PUBLIC;
REVOKE ALL ON ALL TABLES IN SCHEMA audit, intelligence FROM PUBLIC;
GRANT USAGE ON SCHEMA audit, intelligence TO ledger_app;

-- T-1: append-only
GRANT SELECT, INSERT ON audit.audit_entries TO ledger_app;

-- T-3: append-only
GRANT SELECT, INSERT ON intelligence.event_log TO ledger_app;

-- T-2: insert by the writing use case; delivery state changed by the worker only
GRANT SELECT, INSERT ON intelligence.event_outbox TO ledger_app;
GRANT UPDATE (status, retry_count, next_attempt_at, locked_at, locked_by,
              delivered_subscribers, last_error, delivered_at, dead_lettered_at)
  ON intelligence.event_outbox TO ledger_app;
```

If PostgreSQL requires a privilege on the identity sequence behind `audit_entries.sequence_no` for inserts by `ledger_app`, the migration grants `USAGE` on that sequence and nothing more; the gate tests prove an insert as `ledger_app` works.

What `ledger_app` must **not** have, on any Phase 0 table: `UPDATE` (except the listed outbox columns), `DELETE`, `TRUNCATE`, `REFERENCES`, `TRIGGER`, ownership, `CREATE` on either schema, superuser, `BYPASSRLS`, or membership of a role that has any of these (for example `pg_write_all_data`). It has no access to the `drizzle` schema where the migration journal lives. These are all gate-tested (§9).

Later phases follow the same pattern: each module migration grants `ledger_app` exactly what its tables need — financial record tables, for example, get `UPDATE (status)` only (DOMAIN_MODEL_SUMMARY.md, Invariant 2).

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

interface TenantContext   { readonly companyId: CompanyId }
interface ExecutionContext extends TenantContext {
  readonly actor: Actor;
  readonly requestId?: string;   // API requests
  readonly runId?: string;       // worker runs (§4.7)
}
```

Rules:

- A `CompanyId` is created only by `toCompanyId(value)`, which throws `MissingTenantContextError` unless the value is a UUID. The tenant middleware creates it from a verified token claim; the worker creates it from an outbox row. There is no default company and no way to construct an empty one.
- Every use case takes an `ExecutionContext` (or at least a `TenantContext`) as a required parameter. Omitting it is a TypeScript error; passing `undefined` or a non-UUID from untyped code is a runtime `MissingTenantContextError` (BACKEND_LAYERING_ARCHITECTURE.md: "Missing `company_id` in any query is a runtime error, not a silent bypass").
- The actor maps to the audit columns as: `user` → (`actor_id` = `userId`, `actor_role` = `role`); `portal_user` → (`portalAccountId`, `client`); `system` → (`NULL`, `system`).
- Event subscribers always run with a `system` actor (`component` = the subscriber name). The platform provides `isHumanActor(actor)`; later phases use it to refuse system actors on every approval path (Approval Doctrine; Invariant 8). Phase 0 itself has no approval path.

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
- `AuditEntryInput` has no `companyId`, `actorId`, `actorRole` or `occurredAt` fields: `AuditWriter` takes the company and actor from `uow.context` and the time from the database, so an entry can never be written for another tenant or another actor. It contains `entryType`, `sourceObjectType`, `sourceObjectId`, and optionally `destinationObjectType`/`destinationObjectId` (both or neither), `jobId`, `siteId`, `clientId`, `previousValue`, `newValue`, `externalReference`, `metadata`. It is validated with Zod (formats as in T-1) before the insert.
- `DomainEventInput` has `eventType`, `sourceModule`, `sourceObjectType`, `sourceObjectId`, `payload` (a JSON object). `OutboxWriter` adds `eventId`, `eventVersion` `'1.0'`, `companyId` and `actorId` from the context, and `occurredAt` from the database.

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
- The worker calls each subscriber for an event in **its own Unit of Work** (tenant = the event's `companyId`, actor = `system`/subscriber name). A failing subscriber therefore never undoes another subscriber's work.
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

Only the worker process changes `status`. The API process only inserts.

Retry schedule (BACKEND_INFRASTRUCTURE_ARCHITECTURE.md: "exponential backoff … (1s, 2s, 4s, 8s, max 5 retries); After 5 failures: marks event as `dead_lettered`"): read as **five attempts in total**, waiting 1 s, 2 s, 4 s and 8 s between them, and dead-lettered on the fifth failure — the four listed delays fit five attempts. Backoff after the n-th failure is `OUTBOX_BASE_BACKOFF_MS × 2^(n-1)`. Defaults: `OUTBOX_MAX_ATTEMPTS = 5`, `OUTBOX_BASE_BACKOFF_MS = 1000`, `OUTBOX_POLL_INTERVAL_MS = 1000`, `OUTBOX_BATCH_SIZE = 10`, `OUTBOX_STALE_LOCK_MS = 300000` (5 minutes). All are configurable so tests run in milliseconds.

**Audit entries and the event log have no lifecycle**: rows are inserted once and never change.

### 4.6 Configuration

Source: BACKEND_INFRASTRUCTURE_ARCHITECTURE.md, Application Configuration and Required environment variables; D-12.

`loadApiConfig(env)` and `loadWorkerConfig(env)` parse `process.env` with Zod and return a frozen, typed object. On failure they throw `ConfigError` listing **the names** of every missing or invalid variable and never their values; the process entry point logs that and exits with code 1 before opening a port or a connection.

| Variable | API | Worker | Rule |
|---|---|---|---|
| `NODE_ENV` | optional | optional | `development` \| `test` \| `production`, default `development` |
| `PORT` | optional | — | integer 1–65535, default `5000` (unchanged) |
| `LOG_LEVEL` | optional | optional | `fatal`…`debug`, default `info` |
| `DATABASE_URL` | required | required | PostgreSQL URL for the `ledger_app` role |
| `JWT_PRIVATE_KEY` | required | — | PKCS#8 PEM, P-256; `\n` escapes accepted; must import as an ES256 key at start-up |
| `JWT_PUBLIC_KEY` | required | — | SPKI PEM, P-256; must import as an ES256 key and match the private key |
| `PORTAL_JWT_SECRET` | required | — | at least 32 bytes |
| `OUTBOX_*` (five, §4.5) | — | optional | positive integers, defaults as listed |

Used outside the two processes:

| Variable | Used by | Rule |
|---|---|---|
| `DATABASE_MIGRATION_URL` | `npm run db:migrate`, `drizzle-kit` | PostgreSQL URL for the owner role |
| `DATABASE_URL_TEST` | test harness (as `ledger_app`) | database name must end in `_test` |
| `DATABASE_MIGRATION_URL_TEST` | test harness rebuild step (as owner) | database name must end in `_test` and equal the database in `DATABASE_URL_TEST` |

**Local `.env` file.** Outside production, the loader reads `.env` from the app folder if it exists (`process.loadEnvFile`), and variables already set in the environment win. `.env` is added to `.gitignore`; `.env.example` (names and placeholder values only) is committed. On Replit the variables come from Secrets. Because the API now requires a database URL and keys to start, `npm run dev` — and therefore the Playwright suite, which runs against it — needs a configured `.env` (OQ-13).

**Test-database guard (D-12).** `assertTestDatabase(urls)` in `server/platform/config/test-database.ts` refuses, before any connection is opened, if: a test URL is missing; its database name (the URL path, percent-decoded, case-sensitive) does not end in `_test`; the two test URLs name different databases; or the test database equals the database in `DATABASE_URL` or `DATABASE_MIGRATION_URL` when those are set. The Vitest global setup and every test database client call it.

**Test database lifecycle.** At the start of each gate-test run the harness, connected as the owner, drops and recreates the platform schemas by dropping `audit`, `intelligence` and `drizzle` (`CASCADE`) and re-running every migration. This is the only way audit rows are ever removed, and it happens only in a database that passed the guard. Gate tests then connect as `ledger_app`. Gate test files run one at a time (`fileParallelism: false` for the gate project) because some tests change grants or fail the database on purpose.

### 4.7 Logging and errors

Source: BACKEND_OBSERVABILITY_ARCHITECTURE.md, Logging Strategy; BACKEND_API_ARCHITECTURE.md, Error Handling Strategy and Error Logging; roster, Shared Rules — Doctrine.

**Logger.** One `pino` logger per process (`service: 'api'` or `service: 'worker'`), JSON to stdout, with:
- `level` written as an upper-case label (`"level":"INFO"`) and `timestamp` as ISO 8601, `message` as the message key — the structure in BACKEND_OBSERVABILITY_ARCHITECTURE.md, Log Structure;
- a mixin that adds `requestId`, `companyId` and `userId` (API) or `runId` (worker) from the active execution context (an `AsyncLocalStorage` in `server/platform/context/request-context.ts`);
- no transports and no `pino-pretty` (nothing runs in a worker thread; the production bundle stays simple).

**What is logged per request** — exactly one line when the response finishes, for paths under `/api/`, `/portal/v1/` and `/health` (Vite asset requests are not logged): `requestId`, `method`, `path` (Express `req.path` — the query string is never logged), `statusCode`, `durationMs`, and `companyId`/`userId` when the request was authenticated. Level `INFO`; `/health` at `DEBUG`.

**What is never logged** (BACKEND_OBSERVABILITY_ARCHITECTURE.md, What Is NOT Logged; roster doctrine): request bodies, response bodies, query strings, headers (in particular `Authorization` and `Cookie`), JWTs, passwords, financial amounts, event payloads, audit `previous_value`/`new_value`, personal data beyond user ID. The logger is never given a request or response object, so no serializer can expand one.

**Error serializer** (`server/platform/logging/error-serializer.ts`), used by every log call that carries an error: keeps `name`, `code`, `message`, `stack`, and for PostgreSQL errors `constraint`, `table`, `column`. It drops every other property — in particular PostgreSQL `detail` and `where` (which contain row values), and any `query`, `params` or `parameters` property added by a database library. Messages that are known to embed input are replaced, not logged: a JSON parse error (V8 quotes the start of the body) is logged as `MALFORMED_JSON` with no message.

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
    storage/              reserved for FileStorage (OQ-01)
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
3. `domain/` imports nothing from `application/`, `infrastructure/`, `api/`, the platform, or any of `express`, `drizzle-orm`, `pg`, `jose`, `pino`.
4. `application/` imports `domain/` and the platform's public surface; not `infrastructure/` internals, `api/`, `express`, `drizzle-orm` or `pg`.
5. `infrastructure/` does not import `application/` or `api/`.
6. `api/` does not import `domain/` or `infrastructure/` directly.
7. `index.ts` exports DTOs and public functions, never domain entities (checked in review; not machine-checkable in Phase 0).
8. Nothing under `server/platform/` imports from `server/modules/` except `registry.ts`, and only from the two process entry points.

Rule 4 and rule 5 read the layering document's dependency directions literally (Application → Domain; Infrastructure → Domain). The Application Layer reaches its repository implementations through the interfaces it is given (dependency injection at the module's `index.ts`), which BACKEND_LAYERING_ARCHITECTURE.md allows ("May call infrastructure implementations through injected interfaces").

---

*Sections 5–12 follow in the next commits of this job.*
