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
  crew: PortalCrewMember[];
  crewCount: number;
  /** Assigned PM name — a management contact the client may see (domain-permitted). */
  managerName?: string;
}

export interface PortalDocument {
  id: string;
  name: string;
  sharedAt?: string;
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

export interface PortalInvoice {
  id: string;
  invoiceId: string;
  issueDate: string;
  dueDate: string;
  status: Invoice["status"];
  lineItems: PortalInvoiceLine[];
  total: number;
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
    crew,
    crewCount: crew.length,
    managerName,
  };
}

export function toPortalInvoice(invoice: Invoice): PortalInvoice {
  const lineItems: PortalInvoiceLine[] = (invoice.lineItems || []).map((li) => ({
    description: li.description,
    qty: li.qty,
    unitPrice: li.unitPrice,
  }));
  const total = lineItems.reduce((sum, li) => sum + li.qty * li.unitPrice, 0);

  return {
    id: invoice.id,
    invoiceId: invoice.invoiceId,
    issueDate: invoice.issueDate,
    dueDate: invoice.dueDate,
    status: invoice.status,
    lineItems,
    total,
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

export function projectClientInvoices(clientId: string, invoices: Invoice[]): PortalInvoice[] {
  return invoices.filter((i) => i.clientId === clientId).map(toPortalInvoice);
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
