# UX-5 — INTELLIGENCE HUB — HANDOFF

Date: June 12, 2026
Branch: `feature/ux5-intelligence-hub`
Specification: `docs/specifications/UX-5-INTELLIGENCE-HUB-SPECIFICATION-v1.1.md` (frozen, v1.1)
Status: **COMPLETE** — build verified after every stage; full Playwright suite verified green by the repository owner (512 / 512, zero failures) on June 16, 2026. Awaiting owner merge to `main`.

---

## Summary

UX-5 consolidates the CEO's read-only intelligence destinations — Executive Command Centre, Analytics Centre, Reporting Centre (Reports + Exports + Distribution), Activity Feed, and CEO notification consumption — into a single Intelligence Hub at `/intelligence` with five tabs (Overview · Analytics · Reports · Exports · Activity), mirroring the UX-4 Finance Hub architecture. The Event Monitor leaves navigation but remains a routed, hidden, CEO-only page at `/event-monitor` (P0-B). Pure presentation-layer consolidation: no engine computation, doctrine, approval workflow, or financial logic changed.

## Commits (in order)

| Commit | Stage |
|---|---|
| `eca11c6` | Spec documents committed (v1.0, v1.1, amendment summary) |
| `1fe1416` | Stage 1 — hub shell, `/intelligence` route, nav item, hub audit recorders |
| `857859b` | Stage 2 — Intelligence Overview tab |
| `e99743b` | Stage 3 — Analytics Centre migrated (extract `AnalyticsCentreContent`) |
| `f406a5b` | Stage 4 — Reporting Centre Reports migrated (state split) + S-5/S-6 deep links |
| `8192c69` | Stage 5 — Exports tab with Exports/Distribution sub-tabs |
| `448ab1b` | Stage 6 — combined Activity tab (ActivityHub) |
| `260408f` | Stage 7 — legacy redirects, nav consolidation, link sweep S-1…S-8 |
| `cd93a7e` | NC-25 companion fix (isolated commit — unique bell badge testIds) |
| `e4f0d17` | Stage 8 — doctrine suite migration + new intelligence-hub suite |
| (this commit) | Stage 9 — docs, tracker, handoff |

## Files Created

- `client/src/pages/intelligence-hub.tsx` — hub shell: query-param tab state (`?tab=`/`?sub=`), inner CEO check (NG-05), hub-level doctrine notice + CEO Only badge, audit effects
- `client/src/components/intelligence/IntelligenceOverview.tsx` — Health Scorecard (4 dims), Critical Items (P1-E severity rendering, critical-first sort, max 5 + Show all, empty state), 6-tile Platform Summary strip (§10.1 sources)
- `client/src/components/intelligence/ActivityHub.tsx` — merged activity + notification chronology; canonical priority mapping (P0-A); total type→category mapping; 6 type + 4 priority filters (no KPI strip — P1-C); mark-read/dismiss/open (engine-audited); Show Event Detail toggle (localStorage `ledger.intelligence.eventDetail`, `?detail=1` precedence without storage writes — P1-D); `bus-af-` Platform Event join; pagination (25 + Load More); aria-live list
- `tests/doctrine/intelligence-hub.spec.ts` — 38 doctrine tests (IH-01…IH-38)

## Files Modified

- `client/src/App.tsx` — `/intelligence` route (CEO); `RedirectToIntelligence`; redirects for `/executive-command-centre|analytics-centre|reporting-centre|activity-feed`; role-aware `NotificationsRouteSwitch` at the original `/notifications` declaration position; `/event-monitor` route retained unchanged
- `client/src/components/layout.tsx` — INTELLIGENCE section: single "Intelligence" item (CEO, `nav-intelligence-hub`) + "Notifications" (PM only); "Platform Events" removed from ADMINISTRATION; header System Alert → `/intelligence?tab=overview` (S-1); role-aware bell "View All" (S-3); NC-25 badge fix (`notif-bell-badge-desktop`)
- `client/src/pages/dashboard.tsx` — Zone A "View Alerts" → `/intelligence?tab=overview` (S-4)
- `client/src/pages/analytics-centre.tsx` — `AnalyticsCentreContent({ embedded })` extracted; default export = thin Layout wrapper (unrouted)
- `client/src/pages/reporting-centre.tsx` — split into `ReportsContent` / `ExportsContent` / `DistributionContent` (each owns state + dialogs, loads from its engine on mount); legacy default export re-mounts all three (unrouted)
- `client/src/lib/analyticsEngine.ts` — Intelligence Hub audit recorders (`recordIntelligenceHubViewed/TabViewed/DeepLinkOpened`, `getIntelligenceHubAuditLog`, `_resetIntelligenceHubAuditState`) + "hub audit host" designation comment
- `client/src/lib/reportingEngine.ts` — seeded + template `deepLinkRoute` values → hub URLs (S-5/S-6)
- `client/src/lib/activityFeedEngine.ts` / `client/src/lib/eventBusEngine.ts` — `notification_event` route constants → `/intelligence?tab=activity` (S-7/S-8)
- Unrouted legacy files retained for the future deletion pass: `executive-command-centre.tsx`, `activity-feed.tsx` (spec §4 Out of Scope)

