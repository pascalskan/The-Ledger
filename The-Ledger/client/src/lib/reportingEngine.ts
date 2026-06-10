/**
 * REPORTING ENGINE — Phase 6.7
 *
 * Executive Reporting & Export Centre
 *
 * Aggregates intelligence from:
 * - analyticsEngine
 * - executiveCommandEngine
 * - workflowEngine
 * - automationGovernanceEngine
 * - financialControlsEngine (via SEED constants)
 * - reconciliationEngine (via SEED constants)
 *
 * Doctrine:
 * - Reports are READ-ONLY snapshots
 * - Reports NEVER approve, modify, or create financial mutations
 * - All report generation, view, and archive actions are audited
 * - CEO only
 */

import {
  getAnalyticsSummary,
  getCriticalRisks,
  getTrendAnalysis,
  getForecasts,
  getBottleneckAnalysis,
} from './analyticsEngine';
import {
  getExecutiveSummary,
  getExecutiveHealthSnapshot,
  getOperationalOverview,
  getGovernanceOverview,
  getFinancialOverview,
} from './executiveCommandEngine';
import {
  getAllWorkflows,
  computeWorkflowSummary,
} from './workflowEngine';
import {
  getAllGovernanceRecords,
  computeGovernanceSummary,
} from './automationGovernanceEngine';
import {
  SEED_FINANCIAL_CONTROLS,
  computeControlSummary,
} from './financialControlsEngine';
import {
  SEED_RECONCILIATION_RECORDS,
  computeReconciliationSummary,
} from './reconciliationEngine';

// ─────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────

export type ReportType =
  | 'executive_summary'
  | 'board_report'
  | 'governance_report'
  | 'financial_health_report'
  | 'operations_report'
  | 'monthly_kpi_report';

export type ReportStatus = 'draft' | 'generated' | 'archived';

export type ReportPeriod =
  | 'this_week'
  | 'this_month'
  | 'last_month'
  | 'this_quarter'
  | 'last_quarter'
  | 'ytd';

export interface KPISnapshot {
  label: string;
  value: string | number;
  change?: string;
  status?: 'healthy' | 'warning' | 'critical';
}

export interface ReportSection {
  id: string;
  title: string;
  content: string;
  data?: Record<string, unknown>;
  deepLinkRoute?: string;
  deepLinkLabel?: string;
}

export interface ReportRecord {
  id: string;
  name: string;
  type: ReportType;
  status: ReportStatus;
  period: ReportPeriod;
  generatedAt: string;
  generatedBy: string;
  owner: string;
  sections: ReportSection[];
  kpiSnapshot: KPISnapshot[];
  riskSummary: string;
  forecastSummary: string;
  governanceSummary: string;
  executiveSummaryText: string;
  includedSections: string[];
}

export interface ReportingAuditEntry {
  id: string;
  action: 'report_generated' | 'report_viewed' | 'report_archived';
  reportId: string;
  reportName: string;
  performedBy: string;
  timestamp: string;
}

export interface ReportingSummary {
  total: number;
  generated: number;
  draft: number;
  archived: number;
  thisMonth: number;
}

// ─────────────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────────────

export const REPORT_TYPE_LABELS: Record<ReportType, string> = {
  executive_summary: 'Executive Summary',
  board_report: 'Board Report',
  governance_report: 'Governance Report',
  financial_health_report: 'Financial Health Report',
  operations_report: 'Operations Report',
  monthly_kpi_report: 'Monthly KPI Report',
};

export const REPORT_TYPE_COLORS: Record<ReportType, string> = {
  executive_summary: 'text-purple-700 bg-purple-50 border-purple-200',
  board_report: 'text-blue-700 bg-blue-50 border-blue-200',
  governance_report: 'text-amber-700 bg-amber-50 border-amber-200',
  financial_health_report: 'text-emerald-700 bg-emerald-50 border-emerald-200',
  operations_report: 'text-sky-700 bg-sky-50 border-sky-200',
  monthly_kpi_report: 'text-indigo-700 bg-indigo-50 border-indigo-200',
};

export const REPORT_STATUS_LABELS: Record<ReportStatus, string> = {
  draft: 'Draft',
  generated: 'Generated',
  archived: 'Archived',
};

export const REPORT_STATUS_COLORS: Record<ReportStatus, string> = {
  draft: 'text-amber-700 bg-amber-50 border-amber-200',
  generated: 'text-emerald-700 bg-emerald-50 border-emerald-200',
  archived: 'text-slate-600 bg-slate-50 border-slate-200',
};

