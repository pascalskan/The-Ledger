import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

export function JobProfitabilityTable({ jobs }: { jobs: any[] }) {
  const formatCur = (val: number) => new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP', maximumFractionDigits: 0 }).format(val);

  return (
    <Card className="shadow-sm border-border">
      <CardHeader className="border-b border-border bg-muted/50">
        <CardTitle className="text-lg text-foreground">Job Profitability</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader className="bg-muted/50">
            <TableRow>
              <TableHead className="w-[250px]">Job Name</TableHead>
              <TableHead className="text-right">Revenue (QB)</TableHead>
              <TableHead className="text-right">Approved Spend</TableHead>
              <TableHead className="text-right">Pending Spend</TableHead>
              <TableHead className="text-right font-semibold">Gross Profit</TableHead>
              <TableHead className="text-right">Margin %</TableHead>
              <TableHead className="text-center">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {jobs.map((job: any) => {
              const gp = job.revenue - job.approvedSpend;
              const margin = job.revenue > 0 ? Math.round((gp / job.revenue) * 100) : 0;
              
              let statusVariant = "default";
              let statusLabel = "Healthy";
              if (margin < 20) {
                statusVariant = "destructive";
                statusLabel = "Risk";
              } else if (margin <= 35) {
                statusVariant = "secondary";
                statusLabel = "Watch";
              }

              return (
                <TableRow key={job.id} className="hover:bg-muted">
                  <TableCell className="font-medium text-foreground">{job.title}</TableCell>
                  <TableCell className="text-right font-medium text-foreground">{formatCur(job.revenue)}</TableCell>
                  <TableCell className="text-right text-muted-foreground">{formatCur(job.approvedSpend)}</TableCell>
                  <TableCell className="text-right text-amber-600 font-medium">{formatCur(job.pendingSpend)}</TableCell>
                  <TableCell className="text-right font-semibold text-foreground">{formatCur(gp)}</TableCell>
                  <TableCell className="text-right text-foreground font-medium">{margin}%</TableCell>
                  <TableCell className="text-center">
                    <Badge variant={statusVariant as any} className={`
                      ${statusLabel === 'Healthy' ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border-emerald-200 font-normal' : ''}
                      ${statusLabel === 'Watch' ? 'bg-amber-50 text-amber-700 hover:bg-amber-100 border-amber-200 font-normal' : ''}
                      ${statusLabel === 'Risk' ? 'bg-rose-50 text-rose-700 hover:bg-rose-100 border-rose-200 font-normal' : ''}
                    `}>
                      {statusLabel}
                    </Badge>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
