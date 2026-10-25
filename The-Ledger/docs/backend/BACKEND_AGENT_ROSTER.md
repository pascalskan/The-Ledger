# THE LEDGER — BACKEND AGENT ROSTER

Version: 1.3
Status: ACTIVE — owner direction, October 20, 2026
Date: October 20, 2026
Authority: Backend Programme Planning

---

## CHANGE LOG

| Version | Date | Changes |
|---|---|---|
| 1.0 | October 20, 2026 | Draft roster, phase pipeline, folder ownership, shared rules |
| 1.3 | October 25, 2026 | Owner approval of Phase 1 OQ1-18: scripts may import `server/platform/index.ts` and one named `admin.ts` per module where a specification defines it; the PM may tell an agent to merge a named sibling branch as well as `backend` |
| 1.2 | October 24, 2026 | Owner direction: every subagent runs on Sonnet; the PM's advisor runs on Opus |
| 1.1 | October 20, 2026 | Owner direction: the main session is the Project Manager and the "theoretical GitHub"; every agent works on its own branch and runs each commit through the PM; minimum three review rounds per job; related agents are notified after each merge; all real work lives on the GitHub branch `backend` |

---

## PURPOSE

This document defines the team of Claude subagents that builds The Ledger backend, how their work is reviewed and merged, what each one may touch, and the rules they all follow.

It implements `BACKEND_IMPLEMENTATION_ROADMAP.md` (v2.1) under the approved decisions in `BACKEND_OPEN_DECISIONS.md`. It adds no architecture and no doctrine.

---

## HOW IT RUNS

### The Project Manager

Subagents cannot start other subagents. The **main Claude session is the Project Manager (PM)**. It follows the `ledger-backend-lead` skill, and it is three things at once:

1. **Project manager** — assigns every job, checks every piece of work, and decides when a job is complete.
2. **The theoretical GitHub** — owns the integration branch, every agent branch, every review and every merge. No agent's work reaches the integration branch except through the PM.
3. **The only link to the owner and to the real GitHub** — the only one who talks to the owner, pushes, or opens pull requests.

### Real GitHub

All backend work lives on one real branch: **`backend`** on GitHub (created October 20, 2026 from `main`). The PM pushes `backend` after each completed phase and at every context-safety stop. `main` and `deploy/replit-public` are never touched.

### The theoretical GitHub

The theoretical GitHub is local git, run by the PM. Nothing in it is pushed except `backend` itself.

| Theoretical GitHub | Real thing |
|---|---|
| "main" | the local `backend` branch, checked out in the PM's integration worktree |
| an agent's branch | a local branch `agent/<agent>/<job>` in its own worktree under `worktrees/agents/` |
| a commit | a real local commit the agent makes on its own branch |
| a review | the PM reading the commit (`git show`) and replying to the agent |
| a merge | the PM merging the agent branch into local `backend` with `--no-ff` |
| a release note | the PM's entry in `docs/backend/BACKEND_MERGE_LOG.md` plus messages to related agents |

---

## THE ROSTER

| Agent | Role | Writes to (on its own branch) | Model |
|---|---|---|---|
| Project Manager (main session) | Assigns jobs, reviews every commit, runs the review rounds, merges, notifies, talks to the owner, pushes | merge log, handoffs, development state | session model |
| `backend-architect` | Turns a roadmap phase and the frozen domains into a phase specification | `docs/backend/phases/` | sonnet |
| `backend-platform-engineer` | Phase 0, Phase 9 and any cross-cutting platform change | `server/platform/`, `server/index.ts`, `server/worker.ts`, `server/modules/registry.ts`, root config, platform migrations | sonnet |
| `backend-module-engineer` | One module end to end (domain, application, infrastructure, API); one instance per module | `server/modules/<module>/`, its migrations, one registry line | sonnet |
| `backend-test-engineer` | Gate tests from the specification, independently of the implementation | `server/tests/` | sonnet |
| `backend-doctrine-reviewer` | Read-only doctrine review the PM uses in review round 2 | nothing | sonnet |
| `backend-security-reviewer` | Read-only security review the PM uses in review round 2 | nothing | sonnet |
| `frontend-integration-engineer` | Track F: one frontend page group from mock data to the API | `client/` | sonnet |

The commercial documents domain session (D-07) is not an agent job. Defining a domain is an owner conversation; the PM runs it with the owner.

---

## THE JOB LIFECYCLE

Every job — a specification, a module, a set of gate tests, a Track F page group — follows the same lifecycle.

