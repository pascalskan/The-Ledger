# Phase 6.2 — Activity Feed & Event Stream
## Handoff Document

Date: 2026-06-02
Branch: feature/phase-6-2-activity-feed
Status: **Complete — Verified (279 / 279 PASS)**

---

## Architecture Summary

Phase 6.2 implements the unified operational event stream for The Ledger.

The Activity Feed aggregates informational events from all completed modules:
- Review Centre
- Automation Centre
- Automation Governance
- Automation Scheduler
- Notification Centre
- Accounting Sync
- Reconciliation
- Exception Resolution
- Financial Controls
- Jobs
- Workers
- Stock & Assets

### Activity Feed Doctrine

The Activity Feed is **informational only**. It:
- NEVER creates Revenue, Cost, Payroll, Inventory deductions, or Financial mutations
- NEVER bypasses approval workflows
- Preserves job attribution on all records
- Generates immutable audit entries for viewed/opened/navigated interactions
- Deep links navigate to source pages only — they never execute actions
- All events remain fully traceable

---

## Files Added

### Engine
- `client/src/lib/activityFeedEngine.ts`
  - 13 event types (review_event through asset_event)
  - 3 priority levels (info / warning / critical)
  - 25 realistic seed events sourced from completed modules
  - Full CRUD: getAllEvents, getEventById, getRecentEvents, getActionRequiredEvents
  - computeActivitySummary: total, critical, actionRequired, today, last7Days
  - filterEventsByType, filterEventsByPriority, searchEvents
  - recordEventViewed, recordEventOpened, recordEventNavigated (immutable audit)
  - getActivityAuditLog, _resetActivityFeedState (test support)
  - ACTIVITY_EVENT_ROUTES: deep-link route map per event type

### Page
- `client/src/pages/activity-feed.tsx`
  - CEO-only access
  - KPI strip: Total Events, Critical Events, Action Required, Today, Last 7 Days
  - Event table: Icon, Type badge, Title, Description, Timestamp, Priority, Job Ref, Action Required indicator
  - Filters: Event Type (13 options), Priority (3 options)
  - Search: title, description, job ID, source ID
  - Event Detail Dialog: full event info, source meta, Go to Source deep-link button
  - Doctrine notice (informational only)
  - All interactive elements have data-testid attributes

### Tests
- `tests/doctrine/activity-feed.spec.ts`
  - 25 doctrine tests (AF-01 to AF-25)
  - Covers: RBAC, KPI strip, event table, filters, search, detail dialog, deep linking, doctrine notice, dashboard widget

### Handoff
- `docs/handoffs/phase-6-2-activity-feed-handoff.md` (this file)

---

## Files Modified

### Routing
- `client/src/App.tsx`
  - Added `/activity-feed` route (CEO only)
  - Added `ActivityFeedPage` import

### Navigation
- `client/src/components/layout.tsx`
  - Added `Activity` icon import from lucide-react
  - Added Activity Feed nav item (CEO only) with `data-testid="nav-activity-feed"`

### Dashboard
- `client/src/pages/dashboard.tsx`
  - Added Recent Activity widget (latest 10 events)
  - Widget includes View All button → `/activity-feed`
  - `data-testid="dashboard-recent-activity-widget"`

### Offline Queue Store
- `client/src/lib/offlineQueueStore.ts`
  - **Bug fix:** removed unconditional random fault simulation from `processQueueBatch`, `processUploadBatch`, and `retryUpload`
  - Root cause: random 15% conflict + 15% failure thresholds fired even when the SynchronizationDebugPanel fault-injection flags were explicitly unchecked, causing ~30% of offline replay attempts to silently fail and doctrine test 179 to fail intermittently
  - Fix: fault simulation now only activates when `injectConflict` / `injectFailure` / `injectUploadFailure` Zustand flags are explicitly `true`; realistic latency simulation (500–2500 ms) preserved
  - Impact: test 179 (offline submission → Review Center) now passes deterministically

### Documentation
- `The-Ledger/LEDGER_CANONICAL_CONTEXT.md` — v6.0, Phase 6.2 marked complete, Activity Feed Doctrine added, Phase 6.3 set as next target

---

## Test Counts

| Phase | Tests |
|-------|-------|
| Existing (Phase 6.1 baseline) | 254 |
| Phase 6.2 new tests | 25 |
| **Verified total** | **279** |

---

## RBAC

| Role | Access |
|------|--------|
| CEO | Full access |
| Project Manager | No access (Phase 6.2) |
| Worker | No access |
| Client | No access |

---

## Deep Link Map

| Event Type | Route |
|-----------|-------|
| review_event | /review |
| automation_event | /automations |
| governance_event | /automation-governance |
| scheduler_event | /automations |
| notification_event | /notifications |
| sync_event | /financial-explorer |
| reconciliation_event | /reconciliation-center |
| exception_event | /exception-resolution-center |
| financial_control_event | /exception-resolution-center |
| job_event | /jobs |
| worker_event | /workers |
| stock_event | /stock |
| asset_event | /assets |

---

## Verification

```
Build: PASS
Playwright: PASS
Total tests: 279 / 279
Regressions: 0
```

---

## Recommended Next Phase

**Phase 6.3 — Dashboard Intelligence Layer**

Branch: `feature/phase-6-3-dashboard-intelligence`

Objective: Transform the existing dashboard from a static layout into a live operational intelligence hub that surfaces actionable cross-module KPIs for the CEO.

### Deliverables

- **Executive Summary widget** — live counts from Review Centre (pending), Exception Resolution (open), Automation Governance (requires review), Reconciliation (unmatched)
- **Financial Health Snapshot widget** — sync health status, reconciliation match rate, open exception count, pending financial controls
- **Outstanding Actions widget** — aggregated action-required items across Review Centre, Exceptions, Governance, Notifications, Activity Feed
- **Recent Automation Activity widget** — last 5 automation executions with status badges
- **Doctrine tests** — 15+ tests covering widget rendering, KPI accuracy against seed data, and RBAC

### Doctrine Constraints

- Dashboard widgets are READ-ONLY — no mutations, no approvals, no financial changes
- All KPI values derived from existing engine seed data — no new seed data required
- Widgets deep-link to source pages only — no inline actions
- CEO only (no PM, no Worker, no Client)

### Starting Instructions for Claude

1. `git fetch origin`
2. `git checkout -b feature/phase-6-3-dashboard-intelligence origin/main` (branch from main after 6.2 is merged)
3. Read `LEDGER_CANONICAL_CONTEXT.md`
4. Read this handoff
5. Implement widgets in `client/src/pages/dashboard.tsx`
6. Add doctrine tests in `tests/doctrine/dashboard-intelligence.spec.ts`
7. Run full Playwright suite — target 294+ passing
8. Commit, push, open PR
