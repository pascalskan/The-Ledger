import { defineConfig } from '@playwright/test';
import base from '../../playwright.config';

// Runs the existing doctrine suite against the installed Chrome (the bundled
// Chromium isn't downloaded on this machine). Same settings otherwise.
export default defineConfig({
  ...base,
  testDir: '..',
  testIgnore: '**/audit/**',
  reporter: [['line']],
  use: { ...(base.use || {}), channel: 'chrome' },
});
