# PHASE 5.3 TEST REPAIR HANDOFF

## Document Details

Date: 2026-05-30
Phase: 5.3 Test Repair — Invoice Pipeline Playwright Tests (COMPLETE)
Branch: phase-5-financial-intelligence
Status: All 6 invoice-pipeline.spec.ts tests verified passing manually via Playwright MCP.
        Full `npx playwright test` run should be executed to confirm 30/30.

---

## Problem Statement

All 6 tests in `tests/doctrine/invoice-pipeline.spec.ts` were failing.

Symptom: After `loginAsCEO(page)`, calling `page.goto("http://localhost:5000/invoice-builder")`
redirected to `/auth` instead of staying on the target page.

---

## Root Cause

The `useAuth` hook in `client/src/lib/mockData.ts` stored `currentUser` as a module-level
JavaScript variable, initialised to `null` on every module evaluation.

`page.goto()` in Playwright triggers a **full browser navigation** — the Vite SPA bundle
is completely re-evaluated. This reset `currentUser` to `null`, causing `ProtectedRoute`
to redirect unauthenticated users to `/auth`.

All previously passing doctrine tests use **SPA link clicks** for navigation (sidebar links,
`page.locator('a')...click()`), which do not cause full reloads. The invoice-pipeline tests
are the only ones that use `page.goto()` for target-page navigation, so they were uniquely
affected.

---

## Fix Applied

**File modified:** `client/src/lib/mockData.ts`

**Two targeted edits:**

### Edit 1 — Auth persistence initialisation (near "State" section)

Before:
```js
let users = [...SEED_USERS];
let currentUser: User | null = null;
```

After:
```js
let users = [...SEED_USERS];

// AUTH PERSISTENCE
const AUTH_STORAGE_KEY = "ledger-auth-email";

function restoreAuthFromStorage(): User | null {
  try {
    const email = localStorage.getItem(AUTH_STORAGE_KEY);
    if (email) return SEED_USERS.find(u => u.email === email) ?? null;
  } catch {
    // localStorage unavailable (SSR / locked) — fail silently
  }
  return null;
}

let currentUser: User | null = restoreAuthFromStorage();
```

### Edit 2 — Persist on login/logout (inside `useAuth` hook)

Before:
```js
const login = (email: string) => {
  const found = SEED_USERS.find(u => u.email === email) || SEED_USERS[0];
  currentUser = found;
  setUser(found);
};
const logout = () => {
  currentUser = null;
  setUser(null);
};
```

After:
```js
const login = (email: string) => {
  const found = SEED_USERS.find(u => u.email === email) || SEED_USERS[0];
  currentUser = found;
  try { localStorage.setItem(AUTH_STORAGE_KEY, found.email); } catch { /* ignore */ }
  setUser(found);
};
const logout = () => {
  currentUser = null;
  try { localStorage.removeItem(AUTH_STORAGE_KEY); } catch { /* ignore */ }
  setUser(null);
};
```

---

## Why This Is Safe

- `clearBrowserState()` in `tests/helpers/state.ts` calls `localStorage.clear()`, which
  removes `ledger-auth-email`. Auth is correctly reset between tests. ✓
- `loginAsCEO()` calls `login(email)` → writes `ledger-auth-email`. ✓
- Subsequent `page.goto()` reloads the module → `restoreAuthFromStorage()` reads the key
  and re-hydrates `currentUser` before React mounts. ✓
- All existing tests are unaffected — they use link clicks (no reload) and their
  `clearBrowserState` correctly clears the key. ✓
- No tests were weakened, bypassed, or deleted. ✓

---

## Verification Results (Playwright MCP, manual run)

All 6 assertions verified directly:

| Test | Assertion | Result |
|------|-----------|--------|
| 1 | Invoice Builder loads, seed draft visible, INV-2026-0001, Draft status, £4,922.75 total | ✅ PASS |
| 2 | Pipeline strip: 1 draft, 0 ready, 0 sent, 0 paid | ✅ PASS |
| 3 | Advance draft → ready; strip updates to 0 draft / 1 ready | ✅ PASS |
| 4 | Full workflow draft → ready → sent → paid; no advance button at paid; 1 paid | ✅ PASS |
| 5 | Financial Explorer Invoice Pipeline tab visible; fe-pipeline-count-draft=1 | ✅ PASS |
| 6 | Job Detail invoice draft panel: INV-2026-0001, Draft status, £4,922.75 total | ✅ PASS |

---

## Action Required

Run the full test suite to confirm no regressions:

```bash
cd C:\Users\pskan\Documents\The-Ledger\The-Ledger\The-Ledger
npx playwright test
```

Expected: 30/30 passing (24 previously passing + 6 now fixed).

Then commit and push:

```bash
git add client/src/lib/mockData.ts docs/handoffs/phase-5-3-test-repair-handoff-2026-05-30.md
git commit -m "fix(5.3): persist auth to localStorage so page.goto() survives reload in Playwright tests"
git push origin phase-5-financial-intelligence
```

---

## Next Phase Candidates

- Phase 5.4 — Payroll Export (CSV export of PayrollStagingRecord[])
- Phase 6 — Accounting Integration (QuickBooks / Xero OAuth + sync)
