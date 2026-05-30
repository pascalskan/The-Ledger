// ======================================================
// PHASE 5.4 — PAYROLL EXPORT ENGINE
//
// Pure calculation layer. No side effects. No storage.
// All derived from groupTimesheetsForPayroll() which reads
// from mockTimesheets (approved TimesheetEntry records).
//
// Core doctrine:
//   Approved Operational Activity
//   → Financial Mutation Engine
//   → Payroll Staging (groupTimesheetsForPayroll)
//   → Payroll Export Engine (this file)
//
// Never: Job → Payroll Export directly.
// ======================================================

import type { TimesheetEntry } from "./mockData";
import type { PayrollExportPeriod, PayrollExportWorkerLine } from "./mockData";
import { groupTimesheetsForPayroll } from "./profitabilityEngine";

// ──────────────────────────────────────────────────────
// CONSTANTS
// ──────────────────────────────────────────────────────

// Standard UK weekly hours threshold for overtime detection.
// Hours above this per period are flagged as overtime.
export const OVERTIME_THRESHOLD_WEEKLY = 37.5;
export const OVERTIME_THRESHOLD_FORTNIGHTLY = 75.0;
export const OVERTIME_THRESHOLD_MONTHLY = 162.5; // ~37.5 * (52/12)

export const PERIOD_TYPE_LABELS: Record<PayrollExportPeriod["periodType"], string> = {
  weekly: "Weekly",
  fortnightly: "Fortnightly",
  monthly: "Monthly",
};

export const EXPORT_STATUS_LABELS: Record<PayrollExportPeriod["status"], string> = {
  draft: "Draft",
  staged: "Staged",
  exported: "Exported",
};

export const EXPORT_STATUS_COLORS: Record<PayrollExportPeriod["status"], string> = {
  draft: "text-amber-700 bg-amber-50 border-amber-200",
  staged: "text-blue-700 bg-blue-50 border-blue-200",
  exported: "text-emerald-700 bg-emerald-50 border-emerald-200",
};

// ──────────────────────────────────────────────────────
// PERIOD LABEL GENERATORS
// ──────────────────────────────────────────────────────

export function generatePayrollPeriodLabel(
  periodType: PayrollExportPeriod["periodType"],
  periodEnd: Date
): string {
  const dateStr = periodEnd.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  switch (periodType) {
    case "weekly":      return `Week ending ${dateStr}`;
    case "fortnightly": return `Fortnight ending ${dateStr}`;
    case "monthly":     return `Month ending ${dateStr}`;
  }
}

// ──────────────────────────────────────────────────────
// getPeriodBounds
//
// Returns the ISO date strings for the start and end of
// the period type relative to the reference date.
// Reference date is typically "now" or a selected date.
// ──────────────────────────────────────────────────────
export function getPeriodBounds(
  periodType: PayrollExportPeriod["periodType"],
  referenceDate: Date = new Date()
): { start: string; end: string; label: string } {
  const ref = new Date(referenceDate);

  if (periodType === "weekly") {
    // Week ending Sunday
    const dayOfWeek = ref.getDay(); // 0=Sun
    const daysUntilSunday = dayOfWeek === 0 ? 0 : 7 - dayOfWeek;
    const end = new Date(ref);
    end.setDate(ref.getDate() + daysUntilSunday);
    end.setHours(23, 59, 59, 999);
    const start = new Date(end);
    start.setDate(end.getDate() - 6);
    start.setHours(0, 0, 0, 0);
    return {
      start: start.toISOString(),
      end: end.toISOString(),
      label: generatePayrollPeriodLabel("weekly", end),
    };
  }

  if (periodType === "fortnightly") {
    // Fortnight ending Sunday of current week
    const dayOfWeek = ref.getDay();
    const daysUntilSunday = dayOfWeek === 0 ? 0 : 7 - dayOfWeek;
    const end = new Date(ref);
    end.setDate(ref.getDate() + daysUntilSunday);
    end.setHours(23, 59, 59, 999);
    const start = new Date(end);
    start.setDate(end.getDate() - 13);
    start.setHours(0, 0, 0, 0);
    return {
      start: start.toISOString(),
      end: end.toISOString(),
      label: generatePayrollPeriodLabel("fortnightly", end),
    };
  }

  // Monthly: calendar month containing referenceDate
  const start = new Date(ref.getFullYear(), ref.getMonth(), 1, 0, 0, 0, 0);
  const end = new Date(ref.getFullYear(), ref.getMonth() + 1, 0, 23, 59, 59, 999);
  return {
    start: start.toISOString(),
    end: end.toISOString(),
    label: generatePayrollPeriodLabel("monthly", end),
  };
}

// ──────────────────────────────────────────────────────
// getOvertimeThreshold
//
// Returns the overtime hours threshold for the period type.
// ──────────────────────────────────────────────────────
export function getOvertimeThreshold(
  periodType: PayrollExportPeriod["periodType"]
): number {
  switch (periodType) {
    case "weekly":      return OVERTIME_THRESHOLD_WEEKLY;
    case "fortnightly": return OVERTIME_THRESHOLD_FORTNIGHTLY;
    case "monthly":     return OVERTIME_THRESHOLD_MONTHLY;
  }
}

