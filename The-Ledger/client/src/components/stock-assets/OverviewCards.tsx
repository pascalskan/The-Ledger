import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Package, Truck, Activity, AlertTriangle } from "lucide-react";

interface OverviewCardsProps {
  stockItems: { quantity: number; unitCost: number; reorderLevel: number }[];
  assets: { status: string; assignedToJobId?: string; nextServiceDate?: string }[];
  stockMovements: { createdAt: string }[];
}

const SERVICE_WINDOW_MS = 30 * 24 * 60 * 60 * 1000;

/**
 * Derived from the live store. These tiles previously showed hard-coded
 * figures (1,204 items, £185,000 of assets, 12 low stock…) that never matched
 * the Stock, Assets and Alerts tabs beside them.
 */
export function OverviewCards({ stockItems, assets, stockMovements }: OverviewCardsProps) {
  const formatCur = (val: number) => new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP', maximumFractionDigits: 0 }).format(val);

  const stockValue = stockItems.reduce((sum, s) => sum + s.quantity * s.unitCost, 0);
  const totalUnits = stockItems.reduce((sum, s) => sum + s.quantity, 0);
  const lowStock = stockItems.filter((s) => s.quantity <= s.reorderLevel).length;

  const liveAssets = assets.filter((a) => a.status !== "Retired");
  const activeAssets = liveAssets.filter((a) => a.status === "Active" || a.status === "In Service").length;
  const dueForService = liveAssets.filter(
    (a) =>
      a.status === "Needs Service" ||
      a.status === "Broken" ||
      a.status === "Under Repair" ||
      (a.nextServiceDate && new Date(a.nextServiceDate).getTime() < Date.now() + SERVICE_WINDOW_MS),
  ).length;
  const assignedAssets = liveAssets.filter((a) => a.assignedToJobId).length;
  const idleAssets = liveAssets.length - assignedAssets;

  const monthAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
  const movementsThisMonth = stockMovements.filter((m) => new Date(m.createdAt).getTime() >= monthAgo).length;

  return (
    <div className="grid gap-4 md:grid-cols-3">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground uppercase">Stock Summary</CardTitle>
          <Package className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-foreground">{formatCur(stockValue)}</div>
          <p className="text-xs text-muted-foreground mt-1">Total stock value</p>
          <div className="flex flex-wrap gap-x-4 gap-y-1 mt-3 text-sm">
            <div><span className="font-medium">{totalUnits.toLocaleString("en-GB")}</span> units · {stockItems.length} lines</div>
            <div className="text-rose-700 font-medium flex items-center gap-1"><AlertTriangle className="h-3 w-3" /> {lowStock} low stock</div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground uppercase">Asset Summary</CardTitle>
          <Truck className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-foreground">{liveAssets.length}</div>
          <p className="text-xs text-muted-foreground mt-1">Assets in service</p>
          <div className="flex flex-wrap gap-x-4 gap-y-1 mt-3 text-sm">
            <div><span className="font-medium">{activeAssets}</span> active</div>
            <div className="text-amber-700 font-medium flex items-center gap-1"><AlertTriangle className="h-3 w-3" /> {dueForService} due for service</div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground uppercase">Activity Snapshot</CardTitle>
          <Activity className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="space-y-3 mt-1">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Stock movements (30 days)</span>
              <span className="font-medium text-foreground">{movementsThisMonth}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Assets assigned to jobs</span>
              <span className="font-medium text-foreground">{assignedAssets}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Idle assets</span>
              <span className="font-medium text-foreground">{idleAssets}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
