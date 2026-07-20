// ======================================================
// PHASE 5.5 — MARGIN INTELLIGENCE ENGINE
//
// Deterministic, explainable risk classification.
// No AI, no black-box logic.
//
// All inputs come from approved financial records.
// Pending exposure is informational only.
//
// Doctrine:
//   Approved records → actuals → classification
//   Exposure         → forward signal → alerts only
//   Never: early revenue or cost recognition
// ======================================================

import {
  computeJobForecastWithMeta,
  computePortfolioForecast,
  FORECAST_MARGIN_THRESHOLDS,
  type JobForecast,
  type PortfolioForecast,
  type RiskStatus,
} from "@/lib/forecastEngine";

import {
  getJobFinancialSummary,
  type JobFinancialSummary,
} from "@/lib/mockData";

import {
  getPendingExposure,
} from "@/lib/profitabilityEngine";

import type { Job } from "@/types/job";
import type { ReviewItem } from "@/lib/mockData";

// ──────────────────────────────────────────────────────
// RISK ALERT TYPES
//
// Alerts are informational signals only.
// They never modify approved financial state.
// ──────────────────────────────────────────────────────

export type AlertSeverity = "info" | "warning" | "critical";

export type AlertType =
  | "margin-risk"
  | "labour-overrun"
  | "material-overrun"
  | "exposure-spike";

export interface RiskAlert {
  type: AlertType;
  severity: AlertSeverity;
  jobId: string;
  jobTitle: string;
  message: string;
  /** Value that triggered the alert (for display) */
  triggerValue: number;
  /** The threshold that was breached */
  threshold: number;
}

// ──────────────────────────────────────────────────────
// THRESHOLDS
// ──────────────────────────────────────────────────────

/** Labour cost as % of total revenue — triggers overrun alert above this */
export const LABOUR_OVERRUN_THRESHOLD_PCT = 60;

/** Material cost as % of total revenue — triggers overrun alert above this */
export const MATERIAL_OVERRUN_THRESHOLD_PCT = 30;

/** Pending exposure as % of current approved revenue — spikes above this */
export const EXPOSURE_SPIKE_THRESHOLD_PCT = 50;

// ──────────────────────────────────────────────────────
// classifyJobRisk
//
// Single-job classification. Returns a RiskStatus and
// a human-readable explanation of how it was derived.
// ──────────────────────────────────────────────────────
export interface JobRiskClassification {
  jobId: string;
  riskStatus: RiskStatus;
  forecastMargin: number;
  explanation: string;
}

export function classifyJobRisk(forecast: JobForecast): JobRiskClassification {
  const { jobId, forecastMargin, hasApprovedActivity, riskStatus } = forecast;

  let explanation: string;
  if (!hasApprovedActivity) {
    explanation = "No approved financial activity. Cannot classify.";
  } else if (riskStatus === "healthy") {
    explanation = `Forecast margin ${forecastMargin.toFixed(1)}% is at or above the ${FORECAST_MARGIN_THRESHOLDS.HEALTHY}% target.`;
  } else if (riskStatus === "warning") {
    explanation = `Forecast margin ${forecastMargin.toFixed(1)}% is below the ${FORECAST_MARGIN_THRESHOLDS.HEALTHY}% target but above the ${FORECAST_MARGIN_THRESHOLDS.WARNING}% critical threshold.`;
  } else {
    explanation = `Forecast margin ${forecastMargin.toFixed(1)}% is below the ${FORECAST_MARGIN_THRESHOLDS.WARNING}% critical threshold.`;
  }

  return { jobId, riskStatus, forecastMargin, explanation };
}

