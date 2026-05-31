import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Dashboard from "@/pages/dashboard";
import JobsPage from "@/pages/jobs";
import JobDetailPage from "@/pages/job-detail";
import ClientsPage from "@/pages/clients";
import ClientDetailPage from "@/pages/client-detail";
import InvoicesPage from "@/pages/invoices";
import InvoiceDetailPage from "@/pages/invoice-detail";
import FinancialsPage from "@/pages/expenses";
import SchedulePage from "@/pages/schedule";
import WorkersPage from "@/pages/workers";
import WorkerDetailPage from "@/pages/worker-detail";
import EquipmentPage from "@/pages/equipment";
import EquipmentDetailPage from "@/pages/equipment-detail";
import MapPage from "@/pages/map";
import AuditPage from "@/pages/audit";
import SettingsPage from "@/pages/settings";
import AccountingSettingsPage from "@/pages/accounting-settings";
import LegacyAccountingSettingsPage from "@/pages/settings/accounting";
import IntegrationsPage from "@/pages/integrations";
import AuthPage from "@/pages/auth";
import RolesPage from "@/pages/roles";
import QAPage from "@/pages/qa";
import PortalPage from "@/pages/portal";
import ReviewPage from "@/pages/review";
import ReviewDetailPage from "@/pages/review-detail";
import StockDetailPage from "@/pages/stock-detail";
import AssetDetailPage from "@/pages/asset-detail";
import LocationDetailPage from "@/pages/location-detail";
import WorkerJobsPage from "@/pages/worker/jobs";
import WorkerJobDetailPage from "@/pages/worker/job-detail";
import WorkerReportPage from "@/pages/worker/report";
import WorkerSchedulePage from "@/pages/worker/schedule";
import WorkerUploadsPage from "@/pages/worker/uploads";
import WorkerProfilePage from "@/pages/worker/profile";
import JobIntelligenceDashboard from "@/pages/job-intelligence";
import AutomationsPage from "@/pages/automations";
import FinancialExplorerPage from "@/pages/financial-explorer";
import PayrollStagingPage from "@/pages/payroll";
import InvoiceBuilderPage from "@/pages/invoice-builder";
import PayrollExportPage from "@/pages/payroll-export";
import ReconciliationCenterPage from "@/pages/reconciliation-center";
import UnauthorizedPage from "@/pages/unauthorized";
import { useAuth } from "@/lib/mockData";
import { useEffect } from "react";
import { SynchronizationDebugPanel } from "@/components/dev/SynchronizationDebugPanel";
import { Phase2ValidationChecklist } from "@/components/dev/Phase2ValidationChecklist";

function ProtectedRoute({ component: Component, roles }: { component: React.ComponentType, roles?: string[] }) {
  const { user } = useAuth();
  const [location, setLocation] = useLocation();

  useEffect(() => {
    if (!user) {
      setLocation("/auth");
    }
  }, [user, setLocation]);

  if (!user) return null;

  // Temporary RBAC bridge: treat first role as primary for route-gating
  const primaryRoleName = user.roleIds?.[0]?.includes("ceo") ? "CEO" :
    user.roleIds?.[0]?.includes("pm") ? "Project Manager" :
    user.roleIds?.[0]?.includes("admin") ? "Admin" :
    user.roleIds?.[0]?.includes("worker") ? "Worker" : undefined;

  if (roles && (!primaryRoleName || !roles.includes(primaryRoleName))) {
    return <UnauthorizedPage />;
  }

  // If they are a worker and trying to access a non-worker route, redirect to worker dashboard
  if (primaryRoleName === "Worker" && !location.startsWith("/worker")) {
    setLocation("/worker/jobs");
    return null;
  }

  return <Component />;
}

