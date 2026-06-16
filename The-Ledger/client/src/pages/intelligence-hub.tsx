import { useEffect } from "react";
import { Layout } from "@/components/layout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { LayoutDashboard, BarChart3, BookOpen, FileDown, Activity, ShieldAlert, Download, Send } from "lucide-react";
import { useLocation, useSearch } from "wouter";
import { useStore, useAuth } from "@/lib/mockData";
import UnauthorizedPage from "@/pages/unauthorized";
import {
  recordIntelligenceHubViewed,
  recordIntelligenceHubTabViewed,
  recordAnalyticsViewed,
} from "@/lib/analyticsEngine";
import { recordExecutiveCentreViewed } from "@/lib/executiveCommandEngine";
import { IntelligenceOverview } from "@/components/intelligence/IntelligenceOverview";
import { ActivityHub } from "@/components/intelligence/ActivityHub";
import { AnalyticsCentreContent } from "@/pages/analytics-centre";
import { ReportsContent, ExportsContent, DistributionContent } from "@/pages/reporting-centre";

const tabLabels: Record<string, string> = {
  overview: "",
  analytics: "Analytics",
  reports: "Reports",
  exports: "Exports",
  activity: "Activity",
};

// Sub-tab state resets when switching parent tabs — this is intentional
// (Finance Hub precedent). Only Exports carries a sub-tab.
function defaultSub(tab: string): string {
  return tab === "exports" ? "exports" : "";
}

export default function IntelligenceHubPage() {
  const [, setLocation] = useLocation();
  const search = useSearch();
  const params = new URLSearchParams(search);
  const rawTab = params.get("tab") ?? "overview";
  const activeTab = rawTab in tabLabels ? rawTab : "overview";
  const activeSub = params.get("sub") ?? defaultSub(activeTab);
  const { user } = useAuth();
  const { roles } = useStore();

  // Inner CEO check — defence-in-depth if outer RBAC is ever relaxed (NG-05)
  const isCEO = (user?.roleIds || [])
    .map((rid: string) => roles.find((r: any) => r.id === rid)?.name)
    .includes("CEO");

  // Audit: intelligence_hub_viewed — fires once on mount regardless of active tab (§10.6)
  useEffect(() => {
    if (user?.name && isCEO) recordIntelligenceHubViewed(user.name);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Audit: tab activation — hub-level recorder plus the existing per-module
  // recorder so module audit trails keep firing from their new mount point (§10.6)
  useEffect(() => {
    if (!user?.name || !isCEO) return;
    recordIntelligenceHubTabViewed(activeTab, user.name);
    if (activeTab === "overview") {
      recordExecutiveCentreViewed(user.name);
    } else if (activeTab === "analytics") {
      recordAnalyticsViewed(user.name);
    }
  }, [activeTab]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!isCEO) return <UnauthorizedPage />;

  function handleTabChange(tab: string) {
    setLocation(`/intelligence?tab=${tab}`);
  }

  function handleSubChange(sub: string) {
    setLocation(`/intelligence?tab=${activeTab}&sub=${sub}`);
  }

  return (
    <Layout>
      <div className="space-y-6 p-6" data-testid="intelligence-hub-page">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold" data-testid="intelligence-hub-heading">
              Intelligence{activeTab !== "overview" && tabLabels[activeTab] ? ` — ${tabLabels[activeTab]}` : ""}
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Health, analytics, reports and activity — your business intelligence in one place.
            </p>
          </div>
          <Badge variant="outline" className="text-xs" data-testid="intelligence-hub-ceo-badge">
            CEO Only
          </Badge>
        </div>

        <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-6">
          <TabsList className="flex flex-wrap h-auto gap-1">
            <TabsTrigger value="overview" className="flex items-center gap-1.5" data-testid="intelligence-tab-overview">
              <LayoutDashboard className="h-3.5 w-3.5" /> Overview
            </TabsTrigger>
            <TabsTrigger value="analytics" className="flex items-center gap-1.5" data-testid="intelligence-tab-analytics">
              <BarChart3 className="h-3.5 w-3.5" /> Analytics
            </TabsTrigger>
            <TabsTrigger value="reports" className="flex items-center gap-1.5" data-testid="intelligence-tab-reports">
              <BookOpen className="h-3.5 w-3.5" /> Reports
            </TabsTrigger>
            <TabsTrigger value="exports" className="flex items-center gap-1.5" data-testid="intelligence-tab-exports">
              <FileDown className="h-3.5 w-3.5" /> Exports
            </TabsTrigger>
            <TabsTrigger value="activity" className="flex items-center gap-1.5" data-testid="intelligence-tab-activity">
              <Activity className="h-3.5 w-3.5" /> Activity
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" data-testid="intelligence-overview-panel">
            <div className="space-y-4">
              {/* Hub-level doctrine notice — rendered on Overview only (§6.1) */}
              <div
                data-testid="intelligence-hub-doctrine-notice"
                className="rounded-lg border border-amber-200 bg-amber-50 p-4"
              >
                <div className="flex items-start gap-3">
                  <ShieldAlert className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-semibold text-amber-800">Intelligence Hub — Read-Only Advisory Layer</p>
                    <p className="text-sm text-amber-700 mt-0.5">
                      All intelligence views are informational. Nothing here approves records, creates
                      financial mutations, or bypasses the Review Centre. Deep links navigate to source
                      modules only.
                    </p>
                  </div>
                </div>
              </div>
              <IntelligenceOverview />
            </div>
          </TabsContent>

          <TabsContent value="analytics" data-testid="intelligence-analytics-panel">
            <AnalyticsCentreContent embedded />
          </TabsContent>

          <TabsContent value="reports" data-testid="intelligence-reports-panel">
            <ReportsContent embedded />
          </TabsContent>

          <TabsContent value="exports" data-testid="intelligence-exports-panel">
            {/* Exports/Distribution sub-tabs — UX-4 Accounting-tab pattern (§6.5) */}
            <Tabs value={activeSub || "exports"} onValueChange={handleSubChange}>
              <TabsList>
                <TabsTrigger value="exports" data-testid="exports-subtab-exports">
                  <Download className="h-3.5 w-3.5 mr-1" /> Exports
                </TabsTrigger>
                <TabsTrigger value="distribution" data-testid="exports-subtab-distribution">
                  <Send className="h-3.5 w-3.5 mr-1" /> Distribution
                </TabsTrigger>
              </TabsList>
              <TabsContent value="exports" data-testid="exports-subtab-exports-panel">
                <ExportsContent />
              </TabsContent>
              <TabsContent value="distribution" data-testid="exports-subtab-distribution-panel">
                <DistributionContent />
              </TabsContent>
            </Tabs>
          </TabsContent>

          <TabsContent value="activity" data-testid="intelligence-activity-panel">
            <ActivityHub />
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}
