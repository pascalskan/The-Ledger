# UX-5 — INTELLIGENCE HUB SPECIFICATION

**Version:** 1.1 (Amended — frozen, implementation-ready)
**Date:** June 12, 2026
**Phase:** UX-5 of the UX Redesign Programme
**Status:** FROZEN — approved for implementation
**Supersedes:** UX-5-INTELLIGENCE-HUB-SPECIFICATION.md (v1.0, June 10, 2026)
**Amendment input:** Independent review of v1.0 (June 10, 2026 session: "UX-5 Intelligence Hub — Independent Review") — verdict "Ready with amendments"; all P0/P1 findings resolved in this version. See `UX-5-INTELLIGENCE-HUB-AMENDMENT-SUMMARY.md` for the finding-by-finding ledger.
**Authoritative inputs:**
- `docs/ux/UX_REDESIGN_PROGRAMME.md` — Decision 5, Phase UX-5 definition (Section 5)
- `docs/ux/CEO_EXPERIENCE_REDESIGN_SPECIFICATION.md` — Part 4 (Intelligence Consolidation), Appendix A (Terminology)
- `docs/ux/CEO_EXPERIENCE_UX_BLUEPRINT.md` — Blueprint 6 (Intelligence Hub), Blueprint 11 (Build Order)
- `docs/ai-context/LEDGER_CANONICAL_CONTEXT.md` — all doctrines
- UX-4 Finance Hub implementation (`client/src/pages/finance-hub.tsx`) — the proven hub pattern

This specification does not reopen any approved decision. It translates Decision 5 and Blueprint 6 into an implementation-ready plan grounded in the current codebase.

**Blueprint errata (recorded per review P2; do not "correct" the spec back toward the blueprint):**
- Blueprint 6.6 cites `activityFeedEngine.getRecentEvents()` — that function does not exist; the correct API is `getAllEvents()` (used throughout this spec).
- Blueprint 6.6's wireframe omits the "Sync" type chip; Part 4 §4.1 includes it. This spec follows Part 4 (six type filters including Sync).

---

# 1. EXECUTIVE SUMMARY

## Purpose

UX-5 consolidates the CEO's read-only intelligence destinations — Executive Command Centre, Analytics Centre, Reporting Centre (Reports + Exports + Distribution), Activity Feed, and Notification Centre (CEO consumption) — into a single Intelligence Hub at `/intelligence` with five tabs: **Overview · Analytics · Reports · Exports · Activity**.

The Event Monitor (`/event-monitor`) leaves normal navigation but **remains a routed, CEO-only hidden page** (power-user deep URL), preserving Decision 5's promise that advanced platform events stay accessible. The Activity tab's "Show Event Detail" toggle additionally surfaces bus-event metadata inline for live-dispatched events (§6.6, §10.5).

The hub becomes the CEO's periodic decision-making workspace. It answers, in one destination:

- *Is my business healthy?* — Health Scorecard (Overview)
- *What requires executive intervention?* — Critical Items panel (Overview)
- *Which trends, forecasts, and risks deserve focus?* — Analytics tab
- *What do I report to the board?* — Reports and Exports tabs
- *What has happened across the platform?* — Activity tab (combined feed)

## Strategic Value

The six separate destinations created the impression of redundancy and over-engineering (programme audit finding: "fragmented intelligence"). They are all read-only, all share the informational doctrine, and all but the Notification Centre are CEO-only. From the user's perspective they are one place: "where I go to understand how my business is performing." Consolidation communicates a coherent intelligence layer and completes the third of the three CEO engagement modes (daily triage / operations / intelligence review — Decision 8).

## Target Personas

| Persona | Relationship to the hub |
|---|---|
| **CEO** | Primary user. Weekly/monthly focused intelligence sessions; occasional drill-down from dashboard alerts. Full hub access + hidden `/event-monitor` power-user route. |
| **Project Manager** | No hub access (all underlying CEO-only doctrines preserved). Retains job-scoped Notification Centre access via `/notifications`. |
| **Worker / Client** | No access of any kind. No change. |
| **Future: investor/advisor read-only role** | The hub's single-destination, read-only structure is the natural mount point for a future scoped "advisor" role. Out of scope for UX-5; noted for extensibility only. |

---

# 2. CURRENT STATE ASSESSMENT

## 2.1 Repository Baseline

- Branch: `main`, clean, up to date with origin (`cf93a4a` — UX-4 merge).
- Build: PASS. Playwright: 501 total / 499 passed / 2 known baseline failures (AF-08, NC-25 — pre-existing, documented in `CURRENT_DEVELOPMENT_STATE.md`). UX-5 retires AF-08 (with the legacy KPI strip it asserts on — §13.2) and fixes NC-25 (in-scope companion commit — §4).
- UX-1 → UX-4 complete. UX-5 dependency (UX-4) satisfied.

## 2.2 Existing Pages To Be Consolidated

| Page | Route | Size | RBAC | Disposition |
|---|---|---|---|---|
| `executive-command-centre.tsx` | `/executive-command-centre` | 685 lines | CEO | Consolidated into Overview tab; route redirects |
| `analytics-centre.tsx` | `/analytics-centre` | 391 lines | CEO | Content extracted unchanged into Analytics tab; route redirects |
| `reporting-centre.tsx` | `/reporting-centre` | 1,098 lines | CEO | Content extracted into Reports + Exports tabs; route redirects |
| `activity-feed.tsx` | `/activity-feed` | 392 lines | CEO | Superseded by Activity tab (new component); route redirects |
| `event-monitor.tsx` | `/event-monitor` | 386 lines | CEO | **Retained as hidden route** (nav item removed; page unchanged) — P0-B resolution |
| `notification-center.tsx` | `/notifications` | 525 lines | **CEO + PM** | CEO consumption moves to Activity tab (role-aware redirect); PM page unchanged, job-scoped |

## 2.3 Existing Navigation State (`client/src/components/layout.tsx`)

- INTELLIGENCE section currently holds 5 items: Command Centre, Analytics Centre, Reporting Centre, Activity, Notifications (lines 308–314).
- "Platform Events" (`/event-monitor`) currently sits in ADMINISTRATION (line 327).
- Notification bell "View All" navigates to `/notifications` (line 97).
- **Header System Alert indicator** navigates to `/executive-command-centre` (line 204) — must be re-pointed (§5.5).

## 2.4 Reusable Assets

**The UX-4 hub pattern (`finance-hub.tsx`) — reuse wholesale:**
- Query-param tab state (`/finance?tab=…&sub=…`) via wouter `useSearch` — bookmarkable, testable, no nested routes.
- shadcn `Tabs` with `flex-wrap` TabsList for mobile.
- Content extraction pattern: existing pages export named `*Content` components (e.g. `FinancialRecordsContent` with `embedded` prop); legacy default page exports replaced by redirects.
- Synchronous `RedirectToFinance` component (App.tsx lines 95–103) — to be generalised as `RedirectToIntelligence`.
- Inner CEO role check inside sensitive tab components (defence-in-depth, NG-05 pattern).
- Hub-level audit recorders hosted in `analyticsEngine.ts` (`recordFinanceHub*` precedent, lines 769–807). Note: `analyticsEngine.ts` is hereby designated the platform's "hub audit host" — add a code comment to that effect when adding the UX-5 recorders (review P2).

**Engines (all data already exists — zero new data modelling):**

| Engine | Relevant API |
|---|---|
| `executiveCommandEngine` | `getExecutiveHealthSnapshot()` (4 dimensions), `getCriticalItems()`, `getExecutiveSummary()`, `getOperationalOverview()`, `recordExecutiveCentreViewed/AlertOpened/DeepLinkOpened()` |
| `analyticsEngine` | `getAnalyticsSummary()`, `getCriticalRisks()`, `getTrendAnalysis()`, `getForecasts()`, `getBottleneckAnalysis()`, `recordAnalyticsViewed/ForecastViewed/RiskInvestigationOpened()` |
| `reportingEngine` | `getAllReports()`, `computeReportingSummary()`, generation + audit API |
| `exportEngine` | `getAllExports()`, `getAllDistributions()`, summaries, `generateExport/BoardPack()`, `downloadExport()`, audit API |
| `activityFeedEngine` | `getAllEvents()`, `computeActivitySummary()`, `filterEventsByType/Priority()`, `recordEventViewed/Opened/Navigated()` |
| `notificationEngine` | `getAllNotifications()`, `computeNotificationSummary()`, `getUnreadCount()`, `markNotificationRead()`, `dismissNotification()`, `scopeNotificationsForPM()` |
| `eventBusEngine` | `getEventHistory()`, `computeEventBusSummary()`, type/priority labels and colors |
| `workflowEngine` / Zustand store | Not used by the Overview strip in v1.1 (see §10.1 — "Last Workflow Run" tile replaced); `useStore().jobs` supplies the Active Jobs tile |

