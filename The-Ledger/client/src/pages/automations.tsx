/**
 * PHASE 6.0E — AUTOMATION CENTRE + SCHEDULER
 *
 * Extends Phase 6.0C/D with:
 *   - Scheduler tab (4th tab in Automation Centre)
 *   - Scheduler KPI strip
 *   - Scheduler table (search, status filter, type filter)
 *   - Schedule Detail Dialog (linked rule, type, next run, upcoming runs, governance)
 *   - CEO-only schedule actions: Pause, Resume, Disable
 *   - Builder integration: "Scheduled Execution" trigger option
 *   - Builder schedule config form + Next Run Preview
 *   - All schedule actions generate immutable audit entries
 *
 * Doctrine:
 *   Schedulers may QUEUE actions.
 *   Schedulers may NEVER approve anything.
 *   All schedule actions generate immutable audit records.
 *   FinanciallySensitive schedules show Approval Protected indicator.
 *   Job attribution preserved in all records.
 */

import { useState, useMemo } from "react";
import { Layout } from "@/components/layout";
import { AutomationExecutiveDashboard } from "@/components/automation/AutomationExecutiveDashboard";
import { AutomationCatalogue, buildCatalogueRows } from "@/components/automation/AutomationCatalogue";
import { AutomationExecutionMonitor } from "@/components/automation/AutomationExecutionMonitor";
import { AutomationApprovalQueue } from "@/components/automation/AutomationApprovalQueue";
import { AutomationSchedulerTimeline, estimatedRecurrence } from "@/components/automation/AutomationSchedulerTimeline";
import { AutomationGovernanceDashboard } from "@/components/automation/AutomationGovernanceDashboard";
import { AutomationAuditCentre } from "@/components/automation/AutomationAuditCentre";
import {
  GOVERNANCE_STATUS_LABELS,
  GOVERNANCE_STATUS_COLORS,
  RISK_LEVEL_LABELS,
  RISK_LEVEL_COLORS,
  getAllGovernanceRecords,
  getGovernanceRecordByRuleId,
} from "@/lib/automationGovernanceEngine";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";
import {
  Zap,
  Search,
  CheckCircle2,
  XCircle,
  Clock,
  ShieldAlert,
  Eye,
  Activity,
  AlertTriangle,
  ListChecks,
  History,
  FileSearch,
  Plus,
  ChevronRight,
  ChevronLeft,
  Copy,
  Archive,
  Edit,
  Trash2,
  CalendarClock,
  PauseCircle,
  PlayCircle,
  Ban,
  CalendarCheck,
  Inbox,
  CalendarRange,
} from "lucide-react";
import {
  type AutomationRule,
  type AutomationStatus,
  type AutomationCategory,
  AUTOMATION_STATUS_LABELS,
  AUTOMATION_STATUS_COLORS,
  AUTOMATION_CATEGORY_LABELS,
  AUTOMATION_CATEGORY_COLORS,
  computeAutomationRuleSummary,
  getActionsForRule,
  getTriggerById,
  TRIGGER_CATALOGUE_V1,
  ACTION_CATALOGUE_V1,
} from "@/lib/automationEngine";
import {
  type AutomationAuditEntry,
  AUTOMATION_EXECUTION_RESULT_LABELS,
  AUTOMATION_EXECUTION_RESULT_COLORS,
  SEED_EXECUTION_HISTORY,
  getAutomationAuditHistory,
} from "@/lib/automationAuditEngine";
import {
  type BuilderFormState,
  type BuilderCondition,
  type BuilderStep,
  BUILDER_FORM_DEFAULTS,
  BUILDER_STEP_LABELS,
  CONDITION_OPERATOR_LABELS,
  validateBuilderForm,
  formContainsForbiddenAction,
  createRuleFromBuilder,
  updateRuleFromBuilder,
  duplicateRule,
  archiveRule,
  getAllRules,
  ruleToBuilderForm,
} from "@/lib/automationBuilderEngine";
import {
  type AutomationSchedule,
  type AutomationScheduleStatus,
  type AutomationScheduleType,
  type ScheduleConfig,
  SCHEDULE_TYPE_LABELS,
  SCHEDULE_TYPE_COLORS,
  SCHEDULE_STATUS_LABELS,
  SCHEDULE_STATUS_COLORS,
  SCHEDULE_EXECUTION_RESULT_LABELS,
  SCHEDULE_EXECUTION_RESULT_COLORS,
  getAllSchedules,
  getScheduleAuditLog,
  getScheduleExecutions,
  filterSchedulesByStatus,
  filterSchedulesByType,
  searchSchedules,
  computeScheduleSummaryKPIs,
  computeNextRun,
  computeScheduleSummary,
  getUpcomingRuns,
  pauseSchedule,
  resumeSchedule,
  disableSchedule,
} from "@/lib/automationSchedulerEngine";

// ── Formatters ──────────────────────────────────────────────────────

function fmtDateTime(iso: string | null) {
  if (!iso) return <span className="text-muted-foreground text-xs">—</span>;
  return (
    <span className="font-mono text-xs text-muted-foreground whitespace-nowrap">
      {new Date(iso).toLocaleString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })}
    </span>
  );
}

function fmtDateTimeShort(iso: string) {
  return new Date(iso).toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// ── Status Badge ──────────────────────────────────────────────────────

function StatusBadge({ status }: { status: AutomationStatus }) {
  return (
    <Badge
      variant="outline"
      className={`text-xs ${AUTOMATION_STATUS_COLORS[status]}`}
      data-testid={`aut-status-${status}`}
    >
      {AUTOMATION_STATUS_LABELS[status]}
    </Badge>
  );
}

// ── Category Badge ──────────────────────────────────────────────────────

function CategoryBadge({ category }: { category: AutomationCategory }) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge
            variant="outline"
            className={`text-xs ${AUTOMATION_CATEGORY_COLORS[category]}`}
            data-testid={`aut-category-${category}`}
          >
            {category === "FinanciallySensitive" && (
              <ShieldAlert className="h-3 w-3 mr-1" />
            )}
            {AUTOMATION_CATEGORY_LABELS[category]}
          </Badge>
        </TooltipTrigger>
        {category === "FinanciallySensitive" && (
          <TooltipContent>
            <p>Requires approval validation before execution.</p>
          </TooltipContent>
        )}
      </Tooltip>
    </TooltipProvider>
  );
}

// ── Result Badge ─────────────────────────────────────────────────────────

function ResultBadge({ result }: { result: string }) {
  const label = AUTOMATION_EXECUTION_RESULT_LABELS[result as keyof typeof AUTOMATION_EXECUTION_RESULT_LABELS] ?? result;
  const color = AUTOMATION_EXECUTION_RESULT_COLORS[result as keyof typeof AUTOMATION_EXECUTION_RESULT_COLORS] ?? "";
  return (
    <Badge
      variant="outline"
      className={`text-xs ${color}`}
      data-testid={`aut-result-${result}`}
    >
      {label}
    </Badge>
  );
}

// ── Schedule Status Badge ───────────────────────────────────────────────

function ScheduleStatusBadge({ status }: { status: AutomationScheduleStatus }) {
  return (
    <Badge
      variant="outline"
      className={`text-xs ${SCHEDULE_STATUS_COLORS[status]}`}
      data-testid={`sched-status-${status.toLowerCase()}`}
    >
      {SCHEDULE_STATUS_LABELS[status]}
    </Badge>
  );
}

// ── Schedule Type Badge ───────────────────────────────────────────────

function ScheduleTypeBadge({ type }: { type: AutomationScheduleType }) {
  return (
    <Badge
      variant="outline"
      className={`text-xs ${SCHEDULE_TYPE_COLORS[type]}`}
      data-testid={`sched-type-${type.toLowerCase()}`}
    >
      {SCHEDULE_TYPE_LABELS[type]}
    </Badge>
  );
}

// ── Builder Step Indicator ────────────────────────────────────────────

