# THE LEDGER — BACKEND SERVICE ARCHITECTURE

Version: 1.0
Status: AUTHORITATIVE
Date: June 4, 2026
Authority: Backend Architecture Definition Phase

---

## PURPOSE

This document defines The Ledger's service architecture: the choice of deployment topology, justification, required service modules, module ownership, boundaries, and inter-service communication.

---

## ARCHITECTURE DECISION: MODULAR MONOLITH

### Options Evaluated

**Traditional Monolith**
- All code in a single module with no enforced internal boundaries
- Simple to start, impossible to maintain at scale
- Domain boundaries become entangled over time
- Rejected: The Ledger's doctrine requires strict bounded context enforcement

**Modular Monolith**
- Single deployable unit
- Internally organised into isolated modules with enforced boundaries
- Modules communicate through well-defined interfaces and events
- Shared database, schema-isolated per module
- Can be incrementally extracted to microservices if required
- Accepted: correct for this stage of The Ledger

**Microservices**
- Each bounded context is an independent deployable service with its own database
- Requires service mesh, distributed tracing, distributed transactions, API gateway
- Significantly higher operational complexity
- Premature for a product that has not yet launched
- Rejected: disproportionate complexity for current scale

**Hybrid (Monolith + Selective Services)**
- Core platform as modular monolith
- Selective extraction for high-isolation concerns (e.g. document intelligence, accounting integration)
- Viable as an evolutionary step from the modular monolith
- Not the initial architecture but retained as the future migration path

### Decision

**The Ledger backend is a Modular Monolith.**

A single Express application deployed as a single unit, internally decomposed into modules that mirror the bounded contexts defined in BACKEND_DOMAIN_ARCHITECTURE.md.

Module boundaries are enforced by:
1. Directory structure (one directory per module)
2. Explicit public API surfaces (index.ts barrel exports only)
3. No cross-module imports except through the public API surface
4. Cross-module communication via internal event bus

---

## JUSTIFICATION

| Criterion | Modular Monolith Verdict |
|---|---|
| Enforces bounded context separation | Yes — by directory structure and public API contracts |
| Supports approval doctrine | Yes — transaction boundaries span single database |
| Supports audit doctrine | Yes — audit log in same transaction as state change |
| Supports financial integrity | Yes — ACID transactions available without distributed coordination |
| Extractable to microservices later | Yes — module boundaries are already microservice-ready |
| Operational simplicity | Yes — single deployment, single database, standard tooling |
| Appropriate for current scale | Yes — pre-launch product, single-tenant initially |

---

## MODULE DEFINITIONS

Each module corresponds to a bounded context from BACKEND_DOMAIN_ARCHITECTURE.md.

---

### Module 1: Identity Module

**Maps to:** Identity & Access Context

**Owns:** Company, User, Role, Permission, Session, RefreshToken

**Public API Surface:**
- `createCompany()`
- `createUser()`
- `assignRole()`
- `authenticateUser()` → JWT access token + refresh token
- `refreshAccessToken()`
- `revokeSession()`
- `resolvePermissions(userId, companyId)` → PermissionSet
- `getUserContext(userId)` → UserContext (used by all other modules)

**Internal Services:**
- `AuthService` — token generation, validation, refresh
- `RbacService` — role and permission resolution
- `TenantService` — company provisioning, tenant context

**Dependencies:** None (authoritative source)

---

### Module 2: Operational Module

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

**Dependencies:** Identity Module (UserContext)

---

### Module 3: Review Centre Module

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

### Module 4: Financial Normalization Module

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

### Module 5: Inventory & Asset Module

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

### Module 6: Client Portal Module

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

### Module 7: Accounting Integration Module

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

### Module 8: Automation & Intelligence Module

**Maps to:** Intelligence & Automation Context

**Owns:** AutomationRule, AutomationSchedule, GovernanceRecord, WorkflowDefinition, WorkflowExecution, NotificationRecord, ActivityFeedEvent, EventBusRecord

