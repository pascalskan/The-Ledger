# WK-2 — Home & Daily Start — Handoff

Date: 2026-06-21
Branch: `feature/workstream-c-worker-experience`
Status: **COMPLETE — Build PASS. Pending owner Playwright run.**

---

## Current State Summary

**Roadmap position**: Workstream C — Worker Experience, Phase WK-2 of 7

**Build**: PASS (12.59s, 0 TypeScript errors)
**Playwright**: Pending owner local run (per project workflow)
**Branch**: `feature/workstream-c-worker-experience` (no new branch — single workstream)

**WK-1 audit findings addressed**:
- ✓ No meaningful daily-start experience → replaced with Home screen
- ✓ Worker workflow fragmented → single hub now answers: shift? jobs? actions? attention?
- ✓ Profile page minimal → enriched with role, company, job count
- ✓ Redirect to `/worker/jobs` → now redirects to `/worker/home`

---

## WK-2 Deliverables

### Created

#### `client/src/pages/worker/home.tsx`
New Worker Home screen — the Daily Start hub. Five sections:

1. **Shift Status Banner** (`data-testid="worker-shift-status"`)
   - **Not On Shift** (`worker-not-on-shift-banner`): clock icon, "Not On Shift" label, next-job name + "Go to Job & Start Shift" CTA (`worker-home-start-job-btn`) → `/worker/jobs/:firstJobId`
   - **On Shift** (`worker-on-shift-banner`): pulsing green dot, "Shift Active" / "Shift Paused" label, live `HH:MM:SS` timer (`worker-shift-timer`), current job name, "Open Current Job" button (`worker-home-open-job-btn`) → `/worker/jobs/:currentJobId`
   - Uses `useShiftStore()` — no new store logic

2. **Today & Upcoming** (`data-testid="worker-home-jobs"`)
   - Assigned jobs only (filtered `assignedWorkerIds.includes(user.id)`, Active + Planned, sorted by startAt)
   - Each card: job title, address, start date/time, status badge, "On Shift" badge if current
   - Each card has an **"Open Job" button** (`worker-home-open-job-${job.id}`) → `/worker/jobs/:id`
   - "Open Job" button text preserves backward compatibility with existing `worker.spec.ts` and `worker-to-review.spec.ts` test helpers

3. **Quick Actions** (`data-testid="worker-quick-actions"`)
   - **Not on shift**: My Jobs (`worker-qa-my-jobs`), Schedule (`worker-qa-schedule`), Uploads (`worker-qa-uploads`), Profile (`worker-qa-profile`)
   - **On shift**: Submit Report (`worker-qa-submit-report`), Open Job (`worker-qa-open-job`), Uploads, Profile
   - Uploads shows pending count when `pendingItems + failedItems > 0`

4. **Attention Required** (`data-testid="worker-attention-required"`) — **always rendered**
   - All clear → green checkmark + "All clear — nothing requires attention." message
   - Offline active → red WifiOff card
   - Sync failures → red card, tap-to-retry → `/worker/uploads`
   - Upload conflicts → amber card, review-required → `/worker/uploads`
   - Pending items → blue RefreshCw card, "Will upload automatically"
   - Uses `useOfflineQueueStore()` — no store changes

5. **Recent Activity** (`data-testid="worker-recent-activity"`)
   - Shows last 3 `synced` queue items, sorted newest-first
   - Empty state: "No recent submissions. Start your shift to begin logging work."

#### `tests/doctrine/worker-home.spec.ts`
7 doctrine tests (WK2-01 through WK2-07):

| Test | Assertion |
|---|---|
| WK2-01 | Shift status section visible; not-on-shift banner on fresh login |
| WK2-02 | Assigned jobs visible; first card has "Open Job" button (backwards-compat) |
| WK2-03 | Quick actions section visible; My Jobs, Schedule, Uploads, Profile present |
| WK2-04 | Attention Required section always rendered; shows "all clear" on fresh login |
| WK2-05 | Recent activity section always rendered |
| WK2-06 | CEO not redirected to worker; `nav-finance-hub` visible; `worker-home` not visible |
| WK2-07 | PM not redirected to worker; `nav-pm-overview` visible; `worker-home` not visible |

---

### Modified

#### `client/src/App.tsx`
- Added `import WorkerHomePage from "@/pages/worker/home"` (line 37)
- Added `/worker/home` route (before existing worker routes, same role guard as all worker routes: `["Worker", "CEO", "Project Manager"]`)
- Changed worker redirect: `setLocation("/worker/jobs")` → `setLocation("/worker/home")` (line 85)

**Backward compatibility note**: The `loginAsWorker` helper in `tests/helpers/login.ts` waits for `page.waitForURL(/worker/)`, which matches `/worker/home` — no helper change required. The existing `worker.spec.ts` and `worker-to-review.spec.ts` use `getByRole('button', { name: /Open Job/i }).first().click()` — the home page job cards render "Open Job" buttons, so these tests land on the home page and still find the selector. ✓

#### `client/src/components/WorkerMobileLayout.tsx`
- Added `Home` to lucide-react imports
- Added `{ icon: Home, label: "Home", path: "/worker/home" }` as the first nav item
- Nav is now 5 items: Home · My Jobs · Schedule · Uploads · Profile

