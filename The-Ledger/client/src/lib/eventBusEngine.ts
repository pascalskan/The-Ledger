/**
 * EVENT BUS ENGINE — Phase 6.3
 *
 * Unified event-driven operational pipeline for The Ledger.
 *
 * Doctrine Compliance:
 * - Event Bus is INFORMATIONAL / EVALUATIVE only
 * - Event Bus NEVER approves submissions
 * - Event Bus NEVER creates approved financial records
 * - Event Bus NEVER bypasses Review Centre
 * - Event Bus NEVER bypasses Approval Doctrine
 * - All event processing is fully auditable
 * - Job attribution preserved on all records
 * - No silent processing
 * - Accounting systems remain downstream consumers only
 */

import { addActivityEvent } from './activityFeedEngine';
import {
  getAllNotifications,
  type Notification,
  type NotificationType,
  type NotificationPriority,
} from './notificationEngine';

// ──────────────────────────────────────────────────────
// TYPES — reuse ActivityEventType vocabulary
// ──────────────────────────────────────────────────────

export type BusEventCategory =
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

export type BusEventPriority = 'info' | 'warning' | 'critical';

export interface BusEvent {
  id: string;
  type: BusEventCategory;
  title: string;
  description: string;
  timestamp: string;
  priority: BusEventPriority;
  sourceId: string;
  sourceType: string;
  sourceRoute: string;
  jobId: string | null;
  actor: string;
  actionRequired: boolean;
}

export interface BusEventRecord extends BusEvent {
  consumedBy: string[];
  auditEntries: BusAuditEntry[];
}

export interface BusAuditEntry {
  id: string;
  eventId: string;
  action: 'published' | 'consumed' | 'subscriber_triggered' | 'viewed';
  subscriberName: string | null;
  performedAt: string;
}

export interface BusSubscriber {
  id: string;
  name: string;
  description: string;
  status: 'active' | 'inactive';
  eventCount: number;
  interestedTypes: BusEventCategory[] | 'all';
}

export interface EventBusSummary {
  total: number;
  today: number;
  critical: number;
  subscriberCount: number;
  activeEventTypes: number;
}

// ──────────────────────────────────────────────────────
// LABEL / COLOUR MAPS
// ──────────────────────────────────────────────────────

