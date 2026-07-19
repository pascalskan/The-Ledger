// ---------------------------------------------------------------------------
// CLIENT PORTAL — SHARED DOCUMENTS (CL-5)
//
// Doctrine: CLIENT_PORTAL_DOMAIN.md § Document Visibility
//
//   "Documents must be explicitly shared with the client by a PM or CEO.
//    Documents are not automatically visible to clients because they are added
//    to a job."
//
// This module owns the ONLY channel through which a document can reach a
// client. A document exists here solely because a PM or CEO deliberately
// shared it. Internal documents, PM notes, internal reports, Review Centre
// submissions, financial controls, governance records and internal audit
// documents are never represented here and therefore can never be projected
// into the portal.
//
// Revocation is non-destructive: the record is retained with visibilityStatus
// "Revoked" so the sharing decision stays auditable. Only "Shared" documents
// are projected to the client.
//
// Mock infrastructure only — no backend, no file storage.
// ---------------------------------------------------------------------------

import { recordPortalAudit } from "@/lib/portalAudit";

export type ClientDocumentCategory = "report" | "drawing" | "certificate" | "photo" | "other";

export type ClientDocumentVisibility = "Shared" | "Revoked";

export interface ClientSharedDocument {
  id: string;
  projectId: string;
  title: string;
  description: string;
  category: ClientDocumentCategory;
  uploadedAt: string;
  sharedAt: string;
  /** Name of the PM/CEO who shared it. */
  sharedBy: string;
  fileType: string;
  visibilityStatus: ClientDocumentVisibility;
}

export const DOCUMENT_CATEGORY_LABELS: Record<ClientDocumentCategory, string> = {
  report: "Reports",
  drawing: "Drawings",
  certificate: "Certificates",
  photo: "Photos",
  other: "Other",
};

const days = (n: number) => new Date(Date.now() + n * 86400000).toISOString();

// ── Seed: documents deliberately shared with clients ────────────────────────
const sharedDocuments: ClientSharedDocument[] = [
  // dj-kitchen-extract-1 (dc1)
  {
    id: "sd-kex-1",
    projectId: "dj-kitchen-extract-1",
    title: "Completion Report",
    description: "Final works completion report for the extract installation.",
    category: "report",
    uploadedAt: days(-9),
    sharedAt: days(-8),
    sharedBy: "Amir Khan",
    fileType: "PDF",
    visibilityStatus: "Shared",
  },
  {
    id: "sd-kex-2",
    projectId: "dj-kitchen-extract-1",
    title: "Commissioning Certificate",
    description: "Extract system commissioning certificate.",
    category: "certificate",
    uploadedAt: days(-9),
    sharedAt: days(-8),
    sharedBy: "Amir Khan",
    fileType: "PDF",
    visibilityStatus: "Shared",
  },
  {
    id: "sd-kex-3",
    projectId: "dj-kitchen-extract-1",
    title: "Canopy Layout Drawing",
    description: "As-installed canopy and duct layout.",
    category: "drawing",
    uploadedAt: days(-14),
    sharedAt: days(-12),
    sharedBy: "Amir Khan",
    fileType: "DWG",
    visibilityStatus: "Shared",
  },
  {
    id: "sd-kex-4",
    projectId: "dj-kitchen-extract-1",
    title: "Site Progress Photos",
    description: "Photographic record of works in progress.",
    category: "photo",
    uploadedAt: days(-13),
    sharedAt: days(-11),
    sharedBy: "Amir Khan",
    fileType: "ZIP",
    visibilityStatus: "Shared",
  },
  {
    // Revoked fixture — must never be visible in the portal.
    id: "sd-kex-5",
    projectId: "dj-kitchen-extract-1",
    title: "Superseded Layout (v1)",
    description: "Withdrawn — superseded by the as-installed drawing.",
    category: "drawing",
    uploadedAt: days(-20),
    sharedAt: days(-19),
    sharedBy: "Amir Khan",
    fileType: "DWG",
    visibilityStatus: "Revoked",
  },

  // dj-showcase-maint-1 (dc1)
  {
    id: "sd-mnt-1",
    projectId: "dj-showcase-maint-1",
    title: "Inspection Report",
    description: "Preventative maintenance inspection findings.",
    category: "report",
    uploadedAt: days(-3),
    sharedAt: days(-3),
    sharedBy: "Amir Khan",
    fileType: "PDF",
    visibilityStatus: "Shared",
  },

  // dj-office-fit-1 (dc2) — isolation fixture
  {
    id: "sd-off-1",
    projectId: "dj-office-fit-1",
    title: "Method Statement",
    description: "Partition installation method statement.",
    category: "other",
    uploadedAt: days(-2),
    sharedAt: days(-1),
    sharedBy: "Amir Khan",
    fileType: "PDF",
    visibilityStatus: "Shared",
  },
];

