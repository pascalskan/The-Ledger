/**
 * WORKFLOW ENGINE — Phase 6.4
 *
 * Cross-Module Workflow Orchestration for The Ledger.
 *
 * Doctrine:
 *   Workflows MAY: create notifications, generate activity events,
 *   escalate reviews, assign investigations, trigger governance reviews,
 *   trigger workflow stages.
 *
 *   Workflows MAY NEVER: approve reports, approve expenses, approve
 *   timesheets, create approved invoices, create approved financial
 *   records, bypass Review Centre, bypass CEO approvals.
 *
 * Approval Doctrine remains absolute.
 */

// ─────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────

export type WorkflowStatus = 'draft' | 'active' | 'paused' | 'archived';

export type WorkflowStepStatus = 'pending' | 'completed' | 'blocked' | 'failed';

export type WorkflowType =
  | 'review_workflow'
  | 'exception_workflow'
  | 'governance_workflow'
  | 'sync_workflow'
  | 'notification_workflow';

export interface WorkflowStep {
  id: string;
  order: number;
  name: string;
  description: string;
  module: string;
  action: string;
  status: WorkflowStepStatus;
  dependsOn: string[]; // step IDs this step depends on
  completedAt?: string;
  failureReason?: string;
}

export interface WorkflowExecutionRecord {
  id: string;
  workflowId: string;
  triggeredAt: string;
  triggeredBy: string;
  completedAt?: string;
  status: 'running' | 'completed' | 'failed' | 'blocked';
  stepResults: { stepId: string; status: WorkflowStepStatus; completedAt?: string }[];
}

export interface WorkflowAuditEntry {
  id: string;
  workflowId: string;
  workflowName: string;
  action:
    | 'workflow_created'
    | 'workflow_updated'
    | 'workflow_archived'
    | 'workflow_paused'
    | 'workflow_resumed'
    | 'workflow_executed';
  actor: string;
  timestamp: string;
  details: string;
}

export interface WorkflowRecord {
  id: string;
  name: string;
  description: string;
  workflowType: WorkflowType;
  status: WorkflowStatus;
  triggerEvent: string;
  triggerDescription: string;
  steps: WorkflowStep[];
  createdAt: string;
  updatedAt: string;
  actionRequired: boolean;
  financiallySensitive: boolean;
  executionHistory: WorkflowExecutionRecord[];
  governanceStatus: 'compliant' | 'requires_review' | 'restricted' | 'suspended';
  lastExecutedAt?: string;
  executionCount: number;
}

export interface WorkflowSummary {
  total: number;
  active: number;
  paused: number;
  draft: number;
  archived: number;
  requiresAction: number;
  financiallySensitive: number;
  requiresGovernanceReview: number;
}

// ─────────────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────────────

export const WORKFLOW_STATUS_LABELS: Record<WorkflowStatus, string> = {
  draft: 'Draft',
  active: 'Active',
  paused: 'Paused',
  archived: 'Archived',
};

export const WORKFLOW_STATUS_COLORS: Record<WorkflowStatus, string> = {
  draft: 'text-slate-600 bg-slate-100 border-slate-200',
  active: 'text-emerald-700 bg-emerald-50 border-emerald-200',
  paused: 'text-amber-700 bg-amber-50 border-amber-200',
  archived: 'text-stone-500 bg-stone-100 border-stone-200',
};

export const WORKFLOW_TYPE_LABELS: Record<WorkflowType, string> = {
  review_workflow: 'Review',
  exception_workflow: 'Exception',
  governance_workflow: 'Governance',
  sync_workflow: 'Sync',
  notification_workflow: 'Notification',
};

export const WORKFLOW_TYPE_COLORS: Record<WorkflowType, string> = {
  review_workflow: 'text-blue-700 bg-blue-50 border-blue-200',
  exception_workflow: 'text-red-700 bg-red-50 border-red-200',
  governance_workflow: 'text-purple-700 bg-purple-50 border-purple-200',
  sync_workflow: 'text-teal-700 bg-teal-50 border-teal-200',
  notification_workflow: 'text-orange-700 bg-orange-50 border-orange-200',
};

export const WORKFLOW_STEP_STATUS_LABELS: Record<WorkflowStepStatus, string> = {
  pending: 'Pending',
  completed: 'Completed',
  blocked: 'Blocked',
  failed: 'Failed',
};

