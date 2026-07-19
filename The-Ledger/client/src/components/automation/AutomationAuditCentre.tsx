/**
 * UX-6.7 — AUTOMATION AUDIT CENTRE
 *
 * A unified, executive, READ-ONLY audit view across every automation source:
 * rule lifecycle, execution history, scheduler audit, governance audit, and
 * governance exceptions. Answers "what changed, who changed it, and what
 * impact did it have?" without hunting across multiple platform areas.
 *
 * Doctrine: audit records are immutable, read-only, and traceable. This view
 * introduces NO edit, delete, suppression, or mutation. It only reads and
 * normalises existing audit/execution data into one executive feed + timeline.
 */

import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import {
  FileSearch,
  Search,
  Eye,
  ShieldAlert,
  ShieldCheck,
  Lightbulb,
  ListChecks,
  CalendarClock,
  Gavel,
  Activity,
  FileWarning,
  Rows3,
  GitCommitVertical,
} from "lucide-react";
import {
  type AutomationCategory,
  AUTOMATION_CATEGORY_LABELS,
  AUTOMATION_CATEGORY_COLORS,
} from "@/lib/automationEngine";
import { getAllRules } from "@/lib/automationBuilderEngine";
import {
  SEED_EXECUTION_HISTORY,
  getAutomationAuditHistory,
} from "@/lib/automationAuditEngine";
import {
  getScheduleAuditLog,
  getAllSchedules,
} from "@/lib/automationSchedulerEngine";
import {
  type AutomationRiskLevel,
  type AutomationGovernanceStatus,
  RISK_LEVEL_LABELS,
  RISK_LEVEL_COLORS,
  GOVERNANCE_STATUS_LABELS,
  GOVERNANCE_STATUS_COLORS,
  getAllGovernanceRecords,
  getGovernanceAuditLog,
  getAllExceptions,
} from "@/lib/automationGovernanceEngine";

// ── Unified event model ─────────────────────────────────────────────────

export type AuditEventCategory = "Automation" | "Scheduler" | "Governance" | "Execution" | "Exception";

export interface UnifiedAuditEvent {
  id: string;
  timestamp: string;
  eventCategory: AuditEventCategory;
  eventType: string;
  user: string;
  automationName: string;
  automationNumber: string | null;
  ruleId: string | null;
  scheduleNumber: string | null;
  category: AutomationCategory | null;
  riskLevel: AutomationRiskLevel | null;
  governanceStatus: AutomationGovernanceStatus | null;
  isFinanciallySensitive: boolean;
  isApprovalProtected: boolean;
  previousState: string | null;
  newState: string | null;
  triggerSource: string | null;
  summary: string;
  auditRefs: string[];
}

const EXECUTION_EVENT_LABEL: Record<string, string> = {
  success: "Successful Execution",
  failed: "Failed Execution",
  blocked_approval_required: "Approval Blocked",
  blocked_forbidden_action: "Governance Blocked",
  blocked_condition_not_met: "Governance Blocked",
};

const BUILDER_EVENT_LABEL: Record<string, string> = {
  automation_created: "Rule Created",
  automation_updated: "Rule Updated",
  automation_duplicated: "Rule Duplicated",
  automation_archived: "Rule Archived",
};

const GOV_ACTION_LABEL: Record<string, string> = {
  "Mark Compliant": "Marked Compliant",
  "Restrict Automation": "Restricted",
  "Suspend Automation": "Suspended",
  "Restore Automation": "Restored",
};

