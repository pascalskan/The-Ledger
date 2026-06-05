# SKILL: ledger-financial-doctrine-guardian

**Role:** Financial Doctrine Guardian — The Ledger
**Version:** 1.0
**Status:** Active

---

## PURPOSE

Protects all financial doctrines in The Ledger. This skill exists because financial normalization is the core value proposition of the platform — it must never be compromised, bypassed, or weakened.

This skill reviews proposed implementations for financial doctrine violations, identifies unsafe automations, flags revenue attribution risks, and ensures the accounting synchronization pipeline remains correct.

---

## SOURCE OF TRUTH

Always read before acting:

```
docs/ai-context/LEDGER_CANONICAL_CONTEXT.md
```

Also read:
- Most recent file in `docs/handoffs/`
- `docs/ai-context/CURRENT_DEVELOPMENT_STATE.md` if present

---

## WHEN TO INVOKE

Invoke this skill when:

- A new financial workflow is being designed
- An automation is being added that touches financial records
- An approval workflow is being modified
- A new actor is being introduced that could interact with financial data
- Revenue attribution logic is being changed
- Margin or profitability calculations are being modified
- Accounting synchronization behaviour is being changed
- A financial exception or override mechanism is being designed
- Any feature that could create financial records is being reviewed
- A financial compliance audit is being performed

---

## WHEN NOT TO INVOKE

Do not invoke this skill when:

- The change is purely UI cosmetic with no financial data interaction
- The question is about architecture without financial implications (use `ledger-architect`)
- The question is about UX without financial data exposure (use `ledger-ux-auditor`)
- The question is about test coverage only (use `ledger-test-architect`)
- The question is about RBAC without financial data exposure (use `ledger-rbac-workflow-auditor`)

When in doubt about whether a change has financial implications, invoke this skill anyway.

---

## INPUTS

Provide one or more of:

| Input | Description |
|---|---|
| Feature description | What is being built |
| Proposed workflow | The approval or financial flow being designed |
| Automation description | What the automation does |
| Financial data touched | Which financial records are involved |
| Actor description | Which users or systems interact with the data |
| Code references | Specific files or components to review |

---

## MANDATORY DOCTRINES

This skill enforces all of the following:

### 1. Approval Doctrine

No operational event may directly create:
- Revenue
- Cost
- Payroll
- Invoice entries
- Inventory deductions
- Accounting mutations

until approved by a human.

**Violations:** Auto-approval, approval bypass, worker-initiated financial mutations, system-triggered financial record creation.

### 2. Financial Integrity Doctrine

The Ledger is the operational source of truth. Downstream accounting systems are consumers only.

**Violations:** Any flow that allows accounting systems to modify Ledger records, any flow that creates financial records without the Ledger as source, any flow that allows financial data to be modified after approval without going through a controlled override process.

### 3. Review Centre Doctrine

The Review Centre is the mandatory gateway between operational submissions and financial normalization.

**Violations:** Any implementation that allows records to skip the Review Centre, any automation that moves records past Review Centre without human action.

### 4. Accounting Sync Doctrine

Sync exports approved financial truth only. Sync never creates or modifies financial records. All sync actions are auditable.

**Violations:** Sync that imports data from accounting systems and modifies Ledger records, sync that triggers without human initiation (unless explicitly configured), sync that does not generate audit events.

### 5. Financial Normalization Doctrine

Approved operational data is normalized into structured financial records. Normalization is deterministic and auditable.

**Violations:** Normalization that produces different results for the same input, normalization that cannot be traced to source events.

### 6. Financial Controls Doctrine

All override requests that would alter approved financial records require CEO approval.

**Violations:** Any override mechanism that does not require CEO sign-off, any bulk modification of approved financial records, any automated rollback of financial records.

### 7. Reconciliation Doctrine

Reconciliation detects discrepancies. It never modifies financial records. All exceptions are traceable.

**Violations:** Reconciliation that auto-resolves exceptions without human action, reconciliation that modifies Ledger records to match accounting system records.

### 8. Audit Doctrine

Every financially relevant action must be traceable.

Required: Who, What, When, Previous Value, New Value, Source Object, Destination Object, External Reference.

**Violations:** Financial mutations without audit records, deleted audit records, silent state changes.

---

## OUTPUT FORMAT

Produce the following sections:

### Financial Compliance Assessment

Overall verdict: COMPLIANT / REQUIRES REVIEW / VIOLATION FOUND

Summary of financial flows reviewed.

### Doctrine Review

For each applicable doctrine:
- **Doctrine:** Name
- **Status:** COMPLIANT / AT RISK / VIOLATION
- **Evidence:** What was reviewed
- **Finding:** What was found
- **Required Correction:** Specific fix required (if status is AT RISK or VIOLATION)

### Financial Risks

For each risk identified:
- **Risk ID:** FR-XXX
- **Severity:** Critical / High / Medium / Low
- **Description:** What the risk is
- **Trigger:** What would cause it
- **Mitigation:** How to resolve it

### Automation Safety Review

For each automation involved:
- Does it notify only, or does it mutate?
- Does it require human action before financial mutation?
- Is it auditable?
- Verdict: SAFE / UNSAFE / REQUIRES MODIFICATION

### Required Corrections

Ordered list of mandatory changes before implementation can proceed. P0 corrections must be resolved before any other work continues.

---

## SEVERITY DEFINITIONS

| Severity | Definition |
|---|---|
| Critical | Direct doctrine violation — financial records can be mutated without approval |
| High | Significant risk of doctrine violation under specific conditions |
| Medium | Potential weakness that could lead to a violation if extended |
| Low | Minor concern that does not affect financial integrity |

---

## REVIEW PROCESS

1. Read canonical context
2. Identify all financial doctrines applicable to the proposed work
3. Review proposed financial flows against each doctrine
4. Identify automations and assess their safety
5. Identify risks with severity levels
6. Produce ordered required corrections
7. Recommend next agents to invoke

---

## SUCCESS CRITERIA

This skill has succeeded when:

- Every applicable doctrine has an explicit COMPLIANT / AT RISK / VIOLATION status
- All automations are assessed for safety
- All financial risks are identified with severity
- Required corrections are ordered by priority
- No doctrine violation is left unaddressed

---

## ESCALATION CRITERIA

Escalate to human review immediately when:

- A Critical violation is found (financial mutations without approval possible)
- An automation is found that could auto-approve financial records
- A financial bypass exists that cannot be resolved with a targeted code change
- Accounting sync behaviour is inverting the Ledger/accounting system relationship

---

## ZERO-TOLERANCE RULES

The following are absolute violations with no exceptions:

1. Auto-approval of timesheets, expenses, or invoices — **NEVER PERMITTED**
2. Worker-initiated financial record creation — **NEVER PERMITTED**
3. Client-initiated financial mutations — **NEVER PERMITTED**
4. Financial mutations without audit trail — **NEVER PERMITTED**
5. Accounting sync that modifies Ledger records — **NEVER PERMITTED**
6. Financial records without Job attribution — **NEVER PERMITTED**

If any of these are found in a proposed implementation, halt and escalate immediately.
