# THE LEDGER — BACKEND MULTI-TENANCY ARCHITECTURE

Version: 2.0
Status: AUTHORITATIVE
Date: June 4, 2026
Authority: Backend Architecture Refinement Pass

---

## CHANGE LOG

| Version | Date | Changes |
|---|---|---|
| 1.0 | June 4, 2026 | Initial multi-tenancy architecture |
| 2.0 | June 4, 2026 | Refinement pass: Company (Tenant) moved to dedicated Tenant Context/Module; provisioning routed through Tenant Module; tenant suspension triggers Identity Module session revocation; TenantContext is the primary tenancy source-of-truth |

---

## PURPOSE

This document defines The Ledger's multi-tenancy model: tenant ownership, data isolation, provisioning, cross-tenant restrictions, and visibility boundaries for each user type.

---

## TENANCY MODEL

### One Company = One Tenant

In The Ledger, a **Company** is the unit of tenancy. Each company using The Ledger is a tenant. All data within the platform belongs to a company. No data exists without a company owner.

The `company_id` field is present on every record in every module schema.

### Tenancy Strategy: Row-Level Isolation

The Ledger uses **row-level multi-tenancy**:
- All tenants share a single database instance
- All tenants share the same table schemas
- Every table includes a `company_id` column
- Every query is scoped to the authenticated company's `company_id`

**Why row-level over schema-per-tenant:**
- Schema-per-tenant requires dynamic schema management and migration coordination per tenant
- Row-level is simpler to maintain at the scale of a pre-launch SaaS product
- Row-level supports PostgreSQL's Row Level Security (RLS) as an additional isolation layer
- Migrations run once, apply to all tenants

**Why not database-per-tenant:**
- Database-per-tenant requires connection pool management per tenant
- Disproportionate operational overhead for current scale
- Can be adopted later for enterprise/high-isolation tiers if required

---

## TENANT OWNERSHIP

The **Tenant Module** (not the Identity Module) is the authoritative owner of tenancy:

- `tenant.companies` — the company record; lifecycle state; metadata
- `tenant.subscriptions` — plan and subscription details
- `tenant.configurations` — per-tenant feature flags, currency, notification preferences

The Identity Module owns `identity.users` — the users who belong to a tenant. It depends on the Tenant Module to validate that a company is active before issuing authentication tokens.

**The `company_id` on every record in every schema is a foreign key to `tenant.companies.company_id`.**

---

## TENANT PROVISIONING MODEL

### Creating a Tenant

Tenants are provisioned through the Tenant Module:

```
1. Admin calls TenantModule.provisionTenant(companyData)
   → Creates tenant.companies record (status: active)
   → Creates tenant.configurations record (default configuration)
   → Publishes TenantProvisioned event
2. Identity Module consumes TenantProvisioned event
   → Creates initial CEO user (identity.users, role = ceo)
3. CEO receives onboarding email with credentials
4. CEO logs in (Tenant Module validates tenant is active; Identity Module issues JWT)
5. CEO configures the company via TenantModule.updateTenantConfiguration()
```

In v1, tenant provisioning is a manual or semi-automated admin operation, not self-service. Self-service signup is a future feature.

### Tenant Lifecycle

| State | Description |
|---|---|
| `active` | Fully operational |
| `suspended` | Access blocked; data retained; TenantSuspended event triggers Identity to revoke all sessions |
| `terminated` | Access blocked; data deletion scheduled; all sessions revoked |

Tenant suspension and termination are administrative operations not accessible to any in-tenant user including the CEO.

### Tenant Configuration

Each company has a configuration record that includes:
- Company name, address, contact details
- Default currency
- Accounting provider preferences
- Notification preferences
- Feature flags (for phased rollouts)

---

## DATA ISOLATION REQUIREMENTS

### Enforced at Every Layer

Tenant isolation is a hard requirement enforced at multiple levels:

**Layer 1 — JWT Claims**
The `company_id` claim in the JWT is the tenant anchor. Every authenticated request carries a verified `company_id`. This claim cannot be forged without the signing key.

**Layer 2 — Application Layer (mandatory)**
Every use case receives `companyId` as an explicit required parameter. Use cases pass `companyId` to every repository call. A use case that omits `companyId` is a compile-time error (TypeScript type requirement).

