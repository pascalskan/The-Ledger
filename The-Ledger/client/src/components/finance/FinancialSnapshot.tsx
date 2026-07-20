import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { PoundSterling, TrendingUp, AlertTriangle, ArrowUpRight, ArrowDownRight } from "lucide-react";

export function FinancialSnapshot({ data }: { data: any }) {
  const formatCur = (val: number) => new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP', maximumFractionDigits: 0 }).format(val);
  
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
      <Card className="shadow-sm border-border">
        <CardHeader className="pb-2">
          <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex justify-between">
            <span>Total Revenue</span>
            <span className="text-[10px] bg-green-50 text-green-700 px-1.5 py-0.5 rounded border border-green-200">QB Synced</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-foreground">{formatCur(data.revenue)}</div>
          <div className="flex items-center gap-1 text-xs text-emerald-600 mt-1">
            <TrendingUp className="h-3 w-3" />
            <span>+12% vs last month</span>
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-sm border-border">
        <CardHeader className="pb-2">
          <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex justify-between">
            <span>Approved Spend</span>
            <span className="text-[10px] bg-muted text-muted-foreground px-1.5 py-0.5 rounded border border-border">System</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-foreground">{formatCur(data.approvedSpend)}</div>
          <div className="flex items-center gap-1 text-xs text-rose-600 mt-1">
            <TrendingUp className="h-3 w-3" />
            <span>+4% vs last month</span>
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-sm border-border">
        <CardHeader className="pb-2">
          <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex justify-between">
            <span>Gross Profit</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-foreground">{formatCur(data.grossProfit)}</div>
          <div className="flex items-center gap-1 text-xs text-emerald-600 mt-1">
            <ArrowUpRight className="h-3 w-3" />
            <span>Healthy Margin</span>
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-sm border-border border-amber-200 bg-amber-50/30">
        <CardHeader className="pb-2">
          <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex justify-between">
            <span>Pending Exposure</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-amber-700">{formatCur(data.pendingExposure)}</div>
          <div className="flex items-center gap-1 text-xs text-amber-600 mt-1">
            <AlertTriangle className="h-3 w-3" />
            <span>Needs Approval</span>
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-sm border-border">
        <CardHeader className="pb-2">
          <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex justify-between">
            <span>Avg Job Margin</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-foreground">{data.avgMargin}%</div>
          <div className="flex items-center gap-1 text-xs text-emerald-600 mt-1">
            <TrendingUp className="h-3 w-3" />
            <span>+2.1% vs target</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
