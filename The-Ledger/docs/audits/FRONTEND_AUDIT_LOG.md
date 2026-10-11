# Frontend Audit Log

Scope: front-end bugs, UX defects and inconsistencies. Mock-data inconsistencies are LOW priority (demo data).
Status legend: OPEN = found, not fixed. No fixes applied yet.

## Run 1 — initial pass (surface-level, list pages only)

| ID | Sev | Area | Finding | Status |
|---|---|---|---|---|
| R1-01 | Low | Data | Pending review count differs: Command 7, Review briefing 10, queue 6, Intelligence 3 (mock data) | OPEN |
| R1-02 | Low | Data | Finance £4.9k vs Financial Insights £425k; Financial Insights jobs exist nowhere else (mock data) | OPEN |
| R1-03 | Low | Data | Seed dates stale vs "today" (automations May 2026, payroll next run 20 Jun, sync 31 May) | OPEN |
| R1-04 | Low | Data | Intelligence alerts cite JOB-2026-006 etc. not present in demo jobs | OPEN |
| R1-05 | Med | Code | `App.tsx` declares /invoices, /payroll, /financial-explorer etc. twice; later declarations unreachable | OPEN |
| R1-06 | Med | Code | `ProtectedRoute` derives role via `roleIds[0].includes("ceo")` string matching | OPEN |
| R1-07 | Low | Code | `console.log('ADD REVIEW ITEM')` left in `mockData.ts` addReviewItem | OPEN |
| R1-08 | Low | Data | Job note contains hard-coded access code (demo) | OPEN |
| R1-09 | Med | UX | Intelligence Operational Health 0/100 "Critical" while Automation health 82% — scoring looks unreliable | OPEN |

## Run 2 — deep pass (clicking into detail pages) — IN PROGRESS

Severity: High = broken/misleading behaviour, Med = clear UX defect/inconsistency, Low = polish.

### Global / shell
| ID | Sev | Finding | Status |
|---|---|---|---|
| R2-01 | High | Notification bell icon is invisible in the desktop header: it uses sidebar colours (`text-sidebar-foreground/70`, colour ≈ page background) on a light bar. Only the red badge shows. (`components/layout.tsx` NotificationBell) | OPEN |
| R2-02 | High | No `<title>`: tab shows raw URL on every page. `index.html` has og/twitter title meta only. OG/Twitter tags still point at replit.com image and `@replit` | OPEN |
| R2-03 | Med | Viewport meta has `maximum-scale=1` (blocks pinch-zoom; WCAG 1.4.4) | OPEN |
| R2-04 | Med | Icon-only buttons with no accessible name (3 on job detail; back-arrow buttons on detail pages; worker/asset action icons) | OPEN |
| R2-05 | Med | Date format is US `M/D/YYYY` across the platform (job cards, worker/client detail, invoices) while copy is British English and dashboard uses `10 Oct 2026`; equipment detail shows raw ISO `2023-05-12`; schedule shows seconds `8:44:13 PM` | OPEN |
| R2-06 | High | Currency inconsistency: `$` on client detail (Total Billed/Paid/Outstanding, job Cost) and equipment detail (`$420.00/day`) vs `£` elsewhere | OPEN |
| R2-07 | Low | Location detail shows `£1650` (no thousands separator) vs `£1,650` elsewhere | OPEN |
| R2-08 | Med | Detail-page back arrows go to standalone routes (/jobs, /workers, /clients) and leave the Operations hub (tab bar lost) | OPEN |

### Operations
| ID | Sev | Finding | Status |
|---|---|---|---|
| R2-10 | Med | Job detail "Edit" only edits priority/PM/status; title, dates, address cannot be edited | OPEN |
| R2-11 | High | Job detail "Share" publishes a document to the client portal on one click with no confirmation; button stays "Share" afterwards (can re-share) | OPEN |
| R2-12 | Med | Planned jobs with no data show "Health Score 100" and six empty finance panels; active job with no data shows "Payment Delay Risk" beside health 85 | OPEN |
| R2-13 | Med | Job/schedule titles hard-truncated ("HVAC system replacement …"), no tooltip | OPEN |
| R2-14 | Med | Job and client cards are clickable divs, not links (no new-tab, keyboard/semantics) | OPEN |
| R2-15 | Med | Worker edit accepts invalid email (`not-an-email`) and saves silently; no validation, no toast; first/last name inputs unlabeled | OPEN |
| R2-16 | Med | Schedule job drawer reflows the grid, wraps the page title and loses right padding inside the container | OPEN |
| R2-17 | Med | Map: 3 of 5 markers stacked at identical coords, 2 London markers off-screen (no fitBounds); markers do not reflect Active/Planned legend colours | OPEN |
| R2-18 | High | Stock & Assets: Assets table and Service Alerts show "Invalid Date" / "NaN days" for every asset. `AssetTable`/`AlertsPanel` read `lastService`/`nextService`/`assignedJob` but data has `lastServiceDate`/`nextServiceDate`/`assignedToJobId`. Same on Location detail. Assigned Job column always "—" | OPEN |
| R2-19 | Med | Asset status badges only map Active/Maintenance/Overdue/Retired; real statuses "In Service", "Needs Service" etc. fall to default | OPEN |
| R2-20 | Med | Stock & Assets Overview cards are hard-coded (1,204 items, 12 low stock, £185,000, 24 assets) not derived from the store | OPEN |
| R2-21 | Low | Stock table "Pending Req." column always empty; Location detail Active Alerts 0 while list card shows 2 | OPEN |
| R2-22 | Med | Equipment entities (de1…, with day rates driving billing) are not listed anywhere in Stock & Assets; /equipment/:id only reachable via job usage | OPEN |
| R2-23 | Low | Asset detail subtitle renders an empty bullet ("• SN: … •") | OPEN |

