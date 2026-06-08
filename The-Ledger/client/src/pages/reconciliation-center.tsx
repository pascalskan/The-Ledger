/**
 * PHASE 5.8 — RECONCILIATION CENTRE PAGE
 *
 * Central operational reconciliation dashboard.
 * CEO-only access.
 *
 * Displays:
 *   - KPI strip: Matched, Unmatched, Requires Review, Missing
 *   - Reconciliation table with filters and search
 *   - Sync Operations dashboard:
 *     - Operational KPIs (Total Syncs, Success Rate, Failures, Retries)
 *     - Failure Queue (failed + retry-required syncs)
 *     - Mock retry actions
 *
 * Doctrine:
 *   Reconciliation never modifies financial records.
 *   The Ledger remains the source of operational truth.
 *   All exceptions are traceable.
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
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Search,
  GitMerge,
  RefreshCw,
  Activity,
  TrendingUp,
} from "lucide-react";
import {
  type ReconciliationRecord,
  type ReconciliationStatus,
  RECONCILIATION_STATUS_LABELS,
  RECONCILIATION_STATUS_COLORS,
  SEED_RECONCILIATION_RECORDS,
  computeReconciliationSummary,
  searchReconciliationRecords,
} from "@/lib/reconciliationEngine";
import {
  type FailureQueueEntry,
  SEED_SYNC_HEALTH,
  SEED_FAILURE_QUEUE,
  FAILURE_QUEUE_STATUS_LABELS,
  FAILURE_QUEUE_STATUS_COLORS,
  mockRetryEntry,
  formatAvgDuration,
} from "@/lib/syncOperationsEngine";
import {
  PROVIDER_LABELS,
  ENTITY_TYPE_LABELS,
  getProviderMeta,
  type AccountingProvider,
  type EntityType,
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

function ProviderBadge({ provider }: { provider: AccountingProvider }) {
  const meta = getProviderMeta(provider);
  return (
    <span
      className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2 py-0.5 rounded border ${meta.bgColor} ${meta.borderColor} ${meta.color}`}
    >
      <span className="font-bold">{meta.logoInitials}</span>
      {meta.name}
    </span>
  );
}

function ReconStatusBadge({ status }: { status: ReconciliationStatus }) {
  return (
    <Badge
      variant="outline"
      className={RECONCILIATION_STATUS_COLORS[status]}
      data-testid={`recon-status-${status}`}
    >
      {RECONCILIATION_STATUS_LABELS[status]}
    </Badge>
  );
}

export function ReconciliationContent() {
  // Reconciliation state
  const [records] = useState<ReconciliationRecord[]>(SEED_RECONCILIATION_RECORDS);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<ReconciliationStatus | "all">("all");
  const [providerFilter, setProviderFilter] = useState<AccountingProvider | "all">("all");
  const [entityTypeFilter, setEntityTypeFilter] = useState<EntityType | "all">("all");
  const [expandedRow, setExpandedRow] = useState<string | null>(null);

  // Sync operations state
  const [failureQueue, setFailureQueue] = useState<FailureQueueEntry[]>(SEED_FAILURE_QUEUE);
  const [retryingIds, setRetryingIds] = useState<Set<string>>(new Set());

  const summary = useMemo(() => computeReconciliationSummary(records), [records]);

  const filteredRecords = useMemo(() => {
    let result = records;
    if (statusFilter !== "all") result = result.filter((r) => r.status === statusFilter);
    if (providerFilter !== "all") result = result.filter((r) => r.provider === providerFilter);
    if (entityTypeFilter !== "all") result = result.filter((r) => r.entityType === entityTypeFilter);
    return searchReconciliationRecords(result, search);
  }, [records, statusFilter, providerFilter, entityTypeFilter, search]);

  const handleRetry = (entry: FailureQueueEntry) => {
    setRetryingIds((s) => new Set(s).add(entry.id));
    setTimeout(() => {
      setFailureQueue((prev) =>
        prev.map((e) => (e.id === entry.id ? mockRetryEntry(e) : e))
      );
      setRetryingIds((s) => {
        const next = new Set(s);
        next.delete(entry.id);
        return next;
      });
    }, 1200);
  };

  const kpiCards = [
    {
      label: "Matched",
      value: summary.matched,
      icon: CheckCircle2,
      color: "text-emerald-600",
      filter: "matched" as ReconciliationStatus,
      testId: "rc-kpi-matched",
    },
    {
      label: "Unmatched",
      value: summary.unmatched,
      icon: XCircle,
      color: "text-red-600",
      filter: "unmatched" as ReconciliationStatus,
      testId: "rc-kpi-unmatched",
    },
    {
      label: "Requires Review",
      value: summary.requiresReview,
      icon: AlertTriangle,
      color: "text-blue-600",
      filter: "requires_review" as ReconciliationStatus,
      testId: "rc-kpi-requires-review",
    },
    {
      label: "Missing Records",
      value: summary.missingInLedger + summary.missingInAccounting,
      icon: GitMerge,
      color: "text-amber-600",
      filter: "missing_in_accounting" as ReconciliationStatus,
      testId: "rc-kpi-missing",
    },
  ];

  const syncHealthCards = [
    {
      label: "Total Syncs",
      value: SEED_SYNC_HEALTH.totalSyncs,
      icon: RefreshCw,
      color: "text-slate-600",
      testId: "rc-ops-total-syncs",
    },
    {
      label: "Success Rate",
      value: `${SEED_SYNC_HEALTH.successRate}%`,
      icon: TrendingUp,
      color: "text-emerald-600",
      testId: "rc-ops-success-rate",
    },
    {
      label: "Failures",
      value: SEED_SYNC_HEALTH.failureCount,
      icon: XCircle,
      color: "text-red-600",
      testId: "rc-ops-failures",
    },
    {
      label: "Retries",
      value: SEED_SYNC_HEALTH.retryCount,
      icon: RefreshCw,
      color: "text-amber-600",
      testId: "rc-ops-retries",
    },
  ];

  return (
      <div className="space-y-6" data-testid="reconciliation-center-page">
        {/* Header */}
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Reconciliation Centre</h2>
          <p className="text-muted-foreground mt-1">
            Operational control and reconciliation for accounting synchronization.
          </p>
        </div>

        {/* Doctrine Notice */}
        <div className="rounded-md bg-violet-50 border border-violet-200 px-4 py-3 text-sm text-violet-700">
          <span className="font-semibold">Reconciliation Doctrine: </span>
          The Ledger remains the source of operational truth. Reconciliation detects discrepancies
          between The Ledger and downstream accounting systems. No financial records are modified by
          this centre.
        </div>

        {/* Tabs */}
        <Tabs defaultValue="reconciliation">
          <TabsList className="flex flex-wrap h-auto gap-1">
            <TabsTrigger value="reconciliation" className="flex items-center gap-1.5" data-testid="rc-tab-reconciliation">
              <GitMerge className="h-3.5 w-3.5" /> Reconciliation
            </TabsTrigger>
            <TabsTrigger value="sync-operations" className="flex items-center gap-1.5" data-testid="rc-tab-sync-ops">
              <Activity className="h-3.5 w-3.5" /> Sync Operations
            </TabsTrigger>
          </TabsList>

          {/* ── Reconciliation Tab ── */}
          <TabsContent value="reconciliation">
            <div className="mt-4 space-y-6">
              {/* Match Rate */}
              <div className="flex items-center gap-3 p-3 rounded-md bg-muted/30 border">
                <div
                  className="text-3xl font-bold text-emerald-600"
                  data-testid="rc-match-rate"
                >
                  {summary.matchRate}%
                </div>
                <div>
                  <p className="text-sm font-medium">Overall Match Rate</p>
                  <p className="text-xs text-muted-foreground">
                    {summary.matched} of {summary.total} records reconciled
                  </p>
                </div>
              </div>

              {/* KPI Strip */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3" data-testid="rc-kpi-strip">
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

              {/* Filters */}
              <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
                <div className="relative w-full sm:w-72">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search entity, reference, job…"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-9"
                    data-testid="rc-search"
                  />
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <select
                    className="h-9 rounded-md border bg-background px-3 text-sm"
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value as ReconciliationStatus | "all")}
                    data-testid="rc-filter-status"
                  >
                    <option value="all">All Statuses</option>
                    <option value="matched">Matched</option>
                    <option value="unmatched">Unmatched</option>
                    <option value="requires_review">Requires Review</option>
                    <option value="missing_in_ledger">Missing in Ledger</option>
                    <option value="missing_in_accounting">Missing in Accounting</option>
                  </select>
                  <select
                    className="h-9 rounded-md border bg-background px-3 text-sm"
                    value={providerFilter}
                    onChange={(e) => setProviderFilter(e.target.value as AccountingProvider | "all")}
                    data-testid="rc-filter-provider"
                  >
                    <option value="all">All Providers</option>
                    <option value="quickbooks">QuickBooks</option>
                    <option value="xero">Xero</option>
                    <option value="freshbooks">FreshBooks</option>
                    <option value="zoho">Zoho Books</option>
                  </select>
                  <select
                    className="h-9 rounded-md border bg-background px-3 text-sm"
                    value={entityTypeFilter}
                    onChange={(e) => setEntityTypeFilter(e.target.value as EntityType | "all")}
                    data-testid="rc-filter-entity-type"
                  >
                    <option value="all">All Entity Types</option>
                    <option value="invoice">Invoice</option>
                    <option value="customer">Customer</option>
                    <option value="job">Job</option>
                    <option value="payroll">Payroll</option>
                  </select>
                </div>
              </div>

              {/* Reconciliation Table */}
              <div className="border rounded-md" data-testid="rc-recon-table">
                {filteredRecords.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                    <GitMerge className="h-10 w-10 mb-3 opacity-20" />
                    <p className="text-sm">No records match the current filter.</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Entity</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Provider</TableHead>
                        <TableHead>Ledger Reference</TableHead>
                        <TableHead>Accounting Reference</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Last Checked</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredRecords.map((record) => (
                        <>
                          <TableRow
                            key={record.id}
                            data-testid={`rc-recon-row-${record.id}`}
                            className="cursor-pointer hover:bg-muted/40"
                            onClick={() =>
                              setExpandedRow((e) => (e === record.id ? null : record.id))
                            }
                          >
                            <TableCell className="font-medium text-sm max-w-[160px] truncate">
                              {record.entityName}
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className="text-xs">
                                {ENTITY_TYPE_LABELS[record.entityType]}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <ProviderBadge provider={record.provider} />
                            </TableCell>
                            <TableCell>
                              {record.ledgerReference ? (
                                <span className="font-mono text-xs">{record.ledgerReference}</span>
                              ) : (
                                <span className="text-muted-foreground text-xs">—</span>
                              )}
                            </TableCell>
                            <TableCell>
                              {record.accountingReference ? (
                                <span className="font-mono text-xs">{record.accountingReference}</span>
                              ) : (
                                <span className="text-muted-foreground text-xs">—</span>
                              )}
                            </TableCell>
                            <TableCell>
                              <ReconStatusBadge status={record.status} />
                            </TableCell>
                            <TableCell>{fmtDateTime(record.lastCheckedAt)}</TableCell>
                          </TableRow>
                          {expandedRow === record.id && record.mismatchDetails && (
                            <TableRow key={`${record.id}-detail`}>
                              <TableCell colSpan={7} className="bg-muted/20">
                                <div
                                  className="flex items-start gap-2 px-2 py-2 text-sm"
                                  data-testid={`rc-mismatch-${record.id}`}
                                >
                                  <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5 flex-shrink-0" />
                                  <span className="text-muted-foreground">{record.mismatchDetails}</span>
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
            </div>
          </TabsContent>

          {/* ── Sync Operations Tab ── */}
          <TabsContent value="sync-operations">
            <div className="mt-4 space-y-6" data-testid="rc-sync-ops-panel">
              {/* Operational KPIs */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3" data-testid="rc-ops-kpi-strip">
                {syncHealthCards.map(({ label, value, icon: Icon, color, testId }) => (
                  <Card key={label}>
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

              {/* Avg Duration */}
              <div className="flex items-center gap-3 p-3 rounded-md bg-muted/30 border">
                <Activity className="h-5 w-5 text-slate-500" />
                <div>
                  <p className="text-sm font-medium">Average Sync Duration</p>
                  <p className="text-xs text-muted-foreground" data-testid="rc-ops-avg-duration">
                    {formatAvgDuration(SEED_SYNC_HEALTH.avgDurationMs)}
                  </p>
                </div>
              </div>

              {/* Failure Queue */}
              <div>
                <h3 className="text-base font-semibold mb-3">Failure Queue</h3>
                <div className="border rounded-md" data-testid="rc-failure-queue">
                  {failureQueue.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                      <CheckCircle2 className="h-10 w-10 mb-3 opacity-20" />
                      <p className="text-sm">No failures in the queue.</p>
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Provider</TableHead>
                          <TableHead>Entity</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Error Reason</TableHead>
                          <TableHead>Failed At</TableHead>
                          <TableHead>Retries</TableHead>
                          <TableHead>Action</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {failureQueue.map((entry) => (
                          <TableRow
                            key={entry.id}
                            data-testid={`rc-failure-row-${entry.id}`}
                          >
                            <TableCell>
                              <ProviderBadge provider={entry.provider} />
                            </TableCell>
                            <TableCell>
                              <div className="text-sm font-medium max-w-[140px] truncate">
                                {entry.entityName}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {ENTITY_TYPE_LABELS[entry.entityType]}
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant="outline"
                                className={`text-xs ${FAILURE_QUEUE_STATUS_COLORS[entry.status]}`}
                                data-testid={`rc-failure-status-${entry.id}`}
                              >
                                {FAILURE_QUEUE_STATUS_LABELS[entry.status]}
                              </Badge>
                            </TableCell>
                            <TableCell
                              className="text-xs text-muted-foreground max-w-[220px]"
                              data-testid={`rc-failure-reason-${entry.id}`}
                            >
                              {entry.errorReason}
                            </TableCell>
                            <TableCell>{fmtDateTime(entry.failedAt)}</TableCell>
                            <TableCell className="text-sm">
                              <span data-testid={`rc-failure-retry-count-${entry.id}`}>
                                {entry.retryCount}
                              </span>
                            </TableCell>
                            <TableCell>
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-xs h-7"
                                onClick={() => handleRetry(entry)}
                                disabled={retryingIds.has(entry.id)}
                                data-testid={`rc-btn-retry-${entry.id}`}
                              >
                                <RefreshCw className="h-3 w-3 mr-1" />
                                {retryingIds.has(entry.id) ? "Retrying…" : "Retry"}
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
  );
}

export default function ReconciliationCenterPage() {
  return <Layout><ReconciliationContent /></Layout>;
}
