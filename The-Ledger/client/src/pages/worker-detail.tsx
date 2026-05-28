import { Layout } from "@/components/layout";
import { useStore } from "@/lib/mockData";
import { useRoute, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, User, FileText, Eye } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useState } from "react";

export default function WorkerDetailPage() {
  const { workers, roles, updateWorker } = useStore();
  const [match, params] = useRoute("/workers/:id");
  const [, setLocation] = useLocation();
  const [viewDoc, setViewDoc] = useState<{name: string, url: string} | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    status: "Active" as "Active" | "Inactive",
  });

  if (!match || !params?.id) {
    return (
      <Layout>
        <div className="space-y-4" data-testid="status-worker-not-found">
          <p className="text-sm text-muted-foreground">Invalid worker URL.</p>
          <Button variant="outline" onClick={() => setLocation("/workers")} data-testid="button-back-workers-invalid">Back to Workers</Button>
        </div>
      </Layout>
    );
  }

  const worker = workers.find(w => w.id === params.id);
  const workerJobs = useStore().jobs.filter(j => j.assignedWorkerIds.includes(worker?.id || ""));

  const startEdit = () => {
    if (!worker) return;
    setEditForm({
      firstName: worker.firstName,
      lastName: worker.lastName,
      email: worker.email || "",
      phone: worker.phone,
      status: worker.status,
    });
    setIsEditing(true);
  };

  const saveEdit = () => {
    if (!worker) return;
    updateWorker(worker.id, {
      firstName: editForm.firstName.trim() || worker.firstName,
      lastName: editForm.lastName.trim() || worker.lastName,
      email: editForm.email.trim(),
      phone: editForm.phone.trim() || worker.phone,
      status: editForm.status,
    });
    setIsEditing(false);
  };

  if (!worker) {
    return (
      <Layout>
        <div className="space-y-4" data-testid="status-worker-not-found">
          <h2 className="text-2xl font-semibold">Worker not found</h2>
          <p className="text-muted-foreground">This worker might have been removed or does not exist.</p>
          <Button variant="outline" onClick={() => setLocation("/workers")} data-testid="button-back-workers-not-found">Back to Workers</Button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6" data-testid={`page-worker-${worker.id}`}>
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setLocation("/workers")}
              data-testid="button-back-workers"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" data-testid="badge-worker-role">{worker.roleIds.map(rid => roles.find(r => r.id === rid)?.name).filter(Boolean).join(", ") || "—"}</Badge>
                <Badge variant={worker.status === "Active" ? "default" : "secondary"} data-testid="badge-worker-status">{worker.status}</Badge>
              </div>
              {!isEditing ? (
                <h1 className="text-2xl font-bold mt-1" data-testid="text-worker-name">{worker.firstName} {worker.lastName}</h1>
              ) : (
              <div className="mt-2 grid grid-cols-2 gap-2">
                <input
                  data-testid="input-worker-firstName-edit"
                  className="h-10 rounded-md border bg-background px-3 text-sm"
                  value={editForm.firstName}
                  onChange={(e) => setEditForm((p) => ({ ...p, firstName: e.target.value }))}
                  placeholder="First name"
                />
                <input
                  data-testid="input-worker-lastName-edit"
                  className="h-10 rounded-md border bg-background px-3 text-sm"
                  value={editForm.lastName}
                  onChange={(e) => setEditForm((p) => ({ ...p, lastName: e.target.value }))}
                  placeholder="Last name"
                />
              </div>
            )}
            </div>
          </div>

          {!isEditing ? (
            <Button variant="outline" onClick={startEdit} data-testid="button-worker-edit">Edit</Button>
          ) : (
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={() => setIsEditing(false)} data-testid="button-worker-cancel">Cancel</Button>
              <Button onClick={saveEdit} data-testid="button-worker-save">Save</Button>
            </div>
          )}
        </div>

        <div className="grid gap-4 md:grid-cols-3">
            <div className="md:col-span-1 space-y-4">
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                        <User className="h-4 w-4" /> Contact
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3 text-sm">
                        <div className="grid gap-2">
                          <div className="flex justify-between items-center gap-3">
                            <span className="text-muted-foreground">Phone</span>
                            {!isEditing ? (
                              <span data-testid="text-worker-phone">{worker.phone}</span>
                            ) : (
                              <input
                                data-testid="input-worker-phone-edit"
                                className="h-9 w-[220px] rounded-md border bg-background px-3 text-sm"
                                value={editForm.phone}
                                onChange={(e) => setEditForm((p) => ({ ...p, phone: e.target.value }))}
                              />
                            )}
                          </div>

                          <div className="flex justify-between items-center gap-3">
                            <span className="text-muted-foreground">Email</span>
                            {!isEditing ? (
                              <span data-testid="text-worker-email">{worker.email || "N/A"}</span>
                            ) : (
                              <input
                                data-testid="input-worker-email-edit"
                                className="h-9 w-[220px] rounded-md border bg-background px-3 text-sm"
                                value={editForm.email}
                                onChange={(e) => setEditForm((p) => ({ ...p, email: e.target.value }))}
                              />
                            )}
                          </div>

                          <div className="flex justify-between items-center gap-3">
                            <span className="text-muted-foreground">Status</span>
                            {!isEditing ? (
                              <span data-testid="text-worker-status">{worker.status}</span>
                            ) : (
                              <select
                                data-testid="select-worker-status-edit"
                                className="h-9 w-[220px] rounded-md border bg-background px-3 text-sm"
                                value={editForm.status}
                                onChange={(e) => setEditForm((p) => ({ ...p, status: e.target.value as any }))}
                              >
                                <option value="Active">Active</option>
                                <option value="Inactive">Inactive</option>
                              </select>
                            )}
                          </div>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <FileText className="h-4 w-4" /> Documents
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2 text-sm">
                        {worker.documents && worker.documents.length > 0 ? (
                            worker.documents.map((doc, i) => (
                                <div key={i} className="flex justify-between items-center border rounded p-2 text-sm bg-slate-50 dark:bg-slate-900">
                                    <span className="truncate max-w-[120px]" title={doc.name}>{doc.name}</span>
                                    <Button variant="ghost" size="sm" onClick={() => setViewDoc(doc)} className="h-6 px-2">
                                        <Eye className="h-3 w-3" />
                                    </Button>
                                </div>
                            ))
                        ) : (
                            <p className="text-muted-foreground italic">No documents.</p>
                        )}
                    </CardContent>
                </Card>
            </div>
            
            <Card className="md:col-span-2">
                <CardHeader>
                    <CardTitle>Assigned Jobs</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                    {workerJobs.length === 0 ? <p className="text-muted-foreground italic">No jobs assigned.</p> : 
                    workerJobs.map(job => (
                        <div key={job.id} className="flex justify-between items-center border rounded p-2" onClick={() => setLocation(`/jobs/${job.id}`)}>
                            <div>
                                <p className="font-medium cursor-pointer hover:underline">{job.title}</p>
                                <p className="text-xs text-muted-foreground">{new Date(job.startAt).toLocaleDateString()}</p>
                            </div>
                            <Badge variant={job.status === "Active" ? "default" : "secondary"}>{job.status}</Badge>
                        </div>
                    ))}
                </CardContent>
            </Card>
        </div>

        {/* Document Viewer Dialog */}
        <Dialog open={!!viewDoc} onOpenChange={(o) => !o && setViewDoc(null)}>
            <DialogContent className="sm:max-w-[600px] h-[80vh]">
                <DialogHeader>
                    <DialogTitle>{viewDoc?.name}</DialogTitle>
                    <DialogDescription>Document Preview</DialogDescription>
                </DialogHeader>
                <div className="flex-1 w-full h-full bg-slate-100 rounded-md flex items-center justify-center border">
                    <div className="text-center p-8">
                        <FileText className="h-16 w-16 mx-auto text-slate-400 mb-4" />
                        <p className="text-muted-foreground">Preview not available in demo mode.</p>
                        <p className="text-xs text-muted-foreground mt-2">In a real app, this would render PDF or Image content.</p>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}
