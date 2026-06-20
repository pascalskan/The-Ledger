/**
 * UX-7.3 — REVIEW BATCH DECISION ENGINE
 *
 * Throughput tooling for the Review Centre, answering:
 *   "How can I safely process many reviews at once?"
 *
 * Doctrine (unchanged):
 *   - Batch actions are a THROUGHPUT TOOL ONLY. They do not introduce a new
 *     approval path. Each selected review is still actioned through the store's
 *     existing single-item `updateReviewItem` flow (which runs the established
 *     financial-mutation + audit doctrine on approval). The batch layer only
 *     fans out, after EXPLICIT human confirmation.
 *   - No review bypasses approval. No financial mutation occurs without
 *     approval. Every batch action is recorded for auditability.
 *
 * This engine is pure/deterministic except for the in-memory batch audit log,
 * which mirrors the module-level `_auditLog` pattern used elsewhere
 * (notificationEngine, eventBusEngine, activityFeedEngine).
 */

import { formatGbp } from "@/lib/reviewIntelligenceEngine";

// ── Minimal shape the batch tools need from a live review item ───────────────

export interface BatchReviewInput {
  id: string;
  type: string; // "report" | "photo" | "log" | …
  title?: string;
  notes?: string;
  content?: string;
}

export type FinancialClass = "revenue" | "cost" | "payroll" | "neutral";

export interface ReviewImpactEstimate {
  amount: number;
  financialClass: FinancialClass;
  highRisk: boolean;
}

// Deterministic, stable hash → small jitter so estimates vary per item without
// any randomness (keeps tests reproducible).
function stableHash(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) {
    h = (h * 31 + id.charCodeAt(i)) >>> 0;
  }
  return h;
}

const RISK_PATTERN = /incident|safety|hazard|issue|near miss|breach|fail/i;

/**
 * Estimate the financial impact and risk of a single live review item.
 * Mock-derived (the prototype's review items carry no financial fields), but
 * fully deterministic so batch summaries are reproducible and testable.
 */
export function estimateReviewImpact(item: BatchReviewInput): ReviewImpactEstimate {
  const jitter = (stableHash(item.id) % 6) * 100; // 0…500
  let amount = 0;
  let financialClass: FinancialClass = "neutral";

  switch (item.type) {
    case "report":
    case "worker-report":
      amount = 1500 + jitter;
      financialClass = "revenue";
      break;
    case "log":
      amount = 600 + jitter;
      financialClass = "cost";
      break;
    case "timesheet":
      amount = 900 + jitter;
      financialClass = "payroll";
      break;
    case "expense":
      amount = 400 + jitter;
      financialClass = "cost";
      break;
    default: // photo, upload, qa, …
      amount = 0;
      financialClass = "neutral";
  }

  const text = `${item.title ?? ""} ${item.notes ?? ""} ${item.content ?? ""}`;
  const highRisk = RISK_PATTERN.test(text) || amount >= 1900;

  return { amount, financialClass, highRisk };
}

// ── Batch summary ───────────────────────────────────────────────────────────

export interface BatchSummary {
  count: number;
  revenue: number;
  cost: number;
  payroll: number;
  total: number;
  riskCount: number;
  types: string[];
  mixedType: boolean;
}

export function computeBatchSummary(items: BatchReviewInput[]): BatchSummary {
  const types = Array.from(new Set(items.map((i) => i.type)));
  let revenue = 0;
  let cost = 0;
  let payroll = 0;
  let riskCount = 0;

  for (const item of items) {
    const est = estimateReviewImpact(item);
    if (est.financialClass === "revenue") revenue += est.amount;
    else if (est.financialClass === "cost") cost += est.amount;
    else if (est.financialClass === "payroll") payroll += est.amount;
    if (est.highRisk) riskCount += 1;
  }

  return {
    count: items.length,
    revenue,
    cost,
    payroll,
    total: revenue + cost + payroll,
    riskCount,
    types,
    mixedType: types.length > 1,
  };
}

// ── Safeguards ──────────────────────────────────────────────────────────────

export type SafeguardSeverity = "warning" | "caution";

export interface Safeguard {
  key: "high-risk" | "financially-sensitive" | "mixed-type" | "large-batch";
  label: string;
  detail: string;
  severity: SafeguardSeverity;
}

export const FINANCIALLY_SENSITIVE_THRESHOLD = 5000;
export const LARGE_BATCH_THRESHOLD = 5;

/**
 * Evaluate which safeguards apply to a batch. Each returned safeguard must be
 * explicitly acknowledged before a destructive batch action can proceed.
 */
export function evaluateSafeguards(summary: BatchSummary): Safeguard[] {
  const safeguards: Safeguard[] = [];

  if (summary.riskCount > 0) {
    safeguards.push({
      key: "high-risk",
      label: "High-risk reviews",
      detail: `${summary.riskCount} selected review${
        summary.riskCount === 1 ? "" : "s"
      } flagged high-risk.`,
      severity: "warning",
    });
  }

  if (summary.total >= FINANCIALLY_SENSITIVE_THRESHOLD) {
    safeguards.push({
      key: "financially-sensitive",
      label: "Financially sensitive",
      detail: `Estimated financial impact of ${formatGbp(
        summary.total
      )} exceeds the ${formatGbp(FINANCIALLY_SENSITIVE_THRESHOLD)} threshold.`,
      severity: "warning",
    });
  }

  if (summary.mixedType) {
    safeguards.push({
      key: "mixed-type",
      label: "Mixed review types",
      detail: `Selection spans ${summary.types.length} review types (${summary.types.join(
        ", "
      )}).`,
      severity: "caution",
    });
  }

  if (summary.count >= LARGE_BATCH_THRESHOLD) {
    safeguards.push({
      key: "large-batch",
      label: "Large batch",
      detail: `${summary.count} reviews selected — confirm you intend to action them all.`,
      severity: "caution",
    });
  }

  return safeguards;
}

// ── Batch audit log (in-memory, mirrors existing engine pattern) ─────────────

export type BatchActionType =
  | "batch-approve"
  | "batch-reject"
  | "batch-correction"
  | "batch-assign";

export interface BatchAuditEntry {
  id: string;
  action: BatchActionType;
  user: string;
  timestamp: string;
  reviewCount: number;
  reviewIds: string[];
  reason?: string;
  reviewerNote?: string;
  assignee?: string;
  financialTotal: number;
}

let _batchAuditLog: BatchAuditEntry[] = [];

export function recordBatchAudit(
  entry: Omit<BatchAuditEntry, "id" | "timestamp">
): BatchAuditEntry {
  const full: BatchAuditEntry = {
    ...entry,
    id: `batch-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    timestamp: new Date().toISOString(),
  };
  _batchAuditLog = [full, ..._batchAuditLog];
  return full;
}

export function getBatchAuditLog(): BatchAuditEntry[] {
  return [..._batchAuditLog];
}

/** Test helper — reset the in-memory batch audit log. */
export function clearBatchAuditLog(): void {
  _batchAuditLog = [];
}

export const BATCH_ACTION_LABELS: Record<BatchActionType, string> = {
  "batch-approve": "Approved",
  "batch-reject": "Rejected",
  "batch-correction": "Requested correction",
  "batch-assign": "Assigned reviewer",
};

// ── Reviewer assignment options (mock) ───────────────────────────────────────

export const REVIEWER_OPTIONS = ["CEO", "PM", "Reviewer"] as const;
export type ReviewerOption = (typeof REVIEWER_OPTIONS)[number];
