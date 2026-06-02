/**
 * EXECUTIVE COMMAND ENGINE — Phase 6.5
 *
 * Aggregates cross-module data for the Executive Command Centre.
 *
 * Doctrine:
 *   Read-only visibility layer.
 *   NEVER creates financial mutations.
 *   NEVER approves records.
 *   NEVER bypasses Review Centre.
 *   All executive views generate immutable audit records.
 */

import {
  getAllNotifications,
  computeNotificationSummary,
} from './notificationEngine';

import {
  getRecentEvents,
  computeActivitySummary,
  type ActivityEvent,
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
  getExceptionRecords as getReconExceptions,
} from './reconciliationEngine';

import {
  SEED_FINANCIAL_CONTROLS,
  computeControlSummary,
} from './financialControlsEngine';

// ─────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────

export type HealthLevel = 'healthy' | 'warning' | 'critical';

export interface HealthScore {
  level: HealthLevel;
  score: number; // 0–100
  label: string;
}

export interface ExecutiveSummary {
  totalActiveAlerts: number;
  criticalAlerts: number;
  openExceptions: number;
  pendingReviews: number;
  activeWorkflows: number;
  governanceRisks: number;
  failedSyncs: number;
  reconciliationIssues: number;
  pendingFinancialControls: number;
}

export interface ExecutiveHealthSnapshot {
  operational: HealthScore;
  financial: HealthScore;
  governance: HealthScore;
  workflow: HealthScore;
}

export interface CriticalAlertItem {
  id: string;
  title: string;
  description: string;
  source: string;
  sourceRoute: string;
  priority: 'high' | 'critical';
  category: 'notification' | 'workflow' | 'governance' | 'reconciliation' | 'exception' | 'financial_control';
  createdAt: string;
}

export interface OperationalOverview {
  activeWorkflows: number;
  activeAutomations: number;
  scheduledAutomations: number;
  eventVolume: number;
  activityVolume: number;
}

export interface GovernanceOverview {
  requiresReview: number;
  restricted: number;
  suspended: number;
  financiallySensitiveWorkflows: number;
}

export interface FinancialOverview {
  failedSyncs: number;
  openReconciliationIssues: number;
  pendingFinancialControls: number;
  openExceptions: number;
}

export interface ExecutiveAuditEntry {
  id: string;
  action: 'executive_centre_viewed' | 'executive_alert_opened' | 'executive_deep_link_opened';
  performedBy: string;
  performedAt: string;
  details: string;
}

// ─────────────────────────────────────────────────────────────────────
// INTERNAL AUDIT STORE
// ─────────────────────────────────────────────────────────────────────

let _executiveAuditLog: ExecutiveAuditEntry[] = [];
let _auditCounter = 1;

function _writeAudit(
  action: ExecutiveAuditEntry['action'],
  performedBy: string,
  details: string,
): void {
  _executiveAuditLog.push({
    id: `exec-audit-${String(_auditCounter).padStart(4, '0')}`,
    action,
    performedBy,
    performedAt: new Date().toISOString(),
    details,
  });
  _auditCounter++;
}

// ─────────────────────────────────────────────────────────────────────
// HEALTH SCORING HELPER
// ─────────────────────────────────────────────────────────────────────

function _scoreHealth(score: number): HealthLevel {
  if (score >= 80) return 'healthy';
  if (score >= 50) return 'warning';
  return 'critical';
}

// ─────────────────────────────────────────────────────────────────────
// PUBLIC API — SUMMARY
// ─────────────────────────────────────────────────────────────────────

export function getExecutiveSummary(): ExecutiveSummary {
  const notifSummary = computeNotificationSummary();
  const workflowSummary = computeWorkflowSummary(getAllWorkflows());
  const govSummary = computeGovernanceSummary(getAllGovernanceRecords());
  const exceptionSummary = computeExceptionSummary(EXCEPTION_RECORDS);
  const reconSummary = computeReconciliationSummary(SEED_RECONCILIATION_RECORDS);
  const controlSummary = computeControlSummary(SEED_FINANCIAL_CONTROLS);

  const failedSyncs = getAllNotifications().filter(
    (n) => n.type === 'sync_failure' && n.actionRequired,
  ).length;

  const reconciliationIssues =
    reconSummary.unmatched +
    reconSummary.requiresReview +
    reconSummary.missingInAccounting +
    reconSummary.missingInLedger;

  return {
    totalActiveAlerts: notifSummary.unread + notifSummary.actionRequired,
    criticalAlerts: notifSummary.critical,
    openExceptions: exceptionSummary.open + exceptionSummary.underInvestigation,
    pendingReviews: notifSummary.byType['review_required'],
    activeWorkflows: workflowSummary.active,
    governanceRisks: govSummary.requiresReview + govSummary.restricted + govSummary.suspended,
    failedSyncs,
    reconciliationIssues,
    pendingFinancialControls: controlSummary.pending,
  };
}

// ─────────────────────────────────────────────────────────────────────
// PUBLIC API — HEALTH
// ─────────────────────────────────────────────────────────────────────

