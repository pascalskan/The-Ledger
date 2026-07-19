/**
 * WORKFLOW CENTRE — Phase 6.4
 *
 * CEO-only page for cross-module workflow orchestration visibility.
 *
 * Features:
 *   - KPI strip (Total, Active, Paused, Requires Action, Financially Sensitive)
 *   - Workflow table with filters (status, type) and search
 *   - Workflow actions: View, Pause, Resume, Archive
 *   - Workflow detail dialog: trigger, steps, execution history, governance, financial safeguards
 *   - Doctrine notice
 *   - RBAC: CEO only
 */

import { useState, useMemo } from 'react';
import { Layout } from '@/components/layout';
import { PageHeader } from '@/components/page-shell';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import {
  GitBranch,
  Activity,
  ShieldAlert,
  AlertTriangle,
  CheckCircle2,
  PauseCircle,
  PlayCircle,
  Archive,
  Eye,
  Search,
  Clock,
  Layers,
  Zap,
  ChevronRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  getAllWorkflows,
  pauseWorkflow,
  resumeWorkflow,
  archiveWorkflow,
  computeWorkflowSummary,
  searchWorkflows,
  WORKFLOW_STATUS_LABELS,
  WORKFLOW_STATUS_COLORS,
  WORKFLOW_TYPE_LABELS,
  WORKFLOW_TYPE_COLORS,
  WORKFLOW_STEP_STATUS_LABELS,
  WORKFLOW_STEP_STATUS_COLORS,
  type WorkflowRecord,
  type WorkflowStatus,
  type WorkflowType,
  type WorkflowStep,
} from '@/lib/workflowEngine';

// ───────────────────────────────────────────────────────
// HELPER COMPONENTS
// ───────────────────────────────────────────────────────

