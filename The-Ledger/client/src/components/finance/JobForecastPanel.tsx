import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, Minus, BarChart3 } from "lucide-react";
import { useStore, getJobFinancialSummary } from "@/lib/mockData";
import { getPendingExposure } from "@/lib/profitabilityEngine";
import { computeJobForecastWithMeta } from "@/lib/forecastEngine";
import { classifyJobRisk } from "@/lib/marginIntelligence";
import { cn } from "@/lib/utils";

function fmt(n: number) {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);
}

function fmtPct(n: number) {
  return `${n.toFixed(1)}%`;
}

function Row({
  label,
  current,
  forecast,
  isCurrency = true,
  boldForecast = false,
}: {
  label: string;
  current: number;
  forecast: number;
  isCurrency?: boolean;
  boldForecast?: boolean;
}) {
  const variance = forecast - current;
  const fmtVal = isCurrency ? fmt : fmtPct;
  const improving = variance > (isCurrency ? 0.5 : 0.05);
  const deteriorating = variance < (isCurrency ? -0.5 : -0.05);

  return (
    <div className="grid grid-cols-3 items-center py-1.5 text-sm">
      <span className="text-muted-foreground col-span-1">{label}</span>
      <span className="text-right font-medium text-slate-700">
        {fmtVal(current)}
      </span>
      <span
        className={cn(
          "text-right",
          boldForecast && "font-semibold",
          improving
            ? "text-emerald-600"
            : deteriorating
            ? "text-rose-600"
            : "text-slate-700"
        )}
      >
        {fmtVal(forecast)}
      </span>
    </div>
  );
}

/**
 * JobForecastPanel — Phase 5.5
 *
 * Renders the Financial Forecast section on the Job Detail page.
 * Shows current actuals vs forecast side-by-side, plus exposure
 * impact and risk classification.
 *
 * Exposure is clearly labelled as an estimate, never as approved data.
 */
export function JobForecastPanel({ jobId }: { jobId: string }) {
  const { jobs, reviewItems } = useStore();

  const job = jobs.find((j) => j.id === jobId);
  if (!job) return null;

  const summary = getJobFinancialSummary(jobId);
  const exposure = getPendingExposure(reviewItems as any, jobId);
  const forecast = computeJobForecastWithMeta(job, summary, exposure);
  const classification = classifyJobRisk(forecast);

  const riskStyles: Record<string, string> = {
    healthy: "bg-emerald-50 text-emerald-700 border-emerald-200",
    warning: "bg-amber-50 text-amber-700 border-amber-200",
    critical: "bg-rose-50 text-rose-700 border-rose-200",
    "no-data": "bg-slate-50 text-slate-500 border-slate-200",
  };
  const riskLabels: Record<string, string> = {
    healthy: "Healthy",
    warning: "Warning",
    critical: "Critical",
    "no-data": "No Data",
  };

  const marginVariance = forecast.marginVariance;
  const VarianceIcon =
    marginVariance > 0.05
      ? TrendingUp
      : marginVariance < -0.05
      ? TrendingDown
      : Minus;
  const varianceColor =
    marginVariance > 0.05
      ? "text-emerald-600"
      : marginVariance < -0.05
      ? "text-rose-600"
      : "text-muted-foreground";

  if (!summary.hasActivity) {
    return (
      <Card className="border-slate-200" data-testid={`job-forecast-panel-${jobId}`}>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm text-muted-foreground">
            <BarChart3 className="h-4 w-4" /> Financial Forecast
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground italic">
            No approved financial activity. Forecast will appear once the first
            review item is approved.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card
      className="border-slate-200"
      data-testid={`job-forecast-panel-${jobId}`}
    >
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-sm">
            <BarChart3 className="h-4 w-4" /> Financial Forecast
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge
              variant="outline"
              className={cn(
                "text-xs font-normal",
                riskStyles[forecast.riskStatus] ?? ""
              )}
              data-testid={`job-forecast-risk-badge-${jobId}`}
            >
              {riskLabels[forecast.riskStatus] ?? forecast.riskStatus}
            </Badge>
          </div>
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          {classification.explanation}
        </p>
      </CardHeader>

      <CardContent className="pt-0 space-y-3">
        {/* Column headers */}
        <div className="grid grid-cols-3 text-xs font-medium uppercase tracking-wide text-muted-foreground border-b pb-1">
          <span>Metric</span>
          <span className="text-right">Current</span>
          <span className="text-right">Forecast</span>
        </div>

        <Row
          label="Revenue"
          current={forecast.currentRevenue}
          forecast={forecast.forecastRevenue}
        />
        <Row
          label="Cost"
          current={forecast.currentCost}
          forecast={forecast.forecastCost}
        />
        <Row
          label="Profit"
          current={forecast.currentProfit}
          forecast={forecast.forecastProfit}
          boldForecast
        />
        <Row
          label="Margin"
          current={forecast.currentMargin}
          forecast={forecast.forecastMargin}
          isCurrency={false}
          boldForecast
        />

        {/* Exposure impact + variance */}
        <div className="border-t pt-3 space-y-2 text-sm">
          {forecast.hasPendingExposure && (
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">
                Exposure Impact (estimate)
              </span>
              <span className="text-amber-700 font-medium">
                {fmt(forecast.pendingCostExposure)}
                <span className="text-xs text-muted-foreground ml-1">
                  ({forecast.exposureItemCount} item
                  {forecast.exposureItemCount !== 1 ? "s" : ""})
                </span>
              </span>
            </div>
          )}

          <div className="flex justify-between items-center">
            <span className="text-muted-foreground">Margin Variance</span>
            <span
              className={cn(
                "flex items-center gap-1 font-medium",
                varianceColor
              )}
              data-testid={`job-forecast-variance-${jobId}`}
            >
              <VarianceIcon className="h-3.5 w-3.5" />
              {marginVariance >= 0 ? "+" : ""}
              {fmtPct(marginVariance)}
            </span>
          </div>
        </div>

        {forecast.hasPendingExposure && (
          <p className="text-xs text-muted-foreground italic border-t pt-2">
            Exposure is an estimate. Pending items must be approved via the
            Review Center before they become financial facts. An 85%
            realisation factor is applied.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
