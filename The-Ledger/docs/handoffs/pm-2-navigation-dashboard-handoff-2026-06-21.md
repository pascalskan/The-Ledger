# PM-2 — Navigation & Dashboard — Handoff

Date: 2026-06-21
Branch: `feature/pm-2-navigation-dashboard`
Status: **COMPLETE — build green; awaiting owner test run and PR merge to main.**

---

## Summary

PM-2 establishes the dedicated Project Manager experience. The PM experience is no longer a filtered-down CEO experience. It is now purpose-built around assigned-job operational visibility.

Three deliverables were completed:

1. **PM-RBAC-01 — Canonical role helper system** — `client/src/lib/roleHelpers.ts` provides `isCEO()`, `isProjectManager()`, `isWorker()`, `isClient()`. All PM-related surfaces touched in this phase use these helpers instead of inline role name comparisons.

2. **PM Navigation** — PMs now see a workflow-first navigation with Primary and Secondary sections (not a filtered CEO nav). CEO navigation is unchanged.

3. **PM Dashboard** — PMs see a dedicated operational dashboard (My Jobs, Reviews, Schedule, Attention Required). PMs no longer see Revenue, Costs, Margin, Outstanding Invoices, or Revenue at Risk — none of which are their operational concern.

---

## PM-1 Audit Findings Resolved

| Finding | Severity | Status |
|---|---|---|
| Dashboard exposes Revenue, Margin, Outstanding Invoices, Revenue at Risk to PM | Critical | **RESOLVED** |
| Dashboard is CEO-oriented; PMs need operational visibility | Critical | **RESOLVED** |
| Navigation is CEO-ordered; PMs need workflow-oriented navigation | High | **RESOLVED** |
| No canonical role helper system | High | **RESOLVED (PM-RBAC-01)** |

---

## Files Changed

### Created
- `client/src/lib/roleHelpers.ts` — PM-RBAC-01: canonical `isCEO()`, `isProjectManager()`, `isWorker()`, `isClient()` helpers
- `tests/doctrine/pm-rbac.spec.ts` — 17 PM doctrine tests (PM-RBAC-01 to PM-RBAC-17)
- `docs/handoffs/pm-2-navigation-dashboard-handoff-2026-06-21.md` — this document

### Modified
- `client/src/components/layout.tsx` — PM-first navigation (Primary + Secondary sections); CEO nav unchanged; imports canonical helpers
- `client/src/pages/dashboard.tsx` — Split into `PMDashboard` + `CEODashboard`; role-branched in the `Dashboard` export; PM no longer sees any financial data

---

## Architecture Decisions

### Role helper design
`roleHelpers.ts` takes `(user: User | null, roles: Role[])` as arguments rather than accepting a Zustand store directly. This keeps it a pure function — easy to test and easy to call from any component that already has `user` and `roles` from `useAuth` / `useStore`.

### PM nav structure
Two nav arrays — `PM_PRIMARY_ITEMS` and `PM_SECONDARY_ITEMS` — are built unconditionally in `Layout` and rendered only when `userIsPM` is true. The CEO arrays are built only when `userIsCEO` is true. This avoids mixing the two nav trees.

### Dashboard branching
`dashboard.tsx` exports a single `Dashboard` page component that reads `isProjectManager(user, roles)` and renders either `PMDashboard` or `CEODashboard`. The `CEODashboard` is the original dashboard code with no changes to its logic or testIds. The `PMDashboard` is a new operational dashboard.

### Financial visibility enforcement
- Zone A "Revenue at Risk" card (`dashboard-zone-a-revenue-at-risk`) is inside `CEODashboard` — PM never reaches it.
- Zone C (`dashboard-zone-c`) is inside `CEODashboard` — PM never reaches it.
- No CEO financial data exists anywhere in `PMDashboard`.

---

## PM Dashboard — Operational Sections

| Section | testId | Content |
|---|---|---|
| KPI Strip | `pm-dashboard-kpi-strip` | Active Jobs, Pending Reviews, Crew On Site, Jobs Requiring Attention, Upcoming (7 days) |
| My Jobs | `pm-dashboard-my-jobs` | All company jobs (Active/Planned/Completed), sorted newest first, pending review count, status/priority badges |
| Reviews | `pm-dashboard-reviews` | Pending count, corrections count, overdue count, recent pending list, Open Review Queue button |
| Schedule | `pm-dashboard-schedule` | Next 24h shifts, upcoming 7-day jobs, Open Schedule button |
| Attention Required | `pm-dashboard-attention` | Aggregated queue: overdue reviews, high-priority jobs with pending reviews, corrections needed |

