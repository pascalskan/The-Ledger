# EXAMPLES: ledger-design-system-guardian

---

## TYPICAL INVOCATIONS

### 1. New Page Review

```
Use ledger-design-system-guardian to review the design consistency of the new Reporting Centre page.
```

Expected output: Consistency review, design debt log with severity, standardization recommendations.

---

### 2. Component Audit

```
Use ledger-design-system-guardian to audit all KPI card implementations across the platform for consistency.
```

Expected output: Per-page KPI card review, deviations from standard pattern, fix recommendations.

---

### 3. Table Standardization

```
Use ledger-design-system-guardian to verify that all table implementations use shadcn/ui Table components correctly.
```

Expected output: Table audit across all pages, non-compliant implementations, specific fixes.

---

### 4. Design Debt Assessment

```
Use ledger-design-system-guardian to produce a platform-wide design debt assessment.
```

Expected output: Full platform scan, design debt summary table, ordered remediation plan.

---

### 5. Pre-Implementation Reference

```
Use ledger-design-system-guardian to identify the correct pattern for building a new approval dialog with a confirmation step.
```

Expected output: Reference to existing dialog patterns, correct shadcn/ui components, recommended structure.

---

## COWORK EXAMPLES

```
@ledger-design-system-guardian What is the correct pattern for status badges in The Ledger?
```

```
@ledger-design-system-guardian Review this new component and tell me if it matches our design system.
```

```
@ledger-design-system-guardian Find all pages that deviate from the standard KPI card pattern.
```

---

## MULTI-AGENT EXAMPLES

### UX + Design System Combined Review

```
1. ledger-ux-auditor → UX scores and workflow findings
2. ledger-design-system-guardian → Design consistency review of same pages
```

Combined output: Full quality review covering both UX structure and visual consistency.

---

### Pre-Release Design Audit

```
1. ledger-design-system-guardian → Full platform design consistency audit
2. ledger-ux-auditor → UX audit for all four roles
3. ledger-test-architect → Generate visual regression test plan
```

---

## SEQUENTIAL WORKFLOW EXAMPLES

### New Feature Design Review

```
Step 1: ledger-architect
  Input: Proposed module architecture
  Output: Architecture assessment

Step 2: ledger-design-system-guardian
  Input: Proposed component structure and UI description
  Output: Design pattern recommendations before implementation begins

Step 3: Implementation

Step 4: ledger-design-system-guardian
  Input: Implemented page files
  Output: Post-implementation design consistency review
```

---

## PATTERN REFERENCE QUICK GUIDE

| Pattern | Where to Look |
|---|---|
| KPI cards | `client/src/pages/dashboard.tsx` |
| Data tables | `client/src/pages/review-centre.tsx` |
| Approval dialogs | `client/src/pages/review-centre.tsx` |
| Navigation | `client/src/components/layout.tsx` |
| Status badges | Any page with status columns |
| Filter bars | `client/src/pages/expenses.tsx` |
| Page headers | Any full page implementation |

---

## EXPECTED TURNAROUND

This skill produces a structured design review. It does not produce code. It produces the findings that inform design cleanup work.

Output length: Short to medium (300–1000 words depending on scope).

Design debt summary table is mandatory and must appear in every output.