export const WORKFLOW_STEP_STATUS_COLORS: Record<WorkflowStepStatus, string> = {
  pending: 'text-slate-600 bg-slate-100',
  completed: 'text-emerald-700 bg-emerald-50',
  blocked: 'text-amber-700 bg-amber-50',
  failed: 'text-red-700 bg-red-50',
};

// ─────────────────────────────────────────────────────────────────────
// FORBIDDEN ACTIONS (doctrine enforcement)
// ─────────────────────────────────────────────────────────────────────

export const WORKFLOW_FORBIDDEN_ACTIONS = [
  'approve_report',
  'approve_expense',
  'approve_timesheet',
  'create_approved_invoice',
  'create_approved_financial_record',
  'bypass_review_centre',
  'bypass_ceo_approval',
];

export function isWorkflowActionForbidden(action: string): boolean {
  return WORKFLOW_FORBIDDEN_ACTIONS.includes(action);
}

// ─────────────────────────────────────────────────────────────────────
// SEED DATA
// ─────────────────────────────────────────────────────────────────────

const now = new Date();
const daysAgo = (d: number) => new Date(now.getTime() - d * 86400000).toISOString();
const hoursAgo = (h: number) => new Date(now.getTime() - h * 3600000).toISOString();

const SEED_WORKFLOWS: WorkflowRecord[] = [
  {
    id: 'wf-001',
    name: 'Expense Review Escalation Workflow',
    description: 'Escalates high-value expense submissions to the Review Centre and generates CEO notifications when exceptions are detected.',
    workflowType: 'review_workflow',
    status: 'active',
    triggerEvent: 'exception_event',
    triggerDescription: 'Triggered when an exception is detected on an expense submission exceeding £500.',
    steps: [
      {
        id: 'wf-001-step-1',
        order: 1,
        name: 'Detect Exception',
        description: 'Monitor exception resolution engine for new open exceptions.',
        module: 'Exception Resolution',
        action: 'detect_exception',
        status: 'completed',
        dependsOn: [],
        completedAt: hoursAgo(3),
      },
      {
        id: 'wf-001-step-2',
        order: 2,
        name: 'Escalate to Review Centre',
        description: 'Flag the related submission in the Review Centre for CEO inspection.',
        module: 'Review Centre',
        action: 'escalate_review',
        status: 'completed',
        dependsOn: ['wf-001-step-1'],
        completedAt: hoursAgo(2),
      },
      {
        id: 'wf-001-step-3',
        order: 3,
        name: 'Generate CEO Notification',
        description: 'Dispatch a critical notification to the CEO for immediate visibility.',
        module: 'Notification Centre',
        action: 'create_notification',
        status: 'completed',
        dependsOn: ['wf-001-step-2'],
        completedAt: hoursAgo(2),
      },
      {
        id: 'wf-001-step-4',
        order: 4,
        name: 'Log Activity Event',
        description: 'Publish activity event to the Activity Feed for audit visibility.',
        module: 'Activity Feed',
        action: 'log_activity_event',
        status: 'completed',
        dependsOn: ['wf-001-step-3'],
        completedAt: hoursAgo(1),
      },
    ],
    createdAt: daysAgo(14),
    updatedAt: hoursAgo(1),
    actionRequired: false,
    financiallySensitive: true,
    governanceStatus: 'requires_review',
    executionHistory: [
      {
        id: 'wfex-001-1',
        workflowId: 'wf-001',
        triggeredAt: hoursAgo(3),
        triggeredBy: 'Event Bus (exception_event)',
        completedAt: hoursAgo(1),
        status: 'completed',
        stepResults: [
          { stepId: 'wf-001-step-1', status: 'completed', completedAt: hoursAgo(3) },
          { stepId: 'wf-001-step-2', status: 'completed', completedAt: hoursAgo(2) },
          { stepId: 'wf-001-step-3', status: 'completed', completedAt: hoursAgo(2) },
          { stepId: 'wf-001-step-4', status: 'completed', completedAt: hoursAgo(1) },
        ],
      },
    ],
    lastExecutedAt: hoursAgo(1),
    executionCount: 1,
  },
  {
    id: 'wf-002',
    name: 'Reconciliation Failure Governance Review',
    description: 'When a reconciliation mismatch is detected, triggers a governance review and assigns an investigation to the CEO.',
    workflowType: 'governance_workflow',
    status: 'active',
    triggerEvent: 'reconciliation_event',
    triggerDescription: 'Triggered when a reconciliation record enters Unmatched or Requires Review status.',
    steps: [
      {
        id: 'wf-002-step-1',
        order: 1,
        name: 'Detect Reconciliation Mismatch',
        description: 'Monitor reconciliation engine for unmatched or requires-review records.',
        module: 'Reconciliation Centre',
        action: 'detect_reconciliation_mismatch',
        status: 'completed',
        dependsOn: [],
        completedAt: daysAgo(1),
      },
      {
        id: 'wf-002-step-2',
        order: 2,
        name: 'Trigger Governance Review',
        description: 'Flag the related automation or sync rule in Automation Governance for CEO review.',
        module: 'Automation Governance',
        action: 'trigger_governance_review',
        status: 'completed',
        dependsOn: ['wf-002-step-1'],
        completedAt: daysAgo(1),
      },
      {
        id: 'wf-002-step-3',
        order: 3,
        name: 'Assign Investigation',
        description: 'Assign exception investigation to the CEO with high priority.',
        module: 'Exception Resolution',
        action: 'assign_investigation',
        status: 'blocked',
        dependsOn: ['wf-002-step-2'],
        failureReason: 'Awaiting governance review completion before investigation can be assigned.',
      },
    ],
    createdAt: daysAgo(30),
    updatedAt: daysAgo(1),
    actionRequired: true,
    financiallySensitive: true,
    governanceStatus: 'requires_review',
    executionHistory: [
      {
        id: 'wfex-002-1',
        workflowId: 'wf-002',
        triggeredAt: daysAgo(1),
        triggeredBy: 'Event Bus (reconciliation_event)',
        status: 'blocked',
        stepResults: [
          { stepId: 'wf-002-step-1', status: 'completed', completedAt: daysAgo(1) },
          { stepId: 'wf-002-step-2', status: 'completed', completedAt: daysAgo(1) },
          { stepId: 'wf-002-step-3', status: 'blocked' },
        ],
      },
    ],
    lastExecutedAt: daysAgo(1),
    executionCount: 3,
  },
  {
    id: 'wf-003',
    name: 'Sync Failure Notification Cascade',
    description: 'When an accounting sync fails, notifies the CEO, logs the event to the Activity Feed, and escalates if retry count exceeds threshold.',
    workflowType: 'sync_workflow',
    status: 'active',
    triggerEvent: 'sync_event',
    triggerDescription: 'Triggered when an accounting sync enters Failed or Retry Required status.',
    steps: [
      {
        id: 'wf-003-step-1',
        order: 1,
        name: 'Detect Sync Failure',
        description: 'Monitor accounting sync engine for failed sync records.',
        module: 'Accounting Sync',
        action: 'detect_sync_failure',
        status: 'completed',
        dependsOn: [],
        completedAt: hoursAgo(5),
      },
      {
        id: 'wf-003-step-2',
        order: 2,
        name: 'Dispatch CEO Notification',
        description: 'Send a warning-priority notification to the CEO about the sync failure.',
        module: 'Notification Centre',
        action: 'create_notification',
        status: 'completed',
        dependsOn: ['wf-003-step-1'],
        completedAt: hoursAgo(5),
      },
      {
        id: 'wf-003-step-3',
        order: 3,
        name: 'Log Activity Event',
        description: 'Publish sync failure event to the Activity Feed.',
        module: 'Activity Feed',
        action: 'log_activity_event',
        status: 'completed',
        dependsOn: ['wf-003-step-2'],
        completedAt: hoursAgo(4),
      },
      {
        id: 'wf-003-step-4',
        order: 4,
        name: 'Check Retry Threshold',
        description: 'Evaluate if retry count has exceeded threshold for escalation.',
        module: 'Accounting Sync',
        action: 'evaluate_retry_threshold',
        status: 'pending',
        dependsOn: ['wf-003-step-3'],
      },
    ],
    createdAt: daysAgo(21),
    updatedAt: hoursAgo(4),
    actionRequired: true,
    financiallySensitive: true,
    governanceStatus: 'compliant',
    executionHistory: [
      {
        id: 'wfex-003-1',
        workflowId: 'wf-003',
        triggeredAt: hoursAgo(5),
        triggeredBy: 'Event Bus (sync_event)',
        status: 'running',
        stepResults: [
          { stepId: 'wf-003-step-1', status: 'completed', completedAt: hoursAgo(5) },
          { stepId: 'wf-003-step-2', status: 'completed', completedAt: hoursAgo(5) },
          { stepId: 'wf-003-step-3', status: 'completed', completedAt: hoursAgo(4) },
          { stepId: 'wf-003-step-4', status: 'pending' },
        ],
      },
    ],
    lastExecutedAt: hoursAgo(4),
    executionCount: 7,
  },
  {
    id: 'wf-004',
    name: 'High-Risk Automation Governance Workflow',
    description: 'When a High or Critical risk automation rule is detected, triggers a full governance review cycle and notifies the CEO.',
    workflowType: 'governance_workflow',
    status: 'active',
    triggerEvent: 'governance_event',
    triggerDescription: 'Triggered when an automation rule is flagged as High or Critical risk in Automation Governance.',
    steps: [
      {
        id: 'wf-004-step-1',
        order: 1,
        name: 'Detect High Risk Rule',
        description: 'Monitor Automation Governance for High/Critical risk rules.',
        module: 'Automation Governance',
        action: 'detect_high_risk_rule',
        status: 'completed',
        dependsOn: [],
        completedAt: daysAgo(3),
      },
      {
        id: 'wf-004-step-2',
        order: 2,
        name: 'Escalate for Governance Review',
        description: 'Set governance status to Requires Review and notify relevant audit trail.',
        module: 'Automation Governance',
        action: 'escalate_governance_review',
        status: 'completed',
        dependsOn: ['wf-004-step-1'],
        completedAt: daysAgo(3),
      },
      {
        id: 'wf-004-step-3',
        order: 3,
        name: 'Notify CEO',
        description: 'Send critical notification to CEO requiring governance action.',
        module: 'Notification Centre',
        action: 'create_notification',
        status: 'completed',
        dependsOn: ['wf-004-step-2'],
        completedAt: daysAgo(3),
      },
      {
        id: 'wf-004-step-4',
        order: 4,
        name: 'Publish Event Bus Event',
        description: 'Publish governance_event to Event Bus for full system visibility.',
        module: 'Event Bus',
        action: 'publish_event',
        status: 'completed',
        dependsOn: ['wf-004-step-3'],
        completedAt: daysAgo(3),
      },
    ],
    createdAt: daysAgo(45),
    updatedAt: daysAgo(3),
    actionRequired: false,
    financiallySensitive: false,
    governanceStatus: 'compliant',
    executionHistory: [
      {
        id: 'wfex-004-1',
        workflowId: 'wf-004',
        triggeredAt: daysAgo(3),
        triggeredBy: 'Event Bus (governance_event)',
        completedAt: daysAgo(3),
        status: 'completed',
        stepResults: [
          { stepId: 'wf-004-step-1', status: 'completed', completedAt: daysAgo(3) },
          { stepId: 'wf-004-step-2', status: 'completed', completedAt: daysAgo(3) },
          { stepId: 'wf-004-step-3', status: 'completed', completedAt: daysAgo(3) },
          { stepId: 'wf-004-step-4', status: 'completed', completedAt: daysAgo(3) },
        ],
      },
    ],
    lastExecutedAt: daysAgo(3),
    executionCount: 2,
  },
  {
    id: 'wf-005',
    name: 'Worker Exception Investigation Workflow',
    description: 'Assigns worker-related exceptions to an investigation queue and escalates to CEO review if unresolved within 24 hours.',
    workflowType: 'exception_workflow',
    status: 'active',
    triggerEvent: 'exception_event',
    triggerDescription: 'Triggered when an exception status changes to Under Investigation.',
    steps: [
      {
        id: 'wf-005-step-1',
        order: 1,
        name: 'Assign Investigation',
        description: 'Assign the exception to the CEO investigation queue.',
        module: 'Exception Resolution',
        action: 'assign_investigation',
        status: 'completed',
        dependsOn: [],
        completedAt: daysAgo(2),
      },
      {
        id: 'wf-005-step-2',
        order: 2,
        name: 'Log to Activity Feed',
        description: 'Log exception investigation start to the Activity Feed.',
        module: 'Activity Feed',
        action: 'log_activity_event',
        status: 'completed',
        dependsOn: ['wf-005-step-1'],
        completedAt: daysAgo(2),
      },
      {
        id: 'wf-005-step-3',
        order: 3,
        name: 'Escalation Check (24h)',
        description: 'After 24 hours, check if exception is still unresolved and escalate.',
        module: 'Exception Resolution',
        action: 'check_escalation_threshold',
        status: 'failed',
        dependsOn: ['wf-005-step-2'],
        failureReason: 'Escalation timer service unavailable in prototype environment.',
      },
    ],
    createdAt: daysAgo(60),
    updatedAt: daysAgo(2),
    actionRequired: true,
    financiallySensitive: false,
    governanceStatus: 'compliant',
    executionHistory: [
      {
        id: 'wfex-005-1',
        workflowId: 'wf-005',
        triggeredAt: daysAgo(2),
        triggeredBy: 'Event Bus (exception_event)',
        status: 'failed',
        stepResults: [
          { stepId: 'wf-005-step-1', status: 'completed', completedAt: daysAgo(2) },
          { stepId: 'wf-005-step-2', status: 'completed', completedAt: daysAgo(2) },
          { stepId: 'wf-005-step-3', status: 'failed' },
        ],
      },
    ],
    lastExecutedAt: daysAgo(2),
    executionCount: 5,
  },
  {
    id: 'wf-006',
    name: 'Job Review Completion Notification',
    description: 'When all review items for a job are approved, generates a notification and logs the completion event.',
    workflowType: 'notification_workflow',
    status: 'active',
    triggerEvent: 'review_event',
    triggerDescription: 'Triggered when a review batch for a job reaches 100% approval.',
    steps: [
      {
        id: 'wf-006-step-1',
        order: 1,
        name: 'Detect Full Approval',
        description: 'Detect when all pending review items for a job are approved.',
        module: 'Review Centre',
        action: 'detect_full_approval',
        status: 'pending',
        dependsOn: [],
      },
      {
        id: 'wf-006-step-2',
        order: 2,
        name: 'Send Completion Notification',
        description: 'Notify CEO and relevant PM that the job review is complete.',
        module: 'Notification Centre',
        action: 'create_notification',
        status: 'pending',
        dependsOn: ['wf-006-step-1'],
      },
      {
        id: 'wf-006-step-3',
        order: 3,
        name: 'Log Completion Event',
        description: 'Publish job completion event to Activity Feed and Event Bus.',
        module: 'Activity Feed',
        action: 'log_activity_event',
        status: 'pending',
        dependsOn: ['wf-006-step-2'],
      },
    ],
    createdAt: daysAgo(7),
    updatedAt: daysAgo(7),
    actionRequired: false,
    financiallySensitive: false,
    governanceStatus: 'compliant',
    executionHistory: [],
    executionCount: 0,
  },
  {
    id: 'wf-007',
    name: 'Financial Control Override Review',
    description: 'When a financial control override is requested, triggers a governance workflow, notifies the CEO, and blocks further automation execution until resolved.',
    workflowType: 'governance_workflow',
    status: 'paused',
    triggerEvent: 'financial_control_event',
    triggerDescription: 'Triggered when a financial control enters Pending Approval status.',
    steps: [
      {
        id: 'wf-007-step-1',
        order: 1,
        name: 'Detect Pending Control',
        description: 'Detect financial control entering Pending Approval.',
        module: 'Financial Controls',
        action: 'detect_pending_control',
        status: 'pending',
        dependsOn: [],
      },
      {
        id: 'wf-007-step-2',
        order: 2,
        name: 'Block Related Automations',
        description: 'Flag related automation rules for CEO review pending control resolution.',
        module: 'Automation Governance',
        action: 'escalate_governance_review',
        status: 'pending',
        dependsOn: ['wf-007-step-1'],
      },
      {
        id: 'wf-007-step-3',
        order: 3,
        name: 'Notify CEO',
        description: 'Send critical notification to CEO for financial control override decision.',
        module: 'Notification Centre',
        action: 'create_notification',
        status: 'pending',
        dependsOn: ['wf-007-step-2'],
      },
    ],
    createdAt: daysAgo(10),
    updatedAt: daysAgo(5),
    actionRequired: false,
    financiallySensitive: true,
    governanceStatus: 'requires_review',
    executionHistory: [],
    executionCount: 0,
  },
  {
    id: 'wf-008',
    name: 'Draft Quarterly Sync Workflow',
    description: 'Draft workflow to orchestrate quarterly sync operations and governance checks.',
    workflowType: 'sync_workflow',
    status: 'draft',
    triggerEvent: 'scheduler_event',
    triggerDescription: 'Triggered by quarterly scheduler.',
    steps: [
      {
        id: 'wf-008-step-1',
        order: 1,
        name: 'Initiate Quarterly Sync Review',
        description: 'Queue all pending sync records for review.',
        module: 'Accounting Sync',
        action: 'queue_sync_review',
        status: 'pending',
        dependsOn: [],
      },
    ],
    createdAt: daysAgo(3),
    updatedAt: daysAgo(3),
    actionRequired: false,
    financiallySensitive: true,
    governanceStatus: 'compliant',
    executionHistory: [],
    executionCount: 0,
  },
];

