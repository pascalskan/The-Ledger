/**
 * PHASE 5.8 — JOB RECONCILIATION PANEL
 *
 * Displays reconciliation status for a single job
 * on the Job Detail page.
 *
 * Shows:
 *   - Reconciliation status for job-related entities
 *   - Provider for each record
 *   - Ledger reference vs accounting reference
 *   - Mismatch visibility
 *   - Review requirement flag
 *
 * Doctrine:
 *   Reconciliation never modifies financial records.
 *   Job reconciliation panel is read-only.
 *   All mismatches are visible and traceable.
 */

import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { GitMerge, AlertTriangle, CheckCircle2 } from "lucide-react";
import {
  type ReconciliationRecord,
  RECONCILIATION_STATUS_LABELS,
  RECONCILIATION_STATUS_COLORS,
  SEED_RECONCILIATION_RECORDS,
  computeReconciliationSummary,
} from "@/lib/reconciliationEngine";
import { ENTITY_TYPE_LABELS, getProviderMeta } from "@/lib/accountingProviders";

interface JobReconciliationPanelProps {
  jobId: string;
}

export function JobReconciliationPanel({ jobId }: JobReconciliationPanelProps) {
  const records: ReconciliationRecord[] = useMemo(
    () => SEED_RECONCILIATION_RECORDS.filter((r) => r.jobId === jobId),
    [jobId]
  );

  const summary = useMemo(() => computeReconciliationSummary(records), [records]);

  const hasExceptions = summary.unmatched + summary.requiresReview + summary.missingInLedger + summary.missingInAccounting > 0;

  const OverallIcon = () => {
    if (summary.total === 0) return <GitMerge className="h-4 w-4 text-muted-foreground" />;
    if (hasExceptions) return <AlertTriangle className="h-4 w-4 text-amber-500" />;
    return <CheckCircle2 className="h-4 w-4 text-emerald-600" />;
  };

  const overallLabel = () => {
    if (summary.total === 0) return "No Data";
    if (summary.matched === summary.total) return "Fully Reconciled";
    if (summary.requiresReview > 0) return "Requires Review";
    if (summary.unmatched > 0) return "Unmatched Records";
    return "Partial";
  };

  const overallColor = () => {
    if (summary.total === 0) return "text-muted-foreground border-muted bg-muted/10";
    if (!hasExceptions) return "text-emerald-600 border-emerald-200 bg-emerald-50";
    if (summary.requiresReview > 0) return "text-blue-600 border-blue-200 bg-blue-50";
    return "text-amber-600 border-amber-200 bg-amber-50";
  };

  return (
    <Card data-testid={`job-recon-panel-${jobId}`}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <OverallIcon />
            <CardTitle className="text-base">Reconciliation Status</CardTitle>
          </div>
          <Badge
            variant="outline"
            className={overallColor()}
            data-testid={`job-recon-overall-status-${jobId}`}
          >
            {overallLabel()}
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          Reconciliation of Ledger records against downstream accounting systems for this job.
        </p>
      </CardHeader>
      <CardContent className="space-y-3 pt-0">
        {/* Summary mini KPIs */}
        {summary.total > 0 && (
          <div
            className="grid grid-cols-3 gap-2"
            data-testid={`job-recon-summary-${jobId}`}
          >
            <div className="text-center p-2 rounded border bg-muted/20">
              <div className="text-lg font-bold text-emerald-600">{summary.matched}</div>
              <div className="text-xs text-muted-foreground">Matched</div>
            </div>
            <div className="text-center p-2 rounded border bg-muted/20">
              <div className="text-lg font-bold text-amber-600">
                {summary.unmatched + summary.requiresReview}
              </div>
              <div className="text-xs text-muted-foreground">Issues</div>
            </div>
            <div className="text-center p-2 rounded border bg-muted/20">
              <div className="text-lg font-bold text-muted-foreground">
                {summary.missingInLedger + summary.missingInAccounting}
              </div>
              <div className="text-xs text-muted-foreground">Missing</div>
            </div>
          </div>
        )}

        {records.length === 0 ? (
          <div className="py-4 text-center text-sm text-muted-foreground">
            No reconciliation records for this job yet.
          </div>
        ) : (
          <div className="border rounded-md">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Provider</TableHead>
                  <TableHead className="text-xs">Entity</TableHead>
                  <TableHead className="text-xs">Status</TableHead>
                  <TableHead className="text-xs">Accounting Ref</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {records.map((record) => {
                  const meta = getProviderMeta(record.provider);
                  return (
                    <TableRow
                      key={record.id}
                      data-testid={`job-recon-record-${record.id}`}
                    >
                      <TableCell>
                        <span
                          className={`inline-flex items-center gap-1 text-xs font-semibold px-1.5 py-0.5 rounded border ${meta.bgColor} ${meta.borderColor} ${meta.color}`}
                        >
                          {meta.logoInitials}
                        </span>
                      </TableCell>
                      <TableCell className="text-xs">
                        {ENTITY_TYPE_LABELS[record.entityType]}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={`text-xs ${RECONCILIATION_STATUS_COLORS[record.status]}`}
                          data-testid={`job-recon-status-${record.id}`}
                        >
                          {RECONCILIATION_STATUS_LABELS[record.status]}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {record.accountingReference ? (
                          <span
                            className="font-mono text-xs"
                            data-testid={`job-recon-ext-ref-${record.id}`}
                          >
                            {record.accountingReference}
                          </span>
                        ) : (
                          <span className="text-muted-foreground text-xs">—</span>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}

        {/* Mismatch visibility */}
        {hasExceptions && (
          <div
            className="flex items-start gap-2 text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded p-3"
            data-testid={`job-recon-exceptions-${jobId}`}
          >
            <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
            <div>
              <span className="font-semibold">Action Required: </span>
              {summary.requiresReview > 0 && (
                <span>{summary.requiresReview} record(s) require manual review. </span>
              )}
              {summary.unmatched > 0 && (
                <span>{summary.unmatched} unmatched record(s) detected. </span>
              )}
              {summary.missingInAccounting > 0 && (
                <span>{summary.missingInAccounting} record(s) missing in accounting system. </span>
              )}
              Visit the Reconciliation Centre for details.
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
