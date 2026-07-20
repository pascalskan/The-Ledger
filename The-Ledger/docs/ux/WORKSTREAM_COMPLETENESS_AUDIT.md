# WORKSTREAM COMPLETENESS AUDIT (A–E)

Date: July 20, 2026
Baseline: `main` @ `c4c1bac` — 955/955 Playwright, `npm run check` 0 errors, CI gate live

---

# METHOD

Audited against the **original workstream charter**, not the internal programme
documents.

That distinction matters. The internal reports state that the PM and Worker
workstreams have no outstanding items, and they do not mention UX-8 at all —
yet UX-8 is unstarted and belongs to Workstream A. Auditing the docs would have
returned "everything is complete." Auditing the charter against running code did
not.

Every finding below was verified against the codebase. Two of my own initial
findings were wrong and are corrected in place rather than quietly dropped:

- **White-labelling** was reported absent. It is present (`portalBranding.ts`,
  consumed by `PortalShell`). The first grep was simply wrong.
- **Time tracking and QA** were reported absent for the Worker. Both are
  present. The checks used `\|` inside `grep -E`, where that is a *literal
  pipe*, not alternation — so several multi-term checks silently matched
  nothing. Re-run correctly.

---

# SUMMARY

| Workstream | Verdict | Gaps |
|---|---|---|
| A — CEO | **Incomplete** | UX-8 Operations Hub never started |
| B — PM | **Incomplete** | Drag/drop scheduling; crew assignment |
| C — Worker | **Incomplete** | Job View context; GPS |
| D — Client | **Complete** | — |
| E — Platform IA | **Complete** | E-1…E-7 + CI gate delivered |

---

# WORKSTREAM A — CEO EXPERIENCE

All 14 chartered navigation destinations exist and route correctly. The
Command Centre was deliberately folded into the Intelligence Hub by UX-5 — a
design decision, not a gap.

## A-1 — UX-8 Operations Hub never started — MAJOR

The only UX phase never begun, and it belongs to Workstream A, which owns
navigation. Every other area was consolidated:

| Area | Phase | Status |
|---|---|---|
| Finance | UX-4 | Hub |
| Intelligence | UX-5 | Hub |
| Automation | UX-6 | Hub |
| Review | UX-7 | Hub |
| **Operations** | **UX-8** | **Never started** |

Verified absent in code: no `/operations` route; no breadcrumb component; no
global search; no mobile bottom tab bar. The CEO navigation still carries **10
separate operational items**.

This is the exact problem the programme document opens by describing:

> "A CEO managing their business finances was forced to navigate across eight
> screens to complete a single financial workflow."

UX-4 fixed that for finance. Operations still has that shape.

Full scope at `docs/ux/UX_REDESIGN_PROGRAMME.md:371`: `/operations` with six
tabs (Jobs, Schedule, Workers, Clients, Map, Stock & Assets), pending-review
badges on job cards, header breadcrumb, global search placeholder, mobile bottom
tab bar, dashboard single-column on mobile.

## A-2 — Pending exposure absent from the CEO dashboard — MINOR

The charter places *Revenue, Margin, Outstanding invoices, Pending exposure* in
the dashboard Financial Snapshot. Pending exposure is implemented and surfaced
in the Finance Hub Overview, but not on the dashboard. The dashboard carries
"Revenue at Risk", which is related but not the same measure.

## A-3 — The executive surface is the least mobile-ready — MINOR

Part of UX-8. The Worker surface is mobile-first and the Client Portal is
responsive; the CEO/PM shell is desktop-first, with no bottom tab bar and no
single-column dashboard.

This is the **fourth** instance of one pattern: the surface shown to the buyer
is the least finished. The others were `EmptyState` (E-1 F-4), `aria-current`
(E-7 prep), and this. Worth naming as a systemic tendency rather than three
coincidences.

---

# WORKSTREAM B — PROJECT MANAGER EXPERIENCE

Job Workspace, Reviews, Site Operations and Communication are delivered.
Conflict detection, variations, and the site diary (implemented as `jobNotes` /
`addJobNote`) are all present.

## B-1 — Drag/drop scheduling absent — MAJOR

Chartered explicitly under *Owns Scheduling*. Verified absent:

- **No drag-and-drop library installed** — no `react-dnd`, `@dnd-kit`,
  `react-beautiful-dnd`, or `sortablejs` in `package.json`