// Mutable store
let _workflows: WorkflowRecord[] = [...SEED_WORKFLOWS];
let _auditLog: WorkflowAuditEntry[] = [];

function _generateId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
}

function _writeAudit(
  workflowId: string,
  workflowName: string,
  action: WorkflowAuditEntry['action'],
  actor: string,
  details: string
): void {
  _auditLog.push({
    id: _generateId('wf-audit'),
    workflowId,
    workflowName,
    action,
    actor,
    timestamp: new Date().toISOString(),
    details,
  });
}

// ─────────────────────────────────────────────────────────────────────
// PUBLIC API
// ─────────────────────────────────────────────────────────────────────

export function getAllWorkflows(): WorkflowRecord[] {
  return [..._workflows];
}

export function getWorkflowById(id: string): WorkflowRecord | undefined {
  return _workflows.find((w) => w.id === id);
}

export function createWorkflow(
  data: Pick<
    WorkflowRecord,
    'name' | 'description' | 'workflowType' | 'triggerEvent' | 'triggerDescription' | 'steps' | 'actionRequired' | 'financiallySensitive'
  >,
  actor: string
): WorkflowRecord {
  // Doctrine check — steps must not contain forbidden actions
  for (const step of data.steps) {
    if (isWorkflowActionForbidden(step.action)) {
      throw new Error(
        `Workflow step '${step.name}' contains a forbidden action: '${step.action}'. Workflows may never approve financial records or bypass approval workflows.`
      );
    }
  }
  const workflow: WorkflowRecord = {
    id: _generateId('wf'),
    ...data,
    status: 'draft',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    governanceStatus: data.financiallySensitive ? 'requires_review' : 'compliant',
    executionHistory: [],
    executionCount: 0,
  };
  _workflows.push(workflow);
  _writeAudit(workflow.id, workflow.name, 'workflow_created', actor, `Workflow '${workflow.name}' created in draft status.`);
  return workflow;
}

