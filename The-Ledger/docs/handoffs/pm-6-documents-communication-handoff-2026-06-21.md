# PM-6 — Documents & Communication — Handoff

Date: 2026-06-21
Branch: `feature/pm-2-navigation-dashboard`
Status: **COMPLETE — build green; awaiting owner test run.**

---

## Summary

PM-6 delivers the PM collaboration layer inside the PM Job Workspace. The Job Workspace (introduced in PM-3 as job-detail.tsx) gains five new sections: Site Information, enhanced Documents, Notes, Communication, and an Activity Timeline. The PM Dashboard gains a Recent Activity card.

PM-6 resolves the PM-1 audit finding that PMs had no documentation workflow, no site information workspace, no internal communications channel, and no chronological activity view.

---

## PM-1 Audit Findings Resolved

| Finding | Severity | Status |
|---|---|---|
| No documentation workflow for PM | High | **RESOLVED** |
| No site information workspace | High | **RESOLVED** |
| No internal communications channel | Medium | **RESOLVED** |
| No central notes system | Medium | **RESOLVED** |
| No chronological activity view per job | Medium | **RESOLVED** |

---

## Files Changed

### Modified

- **`client/src/types/job.ts`**:
  - Added `category?: 'site' | 'compliance' | 'report' | 'client' | 'other'` to `JobDocument`
  - Added `uploadedBy?: string` to `JobDocument`
  - Added `JobSiteContact` interface: `{ name: string; role: string; phone: string; email?: string }`
  - Added 4 optional fields to `Job` interface:
    - `accessInstructions?: string`
    - `siteContacts?: JobSiteContact[]`
    - `emergencyContacts?: JobSiteContact[]`
    - `specialRequirements?: string`

- **`client/src/lib/mockData.ts`**:
  - Added `JobNote` interface (exported)
  - Added `JobCommunication` interface (exported)
  - Added `DEMO_JOB_NOTES` constant — 4 demo notes (note-pm-1, note-pm-2, note-pm-3 archived, note-br-1)
  - Added `DEMO_JOB_COMMUNICATIONS` constant — 3 demo comms (comm-pm-1 pm-comment, comm-pm-2 crew-update, comm-pm-3 internal-update)
  - Added module-level mutable arrays: `let jobNotes`, `let jobCommunications`
  - Updated `dj-pm-active-1` demo job: added access instructions, 2 site contacts, 2 emergency contacts, special requirements, 3 categorised documents (doc-pm-1 site, doc-pm-2 compliance, doc-pm-3 client)
  - Updated `dj-boiler-room-2` demo job: added access instructions, 1 site contact, 1 emergency contact, special requirements, 1 site document (doc-br-1)
  - Added to `useStore()` return:
    - `jobNotes` (filtered: `!archived`, scoped to `currentCompanyId`)
    - `jobCommunications` (scoped to `currentCompanyId`)
    - `addJobNote(note)` — adds to module-level array, audit logs, refreshes
    - `updateJobNote(id, updates)` — updates with `updatedAt`, audit logs, refreshes
    - `addJobCommunication(comm)` — adds to module-level array, audit logs, refreshes

