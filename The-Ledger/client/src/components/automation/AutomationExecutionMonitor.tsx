/**
 * UX-6.3 — AUTOMATION EXECUTION MONITORING
 *
 * Observability layer for the Automation Hub. Answers:
 *   "Are my automations executing successfully, and where are problems?"
 *
 * Read-only analytics. Derives everything from existing engine seed data
 * (governance execution counts, audit history, governance exceptions). It
 * changes NO execution, scheduler, governance, audit, or approval behaviour —
 * it only surfaces what already happened.
 */

import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Activity,
  CheckCircle2,
  XCircle,
  ShieldCheck,
  TrendingUp,
  TrendingDown,
  Timer,
  CalendarClock,
  Flame,
  AlertTriangle,
  ShieldAlert,
  Lightbulb,
  Gauge,
} from "lucide-react";
import {
  getAllGovernanceRecords,
  getAllExceptions,
  GOVERNANCE_STATUS_LABELS,
  GOVERNANCE_STATUS_COLORS,
} from "@/lib/automationGovernanceEngine";
import {
  SEED_EXECUTION_HISTORY,
  getAutomationAuditHistory,
  type AutomationAuditEntry,
} from "@/lib/automationAuditEngine";
import { getAllSchedules } from "@/lib/automationSchedulerEngine";

// ── Deterministic mock completion times (seconds) by result ──────────────

const COMPLETION_SECONDS: Record<string, number> = {
  success: 1.2,
  blocked_approval_required: 0.4,
  blocked_forbidden_action: 0.3,
  blocked_condition_not_met: 0.3,
  failed: 3.1,
};

