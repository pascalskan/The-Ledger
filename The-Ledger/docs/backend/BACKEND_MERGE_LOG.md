# THE LEDGER — BACKEND MERGE LOG

Maintained by: the Project Manager (main session)
Branch: `backend` (GitHub) — the "main" of the theoretical GitHub
Process: `docs/backend/BACKEND_AGENT_ROSTER.md` (v1.1), The Job Lifecycle

---

## PURPOSE

This is the record of the theoretical GitHub. Every job assigned to a subagent, every commit the PM checked, every review round, every merge into `backend` and every notification sent is written here. Every agent reads it at the start of a job, so later agents know what earlier agents built.

Only the PM edits this file.

---

## JOB INDEX

| Job | Phase | Agent | Branch | Status | Merge SHA |
|---|---|---|---|---|---|
| phase-0-spec | 0 Infrastructure | backend-architect | agent/backend-architect/phase-0-spec | Open | — |

Status values: **Open** (assigned, commits in progress) → **In review** (review rounds running) → **Merged** → or **Abandoned** (with reason).

---

## ENTRY TEMPLATE

Copy this block for each job, newest at the top of the Entries section.

```
### <job> — <agent> — <status>

Phase: <n> <module>
Branch: agent/<agent>/<job>   (from backend @ <sha>)
Specification: docs/backend/phases/<file>

Commits checked
| # | SHA | Message | PM verdict | Notes |
|---|---|---|---|---|

Review rounds
| Round | Focus | Findings sent | Agent answer | Result |
|---|---|---|---|---|
| 1 | Correctness | | | |
| 2 | Security and doctrine | | | |
| 3 | Efficiency and quality | | | |

Verification on merge: npm run check / build / unit / gate — <results>
Merge: <merge sha> into backend on <date>
Public surface changed: <exports, events, routes, tables>
Notified: <agents and what they were told>
Follow-ups: <anything deferred, with owner>
```

---

## ENTRIES

### phase-0-spec — backend-architect — Open

Phase: 0 Infrastructure Foundation
Branch: agent/backend-architect/phase-0-spec   (from backend @ b6ab5be)
Specification: docs/backend/phases/PHASE-0-infrastructure.md (being written)
Preflight: no phase dependencies; decisions D-10, D-12, D-14, D-16 APPROVED.
Assigned: October 20, 2026. Planned commits: (1) sections 1–4, (2) sections 5–8, (3) sections 9–12.

Commits checked
| # | SHA | Message | PM verdict | Notes |
|---|---|---|---|---|
| 1 | 33d9b6b | docs(phase-0-spec): scope, sources, data model and platform model | Changes requested | A: FileStorage stays Phase 4 (PM ruling, roadmap). B: add causation (event/actor) for subscriber work. C: record Data vs Event architecture conflict on approval→normalization transaction as owner OQ. D: evaluate separate worker DB role. E: propose frontend-only start mode (D-13). F: pg error messages leak input values. G: domain-layer access to CompanyId type. |

Review rounds
| Round | Focus | Findings sent | Agent answer | Result |
|---|---|---|---|---|
