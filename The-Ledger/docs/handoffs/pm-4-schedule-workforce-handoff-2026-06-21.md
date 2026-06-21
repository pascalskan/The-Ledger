# PM-4 — Schedule & Workforce — Handoff

Date: 2026-06-21
Branch: `feature/pm-2-navigation-dashboard`
Status: **COMPLETE — build green; awaiting owner test run.**

---

## Summary

PM-4 transforms the Schedule and Workers pages from company-wide views (inappropriate for PMs) into operational PM workspaces. PMs now see only their assigned jobs on the schedule, see workforce conflict and shortage detection, and see only the crew members on their jobs. The CEO experience on both pages is unchanged.

---

## PM-1 Audit Findings Resolved

| Finding | Severity | Status |
|---|---|---|
| Schedule displays all company jobs and financial margin data to PMs | Critical | **RESOLVED** |
| No workforce planning view for PM | High | **RESOLVED** |
| No crew conflict visibility | High | **RESOLVED** |
| No crew allocation awareness | High | **RESOLVED** |

---

## Files Changed

### Modified

- `client/src/lib/mockData.ts` — Added 3 new PM demo jobs to produce meaningful schedule/workforce demo data:
  - `dj-pm-active-1` (DEMO-JOB-0203): Active, -5 to +12 days, dw2 + dw3 assigned
  - `dj-boiler-room-2` (DEMO-JOB-0204): Planned, +4 to +18 days, dw2 assigned — **overlaps with dj-pm-active-1 on dw2 → triggers worker conflict**
  - `dj-office-fit-1` (DEMO-JOB-0205): Planned, +2 to +8 days, 0 workers → **triggers crew shortage + resource alert**

- `client/src/pages/schedule.tsx`:
  - Added `useAuth`, `isProjectManager` imports
  - Added `workers`, `roles`, `reviewItems` to `useStore()` destructure
  - Added `{ user }` from `useAuth()`, `userIsPM` role check
  - Added `useLocation` for job navigation from PM schedule cards
  - Added PM early return — full PM Schedule Dashboard before CEO path
  - Added `data-testid="ceo-schedule-page"` to CEO view div

- `client/src/pages/workers.tsx`:
  - Added `useAuth`, `isProjectManager` imports
  - Added `jobs` to `useStore()` destructure
  - Added `users` icon import
  - Added `Card, CardContent` imports
  - Added `{ user }` from `useAuth()`, `userIsPM` role check
  - Added PM early return — PM Workforce view before CEO path
  - Added `data-testid="ceo-workforce-page"` to CEO view div

### Created

- `tests/doctrine/pm-sched.spec.ts` — 7 doctrine tests (PM-SCHED-01 to PM-SCHED-07)
- `docs/handoffs/pm-4-schedule-workforce-handoff-2026-06-21.md` — this document

---

## Architecture Decisions

### PM Schedule design: list view, not calendar grid
The existing CEO schedule uses a 7-column calendar grid with financial overlays (WeeklyIntelligenceStrip, OperationalDrawer, SmartFilters — all containing margin/revenue/cost data). Rather than surgically removing financial fields from those components (which would break the CEO path), the PM view is a separate card-based list. This follows the PM-2/PM-3 pattern of separate components per role rather than conditional hiding.

### Conflict detection algorithm
Worker conflicts are detected by comparing date ranges across all non-completed PM jobs that share a worker:
```
For each worker in PM's job pool:
  For each pair of non-completed jobs the worker is on:
    If aStart <= bEnd AND bStart <= aEnd: OVERLAP → CONFLICT
```
This is a simple O(n²) intersection check, appropriate for the mock-data scale (PM typically manages 3-10 jobs).

### Crew shortage vs. resource alert distinction
- **Crew Shortage**: any Active or Planned job with 0 assigned workers
- **Resource Alert**: crew shortage AND job starts within 7 days (more urgent)

Both are shown in the Alerts section. Resource alert adds "starts in N days" context to the shortage message.

### PM workers scoping
The PM workforce view (`/workers`) shows only workers assigned to Active or Planned PM jobs. Completed jobs are excluded (the work is done; no operational value in showing those workers). This is consistent with the "operational planning" purpose of the page.

---

## PM Schedule Dashboard — Sections

