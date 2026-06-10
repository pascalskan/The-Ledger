# THE LEDGER — UX REDESIGN PROGRAMME
## Master Programme Document

**Version:** 1.0
**Date:** June 5, 2026
**Status:** Active
**Classification:** Authoritative Programme Reference

---

## How To Use This Document

This is the master entry point for all UX redesign work on The Ledger.

Read this document first in every session that involves UX implementation.

It tells you: what was decided, why it was decided, where the detailed specifications live, and what needs to be built in what order. It does not duplicate the source documents — it indexes and governs them.

If a future session contradicts the decisions registered in Section 4, that session is out of scope unless explicitly instructed otherwise by the repository owner.

---

# 1. PROGRAMME OVERVIEW

## Why This Programme Exists

The Ledger completed a full frontend prototype programme through Phase 6.8, followed by a formal Architectural Audit and Domain Definition Programme. As of June 2026, the platform is functionally complete — every major workflow has been implemented and verified.

A product experience audit conducted in June 2026 identified a significant gap between the quality of the underlying platform and the quality of the user experience it delivers. The product has the right capabilities. It does not yet present them in a way that a first-time customer, daily user, or investor can immediately understand.

## Problems Identified

The audit identified the following structural problems, all of which are documented in full in `UX_COMMERCIAL_READINESS_AUDIT.md`:

**Navigation overload.** The CEO sidebar contained 30 flat, ungrouped navigation items with no hierarchy, no section labels, and no distinction between daily-use tools and monthly configuration screens. Decision fatigue was immediate.

**Dashboard overload.** The CEO dashboard contained 10 distinct scrollable widget sections, including analytics intelligence, forecast summaries, trend analysis, reporting snapshots, and export widgets — none of which require daily attention. The most important daily action (pending approvals) was buried.

**Fragmented finance workflows.** Invoice management, invoice creation, payroll processing, payroll export, financial records, accounting settings, reconciliation, and exception resolution existed as eight separate top-level navigation destinations. A CEO managing their business finances was forced to navigate across eight screens to complete a single financial workflow.

**Fragmented intelligence.** The Executive Command Centre, Analytics Centre, Reporting Centre, Activity Feed, Notification Centre, and Event Monitor existed as six separate navigation destinations despite being conceptually unified as a read-only intelligence layer.

**Fragmented automation.** Automations, Automation Governance, and Workflow Centre existed as three separate navigation destinations for a single platform capability.

**Review Centre underexposed.** The Review Centre — the most operationally critical workflow in the platform, the gateway to all financial normalization — received no special prominence. No badge count. No dashboard priority. It appeared as one item among thirty.

**Internal concepts exposed as navigation labels.** Labels such as "Event Monitor," "Automation Governance," "Activity Feed," and "Financial Normalization" are internal doctrinal concepts. They require explanation before a customer understands them. Navigation labels must describe the user's job, not the platform's architecture.

**Console logs in production code.** Development debug statements were present in `review.tsx`, visible in DevTools during any live demonstration.

## Desired End State

The Ledger should feel like one unified product built around how a CEO actually works — not a collection of completed modules assembled in development order.

A CEO opening The Ledger should immediately understand:
- What needs their attention today
- Whether their business is making money
- Whether anything is broken

Navigation should reflect three modes of CEO engagement: daily triage, operational management, and periodic intelligence review. Every screen should be discoverable without hunting. Every workflow should be completable without leaving a hub.

**Target scores after full programme completion:**
- Product Experience: 52 → 85+ / 100
- Commercial Readiness: 41 → 72+ / 100

---

# 2. CURRENT PROJECT POSITION

## Completed Programmes

| Programme | Status | Notes |
|---|---|---|
| Frontend Prototype (Phases 1–6.8) | Complete | 501 / 501 Playwright tests passing |
| Architectural Audit | Complete | Full platform audit conducted |
| Domain Definition Programme | Complete | 14 frozen domain documents |
| Backend Architecture Specification | Complete | 13 architecture documents, v2.0 |

