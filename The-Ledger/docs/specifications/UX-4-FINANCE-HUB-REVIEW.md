# THE LEDGER — UX-4 FINANCE HUB
## Feature Review — Red-Team Challenge Report

**Document Type:** Feature Review — Authoritative
**Version:** 1.0
**Date:** June 6, 2026
**Status:** AMENDMENTS REQUIRED
**Reviewing:** UX-4-FINANCE-HUB-SPECIFICATION.md v1.0
**Pipeline:** ledger-product-manager · ledger-architect · ledger-financial-doctrine-guardian · ledger-rbac-workflow-auditor

---

## EXECUTIVE SUMMARY

The four-agent red-team pipeline found **6 P0 blockers, 14 P1 corrections, and 7 P2 improvements** across the specification. The spec is well-structured and doctrinal intent is sound, but it contains four categories of systemic defect that would produce guaranteed regressions if implementation were started from the current document:

1. **Architectural breakage** — `{ replace: true }` is not a valid Wouter argument (silent bug); content extraction must explicitly remove `<Layout>` from each page (not implied); `InvoicingHub` component is referenced but never defined; the `financial-explorer.tsx` internal tab duplication ships two independent state surfaces for the same operational data.

2. **Test/regression undercounting** — The spec names 6 regression files; the actual number confirmed against the codebase is 14+. Regression updates are sequenced to Day 6 but nav items are removed on Day 1, breaking CI from the start.

3. **RBAC P0 holes** — Under Option A: three PM invoice link sites (`layout.tsx`, `job-detail.tsx` ×2) are absent from Appendix A. Under Option B: the unconditional `/invoices` redirect silently breaks PM access. Both paths have a P0 defect depending on which option is chosen.

4. **Doctrine P0 violation** — The Exposure KPI data source is specified as "`forecastEngine` OR `financialControlsEngine`" — these are semantically incompatible sources. One (`forecastEngine.getPendingExposure()`) is a workflow fact; the other (`financialControlsEngine`) has no exposure data at all; the third (`forecastEngine.computePortfolioForecast().totalExposure`) is an advisory projection requiring an "Advisory Only" label. The ambiguity is a Financial Integrity + Analytics Doctrine violation.

**Verdict:** The specification is **NOT APPROVED** in its current form. It requires an amendment pass before implementation may begin. The amendments are enumerated in full below. No redesign is required — every correction is targeted and non-disruptive to the overall architecture.

---

## SECTION 1 — FINDINGS

### 1.1 Product Manager Findings

**PM-F-001 — Scope Contradiction: §1.5 says "no modification to underlying pages" but §2.3 requires structural refactoring of all 8**
The scope exclusion statement must accurately reflect that content extraction is an in-scope structural change to existing page components — the "no modification" wording applies to business logic and data, not to file structure.

**PM-F-002 — Regression File Count is Wrong: 6 listed, 14+ confirmed** *(P0)*
Confirmed additional regression files not in §7.5: `tests/doctrine/payroll-export.spec.ts`, `tests/doctrine/activity-feed.spec.ts`, `tests/doctrine/event-bus.spec.ts`, `tests/doctrine/executive-command-centre.spec.ts` (ECC-21/22/27 assert legacy route URLs), `tests/doctrine/margin-intelligence.spec.ts`, `tests/doctrine/revenue-normalization.spec.ts`, `tests/doctrine/accounting-sync.spec.ts`, top-level `tests/accounting-settings.spec.ts`. These files all navigate to legacy routes or assert on legacy URLs. If only 6 are updated, CI fails from Day 1 onward.

**PM-F-003 — `financial-explorer.tsx` Tab Duplication Deferred Incorrectly** *(P0)*
`financial-explorer.tsx` contains `AccountingSyncTab`, `ReconciliationTab`, and `ExceptionsTab` as sub-tabs. When extracted as `FinancialRecordsContent` and mounted in the Records tab, those three tabs co-exist alongside the Finance Hub's Accounting tab — creating two independent state surfaces for the same operational capability. This is not a cosmetic issue. The two surfaces have independent `useState` instances; an action in one (e.g., a reconciliation retry) is not reflected in the other. This violates the principle that every financially relevant action be traceable to a single authoritative surface. The duplication must be resolved before UX-4 ships, not deferred.

**PM-F-004 — Day 1 Sequencing Breaks CI for 5 Days** *(P0)*
Removing 8 nav items on Day 1 while deferring regression test updates to Day 6 leaves the test suite in a broken state for the entire implementation window. Day 1 must include updating all regression test files, or the regression updates must precede the nav item removal.

