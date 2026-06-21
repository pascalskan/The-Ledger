// ---------------------------------------------------------------------------
// CLIENT PORTAL — CLIENT-SAFE ACTIVITY FEED (CL-3)
//
// Doctrine: CLIENT_PORTAL_DOMAIN.md
//
// The portal Recent Activity feed is INFORMATIONAL and CLIENT-SAFE. It is
// derived only from data the client is already entitled to see (their visible
// jobs and invoices). It NEVER surfaces internal reviews, Review Centre
// actions, financial controls, governance events, or any internal operational
// activity — those source systems are not even read here.
//
// Allowed categories: project updates, document uploads, invoice updates,
// request updates. (Documents/requests arrive in CL-5/CL-7; for CL-3 the feed
// is built from projected jobs + invoices.)
// ---------------------------------------------------------------------------

import type { PortalJob, PortalInvoice } from "@/lib/portalProjections";

export type PortalActivityCategory = "project" | "document" | "invoice" | "request";

export interface PortalActivityItem {
  id: string;
  category: PortalActivityCategory;
  title: string;
  description: string;
  date: string;
}

function projectStatusVerb(status: PortalJob["status"]): string {
  switch (status) {
    case "Completed":
      return "completed";
    case "Active":
      return "in progress";
    case "Planned":
      return "scheduled";
    default:
      return "updated";
  }
}

/**
 * Build the client-safe activity feed from the client's already-projected
 * jobs and invoices. Most-recent first.
 */
export function buildPortalActivity(
  jobs: PortalJob[],
  invoices: PortalInvoice[]
): PortalActivityItem[] {
  const items: PortalActivityItem[] = [];

  for (const job of jobs) {
    items.push({
      id: `act-job-${job.id}`,
      category: "project",
      title: `${job.title} — ${projectStatusVerb(job.status)}`,
      description: `Project ${job.jobId} is ${projectStatusVerb(job.status)}.`,
      date: job.startAt,
    });
  }

  for (const inv of invoices) {
    const statusLabel = inv.status === "Paid" ? "marked paid" : inv.status === "Overdue" ? "overdue" : "issued";
    // Only surface client-meaningful invoice states (skip internal Draft/Void).
    if (inv.status === "Draft" || inv.status === "Void") continue;
    items.push({
      id: `act-inv-${inv.id}`,
      category: "invoice",
      title: `Invoice ${inv.invoiceId} ${statusLabel}`,
      description: `Invoice ${inv.invoiceId} (${new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format(inv.total)}) ${statusLabel}.`,
      date: inv.issueDate,
    });
  }

  return items.sort((a, b) => (a.date < b.date ? 1 : -1));
}
