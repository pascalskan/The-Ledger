/**
 * UX-7.5 — REVIEW RECOMMENDATION ENGINE
 *
 * Surfaces historical intelligence to help reviewers decide better and faster,
 * answering: "What would I normally do here?"
 *
 * Core principle (doctrine):
 *   - Recommendations are GUIDANCE ONLY. This engine never approves, rejects,
 *     requests corrections, or triggers workflows. The human reviewer remains
 *     responsible for every decision.
 *   - Pure and deterministic: identical inputs → identical recommendations.
 *     Historical "similar decisions" are mock-derived from a stable seed.
 *
 * Built on UX-7.1's reviewIntelligenceEngine (ReviewExposureRecord +
 * REVIEW_EXPOSURE_SEED).
 */

import {
  REVIEW_EXPOSURE_SEED,
  ageHoursOf,
  type ReviewExposureRecord,
  type ReviewCategory,
} from "@/lib/reviewIntelligenceEngine";

// ── Taxonomy ────────────────────────────────────────────────────────────────

export type RecommendationType =
  | "Likely Approve"
  | "Likely Reject"
  | "Likely Correction"
  | "Requires Human Review";

export const RECOMMENDATION_TYPES: RecommendationType[] = [
  "Likely Approve",
  "Likely Reject",
  "Likely Correction",
  "Requires Human Review",
];

export type ConfidenceLevel = "Very High" | "High" | "Medium" | "Low";

export const CONFIDENCE_LEVELS: ConfidenceLevel[] = [
  "Very High",
  "High",
  "Medium",
  "Low",
];

interface RecommendationMeta {
  badgeClass: string;
  dotClass: string;
}

const RECOMMENDATION_META: Record<RecommendationType, RecommendationMeta> = {
  "Likely Approve": {
    badgeClass: "bg-emerald-50 text-emerald-700 border-emerald-200",
    dotClass: "bg-emerald-500",
  },
  "Likely Reject": {
    badgeClass: "bg-rose-50 text-rose-700 border-rose-200",
    dotClass: "bg-rose-500",
  },
  "Likely Correction": {
    badgeClass: "bg-amber-50 text-amber-700 border-amber-200",
    dotClass: "bg-amber-500",
  },
  "Requires Human Review": {
    badgeClass: "bg-violet-50 text-violet-700 border-violet-200",
    dotClass: "bg-violet-500",
  },
};

export function getRecommendationMeta(t: RecommendationType): RecommendationMeta {
  return RECOMMENDATION_META[t];
}

const CONFIDENCE_BADGE: Record<ConfidenceLevel, string> = {
  "Very High": "bg-emerald-50 text-emerald-700 border-emerald-200",
  High: "bg-sky-50 text-sky-700 border-sky-200",
  Medium: "bg-amber-50 text-amber-700 border-amber-200",
  Low: "bg-slate-50 text-slate-600 border-slate-200",
};

export function getConfidenceBadge(c: ConfidenceLevel): string {
  return CONFIDENCE_BADGE[c];
}

// ── Similar historical decisions (deterministic, mock-derived) ───────────────

export interface SimilarDecisions {
  approvals: number;
  rejections: number;
  corrections: number;
  total: number;
  /** Dominant historical outcome. */
  outcome: "approved" | "rejected" | "corrected";
  /** Approval rate, 0–100. */
  approvalRate: number;
  lastOccurrence: string; // human label, e.g. "3 days ago"
}

// Stable per-type historical profile (mock). Keyed by review category so the
// same type always yields the same history — reproducible for tests.
const TYPE_HISTORY: Record<
  ReviewCategory,
  { approvals: number; rejections: number; corrections: number; lastDays: number }
> = {
  Timesheets: { approvals: 142, rejections: 4, corrections: 11, lastDays: 1 },
  Expenses: { approvals: 96, rejections: 6, corrections: 18, lastDays: 2 },
  "Inventory Usage": { approvals: 73, rejections: 3, corrections: 9, lastDays: 3 },
  "Equipment Usage": { approvals: 61, rejections: 5, corrections: 7, lastDays: 4 },
  Reports: { approvals: 88, rejections: 9, corrections: 14, lastDays: 1 },
  Uploads: { approvals: 120, rejections: 2, corrections: 5, lastDays: 1 },
  "QA Records": { approvals: 54, rejections: 4, corrections: 22, lastDays: 2 },
};

function lastOccurrenceLabel(days: number): string {
  if (days <= 0) return "today";
  if (days === 1) return "1 day ago";
  return `${days} days ago`;
}

