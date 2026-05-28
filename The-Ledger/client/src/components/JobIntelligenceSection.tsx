import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { TrendingUp, AlertTriangle, AlertCircle, CheckCircle2, DollarSign } from "lucide-react";
import { useJobIntelligence } from "@/lib/useJobIntelligence";
import { cn } from "@/lib/utils";

export function JobIntelligenceSection({ jobId }: { jobId: string }) {
  const [metrics] = useJobIntelligence(jobId);

  if (!metrics) return null;

  const { contractValue, totalCost, profit, margin, burn, remaining, healthScore, risks, invoicedAmount, paidAmount, collectionRate } = metrics;

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
          <p className="text-sm text-muted-foreground mt-1">Real-time financial and operational insights.</p>
        </div>
        <div className={cn("px-3 py-1.5 rounded-full text-sm font-bold flex items-center gap-2 border", healthColor, healthScore < 60 ? "border-red-200" : healthScore < 80 ? "border-yellow-200" : "border-green-200")}>
          {healthScore >= 80 ? <CheckCircle2 className="w-4 h-4" /> : healthScore < 60 ? <AlertCircle className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
          Health Score: {healthScore}
        </div>
      </CardHeader>
      <CardContent className="p-6">
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          
          <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
            <p className="text-xs text-slate-500 font-medium uppercase tracking-wider mb-1">Contract Value</p>
            <p className="text-2xl font-bold text-slate-900">${contractValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
            <div className="mt-3 flex items-center justify-between text-xs border-t pt-2">
              <span className="text-slate-500">Invoiced:</span>
              <span className="font-medium">${invoicedAmount.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
            <p className="text-xs text-slate-500 font-medium uppercase tracking-wider mb-1">Total Costs</p>
            <p className="text-2xl font-bold text-slate-900">${totalCost.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
            <div className="mt-3 flex items-center justify-between text-xs border-t pt-2">
              <span className="text-slate-500">Remaining Budget:</span>
              <span className="font-medium text-slate-700">${remaining.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
            <p className="text-xs text-slate-500 font-medium uppercase tracking-wider mb-1">Est. Profit Margin</p>
            <div className="flex items-baseline gap-2">
              <p className={cn("text-2xl font-bold", margin >= 20 ? "text-green-600" : margin > 0 ? "text-yellow-600" : "text-red-600")}>
                {margin.toFixed(1)}%
              </p>
              <span className="text-sm font-medium text-slate-500">(${profit.toLocaleString(undefined, { maximumFractionDigits: 0 })})</span>
            </div>
            <div className="mt-3">
               <Progress value={Math.max(0, margin)} max={40} className={cn("h-1.5", margin >= 20 ? "[&>div]:bg-green-500" : margin > 0 ? "[&>div]:bg-yellow-500" : "[&>div]:bg-red-500")} />
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
            <p className="text-xs text-slate-500 font-medium uppercase tracking-wider mb-1">Budget Burn</p>
            <p className={cn("text-2xl font-bold", burn > 95 ? "text-red-600" : burn > 85 ? "text-yellow-600" : "text-slate-900")}>
              {burn.toFixed(1)}%
            </p>
            <div className="mt-3 flex items-center justify-between text-xs border-t pt-2">
              <span className="text-slate-500">Collection Rate:</span>
              <span className={cn("font-medium", collectionRate < 100 && invoicedAmount > 0 ? "text-yellow-600" : "text-green-600")}>{collectionRate.toFixed(0)}%</span>
            </div>
          </div>

        </div>

        {risks.length > 0 && (
          <div className="mt-6 p-4 rounded-xl bg-slate-50 border border-slate-100">
            <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-slate-400" /> Active Risk Factors
            </h4>
            <div className="flex flex-wrap gap-2">
              {risks.map((risk, idx) => (
                <div key={idx} className={cn(
                  "px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 border",
                  risk.level === "critical" ? "bg-red-50 text-red-700 border-red-200" : "bg-yellow-50 text-yellow-700 border-yellow-200"
                )}>
                  <div className={cn("w-1.5 h-1.5 rounded-full", risk.level === "critical" ? "bg-red-500" : "bg-yellow-500")} />
                  {risk.type}
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}