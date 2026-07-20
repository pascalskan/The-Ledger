/**
 * PHASE 5.6 — JOB SYNC PANEL
 *
 * Displays accounting synchronization status for a single job
 * on the Job Detail page.
 *
 * Shows:
 *   - Sync status for job-related entities (invoices, payroll, customer, job)
 *   - Provider for each record
 *   - External reference (accounting system ID)
 *   - Last sync time
 *   - Sync history (per job)
 *   - Mock sync trigger action
 *
 * Doctrine:
 *   Sync records are read from the sync engine.
 *   Job sync panel never creates financial records.
 *   All sync actions are auditable.
 */

import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  RefreshCw,
  CheckCircle2,
  XCircle,
  Clock,
  ExternalLink,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import {
  type SyncRecord,
  type SyncAuditEntry,
  SYNC_STATUS_LABELS,
  SYNC_STATUS_COLORS,
  SEED_SYNC_RECORDS,
  SEED_SYNC_AUDIT,
  simulateMockSync,
  advanceSyncRecord,
} from "@/lib/accountingSyncEngine";
import { PROVIDER_LABELS, ENTITY_TYPE_LABELS, getProviderMeta } from "@/lib/accountingProviders";

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

interface JobSyncPanelProps {
  jobId: string;
}

export function JobSyncPanel({ jobId }: JobSyncPanelProps) {
  const [records, setRecords] = useState<SyncRecord[]>(
    SEED_SYNC_RECORDS.filter((r) => r.jobId === jobId)
  );
  const [auditEntries, setAuditEntries] = useState<SyncAuditEntry[]>(
    SEED_SYNC_AUDIT.filter((a) => a.jobId === jobId)
  );
  const [syncingIds, setSyncingIds] = useState<Set<string>>(new Set());
  const [historyOpen, setHistoryOpen] = useState(false);

  const overallStatus = useMemo(() => {
    if (records.some((r) => r.status === "failed")) return "failed";
    if (records.some((r) => r.status === "retry_required")) return "retry_required";
    if (records.some((r) => r.status === "syncing")) return "syncing";
    if (records.some((r) => r.status === "pending")) return "pending";
    if (records.length > 0 && records.every((r) => r.status === "synced")) return "synced";
    return "pending";
  }, [records]);

  const handleSync = (record: SyncRecord) => {
    if (record.status === "syncing") return;
    setSyncingIds((s) => new Set(s).add(record.id));
    const succeed = record.entityType !== "payroll";

    setRecords((prev) =>
      prev.map((r) =>
        r.id === record.id
          ? { ...r, status: "syncing", lastAttemptAt: new Date().toISOString() }
          : r
      )
    );

    setTimeout(() => {
      const steps = simulateMockSync(record, succeed);
      const finalStep = steps[steps.length - 1];
      if (finalStep) {
        setRecords((prev) =>
          prev.map((r) => (r.id === record.id ? finalStep.updated : r))
        );
        setAuditEntries((prev) => [...prev, ...steps.map((s) => s.auditEntry)]);
      }
      setSyncingIds((s) => {
        const next = new Set(s);
        next.delete(record.id);
        return next;
      });
    }, 1500);
  };

  const handleRetry = (record: SyncRecord) => {
    const step = advanceSyncRecord(record, "retry_required");
    if (!step) return;
    setRecords((prev) =>
      prev.map((r) => (r.id === record.id ? step.updated : r))
    );
    setAuditEntries((prev) => [...prev, step.auditEntry]);
    setTimeout(() => handleSync(step.updated), 200);
  };

  const OverallStatusIcon = () => {
    switch (overallStatus) {
      case "synced":
        return <CheckCircle2 className="h-4 w-4 text-emerald-600" />;
      case "failed":
        return <XCircle className="h-4 w-4 text-red-600" />;
      case "syncing":
        return (
          <RefreshCw className="h-4 w-4 text-blue-600 animate-spin" />
        );
      default:
        return <Clock className="h-4 w-4 text-muted-foreground" />;
    }
  };

  return (
    <Card data-testid={`job-sync-panel-${jobId}`}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <OverallStatusIcon />
            <CardTitle className="text-base">Accounting Synchronization</CardTitle>
          </div>
          <Badge
            variant="outline"
            className={SYNC_STATUS_COLORS[overallStatus]}
            data-testid={`job-sync-overall-status-${jobId}`}
          >
            {SYNC_STATUS_LABELS[overallStatus]}
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          Sync records for this job exported to downstream accounting systems.
        </p>
      </CardHeader>
      <CardContent className="space-y-3 pt-0">
        {records.length === 0 ? (
          <div className="py-4 text-center text-sm text-muted-foreground">
            No sync records for this job yet.
          </div>
        ) : (
          <div className="border rounded-md">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Provider</TableHead>
                  <TableHead className="text-xs">Entity</TableHead>
                  <TableHead className="text-xs">Status</TableHead>
                  <TableHead className="text-xs">External Ref</TableHead>
                  <TableHead className="text-xs">Last Sync</TableHead>
                  <TableHead className="text-xs">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {records.map((record) => {
                  const meta = getProviderMeta(record.provider);
                  return (
                    <TableRow
                      key={record.id}
                      data-testid={`job-sync-record-${record.id}`}
                    >
                      <TableCell>
                        <span
                          className={`inline-flex items-center gap-1 text-xs font-semibold px-1.5 py-0.5 rounded border ${meta.bgColor} ${meta.borderColor} ${meta.color}`}
                          data-testid={`job-sync-provider-${record.id}`}
                        >
                          {meta.logoInitials}
                        </span>
                        <span className="ml-1 text-xs text-muted-foreground">
                          {PROVIDER_LABELS[record.provider]}
                        </span>
                      </TableCell>
                      <TableCell className="text-xs">
                        {ENTITY_TYPE_LABELS[record.entityType]}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={`text-xs ${SYNC_STATUS_COLORS[record.status]}`}
                          data-testid={`job-sync-status-${record.id}`}
                        >
                          {SYNC_STATUS_LABELS[record.status]}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {record.externalId ? (
                          <span
                            className="font-mono text-xs flex items-center gap-1"
                            data-testid={`job-sync-ext-ref-${record.id}`}
                          >
                            <ExternalLink className="h-3 w-3 text-muted-foreground" />
                            {record.externalId}
                          </span>
                        ) : (
                          <span className="text-muted-foreground text-xs">—</span>
                        )}
                      </TableCell>
                      <TableCell>{fmtDateTime(record.syncedAt ?? record.lastAttemptAt)}</TableCell>
                      <TableCell>
                        {(record.status === "pending" || record.status === "retry_required") && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-xs h-6"
                            onClick={() => handleSync(record)}
                            disabled={syncingIds.has(record.id)}
                            data-testid={`job-sync-btn-${record.id}`}
                          >
                            <RefreshCw className="h-3 w-3 mr-1" />
                            Sync
                          </Button>
                        )}
                        {record.status === "failed" && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-xs h-6 text-amber-700"
                            onClick={() => handleRetry(record)}
                            data-testid={`job-sync-retry-btn-${record.id}`}
                          >
                            <RefreshCw className="h-3 w-3 mr-1" />
                            Retry
                          </Button>
                        )}
                        {record.status === "syncing" && (
                          <span className="text-xs text-blue-600 animate-pulse">
                            Syncing…
                          </span>
                        )}
                        {record.status === "synced" && (
                          <span className="text-xs text-emerald-600">✓</span>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}

        {/* Sync History */}
        <div>
          <button
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
            onClick={() => setHistoryOpen((o) => !o)}
            data-testid={`job-sync-history-toggle-${jobId}`}
          >
            {historyOpen ? (
              <ChevronUp className="h-3 w-3" />
            ) : (
              <ChevronDown className="h-3 w-3" />
            )}
            Sync History ({auditEntries.length} entries)
          </button>

          {historyOpen && auditEntries.length > 0 && (
            <div
              className="mt-2 border rounded-md"
              data-testid={`job-sync-history-${jobId}`}
            >
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Time</TableHead>
                    <TableHead className="text-xs">Event</TableHead>
                    <TableHead className="text-xs">External ID</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {[...auditEntries].reverse().map((entry) => (
                    <TableRow key={entry.id}>
                      <TableCell>{fmtDateTime(entry.timestamp)}</TableCell>
                      <TableCell className="text-xs max-w-[240px] truncate">
                        {entry.message}
                      </TableCell>
                      <TableCell>
                        {entry.externalId ? (
                          <span className="font-mono text-xs">
                            {entry.externalId}
                          </span>
                        ) : (
                          <span className="text-muted-foreground text-xs">—</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
