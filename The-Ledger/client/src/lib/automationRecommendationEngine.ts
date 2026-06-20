// ======================================================
// UX-6.8 — AUTOMATION RECOMMENDATIONS ENGINE
//
// Advisory-only intelligence layer. Generates automation OPPORTUNITY
// recommendations from existing platform themes so the CEO can answer
// "what should I automate next?" and "where is automation underutilised?"
//
// Doctrine:
//   ADVISORY ONLY. This engine NEVER:
//     - creates or modifies automations
//     - creates schedules or governance actions
//     - changes approvals or creates financial mutations
//   It only describes opportunities. The CEO remains the decision maker and
//   any automation is still built through the existing Automation Builder
//   with all its safeguards intact.
//
// Architecture: Mock only. Pure functions + seed data, consistent with the
// other automation engines.
// ======================================================

import type { AutomationRiskLevel } from "./automationGovernanceEngine";

// ──────────────────────────────────────────────────────
// TYPES
// ──────────────────────────────────────────────────────

export type RecommendationCategory = "Operational" | "Financial" | "Governance";
export type RecommendationImpact = "Low" | "Medium" | "High";
export type RecommendationComplexity = "Low" | "Medium" | "High";

export const RECOMMENDATION_CATEGORY_COLORS: Record<RecommendationCategory, string> = {
  Operational: "text-blue-600 border-blue-200 bg-blue-50",
  Financial: "text-red-600 border-red-200 bg-red-50",
  Governance: "text-amber-700 border-amber-200 bg-amber-50",
};

export const IMPACT_COLORS: Record<RecommendationImpact, string> = {
  Low: "text-slate-600 border-slate-200 bg-slate-50",
  Medium: "text-blue-600 border-blue-200 bg-blue-50",
  High: "text-emerald-700 border-emerald-200 bg-emerald-50",
};

export const COMPLEXITY_COLORS: Record<RecommendationComplexity, string> = {
  Low: "text-emerald-700 border-emerald-200 bg-emerald-50",
  Medium: "text-amber-700 border-amber-200 bg-amber-50",
  High: "text-red-600 border-red-200 bg-red-50",
};

export interface AutomationRecommendation {
  id: string;
  title: string;
  description: string;
  category: RecommendationCategory;
  /** Sub-area for executive context (Review, Jobs, Workforce, Asset, Sync, Payroll, Compliance). */
  area: string;
  impact: RecommendationImpact;
  complexity: RecommendationComplexity;
  riskLevel: AutomationRiskLevel;
  estimatedHoursSavedPerWeek: number;
  estimatedReviewReductionPerWeek: number;
  isFinanciallySensitive: boolean;
  recommendedTrigger: string;
  recommendedActions: string[];
  // Detail view
  businessProblem: string;
  suggestedConditions: string[];
  governanceConsiderations: string;
  financialSafeguards: string;
}

// ──────────────────────────────────────────────────────
// SEED RECOMMENDATIONS
//
// Curated, high-value opportunities derived from recurring platform themes
// (review ageing, invoice ageing, failed syncs, payroll prep, governance
// review, high-risk monitoring, asset service, delayed jobs).
// ──────────────────────────────────────────────────────

