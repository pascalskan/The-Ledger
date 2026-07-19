# WORKFLOW: UX Audit

**Type:** Quality Assurance
**Version:** 1.0
**Status:** Active

---

## PURPOSE

Defines the agent sequence for performing a structured UX audit across one or more user roles. This workflow produces a scored UX assessment, a design consistency review, and an RBAC confirmation that no role confusion has been introduced.

---

## WHEN TO USE

Use this workflow when:

- A significant UX change has been made
- Navigation structure has been modified
- A new page or user-facing feature has been shipped
- A periodic UX quality review is being performed
- Pre-release UX sign-off is required
- A UX regression is suspected

---

## SCOPE OPTIONS

### Single Role Audit
Audit one role's experience end-to-end.

### Full Platform Audit
Audit all four roles: CEO, PM, Worker, Client.

### Navigation-Only Audit
Focus on navigation structure, labels, and placement.

### Mobile Audit
Focus on Worker and field-use mobile experience.

---

## INPUTS

Required before starting:

| Input | Source |
|---|---|
| Scope | Single role / Full platform / Navigation / Mobile |
| Recent changes | Handoff documents or branch diff |
| Role(s) to audit | Specified by requester |
| Navigation structure | `client/src/components/layout.tsx` |

---

## AGENT SEQUENCE

### Step 1: ledger-ux-auditor

**Purpose:** Score UX quality and identify findings.

**Run once per role being audited.** For full platform audits, run four times (CEO, PM, Worker, Client) — in parallel if possible.

**Input to agent:**
- Role being audited
- Recent changes (if any)
- Scope of audit (navigation / workflow / mobile / full)

**Expected output per run:**
- Five-dimension UX scores
- Findings with severity levels
- Navigation assessment
- Workflow assessment
- Mobile assessment (if in scope)
- Ordered recommendations

**Decision gate:**
- Overall UX score ≥ 7.5 / 10
- No Critical findings unresolved

If gate fails: Document findings for immediate remediation sprint.

---

### Step 2: ledger-design-system-guardian

**Purpose:** Review design consistency across pages audited.

**Input to agent:**
- Pages reviewed in Step 1
- Any design inconsistencies flagged in Step 1

**Expected output:**
- Consistency Review
- Design Debt Assessment
- Standardization Recommendations

**Decision gate:**
- No Critical design inconsistencies
- Major issues documented for remediation

---

### Step 3: ledger-rbac-workflow-auditor

*(Abbreviated — focused on role confusion only, not full RBAC review.)*

**Purpose:** Confirm UX changes have not introduced role confusion or inappropriate visibility.

**Input to agent:**
- Navigation changes (if any)
- Any new pages or components added
- UX auditor findings related to role-specific concerns

**Expected output:**
- Role visibility assessment for all roles affected
- Any new RBAC risks introduced by UX changes

**Decision gate:**
- No role confusion introduced
- No inappropriate data visibility introduced

If gate fails: Return to implementation to fix before proceeding.

---

### Step 4: ledger-test-architect

*(Optional — recommended when Critical or Major UX findings are being remediated.)*

**Purpose:** Generate Playwright test cases for UX flows identified as critical.

**Input to agent:**
- UX findings (from Step 1)
- Current test coverage for affected pages

**Expected output:**
- Test cases for critical UX flows
- Regression risks for any UX changes being made

---

## OUTPUT

At the end of this workflow, the team has:

1. Quantified UX quality score per role
2. Complete findings log with severity
3. Design consistency assessment
4. RBAC confirmation
5. Test cases for critical flows (if Step 4 run)
6. Ordered remediation plan

---

## UX SCORE TARGETS

| Score | Status |
|---|---|
| 9.0 – 10.0 | Ship without UX work |
| 7.5 – 8.9 | Ship with minor improvements scheduled |
| 6.0 – 7.4 | Remediation required before major release |
| Below 6.0 | Do not ship — UX sprint required |

---

## EXIT CRITERIA

This workflow is complete when:

- All role audits have scores
- All findings are documented with severity
- Design review is complete
- RBAC confirmation is complete
- Remediation plan is in place for any Critical or Major findings

---

## NEXT WORKFLOW

If findings require code changes, run `feature-review.md` after remediation.

If preparing for release, run `release-audit.md`.