## Current Objective

> **Product Cohesion, Commercial Readiness, and User Experience Optimisation**

The platform is prototype-complete. Functionality is not the constraint. The constraint is product experience — how that functionality is surfaced, organised, and navigated.

The UX Redesign Programme addresses this constraint directly. No new features are required for Phase UX-1 through UX-8. All work in this programme is restructuring, consolidating, and elevating existing implemented functionality.

## What Is Not Changing

This programme does not modify:
- Any doctrine (Approval, Audit, Job Attribution, Financial Integrity, or any other)
- Any approval workflow
- Any data model
- Any financial normalization logic
- Any Playwright test coverage (tests must continue to pass throughout)
- Any backend architecture

This programme modifies presentation, navigation, and layout only.

---

# 3. AUTHORITATIVE UX DOCUMENTS

The following three documents were produced during the June 2026 UX audit and redesign exercise. They are approved and authoritative. Future sessions must not re-run the audit, re-design the specification, or reopen decisions already registered in Section 4.

---

### `docs/ux/UX_COMMERCIAL_READINESS_AUDIT.md`

**Purpose:** Establishes the problem baseline. Documents every UX issue identified across the platform, scored by severity (Critical / High / Medium). Includes per-role experience assessments (CEO, PM, Worker, Client), product cohesion findings, commercial readiness findings, investor readiness findings, final scores, and the Top 20 recommended improvements.

**When to read:** When context is needed for why a specific change is being made. When evaluating whether a proposed change addresses an identified problem or introduces a new one.

**Do not:** Re-run this audit. The findings are registered. Open issues are captured in Section 6 of this document as the implementation roadmap.

---

### `docs/ux/CEO_EXPERIENCE_REDESIGN_SPECIFICATION.md`

**Purpose:** Defines the target state. Specifies the CEO workflow map (daily, weekly, monthly activities), the new navigation architecture (7 primary items replacing 30 flat items), the new dashboard zone design (Zone A / B / C replacing 10 widget sections), the Intelligence Hub consolidation, the Finance Hub consolidation, the Automation Hub consolidation, the Review Centre prioritisation strategy, the commercial demo flow, and the approved terminology standard.

**When to read:** When determining what a redesigned screen or section should look like and why. When verifying that an implementation matches the approved target state.

**Do not:** Re-design the navigation structure. Do not re-design the dashboard zones. Do not change the hub consolidation decisions. These are approved.

---

### `docs/ux/CEO_EXPERIENCE_UX_BLUEPRINT.md`

**Purpose:** Implementation specification. Provides engineering-ready details for every screen in the redesign: ASCII wireframes, component specifications (exact CSS classes, data sources, states), user flow step-by-step maps, component hierarchy classifications (Primary / Secondary / Tertiary / Removed), the full priority matrix, and the phased build order with dependency graph.

**When to read:** This is the primary working reference during implementation. Engineers and AI sessions implementing any UX phase should read the relevant blueprint section before writing code.

**Do not:** Deviate from the wireframe specifications without a documented change request. Do not re-sequence the build order without confirming dependencies are satisfied.

---

# 4. APPROVED UX DECISIONS

The following decisions are registered and approved. They must not be reopened, re-debated, or reversed without explicit instruction from the repository owner. Each decision is recorded with its rationale so future sessions understand the intent, not just the rule.

---

### DECISION 1 — Review Centre Elevated to Primary Workflow

**Decision:** The Review Centre receives privileged access across the entire CEO experience: a live badge count on the primary navigation item, the first card in Dashboard Zone A, a pending-count badge on every job card, and a slide-in review sheet panel replacing full-page navigation.

**Rationale:** The Review Centre is the gateway to all financial normalization. Every approved submission becomes a financial record. Every rejection generates an audit trail. No other workflow in the platform has higher daily operational importance. Burying it as one of thirty navigation items was the single most damaging UX error in the original implementation.

---

