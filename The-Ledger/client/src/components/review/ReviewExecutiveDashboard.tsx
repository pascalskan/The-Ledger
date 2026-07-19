/**
 * UX-7.1 — EXECUTIVE REVIEW DASHBOARD
 *
 * A read-only executive visibility layer for the Review Centre. Answers
 * "What decisions require my attention right now?" without changing any
 * approval behaviour.
 *
 * Doctrine:
 *   - Pure presentation. No approve / reject / correct actions live here.
 *   - Every figure is derived by reviewIntelligenceEngine (read-only).
 *   - The live approval queue (rendered below this component in review.tsx)
 *     remains the only place decisions are actually made.
 */

import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Inbox,
  AlertTriangle,
  TrendingUp,
  Wallet,
  Users,
  ShieldAlert,
  Clock,
  CheckCircle2,
  PoundSterling,
  Layers,
  Activity,
  Lightbulb,
  Gauge,
} from "lucide-react";
import {
  computeReviewExecutiveModel,
  formatGbp,
  type DerivedReview,
  type RiskLevel,
} from "@/lib/reviewIntelligenceEngine";
import { computeReviewRecommendation } from "@/lib/reviewRecommendationEngine";
import { RecommendationBadge } from "@/components/review/ReviewRecommendations";

function priorityBadge(priority: DerivedReview["priority"]) {
  const map: Record<DerivedReview["priority"], string> = {
    Critical: "bg-rose-50 text-rose-700 border-rose-200",
    High: "bg-amber-50 text-amber-700 border-amber-200",
    Standard: "bg-muted text-muted-foreground border-border",
  };
  return map[priority];
}

function riskBadge(risk: RiskLevel) {
  const map: Record<RiskLevel, string> = {
    high: "bg-rose-50 text-rose-700 border-rose-200",
    medium: "bg-amber-50 text-amber-700 border-amber-200",
    low: "bg-emerald-50 text-emerald-700 border-emerald-200",
  };
  return map[risk];
}

interface KpiTileProps {
  label: string;
  value: string;
  icon: React.ReactNode;
  tone?: "default" | "warn" | "danger" | "good";
  testId: string;
}

function KpiTile({ label, value, icon, tone = "default", testId }: KpiTileProps) {
  const toneClasses =
    tone === "danger"
      ? "text-rose-600"
      : tone === "warn"
      ? "text-amber-600"
      : tone === "good"
      ? "text-emerald-600"
      : "text-foreground";
  return (
    <Card data-testid={testId}>
      <CardContent className="p-4">
        <div className="flex items-center gap-2 text-muted-foreground">
          {icon}
          <span className="text-[11px] font-medium uppercase tracking-wide">
            {label}
          </span>
        </div>
        <p className={`mt-2 text-2xl font-bold ${toneClasses}`}>{value}</p>
      </CardContent>
    </Card>
  );
}

