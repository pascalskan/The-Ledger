# THE LEDGER — BACKEND API ARCHITECTURE

Version: 1.0
Status: AUTHORITATIVE
Date: June 4, 2026
Authority: Backend Architecture Definition Phase

---

## PURPOSE

This document defines The Ledger's API architecture: philosophy, domain-driven API boundaries, public vs. internal APIs, versioning, error handling, validation, idempotency, pagination, and rate limiting strategies.

---

## API PHILOSOPHY

The Ledger API is:
- **Domain-driven** — API routes mirror bounded contexts, not database tables
- **Intention-expressing** — Routes express business actions (`POST /review-centre/submissions/:id/approve`), not generic CRUD (`PUT /submissions/:id`)
- **Doctrine-preserving** — No API route may bypass the approval workflow, the Review Centre, or the audit trail
- **Minimal surface** — Only expose what is needed; private module internals are never exposed through the API

---

## API TYPES

### 1. Primary Platform API

Used by the CEO, PM, and Worker clients (web app and mobile app).

**Base path:** `/api/v1/`

**Auth:** JWT Bearer token (primary platform token)

All routes require a valid, non-expired JWT. Routes additionally enforce RBAC middleware for role restrictions.

---

### 2. Client Portal API

Used by the Client Portal application.

**Base path:** `/portal/v1/`

**Auth:** Portal JWT Bearer token (portal-scoped token, separate from primary platform)

All portal routes enforce portal token validation and `client_id` scoping. Portal routes never expose internal operational data.

---

### 3. Internal Module API

Used for synchronous cross-module calls within the modular monolith.

**Not exposed via HTTP** — These are TypeScript function calls across module public API surfaces.

Not versioned. Changes are coordinated within the monorepo.

---

### 4. Accounting Integration API (Outbound)

Used by The Ledger to push approved financial records to downstream accounting providers.

These are outbound calls from The Ledger to external provider APIs. Each provider has an adapter (see BACKEND_SERVICE_ARCHITECTURE.md).

Not versioned externally by The Ledger — each provider's API version is managed per adapter.

---

### 5. Webhook API (Future)

Inbound webhooks from accounting providers (e.g. payment status updates, reconciliation data).

Not in scope for v1. Defined here as a future bounded API surface.

---

## DOMAIN-DRIVEN API BOUNDARIES

Each bounded context has a dedicated API namespace:

| Context | API Namespace |
|---|---|
| Identity & Access | `/api/v1/auth/` |
| Operational Core — Jobs | `/api/v1/jobs/` |
| Operational Core — Sites | `/api/v1/sites/` |
| Operational Core — Clients | `/api/v1/clients/` |
| Operational Core — Workers | `/api/v1/workers/` |
| Operational Core — Scheduling | `/api/v1/schedule/` |
| Review Centre | `/api/v1/review-centre/` |
| Financial Normalization | `/api/v1/financial/` |
| Inventory — Stock | `/api/v1/stock/` |
| Inventory — Assets | `/api/v1/assets/` |
| Client Portal (portal auth) | `/portal/v1/auth/` |
| Client Portal (portal data) | `/portal/v1/` |
| Client Requests | `/api/v1/client-requests/` |
| Accounting Integration | `/api/v1/accounting/` |
| Reconciliation | `/api/v1/reconciliation/` |
| Exception Resolution | `/api/v1/exceptions/` |
| Financial Controls | `/api/v1/financial-controls/` |
| Automation | `/api/v1/automation/` |
| Automation Governance | `/api/v1/governance/` |
| Automation Scheduler | `/api/v1/scheduler/` |
| Notifications | `/api/v1/notifications/` |
| Activity Feed | `/api/v1/activity-feed/` |
| Event Monitor | `/api/v1/events/` |
| Workflows | `/api/v1/workflows/` |
| Analytics | `/api/v1/analytics/` |
| Reporting | `/api/v1/reporting/` |
| Exports | `/api/v1/exports/` |
| Audit | `/api/v1/audit/` |

---

## VERSIONING STRATEGY

**Strategy: URL path versioning**

All API routes are versioned at the path level: `/api/v1/`, `/api/v2/`, `/portal/v1/`, etc.

**Rationale:**
- URL path versioning is explicit and predictable
- Clients (web, mobile) know exactly which version they are calling
- Breaking changes require a new version path
- Old versions can be deprecated with sunset headers before removal

**Breaking change definition:**
- Removing a field from a response
- Changing a field's type
- Removing an endpoint
- Changing the meaning of an existing field
- Changing authentication requirements

**Non-breaking changes** (do not require a new version):
- Adding new optional request fields
- Adding new response fields
- Adding new endpoints

**v1 is the only version on launch.** v2 is introduced only when a breaking change is required. v1 and v2 are maintained concurrently during a transition period with a published sunset date.

---

## ERROR HANDLING STRATEGY

All API errors return a consistent JSON error envelope:

```json
{
  "error": {
    "code": "SUBMISSION_ALREADY_APPROVED",
    "message": "This submission has already been approved and cannot be modified.",
    "details": {},
    "requestId": "req_01j9xyz..."
  }
}
```

### HTTP Status Code Mapping

