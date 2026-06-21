import { Layout } from "@/components/layout";
import { useStore, useAuth } from "@/lib/mockData";
import { isCEO, isProjectManager } from "@/lib/roleHelpers";
import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { WeeklyIntelligenceStrip } from "@/components/schedule/WeeklyIntelligenceStrip";
import { JobScheduleCard } from "@/components/schedule/JobScheduleCard";
import { SmartFilters } from "@/components/schedule/SmartFilters";
import { OperationalDrawer } from "@/components/schedule/OperationalDrawer";
import { startOfWeek, addDays, format, isSameDay } from "date-fns";
import { ChevronLeft, ChevronRight, Users, TriangleAlert, CheckCircle2, ClipboardCheck, Calendar, MapPin } from "lucide-react";
import { useLocation } from "wouter";
import { Job } from "@/types/job";

type DayRollup = Date;

type OperationalJob = Job & {
  clientName: string;
  contractValue: number;
  costToDate: number;
  invoicedPct: number;
  scheduledHours: number;
  remainingLaborHours: number;
  crewCount: number;
  equipmentCount: number;
  forecastMarginPct: number;
  marginStatus: "Green" | "Yellow" | "Red";
  hasConflict: boolean;
};

export default function SchedulePage() {
  const { jobs, clients, workers, roles, reviewItems } = useStore();
  const { user } = useAuth();
  const [, setLocation] = useLocation();

  const userIsPM = isProjectManager(user, roles);

  const [currentDate, setCurrentDate] = useState(new Date());
  const [filters, setFilters] = useState({
    margin: "all",
    crew: "all",
    client: "all",
  });

  // Drawer state
  type SelectedItem =
    | OperationalJob
    | {
        dateStr: string;
        totalScheduledRevenue: number;
        totalEstimatedLaborCost: number;
        netContribution: number;
        crewAllocationPct: number;
        equipmentAllocationPct: number;
      }
    | null;

  const [selectedItem, setSelectedItem] =
    useState<SelectedItem>(null);

  const [drawerType, setDrawerType] =
    useState<"job" | "day" | null>(null);

  // Navigation
  const next = () => setCurrentDate((d) => addDays(d, 7));
  const prev = () => setCurrentDate((d) => addDays(d, -7));
  const today = () => setCurrentDate(new Date());

  // Week Grid Setup
  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
  const weekDays = Array.from({ length: 7 }).map((_, i) =>
    addDays(weekStart, i)
  );

  // -------------------------------------------------------------
  // FORECAST LOGIC MOCKUP
  // In a real app, this would use data fetched from QB API + System Scheduled Hours
  // -------------------------------------------------------------

  const generateMockOperationalData = (
  job: Job
  ): OperationalJob => {
    // Generate deterministic but realistic-looking financial data for the mock
    const seed = job.title.length * 1000;
    const contractValue = 10000 + seed + job.id.charCodeAt(0) * 500;
    const costToDate = contractValue * 0.4;
    const remainingLaborHours = 40 + (seed % 100);
    const scheduledHoursToday = 8 + (seed % 8);
    const crewCount = job.assignedWorkerIds?.length || 2;
    const eqCount = job.assignedEquipmentIds?.length || 0;

    // Margin calculation
    const estRemainingCost = remainingLaborHours * 35;
    const totalEstCost = costToDate + estRemainingCost;

    const forecastMarginPct = Math.round(
      ((contractValue - totalEstCost) / contractValue) * 100
    );

    let marginStatus: "Green" | "Yellow" | "Red" = "Green";

    return {
      ...job,
      clientName:
        clients.find((c) => c.id === job.clientId)?.name ||
        "Unknown Client",
      contractValue,
      costToDate,
      invoicedPct: Math.min(
        100,
        Math.round((costToDate / contractValue) * 110)
      ),
      scheduledHours: scheduledHoursToday,
      remainingLaborHours,
      crewCount,
      equipmentCount: eqCount,
      forecastMarginPct,
      marginStatus,
      hasConflict: seed % 7 === 0,
    };
  };

  const operationalJobs = useMemo(() => {
    return jobs
      .map(generateMockOperationalData)
      .filter((job) => {
        // Apply Smart Filters
        if (filters.margin === "risk" && job.marginStatus === "Green") {
          return false;
        }

        if (
          filters.margin === "healthy" &&
          job.marginStatus !== "Green"
        ) {
          return false;
        }

        if (
          filters.client !== "all" &&
          job.clientId !== filters.client
        ) {
          return false;
        }

        return true;
      });
  }, [jobs, clients, filters]);

  const getJobsForDay = (date: Date) => {
    return operationalJobs.filter((job) => {
      const start = new Date(job.createdAt);
      const end = new Date(job.updatedAt);

      return (
        isSameDay(start, date) ||
        (start <= date && end >= date)
      );
    });
  };

  // Mock Weekly Metrics
  const weeklyMetrics = {
    workforceUtil: 82,
    equipmentUtil: 64,
    scheduledRevenue: 42500,
    forecastedLaborCost: 12400,
    netForecastContribution: 30100,
    overtimeRisk: true,
  };

  // Drawer Handlers
  const handleJobClick = (
    job: OperationalJob
  ) => {
    setSelectedItem(job);
    setDrawerType("job");
  };

  const handleDayClick = (
    day: DayRollup,
    dayJobs: OperationalJob[]
  ) => {
    // Generate daily rollup stats
    const rev = dayJobs.reduce(
      (sum: number, j: OperationalJob) =>
        sum + j.contractValue * 0.05,
      0
    );

    const labor = dayJobs.reduce(
      (sum: number, j: OperationalJob) =>
        sum + j.scheduledHours * 35,
      0
    );

    setSelectedItem({
      dateStr: format(day, "EEEE, MMMM do"),
      totalScheduledRevenue: rev,
      totalEstimatedLaborCost: labor,
      netContribution: rev - labor,
      crewAllocationPct: Math.round(75 + dayJobs.length * 2),
      equipmentAllocationPct: Math.round(40 + dayJobs.length * 5),
    });

    setDrawerType("day");
  };

  // ── PM SCHEDULE VIEW ────────────────────────────────────────────
  if (userIsPM) {
    const pmJobs = jobs.filter(j => j.managerId === user?.id);
    const now = new Date();
    const sevenDaysAhead = addDays(now, 7);

    const activeJobs = pmJobs.filter(j => j.status === 'Active');
    const plannedJobs = pmJobs.filter(j => j.status === 'Planned');

    // Jobs starting within next 7 days
    const upcomingJobs = [...activeJobs, ...plannedJobs].filter(j => {
      const start = new Date(j.startAt);
      return start >= now && start <= sevenDaysAhead;
    });

    // Workers across all PM jobs
    const allWorkerIds = new Set(pmJobs.flatMap(j => j.assignedWorkerIds));
    const assignedWorkers = workers.filter(w => allWorkerIds.has(w.id));

    // Conflict detection: worker on 2+ non-completed PM jobs with overlapping date ranges
    type WorkerConflict = { workerId: string; jobs: Job[] };
    const workerConflicts: WorkerConflict[] = [];
    const nonCompletedJobs = pmJobs.filter(j => j.status !== 'Completed' && j.status !== 'Cancelled');
    for (const workerId of Array.from(allWorkerIds)) {
      const workerJobs = nonCompletedJobs.filter(j => j.assignedWorkerIds.includes(workerId));
      if (workerJobs.length < 2) continue;
      for (let a = 0; a < workerJobs.length; a++) {
        for (let b = a + 1; b < workerJobs.length; b++) {
          const jA = workerJobs[a], jB = workerJobs[b];
          const aStart = new Date(jA.startAt), aEnd = new Date(jA.endAt);
          const bStart = new Date(jB.startAt), bEnd = new Date(jB.endAt);
          if (aStart <= bEnd && bStart <= aEnd) {
            if (!workerConflicts.find(c => c.workerId === workerId)) {
              workerConflicts.push({ workerId, jobs: [jA, jB] });
            }
          }
        }
      }
    }

    // Crew shortage: active/planned job with 0 assigned workers
    const understaffedJobs = nonCompletedJobs.filter(j => j.assignedWorkerIds.length === 0);

    // Resource alerts: planned jobs starting within 7 days with 0 workers
    const resourceAlerts = understaffedJobs.filter(j => {
      const start = new Date(j.startAt);
      return start >= now && start <= sevenDaysAhead;
    });

    const totalAlerts = workerConflicts.length + understaffedJobs.length;

    // All active/planned jobs sorted by start date
    const scheduledDisplay = [...activeJobs, ...plannedJobs].sort(
      (a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime()
    );

    return (
      <Layout>
        <div className="space-y-6 max-w-5xl mx-auto" data-testid="pm-schedule-page">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Schedule</h2>
            <p className="text-muted-foreground mt-1">Your assigned jobs, crew allocation, and upcoming work.</p>
          </div>

          {/* Workforce Snapshot KPI Strip */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3" data-testid="pm-schedule-workforce-snapshot">
            <Card>
              <CardContent className="p-4">
                <div className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Jobs Active</div>
                <div className="text-2xl font-bold" data-testid="pm-sched-kpi-active">{activeJobs.length}</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Jobs Planned</div>
                <div className="text-2xl font-bold" data-testid="pm-sched-kpi-planned">{plannedJobs.length}</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Crew Assigned</div>
                <div className="text-2xl font-bold" data-testid="pm-sched-kpi-crew">{assignedWorkers.length}</div>
              </CardContent>
            </Card>
            <Card className={totalAlerts > 0 ? 'border-amber-200 bg-amber-50/40' : ''}>
              <CardContent className="p-4">
                <div className={`text-xs uppercase tracking-wide mb-1 ${totalAlerts > 0 ? 'text-amber-700' : 'text-muted-foreground'}`}>
                  Alerts
                </div>
                <div className={`text-2xl font-bold ${totalAlerts > 0 ? 'text-amber-700' : ''}`} data-testid="pm-sched-kpi-alerts">
                  {totalAlerts}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Conflict & Alerts Section */}
          <Card data-testid="pm-schedule-conflicts">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <TriangleAlert className="h-4 w-4 text-amber-500" /> Alerts
              </CardTitle>
            </CardHeader>
            <CardContent>
              {workerConflicts.length === 0 && understaffedJobs.length === 0 ? (
                <div className="flex items-center gap-2 text-sm text-emerald-600">
                  <CheckCircle2 className="h-4 w-4" />
                  <span>No workforce conflicts or crew shortages detected.</span>
                </div>
              ) : (
                <div className="space-y-3">
                  {workerConflicts.map((conflict, i) => {
                    const w = workers.find(wk => wk.id === conflict.workerId);
                    return (
                      <div
                        key={i}
                        className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50/40 p-3"
                        data-testid={`pm-conflict-worker-${conflict.workerId}`}
                      >
                        <TriangleAlert className="h-4 w-4 text-red-500 flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="text-sm font-medium text-red-900">Worker Conflict</p>
                          <p className="text-xs text-red-700 mt-0.5">
                            {w ? `${w.firstName} ${w.lastName}` : conflict.workerId} is assigned to overlapping jobs:{' '}
                            {conflict.jobs.map(j => j.title).join(' and ')}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                  {understaffedJobs.map(j => {
                    const isAlert = resourceAlerts.some(r => r.id === j.id);
                    const daysUntilStart = Math.ceil((new Date(j.startAt).getTime() - now.getTime()) / 86400000);
                    return (
                      <div
                        key={j.id}
                        className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50/40 p-3"
                        data-testid={`pm-shortage-job-${j.id}`}
                      >
                        <TriangleAlert className="h-4 w-4 text-amber-500 flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="text-sm font-medium text-amber-900">
                            {isAlert ? 'Resource Alert — ' : ''}Crew Shortage
                          </p>
                          <p className="text-xs text-amber-700 mt-0.5">
                            {j.title} has no crew assigned
                            {isAlert && daysUntilStart > 0 ? ` and starts in ${daysUntilStart} day${daysUntilStart !== 1 ? 's' : ''}` : ''}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* My Scheduled Jobs */}
          <div data-testid="pm-schedule-my-jobs">
            <h3 className="text-lg font-semibold mb-3">My Scheduled Jobs</h3>
            {scheduledDisplay.length === 0 ? (
              <div className="text-center py-8 border-2 border-dashed rounded-lg bg-slate-50">
                <p className="text-muted-foreground text-sm">No active or planned jobs.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {scheduledDisplay.map(job => {
                  const client = clients.find(c => c.id === job.clientId);
                  const pending = reviewItems.filter(r => r.jobId === job.id && r.status === 'pending').length;
                  const isShortage = understaffedJobs.some(j => j.id === job.id);
                  const hasConflict = workerConflicts.some(c => c.jobs.some(cj => cj.id === job.id));
                  return (
                    <Card
                      key={job.id}
                      className={`cursor-pointer hover:border-primary/50 transition-all ${isShortage || hasConflict ? 'border-amber-200 bg-amber-50/20' : ''}`}
                      onClick={() => setLocation(`/jobs/${job.id}`)}
                      data-testid={`pm-sched-job-${job.id}`}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap mb-0.5">
                              <h4 className="font-semibold text-sm truncate">{job.title}</h4>
                              <Badge
                                variant={job.status === 'Active' ? 'default' : 'outline'}
                                className="text-[10px] h-5"
                              >
                                {job.status}
                              </Badge>
                              {isShortage && (
                                <Badge variant="outline" className="text-[10px] h-5 border-amber-300 text-amber-700">
                                  No Crew
                                </Badge>
                              )}
                              {hasConflict && (
                                <Badge variant="outline" className="text-[10px] h-5 border-red-300 text-red-700">
                                  Conflict
                                </Badge>
                              )}
                            </div>
                            {client && (
                              <p className="text-xs text-muted-foreground">{client.name}</p>
                            )}
                          </div>
                          <div className="text-right text-xs text-muted-foreground shrink-0 space-y-0.5">
                            <div className="flex items-center gap-1 justify-end">
                              <Calendar className="h-3 w-3" />
                              {new Date(job.startAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                            </div>
                            <div>→ {new Date(job.endAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1" data-testid={`pm-sched-crew-${job.id}`}>
                            <Users className="h-3 w-3" />
                            {job.assignedWorkerIds.length} crew
                          </span>
                          {pending > 0 && (
                            <span className="flex items-center gap-1 text-amber-700">
                              <ClipboardCheck className="h-3 w-3" />
                              {pending} pending review{pending !== 1 ? 's' : ''}
                            </span>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>

          {/* Upcoming Work — Next 7 Days */}
          <div data-testid="pm-schedule-upcoming">
            <h3 className="text-lg font-semibold mb-3">Upcoming — Next 7 Days</h3>
            {upcomingJobs.length === 0 ? (
              <p className="text-sm text-muted-foreground">No jobs starting in the next 7 days.</p>
            ) : (
              <div className="grid gap-3 md:grid-cols-2">
                {upcomingJobs.map(j => (
                  <Card
                    key={j.id}
                    className="cursor-pointer hover:border-primary/50"
                    onClick={() => setLocation(`/jobs/${j.id}`)}
                    data-testid={`pm-upcoming-${j.id}`}
                  >
                    <CardContent className="p-4 text-sm">
                      <p className="font-medium">{j.title}</p>
                      <p className="text-muted-foreground text-xs mt-1 flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        Starts {new Date(j.startAt).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}
                      </p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>

          {/* Crew Availability */}
          <Card data-testid="pm-schedule-crew-availability">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Users className="h-4 w-4" /> Crew Availability
              </CardTitle>
            </CardHeader>
            <CardContent>
              {assignedWorkers.length === 0 ? (
                <p className="text-sm text-muted-foreground">No crew currently assigned to your jobs.</p>
              ) : (
                <div className="divide-y">
                  {assignedWorkers.map(w => {
                    const wJobs = nonCompletedJobs.filter(j => j.assignedWorkerIds.includes(w.id));
                    const hasConflict = workerConflicts.some(c => c.workerId === w.id);
                    return (
                      <div
                        key={w.id}
                        className="flex items-center justify-between py-3"
                        data-testid={`pm-crew-availability-${w.id}`}
                      >
                        <div>
                          <span className="font-medium text-sm">{w.firstName} {w.lastName}</span>
                          {wJobs.length > 0 && (
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {wJobs.map(j => j.title).join(' · ')}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          {hasConflict && (
                            <Badge variant="outline" className="text-[10px] border-red-300 text-red-700">
                              Conflict
                            </Badge>
                          )}
                          <Badge
                            variant={w.status === 'Active' ? 'default' : 'secondary'}
                            className="text-[10px]"
                          >
                            {w.status}
                          </Badge>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </Layout>
    );
  }

  // ── CEO SCHEDULE VIEW ──────────────────────────────────────────
  return (
    <Layout>
      <div className="flex h-[calc(100vh-80px)] overflow-hidden" data-testid="ceo-schedule-page">
        {/* Main Content Area */}
        <div className="flex-1 flex flex-col min-w-0 pr-4 pl-1 pb-4">
          {/* Header */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-5 shrink-0">
            <div>
              <h2 className="text-2xl font-bold tracking-tight text-slate-900">
                Operational Schedule
              </h2>
              <p className="text-sm text-slate-500 mt-0.5">
                Profit-aware planning & resource control.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-3">
              <SmartFilters
                filters={filters}
                setFilters={setFilters}
              />

              <div className="flex items-center bg-white border border-slate-200 rounded-md shadow-sm p-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={prev}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>

                <span className="w-32 text-center text-sm font-medium text-slate-700">
                  {format(weekStart, "MMM d")} -{" "}
                  {format(addDays(weekStart, 6), "MMM d")}
                </span>

                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={next}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>

              <Button
                variant="outline"
                size="sm"
                className="bg-white border-slate-200 text-slate-600 shadow-sm"
                onClick={today}
              >
                Today
              </Button>
            </div>
          </div>

          {/* Intelligence Strip */}
          <WeeklyIntelligenceStrip metrics={weeklyMetrics} />

          {/* Calendar Grid */}
          <div className="flex-1 bg-white border border-slate-200 rounded-lg shadow-sm flex flex-col overflow-hidden">
            {/* Grid Header */}
            <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50/80 shrink-0">
              {weekDays.map((d, i) => (
                <div
                  key={i}
                  onClick={() => handleDayClick(d, getJobsForDay(d))}
                  className="p-3 text-center border-r border-slate-200 last:border-r-0 cursor-pointer hover:bg-slate-100 transition-colors group"
                >
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-0.5">
                    {format(d, "EEE")}
                  </div>

                  <div
                    className={`text-lg font-bold leading-none ${
                      isSameDay(d, new Date())
                        ? "text-blue-600"
                        : "text-slate-800"
                    }`}
                  >
                    {format(d, "d")}
                  </div>
                </div>
              ))}
            </div>

            {/* Grid Body */}
            <div className="grid grid-cols-7 flex-1 overflow-y-auto">
              {weekDays.map((day, i) => {
                const dayJobs = getJobsForDay(day);
                const isToday = isSameDay(day, new Date());

                return (
                  <div
                    key={i}
                    className={`border-r border-slate-100 last:border-r-0 p-2 space-y-2 min-h-[300px] ${
                      isToday ? "bg-blue-50/20" : ""
                    }`}
                  >
                    {dayJobs.map((job) => (
                      <JobScheduleCard
                        key={job.id}
                        job={job}
                        onClick={() => handleJobClick(job)}
                        isSelected={
                          typeof selectedItem === "object" &&
                          selectedItem !== null &&
                          "id" in selectedItem &&
                          selectedItem.id === job.id
                        }
                      />
                    ))}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Dynamic Drawer */}
        {drawerType === "day" && (
          <div className="shrink-0 h-full animate-in slide-in-from-right duration-300">
            <OperationalDrawer
              selectedItem={selectedItem as {
                dateStr: string;
                totalScheduledRevenue: number;
                totalEstimatedLaborCost: number;
                netContribution: number;
                crewAllocationPct: number;
                equipmentAllocationPct: number;
              }}
              onClose={() => setDrawerType(null)}
              type="day"
            />
          </div>
        )}

        {drawerType === "day" && (
          <div className="shrink-0 h-full animate-in slide-in-from-right duration-300">
            <OperationalDrawer
              selectedItem={selectedItem as {
                dateStr: string;
                totalScheduledRevenue: number;
                totalEstimatedLaborCost: number;
                netContribution: number;
                crewAllocationPct: number;
                equipmentAllocationPct: number;
              }}
              onClose={() => setDrawerType(null)}
              type="day"
            />
          </div>
        )}
      </div>
    </Layout>
  );
}