// ── Accessors ───────────────────────────────────────────────────────────────

/** All records (Shared + Revoked) for a project — internal-side use only. */
export function getAllDocumentsForProject(projectId: string): ClientSharedDocument[] {
  return sharedDocuments.filter((d) => d.projectId === projectId);
}

/** Shared-only documents across a set of the client's visible projects. */
export function getSharedDocumentsForProjects(projectIds: string[]): ClientSharedDocument[] {
  return sharedDocuments.filter(
    (d) => projectIds.includes(d.projectId) && d.visibilityStatus === "Shared"
  );
}

export function getSharedDocumentById(id: string): ClientSharedDocument | undefined {
  return sharedDocuments.find((d) => d.id === id);
}

// ── Mutators (PM/CEO only — gated at the UI call site) ───────────────────────

export interface ShareDocumentInput {
  projectId: string;
  title: string;
  description?: string;
  category: ClientDocumentCategory;
  fileType?: string;
  /** PM/CEO performing the share — recorded on the document and in the audit. */
  sharedBy: string;
  /** Client id for the audit trail's external reference. */
  clientId: string;
  uploadedAt?: string;
}

export function shareDocumentWithClient(input: ShareDocumentInput): ClientSharedDocument {
  const doc: ClientSharedDocument = {
    id: `sd-${Math.random().toString(36).slice(2, 9)}`,
    projectId: input.projectId,
    title: input.title.trim(),
    description: input.description?.trim() || "",
    category: input.category,
    uploadedAt: input.uploadedAt ?? new Date().toISOString(),
    sharedAt: new Date().toISOString(),
    sharedBy: input.sharedBy,
    fileType: input.fileType || "PDF",
    visibilityStatus: "Shared",
  };
  sharedDocuments.push(doc);
  recordPortalAudit({
    type: "document_shared_with_client",
    who: input.sharedBy,
    what: `Shared document "${doc.title}" with client`,
    clientId: input.clientId,
    sourceObjectId: doc.id,
    externalReference: doc.projectId,
  });
  return doc;
}

export function revokeDocumentAccess(
  id: string,
  revokedBy: string,
  clientId: string
): ClientSharedDocument | undefined {
  const idx = sharedDocuments.findIndex((d) => d.id === id);
  if (idx === -1) return undefined;
  sharedDocuments[idx] = { ...sharedDocuments[idx], visibilityStatus: "Revoked" };
  recordPortalAudit({
    type: "document_access_revoked",
    who: revokedBy,
    what: `Revoked client access to "${sharedDocuments[idx].title}"`,
    clientId,
    sourceObjectId: id,
    externalReference: sharedDocuments[idx].projectId,
  });
  return sharedDocuments[idx];
}

/** Re-share a previously revoked document. */
export function restoreDocumentAccess(
  id: string,
  sharedBy: string,
  clientId: string
): ClientSharedDocument | undefined {
  const idx = sharedDocuments.findIndex((d) => d.id === id);
  if (idx === -1) return undefined;
  sharedDocuments[idx] = {
    ...sharedDocuments[idx],
    visibilityStatus: "Shared",
    sharedAt: new Date().toISOString(),
    sharedBy,
  };
  recordPortalAudit({
    type: "document_shared_with_client",
    who: sharedBy,
    what: `Restored client access to "${sharedDocuments[idx].title}"`,
    clientId,
    sourceObjectId: id,
    externalReference: sharedDocuments[idx].projectId,
  });
  return sharedDocuments[idx];
}
