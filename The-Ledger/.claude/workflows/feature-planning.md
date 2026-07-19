# WORKFLOW: Feature Planning

**Type:** Pre-Implementation
**Version:** 1.0
**Status:** Active

---

## PURPOSE

Defines the agent sequence and decision gates for planning a new feature before any implementation begins. This workflow produces a complete implementation brief that removes ambiguity before a single line of code is written.

---

## WHEN TO USE

Use this workflow when:

- A new feature is being proposed
- A new page or domain is being added
- A significant change to an existing feature is planned
- The scope or approach of a feature is uncertain

Do not use this workflow for:
- Bug fixes (use `feature-review.md` post-fix)
- Small UI adjustments (go directly to implementation + `feature-review.md`)
- Hotfixes

---

## INPUTS

Required before starting:

| Input | Source |
|---|---|
| Feature description | User or product owner |
| User programme(s) affected | User or product owner |
| Current roadmap position | `docs/handoffs/` latest file |
| Canonical context | `docs/ai-context/LEDGER_CANONICAL_CONTEXT.md` |

---

## AGENT SEQUENCE

### Step 1: ledger-product-manager

**Purpose:** Establish scope, dependencies, and roadmap alignment.

**Input to agent:**
- Feature description
- Current roadmap position
- User programme(s) affected

**Expected output:**
- Current State Summary
- Strategic Assessment
- Dependency Analysis
- Scope Assessment
- Risks
- Recommended Next Steps

**Decision gate:**
- Scope is clearly defined
- No blocking dependencies unresolved
- Roadmap alignment confirmed

If gate fails: Refine scope with product owner before proceeding.

---

### Step 2: ledger-architect

**Purpose:** Validate architecture, module placement, and doctrine compliance.

**Input to agent:**
- Product Manager output
- Feature description
- Current stack context

**Expected output:**
- Architectural Assessment
- Doctrine Review (all four mandatory doctrines)
- Dependency Analysis
- Risks
- Recommendations

**Decision gate:**
- No VIOLATION in any mandatory doctrine
- Module placement confirmed
- Architectural approach approved

If gate fails: Resolve architectural violations before proceeding.

---

### Step 3: ledger-financial-doctrine-guardian

*(Only required if feature touches financial data, approval workflows, or accounting sync.)*

**Purpose:** Validate financial doctrine compliance and automation safety.

**Input to agent:**
- Architect output
- Any proposed financial flows or automations

**Expected output:**
- Financial Compliance Assessment
- Doctrine Review (all eight financial doctrines)
- Financial Risks
- Automation Safety Review
- Required Corrections

**Decision gate:**
- No Critical financial risk
- No VIOLATION in any financial doctrine
- All automations assessed as SAFE

If gate fails: Resolve financial violations before proceeding.

---

### Step 4: ledger-rbac-workflow-auditor

*(Only required if feature has role-specific access or workflow boundaries.)*

**Purpose:** Validate RBAC correctness for all roles involved.

**Input to agent:**
- Architect output
- Guardian output (if applicable)
- Proposed role interactions

**Expected output:**
- RBAC Assessment
- Role Review (all roles involved)
- Visibility Risks
- Permission Risks
- Workflow Risks
- Recommendations

**Decision gate:**
- No Critical RBAC violation
- All roles have correct access
- No data visibility risks

If gate fails: Resolve RBAC violations before proceeding.

---

### Step 5: ledger-test-architect

**Purpose:** Define test coverage before implementation begins.

**Input to agent:**
- All previous agent outputs
- Feature description and acceptance criteria

**Expected output:**
- Coverage Matrix
- Required Test Cases (P0, P1, P2)
- Regression Risks
- data-testid Requirements

**Decision gate:**
- All P0 test cases are defined
- Regression risks are identified

---

## OUTPUT

At the end of this workflow, the implementation team has:

1. Confirmed scope and roadmap alignment
2. Validated architecture
3. Financial doctrine compliance (if applicable)
4. RBAC compliance (if applicable)
5. Complete test plan with P0/P1/P2 cases
6. Clear implementation path

---

## EXIT CRITERIA

This workflow is complete when:

- All applicable agents have produced their output
- All decision gates have passed
- Implementation brief is complete
- No blocking issues remain unresolved

---

## NEXT WORKFLOW

After this workflow completes, proceed to implementation.

After implementation, run `feature-review.md`.
