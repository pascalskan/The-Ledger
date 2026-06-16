# UX-6.2 — AUTOMATION CATALOGUE REDESIGN — HANDOFF

Date: June 16, 2026
Branch: `feature/ux6-automation-hub` (UX-6 series branch; 6.2 builds on 6.1)
Status: **COMPLETE** — build verified. Full Playwright suite to be run by the repository owner locally.

---

## Summary

UX-6.2 transforms the Automation Rules tab of `/automations` into an executive **Automation Catalogue**: rich per-rule metadata joined from the governance and scheduler engines, with multi-dimensional search, advanced filtering, sorting, and an enriched detail dialog. Behaviour is unchanged — purely a catalogue/discoverability layer. Builder, governance, scheduler, and audit integrations are untouched; all rule actions (edit / duplicate / archive / enable / disable) remain wired to their engines. Existing rules-tab testIds are preserved so prior doctrine tests continue to pass.

## Deliverables

1. **Enhanced catalogue table** — joins each rule with its governance record and linked schedule. Columns: Automation (number + name + inline indicator badges), Category, Trigger, Status, Governance (status + risk), Success Rate, Total Runs, Last Execution, Next Execution, Last Modified, View. Secondary columns progressively hidden (`md`/`lg`/`xl`) to avoid overcrowding; horizontal scroll fallback.
2. **Improved search** — name, description, trigger label, trigger type, category, rule number, rule id, and schedule number; updates dynamically.
3. **Advanced filtering** — Status, Category, Governance status, Financially Sensitive, Scheduled vs Event-driven, Risk level. All compose with each other and with search. Live "N of M" count.
4. **Sorting** — Name, Last Execution, Next Execution, Success Rate, Total Executions, Last Modified, with an ascending/descending toggle. Nulls always sort last. Sorting preserves active filters.
5. **Rich status indicators** — Active / Disabled / Draft / Archived (rule status), Governance status + Risk-level badges, Financially Sensitive, Approval Protected, Scheduled, and a Paused badge when the linked schedule is paused.
6. **Executive detail preview** — the existing Rule Detail dialog gains three new read-only sections: Execution Statistics (total runs, success rate, last/next execution), Schedule (number, summary, status), and Governance Status (status + risk + approval-protection + rationale). Existing sections and action buttons are unchanged.

## Files Created

- `client/src/components/automation/AutomationCatalogue.tsx` — catalogue table + controls; exports the pure `buildCatalogueRows()` join helper (reused by the detail dialog) and the `CatalogueRow` type.
- `tests/doctrine/automation-catalogue.spec.ts` — 20 doctrine tests (CAT-01…CAT-20): render, indicators, search (name/number/trigger), filters (status/category/governance/risk), filter+filter and filter+search composition, sorting (default, direction toggle, key change, preserves filters), enriched detail dialog, preserved enable/disable action, empty state.

## Files Modified

- `client/src/pages/automations.tsx`
  - Rules tab now renders `<AutomationCatalogue rules={rules} onView={setSelectedRule} />`; the old inline search/filter/table markup and its now-unused state (`ruleSearch`, `statusFilter`, `categoryFilter`, `filteredRules`) and engine imports (`searchRules`, `filterRulesByStatus`, `filterRulesByCategory`) were removed.
  - `RuleDetailDialog` enriched with Execution Statistics / Schedule / Governance sections (joined via `buildCatalogueRows([rule], …)`); dialog made scrollable (`max-h-[90vh] overflow-y-auto`). New governance/scheduler label-map imports added.

## Verification Results

- Build (`npm run build`): **PASS**.
- `tsc --noEmit`: no errors in any UX-6.2-touched file (pre-existing repo-wide errors in untouched files remain; the project gate is the Vite build).
- Playwright: 20 new tests authored (deterministic). Backward-compat preserved — Automation Centre suite testIds (`aut-rules-table`, `aut-rule-row-*`, `aut-btn-view-*`, `aut-status-*`, `aut-category-*`, `aut-rule-detail-*`, enable/disable) all retained. Full-suite run pending the owner's local run.

## Doctrine Compliance

- **Approval / Review Centre / Financial Integrity:** untouched — the catalogue reads engine truth; it creates nothing, approves nothing, mutates no financial records.
- **Automation Builder / Governance / Scheduler / Audit:** semantics unchanged; governance status, risk, approval-protection and schedules are surfaced (never weakened or hidden). Rule actions still flow through the existing engine functions.
- **Job Attribution / RBAC:** unchanged — inherits the CEO-only gating of `/automations`.

## Outstanding Work / Next Steps

- Owner: run the full Playwright suite locally and confirm green.
- Future UX-6 increments (same branch): scheduler tab polish and automation deep-link re-pointing as the hub redesign continues.
