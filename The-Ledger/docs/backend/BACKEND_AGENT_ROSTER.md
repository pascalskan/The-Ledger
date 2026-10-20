# THE LEDGER — BACKEND AGENT ROSTER

Version: 1.0
Status: DRAFT — awaiting owner approval
Date: October 20, 2026
Authority: Backend Programme Planning

---

## PURPOSE

This document defines the team of Claude subagents that builds The Ledger backend, the order they work in for each roadmap phase, what each one may touch, and the rules they all follow.

It implements `BACKEND_IMPLEMENTATION_ROADMAP.md` (v2.1) under the approved decisions in `BACKEND_OPEN_DECISIONS.md`. It adds no architecture and no doctrine.

---

## HOW IT RUNS

Subagents cannot start other subagents. The **main Claude session is the Backend Lead**: it follows the `ledger-backend-lead` skill (`.claude/skills/ledger-backend-lead/SKILL.md`), calls the subagents below in order, checks their output, and is the only one that talks to the owner, commits, pushes or opens pull requests.

The agent definitions live in `.claude/agents/`. Claude Code loads them from the folder a session is started in, so backend sessions are started in the app folder (the one that contains `CLAUDE.md`).

One roadmap phase = one branch = one pull request. The Lead stops after opening the pull request (CLAUDE.md Git Workflow); the next phase starts after the owner merges it.

---

## THE ROSTER

| Agent | Role | Writes to | Model |
|---|---|---|---|
| Backend Lead (main session) | Orchestrates a phase, owner checkpoints, verification runs, handoff, git | `docs/handoffs/`, `docs/ai-context/CURRENT_DEVELOPMENT_STATE.md` | session model |
| `backend-architect` | Turns the roadmap phase and frozen domains into a phase specification | `docs/backend/phases/` | opus |
| `backend-platform-engineer` | Builds Phase 0 and Phase 9 and any cross-cutting platform change | `server/platform/`, `server/index.ts`, `server/worker.ts`, root config files, `migrations/` (platform tables) | session model |
| `backend-module-engineer` | Builds one module end to end (domain, application, infrastructure, API) | `server/modules/<module>/`, `migrations/` (its own schema), one line in `server/modules/registry.ts` | session model |
| `backend-test-engineer` | Writes the phase gate tests from the specification, independently of the implementation | `server/tests/` | session model |
| `backend-doctrine-reviewer` | Read-only review for Approval, Audit, Job Attribution, Financial Integrity, Review Centre, automation and AI doctrine | nothing (report only) | opus |
| `backend-security-reviewer` | Read-only review for tenant isolation, RBAC, authentication, portal projections and sensitive data in logs | nothing (report only) | opus |
| `frontend-integration-engineer` | Track F: switches one frontend page group from mock data to the API | `client/` | session model |

Not in the roster: the commercial documents domain session needed for D-07. Defining a domain is an owner conversation, so the Lead runs it directly with the owner and produces `docs/domain/COMMERCIAL_DOCUMENTS_DOMAIN.md` for approval.

---

## PHASE PIPELINE

```
1. Lead        Preflight: previous phase merged, decisions approved, branch from main
       ↓
2. Architect   Phase specification  →  docs/backend/phases/PHASE-<n>-<module>.md
       ↓
3. Lead        OWNER CHECKPOINT — owner approves the specification
       ↓
4. ┌ Test engineer      Gate tests from the specification (expected to fail at first)
   └ Platform or module engineer   Implementation          (in parallel, separate folders)
       ↓
5. Lead        Verify: build, typecheck, unit tests, gate tests
               Failures → back to the implementer (gate tests are not edited to pass)
       ↓
6. ┌ Doctrine reviewer
   └ Security reviewer   (in parallel, on the phase diff)
               Findings → implementer fixes → step 5 again
       ↓
7. Lead        Handoff document, development-state update, commit, push, pull request, STOP
```

### Step details

**1. Preflight (Lead).** Confirms the previous phase's pull request is merged into `main`, every decision the phase needs (roadmap phase table) is APPROVED, and for invoice-document work that `COMMERCIAL_DOCUMENTS_DOMAIN.md` is frozen. Creates `backend/phase-<n>-<module>` from `main`.

**2. Specification (Architect).** Produces the phase specification using the template below. The specification is the contract between the implementer and the test engineer.

**3. Owner checkpoint (Lead).** CLAUDE.md requires analysis before implementation. The Lead summarises the specification for the owner, including every open question and every place the design differs from the prototype engines, and waits for approval.

**4. Build and tests in parallel.** The implementer and the test engineer both work from the approved specification and never from each other's code, so the tests check the specification rather than echo the implementation.

**5. Verification (Lead).** Runs `npm run check`, `npm run build`, the unit tests and the phase's gate tests, plus all earlier phases' gate tests. If a gate test looks wrong, the Lead decides with the architect (or the owner) whether the test or the specification changes; the implementer never edits gate tests.

**6. Review.** Both reviewers read the diff against `main`, the specification and the doctrine. Findings are rated **Blocking**, **Should fix** or **Note**. All Blocking findings are fixed before step 7.

