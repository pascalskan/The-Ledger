# THE LEDGER — CEO EXPERIENCE UX BLUEPRINT
## Implementation-Ready Design Specification

**Document Type:** UX Blueprint — Engineering Reference
**Version:** 1.0
**Date:** June 5, 2026
**Status:** Approved for Implementation
**Prerequisite:** CEO Experience Redesign Specification v1.0

---

# BLUEPRINT 1 — NAVIGATION SYSTEM

## 1.1 Sidebar — Full Specification

The sidebar is the persistent navigational spine of the CEO experience. It exists on every CEO-accessible page.

```
┌────────────────────────────────┐
│ SIDEBAR — EXPANDED (w: 256px)  │
│ Collapsed state: w: 64px       │
├────────────────────────────────┤
│ ┌──────────────────────────┐   │
│ │ [L]  The Ledger    [‹]   │   │  ← Logo + collapse toggle
│ └──────────────────────────┘   │
│                                │
│ ── CORE ──────────────────── │  ← Section label (text-xs, muted, uppercase)
│                                │
│ ┌──────────────────────────┐   │
│ │ ⬡  Command               │   │  ← Active: bg-primary, text-primary-fg
│ └──────────────────────────┘   │
│                                │
│ ┌──────────────────────────┐   │
│ │ ✓  Review          [14]  │   │  ← Badge: red circle, count, always visible
│ └──────────────────────────┘   │
│                                │
│ ── OPERATIONAL ───────────── │
│                                │
│ │ ◈  Operations            │   │
│ │ £  Finance               │   │
│                                │
│ ── INTELLIGENCE ──────────── │
│                                │
│ │ ◎  Intelligence           │   │
│ │ ⚙  Automation             │   │
│                                │
│ ── ADMINISTRATION ─────────── │
│                                │
│ │ ···  Settings             │   │
│                                │
│ ════════════════════════════   │
│                                │
│ ┌──────────────────────────┐   │
│ │ [JS]  James Sutherland   │   │
│ │       CEO                │   │
│ │ [Sign Out]               │   │
│ └──────────────────────────┘   │
└────────────────────────────────┘
```

### Sidebar Collapsed State (w: 64px)

```
┌──────────┐
│  [L]     │  ← Logo only
│  [›]     │  ← Expand toggle
├──────────┤
│  [⬡]     │  ← Icon only, tooltip on hover: "Command"
│  [✓][●]  │  ← Icon + red dot (replaces count badge when collapsed)
│  [◈]     │  ← Tooltip: "Operations"
│  [£]     │  ← Tooltip: "Finance"
│  [◎]     │  ← Tooltip: "Intelligence"
│  [⚙]     │  ← Tooltip: "Automation"
│  [···]   │  ← Tooltip: "Settings"
├──────────┤
│  [JS]    │  ← Avatar only
└──────────┘
```

### Sidebar Component Specifications

| Element | Specification |
|---|---|
| Width expanded | 256px |
| Width collapsed | 64px |
| Transition | CSS transition-all duration-300 |
| Background | bg-sidebar (existing token) |
| Active item | bg-sidebar-primary, text-sidebar-primary-foreground, rounded-md |
| Inactive item | text-sidebar-foreground/70, hover: bg-sidebar-accent |
| Section label | text-xs, uppercase, tracking-wider, text-muted-foreground, px-3, py-1, mt-2 |
| Review badge | h-5 min-w-5 px-1, bg-red-500, text-white, text-[10px], font-bold, rounded-full |
| Badge empty state | Badge hidden when count = 0 |
| Badge source | `reviewItems.filter(r => r.status === 'pending').length` |
| Collapse persist | localStorage key: `sidebar-collapsed` |
| Tooltip delay | 0ms when collapsed |

---

## 1.2 Header Bar

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ HEADER BAR (h: 64px, sticky, border-b)                                     │
│                                                                             │
│  [◈ Operations › Jobs]         [🔍 Search...]   [⚠ 2]  [🔔 14]  [JS ▾]   │
│  ↑ Breadcrumb                  ↑ Global search  ↑ Sys  ↑ Notif  ↑ User    │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Breadcrumb (left side)**
- Shows: Current section name → Current page name
- Example: `Operations › Jobs` or `Finance › Payroll`
- Font: text-sm, text-muted-foreground, separator `›`

**Global Search (centre)**
- Placeholder: "Search jobs, workers, clients..."
- Width: 320px, expands to 480px on focus
- Keyboard shortcut: `⌘K` badge inside input
- Scope: jobs, workers, clients, invoices, submissions

**System Alert Indicator**
- Icon: TriangleAlert
- Badge: count of critical alerts from executiveCommandEngine
- Color: amber (warnings), red (critical), hidden when 0
- Click: navigates to `/intelligence?tab=overview`

**Notification Bell**
- Existing implementation retained
- "View All" links to `/intelligence?tab=activity`

**User Menu**
```
┌────────────────────────┐
│  James Sutherland      │
│  CEO · Example Co.     │
├────────────────────────┤
│  Account Settings      │
│  Platform Settings     │
├────────────────────────┤
│  Sign Out              │
└────────────────────────┘
```

---

## 1.3 Mobile Navigation (< 768px)

```
┌──────────────────────────────────────────┐
│ MOBILE HEADER (fixed top, h: 56px)       │
│  [≡]  [L] The Ledger     [🔔 14]  [⚠]  │
└──────────────────────────────────────────┘

Bottom Tab Bar (fixed bottom, h: 56px):
┌────────────────────────────────────────┐
│  [⬡]    [✓ 14]    [◈]    [£]    [◎]  │
│ Command  Review   Ops  Finance  Intel  │
└────────────────────────────────────────┘
```

- Automation and Settings accessible from drawer only
- Review badge appears on bottom tab bar
- Dashboard adapts to single-column stacked layout
- Zone A cards stack vertically (full width)

---

# BLUEPRINT 2 — COMMAND DASHBOARD

## 2.1 Full Layout

