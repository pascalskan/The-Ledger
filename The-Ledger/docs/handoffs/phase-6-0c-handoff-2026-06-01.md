# Phase 6.0C — Automation Builder Handoff

Date: 2026-06-01
Branch: `feature/phase-6-0c-automation-builder`
Status: **Implementation Complete — PR Ready**

---

## Summary

Phase 6.0C delivers the Automation Builder — a 5-step guided UI for creating, editing, duplicating, and archiving automation rules from within the Automation Centre. The full rule lifecycle engine (`automationBuilderEngine.ts`) backs the UI with validation, audit generation, and RBAC enforcement.

All 25 doctrine tests have been written and are in `tests/doctrine/automation-builder.spec.ts`.

---

## Files Added

| File | Description |
|---|---|
| `The-Ledger/client/src/lib/automationBuilderEngine.ts` | Builder engine: create, update, duplicate, archive, validate, audit |
| `The-Ledger/tests/doctrine/automation-builder.spec.ts` | 25 doctrine tests covering full builder lifecycle |
| `The-Ledger/docs/handoffs/phase-6-0c-handoff-2026-06-01.md` | This handoff document |

---

## Files Modified

| File | Change |
|---|---|
| `The-Ledger/client/src/pages/automations.tsx` | Full automation builder UI integrated (5-step dialog, edit/duplicate/archive workflows) |
| `The-Ledger/docs/LEDGER_CANONICAL_CONTEXT.md` | Phase 6.0C marked complete, roadmap updated |

---

## Engine Architecture

### `automationBuilderEngine.ts`

**Types:**
- `BuilderFormState` — 5-step form state (name, description, category, triggerId, conditions[], actionIds[])
- `BuilderCondition` — field/operator/value condition rows
- `BuilderStep` — 1 | 2 | 3 | 4 | 5
- `BuilderValidationResult` — `{ valid: boolean; errors: string[] }`
- `ConditionOperator` — equals | not_equals | contains | greater_than | less_than

**Constants:**
- `BUILDER_FORM_DEFAULTS` — default empty form state
- `BUILDER_STEP_LABELS` — step number → label map
- `CONDITION_OPERATOR_LABELS` — operator → display string map

**Reuse from `automationEngine.ts` (zero duplication):**
- `FORBIDDEN_ACTION_NAMES`
- `TRIGGER_CATALOGUE_V1`
- `ACTION_CATALOGUE_V1`
- `SEED_AUTOMATION_RULES` (seeds `_ruleStore`)

**Validation (`validateBuilderForm`):**
- Name required
- Description required
- Trigger required
- At least one action required
- No forbidden actions permitted

**Lifecycle functions:**
- `createRuleFromBuilder(form, createdBy)` → `{ rule, auditEntry }`
- `updateRuleFromBuilder(ruleId, form, updatedBy)` → `{ rule, auditEntry }`
- `duplicateRule(ruleId, duplicatedBy)` → `{ rule, auditEntry }` (status: draft)
- `archiveRule(ruleId, archivedBy)` → `{ rule, auditEntry }` (soft delete only)
- `getAllRules()` — returns full `_ruleStore`
- `getRuleById(ruleId)` — lookup by ID
- `ruleToBuilderForm(rule)` — converts saved rule → BuilderFormState for edit mode

**Audit integration:**
Every lifecycle function calls `createBuilderAuditEntry()` which appends to `_automationAuditStore` (from `automationAuditEngine.ts`). Audit action labels:
- `Automation Created`
- `Automation Updated`
- `Automation Duplicated`
- `Automation Archived`

---

## UI Implementation

### Builder Dialog (`AutomationBuilderDialog`)

Full 5-step guided dialog inside `automations.tsx`:

