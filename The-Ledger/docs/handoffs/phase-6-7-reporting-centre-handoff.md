# Phase 6.7 — Executive Reporting & Export Centre
## Handoff Document

**Date:** 2026-06-03  
**Branch:** `feature/phase-6-7-reporting-centre`  
**Status:** Complete — awaiting local build + Playwright verification

---

## Architecture Summary

Phase 6.7 converts Ledger intelligence into executive reporting outputs. It is a read-only layer that aggregates from analyticsEngine, executiveCommandEngine, workflowEngine, automationGovernanceEngine, financialControlsEngine, and reconciliationEngine. No financial mutations, approvals, or governance overrides are possible from this layer.

### Reporting Doctrine
- Reports may: aggregate, summarise, present, export
- Reports may NEVER: approve, modify, create financial mutations, bypass governance
- All report generation, view, and archive actions are immutably audited
- CEO only

---

## Files Added

| File | Purpose |
|------|---------|
| `client/src/lib/reportingEngine.ts` | Report engine — types, seeded data, generation functions, audit integration |
| `client/src/pages/reporting-centre.tsx` | Reporting Centre page (route: `/reporting-centre`, CEO only) |
| `tests/doctrine/reporting-centre.spec.ts` | 40 doctrine tests (RC-01 to RC-40) |
| `docs/handoffs/phase-6-7-reporting-centre-handoff.md` | This file |

---

## Files Modified

| File | Change |
|------|---------|
| `client/src/App.tsx` | Added `/reporting-centre` route importing `ReportingCentrePage` (CEO only) |
| `client/src/components/layout.tsx` | Added "Reporting Centre" nav item with `data-testid="nav-reporting-centre"` |
| `client/src/pages/dashboard.tsx` | Added Executive Reports Widget (`data-testid="dashboard-executive-reports-widget"`) |
| `client/src/pages/executive-command-centre.tsx` | Added Reporting Snapshot section and `exec-nav--reporting-centre` nav link |

---

## Reporting Engine (`reportingEngine.ts`)

### Types
- `ReportType` — 6 types: executive_summary, board_report, governance_report, financial_health_report, operations_report, monthly_kpi_report
- `ReportStatus` — draft | generated | archived
- `ReportPeriod` — this_week, this_month, last_month, this_quarter, last_quarter, ytd
- `ReportRecord` — full report with sections, KPI snapshot, risk/forecast/governance summaries
- `ReportingAuditEntry` — immutable audit record per action
- `ReportingSummary` — aggregate counts

### Seeded Reports (8 reports)
- `rpt-001` — Executive Summary June 2026 (generated)
- `rpt-002` — Board Report Q2 2026 (generated)
- `rpt-003` — Governance Report June 2026 (generated)
- `rpt-004` — Financial Health Report June 2026 (generated)
- `rpt-005` — Operations Report June 2026 (generated)
- `rpt-006` — Monthly KPI Report May 2026 (generated)
- `rpt-007` — Board Report Q1 2026 (archived)
- `rpt-008` — Executive Summary Draft July 2026 (draft)

### Public API
- `getAllReports()`, `getReportById()`, `getReportsByStatus()`, `getReportsByType()`
- `computeReportingSummary()` — total, generated, draft, archived, thisMonth
- `generateExecutiveSummary()`, `generateBoardReport()`, `generateGovernanceReport()`, `generateFinancialHealthReport()`, `generateOperationsReport()`, `generateMonthlyKPIReport()`
- `archiveReport()` — status change + audit
- `recordReportViewed()` — audit only
- `getReportingAuditLog()` — returns immutable audit history

---

## Reporting Centre Page (`reporting-centre.tsx`)

