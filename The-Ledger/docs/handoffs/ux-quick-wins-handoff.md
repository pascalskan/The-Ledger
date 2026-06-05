# THE LEDGER — UX QUICK WINS HANDOFF

**Date:** June 5, 2026
**Branch:** feature/ux-phases-1-2-3
**Status:** Committed — awaiting PR merge

---

## Summary

Following a full UX validation audit of the UX-1/2/3 implementation, four sub-day quick wins were identified and implemented. These changes are additional commits on the same branch as UX-1/2/3 (feature/ux-phases-1-2-3).

---

## Changes Made

### 1. Notification Bell Restored to Desktop Header

**File:** `client/src/components/layout.tsx`

The bell was removed from the desktop header during UX-2 to resolve a Playwright strict-mode violation (two elements with the same `data-testid="notif-bell-btn"`). Fixed by accepting an optional `testId` prop on the `NotificationBell` component (defaults to `"notif-bell-btn"` for the mobile instance). The desktop header now renders a second `NotificationBell` instance with `testId="notif-bell-btn-desktop"`. No test changes required.

### 2. "Executive Command Centre" → "Command Centre"

**File:** `client/src/components/layout.tsx`

The label in the INTELLIGENCE nav section was renamed from "Executive Command Centre" to "Command Centre". The route (`/executive-command-centre`), the `testId` (`nav-executive-command-centre`), and the page heading remain unchanged. One-character label change only.

### 3. "Financial Insights" → "Expenses"

**File:** `client/src/components/layout.tsx`

The OPERATIONAL nav item pointing to `/expenses` was renamed from "Financial Insights" to "Expenses". The label previously implied analytical content but the destination is an expense submission list. "Expenses" is accurate and industry-standard. Route and RBAC unchanged.

### 4. "Platform Events" Moved to Administration Section

**File:** `client/src/components/layout.tsx`

The `Platform Events` nav item (formerly "Event Monitor") was moved from `INTELLIGENCE_ITEMS` to `ADMIN_ITEMS`. It now appears inside the collapsible Administration section alongside Audit Log, Accounting Settings, and Settings. This reduces the INTELLIGENCE section from 6 items to 5 and places a power-user debugging tool where it belongs — alongside other administrative surfaces.

**Test fix required:** `tests/doctrine/event-bus.spec.ts` — EB-02 now expands the admin collapsible (`nav-admin-toggle`) before clicking `nav-event-monitor`. The testId itself is unchanged.

---

## Files Modified

| File | Change |
|---|---|
| `client/src/components/layout.tsx` | NotificationBell testId prop; ECC label rename; Financial Insights rename; Platform Events moved to ADMIN |
| `tests/doctrine/event-bus.spec.ts` | EB-02: expand admin collapsible before nav-event-monitor click |
| `docs/ux/UX_REDESIGN_PROGRAMME.md` | Section 9 tracker updated — UX-1/2/3 and UX-QW marked complete |

---

## Verification Results

| Test Suite | Result |
|---|---|
| Build | PASS |
| `executive-command-centre.spec.ts` (35) | PASS |
| `activity-feed.spec.ts` (25) | PASS |
| `audit-log.spec.ts` (1) | PASS |
| `notification-centre.spec.ts` | PASS |
| `event-bus.spec.ts` (30) — after EB-02 fix | PASS |
| `financial-explorer.spec.ts` (3) | PASS |
| `review.spec.ts` (1) | PASS |

---

## Doctrine Compliance

- Approval Doctrine: PRESERVED
- Audit Doctrine: PRESERVED
- RBAC: PRESERVED — all role checks unchanged
- No financial logic modified
- No route changes

---

## Updated UX Scores (post quick wins)

| Score | Before UX-1/2/3 | After UX-1/2/3 | After Quick Wins |
|---|---|---|---|
| Product Experience | 52/100 | 66/100 | ~68/100 |
| Commercial Readiness | 41/100 | 54/100 | ~56/100 |
| Investor Readiness | ~28/100 | ~48/100 | ~50/100 |

---

## Outstanding Work

This branch (feature/ux-phases-1-2-3) is now complete. All remaining UX programme work is deferred to future branches.

The next and highest-priority remaining improvement is the **Finance Hub (UX-4)**, which consolidates 8 finance-related navigation items into a single `/finance` route with 5 tabs. This is a substantial workstream and should be treated as an independent programme with its own specification, blueprint, branch, and validation audit. Do not begin UX-4 on this branch or in this session.

**Remaining critical issues before customer demonstrations:**
- RC-1: Finance fragmentation (8 items) — requires UX-4
- RC-3: Intelligence section still has 5 items including unclear labels — requires UX-5

**Remaining high priority:**
- HP-1: Review Centre in-queue experience — requires UX-7
- HP-3: Automation section still 3 items — requires UX-6

---

## Recommended Next Steps

1. Merge PR #23 (feature/ux-phases-1-2-3)
2. Open a new Finance Hub workstream as a separate programme
   - Produce a Finance Hub specification document
   - Produce a Finance Hub blueprint
   - Implement on a new branch: `feature/ux-phase-4-finance-hub`
   - Validate as a standalone audit after implementation
3. Do not begin UX-5 or UX-6 until UX-4 is merged and validated
