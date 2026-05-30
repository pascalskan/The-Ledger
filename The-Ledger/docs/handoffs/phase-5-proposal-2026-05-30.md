# Phase 5 Implementation Proposal — Financial Intelligence

Date: 2026-05-30  
Status: PROPOSAL — not yet implemented  
Branch: phase-5-financial-intelligence  
Precondition: Phase 4.5 fully complete

---

## PHASE 5 AUDIT REPORT

### Current Completed Phase

Phase 4.5 — Revenue Normalization

### Next Recommended Phase

Phase 5 — Financial Intelligence

### Why

All Phase 4 objectives are met per repository evidence:

- Review Center UI and workflows: complete
- Approval → Financial Mutation Engine: complete
- All six normalized financial record types: complete
- All four revenue streams: complete
- Job Financial Summary with gross profit and margin: complete
- Financial Explorer: complete

The doctrine in `LEDGER_CANONICAL_CONTEXT.md` lists Phase 5 as the next phase with four objectives: dynamic profitability engine, payroll engine, invoice generation pipeline, and margin intelligence.

Additionally, the repository has two architectural gaps that Phase 5 must resolve:

1. **useJobIntelligence disconnect** — the Job Intelligence Dashboard calculates profit from `job.costs.*` (static, pre-approval estimate data) and legacy `Invoice.lineItems`. It does not read from Phase 4.2/4.5 normalized records. This makes the Job Intelligence Dashboard financially incorrect relative to the true financial state. Phase 5 must replace this with normalized-record-derived calculations.

2. **No payroll staging layer** — `TimesheetEntry` stores labour cost and revenue, but there is no payroll staging concept (grouping timesheets by worker, applying overtime rules, generating payroll staging records). Phase 5 introduces this.

3. **No invoice readiness workflow** — `InvoiceLineItem` records exist but there is no UI to aggregate them into a draft invoice or mark a job as invoice-ready. Phase 5 introduces this.

### Dependencies

| Dependency | Status |
|-----------|--------|
| TimesheetEntry with laborRevenue | Complete (Phase 4.5) |
| ExpenseEntry with recoveryAmount | Complete (Phase 4.5) |
| InventoryMutation with revenueImpact | Complete (Phase 4.2) |
| EquipmentUsageRecord with revenueImpact | Complete (Phase 4.5) |
| InvoiceLineItem per normalized record | Complete (Phase 4.2) |
| getJobFinancialSummary() | Complete (Phase 4.4) |
| Worker.billableRate + costRate | Complete (Phase 4.5) |

All Phase 5 features can build directly on existing Phase 4.5 normalized records.

### Risks

1. **useJobIntelligence replacement** — `job-intelligence.tsx` uses mock contract value logic (`totalCost * 1.35`) as a fallback. Replacing with normalized records will change displayed numbers and may require demo data to have approved WorkerReports to show any financial activity. This is the correct behaviour per doctrine, but requires seeding approved demo review items or adjusting the fallback logic.

2. **Payroll staging complexity** — Overtime rules, IR35 status, and contractor vs employee distinctions are business-specific. Phase 5 should model the staging layer without locking in specific rules. The payroll staging should be a grouping + display layer, not a rules engine.

3. **Invoice readiness vs legacy invoices** — The system currently has `Invoice` objects (legacy, created manually from `job.costs.*`) alongside `InvoiceLineItem` objects (normalized, created by the mutation engine). Phase 5 must bridge these, not replace the legacy path yet. Full migration to normalized invoices is Phase 6 scope.

---

## PHASE 5 IMPLEMENTATION PLAN

### Objectives

1. **Profitability Dashboard** — replace the mock `useJobIntelligence` calculation with normalized financial data. Show per-job cost, revenue, and gross profit sourced from approved records.

2. **Payroll Staging** — introduce a payroll staging view that groups approved `TimesheetEntry` records by worker, shows hours worked, cost total, and payroll-ready status. No payment processing — staging and readiness only.

3. **Invoice Readiness** — a view per job that aggregates approved `InvoiceLineItem` records into a structured draft, shows total billable value, and allows the PM to mark a job as “invoice ready”.

4. **Margin Intelligence** — cross-job margin comparison. Identify highest and lowest margin jobs. Flag jobs below target margin threshold.

