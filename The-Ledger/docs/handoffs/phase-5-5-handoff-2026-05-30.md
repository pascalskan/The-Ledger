# PHASE 5.5 COMPLETION HANDOFF

## Document Details

Date: 2026-05-30
Phase: 5.5 — Margin Intelligence & Forecasting Engine (COMPLETE)
Branch: feature/phase-5-3-invoice-pipeline (continued from 5.4)
Status: Implementation complete. Build and Playwright verification required locally.

---

## Summary

Phase 5.5 transforms historical financial intelligence into predictive
operational intelligence. Management can now see which jobs are trending
toward loss, what forecast margin looks like with pending exposure factored
in, and receive deterministic risk alerts — all before accounting systems
are involved.

The phase is additive: it extends the Financial Explorer and Job Detail
page without modifying any existing financial engines.

---

## Doctrine Flow (Phase 5.5)

```
Approved TimesheetEntry / ExpenseEntry / InventoryMutation / EquipmentUsageRecord
  → getJobFinancialSummary()        (mockData.ts — unchanged)
  → computeJobForecastWithMeta()    (forecastEngine.ts — unchanged, was pre-built)
  → JobForecast[]

ReviewItem (status === 'pending')
  → getPendingExposure()            (profitabilityEngine.ts — unchanged)
  → PendingExposure (estimate only, never approved)

JobForecast[] + PendingExposure
  → computePortfolioForecast()      (forecastEngine.ts)
  → PortfolioForecast

JobForecast[] + JobFinancialSummary map
  → generateRiskAlerts()            (marginIntelligence.ts — Phase 5.5)
  → RiskAlert[]

All of the above
  → ForecastTab (financial-explorer.tsx — Phase 5.5)
  → JobForecastPanel (job-detail.tsx — Phase 5.5)
```

Pending exposure is incorporated at 85% realisation factor.
It is NEVER treated as approved revenue or cost.

---

## Files Created (Phase 5.5)

### `client/src/lib/marginIntelligence.ts`
Pure calculation engine. No side effects. No React state.

Exports:
- `AlertSeverity` — "info" | "warning" | "critical"
- `AlertType` — "margin-risk" | "labour-overrun" | "material-overrun" | "exposure-spike"
- `RiskAlert` — alert record with type, severity, jobId, message, triggerValue, threshold
- `JobRiskClassification` — classification with deterministic explanation
- `LABOUR_OVERRUN_THRESHOLD_PCT` — 60% (labour cost vs revenue)
- `MATERIAL_OVERRUN_THRESHOLD_PCT` — 30% (material cost vs revenue)
- `EXPOSURE_SPIKE_THRESHOLD_PCT` — 50% (pending exposure vs revenue)
- `classifyJobRisk(forecast)` — returns classification + explanation string
- `generateRiskAlerts(forecasts, summaries)` — scans all jobs, returns RiskAlert[]
- `buildPortfolioForecast(jobs, reviewItems)` — convenience wrapper for components

### `client/src/components/finance/ForecastTab.tsx`
Forecasting tab content for the Financial Explorer.

Features:
- Portfolio KPI strip: Forecast Revenue, Cost, Profit, Margin, Total Exposure, At Risk
- Risk alerts panel (severity-sorted, only shown when alerts exist)
- Job forecast table with sort and search
- Columns: Job, Current Margin, Forecast Margin, Variance, Exposure, Risk Status
- Clicking a row navigates to /jobs/:id
- All data-testids for Playwright

### `client/src/components/finance/JobForecastPanel.tsx`
Inline forecast panel for the Job Detail page.

Features:
- Shows Current vs Forecast side-by-side: Revenue, Cost, Profit, Margin
- Exposure Impact (estimate — clearly labelled)
- Margin Variance indicator (trending icon + value)
- Risk Status badge
- Deterministic classification explanation
- Doctrine disclaimer when exposure is present

### `tests/doctrine/margin-intelligence.spec.ts`
12 doctrine tests covering:
1. Forecast tab exists in Financial Explorer
2. Forecast tab loads without error
3. Portfolio KPI cards render (5 KPIs verified by testId)
4. Forecast table contains seeded kitchen extraction job
5. Forecast table search filters results
6. Job Forecast Panel renders on job detail
7. Current vs Forecast column headers present
8. Margin variance indicator renders
9. Risk status badge renders
10. Seeded job classified as Healthy (~68% margin, well above 20% threshold)
11. Exposure not labelled as approved data (doctrine guard)
12. Forecast revenue matches approved records (non-zero, shows £)

### `docs/handoffs/phase-5-5-handoff-2026-05-30.md`
This file.

---

## Files Modified (Phase 5.5)

### `client/src/pages/financial-explorer.tsx`
Additions:
- `import { ForecastTab } from "@/components/finance/ForecastTab"`
- `import { TrendingUp } from "lucide-react"` (added to existing import)
- `TabsTrigger` for "Forecasting" (after Profitability, before Invoice Pipeline)
- `TabsContent` for "forecasting" rendering `<ForecastTab />`
- `data-testid="tab-forecasting"` on the trigger

### `client/src/pages/job-detail.tsx`
Additions:
- `import { JobForecastPanel } from "@/components/finance/JobForecastPanel"`
- `<JobForecastPanel jobId={job.id} />` inserted after the existing
  InvoiceReadiness + PendingExposure grid, before the Invoice Draft panel

---

## What Was NOT Modified (Phase 5.5)

