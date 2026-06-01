# Phase 6.0E — Automation Scheduler
## Handoff Document

Date: 1 June 2026
Branch: feature/phase-6-0e-automation-scheduler
Status: PR-Ready

---

## Summary

Phase 6.0E adds time-based scheduling to The Ledger automation layer.
Schedules trigger automation rule evaluations on a cron-like cadence
(Hourly, Daily, Weekly, Monthly, Custom) without ever bypassing approval
workflows or creating approved financial records.

All schedule operations generate immutable audit entries.
Financially Sensitive schedules display Approval Protected indicators.
Governance Review is flagged for Critical and High Risk schedule categories.

---

## Commits (Phase 6.0E specific)

| SHA | Message |
|-----|--------|
| fc8249c | feat(automation): add scheduler engine |
| 1f3a881 | feat(automation): add scheduled trigger support to automationEngine |
| 2e67a55 | feat(automation): add scheduler centre tab and builder schedule integration |
| 2c1ddfd | test(automation): add 27 automation scheduler doctrine tests |
| (this) | docs(automation): complete phase 6.0e handoff and update canonical context |

---

## Files Added

| File | Description |
|------|-------------|
| `The-Ledger/client/src/lib/automationSchedulerEngine.ts` | Complete scheduler engine (32,803 bytes) |
| `The-Ledger/tests/doctrine/automation-scheduler.spec.ts` | 27 doctrine tests (AS-01 – AS-27) |
| `The-Ledger/docs/handoffs/phase-6-0e-handoff-2026-06-01.md` | This file |

---

## Files Modified

| File | Change |
|------|--------|
| `The-Ledger/client/src/lib/automationEngine.ts` | Added `schedule_trigger` to AutomationTriggerType; added Scheduled Execution entry to TRIGGER_CATALOGUE_V1 |
| `The-Ledger/client/src/pages/automations.tsx` | Added Scheduler tab (4th tab), Scheduler KPI strip, Scheduler table, Schedule Detail Dialog, Builder schedule config form, Next Run Preview |
| `The-Ledger/docs/LEDGER_CANONICAL_CONTEXT.md` | Updated to v4.9; Phase 6.0E marked Complete; Automation Scheduler Doctrine added; Next Target updated to Phase 6.1 |

---

## Engine Deliverables

### automationSchedulerEngine.ts

**Types implemented:**
- `AutomationScheduleType` — Hourly | Daily | Weekly | Monthly | Custom
- `AutomationScheduleStatus` — Active | Paused | Disabled
- `AutomationScheduleExecution` — full execution record with job attribution
- `AutomationSchedule` — complete schedule definition with governance fields
- `ScheduleConfig` — type-specific config (hourInterval, dailyHour, weeklyDay/Hour, monthlyDay/Hour, customExpression)
- `ScheduleSummary` — KPI summary object
- `ScheduleAuditEntry` — immutable audit record for every schedule action
- `ScheduleAuditEventType` — Created | Updated | Paused | Resumed | Disabled | Executed

**Functions implemented:**
- `computeNextRun()` — pure next-run calculation for all schedule types
- `computeScheduleSummary()` — human-readable summary (e.g. "Every Monday at 08:00")
- `computeScheduleSummaryKPIs()` — aggregate KPI object for KPI strip
- `pauseSchedule()` — Active → Paused + immutable audit entry
- `resumeSchedule()` — Paused → Active + recomputes nextRunAt + immutable audit entry
- `disableSchedule()` — Any → Disabled + immutable audit entry
- `getAllSchedules()` / `getScheduleById()` — query functions
- `getScheduleAuditLog()` / `getScheduleExecutions()` — history query functions
- `filterSchedulesByStatus()` / `filterSchedulesByType()` / `searchSchedules()` — filter functions
- `getUpcomingRuns()` — computes next N run timestamps for detail dialog

**Seed data:**
- 6 schedules: 4 Active, 1 Paused, 1 Disabled
- 5 audit entries (Created + Paused events)
- 4 execution records (3 success, 1 blocked_approval_required)

### automationEngine.ts (extended)

- `schedule_trigger` added to `AutomationTriggerType`
- Scheduled Execution trigger added to `TRIGGER_CATALOGUE_V1`:
  - id: `trigger-schedule`
  - type: `schedule_trigger`
  - label: "Scheduled Execution"
  - description: "Fires on a time-based schedule..."

---

## UI Deliverables

### Automation Centre — Scheduler Tab

- Tab trigger: `data-testid="aut-tab-scheduler"`
- Panel: `data-testid="sched-panel"`
- Scheduler doctrine notice (blue)
- KPI Strip (`sched-kpi-strip`):
  - `sched-kpi-active`, `sched-kpi-paused`, `sched-kpi-disabled`
  - `sched-kpi-runs-today`, `sched-kpi-upcoming`
