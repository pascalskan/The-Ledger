import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useStore } from "@/lib/mockData";

export function IntegrationSyncStatus({ lastSync }: { lastSync: string }) {
  const { companySettings } = useStore();
  const activeIntegration = companySettings.accountingIntegration;
  const isConnected = activeIntegration?.status === "Connected" && activeIntegration?.provider;
  
  if (!isConnected) return null;

  const getProviderName = (id?: string) => {
    switch(id) {
      case 'quickbooks': return 'QuickBooks';
      case 'xero': return 'Xero';
      case 'freshbooks': return 'FreshBooks';
      case 'zoho': return 'Zoho Books';
      default: return 'Accounting Provider';
    }
  };

  const providerName = getProviderName(activeIntegration.provider);

  return (
    <Card className="shadow-sm border-slate-200 bg-slate-50/50">
      <CardContent className="p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-green-100 text-green-600 flex items-center justify-center border border-green-200 shrink-0">
            <CheckCircle2 className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-slate-800">{providerName}</span>
              <span className="text-[10px] bg-green-100 text-green-800 px-1.5 py-0.5 rounded border border-green-200 font-medium">Connected</span>
            </div>
            <div className="text-xs text-slate-500 mt-0.5">Last synced: {lastSync}</div>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="text-xs text-slate-400 italic">Powered by {providerName} API</div>
          <Button variant="outline" size="sm" className="bg-white text-slate-600 h-8 gap-2 border-slate-200">
            <RefreshCw className="h-3 w-3" /> Refresh Data
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
