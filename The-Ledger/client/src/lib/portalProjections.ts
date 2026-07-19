// ---------------------------------------------------------------------------
// CLIENT PORTAL — CLIENT-SAFE PROJECTION LAYER (CL-2)
//
// Doctrine: CLIENT_PORTAL_DOMAIN.md
//
// The Client Portal must NEVER consume raw internal entities. Every entity the
// portal renders passes through a projection function in this file. Projections
// are constructed as FRESH objects containing only an explicit whitelist of
// client-safe fields, which makes the following structurally impossible to
// expose through the portal:
//
//   - Cost data (job.costs, worker.costRate)
//   - Margin / profitability data (job.financials)
//   - Payroll data (worker.costRate / billableRate)
//   - Internal notes (client.notes, job internal notes)
//   - Review Centre data
//   - Financial controls
//   - Internal audit information
//   - Accounting sync information (invoice.quickbooksInvoiceId)
//   - Governance information
//   - Access instructions (job.accessInstructions)
//   - Worker surnames / personal contact details / classification
//
// All future portal features (CL-3 … CL-7) MUST consume these projection
// models only. Do not pass raw Client / Job / Worker / Invoice objects into
// portal components.
// ---------------------------------------------------------------------------

import type { Client, Invoice } from "@/lib/mockData";
import type { Worker } from "@/types/worker";
import type { Job } from "@/types/job";
import type { Role } from "@/types/auth";
import type { JobStatus } from "@/types/common";
import {
  getMilestonesForProject,
  getDeliverablesForProject,
  getTimelineForProject,
  type ClientMilestoneStatus,
  type ClientDeliverableStatus,
  type ClientTimelineEventType,
} from "@/lib/portalProjectModels";
import {
  getSharedDocumentsForProjects,
  type ClientDocumentCategory,
} from "@/lib/portalDocuments";
import {
  getThreadsForProjects,
  getMessagesForThread,
  type ClientThreadStatus,
  type ClientThreadTopic,
  type ClientMessageSenderType,
} from "@/lib/portalCommunication";
import {
  getQuotesForProjects,
  getVariationsForProjects,
  getPaymentsForProjects,
  getCreditNotesForProjects,
  getPaymentsForInvoice,
  getCreditNotesForInvoice,
  CLIENT_VISIBLE_QUOTE_STATUSES,
  CLIENT_VISIBLE_VARIATION_STATUSES,
  type ClientQuoteStatus,
  type ClientVariationStatus,
} from "@/lib/portalFinancialModels";

// ── Projection models ──────────────────────────────────────────────────────

export interface PortalClient {
  id: string;
  clientId: string;
  name: string;
}

export interface PortalCrewMember {
  /** Avatar initial derived from the first name only — never the surname. */
  initial: string;
  /** First name only. Surnames are never exposed to clients. */
  firstName: string;
  /** Public-facing role label (e.g. "Cleaning Operative"). */
  role: string;
  scheduledDate?: string;
}

export interface PortalJob {
  id: string;
  jobId: string;
  title: string;
  description: string;
  status: JobStatus;
  startAt: string;
  endAt: string;
  locationAddress: string;
  createdAt: string;
  crew: PortalCrewMember[];
  crewCount: number;
  /** Assigned PM name — a management contact the client may see (domain-permitted). */
  managerName?: string;
}

export interface PortalDocument {
  id: string;
  projectId: string;
  title: string;
  description: string;
  category: ClientDocumentCategory;
  uploadedAt: string;
  sharedAt: string;
  sharedBy: string;
  fileType: string;
}

export interface PortalSite {
  /** Stable id derived from the location address. */
  id: string;
  name: string;
  address: string;
  /** Count of client-visible jobs at this site that are currently in progress. */
  activeJobCount: number;
  /** Count of all client-visible jobs at this site. */
  jobCount: number;
  /** Derived site status: Active if any in-progress job, otherwise Inactive. */
  status: "Active" | "Inactive";
}

export interface PortalInvoiceLine {
  description: string;
  qty: number;
  unitPrice: number;
}

