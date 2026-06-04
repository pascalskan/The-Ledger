# THE LEDGER — BACKEND LAYERING ARCHITECTURE

Version: 1.0
Status: AUTHORITATIVE
Date: June 4, 2026
Authority: Backend Architecture Definition Phase

---

## PURPOSE

This document defines the layering strategy for The Ledger backend: the four layers, their responsibilities, allowed interactions, forbidden interactions, and the dependency direction between layers.

---

## LAYERING MODEL

The Ledger uses a four-layer architecture derived from Domain-Driven Design. The layers are:

```
API Layer
  ↓
Application Layer
  ↓
Domain Layer
  ↓
Infrastructure Layer
```

Dependency direction is strictly downward. No lower layer may import from or depend upon a higher layer. The Domain Layer has zero knowledge of infrastructure or transport.

---

## LAYER 1 — DOMAIN LAYER

### Position

Innermost layer. No dependencies on other layers.

### Responsibilities

- Define domain entities and aggregate roots
- Define value objects (e.g. Money, DateRange, Classification)
- Define domain events (e.g. `TimesheetApproved`, `ExpenseRejected`)
- Enforce domain invariants (lifecycle rules, approval constraints, financial immutability)
- Define aggregate boundaries and consistency rules
- Define repository interfaces (contracts only — not implementations)

### What It Contains

- Entity classes (Job, TimesheetSubmission, ExpenseEntry, etc.)
- Value Object classes
- Domain Event definitions
- Aggregate Root classes with invariant enforcement methods
- Repository interfaces (abstract contracts)
- Domain Service interfaces (for multi-aggregate operations)
- Domain exceptions (e.g. `SubmissionAlreadyApproved`, `FinancialRecordImmutableError`)

### Allowed Interactions

- May reference other domain entities and value objects within the same bounded context
- May define and raise domain events
- May call repository interfaces (not implementations)

### Forbidden Interactions

- Must not import from Application, API, or Infrastructure layers
- Must not reference HTTP concepts, database libraries, ORMs, or external APIs
- Must not reference framework-specific types
- Must not perform I/O of any kind

### Dependency Direction

Domain Layer → nothing (it is the foundation)

---

## LAYER 2 — APPLICATION LAYER

### Position

Sits above the Domain Layer. Orchestrates use cases.

### Responsibilities

- Implement application services (use cases / commands / queries)
- Coordinate domain objects to fulfil a single business operation
- Handle transactional boundaries (begin/commit/rollback)
- Publish domain events to the event bus after successful state changes
- Enforce the approval workflow sequence (submission → review → approval → normalization)
- Enforce RBAC rules (validate that the acting user has permission to perform the operation)
- Enforce multi-tenant scoping (verify that all accessed records belong to the acting tenant)
- Return application DTOs (not domain entities directly)

### What It Contains

- Command handlers (e.g. `ApproveTimesheetCommand`, `CreateJobCommand`)
- Query handlers (e.g. `GetJobMiniLedgerQuery`, `ListPendingSubmissionsQuery`)
- Application services (orchestrators of multiple commands/queries)
- Application DTOs (input and output data shapes)
- Authorization checks (e.g. `assertUserCanApproveExpense`)
- Transaction management (using Unit of Work pattern)
- Event dispatcher calls (after successful domain state changes)

### Allowed Interactions

- May import from Domain Layer (entities, value objects, events, repository interfaces)
- May call infrastructure implementations through injected interfaces
- May call other application services within the same bounded context
- May emit domain events via event bus interface

### Forbidden Interactions

- Must not import HTTP request/response types
- Must not contain SQL or ORM query logic
- Must not call external APIs directly (route through infrastructure interfaces)
- Must not call across bounded context application layers directly (use events or well-defined contracts)
- Must not bypass the Review Centre sequence

### Dependency Direction

Application Layer → Domain Layer only

---

## LAYER 3 — INFRASTRUCTURE LAYER

### Position

Sits below the Application Layer. Implements external concerns.

### Responsibilities

- Implement repository interfaces defined in the Domain Layer
- Manage database connections and query execution (using Drizzle ORM)
- Implement the event bus (publish events to internal subscribers, future message queues)
- Implement external API clients (accounting providers: QuickBooks, Xero, FreshBooks, Zoho)
- Implement email/notification delivery
- Implement file storage (document uploads, export artifacts)
- Implement cache (Redis or in-memory for read models)
- Implement background job queues

### What It Contains

