/**
 * UX-7.7 — EXECUTIVE REVIEW BRIEFING
 *
 * The executive roll-up of the Review Centre — the Review equivalent of the
 * Automation Hub CEO Briefing. Answers "What decisions require my attention
 * today?" by consolidating UX-7.1–7.6 intelligence. Leads with conclusions.
 *
 * Doctrine:
 *   - Consolidation only. No approve / reject / correct controls anywhere here.
 *   - Every value is derived by reviewBriefingEngine (pure, read-only).
 */

import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Briefcase,
  AlertTriangle,
  PoundSterling,
  Activity,
  Lightbulb,
  CalendarRange,
  Sparkles,
  GitCompare,
  Gauge,
  CheckCircle2,
} from "lucide-react";
import {
  computeReviewBriefing,
  formatGbp,
  type ReadinessLevel,
  type AttentionItem,
} from "@/lib/reviewBriefingEngine";

function readinessClass(level: ReadinessLevel): string {
  return level === "Healthy"
    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
    : level === "Watch"
    ? "bg-amber-50 text-amber-700 border-amber-200"
    : "bg-rose-50 text-rose-700 border-rose-200";
}

function priorityClass(p: AttentionItem["priority"]): string {
  return p === "Critical"
    ? "bg-rose-50 text-rose-700 border-rose-200"
    : p === "High"
    ? "bg-amber-50 text-amber-700 border-amber-200"
    : p === "Medium"
    ? "bg-sky-50 text-sky-700 border-sky-200"
    : "bg-slate-50 text-slate-600 border-slate-200";
}

function Kpi({ label, value, testId }: { label: string; value: string; testId: string }) {
  return (
    <div className="rounded-md border border-slate-100 p-3" data-testid={testId}>
      <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">
        {label}
      </p>
      <p className="mt-1 text-xl font-bold text-slate-900">{value}</p>
    </div>
  );
}

