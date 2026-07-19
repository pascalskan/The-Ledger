// ---------------------------------------------------------------------------
// CLIENT PORTAL — PROJECT DELIVERABLES & MILESTONE MODELS (CL-4)
//
// Doctrine: CLIENT_PORTAL_DOMAIN.md
//
// These are CLIENT-FACING models: milestones, deliverables and timeline events
// that describe project progress to the client. They contain no cost, margin,
// payroll, review, governance or internal-note data — only the public,
// client-safe story of the work.
//
// Mock infrastructure only — seeded per project (jobId). Portal views consume
// the PROJECTIONS of these models (see portalProjections.ts), never these raw
// arrays directly. Accessors here are scoped by projectId; the caller passes a
// projectId from an already client-scoped (visible) job.
// ---------------------------------------------------------------------------

export type ClientMilestoneStatus = "Upcoming" | "In Progress" | "Completed" | "Delayed";

export interface ClientProjectMilestone {
  id: string;
  projectId: string;
  title: string;
  description: string;
  status: ClientMilestoneStatus;
  targetDate: string;
  completedDate?: string;
}

export type ClientDeliverableStatus = "Pending" | "Submitted" | "Approved";

export interface ClientDeliverable {
  id: string;
  projectId: string;
  title: string;
  description: string;
  issuedDate: string;
  status: ClientDeliverableStatus;
}

export type ClientTimelineEventType =
  | "created"
  | "scheduled"
  | "work_started"
  | "milestone"
  | "deliverable"
  | "completed";

export interface ClientTimelineEvent {
  id: string;
  projectId: string;
  type: ClientTimelineEventType;
  title: string;
  description: string;
  date: string;
}

const days = (n: number) => new Date(Date.now() + n * 86400000).toISOString();

// ── Seed: milestones per project ────────────────────────────────────────────
const MILESTONES: ClientProjectMilestone[] = [
  // dj-kitchen-extract-1 (dc1, Completed) — all milestones done
  { id: "ms-kex-1", projectId: "dj-kitchen-extract-1", title: "Site survey & access", description: "Initial survey and access arrangements confirmed.", status: "Completed", targetDate: days(-20), completedDate: days(-20) },
  { id: "ms-kex-2", projectId: "dj-kitchen-extract-1", title: "Canopy & duct installation", description: "Primary canopy and duct run installed.", status: "Completed", targetDate: days(-12), completedDate: days(-11) },
  { id: "ms-kex-3", projectId: "dj-kitchen-extract-1", title: "Commissioning & handover", description: "System commissioned and handed over.", status: "Completed", targetDate: days(-8), completedDate: days(-8) },

  // dj-showcase-maint-1 (dc1, Active) — mixed, including a Delayed milestone
  { id: "ms-mnt-1", projectId: "dj-showcase-maint-1", title: "Preventative inspection", description: "Scheduled inspection of plant.", status: "Completed", targetDate: days(-3), completedDate: days(-3) },
  { id: "ms-mnt-2", projectId: "dj-showcase-maint-1", title: "Filter & belt replacement", description: "Replace consumable parts.", status: "In Progress", targetDate: days(1) },
  { id: "ms-mnt-3", projectId: "dj-showcase-maint-1", title: "Compliance certificate", description: "Issue maintenance compliance certificate.", status: "Delayed", targetDate: days(-1) },
  { id: "ms-mnt-4", projectId: "dj-showcase-maint-1", title: "Final sign-off", description: "Client walk-through and sign-off.", status: "Upcoming", targetDate: days(5) },

  // dj-pm-active-1 (dc1, Active)
  { id: "ms-pma-1", projectId: "dj-pm-active-1", title: "Mobilisation", description: "Crew mobilised to site.", status: "Completed", targetDate: days(-2), completedDate: days(-2) },
  { id: "ms-pma-2", projectId: "dj-pm-active-1", title: "First fix", description: "First-fix works underway.", status: "In Progress", targetDate: days(2) },

  // dj-boiler-room-2 (dc1, Planned) — all upcoming
  { id: "ms-brm-1", projectId: "dj-boiler-room-2", title: "Pre-start survey", description: "Survey and risk assessment.", status: "Upcoming", targetDate: days(3) },
  { id: "ms-brm-2", projectId: "dj-boiler-room-2", title: "Installation", description: "Boiler room works.", status: "Upcoming", targetDate: days(9) },

  // dj-office-fit-1 (dc2, Planned) — isolation fixture
  { id: "ms-off-1", projectId: "dj-office-fit-1", title: "Partition delivery", description: "Materials delivered to site.", status: "Upcoming", targetDate: days(2) },
  { id: "ms-off-2", projectId: "dj-office-fit-1", title: "Installation", description: "Partition installation.", status: "Upcoming", targetDate: days(7) },
];

