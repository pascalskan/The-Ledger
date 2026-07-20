/**
 * ANALYTICS ENGINE — Phase 6.6
 *
 * Business Intelligence & Analytics Layer.
 *
 * Doctrine:
 *   Analytics are advisory only.
 *   NEVER creates financial mutations.
 *   NEVER approves records.
 *   NEVER changes or creates records.
 *   NEVER triggers financial mutations.
 *   All analytics views generate immutable audit records.
 *
 * Data sources: existing platform engines only — no duplicate datasets.
 */

import {
  getAllNotifications,
  computeNotificationSummary,
} from './notificationEngine';

import {
  getRecentEvents,
  computeActivitySummary,
} from './activityFeedEngine';

import {
  computeEventBusSummary,
} from './eventBusEngine';

import {
  getAllWorkflows,
  computeWorkflowSummary,
} from './workflowEngine';

import {
  getAllGovernanceRecords,
  computeGovernanceSummary,
} from './automationGovernanceEngine';

import {
  computeScheduleSummaryKPIs,
  getAllSchedules,
  getScheduleExecutions,
} from './automationSchedulerEngine';

import {
  SEED_EXCEPTIONS as EXCEPTION_RECORDS,
  computeExceptionSummary,
} from './exceptionResolutionEngine';

import {
  SEED_RECONCILIATION_RECORDS,
  computeReconciliationSummary,
} from './reconciliationEngine';

import {
  SEED_FINANCIAL_CONTROLS,
  computeControlSummary,
} from './financialControlsEngine';

// ─────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────

export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';
export type TrendDirection = 'up' | 'down' | 'stable';

export interface AnalyticsScore {
  score: number;        // 0–100
  label: string;
  level: 'healthy' | 'warning' | 'critical';
  description: string;
}

export interface TrendIndicator {
  metric: string;
  direction: TrendDirection;
  value: number;
  change: number;       // absolute delta
  changePercent: number;
  period: string;
  description: string;
}

export interface ForecastProjection {
  metric: string;
  currentValue: number;
  projectedValue: number;
  projectedChange: number;
  projectedChangePercent: number;
  confidence: 'low' | 'medium' | 'high';
  period: string;
  note: string;
  isProjection: true;
}

export interface RiskItem {
  id: string;
  title: string;
  description: string;
  category: 'operational' | 'financial' | 'governance' | 'workflow';
  severity: RiskLevel;
  sourceRoute: string;
  recommendation: string;
}

export interface BottleneckItem {
  id: string;
  title: string;
  category: 'workflow' | 'review' | 'exception' | 'automation';
  severity: RiskLevel;
  impact: string;
  sourceRoute: string;
}

export interface AnalyticsSummary {
  operationalHealth: AnalyticsScore;
  financialHealth: AnalyticsScore;
  governanceRisk: AnalyticsScore;
  workflowEfficiency: AnalyticsScore;
  automationEffectiveness: AnalyticsScore;
  criticalRisksCount: number;
  totalTrends: number;
  forecastsAvailable: number;
  bottlenecksDetected: number;
}

export interface AnalyticsAuditEntry {
  id: string;
  action: 'analytics_viewed' | 'forecast_viewed' | 'risk_investigation_opened';
  performedBy: string;
  performedAt: string;
  details: string;
}

// ─────────────────────────────────────────────────────────────────────
// INTERNAL AUDIT STORE
// ─────────────────────────────────────────────────────────────────────

let _analyticsAuditLog: AnalyticsAuditEntry[] = [];
let _auditCounter = 1;

function _writeAudit(
  action: AnalyticsAuditEntry['action'],
  performedBy: string,
  details: string,
): void {
  _analyticsAuditLog.push({
    id: `analytics-audit-${String(_auditCounter).padStart(4, '0')}`,
    action,
    performedBy,
    performedAt: new Date().toISOString(),
    details,
  });
  _auditCounter++;
}

// ─────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────

function _scoreToLevel(score: number): 'healthy' | 'warning' | 'critical' {
  if (score >= 80) return 'healthy';
  if (score >= 50) return 'warning';
  return 'critical';
}

function _clamp(n: number, min = 0, max = 100): number {
  return Math.max(min, Math.min(max, n));
}

