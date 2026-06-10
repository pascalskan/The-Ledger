# THE LEDGER — UX-4 FINANCE HUB
## Consolidated Implementation Specification

**Document Type:** Implementation Specification — Authoritative
**Version:** 1.0
**Date:** June 6, 2026
**Status:** APPROVED FOR IMPLEMENTATION
**Programme:** UX Redesign Programme — Phase UX-4
**Branch Target:** `feature/ux4-finance-hub`
**Prerequisite Branch:** `feature/ux-phases-1-2-3` merged to main

**Produced by:** 7-Agent Planning Pipeline
- ledger-product-manager
- ledger-architect
- ledger-financial-doctrine-guardian
- ledger-rbac-workflow-auditor
- ledger-ux-auditor
- ledger-design-system-guardian
- ledger-test-architect

---

## QUICK REFERENCE

| Property | Value |
|---|---|
| Route | `/finance` |
| Tab count | 5 |
| Legacy routes redirected | 8 |
| New files | 2 (`finance-hub.tsx`, `FinanceHubOverview.tsx`) |
| Files refactored (extract content) | 8 existing pages |
| Files modified | `App.tsx`, `layout.tsx` |
| RBAC | CEO only (all tabs) |
| New Playwright tests | 43 (FH-01 – FH-43) |
| Regression files requiring update | 6 |
| Doctrine verdict | COMPLIANT |

---

## PART 1 — PRODUCT REQUIREMENTS

### 1.1 Current State Summary

Phases 1–6.8 are complete and merged to main (501 Playwright tests passing). UX Phases 1–3 and quick-wins are implemented on branch `feature/ux-phases-1-2-3` (pending PR merge — **this must be merged before UX-4 begins**). Backend Architecture Specification is frozen at v2.0. The platform is a frontend-only, mock-data-driven prototype.

The current sidebar exposes 8–9 financially-oriented navigation items as flat top-level peers:

| # | Current Nav Item | Route |
|---|---|---|
| 1 | Financial Records | `/financial-explorer` |
| 2 | Invoices | `/invoices` |
| 3 | Invoice Builder | `/invoice-builder` |
| 4 | Payroll Processing | `/payroll` |
| 5 | Payroll Export | `/payroll-export` |
| 6 | Reconciliation Centre | `/reconciliation-center` |
| 7 | Exceptions | `/exception-resolution-center` |
| 8 | Accounting Settings | `/accounting-settings` (in ADMIN) |

A CEO performing a weekly finance session currently navigates across 8 separate destinations to complete a single conceptual workflow. This fragmentation is the highest-severity UX problem remaining after UX-1/2/3.

### 1.2 What UX-4 Does

UX-4 replaces all 8 items with a single **"Finance"** nav entry pointing to `/finance`. The Finance Hub is a 5-tab hub that consolidates all existing finance functionality without modifying any of the underlying page components.

```
Finance Hub  /finance
  ├── Tab 1: Overview     (new page — period KPIs + four summary panels)
  ├── Tab 2: Records      (existing Financial Explorer, renamed)
  ├── Tab 3: Invoicing    (existing Invoices + Invoice Builder)
  ├── Tab 4: Payroll      (existing Payroll Staging + Payroll Export, sub-tabs)
  └── Tab 5: Accounting   (existing Accounting Settings + Reconciliation + Exceptions, sub-tabs)
```

### 1.3 Strategic Assessment

**Fit:** Directly addresses RC-1 (Finance fragmentation — 8 items) identified as the highest remaining critical issue in the UX programme.

**Timing:** After UX-1/2/3 establish the navigation conventions and component patterns UX-4 extends.

**User programmes affected:**
- CEO: Primary beneficiary — all 8 destinations are CEO-scoped. Finance Hub gives the CEO one weekly financial destination.
- Workers: Unaffected — zero financial visibility, no change.
- Clients: Unaffected — Client Portal is a separate context.

**Doctrine alignment:** Pure navigation consolidation. No new financial mutations, approval workflows, or automated actions.

### 1.4 Dependency Analysis

**Hard dependencies (must be resolved before branch creation):**

1. `feature/ux-phases-1-2-3` merged to main.
2. Playwright suite at 501/501 on the base branch.

**Soft dependencies (must be confirmed before implementation):**

3. All 8 existing finance pages are in a known-passing state.
4. RBAC decision on PM invoice access resolved (see §4.5 — **BLOCKING**).

### 1.5 Scope

**In scope:**
- `/finance` route with 5-tab hub layout
- Finance Overview tab (new page — read-only KPI summary)
- Records tab wrapping Financial Explorer content (renamed "Financial Records")
- Invoicing tab wrapping Invoices + Invoice Builder (status filter tabs + inline builder)
- Payroll tab with sub-tabs: Processing Queue / Export History
- Accounting tab with sub-tabs: Sync Status / Reconciliation / Exceptions / Providers
- Single "Finance" sidebar nav item replacing 8 items
- Route redirects for all 8 legacy paths
- 43 Playwright tests (FH-01 – FH-43)

**Explicitly out of scope:**
- Any modification to the underlying page components (Financial Explorer, Invoices, Payroll, etc.)
- New financial mutations, approval workflows, or automated actions
- Date range / period picker on the Finance Overview
- Backend integration (mock data only)
- Any changes to Review Centre, Worker platform, or Client Portal

### 1.6 User Stories and Acceptance Criteria

#### Navigation

| Story | Acceptance Criterion |
|---|---|
| As CEO, I see a single "Finance" nav item replacing the 8 finance items | Sidebar contains exactly one Finance entry; no individual finance items remain |
| As CEO, clicking "Finance" lands me on Overview tab | `/finance` loads with Overview tab active by default |
| As CEO, direct navigation to any legacy finance URL redirects me correctly | All 8 legacy routes redirect to their hub equivalents |

#### Finance Overview

| Story | Acceptance Criterion |
|---|---|
| As CEO, I see 4 KPI cards: Revenue Recognised, Costs Approved, Gross Margin, Exposure | KPI strip renders 4 cards with non-empty values |
| As CEO, I see the top 4 jobs by profitability with margin and trend | Job Profitability panel renders ≥1 job row |
| As CEO, I see invoice counts and values by status | Invoice Status Summary renders all 4 status groups |
| As CEO, I see payroll run date, worker count, approval split | Payroll Status block renders |
| As CEO, I see accounting provider, last sync, failure count, exception count | Accounting Status block renders |
| As CEO, CTAs on Overview navigate me to the relevant tab | Each CTA navigates to correct tab |
| As CEO, Overview is read-only — no approve/reject/mutate buttons | No action buttons present in Overview panel |

