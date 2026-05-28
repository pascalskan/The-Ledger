import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { PoundSterling } from "lucide-react";

export function FinancialOverview({ quote = 0, variations = 0, invoiced = 0, paid = 0 }) {
  const formatCur = (val: number) => new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(val);
  const balance = (quote + variations) - paid;

  return (
    <Card className="shadow-sm border-slate-200">
      <CardHeader className="pb-3 border-b border-slate-100">
        <CardTitle className="text-lg flex items-center gap-2">
          <PoundSterling className="h-5 w-5 text-slate-500" /> Financial Overview
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-4 space-y-3">
        <div className="flex justify-between text-sm">
          <span className="text-slate-500">Approved Quote</span>
          <span className="font-medium text-slate-800">{formatCur(quote)}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-slate-500">Variations</span>
          <span className="font-medium text-slate-800">{formatCur(variations)}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-slate-500">Invoices Issued</span>
          <span className="font-medium text-slate-800">{formatCur(invoiced)}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-slate-500">Payments Received</span>
          <span className="font-medium text-slate-800">{formatCur(paid)}</span>
        </div>
        <div className="pt-3 border-t border-slate-100 flex justify-between text-sm font-semibold text-slate-800">
          <span>Balance Outstanding</span>
          <span className={balance > 0 ? "text-slate-800" : "text-emerald-700"}>{formatCur(balance)}</span>
        </div>
      </CardContent>
    </Card>
  );
}
