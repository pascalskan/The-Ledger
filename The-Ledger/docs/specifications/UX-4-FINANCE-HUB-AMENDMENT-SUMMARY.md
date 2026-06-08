# THE LEDGER — UX-4 FINANCE HUB
## Amendment Summary: v1.0 → v1.1

**Date:** June 6, 2026
**Input:** UX-4-FINANCE-HUB-SPECIFICATION v1.0 + UX-4-FINANCE-HUB-REVIEW.md
**Output:** UX-4-FINANCE-HUB-SPECIFICATION v1.1

---

## DECISIONS RESOLVED

| Decision | v1.0 Status | v1.1 Resolution |
|---|---|---|
| OD-1 — PM invoice access | BLOCKING — unresolved | **Option A selected.** PM access to `/invoices`, `/invoice-builder`, `/invoices/:id` revoked. See §4 of v1.1. |
| OD-2 — Finance Overview period | Unresolved (recommended: Current Month) | **Current Month.** Period label required on all KPIs. |
| OD-3 — Invoice Builder rendering | Unresolved (recommended: Sheet) | **`<Sheet>` slide-over.** `InvoicingHub` uses shadcn Sheet triggered by "+ Create Invoice". |

---

## P0 CORRECTIONS APPLIED

### C-01 — Wouter `setLocation` Replace Semantics Fixed

**Review finding:** AR-F-001 — `{ replace: true }` is not a valid Wouter 3.x `setLocation` argument; silently ignored, causes pushState instead of replaceState, creating a browser Back button redirect trap.

**v1.0 code (broken):**
```tsx
setLocation(`/finance${qs}`, { replace: true });
```

**v1.1 code (correct):**
```tsx
// Synchronous redirect in render body — matches ProtectedRoute pattern (lines 86–88)
// Do NOT use useEffect — it creates a blank frame and races with auth checks
setLocation(`/finance${qs}`);
return null;
```

Also removed `useEffect` wrapper from `RedirectToFinance`. Pattern now matches the existing codebase convention.

---

### C-02 — `<Layout>` Removal Explicitly Stated in §2.3

**Review finding:** AR-F-004 — Spec instructed content extraction but never stated `<Layout>` must be removed. Engineers following the spec literally would produce a double sidebar.

**v1.1 change:** §2.3 now reads:
> "REMOVE `<Layout>` from `[PageName]Content`. The hub provides `<Layout>` at the hub level. The extracted content component must not import or call `<Layout>`."

Stated once clearly with a verification note: "Verify each extraction by running the build and visually confirming no nested Layout before proceeding."

---

### C-03 — `InvoicingHub` Component Fully Defined

**Review finding:** AR-F-008 — `InvoicingHub` was referenced in the component hierarchy but never defined anywhere in the spec.

**v1.1 addition:** New §2.7 defines `InvoicingHub` completely:
- File: `client/src/components/finance/InvoicingHub.tsx`
- Props: none (reads URL `?filter=` param)
- State: local `useState` for Sheet open/closed
- Renders: `InvoicesContent` + status filter tabs + Sheet wrapping `InvoiceBuilderContent`
- `InvoicesContent` accepts optional `statusFilter?: string` prop
- `InvoiceBuilderContent` accepts optional `onComplete?: () => void` prop
- Added as new file in Quick Reference and Appendix A

---

### C-04 — `financial-explorer.tsx` Internal Tab Duplication Resolved

**Review finding:** AR-F-005 / PM-F-003 — `financial-explorer.tsx` contains `AccountingSyncTab`, `ReconciliationTab`, and `ExceptionsTab`. When extracted as Records tab content, these co-exist with the Accounting tab — creating two independent state surfaces for the same operational data. Spec incorrectly deferred this as "post-merge cleanup."

**v1.1 change:**
- §2.11 added: explicit instruction to remove `AccountingSyncTab`, `ReconciliationTab`, `ExceptionsTab` from `FinancialRecordsContent` as part of UX-4
- Records tab now contains **7 sub-tabs** (not 10): Timesheets / Expenses / Inventory / Equipment / Invoice Pipeline / Margin Intelligence / Forecast
- New tests FH-29 and FH-30 verify this explicitly
- Spec states: "Must be resolved before UX-4 ships, not deferred"

---

### C-05 — Exposure KPI Source Resolved

