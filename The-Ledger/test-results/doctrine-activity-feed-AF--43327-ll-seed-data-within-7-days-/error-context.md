# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: doctrine\activity-feed.spec.ts >> AF-08: KPI last7days count equals total (all seed data within 7 days)
- Location: tests\doctrine\activity-feed.spec.ts:82:1

# Error details

```
Error: expect(received).toBeGreaterThan(expected)

Expected: > 0
Received:   0
```

# Page snapshot

```yaml
- generic [ref=e2]:
  - generic [ref=e3]:
    - complementary [ref=e4]:
      - generic [ref=e5]:
        - generic [ref=e6]:
          - generic [ref=e7]:
            - generic [ref=e8]: L
            - heading "The Ledger" [level=1] [ref=e9]
          - button [ref=e10]:
            - img
        - navigation [ref=e11]:
          - paragraph [ref=e12]: Core
          - generic [ref=e13]:
            - link "Command" [ref=e14] [cursor=pointer]:
              - /url: /
              - generic [ref=e15]:
                - img [ref=e16]
                - generic [ref=e21]: Command
            - link "Review 3" [ref=e22] [cursor=pointer]:
              - /url: /review
              - generic [ref=e23]:
                - img [ref=e24]
                - generic [ref=e28]: Review
                - generic [ref=e29]: "3"
          - paragraph [ref=e30]: Operational
          - generic [ref=e31]:
            - link "Jobs" [ref=e32] [cursor=pointer]:
              - /url: /jobs
              - generic [ref=e33]:
                - img [ref=e34]
                - generic [ref=e37]: Jobs
            - link "Schedule" [ref=e38] [cursor=pointer]:
              - /url: /schedule
              - generic [ref=e39]:
                - img [ref=e40]
                - generic [ref=e42]: Schedule
            - link "Workers" [ref=e43] [cursor=pointer]:
              - /url: /workers
              - generic [ref=e44]:
                - img [ref=e45]
                - generic [ref=e50]: Workers
            - link "Clients" [ref=e51] [cursor=pointer]:
              - /url: /clients
              - generic [ref=e52]:
                - img [ref=e53]
                - generic [ref=e57]: Clients
            - link "Map" [ref=e58] [cursor=pointer]:
              - /url: /map
              - generic [ref=e59]:
                - img [ref=e60]
                - generic [ref=e62]: Map
            - link "Stock & Assets" [ref=e63] [cursor=pointer]:
              - /url: /equipment
              - generic [ref=e64]:
                - img [ref=e65]
                - generic [ref=e69]: Stock & Assets
            - link "Job Intelligence" [ref=e70] [cursor=pointer]:
              - /url: /job-intelligence
              - generic [ref=e71]:
                - img [ref=e72]
                - generic [ref=e75]: Job Intelligence
            - link "Expenses" [ref=e76] [cursor=pointer]:
              - /url: /expenses
              - generic [ref=e77]:
                - img [ref=e78]
                - generic [ref=e80]: Expenses
            - link "Finance" [ref=e81] [cursor=pointer]:
              - /url: /finance
              - generic [ref=e82]:
                - img [ref=e83]
                - generic [ref=e85]: Finance
          - paragraph [ref=e86]: Intelligence
          - generic [ref=e87]:
            - link "Command Centre" [ref=e88] [cursor=pointer]:
              - /url: /executive-command-centre
              - generic [ref=e89]:
                - img [ref=e90]
                - generic [ref=e92]: Command Centre
            - link "Analytics Centre" [ref=e93] [cursor=pointer]:
              - /url: /analytics-centre
              - generic [ref=e94]:
                - img [ref=e95]
                - generic [ref=e97]: Analytics Centre
            - link "Reporting Centre" [ref=e98] [cursor=pointer]:
              - /url: /reporting-centre
              - generic [ref=e99]:
                - img [ref=e100]
                - generic [ref=e102]: Reporting Centre
            - link "Activity" [ref=e103] [cursor=pointer]:
              - /url: /activity-feed
              - generic [ref=e104]:
                - img [ref=e105]
                - generic [ref=e107]: Activity
            - link "Notifications" [ref=e108] [cursor=pointer]:
              - /url: /notifications
              - generic [ref=e109]:
                - img [ref=e110]
                - generic [ref=e113]: Notifications
          - paragraph [ref=e114]: Automation
          - generic [ref=e115]:
            - link "Automations" [ref=e116] [cursor=pointer]:
              - /url: /automations
              - generic [ref=e117]:
                - img [ref=e118]
                - generic [ref=e120]: Automations
            - link "Workflows" [ref=e121] [cursor=pointer]:
              - /url: /workflows
              - generic [ref=e122]:
                - img [ref=e123]
                - generic [ref=e127]: Workflows
            - link "Automation Controls" [ref=e128] [cursor=pointer]:
              - /url: /automation-governance
              - generic [ref=e129]:
                - img [ref=e130]
                - generic [ref=e133]: Automation Controls
          - paragraph [ref=e134]: Administration
          - button "Administration" [ref=e136]:
            - img [ref=e137]
            - generic [ref=e140]: Administration
            - img [ref=e141]
        - generic [ref=e143]:
          - generic [ref=e144]:
            - generic [ref=e145]: D
            - generic [ref=e146]:
              - paragraph [ref=e147]: Demo CEO
              - paragraph [ref=e148]: CEO
          - button "Sign Out" [ref=e149]:
            - img
            - text: Sign Out
    - generic [ref=e150]:
      - button "System alerts" [ref=e151]:
        - img
        - generic [ref=e152]: "4"
      - button "Notifications" [ref=e153]:
        - img
        - generic [ref=e154]: "9"
    - main [ref=e155]:
      - generic [ref=e156]:
        - img [ref=e157]
        - generic [ref=e159]:
          - paragraph [ref=e160]: Example Business — Demo Data
          - paragraph [ref=e161]: You are viewing a demonstration environment. Changes made here will not affect real business data.
      - generic [ref=e163]:
        - generic [ref=e164]:
          - generic [ref=e165]:
            - heading "Activity Feed" [level=2] [ref=e166]
            - paragraph [ref=e167]: Unified operational event stream — informational only.
          - generic [ref=e168]: CEO Access
        - generic [ref=e169]:
          - img [ref=e170]
          - paragraph [ref=e172]: "Activity Feed Doctrine: This feed is informational only. It never creates revenue, cost, payroll, inventory deductions, or financial mutations. All approvals remain human-controlled via the Review Centre and approval workflows."
        - generic [ref=e173]:
          - generic [ref=e174]:
            - generic [ref=e176]:
              - generic [ref=e177]: Total Events
              - img [ref=e178]
            - generic [ref=e181]: "25"
          - generic [ref=e182]:
            - generic [ref=e184]:
              - generic [ref=e185]: Critical Events
              - img [ref=e186]
            - generic [ref=e189]: "5"
          - generic [ref=e190]:
            - generic [ref=e192]:
              - generic [ref=e193]: Action Required
              - img [ref=e194]
            - generic [ref=e197]: "11"
          - generic [ref=e198]:
            - generic [ref=e200]:
              - generic [ref=e201]: Today
              - img [ref=e202]
            - generic [ref=e206]: "0"
          - generic [ref=e207]:
            - generic [ref=e209]:
              - generic [ref=e210]: Last 7 Days
              - img [ref=e211]
            - generic [ref=e214]: "0"
        - generic [ref=e215]:
          - generic [ref=e216]:
            - img [ref=e217]
            - textbox "Search events, job IDs, source IDs…" [ref=e220]
          - combobox [ref=e221]:
            - generic: All Types
            - img [ref=e222]
          - combobox [ref=e224]:
            - generic: All Priorities
            - img [ref=e225]
        - generic [ref=e229]:
          - generic [ref=e230]:
            - img [ref=e233]
            - generic [ref=e236]:
              - paragraph [ref=e238]: Timesheet Approved
              - paragraph [ref=e239]: Timesheet for James Mitchell (Job JOB-2026-001, Westfield Office Cleaning) approved. 8.5 hours normalised and queued for payroll.
              - generic [ref=e240]:
                - generic [ref=e241]: Review
                - generic [ref=e242]: Info
                - generic [ref=e243]: JOB-2026-001
                - generic [ref=e244]: 02 Jun 2026, 10:00
            - button "View" [ref=e246]
          - generic [ref=e247]:
            - img [ref=e250]
            - generic [ref=e253]:
              - paragraph [ref=e255]: Expense Rejected
              - paragraph [ref=e256]: "Expense report from Sarah Chen (Job JOB-2026-003, City Tower Security) rejected. Reason: insufficient receipt documentation."
              - generic [ref=e257]:
                - generic [ref=e258]: Review
                - generic [ref=e259]: Warning
                - generic [ref=e260]: JOB-2026-003
                - generic [ref=e261]: 02 Jun 2026, 09:00
            - button "View" [ref=e263]
          - generic [ref=e264]:
            - img [ref=e267]
            - generic [ref=e269]:
              - generic [ref=e270]:
                - paragraph [ref=e271]: Financial Override Pending Approval
                - generic [ref=e272]:
                  - img [ref=e273]
                  - text: Action Required
              - paragraph [ref=e275]: Financial control override FC-2026-001 submitted. Invoice adjustment of £3,500.00 on JOB-2026-006. CEO approval required.
              - generic [ref=e276]:
                - generic [ref=e277]: Financial Control
                - generic [ref=e278]: Critical
                - generic [ref=e279]: JOB-2026-006
                - generic [ref=e280]: 02 Jun 2026, 09:00
            - button "View" [ref=e282]
          - generic [ref=e283]:
            - img [ref=e286]
            - generic [ref=e289]:
              - generic [ref=e290]:
                - paragraph [ref=e291]: QA Report Awaiting Review
                - generic [ref=e292]:
                  - img [ref=e293]
                  - text: Action Required
              - paragraph [ref=e295]: QA inspection report submitted for Job JOB-2026-004 (Harbour View Maintenance). 2 non-compliant items flagged. Review required.
              - generic [ref=e296]:
                - generic [ref=e297]: Review
                - generic [ref=e298]: Warning
                - generic [ref=e299]: JOB-2026-004
                - generic [ref=e300]: 02 Jun 2026, 08:00
            - button "View" [ref=e302]
          - generic [ref=e303]:
            - img [ref=e306]
            - generic [ref=e308]:
              - generic [ref=e309]:
                - paragraph [ref=e310]: Financial Exception Detected
                - generic [ref=e311]:
                  - img [ref=e312]
                  - text: Action Required
              - paragraph [ref=e314]: Revenue discrepancy of £1,240.00 detected on Job JOB-2026-005. Exception EXC-2026-001 raised. CEO approval required for resolution.
              - generic [ref=e315]:
                - generic [ref=e316]: Exception
                - generic [ref=e317]: Critical
                - generic [ref=e318]: JOB-2026-005
                - generic [ref=e319]: 02 Jun 2026, 08:00
            - button "View" [ref=e321]
          - generic [ref=e322]:
            - img [ref=e325]
            - generic [ref=e330]:
              - paragraph [ref=e332]: Worker Shift Started
              - paragraph [ref=e333]: Worker Tom Bradley started shift on Job JOB-2026-003 (City Tower Security) at 07:30. Shift timer active.
              - generic [ref=e334]:
                - generic [ref=e335]: Worker
                - generic [ref=e336]: Info
                - generic [ref=e337]: JOB-2026-003
                - generic [ref=e338]: 02 Jun 2026, 08:00
            - button "View" [ref=e340]
          - generic [ref=e341]:
            - img [ref=e344]
            - generic [ref=e346]:
              - paragraph [ref=e348]: Automation Rule Executed
              - paragraph [ref=e349]: Automation rule "Daily Review Escalation" (AUTO-2026-001) executed successfully. 3 overdue review items escalated. No financial mutations occurred.
              - generic [ref=e350]:
                - generic [ref=e351]: Automation
                - generic [ref=e352]: Info
                - generic [ref=e353]: 02 Jun 2026, 07:00
            - button "View" [ref=e355]
          - generic [ref=e356]:
            - img [ref=e359]
            - generic [ref=e364]:
              - generic [ref=e365]:
                - paragraph [ref=e366]: QuickBooks Sync Failed
                - generic [ref=e367]:
                  - img [ref=e368]
                  - text: Action Required
              - paragraph [ref=e370]: "Accounting sync to QuickBooks failed for Invoice INV-2026-018. Error: API rate limit exceeded. Retry scheduled. No financial data was corrupted."
              - generic [ref=e371]:
                - generic [ref=e372]: Sync
                - generic [ref=e373]: Critical
                - generic [ref=e374]: JOB-2026-007
                - generic [ref=e375]: 02 Jun 2026, 07:00
            - button "View" [ref=e377]
          - generic [ref=e378]:
            - img [ref=e381]
            - generic [ref=e383]:
              - generic [ref=e384]:
                - paragraph [ref=e385]: Automation Execution Blocked
                - generic [ref=e386]:
                  - img [ref=e387]
                  - text: Action Required
              - paragraph [ref=e389]: Automation rule "Weekly Payroll Preparation" (AUTO-2026-002) blocked — action requires human approval. No financial mutation occurred.
              - generic [ref=e390]:
                - generic [ref=e391]: Automation
                - generic [ref=e392]: Critical
                - generic [ref=e393]: 02 Jun 2026, 06:00
            - button "View" [ref=e395]
          - generic [ref=e396]:
            - img [ref=e399]
            - generic [ref=e402]:
              - paragraph [ref=e404]: Job Status Changed to Active
              - paragraph [ref=e405]: Job JOB-2026-009 (Riverside Complex Maintenance) status changed from Planned to Active. Workers assigned and schedule confirmed.
              - generic [ref=e406]:
                - generic [ref=e407]: Job
                - generic [ref=e408]: Info
                - generic [ref=e409]: JOB-2026-009
                - generic [ref=e410]: 02 Jun 2026, 06:00
            - button "View" [ref=e412]
          - generic [ref=e413]:
            - img [ref=e416]
            - generic [ref=e419]:
              - paragraph [ref=e421]: Asset Deployed to Job
              - paragraph [ref=e422]: Asset AST-2026-008 (High-Reach Cleaning Platform) deployed to Job JOB-2026-009 (Riverside Complex Maintenance).
              - generic [ref=e423]:
                - generic [ref=e424]: Asset
                - generic [ref=e425]: Info
                - generic [ref=e426]: JOB-2026-009
                - generic [ref=e427]: 02 Jun 2026, 06:00
            - button "View" [ref=e429]
          - generic [ref=e430]:
            - img [ref=e433]
            - generic [ref=e436]:
              - generic [ref=e437]:
                - paragraph [ref=e438]: Automation Flagged for Governance Review
                - generic [ref=e439]:
                  - img [ref=e440]
                  - text: Action Required
              - paragraph [ref=e442]: Automation rule "Failed Sync Recovery Sweep" (AUTO-2026-004) flagged as Requires Review. High risk classification applied by governance engine.
              - generic [ref=e443]:
                - generic [ref=e444]: Governance
                - generic [ref=e445]: Warning
                - generic [ref=e446]: 02 Jun 2026, 05:00
            - button "View" [ref=e448]
          - generic [ref=e449]:
            - img [ref=e452]
            - generic [ref=e455]:
              - paragraph [ref=e457]: "Notification Centre: Critical Alert Issued"
              - paragraph [ref=e458]: Critical notification NOTIF-003 (Automation Execution Blocked) issued to CEO. Acknowledged and action pending.
              - generic [ref=e459]:
                - generic [ref=e460]: Notification
                - generic [ref=e461]: Info
                - generic [ref=e462]: 02 Jun 2026, 05:00
            - button "View" [ref=e464]
          - generic [ref=e465]:
            - img [ref=e468]
            - generic [ref=e470]:
              - paragraph [ref=e472]: Scheduled Job Executed
              - paragraph [ref=e473]: "Scheduled automation \"Daily Review Escalation\" (SCH-2026-001) ran at 06:00. Execution successful. Next run: tomorrow 06:00."
              - generic [ref=e474]:
                - generic [ref=e475]: Scheduler
                - generic [ref=e476]: Info
                - generic [ref=e477]: 02 Jun 2026, 03:00
            - button "View" [ref=e479]
          - generic [ref=e480]:
            - img [ref=e483]
            - generic [ref=e486]:
              - paragraph [ref=e488]: Automation Suspended by CEO
              - paragraph [ref=e489]: Automation rule "Draft Invoice Weekly Audit" (AUTO-2026-005) suspended by CEO action. All scheduled executions halted. Immutable audit record generated.
              - generic [ref=e490]:
                - generic [ref=e491]: Governance
                - generic [ref=e492]: Critical
                - generic [ref=e493]: 01 Jun 2026, 11:00
            - button "View" [ref=e495]
          - generic [ref=e496]:
            - img [ref=e499]
            - generic [ref=e501]:
              - paragraph [ref=e503]: Schedule Paused
              - paragraph [ref=e504]: Schedule "Monthly Stock Audit" (SCH-2026-004) paused by CEO. No further executions until resumed. Pause audit record created.
              - generic [ref=e505]:
                - generic [ref=e506]: Scheduler
                - generic [ref=e507]: Warning
                - generic [ref=e508]: 01 Jun 2026, 11:00
            - button "View" [ref=e510]
          - generic [ref=e511]:
            - img [ref=e514]
            - generic [ref=e519]:
              - paragraph [ref=e521]: Xero Sync Completed
              - paragraph [ref=e522]: Xero synchronisation completed successfully for payroll batch PAYROLL-2026-004. 12 records synced. Ledger remains source of operational truth.
              - generic [ref=e523]:
                - generic [ref=e524]: Sync
                - generic [ref=e525]: Info
                - generic [ref=e526]: 01 Jun 2026, 11:00
            - button "View" [ref=e528]
          - generic [ref=e529]:
            - img [ref=e532]
            - generic [ref=e536]:
              - generic [ref=e537]:
                - paragraph [ref=e538]: Reconciliation Discrepancy Detected
                - generic [ref=e539]:
                  - img [ref=e540]
                  - text: Action Required
              - paragraph [ref=e542]: Invoice INV-2026-015 exists in Ledger but is missing in Xero. Reconciliation engine flagged as Missing in Accounting. No data modified.
              - generic [ref=e543]:
                - generic [ref=e544]: Reconciliation
                - generic [ref=e545]: Warning
                - generic [ref=e546]: JOB-2026-008
                - generic [ref=e547]: 01 Jun 2026, 11:00
            - button "View" [ref=e549]
          - generic [ref=e550]:
            - img [ref=e553]
            - generic [ref=e555]:
              - paragraph [ref=e557]: Exception Resolved
              - paragraph [ref=e558]: Exception EXC-2026-002 (labour cost override on JOB-2026-002) resolved with CEO approval. Immutable audit record created.
              - generic [ref=e559]:
                - generic [ref=e560]: Exception
                - generic [ref=e561]: Info
                - generic [ref=e562]: JOB-2026-002
                - generic [ref=e563]: 01 Jun 2026, 11:00
            - button "View" [ref=e565]
          - generic [ref=e566]:
            - img [ref=e569]
            - generic [ref=e572]:
              - generic [ref=e573]:
                - paragraph [ref=e574]: Job Completion Flagged
                - generic [ref=e575]:
                  - img [ref=e576]
                  - text: Action Required
              - paragraph [ref=e578]: Job JOB-2026-001 (Westfield Office Cleaning) flagged as complete pending final review and invoice generation.
              - generic [ref=e579]:
                - generic [ref=e580]: Job
                - generic [ref=e581]: Warning
                - generic [ref=e582]: JOB-2026-001
                - generic [ref=e583]: 01 Jun 2026, 11:00
            - button "View" [ref=e585]
          - generic [ref=e586]:
            - img [ref=e589]
            - generic [ref=e593]:
              - generic [ref=e594]:
                - paragraph [ref=e595]: Low Stock Alert
                - generic [ref=e596]:
                  - img [ref=e597]
                  - text: Action Required
              - paragraph [ref=e599]: "Stock item SKU-2026-041 (Cleaning Grade Disinfectant 5L) below reorder threshold. Current: 3 units. Reorder point: 10 units."
              - generic [ref=e600]:
                - generic [ref=e601]: Stock
                - generic [ref=e602]: Warning
                - generic [ref=e603]: 01 Jun 2026, 11:00
            - button "View" [ref=e605]
          - generic [ref=e606]:
            - img [ref=e609]
            - generic [ref=e613]:
              - paragraph [ref=e615]: Reconciliation Match Confirmed
              - paragraph [ref=e616]: Invoice INV-2026-012 matched successfully between Ledger and QuickBooks. Reconciliation status updated to Matched.
              - generic [ref=e617]:
                - generic [ref=e618]: Reconciliation
                - generic [ref=e619]: Info
                - generic [ref=e620]: JOB-2026-006
                - generic [ref=e621]: 31 May 2026, 11:00
            - button "View" [ref=e623]
          - generic [ref=e624]:
            - img [ref=e627]
            - generic [ref=e629]:
              - paragraph [ref=e631]: Financial Control Approved
              - paragraph [ref=e632]: Financial control FC-2026-002 (payroll rate adjustment) approved by CEO. Audit record created. Change reflected in next payroll cycle.
              - generic [ref=e633]:
                - generic [ref=e634]: Financial Control
                - generic [ref=e635]: Info
                - generic [ref=e636]: 31 May 2026, 11:00
            - button "View" [ref=e638]
          - generic [ref=e639]:
            - img [ref=e642]
            - generic [ref=e647]:
              - generic [ref=e648]:
                - paragraph [ref=e649]: Worker Compliance Check Failed
                - generic [ref=e650]:
                  - img [ref=e651]
                  - text: Action Required
              - paragraph [ref=e653]: Worker Lisa Park compliance check flagged — certifications expired. Cannot be assigned to new jobs until resolved.
              - generic [ref=e654]:
                - generic [ref=e655]: Worker
                - generic [ref=e656]: Warning
                - generic [ref=e657]: 31 May 2026, 11:00
            - button "View" [ref=e659]
          - generic [ref=e660]:
            - img [ref=e663]
            - generic [ref=e666]:
              - generic [ref=e667]:
                - paragraph [ref=e668]: Asset Maintenance Due
                - generic [ref=e669]:
                  - img [ref=e670]
                  - text: Action Required
              - paragraph [ref=e672]: Asset AST-2026-012 (Industrial Floor Buffer) scheduled maintenance overdue by 3 days. Asset flagged for service before next deployment.
              - generic [ref=e673]:
                - generic [ref=e674]: Asset
                - generic [ref=e675]: Warning
                - generic [ref=e676]: 30 May 2026, 11:00
            - button "View" [ref=e678]
  - region "Notifications (F8)":
    - list
  - button "Enterprise Sync QA Panel" [ref=e679]:
    - img [ref=e680]
```

