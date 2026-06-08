# THE LEDGER — UX-4 FINANCE HUB
## Consolidated Implementation Specification v1.1

**Document Type:** Implementation Specification — Authoritative
**Version:** 1.1
**Date:** June 6, 2026
**Status:** APPROVED FOR IMPLEMENTATION
**Programme:** UX Redesign Programme — Phase UX-4
**Branch Target:** `feature/ux4-finance-hub`
**Prerequisite Branch:** `feature/ux-phases-1-2-3` merged to main
**Supersedes:** UX-4-FINANCE-HUB-SPECIFICATION v1.0

**Produced by:** 7-Agent Planning Pipeline + 4-Agent Red-Team Review
**Red-team corrections applied:** C-01 through C-29 (see UX-4-FINANCE-HUB-AMENDMENT-SUMMARY.md)

---

## QUICK REFERENCE

| Property | Value |
|---|---|
| Route | `/finance` |
| Tab count | 5 |
| Legacy routes redirected | 8 |
| New files | 3 (`finance-hub.tsx`, `FinanceHubOverview.tsx`, `InvoicingHub.tsx`) |
| Files refactored (extract content) | 8 existing pages |
| Files modified | `App.tsx`, `layout.tsx`, `dashboard.tsx`, `job-detail.tsx` |
| Engine files updated (sourceRoute strings) | 5 (`notificationEngine.ts`, `activityFeedEngine.ts`, `eventBusEngine.ts`, `executiveCommandEngine.ts`, `analyticsEngine.ts`) |
| Component files updated (setLocation) | 2 (`ExceptionsTab.tsx`, `JobExceptionPanel.tsx`) |
| RBAC | CEO only — all tabs and sub-tabs |
| PM invoice access | **REVOKED** — Option A selected |
| New Playwright tests | 43 (FH-01 – FH-43) |
| Regression files requiring update | 14 |
| Doctrine verdict | COMPLIANT |
| Schedule | 8 days |

---

## RESOLVED DECISIONS

All open decisions from v1.0 have been resolved. No open decisions remain.

| Decision | Resolution |
|---|---|
| OD-1 — PM invoice access | **Option A selected** — PM access to `/invoices`, `/invoice-builder`, `/invoices/:id` is revoked. See §4 for full impact. |
| OD-2 — Finance Overview period | **Current Month** — all KPIs display current calendar month figures with period label visible on-screen. |
| OD-3 — Invoice Builder rendering | **`<Sheet>` slide-over** — Invoice Builder renders as a shadcn `<Sheet>` triggered by the "+ Create Invoice" button. |

---

## PART 1 — PRODUCT REQUIREMENTS

### 1.1 Current State Summary

Phases 1–6.8 are complete and merged to main (501 Playwright tests passing). UX Phases 1–3 and quick-wins are implemented on branch `feature/ux-phases-1-2-3` (**this must be merged before UX-4 begins**). The platform is a frontend-only, mock-data-driven prototype.

The current sidebar exposes 8 financially-oriented navigation items as flat top-level peers:

| # | Current Nav Item | Route | Current Roles |
|---|---|---|---|
| 1 | Financial Records | `/financial-explorer` | CEO |
| 2 | Invoices | `/invoices` | CEO, Project Manager |
| 3 | Invoice Builder | `/invoice-builder` | CEO, Project Manager |
| 4 | Payroll Processing | `/payroll` | CEO |
| 5 | Payroll Export | `/payroll-export` | CEO |
| 6 | Reconciliation Centre | `/reconciliation-center` | CEO |
| 7 | Exceptions | `/exception-resolution-center` | CEO |
| 8 | Accounting Settings | `/accounting-settings` (in ADMIN) | CEO |

### 1.2 What UX-4 Does

UX-4 replaces all 8 items with a single **"Finance"** nav entry pointing to `/finance` (CEO only). The Finance Hub is a 5-tab hub that consolidates all existing finance functionality.

```
Finance Hub  /finance  [CEO only]
  ├── Tab 1: Overview     (new page — period KPIs + four summary panels, read-only)
  ├── Tab 2: Records      (Financial Explorer content, renamed — 7 tabs)
  ├── Tab 3: Invoicing    (Invoices list + Invoice Builder via Sheet)
  ├── Tab 4: Payroll      (Payroll Staging + Payroll Export, sub-tabs)
  └── Tab 5: Accounting   (Accounting Settings + Reconciliation + Exceptions, sub-tabs)
```

**Note on Records tab:** As part of UX-4, the three accounting-integration sub-tabs currently inside Financial Explorer (`AccountingSyncTab`, `ReconciliationTab`, `ExceptionsTab`) are removed. They are now exclusively accessible in the Finance Hub Accounting tab. The Records tab retains 7 operational record sub-tabs (see §2.3).

### 1.3 Strategic Assessment

**Fit:** Directly addresses RC-1 (Finance fragmentation — 8 items), the highest-severity remaining UX programme item.

**User programmes affected:**
- CEO: Primary beneficiary. Finance Hub provides one weekly financial destination.
- Project Manager: `/invoices`, `/invoice-builder`, and `/invoices/:id` are **revoked** (Option A). PM loses invoice management capability. PM-facing invoice buttons in `job-detail.tsx` are removed. This is a deliberate scope decision — see §4.5 for implementation impact.
- Workers: Unaffected — zero financial visibility, no change.
- Clients: Unaffected — Client Portal is a separate context.

### 1.4 Dependency Analysis

**Hard dependencies (must be resolved before branch creation):**

1. `feature/ux-phases-1-2-3` merged to main
2. Playwright suite confirmed at 501/501 on the base branch

**Confirmed pre-implementation tasks (must run before Day 1 implementation):**

3. Playwright test audit: grep all 14 regression files for legacy route strings (§7.5 provides the complete list)
4. Confirm `useSearch()` hook availability in installed Wouter version (see §2.5)

### 1.5 Scope

**In scope:**
- `/finance` route (CEO only) with 5-tab hub layout
- Finance Overview tab (new, read-only KPI summary)
- Records tab: Financial Explorer content with 3 accounting sub-tabs removed (7 sub-tabs remain)
- Invoicing tab: Invoices list with status filters + Invoice Builder via Sheet slide-over
- Payroll tab with sub-tabs: Processing Queue / Export History
- Accounting tab with sub-tabs: Sync Status / Reconciliation / Exceptions / Providers
- Single "Finance" sidebar nav item (CEO only) replacing 8 items
- Route redirects for all 8 legacy paths (all to CEO-only Finance Hub)
- ADMIN section: "Accounting Settings" replaced by a deep-link pointer to Finance → Accounting tab
- `dashboard.tsx` CTA updates (Revenue at Risk card, Financial Records button)
- `job-detail.tsx` PM invoice button removal
- Engine `sourceRoute` string updates (5 engine files + 2 component files)
- 43 Playwright tests (FH-01–FH-43)

**Explicitly out of scope:**
- Changes to the business logic, data, or approval workflows of any existing page
- New financial mutations, approval workflows, or automated actions
- Date range / period picker on the Finance Overview (period = Current Month, fixed)
- Backend integration (mock data only)
- Changes to Review Centre, Worker platform, or Client Portal
- PM invoice access via any route (revoked — Option A)

### 1.6 User Stories and Acceptance Criteria

#### Navigation

| Story | Acceptance Criterion |
|---|---|
| As CEO, I see a single "Finance" nav item replacing 8 finance items | Sidebar contains exactly one Finance entry; no individual finance items remain |
| As CEO, clicking "Finance" lands me on the Overview tab | `/finance` loads with Overview tab active by default |
| As CEO, direct navigation to any legacy finance URL redirects me correctly | All 8 legacy routes redirect to hub equivalents |
| As CEO, Revenue at Risk card on Dashboard navigates to Invoicing with Overdue filter | `dashboard.tsx` CTA navigates to `/finance?tab=invoicing&filter=overdue` |

#### Finance Overview

| Story | Acceptance Criterion |
|---|---|
| As CEO, I see 4 KPI cards: Revenue Recognised, Costs Approved, Gross Margin, Exposure | KPI strip renders all 4 cards with non-empty values and current-month period label |
| As CEO, Exposure KPI is visually distinguished from approved figures | Exposure card has amber accent, "Pending Approval" label, and "As of [HH:MM]" timestamp |
| As CEO, Revenue KPI references its job attribution | Revenue card includes "Across N active jobs" sub-label linking to Job Profitability panel |
| As CEO, I see top 4 jobs by margin with revenue and trend | Job Profitability panel renders ≥1 job row |
| As CEO, I see invoice counts and values by status | Invoice Status Summary renders all 4 status groups |
| As CEO, I see payroll run date, worker count, and approval split | Payroll Status block renders |
| As CEO, I see accounting provider, last sync, failure count, exception count | Accounting Status block renders with urgency colour coding |
| As CEO, Overview CTAs navigate me to the correct tab (and sub-tab where applicable) | Each CTA navigates correctly, including Accounting CTA to Exceptions sub-tab when exceptions > 0 |
| As CEO, Overview is read-only — no approve/reject/mutate buttons | No action buttons present in the Overview panel |

#### Records Tab

| Story | Acceptance Criterion |
|---|---|
| Records tab renders Financial Explorer content with "Financial Records" heading | `finance-records-heading` contains "Financial Records" |
| Records tab contains 7 operational sub-tabs only (no Accounting Sync, Reconciliation, Exceptions) | Only the 7 retained sub-tabs are visible |

#### Invoicing, Payroll, Accounting Tabs

| Story | Acceptance Criterion |
|---|---|
| Invoicing tab renders invoice list with status filters and Create button | Table + 5 filter tabs + Create button visible |
| Payroll tab renders sub-tabs with status banner | Both sub-tabs and banner visible |
| Accounting tab renders 4 sub-tabs each mounting correct content | All 4 sub-tabs visible and functional |
| Accounting Exceptions sub-tab mounts Exception Resolution Centre content | Exception workflow (Open → Under Investigation → Awaiting Approval → Resolved/Rejected) fully functional |

#### RBAC

| Story | Acceptance Criterion |
|---|---|
| PM cannot access `/finance` | PM navigating to `/finance` receives UnauthorizedPage |
| PM cannot access legacy invoice routes | `/invoices`, `/invoice-builder`, `/invoices/:id` return UnauthorizedPage for PM |
| PM cannot see Finance nav item | `nav-finance-hub` not present in PM sidebar DOM |
| PM job detail page has no invoice buttons | "View Invoice" and "Invoice Builder" buttons absent from `job-detail.tsx` for PM role |

#### Redirects

| Legacy Route | Redirects To |
|---|---|
| `/financial-explorer` | `/finance?tab=records` |
| `/invoices` | `/finance?tab=invoicing` |
| `/invoice-builder` | `/finance?tab=invoicing` |
| `/invoices/:id` | `/finance?tab=invoicing` |
| `/payroll` | `/finance?tab=payroll` |
| `/payroll-export` | `/finance?tab=payroll&sub=export` |
| `/accounting-settings` | `/finance?tab=accounting` |
| `/reconciliation-center` | `/finance?tab=accounting&sub=reconciliation` |
| `/exception-resolution-center` | `/finance?tab=accounting&sub=exceptions` |