**Review finding:** DG-F-002 — "`forecastEngine` OR `financialControlsEngine`" is ambiguous. `financialControlsEngine` has no exposure data. `forecastEngine` has two candidates with incompatible semantics (one is a workflow fact; one is a projection requiring "Advisory Only" label).

**v1.1 resolution:** §2.8 now specifies:
- Source: `getPendingExposure()` from `profitabilityEngine`
- Returns: `PendingExposure` with `totalPendingCost`, `pendingItemCount`, `isEstimate: true`
- This is a **workflow state fact** — not a forecast projection
- Label regime: "Pending Approval" + "As of [HH:MM]" timestamp (no "Advisory Only" required)
- `forecastEngine.computePortfolioForecast().totalExposure` explicitly excluded with note explaining it is a projection

---

### C-06 — Regression File List Expanded to 14, Sequenced to Day 1

**Review finding:** PM-F-002 / PM-F-004 — Spec named 6 regression files; actual count is 14+. Regression updates were sequenced to Day 6 while nav items are removed on Day 1 — breaking CI for the entire implementation window.

**v1.1 changes:**
- §7.5 expanded from 6 to 14 files — added: `payroll-export.spec.ts`, `activity-feed.spec.ts`, `event-bus.spec.ts`, `executive-command-centre.spec.ts` (ECC-21/22/27), `margin-intelligence.spec.ts`, `revenue-normalization.spec.ts`, `accounting-sync.spec.ts`, `accounting-settings.spec.ts` (top-level)
- §8.2 Day 1 now includes all 14 regression file updates
- Commit note: "All regression updates in same commit as nav item removal — CI must be green before EOD 1"

---

### C-07 — Option A PM Invoice Link Sites Enumerated in Appendix A

**Review finding:** RB-F-001 — Under Option A, three PM-facing invoice link sites were absent from Appendix A: `layout.tsx` OPERATIONAL_ITEMS, `job-detail.tsx` line 212, `job-detail.tsx` line 363.

**v1.1 changes:**
- §4.4 "Option A — Full Impact" table added listing all three file + line locations
- `dashboard.tsx` and `job-detail.tsx` added to Appendix A with explicit change instructions
- `job-detail.tsx`: "Remove 'View Invoice' button (line 212) and 'Invoice Builder' button (line 363)"

---

### C-08 — Option B Conflict Resolved (Option A Selected)

**Review finding:** RB-F-002 — Under Option B, the unconditional `/invoices` redirect (at `roles: ["CEO"]`) silently breaks PM access because Wouter first-match-wins would deny PMs before reaching the PM-accessible route.

**v1.1 resolution:** Option A is selected — no Option B exists. All redirect routes for `/invoices`, `/invoice-builder`, `/invoices/:id` carry `roles: ["CEO"]`. The Option B redirect ordering conflict is moot.

---

## P1 CORRECTIONS APPLIED

### C-09 — `/invoices/:id` Route Addressed

**Review finding:** PM-F-005 — `/invoices/:id` was absent from the redirect table and not addressed under Option A.

**v1.1 changes:**
- Added to redirect table: `/invoices/:id` → `/finance?tab=invoicing` (roles: ["CEO"])
- Added to §4.4 Option A impact table
- `invoices/:id` route in App.tsx changed to `roles: ["CEO"]`
- Note added: CEO clicking an invoice row from within the Finance Hub Invoicing tab navigates to `/invoices/:id`, which redirects back to `/finance?tab=invoicing`

---

### C-10 — Engine Files and ECC/AF/EB Tests Added to Appendix A

**Review finding:** PM-F-006 — 5 engine files + 2 component files contained hardcoded legacy route strings; their associated doctrine tests would fail because they assert the final URL (which changes from legacy route to Finance Hub route).

**v1.1 changes:**
- §2.4 now contains a complete `sourceRoute` update table covering all 16 string replacements across 7 files
- `notificationEngine.ts`, `activityFeedEngine.ts`, `eventBusEngine.ts`, `executiveCommandEngine.ts`, `analyticsEngine.ts`, `ExceptionsTab.tsx`, `JobExceptionPanel.tsx` added to Appendix A
- `activity-feed.spec.ts`, `event-bus.spec.ts`, `executive-command-centre.spec.ts` (ECC-21/22/27) added to §7.5 regression plan
- Note added: "Deep-link assertions that previously matched `/financial-explorer` must now match `/finance?tab=records`"