// ─────────────────────────────────────────────────────────────────────
// PUBLIC API — HEALTH SCORES
// ─────────────────────────────────────────────────────────────────────

/**
 * Operational Health Score
 * Factors: workflow failures, event volume anomalies, notification volume, exception volume.
 */
export function getOperationalHealth(): AnalyticsScore {
  const notifSummary = computeNotificationSummary();
  const activitySummary = computeActivitySummary();
  const workflowSummary = computeWorkflowSummary(getAllWorkflows());
  const exceptionSummary = computeExceptionSummary(EXCEPTION_RECORDS);

  let score = 100;
  score -= notifSummary.actionRequired * 5;
  score -= activitySummary.critical * 8;
  score -= workflowSummary.requiresAction * 6;
  score -= exceptionSummary.open * 4;
  score -= (workflowSummary.total > 0 ? (workflowSummary.paused / workflowSummary.total) * 20 : 0);
  score = _clamp(Math.round(score));

  const level = _scoreToLevel(score);
  return {
    score,
    level,
    label: level === 'healthy' ? 'Operational' : level === 'warning' ? 'Needs Attention' : 'Critical',
    description: `${workflowSummary.active} active workflows, ${activitySummary.total} events tracked, ${exceptionSummary.open} open exceptions.`,
  };
}

/**
 * Financial Health Score
 * Factors: failed syncs, reconciliation issues, financial control exceptions.
 */
export function getFinancialHealth(): AnalyticsScore {
  const reconSummary = computeReconciliationSummary(SEED_RECONCILIATION_RECORDS);
  const controlSummary = computeControlSummary(SEED_FINANCIAL_CONTROLS);
  const exceptionSummary = computeExceptionSummary(EXCEPTION_RECORDS);
  const failedSyncs = getAllNotifications().filter(
    (n) => n.type === 'sync_failure' && n.actionRequired,
  ).length;

  let score = 100;
  score -= reconSummary.unmatched * 10;
  score -= reconSummary.requiresReview * 8;
  score -= controlSummary.pending * 12;
  score -= exceptionSummary.open * 8;
  score -= failedSyncs * 6;
  score = _clamp(Math.round(score));

  const level = _scoreToLevel(score);
  return {
    score,
    level,
    label: level === 'healthy' ? 'Healthy' : level === 'warning' ? 'Under Review' : 'Action Required',
    description: `${failedSyncs} failed syncs, ${reconSummary.unmatched} unmatched records, ${controlSummary.pending} pending controls.`,
  };
}

/**
 * Governance Risk Score (inverted — higher is worse, mapped to 0–100 health).
 * Factors: restricted automations, suspended automations, financially sensitive workflows, pending governance reviews.
 */
export function getGovernanceRisk(): AnalyticsScore {
  const govSummary = computeGovernanceSummary(getAllGovernanceRecords());
  const workflowSummary = computeWorkflowSummary(getAllWorkflows());

  let score = 100;
  score -= govSummary.requiresReview * 10;
  score -= govSummary.restricted * 15;
  score -= govSummary.suspended * 20;
  score -= govSummary.criticalRisk * 10;
  score -= workflowSummary.requiresGovernanceReview * 5;
  score = _clamp(Math.round(score));

  const level = _scoreToLevel(score);
  const riskLabel = level === 'healthy' ? 'Compliant' : level === 'warning' ? 'Review Required' : 'Governance Risk';
  return {
    score,
    level,
    label: riskLabel,
    description: `${govSummary.requiresReview} rules requiring review, ${govSummary.restricted} restricted, ${govSummary.suspended} suspended.`,
  };
}

/**
 * Workflow Efficiency Score
 * Factors: completed vs failed vs blocked workflows.
 */
export function getWorkflowEfficiency(): AnalyticsScore {
  const workflowSummary = computeWorkflowSummary(getAllWorkflows());
  const workflows = getAllWorkflows();

  const active = workflowSummary.active;
  const total = workflowSummary.total;
  const requiresAction = workflowSummary.requiresAction;
  const paused = workflowSummary.paused;

  // Efficiency: active / total ratio penalised by action-required and paused
  let score = total > 0 ? Math.round((active / total) * 100) : 80;
  score -= requiresAction * 10;
  score -= paused * 5;
  score = _clamp(score);

  const level = _scoreToLevel(score);
  return {
    score,
    level,
    label: level === 'healthy' ? 'Efficient' : level === 'warning' ? 'Degraded' : 'Blocked',
    description: `${active}/${total} workflows active. ${requiresAction} require action, ${paused} paused.`,
  };
}

