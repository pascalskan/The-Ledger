import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Package, Truck, Activity, AlertTriangle } from "lucide-react";

export function OverviewCards() {
  const formatCur = (val: number) => new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP', maximumFractionDigits: 0 }).format(val);

  return (
    <div className="grid gap-4 md:grid-cols-3">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-slate-500 uppercase">Stock Summary</CardTitle>
          <Package className="h-4 w-4 text-slate-400" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-slate-900">{formatCur(12500)}</div>
          <p className="text-xs text-slate-500 mt-1">Total stock value</p>
          <div className="flex gap-4 mt-3 text-sm">
            <div><span className="font-medium">1,204</span> items</div>
            <div className="text-rose-600 font-medium flex items-center gap-1"><AlertTriangle className="h-3 w-3" /> 12 low stock</div>
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-slate-500 uppercase">Asset Summary</CardTitle>
          <Truck className="h-4 w-4 text-slate-400" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-slate-900">{formatCur(185000)}</div>
          <p className="text-xs text-slate-500 mt-1">Total asset value</p>
          <div className="flex gap-4 mt-3 text-sm">
            <div><span className="font-medium">24</span> active</div>
            <div className="text-amber-600 font-medium flex items-center gap-1"><AlertTriangle className="h-3 w-3" /> 3 due for service</div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-slate-500 uppercase">Activity Snapshot</CardTitle>
          <Activity className="h-4 w-4 text-slate-400" />
        </CardHeader>
        <CardContent>
          <div className="space-y-3 mt-1">
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">Stock movements (month)</span>
              <span className="font-medium text-slate-900">145</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">Assets assigned to jobs</span>
              <span className="font-medium text-slate-900">18</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">Idle assets</span>
              <span className="font-medium text-slate-900">6</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}