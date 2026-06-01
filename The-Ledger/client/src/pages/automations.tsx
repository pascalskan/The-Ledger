/**
 * PHASE 6.0C — AUTOMATION CENTRE + BUILDER
 *
 * Extends Phase 6.0B with:
 *   - Create Automation button (CEO only)
 *   - Automation Builder Dialog (5-step guided builder)
 *   - Edit workflow (pre-populate builder from existing rule)
 *   - Duplicate workflow (copy rule to draft)
 *   - Archive workflow (soft-delete only)
 *   - Financial safeguard warning for FinanciallySensitive category
 *   - Forbidden action blocking at save time
 *
 * Doctrine:
 *   Builder rules obey all existing doctrines.
 *   Approval, Audit, Job Attribution, Financial Integrity,
 *   and Accounting Independence doctrines are all preserved.
 */

import { useState, useMemo } from "react";
import { Layout } from "@/components/layout";
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
  filterRulesByStatus,
  filterRulesByCategory,
  searchRules,
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

// ── Formatters ──────────────────────────────────────────────

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

// ── Status Badge ──────────────────────────────────────────────

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

// ── Category Badge ──────────────────────────────────────────────

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

// ── Result Badge ────────────────────────────────────────────────

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

// ── Builder Step Indicator ────────────────────────────────────

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

