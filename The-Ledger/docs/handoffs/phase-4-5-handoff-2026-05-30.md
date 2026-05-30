# Phase 4.5 Handoff — Revenue Normalization

Date: 2026-05-30  
Session: Phase 4.5 Recovery Audit + Phase 5 Roadmap  
Branch: phase-5-financial-intelligence  
Status: **COMPLETE — Phase 4.5 fully implemented and committed**

---

## PROJECT STATUS

Phase 4.5 (Revenue Normalization) is **fully implemented**. All four revenue streams are wired end-to-end:

```
Worker/Equipment billing rates on records
        ↓
Review Center — PM approves WorkerReport
        ↓
Financial Mutation Engine (updateReviewItem)
        ↓
Normalized financial records (TimesheetEntry, ExpenseEntry,
InventoryMutation, EquipmentUsageRecord, InvoiceLineItem,
FinancialMutation)
        ↓
Financial Explorer (read-only audit view)
        ↓
Job Financial Summary (getJobFinancialSummary)
        ↓
Revenue Attribution — Labour + Material + Equipment + Expense
        ↓
Gross Profit + Margin %
```

The repository is clean. No uncommitted changes. Phase 5 has not been started.

---

## COMPLETED PHASES

### Phase 1 — Foundation & RBAC

Status: **COMPLETE**

Evidence:
- Routing via Wouter
- Full RBAC system with Role, Permission, User types
- `client/src/types/auth.ts` — PermissionKey union, Role, User interfaces
- Layout architecture (`client/src/components/layout.tsx`)
- Worker mobile views (`client/src/pages/worker/`)
- Dashboard foundation (`client/src/pages/dashboard.tsx`)

---

### Phase 2 — Field Operations

Status: **COMPLETE** (with minor edge-case testing remaining per doctrine)

Evidence:
- Worker mobile reporting: `client/src/pages/worker/`
- Upload system with `UploadPayload` type including full sync status lifecycle
- Offline queue: `client/src/lib/offlineQueueStore.ts`
- Synchronization engine: `client/src/lib/syncEventStore.ts`
- Playwright doctrine tests: `tests/doctrine/worker-to-review.spec.ts`, `tests/worker.spec.ts`
- Bridge function: `addReviewItemDirect()` — idempotent replay from queue to Review Center

---

### Phase 3 — Operational Management

Status: **COMPLETE** (scheduling intelligence improvements deferred per doctrine)

Evidence:
- Jobs, Clients, Workers, Equipment, Assets, Locations, Stock all implemented
- Full CRUD with company-scoped filtering in `useStore()`
- `client/src/types/job.ts` — JobCostBreakdown, JobFinancials, EquipmentUsage, Job interfaces
- `client/src/types/worker.ts` — Worker interface with Phase 4.5 billing rate fields
- Equipment detail and list pages implemented

---

### Phase 4.1 — Financial Normalization Layer

Status: **COMPLETE**

Evidence — defined interfaces in `client/src/lib/mockData.ts`:
- `TimesheetEntry` — normalized labour cost record
- `ExpenseEntry` — normalized expense record with `recoveryAmount`
- `InventoryMutation` — normalized material usage record
- `EquipmentUsageRecord` — normalized equipment usage with `billedRate` and `revenueImpact`
- `InvoiceLineItem` — traceable invoice line item per review/report
- `FinancialMutation` — append-only audit record of every financial state change

Mock arrays initialized empty, populated only by approval:
```typescript
export const mockTimesheets: TimesheetEntry[] = [];
export const mockExpenses: ExpenseEntry[] = [];
export const mockInventoryMutations: InventoryMutation[] = [];
export const mockEquipmentUsage: EquipmentUsageRecord[] = [];
export const mockInvoiceLineItems: InvoiceLineItem[] = [];
export const mockFinancialMutations: FinancialMutation[] = [];
```

---

### Phase 4.2 — Approval → Financial Mutation Engine

Status: **COMPLETE**

Evidence — `updateReviewItem()` in `client/src/lib/mockData.ts`:
- On `status === 'approved'` (and previous status was not approved), fires the mutation engine
- Generates `TimesheetEntry` for every `LaborPayload` on the ReviewItem
- Generates `ExpenseEntry` for every `ExpensePayload`
- Generates `InventoryMutation` for every `MaterialUsagePayload` (plus deducts stock)
- Generates `EquipmentUsageRecord` for every `EquipmentUsagePayload`
- Generates a corresponding `InvoiceLineItem` for every normalized record
- Generates two `FinancialMutation` audit records per operation (one for the financial record, one for the invoice line)
- Guard: does NOT re-run if item was already approved

---

### Phase 4.3 — Review Center & PM Scope Enforcement

Status: **COMPLETE**