#### Records / Invoicing / Payroll / Accounting Tabs

| Story | Acceptance Criterion |
|---|---|
| Records tab renders existing Financial Explorer with "Financial Records" heading | `finance-records-heading` contains "Financial Records" |
| Invoicing tab renders invoice list with status filters and Create button | Table + 5 filter tabs + Create button visible |
| Payroll tab renders sub-tabs with status banner | Both sub-tabs and banner visible |
| Accounting tab renders 4 sub-tabs each mounting correct content | All 4 sub-tabs visible and functional |

#### Redirects

| Legacy Route | Redirects To |
|---|---|
| `/financial-explorer` | `/finance?tab=records` |
| `/invoices` | `/finance?tab=invoicing` |
| `/invoice-builder` | `/finance?tab=invoicing` |
| `/payroll` | `/finance?tab=payroll` |
| `/payroll-export` | `/finance?tab=payroll&sub=export` |
| `/accounting-settings` | `/finance?tab=accounting` |
| `/reconciliation-center` | `/finance?tab=accounting&sub=reconciliation` |
| `/exception-resolution-center` | `/finance?tab=accounting&sub=exceptions` |

---

## PART 2 — ARCHITECTURE REQUIREMENTS

### 2.1 Approach

The Finance Hub follows the same pattern already demonstrated in `financial-explorer.tsx` — shadcn `Tabs` hosting distinct content components. UX-4 escalates this to a higher level: a hub page that hosts five content components, each of which may itself contain inner tabs.

No new architectural layers. No new state management libraries. No backend changes. Tab state lives in URL query parameters for deep-linkability.

### 2.2 New Files

```
client/src/pages/finance-hub.tsx
  — The Finance Hub page component
  — Owns the 5-tab shell and reads ?tab= / ?sub= from URL
  — Wraps in <Layout>

client/src/components/finance/FinanceHubOverview.tsx
  — Overview tab content component
  — Composes data from existing engines (read-only)
  — No props required
```

### 2.3 Refactored Files (Content Extraction — MANDATORY)

Every existing page that is mounted inside the hub **must** have its inner content extracted into a named export. The default export becomes a thin `<Layout>` wrapper. This prevents the double-sidebar problem (DS-002).

```
client/src/pages/financial-explorer.tsx
  export function FinancialRecordsContent() { ... }   ← new named export
  export default function FinancialExplorerPage() {   ← thin Layout wrapper
    return <Layout><FinancialRecordsContent /></Layout>
  }

client/src/pages/invoices.tsx
  export function InvoicesContent() { ... }

client/src/pages/invoice-builder.tsx
  export function InvoiceBuilderContent() { ... }

client/src/pages/payroll.tsx
  export function PayrollProcessingContent() { ... }

client/src/pages/payroll-export.tsx
  export function PayrollExportContent() { ... }

client/src/pages/accounting-settings.tsx
  export function AccountingSettingsContent() { ... }

client/src/pages/reconciliation-center.tsx
  export function ReconciliationContent() { ... }

client/src/pages/exception-resolution-center.tsx
  export function ExceptionResolutionContent() { ... }
```

### 2.4 Modified Files

**`client/src/App.tsx`**

Add hub route:
```tsx
<Route path="/finance">
  <ProtectedRoute component={FinanceHubPage} roles={["CEO"]} />
</Route>
```

Add redirect routes (declared BEFORE existing routes in the Switch):
```tsx
<Route path="/financial-explorer">
  <ProtectedRoute component={() => <RedirectToFinance tab="records" />} roles={["CEO"]} />
</Route>
<Route path="/invoices">
  <ProtectedRoute component={() => <RedirectToFinance tab="invoicing" />} roles={["CEO"]} />
</Route>
<Route path="/invoice-builder">
  <ProtectedRoute component={() => <RedirectToFinance tab="invoicing" />} roles={["CEO"]} />
</Route>
<Route path="/payroll">
  <ProtectedRoute component={() => <RedirectToFinance tab="payroll" />} roles={["CEO"]} />
</Route>
<Route path="/payroll-export">
  <ProtectedRoute component={() => <RedirectToFinance tab="payroll" sub="export" />} roles={["CEO"]} />
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

Redirect utility:
```tsx
function RedirectToFinance({ tab, sub }: { tab: string; sub?: string }) {
  const [, setLocation] = useLocation();
  useEffect(() => {
    const qs = sub ? `?tab=${tab}&sub=${sub}` : `?tab=${tab}`;
    setLocation(`/finance${qs}`, { replace: true });
  }, []);
  return null;
}
```

**`client/src/components/layout.tsx`**

Remove from `OPERATIONAL_ITEMS` (or wherever they currently appear):
- Invoices (`/invoices`)
- Invoice Builder (`/invoice-builder`)
- Financial Records (`/financial-explorer`)
- Payroll Processing (`/payroll`)
- Payroll Export (`/payroll-export`)
- Reconciliation Centre (`/reconciliation-center`)
- Exceptions (`/exception-resolution-center`)

Remove from `ADMIN_ITEMS`:
- Accounting Settings (`/accounting-settings`)

Add to `OPERATIONAL_ITEMS` (after Jobs/Schedule/Workers/Clients group):
```ts
{
  label: "Finance",
  href: "/finance",
  icon: DollarSign,
  roles: ["CEO"],
  testId: "nav-finance-hub"
}
```

Update `NavLink` active state check to handle query-string variants:
```tsx
const isActive = location === item.href
  || location.startsWith(item.href + "?")
  || location.startsWith(item.href + "/");
```

### 2.5 Routing Strategy

Tab and sub-tab state lives exclusively in URL query parameters. No Zustand store for tab position.

```tsx
// Inside finance-hub.tsx
const [search] = useSearch();             // Wouter 3.x hook
const params = new URLSearchParams(search);
const activeTab = params.get("tab") ?? "overview";
const activeSub = params.get("sub") ?? defaultSub(activeTab);

function handleTabChange(tab: string) {
  setLocation(`/finance?tab=${tab}`);
}
function handleSubChange(sub: string) {
  setLocation(`/finance?tab=${activeTab}&sub=${sub}`);
}

