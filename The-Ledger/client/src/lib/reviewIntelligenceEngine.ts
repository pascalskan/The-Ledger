/**
 * UX-7.1 — EXECUTIVE REVIEW INTELLIGENCE ENGINE
 *
 * A read-only derivation layer that turns the Review Centre's operational
 * backlog into executive decision intelligence, answering one question:
 *
 *   "What decisions require my attention right now?"
 *
 * Doctrine:
 *   - Read-only. This engine APPROVES NOTHING, REJECTS NOTHING, CORRECTS
 *     NOTHING and CREATES no financial records. It only projects exposure and
 *     priority from data that already exists.
 *   - The live approval-bearing queue (the store's reviewItems, surfaced in
 *     review.tsx / review-detail.tsx) remains the single source of truth for
 *     actual approvals and is never mutated here.
 *   - Financial figures are MOCK-DERIVED for the prototype, exactly as the
 *     UX-6 engines derive their executive views from local seed
 *     (cf. SEED_EXECUTION_HISTORY in automationAuditEngine). Nothing here
 *     becomes financially real — approval still happens in the Review Centre.
 *
 * Determinism: every model is derived in a single pass from a stable seed.
 * Ages are computed live (relative to now) so the dashboard stays truthful as
 * time passes; counts and money are fixed by the seed.
 */

// ── Canonical review taxonomy ───────────────────────────────────────────────

export type ReviewCategory =
  | "Timesheets"
  | "Expenses"
  | "Inventory Usage"
  | "Equipment Usage"
  | "Reports"
  | "Uploads"
  | "QA Records";

export const REVIEW_CATEGORIES: ReviewCategory[] = [
  "Timesheets",
  "Expenses",
  "Inventory Usage",
  "Equipment Usage",
  "Reports",
  "Uploads",
  "QA Records",
];

/** How a pending review affects the books once (and only if) it is approved. */
export type FinancialClass = "revenue" | "cost" | "payroll" | "neutral";

export type RiskLevel = "low" | "medium" | "high";

export type ReviewExposureStatus =
  | "pending"
  | "approved"
  | "rejected"
  | "corrected";

export interface ReviewExposureRecord {
  id: string;
  reviewType: ReviewCategory;
  jobId: string;
  jobCode: string;
  jobTitle: string;
  submittedBy: string;
  /** ISO timestamp of operational submission. */
  submittedAt: string;
  status: ReviewExposureStatus;
  /** Estimated financial value blocked behind approval, in GBP. */
  financialImpact: number;
  financialClass: FinancialClass;
  risk: RiskLevel;
  /** Target approval window, in hours, before the review breaches SLA. */
  slaHours: number;
  /** True when the decision is reserved for the CEO. */
  awaitingCeo: boolean;
  /** ISO timestamp the review was actioned (for completed-today metrics). */
  reviewedAt?: string;
}

// ── Time helpers ────────────────────────────────────────────────────────────

const HOUR = 3600_000;
const DAY = 24 * HOUR;

const hoursAgo = (h: number) => new Date(Date.now() - h * HOUR).toISOString();
const hoursFromStartOfToday = (h: number) => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return new Date(d.getTime() + h * HOUR).toISOString();
};

/**
 * Executive review backlog seed.
 *
 * Tied to the two demo jobs (DEMO-JOB-0201 / DEMO-JOB-0202) and spread across
 * the canonical review taxonomy so the executive view reflects a realistic
 * cross-section of operational work awaiting a decision. Pending records carry
 * a relative submittedAt; completed records carry a reviewedAt within today so
 * the "completed today" metrics are meaningful.
 */
