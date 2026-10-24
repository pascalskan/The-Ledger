# THE LEDGER — PHASE 1 SPECIFICATION — TENANT MODULE

Version: 0.2 — DRAFT, commit 2 of 3 (sections 1–8). Sections 9–12 are written in commit 3. v0.2 also applies PM review points 1–7 on v0.1 (change log below).
Status: **DRAFT — for PM review. Not yet submitted to the owner checkpoint.**
Date: October 2026
Author: `backend-architect`
Branch: `agent/backend-architect/phase-1-spec` (from `backend` @ 7cf8b58)
Implements: `BACKEND_IMPLEMENTATION_ROADMAP.md` v2.2, Phase 1, under `BACKEND_OPEN_DECISIONS.md` v1.2 (D-01 … D-17) and the owner-approved Phase 0 open questions OQ-04, OQ-12, OQ-14 and OQ-17
Built on: `docs/backend/phases/PHASE-0-infrastructure.md` v0.6 (APPROVED). Phase 1 uses that platform exactly as specified. Where Phase 1 cannot, the point is an open question (§12), never a change to Phase 0.
Implementers: `backend-module-engineer` (tenant module and script) and `backend-platform-engineer` (platform additions PA-01 … PA-05) · Gate tests: `backend-test-engineer`

This specification follows the Phase Specification Template in `BACKEND_AGENT_ROSTER.md` v1.1. All paths are relative to the app folder (`The-Ledger/`). Identifiers used below:

- `S1-nn` — scope items (section 1)
- `PA-nn` — platform additions that Phase 1 needs (section 1, built by the platform engineer)
- `T1-n` — tables (section 3)
- `INV-n` — invariants this phase owns (section 4)
- `UC-nn` — use cases (section 5)
- `G1-nn` — gate tests (section 9)
- `OQ1-nn` — open questions for the owner checkpoint (section 12). Phase 0's questions are always written "Phase 0 OQ-nn" in this document.

**Change log**

| Version | Changes |
|---|---|
| 0.1 | Sections 1–4 |
| 0.2 | PM review of v0.1: (1) lock mode is `FOR NO KEY UPDATE` / `FOR SHARE`, not `FOR UPDATE` (§4.2); (2) INV-1 reworded, pointing to the INV-12 exception; (3) FK checks run as the table owner, no `REFERENCES` grant, `SELECT` through `ledger_runtime` unchanged (§3.7); (4) INV-11 enforcement: scan and subscriber-context test (§4.3); (5) audit entries keep previous and new values; INV-13 narrowed to events and secrets (§4.3, §8); (6) OQ1-11 closed: job D1 fixture helper before job C, C accepted only with the Phase 0 gate green (§1.5, §3.7); (7) `updated_by` foreign key is a Phase 2 obligation (§4.6). Sections 5–8 added |

**Two things to know before reading.**
1. **Nobody can sign in during Phase 1.** Identity (users, login, refresh) is Phase 2. Every CEO route in this phase is therefore exercised only in gate tests, with tokens signed by the platform's own `signPlatformToken` (Phase 0 PS-09). Phase 1 trusts the `role` claim in such a token for its CEO-only checks. That is acceptable only because no real token can exist yet. Phase 2 must re-load the role from `identity` on these paths (Phase 0 §4.10; OQ1-13).
2. **Provisioning has no HTTP surface.** Creating, suspending, reactivating and terminating a tenant, and changing its plan, run only through an audited command-line script (D-15). The only HTTP routes of this phase are the signed-in CEO's own company configuration.

---

## 1. SCOPE

### 1.1 Included

Items S1-01 to S1-10 are the roadmap's Phase 1 "Includes" list, in order. S1-11 to S1-14 follow from the owner-approved Phase 0 open questions. Nothing else is added.

