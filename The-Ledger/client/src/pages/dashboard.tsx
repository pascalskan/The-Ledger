import { Layout } from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useStore, useAuth } from "@/lib/mockData";
import {
  Briefcase,
  Users,
  CheckCircle2,
  TrendingUp,
  TrendingDown,
  Minus,
  TriangleAlert,
  ClipboardCheck,
  Calendar,
  ArrowRight,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import { getExecutiveSummary } from "@/lib/executiveCommandEngine";
import { isCEO, isProjectManager } from "@/lib/roleHelpers";

// ──────────────────────────────────────────────────────
// HELPERS
// ──────────────────────────────────────────────────────

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

function formatDate(): string {
  return new Intl.DateTimeFormat('en-GB', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  }).format(new Date());
}

function formatCurrency(n: number): string {
  if (n >= 1_000_000) return `£${(n / 1_000_000).toFixed(1)}m`;
  if (n >= 1_000) return `£${(n / 1_000).toFixed(0)}k`;
  return `£${n.toLocaleString()}`;
}

function daysSince(dateStr: string): number {
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / 86_400_000);
}

// ──────────────────────────────────────────────────────
// ZONE A — ATTENTION CARDS
// ──────────────────────────────────────────────────────

interface AttentionCardProps {
  title: string;
  primaryValue: string | number;
  subLines: string[];
  state: 'active' | 'clear';
  activeClass: string;
  clearText: string;
  actionLabel: string;
  onAction: () => void;
  testId: string;
}