### Dashboard / Review / Finance
| ID | Sev | Finding | Status |
|---|---|---|---|
| R2-30 | Low | Dashboard "4 scheduled today" vs "No shifts scheduled today" directly beneath; Pending exposure £0 with "7 items" | OPEN |
| R2-31 | High | Finance > Invoicing "View" does nothing: /invoices/:id is redirected to the Invoicing tab, so Invoice Detail page is unreachable | OPEN |
| R2-32 | Med | Invoicing tab shows "No accounting software connected" while Accounting tab shows QuickBooks Connected | OPEN |
| R2-33 | Med | Invoice Builder drawer drafts (INV-…) are a separate list from Invoicing (EXB-…); draft counts differ; stat tile clips "£4,922.7" | OPEN |
| R2-34 | Low | Invoice number wraps onto two lines in the Invoicing table | OPEN |
| R2-35 | High | Review detail renders raw ISO timestamps (`2026-10-10T16:50:02.616Z`) — `review-detail.tsx:478` prints `item.submittedAt` | OPEN |
| R2-36 | Med | Review: approve/reject have no confirmation and no toast; Reject captures no reason; batch reject/correction discard `_reason`; "Approve All Remaining" is one click | OPEN |
| R2-37 | Med | Review priority disagrees between queue (HVAC = Low) and detail (Critical, "Medium Priority Job") — two derivations | OPEN |
| R2-38 | Low | Pluralisation: "1 Reports", "1 Photos" in review queue chips | OPEN |

### Finance / Intelligence / Automation / Roles (Chrome, desktop)
| ID | Sev | Finding | Status |
|---|---|---|---|
| R2-40 | Low | Finance > Records shows an internal function name in UI copy: "source: approved financial records via getJobFinancialSummary()"; "1 jobs" pluralisation | OPEN |
| R2-41 | Med | Finance Payroll tab: two stacked page titles ("Finance — Payroll" and "Payroll Staging"); stat icons are `$` in a £ product; "Next run: 20 Jun 2026" is in the past | OPEN |
| R2-42 | Med | Intelligence > Analytics: forecast values unformatted ("Current: 285000", "Projected: 282150", margin "Current: 32") with no £/%; remediation text still says "Financial Explorer accounting sync panel" (page no longer exists) | OPEN |
| R2-43 | Low | Intelligence health tile "Governance Risk" repeats its own name as the status label (others show Critical/Blocked/Failing) | OPEN |
| R2-44 | Low | Intelligence > Activity: job refs (JOB-2026-001…) are plain text, not links; every row says "Open Source" | OPEN |
| R2-45 | Med | Automations hub: two near-duplicate KPI strips stacked above the tabs, repeated on every one of 11 tabs, pushing content below the fold; 11 tabs wrap to two rows | OPEN |
| R2-46 | Med | Automation Rules table is 1411px wide inside a 1150px container (horizontal scroll hides the View column); names truncated at 220px | OPEN |
| R2-47 | Med | Create Automation wizard: Rule Name* and Description* are marked required but "Next" advances with both empty | OPEN |
| R2-48 | Low | Automation Centre: "Last 24h — Failures 0" next to "Requires Attention — 3 failed executions" with no explanation of window difference | OPEN |
| R2-49 | Med | Roles: CEO can edit their own role (remove own permissions) with no guard or confirmation | OPEN |
| R2-50 | Low | Job Intelligence only lists active/planned jobs, so the single job with data (Kitchen extraction, Completed) is hidden and page says "No approved financial activity"; card button rows not aligned when titles wrap | OPEN |
| R2-51 | Low | Financial Insights: large blank gap under Expense Exposure card; route is `/expenses` but nav label is "Financial Insights" | OPEN |
| R2-52 | Low | Client Requests: rows have no detail view (request body/description cannot be read), no link to related job | OPEN |
| R2-53 | Low | Governance header authority notice squeezed into a narrow wrapped box; KPI labels wrap mid-word-pair | OPEN |

### Worker app + mobile (built-in browser, 375px)
| ID | Sev | Finding | Status |
|---|---|---|---|
| R2-60 | Low (dev-only) | "Enterprise Sync QA Panel" dev button (`SynchronizationDebugPanel`, fixed bottom-right, z-50) renders on every page for every role, incl. login. On the worker app it covers the 6th bottom-tab ("Profile") so it cannot be tapped | OPEN |
| R2-61 | High | Worker can submit a completely empty report (no summary, hours, uploads): toast "Report Submitted" and it enters the Review Centre | OPEN |
| R2-62 | Med | Worker Home: "ATTENTION REQUIRED — All clear — nothing requires attention" displayed directly above "1 submission need changes" (contradiction + grammar) | OPEN |
| R2-63 | Med | Worker/PM surfaces use `DD/MM/YYYY` and 24h time; executive surfaces use `M/D/YYYY` and 12h time (cross-role inconsistency; extends R2-05) | OPEN |
| R2-64 | Low | Worker report page has two titles ("Report" header + "Submit Report" bar); button labelled "Save" but it submits; upload tiles come before Work Summary | OPEN |
| R2-65 | High | Executive/PM shell overflows horizontally at 375px: layout viewport grows to Command 592px, Review 638, Operations 584, Intelligence 603, PM Jobs 550, PM Review 504, Schedule 435, Automations 473, Clients 385 (Finance 375 ok). Fixed header/tab bar stretch with the page so hamburger/bell/tab items fall off-screen. Cause: `main` is a flex child without `min-w-0` and inner grids (`lg:grid-cols-12` etc.) have nowrap rows (~494px) | OPEN |

### Correction to R2-05 (date format)
Dates are produced with `toLocaleDateString()` / `toLocaleString()` with no explicit locale, so format follows the *browser* locale (en-US Chrome → `10/5/2026`, en-GB → `05/10/2026`). Not hard-coded US. Fix = pass `"en-GB"` (or a shared formatter) everywhere. Mixed formats also seen within the same page set (`10 Oct 2026`, ISO `2023-05-12`, `10/10/2026, 8:48:23 PM`).