**Public API Surface:**
- `createAutomationRule()`, `updateRule()`, `archiveRule()`
- `evaluateRulesForEvent(event)` → triggered evaluations (never approves)
- `createSchedule()`, `pauseSchedule()`, `resumeSchedule()`, `disableSchedule()`
- `triggerScheduledEvaluation(scheduleId)`
- `createWorkflow()`, `activateWorkflow()`, `pauseWorkflow()`, `archiveWorkflow()`
- `executeWorkflow(triggerId, context)`
- `createNotification(userId, message, type)`
- `markNotificationRead(notificationId, userId)`
- `publishActivityEvent(event)`
- `publishBusEvent(event)`
- `getRecentBusEvents(companyId)` → dashboard feed
- `setGovernanceStatus(ruleId, status, ceoId)`

**Internal Services:**
- `AutomationEvaluationService` — read-only rule evaluation
- `WorkflowExecutionEngine` — orchestrates workflow steps; enforces forbidden actions
- `SchedulerService` — triggers evaluations at scheduled times
- `NotificationService` — creates, routes, and tracks notifications
- `ActivityFeedService` — populates and retrieves activity feed
- `EventBusService` — publish/subscribe within the modular monolith
- `GovernanceService` — CEO oversight of automation risk levels

**Enforcement:**
- `assertForbiddenActionsBlocked()` — `approve_report`, `bypass_review_centre`, etc. throw at evaluation time
- `assertHumanApprovalRequired()` — workflows may never produce approval events

**Dependencies:** Identity Module; subscribes to events from all other modules

---

### Module 9: Reporting Module

**Maps to:** Reporting & Analytics Context

**Owns:** ReportDefinition, GeneratedReport, ReportExport, ReportDistribution, AnalyticsSnapshot

**Public API Surface:**
- `generateReport(type, params, ceoId)` → GeneratedReport
- `archiveReport(reportId, ceoId)`
- `generateExport(reportId, exportType, ceoId)` → ReportExport
- `generateBoardPack(reportIds, ceoId)` → BoardPackExport
- `downloadExport(exportId, ceoId)` → artifact
- `archiveExport(exportId, ceoId)`
- `createDistribution(exportId, method, recipients, ceoId)`
- `computeAnalyticsSnapshot(companyId)` → 5-dimension health scores
- `getForecasts(companyId)` → advisory projections

**Internal Services:**
- `ReportGenerationService` — aggregates data from all modules; produces report artifact
- `ExportService` — produces PDF and board-pack artifacts
- `DistributionService` — routes exports via email/portal/download
- `AnalyticsService` — computes health scores, identifies risks, surfaces trends
- `ForecastService` — projection engine (advisory only, clearly labelled)

**Enforcement:**
- `assertReportReadOnly()` — report generation never approves or modifies records
- `assertExportDerivative()` — exports never modify source reports
- `assertForecastsLabelled()` — all projections carry advisory-only designation

**Dependencies:** Identity Module; reads aggregated data from all other modules

---

## INTER-MODULE COMMUNICATION

### Within the Modular Monolith

**Synchronous (within a request):**
- Application Layer of one module calls the public API surface of another module
- Used when: the calling module needs an immediate result to complete its use case
- Example: `ReviewCentreModule.approveSubmission()` calls `IdentityModule.resolvePermissions()` synchronously

**Asynchronous (via internal event bus):**
- A module publishes a domain event; subscriber modules handle it asynchronously
- Used when: the result of an operation in one module triggers downstream work in another module without tight coupling
- Example: `TimesheetApproved` event published by Review Centre Module; Financial Normalization Module subscribes and creates `TimesheetEntry`

### Event Bus Guarantee

Within the modular monolith, the event bus uses the **transactional outbox pattern**:
1. Domain event is written to an `outbox` table in the same database transaction as the state change
2. A background worker reads the outbox and delivers events to subscribers
3. This ensures events are never lost if the process crashes between state change and event publication

### Future Microservices Migration

When individual modules need to be extracted:
1. The internal event bus is replaced by a message broker (e.g. RabbitMQ or AWS SQS)
2. Synchronous cross-module calls are replaced by HTTP or gRPC
3. Module-owned database schemas are extracted to separate databases
4. Module boundaries are already clean — extraction is a deployment change, not a code redesign

---

## MODULE BOUNDARY RULES

1. A module may only import from another module's public API surface (index.ts barrel)
2. A module may never import from another module's internal service or repository
3. A module may publish events that any other module may subscribe to
4. A module may never subscribe to another module's internal events
5. The Domain Layer of a module is private to that module
6. All cross-module data exchange uses DTOs, never domain entities