---

### C-11 — `dashboard.tsx` Added to Appendix A with CTA Update Instructions

**Review finding:** RB-F-004 — `dashboard.tsx` was absent from Appendix A. The Revenue at Risk CTA navigates to `/invoices` — the redirect discards query params, losing the `filter=overdue` value the CEO workflow depends on.

**v1.1 changes:**
- `dashboard.tsx` added to Appendix A
- §2.4 specifies: line 282 → `setLocation('/finance?tab=invoicing&filter=overdue')` (direct navigation, not redirect-dependent)
- §2.4 specifies: line 484 → `setLocation('/finance?tab=records')`

---

### C-12 — testId `kpi-card-outstanding-invoices` Corrected

**Review finding:** PM-F-008 — testId `kpi-card-outstanding-invoices` described a different metric than the KPI it named ("Exposure / Pending Approval").

**v1.1 changes:**
- All occurrences updated: `kpi-card-outstanding-invoices` → `kpi-card-exposure`; `kpi-value-outstanding-invoices` → `kpi-value-exposure`
- §6.3, §7.4 updated
- KPI strip now split into two testId groups: `finance-kpi-strip-approved` (3 cards) and `finance-kpi-strip-pending` (Exposure card)

---

### C-13 — Correct Function Reference for Job Profitability

**Review finding:** DG-F-006 — `profitabilityEngine.getJobProfitability()` does not exist.

**v1.1 change:** §2.8 specifies: `getAllJobMargins(useStore().jobs).slice(0, 4)` — sorted by `hasActivity` first, then margin descending. This is the correct function confirmed from `profitabilityEngine.ts`.

---

### C-14 — `groupTimesheetsForPayroll()` Approval Array Specified

**Review finding:** DG-F-009 — Function contains no internal approval filter; wrong caller argument silently corrupts the KPI.

**v1.1 change:** §2.8 explicitly states: "Must use `useStore().timesheets` (the approved array) — NOT ReviewItem queue data. The function contains no approval filter; the caller must pass approved records only." Added as G-011 in §3.4.

---

### C-15 — Query-Level Approval Enforcement Requirement Added

**Review finding:** DG-F-001 — "Costs Approved" lacks an explicit query-level enforcement guarantee; relies on population convention.

**v1.1 change:** §3.6 added: "All KPIs labelled 'Approved' must enforce approval status at the query or population level. This requirement carries forward to the backend implementation specification as an explicit `WHERE status = 'approved'` predicate."

---

### C-16 — Audit Events for Accounting Tab and Exceptions Sub-Tab

**Review finding:** DG-F-004 / DG-F-008 — The spec incorrectly stated "tab switching does not require audit records." The Accounting tab and Exceptions sub-tab are financially sensitive surfaces that warrant access audit events.

**v1.1 change:** §3.5 amended:
- Added: `finance_hub_accounting_tab_viewed` (Accounting tab activates)
- Added: `finance_hub_exceptions_viewed` (Exceptions sub-tab activates)
- Updated: "Tab switching does NOT require audit records — EXCEPT transitions to the Accounting tab and the Exceptions sub-tab within it."
- §8.2 Day 5 includes these audit event implementations

---

### C-17 — Revenue KPI References Job Attribution

**Review finding:** DG-F-003 — Platform-wide Revenue aggregate without visible job attribution reference creates a presentation that could be read in isolation from job context.

**v1.1 change:**
- §3.4 G-003 added: Revenue KPI card must include "Across N active jobs" sub-label with scroll-to or link to Job Profitability panel
- §6.3 updated with implementation code showing the attribution button
- §1.6 user story added: "As CEO, Revenue KPI references its job attribution"
- Test FH-13 added to verify this

---

### C-18 — PM Notification Deep-Link Collision Documented

**Review finding:** RB-F-003 — PMs receive notifications whose `sourceRoute` values now point to CEO-only Finance Hub tabs; PM clicking a deep-link receives UnauthorizedPage.

**v1.1 change:** §4.6 added — documents this as a "known accepted limitation" with rationale and note that resolving it at the notification engine level is deferred. The behaviour is an improvement over the previous state (same UnauthorizedPage, but now at a more correct location).

---

### C-19 — `/expenses` Worker Access Documented