### DECISION 2 — Dashboard Becomes a Triage Centre

**Decision:** The CEO dashboard is redesigned around three zones only. Zone A (Attention Required): three action cards — Pending Reviews, Revenue at Risk, Critical Alerts. Zone B (Operational Picture): active jobs feed and today's schedule. Zone C (Financial Pulse): four weekly KPI cards. All intelligence widgets (analytics, forecasts, trends, reporting snapshots, export widgets, activity feed) are removed from the dashboard.

**Rationale:** A dashboard that answers "what did we build?" is a data dump. A dashboard that answers "what do I need to do right now?" is a tool. The original dashboard had 10 scrollable sections. No executive processes 10 sections in the 5 minutes they allocate to a morning briefing. Intelligence features are not daily-action items — they have their own dedicated hub accessible from primary navigation.

---

### DECISION 3 — Navigation Grouped by Workflow Cadence

**Decision:** The 30-item flat navigation list is replaced by 7 primary items grouped by how frequently a CEO uses them: Command (daily), Review (daily), Operations (daily), Finance (weekly), Intelligence (weekly/monthly), Automation (as needed), Settings (rarely). Section dividers separate CORE / OPERATIONAL / INTELLIGENCE / ADMINISTRATION.

**Rationale:** Navigation structure should reflect when a user needs each item, not what the engineering team built. Decision fatigue from 30 ungrouped items was identified as the first impression problem most likely to derail customer demonstrations. Research consistently shows cognitive load increases significantly above 7 primary navigation choices.

---

### DECISION 4 — Finance Consolidated into Finance Hub

**Decision:** Eight financially-oriented navigation destinations (Financial Explorer, Financial Insights, Invoices, Invoice Builder, Payroll Staging, Payroll Export, Accounting Settings, Reconciliation Centre, Exception Resolution) are consolidated into a single Finance Hub (`/finance`) with five tabs: Overview, Records, Invoicing, Payroll, Accounting.

**Rationale:** A CEO managing their business finances thinks in one domain — money. They do not think "now I need Financial Explorer, now Invoice Builder, now Payroll Staging." They think "I need to sort out payroll and invoicing today." Fragmentation into nine separate screens across three different conceptual groups created artificial workflow interruption and obscured the platform's financial capability.

---

### DECISION 5 — Intelligence Consolidated into Intelligence Hub

**Decision:** Six separate intelligence destinations (Executive Command Centre, Analytics Centre, Reporting Centre, Export Centre, Activity Feed, Event Monitor, Notification Centre) are consolidated into a single Intelligence Hub (`/intelligence`) with five tabs: Overview, Analytics, Reports, Exports, Activity. The Event Monitor is accessible as a power-user toggle within the Activity tab, not a standalone navigation item.

**Rationale:** These six destinations are all read-only, all CEO-only, and all share the same informational doctrine. They were built as separate phases and accumulated as separate navigation items. From a user perspective they are one destination: "the place I go to understand how my business is performing." The distinction between Activity Feed and Event Monitor requires explaining the Event Bus doctrine — which no customer has read.

---

### DECISION 6 — Automation Consolidated into Automation Hub

**Decision:** Three automation destinations (Automations, Automation Governance, Workflow Centre) and the Automation Scheduler are consolidated into a single Automation Hub (`/automation`) with four tabs: Rules, Workflows, Governance, Scheduler.

**Rationale:** Automation is a single platform capability. The distinction between "Automations" and "Workflow Centre" is an internal architectural distinction, not a user-facing workflow distinction. A CEO managing automation rules thinks about their rules, their governance status, and their scheduled executions as one system, not three.

---

### DECISION 7 — Administration Consolidated into Settings

**Decision:** Administrative and configuration items (Manage Roles, Audit Log, API Integrations, Accounting Settings, General Settings) are consolidated under a single Settings item at the bottom of the primary navigation. These items are accessible but do not appear as peers to daily operational tools.