/**
 * Automation Effectiveness Score
 * Factors: active automations, scheduled automations, automation failures.
 */
export function getAutomationEffectiveness(): AnalyticsScore {
  const schedules = getAllSchedules();
  const executions = getScheduleExecutions();
  const schedulerSummary = computeScheduleSummaryKPIs(schedules, executions);
  const notifSummary = computeNotificationSummary();

  const active = schedulerSummary.active;
  const total = schedulerSummary.total;
  // 'automation_failure' is not a NotificationType — the canonical key is
  // 'automation_alert'. The wrong key always resolved to 0, so Automation
  // Effectiveness never reflected any failures.
  const automationFailures = notifSummary.byType?.['automation_alert'] ?? 0;

  let score = total > 0 ? Math.round((active / total) * 100) : 80;
  score -= automationFailures * 8;
  score -= schedulerSummary.paused * 5;
  score = _clamp(score);

  const level = _scoreToLevel(score);
  return {
    score,
    level,
    label: level === 'healthy' ? 'Effective' : level === 'warning' ? 'Reduced Capacity' : 'Failing',
    description: `${active}/${total} schedules active. ${schedulerSummary.paused} paused, ${automationFailures} failure notifications.`,
  };
}

// ─────────────────────────────────────────────────────────────────────
// PUBLIC API — ANALYTICS SUMMARY
// ─────────────────────────────────────────────────────────────────────

export function getAnalyticsSummary(): AnalyticsSummary {
  const operationalHealth = getOperationalHealth();
  const financialHealth = getFinancialHealth();
  const governanceRisk = getGovernanceRisk();
  const workflowEfficiency = getWorkflowEfficiency();
  const automationEffectiveness = getAutomationEffectiveness();

  const criticalRisks = getCriticalRisks();
  const trends = getTrendAnalysis();
  const forecasts = getForecasts();
  const bottlenecks = getBottleneckAnalysis();

  return {
    operationalHealth,
    financialHealth,
    governanceRisk,
    workflowEfficiency,
    automationEffectiveness,
    criticalRisksCount: criticalRisks.filter((r) => r.severity === 'critical' || r.severity === 'high').length,
    totalTrends: trends.length,
    forecastsAvailable: forecasts.length,
    bottlenecksDetected: bottlenecks.filter((b) => b.severity === 'high' || b.severity === 'critical').length,
  };
}

// ─────────────────────────────────────────────────────────────────────
// PUBLIC API — CRITICAL RISKS
// ─────────────────────────────────────────────────────────────────────