- **Zero native drag handlers** anywhere in `client/src` — no `onDragStart`,
  `onDrop`, or `draggable`

## B-2 — Crew assignment absent from the schedule — MAJOR

Chartered under *Owns Scheduling: Crew assignment, Resource planning*. The
schedule **displays** crew — `assignedWorkerIds`, `crewAllocationPct`, an
"Assigned Crew" row in the operational drawer — but exposes no action to
allocate or reassign anyone. Resource planning is therefore read-only.

For a PM whose chartered day starts at scheduling, viewing allocation without
being able to change it is a workflow that stops halfway.

---

# WORKSTREAM C — WORKER EXPERIENCE

Shift start/end, breaks, time tracking, all reporting types (timesheets,
expenses, issues, QA, photos, materials, equipment), submission history, and the
full offline story (queue, sync, retry, conflict handling) are present and
tested.

## C-1 — Job View lacks directions, contacts and access info — MAJOR — **RESOLVED**

> **CORRECTION.** This finding originally claimed the Job View renders neither
> the client nor the site address. **That was wrong** — both were already
> present. The error came from a `grep` whose output was truncated at
> `head -6`, so it showed only import lines and the string "Site Photo" while
> the actual rendering sat further down the file. The second such methodology
> error in this audit; the correct move was to read the file, which is what
> established the real scope.

Chartered under *Owns Job View: Job details, Client, Site, Directions, Contact*.

What was actually missing: the address was **plain text with no way to navigate
to it**, and `siteContacts`, `emergencyContacts` and `accessInstructions` were
never rendered at all — despite existing in the `Job` model *and* in seed data.

So a worker could read where to go, but could not navigate there, could not
call anyone, and could not see gate codes or access rules.

**Resolved.** The address is now a tap-to-navigate link (using `latitude`/
`longitude` when present, falling back to the address string); site and
emergency contacts render as `tel:` links, with emergency contacts visually
separated because they are what someone reaches for under pressure; access
instructions render as a distinct callout.

### A data gap sat behind the code gap

Only **2 of 6 seed jobs** carried contact or access data — including
`dj-kitchen-extract-1`, the flagship job used throughout the demo and most
tests. Rendering alone would have left four jobs blank, so realistic site
contacts, emergency contacts and access instructions were added to the four
that lacked them. All six jobs now carry them.

## C-2 — GPS absent — MEDIUM

Chartered under *Owns Shift Experience: Start shift, End shift, Breaks, GPS,
Time tracking*. No geolocation capture exists. Everything else in that list is
implemented.

Worth an explicit decision rather than silent implementation: location capture
on shift start/end has real privacy and consent implications for a workforce
product, and is a policy question as much as a technical one.

---

# WORKSTREAM D — CLIENT EXPERIENCE

**Complete.** Portal authentication, project visibility, milestones,
deliverables, documents, the Communication Centre, the Financial Centre
(quotes, variations, invoices, payments, credit notes), the client-request
lifecycle, the projection layer, and white-labelling via `portalBranding` are
all present. 116 doctrine tests across 7 specs.

Deferred by the frozen domain, not gaps: SSO/MFA; credit-note lifecycle.

---

# WORKSTREAM E — PLATFORM INFORMATION ARCHITECTURE

**Complete.** E-1 audit and frozen lexicon, E-2 terminology, E-3 shell
primitives, E-4 heading hierarchy, E-5 token sweep, E-6 doctrine tests, E-7
route code splitting (entry bundle 1961 KB → 399 KB). CI build+typecheck gate
added and verified.

Deferred backlog, scoped out of E-7 by owner decision: accessibility parity
(`aria-current` on the internal nav, skip links), WCAG AA contrast audit,
tablet responsive pass.

---

# RECOMMENDED ORDER

1. **C-1 — Worker Job View context.** Smallest effort, highest user-visible
   impact. A field worker cannot currently navigate to their own job.
2. **B-1 / B-2 — Scheduling.** Crew assignment first (completes the workflow),
   then drag/drop (makes it fast). Assignment is the one that matters; drag and
   drop is the interaction sugar on top of it.
3. **A-1 — UX-8 Operations Hub.** Largest, and the last structural
   inconsistency in the navigation.
4. **A-2 / A-3, C-2, and the E backlog** — smaller items and open decisions.

C-2 (GPS) needs a product decision before implementation, not just a ticket.
