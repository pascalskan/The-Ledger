/**
 * EXPORT ENGINE — Phase 6.8
 *
 * Report Export & Distribution Centre
 *
 * Manages the lifecycle of report exports and their distribution.
 * Exports are READ-ONLY derivatives of reports — they never modify source reports.
 *
 * Doctrine:
 * - Exports are informational artifacts only
 * - Exports NEVER approve, modify, or create financial mutations
 * - All export and distribution actions are audited
 * - CEO only
 */

import { getReportById } from './reportingEngine';

// ─────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────

export type ExportType =
  | 'pdf'
  | 'board_pack'
  | 'executive_summary'
  | 'governance'
  | 'financial';

export type ExportStatus = 'generated' | 'downloaded' | 'distributed' | 'archived';

export type DistributionMethod = 'email' | 'portal' | 'download';

export type DistributionStatus = 'pending' | 'delivered' | 'failed';

export interface ReportExport {
  id: string;
  reportId: string;
  reportName: string;
  exportType: ExportType;
  generatedAt: string;
  generatedBy: string;
  status: ExportStatus;
  fileName: string;
  fileSizeKb: number;
  auditReference: string;
  distributionCount: number;
}

export interface ReportDistribution {
  id: string;
  exportId: string;
  reportId: string;
  reportName: string;
  method: DistributionMethod;
  recipient: string;
  status: DistributionStatus;
  createdAt: string;
  deliveredAt?: string;
  failureReason?: string;
}

export interface ExportAuditEntry {
  id: string;
  action:
    | 'export_generated'
    | 'export_downloaded'
    | 'export_archived'
    | 'distribution_created'
    | 'distribution_delivered';
  exportId: string;
  fileName: string;
  performedBy: string;
  timestamp: string;
  notes?: string;
}

export interface ExportSummary {
  total: number;
  generated: number;
  downloaded: number;
  distributed: number;
  archived: number;
}

export interface DistributionSummary {
  total: number;
  delivered: number;
  pending: number;
  failed: number;
  deliveryRate: number;
}

// ─────────────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────────────

export const EXPORT_TYPE_LABELS: Record<ExportType, string> = {
  pdf: 'PDF Export',
  board_pack: 'Board Pack',
  executive_summary: 'Executive Summary',
  governance: 'Governance Report',
  financial: 'Financial Report',
};

export const EXPORT_TYPE_COLORS: Record<ExportType, string> = {
  pdf: 'text-slate-700 bg-slate-50 border-slate-200',
  board_pack: 'text-blue-700 bg-blue-50 border-blue-200',
  executive_summary: 'text-purple-700 bg-purple-50 border-purple-200',
  governance: 'text-amber-700 bg-amber-50 border-amber-200',
  financial: 'text-emerald-700 bg-emerald-50 border-emerald-200',
};

export const EXPORT_STATUS_LABELS: Record<ExportStatus, string> = {
  generated: 'Generated',
  downloaded: 'Downloaded',
  distributed: 'Distributed',
  archived: 'Archived',
};

export const EXPORT_STATUS_COLORS: Record<ExportStatus, string> = {
  generated: 'text-emerald-700 bg-emerald-50 border-emerald-200',
  downloaded: 'text-blue-700 bg-blue-50 border-blue-200',
  distributed: 'text-indigo-700 bg-indigo-50 border-indigo-200',
  archived: 'text-slate-600 bg-slate-50 border-slate-200',
};

export const DISTRIBUTION_METHOD_LABELS: Record<DistributionMethod, string> = {
  email: 'Email',
  portal: 'Portal',
  download: 'Download',
};

export const DISTRIBUTION_STATUS_LABELS: Record<DistributionStatus, string> = {
  pending: 'Pending',
  delivered: 'Delivered',
  failed: 'Failed',
};

export const DISTRIBUTION_STATUS_COLORS: Record<DistributionStatus, string> = {
  pending: 'text-amber-700 bg-amber-50 border-amber-200',
  delivered: 'text-emerald-700 bg-emerald-50 border-emerald-200',
  failed: 'text-red-700 bg-red-50 border-red-200',
};

// ─────────────────────────────────────────────────────────────────────
// STATE
// ─────────────────────────────────────────────────────────────────────

let _exports: ReportExport[] = [];
let _distributions: ReportDistribution[] = [];
let _exportAuditLog: ExportAuditEntry[] = [];
let _idCounter = 200;

// ─────────────────────────────────────────────────────────────────────
// SEED — Pre-generated exports and distributions
// ─────────────────────────────────────────────────────────────────────