- **`client/src/pages/job-detail.tsx`**:
  - Added imports: `Textarea`, `Phone`, `Mail`, `StickyNote`, `MessageSquare`, `Activity`, `ShieldCheck`, `PenLine`, `Archive`, `Send`
  - Added to `useStore()` destructure: `jobNotes`, `jobCommunications`, `addJobNote`, `updateJobNote`, `addJobCommunication`
  - Added 5 new `useState` hooks (before PM early return, after existing hooks):
    - `newNoteContent` — new note text input
    - `showAddNote` — toggle for add-note form
    - `editingNoteId` — which note is in edit mode
    - `editNoteContent` — content for edit form
    - `newCommContent` — new communication text input
  - Added **Site Information** section (`pm-workspace-site-info`) — after existing Overview card:
    - Site address
    - Access instructions (slate-50 background)
    - Special requirements (amber-50 background, ShieldCheck icon)
    - Site contacts (`pm-site-contacts`, `pm-site-contact-{i}`) with phone/email links
    - Emergency contacts (`pm-emergency-contacts`, `pm-emergency-contact-{i}`) — rose styling
  - Replaced **Documents** section with enhanced version (`pm-workspace-documents`):
    - Documents grouped by category (Site Docs, Compliance, Client Docs, Reports, Other)
    - `uploadedBy` and upload date shown per document
    - `pm-doc-item-{doc.id}` testId per document
    - Empty state: `pm-documents-empty`
  - Added **Notes** section (`pm-workspace-notes`) with full CRUD:
    - Add Note button → `pm-note-add-button` → shows inline form `pm-note-add-form`
    - Input: `pm-note-input`; Submit: `pm-note-submit`; Cancel: closes form
    - Notes list: `pm-note-{id}` per note
    - Edit: `pm-note-edit-{id}` → `pm-note-edit-input-{id}` → `pm-note-edit-submit-{id}`
    - Archive: `pm-note-archive-{id}` → calls `updateJobNote(id, { archived: true })` → note disappears from filtered list
    - Empty state: `pm-notes-empty`
  - Added **Communication** section (`pm-workspace-communication`) with post form:
    - Communication list: `pm-comm-list`, `pm-comm-item-{id}` per item
    - Type badges: `pm-comment` (blue), `crew-update` (green), `internal-update` (amber)
    - Post form: `pm-comm-input` (Textarea), `pm-comm-submit` → calls `addJobCommunication(..., type: 'pm-comment')`
    - Empty state: `pm-comm-empty`
  - Added **Activity Timeline** section (`pm-workspace-timeline`) — IIFE rendering pattern:
    - Aggregates: `reviewItems` (submittedAt), `jobNotes` (createdAt), `jobCommunications` (createdAt), `job.documents` (uploadedAt)
    - All sorted descending by timestamp, capped at 12 events
    - `pm-timeline-list`, `pm-timeline-event-{i}` per event
    - Icons per type: review (blue ClipboardCheck), note (amber StickyNote), comm (green MessageSquare), doc (purple FileText)
    - Empty state: `pm-timeline-empty`

- **`client/src/pages/dashboard.tsx`**:
  - Added imports: `Activity`, `StickyNote`, `MessageSquare`
  - Added `jobNotes`, `jobCommunications` to `PMDashboard` useStore() destructure
  - Added `recentActivity` derived value: aggregated from `reviewItems`, `jobNotes`, `jobCommunications` — filtered to `pmJobIds`, sorted descending, capped at 6
  - Added **Recent Activity** card (`pm-dashboard-activity`) to the 3-column cards row:
    - Activity list: `pm-dashboard-activity-list`, `pm-dashboard-activity-item-{id}` per event
    - Empty state: `pm-dashboard-activity-empty`
    - No financial data in this card

### Created

- `tests/doctrine/pm-doc.spec.ts` — 7 doctrine tests (PM-DOC-01 to PM-DOC-07)
- `docs/handoffs/pm-6-documents-communication-handoff-2026-06-21.md` — this document

---

## Architecture Decisions

### Mock persistence via module-level mutable arrays
`jobNotes` and `jobCommunications` are module-level mutable arrays (same pattern as `jobs`, `reviewItems`, etc.). `addJobNote`, `updateJobNote`, `addJobCommunication` mutate these arrays in-place and call `refresh()` to re-render all subscribers. This is consistent with existing mockData.ts patterns and requires no backend.

### Archive vs delete for notes
Notes are never deleted — they are archived via `updateJobNote(id, { archived: true })`. The `useStore` filter excludes archived notes from `filteredJobNotes`. This preserves auditability while removing clutter from the active view. Archived notes remain in the module-level array and could be surfaced in a future "Archived Notes" view.