**Layer 3 — Repository Layer**
All repository query methods include a `WHERE company_id = $1` clause. Repository implementations that do not scope to `company_id` are forbidden by convention and linting rules.

**Layer 4 — PostgreSQL Row Level Security (defence-in-depth)**
Row Level Security policies are defined on all tables to enforce `company_id` isolation at the database engine level. Even if an application bug omits a `company_id` filter, RLS prevents cross-tenant data access.

### Cross-Tenant Data Access

Cross-tenant data access is unconditionally forbidden. No user, including platform administrators, may access one company's data while authenticated as another company's user.

Platform administrators use a separate administrative console (not the primary platform) that operates outside the tenant JWT model.

---

## CROSS-TENANT RESTRICTIONS

| Scenario | Status |
|---|---|
| Sharing jobs between companies | Not supported |
| Sharing workers between companies | Not supported |
| Sharing stock or assets between companies | Not supported |
| Accounting provider shared across tenants | Each company has its own provider configuration |
| Client portal user accessing another company's data | Impossible — portal JWT contains client_id scoped to one company |
| Demo company data appearing in production company context | Forbidden (Domain Invariant #24) |

---

## CLIENT VISIBILITY BOUNDARIES

Within a tenant (company), clients are further scoped by their relationship to sites and jobs.

**Client Portal User sees:**
- Sites that belong to their `client_id`
- Jobs at those sites (status only — not full operational detail)
- Documents explicitly shared with them via `portal.document_share_records`
- Invoice status for invoices linked to their jobs
- Their own submitted client requests

**Client Portal User never sees:**
- Internal access notes on sites (access_notes field is excluded from portal projections)
- Worker identities beyond name and role
- Financial record values (labour costs, expense amounts)
- Other clients' data
- Submission details (only outcome: pending/approved/rejected)
- Audit trail entries

Enforcement: `PortalDataScopeService` builds all portal data projections with explicit column exclusions and `client_id` filtering.

---

## WORKER VISIBILITY BOUNDARIES

Workers are scoped to jobs they are assigned to.

**Worker sees:**
- Jobs they are currently assigned to (basic details: location, schedule, site address)
- Their own past and current submissions (status: pending / approved / rejected)
- Site address and access notes for jobs they are assigned to
- Their own shift history

**Worker never sees:**
- Financial values from any approved record
- Payroll record values
- Other workers' submissions
- Client details beyond job/site context
- Audit trail entries
- Automation or governance configuration

Enforcement: All worker-facing API endpoints project worker-specific views with financial fields excluded.

---

## FINANCIAL VISIBILITY BOUNDARIES

Financial data is visible only within the tenant, and only to roles with financial access.

| Financial Data | CEO | PM | Worker | Client |
|---|---|---|---|---|
| TimesheetEntry amounts | Full access (company-wide) | Own jobs only | Hidden | Hidden |
| ExpenseEntry amounts | Full access (company-wide) | Own jobs only | Outcome only | Hidden |
| InventoryMutation values | Full access (company-wide) | Own jobs only | Hidden | Hidden |
| PayrollRecord values | Full access (company-wide) | Hidden | Hidden | Hidden |
| Invoice line item amounts | Full access (company-wide) | Own jobs only | Hidden | Invoice total only |
| Sync records | Full access | Hidden | Hidden | Hidden |
| Reconciliation records | Full access | Hidden | Hidden | Hidden |

Financial data never crosses tenant boundaries. Financial data for Company A is not visible to any user of Company B.

---

## AUDIT VISIBILITY BOUNDARIES

The audit trail is visible only to the CEO within a tenant.

- CEO: full audit trail for all company operations
- PM: limited audit view (can see audit entries for their own approval actions)
- Worker: no audit visibility
- Client Portal User: no audit visibility

Cross-tenant audit access is not supported. A platform administrator audit view is a separate concern from in-tenant audit visibility.

---

## TENANT ISOLATION ENFORCEMENT CHECKLIST

For every new API endpoint, application service, or repository method added to the platform, the following must be true:

- [ ] `company_id` is extracted from the JWT and passed to the use case
- [ ] The use case passes `company_id` to every repository call
- [ ] The repository WHERE clause includes `AND company_id = $1`
- [ ] RLS policy exists on the target table
- [ ] No hardcoded company IDs in any query
- [ ] Test: attempt to access a record belonging to a different company_id — expect 404 or 403, never the record
