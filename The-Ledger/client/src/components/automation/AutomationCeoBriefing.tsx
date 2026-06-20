/**
 * UX-6.9 — CEO AUTOMATION INSIGHTS PANEL (Executive Briefing)
 *
 * The culmination of UX-6: a single executive briefing that rolls up every
 * prior module (health, governance, approvals, executions, audit,
 * recommendations) so the CEO can answer "what do I need to know today?"
 * without inspecting each dashboard.
 *
 * Doctrine: INFORMATIONAL ONLY. It reads and aggregates existing engine data.
 * It creates/modifies no automations, triggers no governance/approval/scheduler
 * actions, and generates no financial mutations. Executive awareness, not
 * operational control.
 */

import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Newspaper,
  HeartPulse,
  ShieldCheck,
  ShieldAlert,
  Inbox,
  XCircle,
  Lightbulb,
  AlertTriangle,
  TrendingUp,
  Clock,
  CheckCircle2,
  Gauge,
  Target,
  CalendarRange,
  Activity,
  Gavel,
} from "lucide-react";
import {
  getAllGovernanceRecords,
  computeGovernanceSummary,
  getAllExceptions,
  getGovernanceAuditLog,
  RISK_LEVEL_COLORS,
  RISK_LEVEL_LABELS,
} from "@/lib/automationGovernanceEngine";
import { computeAutomationRuleSummary } from "@/lib/automationEngine";
import { getAllRules } from "@/lib/automationBuilderEngine";
import {
  getAllSchedules,
  getScheduleExecutions,
  computeScheduleSummaryKPIs,
} from "@/lib/automationSchedulerEngine";
import {
  getApprovalQueue,
  computeApprovalQueueSummary,
  formatWaiting,
} from "@/lib/automationApprovalQueueEngine";
import {
  getRecommendations,
  computeRecommendationSummary,
  computeOpportunityScore,
} from "@/lib/automationRecommendationEngine";

type Readiness = "Healthy" | "Watch" | "Attention Required";
const READINESS_COLOR: Record<Readiness, string> = {
  Healthy: "text-emerald-700 border-emerald-200 bg-emerald-50",
  Watch: "text-amber-700 border-amber-200 bg-amber-50",
  "Attention Required": "text-red-700 border-red-200 bg-red-50",
};
const READINESS_DOT: Record<Readiness, string> = {
  Healthy: "bg-emerald-500", Watch: "bg-amber-500", "Attention Required": "bg-red-500",
};

const IMPACT_WEIGHT: Record<string, number> = { High: 12, Medium: 7, Low: 3 };
const clamp = (n: number) => Math.max(0, Math.min(100, n));

