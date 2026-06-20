/**
 * UX-7.7 — EXECUTIVE REVIEW BRIEFING ENGINE
 *
 * The executive roll-up layer for the Review Centre, answering:
 *   "What decisions require my attention today?"
 *
 * This is the Review Centre equivalent of the Automation Hub CEO Briefing. It
 * CONSOLIDATES the intelligence already produced by UX-7.1–7.6 — it computes no
 * new truth of its own beyond aggregation/interpretation.
 *
 * Doctrine:
 *   - The briefing consolidates; it never decides, approves, rejects, corrects
 *     or modifies workflows. Pure, deterministic, read-only.
 */

import {
  computeReviewExecutiveModel,
  formatGbp,
  formatAge,
} from "@/lib/reviewIntelligenceEngine";
import {
  computePriorityQueue,
  computePriorityDistribution,
  type PrioritisedReview,
} from "@/lib/reviewPriorityEngine";
import {
  computeReviewRecommendation,
  computeRecommendationModel,
  type RecommendationType,
} from "@/lib/reviewRecommendationEngine";
import {
  computeBatchDecisionImpact,
} from "@/lib/reviewDecisionIntelligenceEngine";
import {
  computeReviewAnalyticsModel,
} from "@/lib/reviewAnalyticsEngine";
import { REVIEW_EXPOSURE_SEED } from "@/lib/reviewIntelligenceEngine";

export type ReadinessLevel = "Healthy" | "Watch" | "Attention Required";

export interface ReadinessIndicator {
  area:
    | "Approval Readiness"
    | "Financial Readiness"
    | "Operational Readiness"
    | "Review Operations Readiness";
  level: ReadinessLevel;
  detail: string;
}

export interface AttentionItem {
  id: string;
  priority: PrioritisedReview["priority"]["category"];
  category: string; // review type
  financialImpact: number;
  ageLabel: string;
  recommendation: RecommendationType;
  recommendedAttention: string;
}

export interface ApprovalHealth {
  pending: number;
  critical: number;
  exceedingSla: number;
  avgApprovalLabel: string;
}

export interface FinancialExposureSummary {
  revenue: number;
  costs: number;
  payroll: number;
  total: number;
}

export interface OperationalHealthSummary {
  backlog: number;
  throughput: number; // weekly
  velocity: number; // avg daily
  healthScore: number;
}

export interface ExposureInterpretation {
  revenueAwaiting: number;
  revenueDelayed: number;
  invoiceReadinessBlocked: number;
  costsAwaiting: number;
  marginImpact: number;
  payrollAwaiting: number;
  payrollReleaseReady: number;
  interpretation: string;
}

export interface BottleneckSummary {
  largestBacklog: string;
  slowestCategory: string;
  reviewerBottleneck: string;
  reviewTypeBottleneck: string;
  approvalBottleneck: string;
}

export interface RecommendationRollup {
  highConfidenceApprovals: number;
  highConfidenceCorrections: number;
  requiresManualReview: number;
  distribution: { type: RecommendationType; count: number; percent: number }[];
}

export interface DecisionRollup {
  revenue: number;
  cost: number;
  payroll: number;
  profitabilityImpact: number;
  summary: string;
}

export interface WeeklySummary {
  processed: number;
  approved: number;
  rejected: number;
  corrected: number;
  financialValueProcessed: number;
  throughputChangePercent: number;
  slaPerformance: number;
}

export interface ReviewBriefingModel {
  approvalHealth: ApprovalHealth;
  financialExposure: FinancialExposureSummary;
  operationalHealth: OperationalHealthSummary;
  dailyBriefing: string[];
  attentionFeed: AttentionItem[];
  exposure: ExposureInterpretation;
  bottlenecks: BottleneckSummary;
  recommendationRollup: RecommendationRollup;
  decisionRollup: DecisionRollup;
  weeklySummary: WeeklySummary;
  strategicInsights: string[];
  readiness: ReadinessIndicator[];
}

