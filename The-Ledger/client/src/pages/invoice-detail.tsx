import { Layout } from "@/components/layout";
import { useStore } from "@/lib/mockData";
import { useRoute, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, ExternalLink, FileText, CheckCircle2, Plus, Trash2, Save, X } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";

export default function InvoiceDetailPage() {
  const { invoices, clients, jobs, companySettings, updateInvoice } = useStore();
  const [match, params] = useRoute("/invoices/:id");
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  
  const [isEditing, setIsEditing] = useState(false);
  const [draftInvoice, setDraftInvoice] = useState<any>(null);

  const activeIntegration = companySettings.accountingIntegration;
  const isConnected = activeIntegration?.status === "Connected" && activeIntegration?.provider;
  
  const getProviderName = (id?: string) => {
    switch(id) {
      case 'quickbooks': return 'QuickBooks';
      case 'xero': return 'Xero';
      case 'freshbooks': return 'FreshBooks';
      case 'zoho': return 'Zoho Books';
      default: return 'Accounting Provider';
    }
  };

  const providerName = getProviderName(activeIntegration?.provider);

  if (!match || !params?.id) {
    return (
      <Layout>
        <div className="space-y-4 text-center py-12">
          <p className="text-slate-500">Invalid invoice URL.</p>
          <Button variant="outline" onClick={() => setLocation("/invoices")}>Back to Billing</Button>
        </div>
      </Layout>
    );
  }

  const invoice = invoices.find(i => i.id === params.id);

  if (!invoice) {
    return (
      <Layout>
        <div className="space-y-4 text-center py-12">
          <h2 className="text-xl font-semibold text-slate-800">Invoice not found</h2>
          <p className="text-slate-500">This invoice might have been deleted or hasn't synced yet.</p>
          <Button variant="outline" onClick={() => setLocation("/invoices")}>Back to Billing</Button>
        </div>
      </Layout>
    );
  }

  const startEditing = () => {
    setDraftInvoice({
      ...invoice,
      issueDate: invoice.issueDate.split('T')[0],
      dueDate: invoice.dueDate.split('T')[0],
    });
    setIsEditing(true);
  };

  const saveEdit = () => {
    if (!draftInvoice) return;
    
    updateInvoice(invoice.id, {
      ...draftInvoice,
      issueDate: new Date(draftInvoice.issueDate).toISOString(),
      dueDate: new Date(draftInvoice.dueDate).toISOString()
    });
    
    setIsEditing(false);
    toast({ title: "Invoice Updated", description: "Changes have been saved." });
  };

  const client = clients.find(c => c.id === invoice.clientId);
  const job = invoice.jobId ? jobs.find(j => j.id === invoice.jobId) : null;

  const subtotal = invoice.lineItems.reduce((acc, item) => acc + (item.qty * item.unitPrice), 0);
  const tax = subtotal * 0.2; // Mock 20%
  const total = subtotal + tax;

  const formatCur = (val: number) =>
    new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format(val);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "Paid":
        return <Badge className="bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border-emerald-200 shadow-none font-normal px-2.5 py-0.5">Paid</Badge>;
      case "Sent":
      case "Exported":
        return <Badge className="bg-blue-50 text-blue-700 hover:bg-blue-100 border-blue-200 shadow-none font-normal px-2.5 py-0.5">Sent</Badge>;
      case "Overdue":
        return <Badge className="bg-rose-50 text-rose-700 hover:bg-rose-100 border-rose-200 shadow-none font-normal px-2.5 py-0.5">Overdue</Badge>;
      case "Draft":
      default:
        return <Badge className="bg-slate-50 text-slate-700 hover:bg-slate-100 border-slate-200 shadow-none font-normal px-2.5 py-0.5">Draft</Badge>;
    }
  };

  return (
    <Layout>
      <div className="space-y-6 max-w-4xl mx-auto">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              className="text-slate-500 hover:text-slate-900 hover:bg-slate-100"
              onClick={() => setLocation("/invoices")}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                Invoice {invoice.invoiceId || `QB-${invoice.id.split("-")[1]}`}
              </h1>
              {getStatusBadge(invoice.status)}
            </div>
          </div>
          <div className="flex gap-2">
            {isConnected ? (
              <Button className="bg-blue-600 hover:bg-blue-700 text-white shadow-sm gap-2">
                Open in {providerName} <ExternalLink className="h-4 w-4" />
              </Button>
            ) : isEditing ? (
              <>
                <Button variant="outline" onClick={() => setIsEditing(false)}>
                  <X className="h-4 w-4 mr-2" /> Cancel
                </Button>
                <Button onClick={saveEdit}>
                  <Save className="h-4 w-4 mr-2" /> Save Changes
                </Button>
              </>
            ) : (
              <Button className="shadow-sm gap-2" onClick={startEditing}>
                Edit Invoice
              </Button>
            )}
          </div>
        </div>

        {/* Read Only Notice */}
        {isConnected && (
          <div className="bg-blue-50/50 border border-blue-100 rounded-lg p-3 flex items-center gap-3 text-blue-800 text-sm">
             <FileText className="h-4 w-4 text-blue-500 shrink-0" />
             <p>This is a read-only view synced from {providerName}. To edit line items, apply payments, or send to the client, please open {providerName}.</p>
          </div>
        )}

        <Card className="shadow-sm border-slate-200">
          <CardContent className="p-8 space-y-8">
            {/* Header */}
            <div className="flex justify-between items-start">
              <div>
                <h2 className="text-xl font-bold text-slate-900 mb-1">{companySettings.companyLegalName}</h2>
                <div className="text-sm text-slate-500 whitespace-pre-line">
                  {companySettings.address}
                </div>
              </div>
              <div className="text-right">
                 <div className="text-3xl font-bold text-slate-200 tracking-wider">INVOICE</div>
                 <div className="text-sm font-medium text-slate-600 mt-2">#{invoice.invoiceId || `QB-${invoice.id.split("-")[1]}`}</div>
              </div>
            </div>

            <Separator className="bg-slate-100" />

            {/* Bill To & Details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div>
                <h4 className="font-semibold text-xs text-slate-400 uppercase tracking-wider mb-3">Billed To</h4>
                {client ? (
                  <div className="text-sm space-y-1 text-slate-700">
                    <p className="font-semibold text-slate-900">{client.name}</p>
                    <p>{client.billingAddress}</p>
                    <p className="text-slate-500">{client.email}</p>
                  </div>
                ) : (
                  <p className="text-sm text-slate-500 italic">Client information unavailable</p>
                )}
              </div>
              
              <div className="grid grid-cols-2 gap-6 text-sm bg-slate-50/50 p-4 rounded-lg border border-slate-100">
                <div>
                  <h4 className="font-semibold text-xs text-slate-400 uppercase tracking-wider mb-1.5">Issue Date</h4>
                  <p className="font-medium text-slate-900">{new Date(invoice.issueDate).toLocaleDateString()}</p>
                </div>
                <div>
                  <h4 className="font-semibold text-xs text-slate-400 uppercase tracking-wider mb-1.5">Due Date</h4>
                  <p className="font-medium text-slate-900">{new Date(invoice.dueDate).toLocaleDateString()}</p>
                </div>
                {job && (
                  <div className="col-span-2 pt-2 border-t border-slate-200/60">
                    <h4 className="font-semibold text-xs text-slate-400 uppercase tracking-wider mb-1.5">Linked Job</h4>
                    <p className="text-slate-700 font-medium">
                      {job.jobId} - {job.title}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Line Items */}
            <div className="border border-slate-200 rounded-lg overflow-hidden">
              <div className="grid grid-cols-12 gap-4 bg-slate-50 p-3 text-xs font-semibold uppercase text-slate-500 tracking-wider">
                <div className="col-span-6">Description</div>
                <div className="col-span-2 text-right">Qty</div>
                <div className="col-span-2 text-right">Rate</div>
                <div className="col-span-2 text-right">Amount</div>
              </div>

              <div className="divide-y divide-slate-100">
                {invoice.lineItems.map((item, i) => (
                  <div key={i} className="grid grid-cols-12 gap-4 p-3 text-sm items-center bg-white">
                    <div className="col-span-6 text-slate-800 font-medium">{item.description}</div>
                    <div className="col-span-2 text-right text-slate-600">{item.qty}</div>
                    <div className="col-span-2 text-right text-slate-600">{formatCur(item.unitPrice)}</div>
                    <div className="col-span-2 text-right font-medium text-slate-900">{formatCur(item.qty * item.unitPrice)}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Totals */}
            <div className="flex justify-end">
              <div className="w-full sm:w-1/2 md:w-1/3 space-y-3 p-4 bg-slate-50 rounded-lg border border-slate-100">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Subtotal</span>
                  <span className="font-medium text-slate-700">{formatCur(subtotal)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Tax (20%)</span>
                  <span className="font-medium text-slate-700">{formatCur(tax)}</span>
                </div>
                <Separator className="bg-slate-200" />
                <div className="flex justify-between font-bold text-lg text-slate-900">
                  <span>Total GBP</span>
                  <span>{formatCur(total)}</span>
                </div>
              </div>
            </div>

            {invoice.status === "Paid" && (
               <div className="flex items-center justify-center gap-2 text-emerald-600 bg-emerald-50 border border-emerald-100 p-3 rounded-lg font-medium text-sm mt-4">
                 <CheckCircle2 className="h-5 w-5" /> This invoice has been marked as fully paid {isConnected ? `in ${providerName}` : ''}.
               </div>
            )}
            
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
