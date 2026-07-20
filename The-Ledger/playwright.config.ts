import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',

  // Parallel execution. This was previously pinned to 1 on the assumption that
  // the shared in-memory store at localhost:5000 would be corrupted by parallel
  // runs. That is not the case: Playwright gives each worker its own isolated
  // browser context, and the mock store is client-side module state (plus
  // localStorage), so it is per-context and does not leak between workers.
  //
  // Verified July 19, 2026: full suite 892/892 passed at --workers=3.
  //
  // If you ever see cross-test interference, reproduce with --workers=1 first
  // to confirm it is parallelism before investigating the code.
  workers: 3,

  // Complex multi-user flows (Worker → sign out → CEO → approve → verify) take
  // 15–25s with three 800ms auth delays, multiple page navigations, and approval
  // processing. 30s was too tight; 60s gives comfortable headroom.
  timeout: 60000,

  use: {
    baseURL: 'http://localhost:5000',
    // Headless by default. Running headed left Chromium processes alive at
    // teardown ("worker-N process did not exit within 300000ms, force-killed"),
    // which added ~10 minutes of wall-clock and would produce a non-zero exit
    // in CI despite every test passing.
    // Use `npx playwright test --headed` when you want to watch a run.
    headless: true,
    // Viewport must be tall enough for the sidebar Sign Out button (y ≈ 859)
    viewport: { width: 1280, height: 960 },
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    trace: 'retain-on-failure',
    // Per-action timeout — individual locator waits. Default is no limit (uses test timeout).
    // Set to 15s so a single stuck locator doesn't silently eat the whole test budget.
    // Raised from 15s. /automations is the heaviest page in the app (11 tabs,
    // many engines) and its tab bar legitimately takes 10-13s to become
    // clickable on an IDLE machine — measured on AS-10. With a 15s budget the
    // 69 `goto('/automations')` -> immediate tab-click sites across 12 spec
    // files sat ~2s from failing, so any machine load tipped them over and they
    // read as flakes. 30s restores headroom and is still well inside the 60s
    // per-test timeout, so a genuinely hung test still fails the test, not the
    // run. The 10-13s render itself is a real performance issue worth tracking
    // separately — this only stops it corrupting the test signal.
    actionTimeout: 30000,
  },

  reporter: [
    ['list'],
    ['html']
  ]
});
