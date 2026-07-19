# WORKFLOW: Financial Audit

**Type:** Financial Compliance
**Version:** 1.0
**Status:** Active

---

## PURPOSE

Defines the agent sequence for performing a targeted financial compliance audit of The Ledger. This workflow is triggered when a financial concern is raised, when a financial feature is being reviewed, or as part of a scheduled compliance check.

---

## WHEN TO USE

Use this workflow when:

- A financial feature has been implemented or modified
- A concern about financial doctrine compliance has been raised
- An automation is being reviewed for financial safety
- Accounting sync behaviour is being modified
- A financial exception or override mechanism is being reviewed
- A periodic financial compliance check is being performed
- Preparing for backend architecture that will handle real financial data

---

## INPUTS

Required before starting:

| Input | Source |
|---|---|
| Scope of audit | Specific feature / Full platform |
| Recent changes | Handoff documents or branch diff |
| Financial flows in scope | Description of workflows being audited |
| Automations in scope | Any automated actions touching financial data |

---

## AGENT SEQUENCE

### Step 1: ledger-financial-doctrine-guardian

**Purpose:** Primary financial compliance assessment.

**Input to agent:**
- Scope of audit
- Financial flows being reviewed
- Automations in scope

**Expected output:**
- Financial Compliance Assessment (overall verdict)
- Doctrine Review for all applicable doctrines
- Financial Risk Register
- Automation Safety Review
- Required Corrections (ordered P0 first)

**Decision gate:**
- No Critical financial risks unresolved
- No VIOLATION in any financial doctrine
- All automations assessed as SAFE

If gate fails: Document violations and halt until corrected.

---

### Step 2: ledger-rbac-workflow-auditor (Financial Focus)

**Purpose:** Confirm that financial data access is correctly role-gated.

**Input to agent:**
- Financial Doctrine Guardian output
- Role interactions with financial data in scope

**Expected output:**
- Role review focused on financial data access
- Any financial data visibility risks
- Approval permission assessment

**Decision gate:**
- No Critical visibility risks for Worker or Client roles
- Approval permissions correctly scoped

---

### Step 3: ledger-architect (Financial Structure Review)

*(For audits that involve structural financial patterns, not cosmetic reviews.)*

**Purpose:** Confirm financial data flows are architecturally sound.

**Input to agent:**
- Guardian output
- RBAC output
- Financial components or stores in scope

**Expected output:**
- Architectural assessment of financial flows
- Doctrine compliance at the structural level
- Data flow correctness

---

### Step 4: ledger-test-architect (Financial Test Coverage)

**Purpose:** Ensure financial doctrine test coverage exists for the audited flows.

**Input to agent:**
- Guardian output (risks and violations found)
- Current doctrine test files

**Expected output:**
- Doctrine test coverage assessment
- Required new test cases for identified risks
- P0 tests for any unresolved risks

---

## PARALLEL EXECUTION

Steps 2 and 3 can run in parallel (both receive Guardian output).

Step 4 runs after Steps 1–3 (needs all findings to plan tests).

---

## FINANCIAL AUDIT SCOPE OPTIONS

### Targeted Audit (Single Feature)
Run Steps 1 and 4 only. Suitable for reviewing a single workflow change.

### Standard Audit (Feature + RBAC)
Run Steps 1, 2, and 4. Suitable for features with role-specific financial interactions.

### Full Structural Audit (Architecture + Finance + RBAC)
Run all four steps. Suitable for major financial feature reviews or pre-release.

---

## ZERO-TOLERANCE ESCALATION

If any of the following are found at any step, halt immediately and escalate to human review:

1. Auto-approval of any financial submission
2. Financial records created without Job attribution
3. Financial mutations without audit trail
4. Worker access to any financial data
5. Client access to other clients' financial data
6. Accounting sync modifying Ledger records
7. Any financial override without CEO approval

---

## EXIT CRITERIA

This workflow is complete when:

- All selected steps have produced output
- All decision gates have passed
- No Critical financial risk is unresolved
- No VIOLATION in any financial doctrine
- Required corrections are documented and actioned
- Test cases for identified risks are defined

---

## OUTPUT

At the end of this workflow, the team has:

1. Financial compliance verdict for the audited scope
2. Complete doctrine review
3. Financial risk register
4. Automation safety assessment
5. RBAC financial access confirmation
6. Test cases for identified risks
7. Required corrections list

---

## NEXT WORKFLOW

After resolving any findings, run `feature-review.md` to confirm corrections are in place.

For release, run `release-audit.md` which includes this workflow's agents.
