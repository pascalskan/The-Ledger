import { test } from '@playwright/test';
const KEY = 'ledger-auth-email';
const R: [string, string][] = [['demo.ceo@example.com','/jobs/dj-pm-active-1'],['demo.pm@example.com','/review'],
  ['demo.ceo@example.com', '/finance?tab=accounting&sub=providers'], ['demo.ceo@example.com', '/intelligence?tab=reports'], ['demo.ceo@example.com', '/intelligence?tab=exports'],
  ['demo.ceo@example.com', '/intelligence?tab=activity'], ['demo.ceo@example.com', '/automation-governance'], ['demo.pm@example.com', '/review']];
test('probe', async ({ browser }) => {
  for (const [email, url] of R) {
    const ctx = await browser.newContext({ viewport: { width: 375, height: 812 } });
    const page = await ctx.newPage();
    await page.goto('/auth'); await page.evaluate(([k, e]) => localStorage.setItem(k, e), [KEY, email]);
    await page.goto(url); await page.waitForTimeout(1800);
    const off = await page.evaluate(() => {
      const vw = 376;
      const els = [...document.querySelectorAll('main *')].filter(e => { const r = e.getBoundingClientRect(); return r.width > 0 && r.right > vw + 2; });
      // keep only deepest-ish: elements none of whose children are also overflowing
      const leaf = els.filter(e => ![...e.children].some(c => els.includes(c)));
      return leaf.slice(0, 4).map(e => `${e.tagName}.${String((e as HTMLElement).className).slice(0, 80)} w=${Math.round(e.getBoundingClientRect().width)} r=${Math.round(e.getBoundingClientRect().right)} | parent: ${String((e.parentElement as HTMLElement)?.className).slice(0, 70)}`);
    });
    console.log(url, '\n  ' + off.join('\n  '));
    await ctx.close();
  }
});
