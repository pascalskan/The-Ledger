# THE LEDGER — SCHEDULING DOMAIN

## Frozen Domain Definition

Version: 1.0
Status: FROZEN
Date: June 4, 2026
Authority: Domain Definition Session — June 4, 2026

---

## STATUS

This document is the authoritative definition of the Scheduling Domain in The Ledger.

Every decision recorded here is final. Ambiguities raised in the Domain Definition Audit regarding the unit of scheduling, worker assignment rules, conflict detection, multi-day jobs, scheduling ownership, and shift generation have been resolved.

This document supersedes any prior partial definitions, audit findings, or implementation assumptions regarding scheduling.

Backend planning for the Scheduling Domain may begin from this document.

---

## WHAT IS SCHEDULING?

Scheduling is the act of assigning workers to jobs and defining when those workers will be at the job's site.

Scheduling produces:
1. A **job schedule entry** — the job appears in the platform's schedule view for the assigned date(s)
2. **Worker schedule entries** — each assigned worker sees the job in their personal schedule view for the relevant date(s)

Scheduling is a PM or CEO action. Workers cannot schedule themselves. Workers cannot self-assign to jobs.

---

## THE UNIT OF SCHEDULING

**The unit of scheduling in The Ledger is the Job.**

A job is scheduled as a whole unit: it has a `scheduled_date` (the date work begins) and optionally a `scheduled_end_date` (the date work ends, for multi-day jobs).

Workers are assigned to the job. Workers are not assigned to individual days within the job in v1. If a job runs from Monday to Friday and three workers are assigned, all three workers are considered assigned for the full duration.

**Decision rationale:** Sub-job daily scheduling (where different workers are assigned per day within a multi-day job) is a legitimate operational need for large projects with crew rotation. However, implementing per-day worker assignment requires a richer scheduling data model (a daily assignment record for each worker-job-date combination) that significantly increases complexity. In v1, the job is the scheduling unit. PMs managing multi-day jobs with crew rotation create separate jobs per crew configuration (e.g., "Canary Wharf Office — Crew A — Mon/Wed" and "Canary Wharf Office — Crew B — Tue/Thu"). This is a documented operational pattern, not a limitation to hide. Per-day assignment within a job is deferred.

---

## JOB SCHEDULE ENTRY

When a job transitions from `draft` to `scheduled` status (PM assigns workers and confirms the date), the job becomes visible in the schedule.

### Schedule Entry Fields

The schedule view derives its data from the Job record. There is no separate schedule entity — the schedule is a view across all jobs in `scheduled`, `active`, or `pending_closure` status.

Key fields from the Job record used by the schedule view:

| Field | Schedule Display |
|---|---|
| `title` | Job name shown in schedule |
| `site_id` → site name and address | Location shown in schedule |
| `scheduled_date` | Date the job appears on the schedule |
| `scheduled_end_date` | End date for multi-day jobs |
| `status` | Colour coding (scheduled vs active vs pending_closure) |
| `assigned_pm_id` | PM responsible shown on schedule card |
| `workers` | Assigned crew shown on schedule card |

---

## WORKER ASSIGNMENT RULES

### Who Can Assign Workers

Only PM (to their own jobs) or CEO (to any job) may assign workers.

Workers cannot self-assign to jobs.

### Assignment Requirements

A worker may be assigned to a job if:
1. The job is in `draft`, `scheduled`, or `active` status.
2. The worker is not already assigned to another job that overlaps the same date/time window (conflict check — see Conflict Detection below).
3. The worker is employed or contracted by the company (active worker profile).

### Adding Workers After Scheduling

Workers may be added to an already-`active` job (mid-job assignment). This is operationally valid — a PM may need to send an additional worker partway through a job.

A worker added to an active job is immediately able to start a shift against that job.

### Removing Workers from a Job

Workers may be removed from a job at any time while no shift is `in_progress` for that worker on that job.

A worker may not be removed while their shift is active (a worker in the field cannot be administratively de-assigned while working). The PM must wait for the shift to end or close the shift manually (with an audit entry) before removing the worker.

Removing a worker does not affect their historical shifts or timesheets already submitted for that job.

---

