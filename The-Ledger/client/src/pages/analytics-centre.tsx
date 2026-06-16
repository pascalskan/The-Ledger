/**
 * ANALYTICS CENTRE — Phase 6.6
 *
 * Business Intelligence & Analytics Layer.
 * CEO-only read-only intelligence centre.
 *
 * Route: /analytics-centre
 */

import { useEffect } from 'react';
import { useLocation } from 'wouter';
import { Layout } from '@/components/layout';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { useAuth } from '@/lib/mockData';
import {
  getAnalyticsSummary,
  getOperationalHealth,
  getFinancialHealth,
  getGovernanceRisk,
  getWorkflowEfficiency,
  getAutomationEffectiveness,
  getCriticalRisks,
  getTrendAnalysis,
  getForecasts,
  getBottleneckAnalysis,
  recordAnalyticsViewed,
  recordForecastViewed,
  recordRiskInvestigationOpened,
  type RiskItem,
  type BottleneckItem,
} from '@/lib/analyticsEngine';
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Minus,
  AlertTriangle,
  Shield,
  Activity,
  Zap,
  ArrowUpRight,
  ArrowDownRight,
  ExternalLink,
  TriangleAlert,
  ShieldAlert,
  GitBranch,
  RefreshCw,
  DollarSign,
} from 'lucide-react';

// ─────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────

function levelColor(level: 'healthy' | 'warning' | 'critical'): string {
  if (level === 'healthy') return 'text-emerald-700 bg-emerald-50 border-emerald-200';
  if (level === 'warning') return 'text-amber-700 bg-amber-50 border-amber-200';
  return 'text-red-700 bg-red-50 border-red-200';
}

function levelDot(level: 'healthy' | 'warning' | 'critical'): string {
  if (level === 'healthy') return 'bg-emerald-500';
  if (level === 'warning') return 'bg-amber-500';
  return 'bg-red-500';
}

function riskColor(severity: string): string {
  if (severity === 'critical') return 'text-red-700 bg-red-50 border-red-200';
  if (severity === 'high') return 'text-orange-700 bg-orange-50 border-orange-200';
  if (severity === 'medium') return 'text-amber-700 bg-amber-50 border-amber-200';
  return 'text-slate-700 bg-slate-50 border-slate-200';
}

function TrendIcon({ direction }: { direction: string }) {
  if (direction === 'up') return <TrendingUp className="h-4 w-4 text-emerald-600" />;
  if (direction === 'down') return <TrendingDown className="h-4 w-4 text-red-600" />;
  return <Minus className="h-4 w-4 text-amber-600" />;
}

function CategoryIcon({ category }: { category: RiskItem['category'] | BottleneckItem['category'] }) {
  switch (category) {
    case 'governance': return <Shield className="h-4 w-4" />;
    case 'financial': return <DollarSign className="h-4 w-4" />;
    case 'workflow': return <GitBranch className="h-4 w-4" />;
    case 'review': return <ShieldAlert className="h-4 w-4" />;
    case 'exception': return <TriangleAlert className="h-4 w-4" />;
    case 'automation': return <Zap className="h-4 w-4" />;
    default: return <Activity className="h-4 w-4" />;
  }
}

// ─────────────────────────────────────────────────────────────────────
// CONTENT COMPONENT
// UX-5: extracted so the Intelligence Hub Analytics tab can mount the
// centre unchanged (embedded suppresses the page-level header — the hub
// supplies the single h1). Legacy default export wraps it in Layout.
// ─────────────────────────────────────────────────────────────────────