/**
 * Client-facing invoice status. Deliberately NOT the internal status union —
 * the internal "Exported" state is an accounting-sync artefact and must never
 * be visible to a client, and "Draft" invoices are never projected at all.
 */
export type PortalInvoiceStatus = "Issued" | "Part Paid" | "Paid" | "Overdue" | "Cancelled";

export interface PortalInvoice {
  id: string;
  invoiceId: string;
  projectId?: string;
  projectTitle?: string;
  issueDate: string;
  dueDate: string;
  status: PortalInvoiceStatus;
  lineItems: PortalInvoiceLine[];
  total: number;
  amountPaid: number;
  amountOutstanding: number;
}

// ── Job statuses that are visible to clients ───────────────────────────────
// CLIENT_PORTAL_DOMAIN.md — draft and cancelled jobs are never visible.
// The prototype JobStatus enum is { Planned, Active, Completed, Cancelled };
// "Cancelled" maps to the domain's hidden "cancelled". (Domain "draft" has no
// prototype equivalent.) CL-4 will refine status mapping further.
const CLIENT_VISIBLE_STATUSES: JobStatus[] = ["Planned", "Active", "Completed"];

export function isJobClientVisible(job: Pick<Job, "status">): boolean {
  return CLIENT_VISIBLE_STATUSES.includes(job.status);
}

// ── Projection functions ───────────────────────────────────────────────────

export function toPortalClient(client: Client): PortalClient {
  return {
    id: client.id,
    clientId: client.clientId,
    name: client.name,
  };
}

/**
 * Project a worker into a client-safe crew member.
 * Only the first name + public role are exposed. Surname, contact details,
 * cost/billable rates, classification and documents are dropped.
 */
export function toPortalCrewMember(
  worker: Worker,
  roles: Role[],
  scheduledDate?: string
): PortalCrewMember {
  const roleLabel =
    worker.roleIds
      .map((rid) => roles.find((r) => r.id === rid)?.name)
      .filter(Boolean)
      .join(", ") || "Crew Member";

  return {
    initial: (worker.firstName?.[0] ?? "?").toUpperCase(),
    firstName: worker.firstName,
    role: roleLabel,
    scheduledDate,
  };
}

/**
 * Project a job into a client-safe view. Cost, financials, access
 * instructions, manager id and assigned-equipment internals are never copied.
 */
export function toPortalJob(job: Job, workers: Worker[], roles: Role[]): PortalJob {
  const crew = (job.assignedWorkerIds || [])
    .map((wid) => {
      const w = workers.find((worker) => worker.id === wid);
      if (!w) return null;
      return toPortalCrewMember(w, roles, new Date(job.startAt).toLocaleDateString());
    })
    .filter((c): c is PortalCrewMember => c !== null);

  // PM is a management contact — full name is permitted. Resolve against the
  // worker directory; if the manager is not a worker record, leave undefined.
  const manager = job.managerId ? workers.find((w) => w.id === job.managerId) : undefined;
  const managerName = manager ? `${manager.firstName} ${manager.lastName}`.trim() : undefined;

  return {
    id: job.id,
    jobId: job.jobId,
    title: job.title,
    description: job.description,
    status: job.status,
    startAt: job.startAt,
    endAt: job.endAt,
    locationAddress: job.locationAddress,
    createdAt: job.createdAt,
    crew,
    crewCount: crew.length,
    managerName,
  };
}

/**
 * Map an internal invoice status onto the client-facing status, factoring in
 * payments received. Internal-only states are neutralised here:
 *   - "Exported" (accounting sync) → "Issued"
 *   - "Void" → "Cancelled"
 *   - "Draft" never reaches this function (filtered before projection)
 */
function deriveInvoiceStatus(
  internalStatus: Invoice["status"],
  total: number,
  amountPaid: number
): PortalInvoiceStatus {
  if (internalStatus === "Void") return "Cancelled";
  if (amountPaid >= total && total > 0) return "Paid";
  if (internalStatus === "Paid") return "Paid";
  if (amountPaid > 0) return "Part Paid";
  if (internalStatus === "Overdue") return "Overdue";
  // "Sent" and "Exported" both present to the client as simply issued.
  return "Issued";
}