export const REPORT_PERIOD_LABELS: Record<ReportPeriod, string> = {
  this_week: 'This Week',
  this_month: 'This Month',
  last_month: 'Last Month',
  this_quarter: 'This Quarter',
  last_quarter: 'Last Quarter',
  ytd: 'Year to Date',
};

export const AVAILABLE_SECTIONS: { id: string; label: string }[] = [
  { id: 'executive_summary', label: 'Executive Summary' },
  { id: 'kpi_snapshot', label: 'KPI Snapshot' },
  { id: 'risk_summary', label: 'Risk Summary' },
  { id: 'forecast_summary', label: 'Forecast Summary' },
  { id: 'governance_summary', label: 'Governance Summary' },
  { id: 'financial_overview', label: 'Financial Overview' },
  { id: 'operational_overview', label: 'Operational Overview' },
  { id: 'workflow_summary', label: 'Workflow Summary' },
];

// ─────────────────────────────────────────────────────────────────────
// STATE
// ─────────────────────────────────────────────────────────────────────

let _reports: ReportRecord[] = [];
let _auditLog: ReportingAuditEntry[] = [];
let _idCounter = 100;

// ─────────────────────────────────────────────────────────────────────
// INTERNAL HELPERS
// ─────────────────────────────────────────────────────────────────────

function _getGovSummary() {
  const raw = computeGovernanceSummary(getAllGovernanceRecords());
  // computeGovernanceSummary returns totalAutomations — normalise for local use
  return { ...raw, total: raw.totalAutomations };
}

function _getControlsSummary() {
  return computeControlSummary(SEED_FINANCIAL_CONTROLS);
}

function _getReconSummary() {
  const recon = computeReconciliationSummary(SEED_RECONCILIATION_RECORDS);
  return {
    totalItems: recon.total,
    matchedItems: recon.matched,
    unmatchedItems: recon.unmatched,
    requiresReviewItems: recon.requiresReview,
    matchRate: recon.matchRate,
  };
}

// ─────────────────────────────────────────────────────────────────────
// SEED — Realistic pre-generated reports
// ─────────────────────────────────────────────────────────────────────

