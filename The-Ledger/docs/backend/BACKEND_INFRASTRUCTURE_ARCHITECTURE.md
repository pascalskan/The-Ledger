# THE LEDGER — BACKEND INFRASTRUCTURE ARCHITECTURE

Version: 1.0
Status: AUTHORITATIVE
Date: June 4, 2026
Authority: Backend Architecture Definition Phase

---

## PURPOSE

This document defines The Ledger's infrastructure architecture: application runtime, background workers, queue architecture, scheduler, integration processing, notification processing, file and document processing, audit processing, and future scaling architecture.

---

## APPLICATION RUNTIME ARCHITECTURE

### Runtime: Node.js + Express

**Framework:** Express.js
**Language:** TypeScript (compiled to JavaScript)
**Runtime:** Node.js (LTS version)

### Process Model

In v1, The Ledger backend runs as two process types:

1. **API Server Process** — Express HTTP server; handles all inbound API requests
2. **Worker Process** — Background job processor; handles queued tasks and the event outbox

Both processes run from the same codebase and share the same database. They are separated as process types to allow independent scaling and to avoid background job processing blocking API request handling.

### Application Configuration

All configuration is injected via environment variables. No configuration is hardcoded. Sensitive values (database credentials, JWT signing key, accounting provider API keys) are stored in environment variables, never in code.

**Required environment variables:**
- `DATABASE_URL` — PostgreSQL connection string
- `JWT_PRIVATE_KEY` — Private key for JWT signing
- `JWT_PUBLIC_KEY` — Public key for JWT verification
- `PORTAL_JWT_SECRET` — Secret for portal JWT signing
- `ACCOUNTING_*_API_KEY` — Per-provider API keys
- `EMAIL_*` — Email service credentials
- `FILE_STORAGE_*` — File storage configuration
- `REDIS_URL` — Redis connection (for rate limiting and optional caching)

---

## BACKGROUND WORKER ARCHITECTURE

Background workers process jobs from the queue. The worker process runs continuously and polls the queue for pending jobs.

### Worker Types

**1. Outbox Delivery Worker**
- Polls `event_outbox` table every 1 second
- Delivers pending events to internal subscribers
- Marks events as `delivered` on success; increments retry count on failure
- Uses exponential backoff for failed deliveries (1s, 2s, 4s, 8s, max 5 retries)
- After 5 failures: marks event as `dead_lettered`, alerts via monitoring

**2. Accounting Sync Worker**
- Polls `accounting.sync_queue` for records with status `pending`
- Executes sync to configured accounting provider
- Updates sync record status (syncing → synced | failed)
- Handles rate limits from accounting providers (respects Retry-After headers)

**3. Notification Delivery Worker**
- Polls `intelligence.notification_queue` for pending notifications
- Delivers in-platform notifications (database write to notification_records)
- Future: delivers email notifications via email service adapter

**4. Scheduled Evaluation Worker**
- Polls `intelligence.automation_schedules` for schedules due for execution
- Triggers read-only rule evaluations for scheduled automations
- Creates audit record for every scheduled execution (whether or not the evaluation produces any action)

**5. Report Distribution Worker**
- Polls `reporting.distribution_queue` for pending distributions
- Delivers exports via configured method (email, portal, download link)
- Updates distribution record status (pending → delivered | failed)

**6. Reconciliation Worker**
- Runs on a configured schedule (daily, or on-demand CEO trigger)
- Fetches data from accounting provider APIs
- Compares with Ledger financial records
- Creates reconciliation records and exception records as appropriate

### Worker Resilience

- Workers use at-least-once processing; all handlers must be idempotent
- Each job is claimed with a processing lock (record status = `processing`, locked_at timestamp)
- Jobs stuck in `processing` for > 5 minutes are automatically reset to `pending` (stale lock recovery)
- Dead-lettered jobs are retained for manual inspection and requeue

---

## QUEUE ARCHITECTURE