export function toPortalInvoice(invoice: Invoice): PortalInvoice {
  const lineItems: PortalInvoiceLine[] = (invoice.lineItems || []).map((li) => ({
    description: li.description,
    qty: li.qty,
    unitPrice: li.unitPrice,
  }));
  const total = lineItems.reduce((sum, li) => sum + li.qty * li.unitPrice, 0);
  const amountPaid = getPaymentsForInvoice(invoice.id).reduce((s, p) => s + p.amount, 0);
  const credited = getCreditNotesForInvoice(invoice.id).reduce((s, c) => s + c.amount, 0);
  const status = deriveInvoiceStatus(invoice.status, total, amountPaid);
  const amountOutstanding =
    status === "Cancelled" ? 0 : Math.max(0, total - amountPaid - credited);

  // NOTE: invoice.notes, invoice.companyId and invoice.quickbooksInvoiceId
  // (accounting-sync reference) are deliberately never copied.
  return {
    id: invoice.id,
    invoiceId: invoice.invoiceId,
    projectId: invoice.jobId,
    issueDate: invoice.issueDate,
    dueDate: invoice.dueDate,
    status,
    lineItems,
    total,
    amountPaid,
    amountOutstanding,
  };
}

// ── Scoped collection projections (RBAC: own client_id only) ───────────────

/**
 * Build the full client-safe project list for a portal account, scoped to the
 * account's own clientId. Cross-client jobs are filtered out at source and
 * non-client-visible statuses (cancelled, etc.) are excluded.
 */
export function projectClientJobs(
  clientId: string,
  jobs: Job[],
  workers: Worker[],
  roles: Role[]
): PortalJob[] {
  return jobs
    .filter((j) => j.clientId === clientId)
    .filter(isJobClientVisible)
    .map((j) => toPortalJob(j, workers, roles));
}

/**
 * Project the client's invoices. Draft invoices are internal working state and
 * are never projected.
 */
export function projectClientInvoices(
  clientId: string,
  invoices: Invoice[],
  projectTitleById: Record<string, string> = {}
): PortalInvoice[] {
  return invoices
    .filter((i) => i.clientId === clientId)
    .filter((i) => i.status !== "Draft")
    .map(toPortalInvoice)
    .map((pi) => ({
      ...pi,
      projectTitle: pi.projectId ? projectTitleById[pi.projectId] : undefined,
    }))
    .sort((a, b) => (a.issueDate < b.issueDate ? 1 : -1));
}

// ── Milestones / Deliverables / Timeline projections (CL-4) ─────────────────

export interface PortalMilestone {
  id: string;
  title: string;
  description: string;
  status: ClientMilestoneStatus;
  targetDate: string;
  completedDate?: string;
}

export interface PortalDeliverable {
  id: string;
  title: string;
  description: string;
  issuedDate: string;
  status: ClientDeliverableStatus;
}

export interface PortalTimelineEvent {
  id: string;
  type: ClientTimelineEventType;
  title: string;
  description: string;
  date: string;
}

export interface PortalProjectProgress {
  total: number;
  completed: number;
  remaining: number;
  /** Overall completion percent, derived from milestones (0–100). */
  completionPercent: number;
}

/** Project the milestones for a (client-visible) project. Whitelist only. */
export function projectMilestones(projectId: string): PortalMilestone[] {
  return getMilestonesForProject(projectId).map((m) => ({
    id: m.id,
    title: m.title,
    description: m.description,
    status: m.status,
    targetDate: m.targetDate,
    completedDate: m.completedDate,
  }));
}

/** Project the deliverables for a (client-visible) project. Whitelist only. */
export function projectDeliverables(projectId: string): PortalDeliverable[] {
  return getDeliverablesForProject(projectId).map((d) => ({
    id: d.id,
    title: d.title,
    description: d.description,
    issuedDate: d.issuedDate,
    status: d.status,
  }));
}

