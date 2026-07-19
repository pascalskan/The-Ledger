# EXAMPLES: ledger-ux-auditor

---

## TYPICAL INVOCATIONS

### 1. Post-Implementation UX Review

```
Use ledger-ux-auditor to review the UX of the newly implemented Reporting Centre for the CEO role.
```

Expected output: Five-dimension score, findings with severity levels, navigation assessment, workflow assessment, ordered recommendations.

---

### 2. Navigation Audit

```
Use ledger-ux-auditor to audit the current navigation structure and identify any misplaced items or unclear labels.
```

Expected output: Section-by-section navigation review, label clarity assessment, placement recommendations.

---

### 3. Mobile Audit

```
Use ledger-ux-auditor to assess the mobile experience for Worker role users submitting timesheets in the field.
```

Expected output: Mobile-specific UX score, touch target review, workflow friction analysis for small screens.

---

### 4. Role-Specific Audit

```
Use ledger-ux-auditor to audit the Project Manager experience from job creation to client invoice generation.
```

Expected output: End-to-end workflow assessment for the PM role, step count analysis, friction points, discoverability review.

---

### 5. Regression Check

```
Use ledger-ux-auditor to check whether the recent nav restructure introduced any UX regressions.
```

Expected output: Before/after comparison of navigation, findings for any discoverability regressions, severity-weighted recommendations.

---

## COWORK EXAMPLES

```
@ledger-ux-auditor Score the current CEO dashboard experience on all five UX dimensions.
```

```
@ledger-ux-auditor Find all navigation items that a new user would struggle to discover.
```

```
@ledger-ux-auditor Review whether the Expense submission flow has unnecessary steps.
```

---

## MULTI-AGENT EXAMPLES

### UX + Design System Review

```
1. ledger-ux-auditor → UX scores, findings, workflow assessment
2. ledger-design-system-guardian → Design consistency check on same pages
```

Combined output: Full quality review covering both UX and design system.

---

### Pre-Release UX Audit

```
1. ledger-ux-auditor → Full platform UX audit across all roles
2. ledger-design-system-guardian → Design consistency review
3. ledger-rbac-workflow-auditor → Validate no role confusion introduced
4. ledger-test-architect → Generate Playwright tests for identified UX flows
```

---

## SEQUENTIAL WORKFLOW EXAMPLES

### Full Role Experience Review

```
Step 1: ledger-ux-auditor (CEO role)
  Input: "Review the full CEO experience from login to financial approval"
  Output: UX scores, findings, workflow map, recommendations

Step 2: ledger-ux-auditor (PM role)
  Input: "Review the full PM experience from job creation to client communication"
  Output: UX scores, findings, workflow map, recommendations

Step 3: ledger-ux-auditor (Worker role)
  Input: "Review the Worker mobile experience for timesheet and expense submission"
  Output: Mobile UX scores, findings, field usability assessment

Step 4: ledger-design-system-guardian
  Input: All three role findings
  Output: Cross-role design consistency issues
```

---

## SCORE INTERPRETATION

| Score | Interpretation |
|---|---|
| 9.0 – 10.0 | Excellent — minimal improvements needed |
| 7.5 – 8.9 | Good — minor improvements recommended |
| 6.0 – 7.4 | Acceptable — several improvements needed |
| 4.0 – 5.9 | Poor — significant work required before release |
| Below 4.0 | Critical — do not release without remediation |

---

## EXPECTED TURNAROUND

This skill produces a scored audit report. It does not produce code. It produces the findings that inform UX improvements.

Output length: Medium to long (600–2000 words depending on scope of audit).

Scores section is mandatory and must appear in every output.