**UI primitives:** shadcn Tabs, Card, Badge, Switch, Button; existing priority/type color maps in the engines.

## 2.5 Gaps in Current UX

1. No single intelligence landing — the CEO must know which of six screens answers which question.
2. The Executive Command Centre overlaps heavily with the Analytics Centre (two health scorecards), the Reporting Centre (reporting/export snapshots), and the Activity Feed (activity stream) — pure duplication from phased construction.
3. Activity and Notifications are two interleaved chronologies of the same platform story, with no combined view.
4. Event Monitor exposes internal Event Bus doctrine as a top-level concept (Decision 9 violation, already demoted to ADMIN in UX-2 — still a standalone nav item).
5. The notification bell's "View All" leads to a soon-to-be-consolidated destination.

---

# 3. STRATEGIC GOALS

1. **One intelligence destination.** A CEO finds health, risk, trends, reports, exports, and activity behind a single nav item.
2. **Answer "is anything wrong?" in under 10 seconds.** Overview tab leads with the Health Scorecard and Critical Items.
3. **Progressive disclosure.** Summary → tab → drill-down deep link to source module. Raw event data hidden behind a power-user toggle; full bus history behind a hidden power-user route.
4. **Zero new data, zero doctrine change.** Presentation-layer consolidation only; every metric originates from an existing engine.
5. **Preserve every audit trail.** All existing module-level audit events keep firing; hub-level view events are added.
6. **No test-coverage regression.** Full suite green after migration (expected-failure ledger emptied: AF-08 retired with its target element, NC-25 fixed — §13.5); new doctrine coverage added for the hub.

---

# 4. SCOPE

## In Scope

- New `/intelligence` route, hub shell page, 5-tab sub-navigation (Overview, Analytics, Reports, Exports, Activity).
- New Intelligence Overview landing page (Health Scorecard, Critical Items, Platform Summary strip).
- New Activity tab combining Activity Feed + Notification history with type/priority filtering and "Show Event Detail" power-user toggle. Canonical priority mapping per §10.5 (P0-A).
- Content-component extraction from `analytics-centre.tsx` and `reporting-centre.tsx` (Reports / Exports / Distribution split).
- Navigation consolidation: INTELLIGENCE section becomes a single "Intelligence" item for CEO; "Platform Events" removed from ADMINISTRATION. **`/event-monitor` route retained, hidden** (P0-B).
- Redirects from five legacy routes to hub equivalents (role-aware for `/notifications`). `/event-monitor` is **not** redirected.
- Notification bell "View All" → `/intelligence?tab=activity` for CEO (PM unchanged).
- **NC-25 stabilization fix** (unique mobile/desktop bell badge testIds) as an isolated companion commit — locked in because UX-5 naturally touches the bell component (amendment decision; formerly OQ-4/P2-1).
- Hub audit instrumentation (UX-4 pattern).
- Link & route-constant sweep per §5.5 (header alert, dashboard Zone A, reportingEngine deep links, engine route constants) — redirects are a compatibility layer, not a permanent dependency.
- Test migration for the affected doctrine suites + new `intelligence-hub.spec.ts`.
- Tracker/handoff/context documentation updates.

## Out of Scope

- Any change to engines' data computation, doctrines, approval workflows, or financial logic.
- Any backend work.
- UX-6 (Automation Hub), UX-7 (Review Centre), UX-8 (Operations Hub).
- Redesigning the content of Analytics, Reports, or Exports — they mount **unchanged** (Blueprint 6.3–6.5: "renders existing content unchanged").
- New analytics, new KPIs, new forecasts, AI-generated summaries. (No AI-assisted summary feature exists in the approved blueprint; introducing one would require a registered change request and AI Advisory Doctrine review. Explicitly excluded.)
- Changes to `event-monitor.tsx` page internals (route retained as-is; only its nav item is removed).
- Re-anchoring activity seed dates (the data-hygiene issue formerly behind AF-08) — optional maintenance, no longer test-blocking once AF-08 is retired (§13.2).
- Deleting legacy page files (`executive-command-centre.tsx` etc. become unrouted or redirect-only; physical deletion deferred to a cleanup pass once tests are fully migrated).

---

# 5. INFORMATION ARCHITECTURE

## 5.1 Navigation Changes

**Before (CEO sidebar, INTELLIGENCE section):** Command Centre · Analytics Centre · Reporting Centre · Activity · Notifications (5 items) + Platform Events under ADMINISTRATION.

**After:**

```
INTELLIGENCE
  └── Intelligence        /intelligence        (CEO)        testId: nav-intelligence-hub
```

- PM continues to see a single "Notifications" item (`/notifications`) in the INTELLIGENCE section — PM has no other intelligence permission, and the Notification Doctrine grants PM job-scoped notification visibility. The label and route are unchanged for PM.
- "Platform Events" is removed from ADMINISTRATION. The Event Monitor **page remains routed at `/event-monitor`** (CEO-only) as an unlisted power-user URL; everyday event inspection happens via the Activity tab's "Show Event Detail" toggle (Decision 5 intent preserved — P0-B).
- Net CEO primary-nav progress toward the 7-item Appendix B target: intelligence collapses from 6 entries (5 + admin Platform Events) to 1.

## 5.2 Routes and Redirects

| Legacy route | Disposition |
|---|---|
| `/intelligence` | **New.** CEO-only `ProtectedRoute`. `?tab=` ∈ {overview (default), analytics, reports, exports, activity}; `?sub=` for Exports sub-tabs; `?detail=1` pre-enables the Activity Event Detail toggle (precedence rules §6.6) |
| `/executive-command-centre` | Redirect → `/intelligence?tab=overview` (CEO) |
| `/analytics-centre` | Redirect → `/intelligence?tab=analytics` (CEO) |
| `/reporting-centre` | Redirect → `/intelligence?tab=reports` (CEO) |
| `/activity-feed` | Redirect → `/intelligence?tab=activity` (CEO) |
| `/event-monitor` | **Retained, hidden.** CEO-only `ProtectedRoute`, no nav item, page unchanged. Serves full Event Bus history (including the 20 seeded records). **No redirect** (P0-B) |
| `/notifications` | **Role-aware.** CEO → redirect `/intelligence?tab=activity`. PM → existing Notification Centre page renders unchanged |

Redirect implementation mirrors `RedirectToFinance` (synchronous `setLocation`, no `useEffect`, single string argument — see App.tsx:95–103 comment). Redirect routes must be declared **before** any retained legacy declarations (wouter first-match-wins; UX-4 precedent App.tsx:183–211). **Note:** the current `/notifications` route is declared early in the route tree (App.tsx:151, among the phase-6.1 routes) — the role-aware replacement must be installed at that declaration position (or earlier) so first-match-wins ordering is respected there too (review §7).

## 5.3 Relationships With Other Surfaces

| Surface | Relationship |
|---|---|
| **Dashboard (Command)** | Zone A "Critical Alerts" card's "View Alerts" action currently targets `/executive-command-centre` (dashboard.tsx:297) — re-point to `/intelligence?tab=overview` (§5.5). Other Zone A drill-downs already deep-link to alert sources. Intelligence widgets were already removed in UX-3. |
| **Shared header (layout.tsx)** | The System Alert indicator (layout.tsx:204) currently navigates to `/executive-command-centre` — re-point to `/intelligence?tab=overview` (§5.5; review P1-B). |
| **Finance Hub** | Sibling hub; no structural coupling. Critical Items deep links targeting finance surfaces already resolve to UX-4 hub URLs — verified in `NOTIFICATION_SOURCE_ROUTES` / `ACTIVITY_EVENT_ROUTES` / `BUS_EVENT_ROUTES` (all `sync`/`reconciliation`/`exception`/`financial_control` entries point at `/finance?tab=…` — notificationEngine.ts:113–120, activityFeedEngine.ts:121–135, eventBusEngine.ts:140–154). AC-13 is satisfiable by assertion, not by new work. |
| **Review Centre** | Untouched. Activity tab rows about review events deep-link to `/review` (navigate-only, never execute — Activity Feed Doctrine). |
| **Jobs** | Job-attributed events in the Activity tab deep-link to `/jobs/:id`. |
| **Automation pages** | Critical Items / Activity rows deep-link to current automation routes (`/automations`, `/automation-governance`, `/workflows`). UX-6 will later re-point these to `/automation?tab=…`; UX-5 uses today's routes. |
| **Notification bell (header)** | Preview dropdown unchanged; "View All Notifications" becomes role-aware: CEO → `/intelligence?tab=activity`, PM → `/notifications`. NC-25 badge fix lands in the same component as an isolated companion commit. |