export function getOperationalHealth(): HealthScore {
  const notifSummary = computeNotificationSummary();
  const activitySummary = computeActivitySummary();
  const workflowSummary = computeWorkflowSummary(getAllWorkflows());

  let score = 100;
  score -= notifSummary.actionRequired * 5;
  score -= activitySummary.critical * 8;
  score -= workflowSummary.requiresAction * 6;
  score = Math.max(0, Math.min(100, score));

  const level = _scoreHealth(score);
  return {
    level,
    score,
    label: level === 'healthy' ? 'Operational' : level === 'warning' ? 'Needs Attention' : 'Critical',
  };
}

export function getFinancialHealth(): HealthScore {
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
  score = Math.max(0, Math.min(100, score));

  const level = _scoreHealth(score);
  return {
    level,
    score,
    label: level === 'healthy' ? 'Healthy' : level === 'warning' ? 'Under Review' : 'Action Required',
  };
}

export function getGovernanceHealth(): HealthScore {
  const govSummary = computeGovernanceSummary(getAllGovernanceRecords());

  let score = 100;
  score -= govSummary.requiresReview * 10;
  score -= govSummary.restricted * 15;
  score -= govSummary.suspended * 20;
  score -= govSummary.criticalRisk * 10;
  score = Math.max(0, Math.min(100, score));

  const level = _scoreHealth(score);
  return {
    level,
    score,
    label: level === 'healthy' ? 'Compliant' : level === 'warning' ? 'Review Required' : 'Governance Risk',
  };
}

export function getWorkflowHealth(): HealthScore {
  const workflowSummary = computeWorkflowSummary(getAllWorkflows());

  let score = 100;
  score -= workflowSummary.requiresAction * 10;
  score -= workflowSummary.requiresGovernanceReview * 8;
  score = Math.max(0, Math.min(100, score));

  const level = _scoreHealth(score);
  return {
    level,
    score,
    label: level === 'healthy' ? 'On Track' : level === 'warning' ? 'Review Needed' : 'Blocked',
  };
}

export function getExecutiveHealthSnapshot(): ExecutiveHealthSnapshot {
  return {
    operational: getOperationalHealth(),
    financial: getFinancialHealth(),
    governance: getGovernanceHealth(),
    workflow: getWorkflowHealth(),
  };
}

// ─────────────────────────────────────────────────────────────────────
// PUBLIC API — CRITICAL ITEMS
// ─────────────────────────────────────────────────────────────────────

export function getCriticalItems(): CriticalAlertItem[] {
  const items: CriticalAlertItem[] = [];

  // Critical / high notifications
  const notifications = getAllNotifications().filter(
    (n) => (n.priority === 'critical' || n.priority === 'high') && n.status !== 'dismissed',
  );
  for (const n of notifications) {
    items.push({
      id: n.id,
      title: n.title,
      description: n.message,
      source: 'Notification Centre',
      sourceRoute: '/notifications',
      priority: n.priority === 'critical' ? 'critical' : 'high',
      category: 'notification',
      createdAt: n.createdAt,
    });
  }

  // Action-required active workflows
  const workflows = getAllWorkflows().filter((w) => w.actionRequired && w.status === 'active');
  for (const w of workflows) {
    items.push({
      id: w.id,
      title: `Workflow Action Required: ${w.name}`,
      description: `Workflow requires attention — governance status: ${w.governanceStatus}`,
      source: 'Workflow Centre',
      sourceRoute: '/workflows',
      priority: 'high',
      category: 'workflow',
      createdAt: w.updatedAt,
    });
  }

  // Governance risks
  const govRecords = getAllGovernanceRecords().filter(
    (g) =>
      g.governanceStatus === 'Requires Review' ||
      g.governanceStatus === 'Restricted' ||
      g.governanceStatus === 'Suspended',
  );
  for (const g of govRecords) {
    items.push({
      id: `gov-${g.ruleId}`,
      title: `Governance Risk: ${g.ruleName}`,
      description: `Status: ${g.governanceStatus} — Risk: ${g.riskLevel}`,
      source: 'Automation Governance',
      sourceRoute: '/automation-governance',
      priority:
        g.riskLevel === 'Critical' || g.governanceStatus === 'Suspended' ? 'critical' : 'high',
      category: 'governance',
      createdAt: g.updatedAt,
    });
  }

  // Reconciliation exceptions
  const reconIssues = getReconExceptions(SEED_RECONCILIATION_RECORDS);
  for (const r of reconIssues) {
    items.push({
      id: `recon-${r.id}`,
      title: `Reconciliation Issue: ${r.entityName}`,
      description: r.mismatchDetails ?? `Status: ${r.status}`,
      source: 'Reconciliation Centre',
      sourceRoute: '/reconciliation-center',
      priority: r.status === 'unmatched' ? 'critical' : 'high',
      category: 'reconciliation',
      createdAt: r.lastCheckedAt,
    });
  }

  // Open exceptions
  const openExceptions = EXCEPTION_RECORDS.filter(
    (e) =>
      e.status === 'open' ||
      e.status === 'under_investigation' ||
      e.status === 'awaiting_approval',
  );
  for (const e of openExceptions) {
    items.push({
      id: `exc-${e.id}`,
      title: `Exception: ${e.exceptionNumber}`,
      description: e.description,
      source: 'Exception Resolution',
      sourceRoute: '/exception-resolution-center',
      priority: e.status === 'awaiting_approval' ? 'critical' : 'high',
      category: 'exception',
      createdAt: e.createdAt,
    });
  }

  // Pending financial controls
  const pendingControls = SEED_FINANCIAL_CONTROLS.filter((c) => c.state === 'pending_approval');
  for (const c of pendingControls) {
    items.push({
      id: `ctl-${c.id}`,
      title: `Financial Control Pending: ${c.controlNumber}`,
      description: c.description,
      source: 'Financial Controls',
      sourceRoute: '/exception-resolution-center',
      priority: 'critical',
      category: 'financial_control',
      createdAt: c.requestedAt,
    });
  }

  // Sort: critical first, then by date desc
  return items.sort((a, b) => {
    if (a.priority === 'critical' && b.priority !== 'critical') return -1;
    if (a.priority !== 'critical' && b.priority === 'critical') return 1;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });
}

