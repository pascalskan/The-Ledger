import { Layout } from "@/components/layout";
import { useStore, Worker } from "@/lib/mockData";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, Trash2, Edit } from "lucide-react";
import { useLocation } from "wouter";
import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel } from "@/components/ui/form";

const workerSchema = z.object({
  firstName: z.string().min(2),
  lastName: z.string().min(2),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().min(5),
  roleIds: z.array(z.string()).min(1, "Select at least one role"),
  status: z.enum(["Active", "Inactive"]),
});

export default function WorkersPage() {
  const { workers, addWorker, updateWorker, deleteWorker, roles } = useStore();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [, setLocation] = useLocation();
  const [editingWorker, setEditingWorker] = useState<Worker | null>(null);
  const [search, setSearch] = useState("");

  const form = useForm<z.infer<typeof workerSchema>>({
    resolver: zodResolver(workerSchema),
    defaultValues: { status: "Active", roleIds: [] }
  });

  const editForm = useForm<z.infer<typeof workerSchema>>({
    resolver: zodResolver(workerSchema)
  });

  useEffect(() => {
    if (editingWorker) {
      editForm.reset({
        firstName: editingWorker.firstName,
        lastName: editingWorker.lastName,
        email: editingWorker.email || "",
        phone: editingWorker.phone,
        roleIds: editingWorker.roleIds || [],
        status: editingWorker.status,
      });
    }
  }, [editingWorker, editForm]);

  const onCreateSubmit = (values: z.infer<typeof workerSchema>) => {
    addWorker({
      ...values,
      documents: [],
    });
    setIsCreateOpen(false);
    form.reset({ status: "Active", roleIds: [] });
  };

  const onEditSubmit = (values: z.infer<typeof workerSchema>) => {
    if (editingWorker) {
      updateWorker(editingWorker.id, values);
      setEditingWorker(null);
    }
  };

  const filteredWorkers = workers.filter(w => 
    w.firstName.toLowerCase().includes(search.toLowerCase()) || 
    w.lastName.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Workers</h2>
            <p className="text-muted-foreground mt-1">Manage your workforce.</p>
          </div>
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
            <Button data-testid="button-open-create-worker">
              <Plus className="mr-2 h-4 w-4" /> Add Worker
            </Button>
          </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Add New Worker</DialogTitle></DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onCreateSubmit)} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <FormField control={form.control} name="firstName" render={({ field }) => (
                      <FormItem>
                        <FormLabel>First Name</FormLabel>
                        <FormControl><Input data-testid="input-worker-firstName" {...field} /></FormControl>
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="lastName" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Last Name</FormLabel>
                        <FormControl><Input data-testid="input-worker-lastName" {...field} /></FormControl>
                      </FormItem>
                    )} />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <FormField control={form.control} name="email" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl><Input data-testid="input-worker-email" type="email" placeholder="name@company.com" {...field} /></FormControl>
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="phone" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Phone</FormLabel>
                        <FormControl><Input data-testid="input-worker-phone" placeholder="e.g. 07..." {...field} /></FormControl>
                      </FormItem>
                    )} />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <FormField control={form.control} name="roleIds" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Roles</FormLabel>
                        <div className="rounded-md border p-2 bg-background" data-testid="multiselect-worker-roles">
                          <div className="space-y-2">
                            {roles.map((r) => {
                              const checked = (field.value || []).includes(r.id);
                              return (
                                <label key={r.id} className="flex items-center gap-2 text-sm cursor-pointer select-none" data-testid={`checkbox-worker-role-${r.id}`}>
                                  <input
                                    data-testid={`input-worker-role-${r.id}`}
                                    type="checkbox"
                                    className="h-4 w-4"
                                    checked={checked}
                                    onChange={(e) => {
                                      const next = new Set(field.value || []);
                                      if (e.target.checked) next.add(r.id);
                                      else next.delete(r.id);
                                      field.onChange(Array.from(next));
                                    }}
                                  />
                                  <span className="font-medium">{r.name}</span>
                                </label>
                              );
                            })}
                          </div>
                        </div>
                      </FormItem>
                    )} />

                    <FormField control={form.control} name="status" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Status</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-worker-status"><SelectValue /></SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {(["Active", "Inactive"] as const).map(s => (
                              <SelectItem key={s} value={s} data-testid={`option-worker-status-${s}`}>{s}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </FormItem>
                    )} />
                  </div>

                  <DialogFooter>
                    <Button data-testid="button-submit-create-worker" type="submit">Add Worker</Button>
                  </DialogFooter>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>

        <div className="relative max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input data-testid="input-search-workers" placeholder="Search workers..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>

        <div className="border rounded-md">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Worker</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredWorkers.map((worker) => (
                <TableRow
                  key={worker.id}
                  className="cursor-pointer"
                  onClick={() => setLocation(`/workers/${worker.id}`)}
                  data-testid={`row-worker-${worker.id}`}
                >
                  <TableCell className="font-medium">{worker.firstName} {worker.lastName}</TableCell>
                  <TableCell><Badge variant="outline">{worker.roleIds.map(rid => roles.find(r => r.id === rid)?.name).filter(Boolean).join(", ") || "—"}</Badge></TableCell>
                  <TableCell><Badge variant={worker.status === 'Active' ? 'default' : 'secondary'}>{worker.status}</Badge></TableCell>
                  <TableCell className="text-right flex justify-end gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={(e) => { e.stopPropagation(); setLocation(`/workers/${worker.id}`); }}
                      data-testid={`button-edit-worker-${worker.id}`}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={(e) => { e.stopPropagation(); deleteWorker(worker.id); }}
                      data-testid={`button-delete-worker-${worker.id}`}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </Layout>
  );
}
