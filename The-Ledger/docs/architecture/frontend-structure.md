# The Ledger — Frontend Structure

# Frontend Philosophy

The frontend architecture prioritizes:

* modularity,
* canonical typing,
* reusable utilities,
* and operational scalability.

The system is designed to evolve cleanly into enterprise-scale architecture.

---

# Current Structure

## Types

```text
client/src/types/
```

Contains canonical shared domain models.

Examples:

* job.ts
* auth.ts
* review.ts
* client.ts
* worker.ts

---

## Permissions

```text
client/src/lib/permissions/
```

Contains centralized authorization infrastructure.

---

## Mock Data Layer

```text
client/src/lib/mockData.ts
```

Acts as:

* transitional in-memory datastore,
* frontend simulation layer,
* development environment.

This layer will gradually be replaced during backend implementation.

---

## Pages

```text
client/src/pages/
```

Contains route-level application views.

Examples:

* dashboard
* jobs
* schedule
* review
* workers
* auth

---

## Components

```text
client/src/components/
```

Contains reusable UI systems.

Subsystems include:

* schedule
* layout
* review
* dashboard
* ui

---

# Architectural Principles

## Canonical Types

No duplicate domain interfaces should exist inside components or pages.

All entities should reference:

```text
client/src/types/
```

---

## Utility-Based Logic

Business logic should live in:

* reusable helpers,
* permission utilities,
* domain abstractions.

NOT inside rendering components.

---

## Strict Type Safety

TypeScript strictness is treated as infrastructure.

The system favors:

* discriminated unions
* reusable interfaces
* explicit contracts
* narrowed component props

---

# Future Evolution

Phase 2 will introduce:

* API abstraction
* service layers
* async state management
* backend persistence
* authentication infrastructure
* tenant-aware data loading
