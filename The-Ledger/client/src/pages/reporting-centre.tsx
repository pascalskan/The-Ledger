/**
 * REPORTING CENTRE — Phase 6.8
 *
 * Extended from Phase 6.7. Adds Exports tab and Distribution tab.
 * CEO-only page.
 *
 * Route: /reporting-centre
 */

import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { Layout } from '@/components/layout';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { useAuth } from '@/lib/mockData';
import {
  getAllReports,
  computeReportingSummary,
  archiveReport,
  recordReportViewed,
  generateExecutiveSummary,
  generateBoardReport,
  generateGovernanceReport,
  generateFinancialHealthReport,
  generateOperationsReport,
  generateMonthlyKPIReport,
  REPORT_TYPE_LABELS,
  REPORT_TYPE_COLORS,
  REPORT_STATUS_LABELS,
  REPORT_STATUS_COLORS,
  REPORT_PERIOD_LABELS,
  AVAILABLE_SECTIONS,
  type ReportRecord,
  type ReportType,
  type ReportStatus,
  type ReportPeriod,
} from '@/lib/reportingEngine';
import {
  getAllExports,
  getAllDistributions,
  computeExportSummary,
  computeDistributionSummary,
  generateExport,
  generateBoardPack,
  downloadExport,
  archiveExport,
  EXPORT_TYPE_LABELS,
  EXPORT_TYPE_COLORS,
  EXPORT_STATUS_LABELS,
  EXPORT_STATUS_COLORS,
  DISTRIBUTION_METHOD_LABELS,
  DISTRIBUTION_STATUS_LABELS,
  DISTRIBUTION_STATUS_COLORS,
  type ReportExport,
  type ExportType,
} from '@/lib/exportEngine';
import {
  FileText,
  BarChart3,
  Archive,
  Eye,
  Plus,
  ShieldAlert,
  ExternalLink,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Download,
  Send,
  Package,
} from 'lucide-react';

// ─────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return iso;
  }
}

function kpiStatusColor(status?: 'healthy' | 'warning' | 'critical'): string {
  if (status === 'healthy') return 'text-emerald-700';
  if (status === 'warning') return 'text-amber-700';
  if (status === 'critical') return 'text-red-700';
  return 'text-slate-700';
}

function kpiStatusDot(status?: 'healthy' | 'warning' | 'critical'): string {
  if (status === 'healthy') return 'bg-emerald-500';
  if (status === 'warning') return 'bg-amber-500';
  if (status === 'critical') return 'bg-red-500';
  return 'bg-slate-400';
}

const REPORT_TYPES: { value: ReportType; label: string }[] = [
  { value: 'executive_summary', label: 'Executive Summary' },
  { value: 'board_report', label: 'Board Report' },
  { value: 'governance_report', label: 'Governance Report' },
  { value: 'financial_health_report', label: 'Financial Health Report' },
  { value: 'operations_report', label: 'Operations Report' },
  { value: 'monthly_kpi_report', label: 'Monthly KPI Report' },
];

const REPORT_PERIODS: { value: ReportPeriod; label: string }[] = [
  { value: 'this_week', label: 'This Week' },
  { value: 'this_month', label: 'This Month' },
  { value: 'last_month', label: 'Last Month' },
  { value: 'this_quarter', label: 'This Quarter' },
  { value: 'last_quarter', label: 'Last Quarter' },
  { value: 'ytd', label: 'Year to Date' },
];

// ─────────────────────────────────────────────────────────────────────
// REPORT DETAIL DIALOG
// ─────────────────────────────────────────────────────────────────────

interface ReportDetailDialogProps {
  report: ReportRecord | null;
  onClose: () => void;
  onArchive: (id: string) => void;
}

