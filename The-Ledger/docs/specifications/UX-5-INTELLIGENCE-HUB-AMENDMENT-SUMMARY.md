# THE LEDGER — UX-5 INTELLIGENCE HUB
## Amendment Summary: v1.0 → v1.1

**Date:** June 12, 2026
**Input:** UX-5-INTELLIGENCE-HUB-SPECIFICATION.md (v1.0) + independent review findings (June 10, 2026 review session — verdict: "Ready with amendments")
**Output:** UX-5-INTELLIGENCE-HUB-SPECIFICATION-v1.1.md
**Session type:** Amendment only — no implementation code written, no routes modified.

All file/line/interface facts cited below were re-verified against the live repository (`main` @ `cf93a4a`) during this amendment session, not carried over on trust.

---

## DECISIONS RESOLVED AND LOCKED

| Decision | v1.0 Status | v1.1 Resolution |
|---|---|---|
| OQ-1 — PM notification routing | Open (recommended) | **Locked.** CEO consumes notifications via hub Activity tab; PM retains standalone Notification Centre, job-scoped. Only doctrine-exact option (Notification Doctrine RBAC). |
| OQ-2 — ECC residual sections | Open (recommended: drop) | **Locked: drop.** Every dropped ECC section has a superset home (hub tab, Finance Hub, nav, or hidden `/event-monitor`). ECC "System Modules" quick links die with the page — all targets remain reachable (v1.1 §5.5 S-10). |
| OQ-3 — Engine route maps | Open (recommended: update) | **Locked: update constants at source.** Redirects are a compatibility layer, never a permanent dependency. Sweep inventory made normative and expanded (v1.1 §5.5). |
| OQ-4 — NC-25 companion fix | Open (recommended: take) | **Locked: in scope** as an isolated companion commit — UX-5 naturally touches the bell component. Promoted from P2-1 to In Scope (v1.1 §4). |
| NQ-1 — Event Monitor disposition | Raised by review | **Locked: hidden-route option.** See P0-B below. |
| NQ-2 — Priority mapping | Raised by review | **Locked.** See P0-A below. |
| NQ-3 — Activity KPI strip / AF-08 | Raised by review | **Locked: no KPI strip; AF-08 retired.** See P1-C below. |
| NQ-4 — Overview tile sources | Raised by review | **Locked: six tiles, one verified source each.** See P0-C below. |

---

## P0 CORRECTIONS APPLIED

### P0-A — Notification priority taxonomy mismatch → canonical mapping defined

**Review finding:** §6.6/§10.5/AC-04 claimed the priority filter applies "`critical`/`warning`/`info` on both record kinds" — factually wrong. `NotificationPriority = 'low' | 'medium' | 'high' | 'critical'` (notificationEngine.ts:28) vs `ActivityEventPriority = 'info' | 'warning' | 'critical'` (activityFeedEngine.ts:36). Merge, filters, IH-19–27 and AC-04 were unimplementable as written.

**v1.1 change (§10.5, normative):** canonical display taxonomy Critical/Warning/Info with the locked mapping:

| Notification priority | Hub display |
|---|---|
| critical | Critical |
| high | Warning |
| medium | Info |
| low | Info |

- **Rendering:** rows display the mapped label/dot; the native priority is shown only inside the Event Detail expansion (`Native priority: high`).
- **Filtering:** priority filter matches notifications on mapped value, activity events on native value (identical taxonomy).
- **No mutation:** pure render/filter function — `Notification.priority` is never rewritten.
- **Testing:** IH group 4 asserts the mapping against seed data (seeded `high` → Warning dot/label + Warning filter; `medium`/`low` → Info; `critical` → Critical). AC-04 updated to reference the mapping.

### P0-B — Event Monitor data unreachable / event-bus migration infeasible → hidden route retained

