import { defineConfig } from '@playwright/test';

// Separate config so the audit never runs as part of the 955-test doctrine suite.
// Run:  npx playwright test -c tests/audit/playwright.audit.config.ts
export default defineConfig({
  testDir: '.',
  testMatch: '**/*.audit.ts',
  workers: 1,
  timeout: 180000,
  reporter: [['list']],
  use: {
    baseURL: 'http://localhost:5000',
    headless: true,
    channel: 'chrome',
    viewport: { width: 1440, height: 900 },
    actionTimeout: 20000,
    acceptDownloads: true,
  },
});
