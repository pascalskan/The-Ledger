import { Layout } from "@/components/layout";
import { useStore } from "@/lib/mockData";
import { useRoute, useLocation } from "wouter";
import { ArrowLeft, Package, History, Info, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { useToast } from "@/hooks/use-toast";

export default function StockDetailPage() {
  const [, params] = useRoute("/stock/:id");
  const [, setLocation] = useLocation();
  const { stockItems, locations, stockMovements, updateStockItem, deleteStockItem } = useStore();
  const { toast } = useToast();
  const [mode, setMode] = useState<null | "adjust" | "edit" | "delete">(null);
  const [adjustTo, setAdjustTo] = useState("");
  const [editName, setEditName] = useState("");
  const [editSku, setEditSku] = useState("");
  const [editCategory, setEditCategory] = useState("");
  const [editCost, setEditCost] = useState("");
  const [editReorder, setEditReorder] = useState("");

  const stock = stockItems.find(s => s.id === params?.id);
  const location = locations.find(l => l.id === stock?.locationId);
  const movements = stockMovements.filter(m => m.stockItemId === stock?.id).reverse();

  if (!stock) {
    return (
      <Layout>
        <div className="text-center py-12">
          <p className="text-muted-foreground">Stock item not found.</p>
          <Button onClick={() => setLocation("/equipment")} className="mt-4">Back to Stock</Button>
        </div>
      </Layout>
    );
  }

  const isLowStock = stock.quantity <= stock.reorderLevel;

  const closeDialog = () => setMode(null);
  const openAdjust = () => { setAdjustTo(String(stock.quantity)); setMode("adjust"); };
  const openEdit = () => {
    setEditName(stock.name); setEditSku(stock.sku); setEditCategory(stock.category ?? "");
    setEditCost(String(stock.unitCost)); setEditReorder(String(stock.reorderLevel)); setMode("edit");
  };
  const saveAdjust = () => {
    const qty = Number(adjustTo);
    if (!Number.isFinite(qty) || qty < 0) { toast({ title: "Quantity not valid", description: "Quantity cannot be negative.", variant: "destructive" }); return; }
    updateStockItem(stock.id, { quantity: qty });
    toast({ title: "Quantity adjusted", description: `${stock.name} is now ${qty} on hand.` });
    closeDialog();
  };
  const saveEdit = () => {
    const cost = Number(editCost), reorder = Number(editReorder);
    if (!editName.trim() || !editSku.trim()) { toast({ title: "Name and SKU required", description: "Both are needed to identify the item.", variant: "destructive" }); return; }
    if (!Number.isFinite(cost) || cost < 0 || !Number.isFinite(reorder) || reorder < 0) { toast({ title: "Values not valid", description: "Unit cost and reorder level cannot be negative.", variant: "destructive" }); return; }
    updateStockItem(stock.id, { name: editName.trim(), sku: editSku.trim(), category: editCategory.trim() || undefined, unitCost: cost, reorderLevel: reorder });
    toast({ title: "Stock item updated", description: "Changes have been saved." });
    closeDialog();
  };
  const confirmDelete = () => {
    deleteStockItem(stock.id);
    toast({ title: "Stock item removed", description: `${stock.name} has been deleted.` });
    setLocation("/equipment");
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => setLocation("/equipment")} aria-label="Back to stock & assets">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold tracking-tight text-foreground">{stock.name}</h1>
              {isLowStock && <Badge variant="destructive" className="flex items-center gap-1"><AlertTriangle className="w-3 h-3"/> Low Stock</Badge>}
            </div>
            <p className="text-muted-foreground mt-1 flex items-center gap-2">
              <span className="font-mono bg-muted px-2 py-0.5 rounded text-xs">{stock.sku}</span>
              • {stock.category || "Uncategorized"} • <span className="font-medium text-foreground">{location?.name || "Unknown Location"}</span>
            </p>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          <Card className="md:col-span-2">
            <CardHeader className="pb-3 border-b border-border">
              <CardTitle className="text-lg flex items-center gap-2"><Info className="h-5 w-5 text-muted-foreground" /> Stock Information</CardTitle>
            </CardHeader>
            <CardContent className="pt-4 grid grid-cols-2 gap-y-6 gap-x-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">Current Quantity</p>
                <p className={`text-3xl font-bold ${isLowStock ? 'text-rose-600' : 'text-foreground'}`}>{stock.quantity}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">Reorder Level</p>
                <p className="text-lg font-medium text-foreground">{stock.reorderLevel}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">Unit Cost</p>
                <p className="text-lg font-medium text-foreground">£{stock.unitCost.toFixed(2)}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">Total Value</p>
                <p className="text-lg font-medium text-foreground">£{(stock.quantity * stock.unitCost).toFixed(2)}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">Created At</p>
                <p className="text-sm text-foreground">{new Date(stock.createdAt).toLocaleString("en-GB", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">Last Updated</p>
                <p className="text-sm text-foreground">{new Date(stock.updatedAt).toLocaleString("en-GB", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })}</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3 border-b border-border">
              <CardTitle className="text-lg flex items-center gap-2"><Package className="h-5 w-5 text-muted-foreground" /> Actions</CardTitle>
            </CardHeader>
            <CardContent className="pt-4 flex flex-col gap-3">
              <Button className="w-full justify-start" onClick={openAdjust} data-testid="stock-action-adjust"><Package className="w-4 h-4 mr-2" /> Adjust Quantity</Button>
              <Button variant="outline" className="w-full justify-start text-foreground" onClick={openEdit} data-testid="stock-action-edit">Edit Details</Button>
              <Button variant="outline" className="w-full justify-start text-rose-700 hover:text-rose-800 hover:bg-rose-50 border-rose-200 mt-4" onClick={() => setMode("delete")} data-testid="stock-action-delete">Delete Stock Item</Button>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader className="pb-3 border-b border-border">
            <CardTitle className="text-lg flex items-center gap-2"><History className="h-5 w-5 text-muted-foreground" /> Movement History</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {movements.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">No movement history for this item.</div>
            ) : (
              <Table>
                <TableHeader className="bg-muted">
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
                      <TableCell className="text-muted-foreground">{new Date(movement.createdAt).toLocaleString("en-GB", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })}</TableCell>
                      <TableCell className="capitalize font-medium text-foreground">{movement.reason}</TableCell>
                      <TableCell className="text-muted-foreground">{movement.jobId || "—"}</TableCell>
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

      <Dialog open={mode === "adjust"} onOpenChange={(o) => { if (!o) closeDialog(); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Adjust quantity</DialogTitle><DialogDescription>Set the quantity on hand for {stock.name}.</DialogDescription></DialogHeader>
          <div className="grid gap-3">
            <Label htmlFor="stock-qty">Quantity on hand</Label>
            <Input id="stock-qty" type="number" min="0" value={adjustTo} onChange={(e) => setAdjustTo(e.target.value)} />
          </div>
          <DialogFooter><Button variant="outline" onClick={closeDialog}>Cancel</Button><Button onClick={saveAdjust}>Save quantity</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={mode === "edit"} onOpenChange={(o) => { if (!o) closeDialog(); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit stock details</DialogTitle></DialogHeader>
          <div className="grid gap-3">
            <Label htmlFor="stock-name">Name</Label>
            <Input id="stock-name" value={editName} onChange={(e) => setEditName(e.target.value)} />
            <Label htmlFor="stock-sku">SKU</Label>
            <Input id="stock-sku" value={editSku} onChange={(e) => setEditSku(e.target.value)} />
            <Label htmlFor="stock-category">Category</Label>
            <Input id="stock-category" value={editCategory} onChange={(e) => setEditCategory(e.target.value)} />
            <Label htmlFor="stock-cost">Unit cost (£)</Label>
            <Input id="stock-cost" type="number" min="0" step="0.01" value={editCost} onChange={(e) => setEditCost(e.target.value)} />
            <Label htmlFor="stock-reorder">Reorder level</Label>
            <Input id="stock-reorder" type="number" min="0" value={editReorder} onChange={(e) => setEditReorder(e.target.value)} />
          </div>
          <DialogFooter><Button variant="outline" onClick={closeDialog}>Cancel</Button><Button onClick={saveEdit}>Save changes</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={mode === "delete"}
        title="Delete this stock item?"
        description={`${stock.name} will be removed. This is recorded in the audit log and cannot be undone here.`}
        confirmLabel="Delete stock item"
        destructive
        onCancel={closeDialog}
        onConfirm={confirmDelete}
      />
    </Layout>
  );
}