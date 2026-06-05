# THE LEDGER — BACKEND AUTHENTICATION & AUTHORIZATION ARCHITECTURE

Version: 2.0
Status: AUTHORITATIVE
Date: June 4, 2026
Authority: Backend Architecture Refinement Pass

---

## CHANGE LOG

| Version | Date | Changes |
|---|---|---|
| 1.0 | June 4, 2026 | Initial auth architecture |
| 2.0 | June 4, 2026 | Refinement pass: Company ownership moved to Tenant Context; Identity Context owns Users/Auth/Roles/Permissions only; authentication flow updated to validate tenant active status via Tenant Module before issuing tokens |

---

## PURPOSE

This document defines The Ledger's identity model, authentication architecture, authorization architecture, RBAC model, permission resolution, and tenant-aware permission enforcement.

---

## IDENTITY MODEL

The Ledger has four distinct user types. Each has different authentication paths and access scopes.

| Identity Type | Auth Path | Scope |
|---|---|---|
| CEO | Primary platform auth (JWT) | Full company; all modules |
| Project Manager (PM) | Primary platform auth (JWT) | Scoped to assigned jobs and sites |
| Worker | Mobile/worker app auth (JWT) | Operational access only; own submissions |
| Client Portal User | Portal auth (separate JWT) | Own client's sites, jobs, documents, invoices |

---

## AUTHENTICATION ARCHITECTURE

### Primary Platform Authentication (CEO, PM, Worker)

**Mechanism:** JWT (JSON Web Tokens)

**Ownership Note:** Company (Tenant) is now owned by the Tenant Context, not the Identity Context. The authentication flow validates tenant active status via the Tenant Module before issuing tokens. A suspended tenant's users cannot authenticate.

**Flow:**

```
1. User submits email + password to POST /auth/login
2. Server validates credentials against identity.users table (bcrypt hash comparison)
2a. Server validates tenant status via Tenant Module: getTenantContext(companyId).status must be 'active'
2b. If tenant is suspended or terminated: return 403 (account suspended)
3. On success: issue Access Token + Refresh Token
4. Access Token: short-lived (15 minutes), signed with private key, contains identity claims
5. Refresh Token: long-lived (7 days), stored in identity.refresh_tokens table, sent as HTTP-only cookie
6. Client sends Access Token in Authorization: Bearer header on every request
7. On token expiry: client sends Refresh Token to POST /auth/refresh → new Access Token issued
8. Logout: Refresh Token revoked (deleted from identity.refresh_tokens)
```

**Access Token Claims:**

```json
{
  "sub": "<user_id>",
  "company_id": "<company_id>",
  "role": "ceo | pm | worker",
  "email": "<email>",
  "iat": <issued_at>,
  "exp": <expiry>
}
```

**Token Storage:**
- Access Token: stored in memory by client (never in localStorage)
- Refresh Token: HTTP-only, Secure, SameSite=Strict cookie

**Password Requirements:**
- Minimum 12 characters
- bcrypt with cost factor 12
- No plaintext passwords stored or logged

### Client Portal Authentication

**Mechanism:** Separate JWT (portal-scoped)

**Why separate:** Client portal users are not company employees. They have a different credential model, a different identity store (`portal.portal_accounts`), and a strictly limited access scope. Mixing them into the primary identity model risks scope confusion.

**Flow:**

```
1. Portal user submits email + password to POST /portal/auth/login
2. Server validates against portal.portal_accounts table
3. On success: issue Portal Access Token (short-lived, 15 minutes)
4. Portal Access Token contains: portal_id, client_id, company_id (of the company they are a client of)
5. All portal API routes validate the Portal Access Token and scope data to client_id
```

**Portal Token Claims:**

```json
{
  "sub": "<portal_account_id>",
  "client_id": "<client_id>",
  "company_id": "<company_id>",
  "role": "client",
  "iat": <issued_at>,
  "exp": <expiry>
}
```

### Multi-Factor Authentication (Future)

MFA is not in scope for v1. The authentication architecture should not prevent its addition. The identity model supports an `mfa_enabled` flag and a `mfa_secret` field on the user record as reserved fields for future implementation.

---

