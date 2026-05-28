import { Layout } from "@/components/layout";
import { useStore } from "@/lib/mockData";
import { useRoute, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Wrench, Settings, Pencil, Save, X } from "lucide-react";
import { useMemo, useState } from "react";

export default function EquipmentDetailPage() {
  const { equipment, jobs, updateEquipment } = useStore();
  const [match, params] = useRoute("/equipment/:id");
  const [, setLocation] = useLocation();
  const [isEditing, setIsEditing] = useState(false);
  const [edit, setEdit] = useState({
    name: "",
    category: "",
    status: "Available" as "Available" | "Rented" | "Maintenance" | "Retired",
    dayRate: "",
    purchaseDate: "",
    purchaseLocation: "",
    supplier: "",
    warrantyExpiry: "",
    lastServiceDate: "",
    serviceInterval: "",
    maintenanceProviderName: "",
    maintenanceProviderContact: "",
    notes: "",
  });

  if (!match || !params?.id) {
    return (
      <Layout>
        <div className="space-y-4" data-testid="status-equipment-not-found">
          <p className="text-sm text-muted-foreground">Invalid equipment URL.</p>
          <Button variant="outline" onClick={() => setLocation("/equipment")} data-testid="button-back-equipment-invalid">Back to Equipment</Button>
        </div>
      </Layout>
    );
  }

  const item = equipment.find(e => e.id === params.id);
  const usageHistory = jobs.filter(j => j.assignedEquipmentIds.includes(item?.id || ""));

  const companyUsageHistory = useMemo(() => usageHistory.filter(j => j.companyId === item?.companyId), [usageHistory, item?.companyId]);

  const startEdit = () => {
    if (!item) return;
    setEdit({
      name: item.name,
      category: item.category,
      status: item.status,
      dayRate: String((item as any).dayRate ?? 150),
      purchaseDate: item.purchaseDate || "",
      purchaseLocation: (item as any).purchaseLocation || "",
      supplier: item.supplier || "",
      warrantyExpiry: (item as any).warrantyExpiry || "",
      lastServiceDate: item.lastServiceDate || "",
      serviceInterval: item.serviceInterval || "",
      maintenanceProviderName: item.maintenanceProvider?.name || "",
      maintenanceProviderContact: item.maintenanceProvider?.contact || "",
      notes: item.notes || "",
    });
    setIsEditing(true);
  };

  const saveEdit = () => {
    if (!item) return;
    updateEquipment(item.id, {
      name: edit.name.trim() || item.name,
      category: edit.category.trim() || item.category,
      status: edit.status,
      ...(edit.dayRate !== "" ? { dayRate: Number(edit.dayRate) } : {}),
      purchaseDate: edit.purchaseDate || undefined,
      supplier: edit.supplier || undefined,
      lastServiceDate: edit.lastServiceDate || undefined,
      serviceInterval: edit.serviceInterval || undefined,
      maintenanceProvider: (edit.maintenanceProviderName || edit.maintenanceProviderContact)
        ? { name: edit.maintenanceProviderName || "Provider", contact: edit.maintenanceProviderContact || "" }
        : undefined,
      notes: edit.notes || undefined,
      ...(edit.purchaseLocation ? { purchaseLocation: edit.purchaseLocation } : {}),
      ...(edit.warrantyExpiry ? { warrantyExpiry: edit.warrantyExpiry } : {}),
    } as any);
    setIsEditing(false);
  };

  if (!item) {
    return (
      <Layout>
        <div className="space-y-4" data-testid="status-equipment-not-found">
          <h2 className="text-2xl font-semibold">Asset not found</h2>
          <p className="text-muted-foreground">This asset might have been deleted or does not exist.</p>
          <Button variant="outline" onClick={() => setLocation("/equipment")} data-testid="button-back-equipment-not-found">Back to Equipment</Button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6" data-testid={`page-equipment-${item.id}`}>
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setLocation("/equipment")}
              data-testid="button-back-equipment"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" data-testid="badge-equipment-category">{item.category}</Badge>
                <Badge variant={item.status === "Available" ? "default" : "secondary"} data-testid="badge-equipment-status">{item.status}</Badge>
              </div>
              <h1 className="text-2xl font-bold mt-1" data-testid="text-equipment-name">{item.name}</h1>
            </div>
          </div>

          {!isEditing ? (
            <Button variant="outline" onClick={startEdit} data-testid="button-equipment-edit">
              <Pencil className="h-4 w-4 mr-2" /> Edit
            </Button>
          ) : (
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={() => setIsEditing(false)} data-testid="button-equipment-cancel">
                <X className="h-4 w-4 mr-2" /> Cancel
              </Button>
              <Button onClick={saveEdit} data-testid="button-equipment-save">
                <Save className="h-4 w-4 mr-2" /> Save
              </Button>
            </div>
          )}
        </div>

        <div className="grid gap-4 md:grid-cols-2">
            <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                <Settings className="h-4 w-4" /> General Details
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
                <div className="flex justify-between items-center gap-3">
                  <span className="text-muted-foreground">Name</span>
                  {!isEditing ? (
                    <span data-testid="text-equipment-name-value">{item.name}</span>
                  ) : (
                    <Input
                      data-testid="input-equipment-name-edit"
                      className="h-9 w-[240px]"
                      value={edit.name}
                      onChange={(e) => setEdit((p) => ({ ...p, name: e.target.value }))}
                    />
                  )}
                </div>

                <div className="flex justify-between items-center gap-3">
                  <span className="text-muted-foreground">Category</span>
                  {!isEditing ? (
                    <span data-testid="text-equipment-category">{item.category}</span>
                  ) : (
                    <Input
                      data-testid="input-equipment-category-edit"
                      className="h-9 w-[240px]"
                      value={edit.category}
                      onChange={(e) => setEdit((p) => ({ ...p, category: e.target.value }))}
                    />
                  )}
                </div>

                <div className="flex justify-between items-center gap-3">
                  <span className="text-muted-foreground">Status</span>
                  {!isEditing ? (
                    <span data-testid="text-equipment-status">{item.status}</span>
                  ) : (
                    <select
                      data-testid="select-equipment-status-edit"
                      className="h-9 w-[240px] rounded-md border bg-background px-3 text-sm"
                      value={edit.status}
                      onChange={(e) => setEdit((p) => ({ ...p, status: e.target.value as any }))}
                    >
                      <option value="Available">Available</option>
                      <option value="Rented">Rented</option>
                      <option value="Maintenance">Maintenance</option>
                      <option value="Retired">Retired</option>
                    </select>
                  )}
                </div>

                <div className="flex justify-between items-center gap-3">
                  <span className="text-muted-foreground">Day rate</span>
                  {!isEditing ? (
                    <span data-testid="text-equipment-dayRate">${(((item as any).dayRate ?? 150) as number).toFixed(2)}/day</span>
                  ) : (
                    <Input
                      data-testid="input-equipment-dayRate-edit"
                      className="h-9 w-[240px]"
                      type="number"
                      inputMode="decimal"
                      value={edit.dayRate}
                      onChange={(e) => setEdit((p) => ({ ...p, dayRate: e.target.value }))}
                    />
                  )}
                </div>
            </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Wrench className="h-4 w-4" /> Maintenance & Asset Information
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 text-sm">
                    {!isEditing ? (
                      <>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <span className="text-xs text-muted-foreground block">Purchase Date</span>
                                <span data-testid="text-equipment-purchaseDate">{item.purchaseDate || "N/A"}</span>
                            </div>
                            <div>
                                <span className="text-xs text-muted-foreground block">Purchase Location</span>
                                <span data-testid="text-equipment-purchaseLocation">{(item as any).purchaseLocation || "N/A"}</span>
                            </div>
                            <div>
                                <span className="text-xs text-muted-foreground block">Supplier</span>
                                <span data-testid="text-equipment-supplier">{item.supplier || "N/A"}</span>
                            </div>
                            <div>
                                <span className="text-xs text-muted-foreground block">Warranty Expiry</span>
                                <span data-testid="text-equipment-warrantyExpiry">{(item as any).warrantyExpiry || "N/A"}</span>
                            </div>
                            <div>
                                <span className="text-xs text-muted-foreground block">Last Service</span>
                                <span data-testid="text-equipment-lastService">{item.lastServiceDate || "N/A"}</span>
                            </div>
                            <div>
                                <span className="text-xs text-muted-foreground block">Service Interval</span>
                                <span data-testid="text-equipment-serviceInterval">{item.serviceInterval || "N/A"}</span>
                            </div>
                        </div>
                        <div className="pt-2 border-t space-y-2">
                          <div>
                            <span className="text-xs text-muted-foreground block mb-1">Maintenance Provider</span>
                            <div className="font-medium" data-testid="text-equipment-providerName">{item.maintenanceProvider?.name || "—"}</div>
                            <div className="text-xs text-muted-foreground" data-testid="text-equipment-providerContact">{item.maintenanceProvider?.contact || ""}</div>
                          </div>
                          <div>
                            <span className="text-xs text-muted-foreground block">Notes</span>
                            <p className="mt-1" data-testid="text-equipment-notes">{item.notes || "—"}</p>
                          </div>
                        </div>
                      </>
                    ) : (
                      <div className="grid gap-4">
                        <div className="grid gap-2">
                          <Label className="text-xs">Purchase date</Label>
                          <Input
                            data-testid="input-equipment-purchaseDate-edit"
                            type="date"
                            value={edit.purchaseDate}
                            onChange={(e) => setEdit((p) => ({ ...p, purchaseDate: e.target.value }))}
                          />
                        </div>

                        <div className="grid gap-2">
                          <Label className="text-xs">Purchase location</Label>
                          <Input
                            data-testid="input-equipment-purchaseLocation-edit"
                            value={edit.purchaseLocation}
                            onChange={(e) => setEdit((p) => ({ ...p, purchaseLocation: e.target.value }))}
                          />
                        </div>

                        <div className="grid gap-2">
                          <Label className="text-xs">Supplier</Label>
                          <Input
                            data-testid="input-equipment-supplier-edit"
                            value={edit.supplier}
                            onChange={(e) => setEdit((p) => ({ ...p, supplier: e.target.value }))}
                          />
                        </div>

                        <div className="grid gap-2">
                          <Label className="text-xs">Warranty expiry</Label>
                          <Input
                            data-testid="input-equipment-warrantyExpiry-edit"
                            type="date"
                            value={edit.warrantyExpiry}
                            onChange={(e) => setEdit((p) => ({ ...p, warrantyExpiry: e.target.value }))}
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div className="grid gap-2">
                            <Label className="text-xs">Last service</Label>
                            <Input
                              data-testid="input-equipment-lastServiceDate-edit"
                              type="date"
                              value={edit.lastServiceDate}
                              onChange={(e) => setEdit((p) => ({ ...p, lastServiceDate: e.target.value }))}
                            />
                          </div>
                          <div className="grid gap-2">
                            <Label className="text-xs">Service interval</Label>
                            <Input
                              data-testid="input-equipment-serviceInterval-edit"
                              value={edit.serviceInterval}
                              onChange={(e) => setEdit((p) => ({ ...p, serviceInterval: e.target.value }))}
                              placeholder="e.g. 6 months"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div className="grid gap-2">
                            <Label className="text-xs">Provider name</Label>
                            <Input
                              data-testid="input-equipment-providerName-edit"
                              value={edit.maintenanceProviderName}
                              onChange={(e) => setEdit((p) => ({ ...p, maintenanceProviderName: e.target.value }))}
                            />
                          </div>
                          <div className="grid gap-2">
                            <Label className="text-xs">Provider contact</Label>
                            <Input
                              data-testid="input-equipment-providerContact-edit"
                              value={edit.maintenanceProviderContact}
                              onChange={(e) => setEdit((p) => ({ ...p, maintenanceProviderContact: e.target.value }))}
                            />
                          </div>
                        </div>

                        <div className="grid gap-2">
                          <Label className="text-xs">Notes</Label>
                          <Textarea
                            data-testid="input-equipment-notes-edit"
                            value={edit.notes}
                            onChange={(e) => setEdit((p) => ({ ...p, notes: e.target.value }))}
                          />
                        </div>
                      </div>
                    )}
                </CardContent>
            </Card>

            <Card className="md:col-span-2">
                <CardHeader>
                    <CardTitle>Usage History</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                    {companyUsageHistory.length === 0 ? <p className="text-muted-foreground italic">No past usage found.</p> :
                    companyUsageHistory.map(job => (
                        <div key={job.id} className="flex justify-between items-center border rounded p-2" onClick={() => setLocation(`/jobs/${job.id}`)}>
                            <div>
                                <p className="font-medium cursor-pointer hover:underline">{job.title}</p>
                                <p className="text-xs text-muted-foreground">{new Date(job.startAt).toLocaleDateString()}</p>
                            </div>
                            <Badge variant="outline">{job.status}</Badge>
                        </div>
                    ))}
                </CardContent>
            </Card>
        </div>
      </div>
    </Layout>
  );
}
