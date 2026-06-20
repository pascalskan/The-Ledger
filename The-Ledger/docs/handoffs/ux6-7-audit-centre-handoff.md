# UX-6.7 — AUTOMATION AUDIT CENTRE — HANDOFF

Date: June 16, 2026
Branch: `feature/ux6-automation-hub` (UX-6 series branch; 6.7 builds on 6.1–6.6)
Status: **COMPLETE** — build verified. Full Playwright suite to be run by the repository owner locally.

---

## Summary

UX-6.7 unifies The Ledger's fragmented automation audit data into one executive, read-only **Audit Centre** tab on `/automations`, answering *"What changed, who changed it, and what impact did it have?"* It normalises five existing sources — rule lifecycle, execution history, scheduler audit, governance audit, and governance exceptions — into a single feed + timeline, with KPIs, search, filters, and an immutable detail dialog. It introduces **no** edit/delete/suppression/mutation; all audit records remain immutable, read-only, and traceable.

## Unified Feed (deterministic at load)

| Source | Events |
|---|---|
| Rule lifecycle (from rule records: created provenance) | 6 |
| Execution history (`SEED_EXECUTION_HISTORY` + runtime) | 5 |
| Scheduler audit (`getScheduleAuditLog`) | 5 |
| Governance audit (`getGovernanceAuditLog`) | 4 |
| Governance exceptions (`getAllExceptions`) | 4 |
| **Total** | **24** |

Each event is enriched (by `ruleId`) with the governance record's category, risk level, governance status, financial sensitivity, and approval protection — so every row carries consistent Risk / Governance / Financial / Approval badges.

## Deliverables

1. **Executive Audit Dashboard** — 8 KPIs: Total Events (24), Rule Changes (6), Schedule Changes (5), Governance Actions (4), Execution Events (5), Approval-Blocked (1), Financially Sensitive, Exceptions (4).
2. **Unified Activity Feed** — one table across all sources with timestamp, event type (badged by category), user, automation, category, risk, and View. Covers rule created/updated/duplicated/archived, schedule created/paused/resumed/disabled, governance restricted/suspended/restored/marked-compliant, and execution success/failed/approval-blocked/governance-blocked.
3. **Audit Search** — across rule name, user, event type, automation/schedule number, audit ID, category, and audit refs.
4. **Advanced Filtering** — event category, user, risk level, governance status, financially sensitive, approval protected, and a date range (from/to) — all compose.
5. **Audit Detail dialog** — read-only: summary, timestamp, user, previous/new state, trigger source, governance + financial context, related automation/schedule, and audit references. Carries an explicit immutable-record notice.
6. **Timeline view** — a toggle that re-renders the same filtered events as a chronological, day-grouped vertical timeline with sticky date headers.
7. **Executive Insights** — data-driven, only-when-true summaries (automation changes; governance interventions / "no violations"; financially sensitive changes; schedules paused).

## Files Created

- `client/src/components/automation/AutomationAuditCentre.tsx` — the Audit Centre tab; exports the pure `buildUnifiedAuditFeed()` and the `UnifiedAuditEvent` type. Feed building, KPIs, filtering, timeline grouping, and an immutable detail dialog. Pagination (25/page) for scale.
- `tests/doctrine/automation-audit-centre.spec.ts` — 13 doctrine tests (AUDC-01…AUDC-13).

## Files Modified

- `client/src/pages/automations.tsx` — new "Audit Centre" tab (`aut-tab-audit-centre` / `aut-audit-centre-panel`) rendering `<AutomationAuditCentre />`, placed before the legacy "Automation Audit" tab (which is intentionally left intact for backward compatibility). Added the component import.

## Verification Results

- Build (`npm run build`): **PASS**.
- `tsc --noEmit`: no errors in any UX-6.7-touched file (one fixed `Map` iteration; the pre-existing unrelated `reportingEngine.ts` error remains in an untouched file; the project gate is the Vite build).
- Playwright: 13 new deterministic tests authored. The legacy Automation Audit tab and its testIds (`aut-audit-table`, `aut-audit-row-*`) are preserved. Full-suite run pending the owner's local run.

## Doctrine Compliance

- **Audit Doctrine:** records remain immutable, read-only, and traceable — the centre only reads and normalises existing data; no edit/delete/suppression/mutation exists anywhere in it.
- **Approval / Governance / Financial Integrity:** preserved — the feed surfaces approval-blocked, governance, and financially sensitive events as evidence; it actions nothing.
- **RBAC:** inherits the CEO-only gating of `/automations`.

## Outstanding Work / Next Steps

- Owner: run the full Playwright suite locally and confirm green.
- Future UX-6 increments (same branch): continue hub polish; the PR for the whole UX-6 series stays open until the series is complete.