function defaultSub(tab: string): string {
  if (tab === "payroll") return "processing";
  if (tab === "accounting") return "sync";
  return "";
}
```

### 2.6 Finance Hub Page Structure

```
FinanceHubPage                          ← client/src/pages/finance-hub.tsx
  └── <Layout>
        └── <div className="space-y-6 p-6">
              ├── Hub header ("Finance" h1 + description)
              └── <Tabs value={activeTab} onValueChange={handleTabChange}>
                    ├── <TabsList className="flex flex-wrap h-auto gap-1">
                    │     ├── Overview tab trigger
                    │     ├── Records tab trigger
                    │     ├── Invoicing tab trigger
                    │     ├── Payroll tab trigger
                    │     └── Accounting tab trigger
                    ├── <TabsContent value="overview">
                    │     <FinanceHubOverview />
                    ├── <TabsContent value="records">
                    │     <FinancialRecordsContent />        ← named export from financial-explorer.tsx
                    ├── <TabsContent value="invoicing">
                    │     <InvoicingHub />                   ← inline component in finance-hub.tsx
                    │       └── <InvoicesContent /> | <InvoiceBuilderContent />
                    ├── <TabsContent value="payroll">
                    │     <PayrollHub activeSub={activeSub} onSubChange={handleSubChange} />
                    │       └── <Tabs> with Processing / Export sub-tabs
                    └── <TabsContent value="accounting">
                          <AccountingHub activeSub={activeSub} onSubChange={handleSubChange} />
                            └── <Tabs> with Sync / Reconciliation / Exceptions / Providers sub-tabs
```

### 2.7 Finance Overview Data Sources

The Finance Overview composes from **existing engines only**. No new engine files may be created.

| Overview Element | Actual Data Source |
|---|---|
| Revenue Recognised | `profitabilityEngine` / `marginIntelligence` — approved revenue totals |
| Costs Approved | `profitabilityEngine` — approved cost totals |
| Gross Margin (%) | `marginIntelligence` — existing calculation function (do NOT re-implement inline) |
| Exposure (Pending) | `forecastEngine` or `financialControlsEngine` — pending unapproved record totals |
| Job Profitability (top 4) | `profitabilityEngine.getJobProfitability()` |
| Invoice Status Summary | `useStore().invoices` — grouped by `status`, summed `amount` |
| Payroll Status | `groupTimesheetsForPayroll()` from `profitabilityEngine` + payroll schedule mock |
| Accounting Status — provider/sync | `accountingSyncEngine` + `accountingSettingsEngine` |
| Open Exceptions count | `exceptionResolutionEngine.computeExceptionSummary()` — `openCount` |

> **Critical note from Financial Doctrine Guardian:** The UX-4 specification previously referenced `financialExplorerEngine`, `invoiceEngine`, and `payrollEngine` — these named modules **do not exist**. All data must be sourced from the actual engine modules listed above. Verify function signatures against `client/src/lib/` before writing the Overview component.

### 2.8 Doctrine Review

| Doctrine | Status | Notes |
|---|---|---|
| Approval Doctrine | **COMPLIANT** | No approval flows added, removed, or modified |
| Audit Doctrine | **COMPLIANT** | No financial mutations; navigation events require minimal audit entries (see §3.4) |
| Job Attribution Doctrine | **COMPLIANT** | Job-attributed data read-only from existing engines |
| Financial Integrity Doctrine | **COMPLIANT** | Hub is a read layer; accounting systems remain downstream |
| Review Centre Doctrine | **COMPLIANT** | Review Centre workflow entirely unaffected |
| RBAC | **COMPLIANT** (with sub-tab guard requirement — see §4) |

### 2.9 Architectural Risks

| Risk | Severity | Mitigation |
|---|---|---|
| Double Layout wrapping if pages mounted as-is | **CRITICAL** | Content extraction (§2.3) is mandatory, not optional |
| RBAC gap at sub-tab level for Payroll/Accounting | **HIGH** | Inner role check in PayrollHub and AccountingHub required |
| Legacy Playwright tests use removed nav testIds | **HIGH** | Regression update plan in §7 |
| `financial-explorer.tsx` overlap with Accounting sub-tabs | **MEDIUM** | Remove duplicate AccountingSyncTab/ReconciliationTab/ExceptionsTab from FE after hub is live |
| Wouter `useSearch` hook availability | **LOW** | Confirm import; fallback: `new URLSearchParams(window.location.search)` |

---

## PART 3 — FINANCIAL DOCTRINE REQUIREMENTS

### 3.1 Overall Verdict

**COMPLIANT — with guardrails required.**

UX-4 introduces no new financial mutations, no new approval mechanisms, and no new automated financial actions. All approval-capable pages are mounted unmodified inside tabs.

### 3.2 Doctrine Compliance by Doctrine

| Doctrine | Status | Key Finding |
|---|---|---|
| Approval Doctrine | COMPLIANT | Zero new approval or mutation actions. Overview is read-only. |
| Audit Doctrine | COMPLIANT (with audit gap) | Access audit events warranted — see §3.4 |
| Job Attribution Doctrine | COMPLIANT | All job data read from existing attributed engines |
| Financial Integrity Doctrine | COMPLIANT | Hub is a read layer; no downstream data presented as Ledger truth |
| Financial Controls Doctrine | COMPLIANT | Exception count on Overview is display-only badge |
| Reconciliation Doctrine | COMPLIANT | Reconciliation Centre mounted unmodified; no new write operations |
| Accounting Sync Doctrine | COMPLIANT | Sync status on Overview is metadata only; no trigger buttons |
| Exception Resolution Doctrine | COMPLIANT | Exception count = badge + deep-link only |

### 3.3 Finance Overview Display Rules

**MAY display (read-only):**
- Revenue Recognised (period-labelled)
- Costs Approved (period-labelled)
- Gross Margin % (derived via existing engine function)
- Exposure/Pending (visually and semantically distinguished from approved figures — amber treatment + "Pending Approval" label)
- Top N jobs: name, revenue, margin%, trend direction
- Invoice counts and values by status
- Payroll: next run date, worker count, approved count, pending count
- Accounting: provider name, last sync timestamp, sync failure count, open exception count

**MUST NOT display:**
- Any unapproved figure presented as financially real without explicit pending/unapproved label
- Any data from downstream accounting systems presented as Ledger-origin truth
- Any create, edit, delete, approve, reject, sync, run, or retry button
- Any inline resolution panel for exceptions or reconciliation items
- Any financial projection without "Advisory Only" label
- Any financial figure without its temporal scope visibly on screen
- Any aggregate that arithmetically combines approved and unapproved values without clear labelling

### 3.4 Audit Requirements

Consistent with the ECC access audit pattern (`executive_centre_viewed`):

| Audit Event | Trigger | Fields |
|---|---|---|
| `finance_hub_viewed` | CEO loads `/finance` | who, what, when |
| `finance_overview_viewed` | Overview tab renders | who, what, when |
| `finance_hub_deep_link_opened` | CEO clicks any CTA from Overview | who, what, when, destination |

Tab switching between Records/Invoicing/Payroll/Accounting does not require audit records — those pages emit their own events where applicable.

### 3.5 Mandatory Doctrine Guardrails

| # | Guardrail |
|---|---|
| G-001 | No new financial engine files. All data sourced from existing engine modules. |
| G-002 | Exposure KPI uses distinct amber treatment + "Pending Approval" label. Never grouped visually with approved figures. |
| G-003 | Zero action buttons on Finance Overview. Every interactive element is a read-only deep-link. |
| G-004 | All KPIs carry period labels on-screen (e.g. "Current Month"). |
| G-005 | Gross Margin uses existing `marginIntelligence` calculation function — not an inline formula. |
| G-006 | Exception and reconciliation counts are badge-only deep-links. No inline resolution panels. |
| G-007 | Finance Hub `/finance` is CEO-only. All sub-tabs are CEO-only. No role relaxation. |
| G-008 | Mounted pages retain their own RBAC and doctrine protections, unmodified. |
| G-009 | Redirect routes preserve full page state of target page. |
| G-010 | Accounting provider data labelled as sync metadata — not Ledger financial truth. |

### 3.6 Required Corrections

**P0:** None — no doctrine violations found in the feature design.

**P1 (must resolve before implementation):** Confirm exact function signatures from `profitabilityEngine`, `marginIntelligence`, `forecastEngine`, `financialControlsEngine`, `accountingSyncEngine`, `accountingSettingsEngine`, `exceptionResolutionEngine` before writing the Overview component. Document the mapping in a comment block at the top of `FinanceHubOverview.tsx`.

---

## PART 4 — RBAC REQUIREMENTS

### 4.1 Overall Verdict

**CONDITIONALLY SAFE — one blocking conflict must be resolved before implementation.**

### 4.2 Role Review

| Role | Finance Hub Access | Status |
|---|---|---|
| CEO | Full — all 5 tabs, all sub-tabs | COMPLIANT |
| Project Manager | **BLOCKED — see §4.5** | AT RISK |
| Worker | None — redirect to `/worker/jobs` | COMPLIANT |
| Client | None — separate portal context | COMPLIANT |

### 4.3 Navigation Gating Rules

| Rule | Requirement |
|---|---|
| NG-01 | `/finance` declared as `ProtectedRoute` with `roles: ["CEO"]` |
| NG-02 | Finance nav item in `layout.tsx` declares `roles: ["CEO"]` |
| NG-03 | All 5 tabs are rendered only inside the CEO-gated hub; no tab is independently reachable without the hub guard |
| NG-04 | All 8 redirect routes carry `roles: ["CEO"]` on their `ProtectedRoute` — redirects do not strip the role check |
| NG-06 | Client portal (`/portal`) contains no reference to `/finance` |

### 4.4 Redirect Safety

| Legacy Route | Current Roles | Redirect Roles Required |
|---|---|---|
| `/financial-explorer` | `["CEO"]` | `["CEO"]` — clean |
| `/payroll` | `["CEO"]` | `["CEO"]` — clean |
| `/payroll-export` | `["CEO"]` | `["CEO"]` — clean |
| `/accounting-settings` | `["CEO"]` | `["CEO"]` — clean |
| `/reconciliation-center` | `["CEO"]` | `["CEO"]` — clean |
| `/exception-resolution-center` | `["CEO"]` | `["CEO"]` — clean |
| `/invoices` | `["CEO", "Project Manager"]` | **⚠ CONFLICT — see §4.5** |
| `/invoice-builder` | `["CEO", "Project Manager"]` | **⚠ CONFLICT — see §4.5** |

### 4.5 BLOCKING — PM Invoice Access Decision

**This must be resolved by the repository owner before implementation begins.**

`/invoices` and `/invoice-builder` are currently declared `roles: ["CEO", "Project Manager"]`. The Finance Hub is CEO-only. Absorbing these routes into the hub without a documented decision silently revokes PM invoice capability.

**Option A — Revoke PM invoice access.**
Change `/invoices` and `/invoice-builder` to `roles: ["CEO"]`. Document rationale in handoff. Remove any PM-facing invoice links.

**Option B — Preserve PM invoice access via separate route.**
Retain `/invoices` at `roles: ["CEO", "Project Manager"]` as a standalone route (not redirected to the hub). The Finance Hub Invoicing tab is CEO-only. Both co-exist.

> **Implementation must not begin until one option is declared.**

### 4.6 Sub-Tab RBAC Guards

Payroll and Accounting tab content is CEO-only. Even though the hub route carries a CEO guard, the `PayrollHub` and `AccountingHub` components must include an inner role check using the existing `hasAnyRole` / `financialPermissions` pattern. This prevents regression if RBAC configuration changes.

### 4.7 RBAC data-testid Requirements for Tests

| testId | Element |
|---|---|
| `nav-finance-hub` | Finance sidebar nav item |
| `finance-hub-page` | Finance Hub page root |
| `finance-tab-overview` through `finance-tab-accounting` | 5 tab triggers |

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

**Overall target: 8.8 / 10** (up from ~6.5 pre-UX-4)

### 5.2 Finance Overview Wireframe

```
/finance  [Overview] [Records] [Invoicing] [Payroll] [Accounting]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
FINANCE

┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐
│ Revenue         │ │ Costs Approved  │ │ Gross Margin    │ │ Exposure        │
│ Recognised      │ │  Current Month  │ │  Current Month  │ │ Pending Appvl.  │
│  £284,500       │ │  £191,200       │ │   32.8%         │ │  £47,300        │
│  ↑ +8% vs last  │ │  ↓ -2% vs last  │ │  ↑ on target    │ │  ⚠ 18 items    │
└─────────────────┘ └─────────────────┘ └─────────────────┘ └─────────────────┘

┌──────────────────────────────────────────────┐ ┌──────────────────────────────┐
│ JOB PROFITABILITY                            │ │ INVOICE STATUS               │
│                                              │ │                              │
│ Job Name         Revenue   Margin  Trend     │ │ Draft      3    £8,400       │
│ ─────────────────────────────────────────   │ │ Sent       8   £142,000      │
│ Heathrow T3      £48k      38%      ↑        │ │ Overdue ⚠  4    £24,800      │
│ Canary Wharf     £32k      29%      →        │ │ Paid      12   £318,000      │
│ Victoria Sq.     £18k      22%      ↓        │ │                              │
│ + 6 more...                                  │ │       Open Invoicing →       │
│              View All Records →              │ └──────────────────────────────┘
└──────────────────────────────────────────────┘
┌──────────────────────────────────────────────┐ ┌──────────────────────────────┐
│ ACCOUNTING STATUS                            │ │ PAYROLL STATUS               │
│                                              │ │                              │
│ ✓ Xero — Connected                          │ │ Next run: 13 Jun 2026        │
│ Last sync: Today 09:14                       │ │ 28 workers in scope          │
│ 0 sync failures                              │ │ 25 approved / 3 pending ⚠   │
│ 3 open exceptions  ⚠                        │ │                              │
│                                              │ │       Open Payroll →         │
│              Open Accounting →              │ └──────────────────────────────┘
└──────────────────────────────────────────────┘
```

### 5.3 Invoicing Tab Wireframe

```
/finance  [Overview] [Records] [Invoicing] [Payroll] [Accounting]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
INVOICING                                        [+ Create Invoice]

