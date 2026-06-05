# THE LEDGER — BACKEND SERVICE ARCHITECTURE

Version: 2.0
Status: AUTHORITATIVE
Date: June 4, 2026
Authority: Backend Architecture Refinement Pass

---

## CHANGE LOG

| Version | Date | Changes |
|---|---|---|
| 1.0 | June 4, 2026 | Initial architecture — 9 modules |
| 2.0 | June 4, 2026 | Refinement pass: Tenant Module extracted from Identity; Financial Intelligence Module added; Notification Centre formally defined as sub-module of Intelligence; total 11 modules |

---

## PURPOSE

This document defines The Ledger's service architecture: the choice of deployment topology, justification, required service modules, module ownership, boundaries, and inter-service communication.

---

## ARCHITECTURE DECISION: MODULAR MONOLITH

### Decision

**The Ledger backend is a Modular Monolith.**

A single Express application deployed as a single unit, internally decomposed into 11 modules that mirror the bounded contexts defined in BACKEND_DOMAIN_ARCHITECTURE.md.

Module boundaries are enforced by:
1. Directory structure (one directory per module)
2. Explicit public API surfaces (index.ts barrel exports only)
3. No cross-module imports except through the public API surface
4. Cross-module communication via internal event bus

For full rationale see the original justification table in v1.0. The refinements do not change the deployment model.

---

## MODULE DEFINITIONS

Each module corresponds to a bounded context from BACKEND_DOMAIN_ARCHITECTURE.md.

---

### Module 1: Tenant Module

**Maps to:** Tenant Context

**Owns:** Company, Subscription, Plan, TenantConfiguration, TenantMetadata

**Public API Surface:**
- `provisionTenant(companyData)` → Company + initial configuration
- `suspendTenant(companyId, adminId)` → suspended lifecycle state
- `reactivateTenant(companyId, adminId)`
- `terminateTenant(companyId, adminId)`
- `updateTenantConfiguration(companyId, config, ceoId)`
- `getTenantContext(companyId)` → TenantContext (company_id, plan, config, status)
- `getPlan(companyId)` → Plan (feature flags, limits)

**Internal Services:**
- `TenantProvisioningService` — creates company record, initialises configuration
- `TenantLifecycleService` — manages active/suspended/terminated transitions
- `TenantConfigurationService` — plan and configuration management

**Dependencies:** None (authoritative source for tenancy)

---

### Module 2: Identity Module

**Maps to:** Identity & Access Context

**Owns:** User, Role, Permission, Session, RefreshToken

**Note:** Company ownership has been moved to Tenant Module. Identity owns authentication and authorisation only.

**Public API Surface:**
- `createUser(companyId, userData)` → User
- `assignRole(userId, role, ceoId)`
- `authenticateUser(email, password, companyId)` → JWT access token + refresh token
- `refreshAccessToken(refreshToken)` → new access token
- `revokeSession(sessionId, userId)`
- `revokeAllSessionsForTenant(companyId)` — invoked on TenantSuspended
- `resolvePermissions(userId, companyId)` → PermissionSet
- `getUserContext(userId)` → UserContext (user_id, role, company_id)

**Internal Services:**
- `AuthService` — token generation, validation, refresh
- `RbacService` — role and permission resolution
- `UserService` — user CRUD and deactivation

**Dependencies:** Tenant Module (TenantContext — to validate company exists and is active)

---

### Module 3: Operational Module

**Maps to:** Operational Core Context

**Owns:** Client, Site, Job, Shift, WorkerProfile, PMProfile, WorkerAssignment, ScheduleRecord

**Public API Surface:**
- `createClient()`, `updateClient()`
- `createSite()`, `updateSiteStatus()`, `archiveSite()`
- `createJob()`, `transitionJobStatus()`, `assignWorkerToJob()`
- `startShift()`, `endShift()`
- `resolveSchedulingConflict()`
- `getJobContext(jobId, companyId)` → JobContext (used by submission module)