# Test source

```ts
  1   | /**
  2   |  * DOCTRINE TEST: Activity Feed — Phase 6.2
  3   |  *
  4   |  * 25 tests covering:
  5   |  * - Engine functions (summary, filter, search, retrieval)
  6   |  * - Page rendering (KPI strip, event table, filters, search)
  7   |  * - Event detail dialog
  8   |  * - Deep linking
  9   |  * - Dashboard widget
  10  |  * - RBAC
  11  |  * - Doctrine compliance (informational only)
  12  |  */
  13  | import { test, expect } from '@playwright/test';
  14  | import { loginAsCEO, loginAsPM, loginAsWorker } from '../helpers/login';
  15  | import { clearBrowserState } from '../helpers/state';
  16  | 
  17  | test.beforeEach(async ({ page }) => {
  18  |   await clearBrowserState(page);
  19  | });
  20  | 
  21  | // ──────────────────────────────────────────────────────
  22  | // AF-01 to AF-03: Page Access & RBAC
  23  | // ──────────────────────────────────────────────────────
  24  | 
  25  | test('AF-01: Activity Feed page loads for CEO', async ({ page }) => {
  26  |   await loginAsCEO(page);
  27  |   await page.goto('/activity-feed');
  28  |   await expect(page.getByTestId('activity-feed-page')).toBeVisible();
  29  |   await expect(page.getByRole('heading', { name: /Activity Feed/i })).toBeVisible();
  30  | });
  31  | 
  32  | test('AF-02: CEO can navigate via sidebar to Activity Feed', async ({ page }) => {
  33  |   await loginAsCEO(page);
  34  |   await page.goto('/');
  35  |   await page.getByTestId('nav-activity-feed').click();
  36  |   await expect(page.getByTestId('activity-feed-page')).toBeVisible();
  37  | });
  38  | 
  39  | test('AF-03 (RBAC): Worker is denied access to Activity Feed', async ({ page }) => {
  40  |   await loginAsWorker(page);
  41  |   await page.goto('/activity-feed');
  42  |   await expect(page.getByTestId('activity-feed-page')).not.toBeVisible();
  43  | });
  44  | 
  45  | // ──────────────────────────────────────────────────────
  46  | // AF-04 to AF-08: KPI Strip
  47  | // ──────────────────────────────────────────────────────
  48  | 
  49  | test('AF-04: KPI strip renders all 5 cards', async ({ page }) => {
  50  |   await loginAsCEO(page);
  51  |   await page.goto('/activity-feed');
  52  |   await expect(page.getByTestId('af-kpi-strip')).toBeVisible();
  53  |   await expect(page.getByTestId('af-kpi-total')).toBeVisible();
  54  |   await expect(page.getByTestId('af-kpi-critical')).toBeVisible();
  55  |   await expect(page.getByTestId('af-kpi-action-required')).toBeVisible();
  56  |   await expect(page.getByTestId('af-kpi-today')).toBeVisible();
  57  |   await expect(page.getByTestId('af-kpi-last7days')).toBeVisible();
  58  | });
  59  | 
  60  | test('AF-05: KPI total matches seed data (25 events)', async ({ page }) => {
  61  |   await loginAsCEO(page);
  62  |   await page.goto('/activity-feed');
  63  |   await expect(page.getByTestId('af-kpi-total')).toContainText('25');
  64  | });
  65  | 
  66  | test('AF-06: KPI critical count is non-zero from seed data', async ({ page }) => {
  67  |   await loginAsCEO(page);
  68  |   await page.goto('/activity-feed');
  69  |   const critText = await page.getByTestId('af-kpi-critical').textContent();
  70  |   const count = parseInt(critText?.match(/\d+/)?.[0] || '0');
  71  |   expect(count).toBeGreaterThanOrEqual(3);
  72  | });
  73  | 
  74  | test('AF-07: KPI action required count is non-zero from seed data', async ({ page }) => {
  75  |   await loginAsCEO(page);
  76  |   await page.goto('/activity-feed');
  77  |   const arText = await page.getByTestId('af-kpi-action-required').textContent();
  78  |   const count = parseInt(arText?.match(/\d+/)?.[0] || '0');
  79  |   expect(count).toBeGreaterThanOrEqual(5);
  80  | });
  81  | 
  82  | test('AF-08: KPI last7days count equals total (all seed data within 7 days)', async ({ page }) => {
  83  |   await loginAsCEO(page);
  84  |   await page.goto('/activity-feed');
  85  |   const totalText = await page.getByTestId('af-kpi-total').textContent();
  86  |   const last7Text = await page.getByTestId('af-kpi-last7days').textContent();
  87  |   const total = parseInt(totalText?.match(/\d+/)?.[0] || '0');
  88  |   const last7 = parseInt(last7Text?.match(/\d+/)?.[0] || '0');
  89  |   expect(last7).toBeLessThanOrEqual(total);
> 90  |   expect(last7).toBeGreaterThan(0);
      |                 ^ Error: expect(received).toBeGreaterThan(expected)
  91  | });
  92  | 
  93  | // ──────────────────────────────────────────────────────
  94  | // AF-09 to AF-11: Event Table
  95  | // ──────────────────────────────────────────────────────
  96  | 
  97  | test('AF-09: Event table renders seed events', async ({ page }) => {
  98  |   await loginAsCEO(page);
  99  |   await page.goto('/activity-feed');
  100 |   await expect(page.getByTestId('af-event-table')).toBeVisible();
  101 |   await expect(page.getByTestId('af-event-row-act-001')).toBeVisible();
  102 |   await expect(page.getByTestId('af-event-row-act-005')).toBeVisible();
  103 |   await expect(page.getByTestId('af-event-row-act-014')).toBeVisible();
  104 | });
  105 | 
  106 | test('AF-10: Action Required indicator shown for events requiring action', async ({ page }) => {
  107 |   await loginAsCEO(page);
  108 |   await page.goto('/activity-feed');
  109 |   await expect(page.getByTestId('af-action-required-act-005')).toBeVisible();
  110 |   await expect(page.getByTestId('af-action-required-act-014')).toBeVisible();
  111 |   await expect(page.getByTestId('af-action-required-act-010')).toBeVisible();
  112 | });
  113 | 
  114 | test('AF-11: Events sorted newest first (act-001 appears before act-023)', async ({ page }) => {
  115 |   await loginAsCEO(page);
  116 |   await page.goto('/activity-feed');
  117 |   const rows = page.getByTestId('af-event-table').locator('[data-testid^="af-event-row-"]');
  118 |   const count = await rows.count();
  119 |   expect(count).toBeGreaterThan(0);
  120 |   // act-001 was created 1 hour ago, act-023 was created 3 days ago
  121 |   // act-001 should appear before act-023 in the sorted list
  122 |   const allTestIds = await rows.evaluateAll((els) => els.map((e) => e.getAttribute('data-testid')));
  123 |   const idx001 = allTestIds.indexOf('af-event-row-act-001');
  124 |   const idx023 = allTestIds.indexOf('af-event-row-act-023');
  125 |   expect(idx001).toBeLessThan(idx023);
  126 | });
  127 | 
  128 | // ──────────────────────────────────────────────────────
  129 | // AF-12 to AF-15: Filters
  130 | // ──────────────────────────────────────────────────────
  131 | 
  132 | test('AF-12: Type filter — Sync events only', async ({ page }) => {
  133 |   await loginAsCEO(page);
  134 |   await page.goto('/activity-feed');
  135 |   await page.getByTestId('af-filter-type').click();
  136 |   await page.getByRole('option', { name: 'Sync' }).click();
  137 |   await expect(page.getByTestId('af-event-row-act-010')).toBeVisible();
  138 |   await expect(page.getByTestId('af-event-row-act-011')).toBeVisible();
  139 |   await expect(page.getByTestId('af-event-row-act-001')).not.toBeVisible();
  140 | });
  141 | 
  142 | test('AF-13: Priority filter — Critical events only', async ({ page }) => {
  143 |   await loginAsCEO(page);
  144 |   await page.goto('/activity-feed');
  145 |   await page.getByTestId('af-filter-priority').click();
  146 |   await page.getByRole('option', { name: 'Critical' }).click();
  147 |   await expect(page.getByTestId('af-event-row-act-005')).toBeVisible();
  148 |   await expect(page.getByTestId('af-event-row-act-010')).toBeVisible();
  149 |   await expect(page.getByTestId('af-event-row-act-001')).not.toBeVisible();
  150 | });
  151 | 
  152 | test('AF-14: Type filter — Job events only', async ({ page }) => {
  153 |   await loginAsCEO(page);
  154 |   await page.goto('/activity-feed');
  155 |   await page.getByTestId('af-filter-type').click();
  156 |   await page.getByRole('option', { name: 'Job' }).click();
  157 |   await expect(page.getByTestId('af-event-row-act-018')).toBeVisible();
  158 |   await expect(page.getByTestId('af-event-row-act-019')).toBeVisible();
  159 |   await expect(page.getByTestId('af-event-row-act-001')).not.toBeVisible();
  160 | });
  161 | 
  162 | test('AF-15: Priority filter — Warning events visible, info hidden', async ({ page }) => {
  163 |   await loginAsCEO(page);
  164 |   await page.goto('/activity-feed');
  165 |   await page.getByTestId('af-filter-priority').click();
  166 |   await page.getByRole('option', { name: 'Warning' }).click();
  167 |   await expect(page.getByTestId('af-event-row-act-002')).toBeVisible();
  168 |   await expect(page.getByTestId('af-event-row-act-001')).not.toBeVisible();
  169 | });
  170 | 
  171 | // ──────────────────────────────────────────────────────
  172 | // AF-16 to AF-18: Search
  173 | // ──────────────────────────────────────────────────────
  174 | 
  175 | test('AF-16: Search by event title filters results', async ({ page }) => {
  176 |   await loginAsCEO(page);
  177 |   await page.goto('/activity-feed');
  178 |   await page.getByTestId('af-search').fill('QuickBooks');
  179 |   await expect(page.getByTestId('af-event-row-act-010')).toBeVisible();
  180 |   await expect(page.getByTestId('af-event-row-act-001')).not.toBeVisible();
  181 | });
  182 | 
  183 | test('AF-17: Search by job ID filters results', async ({ page }) => {
  184 |   await loginAsCEO(page);
  185 |   await page.goto('/activity-feed');
  186 |   await page.getByTestId('af-search').fill('JOB-2026-005');
  187 |   await expect(page.getByTestId('af-event-row-act-014')).toBeVisible();
  188 |   await expect(page.getByTestId('af-event-row-act-001')).not.toBeVisible();
  189 | });
  190 | 
```