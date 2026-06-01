/**
 * NOTIFICATION ENGINE — Phase 6.1
 *
 * Platform-wide notification infrastructure.
 *
 * Doctrine Compliance:
 * - Notifications are INFORMATIONAL ONLY
 * - Notifications NEVER create financial mutations
 * - Notifications NEVER bypass approval workflows
 * - All notification interactions are auditable
 * - No silent state changes
 */

// ──────────────────────────────────────────────────────
// TYPES
// ──────────────────────────────────────────────────────

export type NotificationStatus = 'unread' | 'read' | 'dismissed';

export type NotificationType =
  | 'automation_alert'
  | 'review_required'
  | 'sync_failure'
  | 'governance_action'
  | 'financial_control'
  | 'exception_event';

export type NotificationPriority = 'low' | 'medium' | 'high' | 'critical';

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  createdAt: string;
  status: NotificationStatus;
  priority: NotificationPriority;
  sourceId: string;
  sourceType: string;
  sourceRoute: string;
  assignedTo: string | null;  // null = visible to all authorised users
  jobId: string | null;
  actionRequired: boolean;
}

export interface NotificationSummary {
  total: number;
  unread: number;
  actionRequired: number;
  critical: number;
  dismissed: number;
  byType: Record<NotificationType, number>;
  byPriority: Record<NotificationPriority, number>;
}

export interface NotificationAuditEntry {
  id: string;
  notificationId: string;
  action: 'opened' | 'marked_read' | 'dismissed';
  performedBy: string;
  performedAt: string;
}

// ──────────────────────────────────────────────────────
// LABEL / COLOUR MAPS
// ──────────────────────────────────────────────────────

export const NOTIFICATION_TYPE_LABELS: Record<NotificationType, string> = {
  automation_alert: 'Automation Alert',
  review_required: 'Review Required',
  sync_failure: 'Sync Failure',
  governance_action: 'Governance Action',
  financial_control: 'Financial Control',
  exception_event: 'Exception Event',
};

export const NOTIFICATION_TYPE_COLORS: Record<NotificationType, string> = {
  automation_alert: 'bg-blue-100 text-blue-800',
  review_required: 'bg-yellow-100 text-yellow-800',
  sync_failure: 'bg-red-100 text-red-800',
  governance_action: 'bg-purple-100 text-purple-800',
  financial_control: 'bg-orange-100 text-orange-800',
  exception_event: 'bg-rose-100 text-rose-800',
};

export const NOTIFICATION_PRIORITY_LABELS: Record<NotificationPriority, string> = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
  critical: 'Critical',
};

export const NOTIFICATION_PRIORITY_COLORS: Record<NotificationPriority, string> = {
  low: 'bg-gray-100 text-gray-700',
  medium: 'bg-blue-100 text-blue-700',
  high: 'bg-amber-100 text-amber-800',
  critical: 'bg-red-100 text-red-800',
};

export const NOTIFICATION_STATUS_LABELS: Record<NotificationStatus, string> = {
  unread: 'Unread',
  read: 'Read',
  dismissed: 'Dismissed',
};

export const NOTIFICATION_STATUS_COLORS: Record<NotificationStatus, string> = {
  unread: 'bg-blue-100 text-blue-800',
  read: 'bg-gray-100 text-gray-600',
  dismissed: 'bg-gray-50 text-gray-400',
};

// Route map for deep linking
export const NOTIFICATION_SOURCE_ROUTES: Record<NotificationType, string> = {
  review_required: '/review',
  automation_alert: '/automations',
  governance_action: '/automation-governance',
  sync_failure: '/financial-explorer',
  exception_event: '/exception-resolution-center',
  financial_control: '/exception-resolution-center',
};

// ──────────────────────────────────────────────────────
// SEED DATA
// ──────────────────────────────────────────────────────

