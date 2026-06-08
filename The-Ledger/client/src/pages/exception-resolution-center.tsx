/**
 * PHASE 5.9 — EXCEPTION RESOLUTION CENTRE PAGE
 *
 * Central operational exception management dashboard.
 * CEO-only access.
 *
 * Features:
 *   - KPI Strip: Open, Investigating, Awaiting Approval, Resolved
 *   - Exception Queue with search and filters
 *   - Financial Controls Centre (tab)
 *   - Override approval workflow with audit generation
 *
 * Doctrine:
 *   All exceptions are traceable.
 *   No override is silent.
 *   Financial controls require CEO approval.
 *   Resolution requires explicit notes.
 */

import { useState, useMemo } from "react";
import { Layout } from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Search,
  ShieldAlert,
  XCircle,
  Eye,
  CheckCheck,
  X,
  FileWarning,
  SlidersHorizontal,
} from "lucide-react";
import {
  type ExceptionRecord,
  type ExceptionStatus,
  type ExceptionType,
  EXCEPTION_STATUS_LABELS,
  EXCEPTION_STATUS_COLORS,
  EXCEPTION_TYPE_LABELS,
  EXCEPTION_TYPE_COLORS,
  SEED_EXCEPTIONS,
  computeExceptionSummary,
  searchExceptions,
  filterExceptionsByStatus,
  filterExceptionsByType,
  filterExceptionsByAssignee,
  getAssigneeNames,
  resolveException,
  rejectException,
} from "@/lib/exceptionResolutionEngine";
import {
  type FinancialControl,
  CONTROL_TYPE_LABELS,
  CONTROL_TYPE_COLORS,
  CONTROL_STATE_LABELS,
  CONTROL_STATE_COLORS,
  SEED_FINANCIAL_CONTROLS,
  computeControlSummary,
  approveControl,
  rejectControl,
  fmt,
} from "@/lib/financialControlsEngine";

function fmtDateTime(iso: string | null) {
  if (!iso) return <span className="text-muted-foreground text-xs">—</span>;
  return (
    <span className="font-mono text-xs text-muted-foreground whitespace-nowrap">
      {new Date(iso).toLocaleString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })}
    </span>
  );
}

function ExceptionStatusBadge({ status }: { status: ExceptionStatus }) {
  return (
    <Badge
      variant="outline"
      className={EXCEPTION_STATUS_COLORS[status]}
      data-testid={`exc-status-${status}`}
    >
      {EXCEPTION_STATUS_LABELS[status]}
    </Badge>
  );
}