| Status | Used When |
|---|---|
| 200 OK | Successful GET, PUT, PATCH |
| 201 Created | Successful POST that creates a resource |
| 204 No Content | Successful DELETE or action with no response body |
| 400 Bad Request | Request validation failure (Zod schema violation) |
| 401 Unauthorized | Missing or invalid JWT |
| 403 Forbidden | Valid JWT but insufficient role or permission |
| 404 Not Found | Resource does not exist or is not accessible to this tenant |
| 409 Conflict | State conflict (e.g. submission already approved, asset already assigned) |
| 422 Unprocessable Entity | Business rule violation (e.g. job cannot close with pending submissions) |
| 429 Too Many Requests | Rate limit exceeded |
| 500 Internal Server Error | Unhandled server error |
| 503 Service Unavailable | Downstream provider unavailable (accounting sync) |

### Error Codes

Domain-specific error codes are defined per module (e.g. `APPROVAL_REQUIRED`, `FINANCIAL_RECORD_IMMUTABLE`, `CEO_APPROVAL_REQUIRED`, `SUBMISSION_ALREADY_WITHDRAWN`). Error codes are documented as part of API documentation.

### Error Logging

All 5xx errors are logged with full stack trace and request context. 4xx errors are logged at DEBUG level (not ERROR — client errors are not server failures).

---

## VALIDATION STRATEGY

**Tool: Zod**

All inbound request payloads are validated with Zod schemas defined in the API Layer.

**Validation points:**
1. Route handler: validate request body and path parameters using Zod `parse()` (throws `ZodError` on failure)
2. Validation middleware: catch `ZodError`, format as 400 response with field-level error details
3. Application Layer: additional business-rule validation (e.g. checking amount > 0) occurs in use cases

**Validation response format (400):**

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Request validation failed.",
    "details": {
      "amount": ["Amount must be greater than 0"],
      "job_id": ["job_id is required"]
    }
  }
}
```

No business logic in Zod schemas. Zod validates shape and type. Business rules are enforced in the Application Layer.

---

## IDEMPOTENCY STRATEGY

Idempotency is required for:
- Approval operations (approving the same submission twice should be a no-op, not an error)
- Submission creation (worker submitting the same expense twice should not create duplicate records)
- Sync operations (queueing the same financial record for sync twice should not create duplicate sync records)
- Distribution delivery (attempting to deliver the same export twice should be idempotent)

**Mechanism: Idempotency Keys**

For state-changing operations (POST), clients may send an `Idempotency-Key` header (UUID).

Server behaviour:
1. Check if a response was already recorded for this `Idempotency-Key` + `company_id` combination
2. If yes: return the cached response without re-executing the operation
3. If no: execute the operation, store the response keyed on idempotency key (TTL: 24 hours)

For internal approval operations, the approval is guarded by checking the submission's current status:
- If already `approved`: return current state, do not create a duplicate financial record
- If already `rejected`: return appropriate error

---

## PAGINATION STRATEGY

All list endpoints that may return variable-length results use **cursor-based pagination**.

**Why cursor over offset:**
- Offset pagination is inconsistent when records are inserted during pagination
- Cursor pagination is consistent and performant for large result sets
- The audit log, event log, and submission lists may grow very large

**Cursor pagination format:**

Request:
```
GET /api/v1/review-centre/submissions?limit=50&cursor=eyJpZCI6Ijk4NzY1In0=
```

Response:
```json
{
  "data": [...],
  "pagination": {
    "nextCursor": "eyJpZCI6Ijk3NjU0In0=",
    "hasMore": true,
    "limit": 50
  }
}
```

The cursor is a base64-encoded JSON object containing the last item's sort key (typically `id` or `created_at + id`).

**Default page size:** 50
**Maximum page size:** 200

List endpoints that are always bounded (e.g. active jobs for a PM, which is a known small set) may omit pagination and return all results.

---

## RATE LIMITING STRATEGY

Rate limiting is applied per authenticated user (by `user_id` from JWT).

**Default limits:**

| Endpoint Category | Limit |
|---|---|
| Auth endpoints (login, refresh) | 10 requests / minute |
| Submission creation | 30 requests / minute |
| General read endpoints | 200 requests / minute |
| Report generation | 5 requests / minute |
| Export generation | 5 requests / minute |
| Accounting sync triggers | 10 requests / minute |

**Response on limit exceeded:**

```
HTTP 429 Too Many Requests
Retry-After: 30
X-RateLimit-Limit: 200
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 1717521600
```

**Implementation:** In-memory token bucket per user ID (Redis-backed for multi-instance deployments).

---

## API SECURITY STANDARDS

- All APIs served over HTTPS only
- CORS: restricted to known client origins (web app domain, mobile app)
- CSRF: mitigated by JWT Bearer auth (CSRF only affects cookie-auth) + SameSite cookie for refresh token
- SQL injection: prevented by parameterised queries via Drizzle ORM (no raw string interpolation)
- Input size limits: request body size capped at 1MB (configurable per endpoint for file upload routes)
- Sensitive fields: never log JWT tokens, passwords, or financial amounts in request/response logs

---

## OPENAPI DOCUMENTATION

All API routes are documented with OpenAPI 3.1 annotations.

Documentation is generated from route definitions and published at `/api/docs` (internal / development environments).

OpenAPI spec is the contract between the backend and frontend during integration.

Required for every endpoint:
- Route description
- Request body schema
- Path parameters
- Query parameters
- Response body schemas (200, 400, 401, 403, 404, 422)
- Required roles (documented in security scheme)