Evidence:
- Review Center UI: `client/src/pages/review.tsx`, `client/src/pages/review-detail.tsx`
- Approval / Reject / Needs-Correction workflow
- PM scope enforcement: `tests/doctrine/pm-scope-enforcement.spec.ts`
- Correction notes: `ReviewItem.correctionNotes`, `ReviewItem.resubmissionCount`
- No-premature-mutation guard: `tests/doctrine/no-premature-financial-mutation.spec.ts`
- Audit log on every approval: `tests/doctrine/audit-log.spec.ts`

---

### Phase 4.4 — Job Financial Summary

Status: **COMPLETE**

Evidence:
- `JobFinancialSummary` interface defines: laborCost, materialCost, equipmentCost, expenseCost, totalCost, laborRevenue, materialRevenue, equipmentRevenue, expenseRevenue, totalRevenue, grossProfit, marginPercent, hasActivity
- `getJobFinancialSummary(jobId)` — pure calculation function, no side effects
- `JobFinancialSummarySection` component: `client/src/components/JobFinancialSummarySection.tsx`
- Rendered on Job Detail page: `client/src/pages/job-detail.tsx`
- Shows empty state when `hasActivity === false`
- Color-coded margin indicator (green/red/grey)

---

### Phase 4.5 — Revenue Normalization

Status: **COMPLETE**

Evidence:

**Worker Billable Rates:**
- `Worker.billableRate?: number` — default client charge rate per hour
- `Worker.costRate?: number` — internal wage cost per hour
- All 4 demo workers have both rates set:
  - Amir Khan: costRate=22, billableRate=75
  - Sophie Taylor: costRate=16, billableRate=55
  - Ben Hughes: costRate=16, billableRate=55
  - Priya Patel: costRate=17, billableRate=58
- Mutation engine looks up `workerRecord?.billableRate ?? hourlyRate` at approval time
- `TimesheetEntry.billableRate` + `TimesheetEntry.laborRevenue` populated

**Equipment Client Rates:**
- `Equipment.dayRate?: number` — internal cost per day
- `Equipment.clientDayRate?: number` — default client charge per day
- All 7 demo equipment items have both rates set (e.g. Hiab: dayRate=420, clientDayRate=520)
- Mutation engine resolves `clientDayRate / 8` as hourly billedRate at approval time
- Falls back to `dayRate / 8` (zero-margin) if clientDayRate is absent
- `EquipmentUsageRecord.billedRate` + `EquipmentUsageRecord.revenueImpact` populated

**Expense Recovery Markup:**
- `ExpensePayload.markupPercent?: number` — defaults to 0 (cost-only recovery)
- Mutation engine computes `recoveryAmount = amount × (1 + markupPercent / 100)`
- `ExpenseEntry.recoveryAmount` populated at approval time
- Invoice line item description includes markup % when > 0

**Revenue Attribution in Financial Summary:**
- `getJobFinancialSummary()` computes all four revenue streams from normalized records
- `laborRevenue` = sum of `TimesheetEntry.laborRevenue` per job
- `materialRevenue` = sum of `InventoryMutation.revenueImpact` per job
- `equipmentRevenue` = sum of `EquipmentUsageRecord.revenueImpact` per job
- `expenseRevenue` = sum of `ExpenseEntry.recoveryAmount` per job
- `grossProfit = totalRevenue - totalCost`
- `marginPercent = grossProfit / totalRevenue × 100`

**UI:**
- `JobFinancialSummarySection` renders all four revenue rows
- Financial Explorer page exposes all six normalized tables for inspection

---

## FINANCIAL NORMALIZATION STATUS

### Timesheets

Generated from `LaborPayload` entries on an approved ReviewItem.  
Stores: workerId, workerName, hours, hourlyRate (cost basis), laborCost, billableRate (revenue basis), laborRevenue.  
Falls back to hourlyRate as billableRate when Worker.billableRate is absent.

### Expenses

Generated from `ExpensePayload` entries on an approved ReviewItem.  
Stores: amount (cost), recoveryAmount (amount × markup multiplier).  
markupPercent defaults to 0 — zero-margin recovery by default.

### Inventory Mutations

Generated from `MaterialUsagePayload` entries on an approved ReviewItem.  
Deducts stock quantity via `deductStockQuantity()` as a side effect.  
Stores: unitCost, markupPrice, jobCostImpact (qty × unitCost), revenueImpact (qty × markupPrice).

### Equipment Usage

Generated from `EquipmentUsagePayload` entries on an approved ReviewItem.  
Stores: usageCost (hours × dayRate/8), billedRate (clientDayRate/8), revenueImpact (hours × billedRate).

### Invoice Line Items

Generated for every normalized record — one per TimesheetEntry, ExpenseEntry, InventoryMutation, EquipmentUsageRecord.  
Client-facing unit price = billableRate / recoveryAmount / markupPrice / billedRate respectively.  
Traceable back to source report and review via reportId and reviewId.

### Financial Mutations