## AUTHORIZATION ARCHITECTURE

Authorization operates at two levels:

### Level 1 — Coarse-Grained RBAC (API Layer)

Role-based middleware applied at the route level.

```
Request arrives at route
  ↓
JWT middleware: validate token, extract claims
  ↓
Tenant middleware: extract company_id, validate it matches requested resource
  ↓
RBAC middleware: check role claim against required role for this route
  ↓
If checks pass: call Application Layer use case
  ↓
If checks fail: return 403 Forbidden
```

Route-level RBAC is a coarse filter. It rejects requests from roles that have no possibility of accessing a resource.

Examples:
- `DELETE /financial-controls/:id/approve` → requires `ceo` role
- `GET /review-centre/submissions` → requires `ceo` or `pm` role
- `POST /submissions/timesheet` → requires `worker` role
- `GET /portal/jobs` → requires `client` role (portal token)

### Level 2 — Fine-Grained Authorization (Application Layer)

Business-rule-level authorization enforced in use cases.

Examples:
- A PM may only approve submissions for jobs they are assigned to
- A PM may only approve expenses ≤ £500 and non-billable
- Only CEO may approve financial record corrections
- Only CEO may provision portal accounts
- Only CEO may retire assets
- Only CEO may cancel active jobs
- A PM may only view sites they are assigned to
- A Worker may only withdraw their own submissions

These checks occur in the Application Layer, not the API Layer. They involve querying assignment data and comparing against the acting user.

---

## RBAC ARCHITECTURE

### Roles

| Role | Description |
|---|---|
| `ceo` | Full platform access; all approvals; all financial operations |
| `pm` | Scoped to assigned jobs and sites; limited approval authority |
| `worker` | Operational access only; submit own work; no financial visibility |
| `client` | Portal access only; own client's data; read-only with limited request submission |

Roles are not hierarchical in a simple inheritance model. Each role has a distinct access profile. There is no "role A inherits all of role B" relationship.

### Role Assignment

- A user has exactly one role at a time
- Role is stored on the user record (`identity.users.role`)
- Only the CEO may change a user's role
- Role changes generate an audit entry (`user_role_changed`)

### Multi-Role (Future Consideration)

The architecture does not preclude a user holding multiple roles in v1. However, the frozen domain model does not specify multi-role scenarios. The implementation should treat role as a single enum for v1 but the data model should represent it as a relation (user → role) to allow multi-role in future without schema migration.

---

## PERMISSION MODEL

### Permission Resolution

Permissions are resolved dynamically at request time from:
1. The user's role (from JWT claims)
2. The user's job assignments (from operational schema — for PM scope enforcement)
3. The resource being accessed (from request parameters)

There is no static permission table in v1. Permissions are derived from role + context.

### Permission Matrix

| Permission | CEO | PM (own jobs) | Worker (own) | Client (portal) |
|---|---|---|---|---|
| View all jobs | Yes | No (own only) | No (assigned only) | No (own client only) |
| Create job | Yes | Yes | No | No |
| Cancel active job | Yes | No | No | No |
| Assign worker to job | Yes | Yes | No | No |
| Submit timesheet | No | No | Yes | No |
| Submit expense | No | No | Yes | No |
| Submit report | No | No | Yes | No |
| Submit issue | No | No | Yes | No |
| Approve timesheet (own jobs) | Yes | Yes | No | No |
| Approve expense ≤500 non-billable (own jobs) | Yes | Yes | No | No |
| Approve expense >500 or billable | Yes | No | No | No |
| Approve report (own jobs) | Yes | Yes | No | No |
| Reject any submission | Yes | Yes (own jobs) | No | No |
| Approve financial correction (void/adjust) | Yes | No | No | No |
| Request financial correction | No | Yes | No | No |
| View financial records | Yes | Yes (own jobs) | No | Invoice/summary only |
| Configure accounting provider | Yes | No | No | No |
| Provision portal account | Yes | No | No | No |
| Change worker classification | Yes | No | No | No |
| Retire asset | Yes | No | No | No |
| Approve stock write-off | Yes | No | No | No |
| Access Analytics Centre | Yes | No | No | No |
| Access Reporting Centre | Yes | No | No | No |
| Access Automation Centre | Yes | No | No | No |
| Access Event Monitor | Yes | No | No | No |
| Access Executive Command Centre | Yes | No | No | No |
| Submit client request | No | No | No | Yes |
| View assigned crew names | No | No | No | Yes |