**Review finding:** RB-F-005 — `/expenses` is excluded from Finance Hub but carries no `roles` prop, meaning Workers can access it — potential doctrine tension not acknowledged.

**v1.1 change:** §4.7 added — acknowledges the pre-existing situation, confirms it is out of scope for UX-4, and defers it to an RBAC hardening phase. Appendix C adds it to deferred items.

---

### C-20 — Test Matrix Updated for Option A

**Review finding:** RB-F-008 — Under Option B, FH-38 would fail for PMs (which is correct Option B behaviour but produces a false regression signal). Under Option A, PM access tests are different.

**v1.1 change:** Since Option A is selected, tests FH-44/FH-45 (Option B PM access preservation tests) are not applicable. FH-02, FH-03, FH-05, FH-06, and FH-43 correctly verify PM and Worker denial. A new acceptance criterion added to §1.6: "PM cannot access legacy invoice routes — `/invoices`, `/invoice-builder`, `/invoices/:id` return UnauthorizedPage."

---

### C-21 — Exact Route Insertion Order Specified

**Review finding:** AR-F-007 — Spec said "declare redirect routes before existing routes" without providing the exact insertion order, which matters for Wouter first-match-wins with overlapping paths (`/payroll` vs `/payroll-export`; `/invoices` vs `/invoices/:id`).

**v1.1 change:** §2.4 provides the complete ordered route insertion list with comments, including the note: "`/invoices/:id` must be before `/invoices`; `/payroll-export` must be before `/payroll`."

---

### C-22 — Schedule Revised to 8 Days

**Review finding:** PM-F-009 — 6-day schedule underestimates `exception-resolution-center.tsx` complexity (808 lines), Day 5 Finance Overview scope, and test writing burden.

**v1.1 change:** §8.2 revised from 6 days to 8 days:
- Day 6 now dedicated to RBAC verification + full regression run
- Day 7 dedicated to writing all 43 new tests
- Day 8 for final verification, handoff, and PR
- Quick Reference updated: schedule = 8 days

---

## P2 CORRECTIONS APPLIED

### C-23 — ADMIN Discoverability Link Added to Day 1

**Review finding:** PM-F-010 — Accounting Settings discoverability fix was in the risk register but not in any implementation day.

**v1.1 change:** §2.4 `layout.tsx` changes now include adding an ADMIN deep-link pointer: `{ label: "Accounting Settings", href: "/finance?tab=accounting", ... }` with a `nav-admin-accounting-settings` testId. Added to §8.2 Day 1 tasks.

---

### C-24 — Structural Separator Between Approved KPIs and Exposure

**Review finding:** DG-F-005 — Amber text alone is insufficient to structurally separate the unapproved Exposure KPI from the three approved KPIs.

**v1.1 change:**
- §6.3 KPI strip redesigned with two named groups: "APPROVED" (3 cards, white background) and "PENDING APPROVAL" (1 card, amber-tinted background)
- Group labels render as `text-xs text-muted-foreground uppercase tracking-wide` headings
- §3.4 G-014 added formalising this requirement
- Wireframe in §5.2 updated to show the grouping

---

### C-25 — Sync Failure Urgency Thresholds Defined

**Review finding:** DG-F-007 — Sync failure count shown as neutral text without urgency escalation.

**v1.1 change:**
- §3.4 G-013 added with thresholds: 0 = green; 1–2 = amber with CTA to Sync Status; 3+ = red with CTA to Reconciliation Centre
- §6.5 status colour table updated with the three-tier threshold
- Test FH-17 added to verify colour coding

---

### C-26 — Sub-Tab State Reset Documented as Intentional

**Review finding:** AR-F-003 — Sub-tab state is lost when switching parent tabs; spec did not acknowledge this.

**v1.1 change:** §2.5 explicitly states: "Sub-tab state reset behaviour (intentional): Switching parent tabs resets the sub-tab to its default. Sub-tab position is NOT preserved across parent tab switches. Document this in the implementation comments." Also: the `defaultSub()` function is now fully defined in §2.5.

---

### C-27 — Sub-Tab Guard Failure Rendering Specified

**Review finding:** RB-F-006 — Spec required inner role checks in `PayrollHub` and `AccountingHub` but did not specify what to render on failure.

**v1.1 change:** §2.10 now specifies: "On role check failure: return `<UnauthorizedPage />` — matches outer `ProtectedRoute` behaviour."

