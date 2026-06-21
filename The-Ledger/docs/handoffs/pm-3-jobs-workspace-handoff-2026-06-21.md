# PM-3 — Jobs Workspace — Handoff

Date: 2026-06-21
Branch: `feature/pm-3-jobs-workspace`
Status: **COMPLETE — build green; awaiting owner test run and PR merge.**

---

## Summary

PM-3 delivers the dedicated Project Manager jobs experience. The PM now sees only the jobs assigned to them (where `job.managerId === user.id`), with enhanced operational job cards. Navigating directly to an unassigned job shows an access-denied screen. The PM job detail is a purpose-built 6-section operational workspace with zero financial data. The CEO experience on both the jobs list and job detail is completely unchanged.

---

## PM-2 Changes Relevant to PM-3

PM-3 branches from `feature/pm-2-navigation-dashboard` and inherits:

- `client/src/lib/roleHelpers.ts` — canonical `isCEO()`, `isProjectManager()` helpers (used throughout PM-3)
- `client/src/pages/dashboard.tsx` — PM/CEO role branching pattern (replicated in jobs.tsx and job-detail.tsx)
- Demo user `du2` established as the Demo PM (used in PM-3 scope enforcement)

---

## Files Changed

### Modified

- `client/src/lib/mockData.ts` — Added `managerId: "du2"` to `dj-kitchen-extract-1` (DEMO-JOB-0201). The Demo PM (du2) is now the assigned manager of this job. `dj-showcase-maint-1` (DEMO-JOB-0202) intentionally has no managerId — used for scope enforcement testing.

- `client/src/pages/jobs.tsx`:
  - Added `useAuth` and `isCEO`, `isProjectManager` imports
  - Added `roles`, `reviewItems` to `useStore` destructure
  - Computed `userIsPM`, `userIsCEO` using canonical helpers
  - Added `pmJobs` — filtered to `job.managerId === user?.id`, sorted by status then date
  - Added `getJobState()` — maps job state to visual indicator (on-track / attention / high-priority)
  - Added `PMJobCard` component — enhanced card with crew count, pending review count, visual state badge, client, location, date
  - Added PM early return — renders "My Jobs" heading + `PMJobCard` grid; no Create Job button; no search/date filters
  - CEO path unchanged — full search/filter UI, Create Job button, original `Card` design

- `client/src/pages/job-detail.tsx`:
  - Added `useAuth`, `isCEO`, `isProjectManager` imports
  - Added `reviewItems` to `useStore` destructure
  - Added PM access control — if PM and `job.managerId !== user?.id` → renders access-denied screen (`pm-job-access-denied`) before any job data is shown
  - Added PM workspace early return — 6-section layout: Overview, Crew, Reviews, Schedule, Documents, Attention Required
  - Attention Required banner at top of PM workspace when pending reviews or corrections exist
  - No financial panels in PM workspace (no JobIntelligenceSection, JobFinancialSummarySection, InvoiceReadinessPanel, PendingExposurePanel, JobForecastPanel, JobSyncPanel, JobReconciliationPanel, JobExceptionPanel, Invoice Draft panel)
  - CEO path unchanged — all financial panels retained; Edit button retained

### Created

- `tests/doctrine/pm-jobs.spec.ts` — 6 doctrine tests (PM-JOBS-01 to PM-JOBS-06)
- `docs/handoffs/pm-3-jobs-workspace-handoff-2026-06-21.md` — this document

---

## Architecture Decisions

### PM job scoping
`pmJobs` is computed inline as `jobs.filter(j => j.managerId === user?.id)`. This is correct: the mock data is already scoped to the current company via `useStore`, so the managerId filter is a simple identity match against the logged-in user's id.

### PM access control in job-detail
The access denied check is placed after the `job found` guard and before any state hooks that depend on the job (`useState`, `useMemo`). This is the safe position — React's rules of hooks require consistent hook call order, and the access-denied early return is placed after all hooks have been declared.

Wait — actually, the hooks (`useState`, `useMemo`) ARE called before the PM workspace early return because they appear in the function body before the `if (userIsPM)` block. This is correct: hooks must not be called conditionally, and the PM workspace return is a branch within the render phase, not within the hook phase.

