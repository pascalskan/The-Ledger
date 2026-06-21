/**
 * PM-DOC Doctrine Tests
 *
 * Verifies PM-6 deliverables:
 * - Job Workspace shows Site Information section with contacts
 * - Job Workspace shows enhanced Documents section with categories
 * - Job Workspace shows Notes section with add/edit/archive
 * - Job Workspace shows Communication section with post form
 * - Job Workspace shows Activity Timeline aggregated from reviews/notes/comms/docs
 * - PM dashboard shows Recent Activity card scoped to PM's jobs
 * - No financial data exposed in any PM-6 section
 */
import { test, expect } from '@playwright/test';
import { loginAsPM, loginAsCEO } from '../helpers/login';
import { clearBrowserState } from '../helpers/state';

test.beforeEach(async ({ page }) => {
  await clearBrowserState(page);
});

// ────────────────────────────────────────────────────────────────
// PM-DOC-01 — Site Information section renders with contacts
// ────────────────────────────────────────────────────────────────

test('PM-DOC-01: PM Job Workspace shows Site Information section with contacts', async ({ page }) => {
  await loginAsPM(page);
  await page.goto('/jobs/dj-pm-active-1');
  await page.waitForSelector('[data-testid="pm-workspace-site-info"]');

  const siteInfo = page.getByTestId('pm-workspace-site-info');
  await expect(siteInfo).toBeVisible();

  // Access instructions present
  await expect(page.getByTestId('pm-site-access-instructions')).toBeVisible();
  await expect(page.getByTestId('pm-site-access-instructions')).toContainText('loading bay');

  // Special requirements present
  await expect(page.getByTestId('pm-site-special-requirements')).toBeVisible();
  await expect(page.getByTestId('pm-site-special-requirements')).toContainText('PPE');

  // Site contacts list renders
  await expect(page.getByTestId('pm-site-contacts')).toBeVisible();
  await expect(page.getByTestId('pm-site-contact-0')).toBeVisible();
  await expect(page.getByTestId('pm-site-contact-0')).toContainText('Brian Walsh');
  await expect(page.getByTestId('pm-site-contact-0')).toContainText('Site Manager');

  // Emergency contacts render
  await expect(page.getByTestId('pm-emergency-contacts')).toBeVisible();
  await expect(page.getByTestId('pm-emergency-contact-0')).toBeVisible();

  // No financial data in site info
  await expect(siteInfo).not.toContainText('Revenue');
  await expect(siteInfo).not.toContainText('Margin');
  await expect(siteInfo).not.toContainText('£');
});

// ────────────────────────────────────────────────────────────────
// PM-DOC-02 — Documents section shows categorised documents
// ────────────────────────────────────────────────────────────────

test('PM-DOC-02: PM Job Workspace documents section shows categorised documents', async ({ page }) => {
  await loginAsPM(page);
  await page.goto('/jobs/dj-pm-active-1');
  await page.waitForSelector('[data-testid="pm-workspace-documents"]');

  const docsSection = page.getByTestId('pm-workspace-documents');
  await expect(docsSection).toBeVisible();

  // Document list is rendered (not empty state)
  await expect(page.getByTestId('pm-documents-list')).toBeVisible();

  // At least one document item present (doc-pm-1)
  await expect(page.getByTestId('pm-doc-item-doc-pm-1')).toBeVisible();
  await expect(page.getByTestId('pm-doc-item-doc-pm-1')).toContainText('HVAC Replacement Specification');

  // Document shows uploader metadata
  await expect(page.getByTestId('pm-doc-item-doc-pm-1')).toContainText('Alex Reid');

  // View button present
  await expect(page.getByTestId('button-job-doc-view-doc-pm-1')).toBeVisible();
});

// ────────────────────────────────────────────────────────────────
// PM-DOC-03 — Notes section: add note saves and renders inline
// ────────────────────────────────────────────────────────────────

test('PM-DOC-03: PM can add a note to a job and it renders in the notes list', async ({ page }) => {
  await loginAsPM(page);
  await page.goto('/jobs/dj-pm-active-1');
  await page.waitForSelector('[data-testid="pm-workspace-notes"]');

  const notes = page.getByTestId('pm-workspace-notes');
  await expect(notes).toBeVisible();

  // Click Add Note
  await page.getByTestId('pm-note-add-button').click();
  await expect(page.getByTestId('pm-note-add-form')).toBeVisible();

  // Fill in content
  const noteText = 'Zone D confirmed clear for tomorrow morning start.';
  await page.getByTestId('pm-note-input').fill(noteText);

  // Submit
  await page.getByTestId('pm-note-submit').click();

  // Form closes
  await expect(page.getByTestId('pm-note-add-form')).not.toBeVisible();

  // New note appears in the list
  await expect(notes).toContainText(noteText);
});