**PM-F-005 — `/invoices/:id` Route Not Addressed** *(P0)*
`invoices.tsx` navigates to `/invoices/${id}` on row click. This route is not in the redirect table, not mentioned in Appendix A, and not handled under either Option A or Option B. CEO clicking an invoice row from within the Finance Hub Invoicing tab navigates away from the hub entirely. Under Option A, PM hitting a `/invoices/:id` link (e.g., from `job-detail.tsx`) lands on `UnauthorizedPage`. This must be resolved.

**PM-F-006 — Notification/Activity/ECC Engine Route Hardlinks Not Addressed** *(P1)*
`notificationEngine.ts`, `activityFeedEngine.ts`, `eventBusEngine.ts`, `executiveCommandEngine.ts`, `analyticsEngine.ts`, `ExceptionsTab.tsx`, and `JobExceptionPanel.tsx` all contain hard-coded legacy route strings (`/financial-explorer`, `/reconciliation-center`, `/exception-resolution-center`). After UX-4, these routes redirect to the Finance Hub. The redirects will function for navigation, but the affected doctrine tests (`activity-feed.spec.ts`, `event-bus.spec.ts`, `executive-command-centre.spec.ts` ECC-21/22/27) assert on the final URL — which will now be `/finance?tab=...`, not the legacy route. These tests will fail even when behaviour is correct. Appendix A must include these engine files and the associated test updates.

**PM-F-007 — OD-1 Downstream Effects on PM Experience Not Fully Modelled** *(P1)*
Under Option A, PMs lose invoice access with no described fallback state. Under Option B, PM route ordering must be specified to prevent the redirect from intercepting PM `/invoices` traffic. Neither option's full downstream consequences are enumerated. §4.5 must describe the complete file impact for each option before the decision is made.

**PM-F-008 — KPI testId `kpi-card-outstanding-invoices` Contradicts the KPI it Names** *(P1)*
§7.4 names the fourth KPI card testId `kpi-card-outstanding-invoices`. Every other part of the spec names it "Exposure (Pending Approval)" sourced from the pending-records engine. "Outstanding Invoices" and "Pending Approval Exposure" are different metrics. The testId must be corrected to `kpi-card-exposure`.

**PM-F-009 — 6-Day Schedule is Underestimated for Scope Described** *(P1)*
`exception-resolution-center.tsx` is 808 lines with inline modal state management. Day 4 assigns its extraction alongside two other pages. Day 5 assigns the Finance Overview (7 engine calls, 28+ testIds, 4 sub-components) to a single day. Day 6 assigns 43 new tests + 14+ regression updates. A realistic schedule is 8–10 days. The implementation plan must be revised.

**PM-F-010 — Accounting Settings Discoverability Fix Missing from Implementation Plan** *(P1)*
UX risk UX-4-R4 notes that Accounting Settings must have a redirect link added in the ADMIN section for discoverability. This work item does not appear in any implementation day. It must be added to Day 1.

**PM-F-011 — "Open Invoicing →" CTA Filter Deep-Link Unspecified and Untested** *(P2)*
§5.6 CEO workflow describes "Open Invoicing →" landing with the Overdue filter pre-applied. This requires the CTA to navigate to `?tab=invoicing&filter=overdue`, not just `?tab=invoicing`. The CTA testId `btn-open-invoicing` and test FH-16 only verify tab navigation, not filter state. Either the filter deep-link is specified and tested, or removed from the workflow narrative.

**PM-F-012 — No Test Verifies Sub-Tab Navigation from Overview CTAs** *(P2)*
The CEO workflow (§5.6 Step 4) describes "Open Accounting →" landing on the Exceptions sub-tab when exceptions exist. Test FH-18 only verifies arrival at the Accounting tab. No test verifies the sub-tab is correctly selected. Either prescribe this behaviour with a test, or remove it from the workflow narrative.

---

### 1.2 Architecture Findings

**AR-F-001 — `{ replace: true }` is Not a Valid Wouter `setLocation` Argument** *(P0)*
Wouter 3.x `setLocation` accepts a single string argument. The `{ replace: true }` option object is a React Router concept silently ignored by Wouter, making every redirect a `pushState` instead of `replaceState`. A CEO navigating to `/payroll` and pressing Back lands back on `/payroll`, triggering another redirect — creating a navigation trap. The correct Wouter pattern for replace-navigation must be substituted before implementation.

**AR-F-002 — `RedirectToFinance` Uses `useEffect` Pattern — Blank Frame + Auth Race** *(P1)*
The `return null; useEffect(() => setLocation(...))` pattern renders a blank frame before redirecting, and races with `ProtectedRoute`'s own `useEffect`-based auth check. The established codebase pattern for redirects is synchronous: `setLocation("/worker/jobs"); return null` in the render body (see `ProtectedRoute` lines 86–88). `RedirectToFinance` must follow this pattern.