**Internal Services:**
- `JobService` — lifecycle state machine, attribution validation
- `SiteService` — client hierarchy, archive rules
- `ShiftService` — shift start/end, single-active enforcement
- `SchedulingService` — conflict detection, override with audit

**Dependencies:** Identity Module (UserContext), Tenant Module (TenantContext)

---

### Module 4: Review Centre Module

**Maps to:** Submission & Review Context

**Owns:** TimesheetSubmission, ReportSubmission, ExpenseSubmission, IssueLog, RejectionRecord

**Public API Surface:**
- `submitTimesheet()`, `submitReport()`, `submitExpense()`, `submitIssue()`
- `approveSubmission(submissionId, type, approverId)` → triggers normalization event
- `rejectSubmission(submissionId, reason, reviewerId)`
- `withdrawSubmission(submissionId, workerId)`
- `listPendingSubmissions(reviewerId, companyId)`
- `resubmitAfterRejection(originalId, correctedData, workerId)`

**Internal Services:**
- `SubmissionIntakeService` — validates, creates pending_review record
- `ApprovalService` — validates approver authority, calls normalization via event
- `RejectionService` — enforces rejection doctrine
- `CorrectionService` — creates resubmission with `rejected_submission_ref`

**Enforcement:**
- `assertAutomationCannotApprove()` — throws if automation actor attempts approval
- `assertWithdrawalWindow()` — only before reviewer opens

**Dependencies:** Identity Module (UserContext), Operational Module (JobContext)

---

### Module 5: Financial Normalization Module

**Maps to:** Financial Normalization Context

**Owns:** TimesheetEntry, ExpenseEntry, InventoryMutation, EquipmentUsageRecord, InvoiceLineItem, FinancialMutation, VoidRecord, AdjustmentRecord, PayrollRecord

**Public API Surface:**
- `normalizeApprovedTimesheet(event)` → TimesheetEntry + PayrollRecord contribution
- `normalizeApprovedReport(event)` → InventoryMutation[] + EquipmentUsageRecord[]
- `normalizeApprovedExpense(event)` → ExpenseEntry [+ InvoiceLineItem if billable]
- `requestVoid(financialRecordId, requesterId)` → VoidRecord (pending CEO approval)
- `requestAdjustment(financialRecordId, delta, requesterId)` → AdjustmentRecord (pending CEO approval)
- `approveCorrection(correctionId, ceoId)` → applies void/adjustment
- `getJobMiniLedger(jobId, companyId)` → aggregated financial summary

**Internal Services:**
- `NormalizationService` — creates financial records from approved events
- `CorrectionService` — manages void/adjustment lifecycle (CEO-only)
- `MiniLedgerService` — aggregates labour, expense, materials, equipment costs and revenue
- `PayrollAggregationService` — accumulates payroll contributions by worker and period

**Enforcement:**
- `assertApprovalReference()` — no financial record created without `approved_by` + `approved_at`
- `assertFinancialRecordImmutability()` — content fields cannot be updated after creation
- `assertCEOOnlyCorrection()` — void/adjustment approval requires CEO role

**Dependencies:** Identity Module (UserContext), Review Centre Module (receives approval events)

---

### Module 6: Financial Intelligence Module

**Maps to:** Financial Intelligence Context

**Owns:** MarginSnapshot, ForecastRecord, ExposureRecord, FinancialKPISnapshot, PortfolioInsight

**Public API Surface:**
- `computeJobMargin(jobId, companyId)` → MarginSnapshot
- `computePortfolioMargin(companyId)` → PortfolioInsight
- `computeExposure(companyId)` → ExposureRecord (approved costs vs. projected revenue)
- `generateForecast(companyId, params)` → ForecastRecord (advisory projection)
- `getFinancialKPIs(companyId, period)` → FinancialKPISnapshot
- `getFinancialExplorerView(jobId, companyId)` → detailed financial breakdown (read model)
- `getPortfolioSummary(companyId)` → cross-job financial overview