// ─────────────────────────────────────────────────────────────────────
// PUBLIC API — OPERATIONAL OVERVIEW
// ─────────────────────────────────────────────────────────────────────

export function getOperationalOverview(): OperationalOverview {
  const workflowSummary = computeWorkflowSummary(getAllWorkflows());
  const schedules = getAllSchedules();
  const executions = getScheduleExecutions();
  const schedulerSummary = computeScheduleSummaryKPIs(schedules, executions);
  const busSummary = computeEventBusSummary();
  const activitySummary = computeActivitySummary();

  return {
    activeWorkflows: workflowSummary.active,
    activeAutomations: schedulerSummary.active,
    scheduledAutomations: schedulerSummary.total,
    eventVolume: busSummary.total,
    activityVolume: activitySummary.total,
  };
}

// ─────────────────────────────────────────────────────────────────────
// PUBLIC API — GOVERNANCE OVERVIEW
// ─────────────────────────────────────────────────────────────────────

export function getGovernanceOverview(): GovernanceOverview {
  const govSummary = computeGovernanceSummary(getAllGovernanceRecords());
  const workflowSummary = computeWorkflowSummary(getAllWorkflows());

  return {
    requiresReview: govSummary.requiresReview,
    restricted: govSummary.restricted,
    suspended: govSummary.suspended,
    financiallySensitiveWorkflows: workflowSummary.financiallySensitive,
  };
}

// ─────────────────────────────────────────────────────────────────────
// PUBLIC API — FINANCIAL OVERVIEW
// ─────────────────────────────────────────────────────────────────────

export function getFinancialOverview(): FinancialOverview {
  const reconSummary = computeReconciliationSummary(SEED_RECONCILIATION_RECORDS);
  const exceptionSummary = computeExceptionSummary(EXCEPTION_RECORDS);
  const controlSummary = computeControlSummary(SEED_FINANCIAL_CONTROLS);
  const failedSyncs = getAllNotifications().filter(
    (n) => n.type === 'sync_failure' && n.actionRequired,
  ).length;

  return {
    failedSyncs,
    openReconciliationIssues:
      reconSummary.unmatched +
      reconSummary.requiresReview +
      reconSummary.missingInAccounting +
      reconSummary.missingInLedger,
    pendingFinancialControls: controlSummary.pending,
    openExceptions: exceptionSummary.open + exceptionSummary.underInvestigation,
  };
}

// ─────────────────────────────────────────────────────────────────────
// PUBLIC API — ACTIVITY STREAM
// ─────────────────────────────────────────────────────────────────────

export function getExecutiveActivityStream(limit = 15): ActivityEvent[] {
  return getRecentEvents(limit);
}

// ─────────────────────────────────────────────────────────────────────
// PUBLIC API — AUDIT
// ─────────────────────────────────────────────────────────────────────

export function recordExecutiveCentreViewed(performedBy: string): void {
  _writeAudit('executive_centre_viewed', performedBy, 'Executive Command Centre viewed.');
}

export function recordExecutiveAlertOpened(alertId: string, performedBy: string): void {
  _writeAudit('executive_alert_opened', performedBy, `Executive alert opened: ${alertId}`);
}

export function recordExecutiveDeepLinkOpened(destination: string, performedBy: string): void {
  _writeAudit(
    'executive_deep_link_opened',
    performedBy,
    `Deep link opened to: ${destination}`,
  );
}

export function getExecutiveAuditLog(): ExecutiveAuditEntry[] {
  return [..._executiveAuditLog];
}

// Reset for testing
export function _resetExecutiveCommandState(): void {
  _executiveAuditLog = [];
  _auditCounter = 1;
}
