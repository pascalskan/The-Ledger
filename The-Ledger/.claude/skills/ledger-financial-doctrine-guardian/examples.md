# EXAMPLES: ledger-financial-doctrine-guardian

---

## TYPICAL INVOCATIONS

### 1. New Financial Feature Review

```
Use ledger-financial-doctrine-guardian to review the proposed Supplier Invoice workflow for doctrine compliance.
```

Expected output: Doctrine review for all applicable doctrines, automation safety assessment, required corrections.

---

### 2. Automation Safety Review

```
Use ledger-financial-doctrine-guardian to assess whether the proposed Workflow Automation rules are financially safe.
```

Expected output: Automation-by-automation safety assessment, SAFE / UNSAFE / REQUIRES MODIFICATION verdict per automation, required corrections.

---

### 3. Accounting Sync Review

```
Use ledger-financial-doctrine-guardian to review the proposed QuickBooks sync implementation.
```

Expected output: Accounting Sync Doctrine assessment, data flow review, direction of sync validation, audit trail requirements.

---

### 4. Financial Controls Review

```
Use ledger-financial-doctrine-guardian to review the proposed CEO override mechanism for approved invoices.
```

Expected output: Financial Controls Doctrine assessment, override flow review, audit requirements, CEO sign-off validation.

---

### 5. Full Financial Compliance Audit

```
Use ledger-financial-doctrine-guardian to perform a full financial compliance audit of the platform as-built.
```

Expected output: Complete doctrine review across all eight doctrines, full risk register, ordered required corrections.

---

## COWORK EXAMPLES

```
@ledger-financial-doctrine-guardian Does this automation violate the Approval Doctrine?
```

```
@ledger-financial-doctrine-guardian Can a Project Manager approve their own expense submissions?
```

```
@ledger-financial-doctrine-guardian Review this proposed reconciliation workflow for doctrine compliance.
```

---

## MULTI-AGENT EXAMPLES

### Financial Safety Pipeline

```
1. ledger-financial-doctrine-guardian → Financial doctrine compliance
2. ledger-rbac-workflow-auditor → Role permission validation for financial actors
3. ledger-test-architect → Generate doctrine test cases for identified risks
```

### Full Pre-Implementation Review (Financial Feature)

```
1. ledger-product-manager → Scope and programme alignment
2. ledger-architect → Architecture assessment
3. ledger-financial-doctrine-guardian → Financial doctrine deep-dive
4. ledger-rbac-workflow-auditor → RBAC and permission review
5. ledger-test-architect → Test plan including doctrine tests
```

---

## SEQUENTIAL WORKFLOW EXAMPLES

### Reviewing a New Payment Flow

```
Step 1: ledger-financial-doctrine-guardian
  Input: "We want to allow PMs to generate draft invoices that are auto-sent to clients on approval."
  Output: Approval Doctrine review (auto-send after approval is OK; auto-send without approval is NOT),
           Audit Doctrine requirements, Financial Controls requirements

Step 2: ledger-rbac-workflow-auditor
  Input: Guardian output + proposed PM permissions
  Output: RBAC assessment — what permissions PMs need, what must stay CEO-only

Step 3: ledger-test-architect
  Input: Guardian output + RBAC output
  Output: Doctrine test cases for approval flow, RBAC tests for invoice generation
```

---

## ZERO-TOLERANCE QUICK REFERENCE

These are always violations. Flag immediately:

| Scenario | Verdict |
|---|---|
| Automation that approves timesheets | VIOLATION — halt |
| Worker creates an invoice directly | VIOLATION — halt |
| Sync modifies Ledger records | VIOLATION — halt |
| Financial record without Job | VIOLATION — halt |
| Financial mutation without audit | VIOLATION — halt |
| Override without CEO approval | VIOLATION — halt |

---

## EXPECTED TURNAROUND

This skill produces a financial compliance assessment. It does not produce code. It produces the compliance analysis that blocks or approves financial implementation.

Output length: Medium to long (700–2000 words depending on feature complexity).

Doctrine review table is mandatory and must appear in every output.

When a VIOLATION is found, required corrections appear before any recommendations.