---

## PART 2 — ARCHITECTURE REQUIREMENTS

### 2.1 Approach

The Finance Hub follows the same pattern demonstrated in `financial-explorer.tsx` — shadcn `Tabs` hosting distinct content components — escalated to a hub level. No new architectural layers, no new state management libraries, no backend changes. Tab state lives in URL query parameters for deep-linkability.

### 2.2 New Files

```
client/src/pages/finance-hub.tsx
  — Finance Hub page component
  — Owns the 5-tab shell, reads ?tab= / ?sub= from URL
  — Wraps in <Layout>

client/src/components/finance/FinanceHubOverview.tsx
  — Overview tab content component
  — Composes data from existing engines (read-only)
  — No props required

client/src/components/finance/InvoicingHub.tsx
  — Invoicing tab content component
  — Renders InvoicesContent
  — Manages Sheet state for Invoice Builder
  — Props: none (reads URL ?filter= param for status filter deep-links)
```

### 2.3 Refactored Files (Content Extraction — MANDATORY)

Every existing page mounted inside the hub **must** have its inner content extracted into a named export. **The `<Layout>` wrapper must be removed from the extracted content component.** The default export becomes a thin `<Layout>` wrapper around the content component, preserving the existing direct-URL route.

```
client/src/pages/financial-explorer.tsx
  — Extract: export function FinancialRecordsContent() { ... }
  — REMOVE <Layout> from FinancialRecordsContent
  — REMOVE AccountingSyncTab, ReconciliationTab, ExceptionsTab sub-tabs from FinancialRecordsContent
  — Retained sub-tabs (7): Timesheets / Expenses / Inventory / Equipment /
                            Invoice Pipeline / Margin Intelligence / Forecast
  — Default export becomes: export default function FinancialExplorerPage() {
      return <Layout><FinancialRecordsContent /></Layout>;
    }

client/src/pages/invoices.tsx
  — Extract: export function InvoicesContent() { ... }
  — REMOVE <Layout> from InvoicesContent
  — Default export: thin Layout wrapper

client/src/pages/invoice-builder.tsx
  — Extract: export function InvoiceBuilderContent() { ... }
  — REMOVE <Layout> from InvoiceBuilderContent
  — Default export: thin Layout wrapper

client/src/pages/payroll.tsx
  — Extract: export function PayrollProcessingContent() { ... }
  — REMOVE <Layout> from PayrollProcessingContent
  — Default export: thin Layout wrapper

client/src/pages/payroll-export.tsx
  — Extract: export function PayrollExportContent() { ... }
  — REMOVE <Layout> from PayrollExportContent
  — Default export: thin Layout wrapper

client/src/pages/accounting-settings.tsx
  — Extract: export function AccountingSettingsContent() { ... }
  — REMOVE <Layout> from AccountingSettingsContent
  — Default export: thin Layout wrapper

client/src/pages/reconciliation-center.tsx
  — Extract: export function ReconciliationContent() { ... }
  — REMOVE <Layout> from ReconciliationContent
  — Default export: thin Layout wrapper

client/src/pages/exception-resolution-center.tsx
  — Extract: export function ExceptionResolutionContent() { ... }
  — REMOVE <Layout> from ExceptionResolutionContent
  — Default export: thin Layout wrapper
```

> **Critical:** Failure to remove `<Layout>` from extracted content components produces a double sidebar on every tab. Verify each extraction by running the build and visually confirming no nested Layout on the affected tab before proceeding.

### 2.4 Modified Files

#### `client/src/App.tsx`

Add hub route (CEO only):
```tsx
<Route path="/finance">
  <ProtectedRoute component={FinanceHubPage} roles={["CEO"]} />
</Route>
```

Add redirect routes. **Insert in this exact order, before the existing legacy route declarations in the Switch:**

```tsx
{/* Finance Hub redirect routes — must precede legacy route declarations */}
<Route path="/financial-explorer">
  <ProtectedRoute component={() => <RedirectToFinance tab="records" />} roles={["CEO"]} />
</Route>
<Route path="/invoices/:id">
  <ProtectedRoute component={() => <RedirectToFinance tab="invoicing" />} roles={["CEO"]} />
</Route>
<Route path="/invoices">
  <ProtectedRoute component={() => <RedirectToFinance tab="invoicing" />} roles={["CEO"]} />
</Route>
<Route path="/invoice-builder">
  <ProtectedRoute component={() => <RedirectToFinance tab="invoicing" />} roles={["CEO"]} />
</Route>
<Route path="/payroll-export">
  <ProtectedRoute component={() => <RedirectToFinance tab="payroll" sub="export" />} roles={["CEO"]} />
</Route>
<Route path="/payroll">
  <ProtectedRoute component={() => <RedirectToFinance tab="payroll" />} roles={["CEO"]} />
</Route>
<Route path="/accounting-settings">
  <ProtectedRoute component={() => <RedirectToFinance tab="accounting" />} roles={["CEO"]} />
</Route>
<Route path="/reconciliation-center">
  <ProtectedRoute component={() => <RedirectToFinance tab="accounting" sub="reconciliation" />} roles={["CEO"]} />
</Route>
<Route path="/exception-resolution-center">
  <ProtectedRoute component={() => <RedirectToFinance tab="accounting" sub="exceptions" />} roles={["CEO"]} />
</Route>
```

> **Route ordering notes:**
> - `/invoices/:id` must be declared **before** `/invoices` so the dynamic segment is matched first
> - `/payroll-export` must be declared **before** `/payroll` so the longer path is matched first
> - All redirect routes carry `roles: ["CEO"]` — the role check fires before the redirect

**RedirectToFinance utility** (synchronous render-body pattern — matches existing `ProtectedRoute` redirect convention):

```tsx
function RedirectToFinance({ tab, sub }: { tab: string; sub?: string }) {
  const [, setLocation] = useLocation();
  const qs = sub ? `?tab=${tab}&sub=${sub}` : `?tab=${tab}`;
  // Synchronous redirect in render body — matches ProtectedRoute pattern (lines 86–88)
  // Do NOT use useEffect — it creates a blank frame and races with auth checks
  setLocation(`/finance${qs}`);
  return null;
}
```

> **Wouter note:** Wouter 3.x `setLocation` accepts a single string argument only. `{ replace: true }` is NOT a valid second argument and is silently ignored, causing pushState instead of replaceState. The synchronous render-body pattern above is the correct approach, matching the existing codebase convention.

Also under **Option A** — change existing `/invoices`, `/invoice-builder`, `/invoices/:id` route declarations to CEO only:
```tsx
// Update these existing ProtectedRoute declarations:
// OLD: roles={["CEO", "Project Manager"]}
// NEW: roles={["CEO"]}
// Applies to routes: /invoices, /invoices/:id, /invoice-builder
```

#### `client/src/components/layout.tsx`

Remove from `OPERATIONAL_ITEMS`:
- Invoices (`/invoices`) — roles: ["CEO", "Project Manager"]
- Invoice Builder (`/invoice-builder`) — roles: ["CEO", "Project Manager"]
- Financial Records (`/financial-explorer`) — roles: ["CEO"]
- Payroll Processing (`/payroll`) — roles: ["CEO"]
- Payroll Export (`/payroll-export`) — roles: ["CEO"]
- Reconciliation Centre (`/reconciliation-center`) — roles: ["CEO"]
- Exceptions (`/exception-resolution-center`) — roles: ["CEO"]

Remove from `ADMIN_ITEMS`:
- Accounting Settings (`/accounting-settings`) — roles: ["CEO"]

Add to `ADMIN_ITEMS` (as a deep-link pointer, not a primary nav item):
```ts
{
  label: "Accounting Settings",
  href: "/finance?tab=accounting",
  icon: Link2,
  roles: ["CEO"],
  testId: "nav-admin-accounting-settings",
  description: "Moved to Finance → Accounting"
}
```

Add to `OPERATIONAL_ITEMS` (after the Operations group, before Intelligence):
```ts
{
  label: "Finance",
  href: "/finance",
  icon: DollarSign,
  roles: ["CEO"],
  testId: "nav-finance-hub"
}
```

Update `NavLink` active state check:
```tsx
const isActive = location === item.href
  || location.startsWith(item.href + "?")
  || location.startsWith(item.href + "/");
```

#### `client/src/pages/dashboard.tsx`

Line 282 — Revenue at Risk CTA (update to pass `filter=overdue` and navigate directly, bypassing redirect):
```tsx
// OLD:
onAction={() => setLocation('/invoices')}
// NEW:
onAction={() => setLocation('/finance?tab=invoicing&filter=overdue')}
```

Line 484 — Financial Records button:
```tsx
// OLD:
onClick={() => setLocation('/financial-explorer')}
// NEW:
onClick={() => setLocation('/finance?tab=records')}
```

#### `client/src/pages/job-detail.tsx`

Line 212 — "View Invoice" button: **Remove this button entirely** under Option A (PM no longer has invoice access; CEO is redirected correctly via the hub redirect routes).

Line 363 — "Invoice Builder" button: **Remove this button entirely** under Option A.

> If these buttons are inside a role-conditional block (`hasRole("CEO")`), they may be retained for CEO and removed for PM only. If not currently role-conditional, remove them from the component entirely. The CEO can access invoicing via the Finance Hub.

#### Engine files — `sourceRoute` updates

The following files contain hardcoded legacy route strings that serve as deep-link destinations in the Notification Centre, Activity Feed, Event Bus, ECC, and Analytics Centre. Update all occurrences as follows:

| File | Old Value | New Value |
|---|---|---|
| `client/src/lib/notificationEngine.ts` | `/financial-explorer` | `/finance?tab=records` |
| `client/src/lib/notificationEngine.ts` | `/exception-resolution-center` | `/finance?tab=accounting&sub=exceptions` |
| `client/src/lib/notificationEngine.ts` | `/reconciliation-center` | `/finance?tab=accounting&sub=reconciliation` |
| `client/src/lib/activityFeedEngine.ts` | `/financial-explorer` | `/finance?tab=records` |
| `client/src/lib/activityFeedEngine.ts` | `/reconciliation-center` | `/finance?tab=accounting&sub=reconciliation` |
| `client/src/lib/activityFeedEngine.ts` | `/exception-resolution-center` | `/finance?tab=accounting&sub=exceptions` |
| `client/src/lib/eventBusEngine.ts` | `/financial-explorer` | `/finance?tab=records` |
| `client/src/lib/eventBusEngine.ts` | `/exception-resolution-center` | `/finance?tab=accounting&sub=exceptions` |
| `client/src/lib/eventBusEngine.ts` | `/reconciliation-center` | `/finance?tab=accounting&sub=reconciliation` |
| `client/src/lib/executiveCommandEngine.ts` | `/reconciliation-center` | `/finance?tab=accounting&sub=reconciliation` |
| `client/src/lib/executiveCommandEngine.ts` | `/exception-resolution-center` | `/finance?tab=accounting&sub=exceptions` |
| `client/src/lib/analyticsEngine.ts` | `/reconciliation-center` | `/finance?tab=accounting&sub=reconciliation` |
| `client/src/lib/analyticsEngine.ts` | `/exception-resolution-center` | `/finance?tab=accounting&sub=exceptions` |
| `client/src/lib/analyticsEngine.ts` | `/financial-explorer` | `/finance?tab=records` |
| `client/src/components/finance/ExceptionsTab.tsx` | `/exception-resolution-center` | `/finance?tab=accounting&sub=exceptions` |
| `client/src/components/finance/JobExceptionPanel.tsx` | `/exception-resolution-center` | `/finance?tab=accounting&sub=exceptions` |