**AR-F-003 — Sub-Tab State Lost on Parent Tab Round-Trip** *(P1)*
`handleTabChange(tab)` writes `?tab=${tab}` with no `?sub=`. A CEO on Payroll → Export sub-tab who clicks Accounting and returns finds themselves on Payroll → Processing (the default). This is a context loss the spec does not acknowledge. Either document it as intentional or prescribe per-tab sub-state preservation.

**AR-F-004 — Content Extraction Must Explicitly Remove `<Layout>` — Spec Does Not State This** *(P0)*
`reconciliation-center.tsx`, `exception-resolution-center.tsx`, `payroll.tsx` and the other 5 pages all call `<Layout>` internally. The spec instructs named export extraction but does not specify that `<Layout>` must be removed from the extracted component. An engineer following the spec literally will produce a double sidebar on every tab. §2.3 must explicitly state: "Remove the `<Layout>` wrapper from each extracted content component."

**AR-F-005 — `financial-explorer.tsx` Overlap Ships Two Independent Operational State Surfaces** *(P0)*
`financial-explorer.tsx` contains `AccountingSyncTab`, `ReconciliationTab`, and `ExceptionsTab` as sub-tabs at lines 154–165. When mounted as `FinancialRecordsContent` in the Records tab, the CEO simultaneously has reconciliation and exception data in the Records tab (from lightweight summary components) and in the Accounting tab (from the full operational pages). Both have independent `useState` instances over the same seed data. An action in one is not reflected in the other. This is not a cosmetic issue — it violates operational integrity for financially sensitive surfaces. Must be resolved, not deferred.

**AR-F-006 — `useSearch()` Stale Frame is Known Wouter Behaviour** *(P2)*
After `handleTabChange` calls `setLocation`, `useSearch()` reflects the new value only after the next render. Do not read `activeTab` synchronously after calling `handleTabChange` within the same event handler. Document as a known characteristic.

**AR-F-007 — Route Ordering: Exact Insertion Position Not Specified** *(P1)*
The spec says redirect routes must be declared before existing routes, but does not provide the exact ordered list of insertions into App.tsx's 40+ route `<Switch>`. The order matters: `/payroll-export` redirect must appear before the `/payroll` redirect to prevent the shorter path from matching first. The spec must provide the exact ordered insertion list.

**AR-F-008 — `InvoicingHub` Component Referenced but Never Defined** *(P0)*
§2.6 component hierarchy references `<InvoicingHub>` as the Invoicing tab content. §2.3 only extracts `InvoicesContent` and `InvoiceBuilderContent`. `InvoicingHub` — the composition layer that wraps them, manages status-filter sub-state, and renders the `<Sheet>` Invoice Builder — is never defined. Its file location, props interface, and sub-state management are entirely absent from the spec.

**AR-F-009 — Exposure KPI Data Source: `financialControlsEngine` Has No Exposure Data** *(P1)*
The spec's "`forecastEngine` OR `financialControlsEngine`" source list for the Exposure KPI is incorrect. A search of `financialControlsEngine.ts` confirms it contains no exposure field. `forecastEngine` has two candidate sources with different semantics (see DG-F-002 below). The "or" must be replaced with a specific function and field name.

---

### 1.3 Financial Doctrine Findings

**DG-F-001 — "Costs Approved" Lacks Query-Level Enforcement Guarantee** *(P1)*
`getJobFinancialSummary()` contains no explicit `approvalStatus` filter — it relies on population convention (only approved records ever exist in `mockTimesheets`). This is safe in the prototype but fragile. The spec must require that all "approved" KPIs use data sources that enforce approval status at the query level, not by population trust. This requirement must carry forward to the backend specification.

**DG-F-002 — Exposure KPI Source Ambiguity: Financial Integrity + Analytics Doctrine Violation** *(P0)*
The spec says Exposure sources from "`forecastEngine` OR `financialControlsEngine`". These are not equivalent:
- `forecastEngine.getPendingExposure()` — workflow state snapshot of pending approval items. This is a **fact**. Label: "As of [timestamp]". No advisory label required.
- `forecastEngine.computePortfolioForecast().totalExposure` — exposure weighted at 85% realisation factor. This is a **projection**. Must carry "Advisory Only" under the Analytics Doctrine.
- `financialControlsEngine` — has no exposure data. Cannot be used.

The spec must select one source, specify the exact function and field, and assign the correct label regime. Using an advisory-projection source without an advisory label is a doctrine violation. Using a fact-source without the correct period label is a Financial Integrity risk.