export const BUS_EVENT_TYPE_LABELS: Record<BusEventCategory, string> = {
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

export const BUS_EVENT_TYPE_COLORS: Record<BusEventCategory, string> = {
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

export const BUS_PRIORITY_LABELS: Record<BusEventPriority, string> = {
  info: 'Info',
  warning: 'Warning',
  critical: 'Critical',
};

export const BUS_PRIORITY_COLORS: Record<BusEventPriority, string> = {
  info: 'bg-gray-100 text-gray-700',
  warning: 'bg-amber-100 text-amber-800',
  critical: 'bg-red-100 text-red-800',
};

export const BUS_EVENT_ROUTES: Record<BusEventCategory, string> = {
  review_event: '/review',
  automation_event: '/automations',
  governance_event: '/automation-governance',
  scheduler_event: '/automations',
  notification_event: '/intelligence?tab=activity', // UX-5 S-8: CEO notification consumption lives in the hub
  sync_event: '/finance?tab=records',
  reconciliation_event: '/finance?tab=accounting&sub=reconciliation',
  exception_event: '/finance?tab=accounting&sub=exceptions',
  financial_control_event: '/finance?tab=accounting&sub=exceptions',
  job_event: '/jobs',
  worker_event: '/workers',
  stock_event: '/stock',
  asset_event: '/assets',
};

// ──────────────────────────────────────────────────────
// IN-MEMORY STATE
// ──────────────────────────────────────────────────────

let _eventHistory: BusEventRecord[] = [];
let _auditLog: BusAuditEntry[] = [];
let _auditCounter = 1;
let _eventCounter = 1;

/**
 * Guard flag: when true, the Activity Feed subscriber dispatch is suppressed.
 * Used during _seedHistory() to prevent the 20 bus seed events from being
 * injected into activityFeedEngine on top of its own 25 seed events.
 * Live publishEvent() calls always run with this false.
 */
let _suppressActivityFeedDispatch = false;

// ──────────────────────────────────────────────────────
// SUBSCRIBERS REGISTRY
// ──────────────────────────────────────────────────────

const _subscribers: Map<string, BusSubscriber> = new Map([
  [
    'activity-feed',
    {
      id: 'activity-feed',
      name: 'Activity Feed Subscriber',
      description: 'Receives all events and updates the Activity Feed stream.',
      status: 'active',
      eventCount: 0,
      interestedTypes: 'all',
    },
  ],
  [
    'notification',
    {
      id: 'notification',
      name: 'Notification Subscriber',
      description: 'Receives warning and critical events and generates notifications where applicable.',
      status: 'active',
      eventCount: 0,
      interestedTypes: [
        'review_event',
        'sync_event',
        'governance_event',
        'exception_event',
        'financial_control_event',
        'automation_event',
        'reconciliation_event',
      ],
    },
  ],
  [
    'dashboard',
    {
      id: 'dashboard',
      name: 'Dashboard Subscriber',
      description: 'Receives all events and updates the dashboard Live Activity widget.',
      status: 'active',
      eventCount: 0,
      interestedTypes: 'all',
    },
  ],
  [
    'automation',
    {
      id: 'automation',
      name: 'Automation Subscriber',
      description:
        'Receives events and evaluates automation triggers. No financial mutations. No approval bypass.',
      status: 'active',
      eventCount: 0,
      interestedTypes: [
        'review_event',
        'exception_event',
        'governance_event',
        'job_event',
        'sync_event',
      ],
    },
  ],
]);

// ──────────────────────────────────────────────────────
// AUDIT HELPERS
// ──────────────────────────────────────────────────────

function createAuditEntry(
  eventId: string,
  action: BusAuditEntry['action'],
  subscriberName: string | null = null,
): BusAuditEntry {
  const entry: BusAuditEntry = {
    id: `bus-audit-${String(_auditCounter).padStart(4, '0')}`,
    eventId,
    action,
    subscriberName,
    performedAt: new Date().toISOString(),
  };
  _auditCounter++;
  _auditLog = [entry, ..._auditLog];
  return entry;
}

// ──────────────────────────────────────────────────────
// SUBSCRIBER DISPATCH
// ──────────────────────────────────────────────────────

function dispatchToSubscribers(event: BusEvent): string[] {
  const consumed: string[] = [];

  for (const [id, sub] of _subscribers.entries()) {
    if (sub.status !== 'active') continue;
    const interested =
      sub.interestedTypes === 'all' ||
      (sub.interestedTypes as BusEventCategory[]).includes(event.type);
    if (!interested) continue;

    // Activity Feed Subscriber
    // Suppressed during initial seed to prevent bus seed events from being
    // injected into activityFeedEngine on top of its own 25 seed events.
    if (id === 'activity-feed') {
      if (!_suppressActivityFeedDispatch) {
        try {
          addActivityEvent({
            id: `bus-af-${event.id}`,
            type: event.type,
            title: event.title,
            description: event.description,
            createdAt: event.timestamp,
            priority: event.priority,
            sourceId: event.sourceId,
            sourceType: event.sourceType,
            sourceRoute: event.sourceRoute,
            jobId: event.jobId,
            assignedTo: null,
            actor: event.actor,
            actionRequired: event.actionRequired,
          });
        } catch {
          // guard: addActivityEvent may not exist in all test contexts
        }
      }
    }

    // Notification Subscriber — creates notification for warning/critical events
    if (id === 'notification') {
      if (event.priority === 'warning' || event.priority === 'critical') {
        _createSimulatedNotification(event);
      }
    }

    // Dashboard Subscriber — dashboard reads from getRecentBusEvents() directly

    // Automation Subscriber — read-only trigger evaluation only
    if (id === 'automation') {
      _evaluateAutomationTriggers(event);
    }

    // Update subscriber stats
    const updated = _subscribers.get(id)!;
    updated.eventCount++;
    _subscribers.set(id, updated);

    consumed.push(id);
    createAuditEntry(event.id, 'subscriber_triggered', sub.name);
  }

  return consumed;
}

// ──────────────────────────────────────────────────────
// SIMULATED NOTIFICATION CREATION
// Doctrine: Notification Subscriber is INFORMATIONAL.
// It records the intent; no financial mutation occurs.
// ──────────────────────────────────────────────────────

interface SimulatedNotificationRecord {
  id: string;
  eventId: string;
  title: string;
  message: string;
  priority: string;
  createdAt: string;
  sourceRoute: string;
}

let _simulatedNotifications: SimulatedNotificationRecord[] = [];

function _createSimulatedNotification(event: BusEvent): void {
  _simulatedNotifications = [
    {
      id: `sim-notif-${event.id}`,
      eventId: event.id,
      title: event.title,
      message: event.description,
      priority: event.priority,
      createdAt: event.timestamp,
      sourceRoute: event.sourceRoute,
    },
    ..._simulatedNotifications,
  ];
}

export function getSimulatedNotifications(): SimulatedNotificationRecord[] {
  return [..._simulatedNotifications];
}

// ──────────────────────────────────────────────────────
// AUTOMATION TRIGGER EVALUATION
// Doctrine: Evaluation only — no financial mutations.
// Schedulers/automations remain human-controlled.
// ──────────────────────────────────────────────────────

interface AutomationEvaluationRecord {
  id: string;
  eventId: string;
  eventType: BusEventCategory;
  evaluatedAt: string;
  triggerMatched: boolean;
  note: string;
}

let _automationEvaluations: AutomationEvaluationRecord[] = [];

function _evaluateAutomationTriggers(event: BusEvent): void {
  const matched = event.actionRequired && event.priority !== 'info';
  _automationEvaluations = [
    {
      id: `eval-${event.id}`,
      eventId: event.id,
      eventType: event.type,
      evaluatedAt: new Date().toISOString(),
      triggerMatched: matched,
      note: matched
        ? 'Event matches automation trigger criteria. No action taken — human approval required.'
        : 'Event evaluated. No matching trigger.',
    },
    ..._automationEvaluations,
  ];
}

export function getAutomationEvaluations(): AutomationEvaluationRecord[] {
  return [..._automationEvaluations];
}

// ──────────────────────────────────────────────────────
// SEED DATA — Simulated realistic event flow
// ──────────────────────────────────────────────────────

const SEED_NOW = new Date('2026-06-02T10:00:00Z');
function seedHoursAgo(h: number): string {
  const t = new Date(SEED_NOW);
  t.setHours(t.getHours() - h);
  return t.toISOString();
}
function seedDaysAgo(d: number): string {
  const t = new Date(SEED_NOW);
  t.setDate(t.getDate() - d);
  return t.toISOString();
}

const SEED_BUS_EVENTS: BusEvent[] = [
  {
    id: 'bus-001',
    type: 'review_event',
    title: 'Timesheet Approved — JOB-2026-001',
    description: 'Timesheet for James Mitchell approved. 8.5 hours normalised and queued for payroll.',
    timestamp: seedHoursAgo(1),
    priority: 'info',
    sourceId: 'rev-2026-042',
    sourceType: 'timesheet',
    sourceRoute: '/review',
    jobId: 'JOB-2026-001',
    actor: 'CEO',
    actionRequired: false,
  },
  {
    id: 'bus-002',
    type: 'review_event',
    title: 'Expense Rejected — JOB-2026-003',
    description: 'Expense from Sarah Chen rejected: insufficient receipt documentation.',
    timestamp: seedHoursAgo(2),
    priority: 'warning',
    sourceId: 'rev-2026-043',
    sourceType: 'expense',
    sourceRoute: '/review',
    jobId: 'JOB-2026-003',
    actor: 'CEO',
    actionRequired: false,
  },
  {
    id: 'bus-003',
    type: 'review_event',
    title: 'QA Report Awaiting Review — JOB-2026-004',
    description: 'QA inspection report submitted. 2 non-compliant items flagged. Review required.',
    timestamp: seedHoursAgo(3),
    priority: 'warning',
    sourceId: 'rev-2026-041',
    sourceType: 'qa_report',
    sourceRoute: '/review',
    jobId: 'JOB-2026-004',
    actor: 'System',
    actionRequired: true,
  },
  {
    id: 'bus-004',
    type: 'sync_event',
    title: 'QuickBooks Sync Failed — INV-2026-018',
    description: 'Sync to QuickBooks failed: API rate limit exceeded. Retry scheduled. No financial data corrupted.',
    timestamp: seedHoursAgo(4),
    priority: 'critical',
    sourceId: 'INV-2026-018',
    sourceType: 'invoice_sync',
    sourceRoute: '/finance?tab=records',
    jobId: 'JOB-2026-007',
    actor: 'Sync Engine',
    actionRequired: true,
  },
  {
    id: 'bus-005',
    type: 'automation_event',
    title: 'Automation Execution Blocked',
    description: 'Rule "Weekly Payroll Preparation" blocked — action requires human approval. No financial mutation.',
    timestamp: seedHoursAgo(5),
    priority: 'critical',
    sourceId: 'AUTO-2026-002',
    sourceType: 'automation_rule',
    sourceRoute: '/automations',
    jobId: null,
    actor: 'Automation Engine',
    actionRequired: true,
  },
  {
    id: 'bus-006',
    type: 'governance_event',
    title: 'Automation Flagged — Governance Review Required',
    description: 'Rule "Failed Sync Recovery Sweep" flagged. High risk classification applied.',
    timestamp: seedHoursAgo(6),
    priority: 'warning',
    sourceId: 'rule-004',
    sourceType: 'governance_record',
    sourceRoute: '/automation-governance',
    jobId: null,
    actor: 'Governance Engine',
    actionRequired: true,
  },
  {
    id: 'bus-007',
    type: 'exception_event',
    title: 'Financial Exception Detected — JOB-2026-005',
    description: 'Revenue discrepancy of £1,240.00 detected. Exception EXC-2026-001 raised. CEO approval required.',
    timestamp: seedHoursAgo(3),
    priority: 'critical',
    sourceId: 'EXC-2026-001',
    sourceType: 'exception',
    sourceRoute: '/finance?tab=accounting&sub=exceptions',
    jobId: 'JOB-2026-005',
    actor: 'Exception Engine',
    actionRequired: true,
  },
  {
    id: 'bus-008',
    type: 'financial_control_event',
    title: 'Financial Override Pending Approval',
    description: 'Control FC-2026-001 submitted: invoice adjustment of £3,500.00 on JOB-2026-006. CEO approval required.',
    timestamp: seedHoursAgo(2),
    priority: 'critical',
    sourceId: 'FC-2026-001',
    sourceType: 'financial_control',
    sourceRoute: '/finance?tab=accounting&sub=exceptions',
    jobId: 'JOB-2026-006',
    actor: 'Project Manager',
    actionRequired: true,
  },
  {
    id: 'bus-009',
    type: 'reconciliation_event',
    title: 'Reconciliation Discrepancy — INV-2026-015',
    description: 'Invoice INV-2026-015 missing in Xero. Flagged as Missing in Accounting. No data modified.',
    timestamp: seedDaysAgo(1),
    priority: 'warning',
    sourceId: 'REC-2026-008',
    sourceType: 'reconciliation',
    sourceRoute: '/finance?tab=accounting&sub=reconciliation',
    jobId: 'JOB-2026-008',
    actor: 'Reconciliation Engine',
    actionRequired: true,
  },
  {
    id: 'bus-010',
    type: 'scheduler_event',
    title: 'Scheduled Automation Executed — SCH-2026-001',
    description: '"Daily Review Escalation" ran at 06:00. Execution successful. Next run: tomorrow 06:00.',
    timestamp: seedHoursAgo(8),
    priority: 'info',
    sourceId: 'SCH-2026-001',
    sourceType: 'schedule_execution',
    sourceRoute: '/automations',
    jobId: null,
    actor: 'Scheduler Engine',
    actionRequired: false,
  },
  {
    id: 'bus-011',
    type: 'job_event',
    title: 'Job Status Changed to Active — JOB-2026-009',
    description: 'Job JOB-2026-009 (Riverside Complex Maintenance) changed from Planned to Active.',
    timestamp: seedHoursAgo(5),
    priority: 'info',
    sourceId: 'JOB-2026-009',
    sourceType: 'job',
    sourceRoute: '/jobs',
    jobId: 'JOB-2026-009',
    actor: 'CEO',
    actionRequired: false,
  },
  {
    id: 'bus-012',
    type: 'worker_event',
    title: 'Worker Compliance Check Failed',
    description: 'Worker Lisa Park compliance check flagged — certifications expired. Cannot be assigned until resolved.',
    timestamp: seedDaysAgo(2),
    priority: 'warning',
    sourceId: 'WRK-2026-007',
    sourceType: 'worker_compliance',
    sourceRoute: '/workers',
    jobId: null,
    actor: 'Compliance Engine',
    actionRequired: true,
  },
  {
    id: 'bus-013',
    type: 'stock_event',
    title: 'Low Stock Alert — SKU-2026-041',
    description: 'Stock item Cleaning Grade Disinfectant 5L below reorder threshold. Current: 3 units. Reorder point: 10.',
    timestamp: seedDaysAgo(1),
    priority: 'warning',
    sourceId: 'SKU-2026-041',
    sourceType: 'stock_item',
    sourceRoute: '/stock',
    jobId: null,
    actor: 'Stock Engine',
    actionRequired: true,
  },
  {
    id: 'bus-014',
    type: 'asset_event',
    title: 'Asset Maintenance Overdue — AST-2026-012',
    description: 'Asset Industrial Floor Buffer maintenance overdue by 3 days. Flagged for service before next deployment.',
    timestamp: seedDaysAgo(3),
    priority: 'warning',
    sourceId: 'AST-2026-012',
    sourceType: 'asset',
    sourceRoute: '/assets',
    jobId: null,
    actor: 'Asset Engine',
    actionRequired: true,
  },
  {
    id: 'bus-015',
    type: 'sync_event',
    title: 'Xero Sync Completed — PAYROLL-2026-004',
    description: 'Xero synchronisation completed for payroll batch. 12 records synced. Ledger remains source of truth.',
    timestamp: seedDaysAgo(1),
    priority: 'info',
    sourceId: 'PAYROLL-2026-004',
    sourceType: 'payroll_sync',
    sourceRoute: '/finance?tab=records',
    jobId: null,
    actor: 'Sync Engine',
    actionRequired: false,
  },
  {
    id: 'bus-016',
    type: 'governance_event',
    title: 'Automation Suspended by CEO',
    description: 'Rule "Draft Invoice Weekly Audit" suspended. All scheduled executions halted. Audit record generated.',
    timestamp: seedDaysAgo(1),
    priority: 'critical',
    sourceId: 'rule-005',
    sourceType: 'governance_record',
    sourceRoute: '/automation-governance',
    jobId: null,
    actor: 'CEO',
    actionRequired: false,
  },
  {
    id: 'bus-017',
    type: 'exception_event',
    title: 'Exception Resolved — EXC-2026-002',
    description: 'Exception EXC-2026-002 (labour cost override on JOB-2026-002) resolved with CEO approval.',
    timestamp: seedDaysAgo(1),
    priority: 'info',
    sourceId: 'EXC-2026-002',
    sourceType: 'exception',
    sourceRoute: '/finance?tab=accounting&sub=exceptions',
    jobId: 'JOB-2026-002',
    actor: 'CEO',
    actionRequired: false,
  },
  {
    id: 'bus-018',
    type: 'notification_event',
    title: 'Critical Notification Issued',
    description: 'Critical notification NOTIF-003 (Automation Execution Blocked) issued to CEO.',
    timestamp: seedHoursAgo(6),
    priority: 'info',
    sourceId: 'notif-003',
    sourceType: 'notification',
    sourceRoute: '/notifications',
    jobId: null,
    actor: 'Notification Engine',
    actionRequired: false,
  },
  {
    id: 'bus-019',
    type: 'automation_event',
    title: 'Automation Rule Executed — AUTO-2026-001',
    description: 'Rule "Daily Review Escalation" executed successfully. 3 overdue items escalated. No financial mutations.',
    timestamp: seedHoursAgo(4),
    priority: 'info',
    sourceId: 'AUTO-2026-001',
    sourceType: 'automation_rule',
    sourceRoute: '/automations',
    jobId: null,
    actor: 'Automation Engine',
    actionRequired: false,
  },
  {
    id: 'bus-020',
    type: 'job_event',
    title: 'Job Completion Flagged — JOB-2026-001',
    description: 'Job JOB-2026-001 (Westfield Office Cleaning) flagged complete pending final review and invoice generation.',
    timestamp: seedDaysAgo(1),
    priority: 'warning',
    sourceId: 'JOB-2026-001',
    sourceType: 'job',
    sourceRoute: '/jobs',
    jobId: 'JOB-2026-001',
    actor: 'Project Manager',
    actionRequired: true,
  },
];

// ──────────────────────────────────────────────────────
// INITIALISE STATE WITH SEED DATA
// Activity Feed dispatch is suppressed during seeding so the 20 bus seed
// events are not injected into activityFeedEngine on top of its own 25
// seed events. Live publishEvent() calls always run with the flag false.
// ──────────────────────────────────────────────────────

function _seedHistory(): void {
  _suppressActivityFeedDispatch = true;
  try {
    for (const event of SEED_BUS_EVENTS) {
      const consumed = dispatchToSubscribers(event);
      const publishAudit = createAuditEntry(event.id, 'published', null);
      const consumeAudits = consumed.map((sub) =>
        createAuditEntry(event.id, 'consumed', sub),
      );
      _eventHistory.push({
        ...event,
        consumedBy: consumed,
        auditEntries: [publishAudit, ...consumeAudits],
      });
    }
  } finally {
    _suppressActivityFeedDispatch = false;
  }
}

_seedHistory();

// ──────────────────────────────────────────────────────
// CORE PUBLIC FUNCTIONS
// ──────────────────────────────────────────────────────

/**
 * Publish a new event onto the Event Bus.
 *
 * Doctrine: publishEvent NEVER approves submissions,
 * creates financial records, or bypasses Review Centre.
 */
export function publishEvent(
  event: Omit<BusEvent, 'id' | 'timestamp'>,
): BusEventRecord {
  const id = `bus-${String(_eventCounter).padStart(4, '0')}`;
  _eventCounter++;

  const full: BusEvent = {
    ...event,
    id,
    timestamp: new Date().toISOString(),
  };

  const consumed = dispatchToSubscribers(full);
  const publishAudit = createAuditEntry(full.id, 'published', null);
  const consumeAudits = consumed.map((sub) =>
    createAuditEntry(full.id, 'consumed', sub),
  );

  const record: BusEventRecord = {
    ...full,
    consumedBy: consumed,
    auditEntries: [publishAudit, ...consumeAudits],
  };

  _eventHistory = [record, ..._eventHistory];
  return record;
}

/**
 * Subscribe a new subscriber to the Event Bus.
 */
export function subscribe(subscriber: BusSubscriber): void {
  _subscribers.set(subscriber.id, subscriber);
}

/**
 * Unsubscribe a subscriber from the Event Bus.
 */
export function unsubscribe(subscriberId: string): void {
  _subscribers.delete(subscriberId);
}

/**
 * Get full event history (newest first).
 */
export function getEventHistory(): BusEventRecord[] {
  return [..._eventHistory].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
  );
}

/**
 * Get the N most recent events.
 */
export function getRecentBusEvents(limit = 10): BusEventRecord[] {
  return getEventHistory().slice(0, limit);
}

/**
 * Get events filtered by type.
 */
export function getEventsByType(
  type: BusEventCategory | 'all',
): BusEventRecord[] {
  if (type === 'all') return getEventHistory();
  return getEventHistory().filter((e) => e.type === type);
}

/**
 * Get events filtered by priority.
 */
export function getEventsByPriority(
  priority: BusEventPriority | 'all',
): BusEventRecord[] {
  if (priority === 'all') return getEventHistory();
  return getEventHistory().filter((e) => e.priority === priority);
}

/**
 * Search events by title, description, event ID, job ID, or source ID.
 */
export function searchBusEvents(
  events: BusEventRecord[],
  query: string,
): BusEventRecord[] {
  if (!query.trim()) return events;
  const q = query.toLowerCase();
  return events.filter(
    (e) =>
      e.title.toLowerCase().includes(q) ||
      e.description.toLowerCase().includes(q) ||
      e.id.toLowerCase().includes(q) ||
      (e.jobId && e.jobId.toLowerCase().includes(q)) ||
      e.sourceId.toLowerCase().includes(q),
  );
}

/**
 * Clear all event history (test support only).
 */
export function clearEventHistory(): void {
  _eventHistory = [];
  _auditLog = [];
  _automationEvaluations = [];
  _simulatedNotifications = [];
  _auditCounter = 1;
  _eventCounter = 1;
  for (const [id, sub] of _subscribers.entries()) {
    _subscribers.set(id, { ...sub, eventCount: 0 });
  }
}

/**
 * Get all registered subscribers.
 */
export function getSubscribers(): BusSubscriber[] {
  return Array.from(_subscribers.values());
}

/**
 * Get Event Bus audit log (immutable).
 */
export function getBusAuditLog(): BusAuditEntry[] {
  return [..._auditLog];
}

/**
 * Compute Event Bus KPI summary.
 */
export function computeEventBusSummary(): EventBusSummary {
  const todayStr = new Date().toISOString().slice(0, 10);
  const critical = _eventHistory.filter((e) => e.priority === 'critical').length;
  const today = _eventHistory.filter(
    (e) => e.timestamp.slice(0, 10) === todayStr,
  ).length;
  const activeTypes = new Set(_eventHistory.map((e) => e.type)).size;
  const activeSubscribers = Array.from(_subscribers.values()).filter(
    (s) => s.status === 'active',
  ).length;

  return {
    total: _eventHistory.length,
    today,
    critical,
    subscriberCount: activeSubscribers,
    activeEventTypes: activeTypes,
  };
}

/**
 * Record that an event was viewed in the monitor (audit trail).
 */
export function recordEventMonitorViewed(eventId: string): void {
  createAuditEntry(eventId, 'viewed', 'Event Monitor');
}

// ──────────────────────────────────────────────────────
// TEST RESET HELPER
// ──────────────────────────────────────────────────────

export function _resetEventBusState(): void {
  clearEventHistory();
  _seedHistory();
}
