/**
 * ACTIVITY FEED PAGE — Phase 6.2
 *
 * CEO access only.
 *
 * Doctrine Compliance:
 * - Informational only — no financial mutations
 * - No approval workflow bypass
 * - All interactions auditable
 * - Deep links navigate to source pages only
 * - Job attribution preserved
 */
import { useState } from 'react';
import { useLocation } from 'wouter';
import { Layout } from '@/components/layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Activity,
  AlertTriangle,
  CheckCircle,
  Clock,
  ExternalLink,
  Info,
  Search,
  Zap,
  ShieldCheck,
  RefreshCw,
  GitMerge,
  TriangleAlert,
  DollarSign,
  Briefcase,
  Users,
  Package,
  Blocks,
  Bell,
  Calendar,
} from 'lucide-react';
import {
  getAllEvents,
  getEventById,
  computeActivitySummary,
  searchEvents,
  filterEventsByType,
  filterEventsByPriority,
  getActionRequiredEvents,
  recordEventOpened,
  recordEventNavigated,
  ACTIVITY_EVENT_TYPE_LABELS,
  ACTIVITY_EVENT_TYPE_COLORS,
  ACTIVITY_PRIORITY_LABELS,
  ACTIVITY_PRIORITY_COLORS,
  type ActivityEvent,
  type ActivityEventType,
  type ActivityEventPriority,
} from '@/lib/activityFeedEngine';
import { useAuth } from '@/lib/mockData';

// ──────────────────────────────────────────────────────
// EVENT TYPE ICON MAP
// ──────────────────────────────────────────────────────

function EventTypeIcon({ type, className }: { type: ActivityEventType; className?: string }) {
  const cls = className ?? 'h-4 w-4';
  switch (type) {
    case 'review_event':          return <CheckCircle className={cls} />;
    case 'automation_event':      return <Zap className={cls} />;
    case 'governance_event':      return <ShieldCheck className={cls} />;
    case 'scheduler_event':       return <Calendar className={cls} />;
    case 'notification_event':    return <Bell className={cls} />;
    case 'sync_event':            return <RefreshCw className={cls} />;
    case 'reconciliation_event':  return <GitMerge className={cls} />;
    case 'exception_event':       return <TriangleAlert className={cls} />;
    case 'financial_control_event': return <DollarSign className={cls} />;
    case 'job_event':             return <Briefcase className={cls} />;
    case 'worker_event':          return <Users className={cls} />;
    case 'stock_event':           return <Package className={cls} />;
    case 'asset_event':           return <Blocks className={cls} />;
    default:                      return <Activity className={cls} />;
  }
}

// ──────────────────────────────────────────────────────
// FORMAT HELPERS
// ──────────────────────────────────────────────────────

function formatTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

// ──────────────────────────────────────────────────────
// ACTIVITY FEED PAGE
// ──────────────────────────────────────────────────────

