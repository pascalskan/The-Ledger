# THE LEDGER — BACKEND OBSERVABILITY & AUDIT ARCHITECTURE

Version: 1.0
Status: AUTHORITATIVE
Date: June 4, 2026
Authority: Backend Architecture Definition Phase

---

## PURPOSE

This document defines The Ledger's observability strategy: logging, audit architecture, operational telemetry, system monitoring, exception monitoring, integration monitoring, automation monitoring, and financial mutation monitoring. The central question this document answers is: how is platform-wide traceability preserved?

---

## OBSERVABILITY PRINCIPLES

1. **Every financially relevant action is auditable** — Audit Doctrine is absolute
2. **No silent financial mutations** — If a financial record is created, voided, or adjusted, there is always a named actor, a timestamp, and a preserved reason
3. **No silent failures** — Every background worker failure, sync failure, and automation failure produces an observable record
4. **Traceability is complete** — Any financial record can be traced back to its originating operational event through the audit trail
5. **Observability does not compromise security** — Sensitive financial amounts are not written to general-purpose application logs

---

## LOGGING STRATEGY

### Log Levels

| Level | Used For |
|---|---|
| ERROR | Unhandled exceptions; 5xx responses; background worker fatal failures |
| WARN | Expected failures requiring attention (sync failures, reconciliation exceptions, rate limit hits) |
| INFO | Request/response lifecycle (method, route, status code, duration); background job completions |
| DEBUG | Detailed request context (validation results, query execution); disabled in production by default |

### Log Structure

All logs are structured JSON:

```json
{
  "level": "INFO",
  "timestamp": "2026-06-04T12:34:56.789Z",
  "requestId": "req_01j9xyz...",
  "companyId": "company_abc",
  "userId": "user_xyz",
  "method": "POST",
  "path": "/api/v1/review-centre/submissions/ts-123/approve",
  "statusCode": 201,
  "durationMs": 45,
  "message": "TimesheetApproved"
}
```

### What Is NOT Logged

- JWT tokens or refresh tokens
- Passwords or password hashes
- Financial amounts in application logs (these belong in the audit log, not the application log)
- Full request/response bodies in production (security risk; performance overhead)
- Personal data beyond user ID

### Log Correlation

Every HTTP request receives a `requestId` (UUID, generated at the API Layer, propagated through all layers). All log entries within a request lifecycle include the `requestId` for correlation.

Background jobs use a `jobId` for equivalent correlation.

---

## AUDIT ARCHITECTURE

### Position in the System

The audit trail is the primary accountability mechanism for The Ledger. It is:
- Separate from the application log (different store, different purpose)
- Append-only with no delete or update operations
- Permanent (no retention expiry)
- Scoped to tenant (`company_id` on every entry)

### What Triggers an Audit Entry

Every operation that:
- Changes the state of a financial record (create, void, adjust)
- Changes the approval state of a submission
- Changes the lifecycle state of a job
- Changes user roles or classifications
- Changes automation or governance configuration
- Accesses financial data in a Read Centre (executive command centre views, report generation)
- Creates or deactivates a client portal account
- Executes any automation or scheduled action

### Audit Architecture Details

See BACKEND_DATA_ARCHITECTURE.md for the full audit entry structure and storage requirements.

### Audit Trail Completeness

The audit trail must be able to answer:

| Question | Answered By |
|---|---|
| Who approved this timesheet? | `timesheet_approved` entry: `actor_id`, `occurred_at` |
| What was the financial record value before void? | `correction_approved` entry: `previous_value` |
| When was this job cancelled and by whom? | `job_cancelled` entry: `actor_id`, `occurred_at` |
| Which financial records were synced in a given period? | `accounting_sync_succeeded` entries |
| Has this automation rule ever triggered an approval? | Query automation audit entries for forbidden action types |
| Was this client request ever escalated? | `client_request_escalated` entry |

---

## OPERATIONAL TELEMETRY

Operational telemetry is collected to understand platform health and usage:

### Request Metrics

- Request count per route (rate)
- Request latency per route (p50, p95, p99)
- Error rate per route
- Rate limit hit count

### Business Metrics

- Submissions created per day
- Submissions approved / rejected per day (by type)
- Financial records created per day (by type)
- Sync records queued / completed / failed per day
- Active jobs count
- Open exceptions count

### Infrastructure Metrics

- Database query count and latency (by query type)
- Database connection pool utilisation
- Background worker queue depth (per queue)
- Background worker processing latency
- Outbox delivery latency (event_outbox age of undelivered records)

**Tooling:** Prometheus-compatible metrics endpoint (`/metrics`), collected by a metrics agent and visualised in Grafana (or equivalent). In v1, a simpler approach (e.g. structured logging with log-based metrics) is acceptable.

---

## SYSTEM MONITORING

### Health Check Endpoint

`GET /health` — returns 200 if the API server is running and the database is reachable.