```
1. ASSIGN     PM creates agent/<agent>/<job> from the latest local backend,
              in worktrees/agents/<agent>-<job>/, installs dependencies,
              and briefs the agent (job, branch, worktree, specification,
              merge-log entries it must know about)
     ↓
2. COMMIT     Agent makes ONE focused commit, then stops and reports
     ↓
3. CHECK      PM reviews that commit (git show, runs the relevant checks)
              → "changes requested" (agent fixes in a new commit) or
              → "accepted, continue" (agent makes the next commit)
              ...repeat 2–3 until the agent reports the job is finished
     ↓
4. REVIEW     At least THREE full review rounds on the whole branch
   ROUNDS     (see below). The job is not complete until all three have
              run and no finding is open.
     ↓
5. MERGE      PM merges the branch into local backend (--no-ff), reruns
              the full verification on backend, writes the merge-log entry
     ↓
6. NOTIFY     PM tells every related agent what was merged and what it
              means for them (Notification Map); they pull backend into
              their branch when told
```

### Commits

- One commit is one coherent step (for example "tenant schema and migration", "provision tenant use case and tests"). Agents keep commits small enough to review in one sitting.
- Agents commit only on their own branch, in their own worktree. They never push, merge into `backend`, rebase, reset shared history, switch branches or touch another agent's branch.
- Commit messages: `<area>: <what changed>` on the first line, then why, then `Spec: <spec path> §<section>`.
- After each commit the agent stops and reports the SHA, what it did, and the checks it ran. It continues only when the PM says "accepted, continue".
- "Pull from main" means `git merge backend` inside the agent's own worktree, done only when the PM asks. Where a phase specification sequences jobs that way (for example Phase 1 §1.5), the PM may also tell an agent to merge a named sibling branch (`git merge agent/<agent>/<job>`); the agent merges only the branch the PM names.

### The three review rounds (minimum)

Each round is a real exchange: the PM reviews the latest state of the branch, sends specific findings or specific verification questions, and the agent answers with fix commits or evidence. A round with no findings still sends the agent targeted questions to answer — a round is never just "looks good".

| Round | Focus | What the PM does |
|---|---|---|
| 1 — Correctness | Bugs, edge cases, conformance to the specification and the frozen domain | Reads the full branch diff against `backend`; runs `npm run check`, `npm run build`, unit tests and gate tests; checks every specification item is implemented and every gate test passes for the right reason |
| 2 — Security and doctrine | Tenant isolation, RBAC and PM scope, auth, sensitive data, approval and audit doctrine, immutability | Runs `backend-doctrine-reviewer` and `backend-security-reviewer` in parallel on the branch and checks their findings itself; adds its own findings; sends all of them to the agent |
| 3 — Efficiency and quality | Query efficiency (N+1 queries, missing indexes, long transactions, unbounded lists), layering and module boundaries, duplication, error handling, test quality | Reads the code for performance and maintainability; checks the tests would fail if the code were wrong |

Further rounds follow until there are no open findings. The PM confirms a job complete only when:
- at least three rounds have run,
- every finding is fixed or explicitly accepted by the PM with a written reason,
- `npm run check`, `npm run build`, all unit tests and all gate tests (this phase and every earlier one) pass on the branch after merging the latest `backend`.

Every round, finding and answer is recorded in the job's merge-log entry.

### Gate tests are protected

The implementer never edits gate tests. If a gate test looks wrong, the PM asks `backend-architect` for a ruling; a specification change goes to the owner.

---

## PHASE PIPELINE

A roadmap phase is a sequence of jobs:

```
1. PM          Preflight: previous phase complete, decisions approved
2. Architect   Job: phase specification          → lifecycle → merged
3. PM          OWNER CHECKPOINT: owner approves the specification
4. ┌ Test engineer      Job: gate tests          → lifecycle → merged
   └ Implementer        Job: implementation      → lifecycle → merged
     (in parallel, each on its own branch; the implementer's review
      rounds run against the merged gate tests)
5. PM          Phase verification on backend; handoff; development state;
               push backend to GitHub; report to the owner; STOP until the
               owner says to start the next phase
```

Parallel phases (4 with 4a; 6 with 6a and 6b) run as parallel jobs on separate branches. They share no folders except `server/modules/registry.ts` (one line each) and `migrations/` (migrations are regenerated after pulling `backend`, never hand-merged).

Track F (after the Phase 5 gate): architect job (integration specification for the page group) → owner checkpoint → `frontend-integration-engineer` job, verified with the Playwright specs for the page group in both `mock` and `api` modes.

---

## NOTIFICATION MAP

After each merge the PM notifies every agent whose work relates to what was merged — any agent currently on a job is messaged directly, and every later agent learns it from the merge log, which each agent reads at the start of a job.

