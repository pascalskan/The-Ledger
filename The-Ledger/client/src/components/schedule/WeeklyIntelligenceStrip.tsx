import { Card, CardContent } from "@/components/ui/card";
import { Users, Truck, PoundSterling, Clock, Activity, AlertTriangle } from "lucide-react";

export function WeeklyIntelligenceStrip({ metrics }) {
  const formatCur = (val: number) => new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP', maximumFractionDigits: 0 }).format(val);

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
      <Card className="shadow-sm border-slate-200">
        <CardContent className="p-3">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
            <Users className="h-3.5 w-3.5" /> Workforce Util.
          </div>
          <div className="flex items-end justify-between">
            <div className="text-xl font-bold text-slate-900">{metrics.workforceUtil}%</div>
            {metrics.overtimeRisk && (
              <span className="text-[10px] bg-amber-50 text-amber-700 px-1.5 py-0.5 rounded border border-amber-200 font-medium flex items-center gap-1">
                <AlertTriangle className="h-3 w-3" /> Risk
              </span>
            )}
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-sm border-slate-200 bg-slate-50/50">
        <CardContent className="p-3">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
            <PoundSterling className="h-3.5 w-3.5" /> Scheduled Rev.
          </div>
          <div className="text-xl font-bold text-slate-900">{formatCur(metrics.scheduledRevenue)}</div>
        </CardContent>
      </Card>

      <Card className="shadow-sm border-slate-200 bg-slate-50/50">
        <CardContent className="p-3">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
            <Clock className="h-3.5 w-3.5" /> Est. Labor
          </div>
          <div className="text-xl font-bold text-slate-700">{formatCur(metrics.forecastedLaborCost)}</div>
        </CardContent>
      </Card>

      <Card className="shadow-sm border-slate-200 bg-blue-50/50 border-blue-100">
        <CardContent className="p-3 flex justify-between items-center h-full">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-blue-700 uppercase tracking-wider mb-1">
              <Activity className="h-3.5 w-3.5" /> Net Contribution
            </div>
            <div className="text-2xl font-bold text-blue-900">{formatCur(metrics.netForecastContribution)}</div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