const HIGH_CONFIDENCE = ["Very High", "High"];

function recommendedAttention(rec: RecommendationType): string {
  switch (rec) {
    case "Requires Human Review":
      return "Manual judgement required";
    case "Likely Correction":
      return "Likely needs correction";
    case "Likely Reject":
      return "Review for rejection";
    case "Likely Approve":
      return "Fast-track candidate";
  }
}

export function computeReviewBriefing(): ReviewBriefingModel {
  const exec = computeReviewExecutiveModel();
  const queue = computePriorityQueue();
  const recModel = computeRecommendationModel();
  const analytics = computeReviewAnalyticsModel();
  const decision = computeBatchDecisionImpact(
    REVIEW_EXPOSURE_SEED.filter((r) => r.status === "pending")
  );

  // 1. Approval health.
  const approvalHealth: ApprovalHealth = {
    pending: exec.kpis.totalPending,
    critical: queue.filter((r) => r.priority.category === "Critical").length,
    exceedingSla: exec.kpis.overdue,
    avgApprovalLabel: exec.kpis.averageAgeLabel,
  };

  // 2. Financial exposure.
  const financialExposure: FinancialExposureSummary = {
    revenue: exec.exposure.revenueBlocked,
    costs: exec.exposure.costAwaiting,
    payroll: exec.exposure.payrollAwaiting,
    total: exec.exposure.totalExposure,
  };

  // 3. Operational health.
  const operationalHealth: OperationalHealthSummary = {
    backlog: analytics.volume.pending,
    throughput: analytics.throughput.averageWeekly,
    velocity: analytics.throughput.averageDaily,
    healthScore: analytics.health.score,
  };

  // 4. Daily briefing lines.
  const dailyBriefing = buildDailyBriefing(
    approvalHealth,
    financialExposure,
    analytics
  );

  // 5. Attention feed (top priority items, enriched with recommendation).
  const attentionFeed: AttentionItem[] = queue.slice(0, 8).map((r) => {
    const rec = computeReviewRecommendation(r);
    return {
      id: r.id,
      priority: r.priority.category,
      category: r.reviewType,
      financialImpact: r.financialImpact,
      ageLabel: r.ageLabel,
      recommendation: rec.type,
      recommendedAttention: recommendedAttention(rec.type),
    };
  });

  // 6. Exposure interpretation.
  const fin = analytics.financialThroughput;
  const exposure: ExposureInterpretation = {
    revenueAwaiting: fin.revenueAwaiting,
    revenueDelayed: fin.revenueDelayed,
    invoiceReadinessBlocked: queue.filter(
      (r) => r.financialClass === "revenue"
    ).length,
    costsAwaiting: fin.costsAwaiting,
    marginImpact: fin.revenueAwaiting - fin.costsAwaiting - fin.payrollAwaiting,
    payrollAwaiting: fin.payrollAwaiting,
    payrollReleaseReady: queue.filter((r) => r.financialClass === "payroll").length,
    interpretation: buildExposureInterpretation(financialExposure),
  };

  // 7. Bottleneck summary.
  const b = analytics.bottlenecks;
  const slowestType = [...analytics.typeAnalytics]
    .filter((t) => t.volume > 0)
    .sort((a, c) => c.avgReviewHours - a.avgReviewHours)[0];
  const busiestReviewer = [...analytics.reviewers].sort(
    (a, c) => c.currentQueueSize - a.currentQueueSize
  )[0];
  const bottlenecks: BottleneckSummary = {
    largestBacklog: b.largestBacklog[0]
      ? `${b.largestBacklog[0].type} (${b.largestBacklog[0].count})`
      : "None",
    slowestCategory: slowestType
      ? `${slowestType.type} (${formatAge(slowestType.avgReviewHours)} avg)`
      : "None",
    reviewerBottleneck: busiestReviewer
      ? `${busiestReviewer.reviewer} (${busiestReviewer.currentQueueSize} in queue)`
      : "None",
    reviewTypeBottleneck: b.largestBacklog[0]?.type ?? "None",
    approvalBottleneck:
      b.exceedingSla.length > 0
        ? `${b.exceedingSla.length} review(s) over SLA`
        : "Within SLA",
  };

  // 8. Recommendation roll-up.
  const recommendationRollup: RecommendationRollup = {
    highConfidenceApprovals: recModel.recommendations.filter(
      (r) =>
        r.recommendation.type === "Likely Approve" &&
        HIGH_CONFIDENCE.includes(r.recommendation.confidence)
    ).length,
    highConfidenceCorrections: recModel.recommendations.filter(
      (r) =>
        r.recommendation.type === "Likely Correction" &&
        HIGH_CONFIDENCE.includes(r.recommendation.confidence)
    ).length,
    requiresManualReview: recModel.recommendations.filter(
      (r) => r.recommendation.type === "Requires Human Review"
    ).length,
    distribution: recModel.distribution,
  };

  // 9. Decision roll-up.
  const decisionRollup: DecisionRollup = {
    revenue: decision.totalRevenue,
    cost: decision.totalCost,
    payroll: decision.totalPayroll,
    profitabilityImpact: decision.profitabilityImpact,
    summary: `Approving the pending backlog recognises ${formatGbp(
      decision.totalRevenue
    )} revenue against ${formatGbp(
      decision.totalCost + decision.totalPayroll
    )} cost & payroll (net ${formatGbp(decision.profitabilityImpact)}).`,
  };

  // 10. Weekly summary.
  const throughputTrend = analytics.trends.find((t) => t.label === "Throughput");
  const weeklySummary: WeeklySummary = {
    processed: analytics.throughput.processedThisWeek,
    approved: analytics.volume.approved,
    rejected: analytics.volume.rejected,
    corrected: analytics.volume.corrected,
    financialValueProcessed:
      fin.revenueApproved + fin.costsApproved + fin.payrollReleased,
    throughputChangePercent: throughputTrend?.changePercent ?? 0,
    slaPerformance: analytics.performance.slaCompliancePercent,
  };

  return {
    approvalHealth,
    financialExposure,
    operationalHealth,
    dailyBriefing,
    attentionFeed,
    exposure,
    bottlenecks,
    recommendationRollup,
    decisionRollup,
    weeklySummary,
    strategicInsights: buildStrategicInsights(
      financialExposure,
      analytics,
      queue
    ),
    readiness: buildReadiness(approvalHealth, financialExposure, analytics),
  };
}

