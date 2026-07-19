import { Layout } from "@/components/layout";
import { PageHeader } from "@/components/page-shell";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useJobIntelligence } from "@/lib/useJobIntelligence";
import { useStore } from "@/lib/mockData";
import { getAllJobMargins } from "@/lib/profitabilityEngine";
import { useLocation } from "wouter";
import { TrendingUp, AlertTriangle, AlertCircle, CheckCircle2, ArrowRight, Activity, TrendingDown, BarChart3 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

function fmt(n: number) {
  return `£${Math.abs(n).toLocaleString("en-GB", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })}`;
}

function fmtPct(n: number) {
  return `${n.toFixed(1)}%`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Portfolio Profitability Strip
// Shows aggregated KPIs for all active + planned jobs that have approved data.
// Source: getAllJobMargins() → getJobFinancialSummary() per job.
// ─────────────────────────────────────────────────────────────────────────────
function PortfolioProfitabilityStrip() {
  const { jobs } = useStore();

  // Only include active and planned jobs in portfolio summary
  const activeJobs = jobs.filter(
    (j) => j.status === "Active" || j.status === "Planned"
  );

  const margins = getAllJobMargins(activeJobs, 20);
  const withActivity = margins.filter((m) => m.hasActivity);

  if (withActivity.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border p-4 text-center text-sm text-muted-foreground">
        <BarChart3 className="h-5 w-5 mx-auto mb-1 opacity-30" />
        No approved financial activity across active jobs.
        Approve a worker report to see portfolio KPIs.
      </div>
    );
  }

  const totalRevenue = withActivity.reduce((s, m) => s + m.summary.totalRevenue, 0);
  const totalCost    = withActivity.reduce((s, m) => s + m.summary.totalCost, 0);
  const grossProfit  = totalRevenue - totalCost;
  const avgMargin    = totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0;
  const belowTarget  = withActivity.filter((m) => m.belowThreshold).length;
  const profitPositive = grossProfit >= 0;

  const kpis = [
    {
      label: "Portfolio Revenue",
      value: fmt(totalRevenue),
      sub: `${withActivity.length} job${withActivity.length !== 1 ? "s" : ""} with activity`,
      color: "text-foreground",
    },
    {
      label: "Portfolio Cost",
      value: fmt(totalCost),
      sub: "Approved cost",
      color: "text-foreground",
    },
    {
      label: "Gross Profit",
      value: (grossProfit < 0 ? "-" : "") + fmt(grossProfit),
      sub: profitPositive ? "Positive" : "Below zero",
      color: profitPositive ? "text-green-600" : "text-red-600",
    },
    {
      label: "Avg Margin",
      value: fmtPct(avgMargin),
      sub: avgMargin >= 20 ? "On target" : "Below 20% target",
      color: avgMargin >= 20 ? "text-green-600" : avgMargin > 0 ? "text-amber-600" : "text-red-600",
    },
    {
      label: "Below Target",
      value: String(belowTarget),
      sub: belowTarget === 0 ? "All jobs healthy" : `${belowTarget} job${belowTarget !== 1 ? "s" : ""} < 20% margin`,
      color: belowTarget === 0 ? "text-green-600" : "text-amber-600",
    },
  ];

  return (
    <div className="rounded-xl border bg-card p-4">
      <div className="flex items-center gap-2 mb-4">
        <BarChart3 className="h-4 w-4 text-muted-foreground" />
        <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          Portfolio Summary — Active &amp; Planned Jobs
        </p>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        {kpis.map(({ label, value, sub, color }) => (
          <div key={label}>
            <p className="text-xs text-muted-foreground mb-1">{label}</p>
            <p className={cn("text-xl font-bold", color)}>{value}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function JobIntelligenceDashboard() {
  const allMetrics = useJobIntelligence();
  const [, setLocation] = useLocation();

  // Only show active or planned jobs on the dashboard by default
  const activeMetrics = allMetrics.filter(
    (m) => m.job.status === "Active" || m.job.status === "Planned"
  );

  return (
    <Layout>
      <div className="space-y-8 pb-12">
        <PageHeader
          title="Job Intelligence"
          description="Financial analytics derived from approved operational activity."
        />

        {/* Portfolio Profitability Strip */}
        <PortfolioProfitabilityStrip />

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {activeMetrics.map((metrics) => {
            const {
              job,
              totalRevenue,
              totalCost,
              profit,
              margin,
              burn,
              healthScore,
              risks,
              invoicedAmount,
              paidAmount,
              summary,
            } = metrics;

            let healthColor = "text-green-500 bg-green-50";
            if (healthScore < 60) healthColor = "text-red-500 bg-red-50";
            else if (healthScore < 80) healthColor = "text-yellow-600 bg-yellow-50";

            return (
              <Card
                key={job.id}
                className="flex flex-col overflow-hidden transition-shadow hover:shadow-md"
              >
                <CardHeader className="pb-4 border-b bg-muted/50">
                  <div className="flex justify-between items-start mb-2">
                    <Badge variant={job.status === "Active" ? "default" : "secondary"}>
                      {job.status}
                    </Badge>
                    <div
                      className={cn(
                        "px-2.5 py-1 rounded-full text-xs font-bold flex items-center gap-1.5",
                        healthColor
                      )}
                    >
                      {healthScore >= 80 ? (
                        <CheckCircle2 className="w-3.5 h-3.5" />
                      ) : healthScore < 60 ? (
                        <AlertCircle className="w-3.5 h-3.5" />
                      ) : (
                        <AlertTriangle className="w-3.5 h-3.5" />
                      )}
                      Health: {healthScore}
                    </div>
                  </div>
                  <CardTitle className="text-lg leading-tight">{job.title}</CardTitle>
                  <CardDescription className="font-mono text-xs">{job.jobId}</CardDescription>
                </CardHeader>

                <CardContent className="p-5 flex-1 flex flex-col gap-5">
                  {summary.hasActivity ? (
                    <>
                      {/* Financials Grid — sourced from normalized records */}
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">Approved Revenue</p>
                          <p className="font-bold text-lg">{fmt(totalRevenue)}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">Gross Profit</p>
                          <p
                            className={cn(
                              "font-bold text-lg",
                              profit >= 0 ? "text-green-600" : "text-red-600"
                            )}
                          >
                            {profit < 0 ? "-" : ""}{fmt(profit)}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">Approved Cost</p>
                          <p className="font-semibold">{fmt(totalCost)}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">Margin</p>
                          <p
                            className={cn(
                              "font-semibold flex items-center gap-1",
                              margin >= 20
                                ? "text-green-600"
                                : margin > 0
                                ? "text-yellow-600"
                                : "text-red-600"
                            )}
                          >
                            {margin.toFixed(1)}% <TrendingUp className="w-3 h-3" />
                          </p>
                        </div>
                      </div>

                      {/* Burn Progress */}
                      <div className="space-y-1.5 mt-auto">
                        <div className="flex justify-between text-xs">
                          <span className="font-medium text-foreground">Cost / Revenue</span>
                          <span
                            className={cn(
                              "font-bold",
                              burn > 95
                                ? "text-red-600"
                                : burn > 85
                                ? "text-yellow-600"
                                : "text-muted-foreground"
                            )}
                          >
                            {burn.toFixed(1)}%
                          </span>
                        </div>
                        <Progress
                          value={burn}
                          className={cn(
                            "h-2",
                            burn > 95
                              ? "[&>div]:bg-red-500"
                              : burn > 85
                              ? "[&>div]:bg-yellow-500"
                              : ""
                          )}
                        />
                      </div>

                      {/* Collection Stats */}
                      <div className="bg-muted p-3 rounded-lg text-xs flex justify-between items-center border">
                        <div>
                          <p className="text-muted-foreground mb-0.5">Invoiced</p>
                          <p className="font-medium">{fmt(invoicedAmount)}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-muted-foreground mb-0.5">Paid</p>
                          <p className="font-medium text-green-600">{fmt(paidAmount)}</p>
                        </div>
                      </div>
                    </>
                  ) : (
                    // No approved financial activity yet
                    <div className="flex flex-col items-center justify-center py-4 text-center text-muted-foreground">
                      <Activity className="h-8 w-8 mb-2 opacity-20" />
                      <p className="text-xs">
                        No approved financial activity yet.
                      </p>
                      <p className="text-xs mt-1 opacity-70">
                        Approve a worker report to see live data.
                      </p>
                    </div>
                  )}

                  {/* Risks */}
                  {risks.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {risks.map((risk, idx) => (
                        <Badge
                          key={idx}
                          variant="outline"
                          className={cn(
                            "text-[10px] uppercase tracking-wider py-0.5 border",
                            risk.level === "critical"
                              ? "bg-red-50 text-red-700 border-red-200"
                              : "bg-yellow-50 text-yellow-700 border-yellow-200"
                          )}
                        >
                          {risk.type}
                        </Badge>
                      ))}
                    </div>
                  )}

                  <Button
                    variant="outline"
                    className="w-full mt-2 group"
                    onClick={() => setLocation(`/jobs/${job.id}`)}
                  >
                    View Job Details
                    <ArrowRight className="w-4 h-4 ml-2 transition-transform group-hover:translate-x-1" />
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {activeMetrics.length === 0 && (
          <div className="text-center py-12 border-2 border-dashed rounded-xl border-border">
            <h3 className="text-lg font-medium text-foreground">No active jobs</h3>
            <p className="text-sm text-muted-foreground mt-1">
              There are no active jobs to display intelligence for.
            </p>
          </div>
        )}
      </div>
    </Layout>
  );
}