## 5.4 Entry Points Summary

1. Sidebar "Intelligence" item (primary).
2. Notification bell "View All" (CEO).
3. Header System Alert indicator (CEO — re-pointed, §5.5).
4. Legacy-route redirects (bookmarks, in-app residual links).
5. Dashboard Zone A drill-downs where the alert source is an intelligence concern.
6. `/event-monitor` direct URL (power users; unlisted).

## 5.5 Link & Route-Constant Sweep (normative — P1-B resolution)

First-party references to consolidated routes are **updated at the source**; redirects exist only as a compatibility layer for bookmarks and stale external references. The complete verified inventory:

| # | Location | Current target | New target |
|---|---|---|---|
| S-1 | `layout.tsx:204` — header System Alert indicator | `/executive-command-centre` | `/intelligence?tab=overview` |
| S-2 | `layout.tsx:309–314, 327` — nav items | 5 INTELLIGENCE items + Platform Events | Single "Intelligence" item (CEO); "Notifications" (PM); Platform Events removed |
| S-3 | `layout.tsx:97` — bell "View All" | `/notifications` | Role-aware: CEO → `/intelligence?tab=activity`; PM → `/notifications` |
| S-4 | `dashboard.tsx:297` — Zone A "View Alerts" | `/executive-command-centre` | `/intelligence?tab=overview` |
| S-5 | `reportingEngine.ts:258` (seed) and `:565` (generation template) — Executive Overview/Summary sections | `deepLinkRoute: '/executive-command-centre'` | `/intelligence?tab=overview` |
| S-6 | `reportingEngine.ts:259, 406, 577` (seed + generation templates) — Risk/KPI sections | `deepLinkRoute: '/analytics-centre'` | `/intelligence?tab=analytics` |
| S-7 | `activityFeedEngine.ts:126` — `ACTIVITY_EVENT_ROUTES.notification_event` | `/notifications` | `/intelligence?tab=activity` (consumers are CEO-only surfaces) |
| S-8 | `eventBusEngine.ts:145` — `BUS_EVENT_ROUTES.notification_event` | `/notifications` | `/intelligence?tab=activity` (sole consumer is the CEO-only event-monitor page) |
| S-9 | `NOTIFICATION_SOURCE_ROUTES` (notificationEngine.ts:113–120) | Already `/review`, `/automations`, `/finance?tab=…` | **No change** — verified free of legacy intelligence routes |
| S-10 | ECC "System Modules" quick links (executive-command-centre.tsx:468–470) | `/activity-feed`, `/event-monitor`, `/reporting-centre` | Die with the unrouted ECC page — all targets remain reachable (nav / hidden route / hub tab); no action |

Notes: S-5/S-6 touch *seeded data and generation templates* in `reportingEngine.ts` — these render as deep-link buttons inside the hub's own Report Detail Dialog, so leaving them stale would bounce the CEO out through a redirect and back into the hub (review P1-B). Updating them is presentation routing data only — no financial logic. A final repo-wide grep for `/executive-command-centre|/analytics-centre|/reporting-centre|/activity-feed` (and CEO-context `/notifications`) in `client/src` is the AC-12 acceptance check.

---

# 6. PAGE LAYOUT

## 6.1 Hub Shell

Mirrors Finance Hub exactly (heading + subtitle + wrap-capable TabsList):

```
Intelligence — {Tab label, omitted on Overview}
Health, analytics, reports and activity — your business intelligence in one place.

[Overview] [Analytics] [Reports] [Exports] [Activity]
```

- `h1` testId `intelligence-hub-heading`; page testId `intelligence-hub-page`.
- Tab icons: Overview `LayoutDashboard`, Analytics `BarChart3`, Reports `BookOpen`, Exports `FileDown`, Activity `Activity`.
- A single "CEO Only" badge and one shared advisory doctrine notice render at hub level on the Overview tab; the existing per-page doctrine notices inside Analytics/Reports/Exports content are retained unchanged (they carry doctrine testIds).
- Embedded content components must not render their own `h1` (UX-4 "heading cleanup" lesson — Day 5 commit `5b73186`); page-level headers in extracted content are suppressed via the `embedded` prop.

## 6.2 Tab 1 — Overview (new page; Blueprint 6.2)

Top-to-bottom:

**A. Health Scorecard** — `grid md:grid-cols-4 gap-4`, one card per dimension from `executiveCommandEngine.getExecutiveHealthSnapshot()`: Operational Health, Financial Health, Governance Risk, Workflow Efficiency. Each card: dimension label, score `NN/100`, status pill with dot (Healthy ≥80 emerald / Warning 50–79 amber / Critical <50 red — exact classes per Blueprint 6.2 table). Cards are **not** clickable actions; an optional "View analytics →" ghost link navigates to the Analytics tab.

**B. Critical Items panel** — from `executiveCommandEngine.getCriticalItems()` (`CriticalAlertItem[]`; `priority: 'high' | 'critical'` — executiveCommandEngine.ts:98). Row: severity dot + severity label + description + ghost "[Action →]" button deep-linking to `sourceRoute` (fires `recordExecutiveAlertOpened` + `recordExecutiveDeepLinkOpened`).

**Severity rendering (normative — P1-E resolution).** `CriticalAlertItem.priority` maps onto the hub's canonical display taxonomy (§10.5):

| `priority` | Dot | Label | Classes |
|---|---|---|---|
| `critical` | Red | **Critical** | `bg-red-500` dot; `text-red-700` label |
| `high` | Amber | **Warning** | `bg-amber-500` dot; `text-amber-700` label |

Rows carry `data-priority="critical|high"` on `intel-critical-item-row` for testability. Sort order: `critical` first, then `high`, then `createdAt` descending within each band. Max 5 rows; "Show all N →" reveals the rest in place. Empty state: emerald CheckCircle, "No critical items — all systems healthy."

**C. Platform Summary strip** — 6 compact stat tiles, each with exactly one verified source (normative — P0-C resolution; full contract in §10.1):

| Tile | Label | Source |
|---|---|---|
| 1 | Active Jobs | `useStore().jobs.filter(j => j.status === 'Active').length` (Zustand store; dashboard Zone B / job-intelligence precedent) |
| 2 | Pending Reviews | `getExecutiveSummary().pendingReviews` |
| 3 | Active Rules | `getOperationalOverview().activeAutomations` |
| 4 | Open Exceptions | `getExecutiveSummary().openExceptions` |
| 5 | Active Workflows | `getExecutiveSummary().activeWorkflows` |
| 6 | Unread Notifications | `notificationEngine.getUnreadCount()` |