// ──────────────────────────────────────────────────────
// generatePayrollExportPeriod
//
// Derives a PayrollExportPeriod from approved TimesheetEntry[]
// for the given period type and reference date.
//
// IMPORTANT: All inputs come from mockTimesheets which is
// populated exclusively by the Review Center approval engine.
// This function does not read from Job records directly.
// ──────────────────────────────────────────────────────
export function generatePayrollExportPeriod(
  timesheets: TimesheetEntry[],
  periodType: PayrollExportPeriod["periodType"],
  referenceDate: Date = new Date()
): PayrollExportPeriod {
  const { start, end, label } = getPeriodBounds(periodType, referenceDate);
  const overtimeThreshold = getOvertimeThreshold(periodType);

  // Re-use the existing groupTimesheetsForPayroll() aggregation layer.
  // This preserves the Single Source of Financial Truth.
  const stagingRecords = groupTimesheetsForPayroll(timesheets, start, end);

  const workerLines: PayrollExportWorkerLine[] = stagingRecords.map((r) => {
    const regularHours = Math.min(r.totalHours, overtimeThreshold);
    const overtimeHours = Math.max(0, r.totalHours - overtimeThreshold);
    return {
      workerId: r.workerId,
      workerName: r.workerName,
      totalHours: r.totalHours,
      regularHours,
      overtimeHours,
      totalCost: r.totalCost,
      totalRevenue: r.totalRevenue,
      margin: r.margin,
      timesheetIds: r.timesheetIds,
      jobIds: r.jobIds,
    };
  });

  const totalHours = workerLines.reduce((s, w) => s + w.totalHours, 0);
  const totalCost = workerLines.reduce((s, w) => s + w.totalCost, 0);
  const totalRevenue = workerLines.reduce((s, w) => s + w.totalRevenue, 0);
  const totalOvertimeHours = workerLines.reduce((s, w) => s + w.overtimeHours, 0);

  const now = new Date().toISOString();

  return {
    id: Math.random().toString(36).substr(2, 9),
    periodType,
    periodLabel: label,
    periodStart: start,
    periodEnd: end,
    workerLines,
    workerCount: workerLines.length,
    totalHours,
    totalCost,
    totalRevenue,
    totalOvertimeHours,
    status: "draft",
    createdAt: now,
    updatedAt: now,
  };
}

// ──────────────────────────────────────────────────────
// generateCSVExport
//
// Produces a plain CSV string from a PayrollExportPeriod.
// This is the browser-side export format.
// In production, this would be POSTed to an accounting
// integration endpoint (Phase 6).
// ──────────────────────────────────────────────────────
export function generateCSVExport(period: PayrollExportPeriod): string {
  const fmt = (n: number) => n.toFixed(2);
  const rows: string[] = [
    `Payroll Export — ${period.periodLabel}`,
    `Period type,${PERIOD_TYPE_LABELS[period.periodType]}`,
    `Period start,${new Date(period.periodStart).toLocaleDateString("en-GB")}`,
    `Period end,${new Date(period.periodEnd).toLocaleDateString("en-GB")}`,
    `Status,${EXPORT_STATUS_LABELS[period.status]}`,
    `Worker count,${period.workerCount}`,
    `Total hours,${fmt(period.totalHours)}`,
    `Total labour cost,£${fmt(period.totalCost)}`,
    `Total labour revenue,£${fmt(period.totalRevenue)}`,
    `Total overtime hours,${fmt(period.totalOvertimeHours)}`,
    "",
    "Worker,Total Hours,Regular Hours,Overtime Hours,Labour Cost,Labour Revenue,Margin %,Timesheet IDs,Job IDs",
    ...period.workerLines.map((w) =>
      [
        w.workerName,
        fmt(w.totalHours),
        fmt(w.regularHours),
        fmt(w.overtimeHours),
        `£${fmt(w.totalCost)}`,
        `£${fmt(w.totalRevenue)}`,
        `${fmt(w.margin)}%`,
        w.timesheetIds.join(";"),
        w.jobIds.join(";"),
      ].join(",")
    ),
  ];
  return rows.join("\n");
}

// ──────────────────────────────────────────────────────
// isValidExportTransition
//
// Validates status workflow: draft → staged → exported
// No backward transitions permitted.
// ──────────────────────────────────────────────────────
export function isValidExportTransition(
  from: PayrollExportPeriod["status"],
  to: PayrollExportPeriod["status"]
): boolean {
  const ORDER: Record<PayrollExportPeriod["status"], number> = {
    draft: 0,
    staged: 1,
    exported: 2,
  };
  return ORDER[to] === ORDER[from] + 1;
}

export function nextExportStatus(
  current: PayrollExportPeriod["status"]
): PayrollExportPeriod["status"] | null {
  if (current === "draft")   return "staged";
  if (current === "staged")  return "exported";
  return null;
}

export const EXPORT_STATUS_NEXT_LABEL: Record<PayrollExportPeriod["status"], string> = {
  draft: "Mark as Staged",
  staged: "Export Payroll",
  exported: "",
};
