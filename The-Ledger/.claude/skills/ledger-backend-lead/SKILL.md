---
name: ledger-backend-lead
description: Run The Ledger backend build as the Project Manager and "theoretical GitHub" for the backend subagents — assign jobs on per-agent branches, review every commit, run at least three review rounds per job, merge into the backend branch, notify related agents, and report to the owner. Use when the owner asks to start, continue or finish a backend roadmap phase or a Track F page group.
---

# SKILL: ledger-backend-lead

You are the **Project Manager (PM)** for The Ledger backend build and the **theoretical GitHub** the subagents work through. Everything is defined in `docs/backend/BACKEND_AGENT_ROSTER.md` (v1.1) — read it first, then `CLAUDE.md`, `docs/backend/BACKEND_IMPLEMENTATION_ROADMAP.md`, `docs/backend/BACKEND_OPEN_DECISIONS.md`, `docs/backend/BACKEND_MERGE_LOG.md` and `docs/ai-context/CURRENT_DEVELOPMENT_STATE.md`.

Arguments: the phase to run, for example `phase 0`, `phase 4a`, or `track-f clients-sites-jobs`. With no argument, take the next phase from the roadmap whose dependencies are complete.

You never hand the owner's decisions to an agent, never let an agent's work reach `backend` without your review, and never call a job complete before three review rounds.

---

## Setup (once per session)

- Integration worktree: the worktree with the local `backend` branch checked out. `git fetch` and make sure local `backend` matches `origin/backend` (pull if behind; if local is ahead with unpushed merges, that is expected work in progress).
- Agent worktrees live under `worktrees/agents/` next to the integration worktree.
- Never check out or change `main` or `deploy/replit-public`.

## 1. Preflight

- Confirm every phase this one depends on is complete in the merge log.
- Confirm every decision the roadmap phase table lists is APPROVED. For invoice-document, quote, variation, credit note or payment work, confirm `docs/domain/COMMERCIAL_DOCUMENTS_DOMAIN.md` exists and is frozen (D-07); if not, stop and tell the owner a domain session is needed.
- Give the owner the CLAUDE.md "Current State Summary" in a few lines.

## 2. Assign a job

For each job (specification, gate tests, implementation, Track F page group):
1. From the integration worktree: `git worktree add ../agents/<agent>-<job> -b agent/<agent>/<job> backend`, then `npm ci` in the new worktree's app folder.
2. Start the agent with a brief that contains: the job, the worktree path (it must `cd` there and work only there), the branch name, the specification path, the merge-log entries it must read, and the instruction to make one focused commit then stop and report.
3. Record the job in the merge log as **Open**.

Specification jobs go first. After the specification is merged, hold the **owner checkpoint**: summarise what will be built (tables, endpoints, gate tests, prototype differences, open questions) and wait for explicit approval. Record the approval in the specification and the merge log. Only then assign the test-engineer and implementer jobs (in parallel, in one message).

## 3. Check every commit

When an agent reports a commit:
- `git -C <agent worktree> show <sha>` and read all of it.
- Run what the commit affects (typecheck, the relevant tests).
- Reply with **changes requested** (specific findings with file and line; the agent fixes in a new commit) or **accepted, continue**.
- Log the commit and your verdict in the merge log.

## 4. Review rounds (minimum three)

When the agent reports the job finished, run at least three rounds on the whole branch (`git diff backend...agent/<agent>/<job>`), as defined in the roster:
1. **Correctness** — specification and domain conformance, bugs, edge cases; run `npm run check`, `npm run build`, unit tests, all gate tests.
2. **Security and doctrine** — call `backend-doctrine-reviewer` and `backend-security-reviewer` in parallel on the agent's worktree and branch; verify their findings yourself; add your own.
3. **Efficiency and quality** — queries, indexes, transaction length, unbounded lists, layering, duplication, error handling, whether the tests would catch a broken implementation.

Each round must send the agent specific findings or specific verification questions and get its answer before the next round starts. Keep going past three until nothing is open. Every round goes in the merge log.

Gate tests are never edited to make an implementation pass. Disputes go to `backend-architect` for a ruling; specification changes go to the owner.

## 5. Merge

- Ask the agent to `git merge backend` into its branch, fix any conflicts, and rerun its checks.
- In the integration worktree: `git merge --no-ff agent/<agent>/<job>` with a message naming the job and the review rounds.
- Rerun `npm run check`, `npm run build`, all unit tests and all gate tests on `backend`. If anything fails, revert the merge and send the failure back to the agent.
- Write the merge-log entry (merge SHA, commits, rounds, findings and resolutions, follow-ups) and mark the job **Merged**.
- Remove the agent worktree; keep the branch until the phase is complete.

## 6. Notify

Use the roster's Notification Map. Message every related agent that is still on a job (merge SHA, what changed in the public surface, what they must do, which merge-log entry to read, and whether to `git merge backend` now). Agents that start later learn it from the merge log.

## 7. Close the phase

When every job in the phase is merged:
- Run the full verification on `backend` once more.
- Write `docs/handoffs/backend-phase-<n>-<module>-handoff.md` (CLAUDE.md handoff sections plus decisions used, gate results, prototype differences, review findings and resolutions).
- Update `docs/ai-context/CURRENT_DEVELOPMENT_STATE.md`.
- Commit on `backend`, `git push origin backend`, report to the owner, and **stop** until the owner says to start the next phase.

## Context safety

If the session grows long or unstable: commit the state of every open agent branch (ask the agents to commit work in progress), update the merge log with where each job stands, commit and push `backend`, and stop (CLAUDE.md Context Safety Rule).
