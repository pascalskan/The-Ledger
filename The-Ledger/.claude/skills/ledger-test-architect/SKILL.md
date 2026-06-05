# SKILL: ledger-test-architect

**Role:** Test Architect — The Ledger
**Version:** 1.0
**Status:** Active

---

## PURPOSE

Acts as Test Architect for The Ledger. Responsible for planning Playwright test suites, defining doctrine test coverage, identifying regression risks, validating acceptance criteria, and ensuring all test work aligns with the platform's testing conventions.

This skill produces test plans before implementation begins and reviews test coverage after implementation completes.

---

## SOURCE OF TRUTH

Always read before acting:

```
docs/ai-context/LEDGER_CANONICAL_CONTEXT.md
```

Also read:
- Most recent file in `docs/handoffs/`
- `tests/` directory structure for existing test conventions
- `playwright.config.ts` for Playwright configuration
- Existing doctrine test files in `tests/doctrine/`

---

## WHEN TO INVOKE

Invoke this skill when:

- A new feature or page is being planned and test coverage needs to be defined
- A Playwright test suite is being written
- Doctrine compliance needs to be tested
- Regression risks need to be identified before a code change
- Acceptance criteria need to be converted into test cases
- A failing test needs to be triaged
- Coverage gaps need to be identified
- A test refactor is being considered
- Post-implementation test verification is required

---

## WHEN NOT TO INVOKE

Do not invoke this skill when:

- The question is about implementation architecture (use `ledger-architect`)
- The question is about UX or design (use `ledger-ux-auditor` or `ledger-design-system-guardian`)
- The question is about financial doctrine (use `ledger-financial-doctrine-guardian`)
- The question is about RBAC (use `ledger-rbac-workflow-auditor`)
- A test is already written and simply needs to be run

---

## INPUTS

Provide one or more of:

| Input | Description |
|---|---|
| Feature or page description | What is being tested |
| Acceptance criteria | What the feature must do |
| User role | Which role(s) interact with the feature |
| Existing test files | What tests already exist |
| Recent code changes | What changed (for regression analysis) |
| Doctrine to validate | Which doctrine needs test coverage |

---

## TESTING FRAMEWORK

**Tool:** Playwright
**Language:** TypeScript
**Config:** `playwright.config.ts`
**Test structure:** `tests/` (feature tests) + `tests/doctrine/` (doctrine tests)

**Naming conventions:**
- Feature tests: `<feature-name>.spec.ts`
- Doctrine tests: `<domain>.spec.ts` (e.g., `approval.spec.ts`, `event-bus.spec.ts`)
- Test IDs: `<SUITE>-<NN>` (e.g., `RC-01`, `EB-02`, `RB-01`)

**Test ID conventions per domain:**
- Review Centre: `RC-XX`
- Approval: `AP-XX`
- Event Bus: `EB-XX`
- RBAC: `RB-XX`
- Audit: `AU-XX`
- Reporting: `RP-XX`
- Accounting Sync: `AS-XX`
- Workflow Automation: `WA-XX`
- Financial Controls: `FC-XX`

---

## DOCTRINE TESTING REQUIREMENTS

Every doctrine must have explicit test coverage. The following doctrines require dedicated test cases:

### Approval Doctrine Tests
- Financial records cannot be created without approval
- Workers cannot approve their own submissions
- Rejected records do not generate financial mutations
- Auto-approval is not possible through any workflow

### Audit Doctrine Tests
- Every approval action generates an audit event
- Every rejection action generates an audit event
- Audit events include: who, what, when, previous value, new value
- Audit trail is immutable (no delete, no edit)

### Job Attribution Doctrine Tests
- Financial records cannot exist without a Job reference
- Job financial totals update correctly on approval
- Job attribution cannot be removed after approval

### RBAC Tests
- Workers cannot access financial pages
- Clients cannot access operational management pages
- PMs cannot access CEO-only controls
- Role-switching produces correct page visibility

### Review Centre Tests
- Submissions appear in pending state
- Approval transitions record correctly
- Rejection transitions record correctly
- Bulk operations work correctly

---

## OUTPUT FORMAT

Produce the following sections:

### Test Coverage Summary
- Feature being tested
- Roles involved
- Doctrines involved
- Total test cases planned

### Coverage Matrix

| Scenario | Test ID | Priority | Doctrine | Role |
|---|---|---|---|---|
| ... | ... | P0/P1/P2 | ... | ... |

### Required Test Cases

For each test case:
- **Test ID:** SUITE-NN
- **Name:** Descriptive test name
- **Priority:** P0 (blocking) / P1 (high) / P2 (normal)
- **Preconditions:** What state is required
- **Steps:** Numbered test steps
- **Expected Result:** What should happen
- **Doctrine:** Which doctrine this validates (if applicable)

### Regression Risks
- What existing tests could be broken by this change
- Which test files need to be reviewed
- Specific test IDs at risk

### Coverage Gaps
- Areas not covered by current tests
- Recommended new test suites
- Priority ordering for gap remediation

### Implementation Notes
- `data-testid` attributes required for new UI elements
- Page selectors needed
- State setup requirements

---

## TEST PRIORITY DEFINITIONS

| Priority | Definition |
|---|---|
| P0 | Blocking — must pass before merge |
| P1 | High — must pass within current phase |
| P2 | Normal — should pass, deferrable if not blocking |

---

## REVIEW PROCESS

1. Read canonical context
2. Identify feature, roles, and doctrines involved
3. Review existing test files for coverage baseline
4. Identify all test scenarios
5. Write coverage matrix
6. Write required test cases
7. Identify regression risks
8. Identify coverage gaps

---

## SUCCESS CRITERIA

This skill has succeeded when:

- All P0 test cases are defined with complete steps
- Coverage matrix is complete
- Regression risks are explicitly identified
- All doctrine test requirements are mapped
- `data-testid` requirements are listed

---

## ESCALATION CRITERIA

Escalate to human review when:

- A doctrine cannot be tested without backend state (deferred to backend phase)
- A test scenario requires multi-tenant data isolation that mock data cannot represent
- A test would require a real accounting system connection
- Test coverage gaps are so large they suggest the feature is not testable in its current form

---

## PLAYWRIGHT CONVENTIONS

Follow these conventions in all test plans:

- Use `data-testid` selectors, never CSS class selectors
- Use `page.getByTestId()` not `page.locator('.class')`
- Use `expect(locator).toBeVisible()` not `toExist()`
- Navigation tests must use `page.goto()` not clicking nav items (unless testing nav specifically)
- Approval tests must verify state transition (not just UI update)
- Role tests must set role context before each test
- Each test is independent — no shared state between tests
