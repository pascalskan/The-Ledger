import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CheckCircle2, FileCheck, AlertCircle } from "lucide-react";
import { getJobInvoiceReadiness } from "@/lib/profitabilityEngine";
import { useStore } from "@/lib/mockData";
import { cn } from "@/lib/utils";

function fmt(n: number) {
  return new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);
}

const LINE_TYPE_COLORS: Record<string, string> = {
  labor: 'bg-blue-50 text-blue-700 border-blue-200',
  material: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  equipment: 'bg-violet-50 text-violet-700 border-violet-200',
  expense: 'bg-amber-50 text-amber-700 border-amber-200',
};

/**
 * InvoiceReadinessPanel
 *
 * Phase 5.2 — aggregates approved InvoiceLineItem records for a job.
 * Shows what is billable based on approved operational activity.
 *
 * IMPORTANT: This reads Phase 4.2/4.5 normalized InvoiceLineItem records,
 * NOT legacy Invoice documents created from job.costs.*.
 * Both systems coexist during Phase 5. The empty-state copy explains this.
 */
export function InvoiceReadinessPanel({ jobId }: { jobId: string }) {
  const { invoiceLineItems } = useStore();

  const readiness = getJobInvoiceReadiness(jobId, invoiceLineItems);

  if (!readiness.hasLines) {
    return (
      <Card className="border-border">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2 text-muted-foreground">
            <FileCheck className="h-4 w-4" /> Invoice Readiness
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-start gap-2 text-sm text-muted-foreground">
            <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
            <div>
              <p className="italic">No approved invoice line items for this job yet.</p>
              <p className="text-xs mt-1">
                Invoice lines are created when the PM approves a worker report in the Review Centre.
                Legacy invoices created manually are shown on the Invoices page.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const typeLabels: Record<string, string> = {
    labor: 'Labour',
    material: 'Materials',
    equipment: 'Equipment',
    expense: 'Expenses',
  };

  return (
    <Card className="border-border">
      <CardHeader className="pb-2 border-b border-border">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-600" /> Invoice Readiness
          </CardTitle>
          <div className="text-right">
            <p className="text-xs text-muted-foreground">Total Billable</p>
            <p className="text-base font-bold text-foreground">{fmt(readiness.totalBillable)}</p>
          </div>
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          Approved line items sourced from normalized financial records. Ready for invoicing.
        </p>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader className="bg-muted/50">
            <TableRow>
              <TableHead>Type</TableHead>
              <TableHead>Description</TableHead>
              <TableHead className="text-right">Qty</TableHead>
              <TableHead className="text-right">Unit Price</TableHead>
              <TableHead className="text-right">Amount</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(['labor', 'equipment', 'material', 'expense'] as const).map((type) => {
              const lines = readiness.byType[type];
              if (lines.length === 0) return null;
              return lines.map((li) => (
                <TableRow key={li.id} className="text-sm">
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={cn('text-xs font-normal', LINE_TYPE_COLORS[li.type] ?? '')}
                    >
                      {typeLabels[li.type] ?? li.type}
                    </Badge>
                  </TableCell>
                  <TableCell className="max-w-[220px] truncate text-foreground">
                    {li.description}
                  </TableCell>
                  <TableCell className="text-right text-muted-foreground">{li.quantity}</TableCell>
                  <TableCell className="text-right text-muted-foreground">{fmt(li.unitPrice)}</TableCell>
                  <TableCell className="text-right font-semibold">{fmt(li.amount)}</TableCell>
                </TableRow>
              ));
            })}
            {/* Totals row */}
            <TableRow className="bg-muted/70 border-t-2">
              <TableCell colSpan={4} className="font-bold text-foreground text-sm">
                Total Billable
              </TableCell>
              <TableCell className="text-right font-bold text-foreground text-base">
                {fmt(readiness.totalBillable)}
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
