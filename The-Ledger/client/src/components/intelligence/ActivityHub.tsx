import { useEffect, useState } from "react";
import { useLocation, useSearch } from "wouter";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/mockData";
import {
  getAllEvents,
  recordEventNavigated,
  ACTIVITY_EVENT_TYPE_LABELS,
  type ActivityEvent,
  type ActivityEventType,
  type ActivityEventPriority,
} from "@/lib/activityFeedEngine";
import {
  getAllNotifications,
  markNotificationRead,
  dismissNotification,
  recordNotificationOpened,
  NOTIFICATION_TYPE_LABELS,
  NOTIFICATION_PRIORITY_LABELS,
  type Notification,
  type NotificationType,
  type NotificationPriority,
} from "@/lib/notificationEngine";
import { getEventHistory, type BusEventRecord } from "@/lib/eventBusEngine";
import { ArrowRight, CheckCircle, X } from "lucide-react";

// ─────────────────────────────────────────────────────────────────────
// CANONICAL PRIORITY MAPPING (normative — spec §10.5, P0-A)
// Pure render/filter functions. Native priorities are never rewritten.
// ─────────────────────────────────────────────────────────────────────

type CanonicalPriority = "critical" | "warning" | "info";

function activityCanonicalPriority(p: ActivityEventPriority): CanonicalPriority {
  return p; // identical taxonomy
}

function notificationCanonicalPriority(p: NotificationPriority): CanonicalPriority {
  if (p === "critical") return "critical";
  if (p === "high") return "warning";
  return "info"; // medium and low
}

const CANONICAL_PRIORITY_LABELS: Record<CanonicalPriority, string> = {
  critical: "Critical",
  warning: "Warning",
  info: "Info",
};

const CANONICAL_PRIORITY_DOTS: Record<CanonicalPriority, string> = {
  critical: "bg-red-500",
  warning: "bg-amber-500",
  info: "bg-slate-400",
};

const CANONICAL_PRIORITY_TEXT: Record<CanonicalPriority, string> = {
  critical: "text-red-700",
  warning: "text-amber-700",
  info: "text-muted-foreground",
};

// ─────────────────────────────────────────────────────────────────────
// TYPE → FILTER CATEGORY MAPPING (normative — spec §10.5; total over
// all 13 ActivityEventTypes and all 6 NotificationTypes)
// ─────────────────────────────────────────────────────────────────────

type TypeCategory = "operational" | "financial" | "governance" | "automation" | "sync";

const ACTIVITY_TYPE_CATEGORY: Record<ActivityEventType, TypeCategory> = {
  review_event: "operational",
  job_event: "operational",
  worker_event: "operational",
  stock_event: "operational",
  asset_event: "operational",
  notification_event: "operational",
  financial_control_event: "financial",
  exception_event: "financial",
  governance_event: "governance",
  automation_event: "automation",
  scheduler_event: "automation",
  sync_event: "sync",
  reconciliation_event: "sync",
};

const NOTIFICATION_TYPE_CATEGORY: Record<NotificationType, TypeCategory> = {
  review_required: "operational",
  automation_alert: "automation",
  governance_action: "governance",
  sync_failure: "sync",
  financial_control: "financial",
  exception_event: "financial",
};

const TYPE_FILTERS: { value: TypeCategory | "all"; label: string }[] = [
  { value: "all", label: "All" },
  { value: "operational", label: "Operational" },
  { value: "financial", label: "Financial" },
  { value: "governance", label: "Governance" },
  { value: "automation", label: "Automation" },
  { value: "sync", label: "Sync" },
];

const PRIORITY_FILTERS: { value: CanonicalPriority | "all"; label: string }[] = [
  { value: "all", label: "All" },
  { value: "critical", label: "Critical" },
  { value: "warning", label: "Warning" },
  { value: "info", label: "Info" },
];

// ─────────────────────────────────────────────────────────────────────
// MERGED ROW MODEL
// ─────────────────────────────────────────────────────────────────────

type CombinedRow =
  | { kind: "activity"; record: ActivityEvent }
  | { kind: "notification"; record: Notification };