---

### C-28 — Admin Role Gap Acknowledged

**Review finding:** RB-F-007 — Admin role receives UnauthorizedPage at `/finance` with no redirect; not acknowledged in RBAC table.

**v1.1 change:** §4.2 RBAC Role Review table includes Admin row: "UnauthorizedPage (no redirect). Acknowledged — pre-existing gap, not in scope for UX-4."

---

### C-29 — `filter=overdue` Deep-Link Specified and Tested

**Review finding:** PM-F-011 — CEO workflow described "Open Invoicing →" landing with Overdue filter but no specification or test existed for this.

**v1.1 change:**
- §2.9 CTA routing table specifies: `btn-open-invoicing` navigates to `setLocation('/finance?tab=invoicing')` (base case), or `setLocation('/finance?tab=invoicing&filter=overdue')` when `overdueCount > 0`
- `InvoicesContent` accepts `statusFilter` prop (§2.7)
- `InvoicingHub` reads `?filter=` from URL params and passes to `InvoicesContent`
- `dashboard.tsx` Revenue at Risk CTA updated to pass `filter=overdue` directly (C-11)

---

## ADDITIONAL CHANGES (not in original review)

### Scope Statement Corrected

v1.0 §1.5 stated "No modification to underlying page components" — contradicted by §2.3 which required structural refactoring. v1.1 §1.5 corrects this: "No modification to the business logic, data, or approval workflows of any existing page."

### Quick Reference Updated

All Quick Reference values updated to reflect v1.1: 3 new files (was 2), 22 modified files total, 14 regression files (was 6), 8-day schedule (was 6).

### Appendix C Added — Known Deferred Items

New appendix documents 4 deferred items so they are not lost: PM notification deep-link hardening, `/expenses` Worker access review, engine label cleanup in ECC/Analytics, and period selector for Finance Overview.

---

## SUMMARY STATISTICS

| Category | v1.0 | v1.1 |
|---|---|---|
| P0 blockers | 8 | 0 (all resolved) |
| P1 corrections | 14 | 0 (all applied) |
| P2 improvements | 7 | 0 (all applied) |
| Open decisions | 3 | 0 (all resolved) |
| New files | 2 | 3 (InvoicingHub added) |
| Modified files | 2 | 22 |
| Regression files | 6 | 14 |
| New tests | 43 | 43 |
| Schedule | 6 days | 8 days |
| Status | NOT APPROVED | ✅ APPROVED FOR IMPLEMENTATION |

---

## IMPLEMENTATION CHECKLIST

### Pre-Implementation Gate (must pass before branch creation)

- [ ] PR `feature/ux-phases-1-2-3` merged to main and CI green
- [ ] `git pull` on main; `npm run test` confirms 501/501 passing
- [ ] Playwright test audit complete: grep all 14 files in §7.5 for legacy route strings
- [ ] `useSearch` confirmed available in installed Wouter version (or fallback documented)
- [ ] Engine function signatures confirmed from `client/src/lib/` against §2.8 mapping table
- [ ] Option A decision recorded in commit description and handoff draft

### Day 1 Completion Gate

- [ ] `finance-hub.tsx` exists with 5-tab shell and placeholder tab content
- [ ] `/finance` route added to App.tsx (CEO only)
- [ ] 9 redirect routes added in correct order (§2.4)
- [ ] `/invoices`, `/invoice-builder`, `/invoices/:id` changed to CEO-only
- [ ] `layout.tsx` updated: 8 items removed, Finance nav added, ADMIN deep-link added, active state logic fixed
- [ ] `dashboard.tsx` both CTAs updated (lines 282, 484)
- [ ] `job-detail.tsx` invoice buttons removed (lines 212, 363)
- [ ] 16 engine/component `sourceRoute` strings updated (§2.4 table)
- [ ] All 14 regression test files updated (§7.5)
- [ ] Build passes: `npm run build` exits 0
- [ ] CI green: all 501 tests pass

### Day 2 Completion Gate

