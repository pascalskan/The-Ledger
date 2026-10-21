# THE LEDGER — PHASE 0 SPECIFICATION — INFRASTRUCTURE FOUNDATION

Version: 0.4 (draft) — 0.2 applied PM review of 33d9b6b (A–G); 0.3 applied review round 1 (R1-01 to R1-05); 0.4 applies review round 2 (R2-B1, R2-B2, R2-01 to R2-18, OQ-09 ruling)
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
| **D-17** Approval → financial record in one transaction (decided after this specification raised it as OQ-16) | Phase 0 builds no approval, but it provides the mechanism D-17 relies on: passing the caller's Unit of Work across modules (§4.4) and typed ports wired at the composition root (PS-16, §4.8 `requiresPorts` / `providesPorts`). §4.9 maps every D-17 requirement to it |

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
8. **Grants are explicit.** Every migration that creates a table also grants the runtime roles (§3.5) exactly the privileges the table needs, column by column wherever only some columns may be inserted or changed. Privileges both processes need go to the group role `ledger_runtime`. API-only privileges go to `ledger_app`. Worker-only privileges go to `ledger_worker`. There is no `ALTER DEFAULT PRIVILEGES`, so a new table is unreachable by the application until its migration grants access.
8a. **Financial and approval writes are API-only — a binding rule for every later phase (R2-B1, D-17).**
    - No privilege on any `financial.*` table is ever granted to `ledger_runtime` or `ledger_worker`.
    - No `UPDATE` of an approval-state column (a submission's `status`, `approved_by`, `approved_at`, rejection fields, or anything that records an approval decision) is ever granted to `ledger_runtime` or `ledger_worker`.
    - These go to `ledger_app` only. Under D-17, approval and the financial records it creates both run in the API's request transaction, so no worker path ever needs them.
    - A phase may grant `ledger_worker` `INSERT` on a `review` submission table only if its specification names the subscriber that needs it. Phase 4's timesheet creation from `ShiftEnded` is the expected case: it creates a `pending_review` submission and approves nothing.
    - The Phase 5 gate must include an attack: as `ledger_worker`, an `INSERT` into each `financial.*` table is refused with 42501 (§4.10).
9. **No hard deletes.** No runtime role is ever granted `DELETE` or `TRUNCATE` on a Phase 0 table (D-05 applies to the API from Phase 3; the platform tables follow it from the start).
10. **Migrations** are generated with `drizzle-kit generate` into `migrations/` and committed. Grants and anything else Drizzle cannot express go in custom migrations created with `drizzle-kit generate --custom --name=<name>`. A committed migration is never edited (roster, Folder Ownership). PostgreSQL 16 or later is assumed (`gen_random_uuid()` built in, identity columns, column-level grants).

### 3.2 T-1 `audit.audit_entries`

Source: BACKEND_DATA_ARCHITECTURE.md, Audit Entry Structure; DOMAIN_MODEL_SUMMARY.md, Universal Audit Fields; canonical context, Audit Doctrine.

Append-only and permanent. **Every column is immutable**: the runtime roles can only INSERT and SELECT (§3.5).

| Column | Type | Null | Default | Constraint / notes | Source field |
|---|---|---|---|---|---|
| `audit_id` | `uuid` | no | `gen_random_uuid()` | Primary key | `audit_id` |
| `sequence_no` | `bigint` | no | `GENERATED ALWAYS AS IDENTITY` | No index and no `UNIQUE` constraint in Phase 0 (R3-02). Uniqueness comes from the identity sequence: no runtime role may supply the column (§3.5). Insertion order; the stable sort and cursor key for later audit queries (entries in one transaction share `occurred_at`) | — (added, §10) |
| `company_id` | `uuid` | no | — | Taken from the Unit of Work's tenant context, never from the caller's entry (§4.4). Foreign key added in Phase 1 (§3.1.7) | `company_id` |
| `entry_type` | `text` | no | — | `CHECK (entry_type ~ '^[a-z][a-z0-9_]{2,99}$')` — the domain audit entry type, e.g. `timesheet_approved` | `entry_type` / "what" |
| `actor_id` | `uuid` | yes | — | The user (or portal account) who acted; `NULL` only for the system actor | `actor_id` / "who" |
| `actor_role` | `text` | no | — | `CHECK (actor_role IN ('ceo','pm','worker','client','system'))` and `CHECK ((actor_role = 'system') = (actor_id IS NULL))` | `actor_role` |
| `occurred_at` | `timestamptz` | no | `now()` | Set by the database (transaction time). `AuditWriter` never sends it | `occurred_at` / "when" |
| `source_object_type` | `text` | no | — | `CHECK (length(source_object_type) BETWEEN 1 AND 100)` | `source_object_type` |
| `source_object_id` | `uuid` | no | — | — | `source_object_id` |
| `destination_object_type` | `text` | yes | — | `CHECK ((destination_object_type IS NULL) = (destination_object_id IS NULL))` | `destination_object_type` |
| `destination_object_id` | `uuid` | yes | — | see above | `destination_object_id` |
| `job_id` | `uuid` | yes | — | Required by the domain when the entry is financially relevant; enforced by the audit catalogue: `append()` refuses a missing `jobId` for a `jobRequired` type (§4.4, R2-16) | `job_id` |
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

Indexes — **write cost first (R3-02).** The audit table is written by every financially relevant action from Phase 1 onward, and every index is paid for on every write. Phase 0 therefore creates only the indexes that a constraint, or a reader in Phases 0–6, needs:

| Name | Columns | Kept because |
|---|---|---|
| `audit_entries_pkey` | `(audit_id)` | Primary key. `AuditWriter` returns `audit_id`, and gate tests look entries up by it |

No other index exists in Phase 0, because no Phase 0–6 code reads audit entries by anything else. The readers of the Audit Trail View — the audit query service and `/api/v1/audit/` — are unassigned (OQ-11; proposed Phase 7). Gate tests in later phases look entries up within one test company, in a small test database, so a sequential scan costs nothing there.

The phase that builds the audit query adds, in the same migration as its reader, the indexes that reader needs. The expected set:
- `(company_id, sequence_no)` — timeline and cursor;
- `(company_id, occurred_at)`;
- `(company_id, source_object_type, source_object_id)`;
- `(company_id, job_id) WHERE job_id IS NOT NULL`;
- `(company_id, causation_event_id) WHERE causation_event_id IS NOT NULL`;
- the actor and entry-type indexes.

By then the table already holds rows, so that phase builds the indexes with `CREATE INDEX CONCURRENTLY`, in a custom migration that runs outside a transaction.


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
| `job_id` | `uuid` | yes | — | Job attribution, from `DomainEventInput.jobId`. Required for event types whose catalogue entry says `jobRequired` (§4.5). Canonical context: Event Bus Doctrine and Activity Feed Doctrine ("Job attribution preserved on all event records") | no | — (added, §10.3) |
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
| `event_outbox_pkey` | `(outbox_id)` | Primary key; every worker `UPDATE` (PS-18 to PS-20) finds its row by it |
| `event_outbox_event_id_key` | `(event_id)` | Constraint: `eventId` is every subscriber's default idempotency key (§7.3), so a duplicate must be impossible |
| `event_outbox_ready_idx` | `(next_attempt_at, created_at) WHERE status IN ('pending','failed')` | Serves the claim (PS-17): an index range scan in `ORDER BY next_attempt_at, created_at` order, stopping at `LIMIT` (R3-01). Being partial, it holds only claimable rows, so it stays small however many events have been delivered |
| `event_outbox_processing_idx` | `(locked_at) WHERE status = 'processing'` | Serves stale-lock recovery (PS-20), which runs every cycle; at most a batch's worth of rows per worker are in it |

The outbox is the delivery table, not an archive. Delivered rows leave both partial indexes, so the per-write cost is the two unique indexes plus the partial indexes the row is in at that moment.

Immutability of the envelope is enforced by the database: only `ledger_worker` has `UPDATE`, and only on the mutable columns listed above; the API's role `ledger_app` can insert and read outbox rows but not change them (§3.5).

### 3.4 T-3 `intelligence.event_log`

Source: BACKEND_DATA_ARCHITECTURE.md, Event Log Table; BACKEND_EVENT_ARCHITECTURE.md, Event Log (Permanent Record) and Audit Log vs Event Log.

Permanent, append-only history of delivered events. **Every column is immutable** (INSERT and SELECT only).

| Column | Type | Null | Default | Constraint / notes | Source field |
|---|---|---|---|---|---|
| `event_log_id` | `uuid` | no | `gen_random_uuid()` | The documented row identifier. It is kept, but **not** indexed (R3-02): nothing looks a row up by it | `event_log_id` |
| `event_id` | `uuid` | no | — | **Primary key** — at most one log row per event, even if an event is redelivered. It is the conflict target of PS-18's `ON CONFLICT (event_id) DO NOTHING` | `event_id` |
| `event_type` | `text` | no | — | — | `event_type` |
| `event_version` | `text` | no | — | — | — (added, §10) |
| `source_module` | `text` | no | — | Event log is "queryable by … module" | — (added, §10) |
| `company_id` | `uuid` | no | — | Foreign key added in Phase 1 | `company_id` |
| `actor_id` | `uuid` | yes | — | `NULL` for system events | `actor_id` |
| `source_object_type` | `text` | no | — | — | `source_object_type` |
| `source_object_id` | `uuid` | no | — | — | `source_object_id` |
| `payload` | `jsonb` | no | — | Copied from the outbox row unchanged | `payload` |
| `job_id` | `uuid` | yes | — | Copied from the outbox row | — (added, §10.3) |
| `causation_event_id` | `uuid` | yes | — | Copied from the outbox row | — (added, §10) |
| `causation_actor_id` | `uuid` | yes | — | Copied from the outbox row | — (added, §10) |
| `occurred_at` | `timestamptz` | no | — | Copied from the outbox row | `occurred_at` |
| `logged_at` | `timestamptz` | no | `now()` | — | `logged_at` |

Constraints: the two causation checks of T-2.

Indexes:

| Name | Columns | Why |
|---|---|---|
| `event_log_pkey` | `(event_id)` | Primary key. It is required: it is the conflict target of PS-18's finish insert, and it makes "one log row per event" a database guarantee |

No other index exists in Phase 0 (R3-02). The event log's readers — the Event Monitor and the activity feed (CEO only) — arrive in Phase 7. That phase adds, with `CREATE INDEX CONCURRENTLY`:
- `(company_id, occurred_at)`;
- `(company_id, event_type, occurred_at)`;
- `(company_id, source_object_type, source_object_id)`;
- `(company_id, causation_event_id) WHERE causation_event_id IS NOT NULL`.

Making `event_id` the primary key saves one unique index compared with v0.4, which had a primary key on `event_log_id` plus a unique `event_id`.

The event log is not a store for sensitive values (BACKEND_EVENT_ARCHITECTURE.md, Audit Log vs Event Log: "Sensitive fields: No (operational metadata only)"). Because the payload is copied verbatim, event payloads must carry identifiers and operational metadata, not financial amounts. Phase 0 cannot enforce this for payloads designed later; OQ-07 asks the owner to confirm it as a rule for every later specification.

### 3.5 Database roles, grants and immutability triggers

Source: BACKEND_INFRASTRUCTURE_ARCHITECTURE.md, Audit Table Permissions ("enforced at the database permission level, not only in application code") and Process Model (two process types); BACKEND_DATA_ARCHITECTURE.md, Audit Immutability Enforcement; D-17.

**Why there are four roles.**
- A PostgreSQL table owner always holds every privilege on its table. "The application role cannot UPDATE or DELETE audit entries" therefore holds only if no runtime process connects as the owner.
- The API and the worker are separate processes with different jobs. One role for both would let an API bug change delivery state (for example, marking events `delivered` so they are never delivered). It would also let the worker reach anything granted to the API, including — from Phase 4 — approval-state and financial writes that, under D-17, only the API may perform.

So the two runtime login roles share only a group role, and neither inherits from the other:

| Role | Kind | Used by | Phase 0 privileges | Connection variables |
|---|---|---|---|---|
| Owner (the database owner) | login | `npm run db:migrate`, `drizzle-kit`, the test-database rebuild — **nothing else** | Owns every schema, table, sequence and function | `DATABASE_MIGRATION_URL`, `DATABASE_MIGRATION_URL_TEST` |
| `ledger_runtime` | **group, `NOLOGIN`** | — (granted to the two login roles below) | Schema `USAGE` on `audit`, `intelligence`. `audit.audit_entries`: `SELECT`, column-level `INSERT`. `intelligence.event_outbox`: `SELECT`, column-level `INSERT` of the envelope columns. `intelligence.event_log`: `SELECT` | — |
| `ledger_app` | login, member of `ledger_runtime` | The API process; runtime scripts such as D-15 provisioning | `ledger_runtime` only, in Phase 0. API-only privileges arrive in later phases (§3.1.8a) | `DATABASE_URL`, `DATABASE_URL_TEST` |
| `ledger_worker` | login, member of `ledger_runtime` | The worker process | `ledger_runtime`, plus `intelligence.event_outbox`: `UPDATE` of the delivery-state columns; `intelligence.event_log`: column-level `INSERT` | `DATABASE_WORKER_URL`, `DATABASE_WORKER_URL_TEST` |

The roles relate as follows:
- `ledger_app` and `ledger_worker` are **not** members of each other. A privilege granted to one is never reachable from the other.
- Module privileges both processes need (for example, Phase 2's identity tables, used by the API and by the `TenantProvisioned` subscriber) go to `ledger_runtime`.
- §3.1.8a lists what must never go there.

Considered and not chosen:
- **One shared role.** It leaves the API able to rewrite delivery state and write `event_log` rows for events that were never delivered.
- **The worker as a member of `ledger_app`** (v0.2). Every later API-only grant, financial writes included, would silently reach the worker.

**Owner action before the first migration** (one-off per database server; owner checkpoint, OQ-03). The owner runs the following in `psql` against each database server. Create the roles **in SQL as the owner**, so they have exactly the attributes listed and none of the memberships a hosting console may add by default:

```sql
CREATE ROLE ledger_runtime NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS;
CREATE ROLE ledger_app     LOGIN   NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS;
CREATE ROLE ledger_worker  LOGIN   NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS;
\password ledger_app        -- psql prompts, then sends only a SCRAM verifier; no plain text in history or logs
\password ledger_worker
GRANT ledger_runtime TO ledger_app    WITH INHERIT TRUE;     -- PostgreSQL 16 syntax
GRANT ledger_runtime TO ledger_worker WITH INHERIT TRUE;

-- for the development database and for the test database (name ending _test):
REVOKE CONNECT, TEMPORARY ON DATABASE <database> FROM PUBLIC;
GRANT  CONNECT            ON DATABASE <database> TO ledger_app, ledger_worker;
```

- **Other roles lose PUBLIC's default `CONNECT`.** Revoking `CONNECT` from `PUBLIC` also cuts off any other existing role that relied on it, for example a hosting provider's monitoring role or a developer's personal role. Before running the `REVOKE`, the owner lists the existing roles (`\du`) and grants `CONNECT` explicitly to every other role that must still reach the database.
- **Passwords.** Use the psql `\password` meta-command, or `ALTER ROLE … PASSWORD 'SCRAM-SHA-256$…'` with a verifier computed offline. Never type a plain-text password into a SQL statement.
- **Roles are cluster-wide.** Production must therefore use its own database server or project, or distinct role names. Otherwise the production `ledger_app` would be the same role that can connect to the development and test databases.

**Grant migration** — the custom migration `migrations/0001_platform_grants.sql`, applied after the table migration. It first fails with a clear message if any of the three roles is missing, if either login role is not a member of `ledger_runtime`, or if `ledger_app` and `ledger_worker` are members of each other. It then runs:

```sql
REVOKE CREATE ON SCHEMA public FROM PUBLIC;
REVOKE ALL ON SCHEMA audit, intelligence FROM PUBLIC;
REVOKE ALL ON ALL TABLES IN SCHEMA audit, intelligence FROM PUBLIC;
REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA audit, intelligence FROM PUBLIC;
GRANT USAGE ON SCHEMA audit, intelligence TO ledger_runtime;

-- T-1: append-only; only content columns may be supplied (audit_id, sequence_no, occurred_at come from the database)
GRANT SELECT ON audit.audit_entries TO ledger_runtime;
GRANT INSERT (company_id, entry_type, actor_id, actor_role, source_object_type, source_object_id,
              destination_object_type, destination_object_id, job_id, site_id, client_id,
              previous_value, new_value, external_reference, metadata,
              causation_event_id, causation_actor_id)
  ON audit.audit_entries TO ledger_runtime;

-- T-2: either process inserts envelope columns only; only the worker changes delivery state
GRANT SELECT ON intelligence.event_outbox TO ledger_runtime;
GRANT INSERT (event_id, event_type, event_version, source_module, company_id, actor_id,
              source_object_type, source_object_id, job_id, payload,
              causation_event_id, causation_actor_id)
  ON intelligence.event_outbox TO ledger_runtime;
GRANT UPDATE (status, retry_count, next_attempt_at, locked_at, locked_by,
              delivered_subscribers, last_error, delivered_at, dead_lettered_at)
  ON intelligence.event_outbox TO ledger_worker;

-- T-3: read by both; written only by the worker, copying the outbox row (event_log_id, logged_at from the database)
GRANT SELECT ON intelligence.event_log TO ledger_runtime;
GRANT INSERT (event_id, event_type, event_version, source_module, company_id, actor_id,
              source_object_type, source_object_id, job_id, payload,
              causation_event_id, causation_actor_id, occurred_at)
  ON intelligence.event_log TO ledger_worker;
```

**Writers use explicit column lists.** PostgreSQL checks column privileges against the insert's column list, including columns given the value `DEFAULT`, and Drizzle's insert builder lists every column. So `AuditWriter`, `OutboxWriter` and the worker's `event_log` insert use parameterised SQL (`sql` template) naming exactly the granted columns, with `RETURNING` only for `audit_id` and `event_id`. A row that supplies `occurred_at`, `sequence_no` (with or without `OVERRIDING SYSTEM VALUE`), `status`, `delivered_subscribers` or `next_attempt_at` is refused with 42501 (G0-20, G0-22).

**Sequence privilege.** `audit_entries.sequence_no` is an identity column. PostgreSQL draws identity values through an internal next-value expression that does not check privileges on the backing sequence (`serial` needs `USAGE`), so no sequence grant is expected. G0-20 settles it by inserting as `ledger_app`. If that insert is refused, the migration adds `USAGE` on that one sequence to `ledger_runtime` and nothing more.

**`event_log` writes** use `INSERT … ON CONFLICT (event_id) DO NOTHING`. Per the PostgreSQL `INSERT` documentation, extra privileges are needed only for `ON CONFLICT DO UPDATE` (UPDATE on the `SET` columns, SELECT on the columns it reads) and for `RETURNING`; `DO NOTHING` needs only INSERT. `ledger_worker` also has SELECT through `ledger_runtime`.

**Immutability triggers — owner included (R2-09).** Grants stop the runtime roles. The owner, though, could still change history with ordinary DML. A third migration, `migrations/0002_platform_immutability.sql` (custom), therefore adds:

```sql
CREATE FUNCTION audit.refuse_change() RETURNS trigger LANGUAGE plpgsql
  SET search_path = pg_catalog AS $$
BEGIN
  RAISE EXCEPTION 'append-only table %.%: % refused', TG_TABLE_SCHEMA, TG_TABLE_NAME, TG_OP
    USING ERRCODE = 'insufficient_privilege';
END $$;
REVOKE EXECUTE ON FUNCTION audit.refuse_change() FROM PUBLIC;

CREATE TRIGGER audit_entries_no_update_delete BEFORE UPDATE OR DELETE ON audit.audit_entries
  FOR EACH ROW EXECUTE FUNCTION audit.refuse_change();
CREATE TRIGGER audit_entries_no_truncate BEFORE TRUNCATE ON audit.audit_entries
  FOR EACH STATEMENT EXECUTE FUNCTION audit.refuse_change();
CREATE TRIGGER event_log_no_update_delete BEFORE UPDATE OR DELETE ON intelligence.event_log
  FOR EACH ROW EXECUTE FUNCTION audit.refuse_change();
CREATE TRIGGER event_log_no_truncate BEFORE TRUNCATE ON intelligence.event_log
  FOR EACH STATEMENT EXECUTE FUNCTION audit.refuse_change();
```

What the triggers do and do not cover:
- **Owner DML is refused.** `UPDATE`, `DELETE` and `TRUNCATE` by the owner on T-1 or T-3 now fail.
- **Runtime roles are refused earlier.** They fail on the privilege check (42501) before any trigger fires. The trigger does not need `EXECUTE` from the caller: PostgreSQL does not check `EXECUTE` when a trigger fires.
- **The owner can still change history deliberately**, by dropping or disabling a trigger. That is a DDL change made with the migration credentials. The rule below and §3.6 keep those credentials out of every runtime path; this specification does not claim more.
- **Dropping is unaffected.** `DROP TABLE` and `DROP SCHEMA … CASCADE` fire no row or `TRUNCATE` triggers, so the test-database rebuild (§4.6) still works.

**Rule: runtime code never uses the owner credentials.** The API, the worker and every runtime script connect as a runtime role:
- D-15 provisioning and any future requeue tool use `DATABASE_URL` (`ledger_app`) or `DATABASE_WORKER_URL`, as their specification states.
- `DATABASE_MIGRATION_URL` is read only by `db:migrate`, `drizzle-kit` and the test harness.
- In production, the API and the worker refuse to start if `DATABASE_MIGRATION_URL` is present in their environment (§4.6).

**Runtime role self-check (R2-10), and how it is run (R3-03).** node-postgres does **not** await `pool.on('connect')` handlers, so a check attached there could run after the caller's first query. The check is therefore run by the platform's own acquire wrapper:
- `db/client.ts` exposes only `withClient(fn)`. It calls `pool.connect()`, and if the client is not yet in a platform-private `WeakSet` of verified clients, it runs the check below **as that client's first statement**, before `fn` runs. Only then does it add the client to the set.
- Every platform database access goes through `withClient`: `runInTransaction`, the health check, the worker's claim, finish, failure and recovery statements, and the test rebuild. Platform code never calls `pool.query` or `pool.connect` directly, and modules have no pool at all (rule 10).
- A client that fails the check is released with an error (`client.release(err)`), which destroys it rather than returning it to the pool. `withClient` then throws `RuntimeRoleError`, and no statement of the caller's has run.
- The `WeakSet` drops a client when the pool discards it, so a replacement connection is checked again.

The check is one query per physical connection, not per request:

```sql
SELECT current_user,
       r.rolsuper, r.rolbypassrls,
       EXISTS (SELECT 1 FROM pg_namespace n
                WHERE n.nspname IN ('audit','intelligence') AND n.nspowner = r.oid) AS owns_platform_schema
  FROM pg_roles r WHERE r.rolname = current_user;
```

The connection is accepted only if all of these hold:
- `current_user` is the role this pool expects: `ledger_app` for the API pool, `ledger_worker` for the worker pool;
- `rolsuper` and `rolbypassrls` are both false;
- `owns_platform_schema` is false.

Otherwise the connection is destroyed and an `ERROR` is logged. The log line names the failed condition and the role name — never the URL. In production the process then exits 1 with a `FATAL` line. In development the request or health check fails (503 or 500).

The check is provider-neutral: it uses only the PostgreSQL catalogue. It runs per connection, so it costs one query per pooled connection, not one per request.

**What no runtime role may have** on any Phase 0 table:
- `UPDATE`, except `ledger_worker` on the listed outbox columns;
- `INSERT` of any column not listed above;
- `DELETE`, `TRUNCATE`, `REFERENCES` or `TRIGGER`;
- ownership, or `CREATE` on `audit`, `intelligence` or `public`;
- `TEMPORARY` on the database;
- `USAGE` on schema `drizzle`;
- superuser or `BYPASSRLS`;
- membership of any role except `ledger_runtime`.

All of this is gate-tested (§9).

**Later phases** follow the same pattern. Each module migration grants exactly what its tables need, to the narrowest role that needs it: `ledger_runtime` for both processes, `ledger_app` for API-only, `ledger_worker` for worker-only. Rule §3.1.8a always applies. For example, financial record tables get `INSERT (content columns)` and `UPDATE (status)` for `ledger_app` only (DOMAIN_MODEL_SUMMARY.md, Invariant 2).

### 3.6 Migration files and configuration

| File | Content |
|---|---|
| `migrations/0000_platform_tables.sql` | Generated by `drizzle-kit generate --name=platform_tables`: `CREATE SCHEMA audit`, `CREATE SCHEMA intelligence`, T-1, T-2, T-3 with constraints and indexes |
| `migrations/0001_platform_grants.sql` | Custom migration (`drizzle-kit generate --custom --name=platform_grants`): role check and grants (§3.5) |
| `migrations/0002_platform_immutability.sql` | Custom migration (`--custom --name=platform_immutability`): `audit.refuse_change()` and the `UPDATE`/`DELETE`/`TRUNCATE` triggers on T-1 and T-3 (§3.5) |
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
  readonly eventId: string;              // the event whose subscriber is running — all module code can see
}

interface TenantContext   { readonly companyId: CompanyId }
interface ExecutionContext extends TenantContext {
  readonly actor: Actor;
  readonly causation: Causation | null;  // set only for subscriber work (below)
  readonly requestId?: string;           // API requests
  readonly runId?: string;               // worker runs (§4.7)
}
```

**What makes a context genuine (R2-01).**
- *Membership.* Every context a platform factory builds is added to a platform-private `WeakSet`. A context is genuine only if **that exact object** is a member. A copy made with spread, `Object.assign`, `structuredClone` or an object literal is not a member, even if every field matches.
- *Frozen.* A genuine context is deep-frozen — the context, its `actor` and its `causation` — so it cannot be edited in place.
- *Where it is checked.* `runInTransaction`, `tenantScope`, `tenantWhere`, `tenantValues` and every port wrapper check membership first. They throw `ForgedContextError` before any SQL runs.
- *Cost.* A `WeakSet` lookup, with no cryptography.

**Contexts expire (R2-01).**
- *Request contexts* are marked dead when the response emits `finish` or `close`.
- *Subscriber contexts* are marked dead when their Unit of Work closes.
- *Effect.* `runInTransaction` refuses a dead context with `ContextExpiredError`. Work kept alive after its request — a timer, or an un-awaited promise — can therefore never open a transaction in that request's name.

**Causation's hidden half (R2-02).**
- *Visible to modules:* `causation.eventId` only.
- *Platform-private:* the nearest human actor in the chain, `row.actor_id ?? row.causation_actor_id`. It is kept in a platform `WeakMap` keyed by the context, and only `AuditWriter` and `OutboxWriter` read it, to fill `causation_actor_id` (§3.2–§3.4).
- *Effect:* module code cannot read that actor, so cannot mistake it for an authority.

**Factories.** Modules receive contexts; only the platform and scripts make them.

| Factory | Where it is available | Produces | `causation` |
|---|---|---|---|
| Platform-token middleware | internal (runs on every authenticated `/api/v1` request) | `actor.kind = 'user'`, `companyId` from the token | `null` |
| Portal-token middleware | internal (runs on every authenticated `/portal/v1` request) | `actor.kind = 'portal_user'` | `null` |
| `createSystemContext(companyId, component)` | **only** `server/platform/system/index.ts` — importable from `server/scripts/**`, platform code, the two entry points and test files; never from `server/modules/**` (import rule 11, R2-03) | `actor.kind = 'system'` | `null` |
| Worker subscriber context | internal to `server/platform/events/` | `actor.kind = 'system'`, `component` = subscriber name, `companyId` from the outbox row | `{ eventId: row.event_id }`, plus the private human actor |

Causation is therefore recorded automatically, and module code cannot set, clear, forge or read its actor half:
- `AuditEntryInput` and `DomainEventInput` have no causation fields.
- The only context that carries causation is the one the worker builds from a claimed row.

Following `causation_event_id` through `event_log` and the audit table leads from any subscriber-written record back to the human action that started the chain (BACKEND_OBSERVABILITY_ARCHITECTURE.md, How Platform-Wide Traceability Is Preserved).

Rules:

- **Company IDs.** A `CompanyId` is created only by `toCompanyId(value)`, which throws `MissingTenantContextError` unless the value is a UUID.
  - `toCompanyId` is exported only from `server/platform/system/index.ts` (R2-03).
  - The tenant middleware creates a `CompanyId` from a verified token claim; the worker creates one from an outbox row.
  - Module code never creates one: it only receives `ctx.companyId`.
  - There is no default company and no way to construct an empty one.
- **Every use case takes an `ExecutionContext`** (or at least a `TenantContext`) as a required parameter.
  - Omitting it is a TypeScript error.
  - From untyped code, passing `undefined`, a non-UUID or a copied context fails at run time with `MissingTenantContextError` or `ForgedContextError` (BACKEND_LAYERING_ARCHITECTURE.md: "Missing `company_id` in any query is a runtime error, not a silent bypass").
- **Actor to audit columns.**

  | Actor kind | `actor_id` | `actor_role` |
  |---|---|---|
  | `user` | `userId` | `role` |
  | `portal_user` | `portalAccountId` | `client` |
  | `system` | `NULL` | `system` |
- **Subscribers are always `system`.** Event subscribers always run with a `system` actor whose `component` is the subscriber name.
- **`isHumanActor` is never authority on its own.** It returns true for `user` and `portal_user`.
  - An approval path must also call its module's `assertApproverAuthority` (role plus job scope; from Phase 2, re-loaded from the database rather than trusted from the token — §4.10).
  - Portal users are human but **never approvers** (CLAUDE.md RBAC rules: "Clients never receive operational management permissions").
  - Platform ports marked `humanOnly` accept only a `user` actor with no causation (PS-16).
- **No domain field is filled from causation (R2-02).** `approved_by`, `rejected_by`, `reviewed_by`, `requested_by`, `created_by` and every other `*_by` field are filled only from `ctx.actor` of a `user` (or, where the domain says so, `portal_user`) context. Causation records who started a chain; it never stands in for the acting user.
- **Platform types stop at the Application Layer.** Domain code uses plain `string` for company, user and object IDs. The Application Layer receives branded types from the platform (`CompanyId`, `ExecutionContext`) and passes their values into domain objects as strings; a `CompanyId` is assignable to `string`, so no conversion is needed.
  - A shared types-only kernel that domain code could import was considered and not chosen. BACKEND_LAYERING_ARCHITECTURE.md, Layer 1 says "Domain Layer → nothing (it is the foundation)". A kernel shared across modules would also couple every module's domain to one file (Module Boundary Rule 5: "The Domain Layer of a module is private to that module").
  - The cost is small: the brand guards use-case entry points and repository scoping, and both belong to the Application and Infrastructure Layers.
  - Value objects a domain needs (for example a module's own `Money`) are defined in that module's `domain/`.

### 4.2 Tenant-scoped data access

Source: BACKEND_MULTITENANCY_ARCHITECTURE.md, Layers 3–4 and the Enforcement Checklist.

**Reads.**
- `tenantScope(table, ctx)` returns the Drizzle condition `eq(table.companyId, ctx.companyId)`.
- `tenantWhere(table, ctx, ...conditions)` returns `and(tenantScope(table, ctx), ...conditions)`.

**Writes (R2-08).** `tenantValues(table, ctx, row)` returns `row` with `companyId` set from `ctx`. If `row` already carries a different `companyId`, it throws `TenantMismatchError` before any SQL runs.
- **Rule for every later phase:** every insert into a tenant table builds its values with `tenantValues`.
- Every update and delete builds its `WHERE` with `tenantWhere`.

**What all three helpers check.**
- They accept only tables that have a `companyId` column; any other table is a type error.
- They check the context is genuine and live (§4.1).
- They call `toCompanyId` internally, so a missing tenant also fails at run time.

**The tenant is also known to the database.** At the start of every transaction, `runInTransaction` runs `SELECT set_config('app.company_id', $1, true)`. The setting is transaction-local and cleared at commit or rollback. Phase 9's Row Level Security policies read it (`current_setting('app.company_id')`). Phase 0 defines no policies.

**Limits.** The platform cannot make Drizzle reject a hand-written query that bypasses these helpers. That remains:
- a review item;
- a boundary-scanner rule — module files may not name platform tables or open connections (rule 10);
- a cross-tenant gate test in every phase that owns tenant data;
- and, from Phase 9, RLS.

### 4.3 JWT claims

Source: BACKEND_AUTH_ARCHITECTURE.md, Access Token Claims, Portal Token Claims, Session Security; D-14; BACKEND_INFRASTRUCTURE_ARCHITECTURE.md, Required environment variables.

| | Platform access token | Portal access token |
|---|---|---|
| Algorithm | ES256 (P-256), `jose` | HS256, `jose` (OQ-02) |
| Signing key | `JWT_PRIVATE_KEY` (PKCS#8 PEM) | `PORTAL_JWT_SECRET`: base64 or base64url of at least 32 random bytes, measured **after decoding**; passed to `jose` as `createSecretKey(decoded)` |
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

1. **Algorithm pinned.** The platform verifier accepts only `ES256` and the portal verifier only `HS256`. `alg: none` and every other algorithm are refused.
2. **`jwtVerify` options.** `jwtVerify` is called with `issuer`, `audience`, `algorithms` and `requiredClaims: ['iss', 'aud', 'sub', 'iat', 'exp']`, with `maxTokenAge: '15m'` and no clock tolerance. A token without `exp`, or whose `iat` is more than 15 minutes ago, is refused. A token whose `iat` is in the future is refused explicitly as well (R2-14).
3. **Zod schema.** The payload is then parsed with the Zod schema for that token type.
   - `iat` and `exp` must be integers, with `0 < exp − iat ≤ 900`. A token minted by anything with a longer lifetime is therefore refused even before it expires.
   - A missing or malformed claim is refused — for example no `company_id`, or `role: 'client'` in a platform token.
4. **Typed result.** Verification returns a typed claims object; nothing downstream reads the raw payload.

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
| `active` | `runInTransaction` opens a database transaction (`READ COMMITTED`) and sets `app.company_id` (§4.2) | Repository calls with `uow.tx`, `uow.audit.append`, `uow.events.record`, port calls (PS-16) |
| `poisoned` | Any `append`, `record` or `humanOnly` port call fails — validation, catalogue, actor or database error | Nothing that changes the outcome. When `work` returns, the transaction is rolled back and `runInTransaction` rejects with `AuditWriteFailedError`, `OutboxWriteFailedError` or `HumanActorRequiredError` — **even if `work` caught the error and returned normally** |
| `committed` | `work` resolved and the unit was not poisoned | — |
| `rolled_back` | `work` threw, or the unit was poisoned | — |
| closed (`committed` or `rolled_back`) | — | Any later `append`, `record` or `tx` use throws `UnitOfWorkClosedError` and writes nothing |

Further rules:

- **Checks before the transaction opens.** `runInTransaction` checks that `ctx` is a genuine, live context (§4.1) and validates `ctx.companyId`.
- **No nesting, no savepoints (R2-06).**
  - Calling `runInTransaction` while a unit is active in the same async context throws `NestedUnitOfWorkError`.
  - `uow.tx` is a wrapper whose `.transaction()` method (Drizzle's savepoint API) also throws `NestedUnitOfWorkError`. A module therefore cannot roll back part of a unit and keep the rest, which would let it undo a failed audit write and commit without it.
  - Raw `SAVEPOINT`, `ROLLBACK`, `COMMIT`, `BEGIN`, `SET ROLE` and `set_config` statements in module code are forbidden by import rule 10.
  - A use case that calls another module's public function or port in the same transaction (D-06's closure, D-17's approval effects) passes its `uow` instead.
- **What poisoning catches.** It catches a *failed* audit or outbox write. It cannot catch a *missing* one: a use case that never calls `append` commits normally. A missing audit entry therefore stays a per-phase gate test — every financially relevant action asserts its entry exists in the same transaction — and a doctrine-review item. The audit catalogue below makes required entries discoverable, but does not force them.
- **`AuditEntryInput`.** The caller supplies:
  - `entryType`, `sourceObjectType`, `sourceObjectId`;
  - optionally `destinationObjectType` with `destinationObjectId` (both or neither), `jobId`, `siteId`, `clientId`, `previousValue`, `newValue`, `externalReference` and `metadata`.

  It has no `companyId`, `actorId`, `actorRole`, `occurredAt` or causation field: `AuditWriter` takes the company, actor and causation from `uow.context`, and the time from the database. An entry can never be written for another tenant, another actor or a made-up cause. The input is validated with a **strict** Zod schema — unknown keys are refused — before the insert. `previousValue`, `newValue` and `metadata` are each limited to 64 KB once serialised.
- **`DomainEventInput`.** The caller supplies `eventType`, `sourceModule`, `sourceObjectType`, `sourceObjectId`, `payload` (a JSON object, at most 64 KB) and optionally `jobId`. It uses the same strict schema rules. `OutboxWriter` adds `eventId`, `eventVersion` `'1.0'`, `companyId`, `actorId` and causation from the context, and `occurredAt` from the database.

**Audit and event catalogues (R2-16; closes OQ-05).** Each module declares the audit entry types and event types it produces in its `ModuleRegistration` (§4.8):

```ts
auditEntryTypes?: readonly { type: string; jobRequired: boolean }[];   // e.g. { type: 'timesheet_approved', jobRequired: true }
producesEvents?:  readonly { type: string; jobRequired: boolean }[];   // e.g. { type: 'TimesheetApproved',  jobRequired: true }
```

| Check | When | Error |
|---|---|---|
| Each audit entry type and each event type is registered once across all modules | Start-up | Start-up error naming the type |
| `append()` refuses an unregistered `entryType`, and a missing `jobId` when the type is `jobRequired` | Each call | `AuditEntryTypeError` (poisons the unit) |
| `record()` refuses an unregistered `eventType`, a missing `jobId` when the type is `jobRequired`, and a `sourceModule` that is not the registering module's name | Each call | `EventTypeError` (poisons the unit) |
| A subscriber's `eventTypes` must all be registered event types, so a misspelt subscription fails | Start-up | Start-up error naming the subscriber and type |

The rules behind the catalogues:
- Each later specification lists its catalogue entries and their `jobRequired` flags from the frozen domains. For example, every financially relevant entry type is `jobRequired` (Job Attribution Doctrine; Invariant 6).
- The `job_id` columns stay nullable, because non-financial entries and events may have no job.
- Test registrations add `gate_test_probe` (audit) and `GateProbeRecorded` (event).
- The catalogue does not say which module may *write* a given entry type. Some domains share types (for example `inventory_mutation_created` appears in both the Report and Stock domains). The owning module registers each type once.

### 4.5 Events: envelope, subscribers and the outbox record lifecycle

Source: BACKEND_EVENT_ARCHITECTURE.md, Event Payload Standard, Event Lifecycle, Subscriber Registry; BACKEND_SERVICE_ARCHITECTURE.md, Event Bus Guarantee; BACKEND_INFRASTRUCTURE_ARCHITECTURE.md, Outbox Delivery Worker, Worker Resilience.

**Envelope** — what a subscriber receives. It follows the documented standard, plus the optional `jobId` (§10.3):

```ts
interface EventEnvelope {
  eventId: string; eventType: string; eventVersion: string; occurredAt: string; // ISO 8601 UTC
  companyId: CompanyId; actorId: string | null;
  sourceObjectId: string; sourceObjectType: string;
  jobId: string | null;
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

- **Registry.** The worker builds it once at start-up by calling every module's `subscribers(deps)` factory (§4.8). The API process never calls these factories. A duplicate subscriber name, a subscriber with no event types, or a subscription to an unregistered event type throws at start-up.
- **One Unit of Work per subscriber.** The worker calls each subscriber for an event in its own Unit of Work. The tenant is the event's `companyId`; the actor is `system`, named after the subscriber; causation comes from the outbox row (§4.1). A failing subscriber therefore never undoes another subscriber's work, and everything it writes is traceable to the event and the human behind it.
- **No human-only ports in subscribers (R2-B2).** The `deps` passed to `subscribers(deps)` cannot return a `humanOnly` port: `deps.ports.get` throws at start-up for one. The port wrapper also refuses any system or subscriber context at run time (PS-16).
- **Causation stays off the envelope.** The envelope has no causation fields; causation reaches the subscriber only through `uow.context.causation.eventId`.
- **Delivered subscribers are recorded atomically.** In the subscriber's own transaction, the worker appends the subscriber's name to `delivered_subscribers`, guarded by `locked_by` (§5). A retried event skips subscribers already listed. A worker that has lost its claim cannot commit a subscriber's work.
- **Every subscriber must be idempotent.** Delivery is at least once (BACKEND_EVENT_ARCHITECTURE.md). `delivered_subscribers` narrows duplicates but cannot remove them, for example when a subscriber has effects outside the database. Each subscriber is keyed on `eventId` or on its own natural key (for example a submission ID).
- **No ordering guarantee.** Events are claimed in `next_attempt_at, created_at` order, which is oldest first for events not yet tried, but nothing guarantees order across retries or worker instances. Subscribers must not depend on order (OQ-06).
- **Informational only.** Subscribers are informational and evaluative (Event Bus Doctrine). Their system actor can never satisfy a human-approval check.

**Outbox record state machine** (T-2 `status`). Interpretation of the sources: BACKEND_EVENT_ARCHITECTURE.md lists `pending → delivered → failed`; BACKEND_INFRASTRUCTURE_ARCHITECTURE.md adds the `processing` claim state and `dead_lettered`. Phase 0 uses all five, with `failed` meaning "the last attempt failed; waiting for the next one" (OQ-08).

| From | To | Triggered by | Condition | Side effects (same transaction) |
|---|---|---|---|---|
| — | `pending` | `OutboxWriter.record`, inside the writing use case's Unit of Work | The use case's transaction commits | — (the row disappears if it rolls back) |
| `pending`, `failed` | `processing` | Worker claim, in `next_attempt_at, created_at` order | `next_attempt_at <= now()`, and the row is not locked by another claimer (`FOR UPDATE SKIP LOCKED`) | `locked_at = now()`, `locked_by = <worker id>` |
| `processing` | `processing` | Worker, when it starts a row, and after each subscriber succeeds (lock heartbeat, R3-04) | `locked_by` still matches | `locked_at = now()`; after a subscriber, also that subscriber's own writes and its name appended to `delivered_subscribers` |
| `processing` | `delivered` | Worker, once every subscribed handler has succeeded (immediately if there are none) | `locked_by` still matches | `intelligence.event_log` row inserted (`ON CONFLICT (event_id) DO NOTHING`); `delivered_at = now()`; lock cleared |
| `processing` | `failed` | Worker, when a subscriber threw **or the lock went stale** | `retry_count + 1 < OUTBOX_MAX_ATTEMPTS` (and, for a thrown error, `locked_by` matches) | `retry_count += 1`; `next_attempt_at = now() + backoff`; `last_error` set; lock cleared |
| `processing` | `dead_lettered` | Same as the row above | `retry_count + 1 = OUTBOX_MAX_ATTEMPTS` | `retry_count += 1`; `dead_lettered_at = now()`; `last_error` set; lock cleared; `ERROR` log line (§4.7) |
| `delivered` | — | terminal — **never requeued** | | |
| `dead_lettered` | — | terminal in Phase 0 (no requeue tool) | | |

**Stale-lock recovery counts as a failed attempt** (OQ-09 — PM ruling, October 20, 2026). A row whose lock is older than `OUTBOX_STALE_LOCK_MS` is treated exactly like a failed attempt (PS-20). An event whose subscriber crashes the worker process every time therefore dead-letters after five crashes, instead of looping for ever.

Only the worker process changes `status`, and the database enforces it: only `ledger_worker` holds `UPDATE` on the delivery-state columns (§3.5). The API process (`ledger_app`) only inserts.

**Requeue and archival safety (R2-17)** — rules for the Phase 9 tooling (OQ-10), stated now so that nothing in Phase 0 contradicts them:
- Only `dead_lettered` rows can ever be requeued. A requeue moves the row to `failed` with `next_attempt_at = now()`, resets nothing else, and writes an audit entry naming the operator.
- A requeue **never clears `delivered_subscribers`**. Subscribers that already handled the event are never called again by a requeue; only the ones that failed run.
- `delivered` rows are never requeued.
- Archival removes only `delivered` rows older than the retention period. It runs as a maintenance role that has no other privilege, and never touches `dead_lettered`, `failed`, `pending` or `processing` rows.

**Retry schedule** (BACKEND_INFRASTRUCTURE_ARCHITECTURE.md: "exponential backoff … (1s, 2s, 4s, 8s, max 5 retries); After 5 failures: marks event as `dead_lettered`"). This is read as **five attempts in total**, with waits of 1 s, 2 s, 4 s and 8 s between them, and the event dead-lettered on the fifth failure; the four listed delays fit five attempts.
- The backoff after the n-th failure is `OUTBOX_BASE_BACKOFF_MS × 2^(n-1)`, where n is `retry_count` after that failure has been counted (PS-19).
- Defaults: `OUTBOX_MAX_ATTEMPTS = 5`, `OUTBOX_BASE_BACKOFF_MS = 1000`, `OUTBOX_POLL_INTERVAL_MS = 1000`, `OUTBOX_BATCH_SIZE = 10`, `OUTBOX_STALE_LOCK_MS = 300000` (5 minutes).
- All are configurable, so tests run in milliseconds.

**Audit entries and the event log have no lifecycle.** Rows are inserted once and never change.

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
| `PORTAL_JWT_SECRET` | backend variable | — | base64 or base64url text decoding to at least 32 bytes. It is refused if it equals, or is contained in, `JWT_PRIVATE_KEY` or `JWT_PUBLIC_KEY` (a pasted key is not a secret) |
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
| `production` | `DATABASE_MIGRATION_URL` (or either `_TEST` owner URL) present | **Fail fast** — runtime processes must never hold the owner credentials (§3.5). The worker applies the same rule |
| `development` / `test` | all four | **Full mode** |
| `development` / `test` | none of the four | **Frontend-only mode** |
| `development` / `test` | some but not all | **Fail fast** — a half-configured backend is a mistake, not a choice |

- **Full mode**: the API process opens the database pool, imports the keys and mounts `/health`, `/api/v1` and `/portal/v1` as described in §6.
- **Frontend-only mode** exists so frontend work on this branch is unchanged without a database (D-13). The API process opens **no** database connection and imports no keys. It mounts no module routers and no auth middleware. Every request under `/api/` or `/portal/v1/` gets `503` with the error envelope and code `BACKEND_NOT_CONFIGURED`, so API paths never fall through to the frontend. `GET /health` returns `200 {"status":"ok","mode":"frontend_only"}`. At start-up the process logs exactly one `WARN` line: "Backend not configured: running in frontend-only mode", with the four variable names and no values. The frontend is served exactly as now (Vite in development, static files otherwise).
- **The worker never has a frontend-only mode.** Without `DATABASE_WORKER_URL` it fails fast, because there is nothing useful it can do.

So `npm run dev` with no `.env` behaves as it does today for the frontend and the Playwright suite. A developer who wants the backend adds the variables to `.env`. The mode is chosen only by `NODE_ENV` and whether the variables are present — there is no "skip the backend" flag that could be left on by mistake. Production can never start without its backend. This is the proposal for OQ-13; the owner confirms it at the checkpoint.

**Empty means absent (R2-14).** A variable set to the empty string, or to whitespace only, counts as absent, both for the mode decision and for the required-variable checks. `DATABASE_URL=""` therefore cannot make a half-configured backend look unconfigured or configured.

**No backend secret behind a `VITE_` prefix (R2-14).** Vite exposes every `VITE_`-prefixed variable to the browser bundle. The API loader therefore fails with `ConfigError` if any variable name starts with `VITE_` and contains `DATABASE`, `JWT`, `SECRET`, `KEY`, `PASSWORD` or `TOKEN`. The error names the variable, never its value.

**Local `.env` file.**
- Outside production, the loader reads `.env` from the app folder if it exists (`process.loadEnvFile`). Variables already set in the environment win.
- `.gitignore` gains `.env*` with the exception `!.env.example`, so `.env.local`, `.env.test` and similar files are never committed.
- `.env.example` is committed. It lists every variable, and **every value in it deliberately fails validation** — for example `PORTAL_JWT_SECRET=replace-me` (too short once decoded) and `DATABASE_URL=postgresql://replace-me` (no database). Copying it unchanged therefore fails fast with the variable names; it can never start a backend with known secrets.
- On a hosted deployment the variables come from the host's secret store.

**Built bundles are always production.** `script/build.ts` passes esbuild `define: { "process.env.NODE_ENV": '"production"' }` (kept from the Replit starter). esbuild replaces that exact expression in the bundled code with the literal `"production"`. The loader is therefore required to resolve the environment name like this:

```ts
const nodeEnv = process.env.NODE_ENV === 'production'   // literal expression: replaced at build time
  ? 'production'
  : (env.NODE_ENV ?? 'development');                    // env = the object passed to the loader
```

The rule must be written with the literal `process.env.NODE_ENV`; reading it through a variable or a destructured copy would escape the replacement. Consequences:
- `dist/index.cjs` and `dist/worker.cjs` always run as production, whatever `NODE_ENV` is set to at run time.
- A built API never enters frontend-only mode, and fails fast unless all four backend variables are set.
- A built bundle never reads `.env`. To run a production build locally, the variables must be in the real environment.
- In development and tests (`tsx`, Vitest) the expression is evaluated at run time, so the mode table applies as written. Tests choose a mode by passing an `env` object to the loader.

G0-01 relies on this, and checks it. No other part of §4.6 or §9 assumes a bundle can run in development or frontend-only mode: G0-02 runs `npm run dev` (tsx), and G0-36 and G0-37 call the loader and `createApiApp` inside Vitest.

**Test-database guard (D-12, R2-12).** `assertTestDatabase(urls)` in `server/platform/config/test-database.ts` runs before any connection is opened.

How it reads each URL:
- It parses the URL with `pg-connection-string`, the parser the `pg` driver itself uses, so the guard and the driver cannot disagree about which database a URL names.
- Only `postgres:` and `postgresql:` URLs are accepted.
- Query parameters are refused, except an allowlist: `sslmode`, `sslrootcert`, `channel_binding`, `application_name`. This stops `?host=`, `?dbname=`, `?user=` or `?options=` from overriding what the path says.

It refuses if any of these holds:
- one of the three test URLs is missing or empty;
- a URL is a socket URL or has an empty database path;
- a database name (percent-decoded, case-sensitive) does not end in `_test`;
- the three test URLs name different databases;
- the test database name equals the database in `DATABASE_URL`, `DATABASE_WORKER_URL` or `DATABASE_MIGRATION_URL`, when those are set.

The **host-equality rule from v0.3 is dropped.** Hosted providers commonly give the same database a pooled and a direct host name, so the rule would refuse valid configurations. It is replaced by the server-side check below, which asks the database itself.

**Server-side checks.** Two checks stop a test run from touching a non-test database even if a URL is misread:
- `rebuildTestDatabase()` calls the guard itself. Then, on the live owner connection and before any `DROP`, it checks that `SELECT current_database()` ends in `_test` and equals the guarded name. Every `DROP SCHEMA` it issues is built with `format('DROP SCHEMA %I CASCADE', nspname)` from the catalogue, never by string concatenation.
- `db/client.ts` refuses, when running under Vitest (`process.env.VITEST` is set), to create a pool whose URL database does not end in `_test`. When creating it, it also adds `current_database()` to the first-use check of `withClient` (§3.5, R3-03), so a connection whose server-side database does not end in `_test` is destroyed before any test statement runs. An implementer's `*.db.test.ts` file can therefore never reach the development database by mistake.

**Tests never change roles.** Roles are cluster-wide, so a change would leak into every database on the server. Tests change only per-database object grants (for example revoking `INSERT` for G0-03), and restore them in `finally`. They never change role attributes or memberships.

The Vitest global setup and every test database client call the guard.

**Test database lifecycle.** At the start of each `db` or `gate` test run, the platform's global setup (`server/platform/testing/global-setup.ts`, §9.1) rebuilds the test database:
1. It runs the guard.
2. Connected as the owner, it drops every schema the owner role owns except `public`, with `CASCADE`. This includes `audit`, `intelligence`, `drizzle`, any test-only schema such as `gate_test`, and every later module schema, so the rule never needs updating.
3. It re-runs every migration.

Audit and event-log rows cannot be removed by any runtime role (grants), nor by owner DML (the immutability triggers, §3.5). In the test database they disappear only when this rebuild drops their schema as the owner, and the rebuild runs only in a database that has passed the guard.

Tests then connect as `ledger_app` for API behaviour and as `ledger_worker` for worker behaviour. They connect as the owner only to prove a database-level guarantee or to set up a failure on purpose.

Test files in the `db` and `gate` projects run one at a time (`fileParallelism: false`), because some tests change grants or fail the database on purpose. `npm test` runs `unit`, `db` and `gate` in that order, never at the same time, because `db` and `gate` share the test database.

### 4.7 Logging and errors

Source: BACKEND_OBSERVABILITY_ARCHITECTURE.md, Logging Strategy; BACKEND_API_ARCHITECTURE.md, Error Handling Strategy and Error Logging; roster, Shared Rules — Doctrine.

**Logger.** One `pino` logger per process (`service: 'api'` or `service: 'worker'`), JSON to stdout, with:
- `level` written as an upper-case label (`"level":"INFO"`) and `timestamp` as ISO 8601, `message` as the message key — the structure in BACKEND_OBSERVABILITY_ARCHITECTURE.md, Log Structure;
- a mixin that adds `requestId`, `companyId` and `userId` (API) or `runId` (worker) from the active execution context (an `AsyncLocalStorage` in `server/platform/context/request-context.ts`);
- no transports and no `pino-pretty` (nothing runs in a worker thread; the production bundle stays simple);
- **errors are always made safe, whatever key they are logged under (R2-13):**
  - `serializers: { err: safeError, error: safeError }`;
  - a `formatters.log` hook that passes **every top-level value that is an `Error`** through `safeError`, so `logger.warn({ failure: e })` is as safe as `logger.warn({ err: e })`;
  - `safeError` is the error serializer below.

**What is logged per request.** Exactly one line is written when the response finishes, for paths under `/api/`, `/portal/v1/` and `/health`; Vite asset requests are not logged. The line carries:
- `requestId`, `method`, `statusCode`, `durationMs`;
- `companyId` and `userId` when the request was authenticated;
- `route` — the **matched route template** (`req.baseUrl + req.route.path`, for example `/api/v1/jobs/:jobId`), never the raw path, capped at 256 characters (R2-13). A request that matched no route, including one refused with 401 before routing, is logged with `route: "<unmatched>"`. The raw path, the query string and path parameter values are therefore never logged.

The level is `INFO`, except `DEBUG` for `/health`.

**API path convention — binding on every later specification (R2-13; closes the carried R2-01).** Every path segment is either a fixed literal (`jobs`, `approve`) or a UUID path parameter. A path never carries an email address, a name, free text, a token, an amount or any other personal or financial value; those go in the JSON body or, for filters, in validated query parameters, which are never logged. A reviewer checks this by reading the route table in each phase specification's §6: every `:param` must be documented as a UUID, and its Zod path schema must be `z.string().uuid()`. The gate cannot prove the absence of such data in future routes, so the review is the control.

**What is never logged** (BACKEND_OBSERVABILITY_ARCHITECTURE.md, What Is NOT Logged; roster doctrine): request bodies, response bodies, query strings, headers (in particular `Authorization` and `Cookie`), JWTs, passwords, financial amounts, event payloads, audit `previous_value`/`new_value`, personal data beyond user ID. The logger is never given a request or response object, so no serializer can expand one.

**Error serializer** (`server/platform/logging/error-serializer.ts`) is used by every log call that carries an error. It works from an allowlist: only the fields named below are ever logged. Anything that can quote input is never logged in its own words.

| Error kind (how it is recognised) | Logged | Never logged |
|---|---|---|
| **PostgreSQL error** (the driver's `DatabaseError`: has a five-character SQLSTATE `code` and the protocol `severity` field) | `name`, `pgCode` (SQLSTATE), `severity`, `schema`, `table`, `column`, `constraint`, `dataType`, and a fixed message `"PostgreSQL error <code>"` | The server's `message` — **for every SQLSTATE class, not just class 22**. Class 22 data errors quote values (`22P02` "invalid input syntax for type uuid: "…""), but so can others: `P0001` raised by functions, `23514`/`23502` text naming rows, and any future message. Also never: `detail`, `hint`, `where`, `internalQuery`, `position`, and `stack`, whose first line repeats the message |
| **Database-library wrapper** (an error with a `query`, `params` or `parameters` property, or whose `cause` is a PostgreSQL error — for example Drizzle's query error, which puts the SQL and the bound parameter values in its message) | `name`, a fixed message `"Database query failed"`, and its `cause` serialized by these same rules | Its own `message`, `query`, `params`, `parameters`, `stack` |
| **JSON body-parser error** (`type === 'entity.parse.failed'`; V8's parse message quotes the start of the body) | `name`, code `MALFORMED_JSON` | `message`, `body`, `stack` |
| **Other client errors from Express or its parsers** — `http-errors`-style errors with `expose === true` and `status` 400–499, for example an unsupported charset or encoding, or a path parameter that cannot be decoded (R2-13) | `type`, `status` | `message` (it can quote the charset, encoding or path), `stack`, every other property |
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
    system/index.ts       createSystemContext, toCompanyId — scripts and platform only (rule 11)
    config/  logging/  context/  errors/  http/  auth/  db/  db/schema/  audit/  events/
    storage/              reserved for FileStorage (Phase 4, PM ruling)
    testing/index.ts      test-only surface: guard, test database rebuild, role clients (rule 1a)
  modules/
    registry.ts           the list of registered modules (empty in Phase 0)
    <module>/
      domain/  application/  infrastructure/  api/  index.ts
  scripts/                runtime scripts, e.g. Phase 1's D-15 provisioning script (none in Phase 0)
  tests/
    gate/phase-0-infrastructure/   gate tests (test engineer)
    support/                       harness, fixtures, helpers (test engineer)
migrations/
```

**Registry** (`server/modules/registry.ts`). The platform engineer creates it; each module engineer adds one line.

```ts
type Method = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
interface PublicRoute {                           // R2-04: public routes are declared, not routed freely
  surface: 'api' | 'portal';                      // /api/v1 or /portal/v1
  method: Method;
  path: string;                                   // exact, e.g. '/auth/login'; inside one of the module's namespaces
  handler: (deps: ModuleDeps) => RequestHandler;
}
interface ModuleRegistration {
  name: string;                                   // the module's schema name, e.g. 'review_centre'
  apiRouters?: Readonly<Record<string, (deps: ModuleDeps) => Router>>;
                                                  // key = an /api/v1 namespace it owns, e.g. '/jobs';
                                                  //   mounted at /api/v1<key>, behind platform-token auth
  portalRouters?: Readonly<Record<string, (deps: ModuleDeps) => Router>>;
                                                  // key = a /portal/v1 namespace; behind portal-token auth
  publicRoutes?: readonly PublicRoute[];          // each must be listed in that phase's specification
  subscribers?: (deps: ModuleDeps) => readonly Subscriber[];   // built by the worker only
  auditEntryTypes?: readonly { type: string; jobRequired: boolean }[];   // §4.4 catalogue
  producesEvents?:  readonly { type: string; jobRequired: boolean }[];   // §4.4 catalogue
  requiresPorts?: readonly PortToken<unknown>[];  // ports this module calls (it defines them)
  providesPorts?: readonly PortBinding<unknown>[];// ports this module implements (defined elsewhere)
}
export const modules: readonly ModuleRegistration[] = [];
```

**Namespaces (R2-04).** Each key of `apiRouters` or `portalRouters` is one namespace from BACKEND_API_ARCHITECTURE.md, Domain-Driven API Boundaries, for example `/jobs`, `/sites`, `/clients`, `/workers` and `/schedule` for the Operational module. A key is a single lower-case path segment (`^/[a-z][a-z-]*$`). At start-up the platform refuses:
- a namespace claimed by two modules;
- a namespace that is a prefix of another;
- a public route outside its own module's namespaces;
- two public routes with the same `surface`, `method` and `path`.

The platform mounts each router only at its own namespace. A module's router-level middleware therefore never runs on another module's paths. Public routes are mounted at their exact paths before token middleware, and nowhere else.

**`ModuleDeps` (R2-04, R2-07).** This is everything a module's factories receive from the platform:
- `runInTransaction`;
- `contextOf(req)`;
- `logger`;
- `ports` (`Ports.get`, PS-16);
- `nodeEnv`.

It carries **no** connection string, pool, database handle, key or secret, and no other configuration value. A later phase that needs a non-secret setting adds it here by name in its specification.

`contextOf(req)` reads the execution context from a per-request store, a platform-private `WeakMap` keyed by the request object, filled by PS-10/PS-11. It throws `MissingRequestContextError` (a 500 programming error) on any request that has no authenticated context, for example inside a public route. The request's `AsyncLocalStorage` scope is entered only with `run()`, never `enterWith()`, so a context can never leak into later, unrelated async work. `contextOf` does not depend on that storage.

**Process wiring.** Both processes read the same registry, check the catalogues and wire the ports:
- The API builds routers and public routes, and never calls `subscribers` factories.
- The worker builds subscribers, never builds routers, and its `deps.ports` refuses `humanOnly` ports (PS-16).

**Import rules** (each becomes a gate check, §9):

1. A file under `server/modules/<m>/` may import from the platform only via `server/platform/index.ts`.
   - 1a. Test files (`*.test.ts` anywhere, and everything under `server/tests/`) may also import `server/platform/testing/index.ts`. **No non-test file** imports `server/platform/testing/` or anything under `server/tests/` (R2-18).
2. A file may import another module only via `server/modules/<other>/index.ts`.
3. `domain/` imports only files inside its own module's `domain/` folder. That excludes every other layer, all platform code (types included — §4.1), other modules, Node built-in modules, and any package unless a phase specification allowlists it as pure and I/O-free. Platform-branded values reach the domain as plain strings (§4.1).
4. `application/` imports `domain/` and the platform's public surface. It does not import `infrastructure/` internals, `api/`, `express`, `drizzle-orm` or `pg`.
5. `infrastructure/` does not import `application/` or `api/`.
6. `api/` does not import `domain/` or `infrastructure/` directly.
7. `index.ts` exports DTOs, public functions and port tokens/types, never domain entities. This is checked in review; it cannot be machine-checked in Phase 0.
8. Nothing under `server/platform/` imports from `server/modules/`. Only the two process entry points (`server/index.ts`, `server/worker.ts`) import `server/modules/registry.ts`, and they pass the registrations into the platform.
9. Imports between modules form no cycle. If module A imports `server/modules/B/index.ts`, nothing reachable from B imports A. The intended dependency direction (BACKEND_DOMAIN_ARCHITECTURE.md, Domain Dependency Direction) is applied in review. A cycle is the machine-checkable symptom of an upward import, so it fails the gate.
10. **No module opens its own way into the database or around the platform (R2-07).** No file under `server/modules/**` may:
    - import `pg`, `pg-*`, `postgres`, `drizzle-orm/node-postgres`, `drizzle-orm/postgres-js` or any other driver;
    - mention `process.env`;
    - name a platform table or schema: the strings `audit_entries`, `event_outbox`, `event_log`, `pgSchema('audit')`, or `pgSchema('intelligence')` outside the Intelligence & Automation module;
    - contain the SQL keywords `SAVEPOINT`, `ROLLBACK`, `COMMIT`, `BEGIN`, `SET ROLE`, `SET SESSION AUTHORIZATION` or `set_config`.

    The Intelligence & Automation module (Phase 7) may declare its own tables in `pgSchema('intelligence')` through the handle from the platform index (§3.1.2), but still may not name `event_outbox` or `event_log`.
11. `server/platform/system/index.ts` (`createSystemContext`, `toCompanyId`) may be imported only from `server/scripts/**`, `server/platform/**`, the two entry points and test files — never from `server/modules/**` (R2-03).

Rules 4 and 5 read the layering document's dependency directions literally (Application → Domain; Infrastructure → Domain). The Application Layer reaches its repository implementations through the interfaces it is given (dependency injection at the module's `index.ts`), which BACKEND_LAYERING_ARCHITECTURE.md allows ("May call infrastructure implementations through injected interfaces").

### 4.9 Cross-module work: the patterns the platform supports

A state change in one module can cause work in another in three ways:

| Pattern | Direction | How | Consistency | Traceability |
|---|---|---|---|---|
| **Direct call, same transaction** | Downward only (caller is higher) | The caller's use case calls the lower module's public function from that module's `index.ts` and passes its own `uow`. Nesting is refused, so the work joins the caller's transaction (§4.4). Example: D-06's closure use case calling Operational Core's `transitionJobStatus` | Atomic | The caller's human actor is the actor on every entry; causation is `NULL` |
| **Port, same transaction** | Lower module calls a higher one, with every compile-time import still pointing downward | The lower module defines a port and calls it with its `uow`; the higher module implements it; the composition root wires the two (PS-16) | Atomic | As for a direct call |
| **Event subscriber** | Any | The caller records an event; a subscriber in the other module handles it in the worker (§4.5) | Eventual: the second module's work commits later, separately, and can fail, be retried or be dead-lettered | System actor plus `causation_event_id` / `causation_actor_id` (§4.1) |

**Approval → financial record: decided by D-17** (BACKEND_OPEN_DECISIONS.md, merged into `backend` @ 9500bca). The decision resolves the conflict this specification raised as OQ-16. On one side was BACKEND_DATA_ARCHITECTURE.md (Write Consistency Requirements, Transaction Boundary 2, "How Operational Truth Becomes Financial Truth" step 4). On the other were the earlier subscriber designs in BACKEND_EVENT_ARCHITECTURE.md and BACKEND_SERVICE_ARCHITECTURE.md. D-17 decides:
- Approving a submission and creating its financial records happen in one transaction.
- Review Centre is *lower* than Financial Normalization in the dependency direction (Financial Normalization depends on Submission & Review), so a direct Review Centre → Financial Normalization call would point upward and is forbidden. D-17 uses the **port** pattern instead. Review Centre's public surface defines an `ApprovalEffectsPort`: one handler per submission type, each called with the approval's Unit of Work and approval reference. Financial Normalization implements it. The process entry points wire it in through the module registry. Review Centre never imports Financial Normalization.
- The approval events are still written to the outbox in the same transaction for notifications, the activity feed and reporting. Financial Normalization no longer subscribes to them.

How the Phase 0 port design (PS-16) meets each part of D-17:

| D-17 requirement | Phase 0 mechanism |
|---|---|
| The port belongs to the lower module (Review Centre) | Review Centre's application layer calls `definePort<ApprovalEffectsPort>('review_centre.approvalEffects')` and exports the token and the port's TypeScript interface from `server/modules/review_centre/index.ts`. It lists the token in its `requiresPorts` |
| The higher module (Financial Normalization) implements it without Review Centre importing Financial Normalization | Financial Normalization imports only the token and the interface type from Review Centre's `index.ts` — a downward import (rules 2 and 9). It registers `providesPorts: [bind(approvalEffectsPort, deps => implementation)]`. Nothing in Review Centre names Financial Normalization, so the boundary check would catch it if it did (rule 9) |
| The composition root wires it | `server/index.ts` and `server/worker.ts` pass `modules` to the platform. The port registry matches `requiresPorts` to `providesPorts` and gives Review Centre's factories the implementation through `deps.ports.get(token)` at start-up |
| One transaction | Each handler takes the caller's `uow` as its first argument and writes through `uow.tx`, `uow.audit` and `uow.events`. It cannot open its own unit (nesting is refused, §4.4). If it throws, the whole approval rolls back |
| Records are attributed to the human approver | The handler runs in the approval request's execution context, so its audit entries and outbox events carry the approving user as actor, with `causation_*` `NULL` — they are not system work (§4.1 writer table) |
| No missing implementation at run time | If `review_centre.approvalEffects` has no provider, or two, **both processes refuse to start** and name the port (PS-16; G0-41). An approval can therefore never run against a missing handler |
| Only a human approver can trigger it (R2-B2) | The port is defined `humanOnly`. The platform wrapper refuses any context that is not a live, genuine `user` context with no causation, before the handler runs. The worker cannot obtain the port at all (PS-16) |

Phase 0 builds the generic mechanism only. `ApprovalEffectsPort`'s handlers, signatures and idempotency rules belong to the Phase 4 and Phase 5 specifications.

### 4.10 Binding obligations on later phases

Some of what Phase 0 guarantees holds only if later specifications respect it. Each later phase specification lists the rows below that apply to it, and its gate tests them.

| Phase | Obligation | Source |
|---|---|---|
| Every phase | Grant table privileges to the narrowest role that needs them. Never grant a `financial.*` privilege, or `UPDATE` on an approval-state column, to `ledger_runtime` or `ledger_worker` | §3.1.8a (R2-B1) |
| Every phase | Runtime code, scripts included, connects as a runtime role and never uses the owner URL | §3.5 (R2-09) |
| Phase 5 | Gate attack: as `ledger_worker`, an `INSERT` into each `financial.*` table must be refused with 42501 | §3.1.8a (R2-B1) |
| Every phase | Every insert into a tenant table builds its values with `tenantValues`; every read, update and delete uses `tenantWhere` | §4.2 (R2-08) |
| Every phase | No `*_by` field (`approved_by`, `rejected_by`, `requested_by`, …) is ever filled from causation. It is filled only from `ctx.actor` of a `user` context (or `portal_user`, where the domain says so). `isHumanActor` is never authority on its own | §4.1 (R2-02) |
| Every phase | List the module's audit entry types and event types, with their `jobRequired` flags, in its registration (catalogue); every financially relevant type is `jobRequired` | §4.4 (R2-16) |
| Every phase | Gate-test that each financially relevant action writes its audit entry: a missing `append` is not caught by poisoning | §4.4, PS-12 |
| Phase 4 | `review_centre.approvalEffects` is defined `humanOnly`; gate attack: calling it from a system or subscriber context is refused and writes nothing | PS-16 (R2-B2) |
| Phases 4 and 5 | Each approval-effects handler checks, inside `uow.tx`, that the approval reference is for a submission that is `approved` in this transaction with `approved_by` equal to the acting user, before creating anything | PS-16 (R2-B2) |
| Every phase | Event payloads carry identifiers and operational metadata, never financial amounts (OQ-07). Besides keeping the event log free of sensitive fields, this keeps amounts away from any surface that reads events: `event_log` is readable by `ledger_runtime`, and a future worker-facing or activity endpoint could otherwise expose them (Invariant 26) | §3.4, §7.3 |
| Every phase | Every path parameter is a UUID, and no path carries personal data or financial values | §4.7 (R2-13) |
| Phase 1 | The D-15 provisioning script records the operator's identity (an operator name or ID supplied on the command line, and the host account) in the audit entry's `metadata`. It connects as `ledger_app`, never with the owner URL | §3.5; OQ-14 |
| Phase 2 | Close the tenant-suspension window: a token must not stay usable for up to 15 minutes after its tenant is suspended or terminated (OQ-12) | §5.11 |
| Phase 2 | On approval and other authority-bearing paths, re-load the actor's current role and active status from `identity`, and do not trust the token's `role` claim alone | §4.1 |
| Phase 2 | The refresh-token cookie is `HttpOnly`, `Secure` and `SameSite=Strict`, with its `Path` limited to the refresh route; the refresh endpoint checks `Origin` | BACKEND_AUTH_ARCHITECTURE.md, Token Storage |
| Phases 4a and 5 | Name a detection path for a dead-lettered event whose subscribers have effects (for example stock-level updates), so a dead letter is never a silent gap | §4.5; BACKEND_OBSERVABILITY_ARCHITECTURE.md, Principle 3 |
| Phase 9 | TLS with full certificate verification (`sslmode=verify-full`) on every non-local database URL | §4.6 |
| Phase 9 | `idle_in_transaction_session_timeout` and `statement_timeout` for `ledger_worker` (and reviewed for `ledger_app`) | PS-18 |
| Phase 9 | Row Level Security on every tenant table, with `FORCE ROW LEVEL SECURITY`, reading `app.company_id` | §4.2 |
| Phase 9 | HSTS; a Content Security Policy for the frontend; rate limits (D-10); signing-key rotation with `kid` | §6.2, §4.3 |
| Phase 9 | Requeue and archival tooling that follows the §4.5 rules (OQ-10) | §4.5 (R2-17) |

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
3. In full mode: create the `ledger_app` pool (`pg.Pool` with `DATABASE_URL` and driver defaults; no connection is made yet). Then read `server/modules/registry.ts`: check the namespaces, public routes and catalogues (§4.4, §4.8), and wire the ports (PS-16). The API does not call `subscribers` factories. Any registry error stops the API with one `FATAL` line before it listens.
4. Call `createApiApp({ config, logger, db, modules })` (PS-04).
5. Mount frontend serving, unchanged: Vite middleware in development (`setupVite`), static files in production (`serveStatic`). It is mounted last, so the frontend catch-all can never shadow `/health`, `/api` or `/portal/v1`.
6. Listen on `PORT` (default 5000).

The API does not connect to the database at start-up; `/health` reports whether the database is reachable (BACKEND_OBSERVABILITY_ARCHITECTURE.md, Health Check Endpoint). The API process never runs the outbox worker.

### 5.4 PS-03 — Worker process start-up

Order in `server/worker.ts`:

1. Run `loadWorkerConfig`. Exit on `ConfigError`.
2. Create the logger (`service: 'worker'`) and the `ledger_worker` pool (`DATABASE_WORKER_URL`).
3. Read `server/modules/registry.ts`: check the catalogues, wire the ports (PS-16; `humanOnly` ports are not available to subscribers), and build the subscriber registry (PS-15). The worker builds no routers. Any registry error stops the worker with one `FATAL` line before it claims an event.
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
| 4 | `/api/v1` | `express.json({ limit: '1mb' })` → public routes with `surface: 'api'`, each at its exact method and path → PS-10 → each module's router at `/api/v1<namespace>` → not-found → PS-07 | — |
| 5 | `/api` (anything not matched above, e.g. `/api/v2/x`, `/api/foo`) | not-found → PS-07 | `503 BACKEND_NOT_CONFIGURED` for every `/api/*` path |
| 6 | `/portal/v1` | `express.json({ limit: '1mb' })` → public routes with `surface: 'portal'` → PS-11 → each module's portal router at `/portal/v1<namespace>` → not-found → PS-07 | `503 BACKEND_NOT_CONFIGURED` |
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
- Reads only `req.method`, the matched route template (`req.baseUrl + req.route.path`, or `<unmatched>`), `res.statusCode`, a monotonic duration and the request context. Nothing else from the request or response is read, and `res.json` / `res.send` are not patched.
- Level is `INFO`, except `DEBUG` for `/health`.
- A request that ends in a 5xx is also logged by PS-07, at `ERROR`, with the error.

### 5.8 PS-07 — Error handler and not-found handler

| Error | Status | Code | Message (British English, fixed text) | Logged |
|---|---|---|---|---|
| `AppError` | its status | its code | its `safeMessage` | `DEBUG` for 4xx, `ERROR` for 5xx |
| `ZodError` | 400 | `VALIDATION_ERROR` | "Request validation failed." — `details` is `{ "<path>": ["<issue message>", …] }`, path joined with `.`, root-level issues under `"_root"` | `DEBUG`, code and issue count only |
| JSON parse failure (`entity.parse.failed`) | 400 | `MALFORMED_JSON` | "Request body is not valid JSON." | `DEBUG`, code only |
| Body too large (`entity.too.large`) | 413 | `PAYLOAD_TOO_LARGE` | "Request body is too large." | `DEBUG`, code only |
| Unsupported charset or encoding (`charset.unsupported`, `encoding.unsupported`) | 415 | `UNSUPPORTED_MEDIA_TYPE` | "The request body's encoding is not supported." | `DEBUG`, type and status only |
| Any other `http-errors`-style client error (`expose === true`, status 400–499), for example a path parameter that cannot be URL-decoded | its status | `BAD_REQUEST` for 400, otherwise `CLIENT_ERROR` | "The request could not be processed." | `DEBUG`, type and status only |
| No route matched | 404 | `NOT_FOUND` | "The requested resource was not found." | `DEBUG` |
| Anything else | 500 | `INTERNAL_ERROR` | "An unexpected error occurred." | `ERROR` through the error serializer (§4.7), with `requestId`, `method`, `path` |

- Every response uses the envelope `{ "error": { "code", "message", "details", "requestId" } }`. `details` is always present (`{}` when empty).
- A response never contains a stack trace, any database text, or an error's own message — the only message passed through is an `AppError`'s `safeMessage`. The current Replit handler returns `err.message` to the client; this one does not (§10).
- If headers have already been sent, the handler only logs and ends the response.

### 5.9 PS-08 — Health check

- **Full mode:** acquires a pool connection and runs `SELECT 1`; the whole check has a 2-second timeout.
  - Success returns `200 {"status":"ok","mode":"full"}`.
  - Any failure or timeout returns `503 {"status":"unavailable","mode":"full"}`, and the failure is logged at `WARN` through the error serializer.
- **One check at a time (R2-15).** Concurrent `/health` requests share one in-flight check, and its result is reused for 1 second. A flood of health requests therefore uses at most one pool connection, and cannot exhaust the pool.
- **Headers:** the security headers in §6.2, including `Cache-Control: no-store`.
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

- **Input:** the `Authorization` header, which must match exactly `^Bearer ([A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+)$`: the scheme in that case, one space, and three base64url segments. The header may be at most 4 096 characters. Anything else gets `401 UNAUTHENTICATED` before any parsing (R2-14). Tokens are never read from a cookie or a query parameter.
- **Header missing, or scheme not `Bearer`:** `401 UNAUTHENTICATED` "Authentication is required.", with `WWW-Authenticate: Bearer`.
- **`TokenExpiredError`:** `401 TOKEN_EXPIRED` "Your session has expired.", with `WWW-Authenticate: Bearer error="invalid_token"`. The separate code lets the frontend refresh from Phase 2 on.
- **`TokenInvalidError`:** `401 UNAUTHENTICATED`, with the same header.
- **Success:** builds a genuine, frozen execution context, `{ companyId: toCompanyId(claims.company_id), actor: { kind: 'user', userId: claims.sub, role: claims.role }, causation: null, requestId }`, and:
  - registers it to die when the response finishes or closes (§4.1);
  - stores it in the per-request `WeakMap` that `contextOf(req)` reads (§4.8);
  - runs the remaining handlers inside `AsyncLocalStorage.run()`, which serves logging only.

  Routers read the context only through `contextOf(req)`; there is no other way for a handler to get a company ID. A public route has no context, and `contextOf` throws there.
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
- **Checks, before the transaction opens** (no SQL runs if any fails):
  - the context is genuine (`ForgedContextError`) and live (`ContextExpiredError`) — §4.1;
  - `toCompanyId(ctx.companyId)` succeeds;
  - no unit is already active in this async context (`NestedUnitOfWorkError`).
- **Transaction:** `BEGIN` (READ COMMITTED) → `SELECT set_config('app.company_id', $companyId, true)` → `work(uow)` → `COMMIT`. If `work` throws or the unit is poisoned (§4.4), `ROLLBACK` runs instead. Either way, the unit is then closed.
  - `uow.tx` refuses `.transaction()`, which would create a savepoint (R2-06).
- **What it cannot catch:** a use case that never calls `append`. A *failed* audit write poisons the unit; a *missing* one does not. Each phase's gate asserts that every financially relevant action writes its entry (§4.4).
- **Records written:** only what `work` writes, plus T-1 and T-2 rows through PS-13 and PS-14.
- **Errors:** an error thrown by `work` is rethrown unchanged. If the unit was poisoned but `work` returned normally, it throws `AuditWriteFailedError` or `OutboxWriteFailedError`, with the first failure as `cause`.

### 5.14 PS-13 — `AuditWriter.append`

- **Input:** `AuditEntryInput` (§4.4).
- **Checks:**
  - the unit is `active`;
  - strict Zod validation of the input against T-1's formats: unknown keys are refused; destination type and ID are both given or both omitted; `previousValue`, `newValue` and `metadata` are each at most 64 KB once serialised;
  - `entryType` is in the audit catalogue, and `jobId` is present if that type is `jobRequired` (§4.4).
- **Writes:** one row in `audit.audit_entries`, inside the caller's transaction, with an explicit-column insert (§3.5).
  - From the context: `company_id`, `actor_id`, `actor_role`, `causation_event_id`, `causation_actor_id` (from the platform-private slot, §4.1), and `metadata.requestId` / `metadata.runId`.
  - From the database: `occurred_at` and `sequence_no`.
- **Returns:** `audit_id`.
- **On failure** (validation or database): marks the unit poisoned, then throws. The caller's transaction cannot commit (§4.4).
- **Never** updates, deletes or reads audit rows. `AuditWriter` exposes only `append()` (BACKEND_DATA_ARCHITECTURE.md, Audit Immutability Enforcement), and the Drizzle table object for T-1 is not exported from `server/platform/index.ts`.

### 5.15 PS-14 — `OutboxWriter.record`

- **Input:** `DomainEventInput` (§4.4).
- **Checks:**
  - the unit is `active`;
  - strict Zod validation (unknown keys refused);
  - `eventType` is in the event catalogue, `sourceModule` is the module that registered it, and `jobId` is present if that type is `jobRequired` (§4.4);
  - `payload` is a plain JSON object of at most 64 KB once serialised — events carry identifiers, not documents (§3.4).
- **Writes:** one row in `intelligence.event_outbox`, inside the caller's transaction, with an explicit-column insert of the envelope columns only (§3.5). The database supplies `status = 'pending'` and the timestamps. `event_id` is generated; `company_id`, `actor_id`, `job_id` and `causation_*` come from the context and input.
- **Returns:** `event_id`.
- **On failure:** marks the unit poisoned, then throws.
- **Delivery** never happens in the writing process. The worker can see the row only once the caller's transaction commits, so a rolled-back transaction leaves no row and its event can never be delivered (gate item 3).
- The Drizzle table objects for T-2 and T-3 are not exported from the platform index.

### 5.16 PS-15 — Subscriber registry

- Built at start-up **by the worker only**, by calling every `ModuleRegistration.subscribers(deps)` factory (§4.8).
- **Checks:**
  - every subscribed event type is in the event catalogue (§4.4);
  - subscriber names are unique and match `^[a-z][a-z_]*\.[a-zA-Z][a-zA-Z0-9]*$`;
  - every subscriber lists at least one event type, each in PascalCase;
  - no subscriber lists the same event type twice.
- **Lookup:** `subscribersFor(eventType)` returns subscribers in registration order.
- Immutable after start-up.

### 5.17 PS-16 — Port registry (typed cross-module ports)

A port lets a lower module call into a higher one without importing it. The lower module defines the interface, the higher module implements it, and the process entry points wire the two together, so every compile-time import still points downward (BACKEND_LAYERING_ARCHITECTURE.md, Application Layer — cross-context calls only through "well-defined contracts"; BACKEND_SERVICE_ARCHITECTURE.md, Module Boundary Rules 1–2). The **first user is D-17's `ApprovalEffectsPort`** (Review Centre defines it, Financial Normalization implements it; Phases 4 and 5) — §4.9 maps each D-17 requirement to this mechanism. Phase 0 defines no ports.

```ts
interface PortToken<T> { readonly name: string; readonly __type?: T }   // phantom type carrier
function definePort<T>(name: string, options?: { humanOnly?: boolean }): PortToken<T>;
                                                      // called in the DEFINING (lower) module's application
                                                      //   layer; token + interface type exported from its index.ts
interface PortBinding<T> { readonly token: PortToken<T>; readonly create: (deps: ModuleDeps) => T }
function bind<T>(token: PortToken<T>, create: (deps: ModuleDeps) => T): PortBinding<T>;
                                                      // used by the IMPLEMENTING (higher) module
interface Ports { get<T>(token: PortToken<T>): T }    // deps.ports, see below
```

The registration fields are `requiresPorts` and `providesPorts` on `ModuleRegistration` (§4.8).

- **Port names** are `<defining module>.<port>`, for example `review_centre.approvalEffects`, and must be unique.
- **Calling convention.** The first argument of every port method is the caller's `uow`. The implementation works only through `uow.tx`, `uow.audit` and `uow.events`, inside the caller's transaction. It cannot start its own transaction (`NestedUnitOfWorkError`, §4.4). Its audit entries and events therefore carry the caller's actor — the human approver, in D-17's case — with causation `NULL`.
- **Human-only ports (R2-B2).** A port defined with `{ humanOnly: true }` is wrapped by the platform. Before the implementation runs, every method checks that its `uow` is active and that `uow.context` is genuine, live, has `actor.kind === 'user'` and has `causation === null`. If any check fails, the method throws `HumanActorRequiredError` **before the implementation runs**, so nothing is written. It also poisons the unit, so the caller cannot commit around the refusal.
  - Defence in depth: in the worker, `deps.ports.get` refuses a `humanOnly` token at start-up, so no subscriber can even hold one.
  - **Binding obligation on Phase 4 (§4.10):** `review_centre.approvalEffects` (D-17) must be `humanOnly`.
  - **Binding obligation on Phases 4 and 5 (§4.10):** before creating anything, each handler checks inside `uow.tx` that the approval reference it receives belongs to a submission in the `approved` state within this same transaction, and that its `approved_by` equals `uow.context.actor.userId`.
- **Wiring order at start-up** (both processes, inside the platform, from the `modules` list the entry points pass in):
  1. Collect every binding. A required port with no binding, a port with two bindings, or a binding for a port no module requires is a start-up error that names the ports.
  2. Create every implementation with `binding.create(deps)`. In this step `deps.ports.get` throws, so implementations cannot depend on other ports and no wiring cycle is possible.
  3. Build every module's routers (API) or subscribers (worker). In this step `deps.ports.get(token)` returns the implementation only for tokens listed in that module's own `requiresPorts`, and in the worker never for a `humanOnly` token. Any other token throws.
  4. After start-up `ports.get` throws, so a port can never be resolved lazily or swapped at run time.
- **Failure at start-up**: either process exits with code 1 and one `FATAL` line naming the port, before it listens (API) or claims an event (worker). There is no "missing handler" state at run time.
- **No transaction** of its own.

### 5.18 PS-17 — Outbox worker: claim

```sql
UPDATE intelligence.event_outbox
   SET status = 'processing', locked_at = now(), locked_by = $workerId
 WHERE outbox_id IN (
         SELECT outbox_id FROM intelligence.event_outbox
          WHERE status IN ('pending', 'failed') AND next_attempt_at <= now()
          ORDER BY next_attempt_at, created_at
          LIMIT $batchSize
          FOR UPDATE SKIP LOCKED)
RETURNING *;
```

- One statement in its own short transaction, run as `ledger_worker`. `SKIP LOCKED` ensures two workers never claim the same row.
- **Expected plan (R3-01).**
  - The `WHERE` matches the predicate of `event_outbox_ready_idx` and the `ORDER BY` matches its key order. The planner therefore uses an **Index Scan on `event_outbox_ready_idx`** with index condition `next_attempt_at <= now()`, then **LockRows**, then **Limit**. There is **no Sort node**, and the scan stops after `$batchSize` lockable rows.
  - So even after an outage with a large due backlog, a claim reads about `$batchSize` index entries, plus any rows other workers hold locked.
  - Rows that failed and are waiting (`next_attempt_at` in the future) lie beyond the index range and are never read. `processing` and `delivered` rows are not in the index at all.
  - The implementer confirms the plan with `EXPLAIN` against a test table of 10 000 due rows, and records the output in the commit report (§11, commit 8).
- **Order.** A pending row's `next_attempt_at` defaults to its insert time, the same value as `created_at`, so pending events are still claimed oldest first. A retried event is claimed by its retry time, so it can now come after newer pending events. That does not change any guarantee: there is no ordering guarantee across retries or workers (§4.5, OQ-06).
- The claim commits before any subscriber runs, so a slow subscriber never holds a row lock on the outbox.
- **No tenant context.** The claim spans all companies by design. It is the only cross-tenant query in Phase 0, and it reads no business data. Every later step runs in the claimed event's own tenant context.

### 5.19 PS-18 — Outbox worker: deliver one event

The worker handles each claimed row in claim order, under a new `runId`:

0. **Start the row: lock heartbeat (R3-04).** Before handling a row, the worker runs `UPDATE intelligence.event_outbox SET locked_at = now() WHERE outbox_id = $id AND status = 'processing' AND locked_by = $workerId`. If no row is updated, the claim was lost while earlier rows in the batch were being handled; the worker skips this row and records nothing. The `delivered_subscribers` append in step 2 also sets `locked_at = now()`. A lock's age is therefore bounded by **one subscriber's run time**, not by the batch: rows later in a batch do not age while earlier ones run.

1. **Prepare.** Build the envelope from the row (§4.5). The subscriber list is `subscribersFor(event_type)` minus `delivered_subscribers`.
2. **Call each subscriber.** Each one runs in its own `runInTransaction`, with the worker subscriber context (system actor, the row's company, causation from the row). Inside that transaction:
   1. `await subscriber.handle(envelope, uow)`;
   2. `UPDATE intelligence.event_outbox SET delivered_subscribers = array_append(delivered_subscribers, $name), locked_at = now() WHERE outbox_id = $id AND status = 'processing' AND locked_by = $workerId AND NOT ($name = ANY(delivered_subscribers))`. If no row is updated, it throws `LockLostError`, which rolls back the subscriber's writes.

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
- `next_attempt_at = now() + OUTBOX_BASE_BACKOFF_MS × 2^(n − 1)`, where `n` is the **new** `retry_count` (the number of failures so far, including this one). That is the same as `2^(old retry_count)`. After failures 1, 2, 3 and 4 this gives 1 s, 2 s, 4 s and 8 s by default — the same formula as §4.5 and G0-15. In SQL: `now() + make_interval(secs => $baseMs / 1000.0 * power(2, retry_count))`, evaluated against the pre-update `retry_count`. PostgreSQL evaluates every `SET` expression against the old row, so `retry_count` there is the old count;
- `dead_lettered_at = now()` when dead-lettered;
- `last_error` = for each failed subscriber, `<subscriber name>: ` plus the error serializer's safe summary (name, code, and message only where §4.7 allows), joined and truncated to 1 000 characters;
- the lock cleared.

It is logged at `WARN`, or at `ERROR` when dead-lettered (§4.7). Subscribers that succeeded stay in `delivered_subscribers`, so the next attempt runs only the ones that failed.

### 5.21 PS-20 — Outbox worker: stale-lock recovery

At the start of every cycle:

```sql
UPDATE intelligence.event_outbox
   SET retry_count      = retry_count + 1,
       status           = CASE WHEN retry_count + 1 >= $maxAttempts THEN 'dead_lettered' ELSE 'failed' END,
       next_attempt_at  = now() + make_interval(secs => $baseMs / 1000.0 * power(2, retry_count)),
       dead_lettered_at = CASE WHEN retry_count + 1 >= $maxAttempts THEN now() ELSE NULL END,
       last_error       = 'stale lock: ' || locked_by || ' did not finish within the lock timeout',
       locked_at = NULL, locked_by = NULL
 WHERE status = 'processing' AND locked_at < now() - make_interval(secs => $staleMs / 1000.0);
```

- **A recovery counts as a failed attempt** (OQ-09, PM ruling). It uses the same count, backoff and dead-letter rule as PS-19. An event whose subscriber crashes the worker every time is therefore dead-lettered after `OUTBOX_MAX_ATTEMPTS` crashes.
- `delivered_subscribers` is left unchanged, so subscribers that committed before the crash are not called again.
- Each recovered row is logged at `WARN` with its event ID, or at `ERROR` if it is dead-lettered.
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
| `Cache-Control` | every `/api`, `/portal/v1` and `/health` response | `no-store` |
| `X-Content-Type-Options` | same | `nosniff` |
| `Referrer-Policy` | same | `no-referrer` |
| `X-Frame-Options` | same | `DENY` |
| `Content-Security-Policy` | same (JSON responses only; the frontend's own CSP is Phase 9, §4.10) | `default-src 'none'; frame-ancestors 'none'` |
| `Content-Type` | same | `application/json; charset=utf-8` |
| `X-Powered-By` | never | `app.disable('x-powered-by')` for the whole app, frontend included |
| `Access-Control-Allow-Origin` (or any CORS header) | never | No CORS middleware: the frontend is same-origin (§1.2) |

**Proxy and client address (R2-15).** `trust proxy` stays `false`, and no Phase 0 code reads or logs `req.ip`, `X-Forwarded-For` or any other client address. Rate limiting by client (Phase 9) decides its own proxy setting.

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
| `UNSUPPORTED_MEDIA_TYPE` | 415 | Unsupported body charset or encoding | PS-07 |
| `BAD_REQUEST` | 400 | Another client error raised by Express or a parser, for example an undecodable path | PS-07 |
| `CLIENT_ERROR` | other 4xx | As above, for any other 4xx status | PS-07 |
| `BUSINESS_RULE_VIOLATION` | 422 | A business rule refused the request (`BusinessRuleError`; modules use specific codes such as those in BACKEND_API_ARCHITECTURE.md, Error Codes) | modules |
| `INTERNAL_ERROR` | 500 | Anything unexpected | PS-07 |
| `BACKEND_NOT_CONFIGURED` | 503 | Frontend-only mode (§4.6) | PS-04 |

Modules define their own codes as `AppError`s (for example `SUBMISSION_ALREADY_APPROVED`). Codes are `UPPER_SNAKE_CASE`. Messages are British English, written for the user, and contain no input values.

Statuses 413, 415, 503 for `BACKEND_NOT_CONFIGURED`, and the codes `BAD_REQUEST` and `CLIENT_ERROR`, are not in BACKEND_API_ARCHITECTURE.md's status table; this specification adds them (§10). Status 429 (rate limiting) arrives in Phase 9.

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
| `job_id`, `site_id`, `client_id` | `AuditEntryInput` | Yes — required when the entry type is `jobRequired` in the catalogue (§4.4) |
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

## 9. GATE TESTS

### 9.1 How the gate is run

- **Location.** Gate tests live in `server/tests/gate/phase-0-infrastructure/`. `backend-test-engineer` writes them from this section, not from the implementation. They use Vitest and Supertest against the test database (D-12, D-14).
- **Two kinds of test.** Tests marked **Command** are verification commands the PM runs. Every other test is a Vitest test in the `gate` project.
- **Who builds the harness.** Nothing the implementer's branch needs may live in the test engineer's folders, because those files do not exist on that branch until the gate-test job merges (roster, Folder Ownership).

  | Created by | File | Does |
  |---|---|---|
  | platform engineer | `vitest.config.ts` | Three projects:<br>• `unit` — `server/**/*.test.ts`, except `*.db.test.ts` and `server/tests/**`; no database.<br>• `db` — `server/**/*.db.test.ts`, except `server/tests/**`.<br>• `gate` — `server/tests/gate/**/*.test.ts`.<br>`db` and `gate` use `fileParallelism: false` and the platform global setup below. All three use `passWithNoTests`. The config references **no** file under `server/tests/` |
  | platform engineer | `server/platform/testing/global-setup.ts` | Runs the guard (PS-22), then rebuilds the test database (§4.6). Runs once per `db` or `gate` invocation |
  | platform engineer | `server/platform/testing/index.ts` | The test-only surface (rule 1a):<br>• `assertTestDatabase`, `rebuildTestDatabase`;<br>• the owner, `ledger_app` and `ledger_worker` clients for the test database;<br>• re-exports of what tests build processes from: `loadApiConfig`, `loadWorkerConfig`, `createLogger` (with an injectable output stream), `createApiApp`, `createOutboxWorker`, `buildRegistries`, `createSystemContext` |
  | test engineer | `server/tests/support/gate-fixtures.ts` | `ensureGateFixtures()` — idempotent; called in each gate file's `beforeAll` through the owner client. It creates the test-only schema `gate_test` with three tables:<br>• `probe_state (id uuid primary key, company_id uuid not null, value text)` — granted to `ledger_runtime`;<br>• `subscriber_effects (subscriber text, effect_key uuid, primary key (subscriber, effect_key))` — granted to `ledger_runtime`;<br>• `api_only (id uuid primary key)` — granted to `ledger_app` **only**, used by G0-25 |
  | test engineer | `server/tests/support/` (other files) | • Probe module registrations: probe routes in namespaces `/__probe`, `/__alpha`, `/__beta`; probe subscribers; probe ports, one of them `humanOnly`; catalogue entries `gate_test_probe` and `gate_test_job_probe` (`jobRequired`) for audit, and `GateProbeRecorded` and `GateJobProbeRecorded` (`jobRequired`) for events.<br>• Test app and worker builders.<br>• An ES256 key pair and portal secret generated per run, plus a token factory.<br>• In-memory log capture at level `debug`, so even debug lines are checked.<br>• The boundary scanner and `fixtures/boundaries/` |
  | test engineer | `server/tests/gate/phase-0-infrastructure/*.test.ts` | The G0 tests |

- **Rules.**
  - "Refused with 42501" means PostgreSQL `insufficient_privilege`; "23514" means `check_violation`.
  - Tests change only per-database object grants, and restore them in `finally`. They never change role attributes or memberships, because roles are cluster-wide (§4.6).
  - Two companies (A and B) and a probe human actor (`ceo` user U1) are used throughout. All data is synthetic.

### 9.2 Gate item map

| Roadmap gate item / doctrine / review item | Tests |
|---|---|
| 1. Build and typecheck pass | G0-01 |
| 2. An audit write that fails rolls back its whole transaction | G0-03, G0-04, G0-05, G0-06 |
| 3. An event written in a rolled-back transaction is never delivered | G0-09, G0-10 |
| 4. A redelivered event is handled once by an idempotent subscriber | G0-12, G0-13, G0-14, G0-44 |
| 5. Application role cannot UPDATE or DELETE audit entries | G0-20, G0-21, G0-24, G0-25, G0-26, G0-45 |
| 6. No log line contains a request or response body | G0-27, G0-28 |
| Doctrine: audit immutability | G0-20, G0-21, G0-26, G0-43, G0-45 |
| Doctrine: transactional outbox integrity | G0-09 – G0-16, G0-22, G0-23, G0-24, G0-44, G0-50 |
| Doctrine: no sensitive data in logs | G0-27, G0-28, G0-36, G0-46 |
| Tenant context required (S-10; Shared Rules) | G0-07, G0-08, G0-17, G0-31, G0-49 |
| Causation recorded and unforgeable (§4.1) | G0-18, G0-19 |
| Frontend unchanged (§10; D-13) | G0-02, G0-37 |
| Test database isolation (D-12) | G0-39 |
| No Redis (D-10) | G0-42 |
| Module layout and boundaries (S-01) | G0-40, G0-41, G0-48 |
| Token handling (S-09, S-10) | G0-31 – G0-35 |
| Configuration (S-02) | G0-36, G0-37 |
| Health (S-08) | G0-38 |
| Error envelope and headers (S-06) | G0-29, G0-30 |
| Approval-effects port (D-17) | G0-41, G0-47 |
| **R2-B1** worker never holds API-only privileges | G0-21, G0-25 |
| **R2-B2** human-only ports | G0-41(p), G0-47 |
| **R2-01** forged and expired contexts | G0-08, G0-19(f) |
| **R2-02** causation actor hidden | G0-19(g) |
| **R2-03** system surface not reachable from modules | G0-40 (rule 11) |
| **R2-04** declarative public routes, namespaces, `contextOf` | G0-41(j)–(m), G0-48 |
| **R2-05** column-level INSERT | G0-20, G0-22, G0-24 |
| **R2-06** no savepoints | G0-07 |
| **R2-07** no module database access | G0-40 (rule 10) |
| **R2-08** tenant stamping, `app.company_id` | G0-49 |
| **R2-09** owner DML refused; no owner URL at runtime | G0-45, G0-36(j) |
| **R2-10** runtime role self-check | G0-46 |
| **R2-11** PUBLIC defaults revoked | G0-25 |
| **R2-12** guard robustness | G0-39 |
| **R2-13** logging gaps, route templates, value caps | G0-05, G0-27(k)–(n), G0-29 |
| **R2-14** JWT and configuration hardening | G0-32(n)–(t), G0-36(e)–(i) |
| **R2-15** response headers, no CORS, `/health` dedupe | G0-30, G0-38 |
| **R2-16** audit and event catalogues | G0-05, G0-41(n)–(o), G0-50 |
| **R2-17** requeue and recovery safety | G0-12(a), G0-44 |
| **R2-18** test code never reaches production | G0-01, G0-40 (rule 1a) |
| **OQ-09** stale-lock recovery counts as an attempt | G0-44 |

### 9.3 Build and frontend

| ID | Protects | Attack / check | Pass when |
|---|---|---|---|
| G0-01 **Command** | Gate item 1; R2-18 | Run `npm run check` (both `tsc` passes, including the test tsconfig) and `npm run build`. Then, from the app folder **with a `.env` file present** that sets every variable, run each bundle with an emptied environment (`env -i PATH="$PATH" node dist/index.cjs`, then the same for `dist/worker.cjs`). Finally, search both bundles for test-only strings | Both commands exit 0, and `dist/index.cjs`, `dist/worker.cjs` and `dist/public/index.html` exist. Run with an emptied environment, the API exits 1 with a `ConfigError` naming the four backend variables, and the worker exits 1 naming `DATABASE_WORKER_URL`. This proves the CommonJS bundles load (including the bundled `jose`), that a built bundle always runs as production, and that it never reads `.env` (§4.6). **Neither bundle contains** `__probe`, `gate_test`, `platform/testing`, `rebuildTestDatabase`, `GateProbeRecorded` or `server/tests` (R2-18) |
| G0-02 **Command** | Frontend unchanged (D-13) | With **no** `.env` and no backend variables, start `npm run dev` and run the full Playwright suite (`npx playwright test`) | The same pass count as `backend` before Phase 0, with no new failures. The server log shows the single frontend-only `WARN` line |

### 9.4 Audit atomicity and the Unit of Work — gate item 2

| ID | Protects | Attack | Pass when |
|---|---|---|---|
| G0-03 | Audit Doctrine; BACKEND_INFRASTRUCTURE_ARCHITECTURE.md, Audit Write Path ("If the audit write fails, the entire transaction rolls back") | Inside `runInTransaction` (company A, actor U1): insert a `probe_state` row, `uow.events.record` a probe event, then `uow.audit.append`. Beforehand, the owner temporarily revokes `INSERT` on `audit.audit_entries` from `ledger_runtime`, so this is a real database-level failure | `runInTransaction` rejects. No `probe_state` row, outbox row or audit row exists afterwards |
| G0-04 | Unit of Work poisoning (§4.4) | Same set-up, but the work function **catches** the audit error and returns normally — a careless use case trying to commit without its audit entry | `runInTransaction` rejects with `AuditWriteFailedError` (cause: the 42501). No `probe_state` row and no outbox row |
| G0-05 | Same, for validation and catalogue failures (R2-13, R2-16) | Each case follows a `probe_state` insert, and each is run again with the error swallowed. `append` with:<br>(a) `entryType: 'Timesheet Approved'`;<br>(b) a destination type without an ID;<br>(c) a non-serialisable value;<br>(d) an entry type not in any catalogue;<br>(e) `gate_test_job_probe` (`jobRequired`) without `jobId`;<br>(f) a `newValue` of 65 KB;<br>(g) an unknown key `actorRole` | Each rejects, and no `probe_state` row survives. `gate_test_job_probe` **with** a `jobId` succeeds |
| G0-06 | No write outside a transaction | Keep a reference to `uow` and call `uow.audit.append` and `uow.events.record` after `runInTransaction` has resolved, and again after it has rejected | Both throw `UnitOfWorkClosedError`; no rows are written |
| G0-07 | One transaction per use case; no savepoints (R2-06) | (a) Call `runInTransaction` inside another unit's work function.<br>(b) Inside a unit, call `uow.tx.transaction(async t => …)`.<br>(c) As (b), swallow the error, write a `probe_state` row, and make an audit write fail and swallow that too | (a) and (b) throw `NestedUnitOfWorkError`. (c) The unit still rolls back (poisoned): no `probe_state` row. No savepoint was ever issued — checked with a statement log on the client |
| G0-08 | "Missing `company_id` in any query is a runtime error" (BACKEND_LAYERING_ARCHITECTURE.md); genuine, live contexts (R2-01) | From untyped code (`as any`), call `runInTransaction`, `tenantWhere` and `tenantValues` with:<br>(a) company ID `undefined`, `''` or `'not-a-uuid'`;<br>(b) an object literal shaped like a context;<br>(c) `{ ...genuineCtx }`, `Object.assign({}, genuineCtx)` and `structuredClone(genuineCtx)`, each unchanged and each with a changed `companyId`, `actor` or `causation`;<br>(d) an attempt to assign to a genuine context's `companyId` or `actor.role`;<br>(e) a request context captured in a probe route, used in `runInTransaction` after the response has finished | (a) `MissingTenantContextError`; (b) and (c) `ForgedContextError`; (d) a `TypeError` (frozen), with the context unchanged; (e) `ContextExpiredError`. Every refusal happens **before** any SQL runs — checked by a statement counter on the `ledger_app` client |

### 9.5 Outbox integrity — gate items 3 and 4

| ID | Protects | Attack | Pass when |
|---|---|---|---|
| G0-09 | Gate item 3 | Record a probe event in a unit whose work then throws. Run `worker.runOnce()` twice | The probe subscriber is never called. No outbox row and no `event_log` row exist for that event |
| G0-10 | Gate item 3, combined with item 2 | Record a probe event, then make the audit write fail (as G0-03) and swallow the error (as G0-04). Run the worker | As G0-09 |
| G0-11 | Delivery happy path; tenant context; envelope | Commit a probe event for company A as U1, with two subscribers registered. Run the worker | Each subscriber is called once and receives the documented envelope (§4.5: `eventId`, `eventType`, `eventVersion "1.0"`, ISO `occurredAt`, `companyId` A, `actorId` U1, the source fields, `jobId`, payload). The outbox row becomes `delivered`, with `delivered_at` set, the lock cleared and both names in `delivered_subscribers`. Exactly one `event_log` row exists, matching the envelope |
| G0-12 | Gate item 4 | (a) **Subscriber idempotency under a full redelivery.** After G0-11 delivers, the owner resets the row to `pending` with `delivered_subscribers = '{}'`. This is *not* a requeue, which never clears that column (§4.5, R2-17); it models any duplicate delivery the platform cannot prevent. Run the worker again. The probe subscriber is idempotent: it inserts into `subscriber_effects`, keyed on `eventId`, with `ON CONFLICT DO NOTHING`.<br>(b) Two subscribers, A and B, each write an effect row. B counts its calls in an in-memory counter local to the test; on its first call it writes its effect row and *then* throws, so its rollback is observable | (a) The subscriber was called twice, but `subscriber_effects` has one row. There is still exactly one `event_log` row, and the status is `delivered`.<br>(b) After the first cycle, B's effect row is absent (its transaction rolled back) and A's is present. After the second cycle, A has been called **once** (it was skipped on the retry) and B twice. Each has one effect row, `retry_count = 1`, and the status is `delivered` |
| G0-13 | Claim exclusivity | Commit 30 probe events. Run two worker instances' `runOnce()` concurrently, on separate `ledger_worker` connections | Every event is delivered, and each subscriber was called exactly once per event: no event was claimed by both workers (a call log keyed by event, plus the `locked_by` history in the logs). There are 30 `event_log` rows |
| G0-14 | Fencing after stale-lock recovery | (a) W1 and W2 are worker instances on separate `ledger_worker` pools. The probe subscriber's **first statement is `await latch`**: it waits before any write, so W1's open subscriber transaction holds no row or key lock while it waits. Only after the latch does it insert a `probe_state` row tagged with the calling worker's ID, and its `subscriber_effects` row (`ON CONFLICT DO NOTHING`).<br>Steps:<br>1. Start `W1.runOnce()` without awaiting it, and wait for the subscriber's "reached latch" signal.<br>2. The owner moves `locked_at` back 10 minutes.<br>3. `await W2.runOnce()`: W2 recovers the row (`failed`, `retry_count = 1`, OQ-09). After the test-sized backoff (`OUTBOX_BASE_BACKOFF_MS = 20`), `await W2.runOnce()` again: W2 claims and delivers the row. The latch holds only the first invocation (W1's), so W2's call of the subscriber runs straight through.<br>4. Release W1's latch and await W1.<br>(b) Simulate a finish that lost its lock after every subscriber had committed: the owner sets a row to `failed`, clears the lock and leaves every subscriber name in `delivered_subscribers`. Run one worker | (a) W1's subscriber transaction ends with `LockLostError`, and no `probe_state` row tagged W1 exists (it was rolled back). W1 writes no failure, no `delivered` and no `event_log` row. Final state: one effect row, one `probe_state` row tagged W2, one `event_log` row, `delivered` by W2. The test has a 30-second timeout, and each await in it is bounded at 10 seconds, so a lock wait fails the test rather than hanging it.<br>(b) No subscriber is called, the row becomes `delivered`, and there is exactly one `event_log` row |
| G0-15 | Retry, backoff and dead letter (§4.5) | Set `OUTBOX_MAX_ATTEMPTS = 5` and `OUTBOX_BASE_BACKOFF_MS = 20`. The subscriber always throws `new Error('boom')`, and the payload contains the marker `PAYLOAD-MARKER-15`. Run cycles, waiting past `next_attempt_at` each time. Read the database clock just before and just after each `runOnce()`, giving `t_before` and `t_after` | After failure n (1–4): status `failed`, `retry_count` = n, and `next_attempt_at` lies between `t_before + d` and `t_after + d`, where `d = 20 × 2^(n−1)` ms (20, 40, 80, 160). After failure 5: status `dead_lettered`, `dead_lettered_at` set, the row is never claimed by later cycles, and there is no `event_log` row. `last_error` names the subscriber and contains no marker. There is exactly one `ERROR` log line for the dead letter, and no log line contains the marker |
| G0-16 | Backoff is respected | After failure 1 (base backoff 10 s), run `runOnce()` immediately | The row is not claimed and the subscriber is not called |
| G0-17 | Every event is handled in its own tenant's context | Commit events for companies A and B. The subscriber writes an audit entry and a `probe_state` row, using `uow.context.companyId` | Each subscriber's context company matches its event's company. The audit entries carry that `company_id`, `actor_role = 'system'` and `actor_id IS NULL` |
| G0-44 | Stale-lock recovery counts as an attempt (OQ-09 ruling); recovery never forgets delivered subscribers (R2-17) | Two subscribers, A and B. The owner sets a committed event's row to `processing`, with a `locked_at` older than the stale timeout, `locked_by = 'ghost'` and `delivered_subscribers = '{A}'` — a worker that crashed after A committed. Run one cycle. Then repeat the crash simulation (stale `processing`, `locked_by = 'ghost'`) until five recoveries have happened | After the first recovery: status `failed`, `retry_count = 1`, `delivered_subscribers` still `{A}`, and `last_error` names the stale lock. The next delivery calls **only B**. In the repeated case, the fifth recovery sets status `dead_lettered`, `retry_count = 5`, and logs one `ERROR` line; the row is never claimed again |

### 9.6 Causation

| ID | Protects | Attack | Pass when |
|---|---|---|---|
| G0-18 | Traceability (§4.1; BACKEND_OBSERVABILITY_ARCHITECTURE.md) | U1 commits event E1 through a probe route. Subscriber S1 handles E1, writes an audit entry and records event E2. Subscriber S2 handles E2 and writes an audit entry | S1's audit row has `causation_event_id = E1` and `causation_actor_id = U1`. E2's outbox and `event_log` rows have `actor_id NULL`, `causation_event_id = E1` and `causation_actor_id = U1`. S2's audit row has `causation_event_id = E2` and `causation_actor_id = U1`, so the human is carried through the chain. U1's own audit row (written by the route) has both causation columns `NULL` |
| G0-19 | Causation cannot be forged or read by module code (R2-01, R2-02) | (a) `append` and `record` with the extra keys `causationEventId`, `causationActorId`, `companyId`, `actorId`, `actorRole`, `occurredAt`.<br>(b) Caller `metadata` with `requestId` / `runId` keys.<br>(c) `runInTransaction` with an object-literal context that includes `causation`.<br>(d) `createSystemContext(A, 'script')`, then a write.<br>(e) As `ledger_app`, raw SQL inserts: an audit row with `causation_event_id` set and `actor_role = 'ceo'`; one with `causation_actor_id` but no `causation_event_id`; an outbox row with `causation_event_id` and a non-null `actor_id`.<br>(f) Inside a subscriber, `{ ...uow.context, causation: null }`, `{ ...uow.context, actor: { kind: 'user', … } }` and `Object.assign` copies, each passed to `runInTransaction` and to a probe port.<br>(g) Inside a subscriber, inspect `uow.context.causation` with `Object.keys`, `JSON.stringify` and `Reflect.ownKeys` | (a) Rejected by the strict input schemas; nothing written.<br>(b) The context's values win.<br>(c) Refused: not a platform context.<br>(d) The row has causation `NULL`.<br>(e) Each refused with 23514.<br>(f) Each refused with `ForgedContextError` before any SQL.<br>(g) Only `eventId` is visible, and U1's ID appears nowhere in the output |

### 9.7 Database roles, grants and triggers — gate item 5

Every test in this group connects as the named role, runs the statement, and expects the stated result. Each "refused" case is also checked with `has_table_privilege` / `has_column_privilege`, so a test cannot pass by accident — for example because the row it targeted did not exist.

| ID | Role and table | Attack | Pass when |
|---|---|---|---|
| G0-20 | `ledger_app` on `audit.audit_entries` | `UPDATE … SET entry_type = 'x'`; `DELETE`; `TRUNCATE`; `ALTER TABLE … DISABLE TRIGGER ALL`; `DROP TABLE`; `CREATE TABLE audit.x (…)`; `INSERT` naming `audit_id`, naming `occurred_at`, and naming `sequence_no` with `OVERRIDING SYSTEM VALUE` (R2-05); an explicit-column `INSERT` of only the granted columns; `SELECT` | Everything is refused (42501, or "must be owner") except the explicit-column `INSERT` and the `SELECT`, which succeed. The successful insert also proves that no sequence grant is missing for `sequence_no` |
| G0-21 | `ledger_worker` on `audit.audit_entries` | The same statements | The same results: the worker holds only what `ledger_runtime` grants (R2-B1) |
| G0-22 | `ledger_app` on `intelligence.event_outbox` | `UPDATE … SET status = 'delivered'`, and the same for each delivery-state column; `DELETE`; `TRUNCATE`; `INSERT` naming `status`, naming `delivered_subscribers`, naming `next_attempt_at`, naming `created_at` and naming `occurred_at` (R2-05); an explicit-column `INSERT` of the envelope columns; `SELECT` | Every `UPDATE`, `DELETE`, `TRUNCATE` and non-envelope `INSERT` is refused: **the API role cannot change delivery state, or set it at insert**. The envelope-column `INSERT` and the `SELECT` succeed |
| G0-23 | `ledger_worker` on `intelligence.event_outbox` | `UPDATE` of each delivery-state column; `UPDATE` of each envelope column (`payload`, `company_id`, `event_type`, `actor_id`, `job_id`, `causation_event_id`, `causation_actor_id`, `occurred_at`, `source_object_id`); `DELETE`; `TRUNCATE` | The delivery-state updates succeed. Every envelope update, `DELETE` and `TRUNCATE` is refused |
| G0-24 | `intelligence.event_log` | As `ledger_app`: `INSERT`, `UPDATE`, `DELETE`. As `ledger_worker`: an `INSERT` of the copied columns; an `INSERT … ON CONFLICT (event_id) DO NOTHING` of a duplicate; an `INSERT` naming `event_log_id` or `logged_at`; `UPDATE`; `DELETE`; `TRUNCATE` | `ledger_app` can only `SELECT`. `ledger_worker` can insert the copied columns, and the duplicate is silently skipped. Everything else is refused |
| G0-25 | Role attributes, memberships and PUBLIC defaults (§3.5; R2-B1, R2-11) | Query `pg_roles`, `pg_auth_members`, ownership in `pg_class` / `pg_namespace` / `pg_proc`, `has_schema_privilege`, `has_database_privilege`, `has_function_privilege` and `aclexplode` on the three tables. Then, as `ledger_worker`, `INSERT` into `gate_test.api_only`, which is granted to `ledger_app` only | `ledger_runtime` is `NOLOGIN`. None of the three runtime roles is superuser, `CREATEDB`, `CREATEROLE`, `REPLICATION` or `BYPASSRLS`. `ledger_app` and `ledger_worker` are each members of `ledger_runtime` only, and **not of each other**. No runtime role owns any object in `audit`, `intelligence` or `drizzle`, has `USAGE` on schema `drizzle`, or has `CREATE` on `audit`, `intelligence` or `public`. Neither login role has `TEMPORARY` on the database, and neither has `EXECUTE` on `audit.refuse_change()`. `PUBLIC` holds no privilege on the three tables, no `CONNECT` or `TEMPORARY` on the database, and no `CREATE` on `public`. The worker's insert into `api_only` is refused with 42501: **an API-only grant never reaches the worker** |
| G0-26 | Database constraints hold against direct SQL | As `ledger_app`, insert an audit row with `actor_role = 'system'` and a non-null `actor_id`; one with `actor_role = 'ceo'` and a null `actor_id`; one with an `entry_type` of `'X'`; and one with a destination type but no ID. Insert outbox rows with an array `payload` and with `status = 'done'`, supplied through an owner-run insert because `ledger_app` cannot name `status` | Each is refused with 23514 |
| G0-45 | Owner DML is refused too (R2-09) | As the **owner**: `UPDATE`, `DELETE` and `TRUNCATE` on `audit.audit_entries` and on `intelligence.event_log`. Then list `pg_trigger` for both tables | Each statement fails with the trigger's `insufficient_privilege` exception, and the rows are unchanged. All four triggers exist and are enabled. The global setup's `DROP SCHEMA … CASCADE` rebuild succeeded at the start of the run, which shows the triggers do not block it |
| G0-46 | Runtime role self-check (R2-10); no owner credentials at runtime (R2-09) | (a) Build the full-mode API with `DATABASE_URL` set to the **owner** test URL, then call `/health` and a probe route. (b) Build the worker with `DATABASE_WORKER_URL` set to the `ledger_app` test URL and run `runOnce()`. (c) Run the production-mode loaders for both processes with `DATABASE_MIGRATION_URL`, or an owner `_TEST` URL, present | (a) Every connection is refused: `/health` returns 503 and the probe route 500. An `ERROR` line names the failed condition ("owns platform schema" or "unexpected role") and the role name, but never the URL or password. (b) Refused with "unexpected role"; nothing is claimed. (c) `ConfigError` naming the owner variable |

### 9.8 Logging — gate item 6

Each request in these tests carries a unique marker string (`MARK-<test>-<random>`). After the test, **every** captured log line, at level `debug`, is searched for every marker.

| ID | Protects | Attack | Pass when |
|---|---|---|---|
| G0-27 | Gate item 6; roster doctrine; R2-13 | Against the full-mode test app, using a probe route `POST /api/v1/__probe/echo` (test registration only; it returns the body it received):<br>(a) a JSON body containing a marker, which is echoed in the response;<br>(b) a marker in the query string;<br>(c) a marker in a `Cookie` header and as an extra `X-Request-Id`;<br>(d) a malformed JSON body that starts with a marker (V8 quotes it);<br>(e) a body failing Zod validation, with a marker as the invalid enum value;<br>(f) a body over 1 MB that contains a marker;<br>(g) a probe route that passes a marker into a failing query, `SELECT $1::uuid` → 22P02, whose message quotes the value;<br>(h) a probe route that runs a failing Drizzle insert with a marker as a bound parameter;<br>(i) a probe route that throws `new Error('internal')` after reading a marker-bearing body;<br>(j) a valid platform token whose claims carry a marker in `email`;<br>(k) a probe route that logs a marker-quoting PostgreSQL error under the key `failure` (not `err`), and another error nested in a plain object;<br>(l) `Content-Type: application/json; charset=x-MARK…`;<br>(m) a marker as an unmatched path, `GET /api/v1/MARK…` with a valid token;<br>(n) a marker as a non-UUID value of a matched path parameter, `/api/v1/__probe/items/:id` | No log line contains any marker or any token. Responses: (d) `400 MALFORMED_JSON`; (e) `400 VALIDATION_ERROR`; (f) `413`; (g)–(i) `500 INTERNAL_ERROR` with the generic message; (l) `415 UNSUPPORTED_MEDIA_TYPE`; (m) `404`. The responses to (d), (g)–(i) and (l) contain no marker either. The request line for (m) has `route: "<unmatched>"`, and the line for (n) has `route: "/api/v1/__probe/items/:id"`. Exactly one request line is written per request |
| G0-28 | Worker logs carry no payloads | Commit an event whose payload contains a marker. The subscriber fails once, then succeeds | No worker log line contains the marker. The lines name `eventId`, `eventType`, `companyId`, the subscriber and the attempt number |
| G0-29 | Log structure and correlation (BACKEND_OBSERVABILITY_ARCHITECTURE.md, Log Structure; R2-13) | Send requests to `/health`, to an unknown `/api/v1` path with a valid token, to a probe route that writes its own log line, and to a probe route whose literal path is 300 characters long | Every request line has `level` (upper-case label), ISO `timestamp`, `requestId`, `method`, `route` (a template, or `<unmatched>`, never a raw path or query string), `statusCode` and `durationMs`. Authenticated lines also have `companyId` and `userId`. The probe route's own line carries the same `requestId`. The 300-character route is logged truncated to 256 characters. The `X-Request-Id` response header equals the logged `requestId` and is never the value the client sent. `/health` lines are at `DEBUG` |
| G0-30 | Error envelope and response headers (BACKEND_API_ARCHITECTURE.md; R2-15) | Trigger responses with status 400, 401, 404, 413, 415 and 500, plus the frontend-only 503, each sent with an `Origin: https://evil.example` header. Also request `/health` and a frontend path | Each error body is exactly `{ error: { code, message, details, requestId } }`: `details` is an object, `requestId` equals the header, and there is no `stack`. A 500 message is "An unexpected error occurred." even when the thrown error's message differs. Every `/api`, `/portal/v1` and `/health` response carries `Cache-Control: no-store`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: no-referrer`, `X-Frame-Options: DENY` and the JSON CSP. **No** response, frontend included, has `X-Powered-By` or any `Access-Control-*` header |

### 9.9 Tokens, tenant context and routing

| ID | Protects | Attack | Pass when |
|---|---|---|---|
| G0-31 | Tenant context from the token (S-10) | A valid platform token for company A, user U1, role `pm`, calls a probe route that returns `contextOf(req)` | The context is company A, actor `{ kind: 'user', userId: U1, role: 'pm' }`, `causation: null` |
| G0-32 | Token verification rules (§4.3; R2-14) | On the probe route, send:<br>(a) no `Authorization` header;<br>(b) a `Basic` scheme;<br>(c) an expired token;<br>(d) a valid token with one signature byte changed;<br>(e) `alg: none`;<br>(f) an HS256 token signed with `PORTAL_JWT_SECRET` and carrying platform claims (algorithm confusion);<br>(g) an ES256 token signed by a different key pair;<br>(h) the wrong `aud`;<br>(i) the wrong `iss`;<br>(j) no `company_id`;<br>(k) `company_id: 'not-a-uuid'`;<br>(l) `role: 'client'` in a platform token;<br>(m) a valid token in the query string only;<br>(n) a token with no `exp`;<br>(o) `exp` 24 hours after `iat`;<br>(p) `iat` 10 minutes in the future;<br>(q) a non-integer `iat`;<br>(r) the scheme as `bearer` or `BEARER`, or followed by two spaces;<br>(s) an `Authorization` header of 5 000 characters;<br>(t) two tokens separated by a comma | (c) gets `401 TOKEN_EXPIRED`. Every other case gets `401 UNAUTHENTICATED`. Every 401 carries `WWW-Authenticate`, and the probe handler never runs |
| G0-33 | Token types cannot be swapped (roadmap Phase 6a gate) | A valid **portal** token on `/api/v1/__probe`; a valid **platform** token on `/portal/v1/__probe` | Both get `401`, and neither handler runs |
| G0-34 | Portal middleware | A valid portal token on `/portal/v1/__probe` | The context actor is `{ kind: 'portal_user', portalAccountId, clientId, role: 'client' }`, with the token's company |
| G0-35 | Unmatched API paths never reach the frontend | Send `GET /api/v1/nothing` with a valid token and without one; `GET /api/foo`; `GET /portal/v1/nothing` with a valid portal token | In that order: `404 NOT_FOUND` envelope, `401`, `404`, `404`. None returns HTML |
| G0-48 | Namespaces, public routes and `contextOf` (R2-04) | Two probe modules: Alpha owns `/__alpha` and declares a public route `POST /__alpha/login`; Beta owns `/__beta`. Alpha's router has router-level middleware that sets the header `X-Alpha`. Requests:<br>(a) `GET /api/v1/__beta/x` with a valid token;<br>(b) `POST /api/v1/__alpha/login` without a token;<br>(c) `GET /api/v1/__alpha/login` without a token;<br>(d) the public handler calls `contextOf(req)`;<br>(e) a probe handler reads the context only through `AsyncLocalStorage` after an `await setTimeout(0)` outside `run()` | (a) The response has no `X-Alpha` header: Alpha's middleware never runs on Beta's paths. (b) Reaches the public handler. (c) `401` — only the declared method and path are public. (d) `500 INTERNAL_ERROR`, with `MissingRequestContextError` in the log. (e) The request still behaves as intended, because `contextOf` does not depend on `AsyncLocalStorage` |

### 9.10 Configuration, modes, health and the test-database guard

| ID | Protects | Attack | Pass when |
|---|---|---|---|
| G0-36 | Fail fast without leaking values (S-02; R2-09, R2-14) | `loadApiConfig` with:<br>(a) three of the four backend variables, each set to a marker;<br>(b) `NODE_ENV=production` and none of them;<br>(c) a mismatched key pair;<br>(d) a `PORTAL_JWT_SECRET` that decodes to 10 bytes;<br>(e) every value from the committed `.env.example`;<br>(f) all four set, but `DATABASE_URL=""`;<br>(g) `PORTAL_JWT_SECRET` set to the text of `JWT_PUBLIC_KEY`;<br>(h) a 40-character `PORTAL_JWT_SECRET` that decodes to 30 bytes;<br>(i) an extra `VITE_JWT_SECRET` variable;<br>(j) `NODE_ENV=production`, all four set, plus `DATABASE_MIGRATION_URL`.<br>Also `loadWorkerConfig` with no `DATABASE_WORKER_URL` | Each throws `ConfigError`. Its message, and the captured `FATAL` line, name the right variables and contain no marker or key material. For (a) and (f), exactly the missing variable is named — the empty one counts as missing. For (e), every backend variable is named |
| G0-37 | Frontend-only mode (§4.6; D-13) | Set `NODE_ENV=development` and none of the four variables. Build the app with a sentinel frontend handler and a spy on the pool factory. Request `/api/v1/x`, `/api/foo`, `/portal/v1/x`, `/health`, `/` and `/portal/projects` | The mode is `frontend_only`. The `/api` and `/portal/v1` paths get `503 BACKEND_NOT_CONFIGURED` envelopes. `/health` gets `200 {"status":"ok","mode":"frontend_only"}`. `/` and `/portal/projects` reach the sentinel. The pool factory is never called and no socket is opened. Exactly one start-up `WARN` line is logged |
| G0-38 | Health (S-08; R2-15) | Full mode with a reachable test database; full mode with `DATABASE_URL` pointing at a closed local port; and 50 concurrent `/health` requests with a spy on the pool's `connect` | `200 {"status":"ok","mode":"full"}` and `503 {"status":"unavailable","mode":"full"}`; the 503 arrives within 3 seconds. Both bodies have no other keys. The 50 concurrent requests cause at most one `connect` call, because they share one check |
| G0-39 | Test database isolation (D-12; R2-12) | Call the guard with test URLs whose database is:<br>(a) `ledger_dev`;<br>(b) `ledger_test_backup`;<br>(c) `ledger_TEST`;<br>(d) missing;<br>(e) different across the three URLs;<br>(f) equal to `DATABASE_URL`'s.<br>Also: (g) `…/ledger_test?host=other`; (h) `…/ledger_test?user=postgres`; (i) a socket URL; (j) an empty path; (k) a `mysql://` URL; (l) `…/ledger_test?options=-c%20search_path%3Dx`.<br>The URLs point at an unroutable host, and the pg client and pool constructors are spied on. Then: (m) call `rebuildTestDatabase` with an owner client stubbed so that `current_database()` returns `ledger_dev`; (n) under Vitest, build a `db/client.ts` pool from a non-`_test` URL | (a)–(l) each throw `TestDatabaseGuardError`, which does not contain the password, and no pg client or pool is constructed. (m) Refuses before any `DROP`, as the statement log shows. (n) Refused before connecting. A valid set (`ledger_test` in all three URLs, with `?sslmode=require`) passes |

### 9.11 Structure, registries, ports and dependencies

| ID | Protects | Attack | Pass when |
|---|---|---|---|
| G0-40 | Import rules 1–6, 1a and 8–11 (§4.8; R2-03, R2-07, R2-18) | Run the boundary scanner (test support) over the real `server/` tree, then over a fixture tree (`server/tests/support/fixtures/boundaries/`) with one deliberate violation per planted file:<br>• a module importing `server/platform/db/client.ts`;<br>• importing another module's `application/`;<br>• `domain/` importing `drizzle-orm`, the platform's `index.ts` and a Node built-in;<br>• `application/` importing `express`;<br>• `infrastructure/` importing `application/`;<br>• `api/` importing `domain/`;<br>• production code importing `server/platform/testing/`;<br>• a non-test file importing `server/tests/support/` (1a);<br>• `server/platform/` importing `server/modules/`;<br>• two fixture modules each importing the other's `index.ts` (a cycle, rule 9);<br>• module files importing `pg`, importing `drizzle-orm/node-postgres`, reading `process.env`, containing the string `audit_entries`, containing `pgSchema('audit')`, and containing `SAVEPOINT` in a `sql` template (rule 10);<br>• a module importing `server/platform/system/index.ts` (rule 11) | The real tree reports no violations. The fixture tree reports exactly one violation per planted file, with the rule number |
| G0-41 | Registries fail at start-up, not at run time (PS-15, PS-16; R2-04, R2-16, R2-B2) | Build both processes' registries with each of:<br>(a) two subscribers with the same name;<br>(b) a subscriber with no event types;<br>(c) a `requiresPorts` with no provider;<br>(d) two providers for one port;<br>(e) a provider for a port no module requires;<br>(f) a provider's `create` calling `deps.ports.get`;<br>(g) a module calling `deps.ports.get` for a token missing from its `requiresPorts`;<br>(h) `Ports.get` called after start-up;<br>(j) one namespace claimed by two modules;<br>(k) a namespace `/jobs/x` (more than one segment);<br>(l) a public route outside its module's namespaces;<br>(m) two public routes with the same surface, method and path;<br>(n) a subscriber to an unregistered event type;<br>(o) one audit entry type registered by two modules;<br>(p) a subscriber factory, in the worker, calling `deps.ports.get` for a `humanOnly` token.<br>Also (i): start the API and worker entry points with case (c) | (a)–(g) and (j)–(p) each throw at build time, naming the subscriber, port, namespace, route or type. (h) throws. (i) Both processes exit 1 with one `FATAL` line naming the port: the API before it listens, the worker before it claims. A correct wiring passes a probe port's implementation to the requiring module, and calling it with a human context's `uow` writes an audit row with that human as actor and causation `NULL` |
| G0-47 | Human-only ports at run time (R2-B2; D-17) | A probe `humanOnly` port whose implementation writes a `probe_state` row and an audit entry. Call it with the `uow` of:<br>(a) a `createSystemContext` unit;<br>(b) a subscriber unit — the test hands the API-wired implementation into a probe subscriber's closure, which no module can do;<br>(c) a portal-user request;<br>(d) a platform-user request, with the caller **catching** the refusal from (a)–(c)-style misuse and trying to commit;<br>(e) a platform-user request, used correctly | (a)–(c) Each throws `HumanActorRequiredError` before the implementation runs: no `probe_state` row and no audit row. (d) The unit is poisoned and rolls back. (e) Succeeds: the audit row has the user as `actor_id`, their role, and causation `NULL` |
| G0-49 | Tenant stamping and the database tenant setting (R2-08) | (a) `tenantValues(probeTable, ctxA, { companyId: B, … })`. (b) `tenantValues(probeTable, ctxA, { … })`. (c) Inside `runInTransaction(ctxA)`, read `current_setting('app.company_id', true)`. (d) On a pool of size 1, after that unit commits, read the setting in a new plain transaction | (a) `TenantMismatchError`, with no SQL issued. (b) The row carries company A. (c) The setting equals A's ID. (d) The setting is empty or `NULL`: it was transaction-local |
| G0-50 | Event catalogue and job attribution on events (R2-16) | `record`:<br>(a) an unregistered event type;<br>(b) `GateJobProbeRecorded` (`jobRequired`) without `jobId`;<br>(c) a registered type with a `sourceModule` other than the registering module;<br>(d) `GateJobProbeRecorded` with `jobId` J, then deliver it.<br>Run (a)–(c) inside units that also insert a `probe_state` row, and swallow the error each time | (a)–(c) Each refused, the unit poisoned and rolled back, with no outbox row and no `probe_state` row. (d) `job_id = J` on the outbox and `event_log` rows, and `envelope.jobId = J` |
| G0-42 | No Redis (D-10) | Read the `dependencies`, `devDependencies` and `optionalDependencies` in `package.json` | None of `redis`, `ioredis`, `@redis/*`, `bull`, `bullmq`, `connect-redis` or `rate-limit-redis` is present |
| G0-43 | Only `append()` writes audit rows (BACKEND_DATA_ARCHITECTURE.md, Audit Immutability Enforcement) | Import `server/platform/index.ts` and list its exports. Inspect `uow.audit` and `uow.events` | No export is a Drizzle table for T-1, T-2 or T-3, a raw pool or `db` handle, `createSystemContext` or `toCompanyId`. `uow.audit` has exactly one method, `append`, and `uow.events` exactly one, `record` |

---

## 10. DIFFERENCES — FROM THE REPLIT STARTER, AND WHAT THE FRONTEND RELIES ON

### 10.1 Prototype engines

Phase 0 replaces no prototype engine. The client's `eventBusEngine.ts` and `activityFeedEngine.ts` are frontend mock behaviour for Phases 6.2–6.3 of the prototype. The backend outbox is built from BACKEND_EVENT_ARCHITECTURE.md, not from them, and no behaviour is compared. The engines stay untouched until Phase 7 and Track F.

### 10.2 Replit starter code

| File | Today | After Phase 0 | Rule |
|---|---|---|---|
| `server/index.ts` lines 36–60 | Request logger captures every `res.json` body and prints `JSON.stringify` of it for `/api` paths | Removed. PS-06 writes one structured line with no body | Roadmap S-07; D-14; roster doctrine; BACKEND_OBSERVABILITY_ARCHITECTURE.md, What Is NOT Logged |
| `server/index.ts` lines 25–34 | `log()` helper with an `en-US` 12-hour timestamp | Removed; pino with ISO timestamps | BACKEND_OBSERVABILITY_ARCHITECTURE.md, Log Structure |
| `server/index.ts` lines 15–21 | Global `express.json` (default 100 kB limit) with `verify` keeping `req.rawBody` | JSON parsing only on `/api/v1` and `/portal/v1`, limit 1 MB; no `rawBody` (nothing verifies signatures in v1; keeping raw bodies only adds a copy that could be logged) | BACKEND_API_ARCHITECTURE.md, API Security Standards; Webhook API is future |
| `server/index.ts` line 23 | Global `express.urlencoded` | Removed — the API is JSON-only, and the frontend posts no forms to the server | BACKEND_API_ARCHITECTURE.md, Validation Strategy (JSON + Zod) |
| `server/index.ts` lines 65–76 | Error handler uses `err.status`, returns `{ message: err.message }`, and logs the whole error with `console.error` | PS-07: the error envelope, a generic 500 message, and the error serializer | BACKEND_API_ARCHITECTURE.md, Error Handling Strategy; §4.7 |
| `server/index.ts` routing | Unknown `/api/*` paths fall through to the frontend catch-all and return `index.html` with status 200 | `404 NOT_FOUND` envelope (or `503` in frontend-only mode) | BACKEND_API_ARCHITECTURE.md, HTTP Status Code Mapping |
| `server/index.ts` start-up | Starts with no configuration | Validates configuration: full or frontend-only mode outside production, fail fast in production | Roadmap S-02; §4.6 |
| `server/routes.ts` | Empty `registerRoutes` | Deleted; `createApiApp` plus `server/modules/registry.ts` | S-01 |
| `server/storage.ts` | In-memory `MemStorage` of `users` | Deleted. Unused, and users belong to the Identity module (Phase 2) | BACKEND_DATA_ARCHITECTURE.md, Aggregate Roots |
| `shared/schema.ts` | `public.users` table (username, plaintext `password` column) | Deleted, so no migration can ever create it. The `@shared` alias stays in `tsconfig.json` and `vite.config.ts`, which is harmless and may hold shared DTOs in Track F | §3.1.1 (nothing in `public`); D-02 identity model |
| `drizzle.config.ts` | `DATABASE_URL`, `shared/schema.ts` | `DATABASE_MIGRATION_URL`; platform and module schema files; `schemaFilter` | §3.5, §3.6 |
| `package.json` scripts | `db:push` | `db:push` removed. Added: `db:generate`, `db:migrate`, `dev:worker`, `start:worker`, `test` (runs `test:unit`, `test:db`, `test:gate` in that order), `test:unit`, `test:db`, `test:gate`. `check` becomes `tsc && tsc -p tsconfig.test.json`. `dev`, `dev:client`, `build`, `start` are unchanged | D-14 |
| `package.json` dependencies | — | Added `jose`, `pino`, `pg-connection-string` (already installed with `pg`; declared directly because the test-database guard uses it, §4.6); dev: `vitest`, `supertest`, `@types/supertest`, `@types/pg`. Unchanged: `passport`, `passport-local`, `express-session`, `memorystore`, `connect-pg-simple` and their types (removed in Phase 2), and `drizzle-zod` (unused after `shared/schema.ts` goes; removal is not needed for Phase 0) | D-14 |
| `script/build.ts` | One esbuild entry, `server/index.ts` → `dist/index.cjs` | Adds `server/worker.ts` → `dist/worker.cjs`. Adds `jose` to the bundle allowlist, because `jose` v6 is ESM-only and the output is CommonJS; bundling avoids depending on the host Node's `require(esm)` support. `pino` stays external | S-14; D-14 |
| `server/static.ts`, `server/vite.ts` | Frontend serving | Unchanged; mounted last (PS-02 step 5) | D-13 |
| `.gitignore` | — | Adds `.env*` with the exception `!.env.example` | §4.6 (R2-14) |
| New files | — | `.env.example`, `vitest.config.ts` (projects `unit`, `db`, `gate` with explicit includes under `server/` only, so Playwright specs under `tests/` are never collected; §9.1), `tsconfig.test.json`, `server/worker.ts`, `server/platform/**`, `server/modules/registry.ts`, `migrations/**` | §4.8, §11 |

### 10.3 Deliberate differences from the architecture documents

| Difference | Document | Reason |
|---|---|---|
| T-1 adds `sequence_no` | BACKEND_DATA_ARCHITECTURE.md, Audit Entry Structure | Entries in one transaction share `occurred_at`; a stable order and cursor key is needed (BACKEND_API_ARCHITECTURE.md, Pagination Strategy) |
| T-1, T-2, T-3 add `causation_event_id`, `causation_actor_id` | Audit Entry Structure; Event Outbox Record Structure; Event Log Table | PM review finding B: subscriber-written records must be traceable to the human action (Audit Doctrine; BACKEND_OBSERVABILITY_ARCHITECTURE.md, Traceability) |
| T-2 adds `event_id`, `event_version`, `actor_id`, `source_object_*`, `occurred_at`, `next_attempt_at`, `locked_at`, `locked_by`, `delivered_subscribers`, `last_error`, `dead_lettered_at` | BACKEND_EVENT_ARCHITECTURE.md, Event Outbox Record Structure | The envelope must be stored to be delivered (Event Payload Standard). The rest are needed for the claim lock, backoff, dead letter (BACKEND_INFRASTRUCTURE_ARCHITECTURE.md, Worker Resilience) and per-subscriber delivery (§4.5) |
| T-3 adds `event_version`, `source_module` | Event Log Table | The event log is "queryable by … module" (BACKEND_EVENT_ARCHITECTURE.md, Audit Log vs Event Log) |
| Five outbox statuses instead of three | Event Outbox Record Structure | Reconciled with BACKEND_INFRASTRUCTURE_ARCHITECTURE.md (`processing`, `dead_lettered`) (§4.5, OQ-08) |
| Four database roles (owner, `NOLOGIN` group `ledger_runtime`, `ledger_app`, `ledger_worker`); column-level `INSERT` grants; owner-proof immutability triggers; a per-connection role self-check; variables `DATABASE_MIGRATION_URL(_TEST)` and `DATABASE_WORKER_URL(_TEST)`; the worker uses `DATABASE_WORKER_URL`, not `DATABASE_URL` | BACKEND_INFRASTRUCTURE_ARCHITECTURE.md, Required environment variables and Audit Table Permissions; D-12 | The grants hold only if no runtime process is the owner; the API must not change delivery state; under D-17 the worker must never hold API-only privileges; the owner's DML must not rewrite history (§3.5; R2-B1, R2-05, R2-09, R2-10; OQ-03) |
| Token claims add `iss` and `aud` | BACKEND_AUTH_ARCHITECTURE.md, Access Token Claims, Portal Token Claims | Platform and portal tokens must never be accepted in each other's place (§4.3) |
| Status 413 `PAYLOAD_TOO_LARGE`; 415 `UNSUPPORTED_MEDIA_TYPE`; `BAD_REQUEST` / `CLIENT_ERROR`; 503 `BACKEND_NOT_CONFIGURED`; 401 `TOKEN_EXPIRED` | BACKEND_API_ARCHITECTURE.md, HTTP Status Code Mapping | The 1 MB body cap (API Security Standards); fixed responses for parser errors whose messages quote input (R2-13); frontend-only mode (§4.6); token refresh from Phase 2 |
| Worker correlation field `runId`, not `jobId` | BACKEND_OBSERVABILITY_ARCHITECTURE.md, Log Correlation | Avoids confusion with job attribution (`job_id`) (OQ-15) |
| Frontend-only mode outside production | Roadmap S-02 ("fail fast on missing variables") | D-13: the frontend and the Playwright suite must keep working without a database. Production and partial configurations still fail fast (OQ-13) |
| T-2 and T-3 add a nullable `job_id`, and the envelope adds `jobId`; event types have a `jobRequired` flag | BACKEND_EVENT_ARCHITECTURE.md, Event Payload Standard; Event Outbox Record Structure | Canonical context, Event Bus Doctrine and Activity Feed Doctrine: "Job attribution preserved on all event records" (R2-16) |
| Request log lines carry the matched route template (`route`), not the raw `path` shown in the document's example | BACKEND_OBSERVABILITY_ARCHITECTURE.md, Log Structure | A raw path can carry identifiers or, through a mistake, personal data; the template carries neither (R2-13) |
| Security response headers, `X-Powered-By` disabled, no CORS, a deduplicated `/health` | BACKEND_API_ARCHITECTURE.md, API Security Standards (silent on these) | R2-15 |
| Token verification requires `iat` and `exp`, a maximum age of 15 minutes and `exp − iat ≤ 900`, and the portal secret is a decoded random key | BACKEND_AUTH_ARCHITECTURE.md, Session Security | The documented 15-minute lifetime is enforced by the verifier, not only by the signer (R2-14) |
| Ports with a `humanOnly` option; module-owned namespaces and declarative public routes; audit and event catalogues | BACKEND_SERVICE_ARCHITECTURE.md, Module Boundary Rules | D-17 and R2-B2, R2-04, R2-16 |

### 10.4 What the frontend relies on, and how Phase 0 keeps it

| The frontend relies on | Phase 0 |
|---|---|
| Being served by the same Express server on port 5000: Vite middleware with HMR at `/vite-hmr` in development, `dist/public` in production | Unchanged. Frontend serving is mounted last; `PORT` default 5000 |
| `npm run dev` starting with no configuration | Kept, in frontend-only mode (§4.6) |
| Mock data only; no client code calls `/api` (`queryClient.ts`'s `apiRequest` is defined but never called) | Unchanged. `/api` paths now return JSON errors instead of `index.html`, which no client code requests |
| Frontend routes `/portal`, `/portal/:section`, `/portal/:section/:id` | Not matched by `/portal/v1` mounting. **Constraint for Track F:** no portal section may be named `v1` |
| No frontend route at `/health` | Confirmed in `client/src/App.tsx`; `/health` is free |
| Playwright `baseURL` `http://localhost:5000`, `testDir: './tests'` | Unchanged. Backend tests live under `server/` and are collected only by Vitest |
| `@shared` path alias (no client file uses it today) | Alias kept; `shared/schema.ts` removed |
| `deploy/replit-public` stays mock-only | Phase 0 never touches that branch (D-13; owner memory) |

---

## 11. COMMIT PLAN (IMPLEMENTATION JOB — `backend-platform-engineer`)

**Prerequisites (owner or PM, before commit 4):**
- the role SQL from §3.5, run on the development and test databases;
- a local `.env` with every variable in §4.6, including the three test URLs.

Commits 1–3 need no database.

After **every** commit the engineer runs `npm run check`, `npm run build` and `npm test`, and reports. Commits that change what the frontend sees (3 and 9) also run the Playwright suite with no `.env` (G0-02).

The test engineer writes the gate tests in parallel. The implementer runs them only once they are merged into `backend` and pulled. Every implementation commit must pass `npm run check` and `npm test` with **no** file from `server/tests/` present: `vitest.config.ts` references nothing there, the `gate` project passes with no tests, and the global setup lives in `server/platform/testing/` (§9.1). If something on the implementer's branch would need a test-engineer file, the plan is wrong — report it.

| # | Commit | Contents | Unit tests next to the code |
|---|---|---|---|
| 1 | `platform: tooling, scripts and test configuration` | Dependencies and scripts (§10.2). `vitest.config.ts` with the `unit` project only; `db` and `gate` are added in commit 4, when their global setup exists. Also `tsconfig.test.json`, `.env.example`, `.gitignore`, and the removal of `drizzle-kit push` | Vitest runs with `passWithNoTests` |
| 2 | `platform: configuration, modes, logger and error serializer` | `config/env.ts` (§4.6 modes and rules); `config/test-database.ts` (PS-22); `context/request-context.ts`; `logging/logger.ts`; `logging/error-serializer.ts` (the §4.7 allowlist table) | Every row of the serializer table, including a real `22P02` error object and a wrapped error carrying `params`; every mode-table row; every guard rule |
| 3 | `platform: HTTP pipeline, errors and frontend-only mode` | `errors/*`; `http/request-id.ts`, `http/request-logger.ts`, `http/not-found.ts`, `http/app.ts` (`createApiApp`, both modes), `http/health.ts` (frontend-only branch); `server/index.ts` rewritten (Replit logger removed); `server/routes.ts`, `server/storage.ts` and `shared/schema.ts` deleted; `server/modules/registry.ts` (empty) | Supertest: the pipeline order, envelope shapes, frontend-only responses, marker-free logs for the PS-07 cases. **Plus Playwright with no `.env`** |
| 4 | `platform: database client, platform tables and grant migration` | `db/client.ts` (one pool per role); `db/schema/audit.ts`, `db/schema/intelligence.ts` (T-1 to T-3, exactly §3.2–§3.4); `drizzle.config.ts`; `migrations/0000_platform_tables.sql` (generated) and `migrations/0001_platform_grants.sql` (custom); `db/migrate.ts`. `testing/global-setup.ts` and `testing/index.ts` (guard, then rebuild; per-role clients). `vitest.config.ts` gains the `db` and `gate` projects (§9.1) | `*.db.test.ts`: migrate on the test database; a smoke insert as `ledger_app`; the generated SQL reviewed against §3. `npm test` passes with `server/tests/` absent |
| 5 | `platform: unit of work, audit writer, outbox writer, tenant scoping` | `db/unit-of-work.ts`; `audit/audit-writer.ts`; `events/outbox-writer.ts`; `db/tenant-scope.ts`; execution contexts (WeakSet membership, deep freeze, expiry, private causation slot — §4.1), `server/platform/system/index.ts`, `tenantValues`, the savepoint-refusing `tx` wrapper, `app.company_id`, explicit-column inserts, the audit and event catalogue checks | Poisoning, closed-unit and nesting rules; strict input schemas; that context values win over caller values |
| 6 | `platform: JWT utilities and token middleware` | `auth/keys.ts`, `auth/jwt.ts`, `auth/tenant-context.ts` (PS-10, PS-11); `/api/v1` and `/portal/v1` mounted in full mode; health full-mode branch | Every case in G0-32 and G0-33 at unit level; sign/verify round trip; refusal to sign invalid claims |
| 7 | `platform: module registry, subscriber registry and port registry` | `ModuleRegistration` (§4.8: namespaces, `publicRoutes`, catalogues, `requiresPorts` / `providesPorts`); `humanOnly` port wrapper; `events/subscriber-registry.ts`; port registry with start-up validation; `ModuleDeps` with `contextOf`, `runInTransaction`, `logger` | Every check in PS-15 and PS-16 |
| 8 | `platform: outbox worker and worker process` | `events/outbox-worker.ts` (PS-17 to PS-20, with `runOnce`, `start`, `stop`); `server/worker.ts`; second esbuild entry and the `jose` allowlist entry; `dev:worker`, `start:worker` | Claim, per-subscriber fencing, finish, failure and backoff arithmetic, stale recovery, two concurrent workers |
| 9 | `platform: public surface and final verification` | `server/platform/index.ts` reviewed against §4 (no table objects, no pool; `testing/` not exported); dead code removed; nothing else | Full `npm test`, `npm run check`, `npm run build`, G0-01's bundle check, **Playwright with no `.env`** |

Any change the engineer finds necessary outside this plan or this specification is reported, not made (roster, Working rules).

---

## 12. OPEN QUESTIONS (FOR THE OWNER CHECKPOINT)

| ID | Question | Where | Recommendation |
|---|---|---|---|
| OQ-01 | FileStorage in Phase 0 or Phase 4? | §1.2 | **Closed — PM ruling, October 20, 2026: Phase 4 per the roadmap.** `server/platform/storage/` is reserved |
| OQ-02 | Portal token algorithm. The sources give "a separate key" (D-14) and name it `PORTAL_JWT_SECRET`; this specification reads that as HS256 | §4.3 | Confirm HS256 with `PORTAL_JWT_SECRET`. If you prefer asymmetric portal keys, the change is ES256 with `PORTAL_JWT_PRIVATE_KEY` / `PORTAL_JWT_PUBLIC_KEY`, contained in `server/platform/auth/` |
| OQ-03 | Four database roles (owner, `ledger_runtime`, `ledger_app`, `ledger_worker`) and four variables not named in D-12 (`DATABASE_MIGRATION_URL`, `DATABASE_MIGRATION_URL_TEST`, `DATABASE_WORKER_URL`, `DATABASE_WORKER_URL_TEST`), plus a one-off owner SQL step on each database server. That step includes revoking PUBLIC's `CONNECT` and setting passwords without plain text | §3.5, §4.6 | Approve. Without separate roles, gate item 5, outbox integrity and D-17's "API only" rule would hold only in application code. Production uses its own database server or project, or distinct role names, because roles are cluster-wide |
| OQ-04 | Who adds the `company_id` foreign keys to the three platform tables once `tenant.companies` exists | §3.1.7 | Make it a platform-engineer job inside Phase 1 (the tables are platform-owned), merged after the tenant schema |
| OQ-05 | Who enforces `job_id` on financially relevant audit entries? | §4.4 | **Closed — PM review round 2 (R2-16).** Modules declare their audit entry and event types with a `jobRequired` flag; `append()` and `record()` refuse an unregistered type or a missing `jobId` |
| OQ-06 | No event ordering guarantee across retries or workers | §4.5 | Confirm. Subscribers must not rely on order; any phase that needs ordering states it in its specification |
| OQ-07 | Event payloads carry identifiers and operational metadata, never financial amounts. Payloads are copied into the event log, which holds no sensitive fields and is readable by both runtime roles, so amounts there could later reach a worker-facing surface | §3.4, §7.3, §4.10 | Confirm as a rule for every later specification (Invariant 26) |
| OQ-08 | Outbox status names (`pending`, `processing`, `failed`, `delivered`, `dead_lettered`), and "max 5 retries" read as five attempts in total with delays of 1, 2, 4 and 8 s | §4.5 | Confirm |
| OQ-09 | Should stale-lock recovery count as a failed attempt? | §4.5, PS-20 | **Closed — PM ruling, October 20, 2026: yes.** A recovery counts as a failed attempt (same count, backoff and dead letter), so an event that crashes the worker dead-letters after five crashes |
| OQ-10 | No phase builds the requeue of dead-lettered events, or the outbox archival after 7 days (BACKEND_DATA_ARCHITECTURE.md, Event Outbox Table) | §1.2, §4.5 | Add both to Phase 9, following the §4.5 rules (R2-17): only `dead_lettered` rows can be requeued; a requeue never clears `delivered_subscribers` and is audited with the operator's identity; `delivered` rows are never requeued; archival removes only `delivered` rows, as a maintenance role with no other privilege. Until then, dead letters stay visible in the table |
| OQ-11 | No phase lists the audit query service or `/api/v1/audit/` | §1.2, §3.2, §3.4 | Assign it to Phase 7, alongside the Event Monitor. That phase also adds the audit and event-log read indexes deferred from Phase 0 (R3-02), with `CREATE INDEX CONCURRENTLY` |
| OQ-12 | A token stays valid for up to 15 minutes after its tenant is suspended, because the middleware does not check tenant status | §5.11, §4.10 | Close it in Phase 2 (§4.10). Phase 1 provides a tenant-status lookup; the token middleware checks it on each request, with a short cache. Session revocation then covers refresh |
| OQ-13 | Frontend-only mode: outside production, with no backend variables, the API serves the frontend and answers `/api` and `/portal/v1` with 503. Production and partial configurations fail fast | §4.6 | Approve. It keeps D-13's promise that frontend work and the Playwright suite need no database |
| OQ-14 | The actor role for the D-15 provisioning script (a platform administrator outside the tenant model) | §3.2, §4.10 | Decide in the Phase 1 specification. Until then the script writes as `system` with no causation. Either way, it records the operator's identity in the audit entry's `metadata` and connects as `ledger_app` (§4.10) |
| OQ-15 | Worker log correlation field named `runId` rather than the document's `jobId` | §4.7 | Confirm `runId` |
| OQ-16 | Approval → financial record: one transaction or a subscriber | §4.9 | **Decided as D-17** (merged into `backend` @ 9500bca): one transaction, with dependency inversion through an `ApprovalEffectsPort`. §4.9 and PS-16 now cite it and map each of its requirements to the port mechanism (review round 1, R1-01). Removed from the open list |
| OQ-17 | A shared pagination helper (cursor encode/decode, `limit` 1–200 default 50, response shape) is not in the roadmap's Phase 0 list | §6.5 | Add it to the platform — by PM ruling in Phase 0, or as a platform change before the first list endpoint (Phase 1) — so every module paginates the same way |
| OQ-18 | BACKEND_DATA_ARCHITECTURE.md says "Row-level security prevents any write except INSERT" on the audit table; RLS is Phase 9 | §1.2, §3.5 | Confirm that column and table grants satisfy the guarantee until Phase 9 |