export function getCriticalRisks(): RiskItem[] {
  const risks: RiskItem[] = [];

  // Governance risks
  const govSummary = computeGovernanceSummary(getAllGovernanceRecords());
  if (govSummary.suspended > 0) {
    risks.push({
      id: 'risk-gov-suspended',
      title: 'Suspended Automations Detected',
      description: `${govSummary.suspended} automation(s) are currently suspended due to governance action.`,
      category: 'governance',
      severity: 'critical',
      sourceRoute: '/automation-governance',
      recommendation: 'Review suspended rules in Automation Governance Centre and take corrective action.',
    });
  }
  if (govSummary.restricted > 0) {
    risks.push({
      id: 'risk-gov-restricted',
      title: 'Restricted Automations Active',
      description: `${govSummary.restricted} automation(s) have restricted operation scope.`,
      category: 'governance',
      severity: 'high',
      sourceRoute: '/automation-governance',
      recommendation: 'Review restriction rationale in Automation Governance Centre.',
    });
  }
  if (govSummary.requiresReview > 0) {
    risks.push({
      id: 'risk-gov-review',
      title: 'Governance Review Backlog',
      description: `${govSummary.requiresReview} automation(s) require governance review.`,
      category: 'governance',
      severity: 'medium',
      sourceRoute: '/automation-governance',
      recommendation: 'Prioritise governance review to maintain compliance posture.',
    });
  }

  // Financial risks
  const reconSummary = computeReconciliationSummary(SEED_RECONCILIATION_RECORDS);
  if (reconSummary.unmatched > 0) {
    risks.push({
      id: 'risk-fin-unmatched',
      title: 'Unmatched Reconciliation Records',
      description: `${reconSummary.unmatched} record(s) are unmatched between The Ledger and accounting systems.`,
      category: 'financial',
      severity: 'critical',
      sourceRoute: '/finance?tab=accounting&sub=reconciliation',
      recommendation: 'Investigate unmatched records in Reconciliation Centre immediately.',
    });
  }
  const controlSummary = computeControlSummary(SEED_FINANCIAL_CONTROLS);
  if (controlSummary.pending > 0) {
    risks.push({
      id: 'risk-fin-controls',
      title: 'Pending Financial Controls',
      description: `${controlSummary.pending} financial control override(s) awaiting CEO approval.`,
      category: 'financial',
      severity: 'high',
      sourceRoute: '/finance?tab=accounting&sub=exceptions',
      recommendation: 'Review and action pending financial controls.',
    });
  }
  const failedSyncs = getAllNotifications().filter(
    (n) => n.type === 'sync_failure' && n.actionRequired,
  ).length;
  if (failedSyncs > 0) {
    risks.push({
      id: 'risk-fin-sync',
      title: 'Failed Accounting Synchronisations',
      description: `${failedSyncs} sync failure(s) require attention before next accounting period.`,
      category: 'financial',
      severity: 'high',
      sourceRoute: '/finance?tab=records',
      recommendation: 'Retry failed syncs from the Financial Explorer accounting sync panel.',
    });
  }

  // Operational risks
  const exceptionSummary = computeExceptionSummary(EXCEPTION_RECORDS);
  if (exceptionSummary.open > 0) {
    risks.push({
      id: 'risk-op-exceptions',
      title: 'Open Financial Exceptions',
      description: `${exceptionSummary.open} exception(s) are open and unassigned.`,
      category: 'operational',
      severity: exceptionSummary.open >= 3 ? 'high' : 'medium',
      sourceRoute: '/finance?tab=accounting&sub=exceptions',
      recommendation: 'Assign and begin investigation on open exceptions.',
    });
  }
  const workflowSummary = computeWorkflowSummary(getAllWorkflows());
  if (workflowSummary.requiresAction > 0) {
    risks.push({
      id: 'risk-op-workflow-action',
      title: 'Workflows Requiring Action',
      description: `${workflowSummary.requiresAction} workflow(s) are blocked and require intervention.`,
      category: 'workflow',
      severity: 'high',
      sourceRoute: '/workflows',
      recommendation: 'Review blocked workflows in Workflow Centre.',
    });
  }
  const notifSummary = computeNotificationSummary();
  if (notifSummary.critical > 0) {
    risks.push({
      id: 'risk-op-critical-notif',
      title: 'Critical Notifications Unread',
      description: `${notifSummary.critical} critical notification(s) have not been addressed.`,
      category: 'operational',
      severity: 'critical',
      sourceRoute: '/notifications',
      recommendation: 'Review and action critical notifications immediately.',
    });
  }

  return risks.sort((a, b) => {
    const order: Record<RiskLevel, number> = { critical: 0, high: 1, medium: 2, low: 3 };
    return order[a.severity] - order[b.severity];
  });
}

// ─────────────────────────────────────────────────────────────────────
// PUBLIC API — TREND ANALYSIS
// ─────────────────────────────────────────────────────────────────────

