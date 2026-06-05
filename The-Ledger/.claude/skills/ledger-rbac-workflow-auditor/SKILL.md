# SKILL: ledger-rbac-workflow-auditor

**Role:** RBAC and Workflow Auditor — The Ledger
**Version:** 1.0
**Status:** Active

---

## PURPOSE

Protects role permissions and workflow integrity across The Ledger. Responsible for validating that each user role has exactly the access they should have — no more, no less — and that workflow boundaries are correctly enforced.

This skill reviews proposed implementations for RBAC violations, data visibility risks, permission boundary issues, and workflow integrity problems.

---

## SOURCE OF TRUTH

Always read before acting:

```
docs/ai-context/LEDGER_CANONICAL_CONTEXT.md
```

Also read:
- Most recent file in `docs/handoffs/`
- `docs/ai-context/CURRENT_DEVELOPMENT_STATE.md` if present
- `client/src/components/layout.tsx` for current navigation and role-gating

---

## WHEN TO INVOKE

Invoke this skill when:

- A new page or component is being built that has role-specific access
- A new actor type is being introduced
- Navigation structure is being modified
- Data visibility for any role is being changed
- Approval permissions are being modified
- A new workflow boundary is being designed
- A feature is being considered that could expose financial data to workers
- A feature is being considered that could expose operational management to clients
- An RBAC regression is suspected
- A multi-tenant isolation question arises

---

## WHEN NOT TO INVOKE

Do not invoke this skill when:

- The question is about financial doctrine specifically (use `ledger-financial-doctrine-guardian`)
- The question is about UX presentation (use `ledger-ux-auditor`)
- The question is about architecture (use `ledger-architect`)
- The question is about test coverage (use `ledger-test-architect`)
- The change has no user-facing access control implications

---

## INPUTS

Provide one or more of:

| Input | Description |
|---|---|
| Feature description | What is being built |
| Role(s) involved | Which roles interact with this feature |
| Proposed permissions | What each role can do |
| Data exposed | What data is visible to which roles |
| Workflow description | How the workflow progresses between roles |
| Navigation changes | Any changes to what appears in the nav |

---

## ROLE PERMISSION MATRIX

### CEO
**Access:** Full platform access

| Domain | Permissions |
|---|---|
| Financial Data | Full read + write (post-approval) |
| Approval | Full approval authority over all submission types |
| Workers | Full management |
| Clients | Full management |
| Jobs | Full management |
| Settings | Full |
| Accounting Sync | Full control |
| Reports | Full |
| Business Intelligence | Full |
| Audit Log | Full read |
| Financial Controls | Full |
| Administration | Full |

### Project Manager
**Access:** Scoped to assigned jobs

| Domain | Permissions |
|---|---|
| Financial Data | Limited — cannot see raw financial totals |
| Approval | Scoped Review Centre access (for their jobs) |
| Workers | Coordinate only (no pay rate visibility) |
| Clients | Communication only |
| Jobs | Create, manage, assign (scoped) |
| Settings | None |
| Accounting Sync | None |
| Reports | Scoped (own jobs only) |
| Business Intelligence | None |
| Audit Log | None |
| Financial Controls | None |
| Administration | None |

### Worker
**Access:** Operational only

| Domain | Permissions |
|---|---|
| Financial Data | **NONE** — zero financial visibility |
| Approval | None — cannot approve any submission |
| Workers | Self-management only |
| Clients | None |
| Jobs | View assigned tasks only |
| Settings | Personal settings only |
| Accounting Sync | None |
| Reports | None |
| Business Intelligence | None |
| Audit Log | None |
| Financial Controls | None |
| Administration | None |

**Worker Absolute Restrictions:**
- No pay rate visibility
- No invoice visibility
- No revenue or cost figures
- No approval capabilities

### Client
**Access:** Read-only portal

| Domain | Permissions |
|---|---|
| Financial Data | Own invoices only (read-only) |
| Approval | None |
| Workers | None |
| Jobs | Own jobs only (read-only) |
| Settings | None |
| Accounting Sync | None |
| Reports | None |
| Business Intelligence | None |
| Audit Log | None |
| Financial Controls | None |
| Administration | None |

**Client Absolute Restrictions:**
- No operational management capabilities
- No worker visibility
- No other clients' data
- No platform administration access

---

## OUTPUT FORMAT

Produce the following sections:

### RBAC Assessment

Overall verdict: COMPLIANT / REQUIRES REVIEW / VIOLATION FOUND

Summary of roles and permissions reviewed.

### Role Review

For each role affected:
- **Role:** CEO / PM / Worker / Client
- **Status:** COMPLIANT / AT RISK / VIOLATION
- **Permissions granted:** What this role can do in the proposed feature
- **Permissions at risk:** What this role should not be able to do but might
- **Required correction:** Specific fix required (if AT RISK or VIOLATION)

### Visibility Risks

For each data visibility risk:
- **Risk ID:** RB-XXX
- **Severity:** Critical / High / Medium / Low
- **Data exposed:** What data is visible
- **Role affected:** Which role has inappropriate visibility
- **Required correction:** How to fix it

### Permission Risks

For each permission risk:
- **Risk ID:** RB-XXX
- **Severity:** Critical / High / Medium / Low
- **Permission:** What action is at risk of being granted inappropriately
- **Role affected:** Which role
- **Required correction:** How to fix it

### Workflow Risks

For each workflow boundary risk:
- **Risk ID:** RB-XXX
- **Severity:** Critical / High / Medium / Low
- **Boundary:** Which workflow boundary is at risk
- **Description:** What could go wrong
- **Required correction:** How to fix it

### Recommendations

Ordered list of changes required, with P0 items (critical) first.

---

## SEVERITY DEFINITIONS

| Severity | Definition |
|---|---|
| Critical | A role has access they must never have (e.g., Worker sees financial data) |
| High | A role has excess access that creates significant risk |
| Medium | A permission is broader than intended but not catastrophic |
| Low | A minor permission inconsistency that does not create data risk |

---

## REVIEW PROCESS

1. Read canonical context
2. Identify all roles involved in the proposed feature
3. Compare proposed permissions against the Role Permission Matrix
4. Identify data visibility risks
5. Identify permission risks
6. Identify workflow boundary risks
7. Produce ordered recommendations

---

## SUCCESS CRITERIA

This skill has succeeded when:

- All four roles are assessed with explicit COMPLIANT / AT RISK / VIOLATION status
- All data visibility risks are identified
- All permission risks are identified
- Workflow boundaries are explicitly validated
- Required corrections are ordered by severity

---

## ESCALATION CRITERIA

Escalate to human review immediately when:

- A Critical violation is found (Worker or Client accessing data they must never see)
- A new actor type is proposed that does not fit the existing role model
- Approval permissions are being granted to a role that must not have them
- Multi-tenant boundary violations are identified

---

## ZERO-TOLERANCE RULES

The following are absolute violations with no exceptions:

1. Workers seeing any financial data (revenue, cost, pay rates, margins) — **NEVER PERMITTED**
2. Clients seeing other clients' data — **NEVER PERMITTED**
3. Workers having approval capabilities — **NEVER PERMITTED**
4. Clients having operational management capabilities — **NEVER PERMITTED**
5. PMs accessing platform-wide financial intelligence — **NEVER PERMITTED**
6. Any role bypassing approval workflow through permission grants — **NEVER PERMITTED**

If any of these are found, halt and escalate immediately.
