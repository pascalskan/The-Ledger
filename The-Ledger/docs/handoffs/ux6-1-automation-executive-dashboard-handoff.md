# UX-6.1 — AUTOMATION HUB EXECUTIVE DASHBOARD — HANDOFF

Date: June 16, 2026
Branch: `feature/ux6-automation-hub` (covers all UX-6 work; 6.1 is the first increment)
Status: **COMPLETE** — build verified. Full Playwright suite to be run by the repository owner locally.

---

## Summary

UX-6.1 adds a read-only **Executive Dashboard** to the top of the Automation Hub (`/automations`), so a CEO can answer "How healthy is automation across my business?" at a glance. Pure presentation layer — every value is derived from existing engine seed data. No automation engine, builder, scheduler, governance, audit, approval, or RBAC behaviour was changed. The existing KPI strip, heading (`Automation Centre`), tabs, dialogs, and all existing testIds are preserved (additive change).

## Deliverables

1. **Automation Health card** — deterministic aggregate score (`82%` → "Good") with status band + explanatory text. Gauge ring rendered via SVG.
2. **Enhanced KPI strip (8 tiles)** — Total (6), Active (4), Paused (1, schedules), Disabled (1), Success Rate (94% / 96 successful), Failed (3), Approval-Blocked (3), High-Risk / Financially Sensitive (2). Distinct `aut-exec-kpi-*` testIds (legacy `aut-kpi-*` strip untouched).
3. **Last 24 Hours summary** — completed / failures / approval-blocks / governance interventions, computed from the audit history anchored to the dataset's latest activity (seed timestamps are historical; a wall-clock window would read as empty).
4. **Requires Attention panel** — failed executions, restricted/suspended rules, high-risk rules awaiting review, approval-protected schedules, open governance exceptions. Only non-zero items shown; "All clear" empty state otherwise. No action buttons (visibility layer only).

## Health Score Formula (deterministic)

```
score = 100
  − failedExecutions × 2          (3 → 6)
  − approvalBlocked × 1           (3 → 3)   // safeguard working; weighted light
  − (restricted + suspended) × 5  (1 → 5)
  − criticalRisk × 3              (1 → 3)
  − disabledRules × 1             (1 → 1)
= 82   →  Good   (≥85 Excellent · 70–84 Good · 55–69 Fair · <55 Needs Attention)
```

Execution aggregates come from `getAllGovernanceRecords()` (total 102, successful 96, blocked 3, failed 3).

## Files Created

- `client/src/components/automation/AutomationExecutiveDashboard.tsx` — self-contained read-only dashboard; deterministic derivation helpers (`aggregateExecutions`, `computeHealthScore`, `computeLast24h`).
- `tests/doctrine/automation-executive-dashboard.spec.ts` — 12 doctrine tests (AED-01…AED-12): render, panels, health value, KPI values, last-24h, requires-attention, legacy-strip non-regression, read-only (no buttons), RBAC (CEO allowed / PM / Worker denied).
- `docs/handoffs/ux6-1-automation-executive-dashboard-handoff.md` — this document.

## Files Modified

- `client/src/pages/automations.tsx` — import + mount `<AutomationExecutiveDashboard />` between the doctrine notice and the existing KPI strip. No other change.

## Verification Results

- Build (`npm run build`): **PASS**.
- `tsc --noEmit`: no errors in any UX-6.1-touched file (pre-existing repo-wide errors in untouched files remain; the project gate is the Vite build).
- Playwright: 12 new tests authored (deterministic assertions). Full-suite run pending the repository owner's local run per the established workflow.

## Doctrine Compliance

- **Approval / Review Centre / Financial Integrity:** untouched — the dashboard creates nothing, approves nothing, and exposes no mutating control.
- **Automation Builder / Governance / Scheduler:** read-only consumption of existing engine truth; safeguards never weakened; Financially Sensitive / High-Risk automations are surfaced, never hidden.
- **Audit:** existing recorders unchanged; no new mutations introduced.
- **Job Attribution:** no attribution data created or modified.
- **RBAC:** inherits the existing CEO-only gating of `/automations` (PM/Worker denied — AED-11/12).

## Outstanding Work / Next Steps

- Owner: run the full Playwright suite locally and confirm green, then merge the UX-6 branch per the established review workflow.
- Future UX-6 increments (same branch): re-point any automation deep links to the hub as the Automation Hub redesign continues.
