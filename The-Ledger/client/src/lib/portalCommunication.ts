// ---------------------------------------------------------------------------
// CLIENT PORTAL — COMMUNICATION CENTRE (CL-5)
//
// Doctrine: CLIENT_PORTAL_DOMAIN.md / CLIENT_REQUEST_DOMAIN.md
//
// Structured, traceable project communication between the client and the
// platform company. Every message belongs to a thread; every thread belongs to
// a project the client can already see. This is deliberately NOT a chat app —
// threads have a subject, a status and an auditable history.
//
// IMPORTANT: These threads are NOT formal Client Requests. The Client Request
// Domain (8 request types, routing, escalation, resolution/decline with
// mandatory reasons) is implemented in CL-7. Nothing here creates a financial
// record, approves anything, or enters the Review Centre.
//
// Internal PM notes and internal routing are never represented here — only the
// externally-shared conversation.
//
// Mock infrastructure only — no backend.
// ---------------------------------------------------------------------------

import { recordPortalAudit } from "@/lib/portalAudit";

export type ClientThreadStatus = "Open" | "Awaiting Response" | "Closed";

export type ClientThreadTopic = "General enquiry" | "Project question" | "Documentation query";

export type ClientMessageSenderType = "Client" | "ProjectManager" | "System";

export interface ClientCommunicationThread {
  id: string;
  projectId: string;
  subject: string;
  topic: ClientThreadTopic;
  status: ClientThreadStatus;
  createdAt: string;
  updatedAt: string;
}

export interface ClientCommunicationMessage {
  id: string;
  threadId: string;
  senderType: ClientMessageSenderType;
  senderName: string;
  message: string;
  createdAt: string;
}

export const THREAD_TOPICS: ClientThreadTopic[] = [
  "General enquiry",
  "Project question",
  "Documentation query",
];

const days = (n: number) => new Date(Date.now() + n * 86400000).toISOString();

// ── Seed threads ────────────────────────────────────────────────────────────
const threads: ClientCommunicationThread[] = [
  {
    id: "th-kex-1",
    projectId: "dj-kitchen-extract-1",
    subject: "Commissioning certificate copy",
    topic: "Documentation query",
    status: "Closed",
    createdAt: days(-10),
    updatedAt: days(-8),
  },
  {
    id: "th-mnt-1",
    projectId: "dj-showcase-maint-1",
    subject: "Access window for filter replacement",
    topic: "Project question",
    status: "Awaiting Response",
    createdAt: days(-2),
    updatedAt: days(-1),
  },
  // dc2 isolation fixture
  {
    id: "th-off-1",
    projectId: "dj-office-fit-1",
    subject: "Partition finish options",
    topic: "Project question",
    status: "Open",
    createdAt: days(-1),
    updatedAt: days(-1),
  },
];

// ── Seed messages ───────────────────────────────────────────────────────────
const messages: ClientCommunicationMessage[] = [
  {
    id: "msg-kex-1-1",
    threadId: "th-kex-1",
    senderType: "Client",
    senderName: "HSS Limited",
    message: "Could you send through a copy of the commissioning certificate for our records?",
    createdAt: days(-10),
  },
  {
    id: "msg-kex-1-2",
    threadId: "th-kex-1",
    senderType: "ProjectManager",
    senderName: "Amir",
    message: "Of course — the commissioning certificate has been shared to your Documents section.",
    createdAt: days(-9),
  },
  {
    id: "msg-kex-1-3",
    threadId: "th-kex-1",
    senderType: "System",
    senderName: "The Ledger",
    message: "Thread closed.",
    createdAt: days(-8),
  },
  {
    id: "msg-mnt-1-1",
    threadId: "th-mnt-1",
    senderType: "Client",
    senderName: "HSS Limited",
    message: "Can the filter replacement be scheduled outside trading hours?",
    createdAt: days(-2),
  },
  {
    id: "msg-mnt-1-2",
    threadId: "th-mnt-1",
    senderType: "ProjectManager",
    senderName: "Amir",
    message: "We're checking crew availability for an evening slot and will confirm shortly.",
    createdAt: days(-1),
  },
  {
    id: "msg-off-1-1",
    threadId: "th-off-1",
    senderType: "Client",
    senderName: "Showcase Systems Ltd",
    message: "What finish options are available for the partitions?",
    createdAt: days(-1),
  },
];

// ── Accessors (scoped to the client's visible projects) ─────────────────────

export function getThreadsForProjects(projectIds: string[]): ClientCommunicationThread[] {
  return threads
    .filter((t) => projectIds.includes(t.projectId))
    .sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1));
}

export function getThreadById(id: string): ClientCommunicationThread | undefined {
  return threads.find((t) => t.id === id);
}

export function getMessagesForThread(threadId: string): ClientCommunicationMessage[] {
  return messages
    .filter((m) => m.threadId === threadId)
    .sort((a, b) => (a.createdAt < b.createdAt ? -1 : 1));
}

// ── Mutators ────────────────────────────────────────────────────────────────

export interface CreateThreadInput {
  projectId: string;
  subject: string;
  topic: ClientThreadTopic;
  message: string;
  senderName: string;
  /** Portal account email + client id for the audit trail. */
  who: string;
  clientId: string;
}

export function createThread(input: CreateThreadInput): ClientCommunicationThread {
  const now = new Date().toISOString();
  const thread: ClientCommunicationThread = {
    id: `th-${Math.random().toString(36).slice(2, 9)}`,
    projectId: input.projectId,
    subject: input.subject.trim(),
    topic: input.topic,
    status: "Open",
    createdAt: now,
    updatedAt: now,
  };
  threads.unshift(thread);

  messages.push({
    id: `msg-${Math.random().toString(36).slice(2, 9)}`,
    threadId: thread.id,
    senderType: "Client",
    senderName: input.senderName,
    message: input.message.trim(),
    createdAt: now,
  });

  recordPortalAudit({
    type: "client_created_thread",
    who: input.who,
    what: `Created communication thread "${thread.subject}"`,
    clientId: input.clientId,
    sourceObjectId: thread.id,
    externalReference: thread.projectId,
  });

  return thread;
}

export interface AddMessageInput {
  threadId: string;
  message: string;
  senderName: string;
  who: string;
  clientId: string;
}

export function addClientMessage(input: AddMessageInput): ClientCommunicationMessage | undefined {
  const idx = threads.findIndex((t) => t.id === input.threadId);
  if (idx === -1) return undefined;

  const now = new Date().toISOString();
  const msg: ClientCommunicationMessage = {
    id: `msg-${Math.random().toString(36).slice(2, 9)}`,
    threadId: input.threadId,
    senderType: "Client",
    senderName: input.senderName,
    message: input.message.trim(),
    createdAt: now,
  };
  messages.push(msg);
  threads[idx] = { ...threads[idx], status: "Awaiting Response", updatedAt: now };
  return msg;
}

/** Record that the client opened a thread (audit only — no state change). */
export function recordThreadViewed(threadId: string, who: string, clientId: string): void {
  const thread = getThreadById(threadId);
  if (!thread) return;
  recordPortalAudit({
    type: "client_viewed_thread",
    who,
    what: `Viewed communication thread "${thread.subject}"`,
    clientId,
    sourceObjectId: thread.id,
    externalReference: thread.projectId,
  });
}
