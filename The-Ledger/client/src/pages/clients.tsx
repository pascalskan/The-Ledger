import { Layout } from "@/components/layout";
import { PageHeader } from "@/components/page-shell";
import { useStore, Client } from "@/lib/mockData";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, Mail, Phone, Pencil, Trash2, Save, X } from "lucide-react";
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

export default function ClientsPage() {
  const { clients, jobs, invoices, addClient, updateClient, deleteClient } = useStore();
  const [search, setSearch] = useState("");
  const [, setLocation] = useLocation();
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const { toast } = useToast();

  // Edit Form State
  const [editForm, setEditForm] = useState<Partial<Client>>({});
  
  // Create Form State
  const [createForm, setCreateForm] = useState({
    name: "",
    email: "",
    phone: "",
    billingAddress: ""
  });

  const filteredClients = clients.filter(c => 
    c.name.toLowerCase().includes(search.toLowerCase()) || 
    c.clientId.toLowerCase().includes(search.toLowerCase())
  );

  const handleEditClick = (client: Client) => {
    setEditForm(client);
    setIsEditing(true);
  };

  const handleSaveEdit = () => {
    if (selectedClient && editForm) {
      updateClient(selectedClient.id, editForm);
      setSelectedClient({ ...selectedClient, ...editForm } as Client);
      setIsEditing(false);
      toast({ title: "Client Updated", description: "Changes have been saved." });
    }
  };

  const handleDelete = () => {
    if (selectedClient) {
      if (confirm("Are you sure you want to delete this client?")) {
        deleteClient(selectedClient.id);
        setSelectedClient(null);
        toast({ title: "Client Deleted", variant: "destructive" });
      }
    }
  };

  const handleCreate = () => {
    if (createForm.name) {
      addClient(createForm);
      setCreateForm({ name: "", email: "", phone: "", billingAddress: "" });
      setIsCreateOpen(false);
      toast({ title: "Client Created", description: `${createForm.name} has been added.` });
    }
  };

  return (
    <Layout>
      <div className="space-y-6">
        <PageHeader
          title="Clients"
          description="Manage customer profiles and history."
          actions={
            <Button onClick={() => setIsCreateOpen(true)}>
              <Plus className="mr-2 h-4 w-4" /> Add Client
            </Button>
          }
        />

        <div className="relative max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search clients..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>

        {filteredClients.length === 0 ? (
           <div className="text-center py-12 border-2 border-dashed rounded-lg bg-muted dark:bg-slate-900/50">
             <div className="mx-auto w-12 h-12 rounded-full bg-slate-200 dark:bg-slate-800 flex items-center justify-center mb-4">
               <Search className="h-6 w-6 text-muted-foreground" />
             </div>
             <h3 className="text-lg font-medium">No clients found</h3>
             <p className="text-muted-foreground mb-4">Get started by creating your first client.</p>
             <Button onClick={() => setIsCreateOpen(true)}>Create Client</Button>
           </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredClients.map((client) => (
              <Card
                key={client.id}
                className="cursor-pointer hover:border-primary/50 transition-colors"
                onClick={() => setLocation(`/clients/${client.id}`)}
                data-testid={`card-client-${client.id}`}
              >
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <CardTitle className="truncate pr-2">{client.name}</CardTitle>
                    <Badge variant="outline" className="font-mono flex-shrink-0">{client.clientId}</Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-sm text-muted-foreground">
                    <div className="flex items-center gap-2 truncate"><Mail className="h-4 w-4" /> {client.email}</div>
                    <div className="flex items-center gap-2 truncate"><Phone className="h-4 w-4" /> {client.phone}</div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}


        {/* Create Client Dialog */}
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Client</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Client Name</Label>
                <Input value={createForm.name} onChange={(e) => setCreateForm({...createForm, name: e.target.value})} placeholder="e.g. Acme Corp" />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input value={createForm.email} onChange={(e) => setCreateForm({...createForm, email: e.target.value})} placeholder="contact@example.com" />
              </div>
              <div className="space-y-2">
                <Label>Phone</Label>
                <Input value={createForm.phone} onChange={(e) => setCreateForm({...createForm, phone: e.target.value})} placeholder="555-0123" />
              </div>
              <div className="space-y-2">
                <Label>Billing Address</Label>
                <Input value={createForm.billingAddress} onChange={(e) => setCreateForm({...createForm, billingAddress: e.target.value})} placeholder="123 Business Rd" />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
              <Button onClick={handleCreate}>Create Client</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}
