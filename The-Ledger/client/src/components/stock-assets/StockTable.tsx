import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MoreHorizontal, AlertTriangle } from "lucide-react";

export function StockTable({ data }: { data: any[] }) {
  const formatCur = (val: number) => new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP', minimumFractionDigits: 2 }).format(val);

  return (
    <div className="border border-border rounded-md bg-card overflow-x-auto">
      <Table>
        <TableHeader className="bg-muted">
          <TableRow>
            <TableHead>Item Name</TableHead>
            <TableHead>SKU</TableHead>
            <TableHead className="text-right">Qty On Hand</TableHead>
            <TableHead className="text-right">Unit Cost</TableHead>
            <TableHead className="text-right">Total Value</TableHead>
            <TableHead>Location</TableHead>
            <TableHead className="text-right">Pending Req.</TableHead>
            <TableHead className="text-right">Reorder Level</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((item, idx) => {
            const isLowStock = item.quantity <= item.reorderLevel;
            return (
              <TableRow key={idx}>
                <TableCell className="font-medium text-foreground flex items-center gap-2">
                  {item.name}
                  {isLowStock && <AlertTriangle className="h-3 w-3 text-rose-500" />}
                </TableCell>
                <TableCell className="text-muted-foreground font-mono text-xs">{item.sku}</TableCell>
                <TableCell className={`text-right font-medium ${isLowStock ? 'text-rose-600' : 'text-foreground'}`}>{item.quantity}</TableCell>
                <TableCell className="text-right text-muted-foreground">{formatCur(item.unitCost)}</TableCell>
                <TableCell className="text-right font-medium text-foreground">{formatCur(item.quantity * item.unitCost)}</TableCell>
                <TableCell><Badge variant="outline" className="font-normal text-muted-foreground bg-muted">{item.location}</Badge></TableCell>
                <TableCell className="text-right text-muted-foreground">{item.pendingRequests}</TableCell>
                <TableCell className="text-right text-muted-foreground">{item.reorderLevel}</TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}