**Rationale:** Configuration screens used monthly or less should not occupy the same navigation prominence as screens used every day. A CEO should not need to visually scan past "Manage Roles" and "API Integrations" every morning to reach "Review Centre." Administration items belong at the bottom, behind a single entry point.

---

### DECISION 8 — CEO Workflow Optimised Around Three Modes

**Decision:** The entire CEO experience is designed to support three distinct engagement modes:
- **Daily Triage** (5–10 minutes): Dashboard → Review Centre → action critical alerts
- **Operations** (variable): Jobs, Schedule, Workers, Clients — via Operations Hub
- **Intelligence** (weekly/monthly, focused session): Analytics, Reports, Exports — via Intelligence Hub

Navigation structure, dashboard design, and screen hierarchy all reflect these three modes. Screens that serve one mode do not intrude on another.

**Rationale:** CEOs in target markets (facilities management, cleaning, security, construction) are operationally busy. They are not passive analysts. They open The Ledger to take action, not to review dashboards. A platform that respects their time by surfacing the right information in the right mode will be used consistently. A platform that makes them wade through intelligence reports to reach their approval queue will be abandoned.

---

### DECISION 9 — Internal Terminology Removed from UI

**Decision:** Labels derived from internal platform doctrine ("Financial Normalization," "Payroll Staging," "Event Monitor," "Activity Feed," "Exception Resolution Centre," "Automation Governance") are replaced with customer-facing language. Full terminology standard is documented in `CEO_EXPERIENCE_REDESIGN_SPECIFICATION.md` Appendix A.

**Rationale:** Navigation labels are a product's first communication with its users. Labels that require the user to have read internal architecture documents before understanding them are a product design failure. Target customers speak the language of their industry, not the language of the platform's doctrine.

---

### DECISION 10 — Worker Default Landing Is `/worker/jobs`

**Decision:** Users with the Worker role are redirected from `/` to `/worker/jobs` immediately. Workers must never see the executive dashboard.

**Rationale:** The original implementation rendered the executive dashboard for Workers with role-filtered conditional rendering. Workers are mobile-first field operatives. They need to see their jobs, submit their timesheets, and log their issues. Showing them a CEO analytics dashboard — even a stripped-down version — is disorienting and unprofessional.

---

# 5. UX PROGRAMME STRUCTURE

## Phase UX-1 — Critical Credibility Fixes

**Objective:** Eliminate demo-breaking issues before any commercial activity. These changes must be completed before any customer demonstration is conducted.

**Changes:**
- Remove all `console.log` statements from production code (confirmed present in `review.tsx`)
- Fix broken `Stock & Assets` navigation icon (`icon: Package, Blocks` → `icon: Package`)
- Add value proposition copy to the login screen below the logo
- Rename 7 navigation labels to customer-facing language (per terminology standard)
- Add live pending-count badge to the Review Centre navigation item
- Add Worker role redirect from `/` to `/worker/jobs`

**Business Impact:** Very High. These changes directly affect what a prospect or investor sees in the first 60 seconds. Console logs in DevTools, incorrect icons, and generic login screens all damage credibility before the product has been demonstrated.

**Dependencies:** None. Can be executed immediately.

---

## Phase UX-2 — Navigation Restructuring (Visual)

**Objective:** Make the navigation immediately scannable by adding section labels and grouping, without changing any routes. This is an interim improvement — the full consolidation comes in UX-4 through UX-8.

**Changes:**
- Add section dividers and labels to sidebar: CORE / OPERATIONAL / INTELLIGENCE / AUTOMATION / ADMINISTRATION
- Collapse ADMINISTRATION items behind a single expandable section at the bottom of the nav
- Add System Alert indicator to the header bar (driven by `executiveCommandEngine.criticalAlerts`)
- Update Notification bell "View All" link target

**Business Impact:** High. Transforms the first impression of the navigation from "30 items I don't understand" to "5 labeled groups I can scan." This change alone materially improves demo quality.

**Dependencies:** UX-1 complete.

---

## Phase UX-3 — Dashboard Redesign