// ── Builders ────────────────────────────────────────────────────────────────

function buildDailyBriefing(
  approval: ApprovalHealth,
  exposure: FinancialExposureSummary,
  analytics: ReturnType<typeof computeReviewAnalyticsModel>
): string[] {
  const lines: string[] = [];
  lines.push(`${approval.pending} reviews pending approval.`);
  lines.push(`${formatGbp(exposure.total)} currently awaiting review.`);
  if (approval.exceedingSla > 0)
    lines.push(
      `${approval.exceedingSla} review${
        approval.exceedingSla === 1 ? "" : "s"
      } exceed SLA.`
    );
  if (exposure.payroll > 0)
    lines.push(
      exposure.payroll >= exposure.revenue
        ? "Payroll exposure remains elevated."
        : "Payroll exposure is within normal range."
    );
  lines.push(
    analytics.health.score >= 85
      ? "Approval throughput remains healthy."
      : analytics.health.score >= 70
      ? "Approval throughput is stable."
      : "Approval throughput needs attention."
  );
  return lines;
}

function buildExposureInterpretation(
  exposure: FinancialExposureSummary
): string {
  if (exposure.total === 0) return "No financial exposure currently awaiting review.";
  const dominant =
    exposure.revenue >= exposure.costs && exposure.revenue >= exposure.payroll
      ? "revenue"
      : exposure.payroll >= exposure.costs
      ? "payroll"
      : "cost";
  const share =
    exposure.total > 0
      ? Math.round(
          ((dominant === "revenue"
            ? exposure.revenue
            : dominant === "payroll"
            ? exposure.payroll
            : exposure.costs) /
            exposure.total) *
            100
        )
      : 0;
  return `${formatGbp(
    exposure.total
  )} awaiting review, led by ${dominant} (${share}%).`;
}