### Portal / RBAC / misc (built-in browser + Chrome)
| ID | Sev | Finding | Status |
|---|---|---|---|
| R2-70 | High | RBAC: Project Manager can open `/expenses` (Financial Insights, in PM sidebar) and sees company-wide Revenue £425k, Gross Profit, margins, spend — contradicts "financial access CEO-scoped" doctrine | OPEN |
| R2-71 | Med | Dev QA pages `/qa` and `/qa/validation` ("Phase 2 QA Checklist") are reachable by any signed-in role (no `roles` gate) | OPEN |
| R2-72 | Med | 404 page shows scaffold text "Did you forget to add the page to the router?" to end users | OPEN |
| R2-73 | Low (dev-only) | Dev "Enterprise Sync QA Panel" button also renders in the Client Portal (client-facing) and on the login screens | OPEN |
| R2-74 | Med | Portal dashboard "Open Requests 0" while Requests page lists 1 Open + 1 Acknowledged; "Active Projects 3" includes a Planned project; project filter has All/Active/Completed only (Planned reachable only via All) | OPEN |
| R2-75 | Low | Portal "Payment Contact" is "The Ledger Portal / Accounts Team / accounts@theledger.app" (the platform vendor), not the client's supplier | OPEN |
| R2-76 | Med | Tablet width (~800px): job cards truncate titles to ~8 chars ("HVAC sy…"); portal KPI labels truncate ("ACTIVE PR…", "OUTSTAND…") | OPEN |
| R2-77 | Low | Finance sub-pages stack three levels of titles/tabs (Finance — Accounting → Reconciliation Centre → Reconciliation/Sync Operations); sub-page headings are same visual size as the page h1 | OPEN |
| R2-78 | Low | Raw ids shown to users: "Default: quickbooks", "Quickbooks — Connected" (brand is QuickBooks) | OPEN |
| R2-79 | Low | Create Job dialog: no required-field markers (button just stays disabled); "Other" cost input orphaned at half width; dialog fields lack programmatic labels (comboboxes/date inputs unnamed — also the Jobs date-range filter inputs) | OPEN |
| R2-80 | Med | Worker edit-save (worker detail page) gives no success toast (observed); other edit-saves not yet verified. Add Worker empty-submit does show inline invalid state — OK | OPEN |

Verified OK (no defect): app console clean (no errors/warnings from app code across 7 routes); Access Denied page works for PM on /finance /intelligence /audit /event-monitor; Client Requests resolve dialog enforces a note; worker Log Issue disables submit until description; Create Job disables until valid; worker Home/Jobs/Schedule/History render and are mobile-correct at 375px; sidebar collapse state restores.

### Corrections after source check
- R2-60 / R2-73: `SynchronizationDebugPanel` is gated by `import.meta.env.DEV` (line 27), so the floating gear only exists on the dev server, not in a production build. Still overlaps the worker 6th tab and shows in portal when running dev; downgraded to Low (dev-only).
- R2-02 confirmed: `client/index.html` has no `<title>` element.
- R2-03 confirmed: `maximum-scale=1` in `client/index.html` line 5.
- R2-01 confirmed in source: `layout.tsx:117` NotificationBell uses `text-sidebar-foreground/70` on a light header (icon only visible on hover when `bg-sidebar-accent` applies).

### Source references for fix phase
- R2-06 `$`: `pages/client-detail.tsx:646,652,658,1016`; `pages/equipment-detail.tsx:199` (also silently defaults a missing dayRate to 150). `$` icon (DollarSign) in Payroll stat tiles.
- R2-18 Invalid Date: `components/stock-assets/AssetTable.tsx` (lastService/nextService/assignedJob), `AlertsPanel.tsx` (nextService), parent mapping `pages/equipment.tsx:278` only adds `location`.
- R2-35 raw timestamp: `pages/review-detail.tsx:478`.
- R2-36 no confirm/reason: `pages/review-detail.tsx:49-78`.
- R2-61 empty report submit: `pages/worker/report.tsx:213` `handleSubmit` has no validation before queueing.
- R2-20 hard-coded overview: `components/stock-assets/OverviewCards.tsx`.
- R2-65 mobile overflow: `components/layout.tsx:647` `<main className="flex-1 …">` inside `div.flex` with no `min-w-0`; plus dashboard/review grids with nowrap rows.

## Run 3 — forms, destructive actions, RBAC scoping, responsive, a11y, offline flow

Method: built-in browser (separate storage) as CEO / PM / Worker / Client; JS structural scans (unnamed controls, unlabeled inputs, clickable-but-unfocusable cards, horizontal overflow) on 12 routes; viewport 768px and 955px; offline queue exercised end to end.

### RBAC / data scoping
| ID | Sev | Finding | Status |
|---|---|---|---|
| R3-01 | High | Worker is not scoped to assigned jobs: Demo Worker (assigned only to DEMO-JOB-0202) can open `/worker/jobs/dj-pm-active-1` (DEMO-JOB-0203) and sees the site access code, site contacts, emergency numbers and job description, and can open its report form. No assignment check in `worker/job-detail.tsx` / `worker/report.tsx` | OPEN |
| R3-02 | Med | Worker jobs list is correctly scoped, but ProtectedRoute lists `Worker`, `CEO`, `PM` for all `/worker/*` routes so CEO/PM see an empty worker shell ("No jobs assigned") | OPEN |

### Destructive / irreversible actions
| ID | Sev | Finding | Status |
|---|---|---|---|
| R3-10 | High | Workers list trash icon calls `deleteWorker` immediately (`pages/workers.tsx:315`): no confirmation, no toast, no undo, and the worker may have timesheets/jobs attached | OPEN |
| R3-11 | Med | Delete confirmation is inconsistent: native `window.confirm` for assets (`equipment.tsx:61,73`) and clients (`clients.tsx:57`), none for workers, and the shadcn `AlertDialog` is used nowhere outside `components/ui` | OPEN |
| R3-12 | Med | Invoice Builder drawer: Draft → Ready → Sent → **Paid** advance with one click each (no confirm, no payment date/amount, no undo). Drafts marked Paid never appear in the Invoicing list (separate store from EXB- invoices) — reinforces R2-33 | OPEN |
| R3-13 | Med | Invoice Builder tax is fixed at 0% with no control to set VAT | OPEN |
| R3-14 | Low | Invoice Builder line types render lowercase and US-spelled ("labor", "equipment") against the British lexicon ("Labour") | OPEN |

### Forms / validation
| ID | Sev | Finding | Status |
|---|---|---|---|
| R3-20 | Med | Settings: Save accepts an empty Legal Company Name and a malformed sort code ("abc"); no validation | OPEN |
| R3-21 | Low | Settings Save fires two toasts, the second "Notification Settings Saved — Company details updated successfully" (wrong title/copy-paste body) | OPEN |
| R3-22 | Med | Add Stock accepts negative quantity / unit cost / reorder level (no `min`) | OPEN |
| R3-23 | Low | Add Stock/Asset validation is toast-only; no inline field marking | OPEN |
| R3-24 | Low | Settings inputs have no id/name (anchoring labels/autofill impossible) | OPEN |

