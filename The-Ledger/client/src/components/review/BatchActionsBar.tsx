/**
 * UX-7.3 — BATCH ACTIONS BAR
 *
 * Throughput toolbar for the Review Centre. Appears when one or more reviews
 * are selected and lets an authorised reviewer process them together.
 *
 * Doctrine:
 *   - No action executes until the reviewer confirms in a dialog.
 *   - Each confirmed action fans out to the store's existing single-item flow
 *     (passed in via callbacks) — no new approval path, no bypass.
 *   - Every batch action records an audit entry (reviewBatchEngine).
 *   - Safeguards (high-risk / financially sensitive / mixed-type / large batch)
 *     must be explicitly acknowledged before destructive actions proceed.
 */

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  CheckCircle2,
  XCircle,
  PenLine,
  UserPlus,
  X,
  AlertTriangle,
  ShieldAlert,
} from "lucide-react";
import { formatGbp } from "@/lib/reviewIntelligenceEngine";
import {
  computeBatchSummary,
  evaluateSafeguards,
  recordBatchAudit,
  REVIEWER_OPTIONS,
  type BatchReviewInput,
  type BatchActionType,
} from "@/lib/reviewBatchEngine";

interface BatchActionsBarProps {
  selected: BatchReviewInput[];
  currentUserName: string;
  onApprove: (ids: string[]) => void;
  onReject: (ids: string[], reason: string) => void;
  onCorrection: (ids: string[], reason: string, note: string) => void;
  onAssign: (ids: string[], assignee: string) => void;
  onClear: () => void;
}

type ActiveDialog = BatchActionType | null;

