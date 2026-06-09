import { Layout } from "@/components/layout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LayoutDashboard, Layers, FileText, Wallet, Link2, Users, FileDown, RefreshCw, GitMerge, TriangleAlert, Calendar } from "lucide-react";
import { useLocation, useSearch } from "wouter";
import { useStore } from "@/lib/mockData";
import { groupTimesheetsForPayroll } from "@/lib/profitabilityEngine";
import { FinancialRecordsContent } from "./financial-explorer";
import { PayrollProcessingContent } from "./payroll";
import { PayrollExportContent } from "./payroll-export";
import { AccountingSettingsContent } from "./accounting-settings";
import { ReconciliationContent } from "./reconciliation-center";
import { ExceptionResolutionContent } from "./exception-resolution-center";
import { AccountingSyncTab } from "@/components/finance/AccountingSyncTab";
import { InvoicingHub } from "@/components/finance/InvoicingHub";

const tabLabels: Record<string, string> = {
  overview: "",
  records: "Records",
  invoicing: "Invoicing",
  payroll: "Payroll",
  accounting: "Accounting",
};

// Sub-tab state resets when switching parent tabs — this is intentional.
// Returning to Payroll after visiting Accounting always lands on the default sub-tab.
function defaultSub(tab: string): string {
  const defaults: Record<string, string> = {
    payroll: "processing",
    accounting: "sync",
  };
  return defaults[tab] ?? "";
}

// Mock payroll schedule — next payroll run date (mock data per spec §2.8)
const MOCK_NEXT_PAYROLL_RUN = "20 Jun 2026";

