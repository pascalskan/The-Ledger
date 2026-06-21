# PM-5 — Reviews & Approvals — Handoff

Date: 2026-06-21
Branch: `feature/pm-2-navigation-dashboard`
Status: **COMPLETE — build green; awaiting owner test run.**

---

## Summary

PM-5 delivers a purpose-built PM Review Operations Centre replacing the pre-UX-7 stub PM was receiving. PMs now get operational review management: a prioritised pending queue with inline quick actions (Approve, Request Correction, Escalate), a Corrected tab showing items awaiting worker resubmission, a Rejected tab, and an Escalated tab that is read-only (PM has visibility; CEO retains governance authority over escalated items).

The CEO Review Operations Centre (UX-7 intelligence tabs: Briefing, Dashboard, Prioritisation, Recommendations, Analytics) is completely unchanged. The review-detail page gains a PM Review Workspace (Worker Info, Job Context, Review Timeline) and hides all financial data panels from PM.

---

## PM-1 Audit Findings Resolved

| Finding | Severity | Status |
|---|---|---|
| PM review experience remains the pre-UX-7 experience | High | **RESOLVED** |
| No operational prioritisation in PM review queue | High | **RESOLVED** |
| No quick review workflow | Medium | **RESOLVED** |
| No escalation visibility (PM loses track after escalation) | Medium | **RESOLVED** |
| No approval workload visibility | Medium | **RESOLVED** |

---

## Files Changed

### Modified

- **`client/src/lib/mockData.ts`**:
  - Added `"escalated"` to `ReviewItem.status` union
  - Added optional `escalatedAt?: string`, `escalatedBy?: string`, `correctionNotes?: string` fields to `ReviewItem` interface
  - Added 5 demo PM review items for `dj-pm-active-1` and `dj-boiler-room-2`:
    - `rev-pm-1` (pending, 3h ago) — End of Day Report
    - `rev-pm-2` (pending, 52h ago — **overdue**) — Zone B Duct Installation photo
    - `rev-pm-3` (needs-correction) — Materials Request with correction note
    - `rev-pm-4` (escalated) — Asbestos Survey, escalated to CEO
    - `rev-pm-5` (pending) — Site Preparation Report for dj-boiler-room-2

- **`client/src/pages/review.tsx`**:
  - Added imports: `isProjectManager`, `TriangleAlert`, `ArrowRight`, `ClipboardCheck`, `ShieldAlert`
  - Added `roles`, `updateReviewItem` to `useStore()` destructure
  - Added state: `pmTab`, `correctionItemId`, `correctionNote`
  - Changed `isPM` from inline roleId check to canonical `isProjectManager(user, roles)`
  - Added PM early return with full PM Review Centre:
    - Metrics strip: `pm-review-metric-pending`, `pm-review-metric-overdue`, `pm-review-metric-corrections`, `pm-review-metric-escalations`
    - 4-tab Tabs component: `pm-review-tab-pending`, `pm-review-tab-corrected`, `pm-review-tab-rejected`, `pm-review-tab-escalated`
    - Pending tab: prioritised queue (`pm-review-queue`) — Critical/Attention/Normal visual tiers; `PendingItemCard` inline component
    - Quick Approve: `pm-review-quick-approve-${id}` → calls `updateReviewItem(id, { status: "approved" })`
    - Request Correction: `pm-review-request-correction-${id}` → inline form → `updateReviewItem(id, { status: "needs-correction", correctionNotes })`
    - Escalate: `pm-review-escalate-${id}` → `updateReviewItem(id, { status: "escalated", escalatedAt, escalatedBy })`
    - Open Detail: `pm-review-open-detail-${id}` → navigates to `/review/${jobId}`
    - Corrected tab: `pm-review-corrected-list`, `pm-review-corrected-item-${id}`
    - Rejected tab: `pm-review-rejected-list`, `pm-review-rejected-item-${id}`
    - Escalated tab: `pm-review-escalated-list`, `pm-review-escalated-item-${id}` (read-only — no approve/reject/correction buttons)
  - CEO path: unchanged

