import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  TrendingUp,
  TrendingDown,
  Minus,
  AlertTriangle,
  Search,
  ArrowUpDown,
  ShieldAlert,
  Activity,
} from "lucide-react";
import { useStore } from "@/lib/mockData";
import { useLocation } from "wouter";
import { buildPortfolioForecast } from "@/lib/marginIntelligence";
import type { JobForecast } from "@/lib/forecastEngine";
import type { RiskAlert } from "@/lib/marginIntelligence";
import { cn } from "@/lib/utils";

// ──────────────────────────────────────────────────────
// Formatting helpers
// ──────────────────────────────────────────────────────
function fmt(n: number) {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
    maximumFractionDigits: 0,
  }).format(n);
}

function fmtPct(n: number) {
  return `${n.toFixed(1)}%`;
}

// ──────────────────────────────────────────────────────
// Risk badge
// ──────────────────────────────────────────────────────
function RiskBadge({ status }: { status: JobForecast["riskStatus"] }) {
  const map: Record<string, string> = {
    healthy: "bg-emerald-50 text-emerald-700 border-emerald-200",
    warning: "bg-amber-50 text-amber-700 border-amber-200",
    critical: "bg-rose-50 text-rose-700 border-rose-200",
    "no-data": "bg-muted text-muted-foreground border-border",
  };
  const labels: Record<string, string> = {
    healthy: "Healthy",
    warning: "Warning",
    critical: "Critical",
    "no-data": "No Data",
  };
  return (
    <Badge
      variant="outline"
      className={cn("text-xs font-normal", map[status] ?? "")}
      data-testid={`risk-badge-${status}`}
    >
      {labels[status] ?? status}
    </Badge>
  );
}

// ──────────────────────────────────────────────────────
// Variance cell
// ──────────────────────────────────────────────────────
function VarianceCell({ value }: { value: number }) {
  if (value > 0.05) {
    return (
      <span className="flex items-center gap-1 text-emerald-600 font-medium justify-end">
        <TrendingUp className="h-3 w-3" />+{fmtPct(value)}
      </span>
    );
  }
  if (value < -0.05) {
    return (
      <span className="flex items-center gap-1 text-rose-600 font-medium justify-end">
        <TrendingDown className="h-3 w-3" />
        {fmtPct(value)}
      </span>
    );
  }
  return (
    <span className="flex items-center gap-1 text-muted-foreground justify-end">
      <Minus className="h-3 w-3" />
      {fmtPct(value)}
    </span>
  );
}

// ──────────────────────────────────────────────────────
// Alert row
// ──────────────────────────────────────────────────────
function AlertRow({ alert }: { alert: RiskAlert }) {
  const severityClass: Record<string, string> = {
    critical: "border-rose-200 bg-rose-50/60 text-rose-800",
    warning: "border-amber-200 bg-amber-50/60 text-amber-800",
    info: "border-blue-200 bg-blue-50/60 text-blue-800",
  };
  return (
    <div
      className={cn(
        "flex items-start gap-2 rounded-md border px-3 py-2 text-sm",
        severityClass[alert.severity] ?? ""
      )}
      data-testid={`risk-alert-${alert.type}`}
    >
      <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
      <span>{alert.message}</span>
    </div>
  );
}

// ──────────────────────────────────────────────────────
// Sort state
// ──────────────────────────────────────────────────────
type SortKey =
  | "jobTitle"
  | "currentMargin"
  | "forecastMargin"
  | "marginVariance"
  | "exposure"
  | "riskStatus";

function sortForecasts(
  forecasts: JobForecast[],
  key: SortKey,
  asc: boolean
): JobForecast[] {
  return [...forecasts].sort((a, b) => {
    let av: number | string = 0;
    let bv: number | string = 0;
    switch (key) {
      case "jobTitle":
        av = a.jobTitle;
        bv = b.jobTitle;
        break;
      case "currentMargin":
        av = a.currentMargin;
        bv = b.currentMargin;
        break;
      case "forecastMargin":
        av = a.forecastMargin;
        bv = b.forecastMargin;
        break;
      case "marginVariance":
        av = a.marginVariance;
        bv = b.marginVariance;
        break;
      case "exposure":
        av = a.pendingCostExposure;
        bv = b.pendingCostExposure;
        break;
      case "riskStatus": {
        const ord: Record<string, number> = {
          critical: 0,
          warning: 1,
          healthy: 2,
          "no-data": 3,
        };
        av = ord[a.riskStatus] ?? 99;
        bv = ord[b.riskStatus] ?? 99;
        break;
      }
    }
    if (typeof av === "string" && typeof bv === "string") {
      return asc ? av.localeCompare(bv) : bv.localeCompare(av);
    }
    return asc
      ? (av as number) - (bv as number)
      : (bv as number) - (av as number);
  });
}