export function updateWorkflow(
  id: string,
  patch: Partial<Pick<WorkflowRecord, 'name' | 'description' | 'steps' | 'triggerEvent' | 'triggerDescription' | 'actionRequired' | 'financiallySensitive'>>,
  actor: string
): WorkflowRecord {
  const idx = _workflows.findIndex((w) => w.id === id);
  if (idx === -1) throw new Error(`Workflow ${id} not found.`);
  if (_workflows[idx].status === 'archived') throw new Error('Cannot update an archived workflow.');
  if (patch.steps) {
    for (const step of patch.steps) {
      if (isWorkflowActionForbidden(step.action)) {
        throw new Error(`Step '${step.name}' contains a forbidden action: '${step.action}'.`);
      }
    }
  }
  _workflows[idx] = {
    ..._workflows[idx],
    ...patch,
    updatedAt: new Date().toISOString(),
  };
  _writeAudit(id, _workflows[idx].name, 'workflow_updated', actor, `Workflow updated.`);
  return _workflows[idx];
}

export function archiveWorkflow(id: string, actor: string): WorkflowRecord {
  const idx = _workflows.findIndex((w) => w.id === id);
  if (idx === -1) throw new Error(`Workflow ${id} not found.`);
  _workflows[idx] = { ..._workflows[idx], status: 'archived', updatedAt: new Date().toISOString() };
  _writeAudit(id, _workflows[idx].name, 'workflow_archived', actor, 'Workflow archived.');
  return _workflows[idx];
}

