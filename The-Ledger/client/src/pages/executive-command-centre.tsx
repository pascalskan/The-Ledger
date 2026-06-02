import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { Layout } from '@/components/layout';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { useAuth } from '@/lib/mockData';
import {
  getExecutiveSummary,
  getExecutiveHealthSnapshot,
  getCriticalItems,
  getOperationalOverview,
  getGovernanceOverview,
  getFinancialOverview,
  getExecutiveActivityStream,
  recordExecutiveCentreViewed,
  recordExecutiveAlertOpened,
  recordExecutiveDeepLinkOpened,
  type HealthScore,
  type CriticalAlertItem,
} from '@/lib/executiveCommandEngine';
import {
  ACTIVITY_EVENT_TYPE_LABELS,
  ACTIVITY_EVENT_TYPE_COLORS,
  ACTIVITY_PRIORITY_COLORS,
} from '@/lib/activityFeedEngine';
import {
  Shield,
  AlertTriangle,
  Activity,
  GitBranch,
  TrendingUp,
  ExternalLink,
  Bell,
  Zap,
  RefreshCw,
  FileWarning,
  ShieldAlert,
  DollarSign,
  Terminal,
} from 'lucide-react';

// ─────────────────────────────────────────────────────────────────────
// HEALTH BADGE HELPERS
// ─────────────────────────────────────────────────────────────────────

function healthColor(level: HealthScore['level']): string {
  if (level === 'healthy') return 'text-emerald-700 bg-emerald-50 border-emerald-200';
  if (level === 'warning') return 'text-amber-700 bg-amber-50 border-amber-200';
  return 'text-red-700 bg-red-50 border-red-200';
}

function healthDot(level: HealthScore['level']): string {
  if (level === 'healthy') return 'bg-emerald-500';
  if (level === 'warning') return 'bg-amber-500';
  return 'bg-red-500';
}

function priorityColor(p: 'high' | 'critical'): string {
  return p === 'critical'
    ? 'text-red-700 bg-red-50 border-red-200'
    : 'text-amber-700 bg-amber-50 border-amber-200';
}

function categoryIcon(cat: CriticalAlertItem['category']) {
  switch (cat) {
    case 'notification': return <Bell className="h-4 w-4" />;
    case 'workflow': return <GitBranch className="h-4 w-4" />;
    case 'governance': return <Shield className="h-4 w-4" />;
    case 'reconciliation': return <RefreshCw className="h-4 w-4" />;
    case 'exception': return <AlertTriangle className="h-4 w-4" />;
    case 'financial_control': return <DollarSign className="h-4 w-4" />;
    default: return <FileWarning className="h-4 w-4" />;
  }
}

// ─────────────────────────────────────────────────────────────────────
// ROUTE → TESTID HELPER
// Converts a route like "/notifications" → "exec-nav--notifications"
// Preserves the leading dash so testids match the spec expectations.
// ─────────────────────────────────────────────────────────────────────
function routeToTestId(route: string): string {
  return `exec-nav-${route.replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-')}`;
}

// ─────────────────────────────────────────────────────────────────────
// PAGE COMPONENT
// ─────────────────────────────────────────────────────────────────────

