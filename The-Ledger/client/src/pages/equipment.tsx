import { Layout } from "@/components/layout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Filter, Package, Plus } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useStore } from "@/lib/mockData";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

import { OverviewCards } from "@/components/stock-assets/OverviewCards";
import { StockTable } from "@/components/stock-assets/StockTable";
import { AssetTable } from "@/components/stock-assets/AssetTable";
import { LocationCards } from "@/components/stock-assets/LocationCards";
import { AlertsPanel } from "@/components/stock-assets/AlertsPanel";

export default function StockAssetsPage() {
  const [activeTab, setActiveTab] = useState("overview");
  const { stockItems, assets, locations, addStockItem, addAsset, deleteAsset } = useStore();
  const { toast } = useToast();

  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [locationFilter, setLocationFilter] = useState("all-loc");

  // Add Stock Modal State
  const [isAddStockOpen, setIsAddStockOpen] = useState(false);
  const [newStock, setNewStock] = useState({ name: "", sku: "", category: "", quantity: 1, unitCost: 0, reorderLevel: 10, locationId: "" });

  // Add Asset Modal State
  const [isAddAssetOpen, setIsAddAssetOpen] = useState(false);
  const [newAsset, setNewAsset] = useState({ name: "", serialNumber: "", type: "", status: "Active", locationId: "", purchaseDate: "", lastServiceDate: "", nextServiceDate: "" });

  const handleAddStock = () => {
    if (!newStock.name || !newStock.sku || !newStock.locationId) {
      toast({ title: "Validation Error", description: "Name, SKU, and Location are required.", variant: "destructive" });
      return;
    }
    addStockItem(newStock);
    toast({ title: "Stock Added", description: "Stock item added/updated successfully." });
    setIsAddStockOpen(false);
    setNewStock({ name: "", sku: "", category: "", quantity: 1, unitCost: 0, reorderLevel: 10, locationId: "" });
  };

  const handleAddAsset = () => {
    if (!newAsset.name || !newAsset.locationId || !newAsset.type) {
      toast({ title: "Validation Error", description: "Name, Type, and Location are required.", variant: "destructive" });
      return;
    }

    // Check for duplicate asset (by serial number or name+location)
    const exists = assets.some(a => 
      (newAsset.serialNumber && a.serialNumber === newAsset.serialNumber) || 
      (!newAsset.serialNumber && a.name === newAsset.name && a.locationId === newAsset.locationId)
    );

    if (exists) {
      if (!window.confirm("This asset already exists (matching Serial Number or Name/Location). Are you sure you want to add another?")) {
        return;
      }
    }

    addAsset(newAsset as any);
    toast({ title: "Asset Added", description: "Asset added successfully." });
    setIsAddAssetOpen(false);
    setNewAsset({ name: "", serialNumber: "", type: "", status: "Active", locationId: "", purchaseDate: "", lastServiceDate: "", nextServiceDate: "" });
  };

  const handleDeleteAsset = (id: string) => {
    if (window.confirm("Are you sure you want to remove this asset? This action cannot be undone.")) {
      deleteAsset(id);
      toast({ title: "Asset Removed", description: "Asset has been deleted." });
    }
  };

  // Processing Data for Display
  const filteredStock = stockItems.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(search.toLowerCase()) || item.sku.toLowerCase().includes(search.toLowerCase());
    const matchesLoc = locationFilter === "all-loc" || item.locationId === locationFilter;
    return matchesSearch && matchesLoc;
  });

  const filteredAssets = assets.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(search.toLowerCase()) || (item.serialNumber || "").toLowerCase().includes(search.toLowerCase());
    const matchesLoc = locationFilter === "all-loc" || item.locationId === locationFilter;
    return matchesSearch && matchesLoc;
  });

  const processedLocations = locations.map(loc => {
    const locStock = stockItems.filter(s => s.locationId === loc.id);
    const locAssets = assets.filter(a => a.locationId === loc.id);
    return {
      ...loc,
      stockValue: locStock.reduce((acc, s) => acc + (s.quantity * s.unitCost), 0),
      stockCount: locStock.length,
      assetCount: locAssets.length,
      alerts: locStock.filter(s => s.quantity <= s.reorderLevel).length + locAssets.filter(a => a.status === "Needs Service" || a.status === "Broken").length
    };
  });

  const lowStock = stockItems.filter(item => item.quantity <= item.reorderLevel);
  const serviceAlerts = assets.filter(item => item.status === 'Needs Service' || item.status === 'Broken' || item.status === 'Retired' || (item.nextServiceDate && new Date(item.nextServiceDate).getTime() < new Date().getTime() + (30 * 24 * 60 * 60 * 1000)));

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-3xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
              <Package className="h-8 w-8 text-slate-700" /> Stock & Assets
            </h2>
            <p className="text-slate-500 mt-1">Manage consumable stock and long-term assets across locations.</p>
          </div>
          <div className="flex gap-2">
            <Dialog open={isAddStockOpen} onOpenChange={setIsAddStockOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" className="border-indigo-200 text-indigo-700 hover:bg-indigo-50"><Plus className="w-4 h-4 mr-2" /> Add Stock</Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                  <DialogTitle>Add / Update Stock</DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label className="text-right">Name</Label>
                    <Input className="col-span-3" value={newStock.name} onChange={e => setNewStock({...newStock, name: e.target.value})} placeholder="e.g. Copper Elbow" />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label className="text-right">SKU</Label>
                    <Input className="col-span-3" value={newStock.sku} onChange={e => setNewStock({...newStock, sku: e.target.value})} placeholder="e.g. SKU-123" />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label className="text-right">Category</Label>
                    <Input className="col-span-3" value={newStock.category} onChange={e => setNewStock({...newStock, category: e.target.value})} />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label className="text-right">Quantity</Label>
                    <Input type="number" className="col-span-3" value={newStock.quantity} onChange={e => setNewStock({...newStock, quantity: parseInt(e.target.value) || 0})} />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label className="text-right">Unit Cost</Label>
                    <Input type="number" step="0.01" className="col-span-3" value={newStock.unitCost} onChange={e => setNewStock({...newStock, unitCost: parseFloat(e.target.value) || 0})} />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label className="text-right">Reorder Level</Label>
                    <Input type="number" className="col-span-3" value={newStock.reorderLevel} onChange={e => setNewStock({...newStock, reorderLevel: parseInt(e.target.value) || 0})} />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label className="text-right">Location</Label>
                    <Select value={newStock.locationId} onValueChange={v => setNewStock({...newStock, locationId: v})}>
                      <SelectTrigger className="col-span-3"><SelectValue placeholder="Select Location" /></SelectTrigger>
                      <SelectContent>
                        {locations.map(l => <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <DialogFooter>
                  <Button onClick={handleAddStock}>Save Stock</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            <Dialog open={isAddAssetOpen} onOpenChange={setIsAddAssetOpen}>
              <DialogTrigger asChild>
                <Button className="bg-slate-900"><Plus className="w-4 h-4 mr-2" /> Add Asset</Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                  <DialogTitle>Add Asset</DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label className="text-right">Name</Label>
                    <Input className="col-span-3" value={newAsset.name} onChange={e => setNewAsset({...newAsset, name: e.target.value})} placeholder="e.g. Scissor Lift 19ft" />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label className="text-right">Serial No.</Label>
                    <Input className="col-span-3" value={newAsset.serialNumber} onChange={e => setNewAsset({...newAsset, serialNumber: e.target.value})} placeholder="Optional" />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label className="text-right">Type</Label>
                    <Select value={newAsset.type} onValueChange={v => setNewAsset({...newAsset, type: v})}>
                      <SelectTrigger className="col-span-3"><SelectValue placeholder="Select Type" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Vehicle">Vehicle</SelectItem>
                        <SelectItem value="Heavy Equipment">Heavy Equipment</SelectItem>
                        <SelectItem value="Power Tool">Power Tool</SelectItem>
                        <SelectItem value="Support">Support / Access</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label className="text-right">Location</Label>
                    <Select value={newAsset.locationId} onValueChange={v => setNewAsset({...newAsset, locationId: v})}>
                      <SelectTrigger className="col-span-3"><SelectValue placeholder="Select Location" /></SelectTrigger>
                      <SelectContent>
                        {locations.map(l => <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label className="text-right">Purchase Date</Label>
                    <Input type="date" className="col-span-3" value={newAsset.purchaseDate} onChange={e => setNewAsset({...newAsset, purchaseDate: e.target.value})} />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label className="text-right">Next Service</Label>
                    <Input type="date" className="col-span-3" value={newAsset.nextServiceDate} onChange={e => setNewAsset({...newAsset, nextServiceDate: e.target.value})} />
                  </div>
                </div>
                <DialogFooter>
                  <Button onClick={handleAddAsset}>Save Asset</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input placeholder="Search inventory or assets..." className="pl-9 bg-white border-slate-200" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <div className="flex gap-2">
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-[140px] bg-white border-slate-200">
                <Filter className="h-4 w-4 mr-2 text-slate-400" />
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="stock">Stock Only</SelectItem>
                <SelectItem value="assets">Assets Only</SelectItem>
              </SelectContent>
            </Select>
            <Select value={locationFilter} onValueChange={setLocationFilter}>
              <SelectTrigger className="w-[160px] bg-white border-slate-200">
                <SelectValue placeholder="Location" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all-loc">All Locations</SelectItem>
                {locations.map(l => <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="bg-slate-100 border border-slate-200 p-1">
            <TabsTrigger value="overview" className="data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm">Overview</TabsTrigger>
            <TabsTrigger value="stock" className="data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm">Stock</TabsTrigger>
            <TabsTrigger value="assets" className="data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm">Assets</TabsTrigger>
            <TabsTrigger value="locations" className="data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm">Locations</TabsTrigger>
            <TabsTrigger value="alerts" className="data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm">
              Alerts
              {(lowStock.length > 0 || serviceAlerts.length > 0) && (
                <span className="ml-2 h-4 w-4 rounded-full bg-rose-500 text-[10px] font-bold text-white flex items-center justify-center">
                  {lowStock.length + serviceAlerts.length}
                </span>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="mt-0 outline-none">
            <OverviewCards />
          </TabsContent>

          <TabsContent value="stock" className="mt-0 outline-none space-y-4">
            <StockTable data={filteredStock.map(s => ({ ...s, location: locations.find(l => l.id === s.locationId)?.name || "Unknown" }))} />
          </TabsContent>

          <TabsContent value="assets" className="mt-0 outline-none space-y-4">
            {/* The AssetTable previously didn't have onDelete, let's just pass it in even if we have to update AssetTable later */}
            <AssetTable data={filteredAssets.map(a => ({ ...a, location: locations.find(l => l.id === a.locationId)?.name || "Unknown" }))} onDelete={handleDeleteAsset} />
          </TabsContent>

          <TabsContent value="locations" className="mt-0 outline-none">
            <LocationCards locations={processedLocations} />
          </TabsContent>

          <TabsContent value="alerts" className="mt-0 outline-none">
            <AlertsPanel 
              lowStock={lowStock.map(s => ({...s, location: locations.find(l=>l.id===s.locationId)?.name}))} 
              serviceAlerts={serviceAlerts} 
            />
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}