const SEED_RECOMMENDATIONS: AutomationRecommendation[] = [
  {
    id: "REC-001",
    title: "Daily Review Escalation Reminders",
    description: "Automatically escalate review submissions that have been waiting more than 24 hours so nothing stalls in the Review Centre.",
    category: "Operational",
    area: "Review",
    impact: "High",
    complexity: "Low",
    riskLevel: "Low",
    estimatedHoursSavedPerWeek: 6,
    estimatedReviewReductionPerWeek: 12,
    isFinanciallySensitive: false,
    recommendedTrigger: "Daily schedule — review ageing check",
    recommendedActions: ["Notify CEO of ageing reviews", "Flag ageing items in the Review Centre"],
    businessProblem: "Around 12 reviews each week require manual chasing because nothing flags when they age past 24 hours.",
    suggestedConditions: ["Review status = pending", "Age > 24 hours"],
    governanceConsiderations: "Notification only — escalation never approves a submission. Approval remains human-controlled.",
    financialSafeguards: "No financial action; the automation only surfaces ageing work for human review.",
  },
  {
    id: "REC-002",
    title: "Invoice Ageing Alerts",
    description: "Flag invoices that remain unpaid beyond 30 days so finance follow-up happens consistently instead of ad hoc.",
    category: "Financial",
    area: "Invoicing",
    impact: "High",
    complexity: "Low",
    riskLevel: "Low",
    estimatedHoursSavedPerWeek: 4,
    estimatedReviewReductionPerWeek: 0,
    isFinanciallySensitive: false,
    recommendedTrigger: "Invoice unpaid > 30 days",
    recommendedActions: ["Notify finance of ageing invoice", "Flag invoice for follow-up"],
    businessProblem: "Invoice ageing checks are performed repeatedly by hand, and overdue invoices are sometimes missed.",
    suggestedConditions: ["Invoice status = issued", "Days outstanding > 30"],
    governanceConsiderations: "Informational only — does not alter invoices or create approved financial records.",
    financialSafeguards: "Read-only over financial data; raises a notification, never a mutation.",
  },
  {
    id: "REC-003",
    title: "Failed Accounting Sync Follow-up",
    description: "Open a reconciliation review task whenever an accounting sync fails, so failures are never silently dropped.",
    category: "Financial",
    area: "Sync",
    impact: "Medium",
    complexity: "Low",
    riskLevel: "Medium",
    estimatedHoursSavedPerWeek: 3,
    estimatedReviewReductionPerWeek: 0,
    isFinanciallySensitive: false,
    recommendedTrigger: "sync_failed event",
    recommendedActions: ["Notify CEO of failed sync", "Create reconciliation review task"],
    businessProblem: "Failed accounting syncs often require manual follow-up and can sit unnoticed until reconciliation.",
    suggestedConditions: ["Sync result = failed"],
    governanceConsiderations: "Creates a review task only; reconciliation outcomes remain human-decided.",
    financialSafeguards: "Never re-runs or mutates a sync; downstream accounting stays a consumer only.",
  },
  {
    id: "REC-004",
    title: "Asset Service Reminder Monitoring",
    description: "Notify the responsible PM when an asset reaches its service-due threshold instead of tracking it manually.",
    category: "Operational",
    area: "Asset",
    impact: "Medium",
    complexity: "Medium",
    riskLevel: "Low",
    estimatedHoursSavedPerWeek: 2,
    estimatedReviewReductionPerWeek: 0,
    isFinanciallySensitive: false,
    recommendedTrigger: "asset_service_due event",
    recommendedActions: ["Notify PM of service-due asset", "Schedule a maintenance review"],
    businessProblem: "Asset service reminders are being performed manually and occasionally slip.",
    suggestedConditions: ["Asset service status = due"],
    governanceConsiderations: "Operational notification only; no financial or governance impact.",
    financialSafeguards: "No financial action involved.",
  },
  {
    id: "REC-005",
    title: "Payroll Preparation Reminders",
    description: "Remind the CEO to review the payroll batch ahead of each run — preparation only, never approval.",
    category: "Financial",
    area: "Payroll",
    impact: "High",
    complexity: "Medium",
    riskLevel: "High",
    estimatedHoursSavedPerWeek: 3,
    estimatedReviewReductionPerWeek: 2,
    isFinanciallySensitive: true,
    recommendedTrigger: "Weekly schedule — pre-payroll window",
    recommendedActions: ["Notify CEO to review the upcoming payroll batch"],
    businessProblem: "Payroll preparation is manual and time-sensitive, with no automated reminder before each run.",
    suggestedConditions: ["Payroll window opens within 24 hours"],
    governanceConsiderations: "Approval-protected: the automation may only remind. Payroll can never be approved by automation.",
    financialSafeguards: "Financially sensitive — reminder only. No payroll batch is released without CEO approval.",
  },
  {
    id: "REC-006",
    title: "Monthly Governance Review Scheduling",
    description: "Schedule a recurring reminder to review high-risk and financially sensitive automations each month.",
    category: "Governance",
    area: "Compliance",
    impact: "Medium",
    complexity: "Low",
    riskLevel: "Low",
    estimatedHoursSavedPerWeek: 2,
    estimatedReviewReductionPerWeek: 0,
    isFinanciallySensitive: false,
    recommendedTrigger: "Monthly schedule — governance review",
    recommendedActions: ["Create a governance review reminder", "Notify CEO of high-risk automations"],
    businessProblem: "Governance reviews happen reactively; there is no recurring prompt to revisit elevated-risk automations.",
    suggestedConditions: ["Automation risk level in High, Critical"],
    governanceConsiderations: "Strengthens oversight; never performs a governance action itself.",
    financialSafeguards: "No financial action; supports compliance only.",
  },
  {
    id: "REC-007",
    title: "High-Risk Automation Monitoring",
    description: "Alert the CEO immediately when an automation's governance status moves to High or Critical risk.",
    category: "Governance",
    area: "Compliance",
    impact: "High",
    complexity: "Medium",
    riskLevel: "Medium",
    estimatedHoursSavedPerWeek: 1,
    estimatedReviewReductionPerWeek: 0,
    isFinanciallySensitive: false,
    recommendedTrigger: "Governance status changed to High/Critical",
    recommendedActions: ["Notify CEO", "Flag automation for governance review"],
    businessProblem: "Risk escalations are noticed only when someone opens the Governance Centre.",
    suggestedConditions: ["New risk level in High, Critical"],
    governanceConsiderations: "Surfaces risk faster; the CEO remains the final governance authority.",
    financialSafeguards: "Informational; no financial impact.",
  },
  {
    id: "REC-008",
    title: "Delayed Job Alerts",
    description: "Notify the PM (and escalate critical cases to the CEO) when a job slips past its expected completion.",
    category: "Operational",
    area: "Jobs",
    impact: "Medium",
    complexity: "Low",
    riskLevel: "Low",
    estimatedHoursSavedPerWeek: 4,
    estimatedReviewReductionPerWeek: 0,
    isFinanciallySensitive: false,
    recommendedTrigger: "job_status_changed — overdue",
    recommendedActions: ["Notify PM of delayed job", "Escalate to CEO if critical"],
    businessProblem: "Delayed jobs are discovered late because no alert fires when a job slips.",
    suggestedConditions: ["Job status = overdue"],
    governanceConsiderations: "Operational notification only.",
    financialSafeguards: "No financial action.",
  },
];