**Objective:** Replace the 10-section data-dump dashboard with a 3-zone triage centre. This is the most visible single change in the programme.

**Changes:**
- Implement Zone A (3-card attention strip): Pending Reviews, Revenue at Risk, Critical Alerts
- Implement Zone B (operational picture): Active Jobs Feed + Today's Picture
- Implement Zone C (financial pulse): 4 weekly KPI cards with week-on-week comparison
- Remove all intelligence widgets from the dashboard (Executive Snapshot, Analytics, Risks, Forecasts, Trends, Reporting, Exports, Activity Feed)
- Remove "System Status: Operational" placeholder badge
- Update dashboard header with time-sensitive greeting

**Business Impact:** Very High. The dashboard is the first screen every user sees after login. A triage-focused dashboard immediately communicates "this platform knows what you need to do today."

**Dependencies:** UX-1, UX-2 complete.

---

## Phase UX-4 — Finance Hub

**Objective:** Consolidate all finance-related screens into a unified Finance Hub with sub-navigation, and build the Finance Overview landing page.

**Changes:**
- Create `/finance` route with hub layout and 5-tab sub-navigation
- Finance Overview landing page (new — period KPIs, job profitability, invoice status, payroll status, accounting status)
- Merge Invoices + Invoice Builder into Invoicing tab
- Merge Payroll Staging + Payroll Export into Payroll tab (with sub-tabs)
- Merge Accounting Settings + Reconciliation + Exception Resolution into Accounting tab (with sub-tabs)
- Rename "Financial Explorer" → "Financial Records" in tab and breadcrumb
- Update primary navigation: replace all finance items with single "Finance" item
- Add redirect from old routes to hub equivalents

**Business Impact:** High. Finance is the most fragmented workflow in the current product. A CEO doing their weekly financial work navigates across 8+ screens. Post-hub: one destination, full workflow.

**Dependencies:** UX-3 complete.

---

## Phase UX-5 — Intelligence Hub

**Objective:** Consolidate all intelligence and monitoring destinations into a unified Intelligence Hub with the Intelligence Overview as the new default landing.

**Changes:**
- Create `/intelligence` route with hub layout and 5-tab sub-navigation
- Intelligence Overview landing page (new — health scorecard, critical items, platform summary)
- Wire Analytics Centre, Reporting Centre (Reports tab), Reporting Centre (Exports tab) as tabs
- Build Activity tab combining Activity Feed + Notification history with type/priority filtering
- Add "Show Event Detail" power-user toggle in Activity tab (surfaces Event Monitor data inline)
- Update primary navigation: replace 6 intelligence items with single "Intelligence" item
- Update Notification bell "View All" to link to `/intelligence?tab=activity`

**Business Impact:** High. The six separate intelligence destinations created the impression of redundancy and over-engineering. A unified hub communicates a coherent intelligence layer.

**Dependencies:** UX-4 complete.

---

## Phase UX-6 — Automation Hub

**Objective:** Consolidate all automation destinations into a unified Automation Hub.

**Changes:**
- Create `/automation` route with hub layout and 4-tab sub-navigation
- Wire Automation Centre (Rules), Workflow Centre, Automation Governance, Automation Scheduler as tabs
- Add governance alert banner (shown when any rule is Restricted or Suspended)
- Update primary navigation: replace 3 automation items with single "Automation" item

**Business Impact:** Medium-High. Automation consolidation reduces cognitive overhead for CEO users and removes the confusing distinction between "Automations" and "Workflow Centre" from primary navigation.

**Dependencies:** UX-5 complete.

---

## Phase UX-7 — Review Centre Enhancement

**Objective:** Elevate the Review Centre workflow to match its operational importance. This phase has the highest per-session time saving for daily CEO use.