// ── Seed: deliverables per project ──────────────────────────────────────────
const DELIVERABLES: ClientDeliverable[] = [
  // dj-kitchen-extract-1 (dc1)
  { id: "dl-kex-1", projectId: "dj-kitchen-extract-1", title: "Completion report", description: "Final works completion report.", issuedDate: days(-8), status: "Approved" },
  { id: "dl-kex-2", projectId: "dj-kitchen-extract-1", title: "Commissioning certificate", description: "Extract system commissioning certificate.", issuedDate: days(-8), status: "Approved" },
  { id: "dl-kex-3", projectId: "dj-kitchen-extract-1", title: "O&M manual", description: "Operation & maintenance manual.", issuedDate: days(-7), status: "Submitted" },

  // dj-showcase-maint-1 (dc1)
  { id: "dl-mnt-1", projectId: "dj-showcase-maint-1", title: "Inspection report", description: "Preventative inspection findings.", issuedDate: days(-3), status: "Submitted" },
  { id: "dl-mnt-2", projectId: "dj-showcase-maint-1", title: "Compliance certificate", description: "Pending issue on completion.", issuedDate: days(1), status: "Pending" },

  // dj-office-fit-1 (dc2) — isolation fixture
  { id: "dl-off-1", projectId: "dj-office-fit-1", title: "Method statement", description: "Installation method statement.", issuedDate: days(-1), status: "Submitted" },
];

// ── Accessors (scoped by projectId) ─────────────────────────────────────────

export function getMilestonesForProject(projectId: string): ClientProjectMilestone[] {
  return MILESTONES.filter((m) => m.projectId === projectId);
}

export function getDeliverablesForProject(projectId: string): ClientDeliverable[] {
  return DELIVERABLES.filter((d) => d.projectId === projectId);
}

/**
 * Build the client-safe timeline for a project from its lifecycle plus its
 * completed milestones and issued deliverables. Generated deterministically so
 * any job (even without seeded milestones) yields a sensible timeline. Returns
 * events in chronological order (oldest first).
 */
export function getTimelineForProject(
  projectId: string,
  job: { status: string; startAt: string; endAt: string; createdAt: string; title: string }
): ClientTimelineEvent[] {
  const events: ClientTimelineEvent[] = [];

  events.push({
    id: `tl-${projectId}-created`,
    projectId,
    type: "created",
    title: "Project created",
    description: `${job.title} was created.`,
    date: job.createdAt,
  });
  events.push({
    id: `tl-${projectId}-scheduled`,
    projectId,
    type: "scheduled",
    title: "Scheduled",
    description: "Crew and dates confirmed.",
    date: job.startAt,
  });

  if (job.status === "Active" || job.status === "Completed") {
    events.push({
      id: `tl-${projectId}-started`,
      projectId,
      type: "work_started",
      title: "Work started",
      description: "Our crew began work on site.",
      date: job.startAt,
    });
  }

  for (const ms of getMilestonesForProject(projectId)) {
    if (ms.status === "Completed" && ms.completedDate) {
      events.push({
        id: `tl-ms-${ms.id}`,
        projectId,
        type: "milestone",
        title: `Milestone completed: ${ms.title}`,
        description: ms.description,
        date: ms.completedDate,
      });
    }
  }

  for (const dl of getDeliverablesForProject(projectId)) {
    if (dl.status !== "Pending") {
      events.push({
        id: `tl-dl-${dl.id}`,
        projectId,
        type: "deliverable",
        title: `Deliverable issued: ${dl.title}`,
        description: dl.description,
        date: dl.issuedDate,
      });
    }
  }

  if (job.status === "Completed") {
    events.push({
      id: `tl-${projectId}-completed`,
      projectId,
      type: "completed",
      title: "Project completed",
      description: "All works completed and handed over.",
      date: job.endAt,
    });
  }

  return events.sort((a, b) => (a.date < b.date ? -1 : 1));
}