The Ledger uses a **database-backed queue** in v1 (PostgreSQL as the queue store).

### Why database-backed queue

- No additional infrastructure dependency (PostgreSQL already required)
- Transactional enqueue: jobs are enqueued in the same transaction as the state change (outbox pattern)
- Sufficient throughput for the expected operational volume of a single-tenant or small multi-tenant deployment
- Observable: queue depth is a simple SQL count query

### Queue Tables

| Queue | Table | Description |
|---|---|---|
| Event Outbox | `intelligence.event_outbox` | Domain events awaiting delivery |
| Sync Queue | `accounting.sync_queue` | Financial records awaiting sync |
| Notification Queue | `intelligence.notification_queue` | Notifications awaiting delivery |
| Distribution Queue | `reporting.distribution_queue` | Report exports awaiting distribution |
| Scheduled Jobs | `intelligence.scheduled_job_executions` | Scheduled evaluations due for processing |

### Future Queue Migration Path

If throughput demands exceed PostgreSQL queue capacity, the queue layer is extracted to a dedicated message broker (RabbitMQ or AWS SQS) without changing the application logic. The queue interface in the Infrastructure Layer is designed to be swappable.

---

## SCHEDULER ARCHITECTURE

The Ledger requires scheduled execution for:
- Automation scheduler rules (user-configured schedules)
- Reconciliation runs (daily or on-demand)
- Notification reminders (future)
- Payroll export triggers (future)

### Scheduler Implementation

In v1, the scheduler is implemented as a **cron-within-process** mechanism:

1. On worker process startup, load all active `automation_schedules` records
2. For each schedule, register a cron expression evaluation
3. When a schedule fires: create a job in `scheduled_job_executions` queue
4. Outbox/worker picks up the job and executes the evaluation

This is a pragmatic approach for v1. It does not support distributed scheduler execution (multiple worker instances competing to fire the same schedule), but this is acceptable for v1 (single worker process).

**Distributed scheduling (future):** Replace with a distributed lock (Redis SETNX or Postgres advisory lock) to ensure a scheduled job fires exactly once even with multiple worker instances.

### Scheduler Safety

Every scheduled execution:
- Creates an audit record (`scheduled_evaluation_triggered`)
- Is never allowed to approve submissions, create financial records, or bypass the Review Centre
- Evaluation results are informational only (notification, flag, escalation)

---

## INTEGRATION PROCESSING ARCHITECTURE

The Ledger integrates with downstream accounting providers as an outbound-only integration in v1.

### Integration Processing Pipeline

```
1. Financial record approved → FinancialMutationCreated event
2. Accounting Integration Module consumes event
3. SyncQueue record created (status: pending)
4. Sync Worker picks up pending record
5. Provider adapter called (QuickBooks/Xero/FreshBooks/Zoho)
6. Success: SyncRecord status → synced; AccountingSyncSucceeded event published
7. Failure: SyncRecord status → failed; retry queued; AccountingSyncFailed event published
8. Max retries exceeded: SyncRecord status → requires_manual_intervention; alert created
```

### Provider Adapter Interface

Each provider adapter implements a common interface:

```
interface AccountingProviderAdapter {
  pushTimesheetEntry(entry: TimesheetEntry): Promise<SyncResult>
  pushExpenseEntry(entry: ExpenseEntry): Promise<SyncResult>
  pushInvoiceLineItem(item: InvoiceLineItem): Promise<SyncResult>
  pushVoidRecord(record: VoidRecord): Promise<SyncResult>
  pushAdjustmentRecord(record: AdjustmentRecord): Promise<SyncResult>
  pullReconciliationData(since: Date): Promise<ProviderRecords>
}
```

### Outbound-Only Rule

In v1, provider adapters push data to providers. Providers do not push data back to The Ledger. The Ledger does not modify financial records based on any response from a provider. Sync is write-from-Ledger only.

Reconciliation reads provider data for comparison, but never writes to The Ledger's financial schema based on what it finds. Only exceptions are created (in the accounting schema).

