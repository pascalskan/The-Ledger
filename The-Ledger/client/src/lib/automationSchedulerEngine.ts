// ======================================================
// PHASE 6.0E — AUTOMATION SCHEDULER ENGINE
//
// Time-based automation execution layer for The Ledger.
// Defines schedule types, schedule records, next-run
// calculation, and audit trail for scheduled executions.
//
// Architecture: Mock only. No backend. Pure functions +
// seed data. This is a frontend prototype simulation.
//
// Doctrine:
//   Schedulers may QUEUE actions.
//   Schedulers may TRIGGER evaluations.
//   Schedulers may NEVER:
//     - Approve expenses
//     - Approve timesheets
//     - Approve reports
//     - Create approved invoices
//     - Create approved financial records
//   Approval remains HUMAN-CONTROLLED.
//   Every scheduled execution generates an audit record.
//   No silent executions. No silent failures.
//   Job attribution preserved in all execution records.
//   FinanciallySensitive schedules remain governed.
//   Accounting systems remain downstream consumers.
// ======================================================

import { AutomationCategory } from "./automationEngine";

// ──────────────────────────────────────────────────────
// SCHEDULE TYPE
// ──────────────────────────────────────────────────────

export type AutomationScheduleType =
  | "Hourly"
  | "Daily"
  | "Weekly"
  | "Monthly"
  | "Custom";

export const SCHEDULE_TYPE_LABELS: Record<AutomationScheduleType, string> = {
  Hourly: "Hourly",
  Daily: "Daily",
  Weekly: "Weekly",
  Monthly: "Monthly",
  Custom: "Custom",
};

export const SCHEDULE_TYPE_COLORS: Record<AutomationScheduleType, string> = {
  Hourly: "text-blue-600 border-blue-200 bg-blue-50",
  Daily: "text-violet-600 border-violet-200 bg-violet-50",
  Weekly: "text-indigo-600 border-indigo-200 bg-indigo-50",
  Monthly: "text-purple-600 border-purple-200 bg-purple-50",
  Custom: "text-slate-600 border-slate-200 bg-slate-50",
};

// ──────────────────────────────────────────────────────
// SCHEDULE STATUS
// ──────────────────────────────────────────────────────

export type AutomationScheduleStatus = "Active" | "Paused" | "Disabled";

export const SCHEDULE_STATUS_LABELS: Record<AutomationScheduleStatus, string> = {
  Active: "Active",
  Paused: "Paused",
  Disabled: "Disabled",
};

export const SCHEDULE_STATUS_COLORS: Record<AutomationScheduleStatus, string> = {
  Active: "text-emerald-600 border-emerald-200 bg-emerald-50",
  Paused: "text-amber-600 border-amber-200 bg-amber-50",
  Disabled: "text-slate-500 border-slate-200 bg-slate-50",
};

// ──────────────────────────────────────────────────────
// SCHEDULE EXECUTION RECORD
// ──────────────────────────────────────────────────────

export type ScheduleExecutionResult =
  | "success"
  | "blocked_approval_required"
  | "blocked_safeguard"
  | "failed"
  | "skipped";

export const SCHEDULE_EXECUTION_RESULT_LABELS: Record<ScheduleExecutionResult, string> = {
  success: "Success",
  blocked_approval_required: "Blocked — Approval Required",
  blocked_safeguard: "Blocked — Safeguard",
  failed: "Failed",
  skipped: "Skipped",
};

export const SCHEDULE_EXECUTION_RESULT_COLORS: Record<ScheduleExecutionResult, string> = {
  success: "text-emerald-600 border-emerald-200 bg-emerald-50",
  blocked_approval_required: "text-amber-600 border-amber-200 bg-amber-50",
  blocked_safeguard: "text-orange-600 border-orange-200 bg-orange-50",
  failed: "text-red-600 border-red-200 bg-red-50",
  skipped: "text-slate-600 border-slate-200 bg-slate-50",
};

