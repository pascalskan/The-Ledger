# WK-1 — Worker Experience Audit — Handoff

Date: 2026-06-21
Branch: `feature/workstream-c-worker-experience`
Status: **COMPLETE — Audit only. No implementation.**

---

## Mandatory Startup Procedure — Executed

| Step | Status |
|---|---|
| Read LEDGER_CANONICAL_CONTEXT.md | ✓ |
| Read most recent handoff (pm-7) | ✓ |
| Read all worker pages + supporting stores | ✓ |
| `git status` | ✓ — branch confirmed `feature/workstream-c-worker-experience`, clean |
| `git branch` | ✓ — confirmed on correct branch |
| `git log --oneline -20` | ✓ — branched from main (commit 464842a) |

---

## Current State Summary

**Roadmap position**: Workstream C — Worker Experience, Phase WK-1 of 7 (Audit)

**Platform state**: The Ledger frontend prototype, phases 1–6.8 complete (501 tests pass on main). PM Workstream (B) complete (merged as PR #27). UX-7 Review Centre Enhancement merged (PR #26). Test baseline: 512/512 passing on main after PM merge and stale-assertion fixes.

**Active branch**: `feature/workstream-c-worker-experience` — branched from main (commit 464842a).

---

## Worker Experience Overview

The Worker Application exists as a Phase 2 deliverable. It was built early in the prototype to validate the submission → Review Centre doctrine. It is functional at a basic level but has not been revisited since Phases 3–6.8 matured the surrounding platform.

The worker experience consists of:

**Routes (all under `/worker/*`):**
- `/worker/jobs` — Job list (WorkerJobsPage)
- `/worker/jobs/:id` — Job detail (WorkerJobDetailPage)
- `/worker/jobs/:id/report` — Report submission (WorkerReportPage)
- `/worker/schedule` — Schedule (WorkerSchedulePage)
- `/worker/uploads` — Upload/sync management (WorkerUploadsPage)
- `/worker/profile` — Profile (WorkerProfilePage)

**Supporting Infrastructure:**
- `WorkerMobileLayout` — Mobile shell with bottom nav, online/offline banner
- `workerStore.ts` — Original, lightweight module-level store (largely superseded)
- `offlineQueueStore.ts` — Zustand persist store for offline queue (active)
- `shiftStore.ts` — Zustand persist store for shift timer (active)

**Demo worker**: `du3` (Demo Worker) — assigned to 2 jobs in mock data.

---

## Existing Functionality

### What Works

| Feature | Status | Location |
|---|---|---|
| Assigned job list (Active + Planned) | ✓ Working | `worker/jobs.tsx` |
| Job filtering by assignedWorkerIds | ✓ Working | `worker/jobs.tsx:12-14` |
| Recent history (last 3 completed) | ✓ Working | `worker/jobs.tsx:72` |
| Job detail — overview, location, dates | ✓ Working | `worker/job-detail.tsx` |
| Job detail — crew tab | ✓ Working | `worker/job-detail.tsx:184` |
| Job detail — assets/equipment tab | ✓ Working | `worker/job-detail.tsx:203` |
| Job detail — documents tab | ✓ Working | `worker/job-detail.tsx:220` |
| Start/End Shift timer (live, persisted) | ✓ Working | `worker/job-detail.tsx:44`, `shiftStore.ts` |
| One-job-at-a-time shift enforcement | ✓ Working | `worker/job-detail.tsx:48` |
| Report submission → Review Centre | ✓ Working | `worker/report.tsx:313` |
| Report notes/work summary | ✓ Working | `worker/report.tsx:668` |
| Materials/consumables search & log | ✓ Working | `worker/report.tsx:677` |
| Assets/equipment search & log | ✓ Working | `worker/report.tsx:761` |
| Upload attachments (QA photo, receipt, before/after, safety, general) | ✓ Working (mocked) | `worker/report.tsx:506` |
| Offline report queuing | ✓ Working | `worker/report.tsx:279` |
| Auto-sync when reconnected | ✓ Working | `worker/report.tsx:122` |
| Offline queue management (sync, clear, retry) | ✓ Working | `worker/uploads.tsx` |
| Upload preview modal | ✓ Working | `worker/uploads.tsx:434` |
| Upload delete with confirmation | ✓ Working | `worker/uploads.tsx:506` |
| Conflict review + correction notes + resubmit | ✓ Working | `worker/uploads.tsx:555` |
| Online/offline banner (toggle for demo) | ✓ Working | `WorkerMobileLayout.tsx:23` |
| Pending sync badge on Uploads nav item | ✓ Working | `WorkerMobileLayout.tsx:68` |
| Worker redirect from non-worker routes | ✓ Working | `App.tsx:83-87` |
| Profile — name, email, sign out | ✓ Working | `worker/profile.tsx` |
| Submit → offline queue → auto-replay → Review Centre | ✓ Working | `offlineQueueStore.ts:282-288` |

---

## Missing Functionality

### Critical Gaps

| Gap | Impact | Canonical Requirement |
|---|---|---|
| **Log Issue button is dead** — no onClick handler on job-detail quick action | Worker cannot report hazards, incidents, or operational blockers from the field | Job Execution — Log issues |
| **Schedule page is a placeholder** — shows job count only; says "calendar view coming in next update" | Workers cannot see their schedule in any structured form | Daily Start — View schedule |
| **Shift end does not queue to offline store** — `shiftStore.endShift()` has explicit `TODO: Add to offline queue` comment but logs only to console; shift time is lost | Shift hours not submitted to Review Centre; timesheet submission is broken | Offline Behaviour — Queue submissions |
| **Report hours hardcoded to 0** — `laborEntries` sets `hours: 0` regardless of shift time; shift data not passed to report | Timesheet entries are financially meaningless (zero hours) | Job Execution — Submit timesheets |
| **No expense submission** — `expenses: []` is hardcoded in report payload; no expense entry UI | Workers cannot log expenses through the app | Job Execution — Submit expenses |
| **No submission history page** — workers have no way to see their previous reports, timesheets, or uploads after submission | Workers cannot track their own history | History — Previous submissions |

### High Gaps

| Gap | Impact |
|---|---|
| **Photo upload from job-detail quick action is broken** — uses `addPendingSync("PhotoUpload")` from the old `workerStore.ts` (module-level state, NOT Zustand persist); this never reaches the offline queue, never syncs to Review Centre, and is lost on refresh | Photos taken from the quick action are lost; upload flow split across two incompatible stores |
| **No Home/Today dashboard** — workers land directly on My Jobs list; no daily start screen with today's focus, shift status, or at-a-glance summary | Workers have no operational home base; no today-awareness |
| **History limited to 3 completed jobs** — `completedJobs.slice(0, 3)` with no pagination or "View All" | Workers with longer history cannot review past work |
| **No job completion workflow** — no "Mark Job Complete" or "End of Day" action that captures shift summary and routes it to Review Centre | Jobs cannot be completed through the worker app; workflow is incomplete |
| **Shift history not persisted** — when a shift ends it is cleared from shiftStore and not written anywhere; `endShift()` logs to console only | Workers cannot see their shift history; hours cannot be reconstructed |
| **Profile page is empty** — shows name, email, and logout only; no performance metrics, no shift history, no document viewer, no certifications | Profile is not a useful operational resource |

### Medium Gaps

| Gap | Impact |
|---|---|
| **Photo upload uses `alert()`** — `handleUploadPhoto` in job-detail calls `alert(isOnline ? "Photo uploaded successfully!" : "Offline mode...")` | Breaks mobile UX; `alert()` is browser-default, not styled; inconsistent with toast pattern used everywhere else |
| **No "today's" date filter on job list** — shows all upcoming jobs sorted by date; no separation of today vs future | Workers cannot quickly identify today's obligations |
| **Worker has no testId attributes** — most worker UI elements lack `data-testid`; existing worker tests use role/text selectors only; 2 tests exist (`worker.spec.ts`, `worker-to-review.spec.ts`) vs 48 PM tests and 40+ per CEO feature | Worker experience is essentially untested by doctrine tests |
| **Split store problem** — `workerStore.ts` and `offlineQueueStore.ts` coexist; `job-detail.tsx` imports from both; photo upload goes to `workerStore`, report goes to `offlineQueueStore` | Confusing dual-store architecture; easy to introduce bugs |
| **No accessibility compliance testing** — no evidence of WCAG review; mobile workers may use assistive technology | Accessibility gap |

### Low Gaps

| Gap | Impact |
|---|---|
| **Offline simulation toggle exposed in production UI** — "Simulate Offline Mode / Simulate Reconnection" button visible in report page header | Debug affordance should not be shown to real workers |
| **No worker-specific RBAC tests** — CEO and PM have explicit RBAC doctrine tests; worker isolation (financial visibility = zero) is assumed but not tested | Regression risk if worker routes change |
| **Mock photo upload has no actual file picker** — upload buttons add metadata objects without any actual file selection UI | Workers cannot attach real photos in the prototype |

---

## UX Friction Points

1. **Worker enters a dead end with Log Issue** — button is prominent in the quick actions grid but does nothing; no toast, no navigation, no feedback.
2. **Schedule page is a trust breaker** — workers expect a real calendar; "coming in next update" visible to demo users and clients.
3. **Photo upload diverges from report upload** — QA photos in the report form work correctly (queued, visible in uploads); "Upload Photo" quick action on job detail uses the wrong store and disappears.
4. **Shift time is disconnected from timesheet** — worker starts a shift, works for 4 hours, ends the shift; report submit page still shows 0 hours. The two systems don't talk to each other.
5. **Submission history inaccessible** — once a report is submitted, the worker has no confirmation page or history to verify it was received.
6. **Profile is a logout page** — workers going to Profile expect to see documents, certifications, performance; they find only their name and a red logout button.

---

## Mobile Usability Concerns

| Concern | Severity |
|---|---|
| Bottom nav has only 4 items; History needs to be accessible | Medium |
| `alert()` dialogs break mobile scroll and UX expectations | High |
| No haptic feedback or animation cues on shift start/end (beyond badge pulse) | Low |
| Schedule placeholder does not degrade gracefully; confusing to workers | High |
| Quick actions grid (3-column) tap targets are adequate on large phones but tight on small screens | Low |
| Report form's offline queue section appears ABOVE the form content — worker sees queue status before the form | Medium (layout priority) |

---

## Offline Workflow Gaps

| Flow | State |
|---|---|
| Queue report when offline | ✓ Working |
| Auto-sync report on reconnect | ✓ Working |
| Retry failed report sync | ✓ Working |
| Queue photo upload from quick action | ❌ Broken (wrong store) |
| Queue shift time when offline | ❌ Not implemented (TODO in shiftStore) |
| Queue issue log when offline | ❌ Issue logging not implemented |
| Queue expense when offline | ❌ Expense logging not implemented |
| Show sync state per item | ✓ Working (uploads.tsx) |

---

## Reporting Workflow Gaps

| Flow | State |
|---|---|
| Submit work summary notes | ✓ Working |
| Log materials used | ✓ Working |
| Log assets used | ✓ Working |
| Attach QA photos / receipts | ✓ Working (mocked) |
| Submit timesheet hours | ❌ Hardcoded to 0; shift not connected |
| Submit expenses | ❌ Not implemented |
| Log issues | ❌ Not implemented |
| Mark job complete | ❌ Not implemented |
| View submission history | ❌ Not implemented |

---

## Completion Workflow Gaps

| Flow | State |
|---|---|
| Start shift (clock in) | ✓ Working |
| End shift (clock out) | ✓ Working (but doesn't queue) |
| Daily progress report | ✓ Working |
| Final completion report | ❌ No separate "job complete" submission type |
| Completion photo documentation | ✓ After-photo in report form |
| Post-submission confirmation | ❌ Navigates back to job detail; no confirmation state |

---

## Architecture Risks

| Risk | Severity | Detail |
|---|---|---|
| **Split store (workerStore + offlineQueueStore)** | High | `job-detail.tsx` imports from both. Photo uploads go to workerStore (module-level, non-persisted, lost on refresh). Reports go to offlineQueueStore (Zustand persist, correct). Divergent data paths will cause confusion and data loss. |
| **shiftStore.endShift() data loss** | High | Shift data is cleared without being passed to the offline queue or review centre. Hours worked are unrecoverable after `endShift()`. This must feed into a timesheet payload. |
| **workerStore.ts is a legacy artifact** | Medium | The original shift implementation (`workerStore.startShift`, `endShift`, `addPendingSync`) is unused in the active flow but still imported by `job-detail.tsx` (`addPendingSync`). It should be removed to prevent confusion. |
| **Worker RBAC isolation not tested** | Medium | Workers should have zero financial visibility. This is enforced by route redirect (`App.tsx:84`) but not verified by doctrine tests. Worker could theoretically navigate to a CEO route via URL manipulation — the route guard depends on the redirect firing, not explicit page-level guards. |
| **Report `laborEntries` hours = 0** | High | Every report submission sends `hours: 0`. When this feeds through to payroll/timesheet normalization in the backend, all labour costs will be zero. Must be fixed before any backend integration. |

---

## Doctrine Compliance Assessment

| Doctrine | Worker App Status |
|---|---|
| **Approval Doctrine** | PASS — `addReviewItem()` places report in `pending` status. No worker action directly creates financial records. |
| **Review Centre Protection** | PASS — Online submission goes to `addReviewItem()`; offline replay goes through `addReviewItemDirect()` with deduplication. Review Centre is the gatekeeper. |
| **Audit Doctrine** | PARTIAL — Online report submission is auditable. Shift end is not auditable (data lost). Issue logging does not exist. |
| **Job Attribution Doctrine** | PASS — All reports carry `jobId`. |
| **Financial Integrity** | PASS (structural) / RISK (data) — Workers see no financial data. But `hours: 0` in every submission is a financial integrity problem waiting to hit the backend. |
| **RBAC — Financial Visibility = Zero** | PASS (structural) — Worker routes contain no revenue, margin, invoice, forecast, or financial fields. Route redirect prevents non-worker routes. |

---

## WK Roadmap — Implementation Recommendations

### WK-2 — Home & Daily Start

**Goal**: Give workers a proper home screen that orientates them at the start of every shift.

**Scope**:
- Add `/worker` or `/worker/home` as the default Worker landing page
- Replace the current redirect from `/worker/*` → `/worker/jobs` with → `/worker/home`
- Home screen content:
  - Today's greeting + date
  - Active shift status (from shiftStore: job name, elapsed time, End Shift CTA)
  - Today's jobs (date-filtered subset of assigned jobs)
  - Pending sync indicator (count from offlineQueueStore)
  - Quick links: My Jobs, Schedule, Uploads
- Add "Home" tab to `WorkerMobileLayout` nav (5th item, or replace an underused one)
- testIds: `worker-home`, `worker-today-jobs`, `worker-active-shift-banner`, `worker-sync-indicator`

**Doctrine impact**: None — read-only view.

---

### WK-3 — Jobs & Submissions

**Goal**: Complete the job execution workflow (Log Issue, Expenses, Timesheet hours, Job Completion).

**Scope**:

1. **Fix Log Issue** — Implement a bottom sheet or modal on the Log Issue quick action button:
   - Issue description (textarea)
   - Priority selector (Low / Medium / High / Emergency)
   - Optional photo attachment (reuse upload mechanism)
   - Submit → `addReviewItem({ type: "issue-log", ... })` with `jobId`, `workerId`
   - Offline: queue via `offlineQueueStore`

2. **Fix Photo Upload quick action** — Remove `addPendingSync("PhotoUpload")` from `workerStore`; replace with an approach that routes through `offlineQueueStore`:
   - On click: add a queue item of type `"worker-report"` with `uploads` containing a mocked photo payload
   - Remove `alert()` — replace with toast
   - Or: navigate to `/worker/jobs/:id/report` and auto-focus the upload section (simpler)

3. **Connect shift time to report** — When a worker starts a report from a job, pre-populate `laborEntries[0].hours` with the elapsed shift time from `shiftStore`:
   - If shift is active for this job: read `elapsedTime` and convert seconds → hours
   - Allow worker to edit the pre-filled hours
   - Display "Shift time: Xh Xm" as a helper

4. **Add Expenses section to report** — Add a simple expense logging section below materials:
   - Description, Category (dropdown), Amount
   - Add/remove items
   - Feed into `expenses: [{ description, category, amount, workerId }]`
   - No financial normalisation — goes to Review Centre as pending

5. **Add "Complete Job" action** — On job detail, add a "Complete Shift & Submit" button (visible only when shift is active):
   - Ends the shift (captures total time)
   - Navigates to report form pre-populated with shift time
   - Sets `reportType: "job-complete"` (or similar) on submission

6. **Consolidate stores** — Remove the `addPendingSync` import from `workerStore` in `job-detail.tsx`; the workerStore photo upload path should be deleted. Document the canonical flow: all submissions → offlineQueueStore.

7. **Fix shiftStore.endShift()** — When endShift is called, capture the final shift payload and add it to offlineQueueStore as a `"timesheet"` type item with full metadata (jobId, workerId, startTime, endTime, totalSeconds).

**Doctrine impact**: All submissions still route to Review Centre. No financial records created. Issue logs and expenses join the pending queue.

---

### WK-4 — Offline & Sync

**Goal**: Close all offline workflow gaps and provide clear sync state to workers.

**Scope**:

1. **End-to-end offline test for all submission types** — shift timesheet, issue log, expense, photo upload should all queue, replay, and surface in Review Centre.

2. **Remove debug affordance from production UI** — Move "Simulate Offline Mode / Simulate Reconnection" button out of the production report page header; this should be a developer-only toggle (accessible via URL param or CEO debug panel, not visible to workers).

3. **Offline indicator on all CTAs** — When offline, all action buttons (Log Issue, Upload Photo, Submit Report, Complete Job) should show an orange badge or "offline: will sync" suffix, consistent with the existing offline banner.

4. **Sync status in Home screen** — Surface total pending item count and last-sync time on the Home screen.

5. **"Pending sync" visual on individual job cards** — If a job has pending queue items, show a badge on its card on the My Jobs list.

**Doctrine impact**: None — offline queue is already doctrine-safe.

---

### WK-5 — History & Performance

**Goal**: Give workers visibility into their own submission history and performance metrics.

**Scope**:

1. **Submission History page** — Add `/worker/history` route:
   - Filter by: All / Reports / Timesheets / Expenses / Issues
   - Each item shows: type, job name, submitted date, sync status
   - Read from: `offlineQueueStore.queue` (for pending/queued) + a worker-scoped view of `reviewItems` from the main store (for submitted)
   - No financial data (no amounts, no costs, no approval outcomes beyond "approved/rejected")
   - Add to bottom nav: replace "Schedule" (which is placeholder) or use a tab within My Jobs

2. **Worker Profile — enrich**:
   - Add to `/worker/profile`: total shifts this week/month (from shiftStore history, or mocked)
   - Documents tab: worker's own certification documents from `Worker.documents`
   - Performance summary: jobs assigned, reports submitted, pending items (mocked KPIs)

3. **Post-submission confirmation screen** — After report submit, instead of navigating back to job detail, show a brief confirmation card ("Report received — pending review") with a "Back to My Jobs" button.

**Doctrine impact**: History is read-only informational. Workers see only their own submissions. No financial data visible.

---

### WK-6 — Mobile Polish

**Goal**: Elevate the mobile UX to production quality.

**Scope**:

1. **Add `data-testid` attributes to all worker UI elements** — Full testId audit:
   - `worker-jobs-list`, `worker-job-card-{id}`, `worker-open-job-btn`
   - `worker-start-shift-btn`, `worker-end-shift-btn`, `worker-shift-timer`
   - `worker-upload-photo-btn`, `worker-log-issue-btn`, `worker-submit-report-btn`
   - `worker-report-notes`, `worker-report-submit-btn`
   - `worker-schedule-calendar`, `worker-history-list`
   - `worker-profile-name`, `worker-signout-btn`
   - `worker-nav-home`, `worker-nav-jobs`, `worker-nav-schedule`, `worker-nav-uploads`, `worker-nav-profile`

2. **Schedule page implementation** — Replace the placeholder with a basic calendar:
   - Week view (7-day strip of date pills)
   - Job cards for each day (date-matched from assignedWorkerIds-filtered jobs)
   - Active day highlighting
   - No financial data (dates, job title, client, location, status only)
   - Tapping a day's job card navigates to `/worker/jobs/:id`

3. **Replace `alert()` with toast** — `job-detail.tsx:handleUploadPhoto` uses `alert()`. Replace with `useToast()`.

4. **Accessibility pass** — Ensure all interactive elements have `aria-label`; shift timer output has `role="timer"`; nav items have `aria-current="page"`.

**Doctrine impact**: None — UI polish only.

---

### WK-7 — Validation Audit

**Goal**: Verify the completed WK-2 through WK-6 implementation against doctrine, RBAC, and the canonical requirements.

**Scope**:

1. **RBAC validation** — Confirm:
   - Worker sees zero financial data on all routes
   - Worker cannot access `/`, `/review`, `/finance`, `/intelligence`, or any CEO/PM route
   - Worker can only see jobs assigned to them (`assignedWorkerIds.includes(user?.id)`)
   - Issue logs and expenses go to Review Centre with `pending` status

2. **Doctrine validation** — Confirm:
   - All submissions route through Review Centre
   - No worker action directly creates approved financial records
   - Shift timesheet in Review Centre carries `hours > 0`
   - Offline queue replay correctly feeds Review Centre

3. **Playwright doctrine tests** — Write `tests/doctrine/worker-experience.spec.ts`:
   - WK-RBAC-01 through WK-RBAC-10: financial visibility isolation
   - WK-FLOW-01 through WK-FLOW-10: submission flow end-to-end
   - WK-OFFLINE-01 through WK-OFFLINE-05: offline queue scenarios
   - WK-HIST-01 through WK-HIST-05: history visibility

4. **Build validation** — `npm run build` must pass.

---

## Existing Tests — Current State

| File | Tests | Coverage |
|---|---|---|
| `tests/worker.spec.ts` | 1 | Basic report submit (role/text selectors, no testIds) |
| `tests/doctrine/worker-to-review.spec.ts` | 1 | Worker → sign out → CEO → Review Centre flow |
| `tests/helpers/worker.ts` | — | `submitBasicReport` + `submitMaterialReport` helpers |

**Total worker-specific tests: 2**
**Comparison**: PM workstream (48 tests), each CEO feature (40+ tests).

The worker experience is essentially untested by doctrine standards.

---

## Files to Inspect Before WK-2

| File | Purpose |
|---|---|
| `client/src/pages/worker/jobs.tsx` | My Jobs — add today filter, history pagination |
| `client/src/pages/worker/job-detail.tsx` | Log Issue, photo upload fix, shift→report connection |
| `client/src/pages/worker/report.tsx` | Hours pre-fill, expenses section |
| `client/src/pages/worker/schedule.tsx` | Replace placeholder |
| `client/src/pages/worker/profile.tsx` | Add documents, performance, history summary |
| `client/src/components/WorkerMobileLayout.tsx` | Add Home nav item |
| `client/src/lib/shiftStore.ts` | Fix endShift → offlineQueueStore |
| `client/src/lib/workerStore.ts` | Remove or deprecate |
| `client/src/lib/offlineQueueStore.ts` | Add timesheet + issue-log + expense types |
| `client/src/App.tsx` | Add /worker/home route, /worker/history route |

---

## Files Created in WK-1

- `docs/handoffs/wk-1-worker-audit-2026-06-21.md` — this document

---

## Verification Results

- Build: Not run (audit-only phase — no code changes)
- Playwright: Not run (audit-only phase)
- Code review: Full read of all 6 worker pages + 3 supporting stores + routing + existing tests

---

## Doctrine Compliance

| Doctrine | WK-1 Phase |
|---|---|
| **Approval Doctrine** | Preserved — no code changes |
| **Review Centre Protection** | Preserved — no code changes |
| **Audit Doctrine** | Preserved — no code changes |
| **Job Attribution** | Preserved — no code changes |
| **Financial Integrity** | Preserved — no code changes |
| **RBAC** | Preserved — no code changes |

---

## Outstanding Work

1. **Owner**: Confirm WK-2 → WK-7 plan is approved before implementation begins.
2. **Next session**: Implement WK-2 (Home & Daily Start) on this branch.
3. **Note**: All WK-2 through WK-7 work remains on `feature/workstream-c-worker-experience`.
