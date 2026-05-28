import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Truck } from "lucide-react";

export function EquipmentContribution({ data }: { data: any }) {
  const formatCur = (val: number) => new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP', maximumFractionDigits: 0 }).format(val);

  return (
    <Card className="shadow-sm border-slate-200">
      <CardHeader className="border-b border-slate-100 bg-slate-50/50">
        <CardTitle className="text-lg text-slate-900 flex items-center gap-2">
          <Truck className="h-5 w-5 text-slate-500" />
          Equipment Contribution
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-6 space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
            <div className="text-xs text-slate-500 uppercase font-semibold mb-1">Linked Revenue</div>
            <div className="text-xl font-bold text-slate-800">{formatCur(data.revenue)}</div>
          </div>
          <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
            <div className="text-xs text-slate-500 uppercase font-semibold mb-1">Linked Spend</div>
            <div className="text-xl font-bold text-slate-800">{formatCur(data.spend)}</div>
          </div>
        </div>
        
        <div className="flex items-center justify-between py-2 border-t border-slate-100">
          <span className="text-sm font-medium text-slate-700">Net Contribution</span>
          <span className="text-lg font-bold text-emerald-600">{formatCur(data.revenue - data.spend)}</span>
        </div>
        
        <div className="flex items-center justify-between py-2 border-t border-slate-100">
          <span className="text-sm font-medium text-slate-700">Utilisation</span>
          <span className="text-sm font-bold text-slate-800">{data.utilisation}%</span>
        </div>
      </CardContent>
    </Card>
  );
}
