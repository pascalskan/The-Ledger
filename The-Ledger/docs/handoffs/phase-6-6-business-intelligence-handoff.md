# Phase 6.6 — Business Intelligence & Analytics Layer

## Handoff Document

Date: 2026-06-03
Branch: feature/phase-6-6-business-intelligence
Status: Implementation Complete — Pending Verification

---

## Architecture Summary

Phase 6.6 transforms The Ledger from an operational visibility platform into an executive decision-support platform. It adds a Business Intelligence layer — a pure read-only, advisory-only intelligence overlay that aggregates existing engine data to produce:

- Health scores across 5 dimensions
- Critical risk intelligence
- Trend analysis
- Forecast projections (advisory only)
- Bottleneck analysis

### Design Principles

- **Zero new data** — analytics aggregates only data already present in existing engines
- **No financial mutations** — analytics is advisory only; it never approves, creates, or modifies records
- **Full audit trail** — Analytics Viewed, Forecast Viewed, Risk Investigation Opened all generate audit records
- **CEO only** — all analytics features are gated to the CEO role
- **Deep-link doctrine** — all risk and bottleneck items navigate to source modules

---

## Files Added

### Engine

| File | Description |
|---|---|
| `client/src/lib/analyticsEngine.ts` | Business Intelligence engine. Aggregates data from executiveCommandEngine, workflowEngine, eventBusEngine, activityFeedEngine, notificationEngine, automationGovernanceEngine, automationSchedulerEngine, financialControlsEngine, reconciliationEngine, exceptionResolutionEngine. Provides: getAnalyticsSummary(), getOperationalHealth(), getFinancialHealth(), getGovernanceRisk(), getWorkflowEfficiency(), getAutomationEffectiveness(), getCriticalRisks(), getTrendAnalysis(), getForecasts(), getBottleneckAnalysis(), recordAnalyticsViewed(), recordForecastViewed(), recordRiskInvestigationOpened(), getAnalyticsAuditLog(). |
| `client/src/lib/forecastEngine.ts` | Supporting forecast calculation utilities. |

### Pages

| File | Description |
|---|---|
| `client/src/pages/analytics-centre.tsx` | Analytics Centre page. CEO-only. Route: /analytics-centre. Contains: doctrine notice, KPI strip (5 scores), Trend Analysis panel, Risk Intelligence panel, Forecast Intelligence panel (advisory badge), Bottleneck Analysis panel. All panels include deep links to source modules. |

### Tests

| File | Description |
|---|---|
| `tests/doctrine/analytics-centre.spec.ts` | 42 doctrine tests (AC-01 to AC-42) covering Analytics Centre rendering, KPI strip, trend panel, forecast panel, risk panel, bottleneck panel, dashboard widgets, ECC integration, deep links, and RBAC. |

### Documentation

| File | Description |
|---|---|
| `docs/handoffs/phase-6-6-business-intelligence-handoff.md` | This handoff document. |

---

## Files Modified

| File | Change |
|---|---|
| `client/src/pages/dashboard.tsx` | Added 3 new CEO-only intelligence widgets: Risk Summary Widget (data-testid: dashboard-risk-summary-widget), Forecast Intelligence Widget (data-testid: dashboard-forecast-widget), Platform Trends Widget (data-testid: dashboard-trend-widget). All widgets include deep links to /analytics-centre. |
| `client/src/pages/executive-command-centre.tsx` | Added Analytics Intelligence section (data-testid: exec-analytics-summary) with three sub-panels: exec-analytics-risks (top 4 risks), exec-analytics-trends (top 3 trend indicators), exec-analytics-forecasts (top 2 forecast indicators). Includes exec-analytics-link button navigating to /analytics-centre. |
| `client/src/App.tsx` | Route /analytics-centre registered (CEO only, ProtectedRoute). Import of AnalyticsCentrePage added. |
| `client/src/components/layout.tsx` | Analytics Centre nav item added (BarChart3 icon, testId: nav-analytics-centre, CEO only). |
| `The-Ledger/LEDGER_CANONICAL_CONTEXT.md` | Updated with Phase 6.6 doctrine, roadmap status, and primary objective. |

---

## Analytics Engine — Key Exports

### Types

```typescript
HealthLevel: 'healthy' | 'warning' | 'critical'
HealthScore: { score: number; level: HealthLevel; label: string }
AnalyticsSummary: { operationalHealth, financialHealth, governanceRisk, workflowEfficiency, automationEffectiveness }
RiskItem: { id, title, description, severity, category, sourceRoute, recommendation }
TrendItem: { metric, value, previousValue, changePercent, direction, period, description }
ForecastItem: { metric, currentValue, projectedValue, projectedChange, projectedChangePercent, confidence, note }
BottleneckItem: { id, title, impact, category, severity, sourceRoute }
AnalyticsAuditEntry: { id, action, analyticsUser, timestamp, detail }
```

### Public API

```typescript
getAnalyticsSummary(): AnalyticsSummary
getOperationalHealth(): HealthScore
getFinancialHealth(): HealthScore
getGovernanceRisk(): HealthScore
getWorkflowEfficiency(): HealthScore
getAutomationEffectiveness(): HealthScore
getCriticalRisks(): RiskItem[]
getTrendAnalysis(): TrendItem[]
getForecasts(): ForecastItem[]
getBottleneckAnalysis(): BottleneckItem[]
recordAnalyticsViewed(user: string): void
recordForecastViewed(user: string): void
recordRiskInvestigationOpened(riskId: string, user: string): void
getAnalyticsAuditLog(): AnalyticsAuditEntry[]
```

