/**
 * UX-7.4 — REVIEW DECISION INTELLIGENCE ENGINE
 *
 * Makes the consequence of a decision visible BEFORE it is made, answering:
 *   "What happens if I approve this?"
 *
 * Core principle (doctrine):
 *   - The platform SURFACES impact. It never makes the decision.
 *   - Nothing here approves, rejects, corrects or mutates anything. Every value
 *     is a read-only, deterministic projection of existing review data.
 *
 * Built on UX-7.1's reviewIntelligenceEngine (ReviewExposureRecord +
 * REVIEW_EXPOSURE_SEED). Pure and reproducible: identical inputs → identical
 * outputs (ages are derived live only to flag delay, never to change money).
 */

import {
  REVIEW_EXPOSURE_SEED,
  ageHoursOf,
  formatGbp,
  type ReviewExposureRecord,
} from "@/lib/reviewIntelligenceEngine";

// ── Per-review financial impact breakdown ───────────────────────────────────

export interface RevenueImpact {
  generated: number; // realised on approval
  delayed: number; // at risk of slipping (overdue)
  blocked: number; // currently held behind approval
}

export interface CostImpact {
  expense: number;
  material: number;
  equipment: number;
}

export interface PayrollImpact {
  labour: number;
  payroll: number;
  timesheet: number;
}

export interface FinancialImpactBreakdown {
  revenue: RevenueImpact;
  cost: CostImpact;
  payroll: PayrollImpact;
  /** Net effect on profit if approved (revenue − cost − payroll). */
  net: number;
}

const emptyBreakdown = (): FinancialImpactBreakdown => ({
  revenue: { generated: 0, delayed: 0, blocked: 0 },
  cost: { expense: 0, material: 0, equipment: 0 },
  payroll: { labour: 0, payroll: 0, timesheet: 0 },
  net: 0,
});

function isOverdue(record: ReviewExposureRecord): boolean {
  return record.status === "pending" && ageHoursOf(record) > record.slaHours;
}

/** Deterministic financial impact breakdown for one review exposure record. */
export function computeReviewImpact(
  record: ReviewExposureRecord
): FinancialImpactBreakdown {
  const b = emptyBreakdown();
  const amt = record.financialImpact;
  const overdue = isOverdue(record);

  if (record.financialClass === "revenue") {
    b.revenue.generated = amt;
    b.revenue.blocked = amt;
    b.revenue.delayed = overdue ? amt : 0;
    b.net = amt;
  } else if (record.financialClass === "cost") {
    if (record.reviewType === "Expenses") b.cost.expense = amt;
    else if (record.reviewType === "Inventory Usage") b.cost.material = amt;
    else if (record.reviewType === "Equipment Usage") b.cost.equipment = amt;
    else b.cost.expense = amt;
    b.net = -amt;
  } else if (record.financialClass === "payroll") {
    b.payroll.labour = amt;
    b.payroll.payroll = amt;
    b.payroll.timesheet = record.reviewType === "Timesheets" ? amt : 0;
    b.net = -amt;
  }

  return b;
}

/** Sum many breakdowns into one aggregate. */
export function aggregateBreakdowns(
  breakdowns: FinancialImpactBreakdown[]
): FinancialImpactBreakdown {
  return breakdowns.reduce((acc, b) => {
    acc.revenue.generated += b.revenue.generated;
    acc.revenue.delayed += b.revenue.delayed;
    acc.revenue.blocked += b.revenue.blocked;
    acc.cost.expense += b.cost.expense;
    acc.cost.material += b.cost.material;
    acc.cost.equipment += b.cost.equipment;
    acc.payroll.labour += b.payroll.labour;
    acc.payroll.payroll += b.payroll.payroll;
    acc.payroll.timesheet += b.payroll.timesheet;
    acc.net += b.net;
    return acc;
  }, emptyBreakdown());
}

export function totalRevenue(b: FinancialImpactBreakdown): number {
  return b.revenue.generated;
}
export function totalCost(b: FinancialImpactBreakdown): number {
  return b.cost.expense + b.cost.material + b.cost.equipment;
}
export function totalPayroll(b: FinancialImpactBreakdown): number {
  return b.payroll.labour;
}

