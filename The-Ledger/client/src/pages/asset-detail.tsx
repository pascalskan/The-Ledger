import { Layout } from "@/components/layout";
import { useStore } from "@/lib/mockData";
import { useRoute, useLocation } from "wouter";
import { ArrowLeft, Truck, Gavel, Wrench, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function AssetDetailPage() {
  const [, params] = useRoute("/assets/:id");
  const [, setLocation] = useLocation();
  const { assets, locations, jobs } = useStore();

  const asset = assets.find(a => a.id === params?.id);
  const location = locations.find(l => l.id === asset?.locationId);
  const assignedJob = jobs.find(j => j.id === asset?.assignedToJobId);

  if (!asset) {
    return (
      <Layout>
        <div className="text-center py-12">
          <p className="text-slate-500">Asset not found.</p>
          <Button onClick={() => setLocation("/equipment")} className="mt-4">Back to Assets</Button>
        </div>
      </Layout>
    );
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Active': return <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200">Active</Badge>;
      case 'In Service': return <Badge className="bg-blue-50 text-blue-700 border-blue-200">In Service</Badge>;
      case 'Needs Service': return <Badge className="bg-amber-50 text-amber-700 border-amber-200">Needs Service</Badge>;
      case 'Broken': return <Badge className="bg-rose-50 text-rose-700 border-rose-200">Broken</Badge>;
      case 'Under Repair': return <Badge className="bg-purple-50 text-purple-700 border-purple-200">Under Repair</Badge>;
      case 'Retired': return <Badge className="bg-slate-100 text-slate-600 border-slate-200">Retired</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => setLocation("/equipment")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold tracking-tight text-foreground">{asset.name}</h1>
              {getStatusBadge(asset.status)}
            </div>
            <p className="text-slate-500 mt-1 flex items-center gap-2">
              <Badge variant="outline" className="font-normal">{asset.type}</Badge>
              {asset.serialNumber && <span>• SN: <span className="font-mono">{asset.serialNumber}</span></span>}
              • <span className="font-medium text-slate-700">{location?.name || "Unknown Location"}</span>
            </p>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          <Card className="md:col-span-2">
            <CardHeader className="pb-3 border-b border-slate-100">
              <CardTitle className="text-lg flex items-center gap-2"><Truck className="h-5 w-5 text-slate-400" /> Asset Information</CardTitle>
            </CardHeader>
            <CardContent className="pt-4 grid grid-cols-2 gap-y-6 gap-x-4">
              <div>
                <p className="text-sm font-medium text-slate-500 mb-1">Purchase Date</p>
                <p className="text-base font-medium text-slate-900">{asset.purchaseDate ? new Date(asset.purchaseDate).toLocaleDateString() : "—"}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-slate-500 mb-1">Assigned To Job</p>
                <p className="text-base font-medium text-slate-900">{assignedJob?.title || "—"}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-slate-500 mb-1">Last Service</p>
                <p className="text-base font-medium text-slate-900">{asset.lastServiceDate ? new Date(asset.lastServiceDate).toLocaleDateString() : "—"}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-slate-500 mb-1">Next Service Due</p>
                <p className={`text-base font-medium ${asset.nextServiceDate && new Date(asset.nextServiceDate) < new Date() ? 'text-rose-600 font-bold' : 'text-slate-900'}`}>
                  {asset.nextServiceDate ? new Date(asset.nextServiceDate).toLocaleDateString() : "—"}
                </p>
              </div>
              {asset.statusReason && (
                <div className="col-span-2 bg-slate-50 p-4 rounded-lg border border-slate-100">
                  <p className="text-sm font-medium text-slate-500 mb-1">Status Reason / Notes</p>
                  <p className="text-base text-slate-700">{asset.statusReason}</p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3 border-b border-slate-100">
              <CardTitle className="text-lg flex items-center gap-2"><Settings className="h-5 w-5 text-slate-400" /> Actions</CardTitle>
            </CardHeader>
            <CardContent className="pt-4 flex flex-col gap-3">
              <Button className="w-full justify-start"><Wrench className="w-4 h-4 mr-2" /> Change Status</Button>
              <Button variant="outline" className="w-full justify-start text-slate-700">Edit Asset</Button>
              <Button variant="outline" className="w-full justify-start text-slate-700">Assign to Job</Button>
              <Button variant="outline" className="w-full justify-start text-rose-600 hover:text-rose-700 hover:bg-rose-50 border-rose-200 mt-4">Delete Asset</Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
}