export interface AutomationScheduleExecution {
  id: string;
  scheduleId: string;
  scheduleName: string;
  ruleId: string;
  ruleName: string;
  ruleNumber: string;
  executedAt: string;         // ISO timestamp
  result: ScheduleExecutionResult;
  resultMessage: string;
  /** Job attribution — always set when job context exists */
  jobId: string | null;
  jobName: string | null;
  /** Rule attribution */
  ruleAttribution: string;
  /** Source attribution — who/what initiated */
  sourceAttribution: "scheduler" | "manual_trigger" | "test_run";
  /** Approval state at time of execution */
  approvalState: "not_required" | "approved" | "pending" | "not_present";
}

// ──────────────────────────────────────────────────────
// SCHEDULE AUDIT EVENT
// ──────────────────────────────────────────────────────

export type ScheduleAuditEventType =
  | "Schedule Created"
  | "Schedule Updated"
  | "Schedule Paused"
  | "Schedule Resumed"
  | "Schedule Disabled"
  | "Schedule Executed";

export interface ScheduleAuditEntry {
  id: string;
  scheduleId: string;
  scheduleName: string;
  ruleId: string;
  ruleNumber: string;
  ruleName: string;
  eventType: ScheduleAuditEventType;
  performedBy: string;
  previousStatus: AutomationScheduleStatus | null;
  newStatus: AutomationScheduleStatus | null;
  notes: string;
  timestamp: string;          // ISO timestamp
  jobId: string | null;
  jobName: string | null;
}

// ──────────────────────────────────────────────────────
// SCHEDULE DEFINITION
// ──────────────────────────────────────────────────────

export interface AutomationSchedule {
  id: string;
  scheduleNumber: string;     // Display: SCH-2026-001
  name: string;
  description: string;
  ruleId: string;             // References AutomationRule.id
  ruleNumber: string;         // Display reference
  ruleName: string;
  ruleCategory: AutomationCategory;

  // Schedule definition
  scheduleType: AutomationScheduleType;
  /** Human-readable schedule summary */
  scheduleSummary: string;
  /** Cron-like config */
  config: ScheduleConfig;

  // Status
  status: AutomationScheduleStatus;

  // Execution tracking
  nextRunAt: string;          // ISO timestamp
  lastRunAt: string | null;   // ISO timestamp
  runCount: number;
  successCount: number;
  failureCount: number;

  // Financial safety
  isFinanciallySensitive: boolean;
  isApprovalProtected: boolean;

  // Governance
  governanceReviewRequired: boolean;

  // Attribution
  jobId: string | null;
  jobName: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;

  // Audit references
  auditIds: string[];
}

// ──────────────────────────────────────────────────────
// SCHEDULE CONFIG
// ──────────────────────────────────────────────────────

export interface ScheduleConfig {
  /** For Hourly: interval in hours (1, 2, 4, 6, 12) */
  hourInterval?: number;
  /** For Daily: hour of day (0-23) */
  dailyHour?: number;
  /** For Weekly: day of week (0=Sun, 1=Mon … 6=Sat) and hour */
  weeklyDay?: number;
  weeklyHour?: number;
  /** For Monthly: day of month (1-28) and hour */
  monthlyDay?: number;
  monthlyHour?: number;
  /** For Custom: plain-text cron description */
  customExpression?: string;
  /** Timezone identifier */
  timezone?: string;
}

// ──────────────────────────────────────────────────────
// SCHEDULE SUMMARY
// ──────────────────────────────────────────────────────

export interface ScheduleSummary {
  total: number;
  active: number;
  paused: number;
  disabled: number;
  runsToday: number;
  upcomingExecutions: number;
}

// ──────────────────────────────────────────────────────
// COMPUTE NEXT RUN
// ──────────────────────────────────────────────────────

/**
 * Computes the next run timestamp for a given schedule config
 * and schedule type, relative to a base reference time.
 *
 * Returns an ISO 8601 string.
 *
 * Doctrine: next run is computed only — never executes,
 * never mutates financial records.
 */