export function BatchActionsBar({
  selected,
  currentUserName,
  onApprove,
  onReject,
  onCorrection,
  onAssign,
  onClear,
}: BatchActionsBarProps) {
  const summary = useMemo(() => computeBatchSummary(selected), [selected]);
  const safeguards = useMemo(() => evaluateSafeguards(summary), [summary]);

  const [dialog, setDialog] = useState<ActiveDialog>(null);
  const [reason, setReason] = useState("");
  const [note, setNote] = useState("");
  const [assignee, setAssignee] = useState<string>(REVIEWER_OPTIONS[0]);
  const [acknowledged, setAcknowledged] = useState<Record<string, boolean>>({});

  if (selected.length === 0) return null;

  const ids = selected.map((s) => s.id);
  const allAcknowledged = safeguards.every((s) => acknowledged[s.key]);

  function openDialog(action: BatchActionType) {
    setReason("");
    setNote("");
    setAssignee(REVIEWER_OPTIONS[0]);
    setAcknowledged({});
    setDialog(action);
  }

  function closeDialog() {
    setDialog(null);
  }

  function confirm() {
    if (!dialog) return;

    const base = {
      user: currentUserName,
      reviewCount: ids.length,
      reviewIds: ids,
      financialTotal: summary.total,
    };

    if (dialog === "batch-approve") {
      recordBatchAudit({ action: dialog, ...base });
      onApprove(ids);
    } else if (dialog === "batch-reject") {
      recordBatchAudit({ action: dialog, ...base, reason });
      onReject(ids, reason);
    } else if (dialog === "batch-correction") {
      recordBatchAudit({ action: dialog, ...base, reason, reviewerNote: note });
      onCorrection(ids, reason, note);
    } else if (dialog === "batch-assign") {
      recordBatchAudit({ action: dialog, ...base, assignee });
      onAssign(ids, assignee);
    }

    closeDialog();
    onClear();
  }

  // Validation per action.
  const reasonRequired = dialog === "batch-reject" || dialog === "batch-correction";
  const noteRequired = dialog === "batch-correction";
  const canConfirm =
    allAcknowledged &&
    (!reasonRequired || reason.trim().length > 0) &&
    (!noteRequired || note.trim().length > 0);

  return (
    <>
      {/* Toolbar */}
      <div
        className="sticky bottom-4 z-20 flex flex-col gap-3 rounded-lg border border-slate-200 bg-white p-3 shadow-lg sm:flex-row sm:items-center sm:justify-between"
        data-testid="batch-actions-bar"
      >
        <div className="flex flex-wrap items-center gap-3">
          <Badge
            variant="secondary"
            className="bg-blue-50 text-blue-700"
            data-testid="batch-selected-count"
          >
            {summary.count} selected
          </Badge>
          <span className="text-sm text-slate-600" data-testid="batch-financial-impact">
            Est. impact:{" "}
            <span className="font-semibold text-slate-900">
              {formatGbp(summary.total)}
            </span>
          </span>
          {summary.mixedType && (
            <Badge
              variant="outline"
              className="border-amber-200 bg-amber-50 text-amber-700"
              data-testid="batch-mixed-type-warning"
            >
              <AlertTriangle className="mr-1 h-3 w-3" /> Mixed types
            </Badge>
          )}
          {summary.riskCount > 0 && (
            <Badge
              variant="outline"
              className="border-rose-200 bg-rose-50 text-rose-700"
              data-testid="batch-risk-warning"
            >
              <ShieldAlert className="mr-1 h-3 w-3" /> {summary.riskCount} high-risk
            </Badge>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            size="sm"
            className="bg-green-600 hover:bg-green-700 text-white"
            data-testid="batch-approve-btn"
            onClick={() => openDialog("batch-approve")}
          >
            <CheckCircle2 className="mr-1 h-4 w-4" /> Approve Selected
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="border-rose-200 text-rose-600 hover:bg-rose-50"
            data-testid="batch-reject-btn"
            onClick={() => openDialog("batch-reject")}
          >
            <XCircle className="mr-1 h-4 w-4" /> Reject Selected
          </Button>
          <Button
            size="sm"
            variant="outline"
            data-testid="batch-correction-btn"
            onClick={() => openDialog("batch-correction")}
          >
            <PenLine className="mr-1 h-4 w-4" /> Request Correction
          </Button>
          <Button
            size="sm"
            variant="outline"
            data-testid="batch-assign-btn"
            onClick={() => openDialog("batch-assign")}
          >
            <UserPlus className="mr-1 h-4 w-4" /> Assign Reviewer
          </Button>
          <Button
            size="sm"
            variant="ghost"
            data-testid="batch-clear-btn"
            onClick={onClear}
          >
            <X className="mr-1 h-4 w-4" /> Clear
          </Button>
        </div>
      </div>

      {/* Confirmation dialog */}
      <Dialog open={dialog !== null} onOpenChange={(o) => !o && closeDialog()}>
        <DialogContent className="max-h-[90vh] overflow-y-auto" data-testid="batch-confirm-dialog">
          <DialogHeader>
            <DialogTitle>{dialogTitle(dialog)}</DialogTitle>
            <DialogDescription>
              Review the summary below. Nothing is actioned until you confirm.
            </DialogDescription>
          </DialogHeader>

          {/* Financial impact summary (informational) */}
          <div
            className="rounded-md border border-slate-100 bg-slate-50 p-3 text-sm"
            data-testid="batch-summary"
          >
            <div className="grid grid-cols-2 gap-2">
              <SummaryRow label="Reviews" value={String(summary.count)} />
              <SummaryRow
                label="High-risk"
                value={String(summary.riskCount)}
                danger={summary.riskCount > 0}
              />
              <SummaryRow label="Revenue" value={formatGbp(summary.revenue)} />
              <SummaryRow label="Cost" value={formatGbp(summary.cost)} />
              <SummaryRow label="Payroll" value={formatGbp(summary.payroll)} />
              <SummaryRow label="Total impact" value={formatGbp(summary.total)} bold />
            </div>
          </div>

          {/* Action-specific inputs */}
          {dialog === "batch-reject" && (
            <div className="space-y-1">
              <Label htmlFor="batch-reason">Rejection reason (required)</Label>
              <Textarea
                id="batch-reason"
                data-testid="batch-reason-input"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Why are these reviews being rejected?"
              />
            </div>
          )}

          {dialog === "batch-correction" && (
            <>
              <div className="space-y-1">
                <Label htmlFor="batch-reason">Correction reason (required)</Label>
                <Textarea
                  id="batch-reason"
                  data-testid="batch-reason-input"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="What needs correcting?"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="batch-note">Reviewer note (required)</Label>
                <Textarea
                  id="batch-note"
                  data-testid="batch-note-input"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Guidance for the worker resubmitting."
                />
              </div>
            </>
          )}

          {dialog === "batch-assign" && (
            <div className="space-y-1">
              <Label>Assign to</Label>
              <Select value={assignee} onValueChange={setAssignee}>
                <SelectTrigger data-testid="batch-assignee-select">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {REVIEWER_OPTIONS.map((r) => (
                    <SelectItem key={r} value={r}>
                      {r}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Safeguards — explicit acknowledgement */}
          {safeguards.length > 0 && (
            <div className="space-y-2" data-testid="batch-safeguards">
              {safeguards.map((s) => (
                <label
                  key={s.key}
                  className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 p-2 text-sm"
                  data-testid={`batch-safeguard-${s.key}`}
                >
                  <Checkbox
                    checked={!!acknowledged[s.key]}
                    onCheckedChange={(v) =>
                      setAcknowledged((prev) => ({ ...prev, [s.key]: !!v }))
                    }
                    data-testid={`batch-safeguard-ack-${s.key}`}
                  />
                  <span>
                    <span className="font-medium text-amber-800">{s.label}.</span>{" "}
                    <span className="text-amber-700">{s.detail}</span>
                  </span>
                </label>
              ))}
            </div>
          )}

          <DialogFooter>
            <Button variant="ghost" onClick={closeDialog}>
              Cancel
            </Button>
            <Button
              data-testid="batch-confirm-btn"
              disabled={!canConfirm}
              onClick={confirm}
              className={
                dialog === "batch-reject"
                  ? "bg-rose-600 hover:bg-rose-700 text-white"
                  : "bg-blue-600 hover:bg-blue-700 text-white"
              }
            >
              {confirmLabel(dialog, summary.count)}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function SummaryRow({
  label,
  value,
  bold,
  danger,
}: {
  label: string;
  value: string;
  bold?: boolean;
  danger?: boolean;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-slate-500">{label}</span>
      <span
        className={`${bold ? "font-bold" : "font-medium"} ${
          danger ? "text-rose-600" : "text-slate-900"
        }`}
      >
        {value}
      </span>
    </div>
  );
}

function dialogTitle(action: ActiveDialog): string {
  switch (action) {
    case "batch-approve":
      return "Approve selected reviews";
    case "batch-reject":
      return "Reject selected reviews";
    case "batch-correction":
      return "Request correction on selected reviews";
    case "batch-assign":
      return "Assign reviewer";
    default:
      return "";
  }
}

function confirmLabel(action: ActiveDialog, count: number): string {
  switch (action) {
    case "batch-approve":
      return `Approve ${count}`;
    case "batch-reject":
      return `Reject ${count}`;
    case "batch-correction":
      return `Request correction (${count})`;
    case "batch-assign":
      return `Assign ${count}`;
    default:
      return "Confirm";
  }
}