/** Project the client-safe timeline for a project from a client-safe job. */
export function projectTimeline(job: PortalJob): PortalTimelineEvent[] {
  return getTimelineForProject(job.id, {
    status: job.status,
    startAt: job.startAt,
    endAt: job.endAt,
    createdAt: job.createdAt,
    title: job.title,
  }).map((e) => ({
    id: e.id,
    type: e.type,
    title: e.title,
    description: e.description,
    date: e.date,
  }));
}

// ── Financial projections (CL-6) ────────────────────────────────────────────
//
// Doctrine boundary. Every value below is a commercial artefact the client is
// a party to. No cost, margin, profit, payroll, estimate, forecast, review,
// control, reconciliation, exception or accounting-sync value is ever read
// into these projections.

export interface PortalQuote {
  id: string;
  quoteNumber: string;
  projectId: string;
  projectTitle: string;
  description: string;
  issueDate: string;
  expiryDate: string;
  status: Exclude<ClientQuoteStatus, "Draft">;
  totalValue: number;
}

export interface PortalVariation {
  id: string;
  variationNumber: string;
  projectId: string;
  projectTitle: string;
  description: string;
  value: number;
  status: Exclude<ClientVariationStatus, "Pending Approval">;
  approvalDate?: string;
}

export interface PortalPayment {
  id: string;
  paymentDate: string;
  amount: number;
  reference: string;
  method: string;
  invoiceId: string;
  invoiceNumber: string;
}

export interface PortalCreditNote {
  id: string;
  creditNoteNumber: string;
  issueDate: string;
  amount: number;
  reason: string;
  invoiceNumber: string;
}

export type PortalBalanceHealth = "Healthy" | "Due Soon" | "Overdue";

/**
 * The aggregate client-facing financial position — the client's commercial
 * statement. Derived entirely from projected commercial artefacts.
 */
export interface ClientFinancialProjection {
  totalQuoted: number;
  totalApproved: number;
  totalInvoiced: number;
  totalPaid: number;
  totalCredited: number;
  outstandingBalance: number;
  overdueAmount: number;
  nextDueInvoice?: PortalInvoice;
  health: PortalBalanceHealth;
  quotes: PortalQuote[];
  variations: PortalVariation[];
  invoices: PortalInvoice[];
  payments: PortalPayment[];
  creditNotes: PortalCreditNote[];
}

/** Project the client's quotes. Draft quotes are never projected. */
export function projectClientQuotes(
  visibleProjectIds: string[],
  projectTitleById: Record<string, string> = {}
): PortalQuote[] {
  return getQuotesForProjects(visibleProjectIds)
    .filter((q) => CLIENT_VISIBLE_QUOTE_STATUSES.includes(q.status) && q.status !== "Draft")
    .map((q) => ({
      id: q.id,
      quoteNumber: q.quoteNumber,
      projectId: q.projectId,
      projectTitle: projectTitleById[q.projectId] ?? "Project",
      description: q.description,
      issueDate: q.issueDate,
      expiryDate: q.expiryDate,
      status: q.status as Exclude<ClientQuoteStatus, "Draft">,
      totalValue: q.totalValue,
    }))
    .sort((a, b) => (a.issueDate < b.issueDate ? 1 : -1));
}

/** Project the client's variations. Pending Approval is never projected. */
export function projectClientVariations(
  visibleProjectIds: string[],
  projectTitleById: Record<string, string> = {}
): PortalVariation[] {
  return getVariationsForProjects(visibleProjectIds)
    .filter(
      (v) => CLIENT_VISIBLE_VARIATION_STATUSES.includes(v.status) && v.status !== "Pending Approval"
    )
    .map((v) => ({
      id: v.id,
      variationNumber: v.variationNumber,
      projectId: v.projectId,
      projectTitle: projectTitleById[v.projectId] ?? "Project",
      description: v.description,
      value: v.value,
      status: v.status as Exclude<ClientVariationStatus, "Pending Approval">,
      approvalDate: v.approvalDate,
    }));
}

