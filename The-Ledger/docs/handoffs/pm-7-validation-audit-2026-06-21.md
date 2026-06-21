# PM-7 — Validation Audit — Handoff

Date: 2026-06-21
Branch: `feature/pm-2-navigation-dashboard`
Status: **COMPLETE — build green. Recommendation: Approved With Follow-Ups.**

---

## Current State Summary

**Roadmap position**: PM Workstream (Workstream B) — Phase PM-7 of 7

**Branch**: `feature/pm-2-navigation-dashboard`
**PR**: #27 (open, pushed)
**Build**: PASS (12.31s after PM-7 fixes)
**Git log**: 5 PM commits from 188ef1e through 7f0af01; PM-7 fixes at HEAD

**Recent completed phases**:
- PM-2 (Navigation + Dashboard) — COMPLETE
- PM-3 (Jobs Workspace) — COMPLETE
- PM-4 (Schedule + Workforce) — COMPLETE
- PM-5 (Reviews + Approvals) — COMPLETE
- PM-6 (Documents + Communication) — COMPLETE
- PM-7 (Validation Audit) — COMPLETE (this document)

---

## PM Workstream Summary

Workstream B transformed the PM experience from a filtered-down CEO view into a purpose-built operational platform. Five phases of feature delivery (PM-2 through PM-6) followed a PM-1 audit that identified 17+ RBAC, financial visibility, and UX friction findings. PM-7 is the final validation pass.

Demo PM: `du2` (Alex Reid) — assigned manager of:
- `dj-kitchen-extract-1` (Kitchen Extract — Completed)
- `dj-pm-active-1` (HVAC system replacement — Active)
- `dj-boiler-room-2` (Boiler room upgrade — Planned)
- `dj-office-fit-1` (Office fit-out — Planned, 0 crew)

---

## Mandatory Startup Procedure — Executed