export function pauseWorkflow(id: string, actor: string): WorkflowRecord {
  const idx = _workflows.findIndex((w) => w.id === id);
  if (idx === -1) throw new Error(`Workflow ${id} not found.`);
  if (_workflows[idx].status !== 'active') throw new Error('Only active workflows can be paused.');
  _workflows[idx] = { ..._workflows[idx], status: 'paused', updatedAt: new Date().toISOString() };
  _writeAudit(id, _workflows[idx].name, 'workflow_paused', actor, 'Workflow paused by CEO.');
  return _workflows[idx];
}

export function resumeWorkflow(id: string, actor: string): WorkflowRecord {
  const idx = _workflows.findIndex((w) => w.id === id);
  if (idx === -1) throw new Error(`Workflow ${id} not found.`);
  if (_workflows[idx].status !== 'paused') throw new Error('Only paused workflows can be resumed.');
  _workflows[idx] = { ..._workflows[idx], status: 'active', updatedAt: new Date().toISOString() };
  _writeAudit(id, _workflows[idx].name, 'workflow_resumed', actor, 'Workflow resumed by CEO.');
  return _workflows[idx];
}

export function computeWorkflowSummary(workflows: WorkflowRecord[] = _workflows): WorkflowSummary {
  return {
    total: workflows.length,
    active: workflows.filter((w) => w.status === 'active').length,
    paused: workflows.filter((w) => w.status === 'paused').length,
    draft: workflows.filter((w) => w.status === 'draft').length,
    archived: workflows.filter((w) => w.status === 'archived').length,
    requiresAction: workflows.filter((w) => w.actionRequired).length,
    financiallySensitive: workflows.filter((w) => w.financiallySensitive).length,
    requiresGovernanceReview: workflows.filter((w) => w.governanceStatus === 'requires_review').length,
  };
}