function buildSeedReports(): ReportRecord[] {
  const analytics = getAnalyticsSummary();
  const execSummary = getExecutiveSummary();
  const execHealth = getExecutiveHealthSnapshot();
  const opOverview = getOperationalOverview();
  const finOverview = getFinancialOverview();
  const workflowSummary = computeWorkflowSummary(getAllWorkflows());
  const govSummary = _getGovSummary();
  const controlsSummary = _getControlsSummary();
  const reconSummary = _getReconSummary();
  const risks = getCriticalRisks().slice(0, 4);
  const forecasts = getForecasts().slice(0, 3);

  return [
    // ── rpt-001: Executive Summary
    {
      id: 'rpt-001',
      name: 'Executive Summary — June 2026',
      type: 'executive_summary',
      status: 'generated',
      period: 'this_month',
      generatedAt: '2026-06-01T09:00:00.000Z',
      generatedBy: 'Demo CEO',
      owner: 'Demo CEO',
      includedSections: ['executive_summary', 'kpi_snapshot', 'risk_summary', 'forecast_summary'],
      executiveSummaryText: `Platform is operating with ${execHealth.operational.label} operational health (${execHealth.operational.score}/100). ${execSummary.criticalAlerts} critical alerts require attention. Financial health is rated ${execHealth.financial.label}. ${execSummary.openExceptions} open exceptions and ${execSummary.reconciliationIssues} reconciliation issues are currently tracked.`,
      kpiSnapshot: [
        { label: 'Operational Health', value: `${execHealth.operational.score}/100`, status: execHealth.operational.level },
        { label: 'Financial Health', value: `${execHealth.financial.score}/100`, status: execHealth.financial.level },
        { label: 'Critical Alerts', value: execSummary.criticalAlerts, status: execSummary.criticalAlerts > 0 ? 'warning' : 'healthy' },
        { label: 'Open Exceptions', value: execSummary.openExceptions },
        { label: 'Active Workflows', value: opOverview.activeWorkflows },
        { label: 'Pending Reviews', value: execSummary.pendingReviews },
      ],
      riskSummary: risks.length > 0
        ? `${risks.length} risks identified. Top risk: ${risks[0]?.title ?? 'None'} (${risks[0]?.severity ?? 'N/A'}). ${risks.filter(r => r.severity === 'critical').length} critical, ${risks.filter(r => r.severity === 'high').length} high severity.`
        : 'No critical risks detected.',
      forecastSummary: forecasts.length > 0
        ? `${forecasts.length} forecasts generated. ${forecasts[0]?.metric ?? ''}: ${forecasts[0]?.projectedChangePercent ?? 0}% projected change (${forecasts[0]?.confidence ?? 'N/A'} confidence). Advisory only — not approved financial records.`
        : 'No forecasts available.',
      governanceSummary: `${govSummary.requiresReview} automations require review. ${govSummary.restricted} restricted. ${govSummary.suspended} suspended. Overall compliance: ${govSummary.compliant} compliant of ${govSummary.total} total automations.`,
      sections: [
        { id: 'exec_overview', title: 'Executive Overview', content: `Operational health: ${execHealth.operational.label}. Financial health: ${execHealth.financial.label}. ${execSummary.criticalAlerts} critical alerts, ${execSummary.pendingReviews} pending reviews.`, deepLinkRoute: '/executive-command-centre', deepLinkLabel: 'Open Command Centre' },
        { id: 'risk_section', title: 'Risk Summary', content: `${risks.length} risks identified across governance, financial, and operational categories.`, deepLinkRoute: '/analytics-centre', deepLinkLabel: 'View Analytics' },
      ],
    },
    // ── rpt-002: Board Report Q2
    {
      id: 'rpt-002',
      name: 'Board Report — Q2 2026',
      type: 'board_report',
      status: 'generated',
      period: 'this_quarter',
      generatedAt: '2026-06-01T10:00:00.000Z',
      generatedBy: 'Demo CEO',
      owner: 'Demo CEO',
      includedSections: ['executive_summary', 'kpi_snapshot', 'risk_summary', 'forecast_summary', 'governance_summary', 'financial_overview'],
      executiveSummaryText: `Quarterly board report covering Q2 2026. Platform financial health: ${execHealth.financial.label} (${execHealth.financial.score}/100). Governance health: ${execHealth.governance.label}. ${govSummary.requiresReview} governance items require board-level attention. ${reconSummary.totalItems} reconciliation records processed with ${reconSummary.unmatchedItems} unmatched items.`,
      kpiSnapshot: [
        { label: 'Operational Health', value: `${execHealth.operational.score}/100`, status: execHealth.operational.level },
        { label: 'Financial Health', value: `${execHealth.financial.score}/100`, status: execHealth.financial.level },
        { label: 'Governance Health', value: `${execHealth.governance.score}/100`, status: execHealth.governance.level },
        { label: 'Recon Records', value: reconSummary.totalItems },
        { label: 'Unmatched Items', value: reconSummary.unmatchedItems, status: reconSummary.unmatchedItems > 0 ? 'warning' : 'healthy' },
        { label: 'Pending Controls', value: controlsSummary.pending },
        { label: 'Active Workflows', value: workflowSummary.active },
        { label: 'Governance Issues', value: govSummary.requiresReview },
      ],
      riskSummary: `Board-level risk: ${risks.filter(r => r.severity === 'critical').length} critical risks. Governance risk score: ${analytics.governanceRisk.score}/100. Financial risk driven by ${controlsSummary.pending} pending financial controls.`,
      forecastSummary: forecasts.map(f => `${f.metric}: ${f.projectedChangePercent > 0 ? '+' : ''}${f.projectedChangePercent}% (${f.confidence} confidence)`).join('. ') + ' — Advisory projections only.',
      governanceSummary: `Automation governance: ${govSummary.compliant} compliant, ${govSummary.requiresReview} requires review, ${govSummary.restricted} restricted, ${govSummary.suspended} suspended. Financial controls: ${controlsSummary.pending} pending CEO approval.`,
      sections: [
        { id: 'board_financial', title: 'Financial Overview', content: `Reconciliation: ${reconSummary.totalItems} records, ${reconSummary.matchedItems} matched, ${reconSummary.unmatchedItems} unmatched.`, deepLinkRoute: '/finance?tab=accounting&sub=reconciliation', deepLinkLabel: 'Finance — Reconciliation' },
        { id: 'board_governance', title: 'Governance Summary', content: `${govSummary.requiresReview} automations require governance review. Workflow health: ${execHealth.workflow.label}.`, deepLinkRoute: '/automation-governance', deepLinkLabel: 'Automation Governance' },
      ],
    },
    // ── rpt-003: Governance Report
    {
      id: 'rpt-003',
      name: 'Governance Report — June 2026',
      type: 'governance_report',
      status: 'generated',
      period: 'this_month',
      generatedAt: '2026-06-02T08:30:00.000Z',
      generatedBy: 'Demo CEO',
      owner: 'Demo CEO',
      includedSections: ['governance_summary', 'kpi_snapshot', 'risk_summary'],
      executiveSummaryText: `Governance report for June 2026. ${govSummary.total} automations under governance oversight. ${govSummary.requiresReview} require review, ${govSummary.restricted} restricted, ${govSummary.suspended} suspended. ${govSummary.compliant} automations are fully compliant. Workflow governance: ${workflowSummary.financiallySensitive} financially sensitive workflows.`,
      kpiSnapshot: [
        { label: 'Total Automations', value: govSummary.total },
        { label: 'Compliant', value: govSummary.compliant, status: 'healthy' },
        { label: 'Requires Review', value: govSummary.requiresReview, status: govSummary.requiresReview > 0 ? 'warning' : 'healthy' },
        { label: 'Restricted', value: govSummary.restricted, status: govSummary.restricted > 0 ? 'warning' : 'healthy' },
        { label: 'Suspended', value: govSummary.suspended, status: govSummary.suspended > 0 ? 'critical' : 'healthy' },
        { label: 'Sensitive Workflows', value: workflowSummary.financiallySensitive },
      ],
      riskSummary: `Governance risk score: ${analytics.governanceRisk.score}/100 (${analytics.governanceRisk.level}). ${govSummary.suspended} automations suspended — requires immediate CEO review.`,
      forecastSummary: 'Governance forecast: advisory only. Risk trajectory stable with current controls.',
      governanceSummary: `Full governance: ${govSummary.compliant} compliant, ${govSummary.requiresReview} requires review, ${govSummary.restricted} restricted, ${govSummary.suspended} suspended.`,
      sections: [
        { id: 'gov_automation', title: 'Automation Governance', content: `${govSummary.requiresReview} automations flagged for review. ${govSummary.suspended} suspended.`, deepLinkRoute: '/automation-governance', deepLinkLabel: 'Automation Governance' },
        { id: 'gov_workflow', title: 'Workflow Governance', content: `${workflowSummary.total} workflows. ${workflowSummary.financiallySensitive} financially sensitive.`, deepLinkRoute: '/workflows', deepLinkLabel: 'Workflow Centre' },
      ],
    },
    // ── rpt-004: Financial Health Report
    {
      id: 'rpt-004',
      name: 'Financial Health Report — June 2026',
      type: 'financial_health_report',
      status: 'generated',
      period: 'this_month',
      generatedAt: '2026-06-02T09:00:00.000Z',
      generatedBy: 'Demo CEO',
      owner: 'Demo CEO',
      includedSections: ['financial_overview', 'kpi_snapshot', 'risk_summary', 'forecast_summary'],
      executiveSummaryText: `Financial health for June 2026. Health score: ${execHealth.financial.score}/100 (${execHealth.financial.label}). ${controlsSummary.pending} financial controls pending CEO approval. Reconciliation: ${reconSummary.totalItems} total records, ${reconSummary.unmatchedItems} unmatched. ${finOverview.failedSyncs} failed accounting syncs require attention.`,
      kpiSnapshot: [
        { label: 'Financial Health', value: `${execHealth.financial.score}/100`, status: execHealth.financial.level },
        { label: 'Failed Syncs', value: finOverview.failedSyncs, status: finOverview.failedSyncs > 0 ? 'warning' : 'healthy' },
        { label: 'Recon Issues', value: finOverview.openReconciliationIssues, status: finOverview.openReconciliationIssues > 0 ? 'warning' : 'healthy' },
        { label: 'Pending Controls', value: finOverview.pendingFinancialControls, status: finOverview.pendingFinancialControls > 0 ? 'warning' : 'healthy' },
        { label: 'Open Exceptions', value: finOverview.openExceptions },
        { label: 'Matched Recon', value: reconSummary.matchedItems },
      ],
      riskSummary: `Financial risk: ${risks.filter(r => r.category === 'financial').length} financial category risks. ${controlsSummary.pending} controls pending. ${reconSummary.unmatchedItems} unmatched reconciliation items.`,
      forecastSummary: forecasts.length > 0
        ? `Financial forecast: ${forecasts[0]?.metric}: ${forecasts[0]?.projectedChangePercent}% projected (${forecasts[0]?.confidence} confidence). Advisory only.`
        : 'No financial forecasts available.',
      governanceSummary: `Financial controls: ${controlsSummary.pending} pending CEO approval. All overrides require explicit CEO approval per doctrine.`,
      sections: [
        { id: 'fin_controls', title: 'Financial Controls', content: `${controlsSummary.pending} controls pending. ${controlsSummary.approved} approved. ${controlsSummary.rejected} rejected.`, deepLinkRoute: '/finance?tab=records', deepLinkLabel: 'Finance — Records' },
        { id: 'fin_reconciliation', title: 'Reconciliation', content: `${reconSummary.totalItems} records. ${reconSummary.matchedItems} matched, ${reconSummary.unmatchedItems} unmatched, ${reconSummary.requiresReviewItems} requires review.`, deepLinkRoute: '/finance?tab=accounting&sub=reconciliation', deepLinkLabel: 'Finance — Reconciliation' },
      ],
    },
    // ── rpt-005: Operations Report
    {
      id: 'rpt-005',
      name: 'Operations Report — June 2026',
      type: 'operations_report',
      status: 'generated',
      period: 'this_month',
      generatedAt: '2026-06-02T10:00:00.000Z',
      generatedBy: 'Demo CEO',
      owner: 'Demo CEO',
      includedSections: ['operational_overview', 'kpi_snapshot', 'workflow_summary', 'risk_summary'],
      executiveSummaryText: `Operations report for June 2026. ${opOverview.activeWorkflows} active workflows, ${opOverview.activeAutomations} active automations, ${opOverview.scheduledAutomations} scheduled. Operational health: ${execHealth.operational.label} (${execHealth.operational.score}/100). Event volume: ${opOverview.eventVolume}. Activity volume: ${opOverview.activityVolume}.`,
      kpiSnapshot: [
        { label: 'Operational Health', value: `${execHealth.operational.score}/100`, status: execHealth.operational.level },
        { label: 'Active Workflows', value: opOverview.activeWorkflows },
        { label: 'Active Automations', value: opOverview.activeAutomations },
        { label: 'Scheduled Automations', value: opOverview.scheduledAutomations },
        { label: 'Event Volume', value: opOverview.eventVolume },
        { label: 'Activity Volume', value: opOverview.activityVolume },
        { label: 'Workflow Efficiency', value: `${analytics.workflowEfficiency.score}/100`, status: analytics.workflowEfficiency.level },
        { label: 'Automation Score', value: `${analytics.automationEffectiveness.score}/100`, status: analytics.automationEffectiveness.level },
      ],
      riskSummary: `Operational risks: ${risks.filter(r => r.category === 'workflow' || r.category === 'automation').length} workflow/automation risks. Bottlenecks: ${getBottleneckAnalysis().length} identified.`,
      forecastSummary: 'Operations forecast: workflow completion rate trending positive. Advisory only.',
      governanceSummary: `Workflow governance: ${workflowSummary.financiallySensitive} financially sensitive workflows under active oversight.`,
      sections: [
        { id: 'ops_workflows', title: 'Workflow Summary', content: `${workflowSummary.total} workflows. ${workflowSummary.active} active, ${workflowSummary.paused} paused, ${workflowSummary.requiresAction} require action.`, deepLinkRoute: '/workflows', deepLinkLabel: 'Workflow Centre' },
        { id: 'ops_automations', title: 'Automation Summary', content: `${opOverview.activeAutomations} active automations. ${opOverview.scheduledAutomations} scheduled executions.`, deepLinkRoute: '/automations', deepLinkLabel: 'Automations' },
      ],
    },
    // ── rpt-006: Monthly KPI
    {
      id: 'rpt-006',
      name: 'Monthly KPI Report — May 2026',
      type: 'monthly_kpi_report',
      status: 'generated',
      period: 'last_month',
      generatedAt: '2026-06-01T07:00:00.000Z',
      generatedBy: 'Demo CEO',
      owner: 'Demo CEO',
      includedSections: ['kpi_snapshot', 'executive_summary', 'risk_summary', 'forecast_summary', 'governance_summary'],
      executiveSummaryText: `Monthly KPI report for May 2026. Platform performance: Operational ${execHealth.operational.score}/100, Financial ${execHealth.financial.score}/100, Governance ${execHealth.governance.score}/100, Workflow ${execHealth.workflow.score}/100. ${execSummary.criticalAlerts} critical alerts, ${execSummary.openExceptions} open exceptions.`,
      kpiSnapshot: [
        { label: 'Operational Score', value: `${execHealth.operational.score}/100`, status: execHealth.operational.level },
        { label: 'Financial Score', value: `${execHealth.financial.score}/100`, status: execHealth.financial.level },
        { label: 'Governance Score', value: `${execHealth.governance.score}/100`, status: execHealth.governance.level },
        { label: 'Workflow Score', value: `${execHealth.workflow.score}/100`, status: execHealth.workflow.level },
        { label: 'Critical Alerts', value: execSummary.criticalAlerts },
        { label: 'Open Exceptions', value: execSummary.openExceptions },
        { label: 'Recon Issues', value: execSummary.reconciliationIssues },
        { label: 'Governance Issues', value: execSummary.governanceRisks },
      ],
      riskSummary: `${risks.length} risks tracked. ${risks.filter(r => r.severity === 'critical').length} critical, ${risks.filter(r => r.severity === 'high').length} high. Risk trend: ${getTrendAnalysis()[0]?.direction ?? 'stable'}.`,
      forecastSummary: `KPI forecast: ${forecasts.map(f => `${f.metric} ${f.projectedChangePercent > 0 ? '+' : ''}${f.projectedChangePercent}%`).join(', ')}. Advisory projections only.`,
      governanceSummary: `Governance KPIs: ${govSummary.compliant}/${govSummary.total} compliant. ${govSummary.requiresReview} under review.`,
      sections: [
        { id: 'kpi_health', title: 'Platform Health KPIs', content: 'All four health dimensions tracked: operational, financial, governance, workflow.', deepLinkRoute: '/analytics-centre', deepLinkLabel: 'Analytics Centre' },
      ],
    },
    // ── rpt-007: Archived
    {
      id: 'rpt-007',
      name: 'Board Report — Q1 2026',
      type: 'board_report',
      status: 'archived',
      period: 'last_quarter',
      generatedAt: '2026-04-01T09:00:00.000Z',
      generatedBy: 'Demo CEO',
      owner: 'Demo CEO',
      includedSections: ['executive_summary', 'kpi_snapshot', 'governance_summary', 'financial_overview'],
      executiveSummaryText: 'Q1 2026 board report — archived. Platform performed within expected operational parameters. Governance controls maintained throughout the quarter.',
      kpiSnapshot: [
        { label: 'Q1 Operational Health', value: '78/100', status: 'warning' },
        { label: 'Q1 Financial Health', value: '82/100', status: 'healthy' },
        { label: 'Q1 Governance', value: '71/100', status: 'warning' },
      ],
      riskSummary: 'Q1 risk summary — archived. 3 risks resolved during quarter.',
      forecastSummary: 'Q1 forecasts superseded by Q2 actuals.',
      governanceSummary: 'Q1 governance: 2 automations required review, 1 suspended. All resolved.',
      sections: [],
    },
    // ── rpt-008: Draft
    {
      id: 'rpt-008',
      name: 'Executive Summary — Draft — July 2026',
      type: 'executive_summary',
      status: 'draft',
      period: 'this_month',
      generatedAt: '2026-06-03T08:00:00.000Z',
      generatedBy: 'Demo CEO',
      owner: 'Demo CEO',
      includedSections: ['executive_summary', 'kpi_snapshot'],
      executiveSummaryText: 'Draft report — not yet generated. Pending data aggregation.',
      kpiSnapshot: [],
      riskSummary: 'Pending generation.',
      forecastSummary: 'Pending generation.',
      governanceSummary: 'Pending generation.',
      sections: [],
    },
  ];
}