---

## PM Navigation — New Structure

**Primary:**
- Overview (`/`) — `nav-pm-overview`
- My Jobs (`/jobs`) — `nav-pm-jobs`
- Reviews (`/review`) — `nav-review` (existing testId preserved)
- Schedule (`/schedule`) — `nav-pm-schedule`
- Crew (`/workers`) — `nav-pm-crew`

**Secondary:**
- Clients (`/clients`) — `nav-pm-clients`
- Map (`/map`) — `nav-pm-map`
- Stock & Assets (`/equipment`) — `nav-pm-stock`
- Notifications (`/notifications`) — `nav-notifications` (existing testId preserved)
- Expenses (`/expenses`) — `nav-pm-expenses`

**Hidden from PM (CEO-only):** Finance Hub, Intelligence Hub, Workflows, Automation Controls, Audit Log, Settings, Accounting Settings, Manage Roles, Automations.

---

## RBAC Changes

| Role | Dashboard | Navigation |
|---|---|---|
| CEO | `CEODashboard` (unchanged) | Core / Operational / Intelligence / Automation / Administration (unchanged) |
| PM | `PMDashboard` (new, operational) | Primary / Secondary (new, workflow-first) |
| Worker | (Worker mobile layout — unaffected) | Worker nav (unaffected) |
| Client | (Portal — unaffected) | (Portal nav — unaffected) |

---

## Tests Added

`tests/doctrine/pm-rbac.spec.ts` — 17 doctrine tests:

| ID | Description |
|---|---|
| PM-RBAC-01 | PM dashboard does not expose revenue KPI card |
| PM-RBAC-02 | PM dashboard does not expose revenue at risk card |
| PM-RBAC-03 | PM dashboard does not expose Zone C financial pulse |
| PM-RBAC-04 | PM dashboard contains no revenue/margin/invoice text |
| PM-RBAC-05 | PM KPI strip renders operational KPIs |
| PM-RBAC-06 | PM My Jobs section is visible |
| PM-RBAC-07 | PM Reviews section is visible |
| PM-RBAC-08 | PM Schedule section is visible |
| PM-RBAC-09 | PM Attention Required section is visible |
| PM-RBAC-10 | PM nav shows Primary workflow-first items |
| PM-RBAC-11 | PM nav shows Secondary items |
| PM-RBAC-12 | PM nav does not expose CEO-only items |
| PM-RBAC-13 | PM nav uses "My Jobs" label |
| PM-RBAC-14 | PM nav uses "Crew" label |
| PM-RBAC-15 | CEO dashboard still shows financial Zone C |
| PM-RBAC-16 | CEO dashboard shows Revenue at Risk card |
| PM-RBAC-17 | CEO navigation retains full structure |

---

## Verification Results

- Build (`npm run build`): **PASS**
- Doctrine compliance: **PASS** — no financial data in PM dashboard; CEO experience unchanged; RBAC rules enforced by role branching
- Playwright: **Pending owner local run** (per project workflow)

---

## Doctrine Compliance

| Doctrine | Finding |
|---|---|
| **RBAC** | PASS — PM sees operational data only; CEO experience unchanged; Worker/Client unaffected |
| **Financial Integrity** | PASS — no revenue, margin, or invoice data visible to PM |
| **Approval** | PASS — no financial mutations occur in dashboard; dashboard is read-only |
| **Audit** | PASS — no audit regressions; existing audit behaviour preserved |
| **Financial Visibility Rules** | PASS — PM cannot see company revenue, margin, outstanding invoices, revenue at risk, or executive financial summaries |

---

## Outstanding Work / Next Steps for PM-3

1. **Owner:** run the full Playwright suite locally and confirm green.
2. **Owner:** open and merge `feature/pm-2-navigation-dashboard` → `main` (as a PR, per git workflow).
3. **PM-3** (separate workstream) — suggested scope:
   - PM Jobs workspace: dedicated job detail view with crew assignment, review queue scoped to that job, and schedule management
   - PM Crew management: crew availability calendar, assignment workflow
   - PM Schedule management: conflict detection, crew commitment view
   - Explicit PM→job assignment in mock data (currently all jobs are visible to PM; PM-3 should introduce proper PM scope binding)
   - PM Notifications: scope notifications to assigned-job events only
4. Consider extracting shared `KpiCard` / `SectionCard` primitives (noted as a deferred refactor — non-blocking)
