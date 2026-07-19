import { Layout } from "@/components/layout";
import { useStore } from "@/lib/mockData";
import { useRoute, useLocation } from "wouter";
import { ArrowLeft, Package, History, Info, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export default function StockDetailPage() {
  const [, params] = useRoute("/stock/:id");
  const [, setLocation] = useLocation();
  const { stockItems, locations, stockMovements } = useStore();

  const stock = stockItems.find(s => s.id === params?.id);
  const location = locations.find(l => l.id === stock?.locationId);
  const movements = stockMovements.filter(m => m.stockItemId === stock?.id).reverse();

  if (!stock) {
    return (
      <Layout>
        <div className="text-center py-12">
          <p className="text-slate-500">Stock item not found.</p>
          <Button onClick={() => setLocation("/equipment")} className="mt-4">Back to Stock</Button>
        </div>
      </Layout>
    );
  }

  const isLowStock = stock.quantity <= stock.reorderLevel;

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => setLocation("/equipment")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold tracking-tight text-foreground">{stock.name}</h1>
              {isLowStock && <Badge variant="destructive" className="flex items-center gap-1"><AlertTriangle className="w-3 h-3"/> Low Stock</Badge>}
            </div>
            <p className="text-slate-500 mt-1 flex items-center gap-2">
              <span className="font-mono bg-slate-100 px-2 py-0.5 rounded text-xs">{stock.sku}</span>
              • {stock.category || "Uncategorized"} • <span className="font-medium text-slate-700">{location?.name || "Unknown Location"}</span>
            </p>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          <Card className="md:col-span-2">
            <CardHeader className="pb-3 border-b border-slate-100">
              <CardTitle className="text-lg flex items-center gap-2"><Info className="h-5 w-5 text-slate-400" /> Stock Information</CardTitle>
            </CardHeader>
            <CardContent className="pt-4 grid grid-cols-2 gap-y-6 gap-x-4">
              <div>
                <p className="text-sm font-medium text-slate-500 mb-1">Current Quantity</p>
                <p className={`text-3xl font-bold ${isLowStock ? 'text-rose-600' : 'text-slate-900'}`}>{stock.quantity}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-slate-500 mb-1">Reorder Level</p>
                <p className="text-lg font-medium text-slate-700">{stock.reorderLevel}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-slate-500 mb-1">Unit Cost</p>
                <p className="text-lg font-medium text-slate-700">£{stock.unitCost.toFixed(2)}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-slate-500 mb-1">Total Value</p>
                <p className="text-lg font-medium text-slate-700">£{(stock.quantity * stock.unitCost).toFixed(2)}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-slate-500 mb-1">Created At</p>
                <p className="text-sm text-slate-700">{new Date(stock.createdAt).toLocaleString()}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-slate-500 mb-1">Last Updated</p>
                <p className="text-sm text-slate-700">{new Date(stock.updatedAt).toLocaleString()}</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3 border-b border-slate-100">
              <CardTitle className="text-lg flex items-center gap-2"><Package className="h-5 w-5 text-slate-400" /> Actions</CardTitle>
            </CardHeader>
            <CardContent className="pt-4 flex flex-col gap-3">
              <Button className="w-full justify-start"><Package className="w-4 h-4 mr-2" /> Adjust Quantity</Button>
              <Button variant="outline" className="w-full justify-start text-slate-700">Edit Details</Button>
              <Button variant="outline" className="w-full justify-start text-rose-600 hover:text-rose-700 hover:bg-rose-50 border-rose-200 mt-4">Delete Stock Item</Button>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader className="pb-3 border-b border-slate-100">
            <CardTitle className="text-lg flex items-center gap-2"><History className="h-5 w-5 text-slate-400" /> Movement History</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {movements.length === 0 ? (
              <div className="text-center py-12 text-slate-500">No movement history for this item.</div>
            ) : (
              <Table>
                <TableHeader className="bg-slate-50">
                  <TableRow>
                    <TableHead>Date & Time</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead>Linked Job</TableHead>
                    <TableHead className="text-right">Quantity Change</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {movements.map((movement) => (
                    <TableRow key={movement.id}>
                      <TableCell className="text-slate-600">{new Date(movement.createdAt).toLocaleString()}</TableCell>
                      <TableCell className="capitalize font-medium text-slate-700">{movement.reason}</TableCell>
                      <TableCell className="text-slate-500">{movement.jobId || "—"}</TableCell>
                      <TableCell className={`text-right font-bold ${movement.quantityChange > 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                        {movement.quantityChange > 0 ? `+${movement.quantityChange}` : movement.quantityChange}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}