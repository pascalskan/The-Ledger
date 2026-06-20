/**
 * UX-7.6 — REVIEW OPERATIONS ANALYTICS ENGINE
 *
 * Measures how efficiently the business makes decisions, answering:
 *   "How healthy is our review operation?"
 *
 * Core principle (doctrine):
 *   - This phase MEASURES decision-making; it never alters it. No review or
 *     approval behaviour changes. Everything here is read-only and derived.
 *   - Pure and deterministic: identical inputs → identical analytics. Trend and
 *     reviewer figures are mock-derived from stable seeds so output is testable.
 *
 * Built on UX-7.1's reviewIntelligenceEngine (ReviewExposureRecord +
 * REVIEW_EXPOSURE_SEED) and aligned with UX-7.4 decision intelligence for the
 * financial throughput figures.
 */

import {
  REVIEW_EXPOSURE_SEED,
  REVIEW_CATEGORIES,
  ageHoursOf,
  formatAge,
  formatGbp,
  type ReviewExposureRecord,
  type ReviewCategory,
} from "@/lib/reviewIntelligenceEngine";

const HOUR = 3600_000;

function isToday(iso?: string): boolean {
  if (!iso) return false;
  const d = new Date(iso);
  const now = new Date();
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  );
}

function isOverdue(r: ReviewExposureRecord): boolean {
  return r.status === "pending" && ageHoursOf(r) > r.slaHours;
}

// ── Volume + throughput ─────────────────────────────────────────────────────

export interface VolumeMetrics {
  total: number;
  pending: number;
  completed: number;
  approved: number;
  rejected: number;
  corrected: number;
}

export interface ThroughputMetrics {
  processedToday: number;
  processedThisWeek: number;
  averageDaily: number;
  averageWeekly: number;
}

export function computeVolumeMetrics(
  records: ReviewExposureRecord[] = REVIEW_EXPOSURE_SEED
): VolumeMetrics {
  return {
    total: records.length,
    pending: records.filter((r) => r.status === "pending").length,
    completed: records.filter((r) => r.status !== "pending").length,
    approved: records.filter((r) => r.status === "approved").length,
    rejected: records.filter((r) => r.status === "rejected").length,
    corrected: records.filter((r) => r.status === "corrected").length,
  };
}

// Mock-but-stable weekly throughput profile (per weekday completions).
const WEEKLY_THROUGHPUT = [6, 8, 7, 9, 11, 4, 2]; // Mon…Sun

export function computeThroughputMetrics(
  records: ReviewExposureRecord[] = REVIEW_EXPOSURE_SEED
): ThroughputMetrics {
  const processedToday = records.filter(
    (r) => r.status !== "pending" && isToday(r.reviewedAt)
  ).length;
  const weekTotal = WEEKLY_THROUGHPUT.reduce((s, n) => s + n, 0);
  return {
    processedToday,
    processedThisWeek: weekTotal,
    averageDaily: Math.round(weekTotal / 7),
    averageWeekly: weekTotal,
  };
}

// ── Approval performance ────────────────────────────────────────────────────

export interface ApprovalPerformance {
  avgApprovalHours: number;
  avgRejectionHours: number;
  avgCorrectionHours: number;
  fastestApprovalHours: number;
  slowestApprovalHours: number;
  slaCompliancePercent: number;
}

/** Handling time = reviewedAt − submittedAt (hours), for completed records. */
function handlingHours(r: ReviewExposureRecord): number {
  if (!r.reviewedAt) return 0;
  return Math.max(
    0,
    (new Date(r.reviewedAt).getTime() - new Date(r.submittedAt).getTime()) / HOUR
  );
}

export function computeApprovalPerformance(
  records: ReviewExposureRecord[] = REVIEW_EXPOSURE_SEED
): ApprovalPerformance {
  const completed = records.filter((r) => r.status !== "pending" && r.reviewedAt);
  const byStatus = (s: string) =>
    completed.filter((r) => r.status === s).map(handlingHours);

  const approvals = byStatus("approved");
  const rejections = byStatus("rejected");
  const corrections = byStatus("corrected");

  const avg = (xs: number[]) =>
    xs.length > 0 ? Math.round(xs.reduce((s, n) => s + n, 0) / xs.length) : 0;

  // SLA compliance: completed within SLA + pending still within SLA.
  const slaPool = records.filter((r) => r.reviewedAt || r.status === "pending");
  const compliant = slaPool.filter((r) => {
    const hrs = r.reviewedAt ? handlingHours(r) : ageHoursOf(r);
    return hrs <= r.slaHours;
  }).length;

  return {
    avgApprovalHours: avg(approvals),
    avgRejectionHours: avg(rejections),
    avgCorrectionHours: avg(corrections),
    fastestApprovalHours: approvals.length > 0 ? Math.round(Math.min(...approvals)) : 0,
    slowestApprovalHours: approvals.length > 0 ? Math.round(Math.max(...approvals)) : 0,
    slaCompliancePercent:
      slaPool.length > 0 ? Math.round((compliant / slaPool.length) * 100) : 100,
  };
}