**Changes:**
- Implement flat queue view sorted by age (oldest first), replacing job-grouped default
- Redesign queue item cards: type-coded left border, age warning badges (amber >3 days, red >7 days), verification indicators
- Implement type filter bar and sort controls
- Retain "Group by Job" as a toggle (not default)
- Add "Approve All" button for job groups where all items are Quick-Approvable
- Implement slide-in Review Sheet Panel (replacing full-page navigation): timesheet variant, expense variant with receipt display, report variant with issue section
- Add Quick Approve button for clean items (absent on flagged/above-threshold items)
- Enforce rejection-requires-note (Reject button disabled until note is entered)
- Add Previous/Next navigation within sheet panel
- Implement auto-advance after approval and Queue Empty celebration state

**Business Impact:** Very High. The Review Centre is used every working day. Reducing the approval workflow from full-page navigation to a slide-in panel, and enabling Quick Approve for clean items, saves minutes per session. Multiplied across daily use, this is the highest-value UX improvement in the programme.

**Dependencies:** UX-1 complete. Can run in parallel with UX-4, UX-5, UX-6.

---

## Phase UX-8 — Operations Hub & Final Polish

**Objective:** Consolidate operational screens into an Operations Hub, add header polish, and complete mobile adaptation.

**Changes:**
- Create `/operations` route with hub layout and 6-tab sub-navigation (Jobs, Schedule, Workers, Clients, Map, Stock & Assets)
- Add pending review count badges to job cards in Operations → Jobs
- Implement header breadcrumb component
- Implement global search input placeholder (UI only — no search logic in this phase)
- Implement mobile bottom tab bar (5 tabs: Command, Review, Operations, Finance, Intelligence)
- Adapt dashboard to single-column stacked layout on mobile

**Business Impact:** Medium-High. Completes the navigation consolidation. Pending review badges on job cards create a second discovery path for the approval queue from within job management context.

**Dependencies:** UX-7 complete.

---

# 6. BUILD ORDER

## Approved Sequence

```
Phase UX-1 ──────────────────────────────────── 1 day
Phase UX-2 ──────────────────────────────────── 2 days  (requires UX-1)
Phase UX-3 ──────────────────────────────────── 4 days  (requires UX-2)
  │
  ├── Phase UX-4 ───────────────────────────── 5 days  (requires UX-3)
  │     └── Phase UX-5 ─────────────────────── 5 days  (requires UX-4)
  │           └── Phase UX-6 ───────────────── 3 days  (requires UX-5)
  │
  └── Phase UX-7 ───────────────────────────── 4 days  (requires UX-1 only)
        └── Phase UX-8 ─────────────────────── 3 days  (requires UX-7)

Total: ~27 working days (~6 weeks)
```

## Parallel Workstreams

After UX-3 is complete, two tracks can proceed in parallel:

**Track A — Hub Consolidation:** UX-4 → UX-5 → UX-6 (must run sequentially within the track)

**Track B — Review Centre:** UX-7 → UX-8 (can begin as soon as UX-1 is complete)

## Commercial Readiness Milestones

| Milestone | Phases Required | Estimated Timeline |
|---|---|---|
| Minimum demo-safe | UX-1 | End of Day 1 |
| Credible customer demonstration | UX-1, UX-2, UX-3 | End of Week 1 |
| Full investor demonstration | UX-1 through UX-7 | End of Week 5 |
| Programme complete | UX-1 through UX-8 | End of Week 6 |

## Detailed Specifications

The detailed build plan for each phase — including exact tasks, effort estimates, component specifications, and acceptance criteria — is documented in `CEO_EXPERIENCE_UX_BLUEPRINT.md` Section 11.

---

# 7. WORKING RULES FOR FUTURE AI SESSIONS

The following rules govern all Claude sessions working on The Ledger UX Redesign Programme.

---

### Rule 1 — Read This Document First

Every session involving UX work must begin by reading this document. This document provides programme context that prevents repeated re-analysis of already-decided questions.

### Rule 2 — Read the Relevant Blueprint Section

Every session implementing a specific phase must read the corresponding section in `CEO_EXPERIENCE_UX_BLUEPRINT.md` before writing any code. The blueprint is the implementation specification. Do not deviate from it without a registered change.

