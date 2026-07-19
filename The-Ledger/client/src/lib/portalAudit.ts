// ---------------------------------------------------------------------------
// CLIENT PORTAL — AUDIT ENGINE (CL-2)
//
// Doctrine: CLIENT_PORTAL_DOMAIN.md § Audit Requirements
//
// All client portal access generates immutable audit records. The portal is a
// read-only surface (except request submission, CL-7); these audit records
// protect the company's governance position.
//
// Mock infrastructure only — entries live in a module-level array. Every entry
// carries who / what / when / source_object_id / external_reference. Entries
// are never mutated or deleted (immutability is enforced by convention here;
// the backend will enforce it structurally).
// ---------------------------------------------------------------------------

export type PortalAuditEventType =
  | "client_portal_provisioned"
  | "client_portal_login"
  | "client_portal_logout"
  | "client_viewed_dashboard"
  | "client_viewed_job"
  | "client_viewed_document"
  | "client_viewed_invoice"
  | "client_created_request"
  // CL-5 — documents & communication
  | "document_shared_with_client"
  | "document_access_revoked"
  | "client_created_thread"
  | "client_viewed_thread"
  // CL-6 — financial transparency
  | "client_viewed_quote"
  | "client_viewed_payment"
  | "client_downloaded_invoice";

export interface PortalAuditEntry {
  id: string;
  type: PortalAuditEventType;
  /** Who performed the action — portal account email, or CEO email for provisioning. */
  who: string;
  what: string;
  when: string;
  /** The client_id the action relates to (multi-tenant external reference). */
  clientId: string;
  /** The primary object acted upon (job id, invoice id, document id, account id). */
  sourceObjectId?: string;
  /** Additional external reference (e.g. job id when viewing a document). */
  externalReference?: string;
}

// ── Module-level immutable audit log ────────────────────────────────────────
const portalAuditLog: PortalAuditEntry[] = [
  {
    id: "pa-seed-1",
    type: "client_portal_provisioned",
    who: "demo.ceo@example.com",
    what: "Provisioned portal account for HSS Limited",
    when: new Date(Date.now() - 30 * 86400000).toISOString(),
    clientId: "dc1",
    sourceObjectId: "pacc-dc1-1",
    externalReference: "dc1",
  },
  {
    id: "pa-seed-2",
    type: "client_portal_provisioned",
    who: "demo.ceo@example.com",
    what: "Provisioned portal account for Showcase Systems Ltd",
    when: new Date(Date.now() - 21 * 86400000).toISOString(),
    clientId: "dc2",
    sourceObjectId: "pacc-dc2-1",
    externalReference: "dc2",
  },
  {
    id: "pa-seed-3",
    type: "client_portal_login",
    who: "portal@hsslimited.co.uk",
    what: "Client signed in to the portal",
    when: new Date(Date.now() - 2 * 86400000).toISOString(),
    clientId: "dc1",
    sourceObjectId: "pacc-dc1-1",
    externalReference: "dc1",
  },
];

function genId(): string {
  return `pa-${Math.random().toString(36).slice(2, 11)}`;
}

/**
 * Append an immutable audit entry. Returns the created entry.
 * `when` is set to now unless supplied.
 */
export function recordPortalAudit(
  entry: Omit<PortalAuditEntry, "id" | "when"> & { when?: string }
): PortalAuditEntry {
  const created: PortalAuditEntry = {
    ...entry,
    id: genId(),
    when: entry.when ?? new Date().toISOString(),
  };
  portalAuditLog.unshift(created);
  return created;
}

/** Read the full audit log (most-recent first). Returns a copy. */
export function getPortalAuditLog(): PortalAuditEntry[] {
  return [...portalAuditLog];
}

/** Read audit entries scoped to a single client. */
export function getPortalAuditLogForClient(clientId: string): PortalAuditEntry[] {
  return portalAuditLog.filter((e) => e.clientId === clientId);
}

/** Read audit entries of a given type. */
export function getPortalAuditLogByType(type: PortalAuditEventType): PortalAuditEntry[] {
  return portalAuditLog.filter((e) => e.type === type);
}

// ── Test/debug seam ──────────────────────────────────────────────────────────
// Read-only accessors are exposed on window so the Playwright doctrine suite can
// assert that portal access generates audit records (the log is in-memory mock
// state). Read-only — there is no mutator exposed.
if (typeof window !== "undefined") {
  (window as any).__portalAudit = {
    getLog: getPortalAuditLog,
    countByType: (type: PortalAuditEventType) => getPortalAuditLogByType(type).length,
  };
}
