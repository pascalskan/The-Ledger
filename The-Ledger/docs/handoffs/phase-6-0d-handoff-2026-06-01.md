# Phase 6.0D — Automation Governance & Financial Safety Controls

**Handoff Date:** 2026-06-01  
**Branch:** `feature/phase-6-0d-automation-governance`  
**Merge Target:** `main`  
**Status:** Implementation complete — awaiting local Playwright verification before merge

---

## Summary

Phase 6.0D delivers the Automation Governance Centre: a CEO-only oversight dashboard that provides risk classification, compliance monitoring, exception management, and financial safety controls over all automation rules in The Ledger.

---

## Files Added

| File | Purpose |
|------|--------|
| `client/src/lib/automationGovernanceEngine.ts` | Full governance engine: types, seed data, helpers, CEO actions, audit trail |
| `client/src/pages/automation-governance.tsx` | Automation Governance Centre page (CEO only) |
| `tests/doctrine/automation-governance.spec.ts` | 26 doctrine tests (AG-01 to AG-26) |
| `docs/handoffs/phase-6-0d-handoff-2026-06-01.md` | This handoff document |

---

## Files Modified

| File | Change |
|------|--------|
| `client/src/App.tsx` | Added `/automation-governance` route (CEO only) |
| `client/src/components/layout.tsx` | Added Automation Governance CEO sidebar nav item |
| `docs/LEDGER_CANONICAL_CONTEXT.md` | Phase 6.0D marked complete |

---

## Engine: automationGovernanceEngine.ts

### Types
- `AutomationRiskLevel` — `Low | Medium | High | Critical`
- `AutomationGovernanceStatus` — `Compliant | Requires Review | Restricted | Suspended`
- `AutomationGovernanceRecord` — full governance record with risk, safeguards, execution stats
- `AutomationExceptionRecord` — exception queue entry with type, severity, status
- `GovernanceAuditEntry` — immutable audit record for every CEO action

### Seed Data
- 6 governance records (`rule-001` to `rule-006`) spanning all risk levels and statuses
- 3 seed exceptions (`gex-001` to `gex-003`) covering Open, Under Investigation, Resolved states
- 4 seed audit entries (`gov-audit-001` to `gov-audit-004`)

### Helpers
- `computeGovernanceSummary()` — KPI calculations
- `filterGovernanceByStatus/Risk/Category()` — table filtering
- `searchGovernanceRecords()` — fuzzy search
- `restrictAutomation()` / `suspendAutomation()` / `restoreAutomation()` / `markCompliant()` — CEO governance actions
- `resolveException()` / `rejectException()` / `escalateException()` — exception workflows
- `getGovernanceAuditLog()` / `searchGovernanceAudit()` / `filterAuditByRiskImpact()` — audit access

---

## Page: Automation Governance Centre (`/automation-governance`)

### KPI Strip (7 cards)
- `gov-kpi-total` — Total Automations
- `gov-kpi-compliant` — Compliant
- `gov-kpi-requires-review` — Requires Review
- `gov-kpi-restricted` — Restricted
- `gov-kpi-suspended` — Suspended
- `gov-kpi-high-risk` — High Risk
- `gov-kpi-critical-risk` — Critical Risk

### Tab 1 — Governance Dashboard
- Search (`gov-search`)
- Risk filter (`gov-filter-risk`)
- Status filter (`gov-filter-status`)
- Category filter (`gov-filter-category`)
- Table with per-row testids (`gov-row-{ruleId}`)
- View button (`gov-btn-view-{ruleId}`)
- Governed badge for financially sensitive rules (`gov-governed-badge-{ruleId}`)

### CEO Actions Dialog (`gov-detail-dialog`)
- Restrict (`gov-btn-restrict`)
- Suspend (`gov-btn-suspend`)
- Restore (`gov-btn-restore`)
- Mark Compliant (`gov-btn-mark-compliant`)
- Financial safety indicators: `gov-governed-badge`, `gov-approval-protected`, `gov-financial-safeguard`

### Tab 2 — Exceptions
- Exception table (`gov-exceptions-table`) with rows `gov-ex-row-{id}`
- View button `gov-ex-btn-view-{id}`
- Exception detail dialog (`gov-exception-detail-dialog`)
- Resolve (`gov-btn-resolve-exception`), Reject (`gov-btn-reject-exception`), Escalate (`gov-btn-escalate-exception`)

### Tab 3 — Compliance Audit
- Audit table (`gov-audit-table`)
- Doctrine notice (`gov-audit-doctrine-notice`) — immutable read-only declaration
- Search (`gov-audit-search`)
- Risk impact filter (`gov-audit-filter-risk`)
- Rows `gov-audit-row-{id}`

---

## Tests Added

File: `tests/doctrine/automation-governance.spec.ts`

| ID | Description |
|----|-------------|
| AG-01 | Page loads for CEO |
| AG-02 | CEO navigates via sidebar |
| AG-03 | KPI strip renders all 7 cards |
| AG-04 | KPI values match seed data |
| AG-05 | All 3 tabs render and are clickable |
| AG-06 | Governance records table visible with seed data |
| AG-07 | Risk badges visible |
| AG-08 | Governance status badges visible |
| AG-09 | Search filters by name |
| AG-10 | Risk filter works |
| AG-11 | Status filter works |
| AG-12 | Detail dialog opens on View |
| AG-13 | Restrict action updates status and generates audit |
| AG-14 | Suspend action updates status |
| AG-15 | Restore action updates status |
| AG-16 | Mark Compliant action works |
| AG-17 | Exception queue renders with seed exceptions |
| AG-18 | Exception detail panel opens |
| AG-19 | Resolve exception changes status |
| AG-20 | Reject exception closes dialog |
| AG-21 | Compliance audit table renders |
| AG-22 | Compliance audit search filters |
| AG-23 | Governed badge visible for FinanciallySensitive rules |
| AG-24 | Approval Protected and Financial Safeguard shown in detail |
| AG-25 | PM denied access |
| AG-26 | Worker denied access |

**New tests:** 26  
**Prior count:** 173  
**Target total:** 199

---

## Verification Status

Implementation complete. All files committed to branch.

Build and Playwright results are **pending local verification**.

Run locally:
```bash
cd The-Ledger
npm run build
npx playwright test
```

Expected: `199 / 199 PASSING`

---

## Governance Doctrine Notes

- Governance NEVER weakens existing safeguards
- All CEO actions generate immutable audit entries
- No silent overrides, no silent approvals
- FinanciallySensitive automations always display safeguard indicators
- RBAC enforced at route level (CEO only via `ProtectedRoute`)
- Audit tab is read-only — no edit or delete operations permitted

---

## Remaining Roadmap

Next target (post-merge): Phase 6.0E — Automation Scheduler

Deliverables:
- Schedule trigger type in TRIGGER_CATALOGUE
- Cron expression builder UI
- Next-run preview
- Schedule audit trail

---

## PR

Branch: `feature/phase-6-0d-automation-governance`  
Target: `main`  
Do NOT merge until local Playwright verification passes.
