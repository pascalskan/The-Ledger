import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Layout } from "@/components/layout";
import { PageHeader } from "@/components/page-shell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, AlertCircle, CheckCircle2, RefreshCw, Unplug, Zap } from "lucide-react";
import { useStore } from "@/lib/mockData";
import { QuickBooksProvider } from "@/services/integrations/QuickBooksProvider";
import { XeroProvider } from "@/services/integrations/XeroProvider";
import { FreshBooksProvider } from "@/services/integrations/FreshBooksProvider";
import { ZohoProvider } from "@/services/integrations/ZohoProvider";
import { FinancialProvider } from "@/services/integrations/BaseFinancialProvider";

const providers: FinancialProvider[] = [
  new QuickBooksProvider(),
  new XeroProvider(),
  new FreshBooksProvider(),
  new ZohoProvider(),
];

export default function IntegrationsPage() {
  const { companySettings, updateSettings } = useStore();
  const { toast } = useToast();
  
  const activeIntegration = companySettings.accountingIntegration;
  const isAnyConnecting = activeIntegration?.status === "Syncing";

  const [, setLocation] = useLocation();

  const getProviderStatus = (providerId: string) => {
    if (activeIntegration?.provider === providerId) {
      return activeIntegration.status;
    }
    return "Not Connected";
  };

  const handleConnect = async (provider: FinancialProvider) => {
    try {
      updateSettings({
        accountingIntegration: {
          status: "Syncing",
          provider: provider.id,
          syncLogs: activeIntegration?.syncLogs || [],
        }
      });

      await provider.connect("mock-auth-code");

      updateSettings({
        accountingIntegration: {
          status: "Connected",
          provider: provider.id,
          connectedAt: new Date().toISOString(),
          accessToken: "mock-token-" + provider.id,
          realmId: "REALM-" + Math.floor(Math.random() * 10000),
          syncLogs: [{
            timestamp: new Date().toISOString(),
            action: "Connect",
            status: "Success",
            message: `Connected to ${provider.name}`
          }, ...(activeIntegration?.syncLogs || [])]
        }
      });

      toast({ title: "Connected", description: `Successfully connected to ${provider.name}` });
    } catch (error) {
      updateSettings({
        accountingIntegration: {
          status: "Error",
          provider: provider.id,
          errorMessage: "Failed to connect",
          syncLogs: activeIntegration?.syncLogs || [],
        }
      });
      toast({ variant: "destructive", title: "Connection Failed", description: `Could not connect to ${provider.name}` });
    }
  };

  const handleDisconnect = async (provider: FinancialProvider) => {
    try {
      await provider.disconnect();
      updateSettings({
        accountingIntegration: {
          status: "Not Connected",
          provider: undefined,
          syncLogs: [],
        }
      });
      toast({ title: "Disconnected", description: `${provider.name} integration removed.` });
    } catch (error) {
      toast({ variant: "destructive", title: "Error", description: "Failed to disconnect." });
    }
  };

  const handleSync = async (provider: FinancialProvider) => {
    if (activeIntegration?.status !== "Connected") return;

    try {
      updateSettings({
        accountingIntegration: {
          ...activeIntegration,
          status: "Syncing"
        }
      });

      // Mock fetching canonical internal models
      const clients = await provider.fetchClients();
      const invoices = await provider.fetchInvoices();
      const payments = await provider.fetchPayments();

      const newLog = {
        timestamp: new Date().toISOString(),
        action: "Manual Sync",
        status: "Success" as const,
        message: `Synced ${clients.length} clients, ${invoices.length} invoices, ${payments.length} payments.`
      };

      updateSettings({
        accountingIntegration: {
          ...activeIntegration,
          status: "Connected",
          lastSyncAt: new Date().toISOString(),
          lastSyncStatus: "Success",
          syncLogs: [newLog, ...(activeIntegration.syncLogs || [])]
        }
      });

      toast({ title: "Sync Complete", description: newLog.message });
    } catch (error) {
      updateSettings({
        accountingIntegration: {
          ...activeIntegration,
          status: "Error",
          lastSyncAt: new Date().toISOString(),
          lastSyncStatus: "Failed",
          errorMessage: "Network timeout during sync",
          syncLogs: [{
            timestamp: new Date().toISOString(),
            action: "Manual Sync",
            status: "Failed",
            message: "Network timeout"
          }, ...(activeIntegration?.syncLogs || [])]
        }
      });
      toast({ variant: "destructive", title: "Sync Failed", description: "Could not synchronize data." });
    }
  };

  return (
    <Layout>
      <div className="space-y-6 max-w-5xl mx-auto">
        <div>
          <Button variant="ghost" size="sm" onClick={() => setLocation("/settings")} className="-ml-2 mb-2">
            <ArrowLeft className="h-4 w-4 mr-1" /> Back to Settings
          </Button>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Accounting Integrations</h1>
          <p className="text-muted-foreground mt-2">Connect The Ledger to your financial providers to synchronize invoices, payments, and clients.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {providers.map(provider => {
            const status = getProviderStatus(provider.id);
            const isConnected = status === "Connected" || status === "Error" || (status === "Syncing" && activeIntegration?.provider === provider.id);
            const isOtherConnected = activeIntegration?.provider && activeIntegration.provider !== provider.id;
            const isSyncing = status === "Syncing";

            return (
              <Card key={provider.id} className={`border-2 transition-all ${isConnected ? 'border-primary shadow-sm' : 'border-slate-200 opacity-90 hover:opacity-100 hover:border-slate-300'}`}>
                <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
                  <div>
                    <CardTitle className="text-xl font-semibold flex items-center gap-2">
                      {provider.name}
                      {isConnected && status === "Connected" && <Badge variant="default" className="bg-green-600 hover:bg-green-600 ml-2">Connected</Badge>}
                      {isConnected && status === "Error" && <Badge variant="destructive" className="ml-2">Error</Badge>}
                      {isConnected && status === "Syncing" && <Badge variant="secondary" className="ml-2 animate-pulse">Syncing...</Badge>}
                      {!isConnected && <Badge variant="outline" className="ml-2 text-slate-500">Not Connected</Badge>}
                    </CardTitle>
                    <CardDescription className="mt-1">
                      Sync financial data with {provider.name}.
                    </CardDescription>
                  </div>
                  <div className="h-10 w-10 bg-slate-100 rounded-md flex items-center justify-center border text-slate-500 font-bold">
                    {provider.name.charAt(0)}
                  </div>
                </CardHeader>
                <CardContent className="pt-4 pb-2">
                  <div className="space-y-3 text-sm">
                    {isConnected ? (
                      <>
                        <div className="grid grid-cols-2 gap-1">
                          <span className="text-slate-500">Last Sync</span>
                          <span className="font-medium flex items-center gap-1">
                            {activeIntegration?.lastSyncAt ? new Date(activeIntegration.lastSyncAt).toLocaleString() : "Never"}
                            {activeIntegration?.lastSyncStatus === "Success" && <CheckCircle2 className="h-3 w-3 text-green-600" />}
                            {activeIntegration?.lastSyncStatus === "Failed" && <AlertCircle className="h-3 w-3 text-red-600" />}
                          </span>
                        </div>
                        {activeIntegration?.errorMessage && (
                          <div className="p-2 bg-red-50 text-red-700 rounded text-xs flex items-start gap-2 border border-red-100">
                            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                            <span>{activeIntegration.errorMessage}</span>
                          </div>
                        )}
                      </>
                    ) : (
                      <p className="text-slate-500">
                        Connect to {provider.name} to start syncing your financial records. Only one provider can be connected at a time.
                      </p>
                    )}
                  </div>
                </CardContent>
                <CardFooter className="pt-4 border-t flex gap-2">
                  {!isConnected ? (
                    <Button 
                      onClick={() => handleConnect(provider)} 
                      disabled={isOtherConnected || isAnyConnecting}
                      className="w-full"
                    >
                      <Zap className="h-4 w-4 mr-2" />
                      Connect {provider.name}
                    </Button>
                  ) : (
                    <>
                      <Button 
                        variant="outline" 
                        onClick={() => handleDisconnect(provider)}
                        disabled={isSyncing}
                        className="flex-1"
                      >
                        <Unplug className="h-4 w-4 mr-2" />
                        Disconnect
                      </Button>
                      <Button 
                        onClick={() => handleSync(provider)}
                        disabled={isSyncing || status === "Error"}
                        className="flex-1"
                      >
                        <RefreshCw className={`h-4 w-4 mr-2 ${isSyncing ? 'animate-spin' : ''}`} />
                        Sync Now
                      </Button>
                    </>
                  )}
                </CardFooter>
              </Card>
            );
          })}
        </div>
      </div>
    </Layout>
  );
}