[All (27)] [Draft (3)] [Sent (8)] [Overdue (4)] [Paid (12)]

┌─────────────────────────────────────────────────────────────────┐
│ #      │ Client         │ Amount   │ Due Date    │ Status       │
│ ─────────────────────────────────────────────────────────────── │
│ 0892   │ HSS Limited    │ £8,400   │ 15 Jun      │ [Sent]      │
│ 0891   │ Apex Props     │ £3,200   │ 1 Jun  ⚠   │ [Overdue]   │
└─────────────────────────────────────────────────────────────────┘

[ Invoice Builder panel — hidden until "+ Create Invoice" clicked ]
[ Renders as <Sheet> slide-over on click ]
```

### 5.4 Payroll Tab Wireframe

```
/finance  [Overview] [Records] [Invoicing] [Payroll] [Accounting]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PAYROLL

┌──────────────────────────────────────────────────────────────────┐
│  Next run: 13 Jun 2026  ·  28 workers  ·  25 ready  ·  3 pending │
└──────────────────────────────────────────────────────────────────┘

[Processing Queue]  [Export History]

[ existing Payroll Staging or Payroll Export content renders here ]
```

### 5.5 Accounting Tab Wireframe

```
/finance  [Overview] [Records] [Invoicing] [Payroll] [Accounting]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ACCOUNTING

[Sync Status]  [Reconciliation]  [Exceptions]  [Providers]

[ existing Accounting Settings / Reconciliation / Exception content renders here ]
```

### 5.6 Primary CEO Finance Workflow

```
Step 1 — Pulse (30 seconds)
  CEO opens Finance Hub → Overview tab.
  Reads KPI strip: Revenue / Costs / Margin / Exposure.
  Notes Invoice Status: 4 overdue.
  Notes Payroll: 3 pending timesheets.
  Notes Accounting: 3 open exceptions.
  Decision: Act on overdue invoices first.

Step 2 — Invoicing Review (5–10 minutes)
  Clicks "Open Invoicing →" CTA.
  Lands on Invoicing tab, Overdue filter pre-applied.
  Reviews 4 overdue invoices.
  Navigates to invoice detail as needed (existing /invoice-detail/:id).
  Returns to Finance Hub — Invoicing tab remains active.

Step 3 — Payroll Review (5 minutes)
  Clicks Payroll tab.
  Status banner: next run + worker count + approval split.
  Navigates to Review Centre (sidebar badge) to approve 3 pending timesheets.
  Returns to Finance → Payroll tab.

Step 4 — Accounting Exceptions (5 minutes)
  Clicks Accounting tab.
  Lands on Exceptions sub-tab (from Overview CTA deep-link).
  Reviews and assigns 3 open exceptions.

  Total finance session: under 20 minutes. Never left the hub except for Review Centre.
```

### 5.7 UX Risks

| ID | Severity | Finding | Recommendation |
|---|---|---|---|
| UX-4-R1 | Critical | 8 nav testIds removed — Playwright failures | Audit all tests before implementing (see §7) |
| UX-4-R2 | High | Page Layout double-wrapping | Content extraction (§2.3) is mandatory |
| UX-4-R3 | High | Wouter query-string routing | Confirm `useSearch()` availability before building |
| UX-4-R4 | Medium | Accounting Settings moved from ADMIN — discoverability gap | Add redirect link in ADMIN section |
| UX-4-R5 | Medium | Invoice Builder inline vs slide-over | Use `<Sheet>` (shadcn slide-over), not inline |
| UX-4-R6 | Medium | Expenses (`/expenses`) must NOT go into Finance Hub | Expenses remains in OPERATIONAL; excluded from UX-4 |
| UX-4-R7 | Low | Page title / h1 should reflect active tab | Dynamic heading: "Finance — Invoicing" etc. |
| UX-4-R8 | Low | "This Period" KPI period ambiguity | Default to Current Month; period label must be visible on every KPI |

### 5.8 Mobile Considerations

| Element | Mobile Adaptation |
|---|---|
| Hub tab bar (5 tabs) | `overflow-x-auto` + `whitespace-nowrap` on triggers |
| Sub-tab bars (Payroll/Accounting) | Replace with `<Select>` dropdown on `< 640px` |
| Invoice Builder | Full-screen `<Sheet side="bottom">` on mobile |
| KPI Strip | 4-col → 2-col at `sm` → 1-col at `xs` |
| Job Profitability table | Compress to Name + Margin on mobile; Revenue via row expand |

---

## PART 6 — DESIGN SYSTEM REQUIREMENTS

### 6.1 Design System Conventions

All Finance Hub components use Tailwind + shadcn/ui + Lucide React. No custom CSS. No non-shadcn components. No non-Lucide icons.

Reference implementation: `automations.tsx` — the definitive hub tab pattern.

### 6.2 Hub Page Layout

```tsx
<Layout>
  <div className="space-y-6 p-6" data-testid="finance-hub-page">
    <div>
      <h1 className="text-2xl font-bold" data-testid="finance-hub-heading">Finance</h1>
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
      {/* Tab content panels... */}
    </Tabs>
  </div>
</Layout>
```

### 6.3 KPI Strip — Exact Specification

```tsx
<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4" data-testid="finance-kpi-strip">
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
    </CardContent>
  </Card>
  {/* Costs / Margin / Exposure follow same pattern */}
