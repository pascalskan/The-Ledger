# THE LEDGER — CEO EXPERIENCE REDESIGN PROGRAMME
## Complete UX Specification

**Document Type:** UX Design Specification — Not Implementation
**Version:** 1.0
**Date:** June 5, 2026
**Status:** Design Only — Awaiting Development Scheduling

---

# PART 1 — CEO WORKFLOW ANALYSIS

## 1.1 Mental Model of a CEO in Target Markets

Before mapping activities, we must establish who this CEO is. The Ledger targets facilities management, cleaning, security, labour providers, and construction companies. These are typically owner-operated or small-to-medium enterprises where the CEO is also operationally involved. They are not passive financial reviewers. They are the primary decision-maker, the person who signs off on everything, and often the person who built the company from the ground up.

**Their core anxieties:**
1. Am I getting paid for the work we delivered?
2. Are my costs in control?
3. Is anything about to go wrong on a job?
4. Do I have the crew in the right place at the right time?
5. Is my business growing or shrinking?

**Their time constraints:**
- They spend less than 30 minutes per day on the platform if the experience is right
- They have meetings, site visits, and client calls filling their day
- They open the app on desktop in the morning, on mobile between meetings
- They do not want to learn a new system — they want answers

**Their trust signals:**
- Data that matches what they already know
- Clear audit trails ("who approved this?")
- No surprises in the numbers

---

## 1.2 Daily CEO Activity Map

### Tier 1 — Open-App Actions (first 5 minutes every morning)

| Activity | Current Platform Location | Friction Level |
|---|---|---|
| Check what needs approval today | Review Centre (buried in nav) | High |
| Check for any overnight alerts or critical issues | Notification bell + Executive Command Centre | Medium |
| Verify no workers missed a scheduled shift | Schedule page | Medium |
| Check if any overdue invoices crossed a threshold | Invoices page | High |

**Design implication:** These four activities must be completable from a single screen without navigation.

### Tier 2 — Daily Management Actions (throughout the day)

| Activity | Current Location | Friction Level |
|---|---|---|
| Approve a timesheet submitted by a PM or worker | Review Centre → Review Detail | Low |
| Reject an expense with a note | Review Centre → Review Detail | Low |
| Respond to a notification from the platform | Notification Centre | Medium |
| Check job status for an active site | Jobs → Job Detail | Low |
| See if a client invoice has been paid | Invoices | Medium |

### Tier 3 — End-of-Day Review (5–10 minutes, usually evening)

| Activity | Current Location |
|---|---|
| Scan approved records for anything unexpected | Financial Explorer |
| Review automation rule activity | Automations |
| Check if any accounting sync failed | Financial Explorer → Accounting Sync tab |

---

## 1.3 Weekly CEO Activity Map

| Activity | Day of Week | Current Location | Time Required |
|---|---|---|---|
| Generate and send client invoices | Monday/Tuesday | Invoices + Invoice Builder | 20–45 min |
| Review job profitability across active portfolio | Wednesday | Financial Explorer → Margin Intelligence | 15 min |
| Process payroll staging | Thursday/Friday | Payroll Staging + Payroll Export | 30–60 min |
| Review exception queue | Wednesday | Exception Resolution + Reconciliation Centre | 15 min |
| Review automation governance | Flexible | Automation Governance | 10 min |
| Check financial exposure across jobs | Flexible | Financial Explorer | 10 min |

---

## 1.4 Monthly CEO Activity Map

| Activity | Typical Timing | Current Location | Time Required |
|---|---|---|---|
| Generate executive summary / board report | Month end | Reporting Centre | 20 min |
| Distribute board pack | Month end | Reporting Centre → Distribution | 15 min |
| Full payroll run and export | End of pay period | Payroll Export | 30 min |
| Review reconciliation against accounting system | Month end | Reconciliation Centre | 20 min |
| Review all exception resolutions | Month end | Exception Resolution | 15 min |
| Audit review | Month end | Audit Log | 10 min |
| Review platform analytics | Month end | Analytics Centre | 15 min |
| Verify accounting settings | Monthly check | Accounting Settings | 5 min |

---

## 1.5 CEO Workflow Summary

Three distinct modes of engagement:

**Mode 1 — Triage** (daily, 5–10 min): What needs my attention? What needs approval? Any fires?

**Mode 2 — Operations** (daily, variable): Manage live jobs, workers, invoices. Action-oriented.

**Mode 3 — Intelligence** (weekly/monthly, focused session): Review performance, generate reports, analyse trends.

The current platform treats all three modes as equal and simultaneous. The redesign must separate them.

---

# PART 2 — NEW CEO NAVIGATION ARCHITECTURE

