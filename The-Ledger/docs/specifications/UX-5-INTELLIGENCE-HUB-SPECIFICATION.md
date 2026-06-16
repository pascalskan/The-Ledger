# UX-5 — INTELLIGENCE HUB SPECIFICATION

**Version:** 1.0 (Draft — for independent review)
**Date:** June 10, 2026
**Phase:** UX-5 of the UX Redesign Programme
**Status:** Planning specification — no implementation has begun
**Authoritative inputs:**
- `docs/ux/UX_REDESIGN_PROGRAMME.md` — Decision 5, Phase UX-5 definition (Section 5)
- `docs/ux/CEO_EXPERIENCE_REDESIGN_SPECIFICATION.md` — Part 4 (Intelligence Consolidation), Appendix A (Terminology)
- `docs/ux/CEO_EXPERIENCE_UX_BLUEPRINT.md` — Blueprint 6 (Intelligence Hub), Blueprint 11 (Build Order)
- `docs/ai-context/LEDGER_CANONICAL_CONTEXT.md` — all doctrines
- UX-4 Finance Hub implementation (`client/src/pages/finance-hub.tsx`) — the proven hub pattern

This specification does not reopen any approved decision. It translates Decision 5 and Blueprint 6 into an implementation-ready plan grounded in the current codebase.

---

# 1. EXECUTIVE SUMMARY

## Purpose

UX-5 consolidates six read-only intelligence destinations — Executive Command Centre, Analytics Centre, Reporting Centre (Reports + Exports + Distribution), Activity Feed, Event Monitor, and Notification Centre — into a single Intelligence Hub at `/intelligence` with five tabs: **Overview · Analytics · Reports · Exports · Activity**.

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
| **CEO** | Primary user. Weekly/monthly focused intelligence sessions; occasional drill-down from dashboard alerts. Full hub access. |
| **Project Manager** | No hub access (all underlying CEO-only doctrines preserved). Retains job-scoped Notification Centre access via `/notifications`. |
| **Worker / Client** | No access of any kind. No change. |
| **Future: investor/advisor read-only role** | The hub's single-destination, read-only structure is the natural mount point for a future scoped "advisor" role. Out of scope for UX-5; noted for extensibility only. |

---

# 2. CURRENT STATE ASSESSMENT

## 2.1 Repository Baseline

- Branch: `main`, clean, up to date with origin (`cf93a4a` — UX-4 merge).
- Build: PASS. Playwright: 501 total / 499 passed / 2 known baseline failures (AF-08, NC-25 — pre-existing, documented in `CURRENT_DEVELOPMENT_STATE.md`).
- UX-1 → UX-4 complete. UX-5 dependency (UX-4) satisfied.

## 2.2 Existing Pages To Be Consolidated

| Page | Route | Size | RBAC | Notes |
|---|---|---|---|---|
| `executive-command-centre.tsx` | `/executive-command-centre` | 685 lines | CEO | Health snapshot, critical alerts, operational/governance/financial overviews, reporting + export snapshots, activity stream |
| `analytics-centre.tsx` | `/analytics-centre` | 391 lines | CEO | 5-dimension health, risks, trends, forecasts, bottlenecks. Single content block, easily extractable |
| `reporting-centre.tsx` | `/reporting-centre` | 1,098 lines | CEO | Internal tab bar: Reports / Exports / Distribution. All state in one page component |
| `activity-feed.tsx` | `/activity-feed` | 392 lines | CEO | Event list, type/priority filters, KPI strip |
| `event-monitor.tsx` | `/event-monitor` | 386 lines | CEO | Raw Event Bus history. Currently in ADMINISTRATION nav as "Platform Events" |
| `notification-center.tsx` | `/notifications` | 525 lines | **CEO + PM** | Only non-CEO-only destination. PM sees job-scoped notifications (Notification Doctrine RBAC) |

## 2.3 Existing Navigation State (`client/src/components/layout.tsx`)

- INTELLIGENCE section currently holds 5 items: Command Centre, Analytics Centre, Reporting Centre, Activity, Notifications (lines 308–314).
- "Platform Events" (`/event-monitor`) currently sits in ADMINISTRATION (line 327).
- Notification bell "View All" navigates to `/notifications` (line 97).

## 2.4 Reusable Assets

**The UX-4 hub pattern (`finance-hub.tsx`) — reuse wholesale:**
- Query-param tab state (`/finance?tab=…&sub=…`) via wouter `useSearch` — bookmarkable, testable, no nested routes.
- shadcn `Tabs` with `flex-wrap` TabsList for mobile.
- Content extraction pattern: existing pages export named `*Content` components (e.g. `FinancialRecordsContent` with `embedded` prop); legacy default page exports replaced by redirects.
- Synchronous `RedirectToFinance` component (App.tsx lines 95–103) — to be generalised as `RedirectToIntelligence`.
- Inner CEO role check inside sensitive tab components (defence-in-depth, NG-05 pattern).
- Hub-level audit recorders hosted in `analyticsEngine.ts` (`recordFinanceHub*` precedent, lines 769–807).

**Engines (all data already exists — zero new data modelling):**

