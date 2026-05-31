/**
 * PHASE 5.9 — JOB EXCEPTION PANEL
 *
 * Displays exception resolution status for a single job
 * on the Job Detail page.
 *
 * Shows:
 *   - Open exceptions count
 *   - Control requests for this job
 *   - Approval status
 *   - Resolution history
 *
 * Doctrine:
 *   All exceptions are traceable to their source job.
 *   Panel is informational — full management in Exception Resolution Centre.
 */

import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertTriangle,
  CheckCircle2,
  ShieldAlert,
  SlidersHorizontal,
  ExternalLink,
} from "lucide-react";
import {
  SEED_EXCEPTIONS,
  EXCEPTION_STATUS_LABELS,
  EXCEPTION_STATUS_COLORS,
  EXCEPTION_TYPE_LABELS,
  computeExceptionSummary,
} from "@/lib/exceptionResolutionEngine";
import {
  SEED_FINANCIAL_CONTROLS,
  CONTROL_TYPE_LABELS,
  CONTROL_STATE_LABELS,
  CONTROL_STATE_COLORS,
  computeControlSummary,
} from "@/lib/financialControlsEngine";

interface JobExceptionPanelProps {
  jobId: string;
}

export function JobExceptionPanel({ jobId }: JobExceptionPanelProps) {
  const [, setLocation] = useLocation();

  const jobExceptions = useMemo(
    () => SEED_EXCEPTIONS.filter((e) => e.jobId === jobId),
    [jobId]
  );

  const jobControls = useMemo(
    () => SEED_FINANCIAL_CONTROLS.filter((c) => c.jobId === jobId),
    [jobId]
  );

  const summary = useMemo(() => computeExceptionSummary(jobExceptions), [jobExceptions]);
  const controlSummary = useMemo(() => computeControlSummary(jobControls), [jobControls]);

  const hasOpenExceptions = summary.open + summary.underInvestigation + summary.awaitingApproval > 0;

  const OverallIcon = () => {
    if (jobExceptions.length === 0) return <ShieldAlert className="h-4 w-4 text-muted-foreground" />;
    if (hasOpenExceptions) return <AlertTriangle className="h-4 w-4 text-amber-500" />;
    return <CheckCircle2 className="h-4 w-4 text-emerald-600" />;
  };

  const overallLabel = () => {
    if (jobExceptions.length === 0) return "No Exceptions";
    if (summary.open > 0) return `${summary.open} Open`;
    if (summary.underInvestigation > 0) return "Under Investigation";
    if (summary.awaitingApproval > 0) return "Awaiting Approval";
    return "All Resolved";
  };

  const overallColor = () => {
    if (jobExceptions.length === 0) return "text-muted-foreground border-muted bg-muted/10";
    if (summary.open > 0) return "text-red-600 border-red-200 bg-red-50";
    if (hasOpenExceptions) return "text-amber-600 border-amber-200 bg-amber-50";
    return "text-emerald-600 border-emerald-200 bg-emerald-50";
  };

  return (
    <Card data-testid={`job-exception-panel-${jobId}`}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <OverallIcon />
            <CardTitle className="text-base">Exceptions &amp; Controls</CardTitle>
          </div>
          <div className="flex items-center gap-2">
            <Badge
              variant="outline"
              className={overallColor()}
              data-testid={`job-exception-overall-${jobId}`}
            >
              {overallLabel()}
            </Badge>
            <Button
              size="sm"
              variant="ghost"
              className="h-7 text-xs"
              onClick={() => setLocation("/exception-resolution-center")}
              data-testid={`job-exception-link-${jobId}`}
            >
              <ExternalLink className="h-3 w-3 mr-1" /> Resolution Centre
            </Button>
          </div>
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          Active financial exceptions and control requests for this job.
        </p>
      </CardHeader>
      <CardContent className="space-y-4 pt-0">
        {/* Mini KPIs */}
        {jobExceptions.length > 0 && (
          <div
            className="grid grid-cols-4 gap-2"
            data-testid={`job-exception-kpis-${jobId}`}
          >
            <div className="text-center p-2 rounded border bg-muted/20">
              <div className="text-lg font-bold text-red-600">{summary.open}</div>
              <div className="text-xs text-muted-foreground">Open</div>
            </div>
            <div className="text-center p-2 rounded border bg-muted/20">
              <div className="text-lg font-bold text-blue-600">{summary.underInvestigation}</div>
              <div className="text-xs text-muted-foreground">Investigating</div>
            </div>
            <div className="text-center p-2 rounded border bg-muted/20">
              <div className="text-lg font-bold text-amber-600">{summary.awaitingApproval}</div>
              <div className="text-xs text-muted-foreground">Pending</div>
            </div>
            <div className="text-center p-2 rounded border bg-muted/20">
              <div className="text-lg font-bold text-emerald-600">{summary.resolved}</div>
              <div className="text-xs text-muted-foreground">Resolved</div>
            </div>
          </div>
        )}

        {/* Exceptions table */}
        {jobExceptions.length === 0 ? (
          <div className="py-4 text-center text-sm text-muted-foreground">
            No exceptions for this job.
          </div>
        ) : (
          <div>
            <div className="flex items-center gap-1.5 mb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              <AlertTriangle className="h-3 w-3" /> Exceptions
            </div>
            <div className="border rounded-md">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">ID</TableHead>
                    <TableHead className="text-xs">Type</TableHead>
                    <TableHead className="text-xs">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {jobExceptions.map((exc) => (
                    <TableRow key={exc.id} data-testid={`job-exc-record-${exc.id}`}>
                      <TableCell className="font-mono text-xs">{exc.exceptionNumber}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {EXCEPTION_TYPE_LABELS[exc.type]}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={`text-xs ${EXCEPTION_STATUS_COLORS[exc.status]}`}
                        >
                          {EXCEPTION_STATUS_LABELS[exc.status]}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )}

        {/* Controls table */}
        {jobControls.length > 0 && (
          <div>
            <div className="flex items-center gap-1.5 mb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              <SlidersHorizontal className="h-3 w-3" /> Control Requests
            </div>
            <div className="border rounded-md" data-testid={`job-controls-table-${jobId}`}>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Control</TableHead>
                    <TableHead className="text-xs">Type</TableHead>
                    <TableHead className="text-xs">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {jobControls.map((ctl) => (
                    <TableRow key={ctl.id} data-testid={`job-ctl-record-${ctl.id}`}>
                      <TableCell className="font-mono text-xs">{ctl.controlNumber}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {CONTROL_TYPE_LABELS[ctl.type]}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={`text-xs ${CONTROL_STATE_COLORS[ctl.state]}`}
                        >
                          {CONTROL_STATE_LABELS[ctl.state]}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )}

        {/* Summary of controls pending */}
        {controlSummary.pending > 0 && (
          <div
            className="flex items-start gap-2 text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded p-3"
            data-testid={`job-exception-controls-warning-${jobId}`}
          >
            <SlidersHorizontal className="h-4 w-4 mt-0.5 flex-shrink-0" />
            <span>
              <span className="font-semibold">{controlSummary.pending}</span> control
              {controlSummary.pending !== 1 ? "s" : ""} pending CEO approval.
              Visit the Financial Controls Centre to approve or reject.
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
