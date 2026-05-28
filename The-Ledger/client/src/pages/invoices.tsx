import { Layout } from "@/components/layout";
import { useStore } from "@/lib/mockData";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useLocation } from "wouter";
import { ExternalLink, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function InvoicesPage() {
  const { invoices, clients, companySettings } = useStore();
  const [, setLocation] = useLocation();

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

  const formatCur = (val: number) =>
    new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format(val);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "Paid":
        return <Badge className="bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border-emerald-200 shadow-none font-normal">Paid</Badge>;
      case "Sent":
      case "Exported":
        return <Badge className="bg-blue-50 text-blue-700 hover:bg-blue-100 border-blue-200 shadow-none font-normal">Sent</Badge>;
      case "Overdue":
        return <Badge className="bg-rose-50 text-rose-700 hover:bg-rose-100 border-rose-200 shadow-none font-normal">Overdue</Badge>;
      case "Draft":
      default:
        return <Badge className="bg-slate-50 text-slate-700 hover:bg-slate-100 border-slate-200 shadow-none font-normal">Draft</Badge>;
    }
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-3xl font-bold tracking-tight text-slate-900">Billing Overview</h2>
            <p className="text-slate-500 mt-1">
              {isConnected ? `Read-only view of invoices synced from ${providerName}.` : "Manage and track all client invoices."}
            </p>
          </div>
        </div>

        {isConnected ? (
          <Card className="bg-blue-50/50 border-blue-100 shadow-sm">
            <CardContent className="p-4 flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between text-sm text-blue-800">
              <div className="flex gap-3 items-center">
                <div className="h-10 w-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center border border-blue-200 shrink-0">
                  <CheckCircle2 className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-semibold text-blue-900">Billing is managed in {providerName}.</p>
                  <p className="text-blue-700/80 mt-0.5">Invoices shown here are synced automatically. Use {providerName} to create, edit, or record payments.</p>
                </div>
              </div>
              <Button variant="outline" className="shrink-0 bg-white text-blue-700 border-blue-200 hover:bg-blue-50 hover:text-blue-800">
                Open {providerName} <ExternalLink className="h-3 w-3 ml-2" />
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Card className="bg-slate-50 border-slate-200 border-dashed shadow-sm">
            <CardContent className="p-4 flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between text-sm text-slate-600">
              <div>
                <p className="font-semibold text-slate-900">No accounting software connected.</p>
                <p className="mt-0.5">Connect an accounting provider like QuickBooks or Xero to sync and view your invoices.</p>
              </div>
              <Button variant="outline" onClick={() => setLocation('/settings/integrations')} className="shrink-0">
                Connect Provider
              </Button>
            </CardContent>
          </Card>
        )}

        <Card className="shadow-sm border-slate-200">
          <CardHeader className="pb-3 border-b border-slate-100 bg-slate-50/50">
            <div className="flex justify-between items-center">
              <CardTitle className="text-lg">{isConnected ? "Synced Invoices" : "All Invoices"}</CardTitle>
              {isConnected && (
                <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-1 rounded border border-slate-200 font-medium flex items-center gap-1.5">
                  <div className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Live Sync Active
                </span>
              )}
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader className="bg-slate-50/30">
                <TableRow>
                  <TableHead className="w-[120px]">Invoice No.</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>Issue Date</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoices.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-slate-500">
                      {isConnected ? `No invoices found. Syncing from ${providerName}...` : "No invoices found. Create one to get started."}
                    </TableCell>
                  </TableRow>
                )}
                {invoices.map((inv) => {
                  const client = clients.find((c) => c.id === inv.clientId);
                  const total = inv.lineItems.reduce((sum, li) => sum + li.qty * li.unitPrice, 0);

                  return (
                    <TableRow key={inv.id} className="hover:bg-slate-50/50 cursor-pointer" onClick={() => setLocation(`/invoices/${inv.id}`)}>
                      <TableCell className="font-medium text-slate-700">
                        {inv.invoiceId || `QB-${inv.id.split("-")[1]}`}
                      </TableCell>
                      <TableCell className="font-medium text-slate-900">{client?.name || "Unknown Client"}</TableCell>
                      <TableCell className="text-slate-600">{new Date(inv.issueDate || Date.now()).toLocaleDateString()}</TableCell>
                      <TableCell className="text-slate-600">{new Date(inv.dueDate || Date.now()).toLocaleDateString()}</TableCell>
                      <TableCell className="text-right font-medium text-slate-900">{formatCur(total)}</TableCell>
                      <TableCell>{getStatusBadge(inv.status)}</TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm" className="h-8 text-blue-600 hover:text-blue-800 hover:bg-blue-50">
                          View <ExternalLink className="h-3 w-3 ml-1.5" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}