export const REVIEW_EXPOSURE_SEED: ReviewExposureRecord[] = [
  // ── Pending: revenue-bearing ───────────────────────────────────────────
  {
    id: "rx-ts-1",
    reviewType: "Timesheets",
    jobId: "dj-kitchen-extract-1",
    jobCode: "DEMO-JOB-0201",
    jobTitle: "Kitchen extraction & ventilation install",
    submittedBy: "Sophie Taylor",
    submittedAt: hoursAgo(54),
    status: "pending",
    financialImpact: 1760,
    financialClass: "payroll",
    risk: "high",
    slaHours: 48,
    awaitingCeo: true,
  },
  {
    id: "rx-ts-2",
    reviewType: "Timesheets",
    jobId: "dj-showcase-maint-1",
    jobCode: "DEMO-JOB-0202",
    jobTitle: "Preventative maintenance visit",
    submittedBy: "Priya Patel",
    submittedAt: hoursAgo(9),
    status: "pending",
    financialImpact: 480,
    financialClass: "payroll",
    risk: "low",
    slaHours: 48,
    awaitingCeo: false,
  },
  {
    id: "rx-rep-1",
    reviewType: "Reports",
    jobId: "dj-kitchen-extract-1",
    jobCode: "DEMO-JOB-0201",
    jobTitle: "Kitchen extraction & ventilation install",
    submittedBy: "Sophie Taylor",
    submittedAt: hoursAgo(2),
    status: "pending",
    financialImpact: 6200,
    financialClass: "revenue",
    risk: "high",
    slaHours: 24,
    awaitingCeo: true,
  },
  {
    id: "rx-rep-2",
    reviewType: "Reports",
    jobId: "dj-showcase-maint-1",
    jobCode: "DEMO-JOB-0202",
    jobTitle: "Preventative maintenance visit",
    submittedBy: "Priya Patel",
    submittedAt: hoursAgo(20),
    status: "pending",
    financialImpact: 1450,
    financialClass: "revenue",
    risk: "medium",
    slaHours: 24,
    awaitingCeo: false,
  },
  {
    id: "rx-exp-1",
    reviewType: "Expenses",
    jobId: "dj-kitchen-extract-1",
    jobCode: "DEMO-JOB-0201",
    jobTitle: "Kitchen extraction & ventilation install",
    submittedBy: "Ben Hughes",
    submittedAt: hoursAgo(30),
    status: "pending",
    financialImpact: 845,
    financialClass: "cost",
    risk: "medium",
    slaHours: 36,
    awaitingCeo: false,
  },
  {
    id: "rx-inv-1",
    reviewType: "Inventory Usage",
    jobId: "dj-kitchen-extract-1",
    jobCode: "DEMO-JOB-0201",
    jobTitle: "Kitchen extraction & ventilation install",
    submittedBy: "Sophie Taylor",
    submittedAt: hoursAgo(40),
    status: "pending",
    financialImpact: 1385,
    financialClass: "cost",
    risk: "low",
    slaHours: 48,
    awaitingCeo: false,
  },
  {
    id: "rx-eq-1",
    reviewType: "Equipment Usage",
    jobId: "dj-kitchen-extract-1",
    jobCode: "DEMO-JOB-0201",
    jobTitle: "Kitchen extraction & ventilation install",
    submittedBy: "Ben Hughes",
    submittedAt: hoursAgo(62),
    status: "pending",
    financialImpact: 2380,
    financialClass: "cost",
    risk: "high",
    slaHours: 48,
    awaitingCeo: true,
  },
  {
    id: "rx-up-1",
    reviewType: "Uploads",
    jobId: "dj-kitchen-extract-1",
    jobCode: "DEMO-JOB-0201",
    jobTitle: "Kitchen extraction & ventilation install",
    submittedBy: "Sophie Taylor",
    submittedAt: hoursAgo(3),
    status: "pending",
    financialImpact: 0,
    financialClass: "neutral",
    risk: "low",
    slaHours: 72,
    awaitingCeo: false,
  },
  {
    id: "rx-qa-1",
    reviewType: "QA Records",
    jobId: "dj-showcase-maint-1",
    jobCode: "DEMO-JOB-0202",
    jobTitle: "Preventative maintenance visit",
    submittedBy: "Ben Hughes",
    submittedAt: hoursAgo(26),
    status: "pending",
    financialImpact: 0,
    financialClass: "neutral",
    risk: "medium",
    slaHours: 36,
    awaitingCeo: false,
  },
  {
    id: "rx-rep-3",
    reviewType: "Reports",
    jobId: "dj-kitchen-extract-1",
    jobCode: "DEMO-JOB-0201",
    jobTitle: "Kitchen extraction & ventilation install",
    submittedBy: "Amir Khan",
    submittedAt: hoursAgo(12),
    status: "pending",
    financialImpact: 3100,
    financialClass: "revenue",
    risk: "medium",
    slaHours: 24,
    awaitingCeo: true,
  },
  // ── Completed today (for workload / throughput metrics) ─────────────────
  {
    id: "rx-done-1",
    reviewType: "Timesheets",
    jobId: "dj-showcase-maint-1",
    jobCode: "DEMO-JOB-0202",
    jobTitle: "Preventative maintenance visit",
    submittedBy: "Priya Patel",
    submittedAt: hoursAgo(28),
    status: "approved",
    financialImpact: 520,
    financialClass: "payroll",
    risk: "low",
    slaHours: 48,
    awaitingCeo: false,
    reviewedAt: hoursFromStartOfToday(8),
  },
  {
    id: "rx-done-2",
    reviewType: "Expenses",
    jobId: "dj-kitchen-extract-1",
    jobCode: "DEMO-JOB-0201",
    jobTitle: "Kitchen extraction & ventilation install",
    submittedBy: "Ben Hughes",
    submittedAt: hoursAgo(33),
    status: "approved",
    financialImpact: 210,
    financialClass: "cost",
    risk: "low",
    slaHours: 36,
    awaitingCeo: false,
    reviewedAt: hoursFromStartOfToday(9),
  },
  {
    id: "rx-done-3",
    reviewType: "Reports",
    jobId: "dj-kitchen-extract-1",
    jobCode: "DEMO-JOB-0201",
    jobTitle: "Kitchen extraction & ventilation install",
    submittedBy: "Sophie Taylor",
    submittedAt: hoursAgo(50),
    status: "rejected",
    financialImpact: 900,
    financialClass: "revenue",
    risk: "medium",
    slaHours: 24,
    awaitingCeo: true,
    reviewedAt: hoursFromStartOfToday(10),
  },
  {
    id: "rx-done-4",
    reviewType: "Inventory Usage",
    jobId: "dj-kitchen-extract-1",
    jobCode: "DEMO-JOB-0201",
    jobTitle: "Kitchen extraction & ventilation install",
    submittedBy: "Sophie Taylor",
    submittedAt: hoursAgo(46),
    status: "corrected",
    financialImpact: 320,
    financialClass: "cost",
    risk: "low",
    slaHours: 48,
    awaitingCeo: false,
    reviewedAt: hoursFromStartOfToday(11),
  },
];

