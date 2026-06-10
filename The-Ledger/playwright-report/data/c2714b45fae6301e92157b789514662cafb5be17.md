# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: doctrine\notification-centre.spec.ts >> NC-25: Bell renders with unread badge on mobile bar for CEO
- Location: tests\doctrine\notification-centre.spec.ts:218:1

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: getByTestId('notif-bell-badge')
Expected: visible
Error: strict mode violation: getByTestId('notif-bell-badge') resolved to 2 elements:
    1) <span data-testid="notif-bell-badge" class="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">9</span> aka getByTestId('notif-bell-btn')
    2) <span data-testid="notif-bell-badge" class="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">9</span> aka getByTestId('notif-bell-btn-desktop').getByTestId('notif-bell-badge')

Call log:
  - Expect "toBeVisible" with timeout 5000ms
  - waiting for getByTestId('notif-bell-badge')

```

# Page snapshot

```yaml
- generic [ref=e2]:
  - generic [ref=e3]:
    - generic [ref=e4]:
      - generic [ref=e5]:
        - generic [ref=e6]: L
        - text: The Ledger
      - generic [ref=e7]:
        - button "System alerts" [ref=e8]:
          - img
          - generic [ref=e9]: "4"
        - button "Notifications" [ref=e10]:
          - img
          - generic [ref=e11]: "9"
        - button [ref=e12]:
          - img
    - main [ref=e13]:
      - generic [ref=e14]:
        - img [ref=e15]
        - generic [ref=e17]:
          - paragraph [ref=e18]: Example Business — Demo Data
          - paragraph [ref=e19]: You are viewing a demonstration environment. Changes made here will not affect real business data.
      - generic [ref=e21]:
        - generic [ref=e22]:
          - heading "Good evening, Demo." [level=2] [ref=e23]
          - paragraph [ref=e24]: Wednesday, 10 June 2026 — Here is what needs your attention today.
        - generic [ref=e25]:
          - generic [ref=e26]:
            - generic [ref=e28]: Pending Reviews
            - generic [ref=e29]:
              - generic [ref=e30]:
                - paragraph [ref=e31]: "3"
                - generic [ref=e32]:
                  - paragraph [ref=e33]: 1 report
                  - paragraph [ref=e34]: 2 uploads
              - button "Review Now" [ref=e35]:
                - text: Review Now
                - img
          - generic [ref=e36]:
            - generic [ref=e38]: Revenue at Risk
            - generic [ref=e40]:
              - img [ref=e41]
              - generic [ref=e44]: No Overdue Invoices
          - generic [ref=e45]:
            - generic [ref=e47]: Critical Alerts
            - generic [ref=e48]:
              - generic [ref=e49]:
                - paragraph [ref=e50]: "4"
                - generic [ref=e51]:
                  - paragraph [ref=e52]: 1 sync failure
                  - paragraph [ref=e53]: 3 governance flags
              - button "View Alerts" [ref=e54]:
                - text: View Alerts
                - img
        - generic [ref=e55]:
          - generic [ref=e56]:
            - generic [ref=e57]:
              - generic [ref=e58]: Active Jobs
              - button "View All" [ref=e59]
            - generic [ref=e62] [cursor=pointer]:
              - generic [ref=e64]:
                - paragraph [ref=e65]: Preventative maintenance visit
                - paragraph [ref=e66]: 2 workers
              - generic [ref=e68]: Active
          - generic [ref=e69]:
            - generic [ref=e71]: Today — Wed 10 Jun
            - generic [ref=e72]:
              - generic [ref=e73]:
                - paragraph [ref=e74]: Workforce
                - generic [ref=e75]:
                  - generic [ref=e76]:
                    - img [ref=e77]
                    - generic [ref=e82]: 2 scheduled today
                  - generic [ref=e83]:
                    - img [ref=e84]
                    - generic [ref=e87]: 4 active workers
              - generic [ref=e88]:
                - paragraph [ref=e89]: Upcoming (Next 24h)
                - paragraph [ref=e90]: No shifts scheduled today
              - button "Open Schedule" [ref=e91]:
                - img
                - text: Open Schedule
        - generic [ref=e92]:
          - generic [ref=e93]:
            - generic [ref=e94]:
              - generic [ref=e96]: Revenue This Week
              - generic [ref=e97]:
                - paragraph [ref=e98]: £575
                - generic [ref=e100]:
                  - img [ref=e101]
                  - text: "-91% vs last wk"
            - generic [ref=e104]:
              - generic [ref=e106]: Costs This Week
              - generic [ref=e107]:
                - paragraph [ref=e108]: £374
                - generic [ref=e109]: Estimated from approved records
            - generic [ref=e110]:
              - generic [ref=e112]: Margin This Week
              - generic [ref=e113]:
                - paragraph [ref=e114]: 35%
                - generic [ref=e116]:
                  - img [ref=e117]
                  - text: Target range
            - generic [ref=e120]:
              - generic [ref=e122]: Outstanding Invoices
              - generic [ref=e123]:
                - paragraph [ref=e124]: £7k
                - generic [ref=e126]: 2 invoices
          - button "View Financial Detail" [ref=e128]:
            - text: View Financial Detail
            - img
  - region "Notifications (F8)":
    - list
  - button "Enterprise Sync QA Panel" [ref=e129]:
    - img [ref=e130]