```
┌─────────────────────────────────────────────────────────────────────┐
│ SIDEBAR (256px)        │ MAIN CONTENT AREA (flex-1)                  │
│                        │ HEADER BAR (sticky, h: 64px)               │
│                        ├─────────────────────────────────────────────│
│                        │ DASHBOARD HEADER                           │
│                        │ Good morning, James.   [Thu 5 Jun 2026]    │
│                        │ Here is what needs your attention today.   │
│                        ├── ZONE A ──────────────────────────────────│
│                        │ [PENDING REVIEWS] [REVENUE AT RISK] [ALERTS]│
│                        ├── ZONE B ──────────────────────────────────│
│                        │ [ACTIVE JOBS FEED    ] [TODAY'S PICTURE   ]│
│                        │ [col-span-7          ] [col-span-5        ]│
│                        ├── ZONE C ──────────────────────────────────│
│                        │ [REVENUE] [COSTS] [MARGIN] [OUTSTANDING]   │
└────────────────────────┴─────────────────────────────────────────────┘
```

---

## 2.2 Dashboard Header

| Element | Specification |
|---|---|
| Greeting | Derived from time: "Good morning" (5–11), "Good afternoon" (12–17), "Good evening" (18+) |
| Date | `new Intl.DateTimeFormat('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(new Date())` |
| Sub-heading | Static: "Here is what needs your attention today." |
| Removed | "System Status: Operational" badge — delete entirely |

---

## 2.3 Zone A — Attention Required

```
┌──────────────────────────┬──────────────────────────┬──────────────────────────┐
│   PENDING REVIEWS        │   REVENUE AT RISK         │   CRITICAL ALERTS         │
│                          │                          │                          │
│         14               │        £24,800           │           3              │
│                          │                          │                          │
│  8 timesheets            │  4 overdue invoices      │  1 sync failed           │
│  4 expenses              │  Oldest: 31 days         │  2 governance flags      │
│  2 reports               │                          │                          │
│                          │                          │                          │
│  [Review Now →]          │  [View Invoices →]       │  [View Alerts →]         │
└──────────────────────────┴──────────────────────────┴──────────────────────────┘
```

### Card A1 — Pending Reviews

| Property | Specification |
|---|---|
| Data source | `reviewItems.filter(r => r.status === 'pending')` |
| Primary number | Total pending count |
| Sub-labels | Count per type: timesheets, expenses, reports, uploads, issues |
| Active state | `bg-red-50 border-red-200` when count > 0 |
| Clear state | `bg-emerald-50 border-emerald-200`, text: "Queue Clear", icon: CheckCircle2 |
| Action button | "Review Now →" navigates to `/review` |
| Loading state | Skeleton on primary number and sub-labels |
| Empty sub-labels | Hide sub-label rows with zero count |

### Card A2 — Revenue at Risk

| Property | Specification |
|---|---|
| Data source | `invoices.filter(i => i.status === 'Overdue' \|\| (i.status !== 'Paid' && i.status !== 'Void' && new Date(i.dueDate) < new Date()))` |
| Primary number | Sum of overdue invoice values, formatted as `£XX,XXX` |
| Sub-label line 1 | Count: "N overdue invoices" |
| Sub-label line 2 | Age of oldest: "Oldest: N days ago" |
| Active state | `bg-amber-50 border-amber-200` when value > 0 |
| Clear state | `bg-emerald-50 border-emerald-200`, text: "No Overdue Invoices" |
| Action button | "View Invoices →" navigates to `/finance?tab=invoicing&filter=overdue` |

### Card A3 — Critical Alerts

| Property | Specification |
|---|---|
| Data source | `executiveCommandEngine.getExecutiveSummary().criticalAlerts` |
| Primary number | Total critical alert count |
| Sub-label line 1 | Sync failures: "N sync failure(s)" |
| Sub-label line 2 | Governance flags: "N governance flag(s)" |
| Active state | `bg-red-50 border-red-200` when count > 0 |
| Clear state | `bg-emerald-50 border-emerald-200`, text: "No Active Alerts" |
| Action button | "View Alerts →" navigates to `/intelligence?tab=overview` |

---

## 2.4 Zone B — Operational Picture

```
┌─────────────────────────────────────┬───────────────────────────────┐
│  ACTIVE JOBS FEED (col-span-7)      │  TODAY'S PICTURE (col-span-5) │
├─────────────────────────────────────┼───────────────────────────────┤
│  Active Jobs            [View All →]│ Today — Thu 5 June            │
│                                     │                               │
│  ┌─────────────────────────────┐    │  WORKFORCE                    │
│  │ [●] Heathrow T3 Security    │    │  28 scheduled today           │
│  │     HSS Limited · 12 workers│    │  3 shifts starting < 1h       │
│  │     Next visit: Today 06:00 │    │  ⚠ 1 worker unconfirmed       │
│  │     [Active] [3 pending ✓]  │    │                               │
│  └─────────────────────────────┘    │  UPCOMING (Next 24h)          │
│  ┌─────────────────────────────┐    │  06:00 Heathrow T3 Start      │
│  │ [●] Canary Wharf Cleaning   │    │  07:30 Victoria Handover      │
│  │     Apex Properties · 8 wkr │    │  14:00 Canary Wharf PM        │
│  │     [Active] [0 pending ✓]  │    │                               │
│  └─────────────────────────────┘    │  [Open Schedule →]            │
│  + 8 more jobs                      │                               │
└─────────────────────────────────────┴───────────────────────────────┘
```

### Active Jobs Feed Specifications

| Property | Specification |
|---|---|
| Data source | `jobs.filter(j => j.status === 'Active' \|\| j.status === 'Planned')` sorted by `startAt` asc |
| Max items shown | 5 jobs |
| Overflow | "+ N more jobs" text link → `/operations?tab=jobs` |
| Card click | Navigate to `/jobs/:id` |
| Status dot | h-2 w-2 rounded-full: green (Active), blue (Planned) |
| Pending reviews badge | `bg-amber-50 text-amber-700 border-amber-200`, hidden when 0 |
| Critical priority | `border-l-4 border-l-amber-400` on Planned jobs with priority = 'Critical' |
| Hover state | `border-slate-100 bg-slate-50` transition |

### Today's Picture Specifications

| Property | Specification |
|---|---|
| Upcoming shifts | From `schedule` sorted by `startAt`, next 24h, max 4 items |
| Shift row format | `HH:mm · [Job short name]` |
| Empty state | "No shifts scheduled today" in muted text |
| Open Schedule button | variant="outline", full width, navigates to `/operations?tab=schedule` |

---

## 2.5 Zone C — Financial Pulse