function PayrollHub({ activeSub, onSubChange }: { activeSub: string; onSubChange: (sub: string) => void }) {
  const sub = activeSub || "processing";
  const { timesheets, reviewItems } = useStore();

  const stagingRecords = groupTimesheetsForPayroll(timesheets);
  const approvedCount = stagingRecords.length;
  const pendingCount = reviewItems.filter(
    (r) => r.type === "timesheet" && r.status === "pending"
  ).length;

  const pendingClass =
    pendingCount === 0
      ? "text-emerald-600 font-medium"
      : pendingCount <= 5
      ? "text-amber-600 font-medium"
      : "text-red-600 font-medium";

  return (
    <div className="space-y-4">
      <div
        className="flex items-center gap-3 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm flex-wrap"
        data-testid="payroll-status-banner"
      >
        <Calendar className="h-4 w-4 text-muted-foreground flex-shrink-0" />
        <span>
          Next run: <span className="font-medium">{MOCK_NEXT_PAYROLL_RUN}</span>
        </span>
        <span className="text-muted-foreground">·</span>
        <span>{approvedCount} workers in scope</span>
        <span className="text-muted-foreground">·</span>
        <span className="text-emerald-600 font-medium">{approvedCount} ready</span>
        {pendingCount > 0 && (
          <>
            <span className="text-muted-foreground">/</span>
            <span className={pendingClass}>{pendingCount} pending timesheet{pendingCount !== 1 ? "s" : ""}</span>
          </>
        )}
      </div>

      <Tabs value={sub} onValueChange={onSubChange}>
        <TabsList>
          <TabsTrigger value="processing" data-testid="payroll-subtab-processing-queue">
            <Users className="h-3.5 w-3.5 mr-1" /> Processing Queue
          </TabsTrigger>
          <TabsTrigger value="export" data-testid="payroll-subtab-export-history">
            <FileDown className="h-3.5 w-3.5 mr-1" /> Export History
          </TabsTrigger>
        </TabsList>
        <TabsContent value="processing" data-testid="payroll-processing-queue-panel">
          <PayrollProcessingContent />
        </TabsContent>
        <TabsContent value="export" data-testid="payroll-export-history-panel">
          <PayrollExportContent />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function AccountingHub({ activeSub, onSubChange }: { activeSub: string; onSubChange: (sub: string) => void }) {
  const sub = activeSub || "sync";
  return (
    <div className="space-y-4">
      <Tabs value={sub} onValueChange={onSubChange}>
        <TabsList>
          <TabsTrigger value="sync" data-testid="accounting-subtab-sync-status">
            <RefreshCw className="h-3.5 w-3.5 mr-1" /> Sync Status
          </TabsTrigger>
          <TabsTrigger value="reconciliation" data-testid="accounting-subtab-reconciliation">
            <GitMerge className="h-3.5 w-3.5 mr-1" /> Reconciliation
          </TabsTrigger>
          <TabsTrigger value="exceptions" data-testid="accounting-subtab-exceptions">
            <TriangleAlert className="h-3.5 w-3.5 mr-1" /> Exceptions
          </TabsTrigger>
          <TabsTrigger value="providers" data-testid="accounting-subtab-providers">
            <Link2 className="h-3.5 w-3.5 mr-1" /> Providers
          </TabsTrigger>
        </TabsList>
        <TabsContent value="sync" data-testid="accounting-sync-status-panel">
          <AccountingSyncTab />
        </TabsContent>
        <TabsContent value="reconciliation" data-testid="accounting-reconciliation-panel">
          <ReconciliationContent />
        </TabsContent>
        <TabsContent value="exceptions" data-testid="accounting-exceptions-panel">
          <ExceptionResolutionContent />
        </TabsContent>
        <TabsContent value="providers" data-testid="accounting-providers-panel">
          <AccountingSettingsContent />
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default function FinanceHubPage() {
  const [, setLocation] = useLocation();
  const search = useSearch();
  const params = new URLSearchParams(search);
  const activeTab = params.get("tab") ?? "overview";
  const activeSub = params.get("sub") ?? defaultSub(activeTab);

  function handleTabChange(tab: string) {
    setLocation(`/finance?tab=${tab}`);
  }

  function handleSubChange(sub: string) {
    setLocation(`/finance?tab=${activeTab}&sub=${sub}`);
  }

  return (
    <Layout>
      <div className="space-y-6 p-6" data-testid="finance-hub-page">
        <div>
          <h1 className="text-2xl font-bold" data-testid="finance-hub-heading">
            Finance{activeTab !== "overview" && tabLabels[activeTab] ? ` — ${tabLabels[activeTab]}` : ""}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Revenue, costs, payroll, invoicing and accounting — in one place.
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-6">
          <TabsList className="flex flex-wrap h-auto gap-1">
            <TabsTrigger value="overview" className="flex items-center gap-1.5" data-testid="finance-tab-overview">
              <LayoutDashboard className="h-3.5 w-3.5" /> Overview
            </TabsTrigger>
            <TabsTrigger value="records" className="flex items-center gap-1.5" data-testid="finance-tab-records">
              <Layers className="h-3.5 w-3.5" /> Records
            </TabsTrigger>
            <TabsTrigger value="invoicing" className="flex items-center gap-1.5" data-testid="finance-tab-invoicing">
              <FileText className="h-3.5 w-3.5" /> Invoicing
            </TabsTrigger>
            <TabsTrigger value="payroll" className="flex items-center gap-1.5" data-testid="finance-tab-payroll">
              <Wallet className="h-3.5 w-3.5" /> Payroll
            </TabsTrigger>
            <TabsTrigger value="accounting" className="flex items-center gap-1.5" data-testid="finance-tab-accounting">
              <Link2 className="h-3.5 w-3.5" /> Accounting
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" data-testid="finance-overview-panel">
            <div className="py-12 text-center text-muted-foreground">
              Finance Overview — coming in Day 5.
            </div>
          </TabsContent>

          <TabsContent value="records" data-testid="finance-records-panel">
            <div>
              <h2 className="text-lg font-semibold mb-4" data-testid="finance-records-heading">
                Financial Records
              </h2>
              <FinancialRecordsContent />
            </div>
          </TabsContent>

          <TabsContent value="invoicing" data-testid="finance-invoicing-panel">
            <InvoicingHub />
          </TabsContent>

          <TabsContent value="payroll" data-testid="finance-payroll-panel">
            <PayrollHub activeSub={activeSub} onSubChange={handleSubChange} />
          </TabsContent>

          <TabsContent value="accounting" data-testid="finance-accounting-panel">
            <AccountingHub activeSub={activeSub} onSubChange={handleSubChange} />
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}
