/**
 * DOCTRINE TEST: Automation Core — Phase 6.0A
 *
 * Tests the three new automation engine files:
 *   - automationEngine.ts
 *   - automationRuleEngine.ts
 *   - automationAuditEngine.ts
 *
 * All tests are Playwright browser-context tests that import
 * the engine modules via the running Vite dev server. Because
 * the engines are pure TypeScript modules with no React/DOM
 * dependencies, we verify them by running logic inside
 * page.evaluate() calls that exercise the module exports,
 * OR by testing the rendered /automations page which now
 * serves as the surface for doctrine validation.
 *
 * Strategy for engine tests:
 *   - Navigate to /automations (existing page, CEO access)
 *   - Use page.evaluate() to dynamically import engine modules
 *     via the Vite-exposed module graph and assert outputs
 *
 * Note: Because Playwright tests run in a real browser against
 * the dev server, we validate engine behaviour through the
 * UI surface and through explicit page.evaluate() dynamic
 * imports of the engine module paths.
 *
 * Target: 13 tests
 */
import { test, expect } from '@playwright/test';
import { loginAsCEO } from '../helpers/login';
import { clearBrowserState } from '../helpers/state';

test.beforeEach(async ({ page }) => {
  await clearBrowserState(page);
});

// ── Automations Page — Basic Access ────────────────────────────────────────────

test('Automation Core: /automations page loads for CEO', async ({ page }) => {
  await loginAsCEO(page);
  await page.goto('/automations');
  await expect(page).toHaveURL(/automations/i);
  await expect(
    page.getByRole('heading', { name: /Automation Centre/i })
  ).toBeVisible();
});

test('Automation Core: CEO can navigate to Automations via sidebar', async ({ page }) => {
  await loginAsCEO(page);
  await page.goto('/');
  const link = page.locator('a').filter({ hasText: /Automations/i }).first();
  await expect(link).toBeVisible();
  await link.click();
  await expect(page).toHaveURL(/automations/i);
});

test('Automation Core: Automations page renders at least one automation rule from seed data', async ({ page }) => {
  await loginAsCEO(page);
  await page.goto('/automations');
  // The Automation Centre renders a rules table from SEED_AUTOMATION_RULES
  await expect(page.getByTestId('aut-rules-table')).toBeVisible();
  await expect(page.getByTestId('aut-rule-row-rule-001')).toBeVisible();
});

test('Automation Core: Execution History tab is present and clickable', async ({ page }) => {
  await loginAsCEO(page);
  await page.goto('/automations');
  const historyTab = page.getByTestId('aut-tab-execution-history');
  await expect(historyTab).toBeVisible();
  await historyTab.click();
  await expect(page.getByTestId('aut-execution-table')).toBeVisible();
});

// ── Engine Validation: Automation Engine Types ──────────────────────────────

test('Automation Engine: SEED_AUTOMATION_RULES contains 6 seed rules', async ({ page }) => {
  await loginAsCEO(page);
  await page.goto('/automations');

  const count = await page.evaluate(async () => {
    const mod = await import('/src/lib/automationEngine.ts');
    return mod.SEED_AUTOMATION_RULES.length;
  });

  expect(count).toBe(6);
});

test('Automation Engine: TRIGGER_CATALOGUE_V1 contains 9 triggers', async ({ page }) => {
  await loginAsCEO(page);
  await page.goto('/automations');

  const count = await page.evaluate(async () => {
    const mod = await import('/src/lib/automationEngine.ts');
    return mod.TRIGGER_CATALOGUE_V1.length;
  });

  expect(count).toBe(9);
});

test('Automation Engine: ACTION_CATALOGUE_V1 contains 8 actions', async ({ page }) => {
  await loginAsCEO(page);
  await page.goto('/automations');

  const count = await page.evaluate(async () => {
    const mod = await import('/src/lib/automationEngine.ts');
    return mod.ACTION_CATALOGUE_V1.length;
  });

  expect(count).toBe(8);
});

test('Automation Engine: getAutomationStatusLabel returns correct label', async ({ page }) => {
  await loginAsCEO(page);
  await page.goto('/automations');

  const label = await page.evaluate(async () => {
    const mod = await import('/src/lib/automationEngine.ts');
    return mod.getAutomationStatusLabel('active');
  });

  expect(label).toBe('Active');
});

test('Automation Engine: getAutomationCategoryLabel returns correct label for FinanciallySensitive', async ({ page }) => {
  await loginAsCEO(page);
  await page.goto('/automations');

  const label = await page.evaluate(async () => {
    const mod = await import('/src/lib/automationEngine.ts');
    return mod.getAutomationCategoryLabel('FinanciallySensitive');
  });

  expect(label).toBe('Financially Sensitive');
});