#### `client/src/pages/worker/profile.tsx`
- Replaced minimal card (name/email/logout) with enriched identity card:
  - Avatar (dark circle + initial)
  - Name + email
  - Role row: "Field Worker" (derived from roleIds containing "worker")
  - Company row: `DEMO_COMPANY_ID` → "Demo Operations Ltd"; falls back to `companyId` string
  - Jobs row: `X active · Y total` count
- Sign Out button preserved at `data-testid="btn-sign-out"` (unchanged — existing tests rely on this)

---

## Architecture Notes

### Shift Status — State Derivation

```
activeShift === null                    → "Not On Shift"
activeShift !== null && isRunning       → "Shift Active"
activeShift !== null && !isRunning      → "Shift Paused"
```

`elapsedTime` from `shiftStore` drives the live timer. No new state introduced.

### Store Usage

| Store | Used in home.tsx | Purpose |
|---|---|---|
| `useShiftStore()` | ✓ | `activeShift`, `elapsedTime` — shift status + timer |
| `useOfflineQueueStore()` | ✓ | `queue`, `isOffline` — attention items + recent activity |
| `useStore()` + `useAuth()` | ✓ | `jobs`, `user` — job list + avatar |

No store modifications. Reads only.

### Doctrine Compliance

| Doctrine | Status |
|---|---|
| **Approval Doctrine** | PASS — Home screen is read-only; no submissions triggered |
| **Review Centre Protection** | PASS — Quick Actions link to existing pages that route through Review Centre |
| **Audit Doctrine** | PASS — No new actions; no audit trail changes |
| **Job Attribution** | PASS — Job cards display only jobs attributed to this worker |
| **Financial Integrity** | PASS — No financial data rendered anywhere on the Home screen |
| **RBAC** | PASS — Job list filtered by `assignedWorkerIds.includes(user.id)`; CEO/PM confirmed not redirected |

### Financial Visibility — PASS

The Home screen renders:
- Job title, location address, start date/time, status
- Shift timer (elapsed time in HH:MM:SS — operational time, not financial)
- Queue item count (operational, not financial)

Zero financial fields (no revenue, margin, invoice, forecast, expense amounts, cost rates, or GBP/£ values).

---

## Existing Test Compatibility

The two pre-existing worker tests are unchanged and remain compatible:

**`tests/worker.spec.ts`** (`loginAsWorker` → `submitBasicReport`)
- Lands on `/worker/home` (redirect change)
- `submitBasicReport` calls `getByRole('button', { name: /Open Job/i }).first()` → finds first "Open Job" button in the job cards section ✓
- Continues to job detail → report → save

**`tests/doctrine/worker-to-review.spec.ts`** (Worker → CEO flow)
- Lands on `/worker/home` (redirect change)
- `getByRole('button', { name: /Open Job/i }).first()` → finds first job card's "Open Job" button ✓
- Full flow proceeds to Review Centre

---

## Files Changed in WK-2

### Created

| File | Purpose |
|---|---|
| `client/src/pages/worker/home.tsx` | Worker Home / Daily Start screen |
| `tests/doctrine/worker-home.spec.ts` | WK2-01 through WK2-07 doctrine tests |
| `docs/handoffs/wk-2-home-daily-start-handoff-2026-06-21.md` | This document |

### Modified

| File | Change |
|---|---|
| `client/src/App.tsx` | Added WorkerHomePage import + `/worker/home` route + redirect change |
| `client/src/components/WorkerMobileLayout.tsx` | Added Home nav item (5 items total) |
| `client/src/pages/worker/profile.tsx` | Enriched identity card (role, company, job count) |

---

## Verification Results

| Check | Result |
|---|---|
| `npm run build` | **PASS** (12.59s, 0 errors) |
| TypeScript | PASS — all imports resolve, no type errors |
| Playwright | Pending owner local run |

---

## Outstanding Work

1. **Owner**: Run Playwright locally; confirm WK2-01 through WK2-07 pass and existing worker tests still pass
2. **Next session**: WK-3 — Jobs & Submissions (Log Issue, expense logging, shift→hours connection, photo upload fix, store consolidation)

---

## WK-3 Recommendations (from WK-1 Audit)

Priority fixes for WK-3:

1. **Log Issue** — Implement bottom sheet on dead "Log Issue" button in job-detail; submit as `type: "issue-log"` review item
2. **Fix photo upload quick action** — Remove `workerStore.addPendingSync("PhotoUpload")` path; route through `offlineQueueStore` instead; remove `alert()`
3. **Connect shift time to report hours** — When report is opened from an active-shift job, pre-populate `laborEntries[0].hours` from `shiftStore.elapsedTime`
4. **Add Expenses section** — Simple expense rows (description, category, amount) in report form; feed into `expenses: []` payload
5. **Fix shiftStore.endShift()** — Capture final shift payload and add to `offlineQueueStore` as timesheet submission; remove console-only logging
6. **Retire workerStore.ts** legacy paths — Remove `addPendingSync` import from job-detail; document canonical flow (all submissions → offlineQueueStore)
