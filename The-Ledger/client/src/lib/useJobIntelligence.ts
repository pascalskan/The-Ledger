import { useStore } from "./mockData";
import { getJobFinancialSummary } from "./mockData";
import { useMemo } from "react";

// ============================================================
// PHASE 5.1 — SINGLE SOURCE OF FINANCIAL TRUTH
//
// useJobIntelligence previously derived cost, profit, and
// margin from job.costs.* (static estimates) and legacy
// Invoice.lineItems. Both are pre-approval data that do not
// reflect actual approved financial activity.
//
// As of Phase 5.1, this hook consumes getJobFinancialSummary()
// for all cost/revenue/profit/margin figures. This ensures
// Job Intelligence and Job Financial Summary always agree.
//
// When hasActivity === false (no approved records yet), all
// financial figures are shown as zero. No fabricated contract
// values or margin estimates are applied.
//
// Fields sourced from legacy Invoice objects are preserved:
//   - invoicedAmount  (sum of legacy Invoice.lineItems)
//   - paidAmount      (filtered by Invoice.status === 'Paid')
//   - collectionRate  (paidAmount / invoicedAmount)
//   - hasOverdueInvoices (Invoice due date + status check)
//
// Schedule-based risk (isBehindSchedule) is preserved from
// job.endAt and job.status — these are operational, not
// financial, and are legitimate sources.
// ============================================================

export function useJobIntelligence(jobId?: string) {
  const { jobs, invoices } = useStore();

  return useMemo(() => {
    const calculateJobMetrics = (job: any) => {
      // ─────────────────────────────────────────────────────
      // FINANCIAL DATA: sourced from normalized approved records
      // via getJobFinancialSummary() — the single financial truth.
      // ─────────────────────────────────────────────────────
      const summary = getJobFinancialSummary(job.id);

      const totalCost = summary.totalCost;
      const totalRevenue = summary.totalRevenue;
      const profit = summary.grossProfit;
      const margin = summary.marginPercent;

      // Burn: what fraction of approved revenue has been consumed by cost.
      // When no revenue exists, burn is 0 (no contract to burn against).
      const burn = totalRevenue > 0 ? (totalCost / totalRevenue) * 100 : 0;
      const remaining = Math.max(0, totalRevenue - totalCost);

      // ─────────────────────────────────────────────────────
      // INVOICE DATA: sourced from legacy Invoice objects.
      // These represent manually created billing documents and
      // are a legitimate source for collection status.
      // ─────────────────────────────────────────────────────
      const jobInvoices = invoices.filter((i) => i.jobId === job.id);

      const invoicedAmount = jobInvoices.reduce((sum, inv) => {
        return sum + inv.lineItems.reduce((s: number, li: any) => s + (li.qty * li.unitPrice), 0);
      }, 0);

      const paidAmount = jobInvoices
        .filter((i) => i.status === "Paid")
        .reduce((sum, inv) => {
          return sum + inv.lineItems.reduce((s: number, li: any) => s + (li.qty * li.unitPrice), 0);
        }, 0);

      const collectionRate = invoicedAmount > 0 ? (paidAmount / invoicedAmount) * 100 : 0;

      // ─────────────────────────────────────────────────────
      // OPERATIONAL RISK SIGNALS
      // ─────────────────────────────────────────────────────
      const hasOverdueInvoices = jobInvoices.some((i) => {
        const isOverdue = i.status !== "Paid" && i.status !== "Void" && new Date(i.dueDate) < new Date();
        return isOverdue || i.status === "Overdue";
      });

      const isBehindSchedule = job.status !== "Completed" && new Date(job.endAt) < new Date();

      // ─────────────────────────────────────────────────────
      // HEALTH SCORE: composite signal from financial + ops
      // ─────────────────────────────────────────────────────
      let healthScore = 100;

      if (summary.hasActivity) {
        // Only penalise burn/margin when we have real approved data.
        if (burn > 85 && job.status !== "Completed") healthScore -= 20;
        if (burn > 95) healthScore -= 10;
        if (margin < 15) healthScore -= 15;
      }

      if (hasOverdueInvoices) healthScore -= 15;
      if (isBehindSchedule) healthScore -= 10;

      healthScore = Math.max(0, Math.min(100, healthScore));

      // ─────────────────────────────────────────────────────
      // RISK FACTORS
      // ─────────────────────────────────────────────────────
      const risks: Array<{ type: string; level: string }> = [];

      if (summary.hasActivity) {
        if (burn > 95) risks.push({ type: "Over Budget Risk", level: "critical" });
        else if (burn > 85) risks.push({ type: "Budget Warning", level: "warning" });

        if (margin < 15) risks.push({ type: "Margin Compression Risk", level: "critical" });
        else if (margin < 25) risks.push({ type: "Low Margin Warning", level: "warning" });
      }

      if (hasOverdueInvoices) risks.push({ type: "Payment Delay Risk", level: "critical" });
      if (isBehindSchedule) risks.push({ type: "Schedule Drift Risk", level: "warning" });

      return {
        job,
        // Financial summary (normalized, Phase 5.1)
        summary,
        totalCost,
        totalRevenue,
        profit,
        margin,
        burn,
        remaining,
        // Legacy invoice fields (billing status)
        invoicedAmount,
        paidAmount,
        collectionRate,
        // Operational
        healthScore,
        risks,
        unpaidInvoices: jobInvoices.filter((i) => i.status !== "Paid" && i.status !== "Void"),
        // Backward-compat alias: contractValue = totalRevenue (approved)
        // When hasActivity is false, this is 0 rather than a fabricated estimate.
        contractValue: totalRevenue,
      };
    };

    if (jobId) {
      const job = jobs.find((j) => j.id === jobId);
      return job ? [calculateJobMetrics(job)] : [];
    }

    return jobs.map(calculateJobMetrics);
  }, [jobs, invoices, jobId]);
}
