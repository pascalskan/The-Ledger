import { WorkerMobileLayout } from "@/components/WorkerMobileLayout";
import { useStore, useAuth } from "@/lib/mockData";
import { useOfflineQueueStore } from "@/lib/offlineQueueStore";
import {
  getWorkerActivity,
  kindLabel,
  type WorkerActivityEntry,
  type WorkerActivityKind,
} from "@/lib/workerActivity";
import {
  FileText,
  AlertTriangle,
  Clock,
  Receipt,
  ImageIcon,
  CheckCircle2,
  XCircle,
  RotateCcw,
  ArrowUpCircle,
  RefreshCw,
  Briefcase,
} from "lucide-react";
import { useState } from "react";

type FilterKey = "all" | WorkerActivityKind | "shifts";

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: "all", label: "All" },
  { key: "report", label: "Reports" },
  { key: "issue", label: "Issues" },
  { key: "expense", label: "Expenses" },
  { key: "upload", label: "Uploads" },
  { key: "shifts", label: "Shifts" },
];

const KIND_ICON: Record<WorkerActivityKind, any> = {
  report: FileText,
  issue: AlertTriangle,
  timesheet: Clock,
  expense: Receipt,
  upload: ImageIcon,
};

function StatusBadge({ entry }: { entry: WorkerActivityEntry }) {
  // Local-only items that have not yet reached the Review Centre.
  if (entry.source === "queue") {
    const failed = entry.syncStatus === "failed";
    return (
      <span
        data-status={failed ? "failed-sync" : "pending-sync"}
        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold ${
          failed ? "bg-red-100 text-red-700" : "bg-orange-100 text-orange-700"
        }`}
      >
        <RefreshCw className="w-3 h-3" />
        {failed ? "Failed sync" : "Pending sync"}
      </span>
    );
  }

  const map: Record<string, { label: string; cls: string; Icon: any }> = {
    pending: { label: "Pending review", cls: "bg-amber-100 text-amber-800", Icon: Clock },
    approved: { label: "Approved", cls: "bg-green-100 text-green-700", Icon: CheckCircle2 },
    rejected: { label: "Rejected", cls: "bg-red-100 text-red-700", Icon: XCircle },
    "needs-correction": {
      label: "Needs changes",
      cls: "bg-orange-100 text-orange-700",
      Icon: RotateCcw,
    },
    escalated: { label: "Escalated", cls: "bg-purple-100 text-purple-700", Icon: ArrowUpCircle },
  };
  const s = map[entry.reviewStatus] ?? map.pending;
  return (
    <span
      data-status={entry.reviewStatus}
      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold ${s.cls}`}
    >
      <s.Icon className="w-3 h-3" />
      {s.label}
    </span>
  );
}

function formatHours(h: number) {
  const hours = Math.floor(h);
  const mins = Math.round((h - hours) * 60);
  return `${hours}h ${mins.toString().padStart(2, "0")}m`;
}

export default function WorkerHistoryPage() {
  const { reviewItems, jobs } = useStore();
  const { queue } = useOfflineQueueStore();
  const { user } = useAuth();
  const [filter, setFilter] = useState<FilterKey>("all");

  const activity = getWorkerActivity(user?.id, reviewItems as any, queue, jobs);

  const filtered = activity.filter((e) => {
    if (filter === "all") return true;
    if (filter === "shifts") return (e.hours ?? 0) > 0;
    return e.kind === filter;
  });

  const showingShifts = filter === "shifts";

  return (
    <WorkerMobileLayout title="My Activity">
      <div className="p-4 space-y-5" data-testid="worker-history">

        {/* ── Filter chips ── */}
        <div className="flex gap-2 overflow-x-auto hide-scrollbar -mx-1 px-1 pb-1">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              data-testid={`worker-history-filter-${f.key}`}
              onClick={() => setFilter(f.key)}
              className={`shrink-0 px-3.5 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
                filter === f.key
                  ? "bg-slate-900 text-white border-slate-900"
                  : "bg-card text-muted-foreground border-border hover:border-slate-400"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* ── Activity timeline / shift history ── */}
        <section data-testid={showingShifts ? "worker-shift-history" : "worker-history-list"}>
          {filtered.length === 0 ? (
            <div
              data-testid="worker-history-empty"
              className="bg-card rounded-2xl p-8 border border-border shadow-sm text-center"
            >
              <div className="w-12 h-12 mx-auto bg-muted text-muted-foreground rounded-full flex items-center justify-center mb-3">
                <FileText className="w-6 h-6" />
              </div>
              <p className="font-semibold text-foreground">Nothing here yet</p>
              <p className="text-sm text-muted-foreground mt-1">
                {showingShifts
                  ? "Your completed shifts will appear here."
                  : "Your submissions will appear here once you log work."}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filtered.map((e) => {
                const Icon = KIND_ICON[e.kind];
                return (
                  <div
                    key={`${e.source}-${e.id}`}
                    data-testid="worker-history-entry"
                    data-kind={e.kind}
                    className="bg-card rounded-2xl p-4 border border-border shadow-sm"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3 min-w-0">
                        <div className="w-9 h-9 rounded-full bg-muted text-muted-foreground flex items-center justify-center shrink-0">
                          <Icon className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-sm truncate">{e.title}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {kindLabel(e.kind)} · {new Date(e.dateISO).toLocaleDateString()}
                          </p>
                          <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                            <Briefcase className="w-3 h-3 shrink-0" />
                            <span className="truncate">{e.jobTitle}</span>
                          </div>
                        </div>
                      </div>
                      <StatusBadge entry={e} />
                    </div>

                    {/* Shift hours / duration (operational, not financial) */}
                    {(e.hours ?? 0) > 0 && (
                      <div className="mt-3 flex items-center gap-4 rounded-xl bg-muted px-3 py-2 text-xs">
                        <span className="flex items-center gap-1.5 text-muted-foreground">
                          <Clock className="w-3.5 h-3.5" /> {formatHours(e.hours!)}
                        </span>
                        {e.shiftStart && e.shiftEnd && (
                          <span className="text-muted-foreground">
                            {new Date(e.shiftStart).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}{" "}
                            –{" "}
                            {new Date(e.shiftEnd).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        )}
                      </div>
                    )}

                    {/* Reviewer notes (corrections) */}
                    {e.reviewerNotes && (
                      <div
                        data-testid="worker-history-reviewer-notes"
                        className="mt-3 rounded-xl bg-orange-50 border border-orange-100 p-3"
                      >
                        <p className="text-[11px] font-semibold uppercase tracking-wide text-orange-700">
                          Reviewer notes
                        </p>
                        <p className="text-xs text-orange-800 mt-1 leading-relaxed">
                          {e.reviewerNotes}
                        </p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </WorkerMobileLayout>
  );
}