function Router() {
  return (
    <Switch>
      <Route path="/auth" component={AuthPage} />
      <Route path="/portal" component={PortalPage} />
      <Route path="/review">
        <ProtectedRoute component={ReviewPage} roles={["CEO", "Project Manager"]} />
      </Route>
      <Route path="/review/:id">
        <ProtectedRoute component={ReviewDetailPage} roles={["CEO", "Project Manager"]} />
      </Route>
      
      {/* Worker Mobile Routes */}
      <Route path="/worker/jobs">
        <ProtectedRoute component={WorkerJobsPage} roles={["Worker", "CEO", "Project Manager"]} />
      </Route>
      <Route path="/worker/jobs/:id">
        <ProtectedRoute component={WorkerJobDetailPage} roles={["Worker", "CEO", "Project Manager"]} />
      </Route>
      <Route path="/worker/jobs/:id/report">
        <ProtectedRoute component={WorkerReportPage} roles={["Worker", "CEO", "Project Manager"]} />
      </Route>
      <Route path="/worker/schedule">
        <ProtectedRoute component={WorkerSchedulePage} roles={["Worker", "CEO", "Project Manager"]} />
      </Route>
      <Route path="/worker/uploads">
        <ProtectedRoute component={WorkerUploadsPage} roles={["Worker", "CEO", "Project Manager"]} />
      </Route>
      <Route path="/worker/profile">
        <ProtectedRoute component={WorkerProfilePage} roles={["Worker", "CEO", "Project Manager"]} />
      </Route>

      <Route path="/">
        <ProtectedRoute component={Dashboard} />
      </Route>
      <Route path="/job-intelligence">
        <ProtectedRoute component={JobIntelligenceDashboard} roles={["CEO", "Project Manager"]} />
      </Route>
      <Route path="/automations">
        <ProtectedRoute component={AutomationsPage} roles={["CEO", "Admin"]} />
      </Route>
      <Route path="/jobs">
        <ProtectedRoute component={JobsPage} />
      </Route>
      <Route path="/jobs/:id">
        <ProtectedRoute component={JobDetailPage} />
      </Route>
      <Route path="/clients">
        <ProtectedRoute component={ClientsPage} roles={["CEO", "Project Manager"]} />
      </Route>
      <Route path="/clients/:id">
        <ProtectedRoute component={ClientDetailPage} roles={["CEO", "Project Manager"]} />
      </Route>
      <Route path="/invoices">
        <ProtectedRoute component={InvoicesPage} roles={["CEO", "Project Manager"]} />
      </Route>
      <Route path="/invoices/:id">
        <ProtectedRoute component={InvoiceDetailPage} roles={["CEO", "Project Manager"]} />
      </Route>
      <Route path="/expenses">
        <ProtectedRoute component={FinancialsPage} />
      </Route>
      <Route path="/expenses/:id">
        <ProtectedRoute component={FinancialsPage} />
      </Route>
      <Route path="/schedule">
        <ProtectedRoute component={SchedulePage} />
      </Route>
      <Route path="/workers">
        <ProtectedRoute component={WorkersPage} roles={["CEO", "Project Manager"]} />
      </Route>
      <Route path="/workers/:id">
        <ProtectedRoute component={WorkerDetailPage} roles={["CEO", "Project Manager"]} />
      </Route>
      <Route path="/equipment">
        <ProtectedRoute component={EquipmentPage} roles={["CEO", "Project Manager"]} />
      </Route>
      <Route path="/equipment/:id">
        <ProtectedRoute component={EquipmentDetailPage} roles={["CEO", "Project Manager"]} />
      </Route>
      <Route path="/stock/:id">
        <ProtectedRoute component={StockDetailPage} roles={["CEO", "Project Manager"]} />
      </Route>
      <Route path="/assets/:id">
        <ProtectedRoute component={AssetDetailPage} roles={["CEO", "Project Manager"]} />
      </Route>
      <Route path="/locations/:id">
        <ProtectedRoute component={LocationDetailPage} roles={["CEO", "Project Manager"]} />
      </Route>
      <Route path="/map">
        <ProtectedRoute component={MapPage} />
      </Route>
      <Route path="/roles">
        <ProtectedRoute component={RolesPage} roles={["CEO", "Admin"]} />
      </Route>
      <Route path="/audit">
        <ProtectedRoute component={AuditPage} roles={["CEO"]} />
      </Route>
      <Route path="/financial-explorer">
        <ProtectedRoute component={FinancialExplorerPage} roles={["CEO"]} />
      </Route>
      <Route path="/payroll">
        <ProtectedRoute component={PayrollStagingPage} roles={["CEO"]} />
      </Route>
      <Route path="/payroll-export">
        <ProtectedRoute component={PayrollExportPage} roles={["CEO"]} />
      </Route>
      <Route path="/invoice-builder">
        <ProtectedRoute component={InvoiceBuilderPage} roles={["CEO", "Project Manager"]} />
      </Route>
      {/* Phase 5.8: Reconciliation Centre — CEO only */}
      <Route path="/reconciliation-center">
        <ProtectedRoute component={ReconciliationCenterPage} roles={["CEO"]} />
      </Route>
      <Route path="/settings">
        <ProtectedRoute component={SettingsPage} roles={["CEO"]} />
      </Route>
      <Route path="/settings/integrations">
        <ProtectedRoute component={IntegrationsPage} roles={["CEO"]} />
      </Route>
      {/* Phase 5.7: Primary accounting settings route */}
      <Route path="/accounting-settings">
        <ProtectedRoute component={AccountingSettingsPage} roles={["CEO"]} />
      </Route>
      {/* Phase 5.6 legacy route — now delegates to same component */}
      <Route path="/settings/integrations/accounting">
        <ProtectedRoute component={LegacyAccountingSettingsPage} roles={["CEO"]} />
      </Route>
      <Route path="/qa">
        <ProtectedRoute component={QAPage} />
      </Route>
      <Route path="/qa/validation">
        <ProtectedRoute component={Phase2ValidationChecklist} />
      </Route>
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Router />
        <Toaster />
        <SynchronizationDebugPanel />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
