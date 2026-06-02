/**
 * ACTIVITY FEED ENGINE — Phase 6.2 / Updated Phase 6.3
 *
 * Unified operational event stream for The Ledger.
 *
 * Doctrine Compliance:
 * - Activity Feed is INFORMATIONAL ONLY
 * - Activity Feed NEVER creates financial mutations
 * - Activity Feed NEVER bypasses approval workflows
 * - Activity Feed NEVER creates Revenue, Cost, Payroll, Inventory deductions
 * - All events are fully auditable
 * - Job attribution preserved
 * - Deep links preserve source traceability
 * - No silent state changes
 */

// ──────────────────────────────────────────────────────
// TYPES
// ──────────────────────────────────────────────────────

export type ActivityEventType =
  | 'review_event'
  | 'automation_event'
  | 'governance_event'
  | 'scheduler_event'
  | 'notification_event'
  | 'sync_event'
  | 'reconciliation_event'
  | 'exception_event'
  | 'financial_control_event'
  | 'job_event'
  | 'worker_event'
  | 'stock_event'
  | 'asset_event';

export type ActivityEventPriority = 'info' | 'warning' | 'critical';

export interface ActivityEvent {
  id: string;
  type: ActivityEventType;
  title: string;
  description: string;
  createdAt: string;
  priority: ActivityEventPriority;
  sourceId: string;
  sourceType: string;
  sourceRoute: string;
  jobId: string | null;
  assignedTo: string | null;
  actor: string;
  actionRequired: boolean;
}

export interface ActivitySummary {
  total: number;
  critical: number;
  actionRequired: number;
  today: number;
  last7Days: number;
  byType: Record<ActivityEventType, number>;
  byPriority: Record<ActivityEventPriority, number>;
}

export interface ActivityAuditEntry {
  id: string;
  eventId: string;
  action: 'viewed' | 'opened' | 'navigated';
  performedBy: string;
  performedAt: string;
}

// ──────────────────────────────────────────────────────
// LABEL / COLOUR MAPS
// ──────────────────────────────────────────────────────

export const ACTIVITY_EVENT_TYPE_LABELS: Record<ActivityEventType, string> = {
  review_event: 'Review',
  automation_event: 'Automation',
  governance_event: 'Governance',
  scheduler_event: 'Scheduler',
  notification_event: 'Notification',
  sync_event: 'Sync',
  reconciliation_event: 'Reconciliation',
  exception_event: 'Exception',
  financial_control_event: 'Financial Control',
  job_event: 'Job',
  worker_event: 'Worker',
  stock_event: 'Stock',
  asset_event: 'Asset',
};

export const ACTIVITY_EVENT_TYPE_COLORS: Record<ActivityEventType, string> = {
  review_event: 'bg-yellow-100 text-yellow-800',
  automation_event: 'bg-blue-100 text-blue-800',
  governance_event: 'bg-purple-100 text-purple-800',
  scheduler_event: 'bg-indigo-100 text-indigo-800',
  notification_event: 'bg-cyan-100 text-cyan-800',
  sync_event: 'bg-teal-100 text-teal-800',
  reconciliation_event: 'bg-emerald-100 text-emerald-800',
  exception_event: 'bg-rose-100 text-rose-800',
  financial_control_event: 'bg-orange-100 text-orange-800',
  job_event: 'bg-green-100 text-green-800',
  worker_event: 'bg-sky-100 text-sky-800',
  stock_event: 'bg-amber-100 text-amber-800',
  asset_event: 'bg-lime-100 text-lime-800',
};

export const ACTIVITY_PRIORITY_LABELS: Record<ActivityEventPriority, string> = {
  info: 'Info',
  warning: 'Warning',
  critical: 'Critical',
};

export const ACTIVITY_PRIORITY_COLORS: Record<ActivityEventPriority, string> = {
  info: 'bg-gray-100 text-gray-700',
  warning: 'bg-amber-100 text-amber-800',
  critical: 'bg-red-100 text-red-800',
};