// Initialise seed
function initIfNeeded() {
  if (_reports.length === 0) {
    _reports = buildSeedReports();
  }
}

// ─────────────────────────────────────────────────────────────────────
// AUDIT HELPERS
// ─────────────────────────────────────────────────────────────────────

function recordAudit(
  action: ReportingAuditEntry['action'],
  reportId: string,
  reportName: string,
  performedBy: string
): void {
  _auditLog.push({
    id: `rpt-audit-${Date.now()}-${++_idCounter}`,
    action,
    reportId,
    reportName,
    performedBy,
    timestamp: new Date().toISOString(),
  });
}

// ─────────────────────────────────────────────────────────────────────
// PUBLIC API — QUERY
// ─────────────────────────────────────────────────────────────────────

export function getAllReports(): ReportRecord[] {
  initIfNeeded();
  return [..._reports].sort((a, b) =>
    new Date(b.generatedAt).getTime() - new Date(a.generatedAt).getTime()
  );
}

export function getReportById(id: string): ReportRecord | undefined {
  initIfNeeded();
  return _reports.find((r) => r.id === id);
}

export function getReportsByStatus(status: ReportStatus): ReportRecord[] {
  initIfNeeded();
  return _reports.filter((r) => r.status === status);
}

export function getReportsByType(type: ReportType): ReportRecord[] {
  initIfNeeded();
  return _reports.filter((r) => r.type === type);
}