```
┌──────────────────┬──────────────────┬──────────────────┬──────────────────┐
│  REVENUE         │  COSTS           │  MARGIN          │  OUTSTANDING     │
│  THIS WEEK       │  THIS WEEK       │  THIS WEEK       │  INVOICES        │
│   £48,200        │   £31,400        │    34.8%         │  £187,500        │
│  ↑ +12% vs last  │  ↓ -3% vs last   │  → improving     │  6 invoices      │
└──────────────────┴──────────────────┴──────────────────┴──────────────────┘
[View Financial Detail →]                              [Open Finance Hub →]
```

| KPI | Data Source | Change Indicator |
|---|---|---|
| Revenue This Week | `invoices` created this calendar week, sum of line items | ↑↓ % vs previous week |
| Costs This Week | Normalized financial records approved this week | ↑↓ % vs previous week (inverted) |
| Margin This Week | (Revenue - Costs) / Revenue × 100 | → / ↑ / ↓ vs target |
| Outstanding Invoices | `invoices` where status ≠ 'Paid' and ≠ 'Void', sum of values | None |

Change indicator icons: TrendingUp (green), TrendingDown (red), Minus (neutral) — Lucide, h-3 w-3

---

## 2.6 Dashboard Empty & Loading States

**First-load skeleton:**
- Zone A: 3 skeleton cards (h-36, rounded-lg, animate-pulse)
- Zone B left: 3 skeleton job cards (h-24, gap-3)
- Zone B right: skeleton block (h-40)
- Zone C: 4 skeleton KPI cards (h-28)

**Empty business (new account):**
- Zone A: All three cards show "All Clear" emerald state
- Zone B left: "No active jobs yet" + [Create Your First Job] button
- Zone C: All four cards show "—"

---

# BLUEPRINT 3 — REVIEW CENTRE

## 3.1 Full Layout

```
┌─────────────────────────────────────────────────────────────────────┐
│ SIDEBAR            │ MAIN CONTENT AREA                              │
│ Review [14]        ├────────────────────────────────────────────────│
│ highlighted        │ PAGE HEADER                                    │
│                    │ Review Centre        [14 Pending]              │
│                    │ Approve, reject, or correct submissions        │
│                    │ before they become financial records.          │
│                    │                         [Group by Job ⇄]      │
│                    │                                                │
│                    │ FILTER BAR                                     │
│                    │ [All 14] [Timesheets 8] [Expenses 4]           │
│                    │ [Reports 2] [Uploads 0] [Issues 0] [QA 0]      │
│                    │                                                │
│                    │ SORT BAR                                       │
│                    │ Sort: [Oldest First ▾]                         │
│                    │                                                │
│                    │ QUEUE CARDS                                    │
│                    │ [CARD × N]                                     │
└────────────────────┴────────────────────────────────────────────────┘

Sheet open state:
┌─────────────────────┬───────────────────────────────────────────────┐
│ QUEUE (compressed)  │ REVIEW SHEET PANEL (w: 480px, fixed right)    │
└─────────────────────┴───────────────────────────────────────────────┘
```

---

## 3.2 Filter Bar

| Element | Specification |
|---|---|
| Component | Button group (pill buttons, not Tabs component) |
| Active state | `bg-primary text-primary-foreground` |
| Inactive state | `bg-muted text-muted-foreground hover:bg-muted/80` |
| Zero count items | `opacity-50` |
| Count in label | Always shown. Live count from filtered `reviewItems` |

---

## 3.3 Sort Options

| Option | Behaviour |
|---|---|
| Oldest First (default) | Sort by `submittedAt` asc |
| Newest First | Sort by `submittedAt` desc |
| By Worker | Sort alphabetically by `workerName` |
| By Job | Sort alphabetically by `jobTitle` |
| By Type | Group: timesheets → expenses → reports → others |

---

## 3.4 Queue Item Cards

```
TIMESHEET CARD:
┌─────────────────────────────────────────────────────────────────────┐
│ Border-left: 4px solid blue (timesheet)                             │
│  [⏱]  TIMESHEET                     3 days ago    [Waiting 3d ⚠]  │
│        John Martinez                                                │
│        Heathrow T3 Security · Mon 8 Jun 2026 · 7.5 hours           │
│        Regular shift · No overtime · GPS verified ✓                │
│                                  [Review →]  [Quick Approve ✓]     │
└─────────────────────────────────────────────────────────────────────┘

REPORT WITH ISSUE:
┌─────────────────────────────────────────────────────────────────────┐
│ Border-left: 4px solid rose (report + issue)                        │
│  [📋]  REPORT                        1 day ago      [⚠ Has Issues] │
│        Danny Walsh                                                  │
│        Victoria Station Maintenance · End-of-shift report          │
│        3 photos attached · 1 issue logged                          │
│                                                                     │
│  ⚠ This report contains a logged issue. Full review required.      │
│                                  [Review →]                         │
│                                  (No Quick Approve)                 │
└─────────────────────────────────────────────────────────────────────┘
```

### Card Type → Left Border Color

| Type | Border Color |
|---|---|
| Timesheet | `border-l-blue-400` |
| Expense | `border-l-amber-400` |
| Report (clean) | `border-l-emerald-400` |
| Report (with issue) | `border-l-rose-500` |
| Upload | `border-l-purple-400` |
| Issue / QA | `border-l-orange-400` |

### Card Element Specifications

| Element | Specification |
|---|---|
| Age warning badge | > 3 days: `bg-amber-100 text-amber-700` "Waiting 3d" |
| Age critical badge | > 7 days: `bg-red-100 text-red-700` "Waiting 7d+" |
| Issue warning banner | Full-width amber banner: `bg-amber-50 border-t border-amber-100 px-4 py-2 text-xs text-amber-700 rounded-b-lg` |
| "Review →" button | `variant="outline"` size="sm" — always present |
| "Quick Approve ✓" | `variant="default"` size="sm" — absent on: items with issues / expenses > £200 / any `flagged = true` item |
| Card hover | `border-slate-300 bg-slate-50/50` transition |
| Card click | Opens Review Sheet Panel |

---

## 3.5 Grouped by Job View (toggle)

```
┌─────────────────────────────────────────────────────────────────────┐
│ ▼  Heathrow T3 Security                [3 pending]  [Approve All ✓]│
│    HSS Limited · Active                                             │
├─────────────────────────────────────────────────────────────────────┤
│    [TIMESHEET CARD — John Martinez]                                 │
│    [TIMESHEET CARD — Ali Hassan]                                    │
│    [EXPENSE CARD — Sarah Chen]                                      │
├─────────────────────────────────────────────────────────────────────┤
│ ▼  Canary Wharf Cleaning               [1 pending]                  │
│    Apex Properties · Active                                         │
├─────────────────────────────────────────────────────────────────────┤
│    [REPORT CARD ⚠ — Danny Walsh]                                    │
└─────────────────────────────────────────────────────────────────────┘
```