// ── Derived per-record helpers ──────────────────────────────────────────────

export interface DerivedReview extends ReviewExposureRecord {
  ageHours: number;
  ageLabel: string;
  overdue: boolean;
  approachingSla: boolean;
  /** Composite executive priority score (higher = more urgent). */
  priorityScore: number;
  priority: "Critical" | "High" | "Standard";
}

const RISK_WEIGHT: Record<RiskLevel, number> = { low: 0, medium: 25, high: 55 };

export function ageHoursOf(record: ReviewExposureRecord): number {
  return Math.max(0, (Date.now() - new Date(record.submittedAt).getTime()) / HOUR);
}

export function formatAge(hours: number): string {
  if (hours < 1) return "<1h";
  if (hours < 24) return `${Math.floor(hours)}h`;
  const days = Math.floor(hours / 24);
  const rem = Math.floor(hours % 24);
  return rem > 0 ? `${days}d ${rem}h` : `${days}d`;
}

function deriveReview(record: ReviewExposureRecord): DerivedReview {
  const ageHours = ageHoursOf(record);
  const overdue = record.status === "pending" && ageHours > record.slaHours;
  const approachingSla =
    record.status === "pending" &&
    !overdue &&
    ageHours >= record.slaHours * 0.75;

  // Composite priority: SLA pressure + risk + financial materiality + CEO hold.
  const slaPressure = Math.min(100, (ageHours / record.slaHours) * 60);
  const financialWeight = Math.min(40, record.financialImpact / 200);
  const ceoWeight = record.awaitingCeo ? 15 : 0;
  const priorityScore = Math.round(
    slaPressure + RISK_WEIGHT[record.risk] + financialWeight + ceoWeight
  );

  const priority: DerivedReview["priority"] =
    overdue || priorityScore >= 110
      ? "Critical"
      : priorityScore >= 70
      ? "High"
      : "Standard";

  return {
    ...record,
    ageHours,
    ageLabel: formatAge(ageHours),
    overdue,
    approachingSla,
    priorityScore,
    priority,
  };
}

