# UX-4 FINANCE HUB — IMPLEMENTATION HANDOFF

**Authority:** UX-4-FINANCE-HUB-SPECIFICATION-v1.1.md
**Branch:** `feature/ux4-finance-hub`
**Base:** `main` (after `feature/ux-phases-1-2-3` merged)

---

## BRANCH

```
git checkout main && git pull
git checkout -b feature/ux4-finance-hub
```

---

## IMPLEMENTATION ORDER

```
Day 1   Hub shell + routes + nav + ALL regression test updates
Day 2   Extract FE/Invoices/InvoiceBuilder + Records tab + Invoicing tab
Day 3   Extract Payroll/PayrollExport + PayrollHub + Payroll tab
Day 4   Extract AccountingSettings/Reconciliation/Exceptions + AccountingHub + Accounting tab
Day 5   FinanceHubOverview + audit events
Day 6   RBAC verification + full regression run + fixes
Day 7   Write FH-01–FH-43 tests
Day 8   Full suite verification + handoff doc + PR
```

---

## FILES TO CREATE

```
client/src/pages/finance-hub.tsx
client/src/components/finance/FinanceHubOverview.tsx
client/src/components/finance/InvoicingHub.tsx
tests/finance-hub.spec.ts
tests/doctrine/finance-hub.spec.ts
docs/handoffs/ux4-finance-hub-handoff.md
```

---

## FILES TO MODIFY

### New route + redirects

```
client/src/App.tsx
  — Add route: /finance → FinanceHubPage (CEO)
  — Add 9 redirect routes (order matters — see spec §2.4):
      /invoices/:id     → /finance?tab=invoicing        (CEO)
      /invoices         → /finance?tab=invoicing        (CEO)
      /invoice-builder  → /finance?tab=invoicing        (CEO)
      /payroll-export   → /finance?tab=payroll&sub=export (CEO)
      /payroll          → /finance?tab=payroll           (CEO)
      /financial-explorer → /finance?tab=records        (CEO)
      /accounting-settings → /finance?tab=accounting    (CEO)
      /reconciliation-center → /finance?tab=accounting&sub=reconciliation (CEO)
      /exception-resolution-center → /finance?tab=accounting&sub=exceptions (CEO)
  — Change /invoices, /invoice-builder, /invoices/:id from
    roles: ["CEO","Project Manager"] → roles: ["CEO"]
```

### Navigation

```
client/src/components/layout.tsx
  — Remove from OPERATIONAL_ITEMS:
      /invoices, /invoice-builder, /financial-explorer,
      /payroll, /payroll-export, /reconciliation-center,
      /exception-resolution-center
  — Remove from ADMIN_ITEMS: /accounting-settings
  — Add to OPERATIONAL_ITEMS:
      { label:"Finance", href:"/finance", icon:DollarSign,
        roles:["CEO"], testId:"nav-finance-hub" }
  — Add to ADMIN_ITEMS (deep-link pointer):
      { label:"Accounting Settings", href:"/finance?tab=accounting",
        icon:Link2, roles:["CEO"], testId:"nav-admin-accounting-settings" }
  — Fix NavLink active state:
      location === item.href || location.startsWith(item.href + "?")
```

### Dashboard CTAs

```
client/src/pages/dashboard.tsx
  — Line 282: setLocation('/invoices')
      → setLocation('/finance?tab=invoicing&filter=overdue')
  — Line 484: setLocation('/financial-explorer')
      → setLocation('/finance?tab=records')
```

### Job detail — remove PM invoice buttons (Option A)

```
client/src/pages/job-detail.tsx
  — Line 212: remove "View Invoice" button
  — Line 363: remove "Invoice Builder" button
```

### Content extractions — remove <Layout>, add named export

