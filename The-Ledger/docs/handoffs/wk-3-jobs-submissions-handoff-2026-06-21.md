# WK-3 — Jobs & Submissions — Handoff

Date: 2026-06-21
Branch: `feature/workstream-c-worker-experience`
Status: **COMPLETE — Build PASS. Pending owner Playwright run.**

---

## Current State Summary

**Roadmap position**: Workstream C — Worker Experience, Phase WK-3 of 7

**Build**: PASS (`npm run build`, 12.04s, 0 errors)
**Playwright**: Pending owner local run (per project workflow — model does not run tests in-session)
**Branch**: `feature/workstream-c-worker-experience` (single workstream — no new branch, no new PR)

WK-3 resolves the most important operational defects from the WK-1 audit: every
worker action now enters the offline queue → Review Centre pipeline, and the
worker app runs on a **single submission architecture**.

---

## WK-1 Findings Addressed

| WK-1 Finding | Severity | Resolution |
|---|---|---|
| Log Issue button is dead | Critical | Functional bottom-sheet → `issue-log` review item |
| Shift end loses hours (`endShift` TODO/console only) | Critical | `endShift()` now **returns** the captured shift; job-detail submits a `timesheet` |
| Report hours hardcoded to `0` | Critical | Hours read from shift timer, editable, flow into `laborEntries[0].hours` |
| No expense submission | High | Expenses section in report → `expenses[]` payload |
| Photo upload uses legacy `workerStore` (lost on refresh) | High | Routed through `offlineQueueStore`; persists & replays; `alert()` → toast |
| Two competing submission systems | High | `workerStore.ts` **deleted**; everything on `offlineQueueStore` |

---

## Store Consolidation Decisions

**Goal: one queue, one replay mechanism, one persistence path, one Review Centre ingress.**

- Added `submitWorkerItem(reviewItem)` to `offlineQueueStore` — the single ingress for
  all worker-generated submissions:
  - **Offline** → `addToQueue` (pending) → existing `processQueueBatch` bridge replays to
    Review Centre via `addReviewItemDirect` (idempotent on `sourceQueueId`).
  - **Online** → `addReviewItemDirect` immediately + a `synced` queue record for history.
- `WorkerMobileLayout` migrated off `workerStore` onto `offlineQueueStore`
  (`isOffline` / `setOfflineMode`, real pending-sync count). The offline banner now
  toggles the **real** offline state and reflects the **real** queue depth.
- **`client/src/lib/workerStore.ts` deleted.** No remaining references in the codebase.
- `shiftStore.endShift()` no longer logs-and-discards. It returns an `EndedShift`
  snapshot (`jobId`, `workerId`, `startedAt`, `endedAt`, `totalDurationSeconds`) so the
  caller builds and submits the timesheet. Pure store, no cross-store import.

### Canonical Submission Flow (post-WK-3)

```
Worker action (issue / photo / timesheet)
  → submitWorkerItem(reviewItem)
      offline → offlineQueueStore.queue (persisted) → syncQueue → addReviewItemDirect → Review Centre
      online  → addReviewItemDirect → Review Centre (+ synced queue record)

Report submission (notes / materials / hours / expenses / uploads)
  → offline → offlineQueueStore.addToQueue → replay → Review Centre
  → online  → addReviewItem → Review Centre
```

All paths land on `pending` Review Centre items. No path bypasses approval.

---

## Submission Architecture Changes

- **Log Issue** (`job-detail.tsx`): bottom sheet with priority (Low/Medium/High/Emergency)
  + description → `type: "issue-log"` review item, `jobId` + `workerId` attributed.
- **Photo Upload** (`job-detail.tsx`): builds a `worker-report` review item carrying a
  single `general` upload payload; submitted via `submitWorkerItem`. Toast replaces `alert()`.
- **Shift → Timesheet** (`job-detail.tsx` + `shiftStore.ts`): End Shift captures the shift
  and submits a `type: "timesheet"` review item with `laborEntries[0].hours` derived from
  the live timer and `shiftStart`/`shiftEnd` bounds.