function buildSeedExports(): ReportExport[] {
  return [
    {
      id: 'exp-001',
      reportId: 'rpt-001',
      reportName: 'Executive Summary — June 2026',
      exportType: 'executive_summary',
      generatedAt: '2026-06-01T09:30:00.000Z',
      generatedBy: 'Demo CEO',
      status: 'distributed',
      fileName: 'executive-summary-june-2026.pdf',
      fileSizeKb: 142,
      auditReference: 'AUD-EXP-001',
      distributionCount: 2,
    },
    {
      id: 'exp-002',
      reportId: 'rpt-002',
      reportName: 'Board Report — Q2 2026',
      exportType: 'board_pack',
      generatedAt: '2026-06-01T10:30:00.000Z',
      generatedBy: 'Demo CEO',
      status: 'distributed',
      fileName: 'board-pack-q2-2026.pdf',
      fileSizeKb: 387,
      auditReference: 'AUD-EXP-002',
      distributionCount: 3,
    },
    {
      id: 'exp-003',
      reportId: 'rpt-003',
      reportName: 'Governance Report — June 2026',
      exportType: 'governance',
      generatedAt: '2026-06-02T08:45:00.000Z',
      generatedBy: 'Demo CEO',
      status: 'downloaded',
      fileName: 'governance-report-june-2026.pdf',
      fileSizeKb: 98,
      auditReference: 'AUD-EXP-003',
      distributionCount: 0,
    },
    {
      id: 'exp-004',
      reportId: 'rpt-004',
      reportName: 'Financial Health Report — June 2026',
      exportType: 'financial',
      generatedAt: '2026-06-02T09:15:00.000Z',
      generatedBy: 'Demo CEO',
      status: 'generated',
      fileName: 'financial-health-june-2026.pdf',
      fileSizeKb: 215,
      auditReference: 'AUD-EXP-004',
      distributionCount: 0,
    },
    {
      id: 'exp-005',
      reportId: 'rpt-005',
      reportName: 'Operations Report — June 2026',
      exportType: 'pdf',
      generatedAt: '2026-06-02T10:30:00.000Z',
      generatedBy: 'Demo CEO',
      status: 'generated',
      fileName: 'operations-report-june-2026.pdf',
      fileSizeKb: 176,
      auditReference: 'AUD-EXP-005',
      distributionCount: 0,
    },
    {
      id: 'exp-006',
      reportId: 'rpt-006',
      reportName: 'Monthly KPI Report — May 2026',
      exportType: 'executive_summary',
      generatedAt: '2026-06-01T07:30:00.000Z',
      generatedBy: 'Demo CEO',
      status: 'archived',
      fileName: 'monthly-kpi-may-2026.pdf',
      fileSizeKb: 134,
      auditReference: 'AUD-EXP-006',
      distributionCount: 1,
    },
  ];
}

function buildSeedDistributions(): ReportDistribution[] {
  return [
    {
      id: 'dist-001',
      exportId: 'exp-001',
      reportId: 'rpt-001',
      reportName: 'Executive Summary — June 2026',
      method: 'email',
      recipient: 'board@theledger.internal',
      status: 'delivered',
      createdAt: '2026-06-01T09:45:00.000Z',
      deliveredAt: '2026-06-01T09:46:00.000Z',
    },
    {
      id: 'dist-002',
      exportId: 'exp-001',
      reportId: 'rpt-001',
      reportName: 'Executive Summary — June 2026',
      method: 'portal',
      recipient: 'cfo@theledger.internal',
      status: 'delivered',
      createdAt: '2026-06-01T09:50:00.000Z',
      deliveredAt: '2026-06-01T09:50:30.000Z',
    },
    {
      id: 'dist-003',
      exportId: 'exp-002',
      reportId: 'rpt-002',
      reportName: 'Board Report — Q2 2026',
      method: 'email',
      recipient: 'board@theledger.internal',
      status: 'delivered',
      createdAt: '2026-06-01T11:00:00.000Z',
      deliveredAt: '2026-06-01T11:01:00.000Z',
    },
    {
      id: 'dist-004',
      exportId: 'exp-002',
      reportId: 'rpt-002',
      reportName: 'Board Report — Q2 2026',
      method: 'portal',
      recipient: 'investors@theledger.internal',
      status: 'delivered',
      createdAt: '2026-06-01T11:05:00.000Z',
      deliveredAt: '2026-06-01T11:05:45.000Z',
    },
    {
      id: 'dist-005',
      exportId: 'exp-002',
      reportId: 'rpt-002',
      reportName: 'Board Report — Q2 2026',
      method: 'download',
      recipient: 'Demo CEO',
      status: 'pending',
      createdAt: '2026-06-01T11:10:00.000Z',
    },
    {
      id: 'dist-006',
      exportId: 'exp-006',
      reportId: 'rpt-006',
      reportName: 'Monthly KPI Report — May 2026',
      method: 'email',
      recipient: 'cfo@theledger.internal',
      status: 'delivered',
      createdAt: '2026-06-01T07:45:00.000Z',
      deliveredAt: '2026-06-01T07:46:00.000Z',
    },
  ];
}