export default function ActivityFeedPage() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();

  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<ActivityEventType | 'all'>('all');
  const [priorityFilter, setPriorityFilter] = useState<ActivityEventPriority | 'all'>('all');
  const [selectedEvent, setSelectedEvent] = useState<ActivityEvent | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const summary = computeActivitySummary();

  // Compute displayed events with search + filter
  let displayed = getAllEvents();
  displayed = filterEventsByType(displayed, typeFilter);
  displayed = filterEventsByPriority(displayed, priorityFilter);
  displayed = searchEvents(displayed, searchQuery);

  function handleViewEvent(event: ActivityEvent) {
    setSelectedEvent(event);
    setDialogOpen(true);
    if (user?.id) recordEventOpened(event.id, user.id);
  }

  function handleDeepLink(event: ActivityEvent) {
    if (user?.id) recordEventNavigated(event.id, user.id);
    setDialogOpen(false);
    setLocation(event.sourceRoute);
  }

  const kpiCards = [
    { testId: 'af-kpi-total',          label: 'Total Events',    value: summary.total,          icon: Activity,       color: 'text-blue-500' },
    { testId: 'af-kpi-critical',       label: 'Critical Events', value: summary.critical,       icon: AlertTriangle,   color: 'text-red-500' },
    { testId: 'af-kpi-action-required',label: 'Action Required', value: summary.actionRequired, icon: TriangleAlert,  color: 'text-orange-500' },
    { testId: 'af-kpi-today',          label: 'Today',           value: summary.today,          icon: Clock,          color: 'text-green-500' },
    { testId: 'af-kpi-last7days',      label: 'Last 7 Days',     value: summary.last7Days,      icon: Info,           color: 'text-purple-500' },
  ];

  return (
    <Layout>
      <div className="space-y-6" data-testid="activity-feed-page">
        {/* HEADER */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Activity Feed</h2>
            <p className="text-muted-foreground mt-1">
              Unified operational event stream — informational only.
            </p>
          </div>
          <Badge variant="outline" className="px-3 py-1 text-xs font-mono uppercase tracking-wider border-primary/20 bg-primary/5">
            CEO Access
          </Badge>
        </div>

        {/* DOCTRINE NOTICE */}
        <div
          data-testid="af-doctrine-notice"
          className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex items-start gap-3 text-blue-700 text-sm"
        >
          <Info className="h-4 w-4 mt-0.5 flex-shrink-0" />
          <p>
            <span className="font-semibold">Activity Feed Doctrine:</span> This feed is{' '}
            <span className="font-semibold">informational only</span>. It never creates revenue,
            cost, payroll, inventory deductions, or financial mutations. All approvals remain
            human-controlled via the Review Centre and approval workflows.
          </p>
        </div>

        {/* KPI STRIP */}
        <div className="grid gap-4 md:grid-cols-5" data-testid="af-kpi-strip">
          {kpiCards.map((kpi) => (
            <Card key={kpi.testId} className="border-border/60 shadow-sm overflow-hidden group">
              <div className={`h-1 w-full ${kpi.color.replace('text-', 'bg-')}`} />
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-xs font-medium">{kpi.label}</CardTitle>
                <kpi.icon className={`h-4 w-4 ${kpi.color}`} />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid={kpi.testId}>{kpi.value}</div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* FILTERS + SEARCH */}
        <div className="flex flex-wrap gap-3 items-center">
          <div className="relative flex-1 min-w-48">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              data-testid="af-search"
              className="pl-9"
              placeholder="Search events, job IDs, source IDs…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <Select
            value={typeFilter}
            onValueChange={(v) => setTypeFilter(v as ActivityEventType | 'all')}
          >
            <SelectTrigger data-testid="af-filter-type" className="w-44">
              <SelectValue placeholder="All Types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="review_event">Review</SelectItem>
              <SelectItem value="automation_event">Automation</SelectItem>
              <SelectItem value="governance_event">Governance</SelectItem>
              <SelectItem value="scheduler_event">Scheduler</SelectItem>
              <SelectItem value="notification_event">Notification</SelectItem>
              <SelectItem value="sync_event">Sync</SelectItem>
              <SelectItem value="reconciliation_event">Reconciliation</SelectItem>
              <SelectItem value="exception_event">Exception</SelectItem>
              <SelectItem value="financial_control_event">Financial Control</SelectItem>
              <SelectItem value="job_event">Job</SelectItem>
              <SelectItem value="worker_event">Worker</SelectItem>
              <SelectItem value="stock_event">Stock</SelectItem>
              <SelectItem value="asset_event">Asset</SelectItem>
            </SelectContent>
          </Select>

          <Select
            value={priorityFilter}
            onValueChange={(v) => setPriorityFilter(v as ActivityEventPriority | 'all')}
          >
            <SelectTrigger data-testid="af-filter-priority" className="w-40">
              <SelectValue placeholder="All Priorities" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Priorities</SelectItem>
              <SelectItem value="critical">Critical</SelectItem>
              <SelectItem value="warning">Warning</SelectItem>
              <SelectItem value="info">Info</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* EVENT TABLE */}
        <Card className="border-border/60 shadow-sm">
          <CardContent className="p-0">
            <div data-testid="af-event-table" className="divide-y">
              {displayed.length === 0 && (
                <div className="px-6 py-10 text-center text-sm text-muted-foreground">
                  No events match the current filters.
                </div>
              )}
              {displayed.map((event) => (
                <div
                  key={event.id}
                  data-testid={`af-event-row-${event.id}`}
                  className="flex items-start gap-4 px-6 py-4 hover:bg-muted transition-colors"
                >
                  {/* Icon */}
                  <div className="flex-shrink-0 mt-1">
                    <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
                      <EventTypeIcon type={event.type} className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-medium text-sm">{event.title}</p>
                      {event.actionRequired && (
                        <span
                          data-testid={`af-action-required-${event.id}`}
                          className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-orange-100 text-orange-800"
                        >
                          <TriangleAlert className="h-3 w-3" /> Action Required
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{event.description}</p>
                    <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                      <Badge className={`text-[10px] h-5 ${ACTIVITY_EVENT_TYPE_COLORS[event.type]}`}>
                        {ACTIVITY_EVENT_TYPE_LABELS[event.type]}
                      </Badge>
                      <Badge className={`text-[10px] h-5 ${ACTIVITY_PRIORITY_COLORS[event.priority]}`}>
                        {ACTIVITY_PRIORITY_LABELS[event.priority]}
                      </Badge>
                      {event.jobId && (
                        <span className="text-[10px] font-mono text-muted-foreground">{event.jobId}</span>
                      )}
                      <span className="text-[10px] text-muted-foreground">{formatTime(event.createdAt)}</span>
                    </div>
                  </div>

                  {/* Action */}
                  <div className="flex-shrink-0">
                    <Button
                      data-testid={`af-btn-view-${event.id}`}
                      variant="outline"
                      size="sm"
                      className="text-xs"
                      onClick={() => handleViewEvent(event)}
                    >
                      View
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* EVENT DETAIL DIALOG */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg" data-testid="af-event-detail-dialog">
          {selectedEvent && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <EventTypeIcon type={selectedEvent.type} className="h-5 w-5" />
                  {selectedEvent.title}
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-4 text-sm">
                {/* Badges */}
                <div className="flex gap-2 flex-wrap">
                  <Badge
                    data-testid="af-detail-type-badge"
                    className={ACTIVITY_EVENT_TYPE_COLORS[selectedEvent.type]}
                  >
                    {ACTIVITY_EVENT_TYPE_LABELS[selectedEvent.type]}
                  </Badge>
                  <Badge
                    data-testid="af-detail-priority-badge"
                    className={ACTIVITY_PRIORITY_COLORS[selectedEvent.priority]}
                  >
                    {ACTIVITY_PRIORITY_LABELS[selectedEvent.priority]}
                  </Badge>
                  {selectedEvent.actionRequired && (
                    <Badge
                      data-testid="af-detail-action-required-badge"
                      className="bg-orange-100 text-orange-800"
                    >
                      Action Required
                    </Badge>
                  )}
                </div>

                {/* Description */}
                <p className="text-muted-foreground leading-relaxed">{selectedEvent.description}</p>

                {/* Meta */}
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <p className="text-muted-foreground">Source ID</p>
                    <p className="font-mono font-medium">{selectedEvent.sourceId}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Source Type</p>
                    <p className="font-medium capitalize">{selectedEvent.sourceType.replace(/_/g, ' ')}</p>
                  </div>
                  {selectedEvent.jobId && (
                    <div>
                      <p className="text-muted-foreground">Job Reference</p>
                      <p className="font-mono font-medium">{selectedEvent.jobId}</p>
                    </div>
                  )}
                  <div>
                    <p className="text-muted-foreground">Actor</p>
                    <p className="font-medium">{selectedEvent.actor}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Timestamp</p>
                    <p className="font-medium">{formatTime(selectedEvent.createdAt)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Source Route</p>
                    <p className="font-mono text-primary">{selectedEvent.sourceRoute}</p>
                  </div>
                </div>

                {/* Doctrine notice */}
                <div
                  data-testid="af-detail-doctrine-notice"
                  className="bg-blue-50 border border-blue-100 rounded p-2.5 text-xs text-blue-700"
                >
                  <span className="font-semibold">Informational only.</span> This event record does
                  not create or modify financial records. All approvals remain human-controlled.
                </div>

                {/* Actions */}
                <div className="flex justify-end gap-2 pt-1">
                  <Button variant="outline" size="sm" onClick={() => setDialogOpen(false)}>
                    Close
                  </Button>
                  <Button
                    data-testid="af-detail-btn-deep-link"
                    size="sm"
                    className="gap-1"
                    onClick={() => handleDeepLink(selectedEvent)}
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                    Go to Source
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </Layout>
  );
}