export function computeNextRun(
  scheduleType: AutomationScheduleType,
  config: ScheduleConfig,
  fromDate: Date = new Date()
): string {
  const base = new Date(fromDate);

  switch (scheduleType) {
    case "Hourly": {
      const interval = config.hourInterval ?? 1;
      base.setHours(base.getHours() + interval, 0, 0, 0);
      return base.toISOString();
    }
    case "Daily": {
      const hour = config.dailyHour ?? 9;
      const next = new Date(base);
      next.setHours(hour, 0, 0, 0);
      if (next <= base) next.setDate(next.getDate() + 1);
      return next.toISOString();
    }
    case "Weekly": {
      const targetDay = config.weeklyDay ?? 1; // Monday
      const targetHour = config.weeklyHour ?? 9;
      const next = new Date(base);
      next.setHours(targetHour, 0, 0, 0);
      const daysUntil = (targetDay - base.getDay() + 7) % 7;
      next.setDate(next.getDate() + (daysUntil === 0 && next <= base ? 7 : daysUntil));
      return next.toISOString();
    }
    case "Monthly": {
      const day = config.monthlyDay ?? 1;
      const hour = config.monthlyHour ?? 9;
      const next = new Date(base);
      next.setDate(day);
      next.setHours(hour, 0, 0, 0);
      if (next <= base) next.setMonth(next.getMonth() + 1);
      return next.toISOString();
    }
    case "Custom": {
      // Custom schedules: advance by 1 day as placeholder
      base.setDate(base.getDate() + 1);
      base.setHours(9, 0, 0, 0);
      return base.toISOString();
    }
    default:
      return base.toISOString();
  }
}

// ──────────────────────────────────────────────────────
// COMPUTE SCHEDULE SUMMARY (human-readable)
// ──────────────────────────────────────────────────────

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

/**
 * Returns a concise human-readable description of when the
 * schedule fires, e.g. "Every day at 09:00",
 * "Every Monday at 08:00", "1st of every month at 09:00".
 */
export function computeScheduleSummary(
  scheduleType: AutomationScheduleType,
  config: ScheduleConfig
): string {
  switch (scheduleType) {
    case "Hourly": {
      const h = config.hourInterval ?? 1;
      return h === 1 ? "Every hour" : `Every ${h} hours`;
    }
    case "Daily": {
      const hour = config.dailyHour ?? 9;
      return `Every day at ${String(hour).padStart(2, "0")}:00`;
    }
    case "Weekly": {
      const day = DAY_NAMES[config.weeklyDay ?? 1];
      const hour = config.weeklyHour ?? 9;
      return `Every ${day} at ${String(hour).padStart(2, "0")}:00`;
    }
    case "Monthly": {
      const day = config.monthlyDay ?? 1;
      const hour = config.monthlyHour ?? 9;
      const suffix = day === 1 ? "st" : day === 2 ? "nd" : day === 3 ? "rd" : "th";
      return `${day}${suffix} of every month at ${String(hour).padStart(2, "0")}:00`;
    }
    case "Custom":
      return config.customExpression ?? "Custom schedule";
    default:
      return "Unknown schedule";
  }
}

// ──────────────────────────────────────────────────────
// IN-MEMORY STATE STORES
// ──────────────────────────────────────────────────────

let _schedules: AutomationSchedule[] = [];
const _scheduleAuditLog: ScheduleAuditEntry[] = [];
const _scheduleExecutions: AutomationScheduleExecution[] = [];

// ──────────────────────────────────────────────────────
// UPCOMING RUNS HELPER
// ──────────────────────────────────────────────────────

/**
 * Computes the next N run timestamps for a schedule,
 * used in the detail dialog "Upcoming Runs" section.
 */
export function getUpcomingRuns(
  schedule: AutomationSchedule,
  count: number = 5
): string[] {
  const runs: string[] = [];
  let from = new Date();
  for (let i = 0; i < count; i++) {
    const next = computeNextRun(schedule.scheduleType, schedule.config, from);
    runs.push(next);
    from = new Date(new Date(next).getTime() + 60_000); // advance 1 minute past
  }
  return runs;
}

// ──────────────────────────────────────────────────────
// AUDIT HELPER
// ──────────────────────────────────────────────────────

