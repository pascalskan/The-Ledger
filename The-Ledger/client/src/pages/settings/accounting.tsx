import { Layout } from "@/components/layout";
import { useStore } from "@/lib/mockData";
import { useIntegrationService } from "@/lib/integrationService";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Link2, RefreshCw, Unlink, ServerCrash, CheckCircle2, History, AlertTriangle } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";

export default function AccountingSettingsPage() {
  const { companySettings } = useStore();
  const { connectQuickBooks, disconnectQuickBooks, syncQuickBooksData } = useIntegrationService();
  const { toast } = useToast();

  const isDemo = companySettings.companyLegalName === "Example Business Ltd";
  
  const accounting = companySettings.accountingIntegration || {
    status: "Not Connected",
    syncLogs: []
  };

  const handleConnect = async () => {
    toast({ title: "Connecting...", description: "Redirecting to QuickBooks..." });
    await connectQuickBooks();
    toast({ title: "Connected", description: "QuickBooks integration is now active." });
  };

  const handleDisconnect = async () => {
    await disconnectQuickBooks();
    toast({ title: "Disconnected", description: "QuickBooks integration removed." });
  };

  const handleSync = async () => {
    toast({ title: "Sync Started", description: "Synchronizing data with QuickBooks..." });
    await syncQuickBooksData();
    toast({ title: "Sync Complete", description: "Check sync history for details." });
  };

  return (
    <Layout>
      <div className="space-y-6 max-w-4xl mx-auto">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Accounting Integration</h2>
          <p className="text-muted-foreground mt-1">Connect your ledger to external accounting software.</p>
        </div>

        {isDemo && (
          <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-600" />
            <span><strong>Demo Mode:</strong> Accounting Sync is simulated for this environment.</span>
          </div>
        )}

        <Card>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded bg-green-50 flex items-center justify-center border border-green-100">
                  <span className="text-green-600 font-bold text-xl">qb</span>
                </div>
                <div>
                  <CardTitle>QuickBooks Online</CardTitle>
                  <CardDescription>Sync invoices, clients, and payments directly with QuickBooks.</CardDescription>
                </div>
              </div>
              <Badge 
                variant={
                  accounting.status === "Connected" ? "default" :
                  accounting.status === "Syncing" ? "secondary" :
                  accounting.status === "Error" ? "destructive" : "outline"
                }
                className={accounting.status === "Connected" ? "bg-green-600 hover:bg-green-600" : ""}
              >
                {accounting.status === "Syncing" && <RefreshCw className="mr-1 h-3 w-3 animate-spin" />}
                {accounting.status}
              </Badge>
            </div>
          </CardHeader>
          
          <CardContent className="space-y-4">
            {accounting.status === "Connected" || accounting.status === "Syncing" || accounting.status === "Error" ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4 rounded-lg border bg-slate-50 p-4 text-sm">
                  <div>
                    <div className="text-muted-foreground mb-1">Realm ID (Company ID)</div>
                    <div className="font-mono">{accounting.realmId}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground mb-1">Connected Since</div>
                    <div>{accounting.connectedAt ? new Date(accounting.connectedAt).toLocaleDateString() : "—"}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground mb-1">Last Sync</div>
                    <div>
                      {accounting.lastSyncAt ? (
                        <div className="flex items-center gap-2">
                          {new Date(accounting.lastSyncAt).toLocaleString()}
                          {accounting.lastSyncStatus === "Success" ? (
                            <CheckCircle2 className="h-3 w-3 text-green-600" />
                          ) : (
                            <ServerCrash className="h-3 w-3 text-destructive" />
                          )}
                        </div>
                      ) : "Never"}
                    </div>
                  </div>
                </div>

                {accounting.errorMessage && (
                  <div className="rounded-md border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                    {accounting.errorMessage}
                  </div>
                )}
              </div>
            ) : (
              <p className="text-sm text-slate-600">
                Connect your QuickBooks account to enable automated invoice syncing. 
                Once connected, you can export finalized invoices directly to QuickBooks with one click.
              </p>
            )}
          </CardContent>

          <CardFooter className="flex items-center justify-between border-t bg-slate-50/50 pt-4">
            <div>
              <Sheet>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="sm" disabled={!accounting.syncLogs || accounting.syncLogs.length === 0}>
                    <History className="mr-2 h-4 w-4" />
                    View Sync History
                  </Button>
                </SheetTrigger>
                <SheetContent className="w-[400px] sm:w-[540px] overflow-y-auto">
                  <SheetHeader className="mb-6">
                    <SheetTitle>QuickBooks Sync History</SheetTitle>
                  </SheetHeader>
                  <div className="space-y-4">
                    {accounting.syncLogs?.map((log: any, idx: number) => (
                      <div key={idx} className="flex gap-4 border-b pb-4 last:border-0 text-sm">
                        <div className="mt-0.5 shrink-0">
                          {log.status === "Success" ? (
                            <CheckCircle2 className="h-4 w-4 text-green-600" />
                          ) : (
                            <ServerCrash className="h-4 w-4 text-destructive" />
                          )}
                        </div>
                        <div className="space-y-1 w-full">
                          <div className="flex items-center justify-between">
                            <span className="font-medium">{log.action}</span>
                            <span className="text-xs text-muted-foreground">{new Date(log.timestamp).toLocaleString()}</span>
                          </div>
                          {log.message && <p className="text-muted-foreground">{log.message}</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                </SheetContent>
              </Sheet>
            </div>
            
            <div className="flex gap-2">
              {accounting.status === "Not Connected" ? (
                <Button onClick={handleConnect}>
                  <Link2 className="mr-2 h-4 w-4" />
                  Connect to QuickBooks
                </Button>
              ) : (
                <>
                  <Button variant="outline" onClick={handleDisconnect} disabled={accounting.status === "Syncing"}>
                    <Unlink className="mr-2 h-4 w-4" />
                    Disconnect
                  </Button>
                  <Button onClick={handleSync} disabled={accounting.status === "Syncing"}>
                    <RefreshCw className={`mr-2 h-4 w-4 ${accounting.status === "Syncing" ? "animate-spin" : ""}`} />
                    Sync Now
                  </Button>
                </>
              )}
            </div>
          </CardFooter>
        </Card>
      </div>
    </Layout>
  );
}