| Element | Specification |
|---|---|
| Group header | `bg-slate-50 border border-slate-200 rounded-t-lg px-4 py-3` |
| "Approve All" | Only shown if ALL items in group are Quick-Approvable |
| Collapse/expand | ▼/▶ chevron. State persists in session. |

---

## 3.6 Review Sheet Panel

```
┌─────────────────────────────────────────────────────────────────────────┐
│  REVIEW: Timesheet                                              [×]     │
│  ─────────────────────────────────────────────────────────────────      │
│  Worker:      John Martinez                                             │
│  Job:         Heathrow T3 Security — HSS Limited                        │
│  Submitted:   Tuesday 9 June 2026 · 08:14                              │
│  Reference:   TS-2026-0892                                              │
│                                                                         │
│  ── SUBMISSION DETAIL ─────────────────────────────────────────         │
│  Date:        Monday 8 June 2026                                        │
│  Start time:  06:00   End time: 13:30   Break: 0h 30min               │
│  Total hours: 7.5h regular · 0h overtime                               │
│                                                                         │
│  ── VERIFICATION ──────────────────────────────────────────────         │
│  [✓] GPS location confirmed (within 50m of site)                       │
│  [✓] Hours within contracted range                                     │
│  [✓] No issues flagged by worker                                       │
│                                                                         │
│  ── FINANCIAL PREVIEW ─────────────────────────────────────────         │
│  Rate: £18.50 / hour   Amount: £138.75                                 │
│  Job: Heathrow T3 Security (cost allocation)                           │
│                                                                         │
│  ── NOTES ─────────────────────────────────────────────────────         │
│  Add a note (optional):                                                 │
│  ┌────────────────────────────────────────────────────────────────┐    │
│  │                                                                │    │
│  └────────────────────────────────────────────────────────────────┘    │
│                                                                         │
│  [Reject ✕]            [← Previous]  [Next →]      [Approve ✓]        │
└─────────────────────────────────────────────────────────────────────────┘
```

### Review Sheet Panel Specifications

| Element | Specification |
|---|---|
| Panel width | 480px fixed |
| Animation | `translate-x-full → translate-x-0`, duration-300 |
| Approve button | `variant="default"`, right-aligned, primary color |
| Reject button | `variant="destructive"`, left-aligned |
| Reject with no note | Blocked — Reject button disabled until note has content. Error: "A rejection reason is required." |
| Previous / Next | Navigate through filtered queue without closing panel |
| After approval | Panel auto-advances to next item. Queue count decrements. |
| After rejection | Panel auto-advances. Queue count decrements. |
| Last item | "Queue Empty ✓" state shown for 2 seconds, then panel auto-closes |

### Expense Variant — Additional Section

```
│  ── RECEIPT ──────────────────────────────────────────────────────  │
│  ┌─────────────────────────────────────────────────────────┐       │
│  │  [Receipt image thumbnail — 100% width, max-h 200px]   │       │
│  │  [Click to expand]                                      │       │
│  └─────────────────────────────────────────────────────────┘       │
│  File: receipt_sarah_chen_2026-06-08.jpg                           │
```

### Report with Issues Variant — Additional Elements

Warning banner at top of panel:
```
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │  ⚠  This report contains a logged issue.                   │   │
│  │  Review the issue section before approving.                │   │
│  └─────────────────────────────────────────────────────────────┘   │
```

Issue detail section:
```
│  ── LOGGED ISSUE ─────────────────────────────────────────────────  │
│  Issue:     Equipment left on-site                                 │
│  Logged by: Danny Walsh · 9 Jun 2026 17:45                         │
│  Priority:  Medium                                                 │
│  Photos:    [3 attached]                                           │
```

---

## 3.7 Review Centre Empty State

```
┌─────────────────────────────────────────────────────────────────────┐
│                   [✓ CheckCircle icon — 48px, emerald]              │
│                   Review Queue Clear                                │
│                   All submissions have been reviewed.               │
│                   New submissions appear when workers               │
│                   submit from the field.                            │
│                   [Go to Dashboard →]                               │
└─────────────────────────────────────────────────────────────────────┘
```

---

# BLUEPRINT 4 — OPERATIONS HUB

## 4.1 Operations Sub-Navigation

```
┌─────────────────────────────────────────────────────────────────────┐
│  [Jobs]  [Schedule]  [Workers]  [Clients]  [Map]  [Stock & Assets]  │
└─────────────────────────────────────────────────────────────────────┘
```

| Property | Specification |
|---|---|
| Tab style | `px-4 py-2.5 text-sm font-medium border-b-2` |
| Active tab | `border-b-2 border-primary text-primary` |
| Inactive tab | `border-b-2 border-transparent text-muted-foreground hover:text-foreground` |
| Default active | `jobs` |
| URL behaviour | `/operations?tab=jobs`, `/operations?tab=schedule`, etc. |
| Back-compat | Existing routes `/jobs`, `/schedule`, etc. redirect to `/operations?tab=<name>` |

## 4.2 Tab Content Mapping

| Tab | Renders | Route Equivalent |
|---|---|---|
| Jobs | Existing jobs page content | `/jobs` |
| Schedule | Existing schedule page content | `/schedule` |
| Workers | Existing workers page content | `/workers` |
| Clients | Existing clients page content | `/clients` |
| Map | Existing map page content | `/map` |
| Stock & Assets | Existing equipment page content | `/equipment` |

## 4.3 Pending Review Badges on Job Cards

Job cards in Operations → Jobs show a pending review count badge:

```
┌──────────────────────────────────────────────────────────────┐
│  [job title]                          [Active]   [3 ✓ pending]│
│  [client name] · [location]                                  │
└──────────────────────────────────────────────────────────────┘
```

Badge `[3 ✓ pending]` links to `/review?jobFilter=<jobId>`.

---

# BLUEPRINT 5 — FINANCE HUB

## 5.1 Finance Sub-Navigation

```
Finance:
[Overview]  [Records]  [Invoicing]  [Payroll]  [Accounting]
```

Same tab style as Operations. Default: `overview` tab.

---

## 5.2 Finance Overview (New Page)