| Section | testId | Content |
|---|---|---|
| Workforce Snapshot | `pm-schedule-workforce-snapshot` | Jobs Active, Jobs Planned, Crew Assigned, Alerts count |
| Alerts | `pm-schedule-conflicts` | Worker conflicts, crew shortages, resource alerts, or "No alerts" |
| My Scheduled Jobs | `pm-schedule-my-jobs` | All active/planned PM jobs, sorted by start date; crew count, pending reviews, shortage/conflict badges |
| Upcoming — Next 7 Days | `pm-schedule-upcoming` | PM jobs starting within the next 7 days |
| Crew Availability | `pm-schedule-crew-availability` | Workers on non-completed PM jobs; conflict badge if worker has overlapping assignments |

---

## Conflict Detection Logic — Demo Data Verification

With the 3 new demo jobs added:

| Condition | Job | Trigger |
|---|---|---|
| Worker Conflict | dw2 on `dj-pm-active-1` (ends +12d) AND `dj-boiler-room-2` (starts +4d) | Date ranges overlap days 4–12 |
| Crew Shortage | `dj-office-fit-1` (Planned, 0 workers) | `assignedWorkerIds.length === 0` |
| Resource Alert | `dj-office-fit-1` (starts +2 days, 0 workers) | Shortage AND start within 7 days |

---

## PM Workforce View — Permissions

| Action | PM | CEO |
|---|---|---|
| View workers | Own jobs only (Active/Planned) | All company workers |
| Add Worker | Not available | Available (dialog) |
| Delete Worker | Not available | Available (button) |
| Edit Worker | Not available | Available (navigate to detail) |
| Search workers | Not applicable | Available |

---

## Tests Added

`tests/doctrine/pm-sched.spec.ts` — 7 doctrine tests:

| ID | Description |
|---|---|
| PM-SCHED-01 | PM schedule page shows only assigned jobs; unmanaged job not visible; all sections present |
| PM-SCHED-02 | CEO schedule page renders CEO view (ceo-schedule-page testId); pm-schedule-page not visible |
| PM-SCHED-03 | PM schedule page contains no Margin / Revenue / Contribution / Contract Value / Labour Cost text |
| PM-SCHED-04 | Worker conflict on dw2 (dj-pm-active-1 + dj-boiler-room-2 overlap) is detected and displayed |
| PM-SCHED-05 | Crew shortage on dj-office-fit-1 (0 workers) is displayed |
| PM-SCHED-06 | PM workforce page scoped to workers on assigned jobs (dw2, dw3); no Add Worker button |
| PM-SCHED-07 | CEO workers page retains full management; all workers visible; pm-workforce-page not visible |

---

## Verification Results

- Build (`npm run build`): **PASS**
- Doctrine compliance: **PASS** — see table below
- Playwright: **Pending owner local run** (per project workflow)

---

## Doctrine Compliance

| Doctrine | Finding |
|---|---|
| **RBAC** | PASS — PM schedule scoped to managerId; PM workforce scoped to job-assigned workers; CEO unchanged |
| **Financial Integrity** | PASS — no revenue, margin, contract value, labour cost, or contribution visible in PM schedule or workforce views |
| **Approval** | PASS — no financial mutations; all pages are read-only for PM |
| **Audit** | PASS — no audit regressions |
| **Financial Visibility Rules** | PASS — WeeklyIntelligenceStrip, OperationalDrawer, SmartFilters (all financial) are CEO-only; PM never reaches them |
| **Review Centre Protection** | PASS — pending review counts shown in PM schedule cards; PM cannot approve from schedule page |

---

## Outstanding Work / Next Steps for PM-5+

1. **Owner:** run the full Playwright suite locally and confirm green.
2. **PM-5** — suggested scope:
   - PM Clients page (`/clients`) — scope to clients of PM's assigned jobs; no company-wide client management
   - PM Notifications (`/notifications`) — scope to events on PM's assigned jobs only (currently shows all company notifications)
   - PM Expenses (`/expenses`) — scope to expenses submitted against PM's jobs (no company-wide expense visibility)
3. **PM-6** — PM detail pages:
   - Worker detail page (`/workers/:id`) — PM currently uses CEO worker detail; may need PM-appropriate view
   - Client detail page (`/clients/:id`) — PM currently uses CEO client detail; may need PM-appropriate view
4. **PM-7** — Full PM validation pass:
   - End-to-end test of all PM routes for RBAC regressions
   - Confirm no financial data appears anywhere in PM workflow