// ── Bottleneck analysis ─────────────────────────────────────────────────────

export interface BottleneckReview {
  id: string;
  reviewType: ReviewCategory;
  jobCode: string;
  ageLabel: string;
  ageHours: number;
  financialImpact: number;
}

export interface BottleneckAnalysis {
  oldestPending: BottleneckReview[];
  largestBacklog: { type: ReviewCategory; count: number }[];
  exceedingSla: BottleneckReview[];
  highRiskAwaiting: BottleneckReview[];
  financiallySensitiveAwaiting: BottleneckReview[];
  warnings: string[];
}

const FINANCIALLY_SENSITIVE = 4000;

function toBottleneck(r: ReviewExposureRecord): BottleneckReview {
  const ageHours = ageHoursOf(r);
  return {
    id: r.id,
    reviewType: r.reviewType,
    jobCode: r.jobCode,
    ageHours,
    ageLabel: formatAge(ageHours),
    financialImpact: r.financialImpact,
  };
}

export function computeBottleneckAnalysis(
  records: ReviewExposureRecord[] = REVIEW_EXPOSURE_SEED
): BottleneckAnalysis {
  const pending = records.filter((r) => r.status === "pending");

  const oldestPending = [...pending]
    .sort((a, b) => ageHoursOf(b) - ageHoursOf(a))
    .slice(0, 5)
    .map(toBottleneck);

  const backlogByType = REVIEW_CATEGORIES.map((type) => ({
    type,
    count: pending.filter((r) => r.reviewType === type).length,
  }))
    .filter((b) => b.count > 0)
    .sort((a, b) => b.count - a.count);

  const exceedingSla = pending.filter(isOverdue).map(toBottleneck);
  const highRiskAwaiting = pending
    .filter((r) => r.risk === "high")
    .map(toBottleneck);
  const financiallySensitiveAwaiting = pending
    .filter((r) => r.financialImpact >= FINANCIALLY_SENSITIVE)
    .map(toBottleneck);

  const warnings: string[] = [];
  if (exceedingSla.length > 0)
    warnings.push(
      `${exceedingSla.length} review${
        exceedingSla.length === 1 ? "" : "s"
      } exceed SLA and need immediate action.`
    );
  if (highRiskAwaiting.length > 0)
    warnings.push(
      `${highRiskAwaiting.length} high-risk review${
        highRiskAwaiting.length === 1 ? "" : "s"
      } awaiting action.`
    );
  if (financiallySensitiveAwaiting.length > 0)
    warnings.push(
      `${financiallySensitiveAwaiting.length} financially sensitive review${
        financiallySensitiveAwaiting.length === 1 ? "" : "s"
      } awaiting action.`
    );
  if (backlogByType[0])
    warnings.push(
      `${backlogByType[0].type} is the largest backlog area (${backlogByType[0].count}).`
    );

  return {
    oldestPending,
    largestBacklog: backlogByType,
    exceedingSla,
    highRiskAwaiting,
    financiallySensitiveAwaiting,
    warnings,
  };
}

// ── Reviewer performance (mock, stable) ─────────────────────────────────────

export interface ReviewerPerformance {
  reviewer: "CEO" | "PM" | "Reviewer";
  completed: number;
  approvalRate: number;
  rejectionRate: number;
  correctionRate: number;
  avgHandlingHours: number;
  currentQueueSize: number;
}