**7. Close-out (Lead).** Writes the phase handoff (CLAUDE.md Handoff Requirements plus the roadmap's extra items), updates `CURRENT_DEVELOPMENT_STATE.md`, commits, pushes, opens the pull request and stops.

### Parallel phases

Phases 4 and 4a, and later 6, 6a and 6b, may be built at the same time. Each runs as its own session in its own worktree and branch, with its own run of this pipeline. They share no folders except `server/modules/registry.ts` (one line each) and `migrations/` (migration files are regenerated after rebasing on `main`, never hand-merged).

### Track F

After the Phase 5 gate, the Lead runs Track F one page group at a time: architect (integration specification for the page group) → owner checkpoint → `frontend-integration-engineer` → Playwright suite in both `mock` and `api` modes → reviewers → pull request.

---

## FOLDER OWNERSHIP

| Path | Owner | Others |
|---|---|---|
| `server/platform/**` | platform engineer | module engineers import only from `server/platform/index.ts` |
| `server/modules/<module>/**` | module engineer for that module | other modules import only from `server/modules/<module>/index.ts` |
| `server/modules/registry.ts` | platform engineer (creates it) | each module engineer adds one registration line |
| `server/index.ts`, `server/worker.ts` | platform engineer | — |
| `server/tests/gate/**`, `server/tests/support/**` | test engineer | implementers read only |
| `server/**/*.test.ts` next to source | the implementer of that source (unit tests) | — |
| `migrations/**` | whoever owns the schema being migrated | generated with `drizzle-kit generate`, never hand-edited after commit |
| `docs/backend/phases/**` | architect | — |
| `docs/handoffs/**`, `docs/ai-context/CURRENT_DEVELOPMENT_STATE.md` | Lead | — |
| `client/**` | frontend integration engineer (Track F only) | — |
| `docs/domain/**`, `docs/ai-context/LEDGER_CANONICAL_CONTEXT.md`, `docs/backend/BACKEND_*.md`, `CLAUDE.md` | owner (changed only by the Lead, with owner approval) | agents read only |

Backend tests live under `server/`, not `tests/`, because Playwright collects every `*.test.ts` under `tests/`.

---

## SHARED RULES

Every agent follows these rules. Each agent definition points here.

### Read first
1. `CLAUDE.md`
2. `docs/ai-context/LEDGER_CANONICAL_CONTEXT.md` — doctrine
3. `docs/backend/BACKEND_OPEN_DECISIONS.md` — approved decisions D-01 … D-16
4. `docs/backend/BACKEND_IMPLEMENTATION_ROADMAP.md` — the phase being built
5. The phase specification in `docs/backend/phases/` (every agent except the architect)
6. Only the domain and architecture documents the specification cites

### Precedence
Canonical context → frozen domain documents → backend architecture documents → prototype engines. Prototype engines are reference behaviour only. Any difference between the build and an engine is listed in the agent's report with the rule that caused it.

### Doctrine (non-negotiable)
- No financial record is created except by the approval of an authenticated human with the right authority. System, automation, workflow, scheduler, notification and AI actors can never approve, reject or create financial records.
- Every financially relevant change writes an audit entry in the same transaction. Audit entries are never updated or deleted.
- Every financial record has a `job_id` and an approval reference. Content fields never change after creation; corrections are new void or adjustment records approved by the CEO.
- Every query, use case and event carries `company_id`. Cross-tenant access returns 404.
- Workers never receive financial values. Clients only ever see portal projections.
- No hard deletes (D-05). No request or response bodies, tokens, passwords or financial amounts in logs.

### Working rules
- Stay inside your folders (Folder Ownership). If a change is needed elsewhere, stop and report it.
- Never edit frozen documents, the canonical context, the architecture documents or `CLAUDE.md`.
- Never commit, push, create branches, open pull requests or touch `deploy/replit-public`. The Lead does all git work.
- Follow the four-layer rules in BACKEND_LAYERING_ARCHITECTURE.md and the module boundary rules in BACKEND_SERVICE_ARCHITECTURE.md.
- User-readable strings use British English and the platform lexicon (canonical context). Identifiers, routes and test IDs are unaffected.
- Never invent doctrine or resolve an ambiguity silently. Put it under **Open questions** in your report.

### Report format
Every agent ends with a report to the Lead:
1. **Done** — what was produced, with file paths
2. **Verification** — commands run and their results (or "not run" and why)
3. **Differences from the prototype** — with the rule that caused each
4. **Open questions** — anything the Lead or owner must decide
5. **Out of scope noticed** — problems seen outside the agent's folders

---

## PHASE SPECIFICATION TEMPLATE

The architect fills in every section; "None" is a valid answer, an empty section is not.

1. **Scope** — roadmap items included and excluded
2. **Sources** — domain and architecture sections used, decisions applied
3. **Data model** — every table: columns, types, keys, `company_id`, constraints, indexes, which fields are immutable
4. **Domain model** — aggregates, value objects, state machines with allowed transitions and who may trigger each
5. **Use cases** — command and query handlers: inputs, authorisation (role and scope), invariants checked, records written, audit entry type, events emitted, transaction boundary
6. **API** — routes, methods, request and response schemas, status and error codes, roles
7. **Events** — produced and consumed, payloads, idempotency key
8. **Audit entries** — every entry type and its fields
9. **Gate tests** — numbered list (`G<phase>-01` …) mapping each roadmap gate item and invariant to a test, including the attack each test tries
10. **Prototype differences** — where the prototype engines behave differently, and why the build follows the domain
11. **Open questions** — for the owner checkpoint

---

## APPROVAL OF THIS ROSTER

This roster is a draft. Once the owner approves it, the Lead may start Phase 0 with the `ledger-backend-lead` skill.
