import { WorkerMobileLayout } from "@/components/WorkerMobileLayout";
import { useStore, useAuth } from "@/lib/mockData";
import { useLocation, useRoute } from "wouter";
import { ArrowLeft, Save, Plus, Trash2, Search, Settings, Wrench, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useOfflineQueueStore } from "@/lib/offlineQueueStore";
import { useEffect, useState } from "react";
import type { UploadPayload } from "@/lib/mockData";

export default function WorkerReportPage() {
  const [, params] = useRoute("/worker/jobs/:id/report");
  const [, setLocation] = useLocation();
  const { jobs, stockItems, assets, addReviewItem } = useStore();
  const {isOffline, addToQueue, queue, setOfflineMode, syncQueue, updateQueueItem, clearSyncedItems, retryUpload} = useOfflineQueueStore();
  const { user } = useAuth();
  const { toast } = useToast();

  const jobId = params?.id;
  const job = jobs.find(j => j.id === jobId);

  const [notes, setNotes] = useState("");
  const [stockSearch, setStockSearch] = useState("");
  const [assetSearch, setAssetSearch] = useState("");
  const [uploads, setUploads] = useState<UploadPayload[]>([]);
  const [hydrated, setHydrated] = useState(false);

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

  const pendingQueueCount = queue.filter(
    item =>
      item.syncStatus === "pending" ||
      item.syncStatus === "failed"
  ).length;
    // ======================================================
  // AUTO SYNC WHEN CONNECTION RETURNS
  // ======================================================

  useEffect(() => {
    if (!isOffline) {
      syncQueue();
    }
  }, [isOffline, syncQueue]);

  useEffect(() => {
    setHydrated(true);
  }, []);

  // ======================================================
  // RETRY FAILED SYNC
  // ======================================================

  const retryFailedItem = (id: string) => {
    updateQueueItem(id, {
      syncStatus: "pending",
      errorMessage: undefined,
    });

    syncQueue();
  };
  // ======================================================
  // ADD MOCK UPLOAD
  // ======================================================

  const addMockUpload = (
    type: UploadPayload["type"]
  ) => {
    const timestamp = new Date().toISOString();

    const formattedType =
      type.charAt(0).toUpperCase() +
      type.slice(1).replace("-", " ");

    const newUpload: UploadPayload = {
      id: crypto.randomUUID(),

      type,

      fileName: `${formattedType} ${uploads.length + 1}.jpg`,

      uploadedAt: timestamp,

      requiresReview:
        type === "qa-photo" ||
        type === "safety-report",

      url: "mock-upload-url",
    };

    setUploads(prev => [...prev, newUpload]);

    toast({
      title: "Upload Added",
      description: `${formattedType} attached to report.`,
    });
  };

  const handleSubmit = () => {
    // ======================================================
    // OPERATIONAL PAYLOADS
    // No financial mutation occurs here
    // ======================================================

    const materialsUsed = stockUsed.map(item => {
      const stock = stockItems.find(s => s.id === item.stockItemId);

      return {
        stockItemId: item.stockItemId,
        stockItemName: stock?.name || "Unknown Item",

        quantity: item.quantity,

        unit: stock?.unit,

        // informational only until approval
        unitCost: stock?.costPrice,
        markupPrice: stock?.sellPrice,
      };
    });

    const equipmentUsage = assetsUsed.map(item => {
      const asset = assets.find(a => a.id === item.assetId);

      return {
        assetId: item.assetId,
        assetName: asset?.name || "Unknown Asset",
      };
    });

    const laborEntries = [
      {
        workerId: user?.id || "",
        workerName: user?.name || "Unknown Worker",

        hours: 0,
      },
    ];

    // ======================================================
    // REVIEW ITEM
    // ======================================================

    const reviewItem = {
      id: crypto.randomUUID(),

      type: "worker-report",

      title: "Daily Progress Report",

      status: "pending",

      workerId: user?.id || "",

      submittedBy: user?.name || "Unknown Worker",

      submittedAt: new Date().toISOString(),

      jobId: job.id,

      notes,

      materialsUsed,

      laborEntries,

      equipmentUsage,

      expenses: [],

      uploads: uploads.map((upload) => ({
        ...upload,

        syncStatus: isOffline
          ? "pending"
          : "uploaded",

        uploadProgress: isOffline
          ? 0
          : 100,

        retryCount: 0,

        uploadId:
          upload.uploadId ||
          crypto.randomUUID(),

        lastAttemptAt:
          new Date().toISOString(),
      })),
    };

    // ======================================================
    // OFFLINE FLOW
    // ======================================================

    if (isOffline) {

      console.log("ADDING TO QUEUE");

      addToQueue({
        id: crypto.randomUUID(),

        type: "worker-report",

        payload: reviewItem,

        createdAt: new Date().toISOString(),

        syncStatus: "pending",

        retryCount: 0,
      });

      toast({
        title: "Saved Offline",
        description:
          "Your report was saved locally and will sync once connection is restored.",
      });

      setLocation(`/worker/jobs/${job.id}`);

      return;
    }

    // ======================================================
    // ONLINE FLOW
    // ======================================================

    addReviewItem(reviewItem);

    toast({
      title: "Report Submitted",
      description: "Your report and usage logs have been submitted for review.",
    });

    setLocation(`/worker/jobs/${job.id}`);

  };

return (
  <WorkerMobileLayout title="Report">

    {isOffline && (
      <div className="bg-amber-500 text-black px-4 py-3 text-sm font-medium">
        Offline Mode Active — Reports will sync once connection is restored.
      </div>
    )}

    {/* ====================================================== */}
    {/* HEADER */}
    {/* ====================================================== */}

    <header className="bg-slate-900 text-white sticky top-0 z-20 px-4 py-4 flex items-center justify-between shadow-md">

      {/* LEFT SIDE */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => setLocation(`/worker/jobs/${job.id}`)}
          className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center active:scale-95 transition-transform"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>

        <div>
          <h1 className="font-bold text-lg leading-tight">
            Submit Report
          </h1>

          <p className="text-slate-400 text-xs truncate max-w-[200px]">
            {job.title}
          </p>
        </div>
      </div>

      {/* RIGHT SIDE */}
      <div className="flex items-center gap-2">

        <button
          type="button"
          onClick={() => setOfflineMode(!isOffline)}
          className={`text-xs px-3 py-2 rounded-lg font-medium transition-colors ${
            isOffline
              ? "bg-red-100 text-red-700"
              : "bg-green-100 text-green-700"
          }`}
        >
          {isOffline
            ? "Simulate Reconnection"
            : "Simulate Offline Mode"}
        </button>

        <Button
          onClick={handleSubmit}
          className="bg-emerald-500 hover:bg-emerald-600 text-white rounded-full px-4 h-10 shadow-lg shadow-emerald-500/20"
        >
          <Save className="w-4 h-4 mr-2" />
          Save
        </Button>

      </div>

    </header>

    {/* ====================================================== */}
    {/* MAIN CONTENT */}
    {/* ====================================================== */}

    <div className="p-4 space-y-8 pb-24">

      {/* ====================================================== */}
      {/* OFFLINE QUEUE */}
      {/* ====================================================== */}

      {hydrated && queue.length > 0 && (
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">

          <div className="mb-4 flex items-center justify-between">

            <div>
              <p className="font-semibold text-slate-900">
                Offline Queue
              </p>

              <p className="text-sm text-slate-500">
                {queue.length} queued submission
                {queue.length !== 1 ? "s" : ""}
              </p>
            </div>

            <button
              type="button"
              onClick={clearSyncedItems}
              className="text-xs font-medium text-slate-600 hover:text-slate-900"
            >
              Clear Synced
            </button>

          </div>
          <div className="space-y-3">

            {queue.map(item => (
              <div
                key={item.id}
                className="rounded-lg border border-slate-200 p-3"
              >

                <div className="flex items-start justify-between">

                  <div>
                    <p className="font-medium text-slate-900">
                      Worker Report
                    </p>

                    <p className="text-xs text-slate-500">
                      {new Date(
                        item.createdAt
                      ).toLocaleString()}
                    </p>
                  </div>

                  <div>

                    {item.syncStatus === "pending" && (
                      <span className="rounded-full bg-amber-100 px-2 py-1 text-xs font-medium text-amber-800">
                        Pending
                      </span>
                    )}

                    {item.syncStatus === "syncing" && (
                      <span className="rounded-full bg-blue-100 px-2 py-1 text-xs font-medium text-blue-800">
                        Syncing
                      </span>
                    )}

                    {item.syncStatus === "synced" && (
                      <span className="rounded-full bg-green-100 px-2 py-1 text-xs font-medium text-green-800">
                        Synced
                      </span>
                    )}

                    {item.syncStatus === "failed" && (
                      <span className="rounded-full bg-red-100 px-2 py-1 text-xs font-medium text-red-800">
                        Failed
                      </span>
                    )}

                  </div>

                </div>

                {item.errorMessage && (
                  <div className="mt-3 rounded-lg bg-red-50 p-2">
                    <p className="text-xs text-red-700">
                      {item.errorMessage}
                    </p>
                  </div>
                )}

                {item.syncStatus === "failed" && (
                  <button
                    type="button"
                    onClick={() =>
                      retryFailedItem(item.id)
                    }
                    className="mt-3 text-xs font-medium text-red-600 hover:text-red-800"
                  >
                    Retry Sync
                  </button>
                )}

              </div>
            ))}

          </div>

        </div>
      )}
      {/* ====================================================== */}
      {/* UPLOADS & QA */}
      {/* ====================================================== */}

      <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">

        <div>
          <h3 className="text-lg font-semibold text-slate-900">
            Uploads & QA
          </h3>

          <p className="text-sm text-slate-500">
            Attach receipts, QA photos, safety reports,
            or before/after documentation.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3">

          <button
            type="button"
            onClick={() => addMockUpload("qa-photo")}
            className="rounded-xl border border-slate-200 p-3 text-left hover:border-slate-400 transition-colors"
          >
            <p className="font-medium text-slate-900">
              QA Photo
            </p>

            <p className="text-xs text-slate-500">
              Completion verification
            </p>
          </button>

          <button
            type="button"
            onClick={() => addMockUpload("receipt")}
            className="rounded-xl border border-slate-200 p-3 text-left hover:border-slate-400 transition-colors"
          >
            <p className="font-medium text-slate-900">
              Receipt
            </p>

            <p className="text-xs text-slate-500">
              Expense attachment
            </p>
          </button>

          <button
            type="button"
            onClick={() => addMockUpload("before-photo")}
            className="rounded-xl border border-slate-200 p-3 text-left hover:border-slate-400 transition-colors"
          >
            <p className="font-medium text-slate-900">
              Before Photo
            </p>

            <p className="text-xs text-slate-500">
              Pre-work documentation
            </p>
          </button>

          <button
            type="button"
            onClick={() => addMockUpload("after-photo")}
            className="rounded-xl border border-slate-200 p-3 text-left hover:border-slate-400 transition-colors"
          >
            <p className="font-medium text-slate-900">
              After Photo
            </p>

            <p className="text-xs text-slate-500">
              Final result documentation
            </p>
          </button>

          <button
            type="button"
            onClick={() => addMockUpload("safety-report")}
            className="rounded-xl border border-red-200 p-3 text-left hover:border-red-400 transition-colors"
          >
            <p className="font-medium text-red-700">
              Safety Report
            </p>

            <p className="text-xs text-red-500">
              Incident or hazard reporting
            </p>
          </button>

          <button
            type="button"
            onClick={() => addMockUpload("general")}
            className="rounded-xl border border-slate-200 p-3 text-left hover:border-slate-400 transition-colors"
          >
            <p className="font-medium text-slate-900">
              General Upload
            </p>

            <p className="text-xs text-slate-500">
              Other documentation
            </p>
          </button>

        </div>

      </div>

      {/* ====================================================== */}
      {/* ATTACHED UPLOADS */}
      {/* ====================================================== */}

      {uploads.length > 0 && (
        <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">

          <div className="flex items-center justify-between">

            <h3 className="text-lg font-semibold text-slate-900">
              Attached Uploads
            </h3>

            <span className="text-sm text-slate-500">
              {uploads.length} file
              {uploads.length !== 1 ? "s" : ""}
            </span>

          </div>

          <div className="space-y-2">

            {uploads.map(upload => (
              <div
                key={upload.id}
                className="flex items-center justify-between rounded-xl border border-slate-200 p-3"
              >

                <div>
                  <p className="font-medium text-slate-900">
                    {upload.fileName}
                  </p>

                  <p className="text-xs text-slate-500">
                    {upload.type} •{" "}
                    {new Date(
                      upload.uploadedAt
                    ).toLocaleString()}
                  </p>
                </div>

                <div className="flex items-center gap-2">

                  {upload.requiresReview && (
                    <span className="rounded-full bg-amber-100 px-2 py-1 text-xs font-medium text-amber-800">
                      Review Required
                    </span>
                  )}

                </div>

              </div>
            ))}

          </div>

        </div>
      )}
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