// ──────────────────────────────────────────────────────
// HEADLINE FEED INSIGHTS
// ──────────────────────────────────────────────────────

const SEED_HEADLINE_INSIGHTS: string[] = [
  "12 reviews each week require manual escalation.",
  "Failed accounting syncs often require manual follow-up.",
  "Asset service reminders are being performed manually.",
  "Invoice ageing checks are repeated by hand each week.",
];

// ──────────────────────────────────────────────────────
// QUERY + DERIVATION
// ──────────────────────────────────────────────────────

export function getRecommendations(): AutomationRecommendation[] {
  return [...SEED_RECOMMENDATIONS];
}

export function getHeadlineInsights(): string[] {
  return [...SEED_HEADLINE_INSIGHTS];
}

/** A recommendation is a "quick win" when it is low-complexity. */
export function isQuickWin(r: AutomationRecommendation): boolean {
  return r.complexity === "Low";
}

export type RecommendationGroup = "High Impact" | "Quick Wins" | "Financial" | "Governance" | "Operational";

export function inGroup(r: AutomationRecommendation, group: RecommendationGroup): boolean {
  switch (group) {
    case "High Impact": return r.impact === "High";
    case "Quick Wins": return isQuickWin(r);
    case "Financial": return r.category === "Financial";
    case "Governance": return r.category === "Governance";
    case "Operational": return r.category === "Operational";
  }
}

export interface RecommendationSummary {
  total: number;
  highImpact: number;
  financial: number;
  operational: number;
  governance: number;
  estimatedHoursSavedPerWeek: number;
  estimatedReviewReductionPerWeek: number;
}

export function computeRecommendationSummary(
  recs: AutomationRecommendation[]
): RecommendationSummary {
  return {
    total: recs.length,
    highImpact: recs.filter((r) => r.impact === "High").length,
    financial: recs.filter((r) => r.category === "Financial").length,
    operational: recs.filter((r) => r.category === "Operational").length,
    governance: recs.filter((r) => r.category === "Governance").length,
    estimatedHoursSavedPerWeek: recs.reduce((s, r) => s + r.estimatedHoursSavedPerWeek, 0),
    estimatedReviewReductionPerWeek: recs.reduce((s, r) => s + r.estimatedReviewReductionPerWeek, 0),
  };
}

const IMPACT_WEIGHT: Record<RecommendationImpact, number> = { High: 12, Medium: 7, Low: 3 };

export type OpportunityRating = "Significant Opportunity" | "Moderate Opportunity" | "Limited Opportunity";

export interface OpportunityScore {
  score: number; // 0–100
  rating: OpportunityRating;
  summary: string;
}

/**
 * Platform-wide automation opportunity score (0–100). Derived from the weighted
 * impact of outstanding recommendations relative to their theoretical maximum —
 * a higher score means more untapped automation opportunity remains.
 */
export function computeOpportunityScore(
  recs: AutomationRecommendation[]
): OpportunityScore {
  const max = recs.length * IMPACT_WEIGHT.High;
  const weighted = recs.reduce((s, r) => s + IMPACT_WEIGHT[r.impact], 0);
  const score = max > 0 ? Math.round((weighted / max) * 100) : 0;

  const rating: OpportunityRating =
    score >= 75 ? "Significant Opportunity" : score >= 50 ? "Moderate Opportunity" : "Limited Opportunity";

  const topAreas = Array.from(new Set(
    recs.filter((r) => r.impact === "High").map((r) => r.area.toLowerCase())
  )).slice(0, 2);
  const areaText = topAreas.length > 0 ? topAreas.join(" and ") : "several";

  const summary =
    rating === "Significant Opportunity"
      ? `Significant opportunities remain — particularly in ${areaText} workflows.`
      : rating === "Moderate Opportunity"
      ? `Moderate automation opportunity remains, focused on ${areaText} workflows.`
      : "Automation coverage is strong; limited additional opportunity detected.";

  return { score, rating, summary };
}