## CONFLICT DETECTION

### What Is a Conflict?

A scheduling conflict exists when a worker is assigned to two jobs whose date ranges overlap.

In v1, conflict detection is at the **date level** (not the hour level). If a worker is assigned to Job A on Monday 9 June and to Job B on Monday 9 June, that is a conflict.

**Decision:** Hour-level conflict detection (detecting that two jobs on the same day have overlapping time windows) requires the job record to carry start and end times, not just dates. In v1, jobs have dates, not scheduled times. Hour-level conflict detection is deferred. Date-level conflict detection prevents the most egregious scheduling errors (a worker assigned to two different sites on the same day).

### Conflict Detection Behaviour

When a PM attempts to assign a worker to a job whose date range overlaps another job the worker is already assigned to:

1. The platform surfaces a conflict warning showing the conflicting job.
2. The PM may override the conflict warning and complete the assignment.
3. The override is recorded in the audit trail.

**Decision:** Conflicts are warnings, not hard blocks. There are legitimate operational reasons why a worker might be assigned to two jobs on the same day (morning at one site, afternoon at another). Since hour-level detection is not available in v1, the platform cannot determine whether the overlap is real. The warning informs the PM; the PM makes the final decision.

---

## MULTI-DAY JOBS

A multi-day job has both `scheduled_date` and `scheduled_end_date` populated.

### Multi-Day Job in the Schedule

A multi-day job appears on every day from `scheduled_date` to `scheduled_end_date` in the schedule view.

### Worker Assignment on Multi-Day Jobs

All workers assigned to a multi-day job are considered assigned for the full duration. Conflict detection checks all days in the job's date range against each worker's existing assignments.

### Multi-Day Job with Crew Rotation (v1 Workaround)

For multi-day jobs requiring different crews on different days, the recommended approach is to create separate jobs for each crew configuration, all attributed to the same site. This produces multiple job records at the site, which is operationally manageable and produces clean per-job financial records.

---

## SCHEDULING OWNERSHIP

### Primary Owner: PM

The PM assigned to a job owns its scheduling. The PM:
- Sets the scheduled date and end date
- Assigns workers to the job
- Manages conflict resolution
- Updates the schedule as operational circumstances change

### Secondary Owner: CEO

The CEO has full visibility of all jobs and their scheduling across all PMs. The CEO may modify any job's scheduling regardless of PM assignment.

### Worker View (Read-Only)

Workers see their own schedule — the jobs they are assigned to, the dates, and the site address. Workers cannot modify scheduling. Workers cannot see other workers' schedules.

---

## SHIFT GENERATION RELATIONSHIP

The Schedule and the Shift (Timesheet Domain) are related but distinct:

| Dimension | Schedule | Shift |
|---|---|---|
| Created by | PM or CEO | Worker (by starting the shift timer) |
| Level | Planning — what should happen | Reality — what is happening |
| Persists as | Job record (scheduled_date, workers) | Shift record (shift_start, shift_end, status) |
| Financial consequence | None — scheduling is planning | Direct — shift ends → timesheet created → enters Review Centre |

**The schedule is the plan. The shift is the execution.**

A worker who is scheduled for a job on a given day is expected to start a shift against that job when they arrive at the site. The shift records what actually happened (actual start time, actual end time, break, notes). The schedule records what was planned.

Shifts may diverge from the schedule:
- A worker may start late or finish early.
- A worker may start a shift on a job they are assigned to but for which no specific time was scheduled.
- A worker may fail to arrive (open shift remains — PM closes manually).

The platform does not enforce that every scheduled worker starts a shift. It tracks what actually happens via the shift/timesheet system.

### No Automatic Shift Creation from Schedule

The schedule does not automatically create shift records. Shift creation is always a worker action (starting the shift timer) or a PM action (manually creating a shift record for a missed/failed start).

**Decision:** Auto-creating a shift at the scheduled start time would produce orphaned shift records for workers who don't arrive, require automated shift-ending logic, and generally corrupt the timesheet data with planning artefacts. The shift must represent operational reality — what actually happened — not what was planned.

---

## SCHEDULE VIEW

The Schedule surface provides:

### By Date (Calendar View)

