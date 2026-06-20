# UX-6.5 — SCHEDULER TIMELINE — HANDOFF

Date: June 16, 2026
Branch: `feature/ux6-automation-hub` (UX-6 series branch; 6.5 builds on 6.1–6.4)
Status: **COMPLETE** — build verified. Full Playwright suite to be run by the repository owner locally.

---

## Summary

UX-6.5 evolves the table-driven Automation Scheduler into an executive **Scheduler Timeline** — a forward-looking agenda answering *"What automated activity is scheduled across my business over the coming hours, days, and weeks?"* It is a pure visualisation + planning layer: it **reuses** the scheduler engine's `computeNextRun` to project future occurrences and changes no scheduler behaviour, recurrence maths, approval doctrine, governance, audit, or execution timing. The existing Scheduler table tab is untouched.

## Determinism

Seed `nextRunAt` values are anchored to the scheduler's `SEED_BASE` (2026-06-01 08:00Z). The timeline projects occurrences from a fixed `TIMELINE_NOW` equal to that base, so the agenda is stable and reproducible regardless of the wall clock (the same approach used by the UX-6.4 queue).

## Deliverables

1. **Timeline / agenda view** — five grouped, scannable panels (Next Hour · Today · Tomorrow · This Week · This Month). Each event shows scheduled time + day, automation name, schedule-type badge, Financially Sensitive / Approval Protected / Governed badges, and the linked rule number; clicking an event opens the detail dialog. Sticky panel headers, consistent icons, per-bucket counts, and empty states.
2. **Today Overview** — 6 KPI cards: Scheduled Today (6), Completed (1), Upcoming (5), Paused (1), Missed (0), Approval-Protected (1).
3. **Upcoming Schedule Panels** — the five buckets above, projected via `computeNextRun` (max 6 occurrences/schedule within a 31-day horizon).
4. **Schedule Health indicators** — non-zero operational signals (disabled, paused, long-paused >7d, governance-flagged active, approval-protected) plus a "No missed executions detected" reassurance. Issues are surfaced without implying execution failure.
5. **Enhanced Schedule Detail dialog** — added Estimated Recurrence and Recent Execution History (read-only) to the existing dialog, which already carried linked rule, schedule config summary, next/last run, upcoming runs, governance, and approval-protection.
6. **Executive Planning Insights** — data-driven lines emitted only when true (scheduled today; financially sensitive runs this week with approval protection; long-paused criticals; governance review recommended / no conflicts).
7. **Visual improvements** — time grouping, consistent iconography, spacing, sticky headers, empty states, responsive 3-column desktop / stacked tablet layout. No drag-and-drop calendar.

## Files Created

- `client/src/components/automation/AutomationSchedulerTimeline.tsx` — timeline tab; exports `TIMELINE_NOW` and the pure `estimatedRecurrence()` helper. Deterministic projection + bucketing in a single `useMemo`.
- `tests/doctrine/automation-scheduler-timeline.spec.ts` — 10 doctrine tests (TL-01…TL-10).

## Files Modified

- `client/src/pages/automations.tsx` — new "Scheduler Timeline" tab (`aut-tab-timeline` / `aut-timeline-panel`) between Scheduler and Execution Monitoring, rendering `<AutomationSchedulerTimeline onSelectSchedule={setSelectedSchedule} />` (reuses the page's existing schedule-detail state). `ScheduleDetailDialog` gained Estimated Recurrence + Recent Execution History sections. Added `CalendarRange` icon and `estimatedRecurrence` imports.

## Verification Results

- Build (`npm run build`): **PASS**.
- `tsc --noEmit`: no errors in any UX-6.5-touched file (pre-existing repo-wide errors in untouched files remain; the project gate is the Vite build).
- Playwright: 10 new deterministic tests authored. Existing scheduler testIds preserved (`sched-table`, `sched-kpi-strip`, `sched-detail-dialog`, `sched-detail-*`). Full-suite run pending the owner's local run.

## Doctrine Compliance

- **Scheduler behaviour / recurrence / timing:** unchanged — the timeline only *reads* and projects via the existing `computeNextRun`; no engine mutation, no new scheduler functions.
- **Approval / Governance / Audit / Financial Integrity:** preserved — read-only; surfaces approval-protected and governed schedules without actioning them; creates no records or mutations.
- **Job Attribution / RBAC:** preserved; inherits the CEO-only gating of `/automations`.

## Outstanding Work / Next Steps

- Owner: run the full Playwright suite locally and confirm green.
- Future UX-6 increments (same branch): continue hub polish; the PR for the whole UX-6 series stays open until the series is complete.