> **Note on doctrine tests:** The existing doctrine tests for `activity-feed.spec.ts`, `event-bus.spec.ts`, and `executive-command-centre.spec.ts` (ECC-21, ECC-22, ECC-27) assert arrival at the legacy URLs. These tests must be updated to assert arrival at the new Finance Hub URLs (see §7.5).

### 2.5 Routing Strategy

Tab and sub-tab state lives exclusively in URL query parameters. No Zustand store for tab position.

```tsx
// Inside finance-hub.tsx
// Confirm useSearch is available: import { useSearch, useLocation } from "wouter"
// If useSearch is not exported by the installed Wouter version, use:
// const search = window.location.search;
const [search] = useSearch();
const params = new URLSearchParams(search);
const activeTab = params.get("tab") ?? "overview";
const activeSub = params.get("sub") ?? defaultSub(activeTab);

function defaultSub(tab: string): string {
  const defaults: Record<string, string> = {
    payroll: "processing",
    accounting: "sync",
  };
  return defaults[tab] ?? "";
}

function handleTabChange(tab: string) {
  setLocation(`/finance?tab=${tab}`);
  // NOTE: activeTab will reflect the new value only after the next render cycle.
  // Do not read activeTab synchronously after calling handleTabChange within
  // the same event handler — use the local `tab` argument instead.
}

function handleSubChange(sub: string) {
  setLocation(`/finance?tab=${activeTab}&sub=${sub}`);
}
```

**Sub-tab state reset behaviour (intentional):** Switching parent tabs resets the sub-tab to its default (`defaultSub(tab)`). Sub-tab position is NOT preserved across parent tab switches. This is a known and intentional behaviour. If the CEO is on Payroll → Export and clicks Accounting, then returns to Payroll, they land on Payroll → Processing (the default). Document this in the implementation comments.

### 2.6 Finance Hub Page Structure

```
FinanceHubPage                          ← client/src/pages/finance-hub.tsx
  └── <Layout>
        └── <div className="space-y-6 p-6" data-testid="finance-hub-page">
              ├── Hub header
              │     <h1 data-testid="finance-hub-heading">Finance</h1>
              │     <p>Revenue, costs, payroll, invoicing and accounting</p>
              └── <Tabs value={activeTab} onValueChange={handleTabChange}>
                    ├── <TabsList>
                    │     ├── <TabsTrigger value="overview"   data-testid="finance-tab-overview">
                    │     ├── <TabsTrigger value="records"    data-testid="finance-tab-records">
                    │     ├── <TabsTrigger value="invoicing"  data-testid="finance-tab-invoicing">
                    │     ├── <TabsTrigger value="payroll"    data-testid="finance-tab-payroll">
                    │     └── <TabsTrigger value="accounting" data-testid="finance-tab-accounting">
                    ├── <TabsContent value="overview">
                    │     <FinanceHubOverview />
                    ├── <TabsContent value="records"   data-testid="finance-records-panel">
                    │     <FinancialRecordsContent />   ← named export, <Layout>-free
                    ├── <TabsContent value="invoicing" data-testid="finance-invoicing-panel">
                    │     <InvoicingHub />              ← client/src/components/finance/InvoicingHub.tsx
                    ├── <TabsContent value="payroll"   data-testid="finance-payroll-panel">
                    │     <PayrollHub activeSub={activeSub} onSubChange={handleSubChange} />
                    └── <TabsContent value="accounting" data-testid="finance-accounting-panel">
                          <AccountingHub activeSub={activeSub} onSubChange={handleSubChange} />
```

### 2.7 InvoicingHub Component Definition

```
File:   client/src/components/finance/InvoicingHub.tsx
Props:  none (reads URL ?filter= query param for status deep-links from Overview)
State:  local useState for Invoice Builder Sheet open/closed

Structure:
  <div data-testid="finance-invoicing-panel">
    <div className="flex items-center justify-between mb-4">
      <h2 className="text-lg font-semibold">Invoicing</h2>
      <Button data-testid="btn-create-invoice" onClick={() => setSheetOpen(true)}>
        + Create Invoice
      </Button>
    </div>

    {/* Status filter tabs */}
    <div className="flex gap-2 mb-4">
      <Button variant={filter==="all"?"default":"outline"} data-testid="invoice-filter-all">All</Button>
      <Button variant={filter==="draft"?"default":"outline"} data-testid="invoice-filter-draft">Draft</Button>
      <Button variant={filter==="sent"?"default":"outline"} data-testid="invoice-filter-sent">Sent</Button>
      <Button variant={filter==="overdue"?"default":"outline"} data-testid="invoice-filter-overdue">Overdue</Button>
      <Button variant={filter==="paid"?"default":"outline"} data-testid="invoice-filter-paid">Paid</Button>
    </div>

    {/* Invoice list — InvoicesContent renders the table */}
    <div data-testid="invoice-list-container">
      <InvoicesContent statusFilter={activeFilter} />
    </div>

    {/* Invoice Builder — Sheet slide-over */}
    <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
      <SheetContent side="right" className="w-[600px]">
        <SheetHeader>
          <SheetTitle>Create Invoice</SheetTitle>
        </SheetHeader>
        <InvoiceBuilderContent onComplete={() => setSheetOpen(false)} />
      </SheetContent>
    </Sheet>
  </div>
```

**Props interface for extracted content components used by InvoicingHub:**

`InvoicesContent` must accept an optional `statusFilter?: string` prop. When provided, it pre-selects the corresponding status tab. This enables the deep-link from the Finance Overview's "Open Invoicing →" CTA.

`InvoiceBuilderContent` must accept an optional `onComplete?: () => void` prop. When provided, it is called after successful invoice creation or save-draft, allowing the Sheet to close.

### 2.8 Finance Overview Data Sources

The Finance Overview composes exclusively from **existing engines**. No new engine files may be created.

| KPI / Panel | Function to Call | Notes |
|---|---|---|
| Revenue Recognised | `getAllJobMargins(useStore().jobs)` → sum `r.summary.totalRevenue` | Approved revenue from active jobs |
| Costs Approved | `getAllJobMargins(useStore().jobs)` → sum `r.summary.totalCost` | Approved costs from active jobs |
| Gross Margin % | `(totalRevenue - totalCost) / totalRevenue * 100` | Derived from above — **do NOT re-implement** |
| Exposure (Pending) | `getPendingExposure()` → `.totalPendingCost` | From `profitabilityEngine`. Workflow state fact. Returns `PendingExposure` with `isEstimate: true`. Do NOT use `forecastEngine.computePortfolioForecast().totalExposure` — that is a projection requiring "Advisory Only" labelling. |
| Exposure item count | `getPendingExposure()` → `.pendingItemCount` | Displayed as "N unapproved items" |
| Job Profitability (top 4) | `getAllJobMargins(useStore().jobs).slice(0, 4)` | Already sorted by `hasActivity` first, then margin descending |
| Invoice Status Summary | `useStore().invoices` grouped by `status`, summed `amount` | |
| Payroll — next run, workers | Mock payroll schedule data | |
| Payroll — approved timesheets | `groupTimesheetsForPayroll(useStore().timesheets)` | **Must use `useStore().timesheets`** (the approved array) — NOT ReviewItem queue data. The function contains no approval filter; the caller must pass approved records only. |
| Payroll — pending timesheets | `useStore().reviewItems.filter(r => r.type === "timesheet" && r.status === "pending").length` | |
| Accounting Status — provider | `getDefaultProvider()` from `accountingSettingsEngine` | |
| Accounting Status — last sync | `computeSyncKPIs(SEED_SYNC_RECORDS)` from `accountingSyncEngine` | |
| Accounting Status — failures | `computeSyncKPIs(SEED_SYNC_RECORDS).failedCount` | |
| Open exceptions | `computeExceptionSummary(SEED_EXCEPTIONS).openCount` from `exceptionResolutionEngine` | |

> **Confirmation requirement:** Before writing `FinanceHubOverview.tsx`, the implementing engineer must open each engine file, confirm the function signatures above, and add a comment block at the top of the file mapping each KPI to its exact import path and function name.

### 2.9 Finance Overview — Overview CTA Routing

| CTA | testId | Navigates To |
|---|---|---|
| View All Records → | `btn-view-all-records` | `setLocation('/finance?tab=records')` |
| Open Invoicing → | `btn-open-invoicing` | `setLocation('/finance?tab=invoicing')` (or `...&filter=overdue` when overdue count > 0) |
| Open Payroll → | `btn-open-payroll` | `setLocation('/finance?tab=payroll')` |
| Open Accounting → | `btn-open-accounting` | Exceptions > 0: `setLocation('/finance?tab=accounting&sub=exceptions')` / else: `setLocation('/finance?tab=accounting')` |

### 2.10 PayrollHub and AccountingHub Structure

**PayrollHub** (`client/src/pages/finance-hub.tsx` or inline sub-component):

```tsx
interface PayrollHubProps {
  activeSub: string;
  onSubChange: (sub: string) => void;
}

// Inner role check — must verify CEO role even though hub route is CEO-gated
// This prevents accidental data exposure if outer RBAC is ever relaxed
// On role check failure: return <UnauthorizedPage /> (matches outer ProtectedRoute)

<div className="space-y-4">
  {/* Status banner */}
  <div className="flex items-center gap-3 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm"
       data-testid="payroll-status-banner">
    ...next run date, workers in scope, N ready, N pending...
  </div>

  <Tabs value={activeSub} onValueChange={onSubChange}>
    <TabsList>
      <TabsTrigger value="processing" data-testid="payroll-subtab-processing-queue">
        <Users className="h-3.5 w-3.5" /> Processing Queue
      </TabsTrigger>
      <TabsTrigger value="export" data-testid="payroll-subtab-export-history">
        <FileDown className="h-3.5 w-3.5" /> Export History
      </TabsTrigger>
    </TabsList>
    <TabsContent value="processing" data-testid="payroll-processing-queue-panel">
      <PayrollProcessingContent />
    </TabsContent>
    <TabsContent value="export" data-testid="payroll-export-history-panel">
      <PayrollExportContent />
    </TabsContent>
  </Tabs>
</div>
```