export const SEED_NOTIFICATIONS: Notification[] = [
  {
    id: 'notif-001',
    type: 'review_required',
    title: 'Timesheet Awaiting Approval',
    message: 'Worker James Mitchell submitted a timesheet for Job JOB-2026-001 (Westfield Office Cleaning). 8.5 hours logged. Pending review.',
    createdAt: '2026-06-01T08:15:00Z',
    status: 'unread',
    priority: 'high',
    sourceId: 'rev-2026-042',
    sourceType: 'timesheet',
    sourceRoute: '/review',
    assignedTo: null,
    jobId: 'JOB-2026-001',
    actionRequired: true,
  },
  {
    id: 'notif-002',
    type: 'review_required',
    title: 'Expense Report Submitted',
    message: 'Sarah Chen submitted an expense report for £245.00 on Job JOB-2026-003 (City Tower Security). Materials & consumables. Requires approval.',
    createdAt: '2026-06-01T09:22:00Z',
    status: 'unread',
    priority: 'medium',
    sourceId: 'rev-2026-043',
    sourceType: 'expense',
    sourceRoute: '/review',
    assignedTo: 'pm-001',
    jobId: 'JOB-2026-003',
    actionRequired: true,
  },
  {
    id: 'notif-003',
    type: 'automation_alert',
    title: 'Automation Execution Blocked',
    message: 'Automation rule "Weekly Payroll Preparation" (AUTO-2026-002) attempted to execute but was blocked — action requires human approval. No financial mutation occurred.',
    createdAt: '2026-06-01T07:00:00Z',
    status: 'unread',
    priority: 'critical',
    sourceId: 'AUTO-2026-002',
    sourceType: 'automation_rule',
    sourceRoute: '/automations',
    assignedTo: null,
    jobId: null,
    actionRequired: true,
  },
  {
    id: 'notif-004',
    type: 'automation_alert',
    title: 'Automation Rule Disabled',
    message: 'Automation rule "Low Stock Monthly Review" (AUTO-2026-006) has been disabled by the CEO. Scheduled executions will not fire until re-enabled.',
    createdAt: '2026-05-31T16:45:00Z',
    status: 'read',
    priority: 'medium',
    sourceId: 'AUTO-2026-006',
    sourceType: 'automation_rule',
    sourceRoute: '/automations',
    assignedTo: null,
    jobId: null,
    actionRequired: false,
  },
  {
    id: 'notif-005',
    type: 'sync_failure',
    title: 'QuickBooks Sync Failed',
    message: 'Accounting sync to QuickBooks failed for Invoice INV-2026-018. Error: API rate limit exceeded. Retry scheduled in 30 minutes. No financial data was corrupted.',
    createdAt: '2026-06-01T06:30:00Z',
    status: 'unread',
    priority: 'high',
    sourceId: 'INV-2026-018',
    sourceType: 'invoice_sync',
    sourceRoute: '/financial-explorer',
    assignedTo: null,
    jobId: 'JOB-2026-007',
    actionRequired: true,
  },
  {
    id: 'notif-006',
    type: 'sync_failure',
    title: 'Xero Sync — Connection Timeout',
    message: 'Xero synchronisation timed out during payroll export batch PAYROLL-2026-003. 3 records pending retry. Ledger data remains authoritative.',
    createdAt: '2026-05-31T22:14:00Z',
    status: 'read',
    priority: 'high',
    sourceId: 'PAYROLL-2026-003',
    sourceType: 'payroll_sync',
    sourceRoute: '/financial-explorer',
    assignedTo: null,
    jobId: null,
    actionRequired: false,
  },
  {
    id: 'notif-007',
    type: 'governance_action',
    title: 'Automation Flagged for Governance Review',
    message: 'Automation rule "Failed Sync Recovery Sweep" (AUTO-2026-004) has been flagged as Requires Review by the governance engine. High risk classification applied.',
    createdAt: '2026-06-01T05:00:00Z',
    status: 'unread',
    priority: 'high',
    sourceId: 'rule-004',
    sourceType: 'governance_record',
    sourceRoute: '/automation-governance',
    assignedTo: null,
    jobId: null,
    actionRequired: true,
  },
  {
    id: 'notif-008',
    type: 'governance_action',
    title: 'Automation Suspended by CEO',
    message: 'Automation rule "Draft Invoice Weekly Audit" (AUTO-2026-005) has been suspended by CEO action. All scheduled executions halted. Audit record generated.',
    createdAt: '2026-05-31T14:30:00Z',
    status: 'read',
    priority: 'critical',
    sourceId: 'rule-005',
    sourceType: 'governance_record',
    sourceRoute: '/automation-governance',
    assignedTo: null,
    jobId: null,
    actionRequired: false,
  },
  {
    id: 'notif-009',
    type: 'exception_event',
    title: 'Financial Exception — Revenue Discrepancy',
    message: 'Exception EXC-2026-001 detected: Revenue discrepancy of £1,240.00 on Job JOB-2026-005. Assigned to investigation. CEO approval required for resolution.',
    createdAt: '2026-06-01T07:45:00Z',
    status: 'unread',
    priority: 'critical',
    sourceId: 'EXC-2026-001',
    sourceType: 'exception',
    sourceRoute: '/exception-resolution-center',
    assignedTo: null,
    jobId: 'JOB-2026-005',
    actionRequired: true,
  },
  {
    id: 'notif-010',
    type: 'exception_event',
    title: 'Exception Resolved — Cost Override Approved',
    message: 'Exception EXC-2026-002 (labour cost override on JOB-2026-002) has been resolved with CEO approval. Immutable audit record created. Resolution notes: Approved variance.',
    createdAt: '2026-05-31T11:00:00Z',
    status: 'read',
    priority: 'medium',
    sourceId: 'EXC-2026-002',
    sourceType: 'exception',
    sourceRoute: '/exception-resolution-center',
    assignedTo: 'pm-001',
    jobId: 'JOB-2026-002',
    actionRequired: false,
  },
  {
    id: 'notif-011',
    type: 'financial_control',
    title: 'Financial Override Pending Approval',
    message: 'Financial control override request FC-2026-001 submitted by Project Manager. Invoice adjustment of £3,500.00 on JOB-2026-006. CEO approval required.',
    createdAt: '2026-06-01T08:50:00Z',
    status: 'unread',
    priority: 'critical',
    sourceId: 'FC-2026-001',
    sourceType: 'financial_control',
    sourceRoute: '/exception-resolution-center',
    assignedTo: null,
    jobId: 'JOB-2026-006',
    actionRequired: true,
  },
  {
    id: 'notif-012',
    type: 'financial_control',
    title: 'Financial Control Approved',
    message: 'Financial control FC-2026-002 (payroll rate adjustment) was approved by CEO. Audit record created. The approved change will be reflected in the next payroll cycle.',
    createdAt: '2026-05-31T09:15:00Z',
    status: 'dismissed',
    priority: 'medium',
    sourceId: 'FC-2026-002',
    sourceType: 'financial_control',
    sourceRoute: '/exception-resolution-center',
    assignedTo: null,
    jobId: null,
    actionRequired: false,
  },
  {
    id: 'notif-013',
    type: 'automation_alert',
    title: 'Scheduler — Execution Succeeded',
    message: 'Scheduled automation "Daily Review Escalation" (SCH-2026-001) executed successfully at 06:00. 3 overdue review items escalated. No financial mutations occurred.',
    createdAt: '2026-06-01T06:00:00Z',
    status: 'read',
    priority: 'low',
    sourceId: 'SCH-2026-001',
    sourceType: 'schedule_execution',
    sourceRoute: '/automations',
    assignedTo: null,
    jobId: null,
    actionRequired: false,
  },
  {
    id: 'notif-014',
    type: 'review_required',
    title: 'QA Report Requires Review',
    message: 'QA inspection report submitted for Job JOB-2026-004 (Harbour View Maintenance). 2 items flagged as non-compliant. Review and approve or reject.',
    createdAt: '2026-05-31T15:30:00Z',
    status: 'unread',
    priority: 'medium',
    sourceId: 'rev-2026-041',
    sourceType: 'qa_report',
    sourceRoute: '/review',
    assignedTo: 'pm-002',
    jobId: 'JOB-2026-004',
    actionRequired: true,
  },
  {
    id: 'notif-015',
    type: 'exception_event',
    title: 'Reconciliation Discrepancy Detected',
    message: 'Reconciliation engine detected an unmatched record: Invoice INV-2026-015 exists in Ledger but is missing in Xero. Investigation required. No data has been modified.',
    createdAt: '2026-05-31T20:00:00Z',
    status: 'unread',
    priority: 'high',
    sourceId: 'REC-2026-008',
    sourceType: 'reconciliation',
    sourceRoute: '/reconciliation-center',
    assignedTo: null,
    jobId: 'JOB-2026-008',
    actionRequired: true,
  },
];

