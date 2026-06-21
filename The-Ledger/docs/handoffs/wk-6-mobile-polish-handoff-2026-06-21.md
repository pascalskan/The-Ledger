# WK-6 — Mobile Polish & UX Hardening — Handoff

Date: 2026-06-21
Branch: `feature/workstream-c-worker-experience`
Status: **COMPLETE — Build PASS. Pending owner Playwright run.**

---

## Current State Summary

**Roadmap position**: Workstream C — Worker Experience, Phase WK-6 of 7

**Build**: PASS (`npm run build`, 13.51s, 0 errors)
**Playwright**: Pending owner local run (model does not run tests in-session)
**Branch**: `feature/workstream-c-worker-experience` (single workstream — no new branch/PR)

WK-6 is a stabilisation/usability phase. No new functional architecture — the
Worker experience is polished to production-ready: real Schedule view,
accessibility attributes, consistent test IDs, empty/error states, and a
six-destination navigation that holds up on small screens.

---

## WK-5 Deliverables Relevant to WK-6

- History/Activity, Profile metrics, and the shared `workerActivity` aggregator are
  in place; WK-6 only adds polish (testids, a11y, nav) around them.
- Bottom nav had swapped Schedule → Activity (Schedule was still a placeholder).
  With a real Schedule page now built, the nav carries both.

---

## UX Hardening Delivered

### Schedule (placeholder removed)
`client/src/pages/worker/schedule.tsx` replaced the *"Full calendar view coming in
the next update"* placeholder with a lightweight, day-grouped operational schedule:
upcoming assigned jobs (Active + Planned) grouped by **Today / Tomorrow / weekday**,
each showing time, status, On-Shift badge, location, and tapping through to job
detail. Empty state (`worker-schedule-empty`) when nothing is scheduled. No calendar
engine.

### alert() removal
A repo-wide search confirms **zero `alert()` calls** remain in the worker experience
(the job-detail photo `alert` and "shift already active" `alert` were already
replaced with toasts in WK-3). WK6-02 enforces this at runtime by throwing if
`window.alert` is ever called during the worker journey.

### Accessibility pass
- Bottom nav: `role="navigation"` + `aria-label="Worker navigation"`; each item has
  `aria-label` and `aria-current="page"` when active.
- Shift timers (Home + Job Detail): `role="timer"`, `aria-live="polite"`, descriptive
  `aria-label`.
- Icon-only buttons given `aria-label`: job-detail/report back buttons, uploads
  preview/delete buttons, jobs "Open Job".

### Test ID audit
Added stable testids: `worker-schedule`, `worker-schedule-day`,
`worker-schedule-job-{id}`, `worker-schedule-empty`, `worker-jobs`,
`worker-job-card-{id}`, `worker-jobs-empty`, `worker-jobs-history-empty`,
`worker-shift-timer` (job detail). Nav testids (WK-5) retained; "My Jobs" → "Jobs"
(testid `worker-nav-jobs`).

### Empty & error states
- Empty: Schedule, My Jobs (active + completed), Uploads queue (WK-4), History (WK-5)
  all render explicit empty states — no blank screens.
- Error: Uploads failed-item guidance ("your work is still saved … tap retry") + the
  offline banner/sync-status messaging (WK-4) communicate failures clearly.

### Navigation consistency
Bottom nav now reaches all six destinations with one tap: **Home · Jobs · Schedule ·
Activity · Uploads · Profile**. Labels shortened/truncated for small-screen fit.

### Visual consistency / performance
Polish-only: consistent card/badge styling and spacing across Schedule and Jobs to
match the rest of the worker app. No redesign, no heavy refactors; the shared
`workerActivity` aggregator already removed duplicated history calculations.

---

## Files Changed

### Created
| File | Purpose |
|---|---|
| `tests/doctrine/worker-mobile-polish.spec.ts` | WK6-01 … WK6-07 tests |
| `docs/handoffs/wk-6-mobile-polish-handoff-2026-06-21.md` | This document |

### Modified
| File | Change |
|---|---|
| `client/src/pages/worker/schedule.tsx` | Real day-grouped schedule (placeholder removed) |
| `client/src/components/WorkerMobileLayout.tsx` | 6-item nav (+Schedule); aria-current/aria-label/landmark |
| `client/src/pages/worker/home.tsx` | `role="timer"` + aria on shift timer |
| `client/src/pages/worker/job-detail.tsx` | `role="timer"` timer; back-button aria-label |
| `client/src/pages/worker/report.tsx` | Back-button aria-label |
| `client/src/pages/worker/uploads.tsx` | Preview/delete aria-labels |
| `client/src/pages/worker/jobs.tsx` | Testids, empty states, Open-Job aria-label |

---

## Tests (WK6-01 … WK6-07)

| Test | Assertion |
|---|---|
| WK6-01 | Schedule view functional — day groups render, navigates to job; placeholder gone |
| WK6-02 | No blocking `alert()` across the worker journey (runtime-enforced) |
| WK6-03 | Navigation operational across all six destinations |
| WK6-04 | Accessibility attributes present (`aria-current`, nav landmark, `role="timer"`) |
| WK6-05 | Empty states render (Uploads empty queue) |
| WK6-06 | Error states render (failed-sync guidance + retry) |
| WK6-07 | Mobile layout functional at 360×640; all nav reachable |

---

## Doctrine Compliance

| Doctrine | Status |
|---|---|
| **Review Centre** | PASS — no workflow change; polish only |
| **Approval** | PASS — no approval authority added |
| **Audit** | PASS — traceability untouched |
| **Job Attribution** | PASS — schedule/jobs remain job-attributed |
| **RBAC** | PASS — worker-scoped; no financial data introduced |

---

## Verification Results

| Check | Result |
|---|---|
| `npm run build` | **PASS** (13.51s, 0 errors) |
| `alert(` in `client/src` | 0 matches |
| Existing worker/home/history test selectors | Preserved (`Open Job`, `Submit Report`, `Save`, `btn-sign-out`, `worker-nav-activity/profile`) |
| Playwright | Pending owner local run |

---

## Outstanding Work

1. **Owner**: run Playwright locally; confirm WK6-01 … WK6-07 + the full worker/home/history suites pass.
2. **Next session**: WK-7 — Validation Audit (final RBAC + doctrine verification across WK-2…WK-6).

## WK-7 Recommendations

- RBAC validation: worker sees zero financial data on every route; cannot reach
  `/`, `/review`, `/finance`, `/intelligence`, or any CEO/PM route via URL.
- Doctrine validation: all submissions route to Review Centre as `pending`;
  timesheets carry `hours > 0`; offline replay is idempotent.
- Consolidated worker doctrine spec aggregating WK2–WK6 guarantees; confirm the full
  Playwright suite is green and the branch is merge-ready for the Workstream C PR.