**Internal Services:**
- `MarginIntelligenceService` — job and portfolio margin computation
- `ExposureAnalysisService` — computes approved cost vs. projected revenue gaps
- `ForecastService` — projection engine (advisory only, labelled)
- `FinancialKPIService` — computes and caches KPI snapshots
- `FinancialExplorerService` — read model aggregation for Financial Explorer views

**Enforcement:**
- `assertAdvisoryOnly()` — all outputs carry advisory designation
- `assertNoFinancialMutations()` — module never creates, modifies, or approves financial records
- `assertForecastsLabelled()` — all projections carry "Advisory Projection — Not Financial Advice"

**Dependencies:** Financial Normalization Module (reads financial records), Operational Module (job context)

---

### Module 7: Inventory & Asset Module

**Maps to:** Inventory & Asset Context

**Owns:** StockItem, StockLocation, StockLevel, Asset, AssetAssignment

**Public API Surface:**
- `createStockItem()`, `updateStockItem()`, `discontinueStockItem()`
- `createStockLocation()`
- `recordStockReplenishment()`, `recordStockTransfer()`
- `approveStockWriteOff()` → CEO only
- `getStockLevel(itemId, locationId)`
- `createAsset()`, `assignAssetToJob()`, `endAssetAssignment()`
- `startAssetMaintenance()`, `completeAssetMaintenance()`
- `retireAsset()` → CEO only

**Internal Services:**
- `StockLevelService` — tracks levels via InventoryMutation events; fires low stock alerts
- `AssetAssignmentService` — enforces exclusivity; tracks asset lifecycle
- `AssetMaintenanceService`

**Dependencies:** Identity Module (UserContext), Financial Normalization Module (receives mutation events)

---

### Module 8: Client Portal Module

**Maps to:** Client Portal Context

**Owns:** ClientPortalAccount, ClientPortalSession, DocumentShareRecord, ClientRequest

**Public API Surface:**
- `provisionPortalAccount(clientId, ceoId)` → ClientPortalAccount
- `deactivatePortalAccount(portalId, ceoId)`
- `authenticatePortalUser(email, password)` → portal JWT
- `getClientPortalView(clientId)` → scoped site/job/document/invoice data
- `submitClientRequest(clientId, requestData)` → ClientRequest
- `shareDocument(documentId, clientId, ceoOrPmId)` → DocumentShareRecord
- `acknowledgeClientRequest()`, `declineClientRequest()`, `resolveClientRequest()`

**Internal Services:**
- `PortalAuthService` — separate credential model for portal users
- `PortalDataScopeService` — enforces client visibility rules
- `ClientRequestRoutingService` — routes requests to relevant PM

**Enforcement:**
- `assertAccessNotesHidden()` — access notes never in portal data projection
- `assertDocumentExplicitShare()` — no auto-exposure

**Dependencies:** Identity Module, Operational Module (job/site/client data)

---

### Module 9: Accounting Integration Module

**Maps to:** Accounting Integration Context

**Owns:** AccountingProviderConfig, SyncRecord, ReconciliationRecord, ExceptionRecord, FinancialControlRecord

**Public API Surface:**
- `configureProvider(providerId, credentials, ceoId)`
- `queueSync(financialRecordIds, providerId)`
- `executeSyncBatch()` → processes queued records
- `retryFailedSync(syncRecordId)`
- `runReconciliation(providerId)` → ReconciliationReport
- `createException(discrepancy)` → ExceptionRecord
- `resolveException(exceptionId, resolution, ceoId)`
- `createFinancialControl(financialRecordId, requesterId)`
- `approveFinancialControl(controlId, ceoId)`

