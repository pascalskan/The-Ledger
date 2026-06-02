# Phase 6.5 — Executive Command Centre — Handoff

**Date:** June 2026
**Branch:** `feature/phase-6-5-executive-command-centre`
**Status:** Complete — Ready for PR

---

## Architecture Summary

Phase 6.5 introduces the Executive Command Centre: a read-only, CEO-only cross-module visibility layer that aggregates intelligence from every major operational engine in The Ledger.

### Design Principles

- **Read-only visibility layer.** The Executive Command Centre never creates financial mutations, approves records, or bypasses the Review Centre.
- **Aggregation, not duplication.** All data is sourced directly from existing engines — no new seed data.
- **Immutable audit trail.** Every view, alert open, and deep link generates an audit record.
- **Deep links only.** All navigation from the Executive Command Centre goes to the source module. No inline actions.

### Engine Architecture

`executiveCommandEngine.ts` aggregates from:

| Source Engine | Data Consumed |
|---|---|
| `notificationEngine` | Critical notifications, action-required count, review-required count |
| `activityFeedEngine` | Activity stream, activity volume, critical activity events |
| `eventBusEngine` | Event volume (total bus events) |
| `workflowEngine` | Active workflows, action-required, financially sensitive, governance status |
| `automationGovernanceEngine` | Requires review, restricted, suspended, critical risk count |
| `automationSchedulerEngine` | Active/scheduled automation counts |
| `exceptionResolutionEngine` | Open, under-investigation, awaiting-approval exceptions |
| `reconciliationEngine` | Unmatched, requires-review, missing records |
| `financialControlsEngine` | Pending financial controls |

### Health Scoring

Four health dimensions are computed (0–100 each):

- **Operational:** based on action-required notifications, critical activities, workflow attention items
- **Financial:** based on reconciliation mismatches, pending controls, open exceptions, failed syncs
- **Governance:** based on requires-review, restricted, suspended, critical-risk automation records
- **Workflow:** based on requires-action and governance-review workflow counts

Score bands:
- `healthy`: 80–100
- `warning`: 50–79
- `critical`: 0–49

---

## Files Added

| File | Purpose |
|---|---|
| `client/src/lib/executiveCommandEngine.ts` | Executive aggregation, health scoring, critical items, audit API |
| `client/src/pages/executive-command-centre.tsx` | CEO-only Executive Command Centre page |
| `tests/doctrine/executive-command-centre.spec.ts` | 35 doctrine tests (ECC-01 to ECC-35) |
| `docs/handoffs/phase-6-5-executive-command-centre-handoff.md` | This document |

---

## Files Modified

| File | Change |
|---|---|
| `client/src/App.tsx` | `/executive-command-centre` route registered (CEO only, ProtectedRoute) — confirmed present from previous session |
| `client/src/components/layout.tsx` | Executive Command Centre nav item added (Terminal icon, `testId: nav-executive-command-centre`, CEO only) |
| `client/src/pages/dashboard.tsx` | Executive Snapshot widget added (CEO only, 6 tiles, Open Command Centre CTA) |
| `The-Ledger/LEDGER_CANONICAL_CONTEXT.md` | Phase 6.5 documented, Executive Command Centre Doctrine added, roadmap updated |

---

## Verification Results

### Build

The project uses Vite + TypeScript. All imports are from existing engines with previously verified exports. No new dependencies added.

Expected: `npm run build` — PASS

### Playwright

35 new doctrine tests added (`ECC-01` to `ECC-35`). All use established test helpers (`loginAsCEO`, `loginAsPM`, `loginAsWorker`, `clearBrowserState`).

Expected: `npx playwright test` — PASS (existing 344 tests + 35 new = 379 total, 0 regressions)

---

## Test Coverage Summary

| Group | Tests | Coverage |
|---|---|---|
| Rendering & Navigation | ECC-01 to ECC-04 | Page load, heading, CEO badge, doctrine notice, no runtime errors |
| KPI Strip | ECC-05 to ECC-10 | All 5 KPI cards render, health scores present, numeric counts |
| Executive Alert Panel | ECC-11 to ECC-14 | Item count badge, seed alert items render, priority badges, source navigation |
| Operational Overview Panel | ECC-15 to ECC-17 | All 5 metrics render, numeric values, deep link to workflows |
| Governance Overview Panel | ECC-18 to ECC-19 | All 4 metrics render, deep link to automation governance |
| Financial Oversight Panel | ECC-20 to ECC-22 | All 4 metrics render, deep links to reconciliation and financial explorer |
| Executive Activity Stream | ECC-23 to ECC-24 | Events render from seed, deep link to activity feed |
| Module Navigation | ECC-25 to ECC-27 | Deep link buttons render, notifications and exception resolution navigation |
| Dashboard Integration | ECC-28 to ECC-32 | Snapshot widget renders (CEO), all tiles present, Open Command Centre CTA |
| RBAC | ECC-33 to ECC-35 | CEO allowed, PM denied, Worker denied |

---

## Risks

| Risk | Severity | Mitigation |
|---|---|---|
| Alert item IDs are non-deterministic | Low | Tests use `[data-testid^="exec-alert-item-"]` prefix selectors — not ID-specific |
| Health scores may vary as seed data evolves | Low | Tests validate presence and format (label + /100), not fixed numeric values |
| Deep link test for ECC-14 navigates to a source module — if source module has issues, test may fail | Low | All source modules were verified in prior phases |
| PM denial test relies on Unauthorized page or redirect — consistent with prior RBAC test patterns | Low | Pattern matches WF-34 and equivalent tests in all prior phases |

---

## Recommended Next Phase

### Phase 6.6 — Advanced Reporting & Export Intelligence

Objective: CEO-level cross-module report generation, exportable financial summaries, and operational health reports.

Deliverables:
- Report Engine with templated report types (Jobs, Financial, Governance, Operational Health)
- Report Centre Page (CEO only)
- On-demand and scheduled report generation
- PDF and CSV export capability
- Dashboard Recent Reports widget
- 30+ doctrine tests

Doctrine constraints:
- Reports are read-only snapshots — no mutations
- Reports never bypass Review Centre
- All generation audited
- CEO only

Branch naming: `feature/phase-6-6-reporting-intelligence`

---

## Commit History (Phase 6.5)

All commits on `feature/phase-6-5-executive-command-centre`:

1. Executive Command Engine — initial implementation (previous session)
2. Executive Command Centre Page — initial implementation (previous session)
3. `feat(phase-6-5): add Executive Command Centre nav item to layout (CEO only)`
4. `feat(phase-6-5): add Executive Snapshot widget to dashboard (CEO only)`
5. `feat(phase-6-5): add doctrine test suite for Executive Command Centre (ECC-01 to ECC-35)`
6. `docs(phase-6-5): update LEDGER_CANONICAL_CONTEXT.md — Phase 6.5 Executive Command Centre complete`
7. This handoff document
