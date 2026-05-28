import { WorkerMobileLayout } from "@/components/WorkerMobileLayout";
import { useStore, useAuth } from "@/lib/mockData";
import { useLocation, useRoute } from "wouter";
import { ArrowLeft, Save, Plus, Trash2, Search, Settings, Wrench, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function WorkerReportPage() {
  const [, params] = useRoute("/worker/jobs/:id/report");
  const [, setLocation] = useLocation();
  const { jobs, stockItems, assets, deductStockQuantity, addReviewItem } = useStore();
  const { user } = useAuth();
  const { toast } = useToast();

  const jobId = params?.id;
  const job = jobs.find(j => j.id === jobId);

  const [notes, setNotes] = useState("");
  const [stockSearch, setStockSearch] = useState("");
  const [assetSearch, setAssetSearch] = useState("");
  
  // Local state for stock used
  const [stockUsed, setStockUsed] = useState<{
    id: string; // temp id
    stockItemId: string;
    quantity: number;
  }[]>([]);

  // Local state for assets used
  const [assetsUsed, setAssetsUsed] = useState<{
    id: string; // temp id
    assetId: string;
  }[]>([]);

  if (!job) {
    return (
      <WorkerMobileLayout title="Report">
        <div className="p-4">
          <p>Job not found</p>
          <Button onClick={() => setLocation("/worker")}>Back to Dashboard</Button>
        </div>
      </WorkerMobileLayout>
    );
  }

  // Filter stock
  const filteredStock = stockItems.filter(s => 
    s.companyId === job.companyId && 
    (s.name.toLowerCase().includes(stockSearch.toLowerCase()) || s.sku.toLowerCase().includes(stockSearch.toLowerCase())) &&
    !stockUsed.some(u => u.stockItemId === s.id) // Don't show already added
  );

  // Filter assets
  const filteredAssets = assets.filter(a => 
    a.companyId === job.companyId && 
    a.status === "Active" &&
    (a.name.toLowerCase().includes(assetSearch.toLowerCase()) || (a.serialNumber && a.serialNumber.toLowerCase().includes(assetSearch.toLowerCase()))) &&
    !assetsUsed.some(u => u.assetId === a.id) // Don't show already added
  );

  const handleAddStock = (stockItemId: string) => {
    setStockUsed([
      ...stockUsed,
      {
        id: Math.random().toString(36).substr(2, 9),
        stockItemId,
        quantity: 1,
      }
    ]);
    setStockSearch("");
  };

  const handleAddAsset = (assetId: string) => {
    setAssetsUsed([
      ...assetsUsed,
      {
        id: Math.random().toString(36).substr(2, 9),
        assetId,
      }
    ]);
    setAssetSearch("");
  };

  const handleRemoveStock = (id: string) => {
    setStockUsed(stockUsed.filter(s => s.id !== id));
  };

  const handleRemoveAsset = (id: string) => {
    setAssetsUsed(assetsUsed.filter(a => a.id !== id));
  };

  const handleUpdateStockQuantity = (id: string, qty: number, max: number) => {
    // Prevent exceeding available stock or going negative
    let validQty = Math.max(1, qty);
    if (validQty > max) validQty = max;

    setStockUsed(stockUsed.map(s => 
      s.id === id ? { ...s, quantity: validQty } : s
    ));
  };

  const handleSubmit = () => {
    // Process stock deduction in mock store
    stockUsed.forEach(item => {
      deductStockQuantity(item.stockItemId, item.quantity, job.id);
    });

    // Save report to Review Center
    const items = stockUsed.map(u => {
      const stock = stockItems.find(s => s.id === u.stockItemId);
      return { name: stock?.name || "Unknown Item", quantity: u.quantity };
    });

    addReviewItem({
      type: "report",
      title: "Daily Progress Report",
      submittedBy: user?.name || "Unknown Worker",
      submittedAt: new Date().toISOString(),
      status: "pending",
      content: notes,
      items,
      jobId: job.id,
    });

    toast({
      title: "Report Submitted",
      description: "Your report and usage logs have been submitted for review.",
    });
    setLocation(`/worker/jobs/${job.id}`);
  };

  return (
    <WorkerMobileLayout title="Report">
      <header className="bg-slate-900 text-white sticky top-0 z-20 px-4 py-4 flex items-center justify-between shadow-md">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setLocation(`/worker/jobs/${job.id}`)}
            className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center active:scale-95 transition-transform"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="font-bold text-lg leading-tight">Submit Report</h1>
            <p className="text-slate-400 text-xs truncate max-w-[200px]">{job.title}</p>
          </div>
        </div>
        <Button 
          onClick={handleSubmit} 
          className="bg-emerald-500 hover:bg-emerald-600 text-white rounded-full px-4 h-10 shadow-lg shadow-emerald-500/20"
        >
          <Save className="w-4 h-4 mr-2" />
          Save
        </Button>
      </header>

      <div className="p-4 space-y-8 pb-24">
        <section className="space-y-3">
          <Label className="text-slate-700 font-semibold text-base">Work Summary</Label>
          <Textarea 
            placeholder="Describe the work completed today..."
            className="min-h-[120px] rounded-xl bg-white border-slate-200 resize-none shadow-sm"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </section>

        {/* Consumable Stock */}
        <section className="space-y-4">
          <div className="flex items-center gap-2 text-indigo-700 pb-2 border-b border-indigo-100">
            <Package className="w-5 h-5" />
            <h3 className="font-bold text-lg">Consumables / Materials</h3>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-3 h-5 w-5 text-slate-400" />
            <Input 
              placeholder="Search materials to log..." 
              className="pl-10 rounded-xl bg-white shadow-sm h-12 border-indigo-100 focus-visible:ring-indigo-500"
              value={stockSearch}
              onChange={(e) => setStockSearch(e.target.value)}
            />
          </div>

          {stockSearch && (
            <Card className="absolute z-10 w-[calc(100%-2rem)] mt-1 shadow-xl border-slate-200 max-h-60 overflow-y-auto">
              <CardContent className="p-2 space-y-1">
                {filteredStock.length > 0 ? (
                  filteredStock.map(item => (
                    <div 
                      key={item.id}
                      className="flex items-center justify-between p-3 rounded-lg hover:bg-slate-50 cursor-pointer border border-transparent hover:border-slate-100"
                      onClick={() => handleAddStock(item.id)}
                    >
                      <div>
                        <p className="font-semibold text-sm">{item.name}</p>
                        <p className="text-xs text-slate-500">{item.sku} • {item.quantity} available</p>
                      </div>
                      <Button size="icon" variant="ghost" className="h-8 w-8 rounded-full text-indigo-600 bg-indigo-50 hover:bg-indigo-100 hover:text-indigo-700">
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  ))
                ) : (
                  <div className="p-4 text-center text-slate-500 text-sm">No items found</div>
                )}
              </CardContent>
            </Card>
          )}

          <div className="space-y-3 mt-4">
            {stockUsed.length === 0 ? (
              <p className="text-sm text-slate-500 italic">No materials added.</p>
            ) : (
              stockUsed.map((item) => {
                const stock = stockItems.find(s => s.id === item.stockItemId);
                if (!stock) return null;

                return (
                  <div key={item.id} className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm relative overflow-hidden flex flex-col gap-3">
                    <button 
                      onClick={() => handleRemoveStock(item.id)}
                      className="absolute top-2 right-2 text-slate-400 hover:text-red-500 p-2"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                    
                    <div className="pr-8">
                      <p className="font-bold text-slate-800">{stock.name}</p>
                      <p className="text-xs text-slate-500">{stock.sku} • <span className={stock.quantity < item.quantity ? "text-red-500 font-medium" : ""}>{stock.quantity} available</span></p>
                    </div>

                    <div className="flex items-center gap-3">
                      <Label className="text-sm font-medium text-slate-700">Qty Used:</Label>
                      <Input 
                        type="number" 
                        min="1" 
                        max={stock.quantity}
                        value={item.quantity} 
                        onChange={(e) => handleUpdateStockQuantity(item.id, parseInt(e.target.value) || 1, stock.quantity)}
                        className="h-9 w-24 rounded-lg text-center font-bold"
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </section>

        {/* Assets / Equipment */}
        <section className="space-y-4">
          <div className="flex items-center gap-2 text-amber-700 pb-2 border-b border-amber-100">
            <Wrench className="w-5 h-5" />
            <h3 className="font-bold text-lg">Assets / Equipment Used</h3>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-3 h-5 w-5 text-slate-400" />
            <Input 
              placeholder="Search assigned assets..." 
              className="pl-10 rounded-xl bg-white shadow-sm h-12 border-amber-100 focus-visible:ring-amber-500"
              value={assetSearch}
              onChange={(e) => setAssetSearch(e.target.value)}
            />
          </div>

          {assetSearch && (
            <Card className="absolute z-10 w-[calc(100%-2rem)] mt-1 shadow-xl border-slate-200 max-h-60 overflow-y-auto">
              <CardContent className="p-2 space-y-1">
                {filteredAssets.length > 0 ? (
                  filteredAssets.map(asset => (
                    <div 
                      key={asset.id}
                      className="flex items-center justify-between p-3 rounded-lg hover:bg-slate-50 cursor-pointer border border-transparent hover:border-slate-100"
                      onClick={() => handleAddAsset(asset.id)}
                    >
                      <div>
                        <p className="font-semibold text-sm">{asset.name}</p>
                        <p className="text-xs text-slate-500">{asset.type} {asset.serialNumber ? `• ${asset.serialNumber}` : ''}</p>
                      </div>
                      <Button size="icon" variant="ghost" className="h-8 w-8 rounded-full text-amber-600 bg-amber-50 hover:bg-amber-100 hover:text-amber-700">
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  ))
                ) : (
                  <div className="p-4 text-center text-slate-500 text-sm">No assets found</div>
                )}
              </CardContent>
            </Card>
          )}

          <div className="space-y-3 mt-4">
            {assetsUsed.length === 0 ? (
              <p className="text-sm text-slate-500 italic">No assets selected.</p>
            ) : (
              assetsUsed.map((item) => {
                const asset = assets.find(a => a.id === item.assetId);
                if (!asset) return null;

                return (
                  <div key={item.id} className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm relative overflow-hidden flex justify-between items-center">
                    <div>
                      <p className="font-bold text-slate-800">{asset.name}</p>
                      <div className="flex gap-2 mt-1">
                        <Badge variant="outline" className="text-xs font-normal bg-slate-50">{asset.type}</Badge>
                        {asset.serialNumber && <Badge variant="secondary" className="text-xs font-mono">{asset.serialNumber}</Badge>}
                      </div>
                    </div>
                    <button 
                      onClick={() => handleRemoveAsset(item.id)}
                      className="text-slate-400 hover:text-red-500 p-2"
                    >
                      <Trash2 className="h-5 w-5" />
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </section>

      </div>
    </WorkerMobileLayout>
  );
}