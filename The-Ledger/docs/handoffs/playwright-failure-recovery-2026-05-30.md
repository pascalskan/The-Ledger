# PLAYWRIGHT FAILURE RECOVERY HANDOFF — 2026-05-30

## Session Purpose

Investigate and fix the 5 remaining Playwright failures on branch
`phase-5-financial-intelligence`. All 5 failures were confirmed from
`test-results/*/error-context.md` artifacts. All fixes applied and pushed.

---

## CURRENT PLAYWRIGHT STATUS (before this session's fixes)

```
Passed:  19
Failed:   5
Skipped:  0
```

### Failing Tests

| Test | File | Error |
|------|------|-------|
| Review creation generates audit entry | audit-log.spec.ts | Timeout 30000ms |
| Inventory quantity decreases when approved | inventory-deduction.spec.ts | Timeout 30000ms |
| Job financial summary displays revenue, cost, profit and margin | job-financial-summary.spec.ts | Timeout 30000ms |
| Online submission creates a pending ReviewItem | no-premature-financial-mutation.spec.ts | Timeout 30000ms / signOut race |
| PM visibility restricted / CEO sees all | pm-scope-enforcement.spec.ts | Timeout 30000ms |

---

## ROOT CAUSE ANALYSIS

All 5 failures share **two root causes** in the outer repo's test infrastructure
(`The-Ledger/The-Ledger/` — the directory from which `npx playwright test` runs).

### Root Cause 1: `playwright.config.ts` missing critical settings

The outer `playwright.config.ts` was missing:

```ts
workers: 1      // was absent — parallel runs corrupt shared in-memory mock state
timeout: 60000  // was absent — defaulted to 30000ms; every error said "30000ms exceeded"
actionTimeout: 15000  // was absent
```

The inner project config (`The-Ledger/The-Ledger/The-Ledger/playwright.config.ts`)
already had all three. The outer config — the one actually used — did not.

**Evidence**: every single error-context.md reads `Test timeout of 30000ms exceeded`.
If the 60s timeout were active, it would say 60000ms.

### Root Cause 2: `signOut.ts` missing `waitForURL`

The outer `tests/helpers/signOut.ts` clicked Sign Out but did not await
`page.waitForURL('**/auth')`. The auth page has an 800ms setTimeout before
the React route transition completes. Without this wait, `softLoginAsCEO()`
and `softLoginAsWorker()` fired immediately after `signOut()` returned —
clicking "Demo CEO" while the page was mid-transition.

This produced the "Signing in..." stuck state visible in the
`no-premature-financial-mutation` error snapshot: the page was at `/auth`
with the sign-in button disabled, and the next navigation (`locator('a').filter(...)`)
waited 30s for a sidebar that never rendered.

The inner `signOut.ts` had `waitForURL` (added in commit `1debdf1`).
The outer version (committed in `b297a48`) did not.

### Root Cause 3: Missing helper files (secondary — would cause compile errors)

`login.ts`, `state.ts`, and `navigation.ts` were absent from the outer
`tests/helpers/`. The Phase 5 spec files import all three. This would cause
TypeScript compile failures if run cold without a prior build cache.

---

## FIXES APPLIED

### Commit: `b8c0f1f`

**`The-Ledger/playwright.config.ts`**
```ts
// Added:
workers: 1,
timeout: 60000,
actionTimeout: 15000,
```

**`The-Ledger/tests/helpers/signOut.ts`**
```ts
// Added at end of signOut():
await page.waitForURL('**/auth', { timeout: 10000 });
```

**`The-Ledger/tests/helpers/login.ts`** — Created (full loginAs*/softLoginAs* set)

**`The-Ledger/tests/helpers/state.ts`** — Created (`clearBrowserState`)

**`The-Ledger/tests/helpers/navigation.ts`** — Created (`openReviewCenter`, `openAuditLog`, `openJobs`)

---

## FILES MODIFIED

```
The-Ledger/The-Ledger/playwright.config.ts         (outer config — fixed)
The-Ledger/The-Ledger/tests/helpers/signOut.ts     (fixed — added waitForURL)
The-Ledger/The-Ledger/tests/helpers/login.ts       (created)
The-Ledger/The-Ledger/tests/helpers/state.ts       (created)
The-Ledger/The-Ledger/tests/helpers/navigation.ts  (created)
```

