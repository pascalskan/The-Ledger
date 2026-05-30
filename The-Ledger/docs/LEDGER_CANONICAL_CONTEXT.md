# THE LEDGER

## Canonical Context Document

Version: 3.0
Status: Active Source of Truth

---

# PROJECT IDENTITY

The Ledger is an operational intelligence, financial normalization, and business management platform designed for field service, maintenance, construction, facilities management, and trade businesses.

The Ledger is not accounting software.

The Ledger sits between operations and accounting systems.

Its purpose is to transform operational activity into structured, auditable, financially accurate data.

Supported downstream systems include:

* QuickBooks
* Xero
* FreshBooks
* Zoho Books
* Future accounting integrations

---

# CORE DOCTRINE

## Operational Data Is Financial Data

Every financial outcome originates from operational activity.

Poor operational data creates poor financial data.

The Ledger enforces:

Operational Event
→ Structured Submission
→ Review Center
→ Approval
→ Financial Normalization
→ Accounting Sync

Nothing becomes financially real until approved.

---

## Approval Doctrine

No operational event may directly create:

* Revenue
* Cost
* Payroll
* Invoice entries
* Inventory deductions
* Accounting mutations

until approved.

Approval is the central control mechanism of the entire platform.

---

## Audit Doctrine

Every financially relevant action must be traceable.

Required audit fields:

* Who
* What
* When
* Previous Value
* New Value
* Source Object
* Destination Object

No silent financial mutations.

---

## Job Mini-Ledger Doctrine

Every Job acts as a mini-ledger.

All financial events must be attributable to a Job.

Financial reporting is job-centric.

Jobs own:

* Revenue
* Labor Costs
* Material Costs
* Equipment Costs
* Profitability
* Exposure

---

# CURRENT PROJECT STATUS

Current development prioritizes:

1. Workflow validation
2. Financial normalization
3. Operational correctness
4. Review workflows

Backend implementation is intentionally deferred until workflow architecture is validated.

Do not treat backend incompleteness as project incompleteness.

---

# TECHNOLOGY STACK

Frontend

* React
* TypeScript
* Vite
* TailwindCSS
* shadcn/ui
* Wouter
* Zustand
* TanStack Query
* React Hook Form
* Zod

Development

* GitHub
* PyCharm
* Claude Desktop
* Filesystem MCP
* Playwright MCP

Backend (Future)

* Express
* PostgreSQL
* Drizzle ORM

---

# CURRENT IMPLEMENTATION STATE

The frontend prototype is highly advanced.

Implemented systems include:

* Authentication workflow (mock)
* RBAC
* Jobs
* Clients
* Workers
* Equipment
* Assets
* Stock
* Locations
* Scheduling
* Worker mobile application
* Review Center
* Financial Explorer
* Audit logging
* Offline queue architecture
* Synchronization engine
* Playwright doctrine testing

The system currently operates on a mock-data architecture to validate business logic before backend implementation.

---

# REVIEW CENTER DOCTRINE

The Review Center is the core control system of The Ledger.

All worker submissions enter Review Center before becoming financially relevant.

Submission Types:

* Timesheets
* Inventory Usage
* Equipment Usage
* Expenses
* Reports
* Uploads

Workflow:

Worker Submission
→ Review Center
→ Approve / Reject / Correct
→ Financial Normalization
→ Financial Explorer
→ Future Accounting Sync

Nothing bypasses Review Center.

---

# FINANCIAL NORMALIZATION ENGINE

Approved operational events become normalized financial records.

Current normalization targets:

* TimesheetEntry
* ExpenseEntry
* InventoryMutation
* EquipmentUsageRecord
* InvoiceLineItem
* FinancialMutation

Normalization is the bridge between operations and finance.

---

# PHASE STATUS

## Phase 1 — Foundation & RBAC

Status: Complete

Completed:

* Routing
* RBAC
* Type normalization
* Layout architecture
* Worker mobile views
* Dashboard foundation

---

## Phase 2 — Field Operations

Status: Largely Complete

Completed:

* Worker workflows
* Mobile reporting
* Upload system
* Offline queue
* Synchronization architecture
* Playwright validation

Remaining:

* Additional edge-case testing
* Workflow refinement

---

## Phase 3 — Operational Management

Status: Mostly Complete

Completed:

* Jobs
* Clients
* Workers
* Equipment
* Assets
* Locations
* Scheduling
* Stock

Remaining:

* Scheduling intelligence improvements
* Dispatch optimization
* Asset conflict management

---

## Phase 4 — Review Center & Financial Normalization

Status: Active

Completed:

* Review Center UI
* Approval workflows
* PM scope enforcement
* Financial normalization records
* Financial Explorer
* Inventory deduction workflow
* Audit workflow

Current Focus:

* Profitability calculations
* Payroll staging
* Invoice readiness
* Correction workflow refinement

---

## Phase 5 — Financial Intelligence

Status: Next

Planned:

* Dynamic profitability engine
* Payroll engine
* Invoice generation pipeline
* Margin intelligence
* Financial forecasting

---

## Phase 6 — Accounting Integration

Planned:

* QuickBooks
* Xero
* OAuth
* Sync logs
* Reconciliation workflows

---

## Phase 7 — Client Portal

Planned:

* Portal authentication
* Client visibility
* Documents
* Requests
* Communication

---

# AUDIT RULES FOR AI ASSISTANTS

Before making implementation recommendations:

1. Read this file completely.
2. Treat this file as the source of truth.
3. Do not assume repository structure alone reflects project status.
4. Do not recommend backend implementation unless it directly blocks current roadmap objectives.
5. Prioritize Phase 4 completion before recommending Phase 5 work.
6. Evaluate features against doctrine rather than backend completeness.

When auditing:

Focus on:

* Review Center
* Approval workflows
* Financial normalization
* Profitability
* Payroll staging
* Invoice readiness

before considering database implementation.

---

# CURRENT PRIMARY OBJECTIVE

Complete Phase 4.

Specifically:

Review Center
→ Approval
→ Financial Normalization
→ Profitability Engine
→ Payroll Readiness
→ Invoice Readiness

Only after these systems are validated should large-scale backend implementation become the primary focus.
