import { Layout } from "@/components/layout";
import { useStore } from "@/lib/mockData";
import { useRoute, useLocation } from "wouter";
import { ArrowLeft, MapPin, Package, Truck, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StockTable } from "@/components/stock-assets/StockTable";
import { AssetTable } from "@/components/stock-assets/AssetTable";
import { Badge } from "@/components/ui/badge";

export default function LocationDetailPage() {
  const [, params] = useRoute("/locations/:id");
  const [, setLocation] = useLocation();
  const { locations, stockItems, assets } = useStore();

  const location = locations.find(l => l.id === params?.id);
  const locStock = stockItems.filter(s => s.locationId === location?.id);
  const locAssets = assets.filter(a => a.locationId === location?.id);

  if (!location) {
    return (
      <Layout>
        <div className="text-center py-12">
          <p className="text-slate-500">Location not found.</p>
          <Button onClick={() => setLocation("/equipment")} className="mt-4">Back to Locations</Button>
        </div>
      </Layout>
    );
  }

  const stockValue = locStock.reduce((acc, s) => acc + (s.quantity * s.unitCost), 0);
  const lowStockCount = locStock.filter(s => s.quantity <= s.reorderLevel).length;
  const issueAssetCount = locAssets.filter(a => a.status === "Needs Service" || a.status === "Broken").length;

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => setLocation("/equipment")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center">
                <MapPin className="h-5 w-5" />
              </div>
              <h2 className="text-3xl font-bold tracking-tight text-slate-900">{location.name}</h2>
            </div>
            <p className="text-slate-500 mt-1 flex items-center gap-2 ml-14">
              <Badge variant="outline" className="capitalize">{location.type}</Badge>
              {location.description && <span>• {location.description}</span>}
            </p>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardContent className="p-5 flex items-center gap-4">
              <div className="h-12 w-12 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center">
                <Package className="h-6 w-6" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-500">Total Stock Value</p>
                <p className="text-2xl font-bold text-slate-900">£{stockValue.toFixed(0)}</p>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-5 flex items-center gap-4">
              <div className="h-12 w-12 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center">
                <Package className="h-6 w-6" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-500">Stock Items</p>
                <p className="text-2xl font-bold text-slate-900">{locStock.length}</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-5 flex items-center gap-4">
              <div className="h-12 w-12 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center">
                <Truck className="h-6 w-6" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-500">Assets Present</p>
                <p className="text-2xl font-bold text-slate-900">{locAssets.length}</p>
              </div>
            </CardContent>
          </Card>

          <Card className={(lowStockCount > 0 || issueAssetCount > 0) ? "border-rose-200 bg-rose-50/50" : ""}>
            <CardContent className="p-5 flex items-center gap-4">
              <div className={`h-12 w-12 rounded-full flex items-center justify-center ${(lowStockCount > 0 || issueAssetCount > 0) ? "bg-rose-100 text-rose-600" : "bg-emerald-50 text-emerald-600"}`}>
                {(lowStockCount > 0 || issueAssetCount > 0) ? <AlertTriangle className="h-6 w-6" /> : <MapPin className="h-6 w-6" />}
              </div>
              <div>
                <p className="text-sm font-medium text-slate-500">Active Alerts</p>
                <p className={`text-2xl font-bold ${(lowStockCount > 0 || issueAssetCount > 0) ? 'text-rose-600' : 'text-slate-900'}`}>
                  {lowStockCount + issueAssetCount}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader className="pb-3 border-b border-slate-100">
              <CardTitle className="text-xl flex items-center gap-2"><Package className="h-5 w-5 text-indigo-500" /> Stock at this location</CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              {locStock.length > 0 ? (
                <StockTable data={locStock.map(s => ({...s, location: location.name}))} />
              ) : (
                <p className="text-slate-500 text-center py-8">No stock at this location.</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3 border-b border-slate-100">
              <CardTitle className="text-xl flex items-center gap-2"><Truck className="h-5 w-5 text-amber-500" /> Assets at this location</CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              {locAssets.length > 0 ? (
                <AssetTable data={locAssets.map(a => ({...a, location: location.name}))} />
              ) : (
                <p className="text-slate-500 text-center py-8">No assets at this location.</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
}