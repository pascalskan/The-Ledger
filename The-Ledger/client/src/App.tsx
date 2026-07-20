import { useEffect, lazy, Suspense } from "react";
import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { LoadingState } from "@/components/page-shell";
// Eager, side-effect import. portalAudit owns an app-wide audit log and exposes
// a read-only window.__portalAudit seam for the doctrine suite. It is NOT
// portal-only state: internal CEO/PM actions write to it too
// (document_shared_with_client, client_request_resolved, ...), so a PM can
// share a document without the portal ever being visited.
//
// Before E-7 it was reachable from the single bundle at boot. Once routes went
// lazy it shipped only in the portal chunk, so those internal flows recorded
// into — and asserted against — a log that did not exist yet. It has no imports
// of its own (136 lines, zero deps), so loading it eagerly costs essentially
// nothing and restores the invariant.
import "@/lib/portalAudit";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
const FinanceHubPage = lazy(() => import("@/pages/finance-hub"));
const IntelligenceHubPage = lazy(() => import("@/pages/intelligence-hub"));
const Dashboard = lazy(() => import("@/pages/dashboard"));
const JobsPage = lazy(() => import("@/pages/jobs"));
const OperationsHubPage = lazy(() => import("@/pages/operations-hub"));
const JobDetailPage = lazy(() => import("@/pages/job-detail"));
const ClientsPage = lazy(() => import("@/pages/clients"));
const ClientDetailPage = lazy(() => import("@/pages/client-detail"));
const ClientRequestsPage = lazy(() => import("@/pages/client-requests"));
const InvoicesPage = lazy(() => import("@/pages/invoices"));
const InvoiceDetailPage = lazy(() => import("@/pages/invoice-detail"));
const FinancialsPage = lazy(() => import("@/pages/expenses"));
const SchedulePage = lazy(() => import("@/pages/schedule"));
const WorkersPage = lazy(() => import("@/pages/workers"));
const WorkerDetailPage = lazy(() => import("@/pages/worker-detail"));
const EquipmentPage = lazy(() => import("@/pages/equipment"));
const EquipmentDetailPage = lazy(() => import("@/pages/equipment-detail"));
const MapPage = lazy(() => import("@/pages/map"));
const AuditPage = lazy(() => import("@/pages/audit"));
const SettingsPage = lazy(() => import("@/pages/settings"));
const AccountingSettingsPage = lazy(() => import("@/pages/accounting-settings"));
const LegacyAccountingSettingsPage = lazy(() => import("@/pages/settings/accounting"));
const IntegrationsPage = lazy(() => import("@/pages/integrations"));
import AuthPage from "@/pages/auth";
const RolesPage = lazy(() => import("@/pages/roles"));
const QAPage = lazy(() => import("@/pages/qa"));
const PortalPage = lazy(() => import("@/pages/portal"));
const ReviewPage = lazy(() => import("@/pages/review"));
const ReviewDetailPage = lazy(() => import("@/pages/review-detail"));
const StockDetailPage = lazy(() => import("@/pages/stock-detail"));
const AssetDetailPage = lazy(() => import("@/pages/asset-detail"));
const LocationDetailPage = lazy(() => import("@/pages/location-detail"));
const WorkerHomePage = lazy(() => import("@/pages/worker/home"));
const WorkerJobsPage = lazy(() => import("@/pages/worker/jobs"));
const WorkerJobDetailPage = lazy(() => import("@/pages/worker/job-detail"));
const WorkerReportPage = lazy(() => import("@/pages/worker/report"));
const WorkerSchedulePage = lazy(() => import("@/pages/worker/schedule"));
const WorkerUploadsPage = lazy(() => import("@/pages/worker/uploads"));
const WorkerProfilePage = lazy(() => import("@/pages/worker/profile"));
const WorkerHistoryPage = lazy(() => import("@/pages/worker/history"));
const JobIntelligenceDashboard = lazy(() => import("@/pages/job-intelligence"));
const AutomationsPage = lazy(() => import("@/pages/automations"));
const AutomationGovernanceCentrePage = lazy(() => import("@/pages/automation-governance"));
const FinancialExplorerPage = lazy(() => import("@/pages/financial-explorer"));
const PayrollStagingPage = lazy(() => import("@/pages/payroll"));
const InvoiceBuilderPage = lazy(() => import("@/pages/invoice-builder"));
const PayrollExportPage = lazy(() => import("@/pages/payroll-export"));
const ReconciliationCenterPage = lazy(() => import("@/pages/reconciliation-center"));
const ExceptionResolutionCenterPage = lazy(() => import("@/pages/exception-resolution-center"));
const NotificationCentrePage = lazy(() => import("@/pages/notification-center"));
const EventMonitorPage = lazy(() => import("@/pages/event-monitor"));
const WorkflowCentrePage = lazy(() => import("@/pages/workflows"));
import UnauthorizedPage from "@/pages/unauthorized";
import { useAuth } from "@/lib/mockData";
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

  // If they are a worker and trying to access a non-worker route, redirect to worker home
  if (primaryRoleName === "Worker" && !location.startsWith("/worker")) {
    setLocation("/worker/home");
    return null;
  }

  return <Component />;
}

