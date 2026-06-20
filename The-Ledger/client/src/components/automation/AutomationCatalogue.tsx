/**
 * UX-6.2 — AUTOMATION CATALOGUE
 *
 * Transforms the Automation Rules list into an executive catalogue: rich
 * per-rule metadata joined from the governance and scheduler engines, with
 * multi-dimensional search, filtering, and sorting.
 *
 * Pure presentation / discoverability layer. No automation behaviour changes:
 *   - Reads existing engine truth (rules, governance records, schedules).
 *   - Creates nothing, approves nothing, mutates no financial records.
 *   - Existing rules-tab testIds (table, rows, view buttons, status badges)
 *     are preserved so prior doctrine tests continue to pass.
 *
 * The detail dialog and all rule actions (edit / duplicate / archive /
 * enable / disable) remain owned by the parent page — this component only
 * surfaces rows and raises onView.
 */

import { useMemo, useState } from "react";
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
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Zap,
  Search,
  Eye,
  ShieldAlert,
  ShieldCheck,
  CalendarClock,
  ArrowUp,
  ArrowDown,
} from "lucide-react";
import {
  type AutomationRule,
  type AutomationStatus,
  type AutomationCategory,
  AUTOMATION_STATUS_LABELS,
  AUTOMATION_STATUS_COLORS,
  AUTOMATION_CATEGORY_LABELS,
  AUTOMATION_CATEGORY_COLORS,
  getTriggerById,
} from "@/lib/automationEngine";
import {
  type AutomationGovernanceRecord,
  type AutomationGovernanceStatus,
  type AutomationRiskLevel,
  GOVERNANCE_STATUS_LABELS,
  GOVERNANCE_STATUS_COLORS,
  RISK_LEVEL_LABELS,
  RISK_LEVEL_COLORS,
  getAllGovernanceRecords,
} from "@/lib/automationGovernanceEngine";
import {
  type AutomationSchedule,
  SCHEDULE_STATUS_LABELS,
  SCHEDULE_STATUS_COLORS,
  getAllSchedules,
} from "@/lib/automationSchedulerEngine";

// ── Joined catalogue row ────────────────────────────────────────────────

export interface CatalogueRow {
  rule: AutomationRule;
  governance: AutomationGovernanceRecord | null;
  schedule: AutomationSchedule | null;
  isScheduled: boolean;
  successRate: number | null; // 0–100 or null when no executions
  totalExecutions: number;
  nextRunAt: string | null;
  riskLevel: AutomationRiskLevel | null;
  governanceStatus: AutomationGovernanceStatus | null;
  isFinanciallySensitive: boolean;
  isApprovalProtected: boolean;
}

/** Join rules with their governance record and active schedule (deterministic). */
export function buildCatalogueRows(
  rules: AutomationRule[],
  govRecords: AutomationGovernanceRecord[],
  schedules: AutomationSchedule[]
): CatalogueRow[] {
  const govByRule = new Map(govRecords.map((g) => [g.ruleId, g]));
  // Prefer an Active schedule; otherwise any schedule linked to the rule.
  const schedByRule = new Map<string, AutomationSchedule>();
  for (const s of schedules) {
    const existing = schedByRule.get(s.ruleId);
    if (!existing || (existing.status !== "Active" && s.status === "Active")) {
      schedByRule.set(s.ruleId, s);
    }
  }

  return rules.map((rule) => {
    const governance = govByRule.get(rule.id) ?? null;
    const schedule = schedByRule.get(rule.id) ?? null;
    const totalExecutions = governance?.totalExecutions ?? rule.executionCount;
    const successRate =
      governance && governance.totalExecutions > 0
        ? Math.round((governance.successfulExecutions / governance.totalExecutions) * 100)
        : null;
    const isScheduled = schedule !== null || rule.triggerType === "schedule_trigger";

    return {
      rule,
      governance,
      schedule,
      isScheduled,
      successRate,
      totalExecutions,
      nextRunAt: schedule && schedule.status === "Active" ? schedule.nextRunAt : null,
      riskLevel: governance?.riskLevel ?? null,
      governanceStatus: governance?.governanceStatus ?? null,
      isFinanciallySensitive:
        governance?.isFinanciallySensitive ?? rule.category === "FinanciallySensitive",
      isApprovalProtected: governance?.isApprovalProtected ?? false,
    };
  });
}

// ── Filter / sort types ─────────────────────────────────────────────────

type SortKey = "name" | "lastExecution" | "nextExecution" | "successRate" | "totalExecutions" | "lastModified";
type SortDir = "asc" | "desc";
type ExecKind = "all" | "scheduled" | "event";
type TriStateSensitive = "all" | "yes" | "no";