- `forecastEngine.ts` — pre-built and complete; no changes required
- `profitabilityEngine.ts` — unchanged
- `mockData.ts` — unchanged
- `MarginIntelligenceTable.tsx` — unchanged (Phase 5.2 current-actuals table)
- All existing Playwright tests — unchanged; all 40 must still pass

---

## Forecast Engine Architecture

```
forecastEngine.ts (pre-built, Phase 5.5 spec)
  ├── DEFAULT_EXPOSURE_REALISATION_FACTOR = 0.85
  ├── FORECAST_MARGIN_THRESHOLDS = { HEALTHY: 20, WARNING: 10 }
  ├── deriveRiskStatus(margin, hasActivity) → RiskStatus
  ├── computeJobForecast(summary, exposure, factor) → ForecastResult
  ├── computeJobForecastWithMeta(job, summary, exposure) → JobForecast
  └── computePortfolioForecast(forecasts[]) → PortfolioForecast

marginIntelligence.ts (Phase 5.5)
  ├── classifyJobRisk(forecast) → JobRiskClassification
  ├── generateRiskAlerts(forecasts, summaries) → RiskAlert[]
  └── buildPortfolioForecast(jobs, reviewItems) → { forecasts, portfolio, alerts, summaries }
```

---

## Risk Classification Logic

```
Margin >= 20%  →  Healthy   (green)
Margin >= 10%  →  Warning   (amber)
Margin < 10%   →  Critical  (red)
No activity    →  No Data   (slate)
```

Alert types triggered by:
- Margin Risk: forecast margin below threshold
- Labour Overrun: labour cost > 60% of revenue
- Material Overrun: material cost > 30% of revenue
- Exposure Spike: pending exposure > 50% of approved revenue

---

## Seed Data Forecast (Kitchen Extraction job)

Approved actuals:
- Revenue: £4,922.75
- Cost:    £1,581.00  (labour £896, equipment £1,200, expense £185, materials £84)
- Profit:  £3,341.75
- Margin:  ~67.9%

Pending exposure:
- 3 pending review items (rev-1, rev-2, rev-3) — no financial payload (photos/reports)
- Pending cost: £0 (no LaborPayload or ExpensePayload in the demo seeds)

Forecast (with 85% realisation):
- Forecast revenue: £4,922.75 (no pending revenue exposure)
- Forecast cost:    £1,581.00 (no pending cost exposure)
- Forecast margin:  ~67.9%
- Risk Status:      Healthy ✓

---

## Test Count After Phase 5.5

| Suite                           | Tests |
|---------------------------------|-------|
| auth.spec.ts                    |  ?    |
| review.spec.ts                  |  ?    |
| worker.spec.ts                  |  ?    |
| jobs.spec.ts                    |  ?    |
| doctrine/audit-log.spec.ts      |  ?    |
| doctrine/financial-explorer.spec.ts | 3 |
| doctrine/inventory-deduction.spec.ts | ? |
| doctrine/invoice-pipeline.spec.ts | ?  |
| doctrine/job-financial-summary.spec.ts | ? |
| doctrine/no-premature-financial-mutation.spec.ts | ? |
| doctrine/payroll-export.spec.ts | 10   |
| doctrine/payroll-staging.spec.ts | ?   |
| doctrine/pm-scope-enforcement.spec.ts | ? |
| doctrine/revenue-normalization.spec.ts | ? |
| doctrine/review-approval.spec.ts | ?   |
| doctrine/worker-to-review.spec.ts | ?  |
| doctrine/margin-intelligence.spec.ts | 12 (NEW) |

Target: 40 existing + 12 new = **52+ tests**

---

## Known Limitations

- `forecastEngine.ts` was pre-built but never connected to UI. Phase 5.5 connects it.
- Exposure realisation factor (0.85) is hardcoded. A future phase could make this
  configurable per company settings.
- The `marginIntelligence.ts` engine currently has no persistence — alerts reset on
  page load. Suitable for the current frontend prototype stage.

---

## Commit Instructions

```
git add .
git commit -m "feat(financial): complete Phase 5.5 margin intelligence & forecasting engine"
git push origin feature/phase-5-3-invoice-pipeline
```

Then verify:

```
npm run build
npx playwright test
```

Expected: all tests pass (40 existing + 12 new = 52+).

---

## Phase Status After 5.5

```
Phase 4.1  COMPLETE  Review Center UI
Phase 4.2  COMPLETE  Approval workflows + normalization engine
Phase 4.3  COMPLETE  PM scope enforcement
Phase 4.4  COMPLETE  Job Financial Summary
Phase 4.5  COMPLETE  Revenue Normalization (all 4 streams)
Phase 5.1  COMPLETE  Single Source of Financial Truth
Phase 5.2  COMPLETE  Financial Intelligence Expansion + Payroll Staging
Phase 5.3  COMPLETE  Invoice Generation Pipeline
Phase 5.4  COMPLETE  Payroll Export System
Phase 5.5  COMPLETE  Margin Intelligence & Forecasting Engine
```

---

## Next Phase Candidates

### Phase 6 — Accounting Integration
  QuickBooks / Xero OAuth connection
  Sync InvoiceDraft records as full invoices
  Sync PayrollExport as payroll journal entries
  Reconciliation workflow

### Phase 5.6 — Forecast Enhancements (optional)
  Configurable exposure realisation factor per company
  Historical margin trend chart
  Budget vs actual comparison
  Forecast scenario modelling (optimistic / conservative / expected)
