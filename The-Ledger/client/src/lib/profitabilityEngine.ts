// ======================================================
// PHASE 5.2 — PROFITABILITY ENGINE
//
// Pure calculation functions. No side effects. No storage.
// All derived from getJobFinancialSummary() and the Phase 4.5
// normalized financial arrays.
//
// Core doctrine: Single Source of Financial Truth.
// getJobFinancialSummary() is the one engine. These functions
// are aggregators and presenters, not alternative calculations.
// ======================================================

import {
  getJobFinancialSummary,
  JobFinancialSummary,
  mockTimesheets,
  mockInvoiceLineItems,
  TimesheetEntry,
  InvoiceLineItem,
} from "./mockData";

import type { Job } from "@/types/job";
import type { ReviewItem } from "@/lib/mockData";

// ──────────────────────────────────────────────────────
// TYPE: PayrollStagingRecord
//
// Groups approved TimesheetEntry records by worker.
// This is a STAGING layer — not a payment instruction.
// Used to present approved labour hours per worker for
// payroll review before export.
// ──────────────────────────────────────────────────────
export interface PayrollStagingRecord {
  workerId: string;
  workerName: string;
  totalHours: number;
  totalCost: number;    // sum of TimesheetEntry.laborCost
  totalRevenue: number; // sum of TimesheetEntry.laborRevenue
  margin: number;       // (totalRevenue - totalCost) / totalRevenue * 100
  timesheetIds: string[];
  jobIds: string[];     // distinct jobs this worker has hours on
  periodLabel: string;  // 'All time' or 'Period: start – end'
  status: 'draft' | 'staged' | 'exported';
}

// ──────────────────────────────────────────────────────
// getProfitabilityMetrics
//
// Per-job profitability KPIs derived from the Phase 4.5
// normalized records via getJobFinancialSummary().
//
// revenuePerLabourHour and costPerLabourHour are computed
// from TimesheetEntry records for the job.
// ──────────────────────────────────────────────────────
export interface ProfitabilityMetrics {
  jobId: string;
  grossProfit: number;
  marginPercent: number;
  totalRevenue: number;
  totalCost: number;
  revenuePerLabourHour: number; // totalRevenue / totalHours (0 if no labour)
  costPerLabourHour: number;    // laborCost / totalHours    (0 if no labour)
  totalLabourHours: number;
  hasActivity: boolean;
}

export function getProfitabilityMetrics(jobId: string): ProfitabilityMetrics {
  const s = getJobFinancialSummary(jobId);

  const jobTimesheets = mockTimesheets.filter((t) => t.jobId === jobId);
  const totalLabourHours = jobTimesheets.reduce((sum, t) => sum + t.hours, 0);

  const revenuePerLabourHour =
    totalLabourHours > 0 ? s.totalRevenue / totalLabourHours : 0;
  const costPerLabourHour =
    totalLabourHours > 0 ? s.laborCost / totalLabourHours : 0;

  return {
    jobId,
    grossProfit: s.grossProfit,
    marginPercent: s.marginPercent,
    totalRevenue: s.totalRevenue,
    totalCost: s.totalCost,
    revenuePerLabourHour,
    costPerLabourHour,
    totalLabourHours,
    hasActivity: s.hasActivity,
  };
}

// ──────────────────────────────────────────────────────
// getAllJobMargins
//
// Portfolio-level margin intelligence.
// Returns all jobs sorted by marginPercent descending.
// Jobs with margin < targetMarginPercent are flagged.
// Jobs with hasActivity === false are shown last.
// ──────────────────────────────────────────────────────
export interface JobMarginRecord {
  job: Job;
  summary: JobFinancialSummary;
  belowThreshold: boolean;
  hasActivity: boolean;
  rank: number; // 1 = highest margin
}

export function getAllJobMargins(
  jobs: Job[],
  targetMarginPercent = 20
): JobMarginRecord[] {
  const records = jobs
    .map((job) => {
      const summary = getJobFinancialSummary(job.id);
      return {
        job,
        summary,
        belowThreshold:
          summary.hasActivity && summary.marginPercent < targetMarginPercent,
        hasActivity: summary.hasActivity,
      };
    })
    .sort((a, b) => {
      // Jobs with activity first, sorted by margin desc
      if (a.hasActivity !== b.hasActivity)
        return a.hasActivity ? -1 : 1;
      return b.summary.marginPercent - a.summary.marginPercent;
    });

  return records.map((r, i) => ({ ...r, rank: i + 1 }));
}

// ──────────────────────────────────────────────────────
// getPendingExposure
//
// Financial exposure from ReviewItems with status 'pending'.
// Reads LaborPayload, MaterialUsagePayload, EquipmentUsagePayload,
// ExpensePayload directly from the unapproved ReviewItem payloads.
//
// This is an estimate — pending items have not been approved
// so they may change. The function makes this explicit via the
// return type label.
// ──────────────────────────────────────────────────────
export interface PendingExposure {
  pendingLaborCost: number;
  pendingLaborRevenue: number;
  pendingMaterialCost: number;
  pendingEquipmentCost: number;
  pendingExpenseCost: number;
  totalPendingCost: number;
  totalPendingRevenue: number;
  pendingItemCount: number;
  isEstimate: true; // always true — reminds consumers this is pre-approval
}