// In-memory mutable state (mirrors existing engine patterns)
let _notifications: Notification[] = [...SEED_NOTIFICATIONS];
let _auditLog: NotificationAuditEntry[] = [];
let _auditCounter = 1;

// ──────────────────────────────────────────────────────
// AUDIT HELPERS
// ──────────────────────────────────────────────────────

function createAuditEntry(
  notificationId: string,
  action: NotificationAuditEntry['action'],
  performedBy: string,
): NotificationAuditEntry {
  const entry: NotificationAuditEntry = {
    id: `notif-audit-${String(_auditCounter).padStart(3, '0')}`,
    notificationId,
    action,
    performedBy,
    performedAt: new Date().toISOString(),
  };
  _auditCounter++;
  _auditLog = [entry, ..._auditLog];
  return entry;
}

// ──────────────────────────────────────────────────────
// READ FUNCTIONS
// ──────────────────────────────────────────────────────

export function getAllNotifications(): Notification[] {
  return [..._notifications];
}

export function getNotificationById(id: string): Notification | undefined {
  return _notifications.find((n) => n.id === id);
}

export function getUnreadCount(): number {
  return _notifications.filter((n) => n.status === 'unread').length;
}

export function computeNotificationSummary(): NotificationSummary {
  const byType = {
    automation_alert: 0,
    review_required: 0,
    sync_failure: 0,
    governance_action: 0,
    financial_control: 0,
    exception_event: 0,
  } as Record<NotificationType, number>;

  const byPriority = {
    low: 0,
    medium: 0,
    high: 0,
    critical: 0,
  } as Record<NotificationPriority, number>;

  let unread = 0;
  let actionRequired = 0;
  let critical = 0;
  let dismissed = 0;

  for (const n of _notifications) {
    byType[n.type]++;
    byPriority[n.priority]++;
    if (n.status === 'unread') unread++;
    if (n.status === 'dismissed') dismissed++;
    if (n.actionRequired) actionRequired++;
    if (n.priority === 'critical') critical++;
  }

  return {
    total: _notifications.length,
    unread,
    actionRequired,
    critical,
    dismissed,
    byType,
    byPriority,
  };
}