| Engine | Relevant API |
|---|---|
| `executiveCommandEngine` | `getExecutiveHealthSnapshot()` (4 dimensions), `getCriticalItems()`, `getExecutiveSummary()`, `getOperationalOverview()`, `getGovernanceOverview()`, `recordExecutiveCentreViewed/AlertOpened/DeepLinkOpened()` |
| `analyticsEngine` | `getAnalyticsSummary()`, `getCriticalRisks()`, `getTrendAnalysis()`, `getForecasts()`, `getBottleneckAnalysis()`, `recordAnalyticsViewed/ForecastViewed/RiskInvestigationOpened()` |
| `reportingEngine` | `getAllReports()`, `computeReportingSummary()`, generation + audit API |
| `exportEngine` | `getAllExports()`, `getAllDistributions()`, summaries, `generateExport/BoardPack()`, `downloadExport()`, audit API |
| `activityFeedEngine` | `getAllEvents()`, `computeActivitySummary()`, `filterEventsByType/Priority()`, `recordEventViewed/Opened/Navigated()` |
| `notificationEngine` | `getAllNotifications()`, `computeNotificationSummary()`, `markNotificationRead()`, `dismissNotification()`, `scopeNotificationsForPM()` |
| `eventBusEngine` | `getEventHistory()`, `computeEventBusSummary()`, type/priority labels and colors |

**UI primitives:** shadcn Tabs, Card, Badge, Switch, Button; existing priority/type color maps in the engines.

## 2.5 Gaps in Current UX

1. No single intelligence landing — the CEO must know which of six screens answers which question.
2. The Executive Command Centre overlaps heavily with the Analytics Centre (two health scorecards), the Reporting Centre (reporting/export snapshots), and the Activity Feed (activity stream) — pure duplication from phased construction.
3. Activity and Notifications are two interleaved chronologies of the same platform story, with no combined view.
4. Event Monitor exposes internal Event Bus doctrine as a top-level concept (Decision 9 violation, already demoted to ADMIN in UX-2 — still a standalone page).
5. The notification bell's "View All" leads to a soon-to-be-consolidated destination.

---

# 3. STRATEGIC GOALS

1. **One intelligence destination.** A CEO finds health, risk, trends, reports, exports, and activity behind a single nav item.
2. **Answer "is anything wrong?" in under 10 seconds.** Overview tab leads with the Health Scorecard and Critical Items.
3. **Progressive disclosure.** Summary → tab → drill-down deep link to source module. Raw event data hidden behind a power-user toggle.
4. **Zero new data, zero doctrine change.** Presentation-layer consolidation only; every metric originates from an existing engine.
5. **Preserve every audit trail.** All existing module-level audit events keep firing; hub-level view events are added.
6. **No test-coverage regression.** All 501 tests pass (minus the 2 known baseline failures) after migration; new doctrine coverage added for the hub.

---

# 4. SCOPE

## In Scope

- New `/intelligence` route, hub shell page, 5-tab sub-navigation (Overview, Analytics, Reports, Exports, Activity).
- New Intelligence Overview landing page (Health Scorecard, Critical Items, Platform Summary strip).
- New Activity tab combining Activity Feed + Notification history with type/priority filtering and "Show Event Detail" power-user toggle.
- Content-component extraction from `analytics-centre.tsx` and `reporting-centre.tsx` (Reports / Exports / Distribution split).
- Navigation consolidation: INTELLIGENCE section becomes a single "Intelligence" item for CEO; "Platform Events" removed from ADMINISTRATION.
- Redirects from all six legacy routes to hub equivalents (role-aware for `/notifications`).
- Notification bell "View All" → `/intelligence?tab=activity` for CEO (PM unchanged).
- Hub audit instrumentation (UX-4 pattern).
- Test migration for the 7 affected doctrine suites + new `intelligence-hub.spec.ts`.
- Tracker/handoff/context documentation updates.

## Out of Scope

