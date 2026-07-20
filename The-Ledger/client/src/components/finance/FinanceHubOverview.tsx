/**
 * FinanceHubOverview — Finance Hub Overview tab
 *
 * Data sources (all read-only, no mutations):
 *   Revenue / Costs / Margin  : getAllJobMargins()         → profitabilityEngine
 *   Exposure                  : getPendingExposure()       → profitabilityEngine
 *   Job Profitability (top 4) : getAllJobMargins().slice(0,4)
 *   Invoice Status            : useStore().invoices        → grouped by status
 *   Payroll                   : groupTimesheetsForPayroll() + reviewItems pending
 *   Accounting provider       : getDefaultProvider()       → accountingSettingsEngine
 *   Sync failures             : computeSyncKPIs(SEED_SYNC_RECORDS).failed
 *   Open exceptions           : computeExceptionSummary(SEED_EXCEPTIONS).open
 */

import { useRef, useState } from "react";
import { useLocation } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  TrendingUp,
  TrendingDown,
  Receipt,
  Percent,
  AlertTriangle,
  ArrowUp,
  Minus,
  CheckCircle2,
} from "lucide-react";
import { useStore, useAuth } from "@/lib/mockData";
import {
  getAllJobMargins,
  getPendingExposure,
  groupTimesheetsForPayroll,
} from "@/lib/profitabilityEngine";
import { getDefaultProvider, DEFAULT_ACCOUNTING_SETTINGS } from "@/lib/accountingSettingsEngine";
import {
  computeSyncKPIs,
  SEED_SYNC_RECORDS,
} from "@/lib/accountingSyncEngine";
import {
  computeExceptionSummary,
  SEED_EXCEPTIONS,
} from "@/lib/exceptionResolutionEngine";
import { recordFinanceHubDeepLinkOpened } from "@/lib/analyticsEngine";

function fmt(n: number) {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(n);
}

