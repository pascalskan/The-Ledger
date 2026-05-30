import { Layout } from "@/components/layout";
import { useStore } from "@/lib/mockData";
import {
  generatePayrollExportPeriod,
  generateCSVExport,
  EXPORT_STATUS_LABELS,
  EXPORT_STATUS_COLORS,
  EXPORT_STATUS_NEXT_LABEL,
  PERIOD_TYPE_LABELS,
  nextExportStatus,
  isValidExportTransition,
  getPeriodBounds,
} from "@/lib/payrollExportEngine";
import type { PayrollExportPeriod } from "@/lib/mockData";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Clock,
  Users,
  DollarSign,
  AlertTriangle,
  Download,
  Activity,
  ChevronRight,
  TrendingUp,
} from "lucide-react";
import { useState } from "react";

function fmt(n: number) {
  return `\u00a3${n.toLocaleString("en-GB", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export default function PayrollExportPage() {
  const { timesheets, payrollExportPeriods, addPayrollExportPeriod, updatePayrollExportPeriod } = useStore();
  const [periodType, setPeriodType] = useState<PayrollExportPeriod["periodType"]>("weekly");
  const [selectedPeriodId, setSelectedPeriodId] = useState<string | null>(null);

  // ── Period Generation ──────────────────────────────
  const handleGeneratePeriod = () => {
    const newPeriod = generatePayrollExportPeriod(timesheets, periodType, new Date());
    addPayrollExportPeriod(newPeriod);
    setSelectedPeriodId(newPeriod.id);
  };

  // ── Status Workflow ────────────────────────────────
  const handleAdvanceStatus = (period: PayrollExportPeriod) => {
    const next = nextExportStatus(period.status);
    if (!next || !isValidExportTransition(period.status, next)) return;

    const update: Partial<PayrollExportPeriod> = { status: next };
    if (next === "exported") {
      update.exportedAt = new Date().toISOString();
      update.exportedBy = "Admin CEO"; // In production: currentUser.name
    }
    updatePayrollExportPeriod(period.id, update);
  };

  // ── CSV Download ───────────────────────────────────
  const handleDownloadCSV = (period: PayrollExportPeriod) => {
    const csv = generateCSVExport(period);
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `payroll-export-${period.periodLabel.replace(/\s+/g, "-").toLowerCase()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // ── Preview Period Bounds ──────────────────────────
  const previewBounds = getPeriodBounds(periodType, new Date());

  const selectedPeriod = selectedPeriodId
    ? payrollExportPeriods.find(p => p.id === selectedPeriodId)
    : payrollExportPeriods[payrollExportPeriods.length - 1] ?? null;

  const PERIOD_OPTIONS: { value: PayrollExportPeriod["periodType"]; label: string }[] = [
    { value: "weekly",      label: "Weekly" },
    { value: "fortnightly", label: "Fortnightly" },
    { value: "monthly",     label: "Monthly" },
  ];

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Payroll Export</h2>
          <p className="text-muted-foreground mt-1">
            Generate and export payroll periods from approved labour records.
          </p>
        </div>

        {/* Disclaimer */}
        <Alert className="border-amber-200 bg-amber-50 text-amber-800">
          <AlertTriangle className="h-4 w-4 text-amber-600" />
          <AlertDescription>
            <strong>Export only — not a payment instruction.</strong> All figures derive from
            approved timesheet records in the Review Center. Verify all amounts before
            processing payroll in your accounting system.
          </AlertDescription>
        </Alert>

        {/* Period Generator */}
        <Card data-testid="payroll-export-generator">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Generate Export Period</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Period type selector */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-medium text-muted-foreground">Period type:</span>
              {PERIOD_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setPeriodType(opt.value)}
                  className={[
                    "px-3 py-1.5 rounded-md text-sm font-medium border transition-colors",
                    periodType === opt.value
                      ? "bg-primary text-primary-foreground border-primary"
                      : "border-input bg-background text-foreground hover:bg-muted",
                  ].join(" ")}
                  data-testid={`period-type-${opt.value}`}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            {/* Preview period bounds */}
            <p className="text-xs text-muted-foreground">
              This will generate: <strong>{previewBounds.label}</strong>
              {" "}({fmtDate(previewBounds.start)} – {fmtDate(previewBounds.end)})
            </p>

            <button
              onClick={handleGeneratePeriod}
              className="px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
              data-testid="btn-generate-export-period"
            >
              Generate {PERIOD_TYPE_LABELS[periodType]} Export Period
            </button>

            {timesheets.length === 0 && (
              <p className="text-xs text-amber-700">
                No approved timesheet records found. Approve worker reports in the Review Center
                to populate payroll data.
              </p>
            )}
          </CardContent>
        </Card>

        {/* Export Periods List */}
        {payrollExportPeriods.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-muted-foreground border-2 border-dashed rounded-xl">
            <Activity className="h-10 w-10 mb-3 opacity-20" />
            <p className="text-sm font-medium">No payroll export periods generated yet.</p>
            <p className="text-xs mt-1 opacity-70">
              Use the generator above to create a period from approved timesheet records.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Periods table */}
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Export Periods</h3>
            <div className="border rounded-md">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Period</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead className="text-right">Workers</TableHead>
                    <TableHead className="text-right">Hours</TableHead>
                    <TableHead className="text-right">OT Hours</TableHead>
                    <TableHead className="text-right">Labour Cost</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {[...payrollExportPeriods].reverse().map((period) => {
                    const next = nextExportStatus(period.status);
                    const isSelected = selectedPeriod?.id === period.id;
                    return (
                      <TableRow
                        key={period.id}
                        className={isSelected ? "bg-muted/40" : "cursor-pointer hover:bg-muted/20"}
                        onClick={() => setSelectedPeriodId(period.id)}
                        data-testid={`export-period-row-${period.id}`}
                      >
                        <TableCell className="font-medium">{period.periodLabel}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs">
                            {PERIOD_TYPE_LABELS[period.periodType]}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">{period.workerCount}</TableCell>
                        <TableCell className="text-right font-mono">{period.totalHours.toFixed(1)}</TableCell>
                        <TableCell className="text-right">
                          {period.totalOvertimeHours > 0 ? (
                            <span className="text-amber-600 font-semibold">{period.totalOvertimeHours.toFixed(1)}</span>
                          ) : (
                            <span className="text-muted-foreground text-xs">—</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right font-medium text-red-600">{fmt(period.totalCost)}</TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={`text-xs ${EXPORT_STATUS_COLORS[period.status]}`}
                            data-testid={`export-period-status-${period.id}`}
                          >
                            {EXPORT_STATUS_LABELS[period.status]}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                            {next && (
                              <button
                                onClick={() => handleAdvanceStatus(period)}
                                className="text-xs px-2 py-1 rounded border border-primary text-primary hover:bg-primary hover:text-primary-foreground transition-colors font-medium"
                                data-testid={`btn-advance-status-${period.id}`}
                              >
                                {EXPORT_STATUS_NEXT_LABEL[period.status]}
                              </button>
                            )}
                            <button
                              onClick={() => handleDownloadCSV(period)}
                              title="Download CSV"
                              className="p-1 rounded hover:bg-muted text-muted-foreground transition-colors"
                              data-testid={`btn-download-csv-${period.id}`}
                            >
                              <Download className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>

            {/* Selected Period Detail */}
            {selectedPeriod && (
              <div className="space-y-4" data-testid="export-period-detail">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                  Period Detail — {selectedPeriod.periodLabel}
                </h3>

                {/* KPI strip */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <Card>
                    <CardHeader className="pb-1 pt-4 px-4">
                      <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Workers</CardTitle>
                    </CardHeader>
                    <CardContent className="px-4 pb-4 flex items-center gap-2">
                      <Users className="h-5 w-5 text-blue-600 flex-shrink-0" />
                      <span className="text-2xl font-bold" data-testid="fe-payroll-worker-count">{selectedPeriod.workerCount}</span>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-1 pt-4 px-4">
                      <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Total Hours</CardTitle>
                    </CardHeader>
                    <CardContent className="px-4 pb-4 flex items-center gap-2">
                      <Clock className="h-5 w-5 text-violet-600 flex-shrink-0" />
                      <span className="text-2xl font-bold">{selectedPeriod.totalHours.toFixed(1)}</span>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-1 pt-4 px-4">
                      <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Labour Cost</CardTitle>
                    </CardHeader>
                    <CardContent className="px-4 pb-4 flex items-center gap-2">
                      <DollarSign className="h-5 w-5 text-red-500 flex-shrink-0" />
                      <span className="text-xl font-bold" data-testid="fe-payroll-total-cost">{fmt(selectedPeriod.totalCost)}</span>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-1 pt-4 px-4">
                      <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide">OT Hours</CardTitle>
                    </CardHeader>
                    <CardContent className="px-4 pb-4 flex items-center gap-2">
                      <TrendingUp className="h-5 w-5 text-amber-500 flex-shrink-0" />
                      <span className={`text-2xl font-bold ${selectedPeriod.totalOvertimeHours > 0 ? "text-amber-600" : "text-muted-foreground"}`}>
                        {selectedPeriod.totalOvertimeHours.toFixed(1)}
                      </span>
                    </CardContent>
                  </Card>
                </div>

                {/* Worker breakdown table */}
                {selectedPeriod.workerLines.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    No approved labour records in this period.
                  </p>
                ) : (
                  <div className="border rounded-md">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Worker</TableHead>
                          <TableHead className="text-right">Regular Hrs</TableHead>
                          <TableHead className="text-right">OT Hrs</TableHead>
                          <TableHead className="text-right">Total Hrs</TableHead>
                          <TableHead className="text-right">Labour Cost</TableHead>
                          <TableHead className="text-right">Labour Revenue</TableHead>
                          <TableHead className="text-right">Margin</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {selectedPeriod.workerLines.map((line) => (
                          <TableRow key={line.workerId} data-testid={`worker-line-${line.workerId}`}>
                            <TableCell className="font-medium">{line.workerName}</TableCell>
                            <TableCell className="text-right font-mono">{line.regularHours.toFixed(1)}</TableCell>
                            <TableCell className="text-right">
                              {line.overtimeHours > 0 ? (
                                <span className="text-amber-600 font-semibold">{line.overtimeHours.toFixed(1)}</span>
                              ) : (
                                <span className="text-muted-foreground text-xs">—</span>
                              )}
                            </TableCell>
                            <TableCell className="text-right font-mono">{line.totalHours.toFixed(1)}</TableCell>
                            <TableCell className="text-right font-medium text-red-600">{fmt(line.totalCost)}</TableCell>
                            <TableCell className="text-right font-medium text-emerald-600">{fmt(line.totalRevenue)}</TableCell>
                            <TableCell className="text-right">
                              <span className={[
                                "font-semibold text-sm",
                                line.margin >= 20 ? "text-green-600" : line.margin > 0 ? "text-amber-600" : "text-red-600",
                              ].join(" ")}>
                                {line.margin.toFixed(1)}%
                              </span>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}

                {/* Period actions */}
                {selectedPeriod.status !== "exported" && (
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => handleAdvanceStatus(selectedPeriod)}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
                      data-testid="btn-advance-selected-period"
                    >
                      {EXPORT_STATUS_NEXT_LABEL[selectedPeriod.status]}
                      <ChevronRight className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDownloadCSV(selectedPeriod)}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-md border border-input bg-background text-sm font-medium hover:bg-muted transition-colors"
                      data-testid="btn-download-selected-csv"
                    >
                      <Download className="h-4 w-4" />
                      Download CSV
                    </button>
                  </div>
                )}

                {selectedPeriod.status === "exported" && (
                  <div className="flex items-center gap-2 text-emerald-700">
                    <Badge variant="outline" className="text-xs bg-emerald-50 border-emerald-200 text-emerald-700">
                      Exported
                    </Badge>
                    {selectedPeriod.exportedAt && (
                      <span className="text-xs text-muted-foreground">
                        {fmtDate(selectedPeriod.exportedAt)}
                        {selectedPeriod.exportedBy ? ` by ${selectedPeriod.exportedBy}` : ""}
                      </span>
                    )}
                    <button
                      onClick={() => handleDownloadCSV(selectedPeriod)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-input bg-background text-xs font-medium hover:bg-muted transition-colors ml-2"
                    >
                      <Download className="h-3.5 w-3.5" />
                      Re-download CSV
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </Layout>
  );
}