| Step | Content |
|---|---|
| 1 — Basic Details | Name (required), Description (required), Category select, FinanciallySensitive warning |
| 2 — Trigger | TRIGGER_CATALOGUE_V1 rendered as selectable cards |
| 3 — Conditions | Add/remove field+operator+value condition rows (optional) |
| 4 — Actions | ACTION_CATALOGUE_V1 as multi-select cards, forbidden action warning |
| 5 — Review | Summary of all selections, financial safeguard notice if applicable, save |

**Step navigation:** Next / Back buttons. Save only on step 5.

**Financial safeguard:**
- `FinanciallySensitive` category shows inline warning on Step 1 (`data-testid="builder-financial-warning"`)
- Review step shows safeguard notice (`data-testid="builder-review-financial-safeguard"`)
- Step 4 shows forbidden action warning if any forbidden action is selected (`data-testid="builder-forbidden-action-warning"`)
- Save button is `disabled` when `formContainsForbiddenAction()` returns true

**Edit mode:** Builder receives `editRule` prop; pre-populates via `ruleToBuilderForm()`. Toast shows `"Automation Updated"`.

**Create mode:** `editRule` is null. Toast shows `"Automation Created"`.

### Rule Detail Dialog (`RuleDetailDialog`)

Extended with action buttons:
- **Edit** — opens builder in edit mode (`data-testid="aut-btn-edit-rule"`)
- **Duplicate** — calls `duplicateRule()`, shows `"Automation Duplicated"` toast (`data-testid="aut-btn-duplicate-rule"`)
- **Archive** — calls `archiveRule()`, shows `"Automation Archived"` toast (`data-testid="aut-btn-archive-rule"`)
- Edit and Archive buttons hidden for already-archived rules

### Create Automation Button

Header button opens builder in create mode:
```tsx
<Button onClick={openCreateBuilder} data-testid="aut-btn-create-automation">
  <Plus /> Create Automation
</Button>
```

---

## RBAC

| Role | Access |
|---|---|
| CEO | Full access — Create, Edit, Duplicate, Archive |
| PM | `automation-centre-page` not rendered — denied |
| Worker | `automation-centre-page` not rendered — denied |

RBAC is enforced at route level (`/automations` → CEO only in `App.tsx`) and in layout.tsx nav (CEO only).

---

## Data-TestId Reference

| TestId | Element |
|---|---|
| `aut-btn-create-automation` | Create Automation header button |
| `aut-builder-dialog` | Builder Dialog container |
| `builder-step-indicator` | Step progress indicator |
| `builder-step-{N}` | Step content panel |
| `builder-step-{N}-active` | Active step circle |
| `builder-input-name` | Rule name input |
| `builder-input-description` | Description textarea |
| `builder-select-category` | Category select |
| `builder-financial-warning` | FinanciallySensitive warning banner |
| `builder-trigger-option-{id}` | Trigger card button |
| `builder-btn-add-condition` | Add Condition button |
| `builder-condition-row-{N}` | Condition row wrapper |
| `builder-condition-field-{N}` | Condition field input |
| `builder-condition-operator-{N}` | Condition operator select |
| `builder-condition-value-{N}` | Condition value input |
| `builder-condition-remove-{N}` | Remove condition button |
| `builder-action-option-{id}` | Action card button |
| `builder-forbidden-action-warning` | Forbidden action warning |
| `builder-step-5` | Review step container |
| `builder-review-financial-safeguard` | Review step safeguard notice |
| `builder-btn-back` | Back navigation button |
| `builder-btn-next` | Next navigation button |
| `builder-btn-cancel` | Cancel button |
| `builder-btn-save` | Save / Create Automation button |
| `aut-rule-detail-dialog` | Rule Detail dialog |
| `aut-btn-edit-rule` | Edit button in Rule Detail |
| `aut-btn-duplicate-rule` | Duplicate button in Rule Detail |
| `aut-btn-archive-rule` | Archive button in Rule Detail |
| `aut-btn-view-{ruleId}` | View button in Rules table |
| `aut-filter-status` | Status filter select |
| `aut-status-archived` | Archived status badge |

