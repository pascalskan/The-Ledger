import { test, expect, Page } from "@playwright/test";
import { loginAsWorker } from "../helpers/login";
import { clearBrowserState } from "../helpers/state";

// WK-4 — Offline & Sync doctrine tests
// Hardening phase: verifies durability across refresh, replay reliability,
// failure visibility, duplicate-replay prevention, and offline awareness.

const QUEUE_KEY = "ledger-offline-queue";
const DIRECT_REVIEW_KEY = "ledger-direct-review-items";

async function readQueue(page: Page): Promise<any[]> {
  return page.evaluate((key) => {
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    try {
      return JSON.parse(raw)?.state?.queue ?? [];
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

async function goOffline(page: Page) {
  const banner = page.getByTestId("worker-offline-banner");
  if ((await banner.textContent())?.match(/online/i)) await banner.click();
  await expect(banner).toContainText(/offline/i);
}

async function goOnline(page: Page) {
  const banner = page.getByTestId("worker-offline-banner");
  if ((await banner.textContent())?.match(/offline/i)) await banner.click();
  await expect(banner).toContainText(/online/i);
}

async function openFirstJob(page: Page) {
  await page.getByRole("button", { name: /Open Job/i }).first().click();
  await page.waitForURL(/\/worker\/jobs\/[^/]+$/);
}

// Submit an offline report carrying notes (so it queues as pending).
async function submitOfflineReport(page: Page, notes: string) {
  await page.getByRole("button", { name: /Submit Report/i }).click();
  await page.getByRole("textbox", { name: /Describe the work completed/i }).fill(notes);
  await page.getByRole("button", { name: /^Save$/i }).click();
}

test.describe("Worker Offline & Sync (WK-4)", () => {
  test.beforeEach(async ({ page }) => {
    await clearBrowserState(page);
    await loginAsWorker(page);
  });

  // WK4-01 — Report survives refresh
  test("WK4-01: report survives refresh", async ({ page }) => {
    await goOffline(page);
    await openFirstJob(page);
    await submitOfflineReport(page, "Durable report");

    await expect
      .poll(async () => (await readQueue(page)).some((i) => i.payload?.notes === "Durable report"))
      .toBe(true);

    await page.reload();
    expect((await readQueue(page)).some((i) => i.payload?.notes === "Durable report")).toBe(true);
  });

  // WK4-02 — Issue survives refresh
  test("WK4-02: issue survives refresh", async ({ page }) => {
    await goOffline(page);
    await openFirstJob(page);
    await page.getByTestId("worker-log-issue-btn").click();
    await page.getByTestId("worker-issue-text").fill("Durable issue");
    await page.getByTestId("worker-issue-submit-btn").click();

    await expect
      .poll(async () => (await readQueue(page)).some((i) => i.payload?.type === "issue-log"))
      .toBe(true);

    await page.reload();
    expect((await readQueue(page)).some((i) => i.payload?.type === "issue-log")).toBe(true);
  });

  // WK4-03 — Expense survives refresh
  test("WK4-03: expense survives refresh", async ({ page }) => {
    await goOffline(page);
    await openFirstJob(page);
    await page.getByRole("button", { name: /Submit Report/i }).click();
    await page.getByTestId("worker-add-expense-btn").click();
    await page.getByTestId("worker-expense-row").first().locator('input[type="number"]').fill("30");
    await page.getByRole("textbox", { name: /Describe the work completed/i }).fill("Expense durable");
    await page.getByRole("button", { name: /^Save$/i }).click();

    await expect
      .poll(async () => (await readQueue(page)).some((i) => i.payload?.expenses?.length))
      .toBe(true);

    await page.reload();
    expect((await readQueue(page)).some((i) => i.payload?.expenses?.[0]?.amount === 30)).toBe(true);
  });

  // WK4-04 — Upload survives refresh
  test("WK4-04: upload survives refresh", async ({ page }) => {
    await goOffline(page);
    await openFirstJob(page);
    await page.getByTestId("worker-upload-photo-btn").click();

    await expect
      .poll(async () => (await readQueue(page)).some((i) => i.payload?.uploads?.length))
      .toBe(true);

    await page.reload();
    expect((await readQueue(page)).some((i) => i.payload?.uploads?.length)).toBe(true);
  });

  // WK4-05 — Replay succeeds: queue drains to synced on reconnect
  test("WK4-05: replay succeeds", async ({ page }) => {
    await goOffline(page);
    await openFirstJob(page);
    await submitOfflineReport(page, "Replay report");

    await expect
      .poll(async () => {
        const item = (await readQueue(page)).find((i) => i.payload?.notes === "Replay report");
        return item?.syncStatus;
      })
      .toBe("pending");

    await goOnline(page);

    await expect
      .poll(
        async () => {
          const item = (await readQueue(page)).find((i) => i.payload?.notes === "Replay report");
          return item?.syncStatus;
        },
        { timeout: 15000 }
      )
      .toBe("synced");
  });

  // WK4-06 — Failed replay is visible to the worker with a retry affordance.
  // We seed a failed queue item into the persisted store (a replay failure is
  // an external/network condition) and assert the worker-facing surface makes
  // it visible and recoverable — the actual WK-4 deliverable.
  test("WK4-06: failed replay is visible", async ({ page }) => {
    await goOffline(page);
    await openFirstJob(page);
    await submitOfflineReport(page, "Will fail");

    await expect
      .poll(async () => (await readQueue(page)).some((i) => i.payload?.notes === "Will fail"))
      .toBe(true);

    // Mark the queued item as failed in the persisted store, as the replay
    // engine would on a network interruption.
    await page.evaluate((key) => {
      const raw = localStorage.getItem(key);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      parsed.state.queue = parsed.state.queue.map((i: any) =>
        i.payload?.notes === "Will fail"
          ? { ...i, syncStatus: "failed", errorMessage: "Network interruption during sync." }
          : i
      );
      localStorage.setItem(key, JSON.stringify(parsed));
    }, QUEUE_KEY);

    // Stay offline so the seeded failure is not auto-resynced; reload to
    // rehydrate the store from the persisted queue.
    await page.goto("/worker/uploads");

    const failedItem = page
      .getByTestId("worker-queue-item")
      .filter({ has: page.getByTestId("worker-queue-retry-btn") });
    await expect(failedItem.first()).toBeVisible();
    await expect(failedItem.first().getByTestId("worker-queue-item-status")).toContainText(/failed/i);
    await expect(page.getByTestId("worker-queue-retry-btn").first()).toBeVisible();
  });

  // WK4-07 — No duplicate submission creation across repeated replays
  test("WK4-07: no duplicate submission creation", async ({ page }) => {
    await goOffline(page);
    await openFirstJob(page);
    await submitOfflineReport(page, "Idempotent once");

    await goOnline(page);

    // Wait for first replay to deliver to the Review Centre ingress.
    await expect
      .poll(
        async () =>
          (await readDirectReviewItems(page)).filter((r) => r.notes === "Idempotent once").length,
        { timeout: 15000 }
      )
      .toBe(1);

    // Force another sync pass; idempotency must prevent a second ingress.
    await page.goto("/worker/uploads");
    const forceBtn = page.getByTestId("worker-force-sync-btn");
    if (await forceBtn.isVisible().catch(() => false)) {
      await forceBtn.click();
    }
    await page.waitForTimeout(2000);

    expect(
      (await readDirectReviewItems(page)).filter((r) => r.notes === "Idempotent once").length
    ).toBe(1);
  });

  // WK4-08 — Offline indicator is visible to the worker
  test("WK4-08: offline indicator visible", async ({ page }) => {
    await goOffline(page);
    await expect(page.getByTestId("worker-offline-banner")).toContainText(/offline/i);
    // The Uploads surface communicates offline state explicitly.
    await page.goto("/worker/uploads");
    await expect(page.getByTestId("worker-sync-status")).toContainText(/offline/i);
  });

  // WK4-09 — Review Centre path preserved: replayed item lands as pending ingress
  test("WK4-09: Review Centre path preserved", async ({ page }) => {
    await goOffline(page);
    await openFirstJob(page);
    await submitOfflineReport(page, "Review centre preserved");

    await goOnline(page);

    await expect
      .poll(
        async () => {
          const item = (await readDirectReviewItems(page)).find(
            (r) => r.notes === "Review centre preserved"
          );
          return item?.status;
        },
        { timeout: 15000 }
      )
      .toBe("pending");
  });
});