- [ ] `FinancialRecordsContent` extracted from `financial-explorer.tsx`
- [ ] `<Layout>` removed from `FinancialRecordsContent`
- [ ] `AccountingSyncTab`, `ReconciliationTab`, `ExceptionsTab` removed from `FinancialRecordsContent`
- [ ] Records tab renders 7 sub-tabs (verified visually and via build)
- [ ] `InvoicesContent` extracted (Layout removed, `statusFilter` prop added)
- [ ] `InvoiceBuilderContent` extracted (Layout removed, `onComplete` prop added)
- [ ] `InvoicingHub.tsx` created with Sheet, status filters, invoice list
- [ ] Records tab wired in `finance-hub.tsx`
- [ ] Invoicing tab wired in `finance-hub.tsx`
- [ ] No double sidebar on either tab (visual verification)
- [ ] FH-24, FH-25, FH-28, FH-29, FH-30, FH-31 pass

### Day 3 Completion Gate

- [ ] `PayrollProcessingContent` and `PayrollExportContent` extracted (Layout removed)
- [ ] `PayrollHub` built with status banner, 2 sub-tabs, inner CEO role check
- [ ] Payroll tab wired in `finance-hub.tsx`
- [ ] FH-26, FH-34, FH-35, FH-36 pass

### Day 4 Completion Gate

- [ ] `AccountingSettingsContent`, `ReconciliationContent`, `ExceptionResolutionContent` extracted (Layout removed)
- [ ] `AccountingHub` built with 4 sub-tabs, inner CEO role check
- [ ] Accounting tab wired in `finance-hub.tsx`
- [ ] Exception Resolution full workflow functional within Accounting → Exceptions sub-tab
- [ ] FH-27, FH-37, FH-38 pass

### Day 5 Completion Gate

- [ ] `FinanceHubOverview.tsx` created
- [ ] Engine function signatures confirmed in comment block at top of file
- [ ] Approved KPI group (3 cards): Revenue, Costs, Margin — with period label and Revenue attribution button
- [ ] Exposure card (Pending Approval group): amber styling, "Pending Approval" label, "As of [HH:MM]" timestamp
- [ ] Structural separator between Approved and Pending Approval groups (G-014)
- [ ] Job Profitability panel (top 4 from `getAllJobMargins().slice(0, 4)`)
- [ ] Invoice Status Summary (4 status rows from `useStore().invoices`)
- [ ] Payroll Status block (`groupTimesheetsForPayroll(useStore().timesheets)`)
- [ ] Accounting Status block (provider + sync KPIs + exception count with urgency colours)
- [ ] All 4 CTA deep-links functional (including conditional Exceptions routing)
- [ ] Audit events implemented: `finance_hub_viewed`, `finance_overview_viewed`, `finance_hub_deep_link_opened`
- [ ] Audit events in `finance-hub.tsx`: `finance_hub_accounting_tab_viewed`, `finance_hub_exceptions_viewed`
- [ ] FH-08–FH-21, FH-41, FH-42 pass

### Day 6 Completion Gate

- [ ] Full Playwright suite passes: all 501 baseline tests green
- [ ] CEO can access `/finance` (all 5 tabs)
- [ ] PM denied at `/finance` (UnauthorizedPage)
- [ ] PM denied at `/invoices`, `/invoice-builder`, `/invoices/:id` (UnauthorizedPage)
- [ ] Worker redirected to `/worker/jobs` from `/finance`
- [ ] `job-detail.tsx` shows no invoice buttons for PM
- [ ] Finance nav item: visible in CEO sidebar, absent from PM and Worker
- [ ] ADMIN deep-link pointer to Finance → Accounting visible
- [ ] All 9 legacy routes redirect to correct Finance Hub tabs

### Day 7 Completion Gate

- [ ] `tests/doctrine/finance-hub.spec.ts` written (FH-01–FH-06, FH-41–FH-43)
- [ ] `tests/finance-hub.spec.ts` written (FH-07–FH-40)
- [ ] All 43 new tests passing

### Day 8 — PR Gate (final)

- [ ] Full test suite: **501 + 43 = 544 tests passing, 0 failures**
- [ ] `docs/handoffs/ux4-finance-hub-handoff.md` complete
- [ ] `docs/ux/UX_REDESIGN_PROGRAMME.md` Section 9 tracker updated
- [ ] Branch: `feature/ux4-finance-hub` pushed to origin
- [ ] PR created with description referencing this specification
- [ ] **STOP** — await PR review and merge

---

## ✅ APPROVED FOR IMPLEMENTATION

UX-4-FINANCE-HUB-SPECIFICATION v1.1 is approved for implementation.