export function projectClientPayments(
  visibleProjectIds: string[],
  invoiceNumberById: Record<string, string> = {}
): PortalPayment[] {
  return getPaymentsForProjects(visibleProjectIds)
    .map((p) => ({
      id: p.id,
      paymentDate: p.paymentDate,
      amount: p.amount,
      reference: p.reference,
      method: p.method,
      invoiceId: p.invoiceId,
      invoiceNumber: invoiceNumberById[p.invoiceId] ?? p.invoiceId,
    }))
    .sort((a, b) => (a.paymentDate < b.paymentDate ? 1 : -1));
}

export function projectClientCreditNotes(
  visibleProjectIds: string[],
  invoiceNumberById: Record<string, string> = {}
): PortalCreditNote[] {
  return getCreditNotesForProjects(visibleProjectIds)
    .map((c) => ({
      id: c.id,
      creditNoteNumber: c.creditNoteNumber,
      issueDate: c.issueDate,
      amount: c.amount,
      reason: c.reason,
      invoiceNumber: invoiceNumberById[c.invoiceId] ?? c.invoiceId,
    }))
    .sort((a, b) => (a.issueDate < b.issueDate ? 1 : -1));
}

/**
 * Build the aggregate client financial projection. All KPI values are derived
 * from the projected commercial artefacts — never hardcoded, and never sourced
 * from internal cost or margin data.
 */
export function buildClientFinancialProjection(
  quotes: PortalQuote[],
  variations: PortalVariation[],
  invoices: PortalInvoice[],
  payments: PortalPayment[],
  creditNotes: PortalCreditNote[]
): ClientFinancialProjection {
  const totalQuoted = quotes.reduce((s, q) => s + q.totalValue, 0);
  const totalApproved =
    quotes.filter((q) => q.status === "Accepted").reduce((s, q) => s + q.totalValue, 0) +
    variations.filter((v) => v.status === "Approved").reduce((s, v) => s + v.value, 0);

  const billable = invoices.filter((i) => i.status !== "Cancelled");
  const totalInvoiced = billable.reduce((s, i) => s + i.total, 0);
  const totalPaid = payments.reduce((s, p) => s + p.amount, 0);
  const totalCredited = creditNotes.reduce((s, c) => s + c.amount, 0);
  const outstandingBalance = Math.max(0, totalInvoiced - totalPaid - totalCredited);

  const overdueAmount = billable
    .filter((i) => i.status === "Overdue")
    .reduce((s, i) => s + i.amountOutstanding, 0);

  const now = Date.now();
  const nextDueInvoice = billable
    .filter((i) => i.amountOutstanding > 0 && new Date(i.dueDate).getTime() >= now)
    .sort((a, b) => (a.dueDate < b.dueDate ? -1 : 1))[0];

  const dueSoon =
    !!nextDueInvoice &&
    new Date(nextDueInvoice.dueDate).getTime() - now <= 14 * 86400000;

  const health: PortalBalanceHealth =
    overdueAmount > 0 ? "Overdue" : dueSoon ? "Due Soon" : "Healthy";

  return {
    totalQuoted,
    totalApproved,
    totalInvoiced,
    totalPaid,
    totalCredited,
    outstandingBalance,
    overdueAmount,
    nextDueInvoice,
    health,
    quotes,
    variations,
    invoices,
    payments,
    creditNotes,
  };
}

// ── Documents & Communication projections (CL-5) ────────────────────────────

export interface PortalThread {
  id: string;
  projectId: string;
  /** Parent project title, resolved for display. */
  projectTitle: string;
  subject: string;
  topic: ClientThreadTopic;
  status: ClientThreadStatus;
  createdAt: string;
  updatedAt: string;
  messageCount: number;
}

export interface PortalMessage {
  id: string;
  senderType: ClientMessageSenderType;
  senderName: string;
  message: string;
  createdAt: string;
}

/**
 * Project the documents SHARED with this client. Scoped to the client's own
 * visible projects; revoked documents are excluded at source. Internal
 * documents never enter this pipeline at all.
 */