## 2.1 Design Principles

**Principle 1 — Navigation reflects cadence, not feature count.**
Items used daily are prominent. Items used monthly are discoverable but secondary.

**Principle 2 — Maximum 6 primary navigation items.**
Research from enterprise SaaS consistently shows decision fatigue begins above 7 navigation items.

**Principle 3 — No internal concepts in navigation labels.**
"Event Monitor," "Automation Governance," "Activity Feed" are internal doctrinal concepts. Navigation labels must describe the user's job, not the platform's architecture.

**Principle 4 — The Review Centre has privileged access.**
It receives: a persistent badge counter in the navigation, a primary action on the dashboard, and a keyboard shortcut (future).

**Principle 5 — Finance is one destination, not six.**
All financially-oriented screens are accessible from a single "Finance" navigation item.

---

## 2.2 Proposed CEO Navigation Hierarchy

### Primary Navigation (always visible, sidebar)

```
┌─────────────────────────────────────┐
│  [L]  The Ledger                    │
├─────────────────────────────────────┤
│                                     │
│  ⬡  Command                         │
│                                     │
│  ✓  Review        [14]              │
│                                     │
│  ◈  Operations                      │
│                                     │
│  £  Finance                         │
│                                     │
│  ◎  Intelligence                    │
│                                     │
│  ⚙  Automation                      │
│                                     │
│  ···  Settings                      │
│                                     │
├─────────────────────────────────────┤
│  [JS]  James Sutherland · CEO       │
│  Sign Out                           │
└─────────────────────────────────────┘
```

---

## 2.3 Navigation Item Specifications

### COMMAND *(daily)*
- **Route:** `/`
- **Purpose:** The CEO's morning briefing and triage centre.
- **Contains:** Single page — no sub-navigation required.

### REVIEW *(daily — most critical)*
- **Route:** `/review`
- **Badge:** Live count of items with status `pending`
- **Purpose:** The approval queue. The heart of the platform.
- **Contains:** Single page with inline filtering by type

### OPERATIONS *(daily)*
- **Route:** `/operations`
- **Sub-navigation:**
  - Jobs `/jobs`
  - Schedule `/schedule`
  - Workers `/workers`
  - Clients `/clients`
  - Map `/map`
  - Stock & Assets `/equipment`

### FINANCE *(weekly)*
- **Route:** `/finance`
- **Sub-navigation:**
  - Overview `/finance`
  - Financial Records `/financial-explorer`
  - Invoices `/invoices` + `/invoice-builder` (unified)
  - Payroll `/payroll` + `/payroll-export` (unified)
  - Accounting `/accounting-settings` + reconciliation + exceptions (unified)

### INTELLIGENCE *(weekly/monthly)*
- **Route:** `/intelligence`
- **Sub-navigation:**
  - Overview `/intelligence`
  - Analytics `/analytics-centre`
  - Reports `/reporting-centre`
  - Exports `/reporting-centre?tab=exports`
  - Activity `/activity-feed`
  - Notifications `/notifications`
  - Event Monitor `/event-monitor`

### AUTOMATION *(weekly/as needed)*
- **Route:** `/automation`
- **Sub-navigation:**
  - Rules `/automations`
  - Workflows `/workflows`
  - Governance `/automation-governance`
  - Scheduler (within automations)

### SETTINGS *(monthly/rarely)*
- **Route:** `/settings`
- **Sub-navigation:**
  - General `/settings`
  - Roles & Access `/roles`
  - API & Integrations `/integrations`
  - Audit Log `/audit`

---

## 2.4 What Was Removed From Primary Navigation

| Removed Item | New Location | Rationale |
|---|---|---|
| Job Intelligence | Operations → Jobs (as a tab) | A view of jobs, not a separate destination |
| Financial Insights | Finance → Financial Records | Same domain |
| Invoice Builder | Finance → Invoices (as a tab) | Same workflow |
| Payroll Export | Finance → Payroll (as a tab) | Same workflow |
| Audit Log | Settings → Audit Log | Administrative, not operational |
| Manage Roles | Settings → Roles & Access | Configuration item |
| Event Monitor | Intelligence → Event Monitor | Power-user, not daily |
| Activity Feed | Intelligence → Activity | Informational, not operational |
| Notification Centre | Intelligence → Notifications | Bell in header handles daily use |
| Executive Command Centre | Intelligence → Overview | Consolidated into Intelligence |
| Analytics Centre | Intelligence → Analytics | Consolidated into Intelligence |
| Reporting Centre | Intelligence → Reports | Consolidated into Intelligence |
| Accounting Settings | Finance → Accounting | Same domain |
| Reconciliation Centre | Finance → Accounting (as tab) | Same domain |
| Exception Resolution | Finance → Accounting (as tab) | Same domain |
| API Integrations | Settings → API & Integrations | Configuration item |