export function ExceptionResolutionContent() {
  const [exceptions, setExceptions] = useState<ExceptionRecord[]>(SEED_EXCEPTIONS);
  const [controls, setControls] = useState<FinancialControl[]>(SEED_FINANCIAL_CONTROLS);

  // Exception filters
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<ExceptionStatus | "all">("all");
  const [typeFilter, setTypeFilter] = useState<ExceptionType | "all">("all");
  const [assigneeFilter, setAssigneeFilter] = useState<string | "all">("all");

  // Detail & resolution dialog
  const [selectedExc, setSelectedExc] = useState<ExceptionRecord | null>(null);
  const [resolveNotes, setResolveNotes] = useState("");
  const [approvalNotes, setApprovalNotes] = useState("");
  const [actionMode, setActionMode] = useState<"resolve" | "reject" | null>(null);

  // Control approval dialog
  const [selectedControl, setSelectedControl] = useState<FinancialControl | null>(null);
  const [controlNotes, setControlNotes] = useState("");
  const [controlAction, setControlAction] = useState<"approve" | "reject" | null>(null);

  const summary = useMemo(() => computeExceptionSummary(exceptions), [exceptions]);
  const controlSummary = useMemo(() => computeControlSummary(controls), [controls]);
  const assigneeNames = useMemo(() => getAssigneeNames(exceptions), [exceptions]);

  const filteredExceptions = useMemo(() => {
    let result = exceptions;
    result = filterExceptionsByStatus(result, statusFilter);
    result = filterExceptionsByType(result, typeFilter);
    result = filterExceptionsByAssignee(result, assigneeFilter);
    return searchExceptions(result, search);
  }, [exceptions, statusFilter, typeFilter, assigneeFilter, search]);

  const handleResolve = () => {
    if (!selectedExc) return;
    setExceptions((prev) =>
      prev.map((e) =>
        e.id === selectedExc.id
          ? resolveException(e, resolveNotes, approvalNotes)
          : e
      )
    );
    closeDialog();
  };

  const handleReject = () => {
    if (!selectedExc) return;
    setExceptions((prev) =>
      prev.map((e) =>
        e.id === selectedExc.id ? rejectException(e, approvalNotes) : e
      )
    );
    closeDialog();
  };

  const closeDialog = () => {
    setSelectedExc(null);
    setResolveNotes("");
    setApprovalNotes("");
    setActionMode(null);
  };

  const handleControlApprove = () => {
    if (!selectedControl) return;
    setControls((prev) =>
      prev.map((c) =>
        c.id === selectedControl.id
          ? approveControl(c, "Marcus Webb", controlNotes)
          : c
      )
    );
    closeControlDialog();
  };

  const handleControlReject = () => {
    if (!selectedControl) return;
    setControls((prev) =>
      prev.map((c) =>
        c.id === selectedControl.id
          ? rejectControl(c, "Marcus Webb", controlNotes)
          : c
      )
    );
    closeControlDialog();
  };

  const closeControlDialog = () => {
    setSelectedControl(null);
    setControlNotes("");
    setControlAction(null);
  };

  const kpiCards = [
    {
      label: "Open",
      value: summary.open,
      icon: AlertTriangle,
      color: "text-red-600",
      filter: "open" as ExceptionStatus,
      testId: "exc-kpi-open",
    },
    {
      label: "Investigating",
      value: summary.underInvestigation,
      icon: Search,
      color: "text-blue-600",
      filter: "under_investigation" as ExceptionStatus,
      testId: "exc-kpi-investigating",
    },
    {
      label: "Awaiting Approval",
      value: summary.awaitingApproval,
      icon: Clock,
      color: "text-amber-600",
      filter: "awaiting_approval" as ExceptionStatus,
      testId: "exc-kpi-awaiting",
    },
    {
      label: "Resolved",
      value: summary.resolved,
      icon: CheckCircle2,
      color: "text-emerald-600",
      filter: "resolved" as ExceptionStatus,
      testId: "exc-kpi-resolved",
    },
  ];

  return (
    <>
      <div className="space-y-6" data-testid="exception-resolution-center-page">
        {/* Header */}
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Exception Resolution Centre</h2>
          <p className="text-muted-foreground mt-1">
            Manage financial exceptions, investigate discrepancies, and control approved overrides.
          </p>
        </div>

        {/* Doctrine Notice */}
        <div className="rounded-md bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-700">
          <span className="font-semibold">Financial Controls Doctrine: </span>
          No exception resolution bypasses audit. All overrides require approval.
          Every action generates an immutable audit entry.
        </div>

        {/* KPI Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3" data-testid="exc-kpi-strip">
          {kpiCards.map(({ label, value, icon: Icon, color, filter, testId }) => (
            <Card
              key={label}
              className={`cursor-pointer transition-all ${
                statusFilter === filter ? "ring-2 ring-primary" : ""
              }`}
              onClick={() =>
                setStatusFilter((prev) => (prev === filter ? "all" : filter))
              }
            >
              <CardHeader className="pb-1 pt-4 px-4">
                <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  {label}
                </CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4 flex items-center gap-2">
                <Icon className={`h-5 w-5 flex-shrink-0 ${color}`} />
                <span className="text-2xl font-bold" data-testid={testId}>
                  {value}
                </span>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Tabs */}
        <Tabs defaultValue="exceptions">
          <TabsList className="flex flex-wrap h-auto gap-1">
            <TabsTrigger value="exceptions" className="flex items-center gap-1.5" data-testid="exc-tab-exceptions">
              <FileWarning className="h-3.5 w-3.5" /> Exception Queue
            </TabsTrigger>
            <TabsTrigger value="controls" className="flex items-center gap-1.5" data-testid="exc-tab-controls">
              <SlidersHorizontal className="h-3.5 w-3.5" /> Financial Controls
            </TabsTrigger>
          </TabsList>

          {/* ── Exception Queue Tab ── */}
          <TabsContent value="exceptions">
            <div className="mt-4 space-y-4">
              {/* Filters */}
              <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
                <div className="relative w-full sm:w-72">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search job, client, exception ID…"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-9"
                    data-testid="exc-search"
                  />
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <select
                    className="h-9 rounded-md border bg-background px-3 text-sm"
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value as ExceptionStatus | "all")}
                    data-testid="exc-filter-status"
                  >
                    <option value="all">All Statuses</option>
                    <option value="open">Open</option>
                    <option value="under_investigation">Under Investigation</option>
                    <option value="awaiting_approval">Awaiting Approval</option>
                    <option value="resolved">Resolved</option>
                    <option value="rejected">Rejected</option>
                  </select>
                  <select
                    className="h-9 rounded-md border bg-background px-3 text-sm"
                    value={typeFilter}
                    onChange={(e) => setTypeFilter(e.target.value as ExceptionType | "all")}
                    data-testid="exc-filter-type"
                  >
                    <option value="all">All Types</option>
                    <option value="reconciliation_mismatch">Reconciliation Mismatch</option>
                    <option value="missing_accounting_record">Missing Accounting Record</option>
                    <option value="missing_ledger_record">Missing Ledger Record</option>
                    <option value="duplicate_record">Duplicate Record</option>
                    <option value="sync_failure">Sync Failure</option>
                    <option value="variance_threshold_breach">Variance Threshold Breach</option>
                  </select>
                  <select
                    className="h-9 rounded-md border bg-background px-3 text-sm"
                    value={assigneeFilter}
                    onChange={(e) => setAssigneeFilter(e.target.value)}
                    data-testid="exc-filter-assignee"
                  >
                    <option value="all">All Assignees</option>
                    {assigneeNames.map((name) => (
                      <option key={name} value={name}>
                        {name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Exception Table */}
              <div className="border rounded-md" data-testid="exc-queue-table">
                {filteredExceptions.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                    <CheckCircle2 className="h-10 w-10 mb-3 opacity-20" />
                    <p className="text-sm">No exceptions match the current filter.</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Exception ID</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Job / Client</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Assigned To</TableHead>
                        <TableHead>Created</TableHead>
                        <TableHead>Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredExceptions.map((exc) => (
                        <TableRow key={exc.id} data-testid={`exc-row-${exc.id}`}>
                          <TableCell className="font-mono text-xs font-semibold">
                            {exc.exceptionNumber}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant="outline"
                              className={`text-xs ${EXCEPTION_TYPE_COLORS[exc.type]}`}
                              data-testid={`exc-type-${exc.type}`}
                            >
                              {EXCEPTION_TYPE_LABELS[exc.type]}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="text-sm font-medium max-w-[160px] truncate">
                              {exc.jobName ?? exc.clientName ?? "—"}
                            </div>
                            {exc.jobName && exc.clientName && (
                              <div className="text-xs text-muted-foreground truncate">
                                {exc.clientName}
                              </div>
                            )}
                          </TableCell>
                          <TableCell>
                            <ExceptionStatusBadge status={exc.status} />
                          </TableCell>
                          <TableCell className="text-sm">
                            {exc.assignedTo ?? (
                              <span className="text-muted-foreground text-xs">Unassigned</span>
                            )}
                          </TableCell>
                          <TableCell>{fmtDateTime(exc.createdAt)}</TableCell>
                          <TableCell>
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-xs h-7"
                              onClick={() => {
                                setSelectedExc(exc);
                                setActionMode(null);
                              }}
                              data-testid={`exc-btn-view-${exc.id}`}
                            >
                              <Eye className="h-3 w-3 mr-1" /> View
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </div>
            </div>
          </TabsContent>

          {/* ── Financial Controls Tab ── */}
          <TabsContent value="controls">
            <div className="mt-4 space-y-6" data-testid="exc-controls-panel">
              {/* Control Dashboard KPIs */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3" data-testid="exc-controls-kpi-strip">
                <Card>
                  <CardHeader className="pb-1 pt-4 px-4">
                    <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      Pending Controls
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="px-4 pb-4 flex items-center gap-2">
                    <Clock className="h-5 w-5 flex-shrink-0 text-amber-600" />
                    <span className="text-2xl font-bold" data-testid="exc-ctl-kpi-pending">
                      {controlSummary.pending}
                    </span>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-1 pt-4 px-4">
                    <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      Approved Controls
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="px-4 pb-4 flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 flex-shrink-0 text-emerald-600" />
                    <span className="text-2xl font-bold" data-testid="exc-ctl-kpi-approved">
                      {controlSummary.approved}
                    </span>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-1 pt-4 px-4">
                    <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      Rejected Controls
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="px-4 pb-4 flex items-center gap-2">
                    <XCircle className="h-5 w-5 flex-shrink-0 text-red-600" />
                    <span className="text-2xl font-bold" data-testid="exc-ctl-kpi-rejected">
                      {controlSummary.rejected}
                    </span>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-1 pt-4 px-4">
                    <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      Total Financial Impact
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="px-4 pb-4">
                    <span className="text-xl font-bold text-emerald-600" data-testid="exc-ctl-kpi-impact">
                      {fmt(controlSummary.totalFinancialImpact)}
                    </span>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      Approved overrides
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Override Queue */}
              <div>
                <h3 className="text-base font-semibold mb-3">Override Queue</h3>
                <div className="border rounded-md" data-testid="exc-override-queue">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Control ID</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Requested By</TableHead>
                        <TableHead>Approval Status</TableHead>
                        <TableHead className="text-right">Financial Impact</TableHead>
                        <TableHead>Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {controls.map((ctl) => (
                        <TableRow key={ctl.id} data-testid={`exc-ctl-row-${ctl.id}`}>
                          <TableCell className="font-mono text-xs font-semibold">
                            {ctl.controlNumber}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant="outline"
                              className={`text-xs ${CONTROL_TYPE_COLORS[ctl.type]}`}
                            >
                              {CONTROL_TYPE_LABELS[ctl.type]}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm">{ctl.requestedBy}</TableCell>
                          <TableCell>
                            <Badge
                              variant="outline"
                              className={`text-xs ${CONTROL_STATE_COLORS[ctl.state]}`}
                              data-testid={`exc-ctl-state-${ctl.id}`}
                            >
                              {CONTROL_STATE_LABELS[ctl.state]}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right font-semibold">
                            {fmt(ctl.financialImpact)}
                          </TableCell>
                          <TableCell>
                            {ctl.state === "pending_approval" ? (
                              <div className="flex items-center gap-1">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="text-xs h-7 text-emerald-700 border-emerald-300"
                                  onClick={() => {
                                    setSelectedControl(ctl);
                                    setControlAction("approve");
                                  }}
                                  data-testid={`exc-ctl-btn-approve-${ctl.id}`}
                                >
                                  <CheckCheck className="h-3 w-3 mr-1" /> Approve
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="text-xs h-7 text-red-700 border-red-300"
                                  onClick={() => {
                                    setSelectedControl(ctl);
                                    setControlAction("reject");
                                  }}
                                  data-testid={`exc-ctl-btn-reject-${ctl.id}`}
                                >
                                  <X className="h-3 w-3 mr-1" /> Reject
                                </Button>
                              </div>
                            ) : (
                              <span className="text-xs text-muted-foreground">
                                {CONTROL_STATE_LABELS[ctl.state]}
                              </span>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* ── Exception Detail / Resolution Dialog ── */}
      {selectedExc && (
        <Dialog open={!!selectedExc} onOpenChange={(open) => !open && closeDialog()}>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <ShieldAlert className="h-4 w-4" />
                {selectedExc.exceptionNumber}
              </DialogTitle>
              <DialogDescription>
                {EXCEPTION_TYPE_LABELS[selectedExc.type]}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="rounded-md bg-muted/30 p-3 text-sm">
                {selectedExc.description}
              </div>

              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-muted-foreground text-xs">Status</span>
                  <div className="mt-1">
                    <ExceptionStatusBadge status={selectedExc.status} />
                  </div>
                </div>
                <div>
                  <span className="text-muted-foreground text-xs">Assigned To</span>
                  <div className="mt-1 font-medium">
                    {selectedExc.assignedTo ?? "Unassigned"}
                  </div>
                </div>
                {selectedExc.jobName && (
                  <div>
                    <span className="text-muted-foreground text-xs">Job</span>
                    <div className="mt-1 font-medium truncate">{selectedExc.jobName}</div>
                  </div>
                )}
                {selectedExc.financialImpact !== null && (
                  <div>
                    <span className="text-muted-foreground text-xs">Financial Impact</span>
                    <div className="mt-1 font-semibold text-amber-700">
                      {fmt(selectedExc.financialImpact)}
                    </div>
                  </div>
                )}
              </div>

              {selectedExc.resolutionNotes && (
                <div>
                  <span className="text-xs text-muted-foreground">Resolution Notes</span>
                  <p className="mt-1 text-sm rounded border p-2 bg-muted/20">
                    {selectedExc.resolutionNotes}
                  </p>
                </div>
              )}

              {/* Approval actions only for awaiting_approval or open exceptions */}
              {(selectedExc.status === "awaiting_approval" || selectedExc.status === "open" || selectedExc.status === "under_investigation") && (
                <>
                  {actionMode === null && (
                    <div className="flex gap-2 pt-2" data-testid="exc-dialog-actions">
                      <Button
                        size="sm"
                        className="bg-emerald-600 hover:bg-emerald-700"
                        onClick={() => setActionMode("resolve")}
                        data-testid="exc-dialog-btn-resolve"
                      >
                        <CheckCheck className="h-3.5 w-3.5 mr-1" /> Resolve
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => setActionMode("reject")}
                        data-testid="exc-dialog-btn-reject"
                      >
                        <X className="h-3.5 w-3.5 mr-1" /> Reject
                      </Button>
                    </div>
                  )}

                  {actionMode === "resolve" && (
                    <div className="space-y-3">
                      <div>
                        <label className="text-xs font-medium">Resolution Notes *</label>
                        <textarea
                          className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm resize-none h-20"
                          placeholder="Describe how this exception was resolved…"
                          value={resolveNotes}
                          onChange={(e) => setResolveNotes(e.target.value)}
                          data-testid="exc-resolve-notes"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-medium">Approval Notes</label>
                        <textarea
                          className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm resize-none h-16"
                          placeholder="CEO approval notes…"
                          value={approvalNotes}
                          onChange={(e) => setApprovalNotes(e.target.value)}
                          data-testid="exc-approval-notes"
                        />
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          className="bg-emerald-600 hover:bg-emerald-700"
                          onClick={handleResolve}
                          disabled={!resolveNotes.trim()}
                          data-testid="exc-btn-confirm-resolve"
                        >
                          Confirm Resolution
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => setActionMode(null)}>
                          Cancel
                        </Button>
                      </div>
                    </div>
                  )}

                  {actionMode === "reject" && (
                    <div className="space-y-3">
                      <div>
                        <label className="text-xs font-medium">Rejection Notes *</label>
                        <textarea
                          className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm resize-none h-20"
                          placeholder="Reason for rejection…"
                          value={approvalNotes}
                          onChange={(e) => setApprovalNotes(e.target.value)}
                          data-testid="exc-rejection-notes"
                        />
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={handleReject}
                          disabled={!approvalNotes.trim()}
                          data-testid="exc-btn-confirm-reject"
                        >
                          Confirm Rejection
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => setActionMode(null)}>
                          Cancel
                        </Button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* ── Control Approval Dialog ── */}
      {selectedControl && (
        <Dialog open={!!selectedControl} onOpenChange={(open) => !open && closeControlDialog()}>
          <DialogContent className="sm:max-w-[540px]">
            <DialogHeader>
              <DialogTitle>{selectedControl.controlNumber}</DialogTitle>
              <DialogDescription>
                {CONTROL_TYPE_LABELS[selectedControl.type]}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="rounded-md bg-muted/30 p-3 text-sm">
                {selectedControl.description}
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-muted-foreground text-xs">Requested By</span>
                  <div className="mt-1 font-medium">{selectedControl.requestedBy}</div>
                </div>
                <div>
                  <span className="text-muted-foreground text-xs">Financial Impact</span>
                  <div className="mt-1 font-semibold text-amber-700">
                    {fmt(selectedControl.financialImpact)}
                  </div>
                </div>
              </div>
              <div>
                <span className="text-xs text-muted-foreground">Business Justification</span>
                <p className="mt-1 text-sm rounded border p-2 bg-muted/20">{selectedControl.reason}</p>
              </div>
              <div>
                <label className="text-xs font-medium">
                  {controlAction === "approve" ? "Approval Notes" : "Rejection Notes"} *
                </label>
                <textarea
                  className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm resize-none h-20"
                  placeholder={controlAction === "approve" ? "CEO approval notes…" : "Reason for rejection…"}
                  value={controlNotes}
                  onChange={(e) => setControlNotes(e.target.value)}
                  data-testid="exc-ctl-notes"
                />
              </div>
              <div className="flex gap-2">
                {controlAction === "approve" ? (
                  <Button
                    size="sm"
                    className="bg-emerald-600 hover:bg-emerald-700"
                    onClick={handleControlApprove}
                    disabled={!controlNotes.trim()}
                    data-testid="exc-ctl-btn-confirm-approve"
                  >
                    <CheckCheck className="h-3.5 w-3.5 mr-1" /> Confirm Approval
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={handleControlReject}
                    disabled={!controlNotes.trim()}
                    data-testid="exc-ctl-btn-confirm-reject"
                  >
                    <X className="h-3.5 w-3.5 mr-1" /> Confirm Rejection
                  </Button>
                )}
                <Button size="sm" variant="outline" onClick={closeControlDialog}>
                  Cancel
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}

export default function ExceptionResolutionCenterPage() {
  return <Layout><ExceptionResolutionContent /></Layout>;
}