export function projectSharedDocuments(visibleProjectIds: string[]): PortalDocument[] {
  return getSharedDocumentsForProjects(visibleProjectIds)
    .map((d) => ({
      id: d.id,
      projectId: d.projectId,
      title: d.title,
      description: d.description,
      category: d.category,
      uploadedAt: d.uploadedAt,
      sharedAt: d.sharedAt,
      sharedBy: d.sharedBy,
      fileType: d.fileType,
    }))
    .sort((a, b) => (a.sharedAt < b.sharedAt ? 1 : -1));
}

/** Project the client's communication threads, scoped to their projects. */
export function projectThreads(
  visibleProjectIds: string[],
  jobs: PortalJob[]
): PortalThread[] {
  const titleById = new Map(jobs.map((j) => [j.id, j.title]));
  return getThreadsForProjects(visibleProjectIds).map((t) => ({
    id: t.id,
    projectId: t.projectId,
    projectTitle: titleById.get(t.projectId) ?? "Project",
    subject: t.subject,
    topic: t.topic,
    status: t.status,
    createdAt: t.createdAt,
    updatedAt: t.updatedAt,
    messageCount: getMessagesForThread(t.id).length,
  }));
}

/** Project the messages within a thread. Internal notes are never sourced. */
export function projectMessages(threadId: string): PortalMessage[] {
  return getMessagesForThread(threadId).map((m) => ({
    id: m.id,
    senderType: m.senderType,
    senderName: m.senderName,
    message: m.message,
    createdAt: m.createdAt,
  }));
}

/**
 * Derive project progress from milestones. When a project has no milestones,
 * fall back to a status-derived percentage (still derived — never a hardcoded
 * per-project constant).
 */
export function computeProjectProgress(
  milestones: PortalMilestone[],
  status: JobStatus
): PortalProjectProgress {
  const total = milestones.length;
  const completed = milestones.filter((m) => m.status === "Completed").length;
  const remaining = total - completed;

  let completionPercent: number;
  if (total > 0) {
    completionPercent = Math.round((completed / total) * 100);
  } else {
    completionPercent = status === "Completed" ? 100 : status === "Active" ? 50 : 0;
  }

  return { total, completed, remaining, completionPercent };
}

// Job statuses considered "in progress" for site/dashboard rollups.
const IN_PROGRESS_STATUSES: JobStatus[] = ["Planned", "Active"];

/**
 * Derive the client's sites from their client-visible jobs, grouped by
 * location address. Access notes, alarm codes, security info and internal
 * site notes are never sourced — only the public address and rollup counts.
 */
export function projectClientSites(
  clientId: string,
  jobs: Job[],
  workers: Worker[],
  roles: Role[]
): PortalSite[] {
  const visibleJobs = projectClientJobs(clientId, jobs, workers, roles);

  // We need original job status for rollups — re-read from source, scoped.
  const sourceByAddress = new Map<string, Job[]>();
  jobs
    .filter((j) => j.clientId === clientId)
    .filter(isJobClientVisible)
    .forEach((j) => {
      const key = j.locationAddress || "Unspecified location";
      const arr = sourceByAddress.get(key) ?? [];
      arr.push(j);
      sourceByAddress.set(key, arr);
    });

  const sites: PortalSite[] = [];
  Array.from(sourceByAddress.entries()).forEach(([address, group]) => {
    const activeJobCount = group.filter((j) => IN_PROGRESS_STATUSES.includes(j.status)).length;
    sites.push({
      id: `site-${slugify(address)}`,
      name: deriveSiteName(address),
      address,
      activeJobCount,
      jobCount: group.length,
      status: activeJobCount > 0 ? "Active" : "Inactive",
    });
  });
  // Silence unused — visibleJobs kept for parity/readability of the scoping path.
  void visibleJobs;
  return sites.sort((a, b) => a.name.localeCompare(b.name));
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

/** A human site name derived from the first segment of the address. */
function deriveSiteName(address: string): string {
  const firstSegment = address.split(",")[0]?.trim();
  return firstSegment || address;
}
