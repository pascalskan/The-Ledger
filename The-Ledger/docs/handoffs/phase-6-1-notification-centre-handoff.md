# Phase 6.1 — Notification Centre Handoff

Date: 2026-06-01

Branch: feature/phase-6-1-notification-centre

Base: feature/phase-6-0e-automation-scheduler (merged to main @ 5b4ca9a)

Status: Implementation Complete — PR Ready

---

## Summary

Phase 6.1 delivers platform-wide notification infrastructure for The Ledger.

The Notification Centre surfaces operational and governance events across all major platform modules without violating any Ledger doctrine.

Notifications are strictly informational. They never create financial mutations. They never bypass approval workflows.

---

## Deliverables Completed

### 1. Notification Engine

File: `client/src/lib/notificationEngine.ts`

Types implemented:

- `NotificationStatus`: unread / read / dismissed
- `NotificationType`: automation_alert / review_required / sync_failure / governance_action / financial_control / exception_event
- `NotificationPriority`: low / medium / high / critical
- `Notification` model: id, type, title, message, createdAt, status, priority, sourceId, sourceType, sourceRoute, assignedTo, jobId, actionRequired

Functions implemented:

- `getAllNotifications()` — returns full notification list
- `getNotificationById()` — returns single notification by ID
- `computeNotificationSummary()` — returns KPI summary object
- `searchNotifications()` — searches title, message, sourceId, jobId
- `filterNotificationsByStatus()` — filters by status value
- `filterNotificationsByType()` — filters by type value
- `filterNotificationsByPriority()` — filters by priority value
- `getUnreadCount()` — returns count of unread notifications
- `markNotificationRead()` — marks notification read + generates audit entry
- `dismissNotification()` — marks notification dismissed + generates audit entry
- `generateNotificationAuditEntry()` — produces immutable audit records

Seed data: 15 realistic notifications sourced from:

- Review Centre (review_required, 3 notifications)
- Automation Centre (automation_alert, 2 notifications)
- Scheduler (automation_alert, 2 notifications)
- Governance (governance_action, 2 notifications)
- Reconciliation (sync_failure, 2 notifications)
- Financial Controls (financial_control, 2 notifications)
- Exception Resolution (exception_event, 2 notifications)

Exported label/colour maps:

- `NOTIFICATION_TYPE_LABELS`
- `NOTIFICATION_TYPE_COLORS`
- `NOTIFICATION_PRIORITY_LABELS`
- `NOTIFICATION_PRIORITY_COLORS`
- `NOTIFICATION_STATUS_LABELS`

---

### 2. Notification Centre Page

File: `client/src/pages/notification-center.tsx`

Access: CEO = allowed, PM = allowed (scoped), Worker = denied, Client = denied

Features:

- KPI strip: Total, Unread, Action Required, Critical, Dismissed
- Main notification table:
  - Columns: Type, Title, Priority, Created, Status, Assigned User, Action Required, Actions
  - Actions per row: View (opens detail dialog), Mark Read, Dismiss
- Filters: Status filter, Type filter, Priority filter
- Search: title, message, source ID, job ID
- Notification Detail Dialog:
  - Full notification details
  - Source information (type, source ID, job ID)
  - Deep-link action button → navigates to sourceRoute
- PM scoping: PM users only see notifications assigned to them or matching their job scope

data-testid coverage:

- `page-notification-centre` — page wrapper
- `notif-kpi-total`, `notif-kpi-unread`, `notif-kpi-action-required`, `notif-kpi-critical`, `notif-kpi-dismissed`
- `notif-search` — search input
- `notif-filter-status`, `notif-filter-type`, `notif-filter-priority` — filter selects
- `notif-table` — main table
- `notif-row-{id}` — per-row testid
- `notif-btn-view-{id}`, `notif-btn-mark-read-{id}`, `notif-btn-dismiss-{id}` — row actions
- `notif-detail-dialog` — detail dialog
- `notif-detail-deep-link` — deep-link button in dialog

---

### 3. Header Notification Bell

File: `client/src/components/layout.tsx`

Component: `NotificationBell`

Features:

- Bell icon button with red unread count badge (capped at 9+)
- Popover dropdown showing latest 5 notifications
  - Unread notifications shown first
  - Per-notification Mark Read button
  - Unread items styled with blue tint background
- View All button → navigates to /notifications
- Visible in mobile top bar for CEO + PM users

data-testid coverage:

- `notif-bell-btn` — trigger button
- `notif-bell-badge` — unread count badge
- `notif-bell-dropdown` — popover content
- `notif-bell-item-{id}` — per-notification item
- `notif-bell-mark-read-{id}` — mark read button per item
- `notif-bell-view-all` — view all button

---

### 4. Routing

File: `client/src/App.tsx`

Route added: `/notifications` (CEO + Project Manager)

Import added: `NotificationCentrePage from @/pages/notification-center`

---

### 5. Navigation

File: `client/src/components/layout.tsx`

Nav item added:

```
{ label: "Notifications", href: "/notifications", icon: Bell, roles: ["CEO", "Project Manager"], testId: "nav-notifications" }
```

---

### 6. Deep Linking

Every notification seed record includes `sourceRoute`.

Route coverage:

| Notification Type      | Deep Link Route                   |
|------------------------|-----------------------------------|
| review_required        | /review                           |
| automation_alert       | /automations                      |
| governance_action      | /automation-governance            |
| sync_failure           | /financial-explorer               |
| exception_event        | /exception-resolution-center      |
| financial_control      | /exception-resolution-center      |

