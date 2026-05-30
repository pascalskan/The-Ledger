// ======================================================
// PHASE 5.5 — FORECAST ENGINE
//
// Pure functions. No side effects. No React state.
//
// Derives projected financial outcomes from:
//   1. Approved financial records (source of truth)
//   2. Pending exposure (informational — never approved)
//
// Doctrine:
//   Approved records → current actuals
//   Pending exposure → exposure estimate (never revenue/cost)
//   Forecast = actuals + exposure-weighted projection
//
// Never:
//   - recognize exposure as approved revenue/cost
//   - mutate financial state
//   - bypass the approval pipeline
//
// All inputs must come from callers (no direct store access).
// ======================================================

import type { JobFinancialSummary } from "@/lib/mockData";
import type { PendingExposure } from "@/lib/profitabilityEngine";
import type { Job } from "@/types/job";

// ──────────────────────────────────────────────────────
// CONSTANTS
// ──────────────────────────────────────────────────────

/**
 * Default exposure realisation factor.
 *
 * When incorporating pending exposure into a forecast,
 * we apply a conservative discount to account for the
 * fact that pending items may be rejected, corrected, or
 * partially approved.
 *
 * 0.85 = assume 85% of pending cost will be approved.
 * Callers may override this per use-case.
 */
export const DEFAULT_EXPOSURE_REALISATION_FACTOR = 0.85;

/** Margin thresholds for risk classification. */
export const FORECAST_MARGIN_THRESHOLDS = {
  HEALTHY: 20,   // >= 20% → Healthy
  WARNING: 10,   // >= 10% and < 20% → Warning
  // < 10% → Critical
} as const;

// ──────────────────────────────────────────────────────
// TYPE: ForecastResult
//
// The complete forecast for a single job.
// Split into approved (current actuals) and forecast
// (actuals + realised exposure projection).
//
// Forecast values are informational only — they are NOT
// approved financial records.
// ──────────────────────────────────────────────────────
export interface ForecastResult {
  jobId: string;

  // Current approved actuals (from getJobFinancialSummary)
  currentRevenue: number;
  currentCost: number;
  currentProfit: number;
  currentMargin: number;  // percentage

  // Pending exposure (estimate — NOT approved)
  pendingCostExposure: number;
  pendingRevenueExposure: number;
  exposureItemCount: number;

  // Forecast (actuals + realisation-weighted exposure)
  forecastRevenue: number;
  forecastCost: number;
  forecastProfit: number;
  forecastMargin: number;  // percentage

  // Variance between current and forecast
  marginVariance: number;  // forecastMargin - currentMargin (negative = deteriorating)
  revenueVariance: number;
  costVariance: number;

  // Metadata
  exposureRealisationFactor: number;
  hasApprovedActivity: boolean;
  hasPendingExposure: boolean;
}

// ──────────────────────────────────────────────────────
// TYPE: JobForecast
//
// ForecastResult plus job metadata for table display.
// ──────────────────────────────────────────────────────
export interface JobForecast extends ForecastResult {
  jobTitle: string;
  clientId: string;
  jobStatus: string;
  riskStatus: RiskStatus;
}

// ──────────────────────────────────────────────────────
// TYPE: RiskStatus
//
// Deterministic classification of a job's financial risk.
// Based on forecast margin (not current margin).
// ──────────────────────────────────────────────────────
export type RiskStatus = "healthy" | "warning" | "critical" | "no-data";

// ──────────────────────────────────────────────────────
// TYPE: PortfolioForecast
//
// Aggregated forecast across all jobs.
// ──────────────────────────────────────────────────────
export interface PortfolioForecast {
  totalJobs: number;
  jobsWithActivity: number;
  jobsWithExposure: number;

  // Portfolio actuals
  totalCurrentRevenue: number;
  totalCurrentCost: number;
  totalCurrentProfit: number;
  currentPortfolioMargin: number;

  // Portfolio exposure
  totalExposure: number;

  // Portfolio forecast
  totalForecastRevenue: number;
  totalForecastCost: number;
  totalForecastProfit: number;
  forecastPortfolioMargin: number;

  // Risk counts
  healthyCount: number;
  warningCount: number;
  criticalCount: number;
  noDataCount: number;

  // Worst-performing jobs by forecast margin (top 3)
  atRiskJobs: JobForecast[];
}

// ──────────────────────────────────────────────────────
// deriveRiskStatus
//
// Deterministic — given a margin percentage, returns
// the risk classification. Uses FORECAST_MARGIN_THRESHOLDS.
//
// If no approved activity, returns 'no-data'.
// ──────────────────────────────────────────────────────
export function deriveRiskStatus(
  forecastMargin: number,
  hasApprovedActivity: boolean
): RiskStatus {
  if (!hasApprovedActivity) return "no-data";
  if (forecastMargin >= FORECAST_MARGIN_THRESHOLDS.HEALTHY) return "healthy";
  if (forecastMargin >= FORECAST_MARGIN_THRESHOLDS.WARNING) return "warning";
  return "critical";
}

