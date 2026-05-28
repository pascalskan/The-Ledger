# The Ledger — RBAC Architecture

# Overview

The Ledger uses a centralized Role-Based Access Control (RBAC) architecture.

Permissions are abstracted into reusable utilities rather than embedded directly inside UI components.

This allows:

* scalable authorization,
* future backend enforcement,
* consistent access control,
* and simplified auditing.

---

# Core RBAC Components

## User

Represents authenticated actors within the system.

Users contain:

* id
* companyId
* roleIds

---

## Role

Represents permission collections.

Roles contain:

* name
* description
* permissions

---

## PermissionKey

Represents atomic permission capabilities.

Examples:

* view_jobs
* edit_jobs
* manage_workers
* manage_invoicing
* assign_roles

---

# Permission Infrastructure

## Permission Helpers

Located in:

```text
client/src/lib/permissions/
```

Includes:

* permissions.ts
* roleGuards.ts
* jobPermissions.ts
* reviewPermissions.ts
* financialPermissions.ts

---

# Role Guards

Reusable helpers:

* isAdmin
* isCEO
* isProjectManager
* isWorker
* isClient

---

# Job Permissions

Supports:

* canViewJob
* canEditJob
* canAssignWorkers
* canManageJobFinancials

---

# Review Permissions

Supports:

* canViewReviewItem
* canApproveReview
* canRejectReview
* canRequestCorrection

---

# Financial Permissions

Supports:

* canViewFinancials
* canManageInvoices
* canManageExpenses
* canManageIntegrations

---

# Architectural Goals

The RBAC system is designed for future backend parity.

Frontend permissions are treated as:

* UX enforcement,
* visibility control,
* workflow gating.

Future backend APIs will enforce the same permission rules server-side.
