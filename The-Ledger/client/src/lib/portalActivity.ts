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

import type {
  PortalJob,
  PortalInvoice,
  PortalMilestone,
  PortalDeliverable,
  PortalDocument,
  PortalThread,
} from "@/lib/portalProjections";

/** A milestone/deliverable paired with its parent project title for the feed. */
export interface ActivityMilestone {
  jobTitle: string;
  milestone: PortalMilestone;
}
export interface ActivityDeliverable {
  jobTitle: string;
  deliverable: PortalDeliverable;
}

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
  invoices: PortalInvoice[],
  milestones: ActivityMilestone[] = [],
  deliverables: ActivityDeliverable[] = [],
  documents: PortalDocument[] = [],
  threads: PortalThread[] = []
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

  // Milestone completed events (client-safe project progress).
  for (const { jobTitle, milestone } of milestones) {
    if (milestone.status === "Completed" && milestone.completedDate) {
      items.push({
        id: `act-ms-${milestone.id}`,
        category: "project",
        title: `Milestone completed: ${milestone.title}`,
        description: `${jobTitle} — ${milestone.title} completed.`,
        date: milestone.completedDate,
      });
    }
  }

  // Deliverable submitted/approved events (Pending is internal-facing only).
  for (const { jobTitle, deliverable } of deliverables) {
    if (deliverable.status === "Pending") continue;
    items.push({
      id: `act-dl-${deliverable.id}`,
      category: "document",
      title: `Deliverable ${deliverable.status.toLowerCase()}: ${deliverable.title}`,
      description: `${jobTitle} — ${deliverable.title} ${deliverable.status.toLowerCase()}.`,
      date: deliverable.issuedDate,
    });
  }

  // New document available (only documents actually shared with the client).
  for (const doc of documents) {
    items.push({
      id: `act-doc-${doc.id}`,
      category: "document",
      title: `New document available: ${doc.title}`,
      description: `${doc.title} was shared with you by ${doc.sharedBy}.`,
      date: doc.sharedAt,
    });
  }

  // Communication thread created / updated.
  for (const thread of threads) {
    const updated = thread.updatedAt !== thread.createdAt;
    items.push({
      id: `act-th-${thread.id}`,
      category: "request",
      title: updated
        ? `Conversation updated: ${thread.subject}`
        : `Conversation started: ${thread.subject}`,
      description: `${thread.projectTitle} — ${thread.status}.`,
      date: thread.updatedAt,
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