---

## Test Coverage

File: `tests/doctrine/automation-builder.spec.ts`

| Test ID | Test Name |
|---|---|
| AB-01 | Create Automation button visible on Automation Centre (CEO) |
| AB-02 | Clicking Create Automation opens builder dialog |
| AB-03 | Builder opens on step 1 and step indicator is visible |
| AB-04 | Next button advances from step 1 to step 2 |
| AB-05 | Back button returns from step 2 to step 1 |
| AB-06 | Can create an Operational rule end to end |
| AB-07 | Can create a Workflow rule |
| AB-08 | Can create a Financially Sensitive rule (with warning shown) |
| AB-09 | Trigger catalogue is visible in step 2 |
| AB-10 | Conditions can be added in step 3 |
| AB-11 | Conditions can be removed in step 3 |
| AB-12 | Action catalogue is visible in step 4 |
| AB-13 | Multiple actions can be selected in step 4 |
| AB-14 | Review step renders rule name, trigger, actions summary |
| AB-15 | Saved rule appears in Automation Centre rules table |
| AB-16 | Edit button opens builder pre-populated with rule data |
| AB-17 | Edited rule saves changes and table updates |
| AB-18 | Duplicate button creates a copy as draft |
| AB-19 | Archive sets rule status to Archived (no hard delete) |
| AB-20 | FinanciallySensitive warning appears when category selected on step 1 |
| AB-21 | Save button blocked when forbidden action selected (engine validation) |
| AB-22 | Creating a rule via engine generates Automation Created audit entry |
| AB-23 | Updating a rule via engine generates Automation Updated audit entry |
| AB-24 | Archiving a rule via engine generates Automation Archived audit entry |
| AB-25 | PM does not see Create Automation button (denied access) |

Total new tests: **25**
Target total after run: **173 tests** (148 existing + 25 new)

---

## Verification Status

Note: Build and Playwright cannot be executed from this environment. Verification must be run locally:

```bash
cd The-Ledger
npm run build
npx playwright test
```

Expected:
- Build: PASS
- Playwright: 173 / 173 PASS

---

## Doctrine Compliance

| Doctrine | Status |
|---|---|
| Approval Doctrine | ✅ Builder never creates approved financial records |
| Audit Doctrine | ✅ All lifecycle operations generate audit entries |
| Forbidden Action Doctrine | ✅ Forbidden actions blocked at validation + save time |
| Financial Safeguard | ✅ FinanciallySensitive warning shown on Step 1 and Review |
| RBAC | ✅ CEO full access, PM and Worker denied at route level |
| No Hard Delete | ✅ Archive is soft-delete only (status → archived) |
| Immutable Audit Trail | ✅ Audit entries appended to _automationAuditStore, never modified |

---

## Risks

| Risk | Mitigation |
|---|---|
| AB-16 / AB-17 rely on `rule-001` testId | Seed data stable — rule-001 present in SEED_AUTOMATION_RULES |
| AB-21 uses `page.evaluate` import | Requires Vite dev server active with HMR during test run |
| AB-22/23/24 use engine-direct evaluation | Tests pass if module graph resolves at runtime in Playwright |

---

## Remaining Roadmap

| Phase | Description | Status |
|---|---|---|
| 6.0D | Automation Scheduler — cron-based trigger scheduling | Next |
| 6.1 | Automation Templates — pre-built rule templates library | Planned |
| 6.2 | Automation Analytics — execution metrics, failure rates | Planned |
| 7.0 | Backend Integration — real API, PostgreSQL persistence | Deferred |

---

## Git State

Branch: `feature/phase-6-0c-automation-builder`
Base: `feature/phase-6-0b-automation-centre`
PR target: `main`

Do not merge until:
- [ ] Local `npm run build` passes
- [ ] Local `npx playwright test` passes with 173/173
