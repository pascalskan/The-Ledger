import { test, expect, Page } from "@playwright/test";
import { loginAsWorker } from "../helpers/login";
import { clearBrowserState } from "../helpers/state";

// WK-6 — Mobile Polish & UX Hardening tests
// Verifies the Schedule view, alert-free UX, navigation, accessibility,
// empty/error states, and small-screen layout.

const QUEUE_KEY = "ledger-offline-queue";

async function goOffline(page: Page) {
  const banner = page.getByTestId("worker-offline-banner");
  if ((await banner.textContent())?.match(/online/i)) await banner.click();
  await expect(banner).toContainText(/offline/i);
}

test.describe("Worker Mobile Polish (WK-6)", () => {
  test.beforeEach(async ({ page }) => {
    await clearBrowserState(page);
    // Fail any blocking alert() immediately — proves WK6-02 across the journey.
    await page.addInitScript(() => {
      (window as any).alert = () => {
        throw new Error("Blocking alert() must not be used in the worker experience");
      };
    });
    await loginAsWorker(page);
  });

  // WK6-01 — Schedule view is functional (real content, not a placeholder)
  test("WK6-01: schedule view functional", async ({ page }) => {
    await page.getByTestId("worker-nav-schedule").click();
    await expect(page.getByTestId("worker-schedule")).toBeVisible();
    // Placeholder copy must be gone
    await expect(page.getByText(/coming in the next update/i)).toHaveCount(0);
    // Day-grouped jobs render and navigate to job detail
    const day = page.getByTestId("worker-schedule-day").first();
    await expect(day).toBeVisible();
    const jobBtn = page.locator('[data-testid^="worker-schedule-job-"]').first();
    await expect(jobBtn).toBeVisible();
    await jobBtn.click();
    await expect(page).toHaveURL(/\/worker\/jobs\/[^/]+$/);
  });

  // WK6-02 — No blocking alert() across a representative worker journey
  test("WK6-02: no blocking alert usage", async ({ page }) => {
    // Visiting every primary surface would throw if alert() fired (init script).
    for (const id of [
      "worker-nav-jobs",
      "worker-nav-schedule",
      "worker-nav-activity",
      "worker-nav-uploads",
      "worker-nav-profile",
      "worker-nav-home",
    ]) {
      await page.getByTestId(id).click();
    }
    // Exercise the former alert path: open a job and toggle the shift.
    await page.getByRole("button", { name: /Open Job/i }).first().click();
    await page.getByTestId("worker-start-shift-btn").click();
    await page.getByTestId("worker-end-shift-btn").click();
    // Reaching here without a thrown error confirms no alert() fired.
    await expect(page.getByTestId("worker-upload-photo-btn")).toBeVisible();
  });

  // WK6-03 — Navigation remains operational across all destinations
  test("WK6-03: navigation remains operational", async ({ page }) => {
    const routes: [string, string][] = [
      ["worker-nav-jobs", "worker-jobs"],
      ["worker-nav-schedule", "worker-schedule"],
      ["worker-nav-activity", "worker-history"],
      ["worker-nav-uploads", "worker-sync-status"],
      ["worker-nav-profile", "worker-profile-activity-summary"],
      ["worker-nav-home", "worker-home"],
    ];
    for (const [nav, page_id] of routes) {
      await page.getByTestId(nav).click();
      await expect(page.getByTestId(page_id)).toBeVisible();
    }
  });

  // WK6-04 — Accessibility attributes present
  test("WK6-04: accessibility attributes present", async ({ page }) => {
    // Active nav item exposes aria-current
    await expect(page.getByTestId("worker-nav-home")).toHaveAttribute("aria-current", "page");
    // Nav is a labelled landmark
    await expect(page.getByRole("navigation", { name: /worker navigation/i })).toBeVisible();
    // Shift timer announces as a timer
    await page.getByRole("button", { name: /Open Job/i }).first().click();
    await page.getByTestId("worker-start-shift-btn").click();
    await expect(page.getByTestId("worker-shift-timer")).toHaveAttribute("role", "timer");
  });

  // WK6-05 — Empty states render correctly
  test("WK6-05: empty states render", async ({ page }) => {
    // Fresh login → empty offline queue shows the explicit empty state
    await page.getByTestId("worker-nav-uploads").click();
    await expect(page.getByTestId("worker-queue-empty")).toBeVisible();
  });

  // WK6-06 — Error states render correctly
  test("WK6-06: error states render", async ({ page }) => {
    await goOffline(page);
    await page.getByRole("button", { name: /Open Job/i }).first().click();
    await page.getByTestId("worker-upload-photo-btn").click();

    await expect
      .poll(async () =>
        page.evaluate((key) => {
          const raw = localStorage.getItem(key);
          return raw ? JSON.parse(raw)?.state?.queue?.length ?? 0 : 0;
        }, QUEUE_KEY)
      )
      .toBeGreaterThan(0);

    // Seed a failed sync so the error/guidance surface renders.
    await page.evaluate((key) => {
      const parsed = JSON.parse(localStorage.getItem(key)!);
      parsed.state.queue = parsed.state.queue.map((i: any) => ({
        ...i,
        syncStatus: "failed",
        errorMessage: "Network interruption during sync.",
      }));
      localStorage.setItem(key, JSON.stringify(parsed));
    }, QUEUE_KEY);

    await page.goto("/worker/uploads");
    await expect(page.getByTestId("worker-queue-retry-btn").first()).toBeVisible();
    await expect(page.getByText(/your work is still saved/i)).toBeVisible();
  });

  // WK6-07 — Mobile layout remains functional on a small screen
  test("WK6-07: mobile layout functional", async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 640 });
    await page.goto("/worker/home");
    await expect(page.getByTestId("worker-home")).toBeVisible();
    // Bottom nav and all six destinations remain reachable
    await expect(page.getByRole("navigation", { name: /worker navigation/i })).toBeVisible();
    for (const id of [
      "worker-nav-home",
      "worker-nav-jobs",
      "worker-nav-schedule",
      "worker-nav-activity",
      "worker-nav-uploads",
      "worker-nav-profile",
    ]) {
      await expect(page.getByTestId(id)).toBeVisible();
    }
  });
});