// Synchronous redirect to Finance Hub — matches ProtectedRoute pattern (lines 86–88).
// Do NOT use useEffect — it creates a blank frame and races with auth checks.
// Wouter 3.x setLocation accepts a single string argument only.
function RedirectToFinance({ tab, sub }: { tab: string; sub?: string }) {
  const [, setLocation] = useLocation();
  const qs = sub ? `?tab=${tab}&sub=${sub}` : `?tab=${tab}`;
  setLocation(`/finance${qs}`);
  return null;
}

// UX-5: synchronous redirect to Intelligence Hub — RedirectToFinance pattern.
function RedirectToIntelligence({ tab, sub }: { tab: string; sub?: string }) {
  const [, setLocation] = useLocation();
  const qs = sub ? `?tab=${tab}&sub=${sub}` : `?tab=${tab}`;
  setLocation(`/intelligence${qs}`);
  return null;
}

// UX-5: role-aware /notifications. CEO notification consumption moved to the
// hub Activity tab; PM keeps the job-scoped Notification Centre page
// (Notification Doctrine RBAC). The role check precedes the redirect so a PM
// is never bounced into an Unauthorized hub (spec §9 / risk P0-2).
function NotificationsRouteSwitch() {
  const { user } = useAuth();
  const isCEO = user?.roleIds?.[0]?.includes("ceo");
  if (isCEO) return <RedirectToIntelligence tab="activity" />;
  return <NotificationCentrePage />;
}

/**
 * Fallback shown while a route chunk loads.
 *
 * Deliberately minimal. 42 of 46 pages render their own <Layout>, so the shell
 * lives INSIDE the page — which means this fallback replaces the entire screen,
 * navigation included, not just a content area. A full skeleton here would
 * flash structure that is about to be replaced wholesale, which reads worse
 * than a quiet placeholder.
 *
 * It still announces itself to assistive technology via LoadingState's
 * aria-busy / aria-live, so a screen-reader user is told content is loading
 * rather than meeting an empty document.
 *
 * Only the FIRST visit to a route pays this; the chunk is cached thereafter.
 */
function RouteFallback() {
  return (
    <div className="min-h-screen bg-background p-6 md:p-8">
      <div className="mx-auto max-w-6xl">
        <LoadingState rows={4} label="Loading page" testId="route-loading" />
      </div>
    </div>
  );
}

