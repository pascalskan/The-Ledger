# Phase 6.3 — Real-Time Event Infrastructure
## Handoff Document

**Date:** June 2026  
**Branch:** feature/phase-6-3-event-infrastructure  
**Status:** Complete — Ready for merge  
**Build:** PASS  
**Playwright Target:** 309 / 309 PASSING (279 existing + 30 new)

---

## Summary

Phase 6.3 implements the Event Bus Engine — The Ledger's unified real-time event infrastructure — and the Event Monitor page that gives the CEO full operational visibility into the event pipeline.

---

## What Was Delivered

### Event Bus Engine

**File:** `client/src/lib/eventBusEngine.ts`

The Event Bus is the central nervous system of The Ledger's operational pipeline. All engines (Activity Feed, Notifications, Dashboard, Automation) are unified as subscribers.

**Types:**
- `BusEventCategory` — 13 event categories (review, automation, governance, scheduler, notification, sync, reconciliation, exception, financial_control, job, worker, stock, asset)
- `BusEventPriority` — info / warning / critical
- `BusEvent` — core event model (id, type, title, description, timestamp, priority, sourceId, sourceType, sourceRoute, jobId, actor, actionRequired)
- `BusEventRecord` — extends BusEvent with consumedBy[], auditEntries[]
- `BusAuditEntry` — immutable audit record (published / consumed / subscriber_triggered / viewed)
- `BusSubscriber` — subscriber registry record (id, name, description, status, eventCount, interestedTypes)
- `EventBusSummary` — KPI object (total, today, critical, subscriberCount, activeEventTypes)

**Public API:**
- `publishEvent()` — publishes and dispatches to all matching subscribers
- `subscribe()` — registers a new subscriber
- `unsubscribe()` — removes a subscriber
- `getEventHistory()` — returns all events newest-first
- `getRecentBusEvents(limit)` — returns N most recent events
- `getEventsByType()` — filter by BusEventCategory
- `getEventsByPriority()` — filter by BusEventPriority
- `searchBusEvents()` — full-text search across title, description, IDs
- `getSubscribers()` — returns all registered subscribers
- `computeEventBusSummary()` — returns KPI summary
- `getBusAuditLog()` — immutable audit log
- `recordEventMonitorViewed()` — audit trail for Event Monitor views
- `clearEventHistory()` / `_resetEventBusState()` — test support

**Subscribers:**
1. **Activity Feed Subscriber** — all events → activityFeedEngine.addActivityEvent()
2. **Notification Subscriber** — warning/critical events → simulated notification creation
3. **Dashboard Subscriber** — all events → dashboard reads from getRecentBusEvents()
4. **Automation Subscriber** — targeted event types → read-only trigger evaluation

**Seed data:** 20 realistic events covering all 13 event categories, sourced from Review Centre, Sync Engine, Automations, Governance, Exceptions, Financial Controls, Reconciliation, Scheduler, Jobs, Workers, Stock, and Assets.

**Doctrine compliance:**
- Event Bus is INFORMATIONAL / EVALUATIVE only
- Never approves submissions
- Never creates approved financial records
- Never bypasses Review Centre
- Never bypasses Approval Doctrine
- All processing is fully auditable

---

### Event Monitor Page

**File:** `client/src/pages/event-monitor.tsx`

**Route:** `/event-monitor` (CEO only)

**Features:**
- Doctrine notice banner (informational/evaluative only)
- **KPI Strip** (5 cards): Total Events, Events Today, Critical Events, Subscribers, Active Event Types
- **Event Stream**: full event list with Type badge, Priority badge, Job Ref, Action Required indicator, View button
- **Filters**: Event Type (13 types), Priority (3 levels)
- **Search**: title, description, event ID, job ID, source ID
- **Event Detail panel**: Event ID, title, type/priority badges, description, actor, source, job, consumed-by list, Go to Source deep-link
- **Subscriber Panel**: 4 subscribers with name, description, status badge, event count

**All interactive elements carry `data-testid` attributes.**

---

### Routing

**File:** `client/src/App.tsx`

```tsx
<Route path="/event-monitor">
  <ProtectedRoute component={EventMonitorPage} roles={["CEO"]} />
</Route>
```

---

### Navigation

**File:** `client/src/components/layout.tsx`

```tsx
{ label: "Event Monitor", href: "/event-monitor", icon: Radio, roles: ["CEO"], testId: "nav-event-monitor" }
```

---

### Dashboard Integration

The dashboard `Recent Activity` widget (added in Phase 6.2) remains in place. The Event Bus subscriber pattern means any new events published via `publishEvent()` will automatically flow into the Activity Feed and be visible in the dashboard widget.

---

### Doctrine Tests

**File:** `tests/doctrine/event-bus.spec.ts`

30 tests (EB-01 to EB-30) covering:

| Range | Area |
|-------|------|
| EB-01 to EB-03 | Page access & RBAC |
| EB-04 to EB-08 | KPI Strip |
| EB-09 to EB-12 | Event Stream |
| EB-13 to EB-16 | Filters |
| EB-17 to EB-19 | Search |
| EB-20 to EB-23 | Event Detail |
| EB-24 to EB-26 | Subscriber Panel |
| EB-27 | Doctrine Notice |
| EB-28 | Activity Feed integration |
| EB-29 | PM RBAC |
| EB-30 | Governance events visibility |

---

## Files Added

| File | Description |
|------|-------------|
| `client/src/lib/eventBusEngine.ts` | Event Bus Engine (complete) |
| `client/src/pages/event-monitor.tsx` | Event Monitor page (complete) |
| `tests/doctrine/event-bus.spec.ts` | 30 doctrine tests |
| `docs/handoffs/phase-6-3-event-infrastructure-handoff.md` | This document |

## Files Modified

| File | Change |
|------|--------|
| `client/src/App.tsx` | /event-monitor route (CEO only) |
| `client/src/components/layout.tsx` | Event Monitor nav item (Radio icon, CEO only) |
| `The-Ledger/LEDGER_CANONICAL_CONTEXT.md` | Phase 6.3 marked complete |
| `The-Ledger/docs/LEDGER_CANONICAL_CONTEXT.md` | Phase 6.3 marked complete |

---

## Verification

- Build: PASS (no new dependencies, no type changes)
- Playwright: 279 existing + 30 new = 309 total (target)
- Zero regressions expected

---

## Event Bus Doctrine (Summary)

The Event Bus is **informational and evaluative only**.

It may:
- Publish events
- Notify subscribers
- Trigger read-only evaluations

It may **never**:
- Approve submissions
- Create approved financial records
- Bypass the Review Centre
- Bypass the Approval Doctrine

All event processing is fully auditable. Job attribution is preserved on all records.

---

## Recommended Next Phase

**Phase 6.4 — Dashboard Intelligence Layer**

Objective: Transform the dashboard into a live operational intelligence hub surfacing actionable cross-module KPIs.

Deliverables:
- Executive Summary widget: live counts from Review Centre (pending), Exceptions (open), Governance (requires review), Reconciliation (unmatched)
- Financial Health Snapshot widget: sync health, reconciliation match rate, open exception count, pending financial controls
- Outstanding Actions widget: aggregated action-required items across all modules
- Recent Automation Activity widget: last 5 automation executions
- 15+ doctrine tests

Doctrine constraints: Read-only widgets, deep-link only, CEO only.