function StepIndicator({ current, total }: { current: BuilderStep; total: number }) {
  return (
    <div className="flex items-center gap-1 mb-4" data-testid="builder-step-indicator">
      {Array.from({ length: total }, (_, i) => {
        const step = (i + 1) as BuilderStep;
        const isActive = step === current;
        const isDone = step < current;
        return (
          <div key={step} className="flex items-center">
            <div
              className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold border ${
                isActive
                  ? "bg-violet-600 text-white border-violet-600"
                  : isDone
                  ? "bg-emerald-500 text-white border-emerald-500"
                  : "bg-muted text-muted-foreground border-border"
              }`}
              data-testid={`builder-step-${step}${isActive ? "-active" : ""}`}
            >
              {isDone ? "✓" : step}
            </div>
            {i < total - 1 && (
              <div className={`w-6 h-px mx-0.5 ${isDone ? "bg-emerald-400" : "bg-border"}`} />
            )}
          </div>
        );
      })}
      <span className="ml-2 text-xs text-muted-foreground">
        Step {current} of {total} — {BUILDER_STEP_LABELS[current]}
      </span>
    </div>
  );
}

// ── Schedule Config Form (used inside builder at Step 2) ────────────

function ScheduleConfigForm({
  scheduleType,
  config,
  onChange,
}: {
  scheduleType: AutomationScheduleType;
  config: ScheduleConfig;
  onChange: (c: ScheduleConfig) => void;
}) {
  const nextRun = useMemo(
    () => computeNextRun(scheduleType, config),
    [scheduleType, config]
  );

  return (
    <div className="mt-3 space-y-3 rounded-md border p-3 bg-muted/20" data-testid="builder-schedule-config">
      <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
        Schedule Configuration
      </div>

      {scheduleType === "Hourly" && (
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Interval (hours)</label>
          <select
            className="h-9 w-full rounded-md border bg-background px-3 text-sm"
            value={config.hourInterval ?? 1}
            onChange={(e) => onChange({ ...config, hourInterval: Number(e.target.value) })}
            data-testid="builder-schedule-hour-interval"
          >
            {[1, 2, 4, 6, 12].map((h) => (
              <option key={h} value={h}>Every {h} hour{h > 1 ? "s" : ""}</option>
            ))}
          </select>
        </div>
      )}

      {scheduleType === "Daily" && (
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Time of day</label>
          <select
            className="h-9 w-full rounded-md border bg-background px-3 text-sm"
            value={config.dailyHour ?? 9}
            onChange={(e) => onChange({ ...config, dailyHour: Number(e.target.value) })}
            data-testid="builder-schedule-daily-hour"
          >
            {Array.from({ length: 24 }, (_, h) => (
              <option key={h} value={h}>{String(h).padStart(2, "0")}:00</option>
            ))}
          </select>
        </div>
      )}

      {scheduleType === "Weekly" && (
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Day of week</label>
            <select
              className="h-9 w-full rounded-md border bg-background px-3 text-sm"
              value={config.weeklyDay ?? 1}
              onChange={(e) => onChange({ ...config, weeklyDay: Number(e.target.value) })}
              data-testid="builder-schedule-weekly-day"
            >
              {["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"].map((d, i) => (
                <option key={i} value={i}>{d}</option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Time</label>
            <select
              className="h-9 w-full rounded-md border bg-background px-3 text-sm"
              value={config.weeklyHour ?? 9}
              onChange={(e) => onChange({ ...config, weeklyHour: Number(e.target.value) })}
              data-testid="builder-schedule-weekly-hour"
            >
              {Array.from({ length: 24 }, (_, h) => (
                <option key={h} value={h}>{String(h).padStart(2, "0")}:00</option>
              ))}
            </select>
          </div>
        </div>
      )}

      {scheduleType === "Monthly" && (
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Day of month</label>
            <select
              className="h-9 w-full rounded-md border bg-background px-3 text-sm"
              value={config.monthlyDay ?? 1}
              onChange={(e) => onChange({ ...config, monthlyDay: Number(e.target.value) })}
              data-testid="builder-schedule-monthly-day"
            >
              {Array.from({ length: 28 }, (_, i) => i + 1).map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Time</label>
            <select
              className="h-9 w-full rounded-md border bg-background px-3 text-sm"
              value={config.monthlyHour ?? 9}
              onChange={(e) => onChange({ ...config, monthlyHour: Number(e.target.value) })}
              data-testid="builder-schedule-monthly-hour"
            >
              {Array.from({ length: 24 }, (_, h) => (
                <option key={h} value={h}>{String(h).padStart(2, "0")}:00</option>
              ))}
            </select>
          </div>
        </div>
      )}

      {scheduleType === "Custom" && (
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Schedule description</label>
          <Input
            placeholder="e.g. Every weekday at 08:30"
            value={config.customExpression ?? ""}
            onChange={(e) => onChange({ ...config, customExpression: e.target.value })}
            data-testid="builder-schedule-custom-expression"
          />
        </div>
      )}

      {/* Next Run Preview */}
      <div
        className="flex items-center gap-2 rounded-md bg-violet-50 border border-violet-200 px-3 py-2 text-sm"
        data-testid="builder-schedule-next-run-preview"
      >
        <CalendarCheck className="h-4 w-4 text-violet-500 shrink-0" />
        <span className="text-violet-700">
          <span className="font-semibold">Runs next: </span>
          {fmtDateTimeShort(nextRun)}
        </span>
      </div>
    </div>
  );
}

// ── Schedule Detail Dialog ─────────────────────────────────────────────────

function ScheduleDetailDialog({
  schedule,
  onClose,
  onPause,
  onResume,
  onDisable,
}: {
  schedule: AutomationSchedule;
  onClose: () => void;
  onPause: (s: AutomationSchedule) => void;
  onResume: (s: AutomationSchedule) => void;
  onDisable: (s: AutomationSchedule) => void;
}) {
  const upcomingRuns = useMemo(
    () => (schedule.status === "Active" ? getUpcomingRuns(schedule, 5) : []),
    [schedule]
  );

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[660px] max-h-[90vh] overflow-y-auto" data-testid="sched-detail-dialog">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarClock className="h-4 w-4" />
            {schedule.scheduleNumber}
          </DialogTitle>
          <DialogDescription>{schedule.name}</DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          {/* Linked Rule */}
          <section data-testid="sched-detail-linked-rule">
            <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Linked Rule</h4>
            <div className="rounded-md border p-3 text-sm">
              <div className="font-mono text-xs text-muted-foreground">{schedule.ruleNumber}</div>
              <div className="font-semibold mt-0.5">{schedule.ruleName}</div>
              <div className="mt-1">
                <CategoryBadge category={schedule.ruleCategory} />
              </div>
            </div>
          </section>

          {/* Schedule Type + Next / Last Run */}
          <section>
            <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Schedule Details</h4>
            <div className="rounded-md bg-muted/30 p-3 grid grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-xs text-muted-foreground">Type</span>
                <div className="mt-1"><ScheduleTypeBadge type={schedule.scheduleType} /></div>
              </div>
              <div>
                <span className="text-xs text-muted-foreground">Status</span>
                <div className="mt-1"><ScheduleStatusBadge status={schedule.status} /></div>
              </div>
              <div>
                <span className="text-xs text-muted-foreground">Schedule</span>
                <div className="mt-1 font-medium">{schedule.scheduleSummary}</div>
              </div>
              <div>
                <span className="text-xs text-muted-foreground">Next Run</span>
                <div className="mt-1" data-testid="sched-detail-next-run">{fmtDateTime(schedule.nextRunAt)}</div>
              </div>
              <div>
                <span className="text-xs text-muted-foreground">Last Run</span>
                <div className="mt-1">{fmtDateTime(schedule.lastRunAt)}</div>
              </div>
              <div>
                <span className="text-xs text-muted-foreground">Total Runs</span>
                <div className="mt-1 font-semibold">{schedule.runCount}</div>
              </div>
              <div className="col-span-2">
                <span className="text-xs text-muted-foreground">Estimated Recurrence</span>
                <div className="mt-1 font-medium" data-testid="sched-detail-recurrence">{estimatedRecurrence(schedule.scheduleType)}</div>
              </div>
            </div>
          </section>

          {/* Recent Execution History — UX-6.5 */}
          {(() => {
            const history = getScheduleExecutions()
              .filter((e) => e.scheduleId === schedule.id)
              .sort((a, b) => new Date(b.executedAt).getTime() - new Date(a.executedAt).getTime())
              .slice(0, 5);
            return (
              <section data-testid="sched-detail-history">
                <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Recent Execution History</h4>
                {history.length === 0 ? (
                  <p className="text-xs text-muted-foreground">No execution history recorded for this schedule.</p>
                ) : (
                  <div className="space-y-1">
                    {history.map((e) => (
                      <div key={e.id} className="flex items-center justify-between gap-2 rounded-md border px-3 py-1.5 text-xs">
                        <span className="font-mono text-muted-foreground">{fmtDateTimeShort(e.executedAt)}</span>
                        <Badge variant="outline" className={`text-[10px] ${SCHEDULE_EXECUTION_RESULT_COLORS[e.result]}`}>{SCHEDULE_EXECUTION_RESULT_LABELS[e.result]}</Badge>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            );
          })()}

          {/* Upcoming Runs */}
          {upcomingRuns.length > 0 && (
            <section data-testid="sched-detail-upcoming-runs">
              <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Upcoming Runs</h4>
              <div className="space-y-1">
                {upcomingRuns.map((run, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs font-mono text-muted-foreground">
                    <CalendarClock className="h-3 w-3 shrink-0" />
                    {fmtDateTimeShort(run)}
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Governance Status */}
          <section data-testid="sched-detail-governance">
            <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Governance Status</h4>
            <div className="space-y-2">
              {schedule.governanceReviewRequired && (
                <div className="flex items-center gap-2 rounded-md bg-amber-50 border border-amber-200 px-3 py-2 text-xs text-amber-700" data-testid="sched-detail-governance-review">
                  <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                  <span><span className="font-semibold">Governance Review Recommended</span> — This schedule is linked to a Critical or High Risk automation.</span>
                </div>
              )}
              {schedule.isFinanciallySensitive && (
                <div className="flex items-center gap-2 rounded-md bg-red-50 border border-red-200 px-3 py-2 text-xs text-red-700" data-testid="sched-detail-approval-protected">
                  <ShieldAlert className="h-3.5 w-3.5 shrink-0" />
                  <span><span className="font-semibold">Approval Protected</span> — Financially Sensitive. Actions queued by this schedule require CEO approval before execution.</span>
                </div>
              )}
              {!schedule.governanceReviewRequired && !schedule.isFinanciallySensitive && (
                <div className="flex items-center gap-2 rounded-md bg-emerald-50 border border-emerald-200 px-3 py-2 text-xs text-emerald-700">
                  <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                  <span>No governance concerns. Standard operational schedule.</span>
                </div>
              )}
            </div>
          </section>

          {/* CEO Actions */}
          <div className="flex flex-wrap gap-2 pt-1" data-testid="sched-detail-actions">
            {schedule.status === "Active" && (
              <Button
                size="sm"
                variant="outline"
                className="text-amber-700 border-amber-300 hover:bg-amber-50"
                onClick={() => onPause(schedule)}
                data-testid="sched-btn-pause"
              >
                <PauseCircle className="h-3.5 w-3.5 mr-1" /> Pause
              </Button>
            )}
            {schedule.status === "Paused" && (
              <Button
                size="sm"
                variant="outline"
                className="text-emerald-700 border-emerald-300 hover:bg-emerald-50"
                onClick={() => onResume(schedule)}
                data-testid="sched-btn-resume"
              >
                <PlayCircle className="h-3.5 w-3.5 mr-1" /> Resume
              </Button>
            )}
            {schedule.status !== "Disabled" && (
              <Button
                size="sm"
                variant="outline"
                className="text-slate-600 border-slate-300 hover:bg-slate-50"
                onClick={() => onDisable(schedule)}
                data-testid="sched-btn-disable"
              >
                <Ban className="h-3.5 w-3.5 mr-1" /> Disable
              </Button>
            )}
            <Button size="sm" variant="outline" onClick={onClose}>Close</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Automation Builder Dialog ────────────────────────────────────────────────

function AutomationBuilderDialog({
  editRule,
  onClose,
  onSaved,
}: {
  editRule: AutomationRule | null;
  onClose: () => void;
  onSaved: (rule: AutomationRule) => void;
}) {
  const isEdit = editRule !== null;
  const { toast } = useToast();

  const [step, setStep] = useState<BuilderStep>(1);
  const [form, setForm] = useState<BuilderFormState>(
    isEdit ? ruleToBuilderForm(editRule) : { ...BUILDER_FORM_DEFAULTS }
  );
  const [errors, setErrors] = useState<string[]>([]);

  // Schedule config state (only relevant when trigger is schedule_trigger)
  const [scheduleType, setScheduleType] = useState<AutomationScheduleType>("Daily");
  const [scheduleConfig, setScheduleConfig] = useState<ScheduleConfig>({ dailyHour: 9, timezone: "Europe/London" });

  const totalSteps = 5;
  const isFinSensitive = form.category === "FinanciallySensitive";
  const hasForbiddenAction = formContainsForbiddenAction(form);
  const isScheduledTrigger = form.triggerId === "trigger-schedule";

  // When schedule type changes, reset config
  function handleScheduleTypeChange(t: AutomationScheduleType) {
    setScheduleType(t);
    setScheduleConfig(
      t === "Hourly" ? { hourInterval: 1 } :
      t === "Daily" ? { dailyHour: 9 } :
      t === "Weekly" ? { weeklyDay: 1, weeklyHour: 9 } :
      t === "Monthly" ? { monthlyDay: 1, monthlyHour: 9 } :
      { customExpression: "" }
    );
  }

  function addCondition() {
    const newCond: BuilderCondition = { id: `cond-${Date.now()}`, field: "", operator: "equals", value: "" };
    setForm((prev) => ({ ...prev, conditions: [...prev.conditions, newCond] }));
  }

  function removeCondition(id: string) {
    setForm((prev) => ({ ...prev, conditions: prev.conditions.filter((c) => c.id !== id) }));
  }

  function updateCondition(id: string, patch: Partial<BuilderCondition>) {
    setForm((prev) => ({
      ...prev,
      conditions: prev.conditions.map((c) => c.id === id ? { ...c, ...patch } : c),
    }));
  }

  function toggleAction(actionId: string) {
    setForm((prev) => {
      const already = prev.actionIds.includes(actionId);
      return { ...prev, actionIds: already ? prev.actionIds.filter((id) => id !== actionId) : [...prev.actionIds, actionId] };
    });
  }

  function goNext() { if (step < totalSteps) setStep((s) => (s + 1) as BuilderStep); }
  function goBack() { if (step > 1) setStep((s) => (s - 1) as BuilderStep); }

  function handleSave() {
    const validation = validateBuilderForm(form);
    if (!validation.valid) { setErrors(validation.errors); return; }
    if (hasForbiddenAction) { setErrors(["One or more selected actions are forbidden and cannot be used."]); return; }
    try {
      if (isEdit) {
        const { rule } = updateRuleFromBuilder(editRule.id, form, "Marcus Webb");
        onSaved(rule);
        toast({ title: "Automation Updated", description: `'${rule.name}' has been updated.` });
      } else {
        const { rule } = createRuleFromBuilder(form, "Marcus Webb");
        onSaved(rule);
        toast({ title: "Automation Created", description: `'${rule.name}' is now active.` });
      }
      onClose();
    } catch (e: unknown) {
      setErrors([(e as Error).message]);
    }
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[680px] max-h-[90vh] overflow-y-auto" data-testid="aut-builder-dialog">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Zap className="h-4 w-4" />
            {isEdit ? "Edit Automation" : "Create Automation"}
          </DialogTitle>
          <DialogDescription>
            {isEdit ? `Editing '${editRule.ruleNumber}' — ${editRule.name}` : "Build a new automation rule using the guided steps below."}
          </DialogDescription>
        </DialogHeader>

        <StepIndicator current={step} total={totalSteps} />

        {/* STEP 1: Basic Details */}
        {step === 1 && (
          <div className="space-y-4" data-testid="builder-step-1">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Rule Name <span className="text-red-500">*</span></label>
              <Input placeholder="e.g. Notify CEO on sync failure" value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} data-testid="builder-input-name" />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Description <span className="text-red-500">*</span></label>
              <textarea
                className="w-full rounded-md border bg-background px-3 py-2 text-sm min-h-[80px] resize-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                placeholder="Describe what this automation does…"
                value={form.description}
                onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                data-testid="builder-input-description"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Category</label>
              <select
                className="h-9 w-full rounded-md border bg-background px-3 text-sm"
                value={form.category}
                onChange={(e) => setForm((p) => ({ ...p, category: e.target.value as AutomationCategory }))}
                data-testid="builder-select-category"
              >
                <option value="Operational">Operational</option>
                <option value="Workflow">Workflow</option>
                <option value="FinanciallySensitive">Financially Sensitive</option>
              </select>
            </div>
            {isFinSensitive && (
              <div className="flex items-start gap-2 rounded-md bg-red-50 border border-red-200 px-3 py-2.5 text-sm text-red-700" data-testid="builder-financial-warning">
                <ShieldAlert className="h-4 w-4 shrink-0 mt-0.5" />
                <p><span className="font-semibold">Financial Safeguard Warning — </span>This automation requires approval validation before execution.</p>
              </div>
            )}
          </div>
        )}

        {/* STEP 2: Trigger */}
        {step === 2 && (
          <div className="space-y-3" data-testid="builder-step-2">
            <p className="text-sm text-muted-foreground">Select the event that will trigger this automation.</p>
            {TRIGGER_CATALOGUE_V1.map((trigger) => (
              <div key={trigger.id}>
                <button
                  type="button"
                  onClick={() => setForm((p) => ({ ...p, triggerId: trigger.id }))}
                  className={`w-full text-left rounded-md border p-3 text-sm transition-colors ${
                    form.triggerId === trigger.id ? "border-violet-400 bg-violet-50" : "border-border hover:bg-muted/40"
                  }`}
                  data-testid={`builder-trigger-option-${trigger.id}`}
                >
                  <div className="flex items-center gap-2">
                    {trigger.type === "schedule_trigger" && <CalendarClock className="h-4 w-4 text-violet-500 shrink-0" />}
                    <div>
                      <div className="font-semibold">{trigger.label}</div>
                      <div className="text-muted-foreground text-xs mt-0.5">{trigger.description}</div>
                    </div>
                  </div>
                </button>

                {/* Scheduler config — shown inline when schedule_trigger is selected */}
                {form.triggerId === "trigger-schedule" && trigger.type === "schedule_trigger" && (
                  <div className="mt-2" data-testid="builder-schedule-form">
                    <div className="space-y-2">
                      <div className="space-y-1.5">
                        <label className="text-sm font-medium">Schedule Type</label>
                        <select
                          className="h-9 w-full rounded-md border bg-background px-3 text-sm"
                          value={scheduleType}
                          onChange={(e) => handleScheduleTypeChange(e.target.value as AutomationScheduleType)}
                          data-testid="builder-schedule-type"
                        >
                          <option value="Hourly">Hourly</option>
                          <option value="Daily">Daily</option>
                          <option value="Weekly">Weekly</option>
                          <option value="Monthly">Monthly</option>
                          <option value="Custom">Custom</option>
                        </select>
                      </div>
                      <ScheduleConfigForm
                        scheduleType={scheduleType}
                        config={scheduleConfig}
                        onChange={setScheduleConfig}
                      />
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* STEP 3: Conditions */}
        {step === 3 && (
          <div className="space-y-3" data-testid="builder-step-3">
            <p className="text-sm text-muted-foreground">Optionally add conditions. Leave empty to always fire on trigger.</p>
            {form.conditions.length === 0 && (
              <div className="rounded-md border border-dashed p-4 text-center text-xs text-muted-foreground">
                No conditions added. Actions will fire on every trigger event.
              </div>
            )}
            {form.conditions.map((cond, idx) => (
              <div key={cond.id} className="flex flex-wrap items-center gap-2 rounded-md border p-2" data-testid={`builder-condition-row-${idx}`}>
                <Input placeholder="Field" value={cond.field} onChange={(e) => updateCondition(cond.id, { field: e.target.value })} className="w-28 text-xs h-8" data-testid={`builder-condition-field-${idx}`} />
                <select className="h-8 rounded-md border bg-background px-2 text-xs" value={cond.operator} onChange={(e) => updateCondition(cond.id, { operator: e.target.value as BuilderCondition["operator"] })} data-testid={`builder-condition-operator-${idx}`}>
                  {Object.entries(CONDITION_OPERATOR_LABELS).map(([k, v]) => (<option key={k} value={k}>{v}</option>))}
                </select>
                <Input placeholder="Value" value={cond.value} onChange={(e) => updateCondition(cond.id, { value: e.target.value })} className="w-28 text-xs h-8" data-testid={`builder-condition-value-${idx}`} />
                <button type="button" onClick={() => removeCondition(cond.id)} className="ml-auto text-muted-foreground hover:text-destructive" data-testid={`builder-condition-remove-${idx}`}><Trash2 className="h-3.5 w-3.5" /></button>
              </div>
            ))}
            <Button type="button" size="sm" variant="outline" onClick={addCondition} data-testid="builder-btn-add-condition">
              <Plus className="h-3.5 w-3.5 mr-1" /> Add Condition
            </Button>
          </div>
        )}

        {/* STEP 4: Actions */}
        {step === 4 && (
          <div className="space-y-3" data-testid="builder-step-4">
            <p className="text-sm text-muted-foreground">Select one or more actions to execute when this rule fires.</p>
            {ACTION_CATALOGUE_V1.map((action) => {
              const selected = form.actionIds.includes(action.id);
              return (
                <button key={action.id} type="button" onClick={() => toggleAction(action.id)}
                  className={`w-full text-left rounded-md border p-3 text-sm transition-colors ${
                    selected ? "border-violet-400 bg-violet-50" : "border-border hover:bg-muted/40"
                  }`}
                  data-testid={`builder-action-option-${action.id}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="font-semibold">{action.label}</div>
                      <div className="text-muted-foreground text-xs mt-0.5">{action.description}</div>
                    </div>
                    <Badge variant="outline" className={`text-xs shrink-0 ${AUTOMATION_CATEGORY_COLORS[action.safetyClass]}`}>{action.safetyClass}</Badge>
                  </div>
                </button>
              );
            })}
            {hasForbiddenAction && (
              <div className="flex items-start gap-2 rounded-md bg-red-50 border border-red-200 px-3 py-2.5 text-sm text-red-700" data-testid="builder-forbidden-action-warning">
                <ShieldAlert className="h-4 w-4 shrink-0 mt-0.5" />
                <p>One or more selected actions are <span className="font-semibold">forbidden</span>. Automations may never create approved financial records or bypass approval workflows.</p>
              </div>
            )}
          </div>
        )}

        {/* STEP 5: Review */}
        {step === 5 && (
          <div className="space-y-4" data-testid="builder-step-5">
            <div className="rounded-md bg-muted/30 p-4 space-y-3 text-sm">
              <div><span className="text-xs text-muted-foreground uppercase tracking-wide">Rule Name</span><div className="font-semibold mt-0.5">{form.name || <em className="text-muted-foreground">Not set</em>}</div></div>
              <div><span className="text-xs text-muted-foreground uppercase tracking-wide">Category</span><div className="mt-0.5"><CategoryBadge category={form.category} /></div></div>
              <div>
                <span className="text-xs text-muted-foreground uppercase tracking-wide">Trigger</span>
                <div className="font-medium mt-0.5">
                  {form.triggerId ? TRIGGER_CATALOGUE_V1.find((t) => t.id === form.triggerId)?.label : <em className="text-muted-foreground">Not selected</em>}
                </div>
                {isScheduledTrigger && (
                  <div className="mt-1 text-xs text-muted-foreground font-mono">
                    {computeScheduleSummary(scheduleType, scheduleConfig)}
                  </div>
                )}
              </div>
              {form.conditions.length > 0 && (
                <div>
                  <span className="text-xs text-muted-foreground uppercase tracking-wide">Conditions</span>
                  <div className="mt-1 space-y-1">{form.conditions.map((c, i) => (<div key={i} className="font-mono text-xs bg-muted px-2 py-1 rounded">{c.field} {c.operator} {c.value}</div>))}</div>
                </div>
              )}
              <div>
                <span className="text-xs text-muted-foreground uppercase tracking-wide">Actions ({form.actionIds.length})</span>
                <div className="mt-1 space-y-1">
                  {form.actionIds.length === 0 ? <em className="text-muted-foreground">None selected</em> :
                    form.actionIds.map((id) => { const action = ACTION_CATALOGUE_V1.find((a) => a.id === id); return (<div key={id} className="text-xs rounded border px-2 py-1">{action?.label ?? id}</div>); })}
                </div>
              </div>
              {isFinSensitive && (
                <div className="flex items-center gap-2 rounded-md bg-red-50 border border-red-200 px-3 py-2 text-xs text-red-700" data-testid="builder-review-financial-safeguard">
                  <ShieldAlert className="h-3.5 w-3.5 shrink-0" />
                  Financial Safeguard: Approval required before execution.
                </div>
              )}
            </div>
            {errors.length > 0 && (
              <div className="rounded-md bg-red-50 border border-red-200 px-3 py-2.5 text-sm text-red-700 space-y-1">
                {errors.map((e, i) => <p key={i}>{e}</p>)}
              </div>
            )}
          </div>
        )}

        {/* Navigation */}
        <div className="flex items-center justify-between pt-4 border-t mt-4">
          <div className="flex gap-2">
            {step > 1 && <Button size="sm" variant="outline" onClick={goBack} data-testid="builder-btn-back"><ChevronLeft className="h-3.5 w-3.5 mr-1" /> Back</Button>}
            <Button size="sm" variant="outline" onClick={onClose} data-testid="builder-btn-cancel">Cancel</Button>
          </div>
          <div>
            {step < totalSteps ? (
              <Button size="sm" onClick={goNext} data-testid="builder-btn-next">Next <ChevronRight className="h-3.5 w-3.5 ml-1" /></Button>
            ) : (
              <Button size="sm" onClick={handleSave} disabled={hasForbiddenAction} data-testid="builder-btn-save">
                {isEdit ? "Save Changes" : "Create Automation"}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Rule Detail Dialog ───────────────────────────────────────────────────────

function RuleDetailDialog({
  rule, onClose, onToggle, onEdit, onDuplicate, onArchive,
}: {
  rule: AutomationRule; onClose: () => void; onToggle: (r: AutomationRule) => void;
  onEdit: (r: AutomationRule) => void; onDuplicate: (r: AutomationRule) => void; onArchive: (r: AutomationRule) => void;
}) {
  const trigger = getTriggerById(rule.triggerId);
  const actions = getActionsForRule(rule);
  const meta = useMemo(
    () => buildCatalogueRows([rule], getAllGovernanceRecords(), getAllSchedules())[0],
    [rule]
  );
  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[640px] max-h-[90vh] overflow-y-auto" data-testid="aut-rule-detail-dialog">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Zap className="h-4 w-4" />{rule.ruleNumber}</DialogTitle>
          <DialogDescription>{rule.name}</DialogDescription>
        </DialogHeader>
        <div className="space-y-5">
          <section>
            <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Rule Information</h4>
            <div className="rounded-md bg-muted/30 p-3 text-sm space-y-3">
              <p className="text-muted-foreground">{rule.description}</p>
              <div className="grid grid-cols-2 gap-3">
                <div><span className="text-xs text-muted-foreground">Status</span><div className="mt-1"><StatusBadge status={rule.status} /></div></div>
                <div><span className="text-xs text-muted-foreground">Category</span><div className="mt-1"><CategoryBadge category={rule.category} /></div></div>
                <div><span className="text-xs text-muted-foreground">Created By</span><div className="mt-1 font-medium text-sm">{rule.createdBy}</div></div>
                <div><span className="text-xs text-muted-foreground">Executions</span><div className="mt-1 font-medium text-sm">{rule.executionCount}</div></div>
              </div>
            </div>
          </section>
          <section data-testid="aut-rule-detail-trigger">
            <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Trigger</h4>
            {trigger ? (<div className="rounded-md border p-3 text-sm"><div className="font-semibold">{trigger.label}</div><div className="text-muted-foreground text-xs mt-0.5">{trigger.description}</div></div>) : (<div className="text-xs text-muted-foreground">Unknown trigger</div>)}
          </section>
          {Object.keys(rule.conditions).length > 0 && (
            <section><h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Conditions</h4><div className="rounded-md border p-3 text-sm space-y-1">{Object.entries(rule.conditions).map(([key, val]) => (<div key={key} className="flex items-center gap-2"><span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">{key}</span><span className="text-muted-foreground">=</span><span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">{String(val)}</span></div>))}</div></section>
          )}
          <section data-testid="aut-rule-detail-actions">
            <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Actions</h4>
            <div className="space-y-2">{actions.map((action) => (<div key={action.id} className="flex items-start justify-between rounded-md border p-3 text-sm"><div><div className="font-semibold">{action.label}</div><div className="text-muted-foreground text-xs mt-0.5">{action.description}</div></div><Badge variant="outline" className={`text-xs ml-3 shrink-0 ${AUTOMATION_CATEGORY_COLORS[action.safetyClass]}`}>{action.safetyClass}</Badge></div>))}</div>
          </section>
          {/* Execution Statistics — UX-6.2 */}
          <section data-testid="aut-rule-detail-stats">
            <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Execution Statistics</h4>
            <div className="rounded-md bg-muted/30 p-3 grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
              <div><span className="text-xs text-muted-foreground">Total Runs</span><div className="mt-1 font-semibold">{meta?.totalExecutions ?? rule.executionCount}</div></div>
              <div><span className="text-xs text-muted-foreground">Success Rate</span><div className="mt-1 font-semibold" data-testid="aut-rule-detail-success-rate">{meta?.successRate !== null && meta?.successRate !== undefined ? `${meta.successRate}%` : "—"}</div></div>
              <div><span className="text-xs text-muted-foreground">Last Execution</span><div className="mt-1">{fmtDateTime(rule.lastExecutedAt)}</div></div>
              <div><span className="text-xs text-muted-foreground">Next Execution</span><div className="mt-1" data-testid="aut-rule-detail-next-run">{fmtDateTime(meta?.nextRunAt ?? null)}</div></div>
            </div>
          </section>

          {/* Schedule Summary — UX-6.2 */}
          {meta?.schedule && (
            <section data-testid="aut-rule-detail-schedule">
              <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Schedule</h4>
              <div className="rounded-md border p-3 text-sm flex items-start justify-between gap-3">
                <div>
                  <div className="font-mono text-xs text-muted-foreground">{meta.schedule.scheduleNumber}</div>
                  <div className="font-medium mt-0.5">{meta.schedule.scheduleSummary}</div>
                </div>
                <Badge variant="outline" className={`text-xs shrink-0 ${SCHEDULE_STATUS_COLORS[meta.schedule.status]}`}>{SCHEDULE_STATUS_LABELS[meta.schedule.status]}</Badge>
              </div>
            </section>
          )}

          {/* Governance Status — UX-6.2 */}
          {meta?.governanceStatus && (
            <section data-testid="aut-rule-detail-governance">
              <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Governance Status</h4>
              <div className="rounded-md border p-3 text-sm space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline" className={`text-xs ${GOVERNANCE_STATUS_COLORS[meta.governanceStatus]}`}>{GOVERNANCE_STATUS_LABELS[meta.governanceStatus]}</Badge>
                  {meta.riskLevel && (<Badge variant="outline" className={`text-xs ${RISK_LEVEL_COLORS[meta.riskLevel]}`}>{RISK_LEVEL_LABELS[meta.riskLevel]} Risk</Badge>)}
                  {meta.isApprovalProtected && (<Badge variant="outline" className="text-xs text-violet-700 border-violet-200 bg-violet-50"><ShieldAlert className="h-3 w-3 mr-1" />Approval Protected</Badge>)}
                </div>
                {meta.governance?.riskRationale && (<p className="text-xs text-muted-foreground">{meta.governance.riskRationale}</p>)}
              </div>
            </section>
          )}

          {rule.category === "FinanciallySensitive" && (
            <section data-testid="aut-rule-detail-financial-safeguard">
              <div className="flex items-center gap-2 rounded-md bg-red-50 border border-red-200 px-3 py-2.5 text-sm text-red-700"><ShieldAlert className="h-4 w-4 shrink-0" /><div><span className="font-semibold">Financially Sensitive — </span>Approval Required before execution.</div></div>
            </section>
          )}
          <div className="flex flex-wrap gap-2 pt-1">
            {rule.status !== "archived" && (<Button size="sm" variant="outline" onClick={() => onEdit(rule)} data-testid="aut-btn-edit-rule"><Edit className="h-3.5 w-3.5 mr-1" /> Edit</Button>)}
            <Button size="sm" variant="outline" onClick={() => onDuplicate(rule)} data-testid="aut-btn-duplicate-rule"><Copy className="h-3.5 w-3.5 mr-1" /> Duplicate</Button>
            {rule.status === "active" ? (<Button size="sm" variant="outline" className="text-amber-700 border-amber-300 hover:bg-amber-50" onClick={() => onToggle(rule)} data-testid="aut-btn-disable-rule"><XCircle className="h-3.5 w-3.5 mr-1" /> Disable Rule</Button>) : rule.status === "disabled" ? (<Button size="sm" variant="outline" className="text-emerald-700 border-emerald-300 hover:bg-emerald-50" onClick={() => onToggle(rule)} data-testid="aut-btn-enable-rule"><CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Enable Rule</Button>) : null}
            {rule.status !== "archived" && (<Button size="sm" variant="outline" className="text-stone-600 border-stone-300 hover:bg-stone-50" onClick={() => onArchive(rule)} data-testid="aut-btn-archive-rule"><Archive className="h-3.5 w-3.5 mr-1" /> Archive</Button>)}
            <Button size="sm" variant="outline" onClick={onClose}>Close</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Execution Detail Dialog ────────────────────────────────────────────────────

const EXEC_COMPLETION_SECONDS: Record<string, number> = {
  success: 1.2,
  blocked_approval_required: 0.4,
  blocked_forbidden_action: 0.3,
  blocked_condition_not_met: 0.3,
  failed: 3.1,
};

function ExecutionDetailDialog({ entry, onClose }: { entry: AutomationAuditEntry; onClose: () => void }) {
  const governance = useMemo(() => getGovernanceRecordByRuleId(entry.ruleId), [entry.ruleId]);
  const duration = EXEC_COMPLETION_SECONDS[entry.result] ?? 1.0;
  const isBlocked = entry.result.startsWith("blocked");
  const isFailure = entry.result === "failed";
  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[560px] max-h-[90vh] overflow-y-auto" data-testid="aut-execution-detail-dialog">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Activity className="h-4 w-4" /> Execution Detail</DialogTitle>
          <DialogDescription className="font-mono text-xs">{entry.executionId}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div><span className="text-xs text-muted-foreground">Rule</span><div className="mt-1 font-semibold">{entry.ruleNumber}</div><div className="text-xs text-muted-foreground truncate">{entry.ruleName}</div></div>
            <div><span className="text-xs text-muted-foreground">Outcome</span><div className="mt-1"><ResultBadge result={entry.result} /></div></div>
            <div><span className="text-xs text-muted-foreground">Trigger</span><div className="mt-1 text-sm font-mono">{entry.triggerType}</div></div>
            <div><span className="text-xs text-muted-foreground">Triggered By</span><div className="mt-1 font-medium">{entry.initiatedBy}</div></div>
            {entry.jobName && (<div><span className="text-xs text-muted-foreground">Job</span><div className="mt-1 font-medium truncate">{entry.jobName}</div></div>)}
            <div><span className="text-xs text-muted-foreground">Timestamp</span><div className="mt-1">{fmtDateTime(entry.timestamp)}</div></div>
          </div>

          {/* Actions evaluated + duration — UX-6.3 */}
          <section data-testid="aut-exec-detail-actions">
            <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Action Evaluated</h4>
            <div className="rounded-md border p-3 text-sm flex items-center justify-between gap-3">
              <div><div className="font-medium">{entry.actionLabel}</div><div className="text-xs text-muted-foreground font-mono">{entry.actionType}</div></div>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground shrink-0" data-testid="aut-exec-detail-duration"><Clock className="h-3.5 w-3.5" />{duration}s</div>
            </div>
          </section>

          {/* Governance checks + approval status — UX-6.3 */}
          <section data-testid="aut-exec-detail-governance">
            <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Governance & Approval</h4>
            <div className="rounded-md bg-muted/30 p-3 grid grid-cols-2 gap-3 text-sm">
              <div><span className="text-xs text-muted-foreground">Governance</span><div className="mt-1">{governance ? (<Badge variant="outline" className={`text-xs ${GOVERNANCE_STATUS_COLORS[governance.governanceStatus]}`}>{GOVERNANCE_STATUS_LABELS[governance.governanceStatus]}</Badge>) : <span className="text-xs text-muted-foreground">—</span>}</div></div>
              <div><span className="text-xs text-muted-foreground">Risk Level</span><div className="mt-1">{governance ? (<Badge variant="outline" className={`text-xs ${RISK_LEVEL_COLORS[governance.riskLevel]}`}>{RISK_LEVEL_LABELS[governance.riskLevel]}</Badge>) : <span className="text-xs text-muted-foreground">—</span>}</div></div>
              <div><span className="text-xs text-muted-foreground">Approval State</span><div className="mt-1 font-medium capitalize" data-testid="aut-exec-detail-approval">{entry.approvalStateAtExecution.replace(/_/g, " ")}</div></div>
              <div><span className="text-xs text-muted-foreground">Approval Required</span><div className="mt-1 font-medium">{governance?.isApprovalProtected ? "Yes — human-controlled" : "No"}</div></div>
            </div>
          </section>

          {/* Failure / block details — UX-6.3 */}
          {(isBlocked || isFailure) && (
            <section data-testid="aut-exec-detail-failure">
              <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">{isFailure ? "Failure Details" : "Block Details"}</h4>
              <div className={`flex items-start gap-2 rounded-md border px-3 py-2.5 text-sm ${isFailure ? "bg-red-50 border-red-200 text-red-700" : "bg-violet-50 border-violet-200 text-violet-700"}`}>
                {isFailure ? <XCircle className="h-4 w-4 shrink-0 mt-0.5" /> : <ShieldAlert className="h-4 w-4 shrink-0 mt-0.5" />}
                <p>{entry.resultMessage}</p>
              </div>
            </section>
          )}

          {/* Audit references — UX-6.3 */}
          <section data-testid="aut-exec-detail-audit">
            <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Audit References</h4>
            <div className="grid grid-cols-1 gap-1.5 text-xs">
              <div className="flex items-center justify-between gap-2"><span className="text-muted-foreground">Audit ID</span><span className="font-mono bg-muted px-2 py-0.5 rounded">{entry.id}</span></div>
              <div className="flex items-center justify-between gap-2"><span className="text-muted-foreground">Execution ID</span><span className="font-mono bg-muted px-2 py-0.5 rounded">{entry.executionId}</span></div>
              <div className="flex items-center justify-between gap-2"><span className="text-muted-foreground">Rule ID</span><span className="font-mono bg-muted px-2 py-0.5 rounded">{entry.ruleId}</span></div>
            </div>
          </section>

          <div><span className="text-xs text-muted-foreground">Result Message</span><p className="mt-1 text-sm rounded border p-2 bg-muted/20">{entry.resultMessage}</p></div>
          <Button size="sm" variant="outline" onClick={onClose}>Close</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Main Page ───────────────────────────────────────────────────────────

export default function AutomationsPage() {
  const { toast } = useToast();

  // Rule state
  const [rules, setRules] = useState<AutomationRule[]>(getAllRules);
  const [selectedRule, setSelectedRule] = useState<AutomationRule | null>(null);

  // Builder
  const [builderOpen, setBuilderOpen] = useState(false);
  const [editRule, setEditRule] = useState<AutomationRule | null>(null);

  // Execution history
  const [selectedExecution, setSelectedExecution] = useState<AutomationAuditEntry | null>(null);

  // Audit
  const [auditSearch, setAuditSearch] = useState("");
  const [auditResultFilter, setAuditResultFilter] = useState<string>("all");

  // Scheduler state
  const [schedules, setSchedules] = useState<AutomationSchedule[]>(getAllSchedules);
  const [schedSearch, setSchedSearch] = useState("");
  const [schedStatusFilter, setSchedStatusFilter] = useState<AutomationScheduleStatus | "all">("all");
  const [schedTypeFilter, setSchedTypeFilter] = useState<AutomationScheduleType | "all">("all");
  const [selectedSchedule, setSelectedSchedule] = useState<AutomationSchedule | null>(null);

  // Derived
  const summary = useMemo(() => computeAutomationRuleSummary(rules), [rules]);

  const allExecutions = useMemo(() => {
    const runtime = getAutomationAuditHistory();
    const map = new Map<string, AutomationAuditEntry>();
    [...SEED_EXECUTION_HISTORY, ...runtime].forEach((e) => map.set(e.id, e));
    return Array.from(map.values()).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [rules]);

  const filteredAudit = useMemo(() => {
    let r = allExecutions;
    if (auditResultFilter !== "all") r = r.filter((e) => e.result === auditResultFilter);
    if (auditSearch.trim()) {
      const q = auditSearch.trim().toLowerCase();
      r = r.filter((e) => e.ruleName.toLowerCase().includes(q) || e.ruleNumber.toLowerCase().includes(q) || e.initiatedBy.toLowerCase().includes(q) || (e.jobName?.toLowerCase().includes(q) ?? false));
    }
    return r;
  }, [allExecutions, auditResultFilter, auditSearch]);

  const scheduleExecutions = useMemo(() => getScheduleExecutions(), [schedules]);
  const schedKPIs = useMemo(() => computeScheduleSummaryKPIs(schedules, scheduleExecutions), [schedules, scheduleExecutions]);
  const filteredSchedules = useMemo(() => {
    let s = filterSchedulesByStatus(schedules, schedStatusFilter);
    s = filterSchedulesByType(s, schedTypeFilter);
    return searchSchedules(s, schedSearch);
  }, [schedules, schedStatusFilter, schedTypeFilter, schedSearch]);

  // Rule actions
  const handleToggleRule = (rule: AutomationRule) => {
    const newStatus: AutomationStatus = rule.status === "active" ? "disabled" : "active";
    setRules((prev) => prev.map((r) => r.id === rule.id ? { ...r, status: newStatus, updatedAt: new Date().toISOString() } : r));
    setSelectedRule((prev) => prev?.id === rule.id ? { ...prev, status: newStatus } : prev);
  };
  const openCreateBuilder = () => { setEditRule(null); setBuilderOpen(true); setSelectedRule(null); };
  const openEditBuilder = (rule: AutomationRule) => { setEditRule(rule); setBuilderOpen(true); setSelectedRule(null); };
  const handleBuilderSaved = (_rule: AutomationRule) => { setRules(getAllRules()); setBuilderOpen(false); setEditRule(null); };
  const handleDuplicate = (rule: AutomationRule) => {
    try { duplicateRule(rule.id, "Marcus Webb"); setRules(getAllRules()); setSelectedRule(null); toast({ title: "Automation Duplicated", description: `'Copy of ${rule.name}' created as draft.` }); }
    catch (e: unknown) { toast({ title: "Error", description: (e as Error).message, variant: "destructive" }); }
  };
  const handleArchive = (rule: AutomationRule) => {
    try { archiveRule(rule.id, "Marcus Webb"); setRules(getAllRules()); setSelectedRule(null); toast({ title: "Automation Archived", description: `'${rule.name}' has been archived.` }); }
    catch (e: unknown) { toast({ title: "Error", description: (e as Error).message, variant: "destructive" }); }
  };

  // Schedule actions
  const handlePauseSchedule = (s: AutomationSchedule) => {
    const result = pauseSchedule(s.id, "Marcus Webb");
    if (result) {
      setSchedules(getAllSchedules());
      setSelectedSchedule(null);
      toast({ title: "Schedule Paused", description: `'${s.name}' has been paused.` });
    }
  };
  const handleResumeSchedule = (s: AutomationSchedule) => {
    const result = resumeSchedule(s.id, "Marcus Webb");
    if (result) {
      setSchedules(getAllSchedules());
      setSelectedSchedule(null);
      toast({ title: "Schedule Resumed", description: `'${s.name}' has been resumed.` });
    }
  };
  const handleDisableSchedule = (s: AutomationSchedule) => {
    const result = disableSchedule(s.id, "Marcus Webb");
    if (result) {
      setSchedules(getAllSchedules());
      setSelectedSchedule(null);
      toast({ title: "Schedule Disabled", description: `'${s.name}' has been disabled.` });
    }
  };

  // KPI cards (rules)
  const kpiCards = [
    { label: "Total Automations", value: summary.total, icon: Zap, color: "text-slate-600", testId: "aut-kpi-total" },
    { label: "Active", value: summary.active, icon: CheckCircle2, color: "text-emerald-600", testId: "aut-kpi-active" },
    { label: "Disabled", value: summary.disabled, icon: XCircle, color: "text-amber-600", testId: "aut-kpi-disabled" },
    { label: "Executions Today", value: allExecutions.filter((e) => new Date(e.timestamp).toDateString() === new Date().toDateString()).length, icon: Activity, color: "text-blue-600", testId: "aut-kpi-executions-today" },
    { label: "Financially Sensitive", value: summary.financiallySensitive, icon: ShieldAlert, color: "text-red-600", testId: "aut-kpi-financially-sensitive" },
  ];

  // Scheduler KPI cards
  const schedKpiCards = [
    { label: "Active Schedules", value: schedKPIs.active, icon: CalendarClock, color: "text-emerald-600", testId: "sched-kpi-active" },
    { label: "Paused", value: schedKPIs.paused, icon: PauseCircle, color: "text-amber-600", testId: "sched-kpi-paused" },
    { label: "Disabled", value: schedKPIs.disabled, icon: Ban, color: "text-slate-500", testId: "sched-kpi-disabled" },
    { label: "Runs Today", value: schedKPIs.runsToday, icon: Activity, color: "text-blue-600", testId: "sched-kpi-runs-today" },
    { label: "Upcoming Executions", value: schedKPIs.upcomingExecutions, icon: CalendarCheck, color: "text-violet-600", testId: "sched-kpi-upcoming" },
  ];

  return (
    <Layout>
      <div className="space-y-6" data-testid="automation-centre-page">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Automation Centre</h2>
            <p className="text-muted-foreground mt-1">Manage operational, workflow and financially sensitive automations.</p>
          </div>
          <Button onClick={openCreateBuilder} data-testid="aut-btn-create-automation">
            <Plus className="h-4 w-4 mr-2" /> Create Automation
          </Button>
        </div>

        {/* Doctrine Notice */}
        <div className="rounded-md bg-violet-50 border border-violet-200 px-4 py-3 text-sm text-violet-700">
          <span className="font-semibold">Automation Doctrine: </span>
          Automations never override approval workflows. Financially sensitive actions require prior approval. Every execution generates an immutable audit entry.
        </div>

        {/* Executive Dashboard (UX-6.1) — read-only health overview */}
        <AutomationExecutiveDashboard />

        {/* KPI Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3" data-testid="aut-kpi-strip">
          {kpiCards.map(({ label, value, icon: Icon, color, testId }) => (
            <Card key={label}>
              <CardHeader className="pb-1 pt-4 px-4">
                <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4 flex items-center gap-2">
                <Icon className={`h-5 w-5 flex-shrink-0 ${color}`} />
                <span className="text-2xl font-bold" data-testid={testId}>{value}</span>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Tabs */}
        <Tabs defaultValue="rules">
          <TabsList className="flex flex-wrap h-auto gap-1">
            <TabsTrigger value="rules" className="flex items-center gap-1.5" data-testid="aut-tab-rules">
              <ListChecks className="h-3.5 w-3.5" /> Automation Rules
            </TabsTrigger>
            <TabsTrigger value="scheduler" className="flex items-center gap-1.5" data-testid="aut-tab-scheduler">
              <CalendarClock className="h-3.5 w-3.5" /> Scheduler
            </TabsTrigger>
            <TabsTrigger value="timeline" className="flex items-center gap-1.5" data-testid="aut-tab-timeline">
              <CalendarRange className="h-3.5 w-3.5" /> Scheduler Timeline
            </TabsTrigger>
            <TabsTrigger value="monitoring" className="flex items-center gap-1.5" data-testid="aut-tab-monitoring">
              <Activity className="h-3.5 w-3.5" /> Execution Monitoring
            </TabsTrigger>
            <TabsTrigger value="approval-queue" className="flex items-center gap-1.5" data-testid="aut-tab-approval-queue">
              <Inbox className="h-3.5 w-3.5" /> Approval Queue
            </TabsTrigger>
            <TabsTrigger value="governance" className="flex items-center gap-1.5" data-testid="aut-tab-governance">
              <ShieldAlert className="h-3.5 w-3.5" /> Governance
            </TabsTrigger>
            <TabsTrigger value="execution-history" className="flex items-center gap-1.5" data-testid="aut-tab-execution-history">
              <History className="h-3.5 w-3.5" /> Execution History
            </TabsTrigger>
            <TabsTrigger value="audit-centre" className="flex items-center gap-1.5" data-testid="aut-tab-audit-centre">
              <FileSearch className="h-3.5 w-3.5" /> Audit Centre
            </TabsTrigger>
            <TabsTrigger value="audit" className="flex items-center gap-1.5" data-testid="aut-tab-audit">
              <FileSearch className="h-3.5 w-3.5" /> Automation Audit
            </TabsTrigger>
          </TabsList>

          {/* Tab: Automation Rules — UX-6.2 Catalogue */}
          <TabsContent value="rules">
            <div className="mt-4 space-y-4" data-testid="aut-rules-panel">
              <AutomationCatalogue rules={rules} onView={setSelectedRule} />
            </div>
          </TabsContent>

          {/* Tab: Scheduler */}
          <TabsContent value="scheduler">
            <div className="mt-4 space-y-4" data-testid="sched-panel">
              <div className="rounded-md bg-blue-50 border border-blue-200 px-4 py-3 text-sm text-blue-700">
                <span className="font-semibold">Scheduler Doctrine: </span>
                Schedules may queue actions and trigger evaluations. They may never approve expenses, timesheets, invoices, or any financial records. Approval remains human-controlled.
              </div>

              {/* Scheduler KPI Strip */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3" data-testid="sched-kpi-strip">
                {schedKpiCards.map(({ label, value, icon: Icon, color, testId }) => (
                  <Card key={label}>
                    <CardHeader className="pb-1 pt-4 px-4">
                      <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</CardTitle>
                    </CardHeader>
                    <CardContent className="px-4 pb-4 flex items-center gap-2">
                      <Icon className={`h-5 w-5 flex-shrink-0 ${color}`} />
                      <span className="text-2xl font-bold" data-testid={testId}>{value}</span>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Scheduler Filters */}
              <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
                <div className="relative w-full sm:w-72">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input placeholder="Search schedule, rule…" value={schedSearch} onChange={(e) => setSchedSearch(e.target.value)} className="pl-9" data-testid="sched-search" />
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <select className="h-9 rounded-md border bg-background px-3 text-sm" value={schedStatusFilter} onChange={(e) => setSchedStatusFilter(e.target.value as AutomationScheduleStatus | "all")} data-testid="sched-filter-status">
                    <option value="all">All Statuses</option>
                    <option value="Active">Active</option>
                    <option value="Paused">Paused</option>
                    <option value="Disabled">Disabled</option>
                  </select>
                  <select className="h-9 rounded-md border bg-background px-3 text-sm" value={schedTypeFilter} onChange={(e) => setSchedTypeFilter(e.target.value as AutomationScheduleType | "all")} data-testid="sched-filter-type">
                    <option value="all">All Types</option>
                    <option value="Hourly">Hourly</option>
                    <option value="Daily">Daily</option>
                    <option value="Weekly">Weekly</option>
                    <option value="Monthly">Monthly</option>
                    <option value="Custom">Custom</option>
                  </select>
                </div>
              </div>

              {/* Scheduler Table */}
              <div className="border rounded-md" data-testid="sched-table">
                {filteredSchedules.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 text-muted-foreground"><CalendarClock className="h-10 w-10 mb-3 opacity-20" /><p className="text-sm">No schedules match the current filter.</p></div>
                ) : (
                  <Table>
                    <TableHeader><TableRow><TableHead>Schedule</TableHead><TableHead>Rule</TableHead><TableHead>Type</TableHead><TableHead>Next Run</TableHead><TableHead>Status</TableHead><TableHead>Actions</TableHead></TableRow></TableHeader>
                    <TableBody>
                      {filteredSchedules.map((s) => (
                        <TableRow key={s.id} data-testid={`sched-row-${s.id}`}>
                          <TableCell>
                            <div className="font-mono text-xs text-muted-foreground">{s.scheduleNumber}</div>
                            <div className="font-medium text-sm max-w-[180px] truncate">{s.name}</div>
                            <div className="text-xs text-muted-foreground mt-0.5">{s.scheduleSummary}</div>
                          </TableCell>
                          <TableCell>
                            <div className="font-mono text-xs text-muted-foreground">{s.ruleNumber}</div>
                            <div className="text-sm font-medium max-w-[160px] truncate">{s.ruleName}</div>
                          </TableCell>
                          <TableCell><ScheduleTypeBadge type={s.scheduleType} /></TableCell>
                          <TableCell>{fmtDateTime(s.nextRunAt)}</TableCell>
                          <TableCell>
                            <div className="flex flex-col gap-1">
                              <ScheduleStatusBadge status={s.status} />
                              {s.isFinanciallySensitive && (
                                <Badge variant="outline" className="text-xs text-red-600 border-red-200 bg-red-50" data-testid={`sched-approval-protected-${s.id}`}>
                                  <ShieldAlert className="h-3 w-3 mr-1" />Approval Protected
                                </Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Button size="sm" variant="outline" className="text-xs h-7" onClick={() => setSelectedSchedule(s)} data-testid={`sched-btn-view-${s.id}`}>
                              <Eye className="h-3 w-3 mr-1" /> View
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </div>
            </div>
          </TabsContent>

          {/* Tab: Governance — UX-6.6 */}
          <TabsContent value="governance">
            <div className="mt-4" data-testid="aut-governance-panel">
              <AutomationGovernanceDashboard />
            </div>
          </TabsContent>

          {/* Tab: Scheduler Timeline — UX-6.5 */}
          <TabsContent value="timeline">
            <div className="mt-4" data-testid="aut-timeline-panel">
              <AutomationSchedulerTimeline onSelectSchedule={setSelectedSchedule} />
            </div>
          </TabsContent>

          {/* Tab: Approval Queue — UX-6.4 */}
          <TabsContent value="approval-queue">
            <div className="mt-4" data-testid="aut-approval-queue-panel">
              <AutomationApprovalQueue />
            </div>
          </TabsContent>

          {/* Tab: Execution Monitoring — UX-6.3 */}
          <TabsContent value="monitoring">
            <div className="mt-4" data-testid="aut-monitoring-panel">
              <AutomationExecutionMonitor onSelectExecution={setSelectedExecution} />
            </div>
          </TabsContent>

          {/* Tab: Execution History */}
          <TabsContent value="execution-history">
            <div className="mt-4 space-y-4" data-testid="aut-execution-history-panel">
              <div className="border rounded-md" data-testid="aut-execution-table">
                {allExecutions.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 text-muted-foreground"><Clock className="h-10 w-10 mb-3 opacity-20" /><p className="text-sm">No execution history yet.</p></div>
                ) : (
                  <Table>
                    <TableHeader><TableRow><TableHead>Execution ID</TableHead><TableHead>Rule</TableHead><TableHead>Job</TableHead><TableHead>Triggered By</TableHead><TableHead>Result</TableHead><TableHead>Timestamp</TableHead><TableHead>Detail</TableHead></TableRow></TableHeader>
                    <TableBody>
                      {allExecutions.map((entry) => (
                        <TableRow key={entry.id} data-testid={`aut-execution-row-${entry.id}`}>
                          <TableCell className="font-mono text-xs text-muted-foreground max-w-[140px] truncate">{entry.executionId}</TableCell>
                          <TableCell><div className="font-mono text-xs text-muted-foreground">{entry.ruleNumber}</div><div className="text-sm font-medium max-w-[160px] truncate">{entry.ruleName}</div></TableCell>
                          <TableCell className="text-sm max-w-[140px] truncate">{entry.jobName ?? <span className="text-muted-foreground text-xs">—</span>}</TableCell>
                          <TableCell className="text-sm">{entry.initiatedBy}</TableCell>
                          <TableCell><ResultBadge result={entry.result} /></TableCell>
                          <TableCell>{fmtDateTime(entry.timestamp)}</TableCell>
                          <TableCell><Button size="sm" variant="outline" className="text-xs h-7" onClick={() => setSelectedExecution(entry)} data-testid={`aut-btn-exec-detail-${entry.id}`}><Eye className="h-3 w-3 mr-1" /> Detail</Button></TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </div>
            </div>
          </TabsContent>

          {/* Tab: Audit Centre — UX-6.7 (unified executive audit) */}
          <TabsContent value="audit-centre">
            <div className="mt-4" data-testid="aut-audit-centre-panel">
              <AutomationAuditCentre />
            </div>
          </TabsContent>

          {/* Tab: Automation Audit */}
          <TabsContent value="audit">
            <div className="mt-4 space-y-4" data-testid="aut-audit-panel">
              <div className="rounded-md bg-slate-50 border border-slate-200 px-3 py-2.5 text-xs text-slate-600 flex items-center gap-2">
                <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                Immutable read-only audit trail. Entries cannot be edited or deleted.
              </div>
              <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
                <div className="relative w-full sm:w-72">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input placeholder="Search rule, user, job…" value={auditSearch} onChange={(e) => setAuditSearch(e.target.value)} className="pl-9" data-testid="aut-audit-search" />
                </div>
                <select className="h-9 rounded-md border bg-background px-3 text-sm" value={auditResultFilter} onChange={(e) => setAuditResultFilter(e.target.value)} data-testid="aut-audit-filter-result">
                  <option value="all">All Results</option>
                  <option value="success">Success</option>
                  <option value="blocked_approval_required">Blocked — Approval Required</option>
                  <option value="blocked_forbidden_action">Blocked — Forbidden Action</option>
                  <option value="blocked_condition_not_met">Blocked — Condition Not Met</option>
                  <option value="failed">Failed</option>
                </select>
              </div>
              <div className="border rounded-md" data-testid="aut-audit-table">
                {filteredAudit.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 text-muted-foreground"><FileSearch className="h-10 w-10 mb-3 opacity-20" /><p className="text-sm">No audit entries match the current filter.</p></div>
                ) : (
                  <Table>
                    <TableHeader><TableRow><TableHead>Audit ID</TableHead><TableHead>Rule</TableHead><TableHead>Action</TableHead><TableHead>User</TableHead><TableHead>Job</TableHead><TableHead>Result</TableHead><TableHead>Timestamp</TableHead></TableRow></TableHeader>
                    <TableBody>
                      {filteredAudit.map((entry) => (
                        <TableRow key={entry.id} data-testid={`aut-audit-row-${entry.id}`}>
                          <TableCell className="font-mono text-xs text-muted-foreground max-w-[120px] truncate">{entry.id}</TableCell>
                          <TableCell><div className="font-mono text-xs text-muted-foreground">{entry.ruleNumber}</div><div className="text-sm font-medium max-w-[160px] truncate">{entry.ruleName}</div></TableCell>
                          <TableCell className="text-sm max-w-[140px] truncate">{entry.actionLabel}</TableCell>
                          <TableCell className="text-sm">{entry.initiatedBy}</TableCell>
                          <TableCell className="text-sm max-w-[120px] truncate">{entry.jobName ?? <span className="text-muted-foreground text-xs">—</span>}</TableCell>
                          <TableCell><ResultBadge result={entry.result} /></TableCell>
                          <TableCell>{fmtDateTime(entry.timestamp)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {selectedRule && (
        <RuleDetailDialog rule={selectedRule} onClose={() => setSelectedRule(null)} onToggle={handleToggleRule} onEdit={openEditBuilder} onDuplicate={handleDuplicate} onArchive={handleArchive} />
      )}
      {builderOpen && (
        <AutomationBuilderDialog editRule={editRule} onClose={() => { setBuilderOpen(false); setEditRule(null); }} onSaved={handleBuilderSaved} />
      )}
      {selectedExecution && (
        <ExecutionDetailDialog entry={selectedExecution} onClose={() => setSelectedExecution(null)} />
      )}
      {selectedSchedule && (
        <ScheduleDetailDialog
          schedule={selectedSchedule}
          onClose={() => setSelectedSchedule(null)}
          onPause={handlePauseSchedule}
          onResume={handleResumeSchedule}
          onDisable={handleDisableSchedule}
        />
      )}
    </Layout>
  );
}