const REVIEWER_SEED: ReviewerPerformance[] = [
  {
    reviewer: "CEO",
    completed: 64,
    approvalRate: 88,
    rejectionRate: 6,
    correctionRate: 6,
    avgHandlingHours: 9,
    currentQueueSize: 4,
  },
  {
    reviewer: "PM",
    completed: 121,
    approvalRate: 82,
    rejectionRate: 5,
    correctionRate: 13,
    avgHandlingHours: 5,
    currentQueueSize: 6,
  },
  {
    reviewer: "Reviewer",
    completed: 88,
    approvalRate: 79,
    rejectionRate: 7,
    correctionRate: 14,
    avgHandlingHours: 7,
    currentQueueSize: 3,
  },
];

export function computeReviewerPerformance(): ReviewerPerformance[] {
  return REVIEWER_SEED.map((r) => ({ ...r }));
}

// ── Review-type analytics ───────────────────────────────────────────────────

export interface ReviewTypeAnalytics {
  type: ReviewCategory;
  volume: number;
  approvalRate: number;
  avgReviewHours: number;
  backlog: number;
}

// Stable per-type approval-rate + handling profile (mock, aligns with 7.5).
const TYPE_PROFILE: Record<
  ReviewCategory,
  { approvalRate: number; avgHours: number }
> = {
  Timesheets: { approvalRate: 90, avgHours: 6 },
  Expenses: { approvalRate: 80, avgHours: 9 },
  "Inventory Usage": { approvalRate: 86, avgHours: 8 },
  "Equipment Usage": { approvalRate: 84, avgHours: 10 },
  Reports: { approvalRate: 79, avgHours: 7 },
  Uploads: { approvalRate: 95, avgHours: 4 },
  "QA Records": { approvalRate: 70, avgHours: 12 },
};

export function computeReviewTypeAnalytics(
  records: ReviewExposureRecord[] = REVIEW_EXPOSURE_SEED
): ReviewTypeAnalytics[] {
  return REVIEW_CATEGORIES.map((type) => {
    const all = records.filter((r) => r.reviewType === type);
    const backlog = all.filter((r) => r.status === "pending").length;
    return {
      type,
      volume: all.length,
      approvalRate: TYPE_PROFILE[type].approvalRate,
      avgReviewHours: TYPE_PROFILE[type].avgHours,
      backlog,
    };
  });
}

// ── Financial throughput (aligned with UX-7.4) ──────────────────────────────

export interface FinancialThroughput {
  revenueAwaiting: number;
  revenueApproved: number;
  revenueDelayed: number;
  costsAwaiting: number;
  costsApproved: number;
  payrollAwaiting: number;
  payrollReleased: number;
}

export function computeFinancialThroughput(
  records: ReviewExposureRecord[] = REVIEW_EXPOSURE_SEED
): FinancialThroughput {
  const sum = (
    pred: (r: ReviewExposureRecord) => boolean
  ): number => records.filter(pred).reduce((s, r) => s + r.financialImpact, 0);

  const pendingClass = (c: string) => (r: ReviewExposureRecord) =>
    r.status === "pending" && r.financialClass === c;
  const approvedClass = (c: string) => (r: ReviewExposureRecord) =>
    r.status === "approved" && r.financialClass === c;

  return {
    revenueAwaiting: sum(pendingClass("revenue")),
    revenueApproved: sum(approvedClass("revenue")),
    revenueDelayed: sum((r) => pendingClass("revenue")(r) && isOverdue(r)),
    costsAwaiting: sum(pendingClass("cost")),
    costsApproved: sum(approvedClass("cost")),
    payrollAwaiting: sum(pendingClass("payroll")),
    payrollReleased: sum(approvedClass("payroll")),
  };
}

// ── Trend analysis (mock-derived directional series) ─────────────────────────

export type TrendDirection = "up" | "down" | "flat";

export interface TrendSeries {
  label: string;
  points: number[];
  changePercent: number;
  direction: TrendDirection;
}

function makeTrend(label: string, points: number[]): TrendSeries {
  const first = points[0] || 0;
  const last = points[points.length - 1] || 0;
  const changePercent = first > 0 ? Math.round(((last - first) / first) * 100) : 0;
  return {
    label,
    points,
    changePercent,
    direction: changePercent > 2 ? "up" : changePercent < -2 ? "down" : "flat",
  };
}

export function computeTrends(): TrendSeries[] {
  return [
    makeTrend("Approval", [22, 24, 26, 25, 28, 30, 31]),
    makeTrend("Rejection", [4, 3, 5, 4, 3, 3, 2]),
    makeTrend("Correction", [6, 7, 6, 8, 7, 6, 5]),
    makeTrend("Backlog", [14, 13, 15, 12, 11, 10, 10]),
    makeTrend("Throughput", [26, 28, 27, 30, 33, 34, 37]),
  ];
}