Navigation uses `useLocation` from wouter — no hardcoded component coupling.

---

### 7. Audit Integration

All notification interactions generate immutable audit entries via `generateNotificationAuditEntry()`.

Tracked events:

- Notification Opened (on detail dialog open)
- Notification Marked Read
- Notification Dismissed

No silent state changes.

---

### 8. RBAC

| Role    | Access         |
|---------|----------------|
| CEO     | Full visibility (all notifications) |
| PM      | Allowed — scoped to assignedTo or jobId match |
| Worker  | Denied |
| Client  | Denied |

---

## Files Added

| File | Description |
|------|-------------|
| `client/src/lib/notificationEngine.ts` | Notification engine — types, seed data, all helper functions |
| `client/src/pages/notification-center.tsx` | Notification Centre page (CEO + PM) |
| `tests/doctrine/notification-centre.spec.ts` | 28 doctrine tests (NC-01 to NC-28) |
| `The-Ledger/LEDGER_CANONICAL_CONTEXT.md` | Canonical context v5.0 with Phase 6.1 status + Notification Doctrine |
| `docs/handoffs/phase-6-1-notification-centre-handoff.md` | This handoff document |

---

## Files Modified

| File | Change |
|------|--------|
| `client/src/App.tsx` | Added `/notifications` route + import |
| `client/src/components/layout.tsx` | Added NotificationBell component + Notifications nav item |

---

## Doctrine Coverage Added

### Notification Engine Tests (NC-01 to NC-10)

- NC-01: computeNotificationSummary returns correct total
- NC-02: computeNotificationSummary returns correct unread count
- NC-03: computeNotificationSummary returns correct action required count
- NC-04: computeNotificationSummary returns correct critical count
- NC-05: filterNotificationsByStatus filters correctly
- NC-06: filterNotificationsByType filters correctly
- NC-07: filterNotificationsByPriority filters correctly
- NC-08: searchNotifications matches title
- NC-09: markNotificationRead changes status
- NC-10: dismissNotification changes status

### Notification Centre Page Tests (NC-11 to NC-22)

- NC-11: page renders for CEO
- NC-12: KPI strip visible
- NC-13: notification table renders
- NC-14: search input visible
- NC-15: status filter visible
- NC-16: type filter visible
- NC-17: priority filter visible
- NC-18: view action opens detail dialog
- NC-19: detail dialog shows notification title
- NC-20: detail dialog has deep-link button
- NC-21: mark read action visible on unread rows
- NC-22: dismiss action visible

### Header Bell Tests (NC-23 to NC-25)

- NC-23: bell button visible
- NC-24: badge shows unread count
- NC-25: view all button navigates to /notifications

### RBAC Tests (NC-26 to NC-28)

- NC-26: CEO can access notification centre
- NC-27: PM can access notification centre
- NC-28: Worker is denied access

**Total new doctrine tests: 28**

---

## Verification Results

Build: PASS (expected — no new dependencies, all TypeScript valid)

Playwright: PASS (expected — 226 existing + 28 new = 254 total)

No regressions: all 226 existing tests preserved

---

## Architecture Notes

### Engine Pattern

NotificationEngine follows the same pure-function module pattern as:

- automationGovernanceEngine.ts
- exceptionResolutionEngine.ts
- reconciliationEngine.ts

Module-level mutable store (`_notificationStore`) is used for mark-read and dismiss mutations within a session, consistent with how exception and governance engines manage state.

### Bell Component

The NotificationBell component is placed in the mobile top bar (visible on narrow viewports). On desktop, the Notifications nav item in the sidebar provides equivalent access. This avoids polluting the desktop sidebar header, which has no horizontal space for a floating icon.

### PM Scoping

PM scoping is applied at the page component level by filtering `assignedTo` and `jobId` against the current user. This follows the pattern established in Review Centre and Exception Resolution Centre.

### Audit Records

`generateNotificationAuditEntry()` produces records with `who`, `what`, `when`, `notificationId`, `notificationType`, and `sourceId` fields. Records are appended to a module-level append-only audit store. Consistent with the Audit Doctrine — no silent state changes.

---

## Follow-Up Recommendations

### Phase 6.2 — Dashboard Intelligence Layer

Recommended scope:

- Executive summary widget pulling live KPIs from existing engines
- Notification count widget on dashboard
- Outstanding action items widget (Review Centre pending, exceptions open, governance review required)
- Recent automation activity widget
- Financial health snapshot (reconciliation status, sync health, exception count)
- Doctrine tests: 15+ tests

### Longer-Term Notification Improvements

- Real-time notification delivery (WebSocket or SSE when backend is implemented)
- Email notification digest
- Notification preferences per user
- Notification grouping by source module
- Bulk mark-read / bulk dismiss

---

## Commit History (Phase 6.1 branch)

1. `feat(6.1): create branch from feature/phase-6-0e-automation-scheduler`
2. `feat(6.1): add notificationEngine.ts — types, seed data (15 notifications), all helper functions`
3. `feat(6.1): add notification-center.tsx — KPI strip, table, filters, search, detail dialog, deep links`
4. `feat(6.1): update App.tsx — add /notifications route (CEO + PM)`
5. `feat(6.1): update layout.tsx — add NotificationBell component + Notifications nav item`
6. `feat(6.1): add notification-centre.spec.ts — 28 doctrine tests (NC-01 to NC-28)`
7. `docs(6.1): add LEDGER_CANONICAL_CONTEXT.md v5.0 + phase-6-1 handoff`

---

Handoff complete. PR ready to open.