```
┌─────────────────────────────────────────────────────────────────────┐
│ THIS PERIOD STRIP (grid cols-4, gap-4)                              │
├──────────────────┬──────────────────┬──────────────────┬────────────┤
│ REVENUE          │ COSTS            │ MARGIN           │ EXPOSURE   │
│ RECOGNIZED       │ APPROVED         │                  │ (Pending)  │
│  £284,500        │  £191,200        │   32.8%          │ £47,300    │
│ +8% vs last      │ -2% vs last      │  ↑ on target     │ 18 items   │
└──────────────────┴──────────────────┴──────────────────┴────────────┘

┌──────────────────────────────┬──────────────────────────────────────┐
│  JOB PROFITABILITY (col-7)   │  INVOICE STATUS (col-5)             │
│                              │                                      │
│  Heathrow T3  £48k  38% ↑   │  Draft   ░░░ 3   £8,400            │
│  Canary Wharf £32k  29% →   │  Sent   ████ 8   £142,000          │
│  Victoria     £18k  22% ↓   │  Overdue ██░ 4   £24,800 ⚠         │
│  + 6 more...                 │  Paid   ████ 12  £318,000          │
│  [View All Records →]        │  [Open Invoicing →]                 │
└──────────────────────────────┴──────────────────────────────────────┘

┌──────────────────────────────┬──────────────────────────────────────┐
│  PAYROLL STATUS              │  ACCOUNTING STATUS                  │
│  Next run: in 4 days         │  Xero connected ✓                   │
│  28 workers in scope         │  Last sync: Today 06:00             │
│  12 timesheets approved      │  0 sync failures                    │
│  3 awaiting approval         │  2 open exceptions                  │
│  [Open Payroll →]            │  [Open Accounting →]                │
└──────────────────────────────┴──────────────────────────────────────┘
```

---

## 5.3 Financial Records Tab

Renders existing `/financial-explorer` content unchanged.
- Renamed: "Financial Records" (not "Financial Explorer")
- Breadcrumb: "Finance › Financial Records"
- All 10 internal tabs retained

---

## 5.4 Invoicing Tab

```
┌─────────────────────────────────────────────────────────────────────┐
│ INVOICING                                      [+ Create Invoice]   │
│                                                                     │
│ [All (27)] [Draft (3)] [Sent (8)] [Overdue (4)] [Paid (12)]         │
│                                                                     │
│ Invoice #  │ Client        │ Amount   │ Due Date   │ Status         │
│ INV-0892   │ HSS Limited   │ £8,400   │ 15 Jun     │ [Sent]        │
│ INV-0891   │ Apex Props    │ £3,200   │ 1 Jun ⚠   │ [Overdue]     │
│                                                                     │
│ ── INVOICE BUILDER (collapsed by default) ────────────────────────  │
│ [Expand on "+ Create Invoice" click — renders existing builder]     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 5.5 Payroll Tab

Sub-tabs: `[Processing Queue]  [Export History]`

- Processing Queue → existing `/payroll` content
- Export History → existing `/payroll-export` content
- Status banner above content: "Next run: [date] · [N] workers · [N] ready · [N] pending"

---

## 5.6 Accounting Tab

Sub-tabs: `[Sync Status]  [Reconciliation]  [Exceptions]  [Providers]`

- Sync Status → accounting sync content + "Sync Now" button
- Reconciliation → existing `/reconciliation-center` content
- Exceptions → existing `/exception-resolution-center` content
- Providers → existing `/accounting-settings` content

---

# BLUEPRINT 6 — INTELLIGENCE HUB

## 6.1 Intelligence Sub-Navigation

```
Intelligence:
[Overview]  [Analytics]  [Reports]  [Exports]  [Activity]
```

---

## 6.2 Intelligence Overview (New Page)

```
┌─────────────────────────────────────────────────────────────────────┐
│ HEALTH SCORECARD (grid cols-4, gap-4)                               │
├──────────────────┬──────────────────┬──────────────────┬────────────┤
│ OPERATIONAL      │ FINANCIAL        │ GOVERNANCE       │ WORKFLOW   │
│ HEALTH           │ HEALTH           │ RISK             │ EFFICIENCY │
│   87/100         │   72/100         │   45/100         │ 91/100     │
│  [● Healthy]     │  [● Warning]     │  [● Critical]    │ [● Healthy]│
└──────────────────┴──────────────────┴──────────────────┴────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│ CRITICAL ITEMS                                         [3 items]   │
│ [●] Xero sync failure — 14 records pending resync    [Resolve →]   │
│ [●] Automation rule RULE-042 suspended               [Review →]   │
│ [●] Reconciliation mismatch: INV-0881 — £420 delta   [Review →]   │
└─────────────────────────────────────────────────────────────────────┘