export function computeReportingSummary(): ReportingSummary {
  initIfNeeded();
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  return {
    total: _reports.length,
    generated: _reports.filter((r) => r.status === 'generated').length,
    draft: _reports.filter((r) => r.status === 'draft').length,
    archived: _reports.filter((r) => r.status === 'archived').length,
    thisMonth: _reports.filter((r) => new Date(r.generatedAt) >= monthStart).length,
  };
}

// ─────────────────────────────────────────────────────────────────────
// REPORT GENERATORS
// ─────────────────────────────────────────────────────────────────────

function buildReport(
  type: ReportType,
  period: ReportPeriod,
  includedSections: string[],
  generatedBy: string
): ReportRecord {
  const id = `rpt-${Date.now()}-${++_idCounter}`;
  const analytics = getAnalyticsSummary();
  const execHealth = getExecutiveHealthSnapshot();
  const execSummary = getExecutiveSummary();
  const opOverview = getOperationalOverview();
  const govOverview = getGovernanceOverview();
  const finOverview = getFinancialOverview();
  const workflowSummary = computeWorkflowSummary(getAllWorkflows());
  const govSummary = _getGovSummary();
  const risks = getCriticalRisks().slice(0, 5);
  const forecasts = getForecasts().slice(0, 3);

  const kpis: KPISnapshot[] = [
    { label: 'Operational Health', value: `${execHealth.operational.score}/100`, status: execHealth.operational.level },
    { label: 'Financial Health', value: `${execHealth.financial.score}/100`, status: execHealth.financial.level },
    { label: 'Governance Health', value: `${execHealth.governance.score}/100`, status: execHealth.governance.level },
    { label: 'Workflow Health', value: `${execHealth.workflow.score}/100`, status: execHealth.workflow.level },
    { label: 'Critical Alerts', value: execSummary.criticalAlerts },
    { label: 'Open Exceptions', value: execSummary.openExceptions },
    { label: 'Active Workflows', value: opOverview.activeWorkflows },
    { label: 'Governance Issues', value: govOverview.requiresReview },
  ];

  const execText = `${REPORT_TYPE_LABELS[type]} — ${REPORT_PERIOD_LABELS[period]}. Operational health: ${execHealth.operational.label} (${execHealth.operational.score}/100). Financial health: ${execHealth.financial.label}. ${execSummary.criticalAlerts} critical alerts. ${execSummary.openExceptions} open exceptions. ${workflowSummary.active} active workflows. ${govSummary.requiresReview} governance items require review.`;

  const riskText = risks.length > 0
    ? `${risks.length} risks: ${risks.filter(r => r.severity === 'critical').length} critical, ${risks.filter(r => r.severity === 'high').length} high. Primary: ${risks[0]?.title}.`
    : 'No risks identified.';

  const forecastText = forecasts.length > 0
    ? forecasts.map(f => `${f.metric}: ${f.projectedChangePercent > 0 ? '+' : ''}${f.projectedChangePercent}%`).join('; ') + '. Advisory only.'
    : 'No forecasts available.';

  const govText = `${govSummary.compliant} compliant, ${govSummary.requiresReview} requires review, ${govSummary.restricted} restricted, ${govSummary.suspended} suspended.`;

  const sections: ReportSection[] = [];
  if (includedSections.includes('executive_summary')) {
    sections.push({ id: 'exec', title: 'Executive Summary', content: execText, deepLinkRoute: '/executive-command-centre', deepLinkLabel: 'Command Centre' });
  }
  if (includedSections.includes('governance_summary')) {
    sections.push({ id: 'gov', title: 'Governance Summary', content: govText, deepLinkRoute: '/automation-governance', deepLinkLabel: 'Automation Governance' });
  }
  if (includedSections.includes('financial_overview')) {
    sections.push({ id: 'fin', title: 'Financial Overview', content: `Failed syncs: ${finOverview.failedSyncs}. Recon issues: ${finOverview.openReconciliationIssues}. Pending controls: ${finOverview.pendingFinancialControls}. Open exceptions: ${finOverview.openExceptions}.`, deepLinkRoute: '/finance?tab=records', deepLinkLabel: 'Finance — Records' });
  }
  if (includedSections.includes('workflow_summary')) {
    sections.push({ id: 'wf', title: 'Workflow Summary', content: `${workflowSummary.total} workflows: ${workflowSummary.active} active, ${workflowSummary.paused} paused, ${workflowSummary.requiresAction} require action, ${workflowSummary.financiallySensitive} financially sensitive.`, deepLinkRoute: '/workflows', deepLinkLabel: 'Workflow Centre' });
  }
  if (includedSections.includes('risk_summary')) {
    sections.push({ id: 'risk', title: 'Risk Summary', content: riskText, deepLinkRoute: '/analytics-centre', deepLinkLabel: 'Analytics Centre' });
  }

  return {
    id,
    name: `${REPORT_TYPE_LABELS[type]} — ${REPORT_PERIOD_LABELS[period]}`,
    type,
    status: 'generated',
    period,
    generatedAt: new Date().toISOString(),
    generatedBy,
    owner: generatedBy,
    includedSections,
    executiveSummaryText: execText,
    kpiSnapshot: kpis,
    riskSummary: riskText,
    forecastSummary: forecastText,
    governanceSummary: govText,
    sections,
  };
}

