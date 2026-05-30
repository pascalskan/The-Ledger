import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useStore } from "@/lib/mockData";
import { TrendingUp, TrendingDown, Minus, DollarSign } from "lucide-react";
import { cn } from "@/lib/utils";

function fmt(n: number) {
  return `£${Math.abs(n).toLocaleString("en-GB", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function Row({
  label,
  value,
  muted = false,
  bold = false,
  colorValue = false,
}: {
  label: string;
  value: number;
  muted?: boolean;
  bold?: boolean;
  colorValue?: boolean;
}) {
  const isNeg = value < 0;
  const valueClass = colorValue
    ? value > 0
      ? "text-emerald-600"
      : value < 0
      ? "text-red-600"
      : "text-muted-foreground"
    : "";

  return (
    <div className={cn("flex justify-between items-center py-1.5 text-sm", bold && "font-semibold")}>
      <span className={muted ? "text-muted-foreground" : ""}>{label}</span>
      <span className={valueClass}>
        {isNeg && colorValue ? `-${fmt(value)}` : fmt(value)}
      </span>
    </div>
  );
}

function Divider() {
  return <div className="border-t my-1" />;
}

export function JobFinancialSummarySection({ jobId }: { jobId: string }) {
  const { getJobFinancialSummary } = useStore();
  const s = getJobFinancialSummary(jobId);

  if (!s.hasActivity) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm">
            <DollarSign className="h-4 w-4" /> Financial Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground italic">
            No approved financial activity recorded yet.
          </p>
        </CardContent>
      </Card>
    );
  }

  const profitIcon =
    s.grossProfit > 0 ? (
      <TrendingUp className="h-4 w-4 text-emerald-600" />
    ) : s.grossProfit < 0 ? (
      <TrendingDown className="h-4 w-4 text-red-600" />
    ) : (
      <Minus className="h-4 w-4 text-muted-foreground" />
    );

  const marginClass =
    s.grossProfit > 0
      ? "text-emerald-600"
      : s.grossProfit < 0
      ? "text-red-600"
      : "text-muted-foreground";

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-sm">
            <DollarSign className="h-4 w-4" /> Financial Summary
          </CardTitle>
          <div className={cn("flex items-center gap-1.5 text-sm font-semibold", marginClass)}>
            {profitIcon}
            <span>{s.marginPercent.toFixed(1)}% margin</span>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        <div className="grid gap-0 md:grid-cols-2 md:gap-6">
          {/* Costs column */}
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-1">
              Costs
            </p>
            <Row label="Labour" value={s.laborCost} muted />
            <Row label="Materials" value={s.materialCost} muted />
            <Row label="Equipment" value={s.equipmentCost} muted />
            <Row label="Expenses" value={s.expenseCost} muted />
            <Divider />
            <Row label="Total Cost" value={s.totalCost} bold />
          </div>

          {/* Revenue & Profit column */}
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-1">
              Revenue & Profit
            </p>
            <Row label="Material Revenue" value={s.materialRevenue} muted />
            <Row label="Labour Revenue" value={s.laborRevenue} muted />
            <Row label="Equipment Revenue" value={s.equipmentRevenue} muted />
            <Row label="Expense Recovery" value={s.expenseRevenue} muted />
            <Divider />
            <Row label="Total Revenue" value={s.totalRevenue} bold />
            <Row
              label="Gross Profit"
              value={s.grossProfit}
              bold
              colorValue
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