function buildSeedAuditLog(): ExportAuditEntry[] {
  return [
    {
      id: 'exp-audit-001',
      action: 'export_generated',
      exportId: 'exp-001',
      fileName: 'executive-summary-june-2026.pdf',
      performedBy: 'Demo CEO',
      timestamp: '2026-06-01T09:30:00.000Z',
    },
    {
      id: 'exp-audit-002',
      action: 'distribution_created',
      exportId: 'exp-001',
      fileName: 'executive-summary-june-2026.pdf',
      performedBy: 'Demo CEO',
      timestamp: '2026-06-01T09:45:00.000Z',
      notes: 'Distributed to board@theledger.internal',
    },
    {
      id: 'exp-audit-003',
      action: 'distribution_delivered',
      exportId: 'exp-001',
      fileName: 'executive-summary-june-2026.pdf',
      performedBy: 'System',
      timestamp: '2026-06-01T09:46:00.000Z',
      notes: 'Delivered to board@theledger.internal',
    },
    {
      id: 'exp-audit-004',
      action: 'export_generated',
      exportId: 'exp-002',
      fileName: 'board-pack-q2-2026.pdf',
      performedBy: 'Demo CEO',
      timestamp: '2026-06-01T10:30:00.000Z',
    },
    {
      id: 'exp-audit-005',
      action: 'export_downloaded',
      exportId: 'exp-003',
      fileName: 'governance-report-june-2026.pdf',
      performedBy: 'Demo CEO',
      timestamp: '2026-06-02T09:00:00.000Z',
    },
    {
      id: 'exp-audit-006',
      action: 'export_archived',
      exportId: 'exp-006',
      fileName: 'monthly-kpi-may-2026.pdf',
      performedBy: 'Demo CEO',
      timestamp: '2026-06-02T10:00:00.000Z',
    },
  ];
}

function initIfNeeded() {
  if (_exports.length === 0) {
    _exports = buildSeedExports();
    _distributions = buildSeedDistributions();
    _exportAuditLog = buildSeedAuditLog();
  }
}

// ─────────────────────────────────────────────────────────────────────
// AUDIT HELPERS
// ─────────────────────────────────────────────────────────────────────

function recordExportAudit(
  action: ExportAuditEntry['action'],
  exportId: string,
  fileName: string,
  performedBy: string,
  notes?: string
): void {
  _exportAuditLog.push({
    id: `exp-audit-${Date.now()}-${++_idCounter}`,
    action,
    exportId,
    fileName,
    performedBy,
    timestamp: new Date().toISOString(),
    notes,
  });
}

// ─────────────────────────────────────────────────────────────────────
// PUBLIC API — QUERY
// ─────────────────────────────────────────────────────────────────────

export function getAllExports(): ReportExport[] {
  initIfNeeded();
  return [..._exports].sort((a, b) =>
    new Date(b.generatedAt).getTime() - new Date(a.generatedAt).getTime()
  );
}

export function getExportById(id: string): ReportExport | undefined {
  initIfNeeded();
  return _exports.find((e) => e.id === id);
}

export function getExportsByStatus(status: ExportStatus): ReportExport[] {
  initIfNeeded();
  return _exports.filter((e) => e.status === status);
}

export function getExportsByReportId(reportId: string): ReportExport[] {
  initIfNeeded();
  return _exports.filter((e) => e.reportId === reportId);
}

export function computeExportSummary(): ExportSummary {
  initIfNeeded();
  return {
    total: _exports.length,
    generated: _exports.filter((e) => e.status === 'generated').length,
    downloaded: _exports.filter((e) => e.status === 'downloaded').length,
    distributed: _exports.filter((e) => e.status === 'distributed').length,
    archived: _exports.filter((e) => e.status === 'archived').length,
  };
}