- **`client/src/pages/review-detail.tsx`**:
  - Added imports: `isProjectManager`, `Users`, `Briefcase`
  - Added `roles` to `useStore()` destructure
  - Added `const userIsPM = isProjectManager(user, roles)` after hooks
  - Financial Impact card (`review-detail-financial`): now wrapped in `{!userIsPM && (...)}` — hidden for PM
  - Priority intelligence panel (`review-detail-priority-panel`): now behind `{!userIsPM && topPriorityReview && (...)}` — hidden for PM (contains financial exposure score)
  - `ReviewDecisionPanel`: now `{!userIsPM && <ReviewDecisionPanel jobId={job.id} />}` — hidden for PM (shows revenue/margin/exposure)
  - `JobRecommendationPanel`: now `{!userIsPM && <JobRecommendationPanel jobId={job.id} />}` — hidden for PM (shows financial impact)
  - Added PM Review Workspace (visible only when `userIsPM`):
    - `pm-review-workspace` wrapper — 3-column grid
    - `pm-review-worker-info` — submitter names, pending count
    - `pm-review-job-context` — status, priority, crew size, total items
    - `pm-review-timeline` — counts per status stage (Submitted/Pending/Correction/Escalated/Approved/Rejected)

- **`client/src/pages/job-detail.tsx`**:
  - Fixed `submitter.name` bug → `submitter.firstName + ' ' + submitter.lastName` (Worker type has no `.name`)
  - Added `escalated` badge style to pm-workspace-reviews status badges
  - Added `escalatedReviews` count to review summary strip
  - "Open Review Queue" now navigates to `/review/${job.id}` (job-specific); added "All Reviews" secondary button to `/review`
  - testId `pm-workspace-open-review-queue` retained (now goes to job-specific review)
  - Added `pm-workspace-open-all-reviews` testId

- **`client/src/pages/dashboard.tsx`**:
  - `PMDashboard` now derives `pmJobIds` set and scopes `pendingReviews`, `correctedReviews`, `overdueReviews` to PM's assigned jobs only (previously unscoped — would show all company reviews)
  - Added `escalatedReviews` (filtered to PM's jobs)
  - Added Escalated row in `pm-dashboard-reviews` card with `pm-dashboard-escalations-badge` testId

### Created

- `tests/doctrine/pm-rev.spec.ts` — 7 doctrine tests (PM-REV-01 to PM-REV-07)
- `docs/handoffs/pm-5-reviews-approvals-handoff-2026-06-21.md` — this document

---

## Architecture Decisions

### PM early return strategy
Consistent with PM-2/3/4: PM gets a full early return rendering the PM Review Centre; the CEO path (review.tsx lines below the early return) is completely unchanged. No conditional rendering inside the shared path.

### Quick Approve doctrine compliance
Quick Approve calls `updateReviewItem(id, { status: "approved" })` — the exact same Zustand store path as the approve button in review-detail.tsx. The approval doctrine is preserved: the action goes through the same store mutation, audit log, and financial normalization trigger. Nothing is bypassed.

### Escalation model
`"escalated"` added to `ReviewItem.status` union. Escalation sets `status: "escalated"`, `escalatedAt`, `escalatedBy`. The PM Escalated tab shows these items read-only — PM has visibility but no approve/reject capability. The CEO's full queue still shows escalated items (as they appear in `reviewItems` without filter by status) and can action them.

### Financial data hidden from PM in review-detail
Four financial exposure surfaces hidden behind `!userIsPM`:
1. `review-detail-financial` card (GBP exposure blocked)
2. Priority intelligence panel (financial exposure score, contributing factors with revenue data)
3. `ReviewDecisionPanel` (revenue generated/delayed/blocked, job margin, job exposure)
4. `JobRecommendationPanel` (financial impact per recommendation)

PM sees: Age, Priority level (Critical/High/Standard — no money), Approval History count, and the PM Review Workspace (Worker Info, Job Context, Review Timeline). These are operational, not financial.

### Dashboard reviews scoping bug fix
The PM Dashboard `reviewItems` aggregations were previously unscoped — they counted reviews across ALL company jobs. PM-5 fixes this by computing `pmJobIds` and filtering `pendingReviews`, `correctedReviews`, `overdueReviews`, and the new `escalatedReviews` to PM's jobs only. This is a doctrine compliance fix (PM must not see review activity on other PM's jobs).

---

## Review Priority Tiers

