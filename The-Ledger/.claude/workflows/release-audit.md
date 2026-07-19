# WORKFLOW: Release Audit

**Type:** Pre-Release Quality Gate
**Version:** 1.0
**Status:** Active

---

## PURPOSE

Defines the complete pre-release agent sequence for The Ledger. This workflow is the highest-level quality gate and must be completed before any major version or phase milestone is declared complete.

---

## WHEN TO USE

Use this workflow when:

- A phase is complete and ready to be declared done
- A major feature programme is being closed
- A backend handoff is being prepared
- An investor or stakeholder demonstration is being prepared
- A release candidate is being assessed

---

## INPUTS

Required before starting:

| Input | Source |
|---|---|
| Current state | `docs/ai-context/LEDGER_CANONICAL_CONTEXT.md` |
| Phase summary | Most recent handoff in `docs/handoffs/` |
| Test baseline | Current Playwright pass count |
| Scope of release | What has changed since last release |

---

## AGENT SEQUENCE

### Step 1: ledger-product-manager

**Purpose:** Confirm current platform state against intended roadmap state.

**Input to agent:**
- Current phase and recent handoffs
- Release scope

**Expected output:**
- Current State Summary (what is done vs what remains)
- Gap Analysis (intended state vs actual state)
- Outstanding work items
- Recommended next steps

---

### Step 2: ledger-financial-doctrine-guardian (Full Platform Audit)

**Purpose:** Verify all eight financial doctrines are intact across the full platform.

**Input to agent:**
- Release scope
- Any recent changes to financial workflows

**Expected output:**
- Doctrine Review for all eight doctrines
- Platform-wide financial risk assessment
- Any violations found

**Decision gate:**
- No VIOLATION in any financial doctrine
- No Critical financial risks

If gate fails: Stop release — resolve violations.

---

### Step 3: ledger-rbac-workflow-auditor (Full Platform Audit)

**Purpose:** Verify RBAC is correct for all four roles across the full platform.

**Input to agent:**
- Release scope
- Any recent changes to navigation or role permissions

**Expected output:**
- Role Review for all four roles
- Platform-wide visibility and permission risk assessment

**Decision gate:**
- No Critical RBAC violations
- All roles have correct access

If gate fails: Stop release — resolve violations.

---

### Step 4: ledger-ux-auditor (All Roles)

**Purpose:** Score UX quality for all four roles.

Run four parallel audits: CEO, PM, Worker, Client.

**Expected output:**
- UX score per role
- Critical and Major findings
- Ordered recommendations

**Decision gate:**
- All roles score ≥ 7.5 / 10
- No Critical UX findings

---

### Step 5: ledger-design-system-guardian (Full Platform)

**Purpose:** Assess platform-wide design consistency.

**Expected output:**
- Design debt summary
- Critical design inconsistencies
- Remediation order

**Decision gate:**
- No Critical design inconsistencies

---

### Step 6: ledger-architect (Platform Review)

**Purpose:** Confirm architectural integrity and technical debt assessment.

**Expected output:**
- Architectural health assessment
- Doctrine compliance at the structural level
- Technical debt inventory
- Recommendations for next phase

---

### Step 7: ledger-test-architect (Coverage Review)

**Purpose:** Confirm test coverage is complete against platform scope.

**Input to agent:**
- Current Playwright test count and pass rate
- Any known coverage gaps

**Expected output:**
- Coverage assessment against platform scope
- Doctrine test coverage confirmation
- Coverage gaps (documented but not blocking if P2)
- Any P0 gaps that must be resolved before release

**Decision gate:**
- All P0 tests pass
- Playwright baseline maintained (501 / 501 or current baseline)

---

## PARALLEL EXECUTION

Steps 2, 3, and 4 can run in parallel (independent).

Steps 5 and 6 can run in parallel (independent).

Step 7 runs after Step 4 (needs UX findings to assess workflow test coverage).

---

## RELEASE GATE CHECKLIST

Before declaring release complete:

- [ ] Product Manager: Gap analysis reviewed
- [ ] Financial Doctrine: No VIOLATION — all eight doctrines COMPLIANT
- [ ] RBAC: No Critical violations — all four roles correct
- [ ] UX: All roles score ≥ 7.5 / 10
- [ ] Design: No Critical inconsistencies
- [ ] Architecture: No VIOLATION in any doctrine
- [ ] Tests: All P0 tests pass, baseline maintained
- [ ] Build: PASS
- [ ] Handoff document: Created and committed

---

## EXIT CRITERIA

This workflow is complete when:

- All seven agents have produced output
- All decision gates have passed
- Release gate checklist is complete
- Handoff document is committed to `docs/handoffs/`

---

## OUTPUT

At the end of this workflow, the team has:

1. Confirmed platform state against roadmap
2. Financial doctrine compliance across full platform
3. RBAC compliance across full platform
4. UX quality scores for all four roles
5. Design consistency assessment
6. Architectural health assessment
7. Test coverage confirmation
8. Committed handoff document
9. Clear release recommendation

---

## NEXT WORKFLOW

After release, the next phase begins with `feature-planning.md`.
