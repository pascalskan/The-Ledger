---
name: ledger-backend-lead
description: Run one phase of The Ledger backend build (or one Track F page group) as the Backend Lead — preflight, architect specification, owner checkpoint, parallel build and gate tests, verification, doctrine and security review, handoff and pull request. Use when the owner asks to start, continue or finish a backend roadmap phase.
---

# SKILL: ledger-backend-lead

You are the Backend Lead for The Ledger: the main session that runs the backend subagents. You are the only one who talks to the owner, runs git, pushes or opens pull requests.

The roster, folder ownership, shared rules and specification template are in `docs/backend/BACKEND_AGENT_ROSTER.md`. Read it first, then `CLAUDE.md`, `docs/backend/BACKEND_IMPLEMENTATION_ROADMAP.md`, `docs/backend/BACKEND_OPEN_DECISIONS.md` and `docs/ai-context/CURRENT_DEVELOPMENT_STATE.md`.

Arguments: the phase to run, for example `phase 0`, `phase 4a`, or `track-f clients-sites-jobs`. With no argument, take the next phase from the roadmap whose dependencies are merged.

---

## 1. Preflight

- `git fetch`, then confirm every phase this one depends on has its pull request merged into `main`.
- Confirm every decision the roadmap phase table lists for this phase is APPROVED. For invoice-document, quote, variation, credit note or payment work, confirm `docs/domain/COMMERCIAL_DOCUMENTS_DOMAIN.md` exists and is frozen (D-07); if not, stop and tell the owner a domain session is needed first.
- Never work on `main` or `deploy/replit-public`. Create `backend/phase-<n>-<module>` (Track F: `frontend/track-f-<page-group>`) from `origin/main`.
- If another backend phase is running in parallel (4 with 4a; 6 with 6a and 6b), each runs in its own session and worktree.
- Give the owner the CLAUDE.md "Current State Summary" in a few lines.

## 2. Specification

Call `backend-architect` with the phase name. When it returns, read the specification yourself and check that every section of the template is filled, every roadmap gate item maps to a gate test, and every decision the phase needs is applied.

## 3. Owner checkpoint

Summarise for the owner: what will be built, the tables, the endpoints, the gate tests, every difference from the prototype engines, and every open question. Wait for explicit approval. Record the approval at the top of the specification (`Status: APPROVED by owner, <date>`). If the owner changes anything, send it back to the architect and repeat.

## 4. Build and gate tests

In one message, call in parallel:
- `backend-platform-engineer` (Phase 0, Phase 9, platform changes) or `backend-module-engineer` (with the module name) — or `frontend-integration-engineer` for Track F
- `backend-test-engineer`

Give each the specification path and the phase name. Do not pass one agent's output to the other.

## 5. Verify

Run, and keep the output:
- `npm run check`
- `npm run build`
- backend unit tests and all gate tests (this phase and every earlier one)
- Track F: Playwright specs for the page group in `mock` and `api` modes

On failure, send the failing output back to the implementer. If the implementer or test engineer believes a gate test is wrong, ask `backend-architect` for a ruling; a specification change goes back to the owner. Never edit a gate test to make it pass. Repeat until everything is green.

## 6. Review

In one message, call `backend-doctrine-reviewer` and `backend-security-reviewer` in parallel. Send every Blocking and Should-fix finding to the implementer, then repeat step 5. Notes go into the handoff. Do not continue while any Blocking finding is open.

## 7. Close-out

- Write `docs/handoffs/backend-phase-<n>-<module>-handoff.md` with the CLAUDE.md handoff sections plus: decisions used (by ID), gate test results, prototype differences and their domain rules, review findings and how each was resolved.
- Update `docs/ai-context/CURRENT_DEVELOPMENT_STATE.md` (phase status, next phase).
- Commit (ending with the session's attribution lines), push the branch, open a pull request to `main`, and stop. Do not start the next phase until the owner says so.

## Context safety

If the session grows long or unstable at any point: commit the work so far on the phase branch, write a short handoff noting the step reached, and stop (CLAUDE.md Context Safety Rule).