| Tier | Trigger | Visual |
|---|---|---|
| Critical | Pending > 48 hours | Rose card background, Critical badge |
| Attention | Pending > 24 hours OR needs-correction | Amber card background, Attention badge |
| Normal | < 24 hours, standard | Default card, Normal badge |

Items in the pending queue are sorted Critical → Attention → Normal.

---

## PM Review Centre — testId Reference

| Section | testId |
|---|---|
| Page wrapper | `pm-review-page` |
| Metrics strip | `pm-review-metrics` |
| Pending count | `pm-review-metric-pending` |
| Overdue count | `pm-review-metric-overdue` |
| Corrections count | `pm-review-metric-corrections` |
| Escalations count | `pm-review-metric-escalations` |
| Tabs container | `pm-review-tabs` |
| Pending tab trigger | `pm-review-tab-pending` |
| Corrected tab trigger | `pm-review-tab-corrected` |
| Rejected tab trigger | `pm-review-tab-rejected` |
| Escalated tab trigger | `pm-review-tab-escalated` |
| Pending queue | `pm-review-queue` |
| Individual pending item | `pm-review-item-${id}` |
| Quick Approve | `pm-review-quick-approve-${id}` |
| Request Correction | `pm-review-request-correction-${id}` |
| Correction form | `pm-review-correction-form-${id}` |
| Correction input | `pm-review-correction-input-${id}` |
| Correction submit | `pm-review-correction-submit-${id}` |
| Escalate | `pm-review-escalate-${id}` |
| Open Detail | `pm-review-open-detail-${id}` |
| Corrected list | `pm-review-corrected-list` |
| Corrected item | `pm-review-corrected-item-${id}` |
| Escalated list | `pm-review-escalated-list` |
| Escalated item | `pm-review-escalated-item-${id}` |

---

## Tests Added

`tests/doctrine/pm-rev.spec.ts` — 7 doctrine tests:

| ID | Description |
|---|---|
| PM-REV-01 | PM review page shows PM Review Centre, not CEO intelligence tabs; all 4 metric KPIs visible |
| PM-REV-02 | Quick Approve calls store; item removed from pending queue after approval |
| PM-REV-03 | Request Correction opens inline form; submit moves item to Corrected tab |
| PM-REV-04 | Escalated tab shows rev-pm-4 (pre-escalated demo item); no approve/reject buttons on escalated items |
| PM-REV-05 | PM review detail: Financial Impact card hidden; Decision/Priority/Recommendation panels hidden; PM Workspace visible; no financial text in workspace |
| PM-REV-06 | CEO sees all 5 UX-7 intelligence tabs; CEO review detail shows Financial Impact card |
| PM-REV-07 | PM review detail: Worker Info, Job Context, Timeline sections visible; Approve/Reject buttons present (PM is authorized to approve) |

---

## Verification Results

- Build (`npm run build`): **PASS** (13.16s)
- Playwright: **Pending owner local run**

---

## Doctrine Compliance

| Doctrine | Finding |
|---|---|
| **Approval** | PASS — Quick Approve routes through `updateReviewItem` (same path as detail page). No bypass. PM can approve, escalate, or request correction. Cannot approve others' escalations. |
| **Financial Integrity** | PASS — Four financial surfaces hidden for PM in review-detail; no revenue, margin, exposure, or normalization data in PM queue or workspace |
| **RBAC** | PASS — PM sees only reviews for jobs where `managerId === user.id`; CEO sees all; escalated items visible to PM (read-only) and CEO (actionable) |
| **Review Centre Protection** | PASS — All approvals still flow through Review Centre → `updateReviewItem`. No direct approval path. |
| **Audit** | PASS — `updateReviewItem` writes audit log on every status change (existing behaviour preserved) |

---

## Outstanding Work / PM-6 Recommendations

1. **Owner:** run the full Playwright suite locally and confirm all PM-REV tests pass.
2. **PM-6** — suggested scope:
   - PM Clients page (`/clients`) — scope to clients of PM's assigned jobs
   - PM Notifications (`/notifications`) — scope to events on PM's assigned jobs (currently shows all company events)
   - PM Expenses page — scope to expenses submitted against PM's jobs
3. **PM-7** — Full PM validation pass:
   - End-to-end PM workflow test (login → dashboard → jobs → review → approve → confirm)
   - Confirm zero financial data leakage across all PM routes
   - Final RBAC audit before PR merge
