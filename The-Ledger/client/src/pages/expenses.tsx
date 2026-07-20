import { Layout } from "@/components/layout";
import { PageHeader } from "@/components/page-shell";
import { FinancialSnapshot } from "@/components/finance/FinancialSnapshot";
import { JobProfitabilityTable } from "@/components/finance/JobProfitabilityTable";
import { ExpenseExposurePanel } from "@/components/finance/ExpenseExposurePanel";
import { EquipmentContribution } from "@/components/finance/EquipmentContribution";
import { IntegrationSyncStatus } from "@/components/finance/IntegrationSyncStatus";
import { Card, CardContent } from "@/components/ui/card";
import { Info } from "lucide-react";
import { useStore } from "@/lib/mockData";

export default function FinancialInsightsPage() {
  const { companySettings } = useStore();
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

  // Mock data integrating hypothetical external revenue and system spend
  const snapshotData = {
    revenue: 425000,
    approvedSpend: 265000,
    grossProfit: 160000,
    pendingExposure: 28500,
    avgMargin: 37.6
  };

  const jobProfitabilityData = [
    { id: 1, title: "HQ Office Fitout", revenue: 85000, approvedSpend: 42000, pendingSpend: 5000 },
    { id: 2, title: "Warehouse Rewire", revenue: 120000, approvedSpend: 95000, pendingSpend: 15000 }, // Margin < 25% (Risk)
    { id: 3, title: "Retail Park Phase 1", revenue: 65000, approvedSpend: 45000, pendingSpend: 2500 }, // Margin 30% (Watch)
    { id: 4, title: "Server Room Upgrade", revenue: 45000, approvedSpend: 22000, pendingSpend: 1000 },
    { id: 5, title: "Emergency Callout - Plant Room", revenue: 8500, approvedSpend: 2000, pendingSpend: 500 },
  ];

  const exposureData = {
    pendingCount: 24,
    pendingValue: 28500,
    percentOfRevenue: 6.7,
    topJobs: [
      { title: "Warehouse Rewire", amount: 15000 },
      { title: "HQ Office Fitout", amount: 5000 },
      { title: "Retail Park Phase 1", amount: 2500 }
    ]
  };

  const equipmentData = {
    revenue: 45000,
    spend: 12500,
    utilisation: 78
  };

  return (
    <Layout>
      <div className="space-y-6">
        <PageHeader
          title="Financial Insights"
          description={`Operational financial intelligence powered by ${isConnected ? providerName : "internal records"} and spend data.`}
        />

        <FinancialSnapshot data={snapshotData} />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <JobProfitabilityTable jobs={jobProfitabilityData} />
            
            <Card className="bg-blue-50/50 border-blue-100 shadow-sm">
              <CardContent className="p-4 flex gap-3 text-sm text-blue-800">
                <Info className="h-5 w-5 text-blue-600 shrink-0" />
                <p>
                  <strong>Note:</strong> Accounting functions (Invoicing, Taxes, Ledger) are managed {isConnected ? `in ${providerName}` : "internally in The Ledger"}. 
                  This dashboard provides operational visibility into job margins by combining {isConnected ? "synced" : "internal"} revenue with approved system expenses.
                </p>
              </CardContent>
            </Card>
          </div>
          
          <div className="space-y-6">
            <ExpenseExposurePanel data={exposureData} />
            <EquipmentContribution data={equipmentData} />
          </div>
        </div>

        <IntegrationSyncStatus lastSync="Today, 09:41 AM" />
      </div>
    </Layout>
  );
}
