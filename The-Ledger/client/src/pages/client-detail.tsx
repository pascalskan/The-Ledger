import { Layout } from "@/components/layout";
import { useStore } from "@/lib/mockData";
import { useRoute, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Mail, Phone, Building2, Save, X, FileText, Upload, Link2, Trash2, Tag, BadgeCheck, CircleSlash, HandCoins, MessageSquareText, PhoneCall, Send, StickyNote, ShieldCheck, Users, Eye, KeyRound, Clock, BadgeDollarSign } from "lucide-react";
import { useMemo, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/mockData";
import {
  getPortalAccountsByClient,
  createPortalAccount,
  disablePortalAccount,
  reactivatePortalAccount,
} from "@/lib/portalAuth";

const DOC_LABEL: Record<string, string> = {
  contract: "Contract",
  purchase_order: "Purchase order",
  credit_application: "Credit application",
  insurance: "Insurance",
  site_induction: "Site induction",
  access_requirements: "Access requirements",
  nda: "NDA",
  other: "Other",
};

const DOC_STATUS_BADGE: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
  Required: "destructive",
  Received: "secondary",
  Approved: "default",
  Expired: "outline",
};

export default function ClientDetailPage() {
  const { clients, jobs, invoices, updateClient } = useStore();
  const [match, params] = useRoute("/clients/:id");
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    name: "",
    email: "",
    phone: "",
    billingAddress: "",
  });

  const [newDoc, setNewDoc] = useState({
    name: "",
    type: "contract",
    status: "Required",
    url: "#",
    expiryDate: "",
  });

  if (!match || !params?.id) {
    return (
      <Layout>
        <div className="space-y-4" data-testid="status-client-not-found">
          <p className="text-sm text-muted-foreground">Invalid client URL.</p>
          <Button
            variant="outline"
            onClick={() => setLocation("/clients")}
            data-testid="button-back-clients-invalid"
          >
            Back to Clients
          </Button>
        </div>
      </Layout>
    );
  }

  const client = clients.find((c) => c.id === params.id);

  const startEdit = () => {
    if (!client) return;
    setEditForm({
      name: client.name,
      email: client.email,
      phone: client.phone,
      billingAddress: client.billingAddress,
    });
    setIsEditing(true);
  };

  const saveEdit = () => {
    if (!client) return;
    updateClient(client.id, {
      name: editForm.name.trim() || client.name,
      email: editForm.email.trim(),
      phone: editForm.phone.trim(),
      billingAddress: editForm.billingAddress.trim(),
    });
    toast({ title: "Client updated", description: "Details saved." });
    setIsEditing(false);
  };

  if (!client) {
    return (
      <Layout>
        <div className="space-y-4" data-testid="status-client-not-found">
          <h2 className="text-2xl font-semibold">Client not found</h2>
          <p className="text-muted-foreground">This client might have been deleted or does not exist.</p>
          <Button
            variant="outline"
            onClick={() => setLocation("/clients")}
            data-testid="button-back-clients-not-found"
          >
            Back to Clients
          </Button>
        </div>
      </Layout>
    );
  }

  const clientJobs = jobs.filter((j) => j.clientId === client.id);
  const clientInvoices = invoices.filter((i) => i.clientId === client.id);

  const rel = {
    status: ((client as any).status || "Active") as "Active" | "On Hold" | "Do Not Serve",
    tags: (((client as any).tags || []) as string[]),
    paymentTermsDays: ((client as any).paymentTermsDays ?? 14) as number,
  };

  const [relDraft, setRelDraft] = useState<{ status: "Active" | "On Hold" | "Do Not Serve"; tags: string; paymentTermsDays: string }>(() => ({
    status: rel.status,
    tags: rel.tags.join(", "),
    paymentTermsDays: String(rel.paymentTermsDays),
  }));

  const [activity, setActivity] = useState<{
    id: string;
    type: "note" | "call" | "email";
    title: string;
    body?: string;
    createdAt: string;
    priority?: "Low" | "Normal" | "High" | "Critical";
    pinned?: boolean;
  }[]>(() => {
    const seed = [
      {
        id: "act-pin-1",
        type: "note" as const,
        title: "Pinned\u00a0note",
        body: client.notes || "Trading hours and access requirements confirmed.",
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 14).toISOString(),
        priority: "High" as const,
        pinned: true as const,
      },
      {
        id: "act-2",
        type: "call" as const,
        title: "Call logged",
        body: "Agreed induction process and site access window.",
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 9).toISOString(),
        priority: "Normal" as const,
      },
    ];
    return seed;
  });

  const [newActivity, setNewActivity] = useState<{
    type: "note" | "call" | "email";
    title: string;
    body: string;
    priority: "Low" | "Normal" | "High" | "Critical";
    pin: boolean;
  }>({
    type: "note",
    title: "",
    body: "",
    priority: "Normal",
    pin: false,
  });

  const [activityFilter, setActivityFilter] = useState<"all" | "note" | "call" | "email">("all");
  const [activityPriorityOnly, setActivityPriorityOnly] = useState(false);

  // CL-2 — Portal account provisioning (CEO-only). Backed by portalAuth store.
  const { user } = useAuth();
  const isCEO = !!user?.roleIds?.[0]?.includes("ceo");
  const [portalRefresh, setPortalRefresh] = useState(0);
  const [newPortalEmail, setNewPortalEmail] = useState("");

  const totalBilled = clientInvoices.reduce(
    (sum, inv) => sum + inv.lineItems.reduce((s, i) => s + i.qty * i.unitPrice, 0),
    0
  );
  const totalPaid = clientInvoices
    .filter((i) => i.status === "Paid")
    .reduce((sum, inv) => sum + inv.lineItems.reduce((s, i) => s + i.qty * i.unitPrice, 0), 0);
  const outstanding = totalBilled - totalPaid;

  const docs = (client as any).documents || [];

  const requiredDocTypes = useMemo(
    () =>
      [
        { type: "contract", label: DOC_LABEL.contract },
        { type: "purchase_order", label: DOC_LABEL.purchase_order },
        { type: "insurance", label: DOC_LABEL.insurance },
        { type: "site_induction", label: DOC_LABEL.site_induction },
        { type: "access_requirements", label: DOC_LABEL.access_requirements },
      ] as const,
    []
  );

  const missingRequired = useMemo(() => {
    const present = new Set(docs.map((d: any) => d.type));
    return requiredDocTypes.filter((r) => !present.has(r.type));
  }, [docs, requiredDocTypes]);

  const addDocument = () => {
    if (!newDoc.name.trim()) {
      toast({ title: "Missing name", description: "Give the document a name.", variant: "destructive" });
      return;
    }

    const entry = {
      id: Math.random().toString(36).slice(2, 9),
      name: newDoc.name.trim(),
      type: newDoc.type,
      status: newDoc.status,
      url: newDoc.url?.trim() || "#",
      expiryDate: newDoc.expiryDate ? new Date(newDoc.expiryDate).toISOString().split("T")[0] : undefined,
      uploadedAt: new Date().toISOString(),
    };

    updateClient(client.id, {
      documents: [...docs, entry],
    } as any);

    setNewDoc({ name: "", type: "contract", status: "Required", url: "#", expiryDate: "" });
    toast({ title: "Document added", description: "Saved under this client." });
  };

  const markRequiredAsReceived = (type: string, label: string) => {
    const entry = {
      id: Math.random().toString(36).slice(2, 9),
      name: `${label} (received)`,
      type,
      status: "Received",
      url: "#",
      uploadedAt: new Date().toISOString(),
    };

    updateClient(client.id, {
      documents: [...docs, entry],
    } as any);

    toast({ title: "Added", description: `${label} marked as received.` });
  };

  const deleteDocument = (docId: string) => {
    updateClient(client.id, {
      documents: docs.filter((d: any) => d.id !== docId),
    } as any);
    toast({ title: "Removed", description: "Document removed." });
  };

  return (
    <Layout>
      <div className="space-y-6" data-testid={`page-client-${client.id}`}>
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="shrink-0">
              {rel.status === "Do Not Serve" ? (
                <Badge variant="destructive" data-testid="badge-client-status">Do Not Serve</Badge>
              ) : rel.status === "On Hold" ? (
                <Badge variant="secondary" data-testid="badge-client-status">On Hold</Badge>
              ) : (
                <Badge variant="outline" data-testid="badge-client-status">Active</Badge>
              )}
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setLocation("/clients")}
              data-testid="button-back-clients"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="font-mono" data-testid="badge-client-id">
                  {client.clientId}
                </Badge>
              </div>

              {!isEditing ? (
                <button
                  type="button"
                  className="text-left"
                  onClick={startEdit}
                  data-testid="button-client-start-edit"
                >
                  <h1 className="text-2xl font-bold mt-1 hover:underline" data-testid="text-client-name">
                    {client.name}
                  </h1>
                </button>
              ) : (
                <div className="mt-2 grid gap-2">
                  <Label className="text-xs">Client name</Label>
                  <Input
                    data-testid="input-client-name-edit"
                    value={editForm.name}
                    onChange={(e) => setEditForm((p) => ({ ...p, name: e.target.value }))}
                  />
                </div>
              )}
            </div>
          </div>

          {!isEditing ? (
            <></>
          ) : (
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={() => setIsEditing(false)} data-testid="button-client-cancel">
                <X className="h-4 w-4 mr-2" /> Cancel
              </Button>
              <Button onClick={saveEdit} data-testid="button-client-save">
                <Save className="h-4 w-4 mr-2" /> Save
              </Button>
            </div>
          )}
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          <Card className="md:col-span-2">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2">
                  <BadgeCheck className="h-4 w-4" /> Relationship
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                {rel.status === "Do Not Serve" && (
                  <div
                    className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-destructive"
                    data-testid="banner-client-dns"
                  >
                    <div className="flex items-start gap-2">
                      <CircleSlash className="h-4 w-4 mt-0.5" />
                      <div className="text-xs leading-snug" data-testid="text-client-dns-body">
                        New work should not be created for this client.
                      </div>
                    </div>
                  </div>
                )}

                <div className="rounded-lg border bg-muted/30 p-3" data-testid="card-client-portal">
                  {(() => {
                    const portalAccounts = getPortalAccountsByClient(client.id);
                    // portalRefresh is read to re-derive after a mutation.
                    void portalRefresh;

                    const statusBadge = (status: string) =>
                      status === "Active" ? "default" : status === "Pending" ? "secondary" : "outline";

                    const handleCreate = () => {
                      const trimmed = newPortalEmail.trim();
                      if (!trimmed) {
                        toast({ title: "Email required", description: "Enter the client user's email.", variant: "destructive" });
                        return;
                      }
                      createPortalAccount({
                        clientId: client.id,
                        email: trimmed,
                        provisionedBy: user?.email || "ceo",
                        status: "Pending",
                      });
                      setNewPortalEmail("");
                      setPortalRefresh((n) => n + 1);
                      toast({ title: "Portal account created", description: `${trimmed} provisioned (Pending).` });
                    };

                    return (
                      <>
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <ShieldCheck className="h-4 w-4 text-muted-foreground" />
                              <div className="text-sm font-semibold" data-testid="text-client-portal-title">Portal Accounts</div>
                              <Badge variant="secondary" className="text-xs" data-testid="badge-client-portal-count">
                                {portalAccounts.length} user{portalAccounts.length === 1 ? "" : "s"}
                              </Badge>
                            </div>
                            <div className="mt-1 text-xs text-muted-foreground" data-testid="text-client-portal-subtitle">
                              Provision read-only portal access for this client. CEO-only.
                            </div>
                          </div>
                        </div>

                        {!isCEO && (
                          <div
                            className="mt-3 rounded-md border bg-background px-3 py-2 text-xs text-muted-foreground"
                            data-testid="text-client-portal-ceo-only"
                          >
                            Only the CEO can provision or change portal access. You have read-only visibility of portal users.
                          </div>
                        )}

                        <div className="mt-3 space-y-2" data-testid="list-client-portal-accounts">
                          {portalAccounts.length === 0 && (
                            <div className="text-xs text-muted-foreground" data-testid="text-client-portal-no-accounts">
                              No portal accounts yet.
                            </div>
                          )}
                          {portalAccounts.map((acc) => (
                            <div
                              key={acc.id}
                              className="flex items-center justify-between gap-3 rounded-md border bg-background px-3 py-2"
                              data-testid={`row-client-portal-account-${acc.id}`}
                            >
                              <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                  <KeyRound className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                                  <span className="text-sm font-medium truncate" data-testid={`text-portal-account-email-${acc.id}`}>
                                    {acc.email}
                                  </span>
                                  <Badge variant={statusBadge(acc.status) as any} className="text-xs" data-testid={`badge-portal-account-status-${acc.id}`}>
                                    {acc.status}
                                  </Badge>
                                </div>
                                <div className="mt-0.5 text-[11px] text-muted-foreground" data-testid={`text-portal-account-last-login-${acc.id}`}>
                                  <Clock className="inline h-3 w-3 mr-1" />
                                  {acc.lastLoginAt ? `Last login ${new Date(acc.lastLoginAt).toLocaleDateString()}` : "Never signed in"}
                                </div>
                              </div>

                              {isCEO && (
                                <div className="flex items-center gap-2 shrink-0">
                                  {acc.status === "Disabled" ? (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="h-8"
                                      onClick={() => {
                                        reactivatePortalAccount(acc.id);
                                        setPortalRefresh((n) => n + 1);
                                        toast({ title: "Account reactivated", description: `${acc.email} can sign in again.` });
                                      }}
                                      data-testid={`button-portal-account-reactivate-${acc.id}`}
                                    >
                                      Reactivate
                                    </Button>
                                  ) : (
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      className="h-8 text-destructive"
                                      onClick={() => {
                                        disablePortalAccount(acc.id);
                                        setPortalRefresh((n) => n + 1);
                                        toast({ title: "Account disabled", description: `${acc.email} can no longer sign in.` });
                                      }}
                                      data-testid={`button-portal-account-disable-${acc.id}`}
                                    >
                                      <CircleSlash className="h-4 w-4 mr-1" /> Disable
                                    </Button>
                                  )}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>

                        {isCEO && (
                          <div className="mt-3 flex items-end gap-2" data-testid="form-client-portal-create">
                            <div className="flex-1">
                              <Label className="text-xs">New portal user email</Label>
                              <Input
                                className="mt-1 h-9"
                                type="email"
                                value={newPortalEmail}
                                onChange={(e) => setNewPortalEmail(e.target.value)}
                                placeholder="name@client.com"
                                data-testid="input-client-portal-new-email"
                              />
                            </div>
                            <Button size="sm" className="h-9" onClick={handleCreate} data-testid="button-client-portal-create">
                              <Send className="h-4 w-4 mr-2" /> Create account
                            </Button>
                          </div>
                        )}

                        <div className="mt-2 text-[11px] text-muted-foreground" data-testid="text-client-portal-note">
                          Mock provisioning: accounts are created in a frontend-only store. New accounts start as Pending until activated.
                        </div>
                      </>
                    );
                  })()}
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Status</Label>
                    <select
                      className="h-9 w-full rounded-md border bg-background px-3 text-sm"
                      value={relDraft.status}
                      onChange={(e) => setRelDraft((p) => ({ ...p, status: e.target.value as any }))}
                      data-testid="select-client-relationship-status"
                    >
                      {(["Active", "On Hold", "Do Not Serve"] as const).map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs">Terms (days)</Label>
                    <Input
                      inputMode="numeric"
                      value={relDraft.paymentTermsDays}
                      onChange={(e) => setRelDraft((p) => ({ ...p, paymentTermsDays: e.target.value }))}
                      placeholder="14"
                      data-testid="input-client-relationship-payment-terms"
                    />
                  </div>

                  <div className="space-y-1.5 md:col-span-2">
                    <Label className="text-xs">Tags</Label>
                    <Input
                      value={relDraft.tags}
                      onChange={(e) => setRelDraft((p) => ({ ...p, tags: e.target.value }))}
                      placeholder="Kitchen, Night shift"
                      data-testid="input-client-relationship-tags"
                    />
                    <div className="mt-2 flex flex-wrap gap-2" data-testid="list-client-relationship-tags">
                      {(relDraft.tags || "")
                        .split(",")
                        .map((t) => t.trim())
                        .filter(Boolean)
                        .slice(0, 8)
                        .map((t) => (
                          <Badge key={t} variant="secondary" className="gap-1" data-testid={`tag-client-${t}`}>
                            <Tag className="h-3.5 w-3.5" /> {t}
                          </Badge>
                        ))}
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-1">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setRelDraft({
                        status: rel.status,
                        tags: rel.tags.join(", "),
                        paymentTermsDays: String(rel.paymentTermsDays),
                      })
                    }
                    data-testid="button-client-relationship-reset"
                  >
                    Reset
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => {
                      const parsedDays = Number(relDraft.paymentTermsDays);
                      updateClient(client.id, {
                        status: relDraft.status,
                        tags: relDraft.tags
                          .split(",")
                          .map((t) => t.trim())
                          .filter(Boolean),
                        paymentTermsDays: Number.isFinite(parsedDays) && parsedDays > 0 ? parsedDays : rel.paymentTermsDays,
                      } as any);
                      toast({ title: "Relationship updated", description: "Saved for this session." });
                    }}
                    data-testid="button-client-relationship-save"
                  >
                    Save
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card className="md:col-span-2">
              <CardHeader className="pb-3">
                <CardTitle>Contact</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                {!isEditing ? (
                  <>
                    <div className="flex items-center gap-2" data-testid="text-client-email">
                      <Mail className="h-4 w-4" /> {client.email}
                    </div>
                    <div className="flex items-center gap-2" data-testid="text-client-phone">
                      <Phone className="h-4 w-4" /> {client.phone}
                    </div>
                    <div className="flex items-center gap-2" data-testid="text-client-address">
                      <Building2 className="h-4 w-4" /> {client.billingAddress}
                    </div>
                  </>
                ) : (
                  <div className="grid gap-3">
                    <div className="grid gap-2">
                      <Label className="text-xs">Email</Label>
                      <Input
                        data-testid="input-client-email-edit"
                        value={editForm.email}
                        onChange={(e) => setEditForm((p) => ({ ...p, email: e.target.value }))}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label className="text-xs">Phone</Label>
                      <Input
                        data-testid="input-client-phone-edit"
                        value={editForm.phone}
                        onChange={(e) => setEditForm((p) => ({ ...p, phone: e.target.value }))}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label className="text-xs">Billing address</Label>
                      <Input
                        data-testid="input-client-address-edit"
                        value={editForm.billingAddress}
                        onChange={(e) => setEditForm((p) => ({ ...p, billingAddress: e.target.value }))}
                      />
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 md:grid-cols-5">
            <Card className="md:col-span-3">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                  <HandCoins className="h-4 w-4" /> Financial Summary
                </CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-3 gap-3 text-sm">
                <div className="space-y-0.5">
                  <span className="text-xs text-muted-foreground">Total Billed</span>
                  <p className="text-lg font-semibold" data-testid="text-client-total-billed">
                    ${totalBilled.toLocaleString()}
                  </p>
                </div>
                <div className="space-y-0.5">
                  <span className="text-xs text-muted-foreground">Paid</span>
                  <p className="text-lg font-semibold text-green-600" data-testid="text-client-total-paid">
                    ${totalPaid.toLocaleString()}
                  </p>
                </div>
                <div className="space-y-0.5">
                  <span className="text-xs text-muted-foreground">Outstanding</span>
                  <p className="text-lg font-semibold text-red-600" data-testid="text-client-outstanding">
                    ${outstanding.toLocaleString()}
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className="md:col-span-2">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold">Invoices</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                {clientInvoices.length === 0 && (
                  <p className="text-muted-foreground" data-testid="text-client-no-invoices">
                    No invoices yet.
                  </p>
                )}
                {clientInvoices.slice(0, 3).map((inv) => (
                  <div
                    key={inv.id}
                    className="flex justify-between items-center border rounded px-3 py-2 bg-slate-50 dark:bg-slate-900 cursor-pointer hover:bg-muted/50"
                    data-testid={`row-client-invoice-${inv.id}`}
                    onClick={() => setLocation(`/invoices/${inv.id}`)}
                  >
                    <span className="font-mono text-xs hover:underline">{inv.invoiceId}</span>
                    <Badge
                      variant={inv.status === "Overdue" ? "destructive" : "default"}
                      data-testid={`badge-client-invoice-status-${inv.id}`}
                    >
                      {inv.status}
                    </Badge>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <MessageSquareText className="h-4 w-4" /> Activity
                  </CardTitle>
                  <div className="text-xs text-muted-foreground" data-testid="text-client-activity-subtitle">
                    Notes, calls, and emails for this client (session-only).
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <div className="inline-flex rounded-md border bg-background p-1" data-testid="segmented-client-activity-filter">
                    <button
                      type="button"
                      className={`px-2.5 py-1 text-xs rounded-sm transition ${activityFilter === "all" ? "bg-muted" : "hover:bg-muted/60"}`}
                      onClick={() => setActivityFilter("all")}
                      data-testid="button-client-activity-filter-all"
                    >
                      All
                    </button>
                    <button
                      type="button"
                      className={`px-2.5 py-1 text-xs rounded-sm transition ${activityFilter === "note" ? "bg-muted" : "hover:bg-muted/60"}`}
                      onClick={() => setActivityFilter("note")}
                      data-testid="button-client-activity-filter-notes"
                    >
                      Notes
                    </button>
                    <button
                      type="button"
                      className={`px-2.5 py-1 text-xs rounded-sm transition ${activityFilter === "call" ? "bg-muted" : "hover:bg-muted/60"}`}
                      onClick={() => setActivityFilter("call")}
                      data-testid="button-client-activity-filter-calls"
                    >
                      Calls
                    </button>
                    <button
                      type="button"
                      className={`px-2.5 py-1 text-xs rounded-sm transition ${activityFilter === "email" ? "bg-muted" : "hover:bg-muted/60"}`}
                      onClick={() => setActivityFilter("email")}
                      data-testid="button-client-activity-filter-emails"
                    >
                      Emails
                    </button>
                  </div>

                  <button
                    type="button"
                    className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-xs transition ${
                      activityPriorityOnly ? "bg-muted" : "bg-background hover:bg-muted/60"
                    }`}
                    onClick={() => setActivityPriorityOnly((p) => !p)}
                    data-testid="toggle-client-activity-priority"
                  >
                    <BadgeCheck className="h-3.5 w-3.5" /> High+
                  </button>
                </div>
              </div>
            </CardHeader>

            <CardContent className="space-y-3">
              <div className="grid gap-3 md:grid-cols-5">
                <div className="md:col-span-2 rounded-lg border bg-background p-3">
                  <div className="grid gap-2 md:grid-cols-12">
                    <div className="md:col-span-4">
                      <Label className="text-xs">Type</Label>
                      <select
                        className="mt-1 h-9 w-full rounded-md border bg-background px-3 text-sm"
                        value={newActivity.type}
                        onChange={(e) => setNewActivity((p) => ({ ...p, type: e.target.value as any }))}
                        data-testid="select-client-activity-type"
                      >
                        <option value="note">Note</option>
                        <option value="call">Call</option>
                        <option value="email">Email</option>
                      </select>
                    </div>

                    <div className="md:col-span-8">
                      <Label className="text-xs">Title</Label>
                      <Input
                        className="mt-1"
                        value={newActivity.title}
                        onChange={(e) => setNewActivity((p) => ({ ...p, title: e.target.value }))}
                        placeholder="e.g. Left voicemail about access"
                        data-testid="input-client-activity-title"
                      />
                    </div>

                    <div className="md:col-span-6">
                      <Label className="text-xs">Priority</Label>
                      <select
                        className="mt-1 h-9 w-full rounded-md border bg-background px-3 text-sm"
                        value={newActivity.priority}
                        onChange={(e) => setNewActivity((p) => ({ ...p, priority: e.target.value as any }))}
                        data-testid="select-client-activity-priority"
                      >
                        <option value="Low">Low</option>
                        <option value="Normal">Normal</option>
                        <option value="High">High</option>
                        <option value="Critical">Critical</option>
                      </select>
                    </div>

                    <div className="md:col-span-6 flex items-end gap-2">
                      <label className="flex items-center gap-2 text-xs text-muted-foreground" data-testid="toggle-client-activity-pin-wrap">
                        <input
                          type="checkbox"
                          checked={newActivity.pin}
                          onChange={(e) => setNewActivity((p) => ({ ...p, pin: e.target.checked }))}
                          data-testid="checkbox-client-activity-pin"
                        />
                        Pin
                      </label>
                      <Button
                        size="sm"
                        className="ml-auto"
                        onClick={() => {
                          if (!newActivity.title.trim()) {
                            toast({ title: "Missing title", description: "Add a short title for this activity.", variant: "destructive" });
                            return;
                          }
                          const entry = {
                            id: `act-${Math.random().toString(36).slice(2, 9)}`,
                            type: newActivity.type,
                            title: newActivity.title.trim(),
                            body: newActivity.body.trim() || undefined,
                            createdAt: new Date().toISOString(),
                            priority: newActivity.priority,
                            pinned: newActivity.pin || undefined,
                          };
                          setActivity((p) => {
                            const next = [entry, ...p.filter((x) => x.id !== entry.id)];
                            return next;
                          });
                          setNewActivity((p) => ({ ...p, title: "", body: "", pin: false, priority: "Normal" }));
                          toast({ title: "Added", description: "Activity saved." });
                        }}
                        data-testid="button-client-activity-add"
                      >
                        Add
                      </Button>
                    </div>
                  </div>

                  <div className="mt-3">
                    <Label className="text-xs">Details (optional)</Label>
                    <textarea
                      className="mt-1 min-h-[72px] w-full rounded-md border bg-background px-3 py-2 text-sm"
                      value={newActivity.body}
                      onChange={(e) => setNewActivity((p) => ({ ...p, body: e.target.value }))}
                      placeholder="Add context, outcomes, next steps…"
                      data-testid="textarea-client-activity-body"
                    />
                  </div>
                </div>

                <div className="md:col-span-3">
                  <div className="grid gap-2 md:grid-cols-2" data-testid="grid-client-activity-feed">
                    {(() => {
                      const priorityScore = (p?: string) =>
                        p === "Critical" ? 4 : p === "High" ? 3 : p === "Normal" ? 2 : p === "Low" ? 1 : 2;

                      const filtered = activity
                        .filter((a) => (activityFilter === "all" ? true : a.type === activityFilter))
                        .filter((a) => (!activityPriorityOnly ? true : priorityScore(a.priority) >= 3));

                      const pinned = filtered.filter((a) => a.pinned);
                      const rest = filtered.filter((a) => !a.pinned);

                      const sortedPinned = pinned.sort((a, b) => priorityScore(b.priority) - priorityScore(a.priority));
                      const sortedRest = rest.sort((a, b) => {
                        const pDiff = priorityScore(b.priority) - priorityScore(a.priority);
                        if (pDiff !== 0) return pDiff;
                        return a.createdAt < b.createdAt ? 1 : -1;
                      });

                      const renderRow = (a: any, pinnedRow: boolean) => {
                        const icon =
                          a.type === "call" ? (
                            <PhoneCall className="h-4 w-4" />
                          ) : a.type === "email" ? (
                            <Send className="h-4 w-4" />
                          ) : (
                            <MessageSquareText className="h-4 w-4" />
                          );

                        const label = a.type === "call" ? "Call" : a.type === "email" ? "Email" : "Note";

                        const pr = a.priority || "Normal";
                        const prVariant = pr === "Critical" ? "destructive" : pr === "High" ? "default" : pr === "Low" ? "outline" : "secondary";

                        return (
                          <div
                            key={a.id}
                            className={`rounded-lg border bg-background px-3 py-2 ${pinnedRow ? "ring-1 ring-primary/15" : ""}`}
                            data-testid={`card-client-activity-${a.id}`}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <div className="flex flex-wrap items-center gap-2">
                                  <span className="text-muted-foreground">{icon}</span>
                                  <Badge variant="outline" className="text-xs" data-testid={`badge-client-activity-type-${a.id}`}>
                                    {label}
                                  </Badge>
                                  <Badge variant={prVariant as any} className="text-xs" data-testid={`badge-client-activity-priority-${a.id}`}>
                                    {pr}
                                  </Badge>
                                  {pinnedRow && (
                                    <Badge variant="secondary" className="text-xs" data-testid={`badge-client-activity-pinned-${a.id}`}>
                                      Pinned
                                    </Badge>
                                  )}
                                  <span
                                    className="text-xs text-muted-foreground font-mono"
                                    data-testid={`text-client-activity-date-${a.id}`}
                                  >
                                    {new Date(a.createdAt).toLocaleString()}
                                  </span>
                                </div>
                                <div className="mt-1 font-medium" data-testid={`text-client-activity-title-${a.id}`}>
                                  {a.title}
                                </div>
                                {a.body && (
                                  <div className="mt-1 text-sm text-muted-foreground" data-testid={`text-client-activity-body-${a.id}`}>
                                    {a.body}
                                  </div>
                                )}
                              </div>

                              <div className="flex items-center gap-1 shrink-0">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() =>
                                    setActivity((p) =>
                                      p.map((x) => (x.id === a.id ? { ...x, pinned: !(x as any).pinned } : x))
                                    )
                                  }
                                  data-testid={`button-client-activity-pin-${a.id}`}
                                >
                                  Pin
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="text-destructive"
                                  onClick={() => setActivity((p) => p.filter((x) => x.id !== a.id))}
                                  data-testid={`button-client-activity-delete-${a.id}`}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          </div>
                        );
                      };

                      const combined = [...sortedPinned.map((a) => ({ a, pinned: true })), ...sortedRest.map((a) => ({ a, pinned: false }))];

                      if (combined.length === 0) {
                        return (
                          <div className="text-sm text-muted-foreground" data-testid="text-client-activity-empty">
                            No activity logged yet.
                          </div>
                        );
                      }

                      return combined.slice(0, 8).map(({ a, pinned }) => renderRow(a, pinned));
                    })()}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle>Jobs</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                {clientJobs.length === 0 && (
                  <p className="text-muted-foreground" data-testid="text-client-no-jobs">
                    No jobs for this client yet.
                  </p>
                )}
                {clientJobs.slice(0, 4).map((job) => (
                  <div
                    key={job.id}
                    className="grid gap-2 rounded-lg border bg-slate-50 px-3 py-2.5 transition hover:bg-muted/50 dark:bg-slate-900 cursor-pointer"
                    data-testid={`row-client-job-${job.id}`}
                    onClick={() => setLocation(`/jobs/${job.id}`)}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="font-medium leading-snug hover:underline" data-testid={`text-client-job-title-${job.id}`}>
                          {job.title}
                        </div>
                        <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-muted-foreground" data-testid={`row-client-job-meta-${job.id}`}>
                          <span className="font-mono" data-testid={`text-client-job-id-${job.id}`}>{job.jobId}</span>
                          <span aria-hidden>•</span>
                          <span data-testid={`text-client-job-date-${job.id}`}>
                            {new Date(job.startAt).toLocaleDateString()}
                            {job.endAt ? ` → ${new Date(job.endAt).toLocaleDateString()}` : ""}
                          </span>
                        </div>
                      </div>

                      <Badge className="shrink-0" data-testid={`badge-client-job-status-${job.id}`}>{job.status}</Badge>
                    </div>

                    <div className="grid gap-1.5 sm:grid-cols-3">
                      <div className="text-xs" data-testid={`text-client-job-location-${job.id}`}>
                        <span className="text-muted-foreground">Location:</span> {job.locationAddress || "—"}
                      </div>
                      <div className="text-xs" data-testid={`text-client-job-priority-${job.id}`}>
                        <span className="text-muted-foreground">Priority:</span> {job.priority || "—"}
                      </div>
                      <div className="text-xs" data-testid={`text-client-job-costs-${job.id}`}>
                        <span className="text-muted-foreground">Cost:</span> ${
                          (
                            (job.costs?.labour ?? 0) +
                            (job.costs?.equipment ?? 0) +
                            (job.costs?.materials ?? 0) +
                            (job.costs?.other ?? 0)
                          ).toLocaleString()
                        }
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-4 w-4" /> Documents
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {missingRequired.length > 0 && (
              <div className="rounded-lg border bg-amber-50/70 text-amber-950 dark:bg-amber-950/20 dark:text-amber-200 p-3">
                <div className="text-sm font-semibold" data-testid="text-client-docs-missing-title">
                  Required documents missing
                </div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {missingRequired.map((r) => (
                    <Button
                      key={r.type}
                      size="sm"
                      variant="outline"
                      onClick={() => markRequiredAsReceived(r.type, r.label)}
                      data-testid={`button-client-doc-add-required-${r.type}`}
                    >
                      <Upload className="h-4 w-4 mr-2" /> Add {r.label}
                    </Button>
                  ))}
                </div>
              </div>
            )}

            <div className="grid gap-3 md:grid-cols-5">
              <div className="md:col-span-2">
                <Label className="text-xs">Document name</Label>
                <Input
                  value={newDoc.name}
                  onChange={(e) => setNewDoc((p) => ({ ...p, name: e.target.value }))}
                  placeholder="e.g. Contract signed (v2)"
                  data-testid="input-client-doc-name"
                />
              </div>
              <div>
                <Label className="text-xs">Type</Label>
                <select
                  className="h-9 w-full rounded-md border bg-background px-3 text-sm"
                  value={newDoc.type}
                  onChange={(e) => setNewDoc((p) => ({ ...p, type: e.target.value }))}
                  data-testid="select-client-doc-type"
                >
                  {Object.entries(DOC_LABEL).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Label className="text-xs">Status</Label>
                <select
                  className="h-9 w-full rounded-md border bg-background px-3 text-sm"
                  value={newDoc.status}
                  onChange={(e) => setNewDoc((p) => ({ ...p, status: e.target.value }))}
                  data-testid="select-client-doc-status"
                >
                  {["Required", "Received", "Approved", "Expired"].map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Label className="text-xs">Expiry (optional)</Label>
                <Input
                  type="date"
                  value={newDoc.expiryDate}
                  onChange={(e) => setNewDoc((p) => ({ ...p, expiryDate: e.target.value }))}
                  data-testid="input-client-doc-expiry"
                />
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="text-xs text-muted-foreground" data-testid="text-client-docs-note">
                Documents here represent the client-to-business relationship (contracts, PO, inductions, etc.).
              </div>
              <Button onClick={addDocument} data-testid="button-client-doc-add">
                <Upload className="h-4 w-4 mr-2" /> Add document
              </Button>
            </div>

            {docs.length === 0 ? (
              <div className="text-sm text-muted-foreground" data-testid="text-client-docs-empty">
                No documents recorded yet.
              </div>
            ) : (
              <div className="space-y-2">
                {docs
                  .slice()
                  .sort((a: any, b: any) => (a.type || "").localeCompare(b.type || ""))
                  .map((d: any, idx: number) => (
                    <div
                      key={d.id || idx}
                      className="flex items-center justify-between gap-3 rounded-md border px-3 py-2 bg-slate-50 dark:bg-slate-900"
                      data-testid={`row-client-doc-${d.id || idx}`}
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-sm font-medium truncate" data-testid={`text-client-doc-name-${d.id || idx}`}>
                            {d.name}
                          </span>
                          <Badge variant="outline" data-testid={`badge-client-doc-type-${d.id || idx}`}>
                            {DOC_LABEL[d.type] || "Other"}
                          </Badge>
                          <Badge
                            variant={DOC_STATUS_BADGE[d.status] || "secondary"}
                            data-testid={`badge-client-doc-status-${d.id || idx}`}
                          >
                            {d.status || "Received"}
                          </Badge>
                          {d.expiryDate && (
                            <span
                              className="text-xs text-muted-foreground font-mono"
                              data-testid={`text-client-doc-expiry-${d.id || idx}`}
                            >
                              exp {new Date(d.expiryDate).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                        {d.uploadedAt && (
                          <div className="text-xs text-muted-foreground" data-testid={`text-client-doc-uploaded-${d.id || idx}`}>
                            Uploaded {new Date(d.uploadedAt).toLocaleDateString()}
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => window.open(d.url || "#", "_blank")}
                          data-testid={`button-client-doc-open-${d.id || idx}`}
                        >
                          <Link2 className="h-4 w-4 mr-2" /> Open
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-destructive"
                          onClick={() => deleteDocument(d.id)}
                          data-testid={`button-client-doc-delete-${d.id || idx}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </CardContent>
        </Card>
    </Layout>
  );
}