**Result:** 30 flat items → 7 primary items, each with contextual sub-navigation.

---

# PART 3 — NEW CEO DASHBOARD ARCHITECTURE

## 3.1 Dashboard Philosophy

The current dashboard answers: "What did we build?"
The new dashboard must answer: "What do I need to do right now?"

The dashboard is a triage screen — a 5-minute morning briefing that gives the CEO clarity on what requires action and what is healthy.

**Single governing principle:** If it doesn't require action or decision-making from the CEO today, it does not belong on the dashboard.

---

## 3.2 Dashboard Zones

```
┌────────────────────────────────────────────────────────────────────┐
│  ZONE A — ATTENTION REQUIRED (above the fold — always visible)    │
│  "What needs me right now?"                                        │
└────────────────────────────────────────────────────────────────────┘
┌────────────────────────────────────────────────────────────────────┐
│  ZONE B — OPERATIONAL PICTURE (primary content area)              │
│  "What is happening today and this week?"                          │
└────────────────────────────────────────────────────────────────────┘
┌────────────────────────────────────────────────────────────────────┐
│  ZONE C — FINANCIAL PULSE (secondary content area — below fold)   │
│  "Am I making money this week?"                                    │
└────────────────────────────────────────────────────────────────────┘
```

---

## 3.3 Zone A — Attention Required

3-column card strip, full width, immediately below the page header.

```
┌──────────────────────────┬──────────────────────────┬──────────────────────────┐
│   PENDING REVIEWS        │   REVENUE AT RISK         │   CRITICAL ALERTS         │
│         14               │        £24,800           │           3              │
│  8 timesheets            │  4 overdue invoices      │  1 sync failed           │
│  4 expenses              │  Oldest: 31 days         │  2 governance flags      │
│  2 reports               │                          │                          │
│  [Review Now →]          │  [View Invoices →]       │  [View Alerts →]         │
└──────────────────────────┴──────────────────────────┴──────────────────────────┘
```

| Card | Active State | Clear State | Action |
|---|---|---|---|
| Pending Reviews | `bg-red-50 border-red-200` | `bg-emerald-50 border-emerald-200` "Queue Clear" | Navigate to `/review` |
| Revenue at Risk | `bg-amber-50 border-amber-200` | `bg-emerald-50` "No Overdue Invoices" | Navigate to `/finance?tab=invoicing&filter=overdue` |
| Critical Alerts | `bg-red-50 border-red-200` | `bg-emerald-50` "No Active Alerts" | Navigate to `/intelligence?tab=overview` |

---

## 3.4 Zone B — Operational Picture

Two-column layout. Left column shows active jobs. Right column shows today's schedule and workforce.

**Active Jobs Feed (col-span 7):**
- Maximum 5 jobs shown
- Jobs with pending review items show a count badge
- Jobs approaching budget limit show a warning indicator
- "+ N more jobs" text link → `/operations?tab=jobs`

**Today's Picture (col-span 5):**
- Workers scheduled today
- Shifts starting in next 24h (time + job name)
- "Open Schedule →" button

---

## 3.5 Zone C — Financial Pulse

Single row of 4 KPI cards, below Zone B.

```
┌──────────────────┬──────────────────┬──────────────────┬──────────────────┐
│  REVENUE         │  APPROVED COSTS  │  MARGIN          │  OUTSTANDING     │
│  THIS WEEK       │  THIS WEEK       │  THIS WEEK       │  INVOICES        │
│    £48,200       │    £31,400       │     34.8%        │    £187,500      │
│  +12% vs last    │  -3% vs last     │  ↑ improving     │  6 invoices      │
└──────────────────┴──────────────────┴──────────────────┴──────────────────┘
```

---

## 3.6 What Is Removed From the Dashboard

| Removed Widget | New Location |
|---|---|
| Executive Snapshot (6 KPI tiles) | Intelligence → Overview |
| Analytics Intelligence health scores | Intelligence → Analytics |
| Risk Highlights (top 3 risks) | Intelligence → Analytics |
| Forecast Summary | Intelligence → Analytics |
| Trend Analysis (4 trends) | Intelligence → Analytics |
| Reporting Snapshot | Intelligence → Reports |
| Export Reports Widget | Intelligence → Exports |
| Activity Feed Widget (recent events) | Intelligence → Activity |

**Result:** Dashboard reduces from 10 sections to 3 zones.

---

# PART 4 — INTELLIGENCE CONSOLIDATION

