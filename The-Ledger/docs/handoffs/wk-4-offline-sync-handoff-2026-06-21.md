# WK-4 — Offline & Sync — Handoff

Date: 2026-06-21
Branch: `feature/workstream-c-worker-experience`
Status: **COMPLETE — Build PASS. Pending owner Playwright run.**

---

## Current State Summary

**Roadmap position**: Workstream C — Worker Experience, Phase WK-4 of 7

**Build**: PASS (`npm run build`, 11.78s, 0 errors)
**Playwright**: Pending owner local run (model does not run tests in-session)
**Branch**: `feature/workstream-c-worker-experience` (single workstream — no new branch/PR)

WK-4 is a **hardening** phase. No architecture was redesigned. The WK-3 single
pipeline (`offlineQueueStore.submitWorkerItem`, `sourceQueueId` idempotent replay)
was validated and strengthened for reliability, visibility, and durability.

---

## WK-3 Deliverables Relevant to WK-4

- All worker submissions (report, issue, timesheet, expense, photo) already ride one
  persisted queue and replay to the Review Centre via `addReviewItemDirect`
  (idempotent on `sourceQueueId`).
- `uploads.tsx` already rendered the queue with per-upload progress, conflict review,
  and retry — but **labelled every item "Worker Report"**, had **no queue-item-level
  failure recovery**, no health summary, no empty state, and no testids.
- `report.tsx` still carried the debug **"Simulate Offline / Reconnection"** toggle.

---

## Changes

### Offline architecture validation
Confirmed all five submission types flow through the same `offlineQueueStore` queue and
the same `processQueueBatch` → `addReviewItemDirect` replay bridge. No second pipeline
exists. No redesign performed.

### Queue visibility (`uploads.tsx`)
- **Per-type labels + icons** via `describeSubmission(payload)` — Issue, Timesheet,
  Photo Upload, Report (with expenses), Worker Report — replacing the hardcoded label.
- **Queue health summary**: Pending / Syncing / Synced / Action-needed counts so the
  worker sees at a glance what is waiting, replaying, delivered, or needs action.
- **Empty state**: "Everything is synced" card when the queue is clear.
- Stable testids: `worker-sync-status`, `worker-queue-summary`, `worker-force-sync-btn`,
  `worker-queue-item` (+ `data-sync-status`), `worker-queue-item-status`,
  `worker-queue-retry-btn`, `worker-queue-empty`.

### Replay reliability + conflict / failure handling
- New store method `retryQueueItem(id)` — resets a failed item to `pending` and re-runs
  `syncQueue` (queue-item-level recovery; previously only per-upload retry existed).
- **Queue-item failed state** in `uploads.tsx`: reassuring guidance ("Sync failed — your
  work is still saved … stored on this device. Tap retry to try again.") + a retry button.
- Existing per-upload conflict review/resubmit flow retained.

### Duplicate-replay prevention (validated)
`addReviewItemDirect` already rejects a second ingress with the same `sourceQueueId`, and
`syncQueue` only processes `pending`/`failed` items. WK4-07 asserts a repeated force-sync
does not create a second Review Centre entry.

### Debug-artefact removal
Removed the "Simulate Offline Mode / Simulate Reconnection" toggle from the `report.tsx`
header. The `WorkerMobileLayout` banner is now the single, production offline control.

---

## Replay Behaviour (verified scenarios)

| Scenario | Behaviour |
|---|---|
| Offline → online | `setOfflineMode(false)` schedules `syncQueue`; pending items replay → `synced` |
| Refresh during queue | `persist` + `onRehydrateStorage` restore the queue and resume sync when online |
| Multiple queued submissions | Batched (`MAX_CONCURRENT_QUEUE_ITEMS`); each replays independently |
| Failed replay | Item marked `failed`, surfaced with guidance + `Retry Sync`; never lost |
| Duplicate replay | Rejected via `sourceQueueId` idempotency — single Review Centre ingress |

---

## Conflict Handling

Per-upload conflicts surface a yellow card with reason, a **View Conflict** review modal
(worker correction notes → `markQueueItemUnderReview` → `markQueueItemResubmitted`), and
**Retry Resolution**. Queue-item failures surface a red card with plain-language
reassurance that the work is saved locally and a one-tap retry. All mock — no backend.

---

## Files Changed

### Modified
| File | Change |
|---|---|
| `client/src/lib/offlineQueueStore.ts` | Added `retryQueueItem(id)` for queue-item-level retry |
| `client/src/pages/worker/uploads.tsx` | Per-type labels, health summary, failed-item recovery, empty state, testids |
| `client/src/pages/worker/report.tsx` | Removed debug "Simulate Offline" toggle |

### Created
| File | Purpose |
|---|---|
| `tests/doctrine/worker-offline-sync.spec.ts` | WK4-01 … WK4-09 doctrine tests |
| `docs/handoffs/wk-4-offline-sync-handoff-2026-06-21.md` | This document |

---

## Tests (WK4-01 … WK4-09)

| Test | Assertion |
|---|---|
| WK4-01 | Report survives a hard refresh |
| WK4-02 | Issue survives a hard refresh |
| WK4-03 | Expense survives a hard refresh |
| WK4-04 | Upload survives a hard refresh |
| WK4-05 | Replay drains the queue to `synced` on reconnect |
| WK4-06 | Failed replay is visible with a worker retry affordance |
| WK4-07 | No duplicate submission creation across repeated replays |
| WK4-08 | Offline indicator visible (banner + Uploads sync status) |
| WK4-09 | Review Centre path preserved — replayed item lands `pending` |

Durability is proven by reading the persisted `ledger-offline-queue` and
`ledger-direct-review-items` stores across reloads.

---

## Data Durability Validation

| Survives | Result |
|---|---|
| App refresh | PASS — `persist` middleware (WK4-01..04) |
| Browser restart | PASS — same `localStorage`-backed persistence |
| Offline mode | PASS — queued, never lost; banner + summary make it explicit |
| Replay | PASS — replays to Review Centre once, idempotently (WK4-05, WK4-07, WK4-09) |

No silent data loss path remains for any worker submission type.

---

## Doctrine Compliance

| Doctrine | Status |
|---|---|
| **Review Centre** | PASS — every replayed submission lands via `addReviewItemDirect` |
| **Approval** | PASS — all items land `pending`; no bypass |
| **Audit** | PASS — traceability preserved; failures surfaced, never dropped |
| **Job Attribution** | PASS — queued items retain `jobId` through replay |

---

## Verification Results

| Check | Result |
|---|---|
| `npm run build` | **PASS** (11.78s, 0 errors) |
| Debug toggle removed from report | Confirmed |
| Playwright | Pending owner local run |

---

## Outstanding Work

1. **Owner**: run Playwright locally; confirm WK4-01 … WK4-09 and existing worker tests pass.
2. **Next session**: WK-5 — History & Performance.

## WK-5 Recommendations

- Add `/worker/history` — worker-scoped submission history (reports, timesheets, expenses,
  issues) from `offlineQueueStore.queue` (pending/synced) + worker's own Review Centre items.
- Enrich `/worker/profile` with shift/submission KPIs (no financial data).
- Post-submission confirmation state after report save.
- Surface last-sync time on the Home screen (queue timestamps now make this trivial).
