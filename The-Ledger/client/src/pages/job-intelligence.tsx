import { Layout } from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useJobIntelligence } from "@/lib/useJobIntelligence";
import { useLocation } from "wouter";
import { TrendingUp, AlertTriangle, AlertCircle, CheckCircle2, ArrowRight, Activity } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

function fmt(n: number) {
  return `£${Math.abs(n).toLocaleString("en-GB", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })}`;
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
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Job Intelligence</h2>
          <p className="text-muted-foreground mt-1">
            Financial analytics derived from approved operational activity.
          </p>
        </div>

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
                <CardHeader className="pb-4 border-b bg-slate-50/50">
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
                          <span className="font-medium text-slate-700">Cost / Revenue</span>
                          <span
                            className={cn(
                              "font-bold",
                              burn > 95
                                ? "text-red-600"
                                : burn > 85
                                ? "text-yellow-600"
                                : "text-slate-600"
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
                      <div className="bg-slate-50 p-3 rounded-lg text-xs flex justify-between items-center border">
                        <div>
                          <p className="text-slate-500 mb-0.5">Invoiced</p>
                          <p className="font-medium">{fmt(invoicedAmount)}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-slate-500 mb-0.5">Paid</p>
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
          <div className="text-center py-12 border-2 border-dashed rounded-xl border-slate-200">
            <h3 className="text-lg font-medium text-slate-900">No active jobs</h3>
            <p className="text-sm text-slate-500 mt-1">
              There are no active jobs to display intelligence for.
            </p>
          </div>
        )}
      </div>
    </Layout>
  );
}