5. **Financial Forecasting Stub** — a read-only panel showing approved revenue vs pending (unapproved) exposure. Provides early view of what financial activity is in the pipeline.

---

### Architecture

#### 5.1 — Profitability Engine (replace useJobIntelligence)

Current path:
```
job.costs.* + Invoice.lineItems → contractValue (mock) → profit/margin
```

New path:
```
mockTimesheets + mockExpenses + mockInventoryMutations + mockEquipmentUsage
  → getJobFinancialSummary(jobId)
  → totalCost, totalRevenue, grossProfit, marginPercent
  → useJobIntelligence (updated hook)
  → JobIntelligenceDashboard
```

`useJobIntelligence.ts` should consume `getJobFinancialSummary` as its financial source for any job with normalized activity. Fall back to `job.costs.*` estimate only when `hasActivity === false`.

#### 5.2 — Payroll Staging Interface

New type: `PayrollStagingRecord`
```typescript
interface PayrollStagingRecord {
  workerId: string;
  workerName: string;
  periodStart: string;
  periodEnd: string;
  timesheetIds: string[]; // TimesheetEntry IDs included
  totalHours: number;
  totalCost: number;      // sum of TimesheetEntry.laborCost
  totalRevenue: number;   // sum of TimesheetEntry.laborRevenue
  status: 'draft' | 'staged' | 'exported';
  stagedAt?: string;
  stagedBy?: string;
}
```

New calculation function: `groupTimesheetsForPayroll(workerId?, periodStart?, periodEnd?)`  
New page: `client/src/pages/payroll.tsx`  
New route: `/payroll`

#### 5.3 — Invoice Readiness View

New function: `getJobInvoiceReadiness(jobId)`  
Returns: aggregated `InvoiceLineItem` records per job, grouped by type (labour, materials, equipment, expense), total billable value, and whether any items are present.

New component: `client/src/components/finance/InvoiceReadinessPanel.tsx`  
Add to Job Detail page alongside `JobFinancialSummarySection`.

New state on `Job`: `invoiceReadyAt?: string` — set when PM marks the job invoice-ready. This is a soft signal, not a financial mutation.

#### 5.4 — Margin Intelligence

New function: `getAllJobMargins()`  
Returns all jobs sorted by `marginPercent`, with jobs below a configurable threshold flagged.

New component: `client/src/components/finance/MarginIntelligenceTable.tsx`  
Added to Financial Explorer or as a new tab on the Financial Intelligence page.

#### 5.5 — Financial Forecasting Panel

New function: `getPendingExposure(jobId?)`  
Calculates revenue and cost exposure from ReviewItems with `status === 'pending'` (not yet approved). Shows what is in the pipeline awaiting approval.

New component: `client/src/components/finance/PendingExposurePanel.tsx`  
Added to Job Detail page and/or Financial Explorer.

---

### Files Likely To Change

| File | Change |
|------|--------|
| `client/src/lib/useJobIntelligence.ts` | Replace mock profit calc with getJobFinancialSummary |
| `client/src/lib/mockData.ts` | Add PayrollStagingRecord type, groupTimesheetsForPayroll(), getJobInvoiceReadiness(), getAllJobMargins(), getPendingExposure(); expose via useStore() |
| `client/src/pages/job-detail.tsx` | Add InvoiceReadinessPanel, PendingExposurePanel |
| `client/src/pages/financial-explorer.tsx` | Add MarginIntelligenceTable tab |
| `client/src/App.tsx` | Add /payroll route |
| `client/src/components/layout.tsx` | Add Payroll nav link |

### New Files

| File | Purpose |
|------|--------|
| `client/src/pages/payroll.tsx` | Payroll staging page |
| `client/src/components/finance/InvoiceReadinessPanel.tsx` | Per-job invoice readiness view |
| `client/src/components/finance/MarginIntelligenceTable.tsx` | Cross-job margin comparison |
| `client/src/components/finance/PendingExposurePanel.tsx` | Pending approval exposure |

---

### New Calculations

#### groupTimesheetsForPayroll
```typescript
function groupTimesheetsForPayroll(
  workerId?: string,
  periodStart?: string,
  periodEnd?: string
): PayrollStagingRecord[]
```
Groups `mockTimesheets` by workerId within period. Computes totalHours, totalCost, totalRevenue.

