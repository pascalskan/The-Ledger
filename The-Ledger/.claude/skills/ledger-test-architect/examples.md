# EXAMPLES: ledger-test-architect

---

## TYPICAL INVOCATIONS

### 1. New Feature Test Plan

```
Use ledger-test-architect to generate a test plan for the new Client Invoice Portal.
```

Expected output: Coverage matrix, P0/P1/P2 test cases, RBAC tests, doctrine tests, regression risks.

---

### 2. Doctrine Test Audit

```
Use ledger-test-architect to audit current doctrine test coverage and identify gaps.
```

Expected output: Coverage assessment per doctrine, gap identification, priority ordering for new tests.

---

### 3. Regression Risk Analysis

```
Use ledger-test-architect to identify regression risks before refactoring the Review Centre.
```

Expected output: List of tests that touch Review Centre state, specific test IDs at risk, recommended pre-refactor test run order.

---

### 4. Acceptance Criteria Conversion

```
Use ledger-test-architect to convert these acceptance criteria into Playwright test cases for the Expense Approval workflow.
```

Expected output: Full test case definitions for each acceptance criterion, coverage matrix, data-testid requirements.

---

### 5. Post-Implementation Coverage Review

```
Use ledger-test-architect to review test coverage after implementing Phase 7.1.
```

Expected output: Coverage matrix assessment, gaps found, recommended additional tests.

---

## COWORK EXAMPLES

```
@ledger-test-architect What data-testid attributes does this new dialog need?
```

```
@ledger-test-architect Generate a test plan for testing CEO RBAC controls.
```

```
@ledger-test-architect Which existing tests are at risk if we modify the approval state machine?
```

---

## MULTI-AGENT EXAMPLES

### Full Feature Pre-Implementation Review

```
1. ledger-product-manager → Scope and feature definition
2. ledger-architect → Architecture plan
3. ledger-test-architect → Test plan (before implementation begins)
4. Implementation
5. ledger-test-architect → Post-implementation coverage review
```

---

### Doctrine Validation Pipeline

```
1. ledger-financial-doctrine-guardian → Doctrine compliance assessment
2. ledger-rbac-workflow-auditor → RBAC compliance assessment
3. ledger-test-architect → Generate test cases for all identified compliance requirements
```

---

## SEQUENTIAL WORKFLOW EXAMPLES

### Full Test Suite for New Module

```
Step 1: ledger-test-architect
  Input: "Plan test coverage for a new Supplier Payments module"
  Output: Coverage matrix with all test cases, doctrine tests, RBAC tests, data-testid requirements

Step 2: Implementation (developer writes tests)

Step 3: ledger-test-architect
  Input: Implemented test files
  Output: Review for coverage gaps, naming convention compliance, missing doctrine tests
```

---

## TEST ID REFERENCE

| Domain | Prefix | Example |
|---|---|---|
| Review Centre | RC | RC-01, RC-02 |
| Approval | AP | AP-01, AP-02 |
| Event Bus | EB | EB-01, EB-02 |
| RBAC | RB | RB-01, RB-02 |
| Audit | AU | AU-01, AU-02 |
| Reporting | RP | RP-01, RP-02 |
| Accounting Sync | AS | AS-01, AS-02 |
| Workflow Automation | WA | WA-01, WA-02 |
| Financial Controls | FC | FC-01, FC-02 |

For new modules, establish a new prefix in the test plan and document it.

---

## EXPECTED TURNAROUND

This skill produces a structured test plan and coverage matrix. It does not write Playwright code unless explicitly asked. It produces the test design that guides implementation.

Output length: Medium to long (800–2500 words depending on feature complexity).

Coverage matrix and P0 test cases are mandatory in every output.