### Responsive (built-in browser emulation)
| ID | Sev | Finding | Status |
|---|---|---|---|
| R3-30 | High | Tablet 768px: every executive route overflows horizontally — Command 864px, Review 956, Operations 876, Finance>Records 1086, Intelligence 875, Automations 879. The fixed 256px sidebar is shown from `md` (768px) leaving ~512px for content | OPEN |
| R3-31 | Med | At ~955px (below `lg`) Finance Payroll (1011px) and Finance Records (1086px) still overflow — 4-up KPI card rows do not wrap | OPEN |

### Accessibility (structural scan)
| ID | Sev | Finding | Status |
|---|---|---|---|
| R3-40 | Med | Every executive page has 2 unnamed buttons (sidebar collapse toggle `layout.tsx:476`, plus the dev gear); Workers tab has 10 (row edit/delete icons, no aria-label); Schedule has 4 (week prev/next, drawer controls) | OPEN |
| R3-41 | Med | Clickable cards that are not focusable/keyboard-operable: Jobs 4, Schedule 15 shift cards (plus day headers), Command active-job rows | OPEN |
| R3-42 | Med | Unlabeled form controls: Jobs date-range filters (3), Workers search (1), Review search (1), Stock search (1) | OPEN |
| R3-43 | Low | Heading level skips on Review and Schedule (h2→h4) | OPEN |
| R3-44 | Med | Worker "Online / Offline Mode" banner is a clickable `div` (`WorkerMobileLayout.tsx:32`) — no role, no keyboard, no label; one stray tap flips a field worker offline | OPEN |
| R3-45 | Med | Offline mode is manual only: nothing listens to `navigator.onLine` / `online`/`offline` events, so a real connection drop is never reflected | OPEN |

### Portal
| ID | Sev | Finding | Status |
|---|---|---|---|
| R3-50 | Low | Portal project: "Assigned PM —" in summary but "Project Manager Sarah Jenkins" in Project Contacts; timeline shows "Project created 10/10/2026" after "Work started 05/10/2026"; "Next Scheduled Visit OCT 5" in the past | OPEN |

### Verified OK this run
Offline queue end to end (offline → Issue Queued toast → pending badge → back online → Synced, counters correct); Exception "Resolve" requires notes and Confirm stays disabled until provided; Create Job disabled until valid; Add Worker shows inline invalid state; Portal "New request" shows an inline error for empty submit; PM blocked from /finance /intelligence /audit /event-monitor; Worker blocked from /review (Access Denied) and redirected from exec routes; unauthenticated users redirect to /auth; Event Monitor renders; Schedule week navigation and Today work.

### Not yet covered (candidates for Run 4)
Reconciliation/Sync Retry buttons and Financial Controls tab; Client detail edits (portal account Disable, tags, documents add); Equipment detail edit; Asset/Stock detail actions (Adjust Quantity, Change Status, Assign to Job, Delete); Location create; Role create/delete and user role assignment; Review Centre actions with real clicks (Approve/Reject/Correction/Escalate) and what follows downstream (Finance numbers, notifications, audit log entries); Audit Log page contents after actions; Reporting build-report and Board Pack dialogs; Notification mark-read/dismiss; Automation actions (pause/resume/disable/archive); Governance Restrict/Suspend/Restore; Workflow pause/archive; Portal messages (new thread) and invoice detail/ download; Worker Start Shift timer, photo upload, expenses/materials on report; PM job scoping with multiple managers; text/copy proofreading pass.

## Run 4 — actions and their downstream effects, dead controls, audit-trail completeness

Method: performed real actions in the (in-memory) demo as CEO/Worker/Client using client-side navigation so state persisted, then inspected Audit Log, Compliance Audit, dashboards and source.

### Dead / orphaned UI
| ID | Sev | Finding | Status |
|---|---|---|---|
| R4-01 | High | Asset detail (`pages/asset-detail.tsx:99-102`) and Stock detail (`pages/stock-detail.tsx:89-91`) action buttons have **no onClick**: Change Status, Edit Asset, Assign to Job, Delete Asset, Adjust Quantity, Edit Details, Delete Stock Item all do nothing | OPEN |
| R4-02 | High | Nothing in the UI links to `/assets/:id`, `/stock/:id` or `/locations/:id` (only `/equipment/:id` is linked, from job detail). Those three detail pages are unreachable except by typing the URL; Location cards are not clickable | OPEN |
| R4-03 | Med | Row "⋯" buttons in Asset and Stock tables (`AssetTable.tsx:44`, `StockTable.tsx:43`) have no handler/menu | OPEN |
| R4-04 | Med | Equipment cannot be assigned to jobs anywhere in the UI ("Assign to Job" is dead; job Edit has no equipment control) | OPEN |
| R4-05 | Low | Asset detail "Actions" card is clipped at the right edge at ~800px; back arrows on asset/stock/location detail go to `/equipment` | OPEN |
| R4-06 | Low | `StockTable` reads `item.pendingRequests` which is never populated (cause of the empty "Pending Req." column, R2-21) | OPEN |

### Audit-trail completeness (Audit Doctrine)
| ID | Sev | Finding | Status |
|---|---|---|---|
| R4-10 | High | Review **Reject** writes no audit entry (verified: approve → "APPROVE ReviewItem" row; reject → nothing). `updateReviewItem` only logs `approved` (`mockData.ts:2029-2030`). Correction and Escalate (PM) likewise unlogged | OPEN |
| R4-11 | High | Only a handful of store mutations call `addLog`. Unlogged: `updateWorker`/`deleteWorker`, `updateClient`/`deleteClient`, `addWorker`, `addEquipment`/`updateEquipment`/`deleteEquipment`, `addJob`, `updateJob` (except Active/Completed), `deleteJob`, `deleteInvoice`, `updateAsset`, `deleteStockItem`, `deleteLocation`, `updateUser`/`deleteUser`, `updateSettings` (**bank/legal details**), job document share/revoke | OPEN |
| R4-12 | Med | Audit Log page shows only Timestamp/Actor/Action/Entity/Details: no previous/new value, source/destination or external ref columns (doctrine lists them), and no search, filter, pagination or export | OPEN |
| R4-13 | Med | Governance "Suspend"/"Restrict" execute on one click with no confirmation, no reason and no toast (audit row is written, but without a reason); Workflow Archive is also one click (toast only) | OPEN |