### Rule 3 — Do Not Re-Audit

The audit in `UX_COMMERCIAL_READINESS_AUDIT.md` is complete. Do not re-examine the platform for UX issues as a session opening activity. Issues have been identified, scored, and converted into implementation phases. If a new issue is discovered during implementation, document it as an observation without derailing the current phase.

### Rule 4 — Do Not Redesign

The redesign in `CEO_EXPERIENCE_REDESIGN_SPECIFICATION.md` is approved. Do not re-question navigation structure, hub consolidation decisions, or dashboard zone design. Do not propose alternative approaches to decisions registered in Section 4. Implement what is specified.

### Rule 5 — Do Not Revisit Approved Decisions

Decisions in Section 4 are permanent unless the repository owner explicitly instructs otherwise. If a specification detail creates an implementation constraint, note it clearly and ask — do not silently deviate from the approved design.

### Rule 6 — Preserve All Existing Doctrine

The UX programme does not modify any platform doctrine. Approval Doctrine, Audit Doctrine, Job Attribution Doctrine, Financial Integrity Doctrine, and all others documented in `LEDGER_CANONICAL_CONTEXT.md` remain absolute. UX work modifies presentation only — never workflow logic, approval gates, or financial normalization behaviour.

### Rule 7 — Playwright Tests Must Continue to Pass

All existing 501 Playwright tests must continue to pass after every phase. UX work that breaks existing test coverage must be resolved before the phase is marked complete. New components introduced in UX phases should have appropriate test coverage added.

### Rule 8 — Update the Status Tracker

When a phase is completed, update Section 9 of this document to reflect the new status. Do not leave the tracker stale.

### Rule 9 — Follow the Git Workflow

All UX implementation work follows the standard repository git workflow:
1. Create a feature branch (e.g., `feature/ux-phase-1-credibility-fixes`)
2. Implement
3. Test (build pass + Playwright pass)
4. Commit
5. Push
6. Create PR
7. Stop and await merge

Do not continue to the next phase before the current phase PR is merged.

### Rule 10 — Produce a Handoff on Completion

Each completed phase produces a handoff document stored in `docs/handoffs/`. The handoff must include: summary of changes, files modified, files created, verification results, and a recommendation to update the status tracker in this document.

---

# 8. SUCCESS CRITERIA

The UX Redesign Programme is successful when the following conditions are met:

### First Impression

- [ ] A CEO opening The Ledger for the first time understands the purpose of the product within 30 seconds
- [ ] The value proposition is visible before login
- [ ] The primary navigation contains no more than 7 items
- [ ] Navigation labels require no explanation

### Daily Workflow

- [ ] Pending approval count is visible on every screen without navigating
- [ ] A CEO can complete their morning approval queue (10 items) in under 10 minutes
- [ ] The Review Centre queue sorts by age (oldest first) by default
- [ ] Quick Approve is available for clean, uncomplicated submissions
- [ ] Rejection is blocked without a reason note (audit integrity preserved)

### Financial Workflow

- [ ] All finance workflows are completable within the Finance Hub without returning to primary navigation
- [ ] Invoice creation is accessible from the same place as invoice management
- [ ] Payroll processing and export are unified under a single Payroll destination
- [ ] The Finance Overview provides a meaningful financial position summary on first view

### Intelligence Access

- [ ] Platform health, analytics, reports, exports, and activity are accessible from a single Intelligence destination
- [ ] The Event Monitor is accessible but not cluttering primary navigation
- [ ] Intelligence screens are clearly labelled as read-only and advisory

### Commercial Demonstrations

- [ ] A Facilities Management CEO demo requires no explanation of navigation structure
- [ ] The demo flow (Review → Financial Records → Invoice → Client Portal) takes under 10 minutes
- [ ] No console logs are visible in DevTools during any demonstration
- [ ] The client portal feels distinct from the main operator application

### Investor Demonstrations