// ── Job impact summary ──────────────────────────────────────────────────────

export interface JobImpactSummary {
  jobId: string;
  jobCode: string;
  jobTitle: string;
  profitability: number; // net if all pending approved
  marginPercent: number;
  exposure: number; // total blocked behind approval
  revenueRecognition: number;
  costRecognition: number;
  pendingCount: number;
}

export function computeJobImpact(
  jobId: string,
  records: ReviewExposureRecord[] = REVIEW_EXPOSURE_SEED
): JobImpactSummary {
  const jobPending = records.filter(
    (r) => r.jobId === jobId && r.status === "pending"
  );
  const breakdown = aggregateBreakdowns(jobPending.map(computeReviewImpact));
  const revenue = totalRevenue(breakdown);
  const cost = totalCost(breakdown);
  const payroll = totalPayroll(breakdown);
  const profitability = revenue - cost - payroll;
  const first = jobPending[0];

  return {
    jobId,
    jobCode: first?.jobCode ?? jobId,
    jobTitle: first?.jobTitle ?? "",
    profitability,
    marginPercent: revenue > 0 ? Math.round((profitability / revenue) * 100) : 0,
    exposure: breakdown.revenue.blocked + cost + payroll,
    revenueRecognition: revenue,
    costRecognition: cost + payroll,
    pendingCount: jobPending.length,
  };
}

// ── Client impact summary ───────────────────────────────────────────────────

export interface ClientImpactSummary {
  billingImpact: number; // revenue that becomes billable on approval
  invoiceReadinessBlocked: number; // # revenue reviews gating invoicing
  revenueTimingAtRisk: number; // overdue revenue (timing slipping)
}

export function computeClientImpact(
  jobId: string,
  records: ReviewExposureRecord[] = REVIEW_EXPOSURE_SEED
): ClientImpactSummary {
  const jobPending = records.filter(
    (r) => r.jobId === jobId && r.status === "pending"
  );
  const revenueReviews = jobPending.filter((r) => r.financialClass === "revenue");
  return {
    billingImpact: revenueReviews.reduce((s, r) => s + r.financialImpact, 0),
    invoiceReadinessBlocked: revenueReviews.length,
    revenueTimingAtRisk: revenueReviews
      .filter(isOverdue)
      .reduce((s, r) => s + r.financialImpact, 0),
  };
}

// ── Approval preview (if approved / rejected / corrected) ────────────────────

export interface DecisionOutcome {
  decision: "Approve" | "Reject" | "Correct";
  headline: string;
  consequences: string[];
}

export function computeApprovalPreview(
  jobId: string,
  records: ReviewExposureRecord[] = REVIEW_EXPOSURE_SEED
): DecisionOutcome[] {
  const job = computeJobImpact(jobId, records);
  const client = computeClientImpact(jobId, records);
  const jobPending = records.filter(
    (r) => r.jobId === jobId && r.status === "pending"
  );
  const avgSla =
    jobPending.length > 0
      ? Math.round(
          jobPending.reduce((s, r) => s + r.slaHours, 0) / jobPending.length
        )
      : 24;

  return [
    {
      decision: "Approve",
      headline: `Releases ${formatGbp(job.revenueRecognition)} of revenue`,
      consequences: [
        `Financial: recognises ${formatGbp(
          job.revenueRecognition
        )} revenue and ${formatGbp(job.costRecognition)} cost/payroll.`,
        `Job: profitability effect ${formatGbp(job.profitability)} (${job.marginPercent}% margin).`,
        `Client: ${formatGbp(
          client.billingImpact
        )} becomes billable across ${client.invoiceReadinessBlocked} invoice-gating review(s).`,
      ],
    },
    {
      decision: "Reject",
      headline: `Holds ${formatGbp(job.exposure)} and returns work`,
      consequences: [
        `Workflow: ${jobPending.length} review(s) return to the worker.`,
        `Delay: ${formatGbp(job.revenueRecognition)} revenue stays blocked.`,
        `Rework: resubmission required before any financial recognition.`,
      ],
    },
    {
      decision: "Correct",
      headline: `Adds a review cycle (~${avgSla}h delay)`,
      consequences: [
        `Review cycle: +1 correction round before approval.`,
        `Approval delay estimate: ~${avgSla}h to resubmission and re-review.`,
        `Exposure: ${formatGbp(job.exposure)} remains pending during correction.`,
      ],
    },
  ];
}

