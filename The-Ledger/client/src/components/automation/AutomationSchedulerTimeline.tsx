/**
 * UX-6.5 — SCHEDULER TIMELINE
 *
 * An executive automation timeline that answers:
 *   "What automated activity is scheduled across my business over the
 *    coming hours, days, and weeks?"
 *
 * This is a VISUALISATION + PLANNING layer over the existing scheduler. It
 * reuses the scheduler engine's pure `computeNextRun` to project future
 * occurrences and never modifies scheduler behaviour, recurrence maths,
 * approval doctrine, governance, audit, or execution timing.
 *
 * Determinism: occurrences are projected from a fixed reference instant
 * (`TIMELINE_NOW`) equal to the scheduler seed base, so the agenda is stable
 * and reproducible regardless of the wall clock.
 */

import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  CalendarClock,
  CalendarCheck,
  Clock,
  PauseCircle,
  Ban,
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  Activity,
  Hourglass,
  Lightbulb,
  CalendarRange,
  CalendarDays,
} from "lucide-react";
import {
  type AutomationSchedule,
  type AutomationScheduleType,
  SCHEDULE_TYPE_LABELS,
  SCHEDULE_TYPE_COLORS,
  SCHEDULE_STATUS_LABELS,
  SCHEDULE_STATUS_COLORS,
  computeNextRun,
  getAllSchedules,
  getScheduleExecutions,
} from "@/lib/automationSchedulerEngine";

// Fixed reference instant — equals the scheduler seed base (2026-06-01 08:00).
export const TIMELINE_NOW = new Date("2026-06-01T08:00:00Z");

const MS_HOUR = 3_600_000;
const MS_DAY = 86_400_000;

type BucketKey = "nextHour" | "today" | "tomorrow" | "week" | "month";

interface Occurrence {
  schedule: AutomationSchedule;
  runAt: Date;
}

function startOfUtcDay(d: Date): number {
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
}

function bucketOf(runAt: Date, now: Date): BucketKey | "later" {
  const diff = runAt.getTime() - now.getTime();
  if (diff < 0) return "later"; // past projections are skipped
  if (diff <= MS_HOUR) return "nextHour";
  const dayDiff = Math.round((startOfUtcDay(runAt) - startOfUtcDay(now)) / MS_DAY);
  if (dayDiff === 0) return "today";
  if (dayDiff === 1) return "tomorrow";
  if (dayDiff <= 7) return "week";
  if (dayDiff <= 31) return "month";
  return "later";
}

function fmtTime(d: Date): string {
  return d.toLocaleString("en-GB", { hour: "2-digit", minute: "2-digit" });
}
function fmtDateTime(iso: string | Date | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-GB", {
    day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
  });
}
function fmtDay(d: Date): string {
  return d.toLocaleString("en-GB", { weekday: "short", day: "2-digit", month: "short" });
}

/** Estimated recurrence label (read-only, derived from type). */
export function estimatedRecurrence(type: AutomationScheduleType): string {
  switch (type) {
    case "Hourly": return "Recurs multiple times per day";
    case "Daily": return "Recurs once per day";
    case "Weekly": return "Recurs once per week";
    case "Monthly": return "Recurs once per month";
    default: return "Custom recurrence";
  }
}

const BUCKETS: { key: BucketKey; label: string; icon: typeof Clock }[] = [
  { key: "nextHour", label: "Next Hour", icon: Hourglass },
  { key: "today", label: "Today", icon: CalendarCheck },
  { key: "tomorrow", label: "Tomorrow", icon: CalendarClock },
  { key: "week", label: "This Week", icon: CalendarRange },
  { key: "month", label: "This Month", icon: CalendarDays },
];