| ID | Roadmap item or decision | Delivered as |
|---|---|---|
| S1-01 | `tenant` schema: companies, subscriptions, plans, configurations | T1-1 `tenant.plans`, T1-2 `tenant.companies`, T1-3 `tenant.subscriptions`, T1-4 `tenant.configurations`, with grants and database rules (§3) |
| S1-02 | `TenantProvisioningService` | UC-01 `ProvisionTenant` (§5) |
| S1-03 | `TenantLifecycleService`; lifecycle `active → suspended → active` and `active/suspended → terminated`, with audit entries | UC-02 `SuspendTenant`, UC-03 `ReactivateTenant`, UC-04 `TerminateTenant`; the state machine in §4.2; one audit entry and one event per transition (§8, §7) |
| S1-04 | `TenantConfigurationService` | UC-05 `ChangeTenantPlan`, UC-06 `UpdateTenantConfiguration`, UC-07 `GetTenantConfiguration` (§5) |
| S1-05 | Events `TenantProvisioned`, `TenantSuspended`, `TenantReactivated`, `TenantTerminated`, `TenantConfigurationUpdated`, `TenantPlanChanged` | Written to the outbox in the same transaction as the state change (§7). Phase 1 registers no subscriber; the consumers named in BACKEND_EVENT_ARCHITECTURE.md arrive in Phases 2 and 7 |
| S1-06 | `getTenantContext(companyId)` public API used by every other module | `getTenantContext(uow)` with its companion `getPlan(uow)` and `assertTenantActive(uow)`, exported from `server/modules/tenant/index.ts` (§4.5, §5). The signature differs from the Service Architecture's on purpose; see §4.5 and §10 |
| S1-07 | Provisioning surface per D-15: command-line script; the CEO can read and update own configuration only | The script `npm run tenant -- <command>` in `server/scripts/` (§5); the routes `GET` and `PATCH /api/v1/tenant/configuration` (§6) |
| S1-08 | Demo company flag on the company record (Invariant 24) | `tenant.companies.is_demo`, set once at provisioning and never changed (INV-4); exposed read-only in `TenantInfo` |
| S1-09 | `company_id` foreign key convention every later schema follows | Convention in §3.1; the three Phase 0 platform tables get the foreign keys in PA-04 |
| S1-10 | Phase 1 gate: suspended and terminated tenants cannot be used by any later module; no in-tenant user, including the CEO, can change tenant lifecycle | §1.3, §9 |
| S1-11 | **Phase 0 OQ-04 (approved):** `company_id` foreign keys on `audit.audit_entries`, `intelligence.event_outbox`, `intelligence.event_log` | **PA-04**, a separate platform-engineer job, merged after the tenant schema exists |
| S1-12 | **Phase 0 OQ-17 (approved):** the shared pagination helper | **PA-01**, in Phase 1's platform work (Phase 0 OQ-17: "before the first list endpoint"). It is built in platform job A, not job C, because it has no dependency on the tenant schema; the PM may merge A and C into one job (§5.5) |
| S1-13 | **Phase 0 OQ-12 (approved):** a per-request tenant-status check in the token middleware, through a tenant port, cached for a few seconds | **PA-02** (platform hook and middleware check) and UC-08 `ResolveTenantStatus` (the tenant module's implementation) (§5) |
| S1-14 | **Phase 0 OQ-14 (approved):** decide the actor identity of the D-15 script | Decided in §4.4: actor role `system`, fixed component `tenant-cli`, no causation, operator identity in audit `metadata`, connection as `ledger_app` |

**Platform additions.** Phase 1 needs five changes in `server/platform/` and root configuration. They belong to `backend-platform-engineer` (Folder Ownership). They are the plumbing the owner approved plus two things Phase 0 left open, which are open questions (OQ1-08, OQ1-09).

| ID | Addition | Why | Built in |
|---|---|---|---|
| PA-01 | `server/platform/http/pagination.ts` — the pagination helper (Phase 0 OQ-17) | Every module paginates the same way from its first list endpoint | Platform job A |
| PA-02 | A platform tenant-status port token and the status check in PS-10 and PS-11, with a short in-process cache and its configuration variable (Phase 0 OQ-12) | Closes the suspension window; gives the gate its enforcement point | Platform job A |
| PA-03 | A script bootstrap in `server/platform/system/`: `loadScriptConfig` and a runtime opener that connects as `ledger_app` with the §3.5 self-check. The `tenant` entry in `package.json`. `'tenant'` added to `drizzle.config.ts`'s `schemaFilter` | Phase 0 defines `createSystemContext` and `runInTransactionAs` but no way for a script to read configuration or obtain a pool (OQ1-09) | Platform job A |
| PA-04 | A custom migration adding `FOREIGN KEY (company_id) REFERENCES tenant.companies(company_id) ON DELETE RESTRICT` to the three platform tables (Phase 0 §3.1.7) | Phase 0 OQ-04 | Platform job C, after the tenant schema and the fixture change are merged (§1.5) |
| PA-05 | Configuration variable `TENANT_STATUS_CACHE_MS` in `loadApiConfig` | PA-02's cache lifetime | Platform job A |

### 1.2 Excluded

| Not in Phase 1 | Where it belongs | Source |
|---|---|---|
| Users, login, refresh, logout, passwords, the initial CEO user, `requireRole`, re-loading a user's role from the database | Phase 2 | Roadmap Phase 2 |
| The `TenantProvisioned` and `TenantSuspended` subscribers (create the initial CEO, revoke sessions) | Phase 2 | BACKEND_EVENT_ARCHITECTURE.md, Subscriber Registry |
| The Intelligence "audit" and "alert" consumers of the six tenant events | Phase 7 | BACKEND_EVENT_ARCHITECTURE.md, Tenant Module Events |
| Any HTTP route to provision, suspend, reactivate or terminate a tenant, or to change a plan | None in v1. Future admin console | D-15; BACKEND_MULTITENANCY_ARCHITECTURE.md, Cross-Tenant Data Access |
| Deleting a terminated tenant's data ("data deletion scheduled") | Not built. It conflicts with D-05 and with audit permanence (OQ1-07) | BACKEND_MULTITENANCY_ARCHITECTURE.md, Tenant Lifecycle |
| Billing, invoicing of subscribers, plan limits that are enforced, plan self-service, trials | Future ("subscription management, billing, plan enforcement" grow later) | BACKEND_DOMAIN_ARCHITECTURE.md, Tenant Context rationale |
| Configuration items whose content other modules define: accounting provider preferences, notification preferences, per-tenant feature-flag overrides | Phases 6, 7 and the first phase that reads a flag (OQ1-03) | BACKEND_MULTITENANCY_ARCHITECTURE.md, Tenant Configuration |
| The prototype's bank details, registration number, VAT ID, branding and accounting-integration token | No home in the architecture yet (OQ1-03) | `client/src/lib/mockData.ts` `CompanySettings` |
| PostgreSQL Row Level Security on `tenant` tables | Phase 9 | Phase 0 §4.10 |
| The audit query service, the tenant-status caching beyond one process, Redis | Phase 7, Phase 9, never in v1 | Phase 0 OQ-11; D-10 |
| A fifth database role for the script | Not chosen (OQ1-10) | Phase 0 OQ-03, OQ-14 |
| Any change to `client/`, the Playwright suite, `deploy/replit-public`, Phase 0 files other than through PA-01 … PA-05, or any document | — | Roster, Folder Ownership; D-13 |

### 1.3 Roadmap gate (to be proven in §9)

1. Suspended and terminated tenants cannot be used by any later module (test)
2. No in-tenant user, including the CEO, can change tenant lifecycle (test)

Doctrines verified at this gate (roadmap, Doctrine Verification by Phase): **tenant lifecycle; demo data isolation.**

"Any later module" is read as follows, because Phase 1 can only enforce what exists:
- every request a later module serves, through the status check in the token middleware (PA-02), on both `/api/v1` and `/portal/v1`;
- every later module's non-request code that needs the answer, through `assertTenantActive(uow)` and `getTenantContext(uow)`.

What Phase 1 deliberately does not do is stop the worker delivering events for a suspended tenant: `TenantSuspended` itself must reach Identity's session-revocation subscriber. Which subscribers must refuse to write business records for an inactive tenant is a decision for the phases that own them, recorded as a binding obligation in §1.4 (OQ1-12).

### 1.4 Binding obligations from Phase 0 §4.10, and where each is met

Every "Phase 1" row and every "Every phase" row of Phase 0 §4.10 applies. Section 9 maps each row to its gate tests.

| Phase 0 §4.10 obligation | Applies to Phase 1 as | Met in |
|---|---|---|
| Every phase — narrowest role per table; never a `financial.*` privilege or approval-state `UPDATE` to `ledger_runtime` or `ledger_worker` | `ledger_runtime` gets `SELECT` on the four tenant tables. Every write privilege goes to `ledger_app`, column by column. `ledger_worker` has no write privilege. No `financial.*` table exists | §3.5 |
| Every phase — runtime code, scripts included, never uses the owner URL | The script connects as `ledger_app` through PA-03 and never reads `LEDGER_MIGRATION_DATABASE_URL`, `DATABASE_URL` or `PG*` | §5 (script), PA-03 |
| Every phase — `tenantValues` for inserts; `tenantWhere` for reads, updates | All repository code for T1-2, T1-3, T1-4. T1-1 `plans` is the one exception (INV-12, §3.1) | §3.1, §5 |
| Every phase — no `*_by` field filled from causation | `configurations.updated_by` is filled only from a `user` actor; it is `NULL` for script writes | §3.4, §4.4 |
| Every phase — list audit and event types with `jobRequired`; all tenant types are `jobRequired: false` (none is financially relevant) | The registration's catalogues | §7, §8 |
| Every phase — each financially relevant action's audit entry is gate-tested | Tenant actions are not financial, but each one writes an entry, so each is tested the same way | §9 |
| Every phase — one owning module per audit and event type | The `tenant` module owns the six event types and six audit entry types | §7, §8 |
| Every phase — functions: `REVOKE EXECUTE … FROM PUBLIC`; no `SECURITY DEFINER` | The two trigger functions in §3.6 | §3.6 |
| Every phase — event payloads carry identifiers and metadata, never financial amounts | Tenant payloads carry identifiers, status names and field names only; no free text, no contact details | §7 |
| Every phase — every path parameter is a UUID; no personal data in a path | The tenant routes have no path parameters | §6 |
| Every phase — no backend secret in `client/.env*` | Phase 1 changes no frontend file | — |
| **Phase 1** — the D-15 script records the operator's identity in the audit entry's `metadata` and connects as `ledger_app` | UC-01 … UC-05 when run by the script | §4.4, §5, §8 |
| Phase 2 — close the tenant-suspension window | Split, so the work is not done twice: **Phase 1 delivers the per-request status check** (PA-02, as approved in Phase 0 OQ-12); **Phase 2 delivers refresh-token and session revocation** on `TenantSuspended` and `TenantTerminated`. A refresh must also check the status, because a refresh is a public route that PA-02 does not cover | §1.3, §4.5, OQ1-12 |
| Phase 2 — re-load the actor's role from `identity` on authority-bearing paths | Phase 1's CEO-only checks trust the token's role claim (see the opening note). Phase 2 retrofits UC-05 and UC-06 | OQ1-13 |

New obligations that Phase 1 places on later phases are in §4.6.

### 1.5 How Phase 1 is delivered

Four jobs, in this order of dependency (merge order: A, then B and D1, then C, then D2 with B's module; the commit plans are in §11):

| Job | Agent | Depends on |
|---|---|---|
| A — platform: PA-01, PA-02, PA-03, PA-05 | `backend-platform-engineer` | Phase 0 merged |
| B — tenant module, migrations and script | `backend-module-engineer` | A (the port token and the script bootstrap) |
| C — platform: PA-04 | `backend-platform-engineer` | B's tenant schema merged **and** D's fixture change (companies A/B helper; Phase 0 gate fixtures updated) merged. Acceptance: the full Phase 0 gate suite is green with the foreign keys in place |
| D — gate tests, in two steps | `backend-test-engineer` | **D1** (fixture helper and Phase 0 fixture update) needs only this specification and the tenant schema's table names; it must be merged before C. **D2** (the G1 tests) runs in parallel with A and B |

---

## 2. SOURCES

### 2.1 Doctrine and decisions

| Source | Section | Used for |
|---|---|---|
| `docs/ai-context/LEDGER_CANONICAL_CONTEXT.md` | Audit Doctrine | Required audit fields → §8 |
| same | Role Model (CEO: full platform access; Project Manager: assigned jobs; Worker: reporting only; Client: read-only portal) | Only the CEO reads and updates company configuration (INV-8) |
| same | Event Bus Doctrine | Tenant events are informational; the bus never creates financial records |
| same | Platform Lexicon | British English in every user-readable string |
| `BACKEND_AGENT_ROSTER.md` | Shared Rules — Doctrine; Folder Ownership (`server/scripts/**`) | Every query, use case and event carries `company_id`; cross-tenant access returns 404; no hard deletes; no sensitive data in logs; who builds what (§1.5) |
| `docs/domain/DOMAIN_MODEL_SUMMARY.md` (frozen) | Domain Invariant 24 (demo company data must never appear in a real-business company context; company context is enforced at every data query); Invariants 1, 6; Audit Requirements and Audit Immutability | INV-4, INV-1; the audit trail is permanent |
| the 14 frozen domain documents | each lists "Demo company … data must never appear in a real-business company context" as an invariant | The demo flag and `company_id` scoping are what let every domain keep that promise |
| **D-15** | Tenant provisioning surface | Script, no HTTP surface, `/api/v1/tenant/` is the CEO's own configuration only (§5, §6) |
| **D-05** | No hard deletes | No `DELETE` endpoint; no `DELETE` or `TRUNCATE` for any role or for the owner (§3.5, §3.6) |
| **D-02** | Role model | Only the doctrine role `ceo` is enforced here. No permission keys, no custom roles (§4.4) |
| **D-10** | No Redis | The status cache is in-process (PA-02) |
| **D-14** | Tooling | `util.parseArgs` from Node for the script (no new dependency); Vitest, Supertest, Zod, Drizzle as in Phase 0 |
| **D-17** | Approval in one transaction | Not used. Noted because it confirms that the tenant module sits at the bottom of the dependency direction and calls no other module |
| Phase 0 OQ-04, OQ-12, OQ-14, OQ-17 | Owner-approved October 21, 2026 | S1-11 … S1-14 |

### 2.2 Architecture

| Document | Section | Used for |
|---|---|---|
| BACKEND_DOMAIN_ARCHITECTURE.md | 1. Tenant Context (owns, responsibilities, produces/consumes); Aggregate Ownership | Aggregates (§4.1), events (§7), "consumes none" |
| BACKEND_SERVICE_ARCHITECTURE.md | Module 1: Tenant Module (public API, internal services, dependencies none); Module 2 (Identity depends on Tenant's `TenantContext`); Module Boundary Rules | Module surface (§4.5), service names (§5) |
| BACKEND_DATA_ARCHITECTURE.md | Persistence Strategy (`tenant` schema); Aggregate Roots and Ownership; Write Models (no hard deletes); Transaction Boundaries; Audit Storage Requirements; Event Storage Requirements | Tables (§3), transaction boundaries (§5), audit fields (§8) |
| BACKEND_EVENT_ARCHITECTURE.md | Tenant Module Events; Event Payload Standard; Subscriber Registry | Event names and consumers (§7) |
| BACKEND_MULTITENANCY_ARCHITECTURE.md | Tenancy Model; Tenant Ownership; Tenant Provisioning Model; Tenant Lifecycle; Tenant Configuration; Data Isolation Requirements (Layers 1–4); Cross-Tenant Restrictions; Tenant Isolation Enforcement Checklist | Lifecycle (§4.2), provisioning steps (§5), configuration (§3.4), demo rule, test checklist (§9) |
| BACKEND_AUTH_ARCHITECTURE.md | Primary Platform Authentication step 2a/2b (tenant status; "403 (account suspended)"); Tenant-Aware Permissions | Refusal status (§6.3), PA-02 |
| BACKEND_API_ARCHITECTURE.md | Domain-Driven API Boundaries (`/api/v1/tenant/`); Error Handling Strategy; Validation Strategy; Pagination Strategy; No Hard Deletes | §6, PA-01 |
| BACKEND_LAYERING_ARCHITECTURE.md | Layers 1–4; Cross-Cutting Concerns | Module layout (§4.6) |
| BACKEND_OBSERVABILITY_ARCHITECTURE.md | What Triggers an Audit Entry; Logging Strategy | §8, logging rules |
| BACKEND_INFRASTRUCTURE_ARCHITECTURE.md | Process Model; Required environment variables | Script as a third process type; PA-05 |
| BACKEND_ARCHITECTURE_SUMMARY.md | Tenant Model | Cross-check |

### 2.3 The Phase 0 platform this specification relies on

Phase 1 changes none of this. Everything below is as written in PHASE-0-infrastructure.md v0.6.

| Phase 0 | What Phase 1 relies on |
|---|---|
| §3.1.7 | Phase 1 adds the `company_id` foreign keys to T-1, T-2, T-3 with `ON DELETE RESTRICT`, in a platform migration (PA-04) |
| §3.1.3–§3.1.10 | UUID keys; `timestamptz`; snake_case; explicit grants, column by column; no hard deletes; migrations generated and never edited after commit |
| §3.5 | Roles `ledger_runtime`, `ledger_app`, `ledger_worker`; the owner SQL; the grant pattern; the migration lint; the role self-check (its `member_of` and privilege conditions must keep holding after Phase 1's grants) |
| §4.1 | `ExecutionContext`, `Actor` (the `system` kind has a `component`), `createSystemContext(companyId, component)` and `toCompanyId` from `server/platform/system/index.ts` for scripts, `runInTransactionAs(module, ctx, work)`; subscribers are always `system` with causation |
| §4.2 | `tenantScope`, `tenantWhere`, `tenantValues`, which accept only tables that have a `companyId` column; `app.company_id` set per transaction |
| §4.4 | `runInTransaction`, poisoning, no nesting, `AuditEntryInput` and `DomainEventInput` (no company, actor or causation fields), the catalogues with `jobRequired` and module ownership, `deps.adopt(uow)` |
| §4.5 | Envelope, outbox lifecycle, "Subscribers are always `system`", no ordering guarantee, payload rules |
| §4.6 | `loadApiConfig`, `loadWorkerConfig`, `loadMigrationConfig`; only `server/platform/config/` reads `process.env` (rule 13); complete database URLs |
| §4.8 | `ModuleRegistration` (`name`, `apiRouters`, `providesPorts`, catalogues), namespaces, import rules 1–13 (rule 8: the platform never imports a module; rule 10: modules have no pool; rule 11: `system/` is not importable from modules; rule 12: a port implementation is reachable only through its `bind`) |
| PS-10, PS-11, PS-16 | The token middleware, which PA-02 extends; the port registry, whose rules PA-02 must fit (OQ1-08) |
| §6.3, §6.5 | The error envelope and codes; the pagination convention PA-01 implements |
| §8.2 | How each audit field is filled |
| §9.1 | The gate harness: Vitest `unit`, `db`, `gate` projects; `server/tests/support/` owned by the test engineer; companies A and B |

### 2.4 Code read

`client/src/lib/mockData.ts` (`CompanySettings`, `REAL_COMPANY_ID`, `DEMO_COMPANY_ID`, the demo and default settings), `client/src/pages/settings.tsx` (the company settings form and its validation). The roadmap names no prototype engine for Phase 1. Differences are listed in §10.

---

## 3. DATA MODEL

### 3.1 Conventions

1. **Schema.** One schema, `tenant`, declared with `pgSchema('tenant')` in `server/modules/tenant/infrastructure/schema.ts` (Phase 0 §3.1.1). Nothing is created in `public`. `drizzle.config.ts` gains `'tenant'` in `schemaFilter` (PA-03).
2. **Keys, timestamps, names** follow Phase 0 §3.1.3–§3.1.5: `uuid` primary keys with `gen_random_uuid()`, `timestamptz` in UTC, `snake_case` columns.
3. **`company_id` on every tenant table.** T1-2, T1-3, T1-4 carry it. On T1-2 it is the primary key itself (the company *is* the tenant); on T1-3 and T1-4 it is a foreign key to `tenant.companies(company_id)` with `ON DELETE RESTRICT`. Phase 0's `tenantScope`, `tenantWhere` and `tenantValues` accept all three, because each has a `companyId` column.
4. **The one exception: T1-1 `plans`.** A plan is the platform's catalogue of what a tenant may subscribe to. It belongs to no company, so it has no `company_id`, and the Phase 0 helpers reject it at the type level. The exception is deliberate (INV-12): `plans` holds no tenant data, `ledger_runtime` may read it, and no runtime role may write it. Roster and architect rules say "every tenant table has `company_id`"; this is not a tenant table. Confirmation: OQ1-01.
5. **The convention for every later schema** (S1-09). A table in any other schema has `company_id uuid NOT NULL REFERENCES tenant.companies(company_id) ON DELETE RESTRICT`. The reference is declared in that module's Drizzle schema by importing the `companies` table handle from `server/modules/tenant/index.ts`'s public surface, not from `infrastructure/`. The foreign key is checked immediately, so a row can never be written for a company that does not exist, including by a worker subscriber. No index on `company_id` is added for the foreign key alone (companies are never deleted, so the referential check is only ever an insert-time lookup against the primary key). Each module adds the `company_id`-leading indexes its own reads need.
6. **Grants** follow Phase 0 §3.1.8: explicit, column by column, narrowest role (§3.5).
7. **No hard deletes** (D-05, Phase 0 §3.1.9): no runtime role has `DELETE` or `TRUNCATE`, and database rules refuse both even for the owner (§3.6).
8. **Row Level Security** is Phase 9. The tables are written so a policy `company_id = current_setting('app.company_id')::uuid` will fit (`plans` gets no policy).

### 3.2 T1-1 `tenant.plans`

Source: BACKEND_SERVICE_ARCHITECTURE.md, Module 1 (`getPlan(companyId)` → Plan "feature flags, limits"); BACKEND_DOMAIN_ARCHITECTURE.md, Tenant Context ("subscription and plan details (feature flags, limits, tier)"); roadmap Phase 1 ("plans"). No document defines any plan, any flag or any limit (OQ1-01).

Global catalogue; **no `company_id`**. Rows are created and changed only by migrations run as the owner. **No runtime role writes this table.**

| Column | Type | Null | Default | Constraint / notes | Mutable |
|---|---|---|---|---|---|
| `plan_id` | `uuid` | no | `gen_random_uuid()` | Primary key | no |
| `code` | `text` | no | — | `UNIQUE`. `CHECK (code ~ '^[a-z][a-z0-9_]{1,49}$')`. The stable name used by the script, events and audit entries | no |
| `name` | `text` | no | — | `CHECK (length(name) BETWEEN 1 AND 100 AND name = btrim(name) AND name !~ '[[:cntrl:]]')`. British English display name | owner only |
| `feature_flags` | `jsonb` | no | `'{}'` | `CHECK (jsonb_typeof(feature_flags) = 'object')`. Keys are `snake_case` flag names, values are booleans. No flag key is defined in Phase 1; the first phase that reads a flag defines it | owner only |
| `limits` | `jsonb` | no | `'{}'` | `CHECK (jsonb_typeof(limits) = 'object')`. Keys are `snake_case` limit names, values are non-negative integers. No limit key is defined or enforced in Phase 1 | owner only |
| `is_active` | `boolean` | no | `true` | An inactive plan cannot be assigned to a tenant (INV-12); existing subscriptions to it keep working | owner only |
| `created_at` | `timestamptz` | no | `now()` | — | no |

The shape of `feature_flags` and `limits` (boolean values; non-negative integers) is validated in the domain layer when a plan is read. A `CHECK` cannot express it without a function, and the table is owner-managed.

**Seed.** One row, `code = 'standard'`, `name = 'Standard'`, empty `feature_flags` and `limits`, inserted by a custom migration. It exists so that a tenant can be provisioned before the owner defines real plans. It is a placeholder, not a decision (OQ1-01). Gate tests create their own plans with the owner client.

Indexes: `plans_pkey (plan_id)`, `plans_code_key (code)` — both required by constraints. No others (the table has a handful of rows).

### 3.3 T1-2 `tenant.companies`

Source: BACKEND_MULTITENANCY_ARCHITECTURE.md, Tenant Ownership ("`tenant.companies` — the company record; lifecycle state; metadata") and Tenant Lifecycle; BACKEND_DOMAIN_ARCHITECTURE.md, Tenant Context; roadmap (demo flag).

The company record. One row per tenant. A row changes **only by a lifecycle transition** (§3.6 enforces this in the database). The domain's "TenantMetadata" and "TenantLifecycle record" are the columns of this table plus the audit entries; no further table is created (OQ1-16).

| Column | Type | Null | Default | Constraint / notes | Mutable |
|---|---|---|---|---|---|
| `company_id` | `uuid` | no | `gen_random_uuid()` | **Primary key** and the tenant key every other schema references. The application supplies it (UC-01 needs it before the row exists, to build the execution context) | no |
| `name` | `text` | no | — | `CHECK (length(name) BETWEEN 1 AND 200 AND name = btrim(name) AND name !~ '[[:cntrl:]]')`. The name the platform administrator gave the company at provisioning, used by the operator's `show` command. Not the CEO-editable legal name (T1-4). No rename use case in v1 (OQ1-16) | no |
| `status` | `text` | no | `'active'` | `CHECK (status IN ('active','suspended','terminated'))`. The lifecycle state (§4.2). A new company can only be inserted as `active`: the insert grant omits this column (§3.5) | yes — transitions only |
| `is_demo` | `boolean` | no | `false` | Demo company flag (INV-4, Invariant 24). Set once at provisioning | **no** |
| `status_changed_at` | `timestamptz` | no | `now()` | Time of the last lifecycle transition (equals `created_at` until the first) | yes — with `status` |
| `terminated_at` | `timestamptz` | yes | — | `CHECK ((status = 'terminated') = (terminated_at IS NOT NULL))`. Set on termination and never changed | yes — once |
| `created_at` | `timestamptz` | no | `now()` | — | no |
| `updated_at` | `timestamptz` | no | `now()` | Set with every transition | yes — with `status` |

Indexes: `companies_pkey (company_id)`. No other index. Every read in Phase 1 is by primary key (the status lookup, `getTenantContext`, `show`), and the platform tables' foreign keys reference the primary key.

Referenced by: T1-3, T1-4, and (after PA-04) T-1, T-2, T-3 of Phase 0 and every table of every later schema.

### 3.4 T1-3 `tenant.subscriptions` and T1-4 `tenant.configurations`

**T1-3 `tenant.subscriptions`** — Source: BACKEND_MULTITENANCY_ARCHITECTURE.md, Tenant Ownership ("`tenant.subscriptions` — plan and subscription details"); BACKEND_DATA_ARCHITECTURE.md, Aggregate Roots. One current subscription per company. A plan change updates the row; the history is the audit trail and the `TenantPlanChanged` events. No billing field, no status, no period (OQ1-01).

| Column | Type | Null | Default | Constraint / notes | Mutable |
|---|---|---|---|---|---|
| `subscription_id` | `uuid` | no | `gen_random_uuid()` | Primary key | no |
| `company_id` | `uuid` | no | — | `UNIQUE`; `REFERENCES tenant.companies(company_id) ON DELETE RESTRICT`. Exactly one subscription per company (INV-6) | no |
| `plan_id` | `uuid` | no | — | `REFERENCES tenant.plans(plan_id) ON DELETE RESTRICT` | yes — UC-05 |
| `started_at` | `timestamptz` | no | `now()` | When the tenant was provisioned | no |
| `plan_changed_at` | `timestamptz` | yes | — | `NULL` until the first plan change | yes — UC-05 |
| `created_at` | `timestamptz` | no | `now()` | — | no |
| `updated_at` | `timestamptz` | no | `now()` | — | yes — UC-05 |

Indexes: `subscriptions_pkey (subscription_id)`, `subscriptions_company_id_key (company_id)` (the unique constraint, and the lookup index for every read). No index on `plan_id` (no read goes from a plan to its subscriptions in Phase 1).

**T1-4 `tenant.configurations`** — Source: BACKEND_MULTITENANCY_ARCHITECTURE.md, Tenant Configuration and Tenant Ownership. Provisioning creates this row with the company (INV-6); the signed-in CEO updates it (INV-8). Only the items the architecture lists and the CEO can sensibly own are columns. Items that other modules define, and the prototype's extra fields, are deferred (OQ1-03).

| Column | Type | Null | Default | Constraint / notes | Mutable |
|---|---|---|---|---|---|
| `company_id` | `uuid` | no | — | **Primary key**; `REFERENCES tenant.companies(company_id) ON DELETE RESTRICT`. One configuration per company | no |
| `legal_name` | `text` | no | — | `CHECK (length(legal_name) BETWEEN 1 AND 200 AND legal_name = btrim(legal_name) AND legal_name !~ '[[:cntrl:]]')`. "Company name". Starts as the provisioning name | yes — CEO |
| `address` | `text` | yes | — | `CHECK (length(address) <= 500 AND address !~ '[[:cntrl:]]')`. "Address". Free text, as in the prototype | yes — CEO |
| `contact_email` | `text` | yes | — | `CHECK (length(contact_email) <= 254 AND contact_email ~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$')`. "Contact details" | yes — CEO |
| `contact_phone` | `text` | yes | — | `CHECK (length(contact_phone) <= 40 AND contact_phone ~ '^[0-9+()./ -]+$')`. "Contact details" | yes — CEO |
| `website` | `text` | yes | — | `CHECK (length(website) <= 300 AND website ~ '^https?://[^[:space:]]+$')`. "Contact details" | yes — CEO |
| `default_currency` | `text` | no | — | `CHECK (default_currency ~ '^[A-Z]{3}$')`. "Default currency". Format only: the architecture names no currency list. Set at provisioning and **not changeable in v1** (INV-10; OQ1-04) | **no** |
| `updated_by` | `uuid` | yes | — | The CEO user who made the last change. Filled only from a `user` actor (Phase 0 §4.1); `NULL` until the CEO first edits, and never filled by the script. No foreign key (`identity.users` is Phase 2) | yes — CEO |
| `created_at` | `timestamptz` | no | `now()` | — | no |
| `updated_at` | `timestamptz` | no | `now()` | — | yes — CEO |

Indexes: `configurations_pkey (company_id)` only.

**Immutable columns, all tables.** T1-1: all columns except by migration. T1-2: `company_id`, `name`, `is_demo`, `created_at`. T1-3: `subscription_id`, `company_id`, `started_at`, `created_at`. T1-4: `company_id`, `default_currency`, `created_at`.

**Constraint helper.** The `CHECK` expressions above are the database's last word. The domain value objects (§4.1) apply the same rules and return field-level messages first, so a user sees "Enter a valid email address", not a constraint name.

### 3.5 Grants

Source: Phase 0 §3.1.8, §3.5. Written in the custom migration `tenant_grants`, applied after the table migration. Like Phase 0's grant migration, it first fails with a clear message if a runtime role is missing, then runs the statements below. The summary table comes first.

| Table | `ledger_runtime` (both processes) | `ledger_app` (API and script) | `ledger_worker` |
|---|---|---|---|
| `plans` | `SELECT` | — | — (via `ledger_runtime`: `SELECT`) |
| `companies` | `SELECT` | `INSERT (company_id, name, is_demo)`; `UPDATE (status, status_changed_at, terminated_at, updated_at)` | `SELECT` only |
| `subscriptions` | `SELECT` | `INSERT (company_id, plan_id)`; `UPDATE (plan_id, plan_changed_at, updated_at)` | `SELECT` only |
| `configurations` | `SELECT` | `INSERT (company_id, legal_name, address, contact_email, contact_phone, website, default_currency)`; `UPDATE (legal_name, address, contact_email, contact_phone, website, updated_by, updated_at)` | `SELECT` only |

```sql
REVOKE ALL ON SCHEMA tenant FROM PUBLIC;
REVOKE ALL ON ALL TABLES IN SCHEMA tenant FROM PUBLIC;
REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA tenant FROM PUBLIC;
GRANT USAGE ON SCHEMA tenant TO ledger_runtime;
GRANT SELECT ON tenant.plans, tenant.companies, tenant.subscriptions, tenant.configurations TO ledger_runtime;

GRANT INSERT (company_id, name, is_demo) ON tenant.companies TO ledger_app;
GRANT UPDATE (status, status_changed_at, terminated_at, updated_at) ON tenant.companies TO ledger_app;
GRANT INSERT (company_id, plan_id) ON tenant.subscriptions TO ledger_app;
GRANT UPDATE (plan_id, plan_changed_at, updated_at) ON tenant.subscriptions TO ledger_app;
GRANT INSERT (company_id, legal_name, address, contact_email, contact_phone, website, default_currency)
  ON tenant.configurations TO ledger_app;
GRANT UPDATE (legal_name, address, contact_email, contact_phone, website, updated_by, updated_at)
  ON tenant.configurations TO ledger_app;
```

Why it is shaped this way:
- **Writers use explicit column lists** (Phase 0 §3.5): the repository inserts name exactly the granted columns, and the defaults supply `status = 'active'`, the timestamps and the ids. A direct insert that names `status`, `terminated_at` or `created_at` is refused with 42501. A company can therefore never be created as anything but `active`.
- **`ledger_worker` writes nothing.** No worker path changes a tenant table. The Phase 2 subscribers read tenant data only (`getTenantContext`).
- **`ledger_app` is both the API's role and the script's role** (Phase 0 §4.10; OQ-14). The grants cannot tell "the CEO's request" from "the operator's script". That separation is the module's (§4.4) and is proved by gate tests, not by grants. The grants still refuse everything the design never needs: `DELETE`, `TRUNCATE`, any change of `company_id`, `name`, `is_demo`, `default_currency`, `created_at` or `started_at`, and any write to `plans`. OQ1-10 records the residual risk.
- **No sequence grants** are needed: every key is a `uuid`.

The §3.5 self-check of Phase 0 must still pass for both runtime pools after this migration; it reads only the platform tables and the roles' memberships, which Phase 1 does not change.

### 3.6 Database rules (triggers)

Source: Phase 0 §3.5 immutability triggers (the same pattern and the same SQLSTATE). A custom migration `tenant_rules`. These protect against direct SQL, including by the owner, exactly as far as Phase 0's triggers do: an owner can still drop a trigger deliberately, and a superuser can still switch triggers off for its session (Phase 0 §3.5).

| Function | Fires | Rule |
|---|---|---|
| `tenant.enforce_company_rules()` | `BEFORE UPDATE ON tenant.companies FOR EACH ROW` | Refuses (SQLSTATE `42501`) any update that changes `company_id`, `name`, `is_demo` or `created_at`; any update that leaves `status` unchanged (a company row changes only by a transition); any update of a `terminated` row; and any transition other than `active → suspended`, `suspended → active`, `active → terminated`, `suspended → terminated`. It also refuses a transition that does not set `status_changed_at`, or that sets `terminated_at` for a non-terminal state |
| `tenant.refuse_immutable_change()` | `BEFORE UPDATE ON tenant.subscriptions` and `tenant.configurations FOR EACH ROW`, with the table's mutable column names as trigger arguments | Refuses an update that changes any column not named in its arguments (`to_jsonb(NEW) - TG_ARGV` compared with `to_jsonb(OLD) - TG_ARGV`). Subscriptions: `plan_id, plan_changed_at, updated_at`. Configurations: `legal_name, address, contact_email, contact_phone, website, updated_by, updated_at` |
| `tenant.refuse_delete()` | `BEFORE DELETE ON` and `BEFORE TRUNCATE ON` all four tenant tables (`FOR EACH ROW` and `FOR EACH STATEMENT`) | Always raises `42501` |

Each function: `LANGUAGE plpgsql`, `SET search_path = pg_catalog`, **not** `SECURITY DEFINER` (Phase 0 §4.10), and `REVOKE EXECUTE … FROM PUBLIC` in the same migration. A trigger does not need `EXECUTE` from the caller (Phase 0 §3.5). The migration text avoids the words the migration lint refuses (`SUPERUSER`, `BYPASSRLS`, `session_replication_role`, `DISABLE TRIGGER`; Phase 0 §3.6), in comments too.

The use cases (§5) still check every rule first and return the proper domain error; the triggers are the net under them. Terminated tenants' `subscriptions` and `configurations` rows are protected by the use cases (they refuse any change once the company is terminated or, for configuration, not active), not by a trigger that would need to read another table.

### 3.7 PA-04 — foreign keys on the three platform tables

A custom migration in platform job C, generated after the tenant schema's migrations (`drizzle-kit generate --custom --name=platform_company_fk`). It adds, and nothing else:

```sql
ALTER TABLE audit.audit_entries     ADD CONSTRAINT audit_entries_company_id_fkey
  FOREIGN KEY (company_id) REFERENCES tenant.companies(company_id) ON DELETE RESTRICT;
ALTER TABLE intelligence.event_outbox ADD CONSTRAINT event_outbox_company_id_fkey
  FOREIGN KEY (company_id) REFERENCES tenant.companies(company_id) ON DELETE RESTRICT;
ALTER TABLE intelligence.event_log  ADD CONSTRAINT event_log_company_id_fkey
  FOREIGN KEY (company_id) REFERENCES tenant.companies(company_id) ON DELETE RESTRICT;
```

- **Custom, not Drizzle-declared.** The platform's Drizzle schema files cannot reference `tenant.companies` without importing a module, which Phase 0 rule 8 forbids. A custom migration keeps rule 8 and leaves Phase 0's committed migrations byte-for-byte unchanged (a committed migration is never edited).
- **Safe because the tables are empty where it matters.** Phase 0 §3.1.7: Phase 0 writes rows only into the test database, which is rebuilt on every run, and the development database holds none. The migration does not use `NOT VALID`. If it fails on a development database that has stray rows, the engineer stops and reports (they must not delete audit rows).
- **No new index.** The check on insert is a primary-key lookup; deletes of companies never happen.
- **It does not alter the append-only triggers or grants.** Adding a constraint touches no audit row.
- **Effect on the Phase 0 gate tests — decided (PM direction; closes OQ1-11).** Every Phase 0 gate test that writes an audit, outbox or event-log row for company A or B needs those companies to exist. Job D (test engineer) adds a support helper in `server/tests/support/` that inserts companies A and B (and a demo company where a test needs one), each with its subscription and configuration, through the owner client, and changes the Phase 0 gate fixtures to call it. Only fixture set-up changes; no Phase 0 assertion is edited. **Job C is merged only after that fixture change is on `backend`, and C's acceptance requires the full Phase 0 gate suite to be green with the foreign keys in place** (§1.5).
- **FK checks run as the table owner.** PostgreSQL runs referential-integrity checks with the privileges of the owner of the table that holds the constraint, so neither `ledger_app` nor `ledger_worker` needs a `REFERENCES` grant or any new privilege on `tenant.companies`. The existing `SELECT` on the tenant tables through `ledger_runtime` is unchanged by PA-04, and the Phase 0 role self-check (§3.5) is unaffected.
- **Order inside a transaction.** The checks are immediate. A use case that creates a company and writes its audit entry and event in one transaction must insert the company row first, then the configuration and subscription, then the audit entry, then the outbox event (UC-01).

### 3.8 Migration files

Numbers are assigned by `drizzle-kit generate` when each job is built on the latest `backend` (migrations are regenerated after pulling `backend`, never hand-merged: roster, Parallel phases). The names and the order are fixed.

| Order | Name | Job | Content |
|---|---|---|---|
| 1 | `tenant_tables` | B | Generated: `CREATE SCHEMA tenant`; T1-1 … T1-4 with constraints and indexes |
| 2 | `tenant_grants` | B | Custom: §3.5 |
| 3 | `tenant_rules` | B | Custom: §3.6 |
| 4 | `tenant_seed_plans` | B | Custom: inserts the `standard` plan (§3.2) |
| 5 | `platform_company_fk` | C | Custom: §3.7 |

The boundary scanner and migration lint (Phase 0 G0-40) read all of these. The seed is an `INSERT INTO tenant.plans`, which the lint allows (it refuses DML only on the audit and event-log tables).

---

## 4. DOMAIN MODEL

### 4.1 Aggregates and value objects

Source: BACKEND_DOMAIN_ARCHITECTURE.md, Tenant Context ("Owns: Company, Subscription, Plan, TenantConfiguration, TenantMetadata, TenantLifecycle record") and Aggregate Ownership; BACKEND_DATA_ARCHITECTURE.md, Aggregate Roots.

| Aggregate (root) | Table | Responsibility |
|---|---|---|
| **Company** | T1-2 | Identity, demo flag and lifecycle state of a tenant. Owns the state machine (§4.2). Invariants INV-2, INV-3, INV-4, INV-9 |
| **Subscription** | T1-3 | Which plan the company is on. Invariants INV-6, INV-12 |
| **TenantConfiguration** | T1-4 | The CEO-editable company details and the fixed default currency. Invariants INV-6, INV-8, INV-10 |
| **Plan** (reference entity, not tenant data) | T1-1 | Feature flags and limits a tenant gets. Read only at run time. INV-12 |

These are three aggregate roots plus a reference entity, as the Data Architecture lists them. Each use case loads and changes one root, except provisioning, which creates all three in one transaction (the roots are created together because INV-6 forbids a company without a configuration and a subscription).

**Value objects** (defined in `domain/`, each validates in its constructor and exposes no setter). They apply the same rules as the `CHECK` constraints in §3 and return field-level messages.

| Value object | Rule |
|---|---|
| `CompanyStatus` | `active`, `suspended`, `terminated` |
| `CompanyName`, `LegalName` | 1–200 characters after trimming; no control characters |
| `PlanCode` | `^[a-z][a-z0-9_]{1,49}$` |
| `CurrencyCode` | three upper-case letters |
| `Address` | ≤ 500 characters; no control characters |
| `ContactEmail` | trimmed; ≤ 254; one `@` with a dot in the domain part; no whitespace |
| `ContactPhone` | ≤ 40; digits, `+ ( ) . / -` and spaces only |
| `WebsiteUrl` | `http://` or `https://` followed by non-whitespace; ≤ 300 |
| `LifecycleReason` | 1–500 characters on a single line; no control characters. Used for audit metadata only, never in an event payload or a log line |
| `OperatorIdentity` | `{ name, hostAccount, scriptRunId, command }`: `name` 1–100 characters of `[A-Za-z0-9 ._@'-]`, `hostAccount` ≤ 100 characters, `scriptRunId` a UUID, `command` one of the script commands. Used for audit metadata only |
| `PlanFlags`, `PlanLimits` | A map of `snake_case` names to booleans; a map to non-negative integers |
| `TenantInfo` | The read-only view other modules receive (§4.5) |

The domain layer imports nothing outside its own `domain/` folder (Phase 0 §4.8 rule 3). The validators are hand-written; Zod schemas live in the API layer and the script's argument parsing calls the same value objects through the use cases.

**Domain errors** (plain classes in `domain/`; the API layer and the script map them): `InvalidTenantTransitionError`, `TenantNotActiveError` (carries the status), `TenantNotFoundError`, `PlanNotFoundError`, `PlanNotAssignableError` (inactive), `SamePlanError`, `InvalidValueError` (field and rule, never the value), `ConfigurationUnchangedError` (internal, handled as "no change").

### 4.2 State machine: Company lifecycle

Source: BACKEND_MULTITENANCY_ARCHITECTURE.md, Tenant Lifecycle; roadmap Phase 1 ("`active → suspended → active`, `active/suspended → terminated` with audit entries"); BACKEND_DOMAIN_ARCHITECTURE.md, Tenant Context ("active → suspended → terminated").

```
            provision
   (none) ───────────────▶ active ◀─────────────┐
                            │  │                │ reactivate
                  suspend   │  │ terminate      │
                            ▼  │                │
                         suspended ─────────────┘
                            │ terminate
                            ▼
                        terminated   (terminal)
```

| From | To | Use case | Who may trigger | Guards | Writes in the same transaction |
|---|---|---|---|---|---|
| — | `active` | UC-01 `ProvisionTenant` | The platform administrator, through the script only | Plan exists and is active; inputs valid | Company, subscription, configuration; audit `tenant_provisioned`; event `TenantProvisioned` |
| `active` | `suspended` | UC-02 `SuspendTenant` | Platform administrator, script only | Row locked; status is `active` | Status, `status_changed_at`, `updated_at`; audit `tenant_suspended`; event `TenantSuspended` |
| `suspended` | `active` | UC-03 `ReactivateTenant` | Platform administrator, script only | Row locked; status is `suspended` | As above; audit `tenant_reactivated`; event `TenantReactivated` |
| `active`, `suspended` | `terminated` | UC-04 `TerminateTenant` | Platform administrator, script only | Row locked; status is not `terminated`; the confirmation matches (script) | As above plus `terminated_at`; audit `tenant_terminated`; event `TenantTerminated` |
| `terminated` | anything | — | **Nobody** | — | Refused: `InvalidTenantTransitionError` (use case) and trigger `42501` (database) |

Rules:
- **Any other pair is refused**, including repeating a state (`active → active`, `suspended → suspended`) and `active → active` as a "reactivate". The use case writes nothing: no row change, no audit entry, no event. A repeated command is therefore visible to the operator as an error, not hidden as success.
- **The company row is locked with `FOR NO KEY UPDATE`** (not `FOR UPDATE`) before the guard is read, so two concurrent commands serialise: the second sees the state the first left. Without the lock, `suspend` and `terminate` racing could both pass their guards. **Why `NO KEY UPDATE`:** every insert into a child table (the tenant tables, `audit.audit_entries`, `intelligence.event_outbox`, `intelligence.event_log` after PA-04, and every later module's tables) runs a foreign-key check that takes `FOR KEY SHARE` on the parent `tenant.companies` row. `FOR UPDATE` conflicts with `KEY SHARE`, so a lifecycle transaction holding it would block every concurrent write for that tenant. `FOR NO KEY UPDATE` conflicts with other lifecycle commands (and with `FOR SHARE`, below) but not with `KEY SHARE`, and `company_id` never changes, so nothing is lost. **It is expressible with Phase 0's helpers:** `tenantWhere(companies, ctx, …)` supplies only the `WHERE` condition; the tenant repository (infrastructure layer, which may import `drizzle-orm`) appends Drizzle's `.for('no key update')` to the select, and the same for `FOR SHARE`. No platform addition is needed, and nothing falls back to `FOR UPDATE`. `ledger_app` holds the column `UPDATE` grants on `companies` that PostgreSQL requires for any `FOR …` lock clause. **Lock rules for every tenant write use case:** UC-02 … UC-04 lock the `companies` row `FOR NO KEY UPDATE`; UC-05 locks `companies` `FOR SHARE` (so a concurrent lifecycle command and a plan change serialise, while FK checks still pass) then `subscriptions` `FOR NO KEY UPDATE`; UC-06 does the same with `configurations`. The status port (UC-08) and the read use cases take no lock.
- **Suspension is reversible; termination is not.** A terminated company's configuration and plan cannot change (INV-9 via the use cases).
- **What a non-`active` status means to other modules:** the platform refuses its requests (PA-02), `assertTenantActive` throws, and `getTenantContext` reports the status. Data is retained (INV-9).

No state machine exists for Subscription or TenantConfiguration; they are current-value rows.

### 4.3 Invariants this phase owns

Each is proved by at least one gate test (§9).

| ID | Invariant | Source |
|---|---|---|
| INV-1 | Every table that holds tenant data, in every schema, carries a `company_id` that is a foreign key to `tenant.companies`; a row for a company that does not exist cannot be written, by any role. The exceptions are the global reference table `tenant.plans` (INV-12) and test-only fixture tables in `gate_test` | BACKEND_MULTITENANCY_ARCHITECTURE.md, Tenant Ownership; Phase 0 §3.1.7; Invariant 24 ("company context is enforced at every data query") |
| INV-2 | A company is in exactly one of `active`, `suspended`, `terminated`; only the four transitions of §4.2 exist; `terminated` is terminal | Multitenancy, Tenant Lifecycle; roadmap Phase 1 |
| INV-3 | Provisioning, suspension, reactivation, termination and plan change are not available to any in-tenant user, including the CEO | Multitenancy, Tenant Lifecycle ("not accessible to any in-tenant user including the CEO"); D-15; roadmap gate |
| INV-4 | The demo flag is set once, at provisioning, and never changes. A demo company cannot become a real one or the reverse. Every query of every domain is scoped to one `company_id`, so demo data cannot enter a real company's context | Invariant 24; roadmap ("demo company flag"); every domain document's demo-isolation invariant |
| INV-5 | Every lifecycle transition, plan change, provisioning and configuration change writes its audit entry and its outbox event in the same transaction as the state change; if either fails nothing changes | Roadmap ("with audit entries"); BACKEND_DATA_ARCHITECTURE.md, Write Consistency Requirements; Phase 0 §4.4 |
| INV-6 | A company has exactly one subscription and exactly one configuration, created in the same transaction as the company | Multitenancy, Tenant Provisioning Model steps 1 |
| INV-7 | An unexpired token of a suspended or terminated tenant is refused on every authenticated request before any module code runs, for at most one cache lifetime after the change | BACKEND_AUTH_ARCHITECTURE.md steps 2a/2b; Phase 0 OQ-12; roadmap gate |
| INV-8 | Only a `ceo` user, and only for the company in the token, can read or update that company's configuration, and only while the company is `active` | D-15; BACKEND_API_ARCHITECTURE.md namespace row; canonical context, Role Model |
| INV-9 | Tenant rows are never deleted. Termination retains every row | D-05; Phase 0 §3.1.9; canonical context, Audit Doctrine (permanent trail) |
| INV-10 | `default_currency` is set at provisioning and not changed by any use case in v1 | OQ1-04 (financial integrity: later phases will hold approved amounts in this currency) |
| INV-11 | Lifecycle and plan commands are run only as the platform administrator: a `system` actor with component `tenant-cli` and no causation. A user, a portal user, and any other system actor (including a subscriber) is refused with nothing written. **Enforcement:** the check is only as strong as who can call `createSystemContext` with that string (Phase 0 rule 11 keeps it out of `server/modules/**`). Two gate tests close the path (§9): a scan asserting the literal `'tenant-cli'` appears only in `server/scripts/tenant.ts` and `server/modules/tenant/`, and a test asserting that a context built by the worker for a subscriber can never carry that component | D-15; OQ-14 decision (§4.4); Phase 0 §4.1, rule 11 |
| INV-12 | A plan can be assigned only if it exists and is active. `plans` is the one tenant-module table without `company_id`; it is global reference data that no runtime role can write | Service Architecture (`getPlan`); §3.1.4 |
| INV-13 | **Event payloads** carry no secret, no free text supplied by the CEO or the operator and no contact detail: only identifiers, status or plan codes and field names. **Audit entries** carry no secret or credential, but do carry previous and new values of changed configuration fields, as the Audit Doctrine requires (§8). Application logs carry neither | Phase 0 OQ-07 (event payloads); canonical context, Audit Doctrine; Event Architecture, Audit Log vs Event Log |

### 4.4 Actors and authority (OQ-14 decided here)

Source: D-15; D-02; Phase 0 §4.1 (actor kinds and their audit mapping), §4.10; canonical context, Role Model.

| Actor | Phase 1 authority | How it is established |
|---|---|---|
| **Platform administrator** (the operator at a terminal) | UC-01 … UC-05 and the read-only `show` command | Runs `npm run tenant -- …` (§5). Execution context: `createSystemContext(companyId, 'tenant-cli')` from `server/platform/system/`, so `actor.kind = 'system'`, `component = 'tenant-cli'`, `causation = null`. The tenant use cases accept exactly that and nothing else (INV-11) |
| **CEO** of the company | UC-06 and UC-07, for the company in the token only | `actor.kind = 'user'`, `role = 'ceo'`, `causation = null`, from the platform-token middleware. In Phase 1 the role comes from the token claim (opening note) |
| PM, worker, portal user | Nothing in the tenant module | The use case refuses; the router answers `403 FORBIDDEN` before the use case, and the use case checks again |
| Event subscribers and every other system actor | Nothing that writes. They may call `getTenantContext`, `getPlan` and `assertTenantActive` | Refused by INV-11 for lifecycle and plan commands |
| The platform (token middleware) | Read the status of a company through the status port | PA-02, UC-08 |

**The D-15 script's audit identity — decision (Phase 0 OQ-14).**
- Audit entries written by the script have `actor_role = 'system'`, `actor_id = NULL`, `causation_event_id = NULL`, `causation_actor_id = NULL`: the third row of Phase 0 §3.2's writer table.
- The operator is recorded in `metadata`: `operator` (the name given with `--operator`), `hostAccount` (the operating-system user running the script), `scriptRunId` (a UUID per invocation) and `command`, plus `reason` where the command takes one. `AuditWriter` merges `requestId`/`runId` over the caller's metadata and cannot be made to drop these keys; the script's keys are separate names, so nothing collides.
- **No new actor role.** An extra role such as `platform_admin` would change the `actor_role` check in Phase 0's T-1 and the `Actor` union, which Phase 1 may not do. If the owner wants one, it is a Phase 0 change and an open question (OQ1-10).
- **The limit, stated plainly.** `--operator` is self-declared, not authenticated. The control is who can open a shell with the production secrets (Replit collaborators; Phase 0 §2.5). The audit trail records what the operator claims and which operating-system account ran it.
- The script connects as `ledger_app` through PA-03. It never reads the owner URL.

### 4.5 What other modules get: the public surface

Source: BACKEND_SERVICE_ARCHITECTURE.md, Module 1, Public API Surface; roadmap ("`getTenantContext(companyId)` public API used by every other module").

The tenant module's `index.ts` exports functions, DTO types and the registration. It never exports a domain entity, a table or a repository (Phase 0 §4.8 rule 7).

| Export | Callers | Notes |
|---|---|---|
| `getTenantContext(uow): Promise<TenantInfo>` | Any module's use case or subscriber, with its own unit | Returns the tenant of `uow.context.companyId` only. **There is no `companyId` parameter**, so a module cannot ask about another tenant (INV-1). Throws `TenantNotFoundError` if the row is missing |
| `getPlan(uow): Promise<PlanInfo>` | Same | The company's plan: `code`, `name`, `featureFlags`, `limits` |
| `assertTenantActive(uow): Promise<void>` | Same | Throws `TenantNotActiveError` (status `suspended` or `terminated`) or `TenantNotFoundError` |
| `provisionTenant`, `suspendTenant`, `reactivateTenant`, `terminateTenant`, `changeTenantPlan` | **The script only** (INV-11) | Take `(uow, input)`; refuse any context that is not the platform administrator's |
| `updateTenantConfiguration(uow, input)`, `getTenantConfiguration(uow)` | The router (and tests) | CEO only |
| `tenantModule` (the `ModuleRegistration`) | `server/modules/registry.ts` | One registry line |

```ts
// Named TenantInfo, not TenantContext: Phase 0 §4.1 already exports a platform type named TenantContext
interface TenantInfo {
  readonly companyId: string;
  readonly status: 'active' | 'suspended' | 'terminated';
  readonly isDemo: boolean;
  readonly plan: { readonly code: string; readonly name: string;
                   readonly featureFlags: Readonly<Record<string, boolean>>;
                   readonly limits: Readonly<Record<string, number>> };
  readonly configuration: { readonly legalName: string; readonly defaultCurrency: string };
}
```

**Deliberate differences from the Service Architecture** (recorded in §10):
- The functions take the caller's unit of work instead of a bare `companyId`. Phase 0 requires every use case to take an execution context; modules cannot mint a `CompanyId` (`toCompanyId` is in `system/`); and reads happen inside a transaction that has set `app.company_id`.
- `suspendTenant(companyId, adminId)` and the other lifecycle functions take no `adminId`: the administrator is the context's system actor, and the operator's identity is in the audit metadata.
- `TenantInfo.configuration` holds only the two fields other modules need now (`legalName`, `defaultCurrency`). Contact details and address stay behind the tenant module's own API until a phase needs them (minimal surface: BACKEND_API_ARCHITECTURE.md, API Philosophy).
- The status port (UC-08) is not part of this table. It is registered through `providesPorts`, not exported.

**A caller that has no execution context yet** — Phase 2's login, which must read the status of the user's company before any token exists — cannot call any of these. Phase 0 gives modules no way to build such a context (rule 11). That is recorded for the Phase 2 specification as OQ1-12, not solved here.

### 4.6 Module layout, registration, and obligations on later phases

**Layout** (Phase 0 §4.8; every layer as in BACKEND_LAYERING_ARCHITECTURE.md):

```
server/modules/tenant/
  domain/           company, subscription, configuration, plan, value objects, errors, TenantInfo
  application/      provisioning-service, lifecycle-service, configuration-service, tenant-queries,
                    ports/tenant-status.impl.ts   (rule 12: imported only by index.ts, only to pass to bind)
  infrastructure/   schema.ts (pgSchema('tenant')), repositories (tenantWhere / tenantValues)
  api/              router for /tenant (GET and PATCH /configuration), Zod schemas, error mapping
  index.ts          the public surface of §4.5 and `tenantModule`
server/scripts/
  tenant.ts         argument parsing and output only; calls the exported functions (§5)
```

**Registration** (`tenantModule`): `name: 'tenant'`; `apiRouters: { '/tenant': … }`; no `portalRouters`; no `publicRoutes`; no `subscribers`; `auditEntryTypes` and `producesEvents` as in §8 and §7, all `jobRequired: false`; `providesPorts: [bind(<platform tenant-status port>, …)]`; `requiresPorts` empty (the module depends on no other module: Service Architecture, Module 1 "Dependencies: None").

**New obligations Phase 1 places on later phases** (each later specification lists the rows that apply, and its gate tests them; to be confirmed with OQ1-12 and OQ1-13):

| Phase | Obligation |
|---|---|
| Every phase that adds a table | `company_id uuid NOT NULL REFERENCES tenant.companies(company_id) ON DELETE RESTRICT` (§3.1.5) |
| Phase 2 | Login and refresh are public routes that PA-02 does not cover. They must refuse an inactive tenant themselves, by a lookup that Phase 2's specification designs (OQ1-12). A suspended tenant's refresh tokens stop working |
| Phase 2 | The `TenantSuspended`, `TenantTerminated` and `TenantReactivated` subscribers revoke or restore sessions. They run for inactive tenants by design: the worker never blocks delivery on tenant status |
| Phase 2 | Re-load the role and active status of the user from `identity` on the tenant configuration paths (UC-05 is script-only; UC-06 and UC-07 are CEO routes) instead of trusting the token (OQ1-13) |
| Phase 2 | Decide how the initial CEO is identified for the `TenantProvisioned` subscriber (OQ1-06) |
| Every phase with subscribers that create or change business records | Start the subscriber with `assertTenantActive(uow)`, unless its job is to handle the lifecycle event itself. A subscriber that must keep working for a suspended tenant says so in its specification (OQ1-12) |
| Phase 2 | `tenant.configurations.updated_by` has no foreign key because `identity.users` does not exist yet. Add `REFERENCES identity.users(user_id)` in Phase 2's migration, or record in Phase 2's specification why a user reference is deliberately unenforced |
| Every phase | Do not read `tenant.*` tables directly. Use `getTenantContext`, `getPlan` and `assertTenantActive` |

---

## 5. USE CASES

Every use case takes the caller's `UnitOfWork` as its first argument. The **caller opens the transaction**: the tenant router calls `deps.runInTransaction(ctx, uow => useCase(uow, input))`; the script calls `runInTransactionAs('tenant', ctx, uow => useCase(uow, input))` (Phase 0 §4.4, §4.8); a later module's own unit is passed straight in for the read-only queries (§4.9, "direct call, same transaction"). A use case never opens a transaction and never nests (Phase 0 `NestedUnitOfWorkError`). Transaction rules follow BACKEND_DATA_ARCHITECTURE.md, Transaction Boundaries: the state change, its audit entry and its outbox event commit together or not at all. A failed `append` or `record` poisons the unit (Phase 0 §4.4), so a use case that catches the error still rolls back.

Service grouping follows the roadmap: `TenantProvisioningService` (UC-01), `TenantLifecycleService` (UC-02 … UC-04), `TenantConfigurationService` (UC-05 … UC-07, UC-09 … UC-11), and the status port (UC-08).

### 5.1 Summary

| ID | Use case | Called by | Authority | Writes | Audit entry | Event |
|---|---|---|---|---|---|---|
| UC-01 | `ProvisionTenant` | script `provision` | Platform administrator | company, configuration, subscription | `tenant_provisioned` | `TenantProvisioned` |
| UC-02 | `SuspendTenant` | script `suspend` | Platform administrator | `companies` | `tenant_suspended` | `TenantSuspended` |
| UC-03 | `ReactivateTenant` | script `reactivate` | Platform administrator | `companies` | `tenant_reactivated` | `TenantReactivated` |
| UC-04 | `TerminateTenant` | script `terminate` | Platform administrator | `companies` | `tenant_terminated` | `TenantTerminated` |
| UC-05 | `ChangeTenantPlan` | script `change-plan` | Platform administrator | `subscriptions` | `tenant_plan_changed` | `TenantPlanChanged` |
| UC-06 | `UpdateTenantConfiguration` | `PATCH /api/v1/tenant/configuration` | CEO, own company | `configurations` | `tenant_configuration_updated` | `TenantConfigurationUpdated` |
| UC-07 | `GetTenantConfiguration` | `GET /api/v1/tenant/configuration` | CEO, own company | — | — | — |
| UC-08 | `ResolveTenantStatus` | the platform token middleware (PA-02), through the status port | The platform (system) | — | — | — |
| UC-09 | `GetTenantContext` | any module | Any context of the company | — | — | — |
| UC-10 | `GetPlan` | any module | Any context of the company | — | — | — |
| UC-11 | `AssertTenantActive` | any module | Any context of the company | — | — | — |
| UC-12 | `ShowTenant` | script `show` | Platform administrator | — | — | — |

### 5.2 Authority checks (shared)

Both checks run first in the use case, before any SQL, and again in the router for UC-06 and UC-07 (defence in depth). A failure writes nothing and raises `NotAuthorisedError`.

- **`assertPlatformAdministrator(ctx)`** — `ctx.actor.kind === 'system'` **and** `ctx.actor.component === 'tenant-cli'` **and** `ctx.causation === null` (INV-11). A user (any role), a portal user, a subscriber, the status-port context (`component = 'platform.tenantStatus'`) and any other system actor fail.
- **`assertCeoOfOwnCompany(ctx)`** — `ctx.actor.kind === 'user'` **and** `ctx.actor.role === 'ceo'` **and** `ctx.causation === null`. There is no company parameter anywhere in UC-06 and UC-07: the company is `ctx.companyId`, from the token (INV-8). `portal_user` fails. Phase 1 trusts the token's role (opening note; OQ1-13).

### 5.3 Use case specifications

**UC-01 — ProvisionTenant** (Multitenancy, Tenant Provisioning Model step 1)
- *Input:* `name` (CompanyName), `planCode` (PlanCode), `defaultCurrency` (CurrencyCode), `isDemo` (boolean, default `false`), `operator` (OperatorIdentity, command `provision`). The new `companyId` is `ctx.companyId`: the script generates a UUID and builds the context from it, so the context exists before the row does.
- *Authority:* `assertPlatformAdministrator`.
- *Checks:* values valid; the plan with that code exists and is active (`PlanNotFoundError`, `PlanNotAssignableError`); no company with that id exists (cannot happen with a fresh UUID; a primary-key collision is a 500).
- *Writes, in this order* (the foreign keys are immediate): (1) `companies` — `company_id`, `name`, `is_demo` through `tenantValues`; `status` defaults to `active`. (2) `configurations` — `company_id`, `legal_name` = `name`, `default_currency`; other fields `NULL`. (3) `subscriptions` — `company_id`, `plan_id`. (4) audit `tenant_provisioned`. (5) event `TenantProvisioned`.
- *Transaction:* one. Any failure, including the audit or event write, leaves no company, no configuration, no subscription, no outbox row (INV-5, INV-6).
- *Returns:* `{ companyId, status: 'active', planCode, isDemo }`.
- *Does not:* create a user. The initial CEO is a Phase 2 matter (OQ1-06); until then a provisioned tenant has no one who can sign in.

**UC-02 / UC-03 / UC-04 — SuspendTenant, ReactivateTenant, TerminateTenant**
- *Input:* `reason` (LifecycleReason), `operator` (OperatorIdentity); UC-04 also `confirmCompanyId`.
- *Authority:* `assertPlatformAdministrator`.
- *Checks, in order:* (1) UC-04: `confirmCompanyId === ctx.companyId`, else `ConfirmationMismatchError`. (2) Lock the company row with `FOR NO KEY UPDATE` through `tenantWhere` (§4.2); absent → `TenantNotFoundError`. (3) The transition is one of the four in §4.2, else `InvalidTenantTransitionError` carrying the current status.
- *Writes:* update `status`, `status_changed_at = now()`, `updated_at = now()`, and for UC-04 `terminated_at = now()`; audit entry; outbox event.
- *Transaction:* one. A failed guard writes nothing, not even an audit entry (a refused command is not a state change; it is reported to the operator and logged, §8).
- *Concurrency:* two commands for the same company serialise on the row lock; the loser re-reads the new status and is refused (G1).
- *Returns:* `{ companyId, previousStatus, status }`.

**UC-05 — ChangeTenantPlan** (script `change-plan`; `TenantPlanChanged`; OQ1-02)
- *Input:* `planCode`, `reason`, `operator`.
- *Authority:* `assertPlatformAdministrator`.
- *Checks:* lock `companies` `FOR SHARE`: absent → `TenantNotFoundError`; `terminated` → `TenantNotActiveError`. A suspended tenant's plan may change. Lock `subscriptions` `FOR NO KEY UPDATE`. The target plan exists and is active; it differs from the current plan (`SamePlanError`).
- *Writes:* `plan_id`, `plan_changed_at = now()`, `updated_at = now()`; audit; event.
- *Transaction:* one.

**UC-06 — UpdateTenantConfiguration** (Multitenancy, Provisioning step 5)
- *Input:* a non-empty set of `legalName`, `address`, `contactEmail`, `contactPhone`, `website`. Nullable fields take `null` to clear a value. An empty or whitespace-only string is invalid, not "clear".
- *Authority:* `assertCeoOfOwnCompany`.
- *Checks:* lock `companies` `FOR SHARE`; status must be `active` (`TenantNotActiveError`) — this re-check under a lock is what makes the PA-02 cache window harmless for writes: a suspension that commits first is seen here, and a suspension that starts later waits for this transaction. Lock the `configurations` row `FOR NO KEY UPDATE`. Compare each submitted field with the stored value.
- *No change:* if every submitted value equals the stored one, the use case returns the current configuration and writes **nothing**: no row change, no `updated_at` move, no audit entry, no event.
- *Writes:* the changed columns, `updated_by = ctx.actor.userId`, `updated_at = now()`; audit entry with previous and new values of the changed fields (§8); event with the changed field names only (§7).
- *Transaction:* one. Concurrent edits serialise on the row lock: a second edit sees the first's values as its `previousValue`, so no audit entry quotes a value that was never stored.
- *Cannot change:* `status`, `isDemo`, `companyId`, `planCode`, `defaultCurrency` (not inputs of this use case at all).

**UC-07 — GetTenantConfiguration:** `assertCeoOfOwnCompany`; read `companies` and `configurations` for `ctx.companyId` without locks; `TenantNotActiveError` if the company is not `active`. No audit entry (it is not a financial or approval action; BACKEND_OBSERVABILITY_ARCHITECTURE.md, What Triggers an Audit Entry).

**UC-08 — ResolveTenantStatus** (the port behind PA-02, Phase 0 OQ-12)
- *Contract:* `getStatus(uow): Promise<'active' | 'suspended' | 'terminated' | null>` — the status of `uow.context.companyId`, or `null` if no such company. One `SELECT status` by primary key; no lock, no audit, no event. The port is not `humanOnly` (the platform calls it with a system context). Its implementation is `application/ports/tenant-status.impl.ts`, reachable only through `bind` (Phase 0 rule 12).
- *Caller:* the platform opens a short unit with `createSystemContext(companyId, 'platform.tenantStatus')`, calls the port, and closes it (PA-02). Modules do not call this port.

**UC-09 — GetTenantContext, UC-10 — GetPlan, UC-11 — AssertTenantActive:** read the company (with its configuration and plan for UC-09, its plan for UC-10) for `ctx.companyId` through `tenantWhere`; no lock; no writes. UC-11 reads only the status and throws `TenantNotActiveError` (status `suspended` or `terminated`) or `TenantNotFoundError`. They are the non-HTTP half of the gate (§1.3): a later module's subscriber or use case that must not run for an inactive tenant calls UC-11 first.

**UC-12 — ShowTenant** (script `show`, read only): `assertPlatformAdministrator`; reads company id, name, status, `is_demo`, `status_changed_at`, `terminated_at`, plan code. Never prints configuration details. No audit entry. Added so an operator can confirm the effect of a command and recover after a lost output (OQ1-15).

### 5.4 The script (D-15, Phase 0 OQ-14)

`npm run tenant -- <command> [options]` runs `server/scripts/tenant.ts`, owned by the module engineer. The `tenant` entry in `package.json` is added by the platform engineer (PA-03, OQ1-09). In Phase 1 it runs with `tsx` from a Replit Shell or a laptop terminal; a bundled form for production is a Phase 9 question (OQ1-17).

| Command | Options (all `--name value`) | Use case |
|---|---|---|
| `provision` | `--operator`, `--name`, `--plan`, `--currency`, optional `--demo` (flag; absent means a real company) | UC-01 |
| `suspend` | `--operator`, `--company`, `--reason` | UC-02 |
| `reactivate` | `--operator`, `--company`, `--reason` | UC-03 |
| `terminate` | `--operator`, `--company`, `--reason`, `--confirm` (must repeat the company id) | UC-04 |
| `change-plan` | `--operator`, `--company`, `--plan`, `--reason` | UC-05 |
| `show` | `--company` | UC-12 |

**Behaviour**
1. Arguments are read with Node's `util.parseArgs` in strict mode (unknown options are errors). Every value is validated by the domain value objects through the use case; the script itself contains no business rule and no SQL.
2. `OperatorIdentity` = `--operator` (required for every command except `show`), `hostAccount` from `os.userInfo().username`, `scriptRunId` from `crypto.randomUUID()`, and the command name. `--operator` is self-declared (§4.4).
3. The script obtains configuration and a pool through PA-03 (`loadScriptConfig`, the runtime opener). It reads **only** `LEDGER_APP_DATABASE_URL` (plus `NODE_ENV`, `LOG_LEVEL`). It does not read the owner URL, `DATABASE_URL`, the `PG*` variables, or the JWT keys. If `LEDGER_APP_DATABASE_URL` is missing it exits 2 and does not fall back to anything. The first connection runs the Phase 0 §3.5 self-check; a connection that is not `ledger_app` is refused.
4. For `provision` the script generates the company id first and prints it (`{"outcome":"started","command":"provision","companyId":"…","scriptRunId":"…"}`) **before** opening the transaction, so the id is known even if the process dies after the commit. `show` then reveals whether the company exists.
5. The context is `createSystemContext(companyId, 'tenant-cli')`; the work runs in `runInTransactionAs('tenant', ctx, …)`.
6. **Output:** one JSON line on stdout for success (`{"outcome":"ok",…}` with `companyId`, `status`, `scriptRunId`), one JSON line on stderr for a refusal or failure (`{"outcome":"refused"|"failed","code":"…","message":"…"}`). Messages are fixed British-English sentences containing no argument values. Nothing printed or logged contains the database URL, a password, the company name, the reason text or the operator-supplied values other than the company id (INV-13).
7. **Exit codes:** `0` done · `1` usage or validation error (nothing written) · `2` configuration, connection or role-check failure (nothing written) · `3` the use case refused (unknown company, invalid transition, unknown or inactive plan, same plan, confirmation mismatch, not authorised) · `4` unexpected error.
8. **Retrying.** Provisioning is not idempotent: running it twice creates two companies. Every other lifecycle command is safe to repeat: the second run is refused with exit 3 and writes nothing.

### 5.5 PA-01 — the pagination helper (Phase 0 OQ-17)

Phase 1 has no list endpoint. The helper is built and tested on its own (§9) so that Phase 2 onward paginate identically. It lives in `server/platform/http/pagination.ts` and is exported from `server/platform/index.ts`.

| Function | Behaviour |
|---|---|
| `parsePageQuery(query)` | Reads `limit` and `cursor` from a query object. `limit`: a base-10 integer string, 1–200, default 50. Anything else (0, 201, negative, decimal, empty, non-numeric, repeated) throws `ValidationError` with details `{ limit: ["The limit must be a whole number from 1 to 200."] }` — **rejected, not clamped**. `cursor`: optional string of at most 1 024 characters |
| `encodeCursor(key)` | `key` is a flat object of at most 8 string, number, boolean or null values (the last row's sort key, for example `{ createdAt, id }`). Returns the base64url encoding of its JSON, without padding |
| `decodeCursor(cursor, schema)` | Accepts base64url or standard base64, with or without padding; parses the JSON; refuses anything that is not a flat object (nesting, arrays, `__proto__`, `constructor`, `prototype` keys); then applies the **calling endpoint's strict Zod schema**. Any failure throws `ValidationError` with details `{ cursor: ["The cursor is not valid."] }`. It never echoes the cursor and never throws a 500 |
| `buildPage(rows, limit, keyOf)` | The caller queries `limit + 1` rows in a total order. `buildPage` returns `{ data: rows.slice(0, limit), pagination: { nextCursor, hasMore, limit } }`. `hasMore` is true only if an extra row came back; `nextCursor` is the encoded key of the last returned row, or `null` when `hasMore` is false |

Rules for every later list endpoint, stated here so they are reviewed once:
- The sort key must be total, for example `(created_at, id)`; a non-total key produces skipped or repeated rows.
- A cursor carries sort keys only. It is **not** a credential and is never trusted for tenancy: the repository applies `tenantWhere` to every page regardless of the cursor's content (G1 attacks a forged cursor).
- Cursors are never logged (query strings are not logged, Phase 0 §4.7) and never signed in v1.
- The response shape is exactly the one in BACKEND_API_ARCHITECTURE.md, Pagination Strategy. The base64url alphabet differs from the document's example only by being URL-safe, so a cursor needs no percent-encoding (OQ1-14).

### 5.6 PA-02 — the tenant-status check in the token middleware (Phase 0 OQ-12)

This is a platform addition; the platform engineer designs the code. Phase 1 fixes the behaviour, which the gate tests (§9) assert.

1. **Where.** In PS-10 (`/api/v1`) and PS-11 (`/portal/v1`), **after** the token has been verified (so a forged or expired token never causes a database read) and **before** the execution context is built and any module router runs. Public routes are not covered; they never had a context (Phase 2 login must check for itself, §4.6).
2. **Lookup.** The platform declares the port token `platform.tenantStatus` (`definePort`, exported from the platform index). The tenant module binds it (`providesPorts`). The platform may not import the module (rule 8); it receives the implementation through the port registry. On a cache miss the platform opens a unit under `createSystemContext(claims.company_id, 'platform.tenantStatus')`, calls `getStatus(uow)` (UC-08), and closes it.
3. **Cache.** In-process, per API process, keyed by `company_id`. Lifetime `TENANT_STATUS_CACHE_MS` (PA-05): integer 0–60 000, default 5 000, `0` disables caching. At most 10 000 entries; the oldest is evicted first. Concurrent misses for one company share a single lookup. A failed lookup is never cached. A "no such company" answer is cached for the same lifetime. **Staleness bound:** a suspension, reactivation or termination made by the script (a different process) is seen by a running API within `TENANT_STATUS_CACHE_MS`. The bound is stated in the opening of every gate test that depends on it.
4. **Decision.**

| Looked-up status | Response | Handler runs? |
|---|---|---|
| `active` | continue | yes |
| `suspended` | `403 TENANT_SUSPENDED`, "This account is suspended." | no |
| `terminated` | `403 TENANT_TERMINATED`, "This account has been closed." | no |
| no company (`null`) | `401 UNAUTHENTICATED` (a validly signed token that names nothing is treated as invalid; BACKEND_AUTH_ARCHITECTURE.md says 403 for a suspended account, not for a missing one) | no |
| lookup failed | `500 INTERNAL_ERROR` — **fail closed**; the request is never let through | no |

5. **Nothing else changes.** Token verification, claims, header handling and the other 401 paths are as in Phase 0. The two new error codes join the platform table of Phase 0 §6.3.
6. **The worker is untouched.** The outbox worker never checks tenant status, so `TenantSuspended` and every other event is delivered for a suspended tenant (Phase 2's revocation subscriber depends on it).
7. **Start-up.** In full mode the API refuses to start if no module provides the port, and names the port in one `FATAL` line, like any unwired port (PS-16). Frontend-only mode has no tokens and no check. How Phase 0's PS-16 rules (which describe ports that modules require) are extended to a port the platform requires is OQ1-08.

### 5.7 PA-03 and PA-05 — script bootstrap and configuration variable

- **PA-03.** In `server/platform/system/`: `loadScriptConfig(env)` and a runtime opener that returns `{ runInTransactionAs, dbRole, logger, close }` bound to a `ledger_app` pool built with the same explicit-settings rule as every pool (Phase 0 RP-03), with the self-check run through `withClient`, `scrubOwnerVariables()` called after loading, and `close()` ending the pool so the process exits. `package.json` gains `"tenant"`; `drizzle.config.ts` gains `'tenant'` in `schemaFilter`. These are root configuration, hence the platform engineer's (Folder Ownership).
- **PA-05.** `TENANT_STATUS_CACHE_MS` is read by `loadApiConfig` only: an optional integer, 0–60 000, default 5 000. Anything else is a `ConfigError` naming the variable. The worker and the script do not read it.

---

## 6. API

### 6.1 Routes

D-15: `/api/v1/tenant/` exposes only the signed-in CEO's own company configuration. There is **no** route to provision, suspend, reactivate, terminate or change a plan, and no route with a company identifier. Every other method and path answers `404 NOT_FOUND` through Phase 0's not-found handler (there is no 405 in Phase 0's code table).

| Method | Path | Auth | Roles | Request | Responses |
|---|---|---|---|---|---|
| `GET` | `/api/v1/tenant/configuration` | platform token; tenant status check (PA-02) | `ceo` | none | `200` configuration · `401` · `403` (`FORBIDDEN`, `TENANT_SUSPENDED`, `TENANT_TERMINATED`) |
| `PATCH` | `/api/v1/tenant/configuration` | same | `ceo` | JSON, §6.2 | `200` configuration · `400` · `401` · `403` |

The namespace `/tenant` belongs to the tenant module (Phase 0 §4.8). The module has no public route and no portal router; a portal token on these paths fails verification with `401`. The routes have **no path parameters** (Phase 0 §4.7 path convention), and no query parameters: unknown query parameters are ignored and never reach the use case.

### 6.2 Schemas

Success body, status `200` for both methods (single-resource envelope `{ "data": … }`, OQ1-14):

```json
{ "data": {
    "companyId": "uuid",
    "legalName": "string",
    "address": "string | null",
    "contactEmail": "string | null",
    "contactPhone": "string | null",
    "website": "string | null",
    "defaultCurrency": "GBP",
    "isDemo": false,
    "updatedAt": "ISO 8601 UTC"
} }
```

`isDemo` and `defaultCurrency` are read-only. The response carries no status (a request that reaches the handler is for an `active` tenant), no plan, and no subscription data.

`PATCH` request: a **strict** Zod object with at least one of the following. An unknown key (`status`, `isDemo`, `companyId`, `defaultCurrency`, `planCode`, `featureFlags`, anything) is `400 VALIDATION_ERROR`; the response may name the field path, never a value.

| Field | Rule |
|---|---|
| `legalName` | string, 1–200 after trimming, no control characters; cannot be `null` |
| `address` | string 1–500, no control characters; or `null` |
| `contactEmail` | string ≤ 254, one `@`, a dot in the domain, no whitespace; or `null` |
| `contactPhone` | string ≤ 40 of digits, `+ ( ) . / -` and spaces; or `null` |
| `website` | string ≤ 300 starting `http://` or `https://`, no whitespace; or `null` |

Zod checks shape and the field rules above; the domain value objects apply the same rules again, so no rule exists only in Zod (and the script, which has no Zod layer, gets the same checks). Empty body, `{}` and a body with only unchanged values are different cases: `{}` is `400`; a body of unchanged values is `200` with the current data and no write (UC-06).

### 6.3 Order of checks, errors and status codes

Order: JSON parsing (Phase 0) → token (401) → tenant status (403/401/500, PA-02) → **role** (`FORBIDDEN`) → body validation (400) → use case. A PM or worker sending an invalid body therefore gets `403`, never `400`: validation errors are not shown to a role that may not use the route.

| Status | Code | When |
|---|---|---|
| 200 | — | Read, update, or no-op update |
| 400 | `VALIDATION_ERROR` | Body shape or a field rule; unknown key; empty object |
| 400 | `MALFORMED_JSON`, `PAYLOAD_TOO_LARGE` (413) | Phase 0 |
| 401 | `UNAUTHENTICATED`, `TOKEN_EXPIRED` | Phase 0; also a signed token for no company (PA-02) |
| 403 | `FORBIDDEN` | The role is not `ceo` (PM, worker); `NotAuthorisedError` |
| 403 | `TENANT_SUSPENDED`, `TENANT_TERMINATED` | PA-02; also the use case's own re-check (`TenantNotActiveError`) |
| 404 | `NOT_FOUND` | Any other route or method; `TenantNotFoundError` inside a use case |
| 500 | `INTERNAL_ERROR` | Lookup failure (fail closed), any unexpected error |

Domain errors map as: `NotAuthorisedError` → 403 `FORBIDDEN`; `TenantNotActiveError` → 403 `TENANT_SUSPENDED` or `TENANT_TERMINATED` by its status; `TenantNotFoundError` → 404; `InvalidValueError` → 400 `VALIDATION_ERROR` with the field path. The lifecycle errors (`InvalidTenantTransitionError`, `PlanNotFoundError`, `PlanNotAssignableError`, `SamePlanError`, `ConfirmationMismatchError`) are reachable only from the script and need no HTTP mapping. Messages are British English, fixed, and contain no input value.

Headers, the error envelope and logging follow Phase 0 §6.2–§6.3 and §4.7: the request line names the route template only; the legal name, address, email, phone and website are never logged.

Not in Phase 1: rate limiting and `Idempotency-Key` (Phase 9; `PATCH` is idempotent by construction), OpenAPI (Phase 9).

---

## 7. EVENTS

### 7.1 Produced

All six are produced by the `tenant` module (`source_module = 'tenant'`), written by `uow.events.record` in the same transaction as the state change, with `jobRequired: false` (none is financially relevant). The envelope is Phase 0 §4.5; `actorId` is `NULL` for the script and the CEO's user id for UC-06. Payloads hold identifiers, status or plan codes, field names and one timestamp; no free text, no contact detail, no name, no financial amount (INV-13, Phase 0 OQ-07).

| Event | Written by | `sourceObjectType` / `sourceObjectId` | Payload (exactly these keys) | Planned consumers (BACKEND_EVENT_ARCHITECTURE.md) |
|---|---|---|---|---|
| `TenantProvisioned` | UC-01 | `Company` / `company_id` | `companyId`, `isDemo`, `planCode` | Identity (create the initial CEO; Phase 2), Intelligence (audit; Phase 7) |
| `TenantSuspended` | UC-02 | `Company` / `company_id` | `companyId`, `previousStatus` (`active`), `statusChangedAt` | Identity (revoke all sessions), Intelligence (alert) |
| `TenantReactivated` | UC-03 | `Company` / `company_id` | `companyId`, `previousStatus` (`suspended`), `statusChangedAt` | Identity (restore access), Intelligence (audit) |
| `TenantTerminated` | UC-04 | `Company` / `company_id` | `companyId`, `previousStatus` (`active` or `suspended`), `statusChangedAt` | Identity (revoke all sessions), Intelligence (audit) |
| `TenantConfigurationUpdated` | UC-06 | `TenantConfiguration` / `company_id` | `companyId`, `changedFields` (a non-empty array of the field names `legalName`, `address`, `contactEmail`, `contactPhone`, `website`) | Intelligence (audit) |
| `TenantPlanChanged` | UC-05 | `Subscription` / `subscription_id` | `companyId`, `previousPlanCode`, `newPlanCode` | Intelligence (audit) |

### 7.2 Consumed

**None** (BACKEND_DOMAIN_ARCHITECTURE.md, Tenant Context: "Consumes Events: None"). Phase 1 registers no subscriber. The consumers above are later phases; tenants provisioned in Phase 1 therefore reach no subscriber at all (OQ1-06).

### 7.3 Rules for the consumers

- **Idempotency key:** `eventId` (the default, Phase 0 §7.3). Identity's `TenantProvisioned` subscriber should instead key on `companyId` (one initial CEO per company); Phase 2 names it.
- **Order is not guaranteed** (Phase 0 OQ-06). A suspension and a reactivation made close together can be delivered in either order. `statusChangedAt` lets a subscriber ignore a stale event, and a subscriber that restores or revokes sessions should act on the company's **current** status (`getTenantContext`) rather than on the event type alone.
- **Delivery does not depend on tenant status.** Events for suspended and terminated tenants are delivered like any other (§5.6 item 6).
- Event payloads are copied verbatim into the permanent event log, which both runtime roles can read; the payload rule above is why `TenantConfigurationUpdated` names fields and never values.

---

## 8. AUDIT ENTRIES

### 8.1 Entry types

All six are owned by the `tenant` module, `jobRequired: false`, written by `uow.audit.append` in the same transaction as the state change. The names follow the domain convention (`<object>_<past participle>`) and mirror the event names. **No frozen document lists tenant entry types** (`DOMAIN_MODEL_SUMMARY.md`, Audit Entry Types by Domain, has none); the authority is the roadmap's "with audit entries", and the names are OQ1-05. The consumer "Intelligence (audit)" in the event catalogue is a Phase 7 read model, not a substitute for the transactional entry.

| Entry type | Use case | `source_object_type` / `id` | `destination_object_*` | `previous_value` | `new_value` |
|---|---|---|---|---|---|
| `tenant_provisioned` | UC-01 | `Company` / `company_id` | none | `NULL` | `{ name, status: "active", isDemo, planCode, defaultCurrency }` |
| `tenant_suspended` | UC-02 | `Company` / `company_id` | none | `{ status: "active" }` | `{ status: "suspended" }` |
| `tenant_reactivated` | UC-03 | `Company` / `company_id` | none | `{ status: "suspended" }` | `{ status: "active" }` |
| `tenant_terminated` | UC-04 | `Company` / `company_id` | none | `{ status: <previous> }` | `{ status: "terminated" }` |
| `tenant_plan_changed` | UC-05 | `Subscription` / `subscription_id` | none | `{ planCode: <previous> }` | `{ planCode: <new> }` |
| `tenant_configuration_updated` | UC-06 | `TenantConfiguration` / `company_id` | none | the **previous values of the changed fields only** | the **new values of the changed fields only** |

For every entry: `job_id`, `site_id`, `client_id` and `external_reference` are `NULL`; `company_id` is the tenant concerned (from the context); `occurred_at`, `audit_id`, `sequence_no` come from the database; `metadata.requestId` or `runId` is added by `AuditWriter` (Phase 0 §8.2).

### 8.2 Who is recorded, and the metadata

| Written by | `actor_id` | `actor_role` | `causation_*` | `metadata` (besides `requestId`/`runId`) |
|---|---|---|---|---|
| The script (UC-01 … UC-05) | `NULL` | `system` | `NULL` | `operator`, `hostAccount`, `scriptRunId`, `command`; and `reason` for UC-02 … UC-05 (OQ-14, §4.4) |
| The CEO (UC-06) | the CEO's user id | `ceo` | `NULL` | `changedFields` (the same names as the event) |

`reason` is free text supplied by the operator. It is recorded in the audit entry, which is internal and permanent, and **never** in an event, a log line or the script's output.

### 8.3 Decision: previous and new values in `tenant_configuration_updated` (PM review point 5)

The Audit Doctrine requires previous value and new value (canonical context; DOMAIN_MODEL_SUMMARY.md, Audit Requirements). The entry therefore records the changed fields with their old and new values, for example `previous_value = {"address": "1 High St"}`, `new_value = {"address": "2 Low Rd"}`. This is allowed because Phase 0 OQ-07 restricts event payloads, not audit entries; the audit table is internal, visible only to the CEO (BACKEND_MULTITENANCY_ARCHITECTURE.md, Audit Visibility Boundaries) and is where values belong (Phase 0 §8.2: "the audit log is where financial values belong"). The event carries field names only. Both are bounded (a legal name is at most 200 characters, the five fields together under 1.5 KB), far below the 64 KB limit.

### 8.4 What is not audited

| Occurrence | Recorded as | Why |
|---|---|---|
| A refused command (invalid transition, unknown plan, confirmation mismatch, not authorised) | Script stderr line and exit code 3; the request line for HTTP | No state changed. Refused attempts that change nothing are not audit entries (Phase 0 §8.1 treats 401s the same way) |
| Reads: UC-07, UC-08, UC-09 … UC-12, the per-request status lookup | Not recorded | No state change; no financial data is read |
| A no-change `PATCH` | Not recorded | Nothing changed (UC-06) |
| Seeding or changing plans | The migration journal | Platform administration outside any tenant, as Phase 0 treats migrations |

### 8.5 Catalogue registration

```ts
auditEntryTypes: [
  { type: 'tenant_provisioned', jobRequired: false }, { type: 'tenant_suspended', jobRequired: false },
  { type: 'tenant_reactivated', jobRequired: false }, { type: 'tenant_terminated', jobRequired: false },
  { type: 'tenant_plan_changed', jobRequired: false }, { type: 'tenant_configuration_updated', jobRequired: false } ],
producesEvents: [
  { type: 'TenantProvisioned', jobRequired: false }, { type: 'TenantSuspended', jobRequired: false },
  { type: 'TenantReactivated', jobRequired: false }, { type: 'TenantTerminated', jobRequired: false },
  { type: 'TenantConfigurationUpdated', jobRequired: false }, { type: 'TenantPlanChanged', jobRequired: false } ]
```

Because the types are owned by `tenant` (Phase 0 R3-10), no other module's unit can write any of them (G1).

---

*Sections 9 to 12 follow in commit 3.*