</div>
```

**Rules:** No `CardHeader` or `CardTitle`. Single `CardContent className="p-6"`. Value always `text-2xl font-bold`. Trend always `text-xs` with h-3 w-3 icon.

### 6.4 KPI Card Icons

| Card | Icon | Colour |
|---|---|---|
| Revenue Recognised | `TrendingUp` | `text-muted-foreground` |
| Costs Approved | `Receipt` | `text-muted-foreground` |
| Gross Margin | `Percent` | `text-muted-foreground` |
| Pending Exposure | `Clock` | `text-muted-foreground` |

### 6.5 Navigation Icon

```tsx
icon: DollarSign    // from lucide-react — confirmed available in layout.tsx
```

### 6.6 Hub Tab Icons

| Tab | Icon |
|---|---|
| Overview | `LayoutDashboard` |
| Records | `Layers` |
| Invoicing | `FileText` |
| Payroll | `Wallet` |
| Accounting | `Link2` |

### 6.7 Sub-Tab Icons

| Sub-tab | Icon |
|---|---|
| Processing Queue | `Users` |
| Export History | `FileDown` |
| Sync Status | `RefreshCw` |
| Reconciliation | `GitMerge` |
| Exceptions | `TriangleAlert` |
| Providers | `Link2` |

### 6.8 Status Colour Conventions

**Invoice status badges:**

| Status | Badge Variant | Value Text |
|---|---|---|
| Draft | `secondary` | `text-foreground` |
| Sent | `outline` | `text-foreground` |
| Overdue | `destructive` | `text-red-600 font-medium` |
| Paid | `default` with `bg-emerald-50 text-emerald-700 border-emerald-200` | `text-emerald-600` |

**Accounting status:**

| State | Icon | Text |
|---|---|---|
| Connected / healthy | `CheckCircle2` | `text-emerald-600` |
| Sync failure | `XCircle` | `text-red-600` |
| Requires reconnect | `AlertTriangle` | `text-amber-600` |

**Exception count:**

| Count | Colour |
|---|---|
| 0 | `text-emerald-600` |
| 1–4 | `text-amber-600` |
| 5+ | `text-red-600` |

**Payroll awaiting approval:**

| Count | Colour |
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

### 6.9 Overview Grid Layout

```
Row 1: 4-col KPI strip (full width, lg:grid-cols-4)
Row 2: Job Profitability (lg:col-span-7) + Invoice Status (lg:col-span-5)
Row 3: Accounting Status (lg:col-span-6) + Payroll Status (lg:col-span-6)
```

### 6.10 Design Debt Risks

| ID | Severity | Risk | Prevention |
|---|---|---|---|
| DS-002 | **CRITICAL** | Double Layout wrapping if pages not extracted | Mandatory content extraction per §2.3 |
| DS-001 | **HIGH** | Embedded pages render `text-3xl` headings inside the hub | Suppress or exclude page-level headings in embedded content |
| DS-003 | **MEDIUM** | KPI card padding copied from payroll.tsx (`pb-1 pt-4 px-4`) into KPI strip | Strip uses `p-6` only — do not copy from payroll.tsx |
| DS-004 | **MEDIUM** | Custom active state overrides on TabsTrigger | Use shadcn default — no `bg-*` or `border-b-2` overrides |
| DS-005 | **HIGH** | Old nav items removed without atomic update causes dual-source problem | Remove nav items and add Finance item in same commit |
| DS-006 | **HIGH** | Legacy nav testIds removed — Playwright failures | Regression update plan (§7) must precede or accompany implementation |

### 6.11 Anti-Patterns (Forbidden)

- `CardHeader` / `CardTitle` inside `ThisPeriodKPIStrip` cards
- `border-b-2 border-primary` active indicator on `TabsTrigger`
- URL path segments for tab state (`/finance/payroll`) — use `?tab=payroll` only
- Breadcrumb rendered inside `TabsContent`
- `text-green-*` classes — use `text-emerald-*`
- Missing `data-testid` on any tab trigger, KPI card, or status block
- Entire card as a click target — only the ghost button CTA is clickable
- `import { Layout }` inside `FinanceHubOverview`, `PayrollHub`, or `AccountingHub`

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
| FH-09 | KPI strip renders 4 cards | P0 | — |
| FH-10 | Each KPI card has non-empty value | P1 | — |
| FH-11 | Job Profitability panel renders rows | P1 | — |
| FH-12 | Invoice Status Summary renders | P1 | — |
| FH-13 | Payroll Status block renders | P1 | — |
| FH-14 | Accounting Status block renders | P1 | — |
| FH-15 | "View All Records" → Records tab | P1 | — |
| FH-16 | "Open Invoicing" → Invoicing tab | P1 | — |
| FH-17 | "Open Payroll" → Payroll tab | P1 | — |
| FH-18 | "Open Accounting" → Accounting tab | P1 | — |
| FH-19 | All 5 tab buttons visible | P0 | — |
| FH-20 | Tab click updates URL param | P0 | — |
| FH-21 | Deep-link `?tab=records` works | P0 | — |
| FH-22 | Deep-link `?tab=invoicing` works | P0 | — |
| FH-23 | Deep-link `?tab=payroll` works | P1 | — |
| FH-24 | Deep-link `?tab=accounting` works | P1 | — |
| FH-25 | Records tab shows "Financial Records" heading | P0 | Naming |
| FH-26 | Records tab mounts Financial Explorer content | P1 | — |
| FH-27 | Invoicing tab renders invoice list | P0 | — |
| FH-28 | Invoicing tab renders status filter tabs | P1 | — |
| FH-29 | "+ Create Invoice" button visible | P1 | — |
| FH-30 | Payroll sub-tabs visible | P1 | — |
| FH-31 | Payroll status banner renders | P1 | — |
| FH-32 | Payroll: Processing Queue content | P1 | — |
| FH-33 | Payroll: Export History content | P2 | — |
| FH-34 | Accounting: four sub-tabs visible | P1 | — |
| FH-35 | Accounting: Sync Status content | P1 | — |
| FH-36 | Accounting: Reconciliation content | P1 | — |
| FH-37 | `/financial-explorer` redirects | P0 | Audit Doctrine |
| FH-38 | `/invoices` redirects | P0 | — |
| FH-39 | `/payroll` redirects | P0 | — |
| FH-40 | `/accounting-settings` redirects | P0 | — |
| FH-41 | Overview has no approve/reject buttons | P0 | Approval Doctrine |
| FH-42 | Overview has no mutation controls | P0 | Financial Integrity |
| FH-43 | Finance nav absent from PM sidebar (doctrine form) | P0 | RBAC Doctrine |

### 7.3 Key P0 Test Specifications

**FH-01 — CEO accesses `/finance`**
```
1. clearBrowserState(page)
2. loginAsCEO(page)
3. page.goto('BASE/finance')
4. expect(page.getByTestId('finance-hub-page')).toBeVisible()
5. expect(page).toHaveURL(/\/finance/)
```

**FH-02 — PM denied `/finance`**
```
1. clearBrowserState(page)
2. loginAsPM(page)
3. page.goto('BASE/finance')
4. await page.waitForURL(url => !url.includes('/finance'), { timeout: 5000 }) OR
   expect(page.getByTestId('finance-hub-page')).not.toBeVisible()
