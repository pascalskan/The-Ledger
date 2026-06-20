/**
 * UX-7.2 — REVIEW PRIORITY ENGINE
 *
 * Turns the Review Centre's chronological backlog into an intelligent decision
 * queue, answering: "What should I review first?"
 *
 * Core principle (doctrine):
 *   - Prioritisation influences VISIBILITY ONLY.
 *   - Prioritisation NEVER influences approval outcomes. Nothing here approves,
 *     rejects, corrects, or mutates anything. It scores and orders; humans still
 *     decide in the Review Centre.
 *
 * Determinism: every score is a pure function of an immutable
 * ReviewExposureRecord (+ stable lookup tables). Ages are derived live so the
 * queue stays truthful over time, but the score weighting is fixed and testable.
 *
 * This layer sits on top of UX-7.1's reviewIntelligenceEngine and reuses its
 * record shape and seed — it does not touch the store's approval-bearing
 * reviewItems.
 */

import {
  REVIEW_EXPOSURE_SEED,
  ageHoursOf,
  formatAge,
  formatGbp,
  type ReviewExposureRecord,
  type ReviewCategory,
  type RiskLevel,
} from "@/lib/reviewIntelligenceEngine";

// ── Priority taxonomy ───────────────────────────────────────────────────────

export type PriorityCategory = "Critical" | "High" | "Medium" | "Low";

export const PRIORITY_CATEGORIES: PriorityCategory[] = [
  "Critical",
  "High",
  "Medium",
  "Low",
];

interface PriorityMeta {
  label: PriorityCategory;
  /** Tailwind classes for an outline badge. */
  badgeClass: string;
  /** Solid dot / accent colour class. */
  dotClass: string;
  /** Sort rank — lower = more urgent. */
  rank: number;
  description: string;
}

const PRIORITY_META: Record<PriorityCategory, PriorityMeta> = {
  Critical: {
    label: "Critical",
    badgeClass: "bg-rose-50 text-rose-700 border-rose-200",
    dotClass: "bg-rose-500",
    rank: 0,
    description: "Review first — high value, high risk, or SLA-breaching.",
  },
  High: {
    label: "High",
    badgeClass: "bg-amber-50 text-amber-700 border-amber-200",
    dotClass: "bg-amber-500",
    rank: 1,
    description: "Material exposure or approaching SLA.",
  },
  Medium: {
    label: "Medium",
    badgeClass: "bg-sky-50 text-sky-700 border-sky-200",
    dotClass: "bg-sky-500",
    rank: 2,
    description: "Standard exposure, within window.",
  },
  Low: {
    label: "Low",
    badgeClass: "bg-slate-50 text-slate-600 border-slate-200",
    dotClass: "bg-slate-400",
    rank: 3,
    description: "Low impact, no time pressure.",
  },
};

export function getPriorityMeta(category: PriorityCategory): PriorityMeta {
  return PRIORITY_META[category];
}

/** Sort comparator: most urgent first (Critical → Low). */
export function comparePriorityCategory(
  a: PriorityCategory,
  b: PriorityCategory
): number {
  return PRIORITY_META[a].rank - PRIORITY_META[b].rank;
}

// ── Scoring weights (fixed, deterministic) ──────────────────────────────────

const TYPE_WEIGHT: Record<ReviewCategory, number> = {
  Timesheets: 10, // payroll-bearing, time sensitive
  Reports: 9, // often gate billing / revenue
  Expenses: 7,
  "Equipment Usage": 6,
  "Inventory Usage": 6,
  "QA Records": 4,
  Uploads: 2,
};

const RISK_WEIGHT: Record<RiskLevel, number> = { low: 0, medium: 10, high: 20 };

/**
 * Client importance lookup, keyed by jobId. Mock-derived for the prototype:
 * the kitchen-extraction job is the flagship engagement, maintenance is routine.
 * Defaults to medium importance for any unmapped job.
 */
const JOB_CLIENT_IMPORTANCE: Record<string, number> = {
  "dj-kitchen-extract-1": 6,
  "dj-showcase-maint-1": 3,
};

function clientImportance(jobId: string): number {
  return JOB_CLIENT_IMPORTANCE[jobId] ?? 4;
}

// ── Per-record priority ─────────────────────────────────────────────────────

export interface PriorityFactor {
  label: string;
  points: number;
  detail: string;
}