// ── Aggregate executive model ───────────────────────────────────────────────

export interface ReviewKpis {
  totalPending: number;
  overdue: number;
  revenueAwaiting: number;
  costAwaiting: number;
  payrollAwaiting: number;
  highRisk: number;
  averageAgeHours: number;
  averageAgeLabel: string;
  completedToday: number;
}

export interface FinancialExposure {
  revenueBlocked: number;
  costAwaiting: number;
  payrollAwaiting: number;
  totalExposure: number;
  /** Revenue minus cost+payroll currently locked behind approvals. */
  profitabilityImpact: number;
}

export interface ReviewTypeBreakdown {
  type: ReviewCategory;
  count: number;
  percent: number;
}

export interface WorkloadSummary {
  receivedToday: number;
  approvedToday: number;
  rejectedToday: number;
  correctedToday: number;
  backlog: number;
  throughputTrend: "improving" | "steady" | "declining";
}

export interface ReviewExecutiveModel {
  kpis: ReviewKpis;
  exposure: FinancialExposure;
  attentionQueue: DerivedReview[];
  typeBreakdown: ReviewTypeBreakdown[];
  workload: WorkloadSummary;
  insights: string[];
  allPending: DerivedReview[];
}

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

export function formatGbp(value: number): string {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
    maximumFractionDigits: 0,
  }).format(value);
}

/**
 * Build the full executive review model from the seed (default) or any caller-
 * supplied exposure records. Pure: no side effects, no mutation.
 */
export function computeReviewExecutiveModel(
  records: ReviewExposureRecord[] = REVIEW_EXPOSURE_SEED
): ReviewExecutiveModel {
  const derived = records.map(deriveReview);
  const pending = derived.filter((r) => r.status === "pending");

  const sum = (rs: DerivedReview[], cls: FinancialClass) =>
    rs
      .filter((r) => r.financialClass === cls)
      .reduce((s, r) => s + r.financialImpact, 0);

  const revenueAwaiting = sum(pending, "revenue");
  const costAwaiting = sum(pending, "cost");
  const payrollAwaiting = sum(pending, "payroll");

  const avgAge =
    pending.length > 0
      ? pending.reduce((s, r) => s + r.ageHours, 0) / pending.length
      : 0;

  const completedTodayRecords = derived.filter(
    (r) => r.status !== "pending" && isToday(r.reviewedAt)
  );

  const kpis: ReviewKpis = {
    totalPending: pending.length,
    overdue: pending.filter((r) => r.overdue).length,
    revenueAwaiting,
    costAwaiting,
    payrollAwaiting,
    highRisk: pending.filter((r) => r.risk === "high").length,
    averageAgeHours: Math.round(avgAge),
    averageAgeLabel: formatAge(avgAge),
    completedToday: completedTodayRecords.length,
  };

  const exposure: FinancialExposure = {
    revenueBlocked: revenueAwaiting,
    costAwaiting,
    payrollAwaiting,
    totalExposure: revenueAwaiting + costAwaiting + payrollAwaiting,
    profitabilityImpact: revenueAwaiting - (costAwaiting + payrollAwaiting),
  };

  const typeBreakdown: ReviewTypeBreakdown[] = REVIEW_CATEGORIES.map((type) => {
    const count = pending.filter((r) => r.reviewType === type).length;
    return {
      type,
      count,
      percent:
        pending.length > 0 ? Math.round((count / pending.length) * 100) : 0,
    };
  });

  // Requires-attention queue: most urgent first (priority score, then age).
  const attentionQueue = [...pending]
    .sort(
      (a, b) =>
        b.priorityScore - a.priorityScore || b.ageHours - a.ageHours
    )
    .slice(0, 8);

  const approvedToday = completedTodayRecords.filter(
    (r) => r.status === "approved"
  ).length;
  const rejectedToday = completedTodayRecords.filter(
    (r) => r.status === "rejected"
  ).length;
  const correctedToday = completedTodayRecords.filter(
    (r) => r.status === "corrected"
  ).length;
  const receivedToday = derived.filter((r) => isToday(r.submittedAt)).length;
  const cleared = approvedToday + rejectedToday + correctedToday;

  const workload: WorkloadSummary = {
    receivedToday,
    approvedToday,
    rejectedToday,
    correctedToday,
    backlog: pending.length,
    throughputTrend:
      cleared > pending.length
        ? "improving"
        : cleared >= Math.ceil(pending.length / 2)
        ? "steady"
        : "declining",
  };

  return {
    kpis,
    exposure,
    attentionQueue,
    typeBreakdown,
    workload,
    insights: buildInsights(kpis, exposure, typeBreakdown, pending, workload),
    allPending: pending,
  };
}