┌────────────┬────────────┬────────────┬────────────┬────────────┬────┐
│ 14 Active  │ 8 Pending  │ 42 Active  │ 3 Open     │ 09:14 Last │ .. │
│ Jobs       │ Reviews    │ Rules      │ Exceptions │ Workflow   │    │
└────────────┴────────────┴────────────┴────────────┴────────────┴────┘
```

### Health Scorecard States

| Level | Background | Text | Dot |
|---|---|---|---|
| Healthy (80–100) | `bg-emerald-50 border-emerald-200` | `text-emerald-700` | `bg-emerald-500` |
| Warning (50–79) | `bg-amber-50 border-amber-200` | `text-amber-700` | `bg-amber-500` |
| Critical (0–49) | `bg-red-50 border-red-200` | `text-red-700` | `bg-red-500` |

### Critical Items Panel

| Element | Specification |
|---|---|
| Data source | `executiveCommandEngine.getCriticalItems()` |
| Item row | Left colored dot + description + "[Action →]" ghost button |
| Action link | Deep link to source module |
| Empty state | "No critical items — all systems healthy" with emerald CheckCircle |
| Max items | 5. "Show all N →" if more exist |

---

## 6.3 Analytics Tab

Renders existing `/analytics-centre` content unchanged.
Breadcrumb: "Intelligence › Analytics"

---

## 6.4 Reports Tab

Renders existing Reporting Centre Reports tab content.
Breadcrumb: "Intelligence › Reports"

---

## 6.5 Exports Tab

Renders existing Reporting Centre Exports + Distribution tab content.
Breadcrumb: "Intelligence › Exports"

---

## 6.6 Activity Tab

```
┌─────────────────────────────────────────────────────────────────────┐
│ ACTIVITY                                                            │
│                                                                     │
│ Type: [All] [Operational] [Financial] [Governance] [Automation]     │
│ Priority: [All] [Critical] [Warning] [Info]    [Show Event Detail ○]│
│                                                                     │
│ ┌───────────────────────────────────────────────────────────────┐  │
│ │ [●] CRITICAL  review_event              09:14 today          │  │
│ │     Timesheet TS-0892 approved — John Martinez               │  │
│ │     Heathrow T3 Security              [Open Source →]        │  │
│ ├───────────────────────────────────────────────────────────────┤  │
│ │ [●] WARNING   sync_event               06:00 today           │  │
│ │     Xero sync — 14 records failed                            │  │
│ │     Accounting integration           [Investigate →]         │  │
│ └───────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
```

| Element | Specification |
|---|---|
| Data source | `activityFeedEngine.getRecentEvents()` + `notificationEngine.getAllNotifications()` |
| Priority dot | Red (critical), amber (warning), slate (info) |
| "Show Event Detail" toggle | Switch component, right-aligned. When ON: raw event metadata below each row (Event Bus data). Persists to localStorage. |
| Pagination | Load 25 items, "Load More" at bottom |

---

# BLUEPRINT 7 — AUTOMATION HUB

## 7.1 Automation Sub-Navigation

```
Automation:
[Rules]  [Workflows]  [Governance]  [Scheduler]
```

---

## 7.2 Rules Tab

Renders existing `/automations` content.
"+ New Rule" button → expands builder or opens dialog.

**Immediately visible:** Active rules list, status, trigger type.
**Hidden until needed:** Rule builder (behind "+ New Rule").

---

## 7.3 Workflows Tab

Renders existing `/workflows` content.
"+ New Workflow" button → opens builder.

---

## 7.4 Governance Tab

Renders existing `/automation-governance` content.

**Governance Alert Banner** (shown when any rule is Restricted or Suspended):
```
┌─────────────────────────────────────────────────────────────────────┐
│ ⚠  2 automation rules require governance action.                   │
│    RULE-042: Suspended · RULE-037: Restricted                      │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 7.5 Scheduler Tab

Extracts scheduler content from `/automations`.

**Immediately visible:** Active scheduled rules, next execution, last status.
**Hidden until needed:** Execution history (behind "View Execution History").

---

## 7.6 What Is Hidden By Default

| Element | Hidden Until | Trigger |
|---|---|---|
| Rule Builder form | New rule clicked | "+ New Rule" button |
| Workflow builder | New workflow clicked | "+ New Workflow" button |
| Compliance audit log | Button click | "View Compliance History" |
| Execution history detail | Button click | "View Execution History" per rule |
| Archived rules/workflows | Filter selection | "Show Archived" toggle |

---

# BLUEPRINT 8 — USER FLOW SPECIFICATIONS

## 8.1 Morning CEO Workflow

```
STEP 1 — LOGIN
  URL: /auth → redirect to /
  Time: ~10 seconds

STEP 2 — COMMAND DASHBOARD
  Zone A immediately visible:
    Pending Reviews: 14 (red) → click "Review Now"
    Revenue at Risk: £24,800 (amber) → address later
    Critical Alerts: 1 → check after approvals

STEP 3 — REVIEW CENTRE
  URL: /review
  Flat queue, 14 items, sorted oldest first

STEP 4a — QUICK APPROVE (clean timesheets)
  Click "Quick Approve ✓" on each clean timesheet
  ~5 seconds per item
  Count decrements

STEP 4b — REVIEW SHEET (expenses, flagged)
  Click "Review →" → sheet slides in
  Review receipt / hours / GPS verification
  Click "Approve ✓" → auto-advances to next item
  ~30 seconds per item

STEP 5 — QUEUE EMPTY
  "Queue Clear ✓" shown 2 seconds → panel closes

STEP 6 — DASHBOARD CHECK
  Return to Command
  Zone B: scan active jobs
  Zone C: confirm financial pulse

TOTAL: 8–12 minutes (14 items)
       2–3 minutes (empty queue)
```

---

## 8.2 Weekly Financial Workflow

```
STEP 1 — FINANCE HUB
  URL: /finance
  Finance Overview: KPI strip, profitability, invoices, payroll, accounting

STEP 2 — DRILL INTO MARGINS
  Click "View All Records →"
  URL: /finance?tab=records
  Sub-tab: Margin Intelligence
  Identify underperforming jobs

STEP 3 — PROCESS PAYROLL
  Click Payroll tab → Processing Queue
  Confirm all timesheets approved (badge on Review nav if pending)
  Click "Run Payroll" → confirmation → export
  Sub-tab switches to Export History

STEP 4 — GENERATE INVOICES
  Click Invoicing tab
  Filter to Draft → review 3 draft invoices → Mark as Sent
  Click "+ Create Invoice" → builder expands
  Select client + job → line items auto-populate → save → send

TOTAL: 25–45 minutes
```

---

## 8.3 Monthly Executive Workflow

```
STEP 1 — INTELLIGENCE HUB
  URL: /intelligence
  Intelligence Overview: resolve any critical items first

STEP 2 — ANALYTICS REVIEW
  Intelligence → Analytics tab
  Review 5-dimension health scores
  Note risks for board report narrative

STEP 3 — GENERATE REPORT
  Intelligence → Reports tab
  Click "+ Generate Report"
  Type: Board Report · Period: Current Month
  Click "Generate" → report appears as "Generated"

STEP 4 — BOARD PACK EXPORT
  Intelligence → Exports tab
  Click "Generate Board Pack"
  Select reports → generate → download → confirm

STEP 5 — DISTRIBUTE
  Click "Distribute" on Board Pack
  Method: Email · Add recipients · Send
  Status tracked in Exports tab

STEP 6 — RECONCILIATION
  Finance → Accounting → Reconciliation
  Review Matched / Unmatched
  Finance → Accounting → Exceptions
  Resolve open items

TOTAL: 45–90 minutes
```

---

# BLUEPRINT 9 — COMPONENT HIERARCHY

## 9.1 Command Dashboard

