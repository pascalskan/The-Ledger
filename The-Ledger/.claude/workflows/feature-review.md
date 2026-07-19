# WORKFLOW: Feature Review

**Type:** Post-Implementation
**Version:** 1.0
**Status:** Active

---

## PURPOSE

Defines the agent sequence and decision gates for reviewing a feature after implementation is complete, before it is merged. This workflow confirms that the implementation matches the plan and meets all quality standards.

---

## WHEN TO USE

Use this workflow when:

- A feature implementation is complete
- A bug fix has been applied
- A refactor has been completed
- Any code change is ready for review before merge

---

## INPUTS

Required before starting:

| Input | Source |
|---|---|
| Feature or change description | Branch or PR description |
| Files modified | git diff or implementation notes |
| Test results | Playwright test output |
| Planning output | `feature-planning.md` output (if available) |

---

## AGENT SEQUENCE

### Step 1: ledger-architect

**Purpose:** Verify implementation matches the approved architectural approach.

**Input to agent:**
- Files modified
- Change description
- Original architectural plan (if available)

**Expected output:**
- Architectural Assessment (does implementation match plan?)
- Doctrine Review (are all four doctrines still intact?)
- Any new risks introduced

**Decision gate:**
- No VIOLATION introduced by implementation
- Implementation matches approved architecture

If gate fails: Return to implementation to fix violations.

---

### Step 2: ledger-financial-doctrine-guardian

*(Only required if implementation touched financial data, approval workflows, or accounting sync.)*

**Purpose:** Confirm implementation does not introduce financial doctrine violations.

**Input to agent:**
- Files modified
- Any financial flows in the implementation

**Expected output:**
- Doctrine Review for all applicable financial doctrines
- Automation safety confirmation
- Any new financial risks introduced

**Decision gate:**
- No Critical financial risk introduced
- All financial doctrines remain COMPLIANT

If gate fails: Return to implementation to fix violations.

---

### Step 3: ledger-rbac-workflow-auditor

*(Only required if implementation touched role-specific access or navigation.)*

**Purpose:** Confirm implementation does not introduce RBAC violations.

**Input to agent:**
- Files modified
- Any role-specific components or pages added

**Expected output:**
- RBAC Assessment (all roles affected)
- Any new visibility or permission risks

**Decision gate:**
- No Critical RBAC violation introduced
- All roles have correct access in the implementation

If gate fails: Return to implementation to fix violations.

---

### Step 4: ledger-test-architect

**Purpose:** Verify test coverage is complete and tests are passing.

**Input to agent:**
- Test files added or modified
- Test results
- Coverage plan (from `feature-planning.md` if available)

**Expected output:**
- Coverage assessment against plan
- Any gaps identified
- Regression risk assessment

**Decision gate:**
- All P0 tests exist and pass
- No unacceptable coverage gaps
- No regressions in existing tests

If gate fails: Add missing tests before proceeding.

---

## PARALLEL EXECUTION

Steps 2 and 3 can run in parallel if independent (no shared output dependency).

Steps 1 and 4 must be sequential (architecture review before test review is preferred but not required if independent).

---

## OUTPUT

At the end of this workflow, the team has:

1. Confirmed implementation matches architectural plan
2. Confirmed no doctrine violations introduced
3. Confirmed RBAC correctness (if applicable)
4. Confirmed test coverage is complete
5. Clear merge recommendation

---

## EXIT CRITERIA

This workflow is complete when:

- All applicable agents have produced their output
- All decision gates have passed
- No blocking issues remain unresolved
- Build passes
- All P0 tests pass

---

## MERGE CHECKLIST

Before merging:

- [ ] Build: PASS
- [ ] All Playwright tests: PASS (501 / 501 or current baseline)
- [ ] No architectural VIOLATION
- [ ] No financial doctrine VIOLATION (if applicable)
- [ ] No RBAC VIOLATION (if applicable)
- [ ] All P0 tests pass
- [ ] Handoff document created (for substantial changes)

---

## NEXT WORKFLOW

After merge, if UX changes were made, run `ux-audit.md`.

Before a major release, run `release-audit.md`.
