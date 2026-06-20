# UX-6.8 — AUTOMATION RECOMMENDATIONS ENGINE — HANDOFF

Date: June 16, 2026
Branch: `feature/ux6-automation-hub` (UX-6 series branch; 6.8 builds on 6.1–6.7)
Status: **COMPLETE** — build verified. Full Playwright suite to be run by the repository owner locally.

---

## Summary

UX-6.8 evolves the Automation Hub from a management tool into an **intelligence tool**, proactively answering *"What should I automate next?"* and *"Where is automation underutilised?"* via an advisory **Recommendations** tab. It is **advisory only**: nothing is created or modified automatically. The "Build From Recommendation" CTA simply launches the existing Automation Builder **empty** (via the page's `openCreateBuilder`), so the CEO builds any automation themselves with every existing safeguard intact.

## Deliverables

1. **Recommendations Dashboard** — 7 KPIs: Recommendations (8), High Impact (4), Financial (3), Operational (3), Governance (2), Time Savings (25h/wk), Review Reduction (14/wk).
2. **Recommendation Engine** — new `automationRecommendationEngine.ts`: 8 curated, advisory recommendations across Review/Jobs/Asset/Invoicing/Sync/Payroll/Compliance themes, plus headline insights, summary, grouping predicates, and the opportunity score — all pure, read-only.
3. **Recommendation Cards** — title, description, category, impact, complexity, risk, est. time saved (+ review reduction), with View Details and Build actions.
4. **Prioritisation groups** — All / High Impact / Quick Wins / Financial / Governance / Operational, as filter chips with live counts (Quick Wins = 5).
5. **Automation Opportunity Score** — derived 0–100 gauge (79/100 → "Significant Opportunity") with an opportunity summary; higher score = more untapped opportunity.
6. **Executive Recommendations Feed** — rolling, executive-friendly headline insights.
7. **Recommendation Detail dialog** — business problem, proposed automation, suggested trigger/conditions/actions, estimated impact, governance considerations, financial safeguards. Informational, with the advisory-only banner.
8. **Builder integration** — "Build From Recommendation" CTA (card + dialog) opens the empty Automation Builder. No pre-creation, no prefill, no safeguard bypass.

## Opportunity Score derivation

`score = round(Σ impactWeight / (n × maxWeight) × 100)` with weights High=12 / Medium=7 / Low=3 → `76 / 96 ≈ 79`. Rating bands: ≥75 Significant · 50–74 Moderate · <50 Limited.

## Files Created

- `client/src/lib/automationRecommendationEngine.ts` — recommendation model, 8 seed recommendations, headline insights, `computeRecommendationSummary`, `computeOpportunityScore`, grouping helpers. Read-only; no create/modify/approve API.
- `client/src/components/automation/AutomationRecommendations.tsx` — the Recommendations tab (KPIs, opportunity gauge, feed, group filters, cards, informational detail dialog, builder-launch CTA).
- `tests/doctrine/automation-recommendations.spec.ts` — 12 doctrine tests (REC-01…REC-12), including explicit no-auto-creation checks.

## Files Modified

- `client/src/pages/automations.tsx` — new "Recommendations" tab (`aut-tab-recommendations` / `aut-recommendations-panel`) rendering `<AutomationRecommendations onBuild={openCreateBuilder} />`; added the component import and `Lightbulb` icon. `openCreateBuilder` already opens the builder with `editRule = null` (empty), so the CTA cannot pre-create.

## Verification Results

- Build (`npm run build`): **PASS**.
- `tsc --noEmit`: no errors in any UX-6.8-touched file (the pre-existing unrelated `reportingEngine.ts` error remains in an untouched file; the project gate is the Vite build).
- Playwright: 12 new deterministic tests authored. REC-11/REC-12 assert the builder opens **empty** and the catalogue still shows the original 6 seed rules after using a Build CTA — proving no automation is created automatically. Full-suite run pending the owner's local run.

## Doctrine Compliance

- **Advisory only:** no automatic automation creation, no governance/schedule/approval changes, no financial mutations. The CEO remains the decision maker; recommendations describe opportunities only.
- **Builder safeguards intact:** the CTA launches the existing builder empty — all builder validation, forbidden-action blocking, and financial-safeguard warnings still apply when the CEO builds.
- **RBAC:** inherits the CEO-only gating of `/automations`.

## Outstanding Work / Next Steps

- Owner: run the full Playwright suite locally and confirm green.
- Future UX-6 increments (same branch): continue hub polish; the PR for the whole UX-6 series stays open until the series is complete.
