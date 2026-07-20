import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Clock } from "lucide-react";
import { getPendingExposure } from "@/lib/profitabilityEngine";
import { useStore } from "@/lib/mockData";

function fmt(n: number) {
  return new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);
}

/**
 * PendingExposurePanel
 *
 * Phase 5.2 — shows the financial exposure from unapproved ReviewItems
 * for a specific job. These are estimates (pre-approval), not financial
 * facts. The component is explicit about this.
 *
 * Source: ReviewItems with status === 'pending' for this job.
 */
export function PendingExposurePanel({ jobId }: { jobId: string }) {
  const { reviewItems } = useStore();

  const exposure = getPendingExposure(reviewItems as any, jobId);

  if (exposure.pendingItemCount === 0) {
    return (
      <Card className="border-border">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2 text-muted-foreground">
            <Clock className="h-4 w-4" /> Pending Exposure
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground italic">No pending review items for this job.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-amber-200 bg-amber-50/30">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2 text-amber-800">
            <AlertTriangle className="h-4 w-4" /> Pending Exposure
          </CardTitle>
          <Badge variant="outline" className="bg-amber-100 text-amber-700 border-amber-300 text-xs">
            {exposure.pendingItemCount} item{exposure.pendingItemCount !== 1 ? 's' : ''} awaiting approval
          </Badge>
        </div>
        <p className="text-xs text-amber-700/70 mt-1">
          Estimate only — these figures are from unapproved submissions. They will become financial facts when a PM approves them via the Review Centre.
        </p>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="space-y-2 text-sm">
          {exposure.pendingLaborCost > 0 && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Labour cost estimate</span>
              <span className="font-medium text-amber-800">{fmt(exposure.pendingLaborCost)}</span>
            </div>
          )}
          {exposure.pendingMaterialCost > 0 && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Material cost estimate</span>
              <span className="font-medium text-amber-800">{fmt(exposure.pendingMaterialCost)}</span>
            </div>
          )}
          {exposure.pendingExpenseCost > 0 && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Expense estimate</span>
              <span className="font-medium text-amber-800">{fmt(exposure.pendingExpenseCost)}</span>
            </div>
          )}
          {exposure.totalPendingCost > 0 && (
            <div className="flex justify-between pt-1 border-t border-amber-200">
              <span className="font-semibold text-amber-900">Total pending cost</span>
              <span className="font-bold text-amber-900">{fmt(exposure.totalPendingCost)}</span>
            </div>
          )}
          {exposure.totalPendingCost === 0 && (
            <p className="text-xs text-amber-700/70 italic">
              Pending items have no cost payload — may be reports or photos only.
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