test('Automation Engine: isForbiddenAction correctly identifies forbidden action names', async ({ page }) => {
  await loginAsCEO(page);
  await page.goto('/automations');

  const results = await page.evaluate(async () => {
    const mod = await import('/src/lib/automationEngine.ts');
    return {
      forbidden: mod.isForbiddenAction('create_approved_invoice'),
      notForbidden: mod.isForbiddenAction('send_notification'),
    };
  });

  expect(results.forbidden).toBe(true);
  expect(results.notForbidden).toBe(false);
});

// ── Rule Engine: Core Evaluation ────────────────────────────────────────────

test('Automation Rule Engine: evaluateRule skips disabled rules', async ({ page }) => {
  await loginAsCEO(page);
  await page.goto('/automations');

  const result = await page.evaluate(async () => {
    const { SEED_AUTOMATION_RULES } = await import('/src/lib/automationEngine.ts');
    const { evaluateRule } = await import('/src/lib/automationRuleEngine.ts');
    // rule-005 is disabled
    const disabledRule = SEED_AUTOMATION_RULES.find((r: { id: string }) => r.id === 'rule-005')!;
    const context = {
      triggerType: 'worker_report_submitted',
      jobId: null,
      jobName: null,
      approvalState: 'not_required' as const,
      eventData: {},
      initiatedBy: 'system',
      triggeredAt: new Date().toISOString(),
    };
    const res = evaluateRule(disabledRule, context);
    return { matched: res.matched, skipReason: res.skipReason };
  });

  expect(result.matched).toBe(false);
  expect(result.skipReason).toContain('not active');
});

test('Automation Rule Engine: active rule with matching trigger produces executions', async ({ page }) => {
  await loginAsCEO(page);
  await page.goto('/automations');

  const result = await page.evaluate(async () => {
    const { SEED_AUTOMATION_RULES } = await import('/src/lib/automationEngine.ts');
    const { evaluateRule } = await import('/src/lib/automationRuleEngine.ts');
    // rule-001: active, trigger=sync_failed, actions: send_notification + create_audit_record
    const rule = SEED_AUTOMATION_RULES.find((r: { id: string }) => r.id === 'rule-001')!;
    const context = {
      triggerType: 'sync_failed',
      jobId: null,
      jobName: null,
      approvalState: 'not_required' as const,
      eventData: {},
      initiatedBy: 'system',
      triggeredAt: '2026-05-31T10:00:00Z',
    };
    const res = evaluateRule(rule, context);
    return {
      matched: res.matched,
      conditionsPassed: res.conditionsPassed,
      executionCount: res.executions.length,
      allSuccess: res.executions.every((e: { result: string }) => e.result === 'success'),
    };
  });

  expect(result.matched).toBe(true);
  expect(result.conditionsPassed).toBe(true);
  expect(result.executionCount).toBe(2);
  expect(result.allSuccess).toBe(true);
});

test('Automation Rule Engine: FinanciallySensitive action is blocked when approval state is pending', async ({ page }) => {
  await loginAsCEO(page);
  await page.goto('/automations');

  const result = await page.evaluate(async () => {
    const { SEED_AUTOMATION_RULES } = await import('/src/lib/automationEngine.ts');
    const { evaluateRule } = await import('/src/lib/automationRuleEngine.ts');
    // rule-003: active, trigger=review_approved, actions include queue_accounting_sync (FinanciallySensitive)
    const rule = SEED_AUTOMATION_RULES.find((r: { id: string }) => r.id === 'rule-003')!;
    const context = {
      triggerType: 'review_approved',
      jobId: 'dj-kitchen-extract-1',
      jobName: 'Kitchen extraction & ventilation install',
      approvalState: 'pending' as const,   // <— not approved
      eventData: {},
      initiatedBy: 'Sarah Chen',
      triggeredAt: '2026-05-31T10:00:00Z',
    };
    const res = evaluateRule(rule, context);
    const blockedExecution = res.executions.find(
      (e: { result: string }) => e.result === 'blocked_approval_required'
    );
    return {
      matched: res.matched,
      hasBlockedExecution: !!blockedExecution,
    };
  });

  expect(result.matched).toBe(true);
  expect(result.hasBlockedExecution).toBe(true);
});