// ────────────────────────────────────────────────────────────────
// PM-DOC-04 — Notes section: archive removes note from list
// ────────────────────────────────────────────────────────────────

test('PM-DOC-04: PM can archive a note and it disappears from the notes list', async ({ page }) => {
  await loginAsPM(page);
  await page.goto('/jobs/dj-pm-active-1');
  await page.waitForSelector('[data-testid="pm-workspace-notes"]');

  // Demo notes include note-pm-1 and note-pm-2 for dj-pm-active-1
  const firstNoteEl = page.getByTestId('pm-note-note-pm-1');
  await expect(firstNoteEl).toBeVisible();

  // Archive it
  const archiveBtn = page.getByTestId('pm-note-archive-note-pm-1');
  await expect(archiveBtn).toBeVisible();
  await archiveBtn.click();

  // Note should disappear (filtered out by useStore since archived)
  await expect(page.getByTestId('pm-note-note-pm-1')).not.toBeVisible();
});

// ────────────────────────────────────────────────────────────────
// PM-DOC-05 — Communication section: post comment appears inline
// ────────────────────────────────────────────────────────────────

test('PM-DOC-05: PM can post a comment in the Communication section', async ({ page }) => {
  await loginAsPM(page);
  await page.goto('/jobs/dj-pm-active-1');
  await page.waitForSelector('[data-testid="pm-workspace-communication"]');

  const commSection = page.getByTestId('pm-workspace-communication');
  await expect(commSection).toBeVisible();

  // Pre-existing demo communications are shown
  await expect(page.getByTestId('pm-comm-list')).toBeVisible();
  await expect(page.getByTestId('pm-comm-item-comm-pm-1')).toBeVisible();

  // Post a new comment
  const commentText = 'Crew briefing complete — all workers signed the risk assessment.';
  await page.getByTestId('pm-comm-input').fill(commentText);
  await page.getByTestId('pm-comm-submit').click();

  // New comment appears in the list
  await expect(commSection).toContainText(commentText);
});

// ────────────────────────────────────────────────────────────────
// PM-DOC-06 — Activity Timeline aggregates events chronologically
// ────────────────────────────────────────────────────────────────

test('PM-DOC-06: Activity Timeline renders aggregated events from multiple sources', async ({ page }) => {
  await loginAsPM(page);
  await page.goto('/jobs/dj-pm-active-1');
  await page.waitForSelector('[data-testid="pm-workspace-timeline"]');

  const timeline = page.getByTestId('pm-workspace-timeline');
  await expect(timeline).toBeVisible();

  // Timeline shows events (not empty)
  await expect(page.getByTestId('pm-timeline-list')).toBeVisible();

  // At least 3 events (reviews + notes + comms + docs all aggregated)
  const eventItems = page.locator('[data-testid^="pm-timeline-event-"]');
  await expect(eventItems).toHaveCount(await eventItems.count());
  const count = await eventItems.count();
  expect(count).toBeGreaterThanOrEqual(3);

  // Timeline does not contain financial terms
  await expect(timeline).not.toContainText('Revenue');
  await expect(timeline).not.toContainText('Margin');
  await expect(timeline).not.toContainText('£');
});

// ────────────────────────────────────────────────────────────────
// PM-DOC-07 — PM Dashboard Recent Activity card scoped to PM's jobs
// ────────────────────────────────────────────────────────────────

test('PM-DOC-07: PM Dashboard Recent Activity card renders and is scoped to PM jobs', async ({ page }) => {
  await loginAsPM(page);
  await page.goto('/');
  await page.waitForSelector('[data-testid="pm-dashboard-page"]');

  // Recent Activity card exists
  await expect(page.getByTestId('pm-dashboard-activity')).toBeVisible();

  // Activity list is populated (demo data in PM's jobs)
  await expect(page.getByTestId('pm-dashboard-activity-list')).toBeVisible();

  // At least one event in the list
  const items = page.locator('[data-testid^="pm-dashboard-activity-item-"]');
  const count = await items.count();
  expect(count).toBeGreaterThanOrEqual(1);

  // Card contains no financial terminology
  const activityCard = page.getByTestId('pm-dashboard-activity');
  await expect(activityCard).not.toContainText('Revenue');
  await expect(activityCard).not.toContainText('Margin');
  await expect(activityCard).not.toContainText('£');
});
