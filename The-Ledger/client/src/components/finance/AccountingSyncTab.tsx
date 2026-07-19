/**
 * PHASE 5.6 — ACCOUNTING SYNC TAB
 *
 * Financial Explorer tab: Accounting Sync Centre.
 *
 * Displays:
 *   - Sync KPI strip (Pending, Synced, Failed, Retry Required)
 *   - Sync Queue table with provider, entity type, job, status,
 *     last attempt, external ID columns
 *   - Search, filter, sort
 *   - Error resolution workflow for failed records
 *   - Mock sync action (Sync → Pending → Syncing → Synced | Failed)
 *   - Audit trail panel
 *
 * Doctrine:
 *   Sync never creates financial records.
 *   Only approved financial truth is exported.
 *   All actions are auditable.
 */

import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Clock,
  CheckCircle2,
  XCircle,
  RefreshCw,
  AlertTriangle,
  Search,
  ExternalLink,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import {
  type SyncRecord,
  type SyncAuditEntry,
  type SyncStatus,
  SYNC_STATUS_LABELS,
  SYNC_STATUS_COLORS,
  SEED_SYNC_RECORDS,
  SEED_SYNC_AUDIT,
  computeSyncKPIs,
  simulateMockSync,
  advanceSyncRecord,
  SYNC_ERROR_LABELS,
  SYNC_ERROR_RESOLUTIONS,
} from "@/lib/accountingSyncEngine";
import {
  PROVIDER_LABELS,
  ENTITY_TYPE_LABELS,
  getProviderMeta,
} from "@/lib/accountingProviders";

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

