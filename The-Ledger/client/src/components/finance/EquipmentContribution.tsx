import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Truck } from "lucide-react";

export function EquipmentContribution({ data }: { data: any }) {
  const formatCur = (val: number) => new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP', maximumFractionDigits: 0 }).format(val);

  return (
    <Card className="shadow-sm border-border">
      <CardHeader className="border-b border-border bg-muted/50">
        <CardTitle className="text-lg text-foreground flex items-center gap-2">
          <Truck className="h-5 w-5 text-muted-foreground" />
          Equipment Contribution
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-6 space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="p-3 bg-muted rounded-lg border border-border">
            <div className="text-xs text-muted-foreground uppercase font-semibold mb-1">Linked Revenue</div>
            <div className="text-xl font-bold text-foreground">{formatCur(data.revenue)}</div>
          </div>
          <div className="p-3 bg-muted rounded-lg border border-border">
            <div className="text-xs text-muted-foreground uppercase font-semibold mb-1">Linked Spend</div>
            <div className="text-xl font-bold text-foreground">{formatCur(data.spend)}</div>
          </div>
        </div>
        
        <div className="flex items-center justify-between py-2 border-t border-border">
          <span className="text-sm font-medium text-foreground">Net Contribution</span>
          <span className="text-lg font-bold text-emerald-600">{formatCur(data.revenue - data.spend)}</span>
        </div>
        
        <div className="flex items-center justify-between py-2 border-t border-border">
          <span className="text-sm font-medium text-foreground">Utilisation</span>
          <span className="text-sm font-bold text-foreground">{data.utilisation}%</span>
        </div>
      </CardContent>
    </Card>
  );
}
