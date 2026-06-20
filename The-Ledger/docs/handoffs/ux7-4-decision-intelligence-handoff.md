# UX-7.4 — DECISION INTELLIGENCE — HANDOFF

Date: June 20, 2026
Branch: `feature/ux7-review-centre-enhancement` (UX-7 programme branch)
Status: **COMPLETE — UX-7.4 only.** UX-7 remains in progress. Build green; Playwright to be run by the repository owner.

---

## Summary

UX-7.4 makes the **consequence of a decision visible before it is made**, answering **"What happens if I approve this?"** — without changing approval behaviour. The platform surfaces impact; it never makes the decision.

## What Was Added

### 1. Decision Intelligence Engine (new)
`client/src/lib/reviewDecisionIntelligenceEngine.ts` — pure/deterministic, built on UX-7.1's `ReviewExposureRecord` + `REVIEW_EXPOSURE_SEED`:
- `computeReviewImpact(record)` → financial breakdown (revenue generated/delayed/blocked; cost expense/material/equipment; payroll labour/payroll/timesheet; net).
- `aggregateBreakdowns`, `totalRevenue/Cost/Payroll`.
- `computeJobImpact(jobId)` → profitability, margin %, exposure, revenue/cost recognition.
- `computeClientImpact(jobId)` → billing impact, invoice-readiness-blocked, revenue-timing-at-risk.
- `computeApprovalPreview(jobId)` → Approve / Reject / Correct outcomes (headline + consequences).
- `computeBatchDecisionImpact(records)` → totalRevenue/Payroll/Cost + profitability impact.
- `computeExecutiveImpactInsights()` → e.g. "Approving these reviews releases £X of billable revenue", payroll share, high-margin jobs awaiting approval, invoice-readiness delay.
- `getJobDecisionIntelligence(jobId)` → convenience bundle for the panel.

### 2. Review Decision Panel (new)
`client/src/components/review/ReviewDecisionPanel.tsx` — read-only per-job intelligence:
- **Financial Impact Panel** (Revenue / Cost / Payroll columns).
- **Job Impact Summary** (profitability, margin, exposure, revenue/cost recognition).
- **Client Impact Summary** (billing, invoice readiness, revenue timing).
- **Decision Comparison View** — Approve / Reject / Correct side-by-side, each with headline + consequences. No actions taken from this view.
- **Executive Impact Insights**.

### 3. Review Detail integration
`client/src/pages/review-detail.tsx` — mounts `<ReviewDecisionPanel jobId=… />` above the review list. Approval controls, tabs, batch tools and statuses unchanged.

### 4. Batch Decision Intelligence (extends UX-7.3)
`client/src/components/review/BatchActionsBar.tsx` — the batch confirmation dialog now shows aggregated **Total revenue / costs / payroll affected** and a **Total profitability impact** line before batch approval.

## Doctrine Compliance

| Doctrine | Finding |
|---|---|
| **Approval** | PASS — no automatic decisions. Decision intelligence is informational; the comparison view exposes no buttons (REV-DI-06/10). Existing approve/reject/correct controls unchanged (REV-DI-09). |
| **Review Centre** | PASS — nothing bypasses review; the engine only projects from existing review data. |
| **Financial Integrity** | PASS — no financial mutations. All figures are read-only projections shown before any approval. |
| **Audit** | PASS — audit behaviour unchanged; this phase adds no mutations and no new audit paths. |

## Files Created

- `client/src/lib/reviewDecisionIntelligenceEngine.ts`
- `client/src/components/review/ReviewDecisionPanel.tsx`
- `tests/doctrine/review-decision-intelligence.spec.ts` (REV-DI-01…10)
- `docs/handoffs/ux7-4-decision-intelligence-handoff.md` (this document)

## Files Modified

- `client/src/pages/review-detail.tsx` — decision panel mount.
- `client/src/components/review/BatchActionsBar.tsx` — aggregated profitability impact in the confirm dialog.
- `docs/ai-context/LEDGER_CANONICAL_CONTEXT.md` — UX-7 row (7.4 complete).
- `docs/ux/UX_REDESIGN_PROGRAMME.md` — UX-7 status + tracker row.

## Tests Added

`tests/doctrine/review-decision-intelligence.spec.ts` — 10 tests: decision panel render, financial impact (revenue/cost/payroll), job impact, client impact, comparison view (Approve/Reject/Correct), comparison-takes-no-action, executive insights, batch profitability impact, approval controls unchanged, decision panel exposes no approval controls.

## Verification Results

- Build (`npm run build`): **PASS**.
- `tsc --noEmit`: the new engine and component introduce **zero** type errors. Remaining errors are pre-existing (the original `review-detail.tsx` `worker-report`/`materialsUsed` block); the project gate is the Vite build, which passes.
- Playwright: new suite authored; UX-7.1/7.2/7.3 and existing review flows preserved by inspection. Full-suite run pending the owner's local run.

## Notes / Design Decisions

- Decision intelligence reuses the UX-7.1 read-only exposure seed (same source as the dashboard/priority/batch layers), so impact figures are deterministic and consistent across the Review Centre. The existing `profitabilityEngine` remains available for future wiring but is not required here.
- The decision panel is rendered per job (the review-detail page is job-scoped); the comparison view aggregates the job's pending reviews.

## Outstanding Work / Next Steps

1. Owner: run the full Playwright suite locally and confirm green.
2. **UX-7.5 — next target** within the Review Centre Enhancement programme.
3. Do not merge UX-7 until the programme (or an agreed subset) is complete and the owner approves.
