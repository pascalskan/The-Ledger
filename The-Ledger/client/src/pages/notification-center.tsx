/**
 * NOTIFICATION CENTRE — Phase 6.1
 *
 * Platform-wide notification hub.
 *
 * Access: CEO (full) | PM (scoped to assigned jobs)
 * Access denied: Worker | Client
 *
 * Doctrine:
 * - Notifications are informational only
 * - No financial mutations occur here
 * - All interactions are audited
 * - Deep links navigate to source pages
 *
 * NOTE: All hooks are declared before any conditional returns
 * to comply with the Rules of Hooks.
 */

import { useState, useMemo } from 'react';
import { Layout } from '@/components/layout';
import { PageHeader } from '@/components/page-shell';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Bell,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Search,
  ExternalLink,
  Eye,
  Ban,
  Info,
} from 'lucide-react';
import { useAuth, useStore } from '@/lib/mockData';
import { useLocation } from 'wouter';
import {
  type Notification,
  type NotificationStatus,
  type NotificationType,
  type NotificationPriority,
  getAllNotifications,
  computeNotificationSummary,
  filterNotificationsByStatus,
  filterNotificationsByType,
  filterNotificationsByPriority,
  searchNotifications,
  scopeNotificationsForPM,
  markNotificationRead,
  dismissNotification,
  recordNotificationOpened,
  NOTIFICATION_TYPE_LABELS,
  NOTIFICATION_TYPE_COLORS,
  NOTIFICATION_PRIORITY_LABELS,
  NOTIFICATION_PRIORITY_COLORS,
  NOTIFICATION_STATUS_LABELS,
  NOTIFICATION_STATUS_COLORS,
} from '@/lib/notificationEngine';
import { useToast } from '@/hooks/use-toast';