```
client/src/pages/financial-explorer.tsx
  — Export: FinancialRecordsContent (no Layout)
  — Remove sub-tabs: AccountingSyncTab, ReconciliationTab, ExceptionsTab
  — Retained sub-tabs (7): Timesheets / Expenses / Inventory / Equipment /
                            Invoice Pipeline / Margin Intelligence / Forecast

client/src/pages/invoices.tsx
  — Export: InvoicesContent (no Layout)
  — Add optional prop: statusFilter?: string

client/src/pages/invoice-builder.tsx
  — Export: InvoiceBuilderContent (no Layout)
  — Add optional prop: onComplete?: () => void

client/src/pages/payroll.tsx
  — Export: PayrollProcessingContent (no Layout)

client/src/pages/payroll-export.tsx
  — Export: PayrollExportContent (no Layout)

client/src/pages/accounting-settings.tsx
  — Export: AccountingSettingsContent (no Layout)

client/src/pages/reconciliation-center.tsx
  — Export: ReconciliationContent (no Layout)

client/src/pages/exception-resolution-center.tsx
  — Export: ExceptionResolutionContent (no Layout)
```

### Engine sourceRoute strings

```
client/src/lib/notificationEngine.ts
  /financial-explorer          → /finance?tab=records
  /exception-resolution-center → /finance?tab=accounting&sub=exceptions
  /reconciliation-center       → /finance?tab=accounting&sub=reconciliation

client/src/lib/activityFeedEngine.ts
  /financial-explorer          → /finance?tab=records
  /reconciliation-center       → /finance?tab=accounting&sub=reconciliation
  /exception-resolution-center → /finance?tab=accounting&sub=exceptions

client/src/lib/eventBusEngine.ts
  /financial-explorer          → /finance?tab=records
  /exception-resolution-center → /finance?tab=accounting&sub=exceptions
  /reconciliation-center       → /finance?tab=accounting&sub=reconciliation

client/src/lib/executiveCommandEngine.ts
  /reconciliation-center       → /finance?tab=accounting&sub=reconciliation
  /exception-resolution-center → /finance?tab=accounting&sub=exceptions

client/src/lib/analyticsEngine.ts
  /reconciliation-center       → /finance?tab=accounting&sub=reconciliation
  /exception-resolution-center → /finance?tab=accounting&sub=exceptions
  /financial-explorer          → /finance?tab=records

client/src/components/finance/ExceptionsTab.tsx
  setLocation("/exception-resolution-center")
      → setLocation("/finance?tab=accounting&sub=exceptions")

client/src/components/finance/JobExceptionPanel.tsx
  setLocation("/exception-resolution-center")
      → setLocation("/finance?tab=accounting&sub=exceptions")
```

### Regression tests (update on Day 1)

```
tests/doctrine/financial-explorer.spec.ts
tests/doctrine/invoice-pipeline.spec.ts
tests/doctrine/payroll-staging.spec.ts
tests/doctrine/payroll-export.spec.ts
tests/doctrine/accounting-settings.spec.ts
tests/doctrine/reconciliation-center.spec.ts
tests/doctrine/exception-resolution.spec.ts
tests/doctrine/activity-feed.spec.ts
tests/doctrine/event-bus.spec.ts
tests/doctrine/executive-command-centre.spec.ts  (ECC-21, ECC-22, ECC-27)
tests/doctrine/margin-intelligence.spec.ts
tests/doctrine/revenue-normalization.spec.ts
tests/doctrine/accounting-sync.spec.ts
tests/accounting-settings.spec.ts
```

---

## DATA SOURCES (Finance Overview)

```
Revenue Recognised   getAllJobMargins(useStore().jobs) → sum r.summary.totalRevenue
Costs Approved       getAllJobMargins(useStore().jobs) → sum r.summary.totalCost
Gross Margin         (revenue - cost) / revenue * 100  [use getAllJobMargins result]
Exposure             getPendingExposure().totalPendingCost
Exposure count       getPendingExposure().pendingItemCount
Job Profitability    getAllJobMargins(useStore().jobs).slice(0, 4)
Invoice Status       useStore().invoices  [group by status, sum amount]
Payroll timesheets   groupTimesheetsForPayroll(useStore().timesheets)  [approved array only]
Payroll pending      useStore().reviewItems.filter(r => r.type==="timesheet" && r.status==="pending").length
Accounting provider  getDefaultProvider()  [accountingSettingsEngine]
Accounting sync      computeSyncKPIs(SEED_SYNC_RECORDS)  [accountingSyncEngine]
Open exceptions      computeExceptionSummary(SEED_EXCEPTIONS).openCount
```

---

## TEST TARGETS

