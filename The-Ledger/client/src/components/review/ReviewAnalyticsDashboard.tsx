/**
 * UX-7.6 — REVIEW OPERATIONS ANALYTICS DASHBOARD
 *
 * Executive analytics on how efficiently the business makes decisions:
 * volume/throughput, approval performance, bottlenecks, reviewer performance,
 * review-type analytics, financial throughput, trends, an operational health
 * score, and executive insights.
 *
 * Doctrine:
 *   - MEASURES decision-making; never alters it. Read-only throughout — no
 *     approve/reject/correct controls. Every value from reviewAnalyticsEngine.
 */

import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
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
  Activity,
  Gauge,
  Timer,
  AlertTriangle,
  Users,
  Layers,
  PoundSterling,
  TrendingUp,
  TrendingDown,
  Minus,
  Lightbulb,
  HeartPulse,
} from "lucide-react";
import {
  computeReviewAnalyticsModel,
  formatGbp,
  formatAge,
  type TrendSeries,
} from "@/lib/reviewAnalyticsEngine";

function Kpi({
  label,
  value,
  icon,
  testId,
  tone = "default",
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  testId: string;
  tone?: "default" | "good" | "warn" | "danger";
}) {
  const toneCls =
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
        <p className={`mt-2 text-2xl font-bold ${toneCls}`}>{value}</p>
      </CardContent>
    </Card>
  );
}

function hours(n: number) {
  return n > 0 ? formatAge(n) : "—";
}