export function getTrendAnalysis(): TrendIndicator[] {
  const busSummary = computeEventBusSummary();
  const workflowSummary = computeWorkflowSummary(getAllWorkflows());
  const exceptionSummary = computeExceptionSummary(EXCEPTION_RECORDS);
  const govSummary = computeGovernanceSummary(getAllGovernanceRecords());
  const notifSummary = computeNotificationSummary();
  const activitySummary = computeActivitySummary();

  // Calculate trend directions from current state vs baseline heuristics
  // These are realistic projections from existing operational data
  const eventCount = busSummary.total;
  const eventCritical = busSummary.critical;
  const workflowActive = workflowSummary.active;
  const workflowTotal = workflowSummary.total;
  const exceptionsOpen = exceptionSummary.open;
  const govRequiresReview = govSummary.requiresReview + govSummary.restricted + govSummary.suspended;

  return [
    {
      metric: 'Event Volume',
      direction: eventCount > 15 ? 'up' : eventCount > 8 ? 'stable' : 'down',
      value: eventCount,
      change: eventCount > 15 ? 5 : eventCount > 8 ? 0 : -3,
      changePercent: eventCount > 15 ? 33 : eventCount > 8 ? 0 : -20,
      period: 'Last 7 days',
      description: `${eventCount} total platform events. ${eventCritical} critical events detected.`,
    },
    {
      metric: 'Workflow Activity',
      direction: workflowActive >= Math.round(workflowTotal * 0.75) ? 'stable' : workflowActive < Math.round(workflowTotal * 0.5) ? 'down' : 'up',
      value: workflowActive,
      change: workflowSummary.requiresAction > 0 ? -workflowSummary.requiresAction : 1,
      changePercent: workflowSummary.requiresAction > 0 ? -Math.round((workflowSummary.requiresAction / Math.max(workflowTotal, 1)) * 100) : 14,
      period: 'Last 7 days',
      description: `${workflowActive} of ${workflowTotal} workflows active. ${workflowSummary.paused} paused.`,
    },
    {
      metric: 'Exception Rate',
      direction: exceptionsOpen > 3 ? 'up' : exceptionsOpen > 0 ? 'stable' : 'down',
      value: exceptionsOpen,
      change: exceptionsOpen > 3 ? 2 : 0,
      changePercent: exceptionsOpen > 3 ? 25 : 0,
      period: 'Last 7 days',
      description: `${exceptionsOpen} open exceptions. ${exceptionSummary.underInvestigation} under investigation.`,
    },
    {
      metric: 'Governance Compliance',
      direction: govRequiresReview > 3 ? 'down' : govRequiresReview > 0 ? 'stable' : 'up',
      value: 100 - (govRequiresReview * 15),
      change: govRequiresReview > 0 ? -(govRequiresReview * 5) : 5,
      changePercent: govRequiresReview > 0 ? -(govRequiresReview * 5) : 5,
      period: 'Last 7 days',
      description: `${govSummary.compliant} compliant, ${govSummary.requiresReview} requiring review, ${govSummary.suspended} suspended.`,
    },
    {
      metric: 'Notification Load',
      direction: notifSummary.actionRequired > 3 ? 'up' : notifSummary.actionRequired > 0 ? 'stable' : 'down',
      value: notifSummary.total,
      change: notifSummary.unread > 5 ? 3 : -1,
      changePercent: notifSummary.unread > 5 ? 25 : -8,
      period: 'Last 7 days',
      description: `${notifSummary.total} total notifications. ${notifSummary.unread} unread, ${notifSummary.actionRequired} requiring action.`,
    },
    {
      metric: 'Activity Feed Volume',
      direction: activitySummary.total > 20 ? 'up' : activitySummary.total > 10 ? 'stable' : 'down',
      value: activitySummary.total,
      change: activitySummary.total > 20 ? 4 : 0,
      changePercent: activitySummary.total > 20 ? 19 : 0,
      period: 'Last 7 days',
      description: `${activitySummary.total} activity events. ${activitySummary.critical} critical priority.`,
    },
  ];
}

// ─────────────────────────────────────────────────────────────────────
// PUBLIC API — FORECASTING
// ─────────────────────────────────────────────────────────────────────