```

# Test source

```ts
  123 |   await expect(page.getByTestId('notif-row-notif-011')).toBeVisible();
  124 |   await expect(page.getByTestId('notif-row-notif-001')).not.toBeVisible();
  125 | });
  126 | 
  127 | test('NC-15: Search by job ID filters notifications', async ({ page }) => {
  128 |   await loginAsCEO(page);
  129 |   await page.goto('/notifications');
  130 |   await page.getByTestId('notif-search').fill('JOB-2026-005');
  131 |   await expect(page.getByTestId('notif-row-notif-009')).toBeVisible();
  132 |   await expect(page.getByTestId('notif-row-notif-005')).not.toBeVisible();
  133 | });
  134 | 
  135 | test('NC-16: Clearing search restores all notifications', async ({ page }) => {
  136 |   await loginAsCEO(page);
  137 |   await page.goto('/notifications');
  138 |   await page.getByTestId('notif-search').fill('QuickBooks');
  139 |   await expect(page.getByTestId('notif-row-notif-001')).not.toBeVisible();
  140 |   await page.getByTestId('notif-search').fill('');
  141 |   await expect(page.getByTestId('notif-row-notif-001')).toBeVisible();
  142 | });
  143 | 
  144 | test('NC-17: Notification detail dialog opens on View', async ({ page }) => {
  145 |   await loginAsCEO(page);
  146 |   await page.goto('/notifications');
  147 |   await page.getByTestId('notif-btn-view-notif-001').click();
  148 |   await expect(page.getByTestId('notif-detail-dialog')).toBeVisible();
  149 | });
  150 | 
  151 | test('NC-18: Detail dialog shows type, priority, and status badges', async ({ page }) => {
  152 |   await loginAsCEO(page);
  153 |   await page.goto('/notifications');
  154 |   await page.getByTestId('notif-btn-view-notif-009').click();
  155 |   await expect(page.getByTestId('notif-detail-dialog')).toBeVisible();
  156 |   await expect(page.getByTestId('notif-detail-type-badge')).toBeVisible();
  157 |   await expect(page.getByTestId('notif-detail-priority-badge')).toBeVisible();
  158 |   await expect(page.getByTestId('notif-detail-status-badge')).toBeVisible();
  159 | });
  160 | 
  161 | test('NC-19: Detail dialog shows Action Required badge for action-required notifications', async ({ page }) => {
  162 |   await loginAsCEO(page);
  163 |   await page.goto('/notifications');
  164 |   await page.getByTestId('notif-btn-view-notif-011').click();
  165 |   await expect(page.getByTestId('notif-detail-action-required-badge')).toBeVisible();
  166 | });
  167 | 
  168 | test('NC-20: Detail dialog shows Go to Source deep-link button', async ({ page }) => {
  169 |   await loginAsCEO(page);
  170 |   await page.goto('/notifications');
  171 |   await page.getByTestId('notif-btn-view-notif-005').click();
  172 |   await expect(page.getByTestId('notif-detail-dialog')).toBeVisible();
  173 |   await expect(page.getByTestId('notif-detail-btn-deep-link')).toBeVisible();
  174 | });
  175 | 
  176 | test('NC-21: Informational doctrine notice visible in detail dialog', async ({ page }) => {
  177 |   await loginAsCEO(page);
  178 |   await page.goto('/notifications');
  179 |   await page.getByTestId('notif-btn-view-notif-007').click();
  180 |   await expect(page.getByTestId('notif-detail-dialog')).toBeVisible();
  181 |   const dialog = page.getByTestId('notif-detail-dialog');
  182 |   await expect(dialog.getByText(/informational only/i)).toBeVisible();
  183 | });
  184 | 
  185 | // NC-22/23/24: scope toast assertions to [role="status"] to avoid strict-mode
  186 | // collision with KPI cards and status badges that also contain these words.
  187 | 
  188 | test('NC-22: Mark Read action removes unread highlight and shows toast', async ({ page }) => {
  189 |   await loginAsCEO(page);
  190 |   await page.goto('/notifications');
  191 |   await page.getByTestId('notif-btn-mark-read-notif-001').click();
  192 |   await expect(
  193 |     page.locator('[role="status"]').filter({ hasText: /marked as read/i })
  194 |   ).toBeVisible({ timeout: 5000 });
  195 | });
  196 | 
  197 | test('NC-23: Dismiss action shows toast and audit confirmation', async ({ page }) => {
  198 |   await loginAsCEO(page);
  199 |   await page.goto('/notifications');
  200 |   await page.getByTestId('notif-btn-dismiss-notif-002').click();
  201 |   await expect(
  202 |     page.locator('[role="status"]').filter({ hasText: /notification dismissed/i })
  203 |   ).toBeVisible({ timeout: 5000 });
  204 | });
  205 | 
  206 | test('NC-24: Dismiss from detail dialog closes dialog and shows toast', async ({ page }) => {
  207 |   await loginAsCEO(page);
  208 |   await page.goto('/notifications');
  209 |   await page.getByTestId('notif-btn-view-notif-014').click();
  210 |   await expect(page.getByTestId('notif-detail-dialog')).toBeVisible();
  211 |   await page.getByTestId('notif-detail-btn-dismiss').click();
  212 |   await expect(page.getByTestId('notif-detail-dialog')).not.toBeVisible();
  213 |   await expect(
  214 |     page.locator('[role="status"]').filter({ hasText: /notification dismissed/i })
  215 |   ).toBeVisible({ timeout: 5000 });
  216 | });
  217 | 
  218 | test('NC-25: Bell renders with unread badge on mobile bar for CEO', async ({ page }) => {
  219 |   await page.setViewportSize({ width: 390, height: 844 });
  220 |   await loginAsCEO(page);
  221 |   await page.goto('/');
  222 |   await expect(page.getByTestId('notif-bell-btn')).toBeVisible();
> 223 |   await expect(page.getByTestId('notif-bell-badge')).toBeVisible();
      |                                                      ^ Error: expect(locator).toBeVisible() failed
  224 | });
  225 | 
  226 | // NC-26: add .first() to avoid strict-mode failure when both notif-001 and
  227 | // notif-003 are simultaneously present in the DOM.
  228 | test('NC-26: Bell dropdown opens and shows preview notifications', async ({ page }) => {
  229 |   await page.setViewportSize({ width: 390, height: 844 });
  230 |   await loginAsCEO(page);
  231 |   await page.goto('/');
  232 |   await page.getByTestId('notif-bell-btn').click();
  233 |   await expect(page.getByTestId('notif-bell-dropdown')).toBeVisible();
  234 |   await expect(
  235 |     page.getByTestId('notif-bell-item-notif-001')
  236 |       .or(page.getByTestId('notif-bell-item-notif-003'))
  237 |       .first()
  238 |   ).toBeVisible();
  239 | });
  240 | 
  241 | test('NC-27: Bell View All navigates to /notifications', async ({ page }) => {
  242 |   await page.setViewportSize({ width: 390, height: 844 });
  243 |   await loginAsCEO(page);
  244 |   await page.goto('/');
  245 |   await page.getByTestId('notif-bell-btn').click();
  246 |   await expect(page.getByTestId('notif-bell-dropdown')).toBeVisible();
  247 |   await page.getByTestId('notif-bell-view-all').click();
  248 |   await expect(page.getByTestId('notification-centre-page')).toBeVisible();
  249 | });
  250 | 
  251 | test('NC-28 (RBAC): Worker is denied access to Notification Centre', async ({ page }) => {
  252 |   await loginAsWorker(page);
  253 |   await page.goto('/notifications');
  254 |   await expect(page.getByTestId('notification-centre-page')).not.toBeVisible();
  255 | });
  256 | 
```