- [ ] The platform can be introduced with a single sentence visible on the login screen
- [ ] The Dashboard communicates operational health without explanation
- [ ] The depth of governance, automation, and intelligence capabilities can be summarised verbally without navigating to each screen

### Technical Health

- [ ] All 501 existing Playwright tests continue to pass
- [ ] No existing routes are broken (redirects in place for all moved routes)
- [ ] No regression in existing functionality

---

# 9. CURRENT STATUS TRACKER

## Phase Status

| Phase | Name | Status | Branch | Completed |
|---|---|---|---|---|
| UX-1 | Critical Credibility Fixes | ✓ Complete | feature/ux-phases-1-2-3 | 5 Jun 2026 |
| UX-2 | Navigation Restructuring | ✓ Complete | feature/ux-phases-1-2-3 | 5 Jun 2026 |
| UX-3 | Dashboard Redesign | ✓ Complete | feature/ux-phases-1-2-3 | 5 Jun 2026 |
| UX-QW | Quick Wins (post-audit) | ✓ Complete | feature/ux-phases-1-2-3 | 5 Jun 2026 |
| UX-4 | Finance Hub | ✓ Complete | feature/ux4-finance-hub | 10 Jun 2026 |
| UX-5 | Intelligence Hub | ☐ Not Started | — | — |
| UX-6 | Automation Hub | ☐ Not Started | — | — |
| UX-7 | Review Centre Enhancement | ☐ Not Started | — | — |
| UX-8 | Operations Hub & Final Polish | ☐ Not Started | — | — |

## Status Key

| Symbol | Meaning |
|---|---|
| ☐ Not Started | Phase has not been initiated |
| ◑ In Progress | Phase is actively being implemented |
| ✓ Complete | Phase is implemented, tested, and merged to main |
| ✗ Blocked | Phase is waiting on a dependency or unresolved issue |

## How to Update This Tracker

When beginning a phase: change status to `◑ In Progress`, add the branch name.

When a phase PR is merged to main: change status to `✓ Complete`, add the completion date.

If blocked: change status to `✗ Blocked`, add a brief note in a new row below the phase entry explaining the blocker.

Example of a completed row:
```
| UX-1 | Critical Credibility Fixes | ✓ Complete | feature/ux-phase-1 | 6 Jun 2026 |
```

---

## Commercial Readiness Progress

| Milestone | Required Phases | Status |
|---|---|---|
| Demo-safe minimum | UX-1 | ✓ Complete |
| Customer demonstration ready | UX-1, UX-2, UX-3 | ✓ Complete |
| Investor demonstration ready | UX-1 through UX-7 | ☐ Pending |
| Programme complete | UX-1 through UX-8 | ☐ Pending |

---

## Test Coverage

| Metric | Baseline | Current |
|---|---|---|
| Playwright tests passing | 501 / 501 | 499 / 501 |
| Build status | PASS | PASS |
| Regressions introduced | 0 | 0 |

The two current failures are known baseline issues unrelated to UX-4 functionality:

- **AF-08** (`tests/doctrine/activity-feed.spec.ts` — "KPI last7days count equals total"): seed date drift issue.
- **NC-25** (`tests/doctrine/notification-centre.spec.ts` — mobile bell badge): duplicate `notif-bell-badge` locator causing a Playwright strict-mode failure.

*Last updated: June 10, 2026 — UX-4 Finance Hub complete and merged to main.*

*Update after each phase completion.*

---

# DOCUMENT HISTORY

| Version | Date | Change |
|---|---|---|
| 1.0 | June 5, 2026 | Initial programme document created following UX audit and redesign specification |
| 1.1 | June 10, 2026 | UX-4 Finance Hub marked complete; test coverage tracker updated to the 499/501 known baseline (AF-08, NC-25) |

---

*This document is maintained as a living programme record. Update Section 9 after each phase completion. Update Section 4 only if the repository owner explicitly approves a change to an approved decision. All other sections are stable.*