export interface ReviewPriority {
  /** 0–100, capped. */
  score: number;
  category: PriorityCategory;
  factors: PriorityFactor[];
  overdue: boolean;
}

const round = (n: number) => Math.round(n);

/** Pure: compute the priority of a single review exposure record. */
export function computeReviewPriority(
  record: ReviewExposureRecord
): ReviewPriority {
  const ageHours = ageHoursOf(record);
  const slaRatio = record.slaHours > 0 ? ageHours / record.slaHours : 0;
  const overdue = slaRatio > 1;

  const factors: PriorityFactor[] = [];

  // 1. SLA / time pressure (up to 30).
  const slaPoints = Math.min(30, round(slaRatio * 25));
  factors.push({
    label: "Time pressure",
    points: slaPoints,
    detail: `${formatAge(ageHours)} of ${record.slaHours}h SLA used`,
  });

  // 2. SLA breach bonus (15).
  if (overdue) {
    factors.push({
      label: "SLA breached",
      points: 15,
      detail: "Past the target approval window",
    });
  }

  // 3. Financial materiality (up to 20).
  const finPoints = Math.min(20, round(record.financialImpact / 250));
  if (finPoints > 0) {
    factors.push({
      label: "Financial impact",
      points: finPoints,
      detail: formatGbp(record.financialImpact) + " blocked",
    });
  }

  // 4. Exposure class emphasis.
  if (record.financialClass === "revenue") {
    factors.push({
      label: "Revenue exposure",
      points: 8,
      detail: "Blocks billable revenue",
    });
  } else if (record.financialClass === "payroll") {
    factors.push({
      label: "Payroll exposure",
      points: 6,
      detail: "Blocks worker pay",
    });
  }

  // 5. Review type weight.
  factors.push({
    label: "Review type",
    points: TYPE_WEIGHT[record.reviewType],
    detail: record.reviewType,
  });

  // 6. Job risk level.
  if (RISK_WEIGHT[record.risk] > 0) {
    factors.push({
      label: "Job risk",
      points: RISK_WEIGHT[record.risk],
      detail: `${record.risk} risk`,
    });
  }

  // 7. Governance relevance (CEO-reserved decision).
  if (record.awaitingCeo) {
    factors.push({
      label: "Governance",
      points: 8,
      detail: "Reserved for CEO approval",
    });
  }

  // 8. Client importance.
  const importance = clientImportance(record.jobId);
  factors.push({
    label: "Client importance",
    points: importance,
    detail: record.jobCode,
  });

  const rawScore = factors.reduce((s, f) => s + f.points, 0);
  const score = Math.min(100, rawScore);

  const category: PriorityCategory =
    score >= 75 || overdue
      ? "Critical"
      : score >= 55
      ? "High"
      : score >= 35
      ? "Medium"
      : "Low";

  return {
    score,
    category,
    overdue,
    // Most influential factors first for the detail view.
    factors: [...factors].sort((a, b) => b.points - a.points),
  };
}

// ── Prioritised queue ───────────────────────────────────────────────────────

export interface PrioritisedReview extends ReviewExposureRecord {
  priority: ReviewPriority;
  ageHours: number;
  ageLabel: string;
  /** 1-based position in the priority-ordered pending queue. */
  queuePosition: number;
}

/**
 * Build the full priority-ordered queue of PENDING reviews (most urgent first).
 * Pure; defaults to the UX-7.1 seed.
 */
export function computePriorityQueue(
  records: ReviewExposureRecord[] = REVIEW_EXPOSURE_SEED
): PrioritisedReview[] {
  const pending = records.filter((r) => r.status === "pending");

  const scored = pending.map((r) => {
    const ageHours = ageHoursOf(r);
    return {
      ...r,
      priority: computeReviewPriority(r),
      ageHours,
      ageLabel: formatAge(ageHours),
      queuePosition: 0, // assigned after sort
    } as PrioritisedReview;
  });

  scored.sort(
    (a, b) =>
      comparePriorityCategory(a.priority.category, b.priority.category) ||
      b.priority.score - a.priority.score ||
      b.ageHours - a.ageHours
  );

  scored.forEach((r, i) => {
    r.queuePosition = i + 1;
  });

  return scored;
}

// ── Distribution + insights ─────────────────────────────────────────────────

export interface PriorityDistribution {
  category: PriorityCategory;
  count: number;
  percent: number;
}