export function AutomationCeoBriefing() {
  const m = useMemo(() => {
    const records = getAllGovernanceRecords();
    const gov = computeGovernanceSummary(records);
    const exceptions = getAllExceptions();
    const govAudit = getGovernanceAuditLog();
    const ruleSummary = computeAutomationRuleSummary(getAllRules());
    const schedules = getAllSchedules();
    const schedExecs = getScheduleExecutions();
    const schedKpis = computeScheduleSummaryKPIs(schedules, schedExecs);
    const queue = getApprovalQueue();
    const queueSummary = computeApprovalQueueSummary(queue);
    const recs = getRecommendations();
    const recSummary = computeRecommendationSummary(recs);
    const opportunity = computeOpportunityScore(recs);

    // Execution aggregates (governance records carry execution counts).
    const totalExec = records.reduce((s, r) => s + r.totalExecutions, 0);
    const successExec = records.reduce((s, r) => s + r.successfulExecutions, 0);
    const blockedExec = records.reduce((s, r) => s + r.blockedExecutions, 0);
    const failedExec = records.reduce((s, r) => s + r.failedExecutions, 0);
    const successRate = totalExec > 0 ? Math.round((successExec / totalExec) * 100) : 0;

    // Health scores.
    const automationHealth = clamp(
      100 - failedExec * 2 - blockedExec * 1 - (gov.restricted + gov.suspended) * 5 - gov.criticalRisk * 3 - ruleSummary.disabled
    );
    const governanceHealth = clamp(
      100 - gov.requiresReview * 8 - gov.restricted * 10 - gov.suspended * 15 - gov.criticalRisk * 10
    );
    const platformHealth = Math.round((automationHealth + governanceHealth + successRate) / 3);

    const highRiskAutomations = gov.highRisk + gov.criticalRisk;
    const openCriticalExceptions = exceptions.filter(
      (e) => e.severity === "Critical" && e.status !== "Resolved" && e.status !== "Rejected"
    ).length;
    const escalatedExceptions = exceptions.filter(
      (e) => e.status === "Awaiting Approval" || e.status === "Investigating"
    ).length;
    const openExceptions = exceptions.filter((e) => e.status !== "Resolved" && e.status !== "Rejected").length;
    const criticalAlerts = gov.criticalRisk + openCriticalExceptions + gov.suspended;
    const govInterventions = govAudit.filter((a) => a.action === "Restrict Automation" || a.action === "Suspend Automation").length;
    const financialControlsEnforced = records.reduce((s, r) => s + (r.isFinanciallySensitive ? r.blockedExecutions : 0), 0);

    // Briefing headline bullets (dynamic).
    const briefing: string[] = [
      `${successRate}% execution success rate across ${totalExec} executions`,
      `${queueSummary.total} approval${queueSummary.total === 1 ? "" : "s"} awaiting review`,
      `${escalatedExceptions} governance exception${escalatedExceptions === 1 ? "" : "s"} escalated`,
      `${failedExec} failed execution${failedExec === 1 ? "" : "s"} detected`,
      financialControlsEnforced > 0
        ? `${financialControlsEnforced} financially sensitive action${financialControlsEnforced === 1 ? "" : "s"} safely held at approval`
        : "No critical financial safeguard breaches",
    ];

    // Priority attention feed (ranked).
    const sevRank: Record<string, number> = { Critical: 4, High: 3, Medium: 2, Low: 1 };
    type Item = { id: string; title: string; category: string; severity: string; priority: number; action: string; related: string };
    const attention: Item[] = [];
    exceptions
      .filter((e) => e.status !== "Resolved" && e.status !== "Rejected")
      .forEach((e) => attention.push({
        id: `exc-${e.id}`, title: `${e.exceptionType} — ${e.ruleName}`, category: "Governance",
        severity: e.severity, priority: sevRank[e.severity] ?? 1,
        action: "Review in Governance Centre", related: e.ruleNumber,
      }));
    records.filter((r) => r.governanceStatus === "Restricted" || r.governanceStatus === "Suspended")
      .forEach((r) => attention.push({
        id: `gov-${r.ruleId}`, title: `${r.governanceStatus} automation — ${r.ruleName}`, category: "Governance",
        severity: r.riskLevel, priority: sevRank[r.riskLevel] ?? 1,
        action: "Review restriction", related: r.ruleNumber,
      }));
    records.filter((r) => r.failedExecutions > 0)
      .forEach((r) => attention.push({
        id: `fail-${r.ruleId}`, title: `Repeated execution failures — ${r.ruleName}`, category: "Execution",
        severity: "High", priority: 3, action: "Inspect execution history", related: r.ruleNumber,
      }));
    if (queueSummary.oldest) {
      attention.push({
        id: "queue-oldest", title: `Approval backlog — ${queueSummary.oldest.ruleName}`, category: "Approval",
        severity: queueSummary.oldestWaitHours > 168 ? "High" : "Medium",
        priority: queueSummary.oldestWaitHours > 168 ? 3 : 2,
        action: "Review approval queue", related: queueSummary.oldest.id,
      });
    }
    attention.sort((a, b) => b.priority - a.priority);

    // Business impact (mock-derived from real counts).
    const impact = {
      hoursSaved: Math.round(successExec * 0.25),
      reviewsEscalated: schedExecs.length,
      approvalSafeguards: blockedExec,
      governanceInterventions: govInterventions,
      financialControls: financialControlsEnforced,
    };

    // Risk summary.
    const risk = {
      critical: records.filter((r) => r.riskLevel === "Critical").length,
      high: records.filter((r) => r.riskLevel === "High").length,
      medium: records.filter((r) => r.riskLevel === "Medium").length,
      low: records.filter((r) => r.riskLevel === "Low").length,
      escalated: govInterventions,
      unresolved: gov.requiresReview + gov.restricted + gov.suspended,
      newRisks: records.filter((r) => r.governanceStatus === "Requires Review").length,
    };

    // Opportunity summary (top picks from recommendations).
    const byValue = [...recs].sort((a, b) => (IMPACT_WEIGHT[b.impact] * b.estimatedHoursSavedPerWeek) - (IMPACT_WEIGHT[a.impact] * a.estimatedHoursSavedPerWeek));
    const quickest = [...recs].filter((r) => r.complexity === "Low").sort((a, b) => IMPACT_WEIGHT[b.impact] - IMPACT_WEIGHT[a.impact])[0];
    const financial = [...recs].filter((r) => r.category === "Financial").sort((a, b) => b.estimatedHoursSavedPerWeek - a.estimatedHoursSavedPerWeek)[0];
    const governance = [...recs].filter((r) => r.category === "Governance").sort((a, b) => IMPACT_WEIGHT[b.impact] - IMPACT_WEIGHT[a.impact])[0];
    const opportunitySummary = [
      { label: "Highest-value opportunity", rec: byValue[0] },
      { label: "Quickest operational win", rec: quickest },
      { label: "Largest financial opportunity", rec: financial },
      { label: "Most impactful governance improvement", rec: governance },
    ].filter((x) => x.rec);

    // Weekly executive summary.
    const weekly = {
      executed: totalExec,
      successRate,
      approvals: queueSummary.total,
      governanceActions: govAudit.length,
      newRecommendations: recSummary.total,
      timeSaved: impact.hoursSaved,
    };

    // Strategic insights (data-driven).
    const strategic: string[] = [];
    if (recs.some((r) => r.area === "Review")) strategic.push("Review workload continues to require manual escalation.");
    if (recSummary.financial > 0) strategic.push("Financial follow-up processes remain highly manual.");
    strategic.push(
      governanceHealth >= 70 ? "Governance compliance remains strong."
      : governanceHealth >= 50 ? "Governance compliance needs monitoring."
      : "Governance compliance requires attention."
    );
    strategic.push(`Automation opportunity score sits at ${opportunity.score}/100 — ${opportunity.rating.toLowerCase()}.`);

    // Readiness roll-ups.
    const automationReadiness: Readiness = automationHealth >= 80 ? "Healthy" : automationHealth >= 60 ? "Watch" : "Attention Required";
    const governanceReadiness: Readiness =
      gov.suspended > 0 || gov.criticalRisk > 1 ? "Attention Required"
      : gov.restricted > 0 || gov.requiresReview > 0 || gov.criticalRisk > 0 ? "Watch" : "Healthy";
    const oldestApprovalDays = queueSummary.oldestWaitHours / 24;
    const operationalReadiness: Readiness =
      oldestApprovalDays > 7 || failedExec > 5 ? "Attention Required"
      : failedExec > 0 || queueSummary.total > 3 ? "Watch" : "Healthy";

    return {
      successRate, totalExec, failedExec, blockedExec,
      automationHealth, governanceHealth, platformHealth,
      highRiskAutomations, criticalAlerts, openExceptions, escalatedExceptions,
      queueSummary, recSummary, opportunity,
      briefing, attention, impact, risk, opportunitySummary, weekly, strategic,
      automationReadiness, governanceReadiness, operationalReadiness,
      schedKpis,
    };
  }, []);

  const kpis = [
    { label: "Platform Health", value: `${m.platformHealth}`, icon: HeartPulse, color: "text-emerald-600", testId: "aut-ceo-kpi-platform" },
    { label: "Automation Health", value: `${m.automationHealth}`, icon: Gauge, color: "text-blue-600", testId: "aut-ceo-kpi-automation" },
    { label: "Governance Health", value: `${m.governanceHealth}`, icon: ShieldCheck, color: "text-amber-700", testId: "aut-ceo-kpi-governance" },
    { label: "Outstanding Approvals", value: m.queueSummary.total, icon: Inbox, color: "text-violet-600", testId: "aut-ceo-kpi-approvals" },
    { label: "Failed Executions", value: m.failedExec, icon: XCircle, color: "text-red-600", testId: "aut-ceo-kpi-failed" },
    { label: "High Risk", value: m.highRiskAutomations, icon: ShieldAlert, color: "text-amber-700", testId: "aut-ceo-kpi-highrisk" },
    { label: "Recs to Action", value: m.recSummary.highImpact, icon: Lightbulb, color: "text-emerald-600", testId: "aut-ceo-kpi-recs" },
    { label: "Critical Alerts", value: m.criticalAlerts, icon: AlertTriangle, color: "text-red-600", testId: "aut-ceo-kpi-alerts" },
  ];

  const today = new Date().toLocaleDateString("en-GB", { weekday: "long", day: "2-digit", month: "long", year: "numeric" });

  const readinessRows: { label: string; value: Readiness; icon: typeof Activity; testId: string }[] = [
    { label: "Operational Readiness", value: m.operationalReadiness, icon: Activity, testId: "aut-ceo-readiness-operational" },
    { label: "Governance Readiness", value: m.governanceReadiness, icon: Gavel, testId: "aut-ceo-readiness-governance" },
    { label: "Automation Readiness", value: m.automationReadiness, icon: Gauge, testId: "aut-ceo-readiness-automation" },
  ];

  return (
    <div className="space-y-4" data-testid="aut-ceo-briefing">
      <div className="rounded-md bg-violet-50 border border-violet-200 px-4 py-3 text-sm text-violet-700 flex items-start gap-2">
        <Newspaper className="h-4 w-4 shrink-0 mt-0.5" />
        <span><span className="font-semibold">Executive Briefing: </span>A read-only daily roll-up across the Automation Hub. Awareness only — nothing here creates, approves, or modifies automation.</span>
      </div>

      {/* Briefing KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3" data-testid="aut-ceo-kpi-strip">
        {kpis.map(({ label, value, icon: Icon, color, testId }) => (
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

      {/* Headline briefing + readiness */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2 border-violet-200" data-testid="aut-ceo-headline">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold flex items-center gap-2"><Newspaper className="h-5 w-5 text-violet-500" /> Today's Automation Briefing</CardTitle>
            <p className="text-xs text-muted-foreground">{today}</p>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {m.briefing.map((line, i) => (
                <li key={i} className="flex items-start gap-2 text-sm" data-testid={`aut-ceo-briefing-${i}`}>
                  <CheckCircle2 className="h-4 w-4 text-violet-400 shrink-0 mt-0.5" />
                  <span>{line}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card data-testid="aut-ceo-readiness">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2"><Target className="h-4 w-4 text-muted-foreground" /> Readiness</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {readinessRows.map(({ label, value, icon: Icon, testId }) => (
              <div key={label} className={`flex items-center justify-between gap-2 rounded-md border px-3 py-2 ${READINESS_COLOR[value]}`} data-testid={testId}>
                <span className="flex items-center gap-1.5 text-xs font-medium"><Icon className="h-3.5 w-3.5" />{label}</span>
                <span className="flex items-center gap-1.5 text-xs font-semibold"><span className={`h-2 w-2 rounded-full ${READINESS_DOT[value]}`} />{value}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Priority attention + Business impact */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2" data-testid="aut-ceo-attention">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-amber-500" /> Priority Attention Feed</CardTitle>
          </CardHeader>
          <CardContent>
            {m.attention.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-6 text-center" data-testid="aut-ceo-attention-empty">
                <CheckCircle2 className="h-8 w-8 text-emerald-500 mb-2" /><p className="text-sm font-medium">Nothing requires executive attention.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {m.attention.slice(0, 6).map((item) => (
                  <div key={item.id} className="flex items-center gap-3 rounded-md border px-3 py-2" data-testid={`aut-ceo-attention-item`}>
                    <Badge variant="outline" className={`text-[10px] shrink-0 ${item.severity === "Critical" ? "text-red-600 border-red-200 bg-red-50" : item.severity === "High" ? "text-amber-700 border-amber-200 bg-amber-50" : "text-blue-600 border-blue-200 bg-blue-50"}`}>{item.severity}</Badge>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium truncate">{item.title}</div>
                      <div className="text-[11px] text-muted-foreground">{item.category} · {item.related} · {item.action}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card data-testid="aut-ceo-impact">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2"><TrendingUp className="h-4 w-4 text-emerald-500" /> Business Impact (this week)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {[
              { label: "Estimated hours saved", value: `${m.impact.hoursSaved}h`, testId: "aut-ceo-impact-hours" },
              { label: "Reviews auto-escalated", value: m.impact.reviewsEscalated, testId: "aut-ceo-impact-reviews" },
              { label: "Approval safeguards enforced", value: m.impact.approvalSafeguards, testId: "aut-ceo-impact-safeguards" },
              { label: "Governance interventions", value: m.impact.governanceInterventions, testId: "aut-ceo-impact-governance" },
              { label: "Financial controls enforced", value: m.impact.financialControls, testId: "aut-ceo-impact-financial" },
            ].map((r) => (
              <div key={r.label} className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{r.label}</span>
                <span className="font-semibold" data-testid={r.testId}>{r.value}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Risk summary + Weekly summary */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card data-testid="aut-ceo-risk">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2"><ShieldAlert className="h-4 w-4 text-muted-foreground" /> Automation Risk Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-4 gap-2">
              {([["Critical", m.risk.critical], ["High", m.risk.high], ["Medium", m.risk.medium], ["Low", m.risk.low]] as const).map(([level, count]) => (
                <div key={level} className="rounded-md border bg-muted/20 px-2 py-2 text-center" data-testid={`aut-ceo-risk-${level.toLowerCase()}`}>
                  <div className="text-lg font-bold">{count}</div>
                  <Badge variant="outline" className={`text-[9px] ${RISK_LEVEL_COLORS[level]}`}>{RISK_LEVEL_LABELS[level]}</Badge>
                </div>
              ))}
            </div>
            <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
              <span>New: <span className="font-semibold text-foreground">{m.risk.newRisks}</span></span>
              <span>Escalated: <span className="font-semibold text-foreground">{m.risk.escalated}</span></span>
              <span>Unresolved: <span className="font-semibold text-foreground">{m.risk.unresolved}</span></span>
            </div>
          </CardContent>
        </Card>

        <Card data-testid="aut-ceo-weekly">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2"><CalendarRange className="h-4 w-4 text-muted-foreground" /> This Week</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: "Executed", value: m.weekly.executed, testId: "aut-ceo-weekly-executed" },
                { label: "Success Rate", value: `${m.weekly.successRate}%`, testId: "aut-ceo-weekly-success" },
                { label: "Approvals", value: m.weekly.approvals, testId: "aut-ceo-weekly-approvals" },
                { label: "Governance", value: m.weekly.governanceActions, testId: "aut-ceo-weekly-governance" },
                { label: "New Recs", value: m.weekly.newRecommendations, testId: "aut-ceo-weekly-recs" },
                { label: "Time Saved", value: `${m.weekly.timeSaved}h`, testId: "aut-ceo-weekly-time" },
              ].map((r) => (
                <div key={r.label} className="rounded-md border bg-muted/20 px-3 py-2">
                  <div className="text-lg font-bold" data-testid={r.testId}>{r.value}</div>
                  <div className="text-[10px] text-muted-foreground leading-tight">{r.label}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Opportunity summary + Strategic insights */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card data-testid="aut-ceo-opportunity">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2"><Lightbulb className="h-4 w-4 text-amber-500" /> Executive Opportunity Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {m.opportunitySummary.map(({ label, rec }) => (
              <div key={label} className="rounded-md border px-3 py-2" data-testid={`aut-ceo-opportunity-item`}>
                <div className="text-[11px] text-muted-foreground uppercase tracking-wide">{label}</div>
                <div className="text-sm font-medium">{rec!.title}</div>
                <div className="text-[11px] text-muted-foreground">{rec!.impact} impact · {rec!.estimatedHoursSavedPerWeek}h/wk · {rec!.complexity} effort</div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card data-testid="aut-ceo-strategic">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2"><Gauge className="h-4 w-4 text-muted-foreground" /> Strategic Insights</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-1.5">
              {m.strategic.map((line, i) => (
                <li key={i} className="flex items-start gap-2 text-sm" data-testid={`aut-ceo-strategic-${i}`}>
                  <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-violet-400 shrink-0" />
                  <span>{line}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