test('Automation Rule Engine: condition matching works — mismatched condition prevents action', async ({ page }) => {
  await loginAsCEO(page);
  await page.goto('/automations');

  const result = await page.evaluate(async () => {
    const { SEED_AUTOMATION_RULES } = await import('/src/lib/automationEngine.ts');
    const { evaluateRule } = await import('/src/lib/automationRuleEngine.ts');
    // rule-004: trigger=job_status_changed, condition: {targetStatus: 'completed'}
    const rule = SEED_AUTOMATION_RULES.find((r: { id: string }) => r.id === 'rule-004')!;
    const context = {
      triggerType: 'job_status_changed',
      jobId: 'job-abc',
      jobName: 'Test Job',
      approvalState: 'not_required' as const,
      eventData: { targetStatus: 'in_progress' }, // <— does NOT match 'completed'
      initiatedBy: 'system',
      triggeredAt: '2026-05-31T10:00:00Z',
    };
    const res = evaluateRule(rule, context);
    return {
      matched: res.matched,
      conditionsPassed: res.conditionsPassed,
      executionCount: res.executions.length,
    };
  });

  expect(result.matched).toBe(true);
  expect(result.conditionsPassed).toBe(false);
  expect(result.executionCount).toBe(0);
});

// ── Audit Engine: Immutability and Job Attribution ──────────────────────────

test('Automation Audit Engine: recordAutomationExecution appends an immutable entry with job attribution', async ({ page }) => {
  await loginAsCEO(page);
  await page.goto('/automations');

  const result = await page.evaluate(async () => {
    const { SEED_AUTOMATION_RULES, ACTION_CATALOGUE_V1 } = await import('/src/lib/automationEngine.ts');
    const { executeActions } = await import('/src/lib/automationRuleEngine.ts');
    const { recordAutomationExecution, getAutomationAuditHistory } = await import('/src/lib/automationAuditEngine.ts');

    const rule = SEED_AUTOMATION_RULES.find((r: { id: string }) => r.id === 'rule-001')!;
    const context = {
      triggerType: 'sync_failed',
      jobId: 'job-xyz',
      jobName: 'Test Facilities Job',
      approvalState: 'not_required' as const,
      eventData: {},
      initiatedBy: 'Marcus Webb',
      triggeredAt: '2026-05-31T11:00:00Z',
    };

    const executions = executeActions(rule, context);
    const action = ACTION_CATALOGUE_V1.find((a: { id: string }) => a.id === executions[0].actionId)!;
    const entry = recordAutomationExecution(executions[0], rule.ruleNumber, action.label);
    const history = getAutomationAuditHistory();

    return {
      entryId: entry.id,
      jobId: entry.jobId,
      jobName: entry.jobName,
      initiatedBy: entry.initiatedBy,
      result: entry.result,
      historyLength: history.length,
    };
  });

  expect(result.jobId).toBe('job-xyz');
  expect(result.jobName).toBe('Test Facilities Job');
  expect(result.initiatedBy).toBe('Marcus Webb');
  expect(result.result).toBe('success');
  expect(result.historyLength).toBeGreaterThanOrEqual(1);
});

test('Automation Audit Engine: audit history grows monotonically and is not cleared between calls', async ({ page }) => {
  await loginAsCEO(page);
  await page.goto('/automations');

  const result = await page.evaluate(async () => {
    const { SEED_AUTOMATION_RULES, ACTION_CATALOGUE_V1 } = await import('/src/lib/automationEngine.ts');
    const { executeActions } = await import('/src/lib/automationRuleEngine.ts');
    const { recordAutomationExecution, getAutomationAuditHistory } = await import('/src/lib/automationAuditEngine.ts');

    const rule = SEED_AUTOMATION_RULES.find((r: { id: string }) => r.id === 'rule-001')!;
    const ctx = {
      triggerType: 'sync_failed',
      jobId: null,
      jobName: null,
      approvalState: 'not_required' as const,
      eventData: {},
      initiatedBy: 'system',
      triggeredAt: '2026-05-31T12:00:00Z',
    };

    // Record two executions
    const execs1 = executeActions(rule, ctx);
    const action1 = ACTION_CATALOGUE_V1.find((a: { id: string }) => a.id === execs1[0].actionId)!;
    recordAutomationExecution(execs1[0], rule.ruleNumber, action1.label);

    const before = getAutomationAuditHistory().length;

    const execs2 = executeActions(rule, ctx);
    const action2 = ACTION_CATALOGUE_V1.find((a: { id: string }) => a.id === execs2[0].actionId)!;
    recordAutomationExecution(execs2[0], rule.ruleNumber, action2.label);

    const after = getAutomationAuditHistory().length;

    return { before, after, grew: after > before };
  });

  expect(result.grew).toBe(true);
  expect(result.after).toBe(result.before + 1);
});