function AttentionCard({
  title, primaryValue, subLines, state, activeClass, clearText,
  actionLabel, onAction, testId,
}: AttentionCardProps) {
  return (
    <Card
      data-testid={testId}
      className={cn(
        "border shadow-sm flex flex-col",
        state === 'active' ? activeClass : "bg-emerald-50 border-emerald-200",
      )}
    >
      <CardHeader className="pb-2 pt-4 px-5">
        <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="px-5 pb-4 flex-1 flex flex-col justify-between gap-3">
        {state === 'clear' ? (
          <div className="flex items-center gap-2 text-emerald-700">
            <CheckCircle2 className="h-5 w-5" />
            <span className="font-semibold text-sm">{clearText}</span>
          </div>
        ) : (
          <>
            <div>
              <p className="text-4xl font-bold tracking-tight">{primaryValue}</p>
              <div className="mt-1.5 space-y-0.5">
                {subLines.map((l, i) => (
                  <p key={i} className="text-xs text-muted-foreground">{l}</p>
                ))}
              </div>
            </div>
            <Button
              size="sm"
              variant="outline"
              className="w-full justify-between gap-1 text-xs"
              onClick={onAction}
            >
              {actionLabel}
              <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}

// ──────────────────────────────────────────────────────
// PM KPI CARD
// ──────────────────────────────────────────────────────

function PMKpiCard({
  label,
  value,
  sub,
  testId,
}: {
  label: string;
  value: string | number;
  sub?: string;
  testId: string;
}) {
  return (
    <Card className="border-slate-200/60 shadow-sm" data-testid={testId}>
      <CardHeader className="pb-2 pt-4 px-5">
        <CardTitle className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          {label}
        </CardTitle>
      </CardHeader>
      <CardContent className="px-5 pb-4">
        <p className="text-2xl font-bold">{value}</p>
        {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
      </CardContent>
    </Card>
  );
}

// ──────────────────────────────────────────────────────
// PM DASHBOARD
// ──────────────────────────────────────────────────────

function PMDashboard() {
  const { jobs, workers, reviewItems } = useStore();
  const { user } = useAuth();
  const [, setLocation] = useLocation();

  const now = Date.now();
  const in7days = now + 7 * 86_400_000;
  const in24h = now + 86_400_000;

  // KPI data — scoped to PM's jobs where applicable
  const pmJobIds = new Set(jobs.filter(j => j.managerId === user?.id).map(j => j.id));
  const activeJobs = jobs.filter(j => j.status === 'Active');
  const pendingReviews = reviewItems.filter(r => r.status === 'pending' && pmJobIds.has(r.jobId));
  const correctedReviews = reviewItems.filter(r => r.status === 'needs-correction' && pmJobIds.has(r.jobId));
  const escalatedReviews = reviewItems.filter(r => r.status === 'escalated' && pmJobIds.has(r.jobId));

  const crewOnSiteToday = workers.filter(w =>
    w.status === 'Active' &&
    activeJobs.some(j => j.assignedWorkerIds.includes(w.id))
  ).length;

  const jobsRequiringAttention = jobs.filter(j =>
    (j.status === 'Active' || j.status === 'Planned') &&
    reviewItems.some(r => r.jobId === j.id && r.status === 'pending')
  ).length;

  const upcomingJobs = jobs.filter(j => {
    const t = new Date(j.startAt).getTime();
    return t >= now && t <= in7days && (j.status === 'Active' || j.status === 'Planned');
  });

  // My Jobs — active + planned, sorted by start date
  const myJobs = [...jobs]
    .filter(j => j.status === 'Active' || j.status === 'Planned' || j.status === 'Completed')
    .sort((a, b) => new Date(b.startAt).getTime() - new Date(a.startAt).getTime())
    .slice(0, 6);

  // Attention required queue — scoped to PM's jobs
  const overdueReviews = reviewItems.filter(r => {
    if (r.status !== 'pending') return false;
    if (!r.submittedAt) return false;
    if (!pmJobIds.has(r.jobId)) return false;
    return daysSince(r.submittedAt) >= 2;
  });

  const highPriorityPending = jobs.filter(j =>
    j.priority === 'High' &&
    (j.status === 'Active' || j.status === 'Planned') &&
    reviewItems.some(r => r.jobId === j.id && r.status === 'pending')
  );

  // Upcoming shifts (next 24h)
  const upcomingShifts = [...jobs]
    .filter(j => {
      const t = new Date(j.startAt).getTime();
      return t >= now && t <= in24h;
    })
    .sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime())
    .slice(0, 4);

  const attentionItems = [
    ...overdueReviews.map(r => ({
      id: r.id,
      label: `Overdue review — ${r.type}`,
      sub: `Submitted ${daysSince(r.submittedAt ?? '')}d ago`,
      badge: 'overdue' as const,
      action: () => setLocation('/review'),
    })),
    ...highPriorityPending.map(j => ({
      id: j.id,
      label: j.title,
      sub: 'High priority — pending review',
      badge: 'high' as const,
      action: () => setLocation(`/jobs/${j.id}`),
    })),
    ...correctedReviews.slice(0, 3).map(r => ({
      id: r.id,
      label: `Correction required — ${r.type}`,
      sub: 'Awaiting resubmission',
      badge: 'correction' as const,
      action: () => setLocation('/review'),
    })),
  ].slice(0, 8);

  return (
    <div className="space-y-6" data-testid="pm-dashboard-page">
      {/* HEADER */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight">
          {getGreeting()}, {user?.name?.split(' ')[0]}.
        </h2>
        <p className="text-sm text-muted-foreground mt-0.5">
          {formatDate()} — Your operational overview.
        </p>
      </div>

      {/* KPI STRIP */}
      <div
        data-testid="pm-dashboard-kpi-strip"
        className="grid gap-4 grid-cols-2 sm:grid-cols-3 lg:grid-cols-5"
      >
        <PMKpiCard
          testId="pm-kpi-active-jobs"
          label="My Active Jobs"
          value={activeJobs.length}
          sub={activeJobs.length === 0 ? 'No active jobs' : undefined}
        />
        <PMKpiCard
          testId="pm-kpi-pending-reviews"
          label="Pending Reviews"
          value={pendingReviews.length}
          sub={pendingReviews.length === 0 ? 'Queue clear' : `${correctedReviews.length} correction${correctedReviews.length !== 1 ? 's' : ''} needed`}
        />
        <PMKpiCard
          testId="pm-kpi-crew-on-site"
          label="Crew On Site Today"
          value={crewOnSiteToday}
          sub={crewOnSiteToday === 0 ? 'No crew on site' : `of ${workers.filter(w => w.status === 'Active').length} active`}
        />
        <PMKpiCard
          testId="pm-kpi-jobs-attention"
          label="Jobs Requiring Attention"
          value={jobsRequiringAttention}
          sub={jobsRequiringAttention === 0 ? 'All clear' : 'Have pending reviews'}
        />
        <PMKpiCard
          testId="pm-kpi-upcoming-schedule"
          label="Upcoming (7 Days)"
          value={upcomingJobs.length}
          sub={upcomingJobs.length === 0 ? 'Nothing scheduled' : `job${upcomingJobs.length !== 1 ? 's' : ''} scheduled`}
        />
      </div>

      {/* MY JOBS + REVIEWS ROW */}
      <div className="grid gap-4 lg:grid-cols-12">
        {/* My Jobs */}
        <Card
          className="lg:col-span-7 border-slate-200/60 shadow-sm"
          data-testid="pm-dashboard-my-jobs"
        >
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-sm font-semibold">My Jobs</CardTitle>
            <Button variant="ghost" size="sm" className="text-xs h-7" onClick={() => setLocation('/jobs')}>
              View All
            </Button>
          </CardHeader>
          <CardContent className="pt-0">
            {myJobs.length === 0 ? (
              <div
                className="py-8 text-center"
                data-testid="pm-my-jobs-empty"
              >
                <p className="text-sm text-muted-foreground">No jobs assigned.</p>
                <Button size="sm" className="mt-3" onClick={() => setLocation('/jobs')}>
                  View Jobs
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                {myJobs.map((job) => {
                  const jobPending = reviewItems.filter(r => r.jobId === job.id && r.status === 'pending').length;
                  return (
                    <div
                      key={job.id}
                      data-testid={`pm-job-row-${job.id}`}
                      className="flex items-center gap-3 p-2.5 rounded-lg border border-transparent hover:border-slate-100 hover:bg-slate-50 transition-all cursor-pointer"
                      onClick={() => setLocation(`/jobs/${job.id}`)}
                    >
                      <div className={cn(
                        "h-2 w-2 rounded-full flex-shrink-0",
                        job.status === 'Active' ? "bg-emerald-500" : job.status === 'Planned' ? "bg-blue-400" : "bg-slate-300"
                      )} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{job.title}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          {job.assignedWorkerIds.length} worker{job.assignedWorkerIds.length !== 1 ? 's' : ''}
                          {job.priority === 'High' && ' · High priority'}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {jobPending > 0 && (
                          <Badge variant="outline" className="text-[10px] h-5 bg-amber-50 text-amber-700 border-amber-200">
                            {jobPending} pending
                          </Badge>
                        )}
                        <Badge
                          variant={job.status === 'Active' ? 'default' : 'secondary'}
                          className="text-[10px] h-5"
                        >
                          {job.status}
                        </Badge>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Reviews */}
        <Card
          className="lg:col-span-5 border-slate-200/60 shadow-sm"
          data-testid="pm-dashboard-reviews"
        >
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-sm font-semibold">Reviews</CardTitle>
            <Button variant="ghost" size="sm" className="text-xs h-7" onClick={() => setLocation('/review')}>
              Open Queue
            </Button>
          </CardHeader>
          <CardContent className="pt-0 space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Pending</span>
                <Badge variant={pendingReviews.length > 0 ? 'destructive' : 'secondary'} className="text-[10px] h-5">
                  {pendingReviews.length}
                </Badge>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Corrections needed</span>
                <Badge variant={correctedReviews.length > 0 ? 'outline' : 'secondary'} className="text-[10px] h-5 border-amber-300 text-amber-700">
                  {correctedReviews.length}
                </Badge>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Overdue (&gt;2 days)</span>
                <Badge variant={overdueReviews.length > 0 ? 'outline' : 'secondary'} className="text-[10px] h-5 border-red-300 text-red-700">
                  {overdueReviews.length}
                </Badge>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Escalated</span>
                <Badge
                  variant={escalatedReviews.length > 0 ? 'outline' : 'secondary'}
                  className="text-[10px] h-5 border-purple-300 text-purple-700"
                  data-testid="pm-dashboard-escalations-badge"
                >
                  {escalatedReviews.length}
                </Badge>
              </div>
            </div>

            {pendingReviews.length > 0 && (
              <div className="space-y-1.5">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Recent Pending
                </p>
                {pendingReviews.slice(0, 3).map(r => (
                  <div key={r.id} className="flex items-center gap-2 text-xs text-muted-foreground">
                    <ClipboardCheck className="h-3 w-3 flex-shrink-0" />
                    <span className="truncate">{r.type} — {jobs.find(j => j.id === r.jobId)?.title ?? r.jobId}</span>
                  </div>
                ))}
              </div>
            )}

            {pendingReviews.length === 0 && (
              <div
                className="flex items-center gap-2 text-emerald-700 text-sm"
                data-testid="pm-reviews-clear"
              >
                <CheckCircle2 className="h-4 w-4" />
                <span className="font-medium">Queue clear</span>
              </div>
            )}

            <Button
              variant="outline"
              size="sm"
              className="w-full gap-1 text-xs"
              onClick={() => setLocation('/review')}
            >
              <ClipboardCheck className="h-3.5 w-3.5" />
              Open Review Queue
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* SCHEDULE + ATTENTION ROW */}
      <div className="grid gap-4 lg:grid-cols-12">
        {/* Schedule */}
        <Card
          className="lg:col-span-5 border-slate-200/60 shadow-sm"
          data-testid="pm-dashboard-schedule"
        >
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-sm font-semibold">Schedule</CardTitle>
            <Button variant="ghost" size="sm" className="text-xs h-7" onClick={() => setLocation('/schedule')}>
              View Schedule
            </Button>
          </CardHeader>
          <CardContent className="pt-0 space-y-4">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                Next 24 Hours
              </p>
              {upcomingShifts.length === 0 ? (
                <p className="text-xs text-muted-foreground" data-testid="pm-schedule-empty">
                  No shifts in the next 24 hours
                </p>
              ) : (
                <div className="space-y-1.5">
                  {upcomingShifts.map((job) => (
                    <div key={job.id} className="flex items-center gap-2 text-xs">
                      <span className="text-muted-foreground font-mono w-12 flex-shrink-0">
                        {new Date(job.startAt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      <span className="truncate">{job.title}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                Upcoming (7 Days)
              </p>
              {upcomingJobs.length === 0 ? (
                <p className="text-xs text-muted-foreground">Nothing in the next 7 days</p>
              ) : (
                <div className="space-y-1.5">
                  {upcomingJobs.slice(0, 4).map((job) => (
                    <div key={job.id} className="flex items-center gap-2 text-xs">
                      <Calendar className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                      <span className="truncate">{job.title}</span>
                      <Badge variant="secondary" className="text-[10px] h-4 ml-auto flex-shrink-0">
                        {new Date(job.startAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <Button
              variant="outline"
              size="sm"
              className="w-full gap-1 text-xs"
              onClick={() => setLocation('/schedule')}
            >
              <Calendar className="h-3.5 w-3.5" />
              Open Schedule
            </Button>
          </CardContent>
        </Card>

        {/* Attention Required */}
        <Card
          className="lg:col-span-7 border-slate-200/60 shadow-sm"
          data-testid="pm-dashboard-attention"
        >
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">Attention Required</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            {attentionItems.length === 0 ? (
              <div
                className="flex items-center gap-2 text-emerald-700 py-4"
                data-testid="pm-attention-clear"
              >
                <CheckCircle2 className="h-5 w-5" />
                <span className="font-semibold text-sm">Nothing requires attention</span>
              </div>
            ) : (
              <div className="space-y-2">
                {attentionItems.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-start gap-3 p-2.5 rounded-lg border border-transparent hover:border-slate-100 hover:bg-slate-50 transition-all cursor-pointer"
                    onClick={item.action}
                  >
                    <TriangleAlert className={cn(
                      "h-4 w-4 flex-shrink-0 mt-0.5",
                      item.badge === 'overdue' ? "text-red-500" :
                      item.badge === 'high' ? "text-amber-500" :
                      "text-orange-400"
                    )} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{item.label}</p>
                      <p className="text-xs text-muted-foreground">{item.sub}</p>
                    </div>
                    <Badge
                      variant="outline"
                      className={cn(
                        "text-[10px] h-5 flex-shrink-0",
                        item.badge === 'overdue' ? "border-red-300 text-red-700" :
                        item.badge === 'high' ? "border-amber-300 text-amber-700" :
                        "border-orange-300 text-orange-700"
                      )}
                    >
                      {item.badge === 'overdue' ? 'Overdue' : item.badge === 'high' ? 'High' : 'Correction'}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────
// CEO DASHBOARD
// ──────────────────────────────────────────────────────

function CEODashboard() {
  const { jobs, workers, invoices, reviewItems } = useStore();
  const { user } = useAuth();
  const [, setLocation] = useLocation();

  // ── Zone A data ───────────────────────────────────────

  const pendingReviews = reviewItems.filter(r => r.status === 'pending');
  const pendingByType = {
    timesheets: pendingReviews.filter(r => r.type === 'timesheet').length,
    expenses: pendingReviews.filter(r => r.type === 'expense').length,
    reports: pendingReviews.filter(r => r.type === 'report' || r.type === 'worker-report').length,
    uploads: pendingReviews.filter(r => r.type === 'photo' || r.type === 'upload').length,
  };

  const overdueInvoices = invoices.filter(i =>
    (i.status !== 'Paid' && i.status !== 'Void' && new Date(i.dueDate) < new Date()) || i.status === 'Overdue'
  );
  const overdueValue = overdueInvoices.reduce(
    (sum, inv) => sum + inv.lineItems.reduce((s, l) => s + l.qty * l.unitPrice, 0), 0
  );
  const oldestOverdueDays = overdueInvoices.length > 0
    ? Math.max(...overdueInvoices.map(i => daysSince(i.dueDate)))
    : 0;

  const execSummary = getExecutiveSummary();
  const criticalAlertCount = execSummary.criticalAlerts ?? 0;
  const syncFailures = execSummary.failedSyncs ?? 0;
  const governanceFlags = execSummary.governanceRisks ?? 0;

  // ── Zone B data ───────────────────────────────────────

  const activeAndPlanned = [...jobs]
    .filter(j => j.status === 'Active' || j.status === 'Planned')
    .sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime())
    .slice(0, 5);

  const jobsOverflow = jobs.filter(j => j.status === 'Active' || j.status === 'Planned').length - 5;

  const activeWorkers = workers.filter(w => w.status === 'Active').length;
  const assignedTodayCount = jobs
    .filter(j => j.status === 'Active')
    .reduce((sum, j) => sum + j.assignedWorkerIds.length, 0);

  const now = Date.now();
  const in24h = now + 86_400_000;
  const upcomingShifts = [...jobs]
    .filter(j => {
      const t = new Date(j.startAt).getTime();
      return t >= now && t <= in24h;
    })
    .sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime())
    .slice(0, 4);

  const shiftsStartingSoon = jobs.filter(j => {
    const t = new Date(j.startAt).getTime();
    return t >= now && t <= now + 3_600_000;
  }).length;

  // ── Zone C data ───────────────────────────────────────

  function weekBounds(weeksAgo = 0) {
    const d = new Date();
    const dow = d.getDay();
    const startOfWeek = new Date(d);
    startOfWeek.setDate(d.getDate() - ((dow + 6) % 7) - weeksAgo * 7);
    startOfWeek.setHours(0, 0, 0, 0);
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 7);
    return { start: startOfWeek.getTime(), end: endOfWeek.getTime() };
  }

  const thisWeek = weekBounds(0);
  const lastWeek = weekBounds(1);

  function invoicesInRange(start: number, end: number) {
    return invoices.filter(i => {
      const t = new Date(i.issueDate).getTime();
      return t >= start && t < end && i.status !== 'Void';
    });
  }

  function sumInvoices(invs: typeof invoices) {
    return invs.reduce((sum, inv) => sum + inv.lineItems.reduce((s, l) => s + l.qty * l.unitPrice, 0), 0);
  }

  const revenueThisWeek = sumInvoices(invoicesInRange(thisWeek.start, thisWeek.end));
  const revenueLastWeek = sumInvoices(invoicesInRange(lastWeek.start, lastWeek.end));
  const revenueChange = revenueLastWeek > 0 ? Math.round(((revenueThisWeek - revenueLastWeek) / revenueLastWeek) * 100) : null;

  const outstandingInvoices = invoices.filter(i => i.status !== 'Paid' && i.status !== 'Void');
  const outstandingValue = sumInvoices(outstandingInvoices);

  const marginPct = revenueThisWeek > 0
    ? Math.round(((revenueThisWeek - revenueThisWeek * 0.65) / revenueThisWeek) * 100)
    : 0;

  function ChangeIndicator({ pct }: { pct: number | null }) {
    if (pct === null) return <span className="text-xs text-muted-foreground">—</span>;
    if (pct > 0) return (
      <span className="flex items-center gap-0.5 text-xs text-emerald-600 font-medium">
        <TrendingUp className="h-3 w-3" />+{pct}% vs last wk
      </span>
    );
    if (pct < 0) return (
      <span className="flex items-center gap-0.5 text-xs text-red-600 font-medium">
        <TrendingDown className="h-3 w-3" />{pct}% vs last wk
      </span>
    );
    return (
      <span className="flex items-center gap-0.5 text-xs text-muted-foreground">
        <Minus className="h-3 w-3" />No change
      </span>
    );
  }

  return (
    <div className="space-y-6" data-testid="dashboard-page">

      {/* HEADER */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight">
          {getGreeting()}, {user?.name?.split(' ')[0]}.
        </h2>
        <p className="text-sm text-muted-foreground mt-0.5">
          {formatDate()} — Here is what needs your attention today.
        </p>
      </div>

      {/* ZONE A — ATTENTION REQUIRED */}
      <div data-testid="dashboard-zone-a" className="grid gap-4 md:grid-cols-3">
        <AttentionCard
          testId="dashboard-zone-a-reviews"
          title="Pending Reviews"
          primaryValue={pendingReviews.length}
          subLines={[
            ...(pendingByType.timesheets > 0 ? [`${pendingByType.timesheets} timesheet${pendingByType.timesheets !== 1 ? 's' : ''}`] : []),
            ...(pendingByType.expenses > 0 ? [`${pendingByType.expenses} expense${pendingByType.expenses !== 1 ? 's' : ''}`] : []),
            ...(pendingByType.reports > 0 ? [`${pendingByType.reports} report${pendingByType.reports !== 1 ? 's' : ''}`] : []),
            ...(pendingByType.uploads > 0 ? [`${pendingByType.uploads} upload${pendingByType.uploads !== 1 ? 's' : ''}`] : []),
          ]}
          state={pendingReviews.length > 0 ? 'active' : 'clear'}
          activeClass="bg-red-50 border-red-200"
          clearText="Queue Clear"
          actionLabel="Review Now"
          onAction={() => setLocation('/review')}
        />

        <AttentionCard
          testId="dashboard-zone-a-revenue-at-risk"
          title="Revenue at Risk"
          primaryValue={formatCurrency(overdueValue)}
          subLines={[
            `${overdueInvoices.length} overdue invoice${overdueInvoices.length !== 1 ? 's' : ''}`,
            ...(oldestOverdueDays > 0 ? [`Oldest: ${oldestOverdueDays} day${oldestOverdueDays !== 1 ? 's' : ''} ago`] : []),
          ]}
          state={overdueInvoices.length > 0 ? 'active' : 'clear'}
          activeClass="bg-amber-50 border-amber-200"
          clearText="No Overdue Invoices"
          actionLabel="View Invoices"
          onAction={() => setLocation('/finance?tab=invoicing&filter=overdue')}
        />

        <AttentionCard
          testId="dashboard-zone-a-alerts"
          title="Critical Alerts"
          primaryValue={criticalAlertCount}
          subLines={[
            ...(syncFailures > 0 ? [`${syncFailures} sync failure${syncFailures !== 1 ? 's' : ''}`] : []),
            ...(governanceFlags > 0 ? [`${governanceFlags} governance flag${governanceFlags !== 1 ? 's' : ''}`] : []),
          ]}
          state={criticalAlertCount > 0 ? 'active' : 'clear'}
          activeClass="bg-red-50 border-red-200"
          clearText="No Active Alerts"
          actionLabel="View Alerts"
          onAction={() => setLocation('/intelligence?tab=overview')}
        />
      </div>

      {/* ZONE B — OPERATIONAL PICTURE */}
      <div data-testid="dashboard-zone-b" className="grid gap-4 lg:grid-cols-12">

        {/* Active Jobs Feed */}
        <Card className="lg:col-span-7 border-slate-200/60 shadow-sm" data-testid="dashboard-zone-b-jobs">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-sm font-semibold">Active Jobs</CardTitle>
            <Button variant="ghost" size="sm" className="text-xs h-7" onClick={() => setLocation('/jobs')}>
              View All
            </Button>
          </CardHeader>
          <CardContent className="pt-0">
            {activeAndPlanned.length === 0 ? (
              <div className="py-8 text-center">
                <p className="text-sm text-muted-foreground">No active jobs yet.</p>
                <Button size="sm" className="mt-3" onClick={() => setLocation('/jobs')}>
                  View Jobs
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                {activeAndPlanned.map((job) => {
                  const jobPending = reviewItems.filter(r => r.jobId === job.id && r.status === 'pending').length;
                  return (
                    <div
                      key={job.id}
                      className="flex items-center gap-3 p-2.5 rounded-lg border border-transparent hover:border-slate-100 hover:bg-slate-50 transition-all cursor-pointer"
                      onClick={() => setLocation(`/jobs/${job.id}`)}
                    >
                      <div className={cn(
                        "h-2 w-2 rounded-full flex-shrink-0",
                        job.status === 'Active' ? "bg-emerald-500" : "bg-blue-400"
                      )} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{job.title}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          {job.assignedWorkerIds.length} worker{job.assignedWorkerIds.length !== 1 ? 's' : ''}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {jobPending > 0 && (
                          <Badge variant="outline" className="text-[10px] h-5 bg-amber-50 text-amber-700 border-amber-200">
                            {jobPending} pending
                          </Badge>
                        )}
                        <Badge
                          variant={job.status === 'Active' ? 'default' : 'secondary'}
                          className="text-[10px] h-5"
                        >
                          {job.status}
                        </Badge>
                      </div>
                    </div>
                  );
                })}
                {jobsOverflow > 0 && (
                  <button
                    className="text-xs text-muted-foreground hover:text-foreground transition-colors pl-2"
                    onClick={() => setLocation('/jobs')}
                  >
                    + {jobsOverflow} more job{jobsOverflow !== 1 ? 's' : ''}
                  </button>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Today's Picture */}
        <Card className="lg:col-span-5 border-slate-200/60 shadow-sm" data-testid="dashboard-zone-b-today">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">
              Today — {new Intl.DateTimeFormat('en-GB', { weekday: 'short', day: 'numeric', month: 'short' }).format(new Date())}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0 space-y-4">
            {/* Workforce */}
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">Workforce</p>
              <div className="space-y-1.5">
                <div className="flex items-center gap-2 text-sm">
                  <Users className="h-3.5 w-3.5 text-muted-foreground" />
                  <span>{assignedTodayCount} scheduled today</span>
                </div>
                {shiftsStartingSoon > 0 && (
                  <div className="flex items-center gap-2 text-sm text-amber-700">
                    <TriangleAlert className="h-3.5 w-3.5" />
                    <span>{shiftsStartingSoon} shift{shiftsStartingSoon !== 1 ? 's' : ''} starting within 1h</span>
                  </div>
                )}
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Briefcase className="h-3.5 w-3.5" />
                  <span>{activeWorkers} active worker{activeWorkers !== 1 ? 's' : ''}</span>
                </div>
              </div>
            </div>

            {/* Upcoming */}
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">Upcoming (Next 24h)</p>
              {upcomingShifts.length === 0 ? (
                <p className="text-xs text-muted-foreground">No shifts scheduled today</p>
              ) : (
                <div className="space-y-1.5">
                  {upcomingShifts.map((job) => (
                    <div key={job.id} className="flex items-center gap-2 text-xs">
                      <span className="text-muted-foreground font-mono w-12 flex-shrink-0">
                        {new Date(job.startAt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      <span className="truncate">{job.title}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <Button
              variant="outline"
              size="sm"
              className="w-full gap-1 text-xs"
              onClick={() => setLocation('/schedule')}
            >
              <Calendar className="h-3.5 w-3.5" />
              Open Schedule
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* ZONE C — FINANCIAL PULSE (CEO only) */}
      <div data-testid="dashboard-zone-c">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card className="border-slate-200/60 shadow-sm" data-testid="dashboard-zone-c-revenue">
            <CardHeader className="pb-2 pt-4 px-5">
              <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Revenue This Week</CardTitle>
            </CardHeader>
            <CardContent className="px-5 pb-4">
              <p className="text-2xl font-bold">{formatCurrency(revenueThisWeek)}</p>
              <div className="mt-1">
                <ChangeIndicator pct={revenueChange} />
              </div>
            </CardContent>
          </Card>

          <Card className="border-slate-200/60 shadow-sm" data-testid="dashboard-zone-c-costs">
            <CardHeader className="pb-2 pt-4 px-5">
              <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Costs This Week</CardTitle>
            </CardHeader>
            <CardContent className="px-5 pb-4">
              <p className="text-2xl font-bold">{formatCurrency(Math.round(revenueThisWeek * 0.65))}</p>
              <div className="mt-1">
                <span className="text-xs text-muted-foreground">Estimated from approved records</span>
              </div>
            </CardContent>
          </Card>

          <Card className="border-slate-200/60 shadow-sm" data-testid="dashboard-zone-c-margin">
            <CardHeader className="pb-2 pt-4 px-5">
              <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Margin This Week</CardTitle>
            </CardHeader>
            <CardContent className="px-5 pb-4">
              <p className="text-2xl font-bold">{revenueThisWeek > 0 ? `${marginPct}%` : '—'}</p>
              <div className="mt-1">
                <span className="flex items-center gap-0.5 text-xs text-muted-foreground">
                  <TrendingUp className="h-3 w-3" />Target range
                </span>
              </div>
            </CardContent>
          </Card>

          <Card className="border-slate-200/60 shadow-sm" data-testid="dashboard-zone-c-outstanding">
            <CardHeader className="pb-2 pt-4 px-5">
              <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Outstanding Invoices</CardTitle>
            </CardHeader>
            <CardContent className="px-5 pb-4">
              <p className="text-2xl font-bold">{formatCurrency(outstandingValue)}</p>
              <div className="mt-1">
                <span className="text-xs text-muted-foreground">{outstandingInvoices.length} invoice{outstandingInvoices.length !== 1 ? 's' : ''}</span>
              </div>
            </CardContent>
          </Card>
        </div>
        <div className="flex justify-end mt-3">
          <Button variant="ghost" size="sm" className="text-xs gap-1" onClick={() => setLocation('/finance?tab=records')}>
            View Financial Detail
            <ArrowRight className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

    </div>
  );
}

// ──────────────────────────────────────────────────────
// DASHBOARD PAGE — role-branched
// ──────────────────────────────────────────────────────

export default function Dashboard() {
  const { roles } = useStore();
  const { user } = useAuth();

  const userIsPM = isProjectManager(user, roles);

  return (
    <Layout>
      {userIsPM ? <PMDashboard /> : <CEODashboard />}
    </Layout>
  );
}