function rowCanonicalPriority(row: CombinedRow): CanonicalPriority {
  return row.kind === "activity"
    ? activityCanonicalPriority(row.record.priority)
    : notificationCanonicalPriority(row.record.priority);
}

function rowTypeCategory(row: CombinedRow): TypeCategory {
  return row.kind === "activity"
    ? ACTIVITY_TYPE_CATEGORY[row.record.type]
    : NOTIFICATION_TYPE_CATEGORY[row.record.type];
}

function rowTypeLabel(row: CombinedRow): string {
  return row.kind === "activity"
    ? ACTIVITY_EVENT_TYPE_LABELS[row.record.type]
    : NOTIFICATION_TYPE_LABELS[row.record.type];
}

// The documented join key (spec §6.6/§10.5): live bus dispatches create
// activity events with id `bus-af-${busEvent.id}` (eventBusEngine.ts).
const BUS_AF_PREFIX = "bus-af-";

function resolveBusCounterpart(
  row: CombinedRow,
  busHistory: BusEventRecord[],
): BusEventRecord | null {
  if (row.kind !== "activity" || !row.record.id.startsWith(BUS_AF_PREFIX)) return null;
  const busId = row.record.id.slice(BUS_AF_PREFIX.length);
  return busHistory.find((b) => b.id === busId) ?? null;
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function relativeTime(iso: string): string {
  const then = new Date(iso).getTime();
  const now = Date.now();
  const diffMs = now - then;
  if (diffMs < 0) return formatTime(iso);
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return formatTime(iso);
}

// "Show Event Detail" localStorage key (spec §6.6 — namespaced; the
// Switch is the only writer; ?detail=1 wins per visit without writing)
const EVENT_DETAIL_LS_KEY = "ledger.intelligence.eventDetail";

const PAGE_SIZE = 25;

// ─────────────────────────────────────────────────────────────────────
// DETAIL EXPANSION (spec §10.5 metadata contract)
// ─────────────────────────────────────────────────────────────────────

function DetailField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] text-muted-foreground">{label}</p>
      <p className="text-xs font-mono break-all">{value}</p>
    </div>
  );
}

