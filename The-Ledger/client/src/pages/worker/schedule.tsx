import { WorkerMobileLayout } from "@/components/WorkerMobileLayout";
import { useStore, useAuth } from "@/lib/mockData";
import { useShiftStore } from "@/lib/shiftStore";
import { CalendarDays, MapPin, Clock, ArrowRight, CalendarX } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useLocation } from "wouter";

// Lightweight operational schedule — upcoming shifts/jobs grouped by day.
// No calendar engine: just clear, tappable day-grouped visibility.
function dayKey(iso: string) {
  const d = new Date(iso);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).toISOString();
}

function dayLabel(iso: string) {
  const d = new Date(iso);
  const today = new Date();
  const tomorrow = new Date();
  tomorrow.setDate(today.getDate() + 1);
  const sameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
  if (sameDay(d, today)) return "Today";
  if (sameDay(d, tomorrow)) return "Tomorrow";
  return d.toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "short" });
}

export default function WorkerSchedulePage() {
  const { jobs, clients } = useStore();
  const { user } = useAuth();
  const { activeShift } = useShiftStore();
  const [, setLocation] = useLocation();

  // Upcoming assigned work (Active + Planned), earliest first.
  const upcoming = jobs
    .filter(
      (j) =>
        j.assignedWorkerIds.includes(user?.id ?? "") &&
        (j.status === "Active" || j.status === "Planned")
    )
    .sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime());

  // Group by calendar day.
  const groups = upcoming.reduce<Record<string, typeof upcoming>>((acc, job) => {
    const key = dayKey(job.startAt);
    (acc[key] ??= []).push(job);
    return acc;
  }, {});
  const dayKeys = Object.keys(groups).sort();

  return (
    <WorkerMobileLayout title="Schedule">
      <div className="p-4 space-y-6" data-testid="worker-schedule">
        {dayKeys.length === 0 ? (
          <div
            data-testid="worker-schedule-empty"
            className="bg-card rounded-2xl p-8 border border-border shadow-sm text-center"
          >
            <div className="w-16 h-16 bg-muted text-muted-foreground rounded-full flex items-center justify-center mx-auto mb-4">
              <CalendarX className="w-8 h-8" />
            </div>
            <h2 className="text-lg font-bold mb-1">No upcoming shifts</h2>
            <p className="text-muted-foreground text-sm">
              You have no scheduled jobs right now. Check with your manager.
            </p>
          </div>
        ) : (
          dayKeys.map((key) => (
            <section key={key} data-testid="worker-schedule-day" aria-label={dayLabel(key)}>
              <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
                <CalendarDays className="w-3.5 h-3.5" />
                {dayLabel(key)}
              </h2>
              <div className="space-y-3">
                {groups[key].map((job) => {
                  const client = clients.find((c) => c.id === job.clientId);
                  const isCurrent = activeShift?.jobId === job.id;
                  return (
                    <button
                      key={job.id}
                      data-testid={`worker-schedule-job-${job.id}`}
                      onClick={() => setLocation(`/worker/jobs/${job.id}`)}
                      aria-label={`Open ${job.title}`}
                      className="w-full text-left bg-card rounded-2xl p-4 shadow-sm border border-border active:scale-[0.98] transition-transform"
                    >
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <div className="min-w-0">
                          <p className="font-semibold text-sm truncate">{job.title}</p>
                          <p className="text-xs text-primary font-medium truncate">
                            {client?.name || "Unknown Client"}
                          </p>
                        </div>
                        <div className="flex flex-col items-end gap-1 shrink-0">
                          <Badge
                            variant={job.status === "Active" ? "default" : "secondary"}
                            className="text-[10px]"
                          >
                            {job.status}
                          </Badge>
                          {isCurrent && (
                            <Badge className="bg-emerald-100 text-emerald-700 border-none text-[10px]">
                              On Shift
                            </Badge>
                          )}
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Clock className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                          <span>
                            {new Date(job.startAt).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        </div>
                        <div className="flex items-start gap-2 text-xs text-muted-foreground">
                          <MapPin className="w-3.5 h-3.5 text-muted-foreground shrink-0 mt-0.5" />
                          <span className="line-clamp-1">{job.locationAddress}</span>
                        </div>
                      </div>
                      <div className="mt-3 flex items-center justify-end text-xs font-semibold text-muted-foreground">
                        Open Job <ArrowRight className="w-3.5 h-3.5 ml-1" />
                      </div>
                    </button>
                  );
                })}
              </div>
            </section>
          ))
        )}
      </div>
    </WorkerMobileLayout>
  );
}