Append-only audit log. Two records created per normalized object: one for the financial record, one for the corresponding InvoiceLineItem.  
Fields: jobId, sourceReportId, sourceReviewId, mutationType, entityId, createdAt, approvedBy.

---

## REVENUE NORMALIZATION STATUS

| Stream | Source Field | Calculation | Status |
|--------|-------------|-------------|--------|
| Labour Revenue | Worker.billableRate | hours × billableRate | LIVE |
| Equipment Revenue | Equipment.clientDayRate | hours × (clientDayRate / 8) | LIVE |
| Expense Recovery | ExpensePayload.markupPercent | amount × (1 + markup%) | LIVE |
| Material Revenue | MaterialUsagePayload.markupPrice | qty × markupPrice | LIVE |
| Gross Profit | All streams | totalRevenue − totalCost | LIVE |
| Margin % | Gross Profit / Total Revenue | (profit / revenue) × 100 | LIVE |

---

## CURRENT ARCHITECTURE

```
Worker Report (LaborPayload, EquipmentUsagePayload,
MaterialUsagePayload, ExpensePayload, UploadPayload)
        ↓
Offline Queue (offlineQueueStore.ts)
        ↓  [sync]
addReviewItemDirect() — idempotent bridge
        ↓
Review Center (review.tsx / review-detail.tsx)
        ↓
PM Approval → updateReviewItem(id, { status: 'approved' })
        ↓
Financial Mutation Engine (mockData.ts)
  ├── TimesheetEntry   (+ laborRevenue from Worker.billableRate)
  ├── ExpenseEntry     (+ recoveryAmount from markupPercent)
  ├── InventoryMutation(+ revenueImpact from markupPrice)
  ├── EquipmentUsageRecord (+ revenueImpact from Equipment.clientDayRate)
  ├── InvoiceLineItem  (one per above, client-facing price)
  └── FinancialMutation (two audit records per above)
        ↓
Financial Explorer (financial-explorer.tsx)
  └── Read-only tables for all six record types
        ↓
getJobFinancialSummary(jobId)
  ├── laborRevenue, materialRevenue, equipmentRevenue, expenseRevenue
  ├── totalRevenue, totalCost
  └── grossProfit, marginPercent
        ↓
JobFinancialSummarySection (on Job Detail page)
```

---

## KNOWN ISSUES

### Branch / Main Parity

The `phase-4-5-revenue-normalization` branch was created after Phase 4.5 was committed directly to `main`. Both branches point at the same HEAD commit (`a56036ff`). The feature branch contains no divergent work. There is no open PR for Phase 4.5. This is a git hygiene issue, not a functional one. Phase 4.5 implementation is correct and present on main.

The current session creates `phase-5-financial-intelligence` as a clean feature branch branching from main, re-establishing proper branch discipline going forward.

### Playwright Verification

The dev server was not running during this audit session. Playwright UI verification could not be performed. All evidence is sourced from filesystem inspection of source code. Dev server must be running (`npm run dev` or `vite`) for Playwright tests to execute.

### useJobIntelligence Disconnect

`useJobIntelligence.ts` calculates profitability from `job.costs.*` and `Invoice.lineItems` — the static, pre-approval data. It does not read from the Phase 4.2/4.5 normalized financial records (`mockTimesheets`, `mockExpenses`, etc.). This means the Job Intelligence Dashboard (`/job-intelligence`) uses a different data path than `getJobFinancialSummary()`. Phase 5 should unify these two calculation paths.

### Finance Type Divergence

`client/src/types/finance.ts` defines a `FinancialMutationEvent` interface with `syncedStatus` (for accounting sync) that is separate from the `FinancialMutation` interface used by the mutation engine in `mockData.ts`. These will need reconciling when Phase 6 (accounting integration) is implemented.

---

## RECOMMENDED NEXT PHASE

Phase 5 — Financial Intelligence

Based on:
1. Doctrine: `LEDGER_CANONICAL_CONTEXT.md` lists Phase 5 as "Next" with status "Planned"
2. Repository: Phase 4.5 is the last completed work. All Phase 4 objectives are met.
3. Phase 5 planned items from doctrine: Dynamic profitability engine, Payroll engine, Invoice generation pipeline, Margin intelligence, Financial forecasting

See `docs/handoffs/phase-5-proposal-2026-05-30.md` for full implementation proposal.

---

## HANDOFF PROMPT

For the next Claude session:

```
Pick up from docs/handoffs/phase-4-5-handoff-2026-05-30.md and
docs/handoffs/phase-5-proposal-2026-05-30.md.

Phase 4 is fully complete. Phase 5 has not been started.

The current working branch is: phase-5-financial-intelligence

Before implementing, read:
  docs/LEDGER_CANONICAL_CONTEXT.md
  docs/handoffs/phase-4-5-handoff-2026-05-30.md
  docs/handoffs/phase-5-proposal-2026-05-30.md

Audit the branch first. Then implement Phase 5 per the proposal.
Do not merge to main. Open a PR when complete.
```