```

**FH-08 — Default tab is Overview**
```
1. clearBrowserState(page) + loginAsCEO(page)
2. page.goto('BASE/finance')
3. expect(page.getByTestId('finance-tab-overview')).toHaveAttribute('data-state', 'active')
4. expect(page.getByTestId('finance-overview-panel')).toBeVisible()
```

**FH-20 — Tab click updates URL**
```
1. loginAsCEO + goto('/finance')
2. page.getByTestId('finance-tab-invoicing').click()
3. expect(page).toHaveURL(/tab=invoicing/)
4. page.getByTestId('finance-tab-payroll').click()
5. expect(page).toHaveURL(/tab=payroll/)
```

**FH-37 — `/financial-explorer` redirects**
```
1. loginAsCEO + goto('/financial-explorer')
2. page.waitForURL(/\/finance/, { timeout: 5000 })
3. expect(page).toHaveURL(/\/finance/)
4. expect(page.getByTestId('finance-hub-page')).toBeVisible()
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

All testIds required for implementation — implementer must add these exactly.

**Hub container:**
`finance-hub-page` · `finance-hub-heading`

**Tab triggers:**
`finance-tab-overview` · `finance-tab-records` · `finance-tab-invoicing` · `finance-tab-payroll` · `finance-tab-accounting`

**Tab panels:**
`finance-overview-panel` · `finance-records-panel` · `finance-invoicing-panel` · `finance-payroll-panel` · `finance-accounting-panel`

**Overview — KPI strip:**
`finance-kpi-strip` · `kpi-card-revenue` · `kpi-card-costs` · `kpi-card-margin` · `kpi-card-outstanding-invoices` · `kpi-value-revenue` · `kpi-value-costs` · `kpi-value-margin` · `kpi-value-outstanding-invoices`

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
`nav-finance-hub`

### 7.5 Regression Update Plan

The following 6 existing spec files require updates **before or alongside** UX-4 implementation. They navigate to routes or testIds that UX-4 removes.

| File | Risk | Required Change |
|---|---|---|
| `tests/doctrine/financial-explorer.spec.ts` | HIGH | Replace `nav-financial-explorer` clicks with `page.goto('/finance?tab=records')`. Update URL assertion from `/financial-explorer/` to `/finance/`. Update heading assertion to "Financial Records". |
| `tests/doctrine/invoice-pipeline.spec.ts` | HIGH | Change `page.goto('/invoice-builder')` to `page.goto('/finance?tab=invoicing')`. Change FE goto to `page.goto('/finance?tab=records')`. |
| `tests/doctrine/payroll-staging.spec.ts` | MEDIUM | Replace `nav-payroll-staging` click with `page.goto('/finance?tab=payroll')`. Update URL assertion to `tab=payroll`. |
| `tests/doctrine/accounting-settings.spec.ts` | HIGH | Change all base URL from `/accounting-settings` to `/finance?tab=accounting`. Ensure `accounting-settings-page` testId exists inside Accounting tab panel. |
| `tests/doctrine/reconciliation-center.spec.ts` | MEDIUM | Change all gotos from `/reconciliation-center` to `/finance?tab=accounting&sub=reconciliation`. Update RC-15 FE reference. |
| `tests/doctrine/exception-resolution.spec.ts` | MEDIUM | Change all gotos to `/finance?tab=accounting&sub=exceptions`. |

### 7.6 Playwright Patterns

```typescript
// Tab active state detection (shadcn Tabs)
await expect(page.getByTestId('finance-tab-overview'))
  .toHaveAttribute('data-state', 'active');

// Redirect wait
await page.goto(`${BASE}/financial-explorer`);
await page.waitForURL(/\/finance/, { timeout: 5000 });

// Scoped assertion (doctrine tests)
const overview = page.getByTestId('finance-overview-panel');
await expect(overview.getByTestId('btn-approve')).not.toBeVisible();

// Dynamic row count (minimum)
await expect(page.locator('[data-testid^="profitability-row-"]'))
  .toHaveCount({ gte: 1 });
```

---

## PART 8 — IMPLEMENTATION PLAN

### 8.1 Prerequisites Checklist

Before creating `feature/ux4-finance-hub`:

- [ ] PR `feature/ux-phases-1-2-3` merged to main
- [ ] `git pull` on main, confirm 501/501 tests passing
- [ ] PM invoice access decision recorded (Option A or B — §4.5)
- [ ] Engine function signatures confirmed from `client/src/lib/` (P1 correction — §3.6)
- [ ] Playwright test audit: grep all test files for `/financial-explorer`, `/invoices`, `/invoice-builder`, `/payroll`, `/payroll-export`, `/accounting-settings`, `/reconciliation-center`, `/exception-resolution-center`, `nav-financial-explorer`, `nav-payroll-staging`, `nav-payroll-export`, `nav-reconciliation-centre`, `nav-exception-resolution-centre`, `nav-accounting-settings`

### 8.2 Implementation Sequence

**Day 1 — Route, hub shell, navigation**
- Create `feature/ux4-finance-hub` branch
- Create `client/src/pages/finance-hub.tsx` with 5-tab shell (tab content = placeholder `<div>` per tab)
- Add `/finance` route to `App.tsx` (`roles: ["CEO"]`)
- Add redirect routes for all 8 legacy paths to `App.tsx`
- Update `layout.tsx`: remove 8 items, add Finance nav item (`nav-finance-hub`)
- Verify: build passes, `nav-finance-hub` visible in CEO sidebar, not in PM/Worker sidebar
- Verify: `/finance` loads the hub shell with 5 tabs visible

**Day 2 — Content extraction + Records/Invoicing tabs**
- Extract content components from `financial-explorer.tsx`, `invoices.tsx`, `invoice-builder.tsx`
- Wire Records tab: `<FinancialRecordsContent />` with "Financial Records" heading
- Wire Invoicing tab: `<InvoicesContent />` + invoice builder via `<Sheet>` on Create button
- Verify: FH-21, FH-22, FH-25, FH-26, FH-27, FH-28, FH-29 pass

**Day 3 — Payroll tab + content extraction**
- Extract content components from `payroll.tsx`, `payroll-export.tsx`
- Build `PayrollHub` component: status banner + 2 sub-tabs
- Wire Payroll tab
- Verify: FH-23, FH-30, FH-31, FH-32 pass

**Day 4 — Accounting tab + content extraction**
- Extract content components from `accounting-settings.tsx`, `reconciliation-center.tsx`, `exception-resolution-center.tsx`
- Build `AccountingHub` component: 4 sub-tabs
- Wire Accounting tab
- Verify: FH-24, FH-34, FH-35, FH-36 pass

