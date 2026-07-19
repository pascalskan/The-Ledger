// ---------------------------------------------------------------------------
// CLIENT REQUESTS (CL-8)
//
// Doctrine: CLIENT_REQUEST_DOMAIN.md (FROZEN)
//
// A client request is a structured communication submitted by a client user
// through the Client Portal, addressed to the platform company.
//
// CRITICAL DOCTRINE CONSTRAINTS enforced by this module:
//
//   1. Client requests NEVER enter the Review Centre. The Review Centre is
//      reserved for worker submissions that produce financial records upon
//      approval. Requests are management communications. This module shares no
//      type, store or code path with ReviewItem.
//   2. No request type ever directly creates a financial record. All financial
//      effects are mediated through a separate PM/CEO decision and the standard
//      workflow.
//   3. A request cannot be modified after submission.
//   4. A declined request cannot be reopened.
//   5. Resolution requires a note; decline requires a reason. Both are shared
//      with the client — there is no silent decline.
//   6. Automation may not resolve, decline or approve a request. Every
//      lifecycle mutation requires an explicit human actor, which is why each
//      mutator takes an `actor` argument rather than defaulting to "System".
//   7. Escalation is a NOTIFICATION action only. It does not change ownership
//      or modify the request record — hence escalation here is DERIVED at read
//      time rather than stored as mutable state.
//
// Mock infrastructure only — no backend.
// ---------------------------------------------------------------------------

import { recordPortalAudit } from "@/lib/portalAudit";

export type ClientRequestType =
  | "additional_service"
  | "quality_complaint"
  | "site_access"
  | "document_request"
  | "billing_query"
  | "scheduling_change"
  | "emergency"
  | "general_enquiry";

export type ClientRequestStatus =
  | "open"
  | "acknowledged"
  | "in_progress"
  | "resolved"
  | "closed"
  | "declined";

export interface ClientRequestTypeMeta {
  code: ClientRequestType;
  label: string;
  /** Covers — shown to the client when choosing a type. */
  description: string;
  /**
   * Whether a deliberate PM/CEO accept-or-decline decision is required.
   * NOTE: this is NOT Review Centre approval — see doctrine constraint 1.
   */
  decisionRequired: boolean;
  /** Hours unacknowledged before the CEO is notified. 0 = immediate. */
  escalationHours: number;
}

export const CLIENT_REQUEST_TYPES: ClientRequestTypeMeta[] = [
  {
    code: "additional_service",
    label: "Additional Service Request",
    description: "Work beyond the current job scope.",
    decisionRequired: true,
    escalationHours: 24,
  },
  {
    code: "quality_complaint",
    label: "Service Quality Complaint",
    description: "Dissatisfaction with work quality.",
    decisionRequired: false,
    escalationHours: 48,
  },
  {
    code: "site_access",
    label: "Site Access Change",
    description: "Changes to access codes, contact or restrictions.",
    decisionRequired: false,
    escalationHours: 48,
  },
  {
    code: "document_request",
    label: "Document Request",
    description: "A specific document, certificate or report.",
    decisionRequired: false,
    escalationHours: 48,
  },
  {
    code: "billing_query",
    label: "Billing Query",
    description: "A question about an invoice or charge.",
    decisionRequired: false,
    escalationHours: 48,
  },
  {
    code: "scheduling_change",
    label: "Scheduling Change Request",
    description: "A change to an upcoming job date or time.",
    decisionRequired: true,
    escalationHours: 4,
  },
  {
    code: "emergency",
    label: "Emergency Request",
    description: "An urgent situation requiring immediate response.",
    decisionRequired: true,
    escalationHours: 0,
  },
  {
    code: "general_enquiry",
    label: "General Enquiry",
    description: "Any other communication.",
    decisionRequired: false,
    escalationHours: 48,
  },
];

export function getRequestTypeMeta(type: ClientRequestType): ClientRequestTypeMeta {
  return CLIENT_REQUEST_TYPES.find((t) => t.code === type)!;
}