**DG-F-003 — Platform-Wide Revenue KPI Must Reference Job Attribution** *(P1)*
The Job Attribution Doctrine requires all financial reporting to be job-centric. A platform-wide "Revenue Recognised" aggregate is permissible at command-layer surfaces (consistent with ECC precedent) but only if the display explicitly surfaces the job-level decomposition. The Revenue KPI must include a visible "See by job" link or indicator referencing the Job Profitability panel below. It must not be readable as a standalone unattributed figure.

**DG-F-004 — No Audit Event for Accessing Financially Sensitive Sub-Tabs** *(P1)*
The spec states "tab switching does not require audit records." This is incorrect for transitions to the Exceptions sub-tab within the Accounting tab — which hosts the Exception Resolution Centre, a surface where CEO overrides of approved financial records occur. The Finance Hub must emit `finance_hub_accounting_tab_viewed` when the Accounting tab activates, and `finance_hub_exceptions_viewed` when the Exceptions sub-tab activates. These are in addition to action-level events fired by the embedded pages.

**DG-F-005 — No Visual Structural Separator Between Approved KPIs and Exposure** *(P2)*
Amber text + "Pending Approval" label is the specified treatment for Exposure. However, the amber card appears in the same visual register as the three approved-figure cards. A structural separator (group label "Approved" / "Pending", or a card background variation) would provide stronger doctrine protection against a CEO inadvertently grouping Exposure with approved figures in a mental financial statement.

**DG-F-006 — `profitabilityEngine.getJobProfitability()` Does Not Exist** *(P1)*
A search of `profitabilityEngine.ts` confirms no function named `getJobProfitability()`. The available functions are `getProfitabilityMetrics(jobId)`, `getAllJobMargins(jobs, targetMarginPercent)`, `getPendingExposure()`, `getJobInvoiceReadiness()`, and `groupTimesheetsForPayroll()`. The likely correct source is `getAllJobMargins()` sliced to the top 4. The spec must reference the actual function name and confirm the sort order.

**DG-F-007 — Sync Failure Count Displayed Without Urgency Thresholds** *(P2)*
A growing sync failure count presented as plain informational text (no amber/red escalation, no minimum urgency CTA) could cause a CEO to normalise failures. The spec must define display thresholds: 0 = green; 1–2 = amber with CTA; 3+ = red with CTA directly to Reconciliation Centre.

**DG-F-008 — Embedded Pages' Audit Events in Tab Context Undefined** *(P1)*
`reconciliation-center.tsx` and `exception-resolution-center.tsx` do not fire access audit events on mount — they audit only on action. The Finance Hub introduces a new rendering context for these pages. The spec must define audit event ownership: Finance Hub fires access events when tabs activate; embedded pages continue to fire action events. Without this, access to these sensitive surfaces from within the hub is not audited.

**DG-F-009 — `groupTimesheetsForPayroll()` Approval Filter is Caller's Responsibility — Not Specified** *(P1)*
`groupTimesheetsForPayroll()` accepts any `TimesheetEntry[]` array with no internal approval status filter. The spec does not specify that this function must be called with the approved TimesheetEntry array (`mockTimesheets`) and not with ReviewItem queue data. If an implementer passes the wrong array, the Payroll KPI includes unapproved labour — a label accuracy violation.

---

### 1.4 RBAC Findings

**RB-F-001 — Option A: Three PM Invoice Link Sites Missing from Appendix A** *(P0)*
The spec says "remove any PM-facing invoice links" under Option A, but does not enumerate them. Three confirmed sites absent from Appendix A:
- `client/src/components/layout.tsx` lines 302–303 — `OPERATIONAL_ITEMS` entries for Invoices and Invoice Builder with `roles: ["CEO", "Project Manager"]`
- `client/src/pages/job-detail.tsx` line 212 — `setLocation('/invoices/${existingInvoice.id}')` — "View Invoice" button
- `client/src/pages/job-detail.tsx` line 363 — `setLocation('/invoice-builder')` — "Invoice Builder" button

Without updating these, PM nav items point to revoked routes and PM users hit `UnauthorizedPage` from a page they legitimately access (`job-detail.tsx`).

**RB-F-002 — Option B: Unconditional Redirect Breaks PM `/invoices` Access** *(P0)*
The spec adds the `/invoices` redirect route (at `roles: ["CEO"]`) before the existing PM-accessible `/invoices` route in the Switch. Wouter first-match-wins means the CEO-only redirect fires for PM users too. The PM is denied and lands on `UnauthorizedPage`. Under Option B, the `/invoices` and `/invoice-builder` redirect routes must either be omitted, role-conditional, or ordered after the existing PM route.

