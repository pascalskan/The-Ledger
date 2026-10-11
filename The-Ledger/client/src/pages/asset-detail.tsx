import { Layout } from "@/components/layout";
import { useStore } from "@/lib/mockData";
import { useRoute, useLocation } from "wouter";
import { ArrowLeft, Truck, Gavel, Wrench, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { useToast } from "@/hooks/use-toast";

const ASSET_STATUSES = ["Active", "In Service", "Needs Service", "Under Repair", "Broken", "Retired"] as const;
type AssetStatus = (typeof ASSET_STATUSES)[number];
const selectClass = "h-9 w-full rounded-md border bg-background px-3 text-sm";

export default function AssetDetailPage() {
  const [, params] = useRoute("/assets/:id");
  const [, setLocation] = useLocation();
  const { assets, locations, jobs, updateAsset, deleteAsset } = useStore();
  const { toast } = useToast();
  const [mode, setMode] = useState<null | "status" | "edit" | "assign" | "delete">(null);
  const [statusValue, setStatusValue] = useState<AssetStatus>("Active");
  const [statusReason, setStatusReason] = useState("");
  const [editName, setEditName] = useState("");
  const [editSerial, setEditSerial] = useState("");
  const [editNextService, setEditNextService] = useState("");
  const [assignJobId, setAssignJobId] = useState("");

  const asset = assets.find(a => a.id === params?.id);
  const location = locations.find(l => l.id === asset?.locationId);
  const assignedJob = jobs.find(j => j.id === asset?.assignedToJobId);

  if (!asset) {
    return (
      <Layout>
        <div className="text-center py-12">
          <p className="text-muted-foreground">Asset not found.</p>
          <Button onClick={() => setLocation("/equipment")} className="mt-4">Back to Assets</Button>
        </div>
      </Layout>
    );
  }

  const closeDialog = () => setMode(null);
  const openStatus = () => { setStatusValue(asset.status as AssetStatus); setStatusReason(asset.statusReason ?? ""); setMode("status"); };
  const openEdit = () => { setEditName(asset.name); setEditSerial(asset.serialNumber ?? ""); setEditNextService(asset.nextServiceDate?.slice(0, 10) ?? ""); setMode("edit"); };
  const openAssign = () => { setAssignJobId(asset.assignedToJobId ?? ""); setMode("assign"); };
  const saveStatus = () => {
    updateAsset(asset.id, { status: statusValue, statusReason: statusReason.trim() || undefined });
    toast({ title: "Status updated", description: `${asset.name} is now ${statusValue}.` });
    closeDialog();
  };
  const saveEdit = () => {
    if (!editName.trim()) { toast({ title: "Name required", description: "An asset needs a name.", variant: "destructive" }); return; }
    updateAsset(asset.id, { name: editName.trim(), serialNumber: editSerial.trim() || undefined, nextServiceDate: editNextService || undefined });
    toast({ title: "Asset updated", description: "Changes have been saved." });
    closeDialog();
  };
  const saveAssign = () => {
    updateAsset(asset.id, { assignedToJobId: assignJobId || undefined });
    toast({ title: assignJobId ? "Assigned to job" : "Unassigned", description: assignJobId ? `${asset.name} assigned.` : `${asset.name} is no longer assigned to a job.` });
    closeDialog();
  };
  const confirmDelete = () => {
    deleteAsset(asset.id);
    toast({ title: "Asset removed", description: `${asset.name} has been deleted.` });
    setLocation("/equipment");
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Active': return <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200">Active</Badge>;
      case 'In Service': return <Badge className="bg-blue-50 text-blue-700 border-blue-200">In Service</Badge>;
      case 'Needs Service': return <Badge className="bg-amber-50 text-amber-700 border-amber-200">Needs Service</Badge>;
      case 'Broken': return <Badge className="bg-rose-50 text-rose-700 border-rose-200">Broken</Badge>;
      case 'Under Repair': return <Badge className="bg-purple-50 text-purple-700 border-purple-200">Under Repair</Badge>;
      case 'Retired': return <Badge className="bg-muted text-muted-foreground border-border">Retired</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
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
              <h1 className="text-3xl font-bold tracking-tight text-foreground">{asset.name}</h1>
              {getStatusBadge(asset.status)}
            </div>
            <p className="text-muted-foreground mt-1 flex items-center gap-2">
              <Badge variant="outline" className="font-normal">{asset.type}</Badge>
              {asset.serialNumber && <span>• SN: <span className="font-mono">{asset.serialNumber}</span></span>}
              • <span className="font-medium text-foreground">{location?.name || "Unknown Location"}</span>
            </p>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          <Card className="md:col-span-2">
            <CardHeader className="pb-3 border-b border-border">
              <CardTitle className="text-lg flex items-center gap-2"><Truck className="h-5 w-5 text-muted-foreground" /> Asset Information</CardTitle>
            </CardHeader>
            <CardContent className="pt-4 grid grid-cols-2 gap-y-6 gap-x-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">Purchase Date</p>
                <p className="text-base font-medium text-foreground">{asset.purchaseDate ? new Date(asset.purchaseDate).toLocaleDateString("en-GB") : "—"}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">Assigned To Job</p>
                <p className="text-base font-medium text-foreground">{assignedJob?.title || "—"}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">Last Service</p>
                <p className="text-base font-medium text-foreground">{asset.lastServiceDate ? new Date(asset.lastServiceDate).toLocaleDateString("en-GB") : "—"}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">Next Service Due</p>
                <p className={`text-base font-medium ${asset.nextServiceDate && new Date(asset.nextServiceDate) < new Date() ? 'text-rose-600 font-bold' : 'text-foreground'}`}>
                  {asset.nextServiceDate ? new Date(asset.nextServiceDate).toLocaleDateString("en-GB") : "—"}
                </p>
              </div>
              {asset.statusReason && (
                <div className="col-span-2 bg-muted p-4 rounded-lg border border-border">
                  <p className="text-sm font-medium text-muted-foreground mb-1">Status Reason / Notes</p>
                  <p className="text-base text-foreground">{asset.statusReason}</p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3 border-b border-border">
              <CardTitle className="text-lg flex items-center gap-2"><Settings className="h-5 w-5 text-muted-foreground" /> Actions</CardTitle>
            </CardHeader>
            <CardContent className="pt-4 flex flex-col gap-3">
              <Button className="w-full justify-start" onClick={openStatus} data-testid="asset-action-status"><Wrench className="w-4 h-4 mr-2" /> Change Status</Button>
              <Button variant="outline" className="w-full justify-start text-foreground" onClick={openEdit} data-testid="asset-action-edit">Edit Asset</Button>
              <Button variant="outline" className="w-full justify-start text-foreground" onClick={openAssign} data-testid="asset-action-assign">Assign to Job</Button>
              <Button variant="outline" className="w-full justify-start text-rose-700 hover:text-rose-800 hover:bg-rose-50 border-rose-200 mt-4" onClick={() => setMode("delete")} data-testid="asset-action-delete">Delete Asset</Button>
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog open={mode === "status"} onOpenChange={(o) => { if (!o) closeDialog(); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Change status</DialogTitle><DialogDescription>Update the condition of {asset.name}.</DialogDescription></DialogHeader>
          <div className="grid gap-3">
            <Label htmlFor="asset-status">Status</Label>
            <select id="asset-status" className={selectClass} value={statusValue} onChange={(e) => setStatusValue(e.target.value as AssetStatus)}>
              {ASSET_STATUSES.map((st) => <option key={st} value={st}>{st}</option>)}
            </select>
            <Label htmlFor="asset-status-reason">Reason / notes (optional)</Label>
            <Input id="asset-status-reason" value={statusReason} onChange={(e) => setStatusReason(e.target.value)} />
          </div>
          <DialogFooter><Button variant="outline" onClick={closeDialog}>Cancel</Button><Button onClick={saveStatus}>Save status</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={mode === "edit"} onOpenChange={(o) => { if (!o) closeDialog(); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit asset</DialogTitle></DialogHeader>
          <div className="grid gap-3">
            <Label htmlFor="asset-name">Name</Label>
            <Input id="asset-name" value={editName} onChange={(e) => setEditName(e.target.value)} />
            <Label htmlFor="asset-serial">Serial number</Label>
            <Input id="asset-serial" value={editSerial} onChange={(e) => setEditSerial(e.target.value)} />
            <Label htmlFor="asset-next-service">Next service due</Label>
            <Input id="asset-next-service" type="date" value={editNextService} onChange={(e) => setEditNextService(e.target.value)} />
          </div>
          <DialogFooter><Button variant="outline" onClick={closeDialog}>Cancel</Button><Button onClick={saveEdit}>Save changes</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={mode === "assign"} onOpenChange={(o) => { if (!o) closeDialog(); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Assign to job</DialogTitle><DialogDescription>Choose the job {asset.name} is deployed on.</DialogDescription></DialogHeader>
          <div className="grid gap-3">
            <Label htmlFor="asset-assign-job">Job</Label>
            <select id="asset-assign-job" className={selectClass} value={assignJobId} onChange={(e) => setAssignJobId(e.target.value)}>
              <option value="">Not assigned</option>
              {jobs.filter((j) => j.status !== "Completed" && j.status !== "Cancelled").map((j) => <option key={j.id} value={j.id}>{j.jobId} — {j.title}</option>)}
            </select>
          </div>
          <DialogFooter><Button variant="outline" onClick={closeDialog}>Cancel</Button><Button onClick={saveAssign}>Save assignment</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={mode === "delete"}
        title="Delete this asset?"
        description={`${asset.name} will be removed. This is recorded in the audit log and cannot be undone here.`}
        confirmLabel="Delete asset"
        destructive
        onCancel={closeDialog}
        onConfirm={confirmDelete}
      />
    </Layout>
  );
}