// Deep-link route map by event type
export const ACTIVITY_EVENT_ROUTES: Record<ActivityEventType, string> = {
  review_event: '/review',
  automation_event: '/automations',
  governance_event: '/automation-governance',
  scheduler_event: '/automations',
  notification_event: '/notifications',
  sync_event: '/financial-explorer',
  reconciliation_event: '/reconciliation-center',
  exception_event: '/exception-resolution-center',
  financial_control_event: '/exception-resolution-center',
  job_event: '/jobs',
  worker_event: '/workers',
  stock_event: '/stock',
  asset_event: '/assets',
};

// ──────────────────────────────────────────────────────
// SEED DATA
// ──────────────────────────────────────────────────────

const NOW = new Date('2026-06-02T10:00:00Z');
function daysAgo(d: number): string {
  const t = new Date(NOW);
  t.setDate(t.getDate() - d);
  return t.toISOString();
}
function hoursAgo(h: number): string {
  const t = new Date(NOW);
  t.setHours(t.getHours() - h);
  return t.toISOString();
}

export const SEED_ACTIVITY_EVENTS: ActivityEvent[] = [
  // REVIEW EVENTS
  {
    id: 'act-001',
    type: 'review_event',
    title: 'Timesheet Approved',
    description: 'Timesheet for James Mitchell (Job JOB-2026-001, Westfield Office Cleaning) approved. 8.5 hours normalised and queued for payroll.',
    createdAt: hoursAgo(1),
    priority: 'info',
    sourceId: 'rev-2026-042',
    sourceType: 'timesheet',
    sourceRoute: '/review',
    jobId: 'JOB-2026-001',
    assignedTo: null,
    actor: 'CEO',
    actionRequired: false,
  },
  {
    id: 'act-002',
    type: 'review_event',
    title: 'Expense Rejected',
    description: 'Expense report from Sarah Chen (Job JOB-2026-003, City Tower Security) rejected. Reason: insufficient receipt documentation.',
    createdAt: hoursAgo(2),
    priority: 'warning',
    sourceId: 'rev-2026-043',
    sourceType: 'expense',
    sourceRoute: '/review',
    jobId: 'JOB-2026-003',
    assignedTo: 'pm-001',
    actor: 'CEO',
    actionRequired: false,
  },
  {
    id: 'act-003',
    type: 'review_event',
    title: 'QA Report Awaiting Review',
    description: 'QA inspection report submitted for Job JOB-2026-004 (Harbour View Maintenance). 2 non-compliant items flagged. Review required.',
    createdAt: hoursAgo(3),
    priority: 'warning',
    sourceId: 'rev-2026-041',
    sourceType: 'qa_report',
    sourceRoute: '/review',
    jobId: 'JOB-2026-004',
    assignedTo: 'pm-002',
    actor: 'System',
    actionRequired: true,
  },
  // AUTOMATION EVENTS
  {
    id: 'act-004',
    type: 'automation_event',
    title: 'Automation Rule Executed',
    description: 'Automation rule "Daily Review Escalation" (AUTO-2026-001) executed successfully. 3 overdue review items escalated. No financial mutations occurred.',
    createdAt: hoursAgo(4),
    priority: 'info',
    sourceId: 'AUTO-2026-001',
    sourceType: 'automation_rule',
    sourceRoute: '/automations',
    jobId: null,
    assignedTo: null,
    actor: 'Automation Engine',
    actionRequired: false,
  },
  {
    id: 'act-005',
    type: 'automation_event',
    title: 'Automation Execution Blocked',
    description: 'Automation rule "Weekly Payroll Preparation" (AUTO-2026-002) blocked — action requires human approval. No financial mutation occurred.',
    createdAt: hoursAgo(5),
    priority: 'critical',
    sourceId: 'AUTO-2026-002',
    sourceType: 'automation_rule',
    sourceRoute: '/automations',
    jobId: null,
    assignedTo: null,
    actor: 'Automation Engine',
    actionRequired: true,
  },
  // GOVERNANCE EVENTS
  {
    id: 'act-006',
    type: 'governance_event',
    title: 'Automation Flagged for Governance Review',
    description: 'Automation rule "Failed Sync Recovery Sweep" (AUTO-2026-004) flagged as Requires Review. High risk classification applied by governance engine.',
    createdAt: hoursAgo(6),
    priority: 'warning',
    sourceId: 'rule-004',
    sourceType: 'governance_record',
    sourceRoute: '/automation-governance',
    jobId: null,
    assignedTo: null,
    actor: 'Governance Engine',
    actionRequired: true,
  },
  {
    id: 'act-007',
    type: 'governance_event',
    title: 'Automation Suspended by CEO',
    description: 'Automation rule "Draft Invoice Weekly Audit" (AUTO-2026-005) suspended by CEO action. All scheduled executions halted. Immutable audit record generated.',
    createdAt: daysAgo(1),
    priority: 'critical',
    sourceId: 'rule-005',
    sourceType: 'governance_record',
    sourceRoute: '/automation-governance',
    jobId: null,
    assignedTo: null,
    actor: 'CEO',
    actionRequired: false,
  },
  // SCHEDULER EVENTS
  {
    id: 'act-008',
    type: 'scheduler_event',
    title: 'Scheduled Job Executed',
    description: 'Scheduled automation "Daily Review Escalation" (SCH-2026-001) ran at 06:00. Execution successful. Next run: tomorrow 06:00.',
    createdAt: hoursAgo(8),
    priority: 'info',
    sourceId: 'SCH-2026-001',
    sourceType: 'schedule_execution',
    sourceRoute: '/automations',
    jobId: null,
    assignedTo: null,
    actor: 'Scheduler Engine',
    actionRequired: false,
  },
  {
    id: 'act-009',
    type: 'scheduler_event',
    title: 'Schedule Paused',
    description: 'Schedule "Monthly Stock Audit" (SCH-2026-004) paused by CEO. No further executions until resumed. Pause audit record created.',
    createdAt: daysAgo(1),
    priority: 'warning',
    sourceId: 'SCH-2026-004',
    sourceType: 'schedule',
    sourceRoute: '/automations',
    jobId: null,
    assignedTo: null,
    actor: 'CEO',
    actionRequired: false,
  },
  // SYNC EVENTS
  {
    id: 'act-010',
    type: 'sync_event',
    title: 'QuickBooks Sync Failed',
    description: 'Accounting sync to QuickBooks failed for Invoice INV-2026-018. Error: API rate limit exceeded. Retry scheduled. No financial data was corrupted.',
    createdAt: hoursAgo(4),
    priority: 'critical',
    sourceId: 'INV-2026-018',
    sourceType: 'invoice_sync',
    sourceRoute: '/financial-explorer',
    jobId: 'JOB-2026-007',
    assignedTo: null,
    actor: 'Sync Engine',
    actionRequired: true,
  },
  {
    id: 'act-011',
    type: 'sync_event',
    title: 'Xero Sync Completed',
    description: 'Xero synchronisation completed successfully for payroll batch PAYROLL-2026-004. 12 records synced. Ledger remains source of operational truth.',
    createdAt: daysAgo(1),
    priority: 'info',
    sourceId: 'PAYROLL-2026-004',
    sourceType: 'payroll_sync',
    sourceRoute: '/financial-explorer',
    jobId: null,
    assignedTo: null,
    actor: 'Sync Engine',
    actionRequired: false,
  },
  // RECONCILIATION EVENTS
  {
    id: 'act-012',
    type: 'reconciliation_event',
    title: 'Reconciliation Discrepancy Detected',
    description: 'Invoice INV-2026-015 exists in Ledger but is missing in Xero. Reconciliation engine flagged as Missing in Accounting. No data modified.',
    createdAt: daysAgo(1),
    priority: 'warning',
    sourceId: 'REC-2026-008',
    sourceType: 'reconciliation',
    sourceRoute: '/reconciliation-center',
    jobId: 'JOB-2026-008',
    assignedTo: null,
    actor: 'Reconciliation Engine',
    actionRequired: true,
  },
  {
    id: 'act-013',
    type: 'reconciliation_event',
    title: 'Reconciliation Match Confirmed',
    description: 'Invoice INV-2026-012 matched successfully between Ledger and QuickBooks. Reconciliation status updated to Matched.',
    createdAt: daysAgo(2),
    priority: 'info',
    sourceId: 'REC-2026-007',
    sourceType: 'reconciliation',
    sourceRoute: '/reconciliation-center',
    jobId: 'JOB-2026-006',
    assignedTo: null,
    actor: 'Reconciliation Engine',
    actionRequired: false,
  },
  // EXCEPTION EVENTS
  {
    id: 'act-014',
    type: 'exception_event',
    title: 'Financial Exception Detected',
    description: 'Revenue discrepancy of £1,240.00 detected on Job JOB-2026-005. Exception EXC-2026-001 raised. CEO approval required for resolution.',
    createdAt: hoursAgo(3),
    priority: 'critical',
    sourceId: 'EXC-2026-001',
    sourceType: 'exception',
    sourceRoute: '/exception-resolution-center',
    jobId: 'JOB-2026-005',
    assignedTo: null,
    actor: 'Exception Engine',
    actionRequired: true,
  },
  {
    id: 'act-015',
    type: 'exception_event',
    title: 'Exception Resolved',
    description: 'Exception EXC-2026-002 (labour cost override on JOB-2026-002) resolved with CEO approval. Immutable audit record created.',
    createdAt: daysAgo(1),
    priority: 'info',
    sourceId: 'EXC-2026-002',
    sourceType: 'exception',
    sourceRoute: '/exception-resolution-center',
    jobId: 'JOB-2026-002',
    assignedTo: 'pm-001',
    actor: 'CEO',
    actionRequired: false,
  },
  // FINANCIAL CONTROL EVENTS
  {
    id: 'act-016',
    type: 'financial_control_event',
    title: 'Financial Override Pending Approval',
    description: 'Financial control override FC-2026-001 submitted. Invoice adjustment of £3,500.00 on JOB-2026-006. CEO approval required.',
    createdAt: hoursAgo(2),
    priority: 'critical',
    sourceId: 'FC-2026-001',
    sourceType: 'financial_control',
    sourceRoute: '/exception-resolution-center',
    jobId: 'JOB-2026-006',
    assignedTo: null,
    actor: 'Project Manager',
    actionRequired: true,
  },
  {
    id: 'act-017',
    type: 'financial_control_event',
    title: 'Financial Control Approved',
    description: 'Financial control FC-2026-002 (payroll rate adjustment) approved by CEO. Audit record created. Change reflected in next payroll cycle.',
    createdAt: daysAgo(2),
    priority: 'info',
    sourceId: 'FC-2026-002',
    sourceType: 'financial_control',
    sourceRoute: '/exception-resolution-center',
    jobId: null,
    assignedTo: null,
    actor: 'CEO',
    actionRequired: false,
  },
  // JOB EVENTS
  {
    id: 'act-018',
    type: 'job_event',
    title: 'Job Status Changed to Active',
    description: 'Job JOB-2026-009 (Riverside Complex Maintenance) status changed from Planned to Active. Workers assigned and schedule confirmed.',
    createdAt: hoursAgo(5),
    priority: 'info',
    sourceId: 'JOB-2026-009',
    sourceType: 'job',
    sourceRoute: '/jobs',
    jobId: 'JOB-2026-009',
    assignedTo: null,
    actor: 'CEO',
    actionRequired: false,
  },
  {
    id: 'act-019',
    type: 'job_event',
    title: 'Job Completion Flagged',
    description: 'Job JOB-2026-001 (Westfield Office Cleaning) flagged as complete pending final review and invoice generation.',
    createdAt: daysAgo(1),
    priority: 'warning',
    sourceId: 'JOB-2026-001',
    sourceType: 'job',
    sourceRoute: '/jobs',
    jobId: 'JOB-2026-001',
    assignedTo: 'pm-001',
    actor: 'Project Manager',
    actionRequired: true,
  },
  // WORKER EVENTS
  {
    id: 'act-020',
    type: 'worker_event',
    title: 'Worker Shift Started',
    description: 'Worker Tom Bradley started shift on Job JOB-2026-003 (City Tower Security) at 07:30. Shift timer active.',
    createdAt: hoursAgo(3),
    priority: 'info',
    sourceId: 'WRK-2026-003',
    sourceType: 'shift',
    sourceRoute: '/workers',
    jobId: 'JOB-2026-003',
    assignedTo: null,
    actor: 'Worker',
    actionRequired: false,
  },
  {
    id: 'act-021',
    type: 'worker_event',
    title: 'Worker Compliance Check Failed',
    description: 'Worker Lisa Park compliance check flagged — certifications expired. Cannot be assigned to new jobs until resolved.',
    createdAt: daysAgo(2),
    priority: 'warning',
    sourceId: 'WRK-2026-007',
    sourceType: 'worker_compliance',
    sourceRoute: '/workers',
    jobId: null,
    assignedTo: null,
    actor: 'Compliance Engine',
    actionRequired: true,
  },
  // STOCK EVENTS
  {
    id: 'act-022',
    type: 'stock_event',
    title: 'Low Stock Alert',
    description: 'Stock item SKU-2026-041 (Cleaning Grade Disinfectant 5L) below reorder threshold. Current: 3 units. Reorder point: 10 units.',
    createdAt: daysAgo(1),
    priority: 'warning',
    sourceId: 'SKU-2026-041',
    sourceType: 'stock_item',
    sourceRoute: '/stock',
    jobId: null,
    assignedTo: null,
    actor: 'Stock Engine',
    actionRequired: true,
  },
  // ASSET EVENTS
  {
    id: 'act-023',
    type: 'asset_event',
    title: 'Asset Maintenance Due',
    description: 'Asset AST-2026-012 (Industrial Floor Buffer) scheduled maintenance overdue by 3 days. Asset flagged for service before next deployment.',
    createdAt: daysAgo(3),
    priority: 'warning',
    sourceId: 'AST-2026-012',
    sourceType: 'asset',
    sourceRoute: '/assets',
    jobId: null,
    assignedTo: null,
    actor: 'Asset Engine',
    actionRequired: true,
  },
  {
    id: 'act-024',
    type: 'asset_event',
    title: 'Asset Deployed to Job',
    description: 'Asset AST-2026-008 (High-Reach Cleaning Platform) deployed to Job JOB-2026-009 (Riverside Complex Maintenance).',
    createdAt: hoursAgo(5),
    priority: 'info',
    sourceId: 'AST-2026-008',
    sourceType: 'asset',
    sourceRoute: '/assets',
    jobId: 'JOB-2026-009',
    assignedTo: null,
    actor: 'CEO',
    actionRequired: false,
  },
  {
    id: 'act-025',
    type: 'notification_event',
    title: 'Notification Centre: Critical Alert Issued',
    description: 'Critical notification NOTIF-003 (Automation Execution Blocked) issued to CEO. Acknowledged and action pending.',
    createdAt: hoursAgo(6),
    priority: 'info',
    sourceId: 'notif-003',
    sourceType: 'notification',
    sourceRoute: '/notifications',
    jobId: null,
    assignedTo: null,
    actor: 'Notification Engine',
    actionRequired: false,
  },
];