function buildStrategicInsights(
  exposure: FinancialExposureSummary,
  analytics: ReturnType<typeof computeReviewAnalyticsModel>,
  queue: PrioritisedReview[]
): string[] {
  const insights: string[] = [];

  if (exposure.total > 0 && exposure.payroll > 0) {
    insights.push(
      `Payroll approvals represent ${Math.round(
        (exposure.payroll / exposure.total) * 100
      )}% of current exposure.`
    );
  }

  const backlogTrend = analytics.trends.find((t) => t.label === "Backlog");
  if (backlogTrend) {
    insights.push(
      backlogTrend.direction === "up"
        ? "Review backlog has increased compared to last week."
        : backlogTrend.direction === "down"
        ? "Review backlog has decreased compared to last week."
        : "Review backlog is steady week-on-week."
    );
  }

  insights.push(
    analytics.performance.slaCompliancePercent >= 80
      ? "Approval throughput remains above target."
      : "Approval throughput is below target."
  );

  const highValueJobs = new Set(
    queue.filter((r) => r.financialImpact >= 3000).map((r) => r.jobCode)
  ).size;
  if (highValueJobs > 0) {
    insights.push(
      `${highValueJobs} high-value job${
        highValueJobs === 1 ? " is" : "s are"
      } awaiting review completion.`
    );
  }

  return insights;
}

function levelFrom(
  score: number,
  watch: number,
  attention: number
): ReadinessLevel {
  // Higher score = healthier.
  if (score <= attention) return "Attention Required";
  if (score <= watch) return "Watch";
  return "Healthy";
}

function buildReadiness(
  approval: ApprovalHealth,
  exposure: FinancialExposureSummary,
  analytics: ReturnType<typeof computeReviewAnalyticsModel>
): ReadinessIndicator[] {
  // Approval readiness: driven by critical + SLA breaches.
  const approvalScore = 100 - approval.critical * 12 - approval.exceedingSla * 15;
  // Financial readiness: driven by total exposure size + delayed revenue.
  const financialScore =
    100 -
    Math.min(50, exposure.total / 2000) -
    (analytics.financialThroughput.revenueDelayed > 0 ? 15 : 0);
  // Operational readiness: backlog vs throughput.
  const operationalScore =
    analytics.throughput.averageDaily > 0 &&
    analytics.volume.pending > analytics.throughput.averageDaily * 3
      ? 60
      : 88;
  // Review operations readiness: the analytics health score.
  const opsScore = analytics.health.score;

  return [
    {
      area: "Approval Readiness",
      level: levelFrom(approvalScore, 80, 60),
      detail: `${approval.critical} critical · ${approval.exceedingSla} over SLA`,
    },
    {
      area: "Financial Readiness",
      level: levelFrom(financialScore, 80, 60),
      detail: `${formatGbp(exposure.total)} exposure awaiting review`,
    },
    {
      area: "Operational Readiness",
      level: levelFrom(operationalScore, 80, 65),
      detail: `${analytics.volume.pending} backlog · ~${analytics.throughput.averageDaily}/day`,
    },
    {
      area: "Review Operations Readiness",
      level: levelFrom(opsScore, 85, 70),
      detail: `Operations health ${opsScore}/100 (${analytics.health.status})`,
    },
  ];
}

export { formatGbp, formatAge };
