import { Card, CardContent } from "@/components/ui/card";
import { MapPin, AlertTriangle } from "lucide-react";

export function LocationCards({ locations }: { locations: any[] }) {
  const formatCur = (val: number) => new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP', maximumFractionDigits: 0 }).format(val);

  return (
    <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
      {locations.map((loc, idx) => (
        <Card key={idx} className="cursor-pointer hover:border-blue-300 hover:shadow-md transition-all border-slate-200 shadow-sm">
          <CardContent className="p-5">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                  <MapPin className="h-4 w-4" />
                </div>
                <h3 className="font-semibold text-slate-900">{loc.name}</h3>
              </div>
              {loc.alerts > 0 && (
                <div className="flex items-center gap-1 text-xs font-medium text-rose-600 bg-rose-50 px-2 py-1 rounded-full border border-rose-100">
                  <AlertTriangle className="h-3 w-3" /> {loc.alerts}
                </div>
              )}
            </div>
            
            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-100">
              <div>
                <div className="text-[10px] text-slate-500 uppercase font-semibold tracking-wider mb-1">Stock Value</div>
                <div className="text-lg font-bold text-slate-900">{formatCur(loc.stockValue)}</div>
              </div>
              <div>
                <div className="text-[10px] text-slate-500 uppercase font-semibold tracking-wider mb-1">Items / Assets</div>
                <div className="text-lg font-bold text-slate-700">{loc.stockCount} / {loc.assetCount}</div>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}