function fmtDate(iso: string) {
  return new Date(iso).toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function WorkflowStatusBadge({ status }: { status: WorkflowStatus }) {
  return (
    <Badge
      variant="outline"
      className={cn('text-xs', WORKFLOW_STATUS_COLORS[status])}
      data-testid={`wf-status-badge-${status}`}
    >
      {WORKFLOW_STATUS_LABELS[status]}
    </Badge>
  );
}

function WorkflowTypeBadge({ type }: { type: WorkflowType }) {
  return (
    <Badge
      variant="outline"
      className={cn('text-xs', WORKFLOW_TYPE_COLORS[type])}
      data-testid={`wf-type-badge-${type}`}
    >
      {WORKFLOW_TYPE_LABELS[type]}
    </Badge>
  );
}

function StepStatusPip({ status }: { status: WorkflowStep['status'] }) {
  const colors: Record<WorkflowStep['status'], string> = {
    pending: 'bg-slate-300',
    completed: 'bg-emerald-500',
    blocked: 'bg-amber-400',
    failed: 'bg-red-500',
  };
  return (
    <span
      className={cn('inline-block h-2.5 w-2.5 rounded-full flex-shrink-0', colors[status])}
      title={WORKFLOW_STEP_STATUS_LABELS[status]}
    />
  );
}

// ───────────────────────────────────────────────────────
// WORKFLOW DETAIL DIALOG
// ───────────────────────────────────────────────────────

function WorkflowDetailDialog({
  workflow,
  onClose,
  onPause,
  onResume,
  onArchive,
}: {
  workflow: WorkflowRecord;
  onClose: () => void;
  onPause: (w: WorkflowRecord) => void;
  onResume: (w: WorkflowRecord) => void;
  onArchive: (w: WorkflowRecord) => void;
}) {
  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto"
        data-testid="wf-detail-dialog"
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <GitBranch className="h-4 w-4" />
            {workflow.name}
          </DialogTitle>
          <DialogDescription className="flex items-center gap-2 mt-1">
            <WorkflowTypeBadge type={workflow.workflowType} />
            <WorkflowStatusBadge status={workflow.status} />
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 mt-2">
          {/* Trigger */}
          <section data-testid="wf-detail-trigger">
            <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
              Trigger Event
            </h4>
            <div className="rounded-md border p-3 text-sm">
              <div className="font-mono text-xs font-semibold text-primary">{workflow.triggerEvent}</div>
              <div className="text-muted-foreground mt-1">{workflow.triggerDescription}</div>
            </div>
          </section>

          {/* Workflow Steps */}
          <section data-testid="wf-detail-steps">
            <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
              Workflow Steps ({workflow.steps.length})
            </h4>
            <div className="space-y-2">
              {workflow.steps.map((step, i) => (
                <div
                  key={step.id}
                  data-testid={`wf-detail-step-${step.id}`}
                  className="flex items-start gap-3 rounded-md border p-3 text-sm"
                >
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="h-5 w-5 rounded-full bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-600 flex-shrink-0">
                      {i + 1}
                    </span>
                    <StepStatusPip status={step.status} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold">{step.name}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">{step.description}</div>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      <Badge
                        variant="outline"
                        className={cn(
                          'text-[10px]',
                          WORKFLOW_STEP_STATUS_COLORS[step.status]
                        )}
                      >
                        {WORKFLOW_STEP_STATUS_LABELS[step.status]}
                      </Badge>
                      <span className="text-[10px] text-muted-foreground font-mono">
                        Module: {step.module}
                      </span>
                    </div>
                    {step.failureReason && (
                      <div className="mt-1.5 flex items-start gap-1 text-xs text-red-600">
                        <AlertTriangle className="h-3 w-3 mt-0.5 flex-shrink-0" />
                        <span>{step.failureReason}</span>
                      </div>
                    )}
                    {step.completedAt && (
                      <div className="text-[10px] text-muted-foreground mt-0.5">
                        Completed: {fmtDate(step.completedAt)}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Execution History */}
          <section data-testid="wf-detail-execution-history">
            <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
              Execution History ({workflow.executionHistory.length})
            </h4>
            {workflow.executionHistory.length === 0 ? (
              <div className="text-xs text-muted-foreground rounded-md border border-dashed p-3">
                No executions yet.
              </div>
            ) : (
              <div className="space-y-2">
                {workflow.executionHistory.map((exec) => (
                  <div
                    key={exec.id}
                    data-testid={`wf-detail-exec-${exec.id}`}
                    className="rounded-md border p-3 text-xs space-y-1"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono font-semibold">{exec.id}</span>
                      <Badge
                        variant="outline"
                        className={cn(
                          'text-[10px]',
                          exec.status === 'completed'
                            ? 'text-emerald-700 bg-emerald-50 border-emerald-200'
                            : exec.status === 'failed'
                            ? 'text-red-700 bg-red-50 border-red-200'
                            : exec.status === 'blocked'
                            ? 'text-amber-700 bg-amber-50 border-amber-200'
                            : 'text-blue-700 bg-blue-50 border-blue-200'
                        )}
                        data-testid={`wf-exec-status-${exec.id}`}
                      >
                        {exec.status}
                      </Badge>
                    </div>
                    <div className="text-muted-foreground">
                      Triggered: {fmtDate(exec.triggeredAt)} by {exec.triggeredBy}
                    </div>
                    {exec.completedAt && (
                      <div className="text-muted-foreground">
                        Completed: {fmtDate(exec.completedAt)}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Governance Status */}
          <section data-testid="wf-detail-governance">
            <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
              Governance Status
            </h4>
            <div className="space-y-2">
              {workflow.governanceStatus === 'requires_review' && (
                <div
                  className="flex items-center gap-2 rounded-md bg-amber-50 border border-amber-200 px-3 py-2 text-xs text-amber-700"
                  data-testid="wf-detail-governance-flag"
                >
                  <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                  <span>
                    <strong>Governance Review Required</strong> — This workflow is flagged for CEO
                    inspection.
                  </span>
                </div>
              )}
              {workflow.governanceStatus === 'compliant' && (
                <div className="flex items-center gap-2 rounded-md bg-emerald-50 border border-emerald-200 px-3 py-2 text-xs text-emerald-700">
                  <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                  <span>Compliant — No governance concerns.</span>
                </div>
              )}
            </div>
          </section>

          {/* Financial Safeguards */}
          <section data-testid="wf-detail-financial-safeguards">
            <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
              Financial Safeguards
            </h4>
            {workflow.financiallySensitive ? (
              <div
                className="flex items-start gap-2 rounded-md bg-red-50 border border-red-200 px-3 py-2 text-xs text-red-700"
                data-testid="wf-detail-financially-sensitive-flag"
              >
                <ShieldAlert className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                <span>
                  <strong>Financially Sensitive Workflow</strong> — This workflow is subject to
                  governance oversight. It may never approve financial records, approve expenses,
                  or bypass the Review Centre.
                </span>
              </div>
            ) : (
              <div className="flex items-center gap-2 rounded-md bg-slate-50 border border-slate-200 px-3 py-2 text-xs text-slate-600">
                <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                <span>Standard operational workflow. No financial sensitivity flagged.</span>
              </div>
            )}
          </section>

          {/* Actions */}
          <div className="flex flex-wrap gap-2 pt-1" data-testid="wf-detail-actions">
            {workflow.status === 'active' && (
              <Button
                size="sm"
                variant="outline"
                className="text-amber-700 border-amber-300 hover:bg-amber-50"
                onClick={() => onPause(workflow)}
                data-testid="wf-btn-pause"
              >
                <PauseCircle className="h-3.5 w-3.5 mr-1" /> Pause
              </Button>
            )}
            {workflow.status === 'paused' && (
              <Button
                size="sm"
                variant="outline"
                className="text-emerald-700 border-emerald-300 hover:bg-emerald-50"
                onClick={() => onResume(workflow)}
                data-testid="wf-btn-resume"
              >
                <PlayCircle className="h-3.5 w-3.5 mr-1" /> Resume
              </Button>
            )}
            {workflow.status !== 'archived' && (
              <Button
                size="sm"
                variant="outline"
                className="text-stone-600 border-stone-300 hover:bg-stone-50"
                onClick={() => onArchive(workflow)}
                data-testid="wf-btn-archive"
              >
                <Archive className="h-3.5 w-3.5 mr-1" /> Archive
              </Button>
            )}
            <Button size="sm" variant="outline" onClick={onClose} data-testid="wf-btn-close">
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ───────────────────────────────────────────────────────
// MAIN PAGE
// ───────────────────────────────────────────────────────

export default function WorkflowCentrePage() {
  const { toast } = useToast();
  const [workflows, setWorkflows] = useState<WorkflowRecord[]>(getAllWorkflows);
  const [selectedWorkflow, setSelectedWorkflow] = useState<WorkflowRecord | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<WorkflowStatus | 'all'>('all');
  const [typeFilter, setTypeFilter] = useState<WorkflowType | 'all'>('all');

  const summary = useMemo(() => computeWorkflowSummary(workflows), [workflows]);

  const filtered = useMemo(() => {
    let wf = workflows;
    if (statusFilter !== 'all') wf = wf.filter((w) => w.status === statusFilter);
    if (typeFilter !== 'all') wf = wf.filter((w) => w.workflowType === typeFilter);
    return searchWorkflows(wf, search);
  }, [workflows, statusFilter, typeFilter, search]);

  function refresh() {
    setWorkflows(getAllWorkflows());
  }

  function handlePause(w: WorkflowRecord) {
    try {
      pauseWorkflow(w.id, 'Marcus Webb');
      refresh();
      setSelectedWorkflow(null);
      toast({ title: 'Workflow Paused', description: `'${w.name}' has been paused.` });
    } catch (e: unknown) {
      toast({ title: 'Error', description: (e as Error).message, variant: 'destructive' });
    }
  }

  function handleResume(w: WorkflowRecord) {
    try {
      resumeWorkflow(w.id, 'Marcus Webb');
      refresh();
      setSelectedWorkflow(null);
      toast({ title: 'Workflow Resumed', description: `'${w.name}' has been resumed.` });
    } catch (e: unknown) {
      toast({ title: 'Error', description: (e as Error).message, variant: 'destructive' });
    }
  }

  function handleArchive(w: WorkflowRecord) {
    try {
      archiveWorkflow(w.id, 'Marcus Webb');
      refresh();
      setSelectedWorkflow(null);
      toast({ title: 'Workflow Archived', description: `'${w.name}' has been archived.` });
    } catch (e: unknown) {
      toast({ title: 'Error', description: (e as Error).message, variant: 'destructive' });
    }
  }

  const kpiCards = [
    {
      testId: 'wf-kpi-total',
      label: 'Total Workflows',
      value: summary.total,
      icon: GitBranch,
      color: 'text-slate-600',
      bg: 'bg-slate-100',
    },
    {
      testId: 'wf-kpi-active',
      label: 'Active',
      value: summary.active,
      icon: CheckCircle2,
      color: 'text-emerald-600',
      bg: 'bg-emerald-50',
    },
    {
      testId: 'wf-kpi-paused',
      label: 'Paused',
      value: summary.paused,
      icon: PauseCircle,
      color: 'text-amber-600',
      bg: 'bg-amber-50',
    },
    {
      testId: 'wf-kpi-requires-action',
      label: 'Requires Action',
      value: summary.requiresAction,
      icon: AlertTriangle,
      color: 'text-red-500',
      bg: 'bg-red-50',
    },
    {
      testId: 'wf-kpi-financially-sensitive',
      label: 'Financially Sensitive',
      value: summary.financiallySensitive,
      icon: ShieldAlert,
      color: 'text-purple-600',
      bg: 'bg-purple-50',
    },
  ];

  const allTypes: WorkflowType[] = [
    'review_workflow',
    'exception_workflow',
    'governance_workflow',
    'sync_workflow',
    'notification_workflow',
  ];

  return (
    <Layout>
      <div data-testid="workflow-centre-page" className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-end">
          <div>
            <PageHeader
              title="Workflow Centre"
              icon={GitBranch}
              description="Cross-module workflow orchestration and execution visibility."
            />
          </div>
          <Badge
            variant="outline"
            className="px-3 py-1 text-xs font-mono uppercase tracking-wider border-primary/20 bg-primary/5"
          >
            CEO Only
          </Badge>
        </div>

        {/* Doctrine Notice */}
        <div
          data-testid="wf-doctrine-notice"
          className="flex items-start gap-3 p-3 rounded-lg bg-blue-50 border border-blue-200 text-blue-800 text-sm"
        >
          <CheckCircle2 className="h-4 w-4 mt-0.5 flex-shrink-0" />
          <span>
            <strong>Workflow Doctrine:</strong> Workflows may create notifications, generate
            activity events, escalate reviews, assign investigations, and trigger governance
            reviews. Workflows may{' '}
            <strong>never</strong> approve reports, approve expenses, approve timesheets,
            create approved invoices, create approved financial records, or bypass the Review
            Centre. Approval Doctrine remains absolute.
          </span>
        </div>

        {/* KPI Strip */}
        <div data-testid="wf-kpi-strip" className="grid gap-4 md:grid-cols-5">
          {kpiCards.map((kpi) => (
            <Card key={kpi.testId} data-testid={kpi.testId} className="border-slate-200/60 shadow-sm">
              <CardContent className="pt-4 pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground">{kpi.label}</p>
                    <p className="text-2xl font-bold mt-1">{kpi.value}</p>
                  </div>
                  <div
                    className={cn(
                      'h-9 w-9 rounded-lg flex items-center justify-center',
                      kpi.bg
                    )}
                  >
                    <kpi.icon className={cn('h-5 w-5', kpi.color)} />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Filters + Search */}
        <Card className="border-slate-200/60 shadow-sm">
          <CardContent className="pt-4 pb-3">
            <div className="flex flex-wrap gap-3">
              <div className="relative flex-1 min-w-48">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  data-testid="wf-search"
                  placeholder="Search workflow name, type, trigger…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
              <select
                className="h-9 rounded-md border bg-background px-3 text-sm"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as WorkflowStatus | 'all')}
                data-testid="wf-filter-status"
              >
                <option value="all">All Statuses</option>
                <option value="active">Active</option>
                <option value="paused">Paused</option>
                <option value="draft">Draft</option>
                <option value="archived">Archived</option>
              </select>
              <select
                className="h-9 rounded-md border bg-background px-3 text-sm"
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value as WorkflowType | 'all')}
                data-testid="wf-filter-type"
              >
                <option value="all">All Types</option>
                {allTypes.map((t) => (
                  <option key={t} value={t}>
                    {WORKFLOW_TYPE_LABELS[t]}
                  </option>
                ))}
              </select>
            </div>
          </CardContent>
        </Card>

        {/* Workflow Table */}
        <Card className="border-slate-200/60 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Layers className="h-4 w-4 text-primary" />
              Workflows
            </CardTitle>
            <CardDescription>
              All cross-module workflows and their current orchestration status.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div data-testid="wf-table">
              {filtered.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                  <GitBranch className="h-10 w-10 mb-3 opacity-20" />
                  <p className="text-sm">No workflows match the current filters.</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Workflow</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Trigger</TableHead>
                      <TableHead className="text-center">Steps</TableHead>
                      <TableHead>Last Updated</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map((wf) => (
                      <TableRow key={wf.id} data-testid={`wf-row-${wf.id}`}>
                        <TableCell>
                          <div className="font-medium text-sm max-w-[200px] truncate">
                            {wf.name}
                          </div>
                          <div className="flex items-center gap-1 mt-0.5">
                            {wf.actionRequired && (
                              <span
                                data-testid={`wf-action-required-${wf.id}`}
                                className="inline-flex items-center gap-0.5 px-1 py-0.5 rounded text-[10px] font-semibold bg-orange-100 text-orange-800"
                              >
                                <AlertTriangle className="h-2.5 w-2.5" /> Action Required
                              </span>
                            )}
                            {wf.financiallySensitive && (
                              <span
                                data-testid={`wf-fin-sensitive-${wf.id}`}
                                className="inline-flex items-center gap-0.5 px-1 py-0.5 rounded text-[10px] font-semibold bg-red-100 text-red-800"
                              >
                                <ShieldAlert className="h-2.5 w-2.5" /> Financial
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <WorkflowTypeBadge type={wf.workflowType} />
                        </TableCell>
                        <TableCell>
                          <WorkflowStatusBadge status={wf.status} />
                        </TableCell>
                        <TableCell>
                          <span className="text-xs font-mono text-muted-foreground">
                            {wf.triggerEvent}
                          </span>
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex items-center justify-center gap-1">
                            {wf.steps.map((s) => (
                              <StepStatusPip key={s.id} status={s.status} />
                            ))}
                            <span className="text-xs text-muted-foreground ml-1">
                              {wf.steps.length}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="text-xs text-muted-foreground">
                            {fmtDate(wf.updatedAt)}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-xs h-7"
                              onClick={() => setSelectedWorkflow(wf)}
                              data-testid={`wf-btn-view-${wf.id}`}
                            >
                              <Eye className="h-3 w-3 mr-1" /> View
                            </Button>
                            {wf.status === 'active' && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-xs h-7 text-amber-700 border-amber-300"
                                onClick={() => handlePause(wf)}
                                data-testid={`wf-btn-pause-${wf.id}`}
                              >
                                <PauseCircle className="h-3 w-3" />
                              </Button>
                            )}
                            {wf.status === 'paused' && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-xs h-7 text-emerald-700 border-emerald-300"
                                onClick={() => handleResume(wf)}
                                data-testid={`wf-btn-resume-${wf.id}`}
                              >
                                <PlayCircle className="h-3 w-3" />
                              </Button>
                            )}
                            {wf.status !== 'archived' && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-xs h-7 text-stone-600"
                                onClick={() => handleArchive(wf)}
                                data-testid={`wf-btn-archive-${wf.id}`}
                              >
                                <Archive className="h-3 w-3" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Execution Visibility Panel */}
        <Card className="border-slate-200/60 shadow-sm" data-testid="wf-execution-panel">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Activity className="h-4 w-4 text-primary" />
              Workflow Execution Visibility
            </CardTitle>
            <CardDescription>
              Live execution status across all active workflows.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {workflows
                .filter((w) => w.executionHistory.length > 0)
                .slice(0, 5)
                .map((wf) => {
                  const latestExec = wf.executionHistory[
                    wf.executionHistory.length - 1
                  ];
                  const failedSteps = wf.steps.filter((s) => s.status === 'failed');
                  const blockedSteps = wf.steps.filter((s) => s.status === 'blocked');
                  return (
                    <div
                      key={wf.id}
                      data-testid={`wf-exec-panel-row-${wf.id}`}
                      className="flex items-start justify-between gap-3 rounded-md border p-3"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-medium truncate">{wf.name}</span>
                          <WorkflowTypeBadge type={wf.workflowType} />
                        </div>
                        <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground flex-wrap">
                          <span>Last exec: {fmtDate(latestExec.triggeredAt)}</span>
                          {failedSteps.length > 0 && (
                            <span
                              data-testid={`wf-exec-failed-steps-${wf.id}`}
                              className="text-red-600 font-semibold"
                            >
                              {failedSteps.length} step{failedSteps.length > 1 ? 's' : ''} failed
                            </span>
                          )}
                          {blockedSteps.length > 0 && (
                            <span
                              data-testid={`wf-exec-blocked-steps-${wf.id}`}
                              className="text-amber-600 font-semibold"
                            >
                              {blockedSteps.length} step{blockedSteps.length > 1 ? 's' : ''} blocked
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge
                          variant="outline"
                          className={cn(
                            'text-[10px]',
                            latestExec.status === 'completed'
                              ? 'text-emerald-700 bg-emerald-50 border-emerald-200'
                              : latestExec.status === 'failed'
                              ? 'text-red-700 bg-red-50 border-red-200'
                              : latestExec.status === 'blocked'
                              ? 'text-amber-700 bg-amber-50 border-amber-200'
                              : 'text-blue-700 bg-blue-50 border-blue-200'
                          )}
                          data-testid={`wf-exec-panel-status-${wf.id}`}
                        >
                          {latestExec.status}
                        </Badge>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 w-7 p-0"
                          onClick={() => setSelectedWorkflow(wf)}
                          data-testid={`wf-exec-panel-view-${wf.id}`}
                        >
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              {workflows.filter((w) => w.executionHistory.length > 0).length === 0 && (
                <div className="text-sm text-muted-foreground text-center py-4">
                  No workflow executions yet.
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {selectedWorkflow && (
        <WorkflowDetailDialog
          workflow={selectedWorkflow}
          onClose={() => setSelectedWorkflow(null)}
          onPause={handlePause}
          onResume={handleResume}
          onArchive={handleArchive}
        />
      )}
    </Layout>
  );
}