## Tests Added / Migrated / Retired

| Suite | Before | After | Change |
|---|---|---|---|
| `executive-command-centre.spec.ts` | 35 | 27 | Rewritten against Overview; dropped-section tests removed |
| `analytics-centre.spec.ts` | 42 | 37 | Navigation-only; ECC-integration group removed |
| `reporting-centre.spec.ts` | 40 | 37 | Navigation-dominated; ECC snapshot group removed |
| `report-exports.spec.ts` | 40 | 37 | Navigation-only (sub-tabs); ECC snapshot group removed |
| `activity-feed.spec.ts` | 25 | 17 | Rewritten against ActivityHub; **AF-04–AF-08 (KPI strip) and AF-16–AF-18 (search) retired** |
| `notification-centre.spec.ts` | 28 | 28 | CEO half → redirect/hub assertions; page tests run as PM (12 unassigned seeds); NC-25 expected green |
| `event-bus.spec.ts` | 30 | 30 | Nav-absence + redirect touch-ups only (hidden route retained) |
| `intelligence-hub.spec.ts` | — | 38 | **New** |
| **Total** | **501** | **512** | +11 |

## Verification Results

- Build (`npm run build`): **PASS** after every stage.
- `tsc --noEmit`: zero errors in any UX-5-touched file (pre-existing repo-wide errors in untouched files remain; the project gate is the Vite build).
- Playwright: **PASS — 512 / 512, zero failures** (known-failure ledger empty: AF-08 retired, NC-25 fixed). Full suite verified green by the repository owner on June 16, 2026.

## Doctrine Compliance

- **Approval / Review Centre / Financial Integrity:** untouched — no approve/reject/correct or mutating control exists anywhere in the hub (IH-37); deep links navigate only.
- **Audit:** all existing module recorders keep firing from their new mount points (Overview fires `recordExecutiveCentreViewed`, Analytics fires `recordAnalyticsViewed` on tab activation; report/export/activity/notification recorders unchanged); new hub-level recorders added (`intelligence_hub_viewed`, `intelligence_hub_tab_viewed`, `intelligence_hub_deep_link_opened`). More audit, never less.
- **Job Attribution:** `jobId` rendered on rows and in the Event Detail expansion; no attribution data created or modified.
- **Notification / Activity Feed / Event Bus:** informational only; mark-read/dismiss are the only (doctrine-permitted, audited) mutations; bus seed-suppression respected — seeded bus events are not injected into the combined list and remain on the hidden `/event-monitor`.
- **Analytics / Reporting / Export:** content mounted unchanged; "Projections — Advisory Only" labels intact; report-section deep-link updates are presentation routing data only.
- **RBAC:** CEO full hub; PM unchanged (`/notifications` page, job-scoped; everything else Unauthorized); Worker/Client unchanged (Unauthorized page — P1-A).

## Known Limitations (non-blocking)

Deferred spec P2 items — none block merge:

- Activity seed-date re-anchoring (P2-2) — optional data hygiene; AF-08 already retired with the legacy KPI strip.
- Relative-time formatting polish across merged Activity rows (P2-3).
- Physical deletion of the now-unrouted legacy page files (`executive-command-centre.tsx`, `activity-feed.tsx`) after two phases of green history confirm nothing references them (P2-4).
- Critical-items "Show all N" expansion animation / count badge (P2-5).

Minor stylistic observations (not regressions, no action required for merge):

- `NotificationsRouteSwitch` (App.tsx) detects CEO via a `roleIds` string-prefix check rather than the role-name lookup used elsewhere — works against current seed data.
- A few seed-record `sourceRoute: '/notifications'` values rely on the CEO role-aware redirect (the intended compatibility layer); the normative route maps (S-7/S-8) are updated.

## Merge Readiness

**UX-5 Intelligence Hub is stabilized and ready for merge into `main`.** Build passes; the full Playwright suite is green (512 / 512, zero failures); the known-failure ledger is empty; all doctrines (Approval, Audit, Job Attribution, Financial Integrity, Review Centre, Notification, Activity Feed, Event Bus) are preserved; RBAC is intact. The merge is to be performed by the repository owner via GitHub after review.

## Outstanding Work

1. ✅ Full Playwright suite run — **done** (512 / 512, zero failures, June 16, 2026).
2. Owner merge of `feature/ux5-intelligence-hub` → `main` via GitHub.
3. After merge: update branch references in the tracker/dev-state to reflect the merge landing on `main`.

## Recommended Next Steps

- Owner merges to `main` → begin UX-6 (Automation Hub), which will re-point automation deep links to `/automation?tab=…`.