/** Builds the unified, de-duplicated audit feed (newest first). Pure. */
export function buildUnifiedAuditFeed(): UnifiedAuditEvent[] {
  const records = getAllGovernanceRecords();
  const govByRule = new Map(records.map((r) => [r.ruleId, r]));
  const schedules = getAllSchedules();
  const schedNumberById = new Map(schedules.map((s) => [s.id, s.scheduleNumber]));

  const enrich = (ruleId: string | null) => {
    const g = ruleId ? govByRule.get(ruleId) : undefined;
    return {
      category: g?.ruleCategory ?? null,
      riskLevel: g?.riskLevel ?? null,
      governanceStatus: g?.governanceStatus ?? null,
      isFinanciallySensitive: g?.isFinanciallySensitive ?? false,
      isApprovalProtected: g?.isApprovalProtected ?? false,
    };
  };

  const events: UnifiedAuditEvent[] = [];

  // 1. Rule lifecycle (creation provenance from existing rule records).
  for (const rule of getAllRules()) {
    const e = enrich(rule.id);
    events.push({
      id: `rule-created-${rule.id}`,
      timestamp: rule.createdAt,
      eventCategory: "Automation",
      eventType: "Rule Created",
      user: rule.createdBy,
      automationName: rule.name,
      automationNumber: rule.ruleNumber,
      ruleId: rule.id,
      scheduleNumber: null,
      ...e,
      category: rule.category,
      previousState: null,
      newState: "active",
      triggerSource: "builder",
      summary: `Rule '${rule.name}' (${rule.ruleNumber}) was created by ${rule.createdBy}.`,
      auditRefs: [rule.id],
    });
  }

  // 2. Runtime builder + execution audit entries.
  const execMap = new Map<string, (typeof SEED_EXECUTION_HISTORY)[number]>();
  [...SEED_EXECUTION_HISTORY, ...getAutomationAuditHistory()].forEach((x) => execMap.set(x.id, x));
  for (const a of Array.from(execMap.values())) {
    const e = enrich(a.ruleId);
    const isBuilder = a.triggerType === "builder_action";
    events.push({
      id: a.id,
      timestamp: a.timestamp,
      eventCategory: isBuilder ? "Automation" : "Execution",
      eventType: isBuilder
        ? BUILDER_EVENT_LABEL[a.actionType] ?? a.actionLabel
        : EXECUTION_EVENT_LABEL[a.result] ?? a.result,
      user: a.initiatedBy,
      automationName: a.ruleName,
      automationNumber: a.ruleNumber,
      ruleId: a.ruleId,
      scheduleNumber: null,
      ...e,
      previousState: isBuilder ? null : a.approvalStateAtExecution,
      newState: a.result,
      triggerSource: a.triggerType,
      summary: a.summary,
      auditRefs: [a.id, a.executionId],
    });
  }

  // 3. Scheduler audit.
  for (const s of getScheduleAuditLog()) {
    const e = enrich(s.ruleId);
    events.push({
      id: s.id,
      timestamp: s.timestamp,
      eventCategory: "Scheduler",
      eventType: s.eventType,
      user: s.performedBy,
      automationName: s.scheduleName,
      automationNumber: s.ruleNumber,
      ruleId: s.ruleId,
      scheduleNumber: schedNumberById.get(s.scheduleId) ?? null,
      ...e,
      previousState: s.previousStatus,
      newState: s.newStatus,
      triggerSource: "scheduler",
      summary: s.notes || `${s.eventType}: ${s.scheduleName}`,
      auditRefs: [s.id, s.scheduleId],
    });
  }

  // 4. Governance audit.
  for (const g of getGovernanceAuditLog()) {
    const e = enrich(g.ruleId);
    events.push({
      id: g.id,
      timestamp: g.timestamp,
      eventCategory: "Governance",
      eventType: GOV_ACTION_LABEL[g.action] ?? g.action,
      user: g.performedBy,
      automationName: g.ruleName,
      automationNumber: g.ruleNumber,
      ruleId: g.ruleId,
      scheduleNumber: null,
      ...e,
      previousState: g.previousStatus,
      newState: g.newStatus,
      triggerSource: "governance",
      summary: g.notes || `${g.action}: ${g.ruleName}`,
      auditRefs: [g.id],
    });
  }

  // 5. Governance exceptions.
  for (const x of getAllExceptions()) {
    const e = enrich(x.ruleId);
    events.push({
      id: x.id,
      timestamp: x.createdAt,
      eventCategory: "Exception",
      eventType: "Exception Raised",
      user: "system",
      automationName: x.ruleName,
      automationNumber: x.ruleNumber,
      ruleId: x.ruleId,
      scheduleNumber: null,
      ...e,
      previousState: null,
      newState: x.status,
      triggerSource: "governance",
      summary: `${x.exceptionType} (${x.severity}): ${x.description}`,
      auditRefs: [x.id],
    });
  }

  return events.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
}

// ── Helpers ─────────────────────────────────────────────────────────────