```
FH-01   CEO accesses /finance                           P0  RBAC
FH-02   PM denied /finance                             P0  RBAC
FH-03   Worker denied /finance                         P0  RBAC
FH-04   Finance nav visible to CEO                     P0  RBAC
FH-05   Finance nav hidden from PM                     P0  RBAC
FH-06   Finance nav hidden from Worker                 P0  RBAC
FH-07   Hub page container renders                     P0
FH-08   Default tab is Overview                        P0
FH-09   Approved KPI group renders (3 cards)           P0
FH-10   Exposure card renders in Pending group         P0  Approval Doctrine
FH-11   Each KPI card has non-empty value              P1
FH-12   Exposure card has amber style + label          P0  Approval Doctrine
FH-13   Revenue card has job attribution reference     P1  Job Attribution
FH-14   Invoice Status Summary renders                 P1
FH-15   Payroll Status block renders                   P1
FH-16   Accounting Status block renders                P1
FH-17   Sync failure count colour-codes at thresholds  P1  Sync Doctrine
FH-18   "View All Records" → Records tab               P1
FH-19   "Open Invoicing" → Invoicing tab               P1
FH-20   "Open Payroll" → Payroll tab                   P1
FH-21   "Open Accounting" → Exceptions when count > 0  P1
FH-22   All 5 tab buttons visible                      P0
FH-23   Tab click updates URL param                    P0
FH-24   Deep-link ?tab=records works                   P0
FH-25   Deep-link ?tab=invoicing works                 P0
FH-26   Deep-link ?tab=payroll works                   P1
FH-27   Deep-link ?tab=accounting works                P1
FH-28   Records tab shows "Financial Records" heading  P0
FH-29   Records tab has 7 sub-tabs                     P0
FH-30   Records tab has no Sync/Reconciliation/Exceptions tabs  P0
FH-31   Invoicing tab renders invoice list             P0
FH-32   Invoicing tab renders status filter tabs       P1
FH-33   + Create Invoice button visible                P1
FH-34   Payroll sub-tabs visible                       P1
FH-35   Payroll status banner renders                  P1
FH-36   Payroll: Processing Queue content              P1
FH-37   Accounting: four sub-tabs visible              P1
FH-38   Accounting: Reconciliation content mounts      P1
FH-39   /financial-explorer redirects to hub           P0
FH-40   /payroll redirects to hub                      P0
FH-41   Overview has no approve/reject buttons         P0  Approval Doctrine
FH-42   Overview has no mutation controls              P0  Financial Integrity
FH-43   Finance nav absent from PM sidebar             P0  RBAC Doctrine
```

---

## KEY data-testid VALUES

```
finance-hub-page
finance-hub-heading
finance-tab-overview / records / invoicing / payroll / accounting
finance-overview-panel
finance-records-panel
finance-invoicing-panel
finance-payroll-panel
finance-accounting-panel
finance-kpi-strip-approved
finance-kpi-strip-pending
kpi-card-revenue / costs / margin / exposure
kpi-value-revenue / costs / margin / exposure
finance-job-profitability-panel
finance-invoice-status-summary
invoice-status-row-draft / sent / overdue / paid
finance-payroll-status-block
finance-accounting-status-block
btn-view-all-records
btn-open-invoicing
btn-open-payroll
btn-open-accounting
finance-records-heading
invoice-list-container
invoice-filter-all / draft / sent / overdue / paid
btn-create-invoice
payroll-status-banner
payroll-subtab-processing-queue / export-history
payroll-processing-queue-panel
payroll-export-history-panel
accounting-subtab-sync-status / reconciliation / exceptions / providers
accounting-sync-status-panel
accounting-reconciliation-panel
accounting-exceptions-panel
accounting-providers-panel
nav-finance-hub
nav-admin-accounting-settings
```

---

## AUDIT EVENTS TO EMIT

```
finance_hub_viewed            — on /finance load (any tab)
finance_overview_viewed       — on Overview tab mount
finance_hub_accounting_tab_viewed — on Accounting tab activate
finance_hub_exceptions_viewed — on Exceptions sub-tab activate
finance_hub_deep_link_opened  — on any Overview CTA click (+ destination field)
```

---

## STOP CONDITIONS

```
STOP after PR is created.
STOP if build fails — fix before continuing.
STOP if Day 1 CI is not green — do not proceed to Day 2.
STOP if full suite is not 544/544 on Day 8 — fix failures before PR.
Do not merge the PR.
Do not begin UX-5.
```