export default function NotificationCentrePage() {
  const { user } = useAuth();
  const { roles } = useStore();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  // Derive RBAC info — must happen before any early return
  const userRoleNames = (user?.roleIds || [])
    .map((rid: string) => roles.find((r: any) => r.id === rid)?.name)
    .filter(Boolean) as string[];
  const isCEO = userRoleNames.includes('CEO');
  const isPM = userRoleNames.includes('Project Manager');
  const isAllowed = isCEO || isPM;

  // ── All hooks declared unconditionally ──────────────
  const [notifications, setNotifications] = useState<Notification[]>(() => {
    let all = getAllNotifications();
    if (isPM && !isCEO && user?.id) {
      all = scopeNotificationsForPM(all, user.id);
    }
    return all;
  });

  const [statusFilter, setStatusFilter] = useState<NotificationStatus | 'all'>('all');
  const [typeFilter, setTypeFilter] = useState<NotificationType | 'all'>('all');
  const [priorityFilter, setPriorityFilter] = useState<NotificationPriority | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedNotification, setSelectedNotification] = useState<Notification | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const summary = useMemo(() => computeNotificationSummary(), [notifications]);

  const filtered = useMemo(() => {
    let result = [...notifications];
    result = filterNotificationsByStatus(result, statusFilter);
    result = filterNotificationsByType(result, typeFilter);
    result = filterNotificationsByPriority(result, priorityFilter);
    result = searchNotifications(result, searchQuery);
    result.sort((a, b) => {
      if (a.status === 'unread' && b.status !== 'unread') return -1;
      if (a.status !== 'unread' && b.status === 'unread') return 1;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
    return result;
  }, [notifications, statusFilter, typeFilter, priorityFilter, searchQuery]);
  // ────────────────────────────────────────────────────

  // RBAC guard — after all hooks
  if (!isAllowed) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-64">
          <p className="text-muted-foreground">Access denied. CEO or Project Manager role required.</p>
        </div>
      </Layout>
    );
  }

  function refreshNotifications() {
    let all = getAllNotifications();
    if (isPM && !isCEO && user?.id) {
      all = scopeNotificationsForPM(all, user.id);
    }
    setNotifications(all);
  }

  function handleView(notif: Notification) {
    recordNotificationOpened(notif.id, user?.id || 'unknown');
    refreshNotifications();
    setSelectedNotification({ ...notif, status: notif.status === 'unread' ? 'read' : notif.status });
    setDetailOpen(true);
  }

  function handleMarkRead(id: string) {
    markNotificationRead(id, user?.id || 'unknown');
    refreshNotifications();
    toast({ title: 'Notification marked as read', description: 'Audit record created.' });
  }

  function handleDismiss(id: string) {
    dismissNotification(id, user?.id || 'unknown');
    refreshNotifications();
    if (selectedNotification?.id === id) setDetailOpen(false);
    toast({ title: 'Notification dismissed', description: 'Audit record created.' });
  }

  function handleDeepLink(route: string) {
    setDetailOpen(false);
    setLocation(route);
  }

  function formatDate(iso: string) {
    return new Date(iso).toLocaleString('en-GB', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  }

  return (
    <Layout>
      <div data-testid="notification-centre-page" className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <PageHeader
              title="Notification Centre"
              icon={Bell}
              description="Platform-wide operational and governance events — informational only"
            />
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 text-xs text-muted-foreground bg-blue-50 border border-blue-200 px-3 py-1.5 rounded-md">
              <Info className="h-3.5 w-3.5 text-blue-500" />
              <span>Notifications are informational. No financial mutations are triggered here.</span>
            </div>
          </div>
        </div>

        {/* KPI Strip */}
        <div data-testid="notif-kpi-strip" className="grid grid-cols-2 sm:grid-cols-5 gap-4">
          <Card data-testid="notif-kpi-total">
            <CardContent className="pt-4">
              <p className="text-xs text-muted-foreground">Total</p>
              <p className="text-2xl font-bold">{summary.total}</p>
            </CardContent>
          </Card>
          <Card data-testid="notif-kpi-unread" className="border-blue-200">
            <CardContent className="pt-4">
              <p className="text-xs text-muted-foreground">Unread</p>
              <p className="text-2xl font-bold text-blue-600">{summary.unread}</p>
            </CardContent>
          </Card>
          <Card data-testid="notif-kpi-action-required" className="border-amber-200">
            <CardContent className="pt-4">
              <p className="text-xs text-muted-foreground">Action Required</p>
              <p className="text-2xl font-bold text-amber-600">{summary.actionRequired}</p>
            </CardContent>
          </Card>
          <Card data-testid="notif-kpi-critical" className="border-red-200">
            <CardContent className="pt-4">
              <p className="text-xs text-muted-foreground">Critical</p>
              <p className="text-2xl font-bold text-red-600">{summary.critical}</p>
            </CardContent>
          </Card>
          <Card data-testid="notif-kpi-dismissed">
            <CardContent className="pt-4">
              <p className="text-xs text-muted-foreground">Dismissed</p>
              <p className="text-2xl font-bold text-muted-foreground">{summary.dismissed}</p>
            </CardContent>
          </Card>
        </div>

        {/* Filters & Search */}
        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-48">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              data-testid="notif-search"
              placeholder="Search title, message, source ID, job ID…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select
            value={statusFilter}
            onValueChange={(v) => setStatusFilter(v as NotificationStatus | 'all')}
          >
            <SelectTrigger data-testid="notif-filter-status" className="w-36">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="unread">Unread</SelectItem>
              <SelectItem value="read">Read</SelectItem>
              <SelectItem value="dismissed">Dismissed</SelectItem>
            </SelectContent>
          </Select>
          <Select
            value={typeFilter}
            onValueChange={(v) => setTypeFilter(v as NotificationType | 'all')}
          >
            <SelectTrigger data-testid="notif-filter-type" className="w-44">
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="automation_alert">Automation Alert</SelectItem>
              <SelectItem value="review_required">Review Required</SelectItem>
              <SelectItem value="sync_failure">Sync Failure</SelectItem>
              <SelectItem value="governance_action">Governance Action</SelectItem>
              <SelectItem value="financial_control">Financial Control</SelectItem>
              <SelectItem value="exception_event">Exception Event</SelectItem>
            </SelectContent>
          </Select>
          <Select
            value={priorityFilter}
            onValueChange={(v) => setPriorityFilter(v as NotificationPriority | 'all')}
          >
            <SelectTrigger data-testid="notif-filter-priority" className="w-36">
              <SelectValue placeholder="Priority" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Priorities</SelectItem>
              <SelectItem value="low">Low</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="critical">Critical</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Main Notification Table */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">
              Notifications
              <span className="ml-2 text-sm font-normal text-muted-foreground">({filtered.length} shown)</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div data-testid="notif-table" className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Type</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Title</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Priority</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Created</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Action Req.</th>
                    <th className="text-right px-4 py-3 font-medium text-muted-foreground">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
                        No notifications match the current filters.
                      </td>
                    </tr>
                  )}
                  {filtered.map((notif) => (
                    <tr
                      key={notif.id}
                      data-testid={`notif-row-${notif.id}`}
                      className={`border-b transition-colors hover:bg-muted/30 ${notif.status === 'unread' ? 'bg-blue-50/40' : ''}`}
                    >
                      <td className="px-4 py-3">
                        <Badge
                          data-testid={`notif-type-badge-${notif.id}`}
                          className={`text-xs font-normal ${NOTIFICATION_TYPE_COLORS[notif.type]}`}
                          variant="outline"
                        >
                          {NOTIFICATION_TYPE_LABELS[notif.type]}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <span className={notif.status === 'unread' ? 'font-semibold' : ''}>
                          {notif.title}
                        </span>
                        {notif.jobId && (
                          <div className="text-xs text-muted-foreground mt-0.5">{notif.jobId}</div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <Badge
                          data-testid={`notif-priority-${notif.priority}-${notif.id}`}
                          className={`text-xs ${NOTIFICATION_PRIORITY_COLORS[notif.priority]}`}
                          variant="outline"
                        >
                          {NOTIFICATION_PRIORITY_LABELS[notif.priority]}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground text-xs whitespace-nowrap">
                        {formatDate(notif.createdAt)}
                      </td>
                      <td className="px-4 py-3">
                        <Badge
                          data-testid={`notif-status-badge-${notif.id}`}
                          className={`text-xs ${NOTIFICATION_STATUS_COLORS[notif.status]}`}
                          variant="outline"
                        >
                          {NOTIFICATION_STATUS_LABELS[notif.status]}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        {notif.actionRequired ? (
                          <span
                            data-testid={`notif-action-required-${notif.id}`}
                            className="flex items-center gap-1 text-amber-600 text-xs font-medium"
                          >
                            <AlertTriangle className="h-3.5 w-3.5" /> Yes
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            data-testid={`notif-btn-view-${notif.id}`}
                            size="sm"
                            variant="ghost"
                            onClick={() => handleView(notif)}
                            title="View details"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          {notif.status !== 'read' && notif.status !== 'dismissed' && (
                            <Button
                              data-testid={`notif-btn-mark-read-${notif.id}`}
                              size="sm"
                              variant="ghost"
                              onClick={() => handleMarkRead(notif.id)}
                              title="Mark as read"
                            >
                              <CheckCircle className="h-4 w-4" />
                            </Button>
                          )}
                          {notif.status !== 'dismissed' && (
                            <Button
                              data-testid={`notif-btn-dismiss-${notif.id}`}
                              size="sm"
                              variant="ghost"
                              onClick={() => handleDismiss(notif.id)}
                              title="Dismiss"
                            >
                              <XCircle className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Notification Detail Dialog */}
        <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
          <DialogContent
            data-testid="notif-detail-dialog"
            className="max-w-xl"
          >
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                Notification Detail
              </DialogTitle>
            </DialogHeader>
            {selectedNotification && (
              <div className="space-y-4">
                {/* Type + Priority + Status */}
                <div className="flex flex-wrap gap-2">
                  <Badge
                    data-testid="notif-detail-type-badge"
                    className={`${NOTIFICATION_TYPE_COLORS[selectedNotification.type]}`}
                    variant="outline"
                  >
                    {NOTIFICATION_TYPE_LABELS[selectedNotification.type]}
                  </Badge>
                  <Badge
                    data-testid="notif-detail-priority-badge"
                    className={`${NOTIFICATION_PRIORITY_COLORS[selectedNotification.priority]}`}
                    variant="outline"
                  >
                    {NOTIFICATION_PRIORITY_LABELS[selectedNotification.priority]}
                  </Badge>
                  <Badge
                    data-testid="notif-detail-status-badge"
                    className={`${NOTIFICATION_STATUS_COLORS[selectedNotification.status]}`}
                    variant="outline"
                  >
                    {NOTIFICATION_STATUS_LABELS[selectedNotification.status]}
                  </Badge>
                  {selectedNotification.actionRequired && (
                    <Badge
                      data-testid="notif-detail-action-required-badge"
                      className="bg-amber-100 text-amber-800"
                      variant="outline"
                    >
                      <AlertTriangle className="h-3 w-3 mr-1" /> Action Required
                    </Badge>
                  )}
                </div>

                {/* Title */}
                <div>
                  <p className="text-xs text-muted-foreground">Title</p>
                  <p className="font-semibold">{selectedNotification.title}</p>
                </div>

                {/* Message */}
                <div>
                  <p className="text-xs text-muted-foreground">Message</p>
                  <p className="text-sm text-foreground leading-relaxed">
                    {selectedNotification.message}
                  </p>
                </div>

                {/* Source Information */}
                <div className="bg-muted/40 rounded-md p-3 space-y-2">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Source</p>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <p className="text-xs text-muted-foreground">Source ID</p>
                      <p className="font-mono text-xs">{selectedNotification.sourceId}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Source Type</p>
                      <p className="text-xs">{selectedNotification.sourceType}</p>
                    </div>
                    {selectedNotification.jobId && (
                      <div>
                        <p className="text-xs text-muted-foreground">Job ID</p>
                        <p className="font-mono text-xs">{selectedNotification.jobId}</p>
                      </div>
                    )}
                    <div>
                      <p className="text-xs text-muted-foreground">Created</p>
                      <p className="text-xs">{formatDate(selectedNotification.createdAt)}</p>
                    </div>
                  </div>
                </div>

                {/* Doctrine Notice */}
                <div
                  data-testid="notif-detail-doctrine-notice"
                  className="flex items-start gap-2 bg-blue-50 border border-blue-200 rounded-md p-3"
                >
                  <Info className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
                  <p className="text-xs text-blue-700">
                    This notification is informational only. No financial data is modified by viewing or dismissing notifications.
                    All interactions are recorded in the immutable audit trail.
                  </p>
                </div>

                {/* Actions */}
                <div className="flex flex-wrap gap-2 pt-2">
                  <Button
                    data-testid="notif-detail-btn-deep-link"
                    variant="default"
                    size="sm"
                    onClick={() => handleDeepLink(selectedNotification.sourceRoute)}
                    className="gap-1"
                  >
                    <ExternalLink className="h-4 w-4" />
                    Go to Source
                  </Button>
                  {selectedNotification.status !== 'dismissed' && (
                    <Button
                      data-testid="notif-detail-btn-dismiss"
                      variant="outline"
                      size="sm"
                      onClick={() => handleDismiss(selectedNotification.id)}
                      className="gap-1"
                    >
                      <Ban className="h-4 w-4" />
                      Dismiss
                    </Button>
                  )}
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}
