# UX-6.6 — GOVERNANCE DASHBOARD — HANDOFF

Date: June 16, 2026
Branch: `feature/ux6-automation-hub` (UX-6 series branch; 6.6 builds on 6.1–6.5)
Status: **COMPLETE** — build verified. Full Playwright suite to be run by the repository owner locally.

---

## Summary

UX-6.6 brings governance visibility directly into the Automation Hub as a first-class **Governance** tab, answering *"Are my automations operating safely and within governance policy?"* — without leaving for the standalone Governance Centre. It is **read-only**: it derives everything from the existing governance engine (records, exceptions, audit log) and the scheduler engine, and creates/changes/removes no governance control. Restriction / suspension / review workflows and the CEO's final authority remain entirely in the Governance Centre (`/automation-governance`), which is unchanged and linked from the new tab.

## Deliverables

1. **Governance Overview KPIs** (8): Governed (6), Compliant (3), Requires Review (2), Restricted (1), Suspended (0), High Risk (1), Critical Risk (1), Exceptions (4) — from `computeGovernanceSummary` + `getAllExceptions`.
2. **Risk Distribution** — Low/Medium/High/Critical with counts, percentages, and proportion bars (Low 3 / Medium 1 / High 1 / Critical 1).
3. **Governance Attention Queue** — automations requiring review, restricted/suspended, or financially sensitive with elevated risk (rule-003, rule-004, rule-005), risk-sorted, each showing name, status, risk, category, last reviewed, action taken; opens the detail dialog.
4. **Financial Safety Monitoring** — Financially Sensitive (2), Approval Protected (2), Governed Schedules (2), Restricted/Flagged Financial (2), High-Risk Financial (2) — reinforcing the financial integrity doctrine.
5. **Governance Trend Insights** — data-driven, only-when-true lines (moved to Requires Review; restricted/suspended; compliance %; critical financial exceptions / "no violations").
6. **Enhanced Governance Detail dialog** (informational) — assessment summary, risk explanation, financial impact & safeguards, historical governance actions (+ restriction/suspension counts), exception history, and audit references. No action controls.
7. **Automation Hub integration** — risk exposure, governance posture, compliance health, and financial safeguards are now visible inside the Hub; the full Governance Centre is one click away.

## Files Created

- `client/src/components/automation/AutomationGovernanceDashboard.tsx` — the Governance tab (KPIs, risk distribution, attention queue, financial safety, trend insights, informational detail dialog).
- `tests/doctrine/automation-governance-dashboard.spec.ts` — 10 doctrine tests (GOV-01…GOV-10).

## Files Modified

- `client/src/pages/automations.tsx` — new "Governance" tab (`aut-tab-governance` / `aut-governance-panel`) rendering `<AutomationGovernanceDashboard />`; added the component import. Used the already-imported `ShieldAlert` icon.

## Verification Results

- Build (`npm run build`): **PASS**.
- `tsc --noEmit`: no errors in any UX-6.6-touched file. (A pre-existing, unrelated error in `client/src/lib/reportingEngine.ts` remains in an untouched file; the project gate is the Vite build, which passes.)
- Playwright: 10 new deterministic tests authored. Existing Governance Centre (`/automation-governance`) untouched; existing hub tab testIds preserved. Full-suite run pending the owner's local run.

## Doctrine Compliance

- **Governance / restriction / suspension / review workflows:** unchanged — the dashboard only reads engine state; it exposes no restrict/suspend/mark-compliant control. CEO remains the final authority (Governance Centre).
- **Audit / Approval / Financial Controls:** preserved — read-only; no records, mutations, or audit entries created. Financial safeguards are surfaced, never weakened.
- **RBAC:** inherits the CEO-only gating of `/automations`.

## Outstanding Work / Next Steps

- Owner: run the full Playwright suite locally and confirm green.
- Future UX-6 increments (same branch): continue hub polish; the PR for the whole UX-6 series stays open until the series is complete.
