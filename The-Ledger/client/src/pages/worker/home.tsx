import { WorkerMobileLayout } from "@/components/WorkerMobileLayout";
import { useStore, useAuth } from "@/lib/mockData";
import { useShiftStore } from "@/lib/shiftStore";
import { useOfflineQueueStore } from "@/lib/offlineQueueStore";
import { getWorkerActivity, summariseActivity, kindLabel } from "@/lib/workerActivity";
import { useLocation } from "wouter";
import {
  Play,
  Clock,
  Briefcase,
  FileText,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  ArrowRight,
  RefreshCw,
  WifiOff,
  UploadCloud,
  RotateCcw,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

function formatDuration(seconds: number) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

export default function WorkerHomePage() {
  const { jobs, reviewItems } = useStore();
  const { user } = useAuth();
  const { activeShift, elapsedTime } = useShiftStore();
  const { queue, isOffline } = useOfflineQueueStore();
  const [, setLocation] = useLocation();

  // Worker-scoped activity (WK-5) — drives Recent Activity, last shift, and
  // outstanding corrections. Operational only; no financial data.
  const activity = getWorkerActivity(user?.id, reviewItems as any, queue, jobs);
  const summary = summariseActivity(activity);
  const lastShift = activity.find((e) => (e.hours ?? 0) > 0);

  const myJobs = jobs
    .filter(
      (j) =>
        j.assignedWorkerIds.includes(user?.id ?? "") &&
        (j.status === "Active" || j.status === "Planned")
    )
    .sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime());

  const firstJob = myJobs[0] ?? null;
  const currentJob = activeShift
    ? (jobs.find((j) => j.id === activeShift.jobId) ?? null)
    : null;

  const isShiftActive = activeShift !== null && activeShift.isRunning;
  const isShiftPaused = activeShift !== null && !activeShift.isRunning;
  const onShift = isShiftActive || isShiftPaused;

  const failedItems = queue.filter((i) => i.syncStatus === "failed");
  const conflictItems = queue.filter((i) => i.syncStatus === "conflict");
  const pendingItems = queue.filter((i) => i.syncStatus === "pending");
  const attentionRequired = failedItems.length > 0 || conflictItems.length > 0 || pendingItems.length > 0 || isOffline;

  return (
    <WorkerMobileLayout title="Home">
      <div className="p-4 space-y-5 pb-8" data-testid="worker-home">

        {/* ── Shift Status Banner ── */}
        <section data-testid="worker-shift-status">
          {onShift ? (
            <div
              data-testid="worker-on-shift-banner"
              className="bg-slate-900 text-white rounded-2xl p-5 shadow-md"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div
                    className={cn(
                      "w-2.5 h-2.5 rounded-full shrink-0",
                      isShiftActive ? "bg-emerald-400 animate-pulse" : "bg-amber-400"
                    )}
                  />
                  <span className="text-xs font-semibold uppercase tracking-widest text-slate-300">
                    {isShiftActive ? "Shift Active" : "Shift Paused"}
                  </span>
                </div>
                {isShiftActive && (
                  <Badge className="bg-emerald-500/20 text-emerald-400 border-none text-[10px]">
                    Live
                  </Badge>
                )}
              </div>

              <div
                data-testid="worker-shift-timer"
                role="timer"
                aria-live="polite"
                aria-label={`Shift elapsed time ${formatDuration(elapsedTime)}`}
                className="text-4xl font-mono font-bold text-emerald-400 mb-1 tracking-wider"
              >
                {formatDuration(elapsedTime)}
              </div>

              {currentJob && (
                <p className="text-muted-foreground text-sm mb-4 truncate">{currentJob.title}</p>
              )}

              <button
                data-testid="worker-home-open-job-btn"
                onClick={() => currentJob && setLocation(`/worker/jobs/${currentJob.id}`)}
                className="w-full bg-white/10 hover:bg-white/15 text-white rounded-xl py-3 text-sm font-semibold flex items-center justify-center gap-2 transition-colors"
              >
                Open Current Job <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div
              data-testid="worker-not-on-shift-banner"
              className="bg-card rounded-2xl p-5 shadow-sm border border-border"
            >
              <div className="flex items-center gap-2 mb-3">
                <Clock className="w-4 h-4 text-muted-foreground" />
                <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                  Not On Shift
                </span>
              </div>

              {firstJob ? (
                <>
                  <p className="text-muted-foreground text-sm mb-4 leading-relaxed">
                    Your next job is{" "}
                    <span className="font-semibold text-foreground">{firstJob.title}</span>.
                    Open the job to start your shift.
                  </p>
                  <button
                    data-testid="worker-home-start-job-btn"
                    onClick={() => setLocation(`/worker/jobs/${firstJob.id}`)}
                    className="w-full bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl py-3.5 font-bold text-sm flex items-center justify-center gap-2 transition-colors"
                  >
                    <Play className="w-4 h-4 fill-white" />
                    Go to Job & Start Shift
                  </button>
                </>
              ) : (
                <p className="text-muted-foreground text-sm">
                  No jobs assigned right now. Check with your manager.
                </p>
              )}
            </div>
          )}
        </section>

        {/* ── Today & Upcoming Jobs ── */}
        <section data-testid="worker-home-jobs">
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
            Today & Upcoming
          </h2>

          {myJobs.length === 0 ? (
            <div
              data-testid="worker-home-no-jobs"
              className="bg-card rounded-2xl p-6 border border-border shadow-sm text-center text-muted-foreground text-sm"
            >
              No jobs assigned.
            </div>
          ) : (
            <div className="space-y-3">
              {myJobs.map((job) => {
                const isCurrentJob = activeShift?.jobId === job.id;
                return (
                  <div
                    key={job.id}
                    data-testid={`worker-home-job-card-${job.id}`}
                    className={cn(
                      "bg-card rounded-2xl p-4 shadow-sm border",
                      isCurrentJob ? "border-emerald-200 bg-emerald-50/40" : "border-border"
                    )}
                  >
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          {isCurrentJob && (
                            <div className="w-2 h-2 rounded-full bg-emerald-500 shrink-0 animate-pulse" />
                          )}
                          <p className="font-semibold text-sm truncate">{job.title}</p>
                        </div>
                        <p className="text-xs text-muted-foreground truncate">{job.locationAddress}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {new Date(job.startAt).toLocaleDateString()} ·{" "}
                          {new Date(job.startAt).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-1.5 shrink-0">
                        <Badge
                          variant={job.status === "Active" ? "default" : "secondary"}
                          className="text-[10px]"
                        >
                          {job.status}
                        </Badge>
                        {isCurrentJob && (
                          <Badge className="bg-emerald-100 text-emerald-700 border-none text-[10px]">
                            On Shift
                          </Badge>
                        )}
                      </div>
                    </div>

                    <button
                      data-testid={`worker-home-open-job-${job.id}`}
                      onClick={() => setLocation(`/worker/jobs/${job.id}`)}
                      className="w-full bg-slate-900 text-white rounded-xl py-2.5 text-xs font-semibold flex items-center justify-center gap-2 hover:bg-slate-800 transition-colors active:scale-[0.98]"
                    >
                      Open Job <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* ── Quick Actions ── */}
        <section data-testid="worker-quick-actions">
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
            Quick Actions
          </h2>
          <div className="grid grid-cols-2 gap-3">
            {onShift && currentJob ? (
              <>
                <button
                  data-testid="worker-qa-submit-report"
                  onClick={() => setLocation(`/worker/jobs/${currentJob.id}/report`)}
                  className="bg-card rounded-2xl p-4 border border-border shadow-sm flex items-center gap-3 active:scale-[0.97] transition-transform"
                >
                  <div className="w-10 h-10 rounded-full bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
                    <FileText className="w-5 h-5" />
                  </div>
                  <span className="font-semibold text-sm">Submit Report</span>
                </button>

                <button
                  data-testid="worker-qa-open-job"
                  onClick={() => setLocation(`/worker/jobs/${currentJob.id}`)}
                  className="bg-card rounded-2xl p-4 border border-border shadow-sm flex items-center gap-3 active:scale-[0.97] transition-transform"
                >
                  <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                    <Briefcase className="w-5 h-5" />
                  </div>
                  <span className="font-semibold text-sm">Open Job</span>
                </button>
              </>
            ) : (
              <>
                <button
                  data-testid="worker-qa-my-jobs"
                  onClick={() => setLocation("/worker/jobs")}
                  className="bg-card rounded-2xl p-4 border border-border shadow-sm flex items-center gap-3 active:scale-[0.97] transition-transform"
                >
                  <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                    <Briefcase className="w-5 h-5" />
                  </div>
                  <span className="font-semibold text-sm">My Jobs</span>
                </button>

                <button
                  data-testid="worker-qa-schedule"
                  onClick={() => setLocation("/worker/schedule")}
                  className="bg-card rounded-2xl p-4 border border-border shadow-sm flex items-center gap-3 active:scale-[0.97] transition-transform"
                >
                  <div className="w-10 h-10 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                    <Calendar className="w-5 h-5" />
                  </div>
                  <span className="font-semibold text-sm">Schedule</span>
                </button>
              </>
            )}

            <button
              data-testid="worker-qa-uploads"
              onClick={() => setLocation("/worker/uploads")}
              className="bg-card rounded-2xl p-4 border border-border shadow-sm flex items-center gap-3 active:scale-[0.97] transition-transform"
            >
              <div className="w-10 h-10 rounded-full bg-orange-50 text-orange-600 flex items-center justify-center shrink-0">
                <UploadCloud className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <p className="font-semibold text-sm">Uploads</p>
                {pendingItems.length + failedItems.length > 0 && (
                  <p className="text-xs text-orange-500 leading-none mt-0.5">
                    {pendingItems.length + failedItems.length} pending
                  </p>
                )}
              </div>
            </button>

            <button
              data-testid="worker-qa-profile"
              onClick={() => setLocation("/worker/profile")}
              className="bg-card rounded-2xl p-4 border border-border shadow-sm flex items-center gap-3 active:scale-[0.97] transition-transform"
            >
              <div className="w-10 h-10 rounded-full bg-muted text-foreground flex items-center justify-center shrink-0 font-bold text-sm">
                {user?.name.charAt(0) ?? "W"}
              </div>
              <span className="font-semibold text-sm">Profile</span>
            </button>
          </div>
        </section>

        {/* ── Attention Required (always rendered) ── */}
        <section data-testid="worker-attention-required">
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
            Attention Required
          </h2>

          {!attentionRequired ? (
            <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-4 flex items-center gap-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
              <p className="text-sm text-emerald-700 font-medium">
                All clear — nothing requires attention.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {isOffline && (
                <div className="bg-red-50 border border-red-100 rounded-2xl p-4 flex items-center gap-3">
                  <WifiOff className="w-5 h-5 text-red-500 shrink-0" />
                  <div>
                    <p className="font-semibold text-sm text-red-800">Offline Mode Active</p>
                    <p className="text-xs text-red-600 mt-0.5">
                      Submissions will sync when you reconnect.
                    </p>
                  </div>
                </div>
              )}

              {failedItems.length > 0 && (
                <div
                  onClick={() => setLocation("/worker/uploads")}
                  className="bg-red-50 border border-red-100 rounded-2xl p-4 flex items-center justify-between cursor-pointer active:scale-[0.98] transition-transform"
                >
                  <div className="flex items-center gap-3">
                    <AlertTriangle className="w-5 h-5 text-red-500 shrink-0" />
                    <div>
                      <p className="font-semibold text-sm text-red-800">
                        {failedItems.length} sync failure{failedItems.length > 1 ? "s" : ""}
                      </p>
                      <p className="text-xs text-red-600 mt-0.5">Tap to retry</p>
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-red-400 shrink-0" />
                </div>
              )}

              {conflictItems.length > 0 && (
                <div
                  onClick={() => setLocation("/worker/uploads")}
                  className="bg-amber-50 border border-amber-100 rounded-2xl p-4 flex items-center justify-between cursor-pointer active:scale-[0.98] transition-transform"
                >
                  <div className="flex items-center gap-3">
                    <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0" />
                    <div>
                      <p className="font-semibold text-sm text-amber-800">
                        {conflictItems.length} upload conflict{conflictItems.length > 1 ? "s" : ""}
                      </p>
                      <p className="text-xs text-amber-600 mt-0.5">Review required</p>
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-amber-400 shrink-0" />
                </div>
              )}

              {pendingItems.length > 0 && (
                <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 flex items-center gap-3">
                  <RefreshCw className="w-5 h-5 text-blue-500 shrink-0" />
                  <div>
                    <p className="font-semibold text-sm text-blue-800">
                      {pendingItems.length} item{pendingItems.length > 1 ? "s" : ""} pending sync
                    </p>
                    <p className="text-xs text-blue-600 mt-0.5">Will upload automatically</p>
                  </div>
                </div>
              )}
            </div>
          )}
        </section>

        {/* ── Outstanding Corrections (own section — not sync attention) ── */}
        {summary.outstandingCorrections > 0 && (
          <section data-testid="worker-outstanding-corrections">
            <div
              onClick={() => setLocation("/worker/history")}
              className="bg-orange-50 border border-orange-100 rounded-2xl p-4 flex items-center justify-between cursor-pointer active:scale-[0.98] transition-transform"
            >
              <div className="flex items-center gap-3">
                <RotateCcw className="w-5 h-5 text-orange-500 shrink-0" />
                <div>
                  <p className="font-semibold text-sm text-orange-800">
                    {summary.outstandingCorrections} submission
                    {summary.outstandingCorrections > 1 ? "s" : ""} need changes
                  </p>
                  <p className="text-xs text-orange-600 mt-0.5">Tap to review reviewer notes</p>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-orange-400 shrink-0" />
            </div>
          </section>
        )}

        {/* ── Last Shift ── */}
        {lastShift && (
          <section data-testid="worker-last-shift">
            <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
              Last Shift
            </h2>
            <div className="bg-card rounded-2xl p-4 border border-border shadow-sm flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-muted text-muted-foreground flex items-center justify-center shrink-0">
                <Clock className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm truncate">{lastShift.jobTitle}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {new Date(lastShift.dateISO).toLocaleDateString()} ·{" "}
                  {Math.floor(lastShift.hours ?? 0)}h{" "}
                  {Math.round((((lastShift.hours ?? 0) % 1) * 60))}m
                </p>
              </div>
            </div>
          </section>
        )}

        {/* ── Recent Activity ── */}
        <section data-testid="worker-recent-activity">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Recent Activity
            </h2>
            {activity.length > 0 && (
              <button
                data-testid="worker-home-view-activity"
                onClick={() => setLocation("/worker/history")}
                className="text-xs font-semibold text-muted-foreground hover:text-foreground"
              >
                View all
              </button>
            )}
          </div>

          {activity.length === 0 ? (
            <div className="bg-card rounded-2xl p-5 border border-border shadow-sm flex items-center gap-3 text-muted-foreground">
              <CheckCircle2 className="w-5 h-5 shrink-0" />
              <p className="text-sm">
                No recent submissions. Start your shift to begin logging work.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {activity.slice(0, 3).map((item) => (
                <div
                  key={`${item.source}-${item.id}`}
                  className="bg-card rounded-2xl p-4 border border-border shadow-sm flex items-center gap-3"
                >
                  <CheckCircle2
                    className={cn(
                      "w-5 h-5 shrink-0",
                      item.reviewStatus === "approved"
                        ? "text-emerald-500"
                        : item.reviewStatus === "needs-correction"
                        ? "text-orange-500"
                        : "text-muted-foreground"
                    )}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">
                      {kindLabel(item.kind)} — {item.title}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {new Date(item.dateISO).toLocaleDateString()}
                    </p>
                  </div>
                  <Badge className="bg-muted text-muted-foreground border-none text-[10px] shrink-0 capitalize">
                    {item.source === "queue"
                      ? item.syncStatus === "failed"
                        ? "Failed"
                        : "Pending"
                      : item.reviewStatus === "needs-correction"
                      ? "Changes"
                      : item.reviewStatus}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </section>

      </div>
    </WorkerMobileLayout>
  );
}