export function searchWorkflows(workflows: WorkflowRecord[], query: string): WorkflowRecord[] {
  if (!query.trim()) return workflows;
  const q = query.trim().toLowerCase();
  return workflows.filter(
    (w) =>
      w.name.toLowerCase().includes(q) ||
      w.description.toLowerCase().includes(q) ||
      w.id.toLowerCase().includes(q) ||
      w.triggerEvent.toLowerCase().includes(q) ||
      w.workflowType.toLowerCase().includes(q)
  );
}

export function getWorkflowAuditLog(): WorkflowAuditEntry[] {
  return [..._auditLog];
}

// ─────────────────────────────────────────────────────────────────────
// EVENT BUS INTEGRATION HELPERS
// ─────────────────────────────────────────────────────────────────────

export type WorkflowBusEventType =
  | 'workflow_started'
  | 'workflow_step_completed'
  | 'workflow_blocked'
  | 'workflow_failed'
  | 'workflow_completed';

export const WORKFLOW_BUS_EVENT_LABELS: Record<WorkflowBusEventType, string> = {
  workflow_started: 'Workflow Started',
  workflow_step_completed: 'Step Completed',
  workflow_blocked: 'Workflow Blocked',
  workflow_failed: 'Workflow Failed',
  workflow_completed: 'Workflow Completed',
};

// Simulated event bus integration — publishes workflow lifecycle events
export function publishWorkflowEvent(
  eventType: WorkflowBusEventType,
  workflow: WorkflowRecord,
  details: string
): void {
  // In a full backend implementation, this would call eventBusEngine.publishEvent()
  // For Phase 6.4 (frontend prototype), we record the event in the audit log only
  _writeAudit(
    workflow.id,
    workflow.name,
    'workflow_executed',
    'System (Event Bus)',
    `[${WORKFLOW_BUS_EVENT_LABELS[eventType]}] ${details}`
  );
}