**Internal Services:**
- `ProviderAdapterRegistry` — maps provider IDs to adapter implementations
- `SyncQueueService` — queues records, manages sync lifecycle
- `ReconciliationService` — compares Ledger records with provider data
- `ExceptionResolutionService` — lifecycle management for discrepancies
- `FinancialControlService` — override request and CEO approval workflow

**Provider Adapters (Infrastructure Layer):**
- `QuickBooksAdapter`
- `XeroAdapter`
- `FreshBooksAdapter`
- `ZohoAdapter`

**Enforcement:**
- `assertSyncNeverModifiesLedger()` — sync is export-only; never writes back to financial tables
- `assertReconciliationReadOnly()` — reconciliation detects, never corrects

**Dependencies:** Identity Module, Financial Normalization Module (reads approved records)

---

### Module 10: Automation & Intelligence Module (with Notification Centre)

**Maps to:** Intelligence & Automation Context

**Owns:** AutomationRule, AutomationSchedule, GovernanceRecord, WorkflowDefinition, WorkflowExecution, ActivityFeedEvent, EventBusRecord

**Notification Centre Sub-Module Owns:** NotificationRecord, NotificationDeliveryRecord, NotificationPreference

**Public API Surface — Automation:**
- `createAutomationRule()`, `updateRule()`, `archiveRule()`
- `evaluateRulesForEvent(event)` → triggered evaluations (never approves)
- `createSchedule()`, `pauseSchedule()`, `resumeSchedule()`, `disableSchedule()`
- `triggerScheduledEvaluation(scheduleId)`
- `createWorkflow()`, `activateWorkflow()`, `pauseWorkflow()`, `archiveWorkflow()`
- `executeWorkflow(triggerId, context)`
- `publishActivityEvent(event)`
- `publishBusEvent(event)`
- `getRecentBusEvents(companyId)` → dashboard feed
- `setGovernanceStatus(ruleId, status, ceoId)`

**Public API Surface — Notification Centre:**
- `createNotification(userId, type, message, sourceEventId, deepLinkPath)` → NotificationRecord
- `markNotificationRead(notificationId, userId)` → audit entry
- `dismissNotification(notificationId, userId)` → audit entry
- `getNotificationInbox(userId, companyId)` → NotificationRecord[] (unread first)
- `getNotificationCount(userId, companyId)` → unread count (for badge)
- `updateNotificationPreferences(userId, preferences)` → NotificationPreference

**Internal Services — Automation:**
- `AutomationEvaluationService` — read-only rule evaluation
- `WorkflowExecutionEngine` — orchestrates workflow steps; enforces forbidden actions
- `SchedulerService` — triggers evaluations at scheduled times
- `ActivityFeedService` — populates and retrieves activity feed
- `EventBusService` — publish/subscribe within the modular monolith
- `GovernanceService` — CEO oversight of automation risk levels

**Internal Services — Notification Centre:**
- `NotificationRoutingService` — maps incoming events to notification types and recipients
- `NotificationDeliveryService` — delivers to in-platform inbox; future: email, push
- `NotificationPreferenceService` — manages per-user delivery preferences

**Notification Event Subscriptions:**
The Notification Routing Service subscribes to the following events and creates notifications accordingly:

| Source Event | Notification Type | Recipients |
|---|---|---|
| `TimesheetSubmitted` | `review_required` | PM (own jobs), CEO |
| `ReportSubmitted` | `review_required` | PM (own jobs), CEO |
| `ExpenseSubmitted` | `review_required` | PM (own jobs), CEO |
| `TimesheetApproved` | `review_approved` | Submitting worker |
| `ReportApproved` | `review_approved` | Submitting worker |
| `ExpenseApproved` | `review_approved` | Submitting worker |
| `TimesheetRejected` | `review_rejected` | Submitting worker |
| `ReportRejected` | `review_rejected` | Submitting worker |
| `ExpenseRejected` | `review_rejected` | Submitting worker |
| `AccountingSyncFailed` | `sync_failed` | CEO |
| `AccountingSyncSucceeded` | `sync_succeeded` | CEO (if enabled in preferences) |
| `ReconciliationExceptionDetected` | `financial_alert` | CEO |
| `ExposureAlertTriggered` | `financial_alert` | CEO |
| `GovernanceStatusChanged` | `governance_action` | CEO |
| `AutomationTriggered` (critical) | `automation_alert` | CEO |
| `ClientRequestSubmitted` | `client_portal_event` | PM (relevant job), CEO |
| `SchedulingConflictDetected` | `scheduling_conflict` | PM (relevant job), CEO |
| `StockLowAlertTriggered` | `stock_alert` | PM (relevant job), CEO |