**AccountingHub** — same pattern with 4 sub-tabs: Sync Status / Reconciliation / Exceptions / Providers. Inner role check required. Failure state: `<UnauthorizedPage />`.

### 2.11 `financial-explorer.tsx` Internal Tab Cleanup

As part of this branch, remove the following sub-tabs from `FinancialRecordsContent`:
- `AccountingSyncTab` component reference and its `<TabsTrigger>`/`<TabsContent>`
- `ReconciliationTab` component reference and its `<TabsTrigger>`/`<TabsContent>`
- `ExceptionsTab` component reference and its `<TabsTrigger>`/`<TabsContent>`

These three sub-tabs are now exclusively in the Finance Hub Accounting tab (mounted from their respective extracted content components from `reconciliation-center.tsx` and `exception-resolution-center.tsx`). After removal, `FinancialRecordsContent` retains exactly **7 sub-tabs**: Timesheets / Expenses / Inventory / Equipment / Invoice Pipeline / Margin Intelligence / Forecast.

> If any existing doctrine tests assert on these sub-tab testIds within `/financial-explorer`, those assertions must be updated to navigate to `/finance?tab=accounting&sub=[reconciliation|exceptions|sync]` instead.

### 2.12 Architectural Risk Register

| Risk | Severity | Status |
|---|---|---|
| `<Layout>` double-wrapping | CRITICAL | Mitigated by explicit §2.3 instruction |
| `{ replace: true }` invalid Wouter arg | CRITICAL | Fixed in §2.4 `RedirectToFinance` |
| `InvoicingHub` undefined | CRITICAL | Resolved in §2.7 |
| FE internal tab duplication | CRITICAL | Resolved in §2.11 |
| Sub-tab RBAC gap | HIGH | Addressed in §2.10 (inner role check required) |
| Route ordering in App.tsx | HIGH | Exact order specified in §2.4 |
| `useSearch()` availability | LOW | Fallback specified in §2.5 |
| Sub-tab state reset | LOW | Documented as intentional in §2.5 |

---

## PART 3 — FINANCIAL DOCTRINE REQUIREMENTS

### 3.1 Overall Verdict

**COMPLIANT — with guardrails required.**

UX-4 introduces no new financial mutations, no new approval mechanisms, and no new automated financial actions.

### 3.2 Doctrine Compliance

| Doctrine | Status | Key Finding |
|---|---|---|
| Approval Doctrine | COMPLIANT | Zero new approval or mutation actions. Overview is read-only. |
| Audit Doctrine | COMPLIANT | Access audit events required for Finance Hub and Accounting/Exceptions sub-tabs — see §3.4 |
| Job Attribution Doctrine | COMPLIANT | Revenue KPI includes job attribution reference — see §3.3 G-003 |
| Financial Integrity Doctrine | COMPLIANT | Exposure KPI uses workflow fact source (`getPendingExposure()`), not a forecast projection |
| Financial Controls Doctrine | COMPLIANT | Exception count on Overview is display-only badge + deep-link |
| Reconciliation Doctrine | COMPLIANT | Reconciliation Centre mounted unmodified |
| Accounting Sync Doctrine | COMPLIANT | Sync metadata only; no trigger actions on Overview |
| Exception Resolution Doctrine | COMPLIANT | Exception Resolution Centre mounted unmodified; CEO approval workflow preserved |

### 3.3 Finance Overview Display Rules

**MAY display (all read-only):**
- Revenue Recognised (Current Month, period label on-screen, "Across N active jobs" attribution reference)
- Costs Approved (Current Month, period label on-screen)
- Gross Margin % (derived from approved figures via `getAllJobMargins()` — not a projection)
- Exposure / Pending (from `getPendingExposure().totalPendingCost` — workflow state fact, amber treatment, "Pending Approval" label, "As of [HH:MM]" timestamp)
- Job Profitability: top 4 jobs by margin — name, revenue, margin%, trend (all approved figures)
- Invoice counts and values by status
- Payroll: next run date, worker count, approved count, pending count (approved vs unapproved distinction explicit)
- Accounting: provider name, last sync timestamp, sync failure count (with urgency colouring), open exception count (with urgency colouring)

**MUST NOT display:**
- Any unapproved figure presented as financially real without the "Pending Approval" label
- Any data from downstream accounting systems presented as Ledger-origin truth
- Any create, edit, delete, approve, reject, sync, run, or retry button
- Any inline resolution panel for exceptions or reconciliation items
- Any financial projection without "Advisory Only" label
- Any financial figure without its temporal scope on-screen
- Any aggregate combining approved and unapproved values without explicit labelling of each component

### 3.4 Mandatory Doctrine Guardrails

| # | Guardrail |
|---|---|
| G-001 | No new financial engine files. Data from existing engines only. |
| G-002 | Exposure KPI: amber card treatment + "Pending Approval" label + "As of [HH:MM]" timestamp. The timestamp reflects the component mount time. Never grouped visually with approved figures without a structural separator. |
| G-003 | Revenue Recognised KPI card includes a "Across N active jobs" sub-label that scrolls to or links to the Job Profitability panel. This ensures the aggregate figure is never read in isolation from its job attribution. |
| G-004 | All KPIs carry visible period label: "Current Month" or equivalent. No financial figure appears without its temporal scope. |
| G-005 | Gross Margin uses `getAllJobMargins()` computation — not an inline `(revenue - cost) / revenue` formula. This ensures consistency with every other margin display in the platform. |
| G-006 | Exception and reconciliation counts are badge-only deep-links. No inline resolution panels on the Overview. |
| G-007 | Finance Hub `/finance` is CEO-only. All sub-tabs are CEO-only. No role relaxation. Inner role checks in `PayrollHub` and `AccountingHub` are required as a defence-in-depth measure. |
| G-008 | Mounted pages retain their own RBAC and doctrine protections, unmodified. The hub is a navigation shell only. |
| G-009 | Redirect routes preserve the functional integrity of the destination page. |
| G-010 | Accounting provider data is labelled as sync metadata, not Ledger financial truth. |
| G-011 | `groupTimesheetsForPayroll()` must be called with `useStore().timesheets` (the approved array). Never with ReviewItem queue data. |
| G-012 | `getPendingExposure()` is a workflow state fact (returns `isEstimate: true` to remind consumers it is pre-approval). It is not a forecast projection and does not require an "Advisory Only" label. However, the "As of [timestamp]" label is required because the queue changes as approvals occur. |
| G-013 | Sync failure urgency thresholds: 0 failures = `text-emerald-600`; 1–2 = `text-amber-600` with CTA; 3+ = `text-red-600` with direct CTA to Reconciliation Centre. |
| G-014 | KPI cards 1–3 (Revenue, Costs, Margin) and KPI card 4 (Exposure) are visually grouped separately. A structural separator — either a group label reading "Approved" above cards 1–3 and "Pending Approval" above card 4, or a distinct card border variant — must make the distinction unambiguous without relying solely on amber colouring. |

### 3.5 Required Audit Events

The Finance Hub must emit the following audit events, consistent with the ECC access audit pattern:

| Audit Event | Trigger | Fields |
|---|---|---|
| `finance_hub_viewed` | CEO loads `/finance` (any tab) | who, what, when |
| `finance_overview_viewed` | Overview tab content mounts | who, what, when |
| `finance_hub_accounting_tab_viewed` | Accounting tab activates | who, what, when |
| `finance_hub_exceptions_viewed` | Exceptions sub-tab within Accounting activates | who, what, when |
| `finance_hub_deep_link_opened` | CEO clicks any CTA from Overview | who, what, when, destination |

Tab switching between Records, Invoicing, and Payroll does not require audit records. Tab switching TO the Accounting tab and sub-tab switches within Accounting that reach the Exceptions sub-tab DO require audit records.

### 3.6 Data Approval Enforcement Requirement

All KPIs labelled "Approved" (Revenue Recognised, Costs Approved, Gross Margin) must be sourced from data that enforces approval status at the query or population level. In the prototype, `getAllJobMargins()` calls `getJobFinancialSummary()` which reads from arrays populated exclusively by the approval path — this is compliant by population convention. **This requirement must carry forward to the backend implementation specification**: backend queries for approved financial KPIs must carry an explicit `WHERE status = 'approved'` predicate (or equivalent domain-layer enforcement) — not rely on table population convention.

---

## PART 4 — RBAC REQUIREMENTS

### 4.1 Overall Verdict

**COMPLIANT — Option A applied.**

### 4.2 Role Review

| Role | Finance Hub Access | Status |
|---|---|---|
| CEO | Full — all 5 tabs, all sub-tabs | COMPLIANT |
| Project Manager | None — `/finance` returns UnauthorizedPage; `/invoices`, `/invoice-builder`, `/invoices/:id` revoked | COMPLIANT (Option A) |
| Worker | None — redirect to `/worker/jobs` | COMPLIANT |
| Client | None — separate portal context | COMPLIANT |
| Admin | None — UnauthorizedPage (no redirect) | ACKNOWLEDGED — pre-existing gap, not in scope for UX-4 |

### 4.3 Navigation Gating Rules

| Rule | Requirement |
|---|---|
| NG-01 | `/finance` is `ProtectedRoute` with `roles: ["CEO"]` |
| NG-02 | Finance nav item in `layout.tsx` declares `roles: ["CEO"]` |
| NG-03 | All 5 tabs and all sub-tabs are rendered only inside the CEO-gated hub |
| NG-04 | All redirect routes carry `roles: ["CEO"]` on their `ProtectedRoute` |
| NG-05 | `PayrollHub` and `AccountingHub` contain an inner CEO role check; failure renders `<UnauthorizedPage />` |
| NG-06 | Client portal (`/portal`) contains no reference to `/finance` |
| NG-07 | `/invoices`, `/invoice-builder`, `/invoices/:id` changed to `roles: ["CEO"]` in App.tsx (Option A) |

### 4.4 Option A — Full Impact

**Option A is selected.** PM invoice access is fully revoked.

Files to update under Option A (all included in Appendix A):

| File | Change |
|---|---|
| `client/src/App.tsx` | Change `/invoices`, `/invoice-builder`, `/invoices/:id` from `roles: ["CEO", "Project Manager"]` to `roles: ["CEO"]` |
| `client/src/components/layout.tsx` | Remove `Invoices` and `Invoice Builder` from `OPERATIONAL_ITEMS` entirely (done as part of hub nav changes) |
| `client/src/pages/job-detail.tsx` | Remove "View Invoice" button (line 212) and "Invoice Builder" button (line 363) |

**PM experience post-Option A:** PMs navigating to `/invoices` or `/invoice-builder` receive `UnauthorizedPage`. PMs using the `job-detail.tsx` page no longer see invoice or builder buttons — those sections of the page are removed. No redirects to the Finance Hub are shown to PMs.

### 4.5 Redirect Safety

All 9 redirect routes (including `/invoices/:id`) are declared with `roles: ["CEO"]`. No PM, Worker, or Client role can trigger a redirect to the Finance Hub — they receive `UnauthorizedPage` at the redirect route, consistent with all other CEO-only routes.