### Logic / data-flow
| ID | Sev | Finding | Status |
|---|---|---|---|
| R4-20 | High | Worker equipment usage never reaches the ledger: report form lists `assets` (ids `asset-1…`) but normalisation does `equipment.find(e => e.id === eu.assetId)` (ids `de1…`, `mockData.ts:2265`). Result: usageCost/revenue = £0 for every worker-submitted equipment line | OPEN |
| R4-21 | High | Roles & Permissions editor is cosmetic: `PermissionKey`s are never read by any route/page guard (`lib/permissions/permissions.ts` is not imported anywhere); access is decided by role-name string matching. Editing a role changes nothing | OPEN |
| R4-22 | Med | Review detail "Approval History 0 approved · 0 rejected · 0 corrected" never updates after approving/rejecting; "Financial Impact — Blocked pending approval" still shown with 0 pending | OPEN |
| R4-23 | Low | Command "Pending reviews 6" shows breakdown "3 reports · 2 uploads" (=5) after two actions; counts derive from different filters | OPEN |
| R4-24 | Med | Client detail "Create account" accepts non-email input ("not-an-email" provisioned as a portal user) | OPEN |
| R4-25 | Low | Client portal-account "Disable" is immediate (has Reactivate + toast) | OPEN |
| R4-26 | Low | Worker "Offline Queue" panel on the report page labels every queued item "Worker Report" even for issues | OPEN |
| R4-27 | Low | Report detail deep-link button still labelled "Command Centre" (page is now Intelligence Overview) | OPEN |

### Verified OK this run
Approve removes item and writes audit row; Compliance Audit gets a governance entry on Suspend; Build Report opens the generated report; Worker shift timer persists across reloads and prefills report hours; second shift on another job is blocked with "Shift Already Active"; worker material/asset pickers show no cost data; Roles Create is disabled until valid; Activity "Open Source" links resolve to a module page (generic, not record-level); expense inputs enforce min=0.

### Remaining unexplored (diminishing returns)
Reconciliation/Sync Retry actions and Financial Controls tab; Equipment detail edit; Notification mark-read/dismiss persistence; Automation Pause/Resume/Disable/Archive; Portal messages (new thread) and invoice download; PM Escalate/Correction flows end to end; full copy proofreading; keyboard-only operation (tool cannot synthesise Tab focus).

## Run 5 — remaining workflows (sync, controls, equipment, automations, notifications, portal, PM escalation, copy)

### Functional gaps / logic
| ID | Sev | Finding | Status |
|---|---|---|---|
| R5-01 | High | PM-escalated items never reach the CEO: after a PM clicks Escalate ("awaiting CEO review" tile), the CEO's Review Operations Centre has no escalated view and no mention of them (verified by signing in as CEO in the same session). Escalated items leave the pending queue for both roles and become orphaned | OPEN |
| R5-02 | High | Staff cannot see or answer client conversations: `portalCommunication` is consumed only by portal pages/projections; no internal page reads threads (Client Requests has no Conversations tab). Clients can start conversations that nobody internal can read | OPEN |
| R5-03 | High | Client-facing invoice lines for equipment use the **internal cost day rate** (`dayRateAtTime`, e.g. Hiab £420/day) not `clientDayRate` (£520); `mockData.ts:1859-1868`. The portal invoice therefore displays internal cost basis to clients (conflicts with Client Portal Projection Doctrine) and under-bills | OPEN |
| R5-04 | Low | Portal invoice EXB-2026-0007 lists an Approved Variation (£1,200) that is not in the total/outstanding | OPEN |
| R5-05 | Med | Header bell badge does not react to Mark Read / Dismiss performed in Intelligence > Activity (stays at 9): `NotificationBell` copies `getAllNotifications()` into local state once and never re-reads | OPEN |
| R5-06 | Med | PM sidebar "Reviews" badge counts all company pending items (8) while the PM Review page shows only PM-scoped pending (7) | OPEN |
| R5-07 | Med | Equipment edit accepts a negative day rate (`$-50.00/day` saved, no toast) and has no field for `clientDayRate` (the billable rate that drives revenue) | OPEN |
| R5-08 | Low | Sync tab: "Sync Audit Trail (7)" header counts 7 while 5 rows are listed; Retry/Sync give no toast; "Mapping Missing" help text points to "Settings → Integrations" (accounting now lives in Finance > Accounting > Providers); Retry on a failed payroll sync simply fails again (simulated) | OPEN |
| R5-09 | Low | Automation "Disable Rule" and "Archive" are one-click (Archive toasts, Disable gives no feedback); rule detail still shows schedule SCH-2026-001 "Active" for a disabled rule | OPEN |
| R5-10 | Low | PM Escalate and Correction have no confirmation; Escalate has no reason or toast (Correction does require a note) | OPEN |
| R5-11 | Low | Portal invoice "Download" only toasts "Preparing download" and never produces a file | OPEN |
| R5-12 | Low | Naming drift in portal: tab "Conversations", heading "Messages", button "New conversation", route `/portal/messages`; domain term is "Communication Centre" | OPEN |
| R5-13 | Low | Login ignores the originally requested URL: `auth.tsx` always `setLocation("/")` after sign-in | OPEN |

### Copy proofread (visible strings)
| ID | Sev | Finding | Status |
|---|---|---|---|
| R5-20 | Low | US spelling "Labor" on Schedule KPI ("EST. LABOR") and drawer ("Remaining Labor"), Invoice Builder line types — lexicon says "Labour" | OPEN |
| R5-21 | Low | Raw type slugs shown to users: PM dashboard "Overdue review — worker-report", "report — Kitchen…", "photo — …" | OPEN |
| R5-22 | Low | Collected earlier, restated for the fix list: "1 Reports"/"1 Photos"; "1 submission need changes"; 404 scaffold text; "Notification Settings Saved — Company details updated successfully"; "Command Centre" button label; "Financial Explorer"/"Settings → Integrations" stale references; "1 jobs" | OPEN |

### Verified OK this run
Financial Controls Approve opens a review dialog with business justification; Sync Retry/Sync update counters; portal invoice detail renders line items, variations and payments; portal conversations list and new-conversation entry present; PM Escalate moves items to Escalated tab and updates tiles; no "Center" US spelling remains in visible UI strings; Escape closes dialogs.