export function AnalyticsCentreContent({ embedded = false }: { embedded?: boolean }) {
  const { user } = useAuth();
  const [, setLocation] = useLocation();

  const summary = getAnalyticsSummary();
  const criticalRisks = getCriticalRisks();
  const trends = getTrendAnalysis();
  const forecasts = getForecasts();
  const bottlenecks = getBottleneckAnalysis();

  useEffect(() => {
    if (user?.name) {
      recordAnalyticsViewed(user.name);
    }
  }, [user?.name]);

  function handleDeepLink(route: string) {
    setLocation(route);
  }

  function handleForecastView() {
    if (user?.name) recordForecastViewed(user.name);
  }

  function handleRiskOpen(riskId: string, route: string) {
    if (user?.name) recordRiskInvestigationOpened(riskId, user.name);
    setLocation(route);
  }

  return (
      <div data-testid="analytics-centre-page" className="space-y-6">

        {/* ── HEADER (suppressed when embedded in the Intelligence Hub) ── */}
        {!embedded && (
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-2xl font-bold">Analytics Centre</h1>
              <Badge variant="outline" className="text-purple-700 border-purple-200 bg-purple-50">
                CEO Only
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              Business intelligence layer — trends, forecasts, and risk intelligence. Advisory only.
            </p>
          </div>
          <BarChart3 className="h-8 w-8 text-muted-foreground" />
        </div>
        )}

        {/* ── DOCTRINE NOTICE ── */}
        <div
          data-testid="analytics-doctrine-notice"
          className="rounded-lg border border-amber-200 bg-amber-50 p-4"
        >
          <div className="flex items-start gap-3">
            <ShieldAlert className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-semibold text-amber-800">Analytics Centre Doctrine</p>
              <p className="text-xs text-amber-700 mt-0.5">
                Analytics are <strong>advisory only</strong>. This centre may analyse, aggregate, forecast, and score risk.
                It may <strong>never</strong> approve records, change records, create records, or trigger
                financial mutations. All views are audited.
              </p>
            </div>
          </div>
        </div>

        {/* ── KPI STRIP ── */}
        <div data-testid="analytics-kpi-strip" className="grid grid-cols-2 md:grid-cols-5 gap-4">

          <Card data-testid="analytics-kpi-operational-health" className="border">
            <CardContent className="pt-4 pb-4">
              <p className="text-xs text-muted-foreground mb-1">Operational Health</p>
              <div className="flex items-center gap-2">
                <span className={cn('h-2.5 w-2.5 rounded-full flex-shrink-0', levelDot(summary.operationalHealth.level))} />
                <span className="font-semibold text-sm">{summary.operationalHealth.label}</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">{summary.operationalHealth.score}/100</p>
            </CardContent>
          </Card>

          <Card data-testid="analytics-kpi-financial-health" className="border">
            <CardContent className="pt-4 pb-4">
              <p className="text-xs text-muted-foreground mb-1">Financial Health</p>
              <div className="flex items-center gap-2">
                <span className={cn('h-2.5 w-2.5 rounded-full flex-shrink-0', levelDot(summary.financialHealth.level))} />
                <span className="font-semibold text-sm">{summary.financialHealth.label}</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">{summary.financialHealth.score}/100</p>
            </CardContent>
          </Card>

          <Card data-testid="analytics-kpi-governance-risk" className="border">
            <CardContent className="pt-4 pb-4">
              <p className="text-xs text-muted-foreground mb-1">Governance Risk</p>
              <div className="flex items-center gap-2">
                <span className={cn('h-2.5 w-2.5 rounded-full flex-shrink-0', levelDot(summary.governanceRisk.level))} />
                <span className="font-semibold text-sm">{summary.governanceRisk.label}</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">{summary.governanceRisk.score}/100</p>
            </CardContent>
          </Card>

          <Card data-testid="analytics-kpi-workflow-efficiency" className="border">
            <CardContent className="pt-4 pb-4">
              <p className="text-xs text-muted-foreground mb-1">Workflow Efficiency</p>
              <div className="flex items-center gap-2">
                <span className={cn('h-2.5 w-2.5 rounded-full flex-shrink-0', levelDot(summary.workflowEfficiency.level))} />
                <span className="font-semibold text-sm">{summary.workflowEfficiency.label}</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">{summary.workflowEfficiency.score}/100</p>
            </CardContent>
          </Card>

          <Card data-testid="analytics-kpi-automation-effectiveness" className="border">
            <CardContent className="pt-4 pb-4">
              <p className="text-xs text-muted-foreground mb-1">Automation</p>
              <div className="flex items-center gap-2">
                <span className={cn('h-2.5 w-2.5 rounded-full flex-shrink-0', levelDot(summary.automationEffectiveness.level))} />
                <span className="font-semibold text-sm">{summary.automationEffectiveness.label}</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">{summary.automationEffectiveness.score}/100</p>
            </CardContent>
          </Card>
        </div>

        {/* ── MAIN GRID ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* Trend Analysis Panel */}
          <Card data-testid="analytics-trend-panel">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-blue-500" />
                Trend Analysis
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {trends.map((trend, idx) => (
                <div
                  key={idx}
                  data-testid={`analytics-trend-item-${trend.metric.toLowerCase().replace(/\s+/g, '-')}`}
                  className="flex items-start gap-3 p-3 rounded-md border bg-card"
                >
                  <TrendIcon direction={trend.direction} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium">{trend.metric}</p>
                      <Badge
                        variant="outline"
                        className={cn(
                          'text-xs',
                          trend.direction === 'up' ? 'text-emerald-700 border-emerald-200 bg-emerald-50' :
                          trend.direction === 'down' ? 'text-red-700 border-red-200 bg-red-50' :
                          'text-amber-700 border-amber-200 bg-amber-50'
                        )}
                      >
                        {trend.direction === 'up' ? '↑' : trend.direction === 'down' ? '↓' : '→'} {trend.direction}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">{trend.description}</p>
                    <p className="text-xs text-muted-foreground">{trend.period}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-sm font-bold">{trend.value}</p>
                    <p className={cn(
                      'text-xs',
                      trend.changePercent > 0 ? 'text-emerald-600' : trend.changePercent < 0 ? 'text-red-600' : 'text-muted-foreground'
                    )}>
                      {trend.changePercent > 0 ? '+' : ''}{trend.changePercent}%
                    </p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Risk Intelligence Panel */}
          <Card data-testid="analytics-risk-panel">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-red-500" />
                Risk Intelligence
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 max-h-96 overflow-y-auto">
              {criticalRisks.length === 0 && (
                <p className="text-sm text-muted-foreground py-4 text-center">No risks detected.</p>
              )}
              {criticalRisks.map((risk) => (
                <div
                  key={risk.id}
                  data-testid={`analytics-risk-item-${risk.id}`}
                  className={cn('p-3 rounded-md border', riskColor(risk.severity))}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <CategoryIcon category={risk.category} />
                      <p className="text-sm font-medium">{risk.title}</p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <Badge variant="outline" className={cn('text-xs', riskColor(risk.severity))}>
                        {risk.severity.toUpperCase()}
                      </Badge>
                      <Button
                        data-testid={`analytics-risk-link-${risk.id}`}
                        variant="ghost"
                        size="sm"
                        className="h-6 text-xs gap-1 px-2"
                        onClick={() => handleRiskOpen(risk.id, risk.sourceRoute)}
                      >
                        <ExternalLink className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                  <p className="text-xs mt-1 opacity-80">{risk.description}</p>
                  <p className="text-xs mt-1 opacity-70 italic">{risk.recommendation}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* ── FORECAST PANEL ── */}
        <Card data-testid="analytics-forecast-panel" onClick={handleForecastView}>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-purple-500" />
                Forecast Intelligence
              </CardTitle>
              <Badge variant="outline" className="text-purple-700 border-purple-200 bg-purple-50 text-xs">
                Projections — Advisory Only
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {forecasts.map((forecast, idx) => (
                <div
                  key={idx}
                  data-testid={`analytics-forecast-item-${forecast.metric.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}`}
                  className="p-4 rounded-md border bg-card"
                >
                  <p className="text-xs text-muted-foreground mb-2">{forecast.metric}</p>
                  <div className="flex items-center gap-2">
                    {forecast.projectedChange >= 0
                      ? <ArrowUpRight className="h-4 w-4 text-emerald-600" />
                      : <ArrowDownRight className="h-4 w-4 text-red-600" />}
                    <span className={cn('text-lg font-bold', forecast.projectedChange >= 0 ? 'text-emerald-700' : 'text-red-700')}>
                      {forecast.projectedChangePercent > 0 ? '+' : ''}{forecast.projectedChangePercent}%
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">Current: {forecast.currentValue}</p>
                  <p className="text-xs font-medium mt-0.5">Projected: {forecast.projectedValue}</p>
                  <div className="flex items-center gap-1 mt-2">
                    <Badge
                      variant="outline"
                      className={cn(
                        'text-[10px]',
                        forecast.confidence === 'high' ? 'text-emerald-700 border-emerald-200' :
                        forecast.confidence === 'medium' ? 'text-amber-700 border-amber-200' :
                        'text-red-700 border-red-200'
                      )}
                    >
                      {forecast.confidence} confidence
                    </Badge>
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-2 italic">{forecast.note}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* ── BOTTLENECK ANALYSIS ── */}
        <Card data-testid="analytics-bottleneck-panel">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <RefreshCw className="h-4 w-4 text-orange-500" />
              Bottleneck Analysis
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {bottlenecks.length === 0 && (
              <p className="text-sm text-muted-foreground py-4 text-center">No bottlenecks detected.</p>
            )}
            {bottlenecks.map((bn) => (
              <div
                key={bn.id}
                data-testid={`analytics-bottleneck-item-${bn.id}`}
                className={cn('flex items-start gap-3 p-3 rounded-md border', riskColor(bn.severity))}
              >
                <CategoryIcon category={bn.category} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium">{bn.title}</p>
                    <Badge variant="outline" className={cn('text-xs', riskColor(bn.severity))}>
                      {bn.severity}
                    </Badge>
                  </div>
                  <p className="text-xs mt-0.5 opacity-80">{bn.impact}</p>
                </div>
                <Button
                  data-testid={`analytics-bottleneck-link-${bn.id}`}
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs gap-1 flex-shrink-0"
                  onClick={() => handleDeepLink(bn.sourceRoute)}
                >
                  <ExternalLink className="h-3 w-3" />
                  View
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>

      </div>
  );
}

// ─────────────────────────────────────────────────────────────────────
// LEGACY PAGE WRAPPER
// Unrouted once the UX-5 /analytics-centre redirect lands; retained for
// the physical-deletion cleanup pass (spec §4 Out of Scope).
// ─────────────────────────────────────────────────────────────────────

export default function AnalyticsCentrePage() {
  return (
    <Layout>
      <AnalyticsCentreContent />
    </Layout>
  );
}