### Activity Timeline as IIFE
The Activity Timeline is rendered as an inline IIFE inside the JSX rather than a separate component. This avoids introducing a new component boundary for a purely derivation + display pattern. If the timeline grows (pagination, filters), it should be extracted.

### Note edit vs archive hooks ordering
All 5 new `useState` hooks are declared before the PM early return, consistent with React hooks ordering rules. The hooks are declared even if a CEO user loads the page (they will go unused), which is the required pattern throughout this codebase.

---

## testId Reference — PM-6

### Site Information (`pm-workspace-site-info`)

| Section | testId |
|---|---|
| Section wrapper | `pm-workspace-site-info` |
| Access instructions | `pm-site-access-instructions` |
| Special requirements | `pm-site-special-requirements` |
| Site contacts list | `pm-site-contacts` |
| Site contact (indexed) | `pm-site-contact-{i}` |
| Emergency contacts list | `pm-emergency-contacts` |
| Emergency contact (indexed) | `pm-emergency-contact-{i}` |

### Documents (`pm-workspace-documents`)

| Section | testId |
|---|---|
| Section wrapper | `pm-workspace-documents` |
| Documents list | `pm-documents-list` |
| Document item | `pm-doc-item-{doc.id}` |
| View document button | `button-job-doc-view-{doc.id}` |
| Empty state | `pm-documents-empty` |

### Notes (`pm-workspace-notes`)

| Section | testId |
|---|---|
| Section wrapper | `pm-workspace-notes` |
| Add Note button | `pm-note-add-button` |
| Add Note form | `pm-note-add-form` |
| Note input | `pm-note-input` |
| Note submit | `pm-note-submit` |
| Note item | `pm-note-{id}` |
| Edit button | `pm-note-edit-{id}` |
| Edit input | `pm-note-edit-input-{id}` |
| Edit submit | `pm-note-edit-submit-{id}` |
| Archive button | `pm-note-archive-{id}` |
| Empty state | `pm-notes-empty` |

### Communication (`pm-workspace-communication`)

| Section | testId |
|---|---|
| Section wrapper | `pm-workspace-communication` |
| Communication list | `pm-comm-list` |
| Communication item | `pm-comm-item-{id}` |
| Post input | `pm-comm-input` |
| Post submit | `pm-comm-submit` |
| Empty state | `pm-comm-empty` |

### Activity Timeline (`pm-workspace-timeline`)

| Section | testId |
|---|---|
| Section wrapper | `pm-workspace-timeline` |
| Timeline list | `pm-timeline-list` |
| Timeline event (indexed) | `pm-timeline-event-{i}` |
| Empty state | `pm-timeline-empty` |

### Dashboard (`pm-dashboard-activity`)

| Section | testId |
|---|---|
| Recent Activity card | `pm-dashboard-activity` |
| Activity list | `pm-dashboard-activity-list` |
| Activity item | `pm-dashboard-activity-item-{id}` |
| Empty state | `pm-dashboard-activity-empty` |

---

## Tests Added

`tests/doctrine/pm-doc.spec.ts` — 7 doctrine tests:

| ID | Description |
|---|---|
| PM-DOC-01 | Site Information renders with access instructions, special requirements, site contacts, emergency contacts; no financial data |
| PM-DOC-02 | Documents section shows categorised documents with uploader metadata; View button present |
| PM-DOC-03 | Add Note form opens, submits, new note appears in list, form closes |
| PM-DOC-04 | Archive note removes it from the active notes list (filtered out) |
| PM-DOC-05 | Post comment in Communication section; new comment appears; pre-existing demo comms visible |
| PM-DOC-06 | Activity Timeline renders events from multiple sources (reviews/notes/comms/docs); no financial data |
| PM-DOC-07 | PM Dashboard Recent Activity card visible; at least 1 event; no financial terminology |

---

## Verification Results

- Build (`npm run build`): **PASS** (13.25s)
- Playwright: **Pending owner local run**

---

## Doctrine Compliance