// ──────────────────────────────────────────────────────
// FILTER / SEARCH FUNCTIONS
// ──────────────────────────────────────────────────────

export function filterNotificationsByStatus(
  notifications: Notification[],
  status: NotificationStatus | 'all',
): Notification[] {
  if (status === 'all') return notifications;
  return notifications.filter((n) => n.status === status);
}

export function filterNotificationsByType(
  notifications: Notification[],
  type: NotificationType | 'all',
): Notification[] {
  if (type === 'all') return notifications;
  return notifications.filter((n) => n.type === type);
}

export function filterNotificationsByPriority(
  notifications: Notification[],
  priority: NotificationPriority | 'all',
): Notification[] {
  if (priority === 'all') return notifications;
  return notifications.filter((n) => n.priority === priority);
}

export function searchNotifications(
  notifications: Notification[],
  query: string,
): Notification[] {
  if (!query.trim()) return notifications;
  const q = query.toLowerCase();
  return notifications.filter(
    (n) =>
      n.title.toLowerCase().includes(q) ||
      n.message.toLowerCase().includes(q) ||
      n.sourceId.toLowerCase().includes(q) ||
      (n.jobId && n.jobId.toLowerCase().includes(q)),
  );
}

// PM scoping: only notifications assigned to a specific user or unassigned
export function scopeNotificationsForPM(
  notifications: Notification[],
  pmId: string,
): Notification[] {
  return notifications.filter(
    (n) => n.assignedTo === null || n.assignedTo === pmId,
  );
}

// ──────────────────────────────────────────────────────
// MUTATION FUNCTIONS (informational state only)
// ──────────────────────────────────────────────────────

/**
 * Mark a notification as read.
 * Generates an immutable audit entry.
 * NEVER creates financial mutations.
 */
export function markNotificationRead(
  id: string,
  performedBy: string,
): Notification | null {
  const idx = _notifications.findIndex((n) => n.id === id);
  if (idx === -1) return null;
  if (_notifications[idx].status === 'dismissed') return _notifications[idx];
  _notifications = _notifications.map((n, i) =>
    i === idx ? { ...n, status: 'read' as NotificationStatus } : n,
  );
  createAuditEntry(id, 'marked_read', performedBy);
  return _notifications[idx];
}

/**
 * Dismiss a notification.
 * Generates an immutable audit entry.
 * NEVER creates financial mutations.
 */
export function dismissNotification(
  id: string,
  performedBy: string,
): Notification | null {
  const idx = _notifications.findIndex((n) => n.id === id);
  if (idx === -1) return null;
  _notifications = _notifications.map((n, i) =>
    i === idx ? { ...n, status: 'dismissed' as NotificationStatus } : n,
  );
  createAuditEntry(id, 'dismissed', performedBy);
  return _notifications[idx];
}

/**
 * Record that a notification was opened/viewed.
 * Generates an immutable audit entry.
 */
export function recordNotificationOpened(
  id: string,
  performedBy: string,
): void {
  createAuditEntry(id, 'opened', performedBy);
  // Also mark as read when opened
  const idx = _notifications.findIndex((n) => n.id === id);
  if (idx !== -1 && _notifications[idx].status === 'unread') {
    _notifications = _notifications.map((n, i) =>
      i === idx ? { ...n, status: 'read' as NotificationStatus } : n,
    );
  }
}

export function getNotificationAuditLog(): NotificationAuditEntry[] {
  return [..._auditLog];
}

// Reset for testing
export function _resetNotificationState(): void {
  _notifications = [...SEED_NOTIFICATIONS];
  _auditLog = [];
  _auditCounter = 1;
}
