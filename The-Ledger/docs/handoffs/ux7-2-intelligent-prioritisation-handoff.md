# UX-7.2 — INTELLIGENT PRIORITISATION — HANDOFF

Date: June 20, 2026
Branch: `feature/ux7-review-centre-enhancement` (UX-7 programme branch)
Status: **COMPLETE — UX-7.2 only.** UX-7 remains in progress. Build green; Playwright to be run by the repository owner.

---

## Summary

UX-7.2 transforms the Review Centre from a primarily chronological list into an **intelligent decision queue**, answering **"What should I review first?"** — without changing any approval behaviour.

Core principle (enforced throughout): **prioritisation influences visibility, never approval outcomes.** Nothing is auto-approved, auto-rejected or auto-corrected.

## What Was Added

### 1. Review Priority Engine (new)
`client/src/lib/reviewPriorityEngine.ts` — pure, deterministic, built on UX-7.1's `ReviewExposureRecord` + `REVIEW_EXPOSURE_SEED`:
- `computeReviewPriority(record)` → 0–100 score + 4-tier category + named **contributing factors**. Factors: time pressure (vs SLA), SLA-breach bonus, financial materiality, revenue/payroll emphasis, review-type weight, job risk, governance (CEO-reserved), client importance.
- 4 categories — **Critical / High / Medium / Low** — with labels, colours and helpers (`getPriorityMeta`, `comparePriorityCategory`, `PRIORITY_CATEGORIES`).
- `computePriorityQueue()` → pending reviews, most-urgent-first, with 1-based `queuePosition`.
- `computePriorityDistribution()`, `computePriorityInsights()`, `computeExecutiveAttention()`.
- `getJobPriority()` / `getJobPriorityRank()` (for the queue toggle + job badges) and `getReviewPriorityContext()` (for the detail view).

### 2. Review Priority Panel (new)
`client/src/components/review/ReviewPriorityPanel.tsx` — the CEO's **Recommended Work Queue** (read-only):
- Priority **distribution** KPIs (Critical/High/Medium/Low counts + %).
- Priority **insights** ("N classified as Critical", payroll share, revenue exposure total, critical-over-SLA count, …).
- The priority-ordered **queue** table (#, review, priority, score, type, job, financial impact, age).
- **Executive Attention** section: Critical · Revenue at Risk · Payroll Sensitive · Oldest High-Priority.
- Exports a reusable `<PriorityBadge category=… />`.

### 3. Review Centre page integration
`client/src/pages/review.tsx`:
- Mounts `<ReviewPriorityPanel />` for CEOs (below the UX-7.1 dashboard).
- **Standard Order / Priority Order** toggle (CEO-only) on the "Jobs Requiring Review" table — Standard preserves the original order; Priority sorts by aggregated job priority. Existing ordering is **not** removed.
- A **Priority** column with a per-job `<PriorityBadge>`.

### 4. Review Detail enhancements
`client/src/pages/review-detail.tsx` — a new "Review Priority" card (informational only): priority category, **priority score**, **queue position**, financial exposure, and a **contributing-factors** breakdown. Approval controls and tabs unchanged.

## Doctrine Compliance

| Doctrine | Finding |
|---|---|
| **Approval** | PASS — prioritisation only orders/highlights. No surface here approves, rejects or corrects (verified by REV-PRI-10). The approve/reject controls in detail are untouched (REV-PRI-11). |
| **Review Centre** | PASS — nothing bypasses the Review Centre. The priority layer reads the UX-7.1 exposure projection; the live `reviewItems` queue remains the approval gateway. |
| **Financial Integrity** | PASS — no financial mutations. Scores and exposure are read-only derivations. |
| **Audit** | PASS — no records created, edited or suppressed. |
| **RBAC** | PASS — priority panel + order toggle are CEO-only; PMs unaffected (REV-PRI-09). |

## Files Created

- `client/src/lib/reviewPriorityEngine.ts`
- `client/src/components/review/ReviewPriorityPanel.tsx`
- `tests/doctrine/review-prioritisation.spec.ts` (REV-PRI-01…11)
- `docs/handoffs/ux7-2-intelligent-prioritisation-handoff.md` (this document)

## Files Modified

- `client/src/pages/review.tsx` — priority panel mount, order toggle, job priority column/badges.
- `client/src/pages/review-detail.tsx` — priority detail card (category/score/queue position/factors/exposure).
- `docs/ai-context/LEDGER_CANONICAL_CONTEXT.md` — UX-7 row (7.2 complete).
- `docs/ux/UX_REDESIGN_PROGRAMME.md` — UX-7 status + tracker row.

## Tests Added

`tests/doctrine/review-prioritisation.spec.ts` — 11 tests: priority panel/queue render, four-category distribution, queue rows/scores/ordering, insights, executive-attention buckets, Standard/Priority toggle, job-row badges, detail priority (score + factors), PM RBAC exclusion, visibility-only (no approve/reject in panel), and approval workflow intact.

## Verification Results

- Build (`npm run build`): **PASS**.
- `tsc --noEmit`: the new engine and component introduce **zero** type errors. Remaining errors are pre-existing across the codebase (incl. the original `review-detail.tsx` `worker-report`/`materialsUsed` handling); the project gate is the Vite build, which passes.
- Playwright: new suite authored; UX-7.1 + existing review flows preserved by inspection. Full-suite run pending the owner's local run.

## Notes / Design Decisions

- The priority engine reuses UX-7.1's read-only exposure seed rather than the store's approval-bearing `reviewItems`, so prioritisation can never touch approval state. The toggle and badges on the live job table derive a per-job aggregate priority from that same engine.
- 4-tier priority (UX-7.2) supersedes the simple 3-tier hint baked into UX-7.1's `DerivedReview`; the dashboard's existing "Requires Attention" queue is left intact, and the new Recommended Work Queue is the authoritative prioritised view.

## Outstanding Work / Next Steps

1. Owner: run the full Playwright suite locally and confirm green.
2. **UX-7.3 — next target** within the Review Centre Enhancement programme.
3. Do not merge UX-7 until the programme (or an agreed subset) is complete and the owner approves.
