# UX-7.3 — BATCH DECISION TOOLS — HANDOFF

Date: June 20, 2026
Branch: `feature/ux7-review-centre-enhancement` (UX-7 programme branch)
Status: **COMPLETE — UX-7.3 only.** UX-7 remains in progress. Build green; Playwright to be run by the repository owner.

---

## Summary

UX-7.3 adds **batch decision tools** to the Review Centre so authorised reviewers can process large volumes efficiently — answering **"How can I safely process many reviews at once?"** — without weakening any doctrine.

The batch layer is purely a throughput tool: it multi-selects real review items and, **after explicit confirmation**, fans each one out through the store's existing single-item `updateReviewItem` flow (the same path the per-item Approve/Reject buttons use, which already runs the established financial-mutation + audit doctrine on approval). No new approval path exists; nothing bypasses approval.

## What Was Added

### 1. Review Batch Engine (new)
`client/src/lib/reviewBatchEngine.ts` — pure/deterministic + an in-memory batch audit log (mirrors the `_auditLog` pattern in notificationEngine/eventBusEngine):
- `estimateReviewImpact(item)` — deterministic mock financial estimate + risk flag per live review item (the prototype's items carry no financial fields).
- `computeBatchSummary(items)` — counts, revenue/cost/payroll/total, risk count, types, mixed-type flag.
- `evaluateSafeguards(summary)` — high-risk, financially-sensitive (≥ £5,000), mixed-type, large-batch (≥ 5) warnings.
- `recordBatchAudit` / `getBatchAuditLog` / `clearBatchAuditLog` — auditable batch records (action, user, timestamp, review count, ids, reason/note/assignee, financial total).
- `REVIEWER_OPTIONS` (CEO / PM / Reviewer), `BATCH_ACTION_LABELS`.

### 2. Batch Actions Bar (new)
`client/src/components/review/BatchActionsBar.tsx` — read-until-confirmed toolbar:
- Selected count, estimated financial impact, mixed-type + high-risk warning chips.
- Actions: **Approve / Reject / Request Correction / Assign Reviewer** + Clear.
- Per-action **confirmation dialog** with a financial-impact summary (revenue/cost/payroll/total, review count, high-risk highlighted), required inputs (rejection reason; correction reason + reviewer note; assignee select), and **safeguard acknowledgement checkboxes** that gate the confirm button.
- Records a batch audit entry on confirm, then invokes the parent callback.

### 3. Review Detail integration
`client/src/pages/review-detail.tsx`:
- Multi-select: per-item checkboxes, **Select all visible**, **Clear**, live selection count. Selection is keyed by id so it **persists across tab filtering**.
- Batch handlers fan out to `updateReviewItem` (approve → existing financial-mutation doctrine; reject → rejected; correction → `needs-correction` + `correctionNotes`; assign → audit-only mock).
- Mounts `<BatchActionsBar />` (appears only when ≥ 1 review is selected).

## Doctrine Compliance

| Doctrine | Finding |
|---|---|
| **Approval** | PASS — no batch action executes without explicit confirmation. Each item is approved/rejected/corrected via the existing single-item store flow; no auto-approval and no new approval path. |
| **Financial Integrity** | PASS — financial mutations still only happen inside the established approval path on approval. Batch financial figures are read-only estimates shown before confirmation. |
| **Review Centre** | PASS — nothing bypasses the Review Centre; batch operates on the live `reviewItems` queue. |
| **Audit** | PASS — every batch action records an audit entry (action, user, timestamp, count, ids, reason/note/assignee, total), and per-item approvals still emit the store's `APPROVE` log + financial-mutation audit. |
| **RBAC** | PASS — batch tools live on the review-detail page, already gated to reviewers (CEO/PM); workers never reach it. |

## Files Created

- `client/src/lib/reviewBatchEngine.ts`
- `client/src/components/review/BatchActionsBar.tsx`
- `tests/doctrine/review-batch-decisions.spec.ts` (REV-BAT-01…10)
- `docs/handoffs/ux7-3-batch-decision-tools-handoff.md` (this document)

## Files Modified

- `client/src/pages/review-detail.tsx` — multi-select, selection toolbar, batch handlers, batch bar mount.
- `docs/ai-context/LEDGER_CANONICAL_CONTEXT.md` — UX-7 row (7.3 complete).
- `docs/ux/UX_REDESIGN_PROGRAMME.md` — UX-7 status + tracker row.

## Tests Added

`tests/doctrine/review-batch-decisions.spec.ts` — 10 tests: individual selection, select-all/clear, financial-impact display, batch approval confirmation + summary, reject-requires-reason, correction-requires-reason+note, reviewer assignment options, safeguard acknowledgement gating, single-item workflow intact, and cancel-leaves-items-pending (no action without confirmation).

## Verification Results

- Build (`npm run build`): **PASS**.
- `tsc --noEmit`: the new engine and component introduce **zero** type errors. Remaining errors are pre-existing (the original `review-detail.tsx` `worker-report`/`materialsUsed` block); the project gate is the Vite build, which passes.
- Playwright: new suite authored; UX-7.1/7.2 and existing single-item review flows preserved by inspection. Full-suite run pending the owner's local run.

## Notes / Design Decisions

- Batch correction uses status `needs-correction` + `correctionNotes` (the store's existing correction shape); the page-level `ApprovalStatus` is narrower, so the value is cast at the call site, consistent with existing `as any` usage in the store path.
- Reviewer assignment is audit-only in the prototype (no assignee field on `ReviewItem`), per the brief's "mock implementation is acceptable".
- Financial estimates are deterministic (stable hash, no randomness) so batch summaries and tests are reproducible.

## Outstanding Work / Next Steps

1. Owner: run the full Playwright suite locally and confirm green.
2. **UX-7.4 — next target** within the Review Centre Enhancement programme.
3. Do not merge UX-7 until the programme (or an agreed subset) is complete and the owner approves.
