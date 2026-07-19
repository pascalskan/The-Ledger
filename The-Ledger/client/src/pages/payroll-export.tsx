// ======================================================
// PHASE 5.4 — PAYROLL EXPORT PAGE
//
// Generates downloadable payroll exports from approved
// TimesheetEntry records grouped by worker.
//
// Doctrine flow:
//   Approved TimesheetEntry records
//   → groupTimesheetsForPayroll()   (profitabilityEngine.ts)
//   → PayrollStagingRecord[]        (draft staging)
//   → generatePayrollExport()       (payrollExportEngine.ts)
//   → PayrollExport                 (this page)
//   → CSV download
//
// This page does NOT re-derive hours from raw ReviewItems.
// It does NOT create a new financial calculation engine.
// It consumes from the approved TimesheetEntry layer only.
// ======================================================

import { useState } from "react";
import { Layout } from "@/components/layout";
import { useStore, useAuth, generateExportNumber } from "@/lib/mockData";
import { groupTimesheetsForPayroll } from "@/lib/profitabilityEngine";
import {
  generatePayrollExport,
  serializePayrollExportToCSV,
  derivePeriodBounds,
  EXPORT_STATUS_LABELS,
  EXPORT_STATUS_COLORS,
} from "@/lib/payrollExportEngine";
import type { PayrollPeriodType } from "@/lib/payrollExportEngine";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Users,
  Clock,
  DollarSign,
  AlertTriangle,
  Activity,
  Download,
  FileDown,
  CheckCircle2,
  TrendingUp,
} from "lucide-react";