function fmtDateTime(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-GB", {
    day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
  });
}
function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", { weekday: "short", day: "2-digit", month: "short", year: "numeric" });
}

const CATEGORY_ICON: Record<AuditEventCategory, typeof Activity> = {
  Automation: ListChecks,
  Scheduler: CalendarClock,
  Governance: Gavel,
  Execution: Activity,
  Exception: FileWarning,
};
const CATEGORY_COLOR: Record<AuditEventCategory, string> = {
  Automation: "text-violet-600 border-violet-200 bg-violet-50",
  Scheduler: "text-blue-600 border-blue-200 bg-blue-50",
  Governance: "text-amber-700 border-amber-200 bg-amber-50",
  Execution: "text-muted-foreground border-border bg-muted",
  Exception: "text-red-600 border-red-200 bg-red-50",
};

// ── Detail dialog ───────────────────────────────────────────────────────

function AuditDetailDialog({ event, onClose }: { event: UnifiedAuditEvent; onClose: () => void }) {
  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto" data-testid="aut-audc-detail-dialog">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><FileSearch className="h-4 w-4" />{event.eventType}</DialogTitle>
          <DialogDescription>{event.automationName}{event.automationNumber ? ` · ${event.automationNumber}` : ""}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="flex items-start gap-2 rounded-md bg-muted border border-border px-3 py-2 text-xs text-muted-foreground" data-testid="aut-audc-detail-immutable">
            <ShieldCheck className="h-3.5 w-3.5 shrink-0 mt-0.5" /> Immutable audit record — read-only. Cannot be edited or deleted.
          </div>
          <div><span className="text-xs text-muted-foreground">Event Summary</span><p className="mt-1 text-sm rounded border p-2 bg-muted/20">{event.summary}</p></div>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div><span className="text-xs text-muted-foreground">Timestamp</span><div className="mt-1">{fmtDateTime(event.timestamp)}</div></div>
            <div><span className="text-xs text-muted-foreground">User</span><div className="mt-1 font-medium">{event.user}</div></div>
            <div><span className="text-xs text-muted-foreground">Category</span><div className="mt-1"><Badge variant="outline" className={`text-xs ${CATEGORY_COLOR[event.eventCategory]}`}>{event.eventCategory}</Badge></div></div>
            <div><span className="text-xs text-muted-foreground">Trigger Source</span><div className="mt-1 font-mono text-xs">{event.triggerSource ?? "—"}</div></div>
            <div><span className="text-xs text-muted-foreground">Previous State</span><div className="mt-1 font-mono text-xs">{event.previousState ?? "—"}</div></div>
            <div><span className="text-xs text-muted-foreground">New State</span><div className="mt-1 font-mono text-xs">{event.newState ?? "—"}</div></div>
          </div>
          {/* Governance + financial context */}
          <div data-testid="aut-audc-detail-context">
            <span className="text-xs text-muted-foreground">Governance & Financial Context</span>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              {event.governanceStatus && (<Badge variant="outline" className={`text-xs ${GOVERNANCE_STATUS_COLORS[event.governanceStatus]}`}>{GOVERNANCE_STATUS_LABELS[event.governanceStatus]}</Badge>)}
              {event.riskLevel && (<Badge variant="outline" className={`text-xs ${RISK_LEVEL_COLORS[event.riskLevel]}`}>{RISK_LEVEL_LABELS[event.riskLevel]} Risk</Badge>)}
              {event.isFinanciallySensitive && (<Badge variant="outline" className="text-xs text-red-600 border-red-200 bg-red-50"><ShieldAlert className="h-3 w-3 mr-1" />Financially Sensitive</Badge>)}
              {event.isApprovalProtected && (<Badge variant="outline" className="text-xs text-violet-700 border-violet-200 bg-violet-50"><ShieldCheck className="h-3 w-3 mr-1" />Approval Protected</Badge>)}
              {!event.governanceStatus && !event.riskLevel && !event.isFinanciallySensitive && (<span className="text-xs text-muted-foreground">No governance or financial flags.</span>)}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div><span className="text-xs text-muted-foreground">Related Automation</span><div className="mt-1">{event.automationNumber ?? "—"}</div></div>
            <div><span className="text-xs text-muted-foreground">Related Schedule</span><div className="mt-1">{event.scheduleNumber ?? "—"}</div></div>
          </div>
          <div><span className="text-xs text-muted-foreground">Audit References</span>
            <div className="mt-1 flex flex-wrap gap-1.5">{event.auditRefs.map((r) => (<span key={r} className="font-mono text-[10px] bg-muted px-2 py-0.5 rounded">{r}</span>))}</div>
          </div>
          <Button size="sm" variant="outline" onClick={onClose}>Close</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Main component ──────────────────────────────────────────────────────

const PAGE = 25;

export function AutomationAuditCentre() {
  const feed = useMemo(() => buildUnifiedAuditFeed(), []);

  const [search, setSearch] = useState("");
  const [catFilter, setCatFilter] = useState<AuditEventCategory | "all">("all");
  const [userFilter, setUserFilter] = useState<string>("all");
  const [riskFilter, setRiskFilter] = useState<AutomationRiskLevel | "all">("all");
  const [govFilter, setGovFilter] = useState<AutomationGovernanceStatus | "all">("all");
  const [onlySensitive, setOnlySensitive] = useState(false);
  const [onlyProtected, setOnlyProtected] = useState(false);
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [view, setView] = useState<"feed" | "timeline">("feed");
  const [limit, setLimit] = useState(PAGE);
  const [selected, setSelected] = useState<UnifiedAuditEvent | null>(null);

  const users = useMemo(() => Array.from(new Set(feed.map((e) => e.user))).sort(), [feed]);

  const kpis = useMemo(() => {
    const byCat = (c: AuditEventCategory) => feed.filter((e) => e.eventCategory === c).length;
    return {
      total: feed.length,
      ruleChanges: byCat("Automation"),
      scheduleChanges: byCat("Scheduler"),
      governanceActions: byCat("Governance"),
      executionEvents: byCat("Execution"),
      approvalBlocked: feed.filter((e) => e.eventType === "Approval Blocked").length,
      financiallySensitive: feed.filter((e) => e.isFinanciallySensitive).length,
      exceptions: byCat("Exception"),
    };
  }, [feed]);

  const filtered = useMemo(() => {
    let r = feed;
    if (catFilter !== "all") r = r.filter((e) => e.eventCategory === catFilter);
    if (userFilter !== "all") r = r.filter((e) => e.user === userFilter);
    if (riskFilter !== "all") r = r.filter((e) => e.riskLevel === riskFilter);
    if (govFilter !== "all") r = r.filter((e) => e.governanceStatus === govFilter);
    if (onlySensitive) r = r.filter((e) => e.isFinanciallySensitive);
    if (onlyProtected) r = r.filter((e) => e.isApprovalProtected);
    if (fromDate) { const f = new Date(fromDate).getTime(); r = r.filter((e) => new Date(e.timestamp).getTime() >= f); }
    if (toDate) { const t = new Date(toDate).getTime() + 86_400_000; r = r.filter((e) => new Date(e.timestamp).getTime() <= t); }
    const q = search.trim().toLowerCase();
    if (q) {
      r = r.filter((e) =>
        e.automationName.toLowerCase().includes(q) ||
        e.user.toLowerCase().includes(q) ||
        e.eventType.toLowerCase().includes(q) ||
        e.eventCategory.toLowerCase().includes(q) ||
        (e.automationNumber?.toLowerCase().includes(q) ?? false) ||
        (e.scheduleNumber?.toLowerCase().includes(q) ?? false) ||
        (e.category ? AUTOMATION_CATEGORY_LABELS[e.category].toLowerCase().includes(q) : false) ||
        e.id.toLowerCase().includes(q) ||
        e.auditRefs.some((ref) => ref.toLowerCase().includes(q))
      );
    }
    return r;
  }, [feed, catFilter, userFilter, riskFilter, govFilter, onlySensitive, onlyProtected, fromDate, toDate, search]);

  const visible = filtered.slice(0, limit);

  // Executive insights (data-driven).
  const insights = useMemo(() => {
    const out: string[] = [];
    out.push(`${kpis.ruleChanges} automation change${kpis.ruleChanges === 1 ? "" : "s"} recorded.`);
    const interventions = feed.filter((e) => e.eventType === "Restricted" || e.eventType === "Suspended").length;
    out.push(interventions > 0 ? `${interventions} governance intervention${interventions === 1 ? "" : "s"} recorded.` : "No governance violations detected.");
    const sensitiveChanges = feed.filter((e) => e.eventCategory === "Automation" && e.isFinanciallySensitive).length;
    if (sensitiveChanges > 0) out.push(`${sensitiveChanges} financially sensitive rule${sensitiveChanges === 1 ? " was" : "s were"} created or modified.`);
    const paused = feed.filter((e) => e.eventType === "Schedule Paused").length;
    if (paused > 0) out.push(`${paused} schedule${paused === 1 ? " was" : "s were"} paused for safety reasons.`);
    return out;
  }, [feed, kpis.ruleChanges]);

  const kpiCards = [
    { label: "Total Events", value: kpis.total, icon: FileSearch, color: "text-muted-foreground", testId: "aut-audc-kpi-total" },
    { label: "Rule Changes", value: kpis.ruleChanges, icon: ListChecks, color: "text-violet-600", testId: "aut-audc-kpi-rules" },
    { label: "Schedule Changes", value: kpis.scheduleChanges, icon: CalendarClock, color: "text-blue-600", testId: "aut-audc-kpi-schedules" },
    { label: "Governance Actions", value: kpis.governanceActions, icon: Gavel, color: "text-amber-700", testId: "aut-audc-kpi-governance" },
    { label: "Execution Events", value: kpis.executionEvents, icon: Activity, color: "text-muted-foreground", testId: "aut-audc-kpi-executions" },
    { label: "Approval-Blocked", value: kpis.approvalBlocked, icon: ShieldCheck, color: "text-violet-600", testId: "aut-audc-kpi-blocked" },
    { label: "Fin. Sensitive", value: kpis.financiallySensitive, icon: ShieldAlert, color: "text-red-600", testId: "aut-audc-kpi-sensitive" },
    { label: "Exceptions", value: kpis.exceptions, icon: FileWarning, color: "text-red-600", testId: "aut-audc-kpi-exceptions" },
  ];

  const selectClass = "h-9 rounded-md border bg-background px-3 text-sm";

  // Group visible events by date for timeline view.
  const timelineGroups = useMemo(() => {
    const groups = new Map<string, UnifiedAuditEvent[]>();
    for (const e of visible) {
      const key = fmtDate(e.timestamp);
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(e);
    }
    return Array.from(groups.entries());
  }, [visible]);

  return (
    <div className="space-y-4" data-testid="aut-audit-centre">
      <div className="rounded-md bg-muted border border-border px-4 py-3 text-sm text-muted-foreground flex items-center gap-2">
        <ShieldCheck className="h-4 w-4 shrink-0" />
        <span><span className="font-semibold">Immutable Audit: </span>A unified, read-only record of all automation activity. Entries cannot be edited, deleted, or suppressed.</span>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3" data-testid="aut-audc-kpi-strip">
        {kpiCards.map(({ label, value, icon: Icon, color, testId }) => (
          <Card key={label}>
            <CardHeader className="pb-1 pt-3 px-3">
              <CardTitle className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide leading-tight">{label}</CardTitle>
            </CardHeader>
            <CardContent className="px-3 pb-3">
              <div className="flex items-center gap-1.5">
                <Icon className={`h-4 w-4 flex-shrink-0 ${color}`} />
                <span className="text-xl font-bold" data-testid={testId}>{value}</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Insights */}
      <Card data-testid="aut-audc-insights">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold flex items-center gap-2"><Lightbulb className="h-4 w-4 text-amber-500" /> Executive Insights</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-1.5">
            {insights.map((line, i) => (
              <li key={i} className="flex items-start gap-2 text-sm" data-testid={`aut-audc-insight-${i}`}>
                <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-slate-400 shrink-0" />
                <span>{line}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      {/* Controls */}
      <div className="space-y-3">
        <div className="flex flex-col lg:flex-row gap-3 lg:items-center">
          <div className="relative w-full lg:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search rule, user, event, schedule, audit ID, category…" value={search} onChange={(e) => { setSearch(e.target.value); setLimit(PAGE); }} className="pl-9" data-testid="aut-audc-search" />
          </div>
          <div className="flex items-center gap-1 lg:ml-auto rounded-md border p-0.5" data-testid="aut-audc-view-toggle">
            <button type="button" onClick={() => setView("feed")} className={`flex items-center gap-1 text-xs rounded px-2.5 py-1 ${view === "feed" ? "bg-violet-600 text-white" : "hover:bg-muted"}`} data-testid="aut-audc-view-feed"><Rows3 className="h-3.5 w-3.5" /> Feed</button>
            <button type="button" onClick={() => setView("timeline")} className={`flex items-center gap-1 text-xs rounded px-2.5 py-1 ${view === "timeline" ? "bg-violet-600 text-white" : "hover:bg-muted"}`} data-testid="aut-audc-view-timeline"><GitCommitVertical className="h-3.5 w-3.5" /> Timeline</button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2" data-testid="aut-audc-filters">
          <select className={selectClass} value={catFilter} onChange={(e) => { setCatFilter(e.target.value as AuditEventCategory | "all"); setLimit(PAGE); }} data-testid="aut-audc-filter-category">
            <option value="all">All Event Types</option>
            <option value="Automation">Automation</option>
            <option value="Scheduler">Scheduler</option>
            <option value="Governance">Governance</option>
            <option value="Execution">Execution</option>
            <option value="Exception">Exception</option>
          </select>
          <select className={selectClass} value={userFilter} onChange={(e) => { setUserFilter(e.target.value); setLimit(PAGE); }} data-testid="aut-audc-filter-user">
            <option value="all">All Users</option>
            {users.map((u) => (<option key={u} value={u}>{u}</option>))}
          </select>
          <select className={selectClass} value={riskFilter} onChange={(e) => { setRiskFilter(e.target.value as AutomationRiskLevel | "all"); setLimit(PAGE); }} data-testid="aut-audc-filter-risk">
            <option value="all">All Risk</option>
            <option value="Low">Low</option><option value="Medium">Medium</option><option value="High">High</option><option value="Critical">Critical</option>
          </select>
          <select className={selectClass} value={govFilter} onChange={(e) => { setGovFilter(e.target.value as AutomationGovernanceStatus | "all"); setLimit(PAGE); }} data-testid="aut-audc-filter-governance">
            <option value="all">All Governance</option>
            <option value="Compliant">Compliant</option><option value="Requires Review">Requires Review</option><option value="Restricted">Restricted</option><option value="Suspended">Suspended</option>
          </select>
          <input type="date" className={selectClass} value={fromDate} onChange={(e) => { setFromDate(e.target.value); setLimit(PAGE); }} data-testid="aut-audc-filter-from" aria-label="From date" />
          <input type="date" className={selectClass} value={toDate} onChange={(e) => { setToDate(e.target.value); setLimit(PAGE); }} data-testid="aut-audc-filter-to" aria-label="To date" />
          <button type="button" onClick={() => setOnlySensitive((v) => !v)} aria-pressed={onlySensitive} data-testid="aut-audc-toggle-sensitive" className={`text-xs rounded-full border px-3 py-1 ${onlySensitive ? "bg-violet-600 text-white border-violet-600" : "bg-background hover:bg-muted/50"}`}>Financially Sensitive</button>
          <button type="button" onClick={() => setOnlyProtected((v) => !v)} aria-pressed={onlyProtected} data-testid="aut-audc-toggle-protected" className={`text-xs rounded-full border px-3 py-1 ${onlyProtected ? "bg-violet-600 text-white border-violet-600" : "bg-background hover:bg-muted/50"}`}>Approval Protected</button>
          <span className="text-xs text-muted-foreground ml-auto" data-testid="aut-audc-count">{filtered.length} of {feed.length}</span>
        </div>
      </div>

      {/* Feed view */}
      {view === "feed" && (
        <div className="border rounded-md overflow-x-auto" data-testid="aut-audc-feed">
          {visible.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground" data-testid="aut-audc-empty">
              <FileSearch className="h-10 w-10 mb-3 opacity-20" />
              <p className="text-sm">No audit events match the current search and filters.</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-xs text-muted-foreground">
                  <th className="px-3 py-2">Timestamp</th>
                  <th className="px-3 py-2">Event</th>
                  <th className="px-3 py-2 hidden md:table-cell">User</th>
                  <th className="px-3 py-2">Automation</th>
                  <th className="px-3 py-2 hidden lg:table-cell">Category</th>
                  <th className="px-3 py-2 hidden lg:table-cell">Risk</th>
                  <th className="px-3 py-2 text-right">View</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((e) => {
                  const Icon = CATEGORY_ICON[e.eventCategory];
                  return (
                    <tr key={e.id} className="border-b last:border-0" data-testid={`aut-audc-row-${e.id}`}>
                      <td className="px-3 py-2 font-mono text-xs text-muted-foreground whitespace-nowrap">{fmtDateTime(e.timestamp)}</td>
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-1.5">
                          <Badge variant="outline" className={`text-[10px] ${CATEGORY_COLOR[e.eventCategory]}`}><Icon className="h-2.5 w-2.5 mr-0.5" />{e.eventType}</Badge>
                          {e.isFinanciallySensitive && <ShieldAlert className="h-3 w-3 text-red-500" />}
                        </div>
                      </td>
                      <td className="px-3 py-2 hidden md:table-cell text-xs">{e.user}</td>
                      <td className="px-3 py-2"><div className="max-w-[200px] truncate font-medium">{e.automationName}</div><div className="font-mono text-[10px] text-muted-foreground">{e.automationNumber ?? ""}</div></td>
                      <td className="px-3 py-2 hidden lg:table-cell">{e.category ? <Badge variant="outline" className={`text-[10px] ${AUTOMATION_CATEGORY_COLORS[e.category]}`}>{AUTOMATION_CATEGORY_LABELS[e.category]}</Badge> : <span className="text-muted-foreground text-xs">—</span>}</td>
                      <td className="px-3 py-2 hidden lg:table-cell">{e.riskLevel ? <Badge variant="outline" className={`text-[10px] ${RISK_LEVEL_COLORS[e.riskLevel]}`}>{RISK_LEVEL_LABELS[e.riskLevel]}</Badge> : <span className="text-muted-foreground text-xs">—</span>}</td>
                      <td className="px-3 py-2 text-right"><Button size="sm" variant="outline" className="text-xs h-7" onClick={() => setSelected(e)} data-testid={`aut-audc-btn-view-${e.id}`}><Eye className="h-3 w-3 mr-1" /> View</Button></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Timeline view */}
      {view === "timeline" && (
        <div className="space-y-5" data-testid="aut-audc-timeline">
          {timelineGroups.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground" data-testid="aut-audc-timeline-empty">
              <FileSearch className="h-10 w-10 mb-3 opacity-20" />
              <p className="text-sm">No audit events match the current search and filters.</p>
            </div>
          ) : (
            timelineGroups.map(([date, items]) => (
              <div key={date} data-testid={`aut-audc-timeline-day`}>
                <div className="sticky top-0 bg-card z-10 text-xs font-semibold uppercase tracking-wide text-muted-foreground py-1">{date}</div>
                <div className="border-l-2 border-muted ml-2 mt-1 space-y-2 pl-4">
                  {items.map((e) => {
                    const Icon = CATEGORY_ICON[e.eventCategory];
                    return (
                      <button key={e.id} type="button" onClick={() => setSelected(e)} className="relative w-full text-left rounded-md border px-3 py-2 hover:bg-muted/40 transition-colors" data-testid={`aut-audc-tl-${e.id}`}>
                        <span className="absolute -left-[1.42rem] top-3 h-2.5 w-2.5 rounded-full bg-violet-400 border-2 border-card" />
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <Badge variant="outline" className={`text-[10px] ${CATEGORY_COLOR[e.eventCategory]}`}><Icon className="h-2.5 w-2.5 mr-0.5" />{e.eventType}</Badge>
                            <span className="text-sm font-medium truncate">{e.automationName}</span>
                          </div>
                          <span className="font-mono text-[10px] text-muted-foreground whitespace-nowrap">{fmtDateTime(e.timestamp)}</span>
                        </div>
                        <p className="text-[11px] text-muted-foreground mt-1 line-clamp-1">{e.summary}</p>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Load more */}
      {limit < filtered.length && (
        <div className="flex justify-center">
          <Button variant="outline" size="sm" onClick={() => setLimit((l) => l + PAGE)} data-testid="aut-audc-load-more">Load more ({filtered.length - limit} remaining)</Button>
        </div>
      )}

      {selected && <AuditDetailDialog event={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}