### Key data-testids
- `reporting-centre-page` — page root
- `reporting-doctrine-notice` — doctrine banner
- `reporting-kpi-strip` — KPI container
- `reporting-kpi-total`, `reporting-kpi-generated`, `reporting-kpi-draft`, `reporting-kpi-archived`, `reporting-kpi-this-month`
- `reports-table` — table container
- `report-row-{id}` — each report row
- `report-view-btn-{id}` — view button per row
- `report-archive-btn-{id}` — archive button (non-archived only)
- `reporting-status-filter` — filter container
- `filter-status-all`, `filter-status-generated`, `filter-status-draft`, `filter-status-archived`
- `report-detail-dialog` — detail dialog
- `report-detail-exec-summary`, `report-detail-kpi-snapshot`, `report-detail-risk-summary`, `report-detail-forecast-summary`, `report-detail-governance-summary`
- `report-detail-doctrine-notice`
- `report-detail-archive-btn`, `report-detail-close-btn`
- `report-deeplink-{section.id}` — deep link buttons per section
- `report-builder-dialog` — builder dialog
- `builder-type-{type}` — type selection buttons
- `builder-period-{period}` — period selection buttons
- `builder-section-{id}` — section toggle buttons
- `builder-generate-btn` — generate button
- `reporting-centre-build-btn` — opens builder

---

## Dashboard Integration

- `dashboard-executive-reports-widget` — widget container
- `dashboard-reports-widget-open-btn` — navigates to /reporting-centre
- `dashboard-reports-kpi-total`, `dashboard-reports-kpi-generated`, `dashboard-reports-kpi-draft`, `dashboard-reports-kpi-archived`, `dashboard-reports-kpi-this-month`
- `dashboard-reports-latest-list`, `dashboard-report-item-{id}`

---

## Executive Command Centre Integration

- `exec-reporting-snapshot` — snapshot section
- `exec-reporting-link` — link to reporting centre
- `exec-nav--reporting-centre` — module navigation button
- `exec-report-item-{id}` — per-report item in snapshot

---

## Deep Links

| Section ID | Route |
|------------|-------|
| `exec_overview` / `exec` | `/executive-command-centre` |
| `risk_section` / `risk` | `/analytics-centre` |
| `board_financial` / `fin_controls` / `fin` | `/financial-explorer` or `/reconciliation-center` |
| `board_governance` / `gov_automation` / `gov` | `/automation-governance` |
| `gov_workflow` / `ops_workflows` / `wf` | `/workflows` |
| `ops_automations` | `/automations` |
| `fin_reconciliation` | `/reconciliation-center` |
| `kpi_health` | `/analytics-centre` |

---

## RBAC

| Role | Access |
|------|--------|
| CEO | Full access |
| Project Manager | Denied (UnauthorizedPage rendered) |
| Worker | Denied |
| Client | Denied |

---

## Doctrine Tests — RC-01 to RC-40

- RC-01 to RC-05: RBAC — CEO access, PM denied, header badge, doctrine notice
- RC-06 to RC-10: KPI strip — all 5 cards
- RC-11 to RC-15: Reports table — seeded reports, view/archive buttons, status filters
- RC-16 to RC-22: Report detail dialog — all sections, doctrine notice
- RC-23 to RC-26: Archive and dialog dismiss
- RC-27 to RC-30: Report builder — type/period selection, generate
- RC-31 to RC-33: Dashboard widget — KPIs, open button
- RC-34 to RC-36: ECC integration — snapshot, link, nav
- RC-37 to RC-38: Deep linking — governance and financial
- RC-39 to RC-40: Reporting doctrine — no mutation controls

---

## Risks

- In-memory state: reports are stored in module-level state. Playwright tests that archive in one test may affect report counts in subsequent tests within the same session. Tests are written to be resilient to this (using `.first()` selectors and not asserting exact counts).
- `rpt-001` is archived in RC-23 — RC-24 relies on a different report for the archive button test (uses `.first()`).

---

## Recommended Next Phase

Phase 6.8 or Phase 7.0 — Export Centre: PDF/CSV export of report data, scheduled report delivery, or advanced filtering and search across the report archive.