**RB-F-003 — PM Notification Deep-Links to Redirected Routes Produce `UnauthorizedPage`** *(P1)*
`notificationEngine.ts` stores `sourceRoute` values including `/financial-explorer`, `/exception-resolution-center`, and `/reconciliation-center`. After UX-4, these routes redirect to CEO-only Finance Hub tabs. The Notification Centre is accessible to PMs. A PM clicking a notification deep-link to `/reconciliation-center` hits the CEO-only redirect and lands on `UnauthorizedPage`. The spec does not address PM notification deep-link behaviour post-redirect.

**RB-F-004 — `dashboard.tsx` Absent from Appendix A; `filter=overdue` Query Param Lost in Redirect** *(P1)*
`dashboard.tsx` line 282: `onAction={() => setLocation('/invoices')}` — Revenue at Risk CTA. The spec's CEO workflow (§5.6 Step 2) requires this to navigate to `?tab=invoicing&filter=overdue`. The redirect from `/invoices` to `/finance?tab=invoicing` does NOT propagate query parameters — the filter is silently dropped. `dashboard.tsx` must be added to Appendix A with an explicit instruction to update the CTA to `setLocation('/finance?tab=invoicing&filter=overdue')`. Line 484's `setLocation('/financial-explorer')` similarly needs updating.

**RB-F-005 — `/expenses` Worker Access Not Acknowledged** *(P1)*
`App.tsx` declares `/expenses` as a `ProtectedRoute` with no `roles` prop — allowing any authenticated user including Workers. `layout.tsx` confirms Workers are included in `/expenses` nav visibility. The CLAUDE.md doctrine states "Workers never receive financial visibility." The spec excludes `/expenses` from Finance Hub consolidation but does not acknowledge this pre-existing tension. The spec must either document this as an intentional operational exception or flag it as a known pre-existing violation.

**RB-F-006 — Sub-Tab Guard Failure Mode Unspecified** *(P2)*
§4.6 requires inner role checks in `PayrollHub` and `AccountingHub` but does not specify what to render on failure. Recommended: match the outer `ProtectedRoute` pattern and return `<UnauthorizedPage />`.

**RB-F-007 — Admin Role Lands on `UnauthorizedPage` at `/finance` — Not Acknowledged** *(P2)*
`ProtectedRoute` only redirects Workers to `/worker/jobs`. Admin role users receive `UnauthorizedPage` with no navigation affordance. This is a pre-existing gap that UX-4 inherits. The spec should acknowledge it so the implementing agent does not attempt to solve it as part of UX-4.

**RB-F-008 — No PM-Under-Option-B Test in FH-01–FH-43** *(P1)*
FH-38 tests `/invoices` redirect (CEO path). Under Option B, FH-38 as written would correctly FAIL for PMs — which is the desired behaviour but produces a false regression signal. Required additions: FH-44 (PM navigates to `/invoices` → standalone PM invoice page, not hub); FH-45 (PM navigates to `/invoice-builder` → standalone page, not hub).

---

## SECTION 2 — REQUIRED CORRECTIONS

All P0 items must be resolved before the prerequisite checklist in §8.1 can be signed off. All P1 items must be resolved before implementation begins or committed on Day 1.

### P0 — Blockers (cannot implement until resolved)

| # | Source | Correction Required |
|---|---|---|
| C-01 | AR-F-001 | Remove `{ replace: true }` second argument from all `setLocation` calls in `RedirectToFinance`. Verify correct Wouter 3.3.5 replace-navigation API and prescribe it explicitly. |
| C-02 | AR-F-004 | Add to §2.3: "When extracting `[PageName]Content`, remove the `<Layout>` wrapper. The hub provides `<Layout>` at the hub level. The extracted content component must not import or call `<Layout>`." |
| C-03 | AR-F-008 | Add a full `InvoicingHub` component definition to the spec: file location, props interface (does it accept `activeSub` from the hub or manage its own state?), sub-tab structure, and how `<Sheet>` Invoice Builder is triggered. |
| C-04 | AR-F-005 / PM-F-003 | Resolve the `financial-explorer.tsx` internal tab duplication before UX-4 ships. Options: (A) remove `AccountingSyncTab`, `ReconciliationTab`, `ExceptionsTab` from `financial-explorer.tsx` in this branch; or (B) remove those sub-tabs from the Finance Hub Accounting tab and keep them only in Financial Explorer. Declare the chosen option explicitly. This cannot be deferred. |
| C-05 | DG-F-002 | Resolve Exposure KPI source ambiguity. Select one of: (A) `forecastEngine.getPendingExposure()` — workflow fact, label "As of [timestamp]"; (B) `forecastEngine.computePortfolioForecast().totalExposure` — projection, requires "Advisory Only" label. Specify exact import path and field name. Remove all "or" ambiguity. |
| C-06 | PM-F-002 / PM-F-004 | Expand §7.5 regression file list from 6 to 14+. Add: `payroll-export.spec.ts`, `activity-feed.spec.ts`, `event-bus.spec.ts`, `executive-command-centre.spec.ts`, `margin-intelligence.spec.ts`, `revenue-normalization.spec.ts`, `accounting-sync.spec.ts`, `accounting-settings.spec.ts` (top-level). Move regression update work to Day 1 (not Day 6). |
| C-07 | RB-F-001 | Under Option A: add to Appendix A — `layout.tsx` (remove `OPERATIONAL_ITEMS` entries for Invoices and Invoice Builder), `job-detail.tsx` (update or remove invoice/builder CTAs at lines 212 and 363). Specify the handling: remove the buttons, or replace with a message explaining CEO-only access. |
| C-08 | RB-F-002 | Under Option B: the `/invoices` and `/invoice-builder` redirect routes must NOT be added. The existing routes at `roles: ["CEO", "Project Manager"]` must be preserved. Update the redirect table in §1.6 to show conditional application by option. |