---

## NOTIFICATION PROCESSING ARCHITECTURE

Notifications are created by the Intelligence & Automation Module and delivered to users within the platform.

### Notification Pipeline

```
1. Event consumed by Intelligence Module (warning or critical priority)
2. Notification record created (intelligence.notification_records, status: unread)
3. User retrieves notifications via GET /api/v1/notifications
4. Notification interactions (read, dismiss) recorded as audit entries
```

### Notification Channels (v1)

- **In-platform:** Notification badge and Notification Centre (real-time via polling or future WebSocket)

### Future Notification Channels

- **Email:** Via email service adapter (notification_queue → delivery worker → email provider)
- **Push notifications:** Via mobile push service adapter (future, when native mobile app exists)

### Notification RBAC

- CEO: receives notifications for all company events
- PM: receives notifications scoped to assigned jobs only
- Worker: no notification access
- Client Portal User: no notification access

---

## FILE PROCESSING ARCHITECTURE

Workers upload photos and documents as part of reports and expense submissions.

### File Storage

Files are stored in a **cloud object storage** service (e.g. AWS S3 or compatible):
- Upload endpoint returns a pre-signed upload URL
- Client uploads directly to storage using the pre-signed URL
- File metadata (filename, size, content type, storage key, uploaded_by, uploaded_at) stored in the database
- Files are never stored in the database (BYTEA/BLOB columns are forbidden)

### File Access Control

- Files are accessed via signed URLs with a short TTL (15 minutes)
- Signed URLs are generated on demand by the backend and returned to the authenticated client
- Files belonging to one tenant are never accessible to another tenant (storage paths are namespaced by `company_id`)

### Document Sharing for Client Portal

Documents shared with clients (`portal.document_share_records`) generate portal-scoped signed URLs. Only documents explicitly shared may be accessed by the portal user.

---

## AUDIT PROCESSING ARCHITECTURE

Audit entries are written synchronously within the same transaction as the triggering operation.

### Audit Write Path

```
Application Layer use case executes
  ↓
State change committed to database
  ↓ (same transaction)
AuditWriter.append(auditEntry) called
  ↓
audit.audit_entries record inserted
  ↓
Transaction committed
```

If the audit write fails, the entire transaction rolls back. This ensures there is no approved financial record without a corresponding audit entry.

### Audit Query Path

Audit entries are queried via the `AuditQueryService`:
- Filter by: company_id (mandatory), actor_id, entry_type, source_object_id, job_id, date range
- Paginated (cursor-based)
- Read-only (no update or delete operations exist)

### Audit Table Permissions

The database role used by the application has:
- INSERT permission on `audit.audit_entries`
- SELECT permission on `audit.audit_entries`
- No UPDATE permission
- No DELETE permission

This is enforced at the database permission level, not only in application code.

---

## FUTURE SCALING ARCHITECTURE

The current architecture supports a single application server and worker process. The following scaling paths are available without architectural redesign:

### Horizontal API Scaling

- Multiple API Server processes behind a load balancer
- Session state is JWT-based (stateless) — no session affinity required
- Rate limiting moves to Redis (shared across instances)

### Horizontal Worker Scaling

- Multiple Worker processes with distributed locking for scheduled jobs (Redis advisory locks)
- Queue records use optimistic locking to prevent duplicate processing

### Read Replica

- PostgreSQL read replica for read-heavy endpoints (analytics, reporting, audit queries)
- Write operations continue to primary; read operations route to replica

### Queue Migration

- PostgreSQL queue replaced by RabbitMQ or AWS SQS for higher throughput
- No application logic change required (queue interface is swappable)

### Module Extraction to Microservices

- When a single module needs independent scaling or isolation (e.g. Document Intelligence in future)
- Extract module with its schema to a separate database and service
- Replace internal function calls with HTTP/gRPC
- Replace internal event bus with message broker
- Module boundaries are already microservice-ready