// ── Operational health score ────────────────────────────────────────────────

export interface OperationalHealth {
  score: number;
  status: "Healthy" | "Stable" | "Strained" | "At Risk";
  explanation: string;
}

export function computeOperationalHealth(
  records: ReviewExposureRecord[] = REVIEW_EXPOSURE_SEED
): OperationalHealth {
  const perf = computeApprovalPerformance(records);
  const bottleneck = computeBottleneckAnalysis(records);
  const volume = computeVolumeMetrics(records);
  const throughput = computeThroughputMetrics(records);

  let score = 100;
  // SLA compliance is the strongest signal.
  score -= Math.round((100 - perf.slaCompliancePercent) * 0.4);
  // Each SLA breach / high-risk / sensitive item awaiting action costs.
  score -= bottleneck.exceedingSla.length * 5;
  score -= bottleneck.highRiskAwaiting.length * 4;
  score -= bottleneck.financiallySensitiveAwaiting.length * 3;
  // Backlog pressure relative to throughput.
  if (throughput.averageDaily > 0 && volume.pending > throughput.averageDaily * 3) {
    score -= 6;
  }
  score = Math.max(0, Math.min(100, score));

  const status: OperationalHealth["status"] =
    score >= 85
      ? "Healthy"
      : score >= 70
      ? "Stable"
      : score >= 50
      ? "Strained"
      : "At Risk";

  const explanation =
    `SLA compliance ${perf.slaCompliancePercent}%, ` +
    `${bottleneck.exceedingSla.length} over SLA, ` +
    `${volume.pending} pending vs ~${throughput.averageDaily}/day throughput.`;

  return { score, status, explanation };
}

// ── Executive analytics insights ────────────────────────────────────────────

export function computeAnalyticsInsights(
  records: ReviewExposureRecord[] = REVIEW_EXPOSURE_SEED
): string[] {
  const insights: string[] = [];
  const throughputTrend = computeTrends().find((t) => t.label === "Throughput");
  if (throughputTrend && throughputTrend.changePercent !== 0) {
    insights.push(
      `Review throughput ${
        throughputTrend.direction === "up" ? "increased" : "changed"
      } ${Math.abs(throughputTrend.changePercent)}% this week.`
    );
  }

  const bottleneck = computeBottleneckAnalysis(records);
  if (bottleneck.largestBacklog[0]) {
    insights.push(
      `${bottleneck.largestBacklog[0].type} represents the largest backlog category.`
    );
  }

  const perf = computeApprovalPerformance(records);
  insights.push(
    perf.slaCompliancePercent >= 80
      ? "Average approval time remains within target SLA."
      : "Average approval time is drifting beyond target SLA."
  );

  const fin = computeFinancialThroughput(records);
  insights.push(
    `Financial exposure awaiting review totals ${formatGbp(
      fin.revenueAwaiting + fin.costsAwaiting + fin.payrollAwaiting
    )}.`
  );

  return insights;
}

// ── Convenience bundle ──────────────────────────────────────────────────────

export interface ReviewAnalyticsModel {
  volume: VolumeMetrics;
  throughput: ThroughputMetrics;
  performance: ApprovalPerformance;
  bottlenecks: BottleneckAnalysis;
  reviewers: ReviewerPerformance[];
  typeAnalytics: ReviewTypeAnalytics[];
  financialThroughput: FinancialThroughput;
  trends: TrendSeries[];
  health: OperationalHealth;
  insights: string[];
}

export function computeReviewAnalyticsModel(
  records: ReviewExposureRecord[] = REVIEW_EXPOSURE_SEED
): ReviewAnalyticsModel {
  return {
    volume: computeVolumeMetrics(records),
    throughput: computeThroughputMetrics(records),
    performance: computeApprovalPerformance(records),
    bottlenecks: computeBottleneckAnalysis(records),
    reviewers: computeReviewerPerformance(),
    typeAnalytics: computeReviewTypeAnalytics(records),
    financialThroughput: computeFinancialThroughput(records),
    trends: computeTrends(),
    health: computeOperationalHealth(records),
    insights: computeAnalyticsInsights(records),
  };
}

export { formatGbp, formatAge };