- Any change to engines' data computation, doctrines, approval workflows, or financial logic.
- Any backend work.
- UX-6 (Automation Hub), UX-7 (Review Centre), UX-8 (Operations Hub).
- Redesigning the content of Analytics, Reports, or Exports — they mount **unchanged** (Blueprint 6.3–6.5: "renders existing content unchanged").
- New analytics, new KPIs, new forecasts, AI-generated summaries. (No AI-assisted summary feature exists in the approved blueprint; introducing one would require a registered change request and AI Advisory Doctrine review. Explicitly excluded.)
- Fixing known baseline failures AF-08 / NC-25 (separate maintenance items; see Risks §14, P2).
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
- "Platform Events" is removed from ADMINISTRATION (Event Monitor data is reachable via the Activity tab's "Show Event Detail" toggle, per Decision 5).
- Net CEO primary-nav progress toward the 7-item Appendix B target: intelligence collapses from 6 entries (5 + admin Platform Events) to 1.

## 5.2 Routes and Redirects

| Legacy route | Disposition |
|---|---|
| `/intelligence` | **New.** CEO-only `ProtectedRoute`. `?tab=` ∈ {overview (default), analytics, reports, exports, activity}; `?sub=` for Exports sub-tabs |
| `/executive-command-centre` | Redirect → `/intelligence?tab=overview` (CEO) |
| `/analytics-centre` | Redirect → `/intelligence?tab=analytics` (CEO) |
| `/reporting-centre` | Redirect → `/intelligence?tab=reports` (CEO) |
| `/activity-feed` | Redirect → `/intelligence?tab=activity` (CEO) |
| `/event-monitor` | Redirect → `/intelligence?tab=activity&detail=1` (CEO; opens Activity with Event Detail toggle ON) |
| `/notifications` | **Role-aware.** CEO → redirect `/intelligence?tab=activity`. PM → existing Notification Centre page renders unchanged |

Redirect implementation mirrors `RedirectToFinance` (synchronous `setLocation`, no `useEffect`, single string argument — see App.tsx:95–103 comment). Redirect routes must be declared **before** any retained legacy declarations (wouter first-match-wins; UX-4 precedent App.tsx:183–211).

## 5.3 Relationships With Other Surfaces

| Surface | Relationship |
|---|---|
| **Dashboard (Command)** | Unchanged. Zone A "Critical Alerts" card already deep-links to alert sources; any residual dashboard links pointing at `/executive-command-centre`, `/analytics-centre`, or `/reporting-centre` are updated to hub-tab URLs (sweep required — see §15 AC-12). Intelligence widgets were already removed in UX-3. |
| **Finance Hub** | Sibling hub; no structural coupling. Critical Items deep links may target `/finance?tab=accounting&sub=…` (failed syncs, reconciliation mismatches, exceptions) — these already exist in `executiveCommandEngine` route data and must be verified post-UX-4 (§15 AC-13). |
| **Review Centre** | Untouched. Activity tab rows about review events deep-link to `/review` (navigate-only, never execute — Activity Feed Doctrine). |
| **Jobs** | Job-attributed events in the Activity tab deep-link to `/jobs/:id`. |
| **Automation pages** | Critical Items / Activity rows deep-link to current automation routes (`/automations`, `/automation-governance`, `/workflows`). UX-6 will later re-point these to `/automation?tab=…`; UX-5 uses today's routes. |
| **Notification bell (header)** | Preview dropdown unchanged; "View All Notifications" becomes role-aware: CEO → `/intelligence?tab=activity`, PM → `/notifications`. |

## 5.4 Entry Points Summary

1. Sidebar "Intelligence" item (primary).
2. Notification bell "View All" (CEO).
3. Legacy-route redirects (bookmarks, in-app residual links).
4. Dashboard Zone A drill-downs where the alert source is an intelligence concern.

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

**B. Critical Items panel** — from `executiveCommandEngine.getCriticalItems()`. Row: priority dot + description + ghost "[Action →]" button deep-linking to the source module (fires `recordExecutiveAlertOpened` + `recordExecutiveDeepLinkOpened`). Max 5 rows; "Show all N →" reveals the rest in place. Empty state: emerald CheckCircle, "No critical items — all systems healthy."

**C. Platform Summary strip** — 6 compact stat tiles from `getExecutiveSummary()` / `getOperationalOverview()` / `getGovernanceOverview()`: Active Jobs, Pending Reviews, Active Rules, Open Exceptions, Last Workflow Run, Unread Notifications. Read-only; no actions.

The ECC's remaining sections (operational/governance/financial overview cards, reporting snapshot, export snapshot, activity stream) are **not** carried into Overview — each is now redundant with a dedicated hub tab or the Finance Hub. (Open Question OQ-2 confirms this disposition.)

## 6.3 Tab 2 — Analytics

`AnalyticsCentreContent` (extracted) renders the existing Analytics Centre **unchanged**: doctrine notice, 5-dimension health, critical risks with investigation deep links, trends, forecasts ("Projections — Advisory Only" labels preserved), bottlenecks. Fires `recordAnalyticsViewed` on tab activation.

## 6.4 Tab 3 — Reports

`ReportsContent` (extracted from `reporting-centre.tsx`): doctrine notice, reports KPI strip, reports table with status filter, Report Detail Dialog, Report Builder Dialog, deep links. Unchanged behaviour. Note: "Generate Export" inside the Report Detail Dialog creates an export that must appear in the Exports tab on next render (state refresh on tab activation handles this — see §7.3).

## 6.5 Tab 4 — Exports

Two sub-tabs (UX-4 Accounting-tab pattern, `?sub=` param, default `exports`):

- **Exports** (`ExportsContent`): export KPI strip, exports table (View / Download / Archive), status filter, Export Detail Dialog with doctrine notice + audit reference, Board Pack generator.
- **Distribution** (`DistributionContent`): distribution KPI strip (total, delivered, pending, failed, delivery rate), distribution table.

All existing behaviour and audit events unchanged.

## 6.6 Tab 5 — Activity (new combined view; Blueprint 6.6)

**Filter bar:**
- Type: `All · Operational · Financial · Governance · Automation · Sync` (Part 4 filter set; mapping in §10.5).
- Priority: `All · Critical · Warning · Info`.
- Right-aligned `Switch`: **"Show Event Detail"** — persists to `localStorage` (`ledger.intelligence.eventDetail`); when ON, each row expands with raw event metadata (event id, category, source module, job attribution, audit reference) sourced from the activity record and, where resolvable, the matching Event Bus record.

**Combined chronological list** (newest first) merging:
- Activity events — `activityFeedEngine.getAllEvents()`
- Notifications — `notificationEngine.getAllNotifications()` (rendered with a "Notification" chip)

Row anatomy: priority dot · priority label · type label · relative timestamp · title · job/source line · trailing action. Actions:
- Activity rows: "Open Source →" (deep link; fires `recordEventNavigated`). Read-only otherwise.
- Notification rows: "Mark Read" / "Dismiss" (existing engine functions; doctrine-audited informational state changes — permitted) + deep link (fires `recordNotificationOpened`).

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
| `client/src/components/intelligence/ActivityHub.tsx` | Combined Activity tab (§6.6), incl. merge/filter logic and Event Detail expansion | ~400 lines |
| `tests/doctrine/intelligence-hub.spec.ts` | New doctrine suite (§13) | ~35 tests |

## 7.2 Modified Files

| File | Change |
|---|---|
| `client/src/pages/analytics-centre.tsx` | Extract + export `AnalyticsCentreContent({ embedded })`; default export becomes thin legacy wrapper (unrouted after redirect) |
| `client/src/pages/reporting-centre.tsx` | Extract + export `ReportsContent`, `ExportsContent`, `DistributionContent`. **State split:** reports state into `ReportsContent`; exports + distribution state into their components; cross-tab freshness via load-on-mount/activation (each content component loads from its engine on mount — engines are module singletons, so no shared React state is required) |
| `client/src/pages/notification-center.tsx` | Unchanged rendering for PM; no longer reachable by CEO (redirect). No internal change expected beyond optional dead-code trim |
| `client/src/pages/executive-command-centre.tsx`, `activity-feed.tsx`, `event-monitor.tsx` | Become unrouted legacy files this phase (redirects replace routes). Reusable fragments (health card, critical item row, event row rendering, raw-event metadata block) are lifted into the two new intelligence components, not imported from the legacy pages |
| `client/src/App.tsx` | Add `/intelligence` route (CEO), `RedirectToIntelligence` helper, 6 legacy redirects (declared before retained legacy routes), role-aware `/notifications` handling |
| `client/src/components/layout.tsx` | INTELLIGENCE section: single "Intelligence" item (CEO) + "Notifications" (PM-only visibility); remove "Platform Events" from ADMIN; role-aware bell "View All" |
| `client/src/lib/analyticsEngine.ts` | Add UX-4-pattern hub audit recorders: `recordIntelligenceHubViewed`, `recordIntelligenceHubTabViewed(tab)`, `recordIntelligenceHubDeepLinkOpened(destination)`, `getIntelligenceHubAuditLog()`, `_resetIntelligenceHubAuditState()` |

## 7.3 Reuse vs New — Summary

| Capability | Source | Reuse mode |
|---|---|---|
| Hub shell, tab routing, redirects, inner RBAC, audit wiring | UX-4 Finance Hub | Pattern copy |
| Analytics tab | `analytics-centre.tsx` | Extract unchanged |
| Reports / Exports / Distribution | `reporting-centre.tsx` | Extract unchanged (state split) |
| Health Scorecard, Critical Items, Summary | `executiveCommandEngine` + ECC rendering fragments | New component, existing data + styling |
| Activity rows, filters | `activity-feed.tsx` + `notification-center.tsx` rendering logic; engine color/label maps | New component, existing data + styling |
| Event Detail expansion | `event-monitor.tsx` raw-event block | New inline rendering, existing data |
| Doctrine notices, KPI cards, badges, dialogs | shadcn/ui + existing components | Direct reuse |

No new architectural patterns, no new state libraries, no new data models (Implementation Philosophy compliance).

---

# 8. USER JOURNEYS

## 8.1 CEO — Weekly Intelligence Session

1. Sidebar → Intelligence → lands on **Overview**. Health Scorecard shows Governance Risk 45/100 (Critical).
2. Critical Items: "Xero sync failure — 14 records pending resync" → [Resolve →] deep-links to `/finance?tab=accounting&sub=sync`. (Hub records alert-opened + deep-link audit entries; resolution happens in the Finance Hub under existing approval/audit controls.)
3. Back to Intelligence → **Analytics**: reviews trends and forecasts (advisory labels visible).
4. **Reports**: generates an Executive Summary via Report Builder; from the detail dialog generates a PDF export.
5. **Exports**: downloads the export; creates a board-pack distribution.
6. Total: one nav destination, five questions answered, every step audited.

## 8.2 CEO — Anomaly Drill-Down

1. Notification bell shows unread badge → opens preview → "View All" → `/intelligence?tab=activity`.
2. Filters Priority = Critical. Sees `sync_event` "Xero sync — 14 records failed".
3. Toggles "Show Event Detail" → inspects raw event metadata (source module, job attribution, audit ref).
4. "Investigate →" deep-links to the accounting sync surface. No action executed from the hub itself.

## 8.3 Project Manager

1. PM sidebar shows "Notifications" (no "Intelligence" item).
2. `/notifications` renders the existing Notification Centre, job-scoped via `scopeNotificationsForPM()`.
3. Direct navigation to `/intelligence` or any legacy CEO intelligence route → Unauthorized page. Behaviour identical to today.

## 8.4 Future Extensibility

- A future read-only "Advisor/Investor" role could be granted Overview + Reports tabs only; the tab-gated structure supports per-tab RBAC without redesign.
- UX-6 will re-point automation deep links to `/automation?tab=…` — isolated to link constants.

---

# 9. RBAC IMPLICATIONS

| Role | `/intelligence` | Legacy intelligence routes | `/notifications` |
|---|---|---|---|
| CEO | Full (all 5 tabs) | Redirect to hub | Redirect to hub Activity tab |
| Project Manager | **Unauthorized** | Unauthorized (unchanged) | Notification Centre page (unchanged, job-scoped) |
| Worker | Worker redirect to `/worker/jobs` (existing ProtectedRoute behaviour) | Same | No access (unchanged) |
| Client | No platform access (portal only) | Same | Same |

Enforcement layers:
1. `ProtectedRoute roles={["CEO"]}` on `/intelligence`.
2. Inner CEO check inside `intelligence-hub.tsx` (NG-05 defence-in-depth, UX-4 precedent).
3. Redirect components inherit the route guard of their declaring route (CEO-gated), so a PM hitting `/analytics-centre` still sees Unauthorized, not a redirect into the hub.
4. The role-aware `/notifications` route must check role **before** redirecting — PM must never be bounced to an Unauthorized hub.

**Invariants preserved:** Workers never gain financial visibility; PMs gain no new intelligence visibility; Clients untouched. No notification RBAC change: CEO full visibility (now via hub), PM job-scoped (via existing page).

---

# 10. DATA SOURCES

Every displayed value originates from an existing frontend mock engine. No engine computation changes.

## 10.1 Overview Tab

| Element | Source |
|---|---|
| Health Scorecard (4 cards) | `executiveCommandEngine.getExecutiveHealthSnapshot()` → `{ operational, financial, governance, workflow }`, each `{ score, level }` |
| Critical Items | `executiveCommandEngine.getCriticalItems()` → `CriticalAlertItem[]` (description, severity, route) |
| Platform Summary strip | `executiveCommandEngine.getExecutiveSummary()` (+ `getOperationalOverview()`, `getGovernanceOverview()` for active rules / open exceptions; `notificationEngine.getUnreadCount()` for unread) |

Note: the Overview uses the ECC engine's **4-dimension** snapshot per Blueprint 6.2; the Analytics tab continues to show the analytics engine's **5-dimension** model. Both already coexist today (ECC page vs Analytics page) — no reconciliation needed or permitted.

## 10.2 Analytics Tab

`analyticsEngine`: `getAnalyticsSummary()`, `getCriticalRisks()`, `getTrendAnalysis()`, `getForecasts()`, `getBottleneckAnalysis()` — unchanged.

## 10.3 Reports Tab

`reportingEngine`: `getAllReports()`, `computeReportingSummary()`, `generateReport`/builder API, `recordReportViewed()`, `archiveReport()` — unchanged.

## 10.4 Exports Tab

`exportEngine`: `getAllExports()`, `computeExportSummary()`, `getAllDistributions()`, `computeDistributionSummary()`, `generateExport()`, `generateBoardPack()`, `downloadExport()`, `archiveExport()`, `createDistribution()` — unchanged.

## 10.5 Activity Tab

| Element | Source |
|---|---|
| Activity rows | `activityFeedEngine.getAllEvents()` |
| Notification rows | `notificationEngine.getAllNotifications()` (CEO: unscoped — hub is CEO-only) |
| Merge | Union sorted by timestamp desc; notification rows tagged with a "Notification" chip |
| Type filter mapping | **Operational:** review_event, job_event, worker_event, stock_event, asset_event · **Financial:** financial_control_event, exception_event · **Governance:** governance_event · **Automation:** automation_event, scheduler_event, workflow (notification type `workflow` family) · **Sync:** sync_event, reconciliation_event · Notification types map via their `NotificationType` → nearest category; unmatched types appear under All only |
| Priority filter | `critical` / `warning` / `info` on both record kinds |
| Event Detail expansion | Activity record metadata (id, type, priority, source, jobId, auditRef); where the record originated from the Event Bus, the matching `eventBusEngine.getEventHistory()` record (matched by event id) is rendered beneath. Bus records with no activity counterpart are **not** injected into the list (Event Bus seed-suppression note in canonical context) |
| Counts/KPIs (if shown in filter chips) | `computeActivitySummary()`, `computeNotificationSummary()` |

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

---

# 11. FINANCIAL DOCTRINE REVIEW

| Doctrine | Compliance statement |
|---|---|
| **Approval Doctrine** | The hub contains no approve/reject/correct controls. No operational event can create financial records from any hub surface. All "Resolve/Review/Investigate" affordances are navigation-only deep links into modules where existing approval controls govern. |
| **Review Centre Doctrine** | Untouched. The Review Centre remains the sole financial gatekeeper; the hub links to it and never around it. |
| **Audit Doctrine** | No silent state changes. Every hub view, tab view, alert open, deep link, report/export action, activity navigation, and notification interaction generates an immutable audit entry via existing engine APIs plus new hub-level recorders. All existing audit event types (`executive_centre_viewed`, `analytics_viewed`, `report_*`, `export_*`, activity/notification interactions) continue to fire from their new mount points. |
| **Job Attribution Doctrine** | Preserved — activity/event records carry job attribution today and the hub renders it (and surfaces it in Event Detail). No attribution data is created or modified. |
| **Financial Integrity Doctrine** | No normalization, sync, or financial computation is touched. Accounting systems remain downstream consumers; the hub only displays sync/reconciliation status sourced from existing engines. |
| **Notification / Activity Feed / Event Bus Doctrines** | All three remain informational. Mark-read/dismiss are the only mutations available (notification status — explicitly doctrine-permitted and audited). Deep links navigate only. The Event Detail toggle is read-only rendering of existing bus history. |
| **Analytics / Reporting / Export Doctrines** | Content mounts unchanged: forecasts keep "Projections — Advisory Only" labelling; reports and exports keep their lifecycle, doctrine notices, and audit references. |
| **Dashboard Intelligence / ECC Doctrines** | The hub inherits the ECC's read-only visibility doctrine wholesale. ECC audit event types continue to be generated from the Overview tab. |
| **Automation rules** | Nothing in the hub evaluates, schedules, or approves anything. |

**Conclusion: UX-5 is a pure presentation-layer consolidation. No doctrine is weakened, bypassed, or modified.**

---

# 12. ACCESSIBILITY CONSIDERATIONS

1. **Tabs:** shadcn/Radix Tabs provide `role="tablist"`/`tab`/`tabpanel` and arrow-key navigation out of the box — preserved by reusing the Finance Hub structure.
2. **Colour is never the sole signal:** health status pills pair dot colour with text ("Healthy"/"Warning"/"Critical"); priority dots pair with priority labels (existing engine label maps).
3. **Contrast:** the Blueprint 6.2 palette (e.g. `text-emerald-700` on `bg-emerald-50`) meets WCAG AA for normal text; retain as specified.
4. **Toggle semantics:** "Show Event Detail" uses the shadcn `Switch` with a visible label and `aria-checked`; state persistence does not alter semantics.
5. **Deep-link buttons:** descriptive accessible names ("Open source: Xero sync failure"), not bare arrows.
6. **Focus management:** dialogs (Report Detail, Export Detail, Builder) already trap focus via Radix; tab changes move focus to the panel per Radix default.
7. **Headings:** single `h1` per page (hub heading); tab content uses `h2`+ (UX-4 heading-hierarchy cleanup precedent).
8. **Load More:** button (not scroll-jacking), keyboard reachable, announces appended content count via `aria-live="polite"` region on the list container.
9. **Mobile touch targets:** filter chips ≥ 40px height; wrap rather than truncate.

---

# 13. TESTING STRATEGY

## 13.1 Unit / Build

- `npm run build` must pass (TS strict surface: new components typed against existing engine types; no `any` additions beyond existing file conventions).
- No unit-test framework exists in the repo; logic-level verification (filter mapping, merge ordering) is covered through Playwright assertions on seeded data (deterministic seeds already exist in all engines).

## 13.2 Integration Implications (Playwright migration)

Seven existing doctrine suites reference legacy routes (~249 occurrences):

| Suite | Tests | Route refs | Migration |
|---|---|---|---|
| `executive-command-centre.spec.ts` | 35 | 42 | Entry navigation → `/intelligence?tab=overview`; assertions re-target Overview testIds; redirect test added |
| `analytics-centre.spec.ts` | 42 | 49 | Entry → `/intelligence?tab=analytics`; content testIds unchanged (content mounts unchanged) |
| `reporting-centre.spec.ts` | 40 | 39 | Entry → `/intelligence?tab=reports`; internal tab-bar assertions updated to hub tabs |
| `report-exports.spec.ts` | 40 | 41 | Entry → `/intelligence?tab=exports` (+ `sub=distribution`) |
| `activity-feed.spec.ts` | 25 | 24 | Entry → `/intelligence?tab=activity`; AF-08 remains a known failure unless separately fixed |
| `notification-centre.spec.ts` | 28 | 25 | CEO tests → hub Activity tab or redirect assertions; PM tests unchanged on `/notifications`; NC-25 remains known failure |
| `event-bus.spec.ts` | 30 | 29 | Monitor-page tests → Activity tab with `detail=1`; engine-level tests unchanged |

Expectation: most content assertions survive because content components keep their testIds; the migration is dominated by navigation setup changes.

## 13.3 New Doctrine Suite — `tests/doctrine/intelligence-hub.spec.ts` (IH-01 …, ~35 tests)

Coverage groups:
1. **RBAC (IH-01–06):** CEO renders hub; PM `/intelligence` → Unauthorized; PM `/notifications` → Notification Centre (no redirect); Worker → `/worker/jobs`; PM legacy intelligence routes → Unauthorized; inner CEO check.
2. **Shell & tabs (IH-07–12):** 5 tabs render; default tab = overview; `?tab=` deep links; `?sub=distribution`; heading reflects tab; single `h1`.
3. **Overview (IH-13–18):** 4 health cards with score + level pill; critical items rows + deep link navigation; empty state; summary strip values match engine seeds.
4. **Activity (IH-19–27):** combined list contains activity + notification rows; type filters; priority filters; merge order (newest first); mark-read updates state + audit; Event Detail toggle reveals metadata; toggle persists via localStorage; `detail=1` query opens toggled; Load More.
5. **Redirects (IH-28–33):** all six legacy routes land on correct hub tab (CEO); bell "View All" → hub Activity (CEO) and `/notifications` (PM).
6. **Doctrine enforcement (IH-34+):** no approve/reject controls anywhere in hub DOM; forecasts labelled advisory; hub audit entries recorded (`intelligence_hub_viewed`, tab views); deep links navigate without mutating engine state.

## 13.4 Suggested Test IDs

```
intelligence-hub-page, intelligence-hub-heading
intelligence-tab-overview|analytics|reports|exports|activity
intelligence-overview-panel, intelligence-analytics-panel,
intelligence-reports-panel, intelligence-exports-panel, intelligence-activity-panel
intel-health-scorecard, intel-health-operational|financial|governance|workflow
intel-critical-items, intel-critical-item-row, intel-critical-items-empty
intel-summary-strip, intel-summary-tile-{metric}
exports-subtab-exports, exports-subtab-distribution
activity-filter-type-{all|operational|financial|governance|automation|sync}
activity-filter-priority-{all|critical|warning|info}
activity-event-detail-toggle, activity-combined-list, activity-row,
activity-row-notification-chip, activity-event-detail-block, activity-load-more
nav-intelligence-hub
```

## 13.5 Regression Gate

- Full Playwright run after each implementation day.
- Pass criterion: total ≥ 501 + new IH tests; failures limited to AF-08 + NC-25 exactly. Any third failure is a UX-5 regression and blocks progression (UX-4 handoff rule).

---

# 14. RISKS

## P0 — Must be controlled or the phase fails

| # | Risk | Mitigation |
|---|---|---|
| P0-1 | **Test-migration blast radius** (~249 route references across 7 suites). A sloppy migration masks real regressions. | Migrate suite-by-suite in the same commit as the corresponding tab wiring; run the affected suite immediately; never bulk-search-replace routes without reviewing each assertion. |
| P0-2 | **PM notification access regression.** Role-aware `/notifications` handling done wrong locks PMs out (doctrine violation) or redirects them into Unauthorized. | Explicit IH RBAC tests for PM before/after; role check precedes redirect; PM tests in `notification-centre.spec.ts` kept green throughout. |
| P0-3 | **Reporting Centre state split.** Splitting one 1,098-line stateful page into three content components can break dialogs, filters, or the report→export generation flow. | Extract mechanically with state moved per component; engines are singletons so cross-tab freshness comes from load-on-mount; preserve all existing testIds; reporting + export suites run after Day 1. |
| P0-4 | **Audit-trail regression.** ECC/analytics view events could stop firing once pages unmount from legacy routes. | Tab-activation effects fire existing recorders (§10.6); IH doctrine tests assert audit log contents. |
| P0-5 | **Duplicate testId / strict-mode collisions** when multiple extracted contents mount in one DOM (NC-25 class of failure). | Radix Tabs render only the active panel (no `forceMount`); verify no global-render duplicates (e.g. doctrine notices) via strict-mode locator checks in IH tests. |

## P1 — Significant, manageable

| # | Risk | Mitigation |
|---|---|---|
| P1-1 | **Wouter route ordering** — redirects declared after retained legacy routes never match. | Follow UX-4 ordering precedent (App.tsx:183 comment); redirect tests cover every legacy route. |
| P1-2 | **Nav active-state** for query-param URLs (Intelligence item must highlight on `/intelligence?tab=…`). | Existing `NavLink` already matches `href + "?"` (layout.tsx:333–335) — covered; add an assertion anyway. |
| P1-3 | **Notification bell role-awareness** adds a role lookup to a shared header component. | Reuse the layout's existing `hasAnyRole` data; PM bell behaviour asserted in tests. |
| P1-4 | **Type-filter mapping ambiguity** for notification types vs the 5 filter categories. | Mapping table fixed in §10.5; unmatched types visible under All; mapping asserted against seed data. |
| P1-5 | **localStorage persistence** of Event Detail toggle leaking between test runs / users. | Namespaced key, read defensively; tests reset localStorage in setup. |
| P1-6 | **Residual in-app links** to legacy routes (dashboard, ECC quick links, notification deep-link routes in `NOTIFICATION_SOURCE_ROUTES`, `BUS_EVENT_ROUTES`, `ACTIVITY_EVENT_ROUTES`). | Redirects make stale links safe (graceful degradation); a grep sweep updates first-party links to hub URLs (AC-12). |

## P2 — Polish opportunities (optional, non-blocking)

| # | Opportunity |
|---|---|
| P2-1 | Fix NC-25 while touching the bell (unique mobile/desktop badge testIds) — restores a 500/501 baseline. Recommended as a separate small commit if taken. |
| P2-2 | Fix AF-08 (re-anchor activity seed dates) — separate maintenance fix, restores 501/501. |
| P2-3 | Relative-time formatting consistency across merged Activity rows ("09:14 today" style per Blueprint 6.6). |
| P2-4 | Delete fully-unrouted legacy page files in a follow-up cleanup commit once two phases of test history confirm nothing references them. |
| P2-5 | "Show all N →" critical-items expansion animation and count badge. |

---

# 15. ACCEPTANCE CRITERIA

UX-5 is complete when all of the following hold:

| # | Criterion |
|---|---|
| AC-01 | `/intelligence` renders for CEO with five tabs (Overview, Analytics, Reports, Exports, Activity); default tab is Overview; `?tab=` and `?sub=` deep links work and are bookmarkable. |
| AC-02 | Overview shows the 4-dimension Health Scorecard, Critical Items panel (with working deep links and empty state), and Platform Summary strip — values matching engine seed data. |
| AC-03 | Analytics, Reports, Exports tabs render the existing centres' content unchanged (all pre-existing testIds, doctrine notices, dialogs, and flows intact), with Exports split into Exports/Distribution sub-tabs. |
| AC-04 | Activity tab shows a combined activity + notification chronology with the 6 type filters and 4 priority filters; notification rows support mark-read/dismiss; activity rows deep-link only. |
| AC-05 | "Show Event Detail" toggle reveals raw event metadata inline, persists to localStorage, and is pre-enabled via `detail=1`. |
| AC-06 | CEO sidebar shows exactly one "Intelligence" item in the INTELLIGENCE section; "Platform Events" no longer appears under ADMINISTRATION; PM sidebar still shows "Notifications". |
| AC-07 | All six legacy routes redirect CEO users to the correct hub tab; PM behaviour: `/notifications` renders the Notification Centre, all other intelligence routes remain Unauthorized. |
| AC-08 | Notification bell "View All" navigates CEO → `/intelligence?tab=activity`, PM → `/notifications`. |
| AC-09 | RBAC: PM/Worker/Client cannot access the hub (route guard + inner check); Workers retain zero financial visibility. |
| AC-10 | Audit: hub view, tab views, alert opens, deep links, and all pre-existing module audit events are recorded; no silent state changes (verified by doctrine tests). |
| AC-11 | Build passes; full Playwright run shows zero failures beyond AF-08 and NC-25; new `intelligence-hub.spec.ts` suite (~35 tests) passes. |
| AC-12 | A repo-wide sweep confirms no first-party UI link targets a legacy intelligence route (engine route maps may be updated or left to redirect handling — documented either way). |
| AC-13 | Critical Items / Activity deep links targeting finance surfaces resolve to UX-4 hub URLs (no links into now-redirected legacy finance routes that lose tab context). |
| AC-14 | No approve/reject/correct or financially mutating control exists anywhere in the hub DOM. |
| AC-15 | Tracker (`UX_REDESIGN_PROGRAMME.md` §9), `CURRENT_DEVELOPMENT_STATE.md`, canonical context UX section, and a UX-5 handoff in `docs/handoffs/` are updated; PR opened from `feature/ux5-intelligence-hub`; work stops at PR per git workflow. |

---

# 16. IMPLEMENTATION PLAN (for the build session — 5 days per Blueprint 11)

| Day | Work | Gate |
|---|---|---|
| 1 | Hub shell + `/intelligence` route + RBAC + extract `AnalyticsCentreContent`, `ReportsContent`, `ExportsContent`, `DistributionContent`; wire Analytics/Reports/Exports tabs | Build pass; analytics/reporting/exports suites migrated + green |
| 2 | `ActivityHub`: merge logic, type/priority filters, mark-read/dismiss, pagination | activity-feed + notification (CEO) suites migrated + green |
| 3 | Event Detail toggle + localStorage + `detail=1`; event-bus suite migration | event-bus suite green |
| 4 | `IntelligenceOverview` (scorecard, critical items, summary strip) + hub audit recorders; ECC suite migration | ECC suite green |
| 5 | Nav consolidation, bell link, all redirects, link sweep (AC-12/13), new IH doctrine suite, full Playwright run, docs/handoff | Full run: only AF-08 + NC-25 fail |

Branch: `feature/ux5-intelligence-hub`. Standard git workflow; stop at PR.

---

# DELIVERABLE ASSESSMENT

## Implementation Readiness Score: **90%**

Grounds: approved design exists (Decision 5 + Blueprint 6), a proven structural precedent exists (UX-4), every data source is verified present in the engines, the test surface is enumerated, and the riskiest work (reporting-centre extraction, test migration) has a known UX-4-shaped playbook. The missing 10% is the four open questions below plus normal extraction unknowns inside the 1,098-line reporting page.

## Open Questions (owner decisions requested before coding)

| # | Question | Recommendation |
|---|---|---|
| OQ-1 | **PM notification routing.** Confirm the role-aware split: CEO `/notifications` → hub Activity; PM keeps the Notification Centre page and nav item. | Recommended as specified (§5.2, §9) — only doctrine-exact option. |
| OQ-2 | **ECC residual sections.** Confirm that the ECC's operational/governance/financial overview cards and reporting/export snapshots are dropped (redundant with hub tabs and Finance Hub) rather than folded into Overview. | Drop — Blueprint 6.2 defines Overview as Scorecard + Critical Items + Summary only. |
| OQ-3 | **Engine route maps.** `NOTIFICATION_SOURCE_ROUTES`, `ACTIVITY_EVENT_ROUTES`, `BUS_EVENT_ROUTES` still contain legacy intelligence/finance routes. Update the constants to hub URLs (cleaner, touches engine files) or rely on redirects (zero engine churn)? | Update the constants — they are presentation routing data, not financial logic; redirects remain as safety net. |
| OQ-4 | **NC-25 companion fix.** Touching the bell for the "View All" change makes the duplicate-badge fix nearly free. In scope as a separate commit, or strictly out? | Take it as an isolated companion commit (P2-1); keeps the known-failure ledger shrinking. |

## Recommended Refinements Before Coding

1. Resolve OQ-1–OQ-4 with the repository owner (one short review pass).
2. Spike (30 min, read-only) the `reporting-centre.tsx` extraction seams — confirm the Report Detail Dialog's "Generate Export" flow has no hidden coupling to exports-tab state beyond engine reads.
3. Run a pre-implementation grep inventory for legacy intelligence route literals across `client/src` to finalise the AC-12 sweep list.
4. Confirm with the owner that the two new component directories/testId conventions above are acceptable as the binding contract for the new doctrine suite.

## Readiness Statement

**This specification is ready for independent review.** It is grounded in the approved Decision 5 and Blueprint 6, verified against the live codebase (routes, nav, engines, test suites enumerated above), reopens no approved decision, and preserves every doctrine. Implementation must not begin until the open questions are resolved and the review is accepted.

---

*UX-5 Intelligence Hub Specification v1.0 — planning artifact only. No code has been written. The Ledger's Approval, Audit, Job Attribution, and Financial Integrity doctrines remain absolute throughout this phase.*