// In-memory mutable state
let _events: ActivityEvent[] = [...SEED_ACTIVITY_EVENTS];
let _auditLog: ActivityAuditEntry[] = [];
let _auditCounter = 1;

// ──────────────────────────────────────────────────────
// AUDIT HELPERS
// ──────────────────────────────────────────────────────

function createAuditEntry(
  eventId: string,
  action: ActivityAuditEntry['action'],
  performedBy: string,
): ActivityAuditEntry {
  const entry: ActivityAuditEntry = {
    id: `act-audit-${String(_auditCounter).padStart(3, '0')}`,
    eventId,
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

export function getAllEvents(): ActivityEvent[] {
  return [..._events].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
}

export function getEventById(id: string): ActivityEvent | undefined {
  return _events.find((e) => e.id === id);
}

export function getRecentEvents(limit = 10): ActivityEvent[] {
  return getAllEvents().slice(0, limit);
}

export function getActionRequiredEvents(): ActivityEvent[] {
  return getAllEvents().filter((e) => e.actionRequired);
}

export function computeActivitySummary(): ActivitySummary {
  const byType = {} as Record<ActivityEventType, number>;
  const byPriority = {} as Record<ActivityEventPriority, number>;

  const types: ActivityEventType[] = [
    'review_event', 'automation_event', 'governance_event', 'scheduler_event',
    'notification_event', 'sync_event', 'reconciliation_event', 'exception_event',
    'financial_control_event', 'job_event', 'worker_event', 'stock_event', 'asset_event',
  ];
  for (const t of types) byType[t] = 0;

  const priorities: ActivityEventPriority[] = ['info', 'warning', 'critical'];
  for (const p of priorities) byPriority[p] = 0;

  const todayStr = new Date().toISOString().slice(0, 10);
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  let critical = 0;
  let actionRequired = 0;
  let today = 0;
  let last7Days = 0;

  for (const e of _events) {
    byType[e.type]++;
    byPriority[e.priority]++;
    if (e.priority === 'critical') critical++;
    if (e.actionRequired) actionRequired++;
    const eventDate = e.createdAt.slice(0, 10);
    if (eventDate === todayStr) today++;
    if (new Date(e.createdAt) >= sevenDaysAgo) last7Days++;
  }

  return {
    total: _events.length,
    critical,
    actionRequired,
    today,
    last7Days,
    byType,
    byPriority,
  };
}

// ──────────────────────────────────────────────────────
// FILTER / SEARCH FUNCTIONS
// ──────────────────────────────────────────────────────

export function filterEventsByType(
  events: ActivityEvent[],
  type: ActivityEventType | 'all',
): ActivityEvent[] {
  if (type === 'all') return events;
  return events.filter((e) => e.type === type);
}

export function filterEventsByPriority(
  events: ActivityEvent[],
  priority: ActivityEventPriority | 'all',
): ActivityEvent[] {
  if (priority === 'all') return events;
  return events.filter((e) => e.priority === priority);
}

export function searchEvents(
  events: ActivityEvent[],
  query: string,
): ActivityEvent[] {
  if (!query.trim()) return events;
  const q = query.toLowerCase();
  return events.filter(
    (e) =>
      e.title.toLowerCase().includes(q) ||
      e.description.toLowerCase().includes(q) ||
      (e.jobId && e.jobId.toLowerCase().includes(q)) ||
      e.sourceId.toLowerCase().includes(q),
  );
}

// ──────────────────────────────────────────────────────
// WRITE FUNCTIONS (Phase 6.3 — Event Bus integration)
// ──────────────────────────────────────────────────────

/**
 * Add an event from the Event Bus into the Activity Feed.
 * Called by the Activity Feed Subscriber in eventBusEngine.ts.
 * Doctrine: informational only — no financial mutations.
 */
export function addActivityEvent(event: ActivityEvent): void {
  // Avoid duplicates (idempotent)
  if (_events.find((e) => e.id === event.id)) return;
  _events = [event, ..._events];
}

// ──────────────────────────────────────────────────────
// AUDIT FUNCTIONS (informational tracing only)
// ──────────────────────────────────────────────────────

export function recordEventViewed(id: string, performedBy: string): void {
  createAuditEntry(id, 'viewed', performedBy);
}

export function recordEventOpened(id: string, performedBy: string): void {
  createAuditEntry(id, 'opened', performedBy);
}

export function recordEventNavigated(id: string, performedBy: string): void {
  createAuditEntry(id, 'navigated', performedBy);
}

export function getActivityAuditLog(): ActivityAuditEntry[] {
  return [..._auditLog];
}

// Reset for testing
export function _resetActivityFeedState(): void {
  _events = [...SEED_ACTIVITY_EVENTS];
  _auditLog = [];
  _auditCounter = 1;
}