| When this merges | Notify |
|---|---|
| A phase specification | the implementer and test engineer for that phase |
| Gate tests | the implementer for that phase |
| Platform (Phase 0, Phase 9, platform changes) | every module engineer, the test engineer, the integration engineer |
| Tenant | every module engineer (company foreign key, tenant context) |
| Identity | every module engineer (user context, roles), the integration engineer |
| Operational | Review Centre, Inventory & Asset, Client Portal, Financial Intelligence |
| Review Centre | Financial Normalization, Intelligence & Automation |
| Inventory & Asset | Financial Normalization |
| Financial Normalization | Inventory & Asset, Accounting Integration, Financial Intelligence, Client Portal, Intelligence & Automation, Reporting |
| Accounting Integration | Intelligence & Automation, Reporting |
| Client Portal | Intelligence & Automation, the integration engineer |
| Financial Intelligence | Intelligence & Automation, Reporting |
| Intelligence & Automation | Reporting |
| Any change to an API route or response | the integration engineer (from Track F onward) and the test engineer |

A notification says: what merged (merge SHA), the public surface that changed (module `index.ts` exports, events, routes, tables), anything the recipient must now do, and the merge-log entry to read.

---

## FOLDER OWNERSHIP

| Path | Owner | Others |
|---|---|---|
| `server/platform/**` | platform engineer | modules import only from `server/platform/index.ts` |
| `server/modules/<module>/**` | module engineer for that module | others import only from `server/modules/<module>/index.ts` |
| `server/modules/registry.ts` | platform engineer (creates it) | each module engineer adds one registration line |
| `server/index.ts`, `server/worker.ts` | platform engineer | — |
| `server/scripts/**` | the module engineer whose phase specification names the script (for example Phase 1 provisioning → the tenant module engineer) | scripts import only Node built-ins, `server/platform/index.ts`, `server/platform/system/`, module `index.ts` files, and one named `admin.ts` per module where a phase specification defines it (Phase 1: `server/modules/tenant/admin.ts`, imported only by `server/scripts/tenant.ts`); never `server/modules/registry.ts`; they connect as a runtime role, never the owner |
| `server/tests/gate/**`, `server/tests/support/**` | test engineer | implementers read only |
| `server/**/*.test.ts` next to source | the implementer of that source | — |
| `migrations/**` | whoever owns the schema being migrated | generated with `drizzle-kit generate`, never hand-edited after commit |
| `docs/backend/phases/**` | architect | — |
| `docs/backend/BACKEND_MERGE_LOG.md`, `docs/handoffs/**`, `docs/ai-context/CURRENT_DEVELOPMENT_STATE.md` | PM | — |
| `client/**` | integration engineer (Track F only) | — |
| `docs/domain/**`, `docs/ai-context/LEDGER_CANONICAL_CONTEXT.md`, `docs/backend/BACKEND_*.md`, `CLAUDE.md` | owner (changed only by the PM, with owner approval) | agents read only |

Backend tests live under `server/`, not `tests/`, because Playwright collects every `*.test.ts` under `tests/`.

---

## SHARED RULES

Every agent follows these rules. Each agent definition points here.

### Read first
1. `CLAUDE.md`
2. `docs/ai-context/LEDGER_CANONICAL_CONTEXT.md` — doctrine
3. `docs/backend/BACKEND_OPEN_DECISIONS.md` — approved decisions D-01 … D-16
4. `docs/backend/BACKEND_IMPLEMENTATION_ROADMAP.md` — the phase being built
5. `docs/backend/BACKEND_MERGE_LOG.md` — everything merged so far, and any entries the PM pointed you to
6. The phase specification in `docs/backend/phases/` (every agent except the architect)
7. Only the domain and architecture documents the specification cites

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
- Work only in the worktree and on the branch the PM gave you. Stay inside your folders (Folder Ownership). If a change is needed elsewhere, stop and report it.
- Commit as described in The Job Lifecycle: one focused commit, then stop and report. Never push, merge into `backend`, rebase, switch branches or touch `main` or `deploy/replit-public`.
- Never edit frozen documents, the canonical context, the architecture documents or `CLAUDE.md`.
- Follow the four-layer rules in BACKEND_LAYERING_ARCHITECTURE.md and the module boundary rules in BACKEND_SERVICE_ARCHITECTURE.md.
- User-readable strings use British English and the platform lexicon (canonical context). Identifiers, routes and test IDs are unaffected.
- Never invent doctrine or resolve an ambiguity silently. Put it under **Open questions** in your report.
- Answer every PM review question directly, with evidence (file and line, test name, command output).

### Report format
After each commit:
1. **Commit** — SHA and message
2. **What and why** — the step this commit completes
3. **Checks run** — commands and results
4. **Next** — the commit you plan next, or "job finished"

At the end of the job, and in reply to each review round:
1. **Done** — what was produced, with file paths and commit SHAs
2. **Verification** — commands run and their results (or "not run" and why)
3. **Review answers** — each PM finding or question, and the fix commit or evidence
4. **Differences from the prototype** — with the rule that caused each
5. **Open questions** — anything the PM or owner must decide
6. **Out of scope noticed** — problems seen outside your folders

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
11. **Commit plan** — the expected sequence of focused commits for the implementation job
12. **Open questions** — for the owner checkpoint