// ──────────────────────────────────────────────────────
// ForecastTab
// ──────────────────────────────────────────────────────

/**
 * ForecastTab — Phase 5.5
 *
 * Displays portfolio-level forecast KPIs, job-level forecast
 * table (sortable + filterable), and risk alerts.
 *
 * All data derived from approved financial records via
 * buildPortfolioForecast() → forecastEngine.ts
 *
 * Exposure shown separately; never treated as approved revenue/cost.
 */
export function ForecastTab() {
  const { jobs, reviewItems } = useStore();
  const [, setLocation] = useLocation();
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("riskStatus");
  const [sortAsc, setSortAsc] = useState(true);

  const { forecasts, portfolio, alerts } = useMemo(
    () => buildPortfolioForecast(jobs, reviewItems as any),
    [jobs, reviewItems]
  );

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    const base = q
      ? forecasts.filter(
          (f) =>
            f.jobTitle.toLowerCase().includes(q) ||
            f.riskStatus.includes(q)
        )
      : forecasts;
    return sortForecasts(base, sortKey, sortAsc);
  }, [forecasts, search, sortKey, sortAsc]);

  function toggleSort(key: SortKey) {
    if (key === sortKey) {
      setSortAsc((v) => !v);
    } else {
      setSortKey(key);
      setSortAsc(true);
    }
  }

  function SortTh({
    label,
    col,
    className,
  }: {
    label: string;
    col: SortKey;
    className?: string;
  }) {
    return (
      <TableHead
        className={cn("cursor-pointer select-none", className)}
        onClick={() => toggleSort(col)}
      >
        <span className="flex items-center gap-1">
          {label}
          <ArrowUpDown className="h-3 w-3 opacity-50" />
        </span>
      </TableHead>
    );
  }

  const kpis = [
    {
      label: "Forecast Revenue",
      value: fmt(portfolio.totalForecastRevenue),
      sub: `Current: ${fmt(portfolio.totalCurrentRevenue)}`,
      color: "text-foreground",
      testId: "kpi-forecast-revenue",
    },
    {
      label: "Forecast Cost",
      value: fmt(portfolio.totalForecastCost),
      sub: `Current: ${fmt(portfolio.totalCurrentCost)}`,
      color: "text-foreground",
      testId: "kpi-forecast-cost",
    },
    {
      label: "Forecast Profit",
      value: fmt(portfolio.totalForecastProfit),
      sub: `Current: ${fmt(portfolio.totalCurrentProfit)}`,
      color:
        portfolio.totalForecastProfit >= 0
          ? "text-emerald-700"
          : "text-rose-700",
      testId: "kpi-forecast-profit",
    },
    {
      label: "Forecast Margin",
      value: fmtPct(portfolio.forecastPortfolioMargin),
      sub: `Current: ${fmtPct(portfolio.currentPortfolioMargin)}`,
      color:
        portfolio.forecastPortfolioMargin >= 20
          ? "text-emerald-700"
          : portfolio.forecastPortfolioMargin >= 10
          ? "text-amber-700"
          : "text-rose-700",
      testId: "kpi-forecast-margin",
    },
    {
      label: "Total Exposure",
      value: fmt(portfolio.totalExposure),
      sub: `${portfolio.jobsWithExposure} job${portfolio.jobsWithExposure !== 1 ? "s" : ""} with pending items`,
      color: portfolio.totalExposure > 0 ? "text-amber-700" : "text-muted-foreground",
      testId: "kpi-total-exposure",
    },
    {
      label: "At Risk",
      value: `${portfolio.criticalCount + portfolio.warningCount}`,
      sub: `${portfolio.criticalCount} critical · ${portfolio.warningCount} warning`,
      color:
        portfolio.criticalCount > 0
          ? "text-rose-700"
          : portfolio.warningCount > 0
          ? "text-amber-700"
          : "text-emerald-700",
      testId: "kpi-at-risk",
    },
  ];

  return (
    <div className="space-y-6 mt-4" data-testid="forecast-tab-panel">
      {/* ── Portfolio KPIs ─────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {kpis.map(({ label, value, sub, color, testId }) => (
          <Card key={label} className="shadow-none border-border">
            <CardHeader className="pb-1 pt-4 px-4">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                {label}
              </p>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <p
                className={cn("text-xl font-bold leading-tight", color)}
                data-testid={testId}
              >
                {value}
              </p>
              {sub && (
                <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* ── Risk Alerts ────────────────────────────── */}
      {alerts.length > 0 && (
        <div className="space-y-2" data-testid="risk-alerts-panel">
          <p className="text-sm font-semibold flex items-center gap-2 text-foreground">
            <ShieldAlert className="h-4 w-4" /> Risk Alerts ({alerts.length})
          </p>
          {alerts.map((alert, i) => (
            <AlertRow key={i} alert={alert} />
          ))}
        </div>
      )}

      {/* ── Job Forecast Table ─────────────────────── */}
      <Card className="shadow-sm border-border">
        <CardHeader className="border-b border-border bg-muted/50 flex flex-row items-center justify-between gap-4">
          <CardTitle className="text-base text-foreground">
            Job Forecast Table
            <span className="text-xs font-normal text-muted-foreground ml-2">
              — derived from approved records · exposure shown separately
            </span>
          </CardTitle>
          <div className="relative w-56 flex-shrink-0">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search jobs…"
              className="pl-8 h-8 text-sm"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              data-testid="forecast-table-search"
            />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <Activity className="h-10 w-10 mb-3 opacity-20" />
              <p className="text-sm">No jobs found.</p>
            </div>
          ) : (
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <SortTh label="Job" col="jobTitle" />
                  <SortTh
                    label="Current Margin"
                    col="currentMargin"
                    className="text-right"
                  />
                  <SortTh
                    label="Forecast Margin"
                    col="forecastMargin"
                    className="text-right"
                  />
                  <SortTh
                    label="Variance"
                    col="marginVariance"
                    className="text-right"
                  />
                  <SortTh
                    label="Exposure"
                    col="exposure"
                    className="text-right"
                  />
                  <SortTh
                    label="Risk"
                    col="riskStatus"
                    className="text-center"
                  />
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((f) => (
                  <TableRow
                    key={f.jobId}
                    className="hover:bg-muted cursor-pointer"
                    onClick={() => setLocation(`/jobs/${f.jobId}`)}
                    data-testid={`forecast-row-${f.jobId}`}
                  >
                    <TableCell>
                      <div className="font-medium text-foreground max-w-[220px] truncate">
                        {f.jobTitle}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {f.jobStatus}
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-medium text-foreground">
                      {f.hasApprovedActivity ? (
                        fmtPct(f.currentMargin)
                      ) : (
                        <span className="text-muted-foreground text-xs">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {f.hasApprovedActivity ? (
                        <span
                          className={
                            f.forecastMargin >= 20
                              ? "text-emerald-700"
                              : f.forecastMargin >= 10
                              ? "text-amber-700"
                              : "text-rose-700"
                          }
                        >
                          {fmtPct(f.forecastMargin)}
                        </span>
                      ) : (
                        <span className="text-muted-foreground text-xs">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {f.hasApprovedActivity ? (
                        <VarianceCell value={f.marginVariance} />
                      ) : (
                        <span className="text-muted-foreground text-xs">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right text-amber-700 font-medium">
                      {f.hasPendingExposure ? (
                        fmt(f.pendingCostExposure)
                      ) : (
                        <span className="text-muted-foreground text-xs">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      <RiskBadge status={f.riskStatus} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Doctrine note */}
      <p className="text-xs text-muted-foreground">
        Forecast values incorporate pending exposure weighted by an 85%
        realisation factor. Exposure is informational only — it does not
        represent approved revenue or cost.
      </p>
    </div>
  );
}
