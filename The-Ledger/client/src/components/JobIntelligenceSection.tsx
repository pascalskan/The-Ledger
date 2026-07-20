import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { TrendingUp, AlertTriangle, AlertCircle, CheckCircle2, Activity } from "lucide-react";
import { useJobIntelligence } from "@/lib/useJobIntelligence";
import { cn } from "@/lib/utils";

function fmt(n: number) {
  return `£${Math.abs(n).toLocaleString("en-GB", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })}`;
}

export function JobIntelligenceSection({ jobId }: { jobId: string }) {
  const [metrics] = useJobIntelligence(jobId);

  if (!metrics) return null;

  const {
    totalRevenue,
    totalCost,
    profit,
    margin,
    burn,
    remaining,
    healthScore,
    risks,
    invoicedAmount,
    paidAmount,
    collectionRate,
    summary,
  } = metrics;

  let healthColor = "text-green-500 bg-green-50";
  if (healthScore < 60) healthColor = "text-red-500 bg-red-50";
  else if (healthScore < 80) healthColor = "text-yellow-600 bg-yellow-50";

  return (
    <Card className="border-indigo-100 bg-gradient-to-br from-indigo-50/50 to-white overflow-hidden shadow-sm">
      <CardHeader className="pb-3 flex flex-row items-center justify-between border-b bg-white/50">
        <div>
          <CardTitle className="flex items-center gap-2 text-indigo-900">
            <TrendingUp className="w-5 h-5 text-indigo-500" /> Job Intelligence
          </CardTitle>
          <p className="text-sm text-muted-foreground mt-1">
            Real-time insights from approved financial activity.
          </p>
        </div>
        <div
          className={cn(
            "px-3 py-1.5 rounded-full text-sm font-bold flex items-center gap-2 border",
            healthColor,
            healthScore < 60
              ? "border-red-200"
              : healthScore < 80
              ? "border-yellow-200"
              : "border-green-200"
          )}
        >
          {healthScore >= 80 ? (
            <CheckCircle2 className="w-4 h-4" />
          ) : healthScore < 60 ? (
            <AlertCircle className="w-4 h-4" />
          ) : (
            <AlertTriangle className="w-4 h-4" />
          )}
          Health Score: {healthScore}
        </div>
      </CardHeader>

      <CardContent className="p-6">
        {summary.hasActivity ? (
          <>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
              <div className="bg-card p-4 rounded-xl border border-border shadow-sm">
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider mb-1">
                  Approved Revenue
                </p>
                <p className="text-2xl font-bold text-foreground">{fmt(totalRevenue)}</p>
                <div className="mt-3 flex items-center justify-between text-xs border-t pt-2">
                  <span className="text-muted-foreground">Invoiced:</span>
                  <span className="font-medium">{fmt(invoicedAmount)}</span>
                </div>
              </div>

              <div className="bg-card p-4 rounded-xl border border-border shadow-sm">
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider mb-1">
                  Approved Cost
                </p>
                <p className="text-2xl font-bold text-foreground">{fmt(totalCost)}</p>
                <div className="mt-3 flex items-center justify-between text-xs border-t pt-2">
                  <span className="text-muted-foreground">Remaining:</span>
                  <span className="font-medium text-foreground">{fmt(remaining)}</span>
                </div>
              </div>

              <div className="bg-card p-4 rounded-xl border border-border shadow-sm">
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider mb-1">
                  Gross Profit
                </p>
                <div className="flex items-baseline gap-2">
                  <p
                    className={cn(
                      "text-2xl font-bold",
                      margin >= 20
                        ? "text-green-600"
                        : margin > 0
                        ? "text-yellow-600"
                        : "text-red-600"
                    )}
                  >
                    {margin.toFixed(1)}%
                  </p>
                  <span className="text-sm font-medium text-muted-foreground">
                    ({profit < 0 ? "-" : ""}{fmt(profit)})
                  </span>
                </div>
                <div className="mt-3">
                  <Progress
                    value={Math.max(0, margin)}
                    max={40}
                    className={cn(
                      "h-1.5",
                      margin >= 20
                        ? "[&>div]:bg-green-500"
                        : margin > 0
                        ? "[&>div]:bg-yellow-500"
                        : "[&>div]:bg-red-500"
                    )}
                  />
                </div>
              </div>

              <div className="bg-card p-4 rounded-xl border border-border shadow-sm">
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider mb-1">
                  Cost / Revenue
                </p>
                <p
                  className={cn(
                    "text-2xl font-bold",
                    burn > 95
                      ? "text-red-600"
                      : burn > 85
                      ? "text-yellow-600"
                      : "text-foreground"
                  )}
                >
                  {burn.toFixed(1)}%
                </p>
                <div className="mt-3 flex items-center justify-between text-xs border-t pt-2">
                  <span className="text-muted-foreground">Collection Rate:</span>
                  <span
                    className={cn(
                      "font-medium",
                      collectionRate < 100 && invoicedAmount > 0
                        ? "text-yellow-600"
                        : "text-green-600"
                    )}
                  >
                    {collectionRate.toFixed(0)}%
                  </span>
                </div>
              </div>
            </div>

            {risks.length > 0 && (
              <div className="mt-6 p-4 rounded-xl bg-muted border border-border">
                <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-muted-foreground" /> Active Risk Factors
                </h4>
                <div className="flex flex-wrap gap-2">
                  {risks.map((risk, idx) => (
                    <div
                      key={idx}
                      className={cn(
                        "px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 border",
                        risk.level === "critical"
                          ? "bg-red-50 text-red-700 border-red-200"
                          : "bg-yellow-50 text-yellow-700 border-yellow-200"
                      )}
                    >
                      <div
                        className={cn(
                          "w-1.5 h-1.5 rounded-full",
                          risk.level === "critical" ? "bg-red-500" : "bg-yellow-500"
                        )}
                      />
                      {risk.type}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        ) : (
          // No approved financial activity
          <div className="flex flex-col items-center justify-center py-8 text-center text-muted-foreground">
            <Activity className="h-10 w-10 mb-3 opacity-20" />
            <p className="text-sm font-medium">No approved financial activity yet.</p>
            <p className="text-xs mt-1 opacity-70">
              Approve a worker report in the Review Centre to populate live financials.
            </p>
            {/* Schedule risk still shows even without approved financials */}
            {risks.length > 0 && (
              <div className="mt-4 flex flex-wrap justify-center gap-2">
                {risks.map((risk, idx) => (
                  <div
                    key={idx}
                    className={cn(
                      "px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 border",
                      risk.level === "critical"
                        ? "bg-red-50 text-red-700 border-red-200"
                        : "bg-yellow-50 text-yellow-700 border-yellow-200"
                    )}
                  >
                    <div
                      className={cn(
                        "w-1.5 h-1.5 rounded-full",
                        risk.level === "critical" ? "bg-red-500" : "bg-yellow-500"
                      )}
                    />
                    {risk.type}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