// ── Formatters ──────────────────────────────────────────────────────────

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

// ── Small badges (replicate page testIds for back-compat) ────────────────

function StatusBadge({ status }: { status: AutomationStatus }) {
  return (
    <Badge variant="outline" className={`text-xs ${AUTOMATION_STATUS_COLORS[status]}`} data-testid={`aut-status-${status}`}>
      {AUTOMATION_STATUS_LABELS[status]}
    </Badge>
  );
}

// ── Component ───────────────────────────────────────────────────────────

export function AutomationCatalogue({
  rules,
  onView,
}: {
  rules: AutomationRule[];
  onView: (rule: AutomationRule) => void;
}) {
  // Governance + schedules are static seed data (not mutated by rule toggles).
  const rows = useMemo(
    () => buildCatalogueRows(rules, getAllGovernanceRecords(), getAllSchedules()),
    [rules]
  );

  // Controls
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<AutomationStatus | "all">("all");
  const [categoryFilter, setCategoryFilter] = useState<AutomationCategory | "all">("all");
  const [govFilter, setGovFilter] = useState<AutomationGovernanceStatus | "all">("all");
  const [sensitiveFilter, setSensitiveFilter] = useState<TriStateSensitive>("all");
  const [execFilter, setExecFilter] = useState<ExecKind>("all");
  const [riskFilter, setRiskFilter] = useState<AutomationRiskLevel | "all">("all");
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  const filtered = useMemo(() => {
    let r = rows;

    if (statusFilter !== "all") r = r.filter((x) => x.rule.status === statusFilter);
    if (categoryFilter !== "all") r = r.filter((x) => x.rule.category === categoryFilter);
    if (govFilter !== "all") r = r.filter((x) => x.governanceStatus === govFilter);
    if (sensitiveFilter !== "all") r = r.filter((x) => x.isFinanciallySensitive === (sensitiveFilter === "yes"));
    if (execFilter !== "all") r = r.filter((x) => (execFilter === "scheduled" ? x.isScheduled : !x.isScheduled));
    if (riskFilter !== "all") r = r.filter((x) => x.riskLevel === riskFilter);

    const q = search.trim().toLowerCase();
    if (q) {
      r = r.filter((x) => {
        const trigger = getTriggerById(x.rule.triggerId);
        return (
          x.rule.name.toLowerCase().includes(q) ||
          x.rule.description.toLowerCase().includes(q) ||
          x.rule.ruleNumber.toLowerCase().includes(q) ||
          x.rule.id.toLowerCase().includes(q) ||
          AUTOMATION_CATEGORY_LABELS[x.rule.category].toLowerCase().includes(q) ||
          (trigger?.label.toLowerCase().includes(q) ?? false) ||
          x.rule.triggerType.toLowerCase().includes(q) ||
          (x.schedule?.scheduleNumber.toLowerCase().includes(q) ?? false)
        );
      });
    }
    return r;
  }, [rows, statusFilter, categoryFilter, govFilter, sensitiveFilter, execFilter, riskFilter, search]);

  const sorted = useMemo(() => {
    const dir = sortDir === "asc" ? 1 : -1;
    const timeOf = (iso: string | null) => (iso ? new Date(iso).getTime() : null);
    const cmpNullable = (a: number | null, b: number | null) => {
      // Nulls always sort last regardless of direction.
      if (a === null && b === null) return 0;
      if (a === null) return 1;
      if (b === null) return -1;
      return (a - b) * dir;
    };
    return [...filtered].sort((a, b) => {
      switch (sortKey) {
        case "name":
          return a.rule.name.localeCompare(b.rule.name) * dir;
        case "lastExecution":
          return cmpNullable(timeOf(a.rule.lastExecutedAt), timeOf(b.rule.lastExecutedAt));
        case "nextExecution":
          return cmpNullable(timeOf(a.nextRunAt), timeOf(b.nextRunAt));
        case "successRate":
          return cmpNullable(a.successRate, b.successRate);
        case "totalExecutions":
          return (a.totalExecutions - b.totalExecutions) * dir;
        case "lastModified":
          return cmpNullable(timeOf(a.rule.updatedAt), timeOf(b.rule.updatedAt));
        default:
          return 0;
      }
    });
  }, [filtered, sortKey, sortDir]);

  const toggleDir = () => setSortDir((d) => (d === "asc" ? "desc" : "asc"));

  const selectClass = "h-9 rounded-md border bg-background px-3 text-sm";

  return (
    <div className="space-y-4" data-testid="aut-catalogue">
      {/* Search + sort row */}
      <div className="flex flex-col lg:flex-row gap-3 lg:items-center">
        <div className="relative w-full lg:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search name, description, trigger, category, ID, schedule…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
            data-testid="aut-rules-search"
          />
        </div>
        <div className="flex items-center gap-2 lg:ml-auto">
          <span className="text-xs text-muted-foreground hidden sm:inline">Sort</span>
          <select className={selectClass} value={sortKey} onChange={(e) => setSortKey(e.target.value as SortKey)} data-testid="aut-sort-key">
            <option value="name">Name</option>
            <option value="lastExecution">Last Execution</option>
            <option value="nextExecution">Next Execution</option>
            <option value="successRate">Success Rate</option>
            <option value="totalExecutions">Total Executions</option>
            <option value="lastModified">Last Modified</option>
          </select>
          <Button variant="outline" size="sm" className="h-9" onClick={toggleDir} data-testid="aut-sort-direction" aria-label={`Sort ${sortDir === "asc" ? "ascending" : "descending"}`}>
            {sortDir === "asc" ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      {/* Filter row */}
      <div className="flex flex-wrap items-center gap-2" data-testid="aut-catalogue-filters">
        <select className={selectClass} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as AutomationStatus | "all")} data-testid="aut-filter-status">
          <option value="all">All Statuses</option>
          <option value="active">Active</option>
          <option value="disabled">Disabled</option>
          <option value="draft">Draft</option>
          <option value="archived">Archived</option>
        </select>
        <select className={selectClass} value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value as AutomationCategory | "all")} data-testid="aut-filter-category">
          <option value="all">All Categories</option>
          <option value="Operational">Operational</option>
          <option value="Workflow">Workflow</option>
          <option value="FinanciallySensitive">Financially Sensitive</option>
        </select>
        <select className={selectClass} value={govFilter} onChange={(e) => setGovFilter(e.target.value as AutomationGovernanceStatus | "all")} data-testid="aut-filter-governance">
          <option value="all">All Governance</option>
          <option value="Compliant">Compliant</option>
          <option value="Requires Review">Requires Review</option>
          <option value="Restricted">Restricted</option>
          <option value="Suspended">Suspended</option>
        </select>
        <select className={selectClass} value={sensitiveFilter} onChange={(e) => setSensitiveFilter(e.target.value as TriStateSensitive)} data-testid="aut-filter-sensitive">
          <option value="all">All (Sensitivity)</option>
          <option value="yes">Financially Sensitive</option>
          <option value="no">Not Sensitive</option>
        </select>
        <select className={selectClass} value={execFilter} onChange={(e) => setExecFilter(e.target.value as ExecKind)} data-testid="aut-filter-exec">
          <option value="all">All Triggers</option>
          <option value="scheduled">Scheduled</option>
          <option value="event">Event-driven</option>
        </select>
        <select className={selectClass} value={riskFilter} onChange={(e) => setRiskFilter(e.target.value as AutomationRiskLevel | "all")} data-testid="aut-filter-risk">
          <option value="all">All Risk Levels</option>
          <option value="Low">Low</option>
          <option value="Medium">Medium</option>
          <option value="High">High</option>
          <option value="Critical">Critical</option>
        </select>
        <span className="text-xs text-muted-foreground ml-auto" data-testid="aut-catalogue-count">
          {sorted.length} of {rows.length}
        </span>
      </div>

      {/* Catalogue table */}
      <div className="border rounded-md overflow-x-auto" data-testid="aut-rules-table">
        {sorted.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <Zap className="h-10 w-10 mb-3 opacity-20" />
            <p className="text-sm">No automations match the current search and filters.</p>
          </div>
        ) : (
          <TooltipProvider>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Automation</TableHead>
                  <TableHead className="hidden lg:table-cell">Category</TableHead>
                  <TableHead className="hidden xl:table-cell">Trigger</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="hidden md:table-cell">Governance</TableHead>
                  <TableHead className="hidden lg:table-cell text-right">Success</TableHead>
                  <TableHead className="hidden xl:table-cell text-right">Runs</TableHead>
                  <TableHead className="hidden lg:table-cell">Last Exec</TableHead>
                  <TableHead className="hidden xl:table-cell">Next Exec</TableHead>
                  <TableHead className="hidden xl:table-cell">Modified</TableHead>
                  <TableHead className="text-right">View</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sorted.map((row) => {
                  const { rule } = row;
                  const trigger = getTriggerById(rule.triggerId);
                  return (
                    <TableRow key={rule.id} data-testid={`aut-rule-row-${rule.id}`}>
                      {/* Automation (name + number + inline indicators) */}
                      <TableCell>
                        <div className="font-mono text-[11px] font-semibold text-muted-foreground">{rule.ruleNumber}</div>
                        <div className="font-medium text-sm max-w-[220px] truncate">{rule.name}</div>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {row.isFinanciallySensitive && (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Badge variant="outline" className="text-[10px] text-red-600 border-red-200 bg-red-50" data-testid={`aut-badge-sensitive-${rule.id}`}>
                                  <ShieldAlert className="h-2.5 w-2.5 mr-0.5" /> Sensitive
                                </Badge>
                              </TooltipTrigger>
                              <TooltipContent>Financially sensitive — approval required before execution.</TooltipContent>
                            </Tooltip>
                          )}
                          {row.isApprovalProtected && (
                            <Badge variant="outline" className="text-[10px] text-violet-700 border-violet-200 bg-violet-50" data-testid={`aut-badge-approval-${rule.id}`}>
                              <ShieldCheck className="h-2.5 w-2.5 mr-0.5" /> Approval Protected
                            </Badge>
                          )}
                          {row.isScheduled && (
                            <Badge variant="outline" className="text-[10px] text-blue-700 border-blue-200 bg-blue-50" data-testid={`aut-badge-scheduled-${rule.id}`}>
                              <CalendarClock className="h-2.5 w-2.5 mr-0.5" /> Scheduled
                            </Badge>
                          )}
                          {row.schedule?.status === "Paused" && (
                            <Badge variant="outline" className="text-[10px] text-amber-700 border-amber-200 bg-amber-50" data-testid={`aut-badge-paused-${rule.id}`}>
                              Paused
                            </Badge>
                          )}
                        </div>
                      </TableCell>

                      <TableCell className="hidden lg:table-cell">
                        <Badge variant="outline" className={`text-xs ${AUTOMATION_CATEGORY_COLORS[rule.category]}`} data-testid={`aut-category-${rule.category}`}>
                          {AUTOMATION_CATEGORY_LABELS[rule.category]}
                        </Badge>
                      </TableCell>

                      <TableCell className="hidden xl:table-cell text-sm text-muted-foreground max-w-[140px] truncate">
                        {trigger?.label ?? rule.triggerType}
                      </TableCell>

                      <TableCell><StatusBadge status={rule.status} /></TableCell>

                      <TableCell className="hidden md:table-cell">
                        {row.governanceStatus ? (
                          <div className="flex flex-col gap-1">
                            <Badge variant="outline" className={`text-xs ${GOVERNANCE_STATUS_COLORS[row.governanceStatus]}`} data-testid={`aut-gov-status-${rule.id}`}>
                              {GOVERNANCE_STATUS_LABELS[row.governanceStatus]}
                            </Badge>
                            {row.riskLevel && (
                              <Badge variant="outline" className={`text-[10px] ${RISK_LEVEL_COLORS[row.riskLevel]}`}>
                                {RISK_LEVEL_LABELS[row.riskLevel]} Risk
                              </Badge>
                            )}
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-xs">—</span>
                        )}
                      </TableCell>

                      <TableCell className="hidden lg:table-cell text-right">
                        {row.successRate !== null ? (
                          <span className={`text-sm font-semibold ${row.successRate >= 90 ? "text-emerald-600" : row.successRate >= 70 ? "text-amber-600" : "text-red-600"}`} data-testid={`aut-success-rate-${rule.id}`}>
                            {row.successRate}%
                          </span>
                        ) : (
                          <span className="text-muted-foreground text-xs">—</span>
                        )}
                      </TableCell>

                      <TableCell className="hidden xl:table-cell text-right text-sm font-medium">{row.totalExecutions}</TableCell>
                      <TableCell className="hidden lg:table-cell">{fmtDateTime(rule.lastExecutedAt)}</TableCell>
                      <TableCell className="hidden xl:table-cell">{fmtDateTime(row.nextRunAt)}</TableCell>
                      <TableCell className="hidden xl:table-cell">{fmtDateTime(rule.updatedAt)}</TableCell>

                      <TableCell className="text-right">
                        <Button size="sm" variant="outline" className="text-xs h-7" onClick={() => onView(rule)} data-testid={`aut-btn-view-${rule.id}`}>
                          <Eye className="h-3 w-3 mr-1" /> View
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TooltipProvider>
        )}
      </div>
    </div>
  );
}