| Doctrine | Finding |
|---|---|
| **Approval** | PASS — No financial mutations in any PM-6 feature. Notes and communications are purely operational metadata. |
| **Audit** | PASS — `addJobNote`, `updateJobNote`, `addJobCommunication` all call `addLog()` before `refresh()`. Every note/communication change is traceable. |
| **Financial Integrity** | PASS — Site info, notes, communications, and timeline contain no revenue, margin, exposure, forecast, or contract value data. |
| **RBAC** | PASS — `useStore()` filters `jobNotes` and `jobCommunications` by `currentCompanyId`. Job Workspace continues to be scoped to PM's assigned jobs only (`job.managerId === user?.id`). |
| **Review Centre Protection** | PASS — PM-6 adds no review submission or approval paths. |
| **Job Attribution** | PASS — Every `JobNote` and `JobCommunication` requires `jobId` and `companyId`. No orphaned records possible. |

---

## Outstanding Work

1. **Owner:** run Playwright suite locally and confirm PM-DOC-01 through PM-DOC-07 pass.
2. PM-DOC-04 (`pm-note-note-pm-1`) depends on the testId format `pm-note-{noteId}` — verify the note `note-pm-1` renders with `data-testid="pm-note-note-pm-1"`.

---

## PM-7 Preparation Notes

### Remaining PM Friction Points

The following issues were identified during PM-6 implementation but fall outside PM-6 scope:

1. **PM Clients page unscoped** — `/clients` currently shows all company clients. PM should only see clients whose jobs they manage. (PM-1 audit finding: outstanding)
2. **PM Notifications unscoped** — `/notifications` (or the notification bell) shows all company notification events. PM should only see events for their assigned jobs.
3. **PM Expenses page unscoped** — expense items are not filtered to PM's assigned jobs.
4. **Workers page for PM** — PM can view the full company workforce list. Should be scoped to workers assigned to PM's jobs.
5. **No document upload in PM workspace** — PM can view documents but cannot upload new ones. File upload requires backend (intentionally deferred), but a mock "upload" action (adds an entry to `job.documents`) is feasible.
6. **Note editing not available for other authors' notes** — the current implementation shows Edit/Archive buttons on all active notes regardless of authorId. For a production system, only the author should edit; PM can archive any note.

### Outstanding PM Technical Debt

1. **`dj-kitchen-extract-1` (Completed job)** — this is a CEO demo job that was repurposed as one of PM Alex Reid's jobs earlier in the PM workstream (`managerId: "du2"`). Verify the job is intentionally assigned to du2 or return it to CEO-only.
2. **`myJobs` in PMDashboard** — currently shows Active, Planned, and Completed jobs without `managerId` filter. Should be `jobs.filter(j => j.managerId === user?.id && ...)`.
3. **PM Schedule page conflict detection** — conflict detection (PM-4) uses a simplistic workers-per-job heuristic. A future phase should use actual timesheet shift data.
4. **`reviewItems` in job-detail PM workspace** — the Activity Timeline in PM-6 references `reviewItems` without type narrowing on `submittedAt` (uses non-null assertion). Safe given demo data but should be defensive in production.

### Potential Future PM Enhancements

1. **PM-7 (suggested scope):** Full PM validation pass — end-to-end workflow test (login → dashboard → jobs → review → approve → confirm), zero financial data leakage audit, final RBAC audit before PR merge.
2. **Document upload** — mock file upload action that appends to `job.documents` (same pattern as note add). Categories, uploadedBy auto-populated from current user.
3. **Note search / filter** — for jobs with many notes, a search input would improve usability.
4. **Communication threading** — group communications by date, show "Today", "Yesterday", date headers.
5. **PM notification integration** — when a new review item is submitted for a PM's job, the notification system (if one is wired) should surface it on the PM dashboard.
6. **Crew direct messaging simulation** — crew-update type communications could be auto-generated by worker-submitted timesheets (linking the review system to communications).