export function getSimilarDecisions(type: ReviewCategory): SimilarDecisions {
  const h = TYPE_HISTORY[type];
  const total = h.approvals + h.rejections + h.corrections;
  const approvalRate = total > 0 ? Math.round((h.approvals / total) * 100) : 0;
  const outcome =
    h.approvals >= h.rejections && h.approvals >= h.corrections
      ? "approved"
      : h.corrections >= h.rejections
      ? "corrected"
      : "rejected";
  return {
    approvals: h.approvals,
    rejections: h.rejections,
    corrections: h.corrections,
    total,
    outcome,
    approvalRate,
    lastOccurrence: lastOccurrenceLabel(h.lastDays),
  };
}

// ── Per-review recommendation ───────────────────────────────────────────────

export interface ReviewRecommendation {
  type: RecommendationType;
  confidence: ConfidenceLevel;
  reason: string;
  similar: SimilarDecisions;
  risk: ReviewExposureRecord["risk"];
  /** 0–100 confidence score behind the level (deterministic). */
  confidenceScore: number;
}

const FINANCIALLY_SENSITIVE = 4000;

/** Deterministic recommendation for a single review exposure record. */
export function computeReviewRecommendation(
  record: ReviewExposureRecord
): ReviewRecommendation {
  const similar = getSimilarDecisions(record.reviewType);
  const overdue = ageHoursOf(record) > record.slaHours;

  // 1. Determine the recommendation type from risk / governance / history.
  let type: RecommendationType;
  if (
    record.risk === "high" ||
    record.awaitingCeo ||
    record.financialImpact >= FINANCIALLY_SENSITIVE
  ) {
    type = "Requires Human Review";
  } else if (similar.approvalRate >= 85 && record.risk === "low") {
    type = "Likely Approve";
  } else if (similar.corrections >= similar.rejections && similar.approvalRate < 85) {
    type = "Likely Correction";
  } else if (similar.rejections > similar.corrections) {
    type = "Likely Reject";
  } else {
    type = "Likely Approve";
  }

  // 2. Confidence score: starts from historical approval-rate consistency,
  //    reduced by risk, financial materiality, governance hold and SLA breach.
  let score = similar.approvalRate; // 0–100
  if (record.risk === "high") score -= 30;
  else if (record.risk === "medium") score -= 12;
  if (record.financialImpact >= FINANCIALLY_SENSITIVE) score -= 20;
  if (record.awaitingCeo) score -= 10;
  if (overdue) score -= 8;
  if (record.financialClass === "revenue") score -= 6; // revenue → more scrutiny
  score = Math.max(0, Math.min(100, score));

  const confidence: ConfidenceLevel =
    score >= 90
      ? "Very High"
      : score >= 75
      ? "High"
      : score >= 55
      ? "Medium"
      : "Low";

  return {
    type,
    confidence,
    confidenceScore: score,
    reason: buildReason(type, record, similar),
    similar,
    risk: record.risk,
  };
}

function buildReason(
  type: RecommendationType,
  record: ReviewExposureRecord,
  similar: SimilarDecisions
): string {
  switch (type) {
    case "Likely Approve":
      return `Similar ${record.reviewType.toLowerCase()} submissions have been approved ${similar.approvalRate}% of the time.`;
    case "Likely Reject":
      return `${record.reviewType} reviews show a higher historical rejection pattern (${similar.rejections} of ${similar.total}).`;
    case "Likely Correction":
      return `${record.reviewType} reviews frequently need correction (${similar.corrections} of ${similar.total}) — often missing required evidence.`;
    case "Requires Human Review":
      if (record.risk === "high")
        return `High-risk job — manual judgement required despite a ${similar.approvalRate}% historical approval rate.`;
      if (record.awaitingCeo)
        return `Governance-sensitive (CEO-reserved) — manual review required.`;
      return `High financial impact — manual review required before approval.`;
  }
}

// ── Aggregate recommendation model ──────────────────────────────────────────

export interface RecommendationDistribution {
  type: RecommendationType;
  count: number;
  percent: number;
}

export interface RecommendedReview {
  record: ReviewExposureRecord;
  recommendation: ReviewRecommendation;
}

export interface ReviewRecommendationModel {
  recommendations: RecommendedReview[];
  distribution: RecommendationDistribution[];
  insights: string[];
  guidance: string[];
  highConfidenceCount: number;
}

const HIGH_CONFIDENCE: ConfidenceLevel[] = ["Very High", "High"];