- **Report hours** (`report.tsx`): pre-filled from `shiftStore.elapsedTime` when the report
  is opened for the actively-clocked job; editable; flows into `laborEntries`.
- **Report expenses** (`report.tsx`): add/remove rows (category, amount, description) → fed
  into `expenses[]`; remain `pending`, no financial mutation.

---

## Files Changed

### Created
| File | Purpose |
|---|---|
| `tests/doctrine/worker-jobs-submissions.spec.ts` | WK3-01 … WK3-09 doctrine tests |
| `docs/handoffs/wk-3-jobs-submissions-handoff-2026-06-21.md` | This document |

### Modified
| File | Change |
|---|---|
| `client/src/lib/offlineQueueStore.ts` | Added `submitWorkerItem` — consolidated submission ingress |
| `client/src/lib/shiftStore.ts` | `endShift()` returns `EndedShift` snapshot (no data loss) |
| `client/src/pages/worker/job-detail.tsx` | Log Issue sheet, photo upload fix, timesheet on shift end, toasts, testids; removed `workerStore` |
| `client/src/pages/worker/report.tsx` | Hours field (shift-prefilled), Expenses section; real `hours`/`expenses` in payload |
| `client/src/components/WorkerMobileLayout.tsx` | Migrated to `offlineQueueStore`; banner testid |

### Deleted
| File | Reason |
|---|---|
| `client/src/lib/workerStore.ts` | Legacy non-persisted store — replaced by `offlineQueueStore` |

---

## Tests (WK3-01 … WK3-09)

| Test | Assertion |
|---|---|
| WK3-01 | Log Issue enters the offline queue |
| WK3-02 | Issue submission survives a hard refresh |
| WK3-03 | Shift end creates a `timesheet` submission |
| WK3-04 | Report hours populate from entered value (not `0`) |
| WK3-05 | Expense enters the queue with its amount |
| WK3-06 | Photo upload survives a hard refresh |
| WK3-07 | Offline replay drains the queue to `synced` on reconnect |
| WK3-08 | Replayed submission reaches the persisted Review Centre ingress |
| WK3-09 | Submission remains `pending` — no financial mutation before approval |

Tests read the persisted `ledger-offline-queue` and `ledger-direct-review-items` stores to
prove durability and Review Centre ingress.

---

## Doctrine Compliance

| Doctrine | Status |
|---|---|
| **Approval Doctrine** | PASS — all submissions land `pending`; no approved financial record created |
| **Review Centre Protection** | PASS — single ingress (`addReviewItemDirect`) for every path |
| **Audit Doctrine** | PASS — shift hours now captured & submitted (no silent loss); each item carries who/what/when/job |
| **Job Attribution** | PASS — every submission carries `jobId` + `workerId` |
| **Financial Integrity** | PASS — hours no longer zero; expenses informational until approval |
| **RBAC** | PASS — worker sees no financial data; submissions remain operational |

---

## Verification Results

| Check | Result |
|---|---|
| `npm run build` | **PASS** (12.04s, 0 errors) |
| `workerStore` references | 0 (file deleted) |
| Existing worker test selectors (`Open Job`, `Submit Report`, `Save`, `btn-sign-out`) | Preserved |
| Playwright | Pending owner local run |

> Note: a raw `tsc --noEmit` surfaces pre-existing repo-wide type errors (finance,
> analytics, `mockData` duplicate identifiers) that exist on `main` and are unrelated to
> WK-3. The project's official gate is `npm run build`, which passes.

---

## Outstanding Work

1. **Owner**: run Playwright locally; confirm WK3-01 … WK3-09 and existing worker tests pass.
2. **Next session**: WK-4 — Offline & Sync (remove the report-page debug "Simulate Offline"
   affordance now that the layout banner owns offline state; per-CTA offline badges; sync
   status surfaced on Home and job cards; end-to-end offline tests across all submission types).

## WK-4 Recommendations

- Remove the duplicate "Simulate Offline / Reconnection" toggle in `report.tsx` header — the
  `WorkerMobileLayout` banner is now the single offline control.
- Add a "pending sync" badge to job cards on My Jobs / Home for jobs with queued items.
- Surface last-sync time + total pending count on the Home screen.
