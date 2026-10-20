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
| — | — | — | — | — | — |

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

None yet. Phase 0 has not started.