| Legacy Route | Roles Before | Roles After | Action |
|---|---|---|---|
| `/financial-explorer` | CEO | CEO | Redirect to `/finance?tab=records` |
| `/invoices` | CEO, PM | CEO | Redirect to `/finance?tab=invoicing` |
| `/invoices/:id` | CEO, PM | CEO | Redirect to `/finance?tab=invoicing` |
| `/invoice-builder` | CEO, PM | CEO | Redirect to `/finance?tab=invoicing` |
| `/payroll` | CEO | CEO | Redirect to `/finance?tab=payroll` |
| `/payroll-export` | CEO | CEO | Redirect to `/finance?tab=payroll&sub=export` |
| `/accounting-settings` | CEO | CEO | Redirect to `/finance?tab=accounting` |
| `/reconciliation-center` | CEO | CEO | Redirect to `/finance?tab=accounting&sub=reconciliation` |
| `/exception-resolution-center` | CEO | CEO | Redirect to `/finance?tab=accounting&sub=exceptions` |

### 4.6 Notification Deep-Link Handling

`notificationEngine.ts`, `activityFeedEngine.ts`, `eventBusEngine.ts`, `executiveCommandEngine.ts`, and `analyticsEngine.ts` all store `sourceRoute` strings pointing to legacy destinations. After updating these strings (§2.4), notification deep-links will navigate directly to the correct Finance Hub tab without an intermediate redirect. The Notification Centre is accessible to PMs (existing RBAC); however, all updated `sourceRoute` values now point to CEO-only Finance Hub tabs. A PM clicking a notification deep-link to `/finance?tab=accounting&sub=exceptions` will receive `UnauthorizedPage`.

**This is accepted as a known limitation.** PM-accessible notifications should ideally not deep-link to CEO-only surfaces. Addressing this at the notification engine level (filtering notification types by destination RBAC) is deferred to a future phase. The current behaviour is an improvement over the pre-UX-4 state — previously PMs would be redirected through the legacy route and receive `UnauthorizedPage` there; now they receive it at the Finance Hub directly.

### 4.7 `/expenses` Route — Pre-Existing Doctrine Note

`/expenses` is excluded from Finance Hub consolidation (it is an operational expense submission surface, not a financial intelligence surface). The route currently carries no `roles` prop in `ProtectedRoute` — meaning any authenticated user including Workers can access it. This is a pre-existing tension with the Worker financial-visibility doctrine. **Resolving this is out of scope for UX-4 and deferred to a dedicated RBAC hardening phase.** The spec acknowledges it so it is not overlooked.

---

## PART 5 — UX BLUEPRINT

### 5.1 UX Score Targets

| Dimension | Target /10 |
|---|---|
| Discoverability | 9 |
| Efficiency | 9 |
| Simplicity | 8 |
| Cognitive Load | 8 |
| Role Alignment | 10 |

**Overall target: 8.8 / 10**

### 5.2 Finance Overview Wireframe

```
/finance  [Overview] [Records] [Invoicing] [Payroll] [Accounting]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
FINANCE

┌─── APPROVED ──────────────────────────────────────────────┐
│ ┌───────────────┐ ┌───────────────┐ ┌───────────────┐     │
│ │ Revenue       │ │ Costs         │ │ Gross Margin  │     │
│ │ Recognised    │ │ Approved      │ │               │     │
│ │ Current Month │ │ Current Month │ │ Current Month │     │
│ │  £284,500     │ │  £191,200     │ │   32.8%       │     │
│ │  ↑ +8%        │ │  ↓ -2%        │ │   ↑ on target │     │
│ │ Across 9 jobs ↗│ │               │ │               │     │
│ └───────────────┘ └───────────────┘ └───────────────┘     │
└────────────────────────────────────────────────────────────┘
┌─── PENDING APPROVAL ──────────────────────────────────────┐
│ ┌───────────────────────────────────────────────────────┐  │
│ │ Exposure          Pending Approval    As of 09:14     │  │
│ │  £47,300    ⚠    18 unapproved items                 │  │
│ └───────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────┐ ┌──────────────────────────┐
│ JOB PROFITABILITY                    │ │ INVOICE STATUS            │
│                                      │ │                           │
│ Job             Revenue Margin Trend │ │ Draft   3    £8,400       │
│ Heathrow T3     £48k    38%    ↑    │ │ Sent    8   £142,000      │
│ Canary Wharf    £32k    29%    →    │ │ Overdue ⚠  4   £24,800    │
│ Victoria Sq.    £18k    22%    ↓    │ │ Paid   12   £318,000      │
│ + 6 more...                          │ │                           │
│            View All Records →        │ │     Open Invoicing →      │
└──────────────────────────────────────┘ └──────────────────────────┘

┌──────────────────────────────────────┐ ┌──────────────────────────┐
│ ACCOUNTING STATUS                    │ │ PAYROLL STATUS            │
│ ✓ Xero — Connected                  │ │ Next run: 13 Jun 2026     │
│ Last sync: Today 09:14               │ │ 28 workers in scope       │
│ ██ 3 sync failures  ⚠               │ │ 25 approved / 3 pending ⚠│
│ 3 open exceptions  ⚠                │ │                           │
│             Open Accounting →        │ │     Open Payroll →        │
└──────────────────────────────────────┘ └──────────────────────────┘
```

**Note on KPI grouping:** The "Approved" group label above Revenue/Costs/Margin cards and the "Pending Approval" group label above the Exposure card provide the structural separation required by G-014. These labels appear as `text-xs text-muted-foreground uppercase tracking-wide` section headings above each card group.

### 5.3 Primary CEO Finance Workflow

```
Step 1 — Pulse (30 seconds)
  CEO opens Finance Hub → Overview tab.
  Reads Approved KPI strip: Revenue £284k / Costs £191k / Margin 32.8%
  Reads Pending KPI: Exposure £47k / 18 items
  Notes Invoice: 4 overdue highlighted red
  Notes Payroll: 3 pending timesheets (amber)
  Notes Accounting: 3 sync failures (amber), 3 exceptions (amber)
  Decision: Invoices first.

Step 2 — Invoicing (5–10 minutes)
  Clicks "Open Invoicing →" — navigates to Invoicing tab
  Overdue filter applied (4 items shown)
  Reviews overdue invoices.

Step 3 — Payroll (5 minutes)
  Clicks Payroll tab.
  Status banner: next run + workers + 25 ready / 3 pending.
  Navigates to Review Centre via sidebar badge to approve pending timesheets.
  Returns to Finance → Payroll tab.

Step 4 — Accounting Exceptions (5 minutes)
  Clicks "Open Accounting →" — navigates to Accounting → Exceptions sub-tab
  (because exceptions > 0, the CTA deep-links directly to exceptions)
  Reviews 3 open exceptions, assigns investigations.

Total: under 20 minutes. Never left the hub except for Review Centre.
```

### 5.4 UX Risk Register

| ID | Severity | Finding | Resolution in v1.1 |
|---|---|---|---|
| UX-4-R1 | Critical | 14 nav testIds removed — Playwright regressions | Regression list in §7.5, sequenced to Day 1 |
| UX-4-R2 | High | `<Layout>` double-wrapping | §2.3 explicitly mandates `<Layout>` removal |
| UX-4-R3 | High | Wouter `useSearch()` availability | §2.5 documents fallback |
| UX-4-R4 | Medium | Accounting Settings removed from ADMIN | §2.4 adds ADMIN deep-link pointer |
| UX-4-R5 | Medium | Invoice Builder inline vs slide-over | Resolved: `<Sheet>` slide-over (§2.7) |
| UX-4-R6 | Medium | `/expenses` must NOT go into Finance Hub | Confirmed excluded; documented in §4.7 |
| UX-4-R7 | Low | Page h1 should reflect active tab | Dynamic heading: `Finance — {activeTabLabel}` |
| UX-4-R8 | Low | "This Period" period ambiguity | Resolved: Current Month (OD-2) |

### 5.5 Mobile Considerations

| Element | Mobile Adaptation |
|---|---|
| Hub tab bar (5 tabs) | `overflow-x-auto` + `whitespace-nowrap` on triggers |
| Sub-tab bars (Payroll/Accounting) | Replace with `<Select>` dropdown on `< 640px` |
| Invoice Builder | Full-screen `<Sheet side="bottom">` on mobile |
| KPI Strip (Approved group) | 3-col → 1-col at mobile |
| Exposure card | Full-width below Approved group on mobile |
| Job Profitability table | Name + Margin columns on mobile; Revenue via row expand |

---

## PART 6 — DESIGN SYSTEM REQUIREMENTS

### 6.1 Design System Conventions

All Finance Hub components use Tailwind + shadcn/ui + Lucide React. No custom CSS. No non-shadcn components. No non-Lucide icons. Reference implementation: `automations.tsx` (hub tab pattern).

### 6.2 Hub Page Layout

```tsx
<Layout>
  <div className="space-y-6 p-6" data-testid="finance-hub-page">
    <div>
      <h1 className="text-2xl font-bold" data-testid="finance-hub-heading">
        Finance{activeTab !== "overview" ? ` — ${tabLabels[activeTab]}` : ""}
      </h1>
      <p className="text-sm text-muted-foreground mt-1">
        Revenue, costs, payroll, invoicing and accounting — in one place.
      </p>
    </div>

    <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-6">
      <TabsList className="flex flex-wrap h-auto gap-1">
        <TabsTrigger value="overview"   className="flex items-center gap-1.5" data-testid="finance-tab-overview">
          <LayoutDashboard className="h-3.5 w-3.5" /> Overview
        </TabsTrigger>
        <TabsTrigger value="records"    className="flex items-center gap-1.5" data-testid="finance-tab-records">
          <Layers className="h-3.5 w-3.5" /> Records
        </TabsTrigger>
        <TabsTrigger value="invoicing"  className="flex items-center gap-1.5" data-testid="finance-tab-invoicing">
          <FileText className="h-3.5 w-3.5" /> Invoicing
        </TabsTrigger>
        <TabsTrigger value="payroll"    className="flex items-center gap-1.5" data-testid="finance-tab-payroll">
          <Wallet className="h-3.5 w-3.5" /> Payroll
        </TabsTrigger>
        <TabsTrigger value="accounting" className="flex items-center gap-1.5" data-testid="finance-tab-accounting">
          <Link2 className="h-3.5 w-3.5" /> Accounting
        </TabsTrigger>
      </TabsList>
    </Tabs>
  </div>
</Layout>
```

### 6.3 KPI Strip — Exact Specification

**Approved group (3 cards):**

