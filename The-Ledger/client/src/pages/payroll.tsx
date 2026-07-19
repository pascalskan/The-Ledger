import { Layout } from "@/components/layout";
import { PageHeader } from "@/components/page-shell";
import { useStore } from "@/lib/mockData";
import { groupTimesheetsForPayroll } from "@/lib/profitabilityEngine";
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
import { Users, Clock, DollarSign, AlertTriangle, Activity } from "lucide-react";
import { useState } from "react";

function fmt(n: number) {
  return `£${n.toLocaleString("en-GB", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function PayrollProcessingContent() {
  const { timesheets, jobs } = useStore();
  const [period, setPeriod] = useState<"all" | "current-month" | "last-month">("all");

  // Derive period bounds for filtering
  const now = new Date();
  let periodStart: string | undefined;
  let periodEnd: string | undefined;

  if (period === "current-month") {
    periodStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    periodEnd = now.toISOString();
  } else if (period === "last-month") {
    const firstOfLast = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastOfLast = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
    periodStart = firstOfLast.toISOString();
    periodEnd = lastOfLast.toISOString();
  }

  const records = groupTimesheetsForPayroll(timesheets, periodStart, periodEnd);

  const totalHours   = records.reduce((s, r) => s + r.totalHours, 0);
  const totalCost    = records.reduce((s, r) => s + r.totalCost, 0);
  const totalRevenue = records.reduce((s, r) => s + r.totalRevenue, 0);

  const jobName = (jobId: string) =>
    jobs.find((j) => j.id === jobId)?.title ?? jobId;

  const PERIOD_OPTIONS: { value: typeof period; label: string }[] = [
    { value: "all",           label: "All approved timesheets" },
    { value: "current-month", label: "Current month" },
    { value: "last-month",    label: "Previous month" },
  ];

  return (
      <div className="space-y-6">
        {/* Header */}
        <PageHeader
          title="Payroll Staging"
          description="Approved labour hours grouped by worker. Review before payroll export."
        />

        {/* Staging disclaimer */}
        <Alert className="border-amber-200 bg-amber-50 text-amber-800">
          <AlertTriangle className="h-4 w-4 text-amber-600" />
          <AlertDescription>
            <strong>Staging only — not a payment instruction.</strong> This page aggregates
            approved timesheet records from the Review Centre. Figures reflect approved
            operational data only. Final payroll must be verified and authorised separately.
          </AlertDescription>
        </Alert>

        {/* Period selector */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-medium text-muted-foreground">Period:</span>
          {PERIOD_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setPeriod(opt.value)}
              className={[
                "px-3 py-1.5 rounded-md text-sm font-medium border transition-colors",
                period === opt.value
                  ? "bg-primary text-primary-foreground border-primary"
                  : "border-input bg-background text-foreground hover:bg-muted",
              ].join(" ")}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {/* Summary KPI strip */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          <Card>
            <CardHeader className="pb-1 pt-4 px-4">
              <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Workers
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4 flex items-center gap-2">
              <Users className="h-5 w-5 text-blue-600 flex-shrink-0" />
              <span className="text-2xl font-bold">{records.length}</span>
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
              <span className="text-2xl font-bold">{totalHours.toFixed(1)}</span>
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
              <span className="text-2xl font-bold">{fmt(totalCost)}</span>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-1 pt-4 px-4">
              <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Labour Revenue
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4 flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-emerald-600 flex-shrink-0" />
              <span className="text-2xl font-bold">{fmt(totalRevenue)}</span>
            </CardContent>
          </Card>
        </div>

        {/* Staging Table */}
        {records.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-muted-foreground border-2 border-dashed rounded-xl">
            <Activity className="h-10 w-10 mb-3 opacity-20" />
            <p className="text-sm font-medium">No approved timesheet records for this period.</p>
            <p className="text-xs mt-1 opacity-70">
              Approve worker reports in the Review Centre to populate payroll staging.
            </p>
          </div>
        ) : (
          <div className="border rounded-md">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Worker</TableHead>
                  <TableHead className="text-right">Hours</TableHead>
                  <TableHead className="text-right">Labour Cost</TableHead>
                  <TableHead className="text-right">Labour Revenue</TableHead>
                  <TableHead className="text-right">Margin</TableHead>
                  <TableHead>Jobs</TableHead>
                  <TableHead>Period</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {records.map((r) => (
                  <TableRow key={r.workerId}>
                    <TableCell className="font-medium">{r.workerName}</TableCell>
                    <TableCell className="text-right font-mono">{r.totalHours.toFixed(1)}</TableCell>
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
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {r.jobIds.map((jid) => (
                          <Badge
                            key={jid}
                            variant="outline"
                            className="text-xs font-normal max-w-[140px] truncate"
                            title={jobName(jid)}
                          >
                            {jobName(jid)}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {r.periodLabel}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className="text-xs bg-amber-50 text-amber-700 border-amber-200"
                      >
                        {r.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        {/* Timesheet detail */}
        {records.length > 0 && (
          <div className="mt-2">
            <p className="text-xs text-muted-foreground">
              {records.reduce((s, r) => s + r.timesheetIds.length, 0)} approved timesheet
              record{records.reduce((s, r) => s + r.timesheetIds.length, 0) !== 1 ? "s" : ""} included.
              All records sourced from Review Centre approval engine.
            </p>
          </div>
        )}
      </div>
  );
}

export default function PayrollStagingPage() {
  return <Layout><PayrollProcessingContent /></Layout>;
}
