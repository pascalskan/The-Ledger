import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',

  // Serialize all tests — the app uses a shared in-memory store at localhost:5000.
  // Parallel execution causes tests to corrupt each other's mock state.
  workers: 1,

  // Complex multi-user flows (Worker → sign out → CEO → approve → verify) take
  // 15–25s with three 800ms auth delays, multiple page navigations, and approval
  // processing. 30s was too tight; 60s gives comfortable headroom.
  timeout: 60000,

  use: {
    baseURL: 'http://localhost:5000',
    headless: false,
    // Viewport must be tall enough for the sidebar Sign Out button (y ≈ 859)
    viewport: { width: 1280, height: 960 },
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    trace: 'retain-on-failure',
    // Per-action timeout — individual locator waits. Default is no limit (uses test timeout).
    // Set to 15s so a single stuck locator doesn't silently eat the whole test budget.
    actionTimeout: 15000,
  },

  reporter: [
    ['list'],
    ['html']
  ]
});