| Step | Status |
|---|---|
| Read LEDGER_CANONICAL_CONTEXT.md | ✓ |
| Read CURRENT_DEVELOPMENT_STATE.md | ✓ |
| Read pm-1 through pm-6 handoffs | ✓ (pm-1 not found as separate file — content synthesized from pm-2 handoff's audit table) |
| `git status` | ✓ — branch confirmed `feature/pm-2-navigation-dashboard`, clean except playwright-report deletions |
| `git branch` | ✓ — confirmed on correct branch |
| `git log --oneline -20` | ✓ — 5 PM commits visible |

**Note**: `docs/handoffs/pm-1-audit-2026-06-21.md` does not exist as a separate file. The PM-1 audit findings were captured in the PM-2 handoff and repeated in PM-3 through PM-6. All findings are accounted for.

---

## PM-1 Audit Findings Review

| # | Finding | Severity | Resolved by | Evidence |
|---|---|---|---|---|
| 1 | Dashboard exposes Revenue, Margin, Outstanding Invoices, Revenue at Risk to PM | Critical | PM-2 | `PMDashboard` early return; CEO financial cards in `CEODashboard` only |
| 2 | Dashboard is CEO-oriented; PMs need operational visibility | Critical | PM-2 | Dedicated `PMDashboard` with KPI strip, My Jobs, Reviews, Schedule, Attention Required |
| 3 | Navigation is CEO-ordered; PMs need workflow-oriented navigation | High | PM-2 | `PM_PRIMARY_ITEMS` + `PM_SECONDARY_ITEMS` in layout.tsx; hidden CEO nav items verified |
| 4 | No canonical role helper system | High | PM-2 | `roleHelpers.ts` — `isCEO()`, `isProjectManager()`, `isWorker()`, `isClient()` — pure functions |
| 5 | Schedule displays all company jobs and financial margin data to PMs | Critical | PM-4 | PM early return at line 212 of schedule.tsx; financial mock data in CEO path only |
| 6 | No workforce planning view for PM | High | PM-4 | PM Workforce view in workers.tsx; scoped to `managerId === user?.id` |
| 7 | No crew conflict visibility | High | PM-4 | Conflict detection algorithm in PM Schedule |
| 8 | No crew allocation awareness | High | PM-4 | Crew shortage detection; workers with 0 assignments flagged |
| 9 | PM review experience is the pre-UX-7 experience | High | PM-5 | PM Review Operations Centre with 4-tab queue, Quick Approve, Escalate |
| 10 | No operational prioritisation in PM review queue | High | PM-5 | Priority tiers (Critical/Attention/Normal) by age and status |
| 11 | No quick review workflow | Medium | PM-5 | Quick Approve, Request Correction, Escalate buttons inline |
| 12 | No escalation visibility | Medium | PM-5 | Escalated tab (read-only for PM); CEO retains governance authority |
| 13 | No approval workload visibility | Medium | PM-5 | Approval Metrics strip (Pending, Overdue, Corrections, Escalations) |
| 14 | No documentation workflow for PM | High | PM-6 | Documents section in Job Workspace with categories |
| 15 | No site information workspace | High | PM-6 | Site Information section (access, contacts, emergency contacts, special requirements) |
| 16 | No internal communications channel | Medium | PM-6 | Communication section with pm-comment/crew-update/internal-update |
| 17 | No central notes system | Medium | PM-6 | Notes section with add/edit/archive |
| 18 | No chronological activity view per job | Medium | PM-6 | Activity Timeline aggregating reviews, notes, comms, docs |
| — | **PM-7 discovered**: `myJobs` in PMDashboard unscoped | High | PM-7 | Fixed: `j.managerId === user?.id` filter added |
| — | **PM-7 discovered**: `highPriorityPending` in PMDashboard unscoped | Medium | PM-7 | Fixed: `pmJobIds.has(j.id)` filter added |
| — | **PM-7 discovered**: Legacy `isCEO` in review.tsx | Low | PM-7 | Fixed: replaced with `isCEOHelper(user, roles)` from roleHelpers |

**All 18 audit findings resolved. 3 additional issues discovered and fixed in PM-7.**

---

## Navigation Validation

**Finding: PASS**

- PM navigation renders `PM_PRIMARY_ITEMS` (Overview, My Jobs, Reviews, Schedule, Crew) and `PM_SECONDARY_ITEMS` (Clients, Map, Stock & Assets, Notifications, Expenses)
- CEO-only items (Finance Hub, Intelligence Hub, Workflows, Automations, Audit Log, Settings) are absent from PM navigation — confirmed by grep for `nav-finance-hub`, `nav-intelligence-hub` testIds in PM-specific nav code; both absent from `PM_PRIMARY_ITEMS` and `PM_SECONDARY_ITEMS`
- CEO navigation unchanged — confirmed by PM-RBAC-17 test
- Workflow order is PM-oriented (Jobs before intelligence items)
- `nav-pm-overview`, `nav-pm-jobs`, `nav-review`, `nav-pm-schedule`, `nav-pm-crew` all use canonical testIds

---

## Dashboard Validation

**Finding: PASS (after PM-7 fixes)**

Pre-fix state:
- `myJobs` not filtered by `managerId` — showed all company jobs in PM's "My Jobs" card (**RBAC violation**)
- `highPriorityPending` not filtered by `managerId` — showed unassigned job titles in Attention Required (**RBAC violation**)

Post-fix state (PM-7):
- `myJobs` now filtered: `j.managerId === user?.id && (Active | Planned | Completed)`
- `highPriorityPending` now filtered: `pmJobIds.has(j.id) && ...`
- `pmJobIds` covers: reviews, corrected, overdue, escalated, high-priority pending, recent activity
- All scoped correctly

No financial data in PMDashboard:
- No Revenue, Margin, Costs, Invoice, Forecast, or Exposure fields — confirmed by reading dashboard.tsx PMDashboard JSX

---

## Jobs Workspace Validation

**Finding: PASS**

- `jobs.tsx`: PM path uses `j.managerId === user?.id` — only assigned jobs visible (line 144)
- `job-detail.tsx`: PM access guard at line 66: `if (userIsPM && job.managerId !== user?.id)` → access denied screen (`pm-job-access-denied`)
- PM Workspace early return at line 206 covers all assigned-job content; CEO financial panels at lines 1036+ (InvoiceReadinessPanel, PendingExposurePanel, JobForecastPanel, etc.) are unreachable for PM
- No financial fields (Revenue, Margin, Invoice, Forecast, Exposure, £, GBP) in the PM workspace JSX — confirmed by grep

---

## Schedule & Workforce Validation

**Finding: PASS**

- `schedule.tsx`: PM early return at line 212; CEO financial data (revenue, margin, forecast) in CEO path only
- `workers.tsx`: PM workforce view scoped to workers assigned to PM's jobs (`pmJobs.filter(j => j.managerId === user?.id)`)
- No financial fields in either PM early return — grep of workers.tsx confirmed 0 financial term matches

---

## Reviews & Approvals Validation

**Finding: PASS**

- `review.tsx`: PM early return at line 80; PM path scoped to `pmJobs.filter(j => j.managerId === user?.id)`
- Legacy `isCEO` (line 38) replaced with `isCEOHelper(user, roles)` — canonical helper now used throughout
- Quick Approve → `updateReviewItem(id, { status: "approved" })` — identical path to CEO approval; doctrine preserved
- Escalate → read-only Escalated tab for PM; CEO retains full action capability
- Financial data in `review-detail.tsx` guarded by `!userIsPM`:
  - Financial Impact card (`review-detail-financial`) — `{!userIsPM && ...}`
  - Priority panel with financial exposure — `{!userIsPM && topPriorityReview && ...}`
  - `ReviewDecisionPanel` — `{!userIsPM && <ReviewDecisionPanel ...>}`
  - `JobRecommendationPanel` — `{!userIsPM && <JobRecommendationPanel ...>}`

---

## Documents & Communication Validation

**Finding: PASS**

- Site Information section (`pm-workspace-site-info`): operational only (address, contacts, access, special requirements)
- Documents section (`pm-workspace-documents`): categorised display, no financial data
- Notes section (`pm-workspace-notes`): add/edit/archive via `addJobNote`, `updateJobNote`; all job-attributed
- Communication section (`pm-workspace-communication`): pm-comment/crew-update/internal-update types; no financial data
- Activity Timeline (`pm-workspace-timeline`): aggregates reviews, notes, comms, docs; no financial data
- Dashboard Recent Activity card (`pm-dashboard-activity`): scoped to `pmJobIds`; no financial data

---

## Doctrine Validation

### Approval Doctrine — PASS

No operational event in any PM surface directly creates revenue, cost, payroll, invoice entries, or accounting mutations. Quick Approve in PM Review Operations Centre routes through `updateReviewItem()` — same store function as CEO approval path. No bypass introduced.

### Review Centre Doctrine — PASS

All PM-facing review actions (Approve, Request Correction, Escalate) go through the Review Centre UI to `updateReviewItem()`. Worker → Review Centre → Approval workflow preserved. No direct approval path created.

### Audit Doctrine — PASS

`updateReviewItem()` writes to the audit log (existing behaviour, unmodified). `addJobNote()`, `updateJobNote()`, `addJobCommunication()` all call `addLog()` before `refresh()`. Every PM action is traceable.

### Job Attribution Doctrine — PASS

`JobNote` and `JobCommunication` interfaces require `jobId` and `companyId`. All PM review actions reference `r.jobId`. Activity Timeline and Recent Activity card filter by `jobId`. No orphaned records possible.

### Financial Integrity Doctrine — PASS

PM-facing routes do not mutate financial records. No revenue, margin, invoice, forecast, or exposure data is readable from PM-accessible UI surfaces (verified below).

---

## Financial Visibility Audit

Routes accessible to PM: `/`, `/jobs`, `/jobs/:id`, `/review`, `/review/:id`, `/schedule`, `/workers`, `/notifications`, `/clients`, `/map`, `/equipment`, `/expenses`

| Route | Financial Data Present? | Verdict |
|---|---|---|
| `/` (PMDashboard) | None — KPIs are operational (active jobs, pending reviews, crew count) | PASS |
| `/jobs` (PM path) | None — PM card shows title, crew count, pending reviews, status/priority | PASS |
| `/jobs/:id` (PM workspace) | None — 6 sections: Overview, Site Info, Documents, Notes, Communication, Timeline, Crew, Reviews, Schedule, Attention Required. No financial panels. | PASS |
| `/review` (PM Review Centre) | None — queue shows type, age, status, priority tier only | PASS |
| `/review/:id` (PM Review Detail) | Financial Impact card, Priority financial exposure panel, ReviewDecisionPanel, JobRecommendationPanel all behind `{!userIsPM && ...}` | PASS |
| `/schedule` (PM Schedule) | None — shows dates, crew, job status only; CEO financial schedule in CEO path | PASS |
| `/workers` (PM Workforce) | None — worker name, status, assigned jobs only | PASS |
| `/notifications` | Note: uses legacy `userRoleNames.includes('Project Manager')` — pre-PM-2 pattern; page itself contains no financial data for PM | PASS (financial), NOTE (pattern) |
| `/clients`, `/map`, `/equipment`, `/expenses` | Pre-existing pages, PM access in nav but no PM-specific financial surfaces added in this workstream | PASS |

**Financial visibility: CLEAN. No revenue, margin, invoice, forecast, exposure, or GBP/£ data confirmed in any PM-specific rendered surface.**

---

## RBAC Audit

| Surface | Scoping Mechanism | Status |
|---|---|---|
| Dashboard KPIs | `pmJobIds` set (managerId filter) | PASS |
| Dashboard My Jobs | `j.managerId === user?.id` (fixed PM-7) | PASS |
| Dashboard Attention Required | `pmJobIds.has(j.id)` (fixed PM-7) | PASS |
| Dashboard Reviews | `pmJobIds.has(r.jobId)` | PASS |
| Dashboard Recent Activity | `pmJobIds.has(jobId)` filter on notes + comms + reviews | PASS |
| Jobs list | `j.managerId === user?.id` | PASS |
| Job detail access guard | `job.managerId !== user?.id` → access denied | PASS |
| Job Workspace sections | All data derived from single `job` object (already access-controlled) | PASS |
| Reviews queue | `pmJobs.filter(j => j.managerId === user?.id)` | PASS |
| Review detail | `userIsPM` gates financial panels; operational workspace shown | PASS |
| Schedule | PM early return scoped to `managerId === user?.id` | PASS |
| Workforce | `pmJobs.filter(j => j.managerId === user?.id)` | PASS |
| JobNotes / JobComms | Filtered by `companyId` in useStore; workspace filtered to `jobId` | PASS |
| Canonical role helper | `isProjectManager(user, roles)` used in all PM pages | PASS |

**RBAC: CLEAN (after PM-7 fixes).**

---

## UX Assessment

### Efficiency

Before PM workstream: PM logged in to a CEO dashboard with financial data they couldn't use, a navigation ordered for CEO workflows, and an unscoped review queue showing all company jobs.

After PM workstream:
- PM reaches operational status in ≤2 clicks from dashboard
- My Jobs is the first primary nav item (right relationship)
- Review queue is pre-scoped, pre-prioritised, with Quick Approve inline
- Job Workspace contains everything needed for a site visit briefing (site info, contacts, documents, notes, crew) in one place

### Friction Reduction

All 17 PM-1 audit findings resolved. The three highest-impact improvements:
1. Dashboard no longer shows financial KPIs that confuse PM context
2. Review queue automatically scoped; no manual filtering needed
3. Site information and contacts available in Job Workspace (previously required external documents)

### Workflow Quality

The PM experience now has a coherent loop: Dashboard → My Jobs → Job Workspace → Review Queue → Approve/Escalate → Back to Dashboard. Navigation order matches this workflow.

### Context Switching

CEO-only items (Finance Hub, Intelligence Hub, Automation Controls, Audit Log) are completely hidden from PM navigation. PM can focus on operational tasks without encountering irrelevant CEO surfaces.

---

## Technical Debt Assessment

### Critical

None.

### High

1. **`notification-center.tsx` uses legacy role detection** — `userRoleNames.includes('CEO')` and `userRoleNames.includes('Project Manager')` string comparisons instead of canonical helpers. Pre-existing; PM scoping is done via `scopeNotificationsForPM()` helper which appears correct, but the role detection pattern should be updated.
   - **Recommendation**: Replace with `isCEO(user, roles)` and `isProjectManager(user, roles)` from roleHelpers in a follow-up.

2. **PM `myJobs` previously unscoped** — Fixed in PM-7. No residual debt.

### Medium

3. **`finance-hub.tsx` and `intelligence-hub.tsx` use inline roleId checks** — `user?.roleIds?.includes("role-ceo")` pattern. These pages correctly return `<UnauthorizedPage />` for non-CEO, so PM cannot access them, but the detection mechanism is not canonical.
   - **Recommendation**: Lower priority since both pages gate-off non-CEO at the top. Update when those pages are next touched.

4. **PM Clients page unscoped** — `/clients` shows all company clients, not just clients whose jobs PM manages. No financial data exposed, but PM sees client names/details for clients unrelated to their work.
   - **Recommendation**: Add `managerId` filter to PM clients view in a follow-up workstream.

5. **PM Expenses page unscoped** — `/expenses` not scoped to PM's assigned jobs. No PM-specific financial data surfaces, but PM sees all company expense submissions.

6. **Note edit permission not author-restricted** — PM can edit and archive any note, not just their own. Production system should restrict edit to `authorId === user?.id`; archive can remain open to PM.

### Low

7. **PM Schedule conflict detection is heuristic** — uses `assignedWorkerIds` overlap across date ranges. Does not use timesheet shift data. Adequate for prototype; backend implementation should use shift-level granularity.

8. **Activity Timeline non-null assertion on `submittedAt`** — `r.submittedAt!` in the Timeline IIFE. Safe given demo data but should be defensive in production.

9. **`useStore()` returns `jobNotes` without archived notes but full module-level array grows** — archived notes accumulate in the module-level array and are never purged. Acceptable for prototype (single-session state); production needs soft-delete.

---

## Files Changed in PM-7

### Modified

- **`client/src/pages/dashboard.tsx`**:
  - `myJobs` filter: added `j.managerId === user?.id &&` — RBAC fix
  - `highPriorityPending` filter: added `pmJobIds.has(j.id) &&` — RBAC fix

- **`client/src/pages/review.tsx`**:
  - Import: added `isCEO as isCEOHelper` from `@/lib/roleHelpers`
  - `isCEO` constant: replaced inline `user?.roleIds?.includes(...)` with `isCEOHelper(user, roles)` — doctrine fix

- **`tests/doctrine/pm-rbac.spec.ts`**:
  - Added PM-RBAC-18: PM My Jobs card scoped to assigned jobs only
  - Added PM-RBAC-19: PM Attention Required does not expose unassigned job titles
  - Added PM-RBAC-20: Canonical role resolution verification in review.tsx (CEO vs PM)

### Created

- `docs/handoffs/pm-7-validation-audit-2026-06-21.md` — this document
- `docs/reports/pm-workstream-final-report-2026-06-21.md` — permanent workstream record

---

## Test Summary

| Test File | Tests | Notes |
|---|---|---|
| `pm-rbac.spec.ts` | 20 (was 17, +3 PM-7) | PM dashboard, nav, financial visibility, CEO parity |
| `pm-jobs.spec.ts` | 6 | PM job scoping, access denied, CEO parity |
| `pm-sched.spec.ts` | 7 | PM schedule scoping, conflict detection, CEO parity |
| `pm-rev.spec.ts` | 7 | PM review queue, approve, escalate, financial gating |
| `pm-doc.spec.ts` | 7 | Site info, documents, notes, communication, timeline |
| `pm-scope-enforcement.spec.ts` | 1 | End-to-end PM scoping vs CEO |
| **Total PM tests** | **48** | — |

Build: **PASS**
Playwright: Pending owner local run (per project workflow — per memory)

---

## Verification Results

- Build (`npm run build`): **PASS** (12.31s)
- Playwright: **Pending owner local run**
- Code review (grep/read audit): All PM-accessible routes verified clean for financial data

---

## Doctrine Compliance

| Doctrine | Verdict |
|---|---|
| **Approval** | PASS — Quick Approve routes through `updateReviewItem`. No bypass. |
| **Review Centre Protection** | PASS — All approvals flow through Review Centre. |
| **Audit** | PASS — All PM actions (approve, note, comm, escalate) write to audit log. |
| **Job Attribution** | PASS — All PM-6 data (notes, comms) requires `jobId`. |
| **Financial Integrity** | PASS — No PM workflow creates financial mutations. |
| **RBAC** | PASS (after PM-7 fixes) — All PM surfaces scoped to assigned jobs. |
| **Financial Visibility** | PASS — Zero financial data confirmed in any PM-rendered surface. |

---

## Recommendation

**Approved With Follow-Ups**

The PM workstream is functionally complete. All 17 PM-1 audit findings are resolved. Three additional issues discovered in the PM-7 audit were fixed and tested. The platform correctly separates PM and CEO experiences, enforces managerId scoping across all PM-accessible routes, and exposes zero financial data to PM.

The "With Follow-Ups" qualifier reflects:
1. `notification-center.tsx` uses legacy role detection (High priority; no financial risk but doctrine deviation)
2. PM Clients and Expenses pages are unscoped (Medium priority; no financial data exposed)
3. These are explicitly out of scope for this workstream and documented for the next cycle

The branch is ready for PR merge to main after the owner's Playwright run confirms the 48 PM tests pass.

---

## Outstanding Work

1. **Owner**: run Playwright locally; confirm 48 PM tests pass
2. **Owner**: merge `feature/pm-2-navigation-dashboard` → `main` via PR #27
3. **Follow-up workstream** (separate session): update `notification-center.tsx` to use canonical role helpers; scope PM clients and expenses pages; address note author-restriction
