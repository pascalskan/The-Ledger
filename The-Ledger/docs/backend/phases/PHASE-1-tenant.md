# THE LEDGER — PHASE 1 SPECIFICATION — TENANT MODULE

Version: 0.6 — Complete (sections 1–12); review rounds 1, 2 and 3 applied.
Status: **APPROVED by the owner, October 25, 2026, with all recommended answers to OQ1-01 … OQ1-18 as written.** PM-accepted and merged into `backend` at f3a4ef1.
Date: October 2026
Author: `backend-architect`
Branch: `agent/backend-architect/phase-1-spec` (from `backend` @ 7cf8b58)
Implements: `BACKEND_IMPLEMENTATION_ROADMAP.md` v2.2, Phase 1, under `BACKEND_OPEN_DECISIONS.md` v1.2 (D-01 … D-17) and the owner-approved Phase 0 open questions OQ-04, OQ-12, OQ-14 and OQ-17
Built on: `docs/backend/phases/PHASE-0-infrastructure.md` v0.6 (APPROVED). Phase 1 uses that platform exactly as specified. Where Phase 1 cannot, the point is an open question (§12), never a change to Phase 0.
Implementers: `backend-module-engineer` (tenant module and script) and `backend-platform-engineer` (platform additions PA-01 … PA-06) · Gate tests: `backend-test-engineer`

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
| 0.6 | **Review round 3 (efficiency and quality):** job A and the harness stubs are checked in steps, with the PM telling an agent to merge a named sibling branch (§1.5, §11); the catalogue registration moves ahead of the use cases and the commits are split further (§11); `admin.ts` is a named exception to the roster's script import rule (§10.2, OQ1-18); scripts read no environment themselves, `loadCliEnvironment()` does (§5.4, §5.7); the worker requires the status port (OQ1-08, G1-60, G1-77); the PA-02 miss uses a 2 s statement timeout on a minimal unit, the PA-06 read is cheap and its log rate-limited, eviction is LRU (§5.6, §5.8); `getTenantContext` is one joined query (§5.3); UC-06 runs with a 5 s lock timeout and `55P03` maps to `503 SERVICE_BUSY` (§5.4, §6.3, G1-78); redundant columns dropped from `companies` and `subscriptions` (§3.3, §3.4); tests lose their sleeps and fixed clocks, fault-injection tests pin their exit code and include a control, forbidden bodies and scanner fixtures are single tables, and the log check is one suite-wide hook (§9); numbering, change log and annotations tidied; the ISO list is active codes only; `ConfigurationUnchangedError` becomes a result value |
| 0.5 | **Review round 2 (security and doctrine):** PA-06 default-deny `tenantStatusPolicy` on subscribers; regex only after fatal length and character checks; script-only audit keys under `metadata.platformAdmin`; CLI environment allowlist; INV-11 hardening (`admin.ts`, branded script contexts, scans); `hostAccount` does not tell operators apart; worker reads only `legal_name` and `default_currency`; retention triggers on `configurations` and `subscriptions`; ISO 4217 currency list; `lock_timeout` and exit code 5; sanitised validation details; WARN on refusal; `show` fields; TLS rule for non-local hosts; `ledger_app` blast radius |
| 0.4 | **Review round 1 (correctness):** tenant inserts as `sql` templates naming the granted columns; the script opener takes module registrations and builds catalogues; job D0 stub binding; separate trigger statements for DELETE and TRUNCATE with exact SQLSTATEs; fresh companies for lifecycle tests; later modules add their `company_id` foreign key by custom migration (G1-76); lock-mode test (G1-74); CLI scrub test (G1-75); sequencing; locale-independent forbidden-character class; explicit constraint names; minor fixes |
| 0.3 | Sections 9–12. Review of v0.2: `lifecycle_version` orders lifecycle events instead of timestamps; one text rule for free text; Phase 7 audit-visibility obligation; required race, staleness, cursor and role-order tests |
| 0.2 | Sections 5–8. Review of v0.1: lock mode `FOR NO KEY UPDATE` / `FOR SHARE`; INV-1, INV-11, INV-13 reworded; FK checks run as the table owner; audit entries keep previous and new values; job D1 before job C; `updated_by` foreign key as a Phase 2 obligation |
| 0.1 | Sections 1–4 |

**Two things to know before reading.**
1. **No token can be obtained through the application in Phase 1.** Identity (users, login, refresh) is Phase 2. Every CEO route in this phase is therefore exercised only in gate tests, with tokens signed by the platform's own `signPlatformToken` (Phase 0 PS-09). Phase 1 trusts the `role` claim in such a token for its CEO-only checks. That is acceptable only because the application issues no token yet. The residual risk is the one in the Secrets threat model (Phase 0 §2.5): anyone who can read the Replit Secrets (the JWT private key) can sign a token with any role. Phase 2 must re-load the role from `identity` on these paths (Phase 0 §4.10; OQ1-13).
2. **Provisioning has no HTTP surface.** Creating, suspending, reactivating and terminating a tenant, and changing its plan, run only through an audited command-line script (D-15). The only HTTP routes of this phase are the signed-in CEO's own company configuration.

---

## 1. SCOPE

### 1.1 Included