// ── Executive insights ──────────────────────────────────────────────────────

function buildInsights(
  kpis: ReviewKpis,
  exposure: FinancialExposure,
  typeBreakdown: ReviewTypeBreakdown[],
  pending: DerivedReview[],
  workload: WorkloadSummary
): string[] {
  const insights: string[] = [];

  if (exposure.revenueBlocked > 0) {
    insights.push(
      `Revenue approvals currently represent ${formatGbp(
        exposure.revenueBlocked
      )} in pending billable work.`
    );
  }

  const payrollShare =
    kpis.totalPending > 0
      ? Math.round(
          (pending.filter((r) => r.financialClass === "payroll").length /
            kpis.totalPending) *
            100
        )
      : 0;
  if (payrollShare > 0) {
    insights.push(
      `Payroll approvals account for ${payrollShare}% of the current backlog.`
    );
  }

  if (kpis.overdue > 0) {
    insights.push(
      `${kpis.overdue} review${
        kpis.overdue === 1 ? " is" : "s are"
      } older than the target approval window.`
    );
  }

  if (kpis.highRisk > 0) {
    insights.push(
      `${kpis.highRisk} high-risk review${
        kpis.highRisk === 1 ? "" : "s"
      } require executive attention.`
    );
  }

  const topType = [...typeBreakdown]
    .filter((t) => t.count > 0)
    .sort((a, b) => b.count - a.count)[0];
  if (topType) {
    insights.push(
      `${topType.type} make up the largest share of pending reviews (${topType.percent}%).`
    );
  }

  insights.push(
    workload.throughputTrend === "improving"
      ? "Review throughput is outpacing incoming work today."
      : workload.throughputTrend === "steady"
      ? "Review throughput remains healthy."
      : "Incoming reviews are outpacing decisions today — backlog is growing."
  );

  return insights;
}

/** Lookup the executive context for a single job (used by review detail). */
export function getJobReviewContext(jobId: string): {
  pending: DerivedReview[];
  history: DerivedReview[];
  exposure: number;
} {
  const derived = REVIEW_EXPOSURE_SEED.filter((r) => r.jobId === jobId).map(
    deriveReview
  );
  const pending = derived.filter((r) => r.status === "pending");
  return {
    pending,
    history: derived.filter((r) => r.status !== "pending"),
    exposure: pending.reduce((s, r) => s + r.financialImpact, 0),
  };
}