**Review finding:** the 20 seeded bus events are suppressed from the activity feed (`_suppressActivityFeedDispatch`, eventBusEngine.ts:171/709); only live `publishEvent()` calls create activity counterparts (id `bus-af-${event.id}`, line 281). v1.0's plan (redirect `/event-monitor` → Activity tab) made the seeded bus history unreachable from any UI (under-delivering Decision 5) and made the event-bus.spec.ts migration impossible (monitor tests assert on seed events absent from the combined list). The `bus-af-` join convention was undocumented.

**v1.1 change (locked: review option ii + toggle):**
- "Platform Events" removed from ADMINISTRATION nav (§5.1).
- **`/event-monitor` retained as a routed, CEO-only, hidden page** — no nav item, page internals unchanged, no redirect (§5.2, §2.2, §7.2). Full seeded Event Bus history remains accessible; zero data loss.
- "Show Event Detail" toggle kept in the Activity tab; for rows whose activity id begins `bus-af-` it renders the matching `BusEventRecord` (Platform Event chip: bus id, category, `consumedBy`, audit entry count) — the **`bus-af-` prefix is now the documented join key** (§6.6, §10.5).
- Seeded bus events explicitly do **not** appear in the combined list (seed-suppression rule respected) — documented with the `/event-monitor` escape hatch (§10.5).
- Migration strategy updated (§13.2): event-bus.spec.ts is **largely unchanged** (tests keep running against `/event-monitor`); only nav-absence assertions and the S-8 constant update are needed. Day 3 of the plan rescoped accordingly (§16).
- Doctrine tests updated: IH-01–06 adds "CEO `/event-monitor` still renders"; IH redirect group adds an explicit **no-redirect** assertion for `/event-monitor` (§13.3).

### P0-C — Unsourced Overview summary tiles → one verified source per tile

**Review finding:** "Active Jobs" exists in no ECC interface, and "Last Workflow Run" has no timestamp field in any named API — contradicting the "every data source verified" readiness claim.

**v1.1 change (§6.2-C, §10.1, normative — all sources re-verified this session):**

| Tile | Source |
|---|---|
| Active Jobs | `useStore().jobs.filter(j => j.status === 'Active').length` — Zustand store; filter pattern matches the dashboard Zone B and job-intelligence precedents; the Active-only filter is the tile's documented definition |
| Pending Reviews | `getExecutiveSummary().pendingReviews` |
| Active Rules | `getOperationalOverview().activeAutomations` |
| Open Exceptions | `getExecutiveSummary().openExceptions` |
| **Active Workflows** (replaces "Last Workflow Run") | `getExecutiveSummary().activeWorkflows` |
| Unread Notifications | `notificationEngine.getUnreadCount()` (notificationEngine.ts:392) |

