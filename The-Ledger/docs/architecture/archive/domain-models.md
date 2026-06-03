# The Ledger — Domain Models

# Core Philosophy

All domain entities are centrally defined within:

```text
client/src/types/
```

These types represent the canonical business model used across:

* frontend pages,
* components,
* RBAC,
* scheduling,
* and future backend APIs.

---

# Core Entities

# Job

Represents an operational work item or contracted engagement.

Core properties include:

* scheduling
* location
* labor allocation
* equipment allocation
* financial tracking
* operational status

Key relationships:

* Client
* Worker
* Equipment
* ReviewItem

---

# Worker

Represents operational personnel.

Workers contain:

* identity information
* operational status
* role assignments
* compliance documents

Workers are linked to:

* jobs
* permissions
* operational scheduling

---

# Client

Represents customer organizations or external entities.

Clients contain:

* relationship data
* billing information
* documentation
* operational notes

---

# User

Represents authenticated platform users.

Users are assigned:

* roleIds
* company ownership
* RBAC permissions

Users are distinct from Workers.

---

# Role

Represents RBAC role definitions.

Roles contain:

* permission collections
* business access scopes
* organizational hierarchy

Examples:

* Admin
* CEO
* Project Manager
* Worker
* Client

---

# ReviewItem

Represents operational submissions requiring review.

Examples:

* reports
* photos
* logs
* operational evidence

Review items support:

* approval workflows
* corrections
* operational auditing

---

# Financial Entities

Current financial structures include:

* job cost breakdowns
* estimated revenue
* operational forecasting
* margin calculations

Future phases will expand:

* invoicing
* payroll
* integrations
* budgeting
* procurement

---

# Domain Normalization Principles

The Ledger enforces:

* centralized shared typing
* reusable interfaces
* consistent property naming
* strict TypeScript compatibility

No page or component should define isolated duplicate domain models.