function Router() {
  return (
    <Suspense fallback={<RouteFallback />}>
    <Switch>
      <Route path="/auth" component={AuthPage} />
      {/* Client Portal — self-authenticating surface. The single page controller
          renders the portal shell + the active section from the URL. */}
      <Route path="/portal" component={PortalPage} />
      <Route path="/portal/:section" component={PortalPage} />
      <Route path="/portal/:section/:id" component={PortalPage} />
      <Route path="/review">
        <ProtectedRoute component={ReviewPage} roles={["CEO", "Project Manager"]} />
      </Route>
      <Route path="/review/:id">
        <ProtectedRoute component={ReviewDetailPage} roles={["CEO", "Project Manager"]} />
      </Route>
      
      {/* Worker Mobile Routes */}
      <Route path="/worker/home">
        <ProtectedRoute component={WorkerHomePage} roles={["Worker", "CEO", "Project Manager"]} />
      </Route>
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
      <Route path="/worker/history">
        <ProtectedRoute component={WorkerHistoryPage} roles={["Worker", "CEO", "Project Manager"]} />
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
        <ProtectedRoute component={AutomationsPage} roles={["CEO"]} />
      </Route>
      {/* Phase 6.0D: Automation Governance Centre — CEO only */}
      <Route path="/automation-governance">
        <ProtectedRoute component={AutomationGovernanceCentrePage} roles={["CEO"]} />
      </Route>
      {/* Phase 6.1 / UX-5: Notification Centre — role-aware at its original
          declaration position (wouter first-match-wins — spec §5.2).
          CEO → hub Activity tab redirect; PM → Notification Centre page */}
      <Route path="/notifications">
        <ProtectedRoute component={NotificationsRouteSwitch} roles={["CEO", "Project Manager"]} />
      </Route>
      {/* UX-5: Activity Feed consolidated into the Intelligence Hub */}
      <Route path="/activity-feed">
        <ProtectedRoute component={() => <RedirectToIntelligence tab="activity" />} roles={["CEO"]} />
      </Route>
      {/* Phase 6.3 / UX-5: Event Monitor — retained as a hidden CEO-only route
          (no nav item, NO redirect — spec P0-B; full seeded bus history) */}
      <Route path="/event-monitor">
        <ProtectedRoute component={EventMonitorPage} roles={["CEO"]} />
      </Route>
      {/* Phase 6.4: Workflow Centre — CEO only */}
      <Route path="/workflows">
        <ProtectedRoute component={WorkflowCentrePage} roles={["CEO"]} />
      </Route>
      {/* UX-5: Executive Command Centre consolidated into the Intelligence Hub */}
      <Route path="/executive-command-centre">
        <ProtectedRoute component={() => <RedirectToIntelligence tab="overview" />} roles={["CEO"]} />
      </Route>
      {/* UX-5: Analytics Centre consolidated into the Intelligence Hub */}
      <Route path="/analytics-centre">
        <ProtectedRoute component={() => <RedirectToIntelligence tab="analytics" />} roles={["CEO"]} />
      </Route>
      {/* UX-5: Reporting Centre consolidated into the Intelligence Hub */}
      <Route path="/reporting-centre">
        <ProtectedRoute component={() => <RedirectToIntelligence tab="reports" />} roles={["CEO"]} />
      </Route>
      {/* UX-4: Finance Hub — CEO only */}
      <Route path="/finance">
        <ProtectedRoute component={FinanceHubPage} roles={["CEO"]} />
      </Route>
      {/* UX-5: Intelligence Hub — CEO only */}
      <Route path="/intelligence">
        <ProtectedRoute component={IntelligenceHubPage} roles={["CEO"]} />
      </Route>

      {/* UX-4: Finance Hub redirect routes — must precede legacy route declarations.
          /invoices/:id before /invoices; /payroll-export before /payroll (Wouter first-match-wins) */}
      <Route path="/financial-explorer">
        <ProtectedRoute component={() => <RedirectToFinance tab="records" />} roles={["CEO"]} />
      </Route>
      <Route path="/invoices/:id">
        <ProtectedRoute component={() => <RedirectToFinance tab="invoicing" />} roles={["CEO"]} />
      </Route>
      <Route path="/invoices">
        <ProtectedRoute component={() => <RedirectToFinance tab="invoicing" />} roles={["CEO"]} />
      </Route>
      <Route path="/invoice-builder">
        <ProtectedRoute component={() => <RedirectToFinance tab="invoicing" />} roles={["CEO"]} />
      </Route>
      <Route path="/payroll-export">
        <ProtectedRoute component={() => <RedirectToFinance tab="payroll" sub="export" />} roles={["CEO"]} />
      </Route>
      <Route path="/payroll">
        <ProtectedRoute component={() => <RedirectToFinance tab="payroll" />} roles={["CEO"]} />
      </Route>
      <Route path="/accounting-settings">
        <ProtectedRoute component={() => <RedirectToFinance tab="accounting" />} roles={["CEO"]} />
      </Route>
      <Route path="/reconciliation-center">
        <ProtectedRoute component={() => <RedirectToFinance tab="accounting" sub="reconciliation" />} roles={["CEO"]} />
      </Route>
      <Route path="/exception-resolution-center">
        <ProtectedRoute component={() => <RedirectToFinance tab="accounting" sub="exceptions" />} roles={["CEO"]} />
      </Route>

      {/* UX-8: Operations Hub. Standalone operational routes are retained
          below as deep-link targets — the hub is an additional way in. */}
      <Route path="/operations">
        <ProtectedRoute component={OperationsHubPage} roles={["CEO", "Project Manager"]} />
      </Route>
      <Route path="/jobs">
        <ProtectedRoute component={JobsPage} />
      </Route>
      <Route path="/jobs/:id">
        <ProtectedRoute component={JobDetailPage} />
      </Route>
      {/* CL-8: Client Requests management surface — deliberately separate from
          the Review Centre (CLIENT_REQUEST_DOMAIN.md). CEO sees all requests;
          PM sees requests for jobs they are assigned to. */}
      <Route path="/client-requests">
        <ProtectedRoute component={ClientRequestsPage} roles={["CEO", "Project Manager"]} />
      </Route>
      <Route path="/clients">
        <ProtectedRoute component={ClientsPage} roles={["CEO", "Project Manager"]} />
      </Route>
      <Route path="/clients/:id">
        <ProtectedRoute component={ClientDetailPage} roles={["CEO", "Project Manager"]} />
      </Route>
      <Route path="/invoices">
        <ProtectedRoute component={InvoicesPage} roles={["CEO"]} />
      </Route>
      <Route path="/invoices/:id">
        <ProtectedRoute component={InvoiceDetailPage} roles={["CEO"]} />
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
        <ProtectedRoute component={InvoiceBuilderPage} roles={["CEO"]} />
      </Route>
      {/* Phase 5.8: Reconciliation Centre — CEO only */}
      <Route path="/reconciliation-center">
        <ProtectedRoute component={ReconciliationCenterPage} roles={["CEO"]} />
      </Route>
      {/* Phase 5.9: Exception Resolution Centre — CEO only */}
      <Route path="/exception-resolution-center">
        <ProtectedRoute component={ExceptionResolutionCenterPage} roles={["CEO"]} />
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
    </Suspense>
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