### P1 — Must address before implementation begins

| # | Source | Correction Required |
|---|---|---|
| C-09 | PM-F-005 | Address `/invoices/:id` route: add it to the redirect table or explicitly state it is not redirected and remains at its current RBAC. Specify what happens when CEO clicks an invoice row inside the Invoicing tab — does it navigate away from the hub? |
| C-10 | PM-F-006 | Add to Appendix A: `notificationEngine.ts`, `activityFeedEngine.ts`, `eventBusEngine.ts`, `executiveCommandEngine.ts` (update `sourceRoute` values to hub-equivalent routes). Add `tests/doctrine/activity-feed.spec.ts`, `tests/doctrine/event-bus.spec.ts`, `tests/doctrine/executive-command-centre.spec.ts` to regression update plan. |
| C-11 | RB-F-004 | Add `dashboard.tsx` to Appendix A. Instruction: update Revenue at Risk CTA at line 282 to `setLocation('/finance?tab=invoicing&filter=overdue')`. Update Financial Records CTA at line 484 to `setLocation('/finance?tab=records')`. The redirect does not propagate query parameters. |
| C-12 | PM-F-008 | Correct testId `kpi-card-outstanding-invoices` and `kpi-value-outstanding-invoices` to `kpi-card-exposure` and `kpi-value-exposure` throughout §6.3 and §7.4. |
| C-13 | DG-F-006 | Replace `profitabilityEngine.getJobProfitability()` with the correct function name. Confirm from the actual engine file — likely `getAllJobMargins(jobs).sort().slice(0, 4)`. Document the sort order (by margin descending or revenue descending). |
| C-14 | DG-F-009 | Specify that `groupTimesheetsForPayroll()` must be called with the approved `mockTimesheets` array, not the ReviewItem queue. Add as an implementation requirement in §2.7. |
| C-15 | DG-F-001 | Add a requirement note to §2.7 and §3.5: "All KPIs labelled 'Approved' must be sourced from data that enforces approval status at the query or population level. This requirement carries forward to backend implementation." |
| C-16 | DG-F-004 / DG-F-008 | Amend §3.4 Audit Requirements. Change "tab switching does not require audit records" to: "Tab switching to or from the Accounting tab generates `finance_hub_accounting_tab_viewed`. Activation of the Exceptions sub-tab generates `finance_hub_exceptions_viewed`. These are in addition to action-level events fired by embedded components." |
| C-17 | DG-F-003 | Revenue Recognised KPI must include a visible link or indicator referencing the Job Profitability panel (e.g., "Across N active jobs" as a sub-label with a scroll-to anchor or tab-navigate link). |
| C-18 | RB-F-003 | Address PM notification deep-link collisions. Options: (A) filter PM-visible notification types to exclude those whose `sourceRoute` maps to a CEO-only redirect; (B) add role-aware deep-link rendering in `notification-center.tsx` that suppresses "Go to Source" when destination is CEO-only; (C) document the behaviour explicitly as a known limitation. Whichever option: add to §4 RBAC section and Appendix A. |
| C-19 | RB-F-005 | Address `/expenses` Worker access in the spec. Either confirm it is an intentional operational exception to Worker financial-visibility doctrine (and document the rationale), or flag it as a pre-existing violation deferred to a separate phase. The spec must not silently omit it. |
| C-20 | RB-F-008 | Add FH-44 and FH-45 to §7 test matrix (conditional on Option B): FH-44 — PM navigates to `/invoices`, lands on standalone PM invoice page (not hub); FH-45 — PM navigates to `/invoice-builder`, similarly. |
| C-21 | AR-F-007 | Provide the exact ordered insertion list for all 8 legacy redirect routes in App.tsx, including their position relative to each other and to the existing routes. |
| C-22 | PM-F-009 | Revise implementation schedule from 6 days to 8–10 days. Expand Day 4 to accommodate `exception-resolution-center.tsx` complexity (808 lines). Add a dedicated day for full test authorship and regression updates. |