- Repository implementations (e.g. `PostgresJobRepository`)
- Drizzle ORM schema definitions
- Database migration management
- Event bus implementation (publish/subscribe)
- External API clients (accounting provider adapters)
- Email service adapter
- File storage adapter
- Queue/worker implementations
- Cache adapter
- ORM model mappers (domain entity ↔ database record)

### Allowed Interactions

- May import from Domain Layer (repository interfaces, domain events)
- May use database libraries, HTTP clients, external SDKs
- May emit events to the event bus

### Forbidden Interactions

- Must not contain business logic
- Must not import from Application or API layers
- Must not enforce domain invariants
- Must not call domain methods that enforce invariants (it only persists results)

### Dependency Direction

Infrastructure Layer → Domain Layer only (for interfaces it implements)

---

## LAYER 4 — API LAYER

### Position

Outermost layer. The entry point for all inbound requests.

### Responsibilities

- Define HTTP route handlers (Express routers)
- Validate inbound request payloads (using Zod schemas)
- Extract and verify authentication tokens (JWT validation middleware)
- Resolve tenant context from JWT claims
- Resolve user identity and role from JWT claims
- Call application layer use cases (command/query handlers)
- Map application layer DTOs to HTTP response payloads
- Handle and format error responses (domain exceptions → HTTP status codes)
- Enforce rate limiting
- Enforce idempotency keys where required

### What It Contains

- Express route definitions
- Request validation middleware (Zod)
- Authentication middleware (JWT verification)
- Tenant resolution middleware
- RBAC middleware (coarse-grained role check; fine-grained check happens in Application Layer)
- Error handling middleware (global error handler)
- Request/response DTO types
- Route-level documentation annotations (for OpenAPI generation)

### Allowed Interactions

- May import from Application Layer (commands, queries, DTOs)
- May call authentication infrastructure services
- May call request validation utilities

### Forbidden Interactions

- Must not contain business logic
- Must not call Domain Layer directly (only through Application Layer)
- Must not call Infrastructure Layer directly (except auth token validation)
- Must not bypass Application Layer authorization checks

### Dependency Direction

API Layer → Application Layer only

---

## CROSS-CUTTING CONCERNS

The following concerns span all layers. They are implemented in infrastructure but invoked at multiple levels.

### Audit Logging

- Triggered from the Application Layer after every financially relevant operation
- Written to an append-only audit log table via the Infrastructure Layer
- Never modifiable after creation
- Includes: who, what, when, source_object_id, destination_object_id, external_reference (job_id)

### Tenant Isolation

- Tenant context (`company_id`) is resolved in the API Layer from the JWT
- Injected into all Application Layer use cases as a required parameter
- All repository queries in the Infrastructure Layer include a `company_id` WHERE clause
- Missing `company_id` in any query is a runtime error, not a silent bypass

### Event Publishing

- Domain events are raised within the Domain Layer (on aggregate state changes)
- Application Layer dispatches them via the event bus interface after successful persistence
- Events are published in the same database transaction as the state change (transactional outbox pattern)
- Event consumers are Infrastructure Layer subscribers

### Financial Record Immutability

Enforced at two levels:
1. Domain Layer: aggregate root raises `FinancialRecordImmutableError` if content mutation is attempted
2. Infrastructure Layer: repository implementation does not expose update methods for financial record content fields

### Approval Gate

The approval gate — the boundary between pending submission and financial reality — is enforced in the Application Layer:
- `ApproveSubmissionCommand` is the only path to `FinancialNormalizationService`
- `FinancialNormalizationService` requires a valid approval reference
- Any call to create financial records without an approval reference throws `ApprovalRequiredError`

---

## LAYERING SUMMARY

```
┌─────────────────────────────────────────────────────────────┐
│  API LAYER                                                   │
│  HTTP routes · JWT auth · Zod validation · Error formatting  │
├─────────────────────────────────────────────────────────────┤
│  APPLICATION LAYER                                           │
│  Use cases · RBAC · Tenant scoping · Event dispatch · Audit  │
├─────────────────────────────────────────────────────────────┤
│  DOMAIN LAYER                                                │
│  Entities · Aggregates · Invariants · Domain Events · Rules  │
├─────────────────────────────────────────────────────────────┤
│  INFRASTRUCTURE LAYER                                        │
│  PostgreSQL · Drizzle ORM · Event Bus · External APIs · Queue│
└─────────────────────────────────────────────────────────────┘

Dependency direction: downward only. No layer imports from above.
```