#### getJobInvoiceReadiness
```typescript
function getJobInvoiceReadiness(jobId: string): {
  lines: InvoiceLineItem[];   // approved lines for this job
  byType: Record<string, InvoiceLineItem[]>;
  totalBillable: number;
  hasLines: boolean;
}
```

#### getAllJobMargins
```typescript
function getAllJobMargins(): Array<{
  job: Job;
  summary: JobFinancialSummary;
  belowThreshold: boolean;  // marginPercent < targetMargin
}>
```

#### getPendingExposure
```typescript
function getPendingExposure(jobId?: string): {
  pendingLaborCost: number;
  pendingLaborRevenue: number;
  pendingMaterialCost: number;
  pendingExpenseCost: number;
  pendingEquipmentCost: number;
  totalPendingCost: number;
  totalPendingRevenue: number;
}
```
Calculated from `reviewItems` with `status === 'pending'`.

---

### UI Impact

- Job Detail page: two new panels below Financial Summary (Invoice Readiness, Pending Exposure)
- Job Intelligence Dashboard: numbers change to reflect normalized data (correct by design)
- Financial Explorer: new Margin Intelligence tab
- New Payroll page at `/payroll` accessible to PM and CEO roles
- Layout: Payroll added to sidebar nav under Finance section

---

### Testing Strategy

New doctrine tests:

| Test file | Scenario |
|-----------|----------|
| `tests/doctrine/payroll-staging.spec.ts` | Approved timesheets appear in payroll staging grouped by worker |
| `tests/doctrine/invoice-readiness.spec.ts` | Approved InvoiceLineItems appear in job invoice readiness panel |
| `tests/doctrine/margin-intelligence.spec.ts` | Jobs with margin below threshold are flagged |
| `tests/doctrine/pending-exposure.spec.ts` | Pending ReviewItems produce correct exposure estimates |

Existing tests must continue to pass unchanged.

---

### Risks

1. **Demo data has no approved ReviewItems with laborEntries/equipmentUsage** — the demo review items (`rev-1` to `rev-4`) use legacy format fields (`title`, `submittedBy`, `content`, `items`). They do not have `laborEntries`, `equipmentUsage`, or `expenses`. When Phase 5 updates `useJobIntelligence` to read from normalized records, jobs will show zero financial activity until a WorkerReport with the new format is approved. Solution: seed one pre-approved demo WorkerReport with full Phase 4.5 payloads to ensure the UI shows live data by default.

2. **PayrollStagingRecord is staging, not payroll** — this must not be confused with actual payroll processing. The field names and UI copy must be explicit that this is a staging/review view, not a payment instruction.

3. **InvoiceReadiness vs Legacy Invoice** — many jobs already have `Invoice` objects created from `job.costs.*`. The Invoice Readiness panel shows `InvoiceLineItem` (normalized) records, which will be empty for jobs that only have legacy invoices. Both systems must coexist during Phase 5. The panel should explain this clearly in its empty state.

---

### Recommended Branch Name

```
phase-5-financial-intelligence
```

This branch already exists and is the current working branch. Begin Phase 5 implementation here.

---

## IMPLEMENTATION ORDER

Recommended sequence within Phase 5:

1. **Seed approved demo WorkerReport** — add a pre-approved ReviewItem to demo data with `laborEntries`, `equipmentUsage`, and `expenses` payloads, and pre-populate the normalized financial tables so the UI has live data on first load.

2. **Update useJobIntelligence** — read from `getJobFinancialSummary` for jobs with `hasActivity === true`. This fixes the data path disconnect immediately.

3. **Invoice Readiness Panel** — `getJobInvoiceReadiness()` + `InvoiceReadinessPanel` component on Job Detail.

4. **Pending Exposure Panel** — `getPendingExposure()` + `PendingExposurePanel` component on Job Detail.

5. **Payroll Staging page** — `groupTimesheetsForPayroll()` + `payroll.tsx` page + route + nav.

6. **Margin Intelligence** — `getAllJobMargins()` + `MarginIntelligenceTable` on Financial Explorer.

7. **Playwright doctrine tests** for each new calculation.