## Coverage statement
Routes visited at least once: all CEO sidebar destinations and every tab/sub-tab of Operations, Finance, Intelligence, Automations, Review; all detail routes (job, client, worker, equipment, asset, stock, location, review/:id, portal project/invoice); Worker app (all 8 pages); Portal (all 7 sections); PM role pages; error/guard pages (Access Denied, 404, /auth, unauthenticated redirect). Interaction classes exercised: create/edit/delete forms, dialogs/drawers, tabs, filters, approve/reject/escalate/correct, offline queue, shift timer, sync retry, governance/automation/workflow lifecycle, role provisioning. Viewports: 1920, ~955, 800, 768, 375. Remaining known limits: true keyboard Tab traversal and screen-reader output could not be driven with the available tooling; file download/PDF output is simulated by the app.

## Run 6 — automated accessibility, real keyboard, accessibility tree, downloads

Tooling: `@axe-core/playwright` added as a devDependency; separate config `tests/audit/playwright.audit.config.ts` and spec `tests/audit/a11y.audit.ts` (not part of the 955-test suite; run with `npx playwright test -c tests/audit/playwright.audit.config.ts`; uses the installed Chrome, `channel: 'chrome'`). Raw output in `tests/audit/out/` (axe-*.json, keyboard-*.json, aria-*.yml, downloads.json).
Scope: axe (WCAG 2.0/2.1/2.2 A+AA + best-practice) on **69 pages** — 39 CEO, 10 PM, 8 Worker, 12 Auth/Portal. **0 pages are clean.**

### axe results (11 rules, 69 pages)
| ID | Impact | Rule | Nodes / pages | Notes | Status |
|---|---|---|---|---|---|
| R6-01 | Critical | button-name | 117 / 49 | Icon-only buttons with no name: sidebar collapse toggle (every CEO page), Back arrows on every detail page (`button-back-jobs`…), worker row edit/delete (`button-edit-worker-*`, `button-delete-worker-*`), schedule week prev/next, Select comboboxes in Schedule and Stock filters | OPEN |
| R6-02 | Critical | select-name | 23 / 6 | Native `<select>` filters with no label: Reconciliation (`rc-filter-*`), Exceptions (`exc-filter-*`), Automations sort/filters, Client detail status/doc selects | OPEN |
| R6-03 | Critical | label | 12 / 4 | Unlabelled inputs: Jobs date-range (2), Client doc expiry date, Settings text/email inputs, worker report **Hours** input | OPEN |
| R6-04 | Serious | color-contrast | 712 / **69 (every page)** | See breakdown below | OPEN |
| R6-05 | Serious | document-title | 69 / 69 | No `<title>` (same as R2-02, now machine-confirmed) | OPEN |
| R6-06 | Serious | aria-progressbar-name | 1 / 1 | Portal project progress bar has no accessible name | OPEN |
| R6-07 | Moderate | meta-viewport | 69 / 69 | `maximum-scale=1` (same as R2-03) | OPEN |
| R6-08 | Moderate | region | 17 / 10 | Content outside landmarks: Worker "Online" banner on all 8 worker pages; Portal login (6) and Auth (3) | OPEN |
| R6-09 | Moderate | heading-order | 10 / 10 | Review, Review detail, Schedule, Financial Insights, Settings, PM Schedule, PM Workers, Worker Jobs, Worker Report, Portal project | OPEN |
| R6-10 | Moderate | page-has-heading-one | 4 / 4 | `/operations?tab=map`, PM `/map` (known, by design), **`/auth` and `/portal` login screens** | OPEN |
| R6-11 | Moderate | landmark-one-main | 2 / 2 | `/auth` and `/portal` login have no `<main>` | OPEN |

