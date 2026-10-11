import { test } from '@playwright/test';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const KEY = 'ledger-auth-email';

const CEO = ['/', '/review', '/operations?tab=jobs', '/operations?tab=schedule', '/operations?tab=workers', '/operations?tab=clients', '/operations?tab=stock',
  '/jobs/dj-pm-active-1', '/clients/dc1', '/client-requests', '/job-intelligence', '/expenses', '/finance?tab=overview', '/finance?tab=records',
  '/finance?tab=invoicing', '/finance?tab=payroll', '/finance?tab=accounting&sub=sync', '/finance?tab=accounting&sub=reconciliation',
  '/finance?tab=accounting&sub=exceptions', '/finance?tab=accounting&sub=providers', '/intelligence?tab=overview', '/intelligence?tab=analytics',
  '/intelligence?tab=reports', '/intelligence?tab=exports', '/intelligence?tab=activity', '/automations', '/workflows', '/automation-governance', '/roles', '/audit', '/settings'];
const PM = ['/', '/jobs', '/review', '/schedule', '/workers', '/clients', '/client-requests'];

for (const [w, h] of [[375, 812], [768, 1024], [955, 800]] as const) {
  test(`overflow @${w}`, async ({ browser }) => {
    const res: Record<string, number> = {};
    for (const [email, routes] of [['demo.ceo@example.com', CEO], ['demo.pm@example.com', PM]] as const) {
      const ctx = await browser.newContext({ viewport: { width: w, height: h } });
      const page = await ctx.newPage();
      await page.goto('/auth');
      await page.evaluate(([k, e]) => localStorage.setItem(k, e), [KEY, email]);
      for (const r of routes) {
        await page.goto(r);
        await page.waitForTimeout(1500);
        const sw = await page.evaluate(() => document.documentElement.scrollWidth);
        if (sw > w + 1) res[`${email.split('.')[1].split('@')[0]} ${r}`] = sw;
      }
      await ctx.close();
    }
    fs.writeFileSync(path.join(__dirname, 'out', `overflow-${w}.json`), JSON.stringify(res, null, 1));
    console.log(`@${w}: ${Object.keys(res).length} overflowing`, JSON.stringify(res));
  });
}