- Search: `sched-search`
- Status filter: `sched-filter-status`
- Type filter: `sched-filter-type`
- Table: `sched-table`
  - Rows: `sched-row-{id}`
  - View button: `sched-btn-view-{id}`
  - Approval Protected badge: `sched-approval-protected-{id}`

### Schedule Detail Dialog

- Dialog: `sched-detail-dialog`
- Linked Rule: `sched-detail-linked-rule`
- Next Run: `sched-detail-next-run`
- Upcoming Runs: `sched-detail-upcoming-runs`
- Governance: `sched-detail-governance`
- Governance Review: `sched-detail-governance-review`
- Approval Protected: `sched-detail-approval-protected`
- Actions: `sched-detail-actions`
  - Pause: `sched-btn-pause`
  - Resume: `sched-btn-resume`
  - Disable: `sched-btn-disable`

### Builder Integration

- Scheduled Execution trigger option: `builder-trigger-option-trigger-schedule`
- Schedule form (inline): `builder-schedule-form`
- Schedule type selector: `builder-schedule-type`
- Schedule config form: `builder-schedule-config`
- Next Run Preview: `builder-schedule-next-run-preview`
- Type-specific fields:
  - Hourly: `builder-schedule-hour-interval`
  - Daily: `builder-schedule-daily-hour`
  - Weekly: `builder-schedule-weekly-day`, `builder-schedule-weekly-hour`
  - Monthly: `builder-schedule-monthly-day`, `builder-schedule-monthly-hour`
  - Custom: `builder-schedule-custom-expression`

---

## Tests Added

**File:** `tests/doctrine/automation-scheduler.spec.ts`

**Count:** 27 tests (AS-01 – AS-27)

| Group | Tests |
|-------|-------|
| Engine / Tab Load | AS-01 to AS-03 |
| KPI Strip | AS-04 to AS-05 |
| Scheduler Table | AS-06 to AS-09 |
| Search and Filters | AS-10 to AS-12 |
| Schedule Detail Dialog | AS-13 to AS-19 |
| CEO Schedule Actions | AS-20 to AS-22 |
| Builder Integration | AS-23 to AS-26 |
| RBAC | AS-27 |

**Previous count:** 199
**New count:** 226 (target, pending Playwright run)

---

## Verification Results

> Build and Playwright must be run locally to confirm.
> The branch is code-complete and PR-ready.

Expected:
- Build: PASS (no new dependencies; pure TypeScript additions)
- Playwright: 226 / 226 PASS

---

## Doctrine Validation

| Doctrine | Status |
|----------|--------|
| Schedulers never approve anything | ✓ Enforced — all actions are queue/trigger only |
| Every schedule execution generates audit entry | ✓ appendScheduleAudit() called on every action |
| Approval remains human-controlled | ✓ isApprovalProtected + UI indicators enforce this |
| Job attribution preserved | ✓ jobId / jobName in AutomationSchedule + AutomationScheduleExecution |
| FinanciallySensitive schedules governed | ✓ isFinanciallySensitive + isApprovalProtected flags |
| Immutable audit — no delete | ✓ append-only _scheduleAuditLog array |
| No silent executions | ✓ all results recorded in _scheduleExecutions |

---

## Risks

| Risk | Mitigation |
|------|------------|
| In-memory schedule store resets on page reload | Expected — frontend prototype; backend persistence deferred |
| Next-run times computed from `new Date()` | Deterministic in tests using fixed seed dates |
| Playwright test AS-27 (PM RBAC) depends on /automations access control | Existing RBAC from Phase 6.0A/B enforces CEO-only |

---

## Remaining Roadmap

### Phase 6.1 — Notification Centre

Add in-app notification infrastructure:
- Notification Engine (NotificationRecord, types, SEED data)
- Bell icon in navigation with unread count badge
- Notification Centre page (CEO + PM)
- Notification types: Automation Alert, Review Required, Sync Failure, Governance Action
- Read / Unread / Dismissed lifecycle
- Per-notification deep-link to source
- 20+ doctrine tests

### Phase 6.2 — Advanced Scheduler (future)

- Cron expression editor
- Schedule dependency chains
- Schedule conflict detection
- Backend scheduler integration

---

## PR Checklist

- [x] Branch: feature/phase-6-0e-automation-scheduler
- [x] Engine: automationSchedulerEngine.ts complete
- [x] Engine: automationEngine.ts extended with schedule_trigger
- [x] UI: Scheduler tab in Automation Centre
- [x] UI: Scheduler KPI strip
- [x] UI: Scheduler table with search + filters
- [x] UI: Schedule Detail Dialog with CEO actions
- [x] UI: Builder integration with schedule config + next-run preview
- [x] Tests: 27 doctrine tests (AS-01 – AS-27)
- [x] Docs: LEDGER_CANONICAL_CONTEXT.md updated to v4.9
- [x] Docs: This handoff document created
- [ ] Build PASS (run locally)
- [ ] Playwright PASS (run locally)
- [ ] PR opened on GitHub