function EventDetailBlock({ row, bus }: { row: CombinedRow; bus: BusEventRecord | null }) {
  return (
    <div
      data-testid="activity-event-detail-block"
      className="mt-2 rounded-md border bg-muted/30 p-3 space-y-3"
    >
      <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
        <DetailField label="ID" value={row.record.id} />
        <DetailField label="Type" value={row.record.type} />
        <DetailField
          label="Native priority"
          value={
            row.kind === "notification"
              ? NOTIFICATION_PRIORITY_LABELS[row.record.priority]
              : row.record.priority
          }
        />
        {row.kind === "notification" && (
          <DetailField label="Status" value={row.record.status} />
        )}
        <DetailField label="Source type" value={row.record.sourceType} />
        <DetailField label="Source ID" value={row.record.sourceId} />
        <DetailField label="Source route" value={row.record.sourceRoute} />
        <DetailField label="Job" value={row.record.jobId ?? "—"} />
        {row.kind === "activity" && <DetailField label="Actor" value={row.record.actor} />}
        <DetailField label="Action required" value={row.record.actionRequired ? "Yes" : "No"} />
      </div>

      {bus && (
        <div
          data-testid="activity-bus-event-block"
          className="rounded-md border border-indigo-200 bg-indigo-50/50 p-3 space-y-2"
        >
          <Badge variant="outline" className="text-[10px] text-indigo-700 border-indigo-300 bg-indigo-50">
            Platform Event
          </Badge>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            <DetailField label="Bus event ID" value={bus.id} />
            <DetailField label="Category" value={bus.type} />
            <DetailField label="Timestamp" value={formatTime(bus.timestamp)} />
            <DetailField label="Consumed by" value={bus.consumedBy.join(", ") || "—"} />
            <DetailField label="Bus audit entries" value={String(bus.auditEntries.length)} />
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────
// ACTIVITY HUB (UX-5 spec §6.6 — combined Activity tab)
// No KPI strip, no counts in filter chips (P1-C — Blueprint 6.6 design).
// ─────────────────────────────────────────────────────────────────────

export function ActivityHub() {
  const [, setLocation] = useLocation();
  const search = useSearch();
  const { user } = useAuth();

  const detailParam = new URLSearchParams(search).get("detail");

  const [activityEvents, setActivityEvents] = useState<ActivityEvent[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [typeFilter, setTypeFilter] = useState<TypeCategory | "all">("all");
  const [priorityFilter, setPriorityFilter] = useState<CanonicalPriority | "all">("all");
  const [showDetail, setShowDetail] = useState(false);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  useEffect(() => {
    setActivityEvents(getAllEvents());
    setNotifications(getAllNotifications());
  }, []);

  // Toggle precedence (normative — spec §6.6, P1-D):
  // with ?detail= the URL param wins for the visit (no storage write);
  // without it, defensive localStorage read (absent/invalid → OFF);
  // param changes via in-app navigation re-evaluate.
  useEffect(() => {
    if (detailParam !== null) {
      setShowDetail(detailParam === "1");
    } else {
      let stored: string | null = null;
      try {
        stored = localStorage.getItem(EVENT_DETAIL_LS_KEY);
      } catch {
        stored = null;
      }
      setShowDetail(stored === "1");
    }
  }, [detailParam]);

  // The Switch is the only localStorage writer (rule 4)
  function handleDetailToggle(value: boolean) {
    setShowDetail(value);
    try {
      localStorage.setItem(EVENT_DETAIL_LS_KEY, value ? "1" : "0");
    } catch {
      // storage unavailable — toggle still works for the session
    }
  }

  function refreshNotifications() {
    setNotifications(getAllNotifications());
  }

  // Merge: union sorted by createdAt descending (newest first)
  const combined: CombinedRow[] = [
    ...activityEvents.map((record) => ({ kind: "activity" as const, record })),
    ...notifications.map((record) => ({ kind: "notification" as const, record })),
  ].sort(
    (a, b) => new Date(b.record.createdAt).getTime() - new Date(a.record.createdAt).getTime(),
  );

  const filtered = combined.filter((row) => {
    if (typeFilter !== "all" && rowTypeCategory(row) !== typeFilter) return false;
    if (priorityFilter !== "all" && rowCanonicalPriority(row) !== priorityFilter) return false;
    return true;
  });

  const visibleRows = filtered.slice(0, visibleCount);
  const busHistory = getEventHistory();

  // Deep links navigate only — never execute actions (§6.7)
  function handleActivityNavigate(event: ActivityEvent) {
    if (user?.name) recordEventNavigated(event.id, user.name);
    setLocation(event.sourceRoute);
  }

  function handleNotificationOpen(notif: Notification) {
    if (user?.name) recordNotificationOpened(notif.id, user.name);
    refreshNotifications();
    setLocation(notif.sourceRoute);
  }

  function handleMarkRead(notif: Notification) {
    if (user?.name) markNotificationRead(notif.id, user.name);
    refreshNotifications();
  }

  function handleDismiss(notif: Notification) {
    if (user?.name) dismissNotification(notif.id, user.name);
    refreshNotifications();
  }

  function resetPaging() {
    setVisibleCount(PAGE_SIZE);
  }

  return (
    <div className="space-y-4" data-testid="activity-hub">
      {/* ── FILTER BAR ── */}
      <div className="flex flex-wrap items-center gap-3 justify-between">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-1" data-testid="activity-filter-type-bar">
            {TYPE_FILTERS.map((f) => (
              <button
                key={f.value}
                data-testid={`activity-filter-type-${f.value}`}
                onClick={() => {
                  setTypeFilter(f.value);
                  resetPaging();
                }}
                className={cn(
                  "px-3 py-2 rounded-md text-xs border transition-colors min-h-[40px]",
                  typeFilter === f.value
                    ? "border-purple-400 bg-purple-50 text-purple-800 font-medium"
                    : "border-border bg-card hover:bg-muted text-muted-foreground",
                )}
              >
                {f.label}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-1" data-testid="activity-filter-priority-bar">
            {PRIORITY_FILTERS.map((f) => (
              <button
                key={f.value}
                data-testid={`activity-filter-priority-${f.value}`}
                onClick={() => {
                  setPriorityFilter(f.value);
                  resetPaging();
                }}
                className={cn(
                  "px-3 py-2 rounded-md text-xs border transition-colors min-h-[40px]",
                  priorityFilter === f.value
                    ? "border-purple-400 bg-purple-50 text-purple-800 font-medium"
                    : "border-border bg-card hover:bg-muted text-muted-foreground",
                )}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        <label className="flex items-center gap-2 text-sm">
          <span className="text-muted-foreground">Show Event Detail</span>
          <Switch
            data-testid="activity-event-detail-toggle"
            checked={showDetail}
            onCheckedChange={handleDetailToggle}
            aria-label="Show Event Detail"
          />
        </label>
      </div>

      {/* ── COMBINED LIST ── */}
      <div data-testid="activity-combined-list" className="space-y-2" aria-live="polite">
        {visibleRows.length === 0 && (
          <p
            data-testid="activity-empty-state"
            className="text-sm text-muted-foreground py-8 text-center"
          >
            No activity matches your filters.
          </p>
        )}
        {visibleRows.map((row) => {
          const canonical = rowCanonicalPriority(row);
          const bus = showDetail ? resolveBusCounterpart(row, busHistory) : null;
          return (
            <div
              key={`${row.kind}-${row.record.id}`}
              data-testid="activity-row"
              data-kind={row.kind}
              data-priority={canonical}
              className="p-3 rounded-md border bg-card"
            >
              <div className="flex items-start gap-3">
                <span
                  className={cn(
                    "h-2.5 w-2.5 rounded-full mt-1.5 flex-shrink-0",
                    CANONICAL_PRIORITY_DOTS[canonical],
                  )}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={cn("text-xs font-semibold", CANONICAL_PRIORITY_TEXT[canonical])}>
                      {CANONICAL_PRIORITY_LABELS[canonical]}
                    </span>
                    <Badge variant="outline" className="text-[10px]">
                      {rowTypeLabel(row)}
                    </Badge>
                    {row.kind === "notification" && (
                      <Badge
                        variant="outline"
                        data-testid="activity-row-notification-chip"
                        className="text-[10px] text-cyan-700 border-cyan-200 bg-cyan-50"
                      >
                        Notification
                      </Badge>
                    )}
                    <span
                      className="text-[10px] text-muted-foreground"
                      title={formatTime(row.record.createdAt)}
                    >
                      {relativeTime(row.record.createdAt)}
                    </span>
                  </div>
                  <p className="text-sm font-medium mt-0.5">{row.record.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {row.record.jobId ? `${row.record.jobId} · ` : ""}
                    {row.record.sourceType}
                  </p>
                  {showDetail && <EventDetailBlock row={row} bus={bus} />}
                </div>

                {/* Trailing actions */}
                <div className="flex items-center gap-1 flex-shrink-0">
                  {row.kind === "activity" && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 gap-1 text-xs"
                      aria-label={`Open source: ${row.record.title}`}
                      onClick={() => handleActivityNavigate(row.record)}
                    >
                      Open Source <ArrowRight className="h-3 w-3" />
                    </Button>
                  )}
                  {row.kind === "notification" && (
                    <>
                      {row.record.status === "unread" && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 gap-1 text-xs"
                          aria-label={`Mark read: ${row.record.title}`}
                          onClick={() => handleMarkRead(row.record)}
                        >
                          <CheckCircle className="h-3 w-3" /> Mark Read
                        </Button>
                      )}
                      {row.record.status !== "dismissed" && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 gap-1 text-xs text-muted-foreground"
                          aria-label={`Dismiss: ${row.record.title}`}
                          onClick={() => handleDismiss(row.record)}
                        >
                          <X className="h-3 w-3" /> Dismiss
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 gap-1 text-xs"
                        aria-label={`Open source: ${row.record.title}`}
                        onClick={() => handleNotificationOpen(row.record)}
                      >
                        Open Source <ArrowRight className="h-3 w-3" />
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── LOAD MORE ── */}
      {filtered.length > visibleCount && (
        <Button
          variant="outline"
          size="sm"
          className="w-full"
          data-testid="activity-load-more"
          onClick={() => setVisibleCount((c) => c + PAGE_SIZE)}
        >
          Load More ({filtered.length - visibleCount} remaining)
        </Button>
      )}
    </div>
  );
}
