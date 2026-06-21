import { test, expect, Page } from "@playwright/test";
import { loginAsWorker } from "../helpers/login";
import { clearBrowserState } from "../helpers/state";

// WK-3 — Jobs & Submissions doctrine tests
// Verifies that every worker action enters the offline queue / Review Centre
// pipeline, survives refresh, and creates no financial record before approval.

const QUEUE_KEY = "ledger-offline-queue";
const DIRECT_REVIEW_KEY = "ledger-direct-review-items";

// Read the persisted offline queue (zustand persist wraps state in { state, version }).
async function readQueue(page: Page): Promise<any[]> {
  return page.evaluate((key) => {
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    try {
      const parsed = JSON.parse(raw);
      return parsed?.state?.queue ?? [];
    } catch {
      return [];
    }
  }, QUEUE_KEY);
}

async function readDirectReviewItems(page: Page): Promise<any[]> {
  return page.evaluate((key) => {
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    try {
      return JSON.parse(raw);
    } catch {
      return [];
    }
  }, DIRECT_REVIEW_KEY);
}

// Toggle the worker into offline mode via the layout banner so submissions
// queue deterministically as "pending" instead of replaying immediately.
async function goOffline(page: Page) {
  const banner = page.getByTestId("worker-offline-banner");
  if ((await banner.textContent())?.match(/online/i)) {
    await banner.click();
  }
  await expect(banner).toContainText(/offline/i);
}

async function goOnline(page: Page) {
  const banner = page.getByTestId("worker-offline-banner");
  if ((await banner.textContent())?.match(/offline/i)) {
    await banner.click();
  }
  await expect(banner).toContainText(/online/i);
}

async function openFirstJob(page: Page) {
  await page.getByRole("button", { name: /Open Job/i }).first().click();
  await page.waitForURL(/\/worker\/jobs\/[^/]+$/);
}