export function getForecasts(): ForecastProjection[] {
  const workflowSummary = computeWorkflowSummary(getAllWorkflows());
  const schedulerSummary = computeScheduleSummaryKPIs(getAllSchedules(), getScheduleExecutions());
  const exceptionSummary = computeExceptionSummary(EXCEPTION_RECORDS);
  const busSummary = computeEventBusSummary();
  const reconSummary = computeReconciliationSummary(SEED_RECONCILIATION_RECORDS);

  // Revenue forecast is advisory only — derived from reconciliation health and workflow state
  const reconHealthFactor = reconSummary.matched > 0 ? reconSummary.matched / (reconSummary.matched + reconSummary.unmatched + 1) : 0.8;
  const baseRevenue = 285000;
  const projectedRevenue = Math.round(baseRevenue * (0.9 + reconHealthFactor * 0.15));

  // Margin forecast — penalised by open exceptions and pending controls
  const controlSummary = computeControlSummary(SEED_FINANCIAL_CONTROLS);
  const baseMarginalRate = 0.32;
  const projectedMargin = Math.max(0.18, baseMarginalRate - (exceptionSummary.open * 0.01) - (controlSummary.pending * 0.015));

  // Workload forecast based on active workflows and schedules
  const baseWorkload = workflowSummary.active + schedulerSummary.active;
  const projectedWorkload = Math.round(baseWorkload * 1.12);

  // Automation utilisation forecast
  const currentUtil = schedulerSummary.total > 0 ? Math.round((schedulerSummary.active / schedulerSummary.total) * 100) : 70;
  const projectedUtil = Math.min(95, currentUtil + (schedulerSummary.paused > 0 ? 8 : 3));

  return [
    {
      metric: 'Revenue Forecast (30 days)',
      currentValue: baseRevenue,
      projectedValue: projectedRevenue,
      projectedChange: projectedRevenue - baseRevenue,
      projectedChangePercent: Math.round(((projectedRevenue - baseRevenue) / baseRevenue) * 100),
      confidence: reconHealthFactor > 0.85 ? 'high' : reconHealthFactor > 0.6 ? 'medium' : 'low',
      period: '30 days',
      note: 'Advisory projection based on reconciliation health and workflow throughput. Not an approved financial record.',
      isProjection: true,
    },
    {
      metric: 'Margin Forecast (30 days)',
      currentValue: Math.round(baseMarginalRate * 100),
      projectedValue: Math.round(projectedMargin * 100),
      projectedChange: Math.round((projectedMargin - baseMarginalRate) * 100),
      projectedChangePercent: Math.round(((projectedMargin - baseMarginalRate) / baseMarginalRate) * 100),
      confidence: exceptionSummary.open === 0 ? 'high' : exceptionSummary.open < 3 ? 'medium' : 'low',
      period: '30 days',
      note: 'Margin estimate adjusted for open exceptions and pending financial controls. Advisory only.',
      isProjection: true,
    },
    {
      metric: 'Workload Forecast (30 days)',
      currentValue: baseWorkload,
      projectedValue: projectedWorkload,
      projectedChange: projectedWorkload - baseWorkload,
      projectedChangePercent: Math.round(((projectedWorkload - baseWorkload) / Math.max(baseWorkload, 1)) * 100),
      confidence: 'medium',
      period: '30 days',
      note: 'Projected workflow and automation workload based on current growth trajectory.',
      isProjection: true,
    },
    {
      metric: 'Automation Utilisation Forecast',
      currentValue: currentUtil,
      projectedValue: projectedUtil,
      projectedChange: projectedUtil - currentUtil,
      projectedChangePercent: Math.round(((projectedUtil - currentUtil) / Math.max(currentUtil, 1)) * 100),
      confidence: schedulerSummary.paused === 0 ? 'high' : 'medium',
      period: '30 days',
      note: 'Estimated automation utilisation if paused schedules are resumed.',
      isProjection: true,
    },
  ];
}

// ─────────────────────────────────────────────────────────────────────
// PUBLIC API — BOTTLENECK ANALYSIS
// ─────────────────────────────────────────────────────────────────────

