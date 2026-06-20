/**
 * UX-7.2 — REVIEW PRIORITY PANEL
 *
 * The CEO's recommended work queue. A read-only intelligent-prioritisation
 * layer that answers "What should I review first?".
 *
 * Doctrine:
 *   - Visibility only. No approve / reject / correct controls live here.
 *   - Prioritisation orders and highlights; it never changes an outcome.
 *   - Every value is derived by reviewPriorityEngine (pure, deterministic).
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
  ListChecks,
  Lightbulb,
  Flame,
  TrendingUp,
  Users,
  Clock,
  CheckCircle2,
} from "lucide-react";
import { formatGbp } from "@/lib/reviewIntelligenceEngine";
import {
  computePriorityQueue,
  computePriorityDistribution,
  computePriorityInsights,
  computeExecutiveAttention,
  getPriorityMeta,
  PRIORITY_CATEGORIES,
  type PrioritisedReview,
  type PriorityCategory,
} from "@/lib/reviewPriorityEngine";

export function PriorityBadge({
  category,
  className = "",
}: {
  category: PriorityCategory;
  className?: string;
}) {
  const meta = getPriorityMeta(category);
  return (
    <Badge
      variant="outline"
      className={`${meta.badgeClass} ${className}`}
      data-testid={`priority-badge-${category.toLowerCase()}`}
    >
      {category}
    </Badge>
  );
}

export function ReviewPriorityPanel() {
  const { queue, distribution, insights, attention } = useMemo(() => {
    const queue = computePriorityQueue();
    return {
      queue,
      distribution: computePriorityDistribution(queue),
      insights: computePriorityInsights(queue),
      attention: computeExecutiveAttention(queue),
    };
  }, []);

  return (
    <div className="space-y-6" data-testid="review-priority-panel">
      <div>
        <h3 className="flex items-center gap-2 text-lg font-semibold text-slate-900">
          <ListChecks className="h-5 w-5 text-blue-500" /> Recommended Work Queue
        </h3>
        <p className="text-sm text-slate-500">
          Intelligent prioritisation — what to review first. Guidance only; every
          decision still happens in the queue below.
        </p>
      </div>

      {/* Priority distribution */}
      <div
        className="grid grid-cols-2 gap-3 lg:grid-cols-4"
        data-testid="review-priority-distribution"
      >
        {distribution.map((d) => {
          const meta = getPriorityMeta(d.category);
          return (
            <Card
              key={d.category}
              data-testid={`priority-dist-${d.category.toLowerCase()}`}
            >
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <span className={`h-2.5 w-2.5 rounded-full ${meta.dotClass}`} />
                  <span className="text-[11px] font-medium uppercase tracking-wide text-slate-400">
                    {d.category}
                  </span>
                </div>
                <p className="mt-2 text-2xl font-bold text-slate-900">
                  {d.count}
                </p>
                <p className="text-xs text-slate-500">{d.percent}% of queue</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Priority insights */}
      <Card data-testid="review-priority-insights">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Lightbulb className="h-4 w-4 text-amber-500" /> Priority Insights
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2">
            {insights.map((insight, i) => (
              <li
                key={i}
                className="flex items-start gap-2 text-sm text-slate-700"
                data-testid="priority-insight"
              >
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-blue-500" />
                {insight}
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      {/* Priority queue */}
      <Card data-testid="review-priority-queue">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <ListChecks className="h-4 w-4 text-slate-400" /> Priority Queue
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {queue.length === 0 ? (
            <EmptyQueue />
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-slate-50/50">
                  <TableRow>
                    <TableHead className="w-12">#</TableHead>
                    <TableHead>Review</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead className="hidden sm:table-cell">Score</TableHead>
                    <TableHead className="hidden md:table-cell">Type</TableHead>
                    <TableHead className="hidden lg:table-cell">Job</TableHead>
                    <TableHead className="text-right">Financial Impact</TableHead>
                    <TableHead>Age</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {queue.map((r) => (
                    <TableRow
                      key={r.id}
                      data-testid={`priority-queue-row-${r.id}`}
                    >
                      <TableCell className="font-semibold text-slate-400">
                        {r.queuePosition}
                      </TableCell>
                      <TableCell className="font-medium text-slate-700">
                        {r.id}
                      </TableCell>
                      <TableCell>
                        <PriorityBadge category={r.priority.category} />
                      </TableCell>
                      <TableCell className="hidden sm:table-cell font-medium">
                        {r.priority.score}
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        {r.reviewType}
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">
                        <div className="font-medium text-slate-700">
                          {r.jobCode}
                        </div>
                        <div className="text-xs text-slate-500">{r.jobTitle}</div>
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {r.financialImpact > 0
                          ? formatGbp(r.financialImpact)
                          : "—"}
                      </TableCell>
                      <TableCell>
                        <span
                          className={
                            r.priority.overdue
                              ? "font-semibold text-rose-600"
                              : "text-slate-600"
                          }
                        >
                          {r.ageLabel}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Executive attention */}
      <div
        className="grid gap-4 md:grid-cols-2 xl:grid-cols-4"
        data-testid="review-executive-attention"
      >
        <AttentionList
          title="Critical"
          icon={<Flame className="h-4 w-4 text-rose-500" />}
          items={attention.critical}
          testId="attention-critical"
          emptyLabel="No critical reviews"
        />
        <AttentionList
          title="Revenue at Risk"
          icon={<TrendingUp className="h-4 w-4 text-emerald-500" />}
          items={attention.revenueAtRisk}
          testId="attention-revenue"
          emptyLabel="No revenue exposure"
          showMoney
        />
        <AttentionList
          title="Payroll Sensitive"
          icon={<Users className="h-4 w-4 text-blue-500" />}
          items={attention.payrollSensitive}
          testId="attention-payroll"
          emptyLabel="No payroll reviews"
          showMoney
        />
        <AttentionList
          title="Oldest High-Priority"
          icon={<Clock className="h-4 w-4 text-amber-500" />}
          items={attention.oldestHighPriority}
          testId="attention-oldest"
          emptyLabel="None waiting"
          showAge
        />
      </div>
    </div>
  );
}

function AttentionList({
  title,
  icon,
  items,
  testId,
  emptyLabel,
  showMoney,
  showAge,
}: {
  title: string;
  icon: React.ReactNode;
  items: PrioritisedReview[];
  testId: string;
  emptyLabel: string;
  showMoney?: boolean;
  showAge?: boolean;
}) {
  return (
    <Card data-testid={testId}>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm">
          {icon} {title}
          <span className="ml-auto text-xs font-normal text-slate-400">
            {items.length}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {items.length === 0 ? (
          <p className="text-xs text-slate-400">{emptyLabel}</p>
        ) : (
          items.map((r) => (
            <div
              key={r.id}
              className="flex items-center justify-between gap-2 text-sm"
            >
              <div className="min-w-0">
                <div className="truncate font-medium text-slate-700">
                  {r.id}
                </div>
                <div className="truncate text-xs text-slate-500">
                  {r.reviewType}
                </div>
              </div>
              <span className="shrink-0 text-xs font-medium text-slate-600">
                {showMoney
                  ? formatGbp(r.financialImpact)
                  : showAge
                  ? r.ageLabel
                  : `${r.priority.score}`}
              </span>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}

function EmptyQueue() {
  return (
    <div
      className="flex flex-col items-center justify-center py-10 text-slate-500"
      data-testid="review-priority-empty"
    >
      <CheckCircle2 className="mb-3 h-10 w-10 text-emerald-500" />
      <p className="font-medium text-slate-900">Queue is clear</p>
      <p className="text-sm">No pending reviews to prioritise.</p>
    </div>
  );
}