## 4.1 Decision: Consolidate Into Intelligence Hub

The Executive Command Centre, Analytics Centre, Reporting Centre, and Activity Feed are all intelligence consumers. They are all CEO-only. They all share the same read-only doctrine. They belong together.

**Recommendation: Consolidate into a single Intelligence Hub.**

### Tab Structure

```
Intelligence:
  Overview  │  Analytics  │  Reports  │  Exports  │  Activity
```

### Tab 1 — Overview
- Health Scorecard (4 dimensions: Operational / Financial / Governance / Workflow)
- Critical Items panel (failed syncs, open exceptions, suspended automations, governance flags)
- Platform Summary Stats

### Tab 2 — Analytics
- All current Analytics Centre content unchanged
- Health dimensions, trend analysis, forecasts, bottleneck analysis, risk investigation

### Tab 3 — Reports
- All current Reporting Centre → Reports tab content unchanged

### Tab 4 — Exports
- All current Reporting Centre → Exports and Distribution content

### Tab 5 — Activity
- Activity Feed + Notification history combined
- Sub-filters: All / Operational / Financial / Governance / Automation / Sync
- Priority filter: All / Critical / Warning / Info
- "Show Event Detail" toggle (power user) — surfaces Event Monitor raw data inline

---

# PART 5 — FINANCE CONSOLIDATION

## 5.1 Finance Hub Architecture

**Route:** `/finance`

### Tab Structure

```
Finance:
  Overview  │  Records  │  Invoicing  │  Payroll  │  Accounting
```

### Tab 1 — Finance Overview (new page)
- This Period KPI strip: Revenue Recognized / Costs Approved / Gross Margin / Cash Exposure
- Job Profitability Summary (top 4 jobs)
- Invoice Status Summary (counts + values by status)
- Payroll Status block
- Accounting Status block

### Tab 2 — Records (was "Financial Explorer")
- Renamed to "Financial Records"
- All existing tabs retained: Timesheets / Expenses / Inventory / Equipment / Invoices / Margin Intelligence / Forecast / Accounting Sync / Reconciliation / Exceptions

### Tab 3 — Invoicing (merges Invoices + Invoice Builder)
- All Invoices (existing Invoices page)
- Create Invoice (existing Invoice Builder — accessed via tab)
- Status-filtered quick-access tabs

### Tab 4 — Payroll (merges Payroll Staging + Payroll Export)
- Processing Queue (existing Payroll Staging)
- Export History (existing Payroll Export)
- Settings sub-tab

### Tab 5 — Accounting (merges 3 destinations)
- Sync Status
- Reconciliation (existing Reconciliation Centre)
- Exceptions (existing Exception Resolution)
- Providers (existing Accounting Settings)

---

## 5.2 Terminology Fixes

| Current Label | Proposed Label | Reason |
|---|---|---|
| Financial Explorer | Financial Records | Clearer content description |
| Financial Insights | (absorbed into Finance Overview) | Redundant separate destination |
| Payroll Staging | Payroll / Processing Queue | Removes internal jargon |
| Exception Resolution Centre | Exceptions | Shorter, clearer |
| Reconciliation Centre | Reconciliation | Shorter, clearer |
| Overdue Rev | Revenue at Risk | More professional language |
| Staff Utility | Workers On Site | Directly observable metric |
| Assets Deploy | Deployed Assets | Correct English |

---

# PART 6 — REVIEW CENTRE PRIORITISATION

## 6.1 The Review Centre Is The Product

The entire value proposition of The Ledger is realised in the Review Centre. Every other screen either feeds it or consumes its output. The current implementation treats it as one of 30 navigation items. This is the most important UX problem in the entire product.

## 6.2 Review Centre Access Hierarchy

**Access Point 1 — Primary Navigation Badge (always visible)**
```
✓  Review        [14]
```
Badge turns red when count > 0.

**Access Point 2 — Dashboard Zone A Card (daily briefing)**
```
PENDING REVIEWS
     14
8 timesheets · 4 expenses · 2 reports
[Review Now →]
```

**Access Point 3 — Job-Level Review Indicator**
Each job card in the dashboard and Operations → Jobs shows its pending review count.

**Access Point 4 — Direct Route `/review`**
The existing Review Centre page, retained and enhanced.

## 6.3 Dashboard Should Not Lead With Review Exclusively

The dashboard serves a broader orientation function. Zone A as the first visible element, with Pending Reviews as the first card, red-tinted when items exist — provides the correct balance.

## 6.4 Review Centre Page Redesign

