import { WorkerMobileLayout } from "@/components/WorkerMobileLayout";
import { useStore, useAuth } from "@/lib/mockData";
import { useLocation, useRoute } from "wouter";
import { ArrowLeft, Save, Plus, Trash2, Search, Settings, Wrench, Package, Clock, Receipt } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useOfflineQueueStore } from "@/lib/offlineQueueStore";
import { useShiftStore } from "@/lib/shiftStore";
import { useEffect, useState } from "react";
import type { UploadPayload } from "@/lib/mockData";

const EXPENSE_CATEGORIES = ["Travel", "Materials", "Parking", "Subsistence", "Tools", "Other"];

export default function WorkerReportPage() {
  const [, params] = useRoute("/worker/jobs/:id/report");
  const [, setLocation] = useLocation();
  const { jobs, stockItems, assets, addReviewItem } = useStore();
  const {isOffline, addToQueue, queue, syncQueue, updateQueueItem, clearSyncedItems, retryUpload} = useOfflineQueueStore();
  const { user } = useAuth();
  const { toast } = useToast();
  const { activeShift, elapsedTime } = useShiftStore();

  const jobId = params?.id;
  const job = jobs.find(j => j.id === jobId);

  // Pre-fill timesheet hours from the live shift timer when the report is
  // opened for the job the worker is currently clocked into. Editable below.
  const shiftSecondsForJob = activeShift?.jobId === jobId ? elapsedTime : 0;
  const [hours, setHours] = useState<number>(
    () => Math.round((shiftSecondsForJob / 3600) * 100) / 100
  );

  const [notes, setNotes] = useState("");
  const [stockSearch, setStockSearch] = useState("");
  const [assetSearch, setAssetSearch] = useState("");
  const [uploads, setUploads] = useState<UploadPayload[]>([]);
  const [hydrated, setHydrated] = useState(false);

  // Expense rows — fed into the review item's expenses[] payload (pending,
  // no financial mutation until approved in the Review Centre).
  const [expenses, setExpenses] = useState<{
    id: string;
    category: string;
    amount: number;
    notes: string;
  }[]>([]);

  const addExpense = () =>
    setExpenses(prev => [
      ...prev,
      { id: crypto.randomUUID(), category: EXPENSE_CATEGORIES[0], amount: 0, notes: "" },
    ]);

  const updateExpense = (id: string, patch: Partial<{ category: string; amount: number; notes: string }>) =>
    setExpenses(prev => prev.map(e => (e.id === id ? { ...e, ...patch } : e)));

  const removeExpense = (id: string) =>
    setExpenses(prev => prev.filter(e => e.id !== id));

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

        // Real worked hours from the shift timer (editable above) — no longer
        // hardcoded to zero. Carries shift bounds when a shift was active.
        hours: Number.isFinite(hours) ? hours : 0,
        shiftStart: activeShift?.jobId === jobId ? activeShift.lastStartedAt : undefined,
        shiftEnd: activeShift?.jobId === jobId ? new Date().toISOString() : undefined,
      },
    ];

    const expensePayloads = expenses
      .filter(e => e.amount > 0 || e.notes.trim())
      .map(e => ({
        id: e.id,
        category: e.category,
        amount: Number(e.amount) || 0,
        notes: e.notes.trim() || undefined,
      }));

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

      expenses: expensePayloads,

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

    console.log('SUBMIT REVIEW ITEM', reviewItem);
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
          aria-label="Back to job"
          className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center active:scale-95 transition-transform"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>

        <div>
          <h1 className="font-bold text-lg leading-tight">
            Submit Report
          </h1>

          <p className="text-muted-foreground text-xs truncate max-w-[200px]">
            {job.title}
          </p>
        </div>
      </div>

      {/* RIGHT SIDE */}
      <div className="flex items-center gap-2">

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
        <div className="rounded-xl border border-border bg-card p-4 shadow-sm">

          <div className="mb-4 flex items-center justify-between">

            <div>
              <p className="font-semibold text-foreground">
                Offline Queue
              </p>

              <p className="text-sm text-muted-foreground">
                {queue.length} queued submission
                {queue.length !== 1 ? "s" : ""}
              </p>
            </div>

            <button
              type="button"
              onClick={clearSyncedItems}
              className="text-xs font-medium text-muted-foreground hover:text-foreground"
            >
              Clear Synced
            </button>

          </div>
          <div className="space-y-3">

            {queue.map(item => (
              <div
                key={item.id}
                className="rounded-lg border border-border p-3"
              >

                <div className="flex items-start justify-between">

                  <div>
                    <p className="font-medium text-foreground">
                      Worker Report
                    </p>

                    <p className="text-xs text-muted-foreground">
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

      <div className="space-y-4 rounded-2xl border border-border bg-card p-4 shadow-sm">

        <div>
          <h3 className="text-lg font-semibold text-foreground">
            Uploads & QA
          </h3>

          <p className="text-sm text-muted-foreground">
            Attach receipts, QA photos, safety reports,
            or before/after documentation.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3">

          <button
            type="button"
            onClick={() => addMockUpload("qa-photo")}
            className="rounded-xl border border-border p-3 text-left hover:border-slate-400 transition-colors"
          >
            <p className="font-medium text-foreground">
              QA Photo
            </p>

            <p className="text-xs text-muted-foreground">
              Completion verification
            </p>
          </button>

          <button
            type="button"
            onClick={() => addMockUpload("receipt")}
            className="rounded-xl border border-border p-3 text-left hover:border-slate-400 transition-colors"
          >
            <p className="font-medium text-foreground">
              Receipt
            </p>

            <p className="text-xs text-muted-foreground">
              Expense attachment
            </p>
          </button>

          <button
            type="button"
            onClick={() => addMockUpload("before-photo")}
            className="rounded-xl border border-border p-3 text-left hover:border-slate-400 transition-colors"
          >
            <p className="font-medium text-foreground">
              Before Photo
            </p>

            <p className="text-xs text-muted-foreground">
              Pre-work documentation
            </p>
          </button>

          <button
            type="button"
            onClick={() => addMockUpload("after-photo")}
            className="rounded-xl border border-border p-3 text-left hover:border-slate-400 transition-colors"
          >
            <p className="font-medium text-foreground">
              After Photo
            </p>

            <p className="text-xs text-muted-foreground">
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
            className="rounded-xl border border-border p-3 text-left hover:border-slate-400 transition-colors"
          >
            <p className="font-medium text-foreground">
              General Upload
            </p>

            <p className="text-xs text-muted-foreground">
              Other documentation
            </p>
          </button>

        </div>

      </div>

      {/* ====================================================== */}
      {/* ATTACHED UPLOADS */}
      {/* ====================================================== */}

      {uploads.length > 0 && (
        <div className="space-y-3 rounded-2xl border border-border bg-card p-4 shadow-sm">

          <div className="flex items-center justify-between">

            <h3 className="text-lg font-semibold text-foreground">
              Attached Uploads
            </h3>

            <span className="text-sm text-muted-foreground">
              {uploads.length} file
              {uploads.length !== 1 ? "s" : ""}
            </span>

          </div>

          <div className="space-y-2">

            {uploads.map(upload => (
              <div
                key={upload.id}
                className="flex items-center justify-between rounded-xl border border-border p-3"
              >

                <div>
                  <p className="font-medium text-foreground">
                    {upload.fileName}
                  </p>

                  <p className="text-xs text-muted-foreground">
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
          <Label className="text-foreground font-semibold text-base">Work Summary</Label>
          <Textarea
            placeholder="Describe the work completed today..."
            className="min-h-[120px] rounded-xl bg-card border-border resize-none shadow-sm"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </section>

        {/* Hours Worked */}
        <section className="space-y-3">
          <div className="flex items-center gap-2 text-foreground pb-2 border-b border-border">
            <Clock className="w-5 h-5" />
            <h3 className="font-bold text-lg">Hours Worked</h3>
          </div>
          {shiftSecondsForJob > 0 && (
            <p className="text-xs text-emerald-600 font-medium">
              Pre-filled from your active shift ({Math.floor(shiftSecondsForJob / 3600)}h{" "}
              {Math.floor((shiftSecondsForJob % 3600) / 60)}m). Adjust if needed.
            </p>
          )}
          <div className="flex items-center gap-3">
            <Label className="text-sm font-medium text-foreground">Hours:</Label>
            <Input
              data-testid="worker-report-hours"
              type="number"
              min="0"
              step="0.25"
              value={hours}
              onChange={(e) => setHours(parseFloat(e.target.value) || 0)}
              className="h-10 w-28 rounded-lg text-center font-bold"
            />
          </div>
        </section>

        {/* Expenses */}
        <section className="space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-emerald-100">
            <div className="flex items-center gap-2 text-emerald-700">
              <Receipt className="w-5 h-5" />
              <h3 className="font-bold text-lg">Expenses</h3>
            </div>
            <Button
              type="button"
              size="sm"
              variant="outline"
              data-testid="worker-add-expense-btn"
              onClick={addExpense}
              className="rounded-lg border-emerald-200 text-emerald-700 hover:bg-emerald-50"
            >
              <Plus className="h-4 w-4 mr-1" /> Add
            </Button>
          </div>

          {expenses.length === 0 ? (
            <p className="text-sm text-muted-foreground italic">No expenses added.</p>
          ) : (
            <div className="space-y-3">
              {expenses.map((exp) => (
                <div
                  key={exp.id}
                  data-testid="worker-expense-row"
                  className="bg-card rounded-xl p-4 border border-border shadow-sm relative space-y-3"
                >
                  <button
                    onClick={() => removeExpense(exp.id)}
                    className="absolute top-2 right-2 text-muted-foreground hover:text-red-500 p-2"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>

                  <div className="grid grid-cols-2 gap-3 pr-8">
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Category</Label>
                      <select
                        value={exp.category}
                        onChange={(e) => updateExpense(exp.id, { category: e.target.value })}
                        className="w-full h-9 rounded-lg border border-border text-sm px-2 bg-card"
                      >
                        {EXPENSE_CATEGORIES.map((c) => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Amount (£)</Label>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={exp.amount}
                        onChange={(e) => updateExpense(exp.id, { amount: parseFloat(e.target.value) || 0 })}
                        className="h-9 rounded-lg"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Description</Label>
                    <Input
                      type="text"
                      placeholder="What was this expense for?"
                      value={exp.notes}
                      onChange={(e) => updateExpense(exp.id, { notes: e.target.value })}
                      className="h-9 rounded-lg"
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
          <p className="text-xs text-muted-foreground">
            Expenses remain unapproved until reviewed. No financial record is created here.
          </p>
        </section>

        {/* Consumable Stock */}
        <section className="space-y-4">
          <div className="flex items-center gap-2 text-indigo-700 pb-2 border-b border-indigo-100">
            <Package className="w-5 h-5" />
            <h3 className="font-bold text-lg">Consumables / Materials</h3>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
            <Input
              placeholder="Search materials to log..."
              className="pl-10 rounded-xl bg-card shadow-sm h-12 border-indigo-100 focus-visible:ring-indigo-500"
              value={stockSearch}
              onChange={(e) => setStockSearch(e.target.value)}
            />
          </div>

          {stockSearch && (
            <Card className="absolute z-10 w-[calc(100%-2rem)] mt-1 shadow-xl border-border max-h-60 overflow-y-auto">
              <CardContent className="p-2 space-y-1">
                {filteredStock.length > 0 ? (
                  filteredStock.map(item => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between p-3 rounded-lg hover:bg-muted cursor-pointer border border-transparent hover:border-border"
                      onClick={() => handleAddStock(item.id)}
                    >
                      <div>
                        <p className="font-semibold text-sm">{item.name}</p>
                        <p className="text-xs text-muted-foreground">{item.sku} • {item.quantity} available</p>
                      </div>
                      <Button size="icon" variant="ghost" className="h-8 w-8 rounded-full text-indigo-600 bg-indigo-50 hover:bg-indigo-100 hover:text-indigo-700">
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  ))
                ) : (
                  <div className="p-4 text-center text-muted-foreground text-sm">No items found</div>
                )}
              </CardContent>
            </Card>
          )}

          <div className="space-y-3 mt-4">
            {stockUsed.length === 0 ? (
              <p className="text-sm text-muted-foreground italic">No materials added.</p>
            ) : (
              stockUsed.map((item) => {
                const stock = stockItems.find(s => s.id === item.stockItemId);
                if (!stock) return null;

                return (
                  <div key={item.id} className="bg-card rounded-xl p-4 border border-border shadow-sm relative overflow-hidden flex flex-col gap-3">
                    <button
                      onClick={() => handleRemoveStock(item.id)}
                      className="absolute top-2 right-2 text-muted-foreground hover:text-red-500 p-2"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>

                    <div className="pr-8">
                      <p className="font-bold text-foreground">{stock.name}</p>
                      <p className="text-xs text-muted-foreground">{stock.sku} • <span className={stock.quantity < item.quantity ? "text-red-500 font-medium" : ""}>{stock.quantity} available</span></p>
                    </div>

                    <div className="flex items-center gap-3">
                      <Label className="text-sm font-medium text-foreground">Qty Used:</Label>
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
            <Search className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
            <Input
              placeholder="Search assigned assets..."
              className="pl-10 rounded-xl bg-card shadow-sm h-12 border-amber-100 focus-visible:ring-amber-500"
              value={assetSearch}
              onChange={(e) => setAssetSearch(e.target.value)}
            />
          </div>

          {assetSearch && (
            <Card className="absolute z-10 w-[calc(100%-2rem)] mt-1 shadow-xl border-border max-h-60 overflow-y-auto">
              <CardContent className="p-2 space-y-1">
                {filteredAssets.length > 0 ? (
                  filteredAssets.map(asset => (
                    <div
                      key={asset.id}
                      className="flex items-center justify-between p-3 rounded-lg hover:bg-muted cursor-pointer border border-transparent hover:border-border"
                      onClick={() => handleAddAsset(asset.id)}
                    >
                      <div>
                        <p className="font-semibold text-sm">{asset.name}</p>
                        <p className="text-xs text-muted-foreground">{asset.type} {asset.serialNumber ? `• ${asset.serialNumber}` : ''}</p>
                      </div>
                      <Button size="icon" variant="ghost" className="h-8 w-8 rounded-full text-amber-600 bg-amber-50 hover:bg-amber-100 hover:text-amber-700">
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  ))
                ) : (
                  <div className="p-4 text-center text-muted-foreground text-sm">No assets found</div>
                )}
              </CardContent>
            </Card>
          )}

          <div className="space-y-3 mt-4">
            {assetsUsed.length === 0 ? (
              <p className="text-sm text-muted-foreground italic">No assets selected.</p>
            ) : (
              assetsUsed.map((item) => {
                const asset = assets.find(a => a.id === item.assetId);
                if (!asset) return null;

                return (
                  <div key={item.id} className="bg-card rounded-xl p-4 border border-border shadow-sm relative overflow-hidden flex justify-between items-center">
                    <div>
                      <p className="font-bold text-foreground">{asset.name}</p>
                      <div className="flex gap-2 mt-1">
                        <Badge variant="outline" className="text-xs font-normal bg-muted">{asset.type}</Badge>
                        {asset.serialNumber && <Badge variant="secondary" className="text-xs font-mono">{asset.serialNumber}</Badge>}
                      </div>
                    </div>
                    <button
                      onClick={() => handleRemoveAsset(item.id)}
                      className="text-muted-foreground hover:text-red-500 p-2"
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