// ──────────────────────────────────────────────────────
// generateRiskAlerts
//
// Scans all job forecasts and produces RiskAlert[]
// for any thresholds that have been breached.
//
// Alerts are purely informational — they do not change
// any financial records.
// ──────────────────────────────────────────────────────
export function generateRiskAlerts(
  forecasts: JobForecast[],
  summaries: Map<string, JobFinancialSummary>,
): RiskAlert[] {
  const alerts: RiskAlert[] = [];

  for (const forecast of forecasts) {
    if (!forecast.hasApprovedActivity) continue;

    const summary = summaries.get(forecast.jobId);
    if (!summary) continue;

    // ── Margin Risk ────────────────────────────────────
    if (forecast.riskStatus === "critical") {
      alerts.push({
        type: "margin-risk",
        severity: "critical",
        jobId: forecast.jobId,
        jobTitle: forecast.jobTitle,
        message: `${forecast.jobTitle}: forecast margin ${forecast.forecastMargin.toFixed(1)}% is below the ${FORECAST_MARGIN_THRESHOLDS.WARNING}% critical threshold.`,
        triggerValue: forecast.forecastMargin,
        threshold: FORECAST_MARGIN_THRESHOLDS.WARNING,
      });
    } else if (forecast.riskStatus === "warning") {
      alerts.push({
        type: "margin-risk",
        severity: "warning",
        jobId: forecast.jobId,
        jobTitle: forecast.jobTitle,
        message: `${forecast.jobTitle}: forecast margin ${forecast.forecastMargin.toFixed(1)}% is below the ${FORECAST_MARGIN_THRESHOLDS.HEALTHY}% target.`,
        triggerValue: forecast.forecastMargin,
        threshold: FORECAST_MARGIN_THRESHOLDS.HEALTHY,
      });
    }

    // ── Labour Overrun ─────────────────────────────────
    if (summary.totalRevenue > 0) {
      const labourPct = (summary.laborCost / summary.totalRevenue) * 100;
      if (labourPct > LABOUR_OVERRUN_THRESHOLD_PCT) {
        alerts.push({
          type: "labour-overrun",
          severity: labourPct > 80 ? "critical" : "warning",
          jobId: forecast.jobId,
          jobTitle: forecast.jobTitle,
          message: `${forecast.jobTitle}: labour cost is ${labourPct.toFixed(1)}% of revenue, exceeding the ${LABOUR_OVERRUN_THRESHOLD_PCT}% threshold.`,
          triggerValue: labourPct,
          threshold: LABOUR_OVERRUN_THRESHOLD_PCT,
        });
      }

      // ── Material Overrun ─────────────────────────────
      const materialPct = (summary.materialCost / summary.totalRevenue) * 100;
      if (materialPct > MATERIAL_OVERRUN_THRESHOLD_PCT) {
        alerts.push({
          type: "material-overrun",
          severity: materialPct > 50 ? "critical" : "warning",
          jobId: forecast.jobId,
          jobTitle: forecast.jobTitle,
          message: `${forecast.jobTitle}: material cost is ${materialPct.toFixed(1)}% of revenue, exceeding the ${MATERIAL_OVERRUN_THRESHOLD_PCT}% threshold.`,
          triggerValue: materialPct,
          threshold: MATERIAL_OVERRUN_THRESHOLD_PCT,
        });
      }

      // ── Exposure Spike ────────────────────────────────
      const exposurePct = (forecast.pendingCostExposure / summary.totalRevenue) * 100;
      if (forecast.hasPendingExposure && exposurePct > EXPOSURE_SPIKE_THRESHOLD_PCT) {
        alerts.push({
          type: "exposure-spike",
          severity: exposurePct > 100 ? "critical" : "warning",
          jobId: forecast.jobId,
          jobTitle: forecast.jobTitle,
          message: `${forecast.jobTitle}: pending exposure (£${forecast.pendingCostExposure.toFixed(0)}) is ${exposurePct.toFixed(1)}% of approved revenue.`,
          triggerValue: exposurePct,
          threshold: EXPOSURE_SPIKE_THRESHOLD_PCT,
        });
      }
    }
  }

  // Sort: critical first, then warning, then info
  const order: Record<AlertSeverity, number> = { critical: 0, warning: 1, info: 2 };
  alerts.sort((a, b) => order[a.severity] - order[b.severity]);

  return alerts;
}

// ──────────────────────────────────────────────────────
// buildPortfolioForecast
//
// Convenience wrapper that builds all forecasts for a
// set of jobs in one pass. Accepts raw store data so
// the component does not need to know the engine internals.
// ──────────────────────────────────────────────────────
export function buildPortfolioForecast(
  jobs: Job[],
  reviewItems: ReviewItem[],
): {
  forecasts: JobForecast[];
  portfolio: PortfolioForecast;
  alerts: RiskAlert[];
  summaries: Map<string, JobFinancialSummary>;
} {
  const summaries = new Map<string, JobFinancialSummary>();
  const forecasts: JobForecast[] = [];

  for (const job of jobs) {
    const summary = getJobFinancialSummary(job.id);
    const exposure = getPendingExposure(reviewItems as any, job.id);
    summaries.set(job.id, summary);
    forecasts.push(computeJobForecastWithMeta(job, summary, exposure));
  }

  const portfolio = computePortfolioForecast(forecasts);
  const alerts = generateRiskAlerts(forecasts, summaries);

  return { forecasts, portfolio, alerts, summaries };
}