// ── Automation Builder Dialog ──────────────────────────────

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

  const totalSteps = 5;
  const isFinSensitive = form.category === "FinanciallySensitive";
  const hasForbiddenAction = formContainsForbiddenAction(form);

  // ─ Condition helpers ────────────────────────────────

  function addCondition() {
    const newCond: BuilderCondition = {
      id: `cond-${Date.now()}`,
      field: "",
      operator: "equals",
      value: "",
    };
    setForm((prev) => ({ ...prev, conditions: [...prev.conditions, newCond] }));
  }

  function removeCondition(id: string) {
    setForm((prev) => ({
      ...prev,
      conditions: prev.conditions.filter((c) => c.id !== id),
    }));
  }

  function updateCondition(id: string, patch: Partial<BuilderCondition>) {
    setForm((prev) => ({
      ...prev,
      conditions: prev.conditions.map((c) =>
        c.id === id ? { ...c, ...patch } : c
      ),
    }));
  }

  // ─ Action helpers ─────────────────────────────────

  function toggleAction(actionId: string) {
    setForm((prev) => {
      const already = prev.actionIds.includes(actionId);
      return {
        ...prev,
        actionIds: already
          ? prev.actionIds.filter((id) => id !== actionId)
          : [...prev.actionIds, actionId],
      };
    });
  }

  // ─ Navigation ─────────────────────────────────────

  function goNext() {
    if (step < totalSteps) setStep((s) => (s + 1) as BuilderStep);
  }

  function goBack() {
    if (step > 1) setStep((s) => (s - 1) as BuilderStep);
  }

  // ─ Save ───────────────────────────────────────────────

  function handleSave() {
    const validation = validateBuilderForm(form);
    if (!validation.valid) {
      setErrors(validation.errors);
      return;
    }
    if (hasForbiddenAction) {
      setErrors(["One or more selected actions are forbidden and cannot be used."]);
      return;
    }
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

  // ─ Render steps ───────────────────────────────────

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        className="sm:max-w-[680px] max-h-[90vh] overflow-y-auto"
        data-testid="aut-builder-dialog"
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Zap className="h-4 w-4" />
            {isEdit ? "Edit Automation" : "Create Automation"}
          </DialogTitle>
          <DialogDescription>
            {isEdit
              ? `Editing '${editRule.ruleNumber}' — ${editRule.name}`
              : "Build a new automation rule using the guided steps below."}
          </DialogDescription>
        </DialogHeader>

        <StepIndicator current={step} total={totalSteps} />

        {/* ──── STEP 1: Basic Details ───────────────────────────────────── */}
        {step === 1 && (
          <div className="space-y-4" data-testid="builder-step-1">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Rule Name <span className="text-red-500">*</span></label>
              <Input
                placeholder="e.g. Notify CEO on sync failure"
                value={form.name}
                onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                data-testid="builder-input-name"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Description <span className="text-red-500">*</span></label>
              <textarea
                className="w-full rounded-md border bg-background px-3 py-2 text-sm min-h-[80px] resize-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                placeholder="Describe what this automation does…"
                value={form.description}
                onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
                data-testid="builder-input-description"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Category</label>
              <select
                className="h-9 w-full rounded-md border bg-background px-3 text-sm"
                value={form.category}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    category: e.target.value as AutomationCategory,
                  }))
                }
                data-testid="builder-select-category"
              >
                <option value="Operational">Operational</option>
                <option value="Workflow">Workflow</option>
                <option value="FinanciallySensitive">Financially Sensitive</option>
              </select>
            </div>
            {isFinSensitive && (
              <div
                className="flex items-start gap-2 rounded-md bg-red-50 border border-red-200 px-3 py-2.5 text-sm text-red-700"
                data-testid="builder-financial-warning"
              >
                <ShieldAlert className="h-4 w-4 shrink-0 mt-0.5" />
                <p>
                  <span className="font-semibold">Financial Safeguard Warning — </span>
                  This automation requires approval validation before execution and cannot create
                  approved financial records.
                </p>
              </div>
            )}
          </div>
        )}

        {/* ──── STEP 2: Trigger ──────────────────────────────────────────── */}
        {step === 2 && (
          <div className="space-y-3" data-testid="builder-step-2">
            <p className="text-sm text-muted-foreground">
              Select the event that will trigger this automation.
            </p>
            {TRIGGER_CATALOGUE_V1.map((trigger) => (
              <button
                key={trigger.id}
                type="button"
                onClick={() => setForm((prev) => ({ ...prev, triggerId: trigger.id }))}
                className={`w-full text-left rounded-md border p-3 text-sm transition-colors ${
                  form.triggerId === trigger.id
                    ? "border-violet-400 bg-violet-50"
                    : "border-border hover:bg-muted/40"
                }`}
                data-testid={`builder-trigger-option-${trigger.id}`}
              >
                <div className="font-semibold">{trigger.label}</div>
                <div className="text-muted-foreground text-xs mt-0.5">{trigger.description}</div>
              </button>
            ))}
          </div>
        )}

        {/* ──── STEP 3: Conditions ───────────────────────────────────────── */}
        {step === 3 && (
          <div className="space-y-3" data-testid="builder-step-3">
            <p className="text-sm text-muted-foreground">
              Optionally add conditions that must be met before actions fire. Leave empty to always
              fire on trigger.
            </p>
            {form.conditions.length === 0 && (
              <div className="rounded-md border border-dashed p-4 text-center text-xs text-muted-foreground">
                No conditions added. Actions will fire on every trigger event.
              </div>
            )}
            {form.conditions.map((cond, idx) => (
              <div
                key={cond.id}
                className="flex flex-wrap items-center gap-2 rounded-md border p-2"
                data-testid={`builder-condition-row-${idx}`}
              >
                <Input
                  placeholder="Field"
                  value={cond.field}
                  onChange={(e) => updateCondition(cond.id, { field: e.target.value })}
                  className="w-28 text-xs h-8"
                  data-testid={`builder-condition-field-${idx}`}
                />
                <select
                  className="h-8 rounded-md border bg-background px-2 text-xs"
                  value={cond.operator}
                  onChange={(e) =>
                    updateCondition(cond.id, {
                      operator: e.target.value as BuilderCondition["operator"],
                    })
                  }
                  data-testid={`builder-condition-operator-${idx}`}
                >
                  {Object.entries(CONDITION_OPERATOR_LABELS).map(([k, v]) => (
                    <option key={k} value={k}>{v}</option>
                  ))}
                </select>
                <Input
                  placeholder="Value"
                  value={cond.value}
                  onChange={(e) => updateCondition(cond.id, { value: e.target.value })}
                  className="w-28 text-xs h-8"
                  data-testid={`builder-condition-value-${idx}`}
                />
                <button
                  type="button"
                  onClick={() => removeCondition(cond.id)}
                  className="ml-auto text-muted-foreground hover:text-destructive"
                  data-testid={`builder-condition-remove-${idx}`}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={addCondition}
              data-testid="builder-btn-add-condition"
            >
              <Plus className="h-3.5 w-3.5 mr-1" /> Add Condition
            </Button>
          </div>
        )}

        {/* ──── STEP 4: Actions ───────────────────────────────────────────── */}
        {step === 4 && (
          <div className="space-y-3" data-testid="builder-step-4">
            <p className="text-sm text-muted-foreground">
              Select one or more actions to execute when this rule fires. Multiple actions are
              supported.
            </p>
            {ACTION_CATALOGUE_V1.map((action) => {
              const selected = form.actionIds.includes(action.id);
              return (
                <button
                  key={action.id}
                  type="button"
                  onClick={() => toggleAction(action.id)}
                  className={`w-full text-left rounded-md border p-3 text-sm transition-colors ${
                    selected
                      ? "border-violet-400 bg-violet-50"
                      : "border-border hover:bg-muted/40"
                  }`}
                  data-testid={`builder-action-option-${action.id}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="font-semibold">{action.label}</div>
                      <div className="text-muted-foreground text-xs mt-0.5">{action.description}</div>
                    </div>
                    <Badge
                      variant="outline"
                      className={`text-xs shrink-0 ${AUTOMATION_CATEGORY_COLORS[action.safetyClass]}`}
                    >
                      {action.safetyClass}
                    </Badge>
                  </div>
                </button>
              );
            })}
            {hasForbiddenAction && (
              <div
                className="flex items-start gap-2 rounded-md bg-red-50 border border-red-200 px-3 py-2.5 text-sm text-red-700"
                data-testid="builder-forbidden-action-warning"
              >
                <ShieldAlert className="h-4 w-4 shrink-0 mt-0.5" />
                <p>
                  One or more selected actions are <span className="font-semibold">forbidden</span>.
                  Automations may never create approved financial records or bypass approval
                  workflows.
                </p>
              </div>
            )}
          </div>
        )}

        {/* ──── STEP 5: Review ───────────────────────────────────────────── */}
        {step === 5 && (
          <div className="space-y-4" data-testid="builder-step-5">
            <div className="rounded-md bg-muted/30 p-4 space-y-3 text-sm">
              <div>
                <span className="text-xs text-muted-foreground uppercase tracking-wide">Rule Name</span>
                <div className="font-semibold mt-0.5">{form.name || <em className="text-muted-foreground">Not set</em>}</div>
              </div>
              <div>
                <span className="text-xs text-muted-foreground uppercase tracking-wide">Category</span>
                <div className="mt-0.5">
                  <CategoryBadge category={form.category} />
                </div>
              </div>
              <div>
                <span className="text-xs text-muted-foreground uppercase tracking-wide">Trigger</span>
                <div className="font-medium mt-0.5">
                  {form.triggerId
                    ? TRIGGER_CATALOGUE_V1.find((t) => t.id === form.triggerId)?.label
                    : <em className="text-muted-foreground">Not selected</em>}
                </div>
              </div>
              {form.conditions.length > 0 && (
                <div>
                  <span className="text-xs text-muted-foreground uppercase tracking-wide">Conditions</span>
                  <div className="mt-1 space-y-1">
                    {form.conditions.map((c, i) => (
                      <div key={i} className="font-mono text-xs bg-muted px-2 py-1 rounded">
                        {c.field} {c.operator} {c.value}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <div>
                <span className="text-xs text-muted-foreground uppercase tracking-wide">Actions ({form.actionIds.length})</span>
                <div className="mt-1 space-y-1">
                  {form.actionIds.length === 0
                    ? <em className="text-muted-foreground">None selected</em>
                    : form.actionIds.map((id) => {
                        const action = ACTION_CATALOGUE_V1.find((a) => a.id === id);
                        return (
                          <div key={id} className="text-xs rounded border px-2 py-1">
                            {action?.label ?? id}
                          </div>
                        );
                      })}
                </div>
              </div>
              {isFinSensitive && (
                <div
                  className="flex items-center gap-2 rounded-md bg-red-50 border border-red-200 px-3 py-2 text-xs text-red-700"
                  data-testid="builder-review-financial-safeguard"
                >
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
            {step > 1 && (
              <Button size="sm" variant="outline" onClick={goBack} data-testid="builder-btn-back">
                <ChevronLeft className="h-3.5 w-3.5 mr-1" /> Back
              </Button>
            )}
            <Button size="sm" variant="outline" onClick={onClose} data-testid="builder-btn-cancel">
              Cancel
            </Button>
          </div>
          <div>
            {step < totalSteps ? (
              <Button size="sm" onClick={goNext} data-testid="builder-btn-next">
                Next <ChevronRight className="h-3.5 w-3.5 ml-1" />
              </Button>
            ) : (
              <Button
                size="sm"
                onClick={handleSave}
                disabled={hasForbiddenAction}
                data-testid="builder-btn-save"
              >
                {isEdit ? "Save Changes" : "Create Automation"}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Rule Detail Dialog ────────────────────────────────────────────

function RuleDetailDialog({
  rule,
  onClose,
  onToggle,
  onEdit,
  onDuplicate,
  onArchive,
}: {
  rule: AutomationRule;
  onClose: () => void;
  onToggle: (rule: AutomationRule) => void;
  onEdit: (rule: AutomationRule) => void;
  onDuplicate: (rule: AutomationRule) => void;
  onArchive: (rule: AutomationRule) => void;
}) {
  const trigger = getTriggerById(rule.triggerId);
  const actions = getActionsForRule(rule);

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[640px]" data-testid="aut-rule-detail-dialog">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Zap className="h-4 w-4" />
            {rule.ruleNumber}
          </DialogTitle>
          <DialogDescription>{rule.name}</DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          {/* Rule Information */}
          <section>
            <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
              Rule Information
            </h4>
            <div className="rounded-md bg-muted/30 p-3 text-sm space-y-3">
              <p className="text-muted-foreground">{rule.description}</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <span className="text-xs text-muted-foreground">Status</span>
                  <div className="mt-1"><StatusBadge status={rule.status} /></div>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground">Category</span>
                  <div className="mt-1"><CategoryBadge category={rule.category} /></div>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground">Created By</span>
                  <div className="mt-1 font-medium text-sm">{rule.createdBy}</div>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground">Executions</span>
                  <div className="mt-1 font-medium text-sm">{rule.executionCount}</div>
                </div>
              </div>
            </div>
          </section>

          {/* Trigger */}
          <section data-testid="aut-rule-detail-trigger">
            <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Trigger</h4>
            {trigger ? (
              <div className="rounded-md border p-3 text-sm">
                <div className="font-semibold">{trigger.label}</div>
                <div className="text-muted-foreground text-xs mt-0.5">{trigger.description}</div>
              </div>
            ) : (
              <div className="text-xs text-muted-foreground">Unknown trigger</div>
            )}
          </section>

          {/* Conditions */}
          {Object.keys(rule.conditions).length > 0 && (
            <section>
              <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Conditions</h4>
              <div className="rounded-md border p-3 text-sm space-y-1">
                {Object.entries(rule.conditions).map(([key, val]) => (
                  <div key={key} className="flex items-center gap-2">
                    <span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">{key}</span>
                    <span className="text-muted-foreground">=</span>
                    <span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">{String(val)}</span>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Actions */}
          <section data-testid="aut-rule-detail-actions">
            <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Actions</h4>
            <div className="space-y-2">
              {actions.map((action) => (
                <div
                  key={action.id}
                  className="flex items-start justify-between rounded-md border p-3 text-sm"
                >
                  <div>
                    <div className="font-semibold">{action.label}</div>
                    <div className="text-muted-foreground text-xs mt-0.5">{action.description}</div>
                  </div>
                  <Badge
                    variant="outline"
                    className={`text-xs ml-3 shrink-0 ${AUTOMATION_CATEGORY_COLORS[action.safetyClass]}`}
                  >
                    {action.safetyClass}
                  </Badge>
                </div>
              ))}
            </div>
          </section>

          {/* Financial Safeguards */}
          {rule.category === "FinanciallySensitive" && (
            <section data-testid="aut-rule-detail-financial-safeguard">
              <div className="flex items-center gap-2 rounded-md bg-red-50 border border-red-200 px-3 py-2.5 text-sm text-red-700">
                <ShieldAlert className="h-4 w-4 shrink-0" />
                <div>
                  <span className="font-semibold">Financially Sensitive — </span>
                  Approval Required. Actions in this rule will be blocked unless the triggering
                  record has been approved.
                </div>
              </div>
            </section>
          )}

          {/* Actions */}
          <div className="flex flex-wrap gap-2 pt-1">
            {rule.status !== "archived" && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => onEdit(rule)}
                data-testid="aut-btn-edit-rule"
              >
                <Edit className="h-3.5 w-3.5 mr-1" /> Edit
              </Button>
            )}
            <Button
              size="sm"
              variant="outline"
              onClick={() => onDuplicate(rule)}
              data-testid="aut-btn-duplicate-rule"
            >
              <Copy className="h-3.5 w-3.5 mr-1" /> Duplicate
            </Button>
            {rule.status === "active" ? (
              <Button
                size="sm"
                variant="outline"
                className="text-amber-700 border-amber-300 hover:bg-amber-50"
                onClick={() => onToggle(rule)}
                data-testid="aut-btn-disable-rule"
              >
                <XCircle className="h-3.5 w-3.5 mr-1" /> Disable Rule
              </Button>
            ) : rule.status === "disabled" ? (
              <Button
                size="sm"
                variant="outline"
                className="text-emerald-700 border-emerald-300 hover:bg-emerald-50"
                onClick={() => onToggle(rule)}
                data-testid="aut-btn-enable-rule"
              >
                <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Enable Rule
              </Button>
            ) : null}
            {rule.status !== "archived" && (
              <Button
                size="sm"
                variant="outline"
                className="text-stone-600 border-stone-300 hover:bg-stone-50"
                onClick={() => onArchive(rule)}
                data-testid="aut-btn-archive-rule"
              >
                <Archive className="h-3.5 w-3.5 mr-1" /> Archive
              </Button>
            )}
            <Button size="sm" variant="outline" onClick={onClose}>
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Execution Detail Dialog ───────────────────────────────────────────

function ExecutionDetailDialog({
  entry,
  onClose,
}: {
  entry: AutomationAuditEntry;
  onClose: () => void;
}) {
  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[540px]" data-testid="aut-execution-detail-dialog">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Activity className="h-4 w-4" /> Execution Detail
          </DialogTitle>
          <DialogDescription className="font-mono text-xs">{entry.executionId}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <span className="text-xs text-muted-foreground">Rule</span>
              <div className="mt-1 font-semibold">{entry.ruleNumber}</div>
              <div className="text-xs text-muted-foreground truncate">{entry.ruleName}</div>
            </div>
            <div>
              <span className="text-xs text-muted-foreground">Result</span>
              <div className="mt-1"><ResultBadge result={entry.result} /></div>
            </div>
            <div>
              <span className="text-xs text-muted-foreground">Trigger</span>
              <div className="mt-1 text-sm font-mono">{entry.triggerType}</div>
            </div>
            <div>
              <span className="text-xs text-muted-foreground">Triggered By</span>
              <div className="mt-1 font-medium">{entry.initiatedBy}</div>
            </div>
            {entry.jobName && (
              <div>
                <span className="text-xs text-muted-foreground">Job</span>
                <div className="mt-1 font-medium truncate">{entry.jobName}</div>
              </div>
            )}
            <div>
              <span className="text-xs text-muted-foreground">Timestamp</span>
              <div className="mt-1">{fmtDateTime(entry.timestamp)}</div>
            </div>
          </div>
          <div>
            <span className="text-xs text-muted-foreground">Audit Reference</span>
            <div className="mt-1 font-mono text-xs bg-muted px-2 py-1 rounded">{entry.id}</div>
          </div>
          <div>
            <span className="text-xs text-muted-foreground">Result Message</span>
            <p className="mt-1 text-sm rounded border p-2 bg-muted/20">{entry.resultMessage}</p>
          </div>
          <Button size="sm" variant="outline" onClick={onClose}>Close</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Main Page ───────────────────────────────────────────────────

export default function AutomationsPage() {
  const { toast } = useToast();

  // ── Rule state ───────────────────────────────────────────
  const [rules, setRules] = useState<AutomationRule[]>(getAllRules);
  const [ruleSearch, setRuleSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<AutomationStatus | "all">("all");
  const [categoryFilter, setCategoryFilter] = useState<AutomationCategory | "all">("all");
  const [selectedRule, setSelectedRule] = useState<AutomationRule | null>(null);

  // ── Builder dialog state ────────────────────────────────
  // null = closed; null editRule = create mode; non-null = edit mode
  const [builderOpen, setBuilderOpen] = useState(false);
  const [editRule, setEditRule] = useState<AutomationRule | null>(null);

  // ── Execution history state ─────────────────────────────
  const [selectedExecution, setSelectedExecution] = useState<AutomationAuditEntry | null>(null);

  // ── Audit state ───────────────────────────────────────────
  const [auditSearch, setAuditSearch] = useState("");
  const [auditResultFilter, setAuditResultFilter] = useState<string>("all");

  // ── Derived data ───────────────────────────────────────────
  const summary = useMemo(() => computeAutomationRuleSummary(rules), [rules]);

  const filteredRules = useMemo(() => {
    let result = filterRulesByStatus(rules, statusFilter);
    result = filterRulesByCategory(result, categoryFilter);
    return searchRules(result, ruleSearch);
  }, [rules, statusFilter, categoryFilter, ruleSearch]);

  const allExecutions = useMemo(() => {
    const runtime = getAutomationAuditHistory();
    const map = new Map<string, AutomationAuditEntry>();
    [...SEED_EXECUTION_HISTORY, ...runtime].forEach((e) => map.set(e.id, e));
    return Array.from(map.values()).sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  }, [rules]); // re-derive when rules change to pick up new builder audit entries

  const filteredAudit = useMemo(() => {
    let result = allExecutions;
    if (auditResultFilter !== "all") result = result.filter((e) => e.result === auditResultFilter);
    if (auditSearch.trim()) {
      const q = auditSearch.trim().toLowerCase();
      result = result.filter(
        (e) =>
          e.ruleName.toLowerCase().includes(q) ||
          e.ruleNumber.toLowerCase().includes(q) ||
          e.initiatedBy.toLowerCase().includes(q) ||
          (e.jobName?.toLowerCase().includes(q) ?? false)
      );
    }
    return result;
  }, [allExecutions, auditResultFilter, auditSearch]);

  // ── Rule toggle (enable / disable) ───────────────────────
  const handleToggleRule = (rule: AutomationRule) => {
    const newStatus: AutomationStatus = rule.status === "active" ? "disabled" : "active";
    setRules((prev) =>
      prev.map((r) =>
        r.id === rule.id ? { ...r, status: newStatus, updatedAt: new Date().toISOString() } : r
      )
    );
    setSelectedRule((prev) =>
      prev?.id === rule.id ? { ...prev, status: newStatus } : prev
    );
  };

  // ── Builder actions ───────────────────────────────────────
  const openCreateBuilder = () => {
    setEditRule(null);
    setBuilderOpen(true);
    setSelectedRule(null);
  };

  const openEditBuilder = (rule: AutomationRule) => {
    setEditRule(rule);
    setBuilderOpen(true);
    setSelectedRule(null);
  };

  const handleBuilderSaved = (rule: AutomationRule) => {
    setRules(getAllRules());
    setBuilderOpen(false);
    setEditRule(null);
  };

  const handleDuplicate = (rule: AutomationRule) => {
    try {
      duplicateRule(rule.id, "Marcus Webb");
      setRules(getAllRules());
      setSelectedRule(null);
      toast({ title: "Automation Duplicated", description: `'Copy of ${rule.name}' created as draft.` });
    } catch (e: unknown) {
      toast({ title: "Error", description: (e as Error).message, variant: "destructive" });
    }
  };

  const handleArchive = (rule: AutomationRule) => {
    try {
      archiveRule(rule.id, "Marcus Webb");
      setRules(getAllRules());
      setSelectedRule(null);
      toast({ title: "Automation Archived", description: `'${rule.name}' has been archived.` });
    } catch (e: unknown) {
      toast({ title: "Error", description: (e as Error).message, variant: "destructive" });
    }
  };

  // ── KPI cards ─────────────────────────────────────────────
  const kpiCards = [
    { label: "Total Automations", value: summary.total, icon: Zap, color: "text-slate-600", testId: "aut-kpi-total" },
    { label: "Active", value: summary.active, icon: CheckCircle2, color: "text-emerald-600", testId: "aut-kpi-active" },
    { label: "Disabled", value: summary.disabled, icon: XCircle, color: "text-amber-600", testId: "aut-kpi-disabled" },
    {
      label: "Executions Today",
      value: allExecutions.filter((e) => new Date(e.timestamp).toDateString() === new Date().toDateString()).length,
      icon: Activity,
      color: "text-blue-600",
      testId: "aut-kpi-executions-today",
    },
    { label: "Financially Sensitive", value: summary.financiallySensitive, icon: ShieldAlert, color: "text-red-600", testId: "aut-kpi-financially-sensitive" },
  ];

  return (
    <Layout>
      <div className="space-y-6" data-testid="automation-centre-page">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Automation Centre</h2>
            <p className="text-muted-foreground mt-1">
              Manage operational, workflow and financially sensitive automations.
            </p>
          </div>
          <Button
            onClick={openCreateBuilder}
            data-testid="aut-btn-create-automation"
          >
            <Plus className="h-4 w-4 mr-2" /> Create Automation
          </Button>
        </div>

        {/* Doctrine Notice */}
        <div className="rounded-md bg-violet-50 border border-violet-200 px-4 py-3 text-sm text-violet-700">
          <span className="font-semibold">Automation Doctrine: </span>
          Automations never override approval workflows. Financially sensitive actions require
          prior approval. Every execution generates an immutable audit entry.
        </div>

        {/* KPI Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3" data-testid="aut-kpi-strip">
          {kpiCards.map(({ label, value, icon: Icon, color, testId }) => (
            <Card key={label}>
              <CardHeader className="pb-1 pt-4 px-4">
                <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  {label}
                </CardTitle>
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
            <TabsTrigger value="execution-history" className="flex items-center gap-1.5" data-testid="aut-tab-execution-history">
              <History className="h-3.5 w-3.5" /> Execution History
            </TabsTrigger>
            <TabsTrigger value="audit" className="flex items-center gap-1.5" data-testid="aut-tab-audit">
              <FileSearch className="h-3.5 w-3.5" /> Automation Audit
            </TabsTrigger>
          </TabsList>

          {/* Tab 1: Automation Rules */}
          <TabsContent value="rules">
            <div className="mt-4 space-y-4" data-testid="aut-rules-panel">
              <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
                <div className="relative w-full sm:w-72">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search rule name, number…"
                    value={ruleSearch}
                    onChange={(e) => setRuleSearch(e.target.value)}
                    className="pl-9"
                    data-testid="aut-rules-search"
                  />
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <select
                    className="h-9 rounded-md border bg-background px-3 text-sm"
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value as AutomationStatus | "all")}
                    data-testid="aut-filter-status"
                  >
                    <option value="all">All Statuses</option>
                    <option value="active">Active</option>
                    <option value="disabled">Disabled</option>
                    <option value="draft">Draft</option>
                    <option value="archived">Archived</option>
                  </select>
                  <select
                    className="h-9 rounded-md border bg-background px-3 text-sm"
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value as AutomationCategory | "all")}
                    data-testid="aut-filter-category"
                  >
                    <option value="all">All Categories</option>
                    <option value="Operational">Operational</option>
                    <option value="Workflow">Workflow</option>
                    <option value="FinanciallySensitive">Financially Sensitive</option>
                  </select>
                </div>
              </div>

              <div className="border rounded-md" data-testid="aut-rules-table">
                {filteredRules.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                    <Zap className="h-10 w-10 mb-3 opacity-20" />
                    <p className="text-sm">No rules match the current filter.</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Rule</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead>Trigger</TableHead>
                        <TableHead className="text-center">Actions</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Last Executed</TableHead>
                        <TableHead>View</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredRules.map((rule) => {
                        const trigger = getTriggerById(rule.triggerId);
                        return (
                          <TableRow key={rule.id} data-testid={`aut-rule-row-${rule.id}`}>
                            <TableCell>
                              <div className="font-mono text-xs font-semibold text-muted-foreground">{rule.ruleNumber}</div>
                              <div className="font-medium text-sm max-w-[200px] truncate">{rule.name}</div>
                            </TableCell>
                            <TableCell><CategoryBadge category={rule.category} /></TableCell>
                            <TableCell className="text-sm text-muted-foreground max-w-[140px] truncate">
                              {trigger?.label ?? rule.triggerType}
                            </TableCell>
                            <TableCell className="text-center">
                              <span className="text-sm font-semibold">{rule.actionIds.length}</span>
                            </TableCell>
                            <TableCell><StatusBadge status={rule.status} /></TableCell>
                            <TableCell>{fmtDateTime(rule.lastExecutedAt)}</TableCell>
                            <TableCell>
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-xs h-7"
                                onClick={() => setSelectedRule(rule)}
                                data-testid={`aut-btn-view-${rule.id}`}
                              >
                                <Eye className="h-3 w-3 mr-1" /> View
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                )}
              </div>
            </div>
          </TabsContent>

          {/* Tab 2: Execution History */}
          <TabsContent value="execution-history">
            <div className="mt-4 space-y-4" data-testid="aut-execution-history-panel">
              <div className="border rounded-md" data-testid="aut-execution-table">
                {allExecutions.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                    <Clock className="h-10 w-10 mb-3 opacity-20" />
                    <p className="text-sm">No execution history yet.</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Execution ID</TableHead>
                        <TableHead>Rule</TableHead>
                        <TableHead>Job</TableHead>
                        <TableHead>Triggered By</TableHead>
                        <TableHead>Result</TableHead>
                        <TableHead>Timestamp</TableHead>
                        <TableHead>Detail</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {allExecutions.map((entry) => (
                        <TableRow key={entry.id} data-testid={`aut-execution-row-${entry.id}`}>
                          <TableCell className="font-mono text-xs text-muted-foreground max-w-[140px] truncate">{entry.executionId}</TableCell>
                          <TableCell>
                            <div className="font-mono text-xs text-muted-foreground">{entry.ruleNumber}</div>
                            <div className="text-sm font-medium max-w-[160px] truncate">{entry.ruleName}</div>
                          </TableCell>
                          <TableCell className="text-sm max-w-[140px] truncate">
                            {entry.jobName ?? <span className="text-muted-foreground text-xs">—</span>}
                          </TableCell>
                          <TableCell className="text-sm">{entry.initiatedBy}</TableCell>
                          <TableCell><ResultBadge result={entry.result} /></TableCell>
                          <TableCell>{fmtDateTime(entry.timestamp)}</TableCell>
                          <TableCell>
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-xs h-7"
                              onClick={() => setSelectedExecution(entry)}
                              data-testid={`aut-btn-exec-detail-${entry.id}`}
                            >
                              <Eye className="h-3 w-3 mr-1" /> Detail
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

          {/* Tab 3: Automation Audit */}
          <TabsContent value="audit">
            <div className="mt-4 space-y-4" data-testid="aut-audit-panel">
              <div className="rounded-md bg-slate-50 border border-slate-200 px-3 py-2.5 text-xs text-slate-600 flex items-center gap-2">
                <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                Immutable read-only audit trail. Entries cannot be edited or deleted.
              </div>
              <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
                <div className="relative w-full sm:w-72">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search rule, user, job…"
                    value={auditSearch}
                    onChange={(e) => setAuditSearch(e.target.value)}
                    className="pl-9"
                    data-testid="aut-audit-search"
                  />
                </div>
                <select
                  className="h-9 rounded-md border bg-background px-3 text-sm"
                  value={auditResultFilter}
                  onChange={(e) => setAuditResultFilter(e.target.value)}
                  data-testid="aut-audit-filter-result"
                >
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
                  <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                    <FileSearch className="h-10 w-10 mb-3 opacity-20" />
                    <p className="text-sm">No audit entries match the current filter.</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Audit ID</TableHead>
                        <TableHead>Rule</TableHead>
                        <TableHead>Action</TableHead>
                        <TableHead>User</TableHead>
                        <TableHead>Job</TableHead>
                        <TableHead>Result</TableHead>
                        <TableHead>Timestamp</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredAudit.map((entry) => (
                        <TableRow key={entry.id} data-testid={`aut-audit-row-${entry.id}`}>
                          <TableCell className="font-mono text-xs text-muted-foreground max-w-[120px] truncate">{entry.id}</TableCell>
                          <TableCell>
                            <div className="font-mono text-xs text-muted-foreground">{entry.ruleNumber}</div>
                            <div className="text-sm font-medium max-w-[160px] truncate">{entry.ruleName}</div>
                          </TableCell>
                          <TableCell className="text-sm max-w-[140px] truncate">{entry.actionLabel}</TableCell>
                          <TableCell className="text-sm">{entry.initiatedBy}</TableCell>
                          <TableCell className="text-sm max-w-[120px] truncate">
                            {entry.jobName ?? <span className="text-muted-foreground text-xs">—</span>}
                          </TableCell>
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

      {/* Rule Detail Dialog */}
      {selectedRule && (
        <RuleDetailDialog
          rule={selectedRule}
          onClose={() => setSelectedRule(null)}
          onToggle={handleToggleRule}
          onEdit={openEditBuilder}
          onDuplicate={handleDuplicate}
          onArchive={handleArchive}
        />
      )}

      {/* Automation Builder Dialog */}
      {builderOpen && (
        <AutomationBuilderDialog
          editRule={editRule}
          onClose={() => { setBuilderOpen(false); setEditRule(null); }}
          onSaved={handleBuilderSaved}
        />
      )}

      {/* Execution Detail Dialog */}
      {selectedExecution && (
        <ExecutionDetailDialog
          entry={selectedExecution}
          onClose={() => setSelectedExecution(null)}
        />
      )}
    </Layout>
  );
}
