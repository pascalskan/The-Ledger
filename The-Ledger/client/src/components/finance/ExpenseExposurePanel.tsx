import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { AlertCircle } from "lucide-react";

export function ExpenseExposurePanel({ data }: { data: any }) {
  const formatCur = (val: number) => new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP', maximumFractionDigits: 0 }).format(val);

  return (
    <Card className="shadow-sm border-border h-full">
      <CardHeader className="border-b border-border bg-muted/50">
        <CardTitle className="text-lg text-foreground flex items-center gap-2">
          <AlertCircle className="h-5 w-5 text-amber-500" />
          Expense Exposure
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-6 space-y-6">
        <div className="flex justify-between items-end border-b border-border pb-4">
          <div>
            <div className="text-sm text-muted-foreground mb-1">Total Pending Approvals</div>
            <div className="text-3xl font-bold text-foreground">{data.pendingCount}</div>
          </div>
          <div className="text-right">
            <div className="text-sm text-muted-foreground mb-1">Value</div>
            <div className="text-xl font-bold text-amber-600">{formatCur(data.pendingValue)}</div>
          </div>
        </div>

        <div>
          <div className="flex justify-between text-sm mb-2">
            <span className="text-muted-foreground">% of Revenue Pending</span>
            <span className="font-semibold text-foreground">{data.percentOfRevenue}%</span>
          </div>
          <div className="w-full bg-muted rounded-full h-2.5">
            <div className="bg-amber-400 h-2.5 rounded-full" style={{ width: `${data.percentOfRevenue}%` }}></div>
          </div>
        </div>

        <div className="pt-2">
          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Highest Pending Exposure</h4>
          <div className="space-y-3">
            {data.topJobs.map((job: any, idx: number) => (
              <div key={idx} className="flex justify-between items-center bg-muted p-2 rounded border border-border">
                <span className="text-sm font-medium text-foreground truncate pr-4">{job.title}</span>
                <span className="text-sm font-semibold text-amber-600 shrink-0">{formatCur(job.amount)}</span>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