- "Last Workflow Run" **replaced** rather than derived — keeps the strip free of undocumented derivations (`WorkflowRecord.lastExecutedAt` exists but would require a max-over-collection computation the named APIs don't provide).
- Stale `getGovernanceOverview()` strip reference removed.
- Tile testIds enumerated (`intel-summary-tile-{metric}`, §13.4); IH-13–18 assert all six tiles against seeds; AC-02 updated.

---

## P1 CORRECTIONS APPLIED

### P1-A — Worker RBAC misstated

**Review finding:** v1.0 §9 claimed Workers redirect to `/worker/jobs`; verified behaviour (App.tsx:82–90) is that the `roles` check returns `UnauthorizedPage` before any worker redirect runs. IH-04 as drafted would fail.

**v1.1 change:** §9 table corrected (Worker → Unauthorized page, with binding test note); IH-04 rewritten to the established "page not visible / Unauthorized" pattern (automation-centre AC-19 precedent); AC-09 updated to forbid Worker-redirect assertions.

### P1-B — Link sweep incomplete

**Review finding:** two unlisted legacy-route sources — the shared header System Alert indicator (layout.tsx:204 → `/executive-command-centre`) and `reportingEngine` seeded/template section `deepLinkRoute`s (reportingEngine.ts:258–259, 406, 565, 577 → ECC/Analytics) which render *inside the hub's own Report Detail Dialog*.

**v1.1 change:** new normative sweep inventory **§5.5 (S-1…S-10)** covering: header alert (S-1), nav items (S-2), bell (S-3), dashboard Zone A "View Alerts" (dashboard.tsx:297, S-4), reportingEngine seeds + generation templates (S-5/S-6), `ACTIVITY_EVENT_ROUTES.notification_event` and `BUS_EVENT_ROUTES.notification_event` → `/intelligence?tab=activity` (S-7/S-8), `NOTIFICATION_SOURCE_ROUTES` verified already-clean — no change (S-9), ECC quick links die with the page (S-10). §7.2 modified-files table extended (dashboard.tsx, reportingEngine.ts, activityFeedEngine.ts, eventBusEngine.ts). AC-12 now references the S-list as its acceptance check. Redirects explicitly designated a compatibility layer only.

**Verified this session:** the three engine route maps already point at UX-4 `/finance?tab=…` URLs for all finance-category entries — AC-13 is satisfiable by assertion alone; the only legacy intelligence target remaining in any constant is `notification_event: '/notifications'` (S-7/S-8).

### P1-C — Activity KPI strip / AF-08 disposition undefined

**Review finding:** v1.0 was non-committal ("Counts/KPIs (if shown in filter chips)") while AF-08 asserts on the legacy page's KPI strip; "most assertions survive" was untrue for the new ActivityHub component.

**v1.1 change (§6.6, §10.5, §13.2, locked):**
- The Activity tab has **no KPI strip and no counts in filter chips** (Blueprint 6.6 design). `computeActivitySummary()`/`computeNotificationSummary()` are not consumed by the tab.
- AF-04–AF-08 (the KPI-strip group) are **retired** with the legacy page during the Day 2 suite rewrite. **AF-08 leaves the known-failure ledger.** Its underlying seed-date drift becomes optional data hygiene (P2-2), no longer test-blocking.
- §13.2 reclassified honestly: ECC (35), activity-feed (25), and the notification CEO-half (~14) are **rewrites** (~74 tests); the extracted-tab suites are navigation-only migrations. The "most content assertions survive" claim is corrected and scoped.
- Known-failure ledger transition documented: {AF-08, NC-25} → **{} (empty)** (§13.5); regression gate and AC-11 updated to "zero failures".
- IH adds a strict-mode **absence** assertion for `af-kpi-strip` in the hub (§13.3 group 4).

### P1-D — `detail=1` vs localStorage precedence undefined

**Review finding:** IH-25/26 would be written against guesswork.

**v1.1 change (§6.6, normative — review recommendation adopted):** five precedence rules: default OFF; no param → defensive localStorage read; `?detail=1` wins for the visit and **does not write storage**; only user Switch interaction writes storage; param changes re-evaluate. IH-29–31 test the contract including the storage-unchanged assertion; AC-05 updated.

### P1-E — Critical Items severity rendering undefined

**Review finding:** `CriticalAlertItem.priority` is `'high' | 'critical'` (executiveCommandEngine.ts:98) — a third taxonomy with no defined dot/label mapping.

**v1.1 change (§6.2-B, normative):** `critical` → red dot + "Critical" (`bg-red-500`/`text-red-700`); `high` → amber dot + "Warning" (`bg-amber-500`/`text-amber-700`) — consistent with the hub's canonical taxonomy (P0-A philosophy). Sort: critical first, then high, then `createdAt` desc. Rows carry `data-priority` for testability; IH-13–18 assert both renderings and ordering; AC-02 updated.

---

## REVIEW SECONDARY FINDINGS APPLIED

| Finding | v1.1 change |
|---|---|
| `auditRef` listed in Event Detail metadata but absent from `ActivityEvent` (review doctrine-table caveat) | Metadata contract rewritten against the real interfaces: `ActivityEvent` (id, type, priority, sourceType, sourceId, sourceRoute, jobId, actor, actionRequired — **no auditRef**) and `Notification` fields enumerated; bus block fields taken from `BusEventRecord` (§10.5). |
| `/notifications` declared early in the route tree (App.tsx:151), far from the redirect block | Ordering note added to §5.2/§7.2/P1-1: role-aware replacement installs at the existing declaration position; first-match-wins respected. |
| Blueprint drift (`getRecentEvents()` doesn't exist; missing Sync chip in Blueprint 6.6 wireframe) | Recorded as front-matter errata so future sessions don't "fix" the spec back toward the blueprint. |
| Hub audit recorders living in `analyticsEngine.ts` conceptually misplaced for a second hub | Kept for UX-4 consistency; `analyticsEngine.ts` formally designated the "hub audit host" with a required code comment (§2.4, §7.2). |
| Tab-thrash audit volume (recorders fire per activation) | Documented as doctrine-safe (more audit, never less); tests must assert presence/ordering, never exact counts (§10.6, §13.3, AC-10, P0-4). |
| v1.0 §10.5 mapped a nonexistent "workflow" notification-type family | Notification type→category mapping rewritten as a **total** mapping over all six real `NotificationType` values (review_required→Operational, automation_alert→Automation, governance_action→Governance, sync_failure→Sync, financial_control→Financial, exception_event→Financial); the "unmatched types appear under All only" clause removed as unreachable (§10.5). |

---

## REJECTED / NOT ADOPTED (with rationale)

| Recommendation | Disposition |
|---|---|
| P0-B option (i) — inject bus-only seed records into the Activity list under the toggle | **Not adopted.** The amendment directive locks option (ii) (hidden route). Option (i) would also cut against the Event Bus Doctrine's seed-suppression note (canonical context: bus seed events are deliberately kept out of the activity stream) and would re-introduce raw bus internals into a primary surface that Decision 9 demotes. The hidden route preserves 100% of the data with zero doctrine tension. |
| Deriving "Last Workflow Run" from `workflowEngine.getAllWorkflows()` max-`lastExecutedAt` | **Not adopted.** A max-over-collection derivation is exactly the "derived value relying on undocumented assumptions" class P0-C prohibits. Replaced with `activeWorkflows`, a first-class field of an already-named API. Recorded so a future phase may add a properly-specified timestamp tile if wanted. |
| Treating AF-08 as fixable via seed-date re-anchoring within UX-5 | **Not adopted as mandatory.** AF-08's target element is retired with the legacy KPI strip, so the test is retired rather than repaired; seed re-anchoring survives only as optional data hygiene (P2-2). This is the only change to the known-failure ledger semantics, and it is documented in §13.5 and AC-15. |

Every other review recommendation was adopted in full.

---

## FILES CHANGED IN THIS AMENDMENT SESSION

| File | Action |
|---|---|
| `docs/specifications/UX-5-INTELLIGENCE-HUB-SPECIFICATION-v1.1.md` | Created — amended, frozen specification |
| `docs/specifications/UX-5-INTELLIGENCE-HUB-AMENDMENT-SUMMARY.md` | Created — this document |
| `docs/specifications/UX-5-INTELLIGENCE-HUB-SPECIFICATION.md` | Unchanged — v1.0 retained for audit trail (UX-4 precedent) |

No source code, routes, tests, or engine files were modified. No implementation has begun.

---

## IMPLEMENTATION READINESS

- **Readiness:** **97%** (was 90%). Residual 3% is ordinary implementation uncertainty: extraction unknowns inside the 1,098-line `reporting-centre.tsx` (mitigated by the UX-4 playbook) and the ~74-test rewrite volume (gated daily).
- **Open questions:** **None.** OQ-1–OQ-4 and NQ-1–NQ-4 all resolved and locked in v1.1.
- **P0 blockers:** **Zero.** P0-A (§10.5), P0-B (§5.2/§6.6), P0-C (§10.1) each resolved normatively; all five P1 findings resolved.
- **Recommendation:** **Proceed to implementation** against v1.1 on branch `feature/ux5-intelligence-hub`, following the §16 five-day plan with §13.5 daily regression gates. Expected end state: build PASS, full Playwright run with **zero failures** (AF-08 retired, NC-25 fixed), all doctrines preserved.

> **"The UX-5 Intelligence Hub specification is frozen and implementation-ready."**