function fmtTime(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  const today = new Date();
  if (d.toDateString() === today.toDateString()) return `Today ${fmtTime(iso)}`;
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

export function FinanceHubOverview() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const jobProfRef = useRef<HTMLDivElement>(null);

  // Capture mount time for Exposure "As of" timestamp (G-012)
  const [mountTime] = useState(() =>
    new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })
  );

  const store = useStore();
  const { jobs, invoices, timesheets, reviewItems } = store;

  // ── KPI: Revenue / Costs / Margin ─────────────────────────────────────────
  // G-005: Gross Margin derived from getAllJobMargins() engine output — not recomputed inline.
  // Portfolio margin = weighted average of engine-derived summary.marginPercent across active jobs.
  const marginRecords = getAllJobMargins(jobs);
  const totalRevenue = marginRecords.reduce((s, r) => s + r.summary.totalRevenue, 0);
  const totalCost = marginRecords.reduce((s, r) => s + r.summary.totalCost, 0);
  // Derive portfolio gross margin from engine-sourced totalRevenue/totalCost.
  // This is consistent with getAllJobMargins() → getJobFinancialSummary() → totalRevenue/totalCost.
  const grossMarginPct =
    totalRevenue > 0
      ? marginRecords.reduce((s, r) => s + r.summary.totalRevenue * r.summary.marginPercent, 0) / totalRevenue
      : 0;
  const activeJobCount = marginRecords.filter((r) => r.hasActivity).length;

  // ── KPI: Exposure (pending approval) ──────────────────────────────────────
  const exposure = getPendingExposure(reviewItems);

  // ── Job Profitability: top 4 ───────────────────────────────────────────────
  const topJobs = marginRecords.filter((r) => r.hasActivity).slice(0, 4);

  // ── Invoice Status Summary ─────────────────────────────────────────────────
  type InvGroup = { count: number; total: number };
  const invGroups: Record<string, InvGroup> = {
    Draft: { count: 0, total: 0 },
    Sent: { count: 0, total: 0 },
    Overdue: { count: 0, total: 0 },
    Paid: { count: 0, total: 0 },
  };
  for (const inv of invoices) {
    const status = inv.status as string;
    const total = (inv.lineItems ?? []).reduce(
      (s: number, li: any) => s + li.qty * li.unitPrice,
      0
    );
    if (status in invGroups) {
      invGroups[status].count++;
      invGroups[status].total += total;
    }
  }

  // ── Payroll ────────────────────────────────────────────────────────────────
  const approvedTimesheets = groupTimesheetsForPayroll(timesheets);
  const approvedCount = approvedTimesheets.length;
  const pendingTimesheetCount = reviewItems.filter(
    (r) => r.type === "timesheet" && r.status === "pending"
  ).length;
  const MOCK_NEXT_RUN = "20 Jun 2026";

  // ── Accounting ─────────────────────────────────────────────────────────────
  // Was getDefaultProvider(companySettings) — company settings is the legal
  // entity/bank record and has no `providers` array, so `settings.providers.find`
  // threw and the Finance Hub white-screened before rendering. The accounting
  // provider lives in accountingSettingsEngine, as this file's own header states.
  const provider = getDefaultProvider(DEFAULT_ACCOUNTING_SETTINGS);
  const syncKPIs = computeSyncKPIs(SEED_SYNC_RECORDS);
  const failedCount = syncKPIs.failed;
  const exceptionSummary = computeExceptionSummary(SEED_EXCEPTIONS);
  const openExceptions = exceptionSummary.open;

  // Colour helpers (G-013, spec §6.5)
  const failedClass =
    failedCount === 0
      ? "text-emerald-600"
      : failedCount <= 2
      ? "text-amber-600"
      : "text-red-600 font-semibold";

  const exceptionsClass =
    openExceptions === 0
      ? "text-emerald-600"
      : openExceptions <= 4
      ? "text-amber-600"
      : "text-red-600";

  const pendingTsClass =
    pendingTimesheetCount === 0
      ? "text-emerald-600 font-medium"
      : pendingTimesheetCount <= 5
      ? "text-amber-600 font-medium"
      : "text-red-600 font-medium";

  // ── CTA navigation (§2.9) — each CTA emits finance_hub_deep_link_opened (§3.5) ──
  function handleViewRecords() {
    const dest = "/finance?tab=records";
    if (user?.name) recordFinanceHubDeepLinkOpened(dest, user.name);
    setLocation(dest);
  }
  function handleOpenInvoicing() {
    const hasOverdue = invGroups.Overdue.count > 0;
    const dest = hasOverdue
      ? "/finance?tab=invoicing&filter=overdue"
      : "/finance?tab=invoicing";
    if (user?.name) recordFinanceHubDeepLinkOpened(dest, user.name);
    setLocation(dest);
  }
  function handleOpenPayroll() {
    const dest = "/finance?tab=payroll";
    if (user?.name) recordFinanceHubDeepLinkOpened(dest, user.name);
    setLocation(dest);
  }
  function handleOpenAccounting() {
    const dest =
      openExceptions > 0
        ? "/finance?tab=accounting&sub=exceptions"
        : "/finance?tab=accounting";
    if (user?.name) recordFinanceHubDeepLinkOpened(dest, user.name);
    setLocation(dest);
  }

  function scrollToJobProf() {
    jobProfRef.current?.scrollIntoView({ behavior: "smooth" });
  }

  return (
    <div className="space-y-6" data-testid="finance-overview-panel">
      {/* ── KPI Strip ──────────────────────────────────────────────────────── */}

      {/* Approved group */}
      <div>
        <p className="text-xs text-muted-foreground uppercase tracking-wide mb-2">
          Approved — Current Month
        </p>
        <div
          className="grid grid-cols-1 sm:grid-cols-3 gap-4"
          data-testid="finance-kpi-strip-approved"
        >
          {/* Revenue */}
          <Card data-testid="kpi-card-revenue">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm text-muted-foreground">Revenue Recognised</p>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </div>
              <p className="text-2xl font-bold" data-testid="kpi-value-revenue">
                {fmt(totalRevenue)}
              </p>
              <p className="text-xs text-emerald-600 flex items-center gap-1 mt-1">
                <ArrowUp className="h-3 w-3" /> vs last period
              </p>
              {/* G-003: job attribution reference */}
              <button
                className="text-xs text-muted-foreground hover:text-foreground mt-1 underline-offset-2 hover:underline"
                onClick={scrollToJobProf}
                aria-label={`View job profitability breakdown across ${activeJobCount} active job${activeJobCount !== 1 ? "s" : ""}`}
              >
                Across {activeJobCount} active job{activeJobCount !== 1 ? "s" : ""} ↗
              </button>
            </CardContent>
          </Card>

          {/* Costs */}
          <Card data-testid="kpi-card-costs">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm text-muted-foreground">Costs Approved</p>
                <Receipt className="h-4 w-4 text-muted-foreground" />
              </div>
              <p className="text-2xl font-bold" data-testid="kpi-value-costs">
                {fmt(totalCost)}
              </p>
              <p className="text-xs text-muted-foreground mt-1">Current month</p>
            </CardContent>
          </Card>

          {/* Gross Margin */}
          <Card data-testid="kpi-card-margin">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm text-muted-foreground">Gross Margin</p>
                <Percent className="h-4 w-4 text-muted-foreground" />
              </div>
              <p className="text-2xl font-bold" data-testid="kpi-value-margin">
                {grossMarginPct.toFixed(1)}%
              </p>
              <p className="text-xs text-muted-foreground mt-1">Current month</p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Pending Approval group — structural separator per G-014 */}
      <div data-testid="finance-kpi-strip-pending">
        <p className="text-xs text-muted-foreground uppercase tracking-wide mb-2">
          Pending Approval
        </p>
        <Card
          data-testid="kpi-card-exposure"
          className="border-amber-200 bg-amber-50/30"
        >
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-amber-700">Exposure</p>
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-500" />
                <p className="text-xs text-amber-600">Pending Approval</p>
              </div>
            </div>
            <p className="text-2xl font-bold" data-testid="kpi-value-exposure">
              {fmt(exposure.totalPendingCost)}
            </p>
            <p className="text-xs text-amber-600 mt-1">
              {exposure.pendingItemCount} unapproved item
              {exposure.pendingItemCount !== 1 ? "s" : ""}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              As of {mountTime}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* ── Lower panels ──────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Job Profitability */}
        <Card data-testid="finance-job-profitability-panel" ref={jobProfRef}>
          <CardContent className="p-6">
            <p className="text-sm font-semibold mb-3">Job Profitability</p>
            {topJobs.length === 0 ? (
              <p className="text-sm text-muted-foreground">No active jobs with data.</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs text-muted-foreground border-b">
                    <th className="text-left pb-2 font-normal">Job</th>
                    <th className="text-right pb-2 font-normal">Revenue</th>
                    <th className="text-right pb-2 font-normal">Margin</th>
                    <th className="text-right pb-2 font-normal">Trend</th>
                  </tr>
                </thead>
                <tbody>
                  {topJobs.map((r) => {
                    const margin = r.summary.marginPercent;
                    // Simple trend heuristic: above 25% improving, below 15% declining
                    const TrendIcon =
                      margin >= 25
                        ? TrendingUp
                        : margin < 15
                        ? TrendingDown
                        : Minus;
                    const trendClass =
                      margin >= 25
                        ? "text-emerald-600"
                        : margin < 15
                        ? "text-red-600"
                        : "text-slate-500";
                    return (
                      <tr key={r.job.id} className="border-b last:border-0">
                        <td className="py-2 font-medium truncate max-w-[140px]">
                          {r.job.title}
                        </td>
                        <td className="py-2 text-right">
                          {fmt(r.summary.totalRevenue)}
                        </td>
                        <td className="py-2 text-right">
                          {margin.toFixed(1)}%
                        </td>
                        <td className="py-2 text-right">
                          <TrendIcon className={`h-4 w-4 inline ${trendClass}`} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
            <div className="mt-4 pt-3 border-t">
              <Button
                variant="ghost"
                size="sm"
                data-testid="btn-view-all-records"
                onClick={handleViewRecords}
                className="text-xs h-7 px-2"
                aria-label="View all financial records"
              >
                View All Records →
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Invoice Status Summary */}
        <Card data-testid="finance-invoice-status-summary">
          <CardContent className="p-6">
            <p className="text-sm font-semibold mb-3">Invoice Status</p>
            <div className="space-y-2">
              {(
                [
                  { key: "Draft", testId: "invoice-status-row-draft", cls: "text-slate-600" },
                  { key: "Sent", testId: "invoice-status-row-sent", cls: "text-blue-600" },
                  { key: "Overdue", testId: "invoice-status-row-overdue", cls: "text-red-600 font-medium" },
                  { key: "Paid", testId: "invoice-status-row-paid", cls: "text-emerald-600" },
                ] as const
              ).map(({ key, testId, cls }) => {
                const g = invGroups[key];
                return (
                  <div
                    key={key}
                    className="flex items-center justify-between text-sm"
                    data-testid={testId}
                  >
                    <span className={cls}>{key}</span>
                    <span className="text-muted-foreground">
                      {g.count} · {fmt(g.total)}
                    </span>
                  </div>
                );
              })}
            </div>
            <div className="mt-4 pt-3 border-t">
              <Button
                variant="ghost"
                size="sm"
                data-testid="btn-open-invoicing"
                onClick={handleOpenInvoicing}
                className="text-xs h-7 px-2"
                aria-label="Open invoicing"
              >
                Open Invoicing →
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Payroll Status */}
        <Card data-testid="finance-payroll-status-block">
          <CardContent className="p-6">
            <p className="text-sm font-semibold mb-3">Payroll Status</p>
            <div className="space-y-1.5 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Next run</span>
                <span className="font-medium">{MOCK_NEXT_RUN}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Workers in scope</span>
                <span>{approvedCount}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Ready</span>
                <span className="text-emerald-600 font-medium">{approvedCount} approved</span>
              </div>
              {pendingTimesheetCount > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Pending timesheets</span>
                  <span className={pendingTsClass}>{pendingTimesheetCount} pending</span>
                </div>
              )}
            </div>
            <div className="mt-4 pt-3 border-t">
              <Button
                variant="ghost"
                size="sm"
                data-testid="btn-open-payroll"
                onClick={handleOpenPayroll}
                className="text-xs h-7 px-2"
                aria-label="Open payroll"
              >
                Open Payroll →
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Accounting Status */}
        <Card data-testid="finance-accounting-status-block">
          <CardContent className="p-6">
            <p className="text-sm font-semibold mb-3">Accounting Status</p>
            <div className="space-y-1.5 text-sm">
              {provider ? (
                <>
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                    <span className="font-medium capitalize">{provider.id}</span>
                    <span className="text-muted-foreground">— Connected</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Last sync</span>
                    <span>{fmtDate(provider.lastSync)}</span>
                  </div>
                </>
              ) : (
                <p className="text-muted-foreground">No accounting provider connected.</p>
              )}
              <div className="flex justify-between">
                <span className="text-muted-foreground">Sync failures</span>
                <span className={failedClass}>{failedCount} failure{failedCount !== 1 ? "s" : ""}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Open exceptions</span>
                <span className={exceptionsClass}>{openExceptions} open</span>
              </div>
            </div>
            <div className="mt-4 pt-3 border-t">
              <Button
                variant="ghost"
                size="sm"
                data-testid="btn-open-accounting"
                onClick={handleOpenAccounting}
                className="text-xs h-7 px-2"
                aria-label="Open accounting"
              >
                Open Accounting →
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
