# EXAMPLES: ledger-rbac-workflow-auditor

---

## TYPICAL INVOCATIONS

### 1. New Feature RBAC Review

```
Use ledger-rbac-workflow-auditor to review the RBAC design for the new Client Invoice Portal.
```

Expected output: Role review for all four roles, visibility risks, permission risks, workflow boundary assessment.

---

### 2. Navigation RBAC Audit

```
Use ledger-rbac-workflow-auditor to audit the current navigation for RBAC correctness — are all sections visible to the right roles?
```

Expected output: Per-nav-section RBAC assessment, role-gating validation, visibility risks.

---

### 3. Approval Permission Review

```
Use ledger-rbac-workflow-auditor to review whether Project Managers should be able to approve Worker expense submissions.
```

Expected output: PM approval permission assessment, doctrine alignment, recommendation with rationale.

---

### 4. New Role Introduction

```
Use ledger-rbac-workflow-auditor to define RBAC boundaries for a new Supplier role being added to the platform.
```

Expected output: Proposed permission matrix for Supplier role, conflicts with existing roles, recommended boundaries.

---

### 5. Multi-Tenant Isolation Review

```
Use ledger-rbac-workflow-auditor to verify that Project Manager scoping prevents cross-job data access.
```

Expected output: Scoping boundary review, isolation risks, required data filters.

---

## COWORK EXAMPLES

```
@ledger-rbac-workflow-auditor Can a Worker see the total cost of their timesheet after approval?
```

```
@ledger-rbac-workflow-auditor Should Clients be able to see worker names on job reports?
```

```
@ledger-rbac-workflow-auditor Review the permission model for bulk approval actions.
```

---

## MULTI-AGENT EXAMPLES

### RBAC + Financial Doctrine Review

```
1. ledger-financial-doctrine-guardian → Financial flows and approval requirements
2. ledger-rbac-workflow-auditor → Which roles interact with those flows and with what permissions
```

### Full Compliance Review

```
1. ledger-financial-doctrine-guardian → Financial doctrine compliance
2. ledger-rbac-workflow-auditor → RBAC compliance
3. ledger-test-architect → Generate RBAC and doctrine test cases
```

---

## SEQUENTIAL WORKFLOW EXAMPLES

### New Actor Introduction

```
Step 1: ledger-product-manager
  Input: "We want to add a Field Supervisor role between PM and Worker."
  Output: Programme alignment, scope definition, impact on existing programmes

Step 2: ledger-rbac-workflow-auditor
  Input: Product Manager output + proposed Field Supervisor capabilities
  Output: RBAC design, permission boundaries, conflicts with existing roles

Step 3: ledger-financial-doctrine-guardian
  Input: RBAC output + any financial data the Field Supervisor would access
  Output: Financial doctrine compliance for the new role

Step 4: ledger-test-architect
  Input: RBAC output + Guardian output
  Output: RBAC test cases for the new role
```

---

## ZERO-TOLERANCE QUICK REFERENCE

These are always violations. Flag immediately:

| Scenario | Verdict |
|---|---|
| Worker sees any pay rate | VIOLATION — halt |
| Worker sees invoice totals | VIOLATION — halt |
| Client sees other clients' jobs | VIOLATION — halt |
| Client sees worker details | VIOLATION — halt |
| Worker approves any submission | VIOLATION — halt |
| PM accesses platform-wide BI | VIOLATION — halt |

---

## EXPECTED TURNAROUND

This skill produces a structured RBAC assessment. It does not produce code. It produces the access control analysis that governs implementation.

Output length: Medium (500–1500 words depending on scope).

Role review table is mandatory and must appear in every output.

When a Critical violation is found, it appears before any other sections.