| Component | Classification | Action |
|---|---|---|
| Welcome header + date | Primary | Retain, remove System Status badge |
| Zone A Card A1 (Pending Reviews) | Primary | **New component** |
| Zone A Card A2 (Revenue at Risk) | Primary | **Redesign** from "Overdue Rev" stat |
| Zone A Card A3 (Critical Alerts) | Primary | **Promote** from exec snapshot |
| Active Jobs Feed | Primary | Retain, add pending review badges |
| Today's Picture | Primary | **New component** |
| Financial Pulse Strip (Zone C) | Secondary | **Redesign** from stat cards |
| Executive Snapshot Widget | Removed | Move to Intelligence → Overview |
| Analytics Intelligence section | Removed | Move to Intelligence → Analytics |
| Risk Highlights section | Removed | Move to Intelligence → Analytics |
| Forecast Summary section | Removed | Move to Intelligence → Analytics |
| Trend Analysis section | Removed | Move to Intelligence → Analytics |
| Reporting Snapshot section | Removed | Move to Intelligence → Reports |
| Export Reports Widget | Removed | Move to Intelligence → Exports |
| Activity Feed Widget | Removed | Move to Intelligence → Activity |
| "System Status: Operational" badge | Removed | Delete entirely |

---

## 9.2 Review Centre

| Component | Classification | Action |
|---|---|---|
| Page header + count badge | Primary | Enhance |
| Type filter bar | Primary | **New component** |
| Flat queue view | Primary | **New component** |
| Queue item cards with age indicators | Primary | **Redesign** |
| "Quick Approve" button | Primary | **New component** |
| Review Sheet Panel (slide-in) | Primary | **New component** |
| Sort controls | Secondary | **New component** |
| "Group by Job" view | Secondary | Demote to toggle (was default) |
| "Approve All" per group | Secondary | **New component** |
| Previous / Next in sheet | Secondary | **New component** |
| Console.log statements | Removed | **Delete immediately** |

---

## 9.3 Navigation System

| Component | Classification | Action |
|---|---|---|
| Sidebar with section labels | Primary | **Redesign** |
| Review badge count | Primary | **New component** |
| System alert indicator in header | Primary | **New component** |
| Header breadcrumb | Secondary | **New component** |
| Header global search input | Secondary | **New component** (placeholder) |
| User menu dropdown | Secondary | **Expand** |
| Mobile bottom tab bar | Primary on mobile | **New component** |
| Notification bell popover | Secondary | Retain, update "View All" link |
| 30 flat nav items | Removed | Restructured into 7 grouped items |

---

# BLUEPRINT 10 — IMPLEMENTATION PRIORITY MATRIX

| Feature | Business Impact | Complexity | Demo Risk | Priority Score | Phase |
|---|---|---|---|---|---|
| Remove console.log statements | 3 | 1 | 5 | 16.0 | UX-1 |
| Add Review Centre badge count | 5 | 1 | 4 | 18.0 | UX-1 |
| Rename 7 nav labels | 4 | 1 | 4 | 16.0 | UX-1 |
| Value proposition on login | 3 | 1 | 3 | 12.0 | UX-1 |
| Worker role redirect | 4 | 1 | 4 | 16.0 | UX-1 |
| Fix Stock & Assets icon | 2 | 1 | 2 | 8.0 | UX-1 |
| Sidebar section labels | 5 | 2 | 4 | 9.0 | UX-2 |
| Collapse admin items | 4 | 2 | 3 | 7.0 | UX-2 |
| Zone A (3-card attention strip) | 5 | 2 | 5 | 10.0 | UX-3 |
| Zone B (jobs feed redesign) | 4 | 2 | 4 | 8.0 | UX-3 |
| Zone C (financial pulse) | 4 | 2 | 3 | 7.0 | UX-3 |
| Remove intelligence widgets from dashboard | 4 | 2 | 4 | 8.0 | UX-3 |
| All Clear states on Zone A | 3 | 1 | 2 | 8.0 | UX-3 |
| Finance sub-navigation | 5 | 2 | 4 | 9.0 | UX-4 |
| Finance Overview landing page | 5 | 4 | 3 | 5.5 | UX-4 |
| Merge Invoices + Invoice Builder | 4 | 3 | 3 | 4.7 | UX-4 |
| Merge Payroll tabs | 3 | 2 | 2 | 5.0 | UX-4 |
| Merge Accounting tabs | 3 | 3 | 2 | 3.3 | UX-4 |
| Intelligence sub-navigation | 4 | 2 | 3 | 7.0 | UX-5 |
| Intelligence Overview landing | 4 | 3 | 2 | 5.3 | UX-5 |
| Merge Analytics/Reports/Exports | 3 | 2 | 2 | 5.0 | UX-5 |
| Activity tab + Event Detail toggle | 3 | 2 | 2 | 5.0 | UX-5 |
| Automation sub-navigation | 3 | 2 | 2 | 5.0 | UX-6 |
| Governance alert banner | 4 | 1 | 3 | 11.0 | UX-6 |
| Merge Automation tabs | 3 | 3 | 2 | 3.3 | UX-6 |
| Review Centre flat queue view | 5 | 3 | 4 | 6.0 | UX-7 |
| Review Centre slide-in panel | 5 | 3 | 3 | 5.3 | UX-7 |
| Quick Approve button | 5 | 2 | 3 | 6.5 | UX-7 |
| Age-based warning indicators | 4 | 1 | 3 | 11.0 | UX-7 |
| Previous/Next in review sheet | 4 | 2 | 2 | 6.0 | UX-7 |
| Approve All per group | 3 | 2 | 2 | 5.0 | UX-7 |
| Operations sub-navigation | 4 | 2 | 3 | 7.0 | UX-8 |
| Pending review badges on job cards | 4 | 2 | 3 | 7.0 | UX-8 |
| Header breadcrumb | 3 | 2 | 2 | 5.0 | UX-8 |
| Global search input (placeholder) | 3 | 1 | 2 | 8.0 | UX-8 |
| Mobile bottom tab bar | 4 | 3 | 3 | 4.7 | UX-8 |

---

# BLUEPRINT 11 — RECOMMENDED BUILD ORDER

## Phase UX-1 — Critical Credibility Fixes
**Duration:** 1 day | **Risk:** Low | **Prerequisite:** None

| Task | Effort |
|---|---|
| Remove console.log from review.tsx | 30 min |
| Fix Stock & Assets navigation icon | 30 min |
| Add value proposition to /auth login screen | 1 hour |
| Rename 7 navigation labels | 2 hours |
| Add live Review Centre badge count to sidebar | 2 hours |
| Add Worker role redirect to /worker/jobs | 1 hour |

**Acceptance:** No console logs in DevTools. Badge shows live count. Login has value proposition. Correct terminology throughout.

---

## Phase UX-2 — Navigation Restructuring (Visual)
**Duration:** 2 days | **Risk:** Low | **Prerequisite:** UX-1