export function ReviewAnalyticsDashboard() {
  const model = useMemo(() => computeReviewAnalyticsModel(), []);
  const {
    volume,
    throughput,
    performance,
    bottlenecks,
    reviewers,
    typeAnalytics,
    financialThroughput: fin,
    trends,
    health,
    insights,
  } = model;

  const healthTone =
    health.score >= 85
      ? "text-emerald-600"
      : health.score >= 70
      ? "text-sky-600"
      : health.score >= 50
      ? "text-amber-600"
      : "text-rose-600";

  return (
    <div className="space-y-6" data-testid="review-analytics-dashboard">
      <div>
        <h3 className="flex items-center gap-2 text-lg font-semibold text-foreground">
          <Activity className="h-5 w-5 text-blue-500" /> Review Operations Analytics
        </h3>
        <p className="text-sm text-muted-foreground">
          How efficiently the business is making decisions. Measurement only —
          nothing here changes review behaviour.
        </p>
      </div>

      {/* Operational health score */}
      <Card data-testid="review-health-score">
        <CardContent className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <HeartPulse className={`h-8 w-8 ${healthTone}`} />
            <div>
              <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                Review Operations Health
              </p>
              <p className={`text-3xl font-bold ${healthTone}`}>
                {health.score}
                <span className="text-base font-medium text-muted-foreground">/100</span>{" "}
                <Badge variant="outline" data-testid="health-status">
                  {health.status}
                </Badge>
              </p>
            </div>
          </div>
          <p className="max-w-md text-sm text-muted-foreground" data-testid="health-explanation">
            {health.explanation}
          </p>
        </CardContent>
      </Card>

      {/* Volume + throughput KPIs */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5" data-testid="review-volume-kpis">
        <Kpi testId="kpi-total" label="Total Reviews" value={String(volume.total)} icon={<Layers className="h-4 w-4" />} />
        <Kpi testId="kpi-pending" label="Pending" value={String(volume.pending)} icon={<Timer className="h-4 w-4" />} />
        <Kpi testId="kpi-completed" label="Completed" value={String(volume.completed)} icon={<Activity className="h-4 w-4" />} tone="good" />
        <Kpi testId="kpi-approved" label="Approved" value={String(volume.approved)} icon={<TrendingUp className="h-4 w-4" />} tone="good" />
        <Kpi testId="kpi-rejected" label="Rejected" value={String(volume.rejected)} icon={<TrendingDown className="h-4 w-4" />} />
        <Kpi testId="kpi-corrected" label="Corrected" value={String(volume.corrected)} icon={<Minus className="h-4 w-4" />} tone="warn" />
        <Kpi testId="kpi-today" label="Processed Today" value={String(throughput.processedToday)} icon={<Activity className="h-4 w-4" />} />
        <Kpi testId="kpi-week" label="Processed / Week" value={String(throughput.processedThisWeek)} icon={<Activity className="h-4 w-4" />} />
        <Kpi testId="kpi-avg-daily" label="Avg Daily" value={String(throughput.averageDaily)} icon={<Gauge className="h-4 w-4" />} />
        <Kpi testId="kpi-avg-weekly" label="Avg Weekly" value={String(throughput.averageWeekly)} icon={<Gauge className="h-4 w-4" />} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Approval performance */}
        <Card data-testid="review-approval-performance">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Timer className="h-4 w-4 text-muted-foreground" /> Approval Performance
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <PerfRow label="Average approval time" value={hours(performance.avgApprovalHours)} />
            <PerfRow label="Average rejection time" value={hours(performance.avgRejectionHours)} />
            <PerfRow label="Average correction time" value={hours(performance.avgCorrectionHours)} />
            <PerfRow label="Fastest approval" value={hours(performance.fastestApprovalHours)} />
            <PerfRow label="Slowest approval" value={hours(performance.slowestApprovalHours)} />
            <div className="flex items-center justify-between border-t border-border pt-2">
              <span className="text-muted-foreground">SLA compliance</span>
              <Badge variant="outline" data-testid="sla-compliance">
                {performance.slaCompliancePercent}%
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Financial throughput */}
        <Card data-testid="review-financial-throughput">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <PoundSterling className="h-4 w-4 text-muted-foreground" /> Financial Throughput
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm">
            <PerfRow label="Revenue awaiting" value={formatGbp(fin.revenueAwaiting)} />
            <PerfRow label="Revenue approved" value={formatGbp(fin.revenueApproved)} />
            <PerfRow label="Revenue delayed" value={formatGbp(fin.revenueDelayed)} />
            <PerfRow label="Costs awaiting" value={formatGbp(fin.costsAwaiting)} />
            <PerfRow label="Costs approved" value={formatGbp(fin.costsApproved)} />
            <PerfRow label="Payroll awaiting" value={formatGbp(fin.payrollAwaiting)} />
            <PerfRow label="Payroll released" value={formatGbp(fin.payrollReleased)} />
          </CardContent>
        </Card>
      </div>

      {/* Bottleneck analysis */}
      <Card data-testid="review-bottlenecks">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <AlertTriangle className="h-4 w-4 text-amber-500" /> Bottleneck Analysis
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {bottlenecks.warnings.length > 0 && (
            <ul className="space-y-1" data-testid="bottleneck-warnings">
              {bottlenecks.warnings.map((w, i) => (
                <li
                  key={i}
                  className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 p-2 text-sm text-amber-800"
                  data-testid="bottleneck-warning"
                >
                  <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  {w}
                </li>
              ))}
            </ul>
          )}
          <div className="grid gap-4 md:grid-cols-2">
            <BottleneckList title="Oldest pending" items={bottlenecks.oldestPending} testId="bottleneck-oldest" showAge />
            <BottleneckList title="Exceeding SLA" items={bottlenecks.exceedingSla} testId="bottleneck-sla" showAge emptyLabel="None over SLA" />
            <BottleneckList title="High-risk awaiting" items={bottlenecks.highRiskAwaiting} testId="bottleneck-highrisk" emptyLabel="None" />
            <BottleneckList title="Financially sensitive" items={bottlenecks.financiallySensitiveAwaiting} testId="bottleneck-sensitive" showMoney emptyLabel="None" />
          </div>
        </CardContent>
      </Card>

      {/* Reviewer performance */}
      <Card data-testid="review-reviewer-performance">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Users className="h-4 w-4 text-muted-foreground" /> Reviewer Performance
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead>Reviewer</TableHead>
                  <TableHead className="text-right">Completed</TableHead>
                  <TableHead className="text-right">Approval %</TableHead>
                  <TableHead className="text-right hidden sm:table-cell">Rejection %</TableHead>
                  <TableHead className="text-right hidden sm:table-cell">Correction %</TableHead>
                  <TableHead className="text-right hidden md:table-cell">Avg Handling</TableHead>
                  <TableHead className="text-right">Queue</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reviewers.map((r) => (
                  <TableRow key={r.reviewer} data-testid={`reviewer-row-${r.reviewer.toLowerCase()}`}>
                    <TableCell className="font-medium text-foreground">{r.reviewer}</TableCell>
                    <TableCell className="text-right">{r.completed}</TableCell>
                    <TableCell className="text-right">{r.approvalRate}%</TableCell>
                    <TableCell className="text-right hidden sm:table-cell">{r.rejectionRate}%</TableCell>
                    <TableCell className="text-right hidden sm:table-cell">{r.correctionRate}%</TableCell>
                    <TableCell className="text-right hidden md:table-cell">{formatAge(r.avgHandlingHours)}</TableCell>
                    <TableCell className="text-right">{r.currentQueueSize}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Review-type analytics */}
      <Card data-testid="review-type-analytics">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Layers className="h-4 w-4 text-muted-foreground" /> Review Type Analytics
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-right">Volume</TableHead>
                  <TableHead className="text-right">Approval %</TableHead>
                  <TableHead className="text-right hidden sm:table-cell">Avg Review Time</TableHead>
                  <TableHead className="text-right">Backlog</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {typeAnalytics.map((t) => (
                  <TableRow
                    key={t.type}
                    data-testid={`type-analytics-${t.type.toLowerCase().replace(/\s+/g, "-")}`}
                  >
                    <TableCell className="font-medium text-foreground">{t.type}</TableCell>
                    <TableCell className="text-right">{t.volume}</TableCell>
                    <TableCell className="text-right">{t.approvalRate}%</TableCell>
                    <TableCell className="text-right hidden sm:table-cell">{formatAge(t.avgReviewHours)}</TableCell>
                    <TableCell className="text-right">{t.backlog}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Trends */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5" data-testid="review-trends">
        {trends.map((t) => (
          <TrendCard key={t.label} trend={t} />
        ))}
      </div>

      {/* Executive analytics insights */}
      <Card data-testid="review-analytics-insights">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Lightbulb className="h-4 w-4 text-amber-500" /> Executive Analytics Insights
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2">
            {insights.map((insight, i) => (
              <li
                key={i}
                className="flex items-start gap-2 text-sm text-foreground"
                data-testid="analytics-insight"
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

function PerfRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between py-0.5">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium text-foreground">{value}</span>
    </div>
  );
}

function BottleneckList({
  title,
  items,
  testId,
  showAge,
  showMoney,
  emptyLabel = "None pending",
}: {
  title: string;
  items: { id: string; reviewType: string; jobCode: string; ageLabel: string; financialImpact: number }[];
  testId: string;
  showAge?: boolean;
  showMoney?: boolean;
  emptyLabel?: string;
}) {
  return (
    <div className="rounded-md border border-border p-3" data-testid={testId}>
      <p className="mb-2 text-sm font-medium text-foreground">{title}</p>
      {items.length === 0 ? (
        <p className="text-xs text-muted-foreground">{emptyLabel}</p>
      ) : (
        <div className="space-y-1">
          {items.map((it) => (
            <div key={it.id} className="flex items-center justify-between gap-2 text-sm">
              <div className="min-w-0">
                <span className="font-medium text-foreground">{it.id}</span>
                <span className="ml-2 text-xs text-muted-foreground">{it.reviewType}</span>
              </div>
              <span className="shrink-0 text-xs font-medium text-muted-foreground">
                {showMoney ? formatGbp(it.financialImpact) : showAge ? it.ageLabel : it.jobCode}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function TrendCard({ trend }: { trend: TrendSeries }) {
  const max = Math.max(...trend.points, 1);
  const dirIcon =
    trend.direction === "up" ? (
      <TrendingUp className="h-3.5 w-3.5 text-emerald-500" />
    ) : trend.direction === "down" ? (
      <TrendingDown className="h-3.5 w-3.5 text-rose-500" />
    ) : (
      <Minus className="h-3.5 w-3.5 text-muted-foreground" />
    );
  return (
    <Card data-testid={`trend-${trend.label.toLowerCase()}`}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            {trend.label}
          </span>
          {dirIcon}
        </div>
        <div className="mt-2 flex h-10 items-end gap-1">
          {trend.points.map((p, i) => (
            <div
              key={i}
              className="flex-1 rounded-sm bg-blue-200"
              style={{ height: `${Math.max(8, (p / max) * 100)}%` }}
            />
          ))}
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          {trend.changePercent >= 0 ? "+" : ""}
          {trend.changePercent}% wk
        </p>
      </CardContent>
    </Card>
  );
}