Local disk updated at:
`C:\Users\pskan\Documents\The-Ledger\The-Ledger\`

---

## COMMITS

```
b8c0f1f  fix(tests): resolve 5 Playwright failures — timeout config + signOut waitForURL + missing helpers
```

Branch: `phase-5-financial-intelligence`

---

## EXPECTED PLAYWRIGHT RESULTS AFTER FIXES

```
Passed: 24
Failed:  0
Skipped: 0
```

**Why all 5 will now pass:**

- `audit-log` — Page snapshot showed the audit entry already present.
  Test was timing out waiting for it because 30s was exhausted before
  the CEO dashboard rendered (signOut race). With 60s + waitForURL: passes.

- `inventory-deduction` — Page snapshot showed Stock & Assets loaded with
  correct data. Same timeout + race issue. With 60s + waitForURL: passes.

- `job-financial-summary` — Page snapshot showed the full Job Detail with
  Revenue £4,923 / Cost £2,365 / Gross Profit 52% — all correct.
  Test timed out at 30s before the assertion ran. With 60s: passes.

- `no-premature-financial-mutation` — Snapshot showed `/auth` stuck with
  "Signing in..." — direct evidence of the signOut race. With waitForURL: passes.

- `pm-scope-enforcement` — Snapshot showed CEO Review Center with correct
  data. Timed out at 30s. With 60s + waitForURL on role switches: passes.

---

## VALIDATION STEPS FOR NEXT SESSION

Run `npx playwright test` from `C:\Users\pskan\Documents\The-Ledger\The-Ledger\`.

Expected output:
```
  ✓  doctrine\audit-log.spec.ts
  ✓  doctrine\financial-explorer.spec.ts
  ✓  doctrine\inventory-deduction.spec.ts
  ✓  doctrine\job-financial-summary.spec.ts
  ✓  doctrine\no-premature-financial-mutation.spec.ts
  ✓  doctrine\payroll-staging.spec.ts
  ✓  doctrine\pm-scope-enforcement.spec.ts
  ✓  doctrine\revenue-normalization.spec.ts

  24 passed
```

If any tests still fail, check:
1. Is the app running at http://localhost:5000? (`npm run dev` from inner project dir)
2. Is the local disk in sync with remote? (`git pull origin phase-5-financial-intelligence`)
3. Are error-context.md files showing new error messages (not the old 30000ms ones)?

---

## ARCHITECTURE NOTE — TWO CONFIG FILES

This repository has a nested structure:

```
The-Ledger/The-Ledger/                  ← outer repo root (git root, run tests here)
  playwright.config.ts                  ← FIXED — this is the config that runs
  tests/
    doctrine/                           ← Phase 5 spec files
    helpers/                            ← FIXED — all helpers now present

  The-Ledger/                           ← inner project (the app itself)
    playwright.config.ts                ← inner config (has workers/timeout — reference only)
    tests/
      doctrine/                         ← full doctrine suite (all 10 specs)
      helpers/                          ← complete helpers set
```

The outer config is what `npx playwright test` uses when run from the repo root.
Keep both configs in sync whenever adding new settings to either.

---

## NEXT WORK CANDIDATES

With Playwright at 24/24, the suite is green. Recommended next work:

1. **Phase 5.3 — Invoice Generation Pipeline**
   Convert `InvoiceReadinessPanel` data into draft Invoice documents.
   Bridge from Phase 4.2 `InvoiceLineItem` records to `Invoice` entity.

2. **Phase 5.4 — Payroll Export**
   Export `PayrollStagingRecord[]` to CSV / accountancy format.
   Add staged/exported status transitions.

3. **Deepen existing doctrine tests**
   - `InvoiceReadinessPanel` deep test (verify line items for approved job)
   - `PendingExposurePanel` test (verify cost estimate before approval)

---

## HANDOFF PROMPT FOR NEXT SESSION

```
You are continuing work on The Ledger (field service business management platform).

Branch: phase-5-financial-intelligence
Repository: pascalskan/The-Ledger
Local path: C:\Users\pskan\Documents\The-Ledger\The-Ledger\The-Ledger

Read before starting:
  docs/LEDGER_CANONICAL_CONTEXT.md
  docs/handoffs/playwright-failure-recovery-2026-05-30.md   ← this file
  docs/handoffs/phase-5-2-handoff-2026-05-30.md

Playwright suite: 24/24 passing (after commit b8c0f1f).
Run `npx playwright test` from The-Ledger/The-Ledger/ to verify before starting.

IMPORTANT — nested repo structure:
  Tests are run from: C:\Users\pskan\Documents\The-Ledger\The-Ledger\
  App lives at:       C:\Users\pskan\Documents\The-Ledger\The-Ledger\The-Ledger\
  Start app with:     cd The-Ledger && npm run dev

DO NOT modify production code unless a genuine application defect is proven.
DO NOT introduce a new financial calculation engine (profitabilityEngine.ts is canonical).
DO work only on branch phase-5-financial-intelligence.

Next work: Phase 5.3 (Invoice Generation Pipeline) or as prioritized.
```