### P2 — Improvements (address before PR for quality)

| # | Source | Correction |
|---|---|---|
| C-23 | PM-F-010 | Add ADMIN redirect link task to Day 1 implementation plan (UX-4-R4 mitigation). |
| C-24 | DG-F-005 | Add a structural visual separator between the 3 approved KPI cards and the Exposure KPI card. Options: group label "Unapproved/Pending" or distinct card background. |
| C-25 | DG-F-007 | Define sync failure display thresholds: 0 = green; 1–2 = amber with CTA; 3+ = red with CTA to Reconciliation Centre. |
| C-26 | AR-F-003 | Document sub-tab state reset explicitly: "Switching parent tabs resets the sub-tab to its default. Sub-tab position is not preserved across parent tab switches. This is intentional." Or prescribe a `Record<string, string>` sub-state map if preservation is desired. |
| C-27 | RB-F-006 | Specify `PayrollHub` and `AccountingHub` inner role check failure state: render `<UnauthorizedPage />`, consistent with outer `ProtectedRoute`. |
| C-28 | RB-F-007 | Add a row to the RBAC compliance table for Admin: "Admin — `/finance`: UnauthorizedPage (no redirect). Pre-existing gap, not in scope for UX-4." |
| C-29 | PM-F-011 | Either specify the `?filter=overdue` deep-link on `btn-open-invoicing` CTA with a corresponding test, or remove the filter state from the CEO workflow narrative. |

---

## SECTION 3 — OPTIONAL IMPROVEMENTS

These items are not required for correctness but would improve spec quality, doctrine robustness, or implementation experience.

**OPT-1 — Exposure Timestamp**
Display "As of [HH:MM]" on the Exposure KPI card. The pending approval queue changes as approvals occur; a stale figure is misleading. A mount-time timestamp surfaces staleness.

**OPT-2 — Exception Count as Clickable Link**
The exception count in the Accounting Status block should be a clickable link directly to `?tab=accounting&sub=exceptions`, not static text. The Exception Resolution Doctrine says exceptions are actionable — the hub should facilitate navigation to resolution, not merely display a count.

**OPT-3 — Notification Engine `requiredRoles` Field**
Adding a `requiredRoles` field to notification objects would allow `notification-center.tsx` to conditionally render the "Go to Source" button only when the destination route is accessible to the current user's role. This is a structural improvement to notification RBAC integrity, applicable broadly, not only for UX-4.

**OPT-4 — `defaultSub` Function Specification**
§2.5 references `defaultSub(activeTab)` but never defines it. Add the implementation to the spec:
```ts
function defaultSub(tab: string): string {
  const defaults: Record<string, string> = {
    payroll: "processing",
    accounting: "sync",
  };
  return defaults[tab] ?? "";
}
```

**OPT-5 — Redirect Query-Param Passthrough**
The current redirect routes discard inbound query parameters. Consider specifying redirect logic that preserves mapped parameters (e.g., `/invoices?filter=overdue → /finance?tab=invoicing&filter=overdue`). At minimum, note in the spec that inbound params are discarded — this prevents silent future breakage.

**OPT-6 — `components/finance/` Directory Inventory**
The spec places `FinanceHubOverview.tsx` in `components/finance/`. The spec should enumerate which existing components in that directory the Overview will consume (to prevent duplicate import chains) versus which are exclusive to `financial-explorer.tsx`.

---

## SECTION 4 — FINAL APPROVAL RECOMMENDATION

### Assessment by Specialist

| Specialist | Verdict | P0 Count | P1 Count |
|---|---|---|---|
| ledger-product-manager | NOT APPROVED — amendments required | 5 | 5 |
| ledger-architect | NOT APPROVED — amendments required | 4 | 4 |
| ledger-financial-doctrine-guardian | REQUIRES AMENDMENTS | 1 | 5 |
| ledger-rbac-workflow-auditor | NOT APPROVED — conditionally safe | 2 | 4 |

### Consolidated Verdict

**NOT APPROVED FOR IMPLEMENTATION IN CURRENT FORM**