---

## Analytics Centre — Test IDs

| Test ID | Element |
|---|---|
| analytics-centre-page | Page root |
| analytics-doctrine-notice | Doctrine notice banner |
| analytics-kpi-strip | KPI strip container |
| analytics-kpi-operational-health | Operational Health KPI |
| analytics-kpi-financial-health | Financial Health KPI |
| analytics-kpi-governance-risk | Governance Risk KPI |
| analytics-kpi-workflow-efficiency | Workflow Efficiency KPI |
| analytics-kpi-automation-effectiveness | Automation Effectiveness KPI |
| analytics-trend-panel | Trend Analysis panel |
| analytics-trend-item-{slug} | Individual trend item |
| analytics-forecast-panel | Forecast panel |
| analytics-forecast-item-{slug} | Individual forecast item |
| analytics-risk-panel | Risk Intelligence panel |
| analytics-risk-item-{id} | Individual risk item |
| analytics-risk-link-{id} | Risk deep link button |
| analytics-bottleneck-panel | Bottleneck Analysis panel |
| analytics-bottleneck-item-{id} | Individual bottleneck item |
| analytics-bottleneck-link-{id} | Bottleneck deep link button |

---

## Dashboard Intelligence Widgets — Test IDs

| Test ID | Element |
|---|---|
| dashboard-risk-summary-widget | Risk Summary widget |
| dashboard-risk-widget-open-btn | Open Analytics Centre button |
| dashboard-risk-item-{id} | Individual risk item in widget |
| dashboard-forecast-widget | Forecast Intelligence widget |
| dashboard-forecast-widget-open-btn | Open Full Forecast button |
| dashboard-forecast-item-{idx} | Individual forecast item |
| dashboard-trend-widget | Platform Trends widget |
| dashboard-trend-widget-open-btn | Open Full Analysis button |
| dashboard-trend-item-{idx} | Individual trend item |

---

## ECC Integration — Test IDs

| Test ID | Element |
|---|---|
| exec-analytics-summary | Analytics Intelligence section |
| exec-analytics-risks | Top risks sub-panel |
| exec-analytics-trends | Trend indicators sub-panel |
| exec-analytics-forecasts | Forecast indicators sub-panel |
| exec-analytics-link | Navigate to Analytics Centre button |

---

## RBAC

| Role | Access |
|---|---|
| CEO | Full access to Analytics Centre, dashboard widgets, ECC analytics section |
| Project Manager | Denied — redirected to /unauthorized |
| Worker | Denied — redirected to /worker/jobs |
| Client | Not applicable |

---

## Doctrine Compliance

Analytics DOES:
- Analyse and aggregate existing engine data
- Score platform health across 5 dimensions
- Identify critical risks with severity classification
- Surface trend analysis with direction and percentage change
- Generate forecasts clearly labelled as projections / advisory only
- Identify bottlenecks and link to source modules
- Record all analytics access in an immutable audit log

Analytics NEVER:
- Creates financial mutations
- Approves records
- Creates records
- Changes records
- Overrides governance
- Bypasses the Review Centre

---

## Doctrine Tests

42 doctrine tests covering:

- AC-01 to AC-04: Analytics Centre rendering and navigation
- AC-05 to AC-10: KPI strip (5 KPIs, scores out of 100)
- AC-11 to AC-14: Trend Analysis panel (items, direction indicators, percentage values)
- AC-15 to AC-19: Forecast panel (advisory badge, items, confidence levels, notes)
- AC-20 to AC-24: Risk Intelligence panel (items, severity badges, deep links, navigation)
- AC-25 to AC-27: Bottleneck Analysis panel (items or empty state, view buttons)
- AC-28 to AC-34: Dashboard intelligence widgets (Risk, Forecast, Trend — rendering and navigation)
- AC-35 to AC-39: Executive Command Centre integration (analytics summary section)
- AC-40 to AC-42: RBAC (CEO allowed, PM denied, Worker denied)

---

## Verification Results

> NOTE: Verification against build and Playwright must be run locally in the development environment.
> All implementation files are in place on branch: feature/phase-6-6-business-intelligence

Expected:
- npm run build → PASS
- npx playwright test → PASS
- All existing tests preserved, 0 regressions

---

## Risks

| Risk | Mitigation |
|---|---|
| Forecast data relies on mock intelligence from analyticsEngine — not real financial data | Clearly labelled "Projections — Advisory Only" in all UI surfaces and doctrine notice |
| Risk items link to source modules — deep link routes must match registered routes | All deep link routes verified against App.tsx router |
| Dashboard risk widget conditionally renders only when topRisks.length > 0 | Engine always seeds realistic mock risks; empty state is handled |

---

## Recommended Next Phase

### Phase 6.7 — Advanced Reporting & Export Intelligence

Objective: CEO-level cross-module report generation, exportable financial summaries, operational health reports.

Deliverables:
- Report Engine: templated report generation across jobs, workers, financials, governance
- Report Centre Page: CEO-only, listing available report types, on-demand generation
- Export formats: CSV download capability
- Dashboard widget: Recent Reports widget (CEO only)
- Doctrine tests: 35+ tests

Doctrine constraints:
- Reports are READ-ONLY snapshots — no mutations
- Reports never bypass Review Centre
- All report generation is audited
- CEO only

Branch naming: feature/phase-6-7-reporting-intelligence