// ── Batch decision intelligence ─────────────────────────────────────────────

export interface BatchDecisionImpact {
  totalRevenue: number;
  totalPayroll: number;
  totalCost: number;
  profitabilityImpact: number;
}

/** Aggregate decision impact for an arbitrary set of exposure records. */
export function computeBatchDecisionImpact(
  records: ReviewExposureRecord[]
): BatchDecisionImpact {
  const b = aggregateBreakdowns(records.map(computeReviewImpact));
  const revenue = totalRevenue(b);
  const cost = totalCost(b);
  const payroll = totalPayroll(b);
  return {
    totalRevenue: revenue,
    totalPayroll: payroll,
    totalCost: cost,
    profitabilityImpact: revenue - cost - payroll,
  };
}

// ── Executive impact insights ───────────────────────────────────────────────

export function computeExecutiveImpactInsights(
  records: ReviewExposureRecord[] = REVIEW_EXPOSURE_SEED
): string[] {
  const pending = records.filter((r) => r.status === "pending");
  if (pending.length === 0) return ["No pending reviews to assess."];

  const insights: string[] = [];
  const agg = aggregateBreakdowns(pending.map(computeReviewImpact));
  const revenue = totalRevenue(agg);
  const cost = totalCost(agg);
  const payroll = totalPayroll(agg);
  const totalFinancial = revenue + cost + payroll;

  if (revenue > 0) {
    insights.push(
      `Approving these reviews releases ${formatGbp(revenue)} of billable revenue.`
    );
  }

  if (payroll > 0 && totalFinancial > 0) {
    insights.push(
      `Payroll exposure represents ${Math.round(
        (payroll / totalFinancial) * 100
      )}% of pending financial impact.`
    );
  }

  // High-margin jobs awaiting approval.
  const jobIds = Array.from(new Set(pending.map((r) => r.jobId)));
  const highMarginJobs = jobIds.filter(
    (id) => computeJobImpact(id, records).marginPercent >= 40
  ).length;
  if (highMarginJobs > 0) {
    insights.push(
      `${highMarginJobs} high-margin job${
        highMarginJobs === 1 ? " is" : "s are"
      } awaiting review approval.`
    );
  }

  const overdueRevenue = pending
    .filter((r) => r.financialClass === "revenue" && isOverdue(r))
    .reduce((s, r) => s + r.financialImpact, 0);
  if (overdueRevenue > 0) {
    insights.push(
      `Current review backlog is delaying ${formatGbp(
        overdueRevenue
      )} of invoice readiness.`
    );
  }

  return insights;
}

// ── Convenience bundle for the per-job decision panel ───────────────────────

export interface JobDecisionIntelligence {
  breakdown: FinancialImpactBreakdown;
  job: JobImpactSummary;
  client: ClientImpactSummary;
  preview: DecisionOutcome[];
  insights: string[];
  pendingCount: number;
}

export function getJobDecisionIntelligence(
  jobId: string,
  records: ReviewExposureRecord[] = REVIEW_EXPOSURE_SEED
): JobDecisionIntelligence | null {
  const jobPending = records.filter(
    (r) => r.jobId === jobId && r.status === "pending"
  );
  if (jobPending.length === 0) return null;

  return {
    breakdown: aggregateBreakdowns(jobPending.map(computeReviewImpact)),
    job: computeJobImpact(jobId, records),
    client: computeClientImpact(jobId, records),
    preview: computeApprovalPreview(jobId, records),
    insights: computeExecutiveImpactInsights(jobPending),
    pendingCount: jobPending.length,
  };
}

export { formatGbp };