function appendScheduleAudit(
  schedule: AutomationSchedule,
  eventType: ScheduleAuditEventType,
  performedBy: string,
  previousStatus: AutomationScheduleStatus | null,
  newStatus: AutomationScheduleStatus | null,
  notes: string
): ScheduleAuditEntry {
  const entry: ScheduleAuditEntry = {
    id: `sched-audit-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    scheduleId: schedule.id,
    scheduleName: schedule.name,
    ruleId: schedule.ruleId,
    ruleNumber: schedule.ruleNumber,
    ruleName: schedule.ruleName,
    eventType,
    performedBy,
    previousStatus,
    newStatus,
    notes,
    timestamp: new Date().toISOString(),
    jobId: schedule.jobId,
    jobName: schedule.jobName,
  };
  // Append-only — immutable
  _scheduleAuditLog.push(entry);
  return entry;
}

// ──────────────────────────────────────────────────────
// CEO SCHEDULE ACTIONS
// ──────────────────────────────────────────────────────

/**
 * Pauses an active schedule.
 * Generates an immutable audit entry.
 * Schedulers may never approve anything — pause only queues actions.
 */
export function pauseSchedule(
  scheduleId: string,
  performedBy: string,
  notes: string = ""
): { schedule: AutomationSchedule; audit: ScheduleAuditEntry } | null {
  const idx = _schedules.findIndex((s) => s.id === scheduleId);
  if (idx === -1) return null;
  const prev = _schedules[idx].status;
  _schedules[idx] = {
    ..._schedules[idx],
    status: "Paused",
    updatedAt: new Date().toISOString(),
  };
  const audit = appendScheduleAudit(
    _schedules[idx],
    "Schedule Paused",
    performedBy,
    prev,
    "Paused",
    notes || "Schedule paused by CEO."
  );
  _schedules[idx].auditIds = [..._schedules[idx].auditIds, audit.id];
  return { schedule: _schedules[idx], audit };
}

/**
 * Resumes a paused schedule.
 * Generates an immutable audit entry.
 */
export function resumeSchedule(
  scheduleId: string,
  performedBy: string,
  notes: string = ""
): { schedule: AutomationSchedule; audit: ScheduleAuditEntry } | null {
  const idx = _schedules.findIndex((s) => s.id === scheduleId);
  if (idx === -1) return null;
  const prev = _schedules[idx].status;
  const nextRun = computeNextRun(_schedules[idx].scheduleType, _schedules[idx].config);
  _schedules[idx] = {
    ..._schedules[idx],
    status: "Active",
    nextRunAt: nextRun,
    updatedAt: new Date().toISOString(),
  };
  const audit = appendScheduleAudit(
    _schedules[idx],
    "Schedule Resumed",
    performedBy,
    prev,
    "Active",
    notes || "Schedule resumed by CEO."
  );
  _schedules[idx].auditIds = [..._schedules[idx].auditIds, audit.id];
  return { schedule: _schedules[idx], audit };
}

/**
 * Disables a schedule permanently (can be re-enabled).
 * Generates an immutable audit entry.
 */
export function disableSchedule(
  scheduleId: string,
  performedBy: string,
  notes: string = ""
): { schedule: AutomationSchedule; audit: ScheduleAuditEntry } | null {
  const idx = _schedules.findIndex((s) => s.id === scheduleId);
  if (idx === -1) return null;
  const prev = _schedules[idx].status;
  _schedules[idx] = {
    ..._schedules[idx],
    status: "Disabled",
    updatedAt: new Date().toISOString(),
  };
  const audit = appendScheduleAudit(
    _schedules[idx],
    "Schedule Disabled",
    performedBy,
    prev,
    "Disabled",
    notes || "Schedule disabled by CEO."
  );
  _schedules[idx].auditIds = [..._schedules[idx].auditIds, audit.id];
  return { schedule: _schedules[idx], audit };
}

// ──────────────────────────────────────────────────────
// QUERY FUNCTIONS
// ──────────────────────────────────────────────────────

export function getAllSchedules(): AutomationSchedule[] {
  return [..._schedules];
}

export function getScheduleById(id: string): AutomationSchedule | undefined {
  return _schedules.find((s) => s.id === id);
}

export function getScheduleAuditLog(): ScheduleAuditEntry[] {
  return [..._scheduleAuditLog];
}

export function getScheduleExecutions(): AutomationScheduleExecution[] {
  return [..._scheduleExecutions];
}

export function filterSchedulesByStatus(
  schedules: AutomationSchedule[],
  status: AutomationScheduleStatus | "all"
): AutomationSchedule[] {
  if (status === "all") return schedules;
  return schedules.filter((s) => s.status === status);
}

export function filterSchedulesByType(
  schedules: AutomationSchedule[],
  type: AutomationScheduleType | "all"
): AutomationSchedule[] {
  if (type === "all") return schedules;
  return schedules.filter((s) => s.scheduleType === type);
}

export function searchSchedules(
  schedules: AutomationSchedule[],
  query: string
): AutomationSchedule[] {
  if (!query.trim()) return schedules;
  const q = query.trim().toLowerCase();
  return schedules.filter(
    (s) =>
      s.name.toLowerCase().includes(q) ||
      s.scheduleNumber.toLowerCase().includes(q) ||
      s.ruleName.toLowerCase().includes(q) ||
      s.scheduleSummary.toLowerCase().includes(q)
  );
}

export function computeScheduleSummaryKPIs(
  schedules: AutomationSchedule[],
  executions: AutomationScheduleExecution[]
): ScheduleSummary {
  const today = new Date().toDateString();
  return {
    total: schedules.length,
    active: schedules.filter((s) => s.status === "Active").length,
    paused: schedules.filter((s) => s.status === "Paused").length,
    disabled: schedules.filter((s) => s.status === "Disabled").length,
    runsToday: executions.filter(
      (e) => new Date(e.executedAt).toDateString() === today
    ).length,
    upcomingExecutions: schedules.filter(
      (s) =>
        s.status === "Active" &&
        new Date(s.nextRunAt) > new Date()
    ).length,
  };
}

// ──────────────────────────────────────────────────────
// SEED DATA — SCHEDULES
// ──────────────────────────────────────────────────────

/**
 * Reference date for seed: 1 June 2026 08:00 UTC
 * Used to produce deterministic nextRunAt values.
 */
const SEED_BASE = new Date("2026-06-01T08:00:00Z");

const SEED_SCHEDULES: AutomationSchedule[] = [
  {
    id: "sched-001",
    scheduleNumber: "SCH-2026-001",
    name: "Daily Review Escalation",
    description: "Every day at 09:00, escalate any unactioned review submissions older than 24 hours to the CEO.",
    ruleId: "rule-002",
    ruleNumber: "AUT-2026-002",
    ruleName: "Auto-assign PM on Job Creation",
    ruleCategory: "Workflow",
    scheduleType: "Daily",
    scheduleSummary: computeScheduleSummary("Daily", { dailyHour: 9 }),
    config: { dailyHour: 9, timezone: "Europe/London" },
    status: "Active",
    nextRunAt: computeNextRun("Daily", { dailyHour: 9 }, SEED_BASE),
    lastRunAt: "2026-05-31T09:00:00Z",
    runCount: 31,
    successCount: 30,
    failureCount: 1,
    isFinanciallySensitive: false,
    isApprovalProtected: false,
    governanceReviewRequired: false,
    jobId: null,
    jobName: null,
    createdBy: "Marcus Webb",
    createdAt: "2026-05-01T09:00:00Z",
    updatedAt: "2026-05-31T09:00:00Z",
    auditIds: ["sched-audit-seed-001"],
  },
  {
    id: "sched-002",
    scheduleNumber: "SCH-2026-002",
    name: "Weekly Payroll Preparation",
    description: "Every Monday at 08:00, prepare payroll data by queuing all approved timesheets for export.",
    ruleId: "rule-003",
    ruleNumber: "AUT-2026-003",
    ruleName: "Queue Accounting Sync on Review Approval",
    ruleCategory: "FinanciallySensitive",
    scheduleType: "Weekly",
    scheduleSummary: computeScheduleSummary("Weekly", { weeklyDay: 1, weeklyHour: 8 }),
    config: { weeklyDay: 1, weeklyHour: 8, timezone: "Europe/London" },
    status: "Active",
    nextRunAt: computeNextRun("Weekly", { weeklyDay: 1, weeklyHour: 8 }, SEED_BASE),
    lastRunAt: "2026-05-25T08:00:00Z",
    runCount: 8,
    successCount: 8,
    failureCount: 0,
    isFinanciallySensitive: true,
    isApprovalProtected: true,
    governanceReviewRequired: true,
    jobId: null,
    jobName: null,
    createdBy: "Marcus Webb",
    createdAt: "2026-04-07T08:00:00Z",
    updatedAt: "2026-05-25T08:00:00Z",
    auditIds: ["sched-audit-seed-002"],
  },
  {
    id: "sched-003",
    scheduleNumber: "SCH-2026-003",
    name: "Monthly Asset Service Reminder",
    description: "On the 1st of every month at 09:00, check all assets for upcoming service due dates and send notifications.",
    ruleId: "rule-001",
    ruleNumber: "AUT-2026-001",
    ruleName: "Notify CEO on Sync Failure",
    ruleCategory: "Operational",
    scheduleType: "Monthly",
    scheduleSummary: computeScheduleSummary("Monthly", { monthlyDay: 1, monthlyHour: 9 }),
    config: { monthlyDay: 1, monthlyHour: 9, timezone: "Europe/London" },
    status: "Active",
    nextRunAt: computeNextRun("Monthly", { monthlyDay: 1, monthlyHour: 9 }, SEED_BASE),
    lastRunAt: "2026-05-01T09:00:00Z",
    runCount: 5,
    successCount: 5,
    failureCount: 0,
    isFinanciallySensitive: false,
    isApprovalProtected: false,
    governanceReviewRequired: false,
    jobId: null,
    jobName: null,
    createdBy: "Marcus Webb",
    createdAt: "2026-01-15T09:00:00Z",
    updatedAt: "2026-05-01T09:00:00Z",
    auditIds: ["sched-audit-seed-003"],
  },
  {
    id: "sched-004",
    scheduleNumber: "SCH-2026-004",
    name: "Failed Sync Recovery Sweep",
    description: "Every 4 hours, sweep for failed accounting sync records and queue them for retry.",
    ruleId: "rule-001",
    ruleNumber: "AUT-2026-001",
    ruleName: "Notify CEO on Sync Failure",
    ruleCategory: "Operational",
    scheduleType: "Hourly",
    scheduleSummary: computeScheduleSummary("Hourly", { hourInterval: 4 }),
    config: { hourInterval: 4, timezone: "Europe/London" },
    status: "Active",
    nextRunAt: computeNextRun("Hourly", { hourInterval: 4 }, SEED_BASE),
    lastRunAt: "2026-06-01T04:00:00Z",
    runCount: 180,
    successCount: 177,
    failureCount: 3,
    isFinanciallySensitive: false,
    isApprovalProtected: false,
    governanceReviewRequired: false,
    jobId: null,
    jobName: null,
    createdBy: "Marcus Webb",
    createdAt: "2026-03-01T09:00:00Z",
    updatedAt: "2026-06-01T04:00:00Z",
    auditIds: ["sched-audit-seed-004"],
  },
  {
    id: "sched-005",
    scheduleNumber: "SCH-2026-005",
    name: "Draft Invoice Weekly Audit",
    description: "Every Friday at 17:00, audit all draft invoices generated during the week and flag any requiring CEO review.",
    ruleId: "rule-004",
    ruleNumber: "AUT-2026-004",
    ruleName: "Generate Draft Invoice on Job Completion",
    ruleCategory: "FinanciallySensitive",
    scheduleType: "Weekly",
    scheduleSummary: computeScheduleSummary("Weekly", { weeklyDay: 5, weeklyHour: 17 }),
    config: { weeklyDay: 5, weeklyHour: 17, timezone: "Europe/London" },
    status: "Paused",
    nextRunAt: computeNextRun("Weekly", { weeklyDay: 5, weeklyHour: 17 }, SEED_BASE),
    lastRunAt: "2026-05-29T17:00:00Z",
    runCount: 4,
    successCount: 3,
    failureCount: 1,
    isFinanciallySensitive: true,
    isApprovalProtected: true,
    governanceReviewRequired: true,
    jobId: null,
    jobName: null,
    createdBy: "Marcus Webb",
    createdAt: "2026-05-01T09:00:00Z",
    updatedAt: "2026-05-29T17:00:00Z",
    auditIds: ["sched-audit-seed-005"],
  },
  {
    id: "sched-006",
    scheduleNumber: "SCH-2026-006",
    name: "Low Stock Monthly Review",
    description: "On the 15th of every month, review all low-stock alerts and generate a summary report.",
    ruleId: "rule-006",
    ruleNumber: "AUT-2026-006",
    ruleName: "Low Stock Alert Notification",
    ruleCategory: "Operational",
    scheduleType: "Monthly",
    scheduleSummary: computeScheduleSummary("Monthly", { monthlyDay: 15, monthlyHour: 10 }),
    config: { monthlyDay: 15, monthlyHour: 10, timezone: "Europe/London" },
    status: "Disabled",
    nextRunAt: computeNextRun("Monthly", { monthlyDay: 15, monthlyHour: 10 }, SEED_BASE),
    lastRunAt: null,
    runCount: 0,
    successCount: 0,
    failureCount: 0,
    isFinanciallySensitive: false,
    isApprovalProtected: false,
    governanceReviewRequired: false,
    jobId: null,
    jobName: null,
    createdBy: "Sarah Chen",
    createdAt: "2026-05-31T11:00:00Z",
    updatedAt: "2026-05-31T11:00:00Z",
    auditIds: [],
  },
];

// ──────────────────────────────────────────────────────
// SEED DATA — AUDIT ENTRIES
// ──────────────────────────────────────────────────────

const SEED_SCHEDULE_AUDIT: ScheduleAuditEntry[] = [
  {
    id: "sched-audit-seed-001",
    scheduleId: "sched-001",
    scheduleName: "Daily Review Escalation",
    ruleId: "rule-002",
    ruleNumber: "AUT-2026-002",
    ruleName: "Auto-assign PM on Job Creation",
    eventType: "Schedule Created",
    performedBy: "Marcus Webb",
    previousStatus: null,
    newStatus: "Active",
    notes: "Schedule created and activated.",
    timestamp: "2026-05-01T09:00:00Z",
    jobId: null,
    jobName: null,
  },
  {
    id: "sched-audit-seed-002",
    scheduleId: "sched-002",
    scheduleName: "Weekly Payroll Preparation",
    ruleId: "rule-003",
    ruleNumber: "AUT-2026-003",
    ruleName: "Queue Accounting Sync on Review Approval",
    eventType: "Schedule Created",
    performedBy: "Marcus Webb",
    previousStatus: null,
    newStatus: "Active",
    notes: "Weekly payroll schedule created. Approval protection active.",
    timestamp: "2026-04-07T08:00:00Z",
    jobId: null,
    jobName: null,
  },
  {
    id: "sched-audit-seed-003",
    scheduleId: "sched-003",
    scheduleName: "Monthly Asset Service Reminder",
    ruleId: "rule-001",
    ruleNumber: "AUT-2026-001",
    ruleName: "Notify CEO on Sync Failure",
    eventType: "Schedule Created",
    performedBy: "Marcus Webb",
    previousStatus: null,
    newStatus: "Active",
    notes: "Monthly asset service reminder schedule created.",
    timestamp: "2026-01-15T09:00:00Z",
    jobId: null,
    jobName: null,
  },
  {
    id: "sched-audit-seed-004",
    scheduleId: "sched-004",
    scheduleName: "Failed Sync Recovery Sweep",
    ruleId: "rule-001",
    ruleNumber: "AUT-2026-001",
    ruleName: "Notify CEO on Sync Failure",
    eventType: "Schedule Created",
    performedBy: "Marcus Webb",
    previousStatus: null,
    newStatus: "Active",
    notes: "Hourly sync recovery sweep created.",
    timestamp: "2026-03-01T09:00:00Z",
    jobId: null,
    jobName: null,
  },
  {
    id: "sched-audit-seed-005",
    scheduleId: "sched-005",
    scheduleName: "Draft Invoice Weekly Audit",
    ruleId: "rule-004",
    ruleNumber: "AUT-2026-004",
    ruleName: "Generate Draft Invoice on Job Completion",
    eventType: "Schedule Paused",
    performedBy: "Marcus Webb",
    previousStatus: "Active",
    newStatus: "Paused",
    notes: "Paused pending governance review for FinanciallySensitive category.",
    timestamp: "2026-05-29T17:05:00Z",
    jobId: null,
    jobName: null,
  },
];

// ──────────────────────────────────────────────────────
// SEED DATA — EXECUTIONS
// ──────────────────────────────────────────────────────

const SEED_SCHEDULE_EXECUTIONS: AutomationScheduleExecution[] = [
  {
    id: "sched-exec-001",
    scheduleId: "sched-001",
    scheduleName: "Daily Review Escalation",
    ruleId: "rule-002",
    ruleName: "Auto-assign PM on Job Creation",
    ruleNumber: "AUT-2026-002",
    executedAt: "2026-05-31T09:00:00Z",
    result: "success",
    resultMessage: "Daily review escalation executed successfully. 3 submissions queued.",
    jobId: null,
    jobName: null,
    ruleAttribution: "AUT-2026-002",
    sourceAttribution: "scheduler",
    approvalState: "not_required",
  },
  {
    id: "sched-exec-002",
    scheduleId: "sched-002",
    scheduleName: "Weekly Payroll Preparation",
    ruleId: "rule-003",
    ruleName: "Queue Accounting Sync on Review Approval",
    ruleNumber: "AUT-2026-003",
    executedAt: "2026-05-25T08:00:00Z",
    result: "success",
    resultMessage: "Payroll sync queue updated. 12 timesheets queued for export. Approval required before sync proceeds.",
    jobId: null,
    jobName: null,
    ruleAttribution: "AUT-2026-003",
    sourceAttribution: "scheduler",
    approvalState: "pending",
  },
  {
    id: "sched-exec-003",
    scheduleId: "sched-004",
    scheduleName: "Failed Sync Recovery Sweep",
    ruleId: "rule-001",
    ruleName: "Notify CEO on Sync Failure",
    ruleNumber: "AUT-2026-001",
    executedAt: "2026-06-01T04:00:00Z",
    result: "success",
    resultMessage: "Recovery sweep completed. 0 failed records detected.",
    jobId: null,
    jobName: null,
    ruleAttribution: "AUT-2026-001",
    sourceAttribution: "scheduler",
    approvalState: "not_required",
  },
  {
    id: "sched-exec-004",
    scheduleId: "sched-005",
    scheduleName: "Draft Invoice Weekly Audit",
    ruleId: "rule-004",
    ruleName: "Generate Draft Invoice on Job Completion",
    ruleNumber: "AUT-2026-004",
    executedAt: "2026-05-29T17:00:00Z",
    result: "blocked_approval_required",
    resultMessage: "Execution blocked: draft invoice audit requires CEO approval before proceeding.",
    jobId: null,
    jobName: null,
    ruleAttribution: "AUT-2026-004",
    sourceAttribution: "scheduler",
    approvalState: "pending",
  },
];

// ──────────────────────────────────────────────────────
// INITIALISE STORES
// ──────────────────────────────────────────────────────

_schedules = [...SEED_SCHEDULES];
_scheduleAuditLog.push(...SEED_SCHEDULE_AUDIT);
_scheduleExecutions.push(...SEED_SCHEDULE_EXECUTIONS);