export default function ExecutiveCommandCentrePage() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();

  const summary = getExecutiveSummary();
  const health = getExecutiveHealthSnapshot();
  const criticalItems = getCriticalItems();
  const operational = getOperationalOverview();
  const governance = getGovernanceOverview();
  const financial = getFinancialOverview();
  const activityStream = getExecutiveActivityStream(15);

  // Record audit on mount
  useEffect(() => {
    if (user?.name) {
      recordExecutiveCentreViewed(user.name);
    }
  }, [user?.name]);

  function handleDeepLink(route: string, label: string) {
    if (user?.name) recordExecutiveDeepLinkOpened(route, user.name);
    setLocation(route);
  }

  function handleAlertOpen(item: CriticalAlertItem) {
    if (user?.name) recordExecutiveAlertOpened(item.id, user.name);
    setLocation(item.sourceRoute);
  }

  return (
    <Layout>
      <div data-testid="executive-command-centre-page" className="space-y-6">

        {/* ── HEADER ── */}
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-2xl font-bold">Executive Command Centre</h1>
              <Badge variant="outline" className="text-purple-700 border-purple-200 bg-purple-50">
                CEO Only
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              Operational nerve centre. Read-only visibility layer across all platform modules.
            </p>
          </div>
          <Terminal className="h-8 w-8 text-muted-foreground" />
        </div>

        {/* ── DOCTRINE NOTICE ── */}
        <div
          data-testid="exec-doctrine-notice"
          className="rounded-lg border border-amber-200 bg-amber-50 p-4"
        >
          <div className="flex items-start gap-3">
            <ShieldAlert className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-semibold text-amber-800">Executive Command Centre Doctrine</p>
              <p className="text-xs text-amber-700 mt-0.5">
                This centre is a <strong>read-only visibility layer</strong>. It does not create financial mutations,
                approve records, or bypass Review Centre controls. All views are audited. Deep links navigate
                to source modules only.
              </p>
            </div>
          </div>
        </div>

        {/* ── KPI STRIP ── */}
        <div data-testid="exec-kpi-strip" className="grid grid-cols-2 md:grid-cols-5 gap-4">

          {/* Operational Health */}
          <Card data-testid="exec-kpi-operational-health" className="border">
            <CardContent className="pt-4 pb-4">
              <p className="text-xs text-muted-foreground mb-1">Operational Health</p>
              <div className="flex items-center gap-2">
                <span className={cn('h-2.5 w-2.5 rounded-full flex-shrink-0', healthDot(health.operational.level))} />
                <span className="font-semibold text-sm">{health.operational.label}</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">{health.operational.score}/100</p>
            </CardContent>
          </Card>

          {/* Financial Health */}
          <Card data-testid="exec-kpi-financial-health" className="border">
            <CardContent className="pt-4 pb-4">
              <p className="text-xs text-muted-foreground mb-1">Financial Health</p>
              <div className="flex items-center gap-2">
                <span className={cn('h-2.5 w-2.5 rounded-full flex-shrink-0', healthDot(health.financial.level))} />
                <span className="font-semibold text-sm">{health.financial.label}</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">{health.financial.score}/100</p>
            </CardContent>
          </Card>

          {/* Governance Health */}
          <Card data-testid="exec-kpi-governance-health" className="border">
            <CardContent className="pt-4 pb-4">
              <p className="text-xs text-muted-foreground mb-1">Governance Health</p>
              <div className="flex items-center gap-2">
                <span className={cn('h-2.5 w-2.5 rounded-full flex-shrink-0', healthDot(health.governance.level))} />
                <span className="font-semibold text-sm">{health.governance.label}</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">{health.governance.score}/100</p>
            </CardContent>
          </Card>

          {/* Open Exceptions */}
          <Card data-testid="exec-kpi-open-exceptions" className="border">
            <CardContent className="pt-4 pb-4">
              <p className="text-xs text-muted-foreground mb-1">Open Exceptions</p>
              <p className="text-2xl font-bold">{summary.openExceptions}</p>
              <p className="text-xs text-muted-foreground mt-1">Open + Under investigation</p>
            </CardContent>
          </Card>

          {/* Critical Alerts */}
          <Card data-testid="exec-kpi-critical-alerts" className="border">
            <CardContent className="pt-4 pb-4">
              <p className="text-xs text-muted-foreground mb-1">Critical Alerts</p>
              <p className="text-2xl font-bold text-red-600">{summary.criticalAlerts}</p>
              <p className="text-xs text-muted-foreground mt-1">Notifications</p>
            </CardContent>
          </Card>
        </div>

        {/* ── MAIN CONTENT GRID ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* LEFT — Alert Panel (spans 2 cols) */}
          <div className="lg:col-span-2 space-y-6">

            {/* Executive Alert Panel */}
            <Card data-testid="exec-alert-panel">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-red-500" />
                    Executive Alerts
                  </CardTitle>
                  <Badge variant="outline" className="text-xs">
                    {criticalItems.length} items
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-2 max-h-80 overflow-y-auto">
                {criticalItems.length === 0 && (
                  <p className="text-sm text-muted-foreground py-4 text-center">No critical alerts at this time.</p>
                )}
                {criticalItems.map((item) => (
                  <div
                    key={item.id}
                    data-testid={`exec-alert-item-${item.id}`}
                    className="flex items-start gap-3 p-3 rounded-md border bg-card hover:bg-accent/20 cursor-pointer"
                    onClick={() => handleAlertOpen(item)}
                  >
                    <div className={cn('p-1.5 rounded-full border', priorityColor(item.priority))}>
                      {categoryIcon(item.category)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-medium truncate">{item.title}</p>
                        <Badge
                          variant="outline"
                          className={cn('text-xs flex-shrink-0', priorityColor(item.priority))}
                        >
                          {item.priority.toUpperCase()}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{item.description}</p>
                      <p className="text-xs text-muted-foreground mt-1">Source: {item.source}</p>
                    </div>
                    <Button
                      data-testid={`exec-alert-view-source-${item.id}`}
                      variant="ghost"
                      size="sm"
                      className="flex-shrink-0 gap-1 text-xs"
                      onClick={(e) => { e.stopPropagation(); handleAlertOpen(item); }}
                    >
                      <ExternalLink className="h-3 w-3" />
                      View Source
                    </Button>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Operational Overview Panel */}
            <Card data-testid="exec-operational-panel">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Activity className="h-4 w-4 text-blue-500" />
                    Operational Overview
                  </CardTitle>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs gap-1"
                    data-testid="exec-op-link-workflows"
                    onClick={() => handleDeepLink('/workflows', 'Workflow Centre')}
                  >
                    <ExternalLink className="h-3 w-3" />
                    Workflow Centre
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div data-testid="exec-op-active-workflows" className="p-3 rounded-md border bg-card">
                    <p className="text-xs text-muted-foreground">Active Workflows</p>
                    <p className="text-2xl font-bold">{operational.activeWorkflows}</p>
                  </div>
                  <div data-testid="exec-op-active-automations" className="p-3 rounded-md border bg-card">
                    <p className="text-xs text-muted-foreground">Active Automations</p>
                    <p className="text-2xl font-bold">{operational.activeAutomations}</p>
                  </div>
                  <div data-testid="exec-op-scheduled" className="p-3 rounded-md border bg-card">
                    <p className="text-xs text-muted-foreground">Scheduled Automations</p>
                    <p className="text-2xl font-bold">{operational.scheduledAutomations}</p>
                  </div>
                  <div data-testid="exec-op-event-volume" className="p-3 rounded-md border bg-card">
                    <p className="text-xs text-muted-foreground">Event Volume</p>
                    <p className="text-2xl font-bold">{operational.eventVolume}</p>
                  </div>
                  <div data-testid="exec-op-activity-volume" className="p-3 rounded-md border bg-card">
                    <p className="text-xs text-muted-foreground">Activity Volume</p>
                    <p className="text-2xl font-bold">{operational.activityVolume}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Financial Oversight Panel */}
            <Card data-testid="exec-financial-panel">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-emerald-500" />
                    Financial Oversight
                  </CardTitle>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-xs gap-1"
                      data-testid="exec-fin-link-reconciliation"
                      onClick={() => handleDeepLink('/reconciliation-center', 'Reconciliation Centre')}
                    >
                      <ExternalLink className="h-3 w-3" />
                      Reconciliation
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-xs gap-1"
                      data-testid="exec-fin-link-financial-explorer"
                      onClick={() => handleDeepLink('/financial-explorer', 'Financial Explorer')}
                    >
                      <ExternalLink className="h-3 w-3" />
                      Syncs
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div data-testid="exec-fin-failed-syncs" className={cn('p-3 rounded-md border', financial.failedSyncs > 0 ? 'bg-red-50 border-red-200' : 'bg-card')}>
                    <p className="text-xs text-muted-foreground">Failed Syncs</p>
                    <p className={cn('text-2xl font-bold', financial.failedSyncs > 0 ? 'text-red-600' : '')}>{financial.failedSyncs}</p>
                  </div>
                  <div data-testid="exec-fin-recon-issues" className={cn('p-3 rounded-md border', financial.openReconciliationIssues > 0 ? 'bg-amber-50 border-amber-200' : 'bg-card')}>
                    <p className="text-xs text-muted-foreground">Reconciliation Issues</p>
                    <p className={cn('text-2xl font-bold', financial.openReconciliationIssues > 0 ? 'text-amber-600' : '')}>{financial.openReconciliationIssues}</p>
                  </div>
                  <div data-testid="exec-fin-pending-controls" className={cn('p-3 rounded-md border', financial.pendingFinancialControls > 0 ? 'bg-amber-50 border-amber-200' : 'bg-card')}>
                    <p className="text-xs text-muted-foreground">Pending Controls</p>
                    <p className={cn('text-2xl font-bold', financial.pendingFinancialControls > 0 ? 'text-amber-600' : '')}>{financial.pendingFinancialControls}</p>
                  </div>
                  <div data-testid="exec-fin-open-exceptions" className={cn('p-3 rounded-md border', financial.openExceptions > 0 ? 'bg-rose-50 border-rose-200' : 'bg-card')}>
                    <p className="text-xs text-muted-foreground">Open Exceptions</p>
                    <p className={cn('text-2xl font-bold', financial.openExceptions > 0 ? 'text-rose-600' : '')}>{financial.openExceptions}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

          </div>

          {/* RIGHT COLUMN */}
          <div className="space-y-6">

            {/* Governance Overview Panel */}
            <Card data-testid="exec-governance-panel">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Shield className="h-4 w-4 text-purple-500" />
                    Governance
                  </CardTitle>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs gap-1"
                    data-testid="exec-gov-link-governance"
                    onClick={() => handleDeepLink('/automation-governance', 'Automation Governance')}
                  >
                    <ExternalLink className="h-3 w-3" />
                    Open
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                <div data-testid="exec-gov-requires-review" className="flex items-center justify-between p-2 rounded border">
                  <span className="text-xs text-muted-foreground">Requires Review</span>
                  <Badge variant="outline" className={governance.requiresReview > 0 ? 'text-amber-700 border-amber-200 bg-amber-50' : ''}>
                    {governance.requiresReview}
                  </Badge>
                </div>
                <div data-testid="exec-gov-restricted" className="flex items-center justify-between p-2 rounded border">
                  <span className="text-xs text-muted-foreground">Restricted</span>
                  <Badge variant="outline" className={governance.restricted > 0 ? 'text-orange-700 border-orange-200 bg-orange-50' : ''}>
                    {governance.restricted}
                  </Badge>
                </div>
                <div data-testid="exec-gov-suspended" className="flex items-center justify-between p-2 rounded border">
                  <span className="text-xs text-muted-foreground">Suspended</span>
                  <Badge variant="outline" className={governance.suspended > 0 ? 'text-red-700 border-red-200 bg-red-50' : ''}>
                    {governance.suspended}
                  </Badge>
                </div>
                <div data-testid="exec-gov-fin-sensitive" className="flex items-center justify-between p-2 rounded border">
                  <span className="text-xs text-muted-foreground">Fin. Sensitive Workflows</span>
                  <Badge variant="outline">{governance.financiallySensitiveWorkflows}</Badge>
                </div>
              </CardContent>
            </Card>

            {/* Module Deep Links */}
            <Card data-testid="exec-deep-links-panel">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Module Navigation</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {([
                  { label: 'Notification Centre', route: '/notifications', icon: Bell },
                  { label: 'Workflow Centre', route: '/workflows', icon: GitBranch },
                  { label: 'Automation Governance', route: '/automation-governance', icon: Shield },
                  { label: 'Exception Resolution', route: '/exception-resolution-center', icon: AlertTriangle },
                  { label: 'Reconciliation Centre', route: '/reconciliation-center', icon: RefreshCw },
                  { label: 'Financial Explorer', route: '/financial-explorer', icon: TrendingUp },
                  { label: 'Activity Feed', route: '/activity-feed', icon: Activity },
                  { label: 'Event Monitor', route: '/event-monitor', icon: Zap },
                ] as { label: string; route: string; icon: React.ElementType }[]).map(({ label, route, icon: Icon }) => (
                  <Button
                    key={route}
                    data-testid={routeToTestId(route)}
                    variant="outline"
                    size="sm"
                    className="w-full justify-start gap-2 text-xs"
                    onClick={() => handleDeepLink(route, label)}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {label}
                  </Button>
                ))}
              </CardContent>
            </Card>

          </div>
        </div>

        {/* ── EXECUTIVE ACTIVITY STREAM ── */}
        <Card data-testid="exec-activity-stream">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <Activity className="h-4 w-4" />
                Executive Activity Stream
              </CardTitle>
              <Button
                variant="ghost"
                size="sm"
                className="text-xs gap-1"
                data-testid="exec-activity-link"
                onClick={() => handleDeepLink('/activity-feed', 'Activity Feed')}
              >
                <ExternalLink className="h-3 w-3" />
                View All
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-2 max-h-72 overflow-y-auto">
            {activityStream.map((event) => (
              <div
                key={event.id}
                data-testid={`exec-activity-event-${event.id}`}
                className="flex items-start gap-3 p-2 rounded-md border bg-card text-sm"
              >
                <Badge
                  variant="outline"
                  className={cn('text-xs flex-shrink-0', ACTIVITY_PRIORITY_COLORS[event.priority])}
                >
                  {event.priority}
                </Badge>
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{event.title}</p>
                  <p className="text-xs text-muted-foreground truncate">{event.description}</p>
                </div>
                <Badge
                  variant="outline"
                  className={cn('text-xs flex-shrink-0', ACTIVITY_EVENT_TYPE_COLORS[event.type])}
                >
                  {ACTIVITY_EVENT_TYPE_LABELS[event.type]}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>

      </div>
    </Layout>
  );
}
