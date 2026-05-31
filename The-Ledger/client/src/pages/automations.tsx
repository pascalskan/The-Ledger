/**
 * PHASE 6.0B — AUTOMATION CENTRE PAGE
 *
 * Central automation management dashboard.
 * CEO-only access.
 *
 * Features:
 *   - KPI strip: Total, Active, Disabled, Executions Today, Financially Sensitive
 *   - Tab 1: Automation Rules — table with search, status/category filters, detail dialog
 *   - Tab 2: Execution History — execution table with result badges
 *   - Tab 3: Automation Audit — immutable audit trail with search
 *
 * Doctrine:
 *   Automations NEVER override approval workflows.
 *   FinanciallySensitive actions require approval validation.
 *   Every execution generates an immutable audit entry.
 *   All state changes are audited.
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
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Zap,
  Search,
  CheckCircle2,
  XCircle,
  Clock,
  ShieldAlert,
  Eye,
  Activity,
  AlertTriangle,
  ListChecks,
  History,
  FileSearch,
} from "lucide-react";
import {
  type AutomationRule,
  type AutomationStatus,
  type AutomationCategory,
  AUTOMATION_STATUS_LABELS,
  AUTOMATION_STATUS_COLORS,
  AUTOMATION_CATEGORY_LABELS,
  AUTOMATION_CATEGORY_COLORS,
  SEED_AUTOMATION_RULES,
  computeAutomationRuleSummary,
  getActionsForRule,
  getTriggerById,
  filterRulesByStatus,
  filterRulesByCategory,
  searchRules,
} from "@/lib/automationEngine";
import {
  type AutomationAuditEntry,
  AUTOMATION_EXECUTION_RESULT_LABELS,
  AUTOMATION_EXECUTION_RESULT_COLORS,
  SEED_EXECUTION_HISTORY,
  getAutomationAuditHistory,
} from "@/lib/automationAuditEngine";

// ── Formatters ────────────────────────────────────────────────

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

// ── Status Badge ──────────────────────────────────────────────

function StatusBadge({ status }: { status: AutomationStatus }) {
  return (
    <Badge
      variant="outline"
      className={`text-xs ${AUTOMATION_STATUS_COLORS[status]}`}
      data-testid={`aut-status-${status}`}
    >
      {AUTOMATION_STATUS_LABELS[status]}
    </Badge>
  );
}

// ── Category Badge ────────────────────────────────────────────

function CategoryBadge({ category }: { category: AutomationCategory }) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge
            variant="outline"
            className={`text-xs ${AUTOMATION_CATEGORY_COLORS[category]}`}
            data-testid={`aut-category-${category}`}
          >
            {category === "FinanciallySensitive" && (
              <ShieldAlert className="h-3 w-3 mr-1" />
            )}
            {AUTOMATION_CATEGORY_LABELS[category]}
          </Badge>
        </TooltipTrigger>
        {category === "FinanciallySensitive" && (
          <TooltipContent>
            <p>Requires approval validation before execution.</p>
          </TooltipContent>
        )}
      </Tooltip>
    </TooltipProvider>
  );
}

// ── Result Badge ──────────────────────────────────────────────

function ResultBadge({ result }: { result: string }) {
  const label = AUTOMATION_EXECUTION_RESULT_LABELS[result as keyof typeof AUTOMATION_EXECUTION_RESULT_LABELS] ?? result;
  const color = AUTOMATION_EXECUTION_RESULT_COLORS[result as keyof typeof AUTOMATION_EXECUTION_RESULT_COLORS] ?? "";
  return (
    <Badge
      variant="outline"
      className={`text-xs ${color}`}
      data-testid={`aut-result-${result}`}
    >
      {label}
    </Badge>
  );
}

// ── Rule Detail Dialog ────────────────────────────────────────

function RuleDetailDialog({
  rule,
  onClose,
  onToggle,
}: {
  rule: AutomationRule;
  onClose: () => void;
  onToggle: (rule: AutomationRule) => void;
}) {
  const trigger = getTriggerById(rule.triggerId);
  const actions = getActionsForRule(rule);

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[640px]" data-testid="aut-rule-detail-dialog">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Zap className="h-4 w-4" />
            {rule.ruleNumber}
          </DialogTitle>
          <DialogDescription>{rule.name}</DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          {/* Rule Information */}
          <section>
            <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
              Rule Information
            </h4>
            <div className="rounded-md bg-muted/30 p-3 text-sm space-y-3">
              <p className="text-muted-foreground">{rule.description}</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <span className="text-xs text-muted-foreground">Status</span>
                  <div className="mt-1">
                    <StatusBadge status={rule.status} />
                  </div>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground">Category</span>
                  <div className="mt-1">
                    <CategoryBadge category={rule.category} />
                  </div>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground">Created By</span>
                  <div className="mt-1 font-medium text-sm">{rule.createdBy}</div>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground">Executions</span>
                  <div className="mt-1 font-medium text-sm">{rule.executionCount}</div>
                </div>
              </div>
            </div>
          </section>

          {/* Trigger */}
          <section data-testid="aut-rule-detail-trigger">
            <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
              Trigger
            </h4>
            {trigger ? (
              <div className="rounded-md border p-3 text-sm">
                <div className="font-semibold">{trigger.label}</div>
                <div className="text-muted-foreground text-xs mt-0.5">{trigger.description}</div>
              </div>
            ) : (
              <div className="text-xs text-muted-foreground">Unknown trigger</div>
            )}
          </section>

          {/* Conditions */}
          {Object.keys(rule.conditions).length > 0 && (
            <section>
              <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                Conditions
              </h4>
              <div className="rounded-md border p-3 text-sm space-y-1">
                {Object.entries(rule.conditions).map(([key, val]) => (
                  <div key={key} className="flex items-center gap-2">
                    <span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">{key}</span>
                    <span className="text-muted-foreground">=</span>
                    <span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">
                      {String(val)}
                    </span>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Actions */}
          <section data-testid="aut-rule-detail-actions">
            <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
              Actions
            </h4>
            <div className="space-y-2">
              {actions.map((action) => (
                <div
                  key={action.id}
                  className="flex items-start justify-between rounded-md border p-3 text-sm"
                >
                  <div>
                    <div className="font-semibold">{action.label}</div>
                    <div className="text-muted-foreground text-xs mt-0.5">{action.description}</div>
                  </div>
                  <Badge
                    variant="outline"
                    className={`text-xs ml-3 shrink-0 ${AUTOMATION_CATEGORY_COLORS[action.safetyClass]}`}
                  >
                    {action.safetyClass}
                  </Badge>
                </div>
              ))}
            </div>
          </section>

          {/* Financial Safeguards */}
          {rule.category === "FinanciallySensitive" && (
            <section data-testid="aut-rule-detail-financial-safeguard">
              <div className="flex items-center gap-2 rounded-md bg-red-50 border border-red-200 px-3 py-2.5 text-sm text-red-700">
                <ShieldAlert className="h-4 w-4 shrink-0" />
                <div>
                  <span className="font-semibold">Financially Sensitive — </span>
                  Approval Required. Actions in this rule will be blocked unless the triggering
                  record has been approved.
                </div>
              </div>
            </section>
          )}

          {/* Enable / Disable */}
          <div className="flex gap-2 pt-1">
            {rule.status === "active" ? (
              <Button
                size="sm"
                variant="outline"
                className="text-amber-700 border-amber-300 hover:bg-amber-50"
                onClick={() => onToggle(rule)}
                data-testid="aut-btn-disable-rule"
              >
                <XCircle className="h-3.5 w-3.5 mr-1" /> Disable Rule
              </Button>
            ) : rule.status === "disabled" ? (
              <Button
                size="sm"
                variant="outline"
                className="text-emerald-700 border-emerald-300 hover:bg-emerald-50"
                onClick={() => onToggle(rule)}
                data-testid="aut-btn-enable-rule"
              >
                <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Enable Rule
              </Button>
            ) : null}
            <Button size="sm" variant="outline" onClick={onClose}>
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Execution Detail Dialog ───────────────────────────────────

function ExecutionDetailDialog({
  entry,
  onClose,
}: {
  entry: AutomationAuditEntry;
  onClose: () => void;
}) {
  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[540px]" data-testid="aut-execution-detail-dialog">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Execution Detail
          </DialogTitle>
          <DialogDescription className="font-mono text-xs">{entry.executionId}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <span className="text-xs text-muted-foreground">Rule</span>
              <div className="mt-1 font-semibold">{entry.ruleNumber}</div>
              <div className="text-xs text-muted-foreground truncate">{entry.ruleName}</div>
            </div>
            <div>
              <span className="text-xs text-muted-foreground">Result</span>
              <div className="mt-1">
                <ResultBadge result={entry.result} />
              </div>
            </div>
            <div>
              <span className="text-xs text-muted-foreground">Trigger</span>
              <div className="mt-1 text-sm font-mono">{entry.triggerType}</div>
            </div>
            <div>
              <span className="text-xs text-muted-foreground">Triggered By</span>
              <div className="mt-1 font-medium">{entry.initiatedBy}</div>
            </div>
            {entry.jobName && (
              <div>
                <span className="text-xs text-muted-foreground">Job</span>
                <div className="mt-1 font-medium truncate">{entry.jobName}</div>
              </div>
            )}
            <div>
              <span className="text-xs text-muted-foreground">Timestamp</span>
              <div className="mt-1">{fmtDateTime(entry.timestamp)}</div>
            </div>
          </div>
          <div>
            <span className="text-xs text-muted-foreground">Audit Reference</span>
            <div className="mt-1 font-mono text-xs bg-muted px-2 py-1 rounded">{entry.id}</div>
          </div>
          <div>
            <span className="text-xs text-muted-foreground">Result Message</span>
            <p className="mt-1 text-sm rounded border p-2 bg-muted/20">{entry.resultMessage}</p>
          </div>
          <Button size="sm" variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Main Page ─────────────────────────────────────────────────

export default function AutomationsPage() {
  // ── Rule state ────────────────────────────────────────────
  const [rules, setRules] = useState<AutomationRule[]>(SEED_AUTOMATION_RULES);
  const [ruleSearch, setRuleSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<AutomationStatus | "all">("all");
  const [categoryFilter, setCategoryFilter] = useState<AutomationCategory | "all">("all");
  const [selectedRule, setSelectedRule] = useState<AutomationRule | null>(null);

  // ── Execution history state ───────────────────────────────
  const [selectedExecution, setSelectedExecution] = useState<AutomationAuditEntry | null>(null);

  // ── Audit state ───────────────────────────────────────────
  const [auditSearch, setAuditSearch] = useState("");
  const [auditResultFilter, setAuditResultFilter] = useState<string>("all");

  // ── Derived data ──────────────────────────────────────────
  const summary = useMemo(() => computeAutomationRuleSummary(rules), [rules]);

  const filteredRules = useMemo(() => {
    let result = filterRulesByStatus(rules, statusFilter);
    result = filterRulesByCategory(result, categoryFilter);
    return searchRules(result, ruleSearch);
  }, [rules, statusFilter, categoryFilter, ruleSearch]);

  // Seed execution history + any runtime audit entries
  const allExecutions = useMemo(() => {
    const runtime = getAutomationAuditHistory();
    // Merge seed + runtime, deduplicate by id, seed first
    const map = new Map<string, AutomationAuditEntry>();
    [...SEED_EXECUTION_HISTORY, ...runtime].forEach((e) => map.set(e.id, e));
    return Array.from(map.values()).sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  }, []);

  const filteredAudit = useMemo(() => {
    let result = allExecutions;
    if (auditResultFilter !== "all") result = result.filter((e) => e.result === auditResultFilter);
    if (auditSearch.trim()) {
      const q = auditSearch.trim().toLowerCase();
      result = result.filter(
        (e) =>
          e.ruleName.toLowerCase().includes(q) ||
          e.ruleNumber.toLowerCase().includes(q) ||
          e.initiatedBy.toLowerCase().includes(q) ||
          (e.jobName?.toLowerCase().includes(q) ?? false)
      );
    }
    return result;
  }, [allExecutions, auditResultFilter, auditSearch]);

  // ── Rule enable / disable ─────────────────────────────────
  const handleToggleRule = (rule: AutomationRule) => {
    const newStatus: AutomationStatus =
      rule.status === "active" ? "disabled" : "active";
    setRules((prev) =>
      prev.map((r) =>
        r.id === rule.id
          ? { ...r, status: newStatus, updatedAt: new Date().toISOString() }
          : r
      )
    );
    // Update selected rule so dialog reflects new state immediately
    setSelectedRule((prev) =>
      prev?.id === rule.id ? { ...prev, status: newStatus } : prev
    );
  };

  // ── KPI cards ─────────────────────────────────────────────
  const kpiCards = [
    {
      label: "Total Automations",
      value: summary.total,
      icon: Zap,
      color: "text-slate-600",
      testId: "aut-kpi-total",
    },
    {
      label: "Active",
      value: summary.active,
      icon: CheckCircle2,
      color: "text-emerald-600",
      testId: "aut-kpi-active",
    },
    {
      label: "Disabled",
      value: summary.disabled,
      icon: XCircle,
      color: "text-amber-600",
      testId: "aut-kpi-disabled",
    },
    {
      label: "Executions Today",
      value: allExecutions.filter((e) => {
        const today = new Date().toDateString();
        return new Date(e.timestamp).toDateString() === today;
      }).length,
      icon: Activity,
      color: "text-blue-600",
      testId: "aut-kpi-executions-today",
    },
    {
      label: "Financially Sensitive",
      value: summary.financiallySensitive,
      icon: ShieldAlert,
      color: "text-red-600",
      testId: "aut-kpi-financially-sensitive",
    },
  ];

  return (
    <Layout>
      <div className="space-y-6" data-testid="automation-centre-page">
        {/* Header */}
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Automation Centre</h2>
          <p className="text-muted-foreground mt-1">
            Manage operational, workflow and financially sensitive automations.
          </p>
        </div>

        {/* Doctrine Notice */}
        <div className="rounded-md bg-violet-50 border border-violet-200 px-4 py-3 text-sm text-violet-700">
          <span className="font-semibold">Automation Doctrine: </span>
          Automations never override approval workflows. Financially sensitive actions require
          prior approval. Every execution generates an immutable audit entry.
        </div>

        {/* KPI Strip */}
        <div
          className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3"
          data-testid="aut-kpi-strip"
        >
          {kpiCards.map(({ label, value, icon: Icon, color, testId }) => (
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

        {/* Tabs */}
        <Tabs defaultValue="rules">
          <TabsList className="flex flex-wrap h-auto gap-1">
            <TabsTrigger
              value="rules"
              className="flex items-center gap-1.5"
              data-testid="aut-tab-rules"
            >
              <ListChecks className="h-3.5 w-3.5" /> Automation Rules
            </TabsTrigger>
            <TabsTrigger
              value="execution-history"
              className="flex items-center gap-1.5"
              data-testid="aut-tab-execution-history"
            >
              <History className="h-3.5 w-3.5" /> Execution History
            </TabsTrigger>
            <TabsTrigger
              value="audit"
              className="flex items-center gap-1.5"
              data-testid="aut-tab-audit"
            >
              <FileSearch className="h-3.5 w-3.5" /> Automation Audit
            </TabsTrigger>
          </TabsList>

          {/* ── Tab 1: Automation Rules ── */}
          <TabsContent value="rules">
            <div className="mt-4 space-y-4" data-testid="aut-rules-panel">
              {/* Filters */}
              <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
                <div className="relative w-full sm:w-72">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search rule name, number…"
                    value={ruleSearch}
                    onChange={(e) => setRuleSearch(e.target.value)}
                    className="pl-9"
                    data-testid="aut-rules-search"
                  />
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <select
                    className="h-9 rounded-md border bg-background px-3 text-sm"
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value as AutomationStatus | "all")}
                    data-testid="aut-filter-status"
                  >
                    <option value="all">All Statuses</option>
                    <option value="active">Active</option>
                    <option value="disabled">Disabled</option>
                    <option value="draft">Draft</option>
                    <option value="archived">Archived</option>
                  </select>
                  <select
                    className="h-9 rounded-md border bg-background px-3 text-sm"
                    value={categoryFilter}
                    onChange={(e) =>
                      setCategoryFilter(e.target.value as AutomationCategory | "all")
                    }
                    data-testid="aut-filter-category"
                  >
                    <option value="all">All Categories</option>
                    <option value="Operational">Operational</option>
                    <option value="Workflow">Workflow</option>
                    <option value="FinanciallySensitive">Financially Sensitive</option>
                  </select>
                </div>
              </div>

              {/* Rules Table */}
              <div className="border rounded-md" data-testid="aut-rules-table">
                {filteredRules.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                    <Zap className="h-10 w-10 mb-3 opacity-20" />
                    <p className="text-sm">No rules match the current filter.</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Rule</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead>Trigger</TableHead>
                        <TableHead className="text-center">Actions</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Last Executed</TableHead>
                        <TableHead>View</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredRules.map((rule) => {
                        const trigger = getTriggerById(rule.triggerId);
                        const actionCount = rule.actionIds.length;
                        return (
                          <TableRow key={rule.id} data-testid={`aut-rule-row-${rule.id}`}>
                            <TableCell>
                              <div className="font-mono text-xs font-semibold text-muted-foreground">
                                {rule.ruleNumber}
                              </div>
                              <div className="font-medium text-sm max-w-[200px] truncate">
                                {rule.name}
                              </div>
                            </TableCell>
                            <TableCell>
                              <CategoryBadge category={rule.category} />
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground max-w-[140px] truncate">
                              {trigger?.label ?? rule.triggerType}
                            </TableCell>
                            <TableCell className="text-center">
                              <span className="text-sm font-semibold">{actionCount}</span>
                            </TableCell>
                            <TableCell>
                              <StatusBadge status={rule.status} />
                            </TableCell>
                            <TableCell>{fmtDateTime(rule.lastExecutedAt)}</TableCell>
                            <TableCell>
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-xs h-7"
                                onClick={() => setSelectedRule(rule)}
                                data-testid={`aut-btn-view-${rule.id}`}
                              >
                                <Eye className="h-3 w-3 mr-1" /> View
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                )}
              </div>
            </div>
          </TabsContent>

          {/* ── Tab 2: Execution History ── */}
          <TabsContent value="execution-history">
            <div className="mt-4 space-y-4" data-testid="aut-execution-history-panel">
              <div className="border rounded-md" data-testid="aut-execution-table">
                {allExecutions.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                    <Clock className="h-10 w-10 mb-3 opacity-20" />
                    <p className="text-sm">No execution history yet.</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Execution ID</TableHead>
                        <TableHead>Rule</TableHead>
                        <TableHead>Job</TableHead>
                        <TableHead>Triggered By</TableHead>
                        <TableHead>Result</TableHead>
                        <TableHead>Timestamp</TableHead>
                        <TableHead>Detail</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {allExecutions.map((entry) => (
                        <TableRow
                          key={entry.id}
                          data-testid={`aut-execution-row-${entry.id}`}
                        >
                          <TableCell className="font-mono text-xs text-muted-foreground max-w-[140px] truncate">
                            {entry.executionId}
                          </TableCell>
                          <TableCell>
                            <div className="font-mono text-xs text-muted-foreground">
                              {entry.ruleNumber}
                            </div>
                            <div className="text-sm font-medium max-w-[160px] truncate">
                              {entry.ruleName}
                            </div>
                          </TableCell>
                          <TableCell className="text-sm max-w-[140px] truncate">
                            {entry.jobName ?? (
                              <span className="text-muted-foreground text-xs">—</span>
                            )}
                          </TableCell>
                          <TableCell className="text-sm">{entry.initiatedBy}</TableCell>
                          <TableCell>
                            <ResultBadge result={entry.result} />
                          </TableCell>
                          <TableCell>{fmtDateTime(entry.timestamp)}</TableCell>
                          <TableCell>
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-xs h-7"
                              onClick={() => setSelectedExecution(entry)}
                              data-testid={`aut-btn-exec-detail-${entry.id}`}
                            >
                              <Eye className="h-3 w-3 mr-1" /> Detail
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

          {/* ── Tab 3: Automation Audit ── */}
          <TabsContent value="audit">
            <div className="mt-4 space-y-4" data-testid="aut-audit-panel">
              {/* Doctrine note */}
              <div className="rounded-md bg-slate-50 border border-slate-200 px-3 py-2.5 text-xs text-slate-600 flex items-center gap-2">
                <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                Immutable read-only audit trail. Entries cannot be edited or deleted.
              </div>

              {/* Filters */}
              <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
                <div className="relative w-full sm:w-72">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search rule, user, job…"
                    value={auditSearch}
                    onChange={(e) => setAuditSearch(e.target.value)}
                    className="pl-9"
                    data-testid="aut-audit-search"
                  />
                </div>
                <select
                  className="h-9 rounded-md border bg-background px-3 text-sm"
                  value={auditResultFilter}
                  onChange={(e) => setAuditResultFilter(e.target.value)}
                  data-testid="aut-audit-filter-result"
                >
                  <option value="all">All Results</option>
                  <option value="success">Success</option>
                  <option value="blocked_approval_required">Blocked — Approval Required</option>
                  <option value="blocked_forbidden_action">Blocked — Forbidden Action</option>
                  <option value="blocked_condition_not_met">Blocked — Condition Not Met</option>
                  <option value="failed">Failed</option>
                </select>
              </div>

              {/* Audit Table */}
              <div className="border rounded-md" data-testid="aut-audit-table">
                {filteredAudit.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                    <FileSearch className="h-10 w-10 mb-3 opacity-20" />
                    <p className="text-sm">No audit entries match the current filter.</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Audit ID</TableHead>
                        <TableHead>Rule</TableHead>
                        <TableHead>Action</TableHead>
                        <TableHead>User</TableHead>
                        <TableHead>Job</TableHead>
                        <TableHead>Result</TableHead>
                        <TableHead>Timestamp</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredAudit.map((entry) => (
                        <TableRow key={entry.id} data-testid={`aut-audit-row-${entry.id}`}>
                          <TableCell className="font-mono text-xs text-muted-foreground max-w-[120px] truncate">
                            {entry.id}
                          </TableCell>
                          <TableCell>
                            <div className="font-mono text-xs text-muted-foreground">
                              {entry.ruleNumber}
                            </div>
                            <div className="text-sm font-medium max-w-[160px] truncate">
                              {entry.ruleName}
                            </div>
                          </TableCell>
                          <TableCell className="text-sm max-w-[140px] truncate">
                            {entry.actionLabel}
                          </TableCell>
                          <TableCell className="text-sm">{entry.initiatedBy}</TableCell>
                          <TableCell className="text-sm max-w-[120px] truncate">
                            {entry.jobName ?? (
                              <span className="text-muted-foreground text-xs">—</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <ResultBadge result={entry.result} />
                          </TableCell>
                          <TableCell>{fmtDateTime(entry.timestamp)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* ── Rule Detail Dialog ── */}
      {selectedRule && (
        <RuleDetailDialog
          rule={selectedRule}
          onClose={() => setSelectedRule(null)}
          onToggle={handleToggleRule}
        />
      )}

      {/* ── Execution Detail Dialog ── */}
      {selectedExecution && (
        <ExecutionDetailDialog
          entry={selectedExecution}
          onClose={() => setSelectedExecution(null)}
        />
      )}
    </Layout>
  );
}