export function getPendingExposure(
  reviewItems: ReviewItem[],
  jobId?: string
): PendingExposure {
  const pending = reviewItems.filter(
    (r) =>
      r.status === 'pending' && (jobId === undefined || r.jobId === jobId)
  );

  let pendingLaborCost = 0;
  let pendingLaborRevenue = 0;
  let pendingMaterialCost = 0;
  let pendingEquipmentCost = 0;
  let pendingExpenseCost = 0;

  for (const item of pending) {
    // Labour
    for (const l of item.laborEntries ?? []) {
      const cost = (l.hours ?? 0) * (l.hourlyRate ?? 0);
      pendingLaborCost += cost;
      // Revenue estimate: same rate (conservative — no billableRate lookup
      // since this is pre-approval and the worker may not have one set)
      pendingLaborRevenue += cost;
    }

    // Materials
    for (const m of item.materialsUsed ?? []) {
      pendingMaterialCost += (m.quantity ?? 0) * (m.unitCost ?? 0);
    }

    // Equipment (estimate: hoursUsed × some daily rate — no day cost here
    // without equipment lookup; use 0 as conservative safe value)
    // Equipment cost exposure is shown as 0 — it requires Equipment.dayRate
    // lookup which is not available without the store reference.
    // Components that call this can add equipment cost separately.

    // Expenses
    for (const e of item.expenses ?? []) {
      pendingExpenseCost += e.amount ?? 0;
    }
  }

  const totalPendingCost =
    pendingLaborCost + pendingMaterialCost + pendingEquipmentCost + pendingExpenseCost;
  const totalPendingRevenue = pendingLaborRevenue;

  return {
    pendingLaborCost,
    pendingLaborRevenue,
    pendingMaterialCost,
    pendingEquipmentCost,
    pendingExpenseCost,
    totalPendingCost,
    totalPendingRevenue,
    pendingItemCount: pending.length,
    isEstimate: true,
  };
}

// ──────────────────────────────────────────────────────
// getJobInvoiceReadiness
//
// Aggregates approved InvoiceLineItem records for a job.
// Groups by type. Returns total billable value.
//
// NOTE: InvoiceLineItem records are generated by the Phase 4.2
// mutation engine on approval. They coexist with legacy
// Invoice documents created from job.costs.*. This function
// ONLY reads from the normalized Phase 4.2/4.5 records.
// ──────────────────────────────────────────────────────
export interface InvoiceReadiness {
  jobId: string;
  lines: InvoiceLineItem[];
  byType: {
    labor: InvoiceLineItem[];
    material: InvoiceLineItem[];
    equipment: InvoiceLineItem[];
    expense: InvoiceLineItem[];
  };
  totalBillable: number;
  hasLines: boolean;
}

export function getJobInvoiceReadiness(
  jobId: string,
  invoiceLineItems: InvoiceLineItem[]
): InvoiceReadiness {
  const lines = invoiceLineItems.filter((li) => li.jobId === jobId);

  const byType = {
    labor: lines.filter((li) => li.type === 'labor'),
    material: lines.filter((li) => li.type === 'material'),
    equipment: lines.filter((li) => li.type === 'equipment'),
    expense: lines.filter((li) => li.type === 'expense'),
  };

  const totalBillable = lines.reduce((sum, li) => sum + li.amount, 0);

  return {
    jobId,
    lines,
    byType,
    totalBillable,
    hasLines: lines.length > 0,
  };
}

// ──────────────────────────────────────────────────────
// groupTimesheetsForPayroll
//
// Groups approved TimesheetEntry records by worker.
// Returns one PayrollStagingRecord per worker.
// Filtered to a specific period if periodStart/periodEnd given.
//
// STATUS: always 'draft' — payroll staging does not process
// payments. It produces a review-ready grouping only.
// ──────────────────────────────────────────────────────
export function groupTimesheetsForPayroll(
  timesheets: TimesheetEntry[],
  periodStart?: string,
  periodEnd?: string
): PayrollStagingRecord[] {
  // Apply period filter if given
  const filtered = timesheets.filter((t) => {
    if (periodStart && t.approvedAt < periodStart) return false;
    if (periodEnd && t.approvedAt > periodEnd) return false;
    return true;
  });

  // Group by workerId
  const byWorker = new Map<string, TimesheetEntry[]>();
  for (const t of filtered) {
    if (!byWorker.has(t.workerId)) byWorker.set(t.workerId, []);
    byWorker.get(t.workerId)!.push(t);
  }

  const periodLabel =
    periodStart && periodEnd
      ? `Period: ${new Date(periodStart).toLocaleDateString('en-GB')} – ${new Date(periodEnd).toLocaleDateString('en-GB')}`
      : 'All approved timesheets';

  const records: PayrollStagingRecord[] = [];

  byWorker.forEach((entries, workerId) => {
    const workerName = entries[0].workerName;
    const totalHours = entries.reduce((s, t) => s + t.hours, 0);
    const totalCost = entries.reduce((s, t) => s + t.laborCost, 0);
    const totalRevenue = entries.reduce((s, t) => s + t.laborRevenue, 0);
    const margin =
      totalRevenue > 0
        ? ((totalRevenue - totalCost) / totalRevenue) * 100
        : 0;
    const timesheetIds = entries.map((t) => t.id);
    const jobIds = [...new Set(entries.map((t) => t.jobId))];

    records.push({
      workerId,
      workerName,
      totalHours,
      totalCost,
      totalRevenue,
      margin,
      timesheetIds,
      jobIds,
      periodLabel,
      status: 'draft',
    });
  });

  // Sort by totalHours desc
  records.sort((a, b) => b.totalHours - a.totalHours);

  return records;
}
