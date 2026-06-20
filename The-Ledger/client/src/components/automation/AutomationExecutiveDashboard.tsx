/**
 * UX-6.1 — AUTOMATION HUB EXECUTIVE DASHBOARD
 *
 * A read-only executive overview that answers a single question at a glance:
 *   "How healthy is automation across my business?"
 *
 * Pure presentation layer. Every value is DERIVED from existing engine seed
 * data — no hardcoded counts, no new state, no engine computation changed.
 *
 * Doctrine:
 *   - Read-only. Creates no records, approves nothing, bypasses no workflow.
 *   - Surfaces existing governance / scheduler / audit truth; never weakens it.
 *   - Financially Sensitive / High-Risk automations are surfaced, never hidden.
 *   - No action buttons — this is a visibility layer (deep navigation lives in
 *     the tabs below).
 */

import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Zap,
  CheckCircle2,
  XCircle,
  PauseCircle,
  Activity,
  ShieldAlert,
  AlertTriangle,
  Gauge,
  TrendingUp,
  Ban,
  Clock,
  ShieldCheck,
  FileWarning,
} from "lucide-react";
import { computeAutomationRuleSummary } from "@/lib/automationEngine";
import { getAllRules } from "@/lib/automationBuilderEngine";
import {
  getAllGovernanceRecords,
  computeGovernanceSummary,
  getAllExceptions,
  getGovernanceAuditLog,
} from "@/lib/automationGovernanceEngine";
import {
  getAllSchedules,
  computeScheduleSummaryKPIs,
  getScheduleExecutions,
} from "@/lib/automationSchedulerEngine";
import {
  SEED_EXECUTION_HISTORY,
  getAutomationAuditHistory,
} from "@/lib/automationAuditEngine";

// ── Derived metric helpers (deterministic) ──────────────────────────────

interface ExecutionAggregate {
  total: number;
  successful: number;
  blocked: number;
  failed: number;
  successRate: number; // 0–100, rounded
}

/** Aggregate execution truth across all governance records. */
function aggregateExecutions(
  records: ReturnType<typeof getAllGovernanceRecords>
): ExecutionAggregate {
  const total = records.reduce((s, r) => s + r.totalExecutions, 0);
  const successful = records.reduce((s, r) => s + r.successfulExecutions, 0);
  const blocked = records.reduce((s, r) => s + r.blockedExecutions, 0);
  const failed = records.reduce((s, r) => s + r.failedExecutions, 0);
  const successRate = total > 0 ? Math.round((successful / total) * 100) : 100;
  return { total, successful, blocked, failed, successRate };
}

type HealthBand = "Excellent" | "Good" | "Fair" | "Needs Attention";

interface HealthScore {
  score: number; // 0–100
  band: HealthBand;
  explanation: string;
}

/**
 * Deterministic aggregate health score.
 *
 * Starts from a perfect 100 and applies weighted deductions. Approval-blocks
 * are weighted lightly — a block is the safeguard working as designed, not a
 * failure — while restricted rules and critical-risk automations carry the
 * heaviest weight because they represent unresolved governance exposure.
 */
function computeHealthScore(
  exec: ExecutionAggregate,
  gov: ReturnType<typeof computeGovernanceSummary>,
  ruleSummary: ReturnType<typeof computeAutomationRuleSummary>
): HealthScore {
  const penalties =
    exec.failed * 2 +
    exec.blocked * 1 +
    (gov.restricted + gov.suspended) * 5 +
    gov.criticalRisk * 3 +
    ruleSummary.disabled * 1;

  const score = Math.max(0, Math.min(100, 100 - penalties));

  const band: HealthBand =
    score >= 85
      ? "Excellent"
      : score >= 70
      ? "Good"
      : score >= 55
      ? "Fair"
      : "Needs Attention";

  const explanation =
    band === "Excellent"
      ? "Automation is running cleanly with a high execution success rate and no outstanding governance exposure."
      : band === "Good"
      ? `Automation is healthy — ${exec.successRate}% of executions succeed. A small number of governance items warrant CEO attention.`
      : band === "Fair"
      ? "Automation is functional but several failures or restricted rules are reducing reliability. Review the items below."
      : "Automation needs attention — failures, restrictions, or critical-risk rules are materially affecting reliability.";

  return { score, band, explanation };
}