```tsx
<div>
  <p className="text-xs text-muted-foreground uppercase tracking-wide mb-2">Approved</p>
  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4" data-testid="finance-kpi-strip-approved">
    <Card data-testid="kpi-card-revenue">
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm text-muted-foreground">Revenue Recognised</p>
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
        </div>
        <p className="text-2xl font-bold" data-testid="kpi-value-revenue">£284,500</p>
        <p className="text-xs text-emerald-600 flex items-center gap-1 mt-1">
          <ArrowUp className="h-3 w-3" /> +8% vs last period
        </p>
        {/* Job attribution reference — G-003 */}
        <button className="text-xs text-muted-foreground hover:text-foreground mt-1"
                onClick={scrollToJobProfitability}>
          Across {activeJobCount} active jobs ↗
        </button>
      </CardContent>
    </Card>
    {/* Costs and Margin cards — same structure, no attribution button */}
  </div>
</div>
```

**Pending Approval group (1 card, full width):**

```tsx
<div>
  <p className="text-xs text-muted-foreground uppercase tracking-wide mb-2">Pending Approval</p>
  <Card data-testid="kpi-card-exposure" className="border-amber-200 bg-amber-50/30">
    <CardContent className="p-6">
      <div className="flex items-center justify-between mb-2">
        <p className="text-sm text-amber-700">Exposure</p>
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-amber-500" />
          <p className="text-xs text-amber-600">Pending Approval</p>
        </div>
      </div>
      <p className="text-2xl font-bold" data-testid="kpi-value-exposure">£47,300</p>
      <p className="text-xs text-amber-600 flex items-center gap-1 mt-1">
        {pendingItemCount} unapproved items
      </p>
      <p className="text-xs text-muted-foreground mt-0.5">
        As of {mountTimestamp}
      </p>
    </CardContent>
  </Card>
</div>
```

**Rules:** No `CardHeader` or `CardTitle`. Single `CardContent className="p-6"`. Value always `text-2xl font-bold`. Approved cards: white background, default border. Exposure card: `border-amber-200 bg-amber-50/30`. This structural separation implements G-014.

### 6.4 Icon Assignments

| Location | Icon |
|---|---|
| Finance nav item | `DollarSign` |
| Overview tab | `LayoutDashboard` |
| Records tab | `Layers` |
| Invoicing tab | `FileText` |
| Payroll tab | `Wallet` |
| Accounting tab | `Link2` |
| Revenue KPI card | `TrendingUp` |
| Costs KPI card | `Receipt` |
| Margin KPI card | `Percent` |
| Exposure KPI card | `AlertTriangle` (amber) |
| Processing Queue sub-tab | `Users` |
| Export History sub-tab | `FileDown` |
| Sync Status sub-tab | `RefreshCw` |
| Reconciliation sub-tab | `GitMerge` |
| Exceptions sub-tab | `TriangleAlert` |
| Providers sub-tab | `Link2` |

### 6.5 Status Colour Conventions

**Invoice status badges:**

| Status | Badge Variant | Value Text |
|---|---|---|
| Draft | `secondary` | `text-foreground` |
| Sent | `outline` | `text-foreground` |
| Overdue | `destructive` | `text-red-600 font-medium` |
| Paid | `default` + `bg-emerald-50 text-emerald-700 border-emerald-200` | `text-emerald-600` |

**Sync failure count (G-013):**

| Count | Text Class | Action |
|---|---|---|
| 0 | `text-emerald-600` | None |
| 1–2 | `text-amber-600` | CTA to Sync Status sub-tab |
| 3+ | `text-red-600 font-semibold` | CTA directly to Reconciliation sub-tab |

**Exception count:**

| Count | Text Class |
|---|---|
| 0 | `text-emerald-600` |
| 1–4 | `text-amber-600` |
| 5+ | `text-red-600` |

**Payroll pending timesheets:**

| Count | Text Class |
|---|---|
| 0 | `text-emerald-600` |
| 1–5 | `text-amber-600` |
| 6+ | `text-red-600` |

**Job margin trend:**

| Direction | Icon | Colour |
|---|---|---|
| Improving | `TrendingUp` | `text-emerald-600` |
| Flat | `Minus` | `text-slate-500` |
| Declining | `TrendingDown` | `text-red-600` |

**Payroll status banner:**
```tsx
className="flex items-center gap-3 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm"
// "N ready" → text-emerald-600 font-medium
// "N pending" → text-amber-600 font-medium
```

### 6.6 Design Debt Risks

| ID | Severity | Risk | Prevention |
|---|---|---|---|
| DS-001 | HIGH | Embedded pages render `text-3xl` headings inside the hub | Suppress page-level heading in extracted content; hub provides `<h1>` |
| DS-002 | CRITICAL | Double `<Layout>` wrapping | Resolved by §2.3 explicit instruction |
| DS-003 | MEDIUM | KPI padding copied from `payroll.tsx` | Approved group cards use `p-6`; Exposure card uses `p-6` |
| DS-004 | MEDIUM | Custom active state on `TabsTrigger` | Use shadcn default; no `bg-*` or `border-b-2` overrides |
| DS-005 | HIGH | Nav items removed without atomic commit | Remove + add in same commit (Day 1) |
| DS-006 | HIGH | Legacy nav testIds removed without test updates | 14 regression files updated on Day 1 |

### 6.7 Anti-Patterns (Forbidden)

- `CardHeader` / `CardTitle` inside the KPI strip cards
- `border-b-2 border-primary` active indicator on `TabsTrigger`
- URL path segments for tab state — use `?tab=records` not `/finance/records`
- Breadcrumb rendered inside `TabsContent`
- `text-green-*` — use `text-emerald-*`
- Missing `data-testid` on any tab trigger, KPI card, or status block
- Entire card as a click target — only ghost button CTAs are clickable
- `import { Layout }` inside `FinanceHubOverview`, `InvoicingHub`, `PayrollHub`, or `AccountingHub`
- Calling `handleTabChange` and then reading `activeTab` synchronously in the same handler

---

## PART 7 — TESTING REQUIREMENTS

### 7.1 Test Files

```
tests/doctrine/finance-hub.spec.ts    — RBAC + doctrine tests (FH-01–FH-06, FH-41–FH-43)
tests/finance-hub.spec.ts             — Feature tests (FH-07–FH-40)
```

### 7.2 Coverage Matrix

| Test ID | Scenario | Priority | Doctrine |
|---|---|---|---|
| FH-01 | CEO can access `/finance` | P0 | RBAC |
| FH-02 | PM cannot access `/finance` | P0 | RBAC |
| FH-03 | Worker cannot access `/finance` | P0 | RBAC |
| FH-04 | Finance nav item visible to CEO | P0 | RBAC |
| FH-05 | Finance nav item hidden from PM | P0 | RBAC |
| FH-06 | Finance nav item hidden from Worker | P0 | RBAC |
| FH-07 | Hub page container renders | P0 | — |
| FH-08 | Default tab is Overview | P0 | — |
| FH-09 | KPI strip renders Approved group (3 cards) | P0 | — |
| FH-10 | Exposure card renders in Pending Approval group | P0 | Approval Doctrine |
| FH-11 | Each KPI card has non-empty value | P1 | — |
| FH-12 | Exposure card has amber styling and "Pending Approval" label | P0 | Approval Doctrine |
| FH-13 | Revenue card has "Across N active jobs" attribution reference | P1 | Job Attribution |
| FH-14 | Invoice Status Summary renders all 4 status groups | P1 | — |
| FH-15 | Payroll Status block renders | P1 | — |
| FH-16 | Accounting Status block renders | P1 | — |
| FH-17 | Sync failure count colour-codes correctly at thresholds | P1 | Accounting Sync Doctrine |
| FH-18 | "View All Records →" navigates to Records tab | P1 | — |
| FH-19 | "Open Invoicing →" navigates to Invoicing tab | P1 | — |
| FH-20 | "Open Payroll →" navigates to Payroll tab | P1 | — |
| FH-21 | "Open Accounting →" navigates to Accounting → Exceptions when exceptions > 0 | P1 | — |
| FH-22 | All 5 tab buttons visible | P0 | — |
| FH-23 | Tab click updates URL param | P0 | — |
| FH-24 | Deep-link `?tab=records` works | P0 | — |
| FH-25 | Deep-link `?tab=invoicing` works | P0 | — |
| FH-26 | Deep-link `?tab=payroll` works | P1 | — |
| FH-27 | Deep-link `?tab=accounting` works | P1 | — |
| FH-28 | Records tab shows "Financial Records" heading | P0 | Naming |
| FH-29 | Records tab renders 7 sub-tabs (not 10 — Accounting tabs removed) | P0 | — |
| FH-30 | Records tab has no Accounting Sync, Reconciliation, or Exceptions sub-tabs | P0 | — |
| FH-31 | Invoicing tab renders invoice list | P0 | — |
| FH-32 | Invoicing tab renders status filter tabs | P1 | — |
| FH-33 | "+ Create Invoice" button visible | P1 | — |
| FH-34 | Payroll sub-tabs visible | P1 | — |
| FH-35 | Payroll status banner renders | P1 | — |
| FH-36 | Payroll: Processing Queue content | P1 | — |
| FH-37 | Accounting: four sub-tabs visible | P1 | — |
| FH-38 | Accounting: Reconciliation content mounts | P1 | — |
| FH-39 | `/financial-explorer` redirects to Finance Hub | P0 | — |
| FH-40 | `/payroll` redirects to Finance Hub | P0 | — |
| FH-41 | Overview has no approve/reject buttons | P0 | Approval Doctrine |
| FH-42 | Overview has no financial mutation controls | P0 | Financial Integrity |
| FH-43 | Finance nav absent from PM sidebar | P0 | RBAC Doctrine |

### 7.3 Key P0 Test Specifications

**FH-02 — PM denied `/finance`**
```
1. clearBrowserState(page)
2. loginAsPM(page)
3. page.goto('BASE/finance')
4. expect(page.getByTestId('finance-hub-page')).not.toBeVisible()
   — OR — await page.waitForURL(url => !url.includes('/finance'), { timeout: 5000 })
```

**FH-10 — Exposure card in Pending Approval group**
```
1. loginAsCEO + goto('/finance')
2. expect(page.getByTestId('kpi-card-exposure')).toBeVisible()
3. expect(page.getByTestId('kpi-card-exposure')).toContainText('Pending Approval')
4. expect(page.getByTestId('kpi-card-exposure')).toContainText('As of')
```

**FH-12 — Exposure card amber styling**
```
1. loginAsCEO + goto('/finance')
2. const card = page.getByTestId('kpi-card-exposure')
3. await expect(card).toBeVisible()
4. await expect(card).toHaveClass(/amber/)  OR
   await expect(card).not.toHaveClass(/bg-white|bg-card/)
   (verify amber background class is present)
```

**FH-29 — Records tab has 7 sub-tabs, not 10**
```
1. loginAsCEO + goto('/finance?tab=records')
2. expect(page.getByTestId('finance-tab-records')).toHaveAttribute('data-state', 'active')
3. Count visible sub-tab triggers inside finance-records-panel
4. expect(subtabCount).toBe(7)
```

**FH-30 — No Accounting Sync / Reconciliation / Exceptions in Records tab**
```
1. loginAsCEO + goto('/finance?tab=records')
2. const recordsPanel = page.getByTestId('finance-records-panel')
3. expect(recordsPanel.getByText(/Accounting Sync/i)).not.toBeVisible()
4. expect(recordsPanel.getByText(/Reconciliation/i)).not.toBeVisible()
5. expect(recordsPanel.getByText(/Exceptions/i)).not.toBeVisible()
```