export function computePriorityDistribution(
  queue: PrioritisedReview[] = computePriorityQueue()
): PriorityDistribution[] {
  const total = queue.length;
  return PRIORITY_CATEGORIES.map((category) => {
    const count = queue.filter((r) => r.priority.category === category).length;
    return {
      category,
      count,
      percent: total > 0 ? Math.round((count / total) * 100) : 0,
    };
  });
}

export function computePriorityInsights(
  queue: PrioritisedReview[] = computePriorityQueue()
): string[] {
  const insights: string[] = [];
  const total = queue.length;
  if (total === 0) return ["No pending reviews to prioritise."];

  const critical = queue.filter((r) => r.priority.category === "Critical");
  if (critical.length > 0) {
    insights.push(
      `${critical.length} review${
        critical.length === 1 ? "" : "s"
      } classified as Critical.`
    );
  }

  const payroll = queue.filter((r) => r.financialClass === "payroll");
  if (payroll.length > 0) {
    insights.push(
      `Payroll reviews account for ${Math.round(
        (payroll.length / total) * 100
      )}% of priority workload.`
    );
  }

  const revenueExposure = queue
    .filter((r) => r.financialClass === "revenue")
    .reduce((s, r) => s + r.financialImpact, 0);
  if (revenueExposure > 0) {
    insights.push(`Revenue exposure totals ${formatGbp(revenueExposure)}.`);
  }

  const criticalOverdue = critical.filter((r) => r.priority.overdue).length;
  if (criticalOverdue > 0) {
    insights.push(
      `${criticalOverdue} critical review${
        criticalOverdue === 1 ? "" : "s"
      } exceed approval SLA.`
    );
  }

  const high = queue.filter((r) => r.priority.category === "High").length;
  if (high > 0) {
    insights.push(`${high} review${high === 1 ? "" : "s"} are High priority.`);
  }

  return insights;
}

// ── Executive attention buckets ─────────────────────────────────────────────

export interface ExecutiveAttention {
  critical: PrioritisedReview[];
  revenueAtRisk: PrioritisedReview[];
  payrollSensitive: PrioritisedReview[];
  oldestHighPriority: PrioritisedReview[];
}

export function computeExecutiveAttention(
  queue: PrioritisedReview[] = computePriorityQueue()
): ExecutiveAttention {
  const isHighOrCritical = (r: PrioritisedReview) =>
    r.priority.category === "Critical" || r.priority.category === "High";

  return {
    critical: queue.filter((r) => r.priority.category === "Critical"),
    revenueAtRisk: queue
      .filter((r) => r.financialClass === "revenue" && r.financialImpact > 0)
      .sort((a, b) => b.financialImpact - a.financialImpact)
      .slice(0, 5),
    payrollSensitive: queue
      .filter((r) => r.financialClass === "payroll")
      .sort((a, b) => b.financialImpact - a.financialImpact)
      .slice(0, 5),
    oldestHighPriority: queue
      .filter(isHighOrCritical)
      .sort((a, b) => b.ageHours - a.ageHours)
      .slice(0, 5),
  };
}

// ── Per-job + per-review lookups (for the queue toggle + detail view) ────────

/** Highest priority category among a job's pending reviews (Low if none). */
export function getJobPriority(jobId: string): {
  category: PriorityCategory;
  topScore: number;
  pendingCount: number;
} {
  const jobReviews = computePriorityQueue().filter((r) => r.jobId === jobId);
  if (jobReviews.length === 0) {
    return { category: "Low", topScore: 0, pendingCount: 0 };
  }
  // Queue is already priority-sorted, so the first match is the most urgent.
  const top = jobReviews[0];
  return {
    category: top.priority.category,
    topScore: top.priority.score,
    pendingCount: jobReviews.length,
  };
}

/**
 * Rank for sorting jobs by aggregated priority. Lower = more urgent. Combines
 * the job's top category rank with its top score so ties break sensibly.
 */
export function getJobPriorityRank(jobId: string): number {
  const { category, topScore } = getJobPriority(jobId);
  return PRIORITY_META[category].rank * 1000 - topScore;
}

/** Full priority context for a single review (used by the detail view). */
export function getReviewPriorityContext(reviewId: string): PrioritisedReview | null {
  return computePriorityQueue().find((r) => r.id === reviewId) ?? null;
}