function ProviderBadge({ provider }: { provider: SyncRecord["provider"] }) {
  const meta = getProviderMeta(provider);
  return (
    <span
      className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2 py-0.5 rounded border ${
        meta.bgColor
      } ${meta.borderColor} ${meta.color}`}
      data-testid={`provider-badge-${provider}`}
    >
      <span className="font-bold">{meta.logoInitials}</span>
      {meta.name}
    </span>
  );
}

function StatusBadge({ status }: { status: SyncStatus }) {
  return (
    <Badge
      variant="outline"
      className={SYNC_STATUS_COLORS[status]}
      data-testid={`sync-status-badge-${status}`}
    >
      {SYNC_STATUS_LABELS[status]}
    </Badge>
  );
}

type SortField = "provider" | "entityType" | "job" | "status" | "lastAttemptAt";

export function AccountingSyncTab() {
  // State: sync records (seeded)
  const [records, setRecords] = useState<SyncRecord[]>(SEED_SYNC_RECORDS);
  // State: audit trail
  const [auditEntries, setAuditEntries] =
    useState<SyncAuditEntry[]>(SEED_SYNC_AUDIT);
  // State: search
  const [search, setSearch] = useState("");
  // State: status filter
  const [statusFilter, setStatusFilter] = useState<SyncStatus | "all">("all");
  // State: sort
  const [sortField, setSortField] = useState<SortField>("lastAttemptAt");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  // State: expanded error row
  const [expandedError, setExpandedError] = useState<string | null>(null);
  // State: audit panel open
  const [auditOpen, setAuditOpen] = useState(false);
  // State: syncing in progress (record ids)
  const [syncingIds, setSyncingIds] = useState<Set<string>>(new Set());

  // KPIs
  const kpis = useMemo(() => computeSyncKPIs(records), [records]);

  // Filtered + sorted records
  const filtered = useMemo(() => {
    let result = records;

    if (statusFilter !== "all") {
      result = result.filter((r) => r.status === statusFilter);
    }

    if (search.trim()) {
      const q = search.trim().toLowerCase();
      result = result.filter(
        (r) =>
          r.jobTitle.toLowerCase().includes(q) ||
          PROVIDER_LABELS[r.provider].toLowerCase().includes(q) ||
          ENTITY_TYPE_LABELS[r.entityType].toLowerCase().includes(q) ||
          (r.externalId?.toLowerCase().includes(q) ?? false) ||
          SYNC_STATUS_LABELS[r.status].toLowerCase().includes(q)
      );
    }

    return [...result].sort((a, b) => {
      let av: string = "";
      let bv: string = "";
      switch (sortField) {
        case "provider":
          av = a.provider;
          bv = b.provider;
          break;
        case "entityType":
          av = a.entityType;
          bv = b.entityType;
          break;
        case "job":
          av = a.jobTitle;
          bv = b.jobTitle;
          break;
        case "status":
          av = a.status;
          bv = b.status;
          break;
        case "lastAttemptAt":
          av = a.lastAttemptAt ?? "";
          bv = b.lastAttemptAt ?? "";
          break;
      }
      if (av < bv) return sortDir === "asc" ? -1 : 1;
      if (av > bv) return sortDir === "asc" ? 1 : -1;
      return 0;
    });
  }, [records, search, statusFilter, sortField, sortDir]);

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDir("asc");
    }
  }

  // Mock sync action: simulate the Pending → Syncing → Synced/Failed workflow
  const handleSync = (record: SyncRecord) => {
    if (record.status === "syncing") return;
    setSyncingIds((s) => new Set(s).add(record.id));

    // Decide outcome: 80% success, 20% failure (deterministic for demo)
    const succeed = !record.errorType || record.entityType !== "payroll";

    // Step 1: set to syncing immediately
    setRecords((prev) =>
      prev.map((r) =>
        r.id === record.id ? { ...r, status: "syncing", lastAttemptAt: new Date().toISOString() } : r
      )
    );

    // Step 2: resolve after 1.5s
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

  // Retry: move failed → retry_required, then re-trigger sync
  const handleRetry = (record: SyncRecord) => {
    const step = advanceSyncRecord(record, "retry_required");
    if (!step) return;
    setRecords((prev) =>
      prev.map((r) => (r.id === record.id ? step.updated : r))
    );
    setAuditEntries((prev) => [...prev, step.auditEntry]);
    // Then immediately attempt sync
    setTimeout(() => handleSync(step.updated), 200);
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field)
      return <ChevronDown className="h-3 w-3 opacity-30" />;
    return sortDir === "asc" ? (
      <ChevronUp className="h-3 w-3" />
    ) : (
      <ChevronDown className="h-3 w-3" />
    );
  };

  const kpiCards = [
    {
      label: "Pending Sync",
      value: kpis.pending,
      icon: Clock,
      color: "text-muted-foreground",
      testId: "kpi-sync-pending",
      filter: "pending" as SyncStatus,
    },
    {
      label: "Synced",
      value: kpis.synced,
      icon: CheckCircle2,
      color: "text-emerald-600",
      testId: "kpi-sync-synced",
      filter: "synced" as SyncStatus,
    },
    {
      label: "Failed",
      value: kpis.failed,
      icon: XCircle,
      color: "text-red-600",
      testId: "kpi-sync-failed",
      filter: "failed" as SyncStatus,
    },
    {
      label: "Retry Required",
      value: kpis.retryRequired,
      icon: RefreshCw,
      color: "text-amber-600",
      testId: "kpi-sync-retry",
      filter: "retry_required" as SyncStatus,
    },
  ];

  return (
    <div className="mt-4 space-y-6" data-testid="accounting-sync-tab-panel">
      {/* Doctrine notice */}
      <div className="rounded-md bg-blue-50 border border-blue-200 px-4 py-3 text-sm text-blue-700">
        <span className="font-semibold">Sync Doctrine: </span>
        Synchronization exports approved financial truth to downstream accounting
        systems. The Ledger remains the source of operational truth. Sync never
        creates or modifies financial records.
      </div>

      {/* KPI Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {kpiCards.map(({ label, value, icon: Icon, color, testId, filter }) => (
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
              <span
                className="text-2xl font-bold"
                data-testid={testId}
              >
                {value}
              </span>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search provider, job, status…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
            data-testid="sync-queue-search"
          />
        </div>
        <div className="flex items-center gap-2">
          {statusFilter !== "all" && (
            <Badge
              variant="outline"
              className="cursor-pointer"
              onClick={() => setStatusFilter("all")}
            >
              {SYNC_STATUS_LABELS[statusFilter]} ×
            </Badge>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setAuditOpen((o) => !o)}
            data-testid="btn-toggle-sync-audit"
          >
            Sync Audit Trail ({auditEntries.length})
          </Button>
        </div>
      </div>

      {/* Sync Queue Table */}
      <div className="border rounded-md" data-testid="sync-queue-table">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <RefreshCw className="h-10 w-10 mb-3 opacity-20" />
            <p className="text-sm">No sync records match the current filter.</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>
                  <button
                    className="flex items-center gap-1 hover:text-foreground"
                    onClick={() => toggleSort("provider")}
                    data-testid="sort-provider"
                  >
                    Provider <SortIcon field="provider" />
                  </button>
                </TableHead>
                <TableHead>
                  <button
                    className="flex items-center gap-1 hover:text-foreground"
                    onClick={() => toggleSort("entityType")}
                    data-testid="sort-entity-type"
                  >
                    Entity Type <SortIcon field="entityType" />
                  </button>
                </TableHead>
                <TableHead>
                  <button
                    className="flex items-center gap-1 hover:text-foreground"
                    onClick={() => toggleSort("job")}
                  >
                    Job <SortIcon field="job" />
                  </button>
                </TableHead>
                <TableHead>
                  <button
                    className="flex items-center gap-1 hover:text-foreground"
                    onClick={() => toggleSort("status")}
                    data-testid="sort-status"
                  >
                    Status <SortIcon field="status" />
                  </button>
                </TableHead>
                <TableHead>
                  <button
                    className="flex items-center gap-1 hover:text-foreground"
                    onClick={() => toggleSort("lastAttemptAt")}
                  >
                    Last Attempt <SortIcon field="lastAttemptAt" />
                  </button>
                </TableHead>
                <TableHead>External ID</TableHead>
                <TableHead>Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((record) => (
                <>
                  <TableRow
                    key={record.id}
                    data-testid={`sync-row-${record.id}`}
                  >
                    <TableCell>
                      <ProviderBadge provider={record.provider} />
                    </TableCell>
                    <TableCell className="text-sm">
                      {ENTITY_TYPE_LABELS[record.entityType]}
                    </TableCell>
                    <TableCell className="text-sm max-w-[160px] truncate">
                      {record.jobTitle}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={record.status} />
                    </TableCell>
                    <TableCell>{fmtDateTime(record.lastAttemptAt)}</TableCell>
                    <TableCell>
                      {record.externalId ? (
                        <span
                          className="font-mono text-xs flex items-center gap-1"
                          data-testid={`external-id-${record.id}`}
                        >
                          <ExternalLink className="h-3 w-3 text-muted-foreground" />
                          {record.externalId}
                        </span>
                      ) : (
                        <span className="text-muted-foreground text-xs">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        {(record.status === "pending" || record.status === "retry_required") && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-xs h-7"
                            onClick={() => handleSync(record)}
                            disabled={syncingIds.has(record.id)}
                            data-testid={`btn-sync-${record.id}`}
                          >
                            <RefreshCw className="h-3 w-3 mr-1" />
                            Sync
                          </Button>
                        )}
                        {record.status === "failed" && (
                          <>
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-xs h-7 text-amber-700 border-amber-300"
                              onClick={() => handleRetry(record)}
                              data-testid={`btn-retry-${record.id}`}
                            >
                              <RefreshCw className="h-3 w-3 mr-1" />
                              Retry
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-xs h-7"
                              onClick={() =>
                                setExpandedError((e) =>
                                  e === record.id ? null : record.id
                                )
                              }
                              data-testid={`btn-error-details-${record.id}`}
                            >
                              <AlertTriangle className="h-3 w-3 mr-1 text-red-500" />
                              Details
                            </Button>
                          </>
                        )}
                        {record.status === "syncing" && (
                          <span className="text-xs text-blue-600 animate-pulse">
                            Syncing…
                          </span>
                        )}
                        {record.status === "synced" && (
                          <span className="text-xs text-emerald-600">✓ Synced</span>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>

                  {/* Error Resolution Panel (inline) */}
                  {expandedError === record.id && record.errorType && (
                    <TableRow key={`${record.id}-error`}>
                      <TableCell colSpan={7} className="bg-red-50 border-t-0">
                        <div
                          className="p-3 space-y-2"
                          data-testid={`error-panel-${record.id}`}
                        >
                          <div className="flex items-center gap-2">
                            <XCircle className="h-4 w-4 text-red-600" />
                            <span className="font-semibold text-sm text-red-700">
                              {SYNC_ERROR_LABELS[record.errorType]}
                            </span>
                          </div>
                          <p className="text-sm text-red-700">
                            {record.errorMessage}
                          </p>
                          <div className="mt-2 flex items-start gap-2 text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded p-2">
                            <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                            <div>
                              <span className="font-semibold">Suggested Resolution: </span>
                              <span data-testid={`error-resolution-${record.id}`}>
                                {SYNC_ERROR_RESOLUTIONS[record.errorType]}
                              </span>
                            </div>
                          </div>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      {/* Sync Audit Trail */}
      {auditOpen && (
        <div
          className="border rounded-md"
          data-testid="sync-audit-trail"
        >
          <div className="px-4 py-3 border-b bg-muted/30">
            <h3 className="text-sm font-semibold">Sync Audit Trail</h3>
            <p className="text-xs text-muted-foreground">
              All sync actions are immutably logged below.
            </p>
          </div>
          {auditEntries.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground">
              No audit entries yet.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Timestamp</TableHead>
                  <TableHead>Provider</TableHead>
                  <TableHead>Entity</TableHead>
                  <TableHead>Transition</TableHead>
                  <TableHead>Message</TableHead>
                  <TableHead>External ID</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {[...auditEntries].reverse().map((entry) => (
                  <TableRow
                    key={entry.id}
                    data-testid={`sync-audit-entry-${entry.id}`}
                  >
                    <TableCell>{fmtDateTime(entry.timestamp)}</TableCell>
                    <TableCell>
                      <ProviderBadge provider={entry.provider} />
                    </TableCell>
                    <TableCell className="text-xs">
                      {ENTITY_TYPE_LABELS[entry.entityType]}
                    </TableCell>
                    <TableCell className="text-xs">
                      {entry.fromStatus ? (
                        <span>
                          <StatusBadge status={entry.fromStatus} />
                          {" → "}
                          <StatusBadge status={entry.toStatus} />
                        </span>
                      ) : (
                        <StatusBadge status={entry.toStatus} />
                      )}
                    </TableCell>
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
          )}
        </div>
      )}
    </div>
  );
}