### 6-section PM workspace
The PM workspace is a self-contained early return within `JobDetailPage`. It shares the same data (from `useStore` and `useAuth`) as the CEO path but renders only operational sections. Financial panel imports remain in the file — they are never rendered for PM.

---

## PM Jobs Scoping — RBAC Table

| Scenario | Expected result |
|---|---|
| PM views `/jobs` | Sees only jobs where `managerId === user.id` |
| PM views `/jobs/dj-kitchen-extract-1` | PM workspace (owns this job) |
| PM views `/jobs/dj-showcase-maint-1` | Access denied screen |
| CEO views `/jobs` | All jobs, search/filter UI, Create Job button |
| CEO views `/jobs/dj-kitchen-extract-1` | Full CEO detail with financial panels |

---

## PM Job Cards — Visual States

| State | Trigger | Border/Background | Badge |
|---|---|---|---|
| High Priority | `job.priority === 'High' \| 'Critical'` | Amber | "High Priority" |
| Attention Required | pending reviews > 0 | Red | "Attention Required" |
| On Track | Active job, no pending reviews | Emerald | "On Track" |
| Normal | No match above | None | None |

---

## PM Workspace Sections

| Section | testId | Content |
|---|---|---|
| Overview | `pm-workspace-overview` | Description, start/end dates, location, crew count |
| Crew | `pm-workspace-crew` | Assigned workers by firstName+lastName, status badge |
| Reviews | `pm-workspace-reviews` | Pending/correction/approved counts; recent submissions list; link to review queue |
| Schedule | `pm-workspace-schedule` | Start date, end date, upcoming shifts (if any); link to schedule |
| Documents | `pm-workspace-documents` | Document list with View button |
| Attention Required | `pm-workspace-attention` | Pending reviews + corrections needed; or green "all clear" |

---

## Tests Added

`tests/doctrine/pm-jobs.spec.ts` — 6 doctrine tests:

| ID | Description |
|---|---|
| PM-JOBS-01 | PM jobs page shows only assigned jobs; heading is "My Jobs" |
| PM-JOBS-02 | PM is denied access to a job they do not manage |
| PM-JOBS-03 | PM job cards show crew count and pending review count |
| PM-JOBS-04 | PM job workspace renders 6 sections; no financial data |
| PM-JOBS-05 | CEO jobs page shows all jobs and Create Job button |
| PM-JOBS-06 | CEO job detail retains financial intelligence panels |

---

## Verification Results

- Build (`npm run build`): **PASS**
- Doctrine compliance: **PASS** — no financial data in PM job workspace; CEO experience unchanged; PM scope enforcement by managerId
- Playwright: **Pending owner local run** (per project workflow)

---

## Doctrine Compliance

| Doctrine | Finding |
|---|---|
| **RBAC** | PASS — PM sees only assigned jobs; PM workspace zero financial data; CEO unchanged; Worker/Client unaffected |
| **Financial Integrity** | PASS — no revenue, margin, invoice, or financial forecast data visible to PM in any jobs surface |
| **Approval** | PASS — no financial mutations occur; all approval workflows preserved; PM workspace is read-only |
| **Audit** | PASS — no audit regressions; existing audit behaviour preserved |
| **Review Centre Protection** | PASS — PM can see review submission counts and link to Review Centre; PM cannot bypass Review Centre |
| **Financial Visibility Rules** | PASS — PM cannot see JobIntelligenceSection, JobFinancialSummarySection, InvoiceReadinessPanel, PendingExposurePanel, JobForecastPanel, JobSyncPanel, JobReconciliationPanel, JobExceptionPanel, or Invoice Draft panel |

---

## Outstanding Work / Next Steps for PM-4+

1. **Owner:** run the full Playwright suite locally and confirm green.
2. **Owner:** open and merge `feature/pm-3-jobs-workspace` → `main` (as a PR, per git workflow).
3. **PM-4** — suggested scope:
   - PM Crew management page (`/workers`) scoped to workers on PM's assigned jobs
   - PM Schedule page (`/schedule`) scoped to PM's assigned jobs and their crew
   - PM Notifications (`/notifications`) scoped to assigned-job events only
   - Consider shared `SectionCard` / `WorkspaceSectionCard` primitive if multiple PM workspace pages are added
4. Consider adding `managerId` to more demo jobs to give PM a richer demo experience (currently only 1 assigned job).