The specification requires an amendment pass addressing the 8 P0 corrections (C-01 through C-08) and the 14 P1 corrections (C-09 through C-22). No redesign is required. Every correction is targeted and non-disruptive to the overall architecture and UX design.

### Path to Approval

The specification will be **APPROVED FOR IMPLEMENTATION** upon completion of all of the following:

1. **C-01** — `setLocation` replace semantics corrected for Wouter 3.3.5
2. **C-02** — `<Layout>` removal explicitly stated in §2.3
3. **C-03** — `InvoicingHub` component fully defined
4. **C-04** — `financial-explorer.tsx` tab duplication resolved (not deferred)
5. **C-05** — Exposure KPI source resolved to a single, specific function with correct label regime
6. **C-06** — Regression file list expanded to 14+ and sequenced to Day 1
7. **C-07** — Option A PM link sites enumerated in Appendix A (`layout.tsx`, `job-detail.tsx` ×2)
8. **C-08** — Option B redirect table corrected (no `/invoices` redirect for PMs)
9. **OD-1 resolved** — Repository owner declares Option A or Option B; spec amended accordingly for chosen option's full file impact

Once the above 9 items are addressed and OD-1 is declared, the specification should be re-issued as v1.1. The P1 corrections (C-09 through C-22) must be resolved as part of the same amendment pass. The P2 improvements (C-23 through C-29) are recommended for the same pass.

---

## SECTION 5 — AMENDMENT SUMMARY TABLE

| # | Severity | Section to Amend | Description |
|---|---|---|---|
| C-01 | P0 | §2.4 `RedirectToFinance` | Fix Wouter `setLocation` replace semantics |
| C-02 | P0 | §2.3 | Explicitly state `<Layout>` must be removed from extracted content components |
| C-03 | P0 | §2.6 | Define `InvoicingHub` component fully |
| C-04 | P0 | §2.9, §8.2 | Resolve `financial-explorer.tsx` internal tab duplication — do not defer |
| C-05 | P0 | §2.7, §3.3, §6.3 | Resolve Exposure KPI source: single function + label regime |
| C-06 | P0 | §7.5, §8.2 | Expand regression file list to 14+; move to Day 1 |
| C-07 | P0 | §4.5, Appendix A | Add 3 PM invoice link sites under Option A |
| C-08 | P0 | §1.6, §4.4, §4.5 | Fix Option B redirect table conflict |
| C-09 | P1 | §1.6, §2.4, Appendix A | Address `/invoices/:id` route |
| C-10 | P1 | Appendix A, §7.5 | Add engine files + ECC/AF/EB test files to regression plan |
| C-11 | P1 | Appendix A | Add `dashboard.tsx` with CTA update instructions |
| C-12 | P1 | §6.3, §7.4 | Correct testId `kpi-card-outstanding-invoices` → `kpi-card-exposure` |
| C-13 | P1 | §2.7 | Replace `getJobProfitability()` with correct function name |
| C-14 | P1 | §2.7 | Specify approved `mockTimesheets` array for `groupTimesheetsForPayroll()` |
| C-15 | P1 | §2.7, §3.5 | Add query-level approval enforcement requirement |
| C-16 | P1 | §3.4 | Add audit events for Accounting tab and Exceptions sub-tab activation |
| C-17 | P1 | §6.3 | Revenue KPI must link to job attribution |
| C-18 | P1 | §4, Appendix A | Address PM notification deep-link destination conflict |
| C-19 | P1 | §5.7, §1.5 | Document `/expenses` Worker access as intentional or flag as violation |
| C-20 | P1 | §7.2 | Add FH-44, FH-45 for Option B PM access tests |
| C-21 | P1 | §2.4 | Provide exact ordered route insertion list for App.tsx |
| C-22 | P1 | §8.2 | Revise schedule to 8–10 days |
| C-23 | P2 | §8.2 | Add ADMIN discoverability link to Day 1 |
| C-24 | P2 | §6.3 | Add visual separator between approved KPIs and Exposure |
| C-25 | P2 | §5.2, §6 | Add sync failure urgency thresholds |
| C-26 | P2 | §2.5 | Document sub-tab state reset behaviour as intentional |
| C-27 | P2 | §4.6 | Specify sub-tab guard failure rendering |
| C-28 | P2 | §4.2 | Acknowledge Admin role gap |
| C-29 | P2 | §5.6, §7 | Specify or remove `filter=overdue` deep-link from CEO workflow |

---

*End of review. The specification will be APPROVED FOR IMPLEMENTATION upon completion of P0 corrections C-01 through C-08 and declaration of OD-1. Amendments should be issued as UX-4-FINANCE-HUB-SPECIFICATION v1.1.*