| Task | Effort |
|---|---|
| Implement sidebar section labels and dividers | Day 1 |
| Collapse Administration items behind single expandable item | Day 2 |
| Add System Alert indicator to header | Day 2 |
| Update Notification bell "View All" link | Day 2 |

**Acceptance:** Sidebar shows grouped sections. Admin items collapsible. 30-item flat list is organized.

---

## Phase UX-3 — Dashboard Redesign
**Duration:** 4 days | **Risk:** Medium | **Prerequisite:** UX-1, UX-2

| Task | Day |
|---|---|
| Build AttentionCard component + implement Zone A (3 cards) | Day 1 |
| Redesign Zone B: ActiveJobsFeed + TodaysPicture | Day 2 |
| Implement Zone C: FinancialPulse (4 KPI cards) | Day 3 |
| Remove all intelligence/reporting widgets. Update dashboard header. All Clear states. QA. | Day 4 |

**Acceptance:** Dashboard shows 3 zones only. No intelligence widgets. Zone A shows live data. All action buttons navigate correctly.

---

## Phase UX-4 — Finance Hub
**Duration:** 5 days | **Risk:** Medium | **Prerequisite:** UX-3

| Task | Day |
|---|---|
| Create /finance route + sub-navigation + wire existing pages to Records/Payroll/Accounting tabs | Day 1 |
| Invoicing tab: mount invoices + status filter + collapsible invoice builder | Day 2 |
| Payroll tab: sub-tabs (Processing Queue / Export History) + status banner | Day 3 |
| Accounting tab: sub-tabs (Sync / Reconciliation / Exceptions / Providers) | Day 4 |
| Finance Overview landing page | Day 5 |

**Acceptance:** Single "Finance" nav item. All finance features in hub. Finance Overview renders correct data.

---

## Phase UX-5 — Intelligence Hub
**Duration:** 5 days | **Risk:** Medium | **Prerequisite:** UX-4

| Task | Day |
|---|---|
| Create /intelligence route + sub-nav + wire Analytics/Reports/Exports tabs | Day 1 |
| Activity tab: combine Activity Feed + Notifications + type/priority filters | Day 2 |
| Event Detail toggle (surfaces Event Monitor data inline) | Day 3 |
| Intelligence Overview landing (Health Scorecard + Critical Items + Summary) | Day 4 |
| Update sidebar + existing route redirects + notification bell link | Day 5 |

**Acceptance:** Single "Intelligence" nav item. Intelligence Overview renders health data. Activity combines feeds.

---

## Phase UX-6 — Automation Hub
**Duration:** 3 days | **Risk:** Low | **Prerequisite:** UX-5

| Task | Day |
|---|---|
| Create /automation route + sub-nav + wire Rules/Workflows/Governance tabs | Day 1 |
| Scheduler tab extraction | Day 2 |
| Governance alert banner + sidebar update + route redirects | Day 3 |

**Acceptance:** Single "Automation" nav item. Governance banner appears when rules require action.

---

## Phase UX-7 — Review Centre Enhancement
**Duration:** 4 days | **Risk:** Medium-High | **Prerequisite:** UX-1

| Task | Day |
|---|---|
| Flat queue view + queue item cards (type borders, age badges, verification checks) | Day 1 |
| Type filter bar + sort controls + Group by Job toggle + Approve All | Day 2 |
| Review Sheet Panel (timesheet + expense + report variants) | Day 3 |
| Previous/Next navigation + auto-advance + Quick Approve + empty state | Day 4 |

**Acceptance:** Flat queue sorted by age. Sheet panel slides in. Quick Approve works. Rejection blocked without note. Empty state correct.

---

## Phase UX-8 — Operations Hub + Polish
**Duration:** 3 days | **Risk:** Low | **Prerequisite:** UX-7

| Task | Day |
|---|---|
| Create /operations route + sub-nav + wire all 6 tabs | Day 1 |
| Pending review badges on job cards + header breadcrumb + global search placeholder | Day 2 |
| Mobile bottom tab bar + responsive QA + final navigation cleanup | Day 3 |

**Acceptance:** Single "Operations" nav item. Job cards show pending counts. Header breadcrumb visible. Primary nav shows exactly 7 items. Mobile bottom tabs functional.

---

## Complete Build Schedule

```
WEEK 1
  Day 1–2:  Phase UX-1 (Credibility Fixes)
  Day 3–4:  Phase UX-2 (Navigation Restructuring)
  Day 5:    Begin Phase UX-3 (Dashboard — Zone A)

WEEK 2
  Day 1–2:  Complete Phase UX-3 (Zones B, C, remove widgets)
  Day 3–5:  Begin Phase UX-4 (Finance Hub)

WEEK 3
  Day 1–2:  Complete Phase UX-4
  Day 3–5:  Begin Phase UX-5 (Intelligence Hub)

WEEK 4
  Day 1–2:  Complete Phase UX-5
  Day 3:    Phase UX-6 (Automation Hub)
  Day 4–5:  Begin Phase UX-7 (Review Centre)

WEEK 5
  Day 1–2:  Complete Phase UX-7
  Day 3–5:  Phase UX-8 (Operations Hub, polish)

WEEK 6
  Day 1–3:  Cross-phase QA and regression testing
  Day 4:    Demo environment preparation
  Day 5:    Stakeholder review and sign-off

MILESTONES:
  Pre-demo minimum (UX-1, UX-2, UX-3):     End of Week 1
  Investor demo readiness (UX-1 → UX-7):   End of Week 5
  Full programme complete:                   End of Week 6
```

---

## Dependency Graph

```
UX-1 ── Required by all phases
UX-2 ── Requires UX-1
UX-3 ── Requires UX-2
UX-4 ── Requires UX-3 → leads to UX-5
UX-5 ── Requires UX-4 → leads to UX-6
UX-6 ── Requires UX-5 (independent otherwise)
UX-7 ── Requires UX-1 only (can run parallel with UX-4/5/6)
UX-8 ── Requires UX-7

Parallel tracks after UX-3:
  Track A: UX-4 → UX-5 → UX-6
  Track B: UX-7 → UX-8
```

---

*This document is the authoritative UX Blueprint for the CEO Experience Redesign Programme. Every screen specification is implementation-ready and should be used as the primary reference by frontend engineers during each development phase. All existing doctrine, approval workflows, and data integrity rules are preserved unchanged.*