("Active Workflows" replaces v1.0's "Last Workflow Run", which had no field in any named API — P0-C. No tile performs computation beyond the documented Active-status filter on tile 1.) Read-only; no actions.

The ECC's remaining sections (operational/governance/financial overview cards, reporting snapshot, export snapshot, activity stream, System Modules quick links) are **not** carried into Overview — each is now redundant with a dedicated hub tab, the Finance Hub, primary nav, or the hidden `/event-monitor` route. (Resolved decision, formerly OQ-2: drop.)

## 6.3 Tab 2 — Analytics

`AnalyticsCentreContent` (extracted) renders the existing Analytics Centre **unchanged**: doctrine notice, 5-dimension health, critical risks with investigation deep links, trends, forecasts ("Projections — Advisory Only" labels preserved), bottlenecks. Fires `recordAnalyticsViewed` on tab activation.

## 6.4 Tab 3 — Reports

`ReportsContent` (extracted from `reporting-centre.tsx`): doctrine notice, reports KPI strip, reports table with status filter, Report Detail Dialog, Report Builder Dialog, deep links. Unchanged behaviour, except report-section deep links now target hub URLs per §5.5 S-5/S-6. Note: "Generate Export" inside the Report Detail Dialog creates an export that must appear in the Exports tab on next render (state refresh on tab activation handles this — see §7.2).

## 6.5 Tab 4 — Exports

Two sub-tabs (UX-4 Accounting-tab pattern, `?sub=` param, default `exports`):

- **Exports** (`ExportsContent`): export KPI strip, exports table (View / Download / Archive), status filter, Export Detail Dialog with doctrine notice + audit reference, Board Pack generator.
- **Distribution** (`DistributionContent`): distribution KPI strip (total, delivered, pending, failed, delivery rate), distribution table.

All existing behaviour and audit events unchanged.

## 6.6 Tab 5 — Activity (new combined view; Blueprint 6.6)

**No KPI strip (normative — P1-C resolution).** The Activity tab deliberately has no KPI/summary strip and no counts in its filter chips. Blueprint 6.6 defines the tab as filters + combined list only; the legacy Activity Feed page's 5-card KPI strip (`af-kpi-*`) is retired with that page. Consequence for AF-08: see §13.2.

**Filter bar:**
- Type: `All · Operational · Financial · Governance · Automation · Sync` (Part 4 filter set; mapping in §10.5).
- Priority: `All · Critical · Warning · Info` — the hub's canonical display taxonomy. Filtering on merged records uses the canonical priority mapping in §10.5 (P0-A).
- Right-aligned `Switch`: **"Show Event Detail"** — see persistence/precedence rules below; when ON, each row expands with the metadata contract defined in §10.5.

**Combined chronological list** (newest first) merging:
- Activity events — `activityFeedEngine.getAllEvents()`
- Notifications — `notificationEngine.getAllNotifications()` (rendered with a "Notification" chip)

Row anatomy: priority dot · priority label (canonical taxonomy) · type label · relative timestamp · title · job/source line · trailing action. Actions:
- Activity rows: "Open Source →" (deep link; fires `recordEventNavigated`). Read-only otherwise.
- Notification rows: "Mark Read" / "Dismiss" (existing engine functions; doctrine-audited informational state changes — permitted) + deep link (fires `recordNotificationOpened`).

**"Show Event Detail" toggle — persistence and precedence (normative — P1-D resolution):**

1. Default state: OFF.
2. On mount **without** `detail` query param: initial state read from `localStorage` key `ledger.intelligence.eventDetail` (defensive read; absent/invalid → OFF).
3. On mount **with** `?detail=1`: the URL parameter **wins** over localStorage for that visit. It does **not** write to localStorage.
4. User interaction with the Switch always writes the new state to localStorage (this is the only writer).
5. Removing/adding the param via in-app navigation re-evaluates rules 2–3.

**Event Bus relationship (normative — P0-B resolution):**

- When a live `publishEvent()` call dispatches to the activity feed, the created `ActivityEvent` carries id `bus-af-${busEvent.id}` (eventBusEngine.ts:281). **This prefix convention is the documented join key**: the Activity tab resolves a row's bus counterpart by stripping the `bus-af-` prefix and looking up `eventBusEngine.getEventHistory()` by id.
- The 20 **seeded** bus events are suppressed from the activity feed at seed time (`_suppressActivityFeedDispatch`, eventBusEngine.ts:171/709 — per the Event Bus Doctrine seed-suppression note in the canonical context). They therefore have **no** activity counterpart and do **not** appear in the combined list. They remain fully accessible on the retained hidden `/event-monitor` route — no historical data is lost.
- "Show Event Detail" ON: every row expands with its activity-record metadata (§10.5); rows with a resolvable bus counterpart additionally render the matching `BusEventRecord` block (bus event id, category, `consumedBy` subscribers, bus audit entry count) beneath, marked with a "Platform Event" chip.

**Pagination:** initial 25, "Load More" appends 25.

**Empty state:** "No activity matches your filters."

## 6.7 Drill-Down Behaviour (all tabs)

Deep links navigate only — never execute actions (Notification / Activity Feed / ECC doctrines). No inline approve/resolve/retry controls anywhere in the hub.

## 6.8 Mobile

- TabsList wraps (`flex flex-wrap h-auto gap-1` — Finance Hub pattern).
- Health Scorecard collapses to 1-column; summary strip to 2-column grid.
- Activity filter chips wrap; Event Detail toggle drops below filters.
- No new mobile navigation work (bottom tab bar is UX-8).

---

# 7. COMPONENT ARCHITECTURE

## 7.1 New Files

| File | Responsibility | Est. size |
|---|---|---|
| `client/src/pages/intelligence-hub.tsx` | Hub shell: RBAC, tab/sub state from query params, audit effects, tab mounting. Mirror of `finance-hub.tsx` | ~250 lines |
| `client/src/components/intelligence/IntelligenceOverview.tsx` | Overview tab (§6.2) | ~300 lines |
| `client/src/components/intelligence/ActivityHub.tsx` | Combined Activity tab (§6.6), incl. merge/filter logic, priority mapping, and Event Detail expansion | ~400 lines |
| `tests/doctrine/intelligence-hub.spec.ts` | New doctrine suite (§13) | ~38 tests |

## 7.2 Modified Files

| File | Change |
|---|---|
| `client/src/pages/analytics-centre.tsx` | Extract + export `AnalyticsCentreContent({ embedded })`; default export becomes thin legacy wrapper (unrouted after redirect) |
| `client/src/pages/reporting-centre.tsx` | Extract + export `ReportsContent`, `ExportsContent`, `DistributionContent`. **State split:** reports state into `ReportsContent`; exports + distribution state into their components; cross-tab freshness via load-on-mount/activation (each content component loads from its engine on mount — engines are module singletons, so no shared React state is required) |
| `client/src/pages/notification-center.tsx` | Unchanged rendering for PM; no longer reachable by CEO (redirect). No internal change expected beyond optional dead-code trim |
| `client/src/pages/executive-command-centre.tsx`, `activity-feed.tsx` | Become unrouted legacy files this phase (redirects replace routes). Reusable fragments (health card, critical item row, event row rendering) are lifted into the two new intelligence components, not imported from the legacy pages |
| `client/src/pages/event-monitor.tsx` | **Unchanged.** Route retained (hidden); only its nav item is removed (P0-B) |
| `client/src/App.tsx` | Add `/intelligence` route (CEO), `RedirectToIntelligence` helper, 5 legacy redirects (declared before retained legacy routes; role-aware `/notifications` handling installed at its existing early declaration position — §5.2); `/event-monitor` route declaration kept |
| `client/src/components/layout.tsx` | INTELLIGENCE section: single "Intelligence" item (CEO) + "Notifications" (PM-only visibility); remove "Platform Events" from ADMIN; role-aware bell "View All"; header System Alert indicator → `/intelligence?tab=overview` (S-1); NC-25 badge fix (companion commit) |
| `client/src/pages/dashboard.tsx` | Zone A "View Alerts" → `/intelligence?tab=overview` (S-4) |
| `client/src/lib/reportingEngine.ts` | Seeded + template `deepLinkRoute` values updated to hub URLs (S-5/S-6) — presentation routing data only |
| `client/src/lib/activityFeedEngine.ts` | `ACTIVITY_EVENT_ROUTES.notification_event` → `/intelligence?tab=activity` (S-7) |
| `client/src/lib/eventBusEngine.ts` | `BUS_EVENT_ROUTES.notification_event` → `/intelligence?tab=activity` (S-8) |
| `client/src/lib/analyticsEngine.ts` | Add UX-4-pattern hub audit recorders: `recordIntelligenceHubViewed`, `recordIntelligenceHubTabViewed(tab)`, `recordIntelligenceHubDeepLinkOpened(destination)`, `getIntelligenceHubAuditLog()`, `_resetIntelligenceHubAuditState()`; add "hub audit host" designation comment |

## 7.3 Reuse vs New — Summary

| Capability | Source | Reuse mode |
|---|---|---|
| Hub shell, tab routing, redirects, inner RBAC, audit wiring | UX-4 Finance Hub | Pattern copy |
| Analytics tab | `analytics-centre.tsx` | Extract unchanged |
| Reports / Exports / Distribution | `reporting-centre.tsx` | Extract unchanged (state split) |
| Health Scorecard, Critical Items, Summary | `executiveCommandEngine` + ECC rendering fragments | New component, existing data + styling |
| Activity rows, filters | `activity-feed.tsx` + `notification-center.tsx` rendering logic; engine color/label maps | New component, existing data + styling |
| Event Detail expansion | `event-monitor.tsx` raw-event block + `bus-af-` join (§6.6) | New inline rendering, existing data |
| Event Monitor (full bus history) | `event-monitor.tsx` | Retained unchanged, hidden route |
| Doctrine notices, KPI cards, badges, dialogs | shadcn/ui + existing components | Direct reuse |

No new architectural patterns, no new state libraries, no new data models (Implementation Philosophy compliance).

---

# 8. USER JOURNEYS

## 8.1 CEO — Weekly Intelligence Session

1. Sidebar → Intelligence → lands on **Overview**. Health Scorecard shows Governance Risk 45/100 (Critical).
2. Critical Items: "Xero sync failure — 14 records pending resync" (red dot, Critical) → [Resolve →] deep-links to `/finance?tab=accounting&sub=sync`. (Hub records alert-opened + deep-link audit entries; resolution happens in the Finance Hub under existing approval/audit controls.)
3. Back to Intelligence → **Analytics**: reviews trends and forecasts (advisory labels visible).
4. **Reports**: generates an Executive Summary via Report Builder; from the detail dialog generates a PDF export.
5. **Exports**: downloads the export; creates a board-pack distribution.
6. Total: one nav destination, five questions answered, every step audited.

## 8.2 CEO — Anomaly Drill-Down

1. Notification bell shows unread badge → opens preview → "View All" → `/intelligence?tab=activity`.
2. Filters Priority = Critical. Sees `sync_event` "Xero sync — 14 records failed".
3. Toggles "Show Event Detail" → inspects row metadata; the row originated from a live bus dispatch, so the matching Platform Event block (bus id, category, subscribers) renders beneath.
4. "Investigate →" deep-links to the accounting sync surface. No action executed from the hub itself.
5. (Power user, occasionally): visits `/event-monitor` directly for the complete bus history including seeded records.

## 8.3 Project Manager

1. PM sidebar shows "Notifications" (no "Intelligence" item).
2. `/notifications` renders the existing Notification Centre, job-scoped via `scopeNotificationsForPM()`.
3. Direct navigation to `/intelligence` or any legacy CEO intelligence route → Unauthorized page. Behaviour identical to today.

## 8.4 Future Extensibility

- A future read-only "Advisor/Investor" role could be granted Overview + Reports tabs only; the tab-gated structure supports per-tab RBAC without redesign.
- UX-6 will re-point automation deep links to `/automation?tab=…` — isolated to link constants.

---

# 9. RBAC IMPLICATIONS

| Role | `/intelligence` | Legacy intelligence routes | `/event-monitor` | `/notifications` |
|---|---|---|---|---|
| CEO | Full (all 5 tabs) | Redirect to hub | Full (hidden route) | Redirect to hub Activity tab |
| Project Manager | **Unauthorized** | Unauthorized (unchanged) | Unauthorized (unchanged) | Notification Centre page (unchanged, job-scoped) |
| Worker | **Unauthorized page** — the `ProtectedRoute` roles check returns `UnauthorizedPage` before any worker redirect logic runs (App.tsx:82–90; P1-A correction) | Same | Same | No access (unchanged) |
| Client | No platform access (portal only) | Same | Same | Same |

**P1-A note (binding for tests):** v1.0 incorrectly stated Workers are redirected to `/worker/jobs` from CEO-only routes. Verified behaviour: on any role-gated route the Worker receives the Unauthorized page. IH-04 and all RBAC assertions use the established "page not visible / Unauthorized" pattern (automation-centre AC-19 precedent), not a redirect assertion.

Enforcement layers:
1. `ProtectedRoute roles={["CEO"]}` on `/intelligence` (and the retained `/event-monitor`).
2. Inner CEO check inside `intelligence-hub.tsx` (NG-05 defence-in-depth, UX-4 precedent).
3. Redirect components inherit the route guard of their declaring route (CEO-gated), so a PM hitting `/analytics-centre` still sees Unauthorized, not a redirect into the hub.
4. The role-aware `/notifications` route must check role **before** redirecting — PM must never be bounced to an Unauthorized hub.

**Invariants preserved:** Workers never gain financial visibility; PMs gain no new intelligence visibility; Clients untouched. No notification RBAC change: CEO full visibility (now via hub), PM job-scoped (via existing page).

---

# 10. DATA SOURCES

Every displayed value originates from an existing frontend mock engine or the Zustand store. No engine computation changes.

## 10.1 Overview Tab (P0-C resolution — one verified source per element)

| Element | Source (verified against current interfaces) |
|---|---|
| Health Scorecard (4 cards) | `executiveCommandEngine.getExecutiveHealthSnapshot()` → `{ operational, financial, governance, workflow }`, each `{ score, level }` |
| Critical Items | `executiveCommandEngine.getCriticalItems()` → `CriticalAlertItem[]` (`title`, `description`, `source`, `sourceRoute`, `priority: 'high'|'critical'`, `category`, `createdAt`) |
| Summary tile — Active Jobs | `useStore().jobs.filter(j => j.status === 'Active').length` — existing store data; filter pattern matches dashboard Zone B (`activeAndPlanned`) and job-intelligence precedents. The Active-only filter is this tile's documented definition |
| Summary tile — Pending Reviews | `executiveCommandEngine.getExecutiveSummary().pendingReviews` |
| Summary tile — Active Rules | `executiveCommandEngine.getOperationalOverview().activeAutomations` |
| Summary tile — Open Exceptions | `executiveCommandEngine.getExecutiveSummary().openExceptions` |
| Summary tile — Active Workflows | `executiveCommandEngine.getExecutiveSummary().activeWorkflows` (replaces v1.0 "Last Workflow Run" — no timestamp field exists in any named API) |
| Summary tile — Unread Notifications | `notificationEngine.getUnreadCount()` (notificationEngine.ts:392) |

v1.0 cited `getGovernanceOverview()` as a strip source — no tile uses it in v1.1; the reference is removed.

Note: the Overview uses the ECC engine's **4-dimension** snapshot per Blueprint 6.2; the Analytics tab continues to show the analytics engine's **5-dimension** model. Both already coexist today (ECC page vs Analytics page) — no reconciliation needed or permitted.

## 10.2 Analytics Tab

`analyticsEngine`: `getAnalyticsSummary()`, `getCriticalRisks()`, `getTrendAnalysis()`, `getForecasts()`, `getBottleneckAnalysis()` — unchanged.

## 10.3 Reports Tab

`reportingEngine`: `getAllReports()`, `computeReportingSummary()`, `generateReport`/builder API, `recordReportViewed()`, `archiveReport()` — unchanged (section `deepLinkRoute` data updated per §5.5).

## 10.4 Exports Tab

`exportEngine`: `getAllExports()`, `computeExportSummary()`, `getAllDistributions()`, `computeDistributionSummary()`, `generateExport()`, `generateBoardPack()`, `downloadExport()`, `archiveExport()`, `createDistribution()` — unchanged.

## 10.5 Activity Tab

### Canonical priority mapping (normative — P0-A resolution)

The two record kinds carry different priority taxonomies:
- `ActivityEventPriority = 'info' | 'warning' | 'critical'` (activityFeedEngine.ts:36)
- `NotificationPriority = 'low' | 'medium' | 'high' | 'critical'` (notificationEngine.ts:28)

The hub renders and filters both through one **canonical display taxonomy** — Critical / Warning / Info:

| Record kind | Native priority | Canonical display |
|---|---|---|
| ActivityEvent | `critical` | **Critical** |
| ActivityEvent | `warning` | **Warning** |
| ActivityEvent | `info` | **Info** |
| Notification | `critical` | **Critical** |
| Notification | `high` | **Warning** |
| Notification | `medium` | **Info** |
| Notification | `low` | **Info** |

Rules:
- **Rendering:** rows display the canonical label and dot colour (Critical red / Warning amber / Info slate-blue, per existing engine colour conventions). The notification's native priority is **not** shown on the collapsed row (the "Notification" chip already marks record kind); it **is** shown inside the Event Detail expansion as `Native priority: high` etc., preserving full information without dual taxonomies in the list.
- **Filtering:** the priority filter (`All · Critical · Warning · Info`) matches activity rows on native priority and notification rows on **mapped** priority. A `high` notification appears under Warning; `medium` and `low` under Info.
- **No data mutation:** mapping is a pure render/filter function; `Notification.priority` values are never rewritten.
- **Testing:** IH tests assert the mapping against seed data (a seeded `high` notification renders the Warning dot/label and matches the Warning filter; `medium`/`low` match Info; `critical` matches Critical) — §13.3 group 4.

### Sources and merge

| Element | Source |
|---|---|
| Activity rows | `activityFeedEngine.getAllEvents()` |
| Notification rows | `notificationEngine.getAllNotifications()` (CEO: unscoped — hub is CEO-only) |
| Merge | Union sorted by timestamp desc (`createdAt` on both kinds); notification rows tagged with a "Notification" chip |
| Type filter mapping — activity events | **Operational:** review_event, job_event, worker_event, stock_event, asset_event · **Financial:** financial_control_event, exception_event · **Governance:** governance_event · **Automation:** automation_event, scheduler_event, workflow_event-family events arriving as automation/scheduler types · **Sync:** sync_event, reconciliation_event · notification_event-type activity rows: **Operational** |
| Type filter mapping — notifications (complete; all six `NotificationType` values) | `review_required` → **Operational** · `automation_alert` → **Automation** · `governance_action` → **Governance** · `sync_failure` → **Sync** · `financial_control` → **Financial** · `exception_event` → **Financial** (v1.0's "workflow notification family" reference removed — no such `NotificationType` exists; the mapping is total, so no record is visible only under All) |
| Priority filter | Canonical mapping above |
| KPI strip | **None** (§6.6 — P1-C). `computeActivitySummary()` / `computeNotificationSummary()` are not consumed by this tab |

### Event Detail expansion — metadata contract (corrected to actual interfaces)

For every row, the expansion renders the record's real fields:

- **Activity rows** (`ActivityEvent`, activityFeedEngine.ts:38–52): `id`, `type`, native `priority`, `sourceType`, `sourceId`, `sourceRoute`, `jobId` (job attribution), `actor`, `actionRequired`. *(v1.0 listed an `auditRef` field — `ActivityEvent` has no such field; removed.)*
- **Notification rows** (`Notification`, notificationEngine.ts:30–44): `id`, `type`, **native** `priority`, `status`, `sourceType`, `sourceId`, `sourceRoute`, `jobId`, `actionRequired`.
- **Bus counterpart** (activity rows whose id begins `bus-af-` — the documented join convention, eventBusEngine.ts:281): the matching `BusEventRecord` from `eventBusEngine.getEventHistory()` (lookup by stripped id) renders beneath with a "Platform Event" chip: bus event `id`, `type` (category), `timestamp`, `consumedBy` subscriber list, bus audit entry count (`auditEntries.length`).
- **Seeded bus events** (suppressed at seed — `_suppressActivityFeedDispatch`, eventBusEngine.ts:171/709): have no activity counterpart, are **not** injected into the combined list, and remain accessible on `/event-monitor` (P0-B).

## 10.6 Audit Records (writes — all informational, doctrine-compliant)

| Action | Recorder |
|---|---|
| Hub mount | `recordIntelligenceHubViewed` (new, analyticsEngine) |
| Tab activation | `recordIntelligenceHubTabViewed(tab)` (new) + existing per-module recorder: overview → `recordExecutiveCentreViewed`, analytics → `recordAnalyticsViewed` (reports/exports/activity views are audited by their existing interaction recorders) |
| Critical item opened | `recordExecutiveAlertOpened` + `recordExecutiveDeepLinkOpened` |
| Risk investigation | `recordRiskInvestigationOpened` |
| Report/export interactions | Existing reporting/export recorders unchanged |
| Activity row navigation | `recordEventNavigated` |
| Notification mark-read/dismiss/open | `markNotificationRead` / `dismissNotification` / `recordNotificationOpened` |

Audit-volume note (review P2): tab-activation recorders fire on every activation, producing more entries than the old page-mount pattern — doctrine-safe (more audit, never less). Doctrine tests assert entry **presence/ordering**, never exact counts.

---

# 11. FINANCIAL DOCTRINE REVIEW

| Doctrine | Compliance statement |
|---|---|
| **Approval Doctrine** | The hub contains no approve/reject/correct controls. No operational event can create financial records from any hub surface. All "Resolve/Review/Investigate" affordances are navigation-only deep links into modules where existing approval controls govern. |
| **Review Centre Doctrine** | Untouched. The Review Centre remains the sole financial gatekeeper; the hub links to it and never around it. |
| **Audit Doctrine** | No silent state changes. Every hub view, tab view, alert open, deep link, report/export action, activity navigation, and notification interaction generates an immutable audit entry via existing engine APIs plus new hub-level recorders. All existing audit event types (`executive_centre_viewed`, `analytics_viewed`, `report_*`, `export_*`, activity/notification interactions) continue to fire from their new mount points. |
| **Job Attribution Doctrine** | Preserved — `jobId` exists on both record kinds and is rendered (and surfaced in Event Detail). No attribution data is created or modified. |
| **Financial Integrity Doctrine** | No normalization, sync, or financial computation is touched. Accounting systems remain downstream consumers; the hub only displays sync/reconciliation status sourced from existing engines. |
| **Notification / Activity Feed / Event Bus Doctrines** | All three remain informational. Mark-read/dismiss are the only mutations available (notification status — explicitly doctrine-permitted and audited). Deep links navigate only. The Event Detail toggle is read-only rendering of existing records; the seed-suppression rule from the canonical context is respected, and the suppressed seeded bus history remains visible via the retained `/event-monitor` route (P0-B). The canonical priority mapping (§10.5) is render/filter-only — no record is mutated. |
| **Analytics / Reporting / Export Doctrines** | Content mounts unchanged: forecasts keep "Projections — Advisory Only" labelling; reports and exports keep their lifecycle, doctrine notices, and audit references. Report-section `deepLinkRoute` updates (§5.5) are presentation routing data only. |
| **Dashboard Intelligence / ECC Doctrines** | The hub inherits the ECC's read-only visibility doctrine wholesale. ECC audit event types continue to be generated from the Overview tab. |
| **Automation rules** | Nothing in the hub evaluates, schedules, or approves anything. |

**Conclusion: UX-5 is a pure presentation-layer consolidation. No doctrine is weakened, bypassed, or modified.**

---

# 12. ACCESSIBILITY CONSIDERATIONS

1. **Tabs:** shadcn/Radix Tabs provide `role="tablist"`/`tab`/`tabpanel` and arrow-key navigation out of the box — preserved by reusing the Finance Hub structure.
2. **Colour is never the sole signal:** health status pills pair dot colour with text ("Healthy"/"Warning"/"Critical"); priority dots pair with canonical priority labels; critical-item severity pairs dot + label (§6.2-B).
3. **Contrast:** the Blueprint 6.2 palette (e.g. `text-emerald-700` on `bg-emerald-50`) meets WCAG AA for normal text; retain as specified.
4. **Toggle semantics:** "Show Event Detail" uses the shadcn `Switch` with a visible label and `aria-checked`; state persistence/precedence (§6.6) does not alter semantics.
5. **Deep-link buttons:** descriptive accessible names ("Open source: Xero sync failure"), not bare arrows.
6. **Focus management:** dialogs (Report Detail, Export Detail, Builder) already trap focus via Radix; tab changes move focus to the panel per Radix default.
7. **Headings:** single `h1` per page (hub heading); tab content uses `h2`+ (UX-4 heading-hierarchy cleanup precedent).
8. **Load More:** button (not scroll-jacking), keyboard reachable, announces appended content count via `aria-live="polite"` region on the list container.
9. **Mobile touch targets:** filter chips ≥ 40px height; wrap rather than truncate.

---

# 13. TESTING STRATEGY

## 13.1 Unit / Build

- `npm run build` must pass (TS strict surface: new components typed against existing engine types; no `any` additions beyond existing file conventions).
- No unit-test framework exists in the repo; logic-level verification (priority mapping, type-filter mapping, merge ordering, `bus-af-` join) is covered through Playwright assertions on seeded data (deterministic seeds already exist in all engines).

## 13.2 Integration Implications (Playwright migration)

Seven existing doctrine suites reference affected routes (~249 occurrences). Honest effort classification (review §7 correction): the three **extracted** tabs keep their testIds, so those suites are navigation-only migrations; the suites targeting **new components** (ECC → Overview, activity-feed → ActivityHub, notification CEO-half → ActivityHub) are substantial rewrites. With `/event-monitor` retained (P0-B), the event-bus suite is no longer a rewrite.

| Suite | Tests | Route refs | Migration |
|---|---|---|---|
| `executive-command-centre.spec.ts` | 35 | 42 | **Rewrite against Overview.** Entry → `/intelligence?tab=overview`; assertions re-target `intel-*` testIds; sections dropped from Overview (§6.2) get removal, not migration; redirect test added |
| `analytics-centre.spec.ts` | 42 | 49 | Navigation-only: entry → `/intelligence?tab=analytics`; content testIds unchanged |
| `reporting-centre.spec.ts` | 40 | 39 | Navigation-dominated: entry → `/intelligence?tab=reports`; internal tab-bar assertions updated to hub tabs; section deep-link assertions updated to hub URLs (S-5/S-6) |
| `report-exports.spec.ts` | 40 | 41 | Navigation-only: entry → `/intelligence?tab=exports` (+ `sub=distribution`) |
| `activity-feed.spec.ts` | 25 | 24 | **Rewrite against ActivityHub.** Entry → `/intelligence?tab=activity`; new `activity-*` testIds. **KPI-strip tests (AF-04–AF-08) are retired** — the strip does not exist in the hub (§6.6). AF-08 is thereby removed from the known-failure ledger; its underlying seed-date drift becomes optional data hygiene (out of scope) |
| `notification-centre.spec.ts` | 28 | 25 | CEO-consumption tests rewritten against hub Activity tab (mark-read/dismiss/priority mapping) or converted to redirect assertions; **PM tests unchanged** on `/notifications`; NC-25 fixed by the companion commit and its test expected green |
| `event-bus.spec.ts` | 30 | 29 | **Largely unchanged** — monitor-page tests keep running against the retained `/event-monitor` route (P0-B). Changes limited to: nav-item assertions (nav-event-monitor) become nav-absence assertions; any `BUS_EVENT_ROUTES.notification_event` deep-link assertion updated (S-8) |

Realistic rewrite scope: ~74 tests (ECC 35 + activity-feed 25 + notification CEO-half ~14); the remaining ~146 affected tests are navigation/assertion-target updates. v1.0's "most content assertions survive" claim holds only for the extracted tabs and is corrected here.

**Known-failure ledger transition:**
- Before UX-5: AF-08 + NC-25 (2 known failures).
- After UX-5: **empty** — AF-08 retired with the legacy KPI strip (its target `af-kpi-*` elements cease to exist); NC-25 fixed by the in-scope companion commit.

## 13.3 New Doctrine Suite — `tests/doctrine/intelligence-hub.spec.ts` (IH-01 …, ~38 tests)

Coverage groups:
1. **RBAC (IH-01–06):** CEO renders hub; PM `/intelligence` → Unauthorized; PM `/notifications` → Notification Centre (no redirect); **Worker `/intelligence` → Unauthorized page (P1-A — assert the "page not visible / Unauthorized" pattern, never a redirect)**; PM legacy intelligence routes → Unauthorized; inner CEO check; CEO `/event-monitor` still renders (hidden route).
2. **Shell & tabs (IH-07–12):** 5 tabs render; default tab = overview; `?tab=` deep links; `?sub=distribution`; heading reflects tab; single `h1`.
3. **Overview (IH-13–18):** 4 health cards with score + level pill; critical items rows with severity rendering — seeded `critical` row shows red dot + "Critical", seeded `high` row shows amber dot + "Warning", sort order critical-first (`data-priority` attribute, §6.2-B); deep link navigation; empty state; all 6 summary tiles match their §10.1 sources against seed data.
4. **Activity (IH-19–28):** combined list contains activity + notification rows; type filters (including complete notification-type mapping §10.5); **priority mapping** — seeded `high` notification renders Warning label/dot and matches the Warning filter; `medium`/`low` render Info; `critical` renders Critical (P0-A); merge order (newest first); mark-read updates state + audit; Event Detail toggle reveals the §10.5 metadata contract (native priority shown in expansion; `bus-af-` rows render the Platform Event block); **no KPI strip present** (strict-mode absence assertion on `af-kpi-strip`); Load More.
5. **Toggle persistence & precedence (IH-29–31):** Switch click persists via localStorage across reload; `?detail=1` pre-enables the toggle when localStorage is OFF **and does not write to localStorage** (assert storage unchanged after visit); without the param, localStorage state is restored (P1-D). Tests reset localStorage in setup.
6. **Redirects (IH-32–36):** five legacy routes land on the correct hub tab (CEO); `/event-monitor` does **not** redirect (renders monitor page for CEO); bell "View All" → hub Activity (CEO) and `/notifications` (PM).
7. **Doctrine enforcement (IH-37+):** no approve/reject controls anywhere in hub DOM; forecasts labelled advisory; hub audit entries recorded (`intelligence_hub_viewed`, tab views — presence, not exact counts); deep links navigate without mutating engine state.

## 13.4 Suggested Test IDs

```
intelligence-hub-page, intelligence-hub-heading
intelligence-tab-overview|analytics|reports|exports|activity
intelligence-overview-panel, intelligence-analytics-panel,
intelligence-reports-panel, intelligence-exports-panel, intelligence-activity-panel
intel-health-scorecard, intel-health-operational|financial|governance|workflow
intel-critical-items, intel-critical-item-row (carries data-priority), intel-critical-items-empty
intel-summary-strip, intel-summary-tile-{active-jobs|pending-reviews|active-rules|open-exceptions|active-workflows|unread-notifications}
exports-subtab-exports, exports-subtab-distribution
activity-filter-type-{all|operational|financial|governance|automation|sync}
activity-filter-priority-{all|critical|warning|info}
activity-event-detail-toggle, activity-combined-list, activity-row,
activity-row-notification-chip, activity-event-detail-block,
activity-bus-event-block, activity-load-more
nav-intelligence-hub
```

## 13.5 Regression Gate

- Full Playwright run after each implementation day.
- Pass criterion: **zero unexpected failures.** Expected end-state ledger is **empty**: AF-08 is retired together with the legacy KPI strip during the activity-feed suite rewrite (Day 2), and NC-25 is fixed by the companion commit (Day 5). Until the day each lands, the not-yet-addressed known failure remains expected for that day's gate. Any failure outside this schedule is a UX-5 regression and blocks progression (UX-4 handoff rule).
- Total test count changes are documented in the handoff (retired AF KPI tests, rewritten suites, ~38 new IH tests).

---

# 14. RISKS

## P0 — Must be controlled or the phase fails

| # | Risk | Mitigation |
|---|---|---|
| P0-1 | **Test-migration blast radius** (~249 route references across 7 suites; ~74 genuine rewrites). A sloppy migration masks real regressions. | Migrate suite-by-suite in the same commit as the corresponding tab wiring; run the affected suite immediately; never bulk-search-replace routes without reviewing each assertion. Honest rewrite-vs-migrate classification per §13.2. |
| P0-2 | **PM notification access regression.** Role-aware `/notifications` handling done wrong locks PMs out (doctrine violation) or redirects them into Unauthorized. | Explicit IH RBAC tests for PM before/after; role check precedes redirect; PM tests in `notification-centre.spec.ts` kept green throughout; declaration-position note §5.2. |
| P0-3 | **Reporting Centre state split.** Splitting one 1,098-line stateful page into three content components can break dialogs, filters, or the report→export generation flow. | Extract mechanically with state moved per component; engines are singletons so cross-tab freshness comes from load-on-mount; preserve all existing testIds; reporting + export suites run after Day 1. |
| P0-4 | **Audit-trail regression.** ECC/analytics view events could stop firing once pages unmount from legacy routes. | Tab-activation effects fire existing recorders (§10.6); IH doctrine tests assert audit log contents (presence, not counts). |
| P0-5 | **Duplicate testId / strict-mode collisions** when multiple extracted contents mount in one DOM (NC-25 class of failure). | Radix Tabs render only the active panel (no `forceMount`); verify no global-render duplicates (e.g. doctrine notices) via strict-mode locator checks in IH tests; NC-25 fix itself lands as the companion commit. |

## P1 — Significant, manageable

| # | Risk | Mitigation |
|---|---|---|
| P1-1 | **Wouter route ordering** — redirects declared after retained legacy routes never match; `/notifications` is declared early (App.tsx:151). | Follow UX-4 ordering precedent (App.tsx:183 comment); install role-aware `/notifications` at its existing declaration position; redirect tests cover every redirected route + a no-redirect test for `/event-monitor`. |
| P1-2 | **Nav active-state** for query-param URLs (Intelligence item must highlight on `/intelligence?tab=…`). | Existing `NavLink` already matches `href + "?"` (layout.tsx:333–335) — covered; add an assertion anyway. |
| P1-3 | **Notification bell role-awareness** adds a role lookup to a shared header component. | Reuse the layout's existing `hasAnyRole` data; PM bell behaviour asserted in tests. |
| P1-4 | **Priority/type mapping drift** between component logic and tests. | Both mappings are normative tables in §10.5 (the type mapping is total over all six `NotificationType` values; the priority mapping is total over both taxonomies); tests assert against seed data. |
| P1-5 | **localStorage persistence** of Event Detail toggle leaking between test runs / users. | Namespaced key, defensive read, URL-param precedence never writes storage (§6.6); tests reset localStorage in setup. |
| P1-6 | **Residual in-app links** to legacy routes. | Normative sweep inventory §5.5 (S-1…S-10) updated at source; redirects remain as graceful degradation for anything missed; AC-12 grep gate. |

## P2 — Polish opportunities (optional, non-blocking)

| # | Opportunity |
|---|---|
| P2-1 | ~~NC-25 bell fix~~ — **promoted to In Scope** (companion commit; §4). |
| P2-2 | Re-anchor activity seed dates (formerly the AF-08 fix). AF-08 is retired regardless (§13.2); this remains optional data hygiene so seeded "today/last-7-days" style values stay plausible. |
| P2-3 | Relative-time formatting consistency across merged Activity rows ("09:14 today" style per Blueprint 6.6). |
| P2-4 | Delete fully-unrouted legacy page files in a follow-up cleanup commit once two phases of test history confirm nothing references them. |
| P2-5 | "Show all N →" critical-items expansion animation and count badge. |

---

# 15. ACCEPTANCE CRITERIA

UX-5 is complete when all of the following hold:

| # | Criterion |
|---|---|
| AC-01 | `/intelligence` renders for CEO with five tabs (Overview, Analytics, Reports, Exports, Activity); default tab is Overview; `?tab=` and `?sub=` deep links work and are bookmarkable. |
| AC-02 | Overview shows the 4-dimension Health Scorecard, Critical Items panel (severity rendering per §6.2-B: `critical` → red/Critical, `high` → amber/Warning, critical-first ordering; working deep links; empty state), and the 6-tile Platform Summary strip with values matching the §10.1 sources against engine/store seed data. |
| AC-03 | Analytics, Reports, Exports tabs render the existing centres' content unchanged (all pre-existing testIds, doctrine notices, dialogs, and flows intact), with Exports split into Exports/Distribution sub-tabs. |
| AC-04 | Activity tab shows a combined activity + notification chronology with the 6 type filters and 4 priority filters operating on the §10.5 canonical mappings (notification `high` → Warning, `medium`/`low` → Info, `critical` → Critical; type mapping total over all six NotificationTypes); notification rows support mark-read/dismiss; activity rows deep-link only; **no KPI strip**. |
| AC-05 | "Show Event Detail" toggle reveals the §10.5 metadata contract inline (including native notification priority and the `bus-af-` Platform Event block where resolvable), persists user toggles to localStorage, and honours `?detail=1` URL precedence without writing storage (§6.6). |
| AC-06 | CEO sidebar shows exactly one "Intelligence" item in the INTELLIGENCE section; "Platform Events" no longer appears under ADMINISTRATION; PM sidebar still shows "Notifications". |
| AC-07 | The five redirected legacy routes send CEO users to the correct hub tab; `/event-monitor` does **not** redirect and still renders the Event Monitor for CEO (hidden route, full seeded bus history accessible); PM behaviour: `/notifications` renders the Notification Centre, all other intelligence routes remain Unauthorized. |
| AC-08 | Notification bell "View All" navigates CEO → `/intelligence?tab=activity`, PM → `/notifications`. |
| AC-09 | RBAC: PM, Worker, and Client cannot access the hub — each receives the Unauthorized page / has no platform access (route guard + inner check; **no Worker-redirect assertion** — P1-A); Workers retain zero financial visibility. |
| AC-10 | Audit: hub view, tab views, alert opens, deep links, and all pre-existing module audit events are recorded; no silent state changes (verified by doctrine tests asserting presence, not exact counts). |
| AC-11 | Build passes; full Playwright run shows **zero failures** (AF-08 retired with the legacy KPI strip; NC-25 fixed by the companion commit); new `intelligence-hub.spec.ts` suite (~38 tests) passes. |
| AC-12 | The §5.5 sweep (S-1…S-10) is applied and a repo-wide grep confirms no first-party UI link or engine route constant targets a redirected legacy intelligence route; redirects remain only as bookmark compatibility. |
| AC-13 | Critical Items / Activity deep links targeting finance surfaces resolve to UX-4 hub URLs — asserted against the (already-hub-form) route constants; no links into now-redirected legacy finance routes. |
| AC-14 | No approve/reject/correct or financially mutating control exists anywhere in the hub DOM. |
| AC-15 | Tracker (`UX_REDESIGN_PROGRAMME.md` §9), `CURRENT_DEVELOPMENT_STATE.md`, canonical context UX section, and a UX-5 handoff in `docs/handoffs/` are updated (including the known-failure ledger transition to empty); PR opened from `feature/ux5-intelligence-hub`; work stops at PR per git workflow. |

---

# 16. IMPLEMENTATION PLAN (for the build session — 5 days per Blueprint 11)

| Day | Work | Gate |
|---|---|---|
| 1 | Hub shell + `/intelligence` route + RBAC + extract `AnalyticsCentreContent`, `ReportsContent`, `ExportsContent`, `DistributionContent`; wire Analytics/Reports/Exports tabs; reportingEngine deep-link updates (S-5/S-6) | Build pass; analytics/reporting/exports suites migrated + green |
| 2 | `ActivityHub`: merge logic, canonical priority mapping, type/priority filters, mark-read/dismiss, pagination; activity-feed suite rewrite (AF KPI tests retired — AF-08 leaves the ledger) | activity-feed + notification (CEO) suites migrated + green |
| 3 | Event Detail toggle + localStorage/URL precedence + `bus-af-` join + Platform Event block; event-bus suite touch-up (nav-absence + S-8) | event-bus suite green |
| 4 | `IntelligenceOverview` (scorecard, critical items severity rendering, 6-tile summary strip) + hub audit recorders; ECC suite rewrite | ECC suite green |
| 5 | Nav consolidation (Platform Events removed, `/event-monitor` route retained), bell link + **NC-25 companion fix (isolated commit)**, header alert re-point (S-1), dashboard re-point (S-4), engine constant updates (S-7/S-8), all redirects, AC-12 grep sweep, new IH doctrine suite, full Playwright run, docs/handoff | Full run: **zero failures** |

Branch: `feature/ux5-intelligence-hub`. Standard git workflow; stop at PR.

---

# DELIVERABLE ASSESSMENT

## Implementation Readiness Score: **97%**

Grounds: approved design exists (Decision 5 + Blueprint 6), a proven structural precedent exists (UX-4), **every data contract is now explicit and verified against the live interfaces** (Overview tile sources, priority/type mappings, Event Detail metadata, `bus-af-` join, link-sweep inventory), the test surface is enumerated with honest rewrite-vs-migrate classification, all review P0/P1 findings are resolved, and the known-failure ledger end-state is defined. The residual 3% is ordinary implementation uncertainty: extraction unknowns inside the 1,098-line reporting page (P0-3, mitigated by the UX-4 playbook) and the volume of the ~74-test rewrite (P0-1, gated daily).

## Open Questions

**None.** All four v1.0 open questions and all four review questions are resolved and locked:

| Question | Resolution |
|---|---|
| OQ-1 — PM notification routing | **Locked:** CEO consumes notifications via the hub Activity tab; PM retains the standalone Notification Centre (`/notifications`), job-scoped. Only doctrine-exact option. |
| OQ-2 — ECC residual sections | **Locked: drop.** Every dropped section has a superset home (hub tab, Finance Hub, nav, or hidden `/event-monitor`). |
| OQ-3 — Engine route maps | **Locked: update the constants** (normative sweep §5.5); redirects are a compatibility layer only. |
| OQ-4 — NC-25 companion fix | **Locked: in scope** as an isolated companion commit (the bell is touched naturally by UX-5). |
| NQ-1 — Event Monitor disposition (P0-B) | **Locked:** `/event-monitor` retained as a hidden CEO-only route; nav item removed; Activity-tab toggle annotates live-dispatched rows; seeded bus history loses no accessibility; `bus-af-` convention documented. |
| NQ-2 — Notification priority mapping (P0-A) | **Locked:** `critical→Critical, high→Warning, medium/low→Info`; render mapped label; native priority in Event Detail; filter on mapped value; tests assert against seeds. |
| NQ-3 — Activity KPI strip / AF-08 (P1-C) | **Locked:** no KPI strip; AF-04–08 retired with the legacy page; AF-08 leaves the known-failure ledger; seed-date re-anchor optional (P2-2). |
| NQ-4 — Overview tile sources (P0-C) | **Locked:** six tiles, one verified source each (§10.1); "Last Workflow Run" replaced by "Active Workflows". |

## P0 Blockers

**Zero.** P0-A, P0-B, and P0-C from the independent review are each resolved normatively in this version (§10.5, §5.2/§6.6, §10.1 respectively). All P1 findings (P1-A worker RBAC, P1-B sweep inventory, P1-C KPI/AF-08, P1-D toggle precedence, P1-E severity rendering) are likewise resolved.

## Recommendation

**UX-5 may proceed to implementation** against this v1.1 specification, on branch `feature/ux5-intelligence-hub`, following the §16 day plan and the §13.5 regression gates.

---

*UX-5 Intelligence Hub Specification v1.1 — planning artifact only. No code has been written. The Ledger's Approval, Audit, Job Attribution, and Financial Integrity doctrines remain absolute throughout this phase.*