test.describe("Worker Jobs & Submissions (WK-3)", () => {
  test.beforeEach(async ({ page }) => {
    await clearBrowserState(page);
    await loginAsWorker(page);
  });

  // WK3-01 — Log Issue enters the offline queue
  test("WK3-01: log issue enters the queue", async ({ page }) => {
    await goOffline(page);
    await openFirstJob(page);

    await page.getByTestId("worker-log-issue-btn").click();
    await expect(page.getByTestId("worker-log-issue-sheet")).toBeVisible();
    await page.getByTestId("worker-issue-text").fill("Hazard near scaffold access.");
    await page.getByTestId("worker-issue-submit-btn").click();

    await expect
      .poll(async () => (await readQueue(page)).some((i) => i.payload?.type === "issue-log"))
      .toBe(true);
  });

  // WK3-02 — Issue submission survives a hard refresh
  test("WK3-02: issue survives refresh", async ({ page }) => {
    await goOffline(page);
    await openFirstJob(page);

    await page.getByTestId("worker-log-issue-btn").click();
    await page.getByTestId("worker-issue-text").fill("Persisted issue.");
    await page.getByTestId("worker-issue-submit-btn").click();

    await expect
      .poll(async () => (await readQueue(page)).some((i) => i.payload?.type === "issue-log"))
      .toBe(true);

    await page.reload();

    expect((await readQueue(page)).some((i) => i.payload?.type === "issue-log")).toBe(true);
  });

  // WK3-03 — Ending a shift creates a timesheet submission (no data loss)
  test("WK3-03: shift end creates a timesheet submission", async ({ page }) => {
    await goOffline(page);
    await openFirstJob(page);

    await page.getByTestId("worker-start-shift-btn").click();
    await page.getByTestId("worker-end-shift-btn").click();

    await expect
      .poll(async () => (await readQueue(page)).some((i) => i.payload?.type === "timesheet"))
      .toBe(true);
  });

  // WK3-04 — Report hours reflect entered value, never hardcoded zero
  test("WK3-04: report hours populate correctly", async ({ page }) => {
    await goOffline(page);
    await openFirstJob(page);

    await page.getByRole("button", { name: /Submit Report/i }).click();
    await page.getByTestId("worker-report-hours").fill("5");
    await page.getByRole("textbox", { name: /Describe the work completed/i }).fill("Hours test");
    await page.getByRole("button", { name: /^Save$/i }).click();

    await expect
      .poll(async () => {
        const queue = await readQueue(page);
        const report = queue.find((i) => i.payload?.laborEntries?.length);
        return report?.payload?.laborEntries?.[0]?.hours;
      })
      .toBe(5);
  });

  // WK3-05 — Expense submission enters the queue
  test("WK3-05: expense enters the queue", async ({ page }) => {
    await goOffline(page);
    await openFirstJob(page);

    await page.getByRole("button", { name: /Submit Report/i }).click();
    await page.getByTestId("worker-add-expense-btn").click();

    const row = page.getByTestId("worker-expense-row").first();
    await row.locator('input[type="number"]').fill("25");
    await row.locator('input[type="text"]').fill("Parking at site");
    await page.getByRole("textbox", { name: /Describe the work completed/i }).fill("Expense test");
    await page.getByRole("button", { name: /^Save$/i }).click();

    await expect
      .poll(async () => {
        const queue = await readQueue(page);
        const item = queue.find((i) => i.payload?.expenses?.length);
        return item?.payload?.expenses?.[0]?.amount;
      })
      .toBe(25);
  });

  // WK3-06 — Photo upload survives refresh (no longer lost via legacy store)
  test("WK3-06: photo upload survives refresh", async ({ page }) => {
    await goOffline(page);
    await openFirstJob(page);

    await page.getByTestId("worker-upload-photo-btn").click();

    await expect
      .poll(async () => (await readQueue(page)).some((i) => i.payload?.uploads?.length))
      .toBe(true);

    await page.reload();
    expect((await readQueue(page)).some((i) => i.payload?.uploads?.length)).toBe(true);
  });

  // WK3-07 — Offline replay drains the queue once reconnected
  test("WK3-07: offline replay works", async ({ page }) => {
    await goOffline(page);
    await openFirstJob(page);

    await page.getByTestId("worker-log-issue-btn").click();
    await page.getByTestId("worker-issue-text").fill("Replay me.");
    await page.getByTestId("worker-issue-submit-btn").click();

    await expect
      .poll(async () => {
        const item = (await readQueue(page)).find((i) => i.payload?.type === "issue-log");
        return item?.syncStatus;
      })
      .toBe("pending");

    await goOnline(page);

    await expect
      .poll(
        async () => {
          const item = (await readQueue(page)).find((i) => i.payload?.type === "issue-log");
          return item?.syncStatus;
        },
        { timeout: 15000 }
      )
      .toBe("synced");
  });

  // WK3-08 — A replayed submission reaches the Review Centre ingress (persisted)
  test("WK3-08: submission enters the Review Centre path", async ({ page }) => {
    await goOffline(page);
    await openFirstJob(page);

    await page.getByTestId("worker-log-issue-btn").click();
    await page.getByTestId("worker-issue-text").fill("Review centre ingress.");
    await page.getByTestId("worker-issue-submit-btn").click();

    await goOnline(page);

    await expect
      .poll(
        async () => (await readDirectReviewItems(page)).some((r) => r.type === "issue-log"),
        { timeout: 15000 }
      )
      .toBe(true);
  });

  // WK3-09 — No financial mutation before approval: submission stays pending
  test("WK3-09: no financial mutation before approval", async ({ page }) => {
    await goOffline(page);
    await openFirstJob(page);

    await page.getByRole("button", { name: /Submit Report/i }).click();
    await page.getByTestId("worker-add-expense-btn").click();
    const row = page.getByTestId("worker-expense-row").first();
    await row.locator('input[type="number"]').fill("40");
    await page.getByRole("textbox", { name: /Describe the work completed/i }).fill("Pending only");
    await page.getByRole("button", { name: /^Save$/i }).click();

    await expect
      .poll(async () => {
        const item = (await readQueue(page)).find((i) => i.payload?.expenses?.length);
        return item?.payload?.status;
      })
      .toBe("pending");
  });
});