`GET /health/detailed` — returns per-component health status:
- Database connectivity
- Worker process connectivity
- Event outbox: count of records pending for > 1 minute
- Sync queue: count of records pending for > 1 hour

### Alerting Triggers (Operational)

| Condition | Severity | Action |
|---|---|---|
| API error rate > 5% over 5 minutes | HIGH | Alert on-call |
| Database connection failures | CRITICAL | Alert on-call |
| Outbox delivery failures > 10 records | HIGH | Alert on-call |
| Worker process not running | CRITICAL | Alert on-call |
| Scheduled job missed execution | MEDIUM | Alert, create automation audit entry |

---

## EXCEPTION MONITORING

Unhandled exceptions in the application are captured and forwarded to an exception monitoring service.

**Exception payload includes:**
- Stack trace
- Request context (requestId, route, method)
- User context (userId, companyId — never sensitive data)
- Environment context (version, deployment)

Exception monitoring is separate from the application log. It is the triage tool for development and operations teams.

**Integration:** Sentry or equivalent (selected at implementation time).

---

## INTEGRATION MONITORING

Accounting integration is the primary external dependency. Integration health requires dedicated monitoring.

### Sync Health Metrics

- Sync records created per period
- Sync success rate per provider
- Sync failure count per provider
- Average sync latency per provider
- Retry queue depth per provider

### Sync Failure Alerting

| Condition | Severity |
|---|---|
| Sync failure rate for a provider > 10% in 1 hour | HIGH |
| Sync record stuck in `syncing` state > 30 minutes | HIGH |
| Provider API returns 401 (credentials expired) | CRITICAL |
| Provider API rate limit exceeded | MEDIUM |

All sync failures produce:
1. A `SyncRecord` with status `failed` in the `accounting.sync_records` table
2. An `AccountingSyncFailed` domain event
3. An in-platform notification to the CEO (via Intelligence Module)
4. A structured log entry at WARN level

### Reconciliation Health

- Reconciliation runs completed per period
- Exceptions created per run (by type: matched, unmatched, missing)
- Exception resolution rate
- Open exception count by age

---

## AUTOMATION MONITORING

All automation and workflow execution is observable:

### Automation Audit Trail

Every automation evaluation, whether it produces an action or not, creates an `automation_execution_audit` record:
- Rule ID
- Trigger event type
- Evaluation result (matched / not matched)
- Actions triggered (informational only)
- Actor: system (not a user)
- Timestamp

### Forbidden Action Monitoring

If an automation evaluation ever attempts a forbidden action (`approve_report`, `bypass_review_centre`, etc.), the attempt is:
1. Blocked immediately
2. Written to the automation audit log as `forbidden_action_attempted`
3. A governance alert is created (HIGH severity)
4. The automation rule is flagged for governance review

This monitoring exists as a defence-in-depth mechanism even though the engine blocks forbidden actions before execution.

### Scheduler Monitoring

- Scheduled jobs fired vs. expected per period
- Missed scheduled executions (alert if cron expression fires but no job is created)
- Scheduled job processing latency

---

## FINANCIAL MUTATION MONITORING

Financial mutations are the most sensitive operations on the platform. They receive dedicated monitoring.

### Financial Mutation Metrics

- Financial records created per day (by type)
- Void records created per day
- Adjustment records created per day
- Records awaiting sync (by age)

### Financial Mutation Alerting

| Condition | Severity |
|---|---|
| Financial record created without `approved_by` (should never happen) | CRITICAL |
| Financial record updated (content fields — should never happen) | CRITICAL |
| Audit entry missing for a financial mutation (should never happen) | CRITICAL |
| Void/adjustment created without CEO approval reference | CRITICAL |

The CRITICAL conditions above represent platform invariant violations. They should never occur if the application is correct, but are monitored as a final safety net.

---

## HOW PLATFORM-WIDE TRACEABILITY IS PRESERVED

The Ledger preserves complete traceability through the combination of four systems:

```
1. AUDIT LOG (audit.audit_entries)
   → Who did what, to which record, when, in which job context
   → Preserved for every financially relevant action
   → Append-only, permanent, tenant-scoped

2. EVENT LOG (intelligence.event_log)
   → What domain events occurred, when, from which module
   → Cross-module event history
   → Append-only, permanent, tenant-scoped

3. APPLICATION LOG
   → HTTP request/response lifecycle
   → Background job execution
   → Correlation via requestId / jobId
   → Operational, not financial — financial details excluded

4. EXCEPTION MONITORING
   → Unhandled errors captured and alerted
   → Prevents silent failures from hiding traceability gaps

The combination of these four systems means:
- Any financial record can be traced to its approval event (audit log)
- Any approval event can be traced to its submission (audit log)
- Any submission can be traced to the shift/job context (audit log + event log)
- Any cross-module event propagation can be traced (event log)
- Any silent failure is captured (exception monitoring + application log)
```

Traceability is a property of the system design, not an afterthought. It is built into every write operation in the Application Layer.