**Header:**
```
Review Centre                                    [14 Pending]
──────────────────────────────────────────────────────────────
Filter:  All (14)  │  Timesheets (8)  │  Expenses (4)  │  Reports (2)
```

**Primary View — Flat Queue (default):**
Sorted by age (oldest first). Each item shows:
- Submission type + worker name
- Job name + date + brief detail
- Age indicator (amber > 3 days, red > 7 days)
- "Review →" button (always)
- "Quick Approve ✓" button (clean items only — absent when issues flagged or above threshold)

**Key design decisions:**
- "Quick ✓" button for routine items — bulk approval for uncomplicated submissions
- Rejection requires a note before confirmation
- Reports with issues logged cannot be quick-approved
- "Group by Job" toggle available as secondary view

**Review Sheet Panel (slide-in from right):**
- Shows full submission detail
- Timesheet: hours, GPS verification, contract range check, financial preview
- Expense: receipt photo, category, amount, job attribution
- Report with issues: issue detail + warning banner
- Approve / Reject actions with Previous/Next navigation
- After last item: Queue Empty confirmation state

---

# PART 7 — COMMERCIAL DEMO EXPERIENCE

## 7.1 First 30 Seconds — The Login Moment

Login screen with value proposition below logo:
> "From site to accounts — operational intelligence with full financial control."

CEO logs in → lands on Command Dashboard.

**First impression:** Zone A shows 14 pending reviews (red), £24,800 revenue at risk (amber), 1 critical alert (amber). Below: 5 active jobs with crew counts. Financial pulse showing this week's revenue and margin.

## 7.2 First 3 Minutes — The Core Story

1. Click "Review Now" → Review Centre opens with 14 items
2. Quick Approve 4 clean timesheets (~30 seconds each)
3. Review one expense via sheet panel — show receipt, category, GPS
4. Approve report with issue — show issue detail, add note
5. **Pause:** "Three approvals, 60 seconds, every one traceable."

## 7.3 First 10 Minutes — The Full Picture

**Minutes 4–5 — Job Financial View**
- Operations → Jobs → Heathrow T3 Security
- Finance → Records → filter to this job
- Show margin: £48,200 revenue / £31,400 costs / 34.8% margin

**Minutes 6–7 — Invoicing Flow**
- Finance → Invoicing → Create Invoice
- Pre-populated line items from approved records
- "One click to export to Xero"

**Minutes 8–9 — Client Portal**
- Navigate to `/portal`, log in as HSS Limited
- Show: project progress, next visit, activity timeline, invoice status

**Minute 10 — Intelligence Layer**
- Intelligence → Analytics: health scorecard, risk analysis
- Intelligence → Reports: generate executive summary, distribute board pack

## 7.4 What Should Be Hidden During Demos

| Feature | Reason to Exclude |
|---|---|
| Event Monitor | Internal technical concept |
| Automation Governance | Requires doctrine context |
| Reconciliation Centre | Requires accounting context |
| Exception Resolution | Same |
| Audit Log | Better for compliance conversations |
| API Integrations | Engineering conversation |

---

# APPENDIX A — Terminology Standard

| Internal Term | User-Facing Label |
|---|---|
| Financial Normalization | Financial Records |
| Review Centre Submission | Pending Approval |
| Financial Mutation | Financial Record |
| Payroll Staging | Payroll Processing |
| Exception Resolution | Accounting Exceptions |
| Automation Governance | Automation Controls |
| Automation Scheduler | Scheduled Rules |
| Workflow Centre | Workflows |
| Event Monitor | Platform Events |
| Activity Feed | Activity |
| Executive Command Centre | (absorbed into Intelligence Hub) |
| Reconciliation Centre | Reconciliation |
| Financially Sensitive | High Risk |
| Audit Doctrine | (internal only — never customer-facing) |

---

# APPENDIX B — CEO Navigation Final State

```
PRIMARY NAVIGATION (7 items)
├── Command          /                     (dashboard)
├── Review      [n]  /review               (approval queue, badge count)
├── Operations       /operations           (jobs, schedule, workers, clients, map, stock)
├── Finance          /finance              (records, invoicing, payroll, accounting)
├── Intelligence     /intelligence         (analytics, reports, exports, activity)
├── Automation       /automation           (rules, workflows, governance, scheduler)
└── Settings         /settings             (roles, api, platform config, audit log)

NOTIFICATION BELL (header)
└── Quick preview dropdown (top 5, link to Intelligence → Activity)
```

---

*This specification is the authoritative UX design document for The Ledger CEO Experience Redesign Programme. All implementation phases should reference this document. No implementation decisions should modify the underlying doctrines, approval workflows, or data architecture. This document governs presentation only — the platform's financial integrity controls remain unchanged.*