export function getBottleneckAnalysis(): BottleneckItem[] {
  const bottlenecks: BottleneckItem[] = [];
  const workflowSummary = computeWorkflowSummary(getAllWorkflows());
  const exceptionSummary = computeExceptionSummary(EXCEPTION_RECORDS);
  const notifSummary = computeNotificationSummary();
  const govSummary = computeGovernanceSummary(getAllGovernanceRecords());
  const schedulerSummary = computeScheduleSummaryKPIs(getAllSchedules(), getScheduleExecutions());

  // Workflow bottleneck
  if (workflowSummary.requiresAction > 0) {
    bottlenecks.push({
      id: 'bn-workflow-blocked',
      title: 'Blocked Workflow Steps',
      category: 'workflow',
      severity: workflowSummary.requiresAction >= 3 ? 'high' : 'medium',
      impact: `${workflowSummary.requiresAction} workflow(s) stalled — downstream automation may be affected.`,
      sourceRoute: '/workflows',
    });
  }
  if (workflowSummary.paused > 0) {
    bottlenecks.push({
      id: 'bn-workflow-paused',
      title: 'Paused Workflows Accumulating',
      category: 'workflow',
      severity: workflowSummary.paused >= 2 ? 'medium' : 'low',
      impact: `${workflowSummary.paused} workflow(s) paused — operational throughput reduced.`,
      sourceRoute: '/workflows',
    });
  }

  // Review bottleneck (pending notifications requiring CEO action)
  if (notifSummary.actionRequired > 2) {
    bottlenecks.push({
      id: 'bn-review-queue',
      title: 'Review Queue Backlog',
      category: 'review',
      severity: notifSummary.actionRequired >= 5 ? 'high' : 'medium',
      impact: `${notifSummary.actionRequired} notifications awaiting action — potential approval delays.`,
      sourceRoute: '/notifications',
    });
  }

  // Exception bottleneck
  if (exceptionSummary.open > 0) {
    bottlenecks.push({
      id: 'bn-exception-queue',
      title: 'Exception Queue Unprocessed',
      category: 'exception',
      severity: exceptionSummary.open >= 3 ? 'high' : 'medium',
      impact: `${exceptionSummary.open} exception(s) unassigned — financial resolution delayed.`,
      sourceRoute: '/finance?tab=accounting&sub=exceptions',
    });
  }

  // Automation bottleneck
  if (schedulerSummary.paused > 0 || govSummary.suspended > 0) {
    bottlenecks.push({
      id: 'bn-automation-halted',
      title: 'Automation Capacity Reduced',
      category: 'automation',
      severity: govSummary.suspended > 0 ? 'critical' : 'medium',
      impact: `${schedulerSummary.paused} schedule(s) paused, ${govSummary.suspended} automation(s) suspended — reduced operational throughput.`,
      sourceRoute: '/automations',
    });
  }

  return bottlenecks.sort((a, b) => {
    const order: Record<RiskLevel, number> = { critical: 0, high: 1, medium: 2, low: 3 };
    return order[a.severity] - order[b.severity];
  });
}

// ─────────────────────────────────────────────────────────────────────
// PUBLIC API — AUDIT
// ─────────────────────────────────────────────────────────────────────

export function recordAnalyticsViewed(performedBy: string): void {
  _writeAudit('analytics_viewed', performedBy, 'Analytics Centre viewed.');
}

export function recordForecastViewed(performedBy: string): void {
  _writeAudit('forecast_viewed', performedBy, 'Forecast panel viewed.');
}

export function recordRiskInvestigationOpened(riskId: string, performedBy: string): void {
  _writeAudit('risk_investigation_opened', performedBy, `Risk investigation opened: ${riskId}`);
}

export function getAnalyticsAuditLog(): AnalyticsAuditEntry[] {
  return [..._analyticsAuditLog];
}

// Reset for testing
export function _resetAnalyticsState(): void {
  _analyticsAuditLog = [];
  _auditCounter = 1;
}

// ─────────────────────────────────────────────────────────────────────
// FINANCE HUB AUDIT
// Follows the same pattern as ExecutiveCommandEngine audit functions.
// Required by spec §3.5 — Finance Hub access events.
// ─────────────────────────────────────────────────────────────────────

export interface FinanceHubAuditEntry {
  id: string;
  action:
    | 'finance_hub_viewed'
    | 'finance_overview_viewed'
    | 'finance_hub_accounting_tab_viewed'
    | 'finance_hub_exceptions_viewed'
    | 'finance_hub_deep_link_opened';
  performedBy: string;
  performedAt: string;
  details: string;
  destination?: string; // for finance_hub_deep_link_opened
}

let _financeHubAuditLog: FinanceHubAuditEntry[] = [];
let _financeHubAuditCounter = 1;

function _writeFinanceAudit(
  action: FinanceHubAuditEntry['action'],
  performedBy: string,
  details: string,
  destination?: string,
): void {
  _financeHubAuditLog.push({
    id: `finance-audit-${String(_financeHubAuditCounter).padStart(4, '0')}`,
    action,
    performedBy,
    performedAt: new Date().toISOString(),
    details,
    ...(destination !== undefined ? { destination } : {}),
  });
  _financeHubAuditCounter++;
}

