import { useStore } from "./mockData";
import { useMemo } from "react";

export function useJobIntelligence(jobId?: string) {
  const { jobs, invoices } = useStore();

  return useMemo(() => {
    const calculateJobMetrics = (job: any) => {
      const jobInvoices = invoices.filter((i) => i.jobId === job.id);
      
      const totalCost = job.costs 
        ? (Number(job.costs.labour) || 0) + 
          (Number(job.costs.equipment) || 0) + 
          (Number(job.costs.materials) || 0) + 
          (Number(job.costs.other) || 0)
        : 0;

      const invoicedAmount = jobInvoices.reduce((sum, inv) => {
        return sum + inv.lineItems.reduce((s, li) => s + (li.qty * li.unitPrice), 0);
      }, 0);

      const paidAmount = jobInvoices
        .filter(i => i.status === "Paid")
        .reduce((sum, inv) => {
          return sum + inv.lineItems.reduce((s, li) => s + (li.qty * li.unitPrice), 0);
        }, 0);

      // Mock contract value: use invoiced amount if it exists and is > total cost * 1.2
      // Otherwise, assume a standard 35% margin on costs
      const contractValue = invoicedAmount > totalCost * 1.2 
        ? invoicedAmount 
        : (totalCost > 0 ? totalCost * 1.35 : 5000);

      const profit = contractValue - totalCost;
      const margin = contractValue > 0 ? (profit / contractValue) * 100 : 0;
      const burn = contractValue > 0 ? (totalCost / contractValue) * 100 : 0;
      const remaining = Math.max(0, contractValue - totalCost);
      const collectionRate = invoicedAmount > 0 ? (paidAmount / invoicedAmount) * 100 : 0;

      // Risk conditions
      const hasOverdueInvoices = jobInvoices.some(i => {
        const isOverdue = i.status !== "Paid" && i.status !== "Void" && new Date(i.dueDate) < new Date();
        return isOverdue || i.status === "Overdue";
      });
      const isBehindSchedule = job.status !== "Completed" && new Date(job.endAt) < new Date();

      let healthScore = 100;
      if (burn > 85 && job.status !== "Completed") healthScore -= 20;
      if (margin < 15) healthScore -= 15;
      if (hasOverdueInvoices) healthScore -= 15;
      if (isBehindSchedule) healthScore -= 10;
      // Mock cost trend increasing
      if (burn > 95) healthScore -= 10;

      healthScore = Math.max(0, Math.min(100, healthScore));

      const risks = [];
      if (burn > 95) risks.push({ type: "Over Budget Risk", level: "critical" });
      else if (burn > 85) risks.push({ type: "Budget Warning", level: "warning" });

      if (margin < 15) risks.push({ type: "Margin Compression Risk", level: "critical" });
      else if (margin < 25) risks.push({ type: "Low Margin Warning", level: "warning" });

      if (hasOverdueInvoices) risks.push({ type: "Payment Delay Risk", level: "critical" });
      
      if (isBehindSchedule) risks.push({ type: "Schedule Drift Risk", level: "warning" });

      return {
        job,
        totalCost,
        invoicedAmount,
        paidAmount,
        contractValue,
        profit,
        margin,
        burn,
        remaining,
        collectionRate,
        healthScore,
        risks,
        unpaidInvoices: jobInvoices.filter(i => i.status !== "Paid" && i.status !== "Void")
      };
    };

    if (jobId) {
      const job = jobs.find((j) => j.id === jobId);
      return job ? [calculateJobMetrics(job)] : [];
    }

    return jobs.map(calculateJobMetrics);
  }, [jobs, invoices, jobId]);
}