// ─────────────────────────────────────────────────────────────────────
// PUBLIC API — GENERATE
// ─────────────────────────────────────────────────────────────────────

export function generateExecutiveSummary(period: ReportPeriod, sections: string[], generatedBy: string): ReportRecord {
  initIfNeeded();
  const report = buildReport('executive_summary', period, sections, generatedBy);
  _reports.unshift(report);
  recordAudit('report_generated', report.id, report.name, generatedBy);
  return report;
}

export function generateBoardReport(period: ReportPeriod, sections: string[], generatedBy: string): ReportRecord {
  initIfNeeded();
  const report = buildReport('board_report', period, sections, generatedBy);
  _reports.unshift(report);
  recordAudit('report_generated', report.id, report.name, generatedBy);
  return report;
}

export function generateGovernanceReport(period: ReportPeriod, sections: string[], generatedBy: string): ReportRecord {
  initIfNeeded();
  const report = buildReport('governance_report', period, sections, generatedBy);
  _reports.unshift(report);
  recordAudit('report_generated', report.id, report.name, generatedBy);
  return report;
}

export function generateFinancialHealthReport(period: ReportPeriod, sections: string[], generatedBy: string): ReportRecord {
  initIfNeeded();
  const report = buildReport('financial_health_report', period, sections, generatedBy);
  _reports.unshift(report);
  recordAudit('report_generated', report.id, report.name, generatedBy);
  return report;
}

