/**
 * UX-7.4 — REVIEW DECISION PANEL
 *
 * Read-only decision intelligence for a job's pending reviews. Surfaces the
 * consequence of a decision BEFORE it is made — financial / job / client impact,
 * an approval preview, and an Approve/Reject/Correct comparison view.
 *
 * Doctrine:
 *   - Informational only. No approve / reject / correct controls live here.
 *   - Every figure is derived by reviewDecisionIntelligenceEngine (pure).
 */

import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  TrendingUp,
  Wallet,
  Users,
  Briefcase,
  Building2,
  GitCompare,
  Lightbulb,
  CheckCircle2,
  XCircle,
  PenLine,
} from "lucide-react";
import {
  getJobDecisionIntelligence,
  formatGbp,
  type DecisionOutcome,
} from "@/lib/reviewDecisionIntelligenceEngine";

export function ReviewDecisionPanel({ jobId }: { jobId: string }) {
  const intel = useMemo(() => getJobDecisionIntelligence(jobId), [jobId]);
  if (!intel) return null;

  const { breakdown, job, client, preview, insights } = intel;

  return (
    <Card data-testid="review-decision-panel">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <GitCompare className="h-4 w-4 text-blue-500" /> Decision Intelligence
        </CardTitle>
        <CardDescription>
          What happens if you act on this job's {job.pendingCount} pending
          review(s) — surfaced for your judgement; no decision is made for you.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Financial impact panel */}
        <div
          className="grid gap-4 md:grid-cols-3"
          data-testid="decision-financial-impact"
        >
          <ImpactColumn
            title="Revenue Impact"
            icon={<TrendingUp className="h-4 w-4 text-emerald-500" />}
            rows={[
              ["Revenue generated", breakdown.revenue.generated],
              ["Revenue delayed", breakdown.revenue.delayed],
              ["Revenue blocked", breakdown.revenue.blocked],
            ]}
          />
          <ImpactColumn
            title="Cost Impact"
            icon={<Wallet className="h-4 w-4 text-amber-500" />}
            rows={[
              ["Expense impact", breakdown.cost.expense],
              ["Material cost impact", breakdown.cost.material],
              ["Equipment cost impact", breakdown.cost.equipment],
            ]}
          />
          <ImpactColumn
            title="Payroll Impact"
            icon={<Users className="h-4 w-4 text-blue-500" />}
            rows={[
              ["Labour cost impact", breakdown.payroll.labour],
              ["Payroll impact", breakdown.payroll.payroll],
              ["Timesheet impact", breakdown.payroll.timesheet],
            ]}
          />
        </div>

        {/* Job + client impact */}
        <div className="grid gap-4 md:grid-cols-2">
          <div
            className="rounded-md border border-slate-100 p-4"
            data-testid="decision-job-impact"
          >
            <p className="mb-2 flex items-center gap-2 text-sm font-medium text-slate-900">
              <Briefcase className="h-4 w-4 text-slate-400" /> Job Impact
            </p>
            <SummaryLine label="Job profitability" value={formatGbp(job.profitability)} />
            <SummaryLine label="Job margin" value={`${job.marginPercent}%`} />
            <SummaryLine label="Job exposure" value={formatGbp(job.exposure)} />
            <SummaryLine
              label="Revenue recognition"
              value={formatGbp(job.revenueRecognition)}
            />
            <SummaryLine
              label="Cost recognition"
              value={formatGbp(job.costRecognition)}
            />
          </div>

          <div
            className="rounded-md border border-slate-100 p-4"
            data-testid="decision-client-impact"
          >
            <p className="mb-2 flex items-center gap-2 text-sm font-medium text-slate-900">
              <Building2 className="h-4 w-4 text-slate-400" /> Client Impact
            </p>
            <SummaryLine
              label="Client billing impact"
              value={formatGbp(client.billingImpact)}
            />
            <SummaryLine
              label="Invoice readiness blocked"
              value={`${client.invoiceReadinessBlocked} review(s)`}
            />
            <SummaryLine
              label="Revenue timing at risk"
              value={formatGbp(client.revenueTimingAtRisk)}
            />
          </div>
        </div>

        {/* Decision comparison view */}
        <div data-testid="decision-comparison">
          <p className="mb-2 text-sm font-medium text-slate-900">
            Compare outcomes (informational only)
          </p>
          <div className="grid gap-4 md:grid-cols-3">
            {preview.map((outcome) => (
              <OutcomeCard key={outcome.decision} outcome={outcome} />
            ))}
          </div>
        </div>

        {/* Executive impact insights */}
        <div data-testid="decision-insights">
          <p className="mb-2 flex items-center gap-2 text-sm font-medium text-slate-900">
            <Lightbulb className="h-4 w-4 text-amber-500" /> Impact Insights
          </p>
          <ul className="space-y-2">
            {insights.map((insight, i) => (
              <li
                key={i}
                className="flex items-start gap-2 text-sm text-slate-700"
                data-testid="decision-insight"
              >
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-blue-500" />
                {insight}
              </li>
            ))}
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}

function ImpactColumn({
  title,
  icon,
  rows,
}: {
  title: string;
  icon: React.ReactNode;
  rows: [string, number][];
}) {
  return (
    <div className="rounded-md border border-slate-100 p-4">
      <p className="mb-2 flex items-center gap-2 text-sm font-medium text-slate-900">
        {icon} {title}
      </p>
      {rows.map(([label, value]) => (
        <SummaryLine key={label} label={label} value={formatGbp(value)} />
      ))}
    </div>
  );
}

function SummaryLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between py-0.5 text-sm">
      <span className="text-slate-500">{label}</span>
      <span className="font-medium text-slate-900">{value}</span>
    </div>
  );
}

const OUTCOME_META: Record<
  DecisionOutcome["decision"],
  { icon: React.ReactNode; cls: string }
> = {
  Approve: {
    icon: <CheckCircle2 className="h-4 w-4 text-emerald-500" />,
    cls: "border-emerald-200 bg-emerald-50",
  },
  Reject: {
    icon: <XCircle className="h-4 w-4 text-rose-500" />,
    cls: "border-rose-200 bg-rose-50",
  },
  Correct: {
    icon: <PenLine className="h-4 w-4 text-amber-500" />,
    cls: "border-amber-200 bg-amber-50",
  },
};

function OutcomeCard({ outcome }: { outcome: DecisionOutcome }) {
  const meta = OUTCOME_META[outcome.decision];
  return (
    <div
      className={`rounded-md border p-3 ${meta.cls}`}
      data-testid={`decision-outcome-${outcome.decision.toLowerCase()}`}
    >
      <div className="mb-1 flex items-center gap-2">
        {meta.icon}
        <span className="font-semibold text-slate-900">{outcome.decision}</span>
      </div>
      <p className="mb-2 text-sm font-medium text-slate-700">{outcome.headline}</p>
      <ul className="space-y-1">
        {outcome.consequences.map((c, i) => (
          <li key={i} className="text-xs text-slate-600">
            {c}
          </li>
        ))}
      </ul>
    </div>
  );
}
