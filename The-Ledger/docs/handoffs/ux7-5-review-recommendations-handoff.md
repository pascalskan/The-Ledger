# UX-7.5 — REVIEW RECOMMENDATIONS — HANDOFF

Date: June 20, 2026
Branch: `feature/ux7-review-centre-enhancement` (UX-7 programme branch)
Status: **COMPLETE — UX-7.5 only.** UX-7 remains in progress. Build green; Playwright to be run by the repository owner.

---

## Summary

UX-7.5 surfaces **historical intelligence** to help reviewers decide better and faster, answering **"What would I normally do here?"** — without making the decision. Recommendations are guidance only: they never approve, reject, request corrections, or trigger workflows.

## What Was Added

### 1. Review Recommendation Engine (new)
`client/src/lib/reviewRecommendationEngine.ts` — pure/deterministic, built on UX-7.1's `ReviewExposureRecord` + `REVIEW_EXPOSURE_SEED`:
- `computeReviewRecommendation(record)` → recommendation type, confidence level + score, reason, similar decisions, risk.
- **Types:** Likely Approve · Likely Reject · Likely Correction · Requires Human Review (high financial impact / high-risk / governance-sensitive → human review).
- **Confidence:** Very High · High · Medium · Low (deterministic score from historical approval-rate consistency, reduced by risk / materiality / governance / SLA breach / revenue scrutiny).
- `getSimilarDecisions(type)` — stable per-category historical profile (approvals/rejections/corrections, approval rate, last occurrence).
- `computeRecommendationModel()` → recommendations, distribution, insights, executive guidance, high-confidence count.
- `getJobRecommendations(jobId)`, `getRecommendationFor(id)`, badge helpers (`getRecommendationMeta`, `getConfidenceBadge`).

### 2. Recommendation components (new)
`client/src/components/review/ReviewRecommendations.tsx`:
- Reusable `<RecommendationBadge>` and `<ConfidenceBadge>`.
- `<RecommendationDistributionPanel>` — distribution dashboard (4 types, counts + %), recommendation insights, executive guidance feed (CEO review page).
- `<JobRecommendationPanel>` — per-job detail panel: per-review recommendation, confidence, supporting rationale, similar decisions + historical patterns.

### 3. Integration
- `client/src/pages/review.tsx` — mounts `<RecommendationDistributionPanel />` (CEO).
- `client/src/pages/review-detail.tsx` — mounts `<JobRecommendationPanel />`.
- `client/src/components/review/ReviewPriorityPanel.tsx` — recommendation badge column in the priority queue.
- `client/src/components/review/ReviewExecutiveDashboard.tsx` — recommendation badge column in the attention queue.

## Doctrine Compliance

| Doctrine | Finding |
|---|---|
| **Approval** | PASS — no automatic approvals/rejections/corrections. Recommendation surfaces expose no action buttons (REV-REC-08). Existing approve/reject controls unchanged (REV-REC-09). |
| **Review Centre** | PASS — nothing bypasses review; recommendations only read existing review data. |
| **Financial Integrity** | PASS — no financial mutations; all figures are read-only projections. |
| **Audit** | PASS — audit behaviour unchanged; no mutations, no new audit paths. |

## Files Created

- `client/src/lib/reviewRecommendationEngine.ts`
- `client/src/components/review/ReviewRecommendations.tsx`
- `tests/doctrine/review-recommendations.spec.ts` (REV-REC-01…10)
- `docs/handoffs/ux7-5-review-recommendations-handoff.md` (this document)

## Files Modified

- `client/src/pages/review.tsx` — distribution panel mount (CEO).
- `client/src/pages/review-detail.tsx` — job recommendation panel mount.
- `client/src/components/review/ReviewPriorityPanel.tsx` — recommendation column in priority queue.
- `client/src/components/review/ReviewExecutiveDashboard.tsx` — recommendation column in attention queue.
- `docs/ai-context/LEDGER_CANONICAL_CONTEXT.md` — UX-7 row (7.5 complete).
- `docs/ux/UX_REDESIGN_PROGRAMME.md` — UX-7 status + tracker row.

## Tests Added

`tests/doctrine/review-recommendations.spec.ts` — 10 tests: distribution panel render, four recommendation types, insights, executive guidance, priority-queue badge visibility, detail recommendation/confidence/rationale, similar historical decisions, no approval controls in recommendation surfaces, approval controls unchanged, confidence badges in detail.

## Verification Results

- Build (`npm run build`): **PASS**.
- `tsc --noEmit`: the new engine and components introduce **zero** type errors. Remaining errors are pre-existing (the original `review-detail.tsx` `worker-report`/`materialsUsed` block); the project gate is the Vite build, which passes.
- Playwright: new suite authored; UX-7.1–7.4 and existing review flows preserved by inspection. Full-suite run pending the owner's local run.

## Notes / Design Decisions

- Recommendations reuse the UX-7.1 read-only exposure seed; "similar decisions" use a stable per-category historical profile (mock, deterministic) so output is reproducible and testable.
- Queue-level visibility was added by computing the recommendation on demand for each row (the queue records extend `ReviewExposureRecord`), so no extra state or recomputation pipeline was introduced.

## Outstanding Work / Next Steps

1. Owner: run the full Playwright suite locally and confirm green.
2. **UX-7.6 — next target** within the Review Centre Enhancement programme.
3. Do not merge UX-7 until the programme (or an agreed subset) is complete and the owner approves.