export function generateOperationsReport(period: ReportPeriod, sections: string[], generatedBy: string): ReportRecord {
  initIfNeeded();
  const report = buildReport('operations_report', period, sections, generatedBy);
  _reports.unshift(report);
  recordAudit('report_generated', report.id, report.name, generatedBy);
  return report;
}

export function generateMonthlyKPIReport(period: ReportPeriod, sections: string[], generatedBy: string): ReportRecord {
  initIfNeeded();
  const report = buildReport('monthly_kpi_report', period, sections, generatedBy);
  _reports.unshift(report);
  recordAudit('report_generated', report.id, report.name, generatedBy);
  return report;
}

// ─────────────────────────────────────────────────────────────────────
// PUBLIC API — ARCHIVE & AUDIT
// ─────────────────────────────────────────────────────────────────────

export function archiveReport(id: string, performedBy: string): boolean {
  initIfNeeded();
  const report = _reports.find((r) => r.id === id);
  if (!report || report.status === 'archived') return false;
  report.status = 'archived';
  recordAudit('report_archived', id, report.name, performedBy);
  return true;
}

export function recordReportViewed(reportId: string, reportName: string, performedBy: string): void {
  recordAudit('report_viewed', reportId, reportName, performedBy);
}

export function getReportingAuditLog(): ReportingAuditEntry[] {
  return [..._auditLog].sort((a, b) =>
    new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );
}

// For testing — resets in-memory state
export function _resetReportingState(): void {
  _reports = [];
  _auditLog = [];
  _idCounter = 100;
}