function ReportDetailDialog({ report, onClose, onArchive }: ReportDetailDialogProps) {
  const [, setLocation] = useLocation();

  if (!report) return null;

  function handleDeepLink(route: string) {
    onClose();
    setLocation(route);
  }

  return (
    <Dialog open={!!report} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        data-testid="report-detail-dialog"
        className="max-w-2xl max-h-[90vh] overflow-y-auto"
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-purple-600" />
            {report.name}
          </DialogTitle>
        </DialogHeader>

        {/* Doctrine Notice */}
        <div
          data-testid="report-detail-doctrine-notice"
          className="rounded-md border border-amber-200 bg-amber-50 p-3"
        >
          <p className="text-xs text-amber-800">
            <strong>Reporting Doctrine:</strong> This report is <strong>informational only</strong>.
            Reports may aggregate, summarise, and present data. Reports may never approve records,
            modify records, or trigger financial mutations.
          </p>
        </div>

        {/* Meta row */}
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <Badge variant="outline" className={cn('text-xs', REPORT_TYPE_COLORS[report.type])}>
            {REPORT_TYPE_LABELS[report.type]}
          </Badge>
          <Badge variant="outline" className={cn('text-xs', REPORT_STATUS_COLORS[report.status])}>
            {REPORT_STATUS_LABELS[report.status]}
          </Badge>
          <span>{REPORT_PERIOD_LABELS[report.period]}</span>
          <span>·</span>
          <span>{formatDate(report.generatedAt)}</span>
          <span>·</span>
          <span>Owner: {report.owner}</span>
        </div>

        {/* Executive Summary */}
        <div data-testid="report-detail-exec-summary" className="space-y-1">
          <h3 className="text-sm font-semibold">Executive Summary</h3>
          <p className="text-sm text-muted-foreground">{report.executiveSummaryText}</p>
        </div>

        {/* KPI Snapshot */}
        {report.kpiSnapshot && report.kpiSnapshot.length > 0 && (
          <div data-testid="report-detail-kpi-snapshot" className="space-y-2">
            <h3 className="text-sm font-semibold">KPI Snapshot</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {report.kpiSnapshot.map((kpi, idx) => (
                <div key={idx} className="rounded-md border bg-card p-2">
                  <p className="text-xs text-muted-foreground">{kpi.label}</p>
                  <div className="flex items-center gap-1 mt-0.5">
                    {kpi.status && (
                      <span className={cn('h-2 w-2 rounded-full flex-shrink-0', kpiStatusDot(kpi.status))} />
                    )}
                    <p className={cn('text-sm font-bold', kpiStatusColor(kpi.status))}>{kpi.value}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Risk Summary */}
        <div data-testid="report-detail-risk-summary" className="space-y-1">
          <h3 className="text-sm font-semibold flex items-center gap-1">
            <AlertTriangle className="h-4 w-4 text-amber-600" />
            Risk Summary
          </h3>
          <p className="text-sm text-muted-foreground">{report.riskSummary}</p>
        </div>

        {/* Forecast Summary */}
        <div data-testid="report-detail-forecast-summary" className="space-y-1">
          <h3 className="text-sm font-semibold flex items-center gap-1">
            <BarChart3 className="h-4 w-4 text-blue-600" />
            Forecast Summary
          </h3>
          <p className="text-sm text-muted-foreground">{report.forecastSummary}</p>
        </div>

        {/* Governance Summary */}
        <div data-testid="report-detail-governance-summary" className="space-y-1">
          <h3 className="text-sm font-semibold flex items-center gap-1">
            <ShieldAlert className="h-4 w-4 text-purple-600" />
            Governance Summary
          </h3>
          <p className="text-sm text-muted-foreground">{report.governanceSummary}</p>
        </div>

        {/* Deep Link Sections */}
        {report.sections && report.sections.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-sm font-semibold">Report Sections</h3>
            {report.sections.map((section) => (
              <div key={section.id} className="rounded-md border p-3 bg-card">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{section.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{section.content}</p>
                  </div>
                  {section.deepLinkRoute && (
                    <Button
                      data-testid={`report-deeplink-${section.id}`}
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs gap-1 flex-shrink-0"
                      onClick={() => handleDeepLink(section.deepLinkRoute!)}
                    >
                      <ExternalLink className="h-3 w-3" />
                      {section.deepLinkLabel ?? 'View'}
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Footer actions */}
        <div className="flex items-center justify-between pt-2 border-t">
          <div className="flex items-center gap-2">
            {report.status !== 'archived' && (
              <Button
                data-testid="report-detail-archive-btn"
                variant="outline"
                size="sm"
                className="gap-1 text-slate-600"
                onClick={() => {
                  onArchive(report.id);
                  onClose();
                }}
              >
                <Archive className="h-4 w-4" />
                Archive
              </Button>
            )}
          </div>
          <Button
            data-testid="report-detail-close-btn"
            variant="ghost"
            size="sm"
            onClick={onClose}
          >
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─────────────────────────────────────────────────────────────────────
// EXPORT DETAIL DIALOG
// ─────────────────────────────────────────────────────────────────────

interface ExportDetailDialogProps {
  exportRecord: ReportExport | null;
  onClose: () => void;
  onDownload: (id: string) => void;
  onArchive: (id: string) => void;
}

function ExportDetailDialog({ exportRecord, onClose, onDownload, onArchive }: ExportDetailDialogProps) {
  if (!exportRecord) return null;

  return (
    <Dialog open={!!exportRecord} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        data-testid="export-detail-dialog"
        className="max-w-lg"
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5 text-indigo-600" />
            Export Detail
          </DialogTitle>
        </DialogHeader>

        {/* Doctrine Notice */}
        <div
          data-testid="export-detail-doctrine-notice"
          className="rounded-md border border-amber-200 bg-amber-50 p-3"
        >
          <p className="text-xs text-amber-800">
            <strong>Export Doctrine:</strong> Export actions do not modify source reports.
            Exports are informational artifacts only and may never approve records, modify records,
            or trigger financial mutations.
          </p>
        </div>

        {/* Metadata grid */}
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <p className="text-xs text-muted-foreground">Export ID</p>
            <p className="font-mono text-xs">{exportRecord.id}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Audit Reference</p>
            <p className="font-mono text-xs">{exportRecord.auditReference}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Linked Report</p>
            <p className="font-medium text-xs truncate">{exportRecord.reportName}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Export Type</p>
            <Badge variant="outline" className={cn('text-xs', EXPORT_TYPE_COLORS[exportRecord.exportType])}>
              {EXPORT_TYPE_LABELS[exportRecord.exportType]}
            </Badge>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Status</p>
            <Badge variant="outline" className={cn('text-xs', EXPORT_STATUS_COLORS[exportRecord.status])}>
              {EXPORT_STATUS_LABELS[exportRecord.status]}
            </Badge>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">File Size</p>
            <p className="text-xs">{exportRecord.fileSizeKb} KB</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Generated</p>
            <p className="text-xs">{formatDate(exportRecord.generatedAt)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Generated By</p>
            <p className="text-xs">{exportRecord.generatedBy}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">File Name</p>
            <p className="font-mono text-xs truncate">{exportRecord.fileName}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Distributions</p>
            <p className="text-xs">{exportRecord.distributionCount}</p>
          </div>
        </div>

        {/* Footer actions */}
        <div className="flex items-center justify-between pt-2 border-t">
          <div className="flex items-center gap-2">
            {exportRecord.status !== 'archived' && (
              <>
                <Button
                  data-testid="export-detail-download-btn"
                  variant="outline"
                  size="sm"
                  className="gap-1"
                  onClick={() => {
                    onDownload(exportRecord.id);
                    onClose();
                  }}
                >
                  <Download className="h-4 w-4" />
                  Download
                </Button>
                <Button
                  data-testid="export-detail-archive-btn"
                  variant="outline"
                  size="sm"
                  className="gap-1 text-slate-600"
                  onClick={() => {
                    onArchive(exportRecord.id);
                    onClose();
                  }}
                >
                  <Archive className="h-4 w-4" />
                  Archive
                </Button>
              </>
            )}
          </div>
          <Button
            data-testid="export-detail-close-btn"
            variant="ghost"
            size="sm"
            onClick={onClose}
          >
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─────────────────────────────────────────────────────────────────────
// REPORT BUILDER DIALOG
// ─────────────────────────────────────────────────────────────────────

interface ReportBuilderDialogProps {
  open: boolean;
  onClose: () => void;
  onGenerated: (report: ReportRecord) => void;
  generatedBy: string;
}

function ReportBuilderDialog({ open, onClose, onGenerated, generatedBy }: ReportBuilderDialogProps) {
  const [selectedType, setSelectedType] = useState<ReportType>('executive_summary');
  const [selectedPeriod, setSelectedPeriod] = useState<ReportPeriod>('this_month');
  const [selectedSections, setSelectedSections] = useState<string[]>(
    ['executive_summary', 'kpi_snapshot', 'risk_summary', 'forecast_summary', 'governance_summary']
  );
  const [generating, setGenerating] = useState(false);

  function toggleSection(id: string) {
    setSelectedSections((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
    );
  }

  function handleGenerate() {
    setGenerating(true);
    let report: ReportRecord;
    try {
      switch (selectedType) {
        case 'board_report':
          report = generateBoardReport(selectedPeriod, selectedSections, generatedBy); break;
        case 'governance_report':
          report = generateGovernanceReport(selectedPeriod, selectedSections, generatedBy); break;
        case 'financial_health_report':
          report = generateFinancialHealthReport(selectedPeriod, selectedSections, generatedBy); break;
        case 'operations_report':
          report = generateOperationsReport(selectedPeriod, selectedSections, generatedBy); break;
        case 'monthly_kpi_report':
          report = generateMonthlyKPIReport(selectedPeriod, selectedSections, generatedBy); break;
        default:
          report = generateExecutiveSummary(selectedPeriod, selectedSections, generatedBy);
      }
      onGenerated(report);
    } finally {
      setGenerating(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent data-testid="report-builder-dialog" className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5 text-purple-600" />
            Report Builder
          </DialogTitle>
        </DialogHeader>

        {/* Type selection */}
        <div className="space-y-2">
          <p className="text-sm font-medium">Report Type</p>
          <div className="grid grid-cols-2 gap-2">
            {REPORT_TYPES.map((t) => (
              <button
                key={t.value}
                data-testid={`builder-type-${t.value}`}
                onClick={() => setSelectedType(t.value)}
                className={cn(
                  'p-2 rounded-md border text-sm text-left transition-colors',
                  selectedType === t.value
                    ? 'border-purple-400 bg-purple-50 text-purple-800 font-medium'
                    : 'border-border bg-card hover:bg-muted'
                )}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Period selection */}
        <div className="space-y-2">
          <p className="text-sm font-medium">Reporting Period</p>
          <div className="flex flex-wrap gap-2">
            {REPORT_PERIODS.map((p) => (
              <button
                key={p.value}
                data-testid={`builder-period-${p.value}`}
                onClick={() => setSelectedPeriod(p.value)}
                className={cn(
                  'px-3 py-1.5 rounded-md border text-xs transition-colors',
                  selectedPeriod === p.value
                    ? 'border-purple-400 bg-purple-50 text-purple-800 font-medium'
                    : 'border-border bg-card hover:bg-muted'
                )}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* Sections selection */}
        <div className="space-y-2">
          <p className="text-sm font-medium">Included Sections</p>
          <div className="grid grid-cols-2 gap-1.5">
            {AVAILABLE_SECTIONS.map((s) => (
              <button
                key={s.id}
                data-testid={`builder-section-${s.id}`}
                onClick={() => toggleSection(s.id)}
                className={cn(
                  'flex items-center gap-2 px-2 py-1.5 rounded border text-xs text-left transition-colors',
                  selectedSections.includes(s.id)
                    ? 'border-emerald-400 bg-emerald-50 text-emerald-800'
                    : 'border-border bg-card hover:bg-muted text-muted-foreground'
                )}
              >
                <CheckCircle2 className={cn('h-3 w-3 flex-shrink-0', selectedSections.includes(s.id) ? 'text-emerald-600' : 'text-muted-foreground/40')} />
                {s.label}
              </button>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between pt-2 border-t">
          <Button variant="ghost" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button
            data-testid="builder-generate-btn"
            size="sm"
            className="gap-1 bg-purple-600 hover:bg-purple-700 text-white"
            disabled={generating || selectedSections.length === 0}
            onClick={handleGenerate}
          >
            {generating ? (
              <><Clock className="h-4 w-4 animate-spin" />Generating...</>
            ) : (
              <><FileText className="h-4 w-4" />Generate Report</>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─────────────────────────────────────────────────────────────────────
// TABS
// ─────────────────────────────────────────────────────────────────────

type ActiveTab = 'reports' | 'exports' | 'distribution';

// ─────────────────────────────────────────────────────────────────────
// MAIN PAGE
// ─────────────────────────────────────────────────────────────────────

export default function ReportingCentrePage() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();

  // Reports tab state
  const [reports, setReports] = useState<ReportRecord[]>([]);
  const [statusFilter, setStatusFilter] = useState<ReportStatus | 'all'>('all');
  const [selectedReport, setSelectedReport] = useState<ReportRecord | null>(null);
  const [builderOpen, setBuilderOpen] = useState(false);

  // Exports tab state
  const [exports, setExports] = useState<ReportExport[]>([]);
  const [selectedExport, setSelectedExport] = useState<ReportExport | null>(null);
  const [exportStatusFilter, setExportStatusFilter] = useState<string>('all');

  // Tab state
  const [activeTab, setActiveTab] = useState<ActiveTab>('reports');

  // Load on mount
  useEffect(() => {
    setReports(getAllReports());
    setExports(getAllExports());
  }, []);

  const summary = computeReportingSummary();
  const exportSummary = computeExportSummary();
  const distributionSummary = computeDistributionSummary();
  const distributions = getAllDistributions();

  const filteredReports = statusFilter === 'all'
    ? reports
    : reports.filter((r) => r.status === statusFilter);

  const filteredExports = exportStatusFilter === 'all'
    ? exports
    : exports.filter((e) => e.status === exportStatusFilter);

  // Report handlers
  function handleView(report: ReportRecord) {
    if (user?.name) recordReportViewed(report.id, report.name, user.name);
    setSelectedReport(report);
  }

  function handleArchive(id: string) {
    if (user?.name) archiveReport(id, user.name);
    setReports(getAllReports());
  }

  function handleBuilderGenerated(report: ReportRecord) {
    setBuilderOpen(false);
    setReports(getAllReports());
    setSelectedReport(report);
  }

  // Export handlers
  function handleExportView(exp: ReportExport) {
    setSelectedExport(exp);
  }

  function handleExportDownload(id: string) {
    if (user?.name) downloadExport(id, user.name);
    setExports(getAllExports());
  }

  function handleExportArchive(id: string) {
    if (user?.name) archiveExport(id, user.name);
    setExports(getAllExports());
  }

  function handleGenerateBoardPack() {
    if (user?.name) {
      generateBoardPack(user.name);
      setExports(getAllExports());
    }
  }

  function handleGenerateExport(reportId: string, exportType: ExportType) {
    if (user?.name) {
      generateExport(reportId, exportType, user.name);
      setExports(getAllExports());
    }
  }

  return (
    <Layout>
      <div data-testid="reporting-centre-page" className="space-y-6">

        {/* ── HEADER ── */}
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-2xl font-bold">Reporting Centre</h1>
              <Badge variant="outline" className="text-purple-700 border-purple-200 bg-purple-50">
                CEO Only
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              Executive reports, exports, and distribution management. Read-only.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <FileText className="h-8 w-8 text-muted-foreground" />
            <Button
              data-testid="reporting-centre-build-btn"
              size="sm"
              className="gap-1 bg-purple-600 hover:bg-purple-700 text-white"
              onClick={() => setBuilderOpen(true)}
            >
              <Plus className="h-4 w-4" />
              Build Report
            </Button>
          </div>
        </div>

        {/* ── DOCTRINE NOTICE ── */}
        <div
          data-testid="reporting-doctrine-notice"
          className="rounded-lg border border-amber-200 bg-amber-50 p-4"
        >
          <div className="flex items-start gap-3">
            <ShieldAlert className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-semibold text-amber-800">Reporting Centre Doctrine</p>
              <p className="text-xs text-amber-700 mt-0.5">
                Reports may aggregate, summarise, present, and export data. They may{' '}
                <strong>never</strong> approve records, modify records, create financial mutations,
                or bypass governance. Reporting is informational only. All report actions are audited.
              </p>
            </div>
          </div>
        </div>

        {/* ── TAB BAR ── */}
        <div data-testid="reporting-centre-tabs" className="flex items-center gap-1 border-b">
          <button
            data-testid="tab-reports"
            onClick={() => setActiveTab('reports')}
            className={cn(
              'px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors',
              activeTab === 'reports'
                ? 'border-purple-600 text-purple-700'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            )}
          >
            <span className="flex items-center gap-1.5">
              <FileText className="h-4 w-4" />
              Reports
            </span>
          </button>
          <button
            data-testid="tab-exports"
            onClick={() => setActiveTab('exports')}
            className={cn(
              'px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors',
              activeTab === 'exports'
                ? 'border-purple-600 text-purple-700'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            )}
          >
            <span className="flex items-center gap-1.5">
              <Download className="h-4 w-4" />
              Exports
            </span>
          </button>
          <button
            data-testid="tab-distribution"
            onClick={() => setActiveTab('distribution')}
            className={cn(
              'px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors',
              activeTab === 'distribution'
                ? 'border-purple-600 text-purple-700'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            )}
          >
            <span className="flex items-center gap-1.5">
              <Send className="h-4 w-4" />
              Distribution
            </span>
          </button>
        </div>

        {/* ──────────────────────── REPORTS TAB ──────────────────────── */}
        {activeTab === 'reports' && (
          <>
            {/* ── KPI STRIP ── */}
            <div data-testid="reporting-kpi-strip" className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <Card data-testid="reporting-kpi-total" className="border">
                <CardContent className="pt-4 pb-4">
                  <p className="text-xs text-muted-foreground mb-1">Total Reports</p>
                  <p className="text-2xl font-bold">{summary.total}</p>
                </CardContent>
              </Card>
              <Card data-testid="reporting-kpi-generated" className="border">
                <CardContent className="pt-4 pb-4">
                  <p className="text-xs text-muted-foreground mb-1">Generated</p>
                  <p className="text-2xl font-bold text-emerald-700">{summary.generated}</p>
                </CardContent>
              </Card>
              <Card data-testid="reporting-kpi-draft" className="border">
                <CardContent className="pt-4 pb-4">
                  <p className="text-xs text-muted-foreground mb-1">Drafts</p>
                  <p className="text-2xl font-bold text-amber-700">{summary.draft}</p>
                </CardContent>
              </Card>
              <Card data-testid="reporting-kpi-archived" className="border">
                <CardContent className="pt-4 pb-4">
                  <p className="text-xs text-muted-foreground mb-1">Archived</p>
                  <p className="text-2xl font-bold text-slate-600">{summary.archived}</p>
                </CardContent>
              </Card>
              <Card data-testid="reporting-kpi-this-month" className="border">
                <CardContent className="pt-4 pb-4">
                  <p className="text-xs text-muted-foreground mb-1">This Month</p>
                  <p className="text-2xl font-bold text-blue-700">{summary.thisMonth}</p>
                </CardContent>
              </Card>
            </div>

            {/* ── REPORTS TABLE ── */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <FileText className="h-4 w-4 text-purple-500" />
                    Reports
                  </CardTitle>
                  <div data-testid="reporting-status-filter" className="flex items-center gap-1">
                    {(['all', 'generated', 'draft', 'archived'] as const).map((s) => (
                      <button
                        key={s}
                        data-testid={`filter-status-${s}`}
                        onClick={() => setStatusFilter(s)}
                        className={cn(
                          'px-3 py-1 rounded-md text-xs border transition-colors',
                          statusFilter === s
                            ? 'border-purple-400 bg-purple-50 text-purple-800 font-medium'
                            : 'border-border bg-card hover:bg-muted text-muted-foreground'
                        )}
                      >
                        {s === 'all' ? 'All' : REPORT_STATUS_LABELS[s]}
                      </button>
                    ))}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div data-testid="reports-table" className="divide-y">
                  {filteredReports.length === 0 && (
                    <div className="py-8 text-center text-sm text-muted-foreground">
                      No reports found.
                    </div>
                  )}
                  {filteredReports.map((report) => (
                    <div
                      key={report.id}
                      data-testid={`report-row-${report.id}`}
                      className="flex items-center gap-3 px-4 py-3 hover:bg-muted/40 transition-colors"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-medium truncate">{report.name}</p>
                          <Badge
                            variant="outline"
                            className={cn('text-[10px] whitespace-nowrap', REPORT_TYPE_COLORS[report.type])}
                          >
                            {REPORT_TYPE_LABELS[report.type]}
                          </Badge>
                          <Badge
                            variant="outline"
                            className={cn('text-[10px] whitespace-nowrap', REPORT_STATUS_COLORS[report.status])}
                          >
                            {REPORT_STATUS_LABELS[report.status]}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {formatDate(report.generatedAt)} · {REPORT_PERIOD_LABELS[report.period]} · {report.owner}
                        </p>
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <Button
                          data-testid={`report-view-btn-${report.id}`}
                          variant="ghost"
                          size="sm"
                          className="h-7 gap-1 text-xs"
                          onClick={() => handleView(report)}
                        >
                          <Eye className="h-3 w-3" />
                          View
                        </Button>
                        {report.status !== 'archived' && (
                          <Button
                            data-testid={`report-archive-btn-${report.id}`}
                            variant="ghost"
                            size="sm"
                            className="h-7 gap-1 text-xs text-slate-600 hover:text-slate-900"
                            onClick={() => handleArchive(report.id)}
                          >
                            <Archive className="h-3 w-3" />
                            Archive
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </>
        )}

        {/* ──────────────────────── EXPORTS TAB ──────────────────────── */}
        {activeTab === 'exports' && (
          <>
            {/* Export KPI Strip */}
            <div data-testid="exports-kpi-strip" className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <Card data-testid="exports-kpi-total" className="border">
                <CardContent className="pt-4 pb-4">
                  <p className="text-xs text-muted-foreground mb-1">Total Exports</p>
                  <p className="text-2xl font-bold">{exportSummary.total}</p>
                </CardContent>
              </Card>
              <Card data-testid="exports-kpi-distributed" className="border">
                <CardContent className="pt-4 pb-4">
                  <p className="text-xs text-muted-foreground mb-1">Distributed</p>
                  <p className="text-2xl font-bold text-indigo-700">{exportSummary.distributed}</p>
                </CardContent>
              </Card>
              <Card data-testid="exports-kpi-downloaded" className="border">
                <CardContent className="pt-4 pb-4">
                  <p className="text-xs text-muted-foreground mb-1">Downloaded</p>
                  <p className="text-2xl font-bold text-blue-700">{exportSummary.downloaded}</p>
                </CardContent>
              </Card>
              <Card data-testid="exports-kpi-pending" className="border">
                <CardContent className="pt-4 pb-4">
                  <p className="text-xs text-muted-foreground mb-1">Generated</p>
                  <p className="text-2xl font-bold text-emerald-700">{exportSummary.generated}</p>
                </CardContent>
              </Card>
              <Card data-testid="exports-kpi-archived" className="border">
                <CardContent className="pt-4 pb-4">
                  <p className="text-xs text-muted-foreground mb-1">Archived</p>
                  <p className="text-2xl font-bold text-slate-600">{exportSummary.archived}</p>
                </CardContent>
              </Card>
            </div>

            {/* Board Pack generator */}
            <div className="flex items-center gap-2 justify-end">
              <Button
                data-testid="generate-board-pack-btn"
                variant="outline"
                size="sm"
                className="gap-1"
                onClick={handleGenerateBoardPack}
              >
                <Package className="h-4 w-4" />
                Generate Board Pack
              </Button>
            </div>

            {/* Exports table */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Download className="h-4 w-4 text-indigo-500" />
                    Exports
                  </CardTitle>
                  <div data-testid="exports-status-filter" className="flex items-center gap-1">
                    {(['all', 'generated', 'downloaded', 'distributed', 'archived'] as const).map((s) => (
                      <button
                        key={s}
                        data-testid={`export-filter-status-${s}`}
                        onClick={() => setExportStatusFilter(s)}
                        className={cn(
                          'px-3 py-1 rounded-md text-xs border transition-colors',
                          exportStatusFilter === s
                            ? 'border-indigo-400 bg-indigo-50 text-indigo-800 font-medium'
                            : 'border-border bg-card hover:bg-muted text-muted-foreground'
                        )}
                      >
                        {s === 'all' ? 'All' : EXPORT_STATUS_LABELS[s]}
                      </button>
                    ))}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div data-testid="exports-table" className="divide-y">
                  {filteredExports.length === 0 && (
                    <div className="py-8 text-center text-sm text-muted-foreground">
                      No exports found.
                    </div>
                  )}
                  {filteredExports.map((exp) => (
                    <div
                      key={exp.id}
                      data-testid={`export-row-${exp.id}`}
                      className="flex items-center gap-3 px-4 py-3 hover:bg-muted/40 transition-colors"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-medium truncate">{exp.fileName}</p>
                          <Badge
                            variant="outline"
                            className={cn('text-[10px] whitespace-nowrap', EXPORT_TYPE_COLORS[exp.exportType])}
                          >
                            {EXPORT_TYPE_LABELS[exp.exportType]}
                          </Badge>
                          <Badge
                            variant="outline"
                            className={cn('text-[10px] whitespace-nowrap', EXPORT_STATUS_COLORS[exp.status])}
                          >
                            {EXPORT_STATUS_LABELS[exp.status]}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {formatDate(exp.generatedAt)} · {exp.fileSizeKb} KB · {exp.generatedBy}
                        </p>
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <Button
                          data-testid={`export-view-btn-${exp.id}`}
                          variant="ghost"
                          size="sm"
                          className="h-7 gap-1 text-xs"
                          onClick={() => handleExportView(exp)}
                        >
                          <Eye className="h-3 w-3" />
                          View
                        </Button>
                        {exp.status !== 'archived' && (
                          <>
                            <Button
                              data-testid={`export-download-btn-${exp.id}`}
                              variant="ghost"
                              size="sm"
                              className="h-7 gap-1 text-xs"
                              onClick={() => handleExportDownload(exp.id)}
                            >
                              <Download className="h-3 w-3" />
                              Download
                            </Button>
                            <Button
                              data-testid={`export-archive-btn-${exp.id}`}
                              variant="ghost"
                              size="sm"
                              className="h-7 gap-1 text-xs text-slate-600"
                              onClick={() => handleExportArchive(exp.id)}
                            >
                              <Archive className="h-3 w-3" />
                              Archive
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </>
        )}

        {/* ──────────────────────── DISTRIBUTION TAB ──────────────────────── */}
        {activeTab === 'distribution' && (
          <>
            {/* Distribution KPI Strip */}
            <div data-testid="distribution-kpi-strip" className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <Card data-testid="dist-kpi-total" className="border">
                <CardContent className="pt-4 pb-4">
                  <p className="text-xs text-muted-foreground mb-1">Total Distributions</p>
                  <p className="text-2xl font-bold">{distributionSummary.total}</p>
                </CardContent>
              </Card>
              <Card data-testid="dist-kpi-delivered" className="border">
                <CardContent className="pt-4 pb-4">
                  <p className="text-xs text-muted-foreground mb-1">Delivered</p>
                  <p className="text-2xl font-bold text-emerald-700">{distributionSummary.delivered}</p>
                </CardContent>
              </Card>
              <Card data-testid="dist-kpi-pending" className="border">
                <CardContent className="pt-4 pb-4">
                  <p className="text-xs text-muted-foreground mb-1">Pending</p>
                  <p className="text-2xl font-bold text-amber-700">{distributionSummary.pending}</p>
                </CardContent>
              </Card>
              <Card data-testid="dist-kpi-failed" className="border">
                <CardContent className="pt-4 pb-4">
                  <p className="text-xs text-muted-foreground mb-1">Failed</p>
                  <p className="text-2xl font-bold text-red-600">{distributionSummary.failed}</p>
                </CardContent>
              </Card>
              <Card data-testid="dist-kpi-rate" className="border">
                <CardContent className="pt-4 pb-4">
                  <p className="text-xs text-muted-foreground mb-1">Delivery Rate</p>
                  <p className="text-2xl font-bold text-blue-700">{distributionSummary.deliveryRate}%</p>
                </CardContent>
              </Card>
            </div>

            {/* Distribution table */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Send className="h-4 w-4 text-blue-500" />
                  Distributions
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div data-testid="distribution-table" className="divide-y">
                  {distributions.length === 0 && (
                    <div className="py-8 text-center text-sm text-muted-foreground">
                      No distributions found.
                    </div>
                  )}
                  {distributions.map((dist) => (
                    <div
                      key={dist.id}
                      data-testid={`distribution-row-${dist.id}`}
                      className="flex items-center gap-3 px-4 py-3 hover:bg-muted/40 transition-colors"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-medium truncate">{dist.reportName}</p>
                          <Badge variant="outline" className="text-[10px] whitespace-nowrap">
                            {DISTRIBUTION_METHOD_LABELS[dist.method]}
                          </Badge>
                          <Badge
                            variant="outline"
                            className={cn('text-[10px] whitespace-nowrap', DISTRIBUTION_STATUS_COLORS[dist.status])}
                          >
                            {DISTRIBUTION_STATUS_LABELS[dist.status]}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {dist.recipient} · {formatDate(dist.createdAt)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </>
        )}

        {/* ── DIALOGS ── */}
        <ReportDetailDialog
          report={selectedReport}
          onClose={() => setSelectedReport(null)}
          onArchive={handleArchive}
        />

        <ExportDetailDialog
          exportRecord={selectedExport}
          onClose={() => setSelectedExport(null)}
          onDownload={handleExportDownload}
          onArchive={handleExportArchive}
        />

        <ReportBuilderDialog
          open={builderOpen}
          onClose={() => setBuilderOpen(false)}
          onGenerated={handleBuilderGenerated}
          generatedBy={user?.name ?? 'Demo CEO'}
        />

      </div>
    </Layout>
  );
}
