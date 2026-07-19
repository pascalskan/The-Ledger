import { useState } from 'react';
import { Layout } from '@/components/layout';
import { PageHeader } from '@/components/page-shell';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useLocation } from 'wouter';
import { cn } from '@/lib/utils';
import {
  Radio,
  Activity,
  Users,
  Zap,
  AlertTriangle,
  Search,
  ExternalLink,
  CheckCircle2,
  Clock,
} from 'lucide-react';
import {
  getEventHistory,
  getSubscribers,
  computeEventBusSummary,
  searchBusEvents,
  getEventsByType,
  getEventsByPriority,
  recordEventMonitorViewed,
  BUS_EVENT_TYPE_LABELS,
  BUS_EVENT_TYPE_COLORS,
  BUS_PRIORITY_LABELS,
  BUS_PRIORITY_COLORS,
  BUS_EVENT_ROUTES,
  type BusEventRecord,
  type BusEventCategory,
  type BusEventPriority,
} from '@/lib/eventBusEngine';
import { useAuth } from '@/lib/mockData';

export default function EventMonitorPage() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();

  const [typeFilter, setTypeFilter] = useState<BusEventCategory | 'all'>('all');
  const [priorityFilter, setPriorityFilter] = useState<BusEventPriority | 'all'>('all');
  const [search, setSearch] = useState('');
  const [selectedEvent, setSelectedEvent] = useState<BusEventRecord | null>(null);

  const summary = computeEventBusSummary();
  const subscribers = getSubscribers();

  // Apply filters
  let events = typeFilter !== 'all' ? getEventsByType(typeFilter) : getEventHistory();
  events = priorityFilter !== 'all' ? events.filter((e) => e.priority === priorityFilter) : events;
  events = searchBusEvents(events, search);

  function handleViewEvent(event: BusEventRecord) {
    recordEventMonitorViewed(event.id);
    setSelectedEvent(event);
  }

  const kpiCards = [
    {
      testId: 'em-kpi-total',
      label: 'Total Events',
      value: summary.total,
      icon: Activity,
      color: 'text-blue-500',
      bg: 'bg-blue-50',
    },
    {
      testId: 'em-kpi-today',
      label: 'Events Today',
      value: summary.today,
      icon: Clock,
      color: 'text-green-600',
      bg: 'bg-green-50',
    },
    {
      testId: 'em-kpi-critical',
      label: 'Critical Events',
      value: summary.critical,
      icon: AlertTriangle,
      color: 'text-red-500',
      bg: 'bg-red-50',
    },
    {
      testId: 'em-kpi-subscribers',
      label: 'Subscribers',
      value: summary.subscriberCount,
      icon: Users,
      color: 'text-purple-500',
      bg: 'bg-purple-50',
    },
    {
      testId: 'em-kpi-active-types',
      label: 'Active Event Types',
      value: summary.activeEventTypes,
      icon: Zap,
      color: 'text-orange-500',
      bg: 'bg-orange-50',
    },
  ];

  const allTypes: BusEventCategory[] = [
    'review_event', 'automation_event', 'governance_event', 'scheduler_event',
    'notification_event', 'sync_event', 'reconciliation_event', 'exception_event',
    'financial_control_event', 'job_event', 'worker_event', 'stock_event', 'asset_event',
  ];

  return (
    <Layout>
      <div data-testid="event-monitor-page" className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-end">
          <div>
            <PageHeader
              title="Event Monitor"
              icon={Radio}
              description="Real-time visibility into the Event Bus pipeline across The Ledger."
            />
          </div>
          <Badge variant="outline" className="px-3 py-1 text-xs font-mono uppercase tracking-wider border-primary/20 bg-primary/5">
            CEO Only
          </Badge>
        </div>

        {/* Doctrine notice */}
        <div
          data-testid="em-doctrine-notice"
          className="flex items-start gap-3 p-3 rounded-lg bg-blue-50 border border-blue-200 text-blue-800 text-sm"
        >
          <CheckCircle2 className="h-4 w-4 mt-0.5 flex-shrink-0" />
          <span>
            <strong>Event Bus Doctrine:</strong> The Event Bus is <strong>informational and evaluative only</strong>.
            It may publish events, notify subscribers, and trigger evaluations.
            It may <strong>never</strong> approve submissions, create approved financial records, or bypass the Review Centre.
            All event processing is fully auditable.
          </span>
        </div>

        {/* KPI Strip */}
        <div data-testid="em-kpi-strip" className="grid gap-4 md:grid-cols-5">
          {kpiCards.map((kpi) => (
            <Card key={kpi.testId} data-testid={kpi.testId} className="border-slate-200/60 shadow-sm">
              <CardContent className="pt-4 pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground">{kpi.label}</p>
                    <p className="text-2xl font-bold mt-1">{kpi.value}</p>
                  </div>
                  <div className={cn('h-9 w-9 rounded-lg flex items-center justify-center', kpi.bg)}>
                    <kpi.icon className={cn('h-5 w-5', kpi.color)} />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Event Stream */}
          <div className="lg:col-span-2 space-y-4">
            {/* Filters */}
            <Card className="border-slate-200/60 shadow-sm">
              <CardContent className="pt-4 pb-3">
                <div className="flex flex-wrap gap-3">
                  <div className="relative flex-1 min-w-48">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      data-testid="em-search"
                      placeholder="Search event ID, job ID, source..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                  <Select
                    value={typeFilter}
                    onValueChange={(v) => setTypeFilter(v as BusEventCategory | 'all')}
                  >
                    <SelectTrigger data-testid="em-filter-type" className="w-44">
                      <SelectValue placeholder="Event Type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      {allTypes.map((t) => (
                        <SelectItem key={t} value={t}>{BUS_EVENT_TYPE_LABELS[t]}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select
                    value={priorityFilter}
                    onValueChange={(v) => setPriorityFilter(v as BusEventPriority | 'all')}
                  >
                    <SelectTrigger data-testid="em-filter-priority" className="w-36">
                      <SelectValue placeholder="Priority" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Priorities</SelectItem>
                      <SelectItem value="critical">Critical</SelectItem>
                      <SelectItem value="warning">Warning</SelectItem>
                      <SelectItem value="info">Info</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* Event Table */}
            <Card className="border-slate-200/60 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Activity className="h-4 w-4 text-primary" />
                  Event Stream
                </CardTitle>
                <CardDescription>Live event flow through The Ledger’s operational pipeline.</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <div data-testid="em-event-stream" className="divide-y">
                  {events.length === 0 && (
                    <div className="py-8 text-center text-sm text-muted-foreground">
                      No events match the current filters.
                    </div>
                  )}
                  {events.map((event) => (
                    <div
                      key={event.id}
                      data-testid={`em-event-row-${event.id}`}
                      className="flex items-start gap-3 px-4 py-3 hover:bg-slate-50 transition-colors"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-medium truncate">{event.title}</span>
                          {event.actionRequired && (
                            <span
                              data-testid={`em-action-required-${event.id}`}
                              className="inline-flex items-center gap-0.5 px-1 py-0.5 rounded text-[10px] font-semibold bg-orange-100 text-orange-800"
                            >
                              <AlertTriangle className="h-2.5 w-2.5" /> Action Required
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          <Badge className={cn('text-[10px] h-4 px-1', BUS_EVENT_TYPE_COLORS[event.type])}>
                            {BUS_EVENT_TYPE_LABELS[event.type]}
                          </Badge>
                          <Badge className={cn('text-[10px] h-4 px-1', BUS_PRIORITY_COLORS[event.priority])}>
                            {BUS_PRIORITY_LABELS[event.priority]}
                          </Badge>
                          {event.jobId && (
                            <span className="text-[10px] font-mono text-muted-foreground">{event.jobId}</span>
                          )}
                          <span className="text-[10px] text-muted-foreground">
                            {new Date(event.timestamp).toLocaleString('en-GB', {
                              day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
                            })}
                          </span>
                          <span className="text-[10px] font-mono text-muted-foreground">{event.sourceId}</span>
                        </div>
                      </div>
                      <Button
                        data-testid={`em-btn-view-${event.id}`}
                        variant="ghost"
                        size="sm"
                        className="shrink-0 h-7 text-xs"
                        onClick={() => handleViewEvent(event)}
                      >
                        View
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Subscriber Panel */}
          <div className="space-y-4">
            <Card className="border-slate-200/60 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Users className="h-4 w-4 text-primary" />
                  Subscribers
                </CardTitle>
                <CardDescription>Active Event Bus subscribers and event counts.</CardDescription>
              </CardHeader>
              <CardContent>
                <div data-testid="em-subscriber-panel" className="space-y-3">
                  {subscribers.map((sub) => (
                    <div
                      key={sub.id}
                      data-testid={`em-subscriber-${sub.id}`}
                      className="p-3 rounded-lg border border-slate-200 bg-slate-50/60"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-medium truncate">{sub.name}</p>
                        <Badge
                          variant={sub.status === 'active' ? 'default' : 'secondary'}
                          className="text-[10px] shrink-0"
                        >
                          {sub.status === 'active' ? 'Active' : 'Inactive'}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{sub.description}</p>
                      <p className="text-xs font-semibold mt-2">
                        {sub.eventCount} events processed
                      </p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Event Detail */}
            {selectedEvent && (
              <Card
                data-testid="em-event-detail"
                className="border-slate-200/60 shadow-sm"
              >
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">Event Detail</CardTitle>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0"
                      onClick={() => setSelectedEvent(null)}
                    >
                      ×
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <div>
                    <p className="text-xs text-muted-foreground">Event ID</p>
                    <p className="font-mono text-xs">{selectedEvent.id}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Title</p>
                    <p className="font-medium">{selectedEvent.title}</p>
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    <Badge data-testid="em-detail-type-badge" className={cn('text-[10px]', BUS_EVENT_TYPE_COLORS[selectedEvent.type])}>
                      {BUS_EVENT_TYPE_LABELS[selectedEvent.type]}
                    </Badge>
                    <Badge data-testid="em-detail-priority-badge" className={cn('text-[10px]', BUS_PRIORITY_COLORS[selectedEvent.priority])}>
                      {BUS_PRIORITY_LABELS[selectedEvent.priority]}
                    </Badge>
                    {selectedEvent.actionRequired && (
                      <Badge data-testid="em-detail-action-required" className="text-[10px] bg-orange-100 text-orange-800">
                        Action Required
                      </Badge>
                    )}
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Description</p>
                    <p className="text-xs">{selectedEvent.description}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <p className="text-muted-foreground">Actor</p>
                      <p>{selectedEvent.actor}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Source</p>
                      <p className="font-mono">{selectedEvent.sourceId}</p>
                    </div>
                    {selectedEvent.jobId && (
                      <div className="col-span-2">
                        <p className="text-muted-foreground">Job</p>
                        <p className="font-mono">{selectedEvent.jobId}</p>
                      </div>
                    )}
                    <div className="col-span-2">
                      <p className="text-muted-foreground">Consumed By</p>
                      <p>{selectedEvent.consumedBy.join(', ') || 'None'}</p>
                    </div>
                  </div>
                  <Button
                    data-testid="em-detail-btn-deep-link"
                    variant="outline"
                    size="sm"
                    className="w-full gap-1"
                    onClick={() => setLocation(BUS_EVENT_ROUTES[selectedEvent.type])}
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                    Go to Source
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}