export function getAllDistributions(): ReportDistribution[] {
  initIfNeeded();
  return [..._distributions].sort((a, b) =>
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

export function getDistributionsByExportId(exportId: string): ReportDistribution[] {
  initIfNeeded();
  return _distributions.filter((d) => d.exportId === exportId);
}

export function computeDistributionSummary(): DistributionSummary {
  initIfNeeded();
  const total = _distributions.length;
  const delivered = _distributions.filter((d) => d.status === 'delivered').length;
  const pending = _distributions.filter((d) => d.status === 'pending').length;
  const failed = _distributions.filter((d) => d.status === 'failed').length;
  const deliveryRate = total > 0 ? Math.round((delivered / total) * 100) : 0;
  return { total, delivered, pending, failed, deliveryRate };
}

export function getExportAuditLog(): ExportAuditEntry[] {
  initIfNeeded();
  return [..._exportAuditLog].sort((a, b) =>
    new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );
}

// ─────────────────────────────────────────────────────────────────────
// PUBLIC API — EXPORT ACTIONS (simulated, no mutation of source reports)
// ─────────────────────────────────────────────────────────────────────

export function generateExport(
  reportId: string,
  exportType: ExportType,
  generatedBy: string
): ReportExport | null {
  initIfNeeded();
  const report = getReportById(reportId);
  if (!report) return null;

  const id = `exp-${Date.now()}-${++_idCounter}`;
  const typeSlug = exportType.replace(/_/g, '-');
  const reportSlug = report.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/-+/g, '-');
  const fileName = `${typeSlug}-${reportSlug}.pdf`;
  const auditReference = `AUD-EXP-${String(_idCounter).padStart(3, '0')}`;

  const newExport: ReportExport = {
    id,
    reportId,
    reportName: report.name,
    exportType,
    generatedAt: new Date().toISOString(),
    generatedBy,
    status: 'generated',
    fileName,
    fileSizeKb: Math.floor(80 + Math.random() * 300),
    auditReference,
    distributionCount: 0,
  };

  _exports.unshift(newExport);
  recordExportAudit('export_generated', id, fileName, generatedBy);
  return newExport;
}

export function generateBoardPack(
  generatedBy: string
): ReportExport | null {
  initIfNeeded();
  // Aggregates executive summary, KPI snapshot, risk summary, governance summary
  const id = `exp-${Date.now()}-${++_idCounter}`;
  const fileName = `board-pack-${new Date().toISOString().slice(0, 10)}.pdf`;
  const auditReference = `AUD-EXP-${String(_idCounter).padStart(3, '0')}`;

  const newExport: ReportExport = {
    id,
    reportId: 'rpt-002',
    reportName: 'Board Pack — Aggregated Export',
    exportType: 'board_pack',
    generatedAt: new Date().toISOString(),
    generatedBy,
    status: 'generated',
    fileName,
    fileSizeKb: Math.floor(300 + Math.random() * 200),
    auditReference,
    distributionCount: 0,
  };

  _exports.unshift(newExport);
  recordExportAudit('export_generated', id, fileName, generatedBy, 'Board Pack — aggregated export');
  return newExport;
}

export function downloadExport(id: string, performedBy: string): boolean {
  initIfNeeded();
  const exp = _exports.find((e) => e.id === id);
  if (!exp || exp.status === 'archived') return false;
  if (exp.status === 'generated') {
    exp.status = 'downloaded';
  }
  recordExportAudit('export_downloaded', id, exp.fileName, performedBy);
  return true;
}

export function archiveExport(id: string, performedBy: string): boolean {
  initIfNeeded();
  const exp = _exports.find((e) => e.id === id);
  if (!exp || exp.status === 'archived') return false;
  exp.status = 'archived';
  recordExportAudit('export_archived', id, exp.fileName, performedBy);
  return true;
}

export function createDistribution(
  exportId: string,
  method: DistributionMethod,
  recipient: string,
  performedBy: string
): ReportDistribution | null {
  initIfNeeded();
  const exp = _exports.find((e) => e.id === exportId);
  if (!exp) return null;

  const id = `dist-${Date.now()}-${++_idCounter}`;
  const dist: ReportDistribution = {
    id,
    exportId,
    reportId: exp.reportId,
    reportName: exp.reportName,
    method,
    recipient,
    status: 'pending',
    createdAt: new Date().toISOString(),
  };

  _distributions.unshift(dist);
  exp.distributionCount += 1;
  if (exp.status !== 'archived') {
    exp.status = 'distributed';
  }

  recordExportAudit(
    'distribution_created',
    exportId,
    exp.fileName,
    performedBy,
    `Distribution to ${recipient} via ${method}`
  );
  return dist;
}

// For testing — resets in-memory state
export function _resetExportState(): void {
  _exports = [];
  _distributions = [];
  _exportAuditLog = [];
  _idCounter = 200;
}
