import { test, expect, Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const OUT = path.join(__dirname, 'out');
fs.mkdirSync(OUT, { recursive: true });
const KEY = 'ledger-auth-email';

async function as(page: Page, email: string) {
  await page.goto('/auth');
  await page.evaluate(([k, e]) => localStorage.setItem(k, e), [KEY, email]);
}
async function open(page: Page, url: string) {
  await page.goto(url);
  await page.waitForLoadState('networkidle').catch(() => {});
  await page.waitForTimeout(1200);
}

const CEO_ROUTES = [
  '/', '/review', '/review/dj-pm-active-1', '/operations?tab=jobs', '/operations?tab=schedule',
  '/operations?tab=workers', '/operations?tab=clients', '/operations?tab=map', '/operations?tab=stock',
  '/jobs/dj-pm-active-1', '/clients/dc1', '/workers/dw2', '/equipment/de1', '/assets/asset-1', '/stock/stock-1',
  '/locations/loc-2', '/client-requests', '/job-intelligence', '/expenses',
  '/finance?tab=overview', '/finance?tab=records', '/finance?tab=invoicing', '/finance?tab=payroll',
  '/finance?tab=accounting&sub=sync', '/finance?tab=accounting&sub=reconciliation',
  '/finance?tab=accounting&sub=exceptions', '/finance?tab=accounting&sub=providers',
  '/intelligence?tab=overview', '/intelligence?tab=analytics', '/intelligence?tab=reports',
  '/intelligence?tab=exports', '/intelligence?tab=activity', '/event-monitor',
  '/automations', '/workflows', '/automation-governance', '/roles', '/audit', '/settings',
];
const PM_ROUTES = ['/', '/jobs', '/review', '/schedule', '/workers', '/clients', '/client-requests', '/map', '/equipment', '/notifications'];
const WORKER_ROUTES = ['/worker/home', '/worker/jobs', '/worker/jobs/dj-showcase-maint-1', '/worker/jobs/dj-showcase-maint-1/report', '/worker/schedule', '/worker/uploads', '/worker/history', '/worker/profile'];

type Row = { role: string; url: string; violations: any[] };

async function scan(page: Page, role: string, url: string, rows: Row[]) {
  await open(page, url);
  const r = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice'])
    .analyze();
  rows.push({
    role, url,
    violations: r.violations.map(v => ({
      id: v.id, impact: v.impact, help: v.help, nodes: v.nodes.length,
      sample: v.nodes.slice(0, 3).map(n => ({ target: n.target.join(' '), html: n.html.slice(0, 140), summary: n.failureSummary?.split('\n').slice(0, 2).join(' ').slice(0, 200) })),
    })),
  });
}

test('axe: CEO routes', async ({ page }) => {
  const rows: Row[] = [];
  await as(page, 'demo.ceo@example.com');
  for (const u of CEO_ROUTES) await scan(page, 'CEO', u, rows);
  fs.writeFileSync(path.join(OUT, 'axe-ceo.json'), JSON.stringify(rows, null, 1));
});

test('axe: PM routes', async ({ page }) => {
  const rows: Row[] = [];
  await as(page, 'demo.pm@example.com');
  for (const u of PM_ROUTES) await scan(page, 'PM', u, rows);
  fs.writeFileSync(path.join(OUT, 'axe-pm.json'), JSON.stringify(rows, null, 1));
});

test('axe: Worker routes', async ({ page }) => {
  const rows: Row[] = [];
  await as(page, 'demo.worker@example.com');
  for (const u of WORKER_ROUTES) await scan(page, 'Worker', u, rows);
  fs.writeFileSync(path.join(OUT, 'axe-worker.json'), JSON.stringify(rows, null, 1));
});

test('axe: Auth + Portal', async ({ page }) => {
  const rows: Row[] = [];
  await page.goto('/auth');
  await page.evaluate(k => localStorage.removeItem(k), KEY);
  await scan(page, 'Anon', '/auth', rows);
  await scan(page, 'Anon', '/portal', rows);
  await page.getByPlaceholder('name@example.com').fill('portal@hsslimited.co.uk');
  await page.getByRole('button', { name: /Sign In/i }).click();
  await page.waitForTimeout(1500);
  for (const u of ['/portal', '/portal/jobs', '/portal/jobs/dj-pm-active-1', '/portal/sites', '/portal/documents', '/portal/invoices', '/portal/invoices/dinv-kex-1', '/portal/requests', '/portal/messages', '/portal/notifications']) {
    await scan(page, 'Client', u, rows);
  }
  fs.writeFileSync(path.join(OUT, 'axe-portal.json'), JSON.stringify(rows, null, 1));
});

// ───────────────────────── Keyboard ─────────────────────────
async function describeFocus(page: Page) {
  return page.evaluate(() => {
    const e = document.activeElement as HTMLElement | null;
    if (!e || e === document.body) return { tag: 'BODY', name: '', visible: false };
    const cs = getComputedStyle(e);
    const outline = cs.outlineStyle !== 'none' && parseFloat(cs.outlineWidth) > 0;
    const shadow = cs.boxShadow && cs.boxShadow !== 'none';
    const r = e.getBoundingClientRect();
    return {
      tag: e.tagName, role: e.getAttribute('role') || '',
      name: (e.getAttribute('aria-label') || e.innerText || (e as HTMLInputElement).placeholder || e.title || '').trim().slice(0, 40),
      visible: outline || !!shadow,
      inViewport: r.top >= 0 && r.bottom <= innerHeight + 2 && r.width > 0,
    };
  });
}

async function tabWalk(page: Page, url: string, max = 60) {
  await open(page, url);
  await page.evaluate(() => (document.activeElement as HTMLElement)?.blur?.());
  const stops: any[] = [];
  for (let i = 0; i < max; i++) {
    await page.keyboard.press('Tab');
    stops.push(await describeFocus(page));
  }
  return stops;
}

test('keyboard: tab walk, focus visibility, skip link, reachability', async ({ page }) => {
  await as(page, 'demo.ceo@example.com');
  const report: any = {};
  for (const url of ['/', '/operations?tab=jobs', '/operations?tab=schedule', '/operations?tab=workers', '/review', '/finance?tab=invoicing', '/automations', '/client-requests']) {
    const stops = await tabWalk(page, url);
    const unnamed = stops.filter(s => s.tag !== 'BODY' && !s.name).length;
    const noIndicator = stops.filter(s => s.tag !== 'BODY' && !s.visible).length;
    // first stop should be the skip link
    const firstName = stops[0]?.name;
    // can we reach main content within 15 tabs?
    const mainStopIndex = await page.evaluate(() => 0);
    report[url] = { firstStop: firstName, totalStops: stops.length, unnamedStops: unnamed, stopsWithoutFocusIndicator: noIndicator,
      sample: stops.slice(0, 14).map(s => `${s.tag}:${s.name}${s.visible ? '' : ' [NO RING]'}`) };
  }

  // Reachability of clickable cards via keyboard: count interactive stops that are job cards
  await open(page, '/operations?tab=jobs');
  const cardsFocusable = await page.evaluate(() => {
    const cards = [...document.querySelectorAll('main [class*=cursor-pointer]')].filter(e => /DEMO-JOB/.test((e as HTMLElement).innerText));
    return { cards: cards.length, focusable: cards.filter(c => (c as HTMLElement).tabIndex >= 0 || c.closest('a,button')).length };
  });
  report.jobCardsKeyboard = cardsFocusable;

  await open(page, '/operations?tab=schedule');
  report.scheduleCards = await page.evaluate(() => {
    const cards = [...document.querySelectorAll('main [class*=cursor-pointer]')].filter(e => /hrs/.test((e as HTMLElement).innerText));
    return { cards: cards.length, focusable: cards.filter(c => (c as HTMLElement).tabIndex >= 0 || c.closest('a,button')).length };
  });
  fs.writeFileSync(path.join(OUT, 'keyboard-ceo.json'), JSON.stringify(report, null, 1));
});

test('keyboard: dialog focus trap, Escape, focus return', async ({ page }) => {
  await as(page, 'demo.ceo@example.com');
  const res: any = {};
  const cases: [string, string, RegExp][] = [
    ['/operations?tab=jobs', 'create-job', /Create Job/],
    ['/operations?tab=workers', 'add-worker', /Add Worker/],
    ['/intelligence?tab=reports', 'build-report', /Build Report/],
  ];
  for (const [url, key, label] of cases) {
    await open(page, url);
    const trigger = page.getByRole('button', { name: label }).first();
    await trigger.focus();
    await page.keyboard.press('Enter');
    await page.waitForTimeout(800);
    const dialog = page.getByRole('dialog').first();
    const opened = await dialog.isVisible().catch(() => false);
    let escaped = 0, outside = 0;
    for (let i = 0; i < 40; i++) {
      await page.keyboard.press('Tab');
      const inside = await page.evaluate(() => !!document.activeElement?.closest('[role=dialog]'));
      if (!inside) outside++;
    }
    const focusInitial = opened;
    await page.keyboard.press('Escape');
    await page.waitForTimeout(600);
    const closed = !(await page.getByRole('dialog').first().isVisible().catch(() => false));
    const returned = await page.evaluate(() => ({ tag: document.activeElement?.tagName, txt: (document.activeElement as HTMLElement)?.innerText?.slice(0, 20) }));
    res[key] = { opened: focusInitial, tabsLandingOutsideDialog_of_40: outside, escapeCloses: closed, focusAfterClose: returned };
  }
  // Sidebar: can keyboard user operate the collapse toggle & admin toggle?
  await open(page, '/');
  res.sidebarToggleHasName = await page.evaluate(() => {
    const b = [...document.querySelectorAll('aside button')].find(x => x.querySelector('svg') && !(x as HTMLElement).innerText.trim());
    return b ? (b.getAttribute('aria-label') || b.getAttribute('title') || '(none)') : 'not found';
  });
  fs.writeFileSync(path.join(OUT, 'keyboard-dialogs.json'), JSON.stringify(res, null, 1));
});

test('keyboard: worker banner, tab bar and portal', async ({ page }) => {
  await as(page, 'demo.worker@example.com');
  await open(page, '/worker/home');
  const res: any = {};
  res.offlineBanner = await page.evaluate(() => {
    const b = document.querySelector('[data-testid=worker-offline-banner]') as HTMLElement;
    return { tag: b?.tagName, role: b?.getAttribute('role'), tabIndex: b?.tabIndex };
  });
  const stops = await tabWalk(page, '/worker/home', 25);
  res.workerHomeStops = stops.slice(0, 25).map(s => `${s.tag}:${s.name}${s.visible ? '' : ' [NO RING]'}`);
  fs.writeFileSync(path.join(OUT, 'keyboard-worker.json'), JSON.stringify(res, null, 1));
});

// ───────────────────────── Aria snapshots (screen-reader proxy) ─────────────────────────
test('aria snapshots', async ({ page }) => {
  await as(page, 'demo.ceo@example.com');
  for (const [name, url] of [['command', '/'], ['review', '/review'], ['jobs', '/operations?tab=jobs'], ['stock', '/operations?tab=stock'], ['finance-invoicing', '/finance?tab=invoicing']] as const) {
    await open(page, url);
    const snap = await page.locator('body').ariaSnapshot();
    fs.writeFileSync(path.join(OUT, `aria-${name}.yml`), snap);
  }
  await as(page, 'demo.worker@example.com');
  await open(page, '/worker/home');
  fs.writeFileSync(path.join(OUT, 'aria-worker-home.yml'), await page.locator('body').ariaSnapshot());
});

// ───────────────────────── Downloads ─────────────────────────
test('downloads', async ({ page }) => {
  const res: any = {};
  await as(page, 'demo.ceo@example.com');
  await open(page, '/intelligence?tab=exports');
  const dl = page.getByRole('button', { name: /^Download$/ }).first();
  const p = page.waitForEvent('download', { timeout: 6000 }).catch(() => null);
  await dl.click().catch(() => {});
  const d = await p;
  res.exportDownload = d ? { file: d.suggestedFilename() } : 'no download event';
  res.exportToasts = await page.locator('li').allInnerTexts().catch(() => []);

  await page.goto('/portal');
  await page.evaluate(k => localStorage.removeItem(k), KEY);
  await page.getByPlaceholder('name@example.com').fill('portal@hsslimited.co.uk');
  await page.getByRole('button', { name: /Sign In/i }).click();
  await page.waitForTimeout(1500);
  await page.goto('/portal/invoices/dinv-kex-1');
  await page.waitForTimeout(1500);
  const p2 = page.waitForEvent('download', { timeout: 6000 }).catch(() => null);
  await page.getByRole('button', { name: /Download/ }).click().catch(() => {});
  const d2 = await p2;
  res.portalInvoiceDownload = d2 ? { file: d2.suggestedFilename() } : 'no download event';
  fs.writeFileSync(path.join(OUT, 'downloads.json'), JSON.stringify(res, null, 1));
});