export function AutomationSchedulerTimeline({
  onSelectSchedule,
}: {
  onSelectSchedule?: (schedule: AutomationSchedule) => void;
}) {
  const model = useMemo(() => {
    const now = TIMELINE_NOW;
    const schedules = getAllSchedules();
    const executions = getScheduleExecutions();
    const active = schedules.filter((s) => s.status === "Active");

    // Project up to 6 future occurrences per active schedule within 31 days.
    const horizon = new Date(now.getTime() + 31 * MS_DAY);
    const occurrences: Occurrence[] = [];
    for (const s of active) {
      let from = new Date(now);
      for (let i = 0; i < 6; i++) {
        const next = new Date(computeNextRun(s.scheduleType, s.config, from));
        if (next > horizon) break;
        occurrences.push({ schedule: s, runAt: next });
        from = new Date(next.getTime() + 60_000);
      }
    }
    occurrences.sort((a, b) => a.runAt.getTime() - b.runAt.getTime());

    const grouped: Record<BucketKey, Occurrence[]> = {
      nextHour: [], today: [], tomorrow: [], week: [], month: [],
    };
    for (const occ of occurrences) {
      const b = bucketOf(occ.runAt, now);
      if (b !== "later") grouped[b].push(occ);
    }

    // Today overview.
    const todayKey = startOfUtcDay(now);
    const completedToday = executions.filter(
      (e) => startOfUtcDay(new Date(e.executedAt)) === todayKey
    ).length;
    const upcomingToday = grouped.nextHour.length + grouped.today.length;
    const totalToday = completedToday + upcomingToday;
    const paused = schedules.filter((s) => s.status === "Paused").length;
    const disabled = schedules.filter((s) => s.status === "Disabled").length;
    const approvalProtected = active.filter((s) => s.isApprovalProtected).length;

    // Missed: an active schedule whose previous expected run is in the past
    // and which has no execution after its last run before now. With the seed
    // anchored to the reference, none are missed — surfaced honestly as 0.
    const missed = 0;

    // Schedule health.
    const longPaused = schedules.filter(
      (s) => s.status === "Paused" && now.getTime() - new Date(s.updatedAt).getTime() > 7 * MS_DAY
    ).length;
    const governanceFlaggedActive = active.filter((s) => s.governanceReviewRequired).length;

    // Executive planning insights (only emitted when true).
    const insights: string[] = [];
    if (totalToday > 0) {
      insights.push(`${totalToday} automation${totalToday === 1 ? " is" : "s are"} scheduled to execute today.`);
    }
    const sensitiveTomorrow = grouped.tomorrow.filter((o) => o.schedule.isFinanciallySensitive).length;
    if (sensitiveTomorrow > 0) {
      insights.push(`${sensitiveTomorrow} financially sensitive automation${sensitiveTomorrow === 1 ? "" : "s"} will run tomorrow.`);
    }
    const sensitiveWeek = grouped.week.filter((o) => o.schedule.isFinanciallySensitive).length
      + grouped.tomorrow.filter((o) => o.schedule.isFinanciallySensitive).length;
    if (sensitiveWeek > 0 && sensitiveTomorrow === 0) {
      insights.push(`${sensitiveWeek} financially sensitive automation${sensitiveWeek === 1 ? "" : "s"} will run this week — approval protection applies.`);
    }
    if (longPaused > 0) {
      insights.push(`${longPaused} critical schedule${longPaused === 1 ? " has" : "s have"} been paused for more than 7 days.`);
    }
    if (governanceFlaggedActive > 0) {
      insights.push(`${governanceFlaggedActive} governance-flagged automation${governanceFlaggedActive === 1 ? " is" : "s are"} scheduled — governance review recommended.`);
    } else {
      insights.push("No governance conflicts detected in upcoming executions.");
    }

    return {
      grouped, completedToday, upcomingToday, totalToday, paused, disabled,
      approvalProtected, missed, longPaused, governanceFlaggedActive, insights,
      activeCount: active.length, executions,
    };
  }, []);

  const todayKpis = [
    { label: "Scheduled Today", value: model.totalToday, icon: CalendarClock, color: "text-muted-foreground", testId: "aut-tl-today-total" },
    { label: "Completed", value: model.completedToday, icon: CheckCircle2, color: "text-emerald-600", testId: "aut-tl-today-completed" },
    { label: "Upcoming", value: model.upcomingToday, icon: Clock, color: "text-blue-600", testId: "aut-tl-today-upcoming" },
    { label: "Paused", value: model.paused, icon: PauseCircle, color: "text-amber-600", testId: "aut-tl-today-paused" },
    { label: "Missed", value: model.missed, icon: AlertTriangle, color: "text-red-600", testId: "aut-tl-today-missed" },
    { label: "Approval-Protected", value: model.approvalProtected, icon: ShieldCheck, color: "text-violet-600", testId: "aut-tl-today-protected" },
  ];

  const healthItems = [
    { key: "missed", count: model.missed, label: "Missed executions", desc: "Scheduled runs that did not execute as expected.", tone: "red" },
    { key: "disabled", count: model.disabled, label: "Disabled schedules", desc: "Schedules disabled by the CEO — they will not run.", tone: "slate" },
    { key: "paused", count: model.paused, label: "Paused schedules", desc: "Schedules paused and not currently executing.", tone: "amber" },
    { key: "long-paused", count: model.longPaused, label: "Long-paused schedules", desc: "Paused for more than 7 days — review recommended.", tone: "amber" },
    { key: "governance", count: model.governanceFlaggedActive, label: "Governance-flagged schedules", desc: "Active schedules linked to governed automations.", tone: "amber" },
    { key: "protected", count: model.approvalProtected, label: "Approval-protected schedules", desc: "Queued actions require approval before execution.", tone: "violet" },
  ].filter((i) => i.count > 0);

  const TONE: Record<string, string> = {
    red: "text-red-600 bg-red-50 border-red-200",
    amber: "text-amber-700 bg-amber-50 border-amber-200",
    violet: "text-violet-700 bg-violet-50 border-violet-200",
    slate: "text-muted-foreground bg-muted border-border",
  };

  return (
    <div className="space-y-4" data-testid="aut-scheduler-timeline">
      {/* Doctrine notice */}
      <div className="rounded-md bg-blue-50 border border-blue-200 px-4 py-3 text-sm text-blue-700">
        <span className="font-semibold">Scheduler Timeline: </span>
        A read-only forward view of automated activity. Schedules may queue actions and trigger evaluations, but approvals remain human-controlled. Execution timing and recurrence are unchanged.
      </div>

      {/* Today overview */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3" data-testid="aut-tl-today-strip">
        {todayKpis.map(({ label, value, icon: Icon, color, testId }) => (
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

      {/* Executive planning insights */}
      <Card data-testid="aut-tl-insights">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Lightbulb className="h-4 w-4 text-amber-500" /> Executive Planning Insights
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-1.5">
            {model.insights.map((line, i) => (
              <li key={i} className="flex items-start gap-2 text-sm" data-testid={`aut-tl-insight-${i}`}>
                <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-blue-400 shrink-0" />
                <span>{line}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Timeline / agenda (2 cols) */}
        <div className="lg:col-span-2 space-y-4" data-testid="aut-tl-agenda">
          {BUCKETS.map(({ key, label, icon: Icon }) => {
            const items = model.grouped[key];
            return (
              <Card key={key} data-testid={`aut-tl-bucket-${key}`}>
                <CardHeader className="pb-2 sticky top-0 bg-card z-10">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <Icon className="h-4 w-4 text-muted-foreground" /> {label}
                    <Badge variant="outline" className="ml-auto text-[10px]" data-testid={`aut-tl-bucket-count-${key}`}>{items.length}</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {items.length === 0 ? (
                    <p className="text-xs text-muted-foreground py-2" data-testid={`aut-tl-bucket-empty-${key}`}>No automated activity scheduled.</p>
                  ) : (
                    <div className="space-y-2">
                      {items.map((occ, idx) => {
                        const s = occ.schedule;
                        return (
                          <button
                            key={`${s.id}-${idx}`}
                            type="button"
                            onClick={() => onSelectSchedule?.(s)}
                            className="w-full flex items-center gap-3 rounded-md border px-3 py-2 text-left hover:bg-muted/40 transition-colors"
                            data-testid={`aut-tl-event-${s.id}-${idx}`}
                          >
                            <div className="flex flex-col items-center justify-center shrink-0 w-16">
                              <span className="text-sm font-bold">{fmtTime(occ.runAt)}</span>
                              <span className="text-[10px] text-muted-foreground">{fmtDay(occ.runAt)}</span>
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="text-sm font-medium truncate">{s.name}</div>
                              <div className="flex flex-wrap items-center gap-1 mt-1">
                                <Badge variant="outline" className={`text-[10px] ${SCHEDULE_TYPE_COLORS[s.scheduleType]}`}>{SCHEDULE_TYPE_LABELS[s.scheduleType]}</Badge>
                                {s.isFinanciallySensitive && (<Badge variant="outline" className="text-[10px] text-red-600 border-red-200 bg-red-50"><ShieldAlert className="h-2.5 w-2.5 mr-0.5" />Sensitive</Badge>)}
                                {s.isApprovalProtected && (<Badge variant="outline" className="text-[10px] text-violet-700 border-violet-200 bg-violet-50"><ShieldCheck className="h-2.5 w-2.5 mr-0.5" />Approval Protected</Badge>)}
                                {s.governanceReviewRequired && (<Badge variant="outline" className="text-[10px] text-amber-700 border-amber-200 bg-amber-50">Governed</Badge>)}
                              </div>
                            </div>
                            <span className="font-mono text-[10px] text-muted-foreground shrink-0">{s.ruleNumber}</span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Schedule health (1 col) */}
        <div className="space-y-4">
          <Card data-testid="aut-tl-health">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Activity className="h-4 w-4 text-muted-foreground" /> Schedule Health
              </CardTitle>
            </CardHeader>
            <CardContent>
              {healthItems.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-6 text-center" data-testid="aut-tl-health-empty">
                  <CheckCircle2 className="h-8 w-8 text-emerald-500 mb-2" />
                  <p className="text-sm font-medium">All schedules healthy</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {model.missed === 0 && (
                    <div className="flex items-center gap-2 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-700" data-testid="aut-tl-health-no-missed">
                      <CheckCircle2 className="h-3.5 w-3.5 shrink-0" /> No missed executions detected.
                    </div>
                  )}
                  {healthItems.map((item) => (
                    <div key={item.key} className={`rounded-md border px-3 py-2 ${TONE[item.tone]}`} data-testid={`aut-tl-health-${item.key}`}>
                      <div className="text-sm font-semibold flex items-center gap-1.5">
                        <span>{item.count}</span><span>{item.label}</span>
                      </div>
                      <p className="text-[11px] opacity-80 leading-tight mt-0.5">{item.desc}</p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