export interface ClientRequest {
  id: string;
  requestNumber: string;
  /** Owning client — the scoping primitive. */
  clientId: string;
  /** Job the request relates to. Absent means routed to the CEO. */
  projectId?: string;
  type: ClientRequestType;
  subject: string;
  description: string;
  status: ClientRequestStatus;
  createdAt: string;
  updatedAt: string;
  acknowledgedAt?: string;
  /** Internal: who the request routed to. Never projected to the client. */
  routedTo: "PM" | "CEO";
  /** Shared with the client on resolve. */
  resolutionNote?: string;
  /** Shared with the client on decline — there is no silent decline. */
  declineReason?: string;
  /** Set when a PM/CEO creates a job from this request (traceable chain). */
  resultingJobId?: string;
}

// ── Lifecycle ───────────────────────────────────────────────────────────────
//
//   open           → acknowledged | declined
//   acknowledged   → in_progress  | resolved | declined
//   in_progress    → resolved     | declined
//   resolved       → closed
//   closed         → (terminal)
//   declined       → (terminal — cannot be reopened)

const ALLOWED_TRANSITIONS: Record<ClientRequestStatus, ClientRequestStatus[]> = {
  open: ["acknowledged", "declined"],
  acknowledged: ["in_progress", "resolved", "declined"],
  in_progress: ["resolved", "declined"],
  resolved: ["closed"],
  closed: [],
  declined: [],
};

export function canTransition(from: ClientRequestStatus, to: ClientRequestStatus): boolean {
  return ALLOWED_TRANSITIONS[from].includes(to);
}

export const REQUEST_STATUS_LABELS: Record<ClientRequestStatus, string> = {
  open: "Open",
  acknowledged: "Acknowledged",
  in_progress: "In Progress",
  resolved: "Resolved",
  closed: "Closed",
  declined: "Declined",
};

const days = (n: number) => new Date(Date.now() + n * 86400000).toISOString();
const hours = (n: number) => new Date(Date.now() + n * 3600000).toISOString();

// ── Seed ────────────────────────────────────────────────────────────────────
const requests: ClientRequest[] = [
  {
    id: "req-1",
    requestNumber: "REQ-2026-0001",
    clientId: "dc1",
    projectId: "dj-showcase-maint-1",
    type: "scheduling_change",
    subject: "Move filter replacement to evening slot",
    description: "Could the filter replacement be scheduled after 18:00 to avoid disrupting service?",
    status: "acknowledged",
    createdAt: hours(-6),
    updatedAt: hours(-5),
    acknowledgedAt: hours(-5),
    routedTo: "PM",
  },
  {
    id: "req-2",
    requestNumber: "REQ-2026-0002",
    clientId: "dc1",
    projectId: "dj-kitchen-extract-1",
    type: "document_request",
    subject: "Copy of commissioning certificate",
    description: "Please could you provide the commissioning certificate for our compliance file?",
    status: "resolved",
    createdAt: days(-9),
    updatedAt: days(-8),
    acknowledgedAt: days(-9),
    resolutionNote:
      "The commissioning certificate has been shared to your Documents section and is available to download.",
    routedTo: "PM",
  },
  {
    id: "req-3",
    requestNumber: "REQ-2026-0003",
    clientId: "dc1",
    projectId: "dj-pm-active-1",
    type: "additional_service",
    subject: "Add secondary plant room to scope",
    description: "We would like the secondary plant room included in the current works.",
    status: "declined",
    createdAt: days(-6),
    updatedAt: days(-4),
    acknowledgedAt: days(-5),
    declineReason:
      "The secondary plant room requires a separate asbestos survey before works can be quoted. We will raise a new quotation once that survey is complete.",
    routedTo: "PM",
  },
  {
    // Unacknowledged past its 48h threshold — exercises derived escalation.
    id: "req-4",
    requestNumber: "REQ-2026-0004",
    clientId: "dc1",
    type: "general_enquiry",
    subject: "Update our accounts contact",
    description: "Our accounts contact has changed. Who should we notify?",
    status: "open",
    createdAt: days(-3),
    updatedAt: days(-3),
    routedTo: "CEO",
  },
  // dc2 isolation fixture
  {
    id: "req-5",
    requestNumber: "REQ-2026-0005",
    clientId: "dc2",
    projectId: "dj-office-fit-1",
    type: "quality_complaint",
    subject: "Partition finish below expectation",
    description: "The finish on the first two partitions is not to the agreed standard.",
    status: "in_progress",
    createdAt: days(-2),
    updatedAt: days(-1),
    acknowledgedAt: days(-2),
    routedTo: "PM",
  },
];

