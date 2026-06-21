# WK-5 — History & Performance — Handoff

Date: 2026-06-21
Branch: `feature/workstream-c-worker-experience`
Status: **COMPLETE — Build PASS. Pending owner Playwright run.**

---

## Current State Summary

**Roadmap position**: Workstream C — Worker Experience, Phase WK-5 of 7

**Build**: PASS (`npm run build`, 13.80s, 0 errors)
**Playwright**: Pending owner local run (model does not run tests in-session)
**Branch**: `feature/workstream-c-worker-experience` (single workstream — no new branch/PR)

WK-5 gives workers self-service visibility into their own submissions, shift
history, activity timeline, and performance — so they can answer *"What have I
submitted? What happened to it? What shifts have I worked? What needs my
attention?"* without contacting a PM. Read-only; RBAC and doctrines preserved.

---

## WK-4 Deliverables Relevant to WK-5

- The persisted offline queue and `reviewItems` (Review Centre) are the two
  authoritative records of a worker's submissions. WK-5 reads both — it adds no
  new write path and no new submission architecture.
- Per-type submission detection (Issue/Timesheet/Photo/Report) introduced on the
  Uploads surface in WK-4 is generalised into a shared aggregator.

---

## History Architecture

New pure aggregator `client/src/lib/workerActivity.ts`:

- `getWorkerActivity(userId, reviewItems, queue, jobs)` returns the worker's OWN
  activity (filtered by `workerId`), newest first, from two sources:
  1. **Review Centre items** (`reviewItems` where `workerId === userId`) — carry
     approval status + reviewer notes.
  2. **Offline queue items** not yet ingested (no matching `sourceQueueId` on any
     review item) and owned by the worker — carry local sync status.
  De-duplicated via `sourceQueueId` so a replayed item is never counted twice.
- `summariseActivity(entries)` derives operational counts (reports, issues,
  uploads, expenses, total shifts, total hours, reports-this-month, outstanding
  corrections). **No financial figures are computed or exposed.**

### History page — `client/src/pages/worker/history.tsx` (`/worker/history`)
- Filter chips: All · Reports · Issues · Expenses · Uploads · Shifts.
- Each entry: kind icon + title, submission type, date, job, status badge.
- **Status visibility**: Pending review / Approved / Rejected / Needs changes /
  Escalated, plus local **Pending sync / Failed sync** for un-ingested items.
- **Reviewer notes** surfaced for needs-correction items.
- **Shift rows** show worked hours + shift window (operational, not financial).

## Timeline Architecture

The "All" filter is the unified activity timeline — shifts, reports, issues,
expenses, and uploads aggregated chronologically (newest first) from the single
`getWorkerActivity` source. Selecting "Shifts" yields the shift-history view
(entries with worked hours).

## Profile Enhancements — `client/src/pages/worker/profile.tsx`
- **Activity Summary**: Active Jobs · Reports Submitted · Issues Logged · Uploads
  Submitted (+ "View all" → History).
- **Performance Snapshot**: Total Shifts · Total Hours · Reports / Month.
- Identity card (name/role/company/jobs) retained; `btn-sign-out` unchanged.

## Home Enhancements (WK-2 preserved, enhanced only)
- **Outstanding Corrections** card (own section, separate from the sync-based
  Attention section so WK-2 behaviour is unchanged) → links to History.
- **Last Shift** card (job + hours).
- **Recent Activity** now labels entries by kind + real status and links "View all"
  → History (previously every item read "Report submitted / Synced").

## Navigation
- Bottom nav: **Schedule → Activity** (`/worker/history`), per the WK-1 audit
  recommendation (Schedule was a placeholder; it remains routable and reachable
  via the Home "Schedule" quick action until WK-6 builds it out).
- Added stable per-item nav testids (`worker-nav-home/my-jobs/activity/uploads/profile`).

