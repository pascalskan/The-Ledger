# EXAMPLES: ledger-architect

---

## TYPICAL INVOCATIONS

### 1. New Module Review

```
Use ledger-architect to review the proposed architecture for the Finance Hub module.
```

Expected output: Assessment of module placement, state management approach, doctrine compliance, dependencies, and recommendations.

---

### 2. Refactor Review

```
Use ledger-architect to review whether moving expense state from local component state to a Zustand store is architecturally sound.
```

Expected output: Validation of the pattern against existing Zustand conventions, risk assessment, placement recommendation.

---

### 3. Doctrine Audit

```
Use ledger-architect to audit the Review Centre implementation for doctrine compliance.
```

Expected output: Doctrine review for all four mandatory doctrines with explicit COMPLIANT / AT RISK / VIOLATION status.

---

### 4. Integration Design Review

```
Use ledger-architect to review how the Accounting Sync module should integrate with the existing approval workflow.
```

Expected output: Integration pattern, dependency mapping, audit trail requirements, risk assessment.

---

### 5. Backend Architecture Planning

```
Use ledger-architect to produce an initial structural assessment for beginning backend architecture.
```

Expected output: Assessment of frontend architecture as the baseline, recommended backend module structure, key doctrine enforcement points in the backend layer.

---

## COWORK EXAMPLES

```
@ledger-architect Review this proposed component structure for the Client Portal.
```

```
@ledger-architect Is placing job financial totals in a shared Zustand store architecturally correct?
```

```
@ledger-architect Does this implementation violate the Audit Doctrine?
```

---

## MULTI-AGENT EXAMPLES

### Architecture + Doctrine Double-Check

```
1. ledger-architect → Architecture assessment and doctrine review
2. ledger-financial-doctrine-guardian → Financial doctrine deep-dive on flagged areas
```

### Full Pre-Implementation Review

```
1. ledger-product-manager → Scope and dependency assessment
2. ledger-architect → Architecture validation and doctrine review
3. ledger-financial-doctrine-guardian → Financial controls review
4. ledger-rbac-workflow-auditor → RBAC and permission review
5. ledger-test-architect → Test plan for new architecture
```

---

## SEQUENTIAL WORKFLOW EXAMPLES

### Reviewing a Proposed New Domain

```
Step 1: ledger-architect
  Input: "We want to add a Supplier Payments domain that tracks purchase orders and supplier invoices."
  Output: Module placement recommendation, state architecture, doctrine compliance, dependency map

Step 2: ledger-financial-doctrine-guardian
  Input: Architect output + proposed financial flows
  Output: Approval workflow requirements, audit requirements, financial integrity controls

Step 3: ledger-rbac-workflow-auditor
  Input: Architect output + proposed actor interactions
  Output: RBAC design for supplier role, permission boundaries, workflow gates
```

---

## EXPECTED TURNAROUND

This skill produces a structured architectural assessment. It does not produce code. It produces the foundation for safe implementation.

Output length: Medium to long (800–2000 words depending on complexity).

Doctrine review section is mandatory and must appear in every output.