let requestCounter = requests.length;

// ── Derived escalation (notification-only — never stored) ───────────────────

export interface RequestEscalation {
  escalated: boolean;
  /** Hours the request has been waiting unacknowledged. */
  waitingHours: number;
  thresholdHours: number;
}

/**
 * Escalation is derived, not stored. Per doctrine it is a notification action
 * that "does not change request ownership or modify the request record", so it
 * must not be persisted as mutable state on the request.
 */
export function computeEscalation(request: ClientRequest): RequestEscalation {
  const meta = getRequestTypeMeta(request.type);
  const stillWaiting = request.status === "open";
  const waitingMs = Date.now() - new Date(request.createdAt).getTime();
  const waitingHours = Math.max(0, Math.floor(waitingMs / 3600000));
  return {
    escalated: stillWaiting && waitingHours >= meta.escalationHours,
    waitingHours,
    thresholdHours: meta.escalationHours,
  };
}

// ── Accessors ───────────────────────────────────────────────────────────────

export function getRequestsForClient(clientId: string): ClientRequest[] {
  return requests
    .filter((r) => r.clientId === clientId)
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
}

export function getAllRequests(): ClientRequest[] {
  return [...requests].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
}

/** PM scope — requests for jobs the PM manages, per the domain visibility table. */
export function getRequestsForProjects(projectIds: string[]): ClientRequest[] {
  return requests
    .filter((r) => r.projectId && projectIds.includes(r.projectId))
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
}

export function getRequestById(id: string): ClientRequest | undefined {
  return requests.find((r) => r.id === id);
}

// ── Client submission ───────────────────────────────────────────────────────

export interface CreateClientRequestInput {
  clientId: string;
  projectId?: string;
  type: ClientRequestType;
  subject: string;
  description: string;
  /** Portal account email, for the audit trail. */
  who: string;
}

export function createClientRequest(input: CreateClientRequestInput): ClientRequest {
  const now = new Date().toISOString();
  requestCounter += 1;
  const request: ClientRequest = {
    id: `req-${Math.random().toString(36).slice(2, 9)}`,
    requestNumber: `REQ-2026-${String(requestCounter).padStart(4, "0")}`,
    clientId: input.clientId,
    projectId: input.projectId,
    type: input.type,
    subject: input.subject.trim(),
    description: input.description.trim(),
    status: "open",
    createdAt: now,
    updatedAt: now,
    // Routed to the PM of the related job; with no job, routed to the CEO.
    routedTo: input.projectId ? "PM" : "CEO",
  };
  requests.unshift(request);

  recordPortalAudit({
    type: "client_request_submitted",
    who: input.who,
    what: `Submitted ${getRequestTypeMeta(request.type).label}: "${request.subject}"`,
    clientId: request.clientId,
    sourceObjectId: request.id,
    externalReference: request.projectId ?? request.clientId,
  });

  return request;
}

// ── PM/CEO lifecycle actions ────────────────────────────────────────────────
//
// Every mutator requires an explicit human `actor`. Automation must not call
// these — there is deliberately no system/automated caller path.

export type RequestActionResult =
  | { ok: true; request: ClientRequest }
  | { ok: false; reason: string };

function transition(
  id: string,
  to: ClientRequestStatus,
  actor: string,
  patch: Partial<ClientRequest> = {}
): RequestActionResult {
  const idx = requests.findIndex((r) => r.id === id);
  if (idx === -1) return { ok: false, reason: "Request not found." };

  const current = requests[idx];
  if (!canTransition(current.status, to)) {
    return {
      ok: false,
      reason: `Cannot move a ${REQUEST_STATUS_LABELS[current.status]} request to ${REQUEST_STATUS_LABELS[to]}.`,
    };
  }

  const updated: ClientRequest = {
    ...current,
    ...patch,
    status: to,
    updatedAt: new Date().toISOString(),
  };
  requests[idx] = updated;
  void actor;
  return { ok: true, request: updated };
}