export function ReviewExecutiveDashboard() {
  const model = useMemo(() => computeReviewExecutiveModel(), []);
  const { kpis, exposure, attentionQueue, typeBreakdown, workload, insights } =
    model;

  return (
    <div className="space-y-6" data-testid="review-executive-dashboard">
      {/* Executive header */}
      <div>
        <h3 className="text-lg font-semibold text-foreground">
          Executive Review Overview
        </h3>
        <p className="text-sm text-muted-foreground">
          The decision engine of the business — what requires your attention
          right now. Visibility only; every approval still happens in the queue
          below.
        </p>
      </div>

      {/* KPI strip */}
      <div
        className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-4"
        data-testid="review-kpi-strip"
      >
        <KpiTile
          testId="review-kpi-pending"
          label="Total Pending"
          value={String(kpis.totalPending)}
          icon={<Inbox className="h-4 w-4" />}
        />
        <KpiTile
          testId="review-kpi-overdue"
          label="Overdue"
          value={String(kpis.overdue)}
          tone={kpis.overdue > 0 ? "danger" : "good"}
          icon={<AlertTriangle className="h-4 w-4" />}
        />
        <KpiTile
          testId="review-kpi-revenue"
          label="Revenue Awaiting"
          value={formatGbp(kpis.revenueAwaiting)}
          icon={<TrendingUp className="h-4 w-4" />}
        />
        <KpiTile
          testId="review-kpi-cost"
          label="Cost Awaiting"
          value={formatGbp(kpis.costAwaiting)}
          icon={<Wallet className="h-4 w-4" />}
        />
        <KpiTile
          testId="review-kpi-payroll"
          label="Payroll Awaiting"
          value={formatGbp(kpis.payrollAwaiting)}
          icon={<Users className="h-4 w-4" />}
        />
        <KpiTile
          testId="review-kpi-highrisk"
          label="High-Risk"
          value={String(kpis.highRisk)}
          tone={kpis.highRisk > 0 ? "warn" : "good"}
          icon={<ShieldAlert className="h-4 w-4" />}
        />
        <KpiTile
          testId="review-kpi-avgage"
          label="Avg Review Age"
          value={kpis.averageAgeLabel}
          icon={<Clock className="h-4 w-4" />}
        />
        <KpiTile
          testId="review-kpi-completed"
          label="Completed Today"
          value={String(kpis.completedToday)}
          tone="good"
          icon={<CheckCircle2 className="h-4 w-4" />}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Financial exposure panel */}
        <Card className="lg:col-span-1" data-testid="review-financial-exposure">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <PoundSterling className="h-4 w-4 text-muted-foreground" /> Financial
              Exposure
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <ExposureRow
              label="Revenue blocked by approvals"
              value={formatGbp(exposure.revenueBlocked)}
            />
            <ExposureRow
              label="Costs awaiting approval"
              value={formatGbp(exposure.costAwaiting)}
            />
            <ExposureRow
              label="Payroll awaiting approval"
              value={formatGbp(exposure.payrollAwaiting)}
            />
            <div className="border-t border-border pt-3">
              <ExposureRow
                label="Total exposure"
                value={formatGbp(exposure.totalExposure)}
                bold
              />
              <p className="mt-2 text-xs text-muted-foreground">
                Estimated profitability impact of approval delays:{" "}
                <span className="font-semibold text-foreground">
                  {formatGbp(exposure.profitabilityImpact)}
                </span>
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Reviews by type */}
        <Card className="lg:col-span-1" data-testid="review-type-breakdown">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Layers className="h-4 w-4 text-muted-foreground" /> Reviews By Type
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {typeBreakdown.map((t) => (
              <div
                key={t.type}
                className="flex items-center gap-3"
                data-testid={`review-type-row-${t.type
                  .toLowerCase()
                  .replace(/\s+/g, "-")}`}
              >
                <span className="w-32 shrink-0 text-sm text-muted-foreground">
                  {t.type}
                </span>
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-blue-500"
                    style={{ width: `${t.percent}%` }}
                  />
                </div>
                <span className="w-16 shrink-0 text-right text-sm font-medium text-foreground">
                  {t.count} · {t.percent}%
                </span>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Workload summary */}
        <Card className="lg:col-span-1" data-testid="review-workload-summary">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Activity className="h-4 w-4 text-muted-foreground" /> Workload Summary
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <WorkloadRow label="Received today" value={workload.receivedToday} />
            <WorkloadRow label="Approved today" value={workload.approvedToday} />
            <WorkloadRow label="Rejected today" value={workload.rejectedToday} />
            <WorkloadRow
              label="Corrected today"
              value={workload.correctedToday}
            />
            <WorkloadRow label="Backlog size" value={workload.backlog} />
            <div className="flex items-center justify-between border-t border-border pt-2">
              <span className="text-muted-foreground">Throughput trend</span>
              <Badge
                variant="outline"
                className="capitalize"
                data-testid="review-throughput-trend"
              >
                <Gauge className="mr-1 h-3 w-3" />
                {workload.throughputTrend}
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Requires attention queue */}
      <Card data-testid="review-attention-queue">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <AlertTriangle className="h-4 w-4 text-amber-500" /> Requires
            Attention
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {attentionQueue.length === 0 ? (
            <div
              className="flex flex-col items-center justify-center py-10 text-muted-foreground"
              data-testid="review-attention-empty"
            >
              <CheckCircle2 className="mb-3 h-10 w-10 text-emerald-500" />
              <p className="font-medium text-foreground">Nothing demands attention</p>
              <p className="text-sm">No pending reviews require executive focus.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-muted/50">
                  <TableRow>
                    <TableHead>Review</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead className="hidden md:table-cell">Job</TableHead>
                    <TableHead className="text-right">Financial Impact</TableHead>
                    <TableHead>Age</TableHead>
                    <TableHead className="hidden sm:table-cell">Risk</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead className="hidden lg:table-cell">Recommendation</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {attentionQueue.map((r) => (
                    <TableRow key={r.id} data-testid={`review-attention-row-${r.id}`}>
                      <TableCell className="font-medium text-foreground">
                        {r.id}
                        {r.awaitingCeo && (
                          <Badge
                            variant="outline"
                            className="ml-2 border-blue-200 bg-blue-50 text-blue-700"
                          >
                            CEO
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>{r.reviewType}</TableCell>
                      <TableCell className="hidden md:table-cell">
                        <div className="font-medium text-foreground">
                          {r.jobCode}
                        </div>
                        <div className="text-xs text-muted-foreground">{r.jobTitle}</div>
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {r.financialImpact > 0 ? formatGbp(r.financialImpact) : "—"}
                      </TableCell>
                      <TableCell>
                        <span
                          className={
                            r.overdue
                              ? "font-semibold text-rose-600"
                              : r.approachingSla
                              ? "font-medium text-amber-600"
                              : "text-muted-foreground"
                          }
                        >
                          {r.ageLabel}
                        </span>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">
                        <Badge variant="outline" className={riskBadge(r.risk)}>
                          {r.risk}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={priorityBadge(r.priority)}
                        >
                          {r.priority}
                        </Badge>
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">
                        <RecommendationBadge
                          type={computeReviewRecommendation(r).type}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Executive insights */}
      <Card data-testid="review-executive-insights">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Lightbulb className="h-4 w-4 text-amber-500" /> Executive Insights
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2">
            {insights.map((insight, i) => (
              <li
                key={i}
                className="flex items-start gap-2 text-sm text-foreground"
                data-testid="review-insight"
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

function ExposureRow({
  label,
  value,
  bold,
}: {
  label: string;
  value: string;
  bold?: boolean;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span
        className={`text-sm ${
          bold ? "font-bold text-foreground" : "font-medium text-foreground"
        }`}
      >
        {value}
      </span>
    </div>
  );
}

function WorkloadRow({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-semibold text-foreground">{value}</span>
    </div>
  );
}
