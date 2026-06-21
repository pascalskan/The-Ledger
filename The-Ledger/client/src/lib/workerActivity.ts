// ──────────────────────────────────────────────────────────────────────────
// WK-5 — Worker Activity Aggregation
//
// Pure, worker-scoped aggregation of a worker's own submissions across the two
// authoritative sources established in WK-3/WK-4:
//   1. Review Centre items (reviewItems) — carry the approval status + reviewer
//      notes once a submission has been ingested.
//   2. Offline queue (offlineQueueStore.queue) — carry submissions that have not
//      yet been replayed/ingested (pending sync, failed, etc.).
//
// RBAC: only the worker's OWN activity is returned (filtered by workerId).
// No financial figures are derived or exposed here — operational only.
// ──────────────────────────────────────────────────────────────────────────

import type { ReviewItem } from "@/lib/mockData";
import type { OfflineQueueItem } from "@/lib/offlineQueueStore";

export type WorkerActivityKind = "report" | "issue" | "timesheet" | "expense" | "upload";

export type ReviewStatus =
  | "pending"
  | "approved"
  | "rejected"
  | "needs-correction"
  | "escalated";

export interface WorkerActivityEntry {
  id: string;
  kind: WorkerActivityKind;
  title: string;
  jobId: string;
  jobTitle: string;
  dateISO: string;
  reviewStatus: ReviewStatus;
  reviewerNotes?: string;
  /** Local sync state when the item has not yet reached the Review Centre. */
  syncStatus?: string;
  /** Worked hours, when the submission carries labour. */
  hours?: number;
  shiftStart?: string;
  shiftEnd?: string;
  source: "review" | "queue";
}

const KIND_LABEL: Record<WorkerActivityKind, string> = {
  report: "Report",
  issue: "Issue",
  timesheet: "Timesheet",
  expense: "Expense",
  upload: "Upload",
};

export function kindLabel(kind: WorkerActivityKind): string {
  return KIND_LABEL[kind];
}

function detectKind(payload: any): WorkerActivityKind {
  const t = payload?.type;
  if (t === "issue-log" || t === "log") return "issue";
  if (t === "timesheet") return "timesheet";
  if (Array.isArray(payload?.expenses) && payload.expenses.length > 0) return "expense";
  if (t === "photo") return "upload";
  const hasLabour =
    Array.isArray(payload?.laborEntries) &&
    payload.laborEntries.some((l: any) => (l?.hours ?? 0) > 0);
  const onlyUploads =
    Array.isArray(payload?.uploads) &&
    payload.uploads.length > 0 &&
    !payload?.notes &&
    !(payload?.materialsUsed?.length) &&
    !hasLabour;
  if (onlyUploads) return "upload";
  return "report";
}

function labourOf(payload: any): { hours?: number; shiftStart?: string; shiftEnd?: string } {
  const entry = Array.isArray(payload?.laborEntries) ? payload.laborEntries[0] : undefined;
  if (!entry) return {};
  return { hours: entry.hours, shiftStart: entry.shiftStart, shiftEnd: entry.shiftEnd };
}

function jobTitleOf(jobs: { id: string; title: string }[], jobId: string): string {
  return jobs.find((j) => j.id === jobId)?.title ?? "Unknown Job";
}

/**
 * Aggregate a single worker's own activity, newest first.
 */
export function getWorkerActivity(
  userId: string | undefined,
  reviewItems: ReviewItem[],
  queue: OfflineQueueItem[],
  jobs: { id: string; title: string }[]
): WorkerActivityEntry[] {
  if (!userId) return [];

  // 1. Review Centre items attributed to this worker.
  const reviewEntries: WorkerActivityEntry[] = reviewItems
    .filter((r) => (r as any).workerId === userId)
    .map((r) => {
      const { hours, shiftStart, shiftEnd } = labourOf(r);
      return {
        id: r.id,
        kind: detectKind(r),
        title: (r as any).title || "Submission",
        jobId: r.jobId,
        jobTitle: jobTitleOf(jobs, r.jobId),
        dateISO: r.submittedAt || new Date(0).toISOString(),
        reviewStatus: (r.status as ReviewStatus) || "pending",
        reviewerNotes: r.correctionNotes,
        hours,
        shiftStart,
        shiftEnd,
        source: "review",
      };
    });

  // 2. Queue items not yet ingested into the Review Centre (no matching
  //    sourceQueueId on any review item), attributed to this worker.
  const reviewedQueueIds = new Set(
    reviewItems
      .map((r) => (r as any).sourceQueueId)
      .filter((v): v is string => Boolean(v))
  );

  const queueEntries: WorkerActivityEntry[] = queue
    .filter((q) => !reviewedQueueIds.has(q.id) && q.payload?.workerId === userId)
    .map((q) => {
      const p = q.payload;
      const { hours, shiftStart, shiftEnd } = labourOf(p);
      return {
        id: q.id,
        kind: detectKind(p),
        title: p?.title || "Submission",
        jobId: p?.jobId,
        jobTitle: jobTitleOf(jobs, p?.jobId),
        dateISO: p?.submittedAt || q.createdAt,
        reviewStatus: "pending",
        syncStatus: q.syncStatus,
        hours,
        shiftStart,
        shiftEnd,
        source: "queue",
      };
    });

  return [...reviewEntries, ...queueEntries].sort(
    (a, b) => new Date(b.dateISO).getTime() - new Date(a.dateISO).getTime()
  );
}

/** Operational performance snapshot — no financial figures. */
export function summariseActivity(entries: WorkerActivityEntry[]) {
  const now = new Date();
  const reportsThisMonth = entries.filter(
    (e) =>
      e.kind === "report" &&
      (() => {
        const d = new Date(e.dateISO);
        return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
      })()
  ).length;

  const shifts = entries.filter((e) => (e.hours ?? 0) > 0);

  return {
    reports: entries.filter((e) => e.kind === "report").length,
    issues: entries.filter((e) => e.kind === "issue").length,
    uploads: entries.filter((e) => e.kind === "upload").length,
    expenses: entries.filter((e) => e.kind === "expense").length,
    totalShifts: shifts.length,
    totalHours: Math.round(shifts.reduce((sum, e) => sum + (e.hours ?? 0), 0) * 100) / 100,
    reportsThisMonth,
    outstandingCorrections: entries.filter((e) => e.reviewStatus === "needs-correction").length,
  };
}