**FH-41 — Overview has no approve/reject buttons**
```
1. loginAsCEO + goto('/finance')
2. const overview = page.getByTestId('finance-overview-panel')
3. expect(overview.getByTestId('btn-approve')).not.toBeVisible()
4. expect(overview.getByTestId('btn-reject')).not.toBeVisible()
5. expect(overview.locator('input, select, textarea')).toHaveCount(0)
```

### 7.4 Complete data-testid List

**Hub container:**
`finance-hub-page` · `finance-hub-heading`

**Tab triggers:**
`finance-tab-overview` · `finance-tab-records` · `finance-tab-invoicing` · `finance-tab-payroll` · `finance-tab-accounting`

**Tab panels:**
`finance-overview-panel` · `finance-records-panel` · `finance-invoicing-panel` · `finance-payroll-panel` · `finance-accounting-panel`

**Overview — KPI strip (approved group):**
`finance-kpi-strip-approved` · `kpi-card-revenue` · `kpi-card-costs` · `kpi-card-margin` · `kpi-value-revenue` · `kpi-value-costs` · `kpi-value-margin`

**Overview — KPI strip (pending group):**
`finance-kpi-strip-pending` · `kpi-card-exposure` · `kpi-value-exposure`

**Overview — panels:**
`finance-job-profitability-panel` · `finance-invoice-status-summary` · `finance-payroll-status-block` · `finance-accounting-status-block`

**Overview — invoice status rows:**
`invoice-status-row-draft` · `invoice-status-row-sent` · `invoice-status-row-overdue` · `invoice-status-row-paid`

**Overview — CTA buttons:**
`btn-view-all-records` · `btn-open-invoicing` · `btn-open-payroll` · `btn-open-accounting`

**Records tab:**
`finance-records-heading`

**Invoicing tab:**
`invoice-list-container` · `invoice-filter-all` · `invoice-filter-draft` · `invoice-filter-sent` · `invoice-filter-overdue` · `invoice-filter-paid` · `btn-create-invoice`

**Payroll tab:**
`payroll-status-banner` · `payroll-subtab-processing-queue` · `payroll-subtab-export-history` · `payroll-processing-queue-panel` · `payroll-export-history-panel`

**Accounting tab:**
`accounting-subtab-sync-status` · `accounting-subtab-reconciliation` · `accounting-subtab-exceptions` · `accounting-subtab-providers` · `accounting-sync-status-panel` · `accounting-reconciliation-panel` · `accounting-exceptions-panel` · `accounting-providers-panel`

**Navigation:**
`nav-finance-hub` · `nav-admin-accounting-settings`

### 7.5 Regression Update Plan (14 files)

All 14 files must be updated on **Day 1**, before or in the same commit as the nav item changes.

| File | Risk | Required Change |
|---|---|---|
| `tests/doctrine/financial-explorer.spec.ts` | HIGH | Replace `nav-financial-explorer` clicks with `page.goto('/finance?tab=records')`. Update URL assertion to `/finance/`. Update heading assertion to "Financial Records". Remove sub-tab assertions for Accounting Sync, Reconciliation, Exceptions (now tested in finance-hub.spec.ts). |
| `tests/doctrine/invoice-pipeline.spec.ts` | HIGH | Change `page.goto('/invoice-builder')` to `page.goto('/finance?tab=invoicing')`. Change `/financial-explorer` goto to `/finance?tab=records`. |
| `tests/doctrine/payroll-staging.spec.ts` | MEDIUM | Replace `nav-payroll-staging` click with `page.goto('/finance?tab=payroll')`. Update URL assertion to `tab=payroll`. |
| `tests/doctrine/payroll-export.spec.ts` | HIGH | Change all `/payroll-export` gotos to `/finance?tab=payroll&sub=export`. Update URL assertions. |
| `tests/doctrine/accounting-settings.spec.ts` | HIGH | Change all base URLs from `/accounting-settings` to `/finance?tab=accounting`. Verify `accounting-settings-page` testId exists within `accounting-providers-panel`. |
| `tests/doctrine/reconciliation-center.spec.ts` | MEDIUM | Change all gotos from `/reconciliation-center` to `/finance?tab=accounting&sub=reconciliation`. Update URL assertions. Update RC-15 FE reference. |
| `tests/doctrine/exception-resolution.spec.ts` | MEDIUM | Change all gotos to `/finance?tab=accounting&sub=exceptions`. |
| `tests/doctrine/activity-feed.spec.ts` | HIGH | Update deep-link URL assertions from legacy routes to Finance Hub equivalents. AF-23 and similar tests that assert `/financial-explorer` URLs must assert `/finance?tab=records`. |
| `tests/doctrine/event-bus.spec.ts` | HIGH | Update deep-link URL assertions to Finance Hub equivalents. |
| `tests/doctrine/executive-command-centre.spec.ts` | HIGH | ECC-21: update from `/reconciliation-center` to `/finance?tab=accounting&sub=reconciliation`. ECC-22: update from `/financial-explorer` to `/finance?tab=records`. ECC-27: update from `/exception-resolution-center` to `/finance?tab=accounting&sub=exceptions`. |
| `tests/doctrine/margin-intelligence.spec.ts` | MEDIUM | Update all `toHaveURL(/financial-explorer/)` assertions to `toHaveURL(/finance/)`. |
| `tests/doctrine/revenue-normalization.spec.ts` | MEDIUM | Update `/financial-explorer` URL assertions to `/finance?tab=records`. |
| `tests/doctrine/accounting-sync.spec.ts` | MEDIUM | Verify for `/financial-explorer` or `/accounting-settings` direct gotos; update to Finance Hub equivalents. |
| `tests/accounting-settings.spec.ts` (top-level) | HIGH | Update all direct `/accounting-settings` gotos to `/finance?tab=accounting`. |

### 7.6 Playwright Patterns

```typescript
// Tab active state detection (shadcn Tabs — data-state attribute)
await expect(page.getByTestId('finance-tab-overview'))
  .toHaveAttribute('data-state', 'active');

// Redirect verification
await page.goto(`${BASE}/financial-explorer`);
await page.waitForURL(/\/finance/, { timeout: 5000 });
await expect(page).toHaveURL(/\/finance/);

// Scoped doctrine assertion
const overview = page.getByTestId('finance-overview-panel');
await expect(overview.getByTestId('btn-approve')).not.toBeVisible();

// Exposure card amber style check
await expect(page.getByTestId('kpi-card-exposure')).toHaveClass(/amber/);

// Sub-tab count assertion
const subtabs = page.getByTestId('finance-records-panel').locator('[role="tab"]');
await expect(subtabs).toHaveCount(7);

// Redirect does not fire for PM
await loginAsPM(page);
await page.goto(`${BASE}/invoices`);
await expect(page.getByTestId('finance-hub-page')).not.toBeVisible();
```

---

## PART 8 — IMPLEMENTATION PLAN

### 8.1 Prerequisites Checklist

Before creating `feature/ux4-finance-hub`:

- [ ] PR `feature/ux-phases-1-2-3` merged to main
- [ ] `git pull` on main; confirm 501/501 tests passing
- [ ] Playwright test audit: grep all 14 regression files for legacy route strings and nav testIds
- [ ] Confirm `useSearch()` is exported from installed Wouter version
- [ ] Confirm engine function signatures from `client/src/lib/` (§2.8 mapping)
- [ ] Option A recorded in branch description and handoff

### 8.2 Implementation Sequence (8 Days)

**Day 1 — Route, hub shell, navigation, ALL regression updates**
- Create `feature/ux4-finance-hub` branch
- Create `client/src/pages/finance-hub.tsx` with 5-tab shell (placeholder `<div>` per tab)
- Add `/finance` route + 9 redirect routes to `App.tsx` (correct order per §2.4)
- Update `/invoices`, `/invoice-builder`, `/invoices/:id` to `roles: ["CEO"]`
- Update `layout.tsx`: remove 8 items, add Finance nav item, add ADMIN deep-link, fix active state logic
- Update `dashboard.tsx`: both CTA setLocation calls
- Update `job-detail.tsx`: remove PM invoice buttons
- Update 16 engine/component files: `sourceRoute` strings + `setLocation` calls (§2.4)
- Update all 14 regression test files (§7.5)
- Verify: build passes, CEO sees Finance nav, PM does not, redirects work, CI green
- Commit: `chore: UX-4 Day 1 — hub shell, routes, nav, regression updates`

**Day 2 — Content extraction: financial-explorer, invoices, invoice-builder**
- Extract `FinancialRecordsContent` from `financial-explorer.tsx`
  - Remove `<Layout>` wrapper
  - Remove `AccountingSyncTab`, `ReconciliationTab`, `ExceptionsTab` sub-tabs → 7 sub-tabs remain
- Extract `InvoicesContent` and `InvoiceBuilderContent`
- Build `InvoicingHub.tsx` (Sheet + filter tabs — §2.7)
- Wire Records tab and Invoicing tab in `finance-hub.tsx`
- Verify: FH-24, FH-25, FH-28, FH-29, FH-30, FH-31, FH-32, FH-33 pass

**Day 3 — Content extraction: payroll, payroll-export + PayrollHub**
- Extract `PayrollProcessingContent` and `PayrollExportContent`
- Build `PayrollHub` (status banner + 2 sub-tabs + inner role check)
- Wire Payroll tab
- Verify: FH-26, FH-34, FH-35, FH-36 pass

**Day 4 — Content extraction: accounting-settings, reconciliation-center, exception-resolution-center + AccountingHub**
- Extract `AccountingSettingsContent`, `ReconciliationContent`, `ExceptionResolutionContent`
- Build `AccountingHub` (4 sub-tabs + inner role check)
- Wire Accounting tab
- Verify: FH-27, FH-37, FH-38 pass

**Day 5 — Finance Overview tab**
- Build `client/src/components/finance/FinanceHubOverview.tsx`
- Confirm all engine function signatures before writing any data calls
- Implement Approved KPI group (3 cards) sourced from `getAllJobMargins()`
- Implement Exposure card (amber group, `getPendingExposure()`, timestamp)
- Implement Job Profitability panel, Invoice Status Summary, Payroll Status, Accounting Status
- Implement all CTA navigation logic (including conditional Exceptions deep-link)
- Implement audit event emission (§3.5: 3 hub-level events)
- Add audit events for Accounting tab and Exceptions sub-tab activation (in `finance-hub.tsx`)
- Verify: FH-08–FH-21, FH-41, FH-42 pass

**Day 6 — RBAC verification + full regression run**
- Run full Playwright suite — target: 501 baseline + new tests = ≥501 passing
- Verify: PM denied at `/finance`, `/invoices`, `/invoice-builder`
- Verify: `job-detail.tsx` has no invoice buttons
- Fix any regressions discovered
- Commit all Day 2–6 work: `feat: UX-4 Finance Hub — hub, tabs, overview, RBAC`