A calendar showing all scheduled, active, and pending-closure jobs across all assigned PMs. Jobs appear as cards on their scheduled date(s).

RBAC:
- CEO: sees all jobs across all PMs
- PM: sees only jobs assigned to them

### By Worker (Worker View)

A view of which workers are assigned to which jobs on which dates. Used for capacity planning — the PM can see which workers are free on a given date.

RBAC:
- CEO: sees all workers
- PM: sees workers on their own jobs

### Conflict Indicators

The schedule surface highlights workers who have conflicting assignments (assigned to two jobs on the same day). The PM can see and resolve conflicts from this view.

---

## RBAC

| Role | Can Create Schedule Entry | Can Assign Workers | Can View All Schedule | Can View Own Schedule |
|---|---|---|---|---|
| Worker | No | No | No | Yes (own jobs only) |
| PM | Yes (own jobs) | Yes (own jobs) | No | Yes |
| CEO | Yes (all) | Yes (all) | Yes | Yes |
| Client | No | No | No | No |

---

## AUDIT REQUIREMENTS

| Action | Audit Entry Type |
|---|---|
| Job scheduled (date set) | `job_scheduled` |
| Worker assigned to job | `job_worker_assigned` |
| Worker removed from job | `job_worker_removed` |
| Conflict override (worker assigned despite conflict) | `scheduling_conflict_override` |
| Scheduled date changed | `job_schedule_updated` |

All entries carry: `who`, `what`, `when`, `source_object_id` (job_id), `external_reference` (site_id, client_id, assigned worker_ids).

---

## CONSTRAINTS AND INVARIANTS

1. A job must have a `scheduled_date` to appear in the schedule. `draft` jobs with no scheduled date are not visible in the schedule.
2. `scheduled_end_date` must be on or after `scheduled_date`. A job cannot end before it begins.
3. Workers may only be assigned to jobs by a PM (own jobs) or CEO (all jobs). Workers cannot self-assign.
4. A worker may not be removed from a job while their shift is `in_progress` on that job.
5. Conflict detection operates at the date level in v1. Hour-level conflict detection is deferred.
6. Conflicts are warnings, not hard blocks. PM/CEO may override with audit entry.
7. The schedule is a derived view from job records. There is no separate schedule entity.
8. Shift creation is always a worker or PM manual action. The schedule never automatically creates shifts.
9. Workers see only their own schedule. Cross-worker schedule visibility is PM/CEO only.
10. Demo company schedule data must never appear in a real-business company context.

---

## WHAT THIS DOMAIN DOES NOT COVER

- **Per-day worker assignment within multi-day jobs** — deferred; v1 assigns workers to the full job
- **Scheduled times (hour-level)** — jobs have dates, not times, in v1; hour-level scheduling is deferred
- **Recurring job templates** — automated creation of recurring jobs from a template is deferred; each job is created manually
- **Crew templates** — saving a group of workers as a reusable crew is deferred
- **Route planning** — sequencing multiple jobs in a day for travel efficiency is deferred
- **Mobile push notifications for schedule changes** — deferred; in v1, workers check their schedule in-app

---

## SCHEDULING DOMAIN DECISIONS — SUMMARY TABLE

| Decision | Resolution |
|---|---|
| Unit of scheduling | The Job — not the shift, not the day |
| Date-level vs hour-level scheduling | Date-level in v1; hour-level deferred |
| Worker assignment authority | PM (own jobs) or CEO (all jobs) only |
| Self-assignment by workers | Not permitted |
| Adding workers to active jobs | Permitted |
| Removing workers during active shift | Not permitted |
| Multi-day jobs | Supported; workers assigned for full duration |
| Per-day crew rotation in v1 | Not supported; workaround: separate jobs per crew configuration |
| Conflict detection | Date-level overlap warning; PM/CEO may override |
| Hard conflict block | No — conflicts are warnings only |
| Schedule entity | No separate entity — schedule is a view across job records |
| Shift auto-creation from schedule | No — shifts are always worker or PM actions |
| Scheduling ownership | PM (own jobs); CEO (all); workers read-only |
| Worker schedule visibility | Own scheduled jobs only |