function fmt(n: number) {
  return `£${n.toLocaleString("en-GB", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function fmtDateTime(iso: string) {
  return new Date(iso).toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const PERIOD_OPTIONS: { value: PayrollPeriodType; label: string }[] = [
  { value: "all",           label: "All approved timesheets" },
  { value: "current-month", label: "Current month" },
  { value: "last-month",    label: "Previous month" },
];

export function PayrollExportContent() {
  const { timesheets, jobs, payrollExports, addPayrollExport, updatePayrollExportStatus } = useStore();
  const { user } = useAuth();
  const [selectedPeriod, setSelectedPeriod] = useState<PayrollPeriodType>("all");

  const periodBounds = derivePeriodBounds(selectedPeriod);
  const stagingRecords = groupTimesheetsForPayroll(
    timesheets,
    periodBounds.startDate ?? undefined,
    periodBounds.endDate ?? undefined,
  );

  // Build job lookup map for label resolution
  const jobLookup = new Map(jobs.map((j) => [j.id, j.title]));

  const previewTotalHours   = stagingRecords.reduce((s, r) => s + r.totalHours, 0);
  const previewTotalCost    = stagingRecords.reduce((s, r) => s + r.totalCost, 0);
  const previewTotalRevenue = stagingRecords.reduce((s, r) => s + r.totalRevenue, 0);

  const handleGenerate = () => {
    if (stagingRecords.length === 0) return;

    const id = `payroll-export-${Date.now()}`;
    const exportNumber = generateExportNumber();
    const generatedBy = user?.name ?? "Unknown";

    const payrollExport = generatePayrollExport(
      id,
      exportNumber,
      stagingRecords,
      periodBounds,
      jobLookup,
      generatedBy,
    );

    addPayrollExport(payrollExport);
  };

  const handleDownload = (exportId: string) => {
    const payrollExport = payrollExports.find((e) => e.id === exportId);
    if (!payrollExport) return;

    const csv = serializePayrollExportToCSV(payrollExport);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${payrollExport.exportNumber}-payroll-export.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    // Mark as downloaded if still at 'generated'
    if (payrollExport.status === "generated") {
      updatePayrollExportStatus(exportId, "downloaded");
    }
  };

  const handleMarkExported = (exportId: string) => {
    updatePayrollExportStatus(exportId, "exported");
  };

  return (
      <div className="space-y-6" data-testid="payroll-export-page">
        {/* Header */}
        <div>
          <h2
            className="text-3xl font-bold tracking-tight"
            data-testid="page-title-payroll-export"
          >
            Payroll Export
          </h2>
          <p className="text-muted-foreground mt-1">
            Generate payroll exports from approved timesheet records. Downloads
            as CSV for import into your payroll or accounting system.
          </p>
        </div>

        {/* Doctrine disclaimer */}
        <Alert className="border-amber-200 bg-amber-50 text-amber-800">
          <AlertTriangle className="h-4 w-4 text-amber-600" />
          <AlertDescription>
            <strong>Payroll export — not a payment instruction.</strong> Exports are
            generated from approved TimesheetEntry records only. Hours and costs are
            sourced from the Review Centre approval engine. Final payroll must be
            verified and authorised in your payroll system.
          </AlertDescription>
        </Alert>

        {/* Period selector */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-medium text-muted-foreground">Period:</span>
          {PERIOD_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setSelectedPeriod(opt.value)}
              data-testid={`period-btn-${opt.value}`}
              className={[
                "px-3 py-1.5 rounded-md text-sm font-medium border transition-colors",
                selectedPeriod === opt.value
                  ? "bg-primary text-primary-foreground border-primary"
                  : "border-input bg-background text-foreground hover:bg-muted",
              ].join(" ")}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {/* Preview KPI strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3" data-testid="payroll-export-kpi-strip">
          <Card>
            <CardHeader className="pb-1 pt-4 px-4">
              <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Workers
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4 flex items-center gap-2">
              <Users className="h-5 w-5 text-blue-600 flex-shrink-0" />
              <span className="text-2xl font-bold" data-testid="preview-worker-count">
                {stagingRecords.length}
              </span>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-1 pt-4 px-4">
              <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Total Hours
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4 flex items-center gap-2">
              <Clock className="h-5 w-5 text-violet-600 flex-shrink-0" />
              <span className="text-2xl font-bold" data-testid="preview-total-hours">
                {previewTotalHours.toFixed(1)}
              </span>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-1 pt-4 px-4">
              <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Labour Cost
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4 flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-red-500 flex-shrink-0" />
              <span className="text-2xl font-bold" data-testid="preview-total-cost">
                {fmt(previewTotalCost)}
              </span>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-1 pt-4 px-4">
              <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Labour Revenue
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4 flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-emerald-600 flex-shrink-0" />
              <span className="text-2xl font-bold" data-testid="preview-total-revenue">
                {fmt(previewTotalRevenue)}
              </span>
            </CardContent>
          </Card>
        </div>

        {/* Staging preview table */}
        {stagingRecords.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground border-2 border-dashed rounded-xl">
            <Activity className="h-10 w-10 mb-3 opacity-20" />
            <p className="text-sm font-medium">No approved timesheet records for this period.</p>
            <p className="text-xs mt-1 opacity-70">
              Approve worker reports in the Review Centre to populate payroll data.
            </p>
          </div>
        ) : (
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                Workers in Export Preview
              </h3>
              <Button
                onClick={handleGenerate}
                data-testid="btn-generate-export"
              >
                <FileDown className="h-4 w-4 mr-2" />
                Generate Export
              </Button>
            </div>

            <div className="border rounded-md" data-testid="payroll-export-preview-table">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Worker</TableHead>
                    <TableHead className="text-right">Hours</TableHead>
                    <TableHead className="text-right">Labour Cost</TableHead>
                    <TableHead className="text-right">Labour Revenue</TableHead>
                    <TableHead className="text-right">Margin</TableHead>
                    <TableHead>Jobs</TableHead>
                    <TableHead className="text-right">Timesheets</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {stagingRecords.map((r) => (
                    <TableRow key={r.workerId} data-testid={`preview-row-${r.workerId}`}>
                      <TableCell className="font-medium">{r.workerName}</TableCell>
                      <TableCell className="text-right font-mono">
                        {r.totalHours.toFixed(1)}
                      </TableCell>
                      <TableCell className="text-right font-medium text-red-600">
                        {fmt(r.totalCost)}
                      </TableCell>
                      <TableCell className="text-right font-medium text-emerald-600">
                        {fmt(r.totalRevenue)}
                      </TableCell>
                      <TableCell className="text-right">
                        <span
                          className={[
                            "font-semibold text-sm",
                            r.margin >= 20
                              ? "text-green-600"
                              : r.margin > 0
                              ? "text-amber-600"
                              : "text-red-600",
                          ].join(" ")}
                        >
                          {r.margin.toFixed(1)}%
                        </span>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground max-w-[180px] truncate">
                        {r.jobIds.map((jid) => jobLookup.get(jid) ?? jid).join(", ")}
                      </TableCell>
                      <TableCell className="text-right text-sm text-muted-foreground">
                        {r.timesheetIds.length}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <p className="text-xs text-muted-foreground mt-2">
              {stagingRecords.reduce((s, r) => s + r.timesheetIds.length, 0)} approved
              timesheet record{stagingRecords.reduce((s, r) => s + r.timesheetIds.length, 0) !== 1 ? "s" : ""} ·
              Period: {periodBounds.label}
            </p>
          </div>
        )}

        {/* Generated Exports */}
        {payrollExports.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
              Generated Exports ({payrollExports.length})
            </h3>

            <div className="space-y-3" data-testid="payroll-exports-list">
              {[...payrollExports].reverse().map((exp) => (
                <Card key={exp.id} data-testid={`export-card-${exp.id}`}>
                  <CardContent className="p-4">
                    {/* Top row: metadata + actions */}
                    <div className="flex items-start justify-between gap-4 flex-wrap">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span
                            className="font-mono font-semibold text-sm"
                            data-testid={`export-number-${exp.id}`}
                          >
                            {exp.exportNumber}
                          </span>
                          <Badge
                            variant="outline"
                            className={EXPORT_STATUS_COLORS[exp.status]}
                            data-testid={`export-status-${exp.id}`}
                          >
                            {EXPORT_STATUS_LABELS[exp.status]}
                          </Badge>
                          {exp.isValid ? (
                            <Badge
                              variant="outline"
                              className="text-emerald-600 border-emerald-200 bg-emerald-50"
                              data-testid={`export-valid-badge-${exp.id}`}
                            >
                              <CheckCircle2 className="h-3 w-3 mr-1" />
                              Valid
                            </Badge>
                          ) : (
                            <Badge
                              variant="outline"
                              className="text-red-600 border-red-200 bg-red-50"
                              data-testid={`export-invalid-badge-${exp.id}`}
                            >
                              <AlertTriangle className="h-3 w-3 mr-1" />
                              Invalid
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Period: {exp.period.label}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Generated by {exp.generatedBy} · {fmtDateTime(exp.generatedAt)}
                        </p>
                      </div>

                      <div className="flex flex-col items-end gap-2">
                        <div className="text-right">
                          <p className="text-sm font-medium" data-testid={`export-totals-${exp.id}`}>
                            {exp.totalWorkers} worker{exp.totalWorkers !== 1 ? "s" : ""} ·{" "}
                            {exp.totalHours.toFixed(1)} hrs ·{" "}
                            <span className="text-red-600">{fmt(exp.totalCost)}</span>
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Revenue: <span className="text-emerald-600">{fmt(exp.totalRevenue)}</span> ·{" "}
                            Margin: {exp.overallMargin.toFixed(1)}%
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDownload(exp.id)}
                            data-testid={`btn-download-${exp.id}`}
                          >
                            <Download className="h-4 w-4 mr-1" />
                            Download CSV
                          </Button>
                          {exp.status !== "exported" && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleMarkExported(exp.id)}
                              data-testid={`btn-mark-exported-${exp.id}`}
                              className="text-emerald-700 border-emerald-200 hover:bg-emerald-50"
                            >
                              <CheckCircle2 className="h-4 w-4 mr-1" />
                              Mark Exported
                            </Button>
                          )}
                          {exp.status === "exported" && (
                            <p
                              className="text-xs text-emerald-600 font-medium self-center"
                              data-testid={`export-complete-label-${exp.id}`}
                            >
                              ✓ Exported to payroll system
                            </p>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Validation errors */}
                    {!exp.isValid && exp.validationErrors.length > 0 && (
                      <div
                        className="mt-3 border-t pt-3"
                        data-testid={`export-validation-errors-${exp.id}`}
                      >
                        <p className="text-xs font-medium text-red-700 mb-1">Validation errors:</p>
                        <ul className="space-y-0.5">
                          {exp.validationErrors.map((err, i) => (
                            <li key={i} className="text-xs text-red-600 flex items-start gap-1">
                              <AlertTriangle className="h-3 w-3 mt-0.5 flex-shrink-0" />
                              {err}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Worker breakdown table */}
                    <div className="mt-3 border-t pt-3">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="text-xs">Worker</TableHead>
                            <TableHead className="text-right text-xs">Hours</TableHead>
                            <TableHead className="text-right text-xs">Cost</TableHead>
                            <TableHead className="text-right text-xs">Revenue</TableHead>
                            <TableHead className="text-right text-xs">Margin</TableHead>
                            <TableHead className="text-xs">Jobs</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {exp.workers.map((w) => (
                            <TableRow
                              key={w.workerId}
                              data-testid={`export-worker-row-${exp.id}-${w.workerId}`}
                            >
                              <TableCell className="text-sm font-medium py-2">
                                {w.workerName}
                              </TableCell>
                              <TableCell className="text-right font-mono text-sm py-2">
                                {w.totalHours.toFixed(1)}
                              </TableCell>
                              <TableCell className="text-right text-sm py-2 text-red-600">
                                {fmt(w.totalCost)}
                              </TableCell>
                              <TableCell className="text-right text-sm py-2 text-emerald-600">
                                {fmt(w.totalRevenue)}
                              </TableCell>
                              <TableCell className="text-right text-sm py-2">
                                <span
                                  className={
                                    w.margin >= 20
                                      ? "text-green-600"
                                      : w.margin > 0
                                      ? "text-amber-600"
                                      : "text-red-600"
                                  }
                                >
                                  {w.margin.toFixed(1)}%
                                </span>
                              </TableCell>
                              <TableCell className="text-xs text-muted-foreground py-2 max-w-[180px] truncate">
                                {w.jobLabels.join(", ")}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>
  );
}

export default function PayrollExportPage() {
  return <Layout><PayrollExportContent /></Layout>;
}