**Day 7 — Write all new tests**
- Write `tests/doctrine/finance-hub.spec.ts` (FH-01–FH-06, FH-41–FH-43)
- Write `tests/finance-hub.spec.ts` (FH-07–FH-40)
- Run new tests against implementation

**Day 8 — Full verification, handoff, PR**
- Run complete test suite — target: 501 + 43 = 544 tests passing (0 failures)
- Fix any test failures
- Write `docs/handoffs/ux4-finance-hub-handoff.md`
- Update `docs/ux/UX_REDESIGN_PROGRAMME.md` Section 9 tracker
- Commit, push, create PR
- Stop

### 8.3 Git Workflow

```bash
git checkout main && git pull
git checkout -b feature/ux4-finance-hub
# Days 1–8 implementation
git add -A
git commit -m "feat: UX-4 Finance Hub — consolidate 8 finance routes into /finance hub with 5 tabs

- CEO-only Finance Hub at /finance with Overview/Records/Invoicing/Payroll/Accounting tabs
- Finance Overview: KPI strip (approved group + pending exposure), 4 summary panels
- Records tab: 7 operational sub-tabs (AccountingSyncTab/ReconciliationTab/ExceptionsTab removed)
- Invoicing tab: InvoicingHub with Sheet-based Invoice Builder
- Payroll tab: PayrollHub with Processing Queue / Export History sub-tabs
- Accounting tab: AccountingHub with Sync / Reconciliation / Exceptions / Providers sub-tabs
- Option A: PM invoice access revoked (/invoices, /invoice-builder, /invoices/:id → CEO only)
- 9 redirect routes for legacy paths
- 16 engine/component sourceRoute strings updated
- 14 regression test files updated
- 43 new Playwright tests (FH-01–FH-43)
- Doctrine: COMPLIANT"

git push origin feature/ux4-finance-hub
# Open PR → stop
```

### 8.4 Handoff Requirements

`docs/handoffs/ux4-finance-hub-handoff.md` must contain:
- Summary of all changes
- Complete file change list (matches Appendix A)
- Tests added (FH-01–FH-43, file names)
- Regression tests updated (14 files listed)
- Verification results (build pass + test count)
- Doctrine compliance statement (reference §3.2 compliance table)
- Option A decision record
- Outstanding work: `/expenses` Worker access review (deferred); PM notification deep-link hardening (deferred)
- Recommended next steps: UX-5 Intelligence Hub

---

## PART 9 — DOCTRINE COMPLIANCE DECLARATION

| Doctrine | Status |
|---|---|
| Approval Doctrine | **COMPLIANT** — Zero new approval or mutation actions; Overview is read-only |
| Audit Doctrine | **COMPLIANT** — 5 audit events defined (§3.5); Accounting and Exceptions tab access audited |
| Job Attribution Doctrine | **COMPLIANT** — Revenue KPI includes job attribution reference (G-003) |
| Financial Integrity Doctrine | **COMPLIANT** — Exposure KPI uses `getPendingExposure()` (workflow fact, not projection) |
| Financial Controls Doctrine | **COMPLIANT** — Exception count is display-only badge + deep-link |
| Reconciliation Doctrine | **COMPLIANT** — Reconciliation Centre mounted unmodified |
| Accounting Sync Doctrine | **COMPLIANT** — Sync metadata only; failure urgency thresholds defined (G-013) |
| Exception Resolution Doctrine | **COMPLIANT** — Exception Resolution Centre mounted unmodified; CEO approval workflow preserved |
| Review Centre Doctrine | **COMPLIANT** — Review Centre entirely unaffected |
| RBAC Doctrine | **COMPLIANT** — CEO-only hub; Option A applied; inner role checks required |
| Dashboard Intelligence Doctrine | **COMPLIANT** — Finance Overview is read-only; no inline actions |

No P0 violations. No open decisions. All P0/P1 corrections from the red-team review applied.

---

## APPENDIX A — COMPLETE FILE CHANGE SUMMARY

| File | Change Type | Notes |
|---|---|---|
| `client/src/pages/finance-hub.tsx` | **NEW** | Finance Hub page with 5-tab shell + audit event emission |
| `client/src/components/finance/FinanceHubOverview.tsx` | **NEW** | Overview tab — read-only KPI + 4 panels |
| `client/src/components/finance/InvoicingHub.tsx` | **NEW** | Invoicing tab — InvoicesContent + Sheet builder |
| `client/src/pages/financial-explorer.tsx` | **REFACTOR** | Extract `FinancialRecordsContent`; remove `<Layout>`; remove 3 accounting sub-tabs |
| `client/src/pages/invoices.tsx` | **REFACTOR** | Extract `InvoicesContent`; remove `<Layout>`; add `statusFilter` prop |
| `client/src/pages/invoice-builder.tsx` | **REFACTOR** | Extract `InvoiceBuilderContent`; remove `<Layout>`; add `onComplete` prop |
| `client/src/pages/payroll.tsx` | **REFACTOR** | Extract `PayrollProcessingContent`; remove `<Layout>` |
| `client/src/pages/payroll-export.tsx` | **REFACTOR** | Extract `PayrollExportContent`; remove `<Layout>` |
| `client/src/pages/accounting-settings.tsx` | **REFACTOR** | Extract `AccountingSettingsContent`; remove `<Layout>` |
| `client/src/pages/reconciliation-center.tsx` | **REFACTOR** | Extract `ReconciliationContent`; remove `<Layout>` |
| `client/src/pages/exception-resolution-center.tsx` | **REFACTOR** | Extract `ExceptionResolutionContent`; remove `<Layout>` |
| `client/src/App.tsx` | **MODIFY** | Add `/finance` route; add 9 redirect routes (correct order); change `/invoices`, `/invoice-builder`, `/invoices/:id` to CEO-only |
| `client/src/components/layout.tsx` | **MODIFY** | Remove 8 items; add Finance nav item; add ADMIN deep-link; fix NavLink active state |
| `client/src/pages/dashboard.tsx` | **MODIFY** | Line 282: Revenue at Risk CTA → `/finance?tab=invoicing&filter=overdue`; Line 484: FE button → `/finance?tab=records` |
| `client/src/pages/job-detail.tsx` | **MODIFY** | Remove "View Invoice" button (line 212); remove "Invoice Builder" button (line 363) |
| `client/src/lib/notificationEngine.ts` | **MODIFY** | Update `sourceRoute` strings (3 routes) |
| `client/src/lib/activityFeedEngine.ts` | **MODIFY** | Update `sourceRoute` strings (3 routes, multiple occurrences) |
| `client/src/lib/eventBusEngine.ts` | **MODIFY** | Update `sourceRoute` strings (3 routes, multiple occurrences) |
| `client/src/lib/executiveCommandEngine.ts` | **MODIFY** | Update `sourceRoute` strings (2 routes) |
| `client/src/lib/analyticsEngine.ts` | **MODIFY** | Update `sourceRoute` strings (3 routes) |
| `client/src/components/finance/ExceptionsTab.tsx` | **MODIFY** | Update `setLocation("/exception-resolution-center")` to hub route |
| `client/src/components/finance/JobExceptionPanel.tsx` | **MODIFY** | Update `setLocation("/exception-resolution-center")` to hub route |
| `tests/finance-hub.spec.ts` | **NEW** | FH-07–FH-40 feature tests |
| `tests/doctrine/finance-hub.spec.ts` | **NEW** | FH-01–FH-06, FH-41–FH-43 doctrine tests |
| `tests/doctrine/financial-explorer.spec.ts` | **UPDATE** | Regression — see §7.5 |
| `tests/doctrine/invoice-pipeline.spec.ts` | **UPDATE** | Regression — see §7.5 |
| `tests/doctrine/payroll-staging.spec.ts` | **UPDATE** | Regression — see §7.5 |
| `tests/doctrine/payroll-export.spec.ts` | **UPDATE** | Regression — see §7.5 |
| `tests/doctrine/accounting-settings.spec.ts` | **UPDATE** | Regression — see §7.5 |
| `tests/doctrine/reconciliation-center.spec.ts` | **UPDATE** | Regression — see §7.5 |
| `tests/doctrine/exception-resolution.spec.ts` | **UPDATE** | Regression — see §7.5 |
| `tests/doctrine/activity-feed.spec.ts` | **UPDATE** | Regression — see §7.5 |
| `tests/doctrine/event-bus.spec.ts` | **UPDATE** | Regression — see §7.5 |
| `tests/doctrine/executive-command-centre.spec.ts` | **UPDATE** | Regression: ECC-21, ECC-22, ECC-27 — see §7.5 |
| `tests/doctrine/margin-intelligence.spec.ts` | **UPDATE** | Regression — see §7.5 |
| `tests/doctrine/revenue-normalization.spec.ts` | **UPDATE** | Regression — see §7.5 |
| `tests/doctrine/accounting-sync.spec.ts` | **UPDATE** | Regression — see §7.5 |
| `tests/accounting-settings.spec.ts` | **UPDATE** | Regression — see §7.5 |

---

## APPENDIX B — UX PROGRAMME STATUS UPDATE

After UX-4 completion, update `docs/ux/UX_REDESIGN_PROGRAMME.md` Section 9:

```
| UX-4 | Finance Hub | ✓ Complete | feature/ux4-finance-hub | [date] |
```

Update Commercial Readiness scores:

| Score | Pre-UX-4 | Post-UX-4 (target) |
|---|---|---|
| Product Experience | ~68/100 | ~82/100 |
| Commercial Readiness | ~56/100 | ~74/100 |
| Investor Readiness | ~50/100 | ~68/100 |

---

## APPENDIX C — KNOWN DEFERRED ITEMS

These items are out of scope for UX-4 and must be tracked for future phases:

| Item | Deferred To |
|---|---|
| PM notification deep-link RBAC hardening (PM receives UnauthorizedPage from finance-destination deep-links) | Notification Engine RBAC hardening phase |
| `/expenses` Worker access review (route carries no `roles` prop — potential doctrine gap) | RBAC audit phase |
| `financial-explorer.tsx` FE label update in ECC / Analytics source summaries | UX-5 or dedicated engine cleanup |
| Period selector for Finance Overview KPIs (Current Month is fixed for UX-4) | Finance Hub v2 / UX-4.1 |

---

## ✅ APPROVED FOR IMPLEMENTATION

This specification is approved for implementation on branch `feature/ux4-finance-hub`.

All P0 corrections (C-01–C-08) are applied.
All P1 corrections (C-09–C-22) are applied.
All applicable P2 corrections (C-23–C-29) are applied.
OD-1 resolved: Option A (PM invoice access revoked).
OD-2 resolved: Current Month.
OD-3 resolved: Sheet slide-over.
No open decisions remain.

*End of specification. Version 1.1 supersedes version 1.0 in all respects.*
*UX-4-FINANCE-HUB-REVIEW.md remains on record as the red-team challenge document.*