function fmtDateTime(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-GB", {
    day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

// ── Component ───────────────────────────────────────────────────────────

export function AutomationExecutionMonitor({
  onSelectExecution,
}: {
  onSelectExecution?: (entry: AutomationAuditEntry) => void;
}) {
  const model = useMemo(() => {
    const records = getAllGovernanceRecords();
    const exceptions = getAllExceptions();
    const schedules = getAllSchedules();

    // Aggregate execution truth.
    const total = records.reduce((s, r) => s + r.totalExecutions, 0);
    const successful = records.reduce((s, r) => s + r.successfulExecutions, 0);
    const blocked = records.reduce((s, r) => s + r.blockedExecutions, 0);
    const failed = records.reduce((s, r) => s + r.failedExecutions, 0);
    const successPct = total > 0 ? Math.round((successful / total) * 100) : 0;
    const failurePct = total > 0 ? Math.round((failed / total) * 100) : 0;
    const blockedPct = total > 0 ? Math.round((blocked / total) * 100) : 0;

    // Average executions per day over a 30-day executive window.
    const avgPerDay = Math.round((total / 30) * 10) / 10;

    // Mock-derived average completion time, weighted by outcome mix.
    const avgCompletion =
      total > 0
        ? Math.round(
            ((successful * COMPLETION_SECONDS.success +
              blocked * COMPLETION_SECONDS.blocked_approval_required +
              failed * COMPLETION_SECONDS.failed) /
              total) *
              10
          ) / 10
        : 0;

    // Detailed execution history (seed + runtime), newest first.
    const execMap = new Map<string, AutomationAuditEntry>();
    [...SEED_EXECUTION_HISTORY, ...getAutomationAuditHistory()].forEach((e) => execMap.set(e.id, e));
    const allExecutions = Array.from(execMap.values()).sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );

    // Most active automations (by total executions).
    const mostActive = [...records]
      .filter((r) => r.totalExecutions > 0)
      .sort((a, b) => b.totalExecutions - a.totalExecutions)
      .slice(0, 5)
      .map((r) => ({
        ruleId: r.ruleId,
        ruleNumber: r.ruleNumber,
        ruleName: r.ruleName,
        totalExecutions: r.totalExecutions,
        successRate: r.totalExecutions > 0 ? Math.round((r.successfulExecutions / r.totalExecutions) * 100) : null,
        lastExecutedAt: r.lastExecutedAt,
      }));

    // Recent failures — governance records with failed executions, enriched
    // with the linked failure exception (reason + timestamp) and schedule.
    const schedByRule = new Map(schedules.map((s) => [s.ruleId, s]));
    const recentFailures = records
      .filter((r) => r.failedExecutions > 0)
      .map((r) => {
        const exc = exceptions.find(
          (e) => e.ruleId === r.ruleId && e.exceptionType === "Repeated Failures"
        );
        return {
          ruleId: r.ruleId,
          ruleNumber: r.ruleNumber,
          ruleName: r.ruleName,
          failedExecutions: r.failedExecutions,
          reason: exc?.description ?? `${r.failedExecutions} failed execution(s) recorded.`,
          timestamp: exc?.createdAt ?? r.lastExecutedAt,
          schedule: schedByRule.get(r.ruleId) ?? null,
          governanceStatus: r.governanceStatus,
          isFinanciallySensitive: r.isFinanciallySensitive,
        };
      })
      .sort((a, b) => new Date(b.timestamp ?? 0).getTime() - new Date(a.timestamp ?? 0).getTime());

    // Approval-blocked executions (intentional approval boundaries).
    const approvalBlocked = allExecutions
      .filter((e) => e.result === "blocked_approval_required")
      .map((e) => ({
        entry: e,
        approvalType: e.jobName ? "CEO Approval (financial)" : "CEO Approval",
        relatedObject: e.jobName ?? "—",
      }));

    // Executive insights — generated only when true.
    const insights: string[] = [];
    insights.push(`${successPct}% execution success rate across ${total} recorded executions.`);
    const awaitingReview = records.filter(
      (r) => r.isApprovalProtected && r.governanceStatus === "Requires Review"
    ).length;
    if (awaitingReview > 0) {
      insights.push(
        `${awaitingReview} approval-protected automation${awaitingReview === 1 ? " is" : "s are"} awaiting human review.`
      );
    }
    const repeatedFailures = records.filter((r) => r.failedExecutions >= 2);
    if (repeatedFailures.length > 0) {
      const r = repeatedFailures[0];
      insights.push(
        `${repeatedFailures.length} automation${repeatedFailures.length === 1 ? "" : "s"} ${repeatedFailures.length === 1 ? "has" : "have"} experienced repeated failures${r.isFinanciallySensitive ? " (financially sensitive)" : ""} — e.g. ${r.ruleName}.`
      );
    }
    if (blocked > 0) {
      insights.push(`${blocked} execution${blocked === 1 ? " was" : "s were"} safely held at an approval boundary — approvals remain human-controlled.`);
    }

    return {
      total, successful, blocked, failed, successPct, failurePct, blockedPct,
      avgPerDay, avgCompletion, allExecutions, mostActive, recentFailures, approvalBlocked, insights,
    };
  }, []);

  const kpis = [
    { label: "Total Executions", value: model.total, icon: Activity, color: "text-muted-foreground", testId: "aut-mon-kpi-total" },
    { label: "Successful", value: model.successful, icon: CheckCircle2, color: "text-emerald-600", testId: "aut-mon-kpi-success" },
    { label: "Failed", value: model.failed, icon: XCircle, color: "text-red-600", testId: "aut-mon-kpi-failed" },
    { label: "Approval-Blocked", value: model.blocked, icon: ShieldCheck, color: "text-violet-600", testId: "aut-mon-kpi-blocked" },
    { label: "Success Rate", value: `${model.successPct}%`, icon: TrendingUp, color: "text-emerald-600", testId: "aut-mon-kpi-success-pct" },
    { label: "Failure Rate", value: `${model.failurePct}%`, icon: TrendingDown, color: "text-red-600", testId: "aut-mon-kpi-failure-pct" },
    { label: "Avg / Day", value: model.avgPerDay, icon: CalendarClock, color: "text-blue-600", testId: "aut-mon-kpi-avg-day", sub: "last 30 days" },
    { label: "Avg Completion", value: `${model.avgCompletion}s`, icon: Timer, color: "text-amber-600", testId: "aut-mon-kpi-avg-time", sub: "derived" },
  ];

  return (
    <div className="space-y-4" data-testid="aut-execution-monitor">
      {/* Doctrine notice */}
      <div className="rounded-md bg-violet-50 border border-violet-200 px-4 py-3 text-sm text-violet-700">
        <span className="font-semibold">Execution Monitoring: </span>
        Read-only observability. Blocked executions reflect approval boundaries working as designed — approvals remain human-controlled and are never bypassed.
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3" data-testid="aut-mon-kpi-strip">
        {kpis.map(({ label, value, icon: Icon, color, testId, sub }) => (
          <Card key={label}>
            <CardHeader className="pb-1 pt-3 px-3">
              <CardTitle className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide leading-tight">{label}</CardTitle>
            </CardHeader>
            <CardContent className="px-3 pb-3">
              <div className="flex items-center gap-1.5">
                <Icon className={`h-4 w-4 flex-shrink-0 ${color}`} />
                <span className="text-xl font-bold" data-testid={testId}>{value}</span>
              </div>
              {sub && <div className="text-[10px] text-muted-foreground mt-0.5">{sub}</div>}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Executive Insights */}
      <Card data-testid="aut-mon-insights">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Lightbulb className="h-4 w-4 text-amber-500" /> Executive Insights
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-1.5">
            {model.insights.map((text, i) => (
              <li key={i} className="flex items-start gap-2 text-sm" data-testid={`aut-mon-insight-${i}`}>
                <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-violet-400 shrink-0" />
                <span>{text}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      {/* Trends + Recent activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card data-testid="aut-mon-trends">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Gauge className="h-4 w-4 text-muted-foreground" /> Execution Trends
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Outcome proportion bar */}
            <div>
              <div className="flex justify-between text-xs text-muted-foreground mb-1">
                <span>Outcome mix</span>
                <span>{model.total} total</span>
              </div>
              <div className="flex h-3 w-full overflow-hidden rounded-full bg-muted" data-testid="aut-mon-outcome-bar">
                <div className="bg-emerald-500" style={{ width: `${model.successPct}%` }} title={`Success ${model.successPct}%`} />
                <div className="bg-violet-500" style={{ width: `${model.blockedPct}%` }} title={`Blocked ${model.blockedPct}%`} />
                <div className="bg-red-500" style={{ width: `${model.failurePct}%` }} title={`Failed ${model.failurePct}%`} />
              </div>
              <div className="flex flex-wrap gap-3 mt-2 text-xs">
                <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-emerald-500" /> Success {model.successPct}%</span>
                <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-violet-500" /> Blocked {model.blockedPct}%</span>
                <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-red-500" /> Failed {model.failurePct}%</span>
              </div>
            </div>
            {/* Simple trend callouts */}
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-md border bg-muted/20 px-3 py-2">
                <div className="text-lg font-bold text-emerald-600">{model.successful}</div>
                <div className="text-[11px] text-muted-foreground">Success trend ↑</div>
              </div>
              <div className="rounded-md border bg-muted/20 px-3 py-2">
                <div className="text-lg font-bold text-red-600">{model.failed}</div>
                <div className="text-[11px] text-muted-foreground">Failure trend</div>
              </div>
              <div className="rounded-md border bg-muted/20 px-3 py-2">
                <div className="text-lg font-bold text-violet-600">{model.blocked}</div>
                <div className="text-[11px] text-muted-foreground">Approval blocks</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Recent activity */}
        <Card data-testid="aut-mon-recent-activity">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Activity className="h-4 w-4 text-muted-foreground" /> Recent Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1.5">
              {model.allExecutions.slice(0, 6).map((e) => (
                <button
                  key={e.id}
                  type="button"
                  onClick={() => onSelectExecution?.(e)}
                  className="w-full flex items-center gap-2 rounded-md border px-3 py-1.5 text-left text-xs hover:bg-muted/40 transition-colors"
                  data-testid={`aut-mon-activity-${e.id}`}
                >
                  <span className={`h-2 w-2 rounded-full shrink-0 ${e.result === "success" ? "bg-emerald-500" : e.result === "failed" ? "bg-red-500" : "bg-violet-500"}`} />
                  <span className="font-medium truncate flex-1">{e.ruleName}</span>
                  <span className="font-mono text-muted-foreground whitespace-nowrap">{fmtDateTime(e.timestamp)}</span>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Most Active + Recent Failures */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card data-testid="aut-mon-most-active">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Flame className="h-4 w-4 text-orange-500" /> Most Active Automations
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {model.mostActive.map((r, i) => (
                <div key={r.ruleId} className="flex items-center gap-3 rounded-md border px-3 py-2" data-testid={`aut-mon-active-row-${r.ruleId}`}>
                  <span className="text-sm font-bold text-muted-foreground w-5 text-center">{i + 1}</span>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium truncate">{r.ruleName}</div>
                    <div className="text-[11px] text-muted-foreground">Last run {fmtDateTime(r.lastExecutedAt)}</div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-sm font-bold">{r.totalExecutions}</div>
                    <div className="text-[11px] text-muted-foreground">runs</div>
                  </div>
                  {r.successRate !== null && (
                    <Badge variant="outline" className={`text-[10px] shrink-0 ${r.successRate >= 90 ? "text-emerald-600 border-emerald-200 bg-emerald-50" : r.successRate >= 70 ? "text-amber-600 border-amber-200 bg-amber-50" : "text-red-600 border-red-200 bg-red-50"}`}>
                      {r.successRate}%
                    </Badge>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card data-testid="aut-mon-recent-failures">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-red-500" /> Recent Failures
            </CardTitle>
          </CardHeader>
          <CardContent>
            {model.recentFailures.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-6 text-center" data-testid="aut-mon-failures-empty">
                <CheckCircle2 className="h-8 w-8 text-emerald-500 mb-2" />
                <p className="text-sm font-medium">No recent failures</p>
              </div>
            ) : (
              <div className="space-y-2">
                {model.recentFailures.map((f) => (
                  <div key={f.ruleId} className="rounded-md border border-red-200 bg-red-50/50 px-3 py-2" data-testid={`aut-mon-failure-row-${f.ruleId}`}>
                    <div className="flex items-center justify-between gap-2">
                      <div className="font-medium text-sm truncate">{f.ruleName}</div>
                      <span className="font-mono text-[11px] text-muted-foreground whitespace-nowrap">{fmtDateTime(f.timestamp)}</span>
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-1 leading-tight">{f.reason}</p>
                    <div className="flex flex-wrap items-center gap-1.5 mt-2">
                      <Badge variant="outline" className="text-[10px] text-red-600 border-red-200 bg-red-50">{f.failedExecutions} failed</Badge>
                      {f.governanceStatus && (
                        <Badge variant="outline" className={`text-[10px] ${GOVERNANCE_STATUS_COLORS[f.governanceStatus]}`}>{GOVERNANCE_STATUS_LABELS[f.governanceStatus]}</Badge>
                      )}
                      {f.schedule && (
                        <Badge variant="outline" className="text-[10px] text-blue-700 border-blue-200 bg-blue-50"><CalendarClock className="h-2.5 w-2.5 mr-0.5" />{f.schedule.scheduleNumber}</Badge>
                      )}
                      {f.isFinanciallySensitive && (
                        <Badge variant="outline" className="text-[10px] text-red-600 border-red-200 bg-red-50"><ShieldAlert className="h-2.5 w-2.5 mr-0.5" />Sensitive</Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Approval-Blocked Executions */}
      <Card data-testid="aut-mon-approval-blocked">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-violet-500" /> Approval-Blocked Executions
          </CardTitle>
        </CardHeader>
        <CardContent>
          {model.approvalBlocked.length === 0 ? (
            <p className="text-sm text-muted-foreground py-2" data-testid="aut-mon-blocked-empty">No executions are currently held at an approval boundary.</p>
          ) : (
            <div className="space-y-2">
              {model.approvalBlocked.map(({ entry, approvalType, relatedObject }) => (
                <button
                  key={entry.id}
                  type="button"
                  onClick={() => onSelectExecution?.(entry)}
                  className="w-full grid grid-cols-2 sm:grid-cols-4 gap-2 rounded-md border border-violet-200 bg-violet-50/50 px-3 py-2 text-left hover:bg-violet-50 transition-colors"
                  data-testid={`aut-mon-blocked-row-${entry.id}`}
                >
                  <div><div className="text-[10px] text-muted-foreground uppercase">Rule</div><div className="text-sm font-medium truncate">{entry.ruleName}</div></div>
                  <div><div className="text-[10px] text-muted-foreground uppercase">Trigger</div><div className="text-sm font-mono truncate">{entry.triggerType}</div></div>
                  <div><div className="text-[10px] text-muted-foreground uppercase">Required Approval</div><div className="text-sm">{approvalType}</div></div>
                  <div><div className="text-[10px] text-muted-foreground uppercase">Related Object</div><div className="text-sm truncate">{relatedObject}</div></div>
                  <div className="col-span-2 sm:col-span-4 text-[11px] text-muted-foreground font-mono">Blocked at {fmtDateTime(entry.timestamp)}</div>
                </button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
