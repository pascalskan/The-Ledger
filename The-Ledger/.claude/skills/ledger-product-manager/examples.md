# EXAMPLES: ledger-product-manager

---

## TYPICAL INVOCATIONS

### 1. Phase Planning

```
Use ledger-product-manager to assess what should be built next after Phase 6.8.
```

Expected output: Current State Summary showing Domain Definition Program complete, Backend Architecture Specification pending. Recommended next steps ordered by dependency.

---

### 2. Feature Proposal Assessment

```
Use ledger-product-manager to assess the proposal for a Client Invoice Approval Portal.
```

Expected output: Assessment against Client Programme, dependency on Worker/PM approval flows, scope definition, doctrine risks, recommended sequencing.

---

### 3. Gap Analysis

```
Use ledger-product-manager to identify gaps between the current CEO Programme implementation and the full CEO vision.
```

Expected output: List of completed features vs outstanding features in the CEO Programme, with priority ordering.

---

### 4. Scope Review

```
Use ledger-product-manager to review whether adding a real-time chat feature fits the current roadmap.
```

Expected output: Strategic assessment explaining this is out of scope for the current phase, risks of introducing it now, recommendation to defer.

---

### 5. Sequencing Decision

```
Use ledger-product-manager to decide whether UX Phase 4 should proceed before or after Backend Architecture begins.
```

Expected output: Dependency analysis, rationale for sequencing, recommended order.

---

## COWORK EXAMPLES

```
@ledger-product-manager What should we prioritize after Backend Architecture is complete?
```

```
@ledger-product-manager Review this feature proposal and tell me if the scope is right.
```

```
@ledger-product-manager Which user programmes are affected by this change to the Review Centre?
```

---

## MULTI-AGENT EXAMPLES

### Feature Planning Pipeline

```
1. Run ledger-product-manager to assess feature alignment and dependencies
2. Run ledger-architect to validate architectural approach
3. Run ledger-financial-doctrine-guardian to check doctrine compliance
4. Run ledger-test-architect to plan test coverage
```

### Pre-Implementation Review

```
1. ledger-product-manager → produces: scope, dependencies, risks
2. ledger-architect → produces: architecture assessment
3. ledger-rbac-workflow-auditor → produces: RBAC and permission review
4. ledger-ux-auditor → produces: UX assessment
5. ledger-design-system-guardian → produces: design consistency review
6. ledger-test-architect → produces: test plan
```

---

## SEQUENTIAL WORKFLOW EXAMPLES

### New Programme Assessment

```
Step 1: ledger-product-manager
  Input: "We want to build a Supplier Management programme"
  Output: Strategic fit, dependencies, risks, scope definition

Step 2: ledger-architect
  Input: Product Manager output + current architecture state
  Output: Architectural approach, module placement, doctrine review

Step 3: ledger-financial-doctrine-guardian
  Input: Proposed supplier financial flows
  Output: Doctrine compliance assessment, required controls

Step 4: ledger-rbac-workflow-auditor
  Input: Proposed supplier actor role
  Output: RBAC design, permission boundaries
```

---

## EXPECTED TURNAROUND

This skill produces a structured assessment. It does not produce code. It produces the foundation for other agents to work from.

Output length: Medium (500–1500 words depending on complexity).