Items S1-01 to S1-10 are the roadmap's Phase 1 "Includes" list, in order. S1-11 to S1-14 follow from the owner-approved Phase 0 open questions, and S1-15 from review round 2. Nothing else is added.

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
| S1-12 | **Phase 0 OQ-17 (approved):** the shared pagination helper | **PA-01**, in Phase 1's platform work (Phase 0 OQ-17: "before the first list endpoint"). It is built in platform job A, not job C: it has no dependency on the tenant schema, and job C waits for the tenant module and the fixtures (§1.5, §5.5) |
| S1-13 | **Phase 0 OQ-12 (approved):** a per-request tenant-status check in the token middleware, through a tenant port, cached for a few seconds | **PA-02** (platform hook and middleware check) and UC-08 `ResolveTenantStatus` (the tenant module's implementation) (§5) |
| S1-14 | **Phase 0 OQ-14 (approved):** decide the actor identity of the D-15 script | Decided in §4.4: actor role `system`, fixed component `tenant-cli`, no causation, operator identity in audit `metadata`, connection as `ledger_app` |
| S1-15 | Default-deny tenant policy for subscribers (review round 2) | **PA-06** and §5.8 |

**Platform additions.** Phase 1 needs six changes in `server/platform/` and root configuration. They belong to `backend-platform-engineer` (Folder Ownership). They are the plumbing the owner approved plus two things Phase 0 left open, which are open questions (OQ1-08, OQ1-09).

| ID | Addition | Why | Built in |
|---|---|---|---|
| PA-01 | `server/platform/http/pagination.ts` — the pagination helper (Phase 0 OQ-17) | Every module paginates the same way from its first list endpoint | Platform job A |
| PA-02 | A platform tenant-status port token and the status check in PS-10 and PS-11, with a short in-process cache and its configuration variable (Phase 0 OQ-12). The platform is a requirer of the port in both processes (OQ1-08) | Closes the suspension window; gives the gate its enforcement point | Platform job A |
| PA-03 | A script bootstrap: `loadScriptConfig` in `server/platform/config/` (rule 13; re-exported through `server/platform/system/` for scripts) and a runtime opener in `server/platform/system/` that takes the module registrations it serves, builds and checks their audit and event catalogues as PS-02 does, and connects as `ledger_app` with the §3.5 self-check. The `tenant` entry in `package.json`. `'tenant'` added to `drizzle.config.ts`'s `schemaFilter`. A `loadCliEnvironment()` helper in `system/` that reads the environment through `config/` and returns the reduced environment (§5.4). A `lockTimeoutMs` unit option on `runInTransaction` and `runInTransactionAs` (a `SET LOCAL lock_timeout`, set in platform code), and the mapping of lock-timeout error `55P03` to `503 SERVICE_BUSY` in PS-07 | Phase 0 defines `createSystemContext` and `runInTransactionAs` but no way for a script to read configuration or obtain a pool (OQ1-09) | Platform job A |
| PA-04 | A custom migration adding `FOREIGN KEY (company_id) REFERENCES tenant.companies(company_id) ON DELETE RESTRICT` to the three platform tables (Phase 0 §3.1.7) | Phase 0 OQ-04 | Platform job C, after the tenant schema and the fixture change are merged (§1.5) |
| PA-05 | Configuration variable `TENANT_STATUS_CACHE_MS` in `loadApiConfig` | PA-02's cache lifetime | Platform job A |
| PA-06 | The `tenantStatusPolicy` field on every subscriber registration, and the worker's check of it (§5.8). **This changes the `Subscriber` shape of Phase 0 §4.5** | Closes the non-HTTP half of gate item 1 by default-deny instead of convention (review round 2, PM decision; OQ1-12) | Platform job A |

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
| Any change to `client/`, the Playwright suite, `deploy/replit-public`, Phase 0 files other than through PA-01 … PA-06, or any document | — | Roster, Folder Ownership; D-13 |

### 1.3 Roadmap gate (to be proven in §9)

1. Suspended and terminated tenants cannot be used by any later module (test)
2. No in-tenant user, including the CEO, can change tenant lifecycle (test)

Doctrines verified at this gate (roadmap, Doctrine Verification by Phase): **tenant lifecycle; demo data isolation.**

"Any later module" is read as follows, because Phase 1 can only enforce what exists:
- every request a later module serves, through the status check in the token middleware (PA-02), on both `/api/v1` and `/portal/v1`;
- every subscriber, through the worker's `tenantStatusPolicy` check (PA-06); and every other piece of non-request code that needs the answer, through `assertTenantActive(uow)` and `getTenantContext(uow)`.

The worker does not stop delivering events for a suspended tenant as such: `TenantSuspended` itself must reach Identity's session-revocation subscriber. Instead every subscriber registration must declare `tenantStatusPolicy`, and the worker refuses to call an `active_only` subscriber for an inactive tenant (PA-06, §5.8): default-deny by type, not by convention.

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

Six jobs; the commit plans are in §11.

**Merge order to `backend`: A → B → D1 → C → D2.** Job A reaches `backend` already carrying the two harness commits of job D0 (D0a and D0b), merged into A's branch during the job as described below, so the Phase 0 gate is green at every merge.

| Job | Agent | Branches from | Notes |
|---|---|---|---|
| A — platform: PA-01 … PA-06 | `backend-platform-engineer` | `backend` (Phase 0 merged) | Carries D0a and D0b (below) |
| D0 — Phase 0 harness changes, two commits | `backend-test-engineer` | **D0a** from A's commit A4a; **D0b** from A's commit A5a | D0a: a stub `platform.tenantStatus` binding in the Phase 0 probe harness returning `active` for the gate companies. D0b: `tenantStatusPolicy: 'any'` on the Phase 0 probe subscribers. Neither edits a Phase 0 assertion |
| B — tenant module, migrations and script | `backend-module-engineer` | `backend` after A is merged | Needs A's port token, script opener and policy type |
| D1 — company fixtures | `backend-test-engineer` | **B's commit B2c** (tables, grants, rules and seed) | `seedCompany`, and the Phase 0 fixtures use it. Checked against the unmerged C branch for its "with foreign keys" acceptance |
| C — platform: PA-04 | `backend-platform-engineer` | `backend` after B and D1 are merged | Acceptance: the full Phase 0 gate suite green with the foreign keys. Tests that need PA-04 (G1-02, G1-11, G1-12(a), G1-76) run after C |
| D2 — the G1 gate tests | `backend-test-engineer` | `backend` | Written in parallel with A and B from §9. Compile-checked until B's final commit B8 exists; the PM then pulls D2 into B for B's review rounds |

**Why A and D0 are checked in steps.** Two of A's commits change what the Phase 0 gate harness must provide: A4c makes the token middleware require a binding for `platform.tenantStatus`, and A5a makes `tenantStatusPolicy` a required field on subscribers. Neither commit can be checked by the Phase 0 gate until the harness has a stub binding and policy-declaring probes. The steps, run by the PM:

1. A1 … A4a are checked as usual. A4a adds only the port token and the registry extension (no behaviour change for Phase 0).
2. The PM tells D0 to branch from A4a and add D0a; when D0a is accepted, the PM **tells A to merge D0a's branch**. A4b and A4c are then checked with the Phase 0 gate green.
3. A5a adds the policy type and the registry check. The PM tells D0 to branch from A5a and add D0b; when accepted, the PM tells A to merge D0b's branch. A5b (worker behaviour) and A6 are then checked.
4. A, carrying D0a and D0b, is merged into `backend`. D0's branches are then closed (they merge without change).

The PM may tell an agent to merge a named sibling branch as well as `backend`. The roster is amended to say so (OQ1-18).

**Other sequencing.** D1 and D2 are pulled into B before B's final commit (B8), so B's last run and its review rounds include the fixtures and the gate tests. C is merged only after D1.

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
5. **The convention for every later schema** (S1-09). A table in any other schema that holds tenant data has `company_id uuid NOT NULL` with a foreign key to `tenant.companies(company_id) ON DELETE RESTRICT`. The foreign key is added in a **custom migration in the same job as the table**, as PA-04 does for the platform tables: a module imports no tenant table handle (the tenant module's `index.ts` exports no table, Phase 0 §4.8 rule 7), so the reference cannot be declared in Drizzle. The check is immediate, so a row can never be written for a company that does not exist, including by a worker subscriber. No index on `company_id` is added for the foreign key alone (companies are never deleted, so the referential check is only an insert-time primary-key lookup). Each module adds the `company_id`-leading indexes its own reads need. A generic catalogue test, G1-76, asserts the convention for every table that exists; later phases inherit it and need not rewrite it.
6. **Grants** follow Phase 0 §3.1.8: explicit, column by column, narrowest role (§3.5).
7. **No hard deletes** (D-05, Phase 0 §3.1.9): no runtime role has `DELETE` or `TRUNCATE`, and database rules refuse both even for the owner (§3.6).
8. **Row Level Security** is Phase 9. The tables are written so a policy `company_id = current_setting('app.company_id')::uuid` will fit (`plans` gets no policy).
9. **Forbidden characters in text.** Every free-text `CHECK` and every value object refuses one locale-independent set: U+0001–U+001F, U+007F–U+009F (the C0 and C1 controls, which include U+0085), U+2028 and U+2029. In SQL: `!~ '[\u0001-\u001f\u007f-\u009f\u2028\u2029]'`. The POSIX class `[[:cntrl:]]` is not used, because its result depends on the database locale (it matches U+0085 but not U+2028 on a stock PostgreSQL 16). NUL cannot occur in PostgreSQL text.
10. **Constraint names are explicit.** The Drizzle schema names every constraint (`primaryKey`, `unique`, `foreignKey`, `check` all take a name) so the generated migration matches the names below, and G1-04 compares by name. Pattern: `<table>_pkey`, `<table>_<column>_key` (unique), `<table>_<column>_fkey`, `<table>_<column>_check`. The table-level check on `companies` is `companies_terminated_at_check`. Named `CHECK`s: `plans_code_check`, `plans_name_check`, `plans_feature_flags_check`, `plans_limits_check`; `companies_name_check`, `companies_status_check`, `companies_lifecycle_version_check`, `companies_terminated_at_check`; `configurations_legal_name_check`, `configurations_address_check`, `configurations_contact_email_check`, `configurations_contact_phone_check`, `configurations_website_check`, `configurations_default_currency_check`. Foreign keys: `subscriptions_company_id_fkey`, `subscriptions_plan_id_fkey`, `configurations_company_id_fkey`. Uniques: `plans_code_key`, `subscriptions_company_id_key`.

### 3.2 T1-1 `tenant.plans`

Source: BACKEND_SERVICE_ARCHITECTURE.md, Module 1 (`getPlan(companyId)` → Plan "feature flags, limits"); BACKEND_DOMAIN_ARCHITECTURE.md, Tenant Context ("subscription and plan details (feature flags, limits, tier)"); roadmap Phase 1 ("plans"). No document defines any plan, any flag or any limit (OQ1-01).

Global catalogue; **no `company_id`**. Rows are created and changed only by migrations run as the owner. **No runtime role writes this table.**

| Column | Type | Null | Default | Constraint / notes | Mutable |
|---|---|---|---|---|---|
| `plan_id` | `uuid` | no | `gen_random_uuid()` | Primary key | no |
| `code` | `text` | no | — | `UNIQUE`. `CHECK (code ~ '^[a-z][a-z0-9_]{1,49}$')`. The stable name used by the script, events and audit entries | no |
| `name` | `text` | no | — | `CHECK (length(name) BETWEEN 1 AND 100 AND name = btrim(name) AND name !~ '[\u0001-\u001f\u007f-\u009f\u2028\u2029]')`. British English display name | owner only |
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
| `name` | `text` | no | — | `CHECK (length(name) BETWEEN 1 AND 200 AND name = btrim(name) AND name !~ '[\u0001-\u001f\u007f-\u009f\u2028\u2029]')`. The name the platform administrator gave the company at provisioning, used by the operator's `show` command. Not the CEO-editable legal name (T1-4). No rename use case in v1 (OQ1-16) | no |
| `status` | `text` | no | `'active'` | `CHECK (status IN ('active','suspended','terminated'))`. The lifecycle state (§4.2). A new company can only be inserted as `active`: the insert grant omits this column (§3.5) | yes — transitions only |
| `is_demo` | `boolean` | no | `false` | Demo company flag (INV-4, Invariant 24). Set once at provisioning | **no** |
| `lifecycle_version` | `integer` | no | `1` | `CHECK (lifecycle_version >= 1)`. The order of lifecycle events: **1 at provisioning, +1 on every transition**, nothing else (the trigger refuses any other change, §3.6). Because a transition holds the row lock when it increments the value, the version reflects the order in which transitions actually committed, which no timestamp can (see below) | yes — with `status`, exactly +1 |
| `status_changed_at` | `timestamptz` | no | `now()` | Time of the last lifecycle transition (equals `created_at` until the first). **Display only, never used to order events.** Written with `clock_timestamp()` after the row lock is held; `now()` is the transaction's start time, so a transaction that waited for the lock would otherwise record a time earlier than the one that overtook it | yes — with `status` |
| `terminated_at` | `timestamptz` | yes | — | `CHECK ((status = 'terminated') = (terminated_at IS NOT NULL))`. Set on termination (with `clock_timestamp()`, after the lock) and never changed | yes — once |
| `created_at` | `timestamptz` | no | `now()` | — | no |

Indexes: `companies_pkey (company_id)`. No other index. Every read in Phase 1 is by primary key (the status lookup, `getTenantContext`, `show`), and the platform tables' foreign keys reference the primary key.

Referenced by: T1-3, T1-4, and (after PA-04) T-1, T-2, T-3 of Phase 0 and every table of every later schema.

### 3.4 T1-3 `tenant.subscriptions` and T1-4 `tenant.configurations`

**T1-3 `tenant.subscriptions`** — Source: BACKEND_MULTITENANCY_ARCHITECTURE.md, Tenant Ownership ("`tenant.subscriptions` — plan and subscription details"); BACKEND_DATA_ARCHITECTURE.md, Aggregate Roots. One current subscription per company. A plan change updates the row; the history is the audit trail and the `TenantPlanChanged` events. No billing field, no status, no period (OQ1-01).

| Column | Type | Null | Default | Constraint / notes | Mutable |
|---|---|---|---|---|---|
| `subscription_id` | `uuid` | no | `gen_random_uuid()` | Primary key | no |
| `company_id` | `uuid` | no | — | `UNIQUE`; `REFERENCES tenant.companies(company_id) ON DELETE RESTRICT`. Exactly one subscription per company (INV-6) | no |
| `plan_id` | `uuid` | no | — | `REFERENCES tenant.plans(plan_id) ON DELETE RESTRICT` | yes — UC-05 |
| `created_at` | `timestamptz` | no | `now()` | — | no |
| `updated_at` | `timestamptz` | no | `now()` | The time of the last plan change (equal to `created_at` until the first), written with `clock_timestamp()` after the row lock. Display only: no consumer orders plan changes by it (§7.3). `created_at` is when the tenant was provisioned and so subscribed | yes — UC-05 |

Indexes: `subscriptions_pkey (subscription_id)`, `subscriptions_company_id_key (company_id)` (the unique constraint, and the lookup index for every read). No index on `plan_id` (no read goes from a plan to its subscriptions in Phase 1).

**T1-4 `tenant.configurations`** — Source: BACKEND_MULTITENANCY_ARCHITECTURE.md, Tenant Configuration and Tenant Ownership. Provisioning creates this row with the company (INV-6); the signed-in CEO updates it (INV-8). Only the items the architecture lists and the CEO can sensibly own are columns. Items that other modules define, and the prototype's extra fields, are deferred (OQ1-03).

| Column | Type | Null | Default | Constraint / notes | Mutable |
|---|---|---|---|---|---|
| `company_id` | `uuid` | no | — | **Primary key**; `REFERENCES tenant.companies(company_id) ON DELETE RESTRICT`. One configuration per company | no |
| `legal_name` | `text` | no | — | `CHECK (length(legal_name) BETWEEN 1 AND 200 AND legal_name = btrim(legal_name) AND legal_name !~ '[\u0001-\u001f\u007f-\u009f\u2028\u2029]')`. "Company name". Starts as the provisioning name | yes — CEO |
| `address` | `text` | yes | — | `CHECK (length(address) BETWEEN 1 AND 500 AND address = btrim(address) AND address !~ '[\u0001-\u001f\u007f-\u009f\u2028\u2029]')`. "Address". Free text, as in the prototype | yes — CEO |
| `contact_email` | `text` | yes | — | `CHECK (length(contact_email) <= 254 AND contact_email ~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$')`. "Contact details" | yes — CEO |
| `contact_phone` | `text` | yes | — | `CHECK (length(contact_phone) <= 40 AND contact_phone ~ '^[0-9+()./ -]+$')`. "Contact details" | yes — CEO |
| `website` | `text` | yes | — | `CHECK (length(website) <= 300 AND website ~ '^https?://[^[:space:]]+$')`. "Contact details" | yes — CEO |
| `default_currency` | `text` | no | — | `CHECK (default_currency ~ '^[A-Z]{3}$')`. "Default currency". Format only: the architecture names no currency list. Set at provisioning and **not changeable in v1** (INV-10; OQ1-04) | **no** |
| `updated_by` | `uuid` | yes | — | The CEO user who made the last change. Filled only from a `user` actor (Phase 0 §4.1); `NULL` until the CEO first edits, and never filled by the script. No foreign key (`identity.users` is Phase 2) | yes — CEO |
| `created_at` | `timestamptz` | no | `now()` | — | no |
| `updated_at` | `timestamptz` | no | `now()` | — | yes — CEO |

Indexes: `configurations_pkey (company_id)` only.

**Immutable columns, all tables.** T1-1: all columns except by migration. T1-2: `company_id`, `name`, `is_demo`, `created_at` (`lifecycle_version` only ever increases by one, with a transition). T1-3: `subscription_id`, `company_id`, `created_at`. T1-4: `company_id`, `default_currency`, `created_at`.

**Constraint helper.** The `CHECK` expressions above are the database's last word. The domain value objects (§4.1) apply the same rules and return field-level messages first, so a user sees "Enter a valid email address", not a constraint name.

### 3.5 Grants

Source: Phase 0 §3.1.8, §3.5. Written in the custom migration `tenant_grants`, applied after the table migration. Like Phase 0's grant migration, it first fails with a clear message if a runtime role is missing, then runs the statements below. The summary table comes first.

| Table | `ledger_runtime` (both processes) | `ledger_app` (API and script) |
|---|---|---|
| `plans` | `SELECT` | — |
| `companies` | `SELECT` | `INSERT (company_id, name, is_demo)`; `UPDATE (status, lifecycle_version, status_changed_at, terminated_at)` |
| `subscriptions` | `SELECT` | `INSERT (company_id, plan_id)`; `UPDATE (plan_id, updated_at)` |
| `configurations` | `SELECT (company_id, legal_name, default_currency)` | `SELECT` (all columns); `INSERT (company_id, legal_name, address, contact_email, contact_phone, website, default_currency)`; `UPDATE (legal_name, address, contact_email, contact_phone, website, updated_by, updated_at)` |

`ledger_worker` holds exactly what it inherits through `ledger_runtime` (the `SELECT` column above) and nothing else: no write on any tenant table.

```sql
REVOKE ALL ON SCHEMA tenant FROM PUBLIC;
REVOKE ALL ON ALL TABLES IN SCHEMA tenant FROM PUBLIC;
REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA tenant FROM PUBLIC;
GRANT USAGE ON SCHEMA tenant TO ledger_runtime;
GRANT SELECT ON tenant.plans, tenant.companies, tenant.subscriptions TO ledger_runtime;
-- the worker side sees only what getTenantContext returns; contact details and address are the API's
GRANT SELECT (company_id, legal_name, default_currency) ON tenant.configurations TO ledger_runtime;
GRANT SELECT ON tenant.configurations TO ledger_app;

GRANT INSERT (company_id, name, is_demo) ON tenant.companies TO ledger_app;
GRANT UPDATE (status, lifecycle_version, status_changed_at, terminated_at) ON tenant.companies TO ledger_app;
GRANT INSERT (company_id, plan_id) ON tenant.subscriptions TO ledger_app;
GRANT UPDATE (plan_id, updated_at) ON tenant.subscriptions TO ledger_app;
GRANT INSERT (company_id, legal_name, address, contact_email, contact_phone, website, default_currency)
  ON tenant.configurations TO ledger_app;
GRANT UPDATE (legal_name, address, contact_email, contact_phone, website, updated_by, updated_at)
  ON tenant.configurations TO ledger_app;
```

Why it is shaped this way:
- **Inserts name exactly the granted columns (Phase 0 §3.5).** PostgreSQL checks column privileges against the insert's column list, including columns that take a default, and Drizzle's insert builder lists every column, so a Drizzle `insert().values()` into these tables fails against the column-level grants. The tenant repository therefore writes `companies`, `subscriptions` and `configurations` inserts with a parameterised `sql` template that names exactly the granted columns, as Phase 0's `AuditWriter` and `OutboxWriter` do; `tenantValues` supplies the values (and stamps `company_id`) and nothing else. Updates set only granted columns. The defaults supply `status = 'active'`, `lifecycle_version = 1`, the timestamps and the ids. A direct insert that names `status`, `lifecycle_version`, `terminated_at` or `created_at` is refused with 42501, so a company can never be created as anything but `active`. Job B's commit B3 includes a `*.db.test.ts` that performs each insert as `ledger_app`, so a Drizzle-style full-column insert is caught at the module's own commit.
- **The worker reads no contact detail.** `ledger_runtime` can read only `company_id`, `legal_name` and `default_currency` of `configurations`, which is all `getTenantContext` returns (§4.5). Address, contact email, phone and website are readable only by `ledger_app`, because only UC-07 reads them (privacy minimisation; Phase 0 §3.1.8). The tenant-status retention triggers (§3.6) read only `tenant.companies`.
- **`ledger_worker` writes nothing.** No worker path changes a tenant table. The Phase 2 subscribers read tenant data only (`getTenantContext`).
- **`ledger_app` is both the API's role and the script's role** (Phase 0 §4.10; OQ-14). The grants cannot tell "the CEO's request" from "the operator's script". That separation is the module's (§4.4) and is proved by gate tests, not by grants. The grants still refuse everything the design never needs: `DELETE`, `TRUNCATE`, any change of `company_id`, `name`, `is_demo`, `default_currency` or `created_at`, and any write to `plans`. OQ1-10 records the residual risk.
- **No sequence grants** are needed: every key is a `uuid`.

The §3.5 self-check of Phase 0 must still pass for both runtime pools after this migration; it reads only the platform tables and the roles' memberships, which Phase 1 does not change.

### 3.6 Database rules (triggers)

Source: Phase 0 §3.5 immutability triggers (the same pattern and the same SQLSTATE). A custom migration `tenant_rules`. These protect against direct SQL, including by the owner, exactly as far as Phase 0's triggers do: an owner can still drop a trigger deliberately, and a superuser can still switch triggers off for its session (Phase 0 §3.5).

| Function | Fires | Rule |
|---|---|---|
| `tenant.enforce_company_rules()` | `BEFORE UPDATE ON tenant.companies FOR EACH ROW` | Refuses (SQLSTATE `42501`) any update that changes `company_id`, `name`, `is_demo` or `created_at`; any update that leaves `status` unchanged (a company row changes only by a transition); any update of a `terminated` row; and any transition other than `active → suspended`, `suspended → active`, `active → terminated`, `suspended → terminated`. It also refuses a transition whose `lifecycle_version` is not exactly `OLD.lifecycle_version + 1`, one that does not set `status_changed_at`, and one that sets `terminated_at` for a non-terminal state |
| `tenant.refuse_immutable_change()` | `BEFORE UPDATE ON tenant.subscriptions` and `tenant.configurations FOR EACH ROW`, with the table's mutable column names as trigger arguments | Refuses an update that changes any column not named in its arguments (`to_jsonb(NEW) - TG_ARGV` compared with `to_jsonb(OLD) - TG_ARGV`). Subscriptions: `plan_id, updated_at`. Configurations: `legal_name, address, contact_email, contact_phone, website, updated_by, updated_at` |
| `tenant.require_company_state()` | `BEFORE UPDATE ON tenant.configurations` (trigger `configurations_require_active_company`) and `BEFORE UPDATE ON tenant.subscriptions` (trigger `subscriptions_require_live_company`), `FOR EACH ROW`, each its own statement | Retention in the database: refuses (`42501`) an update of a `configurations` row unless its company is `active`, and an update of a `subscriptions` row if its company is `terminated` (a suspended tenant's plan may still change, UC-05). Reads `tenant.companies` by primary key; not `SECURITY DEFINER`; both runtime roles hold `SELECT` on `companies`, and the owner always can |
| `tenant.refuse_delete()` | Eight separate triggers, each its own `CREATE TRIGGER` statement: on each of the four tenant tables `<table>_no_delete` (`BEFORE DELETE … FOR EACH ROW`) and `<table>_no_truncate` (`BEFORE TRUNCATE … FOR EACH STATEMENT`). A `TRUNCATE` trigger cannot be `FOR EACH ROW` (PostgreSQL: `0A000`) | Always raises `42501`. **Observed behaviour, PostgreSQL 16:** a plain `TRUNCATE` of a table that other tables reference (`plans`, `companies`; after PA-04 `companies` is referenced by the platform tables) fails with `0A000` before any trigger runs, and `TRUNCATE … CASCADE` reaches the trigger and gets `42501`; the leaf tables (`subscriptions`, `configurations`) get `42501` directly. For the runtime roles, which hold no `TRUNCATE` privilege, the privilege check comes first and is always `42501` |

Each of the four functions: `LANGUAGE plpgsql`, `SET search_path = pg_catalog`, **not** `SECURITY DEFINER` (Phase 0 §4.10), and `REVOKE EXECUTE … FROM PUBLIC` in the same migration. A trigger does not need `EXECUTE` from the caller (Phase 0 §3.5). The migration text avoids the words the migration lint refuses (`SUPERUSER`, `BYPASSRLS`, `session_replication_role`, `DISABLE TRIGGER`; Phase 0 §3.6), in comments too.

The use cases (§5) still check every rule first and return the proper domain error; the triggers are the net under them. The `tenant.require_company_state()` triggers also freeze a terminated tenant's `subscriptions` row and a non-active tenant's `configurations` row at the database, so retention (INV-9) does not rest on the use cases alone.

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
- **Effect on the Phase 0 gate tests — decided (closes OQ1-11).** Every Phase 0 gate test that writes an audit, outbox or event-log row for company A or B needs those companies to exist. Job D (test engineer) adds a support helper in `server/tests/support/` that inserts companies A and B (and a demo company where a test needs one), each with its subscription and configuration, through the owner client, and changes the Phase 0 gate fixtures to call it. Only fixture set-up changes; no Phase 0 assertion is edited. **Job C is merged only after that fixture change is on `backend`, and C's acceptance requires the full Phase 0 gate suite to be green with the foreign keys in place** (§1.5).
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
| `CompanyName`, `LegalName` | 1–200 characters; no forbidden characters (§3.1.9; text rule below) |
| `PlanCode` | `^[a-z][a-z0-9_]{1,49}$` |
| `CurrencyCode` | three upper-case letters **and a member of a static ISO 4217 alphabetic-code list of active codes only, excluding the X-codes (`XXX`, `XTS`, `XAU`, `XAG`, `XPT`, `XPD`, `XDR` and the other `X*` funds and units)** held in `domain/` as a constant (the database `CHECK` keeps the format only, so the list can be updated without a migration). An unknown code such as `ZZZ` is `InvalidValueError` |
| `Address` | 1–500 characters; no forbidden characters (§3.1.9; text rule below) |
| `ContactEmail` | text rule; ≤ 254; one `@`; a dot in the domain part; the last label at least two characters (the prototype's `isEmail`, which is stricter than the database `CHECK`); no whitespace |
| `ContactPhone` | ≤ 40; digits, `+ ( ) . / -` and spaces only |
| `WebsiteUrl` | `http://` or `https://` followed by non-whitespace; ≤ 300 |
| `LifecycleReason` | 1–500 characters on a single line; no forbidden characters (§3.1.9). Used for audit metadata only, never in an event payload or a log line |
| `OperatorIdentity` | `{ name, hostAccount, scriptRunId, command }`: `name` 1–100 characters of `[A-Za-z0-9 ._@'-]`, `hostAccount` ≤ 100 characters, `scriptRunId` a UUID, `command` one of the script commands. Used for audit metadata only |
| `PlanFlags`, `PlanLimits` | A map of `snake_case` names to booleans; a map to non-negative integers |
| `TenantInfo` | The read-only view other modules receive (§4.5) |

The domain layer imports nothing outside its own `domain/` folder (Phase 0 §4.8 rule 3). The validators are hand-written; Zod schemas live in the API layer and the script's argument parsing calls the same value objects through the use cases.

**The text rule — one rule for every free-text input** (company `name`, `legalName`, `address`, `contactEmail`, `contactPhone`, `website`; also `reason` and the operator name). Applied identically by Zod (`.trim()` first, then the field rule), by the value object and by the script, in this order:
1. **Trim** leading and trailing whitespace (JavaScript `trim()`, which removes everything PostgreSQL's `btrim` removes and more).
2. **Validate the trimmed value**: not empty (an empty or whitespace-only string is `InvalidValueError`; only `null` clears a nullable field); length counted in **characters** (code points), not UTF-16 units, so a value that passes can never exceed PostgreSQL's `length()` limit; no forbidden characters (§3.1.9: so no interior newline, tab, NEL, line or paragraph separator); the field's own pattern.
3. **Store and compare the trimmed value.** `"  Acme "` is stored as `"Acme"`. UC-06 compares the trimmed input with the stored value, so a padded but otherwise unchanged `PATCH` is a no-op that writes nothing.
4. **Cheap checks first, and they are fatal.** The length check and the forbidden-character check run before any pattern, and a value that fails either is refused immediately. A pattern (email, phone, URL) runs only on a value that already passed the length limit of its field, never on the raw input. This holds in Zod (`.max()` / `superRefine` with an early return, not a refinement chain that keeps running) and in the value objects. The request body is already capped at 1 MB (Phase 0), so the worst hostile value is 1 MB; the patterns themselves are written without nested or overlapping quantifiers, so even a value at the limit is linear. G1-45 sends 1 MB hostile values to every field within a stated time budget.
5. **Patterns are never looser than the `CHECK` constraint** of the same column (§3). Where JavaScript and PostgreSQL regular expressions differ, the value object uses the stricter reading. No input accepted by Zod and the value object can therefore fail a `CHECK` and surface as a 500; a property-style gate test generates edge inputs (padding, Unicode, astral characters, maximum lengths) to prove it (§9).

Codes (`planCode`, `defaultCurrency`) are not trimmed or case-folded: they must match their pattern exactly.

**Domain errors** (plain classes in `domain/`; the API layer and the script map them): `NotAuthorisedError`, `ConfirmationMismatchError`, `InvalidTenantTransitionError`, `TenantNotActiveError` (carries the status), `TenantNotFoundError`, `PlanNotFoundError`, `PlanNotAssignableError` (inactive), `SamePlanError`, `InvalidValueError` (field and rule, never the value).

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
| `active` | `suspended` | UC-02 `SuspendTenant` | Platform administrator, script only | Row locked; status is `active` | Status, `lifecycle_version`, `status_changed_at`; audit `tenant_suspended`; event `TenantSuspended` |
| `suspended` | `active` | UC-03 `ReactivateTenant` | Platform administrator, script only | Row locked; status is `suspended` | As above; audit `tenant_reactivated`; event `TenantReactivated` |
| `active`, `suspended` | `terminated` | UC-04 `TerminateTenant` | Platform administrator, script only | Row locked; status is not `terminated`; the confirmation matches (script) | As above plus `terminated_at`; audit `tenant_terminated`; event `TenantTerminated` |
| `terminated` | anything | — | **Nobody** | — | Refused: `InvalidTenantTransitionError` (use case) and trigger `42501` (database) |

Rules:
- **Any other pair is refused**, including repeating a state (`active → active`, `suspended → suspended`) and `active → active` as a "reactivate". The use case writes nothing: no row change, no audit entry, no event. A repeated command is therefore visible to the operator as an error, not hidden as success.
- **Hot row.** Every child insert for a tenant (audit entries, outbox events, every module's rows) takes `FOR KEY SHARE` on that tenant's `companies` row. `KEY SHARE` locks are compatible with each other, so concurrent inserts do not serialise on the row, but each new locker on a row already locked by others creates or extends a multixact. That cost is accepted; Phase 9 checks it under load (§4.6).
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
| INV-11 | Lifecycle and plan commands are run only as the platform administrator: a `system` actor with component `tenant-cli` and no causation. A user, a portal user, and any other system actor (including a subscriber) is refused with nothing written. **Enforcement, three parts:** (1) the five administrator functions live in `server/modules/tenant/admin.ts`, not in `index.ts`, so no other module can import them; (2) `openScriptRuntime` brands the contexts it creates and `assertPlatformAdministrator` checks the brand as well as the component, so the string alone is worthless; (3) scans: the literal `'tenant-cli'` appears only in `server/scripts/tenant.ts` and `server/modules/tenant/`, and no file under `server/scripts/**` calls `createSystemContext` (scripts take contexts from the runtime). A test also asserts that a context built by the worker for a subscriber can never carry that component or the brand (§9) | D-15; OQ-14 decision (§4.4); Phase 0 §4.1, rule 11 |
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
- The operator is recorded in **one reserved metadata key**, `metadata.platformAdmin = { operator, hostAccount, scriptRunId, command, reason }`: `operator` (the name given with `--operator`), `hostAccount` (the operating-system user running the script), `scriptRunId` (a UUID per invocation), `command`, and `reason` where the command takes one. Putting every script-only key under one name lets a read surface redact them all in one rule (§4.6, Phase 7). The lifecycle entries themselves stay visible to the tenant's CEO, who may see their own tenant's lifecycle history; `platformAdmin` is not. A script context carries neither a `requestId` nor a `runId` (Phase 0 §4.1 sets them only for requests and worker runs, and `createSystemContext(companyId, component)` takes no run identifier), so `AuditWriter` adds neither key to a script's entries. `scriptRunId` is the script's own correlation key, in `metadata.platformAdmin` and in the script's log lines. Phase 0 is not changed.
- **No new actor role.** An extra role such as `platform_admin` would change the `actor_role` check in Phase 0's T-1 and the `Actor` union, which Phase 1 may not do. If the owner wants one, it is a Phase 0 change and an open question (OQ1-10).
- **The limit, stated plainly.** `--operator` is self-declared, not authenticated. On Replit every shell runs as the same container user, so **`hostAccount` does not tell two operators apart**: it records that the script ran under the workspace account, and nothing more. There is no operator list in v1. The control is who can open a shell with the production secrets (Replit collaborators; Phase 0 §2.5). The audit trail records what the operator claims and which operating-system account ran it.
- The script connects as `ledger_app` through PA-03. It never reads the owner URL.

### 4.5 What other modules get: the public surface

Source: BACKEND_SERVICE_ARCHITECTURE.md, Module 1, Public API Surface; roadmap ("`getTenantContext(companyId)` public API used by every other module").

The tenant module's `index.ts` exports functions, DTO types and the registration. It never exports a domain entity, a table or a repository (Phase 0 §4.8 rule 7).

| Export | Callers | Notes |
|---|---|---|
| `getTenantContext(uow): Promise<TenantInfo>` | Any module's use case or subscriber, with its own unit | Returns the tenant of `uow.context.companyId` only. **There is no `companyId` parameter**, so a module cannot ask about another tenant (INV-1). Throws `TenantNotFoundError` if the row is missing |
| `getPlan(uow): Promise<PlanInfo>` | Same | The company's plan: `code`, `name`, `featureFlags`, `limits` |
| `assertTenantActive(uow): Promise<void>` | Same | Throws `TenantNotActiveError` (status `suspended` or `terminated`) or `TenantNotFoundError` |
| `createTenantAdmin({ logger })` — in `server/modules/tenant/admin.ts`, **not** exported from `index.ts` | **`server/scripts/tenant.ts` only** (INV-11) | Returns `provisionTenant`, `suspendTenant`, `reactivateTenant`, `terminateTenant`, `changeTenantPlan` and `showTenant`, each taking `(uow, input)`. Other modules cannot import `admin.ts` (Phase 0 §4.8 rule 2: another module is reachable only through its `index.ts`); the scanner extends the rule to `server/scripts/**` (G1-24, G1-55, G1-69). Each function checks `assertPlatformAdministrator` and logs one WARN line when it refuses (component, command, `companyId`, no values) |
| `updateTenantConfiguration(uow, input)`, `getTenantConfiguration(uow)` | The router (and tests) | CEO only |
| `tenantModule` (the `ModuleRegistration`) | `server/modules/registry.ts` | One registry line |

```ts
// Named TenantInfo, not TenantContext: Phase 0 §4.1 already exports a platform type named TenantContext
interface TenantInfo {
  readonly companyId: string;
  readonly status: 'active' | 'suspended' | 'terminated';
  readonly lifecycleVersion: number;
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
| Phase 2 | Login and refresh are public routes that PA-02 does not cover. They must refuse an inactive tenant themselves, by a lookup that Phase 2's specification designs (OQ1-12). A suspended tenant's refresh tokens stop working. Phase 2's lifecycle subscribers (`TenantProvisioned`, `TenantSuspended`, `TenantReactivated`, `TenantTerminated`) declare `tenantStatusPolicy: 'any'` |
| Phase 2 | The `TenantSuspended`, `TenantTerminated` and `TenantReactivated` subscribers revoke or restore sessions. They run for inactive tenants by design: the worker never blocks delivery on tenant status |
| Phase 2 | Re-load the role and active status of the user from `identity` on the tenant configuration paths (UC-05 is script-only; UC-06 and UC-07 are CEO routes) instead of trusting the token (OQ1-13) |
| Phase 2 | Decide how the initial CEO is identified for the `TenantProvisioned` subscriber (OQ1-06) |
| Every phase with subscribers | Every subscriber registration declares `tenantStatusPolicy` (`active_only` or `any`), a required field with no default (PA-06, §5.8). A subscriber declares `any` only if its job is to act on a lifecycle event or on an inactive tenant (Phase 2's session subscribers do); all others declare `active_only`. A consequence the specifications of those phases accept: events delivered while a tenant is suspended are **not** replayed on reactivation |
| Phase 2 | `tenant.configurations.updated_by` has no foreign key because `identity.users` does not exist yet. Add `REFERENCES identity.users(user_id)` in Phase 2's migration, or record in Phase 2's specification why a user reference is deliberately unenforced |
| Phase 7 (audit read surface) | **Binding.** The audit read surface (query service and `/api/v1/audit/`) never returns `metadata.platformAdmin` to a CEO or PM view (BACKEND_MULTITENANCY_ARCHITECTURE.md, Audit Visibility Boundaries). Phase 7's gate includes a test that the CEO and PM audit views of a lifecycle entry written by the script contain the entry without `metadata.platformAdmin` (OQ1-10) |
| Phase 9 | Row Level Security on the tenant tables. Until then `ledger_app` can `UPDATE` `status`, `lifecycle_version` and the related columns of **any** company and `INSERT` companies, unscoped, because the script and the API share the role (OQ1-10); RLS must scope what the API connection can do to its own `company_id` and keep lifecycle writes to the script path |
| Phase 9 | A load check of concurrent inserts for **one** tenant (audit entries, outbox events, module rows), to confirm that the `KEY SHARE` lock every child insert takes on the tenant's `companies` row (§4.2, hot row) stays cheap |
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

- **`assertPlatformAdministrator(ctx)`** — `ctx.actor.kind === 'system'` **and** `ctx.actor.component === 'tenant-cli'` **and** `ctx.causation === null` **and** the context carries the **brand** that `openScriptRuntime` puts on the contexts it creates (INV-11). The brand is platform-private, like the WeakSet membership of Phase 0 §4.1, and is checked through a predicate the platform exports for modules (`isScriptRuntimeContext(ctx)`, PA-03); a context built any other way, even with the right component string, fails. A user (any role), a portal user, a subscriber, the status-port context (`component = 'platform.tenantStatus'`) and any other system actor fail. Every refusal in UC-01 … UC-05 logs **one WARN line** (component, command, `companyId`; never a value).
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
- *Writes:* update `status`, `lifecycle_version = lifecycle_version + 1`, and — taken **after the lock is held**, with `clock_timestamp()` — `status_changed_at` and, for UC-04, `terminated_at`; then the audit entry and the outbox event. The version, not the timestamp, orders transitions (§7.3).
- *Transaction:* one. A failed guard writes nothing, not even an audit entry (a refused command is not a state change; it is reported to the operator and logged, §8).
- *Concurrency:* two commands for the same company serialise on the row lock; the loser re-reads the new status and is refused (G1).
- *Returns:* `{ companyId, previousStatus, status }`.

**UC-05 — ChangeTenantPlan** (script `change-plan`; `TenantPlanChanged`; OQ1-02)
- *Input:* `planCode`, `reason`, `operator`.
- *Authority:* `assertPlatformAdministrator`.
- *Checks:* lock `companies` `FOR SHARE`: absent → `TenantNotFoundError`; `terminated` → `TenantNotActiveError`. A suspended tenant's plan may change. Lock `subscriptions` `FOR NO KEY UPDATE`. The target plan exists and is active; it differs from the current plan (`SamePlanError`).
- *Writes:* `plan_id` and `updated_at` (`clock_timestamp()` after the lock); audit; event. No version column on `subscriptions`: nothing orders plan changes by time (§7.3).
- *Transaction:* one.

**UC-06 — UpdateTenantConfiguration** (Multitenancy, Provisioning step 5)
- *Input:* a non-empty set of `legalName`, `address`, `contactEmail`, `contactPhone`, `website`. Nullable fields take `null` to clear a value. An empty or whitespace-only string is invalid, not "clear".
- *Authority:* `assertCeoOfOwnCompany`.
- *Checks:* lock `companies` `FOR SHARE`; status must be `active` (`TenantNotActiveError`) — this re-check under a lock is what makes the PA-02 cache window harmless for writes: a suspension that commits first is seen here, and a suspension that starts later waits for this transaction. Lock the `configurations` row `FOR NO KEY UPDATE`. Compare each submitted field with the stored value. The router opens this unit with `lockTimeoutMs: 5000` (PA-03): a wait longer than 5 s ends in `55P03`, which the platform maps to `503 SERVICE_BUSY`; nothing is written and the client may retry.
- *No change:* the use case returns a result value `{ changed, configuration }`. If every submitted value equals the stored one, `changed` is `false`, the current configuration is returned, and the use case writes **nothing**: no row change, no `updated_at` move, no audit entry, no event.
- *Writes:* the changed columns, `updated_by = ctx.actor.userId`, `updated_at = clock_timestamp()` (after the lock); audit entry with previous and new values of the changed fields (§8); event with the changed field names only (§7).
- *Transaction:* one. Concurrent edits serialise on the row lock: a second edit sees the first's values as its `previousValue`, so no audit entry quotes a value that was never stored.
- *Cannot change:* `status`, `isDemo`, `companyId`, `planCode`, `defaultCurrency` (not inputs of this use case at all).

**UC-07 — GetTenantConfiguration:** `assertCeoOfOwnCompany`; one read joining `companies` and `configurations` for `ctx.companyId` through `tenantWhere`, without locks; `TenantNotActiveError` if the company status it returns is not `active`. HTTP use cases (UC-06, UC-07) do **not** call `assertTenantActive`: PA-02 has already checked the status for this request, and each use case reads the status in a query it makes anyway (UC-06 under its lock). No audit entry (it is not a financial or approval action; BACKEND_OBSERVABILITY_ARCHITECTURE.md, What Triggers an Audit Entry).

**UC-08 — ResolveTenantStatus** (the port behind PA-02, Phase 0 OQ-12)
- *Contract:* `getStatus(uow): Promise<'active' | 'suspended' | 'terminated' | null>` — the status of `uow.context.companyId`, or `null` if no such company. One `SELECT status` by primary key; no lock, no audit, no event. The port is not `humanOnly` (the platform calls it with a system context). Its implementation is `application/ports/tenant-status.impl.ts`, reachable only through `bind` (Phase 0 rule 12).
- *Caller:* the platform opens a short unit with `createSystemContext(companyId, 'platform.tenantStatus')`, calls the port, and closes it (PA-02). Modules do not call this port.

**UC-09 — GetTenantContext, UC-10 — GetPlan, UC-11 — AssertTenantActive:** UC-09 is **one joined query**: `companies` joined to `configurations` (only `legal_name` and `default_currency`) and `subscriptions`, each through `tenantWhere`, and `plans` joined by its primary key; no lock, no writes. The result is memoised on the unit of work, so repeated calls inside one unit cost one query. UC-10 reads the plan the same way. UC-11 reads only the status and throws `TenantNotActiveError` (status `suspended` or `terminated`) or `TenantNotFoundError`. They are the non-HTTP half of the gate (§1.3): a later module's use case that must not run for an inactive tenant calls UC-11 first. (Subscribers do not need to: the worker enforces `tenantStatusPolicy`, §5.8.)

**UC-12 — ShowTenant** (script `show`, read only): `assertPlatformAdministrator`; returns exactly `companyId`, `status`, `isDemo`, `planCode`, `statusChangedAt`, `terminatedAt` and `lifecycleVersion`. **No name** and no configuration detail. No audit entry. Added so an operator can confirm the effect of a command and recover after a lost output (OQ1-15).

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

**Shape.** `server/scripts/tenant.ts` exports `run(argv, io)`, where `io` is `{ env, stdout, stderr }`, and a small wrapper executes it with the process's own streams and exit code. Tests call `run` with an explicit environment (§9.1). The environment is passed to PA-03's loader as an argument; the script never reads the process environment itself (rule 13). **The executable wrapper — and only the wrapper — calls `loadCliEnvironment()`** (exported from `server/platform/system/`, implemented in `server/platform/config/`, the only code that reads the environment). It loads the script configuration, calls `scrubOwnerVariables()`, reduces `process.env` to an allowlist, and returns the reduced environment, which the wrapper passes to `run` as `io.env`; `server/scripts/**` therefore never mentions `process.env` (rule 13), and the scan of G1-24 looks for the `loadCliEnvironment` call literally. The allowlist is: `LEDGER_APP_DATABASE_URL`, `NODE_ENV`, `LOG_LEVEL`, and the minimum Node and the operating system need: `PATH` (`Path` on Windows), `HOME`, `USERPROFILE`, `TZ`, `TMPDIR`, `TEMP`, `TMP`, `SystemRoot`, `LANG`, `LC_ALL`. Every other variable is deleted, so the JWT keys, `PORTAL_JWT_SECRET`, the `LEDGER_WORKER_*` URLs, `LEDGER_MIGRATION_*` and `PG*` are not in the process the script runs in. `run` called from a test with an explicit `io.env` never scrubs or reduces anything, so the test harness's own variables survive; a spawned-process test proves the real CLI does (G1-75).

**Behaviour**
1. Arguments are read with Node's `util.parseArgs` in strict mode (unknown options are errors). Every value is validated by the domain value objects through the use case; the script itself contains no business rule and no SQL.
2. `OperatorIdentity` = `--operator` (required for every command except `show`), `hostAccount` from `os.userInfo().username`, `scriptRunId` from `crypto.randomUUID()`, and the command name. `--operator` is self-declared (§4.4).
3. The script obtains configuration and a pool through PA-03 (`loadScriptConfig`, and the runtime opener, to which it passes `[tenantModule]`, imported from `server/modules/tenant/index.ts`; the five administrator functions come from `createTenantAdmin` in `admin.ts`, which only this file imports). The opener builds the audit and event catalogues from the registrations it is given and checks them exactly as PS-02 does, so a script can write only the types its modules register (§5.7). The script does not import `server/modules/registry.ts` (rule 8 is unchanged). It reads **only** `LEDGER_APP_DATABASE_URL` (plus `NODE_ENV`, `LOG_LEVEL`). It does not read the owner URL, `DATABASE_URL`, the `PG*` variables, or the JWT keys. If `LEDGER_APP_DATABASE_URL` is missing it exits 2 and does not fall back to anything. **TLS:** whatever `NODE_ENV` says, the script refuses (exit 2) a URL whose host is not local (`localhost`, `127.0.0.1`, `::1`, `helium`) unless `sslmode` is `verify-full` or `require`; Phase 0's production-only rule is stricter here because a script is run by hand from many places. The first connection runs the Phase 0 §3.5 self-check; a connection that is not `ledger_app` is refused.
4. For `provision` the script generates the company id first and prints a `started` line on **stderr** (`{"outcome":"started","command":"provision","companyId":"…","currency":"GBP","scriptRunId":"…"}`) **before** opening the transaction, so the id is known even if the process dies after the commit, and the operator can catch a mistyped currency before it is stored. `show` then reveals whether the company exists. The currency is validated against the ISO 4217 list first (§4.1).
5. The context is `createSystemContext(companyId, 'tenant-cli')`; the work runs in `runInTransactionAs('tenant', ctx, …)`.
6. **Output:** stdout carries **exactly one JSON line**, the result (`{"outcome":"ok",…}` with `companyId`, `status`, `scriptRunId`; for `show`, the fields of UC-12). Everything else — the `started` line, the logger's lines (the script's logger writes to **stderr**, unlike the API's), and a refusal or failure line (`{"outcome":"refused"|"failed","code":"…","message":"…"}`) — goes to stderr. Messages are fixed British-English sentences containing no argument values. Nothing printed or logged contains the database URL, a password, the company name, the reason text or the operator-supplied values other than the company id (INV-13).
7. **Exit codes:** `0` done · `1` usage or validation error (nothing written) · `2` configuration, connection, TLS or role-check failure (nothing written) · `3` the use case refused (unknown company, invalid transition, unknown or inactive plan, same plan, confirmation mismatch, not authorised) · `4` unexpected error · `5` **busy, retry**: a lifecycle or plan command waited more than 5 s for the company's row lock (another command or edit holds it) and wrote nothing. Retrying is safe, because nothing was written; run the command again after a few seconds. `PA-03`'s opener applies `SET LOCAL lock_timeout = '5s'` at the start of every unit it opens, which is platform code, not module code (rule 10 is unaffected); the lock-timeout error (`55P03`) is mapped to exit 5.
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
2. **Lookup.** The platform declares the port token `platform.tenantStatus` (`definePort`, exported from the platform index). The tenant module binds it (`providesPorts`). The platform may not import the module (rule 8); it receives the implementation through the port registry. On a cache miss the platform opens a **minimal unit** under `createSystemContext(claims.company_id, 'platform.tenantStatus')` on the API's own pool, runs `SET LOCAL statement_timeout = '2s'`, calls `getStatus(uow)` (UC-08: one `SELECT status` by primary key) and closes it. The cache bounds how many such units can be open (one per company per lifetime, single-flight); they share the API pool with request traffic, so the 2 s limit is also the longest a miss can hold a connection. A timeout fails closed (`500`, below) and is never cached.
3. **Cache.** In-process, per API process, keyed by `company_id`. Lifetime `TENANT_STATUS_CACHE_MS` (PA-05): integer 0–60 000, default 5 000, `0` disables caching. At most 10 000 entries; the least recently used entry is evicted first (LRU, not insertion order). Expiry is measured from the **start** of the lookup, so a slow lookup cannot extend the lifetime. When the lifetime is greater than 0, concurrent misses for one company share a single lookup (single-flight). **With `0` nothing is cached and nothing is shared:** every request makes its own lookup. A failed lookup is never cached. A "no such company" answer is cached for the same lifetime. **Staleness bound:** a suspension, reactivation or termination made by the script (a different process) is seen by a running API within `TENANT_STATUS_CACHE_MS`. The bound is stated in the opening of every gate test that depends on it.
4. **Decision.**

| Looked-up status | Response | Handler runs? |
|---|---|---|
| `active` | continue | yes |
| `suspended` | `403 TENANT_SUSPENDED`, "This account is suspended." | no |
| `terminated` | `403 TENANT_TERMINATED`, "This account has been closed." | no |
| no company (`null`) | `401 UNAUTHENTICATED` (a validly signed token that names nothing is treated as invalid; BACKEND_AUTH_ARCHITECTURE.md says 403 for a suspended account, not for a missing one) | no |
| lookup failed | `500 INTERNAL_ERROR` — **fail closed**; the request is never let through | no |

5. **Nothing else changes.** Token verification, claims, header handling and the other 401 paths are as in Phase 0. The two new error codes join the platform table of Phase 0 §6.3.
6. **The worker's delivery is policy-driven (PA-06).** The worker never refuses to *deliver* an event because of tenant status: `TenantSuspended` and every other event is delivered for a suspended tenant, to every subscriber that declared `tenantStatusPolicy: 'any'` (Phase 2's revocation subscriber depends on it). Subscribers that declared `active_only` are not called for an inactive tenant (§5.8).
7. **Start-up.** In full mode the API refuses to start if no module provides the port, and names the port in one `FATAL` line, like any unwired port (PS-16). **The worker requires the port too** (PA-06 reads status through it): in full mode **both** processes refuse to start if the port is unbound, each with one `FATAL` line naming the port. The Phase 0 gate harness has no tenant module, so job D0 supplies a stub binding of `platform.tenantStatus` returning `active` for the gate companies (D0a, written against job A's port token); the sequencing is in §1.5. The real tenant binding replaces the stub only in the G1 tests. Frontend-only mode has no tokens and no check. How Phase 0's PS-16 rules (which describe ports that modules require) are extended to a port the platform requires is OQ1-08.

### 5.7 PA-03 and PA-05 — script bootstrap and configuration variable

- **PA-03.** `loadScriptConfig(env)` lives in `server/platform/config/`, the only code that reads the environment (rule 13), and is re-exported through `server/platform/system/` for scripts. It reads only `LEDGER_APP_DATABASE_URL`, `NODE_ENV` and `LOG_LEVEL`. The runtime opener, `openScriptRuntime(modules, env)` in `server/platform/system/`, returns `{ runInTransactionAs, dbRole, logger, close }`. **It takes the module registrations the script serves** (the tenant script passes `[tenantModule]`) and builds the audit and event catalogues from them and checks them (unique types, one owner each, module-bound units) exactly as PS-02 does; Phase 0 builds the catalogues only from the registry at process start-up, and a script never loads the registry. Without this, `append` and `record` would refuse every type. The pool is a `ledger_app` pool built with the same explicit-settings rule as every pool (Phase 0 RP-03), the self-check runs through `withClient`, and `close()` ends the pool so the process exits. `loadCliEnvironment()` (exported from `system/`, reading the environment through `config/`) loads the script configuration, scrubs the owner variables, reduces the environment to the allowlist and returns it for the CLI wrapper; the opener does none of this (§5.4). The opener's units take a `lockTimeoutMs` option (default 5 000 for script units), and the same option is available to `ModuleDeps.runInTransaction`; the platform error handler maps `55P03` to `503 SERVICE_BUSY`. The opener also: **brands** every context it creates through `runtime.createContext(companyId, component)` (platform-private, checked by `isScriptRuntimeContext(ctx)`, which `server/platform/index.ts` exports for modules; scripts do not call `createSystemContext`); applies `SET LOCAL lock_timeout = '5s'` to each unit; sends its logger to stderr; and enforces the TLS rule for non-local hosts (§5.4 item 3). `package.json` gains `"tenant"`; `drizzle.config.ts` gains `'tenant'` in `schemaFilter`. These are root configuration, hence the platform engineer's (Folder Ownership).
- **PA-05.** `TENANT_STATUS_CACHE_MS` is read by `loadApiConfig` only: an optional integer, 0–60 000, default 5 000. Anything else is a `ConfigError` naming the variable. The worker and the script do not read it.

### 5.8 PA-06 — tenant status policy for subscribers (review round 2)

Phase 0 §4.5 defines `Subscriber { name, eventTypes, handle }`. PA-06 adds one **required** field and a worker check. This changes the shape of Phase 0's `Subscriber`, so the Phase 0 probe subscribers in the gate harness declare it too (job D0).

```ts
interface Subscriber {
  name: string; eventTypes: readonly string[];
  tenantStatusPolicy: 'active_only' | 'any';   // required, no default
  handle(event: EventEnvelope, uow: UnitOfWork): Promise<void>;
}
```

- **A required field with no default**, so the type system forces the decision. At start-up the subscriber registry (PS-15) also refuses a registration whose value is missing or not one of the two (for untyped code), naming the subscriber.
- **`any`:** the worker calls the subscriber whatever the tenant's status. For handlers whose job is the lifecycle event itself or work that must continue for an inactive tenant. Phase 2's lifecycle subscribers declare `any`.
- **`active_only`:** before invoking the subscriber, the worker reads the tenant's status through the `platform.tenantStatus` port, in **its own short unit on the worker pool**, with no lock and a `statement_timeout` of 2 s. The read is **skipped when no `active_only` subscriber is registered for the event's type**, and it is **memoised per claimed batch, keyed by `company_id`**, so a batch of ten events for one tenant costs one read, shared by all its `active_only` subscribers. If the tenant is not `active`, the delivery **counts as handled with no effect**: the subscriber's name is added to `delivered_subscribers` exactly as for a completed subscriber (PS-18), the subscriber is not called, and an INFO line records the event type, the subscriber name, the `companyId` and the status. That line is **rate-limited to one per company and subscriber per minute**, carrying the count of deliveries it stands for. The event is not retried and not dead-lettered. A failed status read is a failed attempt (retry with backoff), never a skip; a missing company (cannot occur, INV-1) is treated as inactive. **The check-then-act window is accepted and named:** a tenant suspended just after the read can still have that one delivery processed, which is the same window the HTTP cache has (§5.6, bounded by one read per batch).
- **Consequence, stated plainly:** events delivered to an `active_only` subscriber while the tenant is suspended or terminated are **not replayed** when the tenant is reactivated. This is accepted. D-17 puts approval effects in the approving transaction, not in subscribers, so no financial effect is lost by it; the activity feed and notifications simply have a gap for the suspension period.
- Tests: G1-77.

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
| `legalName` | text rule (§4.1), 1–200 characters; cannot be `null` |
| `address` | string 1–500, no forbidden characters (§3.1.9); or `null` |
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
| 503 | `SERVICE_BUSY` | A lock wait ended after 5 s (`55P03`; UC-06 runs with `lockTimeoutMs: 5000`); nothing was written and the request may be repeated. A platform code added to Phase 0 §6.3's table by PA-03 |

**Validation details are sanitised by the tenant API layer** before `ValidationError` is thrown, so Zod's own messages never reach the client. Each issue is mapped to a **fixed message** per rule (for example "Enter a valid email address.", "This text is too long."). Only **allowlisted field paths** are named (`legalName`, `address`, `contactEmail`, `contactPhone`, `website`); any other path — an unknown key, `__proto__`, a nested path — is reported as `{ "body": ["The request contains a field that is not allowed."] }` without naming it. The details object has at most 10 entries, each message at most 120 characters. No received value appears in any detail.

Domain errors map as: `NotAuthorisedError` → 403 `FORBIDDEN`; `TenantNotActiveError` → 403 `TENANT_SUSPENDED` or `TENANT_TERMINATED` by its status; `TenantNotFoundError` → 404; `InvalidValueError` → 400 `VALIDATION_ERROR` with the field path. The lifecycle errors (`InvalidTenantTransitionError`, `PlanNotFoundError`, `PlanNotAssignableError`, `SamePlanError`, `ConfirmationMismatchError`) are reachable only from the script and need no HTTP mapping. Messages are British English, fixed, and contain no input value.

Headers, the error envelope and logging follow Phase 0 §6.2–§6.3 and §4.7: the request line names the route template only; the legal name, address, email, phone and website are never logged.

Not in Phase 1: rate limiting and `Idempotency-Key` (Phase 9; `PATCH` is idempotent by construction), OpenAPI (Phase 9).

---

## 7. EVENTS

### 7.1 Produced

All six are produced by the `tenant` module (`source_module = 'tenant'`), written by `uow.events.record` in the same transaction as the state change, with `jobRequired: false` (none is financially relevant). The envelope is Phase 0 §4.5; `actorId` is `NULL` for the script and the CEO's user id for UC-06. Payloads hold identifiers, status or plan codes, field names and one timestamp; no free text, no contact detail, no name, no financial amount (INV-13, Phase 0 OQ-07).

| Event | Written by | `sourceObjectType` / `sourceObjectId` | Payload (exactly these keys) | Planned consumers (BACKEND_EVENT_ARCHITECTURE.md) |
|---|---|---|---|---|
| `TenantProvisioned` | UC-01 | `Company` / `company_id` | `companyId`, `isDemo`, `planCode`, `lifecycleVersion` (1) | Identity (create the initial CEO; Phase 2), Intelligence (audit; Phase 7) |
| `TenantSuspended` | UC-02 | `Company` / `company_id` | `companyId`, `previousStatus` (`active`), `lifecycleVersion`, `statusChangedAt` | Identity (revoke all sessions), Intelligence (alert) |
| `TenantReactivated` | UC-03 | `Company` / `company_id` | `companyId`, `previousStatus` (`suspended`), `lifecycleVersion`, `statusChangedAt` | Identity (restore access), Intelligence (audit) |
| `TenantTerminated` | UC-04 | `Company` / `company_id` | `companyId`, `previousStatus` (`active` or `suspended`), `lifecycleVersion`, `statusChangedAt` | Identity (revoke all sessions), Intelligence (audit) |
| `TenantConfigurationUpdated` | UC-06 | `TenantConfiguration` / `company_id` | `companyId`, `changedFields` (a non-empty array of the field names `legalName`, `address`, `contactEmail`, `contactPhone`, `website`) | Intelligence (audit) |
| `TenantPlanChanged` | UC-05 | `Subscription` / `subscription_id` | `companyId`, `previousPlanCode`, `newPlanCode` | Intelligence (audit) |

### 7.2 Consumed

**None** (BACKEND_DOMAIN_ARCHITECTURE.md, Tenant Context: "Consumes Events: None"). Phase 1 registers no subscriber. The consumers above are later phases; tenants provisioned in Phase 1 therefore reach no subscriber at all (OQ1-06).

### 7.3 Rules for the consumers

- **Idempotency key:** `eventId` (the default, Phase 0 §7.3). Identity's `TenantProvisioned` subscriber should instead key on `companyId` (one initial CEO per company); Phase 2 names it.
- **Order is not guaranteed** (Phase 0 OQ-06). A suspension and a reactivation made close together can be delivered in either order. **`lifecycleVersion` is the ordering key**: it increases by exactly one per committed transition, so a subscriber that has applied version *n* ignores any lifecycle event with a version ≤ *n*, and a gap means an event is still to come. `statusChangedAt` is for display only: `now()` is the transaction start time, so a command that waited for the row lock can carry an earlier time than the one that committed before it. A subscriber that restores or revokes sessions should still act on the company's **current** status and version (`getTenantContext`) rather than on the event type alone. **Plan changes need no version:** the only planned consumer is Intelligence's audit read model (Phase 7), and a plan-dependent decision reads the current plan with `getPlan`. `TenantPlanChanged` carries both the previous and the new plan code, so a consumer can detect a gap by comparing them. If a later consumer needs ordering, it adds the same `+1` pattern to `subscriptions` by specification change.
- **Delivery does not depend on tenant status.** Events for suspended and terminated tenants are delivered like any other (§5.6 item 6).
- Event payloads are copied verbatim into the permanent event log, which both runtime roles can read; the payload rule above is why `TenantConfigurationUpdated` names fields and never values.

---

## 8. AUDIT ENTRIES

### 8.1 Entry types

All six are owned by the `tenant` module, `jobRequired: false`, written by `uow.audit.append` in the same transaction as the state change. The names follow the domain convention (`<object>_<past participle>`) and mirror the event names. **No frozen document lists tenant entry types** (`DOMAIN_MODEL_SUMMARY.md`, Audit Entry Types by Domain, has none); the authority is the roadmap's "with audit entries", and the names are OQ1-05. The consumer "Intelligence (audit)" in the event catalogue is a Phase 7 read model, not a substitute for the transactional entry.

| Entry type | Use case | `source_object_type` / `id` | `destination_object_*` | `previous_value` | `new_value` |
|---|---|---|---|---|---|
| `tenant_provisioned` | UC-01 | `Company` / `company_id` | none | `NULL` | `{ name, status: "active", lifecycleVersion: 1, isDemo, planCode, defaultCurrency }` |
| `tenant_suspended` | UC-02 | `Company` / `company_id` | none | `{ status: "active", lifecycleVersion: n }` | `{ status: "suspended", lifecycleVersion: n+1 }` |
| `tenant_reactivated` | UC-03 | `Company` / `company_id` | none | `{ status: "suspended", lifecycleVersion: n }` | `{ status: "active", lifecycleVersion: n+1 }` |
| `tenant_terminated` | UC-04 | `Company` / `company_id` | none | `{ status: <previous>, lifecycleVersion: n }` | `{ status: "terminated", lifecycleVersion: n+1 }` |
| `tenant_plan_changed` | UC-05 | `Subscription` / `subscription_id` | none | `{ planCode: <previous> }` | `{ planCode: <new> }` |
| `tenant_configuration_updated` | UC-06 | `TenantConfiguration` / `company_id` | none | the **previous values of the changed fields only** | the **new values of the changed fields only** |

For every entry: `job_id`, `site_id`, `client_id` and `external_reference` are `NULL`; `company_id` is the tenant concerned (from the context); `occurred_at`, `audit_id`, `sequence_no` come from the database; `AuditWriter` adds `metadata.requestId` for an API request; a script's entries have neither `requestId` nor `runId` (their correlation key is `metadata.scriptRunId`, §4.4).

### 8.2 Who is recorded, and the metadata

| Written by | `actor_id` | `actor_role` | `causation_*` | `metadata` (besides the `requestId` that `AuditWriter` adds for API requests) |
|---|---|---|---|---|
| The script (UC-01 … UC-05) | `NULL` | `system` | `NULL` | `platformAdmin: { operator, hostAccount, scriptRunId, command, reason }` (`reason` for UC-02 … UC-05) (OQ-14, §4.4). The key is reserved: redacted from tenant-facing audit views (Phase 7 obligation, §4.6) |
| The CEO (UC-06) | the CEO's user id | `ceo` | `NULL` | `changedFields` (the same names as the event) |

`reason` is free text supplied by the operator. It is recorded only inside `metadata.platformAdmin` of the audit entry, which is permanent, and **never** in an event, a log line or the script's output. Only `metadata.platformAdmin` is hidden from tenant-facing views; the entry itself (type, time, previous and new status) remains part of the tenant's own history.

### 8.3 Decision: previous and new values in `tenant_configuration_updated`

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

## 9. GATE TESTS

### 9.1 How the gate is run

- **Location and tooling.** Gate tests live in `server/tests/gate/phase-1-tenant/`. `backend-test-engineer` writes them from this section, not from the implementation, using Vitest and Supertest against the test database (D-12, D-14), in the `gate` project of Phase 0 §9.1. The implementer never edits them. Tests marked **Command** are verification commands the PM runs.
- **Two environments** (Phase 0 RP-05): the local mirror at every commit; Replit's `ledger_test` before the phase closes. Only the URLs differ.
- **The gate includes every earlier phase.** `npm test` runs the Phase 0 gate too (G1-02). A Phase 1 change that breaks a Phase 0 test is a Phase 1 failure.
- **Fixtures (job D1, `server/tests/support/`).** A helper `seedCompany({ id?, name, isDemo?, plan? })`, run through the owner client, inserts the company with its configuration and subscription (no audit entry, no event; this is test set-up, not a use case). Three shared companies are used throughout: **A** and **B** (real) and **D** (demo). They stay `active` for the whole run. **Any test that suspends, reactivates or terminates a company, or that issues the lifecycle updates of G1-06 and G1-07, uses a fresh `seedCompany` and never A, B or D**, because `terminated` is terminal (INV-2) and a shared company left terminated would break every later test. Each company has a CEO, a PM and a worker token factory (`signPlatformToken`), and a portal token factory. Tests create extra plans (`gate_plan_alt`, `gate_plan_inactive`) with the owner client. Phase 0 fixtures call `seedCompany` for A and B; no Phase 0 assertion changes (OQ1-11, closed).
- **The Phase 0 harness changes (job D0).** The Phase 0 probe harness binds a stub `platform.tenantStatus` returning `active` for the gate companies (D0a) and its probe subscribers declare `tenantStatusPolicy: 'any'` (D0b). The G1 tests build their app with the real `tenantModule`, which replaces the stub.
- **The test app** registers `tenantModule` for real, plus the probe module of Phase 0 (`/__probe`, `/__alpha`, `/__beta`) extended with: a probe portal route; a probe list route over `gate_test.probe_state` that uses `parsePageQuery`, `decodeCursor`, `buildPage` and `tenantWhere` (test-only; Phase 1 has no production list route); a probe use case that calls `assertTenantActive(uow)` and writes a `gate_test.probe_state` row; probe subscribers for all six tenant events (one `active_only`, one `any`) that record `(eventId, lifecycleVersion)` and apply version ordering; and a counter that records how many times each probe handler ran. **The faulty port:** the app registers the tenant status binding through a wrapper whose `getStatus` delegates to the real implementation unless the test has switched it to throw or to delay; this is how G1-34 fails the lookup without touching the database. `TENANT_STATUS_CACHE_MS` is set per test through the config object.
- **The script is driven in-process.** `server/scripts/tenant.ts` exports `run(argv, io)` (`io` = `{ env, stdout, stderr }`) and wraps it for execution (§5.4). Tests call `run` with an explicit environment, so they control exactly which variables the script can see. Two tests (G1-55(c) and G1-75) also launch it as a real child process. `run` does not scrub the environment; the executable wrapper does (§5.4).
- **Fault injection** is the Phase 0 pattern: the owner temporarily revokes a privilege from `ledger_runtime` or `ledger_app` for one test and restores it in `finally`. Every fault-injection test (i) pins the exit code or HTTP status it expects (script: 4; API: 500), (ii) uses the client's statement log to assert that the failing statement ran **inside** the transaction after the first write, so it is the rollback, and not an early validation, that leaves nothing, and (iii) includes a **control** run in the same test, with the privilege restored, that succeeds.
- **Deterministic races.** A second owner connection holds a row lock (`SELECT … FOR NO KEY UPDATE`) so that two use cases are both started and both queued; the lock is then released, so the order is controlled, not hoped for. Orders that cannot be forced are randomised with a **seeded PRNG**; each such test runs 20 interleavings and prints its seed on failure so a failure can be replayed. Tests use **latches** (promises the test resolves), never sleeps, to order two units.
- **Time bounds.** Tests that depend on the status cache set `TENANT_STATUS_CACHE_MS` to `0` or to a small value (300) and use the real clock, with a stated numeric margin (150 ms from the commit's `clock_timestamp()`). The bound itself is proven by a deterministic cache unit test with an injected clock (G1-32); the real-clock tests are smoke tests of the same bound. Tests that expect a lock timeout accept 4.5 s to 6.5 s.
- **"Refused with 42501"** means `insufficient_privilege`; "23514" `check_violation`; "23503" `foreign_key_violation`.
- **A marker string** (for example `ZQX-leak-7`) is placed in every free-text input of the tests that assert "no input value is echoed or logged". The test searches the response bodies, the script's stdout and stderr, and the event payloads for it. **Logs are checked once, for the whole suite** (G1-70): a log-capture hook, installed in the gate project's setup, fails any gate test whose captured lines contain a marker.
- **Forbidden bodies (table FB).** The bodies below are used by G1-25, G1-43 and G1-45 by reference. Each is sent as the `PATCH /api/v1/tenant/configuration` body with the role named by the test, and always changes nothing.

  | ID | Body | ID | Body |
  |---|---|---|---|
  | FB-1 | `{"status":"terminated"}` | FB-12 | `{"legalName":""}` |
  | FB-2 | `{"isDemo":false}` | FB-13 | `{"address":""}` |
  | FB-3 | `{"companyId":"<B>"}` | FB-14 | wrong types and arrays for each field |
  | FB-4 | `{"planCode":"gate_plan_alt"}` | FB-15 | a 201-character `legalName` |
  | FB-5 | `{"lifecycleVersion":99}` | FB-16 | a tab inside a field |
  | FB-6 | `{"defaultCurrency":"USD"}` | FB-17 | `contactEmail`: `"a@b"` |
  | FB-7 | `{"featureFlags":{}}` | FB-18 | `contactEmail`: `"x y@z.co"` |
  | FB-8 | `{"legalName":"x","status":"suspended"}` | FB-19 | `contactPhone`: `"07x"` |
  | FB-9 | `{"__proto__":{"status":"suspended"}}` | FB-20 | `website`: `"javascript:alert(1)"` |
  | FB-10 | `{}` | FB-21 | `website`: `"ftp://x"` |
  | FB-11 | `{"legalName":null}` | | |

### 9.2 Gate item map

| Roadmap gate item / doctrine | Tests |
|---|---|
| 1. Suspended and terminated tenants cannot be used by any later module | G1-28 – G1-36 (HTTP), G1-37, G1-38, G1-77 (non-HTTP: worker delivery, `assertTenantActive`, subscriber policy), G1-74, G1-26, G1-27 for the races that could break it |
| 2. No in-tenant user, including the CEO, can change tenant lifecycle | G1-18, G1-23, G1-24, G1-25, G1-52, G1-53 |
| Doctrine: tenant lifecycle | G1-07, G1-19 – G1-27, G1-29 |
| Doctrine: demo data isolation (Invariant 24) | G1-16, G1-53, G1-54, G1-12 |
| Phase 0 OQ-04 (foreign keys) | G1-02, G1-11, G1-12 |
| Phase 0 OQ-12 (status check) | G1-28 – G1-37 |
| Phase 0 OQ-14 (script identity) | G1-13, G1-22, G1-55 – G1-57 |
| Phase 0 OQ-17 (pagination) | G1-64 – G1-68 |

### 9.3 Build, schema, grants and database rules

| ID | Protects | Attack | Pass when |
|---|---|---|---|
| G1-01 **Command** | Build and typecheck | `npm run check` and `npm run build` on the branch with all jobs merged | Both pass; `dist/` contains no file from `server/tests/` |
| G1-02 **Command** | Phase 0 gate still holds with the foreign keys (job C's acceptance). **Run after C** (and by D1 against the unmerged C branch) | `npm test` (`unit`, `db`, `gate`) with the PA-04 migration applied | Every Phase 0 gate test passes. Run again after job C merges |
| G1-03 | A committed migration is never edited (Phase 0 §3.1.10); migration order | Compare the SHA-256 of Phase 0's migrations 0000–0002 with the values pinned in a support file; list the migration journal | The three are unchanged; the Phase 1 migrations follow in the order of §3.8; none contains a Phase 0 statement |
| G1-04 | §3 exactly; INV-1, INV-6 | Read the catalogue (`pg_catalog`, `information_schema`) for schema `tenant` | Exactly four tables with exactly the columns, types, nullability, defaults, primary keys, unique constraints, foreign keys (`ON DELETE RESTRICT`), `CHECK`s and indexes of §3.2–§3.4; nothing else in the schema except the four functions of §3.6; `plans` is the only table without `company_id` |
| G1-05 | The `CHECK`s hold against direct SQL (owner inserts and updates, so grants cannot mask them) | Insert or update: `status = 'deleted'`; `terminated_at` set on an active company and null on a terminated one; `lifecycle_version = 0`; currency `gbp`, `GBPP`, `GB`; names that are empty, padded, over 200 characters, or contain a tab; plan code `Standard`, `1abc`; email `a@b`, ` a@b.co`; phone `07x`; website `ftp://x`, `https://a b`; `feature_flags = '[]'`; a second subscription for one company; a configuration for no company | Each is refused with 23514, 23505 or 23503 as appropriate |
| G1-06 | Grants (§3.5); INV-9, INV-10; Phase 0 §4.10 narrowest role | On a **fresh** company (§9.1): as `ledger_worker`: `INSERT`, `UPDATE`, `DELETE`, `TRUNCATE` on each tenant table. As `ledger_app`: insert a company naming `status`, `lifecycle_version`, `terminated_at` or `created_at`; update `company_id`, `name`, `is_demo`, `created_at` of a company, `default_currency` of a configuration, `created_at` or `company_id` of a subscription; any write to `plans`; `DELETE`; `TRUNCATE` (privilege error). As `ledger_worker` read `legal_name` and `default_currency` of `configurations`, then `address`, `contact_email`, `contact_phone`, `website` and `updated_by`. As `ledger_app` read every column. Read the table ACLs for `PUBLIC` | All writes by `ledger_worker` are 42501 (its `SELECT` works); every listed `ledger_app` attempt is 42501; `PUBLIC` holds nothing on the schema or its tables. The worker's read of `legal_name`/`default_currency` succeeds and each other column read is 42501; `ledger_app` reads all. The permitted update succeeds when it sets `status`, `lifecycle_version = old + 1` and `status_changed_at` together (a legal transition), and fails otherwise |
| G1-07 | Lifecycle state machine and no-delete rules at the database (INV-2, INV-4, INV-9), against the owner | On a **fresh** company: `terminated → active`, `terminated → suspended`, `active → active`, `suspended → suspended`; a status update with `lifecycle_version` unchanged, `+2`, or `-1`; any update that leaves `status` unchanged; changing `is_demo`, `name`, `company_id`, `created_at`; setting `terminated_at` on a suspension; changing `subscriptions.created_at` or `configurations.default_currency`; updating `configurations` for a `suspended` and for a `terminated` company; updating `subscriptions` for a `terminated` company (and, as a control, for a `suspended` one). Then exactly these statements: `DELETE FROM` each of the four tables; `TRUNCATE tenant.plans`; `TRUNCATE tenant.companies`; `TRUNCATE tenant.plans CASCADE`; `TRUNCATE tenant.companies CASCADE`; `TRUNCATE tenant.subscriptions`; `TRUNCATE tenant.configurations` | Every update is refused with 42501, including the configuration update for a non-active company and the subscription update for a terminated one (the control, a suspended company's subscription, succeeds). The four `DELETE`s are 42501. Plain `TRUNCATE` of `plans` and of `companies` is refused with SQLSTATE `0A000` or `42501` (PostgreSQL reaches the foreign-key check first; either way the statement fails) and the row count is unchanged; the same statements with `CASCADE`, and `TRUNCATE` of `subscriptions` and of `configurations`, are exactly 42501. No row is lost in any case. The four legal transitions, each with `lifecycle_version + 1` and `status_changed_at` set, succeed |
| G1-08 | Functions (Phase 0 §4.10); migration lint | Read `pg_proc` for schema `tenant`; run the Phase 0 migration lint (G0-40) over the real `migrations/` | Exactly the four functions; none `SECURITY DEFINER`; each has `search_path` set and no `EXECUTE` for `PUBLIC`; the lint passes on every Phase 1 migration (no banned word appears, comments included) |
| G1-09 | The runtime-role guarantees survive Phase 1 (Phase 0 §3.5 self-check) | Open the `ledger_app` and `ledger_worker` pools after all tenant migrations | Both pass the self-check; `member_of` is exactly `{ledger_runtime}` for each; `ledger_worker` still cannot update the audit table or the envelope columns of the outbox |
| G1-10 | The seeded plan and plan immutability (INV-12) | Read `tenant.plans`; as `ledger_app` insert, update, delete a plan | `standard` exists, active, with empty flags and limits; the writes are 42501 |

### 9.4 Foreign keys (S1-11, INV-1)

| ID | Protects | Attack | Pass when |
|---|---|---|---|
| G1-11 | PA-04 exactly. **Run after C** | Read the constraints on `audit.audit_entries`, `intelligence.event_outbox`, `intelligence.event_log` | Each has one foreign key on `company_id` to `tenant.companies(company_id)` with `ON DELETE RESTRICT`; no new index appeared on those tables; the append-only triggers and grants of Phase 0 are unchanged (G0-20 … G0-26, G0-45 still pass) |
| G1-12 | A row can never exist for a company that does not exist (INV-1), including from a subscriber. **(a) runs after C**; (b) and (c) need only the tenant tables | (a) `runInTransaction` for a context whose company is not in `tenant.companies`, then `uow.audit.append` and, separately, `uow.events.record`. (b) As `ledger_worker`, insert an `event_log` row for an absent company. (c) As `ledger_app`, insert a subscription and a configuration for an absent company | (a) and (c) fail with 23503 and the unit rolls back, nothing written; (b) is 23503. Company A's rows are untouched |
| G1-76 | The `company_id` convention holds for every table that exists (§3.1.5). Inherited by every later phase. **Run after C** | A catalogue query: every column named `company_id` in any table outside schema `gate_test` (and other than `tenant.companies.company_id` itself) must be covered by a foreign key to `tenant.companies(company_id)` with `ON DELETE RESTRICT` | The three platform tables and the tenant tables pass; a fixture table created by the owner without the key makes the test fail |

### 9.5 Provisioning (S1-02, INV-5, INV-6, INV-3)

| ID | Protects | Attack | Pass when |
|---|---|---|---|
| G1-13 | UC-01 happy path; OQ-14 identity | Run `provision` with name, plan `standard`, currency `GBP` | Exit 0. One `companies` row (`active`, `lifecycle_version = 1`, `is_demo = false`), one configuration (`legal_name` = name, currency), one subscription (`standard`). One audit entry `tenant_provisioned` with `new_value` as §8.1, `actor_role = 'system'`, `actor_id`, `causation_event_id`, `causation_actor_id` all `NULL`, `metadata.platformAdmin` holding `operator`, `hostAccount`, `scriptRunId` (a UUID), `command = 'provision'`, and no other script key at the top level of `metadata`. One outbox event `TenantProvisioned` whose payload is exactly `companyId, isDemo, planCode, lifecycleVersion`. All committed together; the audit `occurred_at` and the outbox `created_at` are equal (same transaction) |
| G1-14 | INV-5, INV-6: a partial tenant never exists | For each of: audit insert, outbox insert, subscription insert, configuration insert — the owner revokes that privilege, then `provision` runs | Exit **4**, with the failing statement inside the transaction (statement log); no company, configuration, subscription, audit entry or outbox row exists afterwards; a control run with the privilege restored provisions normally |
| G1-15 | INV-12: only a real, active plan | `provision --plan` with an unknown code, an inactive plan, `Standard` (wrong case), an empty string | Exit 3 (or 1 for a malformed code). Nothing written |
| G1-16 | INV-4: the demo flag is explicit | `provision` with and without `--demo`; read row, event, audit entry, `show`, `getTenantContext` | Without the flag every one says real; with it every one says demo. There is no other way to set the flag |
| G1-17 | Input handling (§4.1 text rule); no injection | `--name` of `Robert'); DROP TABLE tenant.companies;--`, a name with a newline, a name of 200 and of 201 astral characters, `"  Acme "`, an empty name; `--currency ZZZ`, `gbp`, `GBPP` | The injection string is stored literally and the schema is intact; the newline, 201 characters and empty name are exit 1 with nothing written; 200 astral characters are accepted; `"  Acme "` is stored as `Acme`; the three currencies are exit 1, nothing written; `GBP` is accepted and echoed in the `started` line |
| G1-18 | INV-3, D-15: no HTTP surface | With CEO, PM and worker tokens of company A, send `GET`, `POST`, `PUT`, `PATCH`, `DELETE` to `/api/v1/tenant`, `/api/v1/tenant/`, `/api/v1/tenant/provision`, `/suspend`, `/reactivate`, `/terminate`, `/plan`, `/companies`, `/api/v1/tenants`, `/api/v1/admin/tenants`, `/api/v1/tenant/configuration/status`, and the unsupported methods on `/api/v1/tenant/configuration`. Then read the registry | Every request is `404 NOT_FOUND` with the error envelope and changes nothing. `tenantModule` registers exactly one router at `/tenant` with exactly `GET` and `PATCH` on `/configuration`; no `publicRoutes`, no `portalRouters`, no `subscribers` |

### 9.6 Lifecycle (S1-03, INV-2, INV-3, INV-5, INV-11; gate item 2)

| ID | Protects | Attack | Pass when |
|---|---|---|---|
| G1-19 | INV-2: only four transitions | From each of `active`, `suspended`, `terminated`, run each of suspend, reactivate, terminate through the script | The four legal pairs succeed: each writes exactly one audit entry and one event, raises `lifecycle_version` by 1 and sets `status`. All other pairs (including same-state repeats) exit 3 and leave the company row, the audit table and the outbox exactly as they were |
| G1-20 | INV-2, INV-9: termination is final and deletes nothing | Terminate a company; then try suspend, reactivate, terminate, `change-plan`, a CEO `PATCH`; count the company's rows in all tenant tables before and after; then, as owner and as `ledger_app`, update the terminated company's configuration and subscription rows directly | All refused; the row counts are unchanged; `show` still works; the direct updates are 42501 (the retention triggers of §3.6) |
| G1-21 | INV-5: audit and event are inseparable from the change | For suspend, reactivate, terminate and change-plan: the owner revokes `INSERT` on the audit table, and separately on the outbox, then the command runs | Exit **4**, failing inside the transaction (statement log). `status`, `lifecycle_version` and the plan are unchanged; no audit entry, no event; a control run with the privilege restored succeeds |
| G1-22 | §8, INV-13: content | Run the four lifecycle commands with a marker in `--reason` | Each audit entry has the §8.1 fields: source `Company`, `previous_value`/`new_value` with status and `lifecycleVersion`, `metadata.platformAdmin.reason` and the other operator keys, `actor_role = 'system'`, no causation. The event payload has exactly the §7.1 keys. The marker appears in `metadata.platformAdmin` and **nowhere else**: not in a payload, stdout or stderr (logs are checked suite-wide by G1-70) |
| G1-23 | INV-11: only the platform administrator | Call UC-01 … UC-05 directly with: a CEO user context, a PM, a worker, a portal user, a system context with component `identity.createInitialCeo`, one with `platform.tenantStatus`, a subscriber context built by the worker (component = the subscriber's name, causation set), a context copied with `{ ...ctx }`, and a system context with component `tenant-cli` and no causation built by `createSystemContext` directly (right string, **no brand**). A separate unit test with fakes calls `assertPlatformAdministrator` with a fake context whose component is `tenant-cli` and whose causation is non-null (a real one cannot be built: only a subscriber context carries causation, and it never carries that component) | Every real context is refused with `NotAuthorisedError` (or `ForgedContextError` for the copy) before any SQL; nothing is written; the unit is not left open. The unbranded `tenant-cli` context is refused. The fake with causation is refused too. Each refusal logs exactly one WARN line naming the component, the command and the `companyId`, and no value. Only a context from `runtime.createContext` is accepted |
| G1-24 | INV-11 and the module and script boundaries: **one static-scanner test with a fixture table** (replaces the former G1-69 and G1-55(d)) | Run the Phase 0 scanner (G0-40) extended with the rules below over the real tree, then over each fixture file of the table | The real tree passes. Each fixture is flagged by the rule it breaks, and only by that rule.<br><br>**Real-tree rules.** The literal `tenant-cli` (any quote style) appears only in `server/scripts/tenant.ts`, `server/modules/tenant/**` and test files. No file under `server/scripts/**` calls `createSystemContext`. Only `server/scripts/tenant.ts` imports `server/modules/tenant/admin.ts`; it calls `loadCliEnvironment()` and contains no `process.env`. Scripts import only Node built-ins, `server/platform/index.ts`, `server/platform/system/index.ts`, module `index.ts` files and that `admin.ts`, never `server/modules/registry.ts`, no driver, and contain no SQL. The tenant module imports no `pg`, names no platform table, reads no environment; its `index.ts` re-exports neither `tenant-status.impl` nor `admin.ts`; the port implementation is imported only by `index.ts`, only to `bind` it; `domain/` imports nothing outside `domain/`.<br><br>**Fixtures.** SC-1 `tenant-cli` in another module; SC-2 `tenant-cli` in another script; SC-3 a script calling `createSystemContext`; SC-4 a module importing `admin.ts`; SC-5 a second script importing `admin.ts`; SC-6 a script containing `process.env`; SC-7 a script importing `pg`, `drizzle-orm` or `registry.ts`; SC-8 a script containing SQL; SC-9 another module importing `server/modules/tenant/infrastructure/…`; SC-10 the tenant module importing `pg`, naming `event_outbox` or reading the environment; SC-11 `index.ts` re-exporting `tenant-status.impl` or `admin.ts`; SC-12 a tenant domain file importing the platform. A subscriber named `tenant-cli` is rejected at start-up (the name does not match `<module>.<purpose>`), and a subscriber's own handler calling `suspendTenant` is refused with nothing written |
| G1-25 | Gate item 2 over HTTP: the CEO cannot change lifecycle, plan or demo flag | With the CEO token of A: `PATCH /api/v1/tenant/configuration` with FB-1 … FB-9 (table FB, §9.1); add headers `X-Company-Id: <B>` and `Idempotency-Key` | Every body is `400 VALIDATION_ERROR` (FB-9 also names no value); the `details` object names only allowlisted field paths, otherwise only `body`, has at most 10 entries of at most 120 characters, and contains no Zod message; company A's and B's rows, the audit table and the outbox are unchanged; the headers have no effect |
| G1-26 | INV-2: concurrent lifecycle commands | With a held lock on company A's row, start two commands and release: (a) suspend × suspend; (b) suspend × terminate; (c) reactivate × terminate on a suspended company; (d) terminate × terminate. Repeat each pair 20 times with a seeded PRNG choosing the start order and delays (seed printed on failure) | (a) and (d): exactly one succeeds, the other is refused, one event, one audit entry. (b): either both succeed (suspend, then terminate) or terminate succeeds and suspend is refused — never terminated-then-suspended. (c): either order ends `terminated`. In every run `lifecycle_version` rises by exactly 1 per committed transition with no gap or repeat, the number of audit entries and of events equals the number of successes, and the final state is a legal one. (e) The owner holds the company row lock for 7 s and a script `suspend` is started: it exits **5** between 4.5 s and 6.5 s after it started, writes nothing, and succeeds when re-run after the lock is released |
| G1-27 | INV-2 ordering: version, not timestamp, orders events | Company A is `suspended`. Command **L** (suspend) opens its unit first and then waits on a latch (test wrapper) before calling the use case; the test releases the latch only after R has committed. Command **R** (reactivate) starts later, takes the lock, and commits first. L then locks and commits. Read the two events and audit entries, and feed them to the probe subscriber in reverse order | `lifecycleVersion` is *n*+1 for R and *n*+2 for L, matching commit order and audit `sequence_no`; `status_changed_at` is later for L than for R (it is written after the lock) even though L's transaction began earlier; the probe subscriber, given the events reversed, ends in the state of version *n*+2 (`suspended`) and ignores the stale one |

### 9.7 Tenant-active enforcement (gate item 1, INV-7)

| ID | Protects | Attack | Pass when |
|---|---|---|---|
| G1-28 | Gate item 1: a suspended tenant cannot be used | Mint CEO, PM and worker tokens for A **before** suspension (replay). Suspend A with the script, `TENANT_STATUS_CACHE_MS = 0`. Call every probe route (`/__probe`, `/__alpha`, `/__beta`) and `/api/v1/tenant/configuration` with each token | Every call is `403 TENANT_SUSPENDED` with the fixed message; no probe handler ran (counter 0); no database write occurred. Company B's tokens still get `200` |
| G1-29 | Gate item 1: a terminated tenant cannot be used, for ever | As G1-28 after `terminate`, and with a token minted after the termination | `403 TENANT_TERMINATED` for every token and route; no reactivation is possible (G1-20) |
| G1-30 | Reactivation restores service | Suspend, call (403), reactivate, then call with the same old token, with `TENANT_STATUS_CACHE_MS = 0` (or polling with a 2 s deadline at a small lifetime) | `200` again; no other tenant was affected |
| G1-31 | Same rule on `/portal/v1` (PA-02) | A platform-signed portal token for a suspended and for a terminated tenant on a probe portal route; a platform token on a portal route; a portal token on `/api/v1` | 403 `TENANT_SUSPENDED` / `TENANT_TERMINATED`; the cross-type cases are 401 as in Phase 0; handler counter 0 |
| G1-32 | INV-7: the staleness bound | (a) **Deterministic:** unit test of the status cache with an injected clock: a lookup at *t*, a status change, calls at *t* + lifetime − 1 and *t* + lifetime + 1, at lifetimes `0` and 300. (b) **Smoke, real clock:** `TENANT_STATUS_CACHE_MS = 0`: suspend, then call at once; then `= 300`: warm the cache with a successful call, suspend, call repeatedly. (c) Reactivate, mirrored | (a) a call before expiry may use the cached value; every call at or after expiry is refused (suspend) or served (reactivate); at `0` the very next call is refused. (b) the first call after the commit is refused at `0`; at 300, **no call later than the commit's `clock_timestamp()` + 300 ms + 150 ms passes**, and no probe handler runs after that point. (c) mirrored. The test states the bound it proves |
| G1-33 | INV-7, INV-8: no configuration write commits after a committed suspension | Order 1: hold the configuration row's lock; start a CEO `PATCH` (it takes the company share-lock and waits), then the script's `suspend` (it queues behind the share-lock); release. Order 2: hold the company row's lock, start `suspend` first and then the `PATCH`; release. Add 20 seeded random interleavings (seed printed on failure), with `TENANT_STATUS_CACHE_MS = 5000` and a warm cache so the middleware lets the `PATCH` through | Order 1: the `PATCH` commits, then the suspension commits. Order 2: the suspension commits, and the `PATCH` is refused (`403 TENANT_SUSPENDED` from the use case's own re-check) with no configuration change. In every run no `tenant_configuration_updated` audit entry has a `sequence_no` higher than the company's `tenant_suspended` entry |
| G1-34 | Fail closed (PA-02) | (a) The faulty port (§9.1) is switched to throw. (b) The owner revokes `SELECT` on `tenant.companies` from `ledger_runtime`. (c) The pool is unavailable. (d) **Deadline:** the owner takes `ACCESS EXCLUSIVE` on `tenant.companies`, so the lookup blocks. Call a probe route and `/api/v1/tenant/configuration` with a valid token in each case | `500 INTERNAL_ERROR` with the generic message and no internal detail; handler counter 0; the failure is not cached: the first call after restoring the cause returns `200`. In (d) the response arrives after the 2 s statement timeout, between 1.5 s and 4 s, and the lookup holds its connection no longer than that |
| G1-35 | A validly signed token for no company | Sign a platform token for a random UUID that is not in `tenant.companies` | `401 UNAUTHENTICATED`; handler counter 0; after `seedCompany` for that id and one cache lifetime the same token works |
| G1-36 | PA-02 cache and PA-05 configuration | (a) 50 concurrent first requests for one company, at a lifetime of 5 000 and again at `0`. (b) Suspend A, then call with B's token. (c) Unit test of the cache with more than its maximum entries. (d) `TENANT_STATUS_CACHE_MS` set to `abc`, `-1`, `60001`, `1.5`, empty, absent; and present in the worker and script environments | (a) at 5 000 the port is called once; at `0` it is called 50 times (nothing is shared or cached). (b) B is unaffected. (c) the cache never exceeds 10 000 entries and evicts the least recently used (an entry read recently survives while an older untouched one goes). (d) The invalid values are a `ConfigError` naming the variable, never the value; absent means 5 000; empty counts as absent; the worker and script loaders ignore the variable |
| G1-37 | The worker never blocks delivery for an inactive tenant | Suspend A; commit a probe event for A; the `TenantSuspended` event is pending | The probe subscriber receives `TenantSuspended` (with `lifecycleVersion`) and the probe event; both outbox rows become `delivered` |
| G1-38 | The non-HTTP half of gate item 1 (UC-11) | A probe use case calls `assertTenantActive(uow)` for A while `active`, `suspended`, `terminated`, and for a context whose company has no row | Active passes; suspended and terminated throw `TenantNotActiveError` carrying the status; the missing company throws `TenantNotFoundError`; the probe's own write does not happen when it throws |
| G1-39 | `getTenantContext` cannot read another tenant (INV-1) | In a unit for A, call `getTenantContext(uow)`, `getPlan(uow)`, and `getTenantContext(uow, <B's id> as any)`; companies A and B have different names and plans | Always A's data; the extra argument is ignored; the result has `status`, `lifecycleVersion`, `isDemo`, `plan`, `configuration.legalName`, `configuration.defaultCurrency`, `companyId` and nothing more |
| G1-74 | Lock mode: a lifecycle command does not block child writes | (a) Inside `runInTransactionAs`, run `suspend` and then, before the unit returns, wait on a latch (the unit is open and holds the row lock the use case took). From another connection, with `statement_timeout = 2000`, insert an audit entry for the same company, and a child row (`gate_test.probe_state`). Release the latch. (b) From another connection hold `SELECT … FOR KEY SHARE` on the company row, and run `suspend`, `change-plan` and a CEO `PATCH` with the same timeout | (a) both inserts complete within the timeout while the lifecycle unit is open; an implementation that used `FOR UPDATE` blocks them and fails. (b) the commands complete; none waits on the `KEY SHARE` lock |
| G1-78 | UC-06 lock timeout maps to `503 SERVICE_BUSY` | The owner holds the `configurations` row lock for 7 s; the CEO sends a `PATCH` (and a unit test sends a `55P03` through the error handler) | `503 SERVICE_BUSY` with the fixed message between 4.5 s and 6.5 s after the request, never a 500; nothing written; a repeat after the lock is released succeeds |

### 9.8 Configuration (S1-04, INV-8, INV-10)

| ID | Protects | Attack | Pass when |
|---|---|---|---|
| G1-40 | UC-07 | CEO of A calls `GET /api/v1/tenant/configuration` | `200 { data: … }` with exactly the §6.2 fields: A's values, `isDemo`, `defaultCurrency`, `updatedAt`; no status, plan or other tenant's data; headers as Phase 0 §6.2 |
| G1-41 | UC-06 happy path; INV-5, INV-13 | CEO of A patches `address` and `website` | `200` with the new values. One audit entry `tenant_configuration_updated`: `previous_value` and `new_value` hold only those two fields with old and new values, `actor_role = 'ceo'`, `actor_id` = the CEO, `metadata.changedFields`. One event whose payload is exactly `companyId` and `changedFields`. `updated_by` is the CEO's id; `updated_at` advanced. The marker values appear in the audit entry and nowhere in the event or an error body |
| G1-42 | INV-8: only the CEO | PM, worker and portal tokens of A on `GET` and `PATCH`; the use cases called directly with PM, worker, portal-user, system and causation contexts | PM and worker: `403 FORBIDDEN`; portal token: `401`; direct calls: `NotAuthorisedError`; nothing written; `updated_by` is never set from a non-user actor |
| G1-43 | Role before validation | PM and worker send `PATCH` with FB-3, FB-10, FB-14 and FB-15; the CEO sends the same bodies | PM and worker: `403 FORBIDDEN` for every body; CEO: `400 VALIDATION_ERROR`. No validation detail reaches a role that may not use the route |
| G1-44 | INV-1, INV-8: wrong tenant | CEO of A tries to read or change B: `companyId` in the body, in the query string, as a path suffix, as `X-Company-Id`; replay B's `PATCH` body; run the repository read with A's context while B's row has the same legal name | `GET` returns A's data; bodies naming a company are `400`; headers, query and path have no effect; B's rows, audit entries and events are unchanged; no response, log or error contains B's id or values |
| G1-45 | Strict input (§6.2); no echo; no regex blow-up | `PATCH` as the CEO with FB-10 … FB-21, each with marker values where the body carries text; and, for each field, a **1 MB hostile value** (for example `"a".repeat(1e6) + "@"`, `"@a.".repeat(3e5)`, 1 MB of spaces, 1 MB of digits and `+`, `"http://" + "a".repeat(1e6)`) | All `400 VALIDATION_ERROR`; no database write; no marker in a response body; no 500. Each hostile request is answered within **1 s** (the length check refuses it before any pattern runs). Response `details` follow §6.3 |
| G1-46 | The text rule and the no-op | (a) `PATCH` `legalName: "  Acme "` when the stored value is `Acme`. (b) The same with a changed value padded. (c) `address: null` when it is already `NULL`. (d) `address: null` when it has a value | (a) and (c): `200`, current data, **zero writes** — the row, `updated_at`, audit count and outbox count are unchanged. (b) stored trimmed. (d) cleared, audited with `new_value = {"address": null}` |
| G1-47 | No accepted input can fail a `CHECK` | Generate edge inputs for each text field: padding with spaces, tabs, NBSP and newlines at the ends and inside; lengths 0, 1, max, max+1; astral characters at the boundary; the email, phone and URL pattern boundaries; including U+0001, U+001F, U+007F, U+0085 (NEL), U+009F, U+2028 and U+2029 inside and at the ends of each field; send them through `PATCH` and through `provision --name` | Every input is either accepted and stored trimmed, with the row satisfying every `CHECK`, or refused with `400` (or exit 1). No input produces a `23514`, a `500` or a stack trace |
| G1-48 | UC-06 concurrency (INV-5) | Two `PATCH`es at once: different fields (×20); the same field (×20), with a seeded PRNG for the start order (seed printed on failure) | Different fields: both apply; both audit entries' `previous_value` match what was stored when each ran. Same field: the second entry's `previous_value` equals the first's `new_value`; no audit entry quotes a value that was never stored |
| G1-49 | INV-5 for configuration | The owner revokes `INSERT` on the audit table, then on the outbox; the CEO patches | `500`, failing inside the transaction (statement log); the configuration row, `updated_at` and `updated_by` are unchanged; a control `PATCH` with the privilege restored succeeds |
| G1-50 | Defence in depth (INV-8) | Call UC-06 and UC-07 directly for a `suspended` and a `terminated` company, bypassing the middleware | `TenantNotActiveError`; nothing written |
| G1-51 | INV-10: currency is fixed | `PATCH defaultCurrency`; `UPDATE` as `ledger_app`; `UPDATE` as owner | `400`; 42501; 42501 |

### 9.9 Plan change (S1-05 `TenantPlanChanged`)

| ID | Protects | Attack | Pass when |
|---|---|---|---|
| G1-52 | UC-05; INV-3, INV-12 | `change-plan` to `gate_plan_alt` on an active and on a suspended company; to the current plan; to an unknown and an inactive plan; on a terminated company; with the audit privilege revoked; as the CEO (`PATCH` body `planCode`; direct use-case call) | Active and suspended succeed: one audit entry `tenant_plan_changed` (`previous_value`/`new_value` hold plan codes, `metadata.platformAdmin.reason`), one event with both codes, the subscription's `updated_at` advanced. The others are refused (exit 3), the CEO attempts with `400`/`NotAuthorisedError`, and nothing is written in any refused or failed case |

### 9.10 Demo data isolation (Invariant 24, INV-4)

| ID | Protects | Attack | Pass when |
|---|---|---|---|
| G1-53 | A demo company can never become real, or the reverse | Flip `is_demo` on D and on A: as `ledger_app`, as owner, through `PATCH`, and with a plan change or lifecycle command that also tries to pass a flag | 42501 for the SQL attempts, `400` for the body, no effect from the commands; both rows keep their value |
| G1-54 | Invariant 24 at the lowest level Phase 1 owns | Companies A (real) and D (demo), each with a configuration and a probe row. CEO tokens of each call `GET` and `PATCH`; run the repository read with A's context against D's ids; run `getTenantContext` in each; list the audit entries and events each produced | A's CEO sees only A and `isDemo = false`; D's only D and `isDemo = true`; the repository read with A's context returns nothing of D's; no audit entry or event carries the other company's id |

### 9.11 The script (S1-07, Phase 0 OQ-14)

| ID | Protects | Attack | Pass when |
|---|---|---|---|
| G1-55 | The script connects as `ledger_app` and never as the owner (Phase 0 §3.5, §4.10) | (a) Environment holding only `LEDGER_MIGRATION_DATABASE_URL`, `DATABASE_URL` and `PG*` (all owner), no `LEDGER_APP_DATABASE_URL`. (b) `LEDGER_APP_DATABASE_URL` set to the worker role's URL, then to the owner's. (c) A correct environment, run as a real child process. (d) *(the script scan is part of G1-24)*. (e) `LEDGER_APP_DATABASE_URL` naming a non-local host without `sslmode`, with `sslmode=prefer`, and with `sslmode=require`; and `localhost`, `127.0.0.1`, `[::1]`, `helium` without it, under `NODE_ENV` of `development`, `test` and `production` | (a) Exit 2, naming the variable, no connection attempted, nothing written. (b) Exit 2 (self-check), nothing written. (c) The start log line (on stderr) shows `dbRole: "ledger_app"`; stdout holds exactly one JSON line; no URL or password in any output. (e) A non-local host without `verify-full` or `require` is exit 2 in every `NODE_ENV`, nothing written; with `require` it is accepted; the four local hosts are accepted without it. |
| G1-56 | Operator identity (OQ-14, §4.4) | `--operator` missing, empty, 101 characters, containing a newline or `<`; a valid name | Invalid: exit 1, nothing written. Valid: it appears in `metadata.platformAdmin.operator`, with `hostAccount` equal to the operating-system user and `scriptRunId` a fresh UUID each run. A second operator name on the same account yields an entry with the same `hostAccount` (the test documents that `hostAccount` does not distinguish operators) |
| G1-57 | Reasons and the termination confirmation | `--reason` missing, empty, 501 characters, multi-line; `terminate` with `--confirm` missing, a different UUID, the right UUID with different case, and the correct id | All invalid forms exit 1 or 3 with nothing written; only the exact id proceeds |
| G1-58 | Output hygiene (INV-13) | Run every command with marker values; make `provision` fail after the id line (revoke the audit privilege) | stdout holds exactly one JSON line; stdout and stderr hold only the fixed JSON fields (`outcome`, `command`, `companyId`, `currency`, `status`, `code`, `message`, `scriptRunId`, and for `show` the UC-12 fields, which include no name); no marker, no name, no URL. `provision` printed `started` with the id **before** the transaction, and `show --company <id>` reports not found |
| G1-59 | Exit codes, repeat safety, `show` is read-only | Provoke each exit code 0–5 (success; unknown option; unreachable database; invalid transition; forced unexpected error; a held row lock for more than 5 s, observed between 4.5 s and 6.5 s); repeat a successful `suspend`; run `show` and count audit and outbox rows before and after | The codes match §5.4; the repeat exits 3 and writes nothing; `show` writes nothing and prints exactly the UC-12 fields |
| G1-73 | The script has a catalogue, and only its own | (a) Open the script runtime with `[tenantModule]`; inside `runInTransactionAs('tenant', …)` `append` a registered tenant type (accepted) and `gate_test_probe` (unregistered for this runtime). (b) Open it with `[]` and `append` `tenant_provisioned`. (c) Open it with two registrations claiming one type | (a) the tenant type is accepted, the unregistered type is refused with `AuditEntryTypeError` and poisons the unit; (b) refused; (c) start-up error naming the type. The script file does not import `server/modules/registry.ts` |
| G1-75 | The real CLI removes secrets it does not need; `run` does not | Spawn `tsx server/scripts/tenant.ts show --company <id>` as a child process with `DATABASE_URL`, `PGPASSWORD`, `PGHOST`, `LEDGER_MIGRATION_DATABASE_URL`, `JWT_PRIVATE_KEY`, `JWT_PUBLIC_KEY`, `PORTAL_JWT_SECRET`, `LEDGER_WORKER_DATABASE_URL`, an unrelated `SOME_OTHER_SECRET`, `PATH` and a correct `LEDGER_APP_DATABASE_URL` in its environment, and a test-owned preload module that records at process exit which variables are set. In-process, call `run` with an explicit environment holding the same variables | The child reports every variable absent except the allowlist of §5.4 (`LEDGER_APP_DATABASE_URL`, `NODE_ENV`, `LOG_LEVEL`, `PATH` and the other system variables); the JWT keys, `PORTAL_JWT_SECRET`, `LEDGER_WORKER_*`, the owner variables and the unrelated secret are gone; `show` succeeds as `ledger_app`. The in-process call leaves the harness's own `process.env` untouched |
| G1-77 | PA-06: tenant status policy for subscribers (default-deny; review round 2) | (a) Register probe subscribers for a probe event: one `active_only`, one `any`. Suspend company X (fresh `seedCompany`), then commit the probe event for X. Reactivate, then commit it again. (b) The same with `terminated`. (c) A registration without `tenantStatusPolicy`; one with `'active'`. (d) Make the status read fail (revoke `SELECT` on `tenant.companies`) while an `active_only` event is pending. (e) Type-check a registration without the field. (f) Start the worker with the `platform.tenantStatus` binding removed | (a) While suspended the `any` probe is called and the `active_only` probe is **not**; the outbox row becomes `delivered` with both names in `delivered_subscribers`; one INFO line names the event type, the subscriber, the `companyId` and the status; no retry, no dead letter, and nothing is replayed after reactivation. After reactivation both are called. (b) Same for `terminated`. (c) Start-up fails naming the subscriber. (d) The delivery is a failed attempt and is retried, never skipped. (e) The registration does not compile. (f) The worker refuses to start with one `FATAL` line naming the port |

### 9.12 Catalogue, events and audit (S1-05, §7, §8)

| ID | Protects | Attack | Pass when |
|---|---|---|---|
| G1-60 | Module ownership of types (Phase 0 R3-10); start-up checks | Read the registration; from a probe module's unit, `append` `tenant_suspended` and `record` `TenantSuspended`; register a second module that claims `/tenant`; remove the tenant port binding, in the API and in the worker | The registration lists exactly the six audit types and six event types, owner `tenant`, `jobRequired: false`. The probe writes fail with `AuditEntryTypeError` / `EventTypeError` and poison their unit. The duplicate namespace fails at start-up naming the cause; the missing port binding makes **both** the API and the worker refuse to start with one `FATAL` line naming the port |
| G1-61 | Event payloads (INV-13, Phase 0 OQ-07) | Produce each of the six events with marker inputs; read outbox and event-log rows | Each payload has exactly the keys of §7.1; every value is an identifier, a status or plan code, a boolean (`isDemo`), an array of field names (`changedFields`), an integer or an ISO timestamp; no marker; `job_id` is `NULL`; `actor_id` is `NULL` for the script and the CEO's id for `TenantConfigurationUpdated` |
| G1-62 | Delivery and replay | Deliver all six events to the probe subscriber; redeliver one by stale-lock recovery; deliver a lifecycle pair in reverse order | Each event handled once by `eventId`; the redelivery changes nothing; the version-ordered subscriber ends in the latest state |
| G1-63 | Audit and event are written together, once | For every successful use case, count audit entries and outbox events for the company | Exactly one of each per success, with equal transaction time; none for a refused or no-change request |

### 9.13 The pagination helper (S1-12, Phase 0 OQ-17)

PA-01 has no production consumer in Phase 1, so these are unit-level gate tests, plus G1-68 through the test-only probe list route. A repository-level cursor test for each real list endpoint is a Phase 2 and later obligation.

| ID | Protects | Attack | Pass when |
|---|---|---|---|
| G1-64 | `limit` rules | `limit` absent, `1`, `50`, `200`; `0`, `201`, `-1`, `1.5`, `abc`, `50x`, empty, `1e2`, ` 5`, repeated `limit=1&limit=2` | Absent is 50; 1, 50, 200 pass; every other value is `400 VALIDATION_ERROR` with details on `limit` — rejected, never clamped |
| G1-65 | Cursor decoding is safe | `cursor` of: random text; valid base64 of non-JSON; JSON array; nested object; `{"__proto__":{}}`, `constructor`, `prototype` keys; 9 keys; unknown key for the endpoint's strict schema; wrong value types; 1 025 characters; a very large valid base64 body | Every one is `400` with details on `cursor`, never a 500, and the response and logs do not contain the cursor |
| G1-66 | Round trip and shape | Encode and decode keys with Unicode, numbers, booleans and nulls; accept standard base64 with padding and base64url without; page of exactly `limit` rows, `limit + 1` rows, zero rows | Identity round trip; the encoded form contains no `+`, `/` or `=`; the response is exactly `{ data, pagination: { nextCursor, hasMore, limit } }`; `hasMore` is false at exactly `limit` rows and true at `limit + 1`; `nextCursor` is `null` when `hasMore` is false |
| G1-67 | Stable paging | Insert rows between page fetches, including rows with equal `created_at` | No row repeated or skipped by the `(created_at, id)` order |
| G1-68 | A cursor is not a credential (INV-1) | Through the probe list route: tenant A uses a cursor taken from B's page; a cursor hand-built from a key of B's rows; a cursor containing a `companyId` key | A receives only A's rows (those after the key, in A's order); the `companyId` cursor is `400`; nothing of B's is returned in any case |

### 9.14 Boundaries, logging and the frontend

G1-69 is retired: its rules are part of G1-24. The number is not reused.

| ID | Protects | Attack | Pass when |
|---|---|---|---|
| G1-70 | No sensitive data in logs (Phase 0 doctrine): one suite-wide check | A log-capture hook installed once in the gate project's setup records every log line at `debug` for every gate test, including the script's stderr lines. The tests place markers in every free-text input and reason | The hook fails any gate test whose captured lines contain a marker, a company name, address or contact detail, a token or a database URL. The tenant-status refusal is a request line with the route template and company id only; the only lines that name an administrator command are the WARN lines for refused commands (component, command, `companyId`). A deliberately leaking fixture test proves the hook can fail |
| G1-71 | Obligation: runtime roles and bundles | `dist/index.cjs` and `dist/worker.cjs` | They contain no string from `server/tests/` and no reference to `LEDGER_MIGRATION_DATABASE_URL`; the worker bundle does not read `TENANT_STATUS_CACHE_MS` |
| G1-72 **Command** | Frontend untouched (D-13) | `git diff --name-only backend...HEAD` for each job; Phase 0's G0-02 (Playwright in frontend-only mode) at the phase close | No file under `client/`, `tests/` or the root `.replit` changes (the `package.json` `tenant` script and `drizzle.config.ts` are the only root changes; PA-01 … PA-06 change only `server/platform/**` and the test harness); the Playwright suite passes as before |

### 9.15 Maps

**Invariants.**

| Invariant | Tests |
|---|---|
| INV-1 | G1-04, G1-11, G1-12, G1-39, G1-44, G1-68, G1-76 |
| INV-2 | G1-07, G1-19, G1-20, G1-26, G1-27 |
| INV-3 | G1-18, G1-23, G1-25, G1-52 |
| INV-4 | G1-07, G1-16, G1-53, G1-54 |
| INV-5 | G1-13, G1-14, G1-21, G1-41, G1-48, G1-49, G1-63 |
| INV-6 | G1-04, G1-13, G1-14 |
| INV-7 | G1-28 – G1-37 |
| INV-8 | G1-33, G1-42, G1-43, G1-44, G1-50 |
| INV-9 | G1-06, G1-07, G1-20 |
| INV-10 | G1-05, G1-51 |
| INV-11 | G1-23, G1-24, G1-73 |
| INV-12 | G1-04, G1-10, G1-15, G1-52 |
| INV-13 | G1-22, G1-41, G1-58, G1-61, G1-70 |

**Phase 0 §4.10 obligations (§1.4).**

| Obligation | Tests |
|---|---|
| Narrowest role; no financial/approval grants to `ledger_runtime` or `ledger_worker` | G1-06, G1-09 |
| Runtime code and scripts never use the owner URL | G1-55, G1-24, G1-75 |
| `tenantValues` / `tenantWhere` on every tenant table access | G1-44, G1-54, G1-24 |
| No `*_by` from causation | G1-42, G1-23 |
| Catalogues with `jobRequired`; one owner per type | G1-60 |
| Each action's audit entry is gate-tested | G1-13, G1-19, G1-41, G1-52, G1-63 |
| Function privileges; no `SECURITY DEFINER` | G1-08 |
| Event payloads carry no amounts or free text | G1-22, G1-61 |
| Path parameters are UUIDs; no personal data in paths | G1-18 (the routes have no parameters), G1-70 |
| No backend secret in `client/.env*` | G1-72 (no client file changes) |
| Phase 1: operator identity in `metadata`; connects as `ledger_app` | G1-13, G1-55, G1-56 |

**The PM's mandatory list (review of v0.2).** Suspend racing `PATCH` in both orders: G1-33. Suspend racing terminate, one winner and `lifecycle_version` +1 each time: G1-26. Reactivate waiting on the lock: G1-27. PA-02 staleness at `TENANT_STATUS_CACHE_MS = 0` and a small value: G1-32. Fail-closed 500: G1-34. Forged cursor naming another company's keys: G1-68 (and, for each real list endpoint, a repository test in Phase 2 and later). Padded no-op `PATCH`: G1-46. PM or worker with an invalid body gets 403: G1-43.

### 9.16 Would the gate catch a broken implementation?

| A wrong implementation | Caught by |
|---|---|
| Locks the company row with `FOR UPDATE` | G1-74 (a child insert blocks past `statement_timeout`) |
| A Drizzle full-column insert into a tenant table | B3's `ledger_app` db test, G1-13 (42501 on the first provisioning) |
| Lets the script use unregistered audit types, or loads the registry | G1-73 |
| Scrubs (or fails to scrub) the owner variables in the wrong place | G1-75 |
| Trusts `[[:cntrl:]]` or a locale-dependent class | G1-47 (U+0085, U+2028, U+2029) |
| Orders events by `statusChangedAt` or writes it with `now()` | G1-27 |
| Skips the tenant check on `/portal/v1`, or lets requests through when the lookup fails | G1-31, G1-34 |
| Caches a failed lookup or a stale `suspended` for longer than the lifetime | G1-32, G1-34, G1-36 |
| Checks `actor.kind === 'system'` only | G1-23, G1-24 |
| Accepts `status`, `isDemo` or `companyId` in the `PATCH` body | G1-25 |
| Writes the configuration without re-checking status under the lock | G1-33 |
| Records a changed-fields audit entry without values, or puts values in the event | G1-41, G1-61 |
| Trims in Zod but not in the comparison, or measures length in UTF-16 units | G1-46, G1-47 |
| Falls back to the owner or `DATABASE_URL` in the script | G1-55 |
| Adds the foreign keys by editing a Phase 0 migration | G1-03 |
| Clamps `limit` instead of rejecting it, or trusts a cursor's content | G1-64, G1-68 |
| Gives `ledger_worker` a tenant write privilege, or the worker's read of contact details | G1-06 |
| Lets an `active_only` subscriber run for a suspended tenant, or skips it when the status read fails | G1-77 |
| Puts the operator's identity at the top level of audit `metadata` | G1-13, G1-22 |
| Lets the script run with the JWT keys or worker URLs in its process | G1-75 |
| Runs a regex on unbounded input | G1-45 (1 MB hostile values within 1 s) |

---

## 10. PROTOTYPE DIFFERENCES

The roadmap names no prototype engine for Phase 1. The only prototype behaviour that touches this phase is the company settings in `client/src/lib/mockData.ts` and `client/src/pages/settings.tsx`. The domain documents and the architecture win wherever they differ (roster, Precedence).

### 10.1 Prototype behaviour

| Prototype | Build | Rule |
|---|---|---|
| `CompanySettings` holds legal name, registration number, VAT ID, email, phone, website, bank name, account name, account number, sort code, address, branding and an accounting-integration record including `accessToken` and `realmId`, all editable on one page by anyone who can open it | Phase 1 stores legal name, address, contact email, phone, website and the fixed currency. Registration number and VAT ID, bank details and branding wait for the commercial documents domain (D-07) and Phase 6a; the accounting-integration record, **including its tokens**, belongs to `accounting` in Phase 6 and is never stored in `tenant` | Architecture lists only name, address, contact details and currency; secrets never live in tenant configuration (OQ1-03) |
| Settings are per `companyId` in one client store; `REAL_COMPANY_ID = "comp-1"`, `DEMO_COMPANY_ID = "comp-demo"` are string constants, and `updateSettings` picks the real or demo copy by the current company | Companies are rows with UUID keys; the demo flag is `is_demo`; the company comes from the token, never from a client-side switch | Invariant 24; BACKEND_MULTITENANCY_ARCHITECTURE.md, Layer 1. Track F maps the constants to real company ids |
| `updateSettings` logs `Company settings updated (<field names>)` and never the values ("Legal and bank details drive invoices") | The audit entry records field names **and** previous and new values for the five configuration fields; the event and the logs record names only | Audit Doctrine (previous and new value). The prototype's caution about values applies to bank details, which Phase 1 does not store (§8.3) |
| `isEmail` accepts `x@y.zz` with a top-level label of two or more characters and trims before testing; the settings page also validates UK sort code and account number | The email value object uses the same two-character rule and trims first (§4.1 text rule); sort code and account number are not Phase 1 fields | Consistency with the screen the CEO already uses |
| The page validates only on the client; no role check; anyone can save | The server validates (Zod and domain), requires the `ceo` role, answers `403` to others, re-checks the tenant is active, and audits | RBAC rules; D-15 |
| Tenant lifecycle, plans and subscriptions do not exist | New in the build | Roadmap Phase 1 |

### 10.2 Deliberate differences from the architecture documents

| Difference | Document | Reason |
|---|---|---|
| `getTenantContext(uow)`, `getPlan(uow)` take the unit of work, not a `companyId`; the result is `TenantInfo`, not `TenantContext`; lifecycle functions take no `adminId` | BACKEND_SERVICE_ARCHITECTURE.md, Module 1 | Phase 0 requires an execution context on every use case and modules cannot mint a `CompanyId`; `TenantContext` is the platform's name; the administrator is the context's system actor (§4.5) |
| `TenantInfo.configuration` holds only `legalName` and `defaultCurrency` | same | Minimal surface; extend by specification change |
| `companies.lifecycle_version` | BACKEND_DATA_ARCHITECTURE.md (no such field) | Events must be orderable: `now()` is the transaction start, not the lock time (§3.3, §7.3) |
| Audit entry types `tenant_*` | DOMAIN_MODEL_SUMMARY.md lists none | The roadmap requires audit entries; names mirror the event names (OQ1-05) |
| Error codes `TENANT_SUSPENDED`, `TENANT_TERMINATED` (403) | BACKEND_API_ARCHITECTURE.md, Error Codes (module-defined) | BACKEND_AUTH_ARCHITECTURE.md steps 2a/2b ask for 403 on a suspended account; two codes let the frontend tell the cases apart |
| Single-resource envelope `{ "data": … }` | BACKEND_API_ARCHITECTURE.md shows it only for lists | One consistent envelope for Track F (OQ1-14) |
| Cursor is base64url without padding; `limit` outside 1–200 is rejected | BACKEND_API_ARCHITECTURE.md, Pagination Strategy ("base64-encoded", maximum 200) | A cursor in a query string needs no percent-encoding; rejecting is unambiguous (OQ1-14) |
| Provisioning, lifecycle and plan change are a script; `change-plan` and `show` exist | D-15 lists provisioning, suspension, reactivation, termination | `TenantPlanChanged` needs a trigger; an operator needs to see state (OQ1-02, OQ1-15) |
| `tenant.plans` has no `company_id` | BACKEND_MULTITENANCY_ARCHITECTURE.md, "every record carries `company_id`" | A plan is the platform's catalogue, not tenant data (INV-12, OQ1-01) |
| Tenant-status check on every authenticated request, cached for a few seconds | BACKEND_AUTH_ARCHITECTURE.md checks at login only | Phase 0 OQ-12 |
| `TENANT_STATUS_CACHE_MS`; script loader and runtime opener | BACKEND_INFRASTRUCTURE_ARCHITECTURE.md, Required environment variables | PA-05, PA-03 |
| Scripts may import `server/platform/index.ts`, `server/platform/system/`, module `index.ts` files, Node built-ins and one named `admin.ts` per module where a specification defines it | BACKEND_AGENT_ROSTER.md, Folder Ownership (`server/scripts/**`: platform `system/` and module `index.ts` only) | The administrator functions must not be reachable by other modules, so they live in `admin.ts`, not `index.ts`, and a script needs the platform's public surface for types (OQ1-18) |
| Configuration omits notification preferences, accounting provider preferences and feature-flag overrides | BACKEND_MULTITENANCY_ARCHITECTURE.md, Tenant Configuration | Their content is defined by Phases 6 and 7 (OQ1-03) |

---

## 11. COMMIT PLAN

Six jobs. After every commit the engineer runs `npm run check`, `npm run build` and `npm test` and reports, as in Phase 0 §11. Any change outside a job's folders is reported, not made. Migrations are generated after pulling the latest `backend` (never hand-merged). Gate tests (job D2) are never edited by an implementer. A commit that adds a column, constraint or trigger runs the matching `*.db.test.ts` in the same commit.

**Merge order to `backend`: A → B → D1 → C → D2**, with the step-by-step checking of A and D0 described in §1.5 (the PM tells A to merge D0a's and D0b's branches during the job). Tests that need PA-04 (G1-02, G1-11, G1-12(a), G1-76) run after C. D1 and D2 are pulled into B before B8.

### 11.1 Job A — `backend-platform-engineer`: PA-01 … PA-06 (branch `agent/backend-platform-engineer/phase-1-platform`)

Before starting, read Phase 0 §4.8, PS-10, PS-11, PS-15, PS-16, PS-18 and this specification's §5.4–§5.8.

| # | Commit | Contents | Unit tests next to the code |
|---|---|---|---|
| A1 | `platform: pagination helper (PA-01)` | `http/pagination.ts` (`parsePageQuery`, `encodeCursor`, `decodeCursor`, `buildPage`); exported from `server/platform/index.ts` | Every row of G1-64 … G1-67 at unit level |
| A2a | `platform: script configuration loader (PA-03)` | `loadScriptConfig` in `server/platform/config/` reading only `LEDGER_APP_DATABASE_URL`, `NODE_ENV`, `LOG_LEVEL`; re-exported through `system/` | The script loader ignores the owner and other variables; a missing variable names the variable |
| A2b | `platform: tenant-status cache setting (PA-05)` | `TENANT_STATUS_CACHE_MS` in `loadApiConfig`: validation, default 5 000, empty-means-absent; ignored by the worker and script loaders | Each variable rule of G1-36(d) |
| A3a | `platform: script runtime opener (PA-03)` | `openScriptRuntime(modules, env)` in `server/platform/system/`: takes the module registrations it serves and builds and checks the catalogues as PS-02 does; `ledger_app` pool from explicit settings; `withClient` self-check; `runInTransactionAs` bound to it; `dbRole`; logger on stderr; `close()` | Against the test database as `ledger_app`; refusal of the worker and owner URLs; an unregistered type refused (G1-73 at unit level) |
| A3b | `platform: script context brand and lock timeout (PA-03)` | `runtime.createContext` with the platform-private brand and `isScriptRuntimeContext` (exported from `server/platform/index.ts`); the `lockTimeoutMs` unit option (`SET LOCAL lock_timeout`), default 5 000 for script units and available to `ModuleDeps.runInTransaction`; `55P03` mapped to `503 SERVICE_BUSY` in PS-07 and the code added to the error table | Brand cannot be forged by a copy or by `createSystemContext`; a held lock ends in `55P03` and in `503 SERVICE_BUSY` |
| A3c | `platform: script TLS rule, CLI environment and root configuration (PA-03)` | The TLS rule for non-local hosts in `loadScriptConfig`; `loadCliEnvironment()` in `system/` (reads the environment through `config/`, scrubs, reduces to the allowlist, returns it); the `tenant` entry in `package.json`; `'tenant'` in `drizzle.config.ts` `schemaFilter` | Every host and `sslmode` combination of G1-55(e); the allowlist (G1-75 at unit level) |
| A4a | `platform: tenant-status port token and registry extension (PA-02, OQ1-08)` | The `platform.tenantStatus` port token, exported from the platform index; the port registry extended so the platform is a requirer in **both** processes, each refusing to start with the port unbound (`FATAL`, naming the port). No behaviour change for requests | Start-up checks with a fake binding and without one. **Checked by the PM before D0a is branched from it** |
| A4b | `platform: tenant-status cache (PA-02)` | The in-process cache: single-flight above lifetime 0, no sharing at 0, bounded at 10 000, LRU, expiry from lookup start, failures and timeouts never cached; the minimal-unit lookup with `SET LOCAL statement_timeout = '2s'`; an injectable clock | The deterministic cache tests of G1-32(a) and G1-36. **Checked after the PM has told A to merge D0a** |
| A4c | `platform: token-middleware status check (PA-02)` | The check in PS-10 and PS-11 with `TENANT_SUSPENDED` / `TENANT_TERMINATED` (403), `401` for no company, `500` fail closed; the two codes added to the error table | The decision table of §5.6 with a fake port; the Phase 0 gate green with the D0a stub |
| A5a | `platform: required tenantStatusPolicy on subscribers (PA-06)` | The `Subscriber` type change and the PS-15 registry check. **Checked by the PM before D0b is branched from it** | Registry refuses a missing or unknown value; type-check of a registration without the field |
| A5b | `platform: worker honours tenantStatusPolicy (PA-06)` | The worker's `active_only` handling (§5.8): its own short unit on the worker pool, per-batch memo, skipped when no `active_only` subscriber is registered for the type, the handled-with-no-effect path, rate-limited INFO line, retry on a failed read | Every row of G1-77 at unit level. **Checked after the PM has told A to merge D0b** |
| A6 | `platform: final verification for Phase 1 additions` | Public surface reviewed (exports only what §5 lists, including `isScriptRuntimeContext` and `loadCliEnvironment`); `npm test`, `npm run check`, `npm run build`; **Playwright in frontend-only mode** (pipeline changed); report states `/health` showed `frontend_only` | Full suite |

### 11.2 Job B — `backend-module-engineer`: the tenant module and script (branch `agent/backend-module-engineer/phase-1-tenant`)

Needs job A merged. Folders: `server/modules/tenant/**`, `server/scripts/**`, one line in `server/modules/registry.ts`, its migrations.

| # | Commit | Contents | Unit tests next to the code |
|---|---|---|---|
| B1 | `tenant: domain model` | Value objects with the text rule and the ISO list, state machine, `TenantInfo`, domain errors (§4) | Every value-object rule; every transition pair; the property-style edge-input test of G1-47 for the value objects |
| B2a | `tenant: schema and tables migration` | `infrastructure/schema.ts` with every constraint named (§3.1.10); the generated `tenant_tables` migration | `*.db.test.ts`: G1-04, the `CHECK`s of G1-05 |
| B2b | `tenant: grants migration` | The custom `tenant_grants` migration (§3.5) | `*.db.test.ts`: G1-06, G1-10 |
| B2c | `tenant: rules and seed migrations` | The custom `tenant_rules` (four functions, the triggers of §3.6) and `tenant_seed_plans` migrations. **D1 branches from this commit** | `*.db.test.ts`: G1-07, G1-08, G1-09, the retention triggers |
| B3 | `tenant: repositories` | `tenantWhere` / `tenantValues` everywhere; inserts as parameterised `sql` naming exactly the granted columns (§3.5); row locks `FOR NO KEY UPDATE` and `FOR SHARE` with `.for(…)` in the repository only; `clock_timestamp()` after the lock; the single joined read of UC-09 | `*.db.test.ts`: every insert performed **as `ledger_app`** (a full-column Drizzle insert would fail with 42501); lock modes (G1-74 at repository level); ordering of G1-27 at repository level |
| B4.0 | `tenant: catalogue registration` | `tenantModule` registration with `auditEntryTypes` and `producesEvents` (§8.5), no routers or ports yet | Registration checks: six audit and six event types, owner `tenant`, `jobRequired: false` |
| B4a | `tenant: authority checks and ProvisionTenant` | `assertPlatformAdministrator` (component, causation, brand), `assertCeoOfOwnCompany`, the WARN log on refusal, `admin.ts` with `createTenantAdmin({ logger })`, UC-01 with its audit entry and event | Use-case tests with fakes; `*.db.test.ts` for G1-13, G1-14, G1-23 |
| B4b | `tenant: lifecycle use cases` | UC-02 … UC-04 | `*.db.test.ts`: G1-19 … G1-22, G1-26, G1-27 |
| B4c | `tenant: plan and configuration use cases` | UC-05, UC-06 (result value, lock timeout), UC-07 | `*.db.test.ts`: G1-41, G1-46 … G1-52, G1-33 |
| B4d | `tenant: context queries and status lookup` | UC-09 … UC-12 (UC-09 as the single joined read, memoised per unit) | G1-38, G1-39 at use-case level |
| B5 | `tenant: status port and public surface` | `application/ports/tenant-status.impl.ts` (rule 12), `providesPorts`, `index.ts` (§4.5) and its registry line | Registration and port checks; the port against the database |
| B6 | `tenant: configuration API` | `api/` router for `GET` and `PATCH /configuration`, Zod schemas, sanitised validation details, error mapping, role check before validation (§6) | Supertest: G1-40 … G1-45 at API level |
| B7 | `tenant: provisioning script` | `server/scripts/tenant.ts` with `run(argv, io)` and the executable wrapper that calls `loadCliEnvironment()` (§5.4); opens the runtime with `[tenantModule]`; takes contexts from `runtime.createContext`; imports `admin.ts` | Script tests: arguments, exit codes, output hygiene, in-process against the test database |
| B8 | `tenant: final verification` | Boundary rules and import checks, dead code removed, `npm test` with D1 and D2 pulled in, `npm run check`, `npm run build` | Full suite and the merged gate tests |

### 11.3 Jobs D0 and D1 — `backend-test-engineer`

**D0a — stub binding** (branch from A4a: `agent/backend-test-engineer/phase-1-stub`). One commit, `tests: stub platform.tenantStatus binding in the Phase 0 harness`: a binding returning `active` for the gate companies in the Phase 0 probe harness (`server/tests/support/`). No Phase 0 assertion is edited. The PM then tells A to merge this branch.

**D0b — policy on probes** (branch from A5a). One commit, `tests: declare tenantStatusPolicy on the Phase 0 probe subscribers`: `'any'` on each. The PM then tells A to merge this branch.

**D1 — company fixtures** (branch from B2c: `agent/backend-test-engineer/phase-1-fixtures`). One commit, `tests: seedCompany helper and Phase 0 fixtures use it`. Adds `seedCompany` (§9.1) in `server/tests/support/`, and changes the Phase 0 gate fixtures to seed A and B before use. Only set-up changes; **no Phase 0 assertion is edited**. Acceptance: the Phase 0 gate suite passes both without the PA-04 foreign keys and with them, the second checked against the unmerged job C branch.

### 11.4 Job C — `backend-platform-engineer`: PA-04 (branch `agent/backend-platform-engineer/phase-1-company-fk`)

One commit, `platform: company_id foreign keys on the platform tables (PA-04)`: the custom migration of §3.7 and nothing else; the commit report includes the catalogue query for the three constraints and a green run of the whole Phase 0 gate suite. Merged only after B and D1.

### 11.5 Job D2 — `backend-test-engineer`: the gate tests (branch `agent/backend-test-engineer/phase-1-gate`)

Written from §9 in parallel with A and B, compile-checked against the types until B8 exists. Commits by group: harness additions (probe routes, probe subscribers, the faulty port, race helpers with latches and a seeded PRNG, the spawned-process preload, the suite-wide log hook, table FB and the scanner fixtures); G1-01 … G1-12 and G1-76; G1-13 … G1-27; G1-28 … G1-39, G1-74, G1-77 and G1-78; G1-40 … G1-54; G1-55 … G1-63, G1-73 and G1-75; G1-64 … G1-68 and G1-70 … G1-72. The test engineer owns the scanner rules for the `tenant-cli` literal and the script boundaries (G1-24).

---

## 12. OPEN QUESTIONS (FOR THE OWNER CHECKPOINT)

Recommendations are applied in this specification unless a row says otherwise; each is a choice the owner can reverse by a specification change.

| ID | Question | Where | Recommendation |
|---|---|---|---|
| OQ1-01 | **Plans.** No document defines any plan, flag or limit. `tenant.plans` is global with no `company_id` (an exception to "every table has `company_id`"). Who defines real plans, and how are plan rows managed? | §3.1.4, §3.2, INV-12 | Keep the exception. Seed one placeholder plan, `standard`, with no flags and no limits; change plans by migration only. The owner replaces it when plans are decided. No billing field in v1 |
| OQ1-02 | **Plan change trigger.** `TenantPlanChanged` is in the roadmap, but D-15 names no plan command | §5 UC-05 | A `change-plan` script command (platform administrator only), audited like the lifecycle commands. The CEO cannot change the plan |
| OQ1-03 | **Configuration contents.** The architecture lists notification preferences, accounting provider preferences and feature flags; their content belongs to Phases 6, 7 and the first phase that reads a flag. The prototype also stores registration number, VAT ID, bank details, branding and an accounting token | §3.4, §10 | Phase 1 holds legal name, address, contact email, phone, website and currency only. Add the deferred items by migration when their phase defines them. Bank details wait for the commercial documents domain (D-07); the accounting token belongs in `accounting` and never in `tenant` |
| OQ1-04 | **Default currency.** No default is stated; changing it after financial records exist would misstate every approved amount | §3.4, INV-10 | `provision` takes `--currency`, required (the owner may choose `GBP` as a script default); it cannot be changed in v1. A controlled change, if ever needed, is a later specification with the Financial Normalization owner |
| OQ1-05 | **Tenant audit entry types.** `DOMAIN_MODEL_SUMMARY.md` lists none; the roadmap only says lifecycle changes have audit entries | §8.1 | Adopt the six `tenant_*` names of §8.1, and add them to the domain summary when the owner next amends it |
| OQ1-06 | **Initial CEO.** Phase 2's `TenantProvisioned` subscriber must create the first CEO, but the event must carry no personal data (the event log is permanent and readable by both runtime roles). Tenants provisioned in Phase 1 reach no subscriber, so nobody can sign in to them | §5 UC-01, §7 | The payload stays identifiers-only. Phase 2's specification decides how the first CEO's name and email reach Identity: either an extra `provision` option stored by Identity's own step, or a separate Phase 2 script command run after `provision`. Not decided here |
| OQ1-07 | **Termination and data.** The multi-tenancy document says "data deletion scheduled"; D-05 forbids hard deletes and audit entries are permanent | §1.2, INV-9 | Termination only marks the tenant and blocks access. No deletion, retention schedule or export is built; the owner decides retention policy (including any right-to-erasure handling) before Phase 9 |
| OQ1-08 | **The platform needs a port, in both processes.** Phase 0's PS-16 describes ports that modules define and require. The tenant-status port is required by the platform itself (the platform may not import a module): by the token middleware in the API, and by the worker for PA-06. PS-16's rules (a binding for a port nobody requires is an error; the worker also creates implementations) must be extended, and Phase 0's token middleware extended with the check | §5.6, §5.8, PA-02, PA-06 | Add the platform as a requirer in the full-mode start-up of **both** processes, each refusing to start with the port unbound (G1-60, G1-77). This changes Phase 0 code, not Phase 0's specification; if the owner prefers not to touch PS-16, the alternative is a hook argument to `createApiApp` and to the worker factory supplied by the entry points |
| OQ1-09 | **Script bootstrap.** Phase 0 defines `createSystemContext` and `runInTransactionAs` but no script configuration loader, pool or `package.json` entry | §5.7, PA-03 | Add them in the platform job (the recommended design of §5.7). Not hand-rolled in `server/scripts/` |
| OQ1-10 | **The script shares `ledger_app` with the API, and `--operator` is self-declared.** Grants cannot separate the CEO's request from the operator's command; the audit records what the operator claims. **`hostAccount` cannot tell operators apart on Replit** (every shell runs as one container user); there is no operator list in v1. **Blast radius:** with RLS deferred to Phase 9, a defect or injection in the API process holds a role that can `UPDATE` the status columns of any company and `INSERT` companies, unscoped. The script's keys sit in `metadata.platformAdmin`, which a Phase 7 binding obligation redacts from CEO and PM views | §3.5, §4.4, §8.2, §4.6 | Accept for v1: the control is who can open a shell with the secrets, the module refuses every non-administrator context (INV-11) and hardens it (branded contexts, `admin.ts`, §4.5), and the database freezes terminated and inactive tenants (§3.6). A fifth database role for the script would need a Phase 0 change and is not recommended now. Phase 9's RLS closes the blast radius |
| OQ1-11 | ~~Foreign keys break the Phase 0 gate tests~~ | §3.7, §11 | **Closed (review of v0.2).** Job D1 adds `seedCompany` and updates the Phase 0 fixtures; job C merges only after D1, and is accepted only with the whole Phase 0 gate green |
| OQ1-12 | **Enforcing "not inactive" beyond HTTP.** PA-02 covers authenticated requests. Public routes (Phase 2 login and refresh) are not covered, and Phase 2's login must read tenant status before any execution context exists, which Phase 0 gives modules no way to build. Worker subscribers were covered only by convention in v0.3 | §1.3, §4.5, §4.6, §5.8 | **Decided in review round 2:** Phase 2's specification designs the pre-context lookup; subscribers are covered by default-deny, PA-06: a required `tenantStatusPolicy` on every registration, enforced by the worker. Consequence accepted: events delivered during a suspension are not replayed on reactivation. D-17 puts approval effects in the approving transaction, not in subscribers, so no financial effect is lost this way |
| OQ1-13 | **CEO-only checks trust the token's role until Phase 2.** | opening note, §4.4 | Acceptable because no token can be obtained through the application in Phase 1; the residual risk is a holder of the Secrets (Phase 0 §2.5), who could mint any token. Phase 2 re-loads the role and active status of the user on UC-06 and UC-07 |
| OQ1-14 | **Conventions Phase 1 fixes for every later API:** the single-resource envelope `{ "data": … }`; the cursor in base64url without padding (the document's example is standard base64); `limit` outside 1–200 rejected with 400 rather than clamped | §5.5, §6.2 | Adopt as written |
| OQ1-15 | **Small additions beyond the roadmap list:** the `show` command, `getPlan`, `assertTenantActive` | §4.5, §5.4 | Keep. `show` is read-only; the other two give "cannot be used by any later module" a non-HTTP test |
| OQ1-16 | **Company name.** Two companies may share a name (no uniqueness); the platform name is immutable (no rename use case); "TenantMetadata" and "TenantLifecycle record" are columns and audit entries, not tables | §3.3 | Keep as specified. A rename or uniqueness rule is a later specification if operations need it |
| OQ1-17 | **Running the script in production.** In Phase 1 it runs with `tsx` from a Replit Shell or laptop; the production build bundles only the API and the worker | §5.4 | Decide in Phase 9 whether to bundle `dist/tenant.cjs`. Until then the script is run from a workspace Shell with the Replit Secrets (Phase 0 §2.5) |
| OQ1-18 | **Roster amendments Phase 1 needs.** (a) Folder Ownership says scripts import only `server/platform/system/` and module `index.ts` files. Phase 1 needs: Node built-ins, `server/platform/index.ts`, `server/platform/system/`, module `index.ts` files, and **one named `admin.ts` per module where a specification defines it** (here `server/modules/tenant/admin.ts`, imported only by `server/scripts/tenant.ts`). (b) The PM may tell an agent to merge a named sibling branch as well as `backend` (§1.5) | §1.5, §4.5, §10.2 | Amend the roster at merge, as the PM proposed. Until then both are applied as written in this specification |


