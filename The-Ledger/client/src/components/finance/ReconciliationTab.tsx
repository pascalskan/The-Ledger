/**
 * PHASE 5.8 — RECONCILIATION TAB
 *
 * Financial Explorer tab: Reconciliation Centre.
 *
 * Displays:
 *   - Reconciliation KPI strip (Matched, Unmatched, Requires Review, Missing)
 *   - Reconciliation table with entity, type, provider, references, status
 *   - Status, provider, and entity type filters
 *   - Search by entity name, reference
 *   - Mismatch detail expansion
 *
 * Doctrine:
 *   Reconciliation never modifies financial records.
 *   The Ledger remains the source of truth.
 *   All discrepancies are traceable.
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
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Search,
  GitMerge,
  RefreshCw,
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

function StatusBadge({ status }: { status: ReconciliationStatus }) {
  return (
    <Badge
      variant="outline"
      className={RECONCILIATION_STATUS_COLORS[status]}
      data-testid={`recon-status-badge-${status}`}
    >
      {RECONCILIATION_STATUS_LABELS[status]}
    </Badge>
  );
}

export function ReconciliationTab() {
  const [records] = useState<ReconciliationRecord[]>(SEED_RECONCILIATION_RECORDS);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<ReconciliationStatus | "all">("all");
  const [providerFilter, setProviderFilter] = useState<AccountingProvider | "all">("all");
  const [entityTypeFilter, setEntityTypeFilter] = useState<EntityType | "all">("all");
  const [expandedRow, setExpandedRow] = useState<string | null>(null);

  const summary = useMemo(() => computeReconciliationSummary(records), [records]);

  const filtered = useMemo(() => {
    let result = records;
    if (statusFilter !== "all") result = result.filter((r) => r.status === statusFilter);
    if (providerFilter !== "all") result = result.filter((r) => r.provider === providerFilter);
    if (entityTypeFilter !== "all") result = result.filter((r) => r.entityType === entityTypeFilter);
    return searchReconciliationRecords(result, search);
  }, [records, statusFilter, providerFilter, entityTypeFilter, search]);

  const kpiCards = [
    {
      label: "Matched",
      value: summary.matched,
      icon: CheckCircle2,
      color: "text-emerald-600",
      filter: "matched" as ReconciliationStatus,
      testId: "kpi-recon-matched",
    },
    {
      label: "Unmatched",
      value: summary.unmatched,
      icon: XCircle,
      color: "text-red-600",
      filter: "unmatched" as ReconciliationStatus,
      testId: "kpi-recon-unmatched",
    },
    {
      label: "Requires Review",
      value: summary.requiresReview,
      icon: AlertTriangle,
      color: "text-blue-600",
      filter: "requires_review" as ReconciliationStatus,
      testId: "kpi-recon-requires-review",
    },
    {
      label: "Missing Records",
      value: summary.missingInLedger + summary.missingInAccounting,
      icon: GitMerge,
      color: "text-amber-600",
      filter: "missing_in_accounting" as ReconciliationStatus,
      testId: "kpi-recon-missing",
    },
  ];

  return (
    <div className="mt-4 space-y-6" data-testid="reconciliation-tab-panel">
      {/* Doctrine notice */}
      <div className="rounded-md bg-violet-50 border border-violet-200 px-4 py-3 text-sm text-violet-700">
        <span className="font-semibold">Reconciliation Doctrine: </span>
        Reconciliation detects discrepancies between The Ledger and downstream accounting
        systems. The Ledger remains the source of operational truth. Reconciliation never
        modifies financial records.
      </div>

      {/* Match Rate Summary */}
      <div className="flex items-center gap-3 p-3 rounded-md bg-muted/30 border">
        <div className="text-2xl font-bold text-emerald-600" data-testid="recon-match-rate">
          {summary.matchRate}%
        </div>
        <div>
          <p className="text-sm font-medium">Match Rate</p>
          <p className="text-xs text-muted-foreground">
            {summary.matched} of {summary.total} records reconciled
          </p>
        </div>
      </div>

      {/* KPI Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3" data-testid="recon-kpi-strip">
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
            data-testid="recon-search"
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {/* Status filter */}
          <select
            className="h-9 rounded-md border bg-background px-3 text-sm"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as ReconciliationStatus | "all")}
            data-testid="recon-filter-status"
          >
            <option value="all">All Statuses</option>
            <option value="matched">Matched</option>
            <option value="unmatched">Unmatched</option>
            <option value="requires_review">Requires Review</option>
            <option value="missing_in_ledger">Missing in Ledger</option>
            <option value="missing_in_accounting">Missing in Accounting</option>
          </select>
          {/* Provider filter */}
          <select
            className="h-9 rounded-md border bg-background px-3 text-sm"
            value={providerFilter}
            onChange={(e) => setProviderFilter(e.target.value as AccountingProvider | "all")}
            data-testid="recon-filter-provider"
          >
            <option value="all">All Providers</option>
            <option value="quickbooks">QuickBooks</option>
            <option value="xero">Xero</option>
            <option value="freshbooks">FreshBooks</option>
            <option value="zoho">Zoho Books</option>
          </select>
          {/* Entity type filter */}
          <select
            className="h-9 rounded-md border bg-background px-3 text-sm"
            value={entityTypeFilter}
            onChange={(e) => setEntityTypeFilter(e.target.value as EntityType | "all")}
            data-testid="recon-filter-entity-type"
          >
            <option value="all">All Entity Types</option>
            <option value="invoice">Invoice</option>
            <option value="customer">Customer</option>
            <option value="job">Job</option>
            <option value="payroll">Payroll</option>
          </select>
          {(statusFilter !== "all" || providerFilter !== "all" || entityTypeFilter !== "all") && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setStatusFilter("all");
                setProviderFilter("all");
                setEntityTypeFilter("all");
              }}
              data-testid="recon-filter-clear"
            >
              Clear Filters
            </Button>
          )}
        </div>
      </div>

      {/* Reconciliation Table */}
      <div className="border rounded-md" data-testid="recon-table">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <GitMerge className="h-10 w-10 mb-3 opacity-20" />
            <p className="text-sm">No reconciliation records match the current filter.</p>
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
              {filtered.map((record) => (
                <>
                  <TableRow
                    key={record.id}
                    data-testid={`recon-row-${record.id}`}
                    className="cursor-pointer hover:bg-muted/40"
                    onClick={() =>
                      setExpandedRow((e) => (e === record.id ? null : record.id))
                    }
                  >
                    <TableCell className="font-medium text-sm max-w-[160px] truncate">
                      {record.entityName}
                    </TableCell>
                    <TableCell className="text-sm">
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
                      <StatusBadge status={record.status} />
                    </TableCell>
                    <TableCell>{fmtDateTime(record.lastCheckedAt)}</TableCell>
                  </TableRow>

                  {/* Mismatch detail row */}
                  {expandedRow === record.id && record.mismatchDetails && (
                    <TableRow key={`${record.id}-detail`}>
                      <TableCell colSpan={7} className="bg-muted/20">
                        <div
                          className="flex items-start gap-2 px-2 py-2 text-sm"
                          data-testid={`recon-mismatch-detail-${record.id}`}
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
  );
}
