import { test, expect, Page } from "@playwright/test";
import { loginAsWorker } from "../helpers/login";
import { clearBrowserState } from "../helpers/state";

// WK-5 — History & Performance doctrine tests
// Verifies worker self-service visibility (own submissions, statuses, shifts,
// timeline, profile metrics) while preserving RBAC and zero financial exposure.

async function openHistory(page: Page) {
  await page.getByTestId("worker-nav-activity").click();
  await expect(page.getByTestId("worker-history")).toBeVisible();
}

// du3 (Demo Worker) own seeded submissions vs another worker's (dw2) item.
const OWN_ISSUE_TITLE = "Issue Reported — High";
const OTHER_WORKER_TITLE = "End of Day Report — Day 5"; // submitted by dw2

test.describe("Worker History & Performance (WK-5)", () => {
  test.beforeEach(async ({ page }) => {
    await clearBrowserState(page);
    await loginAsWorker(page);
  });

  // WK5-01 — Worker sees their own submissions
  test("WK5-01: worker sees own submissions", async ({ page }) => {
    await openHistory(page);
    const entries = page.getByTestId("worker-history-entry");
    await expect(entries.first()).toBeVisible();
    await expect(page.getByText(OWN_ISSUE_TITLE)).toBeVisible();
  });

  // WK5-02 — Submission statuses display correctly
  test("WK5-02: submission statuses display", async ({ page }) => {
    await openHistory(page);
    await expect(page.getByText("Approved").first()).toBeVisible();
    await expect(page.getByText("Needs changes").first()).toBeVisible();
    // Reviewer correction notes surface for needs-correction items
    await expect(page.getByTestId("worker-history-reviewer-notes").first()).toBeVisible();
  });

  // WK5-03 — Worker sees shift history with hours
  test("WK5-03: worker sees shift history", async ({ page }) => {
    await openHistory(page);
    await page.getByTestId("worker-history-filter-shifts").click();
    await expect(page.getByTestId("worker-shift-history")).toBeVisible();
    const shiftEntries = page.getByTestId("worker-history-entry");
    await expect(shiftEntries.first()).toBeVisible();
    // Each shift entry shows worked hours (operational, e.g. "7h 30m" / "8h 00m")
    await expect(shiftEntries.first().getByText(/\d+h \d+m/)).toBeVisible();
  });

  // WK5-04 — Activity timeline aggregates multiple submission kinds
  test("WK5-04: activity timeline aggregates correctly", async ({ page }) => {
    await openHistory(page);
    // "All" view present and aggregates report + issue + upload kinds
    const kinds = await page
      .getByTestId("worker-history-entry")
      .evaluateAll((els) => els.map((e) => e.getAttribute("data-kind")));
    expect(kinds).toContain("report");
    expect(kinds).toContain("issue");
    expect(kinds).toContain("upload");
  });

  // WK5-05 — Profile metrics display
  test("WK5-05: profile metrics display", async ({ page }) => {
    await page.getByTestId("worker-nav-profile").click();
    await expect(page.getByTestId("worker-profile-activity-summary")).toBeVisible();
    await expect(page.getByTestId("worker-profile-performance")).toBeVisible();
    await expect(page.getByTestId("worker-profile-performance")).toContainText(/Total Hours/i);
  });

  // WK5-06 — No financial visibility on worker history or profile
  test("WK5-06: no financial visibility", async ({ page }) => {
    await openHistory(page);
    const historyText = (await page.getByTestId("worker-history").innerText()).toLowerCase();
    expect(historyText).not.toContain("£");
    expect(historyText).not.toContain("revenue");
    expect(historyText).not.toContain("margin");
    expect(historyText).not.toContain("invoice");

    await page.getByTestId("worker-nav-profile").click();
    const profileText = (await page.getByTestId("worker-profile-performance").innerText()).toLowerCase();
    expect(profileText).not.toContain("£");
    expect(profileText).not.toContain("revenue");
  });

  // WK5-07 — Worker cannot see other workers' data
  test("WK5-07: worker cannot access other worker data", async ({ page }) => {
    await openHistory(page);
    // Another worker's (dw2) submission must never appear in du3's history
    await expect(page.getByText(OTHER_WORKER_TITLE)).toHaveCount(0);
  });
});