## Seed Data
Added four `du3` (Demo Worker) review items to `DEMO_REVIEW_ITEMS` so the History,
Shift History, Timeline, and Profile metrics are populated on a fresh demo login
and deterministically testable: an **approved** report (7.5h), an **approved**
timesheet (8h), a **needs-correction** issue (with reviewer notes), and a
**pending** photo upload — all attributed to du3's assigned jobs.

---

## Worker Visibility / RBAC

| Worker may view | Worker may NOT view |
|---|---|
| Their own submissions (`workerId === user.id`) | Other workers' submissions (filtered out) |
| Their own shifts / hours | Financial records (£, revenue, margin, cost, invoice) |
| Their own activity timeline | Approval authority (read-only; no approve/reject) |
| Operational status of their items | Company-wide reporting |

`getWorkerActivity` scopes strictly to the worker; the History/Profile pages render
no monetary values.

---

## Files Changed

### Created
| File | Purpose |
|---|---|
| `client/src/lib/workerActivity.ts` | Worker-scoped activity aggregator + summary |
| `client/src/pages/worker/history.tsx` | `/worker/history` — submissions, timeline, shift history |
| `tests/doctrine/worker-history.spec.ts` | WK5-01 … WK5-07 doctrine tests |
| `docs/handoffs/wk-5-history-performance-handoff-2026-06-21.md` | This document |

### Modified
| File | Change |
|---|---|
| `client/src/App.tsx` | Import + `/worker/history` route |
| `client/src/components/WorkerMobileLayout.tsx` | Activity nav item; per-item nav testids |
| `client/src/pages/worker/profile.tsx` | Activity Summary + Performance Snapshot |
| `client/src/pages/worker/home.tsx` | Outstanding corrections, last shift, richer Recent Activity + View all |
| `client/src/lib/mockData.ts` | Seeded four `du3` review items for worker history |

---

## Tests (WK5-01 … WK5-07)

| Test | Assertion |
|---|---|
| WK5-01 | Worker sees their own submissions |
| WK5-02 | Submission statuses display (Approved / Needs changes + reviewer notes) |
| WK5-03 | Worker sees shift history with worked hours |
| WK5-04 | Activity timeline aggregates report + issue + upload kinds |
| WK5-05 | Profile Activity Summary + Performance Snapshot display |
| WK5-06 | No financial visibility (no £ / revenue / margin / invoice) on History or Profile |
| WK5-07 | Worker cannot see another worker's (dw2) submission |

---

## Doctrine Compliance

| Doctrine | Status |
|---|---|
| **Review Centre** | PASS — history reflects Review Centre status; no new ingress |
| **Approval** | PASS — worker gains visibility only; no approve/reject capability |
| **Audit** | PASS — history is traceable to submitted items (who/what/when/job) |
| **Job Attribution** | PASS — every activity entry carries its `jobId`/job title |
| **RBAC — financial visibility = zero** | PASS — worker-scoped; no monetary values rendered |

---

## Verification Results

| Check | Result |
|---|---|
| `npm run build` | **PASS** (13.80s, 0 errors) |
| WK-2 Home behaviour (all-clear, recent-activity, quick actions) | Preserved (corrections kept in a separate section) |
| Existing worker test selectors (`Open Job`, `Submit Report`, `Save`, `btn-sign-out`) | Preserved |
| Playwright | Pending owner local run |

---

## Outstanding Work

1. **Owner**: run Playwright locally; confirm WK5-01 … WK5-07 + existing worker/home tests pass.
2. **Next session**: WK-6 — Mobile Polish.

## WK-6 Recommendations

- Implement the **Schedule** page (replace placeholder) — week strip + day job
  cards; decide final bottom-nav composition (6-item vs the current Activity swap).
- Full `data-testid` audit across remaining worker UI (job list/detail timers).
- Accessibility pass: `aria-label`s, `role="timer"` on the shift clock,
  `aria-current="page"` on active nav.
- Post-submission confirmation state after report save (carried from WK-5 ideas).