Colour-contrast breakdown (the 4 token-level causes cover nearly all 712 nodes):
- **3.75:1** `#64748b` on sidebar `#0f1729`, 10px uppercase section labels (CORE / OPERATIONAL / INTELLIGENCE …) — on every executive page (137 sampled nodes). Needs ≥4.5:1.
- **4.34:1** `text-muted-foreground` (`#64748b`) on `bg-muted` (`#f1f5f9`) — headings/labels/inactive tabs across Worker, PM and Portal. One shade short; fix the token once and ~80% of sampled nodes clear.
- **3.21:1** white on `#00a63e` (green status/primary elements, Worker) and **2.47:1** white on `#00bc7d` (emerald-500 "Go to Job & Start Shift" button — the worker's primary action).
- Minor: `#2b7fff` on `#f4f8fe` (11px), `#ef4444` on white (12px).

### Keyboard (real Tab key, Chrome)
| ID | Sev | Finding | Status |
|---|---|---|---|
| R6-20 | High | **Job cards (4/4) and Schedule shift cards (8/8) are not keyboard-focusable** — a keyboard user cannot open a job from Operations > Jobs or a shift from Schedule. (Screen-reader view: they are plain text, see R6-30) | OPEN |
| R6-21 | Med | Unnamed tab stops: 18 on Operations>Jobs and Operations>Workers, 7 on Schedule, 3 on Command/Review/Client Requests, 2 on Finance/Automations — focus lands on controls announced as just "button" | OPEN |
| R6-22 | Med | Focus is **lost to `<body>`** after closing Create Job and Build Report dialogs with Escape (Add Worker correctly returns to its trigger) — inconsistent focus return | OPEN |
| R6-23 | Med | Worker Online/Offline banner is a non-focusable `div` (tabIndex −1, no role): keyboard/switch users cannot toggle offline mode (R3-44 confirmed) | OPEN |
| R6-24 | Low | Sidebar requires ~13 Tab presses to pass the nav on every page; the Skip-to-content link is first stop and works — adequate, but no skip for the 4 landmarks inside Operations hub tabs | OPEN |
| R6-25 | Low | Worker home: after the last nav button, tab order reaches the dev-only QA panel button, then wraps via `<body>` (dev server only) | OPEN |

### Screen-reader view (Playwright accessibility tree)
| ID | Sev | Finding | Status |
|---|---|---|---|
| R6-30 | High | Operations > Jobs: the job cards expose **no link, button or heading** — each is a run of text. A screen-reader user cannot find, name or open any job. Same pattern on Schedule and Client cards | OPEN |
| R6-31 | High | Worker Home "1 submission need changes — Tap to review reviewer notes" card is exposed as two paragraphs, not a button: reviewer corrections cannot be opened with assistive tech | OPEN |
| R6-32 | Med | Worker "Online/Offline Mode" status is bare text outside any landmark with no `role=status`/live region: connectivity changes are never announced | OPEN |
| R6-33 | Med | Worker quick-action "Profile" has accessible name "D Profile" (avatar initial leaks into the name) | OPEN |
| R6-34 | Med | Dates in Jobs / Schedule inputs have no name ("textbox: 2026-09-10") and no group label for the range | OPEN |
| R6-35 | Low | Two `navigation` landmarks on executive pages (sidebar nav is unlabelled; mobile tab bar is "Primary") — unlabelled nav cannot be distinguished | OPEN |
| R6-36 | Info | Good: Review queue is a proper table with column headers; tabs expose `tab`/`tabpanel`/selected state; skip link and `<main>` present on all app pages; focus ring visible on every one of 480 sampled stops; dialogs trap focus (0 of 120 Tabs escaped) and close on Escape | — |

### Downloads
| ID | Sev | Finding | Status |
|---|---|---|---|
| R6-40 | Med | Intelligence > Exports "Download" produces no file **and no feedback at all** (no toast, no download event): it only flips the export status to Downloaded (`reporting-centre.tsx:842` → `downloadExport`) | OPEN |
| R6-41 | Low | Portal invoice "Download" is toast-only (R5-11); no download event | OPEN |
| R6-42 | Info | The only real file download in the app is the Payroll Export CSV (`payroll-export.tsx:123`, Blob + object URL) — not exercised here | — |

### Quick-win map (one change → many findings)
1. Add `aria-label` to the shared icon `Button` usages (sidebar toggle, Back arrow, week prev/next, row edit/delete) → clears most of R6-01 and R6-21.
2. Add a `<title>` (and route-level `document.title`) + remove `maximum-scale=1` → clears R6-05, R6-07 on all 69 pages.
3. Darken `--muted-foreground` slightly and lighten sidebar label colour → clears most of R6-04 (712 nodes) at token level.
4. Make job / client / schedule cards real `<a>`/`<button>` (or `role=link` + `tabIndex=0` + key handler) → clears R6-20, R6-30, R2-14, R3-41.
5. Wrap native selects/inputs in `<label>`/`aria-label` (about 40 controls) → clears R6-02, R6-03.

## Fix log — branch `fix/frontend-a11y-quick-wins` (not committed)

Fixes applied for the five quick wins from Run 6. Re-measured with the same axe run (69 pages): **1036 → ≈235 violating nodes**, 7 of 11 rules now at zero. Baseline JSON kept in `tests/audit/out-before/`.

| # | Quick win | Result | Findings addressed |
|---|---|---|---|
| 1 | Accessible names on icon-only buttons | `aria-label` added to sidebar collapse (with `aria-expanded`), mobile menu, all Back arrows (job/client/worker/equipment/invoice/asset/stock/location/review), schedule week prev/next + drawer close, worker Edit/Delete, activity delete, workflow pause/resume/archive, analytics risk link, worker doc view, map clear, table "⋯"/delete, worker report "add" buttons. Unnamed tab stops on Operations>Jobs 18→1, Workers 18→0, all others 0 | R6-01 (117→44 nodes, remainder in a few untouched pages), R6-21, R2-04, R3-40 |
| 2 | Page title, zoom | `client/index.html`: `<title>`, removed `maximum-scale=1`, removed replit OG image / `@replit` tags. New `hooks/use-document-title.ts` mirrors each page's `<h1>` into `document.title` ("Jobs · The Ledger") | R6-05 (69→0), R6-07 (69→0), R2-02, R2-03 |
| 3 | Contrast | `--muted-foreground` 46.9%→41% lightness (4.34→≈5:1); sidebar section labels use `text-sidebar-foreground/60`; solid-green/emerald/red buttons moved one step darker (review, worker, batch bar, offline banner, automations pill); palette overrides in `index.css` `@theme` for red-500, rose-500, green-500/600, emerald-600, amber-600 | R6-04 (712→166 before the palette override; re-measure pending), R2-01 (see below) |
| 4 | Real keyboard/AT behaviour for cards | New `lib/a11y.ts` `activatable()` (role, tabIndex, Enter/Space, aria-label). Applied to job cards (Jobs ×2, Schedule ×2, PM dashboard rows, schedule grid `JobScheduleCard`), client cards, worker rows, worker home attention cards, worker job cards, portal project cards, invoice rows, location cards (now navigate to `/locations/:id`), attention items. Job cards focusable 0/4→4/4, shift cards 0/8→8/8 | R6-20, R6-30, R6-31, R2-14, R3-41 |
| 5 | Labels | `aria-label` on 57 native `<select>`s (script-assisted from test ids, then hand-tidied), Radix `SelectTrigger`s (schedule filters, equipment, jobs form, notifications, event monitor, batch bar), date inputs (Jobs filter + create), Settings inputs (10), worker Hours, doc expiry, switches, portal progressbar | R6-02 (23→0), R6-03 (12→0), R6-06 (→0), R3-42, R6-34 |
| + | Related fixes picked up on the way | Notification bell now uses light-header colours on desktop (`tone="light"`) — icon was invisible (R2-01); Worker Online/Offline banner is a real keyboard-operable toggle inside a labelled live region (R3-44, R6-23, R6-32, R6-08 worker) | R2-01, R3-44, R6-23 |

Not done in this pass: R6-08 on `/auth` and `/portal` login (no `<main>`/`<h1>`), R6-09 heading-order (10 pages), R6-22 focus return after Create Job/Build Report close, R6-40 export download feedback, the remaining ~44 `button-name` nodes (8 pages) and residual contrast (≈166 nodes, 29 pages — palette override added after that measurement).

## Fix log 2 — remaining fixes (same branch, not committed)

Verification gates used: `npm run check` (tsc) clean after every batch; layout measured with `tests/audit/overflow.audit.ts`; axe/keyboard via `tests/audit/a11y.audit.ts`; full doctrine suite via `tests/audit/regression.config.ts`.

### Layout / responsive
- R2-65 / R3-30 / R3-31 — **fixed.** `layout.tsx`: sidebar/header/tab-bar switch from `md` to `lg` (tablet now gets the mobile shell), `main` gets `min-w-0`, content padding scales; `index.css` adds `main .grid > * { min-width: 0 }`; shadcn `TabsList` scrolls instead of stretching the page (`max-w-full overflow-x-auto`); several flex rows made `flex-wrap` (job/client headers, job finance panels, Activity rows, provider cards, PM review actions, report/export filters). Overflowing routes: **768px 6→0, 955px 2→0, 375px 11→0** (measured on 38 routes; see `tests/audit/out/overflow-*.json`).

### Behaviour bugs
- R2-18 / R2-19 / R2-20 / R2-21 / R4-06 — **fixed.** Asset table + service alerts read the real date fields via new `lib/format.ts` (`formatDate` never prints "Invalid Date"); status badges cover In Service / Needs Service / Under Repair / Broken; Assigned Job resolved from `assignedToJobId`; Stock & Assets overview tiles derived from the store; "Pending Req." shows "—" instead of blank; retired assets no longer raise service alerts.
- R2-05 — **fixed.** Every `toLocaleDateString()/toLocaleTimeString()/new Date().toLocaleString()` now passes `en-GB` (≈55 call sites).
- R2-06 / R2-41 — **fixed.** `$` → `£` on client detail and equipment detail (missing day rate now shows "Not set" instead of a silent 150); `DollarSign` icons → `PoundSterling` (Finance nav, payroll, analytics, job financial summary).
- R2-31 — **fixed.** `/invoices/:id` now renders the Invoice Detail page (the redirect shadowed it, so "View" bounced back). R1-05 — **fixed:** shadowed duplicate legacy routes and their dead lazy imports removed from `App.tsx`.
- R2-35 / R2-38 / R4-22 — **fixed.** Review detail prints formatted date-times; "1 Report/1 Photo" singular; Approval History tile now reads the live store (was a static seed that never changed); "Blocked pending approval" only shown when something is pending.
- R5-05 — **fixed.** `notificationEngine` gains `subscribeNotifications`; the header bell re-reads on mark-read/dismiss from Activity and hides dismissed items.
- R5-06 — **fixed.** PM sidebar "Reviews" badge now counts only PM-managed jobs.
- R2-72 — **fixed.** 404 copy. R5-08 — **fixed:** stale "Settings → Integrations" / "Financial Explorer" pointers now name Finance → Accounting. R5-20 / R5-21 / R3-14 — **fixed:** "Labour" spelling on Schedule, Invoice Builder line types capitalised, review type slugs humanised on the PM dashboard. R1-07 — **fixed:** debug `console.log` removed.
- R4-20 — **fixed (2 bugs).** Worker report now lists the billable `equipment` catalogue (ids match the approval pricing lookup) **and captures Hours per item** (previously no hours were ever sent, so equipment cost/revenue was £0 regardless). R5-03 — **fixed in code:** synced draft invoices bill `clientDayRate`, never the internal cost rate. (Seed invoice data still carries cost-rate lines — data, not changed.)
- R2/R3 empty report — **fixed.** `worker/report.tsx` refuses a submission with no summary, expenses, materials, equipment or uploads.
- R5-01 — **fixed.** PM-escalated items stay in the CEO's Review queue (counted, with an "N Escalated" badge) and appear in the review detail list so they can be actioned.
- R5-02 — **fixed.** New staff inbox on Client Requests (`components/StaffConversations.tsx`; engine `getAllThreads/addStaffReply/closeThread`): CEO sees all client conversations, PM only their jobs, can read, reply and close.
- R4-01 / R4-02 / R4-03 / R2-22 — **fixed.** Asset and Stock detail actions now work (change status, edit, assign to job, delete; adjust quantity, edit, delete) and stock/asset rows open their detail page; dead "⋯" buttons removed; location cards open Location detail.
- R6-08 (login) / R6-10 / R6-11 — **fixed.** `/auth` and portal login now have `<main>` and an `<h1>`.
- R6-40 — **fixed.** Export "Download" now confirms (and says PDF generation is simulated).

### Safety / audit / validation
- R4-10 / R4-11 — **fixed.** Audit entries now written for Reject, Correction (with notes) and Escalate, and for worker, client, equipment, job, invoice, asset, stock, location, user and **company settings (bank/legal)** changes (field names only, never values); new action kinds REJECT / CORRECT / ESCALATE.
- R2-36 / R3-11 / R3-12 / R4-13 / R3-10 / R2-11 — **fixed with a single `ConfirmDialog`** (`components/confirm-dialog.tsx`): worker delete, governance Restrict/Suspend, document share to client, invoice Sent/Paid. Review **Reject now requires a reason** (dialog; batch reject passes its reason through). Tests updated: `automation-governance` AG-13/14, `client-portal-documents` CPD-10/11/12, `invoice-pipeline`.
- R3-20 / R3-22 / R2-15 / R4-24 / R5-07 — **fixed.** New `lib/validate.ts`. Settings (legal name, email, sort code, account number), worker edit email, portal-account email, equipment day rate ≥ 0, stock quantity/cost/reorder ≥ 0; worker save now toasts.
- R3-01 — **fixed.** A worker can open a job/report only if assigned (CEO/PM can still preview).
- R2-49 — **fixed.** Role editor blocks removing your own Assign roles / Manage settings.
- R4-21 (role permissions unenforced), R2-70 (PM sees Financial Insights) — **not changed, owner decision:** `platform-ia` IA-19 explicitly asserts the PM nav exposes Financial Insights, and wiring permission keys into route guards would change the access model.
- R2-71 — **fixed.** `/qa` and `/qa/validation` are CEO-only.

### Not done (and why)
R2-02 follow-ups beyond title/viewport (OG image text) · R6-09 heading-order (10 pages) · R6-22 focus return after Create Job/Build Report close · R5-03 seed-data rate · R5-09 automation Disable/Archive confirmations (Archive already toasts; tests assert one-click) · R5-11/R2-33 portal download file and the separate invoice stores · R2-10 job Edit covering title/dates/address · R2-17 map clustering/legend colours · R2-12 empty-state health scores · R5-13 login return-URL · R4-27 "Command Centre" label (reporting tests reference it) · R3-21 not reproducible in source.

## Final verification

- Typecheck (`npm run check`): passes.
- Regression suite: 979 tests; 978 pass on rerun. One failure (`audit-log.spec.ts`) asserted the old behaviour of submitting an empty report; the test now enters report notes. AR-12 timed out once under load and passed on rerun.
- Overflow scan: 0 overflowing pages at 375, 768 and 955px.
- axe scan: 1036 violating nodes before fixes, 96 after (colour contrast 79, heading-order 10, button-name 5, page-has-heading-one 2).