**Enforcement:**
- `assertForbiddenActionsBlocked()` — `approve_report`, `bypass_review_centre`, etc. throw at evaluation time
- `assertHumanApprovalRequired()` — workflows may never produce approval events
- `assertNotificationsInformationalOnly()` — notifications never trigger financial mutations or approvals

**Dependencies:** Identity Module; subscribes to events from all other modules

---

### Module 11: Reporting Module

**Maps to:** Reporting & Analytics Context

**Owns:** ReportDefinition, GeneratedReport, ReportExport, ReportDistribution, OperationalAnalyticsSnapshot

**Public API Surface:**
- `generateReport(type, params, ceoId)` → GeneratedReport
- `archiveReport(reportId, ceoId)`
- `generateExport(reportId, exportType, ceoId)` → ReportExport
- `generateBoardPack(reportIds, ceoId)` → BoardPackExport
- `downloadExport(exportId, ceoId)` → artifact
- `archiveExport(exportId, ceoId)`
- `createDistribution(exportId, method, recipients, ceoId)`
- `computeOperationalHealthSnapshot(companyId)` → 5-dimension operational health scores
- `getOperationalAnalytics(companyId)` → workflow, governance, automation trends

**Internal Services:**
- `ReportGenerationService` — aggregates data from all modules; produces report artifact
- `ExportService` — produces PDF and board-pack artifacts
- `DistributionService` — routes exports via email/portal/download
- `OperationalAnalyticsService` — computes operational health scores, identifies risks, surfaces trends

**Enforcement:**
- `assertReportReadOnly()` — report generation never approves or modifies records
- `assertExportDerivative()` — exports never modify source reports

**Dependencies:** Identity Module; reads data from all other modules including Financial Intelligence Module

---

## INTER-MODULE COMMUNICATION

### Synchronous (within a request)

Application Layer of one module calls the public API surface of another module. Used when the calling module needs an immediate result to complete its use case.

Example: `ReviewCentreModule.approveSubmission()` calls `IdentityModule.resolvePermissions()` synchronously before proceeding.

### Asynchronous (via internal event bus)

A module publishes a domain event; subscriber modules handle it asynchronously via the transactional outbox pattern.

Example: `TimesheetApproved` event published by Review Centre Module → Financial Normalization Module subscribes and creates `TimesheetEntry` → `TimesheetEntryCreated` event published → Notification Centre routes to CEO/PM inbox.

### Event Bus Guarantee

Within the modular monolith, the event bus uses the transactional outbox pattern:
1. Domain event written to `outbox` table in same transaction as state change
2. Background worker reads outbox and delivers to subscribers
3. Events are never lost if process crashes between state change and publication
4. Subscribers must be idempotent (at-least-once delivery)

---

## MODULE BOUNDARY RULES

1. A module may only import from another module's public API surface (index.ts barrel)
2. A module may never import from another module's internal service or repository
3. A module may publish events that any other module may subscribe to
4. A module may never subscribe to another module's internal events
5. The Domain Layer of a module is private to that module
6. All cross-module data exchange uses DTOs, never domain entities
7. The Notification Centre sub-module within Intelligence Module is internally accessible to the Intelligence Module but exposes its own public API surface to other modules
