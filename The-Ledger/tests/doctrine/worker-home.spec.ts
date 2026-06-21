import { test, expect } from "@playwright/test";
import { loginAsWorker, loginAsCEO, loginAsPM } from "../helpers/login";
import { clearBrowserState } from "../helpers/state";

// WK-2 — Worker Home & Daily Start doctrine tests
// Verifies the Home screen renders correctly and that CEO/PM experiences are unchanged.

test.describe("Worker Home Screen (WK-2)", () => {
  test.beforeEach(async ({ page }) => {
    await clearBrowserState(page);
  });

  // WK2-01 — Shift status section is always present
  test("WK2-01: worker home displays shift status", async ({ page }) => {
    await loginAsWorker(page);
    await expect(page.getByTestId("worker-shift-status")).toBeVisible();
    // Fresh login — no shift active; not-on-shift banner should be shown
    await expect(page.getByTestId("worker-not-on-shift-banner")).toBeVisible();
    await expect(page.getByTestId("worker-on-shift-banner")).not.toBeVisible();
  });

  // WK2-02 — Worker sees only assigned jobs (RBAC)
  test("WK2-02: worker home shows assigned jobs only", async ({ page }) => {
    await loginAsWorker(page);
    await expect(page.getByTestId("worker-home-jobs")).toBeVisible();
    // Demo worker (du3) is assigned to Active and Planned jobs — at least one card
    const jobCards = page.locator('[data-testid^="worker-home-job-card-"]');
    await expect(jobCards.first()).toBeVisible();
    // Each card has an Open Job button (required by existing worker test helpers)
    await expect(
      jobCards.first().getByRole("button", { name: /Open Job/i })
    ).toBeVisible();
  });

  // WK2-03 — Quick actions are present and navigable
  test("WK2-03: worker home shows quick actions", async ({ page }) => {
    await loginAsWorker(page);
    await expect(page.getByTestId("worker-quick-actions")).toBeVisible();
    // Not on shift: My Jobs, Schedule, Uploads, Profile actions present
    await expect(page.getByTestId("worker-qa-my-jobs")).toBeVisible();
    await expect(page.getByTestId("worker-qa-schedule")).toBeVisible();
    await expect(page.getByTestId("worker-qa-uploads")).toBeVisible();
    await expect(page.getByTestId("worker-qa-profile")).toBeVisible();
  });

  // WK2-04 — Attention Required section always rendered
  test("WK2-04: worker home shows attention required section", async ({ page }) => {
    await loginAsWorker(page);
    await expect(page.getByTestId("worker-attention-required")).toBeVisible();
    // Fresh login — no pending items; all-clear message should appear
    await expect(page.getByTestId("worker-attention-required")).toContainText(
      /all clear/i
    );
  });

  // WK2-05 — Recent activity section always rendered
  test("WK2-05: worker home shows recent activity section", async ({ page }) => {
    await loginAsWorker(page);
    await expect(page.getByTestId("worker-recent-activity")).toBeVisible();
  });

  // WK2-06 — CEO is not redirected to worker home; CEO experience unchanged
  test("WK2-06: CEO experience is unchanged", async ({ page }) => {
    await loginAsCEO(page);
    // CEO must not land on a worker route
    expect(page.url()).not.toContain("/worker");
    // CEO-only nav item must be visible (Finance Hub)
    await expect(page.getByTestId("nav-finance-hub")).toBeVisible();
    // Worker-specific home must not exist in CEO view
    await expect(page.getByTestId("worker-home")).not.toBeVisible();
  });

  // WK2-07 — PM is not redirected to worker home; PM experience unchanged
  test("WK2-07: PM experience is unchanged", async ({ page }) => {
    await loginAsPM(page);
    // PM must not land on a worker route
    expect(page.url()).not.toContain("/worker");
    // PM nav item must be visible (Overview)
    await expect(page.getByTestId("nav-pm-overview")).toBeVisible();
    // Worker-specific home must not exist in PM view
    await expect(page.getByTestId("worker-home")).not.toBeVisible();
  });
});