export function ReviewExecutiveBriefing() {
  const m = useMemo(() => computeReviewBriefing(), []);

  return (
    <div className="space-y-6" data-testid="review-executive-briefing">
      <div>
        <h3 className="flex items-center gap-2 text-lg font-semibold text-slate-900">
          <Briefcase className="h-5 w-5 text-blue-600" /> Executive Review Briefing
        </h3>
        <p className="text-sm text-slate-500">
          What decisions require your attention today — consolidated across the
          Review Centre. Summary only; every decision still happens below.
        </p>
      </div>

      {/* Readiness indicators */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4" data-testid="briefing-readiness">
        {m.readiness.map((r) => (
          <Card key={r.area} data-testid={`readiness-${r.area.toLowerCase().replace(/\s+/g, "-")}`}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-medium uppercase tracking-wide text-slate-400">
                  {r.area}
                </span>
                <Gauge className="h-3.5 w-3.5 text-slate-300" />
              </div>
              <div className="mt-2">
                <Badge variant="outline" className={readinessClass(r.level)}>
                  {r.level}
                </Badge>
              </div>
              <p className="mt-1 text-xs text-slate-500">{r.detail}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Daily review briefing card */}
      <Card className="border-blue-100 bg-blue-50/40" data-testid="briefing-daily">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <CalendarRange className="h-4 w-4 text-blue-600" /> Today's Review Briefing
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2">
            {m.dailyBriefing.map((line, i) => (
              <li
                key={i}
                className="flex items-start gap-2 text-sm text-slate-700"
                data-testid="briefing-daily-line"
              >
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-blue-600" />
                {line}
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      {/* Health KPI strips */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card data-testid="briefing-approval-health">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm">
              <CheckCircle2 className="h-4 w-4 text-slate-400" /> Approval Health
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-2">
            <Kpi testId="bh-pending" label="Pending" value={String(m.approvalHealth.pending)} />
            <Kpi testId="bh-critical" label="Critical" value={String(m.approvalHealth.critical)} />
            <Kpi testId="bh-sla" label="Exceeding SLA" value={String(m.approvalHealth.exceedingSla)} />
            <Kpi testId="bh-avg" label="Avg Approval" value={m.approvalHealth.avgApprovalLabel} />
          </CardContent>
        </Card>

        <Card data-testid="briefing-financial-health">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm">
              <PoundSterling className="h-4 w-4 text-slate-400" /> Financial Exposure
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-2">
            <Kpi testId="bf-revenue" label="Revenue" value={formatGbp(m.financialExposure.revenue)} />
            <Kpi testId="bf-costs" label="Costs" value={formatGbp(m.financialExposure.costs)} />
            <Kpi testId="bf-payroll" label="Payroll" value={formatGbp(m.financialExposure.payroll)} />
            <Kpi testId="bf-total" label="Total Exposure" value={formatGbp(m.financialExposure.total)} />
          </CardContent>
        </Card>

        <Card data-testid="briefing-operational-health">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Activity className="h-4 w-4 text-slate-400" /> Operational Health
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-2">
            <Kpi testId="bo-backlog" label="Backlog" value={String(m.operationalHealth.backlog)} />
            <Kpi testId="bo-throughput" label="Throughput / wk" value={String(m.operationalHealth.throughput)} />
            <Kpi testId="bo-velocity" label="Velocity / day" value={String(m.operationalHealth.velocity)} />
            <Kpi testId="bo-health" label="Ops Health" value={`${m.operationalHealth.healthScore}/100`} />
          </CardContent>
        </Card>
      </div>

      {/* Executive attention feed */}
      <Card data-testid="briefing-attention-feed">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <AlertTriangle className="h-4 w-4 text-amber-500" /> Executive Attention
          </CardTitle>
          <CardDescription>Ranked by priority — no actions taken here.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {m.attentionFeed.length === 0 ? (
            <p className="text-sm text-slate-400" data-testid="briefing-attention-empty">
              Nothing requires executive attention.
            </p>
          ) : (
            m.attentionFeed.map((a) => (
              <div
                key={a.id}
                className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-md border border-slate-100 p-2 text-sm"
                data-testid={`briefing-attention-${a.id}`}
              >
                <Badge variant="outline" className={priorityClass(a.priority)}>
                  {a.priority}
                </Badge>
                <span className="font-medium text-slate-700">{a.id}</span>
                <span className="text-xs text-slate-400">{a.category}</span>
                <span className="ml-auto text-xs text-slate-500">
                  {a.financialImpact > 0 ? formatGbp(a.financialImpact) : "—"} ·{" "}
                  {a.ageLabel}
                </span>
                <span className="w-full text-xs text-slate-500 sm:w-auto">
                  {a.recommendedAttention}
                </span>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {/* Exposure summary + decision roll-up */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card data-testid="briefing-exposure-summary">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <PoundSterling className="h-4 w-4 text-slate-400" /> Financial Exposure Summary
            </CardTitle>
            <CardDescription>{m.exposure.interpretation}</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm">
            <Row label="Revenue awaiting" value={formatGbp(m.exposure.revenueAwaiting)} />
            <Row label="Revenue delayed" value={formatGbp(m.exposure.revenueDelayed)} />
            <Row label="Invoice-gating reviews" value={`${m.exposure.invoiceReadinessBlocked}`} />
            <Row label="Costs awaiting" value={formatGbp(m.exposure.costsAwaiting)} />
            <Row label="Margin impact" value={formatGbp(m.exposure.marginImpact)} />
            <Row label="Payroll awaiting" value={formatGbp(m.exposure.payrollAwaiting)} />
            <Row label="Payroll-ready reviews" value={`${m.exposure.payrollReleaseReady}`} />
          </CardContent>
        </Card>

        <Card data-testid="briefing-decision-rollup">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <GitCompare className="h-4 w-4 text-slate-400" /> Decision Impact Roll-Up
            </CardTitle>
            <CardDescription>{m.decisionRollup.summary}</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm">
            <Row label="Revenue awaiting" value={formatGbp(m.decisionRollup.revenue)} />
            <Row label="Cost awaiting" value={formatGbp(m.decisionRollup.cost)} />
            <Row label="Payroll awaiting" value={formatGbp(m.decisionRollup.payroll)} />
            <Row label="Profitability impact" value={formatGbp(m.decisionRollup.profitabilityImpact)} />
          </CardContent>
        </Card>
      </div>

      {/* Bottlenecks + recommendation roll-up */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card data-testid="briefing-bottlenecks">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <AlertTriangle className="h-4 w-4 text-amber-500" /> Bottleneck Summary
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            <Row label="Largest backlog" value={m.bottlenecks.largestBacklog} />
            <Row label="Slowest category" value={m.bottlenecks.slowestCategory} />
            <Row label="Reviewer bottleneck" value={m.bottlenecks.reviewerBottleneck} />
            <Row label="Review type bottleneck" value={m.bottlenecks.reviewTypeBottleneck} />
            <Row label="Approval bottleneck" value={m.bottlenecks.approvalBottleneck} />
          </CardContent>
        </Card>

        <Card data-testid="briefing-recommendation-rollup">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Sparkles className="h-4 w-4 text-violet-500" /> Recommendation Roll-Up
            </CardTitle>
            <CardDescription>Advisory only.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            <Row label="High-confidence approvals" value={`${m.recommendationRollup.highConfidenceApprovals}`} />
            <Row label="High-confidence corrections" value={`${m.recommendationRollup.highConfidenceCorrections}`} />
            <Row label="Requires manual review" value={`${m.recommendationRollup.requiresManualReview}`} />
            <div className="mt-2 border-t border-slate-100 pt-2">
              {m.recommendationRollup.distribution.map((d) => (
                <Row key={d.type} label={d.type} value={`${d.count} (${d.percent}%)`} />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Weekly summary */}
      <Card data-testid="briefing-weekly-summary">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <CalendarRange className="h-4 w-4 text-slate-400" /> Weekly Review Summary
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
          <Kpi testId="ws-processed" label="Processed" value={String(m.weeklySummary.processed)} />
          <Kpi testId="ws-approved" label="Approved" value={String(m.weeklySummary.approved)} />
          <Kpi testId="ws-rejected" label="Rejected" value={String(m.weeklySummary.rejected)} />
          <Kpi testId="ws-corrected" label="Corrected" value={String(m.weeklySummary.corrected)} />
          <Kpi testId="ws-financial" label="Value Processed" value={formatGbp(m.weeklySummary.financialValueProcessed)} />
          <Kpi
            testId="ws-throughput"
            label="Throughput Δ"
            value={`${m.weeklySummary.throughputChangePercent >= 0 ? "+" : ""}${m.weeklySummary.throughputChangePercent}%`}
          />
          <Kpi testId="ws-sla" label="SLA Performance" value={`${m.weeklySummary.slaPerformance}%`} />
        </CardContent>
      </Card>

      {/* Strategic insights */}
      <Card data-testid="briefing-strategic-insights">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Lightbulb className="h-4 w-4 text-amber-500" /> Strategic Insights
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2">
            {m.strategicInsights.map((insight, i) => (
              <li
                key={i}
                className="flex items-start gap-2 text-sm text-slate-700"
                data-testid="briefing-insight"
              >
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-blue-500" />
                {insight}
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between py-0.5">
      <span className="text-slate-600">{label}</span>
      <span className="font-medium text-slate-900">{value}</span>
    </div>
  );
}