**Day 5 — Finance Overview tab**
- Build `client/src/components/finance/FinanceHubOverview.tsx`
- Implement KPI strip sourcing from existing engines (confirm function signatures first)
- Implement 4 summary panels with CTA deep-links
- Verify: FH-09, FH-10, FH-11, FH-12, FH-13, FH-14, FH-15–FH-18 pass

**Day 6 — Tests, regression updates, verification**
- Write `tests/doctrine/finance-hub.spec.ts` (FH-01–FH-06, FH-41–FH-43)
- Write `tests/finance-hub.spec.ts` (FH-07–FH-40)
- Update 6 regression spec files per §7.5
- Run full suite — target: 501 + 43 = 544 tests passing
- Commit, push, create PR

### 8.3 Git Workflow

```
git checkout main && git pull
git checkout -b feature/ux4-finance-hub
# ... implementation days 1–6 ...
git add -A
git commit -m "feat: UX-4 Finance Hub — consolidate 8 finance routes into /finance hub with 5 tabs"
git push origin feature/ux4-finance-hub
# Open PR → stop
```

### 8.4 Handoff Requirements

On completion, produce `docs/handoffs/ux4-finance-hub-handoff.md` containing:
- Summary of changes
- Files modified (complete list)
- Files created
- Tests added (count + IDs)
- Regression tests updated (count + files)
- Verification results (build + test count)
- Doctrine compliance statement
- Outstanding work / known issues
- Recommended next steps (UX-5 Intelligence Hub)

---

## PART 9 — OPEN DECISIONS

The following decisions must be made by the repository owner before implementation begins. They are not resolvable by the implementing agent.

| # | Decision | Options | Impact |
|---|---|---|---|
| OD-1 | **PM invoice access** (BLOCKING) | A: Revoke PM access to `/invoices` and `/invoice-builder`. B: Retain PM-accessible standalone `/invoices` route alongside the hub. | Affects redirect routes for `/invoices` and `/invoice-builder` and their RBAC declarations |
| OD-2 | Finance Overview "period" definition | Current Month (recommended) / Rolling 30 days / Current Quarter | Affects KPI period label and data source date filter |
| OD-3 | Invoice Builder in Invoicing tab | Inline expansion / `<Sheet>` slide-over (recommended) | Affects day 2 implementation complexity |

---

## PART 10 — DOCTRINE COMPLIANCE DECLARATION

This specification has been reviewed against all active doctrines by the ledger-financial-doctrine-guardian and ledger-rbac-workflow-auditor specialists.

| Doctrine | Status |
|---|---|
| Approval Doctrine | **COMPLIANT** |
| Audit Doctrine | **COMPLIANT** |
| Job Attribution Doctrine | **COMPLIANT** |
| Financial Integrity Doctrine | **COMPLIANT** |
| Financial Controls Doctrine | **COMPLIANT** |
| Reconciliation Doctrine | **COMPLIANT** |
| Accounting Sync Doctrine | **COMPLIANT** |
| Exception Resolution Doctrine | **COMPLIANT** |
| Review Centre Doctrine | **COMPLIANT** |
| RBAC Doctrine | **COMPLIANT** (subject to OD-1 resolution and sub-tab guard implementation) |
| Dashboard Intelligence Doctrine | **COMPLIANT** (Finance Overview is read-only, consistent with this doctrine) |

No P0 violations found. One P1 correction (engine name mapping — §3.6). One blocking decision required (PM invoice access — §4.5 / OD-1).

---

## APPENDIX A — COMPLETE FILE CHANGE SUMMARY

| File | Change Type | Notes |
|---|---|---|
| `client/src/pages/finance-hub.tsx` | **NEW** | Finance Hub page with 5-tab shell |
| `client/src/components/finance/FinanceHubOverview.tsx` | **NEW** | Overview tab content |
| `client/src/pages/financial-explorer.tsx` | **REFACTOR** | Extract `FinancialRecordsContent` named export |
| `client/src/pages/invoices.tsx` | **REFACTOR** | Extract `InvoicesContent` named export |
| `client/src/pages/invoice-builder.tsx` | **REFACTOR** | Extract `InvoiceBuilderContent` named export |
| `client/src/pages/payroll.tsx` | **REFACTOR** | Extract `PayrollProcessingContent` named export |
| `client/src/pages/payroll-export.tsx` | **REFACTOR** | Extract `PayrollExportContent` named export |
| `client/src/pages/accounting-settings.tsx` | **REFACTOR** | Extract `AccountingSettingsContent` named export |
| `client/src/pages/reconciliation-center.tsx` | **REFACTOR** | Extract `ReconciliationContent` named export |
| `client/src/pages/exception-resolution-center.tsx` | **REFACTOR** | Extract `ExceptionResolutionContent` named export |
| `client/src/App.tsx` | **MODIFY** | Add `/finance` route + 8 redirect routes |
| `client/src/components/layout.tsx` | **MODIFY** | Remove 8 items, add Finance nav item, fix active state logic |
| `tests/finance-hub.spec.ts` | **NEW** | FH-07 – FH-40 feature tests |
| `tests/doctrine/finance-hub.spec.ts` | **NEW** | FH-01 – FH-06, FH-41 – FH-43 doctrine tests |
| `tests/doctrine/financial-explorer.spec.ts` | **UPDATE** | Regression: nav testId + URL assertion |
| `tests/doctrine/invoice-pipeline.spec.ts` | **UPDATE** | Regression: goto URLs |
| `tests/doctrine/payroll-staging.spec.ts` | **UPDATE** | Regression: nav testId + URL assertion |
| `tests/doctrine/accounting-settings.spec.ts` | **UPDATE** | Regression: all base URLs |
| `tests/doctrine/reconciliation-center.spec.ts` | **UPDATE** | Regression: all gotos |
| `tests/doctrine/exception-resolution.spec.ts` | **UPDATE** | Regression: all gotos |

---

## APPENDIX B — UX PROGRAMME STATUS UPDATE

After UX-4 completion, update `docs/ux/UX_REDESIGN_PROGRAMME.md` Section 9 tracker:

```
| UX-4 | Finance Hub | ✓ Complete | feature/ux4-finance-hub | [date] |
```

And update Commercial Readiness scores:

| Score | Pre-UX-4 | Post-UX-4 (target) |
|---|---|---|
| Product Experience | ~68/100 | ~82/100 |
| Commercial Readiness | ~56/100 | ~74/100 |
| Investor Readiness | ~50/100 | ~68/100 |

---

*End of specification. This document is the authoritative implementation reference for UX-4 Finance Hub. Do not deviate from the decisions registered in Parts 1–8 without a documented change. Resolve open decisions in Part 9 before beginning implementation.*