export function recordFinanceHubViewed(performedBy: string): void {
  _writeFinanceAudit('finance_hub_viewed', performedBy, 'Finance Hub viewed.');
}

export function recordFinanceHubOverviewViewed(performedBy: string): void {
  _writeFinanceAudit('finance_overview_viewed', performedBy, 'Finance Hub Overview tab viewed.');
}

export function recordFinanceHubAccountingTabViewed(performedBy: string): void {
  _writeFinanceAudit(
    'finance_hub_accounting_tab_viewed',
    performedBy,
    'Finance Hub Accounting tab viewed.',
  );
}

export function recordFinanceHubExceptionsViewed(performedBy: string): void {
  _writeFinanceAudit(
    'finance_hub_exceptions_viewed',
    performedBy,
    'Finance Hub Exceptions sub-tab viewed.',
  );
}

export function recordFinanceHubDeepLinkOpened(destination: string, performedBy: string): void {
  _writeFinanceAudit(
    'finance_hub_deep_link_opened',
    performedBy,
    `Finance Hub deep link opened to: ${destination}`,
    destination,
  );
}

export function getFinanceHubAuditLog(): FinanceHubAuditEntry[] {
  return [..._financeHubAuditLog];
}

// Reset for testing
export function _resetFinanceHubAuditState(): void {
  _financeHubAuditLog = [];
  _financeHubAuditCounter = 1;
}

// ─────────────────────────────────────────────────────────────────────
// INTELLIGENCE HUB AUDIT
// analyticsEngine.ts is the platform's designated "hub audit host":
// hub-level view/deep-link audit recorders for consolidated hubs
// (Finance Hub — UX-4, Intelligence Hub — UX-5) live here, following
// the recordFinanceHub* precedent above. (UX-5 spec §2.4 / §7.2)
// ─────────────────────────────────────────────────────────────────────

export interface IntelligenceHubAuditEntry {
  id: string;
  action:
    | 'intelligence_hub_viewed'
    | 'intelligence_hub_tab_viewed'
    | 'intelligence_hub_deep_link_opened';
  performedBy: string;
  performedAt: string;
  details: string;
  tab?: string; // for intelligence_hub_tab_viewed
  destination?: string; // for intelligence_hub_deep_link_opened
}

let _intelligenceHubAuditLog: IntelligenceHubAuditEntry[] = [];
let _intelligenceHubAuditCounter = 1;

function _writeIntelligenceAudit(
  action: IntelligenceHubAuditEntry['action'],
  performedBy: string,
  details: string,
  extra?: { tab?: string; destination?: string },
): void {
  _intelligenceHubAuditLog.push({
    id: `intelligence-audit-${String(_intelligenceHubAuditCounter).padStart(4, '0')}`,
    action,
    performedBy,
    performedAt: new Date().toISOString(),
    details,
    ...(extra?.tab !== undefined ? { tab: extra.tab } : {}),
    ...(extra?.destination !== undefined ? { destination: extra.destination } : {}),
  });
  _intelligenceHubAuditCounter++;
}

export function recordIntelligenceHubViewed(performedBy: string): void {
  _writeIntelligenceAudit('intelligence_hub_viewed', performedBy, 'Intelligence Hub viewed.');
}

export function recordIntelligenceHubTabViewed(tab: string, performedBy: string): void {
  _writeIntelligenceAudit(
    'intelligence_hub_tab_viewed',
    performedBy,
    `Intelligence Hub tab viewed: ${tab}`,
    { tab },
  );
}

export function recordIntelligenceHubDeepLinkOpened(destination: string, performedBy: string): void {
  _writeIntelligenceAudit(
    'intelligence_hub_deep_link_opened',
    performedBy,
    `Intelligence Hub deep link opened to: ${destination}`,
    { destination },
  );
}

export function getIntelligenceHubAuditLog(): IntelligenceHubAuditEntry[] {
  return [..._intelligenceHubAuditLog];
}

// Reset for testing
export function _resetIntelligenceHubAuditState(): void {
  _intelligenceHubAuditLog = [];
  _intelligenceHubAuditCounter = 1;
}