export function computeRecommendationModel(
  records: ReviewExposureRecord[] = REVIEW_EXPOSURE_SEED
): ReviewRecommendationModel {
  const pending = records.filter((r) => r.status === "pending");
  const recommendations: RecommendedReview[] = pending.map((record) => ({
    record,
    recommendation: computeReviewRecommendation(record),
  }));

  const total = recommendations.length;
  const distribution: RecommendationDistribution[] = RECOMMENDATION_TYPES.map(
    (type) => {
      const count = recommendations.filter(
        (r) => r.recommendation.type === type
      ).length;
      return {
        type,
        count,
        percent: total > 0 ? Math.round((count / total) * 100) : 0,
      };
    }
  );

  const highConfidenceCount = recommendations.filter((r) =>
    HIGH_CONFIDENCE.includes(r.recommendation.confidence)
  ).length;

  return {
    recommendations,
    distribution,
    highConfidenceCount,
    insights: buildInsights(recommendations, distribution, highConfidenceCount, total),
    guidance: buildGuidance(recommendations),
  };
}

function buildInsights(
  recs: RecommendedReview[],
  distribution: RecommendationDistribution[],
  highConfidenceCount: number,
  total: number
): string[] {
  if (total === 0) return ["No pending reviews to assess."];
  const insights: string[] = [];

  insights.push(
    `${Math.round(
      (highConfidenceCount / total) * 100
    )}% of pending reviews have a high-confidence recommendation.`
  );

  const corrections =
    distribution.find((d) => d.type === "Likely Correction")?.count ?? 0;
  if (corrections > 0) {
    insights.push(
      `${corrections} review${
        corrections === 1 ? "" : "s"
      } likely require correction.`
    );
  }

  const revenue = recs.filter((r) => r.record.financialClass === "revenue");
  if (revenue.length > 0) {
    const avg =
      revenue.reduce((s, r) => s + r.recommendation.confidenceScore, 0) /
      revenue.length;
    const overall =
      recs.reduce((s, r) => s + r.recommendation.confidenceScore, 0) /
      recs.length;
    if (avg < overall) {
      insights.push(
        "Revenue-impact reviews have lower recommendation confidence."
      );
    }
  }

  const payroll = recs.filter((r) => r.record.financialClass === "payroll");
  if (
    payroll.length > 0 &&
    payroll.every((r) => HIGH_CONFIDENCE.includes(r.recommendation.confidence))
  ) {
    insights.push(
      "Payroll reviews are highly consistent with previous approvals."
    );
  }

  return insights;
}

function buildGuidance(recs: RecommendedReview[]): string[] {
  const guidance: string[] = [];
  const byType = (t: ReviewCategory) =>
    recs.filter((r) => r.record.reviewType === t);

  if (
    byType("Expenses").length > 0 &&
    byType("Expenses").every((r) =>
      HIGH_CONFIDENCE.includes(r.recommendation.confidence)
    )
  ) {
    guidance.push("Most expense reviews are highly predictable.");
  }
  if (byType("Timesheets").length > 0) {
    guidance.push("Payroll reviews remain consistent with prior approvals.");
  }
  if (recs.some((r) => r.record.financialClass === "revenue")) {
    guidance.push("Revenue-impact reviews require increased scrutiny.");
  }
  if (
    byType("QA Records").some(
      (r) => r.recommendation.type === "Likely Correction"
    )
  ) {
    guidance.push("Correction requests are concentrated in QA submissions.");
  }

  if (guidance.length === 0) {
    guidance.push("Review patterns are stable across all current submissions.");
  }
  return guidance;
}

// ── Per-job lookup (for review detail) ───────────────────────────────────────

/** Recommendations for a job's pending reviews; top (most material) first. */
export function getJobRecommendations(
  jobId: string,
  records: ReviewExposureRecord[] = REVIEW_EXPOSURE_SEED
): RecommendedReview[] {
  return records
    .filter((r) => r.jobId === jobId && r.status === "pending")
    .map((record) => ({ record, recommendation: computeReviewRecommendation(record) }))
    .sort((a, b) => b.record.financialImpact - a.record.financialImpact);
}

/** Recommendation for a single review id, if present in the seed. */
export function getRecommendationFor(
  reviewId: string,
  records: ReviewExposureRecord[] = REVIEW_EXPOSURE_SEED
): ReviewRecommendation | null {
  const record = records.find((r) => r.id === reviewId);
  return record ? computeReviewRecommendation(record) : null;
}