export function acknowledgeRequest(id: string, actor: string): RequestActionResult {
  const now = new Date().toISOString();
  const result = transition(id, "acknowledged", actor, { acknowledgedAt: now });
  if (result.ok) {
    recordPortalAudit({
      type: "client_request_acknowledged",
      who: actor,
      what: `Acknowledged request ${result.request.requestNumber}`,
      clientId: result.request.clientId,
      sourceObjectId: result.request.id,
      externalReference: result.request.projectId ?? result.request.clientId,
    });
  }
  return result;
}

export function startRequestProgress(id: string, actor: string): RequestActionResult {
  const result = transition(id, "in_progress", actor);
  if (result.ok) {
    recordPortalAudit({
      type: "client_request_in_progress",
      who: actor,
      what: `Started work on request ${result.request.requestNumber}`,
      clientId: result.request.clientId,
      sourceObjectId: result.request.id,
      externalReference: result.request.projectId ?? result.request.clientId,
    });
  }
  return result;
}

/** Resolution note is MANDATORY and is shared with the client. */
export function resolveRequest(id: string, actor: string, resolutionNote: string): RequestActionResult {
  if (!resolutionNote.trim()) {
    return { ok: false, reason: "A resolution note is required and will be shared with the client." };
  }
  const result = transition(id, "resolved", actor, { resolutionNote: resolutionNote.trim() });
  if (result.ok) {
    recordPortalAudit({
      type: "client_request_resolved",
      who: actor,
      what: `Resolved request ${result.request.requestNumber}`,
      clientId: result.request.clientId,
      sourceObjectId: result.request.id,
      externalReference: result.request.projectId ?? result.request.clientId,
    });
  }
  return result;
}

/** Decline reason is MANDATORY and is shared with the client — no silent decline. */
export function declineRequest(id: string, actor: string, declineReason: string): RequestActionResult {
  if (!declineReason.trim()) {
    return { ok: false, reason: "A decline reason is required and will be shared with the client." };
  }
  const result = transition(id, "declined", actor, { declineReason: declineReason.trim() });
  if (result.ok) {
    recordPortalAudit({
      type: "client_request_declined",
      who: actor,
      what: `Declined request ${result.request.requestNumber}`,
      clientId: result.request.clientId,
      sourceObjectId: result.request.id,
      externalReference: result.request.projectId ?? result.request.clientId,
    });
  }
  return result;
}

export function closeRequest(id: string, actor: string): RequestActionResult {
  return transition(id, "closed", actor);
}

/**
 * Record that a PM/CEO created a job from this request. The request itself
 * never creates a job — this only records the traceable chain after the job has
 * been created through the standard workflow.
 */
export function linkJobToRequest(id: string, jobId: string, actor: string): RequestActionResult {
  const idx = requests.findIndex((r) => r.id === id);
  if (idx === -1) return { ok: false, reason: "Request not found." };
  requests[idx] = { ...requests[idx], resultingJobId: jobId, updatedAt: new Date().toISOString() };
  recordPortalAudit({
    type: "job_created_from_client_request",
    who: actor,
    what: `Created job ${jobId} from request ${requests[idx].requestNumber}`,
    clientId: requests[idx].clientId,
    sourceObjectId: requests[idx].id,
    externalReference: jobId,
  });
  return { ok: true, request: requests[idx] };
}

/** Record an escalation notification. Does not modify the request. */
export function recordRequestEscalation(id: string, actor: string): void {
  const request = getRequestById(id);
  if (!request) return;
  recordPortalAudit({
    type: "client_request_escalated",
    who: actor,
    what: `Request ${request.requestNumber} escalated — unacknowledged beyond threshold`,
    clientId: request.clientId,
    sourceObjectId: request.id,
    externalReference: request.projectId ?? request.clientId,
  });
}