const HEALTH_BAND_STYLES: Record<HealthBand, { ring: string; text: string; badge: string }> = {
  Excellent: { ring: "text-emerald-500", text: "text-emerald-600", badge: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  Good: { ring: "text-blue-500", text: "text-blue-600", badge: "bg-blue-50 text-blue-700 border-blue-200" },
  Fair: { ring: "text-amber-500", text: "text-amber-600", badge: "bg-amber-50 text-amber-700 border-amber-200" },
  "Needs Attention": { ring: "text-red-500", text: "text-red-600", badge: "bg-red-50 text-red-700 border-red-200" },
};

/**
 * "Last 24 hours" relative to the dataset's most recent automation activity.
 * Seed timestamps are historical, so a wall-clock window would always be empty
 * and read as broken; instead we anchor the window to the latest execution in
 * the combined audit history — a genuine 24h slice of the dataset's own clock.
 */
function computeLast24h(
  executions: ReturnType<typeof getAutomationAuditHistory>,
  governanceAudit: ReturnType<typeof getGovernanceAuditLog>
) {
  if (executions.length === 0) {
    return { completed: 0, failures: 0, approvalBlocks: 0, interventions: 0 };
  }
  const latest = Math.max(...executions.map((e) => new Date(e.timestamp).getTime()));
  const windowStart = latest - 24 * 60 * 60 * 1000;
  const inWindow = executions.filter((e) => new Date(e.timestamp).getTime() >= windowStart);

  const completed = inWindow.filter((e) => e.result === "success").length;
  const failures = inWindow.filter((e) => e.result === "failed").length;
  const approvalBlocks = inWindow.filter((e) => e.result === "blocked_approval_required").length;
  const interventions = governanceAudit.filter(
    (g) => new Date(g.timestamp).getTime() >= windowStart
  ).length;

  return { completed, failures, approvalBlocks, interventions };
}

// ── Component ───────────────────────────────────────────────────────────

export function AutomationExecutiveDashboard() {
  const data = useMemo(() => {
    const rules = getAllRules();
    const ruleSummary = computeAutomationRuleSummary(rules);
    const govRecords = getAllGovernanceRecords();
    const gov = computeGovernanceSummary(govRecords);
    const exec = aggregateExecutions(govRecords);

    const schedules = getAllSchedules();
    const schedKPIs = computeScheduleSummaryKPIs(schedules, getScheduleExecutions());

    const health = computeHealthScore(exec, gov, ruleSummary);

    const runtimeExecutions = getAutomationAuditHistory();
    const execMap = new Map<string, (typeof SEED_EXECUTION_HISTORY)[number]>();
    [...SEED_EXECUTION_HISTORY, ...runtimeExecutions].forEach((e) => execMap.set(e.id, e));
    const allExecutions = Array.from(execMap.values());
    const last24h = computeLast24h(allExecutions, getGovernanceAuditLog());

    // High-risk OR financially sensitive automations (governance truth).
    const highRiskOrSensitive = govRecords.filter(
      (r) => r.isFinanciallySensitive || r.riskLevel === "High" || r.riskLevel === "Critical"
    ).length;

    // Requires-attention items (only surfaced when count > 0).
    const restrictedOrSuspended = gov.restricted + gov.suspended;
    const highRiskAwaitingReview = govRecords.filter(
      (r) => r.governanceStatus === "Requires Review" && (r.riskLevel === "High" || r.riskLevel === "Critical")
    ).length;
    const approvalProtectedSchedules = schedules.filter((s) => s.isFinanciallySensitive).length;
    const openExceptions = getAllExceptions().filter(
      (e) => e.status === "Open" || e.status === "Investigating" || e.status === "Awaiting Approval"
    ).length;

    return {
      ruleSummary,
      gov,
      exec,
      schedKPIs,
      health,
      last24h,
      highRiskOrSensitive,
      attention: {
        failed: exec.failed,
        restrictedOrSuspended,
        highRiskAwaitingReview,
        approvalProtectedSchedules,
        openExceptions,
      },
    };
  }, []);

  const { ruleSummary, exec, schedKPIs, health, last24h, highRiskOrSensitive, attention } = data;
  const bandStyle = HEALTH_BAND_STYLES[health.band];

  // Enhanced KPI tiles (executive layer — distinct testIds from the legacy strip).
  const kpiTiles = [
    { label: "Total Automations", value: ruleSummary.total, icon: Zap, color: "text-slate-600", testId: "aut-exec-kpi-total" },
    { label: "Active", value: ruleSummary.active, icon: CheckCircle2, color: "text-emerald-600", testId: "aut-exec-kpi-active" },
    { label: "Paused", value: schedKPIs.paused, icon: PauseCircle, color: "text-amber-600", testId: "aut-exec-kpi-paused", sub: "schedules" },
    { label: "Disabled", value: ruleSummary.disabled, icon: Ban, color: "text-slate-500", testId: "aut-exec-kpi-disabled" },
    { label: "Success Rate", value: `${exec.successRate}%`, icon: TrendingUp, color: "text-emerald-600", testId: "aut-exec-kpi-success-rate", sub: `${exec.successful} successful` },
    { label: "Failed Executions", value: exec.failed, icon: XCircle, color: "text-red-600", testId: "aut-exec-kpi-failed" },
    { label: "Approval-Blocked", value: exec.blocked, icon: ShieldCheck, color: "text-violet-600", testId: "aut-exec-kpi-blocked", sub: "safeguard held" },
    { label: "High-Risk / Sensitive", value: highRiskOrSensitive, icon: ShieldAlert, color: "text-red-600", testId: "aut-exec-kpi-high-risk" },
  ];

  // Requires-attention items (filtered to non-zero).
  const attentionItems = [
    { key: "failed", count: attention.failed, label: "Failed executions", desc: "Executions that did not complete successfully — review for recurring faults.", icon: XCircle, tone: "red" },
    { key: "restricted", count: attention.restrictedOrSuspended, label: "Restricted / suspended rules", desc: "Automations halted by CEO governance and unable to execute while restricted.", icon: Ban, tone: "amber" },
    { key: "high-risk", count: attention.highRiskAwaitingReview, label: "High-risk rules awaiting review", desc: "High or Critical risk automations flagged Requires Review, pending CEO inspection.", icon: ShieldAlert, tone: "red" },
    { key: "approval-protected", count: attention.approvalProtectedSchedules, label: "Approval-protected schedules", desc: "Financially sensitive schedules whose queued actions require approval before execution.", icon: Clock, tone: "violet" },
    { key: "exceptions", count: attention.openExceptions, label: "Open governance exceptions", desc: "Governance exceptions that are open, under investigation, or awaiting CEO approval.", icon: FileWarning, tone: "amber" },
  ].filter((i) => i.count > 0);

  const TONE: Record<string, string> = {
    red: "text-red-600 bg-red-50 border-red-200",
    amber: "text-amber-700 bg-amber-50 border-amber-200",
    violet: "text-violet-700 bg-violet-50 border-violet-200",
  };

  // Health gauge geometry.
  const radius = 52;
  const circumference = 2 * Math.PI * radius;
  const dash = (health.score / 100) * circumference;

  return (
    <section className="space-y-4" data-testid="aut-executive-dashboard">
      {/* Row 1: Health · Last 24h · Requires Attention */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Automation Health */}
        <Card data-testid="aut-health-card" className="overflow-hidden">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Gauge className="h-4 w-4 text-muted-foreground" /> Automation Health
            </CardTitle>
          </CardHeader>
          <CardContent className="flex items-center gap-4">
            <div className="relative shrink-0">
              <svg width="128" height="128" viewBox="0 0 128 128" className="-rotate-90">
                <circle cx="64" cy="64" r={radius} fill="none" stroke="currentColor" strokeWidth="10" className="text-muted/20" />
                <circle
                  cx="64" cy="64" r={radius} fill="none" stroke="currentColor" strokeWidth="10" strokeLinecap="round"
                  strokeDasharray={`${dash} ${circumference}`} className={bandStyle.ring}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className={`text-3xl font-bold ${bandStyle.text}`} data-testid="aut-health-score">{health.score}%</span>
              </div>
            </div>
            <div className="min-w-0">
              <Badge variant="outline" className={`text-xs ${bandStyle.badge}`} data-testid="aut-health-band">{health.band}</Badge>
              <p className="text-xs text-muted-foreground mt-2 leading-relaxed" data-testid="aut-health-explanation">{health.explanation}</p>
            </div>
          </CardContent>
        </Card>

        {/* Last 24 Hours */}
        <Card data-testid="aut-last24h-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Activity className="h-4 w-4 text-muted-foreground" /> Last 24 Hours
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: "Executions Completed", value: last24h.completed, color: "text-emerald-600", testId: "aut-24h-completed" },
                { label: "Failures", value: last24h.failures, color: "text-red-600", testId: "aut-24h-failures" },
                { label: "Approval Blocks", value: last24h.approvalBlocks, color: "text-violet-600", testId: "aut-24h-blocks" },
                { label: "Governance Interventions", value: last24h.interventions, color: "text-amber-600", testId: "aut-24h-interventions" },
              ].map((m) => (
                <div key={m.label} className="rounded-md border bg-muted/20 px-3 py-2.5">
                  <div className={`text-2xl font-bold ${m.color}`} data-testid={m.testId}>{m.value}</div>
                  <div className="text-[11px] text-muted-foreground leading-tight mt-0.5">{m.label}</div>
                </div>
              ))}
            </div>
            <p className="text-[11px] text-muted-foreground mt-3">Latest activity window from the automation audit history.</p>
          </CardContent>
        </Card>

        {/* Requires Attention */}
        <Card data-testid="aut-attention-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-500" /> Requires Attention
            </CardTitle>
          </CardHeader>
          <CardContent>
            {attentionItems.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-6 text-center" data-testid="aut-attention-empty">
                <CheckCircle2 className="h-8 w-8 text-emerald-500 mb-2" />
                <p className="text-sm font-medium">All clear</p>
                <p className="text-xs text-muted-foreground mt-0.5">No automations currently require executive attention.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {attentionItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <div
                      key={item.key}
                      className={`flex items-start gap-2.5 rounded-md border px-3 py-2 ${TONE[item.tone]}`}
                      data-testid={`aut-attention-item-${item.key}`}
                    >
                      <Icon className="h-4 w-4 shrink-0 mt-0.5" />
                      <div className="min-w-0">
                        <div className="text-sm font-semibold flex items-center gap-1.5">
                          <span data-testid={`aut-attention-count-${item.key}`}>{item.count}</span>
                          <span>{item.label}</span>
                        </div>
                        <p className="text-[11px] opacity-80 leading-tight mt-0.5">{item.desc}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Row 2: Enhanced KPI strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3" data-testid="aut-exec-kpi-strip">
        {kpiTiles.map(({ label, value, icon: Icon, color, testId, sub }) => (
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
    </section>
  );
}
