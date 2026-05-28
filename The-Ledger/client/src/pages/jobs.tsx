import { Layout } from "@/components/layout";
import { useStore, Job, Worker, Equipment, Client } from "@/lib/mockData";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Search, MapPin, Calendar, Users, Truck, FileText, Trash2, ReceiptText, Save, Pencil, Filter } from "lucide-react";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";

export default function JobsPage() {
  const { jobs, addJob, updateJob, deleteJob, workers, equipment, clients, addInvoice, addClient, users } = useStore();
  const [search, setSearch] = useState("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isCreateClientOpen, setIsCreateClientOpen] = useState(false);
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  // Filters
  const [showCompleted, setShowCompleted] = useState(false);
  const [dateFilter, setDateFilter] = useState<{start: string, end: string}>({
    start: new Date(new Date().setMonth(new Date().getMonth() - 1)).toISOString().split('T')[0],
    end: new Date(new Date().setMonth(new Date().getMonth() + 2)).toISOString().split('T')[0]
  });

  const [createForm, setCreateForm] = useState({
    title: "",
    clientId: "",
    status: "Planned",
    priority: "Medium",
    locationAddress: "",
    startAt: new Date().toISOString().split('T')[0],
    endAt: new Date(Date.now() + 86400000).toISOString().split('T')[0],
    managerId: "",
    costs: {
        labour: 0,
        equipment: 0,
        materials: 0,
        other: 0
    }
  });

  const [createClientForm, setCreateClientForm] = useState({
    name: "",
    email: "",
    phone: "",
    billingAddress: "",
  });

  const handleCreate = () => {
    if (createForm.title && createForm.clientId) {
        addJob({
            title: createForm.title,
            clientId: createForm.clientId,
            description: "New job created via dashboard",
            status: createForm.status as any,
            priority: createForm.priority as any,
            locationAddress: createForm.locationAddress || "To be confirmed",
            startAt: new Date(createForm.startAt).toISOString(),
            endAt: new Date(createForm.endAt).toISOString(),
            managerId: createForm.managerId || undefined,
            costs: createForm.costs,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        });
        setIsCreateOpen(false);
        setCreateForm({
            title: "",
            clientId: "",
            status: "Planned",
            priority: "Medium",
            locationAddress: "",
            startAt: new Date().toISOString().split('T')[0],
            endAt: new Date(Date.now() + 86400000).toISOString().split('T')[0],
            managerId: "",
            costs: { labour: 0, equipment: 0, materials: 0, other: 0 }
        });
        toast({ title: "Job Created", description: "New job has been added to the schedule." });
    }
  };

  const handleCreateClientInline = () => {
    if (!createClientForm.name.trim()) return;

    // Capture the new client id so we can auto-select it in the job form
    const nextId = `CL-${String(clients.length + 1).padStart(6, '0')}`;

    addClient({
      name: createClientForm.name.trim(),
      email: createClientForm.email,
      phone: createClientForm.phone,
      billingAddress: createClientForm.billingAddress,
    });

    // Auto-select the freshly created client
    setCreateForm((prev) => ({ ...prev, clientId: nextId }));

    // Reset + close
    setCreateClientForm({ name: "", email: "", phone: "", billingAddress: "" });
    setIsCreateClientOpen(false);

    toast({ title: "Client Created", description: `${createClientForm.name.trim()} has been added.` });
  };

  const filteredJobs = jobs.filter(j => {
    const matchesSearch = j.title.toLowerCase().includes(search.toLowerCase()) || j.jobId.toLowerCase().includes(search.toLowerCase());
    const isCompleted = j.status === "Completed" || j.status === "Cancelled";
    
    if (!showCompleted && isCompleted) return false;

    const jobDate = new Date(j.startAt);
    const startFilter = new Date(dateFilter.start);
    const endFilter = new Date(dateFilter.end);
    // Simple date range check
    const inDateRange = jobDate >= startFilter && jobDate <= endFilter;

    return matchesSearch && inDateRange;
  }).sort((a, b) => {
    // Sort Order: Active -> Planned -> Completed
    const statusOrder = { "Active": 0, "Planned": 1, "Completed": 2, "Cancelled": 3 };
    const scoreA = statusOrder[a.status] ?? 99;
    const scoreB = statusOrder[b.status] ?? 99;

    if (scoreA !== scoreB) return scoreA - scoreB;

    // Within group, sort by date
    return new Date(a.startAt).getTime() - new Date(b.startAt).getTime();
  });

  return (
    <Layout>
      <div className="space-y-6 max-w-6xl mx-auto" data-testid="page-jobs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Jobs</h2>
            <p className="text-muted-foreground mt-1">Manage scheduled work, assignments, and status.</p>
          </div>
          <Button onClick={() => setIsCreateOpen(true)}>
            <Plus className="mr-2 h-4 w-4" /> Create Job
          </Button>
        </div>

        {/* Filters */}
        <div className="flex flex-col md:flex-row gap-4 items-end md:items-center bg-slate-50 dark:bg-slate-900/50 p-4 rounded-lg border border-slate-200 dark:border-slate-800">
            <div className="flex-1 w-full relative">
                 <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                 <Input placeholder="Search jobs..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 bg-background" />
            </div>
            <div className="flex gap-2 items-center">
                <div className="flex items-center gap-2 border rounded-md px-3 py-2 bg-background">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <Input 
                        type="date" 
                        className="h-6 w-auto border-0 p-0 focus-visible:ring-0" 
                        value={dateFilter.start}
                        onChange={(e) => setDateFilter({...dateFilter, start: e.target.value})}
                    />
                    <span className="text-muted-foreground">-</span>
                    <Input 
                        type="date" 
                        className="h-6 w-auto border-0 p-0 focus-visible:ring-0" 
                        value={dateFilter.end}
                        onChange={(e) => setDateFilter({...dateFilter, end: e.target.value})}
                    />
                </div>
                <div className="flex items-center space-x-2 border rounded-md px-3 py-2 bg-background h-10">
                    <Checkbox id="show-completed" checked={showCompleted} onCheckedChange={(c) => setShowCompleted(!!c)} />
                    <label
                        htmlFor="show-completed"
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                    >
                        Show Completed
                    </label>
                </div>
            </div>
        </div>

        {filteredJobs.length === 0 ? (
            <div className="text-center py-12 border-2 border-dashed rounded-lg bg-slate-50 dark:bg-slate-900/50">
                <div className="mx-auto w-12 h-12 rounded-full bg-slate-200 dark:bg-slate-800 flex items-center justify-center mb-4">
                <FileText className="h-6 w-6 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-medium">No jobs found</h3>
                <p className="text-muted-foreground mb-4">Adjust filters or create a job to get started.</p>
                <Button onClick={() => setIsCreateOpen(true)}>Create Job</Button>
            </div>
        ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredJobs.map((job) => (
                <Card
                  key={job.id}
                  className="cursor-pointer hover:border-primary/50"
                  onClick={() => setLocation(`/jobs/${job.id}`)}
                  data-testid={`card-job-${job.id}`}
                >
                <CardHeader className="pb-3">
                    <div className="flex justify-between items-start">
                    <div className="min-w-0 pr-3">
                        <CardTitle className="text-lg leading-snug truncate" title={job.title} data-testid={`text-job-title-${job.id}`}>{job.title}</CardTitle>
                        <CardDescription className="font-mono text-xs truncate" data-testid={`text-job-id-${job.id}`}>{job.jobId}</CardDescription>
                    </div>
                    <Badge className="shrink-0" variant={job.status === 'Active' ? 'default' : job.status === 'Completed' ? 'secondary' : 'outline'} data-testid={`badge-job-status-${job.id}`}>{job.status}</Badge>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="space-y-2 text-sm text-muted-foreground">
                    <div className="flex items-center gap-2 font-medium text-foreground">
                        <Building2 className="h-4 w-4" /> {clients.find(c => c.id === job.clientId)?.name || "Unknown Client"}
                    </div>
                    <div className="flex items-center gap-2"><MapPin className="h-4 w-4" /> {job.locationAddress}</div>
                    <div className="flex items-center gap-2"><Calendar className="h-4 w-4" /> {new Date(job.startAt).toLocaleDateString()}</div>
                    </div>
                </CardContent>
                </Card>
            ))}
            </div>
        )}

        {/* Create Job Dialog */}
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Create New Job</DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                        <Label>Job Title</Label>
                        <Input value={createForm.title} onChange={(e) => setCreateForm({...createForm, title: e.target.value})} placeholder="e.g. Site Renovation" data-testid="input-job-title" />
                    </div>
                    <div className="grid gap-2">
                        <Label>Client</Label>
                        <div className="flex gap-2 items-center">
                          <div className="flex-1">
                            <Select value={createForm.clientId} onValueChange={(v) => {
                              if (v === "__create__") {
                                setIsCreateClientOpen(true);
                                return;
                              }
                              setCreateForm({ ...createForm, clientId: v });
                            }}>
                              <SelectTrigger data-testid="select-client">
                                <SelectValue placeholder="Select a client" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="__create__" data-testid="select-item-create-client">
                                  <span className="flex items-center gap-2">
                                    <Plus className="h-4 w-4" /> Create a client…
                                  </span>
                                </SelectItem>
                                {clients.map((c) => (
                                  <SelectItem key={c.id} value={c.id} data-testid={`select-item-client-${c.id}`}>
                                    {c.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        {clients.length === 0 && <p className="text-xs text-red-500" data-testid="status-no-clients">You need to create a client first.</p>}
                    </div>

                    {/* Inline Create Client Dialog */}
                    <Dialog open={isCreateClientOpen} onOpenChange={setIsCreateClientOpen}>
                      <DialogContent className="sm:max-w-[520px]">
                        <DialogHeader>
                          <DialogTitle>Create Client</DialogTitle>
                        </DialogHeader>
                        <div className="grid gap-3 py-2">
                          <div className="grid gap-2">
                            <Label>Name</Label>
                            <Input
                              value={createClientForm.name}
                              onChange={(e) => setCreateClientForm({ ...createClientForm, name: e.target.value })}
                              placeholder="e.g. HSS Limited"
                              data-testid="input-client-name"
                            />
                          </div>
                          <div className="grid gap-2">
                            <Label>Email</Label>
                            <Input
                              value={createClientForm.email}
                              onChange={(e) => setCreateClientForm({ ...createClientForm, email: e.target.value })}
                              placeholder="accounts@example.com"
                              data-testid="input-client-email"
                            />
                          </div>
                          <div className="grid gap-2">
                            <Label>Phone</Label>
                            <Input
                              value={createClientForm.phone}
                              onChange={(e) => setCreateClientForm({ ...createClientForm, phone: e.target.value })}
                              placeholder="0161 555 0101"
                              data-testid="input-client-phone"
                            />
                          </div>
                          <div className="grid gap-2">
                            <Label>Billing Address</Label>
                            <Input
                              value={createClientForm.billingAddress}
                              onChange={(e) => setCreateClientForm({ ...createClientForm, billingAddress: e.target.value })}
                              placeholder="Street, City, Postcode"
                              data-testid="input-client-billing-address"
                            />
                          </div>
                        </div>
                        <DialogFooter>
                          <Button variant="outline" onClick={() => setIsCreateClientOpen(false)} data-testid="button-client-cancel">Cancel</Button>
                          <Button onClick={handleCreateClientInline} disabled={!createClientForm.name.trim()} data-testid="button-client-create">Create Client</Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>

                    <div className="grid grid-cols-2 gap-4">
                         <div className="grid gap-2">
                            <Label>Status</Label>
                            <Select value={createForm.status} onValueChange={(v) => setCreateForm({...createForm, status: v})}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Planned">Planned</SelectItem>
                                    <SelectItem value="Active">Active</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="grid gap-2">
                            <Label>Priority</Label>
                            <Select value={createForm.priority} onValueChange={(v) => setCreateForm({...createForm, priority: v})}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Low">Low</SelectItem>
                                    <SelectItem value="Medium">Medium</SelectItem>
                                    <SelectItem value="High">High</SelectItem>
                                    <SelectItem value="Critical">Critical</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <div className="grid gap-2">
                        <Label>Location</Label>
                        <Input value={createForm.locationAddress} onChange={(e) => setCreateForm({...createForm, locationAddress: e.target.value})} placeholder="123 Work Site Blvd" />
                    </div>
                    <div className="grid gap-2">
                        <Label>Project Manager</Label>
                        <Select value={createForm.managerId} onValueChange={(v) => setCreateForm({...createForm, managerId: v})}>
                            <SelectTrigger><SelectValue placeholder="Select PM (Optional)" /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="none">None</SelectItem>
                                {users.filter(u => u.roleIds?.includes("role-pm") || u.roleIds?.includes("drole-pm")).map(u => (
                                    <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="grid gap-2">
                            <Label>Start Date</Label>
                            <Input type="date" value={createForm.startAt} onChange={(e) => setCreateForm({...createForm, startAt: e.target.value})} />
                        </div>
                        <div className="grid gap-2">
                            <Label>End Date</Label>
                            <Input type="date" value={createForm.endAt} onChange={(e) => setCreateForm({...createForm, endAt: e.target.value})} />
                        </div>
                    </div>

                    <div className="border-t pt-4 mt-2">
                        <Label className="mb-2 block font-semibold">Cost Breakdown (Estimates)</Label>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="grid gap-2">
                                <Label className="text-xs">Labour</Label>
                                <Input data-testid="input-cost-labour" type="number" value={createForm.costs.labour} onChange={(e) => setCreateForm({...createForm, costs: {...createForm.costs, labour: Number(e.target.value)}})} />
                            </div>
                            <div className="grid gap-2">
                                <Label className="text-xs">Materials</Label>
                                <Input data-testid="input-cost-materials" type="number" value={createForm.costs.materials} onChange={(e) => setCreateForm({...createForm, costs: {...createForm.costs, materials: Number(e.target.value)}})} />
                            </div>
                            <div className="grid gap-2">
                                <Label className="text-xs">Other</Label>
                                <Input data-testid="input-cost-other" type="number" value={createForm.costs.other} onChange={(e) => setCreateForm({...createForm, costs: {...createForm.costs, other: Number(e.target.value)}})} />
                            </div>
                        </div>
                        <p className="mt-2 text-xs text-muted-foreground" data-testid="text-cost-note">
                          Equipment cost is calculated from assigned equipment, not entered manually.
                        </p>
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
                    <Button onClick={handleCreate} disabled={!createForm.title || !createForm.clientId}>Create Job</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}

function Building2(props: any) {
  return (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-building-2"><path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z"/><path d="M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2"/><path d="M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2"/><path d="M10 6h4"/><path d="M10 10h4"/><path d="M10 14h4"/><path d="M10 18h4"/></svg>
  );
}