// ──────────────────────────────────────────────────────
// computeJobForecast
//
// Creates a ForecastResult for a single job.
//
// Parameters:
//   summary  — JobFinancialSummary from getJobFinancialSummary()
//   exposure — PendingExposure from getPendingExposure()
//   factor   — exposure realisation factor (default 0.85)
//
// The exposure is weighted by the realisation factor before
// being added to actuals. This produces a conservative
// forecast — not an optimistic one.
// ──────────────────────────────────────────────────────
export function computeJobForecast(
  summary: JobFinancialSummary,
  exposure: PendingExposure,
  factor = DEFAULT_EXPOSURE_REALISATION_FACTOR,
): ForecastResult {
  const currentRevenue = summary.totalRevenue;
  const currentCost    = summary.totalCost;
  const currentProfit  = summary.grossProfit;
  const currentMargin  = summary.marginPercent;

  // Apply realisation factor to exposure
  const realisedCost    = exposure.totalPendingCost    * factor;
  const realisedRevenue = exposure.totalPendingRevenue * factor;

  const forecastRevenue = currentRevenue + realisedRevenue;
  const forecastCost    = currentCost    + realisedCost;
  const forecastProfit  = forecastRevenue - forecastCost;
  const forecastMargin  = forecastRevenue > 0
    ? (forecastProfit / forecastRevenue) * 100
    : 0;

  const marginVariance  = forecastMargin - currentMargin;
  const revenueVariance = forecastRevenue - currentRevenue;
  const costVariance    = forecastCost - currentCost;

  return {
    jobId: summary.jobId,

    currentRevenue,
    currentCost,
    currentProfit,
    currentMargin,

    pendingCostExposure:    exposure.totalPendingCost,
    pendingRevenueExposure: exposure.totalPendingRevenue,
    exposureItemCount:      exposure.pendingItemCount,

    forecastRevenue,
    forecastCost,
    forecastProfit,
    forecastMargin,

    marginVariance,
    revenueVariance,
    costVariance,

    exposureRealisationFactor: factor,
    hasApprovedActivity: summary.hasActivity,
    hasPendingExposure:  exposure.pendingItemCount > 0,
  };
}

// ──────────────────────────────────────────────────────
// computeJobForecastWithMeta
//
// Combines computeJobForecast with job metadata to
// produce a JobForecast for table and panel display.
// ──────────────────────────────────────────────────────
export function computeJobForecastWithMeta(
  job: Job,
  summary: JobFinancialSummary,
  exposure: PendingExposure,
  factor = DEFAULT_EXPOSURE_REALISATION_FACTOR,
): JobForecast {
  const result = computeJobForecast(summary, exposure, factor);
  const riskStatus = deriveRiskStatus(result.forecastMargin, result.hasApprovedActivity);

  return {
    ...result,
    jobTitle:  job.title,
    clientId:  job.clientId,
    jobStatus: job.status,
    riskStatus,
  };
}

// ──────────────────────────────────────────────────────
// computePortfolioForecast
//
// Aggregates an array of JobForecast records into a
// portfolio-level summary.
// ──────────────────────────────────────────────────────
export function computePortfolioForecast(
  forecasts: JobForecast[],
): PortfolioForecast {
  const withActivity  = forecasts.filter((f) => f.hasApprovedActivity);
  const withExposure  = forecasts.filter((f) => f.hasPendingExposure);

  const totalCurrentRevenue  = withActivity.reduce((s, f) => s + f.currentRevenue,  0);
  const totalCurrentCost     = withActivity.reduce((s, f) => s + f.currentCost,     0);
  const totalCurrentProfit   = withActivity.reduce((s, f) => s + f.currentProfit,   0);
  const totalForecastRevenue = withActivity.reduce((s, f) => s + f.forecastRevenue, 0);
  const totalForecastCost    = withActivity.reduce((s, f) => s + f.forecastCost,    0);
  const totalForecastProfit  = withActivity.reduce((s, f) => s + f.forecastProfit,  0);
  const totalExposure        = forecasts.reduce((s, f) => s + f.pendingCostExposure, 0);

  const currentPortfolioMargin  = totalCurrentRevenue  > 0
    ? (totalCurrentProfit  / totalCurrentRevenue)  * 100 : 0;
  const forecastPortfolioMargin = totalForecastRevenue > 0
    ? (totalForecastProfit / totalForecastRevenue) * 100 : 0;

  const healthyCount  = forecasts.filter((f) => f.riskStatus === "healthy").length;
  const warningCount  = forecasts.filter((f) => f.riskStatus === "warning").length;
  const criticalCount = forecasts.filter((f) => f.riskStatus === "critical").length;
  const noDataCount   = forecasts.filter((f) => f.riskStatus === "no-data").length;

  // Worst-performing: jobs with activity, sorted by forecast margin ascending
  const atRiskJobs = [...withActivity]
    .sort((a, b) => a.forecastMargin - b.forecastMargin)
    .slice(0, 3);

  return {
    totalJobs:       forecasts.length,
    jobsWithActivity: withActivity.length,
    jobsWithExposure: withExposure.length,

    totalCurrentRevenue,
    totalCurrentCost,
    totalCurrentProfit,
    currentPortfolioMargin,

    totalExposure,

    totalForecastRevenue,
    totalForecastCost,
    totalForecastProfit,
    forecastPortfolioMargin,

    healthyCount,
    warningCount,
    criticalCount,
    noDataCount,

    atRiskJobs,
  };
}