### CEO Override

The CEO has platform-wide authority. All platform operations are available to a user with the `ceo` role, with no further scope restriction.

The CEO's permission check is: `role === 'ceo'`. No further scoping is applied.

---

## TENANT-AWARE PERMISSIONS

Every permission check includes the tenant context (`company_id`).

The resolution pattern for all permission checks:

```
1. Extract company_id from JWT claims
2. Extract resource ID from request parameters
3. Verify resource belongs to company_id (from database)
4. Apply role-based authorization to the verified resource
```

A user with a valid JWT for Company A can never access resources belonging to Company B, even if they know the resource ID. This is enforced at the Application Layer before any data is read.

---

## REVIEW CENTRE PERMISSIONS

The Review Centre enforces the approval authority model from the frozen domain:

| Submission Type | Can Approve | Cannot Approve |
|---|---|---|
| Worker Report | CEO, PM (own jobs) | Worker, Client |
| Timesheet | CEO, PM (own jobs) | Worker, Client |
| Expense ≤ £500, non-billable | CEO, PM (own jobs) | Worker, Client |
| Expense > £500 or billable | CEO only | PM, Worker, Client |
| Financial Record Correction | CEO only | PM, Worker, Client |
| Job Financial Closure | CEO only | PM, Worker, Client |

These rules are enforced in `ReviewCentreModule.ApprovalService.assertApproverAuthority()`.

---

## APPROVAL PERMISSIONS

Approval actions are gated at both the route level and application level:

- Route: `POST /review-centre/submissions/:id/approve` requires `ceo` or `pm` role
- Application: `ApproveSubmissionUseCase` calls `assertApproverAuthority(actorId, submissionId)` which checks:
  - Actor has the required role for this submission type
  - If PM: actor is assigned to the job the submission belongs to
  - If expense: amount and billable flag checked against PM approval threshold

---

## FINANCIAL PERMISSIONS

Financial visibility follows the principle of least privilege:

| Data | CEO | PM | Worker | Client |
|---|---|---|---|---|
| TimesheetEntry values | Full | Own jobs | Not visible (status only) | Not visible |
| ExpenseEntry values | Full | Own jobs | Not visible (status only) | Not visible |
| InventoryMutation values | Full | Own jobs | Not visible | Not visible |
| EquipmentUsageRecord values | Full | Own jobs | Not visible | Not visible |
| InvoiceLineItem values | Full | Own jobs | Not visible | Invoice status only |
| PayrollRecord values | Full | Not visible | Not visible | Not visible |
| Financial corrections | Full | Request only | Not visible | Not visible |
| Accounting sync records | Full | Not visible | Not visible | Not visible |

Workers see only submission outcome (pending / approved / rejected) — never financial values.

---

## AUTOMATION PERMISSIONS

Automation and governance operations require CEO role for all sensitive operations:

- Creating/editing automation rules: CEO only
- Setting governance status: CEO only
- Creating/editing workflows: CEO only
- Configuring automation schedules: CEO only
- Suspending or restricting automations: CEO only

Evaluation (read-only trigger assessment) is a system operation requiring no user-facing permission.

---

## SESSION SECURITY

- JWT access tokens are short-lived (15 minutes) to limit exposure if compromised
- Refresh tokens are rotated on each use (refresh token rotation)
- Revoked sessions cannot issue new access tokens
- All session revocations are audited
- Concurrent session management: multiple active sessions are permitted (multi-device); all sessions for a user can be revoked simultaneously

---

## PASSWORD RESET FLOW

1. User requests reset: POST /auth/password-reset (email provided)
2. System generates a time-limited reset token (1 hour expiry)
3. Token sent to registered email address
4. User submits new password with token: POST /auth/password-reset/confirm
5. Token validated, password updated, all existing sessions revoked
6. Audit entry: `password_reset_completed`

No password reset is possible without access to the registered email address.
