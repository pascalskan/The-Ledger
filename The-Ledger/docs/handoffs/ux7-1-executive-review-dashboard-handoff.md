# UX-7.1 — EXECUTIVE REVIEW DASHBOARD — HANDOFF

Date: June 20, 2026
Branch: `feature/ux7-review-centre-enhancement` (UX-7 programme branch; based on `main` after UX-6 PR #25 merge)
Status: **COMPLETE — UX-7.1 only.** UX-7 remains in progress. Build green; Playwright to be run by the repository owner.

---

## Summary

UX-7.1 is the first phase of UX-7 (Review Centre Enhancement). It turns the Review Centre from "a queue of submissions" into "the decision engine of the business" by adding a **CEO-only, read-only executive visibility layer** above the existing job queue, and read-only context to the review detail page.

The page now answers, at a glance: **"What decisions require my attention right now?"** — without changing a single approval behaviour.

## What Was Added

### 1. Executive Review Intelligence Engine (new)
`client/src/lib/reviewIntelligenceEngine.ts` — a pure, deterministic derivation layer:
- Canonical review taxonomy (Timesheets, Expenses, Inventory Usage, Equipment Usage, Reports, Uploads, QA Records).
- A read-only exposure seed (`REVIEW_EXPOSURE_SEED`) tied to the two demo jobs, spread across all seven categories, mirroring the UX-6 pattern of an engine-local executive seed (cf. `SEED_EXECUTION_HISTORY`).
- `computeReviewExecutiveModel()` → KPIs, financial exposure, requires-attention queue (priority-scored), reviews-by-type breakdown, workload summary, executive insights.
- `getJobReviewContext(jobId)` → per-job pending/history/exposure for the detail page.
- Helpers: `ageHoursOf`, `formatAge`, `formatGbp`.

### 2. Executive Review Dashboard component (new)
`client/src/components/review/ReviewExecutiveDashboard.tsx` — read-only presentation:
- **KPI strip (8):** Total Pending, Overdue, Revenue Awaiting, Cost Awaiting, Payroll Awaiting, High-Risk, Avg Review Age, Completed Today.
- **Financial Exposure panel:** revenue blocked, costs awaiting, payroll awaiting, total exposure, estimated profitability impact.
- **Requires Attention queue:** prioritised rows (Review ID, Type, Job, Financial Impact, Age, Risk, Priority) — no approval actions.
- **Reviews By Type:** all seven categories with counts + percentages.
- **Workload Summary:** received / approved / rejected / corrected today, backlog, throughput trend.
- **Executive Insights:** generated summaries (e.g. revenue exposure, payroll share, overdue count, throughput).

### 3. Review Centre page integration
`client/src/pages/review.tsx` — mounts `<ReviewExecutiveDashboard />` above the existing queue **for CEOs only** (`role-ceo`/`drole-ceo`). PMs keep the existing scoped queue. All existing markup, the job table, and the approve flow are untouched.

### 4. Review Detail enhancements (read-only)
`client/src/pages/review-detail.tsx` — a four-card context strip above the existing tabs: Financial Impact (blocked), Oldest Pending age, Priority indicator, Approval History summary. The approve/reject controls and tab behaviour are unchanged.

## Doctrine Compliance

| Doctrine | Finding |
|---|---|
| **Approval** | PASS — nothing in UX-7.1 approves, rejects or corrects. The dashboard exposes no approval controls (verified by test REV-EXE-10). All decisions still happen in the existing queue/detail flow. |
| **Financial Integrity** | PASS — no financial mutations. Exposure figures are read-only projections; nothing becomes financially real without approval. |
| **Review Centre** | PASS — nothing bypasses the Review Centre. The live `reviewItems` queue remains the sole approval gateway; the engine seed is a separate read-only projection. |
| **Audit** | PASS — no records are created, edited or suppressed. |
| **RBAC** | PASS — the executive layer is CEO-only; PMs are unaffected (verified by test REV-EXE-08). |

## Files Modified

- `client/src/pages/review.tsx` — CEO-only dashboard mount + `isCEO` derivation.
- `client/src/pages/review-detail.tsx` — read-only executive context strip.
- `docs/ai-context/LEDGER_CANONICAL_CONTEXT.md` — UX-6 → merged; UX-7 → in progress (7.1 complete).
- `docs/ux/UX_REDESIGN_PROGRAMME.md` — UX-7 status + tracker row.

## Files Created

- `client/src/lib/reviewIntelligenceEngine.ts`
- `client/src/components/review/ReviewExecutiveDashboard.tsx`
- `tests/doctrine/review-executive-dashboard.spec.ts` (REV-EXE-01…10)
- `docs/handoffs/ux7-1-executive-review-dashboard-handoff.md` (this document)

## Tests Added

`tests/doctrine/review-executive-dashboard.spec.ts` — 10 tests:
- REV-EXE-01 CEO sees dashboard above the preserved queue
- REV-EXE-02 KPI strip renders all eight metrics
- REV-EXE-03 Financial exposure panel
- REV-EXE-04 Requires-attention queue rows
- REV-EXE-05 Reviews-by-type lists all seven categories
- REV-EXE-06 Workload summary + throughput trend
- REV-EXE-07 Executive insights generated
- REV-EXE-08 PMs do **not** see the CEO dashboard (RBAC)
- REV-EXE-09 Review detail surfaces read-only context; approval controls intact
- REV-EXE-10 Dashboard is visibility-only — no approve/reject controls (Approval Doctrine)

## Verification Results

- Build (`npm run build`): **PASS**.
- `tsc --noEmit`: the new engine and component introduce **zero** type errors. The remaining errors are all pre-existing across the codebase (`mockData.ts`, `dashboard.tsx`, the original `review-detail.tsx` `worker-report`/`materialsUsed` handling, `reportingEngine.ts`, etc.) and predate this work; the project gate is the Vite build, which passes.
- Playwright: new suite authored; existing `review-approval.spec.ts` / `worker-to-review.spec.ts` flows are preserved by inspection (the job queue, "pending" text, and approve flow are unchanged). Full-suite run pending the owner's local run.

## Notes / Design Decisions

- The repository seed is intentionally sparse (2 demo jobs, 4 live review items). To give the executive view a credible cross-section without touching the approval-bearing `reviewItems` (and thus without risking the existing approval tests), the engine carries its own read-only executive seed — the same pattern UX-6 engines used. The live queue remains the source of truth for actual approvals.

## Outstanding Work / Next Steps

1. Owner: run the full Playwright suite locally and confirm green.
2. UX-7.2 — next target within the Review Centre Enhancement programme (e.g. flat age-sorted queue, slide-in review sheet, quick-approve for clean items, rejection-requires-note — per the UX-7 programme spec).
3. Do not merge UX-7 until the full programme (or an agreed subset) is complete and the owner approves.
